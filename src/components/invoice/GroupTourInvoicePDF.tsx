import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

const SELLER_ADDRESS = '44-66-22/4, Singalamma Puram, Kailasapuram, Visakhapatnam, Andhra Pradesh - 530024';

export interface InvoiceData {
  booking_number: string;
  invoice_number: string;
  passenger_name: string;
  passenger_phone: string;
  passenger_email: string;
  pickup_location: string;
  drop_location: string;
  pickup_date: string;
  pickup_time?: string;
  boarding_point_name?: string | null;
  boarding_point_time?: string | null;
  total_amount: number;
  advance_paid_amount?: number;
  payment_method: string;
  payment_status: string;
  trip_type: string;
  cab_type?: string;
  vehicle?: string;
  invoice_html?: string;
  seats?: string;
  created_at?: string;
}

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Helvetica',
    fontSize: 10,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingBottom: 10,
  },
  headerRight: {
    textAlign: 'right',
  },
  invoiceTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  originalLabel: {
    fontSize: 9,
    color: '#666',
    marginBottom: 8,
  },
  sellerName: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  sellerAddress: {
    fontSize: 9,
    color: '#444',
    lineHeight: 1.4,
    maxWidth: 200,
  },
  metaLabel: {
    fontSize: 9,
    color: '#666',
    marginBottom: 2,
  },
  metaValue: {
    fontSize: 10,
    marginBottom: 8,
  },
  threeCol: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    gap: 16,
  },
  col: {
    flex: 1,
    minWidth: 0,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  sectionText: {
    fontSize: 10,
    lineHeight: 1.4,
    marginBottom: 3,
  },
  fareTable: {
    marginTop: 12,
  },
  tableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tableHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 2,
    borderBottomColor: '#333',
  },
  tableHeaderText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  descCol: {
    flex: 2,
  },
  detailsCol: {
    flex: 1,
    textAlign: 'center',
  },
  amountCol: {
    flex: 1,
    textAlign: 'right',
  },
  totalRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    marginTop: 8,
  },
  totalText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  footer: {
    position: 'absolute',
    bottom: 40,
    left: 40,
    right: 40,
    textAlign: 'center',
    fontSize: 9,
    color: '#666',
  },
  footerThanks: {
    marginBottom: 4,
  },
  footerContact: {
    marginBottom: 2,
  },
  footerGenerated: {
    marginTop: 8,
    fontSize: 8,
    color: '#999',
  },
});

function formatDate(d: string | undefined): string {
  if (!d) return '-';
  try {
    const date = new Date(d);
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return d;
  }
}

function formatPickupTime(dateStr: string | undefined, timeStr?: string | null): string {
  if (!dateStr) return '-';
  const datePart = formatDate(dateStr);
  if (timeStr && timeStr.trim()) {
    const t = timeStr.trim();
    if (/^\d{1,2}:\d{2}/.test(t)) return `${datePart}, ${t}`;
  }
  return datePart;
}

function formatTimeForDisplay(t: string): string {
  const trimmed = t.trim();
  const hhmm = trimmed.match(/^(\d{1,2}):(\d{2})$/);
  if (hhmm) {
    const h = parseInt(hhmm[1], 10);
    const m = hhmm[2];
    if (h >= 12) return `${h === 12 ? 12 : h - 12}:${m} PM`;
    return `${h === 0 ? 12 : h}:${m} AM`;
  }
  if (/^\d{1,2}:\d{2}\s*(AM|PM)$/i.test(trimmed)) return trimmed;
  return trimmed;
}

function formatPickupTimeDisplay(inv: Pick<InvoiceData, 'pickup_time' | 'pickup_date' | 'boarding_point_time'>): string {
  if (inv.pickup_time && inv.pickup_time.trim()) {
    const parts = inv.pickup_time.split(',').map((p) => p.trim()).filter(Boolean);
    if (parts.length >= 2) {
      return `${formatDate(parts[0])}, ${formatTimeForDisplay(parts[1])}`;
    }
    return formatDate(parts[0]) || inv.pickup_time;
  }
  const base = formatPickupTime(inv.pickup_date, inv.boarding_point_time);
  if (inv.boarding_point_time && base !== '-') {
    const parts = base.split(',').map((p) => p.trim());
    if (parts.length >= 2) return `${parts[0]}, ${formatTimeForDisplay(parts[1])}`;
  }
  return base;
}

function formatAmount(n: number): string {
  return n % 1 === 0 ? String(Math.round(n)) : n.toFixed(2);
}

function formatDateTime(d: string | undefined): string {
  if (!d) return '-';
  try {
    const date = new Date(d);
    return date.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return d;
  }
}

export default function GroupTourInvoicePDF({ data }: { data: InvoiceData }) {
  const inv = data;
  const seats = inv.seats ?? (inv.invoice_html?.match(/Seats<\/td><td>([^<]*)<\/td>/) ?? [])[1]?.trim() ?? '-';
  const pickupTimeDisplay = formatPickupTimeDisplay(inv);
  const invoiceDate = formatDate(inv.created_at);
  const generatedAt = formatDateTime(new Date().toISOString());

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.invoiceTitle}>INVOICE</Text>
            <Text style={styles.originalLabel}>Original for Recipient</Text>
            <Text style={styles.sellerName}>VIZAG TAXI HUB</Text>
            <Text style={styles.sellerAddress}>{SELLER_ADDRESS}</Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.metaLabel}>Invoice #</Text>
            <Text style={styles.metaValue}>{inv.invoice_number}</Text>
            <Text style={styles.metaLabel}>Date</Text>
            <Text style={styles.metaValue}>{invoiceDate}</Text>
            <Text style={styles.metaLabel}>Booking #</Text>
            <Text style={styles.metaValue}>{inv.booking_number}</Text>
          </View>
        </View>

        <View style={styles.threeCol}>
          <View style={styles.col}>
            <Text style={styles.sectionTitle}>Customer</Text>
            <Text style={styles.sectionText}>{inv.passenger_name}</Text>
            <Text style={styles.sectionText}>{inv.passenger_phone}</Text>
            <Text style={styles.sectionText}>{inv.passenger_email}</Text>
          </View>
          <View style={styles.col}>
            <Text style={styles.sectionTitle}>Trip Summary</Text>
            <Text style={styles.sectionText}>Trip Type: Group Tour</Text>
            <Text style={styles.sectionText}>Date: {formatDate(inv.pickup_date)}</Text>
          </View>
          <View style={styles.col}>
            <Text style={styles.sectionTitle}>Trip Details</Text>
            <Text style={styles.sectionText}>Pickup: {inv.pickup_location || inv.boarding_point_name || '-'}</Text>
            <Text style={styles.sectionText}>Destination: {inv.drop_location || 'Same'}</Text>
            <Text style={styles.sectionText}>Pickup Time: {pickupTimeDisplay}</Text>
            {seats !== '-' && <Text style={styles.sectionText}>Seats: {seats}</Text>}
          </View>
        </View>

        <View style={styles.fareTable}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderText, styles.descCol]}>Description</Text>
            <Text style={[styles.tableHeaderText, styles.detailsCol]}>Details</Text>
            <Text style={[styles.tableHeaderText, styles.amountCol]}>Amount</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.descCol}>Base Fare</Text>
            <Text style={styles.detailsCol}>{seats !== '-' ? seats : '-'}</Text>
            <Text style={styles.amountCol}>Rs. {formatAmount(inv.total_amount)}</Text>
          </View>
          <View style={[styles.tableRow, styles.totalRow]}>
            <Text style={[styles.totalText, styles.descCol]}>Total Amount</Text>
            <Text style={[styles.detailsCol, styles.totalText]}> </Text>
            <Text style={[styles.totalText, styles.amountCol]}>Rs. {formatAmount(inv.total_amount)}</Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerThanks}>Thank you for choosing Vizag Taxi Hub</Text>
          <Text style={styles.footerContact}>info@vizagtaxihub.com | +91 9966363662</Text>
          <Text style={styles.footerGenerated}>Generated on: {generatedAt}</Text>
        </View>
      </Page>
    </Document>
  );
}
