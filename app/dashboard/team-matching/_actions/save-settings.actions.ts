"use server";

import supabaseAdmin from "@/config/supabase-admin";
import { ADMIN, DASHBOARD_PATH, LOGIN_PATH, TEAM_MATCHING_SETTINGS_TABLE } from "@/constants";
import { getAuthenticatedUser, requireRole } from "@/lib/server";
import type { ActionResult, TeamMatchingSettings } from "@/types";

export type SaveSettingsData = Omit<TeamMatchingSettings, "updated_at">;

export const saveSettings = async (data: SaveSettingsData): Promise<ActionResult> => {
  try {
    const redirectPath = `${LOGIN_PATH}?redirect=${encodeURIComponent(DASHBOARD_PATH)}`;
    const user = await getAuthenticatedUser(redirectPath);
    const roleCheck = requireRole(user, ADMIN);
    if (roleCheck) return roleCheck;

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

    // Write only real columns: the client may send extra keys (e.g. the previous updated_at)
    await supabaseAdmin
      .from(TEAM_MATCHING_SETTINGS_TABLE)
      .upsert({
        id: "team_matching_settings",
        default_team_size: data.default_team_size,
        enforce_mutual_requirement: data.enforce_mutual_requirement,
        enforce_tech_member: data.enforce_tech_member,
        where_to_meet: data.where_to_meet,
        weight_role_diversity: data.weight_role_diversity,
        weight_work_style: data.weight_work_style,
        weight_skills_complementarity: data.weight_skills_complementarity,
        weight_experience_mix: data.weight_experience_mix,
        weight_gender_preference: data.weight_gender_preference,
        weight_proximity: data.weight_proximity,
        weight_size_preference: data.weight_size_preference,
        updated_at: Date.now(),
      })
      .throwOnError();

    return { success: true };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "An unknown error occurred";
    return { success: false, error: msg };
  }
};
