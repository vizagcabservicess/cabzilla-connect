import jwt from 'jsonwebtoken';
import type { NextFunction, Request, Response } from 'express';
import { env } from '../config/env.js';
import { queryOne } from '../db/pool.js';
import type { JwtOperatorPayload } from '../types/index.js';

export interface AuthedRequest extends Request {
  operator?: JwtOperatorPayload;
  siteId?: string;
}

export function signOperatorToken(payload: JwtOperatorPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  });
}

export function verifyToken(token: string): JwtOperatorPayload {
  return jwt.verify(token, env.JWT_SECRET) as JwtOperatorPayload;
}

export function requireOperator(req: AuthedRequest, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  try {
    const payload = verifyToken(header.slice(7));
    if (payload.role !== 'admin' && payload.role !== 'super_admin' && payload.role !== 'operator') {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    req.operator = payload;
    req.siteId = payload.siteId || env.DEFAULT_SITE_ID;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

export function asyncHandler(
  fn: (req: AuthedRequest, res: Response, next: NextFunction) => Promise<void>,
) {
  return (req: AuthedRequest, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}

export const requireSiteKey = asyncHandler(async (req: AuthedRequest, res: Response, next: NextFunction) => {
  const key =
    (req.headers['x-site-key'] as string | undefined) ||
    (req.body?.siteKey as string | undefined) ||
    (req.query.siteKey as string | undefined);

  if (!key) {
    res.status(401).json({ error: 'Missing site key' });
    return;
  }

  let site: { id: string; public_key: string } | null;
  try {
    site = await queryOne<{ id: string; public_key: string }>(
      'SELECT id, public_key FROM va_sites WHERE public_key = :key LIMIT 1',
      { key },
    );
  } catch (err) {
    console.error('[auth] site key lookup failed (is MySQL up?):', err instanceof Error ? err.message : err);
    res.status(503).json({ error: 'Analytics database unavailable' });
    return;
  }

  if (!site) {
    res.status(401).json({ error: 'Invalid site key' });
    return;
  }

  req.siteId = site.id;
  next();
});
