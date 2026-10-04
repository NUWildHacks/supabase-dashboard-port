"use server";

import supabaseAdmin from "@/config/supabase-admin";
import { CROWD_FAVORITES_TABLE, CROWD_FAVORITE_VOTES_TABLE, PARTICIPANT, USERS_TABLE } from "@/constants";
import { fromRow, fromRows } from "@/lib";
import type { CrowdFavoriteProject, ParticipantUser } from "@/types";

type CrowdFavoriteProjectWithVotes = CrowdFavoriteProject & {
  vote_count: number;
};

const getCrowdFavoriteProject = async (projectId: string): Promise<CrowdFavoriteProject | null> => {
  const { data, error } = await supabaseAdmin.from(CROWD_FAVORITES_TABLE).select().eq("id", projectId).maybeSingle();
  if (error) throw error;
  if (!data) return null;

  return fromRow<CrowdFavoriteProject>(data);
};

const getCrowdFavoriteProjectForUser = async (userId: string): Promise<CrowdFavoriteProject | null> => {
  const { data, error } = await supabaseAdmin
    .from(CROWD_FAVORITES_TABLE)
    .select()
    .contains("team_member_ids", [userId])
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  return fromRow<CrowdFavoriteProject>(data);
};

const getAllParticipantUsers = async (): Promise<ParticipantUser[]> => {
  const { data, error } = await supabaseAdmin.from(USERS_TABLE).select().eq("role", PARTICIPANT);
  if (error) throw error;

  return fromRows<ParticipantUser>(data).filter((user) => user.first_name);
};

const getAllCrowdFavoriteProjects = async (): Promise<CrowdFavoriteProject[]> => {
  const { data, error } = await supabaseAdmin.from(CROWD_FAVORITES_TABLE).select();
  if (error) throw error;

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

  const projectVoteCounts = await Promise.all(
    projects.map(async (project) => {
      const { count, error } = await supabaseAdmin
        .from(CROWD_FAVORITE_VOTES_TABLE)
        .select("*", { count: "exact", head: true })
        .eq("crowd_favorite_id", project.id);
      if (error) throw error;

      return {
        ...project,
        vote_count: count ?? 0,
      };
    })
  );

  return projectVoteCounts.sort((a, b) => {
    if (b.vote_count !== a.vote_count) {
      return b.vote_count - a.vote_count;
    }

    return a.created_at - b.created_at;
  });
};

const getUserVotedProjectId = async (userId: string): Promise<string | null> => {
  try {
    const { data, error } = await supabaseAdmin
      .from(CROWD_FAVORITE_VOTES_TABLE)
      .select("crowd_favorite_id")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw error;

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
