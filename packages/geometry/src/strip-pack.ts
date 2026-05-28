import type { Polygon, Strip, StripLayout } from './types.js';
import { polygonArea, polygonBounds, polygonCentroid, rotatePolygon } from './polygon.js';
import { slabMetrics } from './clip.js';

export const DEFAULT_STRIP_WIDTH_FT = 14;

/**
 * Compute the strip layout for a polygon at a given rotation.
 * - Rotates the polygon so strips run horizontally (parallel to x-axis).
 * - Slices into stripWidth-tall horizontal slabs.
 * - For each slab, computes the covered area (polygon ∩ slab) and the roll
 *   length required (horizontal extent of the slab intersection).
 *
 * @param poly         lawn polygon, coords in feet
 * @param rotationDeg  rotation applied to the polygon before slicing
 * @param stripWidthFt turf-roll width (default 14 ft)
 */
export function computeStripLayout(
  poly: Polygon,
  rotationDeg: number,
  stripWidthFt = DEFAULT_STRIP_WIDTH_FT,
): StripLayout {
  if (poly.length < 3) {
    return {
      rotationDeg,
      stripWidthFt,
      strips: [],
      totalCoveredSqFt: 0,
      totalRollSqFt: 0,
      wastePct: 0,
      seamCount: 0,
    };
  }

  const center = polygonCentroid(poly);
  const rotated = rotatePolygon(poly, -rotationDeg, center);
  const bounds = polygonBounds(rotated);
  const totalHeight = bounds.maxY - bounds.minY;
  const stripCount = Math.ceil(totalHeight / stripWidthFt);

  const strips: Strip[] = [];
  let totalCovered = 0;
  let totalRoll = 0;

  for (let i = 0; i < stripCount; i++) {
    const yMin = bounds.minY + i * stripWidthFt;
    const yMax = yMin + stripWidthFt;
    const { area, xMin, xMax, clipped } = slabMetrics(rotated, yMin, yMax);
    if (area <= 0) continue;
    const lengthFt = xMax - xMin;
    const rollArea = lengthFt * stripWidthFt;
    totalCovered += area;
    totalRoll += rollArea;
    strips.push({
      polygon: rotatePolygon(clipped, rotationDeg, center),
      areaSqFt: area,
      lengthFt,
      widthFt: stripWidthFt,
    });
  }

  const wastePct = totalRoll > 0 ? (totalRoll - totalCovered) / totalRoll : 0;
  // Seam count = boundaries between adjacent occupied strips. With N occupied
  // strips covering a single connected lawn, there are N - 1 seams between rows.
  const seamCount = Math.max(0, strips.length - 1);

  return {
    rotationDeg,
    stripWidthFt,
    strips,
    totalCoveredSqFt: totalCovered,
    totalRollSqFt: totalRoll,
    wastePct,
    seamCount,
  };
}

/**
 * Sweep rotations and return the layout that minimizes waste (objective for
 * the "Minimize Waste" design intent and the default Act 4 seam visualization).
 *
 * @param stepDeg  granularity of the rotation sweep (default 5°)
 */
export function findMinWasteLayout(
  poly: Polygon,
  stripWidthFt = DEFAULT_STRIP_WIDTH_FT,
  stepDeg = 5,
): StripLayout {
  let best: StripLayout | null = null;
  for (let deg = 0; deg < 180; deg += stepDeg) {
    const layout = computeStripLayout(poly, deg, stripWidthFt);
    if (!best || layout.wastePct < best.wastePct) best = layout;
  }
  return best ?? computeStripLayout(poly, 0, stripWidthFt);
}

/**
 * Compare N-S vs E-W orientations directly. Used by Act 4 ("we pick the
 * direction that hides the seams from your patio view") to show the
 * homeowner the seam-count tradeoff. The yard polygon should be supplied
 * with +y = north.
 */
export function compareCardinalLayouts(
  poly: Polygon,
  stripWidthFt = DEFAULT_STRIP_WIDTH_FT,
): { northSouth: StripLayout; eastWest: StripLayout } {
  // Strips running N-S means rolls are oriented along the y-axis. Our slicer
  // cuts horizontal slabs, so we rotate 90° to get N-S strips.
  return {
    northSouth: computeStripLayout(poly, 90, stripWidthFt),
    eastWest: computeStripLayout(poly, 0, stripWidthFt),
  };
}

export function totalLawnSqFt(poly: Polygon): number {
  return polygonArea(poly);
}
