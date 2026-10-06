"use server";

import supabaseAdmin from "@/config/supabase-admin";
import {
  ADMIN,
  DASHBOARD_PATH,
  LOGIN_PATH,
  TEAM_MATCHING_RUNS_TABLE,
  TEAM_MATCHING_RUNS_TABLE_PROD,
} from "@/constants";
import { getAuthenticatedUser, requireRole } from "@/lib/server";
import type { ActionResult, TeamMatchingMode } from "@/types";

export const renameRun = async (runId: string, name: string, mode: TeamMatchingMode = "dev"): Promise<ActionResult> => {
  try {
    const redirectPath = `${LOGIN_PATH}?redirect=${encodeURIComponent(DASHBOARD_PATH)}`;
    const user = await getAuthenticatedUser(redirectPath);
    const roleCheck = requireRole(user, ADMIN);
    if (roleCheck) return roleCheck;

    const trimmed = name.trim();
    if (!trimmed) return { success: false, error: "Name cannot be empty." };

    const table = mode === "prod" ? TEAM_MATCHING_RUNS_TABLE_PROD : TEAM_MATCHING_RUNS_TABLE;
    const { data } = await supabaseAdmin
      .from(table)
      .update({ name: trimmed })
      .eq("id", runId)
      .select("id")
      .throwOnError();
    if (!data || data.length === 0) return { success: false, error: "Run not found." };

    return { success: true };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "An unknown error occurred";
    return { success: false, error: msg };
  }
};
