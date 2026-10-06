import { ADMIN, DASHBOARD_SETTINGS_PATH, JUDGE, LOGIN_PATH, JUDGE_AND_MENTOR, PARTICIPANT } from "@/constants";
import { getSecrets } from "@/lib/secrets.lib";
import { getAuthenticatedUser, getConfig } from "@/lib/server";
import type {
  AdminUser,
  JudgeUser,
  JudgeAndMentorUser,
  ParticipantUser,
  WildHacksConfig,
  WildHacksSecrets,
} from "@/types";

import {
  EditParticipantProfileForm,
  EventWithdraw,
  ThemeSelect,
  EditWildhacksConfigForm,
  EditAdminProfileForm,
  EditJudgeMentorProfileForm,
} from "./_components";

const SettingsPage = async () => {
  const redirectPath = `${LOGIN_PATH}?redirect=${encodeURIComponent(DASHBOARD_SETTINGS_PATH)}`;

  const user = await getAuthenticatedUser(redirectPath);

  let wildHacksConfig: (WildHacksConfig & WildHacksSecrets) | undefined;
  if (user.role === ADMIN) {
    const [config, secrets] = await Promise.all([getConfig(), getSecrets()]);
    wildHacksConfig = { ...config, ...secrets };
  }

  return (
    <div className="flex-1 flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        <h2 className="text-md font-semibold">General</h2>
        <ThemeSelect />
        {user.role !== ADMIN && <EventWithdraw />}
      </div>
      {wildHacksConfig && (
        <div className="flex flex-col gap-4">
          <h2 className="text-md font-semibold">WildHacks Configuration</h2>
          <EditWildhacksConfigForm wildhacksConfig={wildHacksConfig} />
        </div>
      )}
      <div className="flex flex-col gap-4">
        <h2 className="text-md font-semibold">Profile</h2>
        {user.role === PARTICIPANT && <EditParticipantProfileForm participantUser={user as ParticipantUser} />}
        {(user.role === JUDGE || user.role === JUDGE_AND_MENTOR) && (
          <EditJudgeMentorProfileForm user={user as JudgeUser | JudgeAndMentorUser} />
        )}
        {user.role === ADMIN && <EditAdminProfileForm adminUser={user as AdminUser} />}
      </div>
    </div>
  );
};

export default SettingsPage;
