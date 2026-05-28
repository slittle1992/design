import { describe, expect, it } from 'vitest';
import {
  computeStripLayout,
  findMinWasteLayout,
  compareCardinalLayouts,
} from '../src/strip-pack';

const rectangle = (w: number, h: number) => [
  { x: 0, y: 0 },
  { x: w, y: 0 },
  { x: w, y: h },
  { x: 0, y: h },
];

describe('computeStripLayout', () => {
  it('covers a rectangle perfectly aligned with the strip width', () => {
    // 14 x 30 lawn, strips run E-W (rotation 0): one 14-ft-tall slab fits.
    const layout = computeStripLayout(rectangle(30, 14), 0, 14);
    expect(layout.strips).toHaveLength(1);
    expect(layout.totalCoveredSqFt).toBeCloseTo(30 * 14, 6);
    expect(layout.totalRollSqFt).toBeCloseTo(30 * 14, 6);
    expect(layout.wastePct).toBeCloseTo(0, 6);
    expect(layout.seamCount).toBe(0);
  });

  it('produces 0% waste on a 28x40 rectangle (two perfect strips)', () => {
    const layout = computeStripLayout(rectangle(40, 28), 0, 14);
    expect(layout.strips).toHaveLength(2);
    expect(layout.totalCoveredSqFt).toBeCloseTo(28 * 40, 6);
    expect(layout.wastePct).toBeCloseTo(0, 6);
    expect(layout.seamCount).toBe(1);
  });

  it('produces waste when polygon height is not a multiple of strip width', () => {
    // 40 x 20 lawn, strips E-W: two slabs needed (14 + 6); second roll wastes 8ft.
    const layout = computeStripLayout(rectangle(40, 20), 0, 14);
    expect(layout.strips).toHaveLength(2);
    expect(layout.totalCoveredSqFt).toBeCloseTo(40 * 20, 6);
    // Roll area = 2 strips * (40 wide * 14 tall) = 1120; covered = 800; waste = 320/1120
    expect(layout.totalRollSqFt).toBeCloseTo(1120, 6);
    expect(layout.wastePct).toBeCloseTo(320 / 1120, 6);
  });
});

describe('findMinWasteLayout', () => {
  it('prefers the orientation that aligns strips with the long dimension', () => {
    // 56 x 14 rectangle. E-W (0°) is one perfect strip; N-S (90°) needs 4 strips
    // of length 14 each, totaling 56*14 covered with the same roll. Both should
    // be near-zero waste, but the sweep should still find <= 1% waste.
    const layout = findMinWasteLayout(rectangle(56, 14), 14, 5);
    expect(layout.wastePct).toBeLessThan(0.01);
  });

  it('finds a sensible layout for a tilted rectangle', () => {
    // 30 x 14 lawn rotated by 30°. Optimal rotation should match (~30°) and give
    // near-zero waste.
    const tilted = rectangle(30, 14).map((p) => {
      const rad = (30 * Math.PI) / 180;
      return {
        x: p.x * Math.cos(rad) - p.y * Math.sin(rad),
        y: p.x * Math.sin(rad) + p.y * Math.cos(rad),
      };
    });
    const layout = findMinWasteLayout(tilted, 14, 5);
    expect(layout.wastePct).toBeLessThan(0.05);
  });
});

describe('compareCardinalLayouts', () => {
  it('reports both orientations and exposes the seam/waste tradeoff', () => {
    // 60 x 28 lawn.
    //   E-W: 2 strips of 60ft × 14ft → 0% waste, 1 seam.
    //   N-S: ⌈60/14⌉ = 5 strips of 28ft tall, last strip only needs 4ft of its
    //        14ft width. Roll area = 5 × 28 × 14 = 1960; covered = 1680; waste = 280/1960.
    const { northSouth, eastWest } = compareCardinalLayouts(rectangle(60, 28), 14);
    expect(eastWest.seamCount).toBe(1);
    expect(eastWest.wastePct).toBeCloseTo(0, 6);
    expect(northSouth.seamCount).toBe(4);
    expect(northSouth.wastePct).toBeCloseTo(280 / 1960, 6);
    expect(eastWest.wastePct).toBeLessThan(northSouth.wastePct);
  });
});
