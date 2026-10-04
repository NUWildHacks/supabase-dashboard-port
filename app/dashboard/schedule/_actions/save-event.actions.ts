"use server";

import supabaseAdmin from "@/config/supabase-admin";
import { ADMIN, DASHBOARD_SCHEDULE_PATH, EVENTS_TABLE, FIFTEEN_MINUTES, LOGIN_PATH } from "@/constants";
import { getAuthenticatedUser, requireRole } from "@/lib";
import type { ActionResult, WildHacksConfig } from "@/types";

import { type EventFormDialogSchema } from "../_schemas/event-form-dialog.schemas";
import { Event } from "../types";

export type SaveEventData = Omit<EventFormDialogSchema, "day" | "start_time" | "end_time"> & {
  start_time: number;
  end_time: number;
};

export type SaveEventResult = ActionResult<SaveEventData>;

export const saveEvent = async (
  data: SaveEventData,
  wildHacksStartTime: WildHacksConfig["start_time"],
  wildHacksEndTime: WildHacksConfig["end_time"],
  eventId?: Event["id"]
): Promise<SaveEventResult> => {
  const now = Date.now();

  try {
    const redirectPath = `${LOGIN_PATH}?redirect=${encodeURIComponent(DASHBOARD_SCHEDULE_PATH)}`;
    const user = await getAuthenticatedUser(redirectPath);

    const roleError = requireRole(user, ADMIN, "You are not authorized to save events");
    if (roleError) return roleError;

    const { start_time: startTimeMs, end_time: endTimeMs } = data;

    if (!startTimeMs || !endTimeMs || startTimeMs <= 0 || endTimeMs <= 0) {
      return {
        success: false,
        error: "Invalid time values",
        field: !startTimeMs || startTimeMs <= 0 ? ("start_time" as const) : ("end_time" as const),
      };
    }

    if (startTimeMs < wildHacksStartTime) {
      return {
        success: false,
        error: "Event cannot start before WildHacks start time",
        field: "start_time" as const,
      };
    }

    if (endTimeMs > wildHacksEndTime) {
      return {
        success: false,
        error: "Event cannot end after WildHacks end time",
        field: "end_time" as const,
      };
    }

    if (endTimeMs - startTimeMs < FIFTEEN_MINUTES) {
      return {
        success: false,
        error: "Event must be at least 15 minutes long",
        field: "start_time" as const,
      };
    }

    if (eventId) {
      const { error } = await supabaseAdmin
        .from(EVENTS_TABLE)
        .update({
          ...data,
          updated_at: now,
        })
        .eq("id", eventId);
      if (error) throw error;
    } else {
      const { error } = await supabaseAdmin.from(EVENTS_TABLE).insert({
        ...data,
        created_at: now,
        updated_at: now,
      });
      if (error) throw error;
    }

    return { success: true };
  } catch (error) {
    const detailedError = error instanceof Error ? error.message : "An unknown error occurred";
    console.error("Save event error:", detailedError);

    const isProduction = process.env.APP_ENV === "production";
    const errorMessage = isProduction ? "An unknown error occurred. Please try again." : detailedError;

    return { success: false, error: errorMessage };
  }
};
