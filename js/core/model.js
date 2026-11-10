// Pure functions that combine the built-in roadmap data with the user's saved state.
(function () {
  var ST = (globalThis.ST = globalThis.ST || {});
  function itemKey(text) { return 'h' + ST.util.hash(text); }

  function buildTrees(data, state) {
    var custom = state.custom;
    return data.trees.map(function (t) {
      var raw = t.nodes.map(function (n) { return Object.assign({}, n, { custom: false }); });
      custom.nodes.forEach(function (n) {
        if (n.treeId === t.id) raw.push({ id: n.id, title: n.title, branch: n.branch, hours: n.hours || 2, requires: n.requires.slice(), tasks: [], resources: [], about: '', custom: true });
      });
      var nodes = raw.map(function (n) {
        var items = (n.tasks || []).map(function (text) { return { key: itemKey(text), text: text, custom: false }; });
        (custom.items[n.id] || []).forEach(function (c) { items.push({ key: c.key, text: c.text, custom: true }); });
        if (!items.length) items.push({ key: 'done', text: 'Mark this step as done', custom: false, implicit: true });
        var resources = (n.resources || []).map(function (r) { return { type: r[0], title: r[1], note: r[2] || '', url: r[3] || '', custom: false }; });
        (custom.resources[n.id] || []).forEach(function (c) { resources.push({ id: c.id, type: 'link', title: c.title, note: '', url: c.url || '', custom: true }); });
        return { id: n.id, title: n.title, branch: n.branch, hours: n.hours || 0, requires: n.requires || [], start: !!n.start, about: n.about || '', items: items, resources: resources, custom: n.custom, treeId: t.id };
      });
      return { id: t.id, title: t.title, short: t.short || t.title, group: t.group || '', summary: t.summary || '', pace: t.pace || '', branches: t.branches || {}, nodes: nodes };
    });
  }

  function nodeProgress(node, state) {
    var c = state.checks[node.id] || {}, done = 0;
    node.items.forEach(function (i) { if (c[i.key]) done++; });
    var total = node.items.length;
    return { done: done, total: total, pct: Math.round((done / total) * 100), complete: done === total };
  }
  function nodeStatus(tree, node, state) {
    var p = nodeProgress(node, state);
    if (p.complete) return 'done';
    if (p.done > 0) return 'active';
    var byId = indexNodes(tree);
    var open = node.requires.some(function (r) { return byId[r] && !nodeProgress(byId[r], state).complete; });
    return open ? 'locked' : 'ready';
  }
  function indexNodes(tree) { var m = {}; tree.nodes.forEach(function (n) { m[n.id] = n; }); return m; }

  function treeProgress(tree, state) {
    var total = 0, got = 0, doneNodes = 0;
    tree.nodes.forEach(function (n) {
      var p = nodeProgress(n, state), h = n.hours || 1;
      total += h; got += h * (p.done / p.total);
      if (p.complete) doneNodes++;
    });
    return { pct: total ? Math.round((got / total) * 100) : 0, doneNodes: doneNodes, totalNodes: tree.nodes.length, hoursTotal: total, hoursLeft: Math.round((total - got) * 10) / 10 };
  }

  function nextUp(trees, state, limit) {
    var out = [];
    trees.forEach(function (tree) {
      tree.nodes.forEach(function (node) {
        var st = nodeStatus(tree, node, state);
        if (st !== 'ready' && st !== 'active') return;
        var c = state.checks[node.id] || {};
        node.items.forEach(function (item) { if (!c[item.key]) out.push({ tree: tree, node: node, item: item, status: st }); });
      });
    });
    out.sort(function (a, b) { return (a.status === 'active' ? 0 : 1) - (b.status === 'active' ? 0 : 1); });
    return limit ? out.slice(0, limit) : out;
  }

  function blockPace(block, tree, state, todayISO) {
    var u = ST.util, p = treeProgress(tree, state);
    var phase = todayISO < block.start ? 'upcoming' : todayISO > block.end ? 'past' : 'active';
    var from = phase === 'upcoming' ? block.start : todayISO;
    var daysLeft = phase === 'past' ? 0 : u.daysBetween(from, block.end) + 1;
    var weeks = Math.max(daysLeft, 1) / 7;
    return { phase: phase, daysLeft: daysLeft, hoursLeft: p.hoursLeft, pct: p.pct, hoursPerWeek: Math.round((p.hoursLeft / weeks) * 10) / 10, totalDays: u.daysBetween(block.start, block.end) + 1 };
  }

  function validate(data) {
    var errs = [], seen = {};
    data.trees.forEach(function (t) {
      var ids = {};
      if (!t.nodes.some(function (n) { return n.start; })) errs.push(t.id + ': no start node');
      t.nodes.forEach(function (n) {
        if (seen[n.id]) errs.push(t.id + ': duplicate id ' + n.id);
        seen[n.id] = ids[n.id] = n;
        if (!t.branches || !t.branches[n.branch]) errs.push(n.id + ': unknown branch ' + n.branch);
        if (!n.title || !(n.hours > 0)) errs.push(n.id + ': needs a title and hours');
      });
      t.nodes.forEach(function (n) { (n.requires || []).forEach(function (r) { if (!ids[r]) errs.push(n.id + ': unknown prerequisite ' + r); }); });
      var mark = {};
      function visit(id) {
        if (mark[id] === 2) return false;
        if (mark[id] === 1) return true;
        mark[id] = 1;
        var cyc = (ids[id].requires || []).some(function (r) { return ids[r] && visit(r); });
        mark[id] = 2;
        return cyc;
      }
      if (Object.keys(ids).some(visit)) errs.push(t.id + ': prerequisite cycle');
    });
    return errs;
  }

  ST.model = { itemKey: itemKey, buildTrees: buildTrees, nodeProgress: nodeProgress, nodeStatus: nodeStatus, treeProgress: treeProgress, nextUp: nextUp, blockPace: blockPace, validate: validate, indexNodes: indexNodes };
})();
