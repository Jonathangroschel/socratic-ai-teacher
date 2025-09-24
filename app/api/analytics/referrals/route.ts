import { auth } from '@/app/(auth)/auth';
import { ChatSDKError } from '@/lib/errors';
import { posthogServer } from '@/lib/analytics/posthog-server';

export async function POST(request: Request) {
    const session = await auth();
    if (!session?.user) return new ChatSDKError('unauthorized:api').toResponse();
    try {
        const { event, channel } = await request.json();
        if (!posthogServer) return Response.json({ ok: true });
        await posthogServer.capture({
            distinctId: session.user.id,
            event: String(event || 'referral_client_event'),
            properties: { channel },
        });
        return Response.json({ ok: true });
    } catch (e) {
        return new ChatSDKError('bad_request:api').toResponse();
    }
}


