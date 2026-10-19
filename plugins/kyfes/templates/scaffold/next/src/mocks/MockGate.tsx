'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { startMockWorker } from './browser';

/** Renders children once the MSW service worker intercepts /api (dev + NEXT_PUBLIC_API_MOCKS). */
export default function MockGate({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let active = true;
    void startMockWorker().then(() => {
      if (active) setReady(true);
    });
    return () => {
      active = false;
    };
  }, []);
  return ready ? <>{children}</> : null;
}
