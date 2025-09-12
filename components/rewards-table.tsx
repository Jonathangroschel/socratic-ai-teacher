'use client';

import useSWRInfinite from 'swr/infinite';

type Item = {
  id: string;
  createdAt: string;
  amount: number;
  reason: string | null;
};

const fetcher = (url: string) => fetch(url, { cache: 'no-store' }).then((r) => r.json());

export function RewardsTable() {
  const getKey = (pageIndex: number, previousPageData: any) => {
    if (previousPageData && !previousPageData.nextCursor) return null;
    const cursor = pageIndex === 0 ? '' : `&cursor=${encodeURIComponent(previousPageData.nextCursor)}`;
    return `/api/rewards/transactions?limit=20${cursor}`;
  };

  const { data, isLoading, size, setSize, isValidating } = useSWRInfinite(getKey, fetcher, {
    revalidateOnFocus: false,
  });

  const items: Item[] = (data?.flatMap((p: any) => p.items) ?? []).map((i: any) => ({
    id: i.id,
    createdAt: i.createdAt,
    amount: i.amount,
    reason: i.reason ?? '',
  }));

  const formatDateTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatNumber = (n: number) =>
    new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(n);

  return (
    <div className="rounded-lg border bg-card">
      <div className="grid grid-cols-12 px-4 py-2 text-xs font-medium text-muted-foreground">
        <div className="col-span-4">Date</div>
        <div className="col-span-2 text-right">Amount</div>
        <div className="col-span-6 pl-2">Reason</div>
      </div>
      <div className="divide-y">
        {items.map((it) => (
          <div key={it.id} className="grid grid-cols-12 px-4 py-2 text-sm">
            <div className="col-span-4 text-muted-foreground">{formatDateTime(it.createdAt)}</div>
            <div className="col-span-2 text-right font-medium tabular-nums">{formatNumber(it.amount)}</div>
            <div className="col-span-6 pl-2 truncate" title={it.reason ?? ''}>
              {it.reason || '—'}
            </div>
          </div>
        ))}
        {!items.length && (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">No transactions yet.</div>
        )}
      </div>
      <div className="flex items-center justify-between px-4 py-2">
        <div className="text-xs text-muted-foreground">
          {isLoading || isValidating ? 'Loading…' : `${items.length} items`}
        </div>
        <button
          className="text-xs rounded-md border px-2 py-1 hover:bg-muted disabled:opacity-50"
          disabled={Boolean(data && data[data.length - 1]?.nextCursor == null)}
          onClick={() => setSize(size + 1)}
        >
          Load more
        </button>
      </div>
    </div>
  );
}


