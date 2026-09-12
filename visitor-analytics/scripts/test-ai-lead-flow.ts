/**
 * Offline regression for VTH AI lead place extraction.
 * Run: npx tsx scripts/test-ai-lead-flow.ts
 */
import assert from 'node:assert/strict';
import {
  applyVisitorMessageToLead,
  heuristicExtract,
  isGarbagePlace,
  syncLeadFromLatestQuote,
  parseTourPackageFares,
  pickTourFareForVehicle,
  tourCheckoutSlug,
  buildBookingCheckoutUrl,
  type AiLeadState,
} from '../src/ai/assistant';
import { extractRoutePlaces, isLocalHourlyPackageIntent, looksLikeClockToken } from '../src/services/fareEngine';
import {
  extractFlexibleDate,
  extractFlexibleTime,
  isAccommodationIntent,
  isClarifyingQuestion,
  isTripModeQuestion,
  isTwoDayArakuIntent,
  isVehicleRateOnlyIntent,
  parseFlexibleDate,
  parseTripBlob,
  parseTripModeAnswer,
  vehicleIdsForPassengerCount,
} from '../src/ai/chatIntents';

let failed = 0;
let passed = 0;
const pending: Promise<void>[] = [];

function check(name: string, fn: () => void | Promise<void>) {
  pending.push(
    Promise.resolve()
      .then(() => fn())
      .then(() => {
        passed += 1;
        console.log(`  PASS  ${name}`);
      })
      .catch((err) => {
        failed += 1;
        console.error(`  FAIL  ${name}`);
        console.error(`        ${(err as Error).message}`);
      }),
  );
}

function blankLead(partial: Partial<AiLeadState> = {}): AiLeadState {
  return {
    id: 'test',
    customerName: 'Kumar',
    phone: '9550099336',
    pickup: null,
    dropoff: null,
    travelDate: null,
    travelTime: null,
    vehicle: null,
    status: 'collecting',
    meta: {},
    ...partial,
  };
}

console.log('\n=== extractRoutePlaces ===');
check('I need vehicle to Rajahmundry → Vizag → Rajahmundry', () => {
  const p = extractRoutePlaces('I need vehicle to Rajahmundry');
  assert.ok(p);
  assert.match(p!.from, /visakhapatnam|vizag/i);
  assert.match(p!.to, /rajahmundry/i);
  assert.ok(!/need|vehicle/i.test(p!.from));
});

check('cab to Hyderabad → Vizag → Hyderabad', () => {
  const p = extractRoutePlaces('cab to Hyderabad');
  assert.ok(p);
  assert.match(p!.to, /hyderabad/i);
  assert.ok(!/cab/i.test(p!.from));
});

check('Akkayapalem to Rajahmundry keeps both places', () => {
  const p = extractRoutePlaces('Akkayapalem to Rajahmundry');
  assert.ok(p);
  assert.match(p!.from, /akkayapalem/i);
  assert.match(p!.to, /rajahmundry/i);
});

check('please connect me to human is not a route', () => {
  const p = extractRoutePlaces('please connect me to human operator');
  assert.equal(p, null);
});

console.log('\n=== isGarbagePlace ===');
check('rejects I need vehicle', () => {
  assert.equal(isGarbagePlace('I need vehicle'), true);
});
check('rejects uncleaned pickup phrase', () => {
  assert.equal(isGarbagePlace('Pickup location is at Akkayapalem'), true);
});
check('accepts Akkayapalem', () => {
  assert.equal(isGarbagePlace('Akkayapalem'), false);
});
check('accepts Rajahmundry', () => {
  assert.equal(isGarbagePlace('Rajahmundry'), false);
});
check('accepts Novotel Visakhapatnam', () => {
  assert.equal(isGarbagePlace('Novotel Visakhapatnam'), false);
});

console.log('\n=== Kumar conversation (bug report) ===');
check('full chat ends Akkayapalem → Rajahmundry + Innova', () => {
  const lead = blankLead();
  const history: Array<{ role: string; content: string }> = [];

  applyVisitorMessageToLead(lead, 'I need vehicle to Rajahmundry', history);
  history.push({ role: 'user', content: 'I need vehicle to Rajahmundry' });
  history.push({
    role: 'assistant',
    content:
      'I can calculate that once pickup and drop are clear. Please share exact pickup area, drop, date, and vehicle.',
  });

  assert.ok(!isGarbagePlace(lead.pickup), `pickup garbage: ${lead.pickup}`);
  assert.match(String(lead.dropoff), /rajahmundry/i);
  assert.ok(!/need|vehicle/i.test(String(lead.pickup)));

  applyVisitorMessageToLead(lead, 'Pickup location is at Akkayapalem', history);
  history.push({ role: 'user', content: 'Pickup location is at Akkayapalem' });
  history.push({ role: 'assistant', content: 'Which date do you need the cab?' });

  assert.match(String(lead.pickup), /akkayapalem/i, `pickup=${lead.pickup}`);
  assert.ok(!/pickup location/i.test(String(lead.pickup)));
  assert.match(String(lead.dropoff), /rajahmundry/i, `drop=${lead.dropoff}`);
  assert.ok(!/akkayapalem/i.test(String(lead.dropoff)), 'drop must stay Rajahmundry');

  applyVisitorMessageToLead(lead, 'tomorrow', history);
  history.push({ role: 'user', content: 'tomorrow' });
  history.push({
    role: 'assistant',
    content: 'What pickup time should we schedule? (e.g. 10:30 AM or 14:00)',
  });
  assert.ok(lead.travelDate, 'date set');
  assert.match(String(lead.pickup), /akkayapalem/i);
  assert.match(String(lead.dropoff), /rajahmundry/i);

  applyVisitorMessageToLead(lead, '10', history);
  history.push({ role: 'user', content: '10' });
  history.push({
    role: 'assistant',
    content: 'Which vehicle do you prefer? Options: Sedan, Ertiga, Innova Crysta, Luxury Sedan, Tempo Traveller, Urbania.',
  });
  assert.ok(lead.travelTime, `time=${lead.travelTime}`);
  assert.match(String(lead.pickup), /akkayapalem/i);
  assert.match(String(lead.dropoff), /rajahmundry/i);

  applyVisitorMessageToLead(lead, 'Innova Crysta', history);
  assert.match(String(lead.vehicle), /innova/i);
  assert.match(String(lead.pickup), /akkayapalem/i, `final pickup=${lead.pickup}`);
  assert.match(String(lead.dropoff), /rajahmundry/i, `final drop=${lead.dropoff}`);
  assert.ok(!isGarbagePlace(lead.pickup));
  assert.ok(!isGarbagePlace(lead.dropoff));
});

console.log('\n=== More booking paths ===');
check('Novotel Visakhapatnam to Akkayapalem keeps Novotel (not city Vizag)', () => {
  const lead = blankLead();
  const extracted = heuristicExtract('Novotel Visakhapatnam to Akkayapalem', lead);
  applyVisitorMessageToLead(lead, 'Novotel Visakhapatnam to Akkayapalem', []);
  assert.ok(
    /novotel/i.test(String(lead.pickup)),
    `pickup=${lead.pickup} extracted=${JSON.stringify(extracted)}`,
  );
  assert.ok(!/^vizag$/i.test(String(lead.pickup)));
  assert.match(String(lead.dropoff), /akkayapalem/i);
});

check('Novotel to Akkayapalem keeps both', () => {
  const lead = blankLead();
  applyVisitorMessageToLead(lead, 'Novotel to Akkayapalem', []);
  assert.match(String(lead.pickup), /novotel/i);
  assert.match(String(lead.dropoff), /akkayapalem/i);
});

check('bare Vizag to Rajahmundry collapses pickup to Vizag', () => {
  const lead = blankLead();
  applyVisitorMessageToLead(lead, 'Vizag to Rajahmundry', []);
  assert.match(String(lead.pickup), /^vizag$/i);
  assert.match(String(lead.dropoff), /rajahmundry/i);
});

check('short reply after pickup question', () => {
  const lead = blankLead({ dropoff: 'Rajahmundry' });
  applyVisitorMessageToLead(lead, 'Akkayapalem', [
    { role: 'assistant', content: 'Got it. Where should we pick you up?' },
  ]);
  assert.match(String(lead.pickup), /akkayapalem/i);
  assert.match(String(lead.dropoff), /rajahmundry/i);
});

check('tomorrow does not wipe route', () => {
  const lead = blankLead({ pickup: 'Akkayapalem', dropoff: 'Rajahmundry' });
  applyVisitorMessageToLead(lead, 'tomorrow', [
    { role: 'assistant', content: 'Which date do you need the cab?' },
  ]);
  assert.equal(lead.pickup, 'Akkayapalem');
  assert.equal(lead.dropoff, 'Rajahmundry');
  assert.ok(lead.travelDate);
});

check('10 after time question sets time only', () => {
  const lead = blankLead({
    pickup: 'Akkayapalem',
    dropoff: 'Rajahmundry',
    travelDate: '2026-07-25',
  });
  applyVisitorMessageToLead(lead, '10', [
    { role: 'assistant', content: 'What pickup time should we schedule? (e.g. 10:30 AM or 14:00)' },
  ]);
  assert.ok(lead.travelTime);
  assert.equal(lead.pickup, 'Akkayapalem');
  assert.equal(lead.dropoff, 'Rajahmundry');
});

check('book it phrase is not a place', () => {
  const lead = blankLead({ pickup: 'Akkayapalem', dropoff: 'Rajahmundry' });
  applyVisitorMessageToLead(lead, 'kindly book it', []);
  assert.equal(lead.pickup, 'Akkayapalem');
  assert.equal(lead.dropoff, 'Rajahmundry');
});

check('one-way vs round-trip question is not a destination', () => {
  assert.equal(isTripModeQuestion('is it a one way or round trip ?'), true);
  assert.equal(isTripModeQuestion('Is this one-way fare?'), true);
  assert.equal(isClarifyingQuestion('is it a one way or round trip ?'), true);
  assert.equal(parseTripModeAnswer('is it a one way or round trip ?'), null);
  assert.equal(parseTripModeAnswer('round trip'), 'round-trip');
  assert.equal(parseTripModeAnswer('one way'), 'one-way');
  assert.equal(isGarbagePlace('is it a one way or round trip ?'), true);

  const lead = blankLead({
    pickup: 'RK Beach',
    dropoff: 'Kakinada',
    travelDate: '2026-09-04',
    travelTime: '10:30 AM',
    vehicle: 'Sedan',
    meta: { lastQuotedKm: 168, lastQuotedTripMode: 'one-way' },
  });
  applyVisitorMessageToLead(lead, 'is it a one way or round trip ?', []);
  assert.equal(lead.pickup, 'RK Beach');
  assert.match(String(lead.dropoff), /kakinada/i);
  assert.ok(!/one way|round trip/i.test(String(lead.dropoff)));
  assert.equal(lead.travelDate, '2026-09-04');
  assert.equal(lead.vehicle, 'Sedan');
});

check('are these fares round trip is not a new drop', () => {
  const lead = blankLead({ pickup: 'Vizag', dropoff: 'Hyderabad', travelDate: '2026-10-12' });
  applyVisitorMessageToLead(lead, 'are these fares for round trip or one way', []);
  assert.match(String(lead.dropoff), /hyderabad/i);
  assert.equal(lead.travelDate, '2026-10-12');
});

check('Kailasapuram to Vizianagaram', () => {
  const lead = blankLead();
  applyVisitorMessageToLead(lead, 'Kailasapuram to Vizianagaram', []);
  assert.match(String(lead.pickup), /kailasapuram/i);
  assert.match(String(lead.dropoff), /vizianagaram/i);
});

check('to Vijayawada alone defaults Vizag pickup', () => {
  const lead = blankLead();
  applyVisitorMessageToLead(lead, 'I want taxi to Vijayawada', []);
  assert.ok(lead.pickup && !isGarbagePlace(lead.pickup));
  assert.match(String(lead.dropoff), /vijayawada/i);
  assert.ok(!/want|taxi/i.test(String(lead.pickup)));
});

console.log('\n=== Book-it uses latest tour (not stale local hop) ===');
check('Araku tour quote then book-it → Araku Valley not Akkayapalem', () => {
  const lead = blankLead({
    pickup: 'RK Beach Road',
    dropoff: 'Akkayapalem',
    travelDate: '2026-07-25',
    travelTime: '10:00 AM',
    vehicle: 'Sedan',
    meta: { lastQuotedKm: 12, lastQuotedFare: 840, lastQuotedKind: 'route' },
  });
  const tourReply =
    'Araku Valley Tour (~260 km):\n' +
    '• Sedan (Dzire): ₹5,000\n' +
    '• Ertiga: ₹6,500\n' +
    '• Innova Crysta: ₹7,500\n' +
    'Reply "book it" for checkout, or share travel date / pickup time / vehicle.';
  syncLeadFromLatestQuote(lead, [{ role: 'assistant', content: tourReply }]);
  assert.match(String(lead.dropoff), /araku/i, `drop=${lead.dropoff}`);
  assert.ok(!/akkayapalem/i.test(String(lead.dropoff)));
  assert.ok(lead.pickup, 'pickup kept');
  assert.equal(lead.meta?.lastQuotedKind, 'tour');
  assert.equal(Number(lead.meta?.lastQuotedKm), 260);
  assert.equal(Number(lead.meta?.lastQuotedFare), 5000);
  const fares = lead.meta?.lastTourPackageFares as Record<string, number>;
  assert.equal(fares?.sedan, 5000);
  assert.equal(fares?.innova_crysta, 7500);
});

check('route quote then book-it overwrites stale tour', () => {
  const lead = blankLead({
    pickup: 'Vizag',
    dropoff: 'Araku Valley',
    meta: { lastQuotedKind: 'tour', lastQuotedKm: 260 },
  });
  const routeReply =
    'Vizag → Rajahmundry: ~200 km.\n' +
    '• Sedan: ₹5,200\n' +
    'Reply "book it" for checkout.';
  syncLeadFromLatestQuote(lead, [{ role: 'assistant', content: routeReply }]);
  assert.match(String(lead.dropoff), /rajahmundry/i);
  assert.equal(lead.meta?.lastQuotedKind, 'route');
});

check('tour package fares parse + vehicle pick', () => {
  const text =
    'Araku Valley Tour (~260 km):\n• Sedan (Dzire): ₹5,000\n• Innova Crysta: ₹7,500\n';
  const fares = parseTourPackageFares(text);
  assert.equal(fares.sedan, 5000);
  assert.equal(fares.innova_crysta, 7500);
  assert.equal(pickTourFareForVehicle(fares, 'Innova Crysta'), 7500);
  assert.equal(pickTourFareForVehicle(fares, 'Sedan'), 5000);
});

check('tour checkout URL goes to /tours/araku-valley-tour not outstation home', async () => {
  const lead = blankLead({
    pickup: 'RK Beach Road',
    dropoff: 'Araku Valley',
    travelDate: '2026-07-25',
    travelTime: '10:00 AM',
    vehicle: 'Sedan',
    meta: {
      lastQuotedKind: 'tour',
      lastQuotedKm: 260,
      lastQuotedFare: 5000,
      lastTourId: 'araku',
      lastTourPackageFares: { sedan: 5000, innova_crysta: 7500 },
    },
  });
  assert.equal(tourCheckoutSlug(lead), 'araku-valley-tour');
  const url = await buildBookingCheckoutUrl(lead);
  assert.match(url, /\/tours\/araku-valley-tour\?/);
  assert.match(url, /source=vth_ai/);
  assert.match(url, /fare=5000/);
  assert.ok(!/[?&]search=1/.test(url), 'must not open home outstation search');
  assert.ok(!/tripType=outstation/.test(url));

  lead.vehicle = 'Innova Crysta';
  const urlInnova = await buildBookingCheckoutUrl(lead);
  assert.match(urlInnova, /fare=7500/);
});

check('all known tour ids map to correct slugs', () => {
  const cases: Array<[string, string]> = [
    ['araku', 'araku-valley-tour'],
    ['lambasingi', 'lambasingi-tour'],
    ['vanajangi_tour', 'vanajangi-tour'],
    ['vizag_north_city_tour', 'vizag-north-city-tour'],
    ['vizag_south_city_tour', 'vizag-south-city-tour'],
    ['arasavalli_srikurmam', 'arasavalli-srikurmam-tour'],
    ['araku_vizag_3D_2N', 'araku-vizag-3d-2n'],
  ];
  for (const [tourId, slug] of cases) {
    const lead = blankLead({
      dropoff: tourId,
      meta: { lastQuotedKind: 'tour', lastTourId: tourId },
    });
    assert.equal(tourCheckoutSlug(lead), slug, `${tourId} → ${slug}`);
  }
});

check('unknown tour id does not default to Araku', () => {
  const lead = blankLead({
    meta: { lastQuotedKind: 'tour', lastTourId: 'simhachalam_day_trip', lastTourName: 'Simhachalam Day Trip' },
  });
  const slug = tourCheckoutSlug(lead);
  assert.ok(!/araku/.test(slug), `got ${slug}`);
  assert.match(slug, /simhachalam/);
});

console.log('\n=== Live chat failure patterns ===');
check('9pm to 12am is not a taxi route', () => {
  assert.equal(extractRoutePlaces('Dormitory AC accommodation for 7 persons from 9pm to 12am'), null);
  assert.equal(looksLikeClockToken('9pm'), true);
});

check('Vizag to arakku resolves as a route (not 960km junk)', () => {
  const p = extractRoutePlaces('Vizag to arakku');
  assert.ok(p);
  assert.match(p!.to, /araku/i);
});

check('Novotel to airport at 07:00 am keeps both places', () => {
  const p = extractRoutePlaces('Novotel to airport at 07:00 am');
  assert.ok(p, 'expected route');
  assert.match(p!.from, /novotel/i);
  assert.match(p!.to, /airport/i);
});

check('flexible dates from real chats', () => {
  assert.equal(parseFlexibleDate('15 October 2026'), '2026-10-15');
  assert.equal(parseFlexibleDate('17th October'), extractFlexibleDate('17th October'));
  assert.equal(parseFlexibleDate('25.08.26'), '2026-08-25');
  assert.equal(extractFlexibleDate('At 15 October'), '2026-10-15');
  assert.equal(extractFlexibleDate('on 7th September Monday')?.slice(5), '09-07');
  assert.ok(extractFlexibleDate('23/10/2026'));
});

check('accommodation is not a cab quote', () => {
  assert.equal(isAccommodationIntent('Dormitory AC Accommodation at Araku valley'), true);
});

check('Telugu innova rates detected as vehicle-rate intent', () => {
  assert.equal(isVehicleRateOnlyIntent('నా innova Crysta కి బేరాలు చెప్పండి ప్లేస్ 7799553874'), true);
});

check('2-day Araku is distinct from 3D2N', () => {
  assert.equal(isTwoDayArakuIntent('Aruku 2 days package'), true);
  assert.equal(isTwoDayArakuIntent('3 days 2 nights Vizag and Araku tour package'), false);
});

check('local 8hr/80km chip is detected', () => {
  assert.equal(isLocalHourlyPackageIntent('What is the local 8 hours / 80 km taxi package?'), true);
});

check('comma trip blob: airport, Jeypore, one-way, date, time, car', () => {
  const blob = parseTripBlob('Vizag airport, Jeypore odisha, one-way, 14th August, 8 AM, Small car');
  assert.match(String(blob.pickup), /airport/i);
  assert.match(String(blob.dropoff), /jeypore/i);
  assert.equal(blob.tripMode, 'one-way');
  assert.equal(blob.vehicle, 'Sedan');
  assert.ok(blob.travelDate);
});

check('15 October is date not a new destination', () => {
  const lead = blankLead({ pickup: 'Vizag', dropoff: 'Araku Valley' });
  applyVisitorMessageToLead(lead, 'At 15 October', [
    { role: 'assistant', content: 'Which date do you need the cab?' },
  ]);
  assert.equal(lead.travelDate, '2026-10-15');
  assert.match(String(lead.dropoff), /araku/i);
});

console.log('\n=== Unstructured trip dumps (any phrasing) ===');

type DumpExpect = {
  pickup?: RegExp;
  dropoff?: RegExp;
  date?: string;
  time?: RegExp;
  pax?: number;
  vehicle?: RegExp;
  notDrop?: RegExp;
};

const TRIP_DUMPS: Array<[string, string, DumpExpect]> = [
  [
    'airport arrival dump',
    '21 09 2026 MONDAY ARRIVING AT VIZAG NEW AIRPORT BY 11 30 AM 10 PERSONS DROP AT ROYAL FORT HOTEL',
    {
      pickup: /airport|bhogapuram/i,
      dropoff: /royal\s*fort/i,
      date: '2026-09-21',
      time: /11:30\s*AM/i,
      pax: 10,
      notDrop: /chennai/i,
    },
  ],
  [
    'drop first + flight origin ignored',
    'DROP AT HOTEL ROYAL FORT RAM NAGAR 10 PERSONS 21 09 2026 MONDAY 11:30 FN ARRIVING FROM CHENNAI',
    {
      dropoff: /royal\s*fort/i,
      date: '2026-09-21',
      time: /11:30\s*AM/i,
      pax: 10,
      notDrop: /chennai/i,
    },
  ],
  [
    'from A to B + date time pax vehicle',
    'need cab from Gajuwaka to Vizag airport tomorrow 5am 4 persons sedan',
    { pickup: /gajuwaka/i, dropoff: /airport/i, time: /5:00\s*AM/i, pax: 4, vehicle: /sedan/i },
  ],
  [
    'pickup from / drop at',
    'pickup from railway station drop at Novotel 25/09/2026 8pm',
    { pickup: /railway/i, dropoff: /novotel/i, date: '2026-09-25', time: /8:00\s*PM/i },
  ],
  [
    'going to city from Vizag',
    'going to Hyderabad from Vizag 6 people innova 12 Oct 6am',
    { pickup: /vizag/i, dropoff: /hyderabad/i, pax: 6, vehicle: /innova/i, time: /6:00\s*AM/i },
  ],
  [
    'from-to one way slash date',
    'from Akkayapalem to Rajahmundry one way 23-10-2026 10am',
    { pickup: /akkayapalem/i, dropoff: /rajahmundry/i, date: '2026-10-23', time: /10:00\s*AM/i },
  ],
  [
    'dest-only taxi + pax + tomorrow morning',
    'want taxi to Tuni 3 pax tomorrow morning',
    { pickup: /vizag/i, dropoff: /tuni/i, pax: 3, time: /morning/i },
  ],
  [
    'pick us from / drop RTC',
    'pick us from MVP colony drop RTC complex 4 persons',
    { pickup: /mvp/i, dropoff: /rtc/i, pax: 4 },
  ],
  [
    'landing airport drop hotel flight origin ignored',
    'coming from Delhi landing vizag airport 2pm drop The Park hotel 6 pax',
    {
      pickup: /airport/i,
      dropoff: /park/i,
      time: /2:00\s*PM/i,
      pax: 6,
      notDrop: /delhi/i,
    },
  ],
  [
    'leave for city ertiga round trip',
    'leave for Vijayawada 15.10.2026 5.30am ertiga round trip',
    { pickup: /vizag/i, dropoff: /vijayawada/i, date: '2026-10-15', time: /5:30\s*AM/i, vehicle: /ertiga/i },
  ],
  [
    'airport to locality slash date',
    'Vizag airport to Madhurawada 21/09/2026 11:30am 2 persons',
    { pickup: /airport/i, dropoff: /madhurawada/i, date: '2026-09-21', time: /11:30\s*AM/i, pax: 2 },
  ],
  [
    'collect from NAD going to Kakinada tempo',
    'collect from NAD junction going to Kakinada 8 persons tempo 26 Sep',
    { pickup: /nad/i, dropoff: /kakinada/i, pax: 8, vehicle: /tempo/i },
  ],
  [
    'comma blob still works',
    'Vizag airport, Jeypore odisha, one-way, 14th August, 8 AM, Small car',
    { pickup: /airport/i, dropoff: /jeypore/i, vehicle: /sedan/i },
  ],
  [
    'hotel to airport clock time',
    'Novotel to airport at 07:00 am',
    { pickup: /novotel/i, dropoff: /airport/i, time: /7:00\s*AM|07:00/i },
  ],
  [
    '12 members needs tempo class',
    'Vizag to Rajahmundry 12 members 25-09-2026 7am',
    { pickup: /vizag/i, dropoff: /rajahmundry/i, pax: 12, date: '2026-09-25' },
  ],
];

for (const [name, message, exp] of TRIP_DUMPS) {
  check(name, () => {
    const lead = blankLead();
    applyVisitorMessageToLead(lead, message);
    if (exp.pickup) {
      assert.match(String(lead.pickup), exp.pickup, `pickup=${lead.pickup}`);
    }
    if (exp.dropoff) {
      assert.match(String(lead.dropoff), exp.dropoff, `drop=${lead.dropoff}`);
    }
    if (exp.notDrop) {
      assert.ok(!exp.notDrop.test(String(lead.dropoff)), `drop must not match ${exp.notDrop}: ${lead.dropoff}`);
    }
    if (exp.date) assert.equal(lead.travelDate, exp.date, `date=${lead.travelDate}`);
    if (exp.time) assert.match(String(lead.travelTime), exp.time, `time=${lead.travelTime}`);
    if (exp.pax) assert.equal(lead.meta?.passengerCount, exp.pax, `pax=${lead.meta?.passengerCount}`);
    if (exp.vehicle) assert.match(String(lead.vehicle), exp.vehicle, `vehicle=${lead.vehicle}`);
    if (exp.pax && exp.pax >= 9) {
      assert.deepEqual(vehicleIdsForPassengerCount(exp.pax), ['tempo_traveller', 'bus']);
    }
  });
}

check('space date 21 09 2026', () => {
  assert.equal(extractFlexibleDate('21 09 2026 MONDAY ARRIVING AT VIZAG NEW AIRPORT'), '2026-09-21');
  assert.equal(parseFlexibleDate('21 09 2026'), '2026-09-21');
});

check('11 30 AM and 11:30 FN times', () => {
  assert.equal(extractFlexibleTime('BY 11 30 AM 10 PERSONS'), '11:30 AM');
  assert.equal(extractFlexibleTime('11:30 FN ARRIVING FROM CHENNAI'), '11:30 AM');
});

check('arriving from Chennai is not a cab route', () => {
  assert.equal(
    extractRoutePlaces('DROP AT HOTEL ROYAL FORT RAM NAGAR ARRIVING FROM CHENNAI'),
    null,
  );
});

check('lead keeps airport pickup and hotel drop across the chat', () => {
  const lead = blankLead();
  applyVisitorMessageToLead(
    lead,
    '21 09 2026 MONDAY ARRIVING AT VIZAG NEW AIRPORT BY 11 30 AM 10 PERSONS DROP AT ROYAL FORT HOTEL',
  );
  assert.match(String(lead.pickup), /airport|bhogapuram/i, `pickup=${lead.pickup}`);
  assert.match(String(lead.dropoff), /royal\s*fort/i, `drop=${lead.dropoff}`);
  assert.ok(!/chennai/i.test(String(lead.dropoff)));
  assert.equal(lead.travelDate, '2026-09-21');
  assert.equal(lead.travelTime, '11:30 AM');
  assert.equal(lead.meta?.passengerCount, 10);

  applyVisitorMessageToLead(lead, 'AIRPORT ARRIVAL SPOT', [
    {
      role: 'assistant',
      content: 'Please share pickup location, drop location, one-way or round-trip, and preferred vehicle.',
    },
  ]);
  assert.match(String(lead.pickup), /airport|bhogapuram/i);
  assert.match(String(lead.dropoff), /royal\s*fort/i);

  applyVisitorMessageToLead(
    lead,
    'DROP AT HOTEL ROYAL FORT RAM NAGAR 10 PERSONS 21 09 2026 MONDAY 11:30 FN ARRIVING FROM CHENNAI',
  );
  assert.match(String(lead.pickup), /airport|bhogapuram/i, `pickup after chennai msg=${lead.pickup}`);
  assert.match(String(lead.dropoff), /royal\s*fort/i, `drop after chennai msg=${lead.dropoff}`);
  assert.ok(!/chennai/i.test(String(lead.dropoff)), 'drop must not become Chennai');
  assert.equal(lead.travelDate, '2026-09-21');
  assert.equal(lead.travelTime, '11:30 AM');

  applyVisitorMessageToLead(lead, 'FOR 10 PERSONS ANY SUITABLE VEHICLE');
  assert.equal(lead.meta?.passengerCount, 10);
  assert.match(String(lead.vehicle), /tempo|urbania/i);
  assert.match(String(lead.dropoff), /royal\s*fort/i);
});

void Promise.all(pending).then(() => {
  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
  process.exit(failed > 0 ? 1 : 0);
});
