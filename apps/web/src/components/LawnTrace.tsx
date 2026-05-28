'use client';

import { useRef, useState } from 'react';
import type { Point } from '@homefield/geometry';
import { polygonArea } from '@homefield/geometry';
import { smoothClosed, smoothClosedSvgPath } from '@/lib/curves';
import { pixelsToFeet } from '@/lib/maps';

type Props = {
  imageUrl: string;
  widthPx: number;
  heightPx: number;
  centerLat: number;
  zoom: number;
  scale: 1 | 2;
  initialVertices?: Point[];
  onChange: (state: { vertices: Point[]; polygon: Point[]; sqft: number }) => void;
};

/**
 * Tap-trace canvas over a satellite tile. Each tap adds a vertex; tap a
 * vertex to remove it. The closed shape is smoothed with Catmull-Rom to
 * capture curved property lines without separate curve handles.
 */
export function LawnTrace({
  imageUrl,
  widthPx,
  heightPx,
  centerLat,
  zoom,
  scale,
  initialVertices = [],
  onChange,
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [vertices, setVertices] = useState<Point[]>(initialVertices);
  const [smooth, setSmooth] = useState(true);

  const update = (next: Point[]) => {
    setVertices(next);
    const dense = smooth ? smoothClosed(next, 12) : [...next];
    const areaPx = polygonArea(dense);
    // Convert px² → ft². metersPerPixel uses center latitude (good approximation
    // at the scale of a single back yard).
    const ftPerPx = pixelsToFeet(1, centerLat, zoom, scale);
    const sqft = areaPx * ftPerPx * ftPerPx;
    onChange({ vertices: next, polygon: dense, sqft });
  };

  const onCanvasTap = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * widthPx;
    const y = ((e.clientY - rect.top) / rect.height) * heightPx;
    update([...vertices, { x, y }]);
  };

  const removeVertex = (i: number, e: React.PointerEvent) => {
    e.stopPropagation();
    update(vertices.filter((_, idx) => idx !== i));
  };

  const undo = () => update(vertices.slice(0, -1));
  const clear = () => update([]);

  const pathD = smooth
    ? smoothClosedSvgPath(vertices)
    : vertices.length >= 3
      ? `M ${vertices.map((p) => `${p.x} ${p.y}`).join(' L ')} Z`
      : '';

  return (
    <div className="space-y-3">
      <div
        className="relative w-full overflow-hidden rounded-2xl border-4 border-field-darker bg-field-darker"
        style={{ aspectRatio: `${widthPx} / ${heightPx}` }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt="Satellite view"
          className="absolute inset-0 h-full w-full select-none pointer-events-none"
          draggable={false}
        />
        <svg
          ref={svgRef}
          viewBox={`0 0 ${widthPx} ${heightPx}`}
          className="absolute inset-0 h-full w-full touch-none"
          onPointerDown={onCanvasTap}
        >
          {vertices.length >= 2 && (
            <path
              d={pathD || `M ${vertices.map((p) => `${p.x} ${p.y}`).join(' L ')}`}
              fill="rgba(245, 236, 214, 0.35)"
              stroke="#f5ecd6"
              strokeWidth={6}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          )}
          {vertices.map((v, i) => (
            <circle
              key={i}
              cx={v.x}
              cy={v.y}
              r={18}
              fill="#1d5a3a"
              stroke="#f5ecd6"
              strokeWidth={4}
              onPointerDown={(e) => removeVertex(i, e)}
            />
          ))}
        </svg>
      </div>

      <div className="flex flex-wrap gap-3">
        <button onClick={undo} disabled={vertices.length === 0} className="pill disabled:opacity-40">
          ↶ Undo
        </button>
        <button
          onClick={() => setSmooth((s) => !s)}
          className={`pill ${smooth ? 'pill-selected' : ''}`}
        >
          {smooth ? 'Smooth curves ✓' : 'Smooth curves'}
        </button>
        <button onClick={clear} disabled={vertices.length === 0} className="pill disabled:opacity-40">
          Clear
        </button>
      </div>

      <p className="text-base font-semibold opacity-70">
        Tap to add a corner. Tap a corner to remove it. Smooth curves on for irregular
        property lines, off for straight edges.
      </p>
    </div>
  );
}
