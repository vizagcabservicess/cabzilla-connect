/// <reference types="node" />
import { EventEmitter } from 'node:events';
import { setDefaultResultOrder } from 'node:dns';
import mysql from 'mysql2/promise';
import { env } from '../config/env.js';

/** Prefer IPv4 so Hostinger Remote MySQL is less likely to see an IPv6 client host. */
setDefaultResultOrder('ipv4first');

/**
 * Hostinger Node Web Apps are isolated from shared MySQL.
 * Use Remote MySQL hostname (auth-dbXXX.hstgr.io) + allow Any Host (%) and/or the app IP from logs.
 */
const poolOptions: mysql.PoolOptions = {
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 20,
  queueLimit: 40,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10_000,
  namedPlaceholders: true,
  timezone: 'Z',
  dateStrings: false,
  connectTimeout: 12_000,
};

if (env.DB_SOCKET) {
  poolOptions.socketPath = env.DB_SOCKET;
} else {
  poolOptions.host = env.DB_HOST;
  poolOptions.port = env.DB_PORT;
}

export const pool = mysql.createPool(poolOptions);

(pool as EventEmitter).on('error', (err: Error) => {
  console.error('[visitor-analytics] MySQL pool error:', err.message);
});

export async function query<T = unknown>(sql: string, params?: Record<string, unknown> | unknown[]): Promise<T> {
  if (Array.isArray(params)) {
    const [rows] = await pool.query({
      sql,
      values: params,
      namedPlaceholders: false,
    });
    return rows as T;
  }
  const [rows] = await pool.query(sql, params as never);
  return rows as T;
}

export async function queryOne<T = unknown>(sql: string, params?: Record<string, unknown> | unknown[]): Promise<T | null> {
  const rows = await query<T[]>(sql, params);
  return rows[0] ?? null;
}

export async function withTransaction<T>(fn: (conn: mysql.PoolConnection) => Promise<T>): Promise<T> {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const result = await fn(conn);
    await conn.commit();
    return result;
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}
