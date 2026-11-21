#!/usr/bin/env node
// Renders a namman.story 3D episode to MP4 (1080x1920, 30 fps, H.264 + AAC).
// Usage: node render.js [out.mp4] [--fps 30] [--jobs 2] [--preview t1,t2,...] [--from s --to s]
const { chromium } = require('playwright');
const { spawn, execFileSync } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const outFile = path.resolve(args.find(a => a.endsWith('.mp4')) || 'EP02.mp4');
const FPS = +opt('--fps', 30);
const JOBS = +opt('--jobs', 2);
const preview = opt('--preview', null);
const ROOT = __dirname;
const GL_ARGS = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json' };
function serve() {
  const srv = http.createServer((req, res) => {
    const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
    if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' });
    fs.createReadStream(p).pipe(res);
  });
  return new Promise(r => srv.listen(0, '127.0.0.1', () => r(srv)));
}

async function openPage(browser, url) {
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
  page.on('console', m => { if (m.type() === 'error') console.error('[page]', m.text()); });
  page.on('pageerror', e => console.error('[pageerror]', e.message));
  await page.goto(url);
  await page.waitForFunction(() => window.ready, null, { timeout: 120000 });
  await page.evaluate(() => window.ready);
  return page;
}

function encodeSegment(page, from, to, file) {
  return new Promise(async (resolve, reject) => {
    const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'png', '-i', '-',
      '-c:v', 'libx264', '-preset', 'medium', '-crf', '17', '-pix_fmt', 'yuv420p', file], { stdio: ['pipe', 'inherit', 'inherit'] });
    ff.on('close', c => c === 0 ? resolve() : reject(new Error('ffmpeg ' + c)));
    try {
      for (let i = from; i < to; i++) {
        const b64 = await page.evaluate(t => renderFrame(t), i / FPS);
        const buf = Buffer.from(b64, 'base64');
        if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
        progress.done++;
      }
    } catch (e) { reject(e); }
    ff.stdin.end();
  });
}
const progress = { done: 0 };

(async () => {
  const srv = await serve();
  const url = `http://127.0.0.1:${srv.address().port}/frame.html`;
  const browser = await chromium.launch({ args: GL_ARGS });
  const page = await openPage(browser, url);
  const DURATION = await page.evaluate(() => window.DURATION);

  if (preview) {
    const dir = path.dirname(outFile);
    for (const t of preview.split(',').map(Number)) {
      const t0 = Date.now();
      const b64 = await page.evaluate(t => renderFrame(t), t);
      const f = path.join(dir, `p_${String(t).padStart(5, '0')}.png`);
      fs.writeFileSync(f, Buffer.from(b64, 'base64'));
      console.log('wrote', f, (Date.now() - t0) + 'ms');
    }
    await browser.close(); srv.close(); return;
  }

  const tmp = fs.mkdtempSync(path.join(path.dirname(outFile), '.render-'));
  console.log('rendering audio…');
  const wav = path.join(tmp, 'audio.wav');
  fs.writeFileSync(wav, Buffer.from(await page.evaluate(() => renderAudio()), 'base64'));

  const total = Math.round(DURATION * FPS);
  const from = Math.round(+opt('--from', 0) * FPS), to = Math.min(total, Math.round(+opt('--to', DURATION) * FPS));
  const n = to - from, per = Math.ceil(n / JOBS);
  const pages = [page];
  for (let j = 1; j < JOBS; j++) pages.push(await openPage(browser, url));
  const t0 = Date.now();
  const timer = setInterval(() => {
    const s = (Date.now() - t0) / 1000, d = progress.done;
    console.log(`frames ${d}/${n}  ${s.toFixed(0)}s  eta ${d ? ((n - d) * s / d).toFixed(0) : '?'}s`);
  }, 15000);
  const segs = [];
  await Promise.all(pages.map((p, j) => {
    const a = from + j * per, b = Math.min(to, a + per);
    if (a >= b) return null;
    const f = path.join(tmp, `seg${j}.mp4`); segs[j] = f;
    return encodeSegment(p, a, b, f);
  }));
  clearInterval(timer);
  fs.writeFileSync(path.join(tmp, 'list.txt'), segs.filter(Boolean).map(f => `file '${f}'`).join('\n'));
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', path.join(tmp, 'list.txt'),
    '-ss', String(from / FPS), '-t', String(n / FPS), '-i', wav,
    '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', outFile]);
  await browser.close(); srv.close();
  fs.rmSync(tmp, { recursive: true, force: true });
  console.log(`done in ${((Date.now() - t0) / 1000).toFixed(0)}s:`, outFile);
  console.log(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration:stream=codec_name,width,height', '-of', 'compact', outFile]).toString());
})().catch(e => { console.error(e); process.exit(1); });
