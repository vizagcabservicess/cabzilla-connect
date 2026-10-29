import ExcelJS from 'exceljs';
import {
  billingPackageNote,
  billingPartyLabel,
  billingSideTitle,
  billingSkipLabel,
  formatBillingDuration,
  lineAmountBeforeTax,
  type BillingExportMeta,
  type BillingSheet,
} from '@/lib/eventDutyBilling';

const MONEY = '[$₹-4009]#,##0.00';

export function buildBillingWorkbook(sheet: BillingSheet, meta: BillingExportMeta): ExcelJS.Workbook {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Vizag Taxi Hub';
  addLinesSheet(workbook, sheet, meta);
  return workbook;
}

function addLinesSheet(workbook: ExcelJS.Workbook, sheet: BillingSheet, meta: BillingExportMeta): void {
  const ws = workbook.addWorksheet('Lines');
  const withGst = sheet.side === 'vth';
  const party = sheet.side === 'vth' ? `Bill to ${billingPartyLabel(sheet, meta.clientName)}` : '';
  ws.addRow([`${billingSideTitle(sheet.side)}${withGst ? ' · 18% GST' : ''} · ${meta.eventName}`]);
  ws.addRow([`${meta.eventCode} · ${meta.vehicleLabel} · ${meta.from} to ${meta.to}${party ? ` · ${party}` : ''}`]);
  ws.addRow([billingPackageNote(sheet.includedHours, sheet.includedKm)]);
  const header = ws.addRow([
    'SL.No',
    'Date',
    'Slip',
    'Vehicle',
    'Type',
    'Name',
    'Phone',
    'Hours',
    'KM',
    'Extra time',
    'Free km',
    'Extra km',
    'Package',
    'Extra time amount',
    'Extra km amount',
    ...(withGst ? ['Taxable Value', '18% GST'] : []),
    'Tolls/Parking',
    'Grand Total',
    'Status',
  ]);
  styleHeader(header);
  const moneyColumns = withGst ? [13, 14, 15, 16, 17, 18, 19] : [13, 14, 15, 16, 17];
  const totalColumn = withGst ? 19 : 17;
  sheet.lines.forEach((line) => {
    const row = ws.addRow([
      line.serialNo ?? '',
      line.dutyDate,
      line.dutySlipNo,
      line.vehicleNumber,
      line.vehicleTypeLabel,
      line.driverName,
      line.driverPhone,
      formatBillingDuration(line.billableMinutes),
      line.totalKm,
      formatBillingDuration(line.extraMinutes),
      line.freeKm,
      line.extraKm,
      line.packageAmount,
      line.extraHourAmount,
      line.extraKmAmount,
      ...(withGst ? [lineAmountBeforeTax(line), line.gstAmount] : []),
      line.tollParking,
      line.lineTotal,
      billingSkipLabel(line.skipReason),
    ]);
    moneyColumns.forEach((column) => {
      row.getCell(column).numFmt = MONEY;
    });
  });
  const totalValues: Array<string | number> = Array.from({ length: totalColumn + 1 }, () => '');
  totalValues[0] = 'Grand Total';
  if (withGst) {
    totalValues[totalColumn - 4] = sheet.totalBeforeTax;
    totalValues[totalColumn - 3] = sheet.gstTotal;
  }
  totalValues[totalColumn - 2] = sheet.tollParkingTotal;
  totalValues[totalColumn - 1] = sheet.grandTotal;
  const total = ws.addRow(totalValues);
  total.font = { bold: true };
  moneyColumns.forEach((column) => {
    if (typeof total.getCell(column).value === 'number') total.getCell(column).numFmt = MONEY;
  });
  ws.columns.forEach((column) => {
    column.width = 18;
  });
  ws.getColumn(1).width = 14;
  ws.getColumn(2).width = 28;
  ws.getRow(1).font = { bold: true, size: 14 };
}

function styleHeader(row: ExcelJS.Row): void {
  row.font = { bold: true };
  row.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF4F7FB' } };
  });
}
