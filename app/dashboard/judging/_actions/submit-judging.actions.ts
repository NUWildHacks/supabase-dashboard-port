"use server";

import { revalidatePath } from "next/cache";

import supabaseAdmin from "@/config/supabase-admin";
import {
  LOGIN_PATH,
  DASHBOARD_JUDGING_ROUND_1_PATH,
  JUDGE,
  PROJECTS_TABLE,
  JUDGING_ASSIGNMENTS_TABLE,
  DASHBOARD_JUDGING_ROUND_2_PATH,
  JUDGE_AND_MENTOR,
} from "@/constants";
import { getAuthenticatedUser, requireRole } from "@/lib/server";
import type { ActionResult, JudgeUser } from "@/types";

import { judgingFormSchema, type JudgingFormSchema } from "../_schemas";
import type { JudgingAssignment, JudgingForm, JudgingRound, Project } from "../types";

export type SubmitJudgingResult = ActionResult<JudgingFormSchema>;

export const submitJudging = async (
  data: JudgingFormSchema,
  assignmentId: JudgingAssignment["id"],
  projectId: Project["id"],
  judgeId: JudgeUser["id"],
  currentPath: string,
  judgingRound: JudgingRound
): Promise<SubmitJudgingResult> => {
  const now = Date.now();

  if (currentPath !== DASHBOARD_JUDGING_ROUND_1_PATH && currentPath !== DASHBOARD_JUDGING_ROUND_2_PATH) {
    return {
      success: false,
      error: "Invalid path",
    };
  }

  try {
    const redirectPath = `${LOGIN_PATH}?redirect=${encodeURIComponent(currentPath)}`;
    const user = await getAuthenticatedUser(redirectPath);

    const roleError = requireRole(user, [JUDGE, JUDGE_AND_MENTOR], "You are not authorized to submit judging form");
    if (roleError) return roleError;

    if (user.id !== judgeId) {
      return {
        success: false,
        error: "You are not authorized to submit judging form for this judge",
      };
    }

    const parsed = judgingFormSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid judging form" };
    }

    const { data: project } = await supabaseAdmin
      .from(PROJECTS_TABLE)
      .select("id")
      .eq("judging_round", judgingRound)
      .eq("id", projectId)
      .maybeSingle()
      .throwOnError();
    if (!project) {
      return {
        success: false,
        error: "Project not found",
      };
    }

    const { data: judgingAssignment } = await supabaseAdmin
      .from(JUDGING_ASSIGNMENTS_TABLE)
      .select("judging_form")
      .eq("judging_round", judgingRound)
      .eq("id", assignmentId)
      .eq("judge_id", user.id)
      .eq("project_id", projectId)
      .maybeSingle()
      .throwOnError();
    if (!judgingAssignment) {
      return {
        success: false,
        error: "Judging assignment not found",
      };
    }

    const existingForm = judgingAssignment.judging_form as JudgingAssignment["judging_form"];

    const { data: updatedAssignments } = await supabaseAdmin
      .from(JUDGING_ASSIGNMENTS_TABLE)
      .update({
        judging_form: {
          ...parsed.data,
          created_at: existingForm?.created_at ?? now,
          updated_at: now,
        } as Partial<JudgingForm>,
      } as Partial<JudgingAssignment>)
      .eq("judging_round", judgingRound)
      .eq("id", assignmentId)
      .eq("judge_id", user.id)
      .select("id")
      .throwOnError();
    if (updatedAssignments.length === 0) {
      return {
        success: false,
        error: "Judging assignment not found",
      };
    }

    revalidatePath(currentPath);

    return { success: true };
  } catch (error) {
    const detailedError = error instanceof Error ? error.message : "An unknown error occurred";
    console.error("Submit judging form error:", detailedError);

    const isProduction = process.env.APP_ENV === "production";
    const errorMessage = isProduction ? "An unknown error occurred. Please try again." : detailedError;

    return { success: false, error: errorMessage };
  }
};
