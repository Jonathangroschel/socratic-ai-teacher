import { generateDummyPassword } from './db/utils';

export const isProductionEnvironment = process.env.NODE_ENV === 'production';
export const isDevelopmentEnvironment = process.env.NODE_ENV === 'development';
export const isTestEnvironment = Boolean(
  process.env.PLAYWRIGHT_TEST_BASE_URL ||
    process.env.PLAYWRIGHT ||
    process.env.CI_PLAYWRIGHT,
);

export const guestRegex = /^guest-\d+$/;

export const DUMMY_PASSWORD = generateDummyPassword();

// Rewards feature flag and defaults
export const rewardsEnabled = (() => {
  const raw = process.env.REWARDS_ENABLED;
  if (!raw) return false;
  const normalized = raw.trim().toLowerCase();
  return ['true', '1', 'yes', 'on'].includes(normalized);
})();
export const REWARD_MIN = 100;
export const REWARD_MAX = 10_000;
export const REWARDS_DAILY_CAP = Number(process.env.REWARDS_DAILY_CAP ?? 50_000);
