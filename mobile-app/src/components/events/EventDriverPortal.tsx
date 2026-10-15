import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  AppState,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import * as ImagePicker from 'expo-image-picker';
import { EventDriverDutyView } from './EventDriverDutyView';
import { deliverDutyAlerts } from '../../lib/eventDutyLocationTask';
import { ensureEventDutyAlertChannel, getPushToken } from '../../services/pushNotificationService';
import { compressImageForUpload } from '../../utils/compressImageForUpload';
import { keepFilled, parseDocumentOcr, dutyStatusLabel, formatReportingTime, formatServerTime } from '../../lib/eventDutyFormat';
import {
  formatDutyDate,
  formatDutyDateRange,
  mobileEventAPI,
  type DriverDuty,
  type DriverPortalData,
  type DutyNotice,
  type UploadPart,
} from '../../services/eventDutyAPI';
import { fonts } from '../../theme/colors';

const LOGO = 'https://www.vizagtaxihub.com/uploads/vizagtaxihub-logo.png';

type PhotoKey = 'driver_photo' | 'dl_front' | 'dl_back' | 'aadhaar' | 'aadhaar_back' | 'rc' | 'rc_back' | 'insurance' | 'insurance_back';

function pickDuty(duties: DriverDuty[]): DriverDuty | null {
  return duties.find((duty) => duty.status === 'in_progress') || duties[0] || null;
}

function applyNotices(data: DriverPortalData, notices: DutyNotice[]): DriverPortalData {
  const byId = new Map(notices.map((notice) => [notice.id, notice]));
  return {
    ...data,
    duties: data.duties.map((duty) => {
      const notice = byId.get(duty.id);
      if (!notice) return duty;
      return {
        ...duty,
        status: notice.status || duty.status,
        closingAt: notice.closingAt,
        endRequestedAt: notice.endRequestedAt,
        endRequestSeenAt: notice.endRequestSeenAt,
        endRequestNonce: notice.endRequestNonce,
        pausedSeconds: notice.pausedSeconds ?? duty.pausedSeconds,
        dutyPlace: notice.dutyPlace === 'parking' ? 'parking' : (notice.dutyPlace === 'trip' ? 'trip' : duty.dutyPlace),
        parkingPromptAt: notice.parkingPromptAt,
        parkingPromptNonce: notice.parkingPromptNonce,
      };
    }),
  };
}

function openDutyKey(data: DriverPortalData | null): string {
  if (!data) return '';
  return data.duties
    .filter((duty) => duty.openingAt && !duty.closingAt && duty.status === 'in_progress')
    .map((duty) => duty.id)
    .join(',');
}

async function captureUpload(source: 'camera' | 'library'): Promise<UploadPart | null> {
  if (source === 'camera') {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Camera', 'Allow camera access to take a photo.');
      return null;
    }
  }
  const result = source === 'camera'
    ? await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, quality: 0.85 })
    : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, quality: 0.85 });
  if (result.canceled || !result.assets[0]) return null;
  const uri = await compressImageForUpload(result.assets[0].uri);
  return { uri, name: `${source}-${Date.now()}.jpg`, type: 'image/jpeg' };
}

export function EventDriverPortal({
  token,
  onOpenDuties,
}: {
  token: string;
  onOpenDuties: (dutyIds: number[]) => void;
}) {
  const [data, setData] = useState<DriverPortalData | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [registeredOk, setRegisteredOk] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [listOpen, setListOpen] = useState(false);
  const dataRef = useRef<DriverPortalData | null>(null);
  dataRef.current = data;

  const load = useCallback(async (initial = false) => {
    if (initial) setLoading(true);
    try {
      const next = await mobileEventAPI.driverBootstrap(token);
      setData(next);
      setError('');
      setSelectedId((current) => (current && next.duties.some((duty) => duty.id === current) ? current : pickDuty(next.duties)?.id ?? null));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not open the duty';
      if (dataRef.current) Alert.alert('Duty', message);
      else setError(message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { void load(true); }, [load]);

  useEffect(() => {
    if (Platform.OS === 'web' || !token) return;
    let cancelled = false;
    const registerPhone = () => {
      void ensureEventDutyAlertChannel()
        .then(() => getPushToken())
        .then((push) => {
          if (!push || cancelled) return;
          return mobileEventAPI.registerExpoPush(token, push);
        })
        .catch(() => undefined);
    };
    registerPhone();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') registerPhone();
    });
    return () => {
      cancelled = true;
      sub.remove();
    };
  }, [token]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void load(false);
      if (state === 'background' || state === 'inactive') {
        void mobileEventAPI.driverNotices(token).then((notices) => deliverDutyAlerts(token, notices)).catch(() => undefined);
      }
    });
    return () => sub.remove();
  }, [load, token]);

  const watching = Boolean(data?.duties.some((duty) => duty.status === 'in_progress' && !duty.closingAt));
  useEffect(() => {
    if (!watching || Platform.OS === 'web') return;
    void Notifications.requestPermissionsAsync().catch(() => undefined);
  }, [watching]);
  useEffect(() => {
    if (!token || !watching) return;
    let cancelled = false;
    const pull = () => {
      void mobileEventAPI.driverNotices(token).then((notices) => {
        if (cancelled) return;
        void deliverDutyAlerts(token, notices);
        setData((prev) => {
          if (!prev) return prev;
          const finished = notices.some((notice) => {
            const before = prev.duties.find((duty) => duty.id === notice.id);
            return Boolean(before && !before.closingAt && notice.closingAt);
          });
          if (finished) queueMicrotask(() => { void load(false); });
          return applyNotices(prev, notices);
        });
      }).catch(() => undefined);
    };
    pull();
    const id = setInterval(pull, 10000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [token, watching, load]);

  const idsKey = openDutyKey(data);
  const loaded = Boolean(data);
  useEffect(() => {
    if (!loaded) return;
    const ids = idsKey ? idsKey.split(',').map(Number).filter((id) => id > 0) : [];
    onOpenDuties(ids);
  }, [loaded, idsKey, onOpenDuties]);

  const onParked = useCallback((dutyId: number) => {
    setData((prev) => prev ? {
      ...prev,
      duties: prev.duties.map((duty) => (
        duty.id === dutyId ? { ...duty, dutyPlace: 'parking', parkingPromptNonce: null } : duty
      )),
    } : prev);
  }, []);

  const onSeen = useCallback((dutyId: number) => {
    setData((prev) => prev ? {
      ...prev,
      duties: prev.duties.map((duty) => (
        duty.id === dutyId && !duty.endRequestSeenAt ? { ...duty, endRequestSeenAt: new Date().toISOString() } : duty
      )),
    } : prev);
  }, []);

  if (loading && !data) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#2563eb" /></View>;
  }
  if (error && !data) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{error}</Text>
        <TouchableOpacity style={styles.retry} onPress={() => { void load(true); }}>
          <Text style={styles.retryText}>Try again</Text>
        </TouchableOpacity>
      </View>
    );
  }
  if (!data) return null;

  if (!data.registered && !registeredOk) {
    return (
      <RegisterForm
        data={data}
        token={token}
        onDone={async () => {
          setRegisteredOk(true);
          Alert.alert('Registration', 'Registration submitted successfully.');
          await load(false);
        }}
      />
    );
  }

  const duty = data.duties.find((row) => row.id === selectedId) || pickDuty(data.duties);
  if (!duty) {
    return <View style={styles.center}><Text style={styles.empty}>No duties assigned yet.</Text></View>;
  }

  if (data.duties.length > 1 && listOpen) {
    return (
      <ScrollView contentContainerStyle={styles.list}>
        <Text style={styles.listTitle}>MY DUTIES</Text>
        {data.duties.map((row) => (
          <TouchableOpacity key={row.id} style={styles.dutyCard} onPress={() => { setSelectedId(row.id); setListOpen(false); }}>
            <View style={styles.dutyTop}>
              <Text style={styles.dutyDate}>{formatDutyDate(row.dutyDate)}</Text>
              <Text style={styles.badge}>{dutyStatusLabel(row.status)}</Text>
            </View>
            <Text style={styles.dutyMeta}>{row.vehicleNumber || data.assignment.vehicleNumber || 'Vehicle pending'}</Text>
            {row.status === 'in_progress' && row.endRequestedAt && !row.closingAt ? (
              <Text style={styles.dutyWarn}>Please end this duty. Time after {formatServerTime(row.endRequestedAt)} is not counted.</Text>
            ) : null}
            {row.status === 'in_progress' && row.openingAt && !row.closingAt && row.dutyPlace !== 'parking' && row.parkingPromptNonce ? (
              <Text style={styles.dutyWarn}>When you drop the guest, tap In Parking.</Text>
            ) : null}
          </TouchableOpacity>
        ))}
      </ScrollView>
    );
  }

  return (
    <EventDriverDutyView
      data={data}
      token={token}
      duty={duty}
      manyDuties={data.duties.length > 1}
      onBackToList={() => setListOpen(true)}
      onReload={() => load(false)}
      onParked={onParked}
      onSeen={onSeen}
    />
  );
}

function RegisterForm({
  data, token, onDone,
}: {
  data: DriverPortalData;
  token: string;
  onDone: () => Promise<void> | void;
}) {
  const [name, setName] = useState(data.assignment.driverName || '');
  const [mobile, setMobile] = useState(data.assignment.driverMobile || '');
  const [dl, setDl] = useState(data.assignment.licenseNo || '');
  const [aadhaar, setAadhaar] = useState('');
  const [files, setFiles] = useState<Partial<Record<PhotoKey, UploadPart>>>({});
  const [reading, setReading] = useState('');
  const [busy, setBusy] = useState(false);

  const setPhoto = async (key: PhotoKey, source: 'camera' | 'library', kind?: 'dl' | 'aadhaar') => {
    const file = await captureUpload(source);
    if (!file) return;
    setFiles((prev) => ({ ...prev, [key]: file }));
    if (!kind) return;
    setReading(kind === 'dl' ? 'Reading the licence…' : 'Reading the Aadhaar…');
    try {
      const res = await mobileEventAPI.driverOcr(token, file);
      const fields = parseDocumentOcr(kind, res.text || '');
      setName((value) => keepFilled(value, fields.fullName));
      if (kind === 'dl') {
        setDl((value) => keepFilled(value, fields.licenseNumber));
        setMobile((value) => keepFilled(value, fields.mobile));
        if (fields.fullName || fields.licenseNumber) Alert.alert('Licence', 'Details filled from the licence photo');
      } else {
        setAadhaar((value) => keepFilled(value, fields.aadhaarNumber));
        if (fields.fullName || fields.aadhaarNumber) Alert.alert('Aadhaar', 'Details filled from the Aadhaar photo');
      }
    } catch {
      /* the driver can still type the details */
    } finally {
      setReading('');
    }
  };

  const submit = async () => {
    let phone = mobile.replace(/\D+/g, '');
    if (phone.length === 12 && phone.startsWith('91')) phone = phone.slice(2);
    if (phone.length === 11 && phone.startsWith('0')) phone = phone.slice(1);
    if (!name.trim() || !/^[6-9]\d{9}$/.test(phone) || dl.trim().length < 8 || !/^\d{12}$/.test(aadhaar.replace(/\D+/g, ''))) {
      Alert.alert('Registration', 'Full name, mobile, driving licence and Aadhaar are required.');
      return;
    }
    setBusy(true);
    try {
      await mobileEventAPI.driverRegister(token, {
        fullName: name.trim(),
        mobile: phone,
        licenseNumber: dl.trim().toUpperCase(),
        aadhaarNumber: aadhaar.replace(/\D+/g, ''),
      }, files);
      await onDone();
    } catch (err) {
      Alert.alert('Registration', err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
        <Image source={{ uri: LOGO }} style={styles.logo} resizeMode="contain" accessibilityLabel="Vizag Taxi Hub" />
        <View style={styles.profile}>
          <View style={styles.avatar}><Text style={styles.avatarText}>{(name || 'D').slice(0, 1).toUpperCase()}</Text></View>
          <View style={styles.flex}>
            <Text style={styles.name} numberOfLines={1}>{name || 'Driver'}</Text>
            <Text style={styles.meta}>{mobile || 'Mobile not added yet'}</Text>
          </View>
        </View>
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>Driver Registration</Text>
          <Info label="Event" value={data.event.name} />
          <Info label="Assigned vehicle" value={data.assignment.vehicleTypeLabel} />
          <Info label="Vehicle number" value={data.assignment.vehicleNumber || 'Will be confirmed by VTH'} />
          <Info label="Pickup location" value={data.assignment.reportingLocation || data.event.reportingLocation || 'Will be confirmed by VTH'} />
          <Info label="Reporting time" value={formatReportingTime(data.assignment.reportingTime || data.event.defaultReportingTime) || 'Will be confirmed by VTH'} />
          <Info label="Duty dates" value={formatDutyDateRange(data.assignment.dates)} />
          <Field label="Full name" value={name} onChangeText={setName} />
          <Field label="Mobile number" value={mobile} onChangeText={setMobile} keyboardType="phone-pad" />
          <Field label="DL number" value={dl} onChangeText={(value) => setDl(value.toUpperCase())} autoCapitalize="characters" />
          <Field label="Aadhaar number" value={aadhaar} onChangeText={setAadhaar} keyboardType="number-pad" />
          {reading ? <Text style={styles.reading}>{reading}</Text> : null}
          <PhotoField label="Driver photo" file={files.driver_photo} onPick={(source) => { void setPhoto('driver_photo', source); }} />
          <PhotoField label="DL front" file={files.dl_front} onPick={(source) => { void setPhoto('dl_front', source, 'dl'); }} />
          <PhotoField label="DL back (optional)" file={files.dl_back} onPick={(source) => { void setPhoto('dl_back', source); }} />
          <PhotoField label="Aadhaar front" file={files.aadhaar} onPick={(source) => { void setPhoto('aadhaar', source, 'aadhaar'); }} />
          <PhotoField label="Aadhaar back (optional)" file={files.aadhaar_back} onPick={(source) => { void setPhoto('aadhaar_back', source); }} />
          {data.needVehicleDocuments ? (
            <>
              <Text style={styles.section}>Vehicle documents (not yet on file)</Text>
              <PhotoField label="RC front" file={files.rc} onPick={(source) => { void setPhoto('rc', source); }} />
              <PhotoField label="RC back (optional)" file={files.rc_back} onPick={(source) => { void setPhoto('rc_back', source); }} />
              <PhotoField label="Insurance front" file={files.insurance} onPick={(source) => { void setPhoto('insurance', source); }} />
              <PhotoField label="Insurance back (optional)" file={files.insurance_back} onPick={(source) => { void setPhoto('insurance_back', source); }} />
            </>
          ) : null}
          <TouchableOpacity style={styles.submit} disabled={busy} onPress={() => { void submit(); }}>
            {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Submit registration</Text>}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.info}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function Field({
  label, value, onChangeText, keyboardType, autoCapitalize,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  keyboardType?: 'default' | 'phone-pad' | 'number-pad';
  autoCapitalize?: 'none' | 'characters';
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        style={styles.input}
        placeholderTextColor="#94a3b8"
      />
    </View>
  );
}

function PhotoField({
  label, file, onPick,
}: {
  label: string;
  file?: UploadPart;
  onPick: (source: 'camera' | 'library') => void;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.photoRow}>
        <TouchableOpacity style={styles.photoPrimary} onPress={() => onPick('camera')}>
          <Ionicons name="camera-outline" size={16} color="#fff" />
          <Text style={styles.photoPrimaryText}>Take photo</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.photoSecondary} onPress={() => onPick('library')}>
          <Ionicons name="image-outline" size={16} color="#0f172a" />
          <Text style={styles.photoSecondaryText}>Choose file</Text>
        </TouchableOpacity>
      </View>
      {file ? <Image source={{ uri: file.uri }} style={styles.thumb} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#f8fafc' },
  error: { color: '#b91c1c', textAlign: 'center', fontFamily: fonts.regular, fontSize: 15 },
  empty: { color: '#64748b', fontFamily: fonts.regular, fontSize: 15 },
  retry: { marginTop: 14, backgroundColor: '#2563eb', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10 },
  retryText: { color: '#fff', fontFamily: fonts.semiBold },
  list: { padding: 16, gap: 10 },
  listTitle: { fontFamily: fonts.bold, fontSize: 20, color: '#0f172a', marginBottom: 4 },
  dutyCard: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0', padding: 14 },
  dutyTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  dutyDate: { fontFamily: fonts.semiBold, color: '#0f172a', fontSize: 16 },
  badge: { color: '#1d4ed8', backgroundColor: '#eff6ff', overflow: 'hidden', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3, fontFamily: fonts.semiBold, fontSize: 12 },
  dutyMeta: { marginTop: 4, color: '#64748b', fontFamily: fonts.regular },
  dutyWarn: { marginTop: 8, backgroundColor: '#f59e0b', color: '#fff', borderRadius: 8, overflow: 'hidden', paddingHorizontal: 8, paddingVertical: 6, fontFamily: fonts.semiBold, fontSize: 12 },
  form: { padding: 16, gap: 12, backgroundColor: '#f8fafc' },
  logo: { width: 140, height: 42, alignSelf: 'center' },
  profile: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#e2e8f0', padding: 12 },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#dbeafe', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: fonts.bold, color: '#1d4ed8', fontSize: 20 },
  name: { fontFamily: fonts.semiBold, color: '#0f172a', fontSize: 16 },
  meta: { color: '#64748b', fontFamily: fonts.regular, marginTop: 2 },
  formCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, gap: 10 },
  formTitle: { fontFamily: fonts.bold, fontSize: 18, color: '#0f172a' },
  info: { marginTop: 2 },
  infoLabel: { color: '#64748b', fontFamily: fonts.regular, fontSize: 12 },
  infoValue: { color: '#0f172a', fontFamily: fonts.medium, fontSize: 14 },
  field: { marginTop: 4 },
  fieldLabel: { color: '#334155', fontFamily: fonts.medium, fontSize: 13, marginBottom: 6 },
  input: { height: 48, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, paddingHorizontal: 12, fontFamily: fonts.regular, fontSize: 16, color: '#0f172a' },
  reading: { color: '#2563eb', fontFamily: fonts.regular, fontSize: 12 },
  section: { marginTop: 6, fontFamily: fonts.semiBold, color: '#0f172a' },
  photoRow: { flexDirection: 'row', gap: 8 },
  photoPrimary: { flex: 1, height: 44, borderRadius: 10, backgroundColor: '#2563eb', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  photoPrimaryText: { color: '#fff', fontFamily: fonts.semiBold, fontSize: 13 },
  photoSecondary: { flex: 1, height: 44, borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  photoSecondaryText: { color: '#0f172a', fontFamily: fonts.semiBold, fontSize: 13 },
  thumb: { marginTop: 8, width: 72, height: 72, borderRadius: 8 },
  submit: { marginTop: 8, height: 48, borderRadius: 12, backgroundColor: '#2563eb', alignItems: 'center', justifyContent: 'center' },
  submitText: { color: '#fff', fontFamily: fonts.bold, fontSize: 16 },
});
