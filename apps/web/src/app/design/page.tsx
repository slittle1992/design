'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import {
  CUTOUT_LABELS,
  netLawnSqFt,
  useDesign,
  type DesignIntent,
  type EdgingKind,
  type FeatureKind,
} from '@/lib/store';
import { StepHeader } from '@/components/StepHeader';
import { StepFooter } from '@/components/StepFooter';
import { ArchPlan } from '@/components/ArchPlan';
import { ADD_ONS, TURF_BY_ID } from '@/lib/skus';
import { buildQuote, estimatePerimeterFt } from '@/lib/pricing';
import { findMinWasteLayout } from '@homefield/geometry';

const INTENTS: { id: DesignIntent; label: string; tagline: string }[] = [
  {
    id: 'minimize-waste',
    label: 'Minimize waste',
    tagline: 'Lowest install cost. Rocked where waste would spike.',
  },
  {
    id: 'maximize-turf',
    label: 'Maximize turf',
    tagline: 'Most lawn we can give them without throwing money out.',
  },
  {
    id: 'budget-friendly',
    label: 'Budget-friendly',
    tagline: 'Hit a number. More rock, less turf.',
  },
];

const FEATURE_OPTIONS: { id: FeatureKind; label: string; suggestedSqFt: number }[] = [
  { id: 'putting-green', label: 'Putting green', suggestedSqFt: 200 },
  { id: 'pet-area', label: 'Pet relief area', suggestedSqFt: 100 },
  { id: 'play-pad', label: 'Kids play pad', suggestedSqFt: 150 },
];

const EDGING_OPTIONS: { id: EdgingKind; label: string }[] = [
  { id: 'bender-board', label: 'Bender board' },
  { id: 'steel', label: 'Steel' },
  { id: 'paver', label: 'Paver' },
];

export default function DesignPage() {
  const router = useRouter();
  const current = useDesign((s) => s.current);
  const setIntent = useDesign((s) => s.setIntent);
  const setRockSqFt = useDesign((s) => s.setRockSqFt);
  const addFeatureZone = useDesign((s) => s.addFeatureZone);
  const updateFeatureZone = useDesign((s) => s.updateFeatureZone);
  const removeFeatureZone = useDesign((s) => s.removeFeatureZone);
  const setEdging = useDesign((s) => s.setEdging);

  useEffect(() => {
    if (!current) router.replace('/');
    else if (!current.lawnPolygon) router.replace('/capture');
    else if (!current.turfId) router.replace('/turf');
  }, [current, router]);

  const net = useMemo(() => (current ? netLawnSqFt(current) : 0), [current]);

  // Suggest rock area based on intent so the slider has a sensible starting
  // point the rep can immediately tweak.
  const suggestRock = (intent: DesignIntent): number => {
    if (intent === 'budget-friendly') return Math.round(net * 0.35);
    if (intent === 'maximize-turf') return 0;
    return Math.round(net * 0.1); // minimize-waste default
  };

  // Default edging length = perimeter estimate, once.
  const [edgingInitialized, setEdgingInitialized] = useState(false);
  useEffect(() => {
    if (current && !edgingInitialized && current.edgingLinearFt === 0 && current.lawnPolygon) {
      const p = Math.round(estimatePerimeterFt(current.lawnPolygon));
      setEdging(current.edgingKind, p);
      setEdgingInitialized(true);
    }
  }, [current, edgingInitialized, setEdging]);

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

  const applyIntent = (id: DesignIntent) => {
    setIntent(id);
    setRockSqFt(suggestRock(id));
  };

  return (
    <main className="min-h-screen flex flex-col">
      <StepHeader step={6} title="Design the yard" backHref="/turf" />

      <section className="flex-1 px-6 sm:px-8 py-10 max-w-3xl mx-auto w-full space-y-10">
        <div>
          <p className="label">Plan</p>
          <h1 className="display text-3xl sm:text-4xl mt-2 tabular-nums">
            {Math.round(net).toLocaleString()} sq ft · {turf.customerName}
          </h1>
        </div>

        <ArchPlan polygon={current.lawnPolygon!} cutouts={cutoutsForRender} layout={layout} />

        {/* Design Intent presets */}
        <div>
          <p className="label mb-3">Design intent</p>
          <div className="grid sm:grid-cols-3 gap-3">
            {INTENTS.map((i) => {
              const isSelected = current.intent === i.id;
              return (
                <button
                  key={i.id}
                  onClick={() => applyIntent(i.id)}
                  className={`text-left rounded-xl border p-4 transition-colors ${
                    isSelected ? 'border-ink bg-surface-soft' : 'border-line hover:border-line-strong'
                  }`}
                >
                  <p className="text-[15px] font-semibold">{i.label}</p>
                  <p className="text-[12px] text-ink-muted mt-1">{i.tagline}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Rock zones */}
        <div>
          <div className="flex items-baseline justify-between">
            <p className="label">Decorative rock</p>
            <p className="text-[13px] text-ink-muted tabular-nums">
              {current.rockSqFt.toLocaleString()} sq ft · ${ADD_ONS.rockPerSqFt}/sq ft
            </p>
          </div>
          <input
            type="range"
            min={0}
            max={Math.max(0, Math.round(net))}
            step={10}
            value={current.rockSqFt}
            onChange={(e) => setRockSqFt(parseInt(e.target.value, 10))}
            className="w-full mt-3 accent-ink"
          />
          <p className="mt-1 text-[12px] text-ink-muted">
            Rock takes the place of turf in problem corners — saves install cost, adds an accent.
          </p>
        </div>

        {/* Feature zones */}
        <div>
          <p className="label mb-3">Feature zones</p>
          <div className="flex flex-wrap gap-2 mb-3">
            {FEATURE_OPTIONS.map((f) => (
              <button
                key={f.id}
                onClick={() => addFeatureZone(f.id, f.suggestedSqFt)}
                className="chip text-[12px]"
              >
                + {f.label}
              </button>
            ))}
          </div>
          {current.featureZones.length === 0 ? (
            <p className="text-[13px] text-ink-muted">No feature zones yet.</p>
          ) : (
            <div className="space-y-2">
              {current.featureZones.map((z) => {
                const premium = ADD_ONS.featurePremiums[z.kind];
                const rate =
                  premium.pricePerSqFt ??
                  (turf.pricePerSqFt + (premium.extraPerSqFt ?? 0));
                return (
                  <div
                    key={z.id}
                    className="flex items-center gap-3 rounded-lg border border-line p-3"
                  >
                    <span className="text-[14px] font-medium flex-1">{premium.label}</span>
                    <label className="flex items-center gap-2 text-[13px]">
                      <input
                        type="number"
                        min={0}
                        step={10}
                        value={z.sqft}
                        onChange={(e) =>
                          updateFeatureZone(z.id, { sqft: parseInt(e.target.value || '0', 10) })
                        }
                        className="input w-24 min-h-0 py-1.5 text-center tabular-nums"
                      />
                      <span className="text-ink-muted">sq ft</span>
                    </label>
                    <span className="text-[13px] text-ink-muted tabular-nums w-20 text-right">
                      ${Math.round(z.sqft * rate).toLocaleString()}
                    </span>
                    <button
                      onClick={() => removeFeatureZone(z.id)}
                      className="chip text-[12px]"
                    >
                      ×
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Edging */}
        <div>
          <p className="label mb-3">Edging</p>
          <div className="flex flex-wrap gap-2">
            {EDGING_OPTIONS.map((e) => (
              <button
                key={e.id}
                onClick={() =>
                  setEdging(current.edgingKind === e.id ? null : e.id, current.edgingLinearFt)
                }
                className={`chip ${current.edgingKind === e.id ? 'chip-selected' : ''}`}
              >
                {e.label}
              </button>
            ))}
          </div>
          {current.edgingKind && (
            <div className="mt-3 flex items-center gap-2">
              <label className="text-[13px] text-ink-muted">Length</label>
              <input
                type="number"
                min={0}
                step={5}
                value={current.edgingLinearFt}
                onChange={(e) =>
                  setEdging(current.edgingKind, parseInt(e.target.value || '0', 10))
                }
                className="input w-28 min-h-0 py-1.5 text-center tabular-nums"
              />
              <span className="text-[13px] text-ink-muted">linear ft</span>
            </div>
          )}
        </div>

        {/* Wonderfill education card (Act 7 inline) */}
        <div className="rounded-xl border border-line p-5 bg-surface-soft">
          <p className="label">Included: Wonderfill infill</p>
          <p className="mt-2 text-[14px]">
            <span className="font-semibold">Why it matters in Texas:</span> silica sand turf hits
            150°F+ on summer afternoons and locks in pet urine smell. Wonderfill runs measurably
            cooler underfoot, is antimicrobial, and won&apos;t trap odor.
          </p>
          <p className="mt-2 text-[12px] text-ink-muted">
            Standard on every install — no upcharge.
          </p>
        </div>

        {/* Live quote */}
        {quote && (
          <div className="rounded-xl border-2 border-ink p-5 sticky bottom-24">
            <div className="flex items-baseline justify-between mb-3">
              <p className="label">Estimate</p>
              <p className="display text-3xl tabular-nums">
                ${Math.round(quote.total).toLocaleString()}
              </p>
            </div>
            <div className="space-y-1.5 text-[13px] font-mono tabular-nums">
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
            {quote.notes.map((n, i) => (
              <p key={i} className="mt-3 text-[12px] text-ink-muted font-sans">
                {n}
              </p>
            ))}
          </div>
        )}
      </section>

      <StepFooter
        primaryLabel="Continue to reveal"
        onPrimary={() => router.push('/reveal')}
      />
    </main>
  );
}
