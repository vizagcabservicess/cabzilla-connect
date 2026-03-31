/**
 * InvoiceScreen - View/generate invoice for booking (admin)
 * Includes GST settings (gstEnabled, includeTax, isIGST, gstDetails) matching web app
 */
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Switch,
  TextInput,
} from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/core';
import { Feather } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { adminAPI, AdminInvoice } from '../services/adminAPI';
import type { RootStackParamList } from '../navigation/types';
import { patchInvoiceHtmlTripTypeCellForMobile } from '../utils/invoiceTripTypeLineForMobile';

type Route = RouteProp<RootStackParamList, 'BookingInvoice'>;

const INVOICE_SETTINGS_KEY = (id: number) => `invoice-settings-${id}`;

interface GstDetails {
  gstNumber: string;
  companyName: string;
  companyAddress: string;
  lockedBaseFare?: number;
}

interface InvoiceState {
  gstEnabled: boolean;
  isIGST: boolean;
  includeTax: boolean;
  customInvoiceNumber: string;
  adminNotes: string;
  gstDetails: GstDetails;
}

/** Web app logic: GST-inclusive default when GST enabled; exclusive when disabled. */
const DEFAULT_INVOICE_STATE: InvoiceState = {
  gstEnabled: false,
  isIGST: false,
  includeTax: false,
  customInvoiceNumber: '',
  adminNotes: '',
  gstDetails: { gstNumber: '', companyName: '', companyAddress: '' },
};

/** Never show raw JSON parse errors (e.g. "Unexpected character: %") to user */
function friendlyErrorMessage(e: unknown, fallback: string): string {
  const raw = e instanceof Error ? e.message : String(e ?? fallback);
  return /JSON\s*parse|Unexpected\s*(character|token)/i.test(raw) ? fallback : raw || fallback;
}

/** Compute base fare from booking (matches web app baseFare/lockedBaseFare logic). */
function computeBaseFareFromBooking(booking: Record<string, unknown> | undefined): number {
  if (!booking) return 0;
  const total = Number(booking.total_amount ?? booking.totalAmount ?? 0);
  const fare = Number(booking.fare ?? 0);
  let extraCharges = (booking.extra_charges ?? booking.extraCharges) as Array<{ amount?: number }> | string | undefined;
  if (typeof extraCharges === 'string') {
    try {
      extraCharges = JSON.parse(extraCharges) as Array<{ amount?: number }>;
    } catch {
      extraCharges = undefined;
    }
  }
  const extraTotal = Array.isArray(extraCharges)
    ? extraCharges.reduce((s, c) => s + (c?.amount ?? 0), 0)
    : 0;
  if (fare > 0) return fare;
  if (total > 0 && extraTotal >= 0) return Math.max(0, total - extraTotal);
  return total;
}

function getInitialInvoiceState(booking: Record<string, unknown> | undefined): InvoiceState {
  const gstEnabled = Boolean((booking as any)?.gstEnabled);
  const fromBooking = {
    gstEnabled,
    adminNotes: String((booking as any)?.adminNotes ?? (booking as any)?.admin_notes ?? ''),
    gstDetails: {
      gstNumber: String((booking as any)?.gstDetails?.gstNumber ?? ''),
      companyName: String((booking as any)?.gstDetails?.companyName ?? ''),
      companyAddress: String((booking as any)?.gstDetails?.companyAddress ?? ''),
    },
    // Web app: when GST enabled, default to tax-inclusive (price includes GST)
    includeTax: gstEnabled ? true : DEFAULT_INVOICE_STATE.includeTax,
  };
  return {
    ...DEFAULT_INVOICE_STATE,
    ...fromBooking,
    gstDetails: { ...DEFAULT_INVOICE_STATE.gstDetails, ...fromBooking.gstDetails },
  };
}

export function InvoiceScreen() {
  const navigation = useNavigation<any>();
  const { params } = useRoute<Route>();
  const booking = params?.booking as Record<string, unknown> | undefined;
  const bookingId =
    (params?.bookingId as number | undefined) ??
    (typeof booking?.id === 'number' ? booking.id : parseInt(String(booking?.id ?? 0), 10));

  const [invoice, setInvoice] = useState<AdminInvoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [hasAttemptedGenerate, setHasAttemptedGenerate] = useState(false);
  const [showGstSettings, setShowGstSettings] = useState(false);
  const [invoiceState, setInvoiceState] = useState<InvoiceState>(() =>
    getInitialInvoiceState(booking)
  );
  const [hasStoredSettings, setHasStoredSettings] = useState<boolean | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!bookingId) return;
      try {
        const stored = await AsyncStorage.getItem(INVOICE_SETTINGS_KEY(bookingId));
        if (stored) {
          const parsed = JSON.parse(stored);
          setInvoiceState((prev) => ({
            ...prev,
            ...parsed,
            gstDetails: { ...prev.gstDetails, ...parsed?.gstDetails },
          }));
          setHasStoredSettings(true);
        } else {
          setHasStoredSettings(false);
        }
      } catch {
        setHasStoredSettings(false);
      }
    };
    load();
  }, [bookingId]);

  /** Sync invoice state from stored invoice when no local settings exist (matches web app) */
  useEffect(() => {
    if (!invoice || hasStoredSettings !== false) return;
    const inv = invoice as Record<string, unknown>;
    const gstEnabled = Boolean(inv.gstEnabled ?? inv.gst_enabled);
    const includeTaxVal = inv.includeTax ?? inv.include_tax;
    const includeTax = includeTaxVal !== undefined ? Boolean(includeTaxVal) : (gstEnabled ? true : false);
    setInvoiceState((prev) => ({
      ...prev,
      gstEnabled,
      includeTax,
      isIGST: Boolean(inv.isIGST ?? inv.is_igst ?? prev.isIGST),
      adminNotes: String(inv.adminNotes ?? inv.admin_notes ?? prev.adminNotes),
      gstDetails: {
        ...prev.gstDetails,
        gstNumber: String(inv.gstNumber ?? inv.gst_number ?? prev.gstDetails.gstNumber),
        companyName: String(inv.companyName ?? inv.company_name ?? prev.gstDetails.companyName),
        companyAddress: String(inv.companyAddress ?? inv.company_address ?? prev.gstDetails.companyAddress),
      },
    }));
  }, [invoice, hasStoredSettings]);

  useEffect(() => {
    if (!bookingId) return;
    AsyncStorage.setItem(INVOICE_SETTINGS_KEY(bookingId), JSON.stringify(invoiceState));
  }, [bookingId, invoiceState]);

  const loadInvoice = async () => {
    try {
      const inv = await adminAPI.getInvoice(bookingId);
      setInvoice(inv);
    } catch {
      setInvoice(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInvoice();
  }, [bookingId]);

  const handleGenerate = async () => {
    if (!bookingId) return;
    if (invoiceState.gstEnabled && (!invoiceState.gstDetails.gstNumber?.trim() || !invoiceState.gstDetails.companyName?.trim())) {
      Alert.alert('Validation', 'GST Number and Company Name are required when GST is enabled');
      return;
    }
    setGenerating(true);
    try {
      const lockedBaseFare = computeBaseFareFromBooking(booking);
      const inv = await adminAPI.generateInvoice(bookingId, {
        gstEnabled: invoiceState.gstEnabled,
        isIGST: invoiceState.isIGST,
        includeTax: invoiceState.includeTax,
        gstDetails: { ...invoiceState.gstDetails, lockedBaseFare },
        customInvoiceNumber: invoiceState.customInvoiceNumber.trim() || undefined,
        adminNotes: invoiceState.adminNotes.trim() || undefined,
      });
      setInvoice(inv);
      Alert.alert('Generated', 'Invoice generated successfully');
    } catch (e) {
      const rawMsg = e instanceof Error ? e.message : 'Failed to generate invoice';
      const friendlyMsg =
        /JSON\s*parse|Unexpected\s*(character|token)/i.test(rawMsg)
          ? 'Invalid response from server. Please try again.'
          : rawMsg;
      Alert.alert('Error', friendlyMsg);
    } finally {
      setGenerating(false);
    }
  };

  /** Auto-generate invoice when none exists (matches web app behavior) */
  useEffect(() => {
    if (
      bookingId &&
      !loading &&
      invoice === null &&
      !generating &&
      !hasAttemptedGenerate
    ) {
      setHasAttemptedGenerate(true);
      handleGenerate();
    }
  }, [bookingId, loading, invoice, generating, hasAttemptedGenerate]);

  const handleViewInvoice = async () => {
    if (!bookingId) return;
    setLoadingPdf(true);
    try {
      const lockedBaseFare = computeBaseFareFromBooking(booking);
      let html = await adminAPI.getInvoiceHtml(bookingId, {
        gstEnabled: invoiceState.gstEnabled,
        isIGST: invoiceState.isIGST,
        includeTax: invoiceState.includeTax,
        lockedBaseFare,
        gstDetails: invoiceState.gstDetails,
        customInvoiceNumber: invoiceState.customInvoiceNumber.trim() || undefined,
        adminNotes: invoiceState.adminNotes.trim() || undefined,
      });
      html = patchInvoiceHtmlTripTypeCellForMobile(html, booking as Record<string, unknown>);
      navigation.navigate('WebView', {
        url: '',
        title: 'Invoice',
        html,
      } as { url: string; title: string; html?: string });
    } catch (e) {
      const rawMsg = e instanceof Error ? e.message : 'Could not load invoice. Generate one first.';
      const friendlyMsg =
        /JSON\s*parse|Unexpected\s*(character|token)/i.test(rawMsg)
          ? 'Could not load invoice. Generate one first.'
          : rawMsg;
      Alert.alert('Error', friendlyMsg);
    } finally {
      setLoadingPdf(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!bookingId) return;
    setLoadingPdf(true);
    try {
      const lockedBaseFare = computeBaseFareFromBooking(booking);
      const { data } = await adminAPI.getInvoicePdfBlob(bookingId, {
        gstEnabled: invoiceState.gstEnabled,
        isIGST: invoiceState.isIGST,
        includeTax: invoiceState.includeTax,
        lockedBaseFare,
        gstDetails: invoiceState.gstDetails,
        customInvoiceNumber: invoiceState.customInvoiceNumber.trim() || undefined,
        adminNotes: invoiceState.adminNotes.trim() || undefined,
      });
      const bytes = new Uint8Array(data);
      let base64 = '';
      for (let i = 0; i < bytes.length; i++) base64 += String.fromCharCode(bytes[i]);
      base64 = btoa(base64);
      const cacheDir = FileSystem.cacheDirectory;
      if (!cacheDir) {
        throw new Error('File storage is not available. Please try View Invoice (HTML) instead.');
      }
      const filename = `Invoice_${invoice?.invoiceNumber ?? `INV-${bookingId}`}.pdf`.replace(/[^a-zA-Z0-9\-_.]/g, '_');
      const path = `${cacheDir}${filename}`;
      await FileSystem.writeAsStringAsync(path, base64, { encoding: 'base64' });
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(path, { mimeType: 'application/pdf' });
      } else {
        Alert.alert('Downloaded', `Invoice saved. You can find it in the app cache.`);
      }
    } catch (e) {
      const rawMsg = e instanceof Error ? e.message : 'Could not get PDF. Please try View Invoice (HTML) instead.';
      // Never show raw JSON parse errors or FileSystem API errors (e.g. "Base64" of undefined) to user
      const friendlyMsg =
        /JSON\s*parse|Unexpected\s*(character|token)|Base64.*undefined|EncodingType/i.test(rawMsg)
          ? 'Could not get PDF. Please try View Invoice (HTML) instead.'
          : rawMsg;
      Alert.alert('Error', friendlyMsg);
    } finally {
      setLoadingPdf(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Feather name="arrow-left" size={24} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={styles.title}>Invoice</Text>
        </View>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  // Merge invoice with booking fallback (web app shows booking amounts when invoice empty)
  const bookingTotal = (booking?.total_amount ?? booking?.totalAmount ?? 0) as number;
  const bookingPayment = (booking?.payment_status ?? booking?.paymentStatus ?? 'pending') as string;
  const baseFare =
    invoice?.baseFare ??
    (invoice as Record<string, unknown>)?.base_amount ??
    invoice?.totalAmount ??
    bookingTotal;
  const totalAmount = invoice?.totalAmount ?? bookingTotal ?? baseFare;
  const advancePaid =
    (invoice as Record<string, unknown>)?.advancePaidAmount ??
    (invoice as Record<string, unknown>)?.advance_paid_amount ??
    (booking?.advancePaidAmount ?? booking?.advance_paid_amount ?? 0) as number;
  const paymentStatus = invoice?.paymentStatus ?? bookingPayment ?? 'pending';
  const invoiceNumber =
    invoice?.invoiceNumber ??
    (invoice as Record<string, unknown>)?.invoice_number ??
    (bookingId ? `INV-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${bookingId}` : '—');
  const invoiceDate =
    invoice?.invoiceDate ?? (invoice as Record<string, unknown>)?.invoice_date ?? null;

  // Show card when we have invoice or booking data (matches web)
  const hasDisplayData = invoice || (booking && (bookingTotal > 0 || Object.keys(booking).length > 0));

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Feather name="arrow-left" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={styles.title}>Invoice</Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {hasDisplayData ? (
          <View style={styles.card}>
            <View style={styles.row}>
              <Text style={styles.label}>Invoice #</Text>
              <Text style={styles.value}>{String(invoiceNumber ?? '')}</Text>
            </View>
            {invoiceDate && (
              <View style={styles.row}>
                <Text style={styles.label}>Date</Text>
                <Text style={styles.value}>{String(invoiceDate)}</Text>
              </View>
            )}
            <View style={styles.row}>
              <Text style={styles.label}>Base Fare</Text>
              <Text style={styles.value}>₹{Number(baseFare ?? 0).toLocaleString()}</Text>
            </View>
            {invoiceState.gstEnabled && Number((invoice as Record<string, unknown>)?.taxAmount ?? (invoice as Record<string, unknown>)?.tax_amount ?? 0) > 0 && (
              <>
                {(invoice as Record<string, unknown>)?.isIGST ?? (invoice as Record<string, unknown>)?.is_igst ? (
                  <View style={styles.row}>
                    <Text style={styles.label}>IGST (18%)</Text>
                    <Text style={styles.value}>₹{Number((invoice as Record<string, unknown>)?.taxAmount ?? (invoice as Record<string, unknown>)?.tax_amount ?? 0).toLocaleString()}</Text>
                  </View>
                ) : (
                  <>
                    {Number((invoice as Record<string, unknown>)?.cgstAmount ?? (invoice as Record<string, unknown>)?.cgst_amount ?? 0) > 0 && (
                      <View style={styles.row}>
                        <Text style={styles.label}>CGST (9%)</Text>
                        <Text style={styles.value}>₹{Number((invoice as Record<string, unknown>)?.cgstAmount ?? (invoice as Record<string, unknown>)?.cgst_amount ?? 0).toLocaleString()}</Text>
                      </View>
                    )}
                    {Number((invoice as Record<string, unknown>)?.sgstAmount ?? (invoice as Record<string, unknown>)?.sgst_amount ?? 0) > 0 && (
                      <View style={styles.row}>
                        <Text style={styles.label}>SGST (9%)</Text>
                        <Text style={styles.value}>₹{Number((invoice as Record<string, unknown>)?.sgstAmount ?? (invoice as Record<string, unknown>)?.sgst_amount ?? 0).toLocaleString()}</Text>
                      </View>
                    )}
                  </>
                )}
              </>
            )}
            {Number(advancePaid ?? 0) > 0 && (
              <View style={styles.row}>
                <Text style={styles.label}>Advance Paid</Text>
                <Text style={[styles.value, styles.advancePaid]}>₹{Number(advancePaid ?? 0).toLocaleString()}</Text>
              </View>
            )}
            <View style={styles.row}>
              <Text style={styles.label}>Total Amount</Text>
              <Text style={[styles.value, styles.totalAmount]}>
                ₹{Number(totalAmount ?? 0).toLocaleString()}
              </Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Payment Status</Text>
              <View
                style={[
                  styles.statusBadge,
                  (paymentStatus === 'paid' || paymentStatus === 'payment_complete') && styles.statusPaid,
                  (paymentStatus === 'partial' || paymentStatus === 'partial_payment') && styles.statusPartial,
                  (paymentStatus === 'payment_pending' || paymentStatus === 'pending') && styles.statusPending,
                ]}
              >
                <Text style={styles.statusText}>
                  {paymentStatus === 'payment_pending' || paymentStatus === 'pending'
                    ? 'Payment Pending'
                    : paymentStatus === 'payment_complete' || paymentStatus === 'paid'
                      ? 'Paid'
                      : paymentStatus === 'partial' || paymentStatus === 'partial_payment'
                        ? 'Partial'
                        : paymentStatus.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                </Text>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.empty}>
            <Feather name="file-text" size={48} color={colors.gray200} />
            <Text style={styles.emptyText}>No invoice yet</Text>
            <Text style={styles.emptyHint}>Generate an invoice for this booking</Text>
          </View>
        )}

        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.downloadPdfBtn, loadingPdf && styles.downloadBtnDisabled]}
            onPress={handleDownloadPdf}
            disabled={loadingPdf}
          >
            {loadingPdf ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Feather name="file-text" size={20} color="#fff" />
            )}
            <Text style={styles.downloadPdfBtnText}>Download PDF</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.viewInvoiceBtn, loadingPdf && styles.downloadBtnDisabled]}
            onPress={handleViewInvoice}
            disabled={loadingPdf}
          >
            {loadingPdf ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Feather name="external-link" size={18} color={colors.primary} />
            )}
            <Text style={styles.viewInvoiceBtnText}>View Invoice</Text>
          </TouchableOpacity>
        </View>

        {!invoice && (
          <TouchableOpacity
            style={[styles.genBtn, generating && styles.genBtnDisabled]}
            onPress={handleGenerate}
            disabled={generating}
          >
            {generating ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Feather name="file-plus" size={20} color="#fff" />
                <Text style={styles.genBtnText}>Generate Invoice</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {invoice && (
          <TouchableOpacity
            style={[styles.genBtn, generating && styles.genBtnDisabled]}
            onPress={handleGenerate}
            disabled={
              generating ||
              (invoiceState.gstEnabled &&
                (!invoiceState.gstDetails.gstNumber?.trim() ||
                  !invoiceState.gstDetails.companyName?.trim()))
            }
          >
            {generating ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Feather name="refresh-cw" size={18} color="#fff" />
                <Text style={styles.genBtnText}>Regenerate Invoice</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.gstToggleHeader}
          onPress={() => setShowGstSettings((s) => !s)}
          activeOpacity={0.7}
        >
          <Feather
            name={showGstSettings ? 'chevron-down' : 'chevron-right'}
            size={20}
            color={colors.gray600}
          />
          <Text style={styles.gstToggleText}>GST & Invoice Settings</Text>
        </TouchableOpacity>

        {showGstSettings && (
          <View style={styles.gstCard}>
            <View style={styles.gstRow}>
              <Text style={styles.gstLabel}>Custom Invoice #</Text>
              <TextInput
                style={styles.gstInput}
                value={invoiceState.customInvoiceNumber}
                onChangeText={(t) =>
                  setInvoiceState((s) => ({ ...s, customInvoiceNumber: t }))
                }
                placeholder="Optional - auto-generated if blank"
                placeholderTextColor={colors.gray400}
              />
            </View>

            <View style={styles.gstRow}>
              <Text style={styles.gstLabel}>Admin Notes</Text>
              <TextInput
                style={[styles.gstInput, styles.gstInputMultiline]}
                value={invoiceState.adminNotes}
                onChangeText={(t) =>
                  setInvoiceState((s) => ({ ...s, adminNotes: t }))
                }
                placeholder="Optional notes for the invoice"
                placeholderTextColor={colors.gray400}
                multiline
              />
            </View>

            <View style={[styles.gstRow, styles.gstRowSwitch]}>
              <Text style={styles.gstLabel}>Include GST (18%)</Text>
              <Switch
                value={invoiceState.gstEnabled}
                onValueChange={(v) =>
                  setInvoiceState((s) => ({
                    ...s,
                    gstEnabled: v,
                    // When enabling GST, default to inclusive (match web app)
                    includeTax: v ? true : s.includeTax,
                  }))
                }
                trackColor={{ false: colors.gray200, true: colors.primary + '80' }}
                thumbColor={invoiceState.gstEnabled ? colors.primary : colors.gray400}
              />
            </View>

            <View style={[styles.gstRow, styles.gstRowSwitch]}>
              <Text style={[styles.gstLabel, !invoiceState.gstEnabled && styles.gstLabelDisabled]}>
                {invoiceState.includeTax ? 'Price including tax' : 'Price excluding tax'}
              </Text>
              <Switch
                value={invoiceState.includeTax}
                onValueChange={(v) =>
                  setInvoiceState((s) => ({ ...s, includeTax: v }))
                }
                disabled={!invoiceState.gstEnabled}
                trackColor={{ false: colors.gray200, true: colors.primary + '80' }}
                thumbColor={invoiceState.includeTax ? colors.primary : colors.gray400}
              />
            </View>

            {invoiceState.gstEnabled && (
              <>
                <View style={styles.gstRow}>
                  <Text style={styles.gstLabel}>GST Number *</Text>
                  <TextInput
                    style={styles.gstInput}
                    value={invoiceState.gstDetails.gstNumber}
                    onChangeText={(t) =>
                      setInvoiceState((s) => ({
                        ...s,
                        gstDetails: { ...s.gstDetails, gstNumber: t },
                      }))
                    }
                    placeholder="Enter GST number"
                    placeholderTextColor={colors.gray400}
                  />
                </View>
                <View style={styles.gstRow}>
                  <Text style={styles.gstLabel}>Company Name *</Text>
                  <TextInput
                    style={styles.gstInput}
                    value={invoiceState.gstDetails.companyName}
                    onChangeText={(t) =>
                      setInvoiceState((s) => ({
                        ...s,
                        gstDetails: { ...s.gstDetails, companyName: t },
                      }))
                    }
                    placeholder="Enter company name"
                    placeholderTextColor={colors.gray400}
                  />
                </View>
                <View style={styles.gstRow}>
                  <Text style={styles.gstLabel}>Company Address</Text>
                  <TextInput
                    style={[styles.gstInput, styles.gstInputMultiline]}
                    value={invoiceState.gstDetails.companyAddress}
                    onChangeText={(t) =>
                      setInvoiceState((s) => ({
                        ...s,
                        gstDetails: { ...s.gstDetails, companyAddress: t },
                      }))
                    }
                    placeholder="Enter company address"
                    placeholderTextColor={colors.gray400}
                    multiline
                  />
                </View>
                <View style={styles.gstRow}>
                  <Text style={styles.gstLabel}>GST Type</Text>
                  <View style={styles.radioRow}>
                    <TouchableOpacity
                      style={[
                        styles.radioOption,
                        !invoiceState.isIGST && styles.radioOptionSelected,
                      ]}
                      onPress={() =>
                        setInvoiceState((s) => ({ ...s, isIGST: false }))
                      }
                    >
                      <Text
                        style={[
                          styles.radioText,
                          !invoiceState.isIGST && styles.radioTextSelected,
                        ]}
                      >
                        Intra-state (CGST+SGST)
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.radioOption,
                        invoiceState.isIGST && styles.radioOptionSelected,
                      ]}
                      onPress={() =>
                        setInvoiceState((s) => ({ ...s, isIGST: true }))
                      }
                    >
                      <Text
                        style={[
                          styles.radioText,
                          invoiceState.isIGST && styles.radioTextSelected,
                        ]}
                      >
                        Inter-state (IGST)
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.gray50 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
  },
  backBtn: { marginRight: 12, padding: 4 },
  title: { fontSize: 18, fontWeight: '600', color: colors.foreground },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 32 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray100,
  },
  label: { fontSize: 14, color: colors.gray600 },
  value: { fontSize: 15, fontWeight: '600', color: colors.foreground },
  totalAmount: { fontSize: 18 },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: colors.gray200,
  },
  statusPaid: { backgroundColor: '#dcfce7' },
  statusPartial: { backgroundColor: '#fef3c7' },
  statusPending: { backgroundColor: colors.gray200 },
  statusText: { fontSize: 12, fontWeight: '600', color: colors.gray600 },
  advancePaid: { color: '#059669' },
  empty: { alignItems: 'center', paddingVertical: 32 },
  emptyText: { fontSize: 16, color: colors.gray600, marginTop: 12 },
  emptyHint: { fontSize: 14, color: colors.gray600, marginTop: 4 },
  genBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 10,
    marginBottom: 12,
  },
  genBtnDisabled: { opacity: 0.7 },
  genBtnText: { fontSize: 16, fontWeight: '600', color: '#fff' },
  downloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#eff6ff',
  },
  downloadBtnDisabled: { opacity: 0.7 },
  downloadBtnText: { fontSize: 15, fontWeight: '600', color: colors.primary },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
    marginBottom: 16,
  },
  downloadPdfBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 10,
  },
  downloadPdfBtnText: { fontSize: 15, fontWeight: '600', color: '#fff' },
  viewInvoiceBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#eff6ff',
  },
  viewInvoiceBtnText: { fontSize: 15, fontWeight: '600', color: colors.primary },
  gstToggleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 8,
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  gstToggleText: { fontSize: 15, fontWeight: '500', color: colors.foreground },
  gstCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  gstRow: { marginBottom: 14 },
  gstRowSwitch: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  gstLabel: { fontSize: 14, color: colors.gray600, marginBottom: 6 },
  gstLabelDisabled: { color: colors.gray400 },
  gstInput: {
    borderWidth: 1,
    borderColor: colors.gray200,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.foreground,
  },
  gstInputMultiline: { minHeight: 60, textAlignVertical: 'top' },
  radioRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  radioOption: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.gray200,
    backgroundColor: '#fff',
  },
  radioOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '15',
  },
  radioText: { fontSize: 13, color: colors.gray600 },
  radioTextSelected: { color: colors.primary, fontWeight: '600' },
});
