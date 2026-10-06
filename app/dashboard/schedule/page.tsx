import { DASHBOARD_SCHEDULE_PATH, LOGIN_PATH } from "@/constants";
import { getAuthenticatedUser, getConfig } from "@/lib/server";

import { ScheduleDisplay } from "./_components";

const SchedulePage = async () => {
  const redirectPath = `${LOGIN_PATH}?redirect=${encodeURIComponent(DASHBOARD_SCHEDULE_PATH)}`;

  const { role } = await getAuthenticatedUser(redirectPath);

  const wildhacksConfig = await getConfig();

  return <ScheduleDisplay {...wildhacksConfig} userRole={role} />;
};

export default SchedulePage;
