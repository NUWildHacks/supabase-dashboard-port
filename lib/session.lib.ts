import "server-only";

import { createSupabaseServerClient } from "@/config/supabase-server";
import type { User } from "@/types";

/**
 * Verify the current Supabase session and return the user ID and email.
 * Validates the session with the Supabase Auth server.
 * Returns null if the session is invalid or missing, or if the account's email is not confirmed
 * (the app matches pre-created rows by email, so the email must belong to the person).
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
    if (!user.email || !user.email_confirmed_at) throw new Error("Account email is not confirmed");

    return { id: user.id, email: user.email } as Pick<User, "id" | "email">;
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : "An unknown error occurred";
    console.error(errorMessage);

    return null;
  }
}
