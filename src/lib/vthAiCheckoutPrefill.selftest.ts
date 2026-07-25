/**
 * Offline regression for AI checkout prefill geocoding.
 * Run from repo root:
 *   npx tsx --tsconfig tsconfig.json src/lib/vthAiCheckoutPrefill.selftest.ts
 */
import assert from 'node:assert/strict';
import { locationFromPlaceName } from './vthAiCheckoutPrefill';

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

console.log('\n=== locationFromPlaceName ===');

check('Novotel keeps landmark coords (not city center)', () => {
  const loc = locationFromPlaceName(
    'Novotel Visakhapatnam, Beach Road, Visakhapatnam, Andhra Pradesh, India',
    'p',
  );
  assert.match(loc.name, /novotel/i);
  assert.ok(Math.abs(loc.lat - 17.7105) < 0.02, `lat=${loc.lat}`);
  assert.ok(Math.abs(loc.lng - 83.3162) < 0.02, `lng=${loc.lng}`);
});

check('Akkayapalem distinct from Novotel', () => {
  const a = locationFromPlaceName('Akkayapalem, Visakhapatnam, Andhra Pradesh, India', 'd');
  const b = locationFromPlaceName('Novotel Visakhapatnam', 'p');
  assert.match(a.name, /akkayapalem/i);
  assert.notEqual(`${a.lat},${a.lng}`, `${b.lat},${b.lng}`);
});

check('city-only Visakhapatnam still resolves', () => {
  const c = locationFromPlaceName('Visakhapatnam', 'c');
  assert.ok(c.lat > 17 && c.lng > 83);
});

check('Rajahmundry is not forced to Vizag center via substring', () => {
  const r = locationFromPlaceName('Rajahmundry, Andhra Pradesh, India', 'r');
  assert.match(r.name, /rajahmundry/i);
  const isVizagCenter = Math.abs(r.lat - 17.7243) < 0.01 && Math.abs(r.lng - 83.3052) < 0.01;
  assert.equal(isVizagCenter, false, `unexpected vizag center for ${r.lat},${r.lng}`);
});

check('Akkayapalem → Rajahmundry checkout places stay distinct', () => {
  const p = locationFromPlaceName('Akkayapalem', 'vth-ai-pickup');
  const d = locationFromPlaceName('Rajahmundry', 'vth-ai-drop');
  assert.match(p.name, /akkayapalem/i);
  assert.match(d.name, /rajahmundry/i);
  assert.notEqual(`${p.lat},${p.lng}`, `${d.lat},${d.lng}`);
  // Outstation span — not a ~0 km local hop
  const dlat = p.lat - d.lat;
  const dlng = p.lng - d.lng;
  assert.ok(Math.hypot(dlat, dlng) > 0.5, 'coords too close for Vizag→Rajahmundry');
});

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
process.exit(failed > 0 ? 1 : 0);
