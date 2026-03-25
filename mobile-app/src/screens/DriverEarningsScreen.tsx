import React, { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { driverDashboardAPI } from '../services/driverDashboardAPI';
import type { DriverEarningsSummary } from '../types/driverDashboard';
import { useFocusEffect } from '@react-navigation/native';

const INITIAL_SUMMARY: DriverEarningsSummary = {
  totalTripsCompleted: 0,
  totalKilometers: 0,
  totalHours: 0,
  totalTripAmount: 0,
  totalFuelSpend: 0,
  numberOfRefills: 0,
  fuelEfficiencyKmPerLitre: 0,
  netEarnings: 0,
  profitEstimation: 0,
  earningsBreakdown: {
    company_paid: 0,
    self_paid: 0,
    corporate_booking: 0,
    agent_booking: 0,
  },
};

export function DriverEarningsScreen() {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<DriverEarningsSummary>(INITIAL_SUMMARY);

  const load = useCallback(async () => {
    try {
      const data = await driverDashboardAPI.getDashboard({ tripLimit: 5, fuelLimit: 5 });
      setSummary(data.summary);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Earnings Summary</Text>
        <KeyMetric label="Trips Completed" value={String(summary.totalTripsCompleted)} />
        <KeyMetric label="Total Kilometers" value={summary.totalKilometers.toFixed(1)} />
        <KeyMetric label="Total Hours" value={summary.totalHours.toFixed(1)} />
        <KeyMetric label="Net Earnings" value={`₹${summary.netEarnings.toFixed(0)}`} />
        <KeyMetric label="Fuel Cost" value={`₹${summary.totalFuelSpend.toFixed(0)}`} />
        <KeyMetric label="Profit Estimation" value={`₹${summary.profitEstimation.toFixed(0)}`} />

        <Text style={styles.sectionTitle}>Earnings Breakdown</Text>
        <Breakdown label="Company Paid" value={summary.earningsBreakdown.company_paid} />
        <Breakdown label="Self Paid" value={summary.earningsBreakdown.self_paid} />
        <Breakdown label="Corporate Booking" value={summary.earningsBreakdown.corporate_booking} />
        <Breakdown label="Agent Booking" value={summary.earningsBreakdown.agent_booking} />
      </ScrollView>
    </SafeAreaView>
  );
}

function KeyMetric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metricCard}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

function Breakdown({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.breakdownRow}>
      <Text style={styles.breakdownLabel}>{label}</Text>
      <Text style={styles.breakdownValue}>₹{value.toFixed(0)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.gray50 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: 16, paddingBottom: 40 },
  title: { fontSize: 22, fontWeight: '700', color: colors.foreground, marginBottom: 12 },
  metricCard: { backgroundColor: '#fff', borderWidth: 1, borderColor: colors.gray200, borderRadius: 12, padding: 12, marginBottom: 10 },
  metricLabel: { fontSize: 12, color: colors.gray600, marginBottom: 6 },
  metricValue: { fontSize: 20, fontWeight: '700', color: colors.foreground },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.foreground, marginTop: 10, marginBottom: 8 },
  breakdownRow: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#fff', borderWidth: 1, borderColor: colors.gray200, borderRadius: 10, padding: 10, marginBottom: 8 },
  breakdownLabel: { fontSize: 14, color: colors.gray700 },
  breakdownValue: { fontSize: 14, fontWeight: '700', color: colors.foreground },
});
