import skusData from '../../../../data/skus.json';

export type TurfId = 'classic' | 'pro' | 'golf';

export type TurfSku = {
  id: TurfId;
  customerName: string;
  manufacturerSku: string;
  tagline: string;
  bestFor: string[];
  specs: {
    pileHeightIn: number;
    faceWeightOz: number;
    drainRateInPerHr: number | null;
    warrantyYears: number;
    features: string[];
  };
  pricePerSqFt: number;
};

export type FeatureKind = 'putting-green' | 'pet-area' | 'play-pad';
export type EdgingKind = 'bender-board' | 'steel' | 'paver';

export const TURFS: TurfSku[] = (skusData.turf as TurfSku[]).map((t) => ({
  id: t.id as TurfId,
  customerName: t.customerName,
  manufacturerSku: t.manufacturerSku,
  tagline: t.tagline,
  bestFor: t.bestFor,
  specs: {
    pileHeightIn: t.specs.pileHeightIn,
    faceWeightOz: t.specs.faceWeightOz,
    drainRateInPerHr: t.specs.drainRateInPerHr ?? null,
    warrantyYears: t.specs.warrantyYears,
    features: t.specs.features,
  },
  pricePerSqFt: t.pricePerSqFt,
}));

export const TURF_BY_ID = Object.fromEntries(TURFS.map((t) => [t.id, t])) as Record<
  TurfId,
  TurfSku
>;

type AddOnsShape = {
  rockPerSqFt: number;
  edging: Record<EdgingKind, { label: string; pricePerLinearFt: number }>;
  featurePremiums: Record<
    FeatureKind,
    | { label: string; sku: TurfId; pricePerSqFt: number; extraPerSqFt?: undefined }
    | { label: string; sku: TurfId; extraPerSqFt: number; pricePerSqFt?: undefined }
  >;
};

export const ADD_ONS = skusData.addOns as AddOnsShape;

export const MAINTENANCE = skusData.maintenance as {
  complimentary: { termYears: number; totalVisits: number };
};
