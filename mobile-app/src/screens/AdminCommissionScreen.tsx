/**
 * Admin Commission - dynamic commission management matching web CommissionManagement
 * Settings tab: CRUD default commission settings
 * Payments tab: list payments, vehicle/status filters, mark paid/pending/cancelled
 */
import React, { useState, useEffect, useCallback } from 'react';
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
  FlatList,
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
  const num = Number(n);
  if (Number.isNaN(num) || !Number.isFinite(num)) return '₹0.00';
  return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
}

function formatPercent(val: unknown): string {
  const n = typeof val === 'number' && !Number.isNaN(val) ? val : parseFloat(String(val ?? 0)) || 0;
  return n.toFixed(1);
}

/** Safely get numeric amount from payment, supports snake_case and camelCase. Handles strings with commas. */
function getPaymentAmount(p: Record<string, unknown>, key: 'total_amount' | 'commission_amount'): number {
  const camel = key === 'total_amount' ? 'totalAmount' : 'commissionAmount';
  const raw = p[key] ?? p[camel];
  if (raw == null) return 0;
  const str = String(raw).replace(/,/g, '');
  const num = parseFloat(str);
  return Number.isNaN(num) || !Number.isFinite(num) ? 0 : num;
}

type CommissionSetting = {
  id: string | number;
  name: string;
  description?: string;
  default_percentage?: number;
  defaultPercentage?: number;
  is_active?: boolean;
  isActive?: boolean;
};

type CommissionPayment = {
  id: string | number;
  booking_id?: number;
  booking_number?: string;
  vehicle_id?: number | string;
  total_amount: number;
  commission_amount: number;
  commission_percentage?: number | string;
  status: string;
  vehicle_name?: string;
  vehicle_number?: string;
};

const TAB_OPTIONS = ['settings', 'payments'] as const;
const STATUS_OPTIONS = ['all', 'pending', 'paid', 'cancelled'] as const;

export function AdminCommissionScreen() {
  const navigation = useNavigation<any>();
  const [activeTab, setActiveTab] = useState<(typeof TAB_OPTIONS)[number]>('settings');

  // Settings state
  const [settings, setSettings] = useState<CommissionSetting[]>([]);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [showSettingsForm, setShowSettingsForm] = useState(false);
  const [editingSetting, setEditingSetting] = useState<CommissionSetting | null>(null);
  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formPct, setFormPct] = useState('10');
  const [formActive, setFormActive] = useState(true);
  const [savingSetting, setSavingSetting] = useState(false);

  // Payments state
  const [vehicles, setVehicles] = useState<AdminFleetVehicle[]>([]);
  const [vehicleId, setVehicleId] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateRangeType, setDateRangeType] = useState<'all' | 'today' | 'week' | 'month' | 'year' | 'custom'>('all');
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  const selectDateRange = () => {
    setDateRangeType('custom');
    if (!startDate) setStartDate(subDays(new Date(), 30));
    if (!endDate) setEndDate(new Date());
  };

  const getEffectiveDateRange = (): { start_date?: string; end_date?: string } => {
    if (dateRangeType === 'all') return {};
    const today = new Date();
    if (dateRangeType === 'today') {
      const d = format(today, 'yyyy-MM-dd');
      return { start_date: d, end_date: d };
    }
    if (dateRangeType === 'week') {
      return { start_date: format(subDays(today, 7), 'yyyy-MM-dd'), end_date: format(today, 'yyyy-MM-dd') };
    }
    if (dateRangeType === 'month') {
      return {
        start_date: format(new Date(today.getFullYear(), today.getMonth(), 1), 'yyyy-MM-dd'),
        end_date: format(today, 'yyyy-MM-dd'),
      };
    }
    if (dateRangeType === 'year') {
      return {
        start_date: format(new Date(today.getFullYear(), 0, 1), 'yyyy-MM-dd'),
        end_date: format(today, 'yyyy-MM-dd'),
      };
    }
    if (dateRangeType === 'custom' && startDate && endDate) {
      return { start_date: format(startDate, 'yyyy-MM-dd'), end_date: format(endDate, 'yyyy-MM-dd') };
    }
    return {};
  };
  const [payments, setPayments] = useState<CommissionPayment[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [updatingPaymentId, setUpdatingPaymentId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showEditCommissionModal, setShowEditCommissionModal] = useState(false);
  const [editingPayment, setEditingPayment] = useState<CommissionPayment | null>(null);
  const [editCommissionPct, setEditCommissionPct] = useState('');
  const [editCommissionAmount, setEditCommissionAmount] = useState('');
  const [savingCommissionEdit, setSavingCommissionEdit] = useState(false);

  const loadSettings = useCallback(async () => {
    try {
      const list = await adminExtendedAPI.commissionSettings();
      setSettings(Array.isArray(list) ? list : []);
    } catch {
      setSettings([]);
    } finally {
      setSettingsLoading(false);
    }
  }, []);

  const loadVehicles = useCallback(async () => {
    try {
      const list = await adminAPI.getFleetVehicles(true);
      const arr = Array.isArray(list) ? list : [];
      setVehicles(arr);
      setVehicleId((prev) => {
        if (prev && arr.length > 0 && !arr.some((v) => String(v.id) === prev)) return String(arr[0].id);
        return prev;
      });
    } catch {
      setVehicles([]);
    }
  }, []);

  const loadPayments = useCallback(async () => {
    setPaymentsLoading(true);
    try {
      const params: { vehicle_id?: number; status?: 'pending' | 'paid' | 'cancelled'; start_date?: string; end_date?: string; limit?: number; offset?: number } = {
        limit: 500,
        offset: 0,
      };
      if (vehicleId) {
        const vid = Number(vehicleId);
        if (!Number.isNaN(vid)) params.vehicle_id = vid;
      }
      if (statusFilter !== 'all') params.status = statusFilter as 'pending' | 'paid' | 'cancelled';
      const range = getEffectiveDateRange();
      if (range.start_date) params.start_date = range.start_date;
      if (range.end_date) params.end_date = range.end_date;
      const res = await adminExtendedAPI.commissionGetPayments(params);
      const raw = res?.payments ?? [];
      const normalized = Array.isArray(raw)
        ? raw.map((p: Record<string, unknown>) => ({
            id: (p.id ?? 0) as string | number,
            status: String(p.status ?? 'pending'),
            ...p,
            total_amount: getPaymentAmount(p, 'total_amount'),
            commission_amount: getPaymentAmount(p, 'commission_amount'),
          })) as CommissionPayment[]
        : [];
      setPayments(normalized);
    } catch {
      setPayments([]);
    } finally {
      setPaymentsLoading(false);
    }
  }, [vehicleId, statusFilter, dateRangeType, startDate, endDate]);

  useFocusEffect(
    useCallback(() => {
      loadSettings();
      loadVehicles();
    }, [loadSettings, loadVehicles])
  );

  useEffect(() => {
    if (activeTab === 'payments') loadPayments();
  }, [activeTab, loadPayments]);

  const onRefresh = () => {
    setRefreshing(true);
    loadSettings().then(() => setRefreshing(false));
    if (activeTab === 'payments') loadPayments().then(() => setRefreshing(false));
  };

  const totalSales = React.useMemo(() => {
    const arr = Array.isArray(payments) ? payments : [];
    const sum = arr.reduce((s, p) => s + getPaymentAmount(p as Record<string, unknown>, 'total_amount'), 0);
    return Number.isFinite(sum) ? sum : 0;
  }, [payments]);

  const totalCommission = React.useMemo(() => {
    const arr = Array.isArray(payments) ? payments : [];
    const sum = arr.reduce((s, p) => s + getPaymentAmount(p as Record<string, unknown>, 'commission_amount'), 0);
    return Number.isFinite(sum) ? sum : 0;
  }, [payments]);

  const openAddSetting = () => {
    setEditingSetting(null);
    setFormName('Default Commission');
    setFormDesc('Default commission percentage for fleet vehicles');
    setFormPct('10');
    setFormActive(true);
    setShowSettingsForm(true);
  };

  const openEditSetting = (s: CommissionSetting) => {
    setEditingSetting(s);
    setFormName(String(s.name ?? ''));
    setFormDesc(String(s.description ?? ''));
    setFormPct(String(s.default_percentage ?? s.defaultPercentage ?? 10));
    setFormActive(s.is_active ?? s.isActive ?? true);
    setShowSettingsForm(true);
  };

  const handleSaveSetting = async () => {
    const pct = parseFloat(formPct);
    if (isNaN(pct) || pct < 0 || pct > 100) {
      Alert.alert('Validation', 'Percentage must be between 0 and 100');
      return;
    }
    setSavingSetting(true);
    try {
      if (editingSetting?.id != null) {
        await adminExtendedAPI.commissionUpdateSetting(String(editingSetting.id), {
          name: formName.trim() || 'Default Commission',
          description: formDesc.trim(),
          default_percentage: pct,
          is_active: formActive,
        });
        Alert.alert('Success', 'Commission setting updated');
      } else {
        await adminExtendedAPI.commissionCreateSetting({
          name: formName.trim() || 'Default Commission',
          description: formDesc.trim(),
          default_percentage: pct,
          is_active: formActive,
        });
        Alert.alert('Success', 'Commission setting created');
      }
      setShowSettingsForm(false);
      loadSettings();
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSavingSetting(false);
    }
  };

  const handleDeleteSetting = (s: CommissionSetting) => {
    Alert.alert(
      'Delete Setting',
      `Delete "${s.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await adminExtendedAPI.commissionDeleteSetting(String(s.id));
              loadSettings();
            } catch (e) {
              Alert.alert('Error', e instanceof Error ? e.message : 'Failed to delete');
            }
          },
        },
      ]
    );
  };

  const handlePaymentStatusChange = async (id: string | number, status: 'pending' | 'paid' | 'cancelled') => {
    setUpdatingPaymentId(String(id));
    try {
      await adminExtendedAPI.commissionUpdatePayment(String(id), { status });
      loadPayments();
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to update');
    } finally {
      setUpdatingPaymentId(null);
    }
  };

  const openEditCommission = (p: CommissionPayment) => {
    setEditingPayment(p);
    setEditCommissionPct(String(formatPercent(p.commission_percentage)));
    setEditCommissionAmount(String(p.commission_amount ?? ''));
    setShowEditCommissionModal(true);
  };

  const handleSaveCommissionEdit = async () => {
    if (!editingPayment?.id) return;
    const pct = parseFloat(editCommissionPct);
    const amt = parseFloat(editCommissionAmount);
    if (isNaN(pct) || pct < 0 || pct > 100) {
      Alert.alert('Validation', 'Percentage must be between 0 and 100');
      return;
    }
    if (isNaN(amt) || amt < 0) {
      Alert.alert('Validation', 'Commission amount must be a valid positive number');
      return;
    }
    setSavingCommissionEdit(true);
    try {
      await adminExtendedAPI.commissionUpdatePayment(String(editingPayment.id), {
        commission_percentage: pct,
        commission_amount: amt,
      });
      setShowEditCommissionModal(false);
      loadPayments();
      Alert.alert('Success', 'Commission updated');
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to update commission');
    } finally {
      setSavingCommissionEdit(false);
    }
  };

  const getStatusColor = (s: string) => {
    switch (s) {
      case 'paid': return '#dcfce7';
      case 'pending': return '#fef9c3';
      case 'cancelled': return '#f3f4f6';
      default: return colors.gray200;
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={styles.title}>Commission</Text>
      </View>

      <View style={styles.tabRow}>
        {TAB_OPTIONS.map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.tab, activeTab === t && styles.tabActive]}
            onPress={() => setActiveTab(t)}
          >
            <Text style={[styles.tabText, activeTab === t && styles.tabTextActive]}>{t === 'settings' ? 'Settings' : 'Payments'}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {activeTab === 'settings' ? (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          <TouchableOpacity style={styles.addBtn} onPress={openAddSetting}>
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={styles.addBtnText}>Add Commission Setting</Text>
          </TouchableOpacity>

          {settingsLoading ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : settings.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="pricetag-outline" size={48} color={colors.gray400} />
              <Text style={styles.emptyText}>No commission settings. Add one above.</Text>
            </View>
          ) : (
            settings.map((s) => (
              <TouchableOpacity key={String(s.id)} style={styles.card} onPress={() => openEditSetting(s)} activeOpacity={0.7}>
                <View style={styles.iconWrap}>
                  <Ionicons name="pricetag-outline" size={24} color={colors.primary} />
                </View>
                <View style={styles.cardContent}>
                  <Text style={styles.cardTitle}>{String(s.name ?? 'Setting')}</Text>
                  <Text style={styles.cardSub}>{(s.default_percentage ?? s.defaultPercentage ?? 0)}% default</Text>
                  {(s.is_active ?? s.isActive) && (
                    <View style={[styles.badge, { backgroundColor: '#dcfce7' }]}>
                      <Text style={styles.badgeText}>Active</Text>
                    </View>
                  )}
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.gray400} />
              </TouchableOpacity>
            ))
          )}
          <View style={{ height: 40 }} />
        </ScrollView>
      ) : (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
          {/* Dashboard stats */}
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Total Sales</Text>
              <Text style={styles.statValue}>{formatAmount(totalSales)}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Commission</Text>
              <Text style={styles.statValue}>{formatAmount(totalCommission)}</Text>
            </View>
          </View>
          <View style={styles.statsRow}>
            <View style={[styles.statCard, styles.statCardCount]}>
              <Text style={styles.statLabel}>Paid</Text>
              <Text style={[styles.statValue, { color: '#16a34a' }]}>{payments.filter((p) => p.status === 'paid').length}</Text>
            </View>
            <View style={[styles.statCard, styles.statCardCount]}>
              <Text style={styles.statLabel}>Pending</Text>
              <Text style={[styles.statValue, { color: '#ca8a04' }]}>{payments.filter((p) => p.status === 'pending').length}</Text>
            </View>
            <View style={[styles.statCard, styles.statCardCount]}>
              <Text style={styles.statLabel}>Cancelled</Text>
              <Text style={[styles.statValue, { color: '#6b7280' }]}>{payments.filter((p) => p.status === 'cancelled').length}</Text>
            </View>
          </View>

          <View style={styles.filterRow}>
            <Text style={styles.filterLabel}>Vehicle</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
              <TouchableOpacity
                style={[styles.chip, !vehicleId && styles.chipActive]}
                onPress={() => setVehicleId('')}
              >
                <Text style={[styles.chipText, !vehicleId && styles.chipTextActive]}>All</Text>
              </TouchableOpacity>
              {vehicles.map((v) => (
                <TouchableOpacity
                  key={v.id}
                  style={[styles.chip, vehicleId === String(v.id) && styles.chipActive]}
                  onPress={() => setVehicleId(String(v.id))}
                >
                  <Text style={[styles.chipText, vehicleId === String(v.id) && styles.chipTextActive]}>
                    {v.vehicleNumber ?? v.name ?? v.id}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
          <View style={styles.filterRow}>
            <Text style={styles.filterLabel}>Status</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
              {STATUS_OPTIONS.map((s) => (
                <TouchableOpacity
                  key={s}
                  style={[styles.chip, statusFilter === s && styles.chipActive]}
                  onPress={() => setStatusFilter(s)}
                >
                  <Text style={[styles.chipText, statusFilter === s && styles.chipTextActive]}>{s === 'all' ? 'All' : s}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
          <View style={styles.filterRow}>
            <Text style={styles.filterLabel}>Date</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
              {(['all', 'today', 'week', 'month', 'year'] as const).map((d) => (
                <TouchableOpacity key={d} style={[styles.chip, dateRangeType === d && styles.chipActive]} onPress={() => setDateRangeType(d)}>
                  <Text style={[styles.chipText, dateRangeType === d && styles.chipTextActive]}>{d === 'all' ? 'All' : d.charAt(0).toUpperCase() + d.slice(1)}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity style={[styles.chip, dateRangeType === 'custom' && styles.chipActive]} onPress={selectDateRange}>
                <Text style={[styles.chipText, dateRangeType === 'custom' && styles.chipTextActive]}>Range</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
          {dateRangeType === 'custom' && (
            <View style={styles.dateRangeRow}>
              <View style={styles.dateRangeField}>
                <Text style={styles.dateRangeLabel}>From</Text>
                <TouchableOpacity style={styles.dateRangeInput} onPress={() => setShowStartPicker(true)}>
                  <Text style={styles.dateRangeValue}>{startDate ? format(startDate, 'dd MMM yyyy') : 'Select'}</Text>
                  <Ionicons name="calendar-outline" size={18} color={colors.gray600} />
                </TouchableOpacity>
              </View>
              <View style={styles.dateRangeField}>
                <Text style={styles.dateRangeLabel}>To</Text>
                <TouchableOpacity style={styles.dateRangeInput} onPress={() => setShowEndPicker(true)}>
                  <Text style={styles.dateRangeValue}>{endDate ? format(endDate, 'dd MMM yyyy') : 'Select'}</Text>
                  <Ionicons name="calendar-outline" size={18} color={colors.gray600} />
                </TouchableOpacity>
              </View>
            </View>
          )}
          {showStartPicker && (
            <>
              <DateTimePicker
                value={startDate ?? subDays(new Date(), 30)}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                maximumDate={endDate ?? new Date()}
                onChange={(_, d) => { if (d) setStartDate(d); if (Platform.OS === 'android') setShowStartPicker(false); }}
              />
              {Platform.OS === 'ios' && (
                <TouchableOpacity style={styles.dateDoneBtn} onPress={() => setShowStartPicker(false)}>
                  <Text style={styles.dateDoneText}>Done</Text>
                </TouchableOpacity>
              )}
            </>
          )}
          {showEndPicker && (
            <>
              <DateTimePicker
                value={endDate ?? new Date()}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                minimumDate={startDate}
                maximumDate={new Date()}
                onChange={(_, d) => { if (d) setEndDate(d); if (Platform.OS === 'android') setShowEndPicker(false); }}
              />
              {Platform.OS === 'ios' && (
                <TouchableOpacity style={styles.dateDoneBtn} onPress={() => setShowEndPicker(false)}>
                  <Text style={styles.dateDoneText}>Done</Text>
                </TouchableOpacity>
              )}
            </>
          )}

          {paymentsLoading ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : payments.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="wallet-outline" size={48} color={colors.gray400} />
              <Text style={styles.emptyText}>No commission payments found</Text>
            </View>
          ) : (
            payments.map((p) => (
              <TouchableOpacity
                key={String(p.id)}
                style={styles.paymentCard}
                onPress={() => {
                  const bid = p.booking_id ?? (p as { booking_id?: number }).booking_id;
                  if (bid != null) {
                    navigation.navigate('BookingDetail', {
                      booking: { id: bid },
                      source: 'admin',
                    });
                  }
                }}
                activeOpacity={0.7}
              >
                <View style={styles.paymentRow}>
                  <Text style={styles.paymentTitle}>{p.booking_number ?? `#${p.id}`}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(p.status) }]}>
                    <Text style={styles.statusText}>{p.status}</Text>
                  </View>
                </View>
                <Text style={styles.paymentSub}>
                  {[p.vehicle_number, p.vehicle_name].filter(Boolean).join(' • ') || `Vehicle ${p.vehicle_id ?? ''}`}
                </Text>
                <View style={styles.paymentAmounts}>
                  <Text style={styles.amountText}>Amount: {formatAmount(p.total_amount)}</Text>
                  <Text style={styles.commissionText}>Commission: {formatAmount(p.commission_amount)} ({formatPercent(p.commission_percentage)}%)</Text>
                </View>
                {p.status === 'pending' && (
                  <View style={styles.actionRow}>
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.actionBtnPaid]}
                      onPress={() => handlePaymentStatusChange(p.id, 'paid')}
                      disabled={updatingPaymentId === String(p.id)}
                    >
                      <Text style={styles.actionBtnText}>Mark Paid</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.actionBtnCancel]}
                      onPress={() => handlePaymentStatusChange(p.id, 'cancelled')}
                      disabled={updatingPaymentId === String(p.id)}
                    >
                      <Text style={styles.actionBtnText}>Cancel</Text>
                    </TouchableOpacity>
                  </View>
                )}
                {p.status === 'paid' && (
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.actionBtnPending]}
                    onPress={() => handlePaymentStatusChange(p.id, 'pending')}
                    disabled={updatingPaymentId === String(p.id)}
                  >
                    <Text style={styles.actionBtnText}>Mark Pending</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={styles.editCommissionBtn}
                  onPress={() => openEditCommission(p)}
                >
                  <Ionicons name="pencil-outline" size={16} color={colors.primary} />
                  <Text style={styles.editCommissionBtnText}>Edit Commission</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            ))
          )}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      <Modal visible={showSettingsForm} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{editingSetting ? 'Edit Setting' : 'Add Setting'}</Text>
            <TextInput
              style={styles.input}
              placeholder="Name"
              placeholderTextColor={colors.gray600}
              value={formName}
              onChangeText={setFormName}
            />
            <TextInput
              style={[styles.input, styles.inputMultiline]}
              placeholder="Description"
              placeholderTextColor={colors.gray600}
              value={formDesc}
              onChangeText={setFormDesc}
              multiline
            />
            <TextInput
              style={styles.input}
              placeholder="Default %"
              placeholderTextColor={colors.gray600}
              value={formPct}
              onChangeText={setFormPct}
              keyboardType="decimal-pad"
            />
            <TouchableOpacity style={styles.switchRow} onPress={() => setFormActive(!formActive)}>
              <Text style={styles.switchLabel}>Active</Text>
              <View style={[styles.switch, formActive && styles.switchOn]}>
                <View style={[styles.switchThumb, formActive && styles.switchThumbOn]} />
              </View>
            </TouchableOpacity>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalBtnSecondary} onPress={() => setShowSettingsForm(false)}>
                <Text style={styles.modalBtnSecondaryText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtnPrimary, savingSetting && styles.btnDisabled]} onPress={handleSaveSetting} disabled={savingSetting}>
                {savingSetting ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.modalBtnPrimaryText}>Save</Text>}
              </TouchableOpacity>
            </View>
            {editingSetting && (
              <TouchableOpacity style={styles.deleteSettingBtn} onPress={() => { setShowSettingsForm(false); handleDeleteSetting(editingSetting); }}>
                <Ionicons name="trash-outline" size={18} color="#dc2626" />
                <Text style={styles.deleteSettingText}>Delete</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>

      <Modal visible={showEditCommissionModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Commission</Text>
            <Text style={styles.modalSubtitle}>
              {editingPayment?.booking_number ?? `#${editingPayment?.id}`}
              {editingPayment ? ` • ${[editingPayment.vehicle_number, editingPayment.vehicle_name].filter(Boolean).join(' • ') || 'Vehicle'}` : ''}
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Commission %"
              placeholderTextColor={colors.gray600}
              value={editCommissionPct}
              onChangeText={setEditCommissionPct}
              keyboardType="decimal-pad"
            />
            <TextInput
              style={styles.input}
              placeholder="Commission amount (₹)"
              placeholderTextColor={colors.gray600}
              value={editCommissionAmount}
              onChangeText={setEditCommissionAmount}
              keyboardType="decimal-pad"
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalBtnSecondary} onPress={() => setShowEditCommissionModal(false)}>
                <Text style={styles.modalBtnSecondaryText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtnPrimary, savingCommissionEdit && styles.btnDisabled]}
                onPress={handleSaveCommissionEdit}
                disabled={savingCommissionEdit}
              >
                {savingCommissionEdit ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.modalBtnPrimaryText}>Save</Text>}
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
  title: { fontSize: 18, fontWeight: '700', color: colors.foreground },
  tabRow: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, gap: 8, backgroundColor: '#fff' },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center', backgroundColor: colors.gray100 },
  tabActive: { backgroundColor: colors.primary },
  tabText: { fontSize: 14, fontWeight: '600', color: colors.foreground },
  tabTextActive: { color: '#fff' },
  scroll: { flex: 1 },
  scrollContent: { padding: 16 },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 10,
    marginBottom: 16,
  },
  addBtnText: { fontSize: 15, fontWeight: '600', color: '#fff' },
  center: { paddingVertical: 32, alignItems: 'center' },
  empty: { alignItems: 'center', paddingVertical: 48 },
  emptyText: { fontSize: 15, color: colors.gray600, marginTop: 12, textAlign: 'center' },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4 }, android: { elevation: 3 } }),
  },
  iconWrap: { width: 44, height: 44, borderRadius: 10, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  cardContent: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: '600', color: colors.foreground },
  cardSub: { fontSize: 13, color: colors.gray600, marginTop: 2 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, alignSelf: 'flex-start', marginTop: 6 },
  badgeText: { fontSize: 11, fontWeight: '600', color: colors.foreground },
  statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  statCard: { flex: 1, minWidth: 100, backgroundColor: '#fff', padding: 12, borderRadius: 10, ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3 }, android: { elevation: 2 } }) },
  statCardCount: { minWidth: 70 },
  statLabel: { fontSize: 11, color: colors.gray600, marginBottom: 4 },
  statValue: { fontSize: 14, fontWeight: '700', color: colors.foreground },
  dateRangeRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  dateRangeField: { flex: 1 },
  dateRangeLabel: { fontSize: 12, fontWeight: '600', color: colors.gray600, marginBottom: 4 },
  dateRangeInput: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', borderWidth: 1, borderColor: colors.gray200, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10 },
  dateRangeValue: { fontSize: 14, fontWeight: '600', color: colors.foreground },
  dateDoneBtn: { marginTop: 8, padding: 8, alignItems: 'flex-end' },
  dateDoneText: { color: colors.primary, fontWeight: '600' },
  filterRow: { marginBottom: 12 },
  filterLabel: { fontSize: 12, fontWeight: '600', color: colors.gray600, marginBottom: 6 },
  chipScroll: { flexGrow: 0 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#fff', marginRight: 8, marginBottom: 6, borderWidth: 1, borderColor: colors.gray200 },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 13, fontWeight: '600', color: colors.foreground },
  chipTextActive: { color: '#fff' },
  dateRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  dateBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: colors.gray200 },
  dateBtnText: { fontSize: 14, color: colors.foreground },
  paymentCard: {
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4 }, android: { elevation: 3 } }),
  },
  paymentRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  paymentTitle: { fontSize: 16, fontWeight: '600', color: colors.foreground },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusText: { fontSize: 11, fontWeight: '600', color: colors.foreground },
  paymentSub: { fontSize: 13, color: colors.gray600, marginTop: 4 },
  paymentAmounts: { marginTop: 8 },
  amountText: { fontSize: 13, color: colors.foreground },
  commissionText: { fontSize: 13, color: colors.gray600, marginTop: 2 },
  actionRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  actionBtn: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8 },
  actionBtnText: { fontSize: 13, fontWeight: '600', color: '#fff' },
  actionBtnPaid: { backgroundColor: '#16a34a' },
  actionBtnCancel: { backgroundColor: '#dc2626' },
  actionBtnPending: { backgroundColor: '#ca8a04', marginTop: 12 },
  editCommissionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  editCommissionBtnText: { fontSize: 14, fontWeight: '600', color: colors.primary },
  editModalSub: { fontSize: 13, color: colors.gray600, marginBottom: 12 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 },
  modalContent: { backgroundColor: '#fff', borderRadius: 16, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: colors.foreground, marginBottom: 16 },
  modalSubtitle: { fontSize: 13, color: colors.gray600, marginBottom: 16 },
  input: { backgroundColor: colors.gray50, borderWidth: 1, borderColor: colors.gray200, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: colors.foreground, marginBottom: 12 },
  inputMultiline: { minHeight: 60 },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  switchLabel: { fontSize: 15, color: colors.foreground },
  switch: { width: 48, height: 28, borderRadius: 14, backgroundColor: colors.gray200, justifyContent: 'center', padding: 2 },
  switchOn: { backgroundColor: colors.primary },
  switchThumb: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#fff' },
  switchThumbOn: { alignSelf: 'flex-end' },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  modalBtnSecondary: { flex: 1, paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: colors.gray200, alignItems: 'center' },
  modalBtnSecondaryText: { fontSize: 15, fontWeight: '600', color: colors.foreground },
  modalBtnPrimary: { flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: colors.primary, alignItems: 'center' },
  modalBtnPrimaryText: { fontSize: 15, fontWeight: '600', color: '#fff' },
  btnDisabled: { opacity: 0.7 },
  deleteSettingBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 16, paddingVertical: 12 },
  deleteSettingText: { fontSize: 14, fontWeight: '600', color: '#dc2626' },
});
