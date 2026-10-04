export const ROOT_PATH = "/" as const;

export const REGISTRATION_PATH = "/registration" as const;

export const DASHBOARD_PATH = "/dashboard" as const;
export const DASHBOARD_SCHEDULE_PATH = "/dashboard/schedule" as const;
export const DASHBOARD_MANAGE_USERS_PATH = "/dashboard/manage-users" as const;
export const DASHBOARD_CHECK_IN_PATH = "/dashboard/check-in" as const;
export const DASHBOARD_SUPPORT_PATH = "/dashboard/support" as const;
export const DASHBOARD_SETTINGS_PATH = "/dashboard/settings" as const;
export const DASHBOARD_CROWD_FAVORITE_PATH = "/dashboard/crowd-favorite" as const;
export const GUIDE_PATH = "/guide" as const;
export const DASHBOARD_JUDGING_ROUND_1_PATH = "/dashboard/judging/round-1" as const;
export const DASHBOARD_JUDGING_ROUND_2_PATH = "/dashboard/judging/round-2" as const;
export const DASHBOARD_MENTORING_PATH = "/dashboard/mentoring" as const;
export const DASHBOARD_TEAM_MATCHING_PATH = "/dashboard/team-matching" as const;

export const LOGIN_PATH = "/login" as const;
export const AUTH_CALLBACK_PATH = "/auth/callback" as const;
export const LOGIN_CLOSED_ERROR = "closed" as const;
export const LOGIN_FAILED_ERROR = "failed" as const;

export const PROTECTED_ROUTES = [
  REGISTRATION_PATH,
  DASHBOARD_PATH,
  DASHBOARD_SCHEDULE_PATH,
  DASHBOARD_MANAGE_USERS_PATH,
  DASHBOARD_CROWD_FAVORITE_PATH,
  GUIDE_PATH,
  DASHBOARD_CHECK_IN_PATH,
  DASHBOARD_MENTORING_PATH,
  DASHBOARD_JUDGING_ROUND_1_PATH,
  DASHBOARD_JUDGING_ROUND_2_PATH,
  DASHBOARD_SETTINGS_PATH,
  DASHBOARD_TEAM_MATCHING_PATH,
] as const satisfies readonly string[];

export const WILDHACKS_HOME = "/wildhacks-home" as const;
export const JUDGE_REGISTRATION_PATH = "/judge-registration" as const;
export const TECH_ROOM_FINDER_PATH = "/tech-room-finder" as const;
export const JUDGING_GUIDE_PATH = "/judging-guide" as const;
export const DISCORD_INVITE_PATH = "/discord-invite" as const;
export const DISCORD_TEAM_PATH = "/discord-team" as const;
export const DEVPOST_PATH = "/devpost" as const;
export const VIRTUAL_ZOOM_JUDGING_PATH = "/virtual-zoom-judging" as const;
