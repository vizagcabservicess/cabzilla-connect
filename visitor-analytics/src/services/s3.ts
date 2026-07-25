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

export function useLocalStore(): boolean {
  const ep = (env.S3_ENDPOINT || '').toLowerCase();
  return (
    process.env.VA_LOCAL_OBJECT_STORE === '1' ||
    ep.includes('127.0.0.1') ||
    ep.includes('localhost')
  );
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
  if (useLocalStore()) {
    const file = await localPathForWrite(key);
    const buf = typeof body === 'string' ? Buffer.from(body) : Buffer.from(body);
    await fs.writeFile(file, buf);
    return;
  }

  await s3.send(
    new PutObjectCommand({
      Bucket: env.S3_BUCKET,
      Key: key,
      Body: body,
      ContentType: _contentType,
      ContentEncoding: _contentEncoding,
    }),
  );
}

export async function getObjectBuffer(key: string): Promise<Buffer> {
  if (useLocalStore()) {
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
  if (useLocalStore()) {
    const file = resolveLocalPath(key);
    await fs.unlink(file).catch(() => undefined);
    return;
  }
  await s3.send(new DeleteObjectCommand({ Bucket: env.S3_BUCKET, Key: key }));
}

export async function deleteObjects(keys: string[]): Promise<void> {
  if (keys.length === 0) return;
  if (useLocalStore()) {
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
  if (useLocalStore()) {
    return `local://${key}`;
  }
  return getSignedUrl(
    s3,
    new GetObjectCommand({ Bucket: env.S3_BUCKET, Key: key }),
    { expiresIn },
  );
}

export async function presignPut(key: string, contentType: string, expiresIn = 900): Promise<string> {
  if (useLocalStore()) {
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
