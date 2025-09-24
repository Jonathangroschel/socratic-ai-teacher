'use client';

import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { useMemo } from 'react';

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
    if (channel === 'discord') return finalUrl; // Discord has no web intent; open the link for manual paste
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
            alert('Link copied');
        } catch { }
    };

    const openChannel = (channel: ShareChannel) => {
        if (!safeUrl) return;
        const target = buildShareTargetUrl(safeUrl, channel);
        if (channel === 'email' || channel === 'sms') {
            window.location.href = target;
        } else {
            window.open(target, '_blank');
        }
    };

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="bottom" className="px-4 pb-5">
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


