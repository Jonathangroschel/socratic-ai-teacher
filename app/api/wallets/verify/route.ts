import { auth } from '@/app/(auth)/auth';
import { ChatSDKError } from '@/lib/errors';
import { verifyWalletSignature, getUserWallets, setPrimaryWallet } from '@/lib/db/queries';

export async function POST(request: Request) {
    const session = await auth();
    if (!session?.user) return new ChatSDKError('unauthorized:api').toResponse();

    try {
        const { address, signature } = await request.json();
        if (typeof address !== 'string' || typeof signature !== 'string') {
            return new ChatSDKError('bad_request:api').toResponse();
        }
        const result = await verifyWalletSignature({ userId: session.user.id, address, signatureBase58: signature });
        try {
            const wallets = await getUserWallets({ userId: session.user.id });
            const target = wallets.find((w: any) => w.address === address);
            if (target) await setPrimaryWallet({ userId: session.user.id, id: target.id });
        } catch { }
        return Response.json(result);
    } catch (e) {
        if (e instanceof ChatSDKError) return e.toResponse();
        return new ChatSDKError('bad_request:api').toResponse();
    }
}
