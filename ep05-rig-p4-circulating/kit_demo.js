#!/usr/bin/env node
// Renders still PNGs of every overlay_kit.js component into kit_preview/.
// Usage: NODE_PATH=/opt/node-tools/node_modules node kit_demo.js [scene ...] [--no-guides] [--no-sheets]
// Writes kit_preview/<scene>_t<time>.png for each sample time, plus kit_preview/sheet_<scene>.png (contact sheet).
const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const OUT = path.join(ROOT, 'kit_preview');
const args = process.argv.slice(2);
const only = args.filter(a => !a.startsWith('--'));
const guides = !args.includes('--no-guides');
const sheets = !args.includes('--no-sheets');

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.css': 'text/css' };
function serve() {
  const srv = http.createServer((req, res) => {
    const p = path.normalize(path.join(ROOT, decodeURIComponent(req.url.split('?')[0])));
    if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' });
    fs.createReadStream(p).pipe(res);
  });
  return new Promise(r => srv.listen(0, '127.0.0.1', () => r(srv)));
}
const save = (file, dataUrl) => fs.writeFileSync(file, Buffer.from(dataUrl.split(',')[1], 'base64'));

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const srv = await serve();
  const proxy = process.env.HTTPS_PROXY || process.env.https_proxy;
  const browser = await chromium.launch(proxy ? { proxy: { server: proxy, bypass: '127.0.0.1,localhost' } } : {});
  const context = await browser.newContext({ viewport: { width: 1080, height: 1920 }, ignoreHTTPSErrors: true });
  const page = await context.newPage();
  page.on('pageerror', e => console.error('[pageerror]', e.message));
  page.on('console', m => { if (m.type() === 'error') console.error('[page]', m.text()); });
  await page.goto(`http://127.0.0.1:${srv.address().port}/kit_demo.html`);
  await page.waitForFunction(() => window.ready, null, { timeout: 60000 });
  const font = await page.evaluate(() => window.ready);
  if (font !== 'kanit') console.warn('WARNING: Kanit did not load; stills use a fallback font.');
  const scenes = await page.evaluate(() => window.SCENES);
  let n = 0;
  for (const [name, times] of Object.entries(scenes)) {
    if (only.length && !only.includes(name)) continue;
    for (const t of times) {
      save(path.join(OUT, `${name}_t${t.toFixed(2)}.png`), await page.evaluate(([s, tt, g]) => window.render(s, tt, g), [name, t, guides])); n++;
    }
    if (sheets) save(path.join(OUT, `sheet_${name}.png`), await page.evaluate(([s, g]) => window.sheet(s, g), [name, guides]));
  }
  console.log(`font=${font} wrote ${n} stills to ${OUT}`);
  await browser.close(); srv.close();
})().catch(e => { console.error(e); process.exit(1); });
