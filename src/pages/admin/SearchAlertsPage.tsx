import React, { useCallback, useEffect, useMemo, useState } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
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
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { saveAs } from 'file-saver';
import { pdf } from '@react-pdf/renderer';
import { BellRing, Download, Eye, History, Loader2, RefreshCw, Search, Upload, CalendarPlus, Link2, MessageCircle } from 'lucide-react';
import { searchAlertsAPI, type SearchAlert } from '@/services/api/searchAlertsAPI';
import { ConvertToBookingModal } from '@/components/admin/ConvertToBookingModal';
import { smartBudgetAPI } from '@/services/api/smartBudgetAPI';
import {
  mapSearchAlertToSmartBudgetSession,
  smartBudgetCustomerSessionUrl,
  smartBudgetWhatsAppShareUrl,
  guestSearchWhatsAppChatUrl,
} from '@/utils/searchAlertSmartBudget';
import {
  buildSearchAlertExportRows,
  formatSearchAlertDateTime,
  searchAlertMatchesTerm,
  searchAlertsExportFileSuffix,
  searchAlertsToCsv,
} from '@/utils/adminSearchAlertsExport';
import { AdminSearchAlertsExportPDF } from '@/components/pdf/AdminSearchAlertsExportPDF';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

function formatRouteSummary(alert: SearchAlert): string {
  const parts: string[] = [];
  if (alert.distanceKmOneWay != null && alert.distanceKmOneWay > 0) {
    parts.push(`~${Math.round(alert.distanceKmOneWay)} km`);
  }
  if (alert.durationMinutesOneWay != null && alert.durationMinutesOneWay > 0) {
    const h = Math.floor(alert.durationMinutesOneWay / 60);
    const r = alert.durationMinutesOneWay % 60;
    parts.push(h > 0 ? (r > 0 ? `${h} hr ${r} min` : `${h} hr`) : `${r} min`);
  }
  if (parts.length === 0) return '—';
  return parts.join(' · ');
}

function formatResultsPreview(alert: SearchAlert): string {
  if (alert.vehicleFares?.length) {
    return alert.vehicleFares.map((v) => `${v.name}: ${v.fareText}`).join(' · ');
  }
  return alert.resultsShown || '—';
}

function getVehicleFareLines(alert: SearchAlert): Array<{ name: string; fareText: string }> {
  if (alert.vehicleFares?.length) {
    return alert.vehicleFares;
  }
  const text = alert.resultsShown?.trim();
  if (!text || text === '—') return [];
  return text.split(/\n| · /).map((part) => {
    const trimmed = part.trim();
    const match = trimmed.match(/^(.+?):\s*(.+)$/);
    if (match) {
      return { name: match[1].trim(), fareText: match[2].trim() };
    }
    return { name: trimmed, fareText: '—' };
  }).filter((v) => v.name);
}

export default function SearchAlertsPage() {
  const [alerts, setAlerts] = useState<SearchAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [tableReady, setTableReady] = useState(true);
  const [setupMessage, setSetupMessage] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [importOpen, setImportOpen] = useState(false);
  const [whatsappImportText, setWhatsappImportText] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<SearchAlert | null>(null);
  const [convertAlert, setConvertAlert] = useState<SearchAlert | null>(null);
  const [creatingSbAlertId, setCreatingSbAlertId] = useState<number | null>(null);

  const handleChatGuestWhatsApp = (alert: SearchAlert) => {
    const wa = guestSearchWhatsAppChatUrl({
      guestPhone: alert.guestPhone,
      pickup: alert.pickup,
      drop: alert.drop,
      departure: alert.departure,
      tripType: alert.tripType,
    });
    if (!wa) {
      toast.error('Guest number is not valid for WhatsApp');
      return;
    }
    window.open(wa, '_blank', 'noopener,noreferrer');
  };

  const handleCreateSmartBudgetLink = async (alert: SearchAlert) => {
    setCreatingSbAlertId(alert.id);
    try {
      const input = mapSearchAlertToSmartBudgetSession(alert);
      const session = await smartBudgetAPI.admin.createSession(input);
      const url = session.customer_url || smartBudgetCustomerSessionUrl(session.token);
      try {
        await navigator.clipboard.writeText(url);
        toast.success('Smart Budget link created and copied');
      } catch {
        toast.success('Smart Budget link created');
      }
      const wa = smartBudgetWhatsAppShareUrl({
        token: session.token,
        customerUrl: url,
        customerPhone: session.customer_phone || input.customer_phone,
      });
      window.open(wa, '_blank', 'noopener,noreferrer');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not create Smart Budget link');
    } finally {
      setCreatingSbAlertId(null);
    }
  };

  const showImportStats = (stats: { imported: number; duplicates: number; parsed?: number }) => {
    const parsed = stats.parsed != null ? ` from ${stats.parsed} message(s)` : '';
    toast.success(
      `Imported ${stats.imported} alert(s)${parsed}` +
        (stats.duplicates > 0 ? ` · ${stats.duplicates} duplicate(s) skipped` : '')
    );
  };

  const loadAlerts = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await searchAlertsAPI.list({
        from: dateFrom.trim() || undefined,
        to: dateTo.trim() || undefined,
        limit: 5000,
      });
      setAlerts(data.alerts ?? []);
      setTableReady(data.tableReady !== false);
      setSetupMessage(data.tableReady === false ? data.message ?? null : null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load search alerts');
      setAlerts([]);
    } finally {
      setIsLoading(false);
    }
  }, [dateFrom, dateTo]);

  useEffect(() => {
    void loadAlerts();
  }, [loadAlerts]);

  const filteredAlerts = useMemo(() => {
    if (!searchTerm.trim()) return alerts;
    return alerts.filter((a) => searchAlertMatchesTerm(a, searchTerm));
  }, [alerts, searchTerm]);

  const exportSuffix = searchAlertsExportFileSuffix(dateFrom, dateTo);

  const handleDownloadExcel = () => {
    if (filteredAlerts.length === 0) {
      toast.info('No search alerts to export');
      return;
    }
    const csv = searchAlertsToCsv(filteredAlerts);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    saveAs(blob, `vizag-search-alerts-${exportSuffix}.csv`);
    toast.success(`Downloaded ${filteredAlerts.length} alert(s) as Excel (CSV)`);
  };

  const handleDownloadPdf = async () => {
    if (filteredAlerts.length === 0) {
      toast.info('No search alerts to export');
      return;
    }
    setIsExportingPdf(true);
    try {
      const rows = buildSearchAlertExportRows(filteredAlerts).map((r) => ({
        searchedAt: r['Searched At'],
        guestPhone: r['Guest Phone'],
        pickup: r.Pickup.slice(0, 180),
        drop: r.Drop.slice(0, 180),
        tripType: r['Trip Type'].slice(0, 120),
        departure: r.Departure,
        route: r.Route,
        results: r['Results / Fares'].slice(0, 260),
      }));
      const blob = await pdf(
        <AdminSearchAlertsExportPDF
          title="Vizag Taxi Hub — Cab Search Alerts"
          generatedAt={new Date().toLocaleString('en-IN')}
          rows={rows}
        />
      ).toBlob();
      saveAs(blob, `vizag-search-alerts-${exportSuffix}.pdf`);
      toast.success(`Downloaded ${filteredAlerts.length} alert(s) as PDF`);
    } catch (e) {
      console.error(e);
      toast.error('Could not generate PDF');
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleImportFromLogs = async () => {
    setIsImporting(true);
    try {
      const { stats } = await searchAlertsAPI.importFromLogs();
      showImportStats(stats);
      await loadAlerts();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Import from server logs failed');
    } finally {
      setIsImporting(false);
    }
  };

  const handleImportFromWhatsApp = async () => {
    if (!whatsappImportText.trim()) {
      toast.error('Paste WhatsApp alert messages first');
      return;
    }
    setIsImporting(true);
    try {
      const { stats } = await searchAlertsAPI.importFromWhatsApp(whatsappImportText);
      showImportStats(stats);
      setImportOpen(false);
      setWhatsappImportText('');
      await loadAlerts();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Import from WhatsApp failed');
    } finally {
      setIsImporting(false);
    }
  };

  const handleWhatsAppFileUpload = async (file: File | undefined) => {
    if (!file) return;
    try {
      const text = await file.text();
      setWhatsappImportText(text);
      setImportOpen(true);
    } catch {
      toast.error('Could not read the uploaded file');
    }
  };

  return (
    <AdminLayout activeTab="search-alerts">
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <BellRing className="h-7 w-7 text-blue-600" />
              Search Alerts
            </h1>
            <p className="text-gray-500 mt-1">
              Guest cab searches sent to WhatsApp — search, filter, and export.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setImportOpen(true)}>
              <History className="h-4 w-4 mr-2" />
              Import past alerts
            </Button>
            <Button variant="outline" onClick={() => void handleImportFromLogs()} disabled={isImporting || !tableReady}>
              {isImporting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
              Import server logs
            </Button>
            <Button variant="outline" onClick={() => void loadAlerts()} disabled={isLoading}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
              Refresh
            </Button>
            <Button variant="outline" onClick={handleDownloadExcel} disabled={filteredAlerts.length === 0}>
              <Download className="h-4 w-4 mr-2" />
              Excel
            </Button>
            <Button onClick={() => void handleDownloadPdf()} disabled={isExportingPdf || filteredAlerts.length === 0}>
              {isExportingPdf ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Download className="h-4 w-4 mr-2" />}
              PDF
            </Button>
          </div>
        </div>

        {!tableReady && setupMessage ? (
          <Alert>
            <AlertTitle>Database setup required</AlertTitle>
            <AlertDescription>{setupMessage}</AlertDescription>
          </Alert>
        ) : null}

        <Alert>
          <AlertTitle>Import past WhatsApp alerts</AlertTitle>
          <AlertDescription>
            Older alerts live in your WhatsApp chat. Open the business WhatsApp thread, copy the
            &quot;New Cab Search Alert!&quot; messages (or export chat as .txt), then use{' '}
            <strong>Import past alerts</strong>. New searches are saved automatically after you deploy the updated API.
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              <div className="md:col-span-2 space-y-2">
                <Label htmlFor="search-alerts-search">Search</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="search-alerts-search"
                    placeholder="Phone, pickup, drop, trip type, vehicle…"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="search-alerts-from">From date</Label>
                <Input
                  id="search-alerts-from"
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="search-alerts-to">To date</Label>
                <Input
                  id="search-alerts-to"
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-lg">
              {isLoading ? 'Loading…' : `${filteredAlerts.length} alert(s)`}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="w-full">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Searched At</TableHead>
                    <TableHead>Guest</TableHead>
                    <TableHead>Pickup</TableHead>
                    <TableHead>Drop</TableHead>
                    <TableHead>Trip</TableHead>
                    <TableHead>Departure</TableHead>
                    <TableHead>Route</TableHead>
                    <TableHead className="min-w-[200px]">Results</TableHead>
                    <TableHead className="w-[220px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={9} className="py-10 text-center text-muted-foreground">
                        <Loader2 className="h-5 w-5 animate-spin inline-block mr-2" />
                        Loading search alerts…
                      </TableCell>
                    </TableRow>
                  ) : filteredAlerts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="py-10 text-center text-muted-foreground">
                        No search alerts found for the selected filters.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredAlerts.map((alert) => (
                      <TableRow
                        key={alert.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => setSelectedAlert(alert)}
                      >
                        <TableCell className="whitespace-nowrap text-sm">
                          {formatSearchAlertDateTime(alert.searchedAt)}
                        </TableCell>
                        <TableCell className="whitespace-nowrap font-medium">{alert.guestPhone}</TableCell>
                        <TableCell className="max-w-[180px] truncate" title={alert.pickup}>
                          {alert.pickup}
                        </TableCell>
                        <TableCell className="max-w-[180px] truncate" title={alert.drop}>
                          {alert.drop}
                        </TableCell>
                        <TableCell className="max-w-[160px] text-sm whitespace-pre-line">
                          {alert.tripType.split('\n')[0]}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm">{alert.departure || '—'}</TableCell>
                        <TableCell className="text-sm whitespace-nowrap">{formatRouteSummary(alert)}</TableCell>
                        <TableCell className="max-w-[220px]">
                          <div className="flex items-center gap-2">
                            <span className="text-sm truncate flex-1" title={formatResultsPreview(alert)}>
                              {formatResultsPreview(alert)}
                            </span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-7 shrink-0 px-2 text-blue-600"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedAlert(alert);
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1.5 sm:flex-row sm:flex-wrap sm:items-center">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-8 text-xs whitespace-nowrap border-emerald-600 text-emerald-800 hover:bg-emerald-50"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleChatGuestWhatsApp(alert);
                              }}
                            >
                              <MessageCircle className="h-3.5 w-3.5 mr-1" />
                              Chat guest
                            </Button>
                            <Button
                              type="button"
                              variant="default"
                              size="sm"
                              className="h-8 text-xs whitespace-nowrap bg-emerald-700 hover:bg-emerald-800"
                              disabled={creatingSbAlertId === alert.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                void handleCreateSmartBudgetLink(alert);
                              }}
                            >
                              {creatingSbAlertId === alert.id ? (
                                <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                              ) : (
                                <Link2 className="h-3.5 w-3.5 mr-1" />
                              )}
                              Smart Budget link
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-8 text-xs whitespace-nowrap"
                              onClick={(e) => {
                                e.stopPropagation();
                                setConvertAlert(alert);
                              }}
                            >
                              <CalendarPlus className="h-3.5 w-3.5 mr-1" />
                              Convert to Booking
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Import past search alerts</DialogTitle>
            <DialogDescription>
              Paste one or more WhatsApp &quot;New Cab Search Alert!&quot; messages below. You can copy them
              directly from WhatsApp or upload an exported .txt chat file.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Label htmlFor="whatsapp-import-text">WhatsApp messages</Label>
            <Textarea
              id="whatsapp-import-text"
              value={whatsappImportText}
              onChange={(e) => setWhatsappImportText(e.target.value)}
              placeholder={'Paste alert messages here…\n\nEach message should start with 🚖 New Cab Search Alert!'}
              className="min-h-[280px] font-mono text-sm"
            />
            <div>
              <Label htmlFor="whatsapp-import-file" className="mb-2 block">
                Or upload WhatsApp export (.txt)
              </Label>
              <Input
                id="whatsapp-import-file"
                type="file"
                accept=".txt,text/plain"
                onChange={(e) => void handleWhatsAppFileUpload(e.target.files?.[0])}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportOpen(false)} disabled={isImporting}>
              Cancel
            </Button>
            <Button onClick={() => void handleImportFromWhatsApp()} disabled={isImporting}>
              {isImporting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Import alerts
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConvertToBookingModal
        alert={convertAlert}
        open={!!convertAlert}
        onOpenChange={(open) => !open && setConvertAlert(null)}
      />

      <Dialog open={!!selectedAlert} onOpenChange={(open) => !open && setSelectedAlert(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          {selectedAlert ? (
            <>
              <DialogHeader>
                <DialogTitle>Search alert details</DialogTitle>
                <DialogDescription>
                  {formatSearchAlertDateTime(selectedAlert.searchedAt)} · {selectedAlert.guestPhone}
                </DialogDescription>
              </DialogHeader>
              <dl className="grid gap-3 text-sm">
                <div>
                  <dt className="font-medium text-muted-foreground">Pickup</dt>
                  <dd>{selectedAlert.pickup || '—'}</dd>
                </div>
                <div>
                  <dt className="font-medium text-muted-foreground">Drop</dt>
                  <dd>{selectedAlert.drop || '—'}</dd>
                </div>
                <div>
                  <dt className="font-medium text-muted-foreground">Trip</dt>
                  <dd className="whitespace-pre-line">{selectedAlert.tripType.split('\n')[0] || '—'}</dd>
                </div>
                <div>
                  <dt className="font-medium text-muted-foreground">Departure</dt>
                  <dd>{selectedAlert.departure || '—'}</dd>
                </div>
                <div>
                  <dt className="font-medium text-muted-foreground">Route</dt>
                  <dd>{formatRouteSummary(selectedAlert)}</dd>
                </div>
              </dl>
              <div className="mt-2">
                <p className="text-sm font-medium text-muted-foreground mb-2">Vehicle fares</p>
                {getVehicleFareLines(selectedAlert).length > 0 ? (
                  <ul className="rounded-md border divide-y max-h-[320px] overflow-y-auto">
                    {getVehicleFareLines(selectedAlert).map((v, i) => (
                      <li key={`${v.name}-${i}`} className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm">
                        <span className="font-medium">{v.name}</span>
                        <span className="tabular-nums text-gray-900 shrink-0">{v.fareText}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground rounded-md border px-3 py-2">
                    {selectedAlert.resultsShown || 'No fare details recorded'}
                  </p>
                )}
              </div>
              <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  className="bg-emerald-700 hover:bg-emerald-800"
                  onClick={() => handleChatGuestWhatsApp(selectedAlert)}
                >
                  <MessageCircle className="h-4 w-4 mr-1.5" />
                  Chat guest on WhatsApp
                </Button>
                <Button variant="outline" onClick={() => setSelectedAlert(null)}>
                  Close
                </Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
