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
        <div
            className={cn(
                'mx-auto w-full max-w-4xl px-2 md:px-4 mb-2',
            )}
        >
            <div className="relative rounded-xl border bg-gradient-to-r from-primary/5 to-transparent p-3 md:p-4">
                <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-3">
                    <div className="text-sm md:text-base text-muted-foreground">
                        <span className="font-medium text-foreground">Save your earnings</span>
                        {typeof todayTotal === 'number' && todayTotal > 0 ? (
                            <>
                                {' '}– you have {new Intl.NumberFormat().format(todayTotal)} points today. Create an account now and get an extra <span className="font-semibold">1,000‑point bonus</span>.
                            </>
                        ) : (
                            <> – create an account and get a <span className="font-semibold">1,000‑point bonus</span>.</>
                        )}
                    </div>
                    <div className="flex items-center gap-2 md:ml-auto">
                        <Link href="/register" className="inline-flex">
                            <Button size="sm">Save my earnings</Button>
                        </Link>
                        <Button size="sm" variant="ghost" onClick={() => closeRef.current()} aria-label="Dismiss">
                            Later
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}


