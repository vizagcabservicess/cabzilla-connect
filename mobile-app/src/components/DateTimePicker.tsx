import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Platform, StyleSheet } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Feather } from '@expo/vector-icons';
import { format } from 'date-fns';
import { colors } from '../theme/colors';

function defaultMinimumDate(): Date {
  const n = new Date();
  n.setTime(n.getTime() + 60 * 60 * 1000);
  return n;
}

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
  const [show, setShow] = useState(false);

  // Recompute each render so minimum tracks the clock (avoid stale min from first mount).
  const min = minDate ?? defaultMinimumDate();

  const handleChange = (_: any, selected?: Date) => {
    if (Platform.OS === 'android') setShow(false);
    if (selected) {
      // Webapp logic: reject past time - require at least 1 hour advance for today
      if (selected < min) return;
      onDateChange(selected);
    }
  };

  return (
    <View style={styles.container}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TouchableOpacity
        style={styles.trigger}
        onPress={() => setShow(true)}
      >
        <View style={styles.triggerInner}>
          <View style={styles.iconWrap}>
            <Feather name="calendar" size={18} color={colors.gray600} />
          </View>
          <Text style={styles.value}>
            {format(date, 'dd MMM yyyy')} at {format(date, 'HH:mm')}
          </Text>
        </View>
      </TouchableOpacity>
      {show && (
        <>
          <DateTimePicker
            value={date}
            mode="datetime"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handleChange}
            minimumDate={min}
          />
          {Platform.OS === 'ios' && (
            <TouchableOpacity style={styles.doneBtn} onPress={() => setShow(false)}>
              <Text style={styles.doneText}>Done</Text>
            </TouchableOpacity>
          )}
        </>
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
  doneBtn: {
    marginTop: 8,
    padding: 8,
    alignItems: 'flex-end',
  },
  doneText: {
    color: colors.primary,
    fontWeight: '600',
  },
});
