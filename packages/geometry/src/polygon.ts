import type { Point, Polygon } from './types';

export function polygonArea(poly: Polygon): number {
  if (poly.length < 3) return 0;
  let sum = 0;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i]!;
    const b = poly[(i + 1) % poly.length]!;
    sum += a.x * b.y - b.x * a.y;
  }
  return Math.abs(sum) / 2;
}

export function polygonBounds(poly: Polygon): {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
} {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of poly) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  return { minX, minY, maxX, maxY };
}

export function rotatePoint(p: Point, deg: number, origin: Point = { x: 0, y: 0 }): Point {
  const rad = (deg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const dx = p.x - origin.x;
  const dy = p.y - origin.y;
  return {
    x: origin.x + dx * cos - dy * sin,
    y: origin.y + dx * sin + dy * cos,
  };
}

export function rotatePolygon(poly: Polygon, deg: number, origin: Point = { x: 0, y: 0 }): Polygon {
  return poly.map((p) => rotatePoint(p, deg, origin));
}

export function polygonCentroid(poly: Polygon): Point {
  const b = polygonBounds(poly);
  return { x: (b.minX + b.maxX) / 2, y: (b.minY + b.maxY) / 2 };
}
