'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import bs58 from 'bs58';

function truncate(addr?: string | null, head = 4, tail = 4) {
    if (!addr) return '';
    if (addr.length <= head + tail + 1) return addr;
    return `${addr.slice(0, head)}…${addr.slice(-tail)}`;
}

export function ConnectWallet() {
    const { connected, publicKey, wallets, select, disconnect, connecting, signMessage } = useWallet();
    const [verifying, setVerifying] = useState(false);
    const [saving, setSaving] = useState(false);

    const address = useMemo(() => publicKey?.toBase58() ?? null, [publicKey]);

    const startVerification = useCallback(async () => {
        if (!address) return;
        setVerifying(true);
        try {
            const res = await fetch('/api/wallets/start', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ address }),
            });
            if (!res.ok) return;
            const { nonce } = await res.json();
            const message = new TextEncoder().encode(nonce);
            let signature: string | null = null;
            // Preferred: adapter signMessage
            if (typeof signMessage === 'function') {
                const sigBytes = await signMessage(message);
                signature = bs58.encode(sigBytes);
            } else if ((window as any)?.solana?.signMessage) {
                // Fallback: injected provider (e.g., Phantom)
                const signed = await (window as any).solana.signMessage(message, 'utf8');
                const sigBytes = signed?.signature ?? signed;
                if (sigBytes) signature = bs58.encode(sigBytes);
            }
            if (!signature) {
                setVerifying(false);
                return;
            }
            const vr = await fetch('/api/wallets/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ address, signature }),
            });
            if (vr.ok) {
                // Refetch wallets list in the page using SWR if available
                try {
                    // light ping to invalidate cache consumers
                    await fetch('/api/wallets', { cache: 'no-store' });
                } catch { }
            }
        } catch { } finally {
            setVerifying(false);
        }
    }, [address, publicKey]);

    const connectWallet = useCallback(async (name: string) => {
        try {
            await select(name as any);
        } catch { }
    }, [select]);

    if (!connected) {
        return (
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button className="h-8 rounded-md px-3 text-sm">Connect Wallet</Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                    {wallets.map((w) => (
                        <DropdownMenuItem key={w.adapter.name} onSelect={() => connectWallet(w.adapter.name)} className="cursor-pointer">
                            {w.adapter.icon && (
                                <img src={w.adapter.icon} alt="" className="mr-2 size-4 rounded" />
                            )}
                            <span className="truncate">{w.adapter.name}</span>
                        </DropdownMenuItem>
                    ))}
                </DropdownMenuContent>
            </DropdownMenu>
        );
    }

    return (
        <div className="flex items-center gap-2">
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button variant="outline" className="h-8 rounded-md px-3 text-sm">
                        {truncate(address)}
                    </Button>
                </TooltipTrigger>
                <TooltipContent align="end">Connected</TooltipContent>
            </Tooltip>
            <Button disabled={verifying || !address} onClick={startVerification} className="h-8 rounded-md px-3 text-sm">
                {verifying ? 'Verifying…' : 'Verify & Save'}
            </Button>
            <Button variant="ghost" onClick={() => disconnect()} className="h-8 rounded-md px-3 text-sm">
                Disconnect
            </Button>
        </div>
    );
}
