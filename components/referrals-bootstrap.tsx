'use client';

import { useEffect, useRef } from 'react';

export function ReferralAttributionBootstrap() {
  const fired = useRef(false);
  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    // fire-and-forget; safe idempotent endpoint
    fetch('/api/referrals/attribute-if-present', { method: 'POST', credentials: 'include' }).catch(() => {});
  }, []);
  return null;
}


