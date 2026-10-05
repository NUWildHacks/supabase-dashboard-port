"use server";

import supabaseAdmin from "@/config/supabase-admin";
import {
  ADMIN,
  DASHBOARD_PATH,
  LOGIN_PATH,
  TEAM_MATCHING_INTAKE_TABLE,
  TEAM_MATCHING_INTAKE_TABLE_DEV,
  TEAM_MATCHING_SETTINGS_TABLE,
  USERS_TABLE,
  WILDHACKS_CONFIG_TABLE,
} from "@/constants";
import { fromRow, selectAllRows } from "@/lib";
import { getAuthenticatedUser, requireRole } from "@/lib/server";
import type {
  ActionResult,
  IntakeRecord,
  TeamMatchingMode,
  TeamMatchingRun,
  TeamMatchingRunStats,
  TeamMatchingSettings,
} from "@/types";
import { DEFAULT_TEAM_MATCHING_SETTINGS } from "@/types";

import { runMatchingAlgorithm } from "../algorithm/matcher";

export type RunMatchingResult = ActionResult & {
  runId?: string;
  run?: TeamMatchingRun;
  stats?: TeamMatchingRunStats;
  warningCount?: number;
};

// Keep each `.in()` filter short enough for the request URL.
const USER_LOOKUP_CHUNK_SIZE = 200;

export const runMatching = async (name?: string): Promise<RunMatchingResult> => {
  try {
    const redirectPath = `${LOGIN_PATH}?redirect=${encodeURIComponent(DASHBOARD_PATH)}`;
    const user = await getAuthenticatedUser(redirectPath);
    const roleCheck = requireRole(user, ADMIN);
    if (roleCheck) return roleCheck;

    // Fetch config and settings in parallel
    const [configResult, settingsResult] = await Promise.all([
      supabaseAdmin
        .from(WILDHACKS_CONFIG_TABLE)
        .select("team_matching_mode")
        .eq("id", "config")
        .maybeSingle()
        .throwOnError(),
      supabaseAdmin
        .from(TEAM_MATCHING_SETTINGS_TABLE)
        .select()
        .eq("id", "team_matching_settings")
        .maybeSingle()
        .throwOnError(),
    ]);

    const mode: TeamMatchingMode = (configResult.data?.team_matching_mode as TeamMatchingMode | undefined) ?? "dev";
    const intakeTable = mode === "prod" ? TEAM_MATCHING_INTAKE_TABLE : TEAM_MATCHING_INTAKE_TABLE_DEV;

    let settings: TeamMatchingSettings = DEFAULT_TEAM_MATCHING_SETTINGS;
    if (settingsResult.data) {
      const settingsRow: Record<string, unknown> = { ...settingsResult.data };
      delete settingsRow.id;
      settings = { ...DEFAULT_TEAM_MATCHING_SETTINGS, ...fromRow<Partial<TeamMatchingSettings>>(settingsRow) };
    }

    // Fetch all intake rows from the active table
    const intakeRows = await selectAllRows((from, to) =>
      supabaseAdmin.from(intakeTable).select().order("user_id").range(from, to).throwOnError()
    );

    // Fetch user display names
    const userIds = (intakeRows ?? []).map((row) => row.user_id as string);
    const userRows: { id: string; first_name: string | null; last_name: string | null; gender: string | null }[] = [];
    for (let i = 0; i < userIds.length; i += USER_LOOKUP_CHUNK_SIZE) {
      const { data } = await supabaseAdmin
        .from(USERS_TABLE)
        .select("id, first_name, last_name, gender")
        .in("id", userIds.slice(i, i + USER_LOOKUP_CHUNK_SIZE))
        .throwOnError();
      userRows.push(...(data ?? []));
    }
    const userMap = new Map(userRows.map((row) => [row.id, row]));
    const nameMap = new Map(
      userIds.map((id) => {
        const row = userMap.get(id);
        return [id, row ? `${row.first_name ?? ""} ${row.last_name ?? ""}`.trim() : "Unknown"];
      })
    );
    const genderMap = new Map(userIds.map((id) => [id, userMap.get(id)?.gender ?? undefined]));

    // Build IntakeRecord array. Intake rows are kept when a user is deleted, so skip rows whose
    // user no longer exists.
    const intakes: IntakeRecord[] = (intakeRows ?? [])
      .filter((d) => userMap.has(d.user_id as string))
      .map((d) => {
        const userId = d.user_id as string;
        return {
          user_id: userId,
          name: nameMap.get(userId) ?? "Unknown",
          experience_level: d.experience_level ?? "beginner",
          preferred_roles: d.preferred_roles ?? [],
          skills: d.skills ?? {},
          work_style: d.work_style ?? "in_between",
          preferred_team_size: d.preferred_team_size ?? 4,
          required_teammates: d.required_teammates ?? [],
          additional_notes: d.additional_notes ?? "",
          gender: genderMap.get(userId),
          gender_preference: d.gender_preference ?? "no_preference",
          where_staying: d.where_staying ?? "unsure",
        };
      });

    // Use a timestamp-based seed so each run explores a different random ordering.
    const baseSeed = Date.now() & 0xffffffff;
    const result = runMatchingAlgorithm(intakes, settings, settings.where_to_meet, baseSeed);

    if (result.preflightFailed) {
      return {
        success: false,
        error: "Pre-flight validation failed. Please resolve the warnings before running.",
        warningCount: result.warnings.length,
      };
    }

    const now = Date.now();
    const runId = crypto.randomUUID();

    const stats: TeamMatchingRunStats = {
      total_participants: intakes.length,
      total_teams: result.teams.length,
      unmatched_count: result.unmatched.length,
      required_cluster_count: result.teams.filter((t) =>
        t.members.some((m) => (intakes.find((i) => i.user_id === m.user_id)?.required_teammates.length ?? 0) > 0)
      ).length,
      invalid_cluster_count: result.warnings.filter((w) => w.type === "oversized_cluster").length,
    };

    // Build primary team rows with stable IDs
    const teamRows = result.teams.map((team) => ({
      id: crypto.randomUUID(),
      run_id: runId,
      members: team.members,
      score: team.score,
      match_reasons: team.match_reasons,
      where_to_meet: team.where_to_meet,
      notes: team.notes,
    }));

    // Build alternative formation rows (up to 2 runner-up results)
    const formationRows = result.alternatives.slice(0, 2).map((alt, i) => {
      const formationIndex = (i + 1) as 1 | 2;
      const teams = alt.teams.map((team, j) => ({
        ...team,
        id: `${runId}_alt${formationIndex}_${j}`,
        run_id: runId,
      }));
      return {
        id: `${runId}_alt${formationIndex}`,
        run_id: runId,
        formation_index: formationIndex,
        teams,
        fingerprint: alt.fingerprint,
      };
    });

    // Save the run, its teams, and its alternative formations in one transaction.
    await supabaseAdmin
      .rpc("insert_matching_run", {
        p_mode: mode,
        p_run: {
          id: runId,
          run_at: now,
          run_by: user.id,
          name: name?.trim() || null,
          is_top: false,
          fingerprint: result.fingerprint,
          status: "draft",
          settings_snapshot: settings,
          warnings: result.warnings,
          stats,
        },
        p_teams: teamRows,
        p_formations: formationRows,
      })
      .throwOnError();

    const run: TeamMatchingRun = {
      id: runId,
      run_at: now,
      run_by: user.id,
      name: name?.trim() || undefined,
      is_top: false,
      fingerprint: result.fingerprint,
      status: "draft",
      settings_snapshot: settings,
      warnings: result.warnings,
      stats,
    };
    return { success: true, runId, run, stats, warningCount: result.warnings.length };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "An unknown error occurred";
    return { success: false, error: msg };
  }
};
