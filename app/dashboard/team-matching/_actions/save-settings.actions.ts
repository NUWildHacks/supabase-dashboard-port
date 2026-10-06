"use server";

import { z } from "zod";

import supabaseAdmin from "@/config/supabase-admin";
import { ADMIN, DASHBOARD_PATH, LOGIN_PATH, TEAM_MATCHING_SETTINGS_TABLE } from "@/constants";
import { getAuthenticatedUser, requireRole } from "@/lib/server";
import type { ActionResult, TeamMatchingSettings } from "@/types";

export type SaveSettingsData = Omit<TeamMatchingSettings, "updated_at">;

const weightSchema = z.number().finite().min(0).max(1);

// z.object drops unknown keys (for example the previous updated_at), so only real columns are written.
const saveSettingsSchema = z.object({
  default_team_size: z.number().int().min(2).max(10),
  enforce_mutual_requirement: z.boolean(),
  enforce_tech_member: z.boolean(),
  where_to_meet: z.string().max(200),
  weight_role_diversity: weightSchema,
  weight_work_style: weightSchema,
  weight_skills_complementarity: weightSchema,
  weight_experience_mix: weightSchema,
  weight_gender_preference: weightSchema,
  weight_proximity: weightSchema,
  weight_size_preference: weightSchema,
});

export const saveSettings = async (rawData: SaveSettingsData): Promise<ActionResult> => {
  try {
    const redirectPath = `${LOGIN_PATH}?redirect=${encodeURIComponent(DASHBOARD_PATH)}`;
    const user = await getAuthenticatedUser(redirectPath);
    const roleCheck = requireRole(user, ADMIN);
    if (roleCheck) return roleCheck;

    const parsed = saveSettingsSchema.safeParse(rawData);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return { success: false, error: `Invalid setting ${String(issue?.path[0] ?? "")}: ${issue?.message}` };
    }
    const data = parsed.data;

    const totalWeight =
      data.weight_role_diversity +
      data.weight_work_style +
      data.weight_skills_complementarity +
      data.weight_experience_mix +
      data.weight_gender_preference +
      data.weight_proximity +
      data.weight_size_preference;

    if (Math.abs(totalWeight - 1.0) > 0.01) {
      return { success: false, error: `Weights must sum to 1.0 (currently ${totalWeight.toFixed(3)}).` };
    }

    await supabaseAdmin
      .from(TEAM_MATCHING_SETTINGS_TABLE)
      .upsert({ id: "team_matching_settings", ...data, updated_at: Date.now() })
      .throwOnError();

    return { success: true };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "An unknown error occurred";
    return { success: false, error: msg };
  }
};
