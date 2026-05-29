import { ADD_ONS, TURF_BY_ID, type EdgingKind, type FeatureKind, type TurfId } from './skus';

export type FeatureZone = { id: string; kind: FeatureKind; sqft: number };

export type QuoteInput = {
  netTurfSqFt: number; // lawn − cutouts
  turfId: TurfId | null;
  rockSqFt: number; // subtracted from turf area
  featureZones: FeatureZone[]; // areas that swap to a different SKU or add premium
  edgingKind: EdgingKind | null;
  edgingLinearFt: number;
};

export type LineItem = {
  label: string;
  detail?: string;
  amount: number;
  isCredit?: boolean;
};

export type Quote = {
  lineItems: LineItem[];
  subtotal: number;
  total: number;
  notes: string[];
};

/**
 * Build a quote breakdown from selections. Keep this pure so the live
 * "running total" can recompute on every change without touching state.
 */
export function buildQuote(input: QuoteInput): Quote {
  const items: LineItem[] = [];
  const notes: string[] = [];

  if (!input.turfId) {
    return {
      lineItems: [],
      subtotal: 0,
      total: 0,
      notes: ['Pick a turf to see pricing.'],
    };
  }

  const turf = TURF_BY_ID[input.turfId];

  // Feature zones get carved out of the base turf area so they aren't priced
  // twice. Each zone either swaps SKU entirely (putting green → Golf) or
  // adds a per-sqft premium on top of the base SKU (pet area, play pad).
  const featureSqFt = input.featureZones.reduce((sum, z) => sum + z.sqft, 0);
  const baseTurfSqFt = Math.max(0, input.netTurfSqFt - input.rockSqFt - featureSqFt);

  if (baseTurfSqFt > 0) {
    items.push({
      label: `${turf.customerName} turf`,
      detail: `${baseTurfSqFt.toLocaleString()} sq ft × $${turf.pricePerSqFt}`,
      amount: baseTurfSqFt * turf.pricePerSqFt,
    });
  }

  for (const zone of input.featureZones) {
    if (zone.sqft <= 0) continue;
    const premium = ADD_ONS.featurePremiums[zone.kind];
    if (premium.pricePerSqFt != null) {
      // Full SKU swap — e.g. putting green at Golf rate.
      items.push({
        label: premium.label,
        detail: `${zone.sqft.toLocaleString()} sq ft × $${premium.pricePerSqFt}`,
        amount: zone.sqft * premium.pricePerSqFt,
      });
    } else if (premium.extraPerSqFt != null) {
      // Base SKU + premium add-on.
      items.push({
        label: `${turf.customerName} turf — ${premium.label.toLowerCase()}`,
        detail: `${zone.sqft.toLocaleString()} sq ft × $${turf.pricePerSqFt + premium.extraPerSqFt}`,
        amount: zone.sqft * (turf.pricePerSqFt + premium.extraPerSqFt),
      });
    }
  }

  if (input.rockSqFt > 0) {
    items.push({
      label: 'Decorative rock',
      detail: `${input.rockSqFt.toLocaleString()} sq ft × $${ADD_ONS.rockPerSqFt}`,
      amount: input.rockSqFt * ADD_ONS.rockPerSqFt,
    });
  }

  if (input.edgingKind && input.edgingLinearFt > 0) {
    const e = ADD_ONS.edging[input.edgingKind];
    items.push({
      label: `${e.label} edging`,
      detail: `${input.edgingLinearFt.toLocaleString()} ft × $${e.pricePerLinearFt}`,
      amount: input.edgingLinearFt * e.pricePerLinearFt,
    });
  }

  const subtotal = items.reduce((sum, i) => sum + (i.isCredit ? -i.amount : i.amount), 0);

  if (subtotal > 0) {
    notes.push('Includes 15-yr manufacturer warranty + 2 yrs of free pro maintenance.');
  }

  return { lineItems: items, subtotal, total: subtotal, notes };
}

/**
 * Cheap heuristic for the perimeter of the lawn — used as the default
 * edging length so the rep doesn't have to type a number.
 */
export function estimatePerimeterFt(polygon: { x: number; y: number }[]): number {
  if (polygon.length < 2) return 0;
  let p = 0;
  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i]!;
    const b = polygon[(i + 1) % polygon.length]!;
    p += Math.hypot(b.x - a.x, b.y - a.y);
  }
  return p;
}

/**
 * Recommend a turf based on the homeowner profile from Act 1. The rep can
 * override; this just biases the default selection so the cheaper or
 * pricier option doesn't sit highlighted by accident.
 */
export function recommendTurf(profile: {
  audiences: string[];
  pains: string[];
  style: string | null;
  budgetBand: string | null;
}): TurfId {
  if (profile.style === 'sport' || profile.audiences.includes('putting-green' as never)) {
    return 'golf';
  }
  if (
    profile.audiences.includes('dogs') ||
    profile.audiences.includes('kids') ||
    profile.pains.includes('pet-damage') ||
    profile.style === 'lush-traditional'
  ) {
    return 'pro';
  }
  if (profile.style === 'low-budget' || profile.budgetBand === 'under-10k') {
    return 'classic';
  }
  return 'pro';
}
