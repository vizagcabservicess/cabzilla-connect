import { nowIso, pageUrl } from './config';
import type {
  ChatBridgeApi,
  ChatOutboundMessage,
  ChatVisitorContext,
  VisitorIdentity,
} from './types';
import type { Transport } from './transport';

type VisitorHandler = (msg: ChatOutboundMessage) => void;

/**
 * Bridge for live-chat widgets. Site chat UI calls these hooks;
 * operators receive messages over the analytics WebSocket / custom events.
 */
export function createChatBridge(
  transport: Transport,
  getIdentity: () => VisitorIdentity | null,
): ChatBridgeApi {
  const handlers = new Set<VisitorHandler>();
  let open = false;

  const api: ChatBridgeApi = {
    onVisitorMessage(handler) {
      handlers.add(handler);
      return () => {
        handlers.delete(handler);
      };
    },

    sendOperatorMessage(msg) {
      const identity = getIdentity();
      const payload = {
        text: msg.text,
        from: msg.from || 'operator',
        meta: msg.meta || {},
        visitorId: identity?.visitorId,
        sessionId: identity?.sessionId,
        at: nowIso(),
      };
      const sent = transport.sendWs('chat.operator_message', payload);
      document.dispatchEvent(
        new CustomEvent('vth:chat:inbound', { detail: payload }),
      );
      if (!sent) {
        // Widget can still listen to DOM event when WS is down
      }
    },

    openChat() {
      open = true;
      document.dispatchEvent(new CustomEvent('vth:chat:open'));
      transport.sendWs('chat.open', {
        visitorId: getIdentity()?.visitorId,
        sessionId: getIdentity()?.sessionId,
        pageUrl: pageUrl(),
        at: nowIso(),
      });
    },

    closeChat() {
      open = false;
      document.dispatchEvent(new CustomEvent('vth:chat:close'));
      transport.sendWs('chat.close', {
        visitorId: getIdentity()?.visitorId,
        sessionId: getIdentity()?.sessionId,
        at: nowIso(),
      });
    },

    setTyping(typing) {
      transport.sendWs('chat.typing', {
        typing,
        visitorId: getIdentity()?.visitorId,
        sessionId: getIdentity()?.sessionId,
        at: nowIso(),
      });
    },

    getVisitorContext(): ChatVisitorContext {
      const id = getIdentity();
      return {
        visitorKey: id?.visitorKey || '',
        sessionId: id?.sessionId || '',
        visitorId: id?.visitorId ?? null,
        pageUrl: pageUrl(),
        isReturning: id?.isReturning ?? false,
      };
    },
  };

  // Allow chat widgets to push visitor messages into the bridge
  const onOutbound = (ev: Event) => {
    const detail = (ev as CustomEvent<ChatOutboundMessage>).detail;
    if (!detail?.text) return;
    const msg: ChatOutboundMessage = {
      text: detail.text,
      meta: detail.meta,
      at: detail.at || nowIso(),
    };
    for (const h of handlers) {
      try {
        h(msg);
      } catch {
        // ignore handler errors
      }
    }
    const identity = getIdentity();
    transport.sendWs('chat.visitor_message', {
      ...msg,
      visitorId: identity?.visitorId,
      sessionId: identity?.sessionId,
      pageUrl: pageUrl(),
      chatOpen: open,
    });
  };

  document.addEventListener('vth:chat:outbound', onOutbound);

  // Stash cleanup on the api object for destroy()
  (api as ChatBridgeApi & { _destroy?: () => void })._destroy = () => {
    document.removeEventListener('vth:chat:outbound', onOutbound);
    handlers.clear();
  };

  return api;
}

export function destroyChatBridge(api: ChatBridgeApi): void {
  const ext = api as ChatBridgeApi & { _destroy?: () => void };
  ext._destroy?.();
}

/** Helper widgets can call: visitorAnalytics.chat.emitVisitorMessage('hello') */
export function attachChatHelpers(api: ChatBridgeApi): void {
  const ext = api as ChatBridgeApi & {
    emitVisitorMessage?: (text: string, meta?: Record<string, unknown>) => void;
  };
  ext.emitVisitorMessage = (text, meta) => {
    document.dispatchEvent(
      new CustomEvent('vth:chat:outbound', {
        detail: { text, meta, at: nowIso() } satisfies ChatOutboundMessage,
      }),
    );
  };
}
