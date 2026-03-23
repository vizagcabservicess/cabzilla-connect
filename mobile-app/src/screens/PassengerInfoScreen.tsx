/**
 * Passenger Info - Contact details form (matches web GuestDetailsForm)
 * Step 2: Trip summary, Name, Phone, Email, Additional Requirements, Payment Options
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Image,
  Platform,
  KeyboardAvoidingView,
  Switch,
  Share,
  Modal,
  Pressable,
} from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, fonts } from '../theme/colors';
import type { RootStackParamList } from '../navigation/types';
import type { Location } from '../types';
import type { TripType } from '../types';
import { COUNTRY_CODES } from '../data/countryCodes';

export type PassengerInfoParams = {
  pickupLocation: Location;
  dropLocation: Location | null;
  pickupDate: number;
  tripType: TripType;
  distance: number;
  duration: number;
  selectedVehicle: { id: string; name: string; capacity?: number; amenities?: string[]; image?: string };
  totalPrice: number;
};

type Props = NativeStackScreenProps<RootStackParamList, 'PassengerInfo'>;

export function PassengerInfoScreen({ route, navigation }: Props) {
  const { pickupLocation, dropLocation, pickupDate, returnDate, tripType, tripMode, distance, hourlyPackage, tourId, tourName, selectedVehicle, totalPrice, paymentMode: initialPaymentMode } = route.params;

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [countryCode, setCountryCode] = useState(COUNTRY_CODES[0]);
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');
  const [email, setEmail] = useState('');
  const [additionalReq, setAdditionalReq] = useState('');
  const [paymentMode, setPaymentMode] = useState<'partial' | 'full'>(initialPaymentMode ?? 'partial');
  const [showBookingDetailsModal, setShowBookingDetailsModal] = useState(false);
  const [gstEnabled, setGstEnabled] = useState(false);
  const [gstin, setGstin] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [businessAddress, setBusinessAddress] = useState('');
  const [businessEmail, setBusinessEmail] = useState('');
  const [errors, setErrors] = useState<{ name?: string; phone?: string; email?: string; gstin?: string; businessName?: string; businessEmail?: string }>({});

  const pickupDateObj = new Date(pickupDate);
  const arrivalDateObj = route.params.duration
    ? new Date(pickupDate + route.params.duration * 60 * 1000)
    : pickupDateObj;
  const dropName = tripType === 'tour' && tourName ? tourName : (dropLocation?.name || pickupLocation.name);
  const partialAmount = Math.round(totalPrice * 0.3);

  const GSTIN_PATTERN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

  const validate = () => {
    const e: typeof errors = {};
    if (!name.trim()) e.name = 'Name is required';
    if (!phone.trim()) e.phone = 'Phone is required';
    else {
      const digits = phone.replace(/\D/g, '');
      const len = digits.length;
      if (countryCode.dial === '91' && len !== 10) e.phone = 'Enter valid 10-digit number';
      else if (len < 8 || len > 15) e.phone = 'Enter valid phone number';
    }
    if (!email.trim()) e.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = 'Enter valid email';
    if (gstEnabled) {
      if (!gstin.trim()) e.gstin = 'GSTIN is required';
      else if (!GSTIN_PATTERN.test(gstin.replace(/\s/g, ''))) e.gstin = 'Enter a valid GSTIN';
      if (!businessName.trim()) e.businessName = 'Business name is required';
      if (!businessEmail.trim()) e.businessEmail = 'Business email is required';
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(businessEmail)) e.businessEmail = 'Enter a valid email';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const LEGACY_URL = 'https://vizagtaxihub.com';
  const POLICY_URL = 'https://vizagtaxihub.com/cancellation-refund-policy';

  const handleShareWhatsApp = () => {
    const tripLabel =
      tripType === 'outstation'
        ? tripMode === 'round-trip'
          ? 'Outstation Round-Trip'
          : 'Outstation One-Way'
        : tripType === 'local'
          ? `Local (${hourlyPackage || 'Package'})`
          : tripType === 'airport'
            ? 'Airport Transfer'
            : tripType === 'tour'
              ? tourName || 'Tour'
              : 'Taxi';
    const returnDateObj = returnDate ? new Date(returnDate) : null;
    const text =
      `${tripLabel} Booking\n\n` +
      `From: ${pickupLocation.name}\n` +
      `To: ${dropName}\n` +
      `Date: ${pickupDateObj.toLocaleString('en-IN')}` +
      (returnDateObj ? `\nReturn: ${returnDateObj.toLocaleString('en-IN')}` : '') +
      `\nVehicle: ${selectedVehicle.name}\n` +
      `Distance: ${distance} KM` +
      (tripType === 'outstation' && tripMode === 'round-trip' ? ' × 2 (round trip)' : '') +
      `\nTotal: ₹${totalPrice.toLocaleString('en-IN')}`;
    Share.share({
      message: text,
      title: 'Booking Summary',
    }).catch(() => {});
  };

  const handleProceed = () => {
    if (!validate()) return;
    const payAmount = paymentMode === 'partial' ? partialAmount : totalPrice;
    navigation.navigate('Payment', {
      pickupLocation,
      dropLocation,
      pickupDate,
      returnDate: returnDate ?? undefined,
      tripType,
      tripMode: tripType === 'outstation' ? tripMode : undefined,
      distance,
      hourlyPackage: tripType === 'local' ? hourlyPackage : undefined,
      tourId: tripType === 'tour' ? tourId : undefined,
      tourName: tripType === 'tour' ? tourName : undefined,
      selectedVehicle,
      totalPrice,
      paymentMode,
      payAmount,
      passengerName: name.trim(),
      passengerPhone: phone.replace(/\D/g, ''),
      passengerEmail: email.trim(),
      additionalRequirements: additionalReq.trim(),
      gstEnabled: gstEnabled ? true : undefined,
      gstin: gstEnabled ? gstin.trim() : undefined,
      businessName: gstEnabled ? businessName.trim() : undefined,
      businessAddress: gstEnabled ? businessAddress.trim() : undefined,
      businessEmail: gstEnabled ? businessEmail.trim() : undefined,
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header - match web */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Image
          source={{ uri: 'https://www.vizagtaxihub.com/uploads/vizagtaxihub-logo.png' }}
          style={styles.logo}
          resizeMode="contain"
        />
        <View style={styles.menuBtn} />
      </View>

      {/* Progress - 2. Passenger Info active */}
      <View style={styles.progress}>
        <Text style={styles.progressStep}>1. Select Vehicle</Text>
        <View style={styles.progressConnector} />
        <Text style={[styles.progressStep, styles.progressActive]}>2. Passenger Info</Text>
        <View style={styles.progressConnector} />
        <Text style={styles.progressStep}>3. Payment</Text>
      </View>

      <KeyboardAvoidingView
        style={styles.keyboard}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={80}
      >
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {/* Trip Summary Card - One Way/Round Trip centered, departure | arrow | arrival */}
          <View style={styles.tripSummaryCard}>
            <View style={styles.tripSummaryHeader}>
              <Text style={styles.tripSummaryLabel}>
                {tripType === 'local'
                  ? `Local${hourlyPackage ? ` (${hourlyPackage})` : ''}`
                  : tripType === 'airport'
                    ? 'Airport Transfer'
                    : tripType === 'tour'
                      ? tourName || 'Tour'
                      : tripType === 'outstation' && tripMode === 'round-trip'
                        ? 'Round Trip'
                        : 'One Way'}
              </Text>
            </View>
            <View style={styles.tripSummaryRow}>
              <View style={styles.tripSummaryCol}>
                <Text style={styles.tripSummaryDateTime}>
                  {pickupDateObj.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} · {pickupDateObj.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false })}
                </Text>
                <Text style={styles.tripSummaryLoc} numberOfLines={2}>{pickupLocation.name}</Text>
                <View style={styles.vehiclePill}>
                  <Text style={styles.vehiclePillIcon}>🚗</Text>
                  <Text style={styles.vehiclePillText}>{selectedVehicle.name}</Text>
                </View>
              </View>
              <Text style={styles.tripSummaryArrow}>→</Text>
              <View style={[styles.tripSummaryCol, styles.tripSummaryColRight]}>
                <Text style={styles.tripSummaryDateTime}>
                  {arrivalDateObj.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} · {arrivalDateObj.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false })}
                </Text>
                <Text style={styles.tripSummaryLoc} numberOfLines={2}>{dropName}</Text>
                <TouchableOpacity onPress={() => setShowBookingDetailsModal(true)} style={styles.viewDetailsBtn}>
                  <Text style={styles.viewDetailsLink}>View details</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Booking Details Modal - match web app */}
          <Modal
            visible={showBookingDetailsModal}
            transparent
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={() => setShowBookingDetailsModal(false)}
          >
            <View style={styles.bookingDetailsOverlay}>
              <Pressable style={styles.bookingDetailsBackdrop} onPress={() => setShowBookingDetailsModal(false)} />
              <View style={styles.bookingDetailsContent}>
                <View style={styles.bookingDetailsHeader}>
                  <Text style={styles.bookingDetailsTitle}>Booking Details</Text>
                  <TouchableOpacity onPress={() => setShowBookingDetailsModal(false)} style={styles.bookingDetailsClose}>
                    <Feather name="x" size={24} color={colors.foreground} />
                  </TouchableOpacity>
                </View>
                <ScrollView style={styles.bookingDetailsScroll} showsVerticalScrollIndicator={false}>
                  <Text style={styles.bookingSummaryTitle}>Booking Summary</Text>
                  <View style={styles.bookingDetailsRow}>
                    <Feather name="calendar" size={16} color={colors.gray600} />
                    <View style={styles.bookingDetailsRowContent}>
                      <Text style={styles.bookingDetailsLabel}>TRIP TYPE</Text>
                      <Text style={styles.bookingDetailsValue}>
                        {tripType === 'airport' ? 'Airport Transfer' : tripType === 'local' ? `Hourly Rentals (${hourlyPackage || 'Package'})` : tripType === 'tour' ? 'Tour' : tripType === 'outstation' && tripMode === 'round-trip' ? 'Outstation (Round Trip)' : 'Outstation (One-Way)'}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.bookingDetailsRow}>
                    <Feather name="map-pin" size={16} color={colors.gray600} />
                    <View style={styles.bookingDetailsRowContent}>
                      <Text style={styles.bookingDetailsLabel}>TOTAL DISTANCE</Text>
                      <Text style={styles.bookingDetailsValue}>{distance} KM</Text>
                    </View>
                  </View>
                  <View style={styles.bookingDetailsRow}>
                    <Feather name="map-pin" size={16} color={colors.primary} />
                    <View style={styles.bookingDetailsRowContent}>
                      <Text style={styles.bookingDetailsLabel}>PICKUP</Text>
                      <Text style={styles.bookingDetailsValue}>{pickupLocation.name}</Text>
                      {(pickupLocation.address || pickupLocation.city) && (
                        <Text style={styles.bookingDetailsSub}>{pickupLocation.address || pickupLocation.city}</Text>
                      )}
                    </View>
                  </View>
                  {dropLocation && (
                    <View style={styles.bookingDetailsRow}>
                      <Feather name="map-pin" size={16} color="#dc2626" />
                      <View style={styles.bookingDetailsRowContent}>
                        <Text style={styles.bookingDetailsLabel}>DROP-OFF</Text>
                        <Text style={styles.bookingDetailsValue}>{dropName}</Text>
                        {(dropLocation?.address || dropLocation?.city) ? (
                          <Text style={styles.bookingDetailsSub}>{dropLocation?.address || dropLocation?.city}</Text>
                        ) : null}
                      </View>
                    </View>
                  )}
                  <View style={styles.bookingDetailsRow}>
                    <Feather name="calendar" size={16} color={colors.gray600} />
                    <View style={styles.bookingDetailsRowContent}>
                      <Text style={styles.bookingDetailsLabel}>PICKUP DATE</Text>
                      <Text style={styles.bookingDetailsValue}>
                        {pickupDateObj.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })} - {pickupDateObj.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.bookingDetailsVehicle}>
                    {selectedVehicle.image ? (
                      <Image source={{ uri: selectedVehicle.image }} style={styles.bookingDetailsVehicleImage} resizeMode="cover" />
                    ) : (
                      <View style={[styles.bookingDetailsVehicleImage, styles.bookingDetailsVehiclePlaceholder]}>
                        <Text style={styles.bookingDetailsVehiclePlaceholderText}>🚗</Text>
                      </View>
                    )}
                    <View style={styles.bookingDetailsVehicleInfo}>
                      <Text style={styles.bookingDetailsVehicleName}>{selectedVehicle.name}</Text>
                      <View style={styles.bookingDetailsVehicleMeta}>
                        <Text style={styles.bookingDetailsVehicleMetaText}>{selectedVehicle.capacity || 4} Seats</Text>
                        {selectedVehicle.amenities?.includes('AC') || selectedVehicle.amenities?.includes('ac') ? (
                          <View style={styles.bookingDetailsVehicleAc}>
                            <Feather name="check" size={12} color="#0d9488" />
                            <Text style={styles.bookingDetailsVehicleAcText}>AC</Text>
                          </View>
                        ) : null}
                      </View>
                    </View>
                  </View>
                  <View style={styles.bookingDetailsRow}>
                    <Text style={styles.bookingDetailsLabel}>Base fare</Text>
                    <Text style={styles.bookingDetailsFare}>₹{totalPrice.toLocaleString('en-IN')}</Text>
                  </View>
                  <View style={[styles.bookingDetailsRow, styles.bookingDetailsTotalRow]}>
                    <Text style={styles.bookingDetailsTotalLabel}>Total Price</Text>
                    <Text style={styles.bookingDetailsFare}>₹{totalPrice.toLocaleString('en-IN')}</Text>
                  </View>
                  <TouchableOpacity style={styles.bookingDetailsWhatsAppBtn} onPress={handleShareWhatsApp} activeOpacity={0.8}>
                    <MaterialCommunityIcons name="whatsapp" size={20} color="#fff" />
                    <Text style={styles.bookingDetailsWhatsAppText}>Share summary on WhatsApp</Text>
                  </TouchableOpacity>
                  <Text style={styles.bookingDetailsDisclaimer}>Parking and tolls fees are extra.</Text>
                  <View style={styles.bookingDetailsInclusions}>
                    <View style={styles.bookingDetailsInclusionsHeader}>
                      <Text style={styles.bookingDetailsInclusionsTitle}>Inclusions/Exclusions</Text>
                      <TouchableOpacity onPress={() => Linking.openURL(POLICY_URL)}>
                        <Text style={styles.bookingDetailsViewPolicy}>View Policy</Text>
                      </TouchableOpacity>
                    </View>
                    <View style={styles.bookingDetailsPolicyList}>
                      <View style={styles.bookingDetailsPolicyItem}>
                        <Feather name="check" size={14} color="#10b981" />
                        <Text style={styles.bookingDetailsPolicyText}>Includes Driver, Car, AC, Fuel</Text>
                      </View>
                      <View style={styles.bookingDetailsPolicyItem}>
                        <Feather name="x" size={14} color="#dc2626" />
                        <Text style={styles.bookingDetailsPolicyText}>Excludes toll gates, Parking fees, State Permit, Entry Fees</Text>
                      </View>
                      <View style={styles.bookingDetailsPolicyItem}>
                        <Feather name="check" size={14} color="#10b981" />
                        <Text style={styles.bookingDetailsPolicyText}>{tripType === 'local' ? `${hourlyPackage === '10hrs-100km' ? 100 : hourlyPackage === '4hrs-40km' ? 40 : 80} Kms included.` : tripType === 'airport' ? '40 Kms included.' : '₹15/Km will be charged for extra distance'}</Text>
                      </View>
                      {(tripType === 'local' || tripType === 'airport') && (
                        <View style={styles.bookingDetailsPolicyItem}>
                          <Feather name="check" size={14} color="#10b981" />
                          <Text style={styles.bookingDetailsPolicyText}>₹15/Km will be charged for extra distance</Text>
                        </View>
                      )}
                      <View style={styles.bookingDetailsPolicyItem}>
                        <Feather name="check" size={14} color="#10b981" />
                        <Text style={styles.bookingDetailsPolicyText}>Waiting time upto 45 mins included. ₹100.00/30 mins after that</Text>
                      </View>
                      <View style={styles.bookingDetailsPolicyItem}>
                        <Feather name="check" size={14} color="#10b981" />
                        <Text style={styles.bookingDetailsPolicyText}>During ghat roads and standby AC will turned off</Text>
                      </View>
                    </View>
                  </View>
                </ScrollView>
              </View>
            </View>
          </Modal>

          {/* Card title - match web "Contact details" */}
          <View style={styles.cardTitle}>
            <View style={styles.cardTitleIcon}>
              <Text style={styles.cardTitleIconText}>👤</Text>
            </View>
            <View>
              <Text style={styles.cardTitleMain}>Contact details</Text>
              <Text style={styles.cardTitleSub}>Booking details will be sent to</Text>
            </View>
          </View>

          <View style={styles.formCard}>
            <View style={styles.field}>
              <Text style={styles.label}>Full Name</Text>
              <TextInput
                style={[styles.input, errors.name && styles.inputError]}
                placeholder="Enter your full name"
                placeholderTextColor={colors.gray600}
                value={name}
                onChangeText={(t) => { setName(t); setErrors((e) => ({ ...e, name: undefined })); }}
                autoCapitalize="words"
              />
              {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>Phone Number</Text>
              <View style={styles.phoneRow}>
                <TouchableOpacity
                  style={styles.countryCode}
                  onPress={() => { setCountrySearch(''); setShowCountryPicker(true); }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.countryCodeText}>{countryCode.flag} +{countryCode.dial}</Text>
                  <Text style={styles.countryCodeArrow}>▼</Text>
                </TouchableOpacity>
                <TextInput
                  style={[styles.input, styles.phoneInput, errors.phone && styles.inputError]}
                  placeholder={countryCode.dial === '91' ? 'Enter 10 digit number' : 'Enter phone number'}
                  placeholderTextColor={colors.gray600}
                  value={phone}
                  onChangeText={(t) => { setPhone(t.replace(/\D/g, '').slice(0, 15)); setErrors((e) => ({ ...e, phone: undefined })); }}
                  keyboardType="phone-pad"
                  maxLength={15}
                />
              </View>
              {errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}
            </View>
            <Modal
              visible={showCountryPicker}
              transparent
              animationType="slide"
              presentationStyle="overFullScreen"
              onRequestClose={() => { setCountrySearch(''); setShowCountryPicker(false); }}
            >
              <View style={styles.countryModalOverlay}>
                <Pressable style={styles.countryModalBackdrop} onPress={() => { setCountrySearch(''); setShowCountryPicker(false); }} />
                <View style={styles.countryModalContent}>
                  <Text style={styles.countryModalTitle}>Select country</Text>
                  <View style={styles.countrySearchWrap}>
                    <Feather name="search" size={18} color={colors.gray600} style={styles.countrySearchIcon} />
                    <TextInput
                      style={styles.countrySearchInput}
                      placeholder="Search country or code..."
                      placeholderTextColor={colors.gray600}
                      value={countrySearch}
                      onChangeText={setCountrySearch}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </View>
                  <ScrollView style={styles.countryModalList} keyboardShouldPersistTaps="handled">
                    {COUNTRY_CODES.filter((c) => {
                      const q = countrySearch.trim().toLowerCase();
                      if (!q) return true;
                      return c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q) || c.dial.includes(q);
                    }).map((c) => (
                      <TouchableOpacity
                        key={c.code}
                        style={[styles.countryModalItem, countryCode.code === c.code && styles.countryModalItemSelected]}
                        onPress={() => {
                          setCountryCode(c);
                          setShowCountryPicker(false);
                        }}
                      >
                        <Text style={styles.countryModalItemText}>{c.flag} {c.name} (+{c.dial})</Text>
                        {countryCode.code === c.code && (
                          <Feather name="check" size={18} color={colors.primary} />
                        )}
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                  <TouchableOpacity style={styles.countryModalClose} onPress={() => setShowCountryPicker(false)}>
                    <Text style={styles.countryModalCloseText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Modal>
            <View style={styles.field}>
              <Text style={styles.label}>Email ID</Text>
              <TextInput
                style={[styles.input, errors.email && styles.inputError]}
                placeholder="Enter your email address"
                placeholderTextColor={colors.gray600}
                value={email}
                onChangeText={(t) => { setEmail(t); setErrors((e) => ({ ...e, email: undefined })); }}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>Additional Requirements</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Enter flight number, special requests, or any other requirements..."
                placeholderTextColor={colors.gray600}
                value={additionalReq}
                onChangeText={setAdditionalReq}
                multiline
                numberOfLines={3}
              />
              <Text style={styles.fieldHint}>Optional: Include flight details, accessibility needs, or any special requests</Text>
            </View>
          </View>

          {/* Payment Options - match web */}
          <View style={styles.paymentCard}>
            <View style={styles.paymentHeader}>
              <View style={styles.paymentIcon}>
                <Text style={styles.paymentIconText}>💳</Text>
              </View>
              <Text style={styles.paymentTitle}>Payment Options</Text>
            </View>
            <TouchableOpacity
              style={[styles.paymentOption, paymentMode === 'partial' && styles.paymentOptionSelected]}
              onPress={() => setPaymentMode('partial')}
            >
              <View style={styles.paymentOptionLeft}>
                <View style={[styles.radio, paymentMode === 'partial' && styles.radioSelected]} />
                <View>
                  <Text style={styles.paymentOptionLabel}>Part Pay</Text>
                  <Text style={styles.paymentOptionSub}>Pay 30% now, rest to the driver</Text>
                </View>
              </View>
              <Text style={styles.paymentOptionPrice}>₹{partialAmount.toLocaleString('en-IN')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.paymentOption, paymentMode === 'full' && styles.paymentOptionSelected]}
              onPress={() => setPaymentMode('full')}
            >
              <View style={styles.paymentOptionLeft}>
                <View style={[styles.radio, paymentMode === 'full' && styles.radioSelected]} />
                <View>
                  <Text style={styles.paymentOptionLabel}>Full Pay</Text>
                  <Text style={styles.paymentOptionSub}>Pay total amount</Text>
                </View>
              </View>
              <Text style={styles.paymentOptionPrice}>₹{totalPrice.toLocaleString('en-IN')}</Text>
            </TouchableOpacity>
          </View>

          {/* GST Billing - match web */}
          <View style={styles.gstCard}>
            <View style={styles.gstHeader}>
              <View>
                <Text style={styles.gstTitle}>I have a GST number</Text>
                <Text style={styles.gstOptional}>Optional</Text>
              </View>
              <Switch
                value={gstEnabled}
                onValueChange={setGstEnabled}
                trackColor={{ false: '#d1d5db', true: colors.primary }}
                thumbColor="#fff"
              />
            </View>
            {gstEnabled && (
              <View style={styles.gstFields}>
                <View style={styles.field}>
                  <TextInput
                    style={[styles.input, errors.gstin && styles.inputError]}
                    placeholder="GSTIN"
                    placeholderTextColor={colors.gray600}
                    value={gstin}
                    onChangeText={(t) => { setGstin(t.toUpperCase()); setErrors((e) => ({ ...e, gstin: undefined })); }}
                    autoCapitalize="characters"
                  />
                  {errors.gstin && <Text style={styles.errorText}>{errors.gstin}</Text>}
                </View>
                <View style={styles.field}>
                  <TextInput
                    style={[styles.input, errors.businessName && styles.inputError]}
                    placeholder="Business Name"
                    placeholderTextColor={colors.gray600}
                    value={businessName}
                    onChangeText={(t) => { setBusinessName(t); setErrors((e) => ({ ...e, businessName: undefined })); }}
                    autoCapitalize="words"
                  />
                  {errors.businessName && <Text style={styles.errorText}>{errors.businessName}</Text>}
                </View>
                <View style={styles.field}>
                  <TextInput
                    style={styles.input}
                    placeholder="Business Address"
                    placeholderTextColor={colors.gray600}
                    value={businessAddress}
                    onChangeText={setBusinessAddress}
                  />
                </View>
                <View style={styles.field}>
                  <TextInput
                    style={[styles.input, errors.businessEmail && styles.inputError]}
                    placeholder="Business Email"
                    placeholderTextColor={colors.gray600}
                    value={businessEmail}
                    onChangeText={(t) => { setBusinessEmail(t); setErrors((e) => ({ ...e, businessEmail: undefined })); }}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                  {errors.businessEmail && <Text style={styles.errorText}>{errors.businessEmail}</Text>}
                </View>
                <View style={styles.gstWarning}>
                  <Text style={styles.gstWarningText}>
                    In case of invalid/cancelled GSTIN, this booking shall be considered as personal booking. Additional 18% GST will be charged on the total amount.
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* Legal disclaimer - match web */}
          <View style={styles.legalDisclaimer}>
            <Text style={styles.legalText}>
              By proceeding to book, I agree to Vizag Taxi Hub's{' '}
              <Text style={styles.legalLink} onPress={() => Linking.openURL(`${LEGACY_URL}/privacy-policy`)}>Privacy Policy</Text>
              ,{' '}
              <Text style={styles.legalLink} onPress={() => Linking.openURL(`${LEGACY_URL}/terms-of-service`)}>Terms of Service</Text>
              ,{' '}
              <Text style={styles.legalLink} onPress={() => Linking.openURL(`${LEGACY_URL}/user-agreement`)}>User Agreement</Text>
              {' '}&{' '}
              <Text style={styles.legalLink} onPress={() => Linking.openURL(`${LEGACY_URL}/cancellation-refund-policy`)}>Cancellation Rules</Text>
            </Text>
          </View>

          <TouchableOpacity style={styles.backBtnLarge} onPress={() => navigation.goBack()}>
            <Text style={styles.backBtnLargeText}>← Back</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* MakeMyTrip-style sticky bottom bar: Part Pay / Full Pay + Proceed to Payment */}
      <View style={styles.bottomBar}>
        <View style={styles.bottomBanner}>
          <Feather name="check-circle" size={12} color="#0d9488" />
          <Text style={styles.bottomBannerText}>
            Pay ₹{partialAmount.toLocaleString('en-IN')} in advance to reserve, rest to driver. Toll and parking as per actual.
          </Text>
        </View>
        <View style={styles.bottomPaymentBar}>
          <View style={styles.paymentOptionsRow}>
            <TouchableOpacity
              style={[styles.paymentOptionChip, paymentMode === 'partial' && styles.paymentOptionChipSelected]}
              onPress={() => setPaymentMode('partial')}
              activeOpacity={0.8}
            >
              <View style={[styles.radioChip, paymentMode === 'partial' && styles.radioChipSelected]} />
              <Text style={[styles.paymentOptionChipLabel, paymentMode === 'partial' && styles.paymentOptionChipLabelSelected]}>Part Pay</Text>
              <Text style={[styles.paymentOptionChipAmount, paymentMode === 'partial' && styles.paymentOptionChipAmountSelected]} numberOfLines={1}>₹{partialAmount.toLocaleString('en-IN')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.paymentOptionChip, paymentMode === 'full' && styles.paymentOptionChipSelected]}
              onPress={() => setPaymentMode('full')}
              activeOpacity={0.8}
            >
              <View style={[styles.radioChip, paymentMode === 'full' && styles.radioChipSelected]} />
              <Text style={[styles.paymentOptionChipLabel, paymentMode === 'full' && styles.paymentOptionChipLabelSelected]}>Full Pay</Text>
              <Text style={[styles.paymentOptionChipAmount, paymentMode === 'full' && styles.paymentOptionChipAmountSelected]} numberOfLines={1}>₹{totalPrice.toLocaleString('en-IN')}</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.proceedBtn} onPress={handleProceed}>
            <Text style={styles.proceedBtnText}>Proceed to Payment</Text>
            <Text style={styles.proceedBtnArrow}>→</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.gray50 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: { padding: 8 },
  backText: { fontSize: 20, color: colors.primary, fontFamily: fonts.semiBold },
  logo: { width: 100, height: 36 },
  menuBtn: { padding: 8 },
  menuIcon: { fontSize: 22, color: colors.foreground, fontFamily: fonts.regular },
  progress: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  progressStep: { fontSize: 13, color: colors.gray600, fontFamily: fonts.medium },
  progressActive: { color: colors.primary, fontFamily: fonts.bold, textDecorationLine: 'underline' },
  progressConnector: {
    width: 12,
    height: 2,
    backgroundColor: colors.border,
    marginHorizontal: 4,
  },
  keyboard: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 140 },
  cardTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  cardTitleIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitleIconText: { fontSize: 18 },
  cardTitleMain: { fontSize: 16, fontFamily: fonts.semiBold, color: colors.foreground },
  cardTitleSub: { fontSize: 12, color: colors.gray600, fontFamily: fonts.regular },
  formCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 16,
    ...(Platform.OS === 'web' ? { boxShadow: '0 2px 8px rgba(0,0,0,0.06)' } : { elevation: 2 }),
  },
  field: { marginBottom: 16 },
  label: { fontSize: 13, fontFamily: fonts.medium, color: colors.foreground, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.foreground,
  },
  inputError: { borderColor: '#dc2626' },
  phoneRow: { flexDirection: 'row', gap: 8 },
  countryCode: {
    width: 90,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    justifyContent: 'center',
    flexDirection: 'row',
    alignItems: 'center',
  },
  countryCodeText: { fontSize: 15, color: colors.foreground, fontFamily: fonts.regular },
  countryCodeArrow: { fontSize: 10, color: colors.gray600, marginLeft: 4, fontFamily: fonts.regular },
  phoneInput: { flex: 1 },
  countryModalOverlay: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'flex-end',
  },
  countryModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  countryModalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    maxHeight: '70%',
  },
  countryModalTitle: {
    fontSize: 18,
    fontFamily: fonts.bold,
    color: colors.foreground,
  },
  countrySearchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.gray100,
    borderRadius: 8,
    marginBottom: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  countrySearchIcon: { marginRight: 8 },
  countrySearchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.foreground,
    marginBottom: 16,
    textAlign: 'center',
  },
  countryModalList: { maxHeight: 300 },
  countryModalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 4,
  },
  countryModalItemSelected: { backgroundColor: '#eff6ff' },
  countryModalItemText: { fontSize: 16, fontFamily: fonts.medium, color: colors.foreground },
  countryModalClose: {
    marginTop: 16,
    paddingVertical: 12,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  countryModalCloseText: { fontSize: 16, fontFamily: fonts.semiBold, color: colors.primary },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  fieldHint: { fontSize: 11, color: colors.gray600, marginTop: 4, fontFamily: fonts.regular },
  errorText: { fontSize: 12, color: '#dc2626', marginTop: 4 },
  tripSummaryCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 16,
    ...(Platform.OS === 'web' ? { boxShadow: '0 2px 8px rgba(0,0,0,0.06)' } : { elevation: 2 }),
  },
  tripSummaryHeader: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  tripSummaryLabel: { fontSize: 12, color: colors.gray600, fontFamily: fonts.semiBold },
  tripSummaryRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  tripSummaryCol: { flex: 1, minWidth: 0 },
  tripSummaryColRight: {},
  tripSummaryDateTime: { fontSize: 12, color: colors.gray600, marginBottom: 2, fontFamily: fonts.regular },
  tripSummaryLoc: { fontSize: 14, fontFamily: fonts.semiBold, color: colors.foreground },
  tripSummaryArrow: { fontSize: 16, color: colors.primary, marginTop: 4, fontFamily: fonts.regular },
  vehiclePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#dbeafe',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  vehiclePillIcon: { fontSize: 14 },
  vehiclePillText: { fontSize: 13, fontFamily: fonts.semiBold, color: '#1e40af' },
  viewDetailsBtn: { marginTop: 8 },
  viewDetailsLink: { fontSize: 13, fontFamily: fonts.semiBold, color: colors.primary },
  bookingDetailsOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  bookingDetailsBackdrop: { ...StyleSheet.absoluteFillObject },
  bookingDetailsContent: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '80%' },
  bookingDetailsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
  bookingDetailsTitle: { fontSize: 18, fontFamily: fonts.bold, color: colors.foreground },
  bookingDetailsClose: { padding: 8 },
  bookingDetailsScroll: { maxHeight: 400, padding: 16 },
  bookingSummaryTitle: { fontSize: 15, fontFamily: fonts.semiBold, color: colors.foreground, marginBottom: 12 },
  bookingDetailsRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16, gap: 12 },
  bookingDetailsRowContent: { flex: 1, minWidth: 0 },
  bookingDetailsLabel: { fontSize: 11, color: colors.gray600, fontFamily: fonts.semiBold, marginBottom: 2 },
  bookingDetailsValue: { fontSize: 14, fontFamily: fonts.semiBold, color: colors.foreground },
  bookingDetailsSub: { fontSize: 12, color: colors.gray600, marginTop: 2, fontFamily: fonts.regular },
  bookingDetailsFare: { fontSize: 14, fontFamily: fonts.bold, color: colors.primary },
  bookingDetailsVehicle: { flexDirection: 'row', backgroundColor: '#eff6ff', borderRadius: 12, padding: 12, marginBottom: 16, gap: 12 },
  bookingDetailsVehicleImage: { width: 80, height: 60, borderRadius: 8, backgroundColor: colors.gray100 },
  bookingDetailsVehiclePlaceholder: { alignItems: 'center', justifyContent: 'center' },
  bookingDetailsVehiclePlaceholderText: { fontSize: 24 },
  bookingDetailsVehicleInfo: { flex: 1, justifyContent: 'center' },
  bookingDetailsVehicleName: { fontSize: 16, fontFamily: fonts.bold, color: colors.foreground },
  bookingDetailsVehicleMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  bookingDetailsVehicleMetaText: { fontSize: 13, color: colors.gray600, fontFamily: fonts.regular },
  bookingDetailsVehicleAc: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  bookingDetailsVehicleAcText: { fontSize: 13, color: '#0d9488', fontFamily: fonts.semiBold },
  bookingDetailsTotalRow: { justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  bookingDetailsTotalLabel: { fontSize: 14, fontFamily: fonts.semiBold, color: colors.foreground },
  bookingDetailsWhatsAppBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#25D366',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 8,
    marginBottom: 8,
  },
  bookingDetailsWhatsAppText: { fontSize: 14, fontFamily: fonts.semiBold, color: '#fff' },
  bookingDetailsDisclaimer: { fontSize: 12, color: colors.mutedForeground, marginBottom: 12, fontFamily: fonts.regular },
  bookingDetailsInclusions: {
    backgroundColor: colors.gray50,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 12,
  },
  bookingDetailsInclusionsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  bookingDetailsInclusionsTitle: { fontSize: 14, fontFamily: fonts.semiBold, color: colors.foreground },
  bookingDetailsViewPolicy: { fontSize: 12, fontFamily: fonts.semiBold, color: colors.primary },
  bookingDetailsPolicyList: { gap: 8 },
  bookingDetailsPolicyItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  bookingDetailsPolicyText: { flex: 1, fontSize: 13, color: colors.foreground, fontFamily: fonts.regular },
  tripDetailsExpand: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border },
  tripDetailsText: { fontSize: 13, color: colors.gray600, marginBottom: 4, fontFamily: fonts.regular },
  paymentCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 16,
    ...(Platform.OS === 'web' ? { boxShadow: '0 2px 8px rgba(0,0,0,0.06)' } : { elevation: 2 }),
  },
  paymentHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  paymentIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  paymentIconText: { fontSize: 18 },
  paymentTitle: { fontSize: 16, fontFamily: fonts.semiBold, color: colors.foreground },
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 8,
  },
  paymentOptionSelected: { borderColor: colors.primary, backgroundColor: '#eff6ff' },
  paymentOptionLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.border,
  },
  radioSelected: { borderColor: colors.primary, backgroundColor: colors.primary },
  paymentOptionLabel: { fontSize: 15, fontFamily: fonts.semiBold, color: colors.foreground },
  paymentOptionSub: { fontSize: 12, color: colors.gray600, marginTop: 2, fontFamily: fonts.regular },
  paymentOptionPrice: { fontSize: 15, fontFamily: fonts.semiBold, color: colors.foreground },
  gstCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 16,
    ...(Platform.OS === 'web' ? { boxShadow: '0 2px 8px rgba(0,0,0,0.06)' } : { elevation: 2 }),
  },
  gstHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  gstTitle: { fontSize: 15, fontFamily: fonts.medium, color: colors.foreground },
  gstOptional: { fontSize: 12, color: colors.gray600, marginTop: 2, fontFamily: fonts.regular },
  gstFields: { marginTop: 16 },
  gstWarning: {
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#fed7aa',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  gstWarningText: {
    fontSize: 12,
    color: '#9a3412',
    fontFamily: fonts.regular,
    lineHeight: 18,
  },
  legalDisclaimer: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  legalText: {
    fontSize: 11,
    color: colors.gray600,
    textAlign: 'center',
    lineHeight: 18,
    fontFamily: fonts.regular,
  },
  legalLink: {
    color: colors.primary,
    textDecorationLine: 'underline',
    fontFamily: fonts.semiBold,
  },
  backBtnLarge: {
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  backBtnLargeText: { fontSize: 16, fontFamily: fonts.semiBold, color: colors.foreground },
  // MakeMyTrip-style sticky bottom bar (compact)
  bottomBar: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === 'ios' ? 16 : 10,
    paddingTop: 6,
  },
  bottomBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ccfbf1',
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 6,
    marginBottom: 5,
    gap: 5,
  },
  bottomBannerText: {
    fontSize: 11,
    color: '#0d9488',
    fontFamily: fonts.medium,
    flex: 1,
  },
  bottomPaymentBar: {
    flexDirection: 'column',
    backgroundColor: '#374151',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 8,
    gap: 6,
  },
  paymentOptionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  paymentOptionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingVertical: 5,
    paddingHorizontal: 6,
    borderRadius: 6,
    backgroundColor: '#4b5563',
    flex: 1,
    minWidth: 0,
  },
  paymentOptionChipSelected: {
    backgroundColor: colors.primary,
  },
  radioChip: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  radioChipSelected: {
    borderColor: '#fff',
    backgroundColor: colors.primary,
  },
  paymentOptionChipLabel: {
    fontSize: 11,
    fontFamily: fonts.semiBold,
    color: 'rgba(255,255,255,0.9)',
  },
  paymentOptionChipLabelSelected: { color: '#fff' },
  paymentOptionChipAmount: {
    fontSize: 11,
    fontFamily: fonts.bold,
    color: 'rgba(255,255,255,0.9)',
  },
  paymentOptionChipAmountSelected: { color: '#fff' },
  proceedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
    backgroundColor: colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 6,
  },
  proceedBtnText: { fontSize: 16, fontFamily: fonts.bold, color: colors.primaryForeground },
  proceedBtnArrow: { fontSize: 16, color: colors.primaryForeground, fontFamily: fonts.bold },
});
