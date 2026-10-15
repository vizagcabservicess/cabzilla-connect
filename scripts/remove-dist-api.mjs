/**
 * Vite copies public/api into dist after plugin hooks run.
 * That folder is a few local proxies, not the PHP backend.
 * Uploading it over the server /api directory replaces the live API.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const distApi = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist', 'api');
fs.rmSync(distApi, { recursive: true, force: true });
console.log('✅ Removed dist/api so the frontend upload cannot replace the PHP API');
