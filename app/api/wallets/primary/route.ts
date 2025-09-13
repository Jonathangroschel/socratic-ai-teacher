import { auth } from '@/app/(auth)/auth';
import { ChatSDKError } from '@/lib/errors';
import { setPrimaryWallet } from '@/lib/db/queries';

export async function POST(request: Request) {
    const session = await auth();
    if (!session?.user) return new ChatSDKError('unauthorized:api').toResponse();

    try {
        const { id } = await request.json();
        if (typeof id !== 'string') return new ChatSDKError('bad_request:api').toResponse();
        await setPrimaryWallet({ userId: session.user.id, id });
        return Response.json({ ok: true });
    } catch (e) {
        return new ChatSDKError('bad_request:api').toResponse();
    }
}
