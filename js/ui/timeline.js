// Timeline: intensive study blocks, each tied to one roadmap, with the weekly pace they need.
(function () {
  var ST = globalThis.ST, U = ST.util, M = ST.model, S = ST.store, ui = ST.ui, app = ST.app, esc = ui.esc;

  ST.views.timeline = function () {
    var s = app.state, today = U.today();
    var blocks = s.blocks.slice().sort(function (a, b) { return a.start < b.start ? -1 : 1; });
    var h = '<div class="page"><div class="page-head"><div><h1>Timeline</h1><p>Plan intensive study blocks, such as four weeks of GRE followed by eight weeks of IELTS. Each block shows how many hours a week it takes to finish that roadmap by the end date. Blocks may overlap.</p></div></div>';

    h += '<form class="card form-row" data-form="add-block"><label>Roadmap<select name="treeId">' + app.trees.map(function (t) { return '<option value="' + t.id + '">' + esc(t.short) + '</option>'; }).join('') + '</select></label>' +
      '<label>Starts<input type="date" name="start" value="' + today + '" required></label><label>Ends<input type="date" name="end" value="' + U.addDays(today, 27) + '" required></label><button class="btn primary">Add study block</button></form>';

    if (!blocks.length) return h + '<div class="section"><div class="empty">No study blocks yet. Pick a roadmap and dates above to add the first one.</div></div></div>';

    // Chart range: whole months covering today and every block.
    var lo = blocks.reduce(function (m, b) { return b.start < m ? b.start : m; }, today), hi = blocks.reduce(function (m, b) { return b.end > m ? b.end : m; }, today);
    var d0 = U.parseISO(lo), d1 = U.parseISO(hi);
    var first = U.toISO(new Date(d0.getFullYear(), d0.getMonth(), 1)), last = U.toISO(new Date(d1.getFullYear(), d1.getMonth() + 1, 0));
    var span = U.daysBetween(first, last) + 1, pc = function (iso) { return (U.daysBetween(first, iso) / span) * 100; };
    var months = [], cur = U.parseISO(first);
    while (U.toISO(cur) <= last) { var dim = new Date(cur.getFullYear(), cur.getMonth() + 1, 0).getDate(); months.push({ label: ui.MON[cur.getMonth()] + ' ' + cur.getFullYear(), days: dim }); cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1); }
    h += '<div class="section"><h2>Chart</h2><div class="gantt"><div class="gantt-in" style="min-width:' + Math.max(720, months.length * 110) + 'px"><div class="months" style="grid-template-columns:' + months.map(function (m) { return m.days + 'fr'; }).join(' ') + '">' +
      months.map(function (m) { return '<span>' + m.label + '</span>'; }).join('') + '</div><div style="position:relative"><div class="g-today" style="left:' + pc(today) + '%" title="Today"></div>';
    blocks.forEach(function (b) {
      var t = ui.tree(b.treeId); if (!t) return; var p = M.treeProgress(t, s);
      h += '<div class="g-row"><div class="g-bar" style="--c:' + ui.treeColor(t) + ';left:' + pc(b.start) + '%;width:' + ((U.daysBetween(b.start, b.end) + 1) / span * 100) + '%" title="' + esc(t.short) + ': ' + ui.fmtDay(b.start) + ' to ' + ui.fmtDay(b.end) + '"><i style="width:' + p.pct + '%"></i><span>' + esc(t.short) + ' · ' + p.pct + '%</span></div></div>';
    });
    h += '</div></div></div></div>';

    h += '<div class="section"><h2>Study blocks</h2><div class="list">';
    blocks.forEach(function (b) {
      var t = ui.tree(b.treeId); if (!t) return; var p = M.blockPace(b, t, s, today);
      var weeks = Math.round(p.totalDays / 7 * 10) / 10;
      h += '<div class="card block"><div><div class="row"><i class="dot" style="--c:' + ui.treeColor(t) + '"></i><h3>' + esc(t.title) + '</h3><span class="tag">' + ({ active: 'Running', upcoming: 'Upcoming', past: 'Ended' })[p.phase] + '</span><span class="small muted num">' + weeks + ' weeks</span></div>' +
        '<p class="pace">' + ST.paceText(b, p) + '</p>' +
        '<div class="dates"><input type="date" value="' + b.start + '" data-change="block-date" data-id="' + b.id + '" data-f="start" aria-label="Start date"><span class="muted">to</span><input type="date" value="' + b.end + '" data-change="block-date" data-id="' + b.id + '" data-f="end" aria-label="End date"></div></div>' +
        '<div class="row"><button class="btn sm" data-act="go" data-hash="#tree/' + t.id + '">Open roadmap</button><button class="btn sm danger" data-act="del-block" data-id="' + b.id + '">Remove</button></div></div>';
    });
    return h + '</div></div></div>';
  };

  ST.forms['add-block'] = function (el, fd) {
    var ok; ui.commit(function (s) { ok = S.addBlock(s, { treeId: fd.get('treeId'), start: fd.get('start'), end: fd.get('end') }); });
    if (!ok) ui.toast('The end date must be on or after the start date');
  };
  ST.changes['block-date'] = function (el) {
    if (!el.value) return; var ok, patch = {}; patch[el.dataset.f] = el.value;
    ui.commit(function (s) { ok = S.updateBlock(s, el.dataset.id, patch); });
    if (!ok) ui.toast('The end date must be on or after the start date');
  };
  ST.acts['del-block'] = function (el) { ui.commit(function (s) { S.removeBlock(s, el.dataset.id); }); };
})();
