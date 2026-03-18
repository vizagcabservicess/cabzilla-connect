/**
 * Admin Fuel - dynamic fuel management matching web FuelManagementPage
 * Fuel prices, stats, records list, add/edit/delete
 */
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Platform,
  TextInput,
  Alert,
  Modal,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format, subDays } from 'date-fns';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/core';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { adminExtendedAPI } from '../services/adminExtendedAPI';
import { adminAPI, AdminFleetVehicle } from '../services/adminAPI';

function formatAmount(n: number) {
  return `₹${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
}

type FuelPrice = { id?: string; fuelType: string; price: number; effectiveDate?: string };
type FuelRecord = {
  id: string | number;
  vehicleId: string;
  fillDate: string;
  quantity: number;
  pricePerUnit: number;
  totalCost: number;
  odometer: number;
  fuelStation?: string;
  fuelType: string;
  paymentMethod: string;
  vehicleName?: string;
  vehicleNumber?: string;
  calculatedMileage?: number | null;
};

const FUEL_TYPES = ['Petrol', 'Diesel', 'CNG', 'Electric'] as const;
const PAYMENT_METHODS = ['Cash', 'Card', 'Company', 'Customer'] as const;

function parseNum(val: unknown): number {
  if (val == null) return 0;
  if (typeof val === 'number' && !Number.isNaN(val)) return val;
  const s = String(val).replace(/,/g, '').trim();
  const n = parseFloat(s);
  return Number.isNaN(n) ? 0 : n;
}

/** Use quantity when > 0; else derive from totalCost/pricePerUnit when backend omits it (schema mismatch fallback) */
function getEffectiveQuantity(r: FuelRecord): number {
  const q = r.quantity ?? 0;
  if (q > 0) return q;
  const cost = r.totalCost ?? 0;
  const price = r.pricePerUnit ?? 0;
  if (cost > 0 && price > 0) return cost / price;
  return 0;
}

/** Use pricePerUnit when > 0; else derive from totalCost/quantity */
function getEffectivePricePerUnit(r: FuelRecord): number {
  const p = r.pricePerUnit ?? 0;
  if (p > 0) return p;
  const cost = r.totalCost ?? 0;
  const q = r.quantity ?? 0;
  if (cost > 0 && q > 0) return cost / q;
  return 0;
}

function normalizeFuelRecord(r: Record<string, unknown>): FuelRecord {
  const quantity = parseNum(r.quantity ?? r.quantityLiters ?? r.quantity_liters ?? 0);
  const pricePerUnit = parseNum(r.pricePerUnit ?? r.pricePerLiter ?? r.price_per_unit ?? r.price_per_liter ?? 0);
  const idVal = r.id;
  const safeId = (typeof idVal === 'string' || typeof idVal === 'number') ? idVal : 0;
  return {
    id: safeId,
    vehicleId: String(r.vehicleId ?? r.vehicle_id ?? ''),
    fillDate: String(r.fillDate ?? r.fill_date ?? ''),
    quantity,
    pricePerUnit,
    totalCost: parseNum(r.totalCost ?? r.total_cost ?? 0),
    odometer: Math.floor(parseNum(r.odometer ?? r.odometer_reading ?? 0)),
    fuelStation: (r.fuelStation ?? r.fuel_station ?? r.station) as string | undefined,
    fuelType: String(r.fuelType ?? r.fuel_type ?? 'Petrol'),
    paymentMethod: String(r.paymentMethod ?? r.payment_method ?? 'Cash'),
    vehicleName: (r.vehicleName ?? r.vehicle_name) as string | undefined,
    vehicleNumber: (r.vehicleNumber ?? r.vehicle_number) as string | undefined,
  };
}

function calculateMileage(records: FuelRecord[], getQty: (r: FuelRecord) => number = (r) => r.quantity ?? 0): FuelRecord[] {
  const grouped: Record<string, FuelRecord[]> = {};
  records.forEach((r) => {
    const vid = String(r.vehicleId ?? '');
    if (!grouped[vid]) grouped[vid] = [];
    grouped[vid].push(r);
  });
  Object.values(grouped).forEach((arr) => {
    arr.sort((a, b) => new Date(a.fillDate).getTime() - new Date(b.fillDate).getTime());
    for (let i = 1; i < arr.length; i++) {
      const prev = arr[i - 1];
      const curr = arr[i];
      const dist = curr.odometer - prev.odometer;
      const qty = getQty(curr);
      curr.calculatedMileage = qty > 0 && dist > 0 ? dist / qty : null;
    }
  });
  return records;
}

export function AdminFuelScreen() {
  const navigation = useNavigation<any>();
  const [prices, setPrices] = useState<FuelPrice[]>([]);
  const [records, setRecords] = useState<FuelRecord[]>([]);
  const [vehicles, setVehicles] = useState<AdminFleetVehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterVehicle, setFilterVehicle] = useState('');
  const [filterFuelType, setFilterFuelType] = useState('');
  const [filterPayment, setFilterPayment] = useState('');
  const [dateRangeType, setDateRangeType] = useState('all');
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();

  const [showRecordForm, setShowRecordForm] = useState(false);
  const [editingRecord, setEditingRecord] = useState<FuelRecord | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [showPriceModal, setShowPriceModal] = useState(false);
  const [editingPriceType, setEditingPriceType] = useState('');
  const [editingPriceVal, setEditingPriceVal] = useState('');

  const [formVehicleId, setFormVehicleId] = useState('');
  const [formFillDate, setFormFillDate] = useState(new Date());
  const [formQuantity, setFormQuantity] = useState('');
  const [formPricePerUnit, setFormPricePerUnit] = useState('');
  const [formTotalCost, setFormTotalCost] = useState('');
  const [formOdometer, setFormOdometer] = useState('');
  const [formFuelStation, setFormFuelStation] = useState('');
  const [formFuelType, setFormFuelType] = useState('Petrol');
  const [formPaymentMethod, setFormPaymentMethod] = useState('Cash');
  const [formNotes, setFormNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showRangeStartPicker, setShowRangeStartPicker] = useState(false);
  const [showRangeEndPicker, setShowRangeEndPicker] = useState(false);

  const selectDateRange = () => {
    setDateRangeType('custom');
    if (!startDate) setStartDate(subDays(new Date(), 30));
    if (!endDate) setEndDate(new Date());
  };

  const load = useCallback(async () => {
    try {
      setError(null);
      const [pricesList, recordsList, vehiclesList] = await Promise.all([
        adminExtendedAPI.fuelPrices(),
        adminExtendedAPI.fuelRecords({ limit: 500 }),
        adminAPI.getFleetVehicles(true),
      ]);
      setPrices(Array.isArray(pricesList) ? pricesList : []);
      const rawRecords = Array.isArray(recordsList) ? recordsList : [];
      setRecords(rawRecords.map((r: Record<string, unknown>) => normalizeFuelRecord(r)));
      setVehicles(Array.isArray(vehiclesList) ? vehiclesList : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
      setPrices([]);
      setRecords([]);
      setVehicles([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const filteredRecords = React.useMemo(() => {
    let list = [...records];
    if (searchTerm.trim()) {
      const s = searchTerm.toLowerCase();
      list = list.filter(
        (r) =>
          (r.vehicleNumber ?? '').toLowerCase().includes(s) ||
          (r.vehicleName ?? '').toLowerCase().includes(s) ||
          (r.fuelStation ?? '').toLowerCase().includes(s) ||
          (r.fuelType ?? '').toLowerCase().includes(s)
      );
    }
    if (filterVehicle) list = list.filter((r) => String(r.vehicleId) === filterVehicle);
    if (filterFuelType) list = list.filter((r) => r.fuelType === filterFuelType);
    if (filterPayment) list = list.filter((r) => r.paymentMethod === filterPayment);
    if (dateRangeType !== 'all' && dateRangeType !== 'custom') {
      const today = new Date();
      let from: Date;
      switch (dateRangeType) {
        case 'today': from = new Date(today.setHours(0, 0, 0, 0)); break;
        case 'week': from = subDays(today, 7); break;
        case 'month': from = new Date(today.getFullYear(), today.getMonth(), 1); break;
        case 'year': from = new Date(today.getFullYear(), 0, 1); break;
        default: from = new Date(0);
      }
      list = list.filter((r) => new Date(r.fillDate) >= from);
    }
    if (dateRangeType === 'custom' && startDate && endDate) {
      const from = new Date(startDate).setHours(0, 0, 0, 0);
      const to = new Date(endDate).setHours(23, 59, 59, 999);
      list = list.filter((r) => {
        const t = new Date(r.fillDate).getTime();
        return t >= from && t <= to;
      });
    }
    return calculateMileage(list, getEffectiveQuantity);
  }, [records, searchTerm, filterVehicle, filterFuelType, filterPayment, dateRangeType, startDate, endDate]);

  const getEffectiveQuantity = (r: FuelRecord) => {
    const q = r.quantity ?? 0;
    if (q > 0) return q;
    const cost = r.totalCost ?? 0;
    const price = r.pricePerUnit ?? 0;
    if (cost > 0 && price > 0) return cost / price;
    return 0;
  };
  const totalCost = filteredRecords.reduce((s, r) => s + (r.totalCost ?? 0), 0);
  const totalLiters = filteredRecords.reduce((s, r) => s + getEffectiveQuantity(r), 0);
  const avgCostPerLiter = totalLiters > 0 ? totalCost / totalLiters : 0;
  const mileageArr = filteredRecords.filter((r) => r.calculatedMileage && r.calculatedMileage! > 0);
  const avgMileage = mileageArr.length > 0 ? mileageArr.reduce((s, r) => s + (r.calculatedMileage ?? 0), 0) / mileageArr.length : 0;

  const getVehicleLabel = (vid: string) => {
    const v = vehicles.find((x) => String(x.id) === vid);
    const num = (v?.vehicleNumber ?? (v as { vehicle_number?: string })?.vehicle_number ?? '');
    const name = v?.name ?? '';
    const model = v?.model ?? '';
    return v ? [num, name, model].filter(Boolean).join(' • ') || String(vid) : String(vid);
  };

  const openAddRecord = () => {
    setEditingRecord(null);
    setFormVehicleId(vehicles[0] ? String(vehicles[0].id) : '');
    setFormFillDate(new Date());
    setFormQuantity('');
    setFormPricePerUnit('');
    setFormTotalCost('');
    setFormOdometer('');
    setFormFuelStation('');
    setFormFuelType('Petrol');
    setFormPaymentMethod('Cash');
    setFormNotes('');
    setShowRecordForm(true);
  };

  const openEditRecord = (r: FuelRecord) => {
    setEditingRecord(r);
    setFormVehicleId(String(r.vehicleId));
    setFormFillDate(new Date(r.fillDate));
    setFormQuantity(String(r.quantity ?? ''));
    setFormPricePerUnit(String(r.pricePerUnit ?? ''));
    setFormTotalCost(String(r.totalCost ?? ''));
    setFormOdometer(String(r.odometer ?? ''));
    setFormFuelStation(r.fuelStation ?? '');
    setFormFuelType(r.fuelType ?? 'Petrol');
    setFormPaymentMethod(r.paymentMethod ?? 'Cash');
    setFormNotes('');
    setShowRecordForm(true);
  };

  const handleSaveRecord = async () => {
    const qty = parseFloat(formQuantity);
    const price = parseFloat(formPricePerUnit);
    const cost = parseFloat(formTotalCost);
    const odo = parseInt(formOdometer, 10);
    if (!formVehicleId) {
      Alert.alert('Validation', 'Select a vehicle');
      return;
    }
    if (isNaN(qty) || qty <= 0) {
      Alert.alert('Validation', 'Enter valid quantity');
      return;
    }
    if (isNaN(price) || price <= 0) {
      Alert.alert('Validation', 'Enter valid price per unit');
      return;
    }
    if (isNaN(odo) || odo < 0) {
      Alert.alert('Validation', 'Enter valid odometer reading');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        vehicleId: formVehicleId,
        fillDate: format(formFillDate, 'yyyy-MM-dd'),
        quantity: qty,
        pricePerUnit: price,
        totalCost: isNaN(cost) ? qty * price : cost,
        odometer: odo,
        fuelStation: formFuelStation || undefined,
        fuelType: formFuelType,
        paymentMethod: formPaymentMethod,
        notes: formNotes || undefined,
      };
      if (editingRecord?.id != null) {
        await adminExtendedAPI.fuelUpdateRecord(editingRecord.id, payload);
        Alert.alert('Success', 'Fuel record updated');
      } else {
        await adminExtendedAPI.fuelCreateRecord(payload);
        Alert.alert('Success', 'Fuel record added');
      }
      setShowRecordForm(false);
      load();
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRecord = async (id: string) => {
    try {
      await adminExtendedAPI.fuelDeleteRecord(id);
      setConfirmDeleteId(null);
      load();
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to delete');
    }
  };

  const openEditPrice = (ft: string, p: number) => {
    setEditingPriceType(ft);
    setEditingPriceVal(String(p));
    setShowPriceModal(true);
  };

  const handleSavePrice = async () => {
    const p = parseFloat(editingPriceVal);
    if (isNaN(p) || p <= 0) {
      Alert.alert('Validation', 'Enter valid price');
      return;
    }
    setSaving(true);
    try {
      await adminExtendedAPI.fuelUpdatePrice({ fuelType: editingPriceType, price: p });
      setShowPriceModal(false);
      load();
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to update price');
    } finally {
      setSaving(false);
    }
  };

  const getFuelColor = (ft: string) => {
    switch (ft) {
      case 'Petrol': return '#dcfce7';
      case 'Diesel': return '#dbeafe';
      case 'CNG': return '#fef9c3';
      default: return colors.gray200;
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={styles.title}>Fuel Management</Text>
        <TouchableOpacity onPress={openAddRecord} style={styles.addBtn}>
          <Ionicons name="add" size={24} color={colors.primary} />
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
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
        >
          {/* Fuel prices */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Current Prices</Text>
            <View style={styles.pricesRow}>
              {(prices.length > 0 ? prices : [{ fuelType: 'Petrol', price: 0 }, { fuelType: 'Diesel', price: 0 }, { fuelType: 'CNG', price: 0 }]).map((p) => (
                <TouchableOpacity key={p.fuelType} style={[styles.priceCard, { backgroundColor: getFuelColor(p.fuelType) }]} onPress={() => openEditPrice(p.fuelType, p.price || 0)}>
                  <Text style={styles.priceLabel}>{p.fuelType}</Text>
                  <Text style={styles.priceValue}>₹{(p.price || 0).toFixed(2)}</Text>
                  <Text style={styles.priceHint}>Tap to edit</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Stats */}
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Total Cost</Text>
              <Text style={styles.statValue}>{formatAmount(totalCost)}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Liters</Text>
              <Text style={styles.statValue}>{totalLiters.toFixed(1)} L</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Avg ₹/L</Text>
              <Text style={styles.statValue}>{avgCostPerLiter.toFixed(2)}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Avg Mileage</Text>
              <Text style={styles.statValue}>{avgMileage.toFixed(1)} km/L</Text>
            </View>
          </View>

          {/* Search & Filters */}
          <TextInput
            style={styles.searchInput}
            placeholder="Search by station, vehicle..."
            placeholderTextColor={colors.gray600}
            value={searchTerm}
            onChangeText={setSearchTerm}
          />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
            <TouchableOpacity style={[styles.chip, !filterVehicle && styles.chipActive]} onPress={() => setFilterVehicle('')}>
              <Text style={[styles.chipText, !filterVehicle && styles.chipTextActive]}>All vehicles</Text>
            </TouchableOpacity>
            {vehicles.slice(0, 8).map((v) => (
              <TouchableOpacity key={v.id} style={[styles.chip, filterVehicle === String(v.id) && styles.chipActive]} onPress={() => setFilterVehicle(filterVehicle === String(v.id) ? '' : String(v.id))}>
                <Text style={[styles.chipText, filterVehicle === String(v.id) && styles.chipTextActive]} numberOfLines={1}>{v.vehicleNumber ?? (v as { vehicle_number?: string }).vehicle_number ?? v.id}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
            {['', ...FUEL_TYPES].map((ft) => (
              <TouchableOpacity key={ft || 'all'} style={[styles.chip, (ft ? filterFuelType === ft : !filterFuelType) && styles.chipActive]} onPress={() => setFilterFuelType(ft || '')}>
                <Text style={[styles.chipText, (ft ? filterFuelType === ft : !filterFuelType) && styles.chipTextActive]}>{ft || 'All fuel'}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
            {['all', ...PAYMENT_METHODS].map((pm) => (
              <TouchableOpacity key={pm} style={[styles.chip, (pm === 'all' ? !filterPayment : filterPayment === pm) && styles.chipActive]} onPress={() => setFilterPayment(pm === 'all' ? '' : pm)}>
                <Text style={[styles.chipText, (pm === 'all' ? !filterPayment : filterPayment === pm) && styles.chipTextActive]}>{pm === 'all' ? 'All payment' : pm}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dateRow}>
            <TouchableOpacity style={[styles.dateBtn, dateRangeType === 'all' && styles.dateBtnActive]} onPress={() => setDateRangeType('all')}>
              <Text style={[styles.dateBtnText, dateRangeType === 'all' && styles.dateBtnTextActive]}>All</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.dateBtn, dateRangeType === 'today' && styles.dateBtnActive]} onPress={() => setDateRangeType('today')}>
              <Text style={[styles.dateBtnText, dateRangeType === 'today' && styles.dateBtnTextActive]}>Today</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.dateBtn, dateRangeType === 'week' && styles.dateBtnActive]} onPress={() => setDateRangeType('week')}>
              <Text style={[styles.dateBtnText, dateRangeType === 'week' && styles.dateBtnTextActive]}>Week</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.dateBtn, dateRangeType === 'month' && styles.dateBtnActive]} onPress={() => setDateRangeType('month')}>
              <Text style={[styles.dateBtnText, dateRangeType === 'month' && styles.dateBtnTextActive]}>Month</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.dateBtn, dateRangeType === 'year' && styles.dateBtnActive]} onPress={() => setDateRangeType('year')}>
              <Text style={[styles.dateBtnText, dateRangeType === 'year' && styles.dateBtnTextActive]}>Year</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.dateBtn, dateRangeType === 'custom' && styles.dateBtnActive]} onPress={selectDateRange}>
              <Text style={[styles.dateBtnText, dateRangeType === 'custom' && styles.dateBtnTextActive]}>Range</Text>
            </TouchableOpacity>
          </ScrollView>
          {dateRangeType === 'custom' && (
            <View style={styles.dateRangeRow}>
              <View style={styles.dateRangeField}>
                <Text style={styles.dateRangeLabel}>From</Text>
                <TouchableOpacity style={styles.dateRangeInput} onPress={() => setShowRangeStartPicker(true)}>
                  <Text style={styles.dateRangeValue}>{startDate ? format(startDate, 'dd MMM yyyy') : 'Select'}</Text>
                  <Ionicons name="calendar-outline" size={18} color={colors.gray600} />
                </TouchableOpacity>
              </View>
              <View style={styles.dateRangeField}>
                <Text style={styles.dateRangeLabel}>To</Text>
                <TouchableOpacity style={styles.dateRangeInput} onPress={() => setShowRangeEndPicker(true)}>
                  <Text style={styles.dateRangeValue}>{endDate ? format(endDate, 'dd MMM yyyy') : 'Select'}</Text>
                  <Ionicons name="calendar-outline" size={18} color={colors.gray600} />
                </TouchableOpacity>
              </View>
            </View>
          )}
          {showRangeStartPicker && (
            <DateTimePicker
              value={startDate ?? subDays(new Date(), 30)}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              maximumDate={endDate ?? new Date()}
              onChange={(_, d) => {
                if (Platform.OS === 'android') setShowRangeStartPicker(false);
                if (d) setStartDate(d);
              }}
            />
          )}
          {Platform.OS === 'ios' && showRangeStartPicker && (
            <TouchableOpacity style={styles.dateDoneBtn} onPress={() => setShowRangeStartPicker(false)}>
              <Text style={styles.dateDoneText}>Done</Text>
            </TouchableOpacity>
          )}
          {showRangeEndPicker && (
            <DateTimePicker
              value={endDate ?? new Date()}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              minimumDate={startDate}
              maximumDate={new Date()}
              onChange={(_, d) => {
                if (Platform.OS === 'android') setShowRangeEndPicker(false);
                if (d) setEndDate(d);
              }}
            />
          )}
          {Platform.OS === 'ios' && showRangeEndPicker && (
            <TouchableOpacity style={styles.dateDoneBtn} onPress={() => setShowRangeEndPicker(false)}>
              <Text style={styles.dateDoneText}>Done</Text>
            </TouchableOpacity>
          )}

          {/* Records list */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Fuel Records</Text>
            {filteredRecords.length === 0 ? (
              <View style={styles.empty}>
                <Ionicons name="water-outline" size={48} color={colors.gray400} />
                <Text style={styles.emptyText}>No fuel records</Text>
                <TouchableOpacity style={styles.emptyAddBtn} onPress={openAddRecord}>
                  <Text style={styles.emptyAddBtnText}>Add Record</Text>
                </TouchableOpacity>
              </View>
            ) : (
              filteredRecords.map((r) => (
                <View key={String(r.id)} style={styles.recordCard}>
                  <View style={styles.recordRow}>
                    <Text style={styles.recordDate}>{format(new Date(r.fillDate), 'dd MMM yyyy')}</Text>
                    <View style={[styles.fuelBadge, { backgroundColor: getFuelColor(r.fuelType) }]}>
                      <Text style={styles.fuelBadgeText}>{r.fuelType}</Text>
                    </View>
                  </View>
                  <Text style={styles.recordVehicle}>{getVehicleLabel(String(r.vehicleId))}</Text>
                  <View style={styles.recordMeta}>
                    <Text style={styles.recordMetaText}>{getEffectiveQuantity(r).toFixed(1)} L</Text>
                    <Text style={styles.recordMetaText}>₹{getEffectivePricePerUnit(r).toFixed(2)}/L</Text>
                    <Text style={styles.recordMetaText}>{formatAmount(r.totalCost ?? 0)}</Text>
                    {r.odometer != null && <Text style={styles.recordMetaText}>{r.odometer.toLocaleString()} km</Text>}
                    {r.calculatedMileage != null && r.calculatedMileage! > 0 && (
                      <Text style={styles.recordMetaText}>{r.calculatedMileage!.toFixed(1)} km/L</Text>
                    )}
                  </View>
                  <View style={styles.recordActions}>
                    <TouchableOpacity style={styles.recordActionBtn} onPress={() => openEditRecord(r)}>
                      <Ionicons name="pencil-outline" size={18} color={colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.recordActionBtn} onPress={() => setConfirmDeleteId(String(r.id))}>
                      <Ionicons name="trash-outline" size={18} color="#dc2626" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </View>
          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {/* Price edit modal */}
      <Modal visible={showPriceModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Update {editingPriceType} Price</Text>
            <TextInput
              style={styles.input}
              placeholder="Price (₹)"
              placeholderTextColor={colors.gray600}
              value={editingPriceVal}
              onChangeText={setEditingPriceVal}
              keyboardType="decimal-pad"
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalBtnSecondary} onPress={() => setShowPriceModal(false)}>
                <Text style={styles.modalBtnSecondaryText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtnPrimary, saving && styles.btnDisabled]} onPress={handleSavePrice} disabled={saving}>
                <Text style={styles.modalBtnPrimaryText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Record form modal */}
      <Modal visible={showRecordForm} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalScrollContent}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>{editingRecord ? 'Edit Fuel Record' : 'Add Fuel Record'}</Text>
              <Text style={styles.label}>Vehicle *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.formChipRow}>
                {vehicles.map((v) => (
                  <TouchableOpacity key={v.id} style={[styles.formChip, formVehicleId === String(v.id) && styles.formChipActive]} onPress={() => setFormVehicleId(String(v.id))}>
                    <Text style={[styles.formChipText, formVehicleId === String(v.id) && styles.formChipTextActive]} numberOfLines={1}>{v.vehicleNumber ?? (v as { vehicle_number?: string }).vehicle_number ?? v.name ?? v.id}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <Text style={styles.label}>Fill Date</Text>
              <TouchableOpacity style={styles.input} onPress={() => setShowDatePicker(true)}>
                <Text style={styles.inputText}>{format(formFillDate, 'yyyy-MM-dd')}</Text>
              </TouchableOpacity>
              {showDatePicker && (
                <>
                  <DateTimePicker
                    value={formFillDate}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={(_, d) => {
                      if (Platform.OS === 'android') setShowDatePicker(false);
                      if (d) setFormFillDate(d);
                    }}
                  />
                  {Platform.OS === 'ios' && (
                    <TouchableOpacity style={styles.dateDoneBtn} onPress={() => setShowDatePicker(false)}>
                      <Text style={styles.dateDoneText}>Done</Text>
                    </TouchableOpacity>
                  )}
                </>
              )}
              <View style={styles.formRow}>
                <View style={styles.formHalf}>
                  <Text style={styles.label}>Quantity (L) *</Text>
                  <TextInput style={styles.input} value={formQuantity} onChangeText={setFormQuantity} placeholder="0" keyboardType="decimal-pad" placeholderTextColor={colors.gray600} />
                </View>
                <View style={styles.formHalf}>
                  <Text style={styles.label}>Price/L (₹) *</Text>
                  <TextInput style={styles.input} value={formPricePerUnit} onChangeText={(t) => { setFormPricePerUnit(t); if (formQuantity) setFormTotalCost(String(parseFloat(formQuantity) * (parseFloat(t) || 0))); }} placeholder="0" keyboardType="decimal-pad" placeholderTextColor={colors.gray600} />
                </View>
              </View>
              <Text style={styles.label}>Total Cost (₹)</Text>
              <TextInput style={styles.input} value={formTotalCost} onChangeText={setFormTotalCost} placeholder="0" keyboardType="decimal-pad" placeholderTextColor={colors.gray600} />
              <Text style={styles.label}>Odometer (km) *</Text>
              <TextInput style={styles.input} value={formOdometer} onChangeText={setFormOdometer} placeholder="0" keyboardType="number-pad" placeholderTextColor={colors.gray600} />
              <Text style={styles.label}>Fuel Station</Text>
              <TextInput style={styles.input} value={formFuelStation} onChangeText={setFormFuelStation} placeholder="Optional" placeholderTextColor={colors.gray600} />
              <Text style={styles.label}>Fuel Type</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.formChipRow}>
                {FUEL_TYPES.map((ft) => (
                  <TouchableOpacity key={ft} style={[styles.formChip, formFuelType === ft && styles.formChipActive]} onPress={() => setFormFuelType(ft)}>
                    <Text style={[styles.formChipText, formFuelType === ft && styles.formChipTextActive]}>{ft}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <Text style={styles.label}>Payment Method</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.formChipRow}>
                {PAYMENT_METHODS.map((pm) => (
                  <TouchableOpacity key={pm} style={[styles.formChip, formPaymentMethod === pm && styles.formChipActive]} onPress={() => setFormPaymentMethod(pm)}>
                    <Text style={[styles.formChipText, formPaymentMethod === pm && styles.formChipTextActive]}>{pm}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.modalBtnSecondary} onPress={() => { setShowRecordForm(false); setShowDatePicker(false); }}>
                  <Text style={styles.modalBtnSecondaryText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.modalBtnPrimary, saving && styles.btnDisabled]} onPress={handleSaveRecord} disabled={saving}>
                  {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.modalBtnPrimaryText}>Save</Text>}
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Delete confirm */}
      <Modal visible={!!confirmDeleteId} transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Delete Fuel Record</Text>
            <Text style={styles.modalSubtext}>This cannot be undone.</Text>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalBtnSecondary} onPress={() => setConfirmDeleteId(null)}>
                <Text style={styles.modalBtnSecondaryText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalBtnDanger} onPress={() => confirmDeleteId && handleDeleteRecord(confirmDeleteId)}>
                <Text style={styles.modalBtnPrimaryText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.gray50 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: colors.gray200 },
  backBtn: { padding: 4, marginRight: 8 },
  title: { flex: 1, fontSize: 18, fontWeight: '700', color: colors.foreground },
  addBtn: { padding: 4 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { flex: 1 },
  scrollContent: { padding: 16 },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: colors.gray600, marginBottom: 10 },
  pricesRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  priceCard: { flex: 1, padding: 12, borderRadius: 10 },
  priceLabel: { fontSize: 12, color: colors.gray600, marginBottom: 4 },
  priceValue: { fontSize: 16, fontWeight: '700', color: colors.foreground },
  priceHint: { fontSize: 10, color: colors.gray600, marginTop: 4 },
  statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  statCard: { flex: 1, minWidth: 80, backgroundColor: '#fff', padding: 12, borderRadius: 10, ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3 }, android: { elevation: 2 } }) },
  statLabel: { fontSize: 11, color: colors.gray600, marginBottom: 4 },
  statValue: { fontSize: 14, fontWeight: '700', color: colors.foreground },
  searchInput: { height: 40, backgroundColor: '#fff', borderRadius: 8, paddingHorizontal: 12, fontSize: 15, color: colors.foreground, marginBottom: 10, borderWidth: 1, borderColor: colors.gray200 },
  chipRow: { flexGrow: 0, marginBottom: 10 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#fff', marginRight: 8, borderWidth: 1, borderColor: colors.gray200 },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 13, fontWeight: '600', color: colors.foreground },
  chipTextActive: { color: '#fff' },
  dateRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  dateBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.gray200 },
  dateBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  dateBtnText: { fontSize: 13, fontWeight: '600', color: colors.foreground },
  dateBtnTextActive: { color: '#fff' },
  dateRangeRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  dateRangeField: { flex: 1 },
  dateRangeLabel: { fontSize: 12, fontWeight: '600', color: colors.gray600, marginBottom: 4 },
  dateRangeInput: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', borderWidth: 1, borderColor: colors.gray200, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10 },
  dateRangeValue: { fontSize: 14, fontWeight: '600', color: colors.foreground },
  recordCard: { backgroundColor: '#fff', padding: 14, borderRadius: 12, marginBottom: 10, ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4 }, android: { elevation: 3 } }) },
  recordRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  recordDate: { fontSize: 16, fontWeight: '600', color: colors.foreground },
  fuelBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  fuelBadgeText: { fontSize: 11, fontWeight: '600', color: colors.foreground },
  recordVehicle: { fontSize: 13, color: colors.gray600, marginTop: 4 },
  recordMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 8 },
  recordMetaText: { fontSize: 12, color: colors.foreground },
  recordActions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  recordActionBtn: { padding: 8 },
  empty: { alignItems: 'center', paddingVertical: 32 },
  emptyText: { fontSize: 15, color: colors.gray600, marginTop: 12 },
  emptyAddBtn: { marginTop: 12, paddingHorizontal: 20, paddingVertical: 10, backgroundColor: colors.primary, borderRadius: 8 },
  emptyAddBtnText: { fontSize: 14, fontWeight: '600', color: '#fff' },
  errorText: { fontSize: 15, color: colors.gray600, marginTop: 12, textAlign: 'center' },
  retryBtn: { marginTop: 16, paddingVertical: 10, paddingHorizontal: 20, backgroundColor: colors.primary, borderRadius: 8 },
  retryBtnText: { fontSize: 14, fontWeight: '600', color: '#fff' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 },
  modalScroll: { flex: 1 },
  modalScrollContent: { flexGrow: 1, justifyContent: 'center' },
  modalContent: { backgroundColor: '#fff', borderRadius: 16, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: colors.foreground, marginBottom: 16 },
  modalSubtext: { fontSize: 14, color: colors.gray600, marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', color: colors.gray600, marginBottom: 6 },
  input: { backgroundColor: colors.gray50, borderWidth: 1, borderColor: colors.gray200, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: colors.foreground, marginBottom: 12 },
  inputText: { fontSize: 15, color: colors.foreground },
  dateDoneBtn: { marginTop: 8, padding: 8, alignItems: 'flex-end' },
  dateDoneText: { color: colors.primary, fontWeight: '600' },
  formRow: { flexDirection: 'row', gap: 12 },
  formHalf: { flex: 1 },
  formChipRow: { flexGrow: 0, marginBottom: 12 },
  formChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.gray100, marginRight: 8, marginBottom: 6 },
  formChipActive: { backgroundColor: colors.primary },
  formChipText: { fontSize: 13, fontWeight: '600', color: colors.foreground },
  formChipTextActive: { color: '#fff' },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 16 },
  modalBtnSecondary: { flex: 1, paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: colors.gray200, alignItems: 'center' },
  modalBtnSecondaryText: { fontSize: 15, fontWeight: '600', color: colors.foreground },
  modalBtnPrimary: { flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: colors.primary, alignItems: 'center' },
  modalBtnPrimaryText: { fontSize: 15, fontWeight: '600', color: '#fff' },
  modalBtnDanger: { flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: '#dc2626', alignItems: 'center' },
  btnDisabled: { opacity: 0.7 },
});
