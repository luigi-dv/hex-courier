import React from 'react';

import { Hero } from '@/components/Hero';
import { CellSize } from '@/components/CellSize';
import { LiveCity } from '@/components/LiveCity';
import { Benchmark } from '@/components/Benchmark';
import { SiteFooter } from '@/components/SiteFooter';
import { SearchRules } from '@/components/SearchRules';
import { SearchStages } from '@/components/SearchStages';
import { UnderTheHood } from '@/components/UnderTheHood';
import { RevealObserver } from '@/components/RevealObserver';

import { measureRules } from '@/lib/scenarios';

import { ResolutionProvider } from '@/providers/ResolutionProvider';

export default function Home() {
  // Runs once at build time: the page is static, the figures are measured
  const evidence = measureRules();

  return (
    <ResolutionProvider>
      <Hero />
      <main>
        <LiveCity />
        <CellSize />
        <SearchStages />
        <SearchRules evidence={evidence} />
        <Benchmark />
        <UnderTheHood />
      </main>
      <SiteFooter />
      <RevealObserver />
    </ResolutionProvider>
  );
}
