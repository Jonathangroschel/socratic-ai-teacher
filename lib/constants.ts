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
export const REWARDS_DAILY_CAP = Number(process.env.REWARDS_DAILY_CAP ?? 100_000);

// Referrals feature flag and defaults
export const referralsEnabled = (() => {
  const raw = process.env.REFERRALS_ENABLED;
  if (!raw) return false;
  const normalized = raw.trim().toLowerCase();
  return ['true', '1', 'yes', 'on'].includes(normalized);
})();

export const REFERRAL_SIGNUP_ENABLED = (() => {
  const raw = process.env.REFERRAL_SIGNUP_ENABLED;
  if (!raw) return true; // default on when referrals enabled
  const normalized = raw.trim().toLowerCase();
  return ['true', '1', 'yes', 'on'].includes(normalized);
})();

export const REFERRAL_SIGNUP_BONUS_REFERRER = Number(
  process.env.REFERRAL_SIGNUP_BONUS_REFERRER ?? 50_000,
);

// Cap daily referral signup bonuses awarded to a single referrer (points)
export const REFERRALS_SIGNUP_DAILY_CAP_PER_REFERRER = Number(
  process.env.REFERRALS_SIGNUP_DAILY_CAP_PER_REFERRER ?? 300_000,
);

export const REFERRAL_CODE_LENGTH = Number(
  process.env.REFERRAL_CODE_LENGTH ?? 8,
);

export const REFERRAL_UTM_DEFAULTS = {
  source: process.env.REFERRAL_UTM_SOURCE_DEFAULT ?? 'referral',
  medium: process.env.REFERRAL_UTM_MEDIUM_DEFAULT ?? 'share',
  campaign: process.env.REFERRAL_UTM_CAMPAIGN_DEFAULT ?? 'invite',
} as const;

// Secret salt for hashing IPs (not reversible). Provide your own in production.
export const REFERRAL_IP_HASH_SECRET =
  process.env.REFERRAL_IP_HASH_SECRET || 'polymatic_ip_salt_dev';
