
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  optimizeDeps: {
    esbuildOptions: {
      // Fix html2canvas issues in development
      define: {
        global: 'globalThis',
      },
    },
  },
  build: {
    rollupOptions: {
      // External packages that should not be bundled
      external: [],
      output: {
        // Global variables to use in the UMD build for externalized deps
        globals: {},
      },
    },
    commonjsOptions: {
      // This helps with CommonJS modules that need special handling
      transformMixedEsModules: true,
    },
  }
}));
