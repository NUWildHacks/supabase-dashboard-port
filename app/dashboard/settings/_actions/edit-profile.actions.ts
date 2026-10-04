"use server";

import { revalidatePath } from "next/cache";

import supabaseAdmin from "@/config/supabase-admin";
import { USERS_TABLE, LOGIN_PATH, DASHBOARD_SETTINGS_PATH } from "@/constants";
import { getAuthenticatedUser, getConfig } from "@/lib";
import type { ActionResult } from "@/types";

import {
  EditAdminProfileFormSchema,
  EditJudgeMentorProfileFormSchema,
  EditParticipantProfileFormSchema,
} from "../_schemas/edit-profile-form.schemas";

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
    const { id: userId } = await getAuthenticatedUser(redirectPath);

    const { error } = await supabaseAdmin
      .from(USERS_TABLE)
      .update({
        ...data,
        updated_at: now,
      })
      .eq("id", userId);
    if (error) throw error;

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
