import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import AdminLayout from '@/components/admin/AdminLayout';
import { EventListFilters } from '@/components/admin/events/EventListFilters';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { printHtmlReport } from '@/lib/eventDutyReportPdf';
import { eventDutyAPI } from '@/services/api/eventDutyAPI';
import { DutyDuration, DutyStamp } from '@/components/admin/events/DutyReportDetails';
import { AskDriverEndButton } from '@/components/events/AskDriverEndButton';
import { ContinueDutyButton } from '@/components/events/ContinueDutyButton';
import {
  billableDutyEnd,
  dutyClosingTime,
  downloadCsv,
  dutySlipMessage,
  dutyStatusLabel,
  escapeHtml,
  eventShareMessage,
  formatDutyDate,
  formatGps,
  formatReportDutyDuration,
  formatReportingTime,
  formatServerDateTime,
  isRegisteredEventVehicle,
  reportDutyStart,
  shareListStats,
  todayIsoDate,
  whatsappUrl,
} from '@/lib/eventDuty';
import type { EventDuty, VthEvent } from '@/types/eventDuty';

export default function EventDailyReportPage() {
  const { eventId } = useParams();
  const id = Number(eventId);
  const [params, setParams] = useSearchParams();
  const date = params.get('date') || todayIsoDate();
  const [event, setEvent] = useState<VthEvent | null>(null);
  const [duties, setDuties] = useState<EventDuty[]>([]);
  const [vehicle, setVehicle] = useState('all');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!id) return;
    eventDutyAPI.dailyReport(id, date).then((res) => {
      setEvent(res.event);
      setDuties((res.duties || []).filter((duty) => duty.status !== 'cancelled' && isRegisteredEventVehicle(duty.vehicleNumber)));
    }).catch((err) => toast.error(err instanceof Error ? err.message : 'Unable to load report'));
  }, [id, date, reloadKey]);

  const vehicleOptions = [...new Set(duties.map((d) => (d.vehicleNumber || '').trim()).filter(Boolean))].sort();
  const rows = duties.filter((d) => vehicle === 'all' || (d.vehicleNumber || '') === vehicle);
  const stats = shareListStats(rows, date);

  const exportPdf = () => {
    printHtmlReport(
      `vth-daily-${event?.eventCode || id}-${date}`,
      `Daily report · ${event?.name || 'Event'}`,
      `<table><thead><tr>
        <th class="sl">SL.No</th><th>Vehicle</th><th>Driver</th><th>Opening KM</th><th>Closing KM</th><th>Total KM</th>
        <th>Reporting time</th><th>Reported</th><th>Report location</th><th>Closing time</th><th>Odometer uploaded</th><th>Close location</th><th>Total Time</th><th>Status</th>
      </tr></thead><tbody>${rows.map((d, index) => `<tr>
        <td class="sl">${index + 1}</td>
        <td>${escapeHtml(d.vehicleNumber || d.vehicleTypeLabel)}</td>
        <td>${escapeHtml(d.driverName)}</td>
        <td>${escapeHtml(d.openingKm)}</td>
        <td>${escapeHtml(d.closingKm)}</td>
        <td>${escapeHtml(d.totalKm)}</td>
        <td>${escapeHtml(formatReportingTime(d.reportingTime) || '—')}</td>
        <td>${escapeHtml(formatServerDateTime(d.openingAt))}</td>
        <td>${escapeHtml(formatGps(d.openingGps))}</td>
        <td>${escapeHtml(formatServerDateTime(dutyClosingTime(d.closingAt, d.endRequestedAt)))}</td>
        <td>${escapeHtml(formatServerDateTime(d.closingAt))}</td>
        <td>${escapeHtml(formatGps(d.closingGps))}</td>
        <td>${escapeHtml(formatReportDutyDuration(d))}</td>
        <td>${escapeHtml(dutyStatusLabel(d.status))}</td>
      </tr>`).join('')}</tbody></table>`,
      `${formatDutyDate(date)} · ${rows.length} vehicle(s)`,
    );
  };

  const exportCsv = () => {
    downloadCsv(
      `vth-daily-${event?.eventCode || id}-${date}.csv`,
      ['Vehicle', 'Driver', 'Opening KM', 'Closing KM', 'Total KM', 'Reporting time', 'Reported At', 'Report location', 'Closing time', 'Odometer uploaded', 'Close location', 'Total Time', 'Status'],
      rows.map((d) => [
        d.vehicleNumber || d.vehicleTypeLabel || '',
        d.driverName || '',
        d.openingKm ?? '',
        d.closingKm ?? '',
        d.totalKm ?? '',
        formatReportingTime(d.reportingTime),
        d.openingAt || '',
        formatGps(d.openingGps),
        dutyClosingTime(d.closingAt, d.endRequestedAt) || '',
        d.closingAt || '',
        formatGps(d.closingGps),
        formatReportDutyDuration(d),
        dutyStatusLabel(d.status),
      ]),
    );
  };

  return (
    <AdminLayout activeTab="events">
      <div className="space-y-4 p-4 md:p-6 print:p-0">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 print:hidden">
          <div>
            <Link to={`/admin/events/${id}`} className="text-sm text-blue-600">← Event</Link>
            <h1 className="text-2xl font-bold">Daily report</h1>
            <p className="text-muted-foreground">{event?.name} · {formatDutyDate(date)}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Input type="date" className="w-auto" value={date} onChange={(e) => setParams({ date: e.target.value })} />
            <Button variant="outline" onClick={() => window.print()}>Print</Button>
            <Button variant="outline" onClick={exportCsv}>Export Excel</Button>
            <Button variant="outline" disabled={rows.length === 0} onClick={exportPdf}>Download PDF</Button>
            <Button variant="outline" asChild>
              <a href={whatsappUrl(eventShareMessage(event?.name || 'Event', `${window.location.origin}/event/share/`))} target="_blank" rel="noreferrer">Share</a>
            </Button>
          </div>
        </div>

        <EventListFilters
          vehicles={vehicleOptions}
          value={{ vehicle, from: date, to: date }}
          onChange={(next) => {
            setVehicle(next.vehicle);
            const nextDate = next.from !== date ? next.from : next.to;
            if (nextDate && nextDate !== date) setParams({ date: nextDate });
          }}
        />

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Card><CardHeader className="pb-1"><CardTitle className="text-xs">Total vehicles</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{stats?.totalVehicles ?? 0}</CardContent></Card>
          <Card><CardHeader className="pb-1"><CardTitle className="text-xs">Started</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{stats?.started ?? 0}</CardContent></Card>
          <Card><CardHeader className="pb-1"><CardTitle className="text-xs">Completed</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{stats?.completed ?? 0}</CardContent></Card>
          <Card><CardHeader className="pb-1"><CardTitle className="text-xs">In progress</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{stats?.inProgress ?? 0}</CardContent></Card>
          <Card><CardHeader className="pb-1"><CardTitle className="text-xs">Pending</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{stats?.pending ?? 0}</CardContent></Card>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Vehicle</TableHead>
              <TableHead>Driver</TableHead>
              <TableHead>Opening KM</TableHead>
              <TableHead>Closing KM</TableHead>
              <TableHead>Total KM</TableHead>
              <TableHead>Reporting time</TableHead>
              <TableHead>Reported</TableHead>
              <TableHead>Closing Time</TableHead>
              <TableHead>Odometer uploaded</TableHead>
              <TableHead>Total Time</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="print:hidden"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((d) => (
              <TableRow key={d.id}>
                <TableCell>{d.vehicleNumber || d.vehicleTypeLabel}</TableCell>
                <TableCell>{d.driverName || '—'}</TableCell>
                <TableCell>{d.openingKm ?? '—'}</TableCell>
                <TableCell>{d.closingKm ?? '—'}</TableCell>
                <TableCell>{d.totalKm ?? '—'}</TableCell>
                <TableCell>{formatReportingTime(d.reportingTime) || '—'}</TableCell>
                <TableCell>
                  <DutyStamp label="Reported" at={d.openingAt} gps={d.openingGps} />
                </TableCell>
                <TableCell>{formatServerDateTime(dutyClosingTime(d.closingAt, d.endRequestedAt))}</TableCell>
                <TableCell>
                  <DutyStamp label="Uploaded" at={d.closingAt} gps={d.closingGps} />
                </TableCell>
                <TableCell>
                  <DutyDuration start={reportDutyStart(d)} end={billableDutyEnd(d.closingAt, d.endRequestedAt)} pausedSeconds={d.pausedSeconds} />
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">{dutyStatusLabel(d.status)}</Badge>
                  {d.status === 'in_progress' && d.endRequestedAt ? (
                    <div className="mt-1 text-[11px] font-medium text-amber-700">
                      {d.endRequestSeenAt ? 'Driver saw the end request' : 'Asked to end'}
                    </div>
                  ) : null}
                </TableCell>
                <TableCell className="print:hidden space-x-1">
                  <AskDriverEndButton
                    appearance="admin"
                    dutyId={d.id}
                    status={d.status}
                    endRequestedAt={d.endRequestedAt}
                    onDone={() => setReloadKey((n) => n + 1)}
                  />
                  <ContinueDutyButton
                    appearance="admin"
                    dutyId={d.id}
                    status={d.status}
                    openingAt={d.openingAt}
                    closingAt={d.closingAt}
                    onDone={() => setReloadKey((n) => n + 1)}
                  />
                  <Button size="sm" variant="outline" onClick={() => { void eventDutyAPI.openAuthedFile(eventDutyAPI.dutySlipUrl(d.id)); }}>PDF</Button>
                  <Button size="sm" variant="ghost" asChild>
                    <a href={whatsappUrl(dutySlipMessage({
                      vehicleNumber: d.vehicleNumber,
                      date: formatDutyDate(d.dutyDate),
                      driverName: d.driverName,
                      totalKm: d.totalKm,
                      url: eventDutyAPI.dutySlipUrl(d.id),
                    }))} target="_blank" rel="noreferrer">WA</a>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={12} className="text-sm text-muted-foreground">No duties in this filter.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </AdminLayout>
  );
}
