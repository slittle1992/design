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

  const resume = () => {
    router.push('/discovery');
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-field text-cream px-6 gap-8">
      <div className="text-center">
        <h1 className="text-5xl font-display font-black tracking-tight">HomeField</h1>
        <p className="mt-2 text-xl font-semibold opacity-90">Artificial Turf Co.</p>
      </div>

      <div className="flex flex-col gap-4 w-full max-w-md">
        <button onClick={begin} className="btn-secondary text-2xl min-h-tap-lg">
          Start New Design
        </button>

        {current && current.homeownerName && (
          <button onClick={resume} className="btn-primary text-xl min-h-tap-md border-cream">
            Resume — {current.homeownerName || 'untitled'}
          </button>
        )}
      </div>

      <p className="text-sm opacity-70 text-center max-w-sm">
        Field-mode iPad presentation. Works offline. Saves locally until you reach a signal.
      </p>
    </main>
  );
}
