import { redirect } from "next/navigation";

import { ADMIN, DASHBOARD_CROWD_FAVORITE_PATH, DASHBOARD_PATH, LOGIN_PATH, PARTICIPANT } from "@/constants";
import { getAuthenticatedUser, getConfig } from "@/lib/server";

import {
  CrowdFavoriteAdminProjectList,
  CrowdFavoriteOptInForm,
  CrowdFavoriteOptedInView,
  CrowdFavoriteVoteForm,
} from "./_components";
import {
  getAllCrowdFavoriteProjects,
  getCrowdFavoriteProjectForUser,
  getCrowdFavoriteProjectsWithVoteCount,
  getUserVotedProjectId,
} from "./_lib";
import {
  hasCrowdFavoriteVotingStarted,
  isCrowdFavoriteOptInOpen,
  isCrowdFavoritePresentationPhase,
  isCrowdFavoriteVotingClosed,
  isCrowdFavoriteVotingOpen,
} from "./constants";

const CrowdFavoritePage = async () => {
  const redirectPath = `${LOGIN_PATH}?redirect=${encodeURIComponent(DASHBOARD_CROWD_FAVORITE_PATH)}`;

  const user = await getAuthenticatedUser(redirectPath);
  if (user.role !== PARTICIPANT && user.role !== ADMIN) redirect(DASHBOARD_PATH);

  // Fetch config once to pass to all helpers
  const config = await getConfig();

  if (user.role === ADMIN) {
    const showVoteCount = await hasCrowdFavoriteVotingStarted(config);
    const votingClosed = await isCrowdFavoriteVotingClosed(config);
    const projects = await getCrowdFavoriteProjectsWithVoteCount(showVoteCount);

    return (
      <div className="flex flex-1 flex-col gap-6">
        <section className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold">Crowd favorite projects</h1>
          <p className="max-w-3xl text-sm text-muted-foreground">
            {votingClosed
              ? "Voting is closed. The top-ranked project is highlighted below."
              : showVoteCount
                ? "Projects are sorted by votes. Voting has started, so vote counts are now visible."
                : "Projects are sorted by oldest opt-in until voting starts."}
          </p>
        </section>

        <CrowdFavoriteAdminProjectList
          projects={projects}
          showVoteCount={showVoteCount}
          highlightWinner={votingClosed}
        />
      </div>
    );
  }

  const optInOpen = await isCrowdFavoriteOptInOpen(config);
  const inPresentationPhase = await isCrowdFavoritePresentationPhase(config);
  const votingOpen = await isCrowdFavoriteVotingOpen(config);
  const votingClosed = await isCrowdFavoriteVotingClosed(config);

  const crowdFavoriteProject = await getCrowdFavoriteProjectForUser(user.id);
  const [crowdFavoriteProjects, votedProjectId] = await Promise.all([
    votingOpen ? getAllCrowdFavoriteProjects() : Promise.resolve([]),
    votingOpen ? getUserVotedProjectId(user.id) : Promise.resolve(null),
  ]);

  const participantTitle = votingOpen
    ? "Voting is open"
    : optInOpen
      ? "Opt-in is open"
      : inPresentationPhase
        ? "Presentation phase"
        : votingClosed
          ? "Voting is closed"
          : "Crowd favorite updates";

  const participantDescription = votingOpen
    ? "Cast your crowd favorite vote now. If voting stays open, you can update your selection before it closes."
    : optInOpen
      ? crowdFavoriteProject
        ? "Your team is currently opted in. Review your project details below and manage your opt-in while this window is open."
        : "Submit your team to opt in during this window if you want your project included for crowd favorite."
      : inPresentationPhase
        ? "Follow live instructions in LR2 for voting updates and next steps."
        : votingClosed
          ? "Crowd favorite voting has ended and results are now locked."
          : "Crowd favorite is not currently open. Check back for the next active phase.";

  return (
    <div className="flex flex-1 flex-col gap-6">
      <section className="flex flex-col gap-2">
        <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Crowd Favorite</p>
        <h1 className="text-2xl font-semibold">{participantTitle}</h1>
        <p className="max-w-3xl text-sm text-muted-foreground">{participantDescription}</p>
      </section>

      {votingOpen ? (
        <CrowdFavoriteVoteForm
          projects={crowdFavoriteProjects.map((project) => ({
            id: project.id,
            project_name: project.project_name,
          }))}
          initialVotedProjectId={votedProjectId ?? undefined}
        />
      ) : crowdFavoriteProject ? (
        <CrowdFavoriteOptedInView crowdFavoriteProject={crowdFavoriteProject} canOptOut={optInOpen} />
      ) : (
        <>
          {optInOpen ? (
            <CrowdFavoriteOptInForm callerFirstName={user.first_name} callerEmail={user.email} />
          ) : inPresentationPhase ? (
            <section className="flex flex-col gap-3 rounded-lg border bg-card p-6 shadow-sm">
              <p className="text-sm font-semibold">Presentation phase instructions</p>
              <p className="text-sm text-muted-foreground">
                Your team is not opted in. If you want to vote for crowd favorite, be in LR2 by 2:00 PM and follow the
                live in-room announcement for voting.
              </p>
            </section>
          ) : votingClosed ? (
            <section className="flex flex-col gap-3 rounded-lg border bg-card p-6 shadow-sm">
              <p className="text-sm font-semibold">Voting is closed</p>
              <p className="text-sm text-muted-foreground">
                The crowd favorite voting window has ended. Final tally is now locked.
              </p>
            </section>
          ) : (
            <section className="flex flex-col gap-4 rounded-lg border bg-card p-6 shadow-sm">
              <div>
                <p className="text-sm font-semibold">Crowd favorite opt-in is closed</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  The opt-in form is only available during the configured phase window.
                </p>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
};

export default CrowdFavoritePage;
