import { useMemo, useState } from 'react';
import {
  Alert,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../theme/colors';
import { useAuth } from '../providers/AuthProvider';
import { shareBuildTripLink, sharePackagePdf } from '../lib/tripQuoteShare';

type TourLine = { id: string; name: string; days?: number };

type Props = { route: { params: { tours: TourLine[] } } };

const VEHICLES = ['Sedan', 'Ertiga', 'Innova Crysta', 'Urbania', 'Tempo Traveller'];

export function QuotationScreen({ route }: Props) {
  const navigation = useNavigation();
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'super_admin';
  const tours = route.params.tours;
  const [guest, setGuest] = useState('');
  const [phone, setPhone] = useState('');
  const [pickup, setPickup] = useState('');
  const [vehicle, setVehicle] = useState(VEHICLES[2]);
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');

  const days = useMemo(() => tours.reduce((sum, tour) => sum + (tour.days || 1), 0), [tours]);
  const fare = Number(amount.replace(/,/g, ''));

  const message = [
    'Vizag Taxi Hub quotation',
    guest ? `Guest: ${guest}` : '',
    phone ? `Mobile: ${phone}` : '',
    pickup ? `Pickup: ${pickup}` : '',
    `Vehicle: ${vehicle}`,
    `Trip: ${days} day${days === 1 ? '' : 's'}`,
    ...tours.map((tour, index) => `${index + 1}. ${tour.name}`),
    Number.isFinite(fare) && fare > 0 ? `Amount: Rs ${fare.toLocaleString('en-IN')}` : '',
    notes ? `Notes: ${notes}` : '',
  ].filter(Boolean).join('\n');

  const shareQuote = async () => {
    if (guest.trim().length < 2 || phone.replace(/\D/g, '').length < 10) {
      Alert.alert('Guest details', 'Enter the guest name and a 10-digit mobile number.');
      return;
    }
    await Share.share({ title: `Quotation for ${guest.trim()}`, message });
  };

  const sharePdf = async () => {
    if (guest.trim().length < 2 || phone.replace(/\D/g, '').length < 10) {
      Alert.alert('Guest details', 'Enter the guest name and a 10-digit mobile number.');
      return;
    }
    try {
      await sharePackagePdf({
        tours,
        guest: guest.trim(),
        phone: phone.trim(),
        pickup: pickup.trim(),
        vehicle,
        amount: Number.isFinite(fare) && fare > 0 ? fare.toLocaleString('en-IN') : '',
        notes: notes.trim(),
      });
    } catch {
      Alert.alert('PDF', 'The quotation PDF could not be created.');
    }
  };

  const shareLink = async () => {
    try {
      await shareBuildTripLink(tours);
    } catch {
      Alert.alert('Share link', 'The Build Your Trip link could not be opened.');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={styles.title}>Quotation</Text>
      </View>
      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.section}>Tours</Text>
        {tours.map((tour, index) => (
          <Text key={tour.id} style={styles.tour}>{index + 1}. {tour.name}</Text>
        ))}
        <Text style={styles.meta}>{days} day{days === 1 ? '' : 's'}</Text>
        <Text style={styles.section}>Guest</Text>
        <TextInput style={styles.input} placeholder="Guest name" value={guest} onChangeText={setGuest} />
        <TextInput style={styles.input} placeholder="Mobile number" keyboardType="phone-pad" value={phone} onChangeText={setPhone} />
        <TextInput style={styles.input} placeholder="Pickup place" value={pickup} onChangeText={setPickup} />
        <Text style={styles.section}>Vehicle</Text>
        <View style={styles.chips}>
          {VEHICLES.map((item) => (
            <TouchableOpacity key={item} style={[styles.chip, vehicle === item && styles.chipOn]} onPress={() => setVehicle(item)}>
              <Text style={[styles.chipText, vehicle === item && styles.chipTextOn]}>{item}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <TextInput style={styles.input} placeholder="Amount in rupees" keyboardType="number-pad" value={amount} onChangeText={setAmount} />
        <TextInput style={[styles.input, styles.notes]} placeholder="Notes" value={notes} onChangeText={setNotes} multiline />
        <View style={styles.preview}>
          <Text style={styles.previewText}>{message}</Text>
        </View>
      </ScrollView>
      <View style={styles.footer}>
        {isSuperAdmin ? (
          <>
            <TouchableOpacity style={styles.shareBtn} onPress={() => { void shareLink(); }}>
              <Text style={styles.shareBtnText}>Share Build Your Trip link</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.button} onPress={() => { void sharePdf(); }}>
              <Text style={styles.buttonText}>Create / share quotation PDF</Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity style={styles.button} onPress={() => { void shareQuote(); }}>
            <Text style={styles.buttonText}>Share quotation</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  backBtn: { padding: 4, marginRight: 8 },
  title: { fontSize: 18, fontWeight: '700', color: colors.foreground },
  body: { padding: 16, paddingBottom: 24 },
  section: { marginTop: 12, marginBottom: 8, fontWeight: '700', color: '#0f172a' },
  tour: { color: '#0f172a', marginBottom: 4 },
  meta: { color: '#64748b', marginTop: 4 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 12, marginBottom: 8 },
  notes: { minHeight: 72, textAlignVertical: 'top' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: '#e2e8f0' },
  chipOn: { backgroundColor: '#2563eb' },
  chipText: { color: '#334155', fontWeight: '600' },
  chipTextOn: { color: '#fff' },
  preview: { marginTop: 8, backgroundColor: '#fff', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  previewText: { color: '#334155', lineHeight: 20 },
  footer: { padding: 16, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#e5e7eb', gap: 10 },
  shareBtn: { borderRadius: 10, paddingVertical: 12, alignItems: 'center', backgroundColor: '#ecfdf5', borderWidth: 1, borderColor: '#a7f3d0' },
  shareBtnText: { color: '#047857', fontWeight: '700', fontSize: 15 },
  button: { backgroundColor: '#2563eb', borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
