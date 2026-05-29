'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useDesign } from '@/lib/store';
import { LawnTrace } from '@/components/LawnTrace';
import { StepHeader } from '@/components/StepHeader';
import { StepFooter } from '@/components/StepFooter';
import { HeroPhotos } from '@/components/HeroPhotos';
import { staticMapUrl, type LatLng } from '@/lib/maps';

const TILE_WIDTH = 640;
const TILE_HEIGHT = 640;
const TILE_SCALE: 1 | 2 = 2;
const DEFAULT_ZOOM = 20;

export default function CapturePage() {
  const router = useRouter();
  const current = useDesign((s) => s.current);
  const setLawn = useDesign((s) => s.setLawn);
  const setHomeowner = useDesign((s) => s.setHomeowner);
  const addHeroPhoto = useDesign((s) => s.addHeroPhoto);
  const removeHeroPhoto = useDesign((s) => s.removeHeroPhoto);

  const [address, setAddress] = useState(current?.address ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [location, setLocation] = useState<LatLng | null>(null);
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  const [tracedSqft, setTracedSqft] = useState(0);

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';

  useEffect(() => {
    if (!current) router.replace('/discovery');
  }, [current, router]);

  const geocode = async () => {
    if (!address.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/geocode?address=${encodeURIComponent(address)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'lookup failed');
      setLocation(data.location);
      setHomeowner(current?.homeownerName ?? '', data.formattedAddress ?? address);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'lookup failed');
    } finally {
      setLoading(false);
    }
  };

  const onPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    const reader = new FileReader();
    reader.onload = () => {
      const id = crypto.randomUUID();
      try {
        localStorage.setItem(`heroPhoto:${id}`, reader.result as string);
        addHeroPhoto(id);
      } catch {
        setError('Photo too large for local storage. Try a smaller image.');
      }
    };
    reader.onerror = () => setError('Could not read photo file.');
    reader.readAsDataURL(file);
    // Reset input so the same file can be re-selected if needed.
    e.target.value = '';
  };

  if (!current) return null;

  const tileUrl =
    location && apiKey
      ? staticMapUrl(
          {
            center: location,
            zoom,
            widthPx: TILE_WIDTH,
            heightPx: TILE_HEIGHT,
            scale: TILE_SCALE,
          },
          apiKey,
        )
      : null;

  const hasLawn = !!current.lawnPolygon && current.lawnSqFt >= 50;

  return (
    <main className="min-h-screen flex flex-col">
      <StepHeader step={2} title="Walk & Capture" backHref="/discovery" />

      <section className="flex-1 px-6 sm:px-8 py-10 max-w-3xl mx-auto w-full space-y-10">
        <div>
          <p className="label">Address</p>
          <div className="mt-3 flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="123 Main St, Austin TX"
              className="input flex-1"
            />
            <button onClick={geocode} disabled={loading} className="btn-secondary px-5">
              {loading ? 'Loading…' : 'Load satellite'}
            </button>
          </div>
          {error && (
            <p className="mt-2 text-[13px] text-danger">{error}</p>
          )}
          {!apiKey && (
            <p className="mt-2 text-[13px] text-ink-muted">
              Google Maps key not available in this environment. Set
              <code className="font-mono"> NEXT_PUBLIC_GOOGLE_MAPS_API_KEY </code>
              and redeploy.
            </p>
          )}
        </div>

        {tileUrl && location && (
          <div>
            <div className="flex items-baseline justify-between mb-3">
              <p className="label">Trace the lawn</p>
              <div className="text-right">
                <span className="display text-2xl tabular-nums">
                  {Math.round(tracedSqft).toLocaleString()}
                </span>
                <span className="ml-1 text-[13px] text-ink-muted">sq ft</span>
              </div>
            </div>

            <LawnTrace
              imageUrl={tileUrl}
              widthPx={TILE_WIDTH}
              heightPx={TILE_HEIGHT}
              centerLat={location.lat}
              zoom={zoom}
              scale={TILE_SCALE}
              initialVertices={[]}
              onChange={({ vertices, polygon, sqft }) => {
                setTracedSqft(sqft);
                setLawn(polygon, sqft, vertices);
              }}
            />

            <div className="mt-4 flex items-center gap-3 text-[13px]">
              <span className="text-ink-muted">Zoom</span>
              <button
                onClick={() => setZoom((z) => Math.max(17, z - 1))}
                className="chip"
                disabled={zoom <= 17}
              >
                −
              </button>
              <span className="tabular-nums font-medium">{zoom}</span>
              <button
                onClick={() => setZoom((z) => Math.min(21, z + 1))}
                className="chip"
                disabled={zoom >= 21}
              >
                +
              </button>
            </div>
          </div>
        )}

        <div>
          <p className="label">Hero photo</p>
          <p className="mt-1 text-[13px] text-ink-muted">
            From the patio looking at the yard. Used for the final render.
          </p>

          <HeroPhotos ids={current.heroPhotoIds} onRemove={removeHeroPhoto} />

          <label className="mt-4 btn-secondary inline-flex cursor-pointer">
            {current.heroPhotoIds.length > 0 ? 'Add another photo' : 'Take or select photo'}
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={onPhoto}
            />
          </label>
        </div>
      </section>

      <StepFooter
        primaryLabel="Continue"
        primaryDisabled={!hasLawn}
        onPrimary={() => router.push('/plan')}
        hint={hasLawn ? undefined : 'Trace the lawn to continue'}
      />
    </main>
  );
}
