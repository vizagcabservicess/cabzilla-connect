import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import https from "node:https";
import { componentTagger } from "lovable-tagger";
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "fs";
import { join } from "path";
import { VEHICLE_EMBED_CONFIGS } from "./src/seo/vehicleEmbedMeta";

function sniffMediaType(buf: Buffer): string {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf.length >= 4 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return "image/png";
  if (buf.length >= 4 && buf.toString("ascii", 0, 4) === "%PDF") return "application/pdf";
  if (buf.length >= 12 && buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") return "image/webp";
  return "application/octet-stream";
}

function eventMediaProxy(): Plugin {
  return {
    name: "event-media-proxy",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.originalUrl || req.url || "";
        if (!url.startsWith("/api/events/media.php") && !url.startsWith("/api/events/duty-slip-pdf.php")) {
          next();
          return;
        }
        if (req.method === "OPTIONS") {
          res.statusCode = 204;
          res.end();
          return;
        }
        const target = new URL(url, "https://www.vizagtaxihub.com");
        const headers: Record<string, string> = {
          host: "www.vizagtaxihub.com",
          "accept-encoding": "identity",
        };
        const auth = req.headers.authorization;
        if (typeof auth === "string") headers.authorization = auth;
        const cookie = req.headers.cookie;
        if (typeof cookie === "string") headers.cookie = cookie;
        https.get(target, { headers }, (up) => {
          const chunks: Buffer[] = [];
          up.on("data", (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
          up.on("end", () => {
            let out = Buffer.concat(chunks);
            if (out.length && out[0] === 0x7b) {
              try {
                const json = JSON.parse(out.toString("utf8")) as { data?: string; mime?: string };
                if (json.data) out = Buffer.from(json.data, "base64");
              } catch {
                /* keep raw */
              }
            }
            const mime = sniffMediaType(out);
            res.statusCode = up.statusCode || 200;
            res.setHeader("Content-Type", mime);
            res.setHeader("Content-Length", String(out.length));
            res.setHeader("Cache-Control", "private, no-store");
            res.setHeader("Access-Control-Allow-Origin", req.headers.origin || "http://localhost:8080");
            res.end(out);
          });
        }).on("error", () => {
          res.statusCode = 502;
          res.end("Media proxy failed");
        });
      });
    },
  };
}

function escapeHtmlAttr(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}

/** Duplicate of dist/index.html with vehicle embed head tags for WhatsApp / Facebook (no-JS crawlers). */
function injectVehicleEmbedSocialMeta(
  html: string,
  slug: keyof typeof VEHICLE_EMBED_CONFIGS,
  capacitySuffix: string,
): string {
  const config = VEHICLE_EMBED_CONFIGS[slug];
  const m = config.seo;
  const keywords = `${m.keywords}, ${capacitySuffix}`;
  const lcpPreload = `<link rel="preload" href="${escapeHtmlAttr(config.illustration.cdnUrl)}" as="image" fetchpriority="high" />`;
  return html
    .replace(/<head>/i, `<head>\n    ${lcpPreload}`)
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

/** Per-deploy id so unchanged chunk hashes (e.g. react-vendor) still get new URLs after deploy. */
const buildId = process.env.VITE_BUILD_ID || Date.now().toString(36);

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
      '/api/track-vth-ai-lead.php': {
        target: 'https://www.vizagtaxihub.com',
        changeOrigin: true,
        secure: true,
      },
      '/api/va': {
        target: 'http://127.0.0.1:4090',
        changeOrigin: true,
        timeout: 30_000,
        proxyTimeout: 30_000,
        // /api/va/api/auth/exchange → /api/auth/exchange
        rewrite: (p) => p.replace(/^\/api\/va/, ''),
      },
      '/va-ws': {
        target: 'ws://127.0.0.1:4090',
        ws: true,
        changeOrigin: true,
        timeout: 30_000,
        rewrite: (p) => p.replace(/^\/va-ws/, '/ws'),
      },
      '/api/events/media.php': {
        target: 'https://www.vizagtaxihub.com',
        changeOrigin: true,
        secure: true,
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            proxyReq.setHeader('accept-encoding', 'identity');
          });
        },
      },
      '/api/events/duty-slip-pdf.php': {
        target: 'https://www.vizagtaxihub.com',
        changeOrigin: true,
        secure: true,
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            proxyReq.setHeader('accept-encoding', 'identity');
          });
        },
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
        chunkFileNames: `assets/[name]-${buildId}-[hash].js`,
        entryFileNames: `assets/[name]-${buildId}-[hash].js`,
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name?.split('.') || [];
          const ext = info[info.length - 1] || 'asset';
          return `assets/[name]-[hash].${ext}`;
        },
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          // Router separate from React core so the browser can parse/evaluate smaller units.
          if (id.includes('react-router')) return 'router-vendor';
          if (id.includes('react-dom') || id.includes('scheduler')) return 'react-vendor';
          if (/[/\\]node_modules[/\\]react[/\\]/.test(id)) return 'react-vendor';
          // Isolated carousel lib — safe separate chunk (avoid splitting recharts alone; caused TDZ).
          if (id.includes('swiper')) return 'swiper-vendor';
          if (id.includes('@tanstack/react-query') || id.includes('react-helmet-async') || id.includes('axios')) {
            return 'vendor';
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
    eventMediaProxy(),
    react(),
    mode === 'development' &&
    componentTagger(),
    {
      name: 'strip-gptengineer-prod',
      apply: 'build' as const,
      transformIndexHtml(html: string) {
        if (mode !== 'production') return html;
        return html.replace(
          /<script src="https:\/\/cdn\.gpteng\.co\/gptengineer\.js"[^>]*>\s*<\/script>\s*/i,
          '',
        );
      },
    },
    {
      name: 'emit-vehicle-embed-social-index-html',
      apply: 'build' as const,
      closeBundle() {
        const distIndex = join(process.cwd(), 'dist', 'index.html');
        try {
          const html = readFileSync(distIndex, 'utf8');
          const embedPages: Array<{
            slug: keyof typeof VEHICLE_EMBED_CONFIGS;
            outfile: string;
            capacitySuffix: string;
          }> = [
            {
              slug: 'urbania',
              outfile: 'index-vehicle-urbania.html',
              capacitySuffix: '13 seater urbania',
            },
            {
              slug: 'tempo-traveller',
              outfile: 'index-vehicle-tempo-traveller.html',
              capacitySuffix: '17 seater tempo traveller',
            },
          ];
          for (const page of embedPages) {
            writeFileSync(
              join(process.cwd(), 'dist', page.outfile),
              injectVehicleEmbedSocialMeta(html, page.slug, page.capacitySuffix),
              'utf8',
            );
            console.log(`✅ Wrote dist/${page.outfile} (vehicle embed OG / WhatsApp preview)`);
          }
        } catch (e) {
          console.warn('emit-vehicle-embed-social-index-html:', e);
        }
      },
    },
    // public/api is copied into dist after the bundle is written, so drop it in closeBundle
    // and again from the build script once Vite has finished copying public/.
    {
      name: 'exclude-api-folder',
      closeBundle() {
        const distApiPath = join(process.cwd(), 'dist', 'api');
        if (!existsSync(distApiPath)) return;
        rmSync(distApiPath, { recursive: true, force: true });
        console.log('✅ Removed api folder from dist directory');
      }
    }
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
