'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';

export function AccountNudgePill({
    visible,
    todayTotal,
    onClose,
    className,
}: {
    visible: boolean;
    todayTotal: number;
    onClose: () => void;
    className?: string;
}) {
    if (!visible) return null;

    const points = typeof todayTotal === 'number' && todayTotal > 0
        ? new Intl.NumberFormat().format(todayTotal)
        : null;

    return (
        <div
            className={cn(
                'inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/70 shadow-sm backdrop-blur supports-[backdrop-filter]:backdrop-blur-md',
                'h-7 px-2 text-xs text-muted-foreground',
                className,
            )}
        >
            <Link
                href="/register"
                className="inline-flex items-center gap-1 text-foreground/90 hover:text-foreground transition-colors"
            >
                <span className="font-medium hidden sm:inline">Save earnings</span>
                <span className="sm:hidden font-medium">Save</span>
                <span className="opacity-70">{points ? `· ${points}` : ''}</span>
                <span className="ml-1 font-semibold">+1,000</span>
            </Link>
            <button
                type="button"
                className="px-1 text-muted-foreground/70 hover:text-foreground"
                onClick={onClose}
                aria-label="Dismiss"
            >
                ×
            </button>
        </div>
    );
}


