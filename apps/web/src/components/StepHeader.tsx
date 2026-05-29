'use client';

import { useRouter } from 'next/navigation';

export function StepHeader({
  step,
  total = 8,
  title,
  backHref,
}: {
  step: number;
  total?: number;
  title: string;
  backHref?: string;
}) {
  const router = useRouter();
  return (
    <header className="sticky top-0 z-10 bg-surface/90 backdrop-blur border-b border-line">
      <div className="px-6 sm:px-8 py-4 flex items-center justify-between max-w-5xl mx-auto">
        <button
          onClick={() => (backHref ? router.push(backHref) : router.back())}
          className="btn-ghost -ml-3"
          aria-label="Back"
        >
          ← Back
        </button>
        <div className="text-center">
          <p className="text-[15px] font-semibold tracking-tight">{title}</p>
          <p className="text-[11px] text-ink-muted tabular-nums">
            Step {step} of {total}
          </p>
        </div>
        <span className="text-[12px] text-ink-subtle">Homefield</span>
      </div>
    </header>
  );
}
