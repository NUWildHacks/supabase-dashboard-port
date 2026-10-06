import { redirect } from "next/navigation";
import { PropsWithChildren } from "react";

import { DASHBOARD_PATH, JUDGE, LOGIN_PATH, JUDGE_AND_MENTOR } from "@/constants";
import { getAuthenticatedUser, onboardUser } from "@/lib/server";

import { DashboardSidebar, OnboardingDialog } from "./_components";

type DashboardLayoutProps = PropsWithChildren;

const DashboardLayout = async ({ children }: DashboardLayoutProps) => {
  const redirectPath = `${LOGIN_PATH}?redirect=${encodeURIComponent(DASHBOARD_PATH)}`;

  const { id: userId, role } = await getAuthenticatedUser(redirectPath);
  if (!userId) redirect(redirectPath);

  const onboarded = role === JUDGE || role === JUDGE_AND_MENTOR ? await onboardUser(userId) : true;

  return (
    <>
      <DashboardSidebar role={role}>{children}</DashboardSidebar>
      {(role === JUDGE || role === JUDGE_AND_MENTOR) && <OnboardingDialog role={role} onboarded={onboarded} />}
    </>
  );
};

export default DashboardLayout;
