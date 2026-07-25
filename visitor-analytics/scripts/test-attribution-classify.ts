/**
 * Quick unit checks for traffic-source classification used by attribution reports.
 * Run: npx tsx scripts/test-attribution-classify.ts
 */
import {
  classifyTrafficSource,
  parseUtm,
  resolveSessionAttribution,
} from '../src/utils/helpers.js';

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg);
}

assert(
  classifyTrafficSource({ gclid: 'Cj0KCQ', utmSource: null, utmMedium: null, referrer: null }) ===
    'Google Ads',
  'gclid => Google Ads',
);

assert(
  classifyTrafficSource({
    utmSource: 'google',
    utmMedium: 'cpc',
    gclid: null,
    referrer: null,
  }) === 'Google Ads',
  'google/cpc => Google Ads',
);

assert(
  classifyTrafficSource({
    gadSource: '1',
    utmSource: null,
    utmMedium: null,
    gclid: null,
    referrer: null,
  }) === 'Google Ads',
  'gad_source => Google Ads',
);

assert(
  classifyTrafficSource({
    landingPage: '/tours/araku-valley-tour?gad_source=1&gad_campaignid=1520425',
    utmSource: null,
    utmMedium: null,
    gclid: null,
    referrer: null,
  }) === 'Google Ads',
  'landing gad_source => Google Ads',
);

assert(
  classifyTrafficSource({
    exitPage: '/vehicle/urbania?utm_source=google&utm_medium=cpc&utm_campaign=Innova',
    utmSource: null,
    utmMedium: null,
    gclid: null,
    referrer: null,
  }) === 'Google Ads',
  'exit utm google/cpc => Google Ads (backfill)',
);

assert(
  classifyTrafficSource({
    utmSource: null,
    utmMedium: null,
    gclid: null,
    referrer: 'https://www.google.com/search?q=taxi',
  }) === 'Organic Search',
  'google referrer => Organic Search',
);

assert(
  classifyTrafficSource({
    utmSource: null,
    utmMedium: null,
    gclid: null,
    referrer: null,
  }) === 'Direct',
  'no source => Direct',
);

assert(
  classifyTrafficSource({
    utmSource: 'facebook',
    utmMedium: 'paid',
    gclid: null,
    referrer: null,
  }) === 'Facebook',
  'facebook => Facebook',
);

assert(
  classifyTrafficSource({
    utmSource: 'instagram',
    utmMedium: 'social',
    gclid: null,
    referrer: null,
  }) === 'Instagram',
  'instagram => Instagram',
);

assert(
  classifyTrafficSource({
    utmSource: null,
    utmMedium: null,
    gclid: null,
    referrer: 'https://partner.example.com/page',
  }) === 'Referral',
  'unknown referrer => Referral',
);

const utm = parseUtm(
  '/?utm_source=google&utm_medium=cpc&utm_campaign=Airport%20Taxi&utm_term=vizag%20airport&gclid=ABC123',
  null,
);
assert(utm.utmCampaign === 'Airport Taxi', 'parse utm_campaign');
assert(utm.utmTerm === 'vizag airport', 'parse utm_term');
assert(utm.gclid === 'ABC123', 'parse gclid');

const auto = parseUtm('/?gad_source=1&gad_campaignid=15204251234', null);
assert(auto.gadSource === '1', 'parse gad_source');
assert(auto.utmSource === 'google', 'auto-tag implies google source');
assert(auto.utmMedium === 'cpc', 'auto-tag implies cpc medium');
assert(auto.utmCampaign === 'gad:15204251234', 'auto-tag campaign from gad_campaignid');

const resolved = resolveSessionAttribution({
  utmSource: null,
  utmMedium: null,
  utmCampaign: null,
  gclid: null,
  referrer: null,
  landingPage: '/',
  exitPage: '/vehicle/tempo-traveller?gad_source=1&gad_campaignid=99',
});
assert(resolved.gadSource === '1', 'resolve from exit_page');
assert(
  classifyTrafficSource({
    utmSource: resolved.utmSource,
    utmMedium: resolved.utmMedium,
    gclid: resolved.gclid,
    gadSource: resolved.gadSource,
    referrer: resolved.referrer,
  }) === 'Google Ads',
  'resolved exit ads => Google Ads',
);

console.log('OK — attribution classify tests passed');
