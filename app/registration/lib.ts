import { redirect } from "next/navigation";

import supabaseAdmin from "@/config/supabase-admin";
import {
  DASHBOARD_PATH,
  JUDGE,
  JUDGE_AND_MENTOR,
  PARTICIPANT,
  USER_FIELDS,
  USERS_TABLE,
  CLOSED_REGISTRATION,
} from "@/constants";
import { deleteSession, fromRow } from "@/lib";
import { isAuthUserId } from "@/lib/auth-user.lib";
import { JudgeUser, JudgeAndMentorUser, User } from "@/types";

const getCurrentTimestamp = () => Date.now();

/**
 * Registers a judge or mentor user by migrating their data from an email-based row
 * to a user ID-based row.
 *
 * This function performs the following operations:
 * 1. Checks if a user row with the given userId already exists (redirects if found)
 * 2. Searches for an existing user row by email
 * 3. If found and the user has JUDGE or JUDGE_AND_MENTOR role, migrates the data:
 *    - Changes the row ID from the email-based ID to the userId and moves the judge's judging
 *      assignments to the new ID, in one transaction (`claim_judge_row`)
 *    - Keeps all other user data
 *    - Skips rows that already belong to another sign-in account
 *    - Sets new timestamps for created_at and updated_at
 * 4. Redirects to the dashboard after successful migration
 *
 * @param {User["id"]} userId - The unique identifier for the user row
 * @param {User["email"]} userEmail - The email address to search for existing user data
 * @throws {RedirectError} Redirects to DASHBOARD_PATH if user already exists or after successful migration
 * @async
 */
const registerJudgeMentorWithEmail = async (userId: User["id"], userEmail: User["email"]) => {
  const { data: userRowById } = await supabaseAdmin
    .from(USERS_TABLE)
    .select()
    .eq("id", userId)
    .maybeSingle()
    .throwOnError();
  if (userRowById) {
    const userData = fromRow<User>(userRowById);
    const isIncompleteParticipant =
      userData.role === PARTICIPANT &&
      userData.created_at > CLOSED_REGISTRATION &&
      !userData.first_name &&
      !userData.last_name;
    if (!isIncompleteParticipant) redirect(DASHBOARD_PATH);
    // Incomplete participant: skip email migration entirely and let them fill the form.
    // Running the email query here could accidentally migrate them to judge/mentor status.
    return;
  }

  const { data: userRowsByEmail } = await supabaseAdmin
    .from(USERS_TABLE)
    .select()
    .eq(USER_FIELDS.email, userEmail)
    .limit(1)
    .throwOnError();
  if (userRowsByEmail && userRowsByEmail.length > 0) {
    const { id: oldId, ...data } = fromRow<JudgeUser | JudgeAndMentorUser>(userRowsByEmail[0]);

    // A row that already belongs to another sign-in account is not a pre-created row.
    if ((data?.role === JUDGE || data?.role === JUDGE_AND_MENTOR) && !(await isAuthUserId(oldId))) {
      const { data: claimed } = await supabaseAdmin
        .rpc("claim_judge_row", { p_old_id: oldId, p_new_id: userId, p_now: getCurrentTimestamp() })
        .throwOnError();

      if (claimed) redirect(DASHBOARD_PATH);
    }
  } else {
    await deleteSession();
  }
};

export { registerJudgeMentorWithEmail };
