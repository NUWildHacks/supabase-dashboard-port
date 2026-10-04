"use server";

import supabaseAdmin from "@/config/supabase-admin";
import {
  ADMIN,
  DASHBOARD_PATH,
  LOGIN_PATH,
  TEAM_MATCHING_FORMATIONS_TABLE,
  TEAM_MATCHING_FORMATIONS_TABLE_PROD,
  TEAM_MATCHING_RUNS_TABLE,
  TEAM_MATCHING_RUNS_TABLE_PROD,
  TEAM_MATCHING_TEAMS_TABLE,
  TEAM_MATCHING_TEAMS_TABLE_PROD,
  WILDHACKS_CONFIG_TABLE,
} from "@/constants";
import { fromRows, getAuthenticatedUser } from "@/lib";
import type { MatchedTeam, TeamFormation, TeamMatchingRun, TeamSuggestion } from "@/types";

export const getParticipantSuggestions = async (): Promise<TeamSuggestion[]> => {
  try {
    const redirectPath = `${LOGIN_PATH}?redirect=${encodeURIComponent(DASHBOARD_PATH)}`;
    const { id: userId, role } = await getAuthenticatedUser(redirectPath);

    const { data: config, error: configError } = await supabaseAdmin
      .from(WILDHACKS_CONFIG_TABLE)
      .select("team_matching_mode")
      .eq("id", "config")
      .maybeSingle();
    if (configError) throw configError;
    const mode = config?.team_matching_mode ?? "dev";
    const effectiveMode = role === ADMIN ? mode : "prod";

    const runsTable = effectiveMode === "prod" ? TEAM_MATCHING_RUNS_TABLE_PROD : TEAM_MATCHING_RUNS_TABLE;
    const teamsTable = effectiveMode === "prod" ? TEAM_MATCHING_TEAMS_TABLE_PROD : TEAM_MATCHING_TEAMS_TABLE;
    const formationsTable =
      effectiveMode === "prod" ? TEAM_MATCHING_FORMATIONS_TABLE_PROD : TEAM_MATCHING_FORMATIONS_TABLE;

    const { data: topRunRows, error: topRunsError } = await supabaseAdmin
      .from(runsTable)
      .select()
      .eq("is_top", true)
      .order("run_at", { ascending: false });
    if (topRunsError) throw topRunsError;
    const topRuns = fromRows<TeamMatchingRun>(topRunRows);

    const results: TeamSuggestion[] = [];
    const seen = new Set<string>();

    const tryAdd = (team: MatchedTeam & { id: string }) => {
      if (results.length >= 3) return;
      const key = team.members
        .map((m) => m.user_id)
        .sort()
        .join(",");
      if (seen.has(key)) return;
      seen.add(key);
      results.push({
        rank: (results.length + 1) as 1 | 2 | 3,
        team_id: team.id,
        members: team.members,
        score: team.score,
        match_reasons: team.match_reasons,
        where_to_meet: team.where_to_meet,
      });
    };

    for (const run of topRuns) {
      if (results.length >= 3) break;

      // Primary formation
      const { data: teamRows, error: teamsError } = await supabaseAdmin.from(teamsTable).select().eq("run_id", run.id);
      if (teamsError) throw teamsError;
      const primary = fromRows<MatchedTeam>(teamRows).find((t) => t.members.some((m) => m.user_id === userId));
      if (primary) tryAdd(primary);

      if (results.length >= 3) break;

      // Alternative formations (alt1, alt2)
      const { data: formationRows, error: formationsError } = await supabaseAdmin
        .from(formationsTable)
        .select("run_id, formation_index, teams, fingerprint")
        .in(
          "id",
          [1, 2].map((i) => `${run.id}_alt${i}`)
        );
      if (formationsError) throw formationsError;
      const formations = fromRows<TeamFormation>(formationRows).sort((a, b) => a.formation_index - b.formation_index);
      for (const formation of formations) {
        if (results.length >= 3) continue;
        const altTeam = formation.teams.find((t) => t.members.some((m) => m.user_id === userId));
        if (altTeam) tryAdd(altTeam);
      }
    }

    return results;
  } catch {
    return [];
  }
};
