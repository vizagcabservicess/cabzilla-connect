import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8081,
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
  define: {
    // Ensure environment variables are available at build time
    'process.env.VITE_API_BASE_URL': JSON.stringify(process.env.VITE_API_BASE_URL || 'https://www.vizagtaxihub.com'),
    'process.env.VITE_GOOGLE_MAPS_API_KEY': JSON.stringify(process.env.VITE_GOOGLE_MAPS_API_KEY || 'AIzaSyDqhYmgEp_DafM1jKJ8XHTgEdLXCg-fGy4'),
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
}));
