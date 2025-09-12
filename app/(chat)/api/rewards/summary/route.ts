import { auth } from '@/app/(auth)/auth';
import { ChatSDKError } from '@/lib/errors';
import { getTodayRewardTotalByUserId } from '@/lib/db/queries';

export async function GET() {
  const session = await auth();
  if (!session?.user) return new ChatSDKError('unauthorized:api').toResponse();

  try {
    const today = await getTodayRewardTotalByUserId(session.user.id);
    // Lifetime/monthly can be added later; return today for now
    return Response.json({ today, lifetime: null, monthly: null });
  } catch (e: any) {
    const msg = e?.message || '';
    // Graceful fallback if the migration hasn't run yet and table is missing
    if (/does not exist|relation .* does not exist|RewardTransaction/i.test(msg)) {
      return Response.json({ today: 0, lifetime: null, monthly: null });
    }
    return new ChatSDKError('bad_request:api').toResponse();
  }
}


