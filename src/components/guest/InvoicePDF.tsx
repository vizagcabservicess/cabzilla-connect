import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';

// Register font for better text rendering
Font.register({
  family: 'Roboto',
  src: 'https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Mu4mxK.woff2',
});

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Roboto',
    fontSize: 11,
    padding: 30,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
    borderBottom: 2,
    borderBottomColor: '#3B82F6',
    paddingBottom: 15,
  },
  logo: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#3B82F6',
  },
  subtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 5,
  },
  invoiceInfo: {
    textAlign: 'right',
  },
  invoiceTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  detailsSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  detailsColumn: {
    width: '45%',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#374151',
    borderBottom: 1,
    borderBottomColor: '#E5E7EB',
    paddingBottom: 5,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 5,
  },
  label: {
    width: '40%',
    fontWeight: 'bold',
    color: '#4B5563',
  },
  value: {
    width: '60%',
    color: '#1F2937',
  },
  billingSection: {
    marginTop: 20,
    marginBottom: 20,
  },
  billingTable: {
    borderTop: 1,
    borderTopColor: '#E5E7EB',
  },
  billingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderBottom: 1,
    borderBottomColor: '#F3F4F6',
  },
  billingRowTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 10,
    backgroundColor: '#F9FAFB',
    fontWeight: 'bold',
    fontSize: 12,
  },
  extraChargeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
    paddingHorizontal: 20,
    fontSize: 10,
    color: '#6B7280',
  },
  footer: {
    marginTop: 30,
    padding: 15,
    backgroundColor: '#F9FAFB',
    borderRadius: 5,
  },
  footerTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#374151',
  },
  footerText: {
    fontSize: 10,
    color: '#6B7280',
    marginBottom: 3,
  },
  thankYou: {
    textAlign: 'center',
    marginTop: 30,
    fontSize: 14,
    fontWeight: 'bold',
    color: '#3B82F6',
  },
});

interface InvoicePDFProps {
  booking: {
    booking_id: string;
    guest_name: string;
    guest_phone: string;
    guest_email: string;
    pickup_location: string;
    drop_location: string;
    pickup_date: string;
    pickup_time: string;
    vehicle_type: string;
    extra_charges?: Array<{
      type: string;
      amount: number;
      description: string;
    }>;
    payment_method?: string;
  };
  subtotal: number;
  extraChargesTotal: number;
  taxes: number;
  totalWithTaxes: number;
}

export const InvoicePDF = ({ booking, subtotal, extraChargesTotal, taxes, totalWithTaxes }: InvoicePDFProps) => {
  // Helper functions to safely access booking data
  const getBookingId = () => booking?.booking_id || 'N/A';
  const getGuestName = () => booking?.guest_name || 'Guest';
  const getGuestPhone = () => booking?.guest_phone || '';
  const getGuestEmail = () => booking?.guest_email || '';
  const getPickupLocation = () => booking?.pickup_location || 'Location not specified';
  const getDropLocation = () => booking?.drop_location || 'Destination not specified';
  const getPickupDate = () => {
    try {
      return booking?.pickup_date ? new Date(booking.pickup_date).toLocaleDateString() : new Date().toLocaleDateString();
    } catch {
      return new Date().toLocaleDateString();
    }
  };
  const getPickupTime = () => booking?.pickup_time || '00:00';
  const getVehicleType = () => booking?.vehicle_type || 'Not specified';
  const getPaymentMethod = () => booking?.payment_method || '';

  return (
  <Document>
    <Page size="A4" style={styles.page}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.logo}>VizagUp Taxi</Text>
          <Text style={styles.subtitle}>Your trusted travel partner</Text>
        </View>
        <View style={styles.invoiceInfo}>
          <Text style={styles.invoiceTitle}>INVOICE</Text>
          <Text>Invoice #: {getBookingId()}</Text>
          <Text>Date: {new Date().toLocaleDateString()}</Text>
        </View>
      </View>

      {/* Customer and Trip Details */}
      <View style={styles.detailsSection}>
        <View style={styles.detailsColumn}>
          <Text style={styles.sectionTitle}>Customer Details</Text>
          <View style={styles.detailRow}>
            <Text style={styles.label}>Name:</Text>
            <Text style={styles.value}>{getGuestName()}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.label}>Phone:</Text>
            <Text style={styles.value}>{getGuestPhone()}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.label}>Email:</Text>
            <Text style={styles.value}>{getGuestEmail()}</Text>
          </View>
        </View>

        <View style={styles.detailsColumn}>
          <Text style={styles.sectionTitle}>Trip Details</Text>
          <View style={styles.detailRow}>
            <Text style={styles.label}>From:</Text>
            <Text style={styles.value}>{getPickupLocation()}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.label}>To:</Text>
            <Text style={styles.value}>{getDropLocation()}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.label}>Date:</Text>
            <Text style={styles.value}>
              {getPickupDate()} at {getPickupTime()}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.label}>Vehicle:</Text>
            <Text style={styles.value}>{getVehicleType()}</Text>
          </View>
        </View>
      </View>

      {/* Billing Details */}
      <View style={styles.billingSection}>
        <Text style={styles.sectionTitle}>Billing Details</Text>
          <View style={styles.billingTable}>
          <View style={styles.billingRow}>
            <Text>Base Fare</Text>
            <Text>₹{subtotal.toLocaleString()}</Text>
          </View>

          {booking.extra_charges && booking.extra_charges.length > 0 && (
            <>
              {booking.extra_charges.map((charge: any, index: number) => (
                <View key={index} style={styles.extraChargeRow}>
                  <Text>{charge.type}: {charge.description}</Text>
                  <Text>₹{charge.amount.toLocaleString()}</Text>
                </View>
              ))}
            </>
          )}

          <View style={styles.billingRow}>
            <Text>GST (18%)</Text>
            <Text>₹{taxes.toLocaleString()}</Text>
          </View>

          <View style={styles.billingRowTotal}>
            <Text>Total Amount</Text>
            <Text>₹{totalWithTaxes.toLocaleString()}</Text>
          </View>

          {getPaymentMethod() && (
            <View style={styles.billingRow}>
              <Text>Payment Method</Text>
              <Text style={{ textTransform: 'capitalize' }}>{getPaymentMethod()}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Company Information */}
      <View style={styles.footer}>
        <Text style={styles.footerTitle}>Company Information</Text>
        <Text style={styles.footerText}>VizagUp Taxi Services</Text>
        <Text style={styles.footerText}>Visakhapatnam, Andhra Pradesh</Text>
        <Text style={styles.footerText}>Phone: +91-XXX-XXX-XXXX</Text>
        <Text style={styles.footerText}>Email: info@vizagup.com</Text>
        <Text style={styles.footerText}>Website: www.vizagup.com</Text>
      </View>

      <Text style={styles.thankYou}>Thank you for choosing VizagUp Taxi!</Text>
    </Page>
  </Document>
  );
};