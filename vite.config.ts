import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { copyFileSync, mkdirSync, readdirSync, statSync } from "fs";
import { join } from "path";

export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    proxy: {
      '/api': {
        target: 'https://www.vizagtaxihub.com',
        changeOrigin: true,
        secure: true,
      },
    },
    allowedHosts: [
      // Allow all domains during development
      'all',
      // Explicitly add the lovable project domain
      '43014fa9-5dfc-4d2d-a3b8-389cd9ef25a7.lovableproject.com'
    ],
    watch: {
      usePolling: true,
      interval: 1000,
    },
  },
  build: {
    // Use Vite's built-in hash system for cache busting
    rollupOptions: {
      output: {
        // Standard hash-based naming for reliable cache busting
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name?.split('.') || [];
          const ext = info[info.length - 1] || 'asset';
          return `assets/[name]-[hash].${ext}`;
        },
      },
    },
    // Ensure source maps are generated for debugging
    sourcemap: mode === 'development',
    // Optimize chunk size
    chunkSizeWarningLimit: 1000,
    // Copy .htaccess file to build directory
    copyPublicDir: true,
  },
  define: {
    // Ensure environment variables are available at build time
    'process.env.VITE_API_BASE_URL': JSON.stringify(process.env.VITE_API_BASE_URL || 'https://www.vizagtaxihub.com'),
    'process.env.VITE_GOOGLE_MAPS_API_KEY': JSON.stringify(process.env.VITE_GOOGLE_MAPS_API_KEY || 'AIzaSyDqhYmgEp_DafM1jKJ8XHTgEdLXCg-fGy4'),
    // Add build timestamp for cache busting
    '__BUILD_TIME__': JSON.stringify(Date.now()),
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
    // Custom plugin to exclude api folder from build
    {
      name: 'exclude-api-folder',
      generateBundle() {
        // This plugin runs during build and ensures api folder is not included
      },
      writeBundle() {
        // After build, remove api folder if it was copied
        const distApiPath = join(process.cwd(), 'dist', 'api');
        try {
          const fs = require('fs');
          if (fs.existsSync(distApiPath)) {
            fs.rmSync(distApiPath, { recursive: true, force: true });
            console.log('✅ Removed api folder from dist directory');
          }
        } catch (error) {
          console.log('Note: api folder was not found in dist or already removed');
        }
      }
    }
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
