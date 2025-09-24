import { auth } from '@/app/(auth)/auth';
import { ChatSDKError } from '@/lib/errors';
import { createReferralCode, getReferralCodeByUserId } from '@/lib/db/queries';
import { trackReferralCodeCreated } from '@/lib/analytics/posthog-server';
import { REFERRAL_CODE_LENGTH, REFERRAL_UTM_DEFAULTS } from '@/lib/constants';

function randomCode(length: number): string {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no confusing chars
    let out = '';
    const bytes = new Uint8Array(length);
    crypto.getRandomValues(bytes);
    for (let i = 0; i < length; i++) out += alphabet[bytes[i] % alphabet.length];
    return out.toLowerCase();
}

export async function POST(request: Request) {
    const session = await auth();
    if (!session?.user) return new ChatSDKError('unauthorized:api').toResponse();
    if (session.user.type === 'guest') return new ChatSDKError('forbidden:api', 'Guests cannot generate referral links').toResponse();

    try {
        const existing = await getReferralCodeByUserId({ userId: session.user.id });
        const code = existing?.code ?? randomCode(REFERRAL_CODE_LENGTH);
        if (!existing) {
            await createReferralCode({ userId: session.user.id, code });
            // best-effort analytics
            trackReferralCodeCreated({ userId: session.user.id, code }).catch(() => { });
        }

        const origin = request.headers.get('origin') || `${request.headers.get('x-forwarded-proto') || 'https'}://${request.headers.get('host')}`;
        const url = new URL('/', origin);
        url.searchParams.set('ref', code);
        url.searchParams.set('utm_source', REFERRAL_UTM_DEFAULTS.source);
        url.searchParams.set('utm_medium', REFERRAL_UTM_DEFAULTS.medium);
        url.searchParams.set('utm_campaign', REFERRAL_UTM_DEFAULTS.campaign);

        return Response.json({ code, url: url.toString() });
    } catch (e) {
        return new ChatSDKError('bad_request:api').toResponse();
    }
}


