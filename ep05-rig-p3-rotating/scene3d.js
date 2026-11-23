// scene3d.js — namman.story EP05 "Drilling Rig 101" Part 3/5: ROTATING SYSTEM, 153 s, 1080x1920.
// Contract: see SPEC.md (+ ../bop-3d/SPEC.md). Rig, mud system and well-control kit reused from EP03/EP04; meshes are tagged by rig system for highlight mode. renderFrame(t) / drawOverlay(ctx,t) are pure functions of t.
// Calmer pacing than EP02: captions 5–8 s, labels held ≥3 s, max 2 new labels at once, camera holds on key views.
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const DURATION = 153;
let THREE, renderer, scene, camera;
let W = 1080, H = 1920;

// world sets (far apart; only the active one is visible)
const OFF = { L: [0, 0, 0], S: [0, 0, -5000] };
// rig-system tagging: every mesh made by add() records SYS.cur, so a whole system can be highlighted / dimmed
const SYS = { cur: null };

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
  const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); parent.add(m); m.userData.sys = SYS.cur; return m;
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
  SYS.cur = 'wc'; buildSurfaceBOP(G);
  SYS.cur = 'hoist';
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
  SYS.cur = 'rotate'; add(G, cyl(1.1, 0.4, 12), lam(0x334155), 0, 7.4, 0); SYS.cur = 'hoist';
  add(G, lattice(7.2, 34, 4.3, 1.3, 6, 0.32, 0.17, 0.12), lam(0xeef2f6));
  add(G, box(3.4, 2.0, 3.4), lam(0xe11d48), 0, 42.2, 0);
  add(G, box(0.9, 0.9, 0.9), basic(0xfff1c2), 0, 43.6, 0);
  SYS.cur = null;
  // rig lights (dusk)
  const lg = [];
  for (const [y, s] of [[14, 3.6], [24, 2.8], [34, 1.95]]) for (const [sx, sz] of [[1, 1], [-1, 1], [1, -1]]) lg.push(box(0.45, 0.3, 0.3).translate(sx * s, y, sz * s));
  add(G, strip(lg), basic(0xfff3c4));
  // doghouse + V-door + pipe racks
  add(G, box(4, 3, 5), lam(0x7aa6d6), -5.4, 8.7, 5);
  add(G, box(4.1, 0.9, 5.1), basic(0xffe9b0), -5.4, 9.2, 5);
  add(G, cylBetween([0, 7.0, -7.7], [0, 1.2, -21], 0.9, 4), lam(0x6b7280));
  add(G, box(1.8, 1.2, 14), lam(0x6b7280), 0, 0.6, -28);
  const pr = [];
  for (const s of [-1, 1]) for (let i = 0; i < 9; i++) pr.push(zCyl(0.18, 13, 6).translate(s * (2.6 + (i % 3) * 0.42), 0.9 + Math.floor(i / 3) * 0.38, -28));
  add(G, strip(pr), lam(0x8b96a5));
  // ---- power system (generator sets, fuel, SCR/VFD house, cables)
  SYS.cur = 'power'; buildPower(G);
  SYS.cur = 'hoist'; buildDrawworks(G);
  // ---- top drive + traveling block + hook + links/elevator: all move with yb (top drive height)
  SYS.cur = 'rotate';
  const TD = O.topDrive = new THREE.Group(); TD.position.set(0, 20.6, 0); G.add(TD);
  add(TD, box(1.4, 2.3, 1.2), lam(0xdc2626), 0, 0, 0);
  add(TD, cyl(0.5, 0.9, 10), lam(0x7f1d1d), 0, 1.55, 0);
  add(TD, box(0.4, 2.6, 0.3), lam(0x374151), 0, 0.2, -0.75);
  add(TD, cylBetween([0, 1.2, 0], [0, 1.85, 0], 0.16, 8), lam(0x94a3b8));
  add(G, box(0.35, 30, 0.35), lam(0x4b5563), 0, 23.5, -1.25); // guide rail
  SYS.cur = 'hoist';
  // links (bails) + elevator hang below the top drive
  add(TD, strip([box(0.1, 2.3, 0.1).translate(-0.42, -2.25, 0.2), box(0.1, 2.3, 0.1).translate(0.42, -2.25, 0.2)]), lam(0x9ca3af));
  O.elev = add(TD, new THREE.TorusGeometry(0.34, 0.13, 6, 14).rotateX(Math.PI / 2), lam(0xf59e0b), 0, -3.35, 0);
  add(TD, strip([box(0.28, 0.2, 0.2).translate(-0.42, -3.35, 0.2), box(0.28, 0.2, 0.2).translate(0.42, -3.35, 0.2)]), lam(0xf59e0b));
  O.tblock = new THREE.Group(); G.add(O.tblock);
  add(O.tblock, box(1.6, 1.8, 1.0), lam(0xfacc15));
  add(O.tblock, strip([0, 1, 2, 3, 4].map(k => zCyl(0.7, 0.1, 12).translate(-0.6 + k * 0.3, 0.35, 0))), lam(0xca8a04));
  add(O.tblock, cylBetween([0, -0.9, 0], [0, -2.3, 0], 0.13, 6), lam(0x374151));
  add(O.tblock, new THREE.TorusGeometry(0.32, 0.11, 6, 12, Math.PI * 1.5).rotateZ(Math.PI * 0.75), lam(0x374151), 0, -2.6, 0);
  O.blines = [];
  for (let k = 0; k < 10; k++) {
    const g = cyl(0.035, 1, 3); g.translate(0, 0.5, 0);
    O.blines.push(add(G, g, lam(0x1f2937), -0.68 + k * 0.15, 26, (k % 2 ? 0.25 : -0.25)));
  }
  SYS.cur = 'rotate';
  // drill pipe from the rotary up to the top drive (length follows the block)
  const dpg = cyl(0.17, 1, 8); dpg.translate(0, 0.5, 0);
  O.dp = add(G, dpg, lam(0x8792a2), 0, 7.4, 0);
  SYS.cur = null;
  // ---- mud system + well-control equipment
  SYS.cur = 'circ'; buildMudSystem(G);
  SYS.cur = 'wc'; buildWellControl(G);
  SYS.cur = null;
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

// ---------------------------------------------------------------- POWER system (Part 1 focus)
const GENX = [-17, -20.6, -24.2];
const SYSCOL = { power: 0xf59e0b, hoist: 0x3b82f6, rotate: 0xef4444, circ: 0x14b8a6, wc: 0xa855f7 };
const SYSHEX = { power: '#f59e0b', hoist: '#3b82f6', rotate: '#ef4444', circ: '#14b8a6', wc: '#a855f7' };
function labelTex(lines, bg = '#e5e7eb', fg = '#1f2937', w = 1024, h = 256) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const x = c.getContext('2d');
  x.fillStyle = bg; x.fillRect(0, 0, w, h);
  x.textAlign = 'center'; x.textBaseline = 'middle';
  lines.forEach(([txt, size, col, y]) => { x.fillStyle = col || fg; fitFont(x, txt, 600, size, w - 60); x.fillText(txt, w / 2, y); });
  grime(x, w, h, 260, 811, 0.18);
  return canvasTex(c);
}
const CAB = {
  gen: GENX.map((gx, i) => [[gx + 0.9, 0.9, -11.7], [gx + 0.9, 0.22, -12.3 - 0.32 * i], [-13.1, 0.22, -12.3 - 0.32 * i]]),
  dw: [[-5.0, 0.22, -11.6], [-3.0, 0.22, -11.6], [-3.0, 0.22, 9.4], [1.5, 0.22, 9.4], [1.5, 7.1, 9.4], [1.5, 7.45, 7.0]],
  pump: [[-5.0, 0.22, -12.9], [29.2, 0.22, -12.9], [29.2, 0.22, 7.2], [28.3, 0.7, 7.2]],
  td: [[1.5, 7.45, 7.0], [3.8, 7.45, 3.8], [3.8, 15.5, 3.2], [1.4, 19.4, 1.1], [0.7, 20.6, 0.6]],
};
function buildPower(G) {
  const skid = lam(0x334155), dark = lam(0x1f2937);
  O.stacks = [];
  O.genGroups = GENX.map((gx, i) => {
    const g = new THREE.Group(); g.position.set(gx, 0, -8); G.add(g);
    add(g, box(3.2, 0.3, 7.4), skid, 0, 0.15, 0);
    add(g, box(2.6, 2.1, 3.8), lam(0xe2b33c), 0, 1.35, -1.3);            // diesel engine
    add(g, strip([box(2.7, 0.18, 3.9).translate(0, 2.45, -1.3), box(0.2, 0.6, 3.4).translate(-1.0, 2.6, -1.3), box(0.2, 0.6, 3.4).translate(1.0, 2.6, -1.3)]), lam(0xc99a2e));
    add(g, box(2.4, 1.9, 2.2), lam(0x2f6f3e), 0, 1.25, 1.95);             // generator
    add(g, box(2.5, 0.5, 0.6), lam(0x4b5563), 0, 2.45, 1.95);
    add(g, box(3.0, 2.6, 0.5), lam(0x9ca3af), 0, 1.6, -3.45);             // radiator
    add(g, strip([0, 1, 2, 3, 4, 5].map(k => box(2.7, 0.08, 0.1).translate(0, 0.6 + k * 0.38, -3.72))), dark);
    add(g, cyl(0.2, 1.9, 8), dark, 0.7, 3.3, -1.8);                       // exhaust stack
    add(g, cyl(0.3, 0.12, 8), dark, 0.7, 4.3, -1.8);
    O.stacks.push([gx + 0.7, 4.45, -9.8]);
    return g;
  });
  O.mk.engine = mark(G, -20.6, 2.5, -9.3); O.mk.gen = mark(G, -20.6, 2.3, -6.0);
  // fuel tank (with namman.story easter egg)
  add(G, xCyl(1.4, 9, 14), lam(0xf1f5f9), -16, 1.7, -24);
  add(G, strip([box(0.4, 0.5, 2.4).translate(-19.5, 0.25, -24), box(0.4, 0.5, 2.4).translate(-12.5, 0.25, -24)]), skid);
  add(G, new THREE.PlaneGeometry(4.2, 1.1), new THREE.MeshLambertMaterial({ map: labelTex([['DIESEL', 120, '#b91c1c', 92], ['namman.story · 60,000 L', 56, '#1f2937', 198]], '#f8fafc'), emissive: 0x1a1a1a }), -16, 1.75, -22.58);
  add(G, pipeRun([[-17.5, 0.35, -22.6], [-17.5, 0.35, -12.4], [-24.2, 0.35, -12.4]], 0.07, 6), lam(0x6b7280));
  O.mk.fuel = mark(G, -16, 3.2, -23.4);
  // SCR / VFD house
  add(G, box(8, 3.2, 3.2), lam(0xe5e7eb), -9, 1.6, -12);
  add(G, box(8.2, 0.25, 3.4), lam(0x94a3b8), -9, 3.3, -12);
  add(G, box(0.9, 2.1, 0.08), lam(0x64748b), -11.6, 1.15, -10.36);
  add(G, strip([box(1.1, 0.8, 0.8).translate(-7.0, 3.8, -12.5), box(1.1, 0.8, 0.8).translate(-5.6, 3.8, -12.5)]), lam(0xcbd5e1));
  add(G, new THREE.PlaneGeometry(4.6, 1.2), new THREE.MeshLambertMaterial({ map: labelTex([['SCR / VFD HOUSE', 110, '#1f2937', 96], ['600 V AC · DANGER HIGH VOLTAGE', 50, '#b45309', 200]], '#fef3c7'), emissive: 0x1a1a1a }), -7.6, 1.9, -10.37);
  O.mk.scr = mark(G, -9, 3.4, -11.2);
  // cables
  const cab = lam(0x111827);
  for (const p of CAB.gen) add(G, pipeRun(p, 0.1, 6), cab);
  for (const k of ['dw', 'pump', 'td']) add(G, pipeRun(CAB[k], 0.1, 6), cab);
  O.cab = { gen: CAB.gen.map(p => new Poly(p)), dw: new Poly(CAB.dw), pump: new Poly(CAB.pump), td: new Poly(CAB.td) };
  O.pulses = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.2, 0), basic(0xfde047, { transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false }), 360);
  O.pulses.frustumCulled = false; O.pulses.userData.sys = null; G.add(O.pulses);
  O.smoke = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshLambertMaterial({ color: 0x7a7a7a, transparent: true, opacity: 0.24, depthWrite: false }), 60);
  O.smoke.frustumCulled = false; G.add(O.smoke);
}
function mark(G, x, y, z) { const o = new THREE.Object3D(); o.position.set(x, y, z); G.add(o); return o; }
// drawworks on the rig floor + fast line to the crown
function buildDrawworks(G) {
  const DW = new THREE.Group(); DW.position.set(1.5, 7.33, 5.6); G.add(DW);
  add(DW, box(5.2, 0.3, 2.4), lam(0x334155), 0, 0.15, 0);
  add(DW, strip([box(0.3, 2.0, 2.2).translate(-1.95, 1.2, 0), box(0.3, 2.0, 2.2).translate(1.95, 1.2, 0)]), lam(0x2563eb));
  O.drum = new THREE.Group(); O.drum.position.set(0, 1.25, 0); DW.add(O.drum);
  add(O.drum, xCyl(0.7, 3.4, 16), lam(0x1f2937));
  add(O.drum, strip([0, 1, 2, 3, 4, 5, 6, 7].map(k => xCyl(0.72, 0.12, 10).translate(-1.5 + k * 0.43, 0, 0))), lam(0x6b7280));
  add(O.drum, strip([xCyl(1.0, 0.14, 16).translate(-1.75, 0, 0), xCyl(1.0, 0.14, 16).translate(1.75, 0, 0)]), lam(0x94a3b8));
  add(DW, xCyl(1.1, 0.18, 18), lam(0xdc2626), -2.25, 1.25, 0);            // brake disc
  add(DW, box(1.3, 1.4, 1.6), lam(0x1d4ed8), 2.95, 1.0, 0);              // AC motor
  add(DW, box(1.2, 0.5, 1.5), lam(0x64748b), 2.95, 1.95, 0);
  add(G, cylBetween([1.5, 9.25, 5.6], [0.9, 41.3, 1.2], 0.05, 4), lam(0x1f2937)); // fast line
  O.mk.dw = mark(G, 1.5, 9.4, 5.6);
}


// ---------------------------------------------------------------- HOISTING extras (Part 2 focus)
const SLEN = 21; // one stand (3 joints, ~27 m) in scene units
function standGeo() {
  const g = [cyl(0.17, SLEN, 8).translate(0, SLEN / 2, 0)];
  for (const y of [0.4, 7.0, 14.0, SLEN - 0.4]) g.push(cyl(0.25, 0.55, 8).translate(0, y, 0));
  return strip(g);
}
function placeStand(obj, b, tp, spin = 0) {
  obj.position.set(b[0], b[1], b[2]);
  O.v3.set(tp[0] - b[0], tp[1] - b[1], tp[2] - b[2]);
  const len = O.v3.length(); O.v3.normalize();
  obj.quaternion.setFromUnitVectors(O.up, O.v3);
  if (spin) { O.q.setFromAxisAngle(O.up, spin); obj.quaternion.multiply(O.q); }
  obj.scale.set(1, len / SLEN, 1);
}
const RACK = [0, 1, 2, 3, 4, 5].map(i => ({ b: [0.9 + i * 0.42, 7.45, -3.3], t: [0.4 + i * 0.4, 28.6, -3.7] }));
function buildHoistExtras(G) {
  // crown sheaves
  add(G, strip([0, 1, 2, 3, 4].map(k => zCyl(0.8, 0.16, 14).translate(-0.8 + k * 0.4, 43.3, 0))), lam(0x94a3b8));
  O.mk.crownTop = mark(G, 0, 43.0, 1.8);
  // dead line + deadline anchor + supply reel
  add(G, cylBetween([-1.1, 41.2, 0.6], [-2.6, 8.5, -1.6], 0.05, 4), lam(0x1f2937));
  add(G, box(1.1, 0.7, 1.1), lam(0x334155), -2.6, 7.7, -1.6);
  add(G, xCyl(0.48, 0.9, 12), lam(0x1d4ed8), -2.6, 8.35, -1.6);
  add(G, cyl(0.24, 0.35, 10), lam(0xdc2626), -1.85, 7.95, -1.6);
  add(G, cylBetween([-2.6, 7.9, -1.1], [-11, 2.6, 10.5], 0.05, 4), lam(0x1f2937));
  add(G, xCyl(1.1, 1.6, 14), lam(0x1f2937), -11, 1.6, 10.5);
  add(G, strip([xCyl(1.5, 0.14, 16).translate(-11.85, 1.6, 10.5), xCyl(1.5, 0.14, 16).translate(-10.15, 1.6, 10.5)]), lam(0x2563eb));
  add(G, box(2.6, 0.2, 1.4), lam(0x334155), -11, 0.1, 10.5);
  O.mk.anchor = mark(G, -2.6, 8.7, -1.6); O.mk.reel = mark(G, -11, 3.1, 10.5); O.mk.dead = mark(G, -1.9, 22, -0.6);
  // monkeyboard + fingerboard + derrickman
  add(G, box(4.2, 0.16, 2.0), lam(0xfbbf24), 1.0, 28.3, -3.45);
  add(G, strip([cylBetween([-1.1, 28.4, -4.45], [3.1, 28.4, -4.45], 0.04, 4), cylBetween([-1.1, 29.4, -4.45], [3.1, 29.4, -4.45], 0.04, 4),
    cylBetween([-1.1, 28.4, -4.45], [-1.1, 29.4, -4.45], 0.04, 4), cylBetween([3.1, 28.4, -4.45], [3.1, 29.4, -4.45], 0.04, 4)]), lam(0xfbbf24));
  add(G, strip([0, 1, 2, 3, 4, 5, 6].map(k => box(0.07, 0.14, 1.9).translate(0.2 + k * 0.4, 28.75, -3.45))), lam(0xd97706));
  const dm = buildHuman(0xf97316, 0xffffff); dm.position.set(-0.6, 28.38, -3.7); dm.rotation.y = 1.4; G.add(dm);
  O.mk.monkey = mark(G, -0.4, 28.5, -4.3); O.mk.derrickman = mark(G, -0.6, 29.9, -3.7);
  // racked stands (setback) + the stand we pull + stub + slips
  SYS.cur = null;
  const sg = standGeo(), sm = lam(0x8792a2);
  O.racked = RACK.map((r, i) => { const m = add(G, sg, sm); placeStand(m, r.b, r.t); m.visible = i < 5; return m; });
  O.stand = add(G, sg, lam(0xf1f5f9, { emissive: 0x3a3a3a })); O.stand.visible = false;
  O.stub = add(G, strip([cyl(0.17, 1.0, 8).translate(0, 0.5, 0), cyl(0.25, 0.5, 8).translate(0, 0.75, 0)]), sm, 0, 7.4, 0);
  O.slips = new THREE.Group(); O.slips.position.set(0, 7.6, 0); G.add(O.slips);
  for (let k = 0; k < 3; k++) {
    const a = k * 2.094;
    const w = add(O.slips, box(0.22, 0.5, 0.34), lam(0x6b7280), Math.cos(a) * 0.32, 0.25, Math.sin(a) * 0.32); w.rotation.y = -a;
    add(O.slips, cylBetween([Math.cos(a) * 0.45, 0.45, Math.sin(a) * 0.45], [Math.cos(a) * 0.75, 0.85, Math.sin(a) * 0.75], 0.04, 4), lam(0xfbbf24));
  }
  O.mk.slips = mark(G, 0.4, 8.0, 0.4); O.mk.mast = mark(G, 2.9, 24, 2.9); O.mk.sub = mark(G, 6.6, 3.4, 7.0); O.mk.floor = mark(G, 5.4, 7.45, 6.2);
  O.mk.brake = mark(G, -0.75, 8.6, 5.6); O.mk.drum = mark(G, 1.5, 9.3, 6.4);
}



// ---------------------------------------------------------------- ROTATING extras on the rig (Part 3)
function buildRotateRig(G) {
  // white stripe on the drill pipe + spinning quill under the top drive, so rotation reads on screen
  const sg = box(0.06, 1, 0.06); sg.translate(0.19, 0.5, 0);
  add(O.dp, sg, basic(0xffffff));
  O.quill = add(O.topDrive, cyl(0.24, 0.9, 10), lam(0x94a3b8), 0, -1.6, 0);
  add(O.quill, box(0.06, 0.92, 0.06), basic(0xffffff), 0.25, 0, 0);
  O.mk.quill = mark(O.topDrive, 0.5, -1.6, 0.3); O.mk.tdMotor = mark(O.topDrive, 0.5, 1.55, 0.4); O.mk.goose = mark(O.topDrive, 0.2, 1.9, 0.2);
  // iron roughneck on a floor rail
  O.ir = new THREE.Group(); O.ir.position.set(4.0, 7.45, 0); G.add(O.ir);
  add(O.ir, box(1.3, 0.3, 1.6), lam(0x334155), 0, 0.15, 0);
  add(O.ir, box(0.4, 1.7, 0.4), lam(0xf97316), 0, 1.0, 0);
  add(O.ir, box(1.6, 0.3, 0.4), lam(0xf97316), -0.7, 1.15, 0);
  O.irHead = new THREE.Group(); O.irHead.position.set(-1.6, 1.15, 0); O.ir.add(O.irHead);
  add(O.irHead, box(0.5, 1.1, 1.0), lam(0xea580c), 0.25, 0, 0);
  O.irSpin = add(O.irHead, new THREE.TorusGeometry(0.34, 0.1, 6, 14).rotateX(Math.PI / 2), lam(0x111827), -0.05, 0.25, 0);
  add(O.irHead, new THREE.TorusGeometry(0.34, 0.12, 6, 14).rotateX(Math.PI / 2), lam(0x374151), -0.05, -0.3, 0);
  O.mk.ir = mark(O.irHead, 0.3, 0.6, 0.5);
  add(G, box(4.5, 0.08, 0.5), lam(0x475569), 3.0, 7.37, 0); // rail
}

// ---------------------------------------------------------------- STUDIO set (Kelly system, exploded drill string, bits)
const SX = { kelly: 0, str: 30, bits: 60 };
const STRLIFT = 35; // the exploded string stands above the studio floor
const STR = [ // drill string, exploded (studio x = 30), top → bottom
  { id: 'dp', y0: 26, y1: 40, r: 0.35, col: 0x8792a2 },
  { id: 'hwdp', y0: 14, y1: 24, r: 0.42, col: 0x64748b },
  { id: 'dc', y0: 2, y1: 12, r: 0.75, col: 0x475569 },
  { id: 'stab', y0: -4, y1: 0, r: 0.62, col: 0x0ea5e9 },
  { id: 'jar', y0: -12, y1: -6, r: 0.7, col: 0x7c3aed },
  { id: 'mwd', y0: -20, y1: -14, r: 0.7, col: 0x0891b2 },
  { id: 'motor', y0: -30, y1: -22, r: 0.78, col: 0xea580c },
];
function pdcBit(G, s = 1) {
  const g = new THREE.Group(); G.add(g); g.scale.setScalar(s);
  add(g, cyl(0.9, 1.2, 12), lam(0x6b7280), 0, -0.6, 0);
  add(g, cyl(1.6, 1.2, 16), lam(0x9ca3af), 0, 0.6, 0);
  add(g, new THREE.SphereGeometry(1.6, 16, 6, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.35, 1), lam(0xb0b7c2), 0, 1.2, 0);
  for (let k = 0; k < 6; k++) {
    const a = k / 6 * Math.PI * 2, bl = new THREE.Group(); bl.rotation.y = -a; g.add(bl);
    add(bl, box(1.25, 0.55, 0.32), lam(0x52627a), 0.85, 1.45, 0);
    for (let j = 0; j < 4; j++) add(bl, zCyl(0.15, 0.12, 10), lam(0x111827), 0.4 + j * 0.3, 1.62, 0.17);
  }
  for (let k = 0; k < 3; k++) { const a = (k + 0.5) / 3 * Math.PI * 2; add(g, cyl(0.1, 0.1, 8), basic(0x0f172a), Math.cos(a) * 0.55, 1.7, Math.sin(a) * 0.55); }
  return g;
}
function triconeBit(G, s = 1) {
  const g = new THREE.Group(); G.add(g); g.scale.setScalar(s);
  add(g, cyl(0.9, 1.2, 12), lam(0x6b7280), 0, -0.6, 0);
  add(g, cyl(1.45, 1.0, 12), lam(0x9ca3af), 0, 0.5, 0);
  for (let k = 0; k < 3; k++) {
    const a = k / 3 * Math.PI * 2, arm = new THREE.Group(); arm.rotation.y = -a; g.add(arm);
    add(arm, box(0.5, 1.0, 0.8), lam(0x9ca3af), 1.1, 1.2, 0);
    const cone = new THREE.Group(); cone.position.set(0.75, 1.55, 0); cone.rotation.z = Math.PI / 2 + 0.55; arm.add(cone);
    add(cone, new THREE.ConeGeometry(0.75, 1.3, 10), lam(0xd97706), 0, 0, 0);
    const teeth = [];
    for (let r = 0; r < 3; r++) for (let i = 0; i < 9; i++) {
      const th = i / 9 * Math.PI * 2 + r * 0.3, rad = 0.62 - r * 0.2, yy = -0.4 + r * 0.38;
      teeth.push(new THREE.ConeGeometry(0.1, 0.22, 4).rotateZ(-Math.PI / 2).rotateY(-th).translate(Math.cos(th) * rad, yy, Math.sin(th) * rad));
    }
    add(cone, strip(teeth), lam(0x374151));
  }
  return g;
}
function buildStudio(G) {
  add(G, cyl(120, 0.4, 48), lam(0x16233a), 30, -0.5, 0);
  // ---- Kelly system (x = 0)
  const K = new THREE.Group(); K.position.set(SX.kelly, 0, 0); G.add(K);
  add(K, box(9, 0.4, 7), lam(0x52627a), 0, -0.2, 0); // rig floor slab
  O.rt = new THREE.Group(); K.add(O.rt);
  add(O.rt, cyl(2.4, 0.7, 20), lam(0x334155), 0, 0.35, 0);
  add(O.rt, new THREE.TorusGeometry(2.3, 0.12, 6, 28).rotateX(Math.PI / 2), lam(0xef4444), 0, 0.72, 0);
  add(O.rt, box(1.9, 0.36, 1.9), lam(0x94a3b8), 0, 0.85, 0);                 // master bushing
  add(O.rt, box(1.35, 0.8, 1.35), lam(0xfacc15), 0, 1.4, 0);                  // kelly bushing
  for (const [x, z] of [[0.45, 0.45], [-0.45, 0.45], [0.45, -0.45], [-0.45, -0.45]]) add(O.rt, cyl(0.16, 0.6, 8), lam(0x1f2937), x, 1.85, z);
  add(O.rt, new THREE.CylinderGeometry(0.42, 0.42, 14, 6), lam(0x475569), 0, 7.6, 0);   // kelly (hex)
  add(O.rt, box(0.06, 14, 0.9), basic(0xe2e8f0), 0.36, 7.6, 0);                         // stripe so it reads as turning
  add(O.rt, cyl(0.55, 0.5, 10), lam(0xdc2626), 0, 14.85, 0);                            // kelly cock
  add(O.rt, cyl(0.38, 0.6, 10), lam(0x94a3b8), 0, 15.4, 0);                             // swivel stem (turns)
  add(K, cyl(0.9, 1.6, 14), lam(0x64748b), 0, 16.5, 0);                                  // swivel body (static)
  add(K, new THREE.TorusGeometry(1.0, 0.14, 6, 18, Math.PI), lam(0x94a3b8), 0, 17.2, 0);
  add(K, pipeRun([[0.5, 17.1, 0], [0.9, 18.2, 0], [1.9, 18.4, 0], [2.6, 17.8, 0]], 0.18, 8), lam(0x94a3b8)); // gooseneck
  add(K, new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(2.6, 17.8, 0), new THREE.Vector3(3.6, 16.5, 0.4), new THREE.Vector3(4.4, 13, 0.6)]), 12, 0.18, 6), lam(0x111827));
  add(K, cyl(0.35, 3, 10), lam(0x8792a2), 0, -1.5, 0);
  O.mk.rt = mark(K, 2.2, 0.7, 1.0); O.mk.kb = mark(K, 0.7, 1.6, 0.7); O.mk.mb = mark(K, -1.0, 0.95, 0.9);
  O.mk.kelly = mark(K, 0.45, 9, 0.3); O.mk.swivel = mark(K, -0.9, 16.5, 0.3); O.mk.gn = mark(K, 1.9, 18.4, 0.2);
  // ---- exploded drill string (x = 30)
  O.strG = new THREE.Group(); O.strG.position.set(SX.str, STRLIFT, 0); G.add(O.strG);
  for (const c of STR) {
    const h = c.y1 - c.y0, yc = (c.y0 + c.y1) / 2;
    add(O.strG, cyl(c.r, h, 14), lam(c.col), 0, yc, 0);
    add(O.strG, box(0.05, h, 0.05), basic(0xffffff), c.r, yc, 0);
    O.mk['s_' + c.id] = mark(O.strG, c.r + 0.1, yc, 0.3);
  }
  const tj = [], extra = [];
  for (const y of [26.6, 39.3]) tj.push(cyl(0.5, 1.3, 14).translate(0, y, 0));
  for (const y of [14.8, 23.2]) tj.push(cyl(0.55, 1.6, 14).translate(0, y, 0));
  tj.push(cyl(0.56, 1.3, 14).translate(0, 19, 0));
  add(O.strG, strip(tj), lam(0xaab4c3));
  for (let k = 0; k < 3; k++) extra.push(box(0.36, 3.6, 0.5).translate(0.82, -2, 0).rotateY(k * 2.094));
  add(O.strG, strip(extra), lam(0x0284c7));                                          // stabilizer blades
  for (const y of [-11, -9, -7]) add(O.strG, cyl(0.73, 0.3, 14), lam(0xc4b5fd), 0, y, 0); // jar bands
  for (const y of [-19, -17, -15]) add(O.strG, box(0.25, 0.9, 1.45), lam(0x164e63), 0, y, 0); // MWD windows
  add(O.strG, cyl(0.8, 0.5, 14), lam(0xfdba74), 0, -27, 0);                            // motor bend mark
  O.strBit = pdcBit(O.strG, 0.55); O.strBit.position.y = -32.2; O.strBit.rotation.x = Math.PI;
  // ---- bits (x = 60)
  for (const [x, col] of [[56, 0xef4444], [64, 0xf59e0b]]) {
    add(G, cyl(2.3, 1.2, 24), lam(0x2a3a55), x, 0.1, 0);
    add(G, new THREE.TorusGeometry(2.3, 0.08, 4, 32).rotateX(Math.PI / 2), basic(col), x, 0.72, 0);
  }
  O.pdc = pdcBit(G, 1); O.pdc.position.set(56, 1.9, 0);
  O.tri = triconeBit(G, 1); O.tri.position.set(64, 1.9, 0);
  O.mk.pdc = mark(G, 57.2, 3.5, 0.6); O.mk.tri = mark(G, 65.2, 3.5, 0.6);
}


// ---------------------------------------------------------------- shots: [t, set, [px,py,pz, tx,ty,tz, fov]]  (consecutive keys of the same set interpolate)
const STRY = [[57, 33], [63.4, 33], [64.4, 19], [69.4, 19], [70.4, 7], [76.4, 7], [77.4, -2], [81.4, -2], [82.4, -9], [86.4, -9], [87.4, -17], [90.6, -17], [91.4, -25.5], [96, -26.5]];
const K = [
  [0, 'L', [64, 36, 74, 0, 22, 0, 40]], [7, 'L', [52, 32, 66, 0, 22, 0, 40]],
  [7.01, 'L', [30, 17, 34, 0, 14, 0, 40]], [17, 'L', [27, 16, 31, 0, 14, 0, 40]],
  [17.01, 'L', [9.5, 23.5, 12.5, 0, 20.2, 0, 40]], [25, 'L', [9, 23, 12, 0, 20.2, 0, 40]],
  [25.01, 'L', [-8.5, 24.5, 10, 0, 20.8, 0, 40]], [33, 'L', [-8, 24, 9.5, 0, 20.8, 0, 40]],
  [33.01, 'S', [6.5, 4.6, 10.5, 0, 1.4, 0, 40]], [41, 'S', [6, 4.4, 10, 0, 1.4, 0, 40]],
  [41.01, 'S', [8, 13, 15, 0, 11, 0, 40]], [49, 'S', [7.5, 13.5, 14.5, 0, 11.5, 0, 40]],
  [49.01, 'S', [14, 10, 25, 0, 8, 0, 40]], [57, 'S', [13, 10, 24, 0, 8, 0, 40]],
  [57.01, 'P', null], [96, 'P', null],
  [96.01, 'S', [57, 8, 12.5, 56, 1.4, 0, 40]], [102, 'S', [56.6, 7.6, 12, 56, 1.4, 0, 40]],
  [102.01, 'S', [65, 8, 12.5, 64, 1.4, 0, 40]], [108, 'S', [64.6, 7.6, 12, 64, 1.4, 0, 40]],
  [108.01, 'L', [7.5, 11.5, 9.5, 0.8, 9.2, 0, 40]], [119, 'L', [7, 11, 9, 0.8, 9.2, 0, 40]],
  [119.01, 'L', [40, 24, 50, 0, 16, 0, 40]], [127, 'L', [38, 23, 48, 0, 16, 0, 40]],
  [127.01, 'L', [56, 30, 58, 6, 18, 0, 40]], [143, 'L', [48, 27, 52, 6, 16, 0, 40]],
  [143.01, 'L', [38, 17, 32, 16, 3, 0, 40]], [153, 'L', [36, 16, 30, 16, 3, 0, 40]],
];
function shotFor(t) {
  if (typeof window !== 'undefined' && window.COVER_CAM) return { set: 'L', v: window.COVER_CAM.slice() }; // used by brand/cover
  let i = 0; while (i < K.length - 1 && t >= K[i + 1][0]) i++;
  const a = K[i], b = K[Math.min(i + 1, K.length - 1)];
  if (a[1] === 'P') { // pan down the exploded drill string
    const y = pwl(STRY, t) + STRLIFT;
    return { set: 'S', v: [SX.str + 6.5, y + 2.2, 11.5, SX.str, y, 0, 40] };
  }
  if (b === a || b[1] !== a[1] || b[2] === null) return { set: a[1], v: a[2].slice() };
  const u = eio((t - a[0]) / (b[0] - a[0]));
  return { set: a[1], v: a[2].map((x, k) => lerp(x, b[2][k], u)) };
}
function focusAt(t) {
  if (t < 143) return ['rotate', 0.8 * sstep(0.3, 1.2, t) * (1 - sstep(134.4, 135.4, t))];
  return ['circ', 0.85 * sstep(143.6, 144.6, t)];
}
const ROT = [[0, 1.6], [106, 1.6], [107.5, 0], [119, 0], [120.5, 1.6], [200, 1.6]];
const makeupOn = t => t >= 108 && t < 119;

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
  O.sets = {}; O.mk = {};
  O.v3 = new THREE.Vector3(); O.v3b = new THREE.Vector3(); O.tan = new THREE.Vector3(); O.q = new THREE.Quaternion(); O.up = new THREE.Vector3(0, 1, 0);
  O.m4 = new THREE.Matrix4(); O.scl = new THREE.Vector3(); O.col = new THREE.Color(); O.hc = new THREE.Color();
  for (const k of Object.keys(OFF)) { const g = new THREE.Group(); g.position.set(...OFF[k]); scene.add(g); O.sets[k] = g; }
  buildLand(O.sets.L);
  SYS.cur = 'hoist'; buildHoistExtras(O.sets.L);
  SYS.cur = 'rotate'; buildRotateRig(O.sets.L); SYS.cur = null;
  buildStudio(O.sets.S);
  O.flare.visible = false;
  O.mk.td = mark(O.topDrive, 0.7, 0.3, 0.6); O.mk.elev = mark(O.topDrive, 0.45, -3.35, 0.4);
  O.mk.tblock = mark(O.tblock, 0.8, 0.2, 0.5);
  O.mk.pipe = mark(O.sets.L, 0.2, 12, 0.2);
  O.tagged = []; const seen = new Set();
  O.sets.L.traverse(m => {
    if (!m.isMesh || !m.userData.sys || !m.material || seen.has(m.material)) return;
    seen.add(m.material);
    O.tagged.push({ mat: m.material, sys: m.userData.sys, col: m.material.color.clone(), em: m.material.emissive ? m.material.emissive.clone() : null });
  });
  O.sets.L.traverse(m => { if (m.isMesh && m.geometry && m.geometry.type === 'TubeGeometry' && !O.hoseMesh) O.hoseMesh = m; });
  O.avatar = new Image(); O.avatar.src = 'assets/avatar.png';
  try { await O.avatar.decode(); } catch (e) { O.avatar = null; }
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
function done(mesh, n) { mesh.count = n; mesh.instanceMatrix.needsUpdate = true; if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true; }
function placeCam(v) {
  camera.position.set(v[0], v[1], v[2]); camera.lookAt(v[3], v[4], v[5]);
  camera.fov = v[6]; camera.clearViewOffset(); camera.updateProjectionMatrix(); camera.updateMatrixWorld();
}
function env() {
  scene.background.setHex(0x9a4f86);
  scene.fog.color.setHex(0xe8a27a); scene.fog.near = 160; scene.fog.far = 1600;
  O.hemi.color.setHex(0xffe6cf); O.hemi.groundColor.setHex(0x8a6448); O.hemi.intensity = 1.75;
  O.dir.color.setHex(0xffc58f); O.dir.intensity = 2.5;
  O.dir.position.set(60, 55, 75); O.dir.target.position.set(0, 0, 0);
}
function applyHighlight(t) {
  const [sys, a] = focusAt(t);
  const glow = 0.36 + 0.14 * Math.sin(t * 4.2);
  for (const e of O.tagged) {
    const on = sys && e.sys === sys;
    e.mat.color.copy(e.col).multiplyScalar(on || !sys ? 1 : 1 - 0.7 * a);
    if (e.em) { e.mat.emissive.copy(e.em); if (on) e.mat.emissive.add(O.hc.setHex(SYSCOL[sys]).multiplyScalar(glow * a)); }
  }
}
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
const PUMP_W = 2 * Math.PI * 1.5;
const genOn = t => (t > 9.3 && t < 13.2) || (t > 44.6 && t < 103);
const outOn = t => (t > 9.3 && t < 13.2) || (t > 68.8 && t < 103);


function stateHoist(t) {
  const mu = makeupOn(t);
  const yb = mu ? 32.75 : 20.6;
  O.topDrive.position.y = yb;
  const yB = yb + 4.6, top = yB + 0.9;
  O.tblock.position.set(0, yB, 0);
  for (const l of O.blines) { l.position.y = top; l.scale.y = Math.max(0.01, 41.2 - top); }
  O.drum.rotation.x = t * 0.15;
  const rot = pwlIntegral(ROT, t);
  O.dp.visible = !mu; O.dp.scale.y = Math.max(0.01, yb - 1.15 - 7.4); O.dp.rotation.y = rot;
  O.quill.rotation.y = rot;
  if (O.hoseMesh) O.hoseMesh.visible = !mu;
  O.stub.visible = mu; O.slips.visible = mu; O.slips.position.y = 7.6;
  O.racked[5].visible = false;
  O.stand.visible = mu;
  const spin = clamp((t - 111.6) / 2.4) * 9;
  if (mu) placeStand(O.stand, [0, 8.4, 0], [0, 29.4, 0], spin);
  // iron roughneck: in → spin → out
  const inn = eio((t - 109.4) / 1.4) * (1 - eio((t - 115.0) / 1.5));
  O.ir.position.x = lerp(4.0, 1.6, mu ? inn : 0);
  O.irSpin.rotation.y = t > 111.6 && t < 114.2 ? (t - 111.6) * 14 : 0;
}
function stateStudio(t) {
  O.rt.rotation.y = t * 1.6;
  O.strG.rotation.y = t * 0.7;
  O.pdc.rotation.y = t * 1.1; O.tri.rotation.y = t * 1.1;
}
function placeCamSet(set, v) {
  const o = OFF[set];
  camera.position.set(v[0] + o[0], v[1] + o[1], v[2] + o[2]);
  camera.lookAt(v[3] + o[0], v[4] + o[1], v[5] + o[2]);
  camera.fov = v[6]; camera.clearViewOffset(); camera.updateProjectionMatrix(); camera.updateMatrixWorld();
}
function envSet(set) {
  if (set === 'L') { env(); return; }
  const o = OFF[set];
  scene.background.setHex(0x0d1a2e);
  scene.fog.color.setHex(0x0d1a2e); scene.fog.near = 80; scene.fog.far = 260;
  O.hemi.color.setHex(0xffffff); O.hemi.groundColor.setHex(0x3a4a66); O.hemi.intensity = 1.8;
  O.dir.color.setHex(0xffffff); O.dir.intensity = 2.1;
  O.dir.position.set(o[0] + 30, 50, o[2] + 60); O.dir.target.position.set(o[0] + 30, 0, o[2]);
}
function applyState(t) {
  if (O.lastT === t) return;
  O.lastT = t;
  const s = O.shot = shotFor(t);
  for (const k in O.sets) O.sets[k].visible = k === s.set;
  placeCamSet(s.set, s.v);
  if (s.set === 'L') {
    stateLand(t, s.v);
    if (t > 143) { // teaser: circulating system flowing
      const dist = camera.position.distanceTo(O.v3.set(s.v[3], s.v[4], s.v[5]));
      const ka = clamp(dist / 22, 1, 3.2), pulse = 0.9 + 0.1 * Math.sin(t * 9);
      let n = arrowsAlong(O.arrows, 0, O.pathDN, 3.2 * t, 1.55 * ka, ka, 1, 420, pulse);
      n = arrowsAlong(O.arrows, n, O.pathRET, 3.2 * t, 1.55 * ka, ka, 1, 420, pulse);
      O.arrows.count = n; O.arrows.instanceMatrix.needsUpdate = true;
    }
    applyHighlight(t);
  } else stateStudio(t);
  scene.updateMatrixWorld();
}
function renderFrame(t) {
  applyState(t);
  envSet(O.shot.set);
  renderer.render(scene, camera);
}

function stateLand(t, v) {
  O.skyL.position.set(v[0], 0, v[2]);
  O.swirl.rotation = -t * 0.55;
  for (const m of O.mudSurf) {
    const a = m.geometry.attributes.position, b = m.userData.base, k = m.userData.k;
    for (let i = 0; i < a.array.length; i += 3) {
      const x = b[i], z = b[i + 2], r = Math.hypot(x, z), th = Math.atan2(z, x);
      a.array[i + 1] = 0.06 * Math.sin(r * 2.6 - t * 2.4 + th * 2 + k) + 0.03 * Math.sin(x * 3.1 + t * 3.3);
    }
    a.needsUpdate = true;
  }
  for (const a of O.agit) a.rotation.y = t * 5.5;
  const th = t * PUMP_W;
  O.rods.forEach((r, k) => { r.position.x = 0.34 * Math.sin(th + k * 2.094); });
  O.wheel.rotation.z = -th;
  O.basket.position.set(12.25 + 0.018 * Math.sin(t * 47), 4.55 + 0.022 * Math.sin(t * 53 + 1), -2.65 + 0.018 * Math.cos(t * 41));
  O.genGroups.forEach((g, i) => { g.position.y = 0.012 * Math.sin(t * 61 + i * 2); });
  let n = 0;
  O.stacks.forEach((p, i) => {
    for (let j = 0; j < 20; j++) {
      const life = 2.6, age = fract(t / life + j / 20 + i * 0.13) * life;
      setI(O.smoke, n++, p[0] + 0.7 * age + 0.15 * Math.sin(j * 3.1 + t), p[1] + 1.4 * age, p[2] + 0.35 * age, 0.16 + 0.3 * age);
    }
  });
  done(O.smoke, n);
  done(O.pulses, 0);
  O.arrows.count = 0; O.arrows.instanceMatrix.needsUpdate = true;
  O.arrowsG.count = 0;
  done(O.shCut, 0); done(O.shDrip, 0);
  O.topDrive.children[0].rotation.y = 0;
  stateHoist(t);
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

const PARTS = [['power', 'Power'], ['hoist', 'Hoisting'], ['rotate', 'Rotating'], ['circ', 'Circulating'], ['wc', 'Well Control']];
function partsBar(ctx, y, cur, a) {
  if (a <= 0) return;
  ctx.save(); ctx.globalAlpha = a;
  const x0 = 70, w = 880, gap = 10, cw = (w - gap * 4) / 5;
  PARTS.forEach(([s, name], i) => {
    const x = x0 + i * (cw + gap), on = i === cur;
    ctx.fillStyle = on ? SYSHEX[s] : 'rgba(10,18,36,0.72)'; rr(ctx, x, y, cw, 64, 18); ctx.fill();
    if (!on) { ctx.strokeStyle = SYSHEX[s]; ctx.lineWidth = 3; ctx.stroke(); }
    ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = F(600, 18); ctx.globalAlpha = a * 0.85; ctx.fillText(`PART ${i + 1}`, x + cw / 2, y + 19);
    ctx.globalAlpha = a; ctx.font = F(600, name.length > 10 ? 20 : 23); ctx.fillText(name, x + cw / 2, y + 44);
  });
  ctx.restore();
}
function factCard(ctx, t, t0, t1, title, lines, col) {
  const a = win(t, t0, t1, 0.45, 0.35); if (a <= 0) return;
  const k = eout((t - t0) / 0.5);
  const h = 76 + lines.length * 52, x = 70, w = 880, y = 1270 - h;
  ctx.save(); ctx.globalAlpha = a; ctx.translate(0, (1 - k) * 30);
  ctx.shadowColor = 'rgba(0,0,0,0.35)'; ctx.shadowBlur = 24; ctx.shadowOffsetY = 8;
  ctx.fillStyle = 'rgba(255,255,255,0.97)'; rr(ctx, x, y, w, h, 28); ctx.fill(); ctx.shadowColor = 'transparent';
  ctx.fillStyle = col; rr(ctx, x, y, 16, h, 8); ctx.fill();
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.font = F(600, 36); ctx.fillStyle = col; ctx.fillText(title, x + 44, y + 42);
  lines.forEach((ln, i) => {
    const u = sstep(t0 + 0.5 + i * 0.6, t0 + 0.9 + i * 0.6, t);
    ctx.globalAlpha = a * u;
    ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x + 56, y + 100 + i * 52, 8, 0, 7); ctx.fill();
    ctx.font = F(400, 32); ctx.fillStyle = HEX.ink; ctx.fillText(ln, x + 80, y + 101 + i * 52);
  });
  ctx.restore();
}
function ctaCard(ctx, t) {
  const a = win(t, 103.4, 111.0, 0.5, 0.4); if (a <= 0) return;
  const k = eout((t - 103.4) / 0.6);
  const x = 110, y = 560, w = 800, h = 440;
  ctx.save(); ctx.globalAlpha = a; ctx.translate(0, (1 - k) * 40);
  ctx.shadowColor = 'rgba(0,0,0,0.45)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 10;
  ctx.fillStyle = 'rgba(255,255,255,0.97)'; rr(ctx, x, y, w, h, 40); ctx.fill(); ctx.shadowColor = 'transparent';
  const cx = 510, ay = y + 110;
  ctx.save(); ctx.beginPath(); ctx.arc(cx, ay, 76, 0, 7); ctx.clip();
  if (O.avatar) ctx.drawImage(O.avatar, cx - 76, ay - 76, 152, 152); else { ctx.fillStyle = '#f97316'; ctx.fillRect(cx - 76, ay - 76, 152, 152); }
  ctx.restore();
  ctx.strokeStyle = '#f97316'; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(cx, ay, 79, 0, 7); ctx.stroke();
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = F(600, 48); ctx.fillStyle = HEX.ink; ctx.fillText('namman.story', cx, y + 238);
  ctx.font = F(400, 28); ctx.fillStyle = '#64748b'; ctx.fillText('Oil & Gas 101 · เข้าใจง่ายใน 2 นาที', cx, y + 284);
  const tapped = t > 106.6;
  const bw = 420, bh = 84, bx = cx - bw / 2, by = y + 320;
  const press = t > 106.4 && t < 106.8 ? 0.94 : 1;
  ctx.save(); ctx.translate(cx, by + bh / 2); ctx.scale(press, press); ctx.translate(-cx, -(by + bh / 2));
  const hover = !tapped && t > 105.8;
  ctx.fillStyle = tapped ? '#e2e8f0' : hover ? '#dc2626' : '#ef4444'; rr(ctx, bx, by, bw, bh, 42); ctx.fill();
  if (hover) { ctx.strokeStyle = 'rgba(239,68,68,0.35)'; ctx.lineWidth = 10; rr(ctx, bx - 5, by - 5, bw + 10, bh + 10, 47); ctx.stroke(); }
  ctx.fillStyle = tapped ? '#334155' : '#fff'; ctx.font = F(600, 38);
  ctx.fillText(tapped ? 'ติดตามแล้ว ✓' : '+ ติดตาม', cx + 22, by + bh / 2 + 2);
  // bell
  ctx.save(); ctx.translate(bx + 70, by + bh / 2); if (tapped) ctx.rotate(0.35 * Math.sin((t - 106.6) * 18) * Math.max(0, 1 - (t - 106.6) / 1.2));
  ctx.beginPath(); ctx.moveTo(-14, 10); ctx.quadraticCurveTo(-14, -16, 0, -16); ctx.quadraticCurveTo(14, -16, 14, 10); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.arc(0, 14, 4, 0, 7); ctx.fill(); ctx.restore();
  ctx.restore();
  // mouse cursor: glides in on a curve, hovers, clicks (press + ripple), then drifts away
  const f = sstep(104.6, 105.0, t) * (1 - sstep(107.8, 108.4, t));
  if (f > 0) {
    const tx = cx + 158, ty = by + bh / 2 + 4;
    const u = eio(sstep(104.6, 106.0, t)), w2 = eio(sstep(107.2, 108.4, t));
    const p0 = [930, 1250], p1 = [880, ty + 40];
    let px = (1 - u) * (1 - u) * p0[0] + 2 * u * (1 - u) * p1[0] + u * u * tx;
    let py = (1 - u) * (1 - u) * p0[1] + 2 * u * (1 - u) * p1[1] + u * u * ty;
    px += w2 * 120; py += w2 * 70;
    const click = t > 106.3 && t < 106.62 ? 0.86 : 1;
    if (t > 106.3 && t < 107.3) {
      const r = (t - 106.3) / 1.0;
      for (const [d, col] of [[0, 'rgba(239,68,68,'], [0.18, 'rgba(255,255,255,']]) {
        const q = clamp((r - d) / (1 - d));
        if (q <= 0) continue;
        ctx.globalAlpha = a * (1 - q); ctx.strokeStyle = col + '1)'; ctx.lineWidth = 5;
        ctx.beginPath(); ctx.arc(px, py, 8 + q * 46, 0, 7); ctx.stroke();
      }
    }
    ctx.save(); ctx.globalAlpha = a * f; ctx.translate(px, py); ctx.scale(3.1 * click, 3.1 * click); ctx.rotate(-0.08);
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 17); ctx.lineTo(4, 13.2); ctx.lineTo(7, 20); ctx.lineTo(9.6, 18.9); ctx.lineTo(6.7, 12.3); ctx.lineTo(12, 12.3); ctx.closePath();
    ctx.shadowColor = 'rgba(0,0,0,0.45)'; ctx.shadowBlur = 6; ctx.shadowOffsetX = 1.2; ctx.shadowOffsetY = 2;
    ctx.fillStyle = '#ffffff'; ctx.fill();
    ctx.shadowColor = 'transparent'; ctx.lineJoin = 'round'; ctx.lineWidth = 1.3; ctx.strokeStyle = '#0f172a'; ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
  // headline above
  ctx.save(); ctx.globalAlpha = a; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 20; ctx.font = F(600, 54); ctx.fillStyle = '#fff';
  ctx.fillText('กดติดตามไว้', 510, 400); ctx.font = F(600, 42); ctx.fillStyle = '#ffe3a3'; ctx.fillText('เพื่อไม่พลาดตอนต่อไป', 510, 470);
  ctx.restore();
}

function gauge(ctx, cx, cy, r, val, max, unit, th, en, col, a) {
  if (a <= 0) return;
  const A0 = Math.PI * 0.75, A1 = Math.PI * 2.25, ang = v => lerp(A0, A1, clamp(v / max));
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
  ctx.font = F(600, r * 0.36); ctx.fillText(String(Math.round(val)), cx, cy + r * 0.42);
  ctx.font = F(400, r * 0.17); ctx.fillStyle = 'rgba(200,215,240,0.9)'; ctx.fillText(unit, cx, cy + r * 0.68);
  ctx.font = F(600, 28); const w1 = ctx.measureText(th).width; ctx.font = F(400, 22); const w2 = ctx.measureText(en).width;
  const w = Math.max(w1, w2) + 44;
  ctx.fillStyle = col; rr(ctx, cx - w / 2, cy + r + 26, w, 74, 22); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.font = F(600, 28); ctx.fillText(th, cx, cy + r + 50);
  ctx.font = F(400, 22); ctx.fillText(en, cx, cy + r + 80);
  ctx.restore();
}

// ---------------------------------------------------------------- Part 3 overlay
function partTitle(ctx, t, n, title, sub, hook, col) {
  const a = win(t, 0.3, 6.8, 0.6, 0.4); if (a <= 0) return;
  const k = eout((t - 0.3) / 0.8);
  ctx.save(); ctx.globalAlpha = a * 0.78; ctx.fillStyle = 'rgba(8,14,30,0.8)'; rr(ctx, 60, 200, 900, 345, 36); ctx.fill(); ctx.restore();
  ctx.save(); ctx.globalAlpha = a; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 24;
  ctx.font = F(600, 32); ctx.fillStyle = '#ffd59a'; ctx.fillText('DRILLING RIG 101 · EP.05', 510, 250 - (1 - k) * 20);
  ctx.font = F(600, 40); ctx.fillStyle = col; ctx.fillText(`PART ${n} / 5`, 510, 310 - (1 - k) * 24);
  ctx.font = F(600, 116); ctx.fillStyle = '#fff'; const tw = ctx.measureText(title).width; if (tw > 860) ctx.font = F(600, Math.floor(116 * 860 / tw));
  ctx.fillText(title, 510, 416 - (1 - k) * 34);
  ctx.font = F(400, 44); ctx.fillStyle = '#ffe3a3'; ctx.fillText(sub, 510, 504);
  ctx.restore();
  partsBar(ctx, 570, n - 1, a * sstep(0.9, 1.5, t));
  const q = sstep(2.6, 3.2, t);
  if (q > 0) {
    ctx.save(); ctx.globalAlpha = a * q; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = F(600, 50); const w = ctx.measureText(hook).width + 90;
    ctx.shadowColor = 'rgba(0,0,0,0.4)'; ctx.shadowBlur = 20; ctx.fillStyle = 'rgba(10,18,36,0.84)'; rr(ctx, 540 - w / 2, 1150 - 50 + (1 - q) * 20, w, 100, 50); ctx.fill();
    ctx.shadowBlur = 0; ctx.fillStyle = col; ctx.beginPath(); ctx.arc(540 - w / 2 + 44, 1150 + (1 - q) * 20, 9, 0, 7); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.fillText(hook, 552, 1152 + (1 - q) * 20);
    ctx.restore();
  }
}
function compareKT(ctx, t) {
  const cards = [
    { t0: 49.4, title: 'Kelly + Rotary Table', tag: 'แบบเก่า', col: '#64748b', lines: ['หมุนจากพื้นแท่น ผ่าน Kelly Bushing', 'ต่อ Pipe ได้ทีละ 1 ท่อน (~9 ม.)'] },
    { t0: 52.8, title: 'Top Drive', tag: 'ปัจจุบัน', col: '#ef4444', lines: ['หมุนจากด้านบน มอเตอร์ในตัว', 'เจาะต่อได้ทีละ Stand (~27 ม.)', 'เร็วกว่า ปลอดภัยกว่า หมุนขณะดึงได้'] },
  ];
  cards.forEach((c, i) => {
    const a = win(t, c.t0, 57.0, 0.45, 0.4); if (a <= 0) return;
    const k = eout((t - c.t0) / 0.5);
    const x = 70, y = 470 + i * 330, w = 880, h = i ? 330 : 270;
    ctx.save(); ctx.globalAlpha = a; ctx.translate((1 - k) * (i ? 60 : -60), 0);
    ctx.shadowColor = 'rgba(0,0,0,0.35)'; ctx.shadowBlur = 24; ctx.shadowOffsetY = 8;
    ctx.fillStyle = 'rgba(255,255,255,0.97)'; rr(ctx, x, y, w, h - 20, 30); ctx.fill(); ctx.shadowColor = 'transparent';
    ctx.fillStyle = c.col; rr(ctx, x, y, w, 90, 30); ctx.fill(); ctx.fillRect(x, y + 56, w, 34);
    ctx.fillStyle = '#fff'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.font = F(600, 44); ctx.fillText(c.title, x + 40, y + 47);
    ctx.font = F(600, 26); ctx.textAlign = 'right'; ctx.fillText(c.tag, x + w - 34, y + 47);
    c.lines.forEach((ln, j) => {
      const u = sstep(c.t0 + 0.5 + j * 0.5, c.t0 + 0.9 + j * 0.5, t); ctx.globalAlpha = a * u;
      ctx.fillStyle = c.col; ctx.beginPath(); ctx.arc(x + 56, y + 138 + j * 60, 9, 0, 7); ctx.fill();
      ctx.textAlign = 'left'; ctx.font = F(400, 34); ctx.fillStyle = HEX.ink; ctx.fillText(ln, x + 84, y + 140 + j * 60);
    });
    ctx.restore();
  });
}
// drill-string depth rail (left) during the pan
const STRL = [['Drill Pipe', 57], ['HWDP', 64], ['Drill Collar', 70], ['Stabilizer', 77], ['Jar', 82], ['MWD', 87], ['Mud Motor', 91], ['Bit', 96]];
function stringRail(ctx, t) {
  const A = win(t, 57.2, 96.0, 0.5, 0.4); if (A <= 0) return;
  ctx.save(); panel(ctx, 60, 440, 250, 640, A * 0.88); ctx.globalAlpha = A;
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.font = F(600, 24); ctx.fillStyle = '#fca5a5'; ctx.fillText('DRILL STRING', 84, 476);
  const cur = STRL.reduce((c, s, i) => (t >= s[1] ? i : c), 0);
  ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(98, 520); ctx.lineTo(98, 520 + 7 * 74); ctx.stroke();
  STRL.forEach(([n], i) => {
    const y = 520 + i * 74, on = i <= cur, act = i === cur;
    ctx.fillStyle = act ? '#ef4444' : on ? '#fca5a5' : 'rgba(255,255,255,0.25)';
    ctx.beginPath(); ctx.arc(98, y, act ? 13 : 9, 0, 7); ctx.fill();
    ctx.font = F(act ? 600 : 400, act ? 28 : 24); ctx.fillStyle = act ? '#fff' : on ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.4)';
    ctx.fillText(n, 122, y + 1);
  });
  ctx.restore();
}
const RECAP3 = ['Top Drive', 'Swivel', 'Rotary Table', 'Kelly', 'Drill Pipe', 'HWDP', 'Drill Collar', 'Stabilizer · Jar', 'MWD · Mud Motor', 'Bit (PDC / Tricone)'];
function recap3(ctx, t) {
  const A = win(t, 127.4, 135.0, 0.5, 0.4); if (A <= 0) return;
  ctx.save(); ctx.globalAlpha = A; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0,0,0,0.55)'; ctx.shadowBlur = 22;
  ctx.font = F(600, 40); ctx.fillStyle = SYSHEX.rotate; ctx.fillText('สรุป PART 3', 510, 300);
  ctx.font = F(600, 92); ctx.fillStyle = '#fff'; ctx.fillText('Rotating System', 510, 392);
  ctx.shadowBlur = 10;
  RECAP3.forEach((c, i) => {
    const u = sstep(128.0 + i * 0.25, 128.4 + i * 0.25, t); if (u <= 0) return;
    const col = i % 2, row = Math.floor(i / 2), x = 90 + col * 430, y = 470 + row * 94;
    ctx.globalAlpha = A * u; ctx.fillStyle = 'rgba(10,18,36,0.84)'; rr(ctx, x, y, 410, 76, 38); ctx.fill();
    ctx.fillStyle = SYSHEX.rotate; ctx.beginPath(); ctx.arc(x + 40, y + 38, 18, 0, 7); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = F(600, 20); ctx.fillText(String(i + 1), x + 40, y + 39);
    ctx.font = F(600, 30); ctx.textAlign = 'left'; ctx.fillText(c, x + 74, y + 40); ctx.textAlign = 'center';
  });
  ctx.restore();
}
function nextCard3(ctx, t) {
  const a = win(t, 143.4, 154, 0.5, 0.1); if (a <= 0) return;
  const k = eout((t - 143.4) / 0.6);
  ctx.save(); ctx.globalAlpha = a; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 24;
  ctx.font = F(600, 36); ctx.fillStyle = '#5eead4'; ctx.fillText('ตอนต่อไป · PART 4 / 5', 510, 250 - (1 - k) * 20);
  ctx.font = F(600, 100); ctx.fillStyle = '#fff'; ctx.fillText('Circulating System', 510, 350 - (1 - k) * 30);
  ctx.font = F(400, 40); ctx.fillStyle = '#ffe3a3'; ctx.fillText('Mud ไหลวนในหลุมได้ยังไง?', 510, 432);
  ctx.restore();
  partsBar(ctx, 1170, 3, a * sstep(144.2, 144.8, t));
}

function drawOverlay(ctx, t) {
  applyState(t);
  ctx.save(); ctx.textBaseline = 'middle';
  const RC = SYSHEX.rotate, S = O.sets.S;
  if (t < 7.2) partTitle(ctx, t, 3, 'Rotating System', 'ระบบหมุน Drill String ให้ Bit เจาะ', 'หมุน Pipe ยาวหลายกิโลได้ยังไง?', RC);
  if (t >= 7 && t < 127.2) chapter(ctx, t, 7.0, 127.0, 'P3', 'Rotating System', 'TOP DRIVE · DRILL STRING · BIT');
  factCard(ctx, t, 8.0, 16.8, 'Rotating System', ['หมุน Drill String ทั้งเส้น', 'Bit ที่ก้นหลุมกัดหินลงไปเรื่อย ๆ'], RC);
  callout(ctx, t, 8.6, 16.8, [0, 0, 0], O.mk.pipe, 300, 600, 'Drill String', 'หมุน', RC);
  // top drive
  callout(ctx, t, 17.6, 24.8, [0, 0, 0], O.mk.tdMotor, 700, 520, 'Top Drive', 'มอเตอร์ + Gearbox', RC);
  callout(ctx, t, 19.4, 24.8, [0, 0, 0], O.mk.quill, 300, 760, 'Quill / Main Shaft', 'หมุน Pipe', RC);
  factCard(ctx, t, 18.0, 24.8, 'Top Drive', ['มอเตอร์ไฟฟ้า ~1,000+ hp', 'หมุนได้ ~0–200 RPM', 'แรงบิดหลายหมื่น ft-lb'], RC);
  callout(ctx, t, 25.6, 32.8, [0, 0, 0], O.mk.goose, 700, 520, 'Swivel / Gooseneck', 'Mud เข้า', SYSHEX.circ);
  callout(ctx, t, 27.4, 32.8, [0, 0, 0], O.mk.elev, 300, 760, 'Pipe Handler', 'Links + Elevator', RC);
  factCard(ctx, t, 26.0, 32.8, 'Swivel ในตัว Top Drive', ['Mud ไหลเข้า Pipe ได้ขณะหมุน', 'มี IBOP Valve ปิดกันย้อนกลับ'], RC);
  // kelly system (studio)
  callout(ctx, t, 33.6, 40.8, [0, 0, 0], O.mk.rt, 700, 520, 'Rotary Table', 'หมุน', RC);
  callout(ctx, t, 35.4, 40.8, [0, 0, 0], O.mk.kb, 300, 720, 'Kelly Bushing', 'จับ Kelly', '#ca8a04');
  factCard(ctx, t, 34.0, 40.8, 'Rotary Table (แบบเก่า)', ['โต๊ะหมุนบนพื้นแท่น', 'Master Bushing + Kelly Bushing'], RC);
  callout(ctx, t, 41.6, 48.8, [0, 0, 0], O.mk.kelly, 700, 560, 'Kelly', 'ก้านเหลี่ยม ~12 ม.', RC);
  callout(ctx, t, 43.4, 48.8, [0, 0, 0], O.mk.swivel, 300, 470, 'Swivel', 'ส่วนบนไม่หมุน', '#64748b');
  factCard(ctx, t, 42.0, 48.8, 'Kelly + Swivel', ['Kelly เหลี่ยม ให้ Bushing จับหมุนได้', 'Swivel ให้ Mud เข้าขณะ Kelly หมุน'], RC);
  compareKT(ctx, t);
  // drill string pan
  stringRail(ctx, t);
  factCard(ctx, t, 57.6, 63.8, 'Drill Pipe', ['ท่อละ ~9.5 ม. ขนาด 5 นิ้ว', 'ต่อกันด้วย Tool Joint (เกลียว)'], RC);
  factCard(ctx, t, 64.6, 69.8, 'HWDP (Heavy Weight Drill Pipe)', ['ผนังหนากว่า Drill Pipe', 'ช่วงเปลี่ยนน้ำหนักลงสู่ Collar'], RC);
  factCard(ctx, t, 70.6, 76.8, 'Drill Collar', ['ท่อเหล็กหนักมาก ผนังหนา', 'ให้ Weight on Bit (WOB)'], RC);
  factCard(ctx, t, 77.6, 81.8, 'Stabilizer', ['ใบครีบช่วยคุมทิศทาง ให้หลุมตรง'], RC);
  factCard(ctx, t, 82.6, 86.8, 'Drilling Jar', ['กระแทกขึ้น/ลง ช่วยเมื่อ Pipe ติด'], RC);
  factCard(ctx, t, 87.6, 90.9, 'MWD', ['วัดทิศทาง/ความเอียง ส่งเป็น Mud Pulse'], RC);
  factCard(ctx, t, 91.6, 95.8, 'Mud Motor', ['แรง Mud หมุน Bit ใช้เจาะแนวเอียง'], RC);
  // bits
  callout(ctx, t, 96.6, 101.8, [0, 0, 0], O.mk.pdc, 700, 520, 'PDC Bit', 'ใบมีดเพชร', RC);
  factCard(ctx, t, 97.0, 101.8, 'PDC Bit', ['Cutter เพชรสังเคราะห์', 'เฉือนหิน · ใช้มากที่สุดในปัจจุบัน'], RC);
  callout(ctx, t, 102.6, 107.8, [0, 0, 0], O.mk.tri, 700, 520, 'Tricone Bit', '3 ลูกกลิ้ง', '#f59e0b');
  factCard(ctx, t, 103.0, 107.8, 'Tricone (Roller Cone) Bit', ['ลูกกลิ้ง 3 ลูกมีฟัน', 'บด/กะเทาะหิน เหมาะกับหินแข็ง'], '#f59e0b');
  // floor tools
  callout(ctx, t, 108.8, 118.8, [0, 0, 0], O.mk.slips, 300, 1060, 'Slips', 'จับ Pipe', '#6b7280');
  callout(ctx, t, 110.6, 118.8, [0, 0, 0], O.mk.ir, 720, 560, 'Iron Roughneck', 'ขันเกลียว', '#f97316');
  factCard(ctx, t, 109.0, 118.8, 'ต่อท่อ (Make Up)', ['Slips จับ Pipe ไว้ที่ Rotary Table', 'Iron Roughneck หมุน + ขันแน่นตาม Torque'], RC);
  // parameters dashboard
  const da = win(t, 119.4, 126.8, 0.4, 0.4);
  gauge(ctx, 200, 640, 92, 120 + 6 * Math.sin(t * 2.1), 200, 'RPM', 'RPM', 'ความเร็วรอบ', RC, da);
  gauge(ctx, 510, 640, 92, 18 + 1.5 * Math.sin(t * 3.3 + 1), 40, 'k ft-lb', 'Torque', 'แรงบิด', '#f59e0b', da);
  gauge(ctx, 820, 640, 92, 25 + 1.2 * Math.sin(t * 1.7 + 2), 50, 'klb', 'WOB', 'น้ำหนักบน Bit', '#3b82f6', da);
  recap3(ctx, t);
  if (t >= 135 && t < 143.2) ctaCard(ctx, t - 32);
  if (t >= 143) nextCard3(ctx, t);
  for (const tc of [7, 17, 25, 33, 41, 49, 57, 96, 102, 108, 119, 127, 135, 143]) fade(ctx, t, tc, '#06101e', 0.25);
  if (t > DURATION - 0.7) { ctx.save(); ctx.globalAlpha = sstep(DURATION - 0.7, DURATION, t); ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); ctx.restore(); }
  ctx.restore();
}

// ---------------------------------------------------------------- captions & cues
const captions = [
  { t0: 0, t1: 7, th: 'Part 3: Rotating System ระบบหมุนเจาะ', en: 'Part 3: the rotating system' },
  { t0: 7, t1: 17, th: 'หมุน Drill String ให้ Bit กัดหินลงไป', en: 'It turns the drill string so the bit cuts rock' },
  { t0: 17, t1: 25, th: 'Top Drive: มอเตอร์ + Gearbox หมุน Pipe', en: 'The top drive: motor and gearbox turn the pipe' },
  { t0: 25, t1: 33, th: 'มี Swivel ให้ Mud ไหลเข้าขณะหมุน', en: 'A built-in swivel lets mud in while turning' },
  { t0: 33, t1: 41, th: 'แบบเก่า: Rotary Table หมุน Kelly Bushing', en: 'The old way: a rotary table turns the kelly bushing' },
  { t0: 41, t1: 49, th: 'Kelly ก้านเหลี่ยม แขวนใต้ Swivel', en: 'The square kelly hangs below the swivel' },
  { t0: 49, t1: 57, th: 'Top Drive เจาะทีละ Stand เร็วและปลอดภัยกว่า', en: 'A top drive drills a whole stand: faster, safer' },
  { t0: 57, t1: 64, th: 'Drill Pipe ต่อกันด้วย Tool Joint', en: 'Drill pipe joints connect with tool joints' },
  { t0: 64, t1: 70, th: 'HWDP: ท่อผนังหนา ช่วงเปลี่ยนน้ำหนัก', en: 'Heavy-weight drill pipe: a thick-walled transition' },
  { t0: 70, t1: 77, th: 'Drill Collar หนักมาก ให้ Weight on Bit', en: 'Heavy drill collars put weight on the bit' },
  { t0: 77, t1: 82, th: 'Stabilizer คุมให้หลุมตรง', en: 'Stabilizers keep the hole straight' },
  { t0: 82, t1: 87, th: 'Jar กระแทกช่วยเมื่อ Pipe ติด', en: 'A jar delivers blows when the pipe is stuck' },
  { t0: 87, t1: 91, th: 'MWD วัดข้อมูลขณะเจาะ', en: 'MWD measures while drilling' },
  { t0: 91, t1: 96, th: 'Mud Motor ใช้แรง Mud หมุน Bit', en: 'A mud motor uses mud flow to turn the bit' },
  { t0: 96, t1: 102, th: 'PDC Bit: ใบมีดเพชร เฉือนหิน', en: 'PDC bits shear rock with diamond cutters' },
  { t0: 102, t1: 108, th: 'Tricone Bit: 3 ลูกกลิ้ง บดหิน', en: 'Tricone bits crush rock with three cones' },
  { t0: 108, t1: 119, th: 'Slips จับ Pipe · Iron Roughneck ขันเกลียว', en: 'Slips hold the pipe; the iron roughneck makes up' },
  { t0: 119, t1: 127, th: 'คุม RPM, Torque และ WOB ขณะเจาะ', en: 'The driller controls RPM, torque and WOB' },
  { t0: 127, t1: 135, th: 'นี่คือ Rotating System ทั้งระบบ', en: 'That is the whole rotating system' },
  { t0: 135, t1: 143, th: 'กดติดตามไว้ เพื่อไม่พลาดตอนต่อไป', en: 'Follow so you don’t miss the next part' },
  { t0: 143, t1: 153, th: 'ตอนต่อไป: Circulating System', en: 'Next: the circulating system' },
];
const cues = [
  { t: 0.3, sfx: 'whoosh' }, { t: 0.8, sfx: 'impact' }, { t: 2.6, sfx: 'blip' },
  { t: 6.8, sfx: 'whoosh' }, { t: 8.0, sfx: 'spin' }, { t: 8.6, sfx: 'blip' },
  { t: 16.8, sfx: 'whoosh' }, { t: 17.6, sfx: 'blip' }, { t: 19.4, sfx: 'blip' },
  { t: 24.8, sfx: 'whoosh' }, { t: 25.6, sfx: 'blip' }, { t: 27.4, sfx: 'blip' },
  { t: 32.8, sfx: 'whoosh' }, { t: 33.6, sfx: 'spin' }, { t: 35.4, sfx: 'blip' },
  { t: 40.8, sfx: 'whoosh' }, { t: 41.6, sfx: 'blip' }, { t: 43.4, sfx: 'blip' },
  { t: 48.8, sfx: 'whoosh' }, { t: 49.4, sfx: 'clunk' }, { t: 52.8, sfx: 'zap' },
  { t: 56.8, sfx: 'whoosh' }, { t: 57.6, sfx: 'blip' }, { t: 64.4, sfx: 'blip' }, { t: 70.4, sfx: 'blip' }, { t: 77.4, sfx: 'blip' },
  { t: 82.4, sfx: 'blip' }, { t: 84.0, sfx: 'impact' }, { t: 87.4, sfx: 'blip' }, { t: 91.4, sfx: 'blip' },
  { t: 95.8, sfx: 'whoosh' }, { t: 96.6, sfx: 'spin' }, { t: 101.8, sfx: 'whoosh' }, { t: 102.6, sfx: 'spin' },
  { t: 107.8, sfx: 'whoosh' }, { t: 108.8, sfx: 'clunk' }, { t: 109.4, sfx: 'chain' }, { t: 111.6, sfx: 'spin' }, { t: 113.6, sfx: 'torque' }, { t: 115.0, sfx: 'chain' },
  { t: 118.8, sfx: 'whoosh' }, { t: 119.6, sfx: 'spin' },
  { t: 126.8, sfx: 'whoosh' }, { t: 128.0, sfx: 'blip' },
  { t: 134.8, sfx: 'whoosh' }, { t: 138.4, sfx: 'blip' }, { t: 138.6, sfx: 'success' },
  { t: 142.8, sfx: 'whoosh' }, { t: 144.0, sfx: 'bubble' },
];

export default { DURATION, init, renderFrame, drawOverlay, captions, cues };
