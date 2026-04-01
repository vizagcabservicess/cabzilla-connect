import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

export interface AdminBookingsExportPdfRow {
  bookingNumber: string;
  passengerName: string;
  phone: string;
  pickup: string;
  drop: string;
  pickupDate: string;
  cabType: string;
  amount: string;
  status: string;
  /** Short payment status label */
  paymentStatus: string;
}

const styles = StyleSheet.create({
  page: { padding: 24, fontSize: 8, fontFamily: 'Helvetica' },
  title: { fontSize: 14, marginBottom: 4, fontWeight: 'bold' },
  subtitle: { fontSize: 9, color: '#6B7280', marginBottom: 12 },
  headerRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingBottom: 4,
    marginBottom: 4,
  },
  headerCell: { fontSize: 7, color: '#374151', fontWeight: 'bold' },
  row: { flexDirection: 'row', paddingVertical: 3, borderBottomWidth: 0.5, borderBottomColor: '#F3F4F6' },
  cell: { fontSize: 7, color: '#111827' },
  c1: { width: '10%' },
  c2: { width: '12%' },
  c3: { width: '10%' },
  c4: { width: '17%' },
  c5: { width: '17%' },
  c6: { width: '10%' },
  c7: { width: '9%' },
  c8: { width: '8%' },
  c9: { width: '7%' },
});

function Header() {
  return (
    <View style={styles.headerRow}>
      <Text style={[styles.headerCell, styles.c1]}>Booking</Text>
      <Text style={[styles.headerCell, styles.c2]}>Passenger</Text>
      <Text style={[styles.headerCell, styles.c3]}>Phone</Text>
      <Text style={[styles.headerCell, styles.c4]}>Pickup</Text>
      <Text style={[styles.headerCell, styles.c5]}>Drop</Text>
      <Text style={[styles.headerCell, styles.c6]}>Pickup dt</Text>
      <Text style={[styles.headerCell, styles.c7]}>Vehicle</Text>
      <Text style={[styles.headerCell, styles.c8]}>Amt</Text>
      <Text style={[styles.headerCell, styles.c9]}>Status / Pay</Text>
    </View>
  );
}

const ROWS_PER_PAGE = 22;

function chunkRows<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
}

export function AdminBookingsExportPDF({
  title,
  generatedAt,
  rows,
}: {
  title: string;
  generatedAt: string;
  rows: AdminBookingsExportPdfRow[];
}) {
  const pages = rows.length === 0 ? [[]] : chunkRows(rows, ROWS_PER_PAGE);

  return (
    <Document>
      {pages.map((pageRows, pageIndex) => (
        <Page key={pageIndex} size="A4" orientation="landscape" style={styles.page}>
          {pageIndex === 0 ? (
            <>
              <Text style={styles.title}>{title}</Text>
              <Text style={styles.subtitle}>
                Exported {generatedAt} — {rows.length} booking(s)
                {pages.length > 1 ? ` (page ${pageIndex + 1}/${pages.length})` : ''}
              </Text>
            </>
          ) : (
            <Text style={styles.subtitle}>
              {title} — page {pageIndex + 1}/{pages.length}
            </Text>
          )}
          <Header />
          {pageRows.map((r, i) => (
            <View key={`${r.bookingNumber}-${pageIndex}-${i}`} style={styles.row}>
              <Text style={[styles.cell, styles.c1]}>{r.bookingNumber}</Text>
              <Text style={[styles.cell, styles.c2]}>{r.passengerName}</Text>
              <Text style={[styles.cell, styles.c3]}>{r.phone}</Text>
              <Text style={[styles.cell, styles.c4]}>{r.pickup}</Text>
              <Text style={[styles.cell, styles.c5]}>{r.drop}</Text>
              <Text style={[styles.cell, styles.c6]}>{r.pickupDate}</Text>
              <Text style={[styles.cell, styles.c7]}>{r.cabType}</Text>
              <Text style={[styles.cell, styles.c8]}>{r.amount}</Text>
              <Text style={[styles.cell, styles.c9]}>{`${r.status} · ${r.paymentStatus}`}</Text>
            </View>
          ))}
          {pageIndex === 0 && rows.length === 0 ? (
            <Text style={{ marginTop: 12, fontSize: 10, color: '#6B7280' }}>No bookings in this export.</Text>
          ) : null}
        </Page>
      ))}
    </Document>
  );
}
