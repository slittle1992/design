'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Polygon } from '@homefield/geometry';

export type Audience = 'kids' | 'dogs' | 'entertaining' | 'pets-only' | 'low-maintenance';
export type Pain = 'mud' | 'dead-spots' | 'mowing' | 'pet-damage' | 'drainage' | 'heat';
export type Style = 'clean-modern' | 'lush-traditional' | 'sport' | 'low-budget';
export type TurfId = 'classic' | 'pro' | 'golf';
export type DesignIntent = 'minimize-waste' | 'maximize-turf' | 'budget-friendly';

export type CutoutKind = 'pool' | 'flower-bed' | 'tree' | 'patio' | 'equipment' | 'other';
export type FeatureKind = 'putting-green' | 'pet-area' | 'play-pad';
export type EdgingKind = 'bender-board' | 'steel' | 'paver';

export type FeatureZone = {
  id: string;
  kind: FeatureKind;
  sqft: number;
};

export type Cutout = {
  id: string;
  kind: CutoutKind;
  closed: boolean; // false while user is still plotting points
  vertices: Polygon; // pixel-space, for re-editing on the satellite tile
  polygonFt: Polygon; // foot-space, smoothed, for sqft + strip-packer math
};

export const CUTOUT_LABELS: Record<CutoutKind, string> = {
  pool: 'Pool',
  'flower-bed': 'Flower bed',
  tree: 'Tree',
  patio: 'Patio',
  equipment: 'AC / equipment',
  other: 'Other',
};

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
  lawnVertices: Polygon | null; // the tap-anchors before smoothing — for re-editing
  lawnClosed: boolean; // false while user is still plotting; true after Done
  lawnSqFt: number; // gross lawn area; net is computed via netLawnSqFt(design)
  cutouts: Cutout[];
  heroPhotoIds: string[];
  intent: DesignIntent;
  turfId: TurfId | null;
  rockSqFt: number;
  featureZones: FeatureZone[];
  edgingKind: EdgingKind | null;
  edgingLinearFt: number;
};

type Store = {
  current: Design | null;
  startNew: () => void;
  setProfile: (patch: Partial<Profile>) => void;
  setHomeowner: (name: string, address: string) => void;
  setLawn: (polygon: Polygon, sqft: number, vertices: Polygon) => void;
  setLawnClosed: (closed: boolean) => void;
  addCutout: (kind: CutoutKind) => string; // returns the new cutout id
  updateCutout: (id: string, vertices: Polygon, polygonFt: Polygon) => void;
  setCutoutKind: (id: string, kind: CutoutKind) => void;
  setCutoutClosed: (id: string, closed: boolean) => void;
  removeCutout: (id: string) => void;
  addHeroPhoto: (id: string) => void;
  removeHeroPhoto: (id: string) => void;
  setTurf: (id: TurfId | null) => void;
  setIntent: (intent: DesignIntent) => void;
  setRockSqFt: (sqft: number) => void;
  addFeatureZone: (kind: FeatureKind, sqft: number) => void;
  updateFeatureZone: (id: string, patch: Partial<Omit<FeatureZone, 'id'>>) => void;
  removeFeatureZone: (id: string) => void;
  setEdging: (kind: EdgingKind | null, linearFt: number) => void;
  reset: () => void;
};

export function cutoutSqFt(c: Cutout): number {
  return polygonAreaSimple(c.polygonFt);
}

export function netLawnSqFt(d: Design): number {
  const gross = d.lawnSqFt;
  const subtract = d.cutouts.reduce((sum, c) => sum + cutoutSqFt(c), 0);
  return Math.max(0, gross - subtract);
}

// Local copy of the shoelace formula so this module doesn't have to import
// from @homefield/geometry just for area (would force this file client-side).
function polygonAreaSimple(poly: Polygon): number {
  if (poly.length < 3) return 0;
  let sum = 0;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i]!;
    const b = poly[(i + 1) % poly.length]!;
    sum += a.x * b.y - b.x * a.y;
  }
  return Math.abs(sum) / 2;
}

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
  lawnVertices: null,
  lawnClosed: false,
  lawnSqFt: 0,
  cutouts: [],
  heroPhotoIds: [],
  intent: 'minimize-waste',
  turfId: null,
  rockSqFt: 0,
  featureZones: [],
  edgingKind: null,
  edgingLinearFt: 0,
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
      setLawn: (lawnPolygon, lawnSqFt, lawnVertices) =>
        set((s) =>
          s.current
            ? { current: { ...s.current, lawnPolygon, lawnVertices, lawnSqFt } }
            : s,
        ),
      setLawnClosed: (lawnClosed) =>
        set((s) => (s.current ? { current: { ...s.current, lawnClosed } } : s)),
      addCutout: (kind) => {
        const id = crypto.randomUUID();
        set((s) =>
          s.current
            ? {
                current: {
                  ...s.current,
                  cutouts: [
                    ...s.current.cutouts,
                    { id, kind, closed: false, vertices: [], polygonFt: [] },
                  ],
                },
              }
            : s,
        );
        return id;
      },
      updateCutout: (id, vertices, polygonFt) =>
        set((s) =>
          s.current
            ? {
                current: {
                  ...s.current,
                  cutouts: s.current.cutouts.map((c) =>
                    c.id === id ? { ...c, vertices, polygonFt } : c,
                  ),
                },
              }
            : s,
        ),
      setCutoutKind: (id, kind) =>
        set((s) =>
          s.current
            ? {
                current: {
                  ...s.current,
                  cutouts: s.current.cutouts.map((c) => (c.id === id ? { ...c, kind } : c)),
                },
              }
            : s,
        ),
      setCutoutClosed: (id, closed) =>
        set((s) =>
          s.current
            ? {
                current: {
                  ...s.current,
                  cutouts: s.current.cutouts.map((c) => (c.id === id ? { ...c, closed } : c)),
                },
              }
            : s,
        ),
      removeCutout: (id) =>
        set((s) =>
          s.current
            ? {
                current: {
                  ...s.current,
                  cutouts: s.current.cutouts.filter((c) => c.id !== id),
                },
              }
            : s,
        ),
      addHeroPhoto: (id) =>
        set((s) =>
          s.current
            ? { current: { ...s.current, heroPhotoIds: [...s.current.heroPhotoIds, id] } }
            : s,
        ),
      removeHeroPhoto: (id) =>
        set((s) =>
          s.current
            ? {
                current: {
                  ...s.current,
                  heroPhotoIds: s.current.heroPhotoIds.filter((p) => p !== id),
                },
              }
            : s,
        ),
      setTurf: (turfId) =>
        set((s) => (s.current ? { current: { ...s.current, turfId } } : s)),
      setIntent: (intent) =>
        set((s) => (s.current ? { current: { ...s.current, intent } } : s)),
      setRockSqFt: (rockSqFt) =>
        set((s) => (s.current ? { current: { ...s.current, rockSqFt: Math.max(0, rockSqFt) } } : s)),
      addFeatureZone: (kind, sqft) =>
        set((s) =>
          s.current
            ? {
                current: {
                  ...s.current,
                  featureZones: [
                    ...s.current.featureZones,
                    { id: crypto.randomUUID(), kind, sqft: Math.max(0, sqft) },
                  ],
                },
              }
            : s,
        ),
      updateFeatureZone: (id, patch) =>
        set((s) =>
          s.current
            ? {
                current: {
                  ...s.current,
                  featureZones: s.current.featureZones.map((z) =>
                    z.id === id ? { ...z, ...patch, sqft: Math.max(0, patch.sqft ?? z.sqft) } : z,
                  ),
                },
              }
            : s,
        ),
      removeFeatureZone: (id) =>
        set((s) =>
          s.current
            ? {
                current: {
                  ...s.current,
                  featureZones: s.current.featureZones.filter((z) => z.id !== id),
                },
              }
            : s,
        ),
      setEdging: (edgingKind, edgingLinearFt) =>
        set((s) =>
          s.current
            ? {
                current: {
                  ...s.current,
                  edgingKind,
                  edgingLinearFt: Math.max(0, edgingLinearFt),
                },
              }
            : s,
        ),
      reset: () => set({ current: null }),
    }),
    { name: 'homefield-design' },
  ),
);
