import { auth } from '@/app/(auth)/auth';
import { ChatSDKError } from '@/lib/errors';
import { deleteWallet } from '@/lib/db/queries';

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
    const session = await auth();
    if (!session?.user) return new ChatSDKError('unauthorized:api').toResponse();

    try {
        const id = params.id;
        if (!id) return new ChatSDKError('bad_request:api').toResponse();
        await deleteWallet({ userId: session.user.id, id });
        return Response.json({ ok: true });
    } catch (e) {
        return new ChatSDKError('bad_request:api').toResponse();
    }
}
