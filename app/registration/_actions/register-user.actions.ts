"use server";

import { redirect } from "next/navigation";

import supabaseAdmin from "@/config/supabase-admin";
import { USERS_TABLE, PARTICIPANT, LOGIN_PATH, REGISTRATION_PATH, PARTICIPANT_USER_FIELDS } from "@/constants";
import { verifySession } from "@/lib";
import type { ActionResult, WildHacksConfig } from "@/types";

import { type RegistrationFormSchema } from "../_schemas/registration-form.schemas";

export type RegisterUserResult = ActionResult<RegistrationFormSchema>;

export const registerUser = async (
  data: RegistrationFormSchema,
  _start_time: WildHacksConfig["start_time"],
  end_time: WildHacksConfig["end_time"],
  max_participants: WildHacksConfig["max_participants"],
  _registration_deadline: WildHacksConfig["registration_deadline"]
): Promise<RegisterUserResult> => {
  const userInfo = await verifySession();
  if (!userInfo) redirect(`${LOGIN_PATH}?redirect=${encodeURIComponent(REGISTRATION_PATH)}`);

  const { id: userId } = userInfo;

  const now = Date.now();

  try {
    if (now >= end_time) {
      throw new Error("The event has ended");
    }

    const { ...rest } = data;

    const { count: participantCount, error: countError } = await supabaseAdmin
      .from(USERS_TABLE)
      .select("id", { count: "exact", head: true })
      .eq(PARTICIPANT_USER_FIELDS.role, PARTICIPANT);
    if (countError) throw countError;
    if ((participantCount ?? 0) >= max_participants) {
      throw new Error("The event is full");
    }

    const { data: emailRows, error: emailError } = await supabaseAdmin
      .from(USERS_TABLE)
      .select("id")
      .eq(PARTICIPANT_USER_FIELDS.email, userInfo.email)
      .limit(1);
    if (emailError) throw emailError;

    const { error: upsertError } = await supabaseAdmin.from(USERS_TABLE).upsert({
      ...rest,
      id: userId,
      role: PARTICIPANT,
      created_at: now,
      updated_at: now,
    });
    if (upsertError) throw upsertError;

    // Delete the pre-created email row, but never the row that was just written.
    const emailRowId = emailRows?.[0]?.id;
    if (emailRowId && emailRowId !== userId) {
      const { error: deleteError } = await supabaseAdmin.from(USERS_TABLE).delete().eq("id", emailRowId);
      if (deleteError) throw deleteError;
    }

    return { success: true };
  } catch (error) {
    const detailedError = error instanceof Error ? error.message : "An unknown error occurred";
    console.error("Registration error:", detailedError);

    const isProduction = process.env.APP_ENV === "production";
    const errorMessage = isProduction ? "An unknown error occurred. Please try again." : detailedError;

    return {
      success: false,
      error: errorMessage,
    };
  }
};
