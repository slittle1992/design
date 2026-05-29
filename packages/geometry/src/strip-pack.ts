import type { Polygon, Strip, StripLayout } from './types';
import {
  polygonArea,
  polygonBounds,
  polygonCentroid,
  rotatePoint,
  rotatePolygon,
} from './polygon';
import { slabMetrics } from './clip';
import {
  multiPolygonArea,
  pcBounds,
  rotateMultiPolygon,
  slabPieces,
  subtractCutouts,
  type MultiPolygon,
} from './subtract';

export const DEFAULT_STRIP_WIDTH_FT = 14;

/**
 * Compute the strip layout for a lawn polygon at a given rotation.
 *
 * With no cutouts: uses the fast Sutherland-Hodgman slab clip and assumes
 *   the lawn is a single connected piece. Seam count = strips - 1.
 *
 * With cutouts: subtracts the cutouts from the lawn (polygon-clipping
 *   Greiner-Hormann), then for each slab intersects with the (lawn -
 *   cutouts) surface and counts disjoint pieces. Extra pieces per slab
 *   add horizontal seams — e.g., a pool dead-center in a strip splits
 *   that row in two.
 */
export function computeStripLayout(
  poly: Polygon,
  rotationDeg: number,
  stripWidthFt = DEFAULT_STRIP_WIDTH_FT,
  cutouts: Polygon[] = [],
): StripLayout {
  if (poly.length < 3) {
    return emptyLayout(rotationDeg, stripWidthFt);
  }

  // Rotate everything by -rotationDeg around the polygon centroid so strips
  // run horizontally in the working coordinate system, then rotate the
  // resulting strip polygons back when emitting.
  const center = polygonCentroid(poly);
  const rotated = rotatePolygon(poly, -rotationDeg, center);

  if (cutouts.length === 0) {
    return layoutFromSinglePolygon(rotated, center, rotationDeg, stripWidthFt);
  }

  const rotatedCutouts = cutouts
    .filter((c) => c.length >= 3)
    .map((c) => rotatePolygon(c, -rotationDeg, center));

  return layoutFromCutouts(rotated, rotatedCutouts, center, rotationDeg, stripWidthFt);
}

function emptyLayout(rotationDeg: number, stripWidthFt: number): StripLayout {
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

function layoutFromSinglePolygon(
  rotated: Polygon,
  center: { x: number; y: number },
  rotationDeg: number,
  stripWidthFt: number,
): StripLayout {
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
    totalCovered += area;
    totalRoll += lengthFt * stripWidthFt;
    strips.push({
      polygon: rotatePolygon(clipped, rotationDeg, center),
      areaSqFt: area,
      lengthFt,
      widthFt: stripWidthFt,
    });
  }

  const wastePct = totalRoll > 0 ? (totalRoll - totalCovered) / totalRoll : 0;
  return {
    rotationDeg,
    stripWidthFt,
    strips,
    totalCoveredSqFt: totalCovered,
    totalRollSqFt: totalRoll,
    wastePct,
    seamCount: Math.max(0, strips.length - 1),
  };
}

function layoutFromCutouts(
  rotatedLawn: Polygon,
  rotatedCutouts: Polygon[],
  center: { x: number; y: number },
  rotationDeg: number,
  stripWidthFt: number,
): StripLayout {
  const surface = subtractCutouts(rotatedLawn, rotatedCutouts);
  const bounds = pcBounds(surface);
  if (!isFinite(bounds.minX)) return emptyLayout(rotationDeg, stripWidthFt);

  const totalHeight = bounds.maxY - bounds.minY;
  const stripCount = Math.ceil(totalHeight / stripWidthFt);
  const margin = 0.001; // pad x-bounds so edge-touching pieces survive intersection

  const strips: Strip[] = [];
  let totalCovered = 0;
  let totalRoll = 0;
  let verticalSeams = 0; // between adjacent populated rows
  let horizontalSeams = 0; // between disjoint pieces inside a row
  let prevRowPopulated = false;

  for (let i = 0; i < stripCount; i++) {
    const yMin = bounds.minY + i * stripWidthFt;
    const yMax = yMin + stripWidthFt;
    const pieces = slabPieces(
      surface,
      yMin,
      yMax,
      bounds.minX - margin,
      bounds.maxX + margin,
    );
    if (pieces.length === 0) {
      prevRowPopulated = false;
      continue;
    }
    if (prevRowPopulated) verticalSeams += 1;
    prevRowPopulated = true;
    horizontalSeams += Math.max(0, pieces.length - 1);

    // For each disjoint piece, emit a Strip. Roll area for the row is the
    // sum of each piece's x-extent × stripWidth — laying a roll across
    // gaps still wastes the gap material since you can't reuse offcuts.
    for (const piece of pieces) {
      const area = polygonArea(piece);
      if (area <= 0) continue;
      let pieceMinX = Infinity;
      let pieceMaxX = -Infinity;
      for (const p of piece) {
        if (p.x < pieceMinX) pieceMinX = p.x;
        if (p.x > pieceMaxX) pieceMaxX = p.x;
      }
      const lengthFt = pieceMaxX - pieceMinX;
      totalCovered += area;
      totalRoll += lengthFt * stripWidthFt;
      strips.push({
        polygon: piece.map((pt) => rotatePoint(pt, rotationDeg, center)),
        areaSqFt: area,
        lengthFt,
        widthFt: stripWidthFt,
      });
    }
  }

  const wastePct = totalRoll > 0 ? (totalRoll - totalCovered) / totalRoll : 0;
  return {
    rotationDeg,
    stripWidthFt,
    strips,
    totalCoveredSqFt: totalCovered,
    totalRollSqFt: totalRoll,
    wastePct,
    seamCount: verticalSeams + horizontalSeams,
  };
}

export function findMinWasteLayout(
  poly: Polygon,
  stripWidthFt = DEFAULT_STRIP_WIDTH_FT,
  stepDeg = 5,
  cutouts: Polygon[] = [],
): StripLayout {
  let best: StripLayout | null = null;
  for (let deg = 0; deg < 180; deg += stepDeg) {
    const layout = computeStripLayout(poly, deg, stripWidthFt, cutouts);
    if (!best || layout.wastePct < best.wastePct) best = layout;
  }
  return best ?? computeStripLayout(poly, 0, stripWidthFt, cutouts);
}

export function compareCardinalLayouts(
  poly: Polygon,
  stripWidthFt = DEFAULT_STRIP_WIDTH_FT,
  cutouts: Polygon[] = [],
): { northSouth: StripLayout; eastWest: StripLayout } {
  return {
    northSouth: computeStripLayout(poly, 90, stripWidthFt, cutouts),
    eastWest: computeStripLayout(poly, 0, stripWidthFt, cutouts),
  };
}

export function totalLawnSqFt(poly: Polygon): number {
  return polygonArea(poly);
}

export { multiPolygonArea, type MultiPolygon };
