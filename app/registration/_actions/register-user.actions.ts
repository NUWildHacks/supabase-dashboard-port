"use server";

import { redirect } from "next/navigation";

import supabaseAdmin from "@/config/supabase-admin";
import { USERS_TABLE, PARTICIPANT, LOGIN_PATH, REGISTRATION_PATH, PARTICIPANT_USER_FIELDS } from "@/constants";
import { isAuthUserId } from "@/lib/auth-user.lib";
import { getConfig, verifySession } from "@/lib/server";
import type { ActionResult, WildHacksConfig } from "@/types";

import { registrationFormSchema, type RegistrationFormSchema } from "../_schemas/registration-form.schemas";
import { checkUserCanLogin } from "../../login/_lib/check-user-can-login";

export type RegisterUserResult = ActionResult<RegistrationFormSchema>;

export const registerUser = async (
  data: RegistrationFormSchema,
  _start_time: WildHacksConfig["start_time"],
  _end_time: WildHacksConfig["end_time"],
  _max_participants: WildHacksConfig["max_participants"],
  _registration_deadline: WildHacksConfig["registration_deadline"]
): Promise<RegisterUserResult> => {
  const userInfo = await verifySession();
  if (!userInfo) redirect(`${LOGIN_PATH}?redirect=${encodeURIComponent(REGISTRATION_PATH)}`);

  const { id: userId } = userInfo;

  const now = Date.now();

  try {
    // A Supabase session can be created without the OAuth callback, so check the login rule again.
    const gate = await checkUserCanLogin();
    if (!gate.success) return { success: false, error: gate.error };

    // Never trust the client: validate the form and read the limits from the database.
    const parsed = registrationFormSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid registration data" };
    }

    // Registration fills in a new row once. Afterwards, profile changes go through editProfile,
    // which allows fewer fields.
    const { data: ownRow } = await supabaseAdmin
      .from(USERS_TABLE)
      .select("role, first_name, last_name")
      .eq("id", userId)
      .maybeSingle()
      .throwOnError();
    if (ownRow && (ownRow.role !== PARTICIPANT || ownRow.first_name || ownRow.last_name)) {
      return { success: false, error: "You are already registered." };
    }

    const { end_time, max_participants } = await getConfig();

    if (now >= end_time) {
      throw new Error("The event has ended");
    }

    const { data: emailRows } = await supabaseAdmin
      .from(USERS_TABLE)
      .select("id")
      .eq(PARTICIPANT_USER_FIELDS.email, userInfo.email)
      .neq("id", userId)
      .limit(1)
      .throwOnError();
    const emailRowId: string | undefined = emailRows[0]?.id;

    // A row with this email that belongs to another sign-in account is a real registration,
    // not a pre-created row. Refuse instead of deleting that account's data.
    if (emailRowId && (await isAuthUserId(emailRowId))) {
      return {
        success: false,
        error: "This email is already registered. Sign in with the account you used before.",
      };
    }

    // Checks the participant limit, writes the row, and removes the pre-created email row in one
    // transaction.
    const { data: outcome } = await supabaseAdmin
      .rpc("register_participant", {
        p_row: {
          ...parsed.data,
          email: userInfo.email,
          id: userId,
          role: PARTICIPANT,
          created_at: now,
          updated_at: now,
        },
        p_precreated_id: emailRowId ?? null,
        p_max_participants: max_participants,
      })
      .throwOnError();

    if (outcome === "full") {
      return { success: false, error: "The event is full" };
    }
    if (outcome === "role_conflict") {
      return { success: false, error: "This account is not a participant account." };
    }
    if (outcome !== "registered") {
      throw new Error(`Unexpected registration result: ${String(outcome)}`);
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
