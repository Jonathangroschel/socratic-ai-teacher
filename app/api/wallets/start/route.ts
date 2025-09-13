import { auth } from '@/app/(auth)/auth';
import { ChatSDKError } from '@/lib/errors';
import { startWalletVerification } from '@/lib/db/queries';

export async function POST(request: Request) {
    const session = await auth();
    if (!session?.user) return new ChatSDKError('unauthorized:api').toResponse();

    try {
        const { address } = await request.json();
        if (typeof address !== 'string' || address.length < 20) {
            return new ChatSDKError('bad_request:api').toResponse();
        }
        const { nonce, expiresAt } = await startWalletVerification({ userId: session.user.id, address });
        return Response.json({ nonce, expiresAt });
    } catch (e) {
        return new ChatSDKError('bad_request:api').toResponse();
    }
}
