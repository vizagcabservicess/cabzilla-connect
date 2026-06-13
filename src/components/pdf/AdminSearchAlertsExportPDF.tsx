import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

export interface AdminSearchAlertsExportPdfRow {
  searchedAt: string;
  guestPhone: string;
  pickup: string;
  drop: string;
  tripType: string;
  departure: string;
  route: string;
  results: string;
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
  c1: { width: '11%' },
  c2: { width: '10%' },
  c3: { width: '14%' },
  c4: { width: '14%' },
  c5: { width: '13%' },
  c6: { width: '10%' },
  c7: { width: '10%' },
  c8: { width: '18%' },
});

function Header() {
  return (
    <View style={styles.headerRow}>
      <Text style={[styles.headerCell, styles.c1]}>Searched</Text>
      <Text style={[styles.headerCell, styles.c2]}>Guest</Text>
      <Text style={[styles.headerCell, styles.c3]}>Pickup</Text>
      <Text style={[styles.headerCell, styles.c4]}>Drop</Text>
      <Text style={[styles.headerCell, styles.c5]}>Trip type</Text>
      <Text style={[styles.headerCell, styles.c6]}>Departure</Text>
      <Text style={[styles.headerCell, styles.c7]}>Route</Text>
      <Text style={[styles.headerCell, styles.c8]}>Results</Text>
    </View>
  );
}

const ROWS_PER_PAGE = 20;

function chunkRows<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
}

export function AdminSearchAlertsExportPDF({
  title,
  generatedAt,
  rows,
}: {
  title: string;
  generatedAt: string;
  rows: AdminSearchAlertsExportPdfRow[];
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
                Exported {generatedAt} — {rows.length} alert(s)
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
            <View key={`${r.searchedAt}-${pageIndex}-${i}`} style={styles.row}>
              <Text style={[styles.cell, styles.c1]}>{r.searchedAt}</Text>
              <Text style={[styles.cell, styles.c2]}>{r.guestPhone}</Text>
              <Text style={[styles.cell, styles.c3]}>{r.pickup}</Text>
              <Text style={[styles.cell, styles.c4]}>{r.drop}</Text>
              <Text style={[styles.cell, styles.c5]}>{r.tripType}</Text>
              <Text style={[styles.cell, styles.c6]}>{r.departure}</Text>
              <Text style={[styles.cell, styles.c7]}>{r.route}</Text>
              <Text style={[styles.cell, styles.c8]}>{r.results}</Text>
            </View>
          ))}
          {pageIndex === 0 && rows.length === 0 ? (
            <Text style={{ marginTop: 12, fontSize: 10, color: '#6B7280' }}>No search alerts in this export.</Text>
          ) : null}
        </Page>
      ))}
    </Document>
  );
}
