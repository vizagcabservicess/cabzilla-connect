import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  billingPackageNote,
  billingPartyLabel,
  billingSideTitle,
  billingSkipLabel,
  buildBillingSheet,
  billingDayCount,
  formatBillingDuration,
  formatBillingKm,
  formatBillingMoney,
  formatPackageQty,
  lineAmountBeforeTax,
  roundPaise,
  type BillingLine,
  type BillingSide,
} from '@/lib/eventDutyBilling';
import { downloadBillingExcel, downloadBillingPdf } from '@/lib/eventBillingExport';
import { eventVehicleTypeLabel, formatDutyDate } from '@/lib/eventDuty';
import { eventDutyAPI } from '@/services/api/eventDutyAPI';
import type { EventDuty, EventFleetOption, EventVehicleRateInput, VthEvent } from '@/types/eventDuty';

interface RateDraft {
  vendorPackagePrice: string;
  vendorExtraHour: string;
  vendorExtraKm: string;
  vthPackagePrice: string;
  vthExtraHour: string;
  vthExtraKm: string;
}

const RATE_FIELDS: Array<{ key: keyof RateDraft; label: string }> = [
  { key: 'vendorPackagePrice', label: 'Vendor package' },
  { key: 'vendorExtraHour', label: 'Vendor extra hour' },
  { key: 'vendorExtraKm', label: 'Vendor extra km' },
  { key: 'vthPackagePrice', label: 'VTH package' },
  { key: 'vthExtraHour', label: 'VTH extra hour' },
  { key: 'vthExtraKm', label: 'VTH extra km' },
];

interface EventBillingPanelProps {
  event: VthEvent;
  vehicles: EventFleetOption[];
  allVehicles: EventFleetOption[];
  duties: EventDuty[];
  from: string;
  to: string;
  vehicleFilter: string;
  onSaved: () => void;
}

function moneyInput(value: number | null | undefined): string {
  return value == null ? '' : String(value);
}

function draftFromVehicle(vehicle: EventFleetOption): RateDraft {
  return {
    vendorPackagePrice: moneyInput(vehicle.vendorPackagePrice),
    vendorExtraHour: moneyInput(vehicle.vendorExtraHour),
    vendorExtraKm: moneyInput(vehicle.vendorExtraKm),
    vthPackagePrice: moneyInput(vehicle.vthPackagePrice),
    vthExtraHour: moneyInput(vehicle.vthExtraHour),
    vthExtraKm: moneyInput(vehicle.vthExtraKm),
  };
}

function draftsMatch(vehicle: EventFleetOption, draft: RateDraft | undefined): boolean {
  if (!draft) return true;
  const saved = draftFromVehicle(vehicle);
  return RATE_FIELDS.every((field) => saved[field.key] === draft[field.key]);
}

function parseRate(value: string, label: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const amount = Number(trimmed);
  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error(`${label} must be zero or more`);
  }
  return Math.round(amount * 100) / 100;
}

function draftToRate(vehicle: EventFleetOption, draft: RateDraft): EventVehicleRateInput {
  const parsed = RATE_FIELDS.map((field) => parseRate(draft[field.key], `${vehicle.vehicleNumber} ${field.label}`));
  const filled = parsed.filter((value) => value != null);
  if (filled.length > 0 && filled.length < RATE_FIELDS.length) {
    throw new Error(`${vehicle.vehicleNumber}: enter package, extra hour, and extra km for both vendor and VTH, or leave the row blank`);
  }
  return {
    id: vehicle.id,
    vendorPackagePrice: parsed[0],
    vendorExtraHour: parsed[1],
    vendorExtraKm: parsed[2],
    vthPackagePrice: parsed[3],
    vthExtraHour: parsed[4],
    vthExtraKm: parsed[5],
  };
}

export function EventBillingPanel({
  event,
  vehicles,
  allVehicles,
  duties,
  from,
  to,
  vehicleFilter,
  onSaved,
}: EventBillingPanelProps) {
  const [includedHours, setIncludedHours] = useState(String(event.billingIncludedHours ?? 10));
  const [includedKm, setIncludedKm] = useState(String(event.billingIncludedKm ?? 100));
  const [drafts, setDrafts] = useState<Record<number, RateDraft>>({});
  const [side, setSide] = useState<BillingSide>('vendor');
  const [savingPackage, setSavingPackage] = useState(false);
  const [savingRates, setSavingRates] = useState(false);
  const [exporting, setExporting] = useState<'excel' | 'pdf' | null>(null);

  useEffect(() => {
    setIncludedHours(String(event.billingIncludedHours ?? 10));
    setIncludedKm(String(event.billingIncludedKm ?? 100));
  }, [event.id, event.billingIncludedHours, event.billingIncludedKm]);

  useEffect(() => {
    const next: Record<number, RateDraft> = {};
    allVehicles.forEach((vehicle) => {
      next[vehicle.id] = draftFromVehicle(vehicle);
    });
    setDrafts(next);
  }, [allVehicles]);

  const sheet = useMemo(() => buildBillingSheet({
    side,
    includedHours: event.billingIncludedHours,
    includedKm: event.billingIncludedKm,
    duties,
    vehicles: allVehicles,
  }), [side, event.billingIncludedHours, event.billingIncludedKm, duties, allVehicles]);

  const meta = useMemo(() => ({
    eventName: event.name,
    eventCode: event.eventCode,
    clientName: event.clientName || '',
    from,
    to,
    vehicleLabel: vehicleFilter === 'all' ? 'All vehicles' : vehicleFilter,
  }), [event.name, event.eventCode, event.clientName, from, to, vehicleFilter]);

  const ratesDirty = allVehicles.some((vehicle) => !draftsMatch(vehicle, drafts[vehicle.id]));
  const packageDirty = includedHours.trim() !== String(event.billingIncludedHours ?? 10)
    || includedKm.trim() !== String(event.billingIncludedKm ?? 100);
  const groups = groupLines(sheet.lines);

  const updateDraft = (id: number, key: keyof RateDraft, value: string) => {
    const vehicle = allVehicles.find((item) => item.id === id);
    if (!vehicle) return;
    setDrafts((current) => ({
      ...current,
      [id]: { ...(current[id] || draftFromVehicle(vehicle)), [key]: value },
    }));
  };

  const copyToType = (source: EventFleetOption) => {
    const draft = drafts[source.id];
    if (!draft || !source.vehicleType) return;
    const matches = allVehicles.filter((vehicle) => vehicle.vehicleType === source.vehicleType && vehicle.id !== source.id);
    if (matches.length === 0) return;
    setDrafts((current) => {
      const next = { ...current };
      matches.forEach((vehicle) => {
        next[vehicle.id] = { ...draft };
      });
      return next;
    });
    toast.message(`Copied to ${matches.length} other ${eventVehicleTypeLabel(source.vehicleType)} vehicles. Save rates to keep them.`);
  };

  const savePackage = async () => {
    const hours = Number(includedHours);
    const km = Number(includedKm);
    if (!Number.isFinite(hours) || hours <= 0 || !Number.isFinite(km) || km <= 0) {
      toast.error('Included hours and km must be greater than zero');
      return;
    }
    setSavingPackage(true);
    try {
      await eventDutyAPI.saveBillingPackage(event.id, hours, km);
      toast.success('Package saved');
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save the package');
    } finally {
      setSavingPackage(false);
    }
  };

  const saveRates = async () => {
    let payload: EventVehicleRateInput[];
    try {
      payload = allVehicles.map((vehicle) => draftToRate(vehicle, drafts[vehicle.id] || draftFromVehicle(vehicle)));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Check the rates');
      return;
    }
    setSavingRates(true);
    try {
      await eventDutyAPI.saveVehicleRates(event.id, payload);
      toast.success('Rates saved');
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save rates');
    } finally {
      setSavingRates(false);
    }
  };

  const download = async (kind: 'excel' | 'pdf') => {
    setExporting(kind);
    try {
      if (kind === 'excel') await downloadBillingExcel(sheet, meta);
      else await downloadBillingPdf(sheet, meta);
    } catch (err) {
      if (!(err instanceof DOMException && err.name === 'AbortError')) {
        toast.error(err instanceof Error ? err.message : 'Could not download the bill');
      }
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Local package</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {billingPackageNote(Number(event.billingIncludedHours) || 10, Number(event.billingIncludedKm) || 100)}
          </p>
          <div className="flex flex-col gap-3 md:flex-row md:items-end">
            <div>
              <Label htmlFor="billing-included-hours">Included hours</Label>
              <Input id="billing-included-hours" className="w-32" type="number" min="0.01" step="0.01" value={includedHours} onChange={(event) => setIncludedHours(event.target.value)} />
            </div>
            <div>
              <Label htmlFor="billing-included-km">Included km</Label>
              <Input id="billing-included-km" className="w-32" type="number" min="0.01" step="0.01" value={includedKm} onChange={(event) => setIncludedKm(event.target.value)} />
            </div>
            <Button disabled={savingPackage} onClick={() => { void savePackage(); }}>
              {savingPackage ? 'Saving…' : 'Save package'}
            </Button>
          </div>
          {packageDirty && <p className="text-sm text-amber-700">Save the package before the bill uses the new minimum.</p>}
        </CardContent>
      </Card>

      <Accordion type="single" collapsible>
        <AccordionItem value="rates" className="rounded-lg border bg-card px-4">
          <div className="flex items-center gap-2">
            <AccordionTrigger className="py-4 text-base hover:no-underline">Rates for each vehicle</AccordionTrigger>
            <Button className="shrink-0" disabled={savingRates || allVehicles.length === 0} onClick={() => { void saveRates(); }}>
              {savingRates ? 'Saving…' : 'Save rates'}
            </Button>
          </div>
          <AccordionContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Vendor is what you pay the owner. VTH is what you charge {event.clientName || 'the client'}. Prices can differ for each vehicle.
            </p>
            {ratesDirty && <p className="text-sm text-amber-700">Unsaved rate changes are not in this bill.</p>}
            {vehicles.length === 0 ? (
              <p className="text-sm text-muted-foreground">No vehicles are on this event yet. Add them on the Vehicles tab, then the six price boxes for each vehicle show up here.</p>
            ) : (
              <div className="max-w-full overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">SL.No</TableHead>
                      <TableHead>Vehicle</TableHead>
                      <TableHead>Vendor package</TableHead>
                      <TableHead>Vendor extra hour</TableHead>
                      <TableHead>Vendor extra km</TableHead>
                      <TableHead>VTH package</TableHead>
                      <TableHead>VTH extra hour</TableHead>
                      <TableHead>VTH extra km</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vehicles.map((vehicle) => {
                      const draft = drafts[vehicle.id] || draftFromVehicle(vehicle);
                      const sameType = allVehicles.filter((item) => item.vehicleType && item.vehicleType === vehicle.vehicleType).length;
                      return (
                        <TableRow key={vehicle.id}>
                          <TableCell className="w-16 text-center tabular-nums">{vehicle.serialNo ?? ''}</TableCell>
                          <TableCell className="min-w-40 align-top">
                            <div className="font-medium">{vehicle.vehicleNumber}</div>
                            <div className="text-xs text-muted-foreground">
                              {eventVehicleTypeLabel(vehicle.vehicleType)}
                            </div>
                          </TableCell>
                          {RATE_FIELDS.map((field) => (
                            <TableCell key={field.key}>
                              <Input
                                aria-label={`${vehicle.vehicleNumber} ${field.label}`}
                                className="h-8 w-28"
                                type="number"
                                min="0"
                                step="0.01"
                                value={draft[field.key]}
                                onChange={(event) => updateDraft(vehicle.id, field.key, event.target.value)}
                              />
                            </TableCell>
                          ))}
                          <TableCell>
                            <Button
                              type="button"
                              variant="outline"
                              className="h-8 whitespace-nowrap"
                              disabled={sameType < 2}
                              onClick={() => copyToType(vehicle)}
                            >
                              Copy to {eventVehicleTypeLabel(vehicle.vehicleType)}
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <Card>
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>{billingSideTitle(side)}{side === 'vth' ? ' · 18% GST' : ''}</CardTitle>
            <p className="text-sm text-muted-foreground">
              {side === 'vth' ? `Bill to ${billingPartyLabel(sheet, event.clientName || '')} · ` : ''}{meta.vehicleLabel} · {formatDutyDate(from)} – {formatDutyDate(to)}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant={side === 'vendor' ? 'default' : 'outline'} onClick={() => setSide('vendor')}>Vendor bill</Button>
            <Button variant={side === 'vth' ? 'default' : 'outline'} onClick={() => setSide('vth')}>VTH bill</Button>
            <Button variant="outline" disabled={exporting != null} onClick={() => { void download('excel'); }}>
              {exporting === 'excel' ? 'Preparing…' : 'Excel'}
            </Button>
            <Button variant="outline" disabled={exporting != null} onClick={() => { void download('pdf'); }}>
              {exporting === 'pdf' ? 'Preparing…' : 'PDF'}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className={`grid gap-3 sm:grid-cols-2 ${side === 'vth' ? 'xl:grid-cols-5' : 'xl:grid-cols-4'}`}>
            {side === 'vth' ? <Summary label="Taxable Value" value={formatBillingMoney(sheet.totalBeforeTax)} /> : null}
            <Summary label="Grand Total" value={formatBillingMoney(sheet.grandTotal)} />
            <Summary label="Billed vehicles" value={String(sheet.billedVehicleCount)} />
            <Summary label="Not in the total" value={String(sheet.skippedCount)} />
            <Summary label="No. of days" value={String(billingDayCount(from, to))} />
          </div>
          <p className="text-sm text-muted-foreground">
            Minimum {formatPackageQty(sheet.includedHours)} hr / {formatPackageQty(sheet.includedKm)} km on each completed duty day. Each extra hour includes 10 km free, and that is taken off the extra km for that day.
            {side === 'vth' ? ' Taxable Value excludes 18% GST. Grand Total includes it.' : ''}
            {' '}Tolls and parking are added to the total and are not taxed.
          </p>
          {groups.length === 0 ? (
            <p className="text-sm text-muted-foreground">No duties in this date range.</p>
          ) : (
            <div className="max-w-full overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">SL.No</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Slip</TableHead>
                    <TableHead>Vehicle</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Hours</TableHead>
                    <TableHead>KM</TableHead>
                    <TableHead>Extra time</TableHead>
                    <TableHead>Free km</TableHead>
                    <TableHead>Extra km</TableHead>
                    <TableHead className="text-right">Package</TableHead>
                    <TableHead className="text-right">Extra time ₹</TableHead>
                    <TableHead className="text-right">Extra km ₹</TableHead>
                    {side === 'vth' ? <TableHead className="text-right">Taxable Value</TableHead> : null}
                    {side === 'vth' ? <TableHead className="text-right">18% GST</TableHead> : null}
                    <TableHead className="text-right">Tolls/Parking</TableHead>
                    <TableHead className="text-right">Grand Total</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {groups.map((group) => (
                    <VehicleLines key={group.vehicleNumber} group={group} showGst={side === 'vth'} onSaved={onSaved} />
                  ))}
                  <TableRow>
                    <TableCell colSpan={14} className="font-medium">Grand Total</TableCell>
                    {side === 'vth' ? <TableCell className="text-right font-medium">{formatBillingMoney(sheet.totalBeforeTax)}</TableCell> : null}
                    {side === 'vth' ? <TableCell className="text-right font-medium">{formatBillingMoney(sheet.gstTotal)}</TableCell> : null}
                    <TableCell className="text-right font-medium">{formatBillingMoney(sheet.tollParkingTotal)}</TableCell>
                    <TableCell className="text-right font-medium">{formatBillingMoney(sheet.grandTotal)}</TableCell>
                    <TableCell />
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function TollParkingInput({ dutyId, amount, onSaved }: { dutyId: number; amount: number; onSaved: () => void }) {
  const [value, setValue] = useState(amount > 0 ? String(amount) : '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setValue(amount > 0 ? String(amount) : '');
  }, [amount]);

  async function save() {
    const trimmed = value.trim();
    const parsed = trimmed === '' ? 0 : Number(trimmed);
    if (!Number.isFinite(parsed) || parsed < 0) {
      toast.error('Tolls and parking must be zero or more');
      setValue(amount > 0 ? String(amount) : '');
      return;
    }
    const rounded = Math.round(parsed * 100) / 100;
    if (rounded === amount) return;
    setSaving(true);
    try {
      await eventDutyAPI.setTollParking(dutyId, rounded);
      onSaved();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not save tolls and parking');
      setValue(amount > 0 ? String(amount) : '');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Input
      className="ml-auto h-8 w-24 text-right"
      inputMode="decimal"
      value={value}
      disabled={saving}
      aria-label="Tolls and parking"
      onChange={(event) => setValue(event.target.value)}
      onBlur={() => { void save(); }}
      onKeyDown={(event) => {
        if (event.key === 'Enter') event.currentTarget.blur();
      }}
    />
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  );
}

function VehicleLines({ group, showGst, onSaved }: { group: LineGroup; showGst: boolean; onSaved: () => void }) {
  return (
    <>
      {group.lines.map((line) => (
        <TableRow key={line.dutyId}>
          <TableCell className="text-center tabular-nums">{line.serialNo ?? ''}</TableCell>
          <TableCell className="whitespace-nowrap">{formatDutyDate(line.dutyDate)}</TableCell>
          <TableCell>{line.dutySlipNo}</TableCell>
          <TableCell>{line.vehicleNumber}</TableCell>
          <TableCell>{line.driverName}</TableCell>
          <TableCell className="whitespace-nowrap">{line.driverPhone}</TableCell>
          <TableCell className="whitespace-nowrap">{formatBillingDuration(line.billableMinutes)}</TableCell>
          <TableCell>{formatBillingKm(line.totalKm)}</TableCell>
          <TableCell className="whitespace-nowrap">{formatBillingDuration(line.extraMinutes)}</TableCell>
          <TableCell>{formatBillingKm(line.freeKm)}</TableCell>
          <TableCell>{formatBillingKm(line.extraKm)}</TableCell>
          <TableCell className="text-right">{formatBillingMoney(line.packageAmount)}</TableCell>
          <TableCell className="text-right">{formatBillingMoney(line.extraHourAmount)}</TableCell>
          <TableCell className="text-right">{formatBillingMoney(line.extraKmAmount)}</TableCell>
          {showGst ? <TableCell className="text-right">{formatBillingMoney(lineAmountBeforeTax(line))}</TableCell> : null}
          {showGst ? <TableCell className="text-right">{formatBillingMoney(line.gstAmount)}</TableCell> : null}
          <TableCell className="text-right">
            <TollParkingInput dutyId={line.dutyId} amount={line.tollParking} onSaved={onSaved} />
          </TableCell>
          <TableCell className="text-right">{formatBillingMoney(line.lineTotal)}</TableCell>
          <TableCell>{billingSkipLabel(line.skipReason)}</TableCell>
        </TableRow>
      ))}
      <TableRow className="bg-muted/40">
        <TableCell colSpan={14} className="font-medium">{group.vehicleNumber} subtotal</TableCell>
        {showGst ? <TableCell className="text-right font-medium">{formatBillingMoney(group.beforeTax)}</TableCell> : null}
        {showGst ? <TableCell className="text-right font-medium">{formatBillingMoney(group.gst)}</TableCell> : null}
        <TableCell className="text-right font-medium">{formatBillingMoney(group.tollParking)}</TableCell>
        <TableCell className="text-right font-medium">{formatBillingMoney(group.total)}</TableCell>
        <TableCell />
      </TableRow>
    </>
  );
}

interface LineGroup {
  vehicleNumber: string;
  lines: BillingLine[];
  beforeTax: number;
  gst: number;
  tollParking: number;
  total: number;
}

function billedToll(line: BillingLine): number {
  return line.lineTotal == null ? 0 : line.tollParking;
}

function groupLines(lines: BillingLine[]): LineGroup[] {
  const groups: LineGroup[] = [];
  lines.forEach((line) => {
    const last = groups[groups.length - 1];
    if (!last || last.vehicleNumber !== line.vehicleNumber) {
      groups.push({
        vehicleNumber: line.vehicleNumber,
        lines: [line],
        beforeTax: lineAmountBeforeTax(line) || 0,
        gst: line.gstAmount || 0,
        tollParking: billedToll(line),
        total: line.lineTotal || 0,
      });
      return;
    }
    last.lines.push(line);
    last.beforeTax = roundPaise(last.beforeTax + (lineAmountBeforeTax(line) || 0));
    last.gst = roundPaise(last.gst + (line.gstAmount || 0));
    last.tollParking = roundPaise(last.tollParking + billedToll(line));
    last.total = roundPaise(last.total + (line.lineTotal || 0));
  });
  return groups;
}
