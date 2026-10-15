'use client';

import React, { useRef } from 'react';

import { RESOLUTIONS } from '@/constants/geo';

import type { Resolution } from '@/lib/city';

interface ResolutionSwitchProps {
  value: Resolution;
  onChange: (value: Resolution) => void;
  label?: string;
  className?: string;
  /** Every size is in em, so the same control works at text size and at poster size */
  style?: React.CSSProperties;
}

/**
 * Segmented control as a radio group: arrow keys move between resolutions,
 * the active segment is the motif's hexagon.
 */
export const ResolutionSwitch = ({
  className,
  label = 'H3 resolution',
  onChange,
  style,
  value,
}: ResolutionSwitchProps) => {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const onKeyDown = (event: React.KeyboardEvent) => {
    const index = RESOLUTIONS.indexOf(value);
    const step = { ArrowDown: 1, ArrowLeft: -1, ArrowRight: 1, ArrowUp: -1 }[
      event.key
    ];
    if (!step) return;
    event.preventDefault();
    const next =
      RESOLUTIONS[(index + step + RESOLUTIONS.length) % RESOLUTIONS.length];
    onChange(next);
    refs.current[RESOLUTIONS.indexOf(next)]?.focus();
  };

  return (
    <div
      data-ui
      role='radiogroup'
      aria-label={label}
      onKeyDown={onKeyDown}
      className={`inline-flex items-center gap-[0.12em] bg-surface-2 p-[0.14em] text-ink ${className ?? ''}`}
      style={{ clipPath: 'var(--hex-wide)', ...style }}
    >
      {RESOLUTIONS.map((resolution, i) => {
        const active = resolution === value;
        return (
          <button
            key={resolution}
            ref={(element) => {
              refs.current[i] = element;
            }}
            type='button'
            role='radio'
            aria-checked={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(resolution)}
            className={`tabular flex h-[2.3em] min-w-[3.1em] items-center justify-center px-[0.9em] font-medium transition-colors duration-[180ms] focus-visible:outline-none focus-visible:underline focus-visible:decoration-2 focus-visible:underline-offset-4 ${
              active ? 'bg-lime text-charcoal' : 'text-ink hover:bg-soot'
            }`}
            style={{ clipPath: 'var(--hex-wide)' }}
          >
            {resolution}
          </button>
        );
      })}
    </div>
  );
};
