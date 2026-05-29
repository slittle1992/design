'use client';

export function StepFooter({
  primaryLabel,
  primaryDisabled,
  onPrimary,
  hint,
}: {
  primaryLabel: string;
  primaryDisabled?: boolean;
  onPrimary: () => void;
  hint?: string;
}) {
  return (
    <footer className="sticky bottom-0 bg-surface/90 backdrop-blur border-t border-line">
      <div className="px-6 sm:px-8 py-4 flex items-center justify-between gap-4 max-w-5xl mx-auto">
        <p className="text-[13px] text-ink-muted">{hint}</p>
        <button onClick={onPrimary} disabled={primaryDisabled} className="btn-primary px-6">
          {primaryLabel} →
        </button>
      </div>
    </footer>
  );
}
