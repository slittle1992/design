import { describe, expect, it } from 'vitest';
import { computeStripLayout } from '../src/strip-pack';
import { multiPolygonArea, subtractCutouts } from '../src/subtract';

const rect = (x: number, y: number, w: number, h: number) => [
  { x, y },
  { x: x + w, y },
  { x: x + w, y: y + h },
  { x, y: y + h },
];

describe('subtractCutouts', () => {
  it('returns the lawn unchanged when there are no cutouts', () => {
    const lawn = rect(0, 0, 40, 30);
    const result = subtractCutouts(lawn, []);
    expect(multiPolygonArea(result.map((p) => p[0]!.map(([x, y]) => ({ x, y }))))).toBeCloseTo(
      1200,
      6,
    );
  });

  it('subtracts an interior pool from the lawn', () => {
    const lawn = rect(0, 0, 40, 30);
    const pool = rect(10, 10, 10, 10);
    const result = subtractCutouts(lawn, [pool]);
    // polygon-clipping returns a polygon with a hole; multiPolygonArea
    // counts outer rings only, but for area purposes shoelace on outer
    // gives 1200 (the original). For accurate net we use the strip-packer.
    expect(result.length).toBe(1);
    // The result has an outer ring (lawn) and an inner hole (pool).
    expect(result[0]!.length).toBeGreaterThanOrEqual(2);
  });
});

describe('computeStripLayout with cutouts', () => {
  it('matches the no-cutout layout when cutouts is empty', () => {
    const lawn = rect(0, 0, 56, 14);
    const a = computeStripLayout(lawn, 0, 14);
    const b = computeStripLayout(lawn, 0, 14, []);
    expect(a.strips.length).toBe(b.strips.length);
    expect(a.totalCoveredSqFt).toBeCloseTo(b.totalCoveredSqFt, 4);
    expect(a.seamCount).toBe(b.seamCount);
  });

  it('adds horizontal seams when a cutout splits a strip in two', () => {
    // 60x14 lawn, one strip running E-W. A 10x14 cutout dead-center splits
    // that single strip into two disjoint pieces → 1 extra (horizontal) seam.
    const lawn = rect(0, 0, 60, 14);
    const cutout = rect(25, 0, 10, 14);
    const withCutout = computeStripLayout(lawn, 0, 14, [cutout]);
    expect(withCutout.strips.length).toBe(2); // two disjoint pieces
    expect(withCutout.seamCount).toBeGreaterThanOrEqual(1);
    // Net covered area should be lawn − cutout = 840 − 140 = 700.
    expect(withCutout.totalCoveredSqFt).toBeCloseTo(700, 1);
  });

  it('subtracts an interior pool from the covered area', () => {
    // 40x28 lawn, two strips. A 10x10 pool dead-center doesn't fully split
    // either strip (it only intrudes into the middle), so each strip is
    // still one piece per row → no extra horizontal seams, but the pool
    // creates a notch and a horizontal seam may appear from the notch.
    const lawn = rect(0, 0, 40, 28);
    const pool = rect(15, 9, 10, 10);
    const result = computeStripLayout(lawn, 0, 14, [pool]);
    const expectedCovered = 40 * 28 - 10 * 10;
    expect(result.totalCoveredSqFt).toBeCloseTo(expectedCovered, 1);
  });
});
