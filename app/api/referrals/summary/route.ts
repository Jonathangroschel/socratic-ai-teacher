import { auth } from '@/app/(auth)/auth';
import { ChatSDKError } from '@/lib/errors';
import { getReferralCodeByUserId, getReferralSummaryByUserId } from '@/lib/db/queries';
import { REFERRAL_UTM_DEFAULTS } from '@/lib/constants';

export async function GET(request: Request) {
    const session = await auth();
    if (!session?.user) return new ChatSDKError('unauthorized:api').toResponse();

    try {
        const [summary, codeRow] = await Promise.all([
            getReferralSummaryByUserId({ userId: session.user.id }),
            getReferralCodeByUserId({ userId: session.user.id }),
        ]);

        const origin = request.headers.get('origin') || `${request.headers.get('x-forwarded-proto') || 'https'}://${request.headers.get('host')}`;
        const url = codeRow?.code
            ? (() => {
                const u = new URL('/', origin);
                u.searchParams.set('ref', codeRow.code);
                u.searchParams.set('utm_source', REFERRAL_UTM_DEFAULTS.source);
                u.searchParams.set('utm_medium', REFERRAL_UTM_DEFAULTS.medium);
                u.searchParams.set('utm_campaign', REFERRAL_UTM_DEFAULTS.campaign);
                return u.toString();
            })()
            : null;

        return Response.json({ ...summary, url });
    } catch (e) {
        return new ChatSDKError('bad_request:api').toResponse();
    }
}


