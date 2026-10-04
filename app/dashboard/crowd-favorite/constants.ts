import { getConfig } from "@/lib";
import type { WildHacksConfig } from "@/types";

export const CROWD_FAVORITE_MAX_TEAM_MEMBERS = 4;
export const CROWD_FAVORITE_MAX_ADDITIONAL_MEMBERS = CROWD_FAVORITE_MAX_TEAM_MEMBERS - 1;

type CrowdFavoriteState = Pick<
  WildHacksConfig,
  | "crowd_favorite_opt_in_started"
  | "crowd_favorite_opt_in_open"
  | "crowd_favorite_voting_started"
  | "crowd_favorite_voting_open"
>;

function normalizeCrowdFavoriteState(config: Partial<WildHacksConfig>): CrowdFavoriteState {
  const optInStarted = Boolean(config.crowd_favorite_opt_in_started);
  const optInOpen = optInStarted && Boolean(config.crowd_favorite_opt_in_open);
  const votingStarted = optInStarted && Boolean(config.crowd_favorite_voting_started);
  const votingOpen = votingStarted && Boolean(config.crowd_favorite_voting_open);

  return {
    crowd_favorite_opt_in_started: optInStarted,
    crowd_favorite_opt_in_open: optInOpen,
    crowd_favorite_voting_started: votingStarted,
    crowd_favorite_voting_open: votingOpen,
  };
}

async function getCrowdFavoriteStateConfig(): Promise<CrowdFavoriteState> {
  const config = await getConfig();
  return normalizeCrowdFavoriteState(config);
}

export const isCrowdFavoriteOptInOpen = async (config?: Partial<WildHacksConfig>): Promise<boolean> => {
  const stateConfig = config ? normalizeCrowdFavoriteState(config) : await getCrowdFavoriteStateConfig();
  return stateConfig.crowd_favorite_opt_in_open;
};

export const hasCrowdFavoriteOptInStarted = async (config?: Partial<WildHacksConfig>): Promise<boolean> => {
  const stateConfig = config ? normalizeCrowdFavoriteState(config) : await getCrowdFavoriteStateConfig();
  return stateConfig.crowd_favorite_opt_in_started;
};

export const isCrowdFavoriteVotingOpen = async (config?: Partial<WildHacksConfig>): Promise<boolean> => {
  const stateConfig = config ? normalizeCrowdFavoriteState(config) : await getCrowdFavoriteStateConfig();
  return stateConfig.crowd_favorite_voting_open;
};

export const hasCrowdFavoriteVotingStarted = async (config?: Partial<WildHacksConfig>): Promise<boolean> => {
  const stateConfig = config ? normalizeCrowdFavoriteState(config) : await getCrowdFavoriteStateConfig();
  return stateConfig.crowd_favorite_voting_started;
};

export const isCrowdFavoriteVotingClosed = async (config?: Partial<WildHacksConfig>): Promise<boolean> => {
  const stateConfig = config ? normalizeCrowdFavoriteState(config) : await getCrowdFavoriteStateConfig();
  return stateConfig.crowd_favorite_voting_started && !stateConfig.crowd_favorite_voting_open;
};

export const isCrowdFavoritePresentationPhase = async (config?: Partial<WildHacksConfig>): Promise<boolean> => {
  const stateConfig = config ? normalizeCrowdFavoriteState(config) : await getCrowdFavoriteStateConfig();
  return (
    stateConfig.crowd_favorite_opt_in_started &&
    !stateConfig.crowd_favorite_voting_started &&
    !stateConfig.crowd_favorite_opt_in_open &&
    !stateConfig.crowd_favorite_voting_open
  );
};
