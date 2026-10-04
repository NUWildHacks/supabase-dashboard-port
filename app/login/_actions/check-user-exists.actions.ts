"use server";

import supabaseAdmin from "@/config/supabase-admin";
import { USERS_TABLE, JUDGE, JUDGE_AND_MENTOR, PARTICIPANT } from "@/constants";
import { verifySession } from "@/lib";
import type { ActionResult } from "@/types";

/**
 * Check that the signed-in user is allowed to use the dashboard.
 * A user may continue if they already have a user row, or if an admin pre-created a
 * row with their email (judges, mentors, and late participants).
 * Called by the OAuth callback route right after the session is created.
 *
 * @returns ActionResult with success: false if registration is closed for this user
 */
export const checkUserCanLogin = async (): Promise<ActionResult> => {
  try {
    const userInfo = await verifySession();
    if (!userInfo) {
      return { success: false, error: "Failed to verify session." };
    }

    const { data: userRow, error: userError } = await supabaseAdmin
      .from(USERS_TABLE)
      .select("id")
      .eq("id", userInfo.id)
      .maybeSingle();
    if (userError) throw userError;

    if (!userRow) {
      const { data: emailRow, error: emailError } = await supabaseAdmin
        .from(USERS_TABLE)
        .select("role")
        .eq("email", userInfo.email)
        .limit(1)
        .maybeSingle();
      if (emailError) throw emailError;

      const role = emailRow?.role;
      if (!emailRow || (role !== JUDGE && role !== JUDGE_AND_MENTOR && role !== PARTICIPANT)) {
        return { success: false, error: "Registration is closed! Check back in the future for WildHacks 2027." };
      }
    }

    return { success: true };
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : "An unknown error occurred";
    console.error(errorMessage);
    return { success: false, error: errorMessage };
  }
};
