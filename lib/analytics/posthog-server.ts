import 'server-only';

import { PostHog } from 'posthog-node';

let client: PostHog | null = null;

try {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    if (key) {
        client = new PostHog(key, {
            host: 'https://eu.i.posthog.com',
            fetch: globalThis.fetch.bind(globalThis) as any,
        });
    }
} catch (_) {
    client = null;
}

export const posthogServer = client;

export async function trackMessageSent({
    userId,
    userType,
    chatId,
    city,
    country,
    timeZone,
    firstMessageToday,
    messageCount24h,
    messageCount30d,
}: {
    userId: string;
    userType: 'guest' | 'regular';
    chatId: string;
    city?: string | null;
    country?: string | null;
    timeZone?: string | null;
    firstMessageToday: boolean;
    messageCount24h: number;
    messageCount30d: number;
}) {
    try {
        if (!posthogServer) return;
        await posthogServer.capture({
            distinctId: userId,
            event: 'message_sent',
            properties: {
                user_type: userType,
                chat_id: chatId,
                city: city ?? undefined,
                country: country ?? undefined,
                time_zone: timeZone ?? undefined,
                first_message_today: firstMessageToday,
                message_count_24h: messageCount24h,
                message_count_30d: messageCount30d,
            },
        });
    } catch (_) {
        // best-effort only
    }
}


// ==============
// Referral events (server-side stubs)
// ==============

export const REFERRAL_EVENTS = {
    code_created: 'referral_code_created',
    shared: 'referral_shared',
    link_copied: 'referral_link_copied',
    attributed: 'referral_attributed',
    signup_awarded: 'referral_signup_awarded',
} as const;

export async function trackReferralCodeCreated({ userId, code }: { userId: string; code: string }) {
    try {
        if (!posthogServer) return;
        await posthogServer.capture({
            distinctId: userId,
            event: REFERRAL_EVENTS.code_created,
            properties: { referral_code: code },
        });
    } catch (_) {}
}

export async function trackReferralAttributed({
    referrerUserId,
    refereeUserId,
    code,
    utmSource,
    utmMedium,
    utmCampaign,
}: {
    referrerUserId: string;
    refereeUserId: string;
    code?: string | null;
    utmSource?: string | null;
    utmMedium?: string | null;
    utmCampaign?: string | null;
}) {
    try {
        if (!posthogServer) return;
        await posthogServer.capture({
            distinctId: referrerUserId,
            event: REFERRAL_EVENTS.attributed,
            properties: {
                referee_user_id: refereeUserId,
                referral_code: code ?? undefined,
                utm_source: utmSource ?? undefined,
                utm_medium: utmMedium ?? undefined,
                utm_campaign: utmCampaign ?? undefined,
            },
        });
    } catch (_) {}
}

export async function trackReferralSignupAwarded({
    referrerUserId,
    refereeUserId,
    bonus,
}: {
    referrerUserId: string;
    refereeUserId: string;
    bonus: number;
}) {
    try {
        if (!posthogServer) return;
        await posthogServer.capture({
            distinctId: referrerUserId,
            event: REFERRAL_EVENTS.signup_awarded,
            properties: { referee_user_id: refereeUserId, bonus },
        });
    } catch (_) {}
}


