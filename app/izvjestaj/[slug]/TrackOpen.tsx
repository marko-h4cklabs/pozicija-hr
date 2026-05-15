'use client';

import { useEffect } from 'react';

// Module-level set persists across React StrictMode's mount→unmount→remount
// cycle, so the second mount finds the slug already tracked and skips the fetch.
const tracked = new Set<string>();

export default function TrackOpen({ slug }: { slug: string }) {
  useEffect(() => {
    if (tracked.has(slug)) return;
    tracked.add(slug);
    fetch(`/api/track-open/${slug}`).catch(console.error);
  }, [slug]);

  return null;
}
