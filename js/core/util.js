// Small date and id helpers. Dates are plain 'YYYY-MM-DD' strings in local time.
(function () {
  var ST = (globalThis.ST = globalThis.ST || {});
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function toISO(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function parseISO(s) { var p = s.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function addDays(iso, n) { var d = parseISO(iso); d.setDate(d.getDate() + n); return toISO(d); }
  function weekStart(iso) { var d = parseISO(iso); return addDays(iso, -((d.getDay() + 6) % 7)); }
  function weekDays(iso) { var s = weekStart(iso), out = []; for (var i = 0; i < 7; i++) out.push(addDays(s, i)); return out; }
  function daysBetween(a, b) {
    var x = parseISO(a), y = parseISO(b);
    return Math.round((Date.UTC(y.getFullYear(), y.getMonth(), y.getDate()) - Date.UTC(x.getFullYear(), x.getMonth(), x.getDate())) / 86400000);
  }
  function today() { return toISO(new Date()); }
  function hash(str) { var h = 5381; for (var i = 0; i < str.length; i++) h = ((h * 33) ^ str.charCodeAt(i)) >>> 0; return h.toString(36); }
  var counter = 0;
  function uid() { counter++; return Date.now().toString(36) + counter.toString(36) + Math.floor(Math.random() * 1e9).toString(36); }
  ST.util = { toISO: toISO, parseISO: parseISO, addDays: addDays, weekStart: weekStart, weekDays: weekDays, daysBetween: daysBetween, today: today, hash: hash, uid: uid };
})();
