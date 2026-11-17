import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import https from "node:https";
import { componentTagger } from "lovable-tagger";
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "fs";
import { join } from "path";
import {
  buildSeoHeadDocument,
  buildStructuredData,
  listSitemapPaths,
  resolvePublicHead,
  validatePublicHead,
} from "./src/seo/publicPageMeta";
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

function escapeHtmlText(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Same app shell as index.html, with this route's head tags, JSON-LD, plus crawlable H1/main text in #root. */
function injectRouteHead(
  html: string,
  routePath: string,
  head: { title: string; description: string; ogImage: string; h1?: string; mainText?: string; robots?: string },
): string {
  const canonical = routePath === "/"
    ? "https://vizagtaxihub.com/"
    : `https://vizagtaxihub.com${routePath}`;
  const title = escapeHtmlAttr(head.title);
  const description = escapeHtmlAttr(head.description);
  const image = escapeHtmlAttr(head.ogImage);
  const canonicalAttr = escapeHtmlAttr(canonical);
  const h1 = escapeHtmlText(head.h1 || head.title.split("|")[0]?.trim() || head.title);
  const mainText = escapeHtmlText(head.mainText || head.description);
  const schemas = buildStructuredData(routePath, {
    title: head.title,
    description: head.description,
    canonical,
    ogImage: head.ogImage,
    h1: head.h1 || head.title.split("|")[0]?.trim() || head.title,
  });
  const schemaTags = schemas
    .map((block) => `<script type="application/ld+json">${JSON.stringify(block).replace(/<\//g, "<\\/")}</script>`)
    .join("\n    ");
  const robotsTag = head.robots ? `\n    <meta name="robots" content="${escapeHtmlAttr(head.robots)}" />` : "";
  const block = [
    `<meta name="description" content="${description}" />${robotsTag}`,
    `<link rel="canonical" href="${canonicalAttr}" />`,
    `<meta property="og:title" content="${title}" />`,
    `<meta property="og:description" content="${description}" />`,
    `<meta property="og:url" content="${canonicalAttr}" />`,
    `<meta property="og:image" content="${image}" />`,
    schemaTags,
  ].filter(Boolean).join("\n    ");
  const stripped = html
    .replace(/<meta\s+name="description"\s+content="[^"]*"\s*\/?>\s*/gi, "")
    .replace(/<meta\s+name="robots"\s+content="[^"]*"\s*\/?>\s*/gi, "")
    .replace(/<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>\s*/gi, "")
    .replace(/<meta\s+property="og:(?:title|description|url|image)"\s+content="[^"]*"\s*\/?>\s*/gi, "")
    .replace(/<script\s+type="application\/ld\+json">[\s\S]*?<\/script>\s*/gi, "");
  const withHead = stripped.replace(
    /<title>[^<]*<\/title>/i,
    `<title>${title}</title>\n    ${block}`,
  );
  // Crawlable H1/text stay in the first HTML response, but stay visually hidden so
  // users still see the loading skeleton until React replaces #root.
  const staticBody = [
    '<div id="root">',
    '      <main id="vth-seo-static" style="position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0">',
    `        <h1>${h1}</h1>`,
    `        <p>${mainText}</p>`,
    '      </main>',
    '      <div style="min-height:100vh;background:#f9fafb">',
    '        <div style="background:#fff;box-shadow:0 1px 3px rgba(0,0,0,0.08)">',
    '          <div class="skel-header">',
    '            <div class="skel skel-bar"></div>',
    '            <div class="skel skel-bar" style="width:5rem"></div>',
    '          </div>',
    '        </div>',
    '        <div class="skel-hero">',
    '          <div class="skel-card">',
    '            <div class="skel-row"><div class="skel skel-block"></div><div class="skel skel-block"></div><div class="skel skel-block"></div></div>',
    '            <div class="skel skel-btn"></div>',
    '          </div>',
    '        </div>',
    '      </div>',
    '    </div>',
  ].join("\n    ");
  return withHead.replace(
    /<div id="root">[\s\S]*?<\/div>\s*(?=\s*(?:<!--|<\/body>|<script))/i,
    `${staticBody}\n\n    `,
  );
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
  const headTags = [
    `<meta name="description" content="${escapeHtmlAttr(m.description)}" />`,
    `<meta name="keywords" content="${escapeHtmlAttr(keywords)}" />`,
    `<link rel="canonical" href="${escapeHtmlAttr(m.canonicalUrl)}" />`,
    `<meta property="og:title" content="${escapeHtmlAttr(m.title)}" />`,
    `<meta property="og:description" content="${escapeHtmlAttr(m.description)}" />`,
    `<meta property="og:url" content="${escapeHtmlAttr(m.canonicalUrl)}" />`,
    `<meta property="og:image" content="${escapeHtmlAttr(m.ogImageUrl)}" />`,
    `<meta name="twitter:title" content="${escapeHtmlAttr(m.title)}" />`,
    `<meta name="twitter:description" content="${escapeHtmlAttr(m.description)}" />`,
    `<meta name="twitter:image" content="${escapeHtmlAttr(m.ogImageUrl)}" />`,
  ].join('\n    ');
  const stripped = html
    .replace(/<meta\s+name="description"\s+content="[^"]*"\s*\/?>\s*/gi, '')
    .replace(/<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>\s*/gi, '')
    .replace(/<meta\s+property="og:(?:title|description|url|image)"\s+content="[^"]*"\s*\/?>\s*/gi, '');
  return stripped
    .replace(/<head>/i, `<head>\n    ${lcpPreload}`)
    .replace(/<title>[^<]*<\/title>/, `<title>${escapeHtmlAttr(m.title)}</title>\n    ${headTags}`);
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
      '/api/driver/duty-slip-pdf.php': {
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
        const stamped = html.replace(
          /content="__BUILD_TIME__"/g,
          `content="${new Date().toISOString()}"`,
        );
        if (mode !== 'production') return stamped;
        return stamped.replace(
          /<script src="https:\/\/cdn\.gpteng\.co\/gptengineer\.js"[^>]*>\s*<\/script>\s*/i,
          '',
        );
      },
    },
    {
      name: 'emit-vehicle-embed-social-index-html',
      apply: 'build' as const,
      closeBundle() {
        const distDir = join(process.cwd(), 'dist');
        try {
          validatePublicHead();
          const sitemapFile = existsSync(join(distDir, 'sitemap.xml'))
            ? join(distDir, 'sitemap.xml')
            : join(process.cwd(), 'public', 'sitemap.xml');
          const sitemapPaths = existsSync(sitemapFile)
            ? listSitemapPaths(readFileSync(sitemapFile, 'utf8'))
            : [];
          const doc = buildSeoHeadDocument(sitemapPaths);
          writeFileSync(join(distDir, 'seo-head.json'), JSON.stringify(doc), 'utf8');
          console.log(`✅ Wrote dist/seo-head.json (${Object.keys(doc.pages).length} pages)`);

          let shell = readFileSync(join(distDir, 'index.html'), 'utf8');
          const home = resolvePublicHead('/') ?? doc.pages['/'];
          if (home) {
            shell = injectRouteHead(shell, '/', {
              title: home.title,
              description: home.description,
              ogImage: home.ogImage,
              h1: 'h1' in home ? home.h1 : home.title.split('|')[0]?.trim(),
              mainText: 'mainText' in home ? home.mainText : home.description,
            });
            writeFileSync(join(distDir, 'index.html'), shell, 'utf8');
            console.log('✅ Injected homepage H1/main text into dist/index.html');
          }

          let written = 0;
          for (const [routePath, head] of Object.entries(doc.pages)) {
            if (routePath === '/') continue;
            const relative = routePath.replace(/^\//, '');
            const file = join(distDir, 'seo', `${relative}.html`);
            mkdirSync(join(file, '..'), { recursive: true });
            writeFileSync(file, injectRouteHead(shell, routePath, head), 'utf8');
            written += 1;
          }
          // Ensure every sitemap path has a shell even if resolvePublicHead was null earlier.
          for (const routePath of sitemapPaths) {
            if (routePath === '/' || doc.pages[routePath]) continue;
            const head = resolvePublicHead(routePath);
            if (!head) continue;
            const relative = routePath.replace(/^\//, '');
            const file = join(distDir, 'seo', `${relative}.html`);
            mkdirSync(join(file, '..'), { recursive: true });
            writeFileSync(file, injectRouteHead(shell, routePath, head), 'utf8');
            written += 1;
          }
          // Emit static noindex shell for /group-tours/search without adding it to sitemap.xml
          const searchHead = resolvePublicHead('/group-tours/search');
          if (searchHead) {
            const searchFile = join(distDir, 'seo', 'group-tours', 'search.html');
            mkdirSync(join(searchFile, '..'), { recursive: true });
            writeFileSync(
              searchFile,
              injectRouteHead(shell, '/group-tours/search', {
                ...searchHead,
                robots: 'noindex, follow',
              }),
              'utf8',
            );
            written += 1;
          }
          console.log(`✅ Wrote ${written} route HTML files in dist/seo (head + H1 for crawlers)`);
        } catch (e) {
          console.warn('emit-seo-head:', e);
          throw e;
        }
        const distIndex = join(distDir, 'index.html');
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
