const test = require('node:test');
const assert = require('node:assert/strict');
const { ST } = require('./helpers');
const u = ST.util;

test('weekStart returns the Monday of the week', () => {
  assert.equal(u.weekStart('2026-11-10'), '2026-11-09'); // Tuesday
  assert.equal(u.weekStart('2026-11-09'), '2026-11-09'); // Monday
  assert.equal(u.weekStart('2026-11-15'), '2026-11-09'); // Sunday
});
test('weekDays lists Monday to Sunday', () => {
  const d = u.weekDays('2026-11-12');
  assert.equal(d.length, 7);
  assert.equal(d[0], '2026-11-09');
  assert.equal(d[6], '2026-11-15');
});
test('addDays crosses month and year boundaries', () => {
  assert.equal(u.addDays('2026-12-31', 1), '2027-01-01');
  assert.equal(u.addDays('2026-03-01', -1), '2026-02-28');
});
test('daysBetween counts whole days across a daylight saving change', () => {
  assert.equal(u.daysBetween('2026-03-27', '2026-03-30'), 3);
  assert.equal(u.daysBetween('2026-11-10', '2026-11-10'), 0);
});
test('hash is stable and differs for different text', () => {
  assert.equal(u.hash('abc'), u.hash('abc'));
  assert.notEqual(u.hash('abc'), u.hash('abd'));
});
test('uid values are unique', () => {
  const s = new Set(Array.from({ length: 500 }, () => u.uid()));
  assert.equal(s.size, 500);
});
