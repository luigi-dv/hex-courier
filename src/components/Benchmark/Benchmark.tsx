'use client';

import React, { useEffect, useRef, useState } from 'react';

import { track } from '@vercel/analytics';

import type { BenchmarkResult } from '@/lib/benchmark';

const SIZES = [1_000, 2_000, 5_000, 10_000, 20_000, 50_000, 100_000];
const DEFAULT_INDEX = 3;
const DEBOUNCE_MS = 300;

const count = new Intl.NumberFormat('en');
const figure = new Intl.NumberFormat('en', {
  maximumFractionDigits: 3,
  minimumFractionDigits: 3,
});
const short = new Intl.NumberFormat('en', {
  maximumFractionDigits: 1,
  minimumFractionDigits: 1,
});
const percent = new Intl.NumberFormat('en', {
  maximumFractionDigits: 1,
  style: 'percent',
});

/**
 * The visitor sets the fleet size; their own browser measures the matcher on
 * it, in a Web Worker, with the same code the server and `npm run benchmark` run.
 */
export const Benchmark = () => {
  const [index, setIndex] = useState(DEFAULT_INDEX);
  const [result, setResult] = useState<BenchmarkResult | null>(null);
  const [measuring, setMeasuring] = useState(false);
  const [visible, setVisible] = useState(false);
  const section = useRef<HTMLElement>(null);
  const worker = useRef<Worker | null>(null);
  const runId = useRef(0);
  const size = SIZES[index];

  // Measure only once the section is near the screen, not on page load
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setVisible(true);
        observer.disconnect();
      },
      { rootMargin: '300px' }
    );
    if (section.current) observer.observe(section.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!visible) return;
    const timeout = setTimeout(() => {
      // A run for the old size is pointless: stop it rather than wait for it
      worker.current?.terminate();
      worker.current = new Worker(
        new URL('../../workers/benchmark.worker.ts', import.meta.url),
        {
          type: 'module',
        }
      );
      const id = ++runId.current;
      setMeasuring(true);
      worker.current.onmessage = (
        event: MessageEvent<{ id: number; result: BenchmarkResult }>
      ) => {
        if (event.data.id !== id) return;
        setResult(event.data.result);
        setMeasuring(false);
        track('benchmark_run', { couriers: size });
      };
      worker.current.postMessage({ id, size });
    }, DEBOUNCE_MS);
    return () => clearTimeout(timeout);
  }, [size, visible]);

  useEffect(() => () => worker.current?.terminate(), []);

  const speedup = result ? result.scan.mean / result.h3.mean : 0;

  return (
    <section
      ref={section}
      id='benchmark'
      aria-labelledby='benchmark-title'
      className='on-light flex min-h-[88svh] flex-col justify-between gap-16 bg-paper-2 px-page py-[clamp(3rem,8vw,7rem)] text-charcoal max-sm:min-h-[84svh]'
    >
      <div>
        <h2 id='benchmark-title' data-reveal className='text-head'>
          How big is your fleet?
        </h2>
        <div data-ui className='mt-7 w-[min(25rem,100%)] space-y-3'>
          <label
            htmlFor='fleet'
            className='flex items-baseline justify-between text-body'
          >
            <span>Couriers</span>
            <span className='tabular font-medium'>{count.format(size)}</span>
          </label>
          <input
            id='fleet'
            name='fleet'
            type='range'
            min={0}
            max={SIZES.length - 1}
            step={1}
            value={index}
            onChange={(event) => setIndex(Number(event.target.value))}
            aria-valuetext={`${count.format(size)} couriers`}
            className='h-11 w-full cursor-pointer accent-[#141414]'
          />
          <div
            className='tabular flex justify-between text-small text-muted-dark'
            aria-hidden='true'
          >
            <span>1k</span>
            <span>100k</span>
          </div>
        </div>
      </div>

      <div className='grid items-end gap-8 lg:grid-cols-[1fr_30ch]'>
        <p
          className={`tabular font-semibold leading-[0.8] tracking-[-0.05em] text-[clamp(5.5rem,19vw,20rem)] transition-opacity duration-[240ms] max-sm:text-[30vw] ${
            measuring ? 'opacity-35' : 'opacity-100'
          }`}
          aria-live='polite'
          aria-busy={measuring}
        >
          {result ? (
            figure.format(result.h3.mean)
          ) : (
            <span className='opacity-25'>0.000</span>
          )}
          <span className='ml-[0.06em] text-lead tracking-[-0.02em] max-sm:block max-sm:ml-0 max-sm:mt-3'>
            ms
          </span>
        </p>
        <p className='text-body max-sm:text-small'>
          {measuring || !result
            ? 'Measuring in your browser…'
            : `Mean time to match one order, measured just now in your browser over ${result.queries} orders, with the code the server runs. Scanning all ${count.format(result.couriers)} couriers took ${short.format(result.scan.mean)} ms, ${Math.round(speedup)}× longer, and agreed on the nearest courier ${percent.format(result.agreement)} of the time.`}
        </p>
      </div>
    </section>
  );
};
