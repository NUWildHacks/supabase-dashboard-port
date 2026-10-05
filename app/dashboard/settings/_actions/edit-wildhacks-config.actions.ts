"use server";

import { revalidatePath } from "next/cache";

import supabaseAdmin from "@/config/supabase-admin";
import {
  ADMIN,
  DASHBOARD_PATH,
  DASHBOARD_SETTINGS_PATH,
  LOGIN_PATH,
  WILDHACKS_CONFIG_TABLE,
  WILDHACKS_SECRETS_TABLE,
} from "@/constants";
import { getAuthenticatedUser, requireRole } from "@/lib/server";
import type { ActionResult } from "@/types";

import {
  editWildhacksConfigFormSchema,
  type EditWildhacksConfigFormSchema,
} from "../_schemas/edit-wildhacks-config-form.schemas";

export type EditWildhacksConfigResult = ActionResult<EditWildhacksConfigFormSchema>;

export const editWildhacksConfig = async (data: EditWildhacksConfigFormSchema): Promise<EditWildhacksConfigResult> => {
  const now = Date.now();

  try {
    const redirectPath = `${LOGIN_PATH}?redirect=${encodeURIComponent(DASHBOARD_SETTINGS_PATH)}`;
    const user = await getAuthenticatedUser(redirectPath);

    const roleError = requireRole(user, ADMIN, "You are not authorized to edit the Wildhacks config");
    if (roleError) return roleError;

    // Parse on the server too: the schema drops unknown keys, so only these settings can change.
    const parsed = editWildhacksConfigFormSchema.safeParse(data);
    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      const firstField = firstIssue?.path[0];
      return {
        success: false,
        error: firstIssue?.message ?? "Invalid configuration",
        field: typeof firstField === "string" ? (firstField as keyof EditWildhacksConfigFormSchema) : undefined,
      };
    }

    const { max_team_size, max_participants, crowd_favorite_password, ...rest } = parsed.data;

    // Save the config first and the password only after it succeeds, so a failed save never
    // changes just one of them.
    const { data: updatedConfigRows } = await supabaseAdmin
      .from(WILDHACKS_CONFIG_TABLE)
      .update({
        ...rest,
        max_team_size: Number(max_team_size),
        max_participants: Number(max_participants),
        updated_at: now,
      })
      .eq("id", "config")
      .select("id")
      .throwOnError();
    if (updatedConfigRows.length === 0) {
      throw new Error("WildHacks configuration not found");
    }

    await supabaseAdmin.from(WILDHACKS_SECRETS_TABLE).upsert({ id: "secrets", crowd_favorite_password }).throwOnError();

    revalidatePath(DASHBOARD_SETTINGS_PATH);
    revalidatePath(DASHBOARD_PATH);

    return { success: true };
  } catch (error) {
    const detailedError = error instanceof Error ? error.message : "An unknown error occurred";
    console.error("Edit wildhacks config error:", detailedError);

    const isProduction = process.env.APP_ENV === "production";
    const errorMessage = isProduction ? "An unknown error occurred. Please try again." : detailedError;

    return { success: false, error: errorMessage };
  }
};
