'use client';

import { useEffect } from 'react';

/**
 * Adds `is-in` to every `[data-reveal]` the first time it scrolls into view.
 * Never replays. Without JS the `.js` gate in the CSS keeps everything visible.
 */
export const RevealObserver = () => {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add('is-in');
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: '0px 0px -12% 0px', threshold: 0.1 }
    );
    document
      .querySelectorAll('[data-reveal]')
      .forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, []);

  return null;
};
