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
import { extractRoutePlaces } from '../src/services/fareEngine';

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

void Promise.all(pending).then(() => {
  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
  process.exit(failed > 0 ? 1 : 0);
});
