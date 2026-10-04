"use client";

import { useEffect, useMemo, useState } from "react";

import { createSupabaseBrowserClient } from "@/config/supabase-browser";
import { EVENTS_TABLE } from "@/constants";
import type { UseFiltersReturnWithAll } from "@/hooks";
import { fromRows } from "@/lib/db.lib";

import { EVENT_FIELDS } from "../constants";
import type { CalendarDay, Event, EventCategory } from "../types";

export type UseEventsSettings = {
  category?: UseFiltersReturnWithAll<EventCategory>["category"];
  search?: UseFiltersReturnWithAll<EventCategory>["search"];
  selectedDay?: CalendarDay;
  limitCount?: number;
};

export type UseEventsReturn = {
  events: Event[];
  isLoading: boolean;
};

export const useEvents = (settings: UseEventsSettings): UseEventsReturn => {
  const [allEvents, setAllEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const { category, search, selectedDay, limitCount } = settings;

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    let isActive = true;

    const fetchEvents = async () => {
      let q = supabase.from(EVENTS_TABLE).select().order(EVENT_FIELDS.start_time, { ascending: true });

      if (limitCount) {
        q = q.limit(limitCount);
      }

      const { data, error } = await q;
      if (!isActive) return;

      if (error) {
        console.error("Error fetching events:", error);
        setIsLoading(false);
        return;
      }

      setAllEvents(fromRows<Event>(data));
      setIsLoading(false);
    };

    fetchEvents();

    const channel = supabase
      .channel(`events-${crypto.randomUUID()}`)
      .on("postgres_changes", { event: "*", schema: "public", table: EVENTS_TABLE }, () => {
        fetchEvents();
      })
      .subscribe();

    return () => {
      isActive = false;
      supabase.removeChannel(channel);
    };
  }, [limitCount]);

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
