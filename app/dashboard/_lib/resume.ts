"use server";

import supabaseAdmin from "@/config/supabase-admin";
import { RESUMES_TABLE } from "@/constants";
import { fromRow } from "@/lib";

import { ResumeMetadata } from "../types";

/**
 * Get the resume metadata from the database.
 * Throws an error if the database query fails.
 *
 * @returns Promise resolving to the resume metadata row
 * @returns null if the resume row is not found
 * @example
 * ```ts
 * const resumeMetadata = await getResumeMetadata("user123");
 * console.log(resumeMetadata.file_name, resumeMetadata.storage_path);
 * ```
 */
const getResumeMetadata = async (userId: string): Promise<Omit<ResumeMetadata, "id"> | null> => {
  const { data, error } = await supabaseAdmin
    .from(RESUMES_TABLE)
    .select("file_name, storage_path, created_at, updated_at")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;
  if (!data) {
    return null;
  }

  return fromRow<Omit<ResumeMetadata, "id">>(data);
};

export { getResumeMetadata };
