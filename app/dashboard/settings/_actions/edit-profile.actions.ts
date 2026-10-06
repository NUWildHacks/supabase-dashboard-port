"use server";

import { revalidatePath } from "next/cache";

import supabaseAdmin from "@/config/supabase-admin";
import { ADMIN, DASHBOARD_SETTINGS_PATH, JUDGE, JUDGE_AND_MENTOR, LOGIN_PATH, USERS_TABLE } from "@/constants";
import { getAuthenticatedUser, getConfig } from "@/lib/server";
import type { ActionResult, User } from "@/types";

import {
  editAdminProfileFormSchema,
  EditAdminProfileFormSchema,
  editJudgeMentorProfileFormSchema,
  EditJudgeMentorProfileFormSchema,
  editParticipantProfileFormSchema,
  EditParticipantProfileFormSchema,
} from "../_schemas/edit-profile-form.schemas";

/**
 * The profile form schema for each role. Parsing with it keeps only the fields that role may edit,
 * so a crafted request cannot change `role`, `id`, `email`, or other columns.
 */
const getProfileSchema = (role: User["role"]) => {
  if (role === ADMIN) return editAdminProfileFormSchema;
  if (role === JUDGE || role === JUDGE_AND_MENTOR) return editJudgeMentorProfileFormSchema;
  return editParticipantProfileFormSchema;
};

export type EditProfileResult<
  T extends EditParticipantProfileFormSchema | EditAdminProfileFormSchema | EditJudgeMentorProfileFormSchema,
> = ActionResult<T>;

export const editProfile = async <
  T extends EditParticipantProfileFormSchema | EditAdminProfileFormSchema | EditJudgeMentorProfileFormSchema,
>(
  data: T
): Promise<EditProfileResult<T>> => {
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
    const { id: userId, role } = await getAuthenticatedUser(redirectPath);

    const parsed = getProfileSchema(role).safeParse(data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid profile data" };
    }

    await supabaseAdmin
      .from(USERS_TABLE)
      .update({
        ...parsed.data,
        updated_at: now,
      })
      .eq("id", userId)
      .throwOnError();

    revalidatePath(DASHBOARD_SETTINGS_PATH);

    return { success: true };
  } catch (error) {
    const detailedError = error instanceof Error ? error.message : "An unknown error occurred";
    console.error("Edit profile error:", detailedError);

    const isProduction = process.env.APP_ENV === "production";
    const errorMessage = isProduction ? "An unknown error occurred. Please try again." : detailedError;

    return { success: false, error: errorMessage };
  }
};
