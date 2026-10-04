"use server";

import { revalidatePath } from "next/cache";

import supabaseAdmin from "@/config/supabase-admin";
import { ADMIN, DASHBOARD_MANAGE_USERS_PATH, LOGIN_PATH } from "@/constants";
import { getAuthenticatedUser, requireRole } from "@/lib";
import { ActionResult } from "@/types";

import { JudgingAssignmentsCsvArraySchema } from "../_schemas";
import { JudgingAssignment, JudgingRound, Project } from "../../judging/types";

export type UploadAssignmentsResult = ActionResult<JudgingAssignmentsCsvArraySchema>;

export const uploadAssignments = async (
  data: JudgingAssignmentsCsvArraySchema,
  uploadRound: JudgingRound
): Promise<UploadAssignmentsResult> => {
  try {
    const redirectPath = `${LOGIN_PATH}?redirect=${encodeURIComponent(DASHBOARD_MANAGE_USERS_PATH)}`;
    const user = await getAuthenticatedUser(redirectPath);

    const roleError = requireRole(user, ADMIN, "You are not authorized to upload judging assignments");
    if (roleError) return roleError;

    const projects: Project[] = [];
    const judgingAssignments: Pick<JudgingAssignment, "judge_id" | "project_id" | "order" | "room_id">[] = [];

    const seenProjectIds = new Set<Project["id"]>();

    for (const assignment of data) {
      const { judge_id, project_id, project_name, track, devpost_url, room_id, order } = assignment;

      if (!seenProjectIds.has(project_id)) {
        seenProjectIds.add(project_id);

        projects.push({
          id: project_id,
          name: project_name,
          track,
          devpost_url,
        } as Project);
      }

      judgingAssignments.push({
        judge_id,
        project_id,
        order,
        room_id: room_id === "" ? null : room_id,
      } as Pick<JudgingAssignment, "judge_id" | "project_id" | "order" | "room_id">);
    }

    // Deletes the round's old projects and assignments and inserts the new ones in one transaction.
    const { error } = await supabaseAdmin.rpc("replace_judging_round", {
      p_round: uploadRound,
      p_projects: projects,
      p_assignments: judgingAssignments,
    });
    if (error) throw error;

    revalidatePath(DASHBOARD_MANAGE_USERS_PATH);

    return { success: true };
  } catch (error) {
    const detailedError = error instanceof Error ? error.message : "An unknown error occurred";
    console.error("Upload assignments error:", detailedError);

    const isProduction = process.env.APP_ENV === "production";
    const errorMessage = isProduction ? "An unknown error occurred. Please try again." : detailedError;

    return { success: false, error: errorMessage };
  }
};
