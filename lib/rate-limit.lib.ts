import "server-only";

import supabaseAdmin from "@/config/supabase-admin";

/**
 * Record one call for `key` and report whether the caller is still within `limit` calls per
 * `windowMs`. Use it on actions that could be used to guess passwords or look up emails.
 */
export const isWithinRateLimit = async (key: string, limit: number, windowMs: number): Promise<boolean> => {
  const { data } = await supabaseAdmin
    .rpc("check_rate_limit", { p_key: key, p_limit: limit, p_window_ms: windowMs })
    .throwOnError();
  return data === true;
};

export const RATE_LIMIT_TOO_MANY_ATTEMPTS = "Too many attempts. Please wait a few minutes and try again.";
