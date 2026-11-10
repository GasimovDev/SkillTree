// Overview: current focus, today's tasks, all roadmaps and suggested next steps.
(function () {
  var ST = globalThis.ST, U = ST.util, M = ST.model, S = ST.store, ui = ST.ui, app = ST.app, esc = ui.esc;

  function paceText(b, p) {
    if (p.pct >= 100) return 'Roadmap complete.';
    if (p.phase === 'past') return 'This block has ended with <b>' + ui.hours(p.hoursLeft) + '</b> of work left. Extend it on the Timeline or carry on at your own pace.';
    var when = p.phase === 'upcoming' ? 'Starts ' + ui.fmtDay(b.start) + '. ' : '<b>' + p.daysLeft + '</b> days left. ';
    return when + 'About <b>' + ui.hours(p.hoursLeft) + '</b> of work remaining, so roughly <b>' + ui.hours(p.hoursPerWeek) + '</b> a week to finish by ' + ui.fmtDay(b.end) + '.';
  }
  ST.paceText = paceText;

  ST.views.overview = function () {
    var s = app.state, today = U.today(), h = '';
    var week = U.weekDays(today), wt = s.tasks.filter(function (t) { return t.date && t.date >= week[0] && t.date <= week[6]; });
    var wd = wt.filter(function (t) { return t.done; }).length;
    h += '<div class="page"><div class="page-head"><div><h1>Overview</h1><p>' + ui.fmtLong(today) + '. This week: <span class="num">' + wd + ' of ' + wt.length + '</span> planned tasks done.</p></div>' +
      '<button class="btn primary" data-act="go" data-hash="#week">Open weekly plan</button></div>';

    var blocks = s.blocks.map(function (b) { var t = ui.tree(b.treeId); return t ? { b: b, t: t, p: M.blockPace(b, t, s, today) } : null; }).filter(Boolean)
      .filter(function (x) { return x.p.phase !== 'past' || x.p.pct < 100; }).sort(function (a, b) { return a.b.start < b.b.start ? -1 : 1; });
    var active = blocks.filter(function (x) { return x.p.phase === 'active'; }), upcoming = blocks.filter(function (x) { return x.p.phase === 'upcoming'; }).slice(0, 2);

    h += '<div class="two-col section"><div><h2>Focus now</h2><div class="list">';
    if (!active.length && !upcoming.length) {
      h += '<div class="empty">No study block is running. A block is an intensive period for one roadmap, for example four weeks of GRE. Add one to see how many hours a week it needs. <div style="margin-top:10px"><button class="btn" data-act="go" data-hash="#timeline">Plan a study block</button></div></div>';
    }
    active.concat(upcoming).forEach(function (x) {
      h += '<div class="card focus-card"><div class="row"><i class="dot" style="--c:' + ui.treeColor(x.t) + '"></i><h3 class="grow">' + esc(x.t.title) + '</h3><span class="tag">' + (x.p.phase === 'active' ? 'Running' : 'Upcoming') + '</span></div>' +
        '<div class="row"><div class="bar grow"><i style="width:' + x.p.pct + '%"></i></div><span class="num small">' + x.p.pct + '%</span></div>' +
        '<p class="pace">' + paceText(x.b, x.p) + '</p><div><button class="btn sm" data-act="go" data-hash="#tree/' + x.t.id + '">Open roadmap</button></div></div>';
    });
    h += '</div></div>';

    var todays = s.tasks.filter(function (t) { return t.date === today; }), overdue = s.tasks.filter(function (t) { return t.date && t.date < today && !t.done; });
    h += '<div><h2>Today</h2><div class="list">';
    if (!todays.length) h += '<div class="empty">Nothing planned for today yet.</div>';
    todays.forEach(function (t) { h += ui.taskRow(t); });
    h += '<form class="add-row" data-form="add-task" data-date="' + today + '"><input type="text" name="title" placeholder="Add a task for today" aria-label="Add a task for today" autocomplete="off"><button class="btn sm">Add</button></form>';
    if (overdue.length) h += '<div class="row small muted" style="margin-top:6px"><span class="grow">' + overdue.length + ' unfinished ' + (overdue.length === 1 ? 'task' : 'tasks') + ' from earlier days.</span><button class="btn sm" data-act="carry">Move to today</button></div>';
    h += '</div></div></div>';

    h += '<div class="section"><h2>Roadmaps</h2><div class="tree-cards">';
    app.trees.forEach(function (t) {
      var p = M.treeProgress(t, s);
      h += '<button class="card tree-card" data-act="go" data-hash="#tree/' + t.id + '"><div class="ring">' + ui.ring(p.pct, 56, 5) + '<b>' + p.pct + '%</b></div>' +
        '<div><div class="group">' + esc(t.group) + '</div><h3>' + esc(t.short) + '</h3><div class="small muted num" style="margin-top:3px">' + p.doneNodes + '/' + p.totalNodes + ' steps · ' + ui.hours(p.hoursLeft) + ' left</div></div></button>';
    });
    h += '</div></div>';

    var focusIds = active.map(function (x) { return x.t.id; });
    var started = app.trees.filter(function (t) { return focusIds.indexOf(t.id) >= 0 || M.treeProgress(t, s).pct > 0; });
    var next = M.nextUp(started.length ? started : [], s).filter(function (n, i, a) { return a.findIndex(function (m) { return m.node.id === n.node.id; }) === i; }).slice(0, 6);
    h += '<div class="section"><h2>Next steps</h2><div class="list">';
    if (!next.length) h += '<div class="empty">Open a roadmap and tick off your first task, or add a study block. The steps you can work on next will be listed here.</div>';
    next.forEach(function (n) {
      h += '<div class="next-item"><div><div><b>' + esc(n.node.title) + '</b>: ' + esc(n.item.text) + '</div><div class="where">' + esc(n.tree.short) + '</div></div>' +
        '<div class="row"><button class="btn sm" data-act="plan-item" data-node="' + n.node.id + '" data-key="' + n.item.key + '" data-date="' + today + '">Plan for today</button><button class="btn sm ghost" data-act="open-node" data-node="' + n.node.id + '">Open</button></div></div>';
    });
    h += '</div></div></div>';
    return h;
  };

  ST.forms['add-task'] = function (el, fd) {
    var date = el.dataset.date || null;
    ui.commit(function (s) { S.addTask(s, { title: fd.get('title'), date: date }); });
    var again = document.querySelector('form[data-form="add-task"][data-date="' + (date || '') + '"] input'); if (again) again.focus();
  };
  ST.acts.carry = function () { var n; ui.commit(function (s) { n = S.carryOver(s, U.today()); }); ui.toast(n + (n === 1 ? ' task' : ' tasks') + ' moved to today'); };
  ST.acts['plan-item'] = function (el) {
    var f = ui.findNode(el.dataset.node); if (!f) return;
    var item = f.node.items.find(function (i) { return i.key === el.dataset.key; }); if (!item) return;
    var date = el.dataset.date === 'later' ? null : el.dataset.date || app.ui.sugDay || U.today();
    var dup = app.state.tasks.some(function (t) { return t.nodeId === f.node.id && t.itemKey === item.key && !t.done; });
    if (dup) { ui.toast('That task is already in your plan'); return; }
    ui.commit(function (s) { S.addTask(s, { title: item.implicit ? f.node.title : item.text, date: date, nodeId: f.node.id, itemKey: item.key, treeId: f.tree.id }); });
    ui.toast('Added to ' + (date ? ui.fmtLong(date) : 'Later'));
  };
})();
