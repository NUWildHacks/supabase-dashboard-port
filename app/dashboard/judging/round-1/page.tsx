import { redirect } from "next/navigation";

import { DASHBOARD_JUDGING_ROUND_1_PATH, DASHBOARD_PATH, JUDGE, JUDGE_AND_MENTOR, LOGIN_PATH } from "@/constants";
import { getAuthenticatedUser } from "@/lib/server";

import { JudgingDisplay } from "../_components";
import { ROUND_1 } from "../constants";
import { getJudgingAssignmentsWithProjectForRound } from "../lib";

const JudgingRound1Page = async () => {
  const redirectPath = `${LOGIN_PATH}?redirect=${encodeURIComponent(DASHBOARD_JUDGING_ROUND_1_PATH)}`;

  const user = await getAuthenticatedUser(redirectPath);
  if (user.role !== JUDGE && user.role !== JUDGE_AND_MENTOR) redirect(DASHBOARD_PATH);

  const judgingAssignmentsWithProject = await getJudgingAssignmentsWithProjectForRound(user.id, ROUND_1);

  return (
    <JudgingDisplay
      {...user}
      judgingAssignmentsWithProject={judgingAssignmentsWithProject}
      currentPath={DASHBOARD_JUDGING_ROUND_1_PATH}
      judgingRound={ROUND_1}
    />
  );
};

export default JudgingRound1Page;
