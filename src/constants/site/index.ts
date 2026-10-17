export const REPO_URL = 'https://github.com/Luigi-DV/hex-courier';
export const AUTHOR = {
  name: 'Luigelo Davila',
  url: 'https://luigelo.ldvloper.com',
};

/** The folders of the hero, front to back; each one is a section of the page */
export const SECTIONS = [
  {
    colour: 'var(--color-surface)',
    href: '#live',
    label: 'Live city',
    light: false,
  },
  {
    colour: 'var(--color-lime)',
    href: '#cells',
    label: 'Cell size',
    light: true,
  },
  {
    colour: 'var(--color-paper)',
    href: '#search',
    label: 'The search',
    light: true,
  },
  {
    colour: 'var(--color-paper-2)',
    href: '#benchmark',
    label: 'Benchmark',
    light: true,
  },
  {
    colour: 'var(--color-surface-2)',
    href: '#stack',
    label: 'Under the hood',
    light: false,
  },
] as const;
