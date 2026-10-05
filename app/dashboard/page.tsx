import {
  CrowdFavoriteAdminLink,
  CrowdFavoriteParticipantLink,
  CrowdFavoritePresentationTile,
  QRCode,
  Statistics,
  Countdown,
  UpcomingEvents,
  VenueMap,
  ResumeUpload,
} from "@/app/dashboard/_components";
import {
  getAllCrowdFavoriteProjects,
  getCrowdFavoriteProjectForUser,
  getUserVotedProjectId,
} from "@/app/dashboard/crowd-favorite/_lib";
import {
  hasCrowdFavoriteOptInStarted,
  isCrowdFavoriteOptInOpen,
  isCrowdFavoritePresentationPhase,
  isCrowdFavoriteVotingOpen,
} from "@/app/dashboard/crowd-favorite/constants";
import supabaseAdmin from "@/config/supabase-admin";
import {
  ADMIN,
  DASHBOARD_PATH,
  LOGIN_PATH,
  PARTICIPANT,
  TEAM_MATCHING_FORMATIONS_TABLE,
  TEAM_MATCHING_FORMATIONS_TABLE_PROD,
  TEAM_MATCHING_INTAKE_TABLE,
  TEAM_MATCHING_INTAKE_TABLE_DEV,
  TEAM_MATCHING_RUNS_TABLE,
  TEAM_MATCHING_RUNS_TABLE_PROD,
  TEAM_MATCHING_TEAMS_TABLE,
  TEAM_MATCHING_TEAMS_TABLE_PROD,
} from "@/constants";
import { cn, fromRows, selectAllRows } from "@/lib";
import { createCheckInCode } from "@/lib/check-in-code.lib";
import { getAuthenticatedUser, getConfig } from "@/lib/server";
import { calculateStatistics } from "@/lib/statistics.lib";
import type { MatchedTeam, TeamFormation, TeamMatchingRun, TeamSuggestion } from "@/types";

import { TeamMatchingGate } from "./_components/team-matching-gate";
import { getResumeMetadata } from "./_lib/resume";

async function fetchTopSuggestions(
  userId: string,
  collections: {
    runs: string;
    teams: string;
    formations: string;
  }
): Promise<TeamSuggestion[]> {
  const { data: topRunRows } = await supabaseAdmin
    .from(collections.runs)
    .select()
    .eq("is_top", true)
    .order("run_at", { ascending: false })
    .throwOnError();
  const topRuns = fromRows<TeamMatchingRun>(topRunRows);

  const results: TeamSuggestion[] = [];
  const seen = new Set<string>();

  const tryAdd = (team: MatchedTeam & { id: string }) => {
    if (results.length >= 3) return;
    const key = team.members
      .map((m) => m.user_id)
      .sort()
      .join(",");
    if (seen.has(key)) return;
    seen.add(key);
    results.push({
      rank: (results.length + 1) as 1 | 2 | 3,
      team_id: team.id,
      members: team.members,
      score: team.score,
      match_reasons: team.match_reasons,
      where_to_meet: team.where_to_meet,
    });
  };

  for (const run of topRuns) {
    if (results.length >= 3) break;

    const teamRows = await selectAllRows((from, to) =>
      supabaseAdmin.from(collections.teams).select().eq("run_id", run.id).order("id").range(from, to).throwOnError()
    );
    const primary = fromRows<MatchedTeam>(teamRows).find((t) => t.members.some((m) => m.user_id === userId));
    if (primary) tryAdd(primary);

    if (results.length >= 3) break;

    const { data: formationRows } = await supabaseAdmin
      .from(collections.formations)
      .select("run_id, formation_index, teams, fingerprint")
      .in(
        "id",
        [1, 2].map((i) => `${run.id}_alt${i}`)
      )
      .throwOnError();
    const formations = fromRows<TeamFormation>(formationRows).sort((a, b) => a.formation_index - b.formation_index);
    for (const formation of formations) {
      if (results.length >= 3) continue;
      const altTeam = formation.teams.find((t) => t.members.some((m) => m.user_id === userId));
      if (altTeam) tryAdd(altTeam);
    }
  }

  return results;
}

const DashboardPage = async () => {
  const redirectPath = `${LOGIN_PATH}?redirect=${encodeURIComponent(DASHBOARD_PATH)}`;

  const { id: userId, role, first_name, last_name, email, ...userProfile } = await getAuthenticatedUser(redirectPath);
  const school = "school" in userProfile ? userProfile.school : "";
  const field_of_study = "field_of_study" in userProfile ? userProfile.field_of_study : "";

  const wildhacksConfig = await getConfig();
  const wildHacksStatistics = role === ADMIN ? await calculateStatistics() : undefined;

  const resumeMetadata = await getResumeMetadata(userId);
  const fileName = resumeMetadata?.file_name;
  const showAdminCrowdFavoriteLink = role === ADMIN && (await hasCrowdFavoriteOptInStarted(wildhacksConfig));
  const participantOptInOpen = await isCrowdFavoriteOptInOpen(wildhacksConfig);
  const participantVotingOpen = await isCrowdFavoriteVotingOpen(wildhacksConfig);
  const showParticipantCrowdFavoriteLink = role === PARTICIPANT && (participantOptInOpen || participantVotingOpen);
  const showPresentationTile = role === PARTICIPANT && (await isCrowdFavoritePresentationPhase(wildhacksConfig));

  const [crowdFavoriteProject, votingProjects, votedForProjectId] = await Promise.all([
    role === PARTICIPANT ? getCrowdFavoriteProjectForUser(userId) : Promise.resolve(null),
    participantVotingOpen ? getAllCrowdFavoriteProjects() : Promise.resolve([]),
    participantVotingOpen && role === PARTICIPANT ? getUserVotedProjectId(userId) : Promise.resolve(null),
  ]);

  const isOptedIn = crowdFavoriteProject !== null;

  let hasSubmittedTeamMatching = false;
  if (role === PARTICIPANT || role === ADMIN) {
    const intakeTable = role === PARTICIPANT ? TEAM_MATCHING_INTAKE_TABLE : TEAM_MATCHING_INTAKE_TABLE_DEV;
    const { data: intake } = await supabaseAdmin
      .from(intakeTable)
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle()
      .throwOnError();
    hasSubmittedTeamMatching = intake !== null;
  }

  const adminMode = wildhacksConfig.team_matching_mode ?? "dev";
  const suggestionCollections =
    role === PARTICIPANT
      ? {
          runs: TEAM_MATCHING_RUNS_TABLE_PROD,
          teams: TEAM_MATCHING_TEAMS_TABLE_PROD,
          formations: TEAM_MATCHING_FORMATIONS_TABLE_PROD,
        }
      : adminMode === "prod"
        ? {
            runs: TEAM_MATCHING_RUNS_TABLE_PROD,
            teams: TEAM_MATCHING_TEAMS_TABLE_PROD,
            formations: TEAM_MATCHING_FORMATIONS_TABLE_PROD,
          }
        : {
            runs: TEAM_MATCHING_RUNS_TABLE,
            teams: TEAM_MATCHING_TEAMS_TABLE,
            formations: TEAM_MATCHING_FORMATIONS_TABLE,
          };

  // Participants get suggestions only after admins release the results; the page data would
  // otherwise carry them to the browser early.
  const initialSuggestions =
    role === ADMIN || (role === PARTICIPANT && wildhacksConfig.results_released === true)
      ? await fetchTopSuggestions(userId, suggestionCollections)
      : [];

  const now = new Date().getTime();
  const end = wildhacksConfig.end_time;

  return (
    <>
      <div className="grid gap-4 auto-rows-min md:grid-cols-2 lg:grid-cols-4">
        <div className="md:col-span-2">
          <Countdown {...wildhacksConfig} />
        </div>
        {role === PARTICIPANT && (
          <div className="md:col-span-1">
            <QRCode code={createCheckInCode(userId)} />
          </div>
        )}
        <div className={cn(role === PARTICIPANT || showAdminCrowdFavoriteLink ? "md:col-span-1" : "md:col-span-2")}>
          <VenueMap />
        </div>
        {showAdminCrowdFavoriteLink && (
          <div className="md:col-span-1">
            <CrowdFavoriteAdminLink />
          </div>
        )}
      </div>

      {role === PARTICIPANT && now < end && (
        <div className="grid gap-4 auto-rows-min md:grid-cols-2">
          <ResumeUpload fileName={fileName} />
          {showParticipantCrowdFavoriteLink ? (
            <CrowdFavoriteParticipantLink
              votingOpen={participantVotingOpen}
              optInOpen={participantOptInOpen}
              isOptedIn={isOptedIn}
              callerFirstName={first_name}
              callerEmail={email}
              crowdFavoriteProject={crowdFavoriteProject}
              votingProjects={votingProjects.map((p) => ({ id: p.id, project_name: p.project_name }))}
              initialVotedProjectId={votedForProjectId ?? undefined}
            />
          ) : showPresentationTile ? (
            <CrowdFavoritePresentationTile />
          ) : (
            <TeamMatchingGate
              hasSubmitted={hasSubmittedTeamMatching}
              initialSuggestions={initialSuggestions}
              firstName={first_name}
              lastName={last_name}
              email={email}
              school={school as string}
              fieldOfStudy={field_of_study as string}
              eventStartTime={wildhacksConfig.start_time}
            />
          )}
        </div>
      )}

      {role === ADMIN && now < end && hasSubmittedTeamMatching && (
        <div className="md:col-span-1">
          <TeamMatchingGate
            hasSubmitted={hasSubmittedTeamMatching}
            initialSuggestions={initialSuggestions}
            releasedField="results_released_dev"
            firstName={first_name}
            lastName={last_name}
            email={email}
            school={school as string}
            fieldOfStudy={field_of_study as string}
            eventStartTime={wildhacksConfig.start_time}
          />
        </div>
      )}

      <div className={cn("grid grid-cols-1 gap-4", wildHacksStatistics && "lg:grid-cols-2")}>
        <UpcomingEvents />
        {wildHacksStatistics && <Statistics {...wildHacksStatistics} />}
      </div>
    </>
  );
};

export default DashboardPage;
