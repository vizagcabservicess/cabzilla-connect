import React, { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Loader2, RefreshCw, TrendingDown, Clock } from 'lucide-react';
import { toast } from 'sonner';
import {
  getFunnelAnalytics,
  listFunnels,
} from '@/services/api/visitorAnalyticsAPI';
import type { Funnel, FunnelAnalytics } from '@/types/visitorAnalytics';

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function daysAgoIso(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function formatMs(ms: number | null): string {
  if (ms == null) return '—';
  if (ms < 1000) return `${ms}ms`;
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}

function pct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

export function FunnelBuilder() {
  const [funnels, setFunnels] = useState<Funnel[]>([]);
  const [funnelId, setFunnelId] = useState('');
  const [from, setFrom] = useState(daysAgoIso(30));
  const [to, setTo] = useState(todayIso());
  const [analytics, setAnalytics] = useState<FunnelAnalytics | null>(null);
  const [loading, setLoading] = useState(false);

  const loadFunnels = useCallback(async () => {
    try {
      const data = await listFunnels();
      const list = data.funnels || [];
      setFunnels(list);
      if (!funnelId && list.length) {
        const def = list.find((f) => f.is_default) || list[0];
        setFunnelId(def.id);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load funnels');
    }
  }, [funnelId]);

  const loadStats = useCallback(async () => {
    if (!funnelId) return;
    setLoading(true);
    try {
      const data = await getFunnelAnalytics(funnelId, from, to);
      setAnalytics(data.analytics);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load funnel stats');
      setAnalytics(null);
    } finally {
      setLoading(false);
    }
  }, [funnelId, from, to]);

  useEffect(() => {
    void loadFunnels();
  }, [loadFunnels]);

  useEffect(() => {
    if (funnelId) void loadStats();
  }, [funnelId, loadStats]);

  const maxSessions = Math.max(...(analytics?.steps.map((s) => s.sessions) || [1]), 1);

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold text-slate-900">Booking funnel</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="space-y-1.5 min-w-[200px] flex-1">
            <Label>Funnel</Label>
            <Select value={funnelId} onValueChange={setFunnelId}>
              <SelectTrigger>
                <SelectValue placeholder="Select funnel" />
              </SelectTrigger>
              <SelectContent>
                {funnels.map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.name}
                    {f.is_default ? ' (default)' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>From</Label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>To</Label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <Button onClick={() => void loadStats()} disabled={loading || !funnelId} className="bg-amber-600 hover:bg-amber-700">
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            Refresh
          </Button>
        </div>

        {analytics && (
          <div className="rounded-lg bg-amber-50 border border-amber-100 px-4 py-3 flex flex-wrap gap-4 text-sm">
            <span className="font-medium text-amber-900">{analytics.name}</span>
            <span className="text-amber-800">
              Overall conversion: <strong>{pct(analytics.overallConversion)}</strong>
            </span>
            <span className="text-amber-700 text-xs self-center">
              {analytics.from} → {analytics.to}
            </span>
          </div>
        )}

        {!analytics && !loading && (
          <p className="text-sm text-slate-500 py-8 text-center">
            {funnels.length === 0
              ? 'No funnels configured yet. Create one via the API or Settings.'
              : 'Select a funnel to view conversion stats.'}
          </p>
        )}

        {analytics && (
          <div className="space-y-4">
            {analytics.steps.map((step, i) => (
              <div key={`${step.name}-${i}`} className="border border-slate-100 rounded-lg p-4">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {i + 1}. {step.name}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">Event: {step.event}</p>
                  </div>
                  <div className="text-right text-sm">
                    <p className="font-semibold tabular-nums text-slate-900">{step.sessions} sessions</p>
                    <p className="text-xs text-slate-500">{step.visitors} visitors</p>
                  </div>
                </div>
                <Progress value={(step.sessions / maxSessions) * 100} className="h-2 mb-3" />
                <div className="flex flex-wrap gap-4 text-xs text-slate-600">
                  <span>
                    Conversion: <strong className="text-emerald-700">{pct(step.conversionFromPrevious)}</strong>
                  </span>
                  <span className="flex items-center gap-1">
                    <TrendingDown className="h-3 w-3 text-rose-500" />
                    Drop-off: <strong className="text-rose-600">{pct(step.dropoffFromPrevious)}</strong>
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Avg time: {formatMs(step.avgTimeFromPreviousMs)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default FunnelBuilder;
