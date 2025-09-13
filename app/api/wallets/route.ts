import { auth } from '@/app/(auth)/auth';
import { ChatSDKError } from '@/lib/errors';
import { getUserWallets } from '@/lib/db/queries';

export async function GET() {
    const session = await auth();
    if (!session?.user) return new ChatSDKError('unauthorized:api').toResponse();

    try {
        const wallets = await getUserWallets({ userId: session.user.id });
        return Response.json({ items: wallets });
    } catch (e) {
        return new ChatSDKError('bad_request:api').toResponse();
    }
}
