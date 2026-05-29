'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useDesign, CUTOUT_LABELS, type CutoutKind } from '@/lib/store';
import { LawnTrace, type EditableShape } from '@/components/LawnTrace';
import { StepHeader } from '@/components/StepHeader';
import { StepFooter } from '@/components/StepFooter';
import { HeroPhotos } from '@/components/HeroPhotos';
import { staticMapUrl, type LatLng } from '@/lib/maps';
import { resizeImageToDataUrl } from '@/lib/image';

const TILE_WIDTH = 640;
const TILE_HEIGHT = 640;
const TILE_SCALE: 1 | 2 = 2;
const DEFAULT_ZOOM = 20;
const LAWN_ID = 'lawn';

const CUTOUT_OPTIONS: CutoutKind[] = ['pool', 'flower-bed', 'tree', 'patio', 'equipment', 'other'];

export default function CapturePage() {
  const router = useRouter();
  const current = useDesign((s) => s.current);
  const setLawn = useDesign((s) => s.setLawn);
  const setLawnClosed = useDesign((s) => s.setLawnClosed);
  const setHomeowner = useDesign((s) => s.setHomeowner);
  const addCutout = useDesign((s) => s.addCutout);
  const updateCutout = useDesign((s) => s.updateCutout);
  const setCutoutKind = useDesign((s) => s.setCutoutKind);
  const setCutoutClosed = useDesign((s) => s.setCutoutClosed);
  const removeCutout = useDesign((s) => s.removeCutout);
  const addHeroPhoto = useDesign((s) => s.addHeroPhoto);
  const removeHeroPhoto = useDesign((s) => s.removeHeroPhoto);

  const [address, setAddress] = useState(current?.address ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [location, setLocation] = useState<LatLng | null>(null);
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  const [photoSaving, setPhotoSaving] = useState(false);
  const [activeId, setActiveId] = useState<string>(LAWN_ID);
  const [smooth, setSmooth] = useState(true);

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

  const onPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setError(null);
    setPhotoSaving(true);
    try {
      const dataUrl = await resizeImageToDataUrl(file, 1600, 0.85);
      const id = crypto.randomUUID();
      try {
        localStorage.setItem(`heroPhoto:${id}`, dataUrl);
      } catch {
        throw new Error('Out of local storage space. Remove a photo and try again.');
      }
      addHeroPhoto(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save photo.');
    } finally {
      setPhotoSaving(false);
    }
  };

  const handleAddCutout = (kind: CutoutKind) => {
    const id = addCutout(kind);
    setActiveId(id);
  };

  const handleRemoveCutout = (id: string) => {
    removeCutout(id);
    if (activeId === id) setActiveId(LAWN_ID);
  };

  const handleShapeClose = (id: string) => {
    if (id === LAWN_ID) {
      setLawnClosed(true);
    } else {
      setCutoutClosed(id, true);
      // After closing a cutout, return focus to the lawn so the rep sees the
      // comparison naturally.
      setActiveId(LAWN_ID);
    }
  };

  // Existing designs from before this feature have `closed` undefined; treat
  // those as already-closed since they were drawn in the old auto-fill UX.
  const lawnClosed = current?.lawnClosed ?? true;
  const lawnVertices = current?.lawnVertices ?? [];
  const cutouts = current?.cutouts ?? [];

  const lawnShape: EditableShape = useMemo(
    () => ({
      id: LAWN_ID,
      kind: 'lawn',
      closed: lawnClosed,
      vertices: lawnVertices,
    }),
    [lawnClosed, lawnVertices],
  );
  const cutoutShapes: EditableShape[] = useMemo(
    () =>
      cutouts.map((c) => ({
        id: c.id,
        kind: 'cutout',
        label: CUTOUT_LABELS[c.kind],
        closed: c.closed ?? true,
        vertices: c.vertices,
      })),
    [cutouts],
  );

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

  const grossSqft = current.lawnSqFt;
  const cutoutTotalSqft = current.cutouts.reduce(
    (sum, c) => sum + polyAreaFt(c.polygonFt),
    0,
  );
  const netSqft = Math.max(0, grossSqft - cutoutTotalSqft);
  const hasLawn = !!current.lawnPolygon && lawnClosed && netSqft >= 50;

  const activeShape = activeId === LAWN_ID ? lawnShape : cutoutShapes.find((s) => s.id === activeId);

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
          {error && <p className="mt-2 text-[13px] text-danger">{error}</p>}
          {!apiKey && (
            <p className="mt-2 text-[13px] text-ink-muted">
              Google Maps key not available. Set
              <code className="font-mono"> NEXT_PUBLIC_GOOGLE_MAPS_API_KEY </code>and redeploy.
            </p>
          )}
        </div>

        {tileUrl && location && (
          <div>
            <div className="flex items-baseline justify-between mb-3">
              <div>
                <p className="label">
                  {activeShape?.kind === 'lawn' ? 'Trace the lawn' : `Mark ${activeShape?.label}`}
                </p>
                <p className="text-[13px] text-ink-muted mt-1">
                  {activeShape?.kind === 'cutout'
                    ? 'Lawn outline hidden so you can focus on what to subtract.'
                    : current.cutouts.length > 0
                      ? `${current.cutouts.length} cutout${current.cutouts.length === 1 ? '' : 's'} marked`
                      : 'Tap the corners of the lawn'}
                </p>
              </div>
              <div className="text-right">
                <span className="display text-2xl tabular-nums">
                  {Math.round(netSqft).toLocaleString()}
                </span>
                <span className="ml-1 text-[13px] text-ink-muted">sq ft net</span>
              </div>
            </div>

            <LawnTrace
              imageUrl={tileUrl}
              widthPx={TILE_WIDTH}
              heightPx={TILE_HEIGHT}
              centerLat={location.lat}
              zoom={zoom}
              scale={TILE_SCALE}
              lawn={lawnShape}
              cutouts={cutoutShapes}
              activeId={activeId}
              onActiveChange={setActiveId}
              smooth={smooth}
              onSmoothChange={setSmooth}
              onShapeChange={({ id, vertices, polygonFt, sqft }) => {
                if (id === LAWN_ID) {
                  setLawn(polygonFt, sqft, vertices);
                } else {
                  updateCutout(id, vertices, polygonFt);
                }
              }}
              onShapeClose={handleShapeClose}
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

            {/* Comparison math — lawn minus cutouts = real estimate. */}
            {lawnClosed && grossSqft > 0 && (
              <div className="mt-6 rounded-xl border border-line p-4 bg-surface-soft">
                <p className="label">Best estimate</p>
                <div className="mt-3 space-y-1 font-mono text-[14px] tabular-nums">
                  <Row label="Lawn outline" value={`${Math.round(grossSqft).toLocaleString()} sq ft`} />
                  {current.cutouts
                    .filter((c) => (c.closed ?? true) && polyAreaFt(c.polygonFt) > 0)
                    .map((c) => (
                      <Row
                        key={c.id}
                        label={`− ${CUTOUT_LABELS[c.kind]}`}
                        value={`${Math.round(polyAreaFt(c.polygonFt)).toLocaleString()} sq ft`}
                      />
                    ))}
                  <div className="border-t border-line pt-2 mt-2 font-semibold">
                    <Row label="Net turf area" value={`${Math.round(netSqft).toLocaleString()} sq ft`} />
                  </div>
                </div>
              </div>
            )}

            <div className="mt-8">
              <div className="flex items-center justify-between">
                <p className="label">What we work around</p>
                <button
                  onClick={() => setActiveId(LAWN_ID)}
                  className={`chip ${activeId === LAWN_ID ? 'chip-selected' : ''}`}
                >
                  Edit lawn
                </button>
              </div>
              <p className="text-[13px] text-ink-muted mt-1">
                Pools, beds, trees, patios, AC pads — anything we don&apos;t turf over.
              </p>

              {current.cutouts.length > 0 && (
                <div className="mt-3 space-y-2">
                  {current.cutouts.map((c) => {
                    const isActive = activeId === c.id;
                    const sqft = polyAreaFt(c.polygonFt);
                    const closed = c.closed ?? true;
                    return (
                      <div
                        key={c.id}
                        className={`flex items-center gap-3 rounded-lg border p-3 ${
                          isActive ? 'border-ink bg-surface-soft' : 'border-line'
                        }`}
                      >
                        <select
                          value={c.kind}
                          onChange={(e) => setCutoutKind(c.id, e.target.value as CutoutKind)}
                          className="rounded-md border border-line bg-surface px-2 py-1 text-[14px] font-medium"
                        >
                          {CUTOUT_OPTIONS.map((k) => (
                            <option key={k} value={k}>
                              {CUTOUT_LABELS[k]}
                            </option>
                          ))}
                        </select>
                        <span className="text-[13px] text-ink-muted tabular-nums flex-1">
                          {!closed
                            ? 'drawing…'
                            : sqft > 0
                              ? `${Math.round(sqft)} sq ft`
                              : 'not drawn'}
                        </span>
                        <button
                          onClick={() => setActiveId(c.id)}
                          disabled={isActive}
                          className="chip text-[12px] disabled:opacity-40"
                        >
                          {isActive ? 'Editing' : 'Edit'}
                        </button>
                        <button onClick={() => handleRemoveCutout(c.id)} className="chip text-[12px]">
                          ×
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="mt-3 flex flex-wrap gap-2">
                {CUTOUT_OPTIONS.map((k) => (
                  <button key={k} onClick={() => handleAddCutout(k)} className="chip text-[12px]">
                    + {CUTOUT_LABELS[k]}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        <div>
          <p className="label">Hero photo</p>
          <p className="mt-1 text-[13px] text-ink-muted">
            From the patio looking at the yard. Used for the final render.
          </p>

          <HeroPhotos ids={current.heroPhotoIds} onRemove={removeHeroPhoto} />

          <div className="mt-4 flex items-center gap-3">
            <label
              className={`btn-secondary inline-flex cursor-pointer ${
                photoSaving ? 'opacity-60 pointer-events-none' : ''
              }`}
            >
              {photoSaving
                ? 'Saving…'
                : current.heroPhotoIds.length > 0
                  ? 'Add another photo'
                  : 'Take or select photo'}
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={onPhoto}
                disabled={photoSaving}
              />
            </label>
            {current.heroPhotoIds.length > 0 && !photoSaving && (
              <span className="text-[13px] text-ink-muted">
                {current.heroPhotoIds.length} saved
              </span>
            )}
          </div>
        </div>
      </section>

      <StepFooter
        primaryLabel="Continue"
        primaryDisabled={!hasLawn}
        onPrimary={() => router.push('/plan')}
        hint={
          !current.lawnPolygon || lawnVertices.length === 0
            ? 'Trace the lawn to continue'
            : !lawnClosed
              ? 'Tap "Done" on the lawn to continue'
              : undefined
        }
      />
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

function polyAreaFt(poly: { x: number; y: number }[]): number {
  if (poly.length < 3) return 0;
  let sum = 0;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i]!;
    const b = poly[(i + 1) % poly.length]!;
    sum += a.x * b.y - b.x * a.y;
  }
  return Math.abs(sum) / 2;
}
