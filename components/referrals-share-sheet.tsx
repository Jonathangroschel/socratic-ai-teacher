'use client';

import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { useMemo } from 'react';
import { toast } from '@/components/toast';

export type ShareChannel = 'reddit' | 'x' | 'discord' | 'email' | 'sms' | 'copy';

function buildShareTargetUrl(baseUrl: string, channel: ShareChannel): string {
    const u = new URL(baseUrl);
    u.searchParams.set('utm_source', channel);
    const finalUrl = u.toString();

    const text = 'Learn & earn 50k points on Polymatic';
    if (channel === 'reddit') return `https://www.reddit.com/submit?url=${encodeURIComponent(finalUrl)}&title=${encodeURIComponent(text)}`;
    if (channel === 'x') return `https://x.com/intent/post?url=${encodeURIComponent(finalUrl)}&text=${encodeURIComponent(text)}`;
    if (channel === 'email') return `mailto:?subject=${encodeURIComponent('Join me on Polymatic')}&body=${encodeURIComponent(finalUrl)}`;
    if (channel === 'sms') return `sms:?&body=${encodeURIComponent(finalUrl)}`;
    if (channel === 'discord') return finalUrl; // handled specially
    return finalUrl;
}

export function ReferralsShareSheet({
    open,
    onOpenChange,
    url,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    url: string | null;
}) {
    const safeUrl = useMemo(() => url ?? '', [url]);

    const doCopy = async () => {
        if (!safeUrl) return;
        try {
            await navigator.clipboard.writeText(safeUrl);
            toast({ type: 'success', description: 'Link copied' });
            try {
                await fetch('/api/analytics/referrals', {
                    method: 'POST',
                    headers: { 'content-type': 'application/json' },
                    body: JSON.stringify({ event: 'referral_link_copied' }),
                });
            } catch { }
        } catch {
            toast({ type: 'error', description: 'Unable to copy' });
        }
    };

    const openChannel = (channel: ShareChannel) => {
        if (!safeUrl) return;
        if (channel === 'discord') {
            // Copy link then attempt to open Discord app; fall back to web
            navigator.clipboard.writeText(safeUrl).catch(() => { });
            toast({ type: 'success', description: 'Link copied — paste in Discord' });
            try {
                const deepLink = 'discord://-/channels/@me';
                const opened = window.open(deepLink, '_blank');
                // Fallback to web if blocked or not installed
                setTimeout(() => {
                    try {
                        if (!opened || opened.closed) {
                            window.open('https://discord.com/channels/@me', '_blank');
                        }
                    } catch {
                        window.open('https://discord.com/channels/@me', '_blank');
                    }
                }, 500);
            } catch {
                window.open('https://discord.com/channels/@me', '_blank');
            }
        } else {
            const target = buildShareTargetUrl(safeUrl, channel);
            if (channel === 'email' || channel === 'sms') {
                window.location.href = target;
            } else {
                window.open(target, '_blank');
            }
        }
        // Analytics (best-effort)
        fetch('/api/analytics/referrals', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ event: 'referral_shared', channel }),
        }).catch(() => { });
    };

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent
                side="bottom"
                className="px-4 pb-5 sm:inset-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-full sm:max-w-xl sm:rounded-xl sm:border sm:px-6 sm:py-5 sm:shadow-xl"
            >
                <SheetHeader>
                    <SheetTitle className="text-center">Share with friends</SheetTitle>
                </SheetHeader>
                <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5">
                    <Button variant="outline" className="h-9" onClick={() => openChannel('x')}>X</Button>
                    <Button variant="outline" className="h-9" onClick={() => openChannel('reddit')}>Reddit</Button>
                    <Button variant="outline" className="h-9" onClick={() => openChannel('discord')}>Discord</Button>
                    <Button variant="outline" className="h-9" onClick={() => openChannel('email')}>Email</Button>
                    <Button variant="outline" className="h-9" onClick={() => openChannel('sms')}>SMS</Button>
                </div>
                <div className="mt-4 flex items-center gap-2">
                    <div className="flex-1 truncate rounded-md border bg-muted/30 px-3 py-2 text-xs text-muted-foreground" title={safeUrl}>{safeUrl || 'Generate your link first'}</div>
                    <Button size="sm" className="h-8" onClick={doCopy}>Copy</Button>
                </div>
            </SheetContent>
        </Sheet>
    );
}


