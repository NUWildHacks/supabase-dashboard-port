"use server";

import { revalidatePath } from "next/cache";

import supabaseAdmin from "@/config/supabase-admin";
import { DASHBOARD_PATH, LOGIN_PATH, PARTICIPANT, RESUMES_BUCKET, RESUMES_TABLE } from "@/constants";
import { getAuthenticatedUser, getConfig, requireRole } from "@/lib/server";
import { ActionResult } from "@/types";

import { MAX_FILE_SIZE, RESUME_MIME_TYPE } from "../constants";
import { ResumeMetadata } from "../types";

/**
 * Supabase Storage only accepts ASCII letters, digits, and a few symbols in object names.
 * Strip accents ("José" -> "Jose") and replace any other character with "_".
 */
const toStorageSafeName = (fileName: string) =>
  fileName
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9 ._'()-]/g, "_");

// Every PDF file starts with these bytes.
const PDF_SIGNATURE = Buffer.from("%PDF-");

export const uploadResume = async (resume: File): Promise<ActionResult> => {
  const now = Date.now();

  if (!(resume instanceof File)) return { success: false, error: "Only PDFs are allowed" };
  if (resume.type !== RESUME_MIME_TYPE) return { success: false, error: "Only PDFs are allowed" };
  if (resume.size > MAX_FILE_SIZE) return { success: false, error: "File exceeds 5MB limit" };

  try {
    const redirectPath = `${LOGIN_PATH}?redirect=${encodeURIComponent(DASHBOARD_PATH)}`;
    const user = await getAuthenticatedUser(redirectPath);
    const { id, first_name, last_name } = user;

    const roleError = requireRole(user, PARTICIPANT, "You are not authorized to upload a resume");
    if (roleError) return roleError;

    const { end_time } = await getConfig();
    if (now >= end_time) return { success: false, error: "Resume uploads are closed" };

    // The browser sets the file type, so also check that the content is a PDF.
    const buffer = Buffer.from(await resume.arrayBuffer());
    if (!buffer.subarray(0, PDF_SIGNATURE.length).equals(PDF_SIGNATURE)) {
      return { success: false, error: "Only PDFs are allowed" };
    }

    const bucket = supabaseAdmin.storage.from(RESUMES_BUCKET);
    const newFileName = `${first_name} ${last_name} - Resume.pdf`;
    const newStoragePath = `${id}/${toStorageSafeName(newFileName)}`;

    const { data: resumeRow } = await supabaseAdmin
      .from(RESUMES_TABLE)
      .select()
      .eq("id", id)
      .maybeSingle()
      .throwOnError();

    // Upload first so a failed upload never leaves the row pointing at a deleted file.
    const { error: uploadError } = await bucket.upload(newStoragePath, buffer, {
      contentType: RESUME_MIME_TYPE,
      upsert: true,
    });
    if (uploadError) throw uploadError;

    if (resumeRow) {
      await supabaseAdmin
        .from(RESUMES_TABLE)
        .update({
          file_name: newFileName,
          storage_path: newStoragePath,
          updated_at: now,
        } as Omit<ResumeMetadata, "id" | "created_at">)
        .eq("id", id)
        .throwOnError();

      const { storage_path: oldStoragePath } = resumeRow as Omit<ResumeMetadata, "id">;
      if (oldStoragePath !== newStoragePath) {
        const { error: removeError } = await bucket.remove([oldStoragePath]);
        if (removeError) console.error(`Old resume ${oldStoragePath} remove failed — orphaned file:`, removeError);
      }
    } else {
      await supabaseAdmin
        .from(RESUMES_TABLE)
        .upsert({
          id,
          file_name: newFileName,
          storage_path: newStoragePath,
          created_at: now,
          updated_at: now,
        } as ResumeMetadata)
        .throwOnError();
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
