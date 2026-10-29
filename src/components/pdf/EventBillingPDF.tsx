import { Document, Font, Image, Page, StyleSheet, Text, View } from '@react-pdf/renderer';
import {
  billingConfirmParty,
  billingDocumentHeading,
  billingPartyLabel,
  billingSkipLabel,
  formatBillingDuration,
  formatBillingKm,
  formatBillingMoney,
  lineAmountBeforeTax,
  type BillingExportMeta,
  type BillingLine,
  type BillingSheet,
  type BillingSide,
} from '@/lib/eventDutyBilling';
import { formatDutyDate } from '@/lib/eventDuty';

function assetSrc(file: string): string {
  if (typeof window !== 'undefined') return `${window.location.origin}${file}`;
  return `${process.cwd().replace(/\\/g, '/')}/public${file}`;
}

Font.register({
  family: 'Mukta',
  fonts: [
    { src: assetSrc('/fonts/Mukta-Regular.ttf'), fontWeight: 400 },
    { src: assetSrc('/fonts/Mukta-Bold.ttf'), fontWeight: 700 },
  ],
});
Font.registerHyphenationCallback((word) => [word]);

const styles = StyleSheet.create({
  page: { paddingTop: 8, paddingHorizontal: 14, paddingBottom: 16, fontFamily: 'Mukta', color: '#111827', fontSize: 7 },
  top: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  logoColumn: { width: 220 },
  logo: { width: 118, height: 32 },
  titleBlock: { flexGrow: 1, alignItems: 'center', paddingHorizontal: 6 },
  heading: { fontWeight: 700, fontSize: 12, marginBottom: 1, textAlign: 'center' },
  sub: { fontSize: 7.5, color: '#6B7280', textAlign: 'center' },
  summary: { width: 220, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' },
  summaryBox: { borderWidth: 0.6, borderColor: '#D1D5DB', borderRadius: 3, paddingVertical: 2, paddingHorizontal: 4, marginLeft: 4, minWidth: 62 },
  summaryLabel: { fontSize: 6, color: '#6B7280' },
  summaryValue: { fontWeight: 700, fontSize: 8 },
  section: { fontWeight: 700, fontSize: 8, marginBottom: 2 },
  headerRow: { flexDirection: 'row', backgroundColor: '#F4F7FB', borderTopWidth: 0.6, borderBottomWidth: 0.6, borderColor: '#D0D7DE' },
  row: { flexDirection: 'row', borderBottomWidth: 0.4, borderColor: '#E5E7EB' },
  totalRow: { flexDirection: 'row', backgroundColor: '#F9FAFB', borderBottomWidth: 0.6, borderColor: '#D1D5DB' },
  cell: { paddingHorizontal: 2, paddingVertical: 1 },
  headerText: { fontWeight: 700 },
  confirm: { marginTop: 10, paddingTop: 4, paddingBottom: 28, borderTopWidth: 0.6, borderTopColor: '#D0D7DE' },
  confirmTitle: { fontWeight: 700, fontSize: 8, marginBottom: 2, textAlign: 'center' },
  confirmBody: { fontSize: 7, lineHeight: 1.25, marginBottom: 6, textAlign: 'center' },
  signRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  signItem: { fontSize: 7, textAlign: 'center' },
});

const LINE_HEADERS = ['SL', 'Date', 'Slip', 'Vehicle', 'Name', 'Phone', 'Hours', 'KM', 'Extra time', 'Extra km', 'Package', 'Extra time ₹', 'Extra km ₹', 'Grand Total', 'Status'];
const LINE_FLEX = [0.35, 0.72, 1.35, 0.9, 1.35, 0.78, 0.72, 0.42, 0.72, 0.55, 0.7, 0.74, 0.7, 0.85, 0.54];

function lineLayout(side: BillingSide) {
  const headers = [...LINE_HEADERS];
  const flexes = [...LINE_FLEX];
  const at = headers.indexOf('Grand Total');
  if (side === 'vth') {
    headers.splice(at, 0, 'Taxable Value', '18% GST', 'Tolls/Parking');
    flexes.splice(at, 0, 0.85, 0.55, 0.95);
  } else {
    headers.splice(at, 0, 'Tolls/Parking');
    flexes.splice(at, 0, 0.95);
  }
  return { headers, flexes };
}

function lineCells(line: BillingLine, side: BillingSide): string[] {
  const cells = [
    line.serialNo != null ? String(line.serialNo) : '',
    line.dutyDate,
    line.dutySlipNo,
    line.vehicleNumber,
    line.driverName,
    line.driverPhone,
    formatBillingDuration(line.billableMinutes),
    formatBillingKm(line.totalKm),
    formatBillingDuration(line.extraMinutes),
    formatBillingKm(line.extraKm),
    formatBillingMoney(line.packageAmount),
    formatBillingMoney(line.extraHourAmount),
    formatBillingMoney(line.extraKmAmount),
  ];
  if (side === 'vth') {
    cells.push(formatBillingMoney(lineAmountBeforeTax(line)));
    cells.push(formatBillingMoney(line.gstAmount));
  }
  cells.push(formatBillingMoney(line.tollParking), formatBillingMoney(line.lineTotal), billingSkipLabel(line.skipReason));
  return cells;
}

export function EventBillingPDF({ sheet, meta }: { sheet: BillingSheet; meta: BillingExportMeta }) {
  const party = sheet.side === 'vth' ? billingPartyLabel(sheet, meta.clientName) : '';
  const layout = lineLayout(sheet.side);
  const billedLines = sheet.lines.filter((line) => line.skipReason == null);
  return (
    <Document title={`${billingDocumentHeading(sheet.side)} ${meta.eventCode}`}>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View style={styles.top}>
          <View style={styles.logoColumn}>
            <Image src={assetSrc('/uploads/vizagtaxihub-logo.png')} style={styles.logo} />
          </View>
          <View style={styles.titleBlock}>
            <Text style={styles.heading}>{billingDocumentHeading(sheet.side)}</Text>
            <Text style={styles.sub}>{meta.eventName} · {meta.eventCode}</Text>
            <Text style={styles.sub}>{party ? `Bill to ${party} · ` : ''}{meta.vehicleLabel} · {formatDutyDate(meta.from)} – {formatDutyDate(meta.to)}</Text>
          </View>
          <View style={styles.summary}>
            {sheet.side === 'vth' ? (
              <View style={styles.summaryBox}>
                <Text style={styles.summaryLabel}>Taxable Value</Text>
                <Text style={styles.summaryValue}>{formatBillingMoney(sheet.totalBeforeTax)}</Text>
              </View>
            ) : null}
            <View style={styles.summaryBox}>
              <Text style={styles.summaryLabel}>Grand Total</Text>
              <Text style={styles.summaryValue}>{formatBillingMoney(sheet.grandTotal)}</Text>
            </View>
            <View style={styles.summaryBox}>
              <Text style={styles.summaryLabel}>Billed vehicles</Text>
              <Text style={styles.summaryValue}>{String(sheet.billedVehicleCount)}</Text>
            </View>
          </View>
        </View>
        <Text style={styles.section}>Duty days</Text>
        <Table headers={layout.headers} flexes={layout.flexes} rows={billedLines.map((line) => lineCells(line, sheet.side))} />
        <View style={styles.totalRow} wrap={false}>
          {layout.headers.map((header, index) => (
            <Text key={header} style={[styles.cell, { flexGrow: layout.flexes[index] || 1, flexBasis: 0, fontWeight: 700 }]}>
              {totalCell(header, index, sheet)}
            </Text>
          ))}
        </View>
        <BillingConfirmation side={sheet.side} />
      </Page>
    </Document>
  );
}

function BillingConfirmation({ side }: { side: BillingSide }) {
  const party = billingConfirmParty(side);
  return (
    <View style={styles.confirm}>
      <Text style={styles.confirmTitle}>Billing Breakup Verification & Confirmation</Text>
      <Text style={styles.confirmBody}>
        We hereby confirm that the billing breakup has been reviewed and verified jointly by the <Text style={{ fontWeight: 700 }}>{party}</Text> and the <Text style={{ fontWeight: 700 }}>Vizag Taxi Hub Representative</Text>.
      </Text>
      <Text style={styles.confirmBody}>
        All billed duty slips, vehicle-wise charges, extra hours, extra kilometres, applicable rates,
      </Text>
      <Text style={styles.confirmBody}>
        and the total payable amount have been checked and mutually agreed upon.
      </Text>
      <View style={styles.signRow}>
        <Text style={styles.signItem}>{party} Signature: ____________________</Text>
        <Text style={styles.signItem}>Date: ____________________</Text>
        <Text style={styles.signItem}>Vizag Taxi Hub Representative Signature: ____________________</Text>
      </View>
    </View>
  );
}

function totalCell(header: string, index: number, sheet: BillingSheet): string {
  if (index === 0) return 'Total';
  if (header === 'Taxable Value') return formatBillingMoney(sheet.totalBeforeTax);
  if (header === '18% GST') return formatBillingMoney(sheet.gstTotal);
  if (header === 'Tolls/Parking') return formatBillingMoney(sheet.tollParkingTotal);
  if (header === 'Grand Total') return formatBillingMoney(sheet.grandTotal);
  return '';
}

function Table({ headers, rows, flexes }: { headers: string[]; rows: string[][]; flexes: number[] }) {
  return (
    <View>
      <View style={styles.headerRow}>
        {headers.map((header, index) => (
          <Text key={header} style={[styles.cell, styles.headerText, { flexGrow: flexes[index] || 1, flexBasis: 0 }]}>{header}</Text>
        ))}
      </View>
      {rows.length === 0 && (
        <Text style={[styles.cell, { color: '#6B7280' }]}>No rows</Text>
      )}
      {rows.map((row, rowIndex) => (
        <View key={`${row[0]}-${row[1]}-${rowIndex}`} style={styles.row} wrap={false}>
          {row.map((cell, index) => (
            <Text key={`${headers[index]}-${rowIndex}`} style={[styles.cell, { flexGrow: flexes[index] || 1, flexBasis: 0 }]}>{cell}</Text>
          ))}
        </View>
      ))}
    </View>
  );
}
