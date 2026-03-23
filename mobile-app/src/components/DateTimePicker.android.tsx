/**
 * Android-specific DateTimePicker - uses separate date and time pickers.
 * mode="datetime" on Android causes "Cannot read property 'dismiss' of undefined"
 * when multiple pickers exist (Date of journey + Return date). Android only supports
 * mode="date" | "time", so we use a two-step flow.
 */
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Feather } from '@expo/vector-icons';
import { format } from 'date-fns';
import { colors } from '../theme/colors';

interface DateTimePickerComponentProps {
  label?: string;
  date: Date;
  onDateChange: (date: Date) => void;
  minDate?: Date;
}

export function DateTimePickerComponent({
  label = 'Date of journey',
  date,
  onDateChange,
  minDate,
}: DateTimePickerComponentProps) {
  const [showDate, setShowDate] = useState(false);
  const [showTime, setShowTime] = useState(false);
  const [pendingDate, setPendingDate] = useState<Date | null>(null);

  const min = minDate || (() => {
    const n = new Date();
    n.setTime(n.getTime() + 60 * 60 * 1000);
    return n;
  })();

  const handleDateChange = (_: unknown, selected?: Date) => {
    setShowDate(false);
    if (selected) {
      setPendingDate(selected);
      setShowTime(true);
    }
  };

  const handleTimeChange = (_: unknown, selected?: Date) => {
    setShowTime(false);
    if (selected && pendingDate) {
      const combined = new Date(pendingDate);
      combined.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
      // Webapp logic: reject past time - require at least 1 hour advance for today
      if (combined < min) {
        setPendingDate(null);
        return;
      }
      onDateChange(combined);
    }
    setPendingDate(null);
  };

  // When date is today, time picker must respect min (1hr from now)
  const isPendingDateToday = pendingDate && min && pendingDate.toDateString() === min.toDateString();
  const timePickerMin = isPendingDateToday ? min : undefined;

  const handleOpen = () => {
    setShowDate(true);
  };

  return (
    <View style={styles.container}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TouchableOpacity style={styles.trigger} onPress={handleOpen}>
        <View style={styles.triggerInner}>
          <View style={styles.iconWrap}>
            <Feather name="calendar" size={18} color={colors.gray600} />
          </View>
          <Text style={styles.value}>
            {format(date, 'dd MMM yyyy')} at {format(date, 'HH:mm')}
          </Text>
        </View>
      </TouchableOpacity>
      {showDate && (
        <DateTimePicker
          value={date}
          mode="date"
          display="default"
          onChange={handleDateChange}
          minimumDate={min}
        />
      )}
      {showTime && (
        <DateTimePicker
          value={pendingDate ? (() => {
            const d = new Date(pendingDate);
            const proposed = new Date(d);
            proposed.setHours(date.getHours(), date.getMinutes(), 0, 0);
            // Ensure value is not before min when date is today
            const safe = timePickerMin && proposed < timePickerMin ? timePickerMin : proposed;
            d.setHours(safe.getHours(), safe.getMinutes(), 0, 0);
            return d;
          })() : date}
          mode="time"
          display="default"
          onChange={handleTimeChange}
          minimumDate={timePickerMin}
        />
      )}
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
  trigger: {
    backgroundColor: colors.gray50,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  triggerInner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconWrap: { marginRight: 8 },
  value: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.foreground,
    flex: 1,
  },
});
