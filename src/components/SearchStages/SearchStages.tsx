import React from 'react';

import { cellToBoundary, cellToLatLng, latLngToCell } from 'h3-js';

import { GuardScenario } from '@/components/GuardScenario';

import { CITY_CENTER, RES } from '@/constants/geo';

import { ringCells } from '@/lib/h3';
import { createProjection, polygonPoints } from '@/lib/projection';

const origin = latLngToCell(CITY_CENTER.lat, CITY_CENTER.lng, RES);
const [originLat, originLng] = cellToLatLng(origin);
const projection = createProjection({ lat: originLat, lng: originLng });

/** Three free couriers around the Palace, metres east and south of the pickup cell's centre */
const COURIERS = [
  { x: 300, y: -170 },
  { x: -120, y: 520 },
  { x: -560, y: -160 },
];

const ringOf = (point: { x: number; y: number }) => {
  const latLng = projection.toLatLng(point);
  const cell = latLngToCell(latLng.lat, latLng.lng, RES);
  for (let k = 0; k <= 4; k++)
    if (ringCells(origin, k).includes(cell)) return k;
  return Infinity;
};

interface DiskProps {
  k: number;
  /** Fill for searched cells with nobody in them, and for cells where someone was found */
  empty: string;
  found: string;
  ink: string;
}

/** The disk of rings 0..k around the pickup, drawn from the real H3 cells */
const Disk = ({ empty, found, ink, k }: DiskProps) => {
  const view = 260 + k * 330;
  const cells = Array.from({ length: k + 1 }, (_, ring) =>
    ringCells(origin, ring).map((cell) => ({ cell, ring }))
  ).flat();
  const inside = COURIERS.filter((courier) => ringOf(courier) <= k);
  const ringsWithSomeone = new Set(inside.map(ringOf));

  return (
    <svg
      viewBox={`${-view} ${-view} ${view * 2} ${view * 2}`}
      className='h-full w-full'
      role='img'
      aria-label={`Rings 0 to ${k} around the pickup: ${inside.length} free couriers found`}
    >
      {cells.map(({ cell, ring }) => (
        <polygon
          key={cell}
          points={polygonPoints(
            cellToBoundary(cell).map(([lat, lng]) =>
              projection.toPoint({ lat, lng })
            )
          )}
          fill={ringsWithSomeone.has(ring) ? found : empty}
          stroke='currentColor'
          strokeOpacity={0}
          strokeWidth={0}
          style={{ opacity: ring === k ? 1 : 0.55 }}
        />
      ))}
      <polygon
        points={polygonPoints(
          [0, 60, 120, 180, 240, 300].map((deg) => ({
            x: 34 * Math.sin((deg * Math.PI) / 180),
            y: -34 * Math.cos((deg * Math.PI) / 180),
          }))
        )}
        fill={ink}
      />
      {inside.map((courier) => (
        <circle
          key={`${courier.x}`}
          cx={courier.x}
          cy={courier.y}
          r={30}
          fill={ink}
        />
      ))}
    </svg>
  );
};

const STAGES = [
  {
    body: 'The pickup becomes a cell id. Couriers filed under that id come back from one map lookup.',
    colour: 'bg-paper-2 text-charcoal',
    drawing: <Disk k={0} empty='#d4d4cc' found='#dafa9c' ink='#141414' />,
    height: 'lg:h-[30vh]',
    name: 'Look in the pickup’s cell',
    span: 'lg:col-span-2',
  },
  {
    body: 'Six neighbours, every one an edge away. Still only lookups, no distance maths.',
    colour: 'bg-lime text-charcoal',
    drawing: <Disk k={1} empty='#c3e389' found='#ffffff' ink='#141414' />,
    height: 'lg:h-[40vh]',
    name: 'Widen by one ring',
    span: 'lg:col-span-3',
  },
  {
    body: 'Three free couriers found. A matcher that stops here can still pick the wrong one.',
    colour: 'bg-charcoal text-ink',
    drawing: <Disk k={2} empty='#2a2a2a' found='#4c5a35' ink='#dafa9c' />,
    height: 'lg:h-[50vh]',
    name: 'Enough candidates',
    span: 'lg:col-span-3',
  },
] as const;

/** How the search works, as tiles that grow with each stage */
export const SearchStages = () => (
  <section
    id='search'
    aria-labelledby='search-title'
    className='on-light bg-paper py-[clamp(5rem,12vw,10rem)] text-charcoal'
  >
    <div className='grid gap-[10px] px-page lg:grid-cols-12 lg:items-end'>
      <h2
        id='search-title'
        data-reveal
        className='text-head max-w-[11ch] lg:col-span-5 lg:col-start-1 lg:row-start-1 lg:self-start'
      >
        Lookups, then maths
      </h2>

      {STAGES.map((stage, i) => (
        <div
          key={stage.name}
          data-reveal
          style={{ '--i': i } as React.CSSProperties}
          className={`${stage.span} lg:row-start-2 max-lg:mt-10`}
        >
          <div
            className={`${stage.colour} ${stage.height} aspect-square p-4 lg:aspect-auto`}
            data-ui
          >
            {stage.drawing}
          </div>
          <h3 className='mt-4 text-lead font-medium tracking-[-0.02em] leading-tight'>
            {stage.name}
          </h3>
          <p className='mt-1 max-w-[34ch] text-body text-muted-dark'>
            {stage.body}
          </p>
        </div>
      ))}

      <div
        data-reveal
        style={{ '--i': 3 } as React.CSSProperties}
        className='lg:col-span-4 lg:row-start-2 max-lg:mt-10'
      >
        <div className='bg-surface lg:h-[64vh] max-lg:min-h-[34rem] max-lg:h-[120vw]'>
          <GuardScenario />
        </div>
        <h3 className='mt-4 text-lead font-medium tracking-[-0.02em] leading-tight'>
          One ring more, then rank
        </h3>
        <p className='mt-1 max-w-[38ch] text-body text-muted-dark'>
          Grid distance isn’t real distance. Drag the pickup toward courier A
          and watch the two answers split.
        </p>
      </div>
    </div>
  </section>
);
