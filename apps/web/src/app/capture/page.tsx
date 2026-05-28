'use client';

import { useRouter } from 'next/navigation';

export default function CapturePage() {
  const router = useRouter();
  return (
    <main className="min-h-screen bg-cream text-field-darker">
      <header className="bg-field text-cream px-6 py-4 flex items-center justify-between border-b-4 border-field-darker">
        <button onClick={() => router.push('/discovery')} className="text-xl font-bold">
          ←
        </button>
        <h1 className="text-2xl font-display font-black">Walk & Capture</h1>
        <span className="text-sm font-semibold opacity-80">2 / 8</span>
      </header>
      <section className="p-6 max-w-3xl mx-auto space-y-6">
        <div className="card">
          <h2 className="text-2xl font-display font-black mb-2">Coming up next</h2>
          <p className="text-lg">
            This screen will load a satellite tile centered on the homeowner&apos;s address,
            let the rep tap-trace the lawn perimeter (with curve-handles for irregular
            shapes), and capture 2–4 hero photos for the Nano Banana render.
          </p>
          <ul className="mt-4 space-y-2 text-lg list-disc list-inside">
            <li>Address → Mapbox satellite tile</li>
            <li>Tap-to-add vertices, drag-to-curve handles</li>
            <li>Live sq ft as you draw</li>
            <li>Photo capture from device camera</li>
          </ul>
        </div>
      </section>
    </main>
  );
}
