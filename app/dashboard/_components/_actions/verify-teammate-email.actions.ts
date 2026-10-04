"use server";

import supabaseAdmin from "@/config/supabase-admin";
import { USERS_TABLE, LOGIN_PATH, DASHBOARD_PATH, PARTICIPANT } from "@/constants";
import { getAuthenticatedUser, requireRole } from "@/lib";

export type VerifyTeammateEmailResult =
  | { success: true; name: string; userId: string }
  | { success: false; error: string };

export const verifyTeammateEmail = async (email: string): Promise<VerifyTeammateEmailResult> => {
  try {
    const redirectPath = `${LOGIN_PATH}?redirect=${encodeURIComponent(DASHBOARD_PATH)}`;
    const caller = await getAuthenticatedUser(redirectPath);

    const roleCheck = requireRole(caller, PARTICIPANT);
    if (roleCheck) return roleCheck as { success: false; error: string };

    const { data: user, error } = await supabaseAdmin
      .from(USERS_TABLE)
      .select("id, first_name")
      .eq("email", email.toLowerCase().trim())
      .limit(1)
      .maybeSingle();
    if (error) throw error;

    if (!user) {
      return { success: false, error: "No registered participant found with this email." };
    }

    return { success: true, name: user.first_name as string, userId: user.id };
  } catch (error) {
    const detailedError = error instanceof Error ? error.message : "An unknown error occurred";
    console.error("Teammate email verification error:", detailedError);
    return { success: false, error: "Could not verify email. Please try again." };
  }
};
