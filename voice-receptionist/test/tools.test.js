const test = require('node:test');
const assert = require('node:assert');
const { computeFreeSlots } = require('../src/slots');
const { findExistingBooking, validateBooking } = require('../src/booking-guard');

const NOW = '2026-09-14T10:10';           // Monday morning
const base = { date: '2026-09-15', now: NOW, hours: { open: '08:00', close: '19:00', lunch: ['13:00', '14:00'] } };

test('empty day offers 3 spread-out slots', () => {
  const r = computeFreeSlots(base);
  assert.deepStrictEqual(r.slots, ['08:00', '14:00', '18:30']);
  assert.strictEqual(r.available, true);
});

test('lunch break is never offered', () => {
  const r = computeFreeSlots({ ...base, max: 100 });
  assert.ok(!r.slots.includes('13:00') && !r.slots.includes('13:30'));
});

test('busy events block overlapping slots', () => {
  const events = [{ start: '2026-09-15T08:00', end: '2026-09-15T10:00' }];
  const r = computeFreeSlots({ ...base, period: 'morning', events, max: 100 });
  assert.strictEqual(r.slots[0], '10:00');
});

test('period filter: afternoon only (pt-PT alias)', () => {
  const r = computeFreeSlots({ ...base, period: 'tarde', max: 100 });
  assert.ok(r.slots.every(s => s >= '14:00'));
});

test('today: no slots in the past', () => {
  const r = computeFreeSlots({ ...base, date: '2026-09-14', max: 100 });
  assert.strictEqual(r.slots[0], '10:30');
});

test('past date and closed day are refused', () => {
  assert.strictEqual(computeFreeSlots({ ...base, date: '2026-09-10' }).reason, 'PAST_DATE');
  assert.strictEqual(computeFreeSlots({ ...base, date: '2026-09-20' }).reason, 'CLOSED'); // Sunday
});

test('fully booked day', () => {
  const events = [{ start: '2026-09-15T00:00', end: '2026-09-16T00:00' }];
  assert.strictEqual(computeFreeSlots({ ...base, events }).reason, 'FULLY_BOOKED');
});

test('duplicate guard matches name ignoring accents and case', () => {
  const day = [{ id: 'ev1', summary: '[DEMO] Joana Simões — Cardiologia', description: 'Tel: +351 912 000 000' }];
  assert.strictEqual(findExistingBooking(day, { name: 'joana simoes' }).id, 'ev1');
  assert.strictEqual(findExistingBooking(day, { name: 'Rui Costa', phone: '912000000' }).id, 'ev1');
  assert.strictEqual(findExistingBooking(day, { name: 'Rui Costa', phone: '913111111' }), null);
});

test('booking validation', () => {
  const ok = { name: 'Ana', phone: '+351 912 000 000', start: '2026-09-15T10:00' };
  assert.deepStrictEqual(validateBooking(ok, NOW), { ok: true });
  assert.strictEqual(validateBooking({ ...ok, phone: '91' }, NOW).reason, 'INCOMPLETE_PHONE');
  assert.strictEqual(validateBooking({ ...ok, start: '2026-09-13T10:00' }, NOW).reason, 'PAST_DATE');
  assert.strictEqual(validateBooking({ name: 'Ana' }, NOW).reason, 'MISSING:phone,start');
});
