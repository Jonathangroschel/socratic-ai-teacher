import { auth } from '@/app/(auth)/auth';
import { ChatSDKError } from '@/lib/errors';
import {
    createReferralCode,
    getReferralCodeByCode,
    getTodayReferralSignupTotalByUserId,
    hasReferralSignupAwardForAttribution,
    markReferralSignupAwarded,
    saveRewardTransaction,
    upsertReferralAttribution,
} from '@/lib/db/queries';
import {
    REFERRALS_SIGNUP_DAILY_CAP_PER_REFERRER,
    REFERRAL_SIGNUP_BONUS_REFERRER,
    referralsEnabled,
    REFERRAL_IP_HASH_SECRET,
    REFERRAL_UTM_DEFAULTS,
} from '@/lib/constants';
import crypto from 'crypto';
import { trackReferralAttributed, trackReferralSignupAwarded } from '@/lib/analytics/posthog-server';

function sha256Hex(input: string) {
    return crypto.createHash('sha256').update(input).digest('hex');
}

export async function POST(request: Request) {
    if (!referralsEnabled) return Response.json({ awarded: false });
    const session = await auth();
    if (!session?.user) return new ChatSDKError('unauthorized:api').toResponse();

    try {
        // Read cookies forwarded by the platform (only way in route handler is headers cookie)
        const cookie = request.headers.get('cookie') || '';
        const getCookie = (name: string) =>
            cookie
                .split(';')
                .map((s) => s.trim())
                .find((c) => c.startsWith(name + '='))
                ?.split('=')[1];

        const ref = getCookie('poly_ref');
        if (!ref) return Response.json({ awarded: false });

        const codeRow = await getReferralCodeByCode({ code: decodeURIComponent(ref) });
        if (!codeRow) return Response.json({ awarded: false, reason: 'invalid_code' });

        const referrerUserId = codeRow.userId;
        const refereeUserId = session.user.id;
        if (referrerUserId === refereeUserId) return Response.json({ awarded: false, reason: 'self' });

        // Simple bot/user agent denylist
        const ua = (request.headers.get('user-agent') || '').toLowerCase();
        if (/(bot|crawler|spider)/.test(ua)) return Response.json({ awarded: false, reason: 'bot' });

        // Hash signals
        const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '0.0.0.0';
        const ipHash = sha256Hex(ip + '|' + REFERRAL_IP_HASH_SECRET);
        const uaHash = sha256Hex(ua);

        const utmSource = decodeURIComponent(getCookie('poly_utm_source') || REFERRAL_UTM_DEFAULTS.source);
        const utmMedium = decodeURIComponent(getCookie('poly_utm_medium') || REFERRAL_UTM_DEFAULTS.medium);
        const utmCampaign = decodeURIComponent(getCookie('poly_utm_campaign') || REFERRAL_UTM_DEFAULTS.campaign);

        // Upsert attribution (idempotent by referee id)
        const attribution = await upsertReferralAttribution({
            referrerUserId,
            refereeUserId,
            utmSource,
            utmMedium,
            utmCampaign,
            source: 'cookie',
            ipHash,
            uaHash,
        });
        // Best-effort analytics
        trackReferralAttributed({ referrerUserId, refereeUserId, code: codeRow.code, utmSource, utmMedium, utmCampaign }).catch(() => { });

        // Idempotency: if already awarded, short-circuit
        const already = await hasReferralSignupAwardForAttribution({ referralAttributionId: attribution.id });
        if (already) return Response.json({ awarded: false });

        // Cap per referrer per day
        const today = await getTodayReferralSignupTotalByUserId(referrerUserId);
        if (today + REFERRAL_SIGNUP_BONUS_REFERRER > REFERRALS_SIGNUP_DAILY_CAP_PER_REFERRER) {
            return Response.json({ awarded: false, reason: 'daily_cap' });
        }

        // Create reward transaction and mark attribution awarded
        await saveRewardTransaction({
            userId: referrerUserId,
            amount: REFERRAL_SIGNUP_BONUS_REFERRER,
            reason: `Referral signup bonus for ${refereeUserId}`,
            kind: 'referral_signup_referrer_bonus',
            referralAttributionId: attribution.id,
        });
        await markReferralSignupAwarded({ id: attribution.id });
        trackReferralSignupAwarded({ referrerUserId, refereeUserId, bonus: REFERRAL_SIGNUP_BONUS_REFERRER }).catch(() => { });

        // Clear cookie by setting it expired in response headers
        const headers = new Headers();
        headers.append('Set-Cookie', 'poly_ref=; Max-Age=0; Path=/');
        headers.append('Set-Cookie', 'poly_utm_source=; Max-Age=0; Path=/');
        headers.append('Set-Cookie', 'poly_utm_medium=; Max-Age=0; Path=/');
        headers.append('Set-Cookie', 'poly_utm_campaign=; Max-Age=0; Path=/');

        return new Response(JSON.stringify({ awarded: true, delta: REFERRAL_SIGNUP_BONUS_REFERRER }), {
            headers,
            status: 200,
        });
    } catch (e) {
        return new ChatSDKError('bad_request:api').toResponse();
    }
}


