import { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { mobileEventAPI, formatDutyDate, type EventDashboard, type MobileEvent } from '../services/eventDutyAPI';
import type { RootStackParamList } from '../navigation/types';
import { colors, fonts } from '../theme/colors';

const STATS: Array<{ key: keyof EventDashboard; label: string }> = [
  { key: 'activeEvents', label: 'Active Events' },
  { key: 'vehiclesAssigned', label: 'Vehicles Assigned' },
  { key: 'driversRegistered', label: 'Drivers Registered' },
  { key: 'todaysDuties', label: "Today's Duties" },
  { key: 'completedDuties', label: 'Completed Duties' },
  { key: 'pendingDuties', label: 'Pending Duties' },
  { key: 'missingDocuments', label: 'Missing Documents' },
];

const STATUSES = ['all', 'active', 'draft', 'archived'] as const;

export function AdminEventsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [events, setEvents] = useState<MobileEvent[]>([]);
  const [dashboard, setDashboard] = useState<EventDashboard | null>(null);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<(typeof STATUSES)[number]>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [clientName, setClientName] = useState('');
  const [saving, setSaving] = useState(false);

  const queryRef = useRef(query);
  const statusRef = useRef(status);
  queryRef.current = query;
  statusRef.current = status;

  const load = useCallback(async (quiet = false, nextQuery?: string, nextStatus?: string) => {
    if (!quiet) setLoading(true);
    try {
      const result = await mobileEventAPI.listEvents(nextQuery ?? queryRef.current, nextStatus ?? statusRef.current);
      setEvents(result.events);
      setDashboard(result.dashboard);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load events');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    void load(false);
  }, [load]));

  const saveEvent = async () => {
    if (!name.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
      Alert.alert('Event details', 'Enter a name and dates as YYYY-MM-DD.');
      return;
    }
    setSaving(true);
    try {
      const created = await mobileEventAPI.createEvent({
        name: name.trim(),
        startDate,
        endDate,
        clientName: clientName.trim(),
      });
      setFormOpen(false);
      setName('');
      setStartDate('');
      setEndDate('');
      setClientName('');
      await load(true);
      navigation.navigate('AdminEventDetail', { eventId: created.id, name: created.name });
    } catch (err) {
      Alert.alert('Could not create the event', err instanceof Error ? err.message : 'Try again');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={styles.title}>Event & Duty</Text>
        <TouchableOpacity onPress={() => setFormOpen(true)} style={styles.backBtn}>
          <Ionicons name="add" size={26} color="#2563eb" />
        </TouchableOpacity>
      </View>
      {loading && events.length === 0 ? (
        <View style={styles.center}><ActivityIndicator size="large" color="#2563eb" /></View>
      ) : (
        <FlatList
          data={events}
          keyExtractor={(item) => String(item.id)}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(true); }} />}
          contentContainerStyle={styles.list}
          ListHeaderComponent={(
            <View>
              {dashboard ? (
                <View style={styles.stats}>
                  {STATS.map((item) => (
                    <View key={item.key} style={styles.stat}>
                      <Text style={styles.statLabel}>{item.label}</Text>
                      <Text style={styles.statValue}>{dashboard[item.key]}</Text>
                    </View>
                  ))}
                </View>
              ) : null}
              <TextInput
                style={styles.search}
                placeholder="Search event, client, or code"
                value={query}
                onChangeText={setQuery}
                onSubmitEditing={() => { void load(true, query, status); }}
                returnKeyType="search"
              />
              <View style={styles.statusRow}>
                {STATUSES.map((item) => (
                  <TouchableOpacity
                    key={item}
                    style={[styles.statusChip, status === item && styles.statusChipOn]}
                    onPress={() => {
                      setStatus(item);
                      void load(true, query, item);
                    }}
                  >
                    <Text style={[styles.statusChipText, status === item && styles.statusChipTextOn]}>{item}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              {error ? <Text style={styles.error}>{error}</Text> : null}
            </View>
          )}
          ListEmptyComponent={<Text style={styles.empty}>No events yet.</Text>}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() => navigation.navigate('AdminEventDetail', { eventId: item.id, name: item.name })}
            >
              <View style={styles.cardTop}>
                <View style={styles.cardTitleWrap}>
                  <Text style={styles.name}>{item.name}</Text>
                  <Text style={styles.code}>{item.eventCode}</Text>
                </View>
                <Text style={styles.status}>{item.status}</Text>
              </View>
              <Text style={styles.meta}>{formatDutyDate(item.startDate)} – {formatDutyDate(item.endDate)}</Text>
              <Text style={styles.meta}>{item.clientName || 'No client'} · {item.assignmentCount ?? 0} assignments</Text>
            </TouchableOpacity>
          )}
        />
      )}
      <Modal visible={formOpen} animationType="slide" transparent>
        <View style={styles.modal}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>New event</Text>
            <TextInput style={styles.input} placeholder="Event name" value={name} onChangeText={setName} />
            <TextInput style={styles.input} placeholder="Client name" value={clientName} onChangeText={setClientName} />
            <TextInput style={styles.input} placeholder="Start date YYYY-MM-DD" value={startDate} onChangeText={setStartDate} />
            <TextInput style={styles.input} placeholder="End date YYYY-MM-DD" value={endDate} onChangeText={setEndDate} />
            <TouchableOpacity style={styles.save} disabled={saving} onPress={() => { void saveEvent(); }}>
              <Text style={styles.saveText}>{saving ? 'Saving…' : 'Create event'}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setFormOpen(false)}><Text style={styles.cancel}>Cancel</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  backBtn: { padding: 4, minWidth: 32 },
  title: { fontSize: 18, fontFamily: fonts.bold, color: colors.foreground },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  stat: { width: '47%', flexGrow: 1, backgroundColor: '#fff', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  statLabel: { color: '#64748b', fontSize: 12, fontFamily: fonts.medium },
  statValue: { color: '#0f172a', fontSize: 22, fontFamily: fonts.bold, marginTop: 4 },
  search: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, padding: 12, marginBottom: 8 },
  statusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  statusChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: '#e2e8f0' },
  statusChipOn: { backgroundColor: '#2563eb' },
  statusChipText: { color: '#334155', fontFamily: fonts.semiBold, fontSize: 12, textTransform: 'capitalize' },
  statusChipTextOn: { color: '#fff' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: 16 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#e2e8f0' },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  cardTitleWrap: { flex: 1 },
  name: { fontSize: 16, fontFamily: fonts.bold, color: '#0f172a' },
  code: { color: '#64748b', fontSize: 12, marginTop: 2, fontFamily: fonts.regular },
  status: { color: '#2563eb', fontFamily: fonts.bold, textTransform: 'capitalize' },
  meta: { color: '#475569', marginTop: 4 },
  error: { color: '#b91c1c', marginBottom: 8 },
  empty: { color: '#64748b', textAlign: 'center', marginTop: 24 },
  modal: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(15,23,42,0.4)' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 16 },
  sheetTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
  input: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, padding: 12, marginBottom: 8 },
  save: { backgroundColor: '#2563eb', borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  saveText: { color: '#fff', fontWeight: '700' },
  cancel: { textAlign: 'center', color: '#64748b', marginTop: 12, marginBottom: 8 },
});
