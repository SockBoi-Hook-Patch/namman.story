#!/usr/bin/env node
// Renders studio stills of every assets_p5.js builder (look.js upgrade applied) into assets_p5_preview/.
// Usage (from anywhere): NODE_PATH=/opt/node-tools/node_modules node ep05-rig-p5-wellcontrol/assets_p5_demo.js [scene ...] [--sheets]
// Serves /home/user/Blow-out-Prevent (repo root) so ../lookdev/look.js resolves. Writes
// assets_p5_preview/<scene>_v<i>.png (1080x1920) and, with --sheets, assets_p5_preview/sheet_<scene>.jpg.
const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

const HERE = __dirname, ROOT = path.resolve(HERE, '..');
const OUT = path.join(HERE, 'assets_p5_preview');
const args = process.argv.slice(2);
const only = args.filter(a => !a.startsWith('--'));
const sheets = args.includes('--sheets');
const GL_ARGS = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];
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
  const browser = await chromium.launch({ args: GL_ARGS, ...(proxy ? { proxy: { server: proxy, bypass: '127.0.0.1,localhost' } } : {}) });
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, ignoreHTTPSErrors: true });
  page.on('pageerror', e => console.error('[pageerror]', e.message));
  page.on('console', m => { if ((m.type() === 'error' || m.type() === 'warning') && !/GPU stall|GL Driver/.test(m.text())) console.error('[page]', m.text()); });
  await page.goto(`http://127.0.0.1:${srv.address().port}/ep05-rig-p5-wellcontrol/assets_p5_demo.html?s=${only.join(',')}`);
  await page.waitForFunction(() => window.ready, null, { timeout: 180000 });
  const scenes = await page.evaluate(() => window.SCENES);
  for (const [name, n] of Object.entries(scenes)) {
    if (only.length && !only.includes(name)) continue;
    for (let i = 0; i < n; i++) {
      const t0 = Date.now();
      save(path.join(OUT, `${name}_v${i}.png`), await page.evaluate(([s, k]) => window.render(s, k), [name, i]));
      console.log(`${name}_v${i}.png`, Date.now() - t0, 'ms');
    }
    if (sheets) save(path.join(OUT, `sheet_${name}.jpg`), await page.evaluate(s => window.sheet(s), name));
  }
  console.log(JSON.stringify(await page.evaluate(() => window.stats()), null, 0));
  await browser.close(); srv.close();
})().catch(e => { console.error(e); process.exit(1); });
