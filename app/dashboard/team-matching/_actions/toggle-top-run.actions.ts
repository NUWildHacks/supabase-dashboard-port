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

export const toggleTopRun = async (
  runId: string,
  isTop: boolean,
  mode: TeamMatchingMode = "dev"
): Promise<ActionResult> => {
  try {
    const redirectPath = `${LOGIN_PATH}?redirect=${encodeURIComponent(DASHBOARD_PATH)}`;
    const user = await getAuthenticatedUser(redirectPath);
    const roleCheck = requireRole(user, ADMIN);
    if (roleCheck) return roleCheck;

    const table = mode === "prod" ? TEAM_MATCHING_RUNS_TABLE_PROD : TEAM_MATCHING_RUNS_TABLE;
    const { data, error } = await supabaseAdmin.from(table).update({ is_top: isTop }).eq("id", runId).select("id");
    if (error) throw error;
    if (!data || data.length === 0) return { success: false, error: "Run not found." };

    return { success: true };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "An unknown error occurred";
    return { success: false, error: msg };
  }
};
