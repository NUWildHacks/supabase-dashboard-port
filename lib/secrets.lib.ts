import "server-only";

import supabaseAdmin from "@/config/supabase-admin";
import { WILDHACKS_SECRETS_TABLE } from "@/constants";
import type { WildHacksSecrets } from "@/types";

import { fromRow } from "./db.lib";

// Not exported from `@/lib`: that index is also imported by client components, which would turn
// a "use server" export into a callable server action. Import this module directly instead.

/**
 * Get the WildHacks secrets (admin-only values such as the crowd favorite password).
 * Throws an error if the secrets row does not exist.
 *
 * @returns Promise resolving to the WildHacks secrets
 * @throws {Error} If the secrets row is not found
 */
const getSecrets = async (): Promise<WildHacksSecrets> => {
  const { data } = await supabaseAdmin
    .from(WILDHACKS_SECRETS_TABLE)
    .select()
    .eq("id", "secrets")
    .maybeSingle()
    .throwOnError();

  if (!data) {
    throw new Error("WildHacks secrets not found");
  }

  const secrets = fromRow<WildHacksSecrets & { id?: string }>(data);
  delete secrets.id;
  return secrets;
};

export { getSecrets };
