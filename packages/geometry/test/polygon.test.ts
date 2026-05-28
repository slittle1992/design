import { describe, expect, it } from 'vitest';
import { polygonArea, polygonBounds, rotatePolygon } from '../src/polygon.js';

describe('polygonArea', () => {
  it('computes the area of a unit square', () => {
    expect(
      polygonArea([
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 1, y: 1 },
        { x: 0, y: 1 },
      ]),
    ).toBe(1);
  });

  it('handles a 40x30 rectangle as 1200 sqft', () => {
    expect(
      polygonArea([
        { x: 0, y: 0 },
        { x: 40, y: 0 },
        { x: 40, y: 30 },
        { x: 0, y: 30 },
      ]),
    ).toBe(1200);
  });

  it('returns 0 for degenerate polygons', () => {
    expect(polygonArea([])).toBe(0);
    expect(polygonArea([{ x: 0, y: 0 }])).toBe(0);
  });

  it('is rotation-invariant', () => {
    const square = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
      { x: 0, y: 10 },
    ];
    const rotated = rotatePolygon(square, 37);
    expect(polygonArea(rotated)).toBeCloseTo(100, 6);
  });
});

describe('polygonBounds', () => {
  it('finds the bounding box of a rectangle', () => {
    expect(
      polygonBounds([
        { x: -5, y: 10 },
        { x: 15, y: 10 },
        { x: 15, y: 25 },
        { x: -5, y: 25 },
      ]),
    ).toEqual({ minX: -5, minY: 10, maxX: 15, maxY: 25 });
  });
});
