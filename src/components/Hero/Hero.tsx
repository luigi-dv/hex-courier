import React from 'react';

import { SECTIONS } from '@/constants/site';

/** Where each back folder's tab sits along its top edge */
const TAB_OFFSETS = ['56%', '30%', '72%', '8%'];

/**
 * The first screen: name, one line on what it does, and the folder stack.
 * Each back folder is a link to its section; the front one is the live city,
 * which continues right below as its own section.
 */
export const Hero = () => {
  const back = SECTIONS.slice(1).reverse();

  return (
    <header className='relative'>
      <nav
        aria-label='Main'
        className='grid h-16 grid-cols-[1fr_auto_1fr] items-center px-page text-small'
      >
        <span aria-hidden='true' />
        <span
          className='font-semibold tracking-[-0.02em] text-body'
          translate='no'
        >
          Hex Courier
        </span>
        <a href='#search' className='link justify-self-end text-small'>
          How It Works
        </a>
      </nav>

      <div className='mx-auto flex min-h-[calc(51svh-4rem)] max-w-7xl flex-col items-center justify-center px-page pb-12 pt-8 text-center'>
        <h1
          data-rise
          className='text-display'
          style={{ '--i': 0 } as React.CSSProperties}
        >
          Ring by ring
        </h1>
        <p
          data-rise
          className='mt-6 max-w-[46ch] text-lead leading-[1.35] text-ink'
          style={{ '--i': 1 } as React.CSSProperties}
        >
          Hex Courier finds the nearest free courier in Warsaw by searching
          Uber’s H3 hexagons outward from the pickup, one ring at a time.
        </p>
      </div>

      <div aria-label='Sections' role='navigation' className='relative'>
        {back.map((section, i) => (
          <a
            key={section.href}
            href={section.href}
            className={`folder group relative mx-auto block h-16 w-[min(80rem,100%-2*var(--margin))] max-sm:w-full ${
              section.light ? 'text-charcoal' : 'text-ink'
            }`}
            style={
              { '--i': i, background: section.colour } as React.CSSProperties
            }
          >
            <span
              className='absolute bottom-full flex h-10 items-center px-[1.6em] text-body font-medium transition-transform duration-[180ms] ease-[var(--ease-out)] group-hover:-translate-y-1 max-sm:h-8 max-sm:text-small'
              style={{
                background: section.colour,
                clipPath: 'var(--hex-half)',
                left: TAB_OFFSETS[i],
              }}
            >
              {section.label}
            </span>
          </a>
        ))}
      </div>
    </header>
  );
};
