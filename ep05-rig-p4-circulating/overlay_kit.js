// overlay_kit.js: namman.story overlay kit (EP05 "Drilling Rig 101", Part 4: Circulating System)
// Direction: "Field Manual". Opaque paper sheets with ink type, one system accent, cased leader lines,
// numbered schematic labels. No glass, no glow, no gradients, no letter-spaced caps. See docs/design_direction.md.
// Pure Canvas-2D drawing functions for 1080x1920 (9:16). Every component is a pure function of t:
// no Date, no Math.random, no hidden state. Signature: fn(ctx, t, opts). Times in seconds.
// Each component owns its entrance (t0) and exit (t1); outside [t0, t1] it draws nothing.

// ============================================================== tokens
export const W = 1080, H = 1920;
export const SAFE = { x0: 60, x1: 960, y0: 160, y1: 1280, cx: 510, captionY0: 1310, captionY1: 1560, uiY: 1600 };
export const SYS = { power: '#f59e0b', hoist: '#3b82f6', rotate: '#ef4444', circ: '#14b8a6', wc: '#a855f7' };
export const C = {
  // the five neutrals of the system
  paper: '#f6f2ea',   // sheet fill
  paper2: '#e9e3d6',  // active row, inset, done button
  rule: '#cfc6b4',    // hairlines and tracks on paper
  ink: '#16171b',     // text, line work
  ink2: '#4a4d55',    // secondary text (7.9:1 on paper)
  mute: '#6d6f75',    // tertiary text, axis numerals (4.9:1 on paper)
  // content colours
  mud: '#b07a45', mudDark: '#5f3a1a',
  follow: '#e5372f', followHover: '#c92a23', followDone: '#e9e3d6',
  scrim: '#16171b',
  // legacy names kept for callers of the previous kit (mapped onto the new neutrals)
  ink2Legacy: '#1e293b', slate: '#4a4d55', line: '#cfc6b4', white: '#ffffff',
  text2: '#4a4d55', text3: '#6d6f75', warm: '#16171b', warmSoft: '#4a4d55', avatarRing: '#16171b',
};
export const PARTS = [
  { key: 'power', name: 'Power' }, { key: 'hoist', name: 'Hoisting' }, { key: 'rotate', name: 'Rotating' },
  { key: 'circ', name: 'Circulating' }, { key: 'wc', name: 'Well Control' },
];
// type scale (px at 1080 wide). Nothing in the kit is set below TYPE.min.
export const TYPE = { display: 112, h1: 64, h2: 44, h3: 36, body: 32, small: 28, min: 26 };
// motion tokens (seconds). One move per element, no overshoot, exits faster than entrances.
export const MOTION = { in: 0.45, out: 0.3, stagger: 0.12, pop: 0.35, sweep: 1.0, draw: 0.45 };
// geometry tokens
export const SHAPE = { r: 6, pad: 40, rule: 2, lead: 3, casing: 8 };

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
  return { a: Math.min(sstep(t0, t0 + din * 0.6, t), 1 - sstep(t1 - dout, t1, t)), i, o, live: true };
}
// staggered sub-entrance: 0..1 for item k
export const stag = (t, t0, k, step = MOTION.stagger, dur = 0.4) => eout((t - t0 - k * step) / dur);

// ============================================================== colour
function rgb(hex) { const h = hex.replace('#', ''); const n = parseInt(h.length === 3 ? h.replace(/./g, c => c + c) : h, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
export const hexA = (hex, a) => { const [r, g, b] = rgb(hex); return `rgba(${r},${g},${b},${a})`; };
export const mix = (h1, h2, u) => { const a = rgb(h1), b = rgb(h2); return '#' + a.map((v, i) => Math.round(lerp(v, b[i], u)).toString(16).padStart(2, '0')).join(''); };
export const light = (hex, u = 0.45) => mix(hex, '#ffffff', u);
export const deep = (hex, u = 0.35) => mix(hex, C.ink, u);
// accent used as TEXT on paper: darkened until it clears ~4.5:1 (teal -> #0d6b62)
export const accentInk = hex => deep(hex, 0.45);

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

// ALL-CAPS ASCII labels from older call sites ("MUD PUMP", "SOLIDS CONTROL") are set in sentence case.
// Acronyms of <= 4 letters (SPP, BOP, API, PVT) and anything containing Thai or lowercase are left alone.
const ACRONYMS = new Set(['SPP', 'BOP', 'API', 'PVT', 'WOB', 'RPM', 'ROP', 'GPM', 'PSI', 'SPM', 'PPG', 'HP', 'LCM', 'ECD', 'BHA', 'ID', 'OD', 'N2', 'PDC', 'TD', 'G']);
export function tidy(s) {
  s = String(s ?? '');
  if (!/[A-Z]{2}/.test(s) || /[a-z฀-๿]/.test(s)) return s;
  let first = true;
  return s.split(/(\s+)/).map(w => {
    if (/^\s+$/.test(w) || !/[A-Z]/.test(w)) return w;
    const core = w.replace(/[^A-Z0-9]/g, '');
    if (ACRONYMS.has(core) || /^(EP|P)\.?\d+$/.test(w) || /\d/.test(w) && core.length <= 4) { first = false; return w; }
    const out = first ? w[0] + w.slice(1).toLowerCase() : w.toLowerCase();
    first = false; return out;
  }).join('');
}

// Fit text into maxW by shrinking the font size (down to min). Sets ctx.font, returns the size used.
export function fit(ctx, str, weight, size, maxW, min = Math.max(TYPE.min, Math.round(size * 0.6))) {
  min = Math.min(min, size);
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
// Cut a string to fit maxW at the given size, preferring a word (or Thai segment) boundary, and append "...".
export function ellipsize(ctx, str, weight, size, maxW) {
  if (measure(ctx, str, weight, size) <= maxW) return str;
  const seg = typeof Intl !== 'undefined' && Intl.Segmenter ? [...new Intl.Segmenter('th', { granularity: 'word' }).segment(str)].map(x => x.segment) : str.split(/(\s+)/);
  let out = '';
  for (const w of seg) { if (measure(ctx, (out + w).trimEnd() + '...', weight, size) > maxW) break; out += w; }
  return (out.trimEnd() || str.slice(0, 4)) + '...';
}
// Draw text that always fits maxW: shrink to `min`, then squeeze horizontally as a last resort.
// opts: w (weight), size, maxW, min, align, color, baseline, ls. Returns { size, width }.
export function text(ctx, str, x, y, o = {}) {
  const { w = 400, size = 32, maxW = 1e9, align = 'left', color = C.ink, baseline = 'middle', ls = 0 } = o;
  const min = o.min ?? Math.min(size, Math.max(TYPE.min, Math.round(size * 0.6)));
  str = String(str ?? '');
  ctx.save(); setLS(ctx, ls);
  const s = fit(ctx, str, w, size, maxW, min);
  const m = ctx.measureText(str).width;
  ctx.fillStyle = color; ctx.textAlign = align; ctx.textBaseline = baseline;
  if (m > maxW) { ctx.translate(x, y); ctx.scale(maxW / m, 1); ctx.fillText(str, 0, 0); }
  else ctx.fillText(str, x, y);
  ctx.restore();
  return { size: s, width: Math.min(m, maxW) };
}

// The one surface of the kit: an opaque paper sheet. Tight contact shadow so it lifts off bright sand,
// a faint ink keyline so its edge holds on pale sky. Optional `band` = system colour strip on the top edge.
// opts: theme 'paper' | 'ink', band (hex), r, lift (0..1 shadow strength)
export function sheet(ctx, x, y, w, h, o = {}) {
  const { theme = 'paper', band = null, r = SHAPE.r, lift = 1, bandH = 8 } = o;
  ctx.save();
  shadow(ctx, 22, 6, 0.32 * lift);
  ctx.fillStyle = theme === 'ink' ? C.ink : C.paper; rr(ctx, x, y, w, h, r); ctx.fill();
  noShadow(ctx);
  ctx.strokeStyle = theme === 'ink' ? 'rgba(255,255,255,0.10)' : hexA(C.ink, 0.22); ctx.lineWidth = 1.5;
  rr(ctx, x + 0.75, y + 0.75, w - 1.5, h - 1.5, Math.max(0, r - 0.75)); ctx.stroke();
  if (band) { ctx.save(); rr(ctx, x, y, w, h, r); ctx.clip(); ctx.fillStyle = band; ctx.fillRect(x, y, w, bandH); ctx.restore(); }
  ctx.restore();
}
// Legacy name. theme 'dark' -> ink sheet, anything else -> paper. accent -> top band. glow/sheen ignored.
export function glass(ctx, x, y, w, h, r = SHAPE.r, o = {}) {
  sheet(ctx, x, y, w, h, { theme: o.theme === 'dark' ? 'ink' : 'paper', band: o.accent || null, r: Math.min(r, 10) });
}
// horizontal rule on paper
function hr(ctx, x0, x1, y, col = C.rule, lw = SHAPE.rule) { ctx.fillStyle = col; ctx.fillRect(x0, y - lw / 2, x1 - x0, lw); }
// left-to-right reveal clip helper: calls fn() clipped to [x, x + w*u]
function reveal(ctx, x, y, w, h, u, fn) { if (u <= 0) return; ctx.save(); ctx.beginPath(); ctx.rect(x - 2, y - 2, (w + 4) * clamp(u), h + 4); ctx.clip(); fn(); ctx.restore(); }

// Numbered key: accent square with an INK numeral (ink on any series colour clears 5:1; white does not).
export function numKey(ctx, n, x, y, s, color, o = {}) {
  const { filled = true } = o;
  ctx.save();
  if (filled) { ctx.fillStyle = color; rr(ctx, x - s / 2, y - s / 2, s, s, 3); ctx.fill(); }
  else { ctx.strokeStyle = C.ink; ctx.lineWidth = 2; rr(ctx, x - s / 2 + 1, y - s / 2 + 1, s - 2, s - 2, 3); ctx.stroke(); }
  text(ctx, String(n), x, y + s * 0.04, { w: 600, size: Math.round(s * 0.62), align: 'center', color: C.ink, min: 14 });
  ctx.restore();
}

// Vector line glyphs (24-unit box centred on x, y). Drawn as single-weight ink line work.
export function icon(ctx, name, x, y, s, color = C.ink, lw = 2.2) {
  ctx.save(); ctx.translate(x, y); const k = s / 24; ctx.scale(k, k);
  ctx.lineWidth = lw; ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath();
  switch (name) {
    case 'drop':
      ctx.moveTo(0, -10); ctx.bezierCurveTo(4, -4.5, 8, -0.5, 8, 3.5); ctx.arc(0, 3.5, 8, 0, Math.PI); ctx.bezierCurveTo(-8, -0.5, -4, -4.5, 0, -10); ctx.closePath(); ctx.stroke(); break;
    case 'check': ctx.moveTo(-7, 0.5); ctx.lineTo(-2.2, 5.5); ctx.lineTo(7.5, -5.5); ctx.stroke(); break;
    case 'question':
      ctx.moveTo(-4.6, -4.2); ctx.bezierCurveTo(-4.6, -10, 4.8, -10, 4.8, -4.4); ctx.bezierCurveTo(4.8, -0.8, 0, -0.4, 0, 3.4); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 8.2, 1.7, 0, 7); ctx.fill(); break;
    case 'pump':
      ctx.arc(-1, 1, 8, 0, 7); ctx.stroke(); ctx.beginPath(); ctx.moveTo(4, -5.5); ctx.lineTo(4, -10); ctx.lineTo(11, -10); ctx.stroke(); break;
    case 'filter': ctx.moveTo(-10, -8); ctx.lineTo(10, -8); ctx.lineTo(3, 1); ctx.lineTo(3, 7); ctx.lineTo(-3, 10); ctx.lineTo(-3, 1); ctx.closePath(); ctx.stroke(); break;
    case 'calc': rr(ctx, -8, -10.5, 16, 21, 2); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-4.5, -5); ctx.lineTo(4.5, -5); ctx.stroke(); break;
    case 'gauge': ctx.arc(0, 4, 10, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, 4); ctx.lineTo(5, -3); ctx.stroke(); break;
    case 'loop': ctx.arc(0, 0, 8, -2.6, 2.2); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-8.5, 2); ctx.lineTo(-4.6, 6.6); ctx.lineTo(-10.5, 7.5); ctx.stroke(); break;
    case 'bell':
      ctx.moveTo(-7.5, 5); ctx.bezierCurveTo(-7.5, -9.5, 7.5, -9.5, 7.5, 5); ctx.lineTo(9, 6.5); ctx.lineTo(-9, 6.5); ctx.closePath(); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 8.6, 2.4, 0, Math.PI); ctx.stroke(); break;
    case 'arrowR': ctx.moveTo(-8, 0); ctx.lineTo(8, 0); ctx.moveTo(2, -6); ctx.lineTo(8, 0); ctx.lineTo(2, 6); ctx.stroke(); break;
    case 'arrowD': ctx.moveTo(0, -8); ctx.lineTo(0, 8); ctx.moveTo(-6, 2); ctx.lineTo(0, 8); ctx.lineTo(6, 2); ctx.stroke(); break;
    case 'plus': ctx.moveTo(-7, 0); ctx.lineTo(7, 0); ctx.moveTo(0, -7); ctx.lineTo(0, 7); ctx.stroke(); break;
    case 'play': ctx.moveTo(-5, -8); ctx.lineTo(8, 0); ctx.lineTo(-5, 8); ctx.closePath(); ctx.fill(); break;
    case 'layers': ctx.moveTo(0, -9); ctx.lineTo(10, -4); ctx.lineTo(0, 1); ctx.lineTo(-10, -4); ctx.closePath(); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-10, 2); ctx.lineTo(0, 7); ctx.lineTo(10, 2); ctx.stroke(); break;
    case 'warn':
      ctx.moveTo(0, -10); ctx.lineTo(10.5, 8.5); ctx.lineTo(-10.5, 8.5); ctx.closePath(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, -3); ctx.lineTo(0, 2.5); ctx.stroke(); ctx.beginPath(); ctx.arc(0, 5.6, 1.3, 0, 7); ctx.fill(); break;
    default: ctx.arc(0, 0, 4, 0, 7); ctx.fill();
  }
  ctx.restore();
}
// Legacy: icon in a disc. Now a plain line glyph with no disc (icon-in-a-tinted-circle is a template tell).
export function iconBadge(ctx, name, x, y, d, color, o = {}) { icon(ctx, name, x, y, d * 0.62, o.ink || C.ink, o.lw || 2.4); }

// number formatting for count-ups: keeps the decimals of the target and adds thousands separators
export function fmtNum(v, decimals = 0) {
  const s = Math.abs(v).toFixed(decimals); const [i, d] = s.split('.');
  return (v < 0 ? '-' : '') + i.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + (d ? '.' + d : '');
}
const decOf = v => { const s = String(v); const p = s.indexOf('.'); return p < 0 ? 0 : s.length - p - 1; };

// Cased line (cartographic casing): a paper stroke under an ink stroke, so one line reads on sand and on navy.
function casedPath(ctx, pathFn, lw = SHAPE.lead, casing = SHAPE.casing) {
  ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.strokeStyle = hexA(C.paper, 0.95); ctx.lineWidth = casing; pathFn(); ctx.stroke();
  ctx.strokeStyle = C.ink; ctx.lineWidth = lw; pathFn(); ctx.stroke();
  ctx.restore();
}

// ============================================================== 5-part index ruler
// partsBar(ctx, t, { y, current (0-based), t0, a, x, w, parts, backing })
// Five equal segments: done = ink, current = system colour, later = rule. Numeral + name above each.
export function partsBar(ctx, t, o = {}) {
  const { x = 60, y = 660, w = 900, current = 3, t0 = -1e9, a = 1, parts = PARTS, backing = false } = o;
  if (a <= 0) return;
  const gap = 10, n = parts.length, cw = (w - gap * (n - 1)) / n, segH = 8;
  ctx.save(); ctx.globalAlpha *= a;
  if (backing) sheet(ctx, x - 24, y - 62, w + 48, 92);
  parts.forEach((p, i) => {
    const k = stag(t, t0, i, 0.08, 0.35); if (k <= 0) return;
    const col = SYS[p.key] || p.color || C.mute, sx = x + i * (cw + gap), on = i === current, done = i < current;
    ctx.save(); ctx.globalAlpha *= k;
    ctx.fillStyle = on ? col : done ? C.ink : C.rule;
    ctx.fillRect(sx, y, cw * eout((t - t0 - i * 0.08) / 0.4), segH);
    const tc = on ? C.ink : done ? C.ink2 : C.mute;
    text(ctx, String(i + 1), sx, y - 24, { w: 600, size: 26, color: tc });
    text(ctx, p.name, sx + 26, y - 24, { w: on ? 600 : 400, size: 26, color: tc, maxW: cw - 30 });
    ctx.restore();
  });
  ctx.restore();
}

// ============================================================== titleCard
// titleCard(ctx, t, { t0, t1, part, total, kicker, title, subtitle, hook, hookAt, color, parts })
// A cover plate: left-aligned, one large headline, a Thai deck line, the parts ruler. Hook = a second sheet.
export function titleCard(ctx, t, o) {
  const { t0 = 0.3, t1 = 6.8, part = 4, total = 5, kicker = 'Drilling Rig 101, ตอน 5', title, subtitle, hook, hookAt = 2.3, color = SYS.circ, parts = PARTS } = o;
  const E = env(t, t0, t1, 0.6, 0.35); if (!E.live || E.a <= 0) return;
  const x = 60, y = 196, w = 900, h = 520, px = x + 52;
  const dy = E.o * 16;
  ctx.save(); ctx.globalAlpha = E.a; ctx.translate(0, dy);
  // plate unrolls downward (clip), so the band lands first and the type is revealed under it
  const pk = eout((t - t0) / 0.5);
  ctx.save(); ctx.beginPath(); ctx.rect(x - 30, y - 30, w + 60, (h + 60) * pk); ctx.clip();
  sheet(ctx, x, y, w, h, { band: color, bandH: 10 });
  ctx.restore();
  // kicker line: sentence case, regular weight, no tracking
  const k1 = stag(t, t0 + 0.25, 0);
  ctx.save(); ctx.globalAlpha *= k1;
  const kick = `${tidy(kicker)}`;
  const kw = text(ctx, kick, px, y + 76, { w: 400, size: 30, color: C.ink2, maxW: 560 }).width;
  text(ctx, `Part ${part} of ${total}`, x + w - 52, y + 76, { w: 600, size: 30, align: 'right', color: accentInk(color), maxW: 800 - kw - 40 });
  ctx.restore();
  // title: masked rise (one move, no overshoot)
  const k3 = eout((t - t0 - 0.35) / 0.6);
  ctx.save(); ctx.beginPath(); ctx.rect(x, y + 110, w, 150); ctx.clip();
  text(ctx, title, px - 4, y + 186 + (1 - k3) * 130, { w: 600, size: TYPE.display, color: C.ink, maxW: w - 104 });
  ctx.restore();
  // Thai deck line
  const k5 = stag(t, t0 + 0.75, 0);
  ctx.save(); ctx.globalAlpha *= k5;
  if (subtitle) text(ctx, subtitle, px, y + 296 + (1 - k5) * 10, { w: 400, size: 42, color: C.ink, maxW: w - 104 });
  ctx.restore();
  hr(ctx, px, x + w - 52, y + 370, C.rule, 2);
  partsBar(ctx, t, { x: px, y: y + 446, w: w - 104, current: part - 1, t0: t0 + 1.0, parts });
  ctx.restore();
  if (hook) hookSheet(ctx, t, t0 + hookAt, E, hook, color, 1150 + dy);
}
function hookSheet(ctx, t, ts, E, str, color, cy) {
  const k = eout((t - ts) / 0.45); if (k <= 0) return;
  const tw = Math.min(measure(ctx, str, 600, 52), 900 - 150), w = tw + 150, h = 120, x = 60;
  ctx.save(); ctx.globalAlpha = E.a * clamp(k * 1.5);
  ctx.translate(0, (1 - k) * 24);
  sheet(ctx, x, cy - h / 2, w, h);
  ctx.fillStyle = color; ctx.fillRect(x, cy - h / 2, 12, h);
  text(ctx, '?', x + 62, cy + 2, { w: 600, size: 72, align: 'center', color: accentInk(color) });
  text(ctx, str, x + 108, cy + 2, { w: 600, size: 52, color: C.ink, maxW: tw });
  ctx.restore();
}

// ============================================================== sectionHeader (persistent tab, top-left)
// sectionHeader(ctx, t, { t0, t1, index, label, sub, color, x, y })
export function sectionHeader(ctx, t, o) {
  const { t0, t1, index = 'P4', label, sub = '', color = SYS.circ, x = 60, y = 168 } = o;
  const E = env(t, t0, t1, 0.4, 0.3); if (!E.live || E.a <= 0) return;
  const h = 64, ks = 64;
  const idx = String(index);
  const iw = Math.max(ks, measure(ctx, idx, 600, 28) + 28);
  const avail = 900 - iw - 24 - 28;
  // the label has priority: the sub is shown only if the label fits at full size beside it;
  // a label too long for the tab is cut at a word with "..." rather than squeezed
  let L = tidy(label);
  const fullL = measure(ctx, L, 600, 30);
  let showSub = !!sub, subW = sub ? measure(ctx, sub, 400, 28) : 0;
  if (showSub && fullL + 30 + Math.min(subW, 160) > avail) showSub = false;
  if (!showSub && fullL > avail) L = ellipsize(ctx, L, 600, 30, avail);
  let lw = Math.min(measure(ctx, L, 600, 30), avail);
  let sw = showSub ? Math.min(subW, avail - lw - 30) : 0;
  const full = iw + 24 + lw + (showSub ? 30 + sw : 0) + 28;
  ctx.save(); ctx.globalAlpha = E.a;
  const g = eout((t - t0) / 0.4);
  ctx.save(); ctx.beginPath(); ctx.rect(x - 30, y - 30, iw + (full - iw + 30) * g + 30, h + 60); ctx.clip();
  sheet(ctx, x, y, full, h);
  ctx.fillStyle = color; rr(ctx, x, y, iw, h, SHAPE.r); ctx.fill(); ctx.fillRect(x + iw - 8, y, 8, h);
  text(ctx, idx, x + iw / 2, y + h / 2 + 1, { w: 600, size: 28, align: 'center', color: C.ink, maxW: iw - 12 });
  const tx = x + iw + 24;
  text(ctx, L, tx, y + h / 2 + 1, { w: 600, size: 30, color: C.ink, maxW: lw });
  if (showSub) {
    ctx.fillStyle = C.rule; ctx.fillRect(tx + lw + 14, y + 16, 2, h - 32);
    text(ctx, sub, tx + lw + 30, y + h / 2 + 1, { w: 400, size: 28, color: C.ink2, maxW: sw });
  }
  ctx.restore(); ctx.restore();
}

// ============================================================== factCard
// factCard(ctx, t, { t0, t1, title, kicker, lines[≤3], big:{value, unit, label, decimals}, color, theme, bottom, stagger })
export function factCard(ctx, t, o) {
  const { t0, t1, title, kicker = '', lines = [], big = null, color = SYS.circ, theme = 'paper', bottom = 1270, x = 60, w = 900, stagger = 0.8 } = o;
  const E = env(t, t0, t1, 0.45, 0.3); if (!E.live || E.a <= 0) return;
  const inv = theme === 'dark' || theme === 'ink';
  const ink = inv ? C.paper : C.ink, ink2 = inv ? C.rule : C.ink2, rule = inv ? 'rgba(255,255,255,0.16)' : C.rule;
  const pad = SHAPE.pad, lh = 58, bigW = big ? 300 : 0;
  const n = Math.min(3, lines.length);
  const headH = kicker ? 104 : 66;
  let h = 8 + pad + headH + (n ? 22 + n * lh : 0) + pad - 8;
  if (big) h = Math.max(h, 252);
  const y = bottom - h;
  ctx.save(); ctx.globalAlpha = E.a; ctx.translate(0, (1 - E.i) * 28 + E.o * 12);
  sheet(ctx, x, y, w, h, { theme: inv ? 'ink' : 'paper', band: color });
  const colW = w - pad * 2 - bigW - (big ? 40 : 0);
  const hy = y + 8 + pad;
  if (kicker) {
    text(ctx, tidy(kicker), x + pad, hy + 16, { w: 400, size: 28, color: ink2, maxW: colW });
    text(ctx, title, x + pad, hy + 70, { w: 600, size: 46, color: ink, maxW: colW });
  } else text(ctx, title, x + pad, hy + 30, { w: 600, size: 46, color: ink, maxW: colW });
  if (n) hr(ctx, x + pad, x + pad + colW, hy + headH + 6, rule, 2);
  for (let i = 0; i < n; i++) {
    const u = stag(t, t0 + 0.35, i, stagger, 0.35); if (u <= 0) continue;
    const ly = hy + headH + 22 + i * lh + lh / 2;
    ctx.save(); ctx.globalAlpha *= u;
    ctx.fillStyle = ink; ctx.fillRect(x + pad, ly - 1.5, 16, 3);
    text(ctx, lines[i], x + pad + 32 + (1 - u) * 8, ly + 1, { w: 400, size: 34, color: ink, maxW: colW - 32 });
    ctx.restore();
  }
  if (big) {
    const bx0 = x + w - pad - bigW, by = y + 8 + (h - 8) / 2;
    const bk = eout((t - t0 - 0.3) / 0.4);
    ctx.save(); ctx.globalAlpha *= bk;
    ctx.fillStyle = rule; ctx.fillRect(bx0 - 22, y + 8 + 30, 2, h - 8 - 60);
    const num = typeof big.value === 'number';
    const cu = eout((t - t0 - 0.35) / MOTION.sweep);
    const v = num ? fmtNum(big.value * cu, big.decimals ?? decOf(big.value)) : String(big.value);
    const vr = text(ctx, v, bx0 + 8, by - 26, { w: 600, size: 96, color: ink, maxW: bigW - 8 });
    ctx.fillStyle = color; ctx.fillRect(bx0 + 10, by + 22, Math.min(vr.width, 120), 6);
    text(ctx, big.unit || '', bx0 + 8, by + 58, { w: 600, size: 32, color: ink, maxW: bigW - 8 });
    if (big.label) text(ctx, big.label, bx0 + 8, by + 96, { w: 400, size: 26, color: ink2, maxW: bigW - 8 });
    ctx.restore();
  }
  ctx.restore();
}

// ============================================================== callout (numbered schematic label)
// callout(ctx, t, { t0, t1, ax, ay, x, y, label, sub, color, align, size, n })
// (ax, ay) = projected anchor; (x, y) = label anchor (y = label centre). n = optional index numeral.
// Order of events: the anchor mark lands, the leader draws from it, then the label tab reveals from the leader side.
export function pillMetrics(ctx, label, sub, size, n = null) {
  const lw = measure(ctx, label, 600, size), ss = Math.max(TYPE.min, Math.round(size * 0.8)), sw = sub ? measure(ctx, sub, 400, ss) : 0;
  const padX = Math.round(size * 0.6), key = n != null ? Math.round(size * 1.35) : Math.round(size * 0.42), gap = Math.round(size * 0.45);
  const l1 = Math.round(size * 1.3), l2 = sub ? Math.round(ss * 1.5) : 0, padY = Math.round(size * 0.34);
  return { w: padX * 2 + key + gap + Math.max(lw, sw), h: padY * 2 + l1 + l2, lw, sw, ss, padX, padY, key, gap, l1, l2 };
}
export function labelPill(ctx, cx, cy, label, sub, color, o = {}) {
  let { size = 34, align = 'center', scale = 1, a = 1, n = null, u = 1, from = 'left' } = o;
  let m = pillMetrics(ctx, label, sub, size, n);
  while (m.w > 900 && size > 26) { size -= 1; m = pillMetrics(ctx, label, sub, size, n); }
  let x = align === 'center' ? cx - m.w / 2 : align === 'left' ? cx : cx - m.w;
  x = clamp(x, 60, 960 - m.w);
  const y = cy - m.h / 2;
  ctx.save(); ctx.globalAlpha *= a;
  if (scale !== 1) { ctx.translate(x + m.w / 2, cy); ctx.scale(scale, scale); ctx.translate(-(x + m.w / 2), -cy); }
  ctx.beginPath();
  const ru = clamp(u);
  if (from === 'right') ctx.rect(x + m.w * (1 - ru) - 30, y - 30, m.w * ru + 60, m.h + 60); else ctx.rect(x - 30, y - 30, m.w * ru + 60, m.h + 60);
  ctx.clip();
  sheet(ctx, x, y, m.w, m.h, { lift: 0.9 });
  const ky = y + m.padY + m.l1 / 2;
  if (n != null) numKey(ctx, n, x + m.padX + m.key / 2, ky, m.key, color);
  else { ctx.fillStyle = color; ctx.fillRect(x + m.padX, ky - m.key / 2, m.key, m.key); }
  const tx = x + m.padX + m.key + m.gap;
  text(ctx, label, tx, ky + 1, { w: 600, size, color: C.ink, maxW: 900 - (tx - x) - m.padX });
  if (sub) text(ctx, sub, tx, y + m.padY + m.l1 + m.l2 / 2 - 2, { w: 400, size: m.ss, color: C.ink2, maxW: 900 - (tx - x) - m.padX });
  ctx.restore();
  return { x, y, w: m.w, h: m.h };
}
export function callout(ctx, t, o) {
  const { t0, t1, ax, ay, x, y, label, sub = '', color = SYS.circ, align = 'center', size = 34, n = null } = o;
  const E = env(t, t0, t1, 0.3, 0.3); if (!E.live || E.a <= 0) return;
  let s = size, m = pillMetrics(ctx, label, sub, s, n); while (m.w > 900 && s > 26) { s--; m = pillMetrics(ctx, label, sub, s, n); }
  let bx = align === 'center' ? x - m.w / 2 : align === 'left' ? x : x - m.w; bx = clamp(bx, 60, 960 - m.w);
  const by = y - m.h / 2;
  // leader: anchor -> knee -> horizontal shoulder into the tab's side (or straight into its top/bottom edge)
  let P, K, from = 'left';
  const sh = 36;
  if (ax < bx) { P = [bx, y]; K = [bx - sh, y]; from = 'left'; }
  else if (ax > bx + m.w) { P = [bx + m.w, y]; K = [bx + m.w + sh, y]; from = 'right'; }
  else { const px = clamp(ax, bx + 24, bx + m.w - 24); P = [px, ay < by ? by : by + m.h]; K = [px, P[1]]; }
  // snap the oblique segment to a 15° grid where the knee can slide along the shoulder
  if (K[1] === P[1] && K[0] !== P[0]) {
    const dx = K[0] - ax, dyv = K[1] - ay, ang = Math.atan2(dyv, dx), snap = Math.round(ang / (Math.PI / 12)) * (Math.PI / 12);
    if (Math.abs(Math.cos(snap)) > 0.05 && Math.abs(Math.sin(snap)) > 0.05) {
      const kx = ax + dyv / Math.tan(snap);
      const lo = from === 'left' ? -1e9 : P[0] + 16, hi = from === 'left' ? P[0] - 16 : 1e9;
      if (kx > lo && kx < hi) K = [kx, K[1]];
    }
  }
  const L1 = Math.hypot(K[0] - ax, K[1] - ay), L2 = Math.hypot(P[0] - K[0], P[1] - K[1]), L = L1 + L2 || 1;
  const dk = eio((t - t0 - 0.15) / MOTION.draw);
  ctx.save(); ctx.globalAlpha = E.a;
  if (dk > 0) {
    const d = dk * L;
    casedPath(ctx, () => {
      ctx.beginPath(); ctx.moveTo(ax, ay);
      if (d <= L1) ctx.lineTo(lerp(ax, K[0], d / (L1 || 1)), lerp(ay, K[1], d / (L1 || 1)));
      else { ctx.lineTo(K[0], K[1]); ctx.lineTo(lerp(K[0], P[0], (d - L1) / (L2 || 1)), lerp(K[1], P[1], (d - L1) / (L2 || 1))); }
    });
  }
  // anchor mark: ISO "dot on a face" terminator, cased, accent centre. Scales in, then holds still.
  const ak = eout((t - t0) / 0.25);
  if (ak > 0) {
    ctx.save(); ctx.translate(ax, ay); ctx.scale(ak, ak);
    ctx.fillStyle = C.paper; ctx.beginPath(); ctx.arc(0, 0, 13, 0, 7); ctx.fill();
    ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(0, 0, 10, 0, 7); ctx.fill();
    ctx.fillStyle = color; ctx.beginPath(); ctx.arc(0, 0, 5.5, 0, 7); ctx.fill();
    ctx.restore();
  }
  ctx.restore();
  const pk = eout((t - t0 - 0.15 - MOTION.draw * 0.8) / 0.35);
  if (pk > 0) {
    ctx.save(); ctx.globalAlpha = E.a;
    labelPill(ctx, x, y, label, sub, color, { size: s, align, n, u: pk, from: from === 'right' ? 'right' : 'left' });
    ctx.restore();
  }
}

// ============================================================== flowPathMap (schematic of the loop)
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
  const { t0, t1, nodes, current = 0, color = SYS.circ, x = 60, y = 196, w = 900, h = 560, title = 'วงจร Mud', speed = 160, stepLabel = '' } = o;
  const E = env(t, t0, t1, 0.45, 0.3); if (!E.live || E.a <= 0) return;
  const n = nodes.length;
  let sides = o.sides;
  if (!sides) {
    if (n >= 6) { const r = n >= 9 ? 2 : 1, rest = n - 1 - r, tp = Math.ceil(rest / 2); sides = [1, tp, r, rest - tp]; }
    else { const tp = Math.ceil(n / 2); sides = [0, tp, 0, n - tp]; }
  }
  const lx = x + 70, ly = y + 170, lw = w - 140, lh = h - 260, R = 18;
  const G = loopGeom(lx, ly, lw, lh, R);
  const S = [], side = [];
  ['L', 'T', 'R', 'B'].forEach((k, si) => { const e = G.edge(k), c = sides[si]; for (let i = 0; i < c; i++) { S.push(e.s0 + e.len * (i + 1) / (c + 1)); side.push(k); } });
  const cur = clamp(current, 0, n - 1e-6), ci = Math.min(n - 1, Math.round(cur)), cf = Math.floor(cur), cfrac = cur - cf;
  const sAt = i => (i >= n ? S[0] + G.L : S[i]);
  const sCur = lerp(sAt(cf), cf + 1 >= n ? S[0] + G.L : sAt(cf + 1), eio(cfrac));
  const sv = s => (s < S[0] ? s + G.L : s);
  ctx.save(); ctx.globalAlpha = E.a; ctx.translate(0, (1 - E.i) * 24 + E.o * 12);
  sheet(ctx, x, y, w, h, { band: color });
  // header: sentence-case title left, position right
  text(ctx, tidy(title), x + 44, y + 62, { w: 600, size: 34, color: C.ink, maxW: w - 300 });
  text(ctx, `${stepLabel ? stepLabel + ' ' : ''}${ci + 1} / ${n}`, x + w - 44, y + 62, { w: 400, size: 30, align: 'right', color: C.ink2, maxW: 220 });
  hr(ctx, x + 44, x + w - 44, y + 104, C.rule, 2);
  const strokeArc = (s0, s1, col, lwid) => {
    if (s1 <= s0) return; ctx.strokeStyle = col; ctx.lineWidth = lwid; ctx.lineCap = 'butt'; ctx.lineJoin = 'round'; ctx.beginPath();
    const steps = Math.max(2, Math.ceil((s1 - s0) / 5));
    for (let i = 0; i <= steps; i++) { const p = G.at(lerp(s0, s1, i / steps)); i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); }
    ctx.stroke();
  };
  // pipe: drawn on once, then holds
  const rk = eio((t - t0 - 0.15) / 0.8);
  strokeArc(S[0], S[0] + G.L * rk, C.ink, 3);
  // visited run in the system colour, under the nodes
  const vk = eout((t - t0 - 0.5) / 0.5);
  const sEnd = lerp(S[0], sCur, vk);
  strokeArc(S[0], sEnd, color, 9);
  // static direction arrows between nodes (schematic convention), no animated chevrons
  if (rk >= 1) {
    for (let i = 0; i < n; i++) {
      const a = S[i], b = i + 1 < n ? S[i + 1] : S[0] + G.L, m = (a + b) / 2;
      if (b - a < 90) continue;
      const [px, py, ang] = G.at(m);
      ctx.save(); ctx.translate(px, py); ctx.rotate(ang); ctx.fillStyle = C.ink;
      ctx.beginPath(); ctx.moveTo(9, 0); ctx.lineTo(-7, -8); ctx.lineTo(-7, 8); ctx.closePath(); ctx.fill(); ctx.restore();
    }
    // one parcel of mud travelling the pipe: the only continuous motion, and it is the subject
    const sc = S[0] + fract((t - t0) * speed / G.L) * G.L, [qx, qy] = G.at(sc);
    ctx.fillStyle = C.mud; ctx.strokeStyle = C.ink; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(qx, qy, 8, 0, 7); ctx.fill(); ctx.stroke();
  }
  // nodes + labels
  const sideMax = lw * 0.26;
  nodes.forEach((nd, i) => {
    const k = eout((t - t0 - 0.3 - i * 0.06) / 0.3); if (k <= 0) return;
    const [px, py] = G.at(S[i]), on = i === ci, done = sv(S[i]) <= sEnd + 0.5 && !on;
    ctx.save(); ctx.globalAlpha *= k;
    if (on) numKey(ctx, i + 1, px, py, 44, color);
    else {
      ctx.fillStyle = done ? C.ink : C.paper; ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(px, py, 15, 0, 7); ctx.fill(); ctx.stroke();
      text(ctx, String(i + 1), px, py + 1, { w: 600, size: 18, align: 'center', color: done ? C.paper : C.ink, min: 14 });
    }
    const st = on ? { w: 600, size: 28, color: C.ink } : { w: 400, size: 26, color: done ? C.ink : C.ink2 };
    const sd = side[i], cnt = sides[['L', 'T', 'R', 'B'].indexOf(sd)];
    if (sd === 'T') text(ctx, nd.label, px, py - 44, { ...st, align: 'center', maxW: lw / (cnt + 1) - 8 });
    else if (sd === 'B') text(ctx, nd.label, px, py + 46, { ...st, align: 'center', maxW: lw / (cnt + 1) - 8 });
    else if (sd === 'L') text(ctx, nd.label, px + 34, py + 1, { ...st, align: 'left', maxW: sideMax });
    else text(ctx, nd.label, px - 34, py + 1, { ...st, align: 'right', maxW: sideMax });
    ctx.restore();
  });
  // centre readout: what the current node is, in plain words
  const ra = clamp(eout((t - t0 - 0.6) / 0.4) * (1 - 2.4 * Math.abs(cur - Math.round(cur))));
  if (ra > 0) {
    const nd = nodes[ci], cyy = ly + lh / 2, mw = lw - 2 * sideMax - 60;
    ctx.save(); ctx.globalAlpha *= ra;
    text(ctx, nd.label, lx + lw / 2, cyy - 22, { w: 600, size: 48, align: 'center', color: C.ink, maxW: mw });
    if (nd.th) text(ctx, nd.th, lx + lw / 2, cyy + 34, { w: 400, size: 30, align: 'center', color: C.ink2, maxW: mw });
    ctx.restore();
  }
  ctx.restore();
}

// ============================================================== stepList
// stepList(ctx, t, { t0, t1, items:[{label, sub}], current (float ok), color, x, y, w, title, rowH })
export function stepList(ctx, t, o) {
  const { t0, t1, items, current = 0, color = SYS.circ, x = 60, y = 420, w = 380, title = 'Steps', rowH = 88 } = o;
  const E = env(t, t0, t1, 0.45, 0.3); if (!E.live || E.a <= 0) return;
  const n = items.length, h = 8 + 108 + n * rowH + 16;
  const cur = clamp(current, 0, n - 1), ci = Math.round(cur);
  ctx.save(); ctx.globalAlpha = E.a; ctx.translate((1 - E.i) * -24, 0);
  sheet(ctx, x, y, w, h, { band: color });
  text(ctx, tidy(title), x + 32, y + 8 + 50, { w: 600, size: 32, color: C.ink, maxW: w - 64 });
  hr(ctx, x + 32, x + w - 32, y + 8 + 92, C.rule, 2);
  const r0 = y + 8 + 108 + rowH / 2, rowY = i => r0 + i * rowH, nx = x + 56;
  // active row: inset band that slides to the current step
  const hy = rowY(cur);
  ctx.fillStyle = C.paper2; ctx.fillRect(x + 12, hy - rowH / 2 + 6, w - 24, rowH - 12);
  ctx.fillStyle = color; ctx.fillRect(x + 12, hy - rowH / 2 + 6, 6, rowH - 12);
  // rail
  const rk = eio((t - t0 - 0.1) / 0.6);
  ctx.fillStyle = C.rule; ctx.fillRect(nx - 1, rowY(0), 2, (rowY(n - 1) - rowY(0)) * rk);
  items.forEach((it, i) => {
    const k = stag(t, t0 + 0.2, i, 0.08, 0.3); if (k <= 0) return;
    const yy = rowY(i), on = i === ci, done = i < cur - 0.5;
    ctx.save(); ctx.globalAlpha *= k;
    if (on) numKey(ctx, i + 1, nx, yy, 40, color);
    else {
      ctx.fillStyle = done ? C.ink : C.paper; ctx.strokeStyle = C.ink; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(nx, yy, 16, 0, 7); ctx.fill(); ctx.stroke();
      if (done) icon(ctx, 'check', nx, yy, 18, C.paper, 3.4);
      else text(ctx, String(i + 1), nx, yy + 1, { w: 600, size: 18, align: 'center', color: C.ink, min: 14 });
    }
    const tx = nx + 36, mw = x + w - 24 - tx;
    const col = on || done ? C.ink : C.ink2;
    if (it.sub) {
      text(ctx, it.label, tx, yy - 15, { w: on ? 600 : 400, size: 30, color: col, maxW: mw });
      text(ctx, it.sub, tx, yy + 22, { w: 400, size: 26, color: C.ink2, maxW: mw });
    } else text(ctx, it.label, tx, yy + 1, { w: on ? 600 : 400, size: 30, color: col, maxW: mw });
    ctx.restore();
  });
  ctx.restore();
}

// ============================================================== sizeFunnel (solids control)
// sizeFunnel(ctx, t, { t0, t1, stages:[{name, th, cut, unit, prefix}], active, color, x, y, w, title, kicker, outlet, rowH, stagger })
const cutNum = c => { if (typeof c === 'number') return c; const m = String(c).match(/[\d.]+/g); return m ? m.map(Number).reduce((a, b) => a + b, 0) / m.length : 10; };
export function sizeFunnel(ctx, t, o) {
  const { t0, t1, stages, active = -1, color = SYS.circ, x = 60, y = 220, w = 900, rowH = 146, stagger = 0.55,
    title = 'Solids Control', kicker = 'ขนาดอนุภาคที่แต่ละขั้นแยกออก', outlet = 'Mud สะอาด กลับสู่ Active Tank', fine = 'ละเอียด', coarse = 'หยาบ' } = o;
  const E = env(t, t0, t1, 0.45, 0.3); if (!E.live || E.a <= 0) return;
  const n = stages.length;
  const yb0 = y + 150, bandH = rowH - 22, outY = yb0 + n * rowH, scaleY = outY + 110, h = scaleY - y + 110;
  const fcx = x + 210, wTop = i => lerp(320, 100, i / n);
  const cardX = x + 420, cardW = x + w - 40 - cardX;
  const widthAt = yy => { const f = clamp((yy - yb0) / (n * rowH)); return lerp(wTop(0), wTop(n), f); };
  ctx.save(); ctx.globalAlpha = E.a; ctx.translate(0, (1 - E.i) * 24 + E.o * 12);
  sheet(ctx, x, y, w, h, { band: color });
  text(ctx, tidy(title), x + 44, y + 8 + 52, { w: 600, size: 44, color: C.ink, maxW: w - 88 });
  if (kicker) text(ctx, tidy(kicker), x + 44, y + 8 + 102, { w: 400, size: 28, color: C.ink2, maxW: w - 88 });
  const act = Math.round(active);
  stages.forEach((st, i) => {
    const k = eout((t - t0 - 0.3 - i * stagger) / 0.4); if (k <= 0) return;
    const yt = yb0 + i * rowH, wt = wTop(i), wb = wTop(i + 1) + (wTop(i) - wTop(i + 1)) * (22 / rowH), on = i === act;
    ctx.save(); ctx.globalAlpha *= k;
    const path = () => { ctx.beginPath(); ctx.moveTo(fcx - wt / 2, yt); ctx.lineTo(fcx + wt / 2, yt); ctx.lineTo(fcx + wb / 2, yt + bandH); ctx.lineTo(fcx - wb / 2, yt + bandH); ctx.closePath(); };
    path(); ctx.fillStyle = on ? hexA(color, 0.45) : C.paper2; ctx.fill();
    // screen hatching: finer at each stage (the drawing explains the mechanism)
    ctx.save(); path(); ctx.clip(); ctx.strokeStyle = hexA(C.ink, 0.28); ctx.lineWidth = 1.2;
    const sp = Math.max(6, 22 - i * 5);
    for (let gx = fcx - wt / 2 - bandH; gx < fcx + wt / 2 + bandH; gx += sp) { ctx.beginPath(); ctx.moveTo(gx, yt); ctx.lineTo(gx + bandH * 0.5, yt + bandH); ctx.stroke(); ctx.beginPath(); ctx.moveTo(gx + bandH * 0.5, yt); ctx.lineTo(gx, yt + bandH); ctx.stroke(); }
    ctx.restore();
    path(); ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5; ctx.stroke();
    const ny = yt + bandH / 2;
    // solid hairline leader from the band edge to the stage row
    const ex = fcx + lerp(wt, wb, 0.5) / 2;
    ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(ex, ny, 4, 0, 7); ctx.fill(); ctx.fillRect(ex, ny - 1, cardX - 16 - ex, 2);
    // stage row (no inner cards: just type on the sheet, separated by rules)
    if (on) { ctx.fillStyle = C.paper2; ctx.fillRect(cardX - 8, yt - 4, cardW + 16, bandH + 8); ctx.fillStyle = color; ctx.fillRect(cardX - 8, yt - 4, 6, bandH + 8); }
    numKey(ctx, i + 1, cardX + 26, ny - (st.th ? 20 : 0), 40, color, { filled: on });
    const tag = `${st.prefix ?? ''}${st.cut} ${st.unit ?? 'µm'}`;
    const tw = measure(ctx, tag, 600, 32);
    text(ctx, st.name, cardX + 64, ny - (st.th ? 20 : 0), { w: 600, size: 32, color: C.ink, maxW: cardW - 64 - tw - 20 });
    text(ctx, tag, cardX + cardW, ny - (st.th ? 20 : 0), { w: 600, size: 32, align: 'right', color: C.ink });
    if (st.th) text(ctx, st.th, cardX + 64, ny + 22, { w: 400, size: 26, color: C.ink2, maxW: cardW - 64 });
    if (i < n - 1) hr(ctx, cardX, cardX + cardW, yt + rowH - 11, C.rule, 1.5);
    ctx.restore();
  });
  // outlet
  const ok = eout((t - t0 - 0.3 - n * stagger) / 0.4);
  if (ok > 0) {
    ctx.save(); ctx.globalAlpha *= ok;
    icon(ctx, 'arrowD', fcx, outY + 14, 30, C.ink, 2.8);
    text(ctx, outlet, fcx + 34, outY + 16, { w: 600, size: 28, color: C.ink, maxW: x + w - 44 - fcx - 34 });
    ctx.restore();
  }
  // particles (pure: index-hashed)
  const pa = clamp((t - t0 - 0.8) / 0.5) * (1 - E.o);
  if (pa > 0) {
    ctx.save(); ctx.beginPath(); ctx.rect(x + 4, yb0 - 6, cardX - 24 - x, outY - yb0 + 12); ctx.clip();
    const radii = i => lerp(10, 3, i / n);
    const yS = yb0 - 10, yE = outY + 10;
    for (let j = 0; j < 40; j++) {
      const cls = Math.floor(hash(j, 1) * (n + 1)), P = 3.2 + hash(j, 2) * 1.2;
      const u = fract((t - t0) / P + hash(j, 3)), yy = lerp(yS, yE, Math.pow(u, 1.15));
      const xo = (hash(j, 4) - 0.5) * 0.7;
      const stopY = cls < n ? yb0 + cls * rowH + bandH * 0.5 : 1e9;
      if (cls < n && eout((t - t0 - 0.3 - cls * stagger) / 0.4) < 0.5) continue;
      let px, py, al = clamp((yy - yS) / 30);
      if (yy < stopY) { px = fcx + xo * widthAt(yy); py = yy; }
      else { const de = (yy - stopY) / (yE - yS) * P; const xs = fcx + xo * widthAt(stopY); px = xs - 260 * de; py = stopY - 60 * de + 480 * de * de; al *= clamp(1 - de / 0.5); }
      if (al <= 0) continue;
      ctx.globalAlpha = E.a * pa * al;
      const r = radii(Math.min(cls, n));
      ctx.fillStyle = cls < n ? C.mud : color; ctx.beginPath(); ctx.arc(px, py, r, 0, 7); ctx.fill();
      ctx.strokeStyle = C.ink; ctx.lineWidth = 1.2; ctx.stroke();
    }
    ctx.restore();
  }
  // log size scale (µm)
  const sk = eout((t - t0 - 0.5 - n * stagger) / 0.5);
  if (sk > 0) {
    ctx.save(); ctx.globalAlpha *= sk;
    const sx0 = x + 70, sx1 = x + w - 70, cuts = stages.map(s => cutNum(s.cut));
    const vmin = 1, vmax = Math.max(200, Math.max(...cuts) * 2);
    const X = v => lerp(sx0, sx1, Math.log10(v / vmin) / Math.log10(vmax / vmin));
    hr(ctx, x + 44, x + w - 44, scaleY - 76, C.rule, 2);
    ctx.fillStyle = C.ink; ctx.fillRect(sx0, scaleY - 1.5, (sx1 - sx0) * sk, 3);
    for (const v of [1, 10, 100, 1000].filter(v => v <= vmax)) {
      const xx = X(v);
      ctx.fillRect(xx - 1, scaleY, 2, 14);
      text(ctx, fmtNum(v), xx, scaleY + 38, { w: 400, size: 26, align: 'center', color: C.ink2 });
    }
    for (const v of [2, 5, 20, 50, 200, 500].filter(v => v <= vmax)) ctx.fillRect(X(v) - 1, scaleY, 2, 8);
    text(ctx, o.scaleLabel || 'ขนาดอนุภาค (ไมครอน)', (sx0 + sx1) / 2, scaleY + 80, { w: 400, size: 26, align: 'center', color: C.ink2, maxW: sx1 - sx0 });
    text(ctx, fine, sx0, scaleY - 34, { w: 400, size: 26, color: C.ink2 });
    text(ctx, coarse, sx1, scaleY - 34, { w: 400, size: 26, align: 'right', color: C.ink2 });
    cuts.forEach((c, i) => {
      const mk = eout((t - t0 - 0.8 - n * stagger - i * 0.1) / 0.3); if (mk <= 0) return;
      const xx = X(c), on = i === act;
      ctx.save(); ctx.globalAlpha *= mk;
      ctx.fillStyle = C.ink; ctx.beginPath(); ctx.moveTo(xx, scaleY - 3); ctx.lineTo(xx - 7, scaleY - 14); ctx.lineTo(xx + 7, scaleY - 14); ctx.closePath(); ctx.fill();
      numKey(ctx, i + 1, xx, scaleY - 34, 30, color, { filled: on });
      ctx.restore();
    });
    ctx.restore();
  }
  ctx.restore();
}

// ============================================================== formulaCard
// formulaCard(ctx, t, { t0, t1, title, kicker, lines:[{label, text}], result:{label, value, unit, decimals}, color, x, y, w, step })
// In line text, wrap a token in [[ ]] to set it in the accent ink, e.g. 'Q = [[0.000243]] × D² × L'.
function richText(ctx, str, x, y, size, maxW, base, accent) {
  const parts = String(str).split(/\[\[(.+?)\]\]/);
  const plain = parts.join('');
  ctx.save();
  const s = fit(ctx, plain, 600, size, maxW, Math.round(size * 0.65));
  const total = ctx.measureText(plain).width, k = total > maxW ? maxW / total : 1;
  ctx.textBaseline = 'middle'; ctx.textAlign = 'left'; ctx.translate(x, y); ctx.scale(k, 1);
  let cx = 0;
  parts.forEach((p, i) => {
    if (!p) return; const pw = ctx.measureText(p).width;
    if (i % 2) { ctx.fillStyle = hexA(accent, 0.22); ctx.fillRect(cx - 4, -s * 0.55, pw + 8, s * 1.1); }
    ctx.fillStyle = base; ctx.fillText(p, cx, 0); cx += pw;
  });
  ctx.restore();
  return { size: s, width: total * k };
}
export function formulaCard(ctx, t, o) {
  const { t0, t1, title, kicker = '', lines = [], result = null, color = SYS.circ, x = 60, y = 300, w = 900, step = 0.9, first = 0.6 } = o;
  const E = env(t, t0, t1, 0.45, 0.3); if (!E.live || E.a <= 0) return;
  const pad = SHAPE.pad, rowH = 100, labW = 150, resH = result ? 170 : 0, headH = kicker ? 132 : 92;
  const h = 8 + headH + 16 + lines.length * rowH + (result ? resH + 24 : 0) + pad - 8;
  ctx.save(); ctx.globalAlpha = E.a; ctx.translate(0, (1 - E.i) * 24 + E.o * 12);
  sheet(ctx, x, y, w, h, { band: color });
  if (kicker) {
    text(ctx, tidy(kicker), x + pad, y + 8 + 40, { w: 400, size: 28, color: C.ink2, maxW: w - pad * 2 });
    text(ctx, title, x + pad, y + 8 + 92, { w: 600, size: 42, color: C.ink, maxW: w - pad * 2 });
  } else text(ctx, title, x + pad, y + 8 + 50, { w: 600, size: 42, color: C.ink, maxW: w - pad * 2 });
  hr(ctx, x + pad, x + w - pad, y + 8 + headH, C.ink, 2);
  const by0 = y + 8 + headH + 16;
  lines.forEach((ln, i) => {
    const ts = t0 + first + i * step, u = eio((t - ts) / 0.5); if (u <= 0) return;
    const yy = by0 + i * rowH + rowH / 2;
    ctx.save(); ctx.globalAlpha *= clamp(u * 2);
    if (ln.label) text(ctx, ln.label, x + pad, yy + 2, { w: 400, size: 28, color: C.ink2, maxW: labW - 16 });
    const fx = x + pad + labW, fw = w - pad * 2 - labW;
    reveal(ctx, fx, yy - 44, fw, 88, u, () => richText(ctx, ln.text, fx, yy + 2, ln.size || 42, fw, C.ink, color));
    ctx.restore();
    if (i < lines.length - 1 || result) { ctx.save(); ctx.globalAlpha *= u; hr(ctx, x + pad, x + w - pad, yy + rowH / 2, C.rule, 1.5); ctx.restore(); }
  });
  if (result) {
    const ts = t0 + first + lines.length * step, u = eout((t - ts) / 0.4);
    if (u > 0) {
      const ry = by0 + lines.length * rowH + 24, rx = x + pad, rw = w - pad * 2;
      ctx.save(); ctx.globalAlpha *= u; ctx.translate(0, (1 - u) * 14);
      ctx.fillStyle = C.ink; rr(ctx, rx, ry, rw, resH, 4); ctx.fill();
      if (result.label) text(ctx, result.label, rx + 36, ry + 44, { w: 400, size: 28, color: C.rule, maxW: rw - 72 });
      const cu = eout((t - ts) / MOTION.sweep), num = typeof result.value === 'number';
      const vstr = num ? fmtNum(result.value * cu, result.decimals ?? decOf(result.value)) : String(result.value);
      const vr = text(ctx, vstr, rx + 34, ry + resH / 2 + 30, { w: 600, size: 80, color: C.paper, maxW: rw - 340 });
      ctx.fillStyle = color; ctx.fillRect(rx + 36, ry + resH - 22, Math.min(vr.width, 160), 6);
      if (result.unit) text(ctx, result.unit, rx + 34 + vr.width + 20, ry + resH / 2 + 42, { w: 600, size: 36, color: C.paper, maxW: rw - 90 - vr.width });
      ctx.restore();
    }
  }
  ctx.restore();
}

// ============================================================== gaugeDial
// gaugeDial(ctx, t, { t0, t1, cx, cy, r, value, min, max, unit, label, sub, color, decimals, zones:[{from,to,color}], majors, delay })
// An instrument face printed on a paper sheet: ink ticks, system-colour value arc, thin ink needle.
export function gaugeDial(ctx, t, o) {
  const { t0, t1, cx, cy, r = 120, value, min = 0, max = 100, unit = '', label = '', sub = '', color = SYS.circ, decimals = 0, zones = [], majors = 5, delay = 0 } = o;
  const E = env(t, t0 + delay, t1, 0.4, 0.3); if (!E.live || E.a <= 0) return;
  const A0 = Math.PI * 5 / 6, A1 = Math.PI * 13 / 6, ang = v => lerp(A0, A1, clamp((v - min) / (max - min)));
  const sw = eout((t - t0 - delay - 0.25) / MOTION.sweep), shown = min + (value - min) * sw;
  const bw = 2 * r + 56, top = cy - r - 30, bh = (label ? r + 30 + r + (sub ? 128 : 92) : 2 * r + 60);
  ctx.save(); ctx.globalAlpha = E.a; ctx.translate(0, (1 - E.i) * 20 + E.o * 10);
  sheet(ctx, cx - bw / 2, top, bw, bh, { band: color });
  // track, zones, value
  ctx.lineCap = 'butt';
  ctx.strokeStyle = C.paper2; ctx.lineWidth = 12; ctx.beginPath(); ctx.arc(cx, cy, r - 6, A0, A1); ctx.stroke();
  for (const z of zones) { ctx.strokeStyle = z.color; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(cx, cy, r + 6, ang(z.from), ang(z.to)); ctx.stroke(); }
  if (shown > min) { ctx.strokeStyle = color; ctx.lineWidth = 12; ctx.beginPath(); ctx.arc(cx, cy, r - 6, A0, ang(shown)); ctx.stroke(); }
  const minor = majors * 4;
  for (let i = 0; i <= minor; i++) {
    const q = lerp(A0, A1, i / minor), mj = i % 4 === 0, r1 = r - 16, r2 = r - (mj ? 36 : 26);
    ctx.strokeStyle = C.ink; ctx.lineWidth = mj ? 2.5 : 1.5;
    ctx.beginPath(); ctx.moveTo(cx + Math.cos(q) * r1, cy + Math.sin(q) * r1); ctx.lineTo(cx + Math.cos(q) * r2, cy + Math.sin(q) * r2); ctx.stroke();
  }
  if (r >= 100) {
    // min / max sit just under the two ends of the arc, outside the readout column
    for (const [v, sx] of [[min, -1], [max, 1]]) text(ctx, fmtNum(v, 0), cx + sx * 0.8 * r, cy + 0.5 * r + 34, { w: 400, size: 26, align: 'center', color: C.ink2 });
  }
  const q = ang(shown);
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(q);
  ctx.fillStyle = C.ink; ctx.beginPath(); ctx.moveTo(-r * 0.14, -3); ctx.lineTo(r - 30, -1); ctx.lineTo(r - 30, 1); ctx.lineTo(-r * 0.14, 3); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.arc(0, 0, 8, 0, 7); ctx.fill();
  ctx.restore();
  text(ctx, fmtNum(shown, decimals), cx, cy + r * 0.5, { w: 600, size: Math.round(r * 0.36), align: 'center', color: C.ink, maxW: r * 1.05 });
  text(ctx, unit, cx, cy + r * 0.86, { w: 400, size: Math.max(TYPE.min, Math.round(r * 0.22)), align: 'center', color: C.ink2, maxW: r * 0.8 });
  if (label) {
    hr(ctx, cx - bw / 2 + 24, cx + bw / 2 - 24, cy + r + 26, C.rule, 2);
    text(ctx, label, cx, cy + r + 64, { w: 600, size: 32, align: 'center', color: C.ink, maxW: bw - 32 });
    if (sub) text(ctx, sub, cx, cy + r + 104, { w: 400, size: 26, align: 'center', color: C.ink2, maxW: bw - 32 });
  }
  ctx.restore();
}

// ============================================================== recapGrid
// recapGrid(ctx, t, { t0, t1, kicker, title, items:[string | {label, sub}], color, cols, y, stagger })
// An index page: numbered entries in columns separated by rules, on one sheet. Not a grid of pills.
export function recapGrid(ctx, t, o) {
  const { t0, t1, kicker = 'สรุป', title, items, color = SYS.circ, cols = 2, y = 230, stagger = 0.12 } = o;
  const E = env(t, t0, t1, 0.45, 0.3); if (!E.live || E.a <= 0) return;
  const x = 60, w = 900, pad = 44;
  const hasSub = items.some(i => i && i.sub), rowH = hasSub ? 104 : 84, rows = Math.ceil(items.length / cols);
  const headH = 190, h = 8 + headH + rows * rowH + 28;
  ctx.save(); ctx.globalAlpha = E.a; ctx.translate(0, (1 - E.i) * 24 + E.o * 12);
  sheet(ctx, x, y, w, h, { band: color });
  text(ctx, tidy(kicker), x + pad, y + 8 + 50, { w: 400, size: 30, color: C.ink2, maxW: w - pad * 2 });
  const k2 = eout((t - t0 - 0.15) / 0.5);
  ctx.save(); ctx.beginPath(); ctx.rect(x, y + 80, w, 108); ctx.clip();
  text(ctx, title, x + pad - 2, y + 8 + 128 + (1 - k2) * 100, { w: 600, size: 80, color: C.ink, maxW: w - pad * 2 });
  ctx.restore();
  hr(ctx, x + pad, x + w - pad, y + 8 + headH - 4, C.ink, 2);
  const gap = 40, cw = (w - pad * 2 - gap * (cols - 1)) / cols, gy = y + 8 + headH;
  items.forEach((it, i) => {
    const k = eout((t - t0 - 0.5 - i * stagger) / 0.3); if (k <= 0) return;
    const c = cols > 1 ? Math.floor(i / rows) : 0, row = cols > 1 ? i % rows : i;
    const bx = x + pad + c * (cw + gap), by = gy + row * rowH;
    const lab = typeof it === 'string' ? it : it.label, sub = typeof it === 'string' ? '' : it.sub;
    ctx.save(); ctx.globalAlpha *= k;
    text(ctx, String(i + 1).padStart(2, '0'), bx, by + rowH / 2 + 1, { w: 600, size: 28, color: accentInk(color) });
    const tx = bx + 52, mw = cw - 52;
    if (sub) { text(ctx, lab, tx, by + rowH / 2 - 17, { w: 600, size: 30, color: C.ink, maxW: mw }); text(ctx, sub, tx, by + rowH / 2 + 22, { w: 400, size: 26, color: C.ink2, maxW: mw }); }
    else text(ctx, lab, tx, by + rowH / 2 + 1, { w: 600, size: 30, color: C.ink, maxW: mw });
    if (row < rows - 1) hr(ctx, bx, bx + cw, by + rowH, C.rule, 1.5);
    ctx.restore();
  });
  ctx.restore();
}

// ============================================================== ctaFollow
// ctaFollow(ctx, t, { t0, t1, avatar, name, tagline, headline, sub, clickAt (s after t0) })
function cursorGlyph(ctx, x, y, s, a) {
  ctx.save(); ctx.globalAlpha = a; ctx.translate(x, y); ctx.scale(s, s); ctx.rotate(-0.08);
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 17); ctx.lineTo(4, 13.2); ctx.lineTo(7, 20); ctx.lineTo(9.6, 18.9); ctx.lineTo(6.7, 12.3); ctx.lineTo(12, 12.3); ctx.closePath();
  ctx.shadowColor = 'rgba(0,0,0,0.35)'; ctx.shadowBlur = 4; ctx.shadowOffsetX = 1; ctx.shadowOffsetY = 1.5;
  ctx.fillStyle = '#ffffff'; ctx.fill();
  ctx.shadowColor = 'transparent'; ctx.lineJoin = 'round'; ctx.lineWidth = 1.3; ctx.strokeStyle = C.ink; ctx.stroke();
  ctx.restore();
}
export function ctaFollow(ctx, t, o) {
  const { t0, t1, avatar = null, name = 'namman.story', tagline = 'Oil & Gas 101 เข้าใจง่ายใน 2 นาที', headline = 'กดติดตามไว้', sub = 'เพื่อไม่พลาดตอนต่อไป',
    label = 'ติดตาม', doneLabel = 'ติดตามแล้ว', clickAt = 3.0, color = SYS.circ } = o;
  const E = env(t, t0, t1, 0.45, 0.3); if (!E.live || E.a <= 0) return;
  const u = t - t0, c = clickAt;
  const x = 60, y = 440, w = 900, h = 600, cx = 510, pad = 56;
  const k = eout(u / 0.45);
  ctx.save(); ctx.globalAlpha = E.a * k; ctx.translate(0, (1 - k) * 28 + E.o * 12);
  sheet(ctx, x, y, w, h, { band: color });
  // headline + sub, left-aligned like the rest of the series
  text(ctx, headline, x + pad, y + 8 + 74, { w: 600, size: 64, color: C.ink, maxW: w - pad * 2 });
  text(ctx, sub, x + pad, y + 8 + 146, { w: 400, size: 40, color: C.ink2, maxW: w - pad * 2 });
  hr(ctx, x + pad, x + w - pad, y + 8 + 206, C.rule, 2);
  // profile row
  const ar = 68, ay = y + 8 + 300, ax = x + pad + ar;
  ctx.save(); ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(ax, ay, ar + 4, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.arc(ax, ay, ar, 0, 7); ctx.clip();
  if (avatar && (avatar.naturalWidth || avatar.width)) ctx.drawImage(avatar, ax - ar, ay - ar, ar * 2, ar * 2);
  else { ctx.fillStyle = SYS.power; ctx.fillRect(ax - ar, ay - ar, ar * 2, ar * 2); text(ctx, 'n', ax, ay + 4, { w: 600, size: 80, align: 'center', color: C.ink }); }
  ctx.restore();
  text(ctx, name, ax + ar + 32, ay - 22, { w: 600, size: 46, color: C.ink, maxW: w - pad * 2 - ar * 2 - 32 });
  text(ctx, tagline, ax + ar + 32, ay + 30, { w: 400, size: 28, color: C.ink2, maxW: w - pad * 2 - ar * 2 - 32 });
  // button
  const tapped = u >= c + 0.2, hover = !tapped && u >= c - 0.6;
  const press = u >= c - 0.08 && u < c + 0.22 ? 1 - 0.05 * Math.sin(clamp((u - c + 0.08) / 0.3) * Math.PI) : 1;
  const morph = sstep(c + 0.15, c + 0.4, u);
  const bw = w - pad * 2, bh = 104, bx = x + pad, by = y + 8 + 432, bcx = bx + bw / 2;
  ctx.save(); ctx.translate(bcx, by + bh / 2); ctx.scale(press, press); ctx.translate(-bcx, -(by + bh / 2));
  const base = hover ? C.followHover : C.follow;
  ctx.fillStyle = base; rr(ctx, bx, by, bw, bh, 8); ctx.fill();
  if (morph > 0) { ctx.save(); ctx.globalAlpha *= morph; ctx.fillStyle = C.followDone; rr(ctx, bx, by, bw, bh, 8); ctx.fill(); ctx.strokeStyle = C.ink; ctx.lineWidth = 2; rr(ctx, bx + 1, by + 1, bw - 2, bh - 2, 7); ctx.stroke(); ctx.restore(); }
  const bcy = by + bh / 2;
  if (morph < 1) {
    ctx.save(); ctx.globalAlpha *= 1 - morph;
    const lw = measure(ctx, label, 600, 42), gw = 34 + 16 + lw, gx = bcx - gw / 2;
    icon(ctx, 'plus', gx + 17, bcy, 32, '#ffffff', 3.4);
    text(ctx, label, gx + 50, bcy + 2, { w: 600, size: 42, color: '#ffffff' });
    ctx.restore();
  }
  if (morph > 0) {
    ctx.save(); ctx.globalAlpha *= morph;
    const lw = measure(ctx, doneLabel, 600, 40), gw = 34 + 18 + lw + 18 + 34, gx = bcx - gw / 2;
    ctx.save(); ctx.translate(gx + 17, bcy); ctx.rotate(0.3 * Math.sin((u - c - 0.2) * 16) * clamp(1 - (u - c - 0.2) / 1.0));
    icon(ctx, 'bell', 0, 0, 32, C.ink, 2.4); ctx.restore();
    text(ctx, doneLabel, gx + 52, bcy + 2, { w: 600, size: 40, color: C.ink });
    // the check draws on (a stroke, not a bouncing green disc)
    const ck = eout((u - c - 0.3) / 0.3);
    if (ck > 0) {
      ctx.save(); ctx.translate(gx + 52 + lw + 18 + 17, bcy); ctx.strokeStyle = C.ink; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      const pts = [[-11, 0], [-3.5, 8], [12, -9]], L1 = Math.hypot(7.5, 8), L2 = Math.hypot(15.5, 17), d = ck * (L1 + L2);
      ctx.beginPath(); ctx.moveTo(...pts[0]);
      if (d <= L1) ctx.lineTo(lerp(pts[0][0], pts[1][0], d / L1), lerp(pts[0][1], pts[1][1], d / L1));
      else { ctx.lineTo(...pts[1]); ctx.lineTo(lerp(pts[1][0], pts[2][0], (d - L1) / L2), lerp(pts[1][1], pts[2][1], (d - L1) / L2)); }
      ctx.stroke(); ctx.restore();
    }
    ctx.restore();
  }
  ctx.restore();
  ctx.restore();
  // cursor: glides in on a curve, hovers, clicks (press + one ink ring), then drifts away
  const f = sstep(c - 1.8, c - 1.4, u) * (1 - sstep(c + 1.2, c + 1.8, u)) * (1 - E.o);
  if (f > 0) {
    const tx = bcx + 170, ty = by + bh / 2 + 6;
    const q = eio(sstep(c - 1.8, c - 0.4, u)), q2 = eio(sstep(c + 0.6, c + 1.8, u));
    const p0 = [930, 1250], p1 = [900, ty + 60];
    let px = (1 - q) * (1 - q) * p0[0] + 2 * q * (1 - q) * p1[0] + q * q * tx;
    let py = (1 - q) * (1 - q) * p0[1] + 2 * q * (1 - q) * p1[1] + q * q * ty;
    px += q2 * 100; py += q2 * 80;
    const click = u > c - 0.1 && u < c + 0.2 ? 0.86 : 1;
    if (u > c - 0.05 && u < c + 0.7) {
      const qq = clamp((u - c + 0.05) / 0.75);
      ctx.save(); ctx.globalAlpha = E.a * (1 - qq); ctx.strokeStyle = C.ink; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(px, py, 8 + eout(qq) * 44, 0, 7); ctx.stroke(); ctx.restore();
    }
    cursorGlyph(ctx, px, py, 3.1 * click, E.a * f);
  }
}

// ============================================================== nextTeaser
// nextTeaser(ctx, t, { t0, t1, part, total, kicker, title, sub, color, parts, barY })
// barY: null = the parts ruler sits inside the plate; a number = a separate ruler strip at that y.
export function nextTeaser(ctx, t, o) {
  const { t0, t1 = 1e9, part = 5, total = 5, kicker = 'ตอนต่อไป', title, sub = '', color = SYS.wc, parts = PARTS, barY = null } = o;
  const E = env(t, t0, t1, 0.5, 0.3); if (!E.live || E.a <= 0) return;
  const x = 60, y = 220, w = 900, h = barY == null ? 500 : 380, px = x + 52;
  ctx.save(); ctx.globalAlpha = E.a;
  const pk = eout((t - t0) / 0.5);
  ctx.save(); ctx.beginPath(); ctx.rect(x - 30, y - 30, w + 60, (h + 60) * pk); ctx.clip();
  sheet(ctx, x, y, w, h, { band: color, bandH: 10 });
  ctx.restore();
  const k1 = stag(t, t0 + 0.2, 0);
  ctx.save(); ctx.globalAlpha *= k1;
  const kw = text(ctx, kicker, px, y + 76, { w: 600, size: 34, color: C.ink, maxW: 500 }).width;
  text(ctx, `Part ${part} of ${total}`, x + w - 52, y + 76, { w: 600, size: 30, align: 'right', color: accentInk(color), maxW: 800 - kw - 40 });
  icon(ctx, 'arrowR', px + kw + 30, y + 76, 30, C.ink, 2.6);
  ctx.restore();
  const k2 = eout((t - t0 - 0.3) / 0.6);
  ctx.save(); ctx.beginPath(); ctx.rect(x, y + 110, w, 150); ctx.clip();
  text(ctx, title, px - 4, y + 186 + (1 - k2) * 130, { w: 600, size: 104, color: C.ink, maxW: w - 104 });
  ctx.restore();
  const k4 = stag(t, t0 + 0.7, 0);
  ctx.save(); ctx.globalAlpha *= k4;
  if (sub) text(ctx, sub, px, y + 296, { w: 400, size: 42, color: C.ink, maxW: w - 104 });
  ctx.restore();
  if (barY == null) { hr(ctx, px, x + w - 52, y + 370, C.rule, 2); partsBar(ctx, t, { x: px, y: y + 434, w: w - 104, current: part - 1, t0: t0 + 0.9, parts }); }
  ctx.restore();
  if (barY != null) partsBar(ctx, t, { x: px, y: barY, w: w - 104, current: part - 1, t0: t0 + 0.9, a: E.a, parts, backing: true });
}

// ============================================================== transitions
// wipe(ctx, t, { tc, dur, type: 'diag'|'bars'|'iris'|'slide'|'dip', color, accent, cx, cy })
// Fully covers the frame at t = tc; covers during [tc - dur/2, tc], reveals during [tc, tc + dur/2].
// Ink fills, one thin system-colour rule on the leading edge (diag/slide only). No glow, no double rings.
export function wipe(ctx, t, o) {
  const { tc, dur = 0.7, type = 'diag', color = C.scrim, accent = SYS.circ, cx = 540, cy = 960 } = o;
  const p = (t - (tc - dur / 2)) / dur; if (p <= 0 || p >= 1) return;
  const cin = eio(p * 2), cout = eio(p * 2 - 1);
  ctx.save();
  if (type === 'dip') { ctx.globalAlpha = 1 - Math.abs(p - 0.5) * 2; ctx.fillStyle = color; ctx.fillRect(0, 0, W, H); }
  else if (type === 'diag') {
    const sk = 360, span = W + sk * 2;
    const lead = -sk + span * cin, trail = -sk + span * cout;
    const band = (a, b) => { ctx.beginPath(); ctx.moveTo(b + sk / 2, 0); ctx.lineTo(a + sk / 2, 0); ctx.lineTo(a - sk / 2, H); ctx.lineTo(b - sk / 2, H); ctx.closePath(); };
    band(lead, p < 0.5 ? -sk * 2 : trail); ctx.fillStyle = color; ctx.fill();
    if (p < 0.5) { ctx.fillStyle = accent; band(lead + 10, lead); ctx.fill(); }
    else { ctx.fillStyle = accent; band(trail + 10, trail); ctx.fill(); }
  } else if (type === 'bars') {
    const nb = 5, bw = W / nb;
    for (let i = 0; i < nb; i++) {
      const d = i * 0.06, a = eio((p * 2 - d) / (1 - 0.3)), b = eio((p * 2 - 1 - d) / (1 - 0.3));
      const hh = H * (p < 0.5 ? a : 1 - b), yy = p < 0.5 ? 0 : H - hh;
      ctx.fillStyle = color; ctx.fillRect(i * bw - 0.5, yy, bw + 1, hh);
    }
  } else if (type === 'iris') {
    const R = Math.hypot(W, H);
    if (p < 0.5) { ctx.fillStyle = color; ctx.beginPath(); ctx.arc(cx, cy, R * cin, 0, 7); ctx.fill(); }
    else { const r = R * cout; ctx.fillStyle = color; ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.moveTo(cx + r, cy); ctx.arc(cx, cy, r, 0, Math.PI * 2, true); ctx.closePath(); ctx.fill('evenodd'); }
  } else if (type === 'slide') {
    const top = p < 0.5 ? H * (1 - cin) : 0, bot = p < 0.5 ? H : H * (1 - cout);
    ctx.fillStyle = color; ctx.fillRect(0, top, W, bot - top);
    ctx.fillStyle = accent; if (p < 0.5) ctx.fillRect(0, top, W, 8); else ctx.fillRect(0, bot - 8, W, 8);
  }
  ctx.restore();
}
