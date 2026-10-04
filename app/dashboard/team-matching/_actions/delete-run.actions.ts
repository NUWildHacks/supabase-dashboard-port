"use server";

import supabaseAdmin from "@/config/supabase-admin";
import {
  ADMIN,
  DASHBOARD_PATH,
  LOGIN_PATH,
  TEAM_MATCHING_RUNS_TABLE,
  TEAM_MATCHING_RUNS_TABLE_PROD,
} from "@/constants";
import { getAuthenticatedUser, requireRole } from "@/lib";
import type { ActionResult, TeamMatchingMode } from "@/types";

export const deleteRun = async (runId: string, mode: TeamMatchingMode = "dev"): Promise<ActionResult> => {
  try {
    const redirectPath = `${LOGIN_PATH}?redirect=${encodeURIComponent(DASHBOARD_PATH)}`;
    const user = await getAuthenticatedUser(redirectPath);
    const roleCheck = requireRole(user, ADMIN);
    if (roleCheck) return roleCheck;

    const runsTable = mode === "prod" ? TEAM_MATCHING_RUNS_TABLE_PROD : TEAM_MATCHING_RUNS_TABLE;

    const { data: run, error: runError } = await supabaseAdmin
      .from(runsTable)
      .select("is_top")
      .eq("id", runId)
      .maybeSingle();
    if (runError) throw runError;

    if (!run) return { success: false, error: "Run not found." };
    if (run.is_top === true) {
      return { success: false, error: "Cannot delete a run marked as top choice. Unmark it first." };
    }

    // Deleting the run row cascades to its teams and formations
    const { error: deleteError } = await supabaseAdmin.from(runsTable).delete().eq("id", runId);
    if (deleteError) throw deleteError;

    return { success: true };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "An unknown error occurred";
    return { success: false, error: msg };
  }
};
