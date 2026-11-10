const test = require('node:test');
const assert = require('node:assert/strict');
const { ST } = require('./helpers');
const m = ST.model;
const store = ST.store;

const data = () => ({ trees: [{
  id: 't', title: 'T', group: 'Exams', branches: { a: 'A' },
  nodes: [
    { id: 'n1', title: 'One', branch: 'a', hours: 2, start: true, tasks: ['x', 'y'], resources: [['book', 'B', 'note', 'https://example.com']] },
    { id: 'n2', title: 'Two', branch: 'a', hours: 6, requires: ['n1'], tasks: ['p', 'q', 'r', 's'] },
    { id: 'n3', title: 'Three', branch: 'a', hours: 2, requires: ['n2'], tasks: [] },
  ],
}] });
const key = (t) => m.itemKey(t);

test('buildTrees turns task text into keyed items and resource rows into objects', () => {
  const [tree] = m.buildTrees(data(), store.defaultState());
  assert.deepEqual(tree.nodes[0].items.map((i) => i.text), ['x', 'y']);
  assert.equal(tree.nodes[0].items[0].key, key('x'));
  assert.deepEqual(tree.nodes[0].resources[0], { type: 'book', title: 'B', note: 'note', url: 'https://example.com', custom: false });
});
test('a node without tasks gets one implicit item so it can be completed', () => {
  const [tree] = m.buildTrees(data(), store.defaultState());
  assert.equal(tree.nodes[2].items.length, 1);
});
test('custom items, resources and nodes from state are merged in', () => {
  const s = store.defaultState();
  store.addCustomItem(s, 'n1', 'mine');
  store.addCustomResource(s, 'n1', { title: 'My site', url: 'https://x.org' });
  const id = store.addCustomNode(s, 't', 'n1', 'Extra');
  const [tree] = m.buildTrees(data(), s);
  assert.equal(tree.nodes[0].items.length, 3);
  assert.equal(tree.nodes[0].items[2].custom, true);
  assert.equal(tree.nodes[0].resources[1].custom, true);
  const extra = tree.nodes.find((n) => n.id === id);
  assert.deepEqual(extra.requires, ['n1']);
  assert.equal(extra.custom, true);
});
test('nodeProgress counts checked items', () => {
  const s = store.defaultState();
  const [tree] = m.buildTrees(data(), s);
  store.setItem(s, 'n1', key('x'), true);
  const p = m.nodeProgress(tree.nodes[0], s);
  assert.deepEqual([p.done, p.total, p.pct, p.complete], [1, 2, 50, false]);
});
test('nodeStatus: locked until prerequisites are complete, then ready, active, done', () => {
  const s = store.defaultState();
  const [tree] = m.buildTrees(data(), s);
  const st = (i) => m.nodeStatus(tree, tree.nodes[i], s);
  assert.deepEqual([st(0), st(1), st(2)], ['ready', 'locked', 'locked']);
  store.setItem(s, 'n1', key('x'), true);
  assert.equal(st(0), 'active');
  store.setItem(s, 'n1', key('y'), true);
  assert.deepEqual([st(0), st(1)], ['done', 'ready']);
});
test('treeProgress weights nodes by their hours', () => {
  const s = store.defaultState();
  const [tree] = m.buildTrees(data(), s);
  store.setItem(s, 'n1', key('x'), true);
  store.setItem(s, 'n1', key('y'), true); // 2h of 10h done
  store.setItem(s, 'n2', key('p'), true); // quarter of 6h = 1.5h
  const p = m.treeProgress(tree, s);
  assert.equal(p.pct, 35);
  assert.equal(p.doneNodes, 1);
  assert.equal(p.totalNodes, 3);
  assert.equal(p.hoursTotal, 10);
  assert.equal(p.hoursLeft, 6.5);
});
test('nextUp offers unchecked items from ready and active nodes only', () => {
  const s = store.defaultState();
  const trees = m.buildTrees(data(), s);
  store.setItem(s, 'n1', key('x'), true);
  const next = m.nextUp(trees, s, 10);
  assert.deepEqual(next.map((n) => n.item.text), ['y']);
});
test('blockPace reports the weekly hours needed to finish on time', () => {
  const s = store.defaultState();
  const [tree] = m.buildTrees(data(), s);
  const pace = m.blockPace({ treeId: 't', start: '2026-11-02', end: '2026-11-29' }, tree, s, '2026-11-16');
  assert.equal(pace.phase, 'active');
  assert.equal(pace.daysLeft, 14);
  assert.equal(pace.hoursLeft, 10);
  assert.equal(pace.hoursPerWeek, 5);
  assert.equal(m.blockPace({ treeId: 't', start: '2027-01-01', end: '2027-01-31' }, tree, s, '2026-11-16').phase, 'upcoming');
  assert.equal(m.blockPace({ treeId: 't', start: '2026-01-01', end: '2026-01-31' }, tree, s, '2026-11-16').phase, 'past');
});
test('validate reports duplicate ids, unknown prerequisites, cycles and missing start', () => {
  const bad = { trees: [{ id: 't', title: 'T', branches: { a: 'A' }, nodes: [
    { id: 'a', title: 'A', branch: 'a', hours: 1, requires: ['b'], tasks: ['x'] },
    { id: 'b', title: 'B', branch: 'a', hours: 1, requires: ['a'], tasks: ['x'] },
    { id: 'b', title: 'B2', branch: 'zz', hours: 1, requires: ['a', 'nope'], tasks: ['x'] },
  ] }] };
  const errs = m.validate(bad).join('\n');
  assert.match(errs, /duplicate/i);
  assert.match(errs, /unknown prerequisite/i);
  assert.match(errs, /cycle/i);
  assert.match(errs, /start/i);
  assert.match(errs, /branch/i);
  assert.deepEqual(m.validate(data()), []);
});
