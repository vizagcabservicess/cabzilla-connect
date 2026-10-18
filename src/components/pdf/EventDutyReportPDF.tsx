import React from 'react';
import { Document, Image, Page, StyleSheet, Text, View } from '@react-pdf/renderer';

function logoSrc(): string {
  if (typeof window !== 'undefined') return `${window.location.origin}/uploads/vizagtaxihub-logo.png`;
  return `${process.cwd().replace(/\\/g, '/')}/public/uploads/vizagtaxihub-logo.png`;
}

const styles = StyleSheet.create({
  page: { paddingTop: 8, paddingHorizontal: 14, paddingBottom: 28, fontFamily: 'Helvetica', color: '#111827' },
  top: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  logo: { width: 132, height: 35 },
  logoBalance: { width: 132 },
  titleBlock: { flexGrow: 1, alignItems: 'center' },
  heading: { fontSize: 13, fontFamily: 'Helvetica-Bold', marginBottom: 2, textAlign: 'center' },
  subtitle: { fontSize: 8, color: '#6B7280', textAlign: 'center' },
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
  footer: { position: 'absolute', bottom: 8, right: 14, fontSize: 8, color: '#9CA3AF' },
  confirmSpacer: { flexGrow: 1, minHeight: 10 },
  confirm: { marginTop: 4, paddingTop: 6, borderTopWidth: 0.6, borderTopColor: '#d0d7de', alignItems: 'center' },
  confirmTitle: { fontFamily: 'Helvetica-Bold', fontSize: 11, marginBottom: 4, textAlign: 'center' },
  confirmBody: { fontSize: 9, lineHeight: 1.4, marginBottom: 8, textAlign: 'center' },
  confirmBold: { fontFamily: 'Helvetica-Bold' },
  signRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', width: '100%', marginTop: 4 },
  signItem: { fontSize: 8, textAlign: 'center' },
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

function rowHeight(headers: string[], cells: string[], fontSize: number, pageWidth: number): number {
  const flexes = headers.map(columnFlex);
  const flexTotal = flexes.reduce((sum, flex) => sum + flex, 0) || 1;
  const usable = pageWidth - 28;
  let lines = 1;
  headers.forEach((_header, index) => {
    const colWidth = Math.max(24, (usable * flexes[index]) / flexTotal - 4);
    const text = (cells[index] || '—').trim();
    const textWidth = text.length * fontSize * 0.42;
    lines = Math.max(lines, Math.min(3, Math.ceil(textWidth / colWidth)));
  });
  return 6 + lines * (fontSize + 2.4);
}

function paginateRows(headers: string[], rows: string[][], fontSize: number, wide: boolean, confirmation: boolean): string[][][] {
  const pageHeight = wide ? 595.28 : 841.89;
  const pageWidth = wide ? 841.89 : 595.28;
  const confirmReserve = confirmation ? 86 : 0;
  const firstBudget = pageHeight - 8 - 18 - 48 - 24 - confirmReserve;
  const nextBudget = pageHeight - 8 - 18 - 24 - confirmReserve;
  const pages: string[][][] = [];
  let current: string[][] = [];
  let used = 0;
  let budget = firstBudget;
  rows.forEach((row) => {
    const height = rowHeight(headers, row, fontSize, pageWidth);
    if (current.length > 0 && used + height > budget) {
      pages.push(current);
      current = [];
      used = 0;
      budget = nextBudget;
    }
    current.push(row);
    used += height;
  });
  if (current.length > 0 || pages.length === 0) pages.push(current);
  return pages;
}

function DutyConfirmation() {
  return (
    <View style={styles.confirm} wrap={false}>
      <Text style={styles.confirmTitle}>Duty Verification & Confirmation</Text>
      <Text style={styles.confirmBody}>
        We hereby confirm that all duty slips have been verified and checked jointly by the <Text style={styles.confirmBold}>Event Representative</Text> and the <Text style={styles.confirmBold}>Vizag Taxi Hub Representative</Text>.
      </Text>
      <View style={styles.signRow}>
        <Text style={styles.signItem}>Event Representative Signature: __________</Text>
        <Text style={styles.signItem}>Date: __________</Text>
        <Text style={styles.signItem}>Vizag Taxi Hub Representative Signature: __________</Text>
      </View>
    </View>
  );
}

export function EventDutyReportPDF({
  heading,
  subtitle,
  headers,
  rows,
  confirmation = false,
}: {
  heading: string;
  subtitle?: string;
  headers: string[];
  rows: string[][];
  confirmation?: boolean;
}) {
  const wide = headers.length > 8;
  const fontSize = wide ? 6.5 : 8;
  const pages = paginateRows(headers, rows, fontSize, wide, confirmation);
  return (
    <Document title={heading}>
      {pages.map((pageRows, pageIndex) => (
        <Page key={`page-${pageIndex}`} size="A4" orientation={wide ? 'landscape' : 'portrait'} style={styles.page}>
          {pageIndex === 0 ? (
            <View style={styles.top}>
              <Image src={logoSrc()} style={styles.logo} />
              <View style={styles.titleBlock}>
                <Text style={styles.heading}>{heading}</Text>
                {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
              </View>
              <View style={styles.logoBalance} />
            </View>
          ) : null}
          {headers.length === 0 ? (
            <Text style={styles.empty}>No rows in this filter.</Text>
          ) : (
            <View>
              <View style={styles.headerRow}>
                {headers.map((header, index) => (
                  <View key={`h-${pageIndex}-${index}`} style={reportCell(header)}>
                    <Text style={[styles.headerText, { fontSize }]} hyphenationCallback={breakReportWord}>{header}</Text>
                  </View>
                ))}
              </View>
              {pageRows.length === 0 ? (
                <Text style={styles.empty}>No rows in this filter.</Text>
              ) : (
                pageRows.map((row, rowIndex) => (
                  <View key={`r-${pageIndex}-${rowIndex}`} style={styles.row} wrap={false}>
                    {headers.map((header, index) => (
                      <View key={`c-${pageIndex}-${rowIndex}-${index}`} style={reportCell(header)}>
                        <Text style={{ fontSize }} hyphenationCallback={breakReportWord}>{row[index] || '—'}</Text>
                      </View>
                    ))}
                  </View>
                ))
              )}
            </View>
          )}
          {confirmation ? <View style={styles.confirmSpacer} /> : null}
          {confirmation ? <DutyConfirmation /> : null}
          <Text style={styles.footer} fixed render={() => `${pageIndex + 1} / ${pages.length}`} />
        </Page>
      ))}
    </Document>
  );
}
