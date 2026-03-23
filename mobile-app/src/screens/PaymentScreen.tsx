/**
 * Payment / Confirm Booking - Step 3
 * Matches web: shows summary, creates booking via API, opens Razorpay for partial payment
 * Notifies admin via WhatsApp/email when payment is abandoned (same as web).
 */
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  Platform,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useRazorpay } from '@codearcade/expo-razorpay';
import { bookingAPI } from '../services/bookingAPI';
import {
  createRazorpayOrder,
  verifyRazorpayPayment,
  initRazorpayWeb,
  openRazorpayWeb,
  RAZORPAY_KEY,
  type RazorpayResponse,
} from '../services/razorpayService';
import { colors, fonts } from '../theme/colors';
import type { Location } from '../types';
import type { TripType } from '../types';

export type PaymentParams = {
  pickupLocation: Location;
  dropLocation: Location | null;
  pickupDate: number;
  tripType: TripType;
  distance: number;
  selectedVehicle: { id: string; name: string; capacity?: number; amenities?: string[]; image?: string };
  totalPrice: number;
  paymentMode?: 'partial' | 'full';
  payAmount?: number;
  passengerName: string;
  passengerPhone: string;
  passengerEmail: string;
  additionalRequirements?: string;
  gstEnabled?: boolean;
  gstin?: string;
  businessName?: string;
  businessAddress?: string;
  businessEmail?: string;
};

type Props = NativeStackScreenProps<
  { Payment: PaymentParams },
  'Payment'
>;

export function PaymentScreen({ route, navigation }: Props) {
  const {
    pickupLocation,
    dropLocation,
    pickupDate: pickupDateTs,
    tripType,
    distance,
    selectedVehicle,
    totalPrice,
    paymentMode,
    payAmount,
    passengerName,
    passengerPhone,
    passengerEmail,
    additionalRequirements,
    gstEnabled,
    gstin,
    businessName,
    businessAddress,
    businessEmail,
  } = route.params;

  const { openCheckout, RazorpayUI } = useRazorpay();
  const amountToPay = payAmount ?? totalPrice;

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<{ bookingNumber: string; bookingId: number } | null>(null);

  const pendingBookingIdRef = useRef<number | null>(null);
  const hasNotifiedAbandonedRef = useRef(false);
  const paymentSuccessRef = useRef(false);

  const pickupDate = new Date(pickupDateTs);
  const dropName = dropLocation?.name || pickupLocation.name;

  const sendAbandonedNotification = (reason: 'abandoned' | 'cancelled') => {
    const bid = pendingBookingIdRef.current;
    if (paymentSuccessRef.current || !bid || hasNotifiedAbandonedRef.current) return;
    hasNotifiedAbandonedRef.current = true;
    bookingAPI.notifyPendingPayment(bid, reason).catch(() => {});
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', () => {
      sendAbandonedNotification('abandoned');
    });
    return unsubscribe;
  }, [navigation]);

  const handlePaymentSuccess = async (
    data: RazorpayResponse,
    bookingId: number,
    bookingNumber: string
  ) => {
    paymentSuccessRef.current = true;
    pendingBookingIdRef.current = null;
    try {
      const ok = await verifyRazorpayPayment(
        data.razorpay_payment_id,
        data.razorpay_order_id,
        data.razorpay_signature,
        String(bookingId)
      );
      if (ok) {
        setSuccess({ bookingNumber, bookingId });
      } else {
        Alert.alert('Verification Failed', 'Payment verification failed. Please contact support with your booking number.');
      }
    } catch {
      Alert.alert('Verification Failed', 'Could not verify payment. Please contact support.');
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentFailure = (error: { description?: string }) => {
    setLoading(false);
    Alert.alert('Payment Failed', error?.description || 'Payment could not be completed. Please try again.');
  };

  const openRazorpayAndPay = async (bookingId: number, bookingNumber: string, order: { id: string; amount: number; currency: string }) => {
    const isPartial = paymentMode === 'partial';
    const checkoutOptions = {
      name: 'Vizag Taxi Hub',
      description: `Cab booking (${isPartial ? '30% advance' : 'full payment'})`,
      prefill: {
        name: passengerName,
        email: passengerEmail,
        contact: `+91${passengerPhone}`,
      },
      themeColor: colors.primary,
    };

    if (Platform.OS === 'web') {
      const ready = await initRazorpayWeb();
      if (!ready) {
        Alert.alert('Payment Error', 'Payment gateway failed to load. Please refresh and try again.');
        setLoading(false);
        return;
      }
      openRazorpayWeb(
        order,
        checkoutOptions,
        (data) => handlePaymentSuccess(data, bookingId, bookingNumber),
        handlePaymentFailure,
        () => {
          setLoading(false);
          sendAbandonedNotification('abandoned');
        }
      );
      return;
    }

    openCheckout(
      {
        key: RAZORPAY_KEY,
        amount: order.amount,
        currency: order.currency || 'INR',
        order_id: order.id,
        name: checkoutOptions.name,
        description: checkoutOptions.description,
        prefill: checkoutOptions.prefill,
        theme: { color: checkoutOptions.themeColor },
      },
      {
        onSuccess: (data: RazorpayResponse) => handlePaymentSuccess(data, bookingId, bookingNumber),
        onFailure: handlePaymentFailure,
        onClose: () => {
          setLoading(false);
          sendAbandonedNotification('abandoned');
        },
      }
    );
  };

  const handleConfirmBooking = async () => {
    setLoading(true);
    try {
      const pickupDateTime = pickupDate.toISOString().slice(0, 19).replace('T', ' ');
      const payload: Record<string, unknown> = {
        pickupLocation: pickupLocation.name + (pickupLocation.address ? `, ${pickupLocation.address}` : ''),
        dropLocation: dropName + (dropLocation?.address ? `, ${dropLocation.address}` : ''),
        pickupDate: pickupDateTime,
        pickupTime: pickupDate.toTimeString().slice(0, 5),
        tripType,
        tripMode: 'one-way',
        vehicleType: selectedVehicle.name,
        cabType: selectedVehicle.name,
        passengerName,
        passengerPhone: `+91${passengerPhone}`,
        passengerCountryCode: '+91',
        passengerEmail,
        additionalRequirements: additionalRequirements || '',
        distance,
        totalAmount: totalPrice,
      };
      if (gstEnabled && gstin && businessName && businessEmail) {
        payload.gstEnabled = true;
        payload.gstDetails = {
          gstNumber: gstin,
          companyName: businessName,
          companyAddress: businessAddress || '',
          companyEmail: businessEmail,
        };
      }

      const res = await bookingAPI.createBooking(payload as any) as { status?: string; data?: { id?: number; bookingNumber?: string; booking_number?: string } };
      const data = res?.data;
      const bookingNumber = data?.bookingNumber || data?.booking_number || 'N/A';
      const bookingId = data?.id ?? 0;
      pendingBookingIdRef.current = bookingId;

      if (amountToPay > 0) {
        const order = await createRazorpayOrder(amountToPay, bookingId);
        if (!order) {
          Alert.alert('Payment Error', 'Could not create payment order. Please try again.');
          setLoading(false);
          return;
        }
        openRazorpayAndPay(bookingId, bookingNumber, order);
      } else {
        paymentSuccessRef.current = true;
        pendingBookingIdRef.current = null;
        setSuccess({ bookingNumber, bookingId });
        setLoading(false);
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string }; message?: string }; message?: string })?.response?.data?.message
        || (err as { message?: string })?.message
        || 'Booking failed. Please try again.';
      Alert.alert('Booking Failed', msg);
      setLoading(false);
    }
  };

  const handleWhatsApp = () => {
    const text = encodeURIComponent(
      `Hi! I just booked a cab (${success?.bookingNumber || ''}). ` +
        `From: ${pickupLocation.name}, To: ${dropName}, Date: ${pickupDate.toLocaleString('en-IN')}.`
    );
    Linking.openURL(`https://wa.me/919966363662?text=${text}`).catch(() => {});
  };

  const handleGoHome = () => {
    (navigation as any).reset({ index: 0, routes: [{ name: 'Home' }] });
  };

  if (success) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleGoHome} style={styles.backBtn}>
            <Text style={styles.backText}>←</Text>
          </TouchableOpacity>
          <Image
            source={{ uri: 'https://www.vizagtaxihub.com/uploads/vizagtaxihub-logo.png' }}
            style={styles.logo}
            resizeMode="contain"
          />
          <View style={styles.menuBtn} />
        </View>
        <ScrollView style={styles.scroll} contentContainerStyle={[styles.scrollContent, styles.successContent]}>
          <View style={styles.successIcon}>
            <Text style={styles.successIconText}>✓</Text>
          </View>
          <Text style={styles.successTitle}>Booking Confirmed!</Text>
          <Text style={styles.successNumber}>Booking # {success.bookingNumber}</Text>
          <Text style={styles.successSub}>We'll send the details to your email shortly.</Text>
          <TouchableOpacity style={styles.whatsappBtn} onPress={handleWhatsApp}>
            <Text style={styles.whatsappText}>Contact us on WhatsApp</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.homeBtn} onPress={handleGoHome}>
            <Text style={styles.homeBtnText}>Back to Home</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Image
          source={{ uri: 'https://www.vizagtaxihub.com/uploads/vizagtaxihub-logo.png' }}
          style={styles.logo}
          resizeMode="contain"
        />
        <View style={styles.menuBtn} />
      </View>

      <View style={styles.progress}>
        <Text style={styles.progressStep}>1. Select Vehicle</Text>
        <Text style={styles.progressStep}>2. Passenger Info</Text>
        <Text style={[styles.progressStep, styles.progressActive]}>3. Payment</Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Confirm & Pay</Text>
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Trip</Text>
            <Text style={styles.summaryValue}>{pickupLocation.name} → {dropName}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Vehicle</Text>
            <Text style={styles.summaryValue}>{selectedVehicle.name}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Date & Time</Text>
            <Text style={styles.summaryValue}>
              {pickupDate.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })} - {pickupDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryRow}>
            <Text style={styles.summaryTotal}>Total</Text>
            <Text style={styles.summaryTotalValue}>₹{totalPrice.toLocaleString('en-IN')}</Text>
          </View>
        </View>
        <Text style={styles.payNote}>
          {paymentMode === 'partial'
            ? `Pay ₹${amountToPay.toLocaleString('en-IN')} now (30%), rest to driver at pickup.`
            : `Pay ₹${amountToPay.toLocaleString('en-IN')} now (full amount) via secure payment.`}
        </Text>
        <TouchableOpacity
          style={[styles.confirmBtn, loading && styles.confirmBtnDisabled]}
          onPress={handleConfirmBooking}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.confirmBtnText}>
              Confirm Booking - ₹{amountToPay.toLocaleString('en-IN')}
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
      {Platform.OS !== 'web' && RazorpayUI}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.gray50 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: { padding: 8 },
  backText: { fontSize: 20, color: colors.primary, fontFamily: fonts.semiBold },
  logo: { width: 100, height: 36 },
  menuBtn: { padding: 8 },
  menuIcon: { fontSize: 22, color: colors.foreground, fontFamily: fonts.regular },
  progress: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  progressStep: { fontSize: 13, color: colors.gray600, fontFamily: fonts.medium },
  progressActive: { color: colors.primary, fontFamily: fonts.bold, textDecorationLine: 'underline' },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  title: { fontSize: 20, fontFamily: fonts.bold, color: colors.foreground, marginBottom: 16 },
  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 16,
    ...(Platform.OS === 'web' ? { boxShadow: '0 2px 8px rgba(0,0,0,0.06)' } : { elevation: 2 }),
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  summaryLabel: { fontSize: 13, color: colors.gray600, fontFamily: fonts.regular },
  summaryValue: { fontSize: 14, fontFamily: fonts.semiBold, color: colors.foreground, flex: 1, textAlign: 'right' },
  summaryDivider: { height: 1, backgroundColor: colors.border, marginVertical: 12 },
  summaryTotal: { fontSize: 16, fontFamily: fonts.bold, color: colors.foreground },
  summaryTotalValue: { fontSize: 18, fontFamily: fonts.bold, color: colors.primary },
  payNote: { fontSize: 12, color: colors.mutedForeground, marginBottom: 24, fontFamily: fonts.regular },
  confirmBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  confirmBtnDisabled: { opacity: 0.7 },
  confirmBtnText: { fontSize: 18, fontFamily: fonts.bold, color: colors.primaryForeground },
  successContent: { alignItems: 'center', paddingTop: 40 },
  successIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#22c55e',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  successIconText: { fontSize: 32, color: '#fff', fontFamily: fonts.bold },
  successTitle: { fontSize: 22, fontFamily: fonts.bold, color: colors.foreground, marginBottom: 8 },
  successNumber: { fontSize: 16, fontFamily: fonts.semiBold, color: colors.primary, marginBottom: 8 },
  successSub: { fontSize: 14, color: colors.gray600, marginBottom: 24, fontFamily: fonts.regular },
  whatsappBtn: {
    backgroundColor: '#25D366',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 10,
    marginBottom: 12,
  },
  whatsappText: { fontSize: 16, fontFamily: fonts.semiBold, color: '#fff' },
  homeBtn: {
    paddingVertical: 14,
    paddingHorizontal: 24,
  },
  homeBtnText: { fontSize: 16, fontFamily: fonts.semiBold, color: colors.primary },
});
