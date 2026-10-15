import { Linking, Share } from 'react-native';
import { sharePdfFile } from './eventReportExport';
import { tripShareUrl, type TripTour } from './tripCart';

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

export async function sharePackagePdf(input: {
  tours: TripTour[];
  guest?: string;
  phone?: string;
  pickup?: string;
  vehicle?: string;
  amount?: string;
  notes?: string;
}): Promise<void> {
  const days = input.tours.reduce((sum, tour) => sum + (tour.days || 1), 0);
  const subtitle = [
    input.guest ? `Guest: ${input.guest}` : '',
    input.phone ? `Mobile: ${input.phone}` : '',
    input.pickup ? `Pickup: ${input.pickup}` : '',
    input.vehicle ? `Vehicle: ${input.vehicle}` : '',
    `${days} day${days === 1 ? '' : 's'}`,
    input.amount ? `Amount: Rs ${input.amount}` : '',
  ].filter(Boolean).join('  |  ');
  const rows = input.tours.map((tour, index) => [
    `${index + 1}. ${tour.name}`,
    `${tour.days || 1}`,
  ]);
  if (input.notes?.trim()) rows.push(['Notes', input.notes.trim()]);
  await sharePdfFile('vizag-taxi-hub-quotation.pdf', {
    heading: 'Vizag Taxi Hub quotation',
    subtitle,
    headers: ['Package', 'Days'],
    rows: rows.length > 0 ? rows : [['No packages selected', '-']],
  });
}
