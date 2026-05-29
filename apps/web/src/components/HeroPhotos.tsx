'use client';

import { useEffect, useState } from 'react';

export function HeroPhotos({ ids, onRemove }: { ids: string[]; onRemove: (id: string) => void }) {
  const [urls, setUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    const next: Record<string, string> = {};
    for (const id of ids) {
      const data = typeof window !== 'undefined' ? localStorage.getItem(`heroPhoto:${id}`) : null;
      if (data) next[id] = data;
    }
    setUrls(next);
  }, [ids]);

  if (ids.length === 0) return null;

  return (
    <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
      {ids.map((id) => (
        <div
          key={id}
          className="relative aspect-square rounded-lg overflow-hidden border border-line bg-surface-sunken"
        >
          {urls[id] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={urls[id]} alt="Hero" className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-[12px] text-ink-subtle">
              Loading…
            </div>
          )}
          <button
            onClick={() => onRemove(id)}
            aria-label="Remove photo"
            className="absolute top-2 right-2 h-7 w-7 rounded-full bg-ink/80 text-surface text-[14px] leading-none flex items-center justify-center"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
