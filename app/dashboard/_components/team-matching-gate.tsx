"use client";

import { useEffect, useRef, useState } from "react";

import Discord from "@/components/icon/discord";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import { createSupabaseBrowserClient } from "@/config/supabase-browser";
import { DISCORD_TEAM_PATH, WILDHACKS_CONFIG_TABLE } from "@/constants";
import type { TeamSuggestion } from "@/types";

import { getParticipantSuggestions } from "../_actions/get-participant-suggestions.actions";

import TeamMatchingIntake from "./team-matching-intake";
import TeamMatchingResults from "./team-matching-results";

type Props = {
  hasSubmitted: boolean;
  initialSuggestions: TeamSuggestion[];
  releasedField?: "results_released" | "results_released_dev";
  firstName: string;
  lastName: string;
  email: string;
  school: string;
  fieldOfStudy: string;
  eventStartTime: number;
};

export const TeamMatchingGate = ({
  hasSubmitted,
  initialSuggestions,
  releasedField = "results_released",
  ...intakeProps
}: Props) => {
  const [released, setReleased] = useState(false);
  const [suggestions, setSuggestions] = useState<TeamSuggestion[]>(initialSuggestions);
  const fetchedRef = useRef(initialSuggestions.length > 0);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    let active = true;

    const handleReleased = async (newReleased: boolean) => {
      if (!active) return;
      setReleased(newReleased);

      if (newReleased && hasSubmitted && !fetchedRef.current) {
        fetchedRef.current = true;
        const result = await getParticipantSuggestions();
        if (active) setSuggestions(result);
      }

      if (!newReleased) {
        fetchedRef.current = false;
        setSuggestions([]);
      }
    };

    const channel = supabase
      .channel(`team-matching-gate-${releasedField}-${crypto.randomUUID()}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: WILDHACKS_CONFIG_TABLE, filter: "id=eq.config" },
        (payload) => {
          void handleReleased((payload.new as Record<string, unknown>)[releasedField] === true);
        }
      )
      .subscribe();

    void (async () => {
      const { data } = await supabase
        .from(WILDHACKS_CONFIG_TABLE)
        .select(releasedField)
        .eq("id", "config")
        .maybeSingle();
      await handleReleased((data as Record<string, unknown> | null)?.[releasedField] === true);
    })();

    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, [hasSubmitted, releasedField]);

  if (hasSubmitted && released && suggestions.length > 0) {
    return <TeamMatchingResults suggestions={suggestions} />;
  }

  if (!hasSubmitted && released) {
    return (
      <Card className="shadow-xs h-full flex flex-col">
        <CardHeader>
          <CardTitle>Team matching has closed</CardTitle>
          <CardDescription>
            If you&apos;re still looking for a team, head to Discord — that&apos;s where teams are forming now.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-1 flex items-center justify-center">
          <Button variant="outline" className="w-fit gap-2" asChild>
            <a href={DISCORD_TEAM_PATH} target="_blank" rel="noopener noreferrer">
              <Discord className="size-4" />
              #find-teammates
            </a>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return <TeamMatchingIntake hasSubmitted={hasSubmitted} {...intakeProps} />;
};
