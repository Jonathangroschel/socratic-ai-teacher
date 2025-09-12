import { auth } from '@/app/(auth)/auth';
import { ChatSDKError } from '@/lib/errors';
import { getRewardRowsInRangeByUserId, getRewardsSummaryByUserId } from '@/lib/db/queries';
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

    // Timezone-aware: use header tz first, then client tz param, fallback UTC
    const headerTz = request.headers.get('x-vercel-ip-timezone');
    const clientTz = searchParams.get('tz');
    const tz = headerTz || clientTz || 'UTC';

    // Lifetime and month (last N days) totals retain existing logic (UTC sum),
    // while "today" and series are computed in the user's timezone.
    const base = await getRewardsSummaryByUserId({ userId: session.user.id, days });

    // Build timezone-aware day buckets for the last N days
    const now = new Date();
    const endUtc = now;
    // Fetch a superset window to cover tz offsets (days + 1)
    const startUtc = new Date(now.getTime() - (days + 1) * 24 * 60 * 60 * 1000);

    const rows = await getRewardRowsInRangeByUserId({ userId: session.user.id, start: startUtc, end: endUtc });

    const fmt = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const keyFor = (d: Date) => {
      // Format in tz, then construct yyyy-mm-dd key safely
      const parts = fmt.formatToParts(d);
      const y = parts.find((p) => p.type === 'year')?.value;
      const m = parts.find((p) => p.type === 'month')?.value;
      const da = parts.find((p) => p.type === 'day')?.value;
      return `${y}-${m}-${da}`;
    };

    // Seed series keys for last N days using tz-based labels from 'now - i days'
    const seriesMap = new Map<string, number>();
    for (let i = days - 1; i >= 0; i--) {
      const dt = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      seriesMap.set(keyFor(dt), 0);
    }
    // Accumulate amounts into tz-based buckets
    for (const r of rows) {
      const key = keyFor(new Date(r.createdAt));
      if (seriesMap.has(key)) seriesMap.set(key, (seriesMap.get(key) ?? 0) + (r.amount ?? 0));
    }

    const series = Array.from(seriesMap.entries()).map(([date, total]) => ({ date, total }));
    const todayKey = keyFor(now);
    const today = seriesMap.get(todayKey) ?? 0;

    // Compute month as sum of series (tz-aware)
    const month = series.reduce((sum, p) => sum + p.total, 0);

    return Response.json({ today, lifetime: base.lifetime, month, series, dailyCap: REWARDS_DAILY_CAP, tz });
  } catch (e: any) {
    const msg = e?.message || '';
    // Graceful fallback if the migration hasn't run yet and table is missing
    if (/does not exist|relation .* does not exist|RewardTransaction/i.test(msg)) {
      return Response.json({ today: 0, lifetime: 0, month: 0, series: [], dailyCap: REWARDS_DAILY_CAP });
    }
    return new ChatSDKError('bad_request:api').toResponse();
  }
}


