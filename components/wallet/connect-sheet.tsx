'use client';

import { useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
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

    const handlePick = useCallback(
        (name: string) => {
            onOpenChange(false);
            onSelectWallet(name);
        },
        [onOpenChange, onSelectWallet],
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


