import React, { useCallback, useMemo, useState } from 'react';
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
  formatPickupDateDisplay,
  formatRupee,
  type ParsedBooking,
  validateBookingClient,
} from '@/services/api/aiBookingAPI';
import { describeParseErrors } from '@/utils/bookingParser';

const PREVIEW_FIELDS: Array<{ key: keyof ParsedBooking; label: string; format?: 'date' | 'rupee' }> = [
  { key: 'customer_name', label: 'Customer Name' },
  { key: 'customer_mobile', label: 'Customer Mobile' },
  { key: 'pickup_location', label: 'Pickup Location' },
  { key: 'drop_location', label: 'Drop Location' },
  { key: 'trip_type', label: 'Trip Type' },
  { key: 'pickup_date', label: 'Pickup Date', format: 'date' },
  { key: 'pickup_time', label: 'Pickup Time' },
  { key: 'vehicle_type', label: 'Vehicle Type' },
  { key: 'seating_capacity', label: 'Seating Capacity' },
  { key: 'cost', label: 'Cost', format: 'rupee' },
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
      setParsed({ ...res.data, advance_received: 0 });
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
    setParseErrors([]);
    setParsedLocally(false);
    setLocalParseReason(null);
    setParseApiError(null);
    setShowPreview(false);
    setSuccessBanner(null);
    setErrorBanner(null);
  };

  const handleConfirm = async () => {
    if (!parsed) return;
    const clientErrors = validateBookingClient(parsed);
    if (clientErrors.length > 0) {
      setErrorBanner(clientErrors.join(', '));
      return;
    }
    setIsCreating(true);
    setErrorBanner(null);
    setSuccessBanner(null);
    setSheetWarningBanner(null);
    try {
      const res = await aiBookingAPI.createBooking({ ...parsed, advance_received: 0 }, rawText);
      setLastInvoiceNo(res.invoice_no ?? null);
      if (res.sheet_synced) {
        setSuccessBanner(
          res.message || `Booking created! Invoice #${res.invoice_no} — Google Sheet synced.`
        );
        toast.success(`Invoice #${res.invoice_no} created and synced to Google Sheet`);
      } else {
        setSuccessBanner(`Booking saved in database as Invoice #${res.invoice_no}.`);
        const syncReason =
          res.sheet_sync_error ||
          'Google Sheet sync failed. Use "Test Google Sheets" below to diagnose.';
        setSheetWarningBanner(syncReason);
        toast.warning(`Invoice #${res.invoice_no} saved — sheet sync failed`);
      }
      handleClear();
    } catch (e) {
      setErrorBanner(e instanceof Error ? e.message : 'Create failed');
    } finally {
      setIsCreating(false);
    }
  };

  const handleTestSheets = async () => {
    setIsTestingSheets(true);
    setErrorBanner(null);
    try {
      const res = await aiBookingAPI.testSheetsSync();
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
    try {
      const res = await aiBookingAPI.resyncSheetBooking(lastInvoiceNo);
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
              disabled={isTestingSheets}
            >
              {isTestingSheets ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Test Google Sheets
            </Button>
            {lastInvoiceNo ? (
              <Button variant="outline" size="sm" onClick={() => void handleResyncLast()}>
                Resync Invoice #{lastInvoiceNo} to Sheet
              </Button>
            ) : null}
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
                      const highlight = hasError || (empty && key !== 'manager_name' && key !== 'manager_mobile' && key !== 'driver_name' && key !== 'pickup_time');
                      return (
                        <div
                          key={key}
                          className={`flex justify-between gap-4 rounded px-2 py-1 ${
                            highlight ? 'bg-red-50 text-red-900' : ''
                          }`}
                        >
                          <dt className="font-medium text-muted-foreground shrink-0">{label}</dt>
                          <dd className="text-right">{formatFieldValue(key, parsed[key], format)}</dd>
                        </div>
                      );
                    })}
                  </dl>

                  <div className="flex flex-wrap gap-2 pt-2">
                    <Button onClick={() => void handleConfirm()} disabled={isCreating || missingRequired.length > 0}>
                      {isCreating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                      Confirm &amp; Create Booking
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowPreview(false);
                        setParsed(null);
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
