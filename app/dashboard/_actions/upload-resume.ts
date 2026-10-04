"use server";

import { revalidatePath } from "next/cache";

import supabaseAdmin from "@/config/supabase-admin";
import { DASHBOARD_PATH, LOGIN_PATH, PARTICIPANT, RESUMES_BUCKET, RESUMES_TABLE } from "@/constants";
import { getAuthenticatedUser, requireRole } from "@/lib";
import { ActionResult } from "@/types";

import { MAX_FILE_SIZE, RESUME_MIME_TYPE } from "../constants";
import { ResumeMetadata } from "../types";

export const uploadResume = async (resume: File): Promise<ActionResult> => {
  const now = Date.now();

  if (resume.type !== RESUME_MIME_TYPE) return { success: false, error: "Only PDFs are allowed" };
  if (resume.size > MAX_FILE_SIZE) return { success: false, error: "File exceeds 5MB limit" };

  try {
    const redirectPath = `${LOGIN_PATH}?redirect=${encodeURIComponent(DASHBOARD_PATH)}`;
    const user = await getAuthenticatedUser(redirectPath);
    const { id, first_name, last_name } = user;

    const roleError = requireRole(user, PARTICIPANT, "You are not authorized to upload a resume");
    if (roleError) return roleError;

    const bucket = supabaseAdmin.storage.from(RESUMES_BUCKET);
    const newFileName = `${first_name} ${last_name} - Resume.pdf`;
    const newStoragePath = `${id}/${newFileName}`;

    const { data: resumeRow, error: resumeError } = await supabaseAdmin
      .from(RESUMES_TABLE)
      .select()
      .eq("id", id)
      .maybeSingle();
    if (resumeError) throw resumeError;

    if (resumeRow) {
      const { storage_path: oldStoragePath } = resumeRow as Omit<ResumeMetadata, "id">;

      if (oldStoragePath !== newStoragePath) {
        const { error: removeError } = await bucket.remove([oldStoragePath]);
        if (removeError) throw removeError;
      }
    }

    const buffer = Buffer.from(await resume.arrayBuffer());
    const { error: uploadError } = await bucket.upload(newStoragePath, buffer, {
      contentType: RESUME_MIME_TYPE,
      upsert: true,
    });
    if (uploadError) throw uploadError;

    if (resumeRow) {
      const { error: updateError } = await supabaseAdmin
        .from(RESUMES_TABLE)
        .update({
          file_name: newFileName,
          storage_path: newStoragePath,
          updated_at: now,
        } as Omit<ResumeMetadata, "id" | "created_at">)
        .eq("id", id);
      if (updateError) throw updateError;
    } else {
      const { error: insertError } = await supabaseAdmin.from(RESUMES_TABLE).upsert({
        id,
        file_name: newFileName,
        storage_path: newStoragePath,
        created_at: now,
        updated_at: now,
      } as ResumeMetadata);
      if (insertError) throw insertError;
    }

    revalidatePath(DASHBOARD_PATH);

    return { success: true };
  } catch (error) {
    const detailedError = error instanceof Error ? error.message : "An unknown error occurred";
    console.error("Upload resume error:", detailedError);

    const isProduction = process.env.APP_ENV === "production";
    const errorMessage = isProduction ? "An unknown error occurred. Please try again." : detailedError;

    return { success: false, error: errorMessage };
  }
};
