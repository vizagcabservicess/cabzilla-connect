/**
 * Event & Duty helpers.
 * Run: npx tsx --tsconfig tsconfig.json src/lib/eventDuty.selftest.ts
 */
import assert from 'node:assert/strict';
import {
  calculateDutyKm,
  canCloseOdometer,
  datesBetween,
  driverRegistrationMessage,
  extractOdometerReading,
  formatDutyDateRange,
  parseAadhaarOcr,
  parseDlOcr,
  parseDocumentOcr,
  parseRcOcr,
  billableDutyEnd,
  dutyClosingTime,
  dutyDurationMinutes,
  formatDutyDuration,
  formatDutyDurationCompact,
  formatReportDutyDuration,
  fromDutyTimeInput,
  scheduledDutyStart,
  toDutyTimeInput,
  formatGps,
  formatReportingTime,
  trackSignal,
  formatLastSeen,
  homeShortcutPlatform,
  homeShortcutStartPath,
  isEmbeddedMobileBrowser,
  isRegisteredEventVehicle,
  isShareVehicleAssigned,
  mapsUrl,
  parseReportTable,
  reportPdfFileName,
  shareListStats,
  tripPromptResultMessage,
  isValidAadhaar,
  isValidIndianDl,
  isValidIndianMobile,
  maskAadhaar,
  normalizeVehicleReg,
} from './eventDuty';
import { base64ToBytes, buildZipStore, crc32, decodeMediaBytes, detectDocExt, documentsHtmlPage, readStoredZipFile, sliceToDocument, zipPathFromTitle, zipSafeName } from './zipStore';

let failed = 0;
let passed = 0;

function check(name: string, fn: () => void) {
  try {
    fn();
    passed += 1;
    console.log(`  PASS  ${name}`);
  } catch (err) {
    failed += 1;
    console.error(`  FAIL  ${name}`);
    console.error(`        ${(err as Error).message}`);
  }
}

console.log('\n=== eventDuty helpers ===');

check('acceptance KM 45997 - 45823 = 174', () => {
  assert.equal(calculateDutyKm(45823, 45997), 174);
  assert.equal(canCloseOdometer(45823, 45997), true);
  assert.equal(canCloseOdometer(45823, 45000), false);
});

check('masks Aadhaar keeping last 4', () => {
  assert.equal(maskAadhaar('123412344821'), 'XXXX XXXX 4821');
});

check('normalizes registration uppercase', () => {
  assert.equal(normalizeVehicleReg('ap31xx1234'), 'AP31XX1234');
});

check('validates Indian mobile and Aadhaar', () => {
  assert.equal(isValidIndianMobile('9876543210'), true);
  assert.equal(isValidIndianMobile('12345'), false);
  assert.equal(isValidAadhaar('123412344821'), true);
  assert.equal(isValidAadhaar('123'), false);
  assert.equal(isValidIndianDl('AP31 20200001234'), true);
});

check('groups duty date ranges', () => {
  const range = formatDutyDateRange(['2026-10-12', '2026-10-13', '2026-10-17', '2026-10-20', '2026-10-21']);
  assert.match(range, /12/);
  assert.match(range, /and/);
  assert.deepEqual(datesBetween('2026-10-12', '2026-10-14'), ['2026-10-12', '2026-10-13', '2026-10-14']);
});

check('formats reporting time and includes pickup on driver link', () => {
  assert.equal(formatReportingTime('10:00'), '10:00 AM');
  assert.equal(formatReportingTime('18:30'), '6:30 PM');
  const text = driverRegistrationMessage({
    eventName: 'October Event',
    vehicleType: 'Urbania',
    vehicleNumber: 'AP39WQ8777',
    pickupLocation: 'Ganesh Colony, Visakhapatnam',
    reportingTime: '10:00',
    dates: ['2026-10-12'],
    url: 'https://vizagtaxihub.com/driver/register/abc',
  });
  assert.match(text, /Pickup: Ganesh Colony, Visakhapatnam/);
  assert.match(text, /Reporting: 10:00 AM/);
  assert.match(text, /Duty dates:/);
});

check('classifies live tracking freshness', () => {
  const now = Date.parse('2026-10-08T12:00:00+05:30');
  assert.equal(trackSignal('2026-10-08T11:59:30+05:30', now), 'live');
  assert.equal(trackSignal('2026-10-08T11:50:00+05:30', now), 'stale');
  assert.equal(trackSignal('2026-10-08T10:00:00+05:30', now), 'offline');
  assert.equal(trackSignal(null, now), 'none');
  assert.equal(formatLastSeen('2026-10-08T11:59:30+05:30', now), 'Live now');
  assert.equal(formatLastSeen('2026-10-08T11:42:00+05:30', now), 'Last seen 18 min ago');
});

check('formats total duty time', () => {
  const now = Date.parse('2026-10-08T13:10:25');
  assert.equal(dutyDurationMinutes('2026-10-08 12:40:25', '2026-10-08 18:10:25'), 330);
  assert.equal(dutyDurationMinutes('2026-10-08 12:40:25', null, now), 30);
  assert.equal(formatDutyDurationCompact('2026-10-08 12:40:25', '2026-10-08 18:10:25'), '5h 30m');
  assert.equal(formatDutyDuration('2026-10-08 12:40:25', '2026-10-08 18:10:25'), '5 hr 30 min');
  assert.equal(formatDutyDuration('2026-10-08 12:40:25', null, now), '30 min (ongoing)');
  assert.equal(billableDutyEnd('2026-10-08 18:10:25', '2026-10-08 14:00:00'), '2026-10-08 14:00:00');
  assert.equal(billableDutyEnd('2026-10-08 13:00:00', '2026-10-08 14:00:00'), '2026-10-08 13:00:00');
  assert.equal(billableDutyEnd(null, '2026-10-08 13:00:25'), '2026-10-08 13:00:25');
  assert.equal(billableDutyEnd('2026-10-08 18:10:25', null), '2026-10-08 18:10:25');
  assert.equal(dutyDurationMinutes('2026-10-08 12:40:25', billableDutyEnd(null, '2026-10-08 13:00:25')), 20);
  assert.equal(dutyDurationMinutes('2026-10-08 12:40:25', '2026-10-08 18:10:25', undefined, 7200), 210);
  assert.equal(formatDutyDurationCompact('2026-10-08 12:40:25', '2026-10-08 18:10:25', undefined, 7200), '3h 30m');
  assert.equal(dutyClosingTime('2026-10-08 18:10:25', '2026-10-08 14:00:00'), '2026-10-08 14:00:00');
  assert.equal(dutyClosingTime('2026-10-08 18:10:25', null), '2026-10-08 18:10:25');
  assert.equal(dutyClosingTime(null, null), null);
  assert.equal(scheduledDutyStart('2026-10-13', '07:00'), '2026-10-13 07:00:00');
  assert.equal(formatReportDutyDuration({
    dutyDate: '2026-10-13',
    reportingTime: '07:00',
    openingAt: '2026-10-13 07:51:00',
    closingAt: '2026-10-13 20:45:00',
  }), '13 hr 45 min');
  assert.equal(formatReportDutyDuration({
    dutyDate: '2026-10-13',
    openingAt: '2026-10-13 07:51:00',
    closingAt: '2026-10-13 20:45:00',
  }), '12 hr 54 min');
  assert.equal(formatReportDutyDuration({ dutyDate: '2026-10-13', reportingTime: '07:00' }), '');
  assert.equal(toDutyTimeInput('2026-10-13 07:51:41'), '2026-10-13T07:51:41');
  assert.equal(fromDutyTimeInput('2026-10-13T20:46:25'), '2026-10-13 20:46:25');
  assert.equal(fromDutyTimeInput('2026-10-13T20:46'), '2026-10-13 20:46:00');
  assert.equal(fromDutyTimeInput(''), null);
});

check('formats report GPS for maps', () => {
  const gps = { lat: 17.7235, lng: 83.3012, accuracy: 12 };
  assert.equal(formatGps(gps), '17.72350, 83.30120 (±12 m)');
  assert.equal(formatGps({ ...gps, address: 'Ganesh Colony, Visakhapatnam' }), 'Ganesh Colony, Visakhapatnam');
  assert.equal(mapsUrl(gps), 'https://maps.google.com/?q=17.7235,83.3012');
  assert.equal(mapsUrl(null), null);
});

check('reads RC photo text into vehicle fields', () => {
  const text = `Indian Union Vehicle Registration Certificate
Issued by Government of Andhra Pradesh
Regn No AP39WQ8777
Owner Name
VIZAG TAXI HUB
Son/Wife/Daughter of (In case of Individual Owner)
NA
Maker's Name: FORCE MOTORS LIMITED
Model Name: URBANIA
Vehicle Class: BUS (LPV)
Seating(in all) / Standing / Sleeper Capacity
17 / 0 / 0
Regn. Number AP39WQ8777`;
  const fields = parseRcOcr(text);
  assert.equal(fields.registrationNumber, 'AP39WQ8777');
  assert.equal(fields.ownerName, 'VIZAG TAXI HUB');
  assert.match(fields.make || '', /FORCE/i);
  assert.equal(fields.model, 'URBANIA');
  assert.equal(fields.vehicleType, 'urbania');
  assert.equal(fields.capacity, '17');
  assert.equal(parseDocumentOcr('rc', text).registrationNumber, 'AP39WQ8777');
});

check('reads DL and Aadhaar text into driver fields', () => {
  const dl = parseDlOcr('INDIAN UNION DRIVING LICENCE\nDL No AP31 20110001234\nName PITLA NAGESWARARAO');
  assert.equal(dl.licenseNumber, 'AP3120110001234');
  assert.match(dl.fullName || '', /PITLA/i);
  const aadhaar = parseAadhaarOcr('Government of India\nName: Pitla Nageswararao\n1234 5678 9012');
  assert.equal(aadhaar.aadhaarNumber, '123456789012');
  assert.match(aadhaar.fullName || '', /Pitla/i);
});

check('builds a zip folder of profile files', () => {
  assert.equal(zipSafeName('AP39WQ8777 Pitla'), 'AP39WQ8777_Pitla');
  assert.equal(zipPathFromTitle('Vehicle · RC', 'jpg'), 'Vehicle/RC.jpg');
  assert.equal(zipPathFromTitle('Driver · Driving-licence-front', 'jpg'), 'Driver/Driving-licence-front.jpg');
  const hello = new TextEncoder().encode('hello');
  assert.equal(crc32(hello), 0x3610a686);
  assert.equal(crc32(new TextEncoder().encode('123456789')), 0xcbf43926);
  assert.equal(detectDocExt(new Uint8Array([0xff, 0xd8, 0xff, 0xe0])), 'jpg');
  assert.equal(detectDocExt(new TextEncoder().encode('{"status":"error"}')), null);
  const prefixed = new Uint8Array([0x3c, 0x62, 0x72, 0x20, 0xff, 0xd8, 0xff, 0xe0]);
  assert.equal(detectDocExt(sliceToDocument(prefixed)), 'jpg');
  const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);
  const wrapped = new TextEncoder().encode(JSON.stringify({ success: true, data: btoa(String.fromCharCode(...jpeg)) }));
  assert.equal(detectDocExt(decodeMediaBytes(wrapped)), 'jpg');
  assert.deepEqual(Array.from(base64ToBytes(btoa('AB'))), [65, 66]);
  const zip = buildZipStore([
    { path: 'vehicle/RC.jpg', data: jpeg },
    { path: 'driver/Aadhaar.jpg', data: jpeg },
  ]);
  assert.equal(zip[0], 0x50);
  assert.equal(zip[1], 0x4b);
  assert.equal(zip[2], 0x03);
  assert.equal(zip[3], 0x04);
  const extracted = readStoredZipFile(zip, 'vehicle/RC.jpg');
  assert.ok(extracted);
  assert.deepEqual(Array.from(extracted), Array.from(jpeg));
  const html = documentsHtmlPage('AP39WQ8777', [{ title: 'RC', ext: 'jpg', bytes: jpeg }]);
  assert.match(html, /data:image\/jpeg;base64,/);
  assert.match(html, /<img /);
});

check('home screen shortcut opens the token page only', () => {
  const driver = '/driver/register/' + 'a'.repeat(64);
  const event = '/event/share/' + 'b'.repeat(64);
  assert.equal(homeShortcutStartPath('driver', driver), driver);
  assert.equal(homeShortcutStartPath('event', event), event);
  assert.equal(homeShortcutStartPath('driver', event), null);
  assert.equal(homeShortcutStartPath('event', '/'), null);
  assert.equal(homeShortcutStartPath('driver', driver + '/'), driver);
  assert.equal(homeShortcutPlatform('Mozilla/5.0 (iPhone)', false), 'ios');
  assert.equal(homeShortcutPlatform('Mozilla/5.0 (Linux; Android 14)', false), 'android');
  assert.equal(homeShortcutPlatform('Mozilla/5.0 (iPhone)', true), 'standalone');
  assert.equal(isEmbeddedMobileBrowser('WhatsApp/2.24'), true);
  assert.equal(isEmbeddedMobileBrowser('Mozilla/5.0 (Linux; Android 14) Chrome/120'), false);
});

check('treats only a saved registration number as a report vehicle', () => {
  assert.equal(isRegisteredEventVehicle('AP39WN0777'), true);
  assert.equal(isRegisteredEventVehicle(''), false);
  assert.equal(isRegisteredEventVehicle(null), false);
  assert.equal(isRegisteredEventVehicle('Not assigned'), false);
  assert.equal(isRegisteredEventVehicle('-'), false);
});

check('hides unassigned share rows from the event manager list', () => {
  assert.equal(isShareVehicleAssigned({ vehicleNumber: 'AP39WQ8777', driverName: 'Pitla Nageswarao' }), true);
  assert.equal(isShareVehicleAssigned({ vehicleNumber: 'Not assigned', driverName: 'Not assigned' }), false);
  assert.equal(isShareVehicleAssigned({ vehicleNumber: 'AP39WN0777', driverName: '-' }), false);
  assert.equal(isShareVehicleAssigned({ vehicleNumber: '', driverName: 'Sendil Kumar K' }), false);
  const stats = shareListStats([
    { status: 'in_progress' },
    { status: 'not_started' },
    { status: 'scheduled' },
    { status: 'completed' },
  ], '2026-10-12');
  assert.equal(stats.totalVehicles, 4);
  assert.equal(stats.pending, 2);
  assert.equal(stats.started, 2);
  assert.equal(stats.completed, 1);
});

check('tells the event manager the driver was asked to mark parking', () => {
  assert.equal(
    tripPromptResultMessage(true, { sent: 1, subscribed: 1, reason: 'sent' }),
    'Driver asked to tap In Parking when the guest is dropped.',
  );
  assert.match(tripPromptResultMessage(false, { sent: 0, subscribed: 0, reason: 'no_subscription' }), /Marked In Trip/);
  assert.match(tripPromptResultMessage(false, null), /driver duty screen/);
});

check('reads report table cells for the PDF file', () => {
  const parsed = parseReportTable(
    `<table><thead><tr><th class="sl">SL.No</th><th>Vehicle</th></tr></thead><tbody><tr><td class="sl">1</td><td>AP39 &amp; WQ</td></tr></tbody></table>`,
  );
  assert.deepEqual(parsed.headers, ['SL.No', 'Vehicle']);
  assert.deepEqual(parsed.rows, [['1', 'AP39 & WQ']]);
  assert.equal(reportPdfFileName('October 2026 Event vehicles'), 'October-2026-Event-vehicles.pdf');
});

check('reads 197759 km and ignores date overlay 2026 / 12:16', () => {
  const text = '12:15 CNG 99:59:59 197759km 8 October 2026 12:16:10 pm Ganesh Colony Visakhapatnam';
  assert.equal(extractOdometerReading(text), 197759);
  assert.equal(extractOdometerReading('8 October 2026 12:16:10 202612 197759 kilometres'), 197759);
  assert.equal(extractOdometerReading('Opening 45823 KM Closing 45997'), 45823);
  assert.equal(extractOdometerReading('8 October 2026 12:16:10 pm 2,02,612'), null);
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
