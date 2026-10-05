"use server";

import supabaseAdmin from "@/config/supabase-admin";
import {
  ADMIN,
  DASHBOARD_TEAM_MATCHING_PATH,
  LOGIN_PATH,
  TEAM_MATCHING_FORMATIONS_TABLE,
  TEAM_MATCHING_FORMATIONS_TABLE_PROD,
  TEAM_MATCHING_INTAKE_TABLE,
  TEAM_MATCHING_INTAKE_TABLE_DEV,
  TEAM_MATCHING_RUNS_TABLE,
  TEAM_MATCHING_RUNS_TABLE_PROD,
  TEAM_MATCHING_SETTINGS_TABLE,
  TEAM_MATCHING_TEAMS_TABLE,
  TEAM_MATCHING_TEAMS_TABLE_PROD,
  USERS_TABLE,
  WILDHACKS_CONFIG_TABLE,
} from "@/constants";
import { fromRow, fromRows, selectAllRows } from "@/lib";
import { getAuthenticatedUser } from "@/lib/server";
import type {
  IntakeRecord,
  MatchedTeam,
  TeamFormation,
  TeamMatchingMode,
  TeamMatchingRun,
  TeamMatchingSettings,
} from "@/types";
import { DEFAULT_TEAM_MATCHING_SETTINGS } from "@/types";

/**
 * The admin page calls these functions from the browser, so each one is a server action and must
 * check the caller itself.
 */
const assertAdmin = async () => {
  const user = await getAuthenticatedUser(`${LOGIN_PATH}?redirect=${encodeURIComponent(DASHBOARD_TEAM_MATCHING_PATH)}`);
  if (user.role !== ADMIN) {
    throw new Error("You are not authorized to view team matching data");
  }
};

export type IntakeEntry = IntakeRecord & { submitted_at: number; required_teammate_names: string[] };

type UserNameRow = { id: string; first_name: string | null; last_name: string | null; gender: string | null };

// Keep each `.in()` filter short enough for the request URL.
const USER_LOOKUP_CHUNK_SIZE = 200;

const getUsersByIds = async (ids: string[]): Promise<UserNameRow[]> => {
  const rows: UserNameRow[] = [];
  for (let i = 0; i < ids.length; i += USER_LOOKUP_CHUNK_SIZE) {
    const { data } = await supabaseAdmin
      .from(USERS_TABLE)
      .select("id, first_name, last_name, gender")
      .in("id", ids.slice(i, i + USER_LOOKUP_CHUNK_SIZE))
      .throwOnError();
    rows.push(...(data ?? []));
  }
  return rows;
};

const toDisplayName = (row: UserNameRow | undefined) =>
  row ? `${row.first_name ?? ""} ${row.last_name ?? ""}`.trim() : "Unknown";

export const getIntakeEntries = async (mode: TeamMatchingMode = "dev"): Promise<IntakeEntry[]> => {
  await assertAdmin();
  const table = mode === "prod" ? TEAM_MATCHING_INTAKE_TABLE : TEAM_MATCHING_INTAKE_TABLE_DEV;
  const intakes = await selectAllRows((from, to) =>
    supabaseAdmin.from(table).select().order("user_id").range(from, to).throwOnError()
  );

  // Collect intake user IDs and all required teammate IDs, then look up their names in one pass
  const userIds = intakes.map((row) => row.user_id as string);
  const allRequiredIds = intakes.flatMap((row) => (row.required_teammates ?? []) as string[]);
  const lookupIds = [...new Set([...userIds, ...allRequiredIds])];
  const userRows = await getUsersByIds(lookupIds);
  const userMap = new Map(userRows.map((row) => [row.id, row]));

  const nameMap = new Map(lookupIds.map((id) => [id, toDisplayName(userMap.get(id))]));
  const genderMap = new Map(userIds.map((id) => [id, userMap.get(id)?.gender ?? undefined]));

  // Intake rows are kept when a user is deleted, so skip rows whose user no longer exists.
  return intakes
    .filter((d) => userMap.has(d.user_id as string))
    .map((d) => {
      const userId = d.user_id as string;
      const requiredTeammates: string[] = d.required_teammates ?? [];
      return {
        user_id: userId,
        name: nameMap.get(userId) ?? "Unknown",
        experience_level: d.experience_level ?? "beginner",
        preferred_roles: d.preferred_roles ?? [],
        skills: d.skills ?? {},
        work_style: d.work_style ?? "in_between",
        preferred_team_size: d.preferred_team_size ?? 4,
        required_teammates: requiredTeammates,
        required_teammate_names: requiredTeammates.map((id) => nameMap.get(id) ?? id),
        additional_notes: d.additional_notes ?? "",
        gender: genderMap.get(userId),
        gender_preference: d.gender_preference ?? "no_preference",
        where_staying: d.where_staying ?? "unsure",
        submitted_at: d.created_at ?? 0,
      };
    });
};

export const getRuns = async (mode: TeamMatchingMode = "dev"): Promise<TeamMatchingRun[]> => {
  await assertAdmin();
  const table = mode === "prod" ? TEAM_MATCHING_RUNS_TABLE_PROD : TEAM_MATCHING_RUNS_TABLE;
  const { data } = await supabaseAdmin.from(table).select().order("run_at", { ascending: false }).throwOnError();
  return fromRows<TeamMatchingRun>(data);
};

export const getRunTeams = async (runId: string, mode: TeamMatchingMode = "dev"): Promise<MatchedTeam[]> => {
  await assertAdmin();
  const table = mode === "prod" ? TEAM_MATCHING_TEAMS_TABLE_PROD : TEAM_MATCHING_TEAMS_TABLE;
  const data = await selectAllRows((from, to) =>
    supabaseAdmin.from(table).select().eq("run_id", runId).order("id").range(from, to).throwOnError()
  );
  return fromRows<MatchedTeam>(data).sort((a, b) => b.score - a.score);
};

export const getRunFormations = async (runId: string, mode: TeamMatchingMode = "dev"): Promise<TeamFormation[]> => {
  await assertAdmin();
  const table = mode === "prod" ? TEAM_MATCHING_FORMATIONS_TABLE_PROD : TEAM_MATCHING_FORMATIONS_TABLE;
  const { data } = await supabaseAdmin
    .from(table)
    .select("run_id, formation_index, teams, fingerprint")
    .in(
      "id",
      [1, 2].map((i) => `${runId}_alt${i}`)
    )
    .throwOnError();
  return fromRows<TeamFormation>(data).sort((a, b) => a.formation_index - b.formation_index);
};

export const getResultsReleased = async (mode: TeamMatchingMode): Promise<boolean> => {
  await assertAdmin();
  const { data } = await supabaseAdmin
    .from(WILDHACKS_CONFIG_TABLE)
    .select("results_released, results_released_dev")
    .eq("id", "config")
    .maybeSingle()
    .throwOnError();
  return mode === "prod" ? (data?.results_released ?? false) : (data?.results_released_dev ?? false);
};

export const getSettings = async (): Promise<TeamMatchingSettings> => {
  await assertAdmin();
  const { data } = await supabaseAdmin
    .from(TEAM_MATCHING_SETTINGS_TABLE)
    .select()
    .eq("id", "team_matching_settings")
    .maybeSingle()
    .throwOnError();
  if (!data) return DEFAULT_TEAM_MATCHING_SETTINGS;

  const settings: Record<string, unknown> = { ...data };
  delete settings.id;
  return { ...DEFAULT_TEAM_MATCHING_SETTINGS, ...fromRow<Partial<TeamMatchingSettings>>(settings) };
};
