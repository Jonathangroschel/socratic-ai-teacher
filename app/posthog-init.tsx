'use client';

// Import the generated PostHog client initializer so it's executed on the client.
// This ensures posthog-js is initialized early and pageviews are captured.
import '../instrumentation-client';

export default function PostHogInit() {
    return null;
}


