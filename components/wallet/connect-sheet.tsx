'use client';

import { useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletReadyState } from '@solana/wallet-adapter-base';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';

export function ConnectSheet({
    open,
    onOpenChange,
    onSelectWallet,
}: {
    open: boolean;
    onOpenChange: (v: boolean) => void;
    onSelectWallet: (name: string) => void;
}) {
    const { wallets } = useWallet();

    const isMobile = () => {
        if (typeof navigator === 'undefined') return false;
        return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    };

    const openInstall = (walletName: string) => {
        const uaIsMobile = isMobile();
        const href =
            walletName === 'Phantom'
                ? uaIsMobile
                    ? 'https://phantom.app/ul/'
                    : 'https://phantom.app/'
                : walletName === 'Solflare'
                    ? 'https://solflare.com/'
                    : 'https://solana.com/ecosystem/wallets';
        window.open(href, '_blank', 'noopener');
    };

    const openInPhantomApp = () => {
        try {
            const current = typeof window !== 'undefined' ? window.location.href : '';
            const link = `https://phantom.app/ul/browse/${encodeURIComponent(current)}`;
            window.location.href = link;
        } catch {
            window.open('https://phantom.app/', '_blank', 'noopener');
        }
    };

    const handlePick = useCallback(
        (name: string) => {
            const w = wallets.find((x) => x.adapter.name === name);
            const ready = w?.adapter.readyState;
            // If installed, proceed to connect
            if (ready === WalletReadyState.Installed || ready === WalletReadyState.Loadable) {
                onOpenChange(false);
                onSelectWallet(name);
                return;
            }

            // Mobile-friendly fallbacks
            if (name === 'Phantom' && isMobile()) {
                onOpenChange(false);
                openInPhantomApp();
                return;
            }

            openInstall(name);
        },
        [wallets, onOpenChange, onSelectWallet],
    );

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="bottom" className="sm:max-w-[520px]">
                <SheetHeader>
                    <SheetTitle>Connect a wallet</SheetTitle>
                    <SheetDescription>
                        Well ask you to sign a short message to verify ownership. No transaction will be created.
                    </SheetDescription>
                </SheetHeader>
                <div className="mt-4 grid grid-cols-1 gap-2">
                    {wallets.map((w) => (
                        <Button
                            key={w.adapter.name}
                            variant="outline"
                            className="h-10 justify-start gap-2"
                            onClick={() => handlePick(w.adapter.name)}
                        >
                            {w.adapter.icon && (
                                // @ts-ignore string src is allowed here
                                <img src={w.adapter.icon} alt="" className="size-5 rounded" />
                            )}
                            <span className="flex-1 text-left">{w.adapter.name}</span>
                            <span className="text-xs text-muted-foreground">
                                {w.adapter.readyState === WalletReadyState.Installed ? 'Installed' : isMobile() && w.adapter.name === 'Phantom' ? 'Open App' : 'Install'}
                            </span>
                        </Button>
                    ))}
                </div>
                <div className="mt-4 text-xs text-muted-foreground">
                    Network: {process.env.NEXT_PUBLIC_SOLANA_NETWORK || 'devnet'}
                </div>
            </SheetContent>
        </Sheet>
    );
}


