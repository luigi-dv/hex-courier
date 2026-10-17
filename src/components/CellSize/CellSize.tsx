'use client';

import React from 'react';

import { track } from '@vercel/analytics';
import { getHexagonEdgeLengthAvg, UNITS } from 'h3-js';

import { ResolutionSwitch } from '@/components/ResolutionSwitch';

import { searchCost } from '@/lib/scenarios';

import { useResolution } from '@/providers/ResolutionProvider';

const meters = new Intl.NumberFormat('en', { maximumFractionDigits: 0 });

/**
 * The one control the whole product turns on, at poster size. It is the same
 * switch as on the live map, and moving it changes the map above.
 */
export const CellSize = () => {
  const { resolution, setResolution } = useResolution();
  const edge = getHexagonEdgeLengthAvg(resolution, UNITS.m);
  const { cells, rings } = searchCost(resolution);
  const lime = resolution === 9;

  return (
    <section
      id='cells'
      aria-labelledby='cells-title'
      className={`on-light relative min-h-[92svh] overflow-hidden text-charcoal transition-colors duration-[600ms] max-sm:min-h-[86svh] ${
        lime ? 'bg-lime' : 'bg-paper'
      }`}
    >
      <div className='relative z-10 px-page pt-[clamp(3rem,8vw,7rem)] [&>*]:max-w-[34rem]'>
        <h2 id='cells-title' data-reveal className='tabular text-head'>
          Cells of {meters.format(edge)}&nbsp;m
        </h2>
        <p
          data-reveal
          style={{ '--i': 1 } as React.CSSProperties}
          className='mt-5 text-body'
        >
          At resolution {resolution}, reaching a courier one kilometre away
          takes {rings} {rings === 1 ? 'ring' : 'rings'} and {cells} cell
          lookups. Bigger cells need fewer rings but hand more couriers to the
          ranking.{' '}
          <a
            href='#live'
            className='link font-medium underline decoration-current'
          >
            The live map follows this switch.
          </a>
        </p>
      </div>

      <div className='absolute right-[max(var(--margin),calc((100%-80rem)/2+var(--margin)))] bottom-[9svh] max-sm:right-auto max-sm:bottom-[6svh] max-sm:left-[var(--margin)]'>
        <ResolutionSwitch
          value={resolution}
          label='H3 resolution, also used by the live map'
          onChange={(value) => {
            setResolution(value);
            track('resolution_changed', { resolution: value, where: 'cells' });
          }}
          className='text-ink'
          style={{ fontSize: 'clamp(2rem, 8vw, 6.5rem)' }}
        />
      </div>
    </section>
  );
};
