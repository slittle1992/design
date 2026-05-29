import polygonClipping, {
  type MultiPolygon as PCMultiPolygon,
  type Polygon as PCPolygon,
} from 'polygon-clipping';
import type { Polygon } from './types';

export type MultiPolygon = Polygon[];

function toPC(poly: Polygon): PCPolygon {
  return [poly.map((p) => [p.x, p.y] as [number, number])];
}

function fromPC(mp: PCMultiPolygon): MultiPolygon {
  const out: MultiPolygon = [];
  for (const polygon of mp) {
    const outer = polygon[0];
    if (!outer) continue;
    out.push(outer.map(([x, y]) => ({ x, y })));
  }
  return out;
}

/**
 * Subtract cutouts from a lawn polygon. Returns a polygon-clipping
 * MultiPolygon so callers can intersect it with slab rectangles without
 * losing the holes that pools/decks punch through the middle.
 */
export function subtractCutouts(lawn: Polygon, cutouts: Polygon[]): PCMultiPolygon {
  if (cutouts.length === 0 || lawn.length < 3) return [toPC(lawn)];
  const valid = cutouts.filter((c) => c.length >= 3).map(toPC);
  if (valid.length === 0) return [toPC(lawn)];
  return polygonClipping.difference(toPC(lawn), ...valid);
}

/**
 * Intersect the (lawn − cutouts) surface with a horizontal slab and return
 * the resulting disjoint pieces. Each piece is a separate turf cut, so
 * pieces.length - 1 added to the seam count per slab.
 */
export function slabPieces(
  lawnMinusCutouts: PCMultiPolygon,
  yMin: number,
  yMax: number,
  xMin: number,
  xMax: number,
): MultiPolygon {
  const slab: PCPolygon = [
    [
      [xMin, yMin],
      [xMax, yMin],
      [xMax, yMax],
      [xMin, yMax],
      [xMin, yMin],
    ],
  ];
  const result = polygonClipping.intersection(lawnMinusCutouts, [slab]);
  return fromPC(result);
}

export function multiPolygonArea(mp: MultiPolygon): number {
  let total = 0;
  for (const poly of mp) {
    if (poly.length < 3) continue;
    let sum = 0;
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i]!;
      const b = poly[(i + 1) % poly.length]!;
      sum += a.x * b.y - b.x * a.y;
    }
    total += Math.abs(sum) / 2;
  }
  return total;
}

export function rotateMultiPolygon(
  mp: PCMultiPolygon,
  deg: number,
  origin: { x: number; y: number },
): PCMultiPolygon {
  const rad = (deg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return mp.map((polygon) =>
    polygon.map((ring) =>
      ring.map(([x, y]) => {
        const dx = x - origin.x;
        const dy = y - origin.y;
        return [origin.x + dx * cos - dy * sin, origin.y + dx * sin + dy * cos] as [
          number,
          number,
        ];
      }),
    ),
  );
}

export function pcBounds(mp: PCMultiPolygon): {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
} {
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (const polygon of mp) {
    for (const ring of polygon) {
      for (const [x, y] of ring) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }
  return { minX, minY, maxX, maxY };
}
