const test = require('node:test');
const assert = require('node:assert/strict');
const { ST, loadData } = require('./helpers');
const data = loadData();
const TYPES = ['book', 'site', 'course', 'video', 'tool', 'practice'];

test('all eight roadmaps are present', () => {
  assert.deepEqual(data.trees.map((t) => t.id).sort(), ['compeng', 'defense', 'electronics', 'german', 'gre', 'ielts', 'pcb', 'research']);
});
test('the roadmap data has no structural errors', () => {
  assert.deepEqual(ST.model.validate(data), []);
});
test('every step says what to do and where to learn it', () => {
  for (const t of data.trees) for (const n of t.nodes) {
    assert.ok(n.about && n.about.length > 20, n.id + ' about');
    assert.ok(n.tasks.length >= 2, n.id + ' tasks');
    assert.ok(n.resources.length >= 1, n.id + ' resources');
    assert.equal(new Set(n.tasks).size, n.tasks.length, n.id + ' duplicate task text');
  }
});
test('every resource has a known type, a title and a well-formed https link if it has one', () => {
  for (const t of data.trees) for (const n of t.nodes) for (const r of n.resources) {
    assert.ok(TYPES.includes(r[0]), n.id + ' type ' + r[0]);
    assert.ok(r[1], n.id + ' resource title');
    if (r[3]) assert.equal(new URL(r[3]).protocol, 'https:', n.id + ' ' + r[3]);
  }
});
test('every roadmap has a summary, a pace suggestion and at least 12 steps', () => {
  for (const t of data.trees) {
    assert.ok(t.summary && t.pace, t.id);
    assert.ok(t.nodes.length >= 12, t.id + ' has ' + t.nodes.length);
  }
});
