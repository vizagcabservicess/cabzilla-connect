import React, { Suspense, lazy, useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import AdminLayout from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Activity,
  BarChart3,
  Flame,
  Filter,
  Loader2,
  MessageCircle,
  Play,
  RefreshCw,
  Settings,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  ensureVaAuth,
  exchangeOperatorToken,
  clearVaAuth,
  getAttributionReport,
  getRangeReport,
  getDailySeries,
  getLiveVisitors,
  getStoredOperator,
  getStoredSiteId,
  getStoredVaToken,
  listSessions,
  setOperatorStatus,
  VaWebSocket,
} from '@/services/api/visitorAnalyticsAPI';
import type {
  AttributionReport,
  LiveVisitorSnapshot,
  VaAdminTab,
  VaSession,
  WsEnvelope,
} from '@/types/visitorAnalytics';
import { LiveVisitorsPanel } from '@/components/visitor-analytics/dashboard/LiveVisitorsPanel';
import { NotificationsBell } from '@/components/visitor-analytics/dashboard/NotificationsBell';
import {
  AnalyticsOverviewCards,
  type OverviewMetrics,
} from '@/components/visitor-analytics/dashboard/AnalyticsOverviewCards';
import { AttributionInsights } from '@/components/visitor-analytics/dashboard/AttributionInsights';
import { HeatmapViewer } from '@/components/visitor-analytics/heatmap/HeatmapViewer';
import { FunnelBuilder } from '@/components/visitor-analytics/funnels/FunnelBuilder';
import { BookingAnalyticsPanel } from '@/components/visitor-analytics/funnels/BookingAnalyticsPanel';
import { ReportsPanel } from '@/components/visitor-analytics/reports/ReportsPanel';
import { ChatInbox } from '@/components/visitor-analytics/chat/ChatInbox';

const SessionReplayPlayer = lazy(
  () => import('@/components/visitor-analytics/replay/SessionReplayPlayer'),
);

function todayIso(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function addDaysIso(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function inclusiveDayCount(from: string, to: string): number {
  const a = Date.parse(`${from}T00:00:00Z`);
  const b = Date.parse(`${to}T00:00:00Z`);
  if (Number.isNaN(a) || Number.isNaN(b) || b < a) return 1;
  return Math.round((b - a) / 86_400_000) + 1;
}

function pctDelta(current: number, previous: number): number | null {
  if (previous <= 0) return current > 0 ? 100 : null;
  return ((current - previous) / previous) * 100;
}

function formatDuration(ms: number | null): string {
  if (ms == null) return '—';
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ${s % 60}s`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

function formatDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

/** Keyword from stored utm_term, or parse utm_term from landing/entry URL. */
function sessionKeyword(s: {
  utm_term?: string | null;
  landing_page?: string | null;
  entry_url?: string | null;
}): string | null {
  const direct = (s.utm_term || '').trim();
  if (direct) return direct;
  for (const raw of [s.landing_page, s.entry_url]) {
    if (!raw || !raw.includes('utm_term=')) continue;
    try {
      const href = raw.startsWith('http') ? raw : `https://vizagtaxihub.com${raw.startsWith('/') ? '' : '/'}${raw}`;
      const term = new URL(href).searchParams.get('utm_term');
      if (term?.trim()) return term.trim();
    } catch {
      // ignore bad URLs
    }
  }
  return null;
}

export function VisitorAnalyticsLayout() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromUrl = searchParams.get('tab') as VaAdminTab | null;
  const [tab, setTabState] = useState<VaAdminTab>(tabFromUrl || 'live');
  const setTab = useCallback(
    (next: VaAdminTab) => {
      setTabState(next);
      setSearchParams((prev) => {
        const p = new URLSearchParams(prev);
        p.set('tab', next);
        return p;
      }, { replace: true });
    },
    [setSearchParams],
  );

  useEffect(() => {
    if (tabFromUrl && tabFromUrl !== tab) setTabState(tabFromUrl);
  }, [tabFromUrl, tab]);

  const [ready, setReady] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [visitors, setVisitors] = useState<LiveVisitorSnapshot[]>([]);
  const [liveLoading, setLiveLoading] = useState(true);
  const [metrics, setMetrics] = useState<OverviewMetrics>({
    liveCount: 0,
    sessionsToday: 0,
    pageviewsToday: 0,
    chatsToday: 0,
    whatsappClicks: 0,
    phoneClicks: 0,
    bookingsStarted: 0,
    bookingsCompleted: 0,
    paymentsSuccess: 0,
  });
  const [metricsLoading, setMetricsLoading] = useState(true);
  const [attribution, setAttribution] = useState<AttributionReport | null>(null);
  const [attributionLoading, setAttributionLoading] = useState(true);

  // Shared date range (header) — drives attribution, KPIs, sessions
  const [rangeFrom, setRangeFrom] = useState(() => addDaysIso(todayIso(), -6));
  const [rangeTo, setRangeTo] = useState(() => todayIso());

  // Sessions tab state
  const [sessions, setSessions] = useState<VaSession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [hasRecording, setHasRecording] = useState<'all' | '1' | '0'>('all');
  const [replaySessionId, setReplaySessionId] = useState<string | null>(null);
  const [liveWatchSessionId, setLiveWatchSessionId] = useState<string | null>(null);

  // Settings
  const [opStatus, setOpStatus] = useState<'online' | 'away' | 'offline'>('online');

  const bootstrap = useCallback(async () => {
    setAuthError(null);
    try {
      await ensureVaAuth();
      setReady(true);
    } catch (err) {
      clearVaAuth();
      try {
        await exchangeOperatorToken();
        setReady(true);
        setAuthError(null);
      } catch (retryErr) {
        setAuthError(
          retryErr instanceof Error
            ? retryErr.message
            : 'Authentication failed — log out and log in again',
        );
        setReady(false);
      }
    }
  }, []);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  const loadLive = useCallback(async () => {
    setLiveLoading(true);
    try {
      const data = await getLiveVisitors();
      setVisitors(data.visitors || []);
      setMetrics((m) => ({ ...m, liveCount: data.count || data.visitors?.length || 0 }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load live visitors');
    } finally {
      setLiveLoading(false);
    }
  }, []);

  const loadOverview = useCallback(async () => {
    setMetricsLoading(true);
    const to = rangeTo || todayIso();
    const from = rangeFrom && rangeFrom <= to ? rangeFrom : to;
    const span = inclusiveDayCount(from, to);
    const prevTo = addDaysIso(from, -1);
    const prevFrom = addDaysIso(prevTo, -(span - 1));
    const sparkFrom = span <= 1 ? addDaysIso(to, -6) : from;
    try {
      const [curRes, prevRes, seriesRes] = await Promise.all([
        getRangeReport(from, to),
        getRangeReport(prevFrom, prevTo).catch(() => null),
        getDailySeries(sparkFrom, to).catch(() => ({ series: [] })),
      ]);
      const cur = curRes.report;
      const prev = prevRes?.report;
      const series = seriesRes.series || [];
      const spark = (
        field: 'sessions' | 'pageviews' | 'chats' | 'bookingsStarted' | 'paymentsSuccess' | 'whatsappClicks' | 'phoneClicks',
      ) => series.map((s) => Number(s[field] || 0));

      setMetrics((m) => ({
        ...m,
        sessionsToday: cur.sessions,
        pageviewsToday: cur.pageviews,
        chatsToday: cur.chats,
        whatsappClicks: cur.whatsappClicks ?? 0,
        phoneClicks: cur.phoneClicks ?? 0,
        bookingsStarted: cur.bookingsStarted,
        bookingsCompleted: cur.bookingsCompleted,
        paymentsSuccess: cur.paymentsSuccess,
        extras: {
          sessionsToday: {
            deltaPct: prev ? pctDelta(cur.sessions, prev.sessions) : null,
            sparkline: spark('sessions'),
          },
          pageviewsToday: {
            deltaPct: prev ? pctDelta(cur.pageviews, prev.pageviews) : null,
            sparkline: spark('pageviews'),
          },
          chatsToday: {
            deltaPct: prev ? pctDelta(cur.chats, prev.chats) : null,
            sparkline: spark('chats'),
          },
          whatsappClicks: {
            deltaPct: prev
              ? pctDelta(cur.whatsappClicks ?? 0, prev.whatsappClicks ?? 0)
              : null,
            sparkline: spark('whatsappClicks'),
          },
          phoneClicks: {
            deltaPct: prev
              ? pctDelta(cur.phoneClicks ?? 0, prev.phoneClicks ?? 0)
              : null,
            sparkline: spark('phoneClicks'),
          },
          bookingsStarted: {
            deltaPct: prev ? pctDelta(cur.bookingsStarted, prev.bookingsStarted) : null,
            sparkline: spark('bookingsStarted'),
          },
          paymentsSuccess: {
            deltaPct: prev ? pctDelta(cur.paymentsSuccess, prev.paymentsSuccess) : null,
            sparkline: spark('paymentsSuccess'),
          },
        },
      }));
    } catch {
      // soft fail
    } finally {
      setMetricsLoading(false);
    }
  }, [rangeFrom, rangeTo]);

  const loadAttribution = useCallback(async () => {
    setAttributionLoading(true);
    try {
      const { report } = await getAttributionReport(rangeFrom, rangeTo);
      setAttribution(report);
    } catch {
      // soft fail — keep previous snapshot
    } finally {
      setAttributionLoading(false);
    }
  }, [rangeFrom, rangeTo]);

  const loadSessions = useCallback(async () => {
    setSessionsLoading(true);
    try {
      const data = await listSessions({
        from: rangeFrom || undefined,
        to: rangeTo || undefined,
        hasRecording: hasRecording === 'all' ? undefined : hasRecording === '1',
        limit: 100,
      });
      setSessions(data.sessions || []);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to load sessions';
      toast.error(msg);
      // After a live replay storm, wait briefly and retry once
      if (/too many requests/i.test(msg)) {
        await new Promise((r) => setTimeout(r, 1500));
        try {
          const data = await listSessions({
            from: rangeFrom || undefined,
            to: rangeTo || undefined,
            hasRecording: hasRecording === 'all' ? undefined : hasRecording === '1',
            limit: 100,
          });
          setSessions(data.sessions || []);
          toast.success('Sessions loaded');
        } catch {
          // keep empty state
        }
      }
    } finally {
      setSessionsLoading(false);
    }
  }, [rangeFrom, rangeTo, hasRecording]);

  useEffect(() => {
    if (!ready) return;
    void loadLive();
  }, [ready, loadLive]);

  useEffect(() => {
    if (!ready) return;
    void loadOverview();
    void loadAttribution();
  }, [ready, loadOverview, loadAttribution]);

  useEffect(() => {
    if (!ready || tab !== 'sessions') return;
    void loadSessions();
  }, [ready, tab, loadSessions]);

  useEffect(() => {
    if (!ready) return;
    const siteId = getStoredSiteId();
    const token = getStoredVaToken();
    if (!siteId || !token) return;
    const ws = new VaWebSocket({ role: 'dashboard', siteId, token });
    ws.connect();
    const off = ws.on((msg: WsEnvelope) => {
      if (msg.type === 'visitors.live') {
        const payload = msg.payload as { visitors?: LiveVisitorSnapshot[]; count?: number };
        setVisitors(payload.visitors || []);
        setMetrics((m) => ({ ...m, liveCount: payload.count ?? payload.visitors?.length ?? 0 }));
      }
    });
    return () => {
      off();
      ws.close();
    };
  }, [ready]);

  const operator = useMemo(() => getStoredOperator(), [ready]);

  const handleStatusChange = async (status: 'online' | 'away' | 'offline') => {
    try {
      await setOperatorStatus(status);
      setOpStatus(status);
      toast.success(`Status: ${status}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to update status');
    }
  };

  if (authError) {
    return (
      <AdminLayout activeTab="visitor-analytics">
        <Card className="border-rose-200 max-w-lg mx-auto mt-12">
          <CardHeader>
            <CardTitle className="text-rose-700">Visitor Analytics unavailable</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-slate-600">{authError}</p>
            <p className="text-xs text-slate-500">
              Start the analytics API, then retry:
            </p>
            <pre className="text-xs bg-slate-50 border rounded p-3 overflow-x-auto">
{`cd visitor-analytics
cp .env.example .env   # set DB_* credentials
npm install
npm run dev`}
            </pre>
            <p className="text-xs text-slate-500">
              Or from the repo root: <code>npm run dev:analytics</code>
            </p>
            <Button onClick={() => void bootstrap()} className="bg-amber-600 hover:bg-amber-700">
              Retry
            </Button>
          </CardContent>
        </Card>
      </AdminLayout>
    );
  }

  if (!ready) {
    return (
      <AdminLayout activeTab="visitor-analytics">
        <div className="flex items-center justify-center py-24 text-slate-500 gap-2">
          <Loader2 className="h-5 w-5 animate-spin" />
          Connecting to Visitor Analytics…
        </div>
      </AdminLayout>
    );
  }

  const rangeIsToday =
    rangeFrom === todayIso() && rangeTo === todayIso();

  return (
    <AdminLayout activeTab="visitor-analytics">
      <div className="-mx-1 min-h-[70vh] space-y-5 rounded-2xl bg-slate-50/80 px-1 py-1 sm:px-2 sm:py-2">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Visitor Analytics
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Live visitors, session replay, heatmaps, funnels & chat — Vizag Taxi Hub
            </p>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <div className="flex items-end gap-2 rounded-xl border border-slate-200 bg-white px-2.5 py-2 shadow-sm">
              <div>
                <Label htmlFor="va-range-from" className="text-[10px] uppercase text-slate-400">
                  From
                </Label>
                <Input
                  id="va-range-from"
                  type="date"
                  className="h-8 w-[138px] border-0 px-1 shadow-none focus-visible:ring-0"
                  value={rangeFrom}
                  max={rangeTo}
                  onChange={(e) => setRangeFrom(e.target.value)}
                />
              </div>
              <span className="pb-2 text-slate-300">–</span>
              <div>
                <Label htmlFor="va-range-to" className="text-[10px] uppercase text-slate-400">
                  To
                </Label>
                <Input
                  id="va-range-to"
                  type="date"
                  className="h-8 w-[138px] border-0 px-1 shadow-none focus-visible:ring-0"
                  value={rangeTo}
                  min={rangeFrom}
                  max={todayIso()}
                  onChange={(e) => setRangeTo(e.target.value)}
                />
              </div>
            </div>
            <NotificationsBell
              onNavigate={(n) => {
                if (n.type === 'new_chat' || n.type === 'missed_chat') setTab('chat');
                else if (n.type.startsWith('booking')) setTab('bookings');
                else setTab('live');
              }}
            />
            <Button
              variant="outline"
              size="sm"
              className="h-10 bg-white"
              onClick={() => {
                void loadLive();
                void loadOverview();
                void loadAttribution();
                if (tab === 'sessions') void loadSessions();
              }}
            >
              <RefreshCw className="h-4 w-4 mr-1.5" />
              Refresh
            </Button>
          </div>
        </div>

        <AnalyticsOverviewCards
          metrics={metrics}
          loading={metricsLoading || liveLoading}
          rangeLabel={rangeIsToday ? 'today' : 'range'}
        />

        <AttributionInsights report={attribution} loading={attributionLoading} />

        <Tabs value={tab} onValueChange={(v) => setTab(v as VaAdminTab)} className="space-y-4">
          <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 rounded-xl border border-slate-200 bg-white p-1.5 shadow-sm">
            <TabsTrigger
              value="live"
              className="gap-1.5 rounded-lg data-[state=active]:bg-slate-900 data-[state=active]:text-white"
            >
              <Activity className="h-3.5 w-3.5" /> Live
            </TabsTrigger>
            <TabsTrigger
              value="sessions"
              className="gap-1.5 rounded-lg data-[state=active]:bg-slate-900 data-[state=active]:text-white"
            >
              <Play className="h-3.5 w-3.5" /> Sessions
            </TabsTrigger>
            <TabsTrigger
              value="heatmaps"
              className="gap-1.5 rounded-lg data-[state=active]:bg-slate-900 data-[state=active]:text-white"
            >
              <Flame className="h-3.5 w-3.5" /> Heatmaps
            </TabsTrigger>
            <TabsTrigger
              value="funnels"
              className="gap-1.5 rounded-lg data-[state=active]:bg-slate-900 data-[state=active]:text-white"
            >
              <Filter className="h-3.5 w-3.5" /> Funnels
            </TabsTrigger>
            <TabsTrigger
              value="bookings"
              className="gap-1.5 rounded-lg data-[state=active]:bg-slate-900 data-[state=active]:text-white"
            >
              <BarChart3 className="h-3.5 w-3.5" /> Bookings
            </TabsTrigger>
            <TabsTrigger
              value="reports"
              className="gap-1.5 rounded-lg data-[state=active]:bg-slate-900 data-[state=active]:text-white"
            >
              <Users className="h-3.5 w-3.5" /> Reports
            </TabsTrigger>
            <TabsTrigger
              value="chat"
              className="gap-1.5 rounded-lg data-[state=active]:bg-slate-900 data-[state=active]:text-white"
            >
              <MessageCircle className="h-3.5 w-3.5" /> Chat
            </TabsTrigger>
            <TabsTrigger
              value="settings"
              className="gap-1.5 rounded-lg data-[state=active]:bg-slate-900 data-[state=active]:text-white"
            >
              <Settings className="h-3.5 w-3.5" /> Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="live" className="mt-0 space-y-4">
            {liveWatchSessionId ? (
              <Suspense
                fallback={
                  <div className="flex justify-center py-16 text-slate-400">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                }
              >
                <SessionReplayPlayer
                  sessionId={liveWatchSessionId}
                  live
                  onClose={() => setLiveWatchSessionId(null)}
                />
              </Suspense>
            ) : null}
            <LiveVisitorsPanel
              visitors={visitors}
              loading={liveLoading}
              onWatch={(v) => {
                if (!v.sessionId) {
                  toast.error('Session not ready yet');
                  return;
                }
                setLiveWatchSessionId(v.sessionId);
              }}
            />
          </TabsContent>

          <TabsContent value="sessions" className="mt-0 space-y-4">
            {replaySessionId ? (
              <Suspense
                fallback={
                  <div className="flex justify-center py-16 text-slate-400">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                }
              >
                <SessionReplayPlayer
                  sessionId={replaySessionId}
                  onClose={() => setReplaySessionId(null)}
                />
              </Suspense>
            ) : (
              <Card className="border-slate-200 shadow-sm">
                <CardHeader className="pb-3">
                  <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-3">
                    <CardTitle className="text-base font-semibold text-slate-900">
                      Sessions
                    </CardTitle>
                    <div className="flex flex-wrap items-end gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs">From</Label>
                        <Input
                          type="date"
                          value={rangeFrom}
                          onChange={(e) => setRangeFrom(e.target.value)}
                          className="h-9"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">To</Label>
                        <Input
                          type="date"
                          value={rangeTo}
                          onChange={(e) => setRangeTo(e.target.value)}
                          className="h-9"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Recording</Label>
                        <Select
                          value={hasRecording}
                          onValueChange={(v) => setHasRecording(v as 'all' | '1' | '0')}
                        >
                          <SelectTrigger className="h-9 w-[120px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All</SelectItem>
                            <SelectItem value="1">With replay</SelectItem>
                            <SelectItem value="0">No replay</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Button
                        size="sm"
                        className="h-9 bg-amber-600 hover:bg-amber-700"
                        onClick={() => {
                          void loadSessions();
                          void loadAttribution();
                        }}
                        disabled={sessionsLoading}
                      >
                        {sessionsLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <RefreshCw className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto rounded-lg border border-slate-100">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Started</TableHead>
                          <TableHead>Visitor</TableHead>
                          <TableHead>Landing</TableHead>
                          <TableHead>Device</TableHead>
                          <TableHead>Duration</TableHead>
                          <TableHead className="whitespace-nowrap">IP</TableHead>
                          <TableHead>Campaign</TableHead>
                          <TableHead>Keyword</TableHead>
                          <TableHead className="text-right">Replay</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sessions.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={9} className="text-center text-slate-500 py-10">
                              {sessionsLoading ? 'Loading…' : 'No sessions found'}
                            </TableCell>
                          </TableRow>
                        ) : (
                          sessions.map((s) => {
                            const keyword = sessionKeyword(s);
                            const ipFlags = [
                              s.is_hosting ? 'DC' : null,
                              s.is_proxy ? 'VPN' : null,
                            ].filter(Boolean);
                            return (
                            <TableRow key={s.id}>
                              <TableCell className="text-sm whitespace-nowrap">
                                {formatDateTime(s.started_at)}
                              </TableCell>
                              <TableCell>
                                <div className="text-sm font-medium">
                                  {s.visitor_name || s.visitor_key?.slice(0, 10) || '—'}
                                </div>
                                <div className="text-xs text-slate-500">
                                  {[
                                    s.city || s.visitor_city,
                                    s.pincode || s.visitor_pincode,
                                  ]
                                    .filter(Boolean)
                                    .join(' · ') || '—'}
                                  {s.is_returning ? ' · returning' : ' · new'}
                                </div>
                              </TableCell>
                              <TableCell className="text-sm max-w-[180px] truncate" title={s.landing_page || ''}>
                                {s.landing_page || '—'}
                              </TableCell>
                              <TableCell className="text-sm capitalize">
                                {s.device_type}
                                {s.browser ? ` · ${s.browser}` : ''}
                              </TableCell>
                              <TableCell className="text-sm tabular-nums">
                                {formatDuration(s.duration_ms)}
                              </TableCell>
                              <TableCell className="text-sm whitespace-nowrap">
                                <div
                                  className="font-mono text-xs text-slate-800"
                                  title={s.ip_address || undefined}
                                >
                                  {s.ip_address || '—'}
                                </div>
                                {ipFlags.length ? (
                                  <div className="text-[10px] text-red-600 font-medium mt-0.5">
                                    {ipFlags.join(' · ')}
                                  </div>
                                ) : null}
                              </TableCell>
                              <TableCell className="text-sm max-w-[140px] truncate" title={s.utm_campaign || ''}>
                                {s.utm_campaign || '—'}
                              </TableCell>
                              <TableCell
                                className="text-sm min-w-[12rem] max-w-[22rem] whitespace-normal break-words"
                                title={keyword || ''}
                              >
                                {keyword || '—'}
                              </TableCell>
                              <TableCell className="text-right">
                                {s.has_recording ? (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setReplaySessionId(s.id)}
                                  >
                                    <Play className="h-3.5 w-3.5 mr-1" />
                                    Replay
                                  </Button>
                                ) : (
                                  <Badge variant="secondary" className="text-[10px]">
                                    None
                                  </Badge>
                                )}
                              </TableCell>
                            </TableRow>
                            );
                          })
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="heatmaps" className="mt-0">
            <HeatmapViewer />
          </TabsContent>

          <TabsContent value="funnels" className="mt-0">
            <FunnelBuilder />
          </TabsContent>

          <TabsContent value="bookings" className="mt-0">
            <BookingAnalyticsPanel />
          </TabsContent>

          <TabsContent value="reports" className="mt-0">
            <ReportsPanel />
          </TabsContent>

          <TabsContent value="chat" className="mt-0">
            <ChatInbox />
          </TabsContent>

          <TabsContent value="settings" className="mt-0">
            <Card className="border-slate-200 shadow-sm max-w-xl">
              <CardHeader>
                <CardTitle className="text-base font-semibold">Operator settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg bg-slate-50 border border-slate-100 p-3 text-sm space-y-1">
                  <p>
                    <span className="text-slate-500">Name:</span>{' '}
                    <strong>{operator?.name || '—'}</strong>
                  </p>
                  <p>
                    <span className="text-slate-500">Email:</span> {operator?.email || '—'}
                  </p>
                  <p>
                    <span className="text-slate-500">Role:</span> {operator?.role || '—'}
                  </p>
                  <p>
                    <span className="text-slate-500">Site ID:</span>{' '}
                    <code className="text-xs">{operator?.siteId || getStoredSiteId() || '—'}</code>
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label>Chat status</Label>
                  <Select
                    value={opStatus}
                    onValueChange={(v) => void handleStatusChange(v as typeof opStatus)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="online">Online</SelectItem>
                      <SelectItem value="away">Away</SelectItem>
                      <SelectItem value="offline">Offline</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="text-xs text-slate-500 space-y-1">
                  <p>
                    API: <code>{import.meta.env.VITE_VA_API_BASE || 'http://localhost:4090'}</code>
                  </p>
                  <p>
                    WS: <code>{import.meta.env.VITE_VA_WS_URL || 'ws://localhost:4090/ws'}</code>
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}

export default VisitorAnalyticsLayout;
