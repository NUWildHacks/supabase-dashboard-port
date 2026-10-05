import { redirect } from "next/navigation";

import { CheckInConsole } from "@/app/dashboard/check-in/_components";
import { getCheckInEvents } from "@/app/dashboard/check-in/_lib";
import { ADMIN, DASHBOARD_CHECK_IN_PATH, DASHBOARD_PATH, LOGIN_PATH } from "@/constants";
import { getAuthenticatedUser } from "@/lib/server";

const CheckInPage = async () => {
  const redirectPath = `${LOGIN_PATH}?redirect=${encodeURIComponent(DASHBOARD_CHECK_IN_PATH)}`;

  const { role } = await getAuthenticatedUser(redirectPath);
  if (role !== ADMIN) redirect(DASHBOARD_PATH);

  const events = await getCheckInEvents();

  return <CheckInConsole events={events} />;
};

export default CheckInPage;
