"use server";

import supabaseAdmin from "@/config/supabase-admin";
import { USERS_TABLE, DASHBOARD_SETTINGS_PATH, LOGIN_PATH } from "@/constants";
import { getAuthenticatedUser, getConfig } from "@/lib/server";
import type { ActionResult } from "@/types";

import { getResumeStoragePaths, removeResumeFiles } from "../../_lib/resume";

export type WithdrawEventResult = ActionResult;

export const withdrawEvent = async (): Promise<WithdrawEventResult> => {
  const now = Date.now();

  try {
    const { end_time } = await getConfig();

    if (now >= end_time) {
      return {
        success: false,
        error: "The event has ended",
      };
    }

    const redirectPath = `${LOGIN_PATH}?redirect=${encodeURIComponent(DASHBOARD_SETTINGS_PATH)}`;
    const user = await getAuthenticatedUser(redirectPath);
    const { id: userId } = user;

    const resumePaths = await getResumeStoragePaths([userId]);

    await supabaseAdmin.from(USERS_TABLE).delete().eq("id", userId).throwOnError();
    await removeResumeFiles(resumePaths);

    const { error: deleteAuthUserError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (deleteAuthUserError) throw deleteAuthUserError;

    return { success: true };
  } catch (error) {
    const detailedError = error instanceof Error ? error.message : "An unknown error occurred";
    console.error("Withdraw event error:", detailedError);

    const isProduction = process.env.APP_ENV === "production";
    const errorMessage = isProduction ? "An unknown error occurred. Please try again." : detailedError;

    return { success: false, error: errorMessage };
  }
};
