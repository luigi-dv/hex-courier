/**
 * Collects named durations for the `Server-Timing` header, so the browser (and
 * the request log on the page) can see where a request spent its time.
 */
export const createTimer = () => {
  const entries: { name: string; ms: number }[] = [];
  return {
    header() {
      return entries
        .map(({ ms, name }) => `${name};dur=${ms.toFixed(2)}`)
        .join(', ');
    },
    async measure<T>(name: string, run: () => Promise<T> | T): Promise<T> {
      const start = performance.now();
      try {
        return await run();
      } finally {
        entries.push({ ms: performance.now() - start, name });
      }
    },
  };
};

export type Timer = ReturnType<typeof createTimer>;
