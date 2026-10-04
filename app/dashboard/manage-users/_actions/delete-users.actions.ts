"use server";

import { revalidatePath } from "next/cache";

import supabaseAdmin from "@/config/supabase-admin";
import { DASHBOARD_MANAGE_USERS_PATH, ADMIN, LOGIN_PATH, USERS_TABLE } from "@/constants";
import { getAuthenticatedUser, requireRole } from "@/lib";
import type { ActionResult, User } from "@/types";

export type DeleteUsersResult = ActionResult;

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const deleteUsers = async (userIds: User["id"][]): Promise<DeleteUsersResult> => {
  try {
    const redirectPath = `${LOGIN_PATH}?redirect=${encodeURIComponent(DASHBOARD_MANAGE_USERS_PATH)}`;
    const user = await getAuthenticatedUser(redirectPath);

    const roleError = requireRole(user, ADMIN, "You are not authorized to delete users");
    if (roleError) return roleError;

    if (userIds.includes(user.id)) {
      return { success: false, error: "You cannot delete yourself. Please withdraw from the event instead." };
    }

    const { error: deleteError } = await supabaseAdmin.from(USERS_TABLE).delete().in("id", userIds);
    if (deleteError) throw deleteError;

    // Pre-created rows (keyed by email before first login) have no auth user, so skip ids that
    // are not auth user ids and ignore "user not found" errors, like Firebase's deleteUsers did.
    await Promise.all(
      userIds
        .filter((userId) => UUID_REGEX.test(userId))
        .map(async (userId) => {
          const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
          if (error && error.status !== 404 && error.code !== "user_not_found") throw error;
        })
    );

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
