"use server";

import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/config/supabase-server";
import { ROOT_PATH } from "@/constants";

/**
 * Delete the current session.
 * Signs the user out, which clears the session cookies and revokes the refresh token.
 * Always redirects to the root path after execution.
 *
 * @returns Promise that resolves after session deletion (always redirects)
 * @example
 * ```ts
 * // In a logout handler
 * await deleteSession();
 * // User is logged out and redirected to home page
 * ```
 */
export async function deleteSession() {
  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : "An unknown error occurred";
    console.error(errorMessage);
  } finally {
    redirect(ROOT_PATH);
  }
}
