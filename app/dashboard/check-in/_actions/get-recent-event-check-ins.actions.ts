"use server";

import supabaseAdmin from "@/config/supabase-admin";
import { ADMIN, EVENT_CHECK_INS_TABLE, EVENTS_TABLE, USERS_TABLE } from "@/constants";
import { fromRows } from "@/lib";
import { getAuthenticatedUser, requireRole } from "@/lib/server";
import type { EventCheckIn, GetEventCheckInsActionResponse, User } from "@/types";

import { getCheckInRedirectPath, WILDHACKS_EVENT_ID } from "./helpers";

export type GetRecentEventCheckInsInput = {
  eventId: string;
  limitCount?: number;
};

const normalizeLimit = (limitCount?: number): number => {
  if (!limitCount || Number.isNaN(limitCount)) return 25;

  const clampedLimit = Math.max(1, Math.min(100, Math.floor(limitCount)));
  return clampedLimit;
};

export const getRecentEventCheckIns = async ({
  eventId,
  limitCount,
}: GetRecentEventCheckInsInput): Promise<GetEventCheckInsActionResponse> => {
  try {
    const user = await getAuthenticatedUser(getCheckInRedirectPath());

    const roleError = requireRole(user, ADMIN, "You are not authorized to view check-ins");
    if (roleError) return roleError;

    const normalizedEventId = eventId.trim();
    if (!normalizedEventId) {
      return { success: false, error: "Event ID is required" };
    }

    // Skip event validation for WildHacks main event
    if (normalizedEventId !== WILDHACKS_EVENT_ID) {
      const { data: event } = await supabaseAdmin
        .from(EVENTS_TABLE)
        .select("id")
        .eq("id", normalizedEventId)
        .maybeSingle()
        .throwOnError();
      if (!event) {
        return { success: false, error: "Selected event does not exist" };
      }
    }

    // Uses the index on (event_id, checked_in_at desc)
    const { data: checkInRows } = await supabaseAdmin
      .from(EVENT_CHECK_INS_TABLE)
      .select()
      .eq("event_id", normalizedEventId)
      .order("checked_in_at", { ascending: false })
      .limit(normalizeLimit(limitCount))
      .throwOnError();

    const rawCheckIns = fromRows<EventCheckIn>(checkInRows);

    const userIds = Array.from(new Set(rawCheckIns.map((checkIn) => checkIn.user_id).filter(Boolean)));
    const usersById = new Map<string, User>();

    if (userIds.length > 0) {
      const { data: userRows } = await supabaseAdmin.from(USERS_TABLE).select().in("id", userIds).throwOnError();

      fromRows<User>(userRows).forEach((user) => usersById.set(user.id, user));
    }

    const checkIns = rawCheckIns.map((checkIn) => {
      const user = usersById.get(checkIn.user_id);
      const fullName = user ? `${user.first_name} ${user.last_name}`.trim() : undefined;

      return {
        ...checkIn,
        scan_payload: {
          ...checkIn.scan_payload,
          full_name: checkIn.scan_payload.full_name ?? (fullName || undefined),
          email: checkIn.scan_payload.email ?? user?.email,
          role: checkIn.scan_payload.role ?? user?.role,
        },
      };
    });

    return {
      success: true,
      check_ins: checkIns,
    };
  } catch (error) {
    const detailedError = error instanceof Error ? error.message : "An unknown error occurred";
    console.error("Get recent event check-ins error:", detailedError);

    const isProduction = process.env.APP_ENV === "production";
    const errorMessage = isProduction ? "Unable to retrieve check-ins. Please try again." : detailedError;

    return { success: false, error: errorMessage };
  }
};
