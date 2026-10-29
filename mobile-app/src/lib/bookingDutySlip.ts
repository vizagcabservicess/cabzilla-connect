import { Alert } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { getResolvedApiOrigin } from '../config';
import { authAPI } from '../services/authAPI';

/** Download the booking duty slip and open the share sheet (WhatsApp, save, print). */
export async function shareBookingDutySlip(bookingId: number, tripCode: string, dutyDayId?: number): Promise<void> {
  const token = await authAPI.getStoredToken();
  if (!token) {
    Alert.alert('Duty slip', 'Sign in again, then open the duty slip.');
    return;
  }
  const safe = tripCode.replace(/[^\w.-]+/g, '-') || `booking-${bookingId}`;
  const directory = FileSystem.cacheDirectory;
  if (!directory) {
    Alert.alert('Duty slip', 'File storage is not available on this device.');
    return;
  }
  const path = `${directory}duty-slip-${safe}${dutyDayId ? `-day-${dutyDayId}` : ''}.pdf`;
  const url = `${getResolvedApiOrigin()}/api/driver/duty-slip-pdf.php?bookingId=${bookingId}${dutyDayId ? `&dutyDayId=${dutyDayId}` : ''}`;
  const result = await FileSystem.downloadAsync(url, path, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (result.status !== 200) {
    Alert.alert('Duty slip', 'The duty slip could not be created. Upload duty-slip-pdf.php and try again.');
    return;
  }
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(result.uri, {
      mimeType: 'application/pdf',
      dialogTitle: `Duty slip ${tripCode}`,
      UTI: 'com.adobe.pdf',
    });
    return;
  }
  Alert.alert('Duty slip', 'The slip was saved, but this device cannot open the share sheet.');
}
