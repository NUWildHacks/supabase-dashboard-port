"use server";

import { revalidatePath } from "next/cache";

import supabaseAdmin from "@/config/supabase-admin";
import {
  CROWD_FAVORITE_VOTES_TABLE,
  DASHBOARD_CROWD_FAVORITE_PATH,
  DASHBOARD_PATH,
  LOGIN_PATH,
  PARTICIPANT,
} from "@/constants";
import { getAuthenticatedUser, getConfig, getSecrets, requireRole } from "@/lib";
import type { ActionResult } from "@/types";

import { getCrowdFavoriteProject } from "../_lib";
import { crowdFavoriteVoteFormSchema, type CrowdFavoriteVoteFormSchema } from "../_schemas/vote-form.schemas";
import { isCrowdFavoriteVotingOpen } from "../constants";

type SubmitCrowdFavoriteVoteResult = ActionResult<CrowdFavoriteVoteFormSchema>;

const submitCrowdFavoriteVote = async (
  rawData: CrowdFavoriteVoteFormSchema
): Promise<SubmitCrowdFavoriteVoteResult> => {
  try {
    const redirectPath = `${LOGIN_PATH}?redirect=${encodeURIComponent(DASHBOARD_CROWD_FAVORITE_PATH)}`;
    const caller = await getAuthenticatedUser(redirectPath);

    const roleCheck = requireRole(caller, PARTICIPANT);
    if (roleCheck) return roleCheck;

    const [config, secrets] = await Promise.all([getConfig(), getSecrets()]);

    if (!(await isCrowdFavoriteVotingOpen(config))) {
      return { success: false, error: "Voting is not open right now" };
    }

    const parsed = crowdFavoriteVoteFormSchema.safeParse(rawData);
    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      const firstField = firstIssue.path[0];

      return {
        success: false,
        error: firstIssue.message,
        field: typeof firstField === "string" ? (firstField as keyof CrowdFavoriteVoteFormSchema) : undefined,
      };
    }

    const data = parsed.data;

    if (secrets.crowd_favorite_password !== data.crowd_favorite_password) {
      return {
        success: false,
        error: "Incorrect crowd favorite password",
        field: "crowd_favorite_password",
      };
    }

    const now = Date.now();

    const selectedProject = await getCrowdFavoriteProject(data.selected_project_id);
    if (!selectedProject) {
      throw new Error("Selected project no longer exists");
    }

    // The primary key on user_id allows one vote per user, so the upsert replaces any previous vote.
    const { error: voteError } = await supabaseAdmin
      .from(CROWD_FAVORITE_VOTES_TABLE)
      .upsert(
        { user_id: caller.id, crowd_favorite_id: data.selected_project_id, created_at: now },
        { onConflict: "user_id" }
      );
    if (voteError) throw voteError;

    revalidatePath(DASHBOARD_CROWD_FAVORITE_PATH);
    revalidatePath(DASHBOARD_PATH);

    return { success: true };
  } catch (error) {
    const detailedError = error instanceof Error ? error.message : "An unknown error occurred";
    console.error("Crowd favorite submit vote error:", detailedError);

    const isProduction = process.env.APP_ENV === "production";
    const errorMessage = isProduction ? "An unknown error occurred. Please try again." : detailedError;

    return { success: false, error: errorMessage };
  }
};

export { submitCrowdFavoriteVote };
export type { SubmitCrowdFavoriteVoteResult };
