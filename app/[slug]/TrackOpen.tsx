'use client';

import { useEffect } from 'react';

// Module-level Set persists for the lifetime of the browser tab.
// Survives React StrictMode's double-mount and any re-renders.
const tracked = new Set<string>();

export default function TrackOpen({ slug }: { slug: string }) {
  useEffect(() => {
    if (tracked.has(slug)) return;
    tracked.add(slug);
    fetch(`/api/track-open/${slug}`).catch(console.error);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
