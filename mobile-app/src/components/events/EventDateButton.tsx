import { useState } from 'react';
import { Modal, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { fonts } from '../../theme/colors';

function toIsoDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function parseIsoDate(iso: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const parsed = new Date(`${iso}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function labelFor(iso: string): string {
  const parsed = parseIsoDate(iso);
  if (!parsed) return 'Pick a date';
  return parsed.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function EventDateButton({
  label,
  value,
  onChange,
  minimumDate,
  maximumDate,
  compact = false,
}: {
  label: string;
  value: string;
  onChange: (iso: string) => void;
  minimumDate?: Date;
  maximumDate?: Date;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Date>(() => parseIsoDate(value) ?? minimumDate ?? new Date());
  const current = parseIsoDate(value) ?? draft;

  const openPicker = () => {
    setDraft(parseIsoDate(value) ?? minimumDate ?? new Date());
    setOpen(true);
  };

  const apply = (date: Date) => {
    onChange(toIsoDate(date));
    setOpen(false);
  };

  const onAndroidChange = (event: DateTimePickerEvent, date?: Date) => {
    setOpen(false);
    if (event.type === 'dismissed' || !date) return;
    onChange(toIsoDate(date));
  };

  return (
    <>
      <TouchableOpacity style={compact ? styles.compact : styles.button} onPress={openPicker}>
        <Ionicons name="calendar-outline" size={18} color="#2563eb" />
        {compact ? null : (
          <View style={styles.copy}>
            <Text style={styles.label}>{label}</Text>
            <Text style={styles.value}>{labelFor(value)}</Text>
          </View>
        )}
      </TouchableOpacity>
      {open && Platform.OS === 'android' ? (
        <DateTimePicker
          value={current}
          mode="date"
          display="calendar"
          minimumDate={minimumDate}
          maximumDate={maximumDate}
          onChange={onAndroidChange}
        />
      ) : null}
      {open && Platform.OS === 'ios' ? (
        <Modal transparent animationType="fade" onRequestClose={() => setOpen(false)}>
          <View style={styles.backdrop}>
            <View style={styles.sheet}>
              <DateTimePicker
                value={draft}
                mode="date"
                display="spinner"
                minimumDate={minimumDate}
                maximumDate={maximumDate}
                onChange={(_, date) => { if (date) setDraft(date); }}
              />
              <TouchableOpacity style={styles.done} onPress={() => apply(draft)}>
                <Text style={styles.doneText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  compact: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  button: {
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  copy: { flex: 1 },
  label: { color: '#64748b', fontSize: 11, fontFamily: fonts.medium },
  value: { color: '#0f172a', fontSize: 13, fontFamily: fonts.bold, marginTop: 1 },
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(15, 23, 42, 0.35)' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16, paddingBottom: 24 },
  done: { alignItems: 'center', paddingVertical: 12 },
  doneText: { color: '#2563eb', fontFamily: fonts.bold, fontSize: 16 },
});
