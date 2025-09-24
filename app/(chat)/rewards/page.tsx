'use client';

import useSWR from 'swr';
import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RewardsBarChart } from '@/components/rewards-chart';
import Link from 'next/link';
import { ConnectWallet } from '@/components/wallet/connect-wallet';
import { referralsEnabled as referralsEnabledStatic } from '@/lib/constants';

type SummaryResponse = {
  today: number;
  lifetime: number;
  month: number;
  series: Array<{ date: string; total: number }>;
  dailyCap: number;
  referral?: { signupsAwarded: number; totalReferralPoints: number };
  userType?: 'guest' | 'regular';
  referralsEnabled?: boolean;
};

const fetcher = (url: string) => fetch(url, { cache: 'no-store' }).then((r) => r.json());

export default function RewardsPage() {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const { data } = useSWR<SummaryResponse>(`/api/rewards/summary?range=30d&tz=${encodeURIComponent(tz)}`, fetcher, {
    revalidateOnFocus: false,
  });
  const { data: walletsData, mutate: mutateWallets } = useSWR<{ items: Array<any> }>(`/api/wallets`, fetcher);

  const [inviteState, setInviteState] = useState<{ url: string | null; loading: boolean; error: string | null }>({ url: null, loading: false, error: null });

  useEffect(() => {
    const onChanged = () => mutateWallets();
    document.addEventListener('wallets:changed', onChanged);
    return () => document.removeEventListener('wallets:changed', onChanged);
  }, [mutateWallets]);

  const today = data?.today ?? 0;
  const lifetime = data?.lifetime ?? 0;
  const series = useMemo(() => data?.series ?? [], [data]);
  const referralsEnabled = data?.referralsEnabled ?? referralsEnabledStatic;

  const formatNumber = (n: number) =>
    new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(n);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      alert('Link copied');
    } catch {
      // fallback toast
    }
    try {
      await fetch('/api/analytics/referrals', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ event: 'referral_link_copied' }),
      });
    } catch { }
  };

  const openShare = async (url: string, channel?: 'reddit' | 'x' | 'discord' | 'email' | 'sms') => {
    try {
      const u = new URL(url);
      if (channel) u.searchParams.set('utm_source', channel);
      const finalUrl = u.toString();
      if ((navigator as any).share) {
        await (navigator as any).share({ title: 'Polymatic — Invite & Earn', text: 'Join me on Polymatic and start learning to earn!', url: finalUrl });
      } else {
        // open a new tab for channel presets
        if (channel === 'reddit') window.open(`https://www.reddit.com/submit?url=${encodeURIComponent(finalUrl)}&title=${encodeURIComponent('Learn & earn 50k points on Polymatic')}`, '_blank');
        else if (channel === 'x') window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(finalUrl)}&text=${encodeURIComponent('Learn & earn 50k points on Polymatic')}`, '_blank');
        else if (channel === 'email') window.location.href = `mailto:?subject=${encodeURIComponent('Join me on Polymatic')}&body=${encodeURIComponent(finalUrl)}`;
        else if (channel === 'sms') window.location.href = `sms:?&body=${encodeURIComponent(finalUrl)}`;
        else window.open(finalUrl, '_blank');
      }
      try {
        await fetch('/api/analytics/referrals', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ event: 'referral_shared', channel }),
        });
      } catch { }
    } catch { }
  };

  const loadInviteUrl = async () => {
    setInviteState((s) => ({ ...s, loading: true, error: null }));
    try {
      const res = await fetch('/api/referrals/code', { method: 'POST' });
      if (!res.ok) throw new Error('Failed');
      const json = await res.json();
      setInviteState({ url: json.url, loading: false, error: null });
    } catch (e) {
      setInviteState({ url: null, loading: false, error: 'Could not generate link' });
    }
  };

  return (
    <div className="mx-auto w-full max-w-6xl p-4 md:p-6 lg:p-8 fx-grain-vignette">
      <div className="mb-6 grid grid-cols-1 gap-3 md:grid-cols-3 md:gap-4 max-w-[396px] md:max-w-none mx-auto">
        <Card className="md:col-span-2 w-full fx-card">
          <CardHeader className="flex items-center justify-between space-y-0">
            <CardTitle className="text-base">Earnings</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-md border bg-muted/25 p-4">
              <div className="text-sm text-muted-foreground">Total Earnings</div>
              <div className="mt-1 text-3xl font-semibold tabular-nums">
                {formatNumber(lifetime)}
              </div>
            </div>
            <div className="rounded-md border bg-muted/25 p-4">
              <div className="text-sm text-muted-foreground">Today&apos;s Earnings</div>
              <div className="mt-1 text-3xl font-semibold tabular-nums">
                {formatNumber(today)}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="w-full fx-card">
          <CardHeader className="space-y-0">
            <CardTitle className="text-base">Status</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="text-sm text-muted-foreground">
              Connect a wallet to receive airdrops of your earnings.
            </div>
            <div className="flex flex-wrap gap-2">
              <ConnectWallet saved={walletsData?.items?.map((w: any) => ({ id: w.id, address: w.address, isVerified: w.isVerified, isPrimary: w.isPrimary })) ?? []} />
            </div>
            {/* Saved wallets list intentionally hidden per design simplification */}
          </CardContent>
        </Card>
      </div>

      <div className="hidden md:block">
        <Card className="w-full fx-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Earnings Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <RewardsBarChart series={series} />
            <div className="mt-2 text-xs text-muted-foreground">
              Last 30 days. Hover bars to view day totals.
            </div>
            <div className="mt-4 rounded-md border bg-muted/25 p-3 text-sm text-muted-foreground">
              You’re earning points that convert into <span className="font-medium">$LTERN</span> tokens.
              <span className="ml-2">
                <a
                  href="https://polymatic-1.gitbook.io/polymatic"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-4 hover:text-foreground"
                >
                  Learn More About $LTERN
                </a>
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {referralsEnabled && (
        <div className="mt-4">
          <Card className="w-full fx-card">
            <CardHeader className="flex items-center justify-between space-y-0">
              <CardTitle className="text-base">Invite & Earn</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="md:col-span-2">
                  <div className="text-sm text-muted-foreground">Invite friends. Earn <span className="font-medium">50,000</span> points when someone joins with your link.</div>
                  {data?.userType === 'guest' ? (
                    <div className="mt-3">
                      <Link href="/register" className="inline-flex">
                        <Button size="sm" className="h-9">Create your account to get your invite link</Button>
                      </Link>
                    </div>
                  ) : (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {inviteState.url ? (
                        <>
                          <Button size="sm" className="h-9" onClick={() => copyToClipboard(inviteState.url!)}>Copy link</Button>
                          <Button size="sm" variant="outline" className="h-9" onClick={() => openShare(inviteState.url!)}>Share…</Button>
                          <Button size="sm" variant="ghost" className="h-9" onClick={() => openShare(inviteState.url!, 'reddit')}>Share to Reddit</Button>
                          <Button size="sm" variant="ghost" className="h-9" onClick={() => openShare(inviteState.url!, 'x')}>Share to X</Button>
                          <Button size="sm" variant="ghost" className="h-9" onClick={() => openShare(inviteState.url!, 'discord')}>Share to Discord</Button>
                          <Button size="sm" variant="ghost" className="h-9" onClick={() => openShare(inviteState.url!, 'email')}>Email</Button>
                          <Button size="sm" variant="ghost" className="h-9" onClick={() => openShare(inviteState.url!, 'sms')}>SMS</Button>
                        </>
                      ) : (
                        <Button size="sm" className="h-9" disabled={inviteState.loading} onClick={loadInviteUrl}>
                          {inviteState.loading ? 'Generating…' : 'Get your link'}
                        </Button>
                      )}
                    </div>
                  )}
                </div>
                <div className="rounded-md border bg-muted/25 p-3">
                  <div className="text-sm text-muted-foreground">Your referral stats</div>
                  <div className="mt-2 flex items-center justify-between text-sm">
                    <div className="text-muted-foreground">Signups awarded</div>
                    <div className="font-medium tabular-nums">{data?.referral?.signupsAwarded ?? 0}</div>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-sm">
                    <div className="text-muted-foreground">Total referral points</div>
                    <div className="font-medium tabular-nums">{formatNumber(data?.referral?.totalReferralPoints ?? 0)}</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Mobile: show an inline banner under cards */}
      <div className="md:hidden mt-4">
        <div className="rounded-md border bg-muted/40 p-3 text-sm text-muted-foreground">
          You’re earning points that convert into <span className="font-medium">$LTERN</span> tokens.
          <div>
            <a
              href="https://polymatic-1.gitbook.io/polymatic"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-4 hover:text-foreground"
            >
              Learn More About $LTERN
            </a>
          </div>
        </div>
      </div>

      <div className="mt-4 md:mt-6 max-w-[396px] md:max-w-none mx-auto">
        <Link href="/" className="inline-flex">
          <Button variant="outline" className="h-9 rounded-md px-3 text-sm">Back to Chat</Button>
        </Link>
      </div>
    </div>
  );
}


