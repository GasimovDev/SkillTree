const test = require('node:test');
const assert = require('node:assert/strict');
const { ST, loadData } = require('./helpers');
const data = loadData();
const TYPES = ['book', 'site', 'course', 'video', 'tool', 'practice'];

test('all ten roadmaps are present', () => {
  assert.deepEqual(data.trees.map((t) => t.id).sort(), ['audiofw', 'compeng', 'defense', 'digitalhw', 'electronics', 'german', 'gre', 'ielts', 'pcb', 'research']);
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
test('software-first roadmaps never put a hardware purchase in front of a software step', () => {
  for (const id of ['audiofw', 'digitalhw']) {
    const t = data.trees.find((x) => x.id === id);
    assert.ok(t, id + ' exists');
    assert.ok(t.branches.buy, id + ' has a hardware branch');
    const byId = Object.fromEntries(t.nodes.map((n) => [n.id, n]));
    const buy = t.nodes.filter((n) => n.branch === 'buy');
    assert.ok(buy.length >= 2, id + ' marks its hardware steps');
    assert.ok(t.nodes.length - buy.length >= 12, id + ' has at least 12 steps that need no hardware');
    for (const n of t.nodes) {
      if (n.start) assert.notEqual(n.branch, 'buy', n.id);
      if (n.branch !== 'buy') for (const r of n.requires || []) assert.notEqual(byId[r].branch, 'buy', n.id + ' requires hardware step ' + r);
    }
  }
});
