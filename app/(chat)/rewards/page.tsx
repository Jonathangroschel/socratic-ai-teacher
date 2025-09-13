'use client';

import useSWR from 'swr';
import { useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RewardsBarChart } from '@/components/rewards-chart';
import Link from 'next/link';
import { ConnectWallet } from '@/components/wallet/connect-wallet';

type SummaryResponse = {
  today: number;
  lifetime: number;
  month: number;
  series: Array<{ date: string; total: number }>;
  dailyCap: number;
};

const fetcher = (url: string) => fetch(url, { cache: 'no-store' }).then((r) => r.json());

export default function RewardsPage() {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const { data } = useSWR<SummaryResponse>(`/api/rewards/summary?range=30d&tz=${encodeURIComponent(tz)}`, fetcher, {
    revalidateOnFocus: false,
  });
  const { data: walletsData, mutate: mutateWallets } = useSWR<{ items: Array<any> }>(`/api/wallets`, fetcher);

  useEffect(() => {
    const onChanged = () => mutateWallets();
    document.addEventListener('wallets:changed', onChanged);
    return () => document.removeEventListener('wallets:changed', onChanged);
  }, [mutateWallets]);

  const today = data?.today ?? 0;
  const lifetime = data?.lifetime ?? 0;
  const series = useMemo(() => data?.series ?? [], [data]);

  const formatNumber = (n: number) =>
    new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(n);

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
            <div>
              <ConnectWallet />
            </div>
            {walletsData?.items?.length ? (
              <div className="mt-1 rounded-md border bg-muted/25 p-3">
                <div className="mb-2 text-sm font-medium">Saved Wallets</div>
                <div className="flex flex-col gap-2">
                  {walletsData.items.map((w) => (
                    <div key={w.id} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-primary/10 px-2 py-0.5">{w.chain}</span>
                        <span className="font-mono tabular-nums">{w.address.slice(0, 6)}…{w.address.slice(-6)}</span>
                        {w.isVerified ? (
                          <span className="text-xs text-green-600">Verified</span>
                        ) : (
                          <span className="text-xs text-amber-600">Unverified</span>
                        )}
                        {w.isPrimary && <span className="text-xs text-muted-foreground">Primary</span>}
                      </div>
                      <div className="flex items-center gap-2">
                        {!w.isPrimary && (
                          <Button
                            variant="outline"
                            className="h-7 px-2 text-xs"
                            onClick={async () => {
                              await fetch('/api/wallets/primary', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: w.id }) });
                              mutateWallets();
                            }}
                          >
                            Make Primary
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          className="h-7 px-2 text-xs"
                          onClick={async () => {
                            await fetch(`/api/wallets/${w.id}`, { method: 'DELETE' });
                            mutateWallets();
                          }}
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
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
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 md:mt-6 max-w-[396px] md:max-w-none mx-auto">
        <Link href="/" className="inline-flex">
          <Button variant="outline" className="h-9 rounded-md px-3 text-sm">Back to Chat</Button>
        </Link>
      </div>
    </div>
  );
}


