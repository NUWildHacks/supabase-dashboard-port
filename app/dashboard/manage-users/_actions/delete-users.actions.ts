"use server";

import { revalidatePath } from "next/cache";

import supabaseAdmin from "@/config/supabase-admin";
import { DASHBOARD_MANAGE_USERS_PATH, ADMIN, LOGIN_PATH, USERS_TABLE } from "@/constants";
import { chunkList } from "@/lib";
import { isAuthUserIdFormat } from "@/lib/auth-user.lib";
import { getAuthenticatedUser, requireRole } from "@/lib/server";
import type { ActionResult, User } from "@/types";

import { getResumeStoragePaths, removeResumeFiles } from "../../_lib/resume";

export type DeleteUsersResult = ActionResult;

export const deleteUsers = async (userIds: User["id"][]): Promise<DeleteUsersResult> => {
  try {
    const redirectPath = `${LOGIN_PATH}?redirect=${encodeURIComponent(DASHBOARD_MANAGE_USERS_PATH)}`;
    const user = await getAuthenticatedUser(redirectPath);

    const roleError = requireRole(user, ADMIN, "You are not authorized to delete users");
    if (roleError) return roleError;

    if (userIds.includes(user.id)) {
      return { success: false, error: "You cannot delete yourself. Please withdraw from the event instead." };
    }

    const resumePaths = await getResumeStoragePaths(userIds);

    for (const ids of chunkList(userIds)) {
      await supabaseAdmin.from(USERS_TABLE).delete().in("id", ids).throwOnError();
    }
    await removeResumeFiles(resumePaths);

    // Pre-created rows (keyed by email before first login) have no auth user, so skip ids that
    // are not auth user ids and ignore "user not found" errors. Try every account, then report
    // the ones that failed; their users rows are already gone, so they can no longer use the app.
    const authResults = await Promise.allSettled(
      userIds.filter(isAuthUserIdFormat).map(async (userId) => {
        const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
        if (error && error.status !== 404 && error.code !== "user_not_found") throw error;
      })
    );
    const failedAuthDeletes = authResults.filter((result) => result.status === "rejected").length;
    if (failedAuthDeletes > 0) {
      revalidatePath(DASHBOARD_MANAGE_USERS_PATH);
      throw new Error(
        `Deleted the users, but ${failedAuthDeletes} sign-in account(s) could not be removed. Try again.`
      );
    }

    revalidatePath(DASHBOARD_MANAGE_USERS_PATH);

    return { success: true };
  } catch (error) {
    const detailedError = error instanceof Error ? error.message : "An unknown error occurred";
    console.error("Delete users error:", detailedError);

    const isProduction = process.env.APP_ENV === "production";
    const errorMessage = isProduction ? "An unknown error occurred. Please try again." : detailedError;

    return { success: false, error: errorMessage };
  }
};
