import type { IncomingMessage } from 'node:http';
import { WebSocket, WebSocketServer } from 'ws';
import { verifyToken } from '../middleware/auth.js';
import { queryOne } from '../db/pool.js';
import { env } from '../config/env.js';
import type { WsClientRole, WsEnvelope } from '../types/index.js';

export interface HubClientMeta {
  role: WsClientRole;
  siteId: string;
  visitorId?: string;
  operatorId?: string;
  conversationId?: string;
  sessionId?: string;
}

interface HubClient {
  socket: WebSocket;
  meta: HubClientMeta;
  connectedAt: number;
}

function safeSend(socket: WebSocket, data: unknown): void {
  if (socket.readyState !== WebSocket.OPEN) return;
  try {
    socket.send(JSON.stringify(data));
  } catch {
    // ignore broken sockets
  }
}

async function resolveSiteId(siteIdOrKey: string): Promise<string | null> {
  if (!siteIdOrKey) return null;
  // Already a UUID?
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(siteIdOrKey)) {
    return siteIdOrKey;
  }
  try {
    const site = await queryOne<{ id: string }>(
      'SELECT id FROM va_sites WHERE public_key = :key LIMIT 1',
      { key: siteIdOrKey },
    );
    return site?.id || null;
  } catch {
    return null;
  }
}

class RealtimeHub {
  private wss: WebSocketServer | null = null;
  private clients = new Set<HubClient>();
  private byVisitor = new Map<string, Set<HubClient>>();
  private byConversation = new Map<string, Set<HubClient>>();
  private byOperator = new Map<string, Set<HubClient>>();
  private bySiteDashboard = new Map<string, Set<HubClient>>();
  private bySiteOperators = new Map<string, Set<HubClient>>();

  attach(server: import('node:http').Server): WebSocketServer {
    this.wss = new WebSocketServer({ noServer: true });

    server.on('upgrade', (req, socket, head) => {
      const url = new URL(req.url || '/', 'http://localhost');
      if (!url.pathname.startsWith('/ws')) {
        socket.destroy();
        return;
      }

      this.wss!.handleUpgrade(req, socket, head, (ws) => {
        this.wss!.emit('connection', ws, req);
      });
    });

    this.wss.on('connection', (ws, req) => {
      this.handleConnection(ws, req).catch(() => {
        try {
          ws.close(1008, 'Unauthorized');
        } catch {
          // ignore
        }
      });
    });

    return this.wss;
  }

  private async handleConnection(ws: WebSocket, req: IncomingMessage): Promise<void> {
    const url = new URL(req.url || '/', 'http://localhost');
    const role = (url.searchParams.get('role') || '') as WsClientRole;
    const siteParam =
      url.searchParams.get('siteId') ||
      url.searchParams.get('siteKey') ||
      '';
    const visitorId = url.searchParams.get('visitorId') || undefined;
    const conversationId = url.searchParams.get('conversationId') || undefined;
    const sessionId = url.searchParams.get('sessionId') || undefined;
    const token = url.searchParams.get('token') || undefined;

    if (role !== 'visitor' && role !== 'operator' && role !== 'dashboard') {
      ws.close(1008, 'Invalid role');
      return;
    }

    const siteId = (await resolveSiteId(siteParam)) || (siteParam ? null : env.DEFAULT_SITE_ID);
    if (!siteId) {
      ws.close(1008, 'Invalid siteId or siteKey');
      return;
    }

    let operatorId: string | undefined;
    if (role === 'operator' || role === 'dashboard') {
      if (!token) {
        ws.close(1008, 'Missing token');
        return;
      }
      try {
        const payload = verifyToken(token);
        if (payload.siteId && payload.siteId !== siteId) {
          ws.close(1008, 'Site mismatch');
          return;
        }
        operatorId = payload.operatorId || payload.sub;
      } catch {
        ws.close(1008, 'Invalid token');
        return;
      }
    }

    if (role === 'visitor' && !visitorId) {
      ws.close(1008, 'Missing visitorId');
      return;
    }

    const client = this.registerClient(ws, {
      role,
      siteId,
      visitorId,
      operatorId,
      conversationId,
      sessionId,
    });

    safeSend(ws, {
      type: 'connected',
      payload: {
        role,
        siteId,
        visitorId,
        operatorId,
        conversationId,
        serverTime: new Date().toISOString(),
      },
    } satisfies WsEnvelope);

    ws.on('message', (raw) => {
      this.onMessage(client, raw).catch(() => {
        safeSend(ws, { type: 'error', payload: { message: 'Bad message' } });
      });
    });

    ws.on('close', () => this.unregisterClient(client));
    ws.on('error', () => this.unregisterClient(client));

    // Heartbeat
    const interval = setInterval(() => {
      if (ws.readyState !== WebSocket.OPEN) {
        clearInterval(interval);
        return;
      }
      try {
        ws.ping();
      } catch {
        clearInterval(interval);
      }
    }, 30_000);

    ws.on('close', () => clearInterval(interval));
  }

  private async onMessage(client: HubClient, raw: Buffer | ArrayBuffer | Buffer[]): Promise<void> {
    let parsed: WsEnvelope;
    try {
      parsed = JSON.parse(String(raw)) as WsEnvelope;
    } catch {
      return;
    }

    switch (parsed.type) {
      case 'ping':
        safeSend(client.socket, { type: 'pong', payload: { t: Date.now() }, requestId: parsed.requestId });
        break;
      case 'subscribe.conversation': {
        const conversationId =
          typeof (parsed.payload as { conversationId?: string })?.conversationId === 'string'
            ? (parsed.payload as { conversationId: string }).conversationId
            : undefined;
        if (conversationId) {
          client.meta.conversationId = conversationId;
          this.addToIndex(this.byConversation, conversationId, client);
        }
        break;
      }
      case 'unsubscribe.conversation': {
        if (client.meta.conversationId) {
          this.removeFromIndex(this.byConversation, client.meta.conversationId, client);
          client.meta.conversationId = undefined;
        }
        break;
      }
      case 'visitor.hello': {
        const p = parsed.payload as { sessionId?: string; visitorId?: string } | undefined;
        if (p?.sessionId) client.meta.sessionId = p.sessionId;
        if (p?.visitorId) client.meta.visitorId = p.visitorId;
        break;
      }
      case 'recording.ops': {
        if (client.meta.role !== 'visitor') break;
        const p = parsed.payload as {
          sessionId?: string;
          visitorId?: string;
          events?: unknown[];
        };
        const sessionId = p?.sessionId || client.meta.sessionId;
        const visitorId = p?.visitorId || client.meta.visitorId;
        if (!sessionId || !Array.isArray(p?.events) || !p.events.length) break;
        this.broadcastToDashboard(client.meta.siteId, {
          type: 'recording.live',
          payload: {
            sessionId,
            visitorId,
            events: p.events,
            at: new Date().toISOString(),
          },
        });
        break;
      }
      default:
        break;
    }
  }

  registerClient(socket: WebSocket, meta: HubClientMeta): HubClient {
    const client: HubClient = { socket, meta, connectedAt: Date.now() };
    this.clients.add(client);

    if (meta.role === 'visitor' && meta.visitorId) {
      this.addToIndex(this.byVisitor, `${meta.siteId}:${meta.visitorId}`, client);
    }
    if (meta.conversationId) {
      this.addToIndex(this.byConversation, meta.conversationId, client);
    }
    if (meta.role === 'operator' && meta.operatorId) {
      this.addToIndex(this.byOperator, meta.operatorId, client);
      this.addToIndex(this.bySiteOperators, meta.siteId, client);
    }
    if (meta.role === 'dashboard') {
      this.addToIndex(this.bySiteDashboard, meta.siteId, client);
      if (meta.operatorId) {
        this.addToIndex(this.byOperator, meta.operatorId, client);
        this.addToIndex(this.bySiteOperators, meta.siteId, client);
      }
    }

    return client;
  }

  private unregisterClient(client: HubClient): void {
    if (!this.clients.delete(client)) return;
    const { meta } = client;
    if (meta.visitorId) this.removeFromIndex(this.byVisitor, `${meta.siteId}:${meta.visitorId}`, client);
    if (meta.conversationId) this.removeFromIndex(this.byConversation, meta.conversationId, client);
    if (meta.operatorId) {
      this.removeFromIndex(this.byOperator, meta.operatorId, client);
      this.removeFromIndex(this.bySiteOperators, meta.siteId, client);
    }
    if (meta.role === 'dashboard') {
      this.removeFromIndex(this.bySiteDashboard, meta.siteId, client);
    }
  }

  private addToIndex(map: Map<string, Set<HubClient>>, key: string, client: HubClient): void {
    let set = map.get(key);
    if (!set) {
      set = new Set();
      map.set(key, set);
    }
    set.add(client);
  }

  private removeFromIndex(map: Map<string, Set<HubClient>>, key: string, client: HubClient): void {
    const set = map.get(key);
    if (!set) return;
    set.delete(client);
    if (set.size === 0) map.delete(key);
  }

  private broadcast(set: Set<HubClient> | undefined, envelope: WsEnvelope): void {
    if (!set) return;
    for (const client of set) {
      safeSend(client.socket, envelope);
    }
  }

  broadcastToDashboard(siteId: string, envelope: WsEnvelope): void {
    this.broadcast(this.bySiteDashboard.get(siteId), envelope);
  }

  broadcastToOperators(siteId: string, envelope: WsEnvelope): void {
    this.broadcast(this.bySiteOperators.get(siteId), envelope);
    this.broadcast(this.bySiteDashboard.get(siteId), envelope);
  }

  sendToVisitor(siteId: string, visitorId: string, envelope: WsEnvelope): void {
    this.broadcast(this.byVisitor.get(`${siteId}:${visitorId}`), envelope);
  }

  sendToConversation(conversationId: string, envelope: WsEnvelope): void {
    this.broadcast(this.byConversation.get(conversationId), envelope);
  }

  sendToOperator(operatorId: string, envelope: WsEnvelope): void {
    this.broadcast(this.byOperator.get(operatorId), envelope);
  }

  hasOnlineOperators(siteId: string): boolean {
    const set = this.bySiteOperators.get(siteId);
    if (!set) return false;
    for (const c of set) {
      if (c.meta.role === 'operator' && c.socket.readyState === WebSocket.OPEN) return true;
    }
    return false;
  }

  countOnlineOperators(siteId: string): number {
    const set = this.bySiteOperators.get(siteId);
    if (!set) return 0;
    let n = 0;
    for (const c of set) {
      if (c.meta.role === 'operator' && c.socket.readyState === WebSocket.OPEN) n += 1;
    }
    return n;
  }

  getOnlineVisitorIds(siteId: string): string[] {
    const ids = new Set<string>();
    for (const client of this.clients) {
      if (
        client.meta.siteId === siteId &&
        client.meta.role === 'visitor' &&
        client.meta.visitorId &&
        client.socket.readyState === WebSocket.OPEN
      ) {
        ids.add(client.meta.visitorId);
      }
    }
    return [...ids];
  }

  getOnlineVisitorSessions(siteId: string): Array<{
    visitorId: string;
    sessionId?: string;
    conversationId?: string;
    connectedAt: number;
  }> {
    const out: Array<{
      visitorId: string;
      sessionId?: string;
      conversationId?: string;
      connectedAt: number;
    }> = [];
    for (const client of this.clients) {
      if (
        client.meta.siteId === siteId &&
        client.meta.role === 'visitor' &&
        client.meta.visitorId &&
        client.socket.readyState === WebSocket.OPEN
      ) {
        out.push({
          visitorId: client.meta.visitorId,
          sessionId: client.meta.sessionId,
          conversationId: client.meta.conversationId,
          connectedAt: client.connectedAt,
        });
      }
    }
    return out;
  }

  clientCount(): number {
    return this.clients.size;
  }
}

export const realtimeHub = new RealtimeHub();
