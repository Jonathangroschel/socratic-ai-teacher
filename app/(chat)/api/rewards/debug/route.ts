import { auth } from '@/app/(auth)/auth';
import { rewardsEnabled, REWARDS_DAILY_CAP } from '@/lib/constants';

export async function GET() {
  const session = await auth();
  if (!session?.user) return Response.json({ error: 'unauthorized' }, { status: 401 });

  return Response.json({
    parsed: rewardsEnabled,
    raw: process.env.REWARDS_ENABLED ?? null,
    dailyCap: REWARDS_DAILY_CAP,
    solana: {
      network: process.env.NEXT_PUBLIC_SOLANA_NETWORK || 'devnet',
      rpc: process.env.NEXT_PUBLIC_SOLANA_RPC || null,
    },
  });
}


