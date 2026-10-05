import { redirect } from "next/navigation";

import { DASHBOARD_JUDGING_ROUND_2_PATH, DASHBOARD_PATH, JUDGE, JUDGE_AND_MENTOR, LOGIN_PATH } from "@/constants";
import { getAuthenticatedUser } from "@/lib/server";

import { JudgingDisplay } from "../_components";
import { ROUND_2 } from "../constants";
import { getJudgingAssignmentsWithProjectForRound } from "../lib";

const JudgingRound2Page = async () => {
  const redirectPath = `${LOGIN_PATH}?redirect=${encodeURIComponent(DASHBOARD_JUDGING_ROUND_2_PATH)}`;

  const user = await getAuthenticatedUser(redirectPath);
  if (user.role !== JUDGE && user.role !== JUDGE_AND_MENTOR) redirect(DASHBOARD_PATH);

  const judgingAssignmentsWithProject = await getJudgingAssignmentsWithProjectForRound(user.id, ROUND_2);

  return (
    <JudgingDisplay
      {...user}
      judgingAssignmentsWithProject={judgingAssignmentsWithProject}
      currentPath={DASHBOARD_JUDGING_ROUND_2_PATH}
      judgingRound={ROUND_2}
    />
  );
};

export default JudgingRound2Page;
