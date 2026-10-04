"use server";

import supabaseAdmin from "@/config/supabase-admin";
import { TEAM_MATCHING_INTAKE_TABLE, USERS_TABLE, LOGIN_PATH, DASHBOARD_PATH, PARTICIPANT } from "@/constants";
import { getAuthenticatedUser, requireRole } from "@/lib";
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

export type TeamMatchingIntakeData = {
  experience_level: string;
  preferred_roles: string[];
  skills: Record<string, number>;
  additional_notes: string;
  preferred_team_size: number;
  work_style: string;
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

    if (!data.consent) {
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

    if (
      !Array.isArray(data.required_teammates) ||
      data.required_teammates.length > MAX_REQUIRED_TEAMMATES ||
      data.required_teammates.some((e) => typeof e !== "string" || !e.trim())
    ) {
      return { success: false, error: "Invalid required teammates." };
    }

    if (data.required_teammates.includes(userId)) {
      return { success: false, error: "You cannot add yourself as a required teammate." };
    }

    if (new Set(data.required_teammates).size !== data.required_teammates.length) {
      return { success: false, error: "Duplicate required teammates are not allowed." };
    }

    const now = Date.now();

    if (data.required_teammates.length > 0) {
      const { data: teammates, error: teammatesError } = await supabaseAdmin
        .from(USERS_TABLE)
        .select("id")
        .in("id", data.required_teammates);
      if (teammatesError) throw teammatesError;
      if ((teammates ?? []).length !== data.required_teammates.length) {
        return { success: false, error: "One or more required teammates could not be found." };
      }
    }

    // The user_id primary key rejects a second submission with a unique violation
    const { error } = await supabaseAdmin.from(TEAM_MATCHING_INTAKE_TABLE).insert({
      user_id: userId,
      experience_level: data.experience_level,
      preferred_roles: data.preferred_roles,
      skills: data.skills,
      additional_notes: data.additional_notes,
      preferred_team_size: data.preferred_team_size,
      work_style: data.work_style,
      required_teammates: data.required_teammates,
      consent: data.consent,
      gender_preference: data.gender_preference ?? null,
      where_staying: data.where_staying ?? null,
      created_at: now,
    });

    if (error?.code === UNIQUE_VIOLATION) {
      return { success: false, error: "You have already submitted the team matching survey." };
    }
    if (error) throw error;

    return { success: true };
  } catch (error) {
    const detailedError = error instanceof Error ? error.message : "An unknown error occurred";
    console.error("Team matching intake error:", detailedError);

    const isProduction = process.env.APP_ENV === "production";
    const errorMessage = isProduction ? "An unknown error occurred. Please try again." : detailedError;

    return { success: false, error: errorMessage };
  }
};
