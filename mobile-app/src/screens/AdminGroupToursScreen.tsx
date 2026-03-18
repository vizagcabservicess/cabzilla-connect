/**
 * Admin Group Tours - native list of group tours and bookings (mirrors web GroupToursManagementPage).
 * Supports edit existing tours and add new tours.
 */
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Platform,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/core';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { adminExtendedAPI, GroupTour, GroupTourBooking } from '../services/adminExtendedAPI';

const today = new Date().toISOString().slice(0, 10);

function formatAmount(n: number) {
  return `₹${n.toLocaleString('en-IN')}`;
}

type TourFormData = {
  pickup_location: string;
  dropoff_location: string;
  travel_date: string;
  price_per_seat: number;
  capacity: number;
  title: string;
};

const defaultForm: TourFormData = {
  pickup_location: '',
  dropoff_location: '',
  travel_date: today,
  price_per_seat: 500,
  capacity: 17,
  title: '',
};

function TourFormModal({
  visible,
  editingId,
  form,
  setForm,
  saving,
  onClose,
  onSave,
}: {
  visible: boolean;
  editingId: number | null;
  form: TourFormData;
  setForm: React.Dispatch<React.SetStateAction<TourFormData>>;
  saving: boolean;
  onClose: () => void;
  onSave: () => void;
}) {
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={modalStyles.overlay}>
        <View style={modalStyles.content}>
          <View style={modalStyles.header}>
            <Text style={modalStyles.title}>{editingId ? 'Edit Tour' : 'Create Tour'}</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={colors.foreground} />
            </TouchableOpacity>
          </View>
          <ScrollView style={modalStyles.body} keyboardShouldPersistTaps="handled">
            <Text style={inputStyles.label}>Title (optional)</Text>
            <TextInput
              style={inputStyles.input}
              value={form.title}
              onChangeText={(v) => setForm((f) => ({ ...f, title: v }))}
              placeholder="e.g. Araku Valley, Lambasingi"
            />
            <Text style={inputStyles.label}>Pickup location *</Text>
            <TextInput
              style={inputStyles.input}
              value={form.pickup_location}
              onChangeText={(v) => setForm((f) => ({ ...f, pickup_location: v }))}
              placeholder="e.g. RTC Complex"
            />
            <Text style={inputStyles.label}>Dropoff location *</Text>
            <TextInput
              style={inputStyles.input}
              value={form.dropoff_location}
              onChangeText={(v) => setForm((f) => ({ ...f, dropoff_location: v }))}
              placeholder="e.g. Lambasingi"
            />
            <Text style={inputStyles.label}>Travel date *</Text>
            <TextInput
              style={inputStyles.input}
              value={form.travel_date}
              onChangeText={(v) => setForm((f) => ({ ...f, travel_date: v }))}
              placeholder="YYYY-MM-DD"
            />
            <Text style={inputStyles.label}>Price per seat (₹) *</Text>
            <TextInput
              style={inputStyles.input}
              value={String(form.price_per_seat)}
              onChangeText={(v) => setForm((f) => ({ ...f, price_per_seat: Math.max(0, parseInt(v, 10) || 0) }))}
              keyboardType="numeric"
              placeholder="500"
            />
            <Text style={inputStyles.label}>Capacity (1–17) *</Text>
            <TextInput
              style={inputStyles.input}
              value={String(form.capacity)}
              onChangeText={(v) => setForm((f) => ({ ...f, capacity: Math.max(1, Math.min(17, parseInt(v, 10) || 17)) }))}
              keyboardType="numeric"
              placeholder="17"
            />
          </ScrollView>
          <View style={modalStyles.footer}>
            <TouchableOpacity style={modalStyles.cancelBtn} onPress={onClose}>
              <Text style={modalStyles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[modalStyles.saveBtn, saving && modalStyles.saveBtnDisabled]}
              onPress={onSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={modalStyles.saveText}>{editingId ? 'Update' : 'Create'}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  content: {
    backgroundColor: '#fff',
    borderRadius: 12,
    width: '100%',
    maxWidth: 400,
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
  },
  title: { fontSize: 18, fontWeight: '700', color: colors.foreground },
  body: { maxHeight: 360, padding: 16 },
  footer: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: colors.gray200,
  },
  cancelBtn: { flex: 1, padding: 12, alignItems: 'center', backgroundColor: colors.gray100, borderRadius: 8 },
  cancelText: { fontSize: 16, fontWeight: '600', color: colors.foreground },
  saveBtn: { flex: 1, padding: 12, alignItems: 'center', backgroundColor: colors.primary, borderRadius: 8 },
  saveBtnDisabled: { opacity: 0.7 },
  saveText: { fontSize: 16, fontWeight: '600', color: '#fff' },
});

const inputStyles = StyleSheet.create({
  label: { fontSize: 14, fontWeight: '600', color: colors.foreground, marginBottom: 4, marginTop: 8 },
  input: {
    borderWidth: 1,
    borderColor: colors.gray200,
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
    color: colors.foreground,
  },
});

export function AdminGroupToursScreen() {
  const navigation = useNavigation<any>();
  const [activeTab, setActiveTab] = useState<'tours' | 'bookings'>('tours');
  const [tours, setTours] = useState<GroupTour[]>([]);
  const [bookings, setBookings] = useState<GroupTourBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<TourFormData>(defaultForm);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      setError(null);
      const [toursList, bookingsList] = await Promise.all([
        adminExtendedAPI.groupToursList(),
        adminExtendedAPI.groupToursBookings(),
      ]);
      setTours(Array.isArray(toursList) ? toursList : []);
      setBookings(Array.isArray(bookingsList) ? bookingsList : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
      setTours([]);
      setBookings([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...defaultForm, travel_date: today });
    setDialogOpen(true);
  };

  const openEdit = async (tour: GroupTour) => {
    try {
      const full = await adminExtendedAPI.groupTourGet(tour.id);
      if (full) {
        setEditingId(tour.id);
        setForm({
          pickup_location: full.pickup_location ?? '',
          dropoff_location: full.dropoff_location ?? '',
          travel_date: full.travel_date ?? today,
          price_per_seat: full.price_per_seat ?? 500,
          capacity: full.capacity ?? 17,
          title: full.title ?? '',
        });
        setDialogOpen(true);
      }
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to load tour');
    }
  };

  const handleSave = async () => {
    if (!form.pickup_location.trim() || !form.dropoff_location.trim() || !form.travel_date) {
      Alert.alert('Validation', 'Pickup, dropoff, and date are required');
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        await adminExtendedAPI.groupTourUpdate(editingId, {
          pickup_location: form.pickup_location.trim(),
          dropoff_location: form.dropoff_location.trim(),
          travel_date: form.travel_date,
          price_per_seat: form.price_per_seat,
          capacity: form.capacity,
          title: form.title.trim() || null,
        });
        Alert.alert('Success', 'Tour updated');
      } else {
        await adminExtendedAPI.groupTourCreate({
          pickup_location: form.pickup_location.trim(),
          dropoff_location: form.dropoff_location.trim(),
          travel_date: form.travel_date,
          price_per_seat: form.price_per_seat,
          capacity: form.capacity,
          title: form.title.trim() || null,
        });
        Alert.alert('Success', 'Tour created');
      }
      setDialogOpen(false);
      load();
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (tour: GroupTour) => {
    Alert.alert(
      'Delete Tour',
      `Delete "${tour.pickup_location} → ${tour.dropoff_location}" (${tour.travel_date})? Seat reservations will be lost.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await adminExtendedAPI.groupTourDelete(tour.id);
              Alert.alert('Success', 'Tour deleted');
              load();
            } catch (e) {
              Alert.alert('Error', e instanceof Error ? e.message : 'Failed to delete');
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={styles.title}>Group Tours</Text>
        {activeTab === 'tours' && (
          <TouchableOpacity style={styles.addBtn} onPress={openCreate}>
            <Ionicons name="add" size={22} color={colors.primary} />
            <Text style={styles.addBtnText}>Add</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'tours' && styles.tabActive]}
          onPress={() => setActiveTab('tours')}
        >
          <Text style={[styles.tabText, activeTab === 'tours' && styles.tabTextActive]}>Tours</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'bookings' && styles.tabActive]}
          onPress={() => setActiveTab('bookings')}
        >
          <Text style={[styles.tabText, activeTab === 'bookings' && styles.tabTextActive]}>Bookings</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.gray600} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => { setLoading(true); load(); }}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {activeTab === 'tours' && (
            <>
              {tours.length === 0 ? (
                <View style={styles.empty}>
                  <Ionicons name="bus-outline" size={48} color={colors.gray200} />
                  <Text style={styles.emptyText}>No tours found</Text>
                  <TouchableOpacity style={styles.addFirstBtn} onPress={openCreate}>
                    <Text style={styles.addFirstBtnText}>Create Tour</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                tours.map((t) => (
                  <View key={t.id} style={styles.card}>
                    <View style={styles.iconWrap}>
                      <Ionicons name="bus-outline" size={24} color={colors.primary} />
                    </View>
                    <View style={styles.cardContent}>
                      <Text style={styles.cardTitle}>
                        {(t.pickup_location || '').slice(0, 30)} → {(t.dropoff_location || '').slice(0, 30)}
                      </Text>
                      <Text style={styles.cardSub}>{t.travel_date}</Text>
                      <View style={styles.metaRow}>
                        <Text style={styles.metaText}>{formatAmount(t.price_per_seat ?? 0)}/seat</Text>
                        <Text style={styles.metaText}>{t.available_seats ?? 0} seats left</Text>
                      </View>
                    </View>
                    <View style={styles.cardActions}>
                      <TouchableOpacity onPress={() => openEdit(t)} style={styles.actionBtn}>
                        <Ionicons name="create-outline" size={20} color={colors.primary} />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleDelete(t)} style={styles.actionBtn}>
                        <Ionicons name="trash-outline" size={20} color="#dc2626" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
            </>
          )}
          {activeTab === 'bookings' && (
            <>
              {bookings.length === 0 ? (
                <View style={styles.empty}>
                  <Ionicons name="calendar-outline" size={48} color={colors.gray200} />
                  <Text style={styles.emptyText}>No bookings found</Text>
                </View>
              ) : (
                bookings.map((b) => (
                  <View key={b.id} style={styles.card}>
                    <View style={styles.iconWrap}>
                      <Ionicons name="person-outline" size={24} color={colors.primary} />
                    </View>
                    <View style={styles.cardContent}>
                      <Text style={styles.cardTitle}>{b.customer_name}</Text>
                      <Text style={styles.cardSub}>{b.booking_number}</Text>
                      <Text style={styles.cardSub}>{b.pickup_location} → {b.dropoff_location}</Text>
                      <View style={styles.metaRow}>
                        <Text style={styles.metaText}>{formatAmount(b.total_amount)}</Text>
                        <View style={styles.statusBadge}>
                          <Text style={styles.statusText}>{b.status || '—'}</Text>
                        </View>
                      </View>
                    </View>
                  </View>
                ))
              )}
            </>
          )}
          <View style={{ height: 32 }} />
        </ScrollView>
      )}

      <TourFormModal
        visible={dialogOpen}
        editingId={editingId}
        form={form}
        setForm={setForm}
        saving={saving}
        onClose={() => setDialogOpen(false)}
        onSave={handleSave}
      />
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
  backBtn: { padding: 4, marginRight: 8 },
  title: { flex: 1, fontSize: 18, fontWeight: '700', color: colors.foreground },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 6, paddingHorizontal: 10 },
  addBtnText: { fontSize: 14, fontWeight: '600', color: colors.primary },
  cardActions: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actionBtn: { padding: 8 },
  addFirstBtn: { marginTop: 16, paddingVertical: 10, paddingHorizontal: 20, backgroundColor: colors.primary, borderRadius: 8 },
  addFirstBtnText: { fontSize: 14, fontWeight: '600', color: '#fff' },
  tabs: { flexDirection: 'row', backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 8 },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: colors.gray100,
    marginRight: 8,
  },
  tabActive: { backgroundColor: colors.primary },
  tabText: { fontSize: 14, fontWeight: '600', color: colors.gray600 },
  tabTextActive: { color: '#fff' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { flex: 1 },
  scrollContent: { padding: 16 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4 },
      android: { elevation: 3 },
    }),
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  cardContent: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: '600', color: colors.foreground },
  cardSub: { fontSize: 13, color: colors.gray600, marginTop: 2 },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 8 },
  metaText: { fontSize: 12, fontWeight: '600', color: colors.primary },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: colors.gray200,
  },
  statusText: { fontSize: 11, fontWeight: '600', color: colors.foreground },
  empty: { alignItems: 'center', paddingVertical: 48 },
  emptyText: { fontSize: 15, color: colors.gray600, marginTop: 12 },
  errorText: { fontSize: 15, color: colors.gray600, marginTop: 12, textAlign: 'center' },
  retryBtn: {
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: colors.primary,
    borderRadius: 8,
  },
  retryBtnText: { fontSize: 14, fontWeight: '600', color: '#fff' },
});
