import React, { useCallback, useEffect, useMemo, useState } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Bot, Loader2, Terminal } from 'lucide-react';
import { toast } from 'sonner';
import {
  aiBookingAPI,
  AI_SHEET_TAB_STORAGE_KEY,
  defaultAiSheetTabName,
  formatPickupDateDisplay,
  formatRupee,
  readStoredAiSheetTab,
  type ParsedBooking,
  validateBookingClient,
} from '@/services/api/aiBookingAPI';
import { describeParseErrors } from '@/utils/bookingParser';
import { applyExplicitFare, applyRouteFromText, applySightseeingFromText } from '@/utils/bookingTripTerms';

const PREVIEW_FIELDS: Array<{ key: keyof ParsedBooking; label: string; format?: 'date' | 'rupee' }> = [
  { key: 'customer_name', label: 'Customer Name' },
  { key: 'customer_mobile', label: 'Customer Mobile' },
  { key: 'pickup_location', label: 'Pickup Location' },
  { key: 'drop_location', label: 'Drop Location' },
  { key: 'trip_type', label: 'Trip Type' },
  { key: 'pickup_date', label: 'Pickup Date', format: 'date' },
  { key: 'return_date', label: 'Return Date', format: 'date' },
  { key: 'pickup_time', label: 'Pickup Time' },
  { key: 'vehicle_type', label: 'Vehicle Type' },
  { key: 'seating_capacity', label: 'Seating Capacity' },
  { key: 'cost', label: 'Cost', format: 'rupee' },
  { key: 'advance_received', label: 'Advance', format: 'rupee' },
  { key: 'hourly_package', label: 'Package' },
  { key: 'payment_mode', label: 'Payment Mode' },
  { key: 'manager_name', label: 'Manager Name' },
  { key: 'manager_mobile', label: 'Manager Mobile' },
];

function formatFieldValue(
  key: keyof ParsedBooking,
  value: ParsedBooking[keyof ParsedBooking],
  format?: 'date' | 'rupee'
): string {
  if (value === '' || value === null || value === undefined) return '—';
  if (format === 'date' && typeof value === 'string') return formatPickupDateDisplay(value);
  if (format === 'rupee' && typeof value === 'number') return formatRupee(value);
  return String(value);
}

export default function AIAssistantPage() {
  const [rawText, setRawText] = useState('');
  const [parsed, setParsed] = useState<ParsedBooking | null>(null);
  const [parsedBookings, setParsedBookings] = useState<ParsedBooking[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [parsedLocally, setParsedLocally] = useState(false);
  const [localParseReason, setLocalParseReason] = useState<'development' | 'api_unavailable' | null>(null);
  const [parseApiError, setParseApiError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);
  const [sheetWarningBanner, setSheetWarningBanner] = useState<string | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [isTestingSheets, setIsTestingSheets] = useState(false);
  const [lastInvoiceNo, setLastInvoiceNo] = useState<number | null>(null);
  const [sheetTabName, setSheetTabName] = useState(readStoredAiSheetTab);

  useEffect(() => {
    try {
      localStorage.setItem(AI_SHEET_TAB_STORAGE_KEY, sheetTabName.trim());
    } catch {
      // ignore storage errors
    }
  }, [sheetTabName]);

  const sheetTabTrimmed = sheetTabName.trim();
  const sheetTabMissing = sheetTabTrimmed === '';

  const [commandText, setCommandText] = useState('');
  const [commandOutput, setCommandOutput] = useState<string | null>(null);
  const [commandTable, setCommandTable] = useState<Record<string, unknown>[] | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);

  const missingRequired = useMemo(() => {
    if (!parsed) return [];
    return validateBookingClient(parsed);
  }, [parsed]);

  const handleParse = useCallback(async () => {
    if (!rawText.trim()) {
      toast.error('Paste booking details first');
      return;
    }
    setIsParsing(true);
    setSuccessBanner(null);
    setErrorBanner(null);
    try {
      const res = await aiBookingAPI.parseBooking(rawText);
      if (!res.success || !res.data) {
        setErrorBanner(res.errors?.join(', ') || 'Could not parse — use the full WhatsApp booking format.');
        setShowPreview(false);
        return;
      }
      const bookings = (res.bookings && res.bookings.length > 0 ? res.bookings : [res.data]).map((booking) => {
        applyExplicitFare(booking, rawText);
        applyRouteFromText(booking, rawText);
        applySightseeingFromText(booking, rawText);
        return booking;
      });
      setParsed(bookings[0]);
      setParsedBookings(bookings);
      setParseErrors(res.parse_errors ?? []);
      setParsedLocally(!!res.parsed_locally);
      setLocalParseReason(res.local_parse_reason ?? null);
      setParseApiError(res.api_error ?? null);
      setShowPreview(true);
      if ((res.parse_errors?.length ?? 0) > 0) {
        toast.info(`Partial parse — missing: ${describeParseErrors(res.parse_errors ?? [])}`);
      }
    } catch (e) {
      setErrorBanner(e instanceof Error ? e.message : 'Could not parse booking text');
      setShowPreview(false);
    } finally {
      setIsParsing(false);
    }
  }, [rawText]);

  const handleClear = () => {
    setRawText('');
    setParsed(null);
    setParsedBookings([]);
    setParseErrors([]);
    setParsedLocally(false);
    setLocalParseReason(null);
    setParseApiError(null);
    setShowPreview(false);
    setSuccessBanner(null);
    setErrorBanner(null);
  };

  const handleConfirm = async () => {
    const toCreate = parsedBookings.length > 0 ? parsedBookings : parsed ? [parsed] : [];
    if (toCreate.length === 0) return;
    if (sheetTabMissing) {
      toast.error('Enter the Google Sheet tab name (e.g. October 2026)');
      return;
    }
    const clientErrors = toCreate.flatMap((booking, index) =>
      validateBookingClient(booking).map((error) =>
        toCreate.length > 1 ? `Trip ${index + 1}: ${error}` : error
      )
    );
    if (clientErrors.length > 0) {
      setErrorBanner(clientErrors.join(', '));
      return;
    }
    setIsCreating(true);
    setErrorBanner(null);
    setSuccessBanner(null);
    setSheetWarningBanner(null);
    try {
      const created: Awaited<ReturnType<typeof aiBookingAPI.createBooking>>[] = [];
      for (const booking of toCreate) {
        created.push(await aiBookingAPI.createBooking(booking, rawText, sheetTabTrimmed));
      }
      const res = created[created.length - 1];
      const invoiceLabel = created.map((row) => `#${row.invoice_no}`).join(', ');
      setLastInvoiceNo(res.invoice_no ?? null);
      if (res.sheet_synced) {
        setSuccessBanner(
          res.message || `Booking created! Invoice ${invoiceLabel} — Google Sheet synced.`
        );
        toast.success(`Invoice ${invoiceLabel} created and synced to Google Sheet`);
      } else {
        setSuccessBanner(`Booking saved in database as Invoice ${invoiceLabel}.`);
        const syncReason =
          res.sheet_sync_error ||
          'Google Sheet sync failed. Use "Test Google Sheets" below to diagnose.';
        setSheetWarningBanner(syncReason);
        toast.warning(`Invoice ${invoiceLabel} saved — sheet sync failed`);
      }
      handleClear();
    } catch (e) {
      setErrorBanner(e instanceof Error ? e.message : 'Create failed');
    } finally {
      setIsCreating(false);
    }
  };

  const handleTestSheets = async () => {
    if (sheetTabMissing) {
      toast.error('Enter the Google Sheet tab name first');
      return;
    }
    setIsTestingSheets(true);
    setErrorBanner(null);
    try {
      const res = await aiBookingAPI.testSheetsSync(sheetTabTrimmed);
      if (res.success) {
        toast.success(`Google Sheets OK — tab "${res.tab_name}" is reachable`);
        setSheetWarningBanner(null);
      } else {
        const lines = [
          res.credentials_readable === false
            ? `Credentials not found at: ${res.credentials_path}`
            : null,
          ...(res.checks ?? []),
          res.service_account_email
            ? `Share spreadsheet with: ${res.service_account_email}`
            : null,
        ].filter(Boolean);
        setSheetWarningBanner(lines.join(' · '));
        toast.error('Google Sheets connection failed');
      }
    } catch (e) {
      setSheetWarningBanner(e instanceof Error ? e.message : 'Sheets test failed');
      toast.error('Could not run Sheets test');
    } finally {
      setIsTestingSheets(false);
    }
  };

  const handleResyncLast = async () => {
    if (!lastInvoiceNo) {
      toast.error('No recent invoice to resync');
      return;
    }
    if (sheetTabMissing) {
      toast.error('Enter the Google Sheet tab name first');
      return;
    }
    try {
      const res = await aiBookingAPI.resyncSheetBooking(lastInvoiceNo, sheetTabTrimmed);
      if (res.sheet_synced) {
        setSheetWarningBanner(null);
        toast.success(`Invoice #${lastInvoiceNo} synced to Google Sheet`);
      } else {
        setSheetWarningBanner(res.sheet_sync_error || 'Resync failed');
      }
    } catch (e) {
      setSheetWarningBanner(e instanceof Error ? e.message : 'Resync failed');
    }
  };

  const handleExecuteCommand = async () => {
    if (!commandText.trim()) {
      toast.error('Enter a command');
      return;
    }
    setIsExecuting(true);
    setCommandOutput(null);
    setCommandTable(null);
    try {
      const res = await aiBookingAPI.executeCommand(commandText.trim());
      if (!res.success) {
        setCommandOutput(res.message);
        return;
      }
      if (Array.isArray(res.data) && res.data.length > 0) {
        setCommandTable(res.data);
        setCommandOutput(null);
      } else {
        setCommandOutput(res.message || 'Done.');
      }
    } catch (e) {
      setCommandOutput(e instanceof Error ? e.message : 'Command failed');
    } finally {
      setIsExecuting(false);
    }
  };

  const tableColumns = commandTable?.length
    ? Object.keys(commandTable[0])
    : [];

  return (
    <AdminLayout activeTab="ai-assistant">
      <div className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Bot className="h-7 w-7 text-blue-600" />
              AI Assistant
            </h1>
            <p className="text-gray-500 mt-1">
              Paste WhatsApp booking details, confirm, and sync to Google Sheets.
            </p>
            <div className="flex flex-wrap gap-2 mt-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => void handleTestSheets()}
                disabled={isTestingSheets || sheetTabMissing}
              >
                {isTestingSheets ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Test Google Sheets
              </Button>
              {lastInvoiceNo ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void handleResyncLast()}
                  disabled={sheetTabMissing}
                >
                  Resync Invoice #{lastInvoiceNo} to Sheet
                </Button>
              ) : null}
            </div>
          </div>

          <div className="w-full lg:w-72 shrink-0 space-y-2">
            <Label htmlFor="sheet-tab-name">Google Sheet tab</Label>
            <Input
              id="sheet-tab-name"
              value={sheetTabName}
              onChange={(e) => setSheetTabName(e.target.value)}
              placeholder="October 2026"
              list="sheet-tab-suggestions"
            />
            <datalist id="sheet-tab-suggestions">
              <option value={defaultAiSheetTabName()} />
            </datalist>
            <p className="text-xs text-muted-foreground">
              Must match the tab name in your spreadsheet exactly (e.g. October 2026). Saved in this browser.
            </p>
          </div>
        </div>

        {successBanner ? (
          <Alert className="border-green-200 bg-green-50 text-green-900">
            <AlertTitle>Success</AlertTitle>
            <AlertDescription>{successBanner}</AlertDescription>
          </Alert>
        ) : null}

        {sheetWarningBanner ? (
          <Alert className="border-amber-200 bg-amber-50 text-amber-950">
            <AlertTitle>Google Sheet sync issue</AlertTitle>
            <AlertDescription className="whitespace-pre-wrap">{sheetWarningBanner}</AlertDescription>
          </Alert>
        ) : null}

        {errorBanner ? (
          <Alert variant="destructive">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{errorBanner}</AlertDescription>
          </Alert>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Section A — Paste & Parse */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Paste Booking Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder="Paste full WhatsApp booking (Pick-up Date, From, To, Cost, Passenger…) — or pricing lines like Sedan: ₹5000/-"
                className="min-h-[280px] font-mono text-sm"
                rows={12}
              />
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => void handleParse()} disabled={isParsing}>
                  {isParsing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Parse Booking
                </Button>
                <Button variant="outline" onClick={handleClear}>
                  Clear
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Section B — Preview */}
          <Card className={showPreview ? '' : 'opacity-60'}>
            <CardHeader>
              <CardTitle className="text-lg">Parsed Preview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!showPreview || !parsed ? (
                <p className="text-sm text-muted-foreground">
                  Click &quot;Parse Booking&quot; to preview extracted fields.
                </p>
              ) : (
                <>
                  {parsedLocally && localParseReason === 'api_unavailable' ? (
                    <Alert variant="destructive">
                      <AlertTitle>Server parse API unavailable</AlertTitle>
                      <AlertDescription>
                        Using local parser as fallback.
                        {parseApiError ? (
                          <span className="block mt-1 font-medium">Reason: {parseApiError}</span>
                        ) : null}
                        <span className="block mt-1 text-sm">
                          Upload the full <code className="text-xs">api/ai-booking/</code> folder and{' '}
                          <code className="text-xs">api/utils/ai-booking-*.php</code> files, then re-upload{' '}
                          parse-booking.php.
                        </span>
                      </AlertDescription>
                    </Alert>
                  ) : parsedLocally && localParseReason === 'development' ? (
                    <Alert>
                      <AlertTitle>Browser-only parse mode</AlertTitle>
                      <AlertDescription>
                        Set <code className="text-xs">VITE_AI_BOOKING_LOCAL_PARSE=true</code> is active — no server call.
                      </AlertDescription>
                    </Alert>
                  ) : null}

                  {missingRequired.length > 0 ? (
                    <Alert variant="destructive">
                      <AlertTitle>Required fields missing or invalid</AlertTitle>
                      <AlertDescription>
                        {missingRequired.join(' · ')}
                        {parseErrors.length > 0 ? (
                          <span className="block mt-1 text-sm">
                            Could not extract: {describeParseErrors(parseErrors)}
                          </span>
                        ) : null}
                      </AlertDescription>
                    </Alert>
                  ) : parseErrors.length > 0 ? (
                    <Alert>
                      <AlertTitle>Some fields could not be parsed</AlertTitle>
                      <AlertDescription>
                        Review highlighted fields before confirming.
                      </AlertDescription>
                    </Alert>
                  ) : null}

                  <dl className="grid gap-2 text-sm">
                    {PREVIEW_FIELDS.map(({ key, label, format }) => {
                      const hasError = parseErrors.includes(key);
                      const empty =
                        parsed[key] === '' ||
                        parsed[key] === 0 ||
                        parsed[key] === null ||
                        parsed[key] === undefined;
                      const agentTrip = parsed.driver_collects_payment === false;
                      const highlight = hasError || (empty && key !== 'manager_name' && key !== 'manager_mobile' && key !== 'driver_name' && key !== 'pickup_time' && key !== 'hourly_package' && key !== 'advance_received' && !(agentTrip && (key === 'cost' || key === 'vehicle_type' || key === 'seating_capacity')));
                      return (
                        <div
                          key={key}
                          className={`flex justify-between gap-4 rounded px-2 py-1 ${
                            highlight ? 'bg-red-50 text-red-900' : ''
                          }`}
                        >
                          <dt className="font-medium text-muted-foreground shrink-0">{label}</dt>
                          <dd className="text-right">
                            {key === 'pickup_location' && parsed.pickup_map_url ? (
                              <a
                                href={parsed.pickup_map_url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-primary underline"
                              >
                                {formatFieldValue(key, parsed[key], format)}
                              </a>
                            ) : (
                              formatFieldValue(key, parsed[key], format)
                            )}
                          </dd>
                        </div>
                      );
                    })}
                    <div className="flex justify-between gap-4 rounded px-2 py-1">
                      <dt className="font-medium text-muted-foreground shrink-0">Places</dt>
                      <dd className="text-right">
                        {parsed.trip_terms?.places?.length
                          ? parsed.trip_terms.places.map((place, index) => (
                              <div key={`${index}-${place}`}>{index + 1}. {place}</div>
                            ))
                          : '—'}
                      </dd>
                    </div>
                    {parsed.trip_terms?.notes?.some((note) => /^Day \d+\b/i.test(note)) ? (
                      <div className="rounded px-2 py-1">
                        <dt className="font-medium text-muted-foreground">Program</dt>
                        <dd className="mt-1 space-y-1 text-left">
                          {parsed.trip_terms.notes.map((note) => (
                            <div key={note}>{note}</div>
                          ))}
                        </dd>
                      </div>
                    ) : null}
                    {parsed.trip_terms?.exclusions?.length ? (
                      <div className="flex justify-between gap-4 rounded px-2 py-1">
                        <dt className="font-medium text-muted-foreground shrink-0">Not included</dt>
                        <dd className="text-right">{parsed.trip_terms.exclusions.join('; ')}</dd>
                      </div>
                    ) : null}
                    {parsed.trip_terms?.day_window ? (
                      <div className="flex justify-between gap-4 rounded px-2 py-1">
                        <dt className="font-medium text-muted-foreground shrink-0">Day</dt>
                        <dd className="text-right">{parsed.trip_terms.day_window}</dd>
                      </div>
                    ) : null}
                    <div className="flex justify-between gap-4 rounded px-2 py-1">
                      <dt className="font-medium text-muted-foreground shrink-0">Flight</dt>
                      <dd className="text-right">{parsed.trip_terms?.flight_number || '—'}</dd>
                    </div>
                    {parsed.driver_collects_payment === false ? (
                      <div className="rounded bg-amber-50 px-2 py-1 text-amber-950">
                        Agent trip. The driver does not see a fare and does not collect payment.
                        {parsedBookings.length > 1 ? ` This message creates ${parsedBookings.length} bookings.` : ''}
                      </div>
                    ) : null}
                  </dl>

                  <div className="flex flex-wrap gap-2 pt-2">
                    <Button
                      onClick={() => void handleConfirm()}
                      disabled={isCreating || missingRequired.length > 0 || sheetTabMissing}
                    >
                      {isCreating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                      Confirm &amp; Create Booking
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowPreview(false);
                        setParsed(null);
                        setParsedBookings([]);
                      }}
                    >
                      Edit &amp; Re-parse
                    </Button>
                    <Button variant="ghost" onClick={handleClear}>
                      Cancel
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Section C — Quick Commands */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Terminal className="h-5 w-5" />
              Quick Commands
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="flex-1 space-y-2">
                <Label htmlFor="admin-command">Command</Label>
                <Input
                  id="admin-command"
                  value={commandText}
                  onChange={(e) => setCommandText(e.target.value)}
                  placeholder="Type a command e.g. Assign Naveen to Invoice 77"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') void handleExecuteCommand();
                  }}
                />
              </div>
              <div className="flex items-end">
                <Button onClick={() => void handleExecuteCommand()} disabled={isExecuting}>
                  {isExecuting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Execute
                </Button>
              </div>
            </div>

            {commandOutput ? (
              <pre className="rounded-md border bg-muted/50 p-3 text-sm whitespace-pre-wrap">{commandOutput}</pre>
            ) : null}

            {commandTable && commandTable.length > 0 ? (
              <ScrollAreaTable columns={tableColumns} rows={commandTable} />
            ) : null}

            <p className="text-xs text-muted-foreground">
              Supported: assign {'{driver}'} to invoice {'{N}'} · update payment received for invoice {'{N}'} ·
              mark invoice {'{N}'} as completed · show pending payments · show today&apos;s trips
            </p>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}

function ScrollAreaTable({
  columns,
  rows,
}: {
  columns: string[];
  rows: Record<string, unknown>[];
}) {
  return (
    <div className="overflow-x-auto rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((col) => (
              <TableHead key={col} className="whitespace-nowrap capitalize">
                {col.replace(/_/g, ' ')}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, i) => (
            <TableRow key={i}>
              {columns.map((col) => (
                <TableCell key={col} className="whitespace-nowrap text-sm">
                  {String(row[col] ?? '—')}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
