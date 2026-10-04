"use server";

import { revalidatePath } from "next/cache";

import supabaseAdmin from "@/config/supabase-admin";
import {
  ADMIN,
  DASHBOARD_PATH,
  LOGIN_PATH,
  TEAM_MATCHING_RUNS_TABLE,
  TEAM_MATCHING_RUNS_TABLE_PROD,
  WILDHACKS_CONFIG_TABLE,
} from "@/constants";
import { getAuthenticatedUser, requireRole } from "@/lib";
import type { ActionResult, TeamMatchingMode } from "@/types";

export const publishRun = async (runId: string, mode: TeamMatchingMode = "dev"): Promise<ActionResult> => {
  try {
    const redirectPath = `${LOGIN_PATH}?redirect=${encodeURIComponent(DASHBOARD_PATH)}`;
    const user = await getAuthenticatedUser(redirectPath);
    const roleCheck = requireRole(user, ADMIN);
    if (roleCheck) return roleCheck;

    const table = mode === "prod" ? TEAM_MATCHING_RUNS_TABLE_PROD : TEAM_MATCHING_RUNS_TABLE;
    const { data: run, error: runError } = await supabaseAdmin
      .from(table)
      .select("status")
      .eq("id", runId)
      .maybeSingle();
    if (runError) throw runError;

    if (!run) return { success: false, error: "Run not found." };
    if (run.status !== "draft") return { success: false, error: "Only draft runs can be published." };

    const { error: publishError } = await supabaseAdmin.from(table).update({ status: "published" }).eq("id", runId);
    if (publishError) throw publishError;

    const { error: configError } = await supabaseAdmin
      .from(WILDHACKS_CONFIG_TABLE)
      .update({ active_matching_run_id: runId })
      .eq("id", "config");
    if (configError) throw configError;

    revalidatePath(DASHBOARD_PATH);
    return { success: true };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "An unknown error occurred";
    return { success: false, error: msg };
  }
};
