// overlay_kit.js: namman.story overlay kit (EP05 "Drilling Rig 101", Part 4: Circulating System)
// Pure Canvas-2D drawing functions for 1080x1920 (9:16). Every component is a pure function of t:
// no Date, no Math.random, no hidden state. Signature: fn(ctx, t, opts). Times in seconds.
// Each component owns its entrance (t0) and exit (t1); outside [t0, t1] it draws nothing.
// See docs/design.md for the design system and the API.

// ============================================================== tokens
export const W = 1080, H = 1920;
export const SAFE = { x0: 60, x1: 960, y0: 160, y1: 1280, cx: 510, captionY0: 1310, captionY1: 1560, uiY: 1600 };
export const SYS = { power: '#f59e0b', hoist: '#3b82f6', rotate: '#ef4444', circ: '#14b8a6', wc: '#a855f7' };
export const C = {
  ink: '#0f172a', ink2: '#1e293b', slate: '#334155', mute: '#64748b', line: '#cbd5e1',
  white: '#ffffff', text2: 'rgba(226,232,240,0.88)', text3: 'rgba(203,213,225,0.62)',
  warm: '#ffd166', warmSoft: '#ffe3a3', mud: '#c8925a', mudDark: '#7c4a22',
  follow: '#ef4444', followHover: '#dc2626', followDone: '#e2e8f0', avatarRing: '#f97316',
  scrim: '#06101e',
};
export const PARTS = [
  { key: 'power', name: 'Power' }, { key: 'hoist', name: 'Hoisting' }, { key: 'rotate', name: 'Rotating' },
  { key: 'circ', name: 'Circulating' }, { key: 'wc', name: 'Well Control' },
];
// motion tokens (seconds)
export const MOTION = { in: 0.5, out: 0.35, stagger: 0.09, pop: 0.45, sweep: 1.1 };

// ============================================================== math / easing (pure)
export const clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
export const lerp = (a, b, u) => a + (b - a) * u;
export const fract = x => x - Math.floor(x);
export const sstep = (a, b, x) => { const u = clamp((x - a) / (b - a)); return u * u * (3 - 2 * u); };
export const eout = u => 1 - Math.pow(1 - clamp(u), 3);
export const ein = u => Math.pow(clamp(u), 3);
export const eio = u => { u = clamp(u); return u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2; };
export const eexpo = u => { u = clamp(u); return u >= 1 ? 1 : 1 - Math.pow(2, -10 * u); };
export const eback = (u, s = 1.70158) => { u = clamp(u) - 1; return 1 + u * u * ((s + 1) * u + s); };
export const hash = (i, k = 0) => fract(Math.sin(i * 127.1 + k * 311.7 + 0.123) * 43758.5453);
export const win = (t, a, b, fi = 0.3, fo = 0.3) => Math.min(sstep(a, a + fi, t), 1 - sstep(b - fo, b, t));
// envelope: a = opacity, i = eased entrance 0..1, o = eased exit 0..1 (1 = gone)
export function env(t, t0, t1, din = MOTION.in, dout = MOTION.out) {
  if (t < t0 || t > t1) return { a: 0, i: 0, o: 1, live: false };
  const i = eout((t - t0) / din), o = ein((t - (t1 - dout)) / dout);
  return { a: Math.min(sstep(t0, t0 + din * 0.7, t), 1 - sstep(t1 - dout, t1, t)), i, o, live: true };
}
// staggered sub-entrance: 0..1 for item k
export const stag = (t, t0, k, step = MOTION.stagger, dur = 0.45) => eout((t - t0 - k * step) / dur);

// ============================================================== colour
function rgb(hex) { const h = hex.replace('#', ''); const n = parseInt(h.length === 3 ? h.replace(/./g, c => c + c) : h, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
export const hexA = (hex, a) => { const [r, g, b] = rgb(hex); return `rgba(${r},${g},${b},${a})`; };
export const mix = (h1, h2, u) => { const a = rgb(h1), b = rgb(h2); return '#' + a.map((v, i) => Math.round(lerp(v, b[i], u)).toString(16).padStart(2, '0')).join(''); };
export const light = (hex, u = 0.45) => mix(hex, '#ffffff', u);
export const deep = (hex, u = 0.35) => mix(hex, '#0f172a', u);

// ============================================================== primitives
export const F = (w, s) => `${w} ${s}px Kanit`;
export function rr(ctx, x, y, w, h, r) {
  w = Math.max(0, w); h = Math.max(0, h); r = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
export function shadow(ctx, blur = 24, oy = 8, a = 0.38, col = '0,0,0') {
  ctx.shadowColor = `rgba(${col},${a})`; ctx.shadowBlur = blur; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = oy;
}
export function noShadow(ctx) { ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0; ctx.shadowOffsetX = 0; }
function setLS(ctx, px) { if ('letterSpacing' in ctx) ctx.letterSpacing = `${px}px`; }

// Fit text into maxW by shrinking the font size (down to min). Sets ctx.font, returns the size used.
export function fit(ctx, str, weight, size, maxW, min = Math.max(12, Math.round(size * 0.55))) {
  let s = size; ctx.font = F(weight, s);
  let m = ctx.measureText(str).width;
  if (m > maxW) {
    s = Math.max(min, Math.floor(s * maxW / m)); ctx.font = F(weight, s); m = ctx.measureText(str).width;
    while (m > maxW && s > min) { s--; ctx.font = F(weight, s); m = ctx.measureText(str).width; }
  }
  return s;
}
export function measure(ctx, str, weight, size, ls = 0) {
  ctx.save(); setLS(ctx, ls); ctx.font = F(weight, size); const m = ctx.measureText(str).width; ctx.restore(); return m;
}
// Draw text that always fits maxW: shrink to `min`, then squeeze horizontally as a last resort.
// opts: w (weight), size, maxW, min, align, color, baseline, ls (letter-spacing px). Returns { size, width }.
export function text(ctx, str, x, y, o = {}) {
  const { w = 400, size = 32, maxW = 1e9, align = 'left', color = '#fff', baseline = 'middle', ls = 0 } = o;
  const min = o.min ?? Math.max(12, Math.round(size * 0.55));
  ctx.save(); setLS(ctx, ls);
  const s = fit(ctx, str, w, size, maxW, min);
  const m = ctx.measureText(str).width;
  ctx.fillStyle = color; ctx.textAlign = align; ctx.textBaseline = baseline;
  if (m > maxW) { ctx.translate(x, y); ctx.scale(maxW / m, 1); ctx.fillText(str, 0, 0); }
  else ctx.fillText(str, x, y);
  ctx.restore();
  return { size: s, width: Math.min(m, maxW) };
}

// Glass panel. theme 'dark' (frosted navy) or 'light' (frosted white). opts: accent (left bar colour), glow (accent glow).
export function glass(ctx, x, y, w, h, r = 28, o = {}) {
  const { theme = 'dark', accent = null, glow = 0, shadowA = theme === 'dark' ? 0.42 : 0.32, sheen = true } = o;
  ctx.save();
  // drop shadow (+ optional accent glow)
  if (glow > 0 && accent) { ctx.shadowColor = hexA(accent, 0.55 * glow); ctx.shadowBlur = 36; ctx.shadowOffsetY = 0; ctx.fillStyle = '#000'; rr(ctx, x, y, w, h, r); ctx.fill(); }
  shadow(ctx, 40, 14, shadowA);
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  if (theme === 'dark') { g.addColorStop(0, 'rgba(28,40,70,0.90)'); g.addColorStop(1, 'rgba(9,15,31,0.86)'); }
  else { g.addColorStop(0, 'rgba(255,255,255,0.98)'); g.addColorStop(1, 'rgba(238,243,249,0.96)'); }
  ctx.fillStyle = g; rr(ctx, x, y, w, h, r); ctx.fill();
  noShadow(ctx);
  ctx.save(); rr(ctx, x, y, w, h, r); ctx.clip();
  if (sheen) {
    const s = ctx.createLinearGradient(0, y, 0, y + Math.min(h, 160));
    s.addColorStop(0, theme === 'dark' ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.6)'); s.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = s; ctx.fillRect(x, y, w, Math.min(h, 160));
  }
  if (accent) {
    const ag = ctx.createLinearGradient(0, y, 0, y + h); ag.addColorStop(0, light(accent, 0.25)); ag.addColorStop(1, accent);
    ctx.fillStyle = ag; ctx.fillRect(x, y, 8, h);
  }
  ctx.restore();
  // hairline rim: brighter on top
  const sg = ctx.createLinearGradient(0, y, 0, y + h);
  if (theme === 'dark') { sg.addColorStop(0, 'rgba(255,255,255,0.30)'); sg.addColorStop(0.5, 'rgba(255,255,255,0.08)'); sg.addColorStop(1, 'rgba(255,255,255,0.04)'); }
  else { sg.addColorStop(0, 'rgba(255,255,255,1)'); sg.addColorStop(1, 'rgba(148,163,184,0.35)'); }
  ctx.strokeStyle = sg; ctx.lineWidth = 1.5; rr(ctx, x + 0.75, y + 0.75, w - 1.5, h - 1.5, r - 0.75); ctx.stroke();
  ctx.restore();
}

// Vector icon glyphs, drawn in a 24-unit box centred on (x, y), scaled to size s.
export function icon(ctx, name, x, y, s, color = '#fff', lw = 2.2) {
  ctx.save(); ctx.translate(x, y); const k = s / 24; ctx.scale(k, k);
  ctx.lineWidth = lw; ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath();
  switch (name) {
    case 'drop':
      ctx.moveTo(0, -10); ctx.bezierCurveTo(4, -4.5, 8, -0.5, 8, 3.5); ctx.arc(0, 3.5, 8, 0, Math.PI); ctx.bezierCurveTo(-8, -0.5, -4, -4.5, 0, -10); ctx.closePath(); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 3.5, 4.2, Math.PI * 0.55, Math.PI * 0.95); ctx.stroke(); break;
    case 'check': ctx.moveTo(-7, 0.5); ctx.lineTo(-2.2, 5.5); ctx.lineTo(7.5, -5.5); ctx.stroke(); break;
    case 'question':
      ctx.moveTo(-4.6, -4.2); ctx.bezierCurveTo(-4.6, -10, 4.8, -10, 4.8, -4.4); ctx.bezierCurveTo(4.8, -0.8, 0, -0.4, 0, 3.4); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 8.2, 1.7, 0, 7); ctx.fill(); break;
    case 'pump':
      ctx.arc(-1, 1, 8, 0, 7); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(4, -5.5); ctx.lineTo(4, -10); ctx.lineTo(11, -10); ctx.stroke();
      for (let i = 0; i < 3; i++) { const q = i * 2.094; ctx.beginPath(); ctx.moveTo(-1, 1); ctx.quadraticCurveTo(-1 + Math.cos(q + 0.7) * 5, 1 + Math.sin(q + 0.7) * 5, -1 + Math.cos(q + 1.4) * 5.5, 1 + Math.sin(q + 1.4) * 5.5); ctx.stroke(); }
      break;
    case 'filter': ctx.moveTo(-10, -8); ctx.lineTo(10, -8); ctx.lineTo(3, 1); ctx.lineTo(3, 7); ctx.lineTo(-3, 10); ctx.lineTo(-3, 1); ctx.closePath(); ctx.stroke(); break;
    case 'calc':
      rr(ctx, -8, -10.5, 16, 21, 3.2); ctx.stroke(); ctx.beginPath(); rr(ctx, -4.8, -7.4, 9.6, 4.6, 1.2); ctx.stroke();
      for (const [a, b] of [[-3.6, 2], [0, 2], [3.6, 2], [-3.6, 6], [0, 6], [3.6, 6]]) { ctx.beginPath(); ctx.arc(a, b, 1.15, 0, 7); ctx.fill(); }
      break;
    case 'gauge':
      ctx.arc(0, 4, 10, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, 4); ctx.lineTo(5, -3); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 4, 2, 0, 7); ctx.fill(); break;
    case 'loop':
      ctx.arc(0, 0, 8, -2.6, 0.9); ctx.stroke(); ctx.beginPath(); ctx.arc(0, 0, 8, 0.55, 2.95 + 0.6); ctx.stroke();
      for (const q of [0.9, 3.55]) { const px = Math.cos(q) * 8, py = Math.sin(q) * 8, tx = -Math.sin(q), ty = Math.cos(q);
        ctx.beginPath(); ctx.moveTo(px + tx * 3.5 + Math.cos(q) * 3, py + ty * 3.5 + Math.sin(q) * 3); ctx.lineTo(px, py); ctx.lineTo(px + tx * 3.5 - Math.cos(q) * 3, py + ty * 3.5 - Math.sin(q) * 3); ctx.stroke(); }
      break;
    case 'bell':
      ctx.moveTo(-7.5, 5); ctx.bezierCurveTo(-7.5, -9.5, 7.5, -9.5, 7.5, 5); ctx.lineTo(9, 6.5); ctx.lineTo(-9, 6.5); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.arc(0, 8.6, 2.6, 0, Math.PI); ctx.fill(); ctx.beginPath(); ctx.arc(0, -8.4, 1.6, 0, 7); ctx.fill(); break;
    case 'arrowR': ctx.moveTo(-8, 0); ctx.lineTo(8, 0); ctx.moveTo(2, -6); ctx.lineTo(8, 0); ctx.lineTo(2, 6); ctx.stroke(); break;
    case 'arrowD': ctx.moveTo(0, -8); ctx.lineTo(0, 8); ctx.moveTo(-6, 2); ctx.lineTo(0, 8); ctx.lineTo(6, 2); ctx.stroke(); break;
    case 'plus': ctx.moveTo(-7, 0); ctx.lineTo(7, 0); ctx.moveTo(0, -7); ctx.lineTo(0, 7); ctx.stroke(); break;
    case 'play': ctx.moveTo(-5, -8); ctx.lineTo(8, 0); ctx.lineTo(-5, 8); ctx.closePath(); ctx.fill(); break;
    case 'layers':
      ctx.moveTo(0, -9); ctx.lineTo(10, -4); ctx.lineTo(0, 1); ctx.lineTo(-10, -4); ctx.closePath(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-10, 1); ctx.lineTo(0, 6); ctx.lineTo(10, 1); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-10, 5.5); ctx.lineTo(0, 10.5); ctx.lineTo(10, 5.5); ctx.stroke(); break;
    case 'warn':
      ctx.moveTo(0, -10); ctx.lineTo(10.5, 8.5); ctx.lineTo(-10.5, 8.5); ctx.closePath(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, -3); ctx.lineTo(0, 2.5); ctx.stroke(); ctx.beginPath(); ctx.arc(0, 5.6, 1.3, 0, 7); ctx.fill(); break;
    default: ctx.arc(0, 0, 4, 0, 7); ctx.fill();
  }
  ctx.restore();
}
// icon inside a soft tinted disc
export function iconBadge(ctx, name, x, y, d, color, o = {}) {
  const { solid = false, ring = true } = o;
  ctx.save();
  const g = ctx.createLinearGradient(0, y - d / 2, 0, y + d / 2);
  if (solid) { g.addColorStop(0, light(color, 0.18)); g.addColorStop(1, deep(color, 0.12)); }
  else { g.addColorStop(0, hexA(color, 0.26)); g.addColorStop(1, hexA(color, 0.12)); }
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, d / 2, 0, 7); ctx.fill();
  if (ring) { ctx.strokeStyle = solid ? 'rgba(255,255,255,0.45)' : hexA(color, 0.55); ctx.lineWidth = 2; ctx.stroke(); }
  icon(ctx, name, x, y, d * 0.52, solid ? '#fff' : o.ink || color, o.lw || 2.4);
  ctx.restore();
}
function pulseRing(ctx, x, y, r0, grow, t, color, period = 1.3, lw = 3, a = 1) {
  for (const off of [0, 0.5]) {
    const ph = fract(t / period + off);
    ctx.save(); ctx.globalAlpha *= a * (1 - ph) * 0.9; ctx.strokeStyle = color; ctx.lineWidth = lw;
    ctx.beginPath(); ctx.arc(x, y, r0 + ph * grow, 0, 7); ctx.stroke(); ctx.restore();
  }
}
// number formatting for count-ups: keeps the decimals of the target and adds thousands separators
export function fmtNum(v, decimals = 0) {
  const s = Math.abs(v).toFixed(decimals); const [i, d] = s.split('.');
  return (v < 0 ? '-' : '') + i.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + (d ? '.' + d : '');
}
const decOf = v => { const s = String(v); const p = s.indexOf('.'); return p < 0 ? 0 : s.length - p - 1; };

// ============================================================== 5-part progress bar
// partsBar(ctx, t, { y, current (0-based), t0, a, x, w, parts })
export function partsBar(ctx, t, o = {}) {
  const { x = 60, y = 660, w = 900, current = 3, t0 = -1e9, a = 1, parts = PARTS, h = 84 } = o;
  if (a <= 0) return;
  const gap = 12, n = parts.length, cw = (w - gap * (n - 1)) / n;
  parts.forEach((p, i) => {
    const k = stag(t, t0, i, 0.07, 0.45); if (k <= 0) return;
    const col = SYS[p.key] || p.color || '#94a3b8', cx = x + i * (cw + gap), on = i === current, done = i < current;
    ctx.save(); ctx.globalAlpha = a * k; ctx.translate(0, (1 - k) * 18);
    if (on) {
      ctx.shadowColor = hexA(col, 0.65); ctx.shadowBlur = 28;
      const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, light(col, 0.12)); g.addColorStop(1, deep(col, 0.18));
      ctx.fillStyle = g; rr(ctx, cx, y, cw, h, 18); ctx.fill(); noShadow(ctx);
      ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 2; rr(ctx, cx + 1, y + 1, cw - 2, h - 2, 17); ctx.stroke();
    } else {
      ctx.fillStyle = 'rgba(10,17,34,0.78)'; rr(ctx, cx, y, cw, h, 18); ctx.fill();
      ctx.strokeStyle = hexA(col, done ? 0.75 : 0.45); ctx.lineWidth = 2; rr(ctx, cx + 1, y + 1, cw - 2, h - 2, 17); ctx.stroke();
      ctx.save(); rr(ctx, cx, y, cw, h, 18); ctx.clip(); ctx.fillStyle = hexA(col, done ? 0.95 : 0.35); ctx.fillRect(cx, y + h - 5, cw, 5); ctx.restore();
    }
    const tc = on ? '#fff' : done ? 'rgba(255,255,255,0.88)' : 'rgba(255,255,255,0.55)';
    text(ctx, `PART ${i + 1}`, cx + cw / 2, y + 26, { w: 600, size: 16, ls: 2, align: 'center', color: on ? 'rgba(255,255,255,0.92)' : hexA(light(col, 0.3), done ? 0.95 : 0.7), maxW: cw - 16 });
    text(ctx, p.name, cx + cw / 2, y + 55, { w: 600, size: 22, align: 'center', color: tc, maxW: cw - 18 });
    if (done) { ctx.globalAlpha = a * k; iconBadge(ctx, 'check', cx + cw - 15, y + 15, 20, col, { solid: true, ring: false, lw: 3.4 }); }
    ctx.restore();
  });
}

// ============================================================== titleCard
// titleCard(ctx, t, { t0, t1, part, total, kicker, title, subtitle, hook, hookAt, color, parts })
export function titleCard(ctx, t, o) {
  const { t0 = 0.3, t1 = 6.8, part = 4, total = 5, kicker = 'DRILLING RIG 101 · EP.05', title, subtitle, hook, hookAt = 2.3, color = SYS.circ, parts = PARTS } = o;
  const E = env(t, t0, t1, 0.8, 0.45); if (!E.live || E.a <= 0) return;
  const lc = light(color, 0.45), cx = 510, dy = -E.o * 26;
  ctx.save(); ctx.translate(0, dy);
  // panel
  const pk = eout((t - t0) / 0.6);
  ctx.save(); ctx.globalAlpha = E.a * pk; ctx.translate(cx, 416); ctx.scale(0.96 + 0.04 * pk, 0.96 + 0.04 * pk); ctx.translate(-cx, -416);
  glass(ctx, 60, 196, 900, 440, 40);
  // faint accent wash behind the title
  ctx.save(); rr(ctx, 60, 196, 900, 440, 40); ctx.clip();
  const rg = ctx.createRadialGradient(cx, 430, 10, cx, 430, 520); rg.addColorStop(0, hexA(color, 0.20)); rg.addColorStop(1, hexA(color, 0));
  ctx.fillStyle = rg; ctx.fillRect(60, 196, 900, 440); ctx.restore();
  ctx.restore();
  ctx.globalAlpha = E.a;
  ctx.shadowColor = 'rgba(0,0,0,0.35)'; ctx.shadowBlur = 16;
  // kicker
  const k1 = stag(t, t0 + 0.15, 0); ctx.save(); ctx.globalAlpha = E.a * k1;
  text(ctx, kicker, cx, 254 + (1 - k1) * 14, { w: 600, size: 24, ls: 5, align: 'center', color: hexA(C.warmSoft, 0.92), maxW: 800 });
  ctx.restore();
  // part pill
  const k2 = eback((t - t0 - 0.28) / 0.5, 2.2);
  if (k2 > 0) {
    ctx.save(); ctx.globalAlpha = E.a * clamp(k2); const lab = `PART ${part} / ${total}`; const pw = measure(ctx, lab, 600, 28, 3) + 56;
    ctx.translate(cx, 312); ctx.scale(0.7 + 0.3 * k2, 0.7 + 0.3 * k2); noShadow(ctx);
    ctx.fillStyle = hexA(color, 0.22); rr(ctx, -pw / 2, -25, pw, 50, 25); ctx.fill(); ctx.strokeStyle = color; ctx.lineWidth = 2.5; ctx.stroke();
    text(ctx, lab, 0, 1, { w: 600, size: 28, ls: 3, align: 'center', color: lc }); ctx.restore();
  }
  // title: masked rise
  const k3 = eout((t - t0 - 0.38) / 0.7);
  ctx.save(); ctx.beginPath(); ctx.rect(60, 340, 900, 132); ctx.clip();
  text(ctx, title, cx, 410 + (1 - k3) * 120, { w: 600, size: 112, align: 'center', color: '#fff', maxW: 820 });
  ctx.restore();
  // underline sweep
  const k4 = eio((t - t0 - 0.75) / 0.6); noShadow(ctx);
  if (k4 > 0) { const uw = 180 * k4, g = ctx.createLinearGradient(cx - uw / 2, 0, cx + uw / 2, 0); g.addColorStop(0, color); g.addColorStop(1, lc); ctx.fillStyle = g; rr(ctx, cx - uw / 2, 482, uw, 6, 3); ctx.fill(); }
  // subtitle
  const k5 = stag(t, t0 + 0.85, 0, 0, 0.55);
  ctx.save(); ctx.globalAlpha = E.a * k5; ctx.shadowColor = 'rgba(0,0,0,0.35)'; ctx.shadowBlur = 12;
  if (subtitle) text(ctx, subtitle, cx, 548 + (1 - k5) * 16, { w: 400, size: 42, align: 'center', color: C.warmSoft, maxW: 820 });
  ctx.restore();
  ctx.restore();
  // parts bar
  ctx.save(); ctx.translate(0, dy); partsBar(ctx, t, { y: 664, current: part - 1, t0: t0 + 1.0, a: E.a, parts }); ctx.restore();
  // hook question pill
  if (hook) hookPill(ctx, t, t0 + hookAt, E, hook, color, 1150 + dy);
}
function hookPill(ctx, t, ts, E, str, color, cy) {
  const k = eback((t - ts) / 0.55, 1.6); if (k <= 0) return;
  const cx = 510, tw = Math.min(measure(ctx, str, 600, 46), 900 - 150), w = tw + 150, h = 108;
  ctx.save(); ctx.globalAlpha = E.a * clamp(k * 1.6); ctx.translate(cx, cy + (1 - clamp(k)) * 30); ctx.scale(0.88 + 0.12 * k, 0.88 + 0.12 * k);
  glass(ctx, -w / 2, -h / 2, w, h, h / 2, { accent: null, glow: 0.6 });
  ctx.strokeStyle = hexA(color, 0.7); ctx.lineWidth = 2.5; rr(ctx, -w / 2 + 1, -h / 2 + 1, w - 2, h - 2, h / 2 - 1); ctx.stroke();
  const ix = -w / 2 + 20 + 34;
  pulseRing(ctx, ix, 0, 34, 18, t - ts, hexA(color, 0.8), 1.4, 2.5);
  iconBadge(ctx, 'question', ix, 0, 68, color, { solid: true, lw: 3 });
  text(ctx, str, ix + 34 + 24, 2, { w: 600, size: 46, color: '#fff', maxW: tw });
  ctx.restore();
}

// ============================================================== sectionHeader (persistent chip, top-left)
// sectionHeader(ctx, t, { t0, t1, index, label, sub, color, x, y })
export function sectionHeader(ctx, t, o) {
  const { t0, t1, index = 'P4', label, sub = '', color = SYS.circ, x = 60, y = 168 } = o;
  const E = env(t, t0, t1, 0.6, 0.35); if (!E.live || E.a <= 0) return;
  const h = 60;
  ctx.save();
  const bw = Math.max(48, measure(ctx, index, 600, 22, 1) + 28);
  const avail = 900 - 6 - bw - 18 - 26;
  let showSub = !!sub, subW = sub ? measure(ctx, sub, 400, 24) : 0;
  let lw = Math.min(measure(ctx, label, 600, 28), avail - (showSub ? 34 + Math.min(subW, 240) : 0));
  let sw = showSub ? Math.min(subW, avail - lw - 34) : 0;
  if (showSub && sw < 120) { showSub = false; sw = 0; lw = Math.min(measure(ctx, label, 600, 28), avail); }
  const full = Math.min(900, 6 + bw + 18 + lw + (showSub ? 34 + sw : 0) + 26);
  const grow = eio((t - t0 - 0.12) / 0.55) * (1 - E.o);
  const cw = lerp(h, full, grow);
  ctx.globalAlpha = E.a;
  glass(ctx, x, y, cw, h, h / 2, { sheen: false, shadowA: 0.35 });
  ctx.save(); rr(ctx, x, y, cw, h, h / 2); ctx.clip();
  const bk = eback((t - t0) / 0.45, 2);
  ctx.save(); ctx.translate(x + 6 + bw / 2, y + h / 2); ctx.scale(0.6 + 0.4 * bk, 0.6 + 0.4 * bk);
  const g = ctx.createLinearGradient(0, -24, 0, 24); g.addColorStop(0, light(color, 0.12)); g.addColorStop(1, deep(color, 0.15));
  ctx.fillStyle = g; rr(ctx, -bw / 2, -24, bw, 48, 24); ctx.fill();
  text(ctx, index, 0, 1, { w: 600, size: 22, ls: 1, align: 'center', color: '#fff' }); ctx.restore();
  const tk = eout((t - t0 - 0.35) / 0.4) * (1 - E.o);
  ctx.globalAlpha = E.a * tk;
  const tx = x + 6 + bw + 18 + (1 - tk) * 14;
  text(ctx, label, tx, y + h / 2 + 1, { w: 600, size: 28, color: '#fff', maxW: lw });
  if (showSub) {
    ctx.fillStyle = hexA(color, 0.9); ctx.beginPath(); ctx.arc(tx + lw + 17, y + h / 2, 4, 0, 7); ctx.fill();
    text(ctx, sub, tx + lw + 34, y + h / 2 + 1, { w: 400, size: 24, color: C.text2, maxW: sw });
  }
  ctx.restore(); ctx.restore();
}

// ============================================================== factCard
// factCard(ctx, t, { t0, t1, title, kicker, lines[≤3], big:{value, unit, label, decimals}, icon, color, theme, bottom, stagger })
export function factCard(ctx, t, o) {
  const { t0, t1, title, kicker = '', lines = [], big = null, color = SYS.circ, theme = 'light', bottom = 1270, x = 60, w = 900, iconName = 'drop', stagger = 0.35 } = o;
  const E = env(t, t0, t1, 0.55, 0.35); if (!E.live || E.a <= 0) return;
  const dark = theme === 'dark';
  const ink = dark ? '#fff' : C.ink, ink2 = dark ? C.text2 : C.ink2, acc = dark ? light(color, 0.35) : deep(color, 0.3);
  const pad = 36, headH = kicker ? 84 : 58, lh = 56, bigW = big ? 290 : 0;
  const n = Math.min(3, lines.length);
  let h = pad + headH + (n ? 18 + n * lh : 0) + pad - 6;
  if (big) h = Math.max(h, 236);
  const y = bottom - h;
  ctx.save(); ctx.globalAlpha = E.a; ctx.translate(0, (1 - E.i) * 46 + E.o * 30);
  glass(ctx, x, y, w, h, 30, { theme, accent: color });
  const colW = w - pad * 2 - bigW - (big ? 28 : 0) - 8;
  // header
  const hk = stag(t, t0 + 0.12, 0);
  ctx.save(); ctx.globalAlpha = E.a * hk;
  const ix = x + pad + 30, iy = y + pad + headH / 2 - 2;
  iconBadge(ctx, iconName, ix, iy, 58, color, { solid: true, lw: 2.6 });
  const tx = ix + 29 + 20 + (1 - hk) * 12;
  if (kicker) {
    text(ctx, kicker, tx, iy - 22, { w: 600, size: 20, ls: 2.5, color: acc, maxW: colW - 70 });
    text(ctx, title, tx, iy + 20, { w: 600, size: 38, color: ink, maxW: colW - 70 });
  } else text(ctx, title, tx, iy + 1, { w: 600, size: 40, color: ink, maxW: colW - 70 });
  ctx.restore();
  // lines
  for (let i = 0; i < n; i++) {
    const u = stag(t, t0 + 0.35, i, stagger, 0.45); if (u <= 0) continue;
    const ly = y + pad + headH + 18 + i * lh + lh / 2;
    ctx.save(); ctx.globalAlpha = E.a * u;
    const bx = x + pad + 18 + (1 - u) * 16;
    ctx.fillStyle = color; rr(ctx, bx - 6, ly - 6, 12, 12, 3.5); ctx.fill();
    text(ctx, lines[i], bx + 24, ly + 1, { w: 400, size: 32, color: ink2, maxW: colW - 50 });
    ctx.restore();
  }
  // big number
  if (big) {
    const bx = x + w - pad - bigW / 2, by = y + h / 2;
    const bk = eout((t - t0 - 0.3) / 0.5);
    ctx.save(); ctx.globalAlpha = E.a * bk;
    ctx.strokeStyle = dark ? 'rgba(255,255,255,0.14)' : 'rgba(15,23,42,0.10)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x + w - pad - bigW - 14, y + 30); ctx.lineTo(x + w - pad - bigW - 14, y + h - 30); ctx.stroke();
    const num = typeof big.value === 'number';
    const cu = eexpo((t - t0 - 0.35) / 1.2);
    const v = num ? fmtNum(big.value * cu, big.decimals ?? decOf(big.value)) : String(big.value);
    const vs = text(ctx, v, bx, by - 22, { w: 600, size: 92, align: 'center', color: acc, maxW: bigW });
    text(ctx, big.unit || '', bx, by + 40, { w: 600, size: 30, align: 'center', color: ink, maxW: bigW });
    if (big.label) text(ctx, big.label, bx, by + 76, { w: 400, size: 22, align: 'center', color: dark ? C.text3 : C.mute, maxW: bigW });
    ctx.restore();
  }
  ctx.restore();
}

// ============================================================== callout
// callout(ctx, t, { t0, t1, ax, ay, x, y, label, sub, color, align, size })
// (ax, ay) = projected screen point of the 3D anchor (caller projects); (x, y) = pill anchor point.
export function pillMetrics(ctx, label, sub, size) {
  const lw = measure(ctx, label, 600, size), sw = sub ? measure(ctx, sub, 400, size * 0.88) : 0;
  const pad = size * 0.72, dot = size * 0.46, gap = size * 0.4, sep = sub ? size * 0.66 : 0;
  return { w: pad * 2 + dot + gap + lw + sep + sw, h: size * 1.74, lw, sw, pad, dot, gap, sep };
}
export function labelPill(ctx, cx, cy, label, sub, color, o = {}) {
  let { size = 34, align = 'center', scale = 1, a = 1 } = o;
  let m = pillMetrics(ctx, label, sub, size);
  while (m.w > 900 && size > 20) { size -= 1; m = pillMetrics(ctx, label, sub, size); }
  let x = align === 'center' ? cx - m.w / 2 : align === 'left' ? cx : cx - m.w;
  x = clamp(x, 62, 958 - m.w);
  const y = cy - m.h / 2;
  ctx.save(); ctx.globalAlpha *= a; ctx.translate(x + m.w / 2, cy); ctx.scale(scale, scale); ctx.translate(-(x + m.w / 2), -cy);
  glass(ctx, x, y, m.w, m.h, m.h / 2, { theme: 'light', shadowA: 0.38 });
  const dx = x + m.pad + m.dot / 2;
  ctx.fillStyle = hexA(color, 0.25); ctx.beginPath(); ctx.arc(dx, cy, m.dot / 2 + 5, 0, 7); ctx.fill();
  ctx.fillStyle = color; ctx.beginPath(); ctx.arc(dx, cy, m.dot / 2, 0, 7); ctx.fill();
  let tx = x + m.pad + m.dot + m.gap;
  text(ctx, label, tx, cy + 1, { w: 600, size, color: C.ink }); tx += m.lw;
  if (sub) {
    ctx.fillStyle = 'rgba(15,23,42,0.22)'; ctx.fillRect(tx + m.sep / 2 - 1, cy - size * 0.42, 2, size * 0.84);
    text(ctx, sub, tx + m.sep, cy + 1, { w: 400, size: size * 0.88, color: C.slate });
  }
  ctx.restore();
  return { x, y, w: m.w, h: m.h };
}
export function callout(ctx, t, o) {
  const { t0, t1, ax, ay, x, y, label, sub = '', color = SYS.circ, align = 'center', size = 34 } = o;
  const E = env(t, t0, t1, 0.4, 0.35); if (!E.live || E.a <= 0) return;
  // pill bounds (no draw)
  let s = size, m = pillMetrics(ctx, label, sub, s); while (m.w > 900 && s > 20) { s--; m = pillMetrics(ctx, label, sub, s); }
  let bx = align === 'center' ? x - m.w / 2 : align === 'left' ? x : x - m.w; bx = clamp(bx, 62, 958 - m.w);
  const by = y - m.h / 2, bcy = y;
  // leader geometry: anchor -> knee -> pill edge
  let P, K;
  if (ax < bx) { P = [bx + 4, bcy]; K = [bx - 34, bcy]; }
  else if (ax > bx + m.w) { P = [bx + m.w - 4, bcy]; K = [bx + m.w + 34, bcy]; }
  else { const px = clamp(ax, bx + m.h / 2, bx + m.w - m.h / 2); P = [px, ay < by ? by + 4 : by + m.h - 4]; K = [px, P[1]]; }
  const L1 = Math.hypot(K[0] - ax, K[1] - ay), L2 = Math.hypot(P[0] - K[0], P[1] - K[1]), L = L1 + L2 || 1;
  const dk = eio((t - t0 - 0.08) / 0.5) * (1 - E.o);
  ctx.save(); ctx.globalAlpha = E.a;
  // line
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const drawLeader = (col, lw) => {
    ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.beginPath(); ctx.moveTo(ax, ay);
    const d = dk * L;
    if (d <= L1) ctx.lineTo(lerp(ax, K[0], d / (L1 || 1)), lerp(ay, K[1], d / (L1 || 1)));
    else { ctx.lineTo(K[0], K[1]); ctx.lineTo(lerp(K[0], P[0], (d - L1) / (L2 || 1)), lerp(K[1], P[1], (d - L1) / (L2 || 1))); }
    ctx.stroke();
  };
  ctx.shadowColor = 'rgba(0,0,0,0.45)'; ctx.shadowBlur = 8; ctx.shadowOffsetY = 2;
  drawLeader('rgba(255,255,255,0.96)', 3); noShadow(ctx);
  // anchor dot
  const ak = eback((t - t0) / 0.35, 2.5);
  if (ak > 0) {
    pulseRing(ctx, ax, ay, 10, 24, t - t0, color, 1.25, 3, E.a);
    ctx.save(); ctx.translate(ax, ay); ctx.scale(ak, ak); shadow(ctx, 8, 2, 0.45);
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, 0, 12, 0, 7); ctx.fill(); noShadow(ctx);
    ctx.fillStyle = color; ctx.beginPath(); ctx.arc(0, 0, 8, 0, 7); ctx.fill(); ctx.restore();
  }
  ctx.restore();
  const pk = eback((t - t0 - 0.3) / 0.45, 1.8);
  if (pk > 0) {
    ctx.save(); ctx.globalAlpha = E.a * clamp(pk * 1.5);
    labelPill(ctx, x, y + (1 - clamp(pk)) * 12, label, sub, color, { size: s, align, scale: (0.86 + 0.14 * pk) * (1 - 0.04 * E.o) });
    ctx.restore();
  }
}

// ============================================================== flowPathMap
// flowPathMap(ctx, t, { t0, t1, nodes:[{label, th}], current (float ok), color, x, y, w, h, title, sides:[l,t,r,b], speed })
function loopGeom(x, y, w, h, r) {
  const Ls = h - 2 * r, Lt = w - 2 * r, A = Math.PI * r / 2;
  const seg = [
    { k: 'L', len: Ls, f: u => [x, y + h - r - u * Ls, -Math.PI / 2] },
    { k: 'a', len: A, f: u => { const q = Math.PI + u * Math.PI / 2; return [x + r + Math.cos(q) * r, y + r + Math.sin(q) * r, q + Math.PI / 2]; } },
    { k: 'T', len: Lt, f: u => [x + r + u * Lt, y, 0] },
    { k: 'a', len: A, f: u => { const q = -Math.PI / 2 + u * Math.PI / 2; return [x + w - r + Math.cos(q) * r, y + r + Math.sin(q) * r, q + Math.PI / 2]; } },
    { k: 'R', len: Ls, f: u => [x + w, y + r + u * Ls, Math.PI / 2] },
    { k: 'a', len: A, f: u => { const q = u * Math.PI / 2; return [x + w - r + Math.cos(q) * r, y + h - r + Math.sin(q) * r, q + Math.PI / 2]; } },
    { k: 'B', len: Lt, f: u => [x + w - r - u * Lt, y + h, Math.PI] },
    { k: 'a', len: A, f: u => { const q = Math.PI / 2 + u * Math.PI / 2; return [x + r + Math.cos(q) * r, y + h - r + Math.sin(q) * r, q + Math.PI / 2]; } },
  ];
  let acc = 0; for (const s of seg) { s.s0 = acc; acc += s.len; }
  const L = acc;
  const at = s => { s = ((s % L) + L) % L; for (const g of seg) if (s <= g.s0 + g.len) return g.f((s - g.s0) / (g.len || 1)); return seg[0].f(0); };
  const edge = k => seg.find(g => g.k === k);
  return { L, at, edge };
}
export function flowPathMap(ctx, t, o) {
  const { t0, t1, nodes, current = 0, color = SYS.circ, x = 60, y = 196, w = 900, h = 520, title = 'MUD CIRCULATION LOOP', speed = 210, stepLabel = 'STEP' } = o;
  const E = env(t, t0, t1, 0.6, 0.4); if (!E.live || E.a <= 0) return;
  const n = nodes.length, lc = light(color, 0.45);
  let sides = o.sides;
  if (!sides) {
    if (n >= 6) { const r = n >= 9 ? 2 : 1, rest = n - 1 - r, tp = Math.ceil(rest / 2); sides = [1, tp, r, rest - tp]; }
    else { const tp = Math.ceil(n / 2); sides = [0, tp, 0, n - tp]; }
  }
  const lx = x + 56, ly = y + 150, lw = w - 112, lh = h - 232, R = 44;
  const G = loopGeom(lx, ly, lw, lh, R);
  // node arc positions
  const S = [], side = [];
  ['L', 'T', 'R', 'B'].forEach((k, si) => { const e = G.edge(k), c = sides[si]; for (let i = 0; i < c; i++) { S.push(e.s0 + e.len * (i + 1) / (c + 1)); side.push(k); } });
  const cur = clamp(current, 0, n - 1e-6), ci = Math.min(n - 1, Math.round(cur)), cf = Math.floor(cur), cfrac = cur - cf;
  const sAt = i => (i >= n ? S[0] + G.L : S[i]);
  let sCur = lerp(sAt(cf), cf + 1 >= n ? S[0] + G.L : sAt(cf + 1), cfrac);
  const sv = (s) => (s < S[0] ? s + G.L : s);
  ctx.save(); ctx.globalAlpha = E.a; ctx.translate(0, (1 - E.i) * 30 - E.o * 20);
  glass(ctx, x, y, w, h, 34);
  // header
  icon(ctx, 'loop', x + 46, y + 50, 30, lc, 2.4);
  text(ctx, title, x + 74, y + 51, { w: 600, size: 22, ls: 3, color: lc, maxW: w - 300 });
  text(ctx, `${stepLabel} ${String(ci + 1).padStart(2, '0')} / ${String(n).padStart(2, '0')}`, x + w - 36, y + 51, { w: 600, size: 22, ls: 2, align: 'right', color: C.text3, maxW: 200 });
  ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(x + 30, y + 82, w - 60, 1.5);
  // rail (draw-in)
  const rk = eio((t - t0 - 0.15) / 0.9);
  const strokeArc = (s0, s1, col, lwid) => {
    if (s1 <= s0) return; ctx.strokeStyle = col; ctx.lineWidth = lwid; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath();
    const steps = Math.max(2, Math.ceil((s1 - s0) / 5));
    for (let i = 0; i <= steps; i++) { const p = G.at(lerp(s0, s1, i / steps)); i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); }
    ctx.stroke();
  };
  strokeArc(S[0], S[0] + G.L * rk, 'rgba(255,255,255,0.13)', 8);
  // visited segment
  const vk = eout((t - t0 - 0.6) / 0.6);
  const sEnd = lerp(S[0], sCur, vk);
  ctx.save(); ctx.shadowColor = hexA(color, 0.8); ctx.shadowBlur = 14; strokeArc(S[0], sEnd, color, 6); ctx.restore();
  // flow chevrons (direction)
  if (rk >= 1) {
    const sp = 62, off = fract(t * speed / 1000 / (sp / 1000) / 6) * sp;
    for (let s = off; s < G.L; s += sp) {
      const ss = S[0] + s; if (S.some(q => Math.abs(((ss - q) % G.L + G.L) % G.L) < 22 || Math.abs(((q - ss) % G.L + G.L) % G.L) < 22)) continue;
      const [px, py, ang] = G.at(ss);
      const vis = sv(ss % G.L + (ss >= G.L ? 0 : 0)) <= sEnd;
      ctx.save(); ctx.translate(px, py); ctx.rotate(ang); ctx.strokeStyle = vis ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.32)'; ctx.lineWidth = 2.2; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-3, -4.5); ctx.lineTo(2, 0); ctx.lineTo(-3, 4.5); ctx.stroke(); ctx.restore();
    }
  }
  // comet: a mud "parcel" travelling the loop
  if (rk >= 1) {
    const sc = S[0] + fract((t - t0) * speed / G.L) * G.L;
    for (let i = 14; i >= 0; i--) {
      const [px, py] = G.at(sc - i * 7), r = lerp(8, 2, i / 14);
      ctx.fillStyle = i ? hexA(lc, 0.5 * (1 - i / 15)) : '#fff';
      if (!i) { ctx.shadowColor = lc; ctx.shadowBlur = 18; }
      ctx.beginPath(); ctx.arc(px, py, r, 0, 7); ctx.fill(); noShadow(ctx);
    }
  }
  // nodes + labels
  const sideMax = lw * 0.27;
  nodes.forEach((nd, i) => {
    const k = eback((t - t0 - 0.35 - i * 0.05) / 0.4, 2); if (k <= 0) return;
    const [px, py] = G.at(S[i]), on = i === ci, done = sv(S[i]) <= sEnd + 0.5 && !on;
    ctx.save(); ctx.translate(px, py); ctx.scale(clamp(k, 0, 1.3), clamp(k, 0, 1.3));
    if (on) {
      pulseRing(ctx, 0, 0, 15, 22, t, color, 1.2, 3);
      ctx.shadowColor = hexA(color, 0.9); ctx.shadowBlur = 18; ctx.fillStyle = color; ctx.beginPath(); ctx.arc(0, 0, 15, 0, 7); ctx.fill(); noShadow(ctx);
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 3.5; ctx.stroke();
    } else {
      ctx.fillStyle = done ? color : '#0c1428'; ctx.beginPath(); ctx.arc(0, 0, 9.5, 0, 7); ctx.fill();
      ctx.strokeStyle = done ? lc : 'rgba(255,255,255,0.45)'; ctx.lineWidth = 2.5; ctx.stroke();
    }
    ctx.restore();
    const la = clamp((t - t0 - 0.45 - i * 0.05) / 0.35);
    ctx.save(); ctx.globalAlpha = E.a * la;
    const st = on ? { w: 600, size: 24, color: '#fff' } : { w: 400, size: 21, color: done ? C.text2 : C.text3 };
    const sd = side[i]; const cnt = sides[['L', 'T', 'R', 'B'].indexOf(sd)];
    if (sd === 'T') text(ctx, nd.label, px, py - 32, { ...st, align: 'center', maxW: lw / (cnt + 1) - 10 });
    else if (sd === 'B') text(ctx, nd.label, px, py + 34, { ...st, align: 'center', maxW: lw / (cnt + 1) - 10 });
    else if (sd === 'L') text(ctx, nd.label, px + 26, py + 1, { ...st, align: 'left', maxW: sideMax });
    else text(ctx, nd.label, px - 26, py + 1, { ...st, align: 'right', maxW: sideMax });
    ctx.restore();
  });
  // centre readout ("you are here")
  const ra = clamp(eout((t - t0 - 0.7) / 0.5) * (1 - 2.2 * Math.abs(cur - Math.round(cur))) * 1.0);
  if (ra > 0) {
    const nd = nodes[ci], cyy = ly + lh / 2, mw = lw - 2 * sideMax - 80;
    ctx.save(); ctx.globalAlpha = E.a * ra;
    text(ctx, `${String(ci + 1).padStart(2, '0')}`, lx + lw / 2, cyy - 52, { w: 600, size: 22, ls: 3, align: 'center', color: lc });
    ctx.shadowColor = 'rgba(0,0,0,0.4)'; ctx.shadowBlur = 10;
    text(ctx, nd.label, lx + lw / 2, cyy - 8, { w: 600, size: 44, align: 'center', color: '#fff', maxW: mw });
    if (nd.th) text(ctx, nd.th, lx + lw / 2, cyy + 40, { w: 400, size: 28, align: 'center', color: C.warmSoft, maxW: mw });
    ctx.restore();
  }
  ctx.restore();
}

// ============================================================== stepList (vertical progress rail)
// stepList(ctx, t, { t0, t1, items:[{label, sub}], current (float ok), color, x, y, w, title, rowH })
export function stepList(ctx, t, o) {
  const { t0, t1, items, current = 0, color = SYS.circ, x = 60, y = 420, w = 330, title = 'STEPS', rowH = 78 } = o;
  const E = env(t, t0, t1, 0.55, 0.35); if (!E.live || E.a <= 0) return;
  const n = items.length, h = 96 + n * rowH + 10, lc = light(color, 0.45);
  const cur = clamp(current, 0, n - 1), ci = Math.round(cur);
  ctx.save(); ctx.globalAlpha = E.a; ctx.translate((1 - E.i) * -40 - E.o * 30, 0);
  glass(ctx, x, y, w, h, 28);
  text(ctx, title, x + 28, y + 46, { w: 600, size: 21, ls: 3, color: lc, maxW: w - 56 });
  const rx = x + 44, r0 = y + 96 + rowH / 2, rowY = i => r0 + i * rowH;
  // active row highlight (glides)
  const hy = rowY(cur);
  ctx.save(); ctx.fillStyle = hexA(color, 0.17); rr(ctx, x + 12, hy - rowH / 2 + 6, w - 24, rowH - 12, 18); ctx.fill();
  ctx.fillStyle = color; rr(ctx, x + 12, hy - rowH / 2 + 14, 5, rowH - 28, 2.5); ctx.fill(); ctx.restore();
  // rail
  const rk = eio((t - t0 - 0.1) / 0.7);
  ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(255,255,255,0.16)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(rx, rowY(0)); ctx.lineTo(rx, lerp(rowY(0), rowY(n - 1), rk)); ctx.stroke();
  ctx.strokeStyle = color; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(rx, rowY(0)); ctx.lineTo(rx, Math.min(rowY(cur), lerp(rowY(0), rowY(n - 1), rk))); ctx.stroke();
  items.forEach((it, i) => {
    const k = stag(t, t0 + 0.2, i, 0.07, 0.4); if (k <= 0) return;
    const yy = rowY(i), on = i === ci, done = i < cur - 0.5;
    ctx.save(); ctx.globalAlpha = E.a * k;
    if (on) {
      pulseRing(ctx, rx, yy, 14, 16, t, color, 1.2, 2.5);
      ctx.fillStyle = color; ctx.beginPath(); ctx.arc(rx, yy, 14, 0, 7); ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.stroke();
    } else if (done) {
      ctx.fillStyle = color; ctx.beginPath(); ctx.arc(rx, yy, 12, 0, 7); ctx.fill(); icon(ctx, 'check', rx, yy, 15, '#fff', 3.6);
    } else {
      ctx.fillStyle = '#0c1428'; ctx.beginPath(); ctx.arc(rx, yy, 10, 0, 7); ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 2.5; ctx.stroke();
    }
    const tx = rx + 30 + (1 - k) * 12, mw = x + w - 22 - tx;
    if (it.sub) {
      text(ctx, it.label, tx, yy - 12, { w: 600, size: on ? 27 : 25, color: on ? '#fff' : done ? C.text2 : C.text3, maxW: mw });
      text(ctx, it.sub, tx, yy + 18, { w: 400, size: 20, color: on ? C.warmSoft : C.text3, maxW: mw });
    } else text(ctx, it.label, tx, yy + 1, { w: on ? 600 : 400, size: on ? 28 : 25, color: on ? '#fff' : done ? C.text2 : C.text3, maxW: mw });
    ctx.restore();
  });
  ctx.restore();
}

// ============================================================== sizeFunnel (solids control)
// sizeFunnel(ctx, t, { t0, t1, stages:[{name, th, cut, unit, prefix}], active, color, x, y, w, title, kicker, outlet, rowH, stagger })
const cutNum = c => { if (typeof c === 'number') return c; const m = String(c).match(/[\d.]+/g); return m ? m.map(Number).reduce((a, b) => a + b, 0) / m.length : 10; };
export function sizeFunnel(ctx, t, o) {
  const { t0, t1, stages, active = -1, color = SYS.circ, x = 60, y = 230, w = 900, rowH = 146, stagger = 0.55,
    title = 'Solids Control', kicker = 'PARTICLE SIZE · µm', outlet = 'Mud สะอาด กลับสู่ Active Tank', fine = 'ละเอียด', coarse = 'หยาบ' } = o;
  const E = env(t, t0, t1, 0.55, 0.4); if (!E.live || E.a <= 0) return;
  const n = stages.length, lc = light(color, 0.45);
  const yb0 = y + 108, bandH = rowH - 20, outY = yb0 + n * rowH, scaleY = outY + 96, h = scaleY - y + 104;
  const fcx = x + 236, wTop = i => lerp(380, 120, i / n);
  const shade = i => mix(color, '#e0f2f1', 0.1 + 0.5 * i / Math.max(1, n - 1));
  const cardX = x + 486, cardW = x + w - 28 - cardX;
  const widthAt = yy => { const f = clamp((yy - yb0) / (n * rowH)); return lerp(wTop(0), wTop(n), f); };
  ctx.save(); ctx.globalAlpha = E.a; ctx.translate(0, (1 - E.i) * 36 - E.o * 24);
  glass(ctx, x, y, w, h, 34);
  // header
  iconBadge(ctx, 'filter', x + 60, y + 56, 56, color, { solid: true });
  text(ctx, kicker, x + 104, y + 38, { w: 600, size: 20, ls: 3, color: lc, maxW: w - 150 });
  text(ctx, title, x + 104, y + 72, { w: 600, size: 38, color: '#fff', maxW: w - 150 });
  // bands
  const act = Math.round(active);
  stages.forEach((st, i) => {
    const k = eout((t - t0 - 0.3 - i * stagger) / 0.5); if (k <= 0) return;
    const yt = yb0 + i * rowH, wt = wTop(i), wb = wTop(i + 1) + (wTop(i) - wTop(i + 1)) * (20 / rowH), sc = shade(i), on = i === act;
    ctx.save(); ctx.globalAlpha = E.a * k; ctx.translate(0, (1 - k) * 18);
    const path = () => { ctx.beginPath(); ctx.moveTo(fcx - wt / 2, yt); ctx.lineTo(fcx + wt / 2, yt); ctx.lineTo(fcx + wb / 2, yt + bandH); ctx.lineTo(fcx - wb / 2, yt + bandH); ctx.closePath(); };
    if (on) { ctx.shadowColor = hexA(sc, 0.8); ctx.shadowBlur = 30; }
    const g = ctx.createLinearGradient(fcx - wt / 2, 0, fcx + wt / 2, 0); g.addColorStop(0, hexA(sc, on ? 0.42 : 0.26)); g.addColorStop(1, hexA(sc, on ? 0.22 : 0.10));
    path(); ctx.fillStyle = g; ctx.fill(); noShadow(ctx);
    // screen mesh: finer each stage
    ctx.save(); path(); ctx.clip(); ctx.strokeStyle = hexA(sc, on ? 0.38 : 0.22); ctx.lineWidth = 1.2;
    const sp = Math.max(7, 22 - i * 5);
    for (let gx = fcx - wt / 2 - bandH; gx < fcx + wt / 2 + bandH; gx += sp) { ctx.beginPath(); ctx.moveTo(gx, yt); ctx.lineTo(gx + bandH * 0.5, yt + bandH); ctx.stroke(); ctx.beginPath(); ctx.moveTo(gx + bandH * 0.5, yt); ctx.lineTo(gx, yt + bandH); ctx.stroke(); }
    ctx.restore();
    path(); ctx.strokeStyle = on ? '#fff' : sc; ctx.lineWidth = on ? 3 : 2.5; ctx.stroke();
    // number disc at band's left edge
    const ny = yt + bandH / 2, nx = fcx - lerp(wt, wb, 0.5) / 2 + 30;
    ctx.fillStyle = on ? '#fff' : sc; ctx.beginPath(); ctx.arc(nx, ny, 17, 0, 7); ctx.fill();
    text(ctx, String(i + 1), nx, ny + 1, { w: 600, size: 20, align: 'center', color: C.ink });
    // connector to the label card
    const ex = fcx + lerp(wt, wb, 0.5) / 2;
    ctx.setLineDash([3, 7]); ctx.strokeStyle = hexA(sc, 0.7); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(ex + 8, ny); ctx.lineTo(cardX - 12, ny); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = sc; ctx.beginPath(); ctx.arc(ex + 2, ny, 4, 0, 7); ctx.fill();
    // label card
    const cy0 = yt + 4, ch = bandH - 8;
    ctx.fillStyle = on ? hexA(sc, 0.2) : 'rgba(255,255,255,0.045)'; rr(ctx, cardX, cy0, cardW, ch, 18); ctx.fill();
    ctx.strokeStyle = on ? hexA(sc, 0.9) : 'rgba(255,255,255,0.10)'; ctx.lineWidth = on ? 2.5 : 1.5; ctx.stroke();
    const tag = `${st.prefix ?? ''}${st.cut} ${st.unit ?? 'µm'}`;
    const tw = Math.min(measure(ctx, tag, 600, 24) + 30, cardW * 0.45);
    const ny0 = cy0 + (st.th ? ch / 2 - 18 : ch / 2);
    text(ctx, st.name, cardX + 22, ny0, { w: 600, size: 30, color: '#fff', maxW: cardW - 44 - tw - 12 });
    if (st.th) text(ctx, st.th, cardX + 22, ny0 + 38, { w: 400, size: 22, color: C.text2, maxW: cardW - 44 });
    ctx.fillStyle = on ? '#fff' : sc; rr(ctx, cardX + cardW - 20 - tw, ny0 - 18, tw, 36, 18); ctx.fill();
    text(ctx, tag, cardX + cardW - 20 - tw / 2, ny0 + 1, { w: 600, size: 24, align: 'center', color: C.ink, maxW: tw - 20 });
    ctx.restore();
  });
  // outlet spout + label
  const ok = eout((t - t0 - 0.3 - n * stagger) / 0.5);
  if (ok > 0) {
    ctx.save(); ctx.globalAlpha = E.a * ok;
    const sw = wTop(n) * 0.5;
    const g = ctx.createLinearGradient(0, outY - 20, 0, outY + 30); g.addColorStop(0, hexA(lc, 0.5)); g.addColorStop(1, hexA(lc, 0));
    ctx.fillStyle = g; ctx.fillRect(fcx - sw / 2, outY - 20, sw, 40);
    icon(ctx, 'arrowD', fcx, outY + 22, 26, lc, 3);
    text(ctx, outlet, fcx + 44, outY + 22, { w: 600, size: 24, color: lc, maxW: x + w - 40 - fcx - 44 });
    ctx.restore();
  }
  // particles (pure: index-hashed)
  const pa = clamp((t - t0 - 0.8) / 0.6) * (1 - E.o);
  if (pa > 0) {
    ctx.save(); ctx.beginPath(); ctx.rect(x + 4, yb0 - 6, w - 8, outY - yb0 + 26); ctx.clip();
    const radii = i => lerp(11, 2.6, i / n);
    const yS = yb0 - 10, yE = outY + 10;
    for (let j = 0; j < 46; j++) {
      const cls = Math.floor(hash(j, 1) * (n + 1)), P = 2.8 + hash(j, 2) * 1.0;
      const u = fract((t - t0) / P + hash(j, 3)), yy = lerp(yS, yE, Math.pow(u, 1.15));
      const xo = (hash(j, 4) - 0.5) * 0.7 + 0.04 * Math.sin((t + j) * 2.3);
      const stopY = cls < n ? yb0 + cls * rowH + bandH * 0.5 : 1e9;
      if (cls < n && eout((t - t0 - 0.3 - cls * stagger) / 0.5) < 0.5) continue; // stage not shown yet
      let px, py, al = clamp((yy - yS) / 30);
      if (yy < stopY) { px = fcx + xo * widthAt(yy); py = yy; }
      else { // rejected at this stage: flung out to the left and dropped
        const de = (yy - stopY) / (yE - yS) * P; const xs = fcx + xo * widthAt(stopY);
        px = xs - 330 * de; py = stopY - 90 * de + 520 * de * de; al *= clamp(1 - de / 0.55);
      }
      if (al <= 0) continue;
      ctx.globalAlpha = E.a * pa * al;
      const r = radii(Math.min(cls, n));
      ctx.fillStyle = cls < n ? mix(C.mud, '#f5d0a0', 0.15 * cls) : light(color, 0.6);
      ctx.beginPath(); ctx.arc(px, py, r, 0, 7); ctx.fill();
      if (r > 4) { ctx.strokeStyle = C.mudDark; ctx.lineWidth = 1.2; ctx.stroke(); }
    }
    ctx.restore();
  }
  // log size scale (µm)
  const sk = eout((t - t0 - 0.5 - n * stagger) / 0.6);
  if (sk > 0) {
    ctx.save(); ctx.globalAlpha = E.a * sk;
    const sx0 = x + 70, sx1 = x + w - 70, cuts = stages.map(s => cutNum(s.cut));
    const vmin = 1, vmax = Math.max(200, Math.max(...cuts) * 2);
    const X = v => lerp(sx0, sx1, Math.log10(v / vmin) / Math.log10(vmax / vmin));
    const g = ctx.createLinearGradient(sx0, 0, sx1, 0); g.addColorStop(0, hexA(lc, 0.85)); g.addColorStop(1, hexA(C.mud, 0.95));
    ctx.fillStyle = g; rr(ctx, sx0, scaleY - 5, (sx1 - sx0) * sk, 10, 5); ctx.fill();
    for (const v of [1, 2, 5, 10, 20, 50, 100, 200, 500].filter(v => v <= vmax)) {
      const xx = X(v), major = [1, 10, 100].includes(v);
      ctx.fillStyle = major ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.35)'; ctx.fillRect(xx - 1, scaleY + 9, 2, major ? 12 : 7);
      text(ctx, String(v), xx, scaleY + 36, { w: major ? 600 : 400, size: major ? 20 : 17, align: 'center', color: major ? C.text2 : C.text3 });
    }
    text(ctx, o.scaleLabel || 'ขนาดอนุภาค (ไมครอน, µm)', (sx0 + sx1) / 2, scaleY + 70, { w: 400, size: 20, align: 'center', color: C.text3, maxW: sx1 - sx0 });
    text(ctx, fine, sx0, scaleY - 30, { w: 600, size: 20, color: lc });
    text(ctx, coarse, sx1, scaleY - 30, { w: 600, size: 20, align: 'right', color: '#e7c08f' });
    // stage markers
    cuts.forEach((c, i) => {
      const mk = eback((t - t0 - 0.8 - n * stagger - i * 0.12) / 0.4, 2.2); if (mk <= 0) return;
      const xx = X(c), sc = shade(i), on = i === act;
      ctx.save(); ctx.translate(xx, scaleY); ctx.scale(mk, mk);
      ctx.fillStyle = on ? '#fff' : sc; ctx.beginPath(); ctx.arc(0, -26, 13, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-6, -15); ctx.lineTo(6, -15); ctx.lineTo(0, -6); ctx.closePath(); ctx.fill();
      text(ctx, String(i + 1), 0, -25, { w: 600, size: 16, align: 'center', color: C.ink });
      ctx.restore();
    });
    ctx.restore();
  }
  ctx.restore();
}

// ============================================================== formulaCard
// formulaCard(ctx, t, { t0, t1, title, kicker, lines:[{label, text}], result:{label, value, unit, decimals}, color, x, y, w, step })
// In line text, wrap a token in [[ ]] to tint it with the accent colour, e.g. 'Q = [[0.000243]] × D² × L'.
function richText(ctx, str, x, y, size, maxW, base, accent) {
  const parts = String(str).split(/\[\[(.+?)\]\]/);
  const plain = parts.join('');
  ctx.save();
  const s = fit(ctx, plain, 600, size, maxW, Math.round(size * 0.6));
  let total = ctx.measureText(plain).width, k = total > maxW ? maxW / total : 1;
  ctx.textBaseline = 'middle'; ctx.textAlign = 'left'; ctx.translate(x, y); ctx.scale(k, 1);
  let cx = 0;
  parts.forEach((p, i) => { if (!p) return; ctx.fillStyle = i % 2 ? accent : base; ctx.fillText(p, cx, 0); cx += ctx.measureText(p).width; });
  ctx.restore();
  return { size: s, width: total * k };
}
export function formulaCard(ctx, t, o) {
  const { t0, t1, title, kicker = 'FORMULA', lines = [], result = null, color = SYS.circ, x = 60, y = 300, w = 900, step = 0.9, first = 0.6 } = o;
  const E = env(t, t0, t1, 0.55, 0.4); if (!E.live || E.a <= 0) return;
  const lc = light(color, 0.45), pad = 36, rowH = 96, labW = 132, resH = result ? 150 : 0;
  const h = 136 + lines.length * rowH + (result ? resH + 22 : 0) + pad - 10;
  ctx.save(); ctx.globalAlpha = E.a; ctx.translate(0, (1 - E.i) * 40 - E.o * 24);
  glass(ctx, x, y, w, h, 34);
  iconBadge(ctx, 'calc', x + pad + 28, y + 70, 58, color, { solid: true });
  text(ctx, kicker, x + pad + 76, y + 46, { w: 600, size: 20, ls: 3, color: lc, maxW: w - 180 });
  text(ctx, title, x + pad + 76, y + 92, { w: 600, size: 38, color: '#fff', maxW: w - 180 });
  ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(x + pad, y + 134, w - pad * 2, 1.5);
  lines.forEach((ln, i) => {
    const ts = t0 + first + i * step, u = eio((t - ts) / 0.55); if (u <= 0) return;
    const yy = y + 136 + i * rowH + rowH / 2, last = i === lines.length - 1 && !result;
    ctx.save(); ctx.globalAlpha = E.a * clamp(u * 2);
    // step label tag
    if (ln.label) {
      const tw = Math.min(measure(ctx, ln.label, 600, 20) + 26, labW - 10);
      ctx.fillStyle = hexA(color, 0.18); rr(ctx, x + pad, yy - 17, tw, 34, 17); ctx.fill();
      text(ctx, ln.label, x + pad + tw / 2, yy + 1, { w: 600, size: 20, align: 'center', color: lc, maxW: tw - 16 });
    }
    // wipe reveal
    const fx = x + pad + labW, fw = w - pad * 2 - labW;
    ctx.save(); ctx.beginPath(); ctx.rect(fx - 4, yy - 40, (fw + 8) * u, 80); ctx.clip();
    const r = richText(ctx, ln.text, fx + (1 - u) * 10, yy + 2, ln.size || 42, fw, '#fff', C.warm);
    ctx.restore();
    if (u < 1) { const ex = fx + (fw + 8) * u; ctx.fillStyle = lc; ctx.shadowColor = lc; ctx.shadowBlur = 12; ctx.fillRect(Math.min(ex, fx + r.width + 6), yy - 24, 3, 48); noShadow(ctx); }
    ctx.restore();
    if (i < lines.length - 1 || result) { ctx.save(); ctx.globalAlpha = E.a * u * 0.6; ctx.fillStyle = 'rgba(255,255,255,0.06)'; ctx.fillRect(x + pad + labW, yy + rowH / 2, (w - pad * 2 - labW) * u, 1.5); ctx.restore(); }
  });
  if (result) {
    const ts = t0 + first + lines.length * step, u = eback((t - ts) / 0.55, 1.4);
    if (u > 0) {
      const ry = y + 136 + lines.length * rowH + 22, rx = x + pad, rw = w - pad * 2;
      ctx.save(); ctx.globalAlpha = E.a * clamp(u * 1.6);
      ctx.translate(rx + rw / 2, ry + resH / 2); ctx.scale(0.92 + 0.08 * u, 0.92 + 0.08 * u); ctx.translate(-(rx + rw / 2), -(ry + resH / 2));
      ctx.shadowColor = hexA(color, 0.6); ctx.shadowBlur = 30;
      const g = ctx.createLinearGradient(rx, ry, rx + rw, ry + resH); g.addColorStop(0, deep(color, 0.22)); g.addColorStop(1, deep(color, 0.55));
      ctx.fillStyle = g; rr(ctx, rx, ry, rw, resH, 26); ctx.fill(); noShadow(ctx);
      ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 2; rr(ctx, rx + 1, ry + 1, rw - 2, resH - 2, 25); ctx.stroke();
      iconBadge(ctx, 'check', rx + 64, ry + resH / 2, 64, '#ffffff', { solid: false, ink: '#fff', lw: 3.4 });
      if (result.label) text(ctx, result.label, rx + 118, ry + 42, { w: 600, size: 22, ls: 1.5, color: 'rgba(255,255,255,0.85)', maxW: rw - 150 });
      const cu = eexpo((t - ts) / 1.1), num = typeof result.value === 'number';
      const vstr = num ? fmtNum(result.value * cu, result.decimals ?? decOf(result.value)) : String(result.value);
      ctx.shadowColor = 'rgba(0,0,0,0.3)'; ctx.shadowBlur = 10;
      const vr = text(ctx, vstr, rx + 118, ry + resH / 2 + 26, { w: 600, size: 72, color: '#fff', maxW: rw - 340 });
      if (result.unit) text(ctx, result.unit, rx + 118 + vr.width + 18, ry + resH / 2 + 38, { w: 600, size: 34, color: C.warmSoft, maxW: rw - 150 - vr.width - 30 });
      ctx.restore();
    }
  }
  ctx.restore();
}

// ============================================================== gaugeDial
// gaugeDial(ctx, t, { t0, t1, cx, cy, r, value, min, max, unit, label, sub, color, decimals, zones:[{from,to,color}], majors })
export function gaugeDial(ctx, t, o) {
  const { t0, t1, cx, cy, r = 120, value, min = 0, max = 100, unit = '', label = '', sub = '', color = SYS.circ, decimals = 0, zones = [], majors = 5, delay = 0 } = o;
  const E = env(t, t0 + delay, t1, 0.6, 0.35); if (!E.live || E.a <= 0) return;
  const A0 = Math.PI * 0.75, A1 = Math.PI * 2.25, ang = v => lerp(A0, A1, clamp((v - min) / (max - min)));
  const sw = eback((t - t0 - delay - 0.25) / 1.2, 1.3), shown = min + (value - min) * sw;
  const sk = eback((t - t0 - delay) / 0.55, 1.6) * (1 - 0.06 * E.o), lc = light(color, 0.4);
  ctx.save(); ctx.globalAlpha = E.a; ctx.translate(cx, cy); ctx.scale(0.85 + 0.15 * sk, 0.85 + 0.15 * sk); ctx.translate(-cx, -cy);
  // body
  shadow(ctx, 36, 12, 0.45);
  const bg = ctx.createRadialGradient(cx, cy - r * 0.4, r * 0.1, cx, cy, r + 26); bg.addColorStop(0, 'rgba(34,48,82,0.95)'); bg.addColorStop(1, 'rgba(8,13,28,0.92)');
  ctx.fillStyle = bg; ctx.beginPath(); ctx.arc(cx, cy, r + 26, 0, 7); ctx.fill(); noShadow(ctx);
  const rim = ctx.createLinearGradient(0, cy - r - 26, 0, cy + r + 26); rim.addColorStop(0, 'rgba(255,255,255,0.35)'); rim.addColorStop(1, 'rgba(255,255,255,0.04)');
  ctx.strokeStyle = rim; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(cx, cy, r + 25, 0, 7); ctx.stroke();
  // track + zones
  ctx.lineCap = 'round'; ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.lineWidth = 14; ctx.beginPath(); ctx.arc(cx, cy, r, A0, A1); ctx.stroke();
  ctx.lineCap = 'butt';
  for (const z of zones) { ctx.strokeStyle = hexA(z.color, 0.85); ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(cx, cy, r + 14, ang(z.from), ang(z.to)); ctx.stroke(); }
  // value arc
  if (shown > min) {
    ctx.lineCap = 'round';
    const g = ctx.createConicGradient ? ctx.createConicGradient(A0 - 0.2, cx, cy) : null;
    if (g) { g.addColorStop(0, deep(color, 0.2)); g.addColorStop(0.75, lc); g.addColorStop(1, lc); }
    ctx.strokeStyle = g || color; ctx.lineWidth = 14; ctx.shadowColor = hexA(color, 0.8); ctx.shadowBlur = 16;
    ctx.beginPath(); ctx.arc(cx, cy, r, A0, ang(shown)); ctx.stroke(); noShadow(ctx);
  }
  // ticks
  const minor = majors * 4;
  for (let i = 0; i <= minor; i++) {
    const q = lerp(A0, A1, i / minor), mj = i % 4 === 0, r1 = r - 20, r2 = r - (mj ? 36 : 28);
    ctx.strokeStyle = mj ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.3)'; ctx.lineWidth = mj ? 3 : 2; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(cx + Math.cos(q) * r1, cy + Math.sin(q) * r1); ctx.lineTo(cx + Math.cos(q) * r2, cy + Math.sin(q) * r2); ctx.stroke();
  }
  if (r >= 100) {
    const fs = Math.round(r * 0.13), q = ang((min + max) / 2);
    text(ctx, fmtNum((min + max) / 2, 0), cx + Math.cos(q) * (r - 54), cy + Math.sin(q) * (r - 54), { w: 400, size: fs, align: 'center', color: C.text3 });
    for (const [v, sx] of [[min, -1], [max, 1]]) text(ctx, fmtNum(v, 0), cx + sx * Math.cos(Math.PI / 4) * r, cy + Math.sin(Math.PI / 4) * r + 26, { w: 400, size: fs, align: 'center', color: C.text3 });
  }
  // needle
  const q = ang(shown);
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(q); shadow(ctx, 8, 3, 0.5);
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(-r * 0.12, -4.5); ctx.lineTo(r - 30, -1.2); ctx.lineTo(r - 30, 1.2); ctx.lineTo(-r * 0.12, 4.5); ctx.closePath(); ctx.fill();
  noShadow(ctx); ctx.fillStyle = color; ctx.beginPath(); ctx.arc(0, 0, 11, 0, 7); ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.stroke();
  ctx.restore();
  // readout
  ctx.shadowColor = 'rgba(0,0,0,0.4)'; ctx.shadowBlur = 8;
  text(ctx, fmtNum(shown, decimals), cx, cy + r * 0.44, { w: 600, size: Math.round(r * 0.36), align: 'center', color: '#fff', maxW: r * 1.3 });
  text(ctx, unit, cx, cy + r * 0.72, { w: 400, size: Math.round(r * 0.16), align: 'center', color: C.text2, maxW: r * 1.2 });
  noShadow(ctx);
  // label tag
  if (label) {
    const lw = Math.min(Math.max(measure(ctx, label, 600, 28), sub ? measure(ctx, sub, 400, 21) : 0) + 48, 2 * r + 80);
    const ty = cy + r + 40, th = sub ? 76 : 50;
    const g = ctx.createLinearGradient(0, ty, 0, ty + th); g.addColorStop(0, light(color, 0.08)); g.addColorStop(1, deep(color, 0.2));
    shadow(ctx, 16, 6, 0.35); ctx.fillStyle = g; rr(ctx, cx - lw / 2, ty, lw, th, 22); ctx.fill(); noShadow(ctx);
    text(ctx, label, cx, ty + (sub ? 26 : th / 2 + 1), { w: 600, size: 28, align: 'center', color: '#fff', maxW: lw - 24 });
    if (sub) text(ctx, sub, cx, ty + 56, { w: 400, size: 21, align: 'center', color: 'rgba(255,255,255,0.9)', maxW: lw - 24 });
  }
  ctx.restore();
}

// ============================================================== recapGrid
// recapGrid(ctx, t, { t0, t1, kicker, title, items:[string | {label, sub}], color, cols, y, stagger })
export function recapGrid(ctx, t, o) {
  const { t0, t1, kicker = 'สรุป', title, items, color = SYS.circ, cols = 2, y = 250, stagger = 0.16 } = o;
  const E = env(t, t0, t1, 0.6, 0.4); if (!E.live || E.a <= 0) return;
  const lc = light(color, 0.45), cx = 510;
  ctx.save(); ctx.globalAlpha = E.a; ctx.translate(0, -E.o * 24);
  ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 22;
  const k1 = stag(t, t0, 0), k2 = eout((t - t0 - 0.15) / 0.6);
  ctx.save(); ctx.globalAlpha = E.a * k1;
  const kw = measure(ctx, kicker, 600, 30, 2) + 44; noShadow(ctx);
  ctx.fillStyle = hexA(color, 0.22); rr(ctx, cx - kw / 2, y - 24, kw, 48, 24); ctx.fill(); ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.stroke();
  text(ctx, kicker, cx, y + 1, { w: 600, size: 30, ls: 2, align: 'center', color: lc }); ctx.restore();
  ctx.save(); ctx.beginPath(); ctx.rect(60, y + 34, 900, 116); ctx.clip();
  ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 22;
  text(ctx, title, cx, y + 92 + (1 - k2) * 100, { w: 600, size: 88, align: 'center', color: '#fff', maxW: 880 }); ctx.restore();
  noShadow(ctx);
  const gap = 18, cw = (900 - gap * (cols - 1)) / cols, hasSub = items.some(i => i && i.sub), ch = hasSub ? 100 : 84, gy = y + 176;
  items.forEach((it, i) => {
    const k = eback((t - t0 - 0.55 - i * stagger) / 0.45, 1.6); if (k <= 0) return;
    const c = i % cols, row = Math.floor(i / cols), bx = 60 + c * (cw + gap), by = gy + row * (ch + gap);
    const lab = typeof it === 'string' ? it : it.label, sub = typeof it === 'string' ? '' : it.sub;
    ctx.save(); ctx.globalAlpha = E.a * clamp(k * 1.5);
    ctx.translate(bx + cw / 2, by + ch / 2); ctx.scale(0.9 + 0.1 * k, 0.9 + 0.1 * k); ctx.translate(-(bx + cw / 2), -(by + ch / 2));
    glass(ctx, bx, by, cw, ch, ch / 2, { sheen: true, shadowA: 0.38 });
    const nx = bx + ch / 2;
    const g = ctx.createLinearGradient(0, by + 14, 0, by + ch - 14); g.addColorStop(0, light(color, 0.15)); g.addColorStop(1, deep(color, 0.15));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(nx, by + ch / 2, ch / 2 - 14, 0, 7); ctx.fill();
    text(ctx, String(i + 1), nx, by + ch / 2 + 1, { w: 600, size: 24, align: 'center', color: '#fff' });
    const tx = nx + ch / 2 - 2, mw = bx + cw - 26 - tx;
    if (sub) { text(ctx, lab, tx, by + ch / 2 - 15, { w: 600, size: 29, color: '#fff', maxW: mw }); text(ctx, sub, tx, by + ch / 2 + 20, { w: 400, size: 21, color: C.text2, maxW: mw }); }
    else text(ctx, lab, tx, by + ch / 2 + 1, { w: 600, size: 30, color: '#fff', maxW: mw });
    ctx.restore();
  });
  ctx.restore();
}

// ============================================================== ctaFollow
// ctaFollow(ctx, t, { t0, t1, avatar, name, tagline, headline, sub, clickAt (s after t0) })
function cursorGlyph(ctx, x, y, s, a) {
  ctx.save(); ctx.globalAlpha = a; ctx.translate(x, y); ctx.scale(s, s); ctx.rotate(-0.08);
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 17); ctx.lineTo(4, 13.2); ctx.lineTo(7, 20); ctx.lineTo(9.6, 18.9); ctx.lineTo(6.7, 12.3); ctx.lineTo(12, 12.3); ctx.closePath();
  ctx.shadowColor = 'rgba(0,0,0,0.45)'; ctx.shadowBlur = 6; ctx.shadowOffsetX = 1.2; ctx.shadowOffsetY = 2;
  ctx.fillStyle = '#ffffff'; ctx.fill();
  ctx.shadowColor = 'transparent'; ctx.lineJoin = 'round'; ctx.lineWidth = 1.3; ctx.strokeStyle = '#0f172a'; ctx.stroke();
  ctx.restore();
}
export function ctaFollow(ctx, t, o) {
  const { t0, t1, avatar = null, name = 'namman.story', tagline = 'Oil & Gas 101 · เข้าใจง่ายใน 2 นาที', headline = 'กดติดตามไว้', sub = 'เพื่อไม่พลาดตอนต่อไป',
    label = 'ติดตาม', doneLabel = 'ติดตามแล้ว', clickAt = 3.0 } = o;
  const E = env(t, t0, t1, 0.6, 0.4); if (!E.live || E.a <= 0) return;
  const u = t - t0, c = clickAt;
  const x = 110, y = 556, w = 800, h = 470, cx = 510;
  // headline
  ctx.save(); ctx.globalAlpha = E.a;
  const hk = stag(t, t0 + 0.1, 0, 0, 0.55), hk2 = stag(t, t0 + 0.25, 0, 0, 0.55);
  ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 20;
  ctx.globalAlpha = E.a * hk; text(ctx, headline, cx, 396 + (1 - hk) * 20, { w: 600, size: 58, align: 'center', color: '#fff', maxW: 880 });
  ctx.globalAlpha = E.a * hk2; text(ctx, sub, cx, 466 + (1 - hk2) * 20, { w: 400, size: 42, align: 'center', color: C.warmSoft, maxW: 880 });
  ctx.restore();
  // card
  const k = eback(u / 0.65, 1.3);
  ctx.save(); ctx.globalAlpha = E.a * clamp(k * 1.4); ctx.translate(cx, y + h / 2 + (1 - clamp(k)) * 50 + E.o * 30); ctx.scale(0.94 + 0.06 * k, 0.94 + 0.06 * k); ctx.translate(-cx, -(y + h / 2));
  glass(ctx, x, y, w, h, 44, { theme: 'light', shadowA: 0.5 });
  // avatar with gradient ring
  const ay = y + 116, ar = 76, ak = eback((u - 0.2) / 0.5, 1.8);
  ctx.save(); ctx.translate(cx, ay); ctx.scale(clamp(ak, 0, 1.2), clamp(ak, 0, 1.2));
  const rg = ctx.createLinearGradient(-ar, -ar, ar, ar); rg.addColorStop(0, '#ffd166'); rg.addColorStop(0.5, C.avatarRing); rg.addColorStop(1, '#ef4444');
  ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(0, 0, ar + 9, 0, 7); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, 0, ar + 3, 0, 7); ctx.fill();
  ctx.save(); ctx.beginPath(); ctx.arc(0, 0, ar, 0, 7); ctx.clip();
  if (avatar && (avatar.naturalWidth || avatar.width)) ctx.drawImage(avatar, -ar, -ar, ar * 2, ar * 2);
  else { const g = ctx.createLinearGradient(0, -ar, 0, ar); g.addColorStop(0, '#fb923c'); g.addColorStop(1, '#ea580c'); ctx.fillStyle = g; ctx.fillRect(-ar, -ar, ar * 2, ar * 2); text(ctx, 'n', 0, 4, { w: 600, size: 90, align: 'center', color: '#fff' }); }
  ctx.restore(); ctx.restore();
  // name + tagline
  const nk = stag(t, t0 + 0.35, 0, 0, 0.5);
  ctx.save(); ctx.globalAlpha *= nk;
  text(ctx, name, cx, y + 240 + (1 - nk) * 10, { w: 600, size: 50, align: 'center', color: C.ink, maxW: w - 80 });
  text(ctx, tagline, cx, y + 290 + (1 - nk) * 10, { w: 400, size: 28, align: 'center', color: C.mute, maxW: w - 80 });
  ctx.restore();
  // button
  const tapped = u >= c + 0.2, hover = !tapped && u >= c - 0.6;
  const press = u >= c - 0.08 && u < c + 0.22 ? 1 - 0.06 * Math.sin(clamp((u - c + 0.08) / 0.3) * Math.PI) : 1;
  const morph = sstep(c + 0.15, c + 0.45, u);
  const bw = 440, bh = 88, bx = cx - bw / 2, by = y + 342;
  const bk = stag(t, t0 + 0.5, 0, 0, 0.5);
  ctx.save(); ctx.globalAlpha *= bk; ctx.translate(cx, by + bh / 2); ctx.scale(press, press); ctx.translate(-cx, -(by + bh / 2));
  if (hover) { const hp = sstep(c - 0.6, c - 0.35, u); ctx.strokeStyle = `rgba(239,68,68,${0.3 * hp})`; ctx.lineWidth = 10; rr(ctx, bx - 6, by - 6, bw + 12, bh + 12, (bh + 12) / 2); ctx.stroke(); }
  const base = hover ? C.followHover : C.follow;
  const g = ctx.createLinearGradient(0, by, 0, by + bh);
  if (morph < 1) { g.addColorStop(0, light(base, 0.08)); g.addColorStop(1, deep(base, 0.1)); }
  ctx.save(); shadow(ctx, 18, 6, 0.3 * (1 - morph), '220,38,38');
  ctx.fillStyle = morph < 1 ? g : C.followDone; rr(ctx, bx, by, bw, bh, bh / 2); ctx.fill(); ctx.restore();
  if (morph > 0 && morph < 1) { ctx.globalAlpha *= 1; ctx.save(); ctx.globalAlpha *= morph; ctx.fillStyle = C.followDone; rr(ctx, bx, by, bw, bh, bh / 2); ctx.fill(); ctx.restore(); }
  if (morph >= 1 || tapped) { ctx.strokeStyle = 'rgba(15,23,42,0.08)'; ctx.lineWidth = 2; rr(ctx, bx + 1, by + 1, bw - 2, bh - 2, bh / 2 - 1); ctx.stroke(); }
  // contents (cross-fade)
  const bcy = by + bh / 2;
  if (morph < 1) {
    ctx.save(); ctx.globalAlpha *= 1 - morph;
    const lw = measure(ctx, label, 600, 38), gw = 34 + 14 + lw, gx = cx - gw / 2;
    icon(ctx, 'plus', gx + 17, bcy, 30, '#fff', 3.4);
    text(ctx, label, gx + 48, bcy + 2, { w: 600, size: 38, color: '#fff' });
    ctx.restore();
  }
  if (morph > 0) {
    ctx.save(); ctx.globalAlpha *= morph;
    const lw = Math.min(measure(ctx, doneLabel, 600, 36), bw - 150), gw = lw + 16 + 34, gx = cx - gw / 2;
    // bell wiggle after tap
    ctx.save(); ctx.translate(bx + 52, bcy); ctx.rotate(0.35 * Math.sin((u - c - 0.2) * 18) * clamp(1 - (u - c - 0.2) / 1.2));
    icon(ctx, 'bell', 0, 0, 30, C.slate); ctx.restore();
    text(ctx, doneLabel, gx, bcy + 2, { w: 600, size: 36, color: C.ink2, maxW: lw });
    const ck = eback((u - c - 0.3) / 0.35, 2.5);
    if (ck > 0) { ctx.save(); ctx.translate(gx + lw + 16 + 17, bcy); ctx.scale(ck, ck); ctx.fillStyle = '#22c55e'; ctx.beginPath(); ctx.arc(0, 0, 17, 0, 7); ctx.fill(); icon(ctx, 'check', 0, 0, 20, '#fff', 3.6); ctx.restore(); }
    ctx.restore();
  }
  ctx.restore();
  ctx.restore();
  // cursor: glides in on a curve, hovers, clicks (press + ripple), then drifts away
  const f = sstep(c - 1.8, c - 1.4, u) * (1 - sstep(c + 1.2, c + 1.8, u)) * (1 - E.o);
  if (f > 0) {
    const tx = cx + 150, ty = y + 342 + 44 + 4;
    const q = eio(sstep(c - 1.8, c - 0.4, u)), q2 = eio(sstep(c + 0.6, c + 1.8, u));
    const p0 = [930, 1250], p1 = [880, ty + 40];
    let px = (1 - q) * (1 - q) * p0[0] + 2 * q * (1 - q) * p1[0] + q * q * tx;
    let py = (1 - q) * (1 - q) * p0[1] + 2 * q * (1 - q) * p1[1] + q * q * ty;
    px += q2 * 120; py += q2 * 70;
    const click = u > c - 0.1 && u < c + 0.2 ? 0.86 : 1;
    if (u > c - 0.05 && u < c + 1.0) {
      const r = (u - c + 0.05) / 1.05;
      for (const [d, col] of [[0, '239,68,68'], [0.18, '255,255,255']]) {
        const qq = clamp((r - d) / (1 - d)); if (qq <= 0) continue;
        ctx.save(); ctx.globalAlpha = E.a * (1 - qq); ctx.strokeStyle = `rgba(${col},1)`; ctx.lineWidth = 5;
        ctx.beginPath(); ctx.arc(px, py, 8 + eout(qq) * 50, 0, 7); ctx.stroke(); ctx.restore();
      }
    }
    cursorGlyph(ctx, px, py, 3.1 * click, E.a * f);
  }
}

// ============================================================== nextTeaser
// nextTeaser(ctx, t, { t0, t1, part, total, kicker, title, sub, color, parts, barY })
export function nextTeaser(ctx, t, o) {
  const { t0, t1 = 1e9, part = 5, total = 5, kicker = 'ตอนต่อไป', title, sub = '', color = SYS.wc, parts = PARTS, barY = 1150 } = o;
  const E = env(t, t0, t1, 0.6, 0.3); if (!E.live || E.a <= 0) return;
  const lc = light(color, 0.45), cx = 510;
  ctx.save(); ctx.globalAlpha = E.a;
  const pk = eout((t - t0) / 0.6);
  ctx.save(); ctx.globalAlpha = E.a * pk; glass(ctx, 60, 200, 900, 360, 40); ctx.save(); rr(ctx, 60, 200, 900, 360, 40); ctx.clip();
  const rg = ctx.createRadialGradient(cx, 390, 10, cx, 390, 520); rg.addColorStop(0, hexA(color, 0.24)); rg.addColorStop(1, hexA(color, 0)); ctx.fillStyle = rg; ctx.fillRect(60, 200, 900, 360);
  ctx.restore(); ctx.restore();
  // kicker row with animated chevrons
  const k1 = stag(t, t0 + 0.15, 0);
  ctx.save(); ctx.globalAlpha = E.a * k1;
  const ks = `${kicker}  ·  PART ${part} / ${total}`, kw = measure(ctx, ks, 600, 32, 1);
  const kx = cx - (kw + 64) / 2;
  for (let i = 0; i < 3; i++) { const ph = fract((t - t0) * 1.1 - i * 0.18); ctx.globalAlpha = E.a * k1 * (0.3 + 0.7 * Math.max(0, Math.sin(ph * Math.PI))); icon(ctx, 'arrowR', kx + 10 + i * 16, 268, 20, lc, 3.6); }
  ctx.globalAlpha = E.a * k1;
  text(ctx, ks, kx + 64, 269 + (1 - k1) * 12, { w: 600, size: 32, ls: 1, color: lc, maxW: 760 });
  ctx.restore();
  // title (masked rise)
  const k2 = eout((t - t0 - 0.3) / 0.7);
  ctx.save(); ctx.beginPath(); ctx.rect(60, 300, 900, 130); ctx.clip(); ctx.shadowColor = 'rgba(0,0,0,0.4)'; ctx.shadowBlur = 18;
  text(ctx, title, cx, 368 + (1 - k2) * 120, { w: 600, size: 104, align: 'center', color: '#fff', maxW: 820 }); ctx.restore();
  const k3 = eio((t - t0 - 0.65) / 0.6);
  if (k3 > 0) { const uw = 180 * k3, g = ctx.createLinearGradient(cx - uw / 2, 0, cx + uw / 2, 0); g.addColorStop(0, color); g.addColorStop(1, lc); ctx.fillStyle = g; rr(ctx, cx - uw / 2, 438, uw, 6, 3); ctx.fill(); }
  const k4 = stag(t, t0 + 0.8, 0, 0, 0.55);
  ctx.save(); ctx.globalAlpha = E.a * k4;
  if (sub) text(ctx, sub, cx, 498 + (1 - k4) * 14, { w: 400, size: 42, align: 'center', color: C.warmSoft, maxW: 820 });
  ctx.restore();
  ctx.restore();
  partsBar(ctx, t, { y: barY, current: part - 1, t0: t0 + 0.9, a: E.a, parts });
}

// ============================================================== transitions
// wipe(ctx, t, { tc, dur, type: 'diag'|'bars'|'iris'|'slide'|'dip', color, accent, cx, cy })
// Fully covers the frame at t = tc; covers during [tc - dur/2, tc], reveals during [tc, tc + dur/2].
export function wipe(ctx, t, o) {
  const { tc, dur = 0.7, type = 'diag', color = C.scrim, accent = SYS.circ, cx = 540, cy = 960 } = o;
  const p = (t - (tc - dur / 2)) / dur; if (p <= 0 || p >= 1) return;
  const cin = eio(p * 2), cout = eio(p * 2 - 1);
  ctx.save();
  if (type === 'dip') { ctx.globalAlpha = 1 - Math.abs(p - 0.5) * 2; ctx.fillStyle = color; ctx.fillRect(0, 0, W, H); }
  else if (type === 'diag') {
    const sk = 420, span = W + sk * 2;
    const lead = -sk + span * cin, trail = -sk + span * cout;
    const band = (a, b) => { ctx.beginPath(); ctx.moveTo(b + sk / 2, 0); ctx.lineTo(a + sk / 2, 0); ctx.lineTo(a - sk / 2, H); ctx.lineTo(b - sk / 2, H); ctx.closePath(); };
    band(lead, p < 0.5 ? -sk * 2 : trail); ctx.fillStyle = color; ctx.fill();
    ctx.fillStyle = accent; band(lead + 14, lead); ctx.fill();
    if (p >= 0.5) { ctx.fillStyle = light(accent, 0.3); band(trail + 10, trail); ctx.fill(); }
  } else if (type === 'bars') {
    const nb = 6, bw = W / nb;
    for (let i = 0; i < nb; i++) {
      const d = i * 0.07, a = eio((p * 2 - d) / (1 - 0.42)), b = eio((p * 2 - 1 - d) / (1 - 0.42));
      const top = i % 2 === 0, hh = H * (p < 0.5 ? a : 1 - b);
      const yy = p < 0.5 ? (top ? 0 : H - hh) : (top ? H - hh : 0);
      ctx.fillStyle = color; ctx.fillRect(i * bw - 0.5, yy, bw + 1, hh);
      ctx.fillStyle = accent; ctx.fillRect(i * bw - 0.5, p < 0.5 ? (top ? yy + hh - 8 : yy) : (top ? yy : yy + hh - 8), bw + 1, hh > 8 ? 8 : 0);
    }
  } else if (type === 'iris') {
    const R = Math.hypot(W, H);
    if (p < 0.5) { ctx.fillStyle = color; ctx.beginPath(); ctx.arc(cx, cy, R * cin, 0, 7); ctx.fill(); ctx.strokeStyle = accent; ctx.lineWidth = 12; ctx.stroke(); }
    else { const r = R * cout; ctx.fillStyle = color; ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.moveTo(cx + r, cy); ctx.arc(cx, cy, r, 0, Math.PI * 2, true); ctx.closePath(); ctx.fill('evenodd'); ctx.strokeStyle = accent; ctx.lineWidth = 12; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke(); }
  } else if (type === 'slide') {
    const top = p < 0.5 ? H * (1 - cin) : 0, bot = p < 0.5 ? H : H * (1 - cout);
    ctx.fillStyle = color; ctx.fillRect(0, top, W, bot - top);
    ctx.fillStyle = accent; if (p < 0.5) ctx.fillRect(0, top, W, 10); else ctx.fillRect(0, bot - 10, W, 10);
  }
  ctx.restore();
}
