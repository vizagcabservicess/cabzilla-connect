import { createHash, timingSafeEqual } from 'node:crypto';
import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { env } from '../config/env.js';
import { queryOne } from '../db/pool.js';
import {
  asyncHandler,
  requireOperator,
  signOperatorToken,
  verifyToken,
  type AuthedRequest,
} from '../middleware/auth.js';
import { findOrCreateOperator, setOperatorStatus } from '../services/chat.js';
import type { JwtOperatorPayload } from '../types/index.js';

const router = Router();

function safeEqualHex(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

/**
 * Verifies passwords stored as:
 * - sha256(plain)
 * - sha256(JWT_SECRET:plain)
 * - PHP/bcrypt hashes ($2y$/$2a$/$2b$) when the optional `bcryptjs` package is available
 */
async function verifyPassword(plain: string, stored: string | null | undefined): Promise<boolean> {
  if (!stored) return false;

  if (stored.startsWith('$2y$') || stored.startsWith('$2a$') || stored.startsWith('$2b$')) {
    return verifyBcrypt(plain, stored);
  }

  const sha = createHash('sha256').update(plain).digest('hex');
  if (safeEqualHex(stored, sha)) return true;

  const hmac = createHash('sha256').update(`${env.JWT_SECRET}:${plain}`).digest('hex');
  return safeEqualHex(stored, hmac);
}

async function verifyBcrypt(plain: string, stored: string): Promise<boolean> {
  try {
    const req = Function('return require')() as NodeRequire;
    const bcrypt = req('bcryptjs') as { compare: (p: string, h: string) => Promise<boolean> };
    const normalized = stored.startsWith('$2y$') ? `$2a$${stored.slice(4)}` : stored;
    return bcrypt.compare(plain, normalized);
  } catch {
    console.warn('[auth] bcryptjs not installed; cannot verify bcrypt password hashes');
    return false;
  }
}

function mapRole(role: string | null | undefined): JwtOperatorPayload['role'] {
  if (role === 'admin' || role === 'super_admin' || role === 'operator') return role;
  return 'operator';
}

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(4),
  siteId: z.string().uuid().optional(),
});

router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const body = loginSchema.parse(req.body);
    const siteId = body.siteId || env.DEFAULT_SITE_ID;

    const user = await queryOne<{
      id: number;
      email: string;
      name: string;
      password: string;
      role: string;
    }>(`SELECT id, email, name, password, role FROM users WHERE email = :email LIMIT 1`, {
      email: body.email,
    }).catch(() => null);

    let passwordOk = false;
    let name = body.email.split('@')[0] || 'Operator';
    let role: JwtOperatorPayload['role'] = 'operator';
    let userId: number | null = null;

    if (user) {
      passwordOk = await verifyPassword(body.password, user.password);
      name = user.name || name;
      userId = user.id;
      role = mapRole(user.role);
    } else {
      const op = await queryOne<{ id: string; name: string }>(
        `SELECT id, name FROM va_chat_operators WHERE site_id = :siteId AND email = :email LIMIT 1`,
        { siteId, email: body.email },
      );
      if (!op) {
        res.status(401).json({ error: 'Invalid credentials' });
        return;
      }

      // Bootstrap password for operators without a users row:
      // first 16 hex chars of sha256(JWT_SECRET:operator:email)
      const bootstrapHash = createHash('sha256')
        .update(`${env.JWT_SECRET}:operator:${body.email}`)
        .digest('hex')
        .slice(0, 16);

      passwordOk =
        body.password === bootstrapHash ||
        (env.NODE_ENV !== 'production' && body.password === 'operator');
      name = op.name;
    }

    if (!passwordOk) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const operator = await findOrCreateOperator({
      siteId,
      email: body.email,
      name,
      userId,
    });

    if (!operator) {
      res.status(500).json({ error: 'Failed to provision operator' });
      return;
    }

    const payload: JwtOperatorPayload = {
      sub: String(userId || operator.id),
      email: body.email,
      name,
      role,
      siteId,
      operatorId: operator.id,
    };

    const token = signOperatorToken(payload);
    await setOperatorStatus(operator.id, 'online');

    res.json({
      token,
      expiresIn: env.JWT_EXPIRES_IN,
      operator: {
        id: operator.id,
        email: body.email,
        name,
        role,
        siteId,
        status: 'online',
      },
    });
  }),
);

const exchangeSchema = z.object({
  token: z.string().min(10),
  siteId: z.string().uuid().optional(),
});

interface LooseClaims {
  sub?: string | number;
  id?: string | number;
  user_id?: string | number;
  email?: string;
  name?: string | null;
  role?: string;
  siteId?: string;
  exp?: number;
}

/**
 * Accept VA-issued JWTs, main-app JWTs (APP_JWT_SECRET), or a main-app token
 * whose claims match an admin/super_admin row in `users`.
 */
async function resolveIncomingAdmin(token: string): Promise<JwtOperatorPayload> {
  try {
    const verified = verifyToken(token);
    return normalizeClaims(verified as unknown as LooseClaims);
  } catch {
    // continue
  }

  if (env.APP_JWT_SECRET) {
    try {
      const verified = jwt.verify(token, env.APP_JWT_SECRET) as LooseClaims;
      return normalizeClaims(verified);
    } catch {
      // continue
    }
  }

  const decoded = jwt.decode(token) as LooseClaims | null;
  if (!decoded || typeof decoded !== 'object') {
    throw new Error('Invalid token');
  }
  if (decoded.exp && decoded.exp * 1000 < Date.now()) {
    throw new Error('Token expired');
  }

  const email = decoded.email;
  const id = decoded.sub ?? decoded.id ?? decoded.user_id;
  if (!email && id == null) {
    throw new Error('Token missing identity claims');
  }

  const user = await queryOne<{
    id: number;
    email: string;
    name: string;
    role: string;
  }>(
    email
      ? `SELECT id, email, name, role FROM users WHERE email = :email LIMIT 1`
      : `SELECT id, email, name, role FROM users WHERE id = :id LIMIT 1`,
    email ? { email } : { id: Number(id) },
  ).catch(() => null);

  if (user && (user.role === 'admin' || user.role === 'super_admin')) {
    return {
      sub: String(user.id),
      email: user.email,
      name: user.name || user.email,
      role: mapRole(user.role),
      siteId: env.DEFAULT_SITE_ID,
    };
  }

  // Local/dev: main app JWT may be issued by remote PHP while analytics uses local MySQL.
  // Accept decoded admin-looking tokens and provision a chat operator.
  if (env.NODE_ENV !== 'production') {
    const role = mapRole(decoded.role || 'admin');
    if (role === 'admin' || role === 'super_admin' || role === 'operator') {
      return {
        sub: String(id ?? email),
        email: email || `admin@localhost`,
        name: decoded.name || (email ? email.split('@')[0]! : 'Admin'),
        role: role === 'operator' ? 'admin' : role,
        siteId: env.DEFAULT_SITE_ID,
      };
    }
  }

  throw new Error('Admin user required');
}

function normalizeClaims(claims: LooseClaims): JwtOperatorPayload {
  const sub = String(claims.sub ?? claims.id ?? claims.user_id ?? '');
  const email = (claims.email || '').trim();
  if (!sub || !email) {
    throw new Error('Token missing identity claims');
  }
  const rawName = claims.name != null ? String(claims.name).trim() : '';
  return {
    sub,
    email,
    name: rawName || email.split('@')[0] || 'Operator',
    role: mapRole(claims.role),
    siteId: claims.siteId || env.DEFAULT_SITE_ID,
  };
}

router.post(
  '/exchange',
  asyncHandler(async (req, res) => {
    const body = exchangeSchema.parse(req.body);

    let incoming: JwtOperatorPayload;
    try {
      incoming = await resolveIncomingAdmin(body.token);
    } catch {
      res.status(401).json({
        error:
          'Invalid admin token. Set APP_JWT_SECRET to your main app JWT secret, or log in again.',
      });
      return;
    }

    const siteId = body.siteId || incoming.siteId || env.DEFAULT_SITE_ID;
    const operator = await findOrCreateOperator({
      siteId,
      email: incoming.email,
      name: incoming.name,
      userId: Number.isFinite(Number(incoming.sub)) ? Number(incoming.sub) : null,
    });

    if (!operator) {
      res.status(500).json({ error: 'Failed to provision operator' });
      return;
    }

    const payload: JwtOperatorPayload = {
      sub: incoming.sub,
      email: incoming.email,
      name: incoming.name,
      role: mapRole(incoming.role),
      siteId,
      operatorId: operator.id,
    };

    const token = signOperatorToken(payload);
    res.json({
      token,
      expiresIn: env.JWT_EXPIRES_IN,
      operator: {
        id: operator.id,
        email: incoming.email,
        name: incoming.name,
        role: payload.role,
        siteId,
      },
    });
  }),
);

router.get(
  '/me',
  requireOperator,
  asyncHandler(async (req: AuthedRequest, res) => {
    const op = req.operator!;
    const row = op.operatorId
      ? await queryOne(`SELECT * FROM va_chat_operators WHERE id = :id`, { id: op.operatorId })
      : await queryOne(`SELECT * FROM va_chat_operators WHERE site_id = :siteId AND email = :email`, {
          siteId: op.siteId,
          email: op.email,
        });
    res.json({ operator: op, profile: row });
  }),
);

router.post(
  '/logout',
  requireOperator,
  asyncHandler(async (req: AuthedRequest, res) => {
    if (req.operator?.operatorId) {
      await setOperatorStatus(req.operator.operatorId, 'offline');
    }
    res.json({ ok: true });
  }),
);

export default router;
