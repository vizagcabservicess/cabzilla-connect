import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    proxy: {
      '/api': {
        target: 'https://vizagtaxihub.com',
        changeOrigin: true,
        secure: false,
      },
    },
    allowedHosts: [
      'all',
      '43014fa9-5dfc-4d2d-a3b8-389cd9ef25a7.lovableproject.com'
    ],
    watch: {
      usePolling: true,
      interval: 1000,
    },
  },
  plugins: [
    react(),
    mode === 'development' && componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    target: 'esnext',
    minify: 'esbuild',
    cssMinify: true,
    reportCompressedSize: false,
    chunkSizeWarningLimit: 2000,
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Core React libraries - highest priority
          if (id.includes('react') || id.includes('react-dom')) {
            return 'react-core';
          }
          
          // Critical UI components
          if (id.includes('src/components/ui/') || id.includes('@radix-ui')) {
            return 'ui-core';
          }
          
          // Pages - split each major page
          if (id.includes('src/pages/Index')) {
            return 'page-index';
          }
          if (id.includes('src/pages/Admin')) {
            return 'page-admin';
          }
          if (id.includes('src/pages/Dashboard')) {
            return 'page-dashboard';
          }
          
          // Admin components - separate chunk
          if (id.includes('src/components/admin/')) {
            return 'admin-components';
          }
          
          // Form and validation libraries
          if (id.includes('react-hook-form') || id.includes('zod') || id.includes('@hookform')) {
            return 'forms';
          }
          
          // Maps - load separately
          if (id.includes('@react-google-maps') || id.includes('maps.googleapis.com')) {
            return 'maps';
          }
          
          // Heavy libraries - defer loading
          if (id.includes('recharts') || id.includes('swiper') || id.includes('@react-pdf')) {
            return 'heavy-libs';
          }
          
          // Utilities and helpers
          if (id.includes('src/utils/') || id.includes('src/lib/') || id.includes('src/hooks/')) {
            return 'utils';
          }
          
          // Third party APIs and external services
          if (id.includes('razorpay') || id.includes('axios') || id.includes('@tanstack')) {
            return 'external';
          }
          
          // All other vendor dependencies
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        },
      },
    },
  },
  optimizeDeps: {
    include: ['react', 'react-dom', '@radix-ui/react-slot', 'clsx', 'tailwind-merge'],
    exclude: ['recharts', 'swiper', '@react-pdf/renderer'],
    force: true,
  },
  esbuild: {
    logOverride: { 'this-is-undefined-in-esm': 'silent' },
    drop: mode === 'production' ? ['console', 'debugger'] : [],
  },
  define: {
    __DEV__: mode === 'development',
  },
}));
