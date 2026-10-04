"use server";

import supabaseAdmin from "@/config/supabase-admin";
import { ADMIN, EVENT_CHECK_INS_TABLE, EVENTS_TABLE, USERS_TABLE } from "@/constants";
import { fromRow, getAuthenticatedUser, requireRole } from "@/lib";
import type { CheckInActionResponse, EventCheckIn, QRCodeScanPayload, User } from "@/types";

import { getCheckInRedirectPath, isAllowedScannableRole, parseScanPayload, WILDHACKS_EVENT_ID } from "./helpers";

export type ProcessCheckInInput = {
  eventId: string;
  scanPayload: QRCodeScanPayload | string;
};

export const processCheckIn = async ({ eventId, scanPayload }: ProcessCheckInInput): Promise<CheckInActionResponse> => {
  const now = Date.now();

  try {
    const adminUser = await getAuthenticatedUser(getCheckInRedirectPath());

    const roleError = requireRole(adminUser, ADMIN, "You are not authorized to process check-ins");
    if (roleError) return roleError;

    const normalizedEventId = eventId.trim();
    if (!normalizedEventId) {
      return { success: false, error: "Event ID is required" };
    }

    let isFoodEvent = false;

    // Skip event validation for WildHacks main event
    if (normalizedEventId !== WILDHACKS_EVENT_ID) {
      const { data: event, error: eventError } = await supabaseAdmin
        .from(EVENTS_TABLE)
        .select("category")
        .eq("id", normalizedEventId)
        .maybeSingle();
      if (eventError) throw eventError;
      if (!event) {
        return { success: false, error: "Selected event does not exist" };
      }

      const eventCategory = event.category;
      isFoodEvent = typeof eventCategory === "string" && eventCategory.toLowerCase() === "food";
    }

    const parsedPayloadResult = parseScanPayload(scanPayload);
    if (!parsedPayloadResult.success) {
      return { success: false, error: parsedPayloadResult.error };
    }

    const payload = parsedPayloadResult.payload;

    const { data: userRow, error: userError } = await supabaseAdmin
      .from(USERS_TABLE)
      .select()
      .eq("id", payload.user_id)
      .maybeSingle();
    if (userError) throw userError;
    if (!userRow) {
      return { success: false, error: "Scanned user does not exist" };
    }

    const scannedUser = fromRow<User>(userRow);
    if (!isAllowedScannableRole(scannedUser.role)) {
      return {
        success: false,
        error: "Only participants, judges, and mentors can be checked in",
      };
    }

    const fullName = `${scannedUser.first_name} ${scannedUser.last_name}`.trim();

    if (normalizedEventId !== WILDHACKS_EVENT_ID) {
      const wildhacksCheckInId = `${WILDHACKS_EVENT_ID}_${payload.user_id}`;
      const { data: wildhacksCheckIn, error: wildhacksCheckInError } = await supabaseAdmin
        .from(EVENT_CHECK_INS_TABLE)
        .select("id")
        .eq("id", wildhacksCheckInId)
        .maybeSingle();
      if (wildhacksCheckInError) throw wildhacksCheckInError;

      if (!wildhacksCheckIn) {
        return {
          success: false,
          error: "This attendee must check in to WildHacks before checking in to other events.",
          requires_wildhacks_check_in: true,
        };
      }
    }

    const dietaryRestrictions = isFoodEvent ? scannedUser.dietary_restrictions : undefined;

    // Deterministic ID makes the write idempotent-safe: the insert fails atomically on the
    // primary key if another concurrent scan already wrote the record, eliminating the
    // check-then-set race condition.
    const checkInId = `${normalizedEventId}_${payload.user_id}`;
    const checkInRecord: EventCheckIn = {
      id: checkInId,
      event_id: normalizedEventId,
      user_id: payload.user_id,
      checked_in_at: now,
      checked_in_by: adminUser.id,
      scan_payload: {
        ...payload,
        full_name: fullName || undefined,
        email: payload.email ?? scannedUser.email,
        role: payload.role ?? scannedUser.role,
      },
      created_at: now,
      updated_at: now,
    };

    const { error: insertError } = await supabaseAdmin.from(EVENT_CHECK_INS_TABLE).insert(checkInRecord);
    if (insertError) {
      // Postgres error code 23505 = unique_violation — a concurrent scan won the race
      if (insertError.code === "23505") {
        const { data: existingRow, error: existingError } = await supabaseAdmin
          .from(EVENT_CHECK_INS_TABLE)
          .select()
          .eq("id", checkInId)
          .single();
        if (existingError) throw existingError;

        const existingData = fromRow<EventCheckIn>(existingRow);
        const existingCheckIn: EventCheckIn = {
          ...existingData,
          scan_payload: {
            ...existingData.scan_payload,
            full_name: existingData.scan_payload.full_name ?? (fullName || undefined),
            email: existingData.scan_payload.email ?? scannedUser.email,
            role: existingData.scan_payload.role ?? scannedUser.role,
          },
        };
        return {
          success: true,
          check_in: existingCheckIn,
          already_checked_in: true,
          dietary_restrictions: dietaryRestrictions,
        };
      }
      throw insertError;
    }

    return {
      success: true,
      check_in: checkInRecord,
      already_checked_in: false,
      dietary_restrictions: dietaryRestrictions,
    };
  } catch (error) {
    const detailedError = error instanceof Error ? error.message : "An unknown error occurred";
    console.error("Process check-in error:", detailedError);

    const isProduction = process.env.APP_ENV === "production";
    const errorMessage = isProduction ? "Unable to process check-in. Please try again." : detailedError;

    return { success: false, error: errorMessage };
  }
};
