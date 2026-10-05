import "server-only";

import supabaseAdmin from "@/config/supabase-admin";
import { JUDGING_ASSIGNMENTS_TABLE, PROJECTS_TABLE, USERS_TABLE } from "@/constants";
import { fromRows, selectAllRows } from "@/lib";
import type { User } from "@/types";

import { ROUND_1, ROUND_2 } from "../../judging/constants";
import { JudgingAssignment, JudgingRound, Project } from "../../judging/types";

/**
 * Get all users from the database.
 * Retrieves all rows from the users table and returns them as an array.
 * Returns an empty array if no users exist.
 *
 * @returns Promise resolving to an array of User objects
 * @example
 * ```ts
 * const users = await getUsers();
 * console.log(`Found ${users.length} users`);
 * users.forEach(user => {
 *   console.log(user.email, user.role);
 * });
 * ```
 */
const getUsers = async (): Promise<User[]> => {
  const userRows = await selectAllRows((from, to) =>
    supabaseAdmin.from(USERS_TABLE).select().order("id").range(from, to).throwOnError()
  );

  // ensure that incomplete rows (e.g. new participants)
  // are not included so it doesn't break
  return fromRows<User>(userRows).filter((user) => user.first_name);
};

/**
 * Get all judging assignments from the database.
 * Retrieves all rows from the judging assignments table and returns them grouped by round.
 * Returns empty arrays if no judging assignments exist.
 *
 * @returns Promise resolving to a map of JudgingRound to JudgingAssignment objects
 */
const getJudgingAssignmentsMap = async (): Promise<Map<JudgingRound, JudgingAssignment[]>> => {
  // Rows keep `null` for room_id and judging_form, matching the JudgingAssignment type.
  const judgingAssignmentRows = (await selectAllRows((from, to) =>
    supabaseAdmin.from(JUDGING_ASSIGNMENTS_TABLE).select().order("id").range(from, to).throwOnError()
  )) as JudgingAssignment[];

  const judgingAssignments = new Map<JudgingRound, JudgingAssignment[]>();
  judgingAssignments.set(
    ROUND_1,
    judgingAssignmentRows.filter((judgingAssignment) => judgingAssignment.judging_round === ROUND_1)
  );
  judgingAssignments.set(
    ROUND_2,
    judgingAssignmentRows.filter((judgingAssignment) => judgingAssignment.judging_round === ROUND_2)
  );

  return judgingAssignments;
};

/**
 * Get all projects from the database.
 * Retrieves all rows from the projects table and returns them grouped by round.
 * Returns empty arrays if no projects exist.
 *
 * @returns Promise resolving to a map of JudgingRound to Project objects
 * @example
 * ```ts
 * const projects = await getProjectsMap();
 * projects.get(ROUND_1)?.forEach(project => {
 *   console.log(project.id, project.name, project.track);
 * });
 * ```
 */
const getProjectsMap = async (): Promise<Map<JudgingRound, Project[]>> => {
  const projectRows = await selectAllRows((from, to) =>
    supabaseAdmin
      .from(PROJECTS_TABLE)
      .select("judging_round, id, name, track, devpost_url")
      .order("judging_round")
      .order("id")
      .range(from, to)
      .throwOnError()
  );

  const toProjects = (round: JudgingRound): Project[] =>
    projectRows
      .filter((project) => project.judging_round === round)
      .map(({ id, name, track, devpost_url }) => ({ id, name, track, devpost_url }) as Project);

  const projects = new Map<JudgingRound, Project[]>();
  projects.set(ROUND_1, toProjects(ROUND_1));
  projects.set(ROUND_2, toProjects(ROUND_2));

  return projects;
};

export { getUsers, getJudgingAssignmentsMap, getProjectsMap };
