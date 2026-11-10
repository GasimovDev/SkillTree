// Layered layout for a prerequisite graph: rows by depth, ordering to reduce crossings,
// and routing points for edges that skip rows.
(function () {
  var ST = (globalThis.ST = globalThis.ST || {});
  function layout(input, o) {
    var W = o.nodeW, H = o.nodeH, GX = o.gapX, GY = o.gapY, DW = o.dummyW || 24, PAD = o.pad === undefined ? 24 : o.pad;
    var ids = {}; input.forEach(function (n) { ids[n.id] = true; });
    var req = {}; input.forEach(function (n) { req[n.id] = (n.requires || []).filter(function (r) { return ids[r] && r !== n.id; }); });
    var layer = {};
    function depth(id, stack) {
      if (layer[id] !== undefined) return layer[id];
      if (stack[id]) return 0;
      stack[id] = true;
      var d = 0; req[id].forEach(function (r) { d = Math.max(d, depth(r, stack) + 1); });
      stack[id] = false;
      return (layer[id] = d);
    }
    input.forEach(function (n) { depth(n.id, {}); });

    // Build rows, with a dummy cell in each row that a long edge passes through.
    var rows = [], cells = {}, edges = [];
    function cell(id, l, w, real) { var c = { id: id, layer: l, w: w, real: real, up: [], down: [], x: 0 }; cells[id] = c; (rows[l] || (rows[l] = [])).push(c); return c; }
    input.forEach(function (n) { cell(n.id, layer[n.id], W, true); });
    input.forEach(function (n) {
      req[n.id].forEach(function (r) {
        var chain = [r];
        for (var l = layer[r] + 1; l < layer[n.id]; l++) { var d = '~' + r + '>' + n.id + '@' + l; cell(d, l, DW, false); chain.push(d); }
        chain.push(n.id);
        for (var i = 1; i < chain.length; i++) { cells[chain[i]].up.push(chain[i - 1]); cells[chain[i - 1]].down.push(chain[i]); }
        edges.push({ from: r, to: n.id, chain: chain });
      });
    });
    for (var i = 0; i < rows.length; i++) rows[i] = rows[i] || [];

    // Order each row by the average position of its neighbours (a few sweeps).
    function pos(row) { row.forEach(function (c, i) { c.i = i; }); }
    rows.forEach(pos);
    function sweep(row, side) {
      row.forEach(function (c) { var ns = c[side]; c.b = ns.length ? ns.reduce(function (s, id) { return s + cells[id].i; }, 0) / ns.length : c.i; });
      row.sort(function (a, b) { return a.b - b.b || a.i - b.i; });
      pos(row);
    }
    for (var s = 0; s < 4; s++) {
      for (var d1 = 1; d1 < rows.length; d1++) sweep(rows[d1], 'up');
      for (var u1 = rows.length - 2; u1 >= 0; u1--) sweep(rows[u1], 'down');
    }

    // Horizontal positions: start packed and centred, then pull towards neighbours without overlapping.
    rows.forEach(function (row) {
      var x = 0; row.forEach(function (c) { c.x = x + c.w / 2; x += c.w + GX; });
      var shift = (x - GX) / 2; row.forEach(function (c) { c.x -= shift; });
    });
    function settle(row, side) {
      row.forEach(function (c) { var ns = c[side]; c.want = ns.length ? ns.reduce(function (s, id) { return s + cells[id].x; }, 0) / ns.length : c.x; });
      var i;
      row.forEach(function (c) { c.x = c.want; });
      for (i = 1; i < row.length; i++) { var min = row[i - 1].x + (row[i - 1].w + row[i].w) / 2 + GX; if (row[i].x < min) row[i].x = min; }
      var off = row.reduce(function (s, c) { return s + (c.x - c.want); }, 0) / (row.length || 1);
      row.forEach(function (c) { c.x -= off; });
      for (i = row.length - 2; i >= 0; i--) { var max = row[i + 1].x - (row[i + 1].w + row[i].w) / 2 - GX; if (row[i].x > max) row[i].x = max; }
      for (i = 1; i < row.length; i++) { var mn = row[i - 1].x + (row[i - 1].w + row[i].w) / 2 + GX; if (row[i].x < mn) row[i].x = mn; }
    }
    for (var k = 0; k < 3; k++) {
      for (var d2 = 1; d2 < rows.length; d2++) settle(rows[d2], 'up');
      for (var u2 = rows.length - 2; u2 >= 0; u2--) settle(rows[u2], 'down');
    }
    for (var d3 = 1; d3 < rows.length; d3++) settle(rows[d3], 'up');

    var minX = Infinity, maxX = -Infinity;
    rows.forEach(function (row) { row.forEach(function (c) { minX = Math.min(minX, c.x - c.w / 2); maxX = Math.max(maxX, c.x + c.w / 2); }); });
    if (minX === Infinity) { minX = 0; maxX = 0; }
    var dx = PAD - minX, r1 = function (v) { return Math.round(v * 10) / 10; };
    var nodes = {};
    input.forEach(function (n) { var c = cells[n.id]; nodes[n.id] = { x: r1(c.x - W / 2 + dx), y: PAD + c.layer * (H + GY), layer: c.layer }; });
    var outEdges = edges.map(function (e) {
      var pts = e.chain.map(function (id, i) {
        var c = cells[id], top = PAD + c.layer * (H + GY);
        return { x: r1(c.x + dx), y: i === 0 ? top + H : i === e.chain.length - 1 ? top : top + H / 2 };
      });
      return { from: e.from, to: e.to, points: pts };
    });
    return { nodes: nodes, edges: outEdges, width: r1(maxX - minX + PAD * 2), height: PAD * 2 + rows.length * H + Math.max(rows.length - 1, 0) * GY };
  }
  ST.layout = { layout: layout };
})();
