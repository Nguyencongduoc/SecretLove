import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';

export default defineConfig([
  ...nextVitals,
  ...nextTypescript,
  // Protected media must bypass the public Next Image optimizer.
  { rules: { '@next/next/no-img-element': 'off' } },
  globalIgnores([
    '.next/**',
    'node_modules/**',
    '.pnpm-store/**',
    'next-env.d.ts',
    'test-results/**',
  ]),
]);
