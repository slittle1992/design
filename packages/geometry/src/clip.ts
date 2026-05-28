import type { Point, Polygon } from './types';
import { polygonArea } from './polygon';

/**
 * Clip a polygon to the half-plane y >= yMin using Sutherland-Hodgman.
 * Subject polygon can be non-convex; output area is correct even when
 * the algorithm produces coincident edges (the shoelace formula handles them).
 */
function clipBelow(poly: Polygon, yMin: number): Polygon {
  const out: Polygon = [];
  if (poly.length === 0) return out;
  for (let i = 0; i < poly.length; i++) {
    const cur = poly[i]!;
    const prev = poly[(i - 1 + poly.length) % poly.length]!;
    const curIn = cur.y >= yMin;
    const prevIn = prev.y >= yMin;
    if (curIn) {
      if (!prevIn) out.push(intersectHorizontal(prev, cur, yMin));
      out.push(cur);
    } else if (prevIn) {
      out.push(intersectHorizontal(prev, cur, yMin));
    }
  }
  return out;
}

function clipAbove(poly: Polygon, yMax: number): Polygon {
  const out: Polygon = [];
  if (poly.length === 0) return out;
  for (let i = 0; i < poly.length; i++) {
    const cur = poly[i]!;
    const prev = poly[(i - 1 + poly.length) % poly.length]!;
    const curIn = cur.y <= yMax;
    const prevIn = prev.y <= yMax;
    if (curIn) {
      if (!prevIn) out.push(intersectHorizontal(prev, cur, yMax));
      out.push(cur);
    } else if (prevIn) {
      out.push(intersectHorizontal(prev, cur, yMax));
    }
  }
  return out;
}

function intersectHorizontal(a: Point, b: Point, y: number): Point {
  const t = (y - a.y) / (b.y - a.y);
  return { x: a.x + t * (b.x - a.x), y };
}

/**
 * Clip a polygon to the horizontal slab yMin <= y <= yMax.
 * Returns the clipped polygon (may be degenerate but area is correct).
 */
export function clipToSlab(poly: Polygon, yMin: number, yMax: number): Polygon {
  return clipAbove(clipBelow(poly, yMin), yMax);
}

/**
 * Area + horizontal extent of `poly` within slab [yMin, yMax].
 * Horizontal extent is the bounding x-range of the intersection — this
 * determines the turf-roll length needed to cover the slab.
 */
export function slabMetrics(
  poly: Polygon,
  yMin: number,
  yMax: number,
): { area: number; xMin: number; xMax: number; clipped: Polygon } {
  const clipped = clipToSlab(poly, yMin, yMax);
  if (clipped.length < 3) {
    return { area: 0, xMin: 0, xMax: 0, clipped };
  }
  let xMin = Infinity;
  let xMax = -Infinity;
  for (const p of clipped) {
    if (p.x < xMin) xMin = p.x;
    if (p.x > xMax) xMax = p.x;
  }
  return { area: polygonArea(clipped), xMin, xMax, clipped };
}
