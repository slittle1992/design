'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Polygon } from '@homefield/geometry';

export type Audience = 'kids' | 'dogs' | 'entertaining' | 'pets-only' | 'low-maintenance';
export type Pain = 'mud' | 'dead-spots' | 'mowing' | 'pet-damage' | 'drainage' | 'heat';
export type Style = 'clean-modern' | 'lush-traditional' | 'sport' | 'low-budget';
export type TurfId = 'classic' | 'pro' | 'golf';
export type DesignIntent = 'minimize-waste' | 'maximize-turf' | 'budget-friendly';

export type Profile = {
  audiences: Audience[];
  pains: Pain[];
  style: Style | null;
  budgetBand: 'under-10k' | '10-20k' | '20-35k' | '35k-plus' | null;
  timeline: 'asap' | '1-3-months' | 'flexible' | null;
};

export type Design = {
  id: string;
  createdAt: string;
  homeownerName: string;
  address: string;
  profile: Profile;
  lawnPolygon: Polygon | null;
  lawnSqFt: number;
  heroPhotoIds: string[];
  intent: DesignIntent;
  turfId: TurfId | null;
};

type Store = {
  current: Design | null;
  startNew: () => void;
  setProfile: (patch: Partial<Profile>) => void;
  setHomeowner: (name: string, address: string) => void;
  reset: () => void;
};

const emptyProfile: Profile = {
  audiences: [],
  pains: [],
  style: null,
  budgetBand: null,
  timeline: null,
};

const blankDesign = (): Design => ({
  id: crypto.randomUUID(),
  createdAt: new Date().toISOString(),
  homeownerName: '',
  address: '',
  profile: { ...emptyProfile },
  lawnPolygon: null,
  lawnSqFt: 0,
  heroPhotoIds: [],
  intent: 'minimize-waste',
  turfId: null,
});

export const useDesign = create<Store>()(
  persist(
    (set) => ({
      current: null,
      startNew: () => set({ current: blankDesign() }),
      setProfile: (patch) =>
        set((s) =>
          s.current
            ? { current: { ...s.current, profile: { ...s.current.profile, ...patch } } }
            : s,
        ),
      setHomeowner: (homeownerName, address) =>
        set((s) => (s.current ? { current: { ...s.current, homeownerName, address } } : s)),
      reset: () => set({ current: null }),
    }),
    { name: 'homefield-design' },
  ),
);
