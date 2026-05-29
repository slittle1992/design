'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { CUTOUT_LABELS, netLawnSqFt, useDesign } from '@/lib/store';
import { StepHeader } from '@/components/StepHeader';
import { StepFooter } from '@/components/StepFooter';
import { ArchPlan } from '@/components/ArchPlan';
import { TURF_BY_ID } from '@/lib/skus';
import { buildQuote } from '@/lib/pricing';
import { findMinWasteLayout } from '@homefield/geometry';

export default function RevealPage() {
  const router = useRouter();
  const current = useDesign((s) => s.current);

  useEffect(() => {
    if (!current) router.replace('/');
    else if (!current.lawnPolygon || !current.turfId) router.replace('/turf');
  }, [current, router]);

  const [rendering, setRendering] = useState(false);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [renderedDataUrl, setRenderedDataUrl] = useState<string | null>(null);
  const [heroPhotoUrl, setHeroPhotoUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!current || current.heroPhotoIds.length === 0) return;
    const firstId = current.heroPhotoIds[0]!;
    setHeroPhotoUrl(localStorage.getItem(`heroPhoto:${firstId}`));
  }, [current]);

  const net = useMemo(() => (current ? netLawnSqFt(current) : 0), [current]);

  const layout = useMemo(() => {
    if (!current?.lawnPolygon) return null;
    const cutoutPolys = current.cutouts
      .filter((c) => (c.closed ?? true) && c.polygonFt.length >= 3)
      .map((c) => c.polygonFt);
    return findMinWasteLayout(current.lawnPolygon, 14, 5, cutoutPolys);
  }, [current?.lawnPolygon, current?.cutouts]);

  const cutoutsForRender = useMemo(
    () =>
      (current?.cutouts ?? [])
        .filter((c) => c.polygonFt.length >= 3)
        .map((c) => ({
          id: c.id,
          polygonFt: c.polygonFt,
          label: CUTOUT_LABELS[c.kind],
        })),
    [current?.cutouts],
  );

  const quote = useMemo(() => {
    if (!current) return null;
    return buildQuote({
      netTurfSqFt: net,
      turfId: current.turfId,
      rockSqFt: current.rockSqFt,
      featureZones: current.featureZones,
      edgingKind: current.edgingKind,
      edgingLinearFt: current.edgingLinearFt,
    });
  }, [current, net]);

  if (!current?.turfId) return null;
  const turf = TURF_BY_ID[current.turfId];

  const generateRender = async () => {
    if (!heroPhotoUrl) {
      setRenderError('No hero photo found. Go back to Capture and add one.');
      return;
    }
    setRendering(true);
    setRenderError(null);
    try {
      const res = await fetch('/api/render', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          photoDataUrl: heroPhotoUrl,
          turfName: turf.customerName,
          rockSqFt: current.rockSqFt,
          netSqFt: net,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'render failed');
      setRenderedDataUrl(data.imageDataUrl);
    } catch (e) {
      setRenderError(e instanceof Error ? e.message : 'render failed');
    } finally {
      setRendering(false);
    }
  };

  const downloadPlan = () => {
    window.print();
  };

  return (
    <main className="min-h-screen flex flex-col">
      <StepHeader step={8} title="Reveal" backHref="/design" />

      <section className="flex-1 px-6 sm:px-8 py-10 max-w-3xl mx-auto w-full space-y-10">
        <div>
          <p className="label">For {current.homeownerName || 'the homeowner'}</p>
          <h1 className="display text-3xl sm:text-4xl mt-2">Their new yard.</h1>
        </div>

        {/* Architectural top-down */}
        <div>
          <p className="label mb-3">Plan view</p>
          <ArchPlan polygon={current.lawnPolygon!} cutouts={cutoutsForRender} layout={layout} />
        </div>

        {/* Nano Banana render */}
        <div>
          <p className="label mb-3">Photorealistic render</p>
          {heroPhotoUrl ? (
            <div className="rounded-xl border border-line overflow-hidden">
              {renderedDataUrl ? (
                <div className="grid grid-cols-2 divide-x divide-line">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={heroPhotoUrl} alt="Before" className="w-full aspect-square object-cover" />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={renderedDataUrl} alt="After" className="w-full aspect-square object-cover" />
                </div>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={heroPhotoUrl} alt="Hero" className="w-full max-h-[480px] object-cover" />
              )}
              <div className="flex items-center justify-between p-3 border-t border-line">
                <span className="text-[12px] text-ink-muted">
                  {renderedDataUrl ? 'Before · After' : 'Source photo'}
                </span>
                <button
                  onClick={generateRender}
                  disabled={rendering}
                  className="btn-secondary"
                >
                  {rendering
                    ? 'Rendering…'
                    : renderedDataUrl
                      ? 'Regenerate'
                      : 'Generate render'}
                </button>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-line p-8 text-center text-[13px] text-ink-muted">
              No hero photo. Go back to Capture and add one to enable the render.
            </div>
          )}
          {renderError && <p className="mt-2 text-[13px] text-danger">{renderError}</p>}
        </div>

        {/* Final estimate + coverage */}
        {quote && (
          <div className="rounded-xl border-2 border-ink p-5">
            <div className="flex items-baseline justify-between">
              <p className="label">Estimate</p>
              <p className="display text-3xl tabular-nums">
                ${Math.round(quote.total).toLocaleString()}
              </p>
            </div>
            <div className="mt-4 space-y-1.5 text-[13px] font-mono tabular-nums">
              {quote.lineItems.map((item, i) => (
                <div key={i} className="flex justify-between gap-3">
                  <span className="truncate">
                    <span className="font-sans font-medium">{item.label}</span>
                    {item.detail && (
                      <span className="font-sans text-ink-muted ml-1.5">· {item.detail}</span>
                    )}
                  </span>
                  <span>${Math.round(item.amount).toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Coverage card */}
        <div className="rounded-xl border border-line bg-surface-soft p-5">
          <p className="label">Included with every install</p>
          <ul className="mt-3 space-y-1.5 text-[14px]">
            <li>· 15-year manufacturer warranty (100% material yrs 1–8)</li>
            <li>· 12-month craftsmanship warranty</li>
            <li>· 2 years of free bi-annual professional maintenance (4 visits)</li>
            <li>· Wonderfill infill — cooler underfoot, no pet odor lock</li>
          </ul>
        </div>

        <div className="flex flex-wrap gap-3">
          <button onClick={downloadPlan} className="btn-secondary">
            Print / save PDF
          </button>
          <button
            onClick={() => {
              // TODO: real share-link backend (Act 8 sharing).
              navigator.clipboard?.writeText(window.location.href);
              alert(
                'Share link backend is not wired up yet — for now, screenshot or print this page.',
              );
            }}
            className="btn-secondary"
          >
            Share with homeowner
          </button>
        </div>

        <p className="text-[12px] text-ink-subtle">
          Builder Prime sync is the next integration. Once a key is added, signing here will create
          the contact and attach the plan + render automatically.
        </p>
      </section>

      <StepFooter
        primaryLabel="Done"
        onPrimary={() => router.push('/')}
      />
    </main>
  );
}
