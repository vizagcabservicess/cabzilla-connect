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

function columnFlex(header: string): number {
  const name = header.trim().toLowerCase();
  if (isSerialColumn(header)) return 0.4;
  if (name === 'slip') return 1.9;
  if (name === 'vehicle') return 1.3;
  if (name === 'driver') return 1.15;
  if (name === 'date' || name === 'reporting time') return 0.9;
  if (name.includes('km') || name === 'status' || name === 'total time') return 0.65;
  if (name.includes('location')) return 1.3;
  return 1;
}

/** Break registration numbers and slip ids so they stay inside their column. */
function breakReportWord(word: string): string[] {
  if (word.length <= 12) return [word];
  const parts: string[] = [];
  for (let index = 0; index < word.length; index += 12) {
    parts.push(word.slice(index, index + 12));
  }
  return parts;
}

function reportCell(header: string) {
  return [
    styles.cell,
    {
      flexGrow: columnFlex(header),
      flexShrink: 1,
      flexBasis: 0,
      minWidth: 0,
      overflow: 'hidden' as const,
    },
  ];
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
                <View key={`h-${index}`} style={reportCell(header)}>
                  <Text style={[styles.headerText, { fontSize }]} hyphenationCallback={breakReportWord}>{header}</Text>
                </View>
              ))}
            </View>
            {rows.length === 0 ? (
              <Text style={styles.empty}>No rows in this filter.</Text>
            ) : (
              rows.map((row, rowIndex) => (
                <View key={`r-${rowIndex}`} style={styles.row} wrap={false}>
                  {headers.map((header, index) => (
                    <View key={`c-${rowIndex}-${index}`} style={reportCell(header)}>
                      <Text style={{ fontSize }} hyphenationCallback={breakReportWord}>{row[index] || '—'}</Text>
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
