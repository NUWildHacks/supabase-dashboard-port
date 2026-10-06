import "server-only";
import { redirect } from "next/navigation";

import supabaseAdmin from "@/config/supabase-admin";
import {
  USERS_TABLE,
  LOGIN_PATH,
  PARTICIPANT,
  ADMIN,
  JUDGE,
  REGISTRATION_PATH,
  CLOSED_REGISTRATION,
  JUDGE_AND_MENTOR,
} from "@/constants";
import type { ActionResult, JudgeUser, JudgeAndMentorUser, User } from "@/types";

import { fromRow } from "./db.lib";
import { verifySession } from "./session.lib";

/**
 * Get the authenticated user data.
 * Verifies the session and retrieves the user row from the database.
 * Redirects to login if session is invalid, or to registration if user document doesn't exist.
 *
 * @param redirectPath - Optional path to redirect to if session is invalid (defaults to LOGIN_PATH)
 * @returns Promise resolving to the authenticated user object
 * @throws {Redirect} Always redirects if session is invalid or user document doesn't exist
 * @example
 * ```ts
 * const user = await getAuthenticatedUser();
 * console.log(user.email, user.role);
 * // User is guaranteed to be authenticated and exist in database
 * ```
 */
const getAuthenticatedUser = async (redirectPath?: string): Promise<User> => {
  const userInfo = await verifySession();
  if (!userInfo) {
    const path = redirectPath || LOGIN_PATH;
    redirect(path);
  }

  const { id } = userInfo;

  const { data: userRow } = await supabaseAdmin.from(USERS_TABLE).select().eq("id", id).maybeSingle().throwOnError();
  if (!userRow) redirect(REGISTRATION_PATH);

  // check if this is a Kris-special permission participant
  // We would've filled out a document for them with their email,
  // "Participant" role, and created_at timestamp
  // but they'll still have to fill out the registration form
  // so we can capture their MLH agreements

  // checks if the document was created AFTER we closed
  // permission code registration (Mar 10)
  const userData = fromRow<Omit<User, "id">>(userRow);

  if (
    userData.role === PARTICIPANT &&
    userData.created_at > CLOSED_REGISTRATION &&
    !userData.first_name &&
    !userData.last_name
  ) {
    redirect(REGISTRATION_PATH);
  }

  return { ...userData, id } as User;
};

/**
 * Require a specific role for an action.
 * Validates that the user has the required role and returns an error result if they don't.
 *
 * @param user - The user data to check
 * @param requiredRole - The required role (PARTICIPANT, ADMIN, or JUDGE)
 * @param errorMessage - Optional custom error message (uses default message if not provided)
 * @returns ActionResult with success: false and error message if role doesn't match, null if authorized
 * @example
 * ```ts
 * const user = await getAuthenticatedUser();
 * const roleCheck = requireRole(user, ADMIN);
 * if (roleCheck) {
 *   return roleCheck; // User is not an admin
 * }
 * // User has required role, proceed with action
 * ```
 */
const requireRole = (
  user: User,
  requiredRole: User["role"] | User["role"][],
  errorMessage?: string
): ActionResult | null => {
  if (Array.isArray(requiredRole)) {
    if (requiredRole.includes(user.role)) {
      return null;
    }
    return {
      success: false,
      error: errorMessage || "You must be a " + requiredRole.join(" or ") + " to perform this action",
    };
  }

  if (user.role !== requiredRole) {
    const defaultMessages: Record<User["role"], string> = {
      [PARTICIPANT]: "You must be a participant to perform this action",
      [ADMIN]: "You must be an administrator to perform this action",
      [JUDGE]: "You must be a judge to perform this action",
      [JUDGE_AND_MENTOR]: "You must be a judge and mentor to perform this action",
    };

    return {
      success: false,
      error: errorMessage || defaultMessages[requiredRole],
    };
  }

  return null;
};

/**
 * Onboard a judge or mentor user by marking them as onboarded.
 * Retrieves the user document and checks if they are already onboarded.
 * If not onboarded, updates the user document to set onboarded to true and updates the updated_at timestamp.
 *
 * @param id - The unique identifier of the user to onboard
 * @returns Promise resolving to a boolean:
 *   - `false` if the user was just onboarded (wasn't onboarded before)
 *   - `true` if the user was already onboarded
 * @example
 * ```ts
 * const wasAlreadyOnboarded = await onboardUser(userId);
 * if (!wasAlreadyOnboarded) {
 *   console.log("User was just onboarded");
 * } else {
 *   console.log("User was already onboarded");
 * }
 * ```
 */
const onboardUser = async (id: User["id"]): Promise<boolean> => {
  const now = Date.now();

  // Only let callers onboard themselves.
  const session = await verifySession();
  if (!session || session.id !== id) return true;

  const { data: judgeRow } = await supabaseAdmin
    .from(USERS_TABLE)
    .select("onboarded")
    .eq("id", id)
    .maybeSingle()
    .throwOnError();
  if (!judgeRow) return true;
  const { onboarded } = judgeRow as Pick<JudgeUser | JudgeAndMentorUser, "onboarded">;

  if (!onboarded) {
    await supabaseAdmin
      .from(USERS_TABLE)
      .update({
        onboarded: true,
        updated_at: now,
      } as Partial<JudgeUser | JudgeAndMentorUser>)
      .eq("id", id)
      .throwOnError();

    return false;
  }

  return true;
};

export { getAuthenticatedUser, requireRole, onboardUser };
