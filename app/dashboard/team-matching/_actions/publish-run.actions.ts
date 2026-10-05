"use server";

import { revalidatePath } from "next/cache";

import supabaseAdmin from "@/config/supabase-admin";
import { ADMIN, DASHBOARD_PATH, LOGIN_PATH } from "@/constants";
import { getAuthenticatedUser, requireRole } from "@/lib/server";
import type { ActionResult, TeamMatchingMode } from "@/types";

export const publishRun = async (runId: string, mode: TeamMatchingMode = "dev"): Promise<ActionResult> => {
  try {
    const redirectPath = `${LOGIN_PATH}?redirect=${encodeURIComponent(DASHBOARD_PATH)}`;
    const user = await getAuthenticatedUser(redirectPath);
    const roleCheck = requireRole(user, ADMIN);
    if (roleCheck) return roleCheck;

    // Publishing the run and making it the active run happen in one transaction.
    const { data: result } = await supabaseAdmin
      .rpc("publish_matching_run", { p_run_id: runId, p_mode: mode })
      .throwOnError();

    if (result === "not_found") return { success: false, error: "Run not found." };
    if (result === "not_draft") return { success: false, error: "Only draft runs can be published." };

    revalidatePath(DASHBOARD_PATH);
    return { success: true };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "An unknown error occurred";
    return { success: false, error: msg };
  }
};
