import { auth } from '@/app/(auth)/auth';
import { saveRewardTransaction, hasRewardReasonByUserId } from '@/lib/db/queries';
import { ChatSDKError } from '@/lib/errors';

const BONUS_AMOUNT = 1000;
const REASON = 'account_created_bonus';

export async function POST() {
    const session = await auth();
    if (!session?.user) return new ChatSDKError('unauthorized:api').toResponse();

    try {
        const already = await hasRewardReasonByUserId({ userId: session.user.id, reason: REASON });
        if (already) return Response.json({ ok: true, alreadyGranted: true });

        const saved = await saveRewardTransaction({
            userId: session.user.id,
            amount: BONUS_AMOUNT,
            reason: REASON,
            chatId: null,
            messageId: null,
            rubric: null,
        });
        return Response.json({ ok: true, saved });
    } catch (e) {
        return new ChatSDKError('bad_request:api').toResponse();
    }
}


