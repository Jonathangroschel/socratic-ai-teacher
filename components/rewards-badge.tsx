'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useDataStream } from './data-stream-provider';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';

export function RewardsBadge() {
  const { dataStream } = useDataStream();
  const [todayTotal, setTodayTotal] = useState<number>(0);
  const [bump, setBump] = useState<boolean>(false);
  const lastProcessedIndex = useRef(-1);

  // Fetch today's total on mount
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const res = await fetch('/api/rewards/summary', { cache: 'no-store' });
        if (!res.ok) return;
        const json = await res.json();
        if (isMounted && typeof json?.today === 'number') {
          setTodayTotal(json.today);
        }
      } catch {}
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  // Listen for reward events from the data stream
  useEffect(() => {
    if (!dataStream?.length) return;
    const newParts = dataStream.slice(lastProcessedIndex.current + 1);
    lastProcessedIndex.current = dataStream.length - 1;

    newParts.forEach((part) => {
      if (part.type === 'data-reward') {
        const { delta, todayTotal } = part.data as {
          delta: number;
          todayTotal: number;
        };
        if (typeof todayTotal === 'number') {
          setTodayTotal(todayTotal);
        } else if (typeof delta === 'number') {
          setTodayTotal((t) => t + delta);
        }

        // Subtle pulse highlight
        setBump(true);
        const t = setTimeout(() => setBump(false), 450);
        return () => clearTimeout(t);
      } else if (part.type === 'data-usage') {
        // Fallback: after every assistant finish, refresh summary once
        (async () => {
          try {
            const res = await fetch('/api/rewards/summary', { cache: 'no-store' });
            if (res.ok) {
              const json = await res.json();
              if (typeof json?.today === 'number') setTodayTotal(json.today);
            }
          } catch {}
        })();
      }
    });
  }, [dataStream]);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link
          href="/rewards"
          aria-label={`Today's earnings: ${todayTotal}`}
          className={
            'ml-auto order-3 flex items-center gap-1 rounded-md px-2 py-1 transition ' +
            (bump ? 'bg-primary/10 shadow-sm scale-[1.03]' : 'hover:bg-muted')
          }
        >
          {/* Using img intentionally for a tiny SVG to avoid layout shift */}
          <img
            src="https://fvyhcmnnqnsfmguhexhr.supabase.co/storage/v1/object/public/icon/sparkles.svg"
            alt="earnings"
            className="size-4 opacity-90"
          />
          <span
            data-testid="rewards-today"
            className="text-sm font-medium tabular-nums"
          >
            {todayTotal}
          </span>
        </Link>
      </TooltipTrigger>
      <TooltipContent align="end">Today&apos;s earnings: {todayTotal}</TooltipContent>
    </Tooltip>
  );
}


