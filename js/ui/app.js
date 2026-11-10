// App shell: state, routing, sidebar, shared helpers and event wiring.
(function () {
  var ST = globalThis.ST, U = ST.util, M = ST.model, S = ST.store;
  var views = (ST.views = {});
  var acts = (ST.acts = {});      // click handlers, keyed by data-act
  var forms = (ST.forms = {});    // submit handlers, keyed by data-form
  var changes = (ST.changes = {}); // change handlers, keyed by data-change
  var app = (ST.app = { state: null, trees: [], route: { view: 'overview' }, ui: { week: null, zoom: {}, sugTree: 'all', sugDay: null } });

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  var DAY = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function fmtDay(iso) { var d = U.parseISO(iso); return d.getDate() + ' ' + MON[d.getMonth()]; }
  function fmtLong(iso) { var d = U.parseISO(iso); return DAY[(d.getDay() + 6) % 7] + ' ' + d.getDate() + ' ' + MON[d.getMonth()] + ' ' + d.getFullYear(); }
  function hours(h) { return (Math.round(h * 10) / 10) + ' h'; }
  function tree(id) { return app.trees.find(function (t) { return t.id === id; }); }
  function findNode(id) { for (var i = 0; i < app.trees.length; i++) { var n = app.trees[i].nodes.find(function (x) { return x.id === id; }); if (n) return { tree: app.trees[i], node: n }; } return null; }
  function branchColor(t, branch) { var i = Object.keys(t.branches).indexOf(branch); return 'var(--b' + ((i < 0 ? 0 : i) % 7) + ')'; }
  function treeColor(t) { return 'var(--b' + (app.trees.indexOf(t) % 7) + ')'; }
  function ring(pct, size, stroke) {
    var r = (size - stroke) / 2, c = 2 * Math.PI * r;
    return '<svg width="' + size + '" height="' + size + '" aria-hidden="true"><circle cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + r + '" fill="none" stroke="var(--line)" stroke-width="' + stroke + '"/>' +
      '<circle cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + r + '" fill="none" stroke="var(--accent)" stroke-width="' + stroke + '" stroke-linecap="round" stroke-dasharray="' + c + '" stroke-dashoffset="' + c * (1 - pct / 100) + '"/></svg>';
  }
  function toast(msg) { var t = document.getElementById('toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toast.t); toast.t = setTimeout(function () { t.classList.remove('show'); }, 2200); }

  // One planner task row, shared by the overview and the week view.
  function taskRow(t, opts) {
    var link = t.nodeId ? findNode(t.nodeId) : null, meta = '';
    if (link) meta += '<button class="tag" data-act="open-node" data-node="' + esc(t.nodeId) + '" title="Open this step in its tree"><i class="dot" style="--c:' + treeColor(link.tree) + '"></i>' + esc(link.tree.short) + '</button>';
    if (opts && opts.showDate && t.date) meta += '<span class="tag">' + fmtDay(t.date) + '</span>';
    var move = '';
    if (opts && opts.days) {
      move = '<select class="move-sel" data-change="move-task" data-id="' + t.id + '" title="Move to another day" aria-label="Move task"><option value="">⇄</option>' +
        opts.days.map(function (d, i) { return '<option value="' + d + '">' + DAY[i] + ' ' + fmtDay(d) + '</option>'; }).join('') +
        '<option value="next">Next week</option><option value="later">Later (no date)</option></select>';
    }
    return '<div class="task' + (t.done ? ' done' : '') + '" draggable="true" data-task="' + t.id + '">' +
      '<input type="checkbox" data-change="toggle-task" data-id="' + t.id + '"' + (t.done ? ' checked' : '') + ' aria-label="Done: ' + esc(t.title) + '">' +
      '<div><div class="t-title" data-act="edit-task" data-id="' + t.id + '" title="Click to rename">' + esc(t.title) + '</div>' + (meta ? '<div class="t-meta">' + meta + '</div>' : '') + '</div>' +
      '<div class="t-tools">' + move + '<button class="icon-btn" data-act="del-task" data-id="' + t.id + '" title="Remove task" aria-label="Remove task">×</button></div></div>';
  }

  function rebuild() { app.trees = M.buildTrees(globalThis.SKILLTREE_DATA, app.state); }
  function commit(fn) { if (fn) fn(app.state); S.save(localStorage, app.state); rebuild(); render(); }
  function saveQuiet() { S.save(localStorage, app.state); }

  function parseHash() {
    var p = location.hash.replace(/^#\/?/, '').split('/');
    if (p[0] === 'tree' && tree(p[1])) return { view: 'tree', tree: p[1], node: p[2] && findNode(p[2]) ? p[2] : null };
    if (p[0] === 'week' || p[0] === 'timeline') return { view: p[0] };
    return { view: 'overview' };
  }
  function go(hash) { if (location.hash === hash) render(); else location.hash = hash; }

  function renderSide() {
    var r = app.route, groups = {}, order = [];
    app.trees.forEach(function (t) { if (!groups[t.group]) { groups[t.group] = []; order.push(t.group); } groups[t.group].push(t); });
    var nav = function (hash, label, cur, extra) { return '<button class="nav" data-act="go" data-hash="' + hash + '"' + (cur ? ' aria-current="page"' : '') + '>' + (extra || '') + '<span class="grow">' + esc(label) + '</span></button>'; };
    var h = '<div class="brand"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="4.5" r="2.5"/><circle cx="5" cy="19.5" r="2.5"/><circle cx="19" cy="19.5" r="2.5"/><path d="M12 7v4M12 11l-7 6M12 11l7 6"/></svg><span>Skill Tree</span></div>';
    h += nav('#overview', 'Overview', r.view === 'overview') + nav('#week', 'Weekly plan', r.view === 'week') + nav('#timeline', 'Timeline', r.view === 'timeline');
    order.forEach(function (g) {
      h += '<div class="nav-label">' + esc(g) + '</div>';
      groups[g].forEach(function (t) {
        var p = M.treeProgress(t, app.state);
        h += '<button class="nav" data-act="go" data-hash="#tree/' + t.id + '"' + (r.view === 'tree' && r.tree === t.id ? ' aria-current="page"' : '') + '><i class="dot" style="--c:' + treeColor(t) + '"></i><span class="grow">' + esc(t.short) + '</span><span class="pct">' + p.pct + '%</span></button>';
      });
    });
    h += '<div class="side-foot"><button class="btn sm" data-act="data-dialog">Backup and data</button><button class="btn sm ghost" data-act="theme" title="Switch light and dark">Theme</button></div>';
    document.getElementById('side').innerHTML = h;
  }

  function render() {
    app.route = parseHash();
    renderSide();
    var main = document.getElementById('main'), keep = main.querySelector('.map'), pos = keep ? [keep.scrollLeft, keep.scrollTop, keep.dataset.tree] : null;
    var det = main.querySelector('.detail'), dpos = det ? [det.scrollTop, det.dataset.node] : null, mainTop = main.scrollTop, prevView = main.dataset.view;
    main.innerHTML = views[app.route.view]();
    main.dataset.view = app.route.view + (app.route.tree || '');
    if (views[app.route.view].after) views[app.route.view].after(main, pos);
    var nd = main.querySelector('.detail'); if (nd && dpos && dpos[1] === nd.dataset.node) nd.scrollTop = dpos[0];
    main.scrollTop = prevView === main.dataset.view ? mainTop : 0;
  }

  function applyTheme() {
    var th = app.state.settings.theme;
    if (th === 'auto') th = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    document.documentElement.dataset.theme = th;
  }
  acts.theme = function () { var cur = document.documentElement.dataset.theme; app.state.settings.theme = cur === 'dark' ? 'light' : 'dark'; saveQuiet(); applyTheme(); };
  acts.go = function (el) { go(el.dataset.hash); };
  acts['open-node'] = function (el) { var f = findNode(el.dataset.node); if (f) go('#tree/' + f.tree.id + '/' + f.node.id); };
  acts['del-task'] = function (el) { commit(function (s) { S.removeTask(s, el.dataset.id); }); };
  acts['edit-task'] = function (el) {
    var t = app.state.tasks.find(function (x) { return x.id === el.dataset.id; }); if (!t) return;
    var inp = document.createElement('input'); inp.type = 'text'; inp.value = t.title; inp.className = 't-edit'; inp.setAttribute('aria-label', 'Task name');
    el.replaceWith(inp); inp.focus(); inp.select();
    var done = false, finish = function (save) { if (done) return; done = true; commit(function (s) { if (save) S.updateTask(s, t.id, { title: inp.value }); }); };
    inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') finish(true); if (e.key === 'Escape') finish(false); });
    inp.addEventListener('blur', function () { finish(true); });
  };
  changes['toggle-task'] = function (el) { commit(function (s) { S.toggleTask(s, el.dataset.id); }); };
  changes['move-task'] = function (el) {
    var v = el.value; if (!v) return;
    var t = app.state.tasks.find(function (x) { return x.id === el.dataset.id; });
    var date = v === 'later' ? null : v === 'next' ? U.addDays(U.weekStart(t.date || U.today()), 7) : v;
    commit(function (s) { S.moveTask(s, el.dataset.id, date); });
  };

  // Backup, restore and reset.
  acts['data-dialog'] = function () {
    var d = document.getElementById('dialog'), last = app.state.lastBackup;
    d.innerHTML = '<h3>Backup and data</h3><p class="muted small">Everything is stored in this browser on this computer. Nothing is sent anywhere. Clearing the browser\'s site data would erase it, so save a backup file now and then.</p>' +
      '<div class="d-sec"><b>Save a backup</b><span class="small muted">' + (last ? 'Last backup: ' + fmtLong(last) : 'No backup saved yet.') + '</span><div><button class="btn primary" data-act="export">Download backup file</button></div></div>' +
      '<div class="d-sec"><b>Restore from a backup</b><span class="small muted">Replaces everything currently in the app with the contents of the file.</span><input type="file" accept=".json,application/json" data-change="import" aria-label="Backup file"></div>' +
      '<div class="d-sec"><b>Start over</b><span class="small muted">Removes all progress, tasks, notes and your own additions.</span><div><button class="btn danger" data-act="reset">Erase everything…</button></div></div>' +
      '<div class="row" style="justify-content:flex-end;margin-top:8px"><button class="btn" data-act="close-dialog">Close</button></div>';
    d.showModal();
  };
  acts['close-dialog'] = function () { document.getElementById('dialog').close(); };
  acts.export = function () {
    app.state.lastBackup = U.today(); saveQuiet();
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([S.exportJSON(app.state)], { type: 'application/json' }));
    a.download = 'skilltree-backup-' + U.today() + '.json';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
    acts['close-dialog'](); toast('Backup file saved to your downloads');
  };
  changes.import = function (el) {
    var f = el.files[0]; if (!f) return;
    var r = new FileReader();
    r.onload = function () {
      try { var st = S.importJSON(String(r.result)); app.state = st; applyTheme(); acts['close-dialog'](); commit(); toast('Backup restored'); }
      catch (e) { toast('That file is not a Skill Tree backup'); el.value = ''; }
    };
    r.readAsText(f);
  };
  acts.reset = function (el) {
    if (el.dataset.sure) { app.state = S.defaultState(); applyTheme(); acts['close-dialog'](); commit(); toast('Everything was erased'); }
    else { el.dataset.sure = '1'; el.textContent = 'Click again to erase everything'; }
  };

  app.start = function () {
    app.state = S.load(localStorage);
    rebuild(); applyTheme();
    document.addEventListener('click', function (e) {
      var el = e.target.closest('[data-act]'); if (!el) return;
      var fn = acts[el.dataset.act]; if (fn) fn(el, e);
    });
    document.addEventListener('change', function (e) { var el = e.target.closest('[data-change]'); if (el && changes[el.dataset.change]) changes[el.dataset.change](el, e); });
    document.addEventListener('submit', function (e) { var el = e.target.closest('[data-form]'); if (!el) return; e.preventDefault(); if (forms[el.dataset.form]) forms[el.dataset.form](el, new FormData(el)); });
    document.getElementById('dialog').addEventListener('click', function (e) { if (e.target === e.currentTarget) e.currentTarget.close(); });
    window.addEventListener('hashchange', render);
    matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);
    render();
  };

  ST.ui = { esc: esc, DAY: DAY, MON: MON, fmtDay: fmtDay, fmtLong: fmtLong, hours: hours, tree: tree, findNode: findNode, branchColor: branchColor, treeColor: treeColor, ring: ring, toast: toast, taskRow: taskRow, commit: commit, saveQuiet: saveQuiet, go: go, render: render };
})();
