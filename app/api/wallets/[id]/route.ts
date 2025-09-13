import { auth } from '@/app/(auth)/auth';
import { ChatSDKError } from '@/lib/errors';
import { deleteWallet } from '@/lib/db/queries';

export async function DELETE(request: Request, context: any) {
    const session = await auth();
    if (!session?.user) return new ChatSDKError('unauthorized:api').toResponse();

    try {
        const id = context?.params?.id as string | undefined;
        if (!id) return new ChatSDKError('bad_request:api').toResponse();
        await deleteWallet({ userId: session.user.id, id });
        return Response.json({ ok: true });
    } catch (e) {
        return new ChatSDKError('bad_request:api').toResponse();
    }
}
