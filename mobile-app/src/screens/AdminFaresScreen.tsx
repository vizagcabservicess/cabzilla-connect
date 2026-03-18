/**
 * Admin Fares - dynamic fare display with native edit (matches web FareManagement)
 * Fetches from same APIs as web: direct-outstation-fares, direct-local-fares, direct-airport-fares, tours.php
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
import {
  getOutstationFares,
  getLocalPackageFares,
  getAirportFares,
  updateOutstationFare,
  updateAirportFare,
  updateLocalFare,
  type OutstationFare,
  type LocalPackageMatrix,
  type LocalFareExtras,
  type AirportFare,
} from '../services/fareService';
import { API_BASE_URL, WEB_APP_BASE_URL } from '../config';
import { authAPI } from '../services/authAPI';
import { tourAPI, type TourInfo } from '../services/tourAPI';
import { adminTourAPI } from '../services/adminTourAPI';
import { EditVehicleTypeModal } from '../components/EditVehicleTypeModal';

const TRIP_TYPES = ['outstation', 'local', 'airport', 'tours'] as const;

function formatAmount(n: number): string {
  return `₹${n.toLocaleString('en-IN')}`;
}

function OutstationFareCard({
  vehicleId,
  fare,
  onEdit,
  onEditVehicleDetails,
}: {
  vehicleId: string;
  fare: OutstationFare;
  onEdit?: (vehicleId: string, fare: OutstationFare) => void;
  onEditVehicleDetails?: (vehicleId: string) => void;
}) {
  const name = vehicleId.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  return (
    <View style={localStyles.vehicleCard}>
      <View style={localStyles.cardRow}>
        <Text style={localStyles.vehicleName}>{name}</Text>
        <View style={localStyles.cardActions}>
          {onEditVehicleDetails && (
            <TouchableOpacity onPress={() => onEditVehicleDetails(vehicleId)} style={localStyles.editIcon} accessibilityLabel="Vehicle details">
              <Ionicons name="settings-outline" size={20} color={colors.gray600} />
            </TouchableOpacity>
          )}
          {onEdit && (
            <TouchableOpacity onPress={() => onEdit(vehicleId, fare)} style={localStyles.editIcon}>
              <Ionicons name="create-outline" size={20} color={colors.primary} />
            </TouchableOpacity>
          )}
        </View>
      </View>
      <View style={localStyles.fareGrid}>
        <Text style={localStyles.fareItem}>Base: {formatAmount(fare.basePrice)}</Text>
        <Text style={localStyles.fareItem}>Per km: ₹{fare.pricePerKm}</Text>
        {(fare.tier1Price ?? 0) > 0 && (
          <Text style={localStyles.fareItem}>T1(35–50km): {formatAmount(fare.tier1Price ?? 0)}</Text>
        )}
        {(fare.tier2Price ?? 0) > 0 && (
          <Text style={localStyles.fareItem}>T2(51–75km): {formatAmount(fare.tier2Price ?? 0)}</Text>
        )}
        {(fare.tier3Price ?? 0) > 0 && (
          <Text style={localStyles.fareItem}>T3(76–100km): {formatAmount(fare.tier3Price ?? 0)}</Text>
        )}
        {(fare.tier4Price ?? 0) > 0 && (
          <Text style={localStyles.fareItem}>T4(101–149km): {formatAmount(fare.tier4Price ?? 0)}</Text>
        )}
      </View>
    </View>
  );
}

/** Local fare card per vehicle (matches web app - one card per vehicle with package prices and edit) */
function LocalFareCard({
  vehicleId,
  matrix,
  extras,
  onEdit,
  onEditVehicleDetails,
}: {
  vehicleId: string;
  matrix: LocalPackageMatrix;
  extras?: LocalFareExtras;
  onEdit?: (vehicleId: string, p8: number, p10: number, p4: number, extraKm?: number, extraHour?: number) => void;
  onEditVehicleDetails?: (vehicleId: string) => void;
}) {
  const name = vehicleId.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  const p8 = matrix['8hrs-80km']?.[vehicleId] ?? 0;
  const p10 = matrix['10hrs-100km']?.[vehicleId] ?? 0;
  const p4 = matrix['4hrs-40km']?.[vehicleId] ?? 0;
  const ex = extras?.[vehicleId];
  const extraKm = ex?.extraKm ?? 0;
  const extraHour = ex?.extraHour ?? 0;
  if (p8 === 0 && p10 === 0 && p4 === 0) return null;
  return (
    <View style={localStyles.vehicleCard}>
      <View style={localStyles.cardRow}>
        <Text style={localStyles.vehicleName}>{name}</Text>
        <View style={localStyles.cardActions}>
          {onEditVehicleDetails && (
            <TouchableOpacity onPress={() => onEditVehicleDetails(vehicleId)} style={localStyles.editIcon} accessibilityLabel="Vehicle details">
              <Ionicons name="settings-outline" size={20} color={colors.gray600} />
            </TouchableOpacity>
          )}
          {onEdit && (
            <TouchableOpacity onPress={() => onEdit(vehicleId, p8, p10, p4, extraKm || undefined, extraHour || undefined)} style={localStyles.editIcon}>
              <Ionicons name="create-outline" size={20} color={colors.primary} />
            </TouchableOpacity>
          )}
        </View>
      </View>
      <View style={localStyles.fareGrid}>
        {p8 > 0 && (
          <Text style={localStyles.fareItem}>8hrs-80km: {formatAmount(p8)}</Text>
        )}
        {p10 > 0 && (
          <Text style={localStyles.fareItem}>10hrs-100km: {formatAmount(p10)}</Text>
        )}
        {p4 > 0 && (
          <Text style={localStyles.fareItem}>4hrs-40km: {formatAmount(p4)}</Text>
        )}
        {(extraKm > 0 || extraHour > 0) && (
          <Text style={localStyles.fareItem}>Extra: ₹{extraKm}/km, ₹{extraHour}/hr</Text>
        )}
      </View>
    </View>
  );
}

function AirportFareCard({
  vehicleId,
  fare,
  onEdit,
  onEditVehicleDetails,
}: {
  vehicleId: string;
  fare: AirportFare;
  onEdit?: (vehicleId: string, fare: AirportFare) => void;
  onEditVehicleDetails?: (vehicleId: string) => void;
}) {
  const name = vehicleId.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  return (
    <View style={localStyles.vehicleCard}>
      <View style={localStyles.cardRow}>
        <Text style={localStyles.vehicleName}>{name}</Text>
        <View style={localStyles.cardActions}>
          {onEditVehicleDetails && (
            <TouchableOpacity onPress={() => onEditVehicleDetails(vehicleId)} style={localStyles.editIcon} accessibilityLabel="Vehicle details">
              <Ionicons name="settings-outline" size={20} color={colors.gray600} />
            </TouchableOpacity>
          )}
          {onEdit && (
            <TouchableOpacity onPress={() => onEdit(vehicleId, fare)} style={localStyles.editIcon}>
              <Ionicons name="create-outline" size={20} color={colors.primary} />
            </TouchableOpacity>
          )}
        </View>
      </View>
      <View style={localStyles.fareGrid}>
        {(fare.tier1Price ?? fare.pickupPrice ?? 0) > 0 && (
          <Text style={localStyles.fareItem}>≤10km: {formatAmount(fare.tier1Price ?? fare.pickupPrice ?? 0)}</Text>
        )}
        {(fare.tier2Price ?? 0) > 0 && (
          <Text style={localStyles.fareItem}>≤20km: {formatAmount(fare.tier2Price ?? 0)}</Text>
        )}
        {(fare.tier3Price ?? 0) > 0 && (
          <Text style={localStyles.fareItem}>≤30km: {formatAmount(fare.tier3Price ?? 0)}</Text>
        )}
        {(fare.tier4Price ?? 0) > 0 && (
          <Text style={localStyles.fareItem}>≤40km: {formatAmount(fare.tier4Price ?? 0)}</Text>
        )}
        {(fare.extraKmCharge ?? fare.pricePerKm ?? 0) > 0 && (
          <Text style={localStyles.fareItem}>Extra/km: ₹{fare.extraKmCharge ?? fare.pricePerKm}</Text>
        )}
      </View>
    </View>
  );
}

function TourFareCard({ tour, onEdit }: { tour: TourInfo; onEdit?: (tour: TourInfo) => void }) {
  const prices = tour.pricing ? Object.values(tour.pricing).filter((p) => typeof p === 'number' && p > 0) : [];
  const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
  const daysStr = tour.days ? `${tour.days} day${tour.days > 1 ? 's' : ''}` : '';
  const distStr = tour.distance ? `${tour.distance} km` : '';
  const meta = [daysStr, distStr].filter(Boolean).join(' · ');
  return (
    <View style={localStyles.vehicleCard}>
      <View style={localStyles.cardRow}>
        <Text style={localStyles.vehicleName}>{tour.name}</Text>
        {onEdit && (
          <TouchableOpacity onPress={() => onEdit(tour)} style={localStyles.editIcon}>
            <Ionicons name="create-outline" size={20} color={colors.primary} />
          </TouchableOpacity>
        )}
      </View>
      {meta ? <Text style={localStyles.tourMeta}>{meta}</Text> : null}
      {minPrice > 0 && (
        <Text style={localStyles.tourPrice}>Starting from {formatAmount(minPrice)}</Text>
      )}
    </View>
  );
}

function NumInput({
  label,
  value,
  onChange,
  style,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  style?: object;
}) {
  return (
    <View style={[modalInputStyles.inputRow, style]}>
      <Text style={modalInputStyles.inputLabel}>{label}</Text>
      <TextInput
        style={modalInputStyles.input}
        value={value}
        onChangeText={onChange}
        keyboardType="numeric"
        placeholder="0"
      />
    </View>
  );
}

type EditModalState =
  | { type: 'outstation'; vehicleId: string; fare: OutstationFare }
  | { type: 'local'; vehicleId: string; p8: number; p10: number; p4: number; extraKm?: number; extraHour?: number }
  | { type: 'airport'; vehicleId: string; fare: AirportFare }
  | { type: 'tours'; tour: TourInfo }
  | null;

function EditFareModal({
  editModal,
  saving,
  onClose,
  onSaveOutstation,
  onSaveLocal,
  onSaveAirport,
  onSaveTour,
}: {
  editModal: EditModalState;
  saving: boolean;
  onClose: () => void;
  onSaveOutstation: (vehicleId: string, data: Partial<OutstationFare>) => Promise<void>;
  onSaveLocal?: (vehicleId: string, data: { package8hrs80km: number; package10hrs100km: number; package4hrs40km: number; priceExtraKm?: number; priceExtraHour?: number }) => Promise<void>;
  onSaveAirport: (vehicleId: string, data: Partial<AirportFare>) => Promise<void>;
  onSaveTour: (tourId: string, pricing: Record<string, number>) => Promise<void>;
}) {
  const [basePrice, setBasePrice] = useState('');
  const [pricePerKm, setPricePerKm] = useState('');
  const [roundTripBasePrice, setRoundTripBasePrice] = useState('');
  const [roundTripPricePerKm, setRoundTripPricePerKm] = useState('');
  const [tier1, setTier1] = useState('');
  const [tier2, setTier2] = useState('');
  const [tier3, setTier3] = useState('');
  const [tier4, setTier4] = useState('');
  const [extraKm, setExtraKm] = useState('');
  const [extraHour, setExtraHour] = useState('');
  const [driverAllowance, setDriverAllowance] = useState('');
  const [nightHalt, setNightHalt] = useState('');
  const [p8, setP8] = useState('');
  const [p10, setP10] = useState('');
  const [p4, setP4] = useState('');
  const [tourPricing, setTourPricing] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!editModal) return;
    if (editModal.type === 'outstation') {
      setBasePrice(String(editModal.fare.basePrice ?? ''));
      setPricePerKm(String(editModal.fare.pricePerKm ?? ''));
      setRoundTripBasePrice(String(editModal.fare.roundTripBasePrice ?? (editModal.fare.basePrice != null ? Math.round(editModal.fare.basePrice * 0.9) : '')));
      setRoundTripPricePerKm(String(editModal.fare.roundTripPricePerKm ?? (editModal.fare.pricePerKm != null ? Math.round(editModal.fare.pricePerKm * 0.85 * 100) / 100 : '')));
      setTier1(String(editModal.fare.tier1Price ?? ''));
      setTier2(String(editModal.fare.tier2Price ?? ''));
      setTier3(String(editModal.fare.tier3Price ?? ''));
      setTier4(String(editModal.fare.tier4Price ?? ''));
      setExtraKm(String(editModal.fare.extraKmCharge ?? editModal.fare.pricePerKm ?? ''));
      setDriverAllowance(String(editModal.fare.driverAllowance ?? ''));
      setNightHalt(String(editModal.fare.nightHaltCharge ?? ''));
    } else if (editModal.type === 'airport') {
      setTier1(String(editModal.fare.tier1Price ?? editModal.fare.pickupPrice ?? ''));
      setTier2(String(editModal.fare.tier2Price ?? ''));
      setTier3(String(editModal.fare.tier3Price ?? ''));
      setTier4(String(editModal.fare.tier4Price ?? ''));
      setExtraKm(String(editModal.fare.extraKmCharge ?? editModal.fare.pricePerKm ?? ''));
    } else if (editModal.type === 'local') {
      setP8(String(editModal.p8));
      setP10(String(editModal.p10));
      setP4(String(editModal.p4));
      const v = editModal.vehicleId.toLowerCase();
      const defKm = v.includes('tempo') ? 22 : v.includes('innova') ? 20 : 15;
      const defHr = v.includes('tempo') ? 400 : v.includes('innova') ? 350 : 250;
      setExtraKm(String(editModal.extraKm != null ? editModal.extraKm : defKm));
      setExtraHour(String(editModal.extraHour != null ? editModal.extraHour : defHr));
    } else {
      const p: Record<string, string> = {};
      for (const [k, v] of Object.entries(editModal.tour.pricing ?? {})) {
        p[k] = String(v ?? '');
      }
      setTourPricing(p);
    }
  }, [editModal]);

  const handleSave = async () => {
    if (!editModal) return;
    if (editModal.type === 'outstation') {
      await onSaveOutstation(editModal.vehicleId, {
        basePrice: Number(basePrice) || 0,
        pricePerKm: Number(pricePerKm) || 0,
        roundTripBasePrice: Number(roundTripBasePrice) || 0,
        roundTripPricePerKm: Number(roundTripPricePerKm) || 0,
        tier1Price: Number(tier1) || 0,
        tier2Price: Number(tier2) || 0,
        tier3Price: Number(tier3) || 0,
        tier4Price: Number(tier4) || 0,
        extraKmCharge: Number(extraKm) || 0,
        driverAllowance: Number(driverAllowance) || 250,
        nightHaltCharge: Number(nightHalt) || 700,
      });
    } else if (editModal.type === 'airport') {
      await onSaveAirport(editModal.vehicleId, {
        tier1Price: Number(tier1) || 0,
        tier2Price: Number(tier2) || 0,
        tier3Price: Number(tier3) || 0,
        tier4Price: Number(tier4) || 0,
        extraKmCharge: Number(extraKm) || 0,
      });
    } else if (editModal.type === 'local' && onSaveLocal) {
      await onSaveLocal(editModal.vehicleId, {
        package8hrs80km: Number(p8) || 0,
        package10hrs100km: Number(p10) || 0,
        package4hrs40km: Number(p4) || 0,
        priceExtraKm: Number(extraKm) || undefined,
        priceExtraHour: Number(extraHour) || undefined,
      });
    } else if (editModal.type === 'tours') {
      const pricing: Record<string, number> = {};
      for (const [k, v] of Object.entries(tourPricing)) {
        const n = Number(v);
        if (!Number.isNaN(n) && n >= 0) pricing[k] = n;
      }
      await onSaveTour(editModal.tour.id, pricing);
    }
  };

  if (!editModal) return null;

  const title =
    editModal.type === 'outstation' || editModal.type === 'airport' || editModal.type === 'local'
      ? `Edit ${editModal.vehicleId.replace(/_/g, ' ')}`
      : `Edit ${editModal.tour.name}`;

  return (
    <Modal visible animationType="slide" transparent>
      <View style={modalStyles.overlay}>
        <View style={modalStyles.content}>
          <View style={modalStyles.header}>
            <Text style={modalStyles.title}>{title}</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={colors.foreground} />
            </TouchableOpacity>
          </View>
          <ScrollView style={modalStyles.body} keyboardShouldPersistTaps="handled">
            {editModal.type === 'outstation' && (
              <>
                <NumInput label="Base ₹ (one-way)" value={basePrice} onChange={setBasePrice} />
                <NumInput label="Per km ₹ (one-way)" value={pricePerKm} onChange={setPricePerKm} />
                <NumInput label="Round-trip Base ₹" value={roundTripBasePrice} onChange={setRoundTripBasePrice} />
                <NumInput label="Round-trip Per km ₹" value={roundTripPricePerKm} onChange={setRoundTripPricePerKm} />
                <NumInput label="T1 (35-50km) ₹" value={tier1} onChange={setTier1} />
                <NumInput label="T2 (51-75km) ₹" value={tier2} onChange={setTier2} />
                <NumInput label="T3 (76-100km) ₹" value={tier3} onChange={setTier3} />
                <NumInput label="T4 (101-149km) ₹" value={tier4} onChange={setTier4} />
                <NumInput label="Extra/km ₹" value={extraKm} onChange={setExtraKm} />
                <NumInput label="Driver Allowance ₹" value={driverAllowance} onChange={setDriverAllowance} />
                <NumInput label="Night Halt ₹" value={nightHalt} onChange={setNightHalt} />
              </>
            )}
            {editModal.type === 'airport' && (
              <>
                <NumInput label="≤10km ₹" value={tier1} onChange={setTier1} />
                <NumInput label="≤20km ₹" value={tier2} onChange={setTier2} />
                <NumInput label="≤30km ₹" value={tier3} onChange={setTier3} />
                <NumInput label="≤40km ₹" value={tier4} onChange={setTier4} />
                <NumInput label="Extra/km ₹" value={extraKm} onChange={setExtraKm} />
              </>
            )}
            {editModal.type === 'local' && (
              <>
                <NumInput label="8hrs-80km ₹" value={p8} onChange={setP8} />
                <NumInput label="10hrs-100km ₹" value={p10} onChange={setP10} />
                <NumInput label="4hrs-40km ₹" value={p4} onChange={setP4} />
                <NumInput label="Extra/km ₹" value={extraKm} onChange={setExtraKm} />
                <NumInput label="Extra/hour ₹" value={extraHour} onChange={setExtraHour} />
              </>
            )}
            {editModal.type === 'tours' && (
              <>
                {Object.entries(tourPricing).map(([vehicleId, val]) => (
                  <NumInput
                    key={vehicleId}
                    label={`${vehicleId.replace(/_/g, ' ')} ₹`}
                    value={val}
                    onChange={(v) => setTourPricing((p) => ({ ...p, [vehicleId]: v }))}
                  />
                ))}
              </>
            )}
          </ScrollView>
          <View style={modalStyles.footer}>
            <TouchableOpacity style={modalStyles.cancelBtn} onPress={onClose}>
              <Text style={modalStyles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[modalStyles.saveBtn, saving && modalStyles.saveBtnDisabled]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={modalStyles.saveText}>Save</Text>
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
    maxHeight: '80%',
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

const modalInputStyles = StyleSheet.create({
  inputRow: { marginBottom: 12 },
  inputLabel: { fontSize: 14, fontWeight: '600', color: colors.foreground, marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderColor: colors.gray200,
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
    color: colors.foreground,
  },
});

export function AdminFaresScreen() {
  const navigation = useNavigation<any>();
  const [tripType, setTripType] = useState<'outstation' | 'local' | 'airport' | 'tours'>('outstation');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [outstationFares, setOutstationFares] = useState<Record<string, OutstationFare>>({});
  const [localMatrix, setLocalMatrix] = useState<LocalPackageMatrix | null>(null);
  const [localExtras, setLocalExtras] = useState<LocalFareExtras>({});
  const [airportFares, setAirportFares] = useState<Record<string, AirportFare>>({});
  const [tours, setTours] = useState<TourInfo[]>([]);
  const [editModal, setEditModal] = useState<EditModalState>(null);
  const [saving, setSaving] = useState(false);
  const [vehicleTypeModal, setVehicleTypeModal] = useState<{ vehicleId: string; vehicleName?: string } | null>(null);

  const load = async () => {
    const currentTab = tripType;
    setLoading(true);
    try {
      if (currentTab === 'outstation') {
        const f = await getOutstationFares();
        if (currentTab === tripType) {
          setOutstationFares(f);
          setLocalMatrix(null);
          setLocalExtras({});
          setAirportFares({});
          setTours([]);
        }
      } else if (currentTab === 'local') {
        const { matrix, extras } = await getLocalPackageFares();
        if (currentTab === tripType) {
          setLocalMatrix(matrix);
          setLocalExtras(extras);
          setOutstationFares({});
          setAirportFares({});
          setTours([]);
        }
      } else if (currentTab === 'airport') {
        const a = await getAirportFares();
        if (currentTab === tripType) {
          setAirportFares(a);
          setOutstationFares({});
          setLocalMatrix(null);
          setLocalExtras({});
          setTours([]);
        }
      } else {
        const t = await tourAPI.getAvailableTours();
        if (currentTab === tripType) {
          setTours(t);
          setOutstationFares({});
          setLocalMatrix(null);
          setLocalExtras({});
          setAirportFares({});
        }
      }
    } catch {
      if (currentTab === tripType) {
        setOutstationFares({});
        setLocalMatrix(null);
        setLocalExtras({});
        setAirportFares({});
        setTours([]);
      }
    } finally {
      if (currentTab === tripType) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  };

  useEffect(() => {
    load();
  }, [tripType]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const handleEditOutstation = (vehicleId: string, fare: OutstationFare) => {
    setEditModal({ type: 'outstation', vehicleId, fare });
  };
  const handleEditLocal = (vehicleId: string, p8: number, p10: number, p4: number, extraKm?: number, extraHour?: number) => {
    setEditModal({ type: 'local', vehicleId, p8, p10, p4, extraKm, extraHour });
  };
  const handleEditAirport = (vehicleId: string, fare: AirportFare) => {
    setEditModal({ type: 'airport', vehicleId, fare });
  };
  const handleEditTour = (tour: TourInfo) => {
    setEditModal({ type: 'tours', tour });
  };
  const handleEditVehicleDetails = (vehicleId: string, vehicleName?: string) => {
    setVehicleTypeModal({ vehicleId, vehicleName });
  };

  const hasOutstation = Object.keys(outstationFares).length > 0;
  const hasLocal = localMatrix && (Object.keys(localMatrix['8hrs-80km'] || {}).length > 0 || Object.keys(localMatrix['10hrs-100km'] || {}).length > 0);
  const hasAirport = Object.keys(airportFares).length > 0;
  const hasTours = tours.length > 0;

  const runApiTest = async () => {
    const base = API_BASE_URL || WEB_APP_BASE_URL || 'https://www.vizagtaxihub.com';
    const url = `${base.replace(/\/$/, '')}/api/admin/outstation-fares-update.php`;
    const token = await authAPI.getStoredToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Admin-Mode': 'true',
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({ vehicleId: 'sedan', basePrice: 4200, pricePerKm: 14 }),
        cache: 'no-store',
      });
      const text = await res.text();
      const preview = text.slice(0, 300);
      Alert.alert(
        'API Test',
        `URL: ${url}\nStatus: ${res.status}\nAuth: ${token ? 'yes' : 'no'}\n\nResponse: ${preview}${text.length > 300 ? '...' : ''}`
      );
    } catch (e) {
      Alert.alert('API Test Error', String(e));
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={styles.title}>Fares</Text>
        {__DEV__ && (
          <TouchableOpacity onPress={runApiTest} style={styles.backBtn}>
            <Ionicons name="information-circle-outline" size={22} color={colors.gray600} />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.tabs}>
        {TRIP_TYPES.map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.tab, tripType === t && styles.tabActive]}
            onPress={() => setTripType(t)}
          >
            <Text style={[styles.tabText, tripType === t && styles.tabTextActive]}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {tripType === 'outstation' && hasOutstation ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Outstation Fares (API)</Text>
              <Text style={localStyles.subtitle}>Fetched from outstation-fares-update.php</Text>
              {Object.entries(outstationFares).map(([vid, fare]) => (
                <OutstationFareCard
                  key={vid}
                  vehicleId={vid}
                  fare={fare}
                  onEdit={handleEditOutstation}
                  onEditVehicleDetails={(id) => handleEditVehicleDetails(id, vid.replace(/_/g, ' '))}
                />
              ))}
            </View>
          ) : tripType === 'local' && hasLocal ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Local Package Fares (API)</Text>
              <Text style={localStyles.subtitle}>Fetched from direct-local-fares.php</Text>
              {localMatrix &&
                Object.keys(
                  Object.assign(
                    {},
                    localMatrix['8hrs-80km'] || {},
                    localMatrix['10hrs-100km'] || {},
                    localMatrix['4hrs-40km'] || {}
                  )
                )
                  .map((vehicleId) => (
                    <LocalFareCard
                      key={vehicleId}
                      vehicleId={vehicleId}
                      matrix={localMatrix!}
                      extras={localExtras}
                      onEdit={handleEditLocal}
                      onEditVehicleDetails={(id) => handleEditVehicleDetails(id, vehicleId.replace(/_/g, ' '))}
                    />
                  ))}
            </View>
          ) : tripType === 'airport' && hasAirport ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Airport Fares (API)</Text>
              <Text style={localStyles.subtitle}>Fetched from direct-airport-fares.php</Text>
              {Object.entries(airportFares).map(([vid, fare]) => (
                <AirportFareCard
                  key={vid}
                  vehicleId={vid}
                  fare={fare}
                  onEdit={handleEditAirport}
                  onEditVehicleDetails={(id) => handleEditVehicleDetails(id, vid.replace(/_/g, ' '))}
                />
              ))}
            </View>
          ) : tripType === 'tours' && hasTours ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Tours (API)</Text>
              <Text style={localStyles.subtitle}>Fetched from api/fares/tours.php</Text>
              {tours.map((tour) => (
                <TourFareCard key={tour.id} tour={tour} onEdit={handleEditTour} />
              ))}
            </View>
          ) : (
            <View style={styles.empty}>
              <Ionicons name="document-text-outline" size={48} color={colors.gray200} />
              <Text style={styles.emptyText}>No fare data available</Text>
              <Text style={localStyles.emptyHint}>Pull to refresh or check API connectivity</Text>
            </View>
          )}
          <View style={{ height: 32 }} />
        </ScrollView>
      )}

      <EditFareModal
        editModal={editModal}
        saving={saving}
        onClose={() => setEditModal(null)}
        onSaveLocal={async (vehicleId, data) => {
          setSaving(true);
          const res = await updateLocalFare(vehicleId, data);
          setSaving(false);
          if (res.success) {
            setEditModal(null);
            setLocalMatrix((prev) => {
              if (!prev) return prev;
              return {
                ...prev,
                '8hrs-80km': { ...(prev['8hrs-80km'] ?? {}), [vehicleId]: data.package8hrs80km ?? 0 },
                '10hrs-100km': { ...(prev['10hrs-100km'] ?? {}), [vehicleId]: data.package10hrs100km ?? 0 },
                '4hrs-40km': { ...(prev['4hrs-40km'] ?? {}), [vehicleId]: data.package4hrs40km ?? 0 },
              };
            });
            if (data.priceExtraKm != null || data.priceExtraHour != null) {
              setLocalExtras((prev) => ({
                ...prev,
                [vehicleId]: {
                  extraKm: data.priceExtraKm ?? prev[vehicleId]?.extraKm ?? 15,
                  extraHour: data.priceExtraHour ?? prev[vehicleId]?.extraHour ?? 250,
                },
              }));
            }
            // Refetch to verify persistence (matches outstation/airport behavior)
            load().then(() => {});
            Alert.alert('Success', 'Local fare updated');
          } else {
            Alert.alert('Error', res.message || 'Update failed');
          }
        }}
        onSaveOutstation={async (vehicleId, data) => {
          setSaving(true);
          const res = await updateOutstationFare(vehicleId, data);
          setSaving(false);
          if (res.success) {
            setEditModal(null);
            // Optimistic update - show saved values immediately
            setOutstationFares((prev) => {
              const current = prev[vehicleId] ?? {};
              return {
                ...prev,
                [vehicleId]: {
                  ...current,
                  basePrice: data.basePrice ?? current.basePrice,
                  pricePerKm: data.pricePerKm ?? current.pricePerKm,
                  roundTripBasePrice: data.roundTripBasePrice ?? current.roundTripBasePrice,
                  roundTripPricePerKm: data.roundTripPricePerKm ?? current.roundTripPricePerKm,
                  tier1Price: data.tier1Price ?? current.tier1Price,
                  tier2Price: data.tier2Price ?? current.tier2Price,
                  tier3Price: data.tier3Price ?? current.tier3Price,
                  tier4Price: data.tier4Price ?? current.tier4Price,
                  extraKmCharge: data.extraKmCharge ?? current.extraKmCharge,
                  driverAllowance: data.driverAllowance ?? current.driverAllowance,
                  nightHaltCharge: data.nightHaltCharge ?? current.nightHaltCharge,
                },
              };
            });
            load().then(() => {});
            Alert.alert('Success', 'Outstation fare updated');
          } else {
            Alert.alert('Error', res.message || 'Update failed');
          }
        }}
        onSaveAirport={async (vehicleId, data) => {
          setSaving(true);
          const res = await updateAirportFare(vehicleId, data);
          setSaving(false);
          if (res.success) {
            setEditModal(null);
            setAirportFares((prev) => {
              const current = prev[vehicleId] ?? {};
              return {
                ...prev,
                [vehicleId]: { ...current, ...data },
              };
            });
            load().then(() => {});
            Alert.alert('Success', 'Airport fare updated');
          } else {
            Alert.alert('Error', res.message || 'Update failed');
          }
        }}
        onSaveTour={async (tourId, pricing) => {
          setSaving(true);
          try {
            const res = await adminTourAPI.updateTour({ tourId, pricing });
            setSaving(false);
            if (res.success) {
              setEditModal(null);
              load();
              Alert.alert('Success', 'Tour fares updated');
            } else {
              Alert.alert('Error', res.message || 'Update failed');
            }
          } catch (e) {
            setSaving(false);
            Alert.alert('Error', e instanceof Error ? e.message : 'Update failed. Admin login required.');
          }
        }}
      />

      <EditVehicleTypeModal
        visible={!!vehicleTypeModal}
        vehicleId={vehicleTypeModal?.vehicleId ?? ''}
        vehicleName={vehicleTypeModal?.vehicleName}
        onClose={() => setVehicleTypeModal(null)}
        onSaved={() => load()}
      />
    </SafeAreaView>
  );
}

const localStyles = StyleSheet.create({
  subtitle: { fontSize: 12, color: colors.gray600, marginBottom: 12 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: colors.foreground, marginBottom: 8 },
  cardRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardActions: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  editIcon: { padding: 4 },
  vehicleCard: {
    backgroundColor: colors.gray50,
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  vehicleName: { fontSize: 14, fontWeight: '700', color: colors.foreground },
  inputRow: { marginBottom: 12 },
  inputLabel: { fontSize: 14, fontWeight: '600', color: colors.foreground, marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderColor: colors.gray200,
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
    color: colors.foreground,
  },
  fareGrid: { gap: 4 },
  fareItem: { fontSize: 13, color: colors.foreground },
  fareValue: { fontSize: 13, fontWeight: '600', color: colors.primary },
  pkgBlock: { marginBottom: 12 },
  pkgLabel: { fontSize: 13, fontWeight: '600', color: colors.gray600, marginBottom: 4 },
  pkgRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2 },
  moreText: { fontSize: 12, color: colors.gray600, marginTop: 4 },
  emptyHint: { fontSize: 12, color: colors.gray600, marginTop: 8 },
  tourMeta: { fontSize: 12, color: colors.gray600, marginBottom: 4 },
  tourPrice: { fontSize: 14, fontWeight: '600', color: colors.primary },
});

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
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  editBtnText: { fontSize: 13, fontWeight: '600', color: colors.primary },
  tabs: { flexDirection: 'row', backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 8, gap: 8 },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: colors.gray100,
  },
  tabActive: { backgroundColor: colors.primary },
  tabText: { fontSize: 13, fontWeight: '600', color: colors.gray600 },
  tabTextActive: { color: '#fff' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { flex: 1 },
  scrollContent: { padding: 16 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4 },
      android: { elevation: 3 },
    }),
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: colors.foreground, marginBottom: 8 },
  empty: { alignItems: 'center', paddingVertical: 48 },
  emptyText: { fontSize: 15, color: colors.gray600, marginTop: 12 },
});
