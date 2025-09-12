import { auth } from '@/app/(auth)/auth';
import { ChatSDKError } from '@/lib/errors';
import { getRewardsSummaryByUserId } from '@/lib/db/queries';
import { REWARDS_DAILY_CAP } from '@/lib/constants';

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) return new ChatSDKError('unauthorized:api').toResponse();

  try {
    const { searchParams } = new URL(request.url);
    const range = searchParams.get('range') || '30d';
    const days = /^([0-9]{1,3})d$/.test(range)
      ? Math.min(365, Math.max(1, Number(range.replace('d', ''))))
      : 30;

    const { today, lifetime, month, series } = await getRewardsSummaryByUserId({
      userId: session.user.id,
      days,
    });

    return Response.json({ today, lifetime, month, series, dailyCap: REWARDS_DAILY_CAP });
  } catch (e: any) {
    const msg = e?.message || '';
    // Graceful fallback if the migration hasn't run yet and table is missing
    if (/does not exist|relation .* does not exist|RewardTransaction/i.test(msg)) {
      return Response.json({ today: 0, lifetime: 0, month: 0, series: [], dailyCap: REWARDS_DAILY_CAP });
    }
    return new ChatSDKError('bad_request:api').toResponse();
  }
}


