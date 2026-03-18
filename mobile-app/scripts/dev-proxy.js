/**
 * Development API proxy - bypasses CORS when testing mobile app on Expo Web.
 * Proxies /api/* to vizagtaxihub.com so local fare/airport/outstation API calls succeed.
 *
 * Usage:
 *   1. npm run proxy    (starts proxy on port 9090)
 *   2. Set EXPO_PUBLIC_API_BASE_URL=http://localhost:9090 in .env
 *   3. npm run web      (Expo web will use proxy for API calls)
 */
const http = require('node:http');
const { createProxyMiddleware } = require('http-proxy-middleware');

const PORT = process.env.PROXY_PORT || 9090;
const TARGET = process.env.PROXY_TARGET || 'https://www.vizagtaxihub.com';

const apiProxy = createProxyMiddleware({
  target: TARGET,
  changeOrigin: true,
  secure: true,
  pathFilter: '/api',
});

const server = http.createServer((req, res) => {
  if (req.url?.startsWith('/api')) {
    apiProxy(req, res, (err) => {
      if (err) {
        res.statusCode = 502;
        res.end(JSON.stringify({ error: 'Proxy error', message: String(err) }));
      }
    });
  } else {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
      message: 'API proxy for local dev - use /api/* paths. Target: ' + TARGET,
    }));
  }
});

server.listen(PORT, () => {
  console.log(`[dev-proxy] API proxy running at http://localhost:${PORT}`);
  console.log(`[dev-proxy] Forwarding /api/* -> ${TARGET}`);
  console.log(`[dev-proxy] Set EXPO_PUBLIC_API_BASE_URL=http://localhost:${PORT} for web dev`);
});
