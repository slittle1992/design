'use client';

import { useEffect, useRef, useState } from 'react';
import type { Point, Polygon } from '@homefield/geometry';
import { polygonArea } from '@homefield/geometry';
import { smoothClosed, smoothClosedSvgPath } from '@/lib/curves';
import { pixelsToFeet } from '@/lib/maps';

export type ShapeKind = 'lawn' | 'cutout';

export type EditableShape = {
  id: string;
  kind: ShapeKind;
  label?: string;
  vertices: Point[]; // pixel space
};

type ShapeChange = {
  id: string;
  vertices: Point[];
  polygonFt: Polygon;
  sqft: number;
};

type Props = {
  imageUrl: string;
  widthPx: number;
  heightPx: number;
  centerLat: number;
  zoom: number;
  scale: 1 | 2;
  lawn: EditableShape;
  cutouts: EditableShape[];
  activeId: string;
  onActiveChange: (id: string) => void;
  onShapeChange: (change: ShapeChange) => void;
  smooth?: boolean;
  onSmoothChange?: (smooth: boolean) => void;
};

const DRAG_THRESHOLD_PX = 6;
const VERTEX_RADIUS = 14;
const VERTEX_HIT = 22;

export function LawnTrace({
  imageUrl,
  widthPx,
  heightPx,
  centerLat,
  zoom,
  scale,
  lawn,
  cutouts,
  activeId,
  onActiveChange,
  onShapeChange,
  smooth = true,
  onSmoothChange,
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const allShapes: EditableShape[] = [lawn, ...cutouts];
  const active = allShapes.find((s) => s.id === activeId) ?? lawn;
  const ftPerPx = pixelsToFeet(1, centerLat, zoom, scale);

  // Drag state: which vertex is being dragged, and the starting screen position.
  const dragRef = useRef<{
    shapeId: string;
    index: number;
    startX: number;
    startY: number;
    moved: boolean;
  } | null>(null);

  const emitChange = (shape: EditableShape, nextVertices: Point[]) => {
    const dense = smooth && nextVertices.length >= 3 ? smoothClosed(nextVertices, 12) : [...nextVertices];
    const polygonFt = dense.map((p) => ({ x: p.x * ftPerPx, y: p.y * ftPerPx }));
    const sqft = polygonArea(polygonFt);
    onShapeChange({ id: shape.id, vertices: nextVertices, polygonFt, sqft });
  };

  // Convert pointer-event coords → SVG view-box coords (handles CSS scaling).
  const toSvg = (clientX: number, clientY: number): Point | null => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return null;
    return {
      x: ((clientX - rect.left) / rect.width) * widthPx,
      y: ((clientY - rect.top) / rect.height) * heightPx,
    };
  };

  // Top-level canvas pointer-down: if it didn't land on a vertex, treat as
  // "add a vertex to the active shape".
  const onCanvasPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (dragRef.current) return; // a vertex grabbed it first
    const pt = toSvg(e.clientX, e.clientY);
    if (!pt) return;
    emitChange(active, [...active.vertices, pt]);
  };

  // Vertex pointer-down: start drag tracking. If pointer never moves past the
  // threshold by pointer-up, treat as a tap → remove the vertex.
  const onVertexPointerDown = (
    e: React.PointerEvent<SVGCircleElement>,
    shape: EditableShape,
    index: number,
  ) => {
    e.stopPropagation();
    if (shape.id !== activeId) {
      onActiveChange(shape.id);
    }
    (e.target as Element).setPointerCapture(e.pointerId);
    dragRef.current = {
      shapeId: shape.id,
      index,
      startX: e.clientX,
      startY: e.clientY,
      moved: false,
    };
  };

  const onVertexPointerMove = (e: React.PointerEvent<SVGCircleElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;
    if (!drag.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) return;
    drag.moved = true;
    const pt = toSvg(e.clientX, e.clientY);
    if (!pt) return;
    const shape = allShapes.find((s) => s.id === drag.shapeId);
    if (!shape) return;
    const next = shape.vertices.map((v, i) => (i === drag.index ? pt : v));
    emitChange(shape, next);
  };

  const onVertexPointerUp = (
    e: React.PointerEvent<SVGCircleElement>,
    shape: EditableShape,
    index: number,
  ) => {
    const drag = dragRef.current;
    dragRef.current = null;
    try {
      (e.target as Element).releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    if (drag && !drag.moved) {
      // tap → remove
      emitChange(
        shape,
        shape.vertices.filter((_, i) => i !== index),
      );
    }
  };

  // Re-emit when smooth toggles so the parent's polygonFt stays in sync.
  useEffect(() => {
    emitChange(active, active.vertices);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [smooth]);

  const renderShape = (shape: EditableShape) => {
    const isActive = shape.id === activeId;
    const isLawn = shape.kind === 'lawn';
    const path =
      shape.vertices.length === 0
        ? ''
        : smooth && shape.vertices.length >= 3
          ? smoothClosedSvgPath(shape.vertices)
          : `M ${shape.vertices.map((p) => `${p.x} ${p.y}`).join(' L ')}${
              shape.vertices.length >= 3 ? ' Z' : ''
            }`;

    return (
      <g key={shape.id} opacity={isActive ? 1 : 0.7}>
        {shape.vertices.length >= 2 && (
          <path
            d={path}
            fill={isLawn ? 'rgba(29, 90, 58, 0.25)' : 'rgba(10, 10, 10, 0.45)'}
            stroke={isLawn ? '#ffffff' : '#ffffff'}
            strokeWidth={isActive ? 4 : 2.5}
            strokeDasharray={isLawn ? undefined : '6 4'}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        )}
        {shape.vertices.map((v, i) => (
          <g key={i}>
            {/* Larger invisible hit target for fat fingers. */}
            <circle
              cx={v.x}
              cy={v.y}
              r={VERTEX_HIT}
              fill="transparent"
              onPointerDown={(e) => onVertexPointerDown(e, shape, i)}
              onPointerMove={onVertexPointerMove}
              onPointerUp={(e) => onVertexPointerUp(e, shape, i)}
              style={{ cursor: 'grab', touchAction: 'none' }}
            />
            <circle
              cx={v.x}
              cy={v.y}
              r={VERTEX_RADIUS}
              fill={isActive ? '#ffffff' : '#d4d4d8'}
              stroke="#0a0a0a"
              strokeWidth={2}
              pointerEvents="none"
            />
          </g>
        ))}
      </g>
    );
  };

  return (
    <div className="space-y-3">
      <div
        className="relative w-full overflow-hidden rounded-xl border border-line bg-ink"
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
          onPointerDown={onCanvasPointerDown}
        >
          {/* Render inactive shapes first, then active on top. */}
          {allShapes.filter((s) => s.id !== activeId).map(renderShape)}
          {renderShape(active)}
        </svg>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => onSmoothChange?.(!smooth)}
          className={`chip ${smooth ? 'chip-selected' : ''}`}
        >
          Smooth curves
        </button>
        <button
          onClick={() => active.vertices.length > 0 && emitChange(active, [])}
          disabled={active.vertices.length === 0}
          className="chip disabled:opacity-40"
        >
          Clear {active.kind === 'lawn' ? 'lawn' : 'shape'}
        </button>
      </div>

      <p className="text-[13px] text-ink-muted">
        Tap to add a corner · drag a corner to move · tap a corner to remove
      </p>
    </div>
  );
}
