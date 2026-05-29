'use client';

import { useMemo } from 'react';
import type { Polygon, StripLayout } from '@homefield/geometry';
import { polygonBounds } from '@homefield/geometry';

type Props = {
  polygon: Polygon;
  cutouts?: { id: string; polygonFt: Polygon; label?: string }[];
  layout?: StripLayout | null;
  pxPerFt?: number;
  showStrips?: boolean;
};

/**
 * Top-down architectural rendering. Lawn polygon + any cutout holes (pool,
 * flower bed, etc.) + optional turf-strip overlay from the strip-packer.
 *
 * Cutouts render as the same fill color as the page background, so they look
 * like genuine holes punched through the turf.
 */
export function ArchPlan({ polygon, cutouts = [], layout, pxPerFt = 6, showStrips = true }: Props) {
  const { width, height, lawnPath, cutoutPaths, stripPaths, tx, ty } = useMemo(() => {
    const bounds = polygonBounds(polygon);
    const pad = 24;
    const w = (bounds.maxX - bounds.minX) * pxPerFt + pad * 2;
    const h = (bounds.maxY - bounds.minY) * pxPerFt + pad * 2;
    const tx = (x: number) => (x - bounds.minX) * pxPerFt + pad;
    const ty = (y: number) => (y - bounds.minY) * pxPerFt + pad;
    const toPath = (p: Polygon) =>
      p.length === 0 ? '' : `M ${p.map((pt) => `${tx(pt.x)} ${ty(pt.y)}`).join(' L ')} Z`;

    const lawnPath = toPath(polygon);
    const cutoutPaths = cutouts.map((c) => ({ d: toPath(c.polygonFt), label: c.label }));
    const stripPaths =
      layout && showStrips ? layout.strips.map((s) => toPath(s.polygon)) : [];

    return { width: w, height: h, lawnPath, cutoutPaths, stripPaths, tx, ty };
  }, [polygon, cutouts, layout, pxPerFt, showStrips]);

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
          <mask id="lawn-mask">
            <rect width={width} height={height} fill="black" />
            <path d={lawnPath} fill="white" />
            {cutoutPaths.map((c, i) => (
              <path key={i} d={c.d} fill="black" />
            ))}
          </mask>
        </defs>
        <rect width={width} height={height} fill="url(#grid)" />

        {/* Turf fill with cutout holes punched out. */}
        <rect
          width={width}
          height={height}
          fill="#1d5a3a"
          fillOpacity={0.08}
          mask="url(#lawn-mask)"
        />

        {/* Lawn outline. */}
        <path d={lawnPath} fill="none" stroke="#1d5a3a" strokeWidth={2} />

        {/* Strip overlay clipped to the lawn-with-holes area. */}
        <g mask="url(#lawn-mask)">
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
        </g>

        {/* Cutout outlines + labels so the rep can see what they marked. */}
        {cutoutPaths.map((c, i) => (
          <g key={i}>
            <path d={c.d} fill="none" stroke="#0a0a0a" strokeWidth={1.5} strokeDasharray="6 4" />
          </g>
        ))}

        {/* Cutout text labels at centroid. */}
        {cutouts.map((c, i) => {
          if (c.polygonFt.length < 3 || !c.label) return null;
          const b = polygonBounds(c.polygonFt);
          const cx = (tx(b.minX) + tx(b.maxX)) / 2;
          const cy = (ty(b.minY) + ty(b.maxY)) / 2;
          return (
            <text
              key={`label-${i}`}
              x={cx}
              y={cy}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={11}
              fontWeight={500}
              fill="#52525b"
              style={{ pointerEvents: 'none' }}
            >
              {c.label}
            </text>
          );
        })}
      </svg>
    </div>
  );
}
