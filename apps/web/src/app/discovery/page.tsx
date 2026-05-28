'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import {
  useDesign,
  type Audience,
  type Pain,
  type Style,
  type Profile,
} from '@/lib/store';

const AUDIENCES: { id: Audience; label: string }[] = [
  { id: 'kids', label: 'Kids' },
  { id: 'dogs', label: 'Dogs' },
  { id: 'entertaining', label: 'Entertaining' },
  { id: 'pets-only', label: 'Pet area' },
  { id: 'low-maintenance', label: 'Low maintenance' },
];

const PAINS: { id: Pain; label: string }[] = [
  { id: 'mud', label: 'Mud' },
  { id: 'dead-spots', label: 'Dead spots' },
  { id: 'mowing', label: 'Hate mowing' },
  { id: 'pet-damage', label: 'Pet damage' },
  { id: 'drainage', label: 'Drainage' },
  { id: 'heat', label: 'Heat' },
];

const STYLES: { id: Style; label: string }[] = [
  { id: 'clean-modern', label: 'Clean & modern' },
  { id: 'lush-traditional', label: 'Lush & traditional' },
  { id: 'sport', label: 'Sport / putting green' },
  { id: 'low-budget', label: 'Keep it simple' },
];

const BUDGETS: { id: NonNullable<Profile['budgetBand']>; label: string }[] = [
  { id: 'under-10k', label: 'Under $10k' },
  { id: '10-20k', label: '$10k–$20k' },
  { id: '20-35k', label: '$20k–$35k' },
  { id: '35k-plus', label: '$35k+' },
];

const TIMELINES: { id: NonNullable<Profile['timeline']>; label: string }[] = [
  { id: 'asap', label: 'ASAP' },
  { id: '1-3-months', label: '1–3 months' },
  { id: 'flexible', label: 'Flexible' },
];

export default function DiscoveryPage() {
  const router = useRouter();
  const current = useDesign((s) => s.current);
  const startNew = useDesign((s) => s.startNew);
  const setProfile = useDesign((s) => s.setProfile);
  const setHomeowner = useDesign((s) => s.setHomeowner);

  useEffect(() => {
    if (!current) startNew();
  }, [current, startNew]);

  if (!current) return null;

  const toggleAudience = (id: Audience) => {
    const has = current.profile.audiences.includes(id);
    setProfile({
      audiences: has
        ? current.profile.audiences.filter((a) => a !== id)
        : [...current.profile.audiences, id],
    });
  };

  const togglePain = (id: Pain) => {
    const has = current.profile.pains.includes(id);
    setProfile({
      pains: has ? current.profile.pains.filter((p) => p !== id) : [...current.profile.pains, id],
    });
  };

  const canContinue = current.homeownerName.trim().length > 0;

  return (
    <main className="min-h-screen bg-cream text-field-darker">
      <header className="bg-field text-cream px-6 py-4 flex items-center justify-between border-b-4 border-field-darker">
        <button onClick={() => router.push('/')} className="text-xl font-bold">
          ←
        </button>
        <h1 className="text-2xl font-display font-black">Discovery</h1>
        <span className="text-sm font-semibold opacity-80">1 / 8</span>
      </header>

      <section className="p-6 max-w-3xl mx-auto space-y-8 pb-32">
        <Field label="Homeowner">
          <input
            type="text"
            value={current.homeownerName}
            onChange={(e) => setHomeowner(e.target.value, current.address)}
            placeholder="Name"
            className="w-full min-h-tap-md rounded-2xl border-4 border-field-darker bg-cream px-4 text-xl font-semibold focus:outline-none focus:border-field"
          />
          <input
            type="text"
            value={current.address}
            onChange={(e) => setHomeowner(current.homeownerName, e.target.value)}
            placeholder="Address"
            className="mt-3 w-full min-h-tap-md rounded-2xl border-4 border-field-darker bg-cream px-4 text-xl font-semibold focus:outline-none focus:border-field"
          />
        </Field>

        <Field label="Who uses the yard?" subtitle="Tap all that apply">
          <PillRow>
            {AUDIENCES.map((a) => (
              <Pill
                key={a.id}
                selected={current.profile.audiences.includes(a.id)}
                onClick={() => toggleAudience(a.id)}
              >
                {a.label}
              </Pill>
            ))}
          </PillRow>
        </Field>

        <Field label="What's wrong with the yard today?">
          <PillRow>
            {PAINS.map((p) => (
              <Pill
                key={p.id}
                selected={current.profile.pains.includes(p.id)}
                onClick={() => togglePain(p.id)}
              >
                {p.label}
              </Pill>
            ))}
          </PillRow>
        </Field>

        <Field label="Style they're going for">
          <PillRow>
            {STYLES.map((s) => (
              <Pill
                key={s.id}
                selected={current.profile.style === s.id}
                onClick={() => setProfile({ style: s.id })}
              >
                {s.label}
              </Pill>
            ))}
          </PillRow>
        </Field>

        <Field label="Budget band">
          <PillRow>
            {BUDGETS.map((b) => (
              <Pill
                key={b.id}
                selected={current.profile.budgetBand === b.id}
                onClick={() => setProfile({ budgetBand: b.id })}
              >
                {b.label}
              </Pill>
            ))}
          </PillRow>
        </Field>

        <Field label="Timeline">
          <PillRow>
            {TIMELINES.map((t) => (
              <Pill
                key={t.id}
                selected={current.profile.timeline === t.id}
                onClick={() => setProfile({ timeline: t.id })}
              >
                {t.label}
              </Pill>
            ))}
          </PillRow>
        </Field>
      </section>

      <footer className="fixed bottom-0 inset-x-0 bg-cream border-t-4 border-field-darker p-4 flex justify-end">
        <button
          disabled={!canContinue}
          onClick={() => router.push('/capture')}
          className="btn-primary text-2xl min-h-tap-lg w-full max-w-sm disabled:opacity-40 disabled:active:scale-100"
        >
          Continue →
        </button>
      </footer>
    </main>
  );
}

function Field({
  label,
  subtitle,
  children,
}: {
  label: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-3">
        <h2 className="text-2xl font-display font-black">{label}</h2>
        {subtitle && <p className="text-base font-semibold opacity-70">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

function PillRow({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap gap-3">{children}</div>;
}

function Pill({
  children,
  selected,
  onClick,
}: {
  children: React.ReactNode;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button onClick={onClick} className={`pill ${selected ? 'pill-selected' : ''}`}>
      {children}
    </button>
  );
}
