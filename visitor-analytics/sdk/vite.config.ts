import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import { copyFileSync, mkdirSync, existsSync } from 'node:fs';

const ROOT = resolve(__dirname, '../..');
const PUBLIC_TRACKER = resolve(ROOT, 'public/tracker.js');

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'VTHTracker',
      formats: ['iife'],
      fileName: () => 'tracker.js',
    },
    outDir: 'dist',
    emptyOutDir: true,
    minify: 'esbuild',
    sourcemap: false,
    target: 'es2018',
    cssCodeSplit: false,
    reportCompressedSize: true,
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
        extend: true,
        exports: 'named',
      },
    },
  },
  plugins: [
    {
      name: 'copy-tracker-to-public',
      closeBundle() {
        const built = resolve(__dirname, 'dist/tracker.js');
        if (!existsSync(built)) return;
        const publicDir = resolve(ROOT, 'public');
        if (!existsSync(publicDir)) mkdirSync(publicDir, { recursive: true });
        copyFileSync(built, PUBLIC_TRACKER);
        console.log(`[sdk] Copied tracker.js → ${PUBLIC_TRACKER}`);
      },
    },
  ],
});
