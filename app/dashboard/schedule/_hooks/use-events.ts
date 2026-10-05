"use client";

import { useEffect, useMemo, useState } from "react";

import { createSupabaseBrowserClient } from "@/config/supabase-browser";
import { EVENTS_TABLE, ONE_MINUTE } from "@/constants";
import type { UseFiltersReturnWithAll } from "@/hooks";
import { fromRows, selectAllRows } from "@/lib/db.lib";

import { EVENT_FIELDS } from "../constants";
import type { CalendarDay, Event, EventCategory } from "../types";

export type UseEventsSettings = {
  category?: UseFiltersReturnWithAll<EventCategory>["category"];
  search?: UseFiltersReturnWithAll<EventCategory>["search"];
  selectedDay?: CalendarDay;
  limitCount?: number;
  /** Only events that have not ended yet. The list refreshes every minute as events end. */
  upcomingOnly?: boolean;
};

export type UseEventsReturn = {
  events: Event[];
  isLoading: boolean;
};

export const useEvents = (settings: UseEventsSettings): UseEventsReturn => {
  const [allEvents, setAllEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const { category, search, selectedDay, limitCount, upcomingOnly } = settings;

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    let isActive = true;
    // Only the newest request may update the state, so a slow older response cannot overwrite it.
    let latestRequest = 0;

    const queryEvents = (from: number, to: number) => {
      let q = supabase.from(EVENTS_TABLE).select();
      if (upcomingOnly) q = q.gt(EVENT_FIELDS.end_time, Date.now());
      return q
        .order(EVENT_FIELDS.start_time, { ascending: true })
        .order("id", { ascending: true })
        .range(from, to)
        .throwOnError();
    };

    const fetchEvents = async () => {
      const request = ++latestRequest;
      try {
        const rows = limitCount
          ? (await queryEvents(0, limitCount - 1)).data
          : await selectAllRows((from, to) => queryEvents(from, to));
        if (!isActive || request !== latestRequest) return;

        setAllEvents(fromRows<Event>(rows));
      } catch (error) {
        if (!isActive || request !== latestRequest) return;
        console.error("Error fetching events:", error);
      }
      setIsLoading(false);
    };

    fetchEvents();

    const channel = supabase
      .channel(`events-${crypto.randomUUID()}`)
      .on("postgres_changes", { event: "*", schema: "public", table: EVENTS_TABLE }, () => {
        fetchEvents();
      })
      .subscribe((status) => {
        // Changes made while the connection was down are not replayed, so fetch again after
        // every (re)connect.
        if (status === "SUBSCRIBED") fetchEvents();
      });

    const refreshTimer = upcomingOnly ? setInterval(fetchEvents, ONE_MINUTE) : undefined;

    return () => {
      isActive = false;
      if (refreshTimer) clearInterval(refreshTimer);
      supabase.removeChannel(channel);
    };
  }, [limitCount, upcomingOnly]);

  const events = useMemo(() => {
    let result = allEvents;

    if (category && category !== "all") {
      result = result.filter((event) => event.category === category);
    }

    if (search && search !== "") {
      const searchLower = search.toLowerCase();
      result = result.filter((event) => {
        return (
          event.title.toLowerCase().includes(searchLower) ||
          event.body.toLowerCase().includes(searchLower) ||
          event.category.toLowerCase().includes(searchLower) ||
          event.location.toLowerCase().includes(searchLower)
        );
      });
    }

    if (selectedDay) {
      result = result.filter((event) => event.start_time >= selectedDay.startMs && event.end_time <= selectedDay.endMs);
    }

    return result;
  }, [allEvents, category, search, selectedDay]);

  return { events, isLoading };
};
