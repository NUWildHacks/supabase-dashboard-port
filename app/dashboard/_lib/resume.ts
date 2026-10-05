import "server-only";

import supabaseAdmin from "@/config/supabase-admin";
import { RESUMES_BUCKET, RESUMES_TABLE } from "@/constants";
import { chunkList, fromRow } from "@/lib";

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
  const { data } = await supabaseAdmin
    .from(RESUMES_TABLE)
    .select("file_name, storage_path, created_at, updated_at")
    .eq("id", userId)
    .maybeSingle()
    .throwOnError();
  if (!data) {
    return null;
  }

  return fromRow<Omit<ResumeMetadata, "id">>(data);
};

// Groups of 200 keep each request small: ids go in the URL, and storage removes at most 1000
// paths per call.

/**
 * Get the storage paths of the given users' resumes.
 * Read them before deleting the users, because the resume rows are deleted with the user rows.
 */
const getResumeStoragePaths = async (userIds: string[]): Promise<string[]> => {
  const paths: string[] = [];
  for (const ids of chunkList(userIds)) {
    const { data } = await supabaseAdmin.from(RESUMES_TABLE).select("storage_path").in("id", ids).throwOnError();
    paths.push(...data.map(({ storage_path }) => storage_path as string));
  }
  return paths;
};

/**
 * Remove resume files from storage. Failures are logged, not thrown: callers run this after the
 * user rows are deleted, and stopping there would leave the auth accounts behind.
 */
const removeResumeFiles = async (storagePaths: string[]) => {
  for (const paths of chunkList(storagePaths)) {
    const { error } = await supabaseAdmin.storage.from(RESUMES_BUCKET).remove(paths);
    if (error) console.error(`Resume file remove failed — orphaned files ${paths.join(", ")}:`, error);
  }
};

export { getResumeMetadata, getResumeStoragePaths, removeResumeFiles };
