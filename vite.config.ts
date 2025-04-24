
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    allowedHosts: [
      // your exact Replit hostname:
      'fd5a15ca-94a7-4426-abd8-44f140918d8b-00-2li0r0h6si1am.pike.replit.dev',
      // you can also allow all sub‑domains of pike.replit.dev:
      '.pike.replit.dev',
      // Allow Lovable preview domains:
      '.lovableproject.com',
      // OR simply: 'all'  // to allow every host (dev only)
    ],
    watch: {
      usePolling: true,
      interval: 1000,
    },
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
