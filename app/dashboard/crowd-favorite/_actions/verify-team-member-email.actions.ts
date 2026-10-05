"use server";

import supabaseAdmin from "@/config/supabase-admin";
import { DASHBOARD_CROWD_FAVORITE_PATH, LOGIN_PATH, PARTICIPANT, TEN_MINUTES, USERS_TABLE } from "@/constants";
import { isWithinRateLimit, RATE_LIMIT_TOO_MANY_ATTEMPTS } from "@/lib/rate-limit.lib";
import { getAuthenticatedUser, requireRole } from "@/lib/server";

import { getCrowdFavoriteProjectForUser } from "../_lib";

// Each lookup is one call, so a participant can check about 30 emails every 10 minutes.
const LOOKUP_LIMIT = 30;

type VerifyTeamMemberEmailResult =
  | { success: true; first_name: string; email: string }
  | { success: false; error: string };

const verifyTeamMemberEmail = async (email: string): Promise<VerifyTeamMemberEmailResult> => {
  try {
    const redirectPath = `${LOGIN_PATH}?redirect=${encodeURIComponent(DASHBOARD_CROWD_FAVORITE_PATH)}`;
    const caller = await getAuthenticatedUser(redirectPath);

    const roleCheck = requireRole(caller, PARTICIPANT);
    if (roleCheck) return roleCheck as { success: false; error: string };

    if (!(await isWithinRateLimit(`email-lookup:${caller.id}`, LOOKUP_LIMIT, TEN_MINUTES))) {
      return { success: false, error: RATE_LIMIT_TOO_MANY_ATTEMPTS };
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    if (!normalizedEmail) {
      return { success: false, error: "Email is required" };
    }

    if (caller.email.toLowerCase() === normalizedEmail) {
      return { success: false, error: "Do not add your own email as a teammate" };
    }

    const { data: member } = await supabaseAdmin
      .from(USERS_TABLE)
      .select("id, first_name")
      .eq("email", normalizedEmail)
      .eq("role", PARTICIPANT)
      .limit(1)
      .maybeSingle()
      .throwOnError();

    if (!member) {
      return { success: false, error: "No participant found for this email" };
    }

    if (await getCrowdFavoriteProjectForUser(member.id)) {
      return { success: false, error: "This participant is already assigned to another crowd favorite project" };
    }

    if (!member.first_name) {
      return { success: false, error: "Participant profile is incomplete" };
    }

    return {
      success: true,
      first_name: member.first_name as string,
      email: normalizedEmail,
    };
  } catch (error) {
    const detailedError = error instanceof Error ? error.message : "An unknown error occurred";
    console.error("Verify crowd favorite teammate email error:", detailedError);

    return { success: false, error: "Could not verify teammate email. Please try again." };
  }
};

export { verifyTeamMemberEmail };
export type { VerifyTeamMemberEmailResult };
