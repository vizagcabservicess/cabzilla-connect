import path from 'node:path';
import dotenv from 'dotenv';
import { z } from 'zod';

// Compiled to CommonJS (Hostinger). __dirname = dist/config
const packageRoot = path.resolve(__dirname, '../..');
const repoRoot = path.resolve(packageRoot, '..');

/**
 * Load order (later files do not override already-set vars unless we use override):
 * 1) visitor-analytics/.env — service-specific (PORT, S3, SITE_*)
 * 2) repo root /.env — same live credentials as public_html/.env (DB_*, JWT_SECRET)
 * 3) optional LIVE_ENV_PATH — e.g. /home/.../public_html/.env on the server
 */
dotenv.config({ path: path.join(packageRoot, '.env') });
dotenv.config({ path: path.join(repoRoot, '.env') });
if (process.env.LIVE_ENV_PATH) {
  dotenv.config({ path: process.env.LIVE_ENV_PATH });
}

// Live public_html .env uses DB_PASS; this service expects DB_PASSWORD
if (!process.env.DB_PASSWORD && process.env.DB_PASS) {
  process.env.DB_PASSWORD = process.env.DB_PASS;
}
// Prefer explicit DB_PASSWORD, but never leave password empty if DB_PASS exists
if (process.env.DB_PASS && !String(process.env.DB_PASSWORD || '').length) {
  process.env.DB_PASSWORD = process.env.DB_PASS;
}

// Hostinger env UI sometimes adds trailing spaces/newlines → Access denied
for (const key of ['DB_PASSWORD', 'DB_PASS', 'DB_USER', 'DB_NAME', 'DB_HOST'] as const) {
  const raw = process.env[key];
  if (typeof raw === 'string') {
    process.env[key] = raw.trim();
  }
}

/**
 * Hostinger's env editor often stores \# when the real password ends with #.
 * Strip that escape so MySQL gets the intended password (no DB password change needed).
 */
function unescapeHostingerPassword(pw: string): string {
  // "Hip4\#" → "Hip4#"  (and any other \# sequences Hostinger injected)
  return pw.replace(/\\#/g, '#');
}

if (process.env.DB_PASSWORD) {
  process.env.DB_PASSWORD = unescapeHostingerPassword(process.env.DB_PASSWORD);
}
if (process.env.DB_PASS) {
  process.env.DB_PASS = unescapeHostingerPassword(process.env.DB_PASS);
}
if (!process.env.DB_PASSWORD && process.env.DB_PASS) {
  process.env.DB_PASSWORD = process.env.DB_PASS;
}

// Reuse main app JWT for operator token exchange
if (!process.env.APP_JWT_SECRET && process.env.JWT_SECRET) {
  process.env.APP_JWT_SECRET = process.env.JWT_SECRET;
}

if (!process.env.IP_HASH_SALT && process.env.JWT_SECRET) {
  process.env.IP_HASH_SALT = `va-ip:${process.env.JWT_SECRET}`.slice(0, 64);
}

if (!process.env.GOOGLE_MAPS_API_KEY && process.env.VITE_GOOGLE_MAPS_API_KEY) {
  process.env.GOOGLE_MAPS_API_KEY = process.env.VITE_GOOGLE_MAPS_API_KEY;
}
if (!process.env.FARE_API_BASE) {
  process.env.FARE_API_BASE = 'https://vizagtaxihub.com';
}

// Hostinger MySQL often rejects 'user'@'::1'. Force IPv4 loopback when host is localhost.
if (
  process.env.DB_HOST === 'localhost' ||
  process.env.DB_HOST === '::1' ||
  process.env.DB_HOST === '[::1]'
) {
  process.env.DB_HOST = '127.0.0.1';
}

const envSchema = z.object({
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  CORS_ORIGINS: z.string().default(
    'http://localhost:8080,https://vizagtaxihub.com,https://www.vizagtaxihub.com,http://vizagup.com,https://vizagup.com,http://www.vizagup.com,https://www.vizagup.com,https://midnightblue-swan-433130.hostingersite.com',
  ),
  DB_HOST: z.string().default('127.0.0.1'),
  DB_PORT: z.coerce.number().default(3306),
  /** Hostinger Unix socket path (optional). When set, TCP host is ignored. */
  DB_SOCKET: z.string().optional().default(''),
  DB_USER: z.string().default('root'),
  DB_PASSWORD: z.string().default(''),
  DB_NAME: z.string().default('vizagtaxihub'),
  JWT_SECRET: z.string().min(16).default('dev-only-change-me-jwt-secret'),
  /** Same secret as main Vizag Taxi Hub PHP JWT (for /api/auth/exchange). */
  APP_JWT_SECRET: z.string().optional().default(''),
  JWT_EXPIRES_IN: z.string().default('7d'),
  SITE_PUBLIC_KEY: z.string().min(8).default('vth_pk_live_replace_me'),
  DEFAULT_SITE_ID: z.string().uuid().default('00000000-0000-4000-8000-000000000001'),
  S3_ENDPOINT: z.string().default('http://127.0.0.1:9000'),
  S3_REGION: z.string().default('ap-south-1'),
  S3_BUCKET: z.string().min(1).default('vizagtaxihub-analytics'),
  S3_ACCESS_KEY_ID: z.string().default('minioadmin'),
  S3_SECRET_ACCESS_KEY: z.string().default('minioadmin'),
  S3_FORCE_PATH_STYLE: z
    .string()
    .optional()
    .transform((v) => v === 'true'),
  S3_PUBLIC_BASE_URL: z.string().optional().default(''),
  OPENAI_API_KEY: z.string().optional().default(''),
  OPENAI_MODEL: z.string().default('gpt-4o-mini'),
  /** Google AI Studio / Gemini key — preferred when set (OpenAI-compatible endpoint). */
  GEMINI_API_KEY: z.string().optional().default(''),
  GEMINI_MODEL: z.string().default('gemini-flash-latest'),
  OPENAI_BASE_URL: z.string().optional().default(''),
  /** Booking fare APIs host (same as website). */
  FARE_API_BASE: z.string().default('https://vizagtaxihub.com'),
  /** Browser Maps key (often referrer-restricted — may not work server-side). */
  GOOGLE_MAPS_API_KEY: z.string().optional().default(''),
  /** Server Distance Matrix / Geocoding key (IP-restricted, no HTTP referrer). */
  GOOGLE_MAPS_SERVER_KEY: z.string().optional().default(''),
  DEFAULT_RETENTION_DAYS: z.coerce.number().default(7),
  IP_HASH_SALT: z.string().min(8).default('dev-only-ip-hash-salt'),
  MAX_EVENT_BATCH: z.coerce.number().default(100),
  /** Full SPA HTML snapshots are often >1MB gzipped; keep headroom. */
  MAX_RECORDING_CHUNK_BYTES: z.coerce.number().default(8_388_608),
  /** Drop oldest session replays when va_recording_chunks exceeds this (Hostinger 3GB cap). */
  RECORDING_DB_MAX_BYTES: z.coerce.number().default(1_073_741_824),
  LIVE_ENV_PATH: z.string().optional().default(''),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment configuration:', parsed.error.flatten().fieldErrors);
  console.error('Using safe defaults — set DB_*/JWT_* in Hostinger Environment Variables.');
}

export const env = parsed.success
  ? parsed.data
  : ({
      PORT: Number(process.env.PORT) || 3000,
      NODE_ENV: 'production',
      CORS_ORIGINS: process.env.CORS_ORIGINS || '*',
      DB_HOST: process.env.DB_HOST || '127.0.0.1',
      DB_PORT: Number(process.env.DB_PORT) || 3306,
      DB_SOCKET: process.env.DB_SOCKET || '',
      DB_USER: process.env.DB_USER || 'root',
      DB_PASSWORD: process.env.DB_PASSWORD || process.env.DB_PASS || '',
      DB_NAME: process.env.DB_NAME || 'vizagtaxihub',
      JWT_SECRET: process.env.JWT_SECRET || 'dev-only-change-me-jwt-secret-min16',
      APP_JWT_SECRET: process.env.APP_JWT_SECRET || process.env.JWT_SECRET || '',
      JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
      SITE_PUBLIC_KEY: process.env.SITE_PUBLIC_KEY || 'vth_pk_live_replace_me',
      DEFAULT_SITE_ID: process.env.DEFAULT_SITE_ID || '00000000-0000-4000-8000-000000000001',
      S3_ENDPOINT: process.env.S3_ENDPOINT || 'http://127.0.0.1:9000',
      S3_REGION: process.env.S3_REGION || 'ap-south-1',
      S3_BUCKET: process.env.S3_BUCKET || 'vizag-taxi-hub-storage',
      S3_ACCESS_KEY_ID: process.env.S3_ACCESS_KEY_ID || 'minioadmin',
      S3_SECRET_ACCESS_KEY: process.env.S3_SECRET_ACCESS_KEY || 'minioadmin',
      S3_FORCE_PATH_STYLE: process.env.S3_FORCE_PATH_STYLE === 'true',
      S3_PUBLIC_BASE_URL: process.env.S3_PUBLIC_BASE_URL || '',
      OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
      OPENAI_MODEL: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
      GEMINI_MODEL: process.env.GEMINI_MODEL || 'gemini-flash-latest',
      OPENAI_BASE_URL: process.env.OPENAI_BASE_URL || '',
      FARE_API_BASE: process.env.FARE_API_BASE || 'https://vizagtaxihub.com',
      GOOGLE_MAPS_API_KEY:
        process.env.GOOGLE_MAPS_API_KEY || process.env.VITE_GOOGLE_MAPS_API_KEY || '',
      GOOGLE_MAPS_SERVER_KEY: process.env.GOOGLE_MAPS_SERVER_KEY || '',
      DEFAULT_RETENTION_DAYS: Number(process.env.DEFAULT_RETENTION_DAYS) || 7,
      IP_HASH_SALT: process.env.IP_HASH_SALT || 'dev-only-ip-hash-salt-min8',
      MAX_EVENT_BATCH: Number(process.env.MAX_EVENT_BATCH) || 100,
      MAX_RECORDING_CHUNK_BYTES: Number(process.env.MAX_RECORDING_CHUNK_BYTES) || 8_388_608,
      RECORDING_DB_MAX_BYTES: Number(process.env.RECORDING_DB_MAX_BYTES) || 1_073_741_824,
      LIVE_ENV_PATH: process.env.LIVE_ENV_PATH || '',
    } as z.infer<typeof envSchema>);

// Final guard: never connect via IPv6 loopback on Hostinger
if (env.DB_HOST === 'localhost' || env.DB_HOST === '::1' || env.DB_HOST === '[::1]') {
  (env as { DB_HOST: string }).DB_HOST = '127.0.0.1';
}
export const corsOrigins = env.CORS_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean);

function passwordDebug(pw: string): string {
  const codes = [...pw].map((ch) => ch.charCodeAt(0)).join(',');
  const first = pw.charCodeAt(0);
  const last = pw.charCodeAt(pw.length - 1);
  return `len=${pw.length} first=${first} last=${last} codes=[${codes}]`;
}

console.log(
  `[visitor-analytics] DB ${env.DB_USER}@${env.DB_SOCKET || env.DB_HOST}/${env.DB_NAME} listen=${process.env.PORT || env.PORT} password=${env.DB_PASSWORD ? `set(${env.DB_PASSWORD.length}c)` : 'MISSING'}`,
);
if (env.DB_PASSWORD) {
  // Safe: char codes only — never prints the password text
  console.log(`[visitor-analytics] password debug ${passwordDebug(env.DB_PASSWORD)}`);
}
