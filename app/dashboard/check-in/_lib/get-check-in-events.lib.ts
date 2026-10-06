import supabaseAdmin from "@/config/supabase-admin";
import { EVENTS_TABLE } from "@/constants";
import { selectAllRows } from "@/lib";

import type { CheckInEventOption } from "../types";

type CheckInEventRow = Partial<Omit<CheckInEventOption, "id">> & { id: string };

const normalizeTimestamp = (value: unknown): number => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  return 0;
};

const normalizeText = (value: unknown, fallback: string): string => {
  if (typeof value === "string") {
    const trimmedValue = value.trim();
    return trimmedValue || fallback;
  }

  return fallback;
};

export const getCheckInEvents = async (): Promise<CheckInEventOption[]> => {
  const data = await selectAllRows((from, to) =>
    supabaseAdmin
      .from(EVENTS_TABLE)
      .select("id, title, location, start_time, end_time")
      .order("id")
      .range(from, to)
      .throwOnError()
  );

  return ((data ?? []) as CheckInEventRow[])
    .map((eventData) => {
      return {
        id: eventData.id,
        title: normalizeText(eventData.title, "Untitled event"),
        location: normalizeText(eventData.location, "TBD"),
        start_time: normalizeTimestamp(eventData.start_time),
        end_time: normalizeTimestamp(eventData.end_time),
      } satisfies CheckInEventOption;
    })
    .sort((leftEvent, rightEvent) => {
      if (leftEvent.start_time !== rightEvent.start_time) {
        return leftEvent.start_time - rightEvent.start_time;
      }

      return leftEvent.title.localeCompare(rightEvent.title);
    });
};
