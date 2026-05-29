'use client';

import { useRouter } from 'next/navigation';
import { useDesign } from '@/lib/store';

export default function Home() {
  const router = useRouter();
  const startNew = useDesign((s) => s.startNew);
  const current = useDesign((s) => s.current);

  const begin = () => {
    startNew();
    router.push('/discovery');
  };

  return (
    <main className="min-h-screen flex flex-col">
      <header className="px-8 py-6 flex items-center justify-between">
        <span className="text-[15px] font-semibold tracking-tight">Homefield</span>
        <span className="text-[12px] text-ink-muted">Design Studio</span>
      </header>

      <section className="flex-1 flex flex-col justify-center px-8 max-w-2xl mx-auto w-full">
        <p className="label mb-6">In-home presentation</p>
        <h1 className="display text-[56px] sm:text-[72px] leading-[0.95]">
          Design the yard, on site.
        </h1>
        <p className="mt-6 text-lg text-ink-muted max-w-lg">
          Capture the lawn, walk through options, and leave with a signed design — built for one
          tablet, one homeowner, one conversation.
        </p>

        <div className="mt-12 flex flex-col sm:flex-row gap-3">
          <button onClick={begin} className="btn-primary px-6">
            Start new design
          </button>
          {current?.homeownerName && (
            <button onClick={() => router.push('/discovery')} className="btn-secondary px-6">
              Resume — {current.homeownerName}
            </button>
          )}
        </div>
      </section>

      <footer className="px-8 py-6 text-[12px] text-ink-subtle">
        Works offline. Saves locally until you reach a signal.
      </footer>
    </main>
  );
}
