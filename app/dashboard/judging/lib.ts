"use server";

import supabaseAdmin from "@/config/supabase-admin";
import { JUDGING_ASSIGNMENTS_TABLE, PROJECTS_TABLE } from "@/constants";
import { JudgeUser } from "@/types";

import { JUDGING_ASSIGNMENT_FIELDS, ROUND_1 } from "./constants";
import type { JudgingAssignment, JudgingAssignmentWithProject, JudgingRound, Project } from "./types";

/**
 * Retrieves judging assignments with their projects from the database.
 *
 * Fetches project rows based on judging assignments. When a judge ID and round are provided,
 * only returns judging assignments with their projects assigned to that judge for that round. Each judging assignment includes its associated
 * project and judging form data if available.
 *
 * @param judgeId - Judge ID to filter by.
 * @param round - The judging round to get projects for. 1 for round 1, 2 for round 2.
 * @returns Promise that resolves to an array of JudgingAssignmentWithProject objects, each
 *   containing project data and its associated judging form (if any)
 * @example
 * ```ts
 * // Get judging assignments with their projects for a specific judge
 * const round1Projects = await getJudgingAssignmentsWithProjectForRound("judge123", 1);
 * const round2Projects = await getJudgingAssignmentsWithProjectForRound("judge123", 2);
 * ```
 */
const getJudgingAssignmentsWithProjectForRound = async (
  judgeId: JudgeUser["id"],
  judgingRound: JudgingRound
): Promise<JudgingAssignmentWithProject[]> => {
  let query = supabaseAdmin
    .from(JUDGING_ASSIGNMENTS_TABLE)
    .select()
    .eq(JUDGING_ASSIGNMENT_FIELDS.judge_id, judgeId)
    .eq(JUDGING_ASSIGNMENT_FIELDS.judging_round, judgingRound);

  // Round 1 has no display order, so sort by id to keep the results stable.
  query =
    judgingRound !== ROUND_1
      ? query.order(JUDGING_ASSIGNMENT_FIELDS.order, { ascending: true })
      : query.order("id", { ascending: true });

  const { data: judgingAssignments, error: judgingAssignmentsError } = await query;
  if (judgingAssignmentsError) throw judgingAssignmentsError;

  if (!judgingAssignments || judgingAssignments.length === 0) return [];

  const projectIds = new Set<Project["id"]>();
  judgingAssignments.forEach((judgingAssignment) => {
    projectIds.add(judgingAssignment.project_id);
  });

  const { data: projects, error: projectsError } = await supabaseAdmin
    .from(PROJECTS_TABLE)
    .select("id, name, track, devpost_url")
    .eq("judging_round", judgingRound)
    .in("id", Array.from(projectIds));
  if (projectsError) throw projectsError;

  const projectMap = new Map<Project["id"], Project>();
  (projects as Project[]).forEach((project) => {
    projectMap.set(project.id, project);
  });

  const result: JudgingAssignmentWithProject[] = (judgingAssignments as JudgingAssignment[]).map(
    (judgingAssignment) => {
      const project = projectMap.get(judgingAssignment.project_id);
      return { ...judgingAssignment, project } as JudgingAssignmentWithProject;
    }
  );

  return result;
};

export { getJudgingAssignmentsWithProjectForRound };
