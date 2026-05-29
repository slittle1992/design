'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo } from 'react';
import { netLawnSqFt, useDesign } from '@/lib/store';
import { StepHeader } from '@/components/StepHeader';
import { StepFooter } from '@/components/StepFooter';
import { TURFS } from '@/lib/skus';
import { recommendTurf } from '@/lib/pricing';

export default function TurfPage() {
  const router = useRouter();
  const current = useDesign((s) => s.current);
  const setTurf = useDesign((s) => s.setTurf);

  useEffect(() => {
    if (!current) router.replace('/');
    else if (!current.lawnPolygon) router.replace('/capture');
  }, [current, router]);

  const recommended = useMemo(
    () => (current ? recommendTurf(current.profile) : 'pro'),
    [current],
  );

  if (!current) return null;

  const net = netLawnSqFt(current);

  return (
    <main className="min-h-screen flex flex-col">
      <StepHeader step={5} title="Pick the turf" backHref="/plan" />

      <section className="flex-1 px-6 sm:px-8 py-10 max-w-3xl mx-auto w-full space-y-8">
        <div>
          <p className="label">For {Math.round(net).toLocaleString()} sq ft</p>
          <h1 className="display text-3xl sm:text-4xl mt-2">
            Three turfs, one pick.
          </h1>
          <p className="mt-3 text-[15px] text-ink-muted">
            Based on what they told us, we&apos;d lead with{' '}
            <span className="font-semibold text-ink">
              {TURFS.find((t) => t.id === recommended)?.customerName}
            </span>
            . The others stay on the table.
          </p>
        </div>

        <div className="space-y-3">
          {TURFS.map((t) => {
            const isSelected = current.turfId === t.id;
            const isRecommended = t.id === recommended;
            const subtotal = t.pricePerSqFt * net;
            return (
              <button
                key={t.id}
                onClick={() => setTurf(t.id)}
                className={`w-full text-left rounded-xl border p-5 transition-colors ${
                  isSelected
                    ? 'border-ink bg-surface-soft'
                    : 'border-line hover:border-line-strong'
                }`}
              >
                <div className="flex items-baseline justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[20px] font-semibold tracking-tight">
                        {t.customerName}
                      </span>
                      {isRecommended && (
                        <span className="chip chip-selected text-[11px] px-2 min-h-0 py-0.5">
                          Recommended
                        </span>
                      )}
                    </div>
                    <p className="text-[14px] text-ink-muted mt-1">{t.tagline}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="display text-xl tabular-nums">
                      ${Math.round(subtotal).toLocaleString()}
                    </p>
                    <p className="text-[12px] text-ink-muted">
                      ${t.pricePerSqFt}/sq ft installed
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-[13px]">
                  <Spec label="Pile" value={`${t.specs.pileHeightIn}"`} />
                  <Spec label="Face weight" value={`${t.specs.faceWeightOz} oz`} />
                  <Spec
                    label="Drain"
                    value={t.specs.drainRateInPerHr ? `${t.specs.drainRateInPerHr}+ in/hr` : '—'}
                  />
                  <Spec label="Warranty" value={`${t.specs.warrantyYears} yrs`} />
                </div>
              </button>
            );
          })}
        </div>

        <p className="text-[12px] text-ink-subtle">
          Prices are installed, include base + Wonderfill infill + 15-yr warranty + 2 yrs of pro
          maintenance. Rock zones and putting greens are added next.
        </p>
      </section>

      <StepFooter
        primaryLabel="Continue"
        primaryDisabled={!current.turfId}
        onPrimary={() => router.push('/design')}
        hint={current.turfId ? undefined : 'Pick a turf to continue'}
      />
    </main>
  );
}

function Spec({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-ink-muted">{label}</p>
      <p className="font-medium mt-0.5">{value}</p>
    </div>
  );
}
