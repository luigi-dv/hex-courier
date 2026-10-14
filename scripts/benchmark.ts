/**
 * H3 ring lookup vs scanning every courier, for 1k, 10k and 100k couriers.
 *
 *   npm run benchmark
 *
 * The same code runs in the browser on the page's benchmark section.
 */
import { RES } from '@/constants/geo';

import { BENCHMARK_RADIUS_M, runBenchmark } from '@/lib/benchmark';

const SIZES = [1_000, 10_000, 100_000];
const QUERIES = 500;

const ms = (value: number) => `${value.toFixed(3)} ms`;

const rows = SIZES.map((size) => {
  const result = runBenchmark(size, { queries: QUERIES });
  return {
    'build index': ms(result.indexMs),
    couriers: size.toLocaleString('en-US'),
    'H3 mean': ms(result.h3.mean),
    'H3 p95': ms(result.h3.p95),
    'same nearest': `${(result.agreement * 100).toFixed(1)}%`,
    'scan mean': ms(result.scan.mean),
    'scan p95': ms(result.scan.p95),
    speedup: `${(result.scan.mean / result.h3.mean).toFixed(0)}x`,
  };
});

console.log(
  `\n${QUERIES} orders per size, resolution ${RES}, couriers within ${BENCHMARK_RADIUS_M / 1000} km\n`
);
console.table(rows);
