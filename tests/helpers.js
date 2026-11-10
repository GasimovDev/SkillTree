// Loads the browser scripts (plain IIFEs that attach to globalThis.ST) into Node.
const path = require('node:path');
const fs = require('node:fs');
const root = path.join(__dirname, '..');
['js/core/util.js', 'js/core/model.js', 'js/core/layout.js', 'js/core/store.js'].forEach((f) => require(path.join(root, f)));
function loadData() {
  globalThis.SKILLTREE_DATA = { trees: [] };
  const dir = path.join(root, 'js/data');
  fs.readdirSync(dir).filter((f) => f.endsWith('.js')).sort().forEach((f) => {
    delete require.cache[path.join(dir, f)];
    require(path.join(dir, f));
  });
  return globalThis.SKILLTREE_DATA;
}
function memoryStorage() {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) };
}
module.exports = { ST: globalThis.ST, loadData, memoryStorage };
