import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import type { RootStackParamList } from '../navigation/types';
import { packageLines } from '../lib/tripPackageLines';
import {
  aiBookingAPI,
  aiBookingFieldErrors,
  readAiSheetTab,
  saveAiSheetTab,
  type AiParsedBooking,
} from '../services/aiBookingAPI';

type Props = NativeStackScreenProps<RootStackParamList, 'AdminAiAssistant'>;

const PREVIEW: Array<{ key: keyof AiParsedBooking; label: string }> = [
  { key: 'customer_name', label: 'Customer' },
  { key: 'customer_mobile', label: 'Mobile' },
  { key: 'pickup_location', label: 'Pickup' },
  { key: 'drop_location', label: 'Drop' },
  { key: 'trip_type', label: 'Trip' },
  { key: 'pickup_date', label: 'Pickup date' },
  { key: 'return_date', label: 'Return date' },
  { key: 'pickup_time', label: 'Time' },
  { key: 'vehicle_type', label: 'Vehicle' },
  { key: 'seating_capacity', label: 'Seats' },
  { key: 'cost', label: 'Cost' },
  { key: 'advance_received', label: 'Advance' },
  { key: 'hourly_package', label: 'Package' },
  { key: 'payment_mode', label: 'Payment' },
];

function showValue(value: AiParsedBooking[keyof AiParsedBooking]): string {
  if (value == null || value === '') return '—';
  if (typeof value === 'number') return value > 0 ? `₹${value.toLocaleString('en-IN')}` : '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return String(value);
}

export function AdminAiAssistantScreen({ navigation }: Props) {
  const [rawText, setRawText] = useState('');
  const [sheetTab, setSheetTab] = useState('');
  const [bookings, setBookings] = useState<AiParsedBooking[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<'parse' | 'create' | 'sheets' | 'resync' | 'command' | null>(null);
  const [lastInvoice, setLastInvoice] = useState<number | null>(null);
  const [command, setCommand] = useState('');
  const [commandResult, setCommandResult] = useState<string | null>(null);

  useEffect(() => {
    void readAiSheetTab().then(setSheetTab);
  }, []);

  const onSheetTab = (value: string) => {
    setSheetTab(value);
    void saveAiSheetTab(value);
  };

  const parse = async () => {
    if (!rawText.trim()) {
      Alert.alert('AI Assistant', 'Paste the booking details first.');
      return;
    }
    setBusy('parse');
    setError(null);
    setNotice(null);
    try {
      const result = await aiBookingAPI.parseBooking(rawText);
      setBookings(result.bookings);
      const missing = result.bookings.flatMap((booking, index) =>
        aiBookingFieldErrors(booking).map((line) => (result.bookings.length > 1 ? `Trip ${index + 1}: ${line}` : line)),
      );
      setWarning(missing.length ? missing.join('\n') : null);
    } catch (e) {
      setBookings([]);
      setError(e instanceof Error ? e.message : 'Could not parse that booking.');
    } finally {
      setBusy(null);
    }
  };

  const create = async () => {
    if (!bookings.length) return;
    if (!sheetTab.trim()) {
      Alert.alert('AI Assistant', 'Enter the Google Sheet tab name, for example November 2026.');
      return;
    }
    const missing = bookings.flatMap((booking, index) =>
      aiBookingFieldErrors(booking).map((line) => (bookings.length > 1 ? `Trip ${index + 1}: ${line}` : line)),
    );
    if (missing.length) {
      setError(missing.join('\n'));
      return;
    }
    setBusy('create');
    setError(null);
    setNotice(null);
    setWarning(null);
    try {
      const created = [];
      for (const booking of bookings) {
        created.push(await aiBookingAPI.createBooking(booking, rawText, sheetTab.trim()));
      }
      const last = created[created.length - 1];
      const invoices = created.map((row) => `#${row.invoice_no}`).join(', ');
      setLastInvoice(last.invoice_no ?? null);
      setNotice(last.sheet_synced
        ? `Booking created. Invoice ${invoices} synced to Google Sheets.`
        : `Booking saved as invoice ${invoices}.`);
      setWarning(last.sheet_synced ? null : (last.sheet_sync_error || 'Google Sheet sync failed.'));
      setRawText('');
      setBookings([]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Create failed');
    } finally {
      setBusy(null);
    }
  };

  const testSheets = async () => {
    if (!sheetTab.trim()) {
      Alert.alert('AI Assistant', 'Enter the Google Sheet tab name first.');
      return;
    }
    setBusy('sheets');
    try {
      const result = await aiBookingAPI.testSheets(sheetTab.trim());
      if (result.success) {
        setWarning(null);
        setNotice(result.detail);
      } else {
        setWarning(result.detail);
      }
    } catch (e) {
      setWarning(e instanceof Error ? e.message : 'Sheets test failed');
    } finally {
      setBusy(null);
    }
  };

  const resync = async () => {
    if (!lastInvoice || !sheetTab.trim()) return;
    setBusy('resync');
    try {
      const result = await aiBookingAPI.resync(lastInvoice, sheetTab.trim());
      setWarning(result.sheet_synced ? null : (result.sheet_sync_error || 'Resync failed'));
      if (result.sheet_synced) setNotice(`Invoice #${lastInvoice} synced to Google Sheets.`);
    } catch (e) {
      setWarning(e instanceof Error ? e.message : 'Resync failed');
    } finally {
      setBusy(null);
    }
  };

  const runCommand = async () => {
    if (!command.trim()) return;
    setBusy('command');
    setCommandResult(null);
    try {
      const result = await aiBookingAPI.executeCommand(command.trim());
      if (result.rows?.length) {
        setCommandResult(result.rows.slice(0, 20).map((row) => Object.values(row).join(' · ')).join('\n'));
      } else {
        setCommandResult(result.message);
      }
    } catch (e) {
      setCommandResult(e instanceof Error ? e.message : 'Command failed');
    } finally {
      setBusy(null);
    }
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back} accessibilityLabel="Back">
          <Ionicons name="arrow-back" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={styles.title}>AI Assistant</Text>
        <View style={styles.back} />
      </View>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.intro}>Paste WhatsApp booking details, confirm, and sync to Google Sheets.</Text>
        <Text style={styles.label}>Google Sheet tab</Text>
        <TextInput
          value={sheetTab}
          onChangeText={onSheetTab}
          placeholder="November 2026"
          placeholderTextColor={colors.gray400}
          style={styles.input}
        />
        <View style={styles.row}>
          <TouchableOpacity style={styles.secondary} onPress={() => { void testSheets(); }} disabled={busy != null}>
            {busy === 'sheets' ? <ActivityIndicator color={colors.primary} /> : <Text style={styles.secondaryText}>Test Google Sheets</Text>}
          </TouchableOpacity>
          {lastInvoice ? (
            <TouchableOpacity style={styles.secondary} onPress={() => { void resync(); }} disabled={busy != null}>
              {busy === 'resync' ? <ActivityIndicator color={colors.primary} /> : <Text style={styles.secondaryText}>Resync #{lastInvoice}</Text>}
            </TouchableOpacity>
          ) : null}
        </View>

        {notice ? <Text style={styles.notice}>{notice}</Text> : null}
        {warning ? <Text style={styles.warning}>{warning}</Text> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Text style={styles.label}>Paste booking details</Text>
        <TextInput
          value={rawText}
          onChangeText={setRawText}
          placeholder="Paste the full WhatsApp booking"
          placeholderTextColor={colors.gray400}
          style={[styles.input, styles.paste]}
          multiline
          textAlignVertical="top"
        />
        <View style={styles.row}>
          <TouchableOpacity style={styles.primary} onPress={() => { void parse(); }} disabled={busy != null}>
            {busy === 'parse' ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Parse booking</Text>}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.secondary}
            onPress={() => {
              setRawText('');
              setBookings([]);
              setError(null);
            }}
          >
            <Text style={styles.secondaryText}>Clear</Text>
          </TouchableOpacity>
        </View>

        {bookings.map((booking, index) => {
          const terms = packageLines({
            hourlyPackage: booking.hourly_package,
            additionalRequirements: booking.additional_requirements,
            tripTerms: booking.trip_terms,
          });
          return (
            <View key={`${booking.customer_mobile}-${index}`} style={styles.card}>
              <Text style={styles.cardTitle}>{bookings.length > 1 ? `Trip ${index + 1}` : 'Parsed preview'}</Text>
              {PREVIEW.map((field) => (
                <View key={field.key} style={styles.fieldRow}>
                  <Text style={styles.fieldLabel}>{field.label}</Text>
                  <Text style={styles.fieldValue}>{showValue(booking[field.key])}</Text>
                </View>
              ))}
              {terms.length ? (
                <View style={styles.terms}>
                  <Text style={styles.fieldLabel}>Package terms</Text>
                  {terms.map((line) => (
                    <Text key={line} style={styles.term}>{`• ${line}`}</Text>
                  ))}
                </View>
              ) : null}
            </View>
          );
        })}

        {bookings.length ? (
          <TouchableOpacity style={styles.primary} onPress={() => { void create(); }} disabled={busy != null}>
            {busy === 'create' ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Create booking</Text>}
          </TouchableOpacity>
        ) : null}

        <Text style={styles.label}>Command</Text>
        <TextInput
          value={command}
          onChangeText={setCommand}
          placeholder="Ask the assistant"
          placeholderTextColor={colors.gray400}
          style={styles.input}
        />
        <TouchableOpacity style={styles.secondary} onPress={() => { void runCommand(); }} disabled={busy != null}>
          {busy === 'command' ? <ActivityIndicator color={colors.primary} /> : <Text style={styles.secondaryText}>Run command</Text>}
        </TouchableOpacity>
        {commandResult ? <Text style={styles.commandResult}>{commandResult}</Text> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.gray50 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 8,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
  },
  back: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 18, fontWeight: '700', color: colors.foreground },
  content: { padding: 16, paddingBottom: 40, gap: 10 },
  intro: { color: colors.gray600, fontSize: 14, marginBottom: 4 },
  label: { fontSize: 13, fontWeight: '600', color: colors.gray700, marginTop: 6 },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.foreground,
  },
  paste: { minHeight: 160 },
  row: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  primary: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 46,
  },
  primaryText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  secondary: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 46,
  },
  secondaryText: { color: colors.primary, fontWeight: '700', fontSize: 14 },
  notice: { backgroundColor: '#ecfdf5', color: '#065f46', borderRadius: 10, padding: 12, overflow: 'hidden' },
  warning: { backgroundColor: '#fffbeb', color: '#92400e', borderRadius: 10, padding: 12, overflow: 'hidden' },
  error: { backgroundColor: '#fef2f2', color: '#991b1b', borderRadius: 10, padding: 12, overflow: 'hidden' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.gray200,
    padding: 12,
    gap: 6,
  },
  cardTitle: { fontSize: 15, fontWeight: '700', color: colors.foreground, marginBottom: 4 },
  fieldRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  fieldLabel: { color: colors.gray600, fontSize: 13, flex: 1 },
  fieldValue: { color: colors.foreground, fontSize: 13, fontWeight: '600', flex: 1, textAlign: 'right' },
  terms: { marginTop: 6, gap: 4 },
  term: { color: colors.gray700, fontSize: 13 },
  commandResult: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    color: colors.foreground,
    fontSize: 13,
  },
});
