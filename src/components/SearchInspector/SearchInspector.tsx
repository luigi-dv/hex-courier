import React from 'react';

import type { OrderMatch } from '@/types/Match';

interface SearchInspectorProps {
  match: OrderMatch;
  k: number;
  last: number;
  onPrev: () => void;
  onNext: () => void;
  onReplay: () => void;
}

const meters = new Intl.NumberFormat('en', { maximumFractionDigits: 0 });
const ms = new Intl.NumberFormat('en', {
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
});

const ringNote = (ringK: number, ringUsed: null | number) => {
  if (ringUsed === null) return '';
  if (ringK === ringUsed) return ', enough';
  if (ringK === ringUsed + 1) return ', guard ring';
  return '';
};

/** The last search, ring by ring, in step with the rings drawn on the map */
export const SearchInspector = ({
  k,
  last,
  match,
  onNext,
  onPrev,
  onReplay,
}: SearchInspectorProps) => {
  const shown = match.rings.filter((ring) => ring.k <= k);
  const looked = shown.reduce((sum, ring) => sum + ring.cells.length, 0);
  const found = shown.reduce((sum, ring) => sum + ring.found, 0);
  const done = k >= last;

  return (
    <section aria-labelledby='inspector-title' className='space-y-5'>
      <div>
        <h3
          id='inspector-title'
          className='text-body font-medium tracking-[-0.01em]'
        >
          Search for {match.order.id}
        </h3>
        <p className='tabular mt-1 text-small text-muted' aria-live='polite'>
          Ring {k} of {last}: {looked} cells looked up, {found} free couriers
          found
        </p>
      </div>

      <ol className='space-y-1.5' aria-label='Rings searched'>
        {match.rings.map((ring) => {
          const visible = ring.k <= k;
          return (
            <li
              key={ring.k}
              className={`tabular flex items-center gap-3 text-small transition-opacity duration-[240ms] ${
                visible ? 'opacity-100' : 'opacity-35'
              }`}
            >
              <span
                className={`hex-bullet ${ring.found > 0 ? 'text-lime' : 'text-ink'}`}
                aria-hidden='true'
              />
              <span className='w-14'>Ring {ring.k}</span>
              <span className='w-16 text-muted'>{ring.cells.length} cells</span>
              <span>
                {ring.found} found{ringNote(ring.k, match.ringUsed)}
              </span>
            </li>
          );
        })}
      </ol>

      <div className='flex flex-wrap gap-2'>
        <button
          type='button'
          onClick={onPrev}
          disabled={k === 0}
          className='hex-button hex-button--quiet min-h-10 text-small'
        >
          Previous Ring
        </button>
        <button
          type='button'
          onClick={onNext}
          disabled={done}
          className='hex-button hex-button--quiet min-h-10 text-small'
        >
          Next Ring
        </button>
        <button
          type='button'
          onClick={onReplay}
          className='hex-button hex-button--quiet min-h-10 text-small'
        >
          Replay
        </button>
      </div>

      {done && (
        <div className='space-y-3'>
          <p className='text-small text-muted'>
            {match.ringUsed === null
              ? `Nobody free within ${last} rings. The order waits.`
              : `Ranked by distance in ${ms.format(match.durationMs)} ms:`}
          </p>
          <ol className='space-y-1.5'>
            {match.candidates.slice(0, 5).map((candidate, i) => (
              <li
                key={candidate.courierId}
                className={`tabular flex items-center gap-3 text-small ${i === 0 ? 'font-medium text-[var(--color-assigned)]' : 'text-ink'}`}
              >
                <span className='hex-bullet' aria-hidden='true' />
                <span className='min-w-0 flex-1 truncate'>
                  {candidate.courierId}
                  {i === 0 ? ', assigned' : ''}
                </span>
                <span>{meters.format(candidate.distanceMeters)} m</span>
                <span className='w-14 text-right text-muted'>
                  ring {candidate.ring}
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </section>
  );
};
