"use server";

import { revalidatePath } from "next/cache";

import supabaseAdmin from "@/config/supabase-admin";
import {
  CROWD_FAVORITES_TABLE,
  DASHBOARD_CROWD_FAVORITE_PATH,
  DASHBOARD_PATH,
  LOGIN_PATH,
  PARTICIPANT,
  USERS_TABLE,
} from "@/constants";
import { getAuthenticatedUser, requireRole, getConfig } from "@/lib";
import type { ActionResult, CrowdFavoriteProject } from "@/types";

import { getCrowdFavoriteProjectForUser } from "../_lib";
import { crowdFavoriteOptInFormSchema, type CrowdFavoriteOptInFormSchema } from "../_schemas";
import { isCrowdFavoriteOptInOpen } from "../constants";

type CrowdFavoriteOptInResult = ActionResult<CrowdFavoriteOptInFormSchema>;

type CandidateMember = {
  id: string;
  first_name: string;
  email: string;
};

const optInToCrowdFavorite = async (rawData: CrowdFavoriteOptInFormSchema): Promise<CrowdFavoriteOptInResult> => {
  try {
    const redirectPath = `${LOGIN_PATH}?redirect=${encodeURIComponent(DASHBOARD_CROWD_FAVORITE_PATH)}`;
    const caller = await getAuthenticatedUser(redirectPath);

    const roleCheck = requireRole(caller, PARTICIPANT);
    if (roleCheck) return roleCheck;

    // Fetch config once to pass to all helpers
    const config = await getConfig();

    if (!(await isCrowdFavoriteOptInOpen(config))) {
      return { success: false, error: "Crowd favorite opt-in is currently closed" };
    }

    const parsed = crowdFavoriteOptInFormSchema.safeParse(rawData);
    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      const firstField = firstIssue.path[0];

      return {
        success: false,
        error: firstIssue.message,
        field: typeof firstField === "string" ? (firstField as keyof CrowdFavoriteOptInFormSchema) : undefined,
      };
    }

    const data = parsed.data;
    const now = Date.now();

    const normalizedEmails = data.team_members.map((member) => member.email.trim().toLowerCase());

    if (normalizedEmails.includes(caller.email.toLowerCase())) {
      return {
        success: false,
        error: "Do not include your own email in team members",
        field: "team_members",
      };
    }

    const candidateResults = await Promise.all(
      normalizedEmails.map((email) =>
        supabaseAdmin.from(USERS_TABLE).select("id, role, first_name").eq("email", email).limit(1).maybeSingle()
      )
    );

    const candidateMembers: CandidateMember[] = [];
    for (let index = 0; index < candidateResults.length; index += 1) {
      const { data: user, error: userError } = candidateResults[index];
      if (userError) throw userError;
      const email = normalizedEmails[index];

      if (!user) {
        return { success: false, error: `No participant found for ${email}`, field: "team_members" };
      }

      if (user.role !== PARTICIPANT) {
        return {
          success: false,
          error: `${email} is not a participant`,
          field: "team_members",
        };
      }

      if (await getCrowdFavoriteProjectForUser(user.id)) {
        return {
          success: false,
          error: `${email} is already assigned to a crowd favorite project`,
          field: "team_members",
        };
      }

      if (!user.first_name) {
        return {
          success: false,
          error: `${email} has an incomplete participant profile`,
          field: "team_members",
        };
      }

      candidateMembers.push({
        id: user.id,
        first_name: user.first_name,
        email,
      });
    }

    if (await getCrowdFavoriteProjectForUser(caller.id)) {
      return { success: false, error: "You are already assigned to a crowd favorite project" };
    }

    // Re-check the caller and teammates right before the write.
    const { data: callerRow, error: callerError } = await supabaseAdmin
      .from(USERS_TABLE)
      .select("role")
      .eq("id", caller.id)
      .maybeSingle();
    if (callerError) throw callerError;
    if (!callerRow) {
      throw new Error("Authenticated user no longer exists");
    }

    if (callerRow.role !== PARTICIPANT) {
      throw new Error("Only participants can opt in to crowd favorite");
    }

    const { data: teammateRows, error: teammatesError } = await supabaseAdmin
      .from(USERS_TABLE)
      .select("id, role")
      .in(
        "id",
        candidateMembers.map((member) => member.id)
      );
    if (teammatesError) throw teammatesError;

    candidateMembers.forEach((member) => {
      const teammate = teammateRows.find((row) => row.id === member.id);

      if (!teammate) {
        throw new Error(`Participant ${member.email} no longer exists`);
      }

      if (teammate.role !== PARTICIPANT) {
        throw new Error(`${member.email} is not a participant`);
      }
    });

    const teamMembers: CrowdFavoriteProject["team_members"] = [
      {
        id: caller.id,
        first_name: caller.first_name,
        email: caller.email.toLowerCase(),
      },
      ...candidateMembers.map((member) => ({
        id: member.id,
        first_name: member.first_name,
        email: member.email,
      })),
    ];

    const { error: insertError } = await supabaseAdmin.from(CROWD_FAVORITES_TABLE).insert({
      project_name: data.project_name,
      devpost_url: data.devpost_url,
      team_members: teamMembers,
      team_member_ids: teamMembers.map((m) => m.id),
      created_at: now,
      updated_at: now,
    } as Omit<CrowdFavoriteProject, "id">);
    if (insertError) throw insertError;

    revalidatePath(DASHBOARD_CROWD_FAVORITE_PATH);
    revalidatePath(DASHBOARD_PATH);

    return { success: true };
  } catch (error) {
    const detailedError = error instanceof Error ? error.message : "An unknown error occurred";
    console.error("Crowd favorite opt-in error:", detailedError);

    const isProduction = process.env.APP_ENV === "production";
    const errorMessage = isProduction ? "An unknown error occurred. Please try again." : detailedError;

    return { success: false, error: errorMessage };
  }
};

export { optInToCrowdFavorite };
export type { CrowdFavoriteOptInResult };
