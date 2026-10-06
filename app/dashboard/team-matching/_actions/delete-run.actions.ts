"use server";

import supabaseAdmin from "@/config/supabase-admin";
import {
  ADMIN,
  DASHBOARD_PATH,
  LOGIN_PATH,
  TEAM_MATCHING_RUNS_TABLE,
  TEAM_MATCHING_RUNS_TABLE_PROD,
  WILDHACKS_CONFIG_TABLE,
} from "@/constants";
import { getAuthenticatedUser, requireRole } from "@/lib/server";
import type { ActionResult, TeamMatchingMode } from "@/types";

export const deleteRun = async (runId: string, mode: TeamMatchingMode = "dev"): Promise<ActionResult> => {
  try {
    const redirectPath = `${LOGIN_PATH}?redirect=${encodeURIComponent(DASHBOARD_PATH)}`;
    const user = await getAuthenticatedUser(redirectPath);
    const roleCheck = requireRole(user, ADMIN);
    if (roleCheck) return roleCheck;

    const runsTable = mode === "prod" ? TEAM_MATCHING_RUNS_TABLE_PROD : TEAM_MATCHING_RUNS_TABLE;

    const { data: run } = await supabaseAdmin
      .from(runsTable)
      .select("is_top")
      .eq("id", runId)
      .maybeSingle()
      .throwOnError();

    if (!run) return { success: false, error: "Run not found." };
    if (run.is_top === true) {
      return { success: false, error: "Cannot delete a run marked as top choice. Unmark it first." };
    }

    // Deleting the run row cascades to its teams and formations
    await supabaseAdmin.from(runsTable).delete().eq("id", runId).throwOnError();

    // Clear the active run for this mode if it pointed at the deleted run.
    const activeRunColumn = mode === "prod" ? "active_matching_run_id" : "active_matching_run_id_dev";
    await supabaseAdmin
      .from(WILDHACKS_CONFIG_TABLE)
      .update({ [activeRunColumn]: null })
      .eq("id", "config")
      .eq(activeRunColumn, runId)
      .throwOnError();

    return { success: true };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "An unknown error occurred";
    return { success: false, error: msg };
  }
};
