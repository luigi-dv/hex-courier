'use client';

import React, { useState } from 'react';

import { track } from '@vercel/analytics';

import type { RuleEvidence } from '@/lib/scenarios';

interface Rule {
  id: string;
  sentence: string;
  /** What the rule prevents, in figures */
  consequence: string;
  on: string;
  ink: string;
}

const percent = new Intl.NumberFormat('en', {
  maximumFractionDigits: 1,
  style: 'percent',
});
const whole = new Intl.NumberFormat('en', { maximumFractionDigits: 0 });
const km = new Intl.NumberFormat('en', {
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
});

const rulesFrom = (evidence: RuleEvidence): Rule[] => [
  {
    consequence: `Without it, ${percent.format(evidence.guard.worse)} of orders get a courier ${whole.format(evidence.guard.extraMeters)} m further away on average.`,
    id: 'guard',
    ink: 'text-charcoal',
    on: 'bg-lime',
    sentence: 'Look one ring past enough',
  },
  {
    consequence: `Counted as free, they would win ${percent.format(evidence.busy.wouldGoToBusy)} of orders while still on another delivery.`,
    id: 'busy',
    ink: 'text-charcoal',
    on: 'bg-paper-2',
    sentence: 'Skip couriers on a delivery',
  },
  {
    consequence: `Ranked by ring instead, ${percent.format(evidence.ranking.notNearest)} of orders would skip the nearest courier.`,
    id: 'ranking',
    ink: 'text-ink',
    on: 'bg-charcoal',
    sentence: 'Rank by real distance',
  },
  {
    consequence: `Five rings cover ${km.format(evidence.reach.meters / 1000)} km in every direction. Past that the order waits instead of crossing the city.`,
    id: 'reach',
    ink: 'text-charcoal',
    on: 'bg-lime',
    sentence: 'Give up after five rings',
  },
  {
    consequence: `The fast ring function throws “${evidence.pentagons.error}” at ${evidence.pentagons.count} cells per resolution, so the search falls back to a slower one there.`,
    id: 'pentagons',
    ink: 'text-ink',
    on: 'bg-surface-2',
    sentence: 'Survive the 12 pentagons',
  },
];

/**
 * Each rule the matcher follows, as a sentence with a switch. Switching it on
 * shows what the rule prevents, measured on a seeded city of 300 couriers.
 */
export const SearchRules = ({ evidence }: { evidence: RuleEvidence }) => {
  const rules = rulesFrom(evidence);
  const [on, setOn] = useState<Set<string>>(
    () => new Set(['guard', 'ranking'])
  );

  const toggle = (id: string) => {
    const next = new Set(on);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setOn(next);
    track('rule_toggled', { on: next.has(id), rule: id });
  };

  return (
    <section
      id='rules'
      aria-labelledby='rules-title'
      className='on-light bg-paper text-charcoal'
    >
      <h2 id='rules-title' className='sr-only'>
        The rules of the search
      </h2>
      <p className='px-page pb-6 text-body'>
        Measured on {whole.format(evidence.orders)} orders against a seeded city
        of 300 couriers, one in five busy.
      </p>
      <ul>
        {rules.map((rule) => {
          const isOn = on.has(rule.id);
          return (
            <li
              key={rule.id}
              className={`transition-colors duration-[400ms] ${isOn ? `${rule.on} ${rule.ink}` : 'bg-paper text-muted-dark'}`}
            >
              <label className='grid min-h-[20vh] cursor-pointer outline-current has-[input:focus-visible]:outline-[3px] has-[input:focus-visible]:-outline-offset-[10px] grid-cols-[1fr_auto] items-center gap-6 px-page py-6 max-sm:min-h-[132px]'>
                <span>
                  <span className='block text-head font-semibold leading-[1.02] tracking-[-0.035em]'>
                    {rule.sentence}
                  </span>
                  {isOn && (
                    <span className='crossfade mt-3 block max-w-[60ch] text-body max-sm:text-small'>
                      {rule.consequence}
                    </span>
                  )}
                </span>
                <span className='relative flex items-center'>
                  <input
                    type='checkbox'
                    role='switch'
                    checked={isOn}
                    onChange={() => toggle(rule.id)}
                    className='sr-only'
                  />
                  <span
                    data-ui
                    aria-hidden='true'
                    className={`relative block h-[1.15em] w-[2.15em] text-head transition-colors duration-[240ms] ${
                      isOn ? 'bg-charcoal' : 'bg-[#c9c9c1]'
                    }`}
                    style={{ clipPath: 'var(--hex-switch)' }}
                  >
                    <span
                      className={`absolute top-[0.1em] left-[0.14em] h-[0.95em] w-[0.84em] transition-transform duration-[240ms] ease-[var(--ease-out)] ${
                        isOn
                          ? 'translate-x-[1.03em] bg-lime'
                          : 'translate-x-0 bg-paper'
                      }`}
                      style={{ clipPath: 'var(--hex)' }}
                    />
                  </span>
                </span>
              </label>
            </li>
          );
        })}
      </ul>
    </section>
  );
};
