
import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 10,
    padding: 30,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    borderBottom: 1,
    borderBottomColor: '#3B82F6',
    paddingBottom: 10,
  },
  logo: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#3B82F6',
  },
  subtitle: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 3,
  },
  invoiceInfo: {
    textAlign: 'right',
  },
  invoiceTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 3,
  },
  detailsSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  detailsColumn: {
    width: '45%',
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#374151',
    borderBottom: 1,
    borderBottomColor: '#E5E7EB',
    paddingBottom: 3,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 3,
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
    marginTop: 15,
    marginBottom: 15,
  },
  billingTable: {
    borderTop: 0,
    borderTopColor: '#E5E7EB',
  },
  billingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderBottom: 1,
    borderBottomColor: '#F3F4F6',
  },
  billingRowTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 8,
    backgroundColor: '#F9FAFB',
    fontWeight: 'bold',
    fontSize: 11,
  },
  extraChargeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    paddingHorizontal: 16,
    fontSize: 9,
    color: '#6B7280',
  },
  footer: {
    marginTop: 20,
    padding: 10,
    backgroundColor: '#F9FAFB',
    borderRadius: 3,
  },
  footerTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#374151',
  },
  footerText: {
    fontSize: 9,
    color: '#6B7280',
    marginBottom: 2,
  },
  thankYou: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 12,
    fontWeight: 'bold',
    color: '#3B82F6',
  },
});

interface Booking {
  id: number;
  booking_id?: string;
  pickup_location?: string;
  drop_location?: string;
  pickup_date?: string;
  pickup_time?: string;
  vehicle_type?: string;
  status?: string;
  total_amount?: number;
  extra_charges?: Array<{
    type: string;
    amount: number;
    description: string;
  }>;
  payment_method?: string;
  guest_name?: string;
  guest_phone?: string;
  guest_email?: string;
  bookingNumber?: string;
  pickupLocation?: string;
  dropLocation?: string;
  pickupDate?: string;
  pickupTime?: string;
  cab_type?: string;
  cabType?: string;
  passenger_name?: string;
  passengerName?: string;
  name?: string;
  passenger_phone?: string;
  passengerPhone?: string;
  passenger_email?: string;
  passengerEmail?: string;
  totalAmount?: number;
  paymentMethod?: string;
  tripType?: string;
  tripMode?: string;
  extraCharges?: Array<{
    type: string;
    amount: number;
    description: string;
  }>;
  gstEnabled?: boolean;
  gstAmount?: number;
}

interface InvoicePDFProps {
  booking: Booking;
  subtotal: number;
  extraChargesTotal: number;
  taxes: number;
  totalWithTaxes: number;
}

export const InvoicePDF = ({ booking, subtotal, extraChargesTotal, taxes, totalWithTaxes }: InvoicePDFProps) => {
  // Helper functions to safely access booking data
  const getBookingId = () => {
    const id = booking?.booking_id || booking?.bookingNumber || booking?.id;
    return id ? String(id) : 'N/A';
  };
  
  const getGuestName = () => {
    return booking?.guest_name || booking?.passenger_name || booking?.passengerName || booking?.name || 'N/A';
  };
  
  const getGuestPhone = () => {
    return booking?.guest_phone || booking?.passenger_phone || booking?.passengerPhone || 'N/A';
  };
  
  const getGuestEmail = () => {
    return booking?.guest_email || booking?.passenger_email || booking?.passengerEmail || 'N/A';
  };
  
  const getPickupLocation = () => {
    return booking?.pickup_location || booking?.pickupLocation || 'N/A';
  };
  
  const getDropLocation = () => {
    return booking?.drop_location || booking?.dropLocation || 'N/A';
  };
  
  const getPickupDate = () => {
    try {
      const date = booking?.pickup_date || booking?.pickupDate;
      if (!date) return 'N/A';
      return new Date(date).toLocaleDateString('en-GB');
    } catch {
      return 'N/A';
    }
  };
  
  const getPickupTime = () => {
    try {
      const time = booking?.pickup_time || booking?.pickupTime;
      if (time) return time;
      
      const date = booking?.pickup_date || booking?.pickupDate;
      if (date) {
        // Date is already in IST, just format it
        const pickupDate = new Date(date);
        return pickupDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
      }
      return 'N/A';
    } catch {
      return 'N/A';
    }
  };
  
  const getVehicleType = () => {
    return booking?.vehicle_type || booking?.cab_type || booking?.cabType || 'N/A';
  };
  
  const getPaymentMethod = () => {
    return booking?.payment_method || booking?.paymentMethod || 'N/A';
  };

  // Get extra charges array
  const extraChargesArr = booking?.extraCharges || booking?.extra_charges || [];

  // Safe number formatting
  const formatAmount = (amount: number) => {
    if (typeof amount !== 'number' || isNaN(amount)) return '0';
    return amount.toLocaleString('en-IN');
  };

  // GST applicability
  const gstEnabled = booking?.gstEnabled || (typeof taxes === 'number' && taxes > 0);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.logo}>Vizag Taxi Hub</Text>
            <Text style={styles.subtitle}>Your trusted travel partner</Text>
          </View>
          <View style={styles.invoiceInfo}>
            <Text style={styles.invoiceTitle}>INVOICE</Text>
            <Text>Invoice #: {getBookingId()}</Text>
            <Text>Date: {new Date().toLocaleDateString('en-GB')}</Text>
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
              <Text style={styles.value}>{getPickupDate()} at {getPickupTime()}</Text>
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
              <Text>₹{formatAmount(subtotal)}</Text>
            </View>

            {Array.isArray(extraChargesArr) && extraChargesArr.length > 0 && (
              <>
                {extraChargesArr.map((charge: any, index: number) => (
                  <View key={index} style={styles.extraChargeRow}>
                    <Text>{charge?.type || 'Extra Charge'}: {charge?.description || 'Additional service'}</Text>
                    <Text>₹{formatAmount(charge?.amount || 0)}</Text>
                  </View>
                ))}
              </>
            )}

            {gstEnabled && (
              <View style={styles.billingRow}>
                <Text>GST (18%)</Text>
                <Text>₹{formatAmount(taxes)}</Text>
              </View>
            )}

            <View style={styles.billingRowTotal}>
              <Text>Total Amount</Text>
              <Text>₹{formatAmount(totalWithTaxes)}</Text>
            </View>

            <View style={styles.billingRow}>
              <Text>Payment Method</Text>
              <Text style={{ textTransform: 'capitalize' }}>{getPaymentMethod()}</Text>
            </View>
          </View>
        </View>

        {/* Company Information */}
        <View style={styles.footer}>
          <Text style={styles.footerTitle}>Company Information</Text>
          <Text style={styles.footerText}>Vizag Taxi Hub</Text>
          <Text style={styles.footerText}>Visakhapatnam, Andhra Pradesh</Text>
          <Text style={styles.footerText}>Phone: +91 9966363662</Text>
          <Text style={styles.footerText}>Email: info@vizagtaxihub.com</Text>
          <Text style={styles.footerText}>Website: www.vizagtaxihub.com</Text>
        </View>

        <Text style={styles.thankYou}>Thank you for choosing Vizag Taxi Hub!</Text>
      </Page>
    </Document>
  );
};
