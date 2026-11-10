// The user's saved state: progress ticks, notes, own additions, planner tasks and study blocks.
(function () {
  var ST = (globalThis.ST = globalThis.ST || {});
  var KEY = 'skilltree.state.v1';
  function defaultState() {
    return { v: 1, checks: {}, notes: {}, custom: { items: {}, resources: {}, nodes: [] }, tasks: [], blocks: [], settings: { theme: 'auto' }, lastBackup: null };
  }
  function migrate(o) {
    var d = defaultState();
    if (!o || typeof o !== 'object') return d;
    ['checks', 'notes'].forEach(function (k) { if (o[k] && typeof o[k] === 'object') d[k] = o[k]; });
    ['tasks', 'blocks'].forEach(function (k) { if (Array.isArray(o[k])) d[k] = o[k]; });
    if (o.custom && typeof o.custom === 'object') {
      if (o.custom.items) d.custom.items = o.custom.items;
      if (o.custom.resources) d.custom.resources = o.custom.resources;
      if (Array.isArray(o.custom.nodes)) d.custom.nodes = o.custom.nodes;
    }
    if (o.settings && typeof o.settings === 'object') d.settings = Object.assign(d.settings, o.settings);
    if (o.lastBackup) d.lastBackup = o.lastBackup;
    return d;
  }
  function load(storage) {
    try { var raw = storage.getItem(KEY); return raw ? migrate(JSON.parse(raw)) : defaultState(); } catch (e) { return defaultState(); }
  }
  function save(storage, state) { try { storage.setItem(KEY, JSON.stringify(state)); return true; } catch (e) { return false; } }

  function setItem(state, nodeId, key, value) {
    var c = state.checks[nodeId] || (state.checks[nodeId] = {});
    if (value) c[key] = true; else delete c[key];
    state.tasks.forEach(function (t) { if (t.nodeId === nodeId && t.itemKey === key) t.done = !!value; });
  }
  function findTask(state, id) { return state.tasks.find(function (t) { return t.id === id; }); }
  function addTask(state, t) {
    var title = (t.title || '').trim();
    if (!title) return null;
    var task = { id: ST.util.uid(), title: title, date: t.date || null, done: false };
    if (t.minutes) task.minutes = t.minutes;
    if (t.treeId) task.treeId = t.treeId;
    if (t.nodeId) { task.nodeId = t.nodeId; task.itemKey = t.itemKey; }
    state.tasks.push(task);
    return task.id;
  }
  function updateTask(state, id, patch) {
    var t = findTask(state, id); if (!t) return;
    if (patch.title !== undefined && patch.title.trim()) t.title = patch.title.trim();
    if (patch.minutes !== undefined) { if (patch.minutes) t.minutes = patch.minutes; else delete t.minutes; }
  }
  function moveTask(state, id, date) { var t = findTask(state, id); if (t) t.date = date || null; }
  function toggleTask(state, id) {
    var t = findTask(state, id); if (!t) return;
    t.done = !t.done;
    if (t.nodeId && t.itemKey) setItem(state, t.nodeId, t.itemKey, t.done);
  }
  function removeTask(state, id) { state.tasks = state.tasks.filter(function (t) { return t.id !== id; }); }
  function carryOver(state, toDate) {
    var n = 0;
    state.tasks.forEach(function (t) { if (t.date && t.date < toDate && !t.done) { t.date = toDate; n++; } });
    return n;
  }

  function addCustomItem(state, nodeId, text) {
    text = (text || '').trim(); if (!text) return null;
    var key = 'c' + ST.util.uid();
    (state.custom.items[nodeId] || (state.custom.items[nodeId] = [])).push({ key: key, text: text });
    return key;
  }
  function removeCustomItem(state, nodeId, key) {
    state.custom.items[nodeId] = (state.custom.items[nodeId] || []).filter(function (i) { return i.key !== key; });
    if (state.checks[nodeId]) delete state.checks[nodeId][key];
    state.tasks.forEach(function (t) { if (t.nodeId === nodeId && t.itemKey === key) { delete t.nodeId; delete t.itemKey; } });
  }
  function addCustomResource(state, nodeId, r) {
    var title = (r.title || '').trim(); if (!title) return null;
    var id = 'r' + ST.util.uid();
    (state.custom.resources[nodeId] || (state.custom.resources[nodeId] = [])).push({ id: id, title: title, url: (r.url || '').trim() });
    return id;
  }
  function removeCustomResource(state, nodeId, id) {
    state.custom.resources[nodeId] = (state.custom.resources[nodeId] || []).filter(function (r) { return r.id !== id; });
  }
  function addCustomNode(state, treeId, parentId, title, branch) {
    title = (title || '').trim(); if (!title) return null;
    var id = 'x' + ST.util.uid();
    state.custom.nodes.push({ id: id, treeId: treeId, title: title, requires: parentId ? [parentId] : [], hours: 2, branch: branch || null });
    return id;
  }
  function removeCustomNode(state, id) {
    var node = state.custom.nodes.find(function (n) { return n.id === id; });
    if (!node) return;
    state.custom.nodes = state.custom.nodes.filter(function (n) { return n.id !== id; });
    state.custom.nodes.forEach(function (n) {
      if (n.requires.indexOf(id) >= 0) n.requires = n.requires.filter(function (r) { return r !== id; }).concat(node.requires.filter(function (r) { return n.requires.indexOf(r) < 0; }));
    });
    delete state.checks[id]; delete state.notes[id]; delete state.custom.items[id]; delete state.custom.resources[id];
    state.tasks.forEach(function (t) { if (t.nodeId === id) { delete t.nodeId; delete t.itemKey; } });
  }
  function setNote(state, nodeId, text) { if (text && text.trim()) state.notes[nodeId] = text; else delete state.notes[nodeId]; }

  function addBlock(state, b) {
    if (!b.treeId || !b.start || !b.end || b.end < b.start) return null;
    var id = 'b' + ST.util.uid();
    state.blocks.push({ id: id, treeId: b.treeId, start: b.start, end: b.end });
    return id;
  }
  function updateBlock(state, id, patch) {
    var b = state.blocks.find(function (x) { return x.id === id; }); if (!b) return false;
    var n = Object.assign({}, b, patch);
    if (n.end < n.start) return false;
    Object.assign(b, n); return true;
  }
  function removeBlock(state, id) { state.blocks = state.blocks.filter(function (b) { return b.id !== id; }); }

  function exportJSON(state) { return JSON.stringify({ app: 'skilltree', exported: new Date().toISOString(), state: state }, null, 2); }
  function importJSON(text) {
    var o = JSON.parse(text);
    if (!o || o.app !== 'skilltree' || typeof o.state !== 'object') throw new Error('Not a Skill Tree backup file');
    return migrate(o.state);
  }

  ST.store = { KEY: KEY, defaultState: defaultState, load: load, save: save, setItem: setItem, addTask: addTask, updateTask: updateTask, moveTask: moveTask, toggleTask: toggleTask, removeTask: removeTask, carryOver: carryOver, addCustomItem: addCustomItem, removeCustomItem: removeCustomItem, addCustomResource: addCustomResource, removeCustomResource: removeCustomResource, addCustomNode: addCustomNode, removeCustomNode: removeCustomNode, setNote: setNote, addBlock: addBlock, updateBlock: updateBlock, removeBlock: removeBlock, exportJSON: exportJSON, importJSON: importJSON };
})();
