import "server-only";

import supabaseAdmin from "@/config/supabase-admin";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Whether an id can belong to a Supabase Auth user. Rows that admins pre-create before the
 * person's first login use other ids.
 */
export const isAuthUserIdFormat = (id: string) => UUID_REGEX.test(id);

/**
 * Whether a users row belongs to a real sign-in account. Rows that admins pre-create before the
 * person's first login use other ids and have no auth user.
 */
export const isAuthUserId = async (id: string) => {
  if (!isAuthUserIdFormat(id)) return false;

  const { data, error } = await supabaseAdmin.auth.admin.getUserById(id);
  if (error) {
    if (error.status === 404 || error.code === "user_not_found") return false;
    throw error;
  }
  return !!data.user;
};
