import React, { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import {
  getDailyReport,
  getMonthlyReport,
  getWeeklyReport,
} from '@/services/api/visitorAnalyticsAPI';
import type { AnalyticsReport, ReportTopItem } from '@/types/visitorAnalytics';

type Period = 'daily' | 'weekly' | 'monthly';

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function monthIso(): string {
  return new Date().toISOString().slice(0, 7);
}

function formatMs(ms: number): string {
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}

function itemLabel(item: ReportTopItem): string {
  return (
    item.page ||
    item.vehicle ||
    item.vehicle_category ||
    item.label ||
    item.campaign ||
    item.term ||
    '—'
  );
}

function TopTable({
  title,
  items,
  wrapLabels = false,
  maxHeightClass,
}: {
  title: string;
  items: ReportTopItem[];
  /** Show full label text (used for search keywords). */
  wrapLabels?: boolean;
  maxHeightClass?: string;
}) {
  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-slate-900">
          {title}
          {items.length > 0 ? (
            <span className="ml-2 text-xs font-normal text-slate-500">({items.length})</span>
          ) : null}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className={maxHeightClass ? `${maxHeightClass} overflow-y-auto` : undefined}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead className="text-right">Count</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={2} className="text-center text-slate-400 text-sm py-6">
                    No data
                  </TableCell>
                </TableRow>
              ) : (
                items.map((item, i) => (
                  <TableRow key={`${itemLabel(item)}-${i}`}>
                    <TableCell
                      className={
                        wrapLabels
                          ? 'text-sm whitespace-normal break-words max-w-none'
                          : 'text-sm max-w-[220px] truncate'
                      }
                      title={itemLabel(item)}
                    >
                      {itemLabel(item)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-medium align-top">
                      {Number(item.count).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

export function ReportsPanel() {
  const [period, setPeriod] = useState<Period>('daily');
  const [day, setDay] = useState(todayIso());
  const [weekEnd, setWeekEnd] = useState(todayIso());
  const [month, setMonth] = useState(monthIso());
  const [report, setReport] = useState<AnalyticsReport | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      let res: { report: AnalyticsReport };
      switch (period) {
        case 'daily':
          res = await getDailyReport(day);
          break;
        case 'weekly':
          res = await getWeeklyReport(weekEnd);
          break;
        case 'monthly':
          res = await getMonthlyReport(month);
          break;
        default: {
          const _exhaustive: never = period;
          throw new Error(`Unhandled period: ${_exhaustive}`);
        }
      }
      setReport(res.report);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load report');
      setReport(null);
    } finally {
      setLoading(false);
    }
  }, [period, day, weekEnd, month]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-4">
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <CardTitle className="text-base font-semibold text-slate-900">Reports</CardTitle>
            <Tabs value={period} onValueChange={(v) => setPeriod(v as Period)}>
              <TabsList>
                <TabsTrigger value="daily">Daily</TabsTrigger>
                <TabsTrigger value="weekly">Weekly</TabsTrigger>
                <TabsTrigger value="monthly">Monthly</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            {period === 'daily' && (
              <div className="space-y-1.5">
                <Label>Day</Label>
                <Input type="date" value={day} onChange={(e) => setDay(e.target.value)} />
              </div>
            )}
            {period === 'weekly' && (
              <div className="space-y-1.5">
                <Label>Week ending</Label>
                <Input type="date" value={weekEnd} onChange={(e) => setWeekEnd(e.target.value)} />
              </div>
            )}
            {period === 'monthly' && (
              <div className="space-y-1.5">
                <Label>Month</Label>
                <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
              </div>
            )}
            <Button onClick={() => void load()} disabled={loading} className="bg-amber-600 hover:bg-amber-700">
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
              Load report
            </Button>
          </div>

          {report && (
            <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-5 gap-3">
              {[
                { label: 'New visitors', value: report.visitorsNew },
                { label: 'Returning', value: report.visitorsReturning },
                { label: 'Sessions', value: report.sessions },
                { label: 'Pageviews', value: report.pageviews },
                { label: 'Avg session', value: formatMs(report.avgSessionMs) },
                { label: 'Chats', value: report.chats },
                { label: 'WhatsApp clicks', value: report.whatsappClicks ?? 0 },
                { label: 'Call clicks', value: report.phoneClicks ?? 0 },
                { label: 'Bookings started', value: report.bookingsStarted },
                { label: 'Completed', value: report.bookingsCompleted },
                { label: 'Payments', value: report.paymentsSuccess },
              ].map((m) => (
                <div key={m.label} className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                  <p className="text-[11px] uppercase tracking-wide text-slate-500">{m.label}</p>
                  <p className="text-lg font-semibold text-slate-900 tabular-nums">{m.value}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {report && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            <TopTable title="Top landing pages" items={report.topLandingPages || []} />
            <TopTable title="Top exit pages" items={report.topExitPages || []} />
            <TopTable title="Top vehicles" items={report.topVehicles || []} />
            <TopTable title="Top buttons" items={report.topButtons || []} />
            <TopTable title="Top campaigns" items={report.topCampaigns || []} />
          </div>
          <TopTable
            title="Search terms"
            items={report.topSearchTerms || []}
            wrapLabels
            maxHeightClass="max-h-[28rem]"
          />
        </div>
      )}
    </div>
  );
}

export default ReportsPanel;
