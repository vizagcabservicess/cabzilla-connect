/**
 * Edit Vehicle Type Modal - Amenities, inactive dates, inclusions, exclusions (matches web EditVehicleDialog)
 */
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { colors } from '../theme/colors';
import { adminAPI, type AdminVehicleType } from '../services/adminAPI';

const AMENITY_OPTIONS = [
  'AC',
  'Bottle Water',
  'Music System',
  'Extra Legroom',
  'Charging Point',
  'WiFi',
  'Premium Amenities',
  'Entertainment System',
  'Refrigerator',
];

interface EditVehicleTypeModalProps {
  visible: boolean;
  vehicleId: string;
  vehicleName?: string;
  onClose: () => void;
  onSaved?: () => void;
}

export function EditVehicleTypeModal({
  visible,
  vehicleId,
  vehicleName,
  onClose,
  onSaved,
}: EditVehicleTypeModalProps) {
  const [vehicle, setVehicle] = useState<AdminVehicleType | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [amenities, setAmenities] = useState<string[]>([]);
  const [inactiveDates, setInactiveDates] = useState<
    Array<{ id: string; from: Date; to: Date; reason?: string }>
  >([]);
  const [inclusionsText, setInclusionsText] = useState('');
  const [exclusionsText, setExclusionsText] = useState('');
  const [cancellationPolicy, setCancellationPolicy] = useState('');
  const [addingRange, setAddingRange] = useState(false);
  const [newRangeFrom, setNewRangeFrom] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [newRangeTo, setNewRangeTo] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [newRangeReason, setNewRangeReason] = useState('');
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);

  useEffect(() => {
    if (visible && vehicleId) {
      setLoading(true);
      adminAPI
        .getVehicleType(vehicleId)
        .then((v) => {
          setVehicle(v);
          setAmenities(v.amenities ?? []);
          const dates = (v.inactiveDates ?? []).map((r) => ({
            id: (r as { id?: string }).id ?? String(Date.now()),
            from: r.from instanceof Date ? r.from : new Date(String(r.from)),
            to: r.to instanceof Date ? r.to : new Date(String(r.to)),
            reason: (r as { reason?: string }).reason,
          }));
          setInactiveDates(dates);
          setInclusionsText(Array.isArray(v.inclusions) ? v.inclusions.join(', ') : (v.inclusions ?? ''));
          setExclusionsText(Array.isArray(v.exclusions) ? v.exclusions.join(', ') : (v.exclusions ?? ''));
          setCancellationPolicy(v.cancellationPolicy ?? '');
        })
        .catch((e) => {
          Alert.alert('Error', e instanceof Error ? e.message : 'Failed to load vehicle');
          onClose();
        })
        .finally(() => setLoading(false));
    }
  }, [visible, vehicleId, onClose]);

  const toggleAmenity = (a: string) => {
    setAmenities((prev) =>
      prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]
    );
  };

  const addInactiveRange = () => {
    if (newRangeFrom > newRangeTo) {
      Alert.alert('Invalid dates', 'From date must be before To date');
      return;
    }
    setInactiveDates((prev) => [
      ...prev,
      {
        id: `range-${Date.now()}`,
        from: new Date(newRangeFrom),
        to: new Date(newRangeTo),
        reason: newRangeReason.trim() || undefined,
      },
    ]);
    setNewRangeFrom(new Date(newRangeTo.getTime() + 86400000));
    setNewRangeTo(new Date(newRangeFrom.getTime() + 86400000));
    setNewRangeReason('');
    setAddingRange(false);
  };

  const removeInactiveRange = (id: string) => {
    setInactiveDates((prev) => prev.filter((r) => r.id !== id));
  };

  const handleSave = async () => {
    if (!vehicle) return;
    setSaving(true);
    try {
      const inclusions = inclusionsText
        .split(/[,;\n]/)
        .map((s) => s.trim())
        .filter(Boolean);
      const exclusions = exclusionsText
        .split(/[,;\n]/)
        .map((s) => s.trim())
        .filter(Boolean);
      await adminAPI.updateVehicleType({
        ...vehicle,
        amenities,
        inactiveDates,
        inclusions,
        exclusions,
        cancellationPolicy: cancellationPolicy.trim(),
      });
      Alert.alert('Success', 'Vehicle details updated', [
        { text: 'OK', onPress: () => { onClose(); onSaved?.(); } },
      ]);
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (!visible) return null;

  const displayName = vehicleName ?? vehicle?.name ?? vehicleId.replace(/_/g, ' ');

  return (
    <Modal visible animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>Vehicle Details – {displayName}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color={colors.foreground} />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loading}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : (
            <ScrollView style={styles.body} keyboardShouldPersistTaps="handled">
              <Text style={styles.sectionTitle}>Amenities</Text>
              <View style={styles.amenityGrid}>
                {AMENITY_OPTIONS.map((a) => (
                  <TouchableOpacity
                    key={a}
                    style={[styles.amenityChip, amenities.includes(a) && styles.amenityChipActive]}
                    onPress={() => toggleAmenity(a)}
                  >
                    <Ionicons
                      name={amenities.includes(a) ? 'checkbox' : 'square-outline'}
                      size={18}
                      color={amenities.includes(a) ? colors.primary : colors.gray600}
                    />
                    <Text style={[styles.amenityText, amenities.includes(a) && styles.amenityTextActive]}>
                      {a}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.sectionTitle}>Inactive Dates</Text>
              {inactiveDates.map((r) => (
                <View key={r.id} style={styles.rangeRow}>
                  <Text style={styles.rangeText}>
                    {format(r.from, 'dd MMM yyyy')} – {format(r.to, 'dd MMM yyyy')}
                    {r.reason ? ` (${r.reason})` : ''}
                  </Text>
                  <TouchableOpacity onPress={() => removeInactiveRange(r.id)}>
                    <Ionicons name="trash-outline" size={20} color="#dc2626" />
                  </TouchableOpacity>
                </View>
              ))}
              {addingRange ? (
                <View style={styles.addRangeBlock}>
                  <View style={styles.dateRow}>
                    <Text style={styles.label}>From</Text>
                    <TouchableOpacity style={styles.dateBtn} onPress={() => setShowFromPicker(true)}>
                      <Text>{format(newRangeFrom, 'yyyy-MM-dd')}</Text>
                    </TouchableOpacity>
                    {showFromPicker && (
                      <DateTimePicker
                        value={newRangeFrom}
                        mode="date"
                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                        onChange={(_, d) => {
                          if (d) setNewRangeFrom(d);
                          if (Platform.OS === 'android') setShowFromPicker(false);
                        }}
                      />
                    )}
                  </View>
                  <View style={styles.dateRow}>
                    <Text style={styles.label}>To</Text>
                    <TouchableOpacity style={styles.dateBtn} onPress={() => setShowToPicker(true)}>
                      <Text>{format(newRangeTo, 'yyyy-MM-dd')}</Text>
                    </TouchableOpacity>
                    {showToPicker && (
                      <DateTimePicker
                        value={newRangeTo}
                        mode="date"
                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                        onChange={(_, d) => {
                          if (d) setNewRangeTo(d);
                          if (Platform.OS === 'android') setShowToPicker(false);
                        }}
                      />
                    )}
                  </View>
                  <TextInput
                    style={styles.reasonInput}
                    placeholder="Reason (optional)"
                    value={newRangeReason}
                    onChangeText={setNewRangeReason}
                    placeholderTextColor={colors.gray600}
                  />
                  <View style={styles.addRangeActions}>
                    <TouchableOpacity style={styles.cancelBtn} onPress={() => setAddingRange(false)}>
                      <Text>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.addBtn} onPress={addInactiveRange}>
                      <Text style={styles.addBtnText}>Add</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.addRangeTrigger}
                  onPress={() => setAddingRange(true)}
                >
                  <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
                  <Text style={styles.addRangeText}>Add inactive period</Text>
                </TouchableOpacity>
              )}

              <Text style={styles.sectionTitle}>Inclusions</Text>
              <TextInput
                style={styles.textArea}
                placeholder="e.g., AC, Bottle Water, Music System"
                value={inclusionsText}
                onChangeText={setInclusionsText}
                multiline
                numberOfLines={2}
                placeholderTextColor={colors.gray600}
              />
              <Text style={styles.sectionTitle}>Exclusions</Text>
              <TextInput
                style={styles.textArea}
                placeholder="e.g., Toll, Parking, State Tax"
                value={exclusionsText}
                onChangeText={setExclusionsText}
                multiline
                numberOfLines={2}
                placeholderTextColor={colors.gray600}
              />
              <Text style={styles.sectionTitle}>Cancellation Policy</Text>
              <TextInput
                style={styles.textArea}
                placeholder="e.g., Free cancellation up to 1 hour before pickup"
                value={cancellationPolicy}
                onChangeText={setCancellationPolicy}
                multiline
                numberOfLines={2}
                placeholderTextColor={colors.gray600}
              />
            </ScrollView>
          )}

          <View style={styles.footer}>
            <TouchableOpacity style={styles.footerCancel} onPress={onClose}>
              <Text style={styles.footerCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.footerSave, saving && styles.footerSaveDisabled]}
              onPress={handleSave}
              disabled={saving || loading}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.footerSaveText}>Save</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
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
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
  },
  title: { fontSize: 18, fontWeight: '700', color: colors.foreground, flex: 1 },
  closeBtn: { padding: 4 },
  loading: { padding: 48, alignItems: 'center' },
  body: { maxHeight: 400, padding: 16 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: colors.foreground, marginTop: 16, marginBottom: 8 },
  amenityGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  amenityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  amenityChipActive: { borderColor: colors.primary, backgroundColor: `${colors.primary}15` },
  amenityText: { fontSize: 13, color: colors.foreground },
  amenityTextActive: { fontWeight: '600', color: colors.primary },
  rangeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    backgroundColor: '#fff7ed',
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#fed7aa',
  },
  rangeText: { fontSize: 13, color: colors.foreground },
  addRangeBlock: { marginTop: 8, padding: 12, backgroundColor: colors.gray50, borderRadius: 8 },
  dateRow: { marginBottom: 8 },
  label: { fontSize: 12, fontWeight: '600', color: colors.gray600, marginBottom: 4 },
  dateBtn: { padding: 10, backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: colors.gray200 },
  reasonInput: {
    marginTop: 8,
    padding: 10,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.gray200,
    fontSize: 14,
  },
  addRangeActions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  cancelBtn: { padding: 8 },
  addBtn: { padding: 8, backgroundColor: colors.primary, borderRadius: 8 },
  addBtnText: { color: '#fff', fontWeight: '600' },
  addRangeTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.primary,
    borderRadius: 8,
  },
  addRangeText: { fontSize: 14, color: colors.primary, fontWeight: '600' },
  textArea: {
    borderWidth: 1,
    borderColor: colors.gray200,
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    color: colors.foreground,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: colors.gray200,
  },
  footerCancel: { flex: 1, padding: 12, alignItems: 'center', backgroundColor: colors.gray100, borderRadius: 8 },
  footerCancelText: { fontSize: 16, fontWeight: '600', color: colors.foreground },
  footerSave: { flex: 1, padding: 12, alignItems: 'center', backgroundColor: colors.primary, borderRadius: 8 },
  footerSaveDisabled: { opacity: 0.7 },
  footerSaveText: { fontSize: 16, fontWeight: '600', color: '#fff' },
});
