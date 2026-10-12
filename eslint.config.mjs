import perfectionist from 'eslint-plugin-perfectionist';
import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';

// Import groups follow the architecture: packages first, then the app's own
// layers from the outside in, and every `import type` in one block at the end
const layer = (name) => ({
  elementNamePattern: `^@/${name}/`,
  groupName: name,
});

export default defineConfig([
  ...nextVitals,
  globalIgnores([
    '.next/**',
    'out/**',
    'build/**',
    'coverage/**',
    'next-env.d.ts',
  ]),
  {
    plugins: {
      perfectionist,
    },
    rules: {
      'perfectionist/sort-exports': [
        'error',
        {
          ignoreCase: true,
          order: 'asc',
          partitionByComment: false,
          partitionByNewLine: false,
          specialCharacters: 'keep',
          type: 'alphabetical',
        },
      ],
      'perfectionist/sort-imports': [
        'error',
        {
          customGroups: [
            { groupName: 'types', modifiers: ['type'] },
            {
              elementNamePattern: ['^react$', '^react-.+'],
              groupName: 'react',
            },
            layer('components'),
            layer('constants'),
            layer('hooks'),
            layer('lib'),
            layer('services'),
            layer('test'),
          ],
          groups: [
            'react',
            ['builtin', 'external'],
            'components',
            'constants',
            'hooks',
            'lib',
            'services',
            'test',
            'internal',
            ['parent', 'sibling', 'index'],
            'types',
            'unknown',
          ],
          newlinesBetween: 1,
          order: 'asc',
          type: 'line-length',
        },
      ],
      'perfectionist/sort-objects': [
        'error',
        {
          type: 'alphabetical',
        },
      ],
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
  },
]);
