'use client';

import React, { useMemo } from 'react';
import { clusterApiUrl } from '@solana/web3.js';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-phantom';
import { SolflareWalletAdapter } from '@solana/wallet-adapter-solflare';
import { BackpackWalletAdapter } from '@solana/wallet-adapter-backpack';

function getEndpoint(): string {
    const network = (process.env.NEXT_PUBLIC_SOLANA_NETWORK || 'devnet').toLowerCase();
    const custom = process.env.NEXT_PUBLIC_SOLANA_RPC;
    if (custom && custom.trim().length > 0) return custom.trim();
    if (network === 'mainnet' || network === 'mainnet-beta') return clusterApiUrl('mainnet-beta');
    if (network === 'testnet') return clusterApiUrl('testnet');
    return clusterApiUrl('devnet');
}

export function SolanaProvider({ children }: { children: React.ReactNode }) {
    const endpoint = useMemo(() => getEndpoint(), []);
    const network = (process.env.NEXT_PUBLIC_SOLANA_NETWORK || 'devnet').toLowerCase();
    const wallets = useMemo(() => {
        return [
            new PhantomWalletAdapter(),
            new SolflareWalletAdapter({ network: network === 'mainnet' ? 'mainnet-beta' : (network as any) }),
            new BackpackWalletAdapter(),
        ];
    }, [network]);

    // Use Wallet Standard discovery by default. If we need explicit adapters later, we can add them.
    return (
        <ConnectionProvider endpoint={endpoint} config={{ commitment: 'confirmed' }}>
            <WalletProvider wallets={wallets}>
                {children}
            </WalletProvider>
        </ConnectionProvider>
    );
}


