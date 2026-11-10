// Tree view: the branching map of steps and the detail panel for the selected step.
(function () {
  var ST = globalThis.ST, U = ST.util, M = ST.model, S = ST.store, ui = ST.ui, app = ST.app, esc = ui.esc;
  var NW = 204, NH = 78, OPTS = { nodeW: NW, nodeH: NH, gapX: 26, gapY: 58, pad: 36 };
  var KIND = { book: 'Book', site: 'Website', course: 'Course', video: 'Video', tool: 'Tool', practice: 'Practice', link: 'Link' };
  var STATUS = { done: 'Done', active: 'In progress', ready: 'Ready to start', locked: 'Locked' };

  function path(pts) {
    var d = 'M' + pts[0].x + ' ' + pts[0].y;
    for (var i = 1; i < pts.length; i++) { var a = pts[i - 1], b = pts[i], m = (b.y - a.y) / 2; d += ' C' + a.x + ' ' + (a.y + m) + ' ' + b.x + ' ' + (b.y - m) + ' ' + b.x + ' ' + b.y; }
    return d;
  }

  ST.views.tree = function () {
    var s = app.state, t = ui.tree(app.route.tree), p = M.treeProgress(t, s), L = M.indexNodes(t);
    var lay = ST.layout.layout(t.nodes, OPTS), status = {};
    t.nodes.forEach(function (n) { status[n.id] = M.nodeStatus(t, n, s); });
    var sel = app.route.node && L[app.route.node] ? L[app.route.node] : null;

    var h = '<div class="tree-page"><div class="tree-head"><div class="top"><div><h1>' + esc(t.title) + '</h1><p style="margin-top:6px">' + esc(t.summary) + '</p><p style="margin-top:4px"><b>Pace.</b> ' + esc(t.pace) + '</p></div>' +
      '<div class="row"><button class="btn sm" data-act="zoom" data-d="-1" aria-label="Zoom out">−</button><button class="btn sm" data-act="zoom" data-d="0">Fit</button><button class="btn sm" data-act="zoom" data-d="1" aria-label="Zoom in">+</button></div></div>' +
      '<div class="row"><div class="bar grow" style="max-width:420px"><i style="width:' + p.pct + '%"></i></div><span class="num small"><b>' + p.pct + '%</b> · ' + p.doneNodes + '/' + p.totalNodes + ' steps · ' + ui.hours(p.hoursLeft) + ' of ' + ui.hours(p.hoursTotal) + ' left</span></div>' +
      '<div class="legend">' + Object.keys(t.branches).map(function (b) { return '<span class="tag"><i class="dot" style="--c:' + ui.branchColor(t, b) + '"></i>' + esc(t.branches[b]) + '</span>'; }).join('') + '</div></div>';

    h += '<div class="tree-body' + (sel ? ' open' : '') + '"><div class="map" data-tree="' + t.id + '" data-w="' + lay.width + '" data-h="' + lay.height + '"><div class="stage" style="width:' + lay.width + 'px;height:' + lay.height + 'px">';
    h += '<svg width="' + lay.width + '" height="' + lay.height + '" aria-hidden="true">' + lay.edges.map(function (e) {
      var cls = status[e.from] === 'done' ? ' done' : status[e.to] === 'locked' ? ' locked' : '';
      return '<path class="edge' + cls + '" d="' + path(e.points) + '"/>';
    }).join('') + '</svg>';
    t.nodes.forEach(function (n) {
      var pos = lay.nodes[n.id], np = M.nodeProgress(n, s), st = status[n.id];
      var mark = st === 'done' ? '✓' : st === 'locked' ? '<svg width="11" height="12" viewBox="0 0 11 12" fill="none" stroke="currentColor" stroke-width="1.4"><rect x="1" y="5" width="9" height="6" rx="1.2"/><path d="M3 5V3.5a2.5 2.5 0 0 1 5 0V5"/></svg>' : '';
      h += '<button class="node ' + st + (sel && sel.id === n.id ? ' sel' : '') + '" style="left:' + pos.x + 'px;top:' + pos.y + 'px;--c:' + ui.branchColor(t, n.branch) + '" data-act="select-node" data-node="' + n.id + '" aria-label="' + esc(n.title) + ', ' + STATUS[st] + ', ' + np.done + ' of ' + np.total + ' tasks done">' +
        (n.start && st !== 'done' ? '<span class="start-flag">Start here</span>' : '') +
        '<span><span class="n-title">' + esc(n.title) + '</span><span class="n-meta">' + np.done + '/' + np.total + ' · ' + n.hours + ' h' + (n.custom ? ' · yours' : '') + '</span></span>' +
        '<span class="mini-ring">' + ui.ring(np.pct, 30, 3) + '<span>' + mark + '</span></span></button>';
    });
    h += '</div></div>';
    if (sel) h += detail(t, sel, status, L);
    h += '</div></div>';
    return h;
  };

  function detail(t, n, status, L) {
    var s = app.state, np = M.nodeProgress(n, s), checks = s.checks[n.id] || {}, st = status[n.id];
    var unlocks = t.nodes.filter(function (x) { return x.requires.indexOf(n.id) >= 0; });
    var chip = function (x) { return '<button class="tag" data-act="select-node" data-node="' + x.id + '"><i class="dot" style="--c:' + (status[x.id] === 'done' ? 'var(--accent)' : 'var(--ink3)') + '"></i>' + esc(x.title) + '</button>'; };
    var h = '<aside class="detail" data-node="' + n.id + '" aria-label="Step details">';
    h += '<div><div class="d-top"><div><span class="tag"><i class="dot" style="--c:' + ui.branchColor(t, n.branch) + '"></i>' + esc(t.branches[n.branch] || 'Your own step') + '</span><h1 style="margin-top:8px;font-size:21px">' + esc(n.title) + '</h1></div><button class="icon-btn" data-act="close-node" aria-label="Close details" title="Close">×</button></div>' +
      '<div class="row small muted" style="margin-top:8px"><span><b>' + STATUS[st] + '</b></span><span class="num">' + np.pct + '% · about ' + n.hours + ' h</span></div>' +
      (st === 'locked' ? '<p class="small" style="margin-top:6px;color:var(--warn)">Finish the steps under "Needs first" to unlock this. You can still read it and tick things off.</p>' : '') +
      (n.about ? '<p style="margin-top:10px">' + esc(n.about) + '</p>' : '') + '</div>';

    h += '<div><div class="row"><h2 class="grow" style="margin:0">What to do</h2><button class="btn sm ghost" data-act="node-all" data-node="' + n.id + '" data-v="' + (np.complete ? '0' : '1') + '">' + (np.complete ? 'Untick all' : 'Tick all') + '</button></div><div style="margin-top:6px">';
    n.items.forEach(function (i) {
      var id = 'c-' + n.id + '-' + i.key;
      h += '<div class="check' + (checks[i.key] ? ' on' : '') + '"><input type="checkbox" id="' + id + '" data-change="toggle-item" data-node="' + n.id + '" data-key="' + i.key + '"' + (checks[i.key] ? ' checked' : '') + '><label for="' + id + '">' + esc(i.text) + '</label>' +
        '<span class="row" style="gap:0">' + (checks[i.key] ? '' : '<button class="icon-btn" data-act="plan-item" data-node="' + n.id + '" data-key="' + i.key + '" data-date="' + U.today() + '" title="Add to today in the weekly plan" aria-label="Add to weekly plan">＋</button>') +
        (i.custom ? '<button class="icon-btn" data-act="del-item" data-node="' + n.id + '" data-key="' + i.key + '" title="Remove your task" aria-label="Remove task">×</button>' : '') + '</span></div>';
    });
    h += '</div><form class="inline-form" data-form="add-item" data-node="' + n.id + '"><input type="text" name="text" placeholder="Add your own task" aria-label="Add your own task" autocomplete="off"><button class="btn sm">Add</button></form></div>';

    h += '<div><h2>Where to learn</h2>';
    if (!n.resources.length) h += '<p class="muted small">No sources yet. Add your own below.</p>';
    n.resources.forEach(function (r) {
      var title = r.url ? '<a href="' + esc(r.url) + '" target="_blank" rel="noopener noreferrer">' + esc(r.title) + '</a>' : esc(r.title);
      h += '<div class="res"><span class="kind">' + KIND[r.type] + '</span><div><div class="r-title">' + title + '</div>' + (r.note ? '<div class="r-note">' + esc(r.note) + '</div>' : '') + '</div>' +
        (r.custom ? '<button class="icon-btn" data-act="del-res" data-node="' + n.id + '" data-id="' + r.id + '" title="Remove your source" aria-label="Remove source">×</button>' : '<span></span>') + '</div>';
    });
    h += '<form class="inline-form" data-form="add-res" data-node="' + n.id + '"><input type="text" name="title" placeholder="Your own source: title" aria-label="Source title" autocomplete="off"><input type="text" name="url" placeholder="Link (optional)" aria-label="Source link" autocomplete="off"><button class="btn sm">Add</button></form>' +
      '<p class="small muted" style="margin-top:8px">Links open in your browser and need an internet connection. Everything else here works offline.</p></div>';

    if (n.requires.length) h += '<div><h2>Needs first</h2><div class="chips">' + n.requires.filter(function (r) { return L[r]; }).map(function (r) { return chip(L[r]); }).join('') + '</div></div>';
    if (unlocks.length) h += '<div><h2>Leads to</h2><div class="chips">' + unlocks.map(chip).join('') + '</div></div>';

    h += '<div><h2>Your notes</h2><textarea data-note="' + n.id + '" placeholder="Notes for this step" aria-label="Notes for this step">' + esc(s.notes[n.id] || '') + '</textarea></div>';
    h += '<div><h2>Branch out</h2><p class="small muted">Add your own step that follows this one. It appears on the map and counts toward progress.</p><form class="inline-form" data-form="add-node" data-node="' + n.id + '"><input type="text" name="title" placeholder="Name of the new step" aria-label="Name of the new step" autocomplete="off"><button class="btn sm">Add step</button></form>' +
      (n.custom ? '<div style="margin-top:12px"><button class="btn sm danger" data-act="del-node" data-node="' + n.id + '">Remove this step</button></div>' : '') + '</div>';
    return h + '</aside>';
  }

  function fitZoom(map) { var w = +map.dataset.w, avail = map.clientWidth - 8; return Math.max(0.8, Math.min(1, avail / w)); }
  function applyZoom(map) {
    var z = app.ui.zoom[map.dataset.tree] || fitZoom(map), stage = map.firstElementChild, w = +map.dataset.w, hgt = +map.dataset.h;
    stage.style.transform = 'scale(' + z + ')';
    stage.style.marginBottom = (hgt * z - hgt) + 'px';
    stage.style.marginLeft = stage.style.marginRight = w * z < map.clientWidth ? Math.round((map.clientWidth - w * z) / 2) + 'px' : '0';
    stage.style.width = w + 'px';
    map.style.setProperty('--z', z);
  }
  ST.views.tree.after = function (main, pos) {
    var map = main.querySelector('.map'); if (!map) return;
    applyZoom(map);
    if (pos && pos[2] === map.dataset.tree) { map.scrollLeft = pos[0]; map.scrollTop = pos[1]; }
    else if (app.route.node) { var el = map.querySelector('.node.sel'); if (el) el.scrollIntoView({ block: 'center', inline: 'center' }); }
    var drag = null;
    map.addEventListener('pointerdown', function (e) { if (e.target.closest('.node') || e.button !== 0) return; drag = { x: e.clientX, y: e.clientY, l: map.scrollLeft, t: map.scrollTop }; map.classList.add('drag'); map.setPointerCapture(e.pointerId); });
    map.addEventListener('pointermove', function (e) { if (!drag) return; map.scrollLeft = drag.l - (e.clientX - drag.x); map.scrollTop = drag.t - (e.clientY - drag.y); });
    var end = function () { drag = null; map.classList.remove('drag'); };
    map.addEventListener('pointerup', end); map.addEventListener('pointercancel', end);
  };
  window.addEventListener('resize', function () { var map = document.querySelector('.map'); if (map) applyZoom(map); });

  ST.acts.zoom = function (el) {
    var map = document.querySelector('.map'), id = map.dataset.tree, d = +el.dataset.d, cur = app.ui.zoom[id] || fitZoom(map);
    if (d === 0) delete app.ui.zoom[id]; else app.ui.zoom[id] = Math.max(0.4, Math.min(1.6, Math.round((cur + d * 0.15) * 100) / 100));
    applyZoom(map);
  };
  ST.acts['select-node'] = function (el) { ui.go('#tree/' + app.route.tree + '/' + el.dataset.node); };
  ST.acts['close-node'] = function () { ui.go('#tree/' + app.route.tree); };
  ST.changes['toggle-item'] = function (el) { ui.commit(function (s) { S.setItem(s, el.dataset.node, el.dataset.key, el.checked); }); };
  ST.acts['node-all'] = function (el) { var f = ui.findNode(el.dataset.node); ui.commit(function (s) { f.node.items.forEach(function (i) { S.setItem(s, f.node.id, i.key, el.dataset.v === '1'); }); }); };
  ST.acts['del-item'] = function (el) { ui.commit(function (s) { S.removeCustomItem(s, el.dataset.node, el.dataset.key); }); };
  ST.acts['del-res'] = function (el) { ui.commit(function (s) { S.removeCustomResource(s, el.dataset.node, el.dataset.id); }); };
  ST.acts['del-node'] = function (el) {
    if (!el.dataset.sure) { el.dataset.sure = '1'; el.textContent = 'Click again to remove'; return; }
    S.removeCustomNode(app.state, el.dataset.node); ui.saveQuiet();
    app.trees = M.buildTrees(globalThis.SKILLTREE_DATA, app.state);
    ui.go('#tree/' + app.route.tree);
  };
  ST.forms['add-item'] = function (el, fd) { ui.commit(function (s) { S.addCustomItem(s, el.dataset.node, fd.get('text')); }); };
  ST.forms['add-res'] = function (el, fd) {
    var url = String(fd.get('url') || '').trim();
    if (url && !/^https?:\/\//i.test(url)) url = 'https://' + url;
    ui.commit(function (s) { S.addCustomResource(s, el.dataset.node, { title: fd.get('title'), url: url }); });
  };
  ST.forms['add-node'] = function (el, fd) {
    var f = ui.findNode(el.dataset.node), id = S.addCustomNode(app.state, f.tree.id, f.node.id, fd.get('title'), f.node.branch);
    if (!id) return;
    ui.saveQuiet(); app.trees = M.buildTrees(globalThis.SKILLTREE_DATA, app.state);
    var map = document.querySelector('.map'); if (map) map.dataset.tree = '';
    ui.go('#tree/' + f.tree.id + '/' + id);
  };
  document.addEventListener('input', function (e) { var n = e.target.dataset && e.target.dataset.note; if (n) { S.setNote(app.state, n, e.target.value); ui.saveQuiet(); } });
})();
