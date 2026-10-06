import "server-only";

import supabaseAdmin from "@/config/supabase-admin";
import { WILDHACKS_CONFIG_TABLE } from "@/constants";
import type { WildHacksConfig } from "@/types";

import { fromRow } from "./db.lib";

/**
 * Get the WildHacks configuration.
 * Throws an error if the configuration row does not exist.
 *
 * @returns Promise resolving to the WildHacks configuration
 * @throws {Error} If the configuration row is not found
 * @example
 * ```ts
 * const config = await getConfig();
 * console.log(config.start_time, config.end_time);
 * ```
 */
const getConfig = async (): Promise<WildHacksConfig> => {
  const { data } = await supabaseAdmin
    .from(WILDHACKS_CONFIG_TABLE)
    .select()
    .eq("id", "config")
    .maybeSingle()
    .throwOnError();

  if (!data) {
    throw new Error("WildHacks configuration not found");
  }

  const config = fromRow<WildHacksConfig & { id?: string }>(data);
  delete config.id;
  return config;
};

export { getConfig };
