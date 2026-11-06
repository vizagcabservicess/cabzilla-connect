import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: { padding: 18, fontFamily: 'Helvetica', color: '#111827' },
  title: { fontFamily: 'Helvetica-Bold', fontSize: 14, marginBottom: 2 },
  subtitle: { fontSize: 8, color: '#6B7280', marginBottom: 10 },
  headerRow: { flexDirection: 'row', backgroundColor: '#f4f7fb', borderBottomWidth: 0.6, borderColor: '#d0d7de' },
  row: { flexDirection: 'row', borderBottomWidth: 0.3, borderColor: '#e5e7eb' },
  cell: { fontSize: 7, paddingHorizontal: 3, paddingVertical: 3 },
  headerText: { fontFamily: 'Helvetica-Bold', fontSize: 7 },
});

const WIDTHS = ['9%', '12%', '16%', '8%', '7%', '8%', '9%', '9%', '7%', '8%', '7%'];

export function FuelRecordsPDF({
  subtitle,
  headers,
  rows,
}: {
  subtitle: string;
  headers: string[];
  rows: string[][];
}) {
  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <Text style={styles.title}>Fuel records</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
        <View style={styles.headerRow}>
          {headers.map((header, index) => (
            <Text key={header} style={[styles.cell, styles.headerText, { width: WIDTHS[index] || '8%' }]}>
              {header}
            </Text>
          ))}
        </View>
        {rows.map((row, rowIndex) => (
          <View key={`row-${rowIndex}`} style={styles.row}>
            {row.map((cell, index) => (
              <Text key={`${rowIndex}-${index}`} style={[styles.cell, { width: WIDTHS[index] || '8%' }]}>
                {cell}
              </Text>
            ))}
          </View>
        ))}
        {rows.length === 0 ? <Text style={styles.subtitle}>No fuel records match these filters.</Text> : null}
      </Page>
    </Document>
  );
}
