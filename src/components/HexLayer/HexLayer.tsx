'use client';

import React, { useMemo } from 'react';
import { Polygon, Tooltip } from 'react-leaflet';

import { latLngToCell } from 'h3-js';

import { cellPolygon } from '@/lib/h3';

import type { Courier } from '@/types/Courier';
import type { SearchRing } from '@/types/Match';

interface HexLayerProps {
  couriers: Courier[];
  resolution: number;
  /** Rings of the last search, shown up to `visibleK` */
  rings: SearchRing[];
  visibleK: number;
  /** Ring that gave enough candidates; the one after it is the guard ring */
  ringUsed: null | number;
}

const LIME = '#dafa9c';

export const HexLayer = ({
  couriers,
  resolution,
  rings,
  ringUsed,
  visibleK,
}: HexLayerProps) => {
  // Cells are computed in the browser at the selected resolution, so switching
  // resolution redraws at once without waiting for the next poll
  const counts = useMemo(() => {
    const byCell = new Map<string, number>();
    for (const courier of couriers) {
      const cell = latLngToCell(courier.lat, courier.lng, resolution);
      byCell.set(cell, (byCell.get(cell) ?? 0) + 1);
    }
    return byCell;
  }, [couriers, resolution]);

  const searched = rings.filter((ring) => ring.k <= visibleK);

  return (
    <>
      {[...counts].map(([cell, count]) => (
        <Polygon
          key={`courier-${cell}`}
          positions={cellPolygon(cell)}
          interactive={false}
          pathOptions={{
            color: LIME,
            fillColor: LIME,
            fillOpacity: Math.min(0.06 + count * 0.07, 0.3),
            opacity: 0.35,
            weight: 1,
          }}
        />
      ))}
      {searched.flatMap((ring) => {
        const isGuard = ringUsed !== null && ring.k === ringUsed + 1;
        return ring.cells.map((cell) => (
          <Polygon
            key={`ring-${cell}`}
            positions={cellPolygon(cell)}
            pathOptions={{
              color: ring.found > 0 ? LIME : '#ffffff',
              dashArray: isGuard ? '4 6' : undefined,
              fillColor: ring.found > 0 ? LIME : '#ffffff',
              fillOpacity: ring.found > 0 ? 0.14 : 0.04,
              opacity: 0.9,
              weight: 1.5,
            }}
          >
            <Tooltip>
              Ring {ring.k}
              {isGuard ? ' (guard)' : ''}: {ring.found} idle found
            </Tooltip>
          </Polygon>
        ));
      })}
    </>
  );
};
