import type { InferSelectModel } from 'drizzle-orm';
import {
  pgTable,
  varchar,
  timestamp,
  json,
  jsonb,
  uuid,
  text,
  primaryKey,
  foreignKey,
  boolean,
  integer,
} from 'drizzle-orm/pg-core';
import type { LanguageModelV2Usage } from '@ai-sdk/provider';

export const user = pgTable('User', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  email: varchar('email', { length: 64 }).notNull(),
  password: varchar('password', { length: 64 }),
});

export type User = InferSelectModel<typeof user>;

export const chat = pgTable('Chat', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  createdAt: timestamp('createdAt').notNull(),
  title: text('title').notNull(),
  userId: uuid('userId')
    .notNull()
    .references(() => user.id),
  visibility: varchar('visibility', { enum: ['public', 'private'] })
    .notNull()
    .default('private'),
  lastContext: jsonb('lastContext').$type<LanguageModelV2Usage | null>(),
});

export type Chat = InferSelectModel<typeof chat>;

// DEPRECATED: The following schema is deprecated and will be removed in the future.
// Read the migration guide at https://chat-sdk.dev/docs/migration-guides/message-parts
export const messageDeprecated = pgTable('Message', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  chatId: uuid('chatId')
    .notNull()
    .references(() => chat.id),
  role: varchar('role').notNull(),
  content: json('content').notNull(),
  createdAt: timestamp('createdAt').notNull(),
});

export type MessageDeprecated = InferSelectModel<typeof messageDeprecated>;

export const message = pgTable('Message_v2', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  chatId: uuid('chatId')
    .notNull()
    .references(() => chat.id),
  role: varchar('role').notNull(),
  parts: json('parts').notNull(),
  attachments: json('attachments').notNull(),
  createdAt: timestamp('createdAt').notNull(),
});

export type DBMessage = InferSelectModel<typeof message>;

// DEPRECATED: The following schema is deprecated and will be removed in the future.
// Read the migration guide at https://chat-sdk.dev/docs/migration-guides/message-parts
export const voteDeprecated = pgTable(
  'Vote',
  {
    chatId: uuid('chatId')
      .notNull()
      .references(() => chat.id),
    messageId: uuid('messageId')
      .notNull()
      .references(() => messageDeprecated.id),
    isUpvoted: boolean('isUpvoted').notNull(),
  },
  (table) => {
    return {
      pk: primaryKey({ columns: [table.chatId, table.messageId] }),
    };
  },
);

export type VoteDeprecated = InferSelectModel<typeof voteDeprecated>;

export const vote = pgTable(
  'Vote_v2',
  {
    chatId: uuid('chatId')
      .notNull()
      .references(() => chat.id),
    messageId: uuid('messageId')
      .notNull()
      .references(() => message.id),
    isUpvoted: boolean('isUpvoted').notNull(),
  },
  (table) => {
    return {
      pk: primaryKey({ columns: [table.chatId, table.messageId] }),
    };
  },
);

export type Vote = InferSelectModel<typeof vote>;

export const document = pgTable(
  'Document',
  {
    id: uuid('id').notNull().defaultRandom(),
    createdAt: timestamp('createdAt').notNull(),
    title: text('title').notNull(),
    content: text('content'),
    kind: varchar('text', { enum: ['text', 'code', 'image', 'sheet'] })
      .notNull()
      .default('text'),
    userId: uuid('userId')
      .notNull()
      .references(() => user.id),
  },
  (table) => {
    return {
      pk: primaryKey({ columns: [table.id, table.createdAt] }),
    };
  },
);

export type Document = InferSelectModel<typeof document>;

export const suggestion = pgTable(
  'Suggestion',
  {
    id: uuid('id').notNull().defaultRandom(),
    documentId: uuid('documentId').notNull(),
    documentCreatedAt: timestamp('documentCreatedAt').notNull(),
    originalText: text('originalText').notNull(),
    suggestedText: text('suggestedText').notNull(),
    description: text('description'),
    isResolved: boolean('isResolved').notNull().default(false),
    userId: uuid('userId')
      .notNull()
      .references(() => user.id),
    createdAt: timestamp('createdAt').notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.id] }),
    documentRef: foreignKey({
      columns: [table.documentId, table.documentCreatedAt],
      foreignColumns: [document.id, document.createdAt],
    }),
  }),
);

export type Suggestion = InferSelectModel<typeof suggestion>;

export const stream = pgTable(
  'Stream',
  {
    id: uuid('id').notNull().defaultRandom(),
    chatId: uuid('chatId').notNull(),
    createdAt: timestamp('createdAt').notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.id] }),
    chatRef: foreignKey({
      columns: [table.chatId],
      foreignColumns: [chat.id],
    }),
  }),
);

export type Stream = InferSelectModel<typeof stream>;

// User profile stores onboarding preferences and lightweight learning config
export const userProfile = pgTable('UserProfile', {
  userId: uuid('userId')
    .primaryKey()
    .notNull()
    .references(() => user.id),
  onboardingCompleted: boolean('onboardingCompleted').notNull().default(false),
  interests: jsonb('interests'), // Array<{ category: string; topics: string[] }>
  goals: jsonb('goals'), // string[]
  timeBudgetMins: integer('timeBudgetMins').notNull().default(30),
  level: varchar('level').notNull().default('beginner'),
  createdAt: timestamp('createdAt').notNull(),
  updatedAt: timestamp('updatedAt').notNull(),
});

export type UserProfile = InferSelectModel<typeof userProfile>;

// Rewards: minimalist per-message transactions
export const rewardTransaction = pgTable('RewardTransaction', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  userId: uuid('userId').notNull().references(() => user.id),
  chatId: uuid('chatId').references(() => chat.id),
  messageId: uuid('messageId').references(() => message.id),
  amount: integer('amount').notNull(),
  rubric: jsonb('rubric'),
  reason: text('reason'),
  // referral fields
  kind: varchar('kind').notNull().default('learning'),
  referralAttributionId: uuid('referralAttributionId'),
  createdAt: timestamp('createdAt').notNull(),
});

export type RewardTransaction = InferSelectModel<typeof rewardTransaction>;

// User-linked wallets (for airdrops/payouts)
export const userWallet = pgTable('UserWallet', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  userId: uuid('userId').notNull().references(() => user.id),
  chain: varchar('chain', { enum: ['solana'] }).notNull().default('solana'),
  address: text('address').notNull(),
  label: text('label'),
  isPrimary: boolean('isPrimary').notNull().default(false),
  isVerified: boolean('isVerified').notNull().default(false),
  createdAt: timestamp('createdAt').notNull(),
  updatedAt: timestamp('updatedAt').notNull(),
  lastConnectedAt: timestamp('lastConnectedAt'),
});

export type UserWallet = InferSelectModel<typeof userWallet>;

// Ephemeral nonces for signature verification
export const walletVerificationNonce = pgTable('WalletVerificationNonce', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  userId: uuid('userId').notNull().references(() => user.id),
  address: text('address').notNull(),
  nonce: text('nonce').notNull(),
  expiresAt: timestamp('expiresAt').notNull(),
  createdAt: timestamp('createdAt').notNull(),
});

export type WalletVerificationNonce = InferSelectModel<typeof walletVerificationNonce>;

// =====================
// Referrals
// =====================

export const referralCode = pgTable('ReferralCode', {
  // One code per user; use userId as primary for simplicity
  userId: uuid('userId')
    .primaryKey()
    .notNull()
    .references(() => user.id),
  code: varchar('code', { length: 16 }).notNull(),
  createdAt: timestamp('createdAt').notNull(),
});

export type ReferralCode = InferSelectModel<typeof referralCode>;

export const referralAttribution = pgTable('ReferralAttribution', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  referrerUserId: uuid('referrerUserId')
    .notNull()
    .references(() => user.id),
  refereeUserId: uuid('refereeUserId')
    .notNull()
    .references(() => user.id),
  utmSource: varchar('utmSource', { length: 32 }),
  utmMedium: varchar('utmMedium', { length: 32 }),
  utmCampaign: varchar('utmCampaign', { length: 64 }),
  source: varchar('source', { length: 32 }),
  ipHash: varchar('ipHash', { length: 128 }),
  uaHash: varchar('uaHash', { length: 128 }),
  signupAwardedAt: timestamp('signupAwardedAt'),
  createdAt: timestamp('createdAt').notNull(),
});

export type ReferralAttribution = InferSelectModel<typeof referralAttribution>;
