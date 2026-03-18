/**
 * Web implementation - @react-native-community/datetimepicker does not support web.
 * Uses HTML5 datetime-local input for reliable date/time selection.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors } from '../theme/colors';

interface DateTimePickerComponentProps {
  label?: string;
  date: Date;
  onDateChange: (date: Date) => void;
  minDate?: Date;
}

function toDateTimeLocalStr(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function parseDateTimeLocalStr(s: string): Date {
  const d = new Date(s);
  return isNaN(d.getTime()) ? new Date() : d;
}

export function DateTimePickerComponent({
  label = 'Date of journey',
  date,
  onDateChange,
  minDate,
}: DateTimePickerComponentProps) {
  const minStr = minDate ? toDateTimeLocalStr(minDate) : undefined;

  return (
    <View style={styles.container}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={styles.inputRow}>
        <View style={styles.iconWrap}>
          <Feather name="calendar" size={18} color={colors.gray600} />
        </View>
        <input
          type="datetime-local"
          value={toDateTimeLocalStr(date)}
          min={minStr}
          onChange={(e) => {
            const v = e.target.value;
            if (v) onDateChange(parseDateTimeLocalStr(v));
          }}
          style={styles.input}
          aria-label={label}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 10 },
  label: {
    fontSize: 11,
    color: colors.primary,
    marginBottom: 3,
    fontWeight: '600',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.gray50,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 10,
  },
  iconWrap: { marginRight: 8 },
  input: {
    flex: 1,
    padding: 10,
    paddingLeft: 0,
    fontSize: 15,
    fontWeight: '600' as const,
    color: colors.foreground,
    backgroundColor: 'transparent',
    border: 'none',
    boxSizing: 'border-box' as const,
    cursor: 'pointer',
    outlineStyle: 'none',
  } as Record<string, unknown>,
});
