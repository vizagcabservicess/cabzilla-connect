import React, { Suspense, lazy, useCallback, useEffect, useState } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
import { Loader2, Play, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { ensureVaAuth, listSessions } from '@/services/api/visitorAnalyticsAPI';
import type { VaSession } from '@/types/visitorAnalytics';

const SessionReplayPlayer = lazy(
  () => import('@/components/visitor-analytics/replay/SessionReplayPlayer'),
);

function formatDuration(ms: number | null): string {
  if (ms == null) return '—';
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ${s % 60}s`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

/**
 * Standalone sessions + replay page (also available as a tab inside VisitorAnalyticsPage).
 */
export default function SessionsPage() {
  const [sessions, setSessions] = useState<VaSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [hasRecording, setHasRecording] = useState<'all' | '1' | '0'>('all');
  const [replayId, setReplayId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      await ensureVaAuth();
      const data = await listSessions({
        from: from || undefined,
        to: to || undefined,
        hasRecording: hasRecording === 'all' ? undefined : hasRecording === '1',
        limit: 100,
      });
      setSessions(data.sessions || []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load sessions');
    } finally {
      setLoading(false);
    }
  }, [from, to, hasRecording]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <AdminLayout activeTab="visitor-analytics">
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-slate-900">Sessions</h1>

        {replayId ? (
          <Suspense
            fallback={
              <div className="flex justify-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
              </div>
            }
          >
            <SessionReplayPlayer sessionId={replayId} onClose={() => setReplayId(null)} />
          </Suspense>
        ) : (
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex flex-wrap items-end gap-2 justify-between">
                <CardTitle className="text-base">Session list</CardTitle>
                <div className="flex flex-wrap items-end gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">From</Label>
                    <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-9" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">To</Label>
                    <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-9" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Recording</Label>
                    <Select value={hasRecording} onValueChange={(v) => setHasRecording(v as typeof hasRecording)}>
                      <SelectTrigger className="h-9 w-[130px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="1">With replay</SelectItem>
                        <SelectItem value="0">No replay</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button size="sm" className="h-9 bg-amber-600 hover:bg-amber-700" onClick={() => void load()}>
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Started</TableHead>
                    <TableHead>Visitor</TableHead>
                    <TableHead>Landing</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead className="whitespace-nowrap">IP</TableHead>
                    <TableHead>Campaign</TableHead>
                    <TableHead>Keyword</TableHead>
                    <TableHead className="text-right">Replay</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-10 text-slate-400">
                        <Loader2 className="h-5 w-5 animate-spin inline" />
                      </TableCell>
                    </TableRow>
                  ) : sessions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-10 text-slate-500">
                        No sessions
                      </TableCell>
                    </TableRow>
                  ) : (
                    sessions.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell className="text-sm whitespace-nowrap">
                          {new Date(s.started_at).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-sm">
                          {s.visitor_name || s.visitor_key?.slice(0, 12) || '—'}
                        </TableCell>
                        <TableCell className="text-sm max-w-[200px] truncate">
                          {s.landing_page || '—'}
                        </TableCell>
                        <TableCell className="text-sm tabular-nums">
                          {formatDuration(s.duration_ms)}
                        </TableCell>
                        <TableCell
                          className="whitespace-nowrap text-xs font-mono text-slate-800"
                          title={s.ip_address || undefined}
                        >
                          {s.ip_address || '—'}
                        </TableCell>
                        <TableCell className="text-sm max-w-[120px] truncate" title={s.utm_campaign || ''}>
                          {s.utm_campaign || '—'}
                        </TableCell>
                        <TableCell
                          className="text-sm min-w-[12rem] max-w-[22rem] whitespace-normal break-words"
                          title={s.utm_term || ''}
                        >
                          {s.utm_term || '—'}
                        </TableCell>
                        <TableCell className="text-right">
                          {s.has_recording ? (
                            <Button size="sm" variant="outline" onClick={() => setReplayId(s.id)}>
                              <Play className="h-3.5 w-3.5 mr-1" />
                              Open
                            </Button>
                          ) : (
                            <Badge variant="secondary" className="text-[10px]">
                              None
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}
