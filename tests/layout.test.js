const test = require('node:test');
const assert = require('node:assert/strict');
const { ST } = require('./helpers');
const { layout } = ST.layout;
const opts = { nodeW: 200, nodeH: 70, gapX: 30, gapY: 60 };

const diamond = [
  { id: 'a', requires: [] },
  { id: 'b', requires: ['a'] },
  { id: 'c', requires: ['a'] },
  { id: 'd', requires: ['b', 'c'] },
  { id: 'e', requires: ['a', 'd'] },
];

test('every node sits on a later row than all of its prerequisites', () => {
  const L = layout(diamond, opts);
  for (const n of diamond) for (const r of n.requires) assert.ok(L.nodes[n.id].layer > L.nodes[r].layer, `${n.id} after ${r}`);
  assert.equal(L.nodes.e.layer, 3);
});
test('nodes on the same row never overlap', () => {
  const many = [{ id: 'r', requires: [] }];
  for (let i = 0; i < 7; i++) many.push({ id: 'k' + i, requires: ['r'] });
  const L = layout(many, opts);
  const xs = many.slice(1).map((n) => L.nodes[n.id].x).sort((p, q) => p - q);
  for (let i = 1; i < xs.length; i++) assert.ok(xs[i] - xs[i - 1] >= opts.nodeW + opts.gapX - 0.01);
});
test('all coordinates are inside the reported canvas size', () => {
  const L = layout(diamond, opts);
  for (const id in L.nodes) {
    assert.ok(L.nodes[id].x >= 0 && L.nodes[id].x + opts.nodeW <= L.width);
    assert.ok(L.nodes[id].y >= 0 && L.nodes[id].y + opts.nodeH <= L.height);
  }
});
test('an edge that skips rows is routed through one point per skipped row', () => {
  const L = layout(diamond, opts);
  const long = L.edges.find((e) => e.from === 'a' && e.to === 'e');
  assert.equal(long.points.length, 4); // start, 2 skipped rows, end
  const short = L.edges.find((e) => e.from === 'a' && e.to === 'b');
  assert.equal(short.points.length, 2);
});
test('a single child is centred under its single parent', () => {
  const L = layout([{ id: 'a', requires: [] }, { id: 'b', requires: ['a'] }], opts);
  assert.equal(L.nodes.a.x, L.nodes.b.x);
});
test('unknown prerequisites are ignored and the result is deterministic', () => {
  const nodes = [{ id: 'a', requires: ['ghost'] }, { id: 'b', requires: ['a'] }];
  assert.deepEqual(layout(nodes, opts), layout(nodes, opts));
  assert.equal(layout(nodes, opts).nodes.a.layer, 0);
});
