export type {
  Point,
  Polygon,
  Strip,
  StripLayout,
  DesignIntent,
  DesignIntentResult,
} from './types.js';

export {
  polygonArea,
  polygonBounds,
  polygonCentroid,
  rotatePoint,
  rotatePolygon,
} from './polygon.js';

export { clipToSlab, slabMetrics } from './clip.js';

export {
  DEFAULT_STRIP_WIDTH_FT,
  computeStripLayout,
  findMinWasteLayout,
  compareCardinalLayouts,
  totalLawnSqFt,
} from './strip-pack.js';
