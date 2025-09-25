import 'server-only';

import {
  and,
  asc,
  count,
  desc,
  eq,
  or,
  gt,
  gte,
  lte,
  inArray,
  lt,
  type SQL,
} from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import {
  user,
  chat,
  type User,
  document,
  type Suggestion,
  suggestion,
  message,
  vote,
  type DBMessage,
  type Chat,
  stream,
  userProfile,
  type UserProfile,
  rewardTransaction,
  type RewardTransaction,
  userWallet,
  type UserWallet,
  walletVerificationNonce,
  referralCode,
  type ReferralCode,
  referralAttribution,
  type ReferralAttribution,
} from './schema';
import { generateUUID } from '../utils';
import { generateHashedPassword } from './utils';
import type { VisibilityType } from '@/components/visibility-selector';
import { ChatSDKError } from '../errors';
import { LanguageModelV2Usage } from '@ai-sdk/provider';
import bs58 from 'bs58';
import nacl from 'tweetnacl';
import { PublicKey } from '@solana/web3.js';

// Optionally, if not using email/pass login, you can
// use the Drizzle adapter for Auth.js / NextAuth
// https://authjs.dev/reference/adapter/drizzle

// biome-ignore lint: Forbidden non-null assertion.
const client = postgres(process.env.POSTGRES_URL!);
const db = drizzle(client);

export async function getUser(email: string): Promise<Array<User>> {
  try {
    return await db.select().from(user).where(eq(user.email, email));
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get user by email',
    );
  }
}

export async function createUser(email: string, password: string) {
  const hashedPassword = generateHashedPassword(password);

  try {
    return await db.insert(user).values({ email, password: hashedPassword });
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to create user');
  }
}

export async function createGuestUser() {
  const email = `guest-${Date.now()}`;
  const password = generateHashedPassword(generateUUID());

  try {
    return await db.insert(user).values({ email, password }).returning({
      id: user.id,
      email: user.email,
    });
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to create guest user',
    );
  }
}

export async function saveChat({
  id,
  userId,
  title,
  visibility,
}: {
  id: string;
  userId: string;
  title: string;
  visibility: VisibilityType;
}) {
  try {
    return await db.insert(chat).values({
      id,
      createdAt: new Date(),
      userId,
      title,
      visibility,
    });
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to save chat');
  }
}

export async function deleteChatById({ id }: { id: string }) {
  try {
    await db.delete(vote).where(eq(vote.chatId, id));
    await db.delete(message).where(eq(message.chatId, id));
    await db.delete(stream).where(eq(stream.chatId, id));

    const [chatsDeleted] = await db
      .delete(chat)
      .where(eq(chat.id, id))
      .returning();
    return chatsDeleted;
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to delete chat by id',
    );
  }
}

export async function saveRewardTransaction(tx: {
  userId: string;
  chatId?: string | null;
  messageId?: string | null;
  amount: number;
  rubric?: Record<string, unknown> | null;
  reason?: string | null;
  kind?: string | null;
  referralAttributionId?: string | null;
}) {
  try {
    const [row] = await db
      .insert(rewardTransaction)
      .values({
        id: generateUUID(),
        userId: tx.userId,
        chatId: tx.chatId ?? null,
        messageId: tx.messageId ?? null,
        amount: tx.amount,
        rubric: tx.rubric ?? null,
        reason: tx.reason ?? null,
        kind: tx.kind ?? 'learning',
        referralAttributionId: tx.referralAttributionId ?? null,
        createdAt: new Date(),
      })
      .returning();
    return row as RewardTransaction;
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to save reward');
  }
}

export async function getTodayRewardTotalByUserId(userId: string) {
  try {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);

    const rows = await db
      .select({ amount: rewardTransaction.amount })
      .from(rewardTransaction)
      .where(
        and(
          eq(rewardTransaction.userId, userId),
          gte(rewardTransaction.createdAt, start),
          lte(rewardTransaction.createdAt, end),
        ),
      );

    return rows.reduce((sum, r) => sum + (r.amount ?? 0), 0);
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to get rewards');
  }
}

/** Referral-specific: today's awarded referral signup bonus total for a referrer */
export async function getTodayReferralSignupTotalByUserId(userId: string) {
  try {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);

    const rows = await db
      .select({ amount: rewardTransaction.amount })
      .from(rewardTransaction)
      .where(
        and(
          eq(rewardTransaction.userId, userId),
          eq(rewardTransaction.kind, 'referral_signup_referrer_bonus'),
          gte(rewardTransaction.createdAt, start),
          lte(rewardTransaction.createdAt, end),
        ),
      );

    return rows.reduce((sum, r) => sum + (r.amount ?? 0), 0);
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to get referral signup rewards');
  }
}

// =====================
// Referrals
// =====================

export async function getReferralCodeByUserId({ userId }: { userId: string }): Promise<ReferralCode | null> {
  try {
    const [row] = await db.select().from(referralCode).where(eq(referralCode.userId, userId)).limit(1);
    return (row as ReferralCode) ?? null;
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to get referral code');
  }
}

export async function getReferralCodeByCode({ code }: { code: string }): Promise<ReferralCode | null> {
  try {
    const [row] = await db.select().from(referralCode).where(eq(referralCode.code, code)).limit(1);
    return (row as ReferralCode) ?? null;
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to resolve referral code');
  }
}

export async function createReferralCode({ userId, code }: { userId: string; code: string }): Promise<void> {
  try {
    await db.insert(referralCode).values({ userId, code, createdAt: new Date() });
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to create referral code');
  }
}

export async function upsertReferralAttribution({
  referrerUserId,
  refereeUserId,
  utmSource,
  utmMedium,
  utmCampaign,
  source,
  ipHash,
  uaHash,
}: {
  referrerUserId: string;
  refereeUserId: string;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  source?: string | null;
  ipHash?: string | null;
  uaHash?: string | null;
}): Promise<ReferralAttribution> {
  try {
    // One referrer per referee enforced by unique constraint we expect at DB level; emulate here
    const existing = await db
      .select()
      .from(referralAttribution)
      .where(eq(referralAttribution.refereeUserId, refereeUserId))
      .limit(1);

    if (existing.length) return existing[0] as ReferralAttribution;

    const [row] = await db
      .insert(referralAttribution)
      .values({
        id: generateUUID(),
        referrerUserId,
        refereeUserId,
        utmSource: utmSource ?? null,
        utmMedium: utmMedium ?? null,
        utmCampaign: utmCampaign ?? null,
        source: source ?? 'cookie',
        ipHash: ipHash ?? null,
        uaHash: uaHash ?? null,
        createdAt: new Date(),
      })
      .returning();
    return row as ReferralAttribution;
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to upsert referral attribution');
  }
}

export async function markReferralSignupAwarded({ id }: { id: string }): Promise<void> {
  try {
    await db.update(referralAttribution).set({ signupAwardedAt: new Date() }).where(eq(referralAttribution.id, id));
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to update referral attribution');
  }
}

export async function getReferralSummaryByUserId({ userId }: { userId: string }) {
  try {
    const awardedRows = await db
      .select({ id: referralAttribution.id })
      .from(referralAttribution)
      .where(and(eq(referralAttribution.referrerUserId, userId), gt(referralAttribution.signupAwardedAt, new Date(0))))
      .execute();

    const signupsAwarded = awardedRows.length;

    const txRows = await db
      .select({ amount: rewardTransaction.amount })
      .from(rewardTransaction)
      .where(and(eq(rewardTransaction.userId, userId), eq(rewardTransaction.kind, 'referral_signup_referrer_bonus')));
    const totalReferralPoints = txRows.reduce((sum, r) => sum + (r.amount ?? 0), 0);

    return { signupsAwarded, totalReferralPoints };
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to get referral summary');
  }
}

export async function hasRewardReasonByUserId({ userId, reason }: { userId: string; reason: string }) {
  try {
    const rows = await db
      .select({ id: rewardTransaction.id })
      .from(rewardTransaction)
      .where(and(eq(rewardTransaction.userId, userId), eq(rewardTransaction.reason, reason)))
      .limit(1);
    return rows.length > 0;
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to check reward by reason');
  }
}

/**
 * Rewards summary helpers
 */
export async function getLifetimeRewardTotalByUserId(userId: string) {
  try {
    const rows = await db
      .select({ amount: rewardTransaction.amount })
      .from(rewardTransaction)
      .where(eq(rewardTransaction.userId, userId));

    return rows.reduce((sum, r) => sum + (r.amount ?? 0), 0);
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to get lifetime rewards');
  }
}

export async function getRewardsInRangeByUserId({
  userId,
  start,
  end,
}: {
  userId: string;
  start: Date;
  end: Date;
}) {
  try {
    const rows = await db
      .select({ amount: rewardTransaction.amount, createdAt: rewardTransaction.createdAt })
      .from(rewardTransaction)
      .where(
        and(
          eq(rewardTransaction.userId, userId),
          gte(rewardTransaction.createdAt, start),
          lte(rewardTransaction.createdAt, end),
        ),
      )
      .orderBy(desc(rewardTransaction.createdAt));

    const total = rows.reduce((sum, r) => sum + (r.amount ?? 0), 0);

    const byDay = new Map<string, number>();
    for (const r of rows) {
      const d = new Date(r.createdAt);
      const key = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
        .toISOString()
        .slice(0, 10);
      byDay.set(key, (byDay.get(key) ?? 0) + (r.amount ?? 0));
    }

    return { total, byDay };
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to get rewards range');
  }
}

// Raw rows in range (amount, createdAt) for timezone-aware bucketing on the server
export async function getRewardRowsInRangeByUserId({
  userId,
  start,
  end,
}: {
  userId: string;
  start: Date;
  end: Date;
}) {
  try {
    const rows = await db
      .select({ amount: rewardTransaction.amount, createdAt: rewardTransaction.createdAt })
      .from(rewardTransaction)
      .where(
        and(
          eq(rewardTransaction.userId, userId),
          gte(rewardTransaction.createdAt, start),
          lte(rewardTransaction.createdAt, end),
        ),
      )
      .orderBy(asc(rewardTransaction.createdAt));
    return rows;
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to get rewards range rows');
  }
}

export async function getRewardsSeriesLastNDaysByUserId({
  userId,
  days,
}: {
  userId: string;
  days: number;
}) {
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  const start = new Date(end);
  start.setDate(end.getDate() - (days - 1));
  start.setHours(0, 0, 0, 0);

  const { byDay } = await getRewardsInRangeByUserId({ userId, start, end });

  const series: Array<{ date: string; total: number }> = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    series.push({ date: key, total: byDay.get(key) ?? 0 });
  }
  return series;
}

export async function hasReferralSignupAwardForAttribution({
  referralAttributionId,
}: {
  referralAttributionId: string;
}): Promise<boolean> {
  try {
    const rows = await db
      .select({ id: rewardTransaction.id })
      .from(rewardTransaction)
      .where(
        and(
          eq(rewardTransaction.referralAttributionId, referralAttributionId as any),
          eq(rewardTransaction.kind, 'referral_signup_referrer_bonus'),
        ),
      )
      .limit(1);
    return rows.length > 0;
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to check referral award');
  }
}

export async function getRewardsSummaryByUserId({
  userId,
  days,
}: {
  userId: string;
  days: number;
}) {
  const [today, lifetime, series] = await Promise.all([
    getTodayRewardTotalByUserId(userId),
    getLifetimeRewardTotalByUserId(userId),
    getRewardsSeriesLastNDaysByUserId({ userId, days }),
  ]);

  const month = series.reduce((sum, p) => sum + p.total, 0);
  return { today, lifetime, month, series };
}

export async function getRewardTransactionsPageByUserId({
  userId,
  limit,
  cursor,
}: {
  userId: string;
  limit: number;
  cursor: { createdAt: Date; id: string } | null;
}) {
  try {
    const extendedLimit = limit + 1;

    const whereBase = eq(rewardTransaction.userId, userId);

    const rows = await db
      .select({
        id: rewardTransaction.id,
        createdAt: rewardTransaction.createdAt,
        amount: rewardTransaction.amount,
        reason: rewardTransaction.reason,
      })
      .from(rewardTransaction)
      .where(
        cursor
          ? and(
            whereBase,
            or(
              lt(rewardTransaction.createdAt, cursor.createdAt),
              and(
                eq(rewardTransaction.createdAt, cursor.createdAt),
                lt(rewardTransaction.id, cursor.id),
              ),
            ),
          )
          : whereBase,
      )
      .orderBy(desc(rewardTransaction.createdAt), desc(rewardTransaction.id))
      .limit(extendedLimit);

    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;
    const last = items.at(-1) ?? null;
    const nextCursor = last
      ? `${last.createdAt.toISOString()}|${last.id}`
      : null;

    return { items, nextCursor };
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to get reward transactions');
  }
}

export async function getChatsByUserId({
  id,
  limit,
  startingAfter,
  endingBefore,
}: {
  id: string;
  limit: number;
  startingAfter: string | null;
  endingBefore: string | null;
}) {
  try {
    const extendedLimit = limit + 1;

    const query = (whereCondition?: SQL<any>) =>
      db
        .select()
        .from(chat)
        .where(
          whereCondition
            ? and(whereCondition, eq(chat.userId, id))
            : eq(chat.userId, id),
        )
        .orderBy(desc(chat.createdAt))
        .limit(extendedLimit);

    let filteredChats: Array<Chat> = [];

    if (startingAfter) {
      const [selectedChat] = await db
        .select()
        .from(chat)
        .where(eq(chat.id, startingAfter))
        .limit(1);

      if (!selectedChat) {
        throw new ChatSDKError(
          'not_found:database',
          `Chat with id ${startingAfter} not found`,
        );
      }

      filteredChats = await query(gt(chat.createdAt, selectedChat.createdAt));
    } else if (endingBefore) {
      const [selectedChat] = await db
        .select()
        .from(chat)
        .where(eq(chat.id, endingBefore))
        .limit(1);

      if (!selectedChat) {
        throw new ChatSDKError(
          'not_found:database',
          `Chat with id ${endingBefore} not found`,
        );
      }

      filteredChats = await query(lt(chat.createdAt, selectedChat.createdAt));
    } else {
      filteredChats = await query();
    }

    const hasMore = filteredChats.length > limit;

    return {
      chats: hasMore ? filteredChats.slice(0, limit) : filteredChats,
      hasMore,
    };
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get chats by user id',
    );
  }
}

export async function getChatById({ id }: { id: string }) {
  try {
    const [selectedChat] = await db.select().from(chat).where(eq(chat.id, id));
    if (!selectedChat) {
      return null;
    }

    return selectedChat;
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to get chat by id');
  }
}

export async function saveMessages({
  messages,
}: {
  messages: Array<DBMessage>;
}) {
  try {
    return await db.insert(message).values(messages);
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to save messages');
  }
}

export async function getMessagesByChatId({ id }: { id: string }) {
  try {
    return await db
      .select()
      .from(message)
      .where(eq(message.chatId, id))
      .orderBy(asc(message.createdAt));
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get messages by chat id',
    );
  }
}

export async function voteMessage({
  chatId,
  messageId,
  type,
}: {
  chatId: string;
  messageId: string;
  type: 'up' | 'down';
}) {
  try {
    const [existingVote] = await db
      .select()
      .from(vote)
      .where(and(eq(vote.messageId, messageId)));

    if (existingVote) {
      return await db
        .update(vote)
        .set({ isUpvoted: type === 'up' })
        .where(and(eq(vote.messageId, messageId), eq(vote.chatId, chatId)));
    }
    return await db.insert(vote).values({
      chatId,
      messageId,
      isUpvoted: type === 'up',
    });
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to vote message');
  }
}

export async function getVotesByChatId({ id }: { id: string }) {
  try {
    return await db.select().from(vote).where(eq(vote.chatId, id));
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get votes by chat id',
    );
  }
}

export async function saveDocument({
  id,
  title,
  kind,
  content,
  userId,
}: {
  id: string;
  title: string;
  kind: 'text' | 'code' | 'image' | 'sheet';
  content: string;
  userId: string;
}) {
  try {
    return await db
      .insert(document)
      .values({
        id,
        title,
        kind,
        content,
        userId,
        createdAt: new Date(),
      })
      .returning();
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to save document');
  }
}

export async function getDocumentsById({ id }: { id: string }) {
  try {
    const documents = await db
      .select()
      .from(document)
      .where(eq(document.id, id))
      .orderBy(asc(document.createdAt));

    return documents;
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get documents by id',
    );
  }
}

export async function getDocumentById({ id }: { id: string }) {
  try {
    const [selectedDocument] = await db
      .select()
      .from(document)
      .where(eq(document.id, id))
      .orderBy(desc(document.createdAt));

    return selectedDocument;
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get document by id',
    );
  }
}

export async function deleteDocumentsByIdAfterTimestamp({
  id,
  timestamp,
}: {
  id: string;
  timestamp: Date;
}) {
  try {
    await db
      .delete(suggestion)
      .where(
        and(
          eq(suggestion.documentId, id),
          gt(suggestion.documentCreatedAt, timestamp),
        ),
      );

    return await db
      .delete(document)
      .where(and(eq(document.id, id), gt(document.createdAt, timestamp)))
      .returning();
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to delete documents by id after timestamp',
    );
  }
}

export async function saveSuggestions({
  suggestions,
}: {
  suggestions: Array<Suggestion>;
}) {
  try {
    return await db.insert(suggestion).values(suggestions);
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to save suggestions',
    );
  }
}

export async function getSuggestionsByDocumentId({
  documentId,
}: {
  documentId: string;
}) {
  try {
    return await db
      .select()
      .from(suggestion)
      .where(and(eq(suggestion.documentId, documentId)));
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get suggestions by document id',
    );
  }
}

export async function getMessageById({ id }: { id: string }) {
  try {
    return await db.select().from(message).where(eq(message.id, id));
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get message by id',
    );
  }
}

export async function deleteMessagesByChatIdAfterTimestamp({
  chatId,
  timestamp,
}: {
  chatId: string;
  timestamp: Date;
}) {
  try {
    const messagesToDelete = await db
      .select({ id: message.id })
      .from(message)
      .where(
        and(eq(message.chatId, chatId), gte(message.createdAt, timestamp)),
      );

    const messageIds = messagesToDelete.map((message) => message.id);

    if (messageIds.length > 0) {
      await db
        .delete(vote)
        .where(
          and(eq(vote.chatId, chatId), inArray(vote.messageId, messageIds)),
        );

      return await db
        .delete(message)
        .where(
          and(eq(message.chatId, chatId), inArray(message.id, messageIds)),
        );
    }
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to delete messages by chat id after timestamp',
    );
  }
}

export async function updateChatVisiblityById({
  chatId,
  visibility,
}: {
  chatId: string;
  visibility: 'private' | 'public';
}) {
  try {
    return await db.update(chat).set({ visibility }).where(eq(chat.id, chatId));
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to update chat visibility by id',
    );
  }
}

export async function updateChatLastContextById({
  chatId,
  context,
}: {
  chatId: string;
  // Store raw LanguageModelUsage to keep it simple
  context: LanguageModelV2Usage;
}) {
  try {
    return await db
      .update(chat)
      .set({ lastContext: context })
      .where(eq(chat.id, chatId));
  } catch (error) {
    console.warn('Failed to update lastContext for chat', chatId, error);
    return;
  }
}

export async function getMessageCountByUserId({
  id,
  differenceInHours,
}: {
  id: string;
  differenceInHours: number;
}) {
  try {
    const twentyFourHoursAgo = new Date(
      Date.now() - differenceInHours * 60 * 60 * 1000,
    );

    const [stats] = await db
      .select({ count: count(message.id) })
      .from(message)
      .innerJoin(chat, eq(message.chatId, chat.id))
      .where(
        and(
          eq(chat.userId, id),
          gte(message.createdAt, twentyFourHoursAgo),
          eq(message.role, 'user'),
        ),
      )
      .execute();

    return stats?.count ?? 0;
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get message count by user id',
    );
  }
}

export async function createStreamId({
  streamId,
  chatId,
}: {
  streamId: string;
  chatId: string;
}) {
  try {
    await db
      .insert(stream)
      .values({ id: streamId, chatId, createdAt: new Date() });
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to create stream id',
    );
  }
}

export async function getStreamIdsByChatId({ chatId }: { chatId: string }) {
  try {
    const streamIds = await db
      .select({ id: stream.id })
      .from(stream)
      .where(eq(stream.chatId, chatId))
      .orderBy(asc(stream.createdAt))
      .execute();

    return streamIds.map(({ id }) => id);
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get stream ids by chat id',
    );
  }
}

export async function getUserProfileByUserId({
  userId,
}: {
  userId: string;
}): Promise<UserProfile | null> {
  try {
    const [profile] = await db
      .select()
      .from(userProfile)
      .where(eq(userProfile.userId, userId))
      .limit(1);

    return profile ?? null;
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get user profile by user id',
    );
  }
}

export async function upsertUserProfile({
  userId,
  interests,
  goals,
  timeBudgetMins,
  level,
  onboardingCompleted,
}: {
  userId: string;
  interests?: unknown;
  goals?: unknown;
  timeBudgetMins?: number;
  level?: string;
  onboardingCompleted?: boolean;
}): Promise<void> {
  try {
    const now = new Date();
    const [existing] = await db
      .select({ userId: userProfile.userId })
      .from(userProfile)
      .where(eq(userProfile.userId, userId));

    if (existing) {
      await db
        .update(userProfile)
        .set({
          interests: interests as any,
          goals: goals as any,
          timeBudgetMins: timeBudgetMins ?? 30,
          level: level ?? 'beginner',
          onboardingCompleted: onboardingCompleted ?? false,
          updatedAt: now,
        })
        .where(eq(userProfile.userId, userId));
    } else {
      await db.insert(userProfile).values({
        userId,
        interests: interests as any,
        goals: goals as any,
        timeBudgetMins: timeBudgetMins ?? 30,
        level: level ?? 'beginner',
        onboardingCompleted: onboardingCompleted ?? false,
        createdAt: now,
        updatedAt: now,
      });
    }
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to upsert user profile',
    );
  }
}

/**
 * Transfer profile data from one user id to another.
 * Useful when converting a guest account to a registered account.
 */
export async function transferUserProfileByUserId({
  fromUserId,
  toUserId,
}: {
  fromUserId: string;
  toUserId: string;
}): Promise<void> {
  try {
    if (fromUserId === toUserId) return;

    const [sourceProfile] = await db
      .select()
      .from(userProfile)
      .where(eq(userProfile.userId, fromUserId))
      .limit(1);

    if (!sourceProfile) {
      return;
    }

    await upsertUserProfile({
      userId: toUserId,
      interests: sourceProfile.interests,
      goals: sourceProfile.goals,
      timeBudgetMins: sourceProfile.timeBudgetMins,
      level: sourceProfile.level,
      onboardingCompleted: true,
    });
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to transfer user profile by id',
    );
  }
}

/**
 * Transfer chats, documents, and suggestions from one user id to another.
 */
export async function transferUserContentByUserId({
  fromUserId,
  toUserId,
}: {
  fromUserId: string;
  toUserId: string;
}): Promise<void> {
  try {
    if (fromUserId === toUserId) return;

    // Move chats ownership
    await db.update(chat).set({ userId: toUserId }).where(eq(chat.userId, fromUserId));

    // Move documents ownership
    await db
      .update(document)
      .set({ userId: toUserId })
      .where(eq(document.userId, fromUserId));

    // Move suggestions ownership
    await db
      .update(suggestion)
      .set({ userId: toUserId })
      .where(eq(suggestion.userId, fromUserId));
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to transfer user content by id',
    );
  }
}

/**
 * Transfer reward transactions from one user id to another.
 * Used when converting a guest account to a registered account.
 */
export async function transferRewardsByUserId({
  fromUserId,
  toUserId,
}: {
  fromUserId: string;
  toUserId: string;
}): Promise<void> {
  try {
    if (fromUserId === toUserId) return;

    await db
      .update(rewardTransaction)
      .set({ userId: toUserId })
      .where(eq(rewardTransaction.userId, fromUserId));
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to transfer rewards by user id',
    );
  }
}

// =====================
// Wallet helpers
// =====================

export async function getUserWallets({ userId }: { userId: string }) {
  try {
    const rows = await db
      .select()
      .from(userWallet)
      .where(eq(userWallet.userId, userId))
      .orderBy(desc(userWallet.isPrimary), desc(userWallet.createdAt));
    return rows as Array<UserWallet>;
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to get user wallets');
  }
}

export async function upsertUserWallet({
  userId,
  chain,
  address,
  label,
  isVerified,
  makePrimary,
  lastConnectedAt,
}: {
  userId: string;
  chain: 'solana';
  address: string;
  label?: string | null;
  isVerified?: boolean;
  makePrimary?: boolean;
  lastConnectedAt?: Date | null;
}) {
  try {
    const now = new Date();
    // Ensure only one primary per user
    if (makePrimary) {
      await db.update(userWallet).set({ isPrimary: false }).where(eq(userWallet.userId, userId));
    }

    // Try update first
    const updated = await db
      .update(userWallet)
      .set({
        label: label ?? null,
        isVerified: isVerified ?? false,
        isPrimary: Boolean(makePrimary),
        updatedAt: now,
        lastConnectedAt: lastConnectedAt ?? null,
      })
      .where(and(eq(userWallet.userId, userId), eq(userWallet.chain, 'solana'), eq(userWallet.address, address)));

    if ((updated as any).rowCount && (updated as any).rowCount > 0) return;

    // Else insert
    await db.insert(userWallet).values({
      id: generateUUID(),
      userId,
      chain: 'solana',
      address,
      label: label ?? null,
      isVerified: isVerified ?? false,
      isPrimary: Boolean(makePrimary),
      createdAt: now,
      updatedAt: now,
      lastConnectedAt: lastConnectedAt ?? null,
    });
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to upsert user wallet');
  }
}

export async function setPrimaryWallet({ userId, id }: { userId: string; id: string }) {
  try {
    await db.update(userWallet).set({ isPrimary: false }).where(eq(userWallet.userId, userId));
    await db.update(userWallet).set({ isPrimary: true, updatedAt: new Date() }).where(and(eq(userWallet.userId, userId), eq(userWallet.id, id)));
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to set primary wallet');
  }
}

export async function deleteWallet({ userId, id }: { userId: string; id: string }) {
  try {
    await db.delete(userWallet).where(and(eq(userWallet.userId, userId), eq(userWallet.id, id)));
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to delete wallet');
  }
}

export async function startWalletVerification({ userId, address }: { userId: string; address: string }) {
  try {
    const nonce = `Polymatic: Verify wallet ownership. Address=${address}. Nonce=${generateUUID()}. Expires in 5 minutes.`;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 5 * 60 * 1000);

    // Upsert: ensure a single active nonce per user+address
    // Delete existing and insert new (portable approach across Postgres variants)
    await db
      .delete(walletVerificationNonce)
      .where(and(eq(walletVerificationNonce.userId, userId), eq(walletVerificationNonce.address, address)));

    await db.insert(walletVerificationNonce).values({
      id: generateUUID(),
      userId,
      address,
      nonce,
      createdAt: now,
      expiresAt,
    });

    return { nonce, expiresAt };
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to start wallet verification');
  }
}

export async function verifyWalletSignature({
  userId,
  address,
  signatureBase58,
}: {
  userId: string;
  address: string;
  signatureBase58: string;
}) {
  try {
    // Load latest valid nonce for this user+address
    const [row] = await db
      .select()
      .from(walletVerificationNonce)
      .where(and(eq(walletVerificationNonce.userId, userId), eq(walletVerificationNonce.address, address)))
      .orderBy(desc(walletVerificationNonce.createdAt))
      .limit(1);

    if (!row) throw new ChatSDKError('bad_request:api', 'No nonce found for verification');
    if (new Date(row.expiresAt).getTime() < Date.now()) throw new ChatSDKError('bad_request:api', 'Nonce expired');

    // Verify signature
    const message = new TextEncoder().encode(row.nonce);
    const signature = bs58.decode(signatureBase58);
    const pubkey = new PublicKey(address);
    const ok = nacl.sign.detached.verify(message, signature, pubkey.toBytes());
    if (!ok) throw new ChatSDKError('bad_request:api', 'Invalid signature');

    // Upsert wallet as verified; mark primary if none
    const existing = await getUserWallets({ userId });
    // Make the verified address primary to reflect the latest user choice
    const makePrimary = true;
    await upsertUserWallet({ userId, chain: 'solana', address, isVerified: true, makePrimary, lastConnectedAt: new Date() });

    // Invalidate nonce after successful verification
    await db
      .delete(walletVerificationNonce)
      .where(and(eq(walletVerificationNonce.userId, userId), eq(walletVerificationNonce.address, address)));

    return { ok: true };
  } catch (error) {
    if (error instanceof ChatSDKError) throw error;
    throw new ChatSDKError('bad_request:api', 'Failed to verify wallet signature');
  }
}

export async function transferUserWalletsByUserId({ fromUserId, toUserId }: { fromUserId: string; toUserId: string }): Promise<void> {
  try {
    if (fromUserId === toUserId) return;
    await db.update(userWallet).set({ userId: toUserId }).where(eq(userWallet.userId, fromUserId));
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to transfer user wallets by id');
  }
}

/**
 * Transfer profile data from a guest user to a regular user
 * Used when a guest user creates a regular account
 */
export async function transferGuestProfileToUser({
  guestEmail,
  newUserId,
}: {
  guestEmail: string;
  newUserId: string;
}): Promise<void> {
  try {
    // Find the guest user
    const guestUsers = await db.select().from(user).where(eq(user.email, guestEmail));

    if (guestUsers.length === 0) {
      console.log('No guest user found with email:', guestEmail);
      return;
    }

    const guestUser = guestUsers[0];

    // Find the guest profile
    const guestProfile = await getUserProfileByUserId({ userId: guestUser.id });

    if (!guestProfile) {
      console.log('No profile found for guest user:', guestUser.id);
      return;
    }

    console.log('Found guest profile, transferring to new user:', newUserId);

    // Transfer the profile data to the new user
    await upsertUserProfile({
      userId: newUserId,
      interests: guestProfile.interests,
      goals: guestProfile.goals,
      timeBudgetMins: guestProfile.timeBudgetMins,
      level: guestProfile.level,
      onboardingCompleted: true, // Ensure onboarding is marked as completed
    });

    console.log('Profile data transferred successfully');
  } catch (error) {
    console.error('Failed to transfer guest profile:', error);
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to transfer guest profile data',
    );
  }
}
