"use server";

import { revalidatePath } from "next/cache";

import supabaseAdmin from "@/config/supabase-admin";
import {
  CROWD_FAVORITES_TABLE,
  DASHBOARD_CROWD_FAVORITE_PATH,
  DASHBOARD_PATH,
  LOGIN_PATH,
  PARTICIPANT,
} from "@/constants";
import { getAuthenticatedUser, requireRole, getConfig } from "@/lib/server";
import type { ActionResult } from "@/types";

import { getCrowdFavoriteProject, getCrowdFavoriteProjectForUser } from "../_lib";
import { isCrowdFavoriteOptInOpen } from "../constants";

type CrowdFavoriteOptOutResult = ActionResult;

const optOutOfCrowdFavorite = async (): Promise<CrowdFavoriteOptOutResult> => {
  try {
    const redirectPath = `${LOGIN_PATH}?redirect=${encodeURIComponent(DASHBOARD_CROWD_FAVORITE_PATH)}`;
    const caller = await getAuthenticatedUser(redirectPath);

    const roleCheck = requireRole(caller, PARTICIPANT);
    if (roleCheck) return roleCheck;

    // Fetch config once to pass to all helpers
    const config = await getConfig();

    if (!(await isCrowdFavoriteOptInOpen(config))) {
      return { success: false, error: "Crowd favorite opt-out is currently closed" };
    }

    const crowdFavoriteProject = await getCrowdFavoriteProjectForUser(caller.id);
    if (!crowdFavoriteProject) {
      return { success: false, error: "You are not assigned to a crowd favorite project" };
    }

    // Re-read the project right before the delete.
    const project = await getCrowdFavoriteProject(crowdFavoriteProject.id);
    if (!project) {
      throw new Error("Crowd favorite project not found");
    }

    const callerIsMember = project.team_members.some((member) => member.id === caller.id);
    if (!callerIsMember) {
      throw new Error("You are not on this crowd favorite team");
    }

    // We remove the project row as a whole on opt-out so the team is no longer votable.
    // The foreign key on crowd_favorite_votes cascades, so votes for this project are deleted too.
    await supabaseAdmin.from(CROWD_FAVORITES_TABLE).delete().eq("id", project.id).throwOnError();

    revalidatePath(DASHBOARD_CROWD_FAVORITE_PATH);
    revalidatePath(DASHBOARD_PATH);

    return { success: true };
  } catch (error) {
    const detailedError = error instanceof Error ? error.message : "An unknown error occurred";
    console.error("Crowd favorite opt-out error:", detailedError);

    const isProduction = process.env.APP_ENV === "production";
    const errorMessage = isProduction ? "An unknown error occurred. Please try again." : detailedError;

    return { success: false, error: errorMessage };
  }
};

export { optOutOfCrowdFavorite };
export type { CrowdFavoriteOptOutResult };
