import { Linking, Share } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { tripShareUrl, type TripTour } from './tripCart';
import { buildTourQuotationPdf, type QuotePdfInput } from './tourQuotationPdf';

export type { QuotePdfInput };

export async function shareBuildTripLink(tours: TripTour[]): Promise<void> {
  const url = tripShareUrl(tours);
  const message = [
    tours.length > 0
      ? `Your Vizag trip (${tours.length} tour${tours.length === 1 ? '' : 's'}):`
      : 'Plan your Vizag trip and add tours here:',
    ...tours.map((tour) => `• ${tour.name}`),
    '',
    url,
  ].join('\n');
  try {
    await Linking.openURL(`https://wa.me/?text=${encodeURIComponent(message)}`);
  } catch {
    await Share.share({ title: 'Build Your Trip', message, url });
  }
}

export async function sharePackagePdf(input: QuotePdfInput): Promise<void> {
  const pdf = buildTourQuotationPdf(input);
  const directory = FileSystem.cacheDirectory;
  if (!directory) throw new Error('File storage is not available');
  const path = `${directory}vizag-taxi-hub-quotation.pdf`;
  await FileSystem.writeAsStringAsync(path, pdf, { encoding: 'utf8' });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(path, { mimeType: 'application/pdf', dialogTitle: 'Vizag Taxi Hub quotation' });
  }
}
