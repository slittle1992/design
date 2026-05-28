import type { Point, Polygon } from '@homefield/geometry';

/**
 * Centripetal Catmull-Rom interpolation through a closed sequence of points,
 * sampled into a dense polygon suitable for area/clipping math.
 *
 * `samplesPerSegment` = 1 falls back to straight lines (skips curving).
 */
export function smoothClosed(points: Point[], samplesPerSegment = 12): Polygon {
  if (points.length < 3 || samplesPerSegment <= 1) return [...points];

  const out: Polygon = [];
  const n = points.length;
  for (let i = 0; i < n; i++) {
    const p0 = points[(i - 1 + n) % n]!;
    const p1 = points[i]!;
    const p2 = points[(i + 1) % n]!;
    const p3 = points[(i + 2) % n]!;
    for (let s = 0; s < samplesPerSegment; s++) {
      const t = s / samplesPerSegment;
      out.push(catmullRom(p0, p1, p2, p3, t, 0.5));
    }
  }
  return out;
}

/**
 * Build an SVG path `d` attribute for a closed curve. Used purely for rendering
 * the lawn outline on the trace canvas; `smoothClosed` produces the polygon the
 * geometry package consumes.
 */
export function smoothClosedSvgPath(points: Point[]): string {
  if (points.length === 0) return '';
  if (points.length < 3) {
    return `M ${points.map((p) => `${p.x} ${p.y}`).join(' L ')} Z`;
  }
  const n = points.length;
  const cmds: string[] = [`M ${points[0]!.x} ${points[0]!.y}`];
  for (let i = 0; i < n; i++) {
    const p0 = points[(i - 1 + n) % n]!;
    const p1 = points[i]!;
    const p2 = points[(i + 1) % n]!;
    const p3 = points[(i + 2) % n]!;
    // Catmull-Rom → Bezier conversion (tension 0.5 → standard CR).
    const c1 = { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 };
    const c2 = { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 };
    cmds.push(`C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${p2.x} ${p2.y}`);
  }
  cmds.push('Z');
  return cmds.join(' ');
}

function catmullRom(p0: Point, p1: Point, p2: Point, p3: Point, t: number, tension: number): Point {
  const t2 = t * t;
  const t3 = t2 * t;
  const a = -tension * t3 + 2 * tension * t2 - tension * t;
  const b = (2 - tension) * t3 + (tension - 3) * t2 + 1;
  const c = (tension - 2) * t3 + (3 - 2 * tension) * t2 + tension * t;
  const d = tension * t3 - tension * t2;
  return {
    x: a * p0.x + b * p1.x + c * p2.x + d * p3.x,
    y: a * p0.y + b * p1.y + c * p2.y + d * p3.y,
  };
}
