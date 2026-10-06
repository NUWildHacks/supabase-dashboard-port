"use server";

import { z } from "zod";

import supabaseAdmin from "@/config/supabase-admin";
import { ADMIN, DASHBOARD_SCHEDULE_PATH, EVENTS_TABLE, FIFTEEN_MINUTES, LOGIN_PATH } from "@/constants";
import { getAuthenticatedUser, getConfig, requireRole } from "@/lib/server";
import type { ActionResult, WildHacksConfig } from "@/types";

import { eventFormDialogBaseSchema, type EventFormDialogSchema } from "../_schemas/event-form-dialog.schemas";
import { Event } from "../types";

export type SaveEventData = Omit<EventFormDialogSchema, "day" | "start_time" | "end_time"> & {
  start_time: number;
  end_time: number;
};

export type SaveEventResult = ActionResult<SaveEventData>;

const saveEventSchema = eventFormDialogBaseSchema
  .pick({ category: true, title: true, body: true, location: true })
  .extend({ start_time: z.number().int(), end_time: z.number().int() });

export const saveEvent = async (
  data: SaveEventData,
  _wildHacksStartTime: WildHacksConfig["start_time"],
  _wildHacksEndTime: WildHacksConfig["end_time"],
  eventId?: Event["id"]
): Promise<SaveEventResult> => {
  const now = Date.now();

  try {
    const redirectPath = `${LOGIN_PATH}?redirect=${encodeURIComponent(DASHBOARD_SCHEDULE_PATH)}`;
    const user = await getAuthenticatedUser(redirectPath);

    const roleError = requireRole(user, ADMIN, "You are not authorized to save events");
    if (roleError) return roleError;

    const parsed = saveEventSchema.safeParse(data);
    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      const firstField = firstIssue?.path[0];
      return {
        success: false,
        error: firstIssue?.message ?? "Invalid event data",
        field: typeof firstField === "string" ? (firstField as keyof SaveEventData) : undefined,
      };
    }

    // Read the event window from the database instead of trusting the values sent by the browser.
    const { start_time: wildHacksStartTime, end_time: wildHacksEndTime } = await getConfig();

    const { start_time: startTimeMs, end_time: endTimeMs } = parsed.data;

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

    // The form data also carries the `day` label, which is not an events column.
    const { category, title, body, location } = parsed.data;
    const eventColumns = { category, title, body, location, start_time: startTimeMs, end_time: endTimeMs };

    if (eventId) {
      const { data: updatedRows } = await supabaseAdmin
        .from(EVENTS_TABLE)
        .update({
          ...eventColumns,
          updated_at: now,
        })
        .eq("id", eventId)
        .select("id")
        .throwOnError();
      if (updatedRows.length === 0) {
        return { success: false, error: "This event no longer exists. Refresh the page and try again." };
      }
    } else {
      await supabaseAdmin
        .from(EVENTS_TABLE)
        .insert({
          ...eventColumns,
          created_at: now,
          updated_at: now,
        })
        .throwOnError();
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
