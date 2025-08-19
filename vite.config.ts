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
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Core React libraries
          if (id.includes('react') || id.includes('react-dom')) {
            return 'react-core';
          }
          
          // UI libraries
          if (id.includes('@radix-ui') || id.includes('lucide-react') || id.includes('framer-motion')) {
            return 'ui-libs';
          }
          
          // Form libraries
          if (id.includes('react-hook-form') || id.includes('@hookform/resolvers') || id.includes('zod')) {
            return 'form-libs';
          }
          
          // Utility libraries
          if (id.includes('axios') || id.includes('date-fns') || id.includes('clsx') || id.includes('tailwind-merge')) {
            return 'utils';
          }
          
          // Maps and location
          if (id.includes('@react-google-maps') || id.includes('maps.googleapis.com')) {
            return 'maps';
          }
          
          // Payment and analytics
          if (id.includes('razorpay') || id.includes('@tanstack/react-query')) {
            return 'external';
          }
          
          // Large dependencies
          if (id.includes('recharts') || id.includes('swiper') || id.includes('@react-pdf')) {
            return 'heavy-libs';
          }
          
          // Vendor dependencies
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        },
      },
    },
  },
  optimizeDeps: {
    include: ['react', 'react-dom'],
    exclude: ['recharts', 'swiper', '@react-pdf/renderer'],
  },
}));
