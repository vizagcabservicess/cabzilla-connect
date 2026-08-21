import fs from 'node:fs/promises';
import path from 'node:path';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from '../config/env.js';

const localRoot = path.resolve(process.cwd(), '.data', 'object-store');
const localRecordingsRoot = path.join(localRoot, 'recordings');

function isLoopbackS3Endpoint(endpoint: string): boolean {
  const ep = endpoint.toLowerCase();
  return (
    !ep ||
    ep.includes('127.0.0.1') ||
    ep.includes('localhost') ||
    ep.includes('0.0.0.0')
  );
}

/** On-disk chunk files only when explicitly enabled. Production Hostinger must not set this. */
export function useLocalStore(): boolean {
  return process.env.VA_LOCAL_OBJECT_STORE === '1';
}

/** Real remote bucket (AWS / R2 / Spaces). False for MinIO-on-localhost defaults. */
export function hasRemoteObjectStore(): boolean {
  if (useLocalStore()) return false;
  if (isLoopbackS3Endpoint(env.S3_ENDPOINT)) return false;
  const key = (env.S3_ACCESS_KEY_ID || '').trim();
  if (!key || key === 'minioadmin') return false;
  return true;
}

export function objectStoreMode(): 'local' | 's3' | 'db' {
  if (useLocalStore()) return 'local';
  if (hasRemoteObjectStore()) return 's3';
  return 'db';
}

/** Session-replay gzip blobs in MySQL. Default on when there is no real S3 bucket. */
export function persistRecordingBlobsInMysql(): boolean {
  if (process.env.VA_RECORDING_IN_DB === '0') return false;
  if (hasRemoteObjectStore()) return process.env.VA_RECORDING_IN_DB === '1';
  return true;
}

async function walkFiles(dir: string): Promise<string[]> {
  const out: string[] = [];
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...(await walkFiles(full)));
    } else {
      out.push(full);
    }
  }
  return out;
}

async function removeEmptyDirs(dir: string): Promise<number> {
  let removed = 0;
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return 0;
  }
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    removed += await removeEmptyDirs(path.join(dir, entry.name));
  }
  const leftover = await fs.readdir(dir).catch(() => ['x']);
  if (leftover.length === 0 && dir !== localRoot) {
    await fs.rmdir(dir).catch(() => undefined);
    removed += 1;
  }
  return removed;
}

/**
 * Delete leftover Hostinger/local recording chunk files. Replay still uses MySQL payload_gzip.
 * Pass olderThanDays=0 to remove every local recording file.
 */
export async function pruneLocalRecordingFiles(opts?: {
  olderThanDays?: number;
}): Promise<{ deletedFiles: number; deletedDirs: number }> {
  const olderThanDays = opts?.olderThanDays ?? 0;
  const cutoff = Date.now() - olderThanDays * 24 * 60 * 60 * 1000;
  const files = await walkFiles(localRecordingsRoot);
  let deletedFiles = 0;
  for (const file of files) {
    if (olderThanDays > 0) {
      const stat = await fs.stat(file).catch(() => null);
      if (!stat || stat.mtimeMs > cutoff) continue;
    }
    await fs.unlink(file).catch(() => undefined);
    deletedFiles += 1;
  }
  const deletedDirs = await removeEmptyDirs(localRecordingsRoot);
  return { deletedFiles, deletedDirs };
}

function resolveLocalPath(key: string): string {
  return path.join(localRoot, key.replace(/\\/g, '/'));
}

async function localPathForWrite(key: string): Promise<string> {
  const full = resolveLocalPath(key);
  await fs.mkdir(path.dirname(full), { recursive: true });
  return full;
}

function notFoundError(key: string): Error & { status: number; code: string } {
  const err = new Error(`Recording object not found: ${key}`) as Error & {
    status: number;
    code: string;
  };
  err.status = 404;
  err.code = 'ENOENT';
  return err;
}

export const s3 = new S3Client({
  region: env.S3_REGION,
  endpoint: env.S3_ENDPOINT,
  forcePathStyle: env.S3_FORCE_PATH_STYLE,
  credentials: {
    accessKeyId: env.S3_ACCESS_KEY_ID,
    secretAccessKey: env.S3_SECRET_ACCESS_KEY,
  },
});

export async function putObject(
  key: string,
  body: Buffer | Uint8Array | string,
  _contentType: string,
  _contentEncoding?: string,
): Promise<void> {
  const mode = objectStoreMode();
  switch (mode) {
    case 'db':
      return;
    case 'local': {
      const file = await localPathForWrite(key);
      const buf = typeof body === 'string' ? Buffer.from(body) : Buffer.from(body);
      await fs.writeFile(file, buf);
      return;
    }
    case 's3':
      await s3.send(
        new PutObjectCommand({
          Bucket: env.S3_BUCKET,
          Key: key,
          Body: body,
          ContentType: _contentType,
          ContentEncoding: _contentEncoding,
        }),
      );
      return;
    default: {
      const _never: never = mode;
      return _never;
    }
  }
}

export async function getObjectBuffer(key: string): Promise<Buffer> {
  const mode = objectStoreMode();
  if (mode === 'db') {
    throw notFoundError(key);
  }
  if (mode === 'local') {
    const file = resolveLocalPath(key);
    try {
      return await fs.readFile(file);
    } catch (err) {
      const code = (err as NodeJS.ErrnoException)?.code;
      if (code === 'ENOENT') throw notFoundError(key);
      throw err;
    }
  }

  try {
    const res = await s3.send(
      new GetObjectCommand({
        Bucket: env.S3_BUCKET,
        Key: key,
      }),
    );
    const bytes = await res.Body?.transformToByteArray();
    if (!bytes) throw notFoundError(key);
    return Buffer.from(bytes);
  } catch (err) {
    const name = (err as { name?: string })?.name;
    const httpStatus = (err as { $metadata?: { httpStatusCode?: number } })?.$metadata
      ?.httpStatusCode;
    if (name === 'NoSuchKey' || name === 'NotFound' || httpStatus === 404) {
      throw notFoundError(key);
    }
    throw err;
  }
}

export async function deleteObject(key: string): Promise<void> {
  const mode = objectStoreMode();
  if (mode === 'db') return;
  if (mode === 'local') {
    const file = resolveLocalPath(key);
    await fs.unlink(file).catch(() => undefined);
    return;
  }
  await s3.send(new DeleteObjectCommand({ Bucket: env.S3_BUCKET, Key: key }));
}

export async function deleteObjects(keys: string[]): Promise<void> {
  if (keys.length === 0) return;
  const mode = objectStoreMode();
  if (mode === 'db') return;
  if (mode === 'local') {
    await Promise.all(keys.map((k) => deleteObject(k)));
    return;
  }
  await s3.send(
    new DeleteObjectsCommand({
      Bucket: env.S3_BUCKET,
      Delete: { Objects: keys.map((Key) => ({ Key })) },
    }),
  );
}

export async function presignGet(key: string, expiresIn = 3600): Promise<string> {
  if (objectStoreMode() !== 's3') {
    return `local://${key}`;
  }
  return getSignedUrl(
    s3,
    new GetObjectCommand({ Bucket: env.S3_BUCKET, Key: key }),
    { expiresIn },
  );
}

export async function presignPut(key: string, contentType: string, expiresIn = 900): Promise<string> {
  if (objectStoreMode() !== 's3') {
    return `local://${key}`;
  }
  return getSignedUrl(
    s3,
    new PutObjectCommand({
      Bucket: env.S3_BUCKET,
      Key: key,
      ContentType: contentType,
    }),
    { expiresIn },
  );
}

export function publicOrSignedHint(key: string): string {
  if (env.S3_PUBLIC_BASE_URL) {
    return `${env.S3_PUBLIC_BASE_URL.replace(/\/$/, '')}/${key}`;
  }
  return key;
}
