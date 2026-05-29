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
import { StepHeader } from '@/components/StepHeader';
import { StepFooter } from '@/components/StepFooter';

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
    <main className="min-h-screen flex flex-col">
      <StepHeader step={1} title="Discovery" backHref="/" />

      <section className="flex-1 px-6 sm:px-8 py-10 max-w-3xl mx-auto w-full space-y-12">
        <Block label="Homeowner">
          <div className="space-y-3">
            <input
              type="text"
              value={current.homeownerName}
              onChange={(e) => setHomeowner(e.target.value, current.address)}
              placeholder="Name"
              className="input"
            />
            <input
              type="text"
              value={current.address}
              onChange={(e) => setHomeowner(current.homeownerName, e.target.value)}
              placeholder="Address"
              className="input"
            />
          </div>
        </Block>

        <Block label="Who uses the yard" hint="Select all that apply">
          <ChipRow>
            {AUDIENCES.map((a) => (
              <Chip
                key={a.id}
                selected={current.profile.audiences.includes(a.id)}
                onClick={() => toggleAudience(a.id)}
              >
                {a.label}
              </Chip>
            ))}
          </ChipRow>
        </Block>

        <Block label="What's wrong with the yard today">
          <ChipRow>
            {PAINS.map((p) => (
              <Chip
                key={p.id}
                selected={current.profile.pains.includes(p.id)}
                onClick={() => togglePain(p.id)}
              >
                {p.label}
              </Chip>
            ))}
          </ChipRow>
        </Block>

        <Block label="Style they're going for">
          <ChipRow>
            {STYLES.map((s) => (
              <Chip
                key={s.id}
                selected={current.profile.style === s.id}
                onClick={() => setProfile({ style: s.id })}
              >
                {s.label}
              </Chip>
            ))}
          </ChipRow>
        </Block>

        <Block label="Budget">
          <ChipRow>
            {BUDGETS.map((b) => (
              <Chip
                key={b.id}
                selected={current.profile.budgetBand === b.id}
                onClick={() => setProfile({ budgetBand: b.id })}
              >
                {b.label}
              </Chip>
            ))}
          </ChipRow>
        </Block>

        <Block label="Timeline">
          <ChipRow>
            {TIMELINES.map((t) => (
              <Chip
                key={t.id}
                selected={current.profile.timeline === t.id}
                onClick={() => setProfile({ timeline: t.id })}
              >
                {t.label}
              </Chip>
            ))}
          </ChipRow>
        </Block>
      </section>

      <StepFooter
        primaryLabel="Continue"
        primaryDisabled={!canContinue}
        onPrimary={() => router.push('/capture')}
        hint={canContinue ? undefined : 'Enter the homeowner name to continue'}
      />
    </main>
  );
}

function Block({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-4">
        <p className="label">{label}</p>
        {hint && <p className="mt-1 text-[13px] text-ink-muted">{hint}</p>}
      </div>
      {children}
    </div>
  );
}

function ChipRow({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap gap-2">{children}</div>;
}

function Chip({
  children,
  selected,
  onClick,
}: {
  children: React.ReactNode;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button onClick={onClick} className={`chip ${selected ? 'chip-selected' : ''}`}>
      {children}
    </button>
  );
}
