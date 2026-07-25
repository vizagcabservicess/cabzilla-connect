import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Download,
  Loader2,
  MessageCircle,
  RefreshCw,
  Search,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  exportConversation,
  getOperatorUnread,
  listInbox,
  VaWebSocket,
  getStoredSiteId,
  getStoredVaToken,
} from '@/services/api/visitorAnalyticsAPI';
import type {
  ChatConversation,
  ConversationStatus,
  WsEnvelope,
} from '@/types/visitorAnalytics';
import { ChatThread } from './ChatThread';

function formatRelative(iso: string | null): string {
  if (!iso) return '';
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return '';
  const diff = Date.now() - t;
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'now';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

const STATUS_OPTIONS: Array<ConversationStatus | 'all'> = [
  'all',
  'open',
  'pending',
  'assigned',
  'resolved',
  'missed',
  'offline',
];

export function ChatInbox() {
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [status, setStatus] = useState<ConversationStatus | 'all'>('all');
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [vehicle, setVehicle] = useState('');
  const [campaign, setCampaign] = useState('');
  const [source, setSource] = useState('');
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(true);
  const [unread, setUnread] = useState(0);
  const [onlineVisitorIds, setOnlineVisitorIds] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [inbox, badge] = await Promise.all([
        listInbox({
          status: status === 'all' ? undefined : status,
          limit: 100,
        }),
        getOperatorUnread(),
      ]);
      setConversations(inbox.conversations || []);
      setUnread(badge.unread || 0);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load inbox');
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const siteId = getStoredSiteId();
    const token = getStoredVaToken();
    if (!siteId || !token) return;
    const ws = new VaWebSocket({ role: 'dashboard', siteId, token });
    ws.connect();
    const off = ws.on((msg: WsEnvelope) => {
      if (msg.type === 'chat.conversation.created' || msg.type === 'chat.message' || msg.type === 'chat.resolved') {
        void load();
      }
      if (msg.type === 'visitors.live') {
        const payload = msg.payload as { visitors?: Array<{ visitorId: string }> };
        setOnlineVisitorIds(new Set((payload.visitors || []).map((v) => v.visitorId)));
      }
    });
    return () => {
      off();
      ws.close();
    };
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return conversations.filter((c) => {
      if (dateFrom) {
        const created = new Date(c.created_at).toISOString().slice(0, 10);
        if (created < dateFrom) return false;
      }
      if (vehicle && !(c.vehicle_interest || '').toLowerCase().includes(vehicle.toLowerCase())) return false;
      if (campaign && !(c.campaign || '').toLowerCase().includes(campaign.toLowerCase())) return false;
      if (source && !(c.source || '').toLowerCase().includes(source.toLowerCase())) return false;
      if (location && !(c.location_city || c.visitor_city || '').toLowerCase().includes(location.toLowerCase())) {
        return false;
      }
      if (!q) return true;
      const hay = [
        c.visitor_name,
        c.visitor_email,
        c.visitor_phone,
        c.subject,
        c.vehicle_interest,
        c.campaign,
        c.source,
        c.location_city,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [conversations, search, dateFrom, vehicle, campaign, source, location]);

  const selected = conversations.find((c) => c.id === selectedId) || null;

  const handleExport = async (id: string) => {
    try {
      const data = await exportConversation(id);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `chat-${id}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Exported');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Export failed');
    }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[340px_1fr] gap-4 min-h-[560px]">
      <Card className="border-slate-200 shadow-sm flex flex-col">
        <CardHeader className="pb-3 space-y-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold text-slate-900 flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-amber-600" />
              Inbox
              {unread > 0 && (
                <Badge className="bg-amber-500 hover:bg-amber-500">{unread}</Badge>
              )}
            </CardTitle>
            <Button size="icon" variant="ghost" onClick={() => void load()}>
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search chats…"
              className="pl-9 h-9"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-[10px]">Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as ConversationStatus | 'all')}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s} className="capitalize">
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px]">From date</Label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-8 text-xs" />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px]">Vehicle</Label>
              <Input value={vehicle} onChange={(e) => setVehicle(e.target.value)} className="h-8 text-xs" placeholder="Any" />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px]">Campaign</Label>
              <Input value={campaign} onChange={(e) => setCampaign(e.target.value)} className="h-8 text-xs" placeholder="Any" />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px]">Source</Label>
              <Input value={source} onChange={(e) => setSource(e.target.value)} className="h-8 text-xs" placeholder="Any" />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px]">Location</Label>
              <Input value={location} onChange={(e) => setLocation(e.target.value)} className="h-8 text-xs" placeholder="City" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex-1 pt-0 px-2 pb-2">
          <ScrollArea className="h-[420px]">
            {loading && conversations.length === 0 ? (
              <div className="flex justify-center py-12 text-slate-400">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : filtered.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-12">No conversations</p>
            ) : (
              <ul className="space-y-1">
                {filtered.map((c) => {
                  const online = onlineVisitorIds.has(c.visitor_id);
                  const active = c.id === selectedId;
                  return (
                    <li key={c.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedId(c.id)}
                        className={`w-full text-left rounded-lg px-3 py-2.5 transition-colors ${
                          active ? 'bg-amber-50 border border-amber-200' : 'hover:bg-slate-50 border border-transparent'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`h-2 w-2 rounded-full shrink-0 ${online ? 'bg-emerald-500' : 'bg-slate-300'}`}
                                title={online ? 'Online' : 'Offline'}
                              />
                              <p className="text-sm font-medium text-slate-900 truncate">
                                {c.visitor_name || 'Anonymous'}
                              </p>
                            </div>
                            <p className="text-xs text-slate-500 truncate mt-0.5">
                              {c.subject || c.vehicle_interest || c.source || 'Chat'}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-[10px] text-slate-400">{formatRelative(c.last_message_at)}</p>
                            {c.unread_operator > 0 && (
                              <Badge className="mt-1 h-5 min-w-5 justify-center bg-amber-500 hover:bg-amber-500 text-[10px]">
                                {c.unread_operator}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="mt-1.5 flex items-center gap-1">
                          <Badge variant="outline" className="text-[9px] capitalize h-5">
                            {c.status}
                          </Badge>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6 ml-auto"
                            onClick={(e) => {
                              e.stopPropagation();
                              void handleExport(c.id);
                            }}
                          >
                            <Download className="h-3 w-3" />
                          </Button>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      <div className="min-h-[560px]">
        {selected ? (
          <ChatThread
            conversation={selected}
            onUpdated={(updated) => {
              setConversations((prev) => prev.map((c) => (c.id === updated.id ? { ...c, ...updated } : c)));
            }}
          />
        ) : (
          <Card className="border-slate-200 shadow-sm h-full flex items-center justify-center">
            <p className="text-sm text-slate-500">Select a conversation</p>
          </Card>
        )}
      </div>
    </div>
  );
}

export default ChatInbox;
