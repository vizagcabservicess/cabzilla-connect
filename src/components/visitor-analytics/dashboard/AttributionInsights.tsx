import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Monitor, Smartphone, Tablet, MapPin, Megaphone } from 'lucide-react';
import type { AdsClickRisk, AttributionReport } from '@/types/visitorAnalytics';

function RiskBadge({ risk }: { risk: AdsClickRisk }) {
  if (risk === 'high') {
    return (
      <Badge className="bg-red-100 text-red-800 hover:bg-red-100 font-medium">High</Badge>
    );
  }
  if (risk === 'medium') {
    return (
      <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 font-medium">
        Medium
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className="font-medium">
      Low
    </Badge>
  );
}

interface AttributionInsightsProps {
  report: AttributionReport | null;
  loading?: boolean;
}

function DeviceIcon({ device }: { device: string }) {
  if (device === 'mobile') return <Smartphone className="h-5 w-5" />;
  if (device === 'tablet') return <Tablet className="h-5 w-5" />;
  return <Monitor className="h-5 w-5" />;
}

function formatPct(n: number): string {
  return `${n.toFixed(n % 1 === 0 ? 0 : 1)}%`;
}

function EmptyRow({ cols, loading }: { cols: number; loading?: boolean }) {
  return (
    <TableRow>
      <TableCell colSpan={cols} className="text-center text-slate-500 py-6 text-sm">
        {loading ? 'Loading…' : 'No data for this range'}
      </TableCell>
    </TableRow>
  );
}

const PREVIEW = 6;
const LIST_SCROLL = 'w-full max-h-[260px] overflow-auto';

function ViewAllToggle({
  expanded,
  onToggle,
  total,
  preview = PREVIEW,
}: {
  expanded: boolean;
  onToggle: () => void;
  total: number;
  preview?: number;
}) {
  if (total <= preview) return null;
  return (
    <div className="mt-2 flex justify-end">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-7 text-xs text-sky-700 hover:text-sky-900"
        onClick={onToggle}
      >
        {expanded ? 'Show less' : `View all (${total})`}
      </Button>
    </div>
  );
}

export function AttributionInsights({ report, loading }: AttributionInsightsProps) {
  const devices = report?.deviceBreakdown || [];
  const sources = report?.trafficSources || [];
  const campaigns = report?.googleAdsCampaigns || [];
  const cities = report?.cityBreakdown || [];
  const adsQuality = report?.adsClickQualityByCity || [];
  const suspiciousIps = report?.suspiciousAdsIps || [];

  const [showAllSources, setShowAllSources] = useState(false);
  const [showAllCities, setShowAllCities] = useState(false);
  const [showAllCampaigns, setShowAllCampaigns] = useState(false);
  const [showAllAdsQ, setShowAllAdsQ] = useState(false);
  const [showAllIps, setShowAllIps] = useState(false);

  const deviceTotal = useMemo(
    () => devices.reduce((sum, d) => sum + d.visitors, 0) || 1,
    [devices],
  );
  const sourceMax = useMemo(
    () => Math.max(1, ...sources.map((s) => s.visitors)),
    [sources],
  );
  const campaignMax = useMemo(
    () => Math.max(1, ...campaigns.map((c) => c.visitors)),
    [campaigns],
  );
  const cityMax = useMemo(
    () => Math.max(1, ...cities.map((c) => c.visitors)),
    [cities],
  );

  const visibleSources = showAllSources ? sources : sources.slice(0, PREVIEW);
  const visibleCities = showAllCities ? cities : cities.slice(0, PREVIEW);
  const visibleCampaigns = showAllCampaigns ? campaigns : campaigns.slice(0, PREVIEW);
  const visibleAdsQ = showAllAdsQ ? adsQuality : adsQuality.slice(0, PREVIEW);
  const visibleIps = showAllIps ? suspiciousIps : suspiciousIps.slice(0, PREVIEW);

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Devices</h3>
            <p className="text-xs text-slate-500">Share of visitors and booking conversion</p>
          </div>
          {loading ? <span className="text-xs text-slate-400">Loading…</span> : null}
        </div>
        {!devices.length && !loading ? (
          <p className="text-sm text-slate-500 py-4 text-center">No device data for this range</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {devices.map((row) => {
              const share = Math.round((row.visitors / deviceTotal) * 100);
              return (
                <div
                  key={row.device}
                  className="relative overflow-hidden rounded-xl border border-slate-100 bg-gradient-to-b from-slate-50/80 to-white px-4 py-3.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 text-slate-700">
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-700">
                        <DeviceIcon device={row.device} />
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{row.label}</p>
                        <p className="text-[11px] text-slate-500">{share}% of traffic</p>
                      </div>
                    </div>
                    <p className="text-2xl font-semibold tabular-nums tracking-tight text-slate-900">
                      {row.visitors}
                    </p>
                  </div>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-sky-500/80 transition-all"
                      style={{ width: `${share}%` }}
                    />
                  </div>
                  <div className="mt-2 flex justify-between text-[11px] text-slate-500">
                    <span>
                      Bookings{' '}
                      <span className="font-medium text-slate-700 tabular-nums">{row.bookings}</span>
                    </span>
                    <span>
                      Conv.{' '}
                      <span className="font-medium text-slate-700 tabular-nums">
                        {formatPct(row.conversion)}
                      </span>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border-slate-200 shadow-sm rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-900">Traffic sources</CardTitle>
            <p className="text-xs text-slate-500">Where visitors came from</p>
          </CardHeader>
          <CardContent className="pt-0">
            <div className={showAllSources ? LIST_SCROLL : undefined}>
              {!sources.length ? (
                <p className="text-sm text-slate-500 py-8 text-center">
                  {loading ? 'Loading…' : 'No data for this range'}
                </p>
              ) : (
                <ul className="space-y-2.5 pr-1">
                  {visibleSources.map((row) => {
                    const width = Math.max(4, Math.round((row.visitors / sourceMax) * 100));
                    return (
                      <li key={row.source}>
                        <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
                          <span className="font-medium text-slate-900 truncate">{row.source}</span>
                          <span className="shrink-0 tabular-nums text-slate-600">
                            {row.visitors}
                            <span className="text-slate-400">
                              {' '}
                              · {row.bookings} book · {formatPct(row.conversion)}
                            </span>
                          </span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-emerald-500/75"
                            style={{ width: `${width}%` }}
                          />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
            <ViewAllToggle
              expanded={showAllSources}
              onToggle={() => setShowAllSources((v) => !v)}
              total={sources.length}
            />
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-900">Cities & pincodes</CardTitle>
            <p className="text-xs text-slate-500">
              City from IP (PIN is approximate, not the visitor’s real address)
            </p>
          </CardHeader>
          <CardContent className="pt-0">
            <div className={showAllCities ? LIST_SCROLL : undefined}>
              {!cities.length ? (
                <p className="text-sm text-slate-500 py-8 text-center">
                  {loading ? 'Loading…' : 'No data for this range'}
                </p>
              ) : (
                <ul className="space-y-2.5 pr-1">
                  {visibleCities.map((row) => {
                    const width = Math.max(4, Math.round((row.visitors / cityMax) * 100));
                    return (
                      <li key={`${row.city}-${row.pincode || ''}`}>
                        <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
                          <span className="flex min-w-0 items-center gap-1.5 font-medium text-slate-900">
                            <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                            <span className="truncate">
                              {row.city}
                              {row.pincode ? (
                                <span className="font-normal text-slate-500"> · {row.pincode}</span>
                              ) : null}
                            </span>
                          </span>
                          <span className="shrink-0 tabular-nums text-slate-600">
                            {row.visitors}
                            <span className="text-slate-400"> · {row.bookings} book</span>
                          </span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-amber-500/70"
                            style={{ width: `${width}%` }}
                          />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
            <ViewAllToggle
              expanded={showAllCities}
              onToggle={() => setShowAllCities((v) => !v)}
              total={cities.length}
            />
          </CardContent>
        </Card>
      </div>

      {/* Campaigns + decorative side panel */}
      <Card className="border-slate-200 shadow-sm rounded-2xl overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div className="p-4 sm:p-5">
            <div className="mb-3">
              <h3 className="text-sm font-semibold text-slate-900">Google Ads campaigns</h3>
              <p className="text-xs text-slate-500">
                From utm_campaign / gclid — which ads drive bookings
              </p>
            </div>
            <div className={showAllCampaigns ? LIST_SCROLL : undefined}>
              {!campaigns.length ? (
                <p className="text-sm text-slate-500 py-8 text-center">
                  {loading ? 'Loading…' : 'No data for this range'}
                </p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {visibleCampaigns.map((row) => {
                    const width = Math.max(4, Math.round((row.visitors / campaignMax) * 100));
                    return (
                      <li
                        key={row.campaign}
                        className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 py-2.5 first:pt-0 last:pb-0"
                      >
                        <div className="min-w-0">
                          <p
                            className="truncate text-sm font-medium text-slate-900"
                            title={row.campaign}
                          >
                            {row.campaign}
                          </p>
                          <div className="mt-1.5 h-1.5 max-w-md overflow-hidden rounded-full bg-slate-100">
                            <div
                              className="h-full rounded-full bg-teal-600/70"
                              style={{ width: `${width}%` }}
                            />
                          </div>
                        </div>
                        <div className="shrink-0 text-right text-sm tabular-nums">
                          <p className="font-semibold text-slate-900">{row.visitors}</p>
                          <p className="text-[11px] text-slate-500">{row.bookings} bookings</p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
            <ViewAllToggle
              expanded={showAllCampaigns}
              onToggle={() => setShowAllCampaigns((v) => !v)}
              total={campaigns.length}
            />
          </div>
          <aside className="relative hidden lg:flex flex-col justify-end overflow-hidden border-l border-sky-100 bg-gradient-to-br from-sky-50 via-sky-100/60 to-teal-50 p-6">
            <div className="pointer-events-none absolute -right-8 -top-8 h-36 w-36 rounded-full bg-sky-200/40 blur-2xl" />
            <div className="pointer-events-none absolute bottom-4 left-4 h-24 w-24 rounded-full bg-teal-200/30 blur-xl" />
            <div className="relative z-10">
              <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-white/80 text-sky-700 shadow-sm">
                <Megaphone className="h-5 w-5" />
              </span>
              <p className="text-base font-semibold text-slate-900 leading-snug">
                Track which campaigns bring the most bookings
              </p>
              <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                Compare visitors and conversions by campaign to cut waste and scale winners.
              </p>
            </div>
          </aside>
        </div>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card className="border-slate-200 shadow-sm rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-900">
              Ads click quality by city
            </CardTitle>
            <p className="text-xs text-slate-500">
              Google Ads only — short bounces (under 3s) and no bookings often mean low-quality or
              fake clicks
            </p>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="w-full max-h-[280px] overflow-auto rounded-xl border border-slate-100">
              <table className="w-max min-w-full caption-bottom text-sm">
                <TableHeader className="sticky top-0 z-10 bg-white">
                  <TableRow>
                    <TableHead className="whitespace-nowrap">Risk</TableHead>
                    <TableHead className="whitespace-nowrap">City</TableHead>
                    <TableHead className="whitespace-nowrap text-right">Ads clicks</TableHead>
                    <TableHead className="whitespace-nowrap text-right">Bounce %</TableHead>
                    <TableHead className="whitespace-nowrap text-right">Avg sec</TableHead>
                    <TableHead className="whitespace-nowrap text-right">Bookings</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!adsQuality.length ? (
                    <EmptyRow cols={6} loading={loading} />
                  ) : (
                    visibleAdsQ.map((row) => (
                      <TableRow key={`${row.city}-${row.pincode || ''}-adsq`}>
                        <TableCell className="whitespace-nowrap">
                          <RiskBadge risk={row.risk} />
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm font-medium">
                          {row.city}
                          {row.pincode ? (
                            <span className="ml-1 text-xs font-normal text-slate-500 tabular-nums">
                              ~{row.pincode}
                            </span>
                          ) : null}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-right tabular-nums text-sm">
                          {row.adsClicks}
                          <span className="ml-1 text-[11px] text-slate-400">
                            {row.uniqueIps} IPs
                          </span>
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-right tabular-nums text-sm">
                          {formatPct(row.bounceRate)}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-right tabular-nums text-sm">
                          {row.avgDurationSec}s
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-right tabular-nums text-sm">
                          {row.bookings}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </table>
            </div>
            <ViewAllToggle
              expanded={showAllAdsQ}
              onToggle={() => setShowAllAdsQ((v) => !v)}
              total={adsQuality.length}
            />
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-900">Suspicious Ads IPs</CardTitle>
            <p className="text-xs text-slate-500">
              Fake clicks often come from datacenter / VPN IPs — exclude these IPs in Google Ads
            </p>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="w-full max-h-[280px] overflow-auto rounded-xl border border-slate-100">
              <table className="w-max min-w-full caption-bottom text-sm">
                <TableHeader className="sticky top-0 z-10 bg-white">
                  <TableRow>
                    <TableHead className="whitespace-nowrap">Risk</TableHead>
                    <TableHead className="whitespace-nowrap">IP</TableHead>
                    <TableHead className="whitespace-nowrap">Area / ISP</TableHead>
                    <TableHead className="whitespace-nowrap">Flags</TableHead>
                    <TableHead className="whitespace-nowrap text-right">Clicks</TableHead>
                    <TableHead className="whitespace-nowrap text-right">Bounce %</TableHead>
                    <TableHead className="whitespace-nowrap text-right">Bookings</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!suspiciousIps.length ? (
                    <EmptyRow cols={7} loading={loading} />
                  ) : (
                    visibleIps.map((row) => (
                      <TableRow key={row.ip}>
                        <TableCell className="whitespace-nowrap">
                          <RiskBadge risk={row.risk} />
                        </TableCell>
                        <TableCell
                          className="whitespace-nowrap text-xs font-mono text-slate-800"
                          title={row.ip}
                        >
                          {row.ip}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm">
                          <div>
                            {row.city}
                            {row.pincode ? (
                              <span className="text-slate-500"> · ~{row.pincode}</span>
                            ) : null}
                          </div>
                          {row.isp ? (
                            <div className="text-[11px] text-slate-500" title={row.isp}>
                              {row.isp}
                            </div>
                          ) : null}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-xs text-slate-600">
                          {(row.flags || []).length ? (row.flags || []).join(', ') : '—'}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-right tabular-nums text-sm">
                          {row.adsClicks}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-right tabular-nums text-sm">
                          {formatPct(row.bounceRate)}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-right tabular-nums text-sm">
                          {row.bookings}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </table>
            </div>
            <ViewAllToggle
              expanded={showAllIps}
              onToggle={() => setShowAllIps((v) => !v)}
              total={suspiciousIps.length}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default AttributionInsights;
