import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';

export function AirportTaxiScreen() {
  const [pickup, setPickup] = useState('');
  const [drop, setDrop] = useState('');

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Airport Transfer</Text>
        <Text style={styles.subtitle}>
          Vizag Airport, Araku and other locations. Fixed rates. On-time guarantee.
        </Text>
        <Text style={styles.label}>Pickup Location</Text>
        <TextInput
          style={styles.input}
          value={pickup}
          onChangeText={setPickup}
          placeholder="Enter pickup address"
          placeholderTextColor={colors.mutedForeground}
        />
        <Text style={styles.label}>Drop Location</Text>
        <TextInput
          style={styles.input}
          value={drop}
          onChangeText={setDrop}
          placeholder="Enter destination (Vizag Airport, etc.)"
          placeholderTextColor={colors.mutedForeground}
        />
        <TouchableOpacity style={styles.button}>
          <Text style={styles.buttonText}>Get Fare</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: { padding: 24 },
  title: { fontSize: 24, fontWeight: '700', color: colors.foreground, marginBottom: 8 },
  subtitle: { fontSize: 16, color: colors.mutedForeground, marginBottom: 24 },
  label: { fontSize: 14, fontWeight: '500', marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
    color: colors.foreground,
  },
  button: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
});
