'use client';

import { useEffect, useRef } from 'react';
import type { Point, Polygon } from '@homefield/geometry';
import { polygonArea } from '@homefield/geometry';
import { smoothClosed, smoothClosedSvgPath } from '@/lib/curves';
import { pixelsToFeet } from '@/lib/maps';

export type ShapeKind = 'lawn' | 'cutout';

export type EditableShape = {
  id: string;
  kind: ShapeKind;
  label?: string;
  closed: boolean;
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
  onShapeClose: (id: string) => void;
  smooth?: boolean;
  onSmoothChange?: (smooth: boolean) => void;
};

const DRAG_THRESHOLD_PX = 6;
const VERTEX_RADIUS = 14;
const VERTEX_HIT = 22;
const SNAP_CLOSE_PX = 24; // tap near the first vertex closes an open shape

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
  onShapeClose,
  smooth = true,
  onSmoothChange,
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const allShapes: EditableShape[] = [lawn, ...cutouts];
  const active = allShapes.find((s) => s.id === activeId) ?? lawn;
  const ftPerPx = pixelsToFeet(1, centerLat, zoom, scale);
  // While editing a cutout, the lawn (and any other shapes) drop out so the
  // rep can focus on marking just what isn't covered.
  const focusMode: 'lawn' | 'cutout' = active.kind;

  const dragRef = useRef<{
    shapeId: string;
    index: number;
    startX: number;
    startY: number;
    moved: boolean;
  } | null>(null);

  const emitChange = (shape: EditableShape, nextVertices: Point[]) => {
    const dense =
      smooth && nextVertices.length >= 3 ? smoothClosed(nextVertices, 12) : [...nextVertices];
    const polygonFt = dense.map((p) => ({ x: p.x * ftPerPx, y: p.y * ftPerPx }));
    const sqft = polygonArea(polygonFt);
    onShapeChange({ id: shape.id, vertices: nextVertices, polygonFt, sqft });
  };

  const toSvg = (clientX: number, clientY: number): Point | null => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return null;
    return {
      x: ((clientX - rect.left) / rect.width) * widthPx,
      y: ((clientY - rect.top) / rect.height) * heightPx,
    };
  };

  // Tap on the canvas: while shape is open, append. While shape is closed,
  // insert at the nearest edge so corners land in the right order.
  const onCanvasPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (dragRef.current) return;
    const pt = toSvg(e.clientX, e.clientY);
    if (!pt) return;

    if (!active.closed) {
      // Snap to first vertex if close enough → close the shape.
      if (active.vertices.length >= 3) {
        const first = active.vertices[0]!;
        const dx = first.x - pt.x;
        const dy = first.y - pt.y;
        const screenScale = svgRef.current
          ? svgRef.current.getBoundingClientRect().width / widthPx
          : 1;
        const screenDist = Math.hypot(dx, dy) * screenScale;
        if (screenDist < SNAP_CLOSE_PX) {
          onShapeClose(active.id);
          return;
        }
      }
      emitChange(active, [...active.vertices, pt]);
      return;
    }

    // Closed shape — insert at the nearest edge.
    const idx = nearestEdgeIndex(active.vertices, pt);
    const next = [...active.vertices.slice(0, idx + 1), pt, ...active.vertices.slice(idx + 1)];
    emitChange(active, next);
  };

  const onVertexPointerDown = (
    e: React.PointerEvent<SVGCircleElement>,
    shape: EditableShape,
    index: number,
  ) => {
    e.stopPropagation();
    if (shape.id !== activeId) onActiveChange(shape.id);
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
    if (!drag || drag.moved) return;
    // Tap (no drag): if shape is open and this is the first vertex, close it.
    if (!shape.closed && index === 0 && shape.vertices.length >= 3) {
      onShapeClose(shape.id);
      return;
    }
    // Otherwise, remove the tapped vertex.
    emitChange(
      shape,
      shape.vertices.filter((_, i) => i !== index),
    );
  };

  // Re-emit when smooth toggles so the parent's polygonFt stays in sync.
  useEffect(() => {
    emitChange(active, active.vertices);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [smooth]);

  const renderShape = (shape: EditableShape, opts: { dim?: boolean } = {}) => {
    const isActive = shape.id === activeId;
    const isLawn = shape.kind === 'lawn';
    const isClosed = shape.closed;
    const opacity = opts.dim ? 0.45 : 1;

    // Build the path. Open shapes render as a polyline (no Z, no fill).
    const path =
      shape.vertices.length === 0
        ? ''
        : isClosed
          ? smooth && shape.vertices.length >= 3
            ? smoothClosedSvgPath(shape.vertices)
            : `M ${shape.vertices.map((p) => `${p.x} ${p.y}`).join(' L ')} Z`
          : `M ${shape.vertices.map((p) => `${p.x} ${p.y}`).join(' L ')}`;

    return (
      <g key={shape.id} opacity={opacity}>
        {shape.vertices.length >= 2 && (
          <path
            d={path}
            fill={
              isClosed
                ? isLawn
                  ? 'rgba(29, 90, 58, 0.25)'
                  : 'rgba(10, 10, 10, 0.55)'
                : 'none'
            }
            stroke="#ffffff"
            strokeWidth={isActive ? 3.5 : 2.5}
            strokeDasharray={isClosed ? (isLawn ? undefined : '6 4') : '8 6'}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        )}
        {shape.vertices.map((v, i) => {
          const isFirst = !isClosed && i === 0 && shape.vertices.length >= 3;
          return (
            <g key={i}>
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
                fill={isFirst ? '#1d5a3a' : isActive ? '#ffffff' : '#d4d4d8'}
                stroke="#0a0a0a"
                strokeWidth={2}
                pointerEvents="none"
              />
              {isFirst && (
                <circle
                  cx={v.x}
                  cy={v.y}
                  r={VERTEX_RADIUS + 6}
                  fill="none"
                  stroke="#ffffff"
                  strokeWidth={1.5}
                  strokeDasharray="3 3"
                  pointerEvents="none"
                />
              )}
            </g>
          );
        })}
      </g>
    );
  };

  // Decide which shapes to render based on focus mode.
  // - Editing lawn: lawn + cutouts (cutouts dimmed).
  // - Editing cutout: only the active cutout + closed cutouts; lawn hidden.
  const visibleShapes: { shape: EditableShape; dim: boolean }[] = [];
  if (focusMode === 'lawn') {
    for (const c of cutouts) visibleShapes.push({ shape: c, dim: true });
    visibleShapes.push({ shape: lawn, dim: false });
  } else {
    for (const c of cutouts) {
      if (c.id === activeId) continue;
      if (c.closed) visibleShapes.push({ shape: c, dim: true });
    }
    visibleShapes.push({ shape: active, dim: false });
  }

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
          {visibleShapes.map(({ shape, dim }) => renderShape(shape, { dim }))}
        </svg>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {!active.closed && active.vertices.length >= 3 && (
          <button
            onClick={() => onShapeClose(active.id)}
            className="chip chip-selected"
          >
            ✓ Done — close {active.kind === 'lawn' ? 'lawn' : 'shape'}
          </button>
        )}
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
        {active.closed
          ? 'Tap to add a corner · drag to move · tap a corner to remove'
          : active.vertices.length === 0
            ? `Tap to plot ${active.kind === 'lawn' ? 'lawn' : 'shape'} corners.`
            : active.vertices.length < 3
              ? 'Keep tapping corners — need 3+ to close.'
              : 'Tap the green dot or "Done" to close. Drag any corner to nudge.'}
      </p>
    </div>
  );
}

function nearestEdgeIndex(verts: Point[], target: Point): number {
  let best = -1;
  let bestDist = Infinity;
  for (let i = 0; i < verts.length; i++) {
    const a = verts[i]!;
    const b = verts[(i + 1) % verts.length]!;
    const d = pointToSegment(target, a, b);
    if (d < bestDist) {
      bestDist = d;
      best = i;
    }
  }
  return best;
}

function pointToSegment(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(p.x - a.x, p.y - a.y);
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq));
  const px = a.x + t * dx;
  const py = a.y + t * dy;
  return Math.hypot(p.x - px, p.y - py);
}
