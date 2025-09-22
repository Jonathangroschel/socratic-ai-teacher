'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';

export function AccountNudgeBanner({
    visible,
    todayTotal,
    onClose,
}: {
    visible: boolean;
    todayTotal: number;
    onClose: () => void;
}) {
    const [mounted, setMounted] = useState(false);
    const closeRef = useRef(onClose);
    closeRef.current = onClose;

    useEffect(() => setMounted(true), []);

    if (!mounted) return null;
    if (!visible) return null;

    return (
        <div className={cn('w-full')}>
            <div
                className={cn(
                    'mx-auto w-full max-w-4xl',
                    'rounded-lg border border-border/60 bg-background/75 shadow-sm',
                    'backdrop-blur supports-[backdrop-filter]:backdrop-blur-md',
                    'px-3 py-2 md:px-4 md:py-2'
                )}
            >
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                    <div className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                        <span className="font-medium text-foreground">Save your earnings</span>
                        {typeof todayTotal === 'number' && todayTotal > 0 ? (
                            <>
                                {' '}— you have {new Intl.NumberFormat().format(todayTotal)} points today. Create an account and get a <span className="font-semibold">1,000‑point bonus</span>.
                            </>
                        ) : (
                            <> — create an account and get a <span className="font-semibold">1,000‑point bonus</span>.</>
                        )}
                    </div>
                    <div className="flex items-center gap-2 sm:ml-auto">
                        <Link href="/register" className="inline-flex">
                            <Button size="sm" className="h-7 px-3">Save my earnings</Button>
                        </Link>
                        <button
                            className="h-7 px-2 text-xs sm:text-sm text-muted-foreground hover:text-foreground"
                            onClick={() => closeRef.current()}
                            type="button"
                            aria-label="Dismiss"
                        >
                            Later
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}


