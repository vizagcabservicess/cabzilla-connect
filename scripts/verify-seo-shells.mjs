/**
 * Verify dist/seo shells cover every sitemap URL with unique title/description/canonical/H1.
 * Usage: node scripts/verify-seo-shells.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const sitemapPath = fs.existsSync(path.join(dist, 'sitemap.xml'))
  ? path.join(dist, 'sitemap.xml')
  : path.join(root, 'public', 'sitemap.xml');

function fail(msg) {
  console.error(`❌ ${msg}`);
  process.exit(1);
}

function normalizePath(raw) {
  let p = (raw || '/').split('#')[0].split('?')[0].trim();
  if (!p.startsWith('/')) p = `/${p}`;
  if (p.length > 1) p = p.replace(/\/+$/, '');
  return p || '/';
}

function shellFileFor(routePath) {
  if (routePath === '/') return path.join(dist, 'index.html');
  return path.join(dist, 'seo', `${routePath.replace(/^\//, '')}.html`);
}

if (!fs.existsSync(dist)) fail('dist/ missing — run npm run build first');
if (!fs.existsSync(sitemapPath)) fail('sitemap.xml missing');

const xml = fs.readFileSync(sitemapPath, 'utf8');
const locs = [...xml.matchAll(/<loc>\s*https?:\/\/(?:www\.)?vizagtaxihub\.com([^<\s]*)\s*<\/loc>/gi)].map((m) =>
  normalizePath(m[1] || '/'),
);

const titles = new Map();
const descriptions = new Map();
let missingCanonical = 0;
let missingH1 = 0;
const problems = [];

for (const routePath of locs) {
  const file = shellFileFor(routePath);
  if (!fs.existsSync(file)) {
    problems.push(`missing shell: ${routePath}`);
    continue;
  }
  const html = fs.readFileSync(file, 'utf8');
  const title = (html.match(/<title>([^<]*)<\/title>/i) || [])[1]?.trim() || '';
  const description = (html.match(/<meta\s+name="description"\s+content="([^"]*)"/i) || [])[1]?.trim() || '';
  const canonical = (html.match(/<link\s+rel="canonical"\s+href="([^"]*)"/i) || [])[1]?.trim() || '';
  const h1 = (html.match(/<h1>([^<]*)<\/h1>/i) || [])[1]?.trim() || '';

  if (!title) problems.push(`no title: ${routePath}`);
  if (!description) problems.push(`no description: ${routePath}`);
  if (!canonical) {
    missingCanonical += 1;
    problems.push(`no canonical: ${routePath}`);
  }
  if (!h1) {
    missingH1 += 1;
    problems.push(`no h1: ${routePath}`);
  }

  const expectedCanonical =
    routePath === '/' ? 'https://vizagtaxihub.com/' : `https://vizagtaxihub.com${routePath}`;
  if (canonical && canonical !== expectedCanonical) {
    problems.push(`canonical mismatch: ${routePath} => ${canonical}`);
  }

  if (title) {
    if (titles.has(title)) titles.get(title).push(routePath);
    else titles.set(title, [routePath]);
  }
  if (description) {
    if (descriptions.has(description)) descriptions.get(description).push(routePath);
    else descriptions.set(description, [routePath]);
  }
}

const dupTitles = [...titles.entries()].filter(([, paths]) => paths.length > 1);
const dupDescriptions = [...descriptions.entries()].filter(([, paths]) => paths.length > 1);

console.log(`sitemap_urls=${locs.length}`);
console.log(`unique_titles=${titles.size}`);
console.log(`unique_descriptions=${descriptions.size}`);
console.log(`missing_canonicals=${missingCanonical}`);
console.log(`missing_h1=${missingH1}`);
console.log(`duplicate_title_groups=${dupTitles.length}`);
console.log(`duplicate_description_groups=${dupDescriptions.length}`);

if (dupTitles.length) {
  console.log('\nDuplicate titles:');
  for (const [title, paths] of dupTitles.slice(0, 20)) {
    console.log(`  ${title}`);
    console.log(`    ${paths.join(', ')}`);
  }
}

if (problems.length) {
  console.log('\nProblems:');
  for (const p of problems.slice(0, 40)) console.log(`  ${p}`);
  if (problems.length > 40) console.log(`  … ${problems.length - 40} more`);
}

if (
  problems.length ||
  titles.size !== locs.length ||
  descriptions.size !== locs.length ||
  missingCanonical !== 0 ||
  missingH1 !== 0
) {
  fail('SEO shell verification failed');
}

console.log('✅ All sitemap URLs have unique title, unique description, canonical, and H1');
