"use server";

import supabaseAdmin from "@/config/supabase-admin";
import { DASHBOARD_PATH, LOGIN_PATH, PARTICIPANT, RESUMES_BUCKET, RESUMES_TABLE } from "@/constants";
import { getAuthenticatedUser, requireRole } from "@/lib/server";
import { ActionResult } from "@/types";

import { ResumeMetadata } from "../types";

const SIGNED_URL_EXPIRES_IN_SECONDS = 60;

export type GetResumeDownloadUrlResult = ActionResult & { url?: string };

/**
 * Create a short-lived signed URL to download the current user's resume.
 *
 * @returns Promise resolving to the signed URL on success, or an error
 */
export const getResumeDownloadUrl = async (): Promise<GetResumeDownloadUrlResult> => {
  try {
    const redirectPath = `${LOGIN_PATH}?redirect=${encodeURIComponent(DASHBOARD_PATH)}`;
    const user = await getAuthenticatedUser(redirectPath);

    const roleError = requireRole(user, PARTICIPANT, "You are not authorized to download a resume");
    if (roleError) return roleError;

    const { data: resumeRow } = await supabaseAdmin
      .from(RESUMES_TABLE)
      .select()
      .eq("id", user.id)
      .maybeSingle()
      .throwOnError();

    if (!resumeRow) {
      return { success: false, error: "Resume not found" };
    }

    const { storage_path } = resumeRow as Omit<ResumeMetadata, "id">;

    const { data, error } = await supabaseAdmin.storage
      .from(RESUMES_BUCKET)
      .createSignedUrl(storage_path, SIGNED_URL_EXPIRES_IN_SECONDS);
    if (error) throw error;

    return { success: true, url: data.signedUrl };
  } catch (error) {
    const detailedError = error instanceof Error ? error.message : "An unknown error occurred";
    console.error("Get resume download URL error:", detailedError);

    const isProduction = process.env.APP_ENV === "production";
    const errorMessage = isProduction ? "An unknown error occurred. Please try again." : detailedError;

    return { success: false, error: errorMessage };
  }
};
