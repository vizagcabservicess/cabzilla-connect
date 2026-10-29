/**
 * Event billing calculator.
 * Run: npx tsx --tsconfig tsconfig.json src/lib/eventDutyBilling.selftest.ts
 */
import assert from 'node:assert/strict';
import type { EventDuty, EventFleetOption } from '@/types/eventDuty';
import {
  billingConfirmParty,
  billingDocumentHeading,
  billingDayCount,
  billingFileStem,
  billingPackageNote,
  billingPartyLabel,
  billingSideTitle,
  billingSkipLabel,
  buildBillingSheet,
  formatBillingDuration,
  formatBillingMoney,
} from './eventDutyBilling';
import { buildBillingWorkbook } from './eventBillingWorkbook';

let failed = 0;
let passed = 0;

function check(name: string, fn: () => void) {
  try {
    fn();
    passed += 1;
    console.log(`  PASS  ${name}`);
  } catch (err) {
    failed += 1;
    console.error(`  FAIL  ${name}`);
    console.error(`        ${(err as Error).message}`);
  }
}

function vehicle(overrides: Partial<EventFleetOption> = {}): EventFleetOption {
  return {
    id: 7,
    vehicleNumber: 'AP31AB1234',
    name: 'Innova Crysta',
    vehicleType: 'innova_crysta',
    ownerName: 'Raju',
    vendorPackagePrice: 2500,
    vendorExtraHour: 150,
    vendorExtraKm: 12,
    vthPackagePrice: 3000,
    vthExtraHour: 200,
    vthExtraKm: 15,
    ...overrides,
  };
}

function duty(overrides: Partial<EventDuty> = {}): EventDuty {
  return {
    id: 1,
    dutySlipNo: 'VTH-2026-10-001-12-01',
    eventId: 1,
    assignmentId: 1,
    vehicleId: 7,
    vehicleType: 'innova_crysta',
    vehicleNumber: 'AP31AB1234',
    driverName: 'Ravi',
    driverMobile: '9848012345',
    dutyDate: '2026-10-12',
    reportingTime: '06:00',
    openingAt: '2026-10-12 06:05:00',
    closingAt: '2026-10-12 14:00:00',
    openingKm: 1000,
    closingKm: 1080,
    totalKm: 80,
    status: 'completed',
    pausedSeconds: 0,
    ...overrides,
  };
}

console.log('\n=== event billing ===');

check('under the minimum charges the package only', () => {
  const sheet = buildBillingSheet({
    side: 'vth',
    includedHours: 10,
    includedKm: 100,
    duties: [duty()],
    vehicles: [vehicle()],
  });
  assert.equal(sheet.lines.length, 1);
  const line = sheet.lines[0];
  assert.equal(line.billableMinutes, 8 * 60);
  assert.equal(line.extraMinutes, 0);
  assert.equal(line.extraKm, 0);
  assert.equal(line.packageAmount, 3000);
  assert.equal(line.extraHourAmount, 0);
  assert.equal(line.extraKmAmount, 0);
  assert.equal(line.gstAmount, 540);
  assert.equal(line.lineTotal, 3540);
  assert.equal(sheet.totalBeforeTax, 3000);
  assert.equal(sheet.grandTotal, 3540);
  assert.equal(line.driverName, 'Ravi');
  assert.equal(line.driverPhone, '9848012345');
  assert.equal(line.skipReason, null);
});

check('12 hr 10 min and 130 km bills pro-rata extra time and actual extra km', () => {
  const sheet = buildBillingSheet({
    side: 'vth',
    duties: [duty({
      closingAt: '2026-10-12 18:10:00',
      closingKm: 1130,
      totalKm: 130,
    })],
    vehicles: [vehicle()],
  });
  const line = sheet.lines[0];
  assert.equal(line.billableMinutes, 12 * 60 + 10);
  assert.equal(line.extraMinutes, 130);
  assert.equal(line.freeKm, 21.67);
  assert.equal(line.extraKm, 8.33);
  assert.equal(line.packageAmount, 3000);
  assert.equal(line.extraHourAmount, 433.33);
  assert.equal(line.extraKmAmount, 124.95);
  assert.equal(line.gstAmount, 640.49);
  assert.equal(line.lineTotal, 4198.77);
  assert.equal(sheet.totalBeforeTax, 3558.28);
  assert.equal(formatBillingDuration(line.extraMinutes), '2 hr 10 min');
});

check('vendor and VTH prices stay separate', () => {
  const input = {
    includedHours: 10,
    includedKm: 100,
    duties: [duty({ closingAt: '2026-10-12 18:10:00', closingKm: 1130 })],
    vehicles: [vehicle()],
  };
  const vendor = buildBillingSheet({ ...input, side: 'vendor' });
  const vth = buildBillingSheet({ ...input, side: 'vth' });
  assert.equal(vendor.lines[0].freeKm, 21.67);
  assert.equal(vendor.lines[0].extraKm, 8.33);
  assert.equal(vendor.lines[0].packageAmount, 2500);
  assert.equal(vendor.lines[0].extraHourAmount, 325);
  assert.equal(vendor.lines[0].extraKmAmount, 99.96);
  assert.equal(vendor.lines[0].gstAmount, null);
  assert.equal(vendor.lines[0].lineTotal, 2924.96);
  assert.equal(vth.lines[0].gstAmount, 640.49);
  assert.equal(vth.lines[0].lineTotal, 4198.77);
  assert.notEqual(vendor.grandTotal, vth.grandTotal);
});

check('billing breakup is signed by the vendor or the event', () => {
  assert.equal(billingConfirmParty('vendor'), 'Vendor Representative');
  assert.equal(billingConfirmParty('vth'), 'Event Representative');
  assert.equal(billingDocumentHeading('vendor'), 'Vendor bill');
  assert.equal(billingDocumentHeading('vth'), 'Consolidated Billing & Verification');
});

check('missing rates are left out of the total', () => {
  const sheet = buildBillingSheet({
    side: 'vendor',
    duties: [duty()],
    vehicles: [vehicle({
      vendorPackagePrice: null,
      vendorExtraHour: 150,
      vendorExtraKm: 12,
    })],
  });
  assert.equal(sheet.lines[0].skipReason, 'rate_not_set');
  assert.equal(sheet.lines[0].lineTotal, null);
  assert.equal(sheet.grandTotal, 0);
  assert.equal(sheet.billedCount, 0);
  assert.equal(sheet.skippedCount, 1);
  assert.equal(billingSkipLabel('rate_not_set'), 'Rate not set');
});

check('incomplete and cancelled duties are not billed', () => {
  const sheet = buildBillingSheet({
    side: 'vth',
    duties: [
      duty({ id: 2, dutySlipNo: 'OPEN', closingKm: null, closingAt: null, status: 'in_progress' }),
      duty({ id: 3, dutySlipNo: 'CANCEL', status: 'cancelled' }),
    ],
    vehicles: [vehicle()],
  });
  assert.equal(sheet.lines.every((line) => line.skipReason === 'not_billable'), true);
  assert.equal(sheet.grandTotal, 0);
  assert.equal(billingSkipLabel('not_billable'), 'Not billed');
});

check('paused time reduces billable hours', () => {
  const sheet = buildBillingSheet({
    side: 'vth',
    duties: [duty({
      closingAt: '2026-10-12 18:10:00',
      closingKm: 1100,
      pausedSeconds: 70 * 60,
    })],
    vehicles: [vehicle()],
  });
  const line = sheet.lines[0];
  assert.equal(line.billableMinutes, 11 * 60);
  assert.equal(line.extraMinutes, 60);
  assert.equal(line.extraHourAmount, 200);
});

check('ask-to-end cuts the clock', () => {
  const sheet = buildBillingSheet({
    side: 'vth',
    duties: [duty({
      closingAt: '2026-10-12 20:00:00',
      endRequestedAt: '2026-10-12 16:10:00',
      closingKm: 1100,
    })],
    vehicles: [vehicle()],
  });
  const line = sheet.lines[0];
  assert.equal(line.billableMinutes, 10 * 60 + 10);
  assert.equal(line.extraMinutes, 10);
  assert.equal(line.extraHourAmount, 33.33);
});

check('two vehicles keep their own rates and owner subtotals', () => {
  const sheet = buildBillingSheet({
    side: 'vendor',
    duties: [
      duty({ id: 1, dutySlipNo: 'A' }),
      duty({
        id: 2,
        dutySlipNo: 'B',
        vehicleId: 8,
        vehicleNumber: 'AP31CD5678',
        dutyDate: '2026-10-13',
      }),
    ],
    vehicles: [
      vehicle(),
      vehicle({
        id: 8,
        vehicleNumber: 'AP31CD5678',
        ownerName: 'Raju',
        vendorPackagePrice: 2000,
        vendorExtraHour: 100,
        vendorExtraKm: 10,
      }),
    ],
  });
  assert.equal(sheet.vehicleTotals.length, 2);
  assert.equal(sheet.vehicleTotals[0].total, 2500);
  assert.equal(sheet.vehicleTotals[1].total, 2000);
  assert.equal(sheet.ownerTotals.length, 1);
  assert.equal(sheet.ownerTotals[0].ownerName, 'Raju');
  assert.equal(sheet.ownerTotals[0].vehicleCount, 2);
  assert.equal(sheet.ownerTotals[0].total, 4500);
  assert.equal(sheet.grandTotal, 4500);
});

check('matches a vehicle by registration when the duty has no vehicle id', () => {
  const sheet = buildBillingSheet({
    side: 'vth',
    duties: [duty({ vehicleId: null, vehicleNumber: 'ap31 ab 1234' })],
    vehicles: [vehicle()],
  });
  assert.equal(sheet.lines[0].lineTotal, 3540);
  assert.equal(sheet.lines[0].vehicleNumber, 'AP31AB1234');
});

check('labels, party, and file name follow the bill side', () => {
  const sheet = buildBillingSheet({
    side: 'vendor',
    duties: [duty()],
    vehicles: [vehicle()],
  });
  assert.equal(billingSideTitle('vendor'), 'Vendor bill');
  assert.equal(billingSideTitle('vth'), 'VTH bill');
  assert.equal(billingPartyLabel(sheet, 'Acme Events'), '');
  assert.equal(billingPartyLabel({ ...sheet, side: 'vth' }, 'Acme Events'), 'Acme Events');
  assert.equal(billingDayCount('2026-10-12', '2026-10-17'), 6);
  assert.equal(billingDayCount('2026-10-12', '2026-10-12'), 1);
  assert.match(billingPackageNote(10, 100), /10 hr \/ 100 km/);
  assert.match(billingPackageNote(10, 100), /10 km free/);
  assert.equal(formatBillingMoney(3883.33), '₹3,883.33');
  assert.equal(
    billingFileStem(sheet, {
      eventName: 'October 2026 Event',
      eventCode: 'VTH-2026-10-001',
      clientName: 'Acme Events',
      from: '2026-10-12',
      to: '2026-10-21',
      vehicleLabel: 'All vehicles',
    }),
    'VTH-2026-10-001-vendor-bill-all-vehicles-2026-10-12-to-2026-10-21',
  );
});

check('each extra hour removes 10 km from that day before extra km is billed', () => {
  const sheet = buildBillingSheet({
    side: 'vth',
    duties: [duty({
      closingAt: '2026-10-12 18:00:00',
      closingKm: 1150,
      totalKm: 150,
    })],
    vehicles: [vehicle()],
  });
  const line = sheet.lines[0];
  assert.equal(line.extraMinutes, 120);
  assert.equal(line.freeKm, 20);
  assert.equal(line.extraKm, 30);
  assert.equal(line.extraKmAmount, 450);
});

check('free km cannot make extra km negative', () => {
  const sheet = buildBillingSheet({
    side: 'vth',
    duties: [duty({
      closingAt: '2026-10-12 22:53:00',
      closingKm: 1068,
      totalKm: 68,
    })],
    vehicles: [vehicle()],
  });
  const line = sheet.lines[0];
  assert.equal(line.extraMinutes, 6 * 60 + 53);
  assert.equal(line.freeKm, 68.83);
  assert.equal(line.extraKm, 0);
  assert.equal(line.extraKmAmount, 0);
});

check('vehicles follow the serial numbers saved on assignments', () => {
  const sheet = buildBillingSheet({
    side: 'vth',
    duties: [
      duty({ id: 1, dutySlipNo: 'A', vehicleId: 8, vehicleNumber: 'AP31CD5678' }),
      duty({ id: 2, dutySlipNo: 'B', vehicleId: 7, vehicleNumber: 'AP31AB1234', dutyDate: '2026-10-13' }),
      duty({ id: 3, dutySlipNo: 'C', vehicleId: 9, vehicleNumber: 'AP31AA0001', dutyDate: '2026-10-14' }),
    ],
    vehicles: [
      vehicle({ serialNo: 2 }),
      vehicle({ id: 8, vehicleNumber: 'AP31CD5678', serialNo: 1, ownerName: 'Kumar' }),
      vehicle({ id: 9, vehicleNumber: 'AP31AA0001', serialNo: null, ownerName: 'No serial' }),
    ],
  });
  assert.deepEqual(sheet.lines.map((line) => line.vehicleNumber), ['AP31CD5678', 'AP31AB1234', 'AP31AA0001']);
  assert.deepEqual(sheet.lines.map((line) => line.serialNo), [1, 2, null]);
  assert.equal(sheet.vehicleTotals[0].vehicleNumber, 'AP31CD5678');
  assert.equal(sheet.ownerTotals[0].ownerName, 'Kumar');
});

check('excel workbook has the duty lines sheet', () => {
  const sheet = buildBillingSheet({
    side: 'vendor',
    duties: [duty({ closingAt: '2026-10-12 18:10:00', closingKm: 1130 })],
    vehicles: [vehicle()],
  });
  const meta = {
    eventName: 'October 2026 Event',
    eventCode: 'VTH-2026-10-001',
    clientName: 'Acme Events',
    from: '2026-10-12',
    to: '2026-10-21',
    vehicleLabel: 'AP31AB1234',
  };
  const workbook = buildBillingWorkbook(sheet, meta);
  assert.deepEqual(workbook.worksheets.map((item) => item.name), ['Lines']);
  const lines = workbook.getWorksheet('Lines');
  assert.ok(lines);
  const header = lines.getRow(4).values;
  assert.ok(Array.isArray(header));
  assert.equal(header.includes('Name'), true);
  assert.equal(header.includes('Phone'), true);
  assert.equal(header.includes('Owner'), false);
  assert.equal(header.includes('Grand Total'), true);
  assert.equal(header.includes('Taxable Value'), false);
  const money = lines.getRow(5).getCell(17).value;
  assert.equal(money, 2924.96);
  assert.equal(lines.getRow(5).getCell(16).value, 0);
  const vthSheet = buildBillingSheet({
    side: 'vth',
    duties: [duty()],
    vehicles: [vehicle()],
  });
  const vth = buildBillingWorkbook(vthSheet, meta);
  assert.deepEqual(vth.worksheets.map((item) => item.name), ['Lines']);
  const vthLines = vth.getWorksheet('Lines');
  assert.ok(vthLines);
  const vthHeader = vthLines.getRow(4).values;
  assert.ok(Array.isArray(vthHeader));
  assert.equal(vthHeader.indexOf('Taxable Value'), 16);
  assert.equal(vthHeader.indexOf('18% GST'), 17);
  assert.equal(vthHeader.indexOf('Tolls/Parking'), 18);
  assert.equal(vthLines.getRow(5).getCell(16).value, 3000);
  assert.equal(vthLines.getRow(5).getCell(17).value, 540);
  assert.equal(vthLines.getRow(5).getCell(18).value, 0);
  assert.equal(vthLines.getRow(5).getCell(19).value, 3540);
  const vthTotal = vthLines.getRow(6);
  assert.equal(vthTotal.getCell(16).value, 3000);
  assert.equal(vthTotal.getCell(17).value, 540);
  assert.equal(vthTotal.getCell(18).value, 0);
  assert.equal(vthTotal.getCell(19).value, 3540);
});

check('tolls and parking are added after tax and are not taxed', () => {
  const input = {
    duties: [duty({ tollParking: 200 })],
    vehicles: [vehicle()],
  };
  const vth = buildBillingSheet({ ...input, side: 'vth' });
  const vendor = buildBillingSheet({ ...input, side: 'vendor' });
  assert.equal(vth.lines[0].tollParking, 200);
  assert.equal(vth.totalBeforeTax, 3000);
  assert.equal(vth.gstTotal, 540);
  assert.equal(vth.tollParkingTotal, 200);
  assert.equal(vth.lines[0].lineTotal, 3740);
  assert.equal(vth.grandTotal, 3740);
  assert.equal(vendor.lines[0].gstAmount, null);
  assert.equal(vendor.lines[0].lineTotal, 2700);
  assert.equal(vendor.tollParkingTotal, 200);
  assert.equal(vendor.grandTotal, 2700);
  const unfinished = buildBillingSheet({
    ...input,
    side: 'vth',
    duties: [duty({ tollParking: 200, closingAt: null, closingKm: null, totalKm: null })],
  });
  assert.equal(unfinished.lines[0].tollParking, 200);
  assert.equal(unfinished.lines[0].lineTotal, null);
  assert.equal(unfinished.tollParkingTotal, 0);
  assert.equal(unfinished.grandTotal, 0);
});

console.log(`\n${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
