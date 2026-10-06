import "server-only";

import supabaseAdmin from "@/config/supabase-admin";
import { CROWD_FAVORITES_TABLE, CROWD_FAVORITE_VOTES_TABLE, PARTICIPANT, USERS_TABLE } from "@/constants";
import { fromRow, fromRows, selectAllRows } from "@/lib";
import type { CrowdFavoriteProject, ParticipantUser } from "@/types";

type CrowdFavoriteProjectWithVotes = CrowdFavoriteProject & {
  vote_count: number;
};

const getCrowdFavoriteProject = async (projectId: string): Promise<CrowdFavoriteProject | null> => {
  const { data } = await supabaseAdmin
    .from(CROWD_FAVORITES_TABLE)
    .select()
    .eq("id", projectId)
    .maybeSingle()
    .throwOnError();
  if (!data) return null;

  return fromRow<CrowdFavoriteProject>(data);
};

const getCrowdFavoriteProjectForUser = async (userId: string): Promise<CrowdFavoriteProject | null> => {
  const { data } = await supabaseAdmin
    .from(CROWD_FAVORITES_TABLE)
    .select()
    .contains("team_member_ids", [userId])
    .order("created_at")
    .order("id")
    .limit(1)
    .maybeSingle()
    .throwOnError();
  if (!data) return null;

  return fromRow<CrowdFavoriteProject>(data);
};

const getAllParticipantUsers = async (): Promise<ParticipantUser[]> => {
  const data = await selectAllRows((from, to) =>
    supabaseAdmin.from(USERS_TABLE).select().eq("role", PARTICIPANT).order("id").range(from, to).throwOnError()
  );

  return fromRows<ParticipantUser>(data).filter((user) => user.first_name);
};

const getAllCrowdFavoriteProjects = async (): Promise<CrowdFavoriteProject[]> => {
  const data = await selectAllRows((from, to) =>
    supabaseAdmin.from(CROWD_FAVORITES_TABLE).select().order("id").range(from, to).throwOnError()
  );

  return fromRows<CrowdFavoriteProject>(data);
};

const getCrowdFavoriteProjectsWithVoteCount = async (
  includeVotes: boolean
): Promise<CrowdFavoriteProjectWithVotes[]> => {
  const projects = await getAllCrowdFavoriteProjects();
  if (!includeVotes) {
    return projects
      .map((project) => ({
        ...project,
        vote_count: 0,
      }))
      .sort((a, b) => a.created_at - b.created_at);
  }

  // Votes are kept when a user is deleted, but only votes from current users count.
  const { data: voteCountRows } = await supabaseAdmin.rpc("crowd_favorite_vote_counts").throwOnError();
  const voteCounts = new Map(
    ((voteCountRows ?? []) as { crowd_favorite_id: string; vote_count: number }[]).map((row) => [
      row.crowd_favorite_id,
      Number(row.vote_count),
    ])
  );

  const projectVoteCounts = projects.map((project) => ({
    ...project,
    vote_count: voteCounts.get(project.id) ?? 0,
  }));

  return projectVoteCounts.sort((a, b) => {
    if (b.vote_count !== a.vote_count) {
      return b.vote_count - a.vote_count;
    }

    return a.created_at - b.created_at;
  });
};

const getUserVotedProjectId = async (userId: string): Promise<string | null> => {
  try {
    const { data } = await supabaseAdmin
      .from(CROWD_FAVORITE_VOTES_TABLE)
      .select("crowd_favorite_id")
      .eq("user_id", userId)
      .maybeSingle()
      .throwOnError();

    return data?.crowd_favorite_id ?? null;
  } catch {
    return null;
  }
};

export {
  getAllCrowdFavoriteProjects,
  getAllParticipantUsers,
  getCrowdFavoriteProject,
  getCrowdFavoriteProjectForUser,
  getCrowdFavoriteProjectsWithVoteCount,
  getUserVotedProjectId,
};
export type { CrowdFavoriteProjectWithVotes };
