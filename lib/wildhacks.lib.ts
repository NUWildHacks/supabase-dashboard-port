"use server";

import supabaseAdmin from "@/config/supabase-admin";
import { WILDHACKS_CONFIG_TABLE, WILDHACKS_SECRETS_TABLE } from "@/constants";
import type { WildHacksConfig, WildHacksSecrets } from "@/types";

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
  const { data, error } = await supabaseAdmin.from(WILDHACKS_CONFIG_TABLE).select().eq("id", "config").maybeSingle();

  if (error) throw error;
  if (!data) {
    throw new Error("WildHacks configuration not found");
  }

  const config = fromRow<WildHacksConfig & { id?: string }>(data);
  delete config.id;
  return config;
};

/**
 * Get the WildHacks secrets (admin-only values such as the crowd favorite password).
 * Throws an error if the secrets row does not exist.
 *
 * @returns Promise resolving to the WildHacks secrets
 * @throws {Error} If the secrets row is not found
 */
const getSecrets = async (): Promise<WildHacksSecrets> => {
  const { data, error } = await supabaseAdmin.from(WILDHACKS_SECRETS_TABLE).select().eq("id", "secrets").maybeSingle();

  if (error) throw error;
  if (!data) {
    throw new Error("WildHacks secrets not found");
  }

  const secrets = fromRow<WildHacksSecrets & { id?: string }>(data);
  delete secrets.id;
  return secrets;
};

export { getConfig, getSecrets };
