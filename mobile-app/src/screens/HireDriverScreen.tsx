/**
 * HireDriverScreen - native screen for hiring a professional driver (no WebView)
 * Form matches web HireDriverPage: name, phone, email, pickup, date/time, service type, duration, requirements
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Linking,
  ScrollView,
  Dimensions,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/core';
import { colors, fonts } from '../theme/colors';
import { DateTimePickerComponent } from '../components/DateTimePicker';
import { driverHireAPI } from '../services/driverHireAPI';

const PHONE_NUMBER = '919966363662';
const WHATSAPP_NUMBER = '919966363662';
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - 32;

const BENEFITS = [
  {
    id: 'verified',
    title: 'Verified Drivers',
    description: 'All drivers are background verified and licensed',
    icon: 'shield-check' as const,
    iconColor: '#16a34a',
  },
  {
    id: 'support',
    title: 'Customer Support',
    description: 'Dedicated support team for any assistance',
    icon: 'account-group' as const,
    iconColor: '#9333ea',
  },
  {
    id: 'safe',
    title: 'Safe Driving',
    description: 'Defensive driving techniques and safety protocols',
    icon: 'car' as const,
    iconColor: '#dc2626',
  },
  {
    id: 'quality',
    title: 'Quality Assured',
    description: 'Regular training and performance monitoring',
    icon: 'check-circle' as const,
    iconColor: '#059669',
  },
];

const SERVICE_TYPE_OPTIONS = [
  { value: 'local', label: 'Personal Driver - Local' },
  { value: 'outstation', label: 'Outstation Driver' },
  { value: 'corporate', label: 'Corporate Driver' },
  { value: 'event', label: 'Event Driver' },
] as const;

const DURATION_OPTIONS = [
  { value: 'half-day', label: 'Half Day' },
  { value: 'full-day', label: 'Full Day (8-12 hours)' },
  { value: 'multi-day', label: 'Multi Day' },
] as const;

const getDefaultPickupDate = () => {
  const d = new Date();
  d.setTime(d.getTime() + 60 * 60 * 1000);
  return d;
};

export function HireDriverScreen() {
  const navigation = useNavigation();
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    pickupLocation: '',
    pickupDateTime: getDefaultPickupDate(),
    serviceType: '',
    duration: '',
    requirements: '',
  });
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!formData.name.trim()) e.name = 'Name is required';
    if (!formData.phone.trim()) e.phone = 'Phone is required';
    else if (!/^\d{10}$/.test(formData.phone.replace(/\D/g, ''))) e.phone = 'Enter valid 10-digit number';
    if (!formData.email.trim()) e.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) e.email = 'Enter valid email';
    if (!formData.pickupLocation.trim()) e.pickupLocation = 'Pickup location is required';
    if (!formData.serviceType) e.serviceType = 'Select service type';
    if (!formData.duration) e.duration = 'Select duration';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setIsSubmitting(true);
    try {
      const response = await driverHireAPI.submitRequest({
        name: formData.name.trim(),
        phone: formData.phone.replace(/\D/g, ''),
        email: formData.email.trim(),
        pickupLocation: formData.pickupLocation.trim(),
        pickupDateTime: formData.pickupDateTime,
        serviceType: formData.serviceType,
        duration: formData.duration,
        requirements: formData.requirements.trim() || undefined,
      });
      if (response.status === 'success') {
        Alert.alert('Request Submitted!', response.message, [
          {
            text: 'OK',
            onPress: () => {
              setFormData({
                name: '',
                phone: '',
                email: '',
                pickupLocation: '',
                pickupDateTime: getDefaultPickupDate(),
                serviceType: '',
                duration: '',
                requirements: '',
              });
              setErrors({});
            },
          },
        ]);
      } else {
        Alert.alert('Submission Failed', response.message || 'Please try again.');
      }
    } catch {
      Alert.alert('Error', 'Something went wrong. Please check your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCall = () => {
    Linking.openURL(`tel:+91${PHONE_NUMBER}`).catch(() => {});
  };

  const handleWhatsApp = () => {
    const message = encodeURIComponent('Hi Kumar! I would like to hire a driver');
    Linking.openURL(`https://wa.me/${WHATSAPP_NUMBER}?text=${message}`).catch(() => {});
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Hire Driver</Text>
      </View>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.headline}>Hire a Professional Driver</Text>
        <Text style={styles.description}>
          Need a reliable driver for your personal vehicle? Our experienced, verified drivers are
          ready to serve you with professionalism and safety.
        </Text>
        <TouchableOpacity style={styles.callBtn} onPress={handleCall} activeOpacity={0.8}>
          <MaterialCommunityIcons name="phone" size={24} color="#fff" />
          <Text style={styles.callBtnText}>Call Now: +91 9966363662</Text>
        </TouchableOpacity>

        {/* Book Your Driver - form matches web */}
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>Book Your Driver</Text>
          <Text style={styles.formSubtitle}>Fill out the form below and we'll get back to you within 30 minutes</Text>

          <View style={styles.field}>
            <Text style={styles.label}>Full Name *</Text>
            <TextInput
              style={[styles.input, errors.name && styles.inputError]}
              placeholder="Enter your full name"
              placeholderTextColor={colors.gray600}
              value={formData.name}
              onChangeText={(t) => { setFormData((f) => ({ ...f, name: t })); setErrors((e) => { const next = { ...e }; delete next.name; return next; }); }}
              autoCapitalize="words"
            />
            {errors.name ? <Text style={styles.errorText}>{errors.name}</Text> : null}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Phone Number *</Text>
            <TextInput
              style={[styles.input, errors.phone && styles.inputError]}
              placeholder="10-digit number"
              placeholderTextColor={colors.gray600}
              value={formData.phone}
              onChangeText={(t) => { setFormData((f) => ({ ...f, phone: t.replace(/\D/g, '').slice(0, 10) })); setErrors((e) => { const next = { ...e }; delete next.phone; return next; }); }}
              keyboardType="phone-pad"
              maxLength={10}
            />
            {errors.phone ? <Text style={styles.errorText}>{errors.phone}</Text> : null}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Email Address *</Text>
            <TextInput
              style={[styles.input, errors.email && styles.inputError]}
              placeholder="Enter your email"
              placeholderTextColor={colors.gray600}
              value={formData.email}
              onChangeText={(t) => { setFormData((f) => ({ ...f, email: t })); setErrors((e) => { const next = { ...e }; delete next.email; return next; }); }}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Pickup Location *</Text>
            <TextInput
              style={[styles.input, errors.pickupLocation && styles.inputError]}
              placeholder="Where do you need the driver?"
              placeholderTextColor={colors.gray600}
              value={formData.pickupLocation}
              onChangeText={(t) => { setFormData((f) => ({ ...f, pickupLocation: t })); setErrors((e) => { const next = { ...e }; delete next.pickupLocation; return next; }); }}
            />
            {errors.pickupLocation ? <Text style={styles.errorText}>{errors.pickupLocation}</Text> : null}
          </View>

          <View style={styles.field}>
            <DateTimePickerComponent
              label="Pickup Date & Time *"
              date={formData.pickupDateTime}
              onDateChange={(d) => setFormData((f) => ({ ...f, pickupDateTime: d }))}
              minDate={new Date()}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Service Type *</Text>
            {SERVICE_TYPE_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.optionRow, formData.serviceType === opt.value && styles.optionRowSelected]}
                onPress={() => setFormData((f) => ({ ...f, serviceType: opt.value }))}
              >
                <View style={[styles.radio, formData.serviceType === opt.value && styles.radioSelected]} />
                <Text style={styles.optionLabel}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
            {errors.serviceType ? <Text style={styles.errorText}>{errors.serviceType}</Text> : null}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Duration *</Text>
            {DURATION_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.optionRow, formData.duration === opt.value && styles.optionRowSelected]}
                onPress={() => setFormData((f) => ({ ...f, duration: opt.value }))}
              >
                <View style={[styles.radio, formData.duration === opt.value && styles.radioSelected]} />
                <Text style={styles.optionLabel}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
            {errors.duration ? <Text style={styles.errorText}>{errors.duration}</Text> : null}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Special Requirements</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Any specific requirements or additional information..."
              placeholderTextColor={colors.gray600}
              value={formData.requirements}
              onChangeText={(t) => setFormData((f) => ({ ...f, requirements: t }))}
              multiline
              numberOfLines={4}
            />
          </View>

          <TouchableOpacity
            style={[styles.submitBtn, isSubmitting && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitBtnText}>Request Driver</Text>
            )}
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Why Choose Our Drivers?</Text>
        {BENEFITS.map((item) => (
          <View key={item.id} style={styles.card}>
            <View style={styles.cardBadge}>
              <Text style={styles.cardBadgeText}>{item.title}</Text>
            </View>
            <View style={styles.cardBody}>
              <Text style={styles.cardDescription}>{item.description}</Text>
              <View style={[styles.cardIconWrap, { backgroundColor: item.iconColor + '20' }]}>
                <MaterialCommunityIcons
                  name={item.icon}
                  size={28}
                  color={item.iconColor}
                />
              </View>
            </View>
          </View>
        ))}

        <TouchableOpacity style={styles.whatsappBtn} onPress={handleWhatsApp} activeOpacity={0.8}>
          <MaterialCommunityIcons name="whatsapp" size={24} color="#fff" />
          <Text style={styles.whatsappBtnText}>Chat on WhatsApp</Text>
        </TouchableOpacity>
        <View style={styles.bottomPad} />
      </ScrollView>
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
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: { padding: 4, marginRight: 8 },
  headerTitle: {
    fontSize: 18,
    fontFamily: fonts.semiBold,
    color: colors.foreground,
  },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  headline: {
    fontSize: 24,
    fontFamily: fonts.bold,
    color: colors.foreground,
    marginBottom: 12,
  },
  description: {
    fontSize: 15,
    fontFamily: fonts.regular,
    color: colors.gray600,
    lineHeight: 22,
    marginBottom: 24,
  },
  callBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 10,
    marginBottom: 32,
  },
  callBtnText: {
    fontSize: 16,
    fontFamily: fonts.semiBold,
    color: colors.primaryForeground,
  },
  formCard: {
    backgroundColor: colors.background,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20,
    marginBottom: 24,
  },
  formTitle: {
    fontSize: 20,
    fontFamily: fonts.bold,
    color: colors.foreground,
    marginBottom: 4,
    textAlign: 'center',
  },
  formSubtitle: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: colors.gray600,
    marginBottom: 20,
    textAlign: 'center',
  },
  field: { marginBottom: 16 },
  label: {
    fontSize: 13,
    fontFamily: fonts.medium,
    color: colors.foreground,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.foreground,
  },
  inputError: { borderColor: '#dc2626' },
  errorText: { fontSize: 12, color: '#dc2626', marginTop: 4 },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 8,
  },
  optionRowSelected: { borderColor: colors.primary, backgroundColor: '#eff6ff' },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.border,
    marginRight: 12,
  },
  radioSelected: { borderColor: colors.primary, backgroundColor: colors.primary },
  optionLabel: { fontSize: 15, fontFamily: fonts.regular, color: colors.foreground, flex: 1 },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  submitBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  submitBtnDisabled: { opacity: 0.7 },
  submitBtnText: { fontSize: 16, fontFamily: fonts.semiBold, color: colors.primaryForeground },
  sectionTitle: {
    fontSize: 18,
    fontFamily: fonts.bold,
    color: colors.foreground,
    marginBottom: 16,
  },
  card: {
    width: CARD_WIDTH,
    backgroundColor: colors.background,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
    overflow: 'hidden',
  },
  cardBadge: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.gray100,
  },
  cardBadgeText: {
    fontSize: 13,
    fontFamily: fonts.semiBold,
    color: colors.foreground,
  },
  cardBody: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  cardDescription: {
    flex: 1,
    fontSize: 14,
    fontFamily: fonts.regular,
    color: colors.gray600,
    lineHeight: 20,
    marginRight: 12,
  },
  cardIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  whatsappBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#25D366',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 10,
    marginTop: 8,
  },
  whatsappBtnText: {
    fontSize: 15,
    fontFamily: fonts.semiBold,
    color: '#fff',
  },
  bottomPad: { height: 24 },
});
