'use client';

import { Button } from '@/components/ui/button';
import { useMemo } from 'react';
import { toast } from '@/components/toast';

function pick<T>(arr: T[], i: number) {
    return arr[Math.abs(i) % arr.length];
}

function hashSeed(input: string) {
    let h = 0;
    for (let i = 0; i < input.length; i++) {
        h = (h << 5) - h + input.charCodeAt(i);
        h |= 0;
    }
    return h;
}

export function AddressChip({ address }: { address: string }) {
    const seed = useMemo(() => hashSeed(address), [address]);
    const colors = useMemo(
        () => [
            'from-rose-500 to-orange-500',
            'from-sky-500 to-indigo-500',
            'from-emerald-500 to-cyan-500',
            'from-fuchsia-500 to-pink-500',
            'from-amber-500 to-red-500',
        ],
        [],
    );
    const gradient = pick(colors, seed);
    const short = `${address.slice(0, 6)}…${address.slice(-6)}`;

    return (
        <div className="inline-flex items-center gap-2 rounded-md border bg-background px-2 py-1">
            <div className={`size-4 rounded-full bg-gradient-to-br ${gradient}`} />
            <span className="font-mono text-xs tabular-nums">{short}</span>
            <Button
                variant="ghost"
                className="h-6 px-2 text-xs"
                onClick={async () => {
                    try {
                        await navigator.clipboard.writeText(address);
                        toast({ type: 'success', description: 'Address copied' });
                    } catch {
                        toast({ type: 'error', description: 'Unable to copy' });
                    }
                }}
            >
                Copy
            </Button>
        </div>
    );
}


