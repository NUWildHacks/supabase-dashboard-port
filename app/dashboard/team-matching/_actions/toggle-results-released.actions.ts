"use server";

import { revalidatePath } from "next/cache";

import supabaseAdmin from "@/config/supabase-admin";
import { ADMIN, DASHBOARD_PATH, LOGIN_PATH, WILDHACKS_CONFIG_TABLE } from "@/constants";
import { getAuthenticatedUser, requireRole } from "@/lib";
import type { ActionResult, TeamMatchingMode } from "@/types";

// Dev mode: sets results_released_dev (only admins see this; participants are unaffected)
// Prod mode: sets results_released (participants see results)
export const setResultsReleased = async (released: boolean, mode: TeamMatchingMode): Promise<ActionResult> => {
  try {
    const redirectPath = `${LOGIN_PATH}?redirect=${encodeURIComponent(DASHBOARD_PATH)}`;
    const user = await getAuthenticatedUser(redirectPath);
    const roleCheck = requireRole(user, ADMIN);
    if (roleCheck) return roleCheck;

    const field = mode === "prod" ? "results_released" : "results_released_dev";
    const { error } = await supabaseAdmin
      .from(WILDHACKS_CONFIG_TABLE)
      .update({
        [field]: released,
      })
      .eq("id", "config");
    if (error) throw error;

    // Only revalidate the participant-facing page in prod mode
    if (mode === "prod") revalidatePath(DASHBOARD_PATH);
    return { success: true };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "An unknown error occurred";
    return { success: false, error: msg };
  }
};
