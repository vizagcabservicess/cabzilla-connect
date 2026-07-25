import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, RefreshCw, Phone, MessageCircle, CreditCard, CheckCircle2, FileText, Car } from 'lucide-react';
import { toast } from 'sonner';
import { getBookingAnalytics } from '@/services/api/visitorAnalyticsAPI';
import type { BookingAnalyticsResponse, BookingEventType } from '@/types/visitorAnalytics';

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function daysAgoIso(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

const EVENT_META: Record<
  BookingEventType | string,
  { label: string; icon: React.ReactNode; className: string }
> = {
  quote_request: {
    label: 'Quotes',
    icon: <FileText className="h-3.5 w-3.5" />,
    className: 'bg-slate-100 text-slate-700',
  },
  booking_form: {
    label: 'Forms',
    icon: <FileText className="h-3.5 w-3.5" />,
    className: 'bg-slate-100 text-slate-700',
  },
  booking_started: {
    label: 'Started',
    icon: <Car className="h-3.5 w-3.5" />,
    className: 'bg-amber-100 text-amber-800',
  },
  phone_call: {
    label: 'Phone',
    icon: <Phone className="h-3.5 w-3.5" />,
    className: 'bg-blue-100 text-blue-800',
  },
  whatsapp_click: {
    label: 'WhatsApp',
    icon: <MessageCircle className="h-3.5 w-3.5" />,
    className: 'bg-emerald-100 text-emerald-800',
  },
  payment_success: {
    label: 'Payment',
    icon: <CreditCard className="h-3.5 w-3.5" />,
    className: 'bg-orange-100 text-orange-800',
  },
  booking_completed: {
    label: 'Completed',
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
    className: 'bg-green-100 text-green-800',
  },
};

function pct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

export function BookingAnalyticsPanel() {
  const [from, setFrom] = useState(daysAgoIso(30));
  const [to, setTo] = useState(todayIso());
  const [data, setData] = useState<BookingAnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getBookingAnalytics(from, to);
      setData(res);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load booking analytics');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => {
    void load();
  }, [load]);

  const byCategoryPivot = useMemo(() => {
    if (!data) return [];
    const map = new Map<
      string,
      Record<string, number> & { vehicle: string; revenue: number }
    >();
    for (const row of data.byCategory || []) {
      let entry = map.get(row.vehicle_category);
      if (!entry) {
        entry = { vehicle: row.vehicle_category, revenue: 0 };
        map.set(row.vehicle_category, entry);
      }
      entry[row.event_type] = (entry[row.event_type] || 0) + Number(row.count);
      entry.revenue += Number(row.revenue) || 0;
    }
    return [...map.values()].sort((a, b) => b.revenue - a.revenue);
  }, [data]);

  const eventCols = [
    'quote_request',
    'booking_form',
    'booking_started',
    'phone_call',
    'whatsapp_click',
    'payment_success',
    'booking_completed',
  ];

  return (
    <div className="space-y-4">
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base font-semibold text-slate-900">
            Booking analytics
          </CardTitle>
          <div className="flex flex-wrap items-end gap-2">
            <div className="space-y-1">
              <Label className="text-xs">From</Label>
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-9" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">To</Label>
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-9" />
            </div>
            <Button size="sm" onClick={() => void load()} disabled={loading} className="bg-amber-600 hover:bg-amber-700 h-9">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-lg border border-slate-100">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vehicle category</TableHead>
                  {eventCols.map((col) => (
                    <TableHead key={col} className="text-center whitespace-nowrap">
                      <span className="inline-flex items-center gap-1">
                        {EVENT_META[col]?.icon}
                        {EVENT_META[col]?.label || col}
                      </span>
                    </TableHead>
                  ))}
                  <TableHead className="text-right">Revenue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {byCategoryPivot.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={eventCols.length + 2} className="text-center text-slate-500 py-8">
                      {loading ? 'Loading…' : 'No booking events in this range'}
                    </TableCell>
                  </TableRow>
                ) : (
                  byCategoryPivot.map((row) => (
                    <TableRow key={row.vehicle}>
                      <TableCell className="font-medium">{row.vehicle}</TableCell>
                      {eventCols.map((col) => (
                        <TableCell key={col} className="text-center tabular-nums">
                          {row[col] ? (
                            <Badge variant="secondary" className={EVENT_META[col]?.className}>
                              {row[col]}
                            </Badge>
                          ) : (
                            <span className="text-slate-300">0</span>
                          )}
                        </TableCell>
                      ))}
                      <TableCell className="text-right tabular-nums">
                        ₹{Math.round(row.revenue).toLocaleString('en-IN')}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-slate-900">Conversion by category</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-lg border border-slate-100">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Started</TableHead>
                  <TableHead className="text-right">Completed</TableHead>
                  <TableHead className="text-right">Paid</TableHead>
                  <TableHead className="text-right">Completion</TableHead>
                  <TableHead className="text-right">Payment rate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data?.conversion || []).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-slate-500 py-6">
                      No conversion data
                    </TableCell>
                  </TableRow>
                ) : (
                  (data?.conversion || []).map((row) => (
                    <TableRow key={row.vehicleCategory}>
                      <TableCell className="font-medium">{row.vehicleCategory}</TableCell>
                      <TableCell className="text-right tabular-nums">{row.started}</TableCell>
                      <TableCell className="text-right tabular-nums">{row.completed}</TableCell>
                      <TableCell className="text-right tabular-nums">{row.paid}</TableCell>
                      <TableCell className="text-right tabular-nums text-emerald-700">
                        {pct(row.completionRate)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-amber-700">
                        {pct(row.paymentRate)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default BookingAnalyticsPanel;
