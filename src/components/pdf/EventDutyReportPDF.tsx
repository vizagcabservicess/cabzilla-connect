import React from 'react';
import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: { padding: 18, fontFamily: 'Helvetica', color: '#111827' },
  brand: { fontSize: 12, color: '#0066FF', fontWeight: 'bold', marginBottom: 2 },
  heading: { fontSize: 11, marginBottom: 2 },
  subtitle: { fontSize: 8, color: '#6B7280', marginBottom: 8 },
  headerRow: {
    flexDirection: 'row',
    backgroundColor: '#f4f7fb',
    borderTopWidth: 0.6,
    borderBottomWidth: 0.6,
    borderColor: '#d0d7de',
  },
  row: {
    flexDirection: 'row',
    borderBottomWidth: 0.4,
    borderColor: '#e5e7eb',
  },
  cell: { paddingHorizontal: 3, paddingVertical: 3 },
  headerText: { fontWeight: 'bold' },
  empty: { marginTop: 12, fontSize: 9, color: '#6B7280' },
  footer: { position: 'absolute', bottom: 8, right: 18, fontSize: 8, color: '#9CA3AF' },
});

function isSerialColumn(header: string): boolean {
  return /^sl\.?\s*no$/i.test(header.trim());
}

export function EventDutyReportPDF({
  heading,
  subtitle,
  headers,
  rows,
}: {
  heading: string;
  subtitle?: string;
  headers: string[];
  rows: string[][];
}) {
  const wide = headers.length > 8;
  const fontSize = wide ? 6.5 : 8;
  return (
    <Document title={heading}>
      <Page size="A4" orientation={wide ? 'landscape' : 'portrait'} style={styles.page}>
        <Text style={styles.brand}>VIZAG TAXI HUB</Text>
        <Text style={styles.heading}>{heading}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        {headers.length === 0 ? (
          <Text style={styles.empty}>No rows in this filter.</Text>
        ) : (
          <View>
            <View style={styles.headerRow} fixed>
              {headers.map((header, index) => (
                <View key={`h-${index}`} style={[styles.cell, { flex: isSerialColumn(header) ? 0.45 : 1 }]}>
                  <Text style={[styles.headerText, { fontSize }]}>{header}</Text>
                </View>
              ))}
            </View>
            {rows.length === 0 ? (
              <Text style={styles.empty}>No rows in this filter.</Text>
            ) : (
              rows.map((row, rowIndex) => (
                <View key={`r-${rowIndex}`} style={styles.row} wrap={false}>
                  {headers.map((header, index) => (
                    <View key={`c-${rowIndex}-${index}`} style={[styles.cell, { flex: isSerialColumn(header) ? 0.45 : 1 }]}>
                      <Text style={{ fontSize }}>{row[index] || '—'}</Text>
                    </View>
                  ))}
                </View>
              ))
            )}
          </View>
        )}
        <Text
          style={styles.footer}
          fixed
          render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
        />
      </Page>
    </Document>
  );
}
