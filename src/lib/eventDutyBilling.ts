import type { EventDuty, EventFleetOption } from '@/types/eventDuty';
import {
  billableDutyEnd,
  dutyDurationMinutes,
  eventVehicleTypeLabel,
  normalizeVehicleReg,
  reportDutyStart,
} from '@/lib/eventDuty';

export const DEFAULT_INCLUDED_HOURS = 10;
export const DEFAULT_INCLUDED_KM = 100;
export const FREE_KM_PER_EXTRA_HOUR = 10;
export const VTH_GST_RATE = 0.18;

export type BillingSide = 'vendor' | 'vth';
export type BillingSkipReason = 'not_billable' | 'rate_not_set';

export interface BillingLine {
  dutyId: number;
  dutySlipNo: string;
  dutyDate: string;
  vehicleId: number | null;
  vehicleNumber: string;
  vehicleTypeLabel: string;
  ownerName: string;
  driverName: string;
  driverPhone: string;
  serialNo: number | null;
  billableMinutes: number;
  totalKm: number | null;
  extraMinutes: number;
  freeKm: number;
  extraKm: number;
  packageAmount: number | null;
  extraHourAmount: number | null;
  extraKmAmount: number | null;
  gstAmount: number | null;
  /** Tolls and parking. Added to the total and kept out of GST. */
  tollParking: number;
  lineTotal: number | null;
  skipReason: BillingSkipReason | null;
}

export interface BillingVehicleTotal {
  vehicleNumber: string;
  vehicleTypeLabel: string;
  ownerName: string;
  driverName: string;
  driverPhone: string;
  serialNo: number | null;
  dutyDays: number;
  billableMinutes: number;
  totalKm: number;
  extraMinutes: number;
  extraKm: number;
  total: number;
}

export interface BillingOwnerTotal {
  ownerName: string;
  vehicleCount: number;
  dutyDays: number;
  total: number;
}

export interface BillingSheet {
  side: BillingSide;
  includedHours: number;
  includedKm: number;
  lines: BillingLine[];
  vehicleTotals: BillingVehicleTotal[];
  ownerTotals: BillingOwnerTotal[];
  grandTotal: number;
  totalBeforeTax: number;
  gstTotal: number;
  tollParkingTotal: number;
  billedCount: number;
  billedVehicleCount: number;
  skippedCount: number;
}

export interface BillingExportMeta {
  eventName: string;
  eventCode: string;
  clientName: string;
  from: string;
  to: string;
  vehicleLabel: string;
}

export interface BuildBillingSheetInput {
  side: BillingSide;
  includedHours?: number | null;
  includedKm?: number | null;
  duties: EventDuty[];
  vehicles: EventFleetOption[];
}

interface SideRates {
  packagePrice: number;
  extraHour: number;
  extraKm: number;
}

export function compareBillingSerial(
  aSerial: number | null | undefined,
  bSerial: number | null | undefined,
  aLabel: string,
  bLabel: string,
): number {
  const aSet = aSerial != null && aSerial > 0;
  const bSet = bSerial != null && bSerial > 0;
  if (aSet && bSet && aSerial !== bSerial) return (aSerial ?? 0) - (bSerial ?? 0);
  if (aSet !== bSet) return aSet ? -1 : 1;
  return aLabel.localeCompare(bLabel);
}

export function billingDayCount(from: string, to: string): number {
  const start = Date.parse(`${from.slice(0, 10)}T00:00:00Z`);
  const end = Date.parse(`${to.slice(0, 10)}T00:00:00Z`);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return 0;
  return Math.round((end - start) / 86400000) + 1;
}

export function roundPaise(amount: number): number {
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

export function lineAmountBeforeTax(line: BillingLine): number | null {
  if (line.lineTotal == null) return null;
  return roundPaise((line.packageAmount || 0) + (line.extraHourAmount || 0) + (line.extraKmAmount || 0));
}

export function formatPackageQty(value: number): string {
  const rounded = roundPaise(value);
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2);
}

export function formatBillingDuration(minutes: number): string {
  const whole = Math.max(0, Math.round(minutes));
  const hours = Math.floor(whole / 60);
  const rest = whole % 60;
  if (hours <= 0 && rest <= 0) return '0 min';
  if (hours <= 0) return `${rest} min`;
  if (rest === 0) return `${hours} hr`;
  return `${hours} hr ${rest} min`;
}

export function formatBillingKm(km: number | null): string {
  if (km == null || Number.isNaN(km)) return '—';
  const rounded = roundPaise(km);
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2);
}

export function formatBillingMoney(amount: number | null): string {
  if (amount == null || Number.isNaN(amount)) return '—';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function billingSideTitle(side: BillingSide): string {
  switch (side) {
    case 'vendor':
      return 'Vendor bill';
    case 'vth':
      return 'VTH bill';
    default: {
      const _never: never = side;
      return _never;
    }
  }
}

/** Title printed at the top of the billing PDF. */
export function billingDocumentHeading(side: BillingSide): string {
  switch (side) {
    case 'vendor':
      return 'Vendor bill';
    case 'vth':
      return 'Consolidated Billing & Verification';
    default: {
      const _never: never = side;
      return _never;
    }
  }
}

/** Counterparty who signs the billing breakup with Vizag Taxi Hub. */
export function billingConfirmParty(side: BillingSide): string {
  switch (side) {
    case 'vendor':
      return 'Vendor Representative';
    case 'vth':
      return 'Event Representative';
    default: {
      const _never: never = side;
      return _never;
    }
  }
}

export function billingSkipLabel(reason: BillingSkipReason | null): string {
  switch (reason) {
    case null:
      return 'Billed';
    case 'not_billable':
      return 'Not billed';
    case 'rate_not_set':
      return 'Rate not set';
    default: {
      const _never: never = reason;
      return _never;
    }
  }
}

export function billingPackageNote(includedHours: number, includedKm: number): string {
  return `Local package minimum ${formatPackageQty(includedHours)} hr / ${formatPackageQty(includedKm)} km. The package is charged on every completed duty day. Extra time is the exact time above the package. Each extra hour includes ${FREE_KM_PER_EXTRA_HOUR} km free, including part of an hour, and those kilometres are taken off that day's extra km. Tolls and parking are added to the total and are not taxed.`;
}

export function billingPartyLabel(sheet: BillingSheet, clientName: string): string {
  if (sheet.side === 'vth') return clientName.trim() || 'Client';
  return '';
}

export function billingFileStem(sheet: BillingSheet, meta: BillingExportMeta): string {
  const vehicle = meta.vehicleLabel === 'All vehicles' ? 'all-vehicles' : meta.vehicleLabel;
  const safeVehicle = vehicle.replace(/[^\w.-]+/g, '_');
  return `${meta.eventCode}-${sheet.side}-bill-${safeVehicle}-${meta.from}-to-${meta.to}`;
}

export function buildBillingSheet(input: BuildBillingSheetInput): BillingSheet {
  const includedHours = positiveOrDefault(input.includedHours, DEFAULT_INCLUDED_HOURS);
  const includedKm = positiveOrDefault(input.includedKm, DEFAULT_INCLUDED_KM);
  const includedMinutes = Math.round(includedHours * 60);
  const index = indexVehicles(input.vehicles);
  const lines = [...input.duties]
    .map((duty) => billDuty(duty, input.side, includedMinutes, includedKm, index))
    .sort((a, b) => (
      compareBillingSerial(a.serialNo, b.serialNo, a.vehicleNumber, b.vehicleNumber)
      || a.dutyDate.localeCompare(b.dutyDate)
      || a.dutySlipNo.localeCompare(b.dutySlipNo)
    ));
  const billed = lines.filter((line) => line.lineTotal != null);
  const vehicleTotals = vehicleTotalsFrom(billed);
  return {
    side: input.side,
    includedHours,
    includedKm,
    lines,
    vehicleTotals,
    ownerTotals: ownerTotalsFrom(vehicleTotals),
    grandTotal: roundPaise(billed.reduce((sum, line) => sum + (line.lineTotal || 0), 0)),
    totalBeforeTax: roundPaise(billed.reduce((sum, line) => sum + (lineAmountBeforeTax(line) || 0), 0)),
    gstTotal: roundPaise(billed.reduce((sum, line) => sum + (line.gstAmount || 0), 0)),
    tollParkingTotal: roundPaise(billed.reduce((sum, line) => sum + line.tollParking, 0)),
    billedCount: billed.length,
    billedVehicleCount: new Set(billed.map((line) => line.vehicleNumber)).size,
    skippedCount: lines.length - billed.length,
  };
}

function positiveOrDefault(value: number | null | undefined, fallback: number): number {
  if (value == null || !Number.isFinite(value) || value <= 0) return fallback;
  return value;
}

function indexVehicles(vehicles: EventFleetOption[]) {
  const byId = new Map<number, EventFleetOption>();
  const byReg = new Map<string, EventFleetOption>();
  vehicles.forEach((vehicle) => {
    byId.set(vehicle.id, vehicle);
    const reg = normalizeVehicleReg(vehicle.vehicleNumber);
    if (reg && !byReg.has(reg)) byReg.set(reg, vehicle);
  });
  return { byId, byReg };
}

function matchVehicle(
  duty: EventDuty,
  index: { byId: Map<number, EventFleetOption>; byReg: Map<string, EventFleetOption> },
): EventFleetOption | undefined {
  if (duty.vehicleId != null && index.byId.has(duty.vehicleId)) {
    return index.byId.get(duty.vehicleId);
  }
  return index.byReg.get(normalizeVehicleReg(duty.vehicleNumber));
}

function sideRates(vehicle: EventFleetOption | undefined, side: BillingSide): SideRates | null {
  if (!vehicle) return null;
  switch (side) {
    case 'vendor':
      return completeRates(vehicle.vendorPackagePrice, vehicle.vendorExtraHour, vehicle.vendorExtraKm);
    case 'vth':
      return completeRates(vehicle.vthPackagePrice, vehicle.vthExtraHour, vehicle.vthExtraKm);
    default: {
      const _never: never = side;
      return _never;
    }
  }
}

function completeRates(
  packagePrice: number | null | undefined,
  extraHour: number | null | undefined,
  extraKm: number | null | undefined,
): SideRates | null {
  if (packagePrice == null || extraHour == null || extraKm == null) return null;
  if (![packagePrice, extraHour, extraKm].every((rate) => Number.isFinite(rate) && rate >= 0)) return null;
  return { packagePrice, extraHour, extraKm };
}

function dutyKilometres(duty: EventDuty): number | null {
  if (duty.openingKm == null || duty.closingKm == null) return null;
  const opening = Number(duty.openingKm);
  const closing = Number(duty.closingKm);
  if (!Number.isFinite(opening) || !Number.isFinite(closing) || closing < opening) return null;
  return roundPaise(closing - opening);
}

function billDuty(
  duty: EventDuty,
  side: BillingSide,
  includedMinutes: number,
  includedKm: number,
  index: { byId: Map<number, EventFleetOption>; byReg: Map<string, EventFleetOption> },
): BillingLine {
  const vehicle = matchVehicle(duty, index);
  const end = billableDutyEnd(duty.closingAt, duty.endRequestedAt);
  const start = reportDutyStart(duty);
  const minutes = start && end
    ? dutyDurationMinutes(start, end, undefined, duty.pausedSeconds || 0)
    : 0;
  const km = dutyKilometres(duty);
  const tollParking = tollParkingAmount(duty.tollParking);
  const cancelled = (duty.status || '').toLowerCase() === 'cancelled';
  const billable = !cancelled && Boolean(end) && km != null;
  const base: BillingLine = {
    dutyId: duty.id,
    dutySlipNo: duty.dutySlipNo,
    dutyDate: duty.dutyDate,
    vehicleId: vehicle?.id ?? duty.vehicleId ?? null,
    vehicleNumber: vehicle?.vehicleNumber || duty.vehicleNumber || 'Unknown vehicle',
    vehicleTypeLabel: vehicle?.vehicleType
      ? eventVehicleTypeLabel(vehicle.vehicleType)
      : (duty.vehicleTypeLabel || eventVehicleTypeLabel(duty.vehicleType)),
    ownerName: (vehicle?.ownerName || '').trim() || 'No owner',
    driverName: contactText(duty.driverName),
    driverPhone: contactText(duty.driverMobile),
    serialNo: vehicle?.serialNo != null && vehicle.serialNo > 0 ? vehicle.serialNo : null,
    billableMinutes: minutes,
    totalKm: km,
    extraMinutes: 0,
    freeKm: 0,
    extraKm: 0,
    packageAmount: null,
    extraHourAmount: null,
    extraKmAmount: null,
    gstAmount: null,
    tollParking,
    lineTotal: null,
    skipReason: billable ? null : 'not_billable',
  };
  if (!billable || km == null) return base;
  const rates = sideRates(vehicle, side);
  if (!rates) {
    return { ...base, skipReason: 'rate_not_set' };
  }
  const extraMinutes = Math.max(0, minutes - includedMinutes);
  const freeKm = extraMinutes > 0 ? roundPaise((extraMinutes / 60) * FREE_KM_PER_EXTRA_HOUR) : 0;
  const extraKm = roundPaise(Math.max(0, km - includedKm - freeKm));
  const packageAmount = roundPaise(rates.packagePrice);
  const extraHourAmount = roundPaise((extraMinutes / 60) * rates.extraHour);
  const extraKmAmount = roundPaise(extraKm * rates.extraKm);
  const taxable = roundPaise(packageAmount + extraHourAmount + extraKmAmount);
  const gstAmount = gstOnSide(side, taxable);
  return {
    ...base,
    extraMinutes,
    freeKm,
    extraKm,
    packageAmount,
    extraHourAmount,
    extraKmAmount,
    gstAmount,
    tollParking,
    lineTotal: roundPaise(taxable + (gstAmount || 0) + tollParking),
    skipReason: null,
  };
}

function tollParkingAmount(value: number | null | undefined): number {
  if (value == null || !Number.isFinite(value) || value < 0) return 0;
  return roundPaise(value);
}

function gstOnSide(side: BillingSide, taxable: number): number | null {
  switch (side) {
    case 'vth':
      return roundPaise(taxable * VTH_GST_RATE);
    case 'vendor':
      return null;
    default: {
      const _never: never = side;
      return _never;
    }
  }
}

function contactText(value: string | null | undefined): string {
  const text = (value || '').trim();
  if (!text || text === '-' || /^not assigned$/i.test(text)) return '';
  return text;
}

function rememberContact(values: string[], value: string): void {
  if (value && !values.includes(value)) values.push(value);
}

function vehicleTotalsFrom(lines: BillingLine[]): BillingVehicleTotal[] {
  const groups = new Map<string, BillingVehicleTotal & { names: string[]; phones: string[] }>();
  lines.forEach((line) => {
    const current = groups.get(line.vehicleNumber) || {
      vehicleNumber: line.vehicleNumber,
      vehicleTypeLabel: line.vehicleTypeLabel,
      ownerName: line.ownerName,
      driverName: '',
      driverPhone: '',
      names: [],
      phones: [],
      serialNo: line.serialNo,
      dutyDays: 0,
      billableMinutes: 0,
      totalKm: 0,
      extraMinutes: 0,
      extraKm: 0,
      total: 0,
    };
    rememberContact(current.names, line.driverName);
    rememberContact(current.phones, line.driverPhone);
    if (line.serialNo != null && (current.serialNo == null || line.serialNo < current.serialNo)) {
      current.serialNo = line.serialNo;
    }
    current.dutyDays += 1;
    current.billableMinutes += line.billableMinutes;
    current.totalKm = roundPaise(current.totalKm + (line.totalKm || 0));
    current.extraMinutes += line.extraMinutes;
    current.extraKm = roundPaise(current.extraKm + line.extraKm);
    current.total = roundPaise(current.total + (line.lineTotal || 0));
    groups.set(line.vehicleNumber, current);
  });
  return [...groups.values()]
    .map(({ names, phones, ...row }) => ({
      ...row,
      driverName: names.join(', '),
      driverPhone: phones.join(', '),
    }))
    .sort((a, b) => compareBillingSerial(a.serialNo, b.serialNo, a.vehicleNumber, b.vehicleNumber));
}

function ownerTotalsFrom(vehicles: BillingVehicleTotal[]): BillingOwnerTotal[] {
  const groups = new Map<string, BillingOwnerTotal & { regs: Set<string>; serialNo: number | null }>();
  vehicles.forEach((vehicle) => {
    const name = vehicle.ownerName || 'No owner';
    const current = groups.get(name) || {
      ownerName: name,
      vehicleCount: 0,
      dutyDays: 0,
      total: 0,
      regs: new Set<string>(),
      serialNo: null,
    };
    current.regs.add(vehicle.vehicleNumber);
    current.vehicleCount = current.regs.size;
    current.dutyDays += vehicle.dutyDays;
    current.total = roundPaise(current.total + vehicle.total);
    if (vehicle.serialNo != null && (current.serialNo == null || vehicle.serialNo < current.serialNo)) {
      current.serialNo = vehicle.serialNo;
    }
    groups.set(name, current);
  });
  return [...groups.values()]
    .sort((a, b) => compareBillingSerial(a.serialNo, b.serialNo, a.ownerName, b.ownerName))
    .map(({ regs: _regs, serialNo: _serialNo, ...row }) => row);
}
