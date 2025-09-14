'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Button } from '@/components/ui/button';
import bs58 from 'bs58';
import { ConnectSheet } from './connect-sheet';
import { AddressChip } from './address-chip';
import { toast } from '@/components/toast';
import { useSession } from 'next-auth/react';

function isMobile() {
    if (typeof navigator === 'undefined') return false;
    return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

export function ConnectWallet({ saved }: { saved?: Array<{ id?: string; address: string; isVerified: boolean; isPrimary?: boolean }> }) {
    const { data } = useSession();
    const isGuest = data?.user?.type === 'guest';
    const { connected, wallet, publicKey, wallets, select, connect, disconnect, connecting, signMessage } = useWallet();
    const [verifying, setVerifying] = useState(false);
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
        if (isGuest) {
            toast({ type: 'error', description: 'Sign up to connect a wallet.' });
            return;
        }
        try {
            // If already connected to another wallet, disconnect first
            if (connected && wallet?.adapter?.name !== name) {
                await disconnect();
            }
            const target = wallets.find((w) => w.adapter.name === name)?.adapter;
            await select(name as any);
            // Let provider update selected wallet this tick
            await Promise.resolve();
            if (target?.connect) {
                await target.connect();
            } else {
                await connect();
            }
            // No auto-reconnect persistence; only connect on explicit user action
        } catch (e) {
            toast({ type: 'error', description: 'Unable to open wallet. Check extension/app and try again.' });
        }
    }, [connected, wallet?.adapter?.name, select, connect, disconnect, wallets, isGuest]);

    const [open, setOpen] = useState(false);
    useEffect(() => {
        const onReplace = () => setOpen(true);
        document.addEventListener('wallets:replace', onReplace);
        return () => document.removeEventListener('wallets:replace', onReplace);
    }, []);
    const hasVerified = useMemo(() => {
        if (!publicKey) return false;
        const a = publicKey.toBase58();
        return saved?.some((w) => w.address === a && w.isVerified) || false;
    }, [saved, publicKey]);

    const savedPrimary = useMemo(() => {
        return saved?.find((w) => w.isPrimary) || saved?.[0] || undefined;
    }, [saved]);

    const displayAddress = useMemo(() => {
        if (connected && publicKey) return publicKey.toBase58();
        if (!connected && savedPrimary?.address) return savedPrimary.address;
        return null;
    }, [connected, publicKey, savedPrimary]);

    // Auto-reconnect disabled: never initiate a connection without explicit user action

    return (
        <div className="flex flex-wrap items-center gap-2">
            {displayAddress && (
                <div className="flex items-center gap-2">
                    <AddressChip address={displayAddress} />
                </div>
            )}
            {connected && !hasVerified && (
                <Button disabled={verifying || !address} onClick={startVerification} className="h-8 rounded-md px-3 text-sm shrink-0">
                    {verifying ? 'Verifying…' : 'Verify & Save'}
                </Button>
            )}
            {connected ? (
                <Button
                    variant="ghost"
                    onClick={async () => {
                        try {
                            const current = publicKey?.toBase58();
                            await disconnect();
                            try {
                                if (typeof window !== 'undefined') {
                                    localStorage.removeItem('solana:autoReconnect');
                                    localStorage.removeItem('solana:lastAdapter');
                                }
                            } catch { }
                            // Attempt to remove saved wallet that matches current or primary
                            const target = saved?.find((w) => w.address === current) || saved?.find((w) => w.isPrimary);
                            if (target?.id) {
                                await fetch(`/api/wallets/${target.id}`, { method: 'DELETE' });
                                document.dispatchEvent(new CustomEvent('wallets:changed'));
                            }
                        } catch { }
                    }}
                    className="h-8 rounded-md px-3 text-sm shrink-0"
                >
                    Disconnect
                </Button>
            ) : (
                savedPrimary ? (
                    <Button
                        variant="ghost"
                        onClick={async () => {
                            try {
                                try {
                                    if (typeof window !== 'undefined') {
                                        localStorage.removeItem('solana:autoReconnect');
                                        localStorage.removeItem('solana:lastAdapter');
                                    }
                                } catch { }
                                if (savedPrimary?.id) {
                                    await fetch(`/api/wallets/${savedPrimary.id}`, { method: 'DELETE' });
                                    document.dispatchEvent(new CustomEvent('wallets:changed'));
                                }
                            } catch { }
                        }}
                        className="h-8 rounded-md px-3 text-sm shrink-0"
                    >
                        Disconnect
                    </Button>
                ) : (
                    <>
                        <Button className="h-8 rounded-md px-3 text-sm" onClick={() => {
                            if (isGuest) {
                                toast({ type: 'error', description: 'Sign up to connect a wallet.' });
                                return;
                            }
                            setOpen(true);
                        }}>Connect Wallet</Button>
                        <ConnectSheet
                            open={open}
                            onOpenChange={setOpen}
                            onSelectWallet={(name) => connectWallet(name)}
                        />
                    </>
                )
            )}
        </div>
    );
}
