import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { copyFileSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "fs";
import { join } from "path";
import { URBANIA_SEO_DEFAULTS } from "./src/seo/urbaniaStaticMeta";

function escapeHtmlAttr(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}

/** Duplicate of dist/index.html with Urbania head tags for WhatsApp / Facebook (no-JS crawlers). */
function injectUrbaniaSocialMeta(html: string): string {
  const m = URBANIA_SEO_DEFAULTS;
  const keywords = `${m.keywords}, 13 seater urbania`;
  return html
    .replace(/<title>[^<]*<\/title>/, `<title>${escapeHtmlAttr(m.title)}</title>`)
    .replace(
      /<meta name="description" content="[^"]*" \/>/,
      `<meta name="description" content="${escapeHtmlAttr(m.description)}" />`,
    )
    .replace(
      /<meta name="keywords" content="[^"]*" \/>/,
      `<meta name="keywords" content="${escapeHtmlAttr(keywords)}" />`,
    )
    .replace(
      /<link rel="canonical" href="[^"]*" \/>/,
      `<link rel="canonical" href="${escapeHtmlAttr(m.canonicalUrl)}" />`,
    )
    .replace(
      /<meta property="og:title" content="[^"]*" \/>/,
      `<meta property="og:title" content="${escapeHtmlAttr(m.title)}" />`,
    )
    .replace(
      /<meta property="og:description" content="[^"]*" \/>/,
      `<meta property="og:description" content="${escapeHtmlAttr(m.description)}" />`,
    )
    .replace(
      /<meta property="og:url" content="[^"]*" \/>/,
      `<meta property="og:url" content="${escapeHtmlAttr(m.canonicalUrl)}" />`,
    )
    .replace(
      /<meta property="og:image" content="[^"]*" \/>/,
      `<meta property="og:image" content="${escapeHtmlAttr(m.ogImageUrl)}" />`,
    )
    .replace(
      /<meta name="twitter:title" content="[^"]*" \/>/,
      `<meta name="twitter:title" content="${escapeHtmlAttr(m.title)}" />`,
    )
    .replace(
      /<meta name="twitter:description" content="[^"]*" \/>/,
      `<meta name="twitter:description" content="${escapeHtmlAttr(m.description)}" />`,
    )
    .replace(
      /<meta name="twitter:image" content="[^"]*" \/>/,
      `<meta name="twitter:image" content="${escapeHtmlAttr(m.ogImageUrl)}" />`,
    );
}

export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    proxy: {
      /**
       * Guest search WhatsApp alert — same PHP as production (no local Node required).
       * Previously proxied to 127.0.0.1:3001; without `npm run dev:track-search` that caused ECONNREFUSED.
       */
      '/api/track-search.php': {
        target: 'https://www.vizagtaxihub.com',
        changeOrigin: true,
        secure: true,
      },
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
    rollupOptions: {
      output: {
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name?.split('.') || [];
          const ext = info[info.length - 1] || 'asset';
          return `assets/[name]-[hash].${ext}`;
        },
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react-dom') || id.includes('react/') || id.includes('react-router')) {
              return 'react-vendor';
            }
            if (id.includes('@tanstack/react-query') || id.includes('react-helmet-async') || id.includes('axios')) {
              return 'vendor';
            }
          }
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
    'process.env.VITE_GOOGLE_MAPS_API_KEY': JSON.stringify(process.env.VITE_GOOGLE_MAPS_API_KEY || ''),
    // Add build timestamp for cache busting
    '__BUILD_TIME__': JSON.stringify(Date.now()),
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
    {
      name: 'emit-urbania-social-index-html',
      apply: 'build' as const,
      closeBundle() {
        const distIndex = join(process.cwd(), 'dist', 'index.html');
        try {
          const html = readFileSync(distIndex, 'utf8');
          writeFileSync(
            join(process.cwd(), 'dist', 'index-vehicle-urbania.html'),
            injectUrbaniaSocialMeta(html),
            'utf8',
          );
          console.log('✅ Wrote dist/index-vehicle-urbania.html (Urbania OG / WhatsApp preview)');
        } catch (e) {
          console.warn('emit-urbania-social-index-html:', e);
        }
      },
    },
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
