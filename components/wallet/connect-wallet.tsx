'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import bs58 from 'bs58';
import { ConnectSheet } from './connect-sheet';
import { AddressChip } from './address-chip';
import { toast } from '@/components/toast';

function truncate(addr?: string | null, head = 4, tail = 4) {
    if (!addr) return '';
    if (addr.length <= head + tail + 1) return addr;
    return `${addr.slice(0, head)}…${addr.slice(-tail)}`;
}

export function ConnectWallet({ saved }: { saved?: Array<{ address: string; isVerified: boolean }> }) {
    const { connected, wallet, publicKey, wallets, select, connect, disconnect, connecting, signMessage } = useWallet();
    const [verifying, setVerifying] = useState(false);
    const [saving, setSaving] = useState(false);
    const inFlightRef = useRef(false);

    const address = useMemo(() => publicKey?.toBase58() ?? null, [publicKey]);

    const startVerification = useCallback(async () => {
        if (!address) return;
        if (inFlightRef.current) return;
        inFlightRef.current = true;
        setVerifying(true);
        try {
            const res = await fetch('/api/wallets/start', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ address }),
            });
            if (!res.ok) {
                toast({ type: 'error', description: 'Unable to start verification. Please try again.' });
                return;
            }
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
                inFlightRef.current = false;
                toast({ type: 'error', description: 'Your wallet could not sign the message.' });
                return;
            }
            const vr = await fetch('/api/wallets/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ address, signature }),
            });
            if (vr.ok) {
                document.dispatchEvent(new CustomEvent('wallets:changed'));
                toast({ type: 'success', description: 'Wallet verified and saved.' });
            } else {
                toast({ type: 'error', description: 'Verification failed. Please try again.' });
            }
        } catch { } finally {
            setVerifying(false);
            inFlightRef.current = false;
        }
    }, [address, publicKey]);

    const connectWallet = useCallback(async (name: string) => {
        try {
            // If already connected to another wallet, disconnect first
            if (connected && wallet?.adapter?.name !== name) {
                await disconnect();
            }
            await select(name as any);
            // Explicitly connect (autoConnect is disabled)
            await connect();
        } catch (e) {
            toast({ type: 'error', description: 'Unable to open wallet. Check extension/app and try again.' });
        }
    }, [connected, wallet?.adapter?.name, select, connect, disconnect]);

    const [open, setOpen] = useState(false);
    useEffect(() => {
        const onReplace = () => setOpen(true);
        document.addEventListener('wallets:replace', onReplace);
        return () => document.removeEventListener('wallets:replace', onReplace);
    }, []);
    const hasVerified = useMemo(() => {
        if (!saved || !publicKey) return false;
        const a = publicKey.toBase58();
        return saved.some((w) => w.address === a && w.isVerified);
    }, [saved, publicKey]);

    if (!connected) {
        return (
            <>
                <Button className="h-8 rounded-md px-3 text-sm" onClick={() => setOpen(true)}>Connect Wallet</Button>
                <ConnectSheet
                    open={open}
                    onOpenChange={setOpen}
                    onSelectWallet={(name) => connectWallet(name)}
                />
            </>
        );
    }

    return (
        <div className="flex flex-wrap items-center gap-2">
            {address && <AddressChip address={address} />}
            {!hasVerified && (
                <Button disabled={verifying || !address} onClick={startVerification} className="h-8 rounded-md px-3 text-sm shrink-0">
                    {verifying ? 'Verifying…' : 'Verify & Save'}
                </Button>
            )}
            <Button variant="ghost" onClick={() => disconnect()} className="h-8 rounded-md px-3 text-sm shrink-0">
                Disconnect
            </Button>
        </div>
    );
}
