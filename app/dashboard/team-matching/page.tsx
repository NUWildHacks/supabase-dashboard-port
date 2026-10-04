import { redirect } from "next/navigation";

import { ADMIN, DASHBOARD_PATH, DASHBOARD_TEAM_MATCHING_PATH, LOGIN_PATH } from "@/constants";
import { getAuthenticatedUser, getConfig } from "@/lib";
import type { TeamMatchingMode } from "@/types";

import { TeamMatchingAdmin } from "./_components/team-matching-admin";
import { getIntakeEntries, getRuns, getSettings } from "./_lib/lib";

const TeamMatchingPage = async () => {
  const redirectPath = `${LOGIN_PATH}?redirect=${encodeURIComponent(DASHBOARD_TEAM_MATCHING_PATH)}`;
  const { role } = await getAuthenticatedUser(redirectPath);
  if (role !== ADMIN) redirect(DASHBOARD_PATH);

  const config = await getConfig();
  const mode: TeamMatchingMode = config.team_matching_mode ?? "dev";

  const [runs, settings, entries] = await Promise.all([getRuns(mode), getSettings(), getIntakeEntries(mode)]);

  const resultsReleased = mode === "prod" ? (config.results_released ?? false) : (config.results_released_dev ?? false);

  return (
    <div className="flex-1 flex flex-col gap-6">
      <TeamMatchingAdmin
        entries={entries}
        runs={runs}
        settings={settings}
        resultsReleased={resultsReleased}
        initialMode={mode}
      />
    </div>
  );
};

export default TeamMatchingPage;
