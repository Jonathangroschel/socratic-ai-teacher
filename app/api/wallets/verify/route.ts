import { auth } from '@/app/(auth)/auth';
import { ChatSDKError } from '@/lib/errors';
import { verifyWalletSignature } from '@/lib/db/queries';

export async function POST(request: Request) {
    const session = await auth();
    if (!session?.user) return new ChatSDKError('unauthorized:api').toResponse();

    try {
        const { address, signature } = await request.json();
        if (typeof address !== 'string' || typeof signature !== 'string') {
            return new ChatSDKError('bad_request:api').toResponse();
        }
        const result = await verifyWalletSignature({ userId: session.user.id, address, signatureBase58: signature });
        return Response.json(result);
    } catch (e) {
        if (e instanceof ChatSDKError) return e.toResponse();
        return new ChatSDKError('bad_request:api').toResponse();
    }
}
