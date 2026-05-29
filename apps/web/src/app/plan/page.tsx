'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useDesign } from '@/lib/store';
import { StepHeader } from '@/components/StepHeader';
import { StepFooter } from '@/components/StepFooter';
import { ArchPlan } from '@/components/ArchPlan';
import {
  computeStripLayout,
  findMinWasteLayout,
  type StripLayout,
} from '@homefield/geometry';

type Orientation = 'auto' | 'ew' | 'ns';

export default function PlanPage() {
  const router = useRouter();
  const current = useDesign((s) => s.current);
  const [orientation, setOrientation] = useState<Orientation>('auto');

  useEffect(() => {
    if (!current) router.replace('/');
    else if (!current.lawnPolygon) router.replace('/capture');
  }, [current, router]);

  const layout: StripLayout | null = useMemo(() => {
    if (!current?.lawnPolygon) return null;
    if (orientation === 'auto') return findMinWasteLayout(current.lawnPolygon, 14, 5);
    if (orientation === 'ew') return computeStripLayout(current.lawnPolygon, 0, 14);
    return computeStripLayout(current.lawnPolygon, 90, 14);
  }, [current?.lawnPolygon, orientation]);

  if (!current?.lawnPolygon) return null;

  return (
    <main className="min-h-screen flex flex-col">
      <StepHeader step={3} title="The Plan" backHref="/capture" />

      <section className="flex-1 px-6 sm:px-8 py-10 max-w-3xl mx-auto w-full space-y-10">
        <div>
          <p className="label">Their yard</p>
          <h1 className="display text-4xl sm:text-5xl mt-2">
            {Math.round(current.lawnSqFt).toLocaleString()} sq ft
          </h1>
          <p className="mt-2 text-[15px] text-ink-muted">
            {current.address || 'Address not set'}
          </p>
        </div>

        <ArchPlan polygon={current.lawnPolygon} layout={layout} />

        {layout && (
          <div className="grid grid-cols-3 gap-3">
            <Stat label="Strips" value={String(layout.strips.length)} />
            <Stat label="Seams" value={String(layout.seamCount)} />
            <Stat label="Waste" value={`${(layout.wastePct * 100).toFixed(1)}%`} />
          </div>
        )}

        <div>
          <p className="label mb-3">Strip orientation</p>
          <div className="flex gap-2 flex-wrap">
            <Toggle
              selected={orientation === 'auto'}
              onClick={() => setOrientation('auto')}
              label="Auto (least waste)"
            />
            <Toggle
              selected={orientation === 'ew'}
              onClick={() => setOrientation('ew')}
              label="East–West"
            />
            <Toggle
              selected={orientation === 'ns'}
              onClick={() => setOrientation('ns')}
              label="North–South"
            />
          </div>
          <p className="mt-3 text-[13px] text-ink-muted">
            Turf rolls are 14 ft wide. We choose the direction that hides seams from the
            patio view and minimizes cut waste.
          </p>
        </div>
      </section>

      <StepFooter
        primaryLabel="Continue"
        onPrimary={() => {
          // TODO(act-4): build the education / seam-direction walkthrough.
          alert('Next acts (turf selection, design intent, render) are coming up next.');
        }}
      />
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-line p-4">
      <p className="label">{label}</p>
      <p className="display text-2xl mt-2 tabular-nums">{value}</p>
    </div>
  );
}

function Toggle({
  selected,
  onClick,
  label,
}: {
  selected: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button onClick={onClick} className={`chip ${selected ? 'chip-selected' : ''}`}>
      {label}
    </button>
  );
}
