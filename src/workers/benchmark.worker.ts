/// <reference lib="webworker" />
import { runBenchmark } from '@/lib/benchmark';

/** Runs off the main thread so the page stays responsive while it measures */
self.onmessage = (event: MessageEvent<{ id: number; size: number }>) => {
  const { id, size } = event.data;
  const result = runBenchmark(size, {
    queries: 300,
    scanBudgetMs: 1500,
    seed: 7,
  });
  self.postMessage({ id, result });
};
