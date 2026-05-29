'use client';

import { useMemo } from 'react';
import type { Polygon, StripLayout } from '@homefield/geometry';
import { polygonBounds } from '@homefield/geometry';

type Props = {
  polygon: Polygon;
  layout?: StripLayout | null;
  pxPerFt?: number;
  showStrips?: boolean;
};

/**
 * Top-down architectural rendering of the lawn polygon (already in feet) with
 * optional turf-strip overlay from the strip-packer.
 */
export function ArchPlan({ polygon, layout, pxPerFt = 6, showStrips = true }: Props) {
  const { width, height, path, stripPaths } = useMemo(() => {
    const bounds = polygonBounds(polygon);
    const pad = 24;
    const w = (bounds.maxX - bounds.minX) * pxPerFt + pad * 2;
    const h = (bounds.maxY - bounds.minY) * pxPerFt + pad * 2;
    const tx = (x: number) => (x - bounds.minX) * pxPerFt + pad;
    const ty = (y: number) => (y - bounds.minY) * pxPerFt + pad;

    const path =
      polygon.length === 0
        ? ''
        : `M ${polygon.map((p) => `${tx(p.x)} ${ty(p.y)}`).join(' L ')} Z`;

    const stripPaths =
      layout && showStrips
        ? layout.strips.map(
            (s) =>
              `M ${s.polygon
                .map((p) => `${tx(p.x)} ${ty(p.y)}`)
                .join(' L ')} Z`,
          )
        : [];

    return { width: w, height: h, path, stripPaths };
  }, [polygon, layout, pxPerFt, showStrips]);

  if (polygon.length < 3) return null;

  return (
    <div className="rounded-xl border border-line bg-surface-soft p-4 overflow-auto">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto max-h-[70vh]"
        style={{ aspectRatio: `${width} / ${height}` }}
      >
        <defs>
          <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
            <path d="M 60 0 L 0 0 0 60" fill="none" stroke="#e4e4e7" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width={width} height={height} fill="url(#grid)" />
        <path d={path} fill="#1d5a3a" fillOpacity="0.08" stroke="#1d5a3a" strokeWidth={2} />
        {stripPaths.map((d, i) => (
          <path
            key={i}
            d={d}
            fill="none"
            stroke="#1d5a3a"
            strokeWidth={1}
            strokeDasharray="4 4"
            opacity={0.6}
          />
        ))}
      </svg>
    </div>
  );
}
