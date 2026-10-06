"use server";

import { PostgrestError } from "@supabase/supabase-js";

import supabaseAdmin from "@/config/supabase-admin";
import {
  TEAM_MATCHING_INTAKE_TABLE,
  USERS_TABLE,
  LOGIN_PATH,
  DASHBOARD_PATH,
  PARTICIPANT,
  TEN_MINUTES,
} from "@/constants";
import { isWithinRateLimit, RATE_LIMIT_TOO_MANY_ATTEMPTS } from "@/lib/rate-limit.lib";
import { getAuthenticatedUser, getConfig, requireRole } from "@/lib/server";
import type { ActionResult } from "@/types";

// Postgres error code for a unique constraint violation
const UNIQUE_VIOLATION = "23505";

const VALID_EXPERIENCE_LEVELS = ["beginner", "intermediate", "experienced"] as const;
const VALID_WORK_STYLES = ["competitive", "casual", "in_between"] as const;
const VALID_GENDER_PREFERENCES = ["no_preference", "prefer_mixed", "prefer_same"] as const;
const VALID_WHERE_STAYING = ["prefer_not_to_say", "on_site", "on_campus", "off_campus"] as const;
const VALID_ROLES = [
  "Frontend Engineer",
  "Backend Engineer",
  "Full Stack Engineer",
  "Mobile Engineer",
  "Data Scientist",
  "Product Manager",
  "Designer",
] as const;
const VALID_SKILLS = [
  "JavaScript / TypeScript",
  "Python",
  "Java / Kotlin",
  "Swift / iOS",
  "React / Vue / Angular",
  "Node.js / Express",
  "SQL / Databases",
  "Machine Learning / AI",
  "UI/UX Design",
  "Figma",
  "AWS / Cloud",
  "Docker / DevOps",
] as const;
const MAX_REQUIRED_TEAMMATES = 3;
const MAX_ADDITIONAL_NOTES_LENGTH = 1000;
// Same limit as verifyTeammateEmail, on the same rate-limit key.
const EMAIL_LOOKUP_LIMIT = 30;

export type TeamMatchingIntakeData = {
  experience_level: string;
  preferred_roles: string[];
  skills: Record<string, number>;
  additional_notes: string;
  preferred_team_size: number;
  work_style: string;
  /** Emails of required teammates. The server looks up their user IDs. */
  required_teammates: string[];
  consent: boolean;
  gender_preference?: string;
  where_staying?: string;
};

export const submitTeamMatchingIntake = async (data: TeamMatchingIntakeData): Promise<ActionResult> => {
  try {
    const redirectPath = `${LOGIN_PATH}?redirect=${encodeURIComponent(DASHBOARD_PATH)}`;
    const user = await getAuthenticatedUser(redirectPath);

    const roleCheck = requireRole(user, PARTICIPANT);
    // const roleCheck = requireRole(user, ADMIN);
    if (roleCheck) return roleCheck;

    const { id: userId } = user;

    const { end_time } = await getConfig();
    if (Date.now() >= end_time) {
      return { success: false, error: "Team matching is closed." };
    }

    if (data.consent !== true) {
      return { success: false, error: "You must consent to participate in team matching." };
    }

    if (!VALID_EXPERIENCE_LEVELS.includes(data.experience_level as (typeof VALID_EXPERIENCE_LEVELS)[number])) {
      return { success: false, error: "Invalid experience level." };
    }

    if (
      !Array.isArray(data.preferred_roles) ||
      data.preferred_roles.length === 0 ||
      data.preferred_roles.some((r) => !VALID_ROLES.includes(r as (typeof VALID_ROLES)[number]))
    ) {
      return { success: false, error: "At least one valid preferred role is required." };
    }

    if (
      typeof data.skills !== "object" ||
      data.skills === null ||
      Array.isArray(data.skills) ||
      Object.keys(data.skills).some((k) => !VALID_SKILLS.includes(k as (typeof VALID_SKILLS)[number])) ||
      Object.values(data.skills).some((v) => typeof v !== "number" || v < 0 || v > 5)
    ) {
      return { success: false, error: "Invalid skills data." };
    }

    if (![2, 3, 4].includes(data.preferred_team_size)) {
      return { success: false, error: "Preferred team size must be 2, 3, or 4." };
    }

    if (!VALID_WORK_STYLES.includes(data.work_style as (typeof VALID_WORK_STYLES)[number])) {
      return { success: false, error: "Invalid work style." };
    }

    if (!VALID_GENDER_PREFERENCES.includes(data.gender_preference as (typeof VALID_GENDER_PREFERENCES)[number])) {
      return { success: false, error: "Invalid gender preference." };
    }

    if (!VALID_WHERE_STAYING.includes(data.where_staying as (typeof VALID_WHERE_STAYING)[number])) {
      return { success: false, error: "Invalid where staying value." };
    }

    if (
      data.gender_preference &&
      !VALID_GENDER_PREFERENCES.includes(data.gender_preference as (typeof VALID_GENDER_PREFERENCES)[number])
    ) {
      return { success: false, error: "Invalid gender preference." };
    }

    if (
      data.where_staying &&
      !VALID_WHERE_STAYING.includes(data.where_staying as (typeof VALID_WHERE_STAYING)[number])
    ) {
      return { success: false, error: "Invalid where staying value." };
    }

    if (typeof data.additional_notes !== "string" || data.additional_notes.length > MAX_ADDITIONAL_NOTES_LENGTH) {
      return { success: false, error: `Additional notes must be ${MAX_ADDITIONAL_NOTES_LENGTH} characters or less.` };
    }

    if (
      !Array.isArray(data.required_teammates) ||
      data.required_teammates.length > MAX_REQUIRED_TEAMMATES ||
      data.required_teammates.some((e) => typeof e !== "string" || !e.trim())
    ) {
      return { success: false, error: "Invalid required teammates." };
    }

    const teammateEmails = data.required_teammates.map((e) => e.trim().toLowerCase());

    if (teammateEmails.includes(user.email.toLowerCase())) {
      return { success: false, error: "You cannot add yourself as a required teammate." };
    }

    if (new Set(teammateEmails).size !== teammateEmails.length) {
      return { success: false, error: "Duplicate required teammates are not allowed." };
    }

    const now = Date.now();

    const { data: existingIntake } = await supabaseAdmin
      .from(TEAM_MATCHING_INTAKE_TABLE)
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle()
      .throwOnError();
    if (existingIntake) {
      return { success: false, error: "You have already submitted the team matching survey." };
    }

    // Look up the teammates' user IDs from their emails. Only registered participants can be
    // teammates. The lookup shares the email lookup rate limit, so it cannot be used to test emails.
    let requiredTeammateIds: string[] = [];
    if (teammateEmails.length > 0) {
      if (!(await isWithinRateLimit(`email-lookup:${userId}`, EMAIL_LOOKUP_LIMIT, TEN_MINUTES))) {
        return { success: false, error: RATE_LIMIT_TOO_MANY_ATTEMPTS };
      }

      const { data: teammates } = await supabaseAdmin
        .from(USERS_TABLE)
        .select("id, email")
        .in("email", teammateEmails)
        .eq("role", PARTICIPANT)
        .not("first_name", "is", null)
        .throwOnError();
      const idByEmail = new Map((teammates ?? []).map((row) => [row.email as string, row.id as string]));
      if (teammateEmails.some((email) => !idByEmail.has(email))) {
        return { success: false, error: "One or more required teammates could not be found." };
      }
      requiredTeammateIds = teammateEmails.map((email) => idByEmail.get(email) as string);
    }

    // The user_id primary key rejects a second submission with a unique violation
    try {
      await supabaseAdmin
        .from(TEAM_MATCHING_INTAKE_TABLE)
        .insert({
          user_id: userId,
          experience_level: data.experience_level,
          preferred_roles: data.preferred_roles,
          skills: data.skills,
          additional_notes: data.additional_notes,
          preferred_team_size: data.preferred_team_size,
          work_style: data.work_style,
          required_teammates: requiredTeammateIds,
          consent: data.consent,
          gender_preference: data.gender_preference ?? null,
          where_staying: data.where_staying ?? null,
          created_at: now,
        })
        .throwOnError();
    } catch (err) {
      if (err instanceof PostgrestError && err.code === UNIQUE_VIOLATION) {
        return { success: false, error: "You have already submitted the team matching survey." };
      }
      throw err;
    }

    return { success: true };
  } catch (error) {
    const detailedError = error instanceof Error ? error.message : "An unknown error occurred";
    console.error("Team matching intake error:", detailedError);

    const isProduction = process.env.APP_ENV === "production";
    const errorMessage = isProduction ? "An unknown error occurred. Please try again." : detailedError;

    return { success: false, error: errorMessage };
  }
};
