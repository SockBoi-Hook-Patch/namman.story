const { chromium } = require('playwright'); const http = require('http'); const fs = require('fs'); const path = require('path');
const ROOT = '/home/user/Blow-out-Prevent';
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png', '.json': 'application/json' };
// usage: node brand/cover/render_cover.js out.png '[px,py,pz,tx,ty,tz,fov]' [t]
const [out, cam, t] = process.argv.slice(2);
const srv = http.createServer((q, r) => { const p = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(r); });
srv.listen(0, '127.0.0.1', async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const pg = await b.newPage({ viewport: { width: 1640, height: 624 } });
  pg.on('pageerror', e => console.error(e.message));
  await pg.goto(`http://127.0.0.1:${srv.address().port}/brand/cover/cover.html?cam=${encodeURIComponent(cam || '')}&t=${t || 136}`.replace('cam=&', ''));
  await pg.waitForFunction(() => window.done, null, { timeout: 120000 });
  await (await pg.$('#out')).screenshot({ path: out });
  await b.close(); srv.close(); console.log('wrote', out);
});
