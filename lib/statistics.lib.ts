import "server-only";
import { cache } from "react";

import supabaseAdmin from "@/config/supabase-admin";
import { PARTICIPANT, JUDGE, JUDGE_AND_MENTOR, ADMIN } from "@/constants";
import { PROJECTS_TABLE, USERS_TABLE } from "@/constants/db.constants";
import type { WildHacksStatistics } from "@/types";

import { ROUND_1 } from "../app/dashboard/judging/constants";

/**
 * Calculate statistics by counting rows in the database.
 * Uses the admin client and caches results for the current request.
 *
 * @returns Promise resolving to WildHacksStatistics object
 * @example
 * ```ts
 * const stats = await calculateStatistics();
 * console.log(stats.participants, stats.projects);
 * ```
 */
export const calculateStatistics = cache(async (): Promise<WildHacksStatistics> => {
  const countUsers = async (role: string) => {
    const { count } = await supabaseAdmin
      .from(USERS_TABLE)
      .select("id", { count: "exact", head: true })
      .eq("role", role)
      .throwOnError();
    return count ?? 0;
  };

  const countProjects = async () => {
    const { count } = await supabaseAdmin
      .from(PROJECTS_TABLE)
      .select("id", { count: "exact", head: true })
      .eq("judging_round", ROUND_1)
      .throwOnError();
    return count ?? 0;
  };

  const [participants, judges, mentors, admins, projects] = await Promise.all([
    countUsers(PARTICIPANT),
    countUsers(JUDGE),
    countUsers(JUDGE_AND_MENTOR),
    countUsers(ADMIN),
    countProjects(),
  ]);

  // Projects do not record a submission time yet, so submissions stays 0 (same as before the migration).
  const submissions = 0;

  return {
    participants,
    judges,
    mentors,
    admins,
    projects,
    submissions,
  };
});
