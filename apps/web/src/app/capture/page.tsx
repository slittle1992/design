'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useDesign } from '@/lib/store';
import { LawnTrace } from '@/components/LawnTrace';
import { staticMapUrl, type LatLng } from '@/lib/maps';

const TILE_WIDTH = 640;
const TILE_HEIGHT = 640;
const TILE_SCALE: 1 | 2 = 2; // retina; logical 640x640 with 1280x1280 pixel res
const DEFAULT_ZOOM = 20;

export default function CapturePage() {
  const router = useRouter();
  const current = useDesign((s) => s.current);
  const setLawn = useDesign((s) => s.setLawn);
  const setHomeowner = useDesign((s) => s.setHomeowner);
  const setHeroPhoto = useDesign((s) => s.addHeroPhoto);

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
    const reader = new FileReader();
    reader.onload = () => {
      const id = crypto.randomUUID();
      try {
        localStorage.setItem(`heroPhoto:${id}`, reader.result as string);
        setHeroPhoto(id);
      } catch {
        setError('Photo too large for local storage. Compress and retry.');
      }
    };
    reader.readAsDataURL(file);
  };

  const onContinue = () => {
    router.push('/plan');
  };

  if (!current) return null;

  const tileUrl = location && apiKey
    ? staticMapUrl(
        { center: location, zoom, widthPx: TILE_WIDTH, heightPx: TILE_HEIGHT, scale: TILE_SCALE },
        apiKey,
      )
    : null;

  return (
    <main className="min-h-screen bg-cream text-field-darker pb-32">
      <header className="bg-field text-cream px-6 py-4 flex items-center justify-between border-b-4 border-field-darker">
        <button onClick={() => router.push('/discovery')} className="text-xl font-bold">
          ←
        </button>
        <h1 className="text-2xl font-display font-black">Walk & Capture</h1>
        <span className="text-sm font-semibold opacity-80">2 / 8</span>
      </header>

      <section className="p-6 max-w-3xl mx-auto space-y-6">
        <div className="card space-y-4">
          <h2 className="text-2xl font-display font-black">Address</h2>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="123 Main St, Austin TX"
              className="flex-1 min-h-tap-md rounded-2xl border-4 border-field-darker bg-cream px-4 text-xl font-semibold focus:outline-none focus:border-field"
            />
            <button onClick={geocode} disabled={loading} className="btn-primary text-xl min-h-tap-md">
              {loading ? 'Loading…' : 'Load Satellite'}
            </button>
          </div>
          {error && <p className="text-red-700 font-bold">{error}</p>}
          {!apiKey && (
            <p className="text-sm font-semibold opacity-70">
              Set <code>NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> in{' '}
              <code>apps/web/.env.local</code> to load satellite imagery.
            </p>
          )}
        </div>

        {tileUrl && location && (
          <div className="card space-y-4">
            <div className="flex items-baseline justify-between">
              <h2 className="text-2xl font-display font-black">Trace the lawn</h2>
              <div className="text-right">
                <div className="text-3xl font-display font-black tabular-nums">
                  {Math.round(tracedSqft).toLocaleString()}
                </div>
                <div className="text-sm font-semibold opacity-70">sq ft</div>
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

            <div className="flex items-center gap-3">
              <span className="font-semibold">Zoom</span>
              <button
                onClick={() => setZoom((z) => Math.max(17, z - 1))}
                className="pill"
                disabled={zoom <= 17}
              >
                −
              </button>
              <span className="font-bold tabular-nums">{zoom}</span>
              <button
                onClick={() => setZoom((z) => Math.min(21, z + 1))}
                className="pill"
                disabled={zoom >= 21}
              >
                +
              </button>
            </div>
          </div>
        )}

        <div className="card space-y-3">
          <h2 className="text-2xl font-display font-black">Hero photo</h2>
          <p className="text-base font-semibold opacity-70">
            One photo from the patio looking at the yard. Used for the final render.
          </p>
          <label className="btn-secondary text-xl min-h-tap-md inline-flex w-full sm:w-auto cursor-pointer">
            {current.heroPhotoIds.length > 0
              ? `${current.heroPhotoIds.length} photo${current.heroPhotoIds.length > 1 ? 's' : ''} captured ✓ — add another`
              : 'Take / select photo'}
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

      <footer className="fixed bottom-0 inset-x-0 bg-cream border-t-4 border-field-darker p-4 flex justify-end">
        <button
          disabled={!current.lawnPolygon || current.lawnSqFt < 50}
          onClick={onContinue}
          className="btn-primary text-2xl min-h-tap-lg w-full max-w-sm disabled:opacity-40 disabled:active:scale-100"
        >
          Continue →
        </button>
      </footer>
    </main>
  );
}
