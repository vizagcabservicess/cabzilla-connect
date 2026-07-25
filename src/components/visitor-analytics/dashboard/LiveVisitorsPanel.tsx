import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Monitor,
  Smartphone,
  Tablet,
  MapPin,
  Globe,
  User,
  UserCheck,
  Clock,
  Eye,
} from 'lucide-react';
import type { LiveVisitorSnapshot, DeviceType } from '@/types/visitorAnalytics';

function formatDuration(ms: number): string {
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  if (m < 60) return `${m}m ${r}s`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

function DeviceIcon({ type }: { type: DeviceType }) {
  switch (type) {
    case 'mobile':
      return <Smartphone className="h-4 w-4" />;
    case 'tablet':
      return <Tablet className="h-4 w-4" />;
    default:
      return <Monitor className="h-4 w-4" />;
  }
}

function shortPage(path: string): string {
  if (!path) return '/';
  try {
    if (path.startsWith('http')) {
      const u = new URL(path);
      return u.pathname + u.search;
    }
  } catch {
    // ignore
  }
  return path.length > 56 ? `${path.slice(0, 53)}…` : path;
}

interface LiveVisitorsPanelProps {
  visitors: LiveVisitorSnapshot[];
  loading?: boolean;
  onSelect?: (visitor: LiveVisitorSnapshot) => void;
  onWatch?: (visitor: LiveVisitorSnapshot) => void;
}

export function LiveVisitorsPanel({ visitors, loading, onSelect, onWatch }: LiveVisitorsPanelProps) {
  return (
    <Card className="border-slate-200 shadow-sm rounded-2xl overflow-hidden">
      <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0 border-b border-slate-100 bg-white">
        <CardTitle className="text-base font-semibold text-slate-900 flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
          </span>
          Live visitors
        </CardTitle>
        <Badge className="bg-emerald-50 text-emerald-800 hover:bg-emerald-50 border border-emerald-100 font-medium">
          {visitors.length} online
        </Badge>
      </CardHeader>
      <CardContent className="p-0">
        {loading && visitors.length === 0 ? (
          <p className="text-sm text-slate-500 py-12 text-center">Loading live visitors…</p>
        ) : visitors.length === 0 ? (
          <p className="text-sm text-slate-500 py-12 text-center">No visitors online right now</p>
        ) : (
          <ul className="divide-y divide-slate-100 max-h-[480px] overflow-y-auto">
            {visitors.map((v) => (
              <li key={`${v.visitorId}-${v.sessionId}`}>
                <div className="flex flex-col gap-3 px-4 py-3.5 transition-colors hover:bg-slate-50/80 sm:flex-row sm:items-center sm:justify-between">
                  <button
                    type="button"
                    onClick={() => onSelect?.(v)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                        <DeviceIcon type={v.deviceType} />
                      </span>
                      <span className="text-xs font-medium text-slate-600">
                        {v.browser || 'Browser'}
                      </span>
                      {v.isReturning ? (
                        <Badge className="bg-slate-100 text-slate-700 hover:bg-slate-100 gap-1 font-normal">
                          <UserCheck className="h-3 w-3" /> Returning
                        </Badge>
                      ) : (
                        <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 gap-1 font-normal">
                          <User className="h-3 w-3" /> New
                        </Badge>
                      )}
                    </div>
                    <p
                      className="mt-1.5 text-sm font-semibold text-slate-900 truncate"
                      title={v.currentPage}
                    >
                      {shortPage(v.currentPage)}
                    </p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                      <span className="inline-flex items-center gap-1 tabular-nums">
                        <Clock className="h-3 w-3" />
                        {formatDuration(v.timeOnPageMs)}
                      </span>
                      {(v.city || v.pincode || v.country) && (
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {[v.city, v.pincode, v.country].filter(Boolean).join(' · ')}
                        </span>
                      )}
                      {v.ipAddress && (
                        <span className="font-mono text-[11px] text-slate-600" title="Visitor IP">
                          {v.ipAddress}
                        </span>
                      )}
                      {v.trafficSource && (
                        <span className="inline-flex items-center gap-1">
                          <Globe className="h-3 w-3" />
                          {v.trafficSource}
                        </span>
                      )}
                    </div>
                  </button>
                  {onWatch && v.sessionId ? (
                    <Button
                      type="button"
                      size="sm"
                      className="shrink-0 bg-sky-600 hover:bg-sky-700 text-white"
                      onClick={() => onWatch(v)}
                    >
                      <Eye className="h-3.5 w-3.5 mr-1.5" />
                      Watch live
                    </Button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export default LiveVisitorsPanel;
