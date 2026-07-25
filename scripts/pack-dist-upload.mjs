/**
 * Pack a safe Hostinger upload set from the current dist/ build.
 * Always use this folder/zip together so index.html hashes match assets/.
 *
 * Usage:
 *   npm run build:upload
 *   → creates dist-upload/ and vizagtaxihub-dist-upload.zip
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const dist = path.join(root, 'dist');
const outDir = path.join(root, 'dist-upload');
const zipPath = path.join(root, 'vizagtaxihub-dist-upload.zip');

function fail(msg) {
  console.error(`❌ ${msg}`);
  process.exit(1);
}

function rmrf(p) {
  fs.rmSync(p, { recursive: true, force: true });
}

function copyRecursive(src, dest) {
  const st = fs.statSync(src);
  if (st.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const name of fs.readdirSync(src)) {
      copyRecursive(path.join(src, name), path.join(dest, name));
    }
    return;
  }
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

if (!fs.existsSync(dist)) {
  fail('dist/ not found. Run npm run build first (or use npm run build:upload).');
}

const indexHtml = path.join(dist, 'index.html');
if (!fs.existsSync(indexHtml)) fail('dist/index.html missing.');

const indexRaw = fs.readFileSync(indexHtml, 'utf8');
if (!/connect-src[^"]*https:\/\/vizagup\.com/.test(indexRaw)) {
  fail(
    'dist/index.html CSP is missing https://vizagup.com in connect-src. Fix root index.html and rebuild.',
  );
}
if (!/wss:\/\/vizagup\.com/.test(indexRaw)) {
  fail('dist/index.html CSP is missing wss://vizagup.com. Fix root index.html and rebuild.');
}

const assetsDir = path.join(dist, 'assets');
if (!fs.existsSync(assetsDir)) fail('dist/assets/ missing.');

const trackerJs = path.join(dist, 'tracker.js');
if (!fs.existsSync(trackerJs)) {
  // Vite copies public/ → dist/; fall back to public if dist build omitted it
  const publicTracker = path.join(root, 'public', 'tracker.js');
  if (fs.existsSync(publicTracker)) {
    console.warn('⚠️  dist/tracker.js missing — copying from public/tracker.js');
    fs.mkdirSync(path.dirname(trackerJs), { recursive: true });
    fs.copyFileSync(publicTracker, trackerJs);
  } else {
    fail(
      'dist/tracker.js missing. Run: npm run build:tracker && npm run build:upload\n' +
        'Without tracker.js, live visitors and VTH AI will not work on production.',
    );
  }
}
const trackerRaw = fs.readFileSync(trackerJs, 'utf8').slice(0, 40);
if (/<!DOCTYPE html>/i.test(trackerRaw) || /<html/i.test(trackerRaw)) {
  fail('dist/tracker.js looks like HTML, not JavaScript. Rebuild the tracker SDK.');
}

rmrf(outDir);
fs.mkdirSync(outDir, { recursive: true });

copyRecursive(indexHtml, path.join(outDir, 'index.html'));
copyRecursive(assetsDir, path.join(outDir, 'assets'));
copyRecursive(trackerJs, path.join(outDir, 'tracker.js'));

const dataDir = path.join(dist, 'data');
if (fs.existsSync(dataDir)) {
  copyRecursive(dataDir, path.join(outDir, 'data'));
} else {
  console.warn('⚠️  dist/data/ not found — packing without data/.');
}

// Optional helpers often needed alongside the SPA
for (const extra of ['.htaccess', 'sw.js', 'robots.txt', 'sitemap.xml']) {
  const p = path.join(dist, extra);
  if (fs.existsSync(p)) copyRecursive(p, path.join(outDir, extra));
}

rmrf(zipPath);

const isWin = process.platform === 'win32';
let zipped = false;
if (isWin) {
  const ps = spawnSync(
    'powershell.exe',
    [
      '-NoProfile',
      '-Command',
      `Compress-Archive -Path '${outDir}\\*' -DestinationPath '${zipPath}' -Force`,
    ],
    { stdio: 'inherit' },
  );
  zipped = ps.status === 0 && fs.existsSync(zipPath);
} else {
  const tar = spawnSync('zip', ['-r', zipPath, '.'], { cwd: outDir, stdio: 'inherit' });
  zipped = tar.status === 0 && fs.existsSync(zipPath);
}

console.log('');
console.log('✅ Safe upload package ready');
console.log(`   Folder: ${outDir}`);
if (zipped) console.log(`   Zip:    ${zipPath}`);
console.log('');
console.log('Upload ALL of these together to vizagtaxihub.com public_html:');
console.log('  • index.html');
console.log('  • assets/');
console.log('  • data/   (if present)');
console.log('  • tracker.js  (required for live visitors + VTH AI)');
console.log('Do not mix with files from an older build.');
console.log('After upload, open https://vizagtaxihub.com/tracker.js — it must start with JS, not <!DOCTYPE html>.');
