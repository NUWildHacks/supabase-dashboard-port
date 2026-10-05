"use server";

import supabaseAdmin from "@/config/supabase-admin";
import { EVENTS_TABLE, DASHBOARD_SCHEDULE_PATH, ADMIN, LOGIN_PATH } from "@/constants";
import { chunkList } from "@/lib";
import { getAuthenticatedUser, requireRole } from "@/lib/server";
import type { ActionResult } from "@/types";

import type { Event } from "../types";

export type DeleteEventResult = ActionResult;

export const deleteEvents = async (eventIds: Event["id"][]): Promise<DeleteEventResult> => {
  try {
    const redirectPath = `${LOGIN_PATH}?redirect=${encodeURIComponent(DASHBOARD_SCHEDULE_PATH)}`;
    const user = await getAuthenticatedUser(redirectPath);

    const roleError = requireRole(user, ADMIN, "You are not authorized to delete events");
    if (roleError) return roleError;

    for (const ids of chunkList(eventIds)) {
      await supabaseAdmin.from(EVENTS_TABLE).delete().in("id", ids).throwOnError();
    }

    return { success: true };
  } catch (error) {
    const detailedError = error instanceof Error ? error.message : "An unknown error occurred";
    console.error("Delete event error:", detailedError);

    const isProduction = process.env.APP_ENV === "production";
    const errorMessage = isProduction ? "An unknown error occurred. Please try again." : detailedError;

    return { success: false, error: errorMessage };
  }
};
