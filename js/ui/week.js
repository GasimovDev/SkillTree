// Weekly plan: seven days plus an undated list, with suggestions pulled from the roadmaps.
(function () {
  var ST = globalThis.ST, U = ST.util, M = ST.model, S = ST.store, ui = ST.ui, app = ST.app, esc = ui.esc;

  ST.views.week = function () {
    var s = app.state, today = U.today(), ws = app.ui.week || U.weekStart(today), days = U.weekDays(ws);
    var inWeek = s.tasks.filter(function (t) { return t.date && t.date >= days[0] && t.date <= days[6]; }), done = inWeek.filter(function (t) { return t.done; }).length;
    var older = s.tasks.filter(function (t) { return t.date && t.date < today && !t.done; }).length;
    var isThis = ws === U.weekStart(today);
    var h = '<div class="page" style="max-width:1500px"><div class="page-head"><div><h1>Week of ' + ui.fmtDay(days[0]) + ' to ' + ui.fmtDay(days[6]) + ' ' + U.parseISO(days[6]).getFullYear() + '</h1>' +
      '<p><span class="num">' + done + ' of ' + inWeek.length + '</span> tasks done' + (isThis ? '' : ' · not the current week') + '. Drag a task to another day, or use the ⇄ menu.</p></div>' +
      '<div class="row"><button class="btn" data-act="week" data-d="-7" aria-label="Previous week">←</button><button class="btn" data-act="week" data-d="0">This week</button><button class="btn" data-act="week" data-d="7" aria-label="Next week">→</button></div></div>';
    if (older && isThis) h += '<div class="card row" style="margin-bottom:16px"><span class="grow">' + older + ' unfinished ' + (older === 1 ? 'task is' : 'tasks are') + ' left on earlier days.</span><button class="btn sm" data-act="carry">Move to today</button></div>';

    h += '<div class="week-layout"><div class="week-grid">';
    days.forEach(function (d, i) {
      var list = s.tasks.filter(function (t) { return t.date === d; }), dn = list.filter(function (t) { return t.done; }).length;
      h += '<section class="day' + (d === today ? ' today' : '') + '" data-drop="' + d + '"><div class="day-head"><b>' + ui.DAY[i] + ' ' + ui.fmtDay(d) + (d === today ? ' · today' : '') + '</b><span>' + (list.length ? dn + '/' + list.length : '') + '</span></div>' +
        list.map(function (t) { return ui.taskRow(t, { days: days }); }).join('') +
        '<form class="add-row" data-form="add-task" data-date="' + d + '"><input type="text" name="title" placeholder="Add a task" aria-label="Add a task for ' + ui.DAY[i] + ' ' + ui.fmtDay(d) + '" autocomplete="off"><button class="btn sm" aria-label="Add">＋</button></form></section>';
    });
    var later = s.tasks.filter(function (t) { return !t.date; });
    h += '<section class="day" data-drop=""><div class="day-head"><b>Later (no date)</b><span>' + (later.length || '') + '</span></div>' + later.map(function (t) { return ui.taskRow(t, { days: days }); }).join('') +
      '<form class="add-row" data-form="add-task" data-date=""><input type="text" name="title" placeholder="Add a task for later" aria-label="Add a task without a date" autocomplete="off"><button class="btn sm" aria-label="Add">＋</button></form></section>';
    h += '</div>';

    // Suggestions from the roadmaps.
    var sugDay = app.ui.sugDay && days.indexOf(app.ui.sugDay) >= 0 ? app.ui.sugDay : (days.indexOf(today) >= 0 ? today : days[0]);
    app.ui.sugDay = sugDay;
    var pool = app.ui.sugTree === 'all' ? app.trees.filter(function (t) { return M.treeProgress(t, s).pct > 0 || s.blocks.some(function (b) { return b.treeId === t.id && b.end >= today; }); }) : app.trees.filter(function (t) { return t.id === app.ui.sugTree; });
    var planned = {}; s.tasks.forEach(function (t) { if (t.nodeId && !t.done) planned[t.nodeId + '|' + t.itemKey] = true; });
    var sug = M.nextUp(pool, s).filter(function (n) { return !planned[n.node.id + '|' + n.item.key]; }).slice(0, 14);
    h += '<aside class="suggest"><h2>From your roadmaps</h2><div class="row"><select data-change="sug-tree" aria-label="Roadmap" class="grow"><option value="all">Started and planned roadmaps</option>' +
      app.trees.map(function (t) { return '<option value="' + t.id + '"' + (app.ui.sugTree === t.id ? ' selected' : '') + '>' + esc(t.short) + '</option>'; }).join('') + '</select></div>' +
      '<div class="row small"><span class="muted">Add to</span><select data-change="sug-day" aria-label="Day to add to" class="grow">' + days.map(function (d, i) { return '<option value="' + d + '"' + (d === sugDay ? ' selected' : '') + '>' + ui.DAY[i] + ' ' + ui.fmtDay(d) + '</option>'; }).join('') + '</select></div>';
    if (!sug.length) h += '<div class="empty small">' + (pool.length ? 'Nothing left to suggest here. Every open task is already planned or done.' : 'Choose a roadmap above to see what you can work on next.') + '</div>';
    sug.forEach(function (n) {
      h += '<div class="sug"><div><div>' + esc(n.item.implicit ? n.node.title : n.item.text) + '</div><div class="where"><i class="dot" style="--c:' + ui.treeColor(n.tree) + '"></i>' + esc(n.tree.short) + ' · ' + esc(n.node.title) + '</div></div>' +
        '<button class="btn sm" data-act="plan-item" data-node="' + n.node.id + '" data-key="' + n.item.key + '" aria-label="Add to plan">＋</button></div>';
    });
    h += '</aside></div></div>';
    return h;
  };

  ST.acts.week = function (el) { var d = +el.dataset.d; app.ui.week = d === 0 ? null : U.addDays(app.ui.week || U.weekStart(U.today()), d); app.ui.sugDay = null; ui.render(); };
  ST.changes['sug-tree'] = function (el) { app.ui.sugTree = el.value; ui.render(); };
  ST.changes['sug-day'] = function (el) { app.ui.sugDay = el.value; };

  // Drag a task onto a day.
  document.addEventListener('dragstart', function (e) { var t = e.target.closest && e.target.closest('[data-task]'); if (t) { e.dataTransfer.setData('text/plain', t.dataset.task); e.dataTransfer.effectAllowed = 'move'; } });
  document.addEventListener('dragover', function (e) { var d = e.target.closest && e.target.closest('[data-drop]'); if (d) { e.preventDefault(); d.classList.add('over'); } });
  document.addEventListener('dragleave', function (e) { var d = e.target.closest && e.target.closest('[data-drop]'); if (d && !d.contains(e.relatedTarget)) d.classList.remove('over'); });
  document.addEventListener('drop', function (e) {
    var d = e.target.closest && e.target.closest('[data-drop]'); if (!d) return;
    e.preventDefault(); var id = e.dataTransfer.getData('text/plain');
    if (id) ui.commit(function (s) { S.moveTask(s, id, d.dataset.drop || null); });
  });
})();
