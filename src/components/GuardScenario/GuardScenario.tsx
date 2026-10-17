'use client';

import React, { useMemo, useRef, useState } from 'react';

import { track } from '@vercel/analytics';

import { guardScenario } from '@/lib/scenarios';
import { createProjection, polygonPoints } from '@/lib/projection';

import type { LatLng } from '@/types/LatLng';

const meters = new Intl.NumberFormat('en', { maximumFractionDigits: 0 });
const VIEW = 430;
const KEY_STEP_M = 10;

/**
 * Courier A waits just across the edge of the pickup's cell, courier B inside
 * it on the far side. Slide the pickup toward A: a matcher that stops at the
 * first ring with someone in it keeps sending B; one more ring finds A.
 */
export const GuardScenario = () => {
  const scenario = useMemo(() => guardScenario(), []);
  const projection = useMemo(
    () => createProjection(scenario.center),
    [scenario]
  );
  const [pickup, setPickup] = useState<LatLng>(scenario.center);
  const svg = useRef<SVGSVGElement>(null);
  const dragging = useRef(false);
  const reported = useRef(false);

  const result = scenario.match(pickup);
  const split =
    result.withGuard?.courier.id !== result.withoutGuard?.courier.id;
  const p = projection.toPoint(pickup);
  const a = projection.toPoint(scenario.a);
  const b = projection.toPoint(scenario.b);
  const target = (id?: string) => (id === 'A' ? a : b);

  const move = (point: { x: number; y: number }) => {
    const clamp = (value: number) =>
      Math.max(-VIEW + 20, Math.min(VIEW - 20, value));
    setPickup(projection.toLatLng({ x: clamp(point.x), y: clamp(point.y) }));
    if (!reported.current) {
      reported.current = true;
      track('guard_scenario_used');
    }
  };

  const fromEvent = (event: React.PointerEvent) => {
    const matrix = svg.current?.getScreenCTM()?.inverse();
    if (!matrix) return;
    const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(
      matrix
    );
    move({ x: point.x, y: point.y });
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    const delta = {
      ArrowDown: [0, KEY_STEP_M],
      ArrowLeft: [-KEY_STEP_M, 0],
      ArrowRight: [KEY_STEP_M, 0],
      ArrowUp: [0, -KEY_STEP_M],
    }[event.key];
    if (!delta) return;
    event.preventDefault();
    move({ x: p.x + delta[0], y: p.y + delta[1] });
  };

  const toEdge = () => {
    const c = projection.toPoint(scenario.center);
    const e = projection.toPoint(scenario.edge);
    move({ x: c.x + (e.x - c.x) * 0.94, y: c.y + (e.y - c.y) * 0.94 });
  };

  return (
    <div className='flex h-full flex-col gap-4 p-5 text-ink' data-ui>
      <svg
        ref={svg}
        viewBox={`${-VIEW} ${-VIEW} ${VIEW * 2} ${VIEW * 2}`}
        className='min-h-0 w-full flex-1 touch-none select-none'
        onPointerDown={(event) => {
          dragging.current = true;
          event.currentTarget.setPointerCapture(event.pointerId);
          fromEvent(event);
        }}
        onPointerMove={(event) => dragging.current && fromEvent(event)}
        onPointerUp={() => {
          dragging.current = false;
        }}
        role='img'
        aria-label='The pickup cell, its six neighbours, couriers A and B, and the pickup'
      >
        {scenario.neighbours.map((cell, i) => (
          <polygon
            key={i}
            points={polygonPoints(cell.map(projection.toPoint))}
            fill='#262626'
            stroke='#1a1a1a'
            strokeWidth={6}
          />
        ))}
        <polygon
          points={polygonPoints(scenario.boundary.map(projection.toPoint))}
          fill='#3a3a3a'
          stroke='#1a1a1a'
          strokeWidth={6}
        />
        {split && result.withoutGuard && (
          <line
            x1={p.x}
            y1={p.y}
            x2={target(result.withoutGuard.courier.id).x}
            y2={target(result.withoutGuard.courier.id).y}
            stroke='#9a9a9a'
            strokeWidth={4}
            strokeDasharray='10 10'
          />
        )}
        {result.withGuard && (
          <line
            x1={p.x}
            y1={p.y}
            x2={target(result.withGuard.courier.id).x}
            y2={target(result.withGuard.courier.id).y}
            stroke='#dafa9c'
            strokeWidth={5}
          />
        )}
        {[
          { id: 'A', point: a },
          { id: 'B', point: b },
        ].map(({ id, point }) => (
          <g key={id}>
            <circle cx={point.x} cy={point.y} r={16} fill='#ffffff' />
            <text
              x={point.x}
              y={point.y + 46}
              textAnchor='middle'
              fill='#ffffff'
              fontSize={30}
              fontWeight={500}
            >
              {id}
            </text>
          </g>
        ))}
        <g
          tabIndex={0}
          role='button'
          aria-label='Pickup. Drag it, or use the arrow keys to move it.'
          onKeyDown={onKeyDown}
          className='cursor-grab outline-none focus-visible:[&>polygon]:stroke-white'
        >
          <polygon
            points={polygonPoints(
              [0, 60, 120, 180, 240, 300].map((deg) => ({
                x: p.x + 24 * Math.sin((deg * Math.PI) / 180),
                y: p.y - 24 * Math.cos((deg * Math.PI) / 180),
              }))
            )}
            fill='#dafa9c'
            stroke='transparent'
            strokeWidth={6}
          />
        </g>
      </svg>

      <div className='space-y-1.5 text-small' aria-live='polite'>
        <p className='tabular flex items-center gap-3'>
          <span className='hex-bullet text-muted' aria-hidden='true' />
          Stop at the first ring: courier {
            result.withoutGuard?.courier.id
          }, {meters.format(result.withoutGuard?.distanceMeters ?? 0)}&nbsp;m
        </p>
        <p className='tabular flex items-center gap-3 text-lime'>
          <span className='hex-bullet' aria-hidden='true' />
          One ring more: courier {result.withGuard?.courier.id},{' '}
          {meters.format(result.withGuard?.distanceMeters ?? 0)}&nbsp;m
        </p>
      </div>
      <div className='flex flex-wrap gap-2'>
        <button
          type='button'
          className='hex-button min-h-10 text-small'
          onClick={toEdge}
        >
          Slide to the Edge
        </button>
        <button
          type='button'
          className='hex-button hex-button--quiet min-h-10 text-small'
          onClick={() => setPickup(scenario.center)}
        >
          Back to the Centre
        </button>
      </div>
    </div>
  );
};
