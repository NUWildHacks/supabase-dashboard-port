"use server";

import { revalidatePath } from "next/cache";

import supabaseAdmin from "@/config/supabase-admin";
import { DASHBOARD_PATH, LOGIN_PATH, PARTICIPANT, RESUMES_BUCKET, RESUMES_TABLE } from "@/constants";
import { getAuthenticatedUser, requireRole } from "@/lib";
import { ActionResult } from "@/types";

import { ResumeMetadata } from "../types";

export const deleteResume = async (): Promise<ActionResult> => {
  try {
    const redirectPath = `${LOGIN_PATH}?redirect=${encodeURIComponent(DASHBOARD_PATH)}`;
    const user = await getAuthenticatedUser(redirectPath);

    const roleError = requireRole(user, PARTICIPANT, "You are not authorized to delete a resume");
    if (roleError) return roleError;

    const { data: resumeRow, error: resumeError } = await supabaseAdmin
      .from(RESUMES_TABLE)
      .select()
      .eq("id", user.id)
      .maybeSingle();
    if (resumeError) throw resumeError;

    if (!resumeRow) {
      return { success: false, error: "Resume not found" };
    }

    const { storage_path } = resumeRow as Omit<ResumeMetadata, "id">;

    const { error: removeError } = await supabaseAdmin.storage.from(RESUMES_BUCKET).remove([storage_path]);
    if (removeError) throw removeError;

    const { error: deleteError } = await supabaseAdmin.from(RESUMES_TABLE).delete().eq("id", user.id);
    if (deleteError) {
      console.error(`Resume row ${user.id} delete failed after storage delete — dangling row:`, deleteError);
    }

    revalidatePath(DASHBOARD_PATH);

    return { success: true };
  } catch (error) {
    const detailedError = error instanceof Error ? error.message : "An unknown error occurred";
    console.error("Delete resume error:", detailedError);

    const isProduction = process.env.APP_ENV === "production";
    const errorMessage = isProduction ? "An unknown error occurred. Please try again." : detailedError;

    return { success: false, error: errorMessage };
  }
};
