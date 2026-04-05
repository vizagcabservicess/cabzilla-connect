/**
 * OdometerCaptureModal - Capture odometer photo, extract via OCR, with manual entry fallback
 */
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { extractTextFromImage } from '../services/ocrService';
import { colors } from '../theme/colors';
import { driverTripsAPI, uploadImage } from '../services/driverTripsAPI';
import { parseOdometerFromText } from '../utils/parseOdometerFromOcr';
import { FuelCaptureCameraModal } from './FuelCaptureCameraModal';

export type OdometerCaptureModalProps =
  | {
      visible: boolean;
      onClose: () => void;
      mode: 'trip';
      bookingId: number;
      readingType: 'start' | 'end';
      onSuccess: () => void;
    }
  | {
      visible: boolean;
      onClose: () => void;
      mode: 'fuel';
      onReadingApplied: (reading: number) => void;
    };

export function OdometerCaptureModal(props: OdometerCaptureModalProps) {
  const { visible, onClose } = props;
  const tripMode = props.mode === 'trip';
  const bookingId = tripMode ? props.bookingId : 0;
  const readingType = tripMode ? props.readingType : 'start';
  const onSuccess = tripMode ? props.onSuccess : () => {};
  const onReadingAppliedFuel = !tripMode ? props.onReadingApplied : null;
  const [step, setStep] = useState<'idle' | 'capturing' | 'processing' | 'uploading'>('idle');
  const [error, setError] = useState('');
  const [manualValue, setManualValue] = useState('');
  const [failedImageUri, setFailedImageUri] = useState<string | null>(null);
  const [guidedCameraVisible, setGuidedCameraVisible] = useState(false);

  useEffect(() => {
    if (!visible) {
      setManualValue('');
      setError('');
      setFailedImageUri(null);
      setStep('idle');
      setGuidedCameraVisible(false);
    }
  }, [visible]);

  const uploadTripOdometerAfterConfirm = async (uri: string, odometer: number) => {
    setStep('uploading');
    const imageUrl = await uploadImage(uri, 'odometer.jpg', 'odometer');
    const capturedAt = new Date().toISOString().replace('T', ' ').slice(0, 19);
    await driverTripsAPI.submitOdometer({
      bookingId,
      readingType,
      odometerValue: odometer,
      imageUrl,
      capturedAt,
    });
    onSuccess();
    onClose();
  };

  const processCapturedUri = async (uri: string) => {
    setStep('processing');
    try {
      const texts = await extractTextFromImage(uri);
      const fullText = (texts || []).join(' ');
      const odometer = parseOdometerFromText(fullText);

      if (odometer === null) {
        setError('Could not detect odometer reading. Retake the photo or enter manually below.');
        setFailedImageUri(uri);
        setStep('idle');
        return;
      }

      if (onReadingAppliedFuel) {
        setStep('idle');
        Alert.alert(
          'Confirm odometer reading',
          `Use ${odometer.toLocaleString('en-IN')} km for this fuel entry?`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Submit',
              onPress: () => {
                onReadingAppliedFuel(odometer);
                onClose();
              },
            },
          ]
        );
        return;
      }

      setStep('idle');
      const label = readingType === 'start' ? 'Start trip' : 'End trip';
      Alert.alert(
        `Confirm ${label} odometer`,
        `Reading: ${odometer.toLocaleString('en-IN')} km\n\nSave this reading on the server?`,
        [
          {
            text: 'Edit value',
            style: 'cancel',
            onPress: () => {
              setManualValue(String(odometer));
            },
          },
          {
            text: 'Confirm & save',
            onPress: () => {
              void (async () => {
                try {
                  await uploadTripOdometerAfterConfirm(uri, odometer);
                } catch (e) {
                  setError(
                    e instanceof Error ? e.message : 'Failed to save odometer'
                  );
                  setFailedImageUri(uri);
                  setStep('idle');
                }
              })();
            },
          },
        ]
      );
    } catch (e) {
      setError(
        (e instanceof Error ? e.message : 'Failed to process odometer').includes('Tesseract')
          ? 'Scanning unavailable. Enter the reading manually below.'
          : e instanceof Error
            ? e.message
            : 'Failed to process odometer'
      );
      setFailedImageUri(uri);
      setStep('idle');
    }
  };

  const handleCapture = async () => {
    setError('');
    if (Platform.OS !== 'web') {
      setGuidedCameraVisible(true);
      return;
    }

    setStep('capturing');
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      setError('Camera permission is required');
      setStep('idle');
      return;
    }

    let result: ImagePicker.ImagePickerResult | undefined;
    try {
      result = await ImagePicker.launchCameraAsync({
        allowsEditing: false,
        quality: 0.8,
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
      });
    } catch (cameraErr) {
      setError(
        cameraErr instanceof Error
          ? cameraErr.message
          : 'Could not open the camera. Check camera permission in system settings.'
      );
      setStep('idle');
      return;
    }

    if (!result || result.canceled || !result.assets?.[0]?.uri) {
      setStep('idle');
      return;
    }

    await processCapturedUri(result.assets[0].uri);
  };

  const runManualTripSubmit = async (num: number) => {
    setError('');
    setStep('uploading');
    try {
      let imageUrl = '';
      if (failedImageUri && (failedImageUri.startsWith('file') || failedImageUri.startsWith('content'))) {
        imageUrl = await uploadImage(failedImageUri, 'odometer.jpg', 'odometer');
      }
      const capturedAt = new Date().toISOString().replace('T', ' ').slice(0, 19);
      await driverTripsAPI.submitOdometer({
        bookingId,
        readingType,
        odometerValue: num,
        imageUrl,
        capturedAt,
      });
      onSuccess();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save');
      setStep('idle');
    }
  };

  const handleManualSubmit = async () => {
    const val = manualValue.replace(/\D/g, '');
    const num = parseInt(val, 10);
    if (isNaN(num) || num < 1000 || num > 999999) {
      setError('Enter a valid odometer reading (1000–999999)');
      return;
    }
    if (onReadingAppliedFuel) {
      Alert.alert(
        'Confirm odometer reading',
        `Use ${num.toLocaleString('en-IN')} km for this fuel entry?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Submit',
            onPress: () => {
              onReadingAppliedFuel(num);
              onClose();
            },
          },
        ]
      );
      return;
    }
    const label = readingType === 'start' ? 'Start trip' : 'End trip';
    Alert.alert(
      `Confirm ${label} odometer`,
      `Reading: ${num.toLocaleString('en-IN')} km\n\nSave this reading on the server?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Confirm & save', onPress: () => void runManualTripSubmit(num) },
      ]
    );
  };

  const label = tripMode ? (readingType === 'start' ? 'Start Trip' : 'End Trip') : 'Fuel entry';
  // Trip: always show manual entry when idle or saving (copy promises "enter manually below"). Fuel: only after OCR failure.
  const showManualEntry = tripMode
    ? step === 'idle' || step === 'uploading'
    : Boolean(error || failedImageUri) && (step === 'idle' || step === 'uploading');

  return (
    <>
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => {
          if (guidedCameraVisible) return;
          if (step === 'processing' || step === 'uploading') return;
          setStep('idle');
          onClose();
        }}
      >
        <KeyboardAvoidingView
          style={styles.overlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={0}
        >
          <View style={styles.content}>
            <Text style={styles.title}>
              {tripMode ? `Capture Odometer (${label})` : 'Capture odometer'}
            </Text>
            <Text style={styles.desc}>
              {tripMode
                ? Platform.OS === 'web'
                  ? 'Take a photo of the odometer or enter the reading manually below.'
                  : 'Align the odometer inside the on-screen frame (only that area is saved—same as fuel capture), or type the reading below.'
                : Platform.OS === 'web'
                  ? 'Photograph your dashboard odometer to fill the reading, or type it manually.'
                  : 'Use the guided camera to frame the odometer, or type the reading manually.'}
            </Text>
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            {showManualEntry && (
              <View style={styles.manualRow}>
                <TextInput
                  style={styles.manualInput}
                  value={manualValue}
                  onChangeText={(t) => {
                    setManualValue(t.replace(/\D/g, '').slice(0, 7));
                    setError('');
                  }}
                  placeholder="e.g. 45230"
                  keyboardType="number-pad"
                  placeholderTextColor={colors.gray500}
                  maxLength={7}
                />
                <TouchableOpacity style={styles.manualSubmitBtn} onPress={handleManualSubmit} disabled={step === 'uploading'}>
                  {step === 'uploading' ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.manualSubmitText}>Submit</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
            <View style={styles.actions}>
              {step === 'idle' && (
                <>
                  <TouchableOpacity style={styles.captureBtn} onPress={() => void handleCapture()}>
                    <Text style={styles.captureBtnText}>Take Photo</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                </>
              )}
              {(step === 'capturing' || step === 'processing' || step === 'uploading') && (
                <View style={styles.loadingRow}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={styles.loadingText}>
                    {step === 'capturing' && 'Opening camera...'}
                    {step === 'processing' && 'Extracting odometer...'}
                    {step === 'uploading' && 'Saving...'}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
      {Platform.OS !== 'web' && (
        <FuelCaptureCameraModal
          visible={guidedCameraVisible}
          phase="odometer"
          onDismiss={() => setGuidedCameraVisible(false)}
          onCaptured={(uri) => {
            setGuidedCameraVisible(false);
            void processCapturedUri(uri);
          }}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 24,
  },
  content: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
  },
  title: { fontSize: 18, fontWeight: '700', color: colors.foreground, marginBottom: 8 },
  desc: { fontSize: 14, color: colors.gray600, marginBottom: 16, lineHeight: 20 },
  errorText: { fontSize: 14, color: '#dc2626', marginBottom: 12 },
  manualRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  manualInput: {
    flex: 1,
    backgroundColor: colors.gray50,
    borderWidth: 1,
    borderColor: colors.gray200,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.foreground,
  },
  manualSubmitBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    borderRadius: 10,
    justifyContent: 'center',
    minWidth: 90,
    alignItems: 'center',
  },
  manualSubmitText: { fontSize: 16, fontWeight: '600', color: '#fff' },
  actions: { gap: 12 },
  captureBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  captureBtnText: { fontSize: 16, fontWeight: '600', color: '#fff' },
  cancelBtn: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelBtnText: { fontSize: 16, fontWeight: '500', color: colors.gray600 },
  loadingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  loadingText: { fontSize: 14, color: colors.gray600 },
});
