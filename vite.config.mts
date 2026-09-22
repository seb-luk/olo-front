/// <reference types='vitest' />

import * as path from 'node:path';
import * as fs from 'node:fs';
import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

export default defineConfig(() => ({
  root: import.meta.dirname,
  cacheDir: process.env['NX_WORKSPACE_ROOT'] ? '../../node_modules/.vite/packages/olo-front' : './node_modules/.vite',
  plugins: [
    tsconfigPaths(),
    {
      name: 'copy-readme',
      generateBundle() {
        this.emitFile({
          type: 'asset',
          fileName: 'README.md',
          source: fs.readFileSync(path.resolve(import.meta.dirname, 'README.md'), 'utf-8'),
        });
      },
    },
    dts({ entryRoot: 'src', tsconfigPath: path.join(import.meta.dirname, 'tsconfig.lib.json'), pathsToAliases: false }),
  ],
  // Uncomment this if you are using workers.
  // worker: {
  //   plugins: () => [ tsconfigPaths() ],
  // },
  // Configuration for building your library.
  // See: https://vite.dev/guide/build.html#library-mode
  build: {
    outDir: process.env['NX_WORKSPACE_ROOT'] ? '../../dist/packages/olo-front' : './dist',
    emptyOutDir: true,
    reportCompressedSize: true,
    commonjsOptions: {
      transformMixedEsModules: true,
    },
    sourcemap: true,
    lib: {
      // Could also be a dictionary or array of multiple entry points.
      entry: 'src/index.js',
      name: 'OloFront',
      fileName: (format) => `index.${format === 'es' ? 'js' : 'umd.cjs'}`,
      // Dual formats: ESM for bundlers, UMD for script tags / CDN
      formats: ['es' as const, 'umd' as const],
    },
    rolldownOptions: {
      // External packages that should not be bundled into your library.
      external: [],
    },
  },
  test: {
    name: 'olo-front',
    watch: false,
    globals: true,
    environment: 'happy-dom',
    include: ['{src,tests}/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    reporters: ['default'],
    coverage: {
      reportsDirectory: process.env['NX_WORKSPACE_ROOT'] ? '../../coverage/packages/olo-front' : './coverage',
      provider: 'v8' as const,
      thresholds: {
        lines: 75,
        functions: 75,
        branches: 70,
        statements: 75,
      },
    },
  },
}));
