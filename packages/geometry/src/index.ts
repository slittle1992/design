export type {
  Point,
  Polygon,
  Strip,
  StripLayout,
  DesignIntent,
  DesignIntentResult,
} from './types';

export {
  polygonArea,
  polygonBounds,
  polygonCentroid,
  rotatePoint,
  rotatePolygon,
} from './polygon';

export { clipToSlab, slabMetrics } from './clip';

export { subtractCutouts, slabPieces, multiPolygonArea } from './subtract';
export type { MultiPolygon } from './subtract';

export {
  DEFAULT_STRIP_WIDTH_FT,
  computeStripLayout,
  findMinWasteLayout,
  compareCardinalLayouts,
  totalLawnSqFt,
} from './strip-pack';
