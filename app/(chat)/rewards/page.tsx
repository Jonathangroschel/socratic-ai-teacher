'use client';

import useSWR from 'swr';
import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RewardsBarChart } from '@/components/rewards-chart';
import Link from 'next/link';

type SummaryResponse = {
  today: number;
  lifetime: number;
  month: number;
  series: Array<{ date: string; total: number }>;
  dailyCap: number;
};

const fetcher = (url: string) => fetch(url, { cache: 'no-store' }).then((r) => r.json());

export default function RewardsPage() {
  const { data } = useSWR<SummaryResponse>('/api/rewards/summary?range=30d', fetcher, {
    revalidateOnFocus: false,
  });

  const today = data?.today ?? 0;
  const lifetime = data?.lifetime ?? 0;
  const series = useMemo(() => data?.series ?? [], [data]);

  const formatNumber = (n: number) =>
    new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(n);

  return (
    <div className="mx-auto w-full max-w-6xl p-4 md:p-6 lg:p-8">
      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="col-span-2">
          <CardHeader className="flex flex-wrap items-center justify-between gap-2 space-y-0">
            <CardTitle className="text-base">Earnings</CardTitle>
            <div className="flex items-center gap-2">
              <Link href="/" className="inline-flex">
                <Button variant="outline" className="h-8 rounded-md px-3 text-sm">
                  Back to Chat
                </Button>
              </Link>
              <Button variant="default" className="h-8 rounded-md px-3 text-sm">
                Connect Wallet
              </Button>
            </div>
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

        <Card>
          <CardHeader className="space-y-0">
            <CardTitle className="text-base">Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">
              Wallet not connected. You can connect it later.
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
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
  );
}


