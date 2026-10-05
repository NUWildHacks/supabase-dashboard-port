"use server";

import supabaseAdmin from "@/config/supabase-admin";
import { USERS_TABLE, LOGIN_PATH, DASHBOARD_PATH, PARTICIPANT, TEN_MINUTES } from "@/constants";
import { isWithinRateLimit, RATE_LIMIT_TOO_MANY_ATTEMPTS } from "@/lib/rate-limit.lib";
import { getAuthenticatedUser, requireRole } from "@/lib/server";

// Each lookup is one call, so a participant can check about 30 emails every 10 minutes.
const LOOKUP_LIMIT = 30;

export type VerifyTeammateEmailResult = { success: true; name: string } | { success: false; error: string };

/**
 * Check that an email belongs to a registered participant and return their first name.
 * The user ID is not returned; submitTeamMatchingIntake looks it up from the email.
 */
export const verifyTeammateEmail = async (email: string): Promise<VerifyTeammateEmailResult> => {
  try {
    const redirectPath = `${LOGIN_PATH}?redirect=${encodeURIComponent(DASHBOARD_PATH)}`;
    const caller = await getAuthenticatedUser(redirectPath);

    const roleCheck = requireRole(caller, PARTICIPANT);
    if (roleCheck) return roleCheck as { success: false; error: string };

    if (!(await isWithinRateLimit(`email-lookup:${caller.id}`, LOOKUP_LIMIT, TEN_MINUTES))) {
      return { success: false, error: RATE_LIMIT_TOO_MANY_ATTEMPTS };
    }

    const { data: user } = await supabaseAdmin
      .from(USERS_TABLE)
      .select("first_name")
      .eq("email", String(email).toLowerCase().trim())
      .eq("role", PARTICIPANT)
      .limit(1)
      .maybeSingle()
      .throwOnError();

    if (!user) {
      return { success: false, error: "No registered participant found with this email." };
    }

    return { success: true, name: (user.first_name as string | null) ?? "" };
  } catch (error) {
    const detailedError = error instanceof Error ? error.message : "An unknown error occurred";
    console.error("Teammate email verification error:", detailedError);
    return { success: false, error: "Could not verify email. Please try again." };
  }
};
