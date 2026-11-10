const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const url = require('node:url').pathToFileURL(require('node:path').join(__dirname, '..', 'index.html')).href;
const shots = process.argv[2] || require('node:os').tmpdir();
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, offline: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  page.on('request', (r) => { if (!r.url().startsWith('file:')) errors.push('network request: ' + r.url()); });
  await page.goto(url);
  await page.screenshot({ path: shots + '/01-overview-empty.png' });

  // Tree: open GRE, select the start node, tick tasks.
  await page.click('.nav:has-text("GRE")');
  await page.waitForSelector('.node');
  assert.equal(await page.locator('.node').count(), 16);
  assert.equal(await page.locator('.node.ready').count(), 1);
  await page.screenshot({ path: shots + '/02-tree-gre.png' });
  await page.click('.node:has-text("Know the test")');
  await page.waitForSelector('.detail[data-node="gre-format"]');
  await page.screenshot({ path: shots + '/03-tree-detail.png' });
  const boxes = page.locator('.detail .check input');
  const n = await boxes.count();
  for (let i = 0; i < n; i++) await page.locator('.detail .check input').nth(i).check();
  assert.equal(await page.locator('.node.done').count(), 1);
  assert.equal(await page.locator('.node.ready').count(), 1, 'diagnostic unlocks');
  // Plan an item from the next node.
  await page.click('.node:has-text("Diagnostic test")');
  await page.waitForSelector('.detail[data-node="gre-diagnostic"]');
  await page.locator('.detail [data-act="plan-item"]').first().click();
  // Custom task, resource, note, custom step.
  await page.fill('form[data-form="add-item"] input', 'My own extra task');
  await page.press('form[data-form="add-item"] input', 'Enter');
  assert.equal(await page.locator('.detail .check:has-text("My own extra task")').count(), 1);
  await page.fill('form[data-form="add-res"] input[name="title"]', 'My source');
  await page.fill('form[data-form="add-res"] input[name="url"]', 'example.org/x');
  await page.press('form[data-form="add-res"] input[name="url"]', 'Enter');
  assert.equal(await page.locator('.detail .res a[href="https://example.org/x"]').count(), 1);
  await page.fill('.detail textarea', 'note text');
  await page.fill('form[data-form="add-node"] input', 'My branch step');
  await page.press('form[data-form="add-node"] input', 'Enter');
  await page.waitForSelector('.node:has-text("My branch step")');
  assert.equal(await page.locator('.node').count(), 17);
  await page.screenshot({ path: shots + '/04-tree-custom.png' });

  // Reload: state persists under file://
  await page.reload();
  await page.waitForSelector('.node');
  assert.equal(await page.locator('.node').count(), 17);
  assert.equal(await page.locator('.node.done').count(), 1);
  await page.click('.node:has-text("Diagnostic test")');
  await page.waitForSelector('.detail[data-node="gre-diagnostic"]');
  assert.equal(await page.inputValue('.detail textarea'), 'note text');

  // Week: linked task present; add, toggle, move, delete.
  await page.click('.nav:has-text("Weekly plan")');
  await page.waitForSelector('.week-grid');
  assert.equal(await page.locator('.day.today .task').count(), 1);
  await page.fill('.day.today form input', 'Buy notebook');
  await page.press('.day.today form input', 'Enter');
  assert.equal(await page.locator('.day.today .task').count(), 2);
  await page.locator('.day.today .task:has-text("Buy notebook") select').selectOption('later');
  assert.equal(await page.locator('.day[data-drop=""] .task').count(), 1);
  await page.locator('.suggest [data-act="plan-item"]').first().click();
  await page.locator('.day.today .task input[type=checkbox]').first().check();
  assert.equal(await page.locator('.day.today .task.done').count(), 1);
  await page.screenshot({ path: shots + '/05-week.png', fullPage: true });
  await page.locator('.day[data-drop=""] .task [data-act="del-task"]').click();
  assert.equal(await page.locator('.day[data-drop=""] .task').count(), 0);
  // Drag and drop the remaining open task to the last day column.
  const days = page.locator('.day[data-drop]');
  const src = page.locator('.day.today .task:not(.done)').first();
  if (await src.count()) { await src.dragTo(days.nth(6)); }

  // Linked check: the first diagnostic item is now ticked in the tree.
  await page.click('.nav:has-text("GRE")');
  await page.click('.node:has-text("Diagnostic test")');
  await page.waitForSelector('.detail[data-node="gre-diagnostic"]');
  assert.equal(await page.locator('.detail .check.on').count(), 1);

  // Timeline: add block, see pace.
  await page.click('.nav:has-text("Timeline")');
  await page.click('form[data-form="add-block"] button');
  await page.waitForSelector('.g-bar');
  await page.selectOption('form[data-form="add-block"] select', 'ielts');
  await page.click('form[data-form="add-block"] button');
  assert.equal(await page.locator('.block').count(), 2);
  await page.screenshot({ path: shots + '/06-timeline.png' });
  await page.click('.nav:has-text("Overview")');
  await page.waitForSelector('.focus-card');
  await page.screenshot({ path: shots + '/07-overview.png', fullPage: true });

  // Every tree renders without overlap problems.
  for (const id of ['ielts', 'german', 'research', 'electronics', 'pcb', 'compeng', 'defense']) {
    await page.goto(url + '#tree/' + id);
    await page.waitForSelector('.node');
    await page.screenshot({ path: shots + '/tree-' + id + '.png' });
  }
  // Backup dialog and dark theme.
  await page.click('[data-act="data-dialog"]');
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('[data-act="export"]')]);
  assert.match(dl.suggestedFilename(), /^skilltree-backup-.*\.json$/);
  await page.click('[data-act="theme"]');
  await page.goto(url + '#tree/german/de-choose');
  await page.waitForSelector('.detail');
  await page.screenshot({ path: shots + '/08-dark-german.png' });
  // Narrow screen.
  await page.setViewportSize({ width: 390, height: 800 });
  await page.goto(url + '#week');
  await page.screenshot({ path: shots + '/09-mobile-week.png' });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
  assert.equal(overflow, false, 'no horizontal page scroll on phone');
  await browser.close();
  if (errors.length) { console.log(errors.join('\n')); process.exit(1); }
  console.log('E2E OK');
})().catch((e) => { console.error(e); process.exit(1); });
