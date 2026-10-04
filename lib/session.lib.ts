"use server";

import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/config/supabase-server";
import { ROOT_PATH } from "@/constants";
import type { User } from "@/types";

/**
 * Verify the current Supabase session and return the user ID and email.
 * Validates the session with the Supabase Auth server.
 * Returns null if the session is invalid or missing.
 *
 * @returns Promise resolving to the user ID and email if session is valid, null otherwise
 * @example
 * ```ts
 * const userInfo = await verifySession();
 * if (!userInfo) {
 *   redirect('/login');
 * }
 * // User is authenticated, proceed with userInfo.id
 * ```
 */
export async function verifySession() {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error) throw error;
    if (!user) throw new Error("Could not find session");

    return { id: user.id, email: user.email ?? "" } as Pick<User, "id" | "email">;
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : "An unknown error occurred";
    console.error(errorMessage);

    return null;
  }
}

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
