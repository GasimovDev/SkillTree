const test = require('node:test');
const assert = require('node:assert/strict');
const { ST, memoryStorage } = require('./helpers');
const s = ST.store;

test('state survives a save and load round trip', () => {
  const mem = memoryStorage();
  const st = s.defaultState();
  s.addTask(st, { title: 'Read chapter 1', date: '2026-11-10' });
  s.save(mem, st);
  assert.deepEqual(s.load(mem).tasks, st.tasks);
});
test('load falls back to a fresh state when storage is empty or corrupt', () => {
  const mem = memoryStorage();
  assert.deepEqual(s.load(mem), s.defaultState());
  mem.setItem(s.KEY, '{not json');
  assert.deepEqual(s.load(mem), s.defaultState());
});
test('tasks can be added, edited, moved, toggled and removed', () => {
  const st = s.defaultState();
  const id = s.addTask(st, { title: '  Practice set  ', date: '2026-11-10', minutes: 45 });
  assert.equal(st.tasks[0].title, 'Practice set');
  s.moveTask(st, id, '2026-11-12');
  assert.equal(st.tasks[0].date, '2026-11-12');
  s.toggleTask(st, id);
  assert.equal(st.tasks[0].done, true);
  s.updateTask(st, id, { title: 'New name' });
  assert.equal(st.tasks[0].title, 'New name');
  s.removeTask(st, id);
  assert.equal(st.tasks.length, 0);
});
test('a task with an empty title is not added', () => {
  const st = s.defaultState();
  assert.equal(s.addTask(st, { title: '   ', date: null }), null);
  assert.equal(st.tasks.length, 0);
});
test('finishing a linked task ticks the tree item, and ticking the item finishes the task', () => {
  const st = s.defaultState();
  const id = s.addTask(st, { title: 'Do x', date: '2026-11-10', nodeId: 'n1', itemKey: 'k1' });
  s.toggleTask(st, id);
  assert.equal(st.checks.n1.k1, true);
  s.setItem(st, 'n1', 'k1', false);
  assert.equal(st.tasks[0].done, false);
  s.setItem(st, 'n1', 'k1', true);
  assert.equal(st.tasks[0].done, true);
});
test('carryOver moves unfinished tasks from earlier days to the given day', () => {
  const st = s.defaultState();
  const a = s.addTask(st, { title: 'old open', date: '2026-11-03' });
  const b = s.addTask(st, { title: 'old done', date: '2026-11-03' });
  s.toggleTask(st, b);
  s.addTask(st, { title: 'future', date: '2026-11-20' });
  s.addTask(st, { title: 'backlog', date: null });
  const moved = s.carryOver(st, '2026-11-10');
  assert.equal(moved, 1);
  assert.equal(st.tasks.find((t) => t.id === a).date, '2026-11-10');
  assert.equal(st.tasks.find((t) => t.id === b).date, '2026-11-03');
  assert.equal(st.tasks[2].date, '2026-11-20');
  assert.equal(st.tasks[3].date, null);
});
test('removing a custom node also removes its checks, notes, links and dependents\' links', () => {
  const st = s.defaultState();
  const id = s.addCustomNode(st, 't', 'n1', 'Extra');
  const child = s.addCustomNode(st, 't', id, 'Child');
  s.setItem(st, id, 'done', true);
  s.setNote(st, id, 'hello');
  s.addTask(st, { title: 'linked', date: null, nodeId: id, itemKey: 'done' });
  s.removeCustomNode(st, id);
  assert.equal(st.custom.nodes.find((n) => n.id === id), undefined);
  assert.equal(st.checks[id], undefined);
  assert.equal(st.notes[id], undefined);
  assert.equal(st.tasks[0].nodeId, undefined);
  assert.deepEqual(st.custom.nodes.find((n) => n.id === child).requires, ['n1']);
});
test('custom items and resources can be removed again', () => {
  const st = s.defaultState();
  const k = s.addCustomItem(st, 'n1', 'mine');
  s.setItem(st, 'n1', k, true);
  s.removeCustomItem(st, 'n1', k);
  assert.equal(st.custom.items.n1.length, 0);
  assert.equal(st.checks.n1[k], undefined);
  const r = s.addCustomResource(st, 'n1', { title: 'Site', url: 'https://x.org' });
  s.removeCustomResource(st, 'n1', r);
  assert.equal(st.custom.resources.n1.length, 0);
});
test('study blocks can be added, changed and removed, and reject an end before the start', () => {
  const st = s.defaultState();
  assert.equal(s.addBlock(st, { treeId: 't', start: '2026-12-10', end: '2026-12-01' }), null);
  const id = s.addBlock(st, { treeId: 't', start: '2026-12-01', end: '2026-12-31' });
  s.updateBlock(st, id, { end: '2027-01-15' });
  assert.equal(st.blocks[0].end, '2027-01-15');
  s.removeBlock(st, id);
  assert.equal(st.blocks.length, 0);
});
test('a backup can be exported and imported, and rubbish is rejected', () => {
  const st = s.defaultState();
  s.addTask(st, { title: 'keep me', date: null });
  s.setItem(st, 'n1', 'k', true);
  const back = s.importJSON(s.exportJSON(st));
  assert.equal(back.tasks[0].title, 'keep me');
  assert.equal(back.checks.n1.k, true);
  assert.throws(() => s.importJSON('hello'));
  assert.throws(() => s.importJSON('{"foo":1}'));
});
test('importing an older or partial backup fills in missing sections', () => {
  const back = s.importJSON(JSON.stringify({ app: 'skilltree', state: { checks: { a: { b: true } } } }));
  assert.deepEqual(back.tasks, []);
  assert.deepEqual(back.custom.nodes, []);
  assert.equal(back.checks.a.b, true);
});
