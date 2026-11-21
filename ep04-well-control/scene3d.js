// scene3d.js — namman.story EP04 "Well Control: จาก Kick ถึง Kill" — low-poly 3D explainer, 120 s, 1080x1920.
// Contract: see SPEC.md (+ ../bop-3d/SPEC.md). Rig + mud system reused from EP03. renderFrame(t) / drawOverlay(ctx,t) are pure functions of t.
// Calmer pacing than EP02: captions 5–8 s, labels held ≥3 s, max 2 new labels at once, camera holds on key views.
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const DURATION = 120;
let THREE, renderer, scene, camera;
let W = 1080, H = 1920;

// world sets (far apart; only the active one is visible)
const OFF = { L: [0, 0, 0], W: [5000, 0, 0], B: [0, 0, -5000] };

// ---------------------------------------------------------------- math utils
const clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
const lerp = (a, b, u) => a + (b - a) * u;
const sstep = (a, b, x) => { const u = clamp((x - a) / (b - a)); return u * u * (3 - 2 * u); };
const eio = u => { u = clamp(u); return u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2; };
const eout = u => 1 - Math.pow(1 - clamp(u), 3);
const fract = x => x - Math.floor(x);
const hash = (i, k = 0) => fract(Math.sin(i * 127.1 + k * 311.7 + 0.123) * 43758.5453);
const win = (t, a, b, fi = 0.3, fo = 0.3) => Math.min(sstep(a, a + fi, t), 1 - sstep(b - fo, b, t));
const pwl = (pts, t) => {
  if (t <= pts[0][0]) return pts[0][1];
  for (let i = 0; i < pts.length - 1; i++) if (t < pts[i + 1][0]) return lerp(pts[i][1], pts[i + 1][1], sstep(pts[i][0], pts[i + 1][0], t));
  return pts[pts.length - 1][1];
};
// piecewise-linear rate -> exact integral from pts[0][0] to t
function pwlIntegral(pts, t) {
  let acc = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const [t0, r0] = pts[i], [t1, r1] = pts[i + 1];
    if (t <= t0) break;
    const te = Math.min(t, t1), u = (te - t0) / (t1 - t0);
    const re = r0 + (r1 - r0) * u;
    acc += (te - t0) * (r0 + re) / 2;
    if (t <= t1) return acc;
  }
  const last = pts[pts.length - 1];
  if (t > last[0]) acc += (t - last[0]) * last[1];
  return acc;
}
// monotone cubic Hermite through keyframes {t, v:[...], stop?}
function track(keys, t) {
  const n = keys.length;
  if (t <= keys[0].t) return keys[0].v.slice();
  if (t >= keys[n - 1].t) return keys[n - 1].v.slice();
  let i = 0; while (t >= keys[i + 1].t) i++;
  const k0 = keys[i], k1 = keys[i + 1], dt = k1.t - k0.t, s = (t - k0.t) / dt;
  const tan = (j, c) => {
    if (j === 0 || j === n - 1 || keys[j].stop) return 0;
    const a = keys[j - 1], b = keys[j], d = keys[j + 1];
    const d0 = (b.v[c] - a.v[c]) / (b.t - a.t), d1 = (d.v[c] - b.v[c]) / (d.t - b.t);
    if (d0 * d1 <= 0) return 0;
    let m = (d.v[c] - a.v[c]) / (d.t - a.t);
    const lim = 3 * Math.min(Math.abs(d0), Math.abs(d1));
    if (Math.abs(m) > lim) m = Math.sign(m) * lim;
    return m;
  };
  const s2 = s * s, s3 = s2 * s;
  const h00 = 2 * s3 - 3 * s2 + 1, h10 = s3 - 2 * s2 + s, h01 = -2 * s3 + 3 * s2, h11 = s3 - s2;
  return k0.v.map((v0, c) => h00 * v0 + h10 * dt * tan(i, c) + h01 * k1.v[c] + h11 * dt * tan(i + 1, c));
}

// ---------------------------------------------------------------- palette
const HEX = {
  mud: '#c8925a', safe: '#22c55e', danger: '#ef4444', lost: '#f97316', ink: '#0f172a', flow: '#ffd166',
  pump: '#3b82f6', shaker: '#14b8a6', barite: '#ef4444', bent: '#a16207', mwd: '#22d3ee', cake: '#7c4a22',
  wbm: '#3b82f6', obm: '#f59e0b', sbm: '#22c55e', pore: '#ef4444', frac: '#f97316',
};

// ---------------------------------------------------------------- builders
const lam = (color, o = {}) => new THREE.MeshLambertMaterial({ color, flatShading: true, ...o });
const basic = (color, o = {}) => new THREE.MeshBasicMaterial({ color, ...o });
function add(parent, geo, mat, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); parent.add(m); return m;
}
const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const cyl = (r, h, s = 12, open = false, r2 = r) => new THREE.CylinderGeometry(r2, r, h, s, 1, open);
function cylBetween(a, b, r, seg = 6) {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b);
  const d = B.clone().sub(A), len = d.length();
  const g = new THREE.CylinderGeometry(r, r, len, seg, 1, false);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()));
  g.translate((A.x + B.x) / 2, (A.y + B.y) / 2, (A.z + B.z) / 2);
  return g;
}
function xCyl(r, len, seg = 12) { const g = cyl(r, len, seg); g.rotateZ(Math.PI / 2); return g; }
function zCyl(r, len, seg = 12) { const g = cyl(r, len, seg); g.rotateX(Math.PI / 2); return g; }
function strip(geos) { return mergeGeometries(geos.map(g => g.index ? g.toNonIndexed() : g)); }
const _c = { a: null };
function setEm(m, ...pairs) {
  m.emissive.setRGB(0, 0, 0);
  for (let i = 0; i < pairs.length; i += 2) if (pairs[i + 1] > 0.001) { _c.a.setHex(pairs[i]).multiplyScalar(pairs[i + 1]); m.emissive.add(_c.a); }
}
function lattice(H0, HT, b0, b1, lv, rc = 0.35, rh = 0.18, rd = 0.13) {
  const geos = [];
  const P = (sx, sz, k) => { const u = k / lv, b = lerp(b0, b1, u); return [sx * b, H0 + HT * u, sz * b]; };
  const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
  for (const [sx, sz] of corners) geos.push(cylBetween(P(sx, sz, 0), P(sx, sz, lv), rc, 5));
  for (let k = 0; k <= lv; k++) for (let c = 0; c < 4; c++) {
    const [ax, az] = corners[c], [bx, bz] = corners[(c + 1) % 4];
    geos.push(cylBetween(P(ax, az, k), P(bx, bz, k), rh, 4));
    if (k < lv) geos.push(cylBetween(P(ax, az, k), P(bx, bz, k + 1), rd, 4));
  }
  return strip(geos);
}
// pipe run through a list of points (cylinders + elbow balls)
function pipeRun(pts, r, seg = 8) {
  const g = [];
  for (let i = 0; i < pts.length - 1; i++) g.push(cylBetween(pts[i], pts[i + 1], r, seg));
  for (let i = 1; i < pts.length - 1; i++) g.push(new THREE.SphereGeometry(r * 1.12, seg, 4).translate(...pts[i]));
  return strip(g);
}
// arc-length polyline sampler
class Poly {
  constructor(pts) {
    this.p = pts.map(a => new THREE.Vector3(...a)); this.c = [0];
    for (let i = 1; i < this.p.length; i++) this.c.push(this.c[i - 1] + this.p[i].distanceTo(this.p[i - 1]));
    this.L = this.c[this.c.length - 1];
  }
  at(s, out, tan) {
    s = clamp(s, 0, this.L);
    let i = 0; while (i < this.c.length - 2 && s > this.c[i + 1]) i++;
    const u = (s - this.c[i]) / Math.max(1e-6, this.c[i + 1] - this.c[i]);
    out.lerpVectors(this.p[i], this.p[i + 1], u);
    if (tan) tan.subVectors(this.p[i + 1], this.p[i]).normalize();
    return out;
  }
}

// ---- textures (incl. namman.story easter eggs)
function fitFont(x, text, weight, max, maxW) {
  let sz = max; x.font = `${weight} ${sz}px Kanit, sans-serif`;
  while (x.measureText(text).width > maxW && sz > 10) { sz -= 2; x.font = `${weight} ${sz}px Kanit, sans-serif`; }
  return sz;
}
function canvasTex(c) {
  const tx = new THREE.CanvasTexture(c);
  tx.colorSpace = THREE.SRGBColorSpace; tx.anisotropy = renderer.capabilities.getMaxAnisotropy(); tx.needsUpdate = true;
  return tx;
}
function grime(x, w, h, n, k, a = 0.25) {
  for (let i = 0; i < n; i++) {
    x.globalAlpha = 0.08 + hash(i, k) * a; x.fillStyle = hash(i, k + 1) < 0.5 ? '#2a1a0a' : '#ffffff';
    x.beginPath(); x.arc(hash(i, k + 2) * w, hash(i, k + 3) * h, 1 + hash(i, k + 4) * 3.5, 0, 7); x.fill();
  }
  x.globalAlpha = 1;
}
// stencil on the mud tank side (easter egg #1)
function tankStencilTex() {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 256;
  const x = c.getContext('2d');
  x.fillStyle = '#4f6075'; x.fillRect(0, 0, 1024, 256);
  const gr = x.createLinearGradient(0, 0, 0, 256);
  gr.addColorStop(0, 'rgba(255,255,255,0.10)'); gr.addColorStop(1, 'rgba(40,20,0,0.25)');
  x.fillStyle = gr; x.fillRect(0, 0, 1024, 256);
  x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = '#f4f1e6';
  fitFont(x, 'namman.story', 600, 150, 900); x.fillText('namman.story', 512, 100);
  x.fillStyle = '#4f6075'; x.fillRect(30, 96, 964, 6); // stencil bridges
  x.fillStyle = '#ffd23f'; fitFont(x, 'MUD TANK 2 · 400 BBL', 600, 50, 760); x.fillText('MUD TANK 2 · 400 BBL', 512, 205);
  grime(x, 1024, 256, 500, 401, 0.3);
  x.globalAlpha = 0.35; x.fillStyle = '#6b4423';
  for (let i = 0; i < 16; i++) x.fillRect(hash(i, 410) * 1010, 0, 6 + hash(i, 411) * 10, 30 + hash(i, 412) * 120); // mud splashes / drips
  return canvasTex(c);
}
// big front label on a standing barite sack (easter egg #2)
function sackLabelTex() {
  const c = document.createElement('canvas'); c.width = 512; c.height = 768;
  const x = c.getContext('2d');
  x.fillStyle = '#f3f4f1'; x.fillRect(0, 0, 512, 768);
  x.globalAlpha = 0.08; x.fillStyle = '#000';
  for (let i = 0; i < 64; i++) { x.fillRect(0, i * 12, 512, 2); x.fillRect(i * 12, 0, 2, 768); } // woven bag
  x.globalAlpha = 1;
  x.fillStyle = '#d62828'; x.fillRect(0, 70, 512, 150);
  x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = '#ffffff';
  fitFont(x, 'BARITE', 600, 120, 460); x.fillText('BARITE', 256, 148);
  x.fillStyle = '#1f2937'; fitFont(x, 'เพิ่ม Mud Weight', 600, 40, 440); x.fillText('เพิ่ม Mud Weight', 256, 270);
  x.fillStyle = '#d62828'; x.fillRect(60, 320, 392, 6);
  x.fillStyle = '#111827'; fitFont(x, 'namman.story', 600, 84, 440); x.fillText('namman.story', 256, 410);
  x.fillStyle = '#374151'; fitFont(x, 'DRILLING GRADE · API 13A', 600, 32, 430); x.fillText('DRILLING GRADE · API 13A', 256, 490);
  x.fillStyle = '#111827'; fitFont(x, '50 KG', 600, 96, 400); x.fillText('50 KG', 256, 600);
  x.fillStyle = '#d62828'; x.fillRect(0, 690, 512, 40);
  grime(x, 512, 768, 260, 421, 0.18);
  return canvasTex(c);
}
function sackTex(kind) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 96;
  const x = c.getContext('2d');
  const bar = kind === 'B';
  x.fillStyle = bar ? '#eef0ec' : '#c9a46b'; x.fillRect(0, 0, 256, 96);
  x.fillStyle = bar ? '#d62828' : '#2f6b2f'; x.fillRect(0, 0, 256, 18); x.fillRect(0, 78, 256, 18);
  x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = bar ? '#b91c1c' : '#1f4d1f';
  const s = bar ? 'BARITE' : 'BENTONITE';
  fitFont(x, s, 600, 46, 236); x.fillText(s, 128, 50);
  grime(x, 256, 96, 60, bar ? 431 : 441, 0.2);
  return canvasTex(c);
}
function swirlTex() {
  const c = document.createElement('canvas'); c.width = 512; c.height = 512;
  const x = c.getContext('2d');
  x.fillStyle = '#8a5a30'; x.fillRect(0, 0, 512, 512);
  x.translate(256, 256);
  for (let k = 0; k < 7; k++) {
    x.beginPath();
    for (let a = 0; a < 12; a += 0.05) { const r = 8 + a * 22; x.lineTo(Math.cos(a + k * 0.9) * r, Math.sin(a + k * 0.9) * r); }
    x.strokeStyle = k % 2 ? 'rgba(196,140,84,0.55)' : 'rgba(80,46,20,0.45)'; x.lineWidth = 10 + (k % 3) * 6; x.stroke();
  }
  for (let i = 0; i < 160; i++) {
    const a = hash(i, 451) * 7, r = 20 + hash(i, 452) * 240;
    x.globalAlpha = 0.25 + hash(i, 453) * 0.4; x.fillStyle = '#e8c79a';
    x.beginPath(); x.arc(Math.cos(a) * r, Math.sin(a) * r, 2 + hash(i, 454) * 5, 0, 7); x.fill();
  }
  const t = canvasTex(c); t.center.set(0.5, 0.5); return t;
}
function screenTex() {
  const c = document.createElement('canvas'); c.width = 256; c.height = 256;
  const x = c.getContext('2d');
  x.fillStyle = '#3b4250'; x.fillRect(0, 0, 256, 256);
  x.strokeStyle = '#a7b0bf'; x.lineWidth = 2;
  for (let i = 0; i <= 256; i += 8) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, 256); x.stroke(); x.beginPath(); x.moveTo(0, i); x.lineTo(256, i); x.stroke(); }
  x.fillStyle = 'rgba(140,90,48,0.55)'; x.fillRect(0, 0, 256, 120); // mud pool at the feed end
  const t = canvasTex(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3, 3); return t;
}

// ---------------- human figure (~1.8 m)
function buildHuman(suit = 0xf97316, hat = 0xffffff) {
  const g = new THREE.Group();
  const suitG = [box(0.17, 0.86, 0.2).translate(-0.1, 0.43, 0), box(0.17, 0.86, 0.2).translate(0.1, 0.43, 0),
    box(0.44, 0.62, 0.26).translate(0, 1.17, 0), box(0.12, 0.6, 0.14).translate(-0.29, 1.14, 0), box(0.12, 0.6, 0.14).translate(0.29, 1.14, 0)];
  const skinG = [new THREE.IcosahedronGeometry(0.13, 1).translate(0, 1.6, 0)];
  const hatG = [new THREE.SphereGeometry(0.15, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2).translate(0, 1.65, 0), cyl(0.19, 0.03, 10).translate(0, 1.66, 0)];
  add(g, strip(suitG), lam(suit)); add(g, strip(skinG), lam(0xd9a273)); add(g, strip(hatG), lam(hat));
  add(g, box(0.45, 0.06, 0.27), lam(0xf8fafc, { emissive: 0x555555 }), 0, 1.0, 0);
  return g;
}

// ---------------- sky dome
function makeSky(cTop, cMid, cHor, cLow) {
  const sky = new THREE.SphereGeometry(2500, 32, 16);
  const sc = [], sp = sky.attributes.position;
  const T = new THREE.Color(cTop), M = new THREE.Color(cMid), Hh = new THREE.Color(cHor), Lw = new THREE.Color(cLow);
  for (let i = 0; i < sp.count; i++) {
    const y = sp.getY(i) / 2500; const c = new THREE.Color();
    if (y < 0) c.copy(Hh).lerp(Lw, clamp(-y * 6));
    else if (y < 0.18) c.copy(Hh).lerp(M, y / 0.18);
    else c.copy(M).lerp(T, clamp((y - 0.18) / 0.5));
    sc.push(c.r, c.g, c.b);
  }
  sky.setAttribute('color', new THREE.Float32BufferAttribute(sc, 3));
  const m = new THREE.Mesh(sky, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false }));
  m.renderOrder = -10; return m;
}

// ---------------------------------------------------------------- state
const O = {};

// ---------------------------------------------------------------- LAND set (rig + mud system)
// layout: rig at origin (floor y 7.2), mud tanks A/B/C along +x (z -7..-1), triplex pump at z 7.2
const TANKS = [{ x0: 9.5, x1: 15.0 }, { x0: 15.5, x1: 21.0 }, { x0: 21.5, x1: 27.0 }];
const TZ0 = -7, TZ1 = -1, TH = 3.0, MUDY = 2.55;
const HOSE_CTRL = [[4.7, 23.5, 1.5], [4.6, 24.15, 1.5], [4.25, 23.7, 1.45], [3.5, 19.2, 1.25], [2.6, 17.2, 0.95],
  [1.5, 18.4, 0.6], [0.75, 21.4, 0.25], [0.45, 22.45, 0.1], [0.0, 22.35, 0.0]];
function hosePts() {
  const cv = new THREE.CatmullRomCurve3(HOSE_CTRL.map(p => new THREE.Vector3(...p)));
  return cv.getPoints(26).map(v => [v.x, v.y, v.z]);
}
const DN_PRE = [[24.0, 2.8, -4.2], [24.0, 2.8, -1.8], [24.0, 0.7, -1.4], [24.0, 0.7, 4.4], [21.25, 0.7, 4.4], [21.25, 0.62, 7.2],
  [21.6, 1.4, 7.2], [21.0, 1.85, 7.2], [20.3, 1.85, 7.2], [20.3, 0.45, 7.2], [8.0, 0.45, 7.2], [8.0, 0.45, 1.5], [8.0, 7.75, 1.5],
  [4.7, 7.75, 1.5]];
const RET_PTS = [[0, 4.8, 0], [0, 6.0, 0], [0.4, 6.0, -0.4], [10.75, 5.15, -4.9], [11.4, 5.1, -4.9], [12.25, 4.95, -4.1],
  [12.25, 4.45, -1.6], [12.25, 2.8, -2.4], [14.2, 2.8, -3.6], [15.25, 3.3, -3.8], [16.5, 2.8, -3.8], [20.0, 2.8, -3.2],
  [21.25, 3.3, -3.4], [22.4, 2.8, -3.8], [24.0, 2.8, -4.2]];

function buildSurfaceBOP(G) {
  const g = new THREE.Group(); g.position.set(0, -2.4, 0); G.add(g);
  const body = lam(0xcbd5e1), conn = lam(0x8b5cf6), pipe = lam(0x3b82f6), shear = lam(0xef4444), ann = lam(0xf59e0b), nip = lam(0x9ca3af);
  add(g, cyl(0.5, 0.5, 12), lam(0x94a3b8), 0, 0.25, 0);
  add(g, cyl(0.68, 0.16, 14), conn, 0, 0.58, 0);
  add(g, cyl(0.42, 0.62, 12), body, 0, 0.97, 0);
  add(g, box(1.25, 0.66, 0.95), body, 0, 1.73, 0);
  add(g, box(1.25, 1.36, 0.95), body, 0, 2.86, 0);
  for (const [yc, m] of [[1.73, pipe], [2.52, pipe], [3.2, shear]]) for (const s of [1, -1]) add(g, xCyl(0.29, 0.72, 12), m, s * 0.98, yc, 0);
  const prof = [[0.35, 3.64], [0.78, 3.64], [0.86, 3.86], [0.84, 4.42], [0.7, 4.68], [0.46, 4.8], [0.33, 4.82]].map(([r, y]) => new THREE.Vector2(r, y));
  add(g, new THREE.LatheGeometry(prof, 14), ann);
  add(g, cyl(0.36, 0.5, 12), nip, 0, 5.05, 0);
  add(g, cyl(0.3, 3.7, 10), nip, 0, 7.1, 0); // riser / bell nipple up to the flowline
  add(g, cyl(0.42, 0.5, 10), nip, 0, 8.4, 0);
}

function buildLand(G) {
  O.skyL = makeSky(0x1f2a63, 0x9a4f86, 0xffab6b, 0x7a5a44); G.add(O.skyL);
  const sunDir = new THREE.Vector3(-0.62, 0.05, -0.78).normalize();
  O.sunL = add(G, new THREE.CircleGeometry(60, 28), basic(0xfff1c9, { fog: false }), ...sunDir.clone().multiplyScalar(2300).toArray());
  O.sunL.lookAt(0, 0, 0);
  const sg2 = add(G, new THREE.CircleGeometry(240, 28), basic(0xffb27a, { fog: false, transparent: true, opacity: 0.35, depthWrite: false }), ...sunDir.clone().multiplyScalar(2320).toArray());
  sg2.lookAt(0, 0, 0);
  // drill pad with cellar opening
  const pad = new THREE.Shape(); pad.moveTo(-45, -45); pad.lineTo(45, -45); pad.lineTo(45, 45); pad.lineTo(-45, 45); pad.closePath();
  const hole = new THREE.Path(); hole.moveTo(-2.5, -2.5); hole.lineTo(-2.5, 2.5); hole.lineTo(2.5, 2.5); hole.lineTo(2.5, -2.5); hole.closePath();
  pad.holes.push(hole);
  const pg = new THREE.ExtrudeGeometry(pad, { depth: 0.6, bevelEnabled: false }); pg.rotateX(-Math.PI / 2); pg.translate(0, -0.6, 0);
  add(G, pg, lam(0xcdb48a));
  // desert terrain
  const tg = new THREE.PlaneGeometry(2400, 2400, 56, 56); tg.rotateX(-Math.PI / 2);
  const tp = tg.attributes.position;
  for (let i = 0; i < tp.count; i++) {
    const x = tp.getX(i), z = tp.getZ(i), r = Math.hypot(x, z);
    const n = Math.sin(x * 0.012) * Math.cos(z * 0.01) * 9 + Math.sin(x * 0.031 + z * 0.023) * 3.5 + (hash(i, 3) - 0.5) * 1.5;
    tp.setY(i, -0.35 + n * sstep(80, 260, r));
  }
  add(G, tg, lam(0xe0b47e));
  const mesa = [];
  for (let i = 0; i < 16; i++) {
    const a = hash(i, 11) * Math.PI * 2, r = 600 + hash(i, 12) * 600, s = 40 + hash(i, 13) * 70;
    const q = new THREE.CylinderGeometry(s * 0.7, s, s * (0.5 + hash(i, 14) * 0.5), 6); q.rotateY(hash(i, 15) * 3);
    mesa.push(q.translate(Math.cos(a) * r, s * 0.2, Math.sin(a) * r));
  }
  add(G, strip(mesa), lam(0xb9774c));
  const scrub = [], rocks = [];
  for (let i = 0; i < 70; i++) {
    const a = hash(i, 21) * Math.PI * 2, r = 55 + hash(i, 22) * 220;
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (hash(i, 23) < 0.6) scrub.push(new THREE.IcosahedronGeometry(0.8 + hash(i, 24) * 1.2, 0).scale(1, 0.6, 1).translate(x, 0.2, z));
    else rocks.push(new THREE.DodecahedronGeometry(0.8 + hash(i, 25) * 2.2, 0).scale(1, 0.6, 1.1).translate(x, 0, z));
  }
  add(G, strip(scrub), lam(0x7d8f52)); add(G, strip(rocks), lam(0xa57e5c));
  // cellar
  const conc = lam(0x9ca3af);
  add(G, box(5, 0.2, 5), lam(0x7b8794), 0, -2.5, 0);
  add(G, strip([box(5, 2.4, 0.3).translate(0, -1.2, -2.35), box(5, 2.4, 0.3).translate(0, -1.2, 2.35),
    box(0.3, 2.4, 5).translate(-2.35, -1.2, 0), box(0.3, 2.4, 5).translate(2.35, -1.2, 0)]), conc);
  buildSurfaceBOP(G);
  // substructure
  const sgm = [];
  for (const sx of [-1, 1]) {
    const xs = [sx * 3.4, sx * 6.6];
    for (const x of xs) for (const z of [-7, 0, 7]) sgm.push(cylBetween([x, 0, z], [x, 6.5, z], 0.22, 5));
    for (const x of xs) for (const y of [0.15, 6.4]) sgm.push(cylBetween([x, y, -7], [x, y, 7], 0.18, 4));
    for (const x of xs) for (const [z0, z1] of [[-7, 0], [0, 7]]) { sgm.push(cylBetween([x, 0.2, z0], [x, 6.4, z1], 0.13, 4)); sgm.push(cylBetween([x, 6.4, z0], [x, 0.2, z1], 0.13, 4)); }
    for (const z of [-7, 7]) for (const y of [0.15, 6.4]) sgm.push(cylBetween([xs[0], y, z], [xs[1], y, z], 0.16, 4));
  }
  add(G, strip(sgm), lam(0x3f4d63));
  add(G, box(15, 0.6, 15.4), lam(0x52627a), 0, 6.8, 0);
  add(G, box(15.2, 0.25, 15.6), lam(0xfbbf24), 0, 7.2, 0);
  add(G, cyl(1.1, 0.4, 12), lam(0x334155), 0, 7.4, 0);
  add(G, lattice(7.2, 34, 4.3, 1.3, 6, 0.32, 0.17, 0.12), lam(0xeef2f6));
  add(G, box(3.4, 2.0, 3.4), lam(0xe11d48), 0, 42.2, 0);
  add(G, box(0.9, 0.9, 0.9), basic(0xfff1c2), 0, 43.6, 0);
  // rig lights (dusk)
  const lg = [];
  for (const [y, s] of [[14, 3.6], [24, 2.8], [34, 1.95]]) for (const [sx, sz] of [[1, 1], [-1, 1], [1, -1]]) lg.push(box(0.45, 0.3, 0.3).translate(sx * s, y, sz * s));
  add(G, strip(lg), basic(0xfff3c4));
  // doghouse + V-door + pipe racks
  add(G, box(4, 3, 5), lam(0x7aa6d6), -5.4, 8.7, 5);
  add(G, box(4.1, 0.9, 5.1), basic(0xffe9b0), -5.4, 9.2, 5);
  add(G, box(5, 2.4, 3), lam(0x2563eb), -1.5, 8.4, -6);
  add(G, cylBetween([0, 7.0, -7.7], [0, 1.2, -21], 0.9, 4), lam(0x6b7280));
  add(G, box(1.8, 1.2, 14), lam(0x6b7280), 0, 0.6, -28);
  const pr = [];
  for (const s of [-1, 1]) for (let i = 0; i < 9; i++) pr.push(zCyl(0.18, 13, 6).translate(s * (2.6 + (i % 3) * 0.42), 0.9 + Math.floor(i / 3) * 0.38, -28));
  add(G, strip(pr), lam(0x8b96a5));
  // generators + fuel
  const gc = [0xe2b33c, 0x4d7c0f, 0xe2b33c];
  for (let i = 0; i < 3; i++) add(G, box(3, 2.8, 7), lam(gc[i]), -17 - i * 3.6, 1.4, -8);
  add(G, xCyl(1.4, 9, 10), lam(0xf1f5f9), -16, 1.4, -19);
  // ---- top drive, traveling block, drill pipe stand
  const TD = O.topDrive = new THREE.Group(); TD.position.set(0, 20.6, 0); G.add(TD);
  add(TD, box(1.4, 2.3, 1.2), lam(0xdc2626), 0, 0, 0);
  add(TD, cyl(0.5, 0.9, 10), lam(0x7f1d1d), 0, 1.55, 0);
  add(TD, box(0.4, 2.6, 0.3), lam(0x374151), 0, 0.2, -0.75);
  add(TD, cylBetween([0, 1.2, 0], [0, 1.85, 0], 0.16, 8), lam(0x94a3b8));
  add(G, box(0.35, 26, 0.35), lam(0x4b5563), 0, 22, -1.25); // guide rail
  add(G, box(1.6, 1.8, 1.0), lam(0xfacc15), 0, 25.2, 0);   // traveling block
  add(G, strip([[-0.5, -0.5], [0.5, -0.5], [-0.5, 0.5], [0.5, 0.5]].map(([x, z]) => cylBetween([x * 0.8, 26, z * 0.6], [x * 0.8, 41, z * 0.6], 0.04, 3))), lam(0x1f2937));
  add(G, cylBetween([0, 22.6, 0], [0, 24.3, 0], 0.12, 6), lam(0x374151));
  const dp = [cylBetween([0, 7.4, 0], [0, 19.4, 0], 0.17, 8)];
  for (const y of [8.4, 18.8]) dp.push(cyl(0.24, 0.5, 8).translate(0, y, 0));
  add(G, strip(dp), lam(0x8792a2));
  // ---- mud system + well-control equipment
  buildMudSystem(G);
  buildWellControl(G);
  // workers
  const w3 = buildHuman(); w3.position.set(2.4, 7.35, 3.2); w3.rotation.y = 0.5; G.add(w3);
  const w4 = buildHuman(0x16a34a); w4.position.set(-8.5, 0, 9.5); w4.rotation.y = -2.4; G.add(w4);
}

function buildMudSystem(G) {
  const tankM = lam(0x56677d), rimM = lam(0xfbbf24), skidM = lam(0x334155), pipeM = lam(0x8f9aab), darkM = lam(0x1f2937);
  // swirling mud surface (shared texture, rotated per frame)
  O.swirl = swirlTex();
  O.mudSurfM = new THREE.MeshPhongMaterial({ color: 0xffffff, map: O.swirl, flatShading: true, shininess: 30, specular: 0x5a3a1a });
  O.mudSurf = [];
  TANKS.forEach((T, k) => {
    const w = T.x1 - T.x0, d = TZ1 - TZ0, xc = (T.x0 + T.x1) / 2, zc = (TZ0 + TZ1) / 2;
    add(G, strip([box(w + 0.2, 0.3, d + 0.2).translate(xc, 0.15, zc)]), skidM);
    add(G, strip([box(w, TH, 0.15).translate(xc, TH / 2, TZ1 - 0.075), box(w, TH, 0.15).translate(xc, TH / 2, TZ0 + 0.075),
      box(0.15, TH, d).translate(T.x0 + 0.075, TH / 2, zc), box(0.15, TH, d).translate(T.x1 - 0.075, TH / 2, zc)]), tankM);
    add(G, strip([box(w + 0.1, 0.12, 0.25).translate(xc, TH, TZ1 - 0.1), box(w + 0.1, 0.12, 0.25).translate(xc, TH, TZ0 + 0.1),
      box(0.25, 0.12, d).translate(T.x0 + 0.1, TH, zc), box(0.25, 0.12, d).translate(T.x1 - 0.1, TH, zc)]), rimM);
    // handrail on the back
    const hr = [cylBetween([T.x0, TH + 1.0, TZ0 + 0.1], [T.x1, TH + 1.0, TZ0 + 0.1], 0.04, 4)];
    for (let x = T.x0 + 0.2; x < T.x1; x += 1.3) hr.push(cylBetween([x, TH, TZ0 + 0.1], [x, TH + 1.0, TZ0 + 0.1], 0.04, 4));
    add(G, strip(hr), rimM);
    // stiffeners on the front face
    const st = [];
    for (let x = T.x0 + 0.5; x < T.x1 - 0.2; x += 1.15) if (k !== 1 || Math.abs(x - xc) > 2.3) st.push(box(0.14, TH - 0.3, 0.1).translate(x, TH / 2, TZ1 + 0.03));
    if (st.length) add(G, strip(st), lam(0x4a5a6f));
    const sg = new THREE.PlaneGeometry(w - 0.3, d - 0.3, 12, 10); sg.rotateX(-Math.PI / 2);
    const m = add(G, sg, O.mudSurfM, xc, MUDY, zc);
    m.userData.base = Float32Array.from(sg.attributes.position.array); m.userData.k = k;
    O.mudSurf.push(m);
  });
  // easter egg #1: stencil on tank 2 (B) front
  const tB = TANKS[1];
  O.stencil = add(G, new THREE.PlaneGeometry(4.4, 1.1), new THREE.MeshLambertMaterial({ map: tankStencilTex(), emissive: 0x222222 }), (tB.x0 + tB.x1) / 2, 1.55, TZ1 + 0.01);
  // agitators on B and C
  O.agit = [];
  for (const k of [1, 2]) {
    const T = TANKS[k], xc = (T.x0 + T.x1) / 2, zc = (TZ0 + TZ1) / 2;
    add(G, box(0.45, 0.35, 6.3), lam(0xfbbf24), xc, TH + 0.2, zc);
    add(G, box(0.95, 0.7, 0.95), lam(0x2563eb), xc, TH + 0.72, zc);
    add(G, xCyl(0.32, 1.0, 10), lam(0x1e40af), xc + 0.95, TH + 0.78, zc);
    add(G, cyl(0.08, TH, 6), pipeM, xc, 1.6, zc);
    const cp = new THREE.Group(); cp.position.set(xc, TH + 0.1, zc); G.add(cp);
    add(cp, cyl(0.3, 0.12, 10), lam(0xe5e7eb));
    add(cp, box(0.62, 0.14, 0.1), lam(0xef4444), 0, 0.01, 0);
    O.agit.push(cp);
  }
  // ---- shale shaker on tank A
  const SH = O.shaker = new THREE.Group(); G.add(SH);
  const shM = lam(0x0f9488), shD = lam(0x115e59);
  add(SH, strip([box(0.2, 1.0, 0.2).translate(10.95, 3.5, -4.4), box(0.2, 1.0, 0.2).translate(13.55, 3.5, -4.4),
    box(0.2, 0.7, 0.2).translate(10.95, 3.35, -1.2), box(0.2, 0.7, 0.2).translate(13.55, 3.35, -1.2)]), shD);
  add(SH, box(3.0, 1.0, 0.9), shD, 12.25, 5.0, -5.0);  // header box / possum belly
  const BK = O.basket = new THREE.Group(); BK.position.set(12.25, 4.55, -2.65); BK.rotation.x = 0.187; SH.add(BK);
  const scr = new THREE.PlaneGeometry(2.8, 3.8); scr.rotateX(-Math.PI / 2);
  add(BK, scr, new THREE.MeshLambertMaterial({ map: screenTex(), side: THREE.DoubleSide }), 0, 0.02, 0);
  add(BK, strip([box(0.14, 0.7, 3.9).translate(-1.47, 0.3, 0), box(0.14, 0.7, 3.9).translate(1.47, 0.3, 0), box(3.08, 0.8, 0.14).translate(0, 0.35, -1.95),
    box(3.08, 0.16, 3.9).translate(0, -0.12, 0)]), shM);
  add(BK, strip([box(0.14, 1.2, 0.14).translate(-1.47, 0.9, -0.3), box(0.14, 1.2, 0.14).translate(1.47, 0.9, -0.3), box(3.3, 0.22, 0.32).translate(0, 1.45, -0.3)]), shM);
  add(BK, strip([xCyl(0.26, 0.7, 10).translate(-0.85, 1.75, -0.3), xCyl(0.26, 0.7, 10).translate(0.85, 1.75, -0.3)]), lam(0x334155));
  // skip (cuttings box) in front of tank A
  add(G, strip([box(3.0, 0.15, 1.8).translate(12.25, 0.08, 0.9), box(3.0, 1.3, 0.12).translate(12.25, 0.65, 0.06), box(3.0, 1.3, 0.12).translate(12.25, 0.65, 1.74),
    box(0.12, 1.3, 1.8).translate(10.81, 0.65, 0.9), box(0.12, 1.3, 1.8).translate(13.69, 0.65, 0.9)]), lam(0xf97316));
  const pile = [new THREE.ConeGeometry(0.95, 0.55, 7).translate(12.4, 1.1, 0.85)];
  for (let i = 0; i < 12; i++) pile.push(new THREE.DodecahedronGeometry(0.12 + hash(i, 61) * 0.1, 0).translate(11.6 + hash(i, 62) * 1.5, 1.05 + hash(i, 63) * 0.2, 0.4 + hash(i, 64) * 0.9));
  add(G, strip(pile), lam(0x6b5a48));
  // flowline from bell nipple to shaker header
  add(G, pipeRun([[0.0, 6.0, 0.0], [0.4, 6.0, -0.4], [10.75, 5.15, -4.9]], 0.24, 10), lam(0x9ca3af));
  // ---- triplex mud pump (world coords, axis along x, fluid end at -x)
  const pumpB = lam(0x1d4ed8), steel = lam(0xa3acb9), yel = lam(0xfacc15);
  add(G, box(7.8, 0.35, 2.8), skidM, 24.0, 0.175, 7.2);
  add(G, box(2.8, 2.0, 2.2), pumpB, 26.3, 1.35, 7.2);
  add(G, zCyl(1.05, 2.2, 14), pumpB, 26.3, 2.35, 7.2);
  add(G, box(1.7, 1.2, 1.5), lam(0x6b7280), 26.6, 3.75, 7.2);
  O.wheel = new THREE.Group(); O.wheel.position.set(26.3, 1.7, 8.45); G.add(O.wheel);
  add(O.wheel, zCyl(1.25, 0.22, 16), lam(0x374151));
  add(O.wheel, strip([box(2.3, 0.18, 0.06).translate(0, 0, 0.13), box(0.18, 2.3, 0.06).translate(0, 0, 0.13)]), yel);
  add(G, strip([box(2.0, 0.16, 2.0).translate(23.65, 2.2, 7.2), box(2.0, 0.3, 2.0).translate(23.65, 0.5, 7.2)]), pumpB);
  add(G, strip([box(0.16, 1.7, 0.16).translate(22.75, 1.35, 6.25), box(0.16, 1.7, 0.16).translate(22.75, 1.35, 8.15),
    box(0.16, 1.7, 0.16).translate(24.55, 1.35, 6.25), box(0.16, 1.7, 0.16).translate(24.55, 1.35, 8.15)]), pumpB);
  O.rods = [];
  for (let k = 0; k < 3; k++) {
    const z = 6.55 + 0.65 * k;
    add(G, xCyl(0.24, 0.55, 10), lam(0xe5e7eb), 22.95, 1.35, z); // liner
    const r = new THREE.Group(); r.position.set(0, 1.35, z); G.add(r);
    add(r, xCyl(0.12, 1.6, 8), lam(0xf1f5f9, { emissive: 0x222222 }), 23.75, 0, 0);
    add(r, box(0.26, 0.34, 0.34), yel, 24.0, 0, 0);
    add(r, xCyl(0.27, 0.45, 10), steel, 24.55, 0, 0);
    O.rods.push(r);
  }
  add(G, box(1.4, 1.8, 2.3), steel, 22.1, 1.3, 7.2);  // fluid end
  for (let k = 0; k < 3; k++) add(G, cyl(0.22, 0.22, 10), lam(0x64748b), 22.1, 2.3, 6.55 + 0.65 * k);
  add(G, new THREE.IcosahedronGeometry(0.45, 1), lam(0xdc2626), 21.5, 2.75, 7.2); // pulsation dampener
  add(G, cylBetween([21.5, 2.2, 7.2], [21.5, 2.45, 7.2], 0.12, 6), steel);
  // suction & discharge lines
  add(G, pipeRun([[24.0, 0.7, -1.0], [24.0, 0.7, 4.4], [21.25, 0.7, 4.4], [21.25, 0.62, 6.1]], 0.26, 10), lam(0x6b7280));
  add(G, xCyl(0.26, 0.3, 10), lam(0x6b7280), 21.25, 0.62, 6.3);
  add(G, pipeRun([[21.4, 1.85, 7.2], [20.3, 1.85, 7.2], [20.3, 0.45, 7.2], [8.0, 0.45, 7.2], [8.0, 0.45, 1.5], [8.0, 7.75, 1.5], [4.7, 7.75, 1.5], [4.7, 23.5, 1.5]], 0.17, 8), pipeM);
  add(G, strip([box(0.5, 0.15, 0.15).translate(4.45, 12, 1.5), box(0.5, 0.15, 0.15).translate(4.4, 17, 1.5), box(0.8, 0.15, 0.15).translate(4.3, 22, 1.5)]), darkM);
  add(G, zCyl(0.16, 0.08, 12), basic(0xf8fafc), 20.3, 1.85, 7.42); // pressure gauge face
  // rotary (kelly) hose to the top drive
  O.hose = hosePts();
  add(G, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(O.hose.map(p => new THREE.Vector3(...p))), 40, 0.16, 6), lam(0x111827));
  // circulation paths (for glowing flow arrows)
  O.pathDN = new Poly([...DN_PRE, ...O.hose, [0, 20.6, 0], [0, 7.4, 0], [0, -1.0, 0]]);
  O.sDN = { pump: new Poly(DN_PRE.slice(0, 7)).L, stand: new Poly(DN_PRE).L, td: new Poly([...DN_PRE, ...O.hose]).L };
  O.pathRET = new Poly(RET_PTS);
  O.sRET = { shaker: new Poly(RET_PTS.slice(0, 6)).L, tankA: new Poly(RET_PTS.slice(0, 9)).L };
  O.arrows = new THREE.InstancedMesh(new THREE.ConeGeometry(0.24, 0.66, 6), basic(0xffd166), 420);
  O.arrows.frustumCulled = false; G.add(O.arrows);
  // ---- sacks: bentonite + barite pallets, standing barite sack, hopper
  const mats = { B: lam(0xffffff, { map: sackTex('B') }), N: lam(0xffffff, { map: sackTex('N') }) };
  for (const [px, kind] of [[14.6, 'N'], [16.1, 'B']]) {
    add(G, box(1.3, 0.15, 1.1), lam(0xa16207), px, 0.08, 3.0);
    for (let l = 0; l < 4; l++) for (let j = 0; j < 2; j++) {
      const s = add(G, box(0.6, 0.22, 1.0), mats[kind], px - 0.31 + j * 0.62, 0.27 + l * 0.23, 3.0);
      s.rotation.y = (hash(l * 2 + j, kind === 'B' ? 71 : 72) - 0.5) * 0.12;
    }
  }
  const sk = new THREE.Group(); sk.position.set(16.75, 0, 3.85); sk.rotation.y = -0.12; G.add(sk);
  add(sk, box(0.62, 0.95, 0.3), lam(0xf3f4f1), 0, 0.48, 0);
  O.sackLabel = add(sk, new THREE.PlaneGeometry(0.58, 0.87), new THREE.MeshLambertMaterial({ map: sackLabelTex(), emissive: 0x1a1a1a }), 0, 0.48, 0.152);
  O.sackGroup = sk;
  // mixing hopper
  add(G, strip([box(0.1, 1.2, 0.1).translate(19.3, 0.6, 2.7), box(0.1, 1.2, 0.1).translate(19.9, 0.6, 2.7), box(0.1, 1.2, 0.1).translate(19.3, 0.6, 3.3), box(0.1, 1.2, 0.1).translate(19.9, 0.6, 3.3)]), darkM);
  add(G, new THREE.ConeGeometry(0.65, 0.8, 10, 1, true).rotateX(Math.PI), lam(0x9ca3af, { side: THREE.DoubleSide }), 19.6, 1.55, 3.0);
  add(G, pipeRun([[19.6, 1.1, 3.0], [19.6, 0.7, 3.0], [19.6, 0.7, -0.9]], 0.12, 8), pipeM);
  // mud engineer for scale
  const me = buildHuman(0xf97316, 0xffffff); me.position.set(17.7, 0, 3.6); me.rotation.y = -0.55; G.add(me); O.engineer = me;
  // shaker particles: cuttings sliding off + mud dripping through the screen
  O.shCut = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1, 0), lam(0x5f4d3c), 110);
  O.shDrip = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), lam(0x9b6a3c), 90);
  for (const m of [O.shCut, O.shDrip]) { m.frustumCulled = false; G.add(m); }
}

// ---------------------------------------------------------------- LAND set: well-control equipment
// choke line (BOP → choke manifold) · choke manifold · Mud Gas Separator (MGS) · flare line + flare pit
const CHK_PTS = [[0, -0.9, 0.47], [0, -0.9, 1.6], [-1.6, -0.9, 1.6], [-1.6, 0.7, 1.6], [-1.6, 0.7, 4.0], [-8.2, 0.7, 4.0],
  [-8.2, 1.6, 4.0], [-8.2, 1.6, 3.0], [-11.6, 1.6, 3.0], [-11.6, 1.6, 4.0], [-12.3, 1.6, 4.0], [-12.3, 3.6, 4.0], [-13.0, 3.6, 4.0]];
const GAS_PTS = [[-14, 7.4, 4], [-14, 8.0, 4], [-15.4, 8.0, 4], [-15.4, 0.7, 4], [-44.2, 0.7, 4]];
const MGSR_PTS = [[-14, 1.5, 5.0], [-14, 1.5, 11], [9, 1.5, 11], [9, 1.5, -1.5], [9, 3.3, -1.5], [10.2, 3.3, -1.5]];
function mgsStencilTex() {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 512;
  const x = c.getContext('2d');
  x.fillStyle = '#d97706'; x.fillRect(0, 0, 1024, 512);
  x.fillStyle = 'rgba(0,0,0,0.12)'; for (let i = 0; i < 8; i++) x.fillRect(0, i * 64, 1024, 3);
  x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillStyle = '#1f2937'; fitFont(x, 'MUD GAS SEPARATOR', 600, 92, 940); x.fillText('MUD GAS SEPARATOR', 512, 120);
  x.fillStyle = '#1f2937'; x.fillRect(80, 196, 864, 8);
  x.fillStyle = '#fff7e6'; fitFont(x, 'namman.story', 600, 170, 900); x.fillText('namman.story', 512, 330);
  x.fillStyle = '#1f2937'; fitFont(x, 'MAX 150 PSI · VENT TO FLARE', 600, 46, 860); x.fillText('MAX 150 PSI · VENT TO FLARE', 512, 452);
  grime(x, 1024, 512, 420, 611, 0.22);
  return canvasTex(c);
}
function valve(G, x, y, z, axis = 'x', col = 0xdc2626) {
  add(G, box(0.55, 0.55, 0.55), lam(0x475569), x, y, z);
  add(G, cylBetween([x, y, z], [x, y + 0.75, z], 0.06, 5), lam(0x94a3b8));
  const w = add(G, new THREE.TorusGeometry(0.28, 0.05, 4, 12), lam(col), x, y + 0.78, z);
  w.rotation.x = Math.PI / 2;
}
function buildWellControl(G) {
  const pipeM = lam(0x9ca3af), red = lam(0xdc2626), skid = lam(0x334155);
  // choke line from the BOP (front outlet, below the rams) through the cellar to the manifold
  add(G, pipeRun(CHK_PTS.slice(0, 6), 0.15, 8), lam(0x8b5cf6));
  // HCR valve on the choke line (inside the cellar)
  add(G, box(0.5, 0.5, 0.5), red, -0.8, -0.9, 1.6);
  add(G, box(0.35, 0.6, 0.35), lam(0x1f2937), -0.8, -0.4, 1.6);
  // choke manifold
  add(G, box(4.6, 0.3, 3.2), skid, -10.0, 0.15, 4.0);
  add(G, pipeRun([[-8.2, 0.7, 4.0], [-8.2, 1.6, 4.0]], 0.17, 8), pipeM);
  add(G, pipeRun([[-8.2, 1.6, 3.0], [-8.2, 1.6, 5.0]], 0.17, 8), pipeM);
  add(G, pipeRun([[-8.2, 1.6, 3.0], [-11.6, 1.6, 3.0], [-11.6, 1.6, 5.0], [-8.2, 1.6, 5.0]], 0.17, 8), pipeM);
  add(G, pipeRun([[-11.6, 1.6, 4.0], [-12.3, 1.6, 4.0], [-12.3, 3.6, 4.0], [-13.0, 3.6, 4.0]], 0.17, 8), pipeM);
  for (const z of [3.0, 5.0]) {
    valve(G, -9.0, 1.6, z);
    // adjustable choke (orange body + actuator)
    add(G, box(0.8, 0.7, 0.7), lam(0xf59e0b), -10.5, 1.6, z);
    add(G, cylBetween([-10.5, 1.95, z], [-10.5, 2.6, z], 0.2, 8), lam(0x1f2937));
  }
  const supp = [];
  for (const x of [-8.2, -11.6]) for (const z of [3.0, 5.0]) supp.push(box(0.12, 1.3, 0.12).translate(x, 0.95, z));
  add(G, strip(supp), skid);
  O.chokeMarker = new THREE.Object3D(); O.chokeMarker.position.set(-10.5, 2.4, 4.0); G.add(O.chokeMarker);
  // Mud Gas Separator: vertical vessel on legs
  add(G, cyl(1.0, 6.0, 16), lam(0xf59e0b), -14, 4.2, 4);
  add(G, new THREE.SphereGeometry(1.0, 16, 6, 0, Math.PI * 2, 0, Math.PI / 2), lam(0xf59e0b), -14, 7.2, 4);
  add(G, new THREE.SphereGeometry(1.0, 16, 6, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), lam(0xd97706), -14, 1.2, 4);
  add(G, strip([[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => cylBetween([-14 + a * 0.75, 0, 4 + b * 0.75], [-14 + a * 0.62, 1.4, 4 + b * 0.62], 0.08, 5))), skid);
  for (const y of [2.2, 6.2]) add(G, cyl(1.05, 0.12, 16), lam(0xb45309), -14, y, 4);
  const lab = mgsStencilTex(); lab.wrapS = THREE.RepeatWrapping;
  O.mgsLabel = add(G, new THREE.CylinderGeometry(1.02, 1.02, 1.7, 20, 1, true, Math.PI / 4 - 0.95, 1.9), new THREE.MeshLambertMaterial({ map: lab, emissive: 0x1a1a1a }), -14, 4.4, 4);
  O.mgsLabelTex = lab;
  // gas vent → flare line → flare pit
  add(G, pipeRun(GAS_PTS, 0.2, 8), lam(0xcbd5e1));
  const sup2 = [];
  for (let x = -18; x > -44; x -= 4) sup2.push(box(0.15, 0.5, 0.6).translate(x, 0.25, 4));
  add(G, strip(sup2), skid);
  // flare pit: low earth berm (U shape, open toward the pipe)
  add(G, strip([box(8, 1.2, 1.2).translate(-49, 0.4, 0.2), box(8, 1.2, 1.2).translate(-49, 0.4, 7.8), box(1.2, 1.2, 8.8).translate(-53.4, 0.4, 4)]), lam(0xb08455));
  add(G, box(7.5, 0.1, 6.6), lam(0x3b2f28), -49, 0.02, 4);
  // flame (additive cones) + glow
  O.flare = new THREE.Group(); O.flare.position.set(-44.6, 0.7, 4); G.add(O.flare);
  O.flameM = [0xff4d00, 0xff9a1f, 0xffe07a].map(c => basic(c, { transparent: true, opacity: 0.0, blending: THREE.AdditiveBlending, depthWrite: false }));
  O.flames = [];
  for (let i = 0; i < 9; i++) {
    const g = new THREE.ConeGeometry(0.9 - (i % 3) * 0.22, 3.4 - (i % 3) * 0.8, 7, 1, true); g.translate(0, (3.4 - (i % 3) * 0.8) / 2, 0);
    const m = add(O.flare, g, O.flameM[i % 3], 0, 0, 0);
    m.userData.k = i; O.flames.push(m);
  }
  O.flareGlow = add(O.flare, new THREE.SphereGeometry(5.5, 12, 8), basic(0xff7a1a, { transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }), -2.0, 2.2, 0);
  // MGS liquid outlet back to tank A
  add(G, pipeRun(MGSR_PTS, 0.16, 8), pipeM);
  // paths for arrows
  O.pathCHK = new Poly(CHK_PTS);
  O.pathGAS = new Poly(GAS_PTS);
  O.pathMGSR = new Poly(MGSR_PTS);
  O.arrowsG = new THREE.InstancedMesh(new THREE.ConeGeometry(0.3, 0.8, 6), basic(0xf8fafc), 160);
  O.arrowsG.frustumCulled = false; G.add(O.arrowsG);
  // worker at the choke
  const ch = buildHuman(0xf97316, 0xffffff); ch.position.set(-10.5, 0, 6.5); ch.rotation.y = 3.0; G.add(ch);
}

// ---------------------------------------------------------------- WELL set (cutaway cross-section)
const RH = 1.6, RC = 2.0, Y_SHOE = -14, YB = -38.4, YBT = YB + 2.0, Y_COL = -28.0, Y_TOP = 8.0;
const RP = 0.5, RPI = 0.38, RCO = 0.8;
const Y_MWD0 = -33.8, Y_MWD1 = -31.2;
const Y_FL = 2.45, Y_CK = 0.65; // flowline (left, above BOP) and choke outlet (right, below rams)
const LAYERS = [
  { y0: 0, y1: -4, c: 0xd9bf8c },
  { y0: -4, y1: -11, c: 0xb98a5a },
  { y0: -11, y1: -18, c: 0x97a08a },
  { y0: -18, y1: -24, c: 0xbdb5a8 },
  { y0: -24, y1: -31, c: 0xe1b98c },
  { y0: -31, y1: -35, c: 0x7c8273 },
  { y0: -35, y1: -42, c: 0xd9733f, gas: true },
  { y0: -42, y1: -90, c: 0x5d6158 },
];

function buildWell(G) {
  const clip = O.clipW = new THREE.Plane(new THREE.Vector3(0, 0, -1), 0);
  const cb = (c, o = {}) => lam(c, { clippingPlanes: [clip], side: THREE.DoubleSide, ...o });
  const Wd = 34, Dd = 24;
  for (const L of LAYERS) {
    const geos = [];
    const top = L.y0, botCh = Math.max(L.y1, YB);
    if (top > YB) {
      const segs = [];
      if (top > Y_SHOE && botCh < Y_SHOE) segs.push([top, Y_SHOE, RC], [Y_SHOE, botCh, RH]);
      else segs.push([top, botCh, top > Y_SHOE ? RC : RH]);
      for (const [a, b, R] of segs) {
        const h = a - b, yc = (a + b) / 2;
        geos.push(box(Wd - R, h, Dd).translate(-(R + Wd) / 2, yc, -Dd / 2));
        geos.push(box(Wd - R, h, Dd).translate((R + Wd) / 2, yc, -Dd / 2));
        geos.push(box(2 * R, h, Dd - R).translate(0, yc, -R - (Dd - R) / 2));
        if (R === RH) add(G, cyl(R, h, 18, true), cb(new THREE.Color(L.c).multiplyScalar(0.62).getHex()), 0, yc, 0);
      }
    }
    if (L.y1 < YB) { const a = Math.min(L.y0, YB), h = a - L.y1; geos.push(box(2 * Wd, h, Dd).translate(0, (a + L.y1) / 2, -Dd / 2)); }
    add(G, strip(geos), lam(L.c));
  }
  const peb = { light: [], dark: [], gas: [] };
  for (let i = 0; i < 300; i++) {
    const x = (hash(i, 21) - 0.5) * 2 * 30, y = 0.2 - hash(i, 22) * 70;
    if (Math.abs(x) < 2.4) continue;
    const L = LAYERS.find(l => y <= l.y0 && y > l.y1);
    const r = 0.2 + hash(i, 23) * 0.5;
    const gq = new THREE.CircleGeometry(r, 5).translate(x, y, 0.03);
    if (L && L.gas) peb.gas.push(gq); else (hash(i, 24) < 0.5 ? peb.light : peb.dark).push(gq);
  }
  for (let i = 0; i < 110; i++) {
    const x = (hash(i, 31) - 0.5) * 2 * 28, y = -35.3 - hash(i, 32) * 6.4;
    if (Math.abs(x) < 1.8) continue;
    peb.gas.push(new THREE.CircleGeometry(0.16 + hash(i, 33) * 0.22, 6).translate(x, y, 0.04));
  }
  add(G, strip(peb.light), basic(0xffffff, { transparent: true, opacity: 0.16, depthWrite: false }));
  add(G, strip(peb.dark), basic(0x000000, { transparent: true, opacity: 0.13, depthWrite: false }));
  O.gasPores = add(G, strip(peb.gas), basic(0xfff2b0, { transparent: true, opacity: 0.7 }));
  // surface + mini rig
  add(G, strip([box(Wd - RC, 0.4, Dd).translate(-(RC + Wd) / 2, 0.2, -Dd / 2), box(Wd - RC, 0.4, Dd).translate((RC + Wd) / 2, 0.2, -Dd / 2)]), lam(0xe9d3a3));
  add(G, box(9, 0.5, 7), lam(0x52627a), 0, 3.3, -2.0);
  add(G, box(9.1, 0.18, 7.1), lam(0xfbbf24), 0, 3.6, -2.0);
  add(G, strip([cylBetween([-4, 0.4, -5], [-4, 3.1, -5], 0.2, 4), cylBetween([4, 0.4, -5], [4, 3.1, -5], 0.2, 4), cylBetween([-4, 0.4, 1.2], [-4, 3.1, 1.2], 0.2, 4), cylBetween([4, 0.4, 1.2], [4, 3.1, 1.2], 0.2, 4)]), lam(0x3f4d63));
  const lt = lattice(3.7, 20, 3.0, 0.9, 5, 0.22, 0.12, 0.09); lt.translate(0, 0, -1.5);
  add(G, lt, lam(0xf8fafc));
  add(G, box(1.6, 2.2, 1.3), lam(0xdc2626), 0, Y_TOP + 1.0, 0); // top drive
  add(G, pipeRun([[0.2, Y_TOP + 2.1, 0], [3.5, Y_TOP + 4.5, -0.5], [6.5, Y_TOP + 1.0, -0.8], [6.5, 3.7, -0.8]], 0.16, 6), lam(0x111827));
  // BOP stack (back half = natural cutaway), y 0.4 – 2.2, bore r 0.62
  const bopM = lam(0xcbd5e1);
  add(G, strip([box(1.7, 1.8, 2.4).translate(-1.47, 1.3, -1.2), box(1.7, 1.8, 2.4).translate(1.47, 1.3, -1.2),
    box(1.24, 1.8, 1.78).translate(0, 1.3, -1.51)]), bopM);
  add(G, strip([box(1.0, 0.5, 2.4).translate(-1.82, 1.85, -1.2), box(1.0, 0.5, 2.4).translate(1.82, 1.85, -1.2)]), lam(0xf59e0b));
  O.ramsW = [1, -1].map(s => add(G, box(0.8, 0.32, 0.1), lam(0x3b82f6), s * 1.6, 1.0, 0.06));
  O.packW = [1, -1].map(s => add(G, box(0.5, 0.3, 0.1), lam(0x1f2937), s * 0.95, 1.85, 0.06));
  O.bopTopW = new THREE.Object3D(); O.bopTopW.position.set(-1.6, 1.9, 0); G.add(O.bopTopW);
  // bell nipple + flowline (left) and choke line + HCR (right)
  add(G, cyl(0.62, 0.5, 14, true), cb(0x9ca3af), 0, 2.45, 0);
  add(G, pipeRun([[-0.62, Y_FL, 0], [-9.0, Y_FL, 0]], 0.28, 10), cb(0x9ca3af));
  add(G, pipeRun([[0.62, Y_CK, 0], [9.0, Y_CK, 0]], 0.22, 10), cb(0x8b5cf6));
  add(G, box(0.6, 0.6, 0.6), lam(0xdc2626), 3.2, Y_CK, -0.35);
  O.hcrW = new THREE.Object3D(); O.hcrW.position.set(3.2, Y_CK + 0.3, 0); G.add(O.hcrW);
  // cement + casing
  add(G, cyl(RC, -Y_SHOE + 0.4, 18, true), cb(0xc9c3b6), 0, Y_SHOE / 2 + 0.2, 0);
  add(G, cyl(RH, -Y_SHOE + 0.4, 18, true), cb(0x8f9cab), 0, Y_SHOE / 2 + 0.2, 0);
  add(G, strip([1, -1].map(s => box(RC - RH - 0.1, -Y_SHOE, 0.2).translate(s * (RC + RH + 0.1) / 2, Y_SHOE / 2, -0.1))), lam(0xd6d0c4));
  add(G, strip([1, -1].map(s => box(0.12, -Y_SHOE + 0.4, 0.22).translate(s * (RH + 0.06), Y_SHOE / 2 + 0.2, -0.1))), lam(0x475569));
  add(G, strip([1, -1].map(s => box(0.5, 0.6, 0.3).translate(s * (RH + 0.15), Y_SHOE - 0.2, -0.1))), lam(0x475569));
  // mud tint in hole
  O.mudTint = add(G, cyl(RH - 0.03, -YB + 0.4, 18, true), lam(0x8a5a2e, { clippingPlanes: [clip], side: THREE.DoubleSide, transparent: true, opacity: 0.42, depthWrite: false }), 0, YB / 2 + 0.2, 0);
  O.mudTint.renderOrder = 1;
  // kill-mud tints: pipe (fills from the top down) and annulus (fills from the bottom up)
  const kp = cyl(RPI - 0.04, 1, 14, true); kp.translate(0, -0.5, 0);
  O.killPipe = add(G, kp, lam(0x2563eb, { clippingPlanes: [clip], side: THREE.DoubleSide, transparent: true, opacity: 0.75, depthWrite: false }), 0, Y_TOP, 0);
  const ka = cyl(RH - 0.06, 1, 18, true); ka.translate(0, 0.5, 0);
  O.killAnn = add(G, ka, lam(0x3b82f6, { clippingPlanes: [clip], side: THREE.DoubleSide, transparent: true, opacity: 0.6, depthWrite: false }), 0, YB, 0);
  O.killPipe.renderOrder = 2; O.killAnn.renderOrder = 2;
  // drill string
  const DS = O.ds = new THREE.Group(); G.add(DS);
  const DR = O.dsRot = new THREE.Group(); DS.add(DR);
  const pipeM = cb(0x8792a2), boreM = cb(0x5e6773), colM = cb(0x6b7684);
  add(DR, cyl(RP, Y_TOP - Y_COL, 14, true), pipeM, 0, (Y_TOP + Y_COL) / 2, 0);
  add(DR, cyl(RPI, Y_TOP - Y_COL, 14, true), boreM, 0, (Y_TOP + Y_COL) / 2, 0);
  add(DR, cyl(RCO, Y_COL - YBT, 14, true), colM, 0, (Y_COL + YBT) / 2, 0);
  add(DR, cyl(RPI, Y_COL - YBT, 14, true), boreM, 0, (Y_COL + YBT) / 2, 0);
  const tjs = [], stripes = [];
  for (let y = -4; y > Y_COL + 1; y -= 9) {
    tjs.push(cyl(RP + 0.14, 0.9, 14, true).translate(0, y, 0));
    stripes.push(box(0.2, 0.95, 0.1).translate(RP + 0.12, y, -0.08), box(0.2, 0.95, 0.1).translate(-RP - 0.12, y, -0.08));
  }
  for (let y = Y_COL - 1.5; y > YBT + 1; y -= 2.6) if (y > Y_MWD1 || y < Y_MWD0) stripes.push(box(0.16, 0.5, 0.1).translate(RCO, y, -0.12), box(0.16, 0.5, 0.1).translate(-RCO, y, -0.12));
  add(DR, strip(tjs), cb(0xaab4c3));
  add(DR, strip(stripes), cb(0x1e293b));
  add(DR, cyl(RCO + 0.04, Y_MWD1 - Y_MWD0, 14, true), cb(0x0891b2), 0, (Y_MWD0 + Y_MWD1) / 2, 0);
  add(DS, strip([1, -1].map(s => box(RP - RPI, Y_TOP - Y_COL, 0.14).translate(s * (RP + RPI) / 2, (Y_TOP + Y_COL) / 2, -0.07))), lam(0x475569));
  add(DS, strip([1, -1].map(s => box(RCO - RPI, Y_COL - YBT, 0.14).translate(s * (RCO + RPI) / 2, (Y_COL + YBT) / 2, -0.07))), lam(0x4b5563));
  // bit
  const BIT = O.bit = new THREE.Group(); BIT.position.y = YB; DS.add(BIT);
  add(BIT, cyl(1.45, 1.1, 12), lam(0x9ca3af), 0, 1.45, 0);
  add(BIT, cyl(0.9, 0.5, 12, false, RCO), lam(0xb0b7c2), 0, 2.05, 0);
  add(BIT, new THREE.ConeGeometry(1.5, 0.9, 12).rotateX(Math.PI), lam(0xb0b7c2), 0, 0.45, 0);
  const teeth = [];
  for (let i = 0; i < 18; i++) {
    const a = i / 18 * Math.PI * 2, r = 0.55 + (i % 3) * 0.42;
    teeth.push(new THREE.ConeGeometry(0.2, 0.42, 4).rotateX(Math.PI).translate(Math.cos(a) * r, 0.42 - (r - 0.55) * 0.42, Math.sin(a) * r));
  }
  add(BIT, strip(teeth), lam(0xfbbf24));
  O.jetM = basic(0xffe7b8, { transparent: true, opacity: 0.0, blending: THREE.AdditiveBlending, depthWrite: false });
  for (let k = 0; k < 3; k++) {
    const a = k * 2.094;
    const g = new THREE.ConeGeometry(0.22, 0.9, 8, 1, true); g.translate(0, -0.45, 0);
    const m = add(BIT, g, O.jetM, Math.cos(a) * 0.74, 0.36, Math.sin(a) * 0.74);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), new THREE.Vector3(Math.cos(a) * 0.5, -0.86, Math.sin(a) * 0.5).normalize());
  }
  // particles
  O.NPW = 900;
  O.mudW = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.13, 0), basic(0xffffff), O.NPW);
  O.mudW.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(O.NPW * 3), 3);
  O.cutW = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1, 0), lam(0xffffff), 220);
  O.cutW.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(220 * 3), 3);
  O.gasW = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshLambertMaterial({ color: 0xfffbea, emissive: 0x8a7a48 }), 200);
  for (const m of [O.mudW, O.cutW, O.gasW]) { m.frustumCulled = false; G.add(m); }
}

// ---------------------------------------------------------------- BOP set (big cutaway stack in a studio)
// back half only (z ≤ 0) → the z = 0 face reads as a clean section. Bore radius 1.4, pipe radius 0.5.
const BR = 1.4, BPR = 0.5;
const Y_RAM = 2.2, Y_SPOOL = 4.0, Y_PACK = 6.3;
function buildBOPSet(G) {
  add(G, cyl(60, 0.4, 48), lam(0x16233a), 0, -3.2, 0);
  add(G, new THREE.RingGeometry(9, 9.3, 64).rotateX(-Math.PI / 2), basic(0x2b4a73), 0, -2.98, 0);
  const body = lam(0xcbd5e1), dark = lam(0x5b6576), ramBody = lam(0x94a3b8);
  const half = (x0, x1, y0, y1, d = 3.2) => box(x1 - x0, y1 - y0, d).translate((x0 + x1) / 2, (y0 + y1) / 2, -d / 2);
  const back = (y0, y1, r = BR, d = 3.2) => box(2 * r, y1 - y0, d - r).translate(0, (y0 + y1) / 2, -r - (d - r) / 2);
  // wellhead / casing below
  add(G, strip([half(-2.6, -BR, -3.0, 0.6), half(BR, 2.6, -3.0, 0.6), back(-3.0, 0.6)]), lam(0x8f9cab));
  add(G, strip([half(-3.6, -BR, 0.6, 1.0), half(BR, 3.6, 0.6, 1.0), back(0.6, 1.0)]), lam(0x8b5cf6));
  // pipe-ram body with a horizontal cavity at Y_RAM ± 0.55
  add(G, strip([half(-4.4, -BR, 1.0, Y_RAM - 0.55), half(BR, 4.4, 1.0, Y_RAM - 0.55), back(1.0, Y_RAM - 0.55),
    half(-4.4, -BR, Y_RAM + 0.55, 3.4), half(BR, 4.4, Y_RAM + 0.55, 3.4), back(Y_RAM + 0.55, 3.4),
    half(-4.4, -4.0, Y_RAM - 0.55, Y_RAM + 0.55), half(4.0, 4.4, Y_RAM - 0.55, Y_RAM + 0.55)]), ramBody);
  add(G, strip([half(-4.0, -BR, Y_RAM - 0.55, Y_RAM + 0.55, 2.6), half(BR, 4.0, Y_RAM - 0.55, Y_RAM + 0.55, 2.6)]).translate(0, 0, -0.02), dark);
  // ram operators (hydraulic cylinders) + piston rods
  for (const s of [1, -1]) add(G, xCyl(0.75, 1.6, 14), lam(0x2563eb), s * 5.2, Y_RAM, -1.0);
  O.rams = [1, -1].map(s => {
    const g = new THREE.Group(); G.add(g); g.userData.s = s;
    add(g, box(2.4, 1.0, 2.5), lam(0x3b82f6), s * 1.2, 0, -1.25 + 0.03);
    add(g, box(0.18, 1.0, 2.5), lam(0x111827), 0, 0, -1.25 + 0.04); // rubber face
    add(g, xCyl(0.18, 3.2, 8), lam(0xe5e7eb), s * 3.6, 0, -1.0);
    return g;
  });
  // drilling spool with choke (right) and kill (left) outlets
  add(G, strip([half(-2.4, -BR, 3.4, 4.6), half(BR, 2.4, 3.4, 4.6), back(3.4, 4.6)]), lam(0x8b5cf6));
  add(G, pipeRun([[2.4, Y_SPOOL, -0.35], [9.5, Y_SPOOL, -0.35]], 0.38, 10), lam(0x8b5cf6));
  add(G, pipeRun([[-2.4, Y_SPOOL, -0.35], [-9.5, Y_SPOOL, -0.35]], 0.38, 10), lam(0x64748b));
  O.hcr = add(G, box(1.1, 1.1, 1.1), lam(0xdc2626), 4.3, Y_SPOOL, -0.35);
  add(G, box(0.6, 0.9, 0.6), lam(0x1f2937), 4.3, Y_SPOOL + 1.0, -0.35);
  O.chokeB = add(G, box(1.2, 1.2, 1.2), lam(0xf59e0b), 7.2, Y_SPOOL, -0.35);
  add(G, cylBetween([7.2, Y_SPOOL + 0.6, -0.35], [7.2, Y_SPOOL + 1.5, -0.35], 0.32, 10), lam(0x1f2937));
  add(G, box(1.0, 1.0, 1.0), lam(0x475569), -4.3, Y_SPOOL, -0.35);
  // annular preventer: housing + packing element (rebuilt when it closes) + piston
  add(G, strip([half(-4.0, -2.75, 4.6, 7.6), half(2.75, 4.0, 4.6, 7.6), back(4.6, 7.6, 2.75),
    half(-4.0, -BR, 7.2, 8.0), half(BR, 4.0, 7.2, 8.0), back(7.2, 8.0)]), lam(0xf59e0b));
  add(G, strip([half(-2.75, -BR, 4.6, 5.0), half(BR, 2.75, 4.6, 5.0), back(4.6, 5.0)]), lam(0xd97706));
  O.packM = lam(0x1f2937, { side: THREE.DoubleSide });
  O.pack = add(G, new THREE.BufferGeometry(), O.packM, 0, Y_PACK, 0);
  O.packKey = -1;
  O.piston = [1, -1].map(s => add(G, box(1.2, 0.5, 0.3), lam(0xfacc15), s * 2.15, 5.3, 0.02));
  // bell nipple above
  add(G, strip([half(-2.0, -BR, 8.0, 9.2), half(BR, 2.0, 8.0, 9.2), back(8.0, 9.2)]), lam(0x9ca3af));
  // mud inside the bore (back half)
  add(G, new THREE.CylinderGeometry(BR - 0.02, BR - 0.02, 12.2, 20, 1, true, Math.PI / 2, Math.PI), lam(0x8a5a2e, { side: THREE.DoubleSide, transparent: true, opacity: 0.55, depthWrite: false }), 0, 3.1, 0);
  // drill pipe with a tool joint (moves up during space-out)
  O.pipeB = new THREE.Group(); G.add(O.pipeB);
  add(O.pipeB, cyl(BPR, 26, 16), lam(0x8792a2), 0, 4.0, 0);
  add(O.pipeB, cyl(BPR + 0.2, 1.1, 16), lam(0xaab4c3), 0, Y_PACK + 0.2, 0);
  O.tjMarker = new THREE.Object3D(); O.tjMarker.position.set(BPR + 0.2, Y_PACK + 0.2, 0.3); O.pipeB.add(O.tjMarker);
  // gas bubbles
  O.gasB = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshLambertMaterial({ color: 0xfffbea, emissive: 0x8a7a48 }), 160);
  O.gasB.frustumCulled = false; G.add(O.gasB);
  O.markB = { ann: [2.0, Y_PACK, 0.4], ram: [-2.6, Y_RAM, 0.3], hcr: [4.3, Y_SPOOL + 0.6, 0.3], choke: [7.2, Y_SPOOL + 0.7, 0.3] };
}
function packGeo(c) { // c = 0 open … 1 closed on the pipe; back half torus (arc π, z ≤ 0)
  const R = lerp(2.15, 1.2, c), tube = lerp(0.55, 0.76, c);
  const g = new THREE.TorusGeometry(R, tube, 8, 20, Math.PI);
  g.rotateX(-Math.PI / 2);
  g.scale(1, 1.15, 1);
  return g;
}

// ---------------------------------------------------------------- shots / cameras (set-local: [px,py,pz, tx,ty,tz, fov])
const K_TITLE = [{ t: 0, v: [112, 22, 128, 8, 19, 0, 40] }, { t: 8, v: [96, 18, 110, 8, 18.5, 0, 40] }];
const OVW = [10, -24, 142, 0, -28.1, 0, 30];
const K_KICK = [
  { t: 8.0, v: [12, -22, 140, 0, -27.0, 0, 30] }, { t: 9.6, v: [9, -23, 136, 0, -27.5, 0, 30], stop: true },
  { t: 11.0, v: [5.5, -33.5, 24, 0, -35.0, 0, 40], stop: true }, { t: 15.0, v: [4.2, -33.8, 22, 0, -35.2, 0, 40], stop: true },
  { t: 16.2, v: [9, -20, 136, 0, -24.5, 0, 30] }, { t: 20.0, v: [6, -20.5, 132, 0, -24.5, 0, 30] },
];
const K_PIT = [{ t: 20, v: [19.5, 7.2, 13.5, 18.2, 2.0, -2.5, 40] }, { t: 27, v: [18.8, 6.2, 11.5, 18.2, 2.0, -2.5, 40] }];
const K_FLOW = [{ t: 27, v: [6.4, 9.6, 7.4, 12.3, 3.4, -1.8, 40] }, { t: 34, v: [7.4, 9.0, 7.8, 12.3, 3.4, -1.8, 40] }];
const K_FCHK = [{ t: 34, v: [40, 16, 34, 15, 3.0, 1.0, 40] }, { t: 42, v: [37, 14.5, 31, 15, 3.0, 1.0, 40] }];
const K_BOP = [
  { t: 42, v: [5.5, 8.5, 31, 1.8, 4.6, 0, 40] }, { t: 46.4, v: [4.8, 8.0, 30, 1.8, 4.6, 0, 40], stop: true },
  { t: 47.4, v: [2.6, 5.6, 20.5, 0.4, 4.3, 0, 40], stop: true }, { t: 50.6, v: [2.2, 5.4, 19.8, 0.4, 4.3, 0, 40], stop: true },
  { t: 51.6, v: [6.0, 7.0, 27, 2.6, 4.4, 0, 40] }, { t: 56, v: [5.4, 6.8, 26, 2.6, 4.4, 0, 40] },
];
const K_READ = [{ t: 56, v: [-12, -14, 128, -6.0, -17.5, 0, 30] }, { t: 70, v: [-10, -15, 124, -6.0, -17.5, 0, 30] }];
const K_C1 = [
  { t: 70, v: [7, -25, 44, 1.5, -27, 0, 40] }, { t: 72, v: [7, -24.5, 44, 1.5, -26.5, 0, 40] },
  { t: 77.5, v: [7, -5, 42, 2.0, -6.5, 0, 40] }, { t: 80, v: [8, -1, 36, 3.0, -2.5, 0, 40] },
];
const K_FLARE = [{ t: 80, v: [10, 15, 33, -15, 2.6, 4, 40] }, { t: 83.4, v: [8, 14, 32, -15, 2.6, 4, 40], stop: true },
  { t: 84.4, v: [-14, 13, 36, -40, 2.4, 4, 40] }, { t: 86, v: [-15, 12.5, 35, -40, 2.4, 4, 40] }];
const K_C2 = [{ t: 86, v: [-12, -14, 128, -6.0, -17.5, 0, 30] }, { t: 100, v: [-10, -15, 124, -6.0, -17.5, 0, 30] }];
const K_DEAD = [{ t: 100, v: [-10, -15, 124, -6.0, -17.5, 0, 30] }, { t: 110, v: [-8, -16, 120, -6.0, -17.5, 0, 30] }];
const K_END = [{ t: 110, v: [56, 30, 58, 12, 9, 0, 40] }, { t: 120, v: [47, 26, 51, 12, 9, 0, 40] }];

function shotFor(t) {
  if (t < 8) return { set: 'L', v: track(K_TITLE, t) };
  if (t < 20) return { set: 'W', v: track(K_KICK, t) };
  if (t < 27) return { set: 'L', v: track(K_PIT, t) };
  if (t < 34) return { set: 'L', v: track(K_FLOW, t) };
  if (t < 42) return { set: 'L', v: track(K_FCHK, t) };
  if (t < 56) return { set: 'B', v: track(K_BOP, t) };
  if (t < 70) return { set: 'W', v: track(K_READ, t) };
  if (t < 80) return { set: 'W', v: track(K_C1, t) };
  if (t < 86) return { set: 'L', v: track(K_FLARE, t) };
  if (t < 100) return { set: 'W', v: track(K_C2, t) };
  if (t < 110) return { set: 'W', v: track(K_DEAD, t) };
  return { set: 'L', v: track(K_END, t) };
}

// ---------------------------------------------------------------- init
async function init(opts) {
  THREE = opts.THREE; renderer = opts.renderer; W = opts.width || 1080; H = opts.height || 1920;
  renderer.localClippingEnabled = true;
  _c.a = new THREE.Color();
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(40, W / H, 0.3, 5000);
  scene.fog = new THREE.Fog(0x000000, 10, 1000);
  scene.background = new THREE.Color();
  O.hemi = new THREE.HemisphereLight(0xffffff, 0x445566, 1.5); scene.add(O.hemi);
  O.dir = new THREE.DirectionalLight(0xffffff, 2.2); scene.add(O.dir); scene.add(O.dir.target);
  O.sets = {};
  for (const k of Object.keys(OFF)) { const g = new THREE.Group(); g.position.set(...OFF[k]); scene.add(g); O.sets[k] = g; }
  buildLand(O.sets.L); buildWell(O.sets.W); buildBOPSet(O.sets.B);
  O.v3 = new THREE.Vector3(); O.v3b = new THREE.Vector3(); O.tan = new THREE.Vector3(); O.q = new THREE.Quaternion(); O.up = new THREE.Vector3(0, 1, 0);
  O.m4 = new THREE.Matrix4(); O.scl = new THREE.Vector3(); O.col = new THREE.Color();
  O.lastT = null;
}

// ---------------------------------------------------------------- per-frame helpers
function setI(mesh, i, x, y, z, s, sy = s) {
  const e = mesh.instanceMatrix.array, o = i * 16;
  e[o] = s; e[o + 1] = 0; e[o + 2] = 0; e[o + 3] = 0;
  e[o + 4] = 0; e[o + 5] = sy; e[o + 6] = 0; e[o + 7] = 0;
  e[o + 8] = 0; e[o + 9] = 0; e[o + 10] = s; e[o + 11] = 0;
  e[o + 12] = x; e[o + 13] = y; e[o + 14] = z; e[o + 15] = 1;
}
function setC(mesh, i, hex) { O.col.setHex(hex); O.col.toArray(mesh.instanceColor.array, i * 3); }
function done(mesh, n) { mesh.count = n; mesh.instanceMatrix.needsUpdate = true; if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true; }

function placeCam(set, v, vo = 0) {
  const o = OFF[set];
  camera.position.set(v[0] + o[0], v[1] + o[1], v[2] + o[2]);
  camera.lookAt(v[3] + o[0], v[4] + o[1], v[5] + o[2]);
  camera.fov = v[6];
  if (vo) camera.setViewOffset(W, H, 0, vo, W, H); else camera.clearViewOffset();
  camera.updateProjectionMatrix(); camera.updateMatrixWorld();
}

function env(set) {
  const o = OFF[set];
  if (set === 'L') {
    scene.background.setHex(0x9a4f86);
    scene.fog.color.setHex(0xe8a27a); scene.fog.near = 160; scene.fog.far = 1600;
    O.hemi.color.setHex(0xffe6cf); O.hemi.groundColor.setHex(0x8a6448); O.hemi.intensity = 1.75;
    O.dir.color.setHex(0xffc58f); O.dir.intensity = 2.5;
    O.dir.position.set(o[0] + 60, 55, o[2] + 75); O.dir.target.position.set(o[0], 0, o[2]);
  } else if (set === 'W') {
    scene.background.setHex(0x0f2236);
    scene.fog.color.setHex(0x0f2236); scene.fog.near = 300; scene.fog.far = 1200;
    O.hemi.color.setHex(0xffffff); O.hemi.groundColor.setHex(0x7a8796); O.hemi.intensity = 1.9;
    O.dir.color.setHex(0xffffff); O.dir.intensity = 1.8;
    O.dir.position.set(o[0] + 40, 70, o[2] + 90); O.dir.target.position.set(o[0], -10, o[2]);
  } else {
    scene.background.setHex(0x0d1a2e);
    scene.fog.color.setHex(0x0d1a2e); scene.fog.near = 60; scene.fog.far = 200;
    O.hemi.color.setHex(0xffffff); O.hemi.groundColor.setHex(0x3a4a66); O.hemi.intensity = 1.8;
    O.dir.color.setHex(0xffffff); O.dir.intensity = 2.1;
    O.dir.position.set(o[0] + 30, 50, o[2] + 60); O.dir.target.position.set(o[0], 2, o[2]);
  }
}
function showOnly(set) { for (const k in O.sets) O.sets[k].visible = k === set; }

// ---------------------------------------------------------------- LAND dynamics
const PUMP_W = 2 * Math.PI * 1.5;
const PUMP_L = [[0, 1], [35.3, 1], [35.9, 0], [79.6, 0], [80.4, 0.7], [109, 0.7], [110, 1], [200, 1]];
const RET_SPD = [[0, 3.2], [27.8, 3.2], [29.5, 5.6], [35.5, 5.6], [36.6, 3.0], [200, 3.0]];
const pitLift = t => (t < 110 ? 0.32 * sstep(21.2, 26.0, t) : 0);
const flareA = t => win(t, 80.7, 86.4, 0.5, 0.2);
function arrowsAlong(mesh, n0, path, phase, sp, k, scale, maxN, pulse) {
  let n = n0;
  const N = Math.floor(path.L / sp);
  for (let j = 0; j < N && n < maxN; j++) {
    const s = fract(j / N + phase / path.L) * path.L;
    path.at(s, O.v3, O.tan);
    O.q.setFromUnitVectors(O.up, O.tan);
    O.scl.setScalar(k * pulse * scale);
    O.m4.compose(O.v3, O.q, O.scl);
    mesh.setMatrixAt(n++, O.m4);
  }
  return n;
}
function stateLand(t, v) {
  O.skyL.position.set(v[0], 0, v[2]);
  O.swirl.rotation = -t * 0.55;
  const lift = pitLift(t);
  for (const m of O.mudSurf) {
    const a = m.geometry.attributes.position, b = m.userData.base, k = m.userData.k;
    for (let i = 0; i < a.array.length; i += 3) {
      const x = b[i], z = b[i + 2], r = Math.hypot(x, z), th = Math.atan2(z, x);
      a.array[i + 1] = 0.06 * Math.sin(r * 2.6 - t * 2.4 + th * 2 + k) + 0.03 * Math.sin(x * 3.1 + t * 3.3) + (k === 0 ? 0.03 * Math.sin(z * 5 + t * 7) : 0);
    }
    a.needsUpdate = true;
    m.position.y = MUDY + lift;
  }
  for (const a of O.agit) a.rotation.y = t * 5.5;
  const th = PUMP_W * pwlIntegral(PUMP_L, t);
  O.rods.forEach((r, k) => { r.position.x = 0.34 * Math.sin(th + k * 2.094); });
  O.wheel.rotation.z = -th;
  const retOn = t < 42 || t >= 110;
  const shk = retOn ? 1 : 0;
  O.basket.position.set(12.25 + 0.018 * Math.sin(t * 47), 4.55 + 0.022 * Math.sin(t * 53 + 1), -2.65 + 0.018 * Math.cos(t * 41));
  let n = 0;
  if (shk) for (let i = 0; i < 110; i++) {
    const life = 2.6, age = fract(t / life + hash(i, 81)) * life;
    const x = 11.0 + hash(i, 82) * 2.5, s = 0.1 + hash(i, 83) * 0.09;
    if (age < 1.8) { const u = age / 1.8; setI(O.shCut, n++, x, lerp(4.95, 4.22, u) + 0.07, lerp(-4.3, -0.75, u), s); }
    else { const f = age - 1.8; const y = Math.max(1.02 + hash(i, 84) * 0.25, 4.22 - 4.9 * f * f); setI(O.shCut, n++, lerp(x, 12.25, f * 0.5), y, -0.75 + 1.6 * Math.min(f, 0.55), s); }
  }
  done(O.shCut, n);
  n = 0;
  const drips = shk ? (t > 28 && t < 36 ? 90 : 60) : 0;
  for (let i = 0; i < drips; i++) {
    const life = 0.55, age = fract(t / life + hash(i, 85)) * life;
    const z = -4.2 + hash(i, 86) * 3.2, y0 = lerp(4.95, 4.22, (z + 4.3) / 3.55) - 0.2;
    setI(O.shDrip, n++, 11.0 + hash(i, 87) * 2.5, Math.max(MUDY + lift, y0 - 4.9 * age * age * 1.6), z, 0.07, 0.14);
  }
  done(O.shDrip, n);
  // flow arrows
  const dist = camera.position.distanceTo(O.v3.set(v[3], v[4], v[5]));
  const k = clamp(dist / 22, 1, 3.2), sp = 1.55 * k;
  const pulse = 0.85 + 0.15 * Math.sin(t * 6);
  const pumpRate = pwl(PUMP_L, t);
  n = 0;
  if (pumpRate > 0.05) n = arrowsAlong(O.arrows, n, O.pathDN, 3.2 * pwlIntegral(PUMP_L, t), sp, k, 0.4 + 0.6 * Math.min(1, pumpRate * 1.4), 420, pulse);
  if (retOn) {
    const big = t > 27 && t < 36 ? 1 + 0.35 * sstep(27.8, 29.5, t) : 1;
    n = arrowsAlong(O.arrows, n, O.pathRET, pwlIntegral(RET_SPD, t), sp / big, k, big, 420, pulse);
  }
  const fa = flareA(t);
  if (fa > 0) {
    n = arrowsAlong(O.arrows, n, O.pathCHK, 2.2 * t, sp, k, fa, 420, pulse);
    n = arrowsAlong(O.arrows, n, O.pathMGSR, 2.2 * t, sp * 1.4, k, fa, 420, pulse);
  }
  O.arrows.count = n; O.arrows.instanceMatrix.needsUpdate = true;
  O.arrows.visible = t >= 8 || t < 8;
  let ng = 0;
  if (fa > 0) ng = arrowsAlong(O.arrowsG, 0, O.pathGAS, 5.0 * t, sp * 1.2, k, fa, 160, pulse);
  O.arrowsG.count = ng; O.arrowsG.instanceMatrix.needsUpdate = true;
  // flare flame
  O.flare.visible = fa > 0.01;
  if (fa > 0.01) {
    const fl = sstep(80.8, 81.6, t);
    O.flameM.forEach((m, i) => { m.opacity = fa * [0.55, 0.6, 0.75][i]; });
    O.flames.forEach(m => {
      const i = m.userData.k, w = 0.75 + 0.25 * Math.sin(t * (9 + i) + i * 1.7);
      m.position.set(-0.6 - (i % 3) * 0.5 + 0.35 * Math.sin(t * 5 + i), 0, (hash(i, 701) - 0.5) * 0.9);
      m.scale.set(fl * (1.5 + 0.5 * w), fl * (2.6 + 1.4 * w + 0.9 * Math.sin(t * 13 + i * 2)), fl * (1.5 + 0.5 * w));
      m.rotation.z = 0.35 + 0.12 * Math.sin(t * 7 + i);
    });
    O.flareGlow.material.opacity = fa * fl * (0.22 + 0.06 * Math.sin(t * 11));
  }
}

// ---------------------------------------------------------------- WELL dynamics
const RATE_W = [[0, 1], [19, 1], [19.6, 0], [70.4, 0], [71.6, 1.2], [85.4, 1.2], [86.2, 1.4], [99.6, 1.4], [100.4, 0], [200, 0]];
const ROT_W = [[0, 1.3], [18.8, 1.3], [19.4, 0], [200, 0]];
const TA = (Y_TOP - YBT) / 12, TB = 0.4, TCt = 0.5, TD = (0.3 - (YB + 1.4)) / 3.0, TE = 2.0;
const TT = TA + TB + TCt + TD + TE;
const TK = 86.3;
const DMK = pwlIntegral(RATE_W, TK);
const killF = t => Math.max(0, pwlIntegral(RATE_W, t) - DMK);
const pp = [0, 0, 0];
function mudPathW(tau, i, rot, choke, out) {
  const jx = (hash(i, 41) - 0.5) * 2, jz = -0.3 + hash(i, 42) * 0.55;
  const side = hash(i, 43) < 0.5 ? -1 : 1, lane = 0.95 + hash(i, 44) * 0.5, lz = -0.55 + hash(i, 45) * 0.85;
  if (tau < TA) { out[0] = jx * 0.25; out[1] = Y_TOP - 12 * tau; out[2] = jz; return 0; }
  const a = rot + (i % 3) * 2.094;
  const ca = Math.cos(a), sa = Math.sin(a);
  if (tau < TA + TB) {
    const u = (tau - TA) / TB;
    out[0] = lerp(0.74, 1.45, u) * ca; out[1] = YB + lerp(0.36, 0.1, u); out[2] = lerp(0.74, 1.45, u) * sa; return 1;
  }
  const sd = ca >= 0 ? 1 : -1;
  if (tau < TA + TB + TCt) {
    const u = (tau - TA - TB) / TCt;
    out[0] = lerp(1.45 * ca, sd * lane, u); out[1] = YB + lerp(0.1, 1.4, u); out[2] = lerp(1.45 * sa, lz, u); return 2;
  }
  const s = side;
  const c = tau - TA - TB - TCt;
  if (c < TD) {
    const y = YB + 1.4 + 3.0 * c;
    const u = clamp(c / 0.6);
    out[0] = lerp(sd * lane, s * lane, u) + Math.sin(y * 0.7 + i) * 0.06; out[1] = y; out[2] = lz; return 3;
  }
  const e = c - TD;
  if (choke) {
    if (e < 0.3) { const u = e / 0.3; out[0] = lerp(s * lane, 0.62, u); out[1] = lerp(0.3, Y_CK, u); out[2] = lerp(lz, 0.1, u); return 4; }
    out[0] = 0.62 + 3.2 * (e - 0.3); out[1] = Y_CK + jz * 0.25; out[2] = 0.12; return out[0] < 9 ? 4 : -1;
  }
  if (e < 0.6) { const u = e / 0.6; out[0] = lerp(s * lane, -0.25, u); out[1] = lerp(0.3, Y_FL, u); out[2] = lerp(lz, 0.1, u); return 4; }
  out[0] = -0.62 - 3.2 * (e - 0.6); out[1] = Y_FL + jz * 0.3; out[2] = 0.12; return out[0] > -9 ? 4 : -1;
}
// gas slug (shut-in → circulation 1). yc: slug centre
const slugY = t => (t < 70.9 ? -26.5 : lerp(-26.5, 17, eio((t - 70.9) / 8.7)));
function gasSlugPos(i, yc, out) {
  const off = (hash(i, 121) - 0.5) * 2, side = hash(i, 122) < 0.5 ? -1 : 1, lane = 1.0 + hash(i, 123) * 0.45, lz = -0.45 + hash(i, 124) * 0.75;
  const ex = clamp((yc + 26.5) / 27);
  const p = yc + off * 6.0 * (1 + 0.9 * ex);
  const grow = 1 + 0.9 * clamp((Math.min(p, 0.3) + 26.5) / 27);
  out[3] = (0.16 + hash(i, 125) * 0.1) * grow;
  if (p <= 0.3) { out[0] = side * lane + Math.sin(p * 0.8 + i) * 0.1; out[1] = p; out[2] = lz; return true; }
  const d = p - 0.3;
  if (d < 0.5) { const u = d / 0.5; out[0] = lerp(side * lane, 0.62, u); out[1] = lerp(0.3, Y_CK, u); out[2] = lerp(lz, 0.1, u); return true; }
  out[0] = 0.62 + (d - 0.5) * 1.5; out[1] = Y_CK + (hash(i, 126) - 0.5) * 0.25; out[2] = 0.1;
  out[3] = Math.min(out[3], 0.32);
  return out[0] < 9;
}
const gp = [0, 0, 0, 0];
// gauge readings (psi)
function dpPsi(t) {
  if (t < 56) return 0;
  if (t < 70.4) return 520 * sstep(56.6, 58.4, t);
  if (t < 86.2) return lerp(520, 920, sstep(70.4, 71.8, t));
  if (t < 100) return lerp(920, 440, clamp(killF(t) / (TA + TB)));
  return 440 * (1 - sstep(100.0, 101.0, t));
}
function csgPsi(t) {
  if (t < 56) return 0;
  if (t < 70.4) return 720 * sstep(58.6, 60.6, t);
  if (t < 86.2) {
    const yc = slugY(t);
    const g1 = sstep(-22, -3, yc + 6), g2 = sstep(1.0, 13, yc);
    return (720 + 230 * g1) * (1 - g2) + 520 * g2;
  }
  const c = killF(t) - TA - TB - TCt;
  return 520 * (1 - clamp(c / TD));
}
function stateWell(t, v) {
  const rot = pwlIntegral(ROT_W, t);
  O.dsRot.rotation.y = rot; O.bit.rotation.y = rot;
  const Dm = pwlIntegral(RATE_W, t);
  const rate = pwl(RATE_W, t);
  const choke = t >= 56;
  const dist = camera.position.distanceTo(O.v3.set(v[3] + OFF.W[0], v[4], v[5]));
  const ks = clamp(dist / 26, 1, 2.6);
  const F = killF(t);
  const killOn = t >= TK && t < 110;
  // BOP state (closed 56 → 101.6)
  const cl = t >= 56 ? 1 - sstep(101.6, 102.6, t) : 0;
  O.ramsW.forEach((m, k) => { m.position.x = (k ? -1 : 1) * lerp(1.6, 0.9, cl); });
  O.packW.forEach((m, k) => { m.position.x = (k ? -1 : 1) * lerp(0.95, 0.75, cl); });
  // mud particles (kill mud = blue)
  let n = 0;
  for (let i = 0; i < O.NPW; i++) {
    const tau = ((hash(i, 40) * TT + Dm) % TT + TT) % TT;
    const ph = mudPathW(tau, i, rot, choke, pp);
    if (ph < 0) continue;
    if (ph === 1 && pp[2] < -0.2 && Math.abs(pp[0]) < 1.4) continue;
    let sz = ks, col = 0xf1cfa2;
    if (ph === 1) { sz *= 1.35; col = rate > 0.05 ? 0xfff4dc : col; }
    if (killOn && Dm - tau >= DMK) col = ph === 1 ? 0xbfdbfe : 0x60a5fa;
    setI(O.mudW, n, pp[0], pp[1], pp[2], sz);
    setC(O.mudW, n, col); n++;
  }
  done(O.mudW, n);
  // kill tints
  O.killPipe.visible = killOn && F > 0.01;
  O.killPipe.scale.y = Math.max(0.01, Math.min(12 * F, Y_TOP - YBT + 0.4));
  const cA = F - TA - TB - TCt;
  O.killAnn.visible = killOn && cA > -0.4;
  O.killAnn.scale.y = clamp(1.4 + 3.0 * Math.max(cA, -0.45), 0.01, 0.3 - YB);
  // cuttings (drilling only)
  n = 0;
  if (t < 20) {
    const Tc = 0.6 + TD * 3 / 1.8 + TE;
    for (let i = 0; i < 220; i++) {
      const tau = ((hash(i, 60) * Tc + Dm) % Tc + Tc) % Tc;
      const side = hash(i, 61) < 0.5 ? -1 : 1, lane = 1.0 + hash(i, 62) * 0.45, lz = -0.5 + hash(i, 63) * 0.8;
      const a = hash(i, 64) * 6.283, r0 = 0.3 + hash(i, 65) * 1.1;
      let x, y, z;
      if (tau < 0.6) { const u = tau / 0.6; x = lerp(Math.cos(a) * r0, side * lane, u); y = YB + lerp(0.06, 1.3, u); z = lerp(clamp(Math.sin(a) * r0, -0.6, 0.4), lz, u); }
      else {
        y = YB + 1.3 + 1.8 * (tau - 0.6);
        if (y > 0.3) { const e = (y - 0.3) / 1.8; x = -0.62 - 3.2 * e; y = Y_FL; z = 0.12; if (x < -9) continue; }
        else { x = side * lane + Math.sin(y * 0.9 + i) * 0.08; z = lz; }
      }
      setI(O.cutW, n, x, y, z, (0.11 + hash(i, 66) * 0.1) * ks);
      setC(O.cutW, n, [0x5b4a3a, 0x6f6252, 0x4a3b2e][i % 3]); n++;
    }
  }
  done(O.cutW, n);
  // gas
  let ng = 0;
  if (t < 20 && t > 10.4) { // kick: influx from the gas zone, rising up the annulus
    for (let j = 0; j < 150; j++) {
      const te = 10.4 + j * 0.06;
      if (te > t) break;
      const age = t - te;
      const side = hash(j, 111) < 0.5 ? -1 : 1, lane = 1.05 + hash(j, 112) * 0.4, lz = -0.4 + hash(j, 113) * 0.7;
      const ye = -35.2 - hash(j, 114) * 3.0;
      let x, y;
      if (age < 0.8) { const u = age / 0.8; x = side * lerp(RH + 0.3, lane, u); y = ye + u * 0.5; }
      else { y = ye + 0.5 + 2.4 * (age - 0.8) + 0.25 * (age - 0.8) * (age - 0.8); x = side * lane + Math.sin(y * 0.8 + j) * 0.1; }
      if (y > 0.3) continue;
      const r = (0.2 + 0.22 * clamp((y - ye) / 30) + hash(j, 115) * 0.07) * Math.min(1.6, ks);
      setI(O.gasW, ng++, x, y, lz, r);
    }
  } else if (t >= 56 && t < 81) {
    const yc = slugY(t);
    for (let i = 0; i < 150; i++) {
      if (!gasSlugPos(i, yc, gp)) continue;
      setI(O.gasW, ng++, gp[0], gp[1], gp[2], gp[3] * Math.min(1.6, ks));
    }
  }
  done(O.gasW, ng);
  O.gasPores.material.opacity = 0.5 + 0.25 * Math.sin(t * 3) + (t > 10 && t < 20 ? 0.25 * Math.sin(t * 10) : 0);
  // nozzle jets
  O.jetM.opacity = 0.55 * clamp(rate) * (0.85 + 0.15 * Math.sin(t * 25));
}

// ---------------------------------------------------------------- BOP studio dynamics
const T_ANN = 47.8, T_RAM = 49.3, T_HCR = 51.5;
function stateBOP(t) {
  const lift = 2.4 * eio((t - 42.7) / 1.6);
  O.pipeB.position.y = lift;
  const c = eio((t - T_ANN) / 1.0);
  const key = Math.round(c * 48);
  if (key !== O.packKey) { O.packKey = key; O.pack.geometry.dispose(); O.pack.geometry = packGeo(key / 48); }
  O.piston.forEach(m => { m.position.y = lerp(5.3, 5.75, c); });
  const r = eio((t - T_RAM) / 0.9);
  O.rams.forEach(g => { g.position.set(g.userData.s * lerp(1.55, BPR, r), Y_RAM, 0); });
  setEm(O.hcr.material, 0x16a34a, t > T_HCR ? 0.9 * sstep(T_HCR, T_HCR + 0.4, t) : 0);
  // gas bubbles
  const tcA = T_ANN + 0.7, tcR = T_RAM + 0.6, hbA = Y_PACK - 0.95, hbR = Y_RAM - 0.6, v = 1.6;
  let n = 0;
  for (let j = 0; j < 160; j++) {
    const te = 40 + j * 0.072;
    if (te > t) break;
    const yf = u => -3.0 + v * (u - te);
    let y = yf(t);
    const pile = 0.15 + hash(j, 131) * 1.3;
    if (t > tcR && yf(tcR) < hbR) y = Math.min(y, hbR - pile);
    else if (t > tcA && yf(tcA) < hbA) y = Math.min(y, hbA - pile * 0.8);
    if (y > 9.4) continue;
    const side = hash(j, 132) < 0.5 ? -1 : 1, lane = 0.82 + hash(j, 133) * 0.45;
    const x = side * lane + 0.08 * Math.sin(y * 1.3 + j);
    setI(O.gasB, n++, x, y, -0.15 - hash(j, 134) * 0.75, 0.15 + hash(j, 135) * 0.13);
  }
  done(O.gasB, n);
}

function applyState(t) {
  if (O.lastT === t) return;
  O.lastT = t;
  const s = O.shot = shotFor(t);
  placeCam(s.set, s.v, s.vo || 0);
  if (s.set === 'L') stateLand(t, s.v);
  if (s.set === 'W') stateWell(t, s.v);
  if (s.set === 'B') stateBOP(t);
  scene.updateMatrixWorld();
}

function renderFrame(t) {
  applyState(t);
  const s = O.shot;
  showOnly(s.set); env(s.set);
  renderer.render(scene, camera);
}

// ---------------------------------------------------------------- overlay (2D)
function proj(p, local) {
  const v = O.v3b.set(p[0], p[1], p[2]);
  if (local) v.applyMatrix4(local.matrixWorld);
  v.project(camera);
  return { x: (v.x + 1) / 2 * W, y: (1 - v.y) / 2 * H, ok: v.z < 1 };
}
function rr(ctx, x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
const F = (w, s) => `${w} ${s}px Kanit`;

function pill(ctx, cx, cy, en, th, color, a = 1, size = 34, align = 'center') {
  ctx.save(); ctx.globalAlpha = a;
  ctx.font = F(600, size); const we = ctx.measureText(en).width;
  ctx.font = F(400, size * 0.9); const wt = th ? ctx.measureText(th).width : 0;
  const sep = th ? 22 : 0, padX = 26, dot = 16;
  const w = padX * 2 + dot + 14 + we + sep + wt, h = size * 1.75;
  let x = align === 'center' ? cx - w / 2 : align === 'left' ? cx : cx - w;
  x = clamp(x, 62, 958 - w);
  const y = cy - h / 2;
  ctx.shadowColor = 'rgba(0,0,0,0.28)'; ctx.shadowBlur = 18; ctx.shadowOffsetY = 6;
  ctx.fillStyle = 'rgba(255,255,255,0.95)'; rr(ctx, x, y, w, h, h / 2); ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x + padX + dot / 2, cy, dot / 2, 0, 7); ctx.fill();
  ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
  let tx = x + padX + dot + 14;
  ctx.font = F(600, size); ctx.fillStyle = HEX.ink; ctx.fillText(en, tx, cy + 1); tx += we;
  if (th) {
    ctx.fillStyle = 'rgba(15,23,42,0.35)'; ctx.fillRect(tx + sep / 2 - 1, cy - size * 0.45, 2, size * 0.9);
    ctx.font = F(400, size * 0.9); ctx.fillStyle = '#334155'; ctx.fillText(th, tx + sep, cy + 1);
  }
  ctx.restore();
  return { x, y, w, h };
}
function pillBounds(ctx, cx, cy, en, th, size, align) {
  ctx.save(); ctx.font = F(600, size); const we = ctx.measureText(en).width;
  ctx.font = F(400, size * 0.9); const wt = th ? ctx.measureText(th).width : 0; ctx.restore();
  const w = 52 + 16 + 14 + we + (th ? 22 : 0) + wt, h = size * 1.75;
  let x = align === 'center' ? cx - w / 2 : align === 'left' ? cx : cx - w;
  x = clamp(x, 62, 958 - w);
  return { x, y: cy - h / 2, w, h };
}
function callout(ctx, t, t0, t1, anchor, local, px, py, en, th, color, size = 36, align = 'center') {
  const a = win(t, t0, t1, 0.4, 0.35);
  if (a <= 0) return;
  const P = proj(anchor, local);
  if (!P.ok) return;
  const k = eout((t - t0) / 0.5);
  const b = pillBounds(ctx, px, py, en, th, size, align);
  const ex = clamp(P.x, b.x + b.h / 2, b.x + b.w - b.h / 2), ey = P.y > b.y + b.h ? b.y + b.h : P.y < b.y ? b.y : b.y + b.h / 2;
  const sx = P.y > b.y + b.h || P.y < b.y ? ex : (P.x < b.x ? b.x : b.x + b.w);
  const lx = lerp(sx, P.x, k), ly = lerp(ey, P.y, k);
  ctx.save(); ctx.globalAlpha = a;
  ctx.strokeStyle = 'rgba(255,255,255,0.95)'; ctx.lineWidth = 4; ctx.lineCap = 'round';
  ctx.shadowColor = 'rgba(0,0,0,0.35)'; ctx.shadowBlur = 6;
  ctx.beginPath(); ctx.moveTo(sx, ey); ctx.lineTo(lx, ly); ctx.stroke();
  if (k > 0.95) {
    ctx.fillStyle = color; ctx.beginPath(); ctx.arc(P.x, P.y, 10, 0, 7); ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = '#fff'; ctx.stroke();
    const ph = fract((t - t0) * 0.8);
    ctx.globalAlpha = a * (1 - ph); ctx.strokeStyle = color; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(P.x, P.y, 11 + ph * 26, 0, 7); ctx.stroke();
  }
  ctx.restore();
  pill(ctx, px, py + (1 - k) * 14, en, th, color, a, size, align);
}

function chapter(ctx, t, t0, t1, num, th, en, by = 0) {
  const a = win(t, t0, t1, 0.4, 0.3);
  if (a <= 0) return;
  const big = 1 - sstep(t0 + 1.7, t0 + 2.2, t);
  ctx.save();
  if (big > 0.01) {
    const k = eout((t - t0) / 0.6);
    ctx.globalAlpha = a * big;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 24;
    ctx.translate(0, by);
    ctx.font = F(600, 32); ctx.fillStyle = '#ffd166';
    ctx.fillText(`${num}  ·  ${en}`, 510, 300 - (1 - k) * 30);
    ctx.font = F(600, 88); const tw = ctx.measureText(th).width;
    if (tw > 860) ctx.font = F(600, Math.floor(88 * 860 / tw));
    ctx.fillStyle = '#ffffff';
    ctx.fillText(th, 510, 382 - (1 - k) * 30);
    ctx.fillStyle = '#ffd166'; ctx.shadowBlur = 0; rr(ctx, 510 - 50 * k, 442, 100 * k, 8, 4); ctx.fill();
    ctx.translate(0, -by);
  }
  const sm = sstep(t0 + 1.8, t0 + 2.3, t);
  if (sm > 0) {
    ctx.globalAlpha = a * sm;
    ctx.font = F(600, 28); const label = `${num}  ${th}`; const w = ctx.measureText(label).width + 48;
    ctx.fillStyle = 'rgba(10,18,36,0.74)'; rr(ctx, 70, 166, w, 54, 27); ctx.fill();
    ctx.fillStyle = '#ffd166'; ctx.beginPath(); ctx.arc(96, 193, 6, 0, 7); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.textBaseline = 'middle'; ctx.textAlign = 'left'; ctx.fillText(label, 112, 194);
  }
  ctx.restore();
}

function badge(ctx, t, t0, t1, cx, cy, en, th, color, size = 46) {
  const a = win(t, t0, t1, 0.35, 0.35); if (a <= 0) return;
  const k = eout((t - t0) / 0.4), s = 0.7 + 0.3 * k + 0.06 * Math.sin(clamp((t - t0) / 0.4) * Math.PI);
  ctx.save(); ctx.globalAlpha = a; ctx.translate(cx, cy); ctx.scale(s, s);
  ctx.font = F(600, size); const w1 = ctx.measureText(th).width;
  ctx.font = F(600, size * 0.55); const w2 = ctx.measureText(en).width;
  const w = Math.max(w1, w2) + 90, h = size * 2.35;
  ctx.shadowColor = 'rgba(0,0,0,0.4)'; ctx.shadowBlur = 26; ctx.shadowOffsetY = 8;
  ctx.fillStyle = color; rr(ctx, -w / 2, -h / 2, w, h, 28); ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 3; ctx.stroke();
  ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = F(600, size); ctx.fillText(th, 0, -size * 0.33);
  ctx.font = F(600, size * 0.55); ctx.globalAlpha = a * 0.9; ctx.fillText(en, 0, size * 0.6);
  ctx.restore();
}
function warnIcon(ctx, x, y, s, col = '#fff', ink = '#ef4444') {
  ctx.save(); ctx.fillStyle = col; ctx.beginPath();
  ctx.moveTo(x, y - s * 0.55); ctx.lineTo(x + s * 0.55, y + s * 0.42); ctx.lineTo(x - s * 0.55, y + s * 0.42); ctx.closePath(); ctx.fill();
  ctx.fillStyle = ink; ctx.fillRect(x - s * 0.05, y - s * 0.22, s * 0.1, s * 0.36); ctx.beginPath(); ctx.arc(x, y + s * 0.27, s * 0.065, 0, 7); ctx.fill();
  ctx.restore();
}
function alarm(ctx, t, t0, t1, en, th, cy, rgb = [255, 20, 20], size = 84, cx = 510) {
  const a = win(t, t0, t1, 0.2, 0.4); if (a <= 0) return;
  const p = 0.5 + 0.5 * Math.sin((t - t0) * Math.PI * 3);
  ctx.save();
  const g = ctx.createRadialGradient(540, 960, 600, 540, 960, 1250);
  g.addColorStop(0, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0)`); g.addColorStop(1, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${0.38 * p * a})`);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  const k = eout((t - t0) / 0.3);
  ctx.globalAlpha = a; ctx.translate(cx, cy); ctx.scale(0.8 + 0.2 * k, 0.8 + 0.2 * k);
  ctx.font = F(600, size); const w = ctx.measureText(en).width + size * 2;
  ctx.shadowColor = 'rgba(0,0,0,0.45)'; ctx.shadowBlur = 30;
  ctx.fillStyle = `rgba(${Math.min(255, rgb[0] - 40 + 40 * p) | 0},${(rgb[1] * 0.9 + 20) | 0},${(rgb[2] * 0.6 + 30) | 0},0.95)`;
  const hh = size * 1.65;
  rr(ctx, -w / 2, -hh / 2, w, hh, 30); ctx.fill();
  ctx.shadowColor = 'transparent';
  warnIcon(ctx, -w / 2 + size * 0.85, -2, size * 0.83, '#fff', `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`);
  ctx.fillStyle = '#fff'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(en, -w / 2 + size * 1.5, 2);
  if (th) { ctx.font = F(600, 40); ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.shadowColor = 'rgba(0,0,0,0.8)'; ctx.shadowBlur = 14; ctx.fillText(th, 0, hh / 2 + 44); }
  ctx.restore();
}
function fade(ctx, t, tc, color, half = 0.25) {
  const d = Math.abs(t - tc); if (d >= half) return;
  ctx.save(); ctx.globalAlpha = 1 - d / half; ctx.fillStyle = color; ctx.fillRect(0, 0, W, H); ctx.restore();
}
function panel(ctx, x, y, w, h, a) {
  ctx.globalAlpha = a; ctx.shadowColor = 'rgba(0,0,0,0.35)'; ctx.shadowBlur = 20;
  ctx.fillStyle = 'rgba(10,18,36,0.82)'; rr(ctx, x, y, w, h, 26); ctx.fill(); ctx.shadowColor = 'transparent';
}
function arrowLine(ctx, x0, y0, x1, y1, col, wdt = 8, head = 22) {
  const a = Math.atan2(y1 - y0, x1 - x0);
  ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = wdt; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1 - Math.cos(a) * head * 0.8, y1 - Math.sin(a) * head * 0.8); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x1, y1);
  ctx.lineTo(x1 - Math.cos(a - 0.5) * head, y1 - Math.sin(a - 0.5) * head); ctx.lineTo(x1 - Math.cos(a + 0.5) * head, y1 - Math.sin(a + 0.5) * head); ctx.closePath(); ctx.fill();
}

// ---- title
function titleCard(ctx, t) {
  const a = sstep(0.2, 0.9, t) * (1 - sstep(7.3, 7.9, t)); if (a <= 0) return;
  const k = eout((t - 0.2) / 0.9), k2 = eout((t - 0.8) / 0.8);
  ctx.save(); ctx.globalAlpha = a; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(30,10,50,0.6)'; ctx.shadowBlur = 30;
  ctx.font = F(600, 32); ctx.fillStyle = '#ffd59a'; ctx.fillText('OIL & GAS 101 · EP.04', 510, 250 - (1 - k) * 24);
  ctx.font = F(600, 140); ctx.fillStyle = '#ffffff'; ctx.fillText('Well Control', 510, 372 - (1 - k) * 40);
  ctx.shadowBlur = 0; ctx.fillStyle = '#ffb627'; rr(ctx, 510 - 90 * k2, 470, 180 * k2, 10, 5); ctx.fill();
  ctx.shadowBlur = 26; ctx.globalAlpha = a * k2;
  ctx.font = F(600, 68); ctx.fillStyle = '#ffe3a3'; ctx.fillText('จาก Kick ถึง Kill', 510, 548);
  const q = sstep(2.4, 3.0, t);
  if (q > 0) {
    ctx.globalAlpha = a * q; ctx.font = F(600, 52); const qt = 'ถ้าเกิด Kick ต้องทำยังไง?'; const w = ctx.measureText(qt).width + 90;
    ctx.shadowBlur = 20; ctx.fillStyle = 'rgba(10,18,36,0.84)'; rr(ctx, 540 - w / 2, 1150 - 50 + (1 - q) * 20, w, 100, 50); ctx.fill();
    ctx.shadowBlur = 0; ctx.fillStyle = '#ef4444'; ctx.beginPath(); ctx.arc(540 - w / 2 + 44, 1150 + (1 - q) * 20, 9, 0, 7); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.fillText(qt, 552, 1152 + (1 - q) * 20);
  }
  ctx.restore();
}

// ---- numbered card (kick signs / circulations)
function stepCard(ctx, t, t0, t1, n, total, th, en, color, label = null) {
  const a = win(t, t0, t1, 0.45, 0.35); if (a <= 0) return;
  const k = eout((t - t0) / 0.5);
  const x = 70, y = 236, w = 880, h = 130;
  ctx.save(); ctx.globalAlpha = a; ctx.translate((1 - k) * -60, 0);
  ctx.shadowColor = 'rgba(0,0,0,0.35)'; ctx.shadowBlur = 24; ctx.shadowOffsetY = 8;
  ctx.fillStyle = 'rgba(255,255,255,0.96)'; rr(ctx, x, y, w, h, 30); ctx.fill(); ctx.shadowColor = 'transparent';
  ctx.fillStyle = color; rr(ctx, x, y, 16, h, 8); ctx.fill();
  ctx.beginPath(); ctx.arc(x + 82, y + h / 2, 44, 0, 7); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.font = F(600, label ? 30 : 56); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(label || String(n), x + 82, y + h / 2 + 2);
  ctx.textAlign = 'left'; ctx.fillStyle = HEX.ink;
  ctx.font = F(600, 54); const tw = ctx.measureText(th).width; if (tw > 640) ctx.font = F(600, Math.floor(54 * 640 / tw));
  ctx.fillText(th, x + 148, y + 52);
  ctx.font = F(600, 26); ctx.fillStyle = color; ctx.fillText(en, x + 150, y + 100);
  for (let i = 0; i < total; i++) { ctx.fillStyle = i < n ? color : 'rgba(15,23,42,0.15)'; ctx.beginPath(); ctx.arc(x + w - 40 - (total - 1 - i) * 26, y + 100, 8, 0, 7); ctx.fill(); }
  ctx.restore();
}

// ---- small two-bar pressure panel (kick: mud < formation)
function kickBars(ctx, t, a) {
  if (a <= 0) return;
  const k = eout((t - 9.8) / 1.0);
  const x = 700, y = 650, w = 252, h = 420;
  ctx.save(); panel(ctx, x, y, w, h, a);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = '#fff'; ctx.font = F(600, 30); ctx.fillText('Pressure', x + w / 2, y + 36);
  const bh = 200, by = y + 76;
  for (const [val, col, th, en, bx] of [[0.55 * k, '#60a5fa', 'Mud', 'Hydrostatic', x + 72], [0.85 * k, '#f87171', 'Gas', 'Pore Pressure', x + w - 72]]) {
    ctx.fillStyle = 'rgba(255,255,255,0.12)'; rr(ctx, bx - 28, by, 56, bh, 12); ctx.fill();
    const hh = Math.max(1, bh * val);
    ctx.fillStyle = col; rr(ctx, bx - 28, by + bh - hh, 56, hh, 12); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = F(600, 26); ctx.fillText(th, bx, by + bh + 28);
    ctx.font = F(400, 19); ctx.fillStyle = 'rgba(200,215,240,0.85)'; ctx.fillText(en, bx, by + bh + 54);
  }
  ctx.font = F(600, 44); ctx.fillStyle = '#fff'; ctx.fillText('<', x + w / 2, by + bh * 0.55);
  const bad = sstep(11.0, 11.4, t);
  ctx.globalAlpha = a * bad;
  ctx.fillStyle = HEX.danger; rr(ctx, x + 18, y + h - 66, w - 36, 50, 25); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.font = F(600, 26); ctx.fillText('ไม่พอ ✕', x + w / 2, y + h - 40);
  ctx.restore();
}

// ---- readout panel: title, big value, sub line
function readout(ctx, x, y, w, a, title, sub, value, unit, col, note = '', noteCol = HEX.danger) {
  if (a <= 0) return;
  const h = note ? 270 : 214;
  ctx.save(); panel(ctx, x, y, w, h, a);
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillStyle = '#fff'; ctx.font = F(600, 30); ctx.fillText(title, x + 26, y + 38);
  ctx.font = F(400, 20); ctx.fillStyle = 'rgba(200,215,240,0.85)'; ctx.fillText(sub, x + 26, y + 70);
  ctx.font = F(600, 76); ctx.fillStyle = col; const vw = ctx.measureText(value).width; ctx.fillText(value, x + 26, y + 138);
  ctx.font = F(600, 30); ctx.fillStyle = '#fff'; ctx.fillText(unit, x + 36 + vw, y + 150);
  if (note) { ctx.fillStyle = noteCol; rr(ctx, x + 20, y + h - 74, w - 40, 54, 27); ctx.fill(); ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.font = F(600, 28); ctx.fillText(note, x + w / 2, y + h - 46); }
  ctx.restore();
}

// ---- pressure dial
function dial(ctx, cx, cy, r, val, max, th, en, col, a) {
  if (a <= 0) return;
  const A0 = Math.PI * 0.75, A1 = Math.PI * 2.25;
  const ang = v => lerp(A0, A1, clamp(v / max));
  ctx.save(); ctx.globalAlpha = a;
  ctx.shadowColor = 'rgba(0,0,0,0.4)'; ctx.shadowBlur = 20;
  ctx.fillStyle = 'rgba(10,18,36,0.86)'; ctx.beginPath(); ctx.arc(cx, cy, r + 18, 0, 7); ctx.fill(); ctx.shadowColor = 'transparent';
  ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = 12; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.arc(cx, cy, r, A0, A1); ctx.stroke();
  if (val > 1) { ctx.strokeStyle = col; ctx.beginPath(); ctx.arc(cx, cy, r, A0, ang(val)); ctx.stroke(); }
  ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(255,255,255,0.6)';
  for (let i = 0; i <= 10; i++) { const q = lerp(A0, A1, i / 10); ctx.beginPath(); ctx.moveTo(cx + Math.cos(q) * (r - 22), cy + Math.sin(q) * (r - 22)); ctx.lineTo(cx + Math.cos(q) * (r - (i % 5 ? 30 : 38)), cy + Math.sin(q) * (r - (i % 5 ? 30 : 38))); ctx.stroke(); }
  const q = ang(val);
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(q) * (r - 34), cy + Math.sin(q) * (r - 34)); ctx.stroke();
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(cx, cy, 10, 0, 7); ctx.fill();
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = F(600, r * 0.36); ctx.fillStyle = '#fff'; ctx.fillText(String(Math.round(val / 10) * 10), cx, cy + r * 0.42);
  ctx.font = F(400, r * 0.17); ctx.fillStyle = 'rgba(200,215,240,0.9)'; ctx.fillText('psi', cx, cy + r * 0.68);
  // label pill under the dial
  ctx.font = F(600, 30); const w1 = ctx.measureText(th).width; ctx.font = F(400, 22); const w2 = ctx.measureText(en).width;
  const w = Math.max(w1, w2) + 44;
  ctx.fillStyle = col; rr(ctx, cx - w / 2, cy + r + 26, w, 76, 22); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.font = F(600, 30); ctx.fillText(th, cx, cy + r + 50);
  ctx.font = F(400, 22); ctx.fillText(en, cx, cy + r + 82);
  ctx.restore();
}

// ---- shut-in step strip
const SHUT = [
  { t: 42.5, th: 'Space Out' }, { t: 45.0, th: 'Pump Off' }, { t: 47.5, th: 'Close BOP' }, { t: 51.5, th: 'Close Choke' },
];
function shutStrip(ctx, t) {
  const A = win(t, 44.0, 56.0, 0.5, 0.4); if (A <= 0) return;
  const x0 = 190, dx = 213, y = 282;
  ctx.save();
  panel(ctx, 70, 232, 880, 120, A * 0.95);
  ctx.globalAlpha = A; ctx.lineWidth = 5; ctx.lineCap = 'round';
  const cur = SHUT.reduce((c, s, i) => (t >= s.t ? i : c), 0);
  for (let i = 0; i < 3; i++) {
    const reach = sstep(SHUT[i + 1].t - 0.2, SHUT[i + 1].t + 0.5, t);
    ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.beginPath(); ctx.moveTo(x0 + dx * i, y); ctx.lineTo(x0 + dx * (i + 1), y); ctx.stroke();
    if (reach > 0) { ctx.strokeStyle = HEX.safe; ctx.beginPath(); ctx.moveTo(x0 + dx * i, y); ctx.lineTo(x0 + dx * (i + reach), y); ctx.stroke(); }
  }
  SHUT.forEach((s, i) => {
    const on = t >= s.t - 0.15, act = i === cur;
    const cx = x0 + dx * i, r = 22 + 8 * (act ? 1 : 0);
    ctx.fillStyle = on ? (act ? '#ffd166' : HEX.safe) : 'rgba(255,255,255,0.15)';
    ctx.beginPath(); ctx.arc(cx, y, r, 0, 7); ctx.fill();
    if (act) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.stroke(); }
    ctx.fillStyle = on ? HEX.ink : 'rgba(255,255,255,0.5)'; ctx.font = F(600, 24); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(on && !act ? '✓' : String(i + 1), cx, y + 1);
    ctx.font = F(act ? 600 : 400, 26); ctx.fillStyle = on ? (act ? '#ffd166' : '#ffffff') : 'rgba(255,255,255,0.4)';
    ctx.fillText(s.th, cx, y + 46);
  });
  ctx.restore();
}

// ---- kill mud weight formula card
function kmwCard(ctx, t) {
  const a = win(t, 63.5, 70.0, 0.5, 0.3); if (a <= 0) return;
  const x = 70, y = 1040, w = 880, h = 236;
  ctx.save(); ctx.globalAlpha = a;
  ctx.shadowColor = 'rgba(0,0,0,0.35)'; ctx.shadowBlur = 24; ctx.shadowOffsetY = 8;
  ctx.fillStyle = 'rgba(255,255,255,0.97)'; rr(ctx, x, y, w, h, 30); ctx.fill(); ctx.shadowColor = 'transparent';
  ctx.fillStyle = '#2563eb'; rr(ctx, x, y, 16, h, 8); ctx.fill();
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.font = F(600, 30); ctx.fillStyle = '#2563eb'; ctx.fillText('Kill Mud Weight', x + 44, y + 40);
  ctx.font = F(600, 34); ctx.fillStyle = HEX.ink; ctx.fillText('KMW = OMW + SIDPP ÷ (0.052 × TVD)', x + 44, y + 92);
  const l2 = sstep(65.0, 65.5, t), l3 = sstep(66.8, 67.3, t);
  ctx.globalAlpha = a * l2; ctx.font = F(400, 32); ctx.fillStyle = '#334155';
  ctx.fillText('= 10.0 + 520 ÷ (0.052 × 10,000)', x + 44, y + 142);
  ctx.globalAlpha = a * l3; ctx.font = F(600, 50); ctx.fillStyle = '#2563eb';
  ctx.fillText('= 11.0 ppg', x + 44, y + 196);
  ctx.font = F(400, 24); ctx.fillStyle = '#64748b'; ctx.textAlign = 'right';
  ctx.fillText('OMW 10.0 ppg · TVD 10,000 ft', x + w - 30, y + 200);
  ctx.restore();
}

// ---- Wait & Weight note
function wwCard(ctx, t) {
  const a = win(t, 105.2, 110.0, 0.5, 0.3); if (a <= 0) return;
  const k = eout((t - 105.2) / 0.5);
  const x = 70, y = 860, w = 880, h = 300;
  ctx.save(); ctx.globalAlpha = a; ctx.translate(0, (1 - k) * 30);
  ctx.shadowColor = 'rgba(0,0,0,0.35)'; ctx.shadowBlur = 24; ctx.shadowOffsetY = 8;
  ctx.fillStyle = 'rgba(255,255,255,0.97)'; rr(ctx, x, y, w, h, 30); ctx.fill(); ctx.shadowColor = 'transparent';
  ctx.fillStyle = '#7c3aed'; rr(ctx, x, y, 16, h, 8); ctx.fill();
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.font = F(600, 28); ctx.fillStyle = '#7c3aed'; ctx.fillText('อีกวิธีหนึ่ง', x + 44, y + 44);
  ctx.font = F(600, 58); ctx.fillStyle = HEX.ink; ctx.fillText('Wait & Weight', x + 44, y + 108);
  const rows = [['Driller\'s Method', '2 รอบ · เริ่มได้ทันที'], ['Wait & Weight', '1 รอบ · ผสม Kill Mud ก่อน']];
  rows.forEach(([a1, b1], i) => {
    const yy = y + 182 + i * 62;
    ctx.fillStyle = i ? '#7c3aed' : '#0f766e'; ctx.beginPath(); ctx.arc(x + 58, yy, 10, 0, 7); ctx.fill();
    ctx.font = F(600, 32); ctx.fillStyle = HEX.ink; ctx.fillText(a1, x + 84, yy);
    ctx.font = F(400, 30); ctx.fillStyle = '#334155'; ctx.textAlign = 'right'; ctx.fillText(b1, x + w - 36, yy); ctx.textAlign = 'left';
  });
  ctx.restore();
}

function endCard(ctx, t) {
  const a = win(t, 110.4, 121, 0.7, 0.1); if (a <= 0) return;
  const k = eout((t - 110.4) / 0.8);
  ctx.save(); ctx.globalAlpha = a; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(20,10,40,0.6)'; ctx.shadowBlur = 28;
  ctx.font = F(600, 30); ctx.fillStyle = '#ffd59a'; ctx.fillText('OIL & GAS 101 · EP.04', 510, 258 - (1 - k) * 20);
  ctx.font = F(600, 120); ctx.fillStyle = '#fff'; ctx.fillText('Well Control', 510, 360 - (1 - k) * 30);
  ctx.shadowBlur = 0; ctx.fillStyle = '#ffb627'; rr(ctx, 510 - 80 * k, 440, 160 * k, 10, 5); ctx.fill();
  ctx.shadowBlur = 24;
  ctx.font = F(600, 56); ctx.fillStyle = '#ffffff'; ctx.fillText('เห็นเร็ว · ปิดไว · Kill ปลอดภัย', 510, 515);
  const chips = ['Kick Signs', 'Shut-in', 'SIDPP / SICP', 'Kill Mud', 'Driller\'s Method'];
  const u = sstep(111.6, 112.2, t);
  if (u > 0) {
    ctx.globalAlpha = a * u; ctx.font = F(600, 28); ctx.shadowBlur = 10;
    const ws = chips.map(c => ctx.measureText(c).width + 40), tot = ws.reduce((s, v) => s + v, 0) + 14 * 4;
    const sc = Math.min(1, 880 / tot);
    let cx = 540 - Math.min(tot, 880) / 2;
    chips.forEach((c, i) => {
      const w = ws[i] * sc;
      ctx.fillStyle = 'rgba(10,18,36,0.8)'; rr(ctx, cx, 600, w, 52, 26); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.font = F(600, 28 * sc); ctx.fillText(c, cx + w / 2, 627);
      cx += w + 14 * sc;
    });
  }
  ctx.restore();
}

function drawOverlay(ctx, t) {
  applyState(t);
  ctx.save(); ctx.textBaseline = 'middle';
  const L = O.sets.L, WG = O.sets.W, B = O.sets.B;
  if (t < 8.2) titleCard(ctx, t);
  // ---- 01 KICK
  if (t >= 8 && t < 20.2) {
    chapter(ctx, t, 8.0, 20.0, '01', 'Kick คืออะไร?', 'WHAT IS A KICK');
    kickBars(ctx, t, win(t, 9.6, 15.0, 0.5, 0.4));
    callout(ctx, t, 11.2, 15.0, [-6, -38.8, 0], WG, 300, 1170, 'Gas Zone', 'Pore Pressure สูง', HEX.danger);
    alarm(ctx, t, 12.5, 15.2, 'KICK!', 'Gas ไหลเข้าหลุม', 470, [255, 20, 20], 84, 510);
    callout(ctx, t, 16.4, 19.9, [-1.25, -24, 0.3], WG, 290, 760, 'Primary Barrier', 'Mud', HEX.mud);
    callout(ctx, t, 16.8, 19.9, O.bopTopW ? [0, 0, 0] : [0, 0, 0], O.bopTopW, 330, 470, 'Secondary Barrier', 'BOP', '#f59e0b');
  }
  // ---- 02 KICK SIGNS
  if (t >= 20 && t < 42.2) {
    chapter(ctx, t, 20.0, 42.0, '02', 'สัญญาณเตือน Kick', 'KICK WARNING SIGNS');
    stepCard(ctx, t, 22.0, 27.0, 1, 3, 'Pit Gain', 'MUD IN THE PITS RISES', '#ef4444');
    stepCard(ctx, t, 27.0, 34.0, 2, 3, 'Flow เพิ่มขึ้น', 'RETURN FLOW INCREASE', '#f97316');
    stepCard(ctx, t, 34.0, 42.0, 3, 3, 'Flow Check', 'PUMP OFF — STILL FLOWING?', '#eab308');
    // pit gain
    const pv = lerp(400, 412, sstep(21.2, 26.0, t));
    readout(ctx, 640, 520, 310, win(t, 22.4, 27.0, 0.4, 0.35), 'Pit Volume', 'PVT · Mud Tank', pv.toFixed(0), 'bbl', pv > 402 ? '#f87171' : '#fff', pv > 402 ? `+${(pv - 400).toFixed(0)} bbl ▲` : '');
    callout(ctx, t, 22.6, 26.9, [18.4, MUDY + pitLift(t) + 0.1, -2.0], L, 300, 1120, 'Mud Level', 'สูงขึ้น ▲', HEX.danger);
    // flow increase
    const fo = lerp(50, 68, sstep(27.8, 29.5, t));
    readout(ctx, 640, 1000, 310, win(t, 27.6, 34.0, 0.4, 0.35), 'Flow Out', 'Flow Show · Flowline', fo.toFixed(0), '%', fo > 52 ? '#fb923c' : '#fff', fo > 52 ? 'ไหลกลับมากขึ้น ▲' : '', '#f97316');
    callout(ctx, t, 28.0, 33.9, [12.25, 5.2, -4.6], L, 330, 560, 'Flowline', 'Mud ไหลแรงขึ้น', '#f97316');
    // flow check
    const pumpOff = sstep(35.4, 35.9, t);
    if (t > 34.4 && t < 42.2) {
      const a = win(t, 34.6, 42.0, 0.4, 0.35);
      ctx.save(); panel(ctx, 600, 520, 350, 230, a); ctx.globalAlpha = a;
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.font = F(600, 32);
      ctx.fillStyle = '#fff'; ctx.fillText('Mud Pump', 628, 580);
      ctx.fillStyle = pumpOff > 0.5 ? HEX.danger : HEX.safe; rr(ctx, 818, 556, 108, 48, 24); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.fillText(pumpOff > 0.5 ? 'OFF' : 'ON', 872, 581);
      const fl = sstep(37.0, 37.4, t);
      ctx.globalAlpha = a * fl; ctx.textAlign = 'left'; ctx.fillStyle = '#fff'; ctx.fillText('Flow', 628, 670);
      ctx.fillStyle = HEX.danger; rr(ctx, 818, 646, 108, 48, 24); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.fillText('ไหล!', 872, 671);
      ctx.restore();
    }
    callout(ctx, t, 35.6, 39.2, [24.8, 2.6, 7.2], L, 700, 1120, 'Mud Pump', 'หยุดแล้ว', '#3b82f6');
    callout(ctx, t, 37.0, 41.9, [7.5, 5.8, -3.3], L, 300, 880, 'Flowline', 'ยังไหลอยู่', HEX.danger);
    alarm(ctx, t, 39.5, 42.0, 'KICK!', 'ต้อง Shut-in ทันที', 470, [255, 20, 20], 70, 510);
  }
  // ---- 03 SHUT-IN
  if (t >= 42 && t < 56.2) {
    chapter(ctx, t, 42.0, 56.0, '03', 'Shut-in ปิดหลุม', 'SHUT IN THE WELL');
    shutStrip(ctx, t);
    callout(ctx, t, 42.8, 46.6, [0, 0, 0], O.tjMarker, 720, 520, 'Tool Joint', 'ยกพ้น Annular', '#94a3b8');
    if (t > 45.0 && t < 47.6) pill(ctx, 300, 1160, 'Mud Pump', 'OFF', HEX.danger, win(t, 45.0, 47.5, 0.3, 0.3), 36);
    callout(ctx, t, 47.7, 51.4, O.markB.ann, B, 300, 470, 'Annular', 'บีบรอบ Pipe', '#f59e0b');
    callout(ctx, t, 49.2, 52.6, O.markB.ram, B, 300, 1170, 'Pipe Ram', 'ปิด', '#3b82f6');
    callout(ctx, t, 51.7, 55.8, O.markB.hcr, B, 380, 470, 'HCR Valve', 'เปิด', HEX.safe);
    callout(ctx, t, 52.2, 55.8, O.markB.choke, B, 760, 1170, 'Choke', 'ปิด', HEX.danger);
    badge(ctx, t, 53.4, 56.0, 600, 620, 'WELL SHUT-IN', 'ปิดหลุมแล้ว ✓', '#16a34a', 50);
  }
  // ---- 04 READ PRESSURES
  if (t >= 56 && t < 70.2) {
    chapter(ctx, t, 56.0, 70.0, '04', 'อ่าน Pressure', 'SIDPP & SICP');
    const da = win(t, 56.4, 70.0, 0.5, 0.3);
    dial(ctx, 210, 640, 100, dpPsi(t), 1000, 'SIDPP', 'Drill Pipe', '#3b82f6', da);
    dial(ctx, 530, 640, 100, csgPsi(t), 1000, 'SICP', 'Casing', '#f97316', da * sstep(58.4, 58.9, t));
    callout(ctx, t, 60.8, 63.4, [-1.25, -26.5, 0.3], WG, 600, 1120, 'Gas ใน Annulus', 'SICP สูงกว่า', HEX.danger);
    kmwCard(ctx, t);
  }
  // ---- 05 DRILLER'S METHOD
  if (t >= 70 && t < 100.2) {
    chapter(ctx, t, 70.0, 100.0, '05', 'Driller\'s Method', 'KILL THE WELL · 2 CIRCULATIONS');
    stepCard(ctx, t, 72.0, 86.0, 1, 2, 'ไล่ Gas ออก', 'CIRCULATION 1 · ORIGINAL MUD', '#f97316', 'รอบ 1');
    stepCard(ctx, t, 86.0, 100.0, 2, 2, 'Kill Mud 11.0 ppg', 'CIRCULATION 2 · KILL MUD', '#2563eb', 'รอบ 2');
    if (t < 80) {
      const ga = win(t, 72.4, 80.0, 0.4, 0.3);
      dial(ctx, 830, 560, 82, dpPsi(t), 1000, 'Drill Pipe', 'คงที่', '#3b82f6', ga);
      dial(ctx, 830, 850, 82, csgPsi(t), 1000, 'Casing', 'ปรับด้วย Choke', '#f97316', ga);
      const yc = slugY(t);
      callout(ctx, t, 73.2, 79.0, [-1.25, Math.min(yc + 6, 0), 0.3], WG, 300, 560, 'Gas', 'ขยายตัวตอนขึ้น', HEX.danger);
      if (t > 74.6) pill(ctx, 300, 1170, 'Bottomhole Pressure', 'คงที่ ✓', HEX.safe, win(t, 74.6, 80.0, 0.3, 0.3), 32);
    } else if (t < 86) {
      callout(ctx, t, 80.6, 83.5, [0, 0, 0], O.chokeMarker, 320, 560, 'Choke Manifold', '', '#f59e0b');
      callout(ctx, t, 81.2, 83.8, [-13.3, 6.6, 4.6], L, 680, 760, 'Mud Gas Separator', '', '#d97706');
      callout(ctx, t, 84.4, 86.1, [-45.5, 3.0, 4], L, 330, 560, 'Flare', 'เผา Gas', HEX.danger);
    } else {
      const ga = win(t, 86.4, 100.0, 0.4, 0.3);
      dial(ctx, 210, 640, 100, dpPsi(t), 1000, 'Drill Pipe', 'ลดลงจนถึง Bit', '#3b82f6', ga);
      dial(ctx, 530, 640, 100, csgPsi(t), 1000, 'Casing', 'ลดลงเป็น 0', '#f97316', ga);
      const F = killF(t), cA = F - TA - TB - TCt;
      if (F > 0.05) callout(ctx, t, 87.0, 90.6, [0.3, Y_TOP - Math.min(12 * F, Y_TOP - YBT), 0.3], WG, 640, 1110, 'Kill Mud', 'ลง Drill Pipe ↓', '#2563eb');
      if (cA > 0) callout(ctx, t, 91.2, 99.6, [1.25, Math.min(YB + 1.4 + 3.0 * cA, -1), 0.3], WG, 640, 1110, 'Kill Mud', 'ขึ้น Annulus ↑', '#2563eb');
    }
  }
  // ---- 06 WELL DEAD
  if (t >= 100 && t < 110.2) {
    chapter(ctx, t, 100.0, 110.0, '06', 'Kill สำเร็จ', 'WELL UNDER CONTROL');
    const da = win(t, 100.0, 105.4, 0.3, 0.4);
    dial(ctx, 210, 640, 100, dpPsi(t), 1000, 'Drill Pipe', 'Flow Check', '#3b82f6', da);
    dial(ctx, 530, 640, 100, csgPsi(t), 1000, 'Casing', 'ไม่มี Flow', '#f97316', da);
    badge(ctx, t, 101.6, 105.2, 520, 1100, 'WELL UNDER CONTROL', 'ปลอดภัย ✓', '#16a34a', 50);
    callout(ctx, t, 102.6, 105.2, [0, 0, 0], O.bopTopW, 700, 760, 'BOP', 'เปิดได้', HEX.safe);
    wwCard(ctx, t);
  }
  if (t >= 110) endCard(ctx, t);
  // ---- transitions
  for (const tc of [20, 27, 34, 42, 56, 70, 80, 86, 100]) fade(ctx, t, tc, '#06101e');
  fade(ctx, t, 8.0, '#06101e', 0.3);
  fade(ctx, t, 110, '#06101e', 0.3);
  if (t > 119.3) { ctx.save(); ctx.globalAlpha = sstep(119.3, 120, t); ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); ctx.restore(); }
  ctx.restore();
}

// ---------------------------------------------------------------- captions & cues
const captions = [
  { t0: 0, t1: 7, th: 'Kick คือสัญญาณแรกก่อนจะเกิด Blowout', en: 'A kick is the first warning before a blowout' },
  { t0: 7, t1: 13.5, th: 'Mud เบากว่า Pore Pressure Gas จึงไหลเข้าหลุม', en: 'Mud is lighter than pore pressure, so gas flows in' },
  { t0: 13.5, t1: 20, th: 'Mud คือ Primary Barrier · BOP คือ Secondary', en: 'Mud is the primary barrier; the BOP is the secondary' },
  { t0: 20, t1: 27, th: 'สัญญาณที่ 1: Pit Gain ระดับ Mud ในบ่อสูงขึ้น', en: 'Sign 1: pit gain — the mud level in the pits rises' },
  { t0: 27, t1: 34, th: 'สัญญาณที่ 2: Flow ที่ไหลกลับมาเพิ่มขึ้น', en: 'Sign 2: more mud flows back than is pumped in' },
  { t0: 34, t1: 42, th: 'หยุด Pump แล้วยังไหล = Flow Check เป็นบวก', en: 'Pump off but still flowing: a positive flow check' },
  { t0: 42, t1: 49, th: 'Shut-in: Space Out แล้วหยุด Pump', en: 'Shut in: space out, then stop the pumps' },
  { t0: 49, t1: 56, th: 'ปิด BOP และ Choke หลุมถูกปิดสนิท', en: 'Close the BOP and the choke — the well is shut in' },
  { t0: 56, t1: 63, th: 'รอให้นิ่ง แล้วอ่าน SIDPP และ SICP', en: 'Let it stabilise, then read SIDPP and SICP' },
  { t0: 63, t1: 70, th: 'ใช้ SIDPP คำนวณ Kill Mud Weight', en: 'SIDPP gives the kill mud weight' },
  { t0: 70, t1: 74.5, th: 'รอบ 1: ไล่ Gas ออกทาง Choke', en: 'Driller\'s Method, circulation 1: remove the gas' },
  { t0: 74.5, t1: 80, th: 'ปรับ Choke คุม Bottomhole Pressure', en: 'The choke keeps bottomhole pressure constant' },
  { t0: 80, t1: 86.5, th: 'Gas ผ่าน Mud Gas Separator ไปเผาที่ Flare', en: 'Gas goes through the separator and burns at the flare' },
  { t0: 86.5, t1: 93, th: 'รอบ 2: ปั๊ม Kill Mud 11.0 ppg ลงไป', en: 'Circulation 2: pump 11.0 ppg kill mud' },
  { t0: 93, t1: 100, th: 'Kill Mud เต็มหลุม Casing Pressure เหลือ 0', en: 'Kill mud fills the well; casing pressure drops to zero' },
  { t0: 100, t1: 106, th: 'Flow Check ไม่ไหล = Well Under Control', en: 'No flow on the check: the well is under control' },
  { t0: 106, t1: 111.5, th: 'อีกวิธี: Wait & Weight ทำรอบเดียวจบ', en: 'Wait & Weight does it in a single circulation' },
  { t0: 111.5, t1: 120, th: 'เห็นเร็ว ปิดไว ไม่มี Blowout', en: 'Spot it early, shut in fast — no blowout' },
];

const cues = [
  { t: 0.3, sfx: 'whoosh' }, { t: 1.0, sfx: 'impact' }, { t: 2.5, sfx: 'blip' },
  { t: 7.8, sfx: 'whoosh' }, { t: 9.8, sfx: 'blip' }, { t: 10.5, sfx: 'bubble' }, { t: 11.2, sfx: 'blip' }, { t: 11.8, sfx: 'bubble' },
  { t: 12.5, sfx: 'alarm' }, { t: 14.0, sfx: 'bubble' }, { t: 16.0, sfx: 'whoosh' }, { t: 16.4, sfx: 'blip' }, { t: 16.8, sfx: 'blip' },
  { t: 19.8, sfx: 'whoosh' }, { t: 22.0, sfx: 'blip' }, { t: 22.6, sfx: 'blip' }, { t: 24.0, sfx: 'bubble' },
  { t: 26.8, sfx: 'whoosh' }, { t: 27.6, sfx: 'blip' }, { t: 28.0, sfx: 'blip' }, { t: 28.6, sfx: 'hiss' },
  { t: 33.8, sfx: 'whoosh' }, { t: 34.6, sfx: 'blip' }, { t: 35.5, sfx: 'clunk' }, { t: 37.0, sfx: 'blip' }, { t: 37.4, sfx: 'bubble' },
  { t: 39.5, sfx: 'alarm' },
  { t: 41.8, sfx: 'whoosh' }, { t: 42.8, sfx: 'clunk' }, { t: 45.0, sfx: 'blip' }, { t: 45.4, sfx: 'clunk' },
  { t: 47.5, sfx: 'blip' }, { t: 47.8, sfx: 'hiss' }, { t: 48.6, sfx: 'clunk' }, { t: 49.3, sfx: 'hiss' }, { t: 50.1, sfx: 'impact' },
  { t: 51.5, sfx: 'blip' }, { t: 51.7, sfx: 'hiss' }, { t: 53.4, sfx: 'success' },
  { t: 55.8, sfx: 'whoosh' }, { t: 56.8, sfx: 'blip' }, { t: 58.6, sfx: 'blip' }, { t: 60.8, sfx: 'blip' },
  { t: 63.5, sfx: 'blip' }, { t: 65.0, sfx: 'blip' }, { t: 66.8, sfx: 'clunk' },
  { t: 69.8, sfx: 'whoosh' }, { t: 70.6, sfx: 'pump' }, { t: 72.0, sfx: 'blip' }, { t: 73.2, sfx: 'bubble' }, { t: 74.6, sfx: 'blip' },
  { t: 76.5, sfx: 'bubble' }, { t: 78.5, sfx: 'hiss' },
  { t: 79.8, sfx: 'whoosh' }, { t: 80.6, sfx: 'blip' }, { t: 80.9, sfx: 'fire' }, { t: 81.2, sfx: 'blip' }, { t: 83.8, sfx: 'blip' },
  { t: 85.8, sfx: 'whoosh' }, { t: 86.4, sfx: 'pump' }, { t: 87.0, sfx: 'blip' }, { t: 89.4, sfx: 'blip' }, { t: 91.2, sfx: 'blip' }, { t: 98.5, sfx: 'blip' },
  { t: 99.8, sfx: 'whoosh' }, { t: 100.4, sfx: 'clunk' }, { t: 101.6, sfx: 'success' }, { t: 102.6, sfx: 'blip' },
  { t: 105.0, sfx: 'whoosh' }, { t: 105.4, sfx: 'blip' },
  { t: 109.8, sfx: 'whoosh' }, { t: 111.6, sfx: 'blip' },
];

export default { DURATION, init, renderFrame, drawOverlay, captions, cues };
