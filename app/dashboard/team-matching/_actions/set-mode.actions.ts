"use server";

import supabaseAdmin from "@/config/supabase-admin";
import { ADMIN, DASHBOARD_PATH, LOGIN_PATH, WILDHACKS_CONFIG_TABLE } from "@/constants";
import { getAuthenticatedUser, requireRole } from "@/lib";
import type { ActionResult, TeamMatchingMode } from "@/types";

export const setTeamMatchingMode = async (mode: TeamMatchingMode): Promise<ActionResult> => {
  try {
    const redirectPath = `${LOGIN_PATH}?redirect=${encodeURIComponent(DASHBOARD_PATH)}`;
    const user = await getAuthenticatedUser(redirectPath);
    const roleCheck = requireRole(user, ADMIN);
    if (roleCheck) return roleCheck;

    const { error } = await supabaseAdmin
      .from(WILDHACKS_CONFIG_TABLE)
      .update({ team_matching_mode: mode })
      .eq("id", "config");
    if (error) throw error;

    return { success: true };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "An unknown error occurred";
    return { success: false, error: msg };
  }
};
