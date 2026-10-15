import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { mobileEventAPI, type EventAssignmentRow, type EventFleetVehicle, type EventPerson, type UploadPart } from '../../services/eventDutyAPI';
import { colors, fonts } from '../../theme/colors';

export type EventFormMode = 'vehicle' | 'driver' | 'assignment' | 'bulk' | 'dates' | 'edit' | 'replace';

const VEHICLE_TYPES = ['sedan', 'innova', 'innova_crysta', 'ertiga', 'fortuner', 'mini_bus', 'tempo_traveller', 'urbania', 'other'];

type Props = {
  mode: EventFormMode | null;
  eventId: number;
  startDate?: string;
  endDate?: string;
  vehicles: EventFleetVehicle[];
  drivers: EventPerson[];
  assignment?: EventAssignmentRow | null;
  editingVehicle?: EventFleetVehicle | null;
  onClose: () => void;
  onSaved: (mode: EventFormMode) => void;
};

function datesBetween(start?: string, end?: string): string[] {
  if (!start || !end) return [];
  const out: string[] = [];
  const cursor = new Date(`${start}T00:00:00`);
  const last = new Date(`${end}T00:00:00`);
  if (Number.isNaN(cursor.getTime()) || Number.isNaN(last.getTime())) return [];
  while (cursor <= last && out.length < 40) {
    const month = String(cursor.getMonth() + 1).padStart(2, '0');
    const day = String(cursor.getDate()).padStart(2, '0');
    out.push(`${cursor.getFullYear()}-${month}-${day}`);
    cursor.setDate(cursor.getDate() + 1);
  }
  return out;
}

async function capturePhoto(source: 'camera' | 'library'): Promise<UploadPart | null> {
  if (source === 'camera') {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Camera', 'Allow camera access to take a photo.');
      return null;
    }
  }
  const options: ImagePicker.ImagePickerOptions = {
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    quality: 0.8,
  };
  const result = source === 'camera'
    ? await ImagePicker.launchCameraAsync(options)
    : await ImagePicker.launchImageLibraryAsync(options);
  if (result.canceled || !result.assets[0]) return null;
  const asset = result.assets[0];
  return { uri: asset.uri, name: 'upload.jpg', type: asset.mimeType || 'image/jpeg' };
}

export function EventCreateSheet({ mode, eventId, startDate, endDate, vehicles, drivers, assignment, editingVehicle, onClose, onSaved }: Props) {
  const [saving, setSaving] = useState(false);
  const [vehicleType, setVehicleType] = useState('innova_crysta');
  const [registration, setRegistration] = useState('');
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [capacity, setCapacity] = useState('7');
  const [owner, setOwner] = useState('');
  const [ownerMobile, setOwnerMobile] = useState('');
  const [rc, setRc] = useState<UploadPart | null>(null);
  const [insurance, setInsurance] = useState<UploadPart | null>(null);
  const [fullName, setFullName] = useState('');
  const [mobile, setMobile] = useState('');
  const [altMobile, setAltMobile] = useState('');
  const [license, setLicense] = useState('');
  const [aadhaar, setAadhaar] = useState('');
  const [photo, setPhoto] = useState<UploadPart | null>(null);
  const [dlFront, setDlFront] = useState<UploadPart | null>(null);
  const [dlBack, setDlBack] = useState<UploadPart | null>(null);
  const [aadhaarPhoto, setAadhaarPhoto] = useState<UploadPart | null>(null);
  const [aadhaarBack, setAadhaarBack] = useState<UploadPart | null>(null);
  const [vehicleId, setVehicleId] = useState<number | null>(null);
  const [driverId, setDriverId] = useState<number | null>(null);
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [quantity, setQuantity] = useState('1');
  const [passengers, setPassengers] = useState('');
  const [fromDate, setFromDate] = useState('');
  const eventDates = useMemo(() => datesBetween(startDate, endDate), [endDate, startDate]);

  useEffect(() => {
    if (!mode) return;
    if (mode === 'vehicle') {
      setRegistration(editingVehicle?.vehicleNumber || '');
      setVehicleType(editingVehicle?.vehicleType || 'innova_crysta');
      setMake(editingVehicle?.make && editingVehicle.make !== 'Unknown' ? editingVehicle.make : '');
      setModel(editingVehicle?.model || '');
      setCapacity(editingVehicle?.capacity != null ? String(editingVehicle.capacity) : '7');
      setOwner(editingVehicle?.ownerName || '');
      setOwnerMobile(editingVehicle?.ownerMobile || '');
      setRc(null);
      setInsurance(null);
      return;
    }
    setVehicleType(assignment?.vehicleType || 'innova_crysta');
    setVehicleId(assignment?.vehicleId ?? null);
    setDriverId(assignment?.driverId ?? null);
    setSelectedDates(assignment?.dates ? [...assignment.dates] : []);
    setFromDate(assignment?.dates?.[0] || startDate || '');
  }, [assignment, editingVehicle, mode, startDate]);

  const save = async () => {
    if (!mode) return;
    if (mode === 'vehicle' && !registration.trim()) {
      Alert.alert('Vehicle', 'Enter the registration number.');
      return;
    }
    if (mode === 'vehicle' && !editingVehicle && (!rc || !insurance)) {
      Alert.alert('Documents', 'Choose the RC photo and the insurance photo.');
      return;
    }
    if (mode === 'driver' && (!fullName.trim() || mobile.trim().length < 10)) {
      Alert.alert('Driver', 'Enter the full name and a mobile number.');
      return;
    }
    if ((mode === 'assignment' || mode === 'dates' || mode === 'edit' || mode === 'bulk') && selectedDates.length === 0) {
      Alert.alert('Dates', 'Choose at least one duty date.');
      return;
    }
    if (mode === 'replace' && !fromDate) {
      Alert.alert('Replace', 'Choose the date the new vehicle or driver starts.');
      return;
    }
    setSaving(true);
    try {
      if (mode === 'vehicle') {
        const fields = {
          registrationNumber: registration.trim().toUpperCase(),
          vehicleType,
          make: make.trim(),
          model: model.trim(),
          seatingCapacity: capacity.trim() || '7',
          ownerName: owner.trim(),
          ownerMobile: ownerMobile.trim(),
        };
        if (editingVehicle) {
          await mobileEventAPI.updateVehicle(eventId, editingVehicle.id, fields, { rc, insurance });
        } else if (rc && insurance) {
          await mobileEventAPI.createVehicle(eventId, fields, { rc, insurance });
        }
      } else if (mode === 'driver') {
        await mobileEventAPI.createDriver(eventId, {
          fullName: fullName.trim(),
          mobile: mobile.trim(),
          altMobile: altMobile.trim(),
          licenseNumber: license.trim().toUpperCase(),
          aadhaarNumber: aadhaar.trim(),
        }, { driver_photo: photo, dl_front: dlFront, dl_back: dlBack, aadhaar: aadhaarPhoto, aadhaar_back: aadhaarBack });
      } else if (mode === 'bulk') {
        await mobileEventAPI.expandRequirement({
          eventId,
          vehicleType,
          quantity: Math.max(1, Number(quantity) || 1),
          passengerCount: passengers.trim() ? Number(passengers) : null,
          dates: selectedDates,
        });
      } else if (mode === 'dates' && assignment) {
        await mobileEventAPI.updateAssignment({ id: assignment.id, eventId, dates: selectedDates });
      } else if (mode === 'edit' && assignment) {
        const chosen = vehicles.find((item) => item.id === vehicleId);
        await mobileEventAPI.updateAssignment({
          id: assignment.id,
          eventId,
          vehicleType: chosen?.vehicleType || vehicleType,
          vehicleId,
          driverId,
          dates: selectedDates,
        });
      } else if (mode === 'replace' && assignment) {
        await mobileEventAPI.replaceAssignment({
          id: assignment.id,
          fromDate,
          vehicleId,
          driverId,
          vehicleType: assignment.vehicleType,
        });
      } else {
        const chosen = vehicles.find((item) => item.id === vehicleId);
        await mobileEventAPI.createAssignment({
          eventId,
          vehicleType: chosen?.vehicleType || vehicleType,
          vehicleId,
          driverId,
          dates: selectedDates,
        });
      }
      onSaved(mode);
    } catch (err) {
      Alert.alert('Could not save', err instanceof Error ? err.message : 'Try again');
    } finally {
      setSaving(false);
    }
  };

  const title = mode === 'vehicle'
    ? (editingVehicle ? 'Edit vehicle' : 'Add event vehicle')
    : mode === 'driver'
      ? 'Add driver'
      : mode === 'bulk'
        ? 'Bulk requirement'
        : mode === 'dates'
          ? 'Add dates'
          : mode === 'edit'
            ? 'Edit assignment'
            : mode === 'replace'
              ? 'Replace vehicle / driver'
              : 'Add vehicle to event';

  return (
    <Modal visible={mode != null} animationType="slide" transparent>
      <View style={styles.modal}>
        <View style={styles.sheet}>
          <Text style={styles.title}>{title}</Text>
          <ScrollView keyboardShouldPersistTaps="handled">
            {mode === 'vehicle' ? (
              <>
                <TextInput style={styles.input} placeholder="Registration number" autoCapitalize="characters" value={registration} onChangeText={setRegistration} />
                <TypeChips value={vehicleType} onChange={setVehicleType} />
                <TextInput style={styles.input} placeholder="Make" value={make} onChangeText={setMake} />
                <TextInput style={styles.input} placeholder="Model" value={model} onChangeText={setModel} />
                <TextInput style={styles.input} placeholder="Seating capacity" keyboardType="number-pad" value={capacity} onChangeText={setCapacity} />
                <TextInput style={styles.input} placeholder="Vehicle owner" value={owner} onChangeText={setOwner} />
                <TextInput style={styles.input} placeholder="Owner mobile" keyboardType="phone-pad" value={ownerMobile} onChangeText={setOwnerMobile} />
                <DocSlot label={editingVehicle ? 'Replace RC front' : 'RC front (image)'} optional={Boolean(editingVehicle)} file={rc} onChange={setRc} />
                <DocSlot label={editingVehicle ? 'Replace insurance front' : 'Insurance front (image)'} optional={Boolean(editingVehicle)} file={insurance} onChange={setInsurance} />
                {editingVehicle ? <Text style={styles.hint}>Current RC and insurance stay unless you choose a new photo.</Text> : null}
              </>
            ) : null}
            {mode === 'driver' ? (
              <>
                <TextInput style={styles.input} placeholder="Full name" value={fullName} onChangeText={setFullName} />
                <TextInput style={styles.input} placeholder="Mobile" keyboardType="phone-pad" value={mobile} onChangeText={setMobile} />
                <TextInput style={styles.input} placeholder="Alternate mobile" keyboardType="phone-pad" value={altMobile} onChangeText={setAltMobile} />
                <TextInput style={styles.input} placeholder="Driving licence number" autoCapitalize="characters" value={license} onChangeText={setLicense} />
                <TextInput style={styles.input} placeholder="Aadhaar (stored masked)" keyboardType="number-pad" value={aadhaar} onChangeText={setAadhaar} />
                <DocSlot label="Driver photo" file={photo} onChange={setPhoto} />
                <DocSlot label="Driving licence front" file={dlFront} onChange={setDlFront} />
                <DocSlot label="Driving licence back" optional file={dlBack} onChange={setDlBack} />
                <DocSlot label="Aadhaar front" file={aadhaarPhoto} onChange={setAadhaarPhoto} />
                <DocSlot label="Aadhaar back" optional file={aadhaarBack} onChange={setAadhaarBack} />
                <Text style={styles.hint}>Photo, Aadhaar and driving licence are stored privately. Aadhaar numbers stay masked. Crop opens after you take or choose a photo.</Text>
              </>
            ) : null}
            {mode === 'bulk' ? (
              <>
                <Text style={styles.hint}>Creates empty slots, for example 8 Innova Crysta on the dates you pick.</Text>
                <TypeChips value={vehicleType} onChange={setVehicleType} />
                <TextInput style={styles.input} placeholder="How many vehicles" keyboardType="number-pad" value={quantity} onChangeText={setQuantity} />
                <TextInput style={styles.input} placeholder="Passenger count" keyboardType="number-pad" value={passengers} onChangeText={setPassengers} />
              </>
            ) : null}
            {mode === 'replace' ? <Text style={styles.hint}>Completed days stay on the original vehicle and driver.</Text> : null}
            {mode === 'assignment' || mode === 'edit' || mode === 'replace' ? (
              <>
                <Text style={styles.label}>{mode === 'replace' ? 'New vehicle' : 'Vehicle'}</Text>
                <View style={styles.chips}>
                  {mode !== 'replace' ? (
                    <TouchableOpacity style={[styles.chip, vehicleId == null && styles.chipOn]} onPress={() => setVehicleId(null)}>
                      <Text style={[styles.chipText, vehicleId == null && styles.chipTextOn]}>Assign later</Text>
                    </TouchableOpacity>
                  ) : null}
                  {vehicles.map((item) => (
                    <TouchableOpacity key={item.id} style={[styles.chip, vehicleId === item.id && styles.chipOn]} onPress={() => { setVehicleId(item.id); if (item.vehicleType) setVehicleType(item.vehicleType); }}>
                      <Text style={[styles.chipText, vehicleId === item.id && styles.chipTextOn]}>{item.vehicleNumber}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={styles.label}>{mode === 'replace' ? 'New driver' : 'Driver'}</Text>
                <View style={styles.chips}>
                  {mode !== 'replace' ? (
                    <TouchableOpacity style={[styles.chip, driverId == null && styles.chipOn]} onPress={() => setDriverId(null)}>
                      <Text style={[styles.chipText, driverId == null && styles.chipTextOn]}>Assign later</Text>
                    </TouchableOpacity>
                  ) : null}
                  {drivers.map((item) => (
                    <TouchableOpacity key={item.id} style={[styles.chip, driverId === item.id && styles.chipOn]} onPress={() => setDriverId(item.id)}>
                      <Text style={[styles.chipText, driverId === item.id && styles.chipTextOn]}>{item.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            ) : null}
            {mode === 'replace' ? (
              <>
                <Text style={styles.label}>Change from date</Text>
                <View style={styles.chips}>
                  {(assignment?.dates?.length ? assignment.dates : eventDates).map((date) => (
                    <TouchableOpacity key={date} style={[styles.chip, fromDate === date && styles.chipOn]} onPress={() => setFromDate(date)}>
                      <Text style={[styles.chipText, fromDate === date && styles.chipTextOn]}>{date.slice(5)}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            ) : null}
            {mode === 'assignment' || mode === 'edit' || mode === 'dates' || mode === 'bulk' ? (
              <>
                <Text style={styles.label}>Duty dates</Text>
                <View style={styles.chips}>
                  {eventDates.map((date) => {
                    const on = selectedDates.includes(date);
                    return (
                      <TouchableOpacity
                        key={date}
                        style={[styles.chip, on && styles.chipOn]}
                        onPress={() => setSelectedDates((current) => on ? current.filter((item) => item !== date) : [...current, date].sort())}
                      >
                        <Text style={[styles.chipText, on && styles.chipTextOn]}>{date.slice(8)}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </>
            ) : null}
          </ScrollView>
          <TouchableOpacity style={styles.save} disabled={saving} onPress={() => { void save(); }}>
            <Text style={styles.saveText}>{saving ? 'Saving…' : 'Save'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onClose}><Text style={styles.cancel}>Cancel</Text></TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function TypeChips({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <View style={styles.chips}>
      {VEHICLE_TYPES.map((item) => (
        <TouchableOpacity key={item} style={[styles.chip, value === item && styles.chipOn]} onPress={() => onChange(item)}>
          <Text style={[styles.chipText, value === item && styles.chipTextOn]}>{item.replace(/_/g, ' ')}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

function DocSlot({ label, optional, file, onChange }: { label: string; optional?: boolean; file: UploadPart | null; onChange: (file: UploadPart | null) => void }) {
  const choose = (source: 'camera' | 'library') => {
    void capturePhoto(source).then((next) => {
      if (next) onChange(next);
    });
  };
  return (
    <View style={styles.docBlock}>
      <Text style={styles.label}>{label}</Text>
      {optional ? <Text style={styles.optional}>Optional</Text> : null}
      <View style={styles.docActions}>
        <TouchableOpacity style={styles.take} onPress={() => choose('camera')}>
          <Text style={styles.takeText}>Take photo</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.choose} onPress={() => choose('library')}>
          <Text style={styles.chooseText}>Choose file</Text>
        </TouchableOpacity>
      </View>
      {file ? <Text style={styles.hint}>Cropped photo ready. Take or choose again to replace it.</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  modal: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(15,23,42,0.4)' },
  sheet: { maxHeight: '88%', backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 16 },
  title: { fontSize: 18, fontFamily: fonts.bold, color: colors.foreground, marginBottom: 12 },
  label: { fontFamily: fonts.semiBold, color: '#334155', marginBottom: 6, marginTop: 4 },
  hint: { color: '#64748b', fontFamily: fonts.regular, marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, padding: 12, marginBottom: 8, fontFamily: fonts.regular },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  chip: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 999, backgroundColor: '#e2e8f0' },
  chipOn: { backgroundColor: '#2563eb' },
  chipText: { color: '#334155', fontFamily: fonts.semiBold, fontSize: 12 },
  chipTextOn: { color: '#fff' },
  docBlock: { marginBottom: 12 },
  optional: { color: '#64748b', fontSize: 12, fontFamily: fonts.regular, marginTop: -4, marginBottom: 6 },
  docActions: { flexDirection: 'row', gap: 8 },
  take: { flex: 1, backgroundColor: '#2563eb', borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  takeText: { color: '#fff', fontFamily: fonts.semiBold },
  choose: { flex: 1, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, paddingVertical: 12, alignItems: 'center', backgroundColor: '#fff' },
  chooseText: { color: '#0f172a', fontFamily: fonts.semiBold },
  save: { backgroundColor: '#2563eb', borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  saveText: { color: '#fff', fontFamily: fonts.bold },
  cancel: { textAlign: 'center', color: '#64748b', marginTop: 12, marginBottom: 8, fontFamily: fonts.medium },
});
