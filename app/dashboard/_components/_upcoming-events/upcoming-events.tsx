"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { EventDialog } from "@/app/dashboard/schedule/_components";
import { useEvents } from "@/app/dashboard/schedule/_hooks";
import type { Event } from "@/app/dashboard/schedule/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { DASHBOARD_SCHEDULE_PATH } from "@/constants";
import { useItemDialog } from "@/hooks";

import { EventsList } from "..";

const UpcomingEvents = () => {
  const useEventsReturn = useEvents({ limitCount: 3, upcomingOnly: true });
  const { events, isLoading } = useEventsReturn;

  const upcomingEvents = events.filter((event) => event.end_time > Date.now());

  const useEventDialogReturn = useItemDialog<Event>(upcomingEvents, "event");

  return (
    <>
      <Card className="shadow-xs size-full">
        <CardHeader>
          <CardTitle>Upcoming Events</CardTitle>
          <CardDescription>
            Don&apos;t miss what&apos;s next! Browse workshops, talks, and activities happening throughout WildHacks.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col justify-start items-center gap-4">
          <EventsList events={upcomingEvents} isLoading={isLoading} {...useEventDialogReturn} />
        </CardContent>
        <CardFooter className="flex-row-reverse">
          <Link href={DASHBOARD_SCHEDULE_PATH} aria-label="View all events">
            <Button variant="link">
              View all events
              <ArrowRight aria-hidden="true" />
            </Button>
          </Link>
        </CardFooter>
      </Card>
      <EventDialog {...useEventDialogReturn} />
    </>
  );
};

export default UpcomingEvents;
