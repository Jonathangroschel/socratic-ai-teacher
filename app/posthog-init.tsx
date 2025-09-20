'use client';

import { useEffect } from 'react';

export default function PostHogInit() {
    useEffect(() => {
        // Only run in the browser to avoid SSR/edge errors (self/window undefined)
        let mounted = true;
        (async () => {
            try {
                const posthogModule = await import('posthog-js');
                const posthog = posthogModule.default;
                if (!mounted) return;
                if (!posthog.__loaded) {
                    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY as string, {
                        api_host: '/ingest',
                        ui_host: 'https://eu.posthog.com',
                        capture_exceptions: true,
                        debug: process.env.NODE_ENV === 'development',
                    });
                }
            } catch (_) { }
        })();
        return () => {
            mounted = false;
        };
    }, []);

    return null;
}


