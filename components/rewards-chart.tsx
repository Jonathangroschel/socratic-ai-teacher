'use client';

import { useMemo, useState } from 'react';

type SeriesPoint = {
  date: string; // ISO yyyy-MM-dd (local)
  total: number; // integer amount
};

export function RewardsBarChart({
  series,
  height = 220,
}: {
  series: SeriesPoint[];
  height?: number;
}) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const { maxY, bars, dates } = useMemo(() => {
    const totals = series.map((s) => s.total);
    const maxY = Math.max(10, ...totals);
    const dates = series.map((s) => s.date);
    const bars = totals.map((t) => t / maxY);
    return { maxY, bars, dates };
  }, [series]);

  const width = Math.max(320, series.length * 16 + 32);
  const chartPadding = { top: 16, bottom: 28, left: 12, right: 12 };
  const innerHeight = height - chartPadding.top - chartPadding.bottom;
  const innerWidth = width - chartPadding.left - chartPadding.right;
  const barGap = 6;
  const barWidth = Math.max(4, Math.floor(innerWidth / series.length) - barGap);

  const formatCompact = (n: number) => {
    // compact, no decimals
    return new Intl.NumberFormat(undefined, {
      notation: 'compact',
      maximumFractionDigits: 0,
    }).format(n);
  };

  const formatDateLabel = (iso: string) => {
    const d = new Date(iso + 'T00:00:00');
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  return (
    <div className="relative w-full overflow-x-auto">
      <svg
        width={width}
        height={height}
        className="block select-none"
        role="img"
        aria-label="Earnings in the last 30 days"
      >
        {/* Background gridline (0 baseline) */}
        <line
          x1={chartPadding.left}
          y1={height - chartPadding.bottom + 0.5}
          x2={width - chartPadding.right}
          y2={height - chartPadding.bottom + 0.5}
          stroke="currentColor"
          className="opacity-10"
        />

        {/* Bars */}
        {bars.map((v, i) => {
          const barHeight = Math.max(2, Math.round(v * innerHeight));
          const x = chartPadding.left + i * (barWidth + barGap);
          const y = height - chartPadding.bottom - barHeight;
          const isHover = hoverIndex === i;
          return (
            <g key={i} onMouseEnter={() => setHoverIndex(i)} onMouseLeave={() => setHoverIndex(null)}>
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                rx={2}
                className={
                  'transition-all duration-150 ' +
                  (isHover
                    ? 'fill-primary/80'
                    : 'fill-primary/30 hover:fill-primary/50')
                }
              />
            </g>
          );
        })}

        {/* X labels (sparse ticks: every ~5th day) */}
        {dates.map((d, i) => {
          if (series.length <= 10 || i % 5 === 0 || i === series.length - 1) {
            const x = chartPadding.left + i * (barWidth + barGap) + barWidth / 2;
            const y = height - chartPadding.bottom + 16;
            return (
              <text
                key={'label-' + i}
                x={x}
                y={y}
                textAnchor="middle"
                className="fill-foreground/50 text-[10px]"
              >
                {formatDateLabel(d)}
              </text>
            );
          }
          return null;
        })}
      </svg>

      {/* Hover tooltip */}
      {hoverIndex !== null && (
        <div
          className="pointer-events-none absolute -translate-x-1/2 -translate-y-2 rounded-md border bg-popover px-2 py-1 text-xs shadow-md"
          style={{
            left:
              chartPadding.left +
              hoverIndex * (barWidth + barGap) +
              barWidth / 2,
            top: chartPadding.top,
          }}
        >
          <div className="font-medium tabular-nums">
            {formatCompact(series[hoverIndex].total)}
          </div>
          <div className="text-muted-foreground">
            {formatDateLabel(series[hoverIndex].date)}
          </div>
        </div>
      )}
    </div>
  );
}


