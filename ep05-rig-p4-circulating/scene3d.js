// scene3d.js — namman.story EP05 "Drilling Rig 101" Part 4/5: CIRCULATING SYSTEM, 170 s, 1080x1920.
// Contract: see ../SPEC.md. Sets: L = land rig (Part 3 rig + mud system + NEW circulating assets), W = well cutaway
// (ported from EP03), S = studio (triplex overview, pump section, washpipe, driller's cabin).
// The hero is one teal drop of mud followed through one lap of the loop. renderFrame(t) / drawOverlay(ctx,t) are pure
// functions of t. Look: ./look.js (copied from ../lookdev). Overlays: ./overlay_kit.js ("Field Manual").
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { applyLook, skyMaterial, stdMat } from './look.js';
import { createAssets } from './assets_p4.js';
import * as KIT from './overlay_kit.js';

const DURATION = 170;
let THREE, renderer, scene, camera, LOOK, A;
function post(ctx, glCanvas, t) { if (LOOK && O.shot) LOOK.post(ctx, glCanvas, O.shot.set); }
let W = 1080, H = 1920;

// world sets (far apart; only the active one is visible)
const OFF = { L: [0, 0, 0], W: [5000, 0, 0], S: [0, 0, -5000] };
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
  x.fillStyle = '#ffd23f'; fitFont(x, 'ACTIVE TANK', 600, 58, 760); x.fillText('ACTIVE TANK', 512, 205);
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
  sg2.lookAt(0, 0, 0); sg2.visible = false; // look.js sky shader draws the sun glow
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
    for (let x = T.x0 + 0.5; x < T.x1 - 0.2; x += 1.15) if (k !== 2 || Math.abs(x - xc) > 2.3) st.push(box(0.14, TH - 0.3, 0.1).translate(x, TH / 2, TZ1 + 0.03));
    if (st.length) add(G, strip(st), lam(0x4a5a6f));
    const sg = new THREE.PlaneGeometry(w - 0.3, d - 0.3, 12, 10); sg.rotateX(-Math.PI / 2);
    const m = add(G, sg, O.mudSurfM, xc, MUDY, zc);
    m.userData.base = Float32Array.from(sg.attributes.position.array); m.userData.k = k;
    O.mudSurf.push(m);
  });
  // easter egg #1: stencil on the active tank (C) front. No volume on it (tank volumes are unverified).
  const tC = TANKS[2];
  O.stencil = add(G, new THREE.PlaneGeometry(4.4, 1.1), new THREE.MeshLambertMaterial({ map: tankStencilTex(), emissive: 0x222222 }), (tC.x0 + tC.x1) / 2, 1.55, TZ1 + 0.01);
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
  // (split around the flow-paddle window, which brings its own flanged stubs)
  add(G, pipeRun([[0.0, 6.0, 0.0], [0.4, 6.0, -0.4], [6.606, 5.490, -3.098]], 0.24, 10), lam(0x9ca3af));
  add(G, pipeRun([[9.715, 5.235, -4.450], [10.75, 5.15, -4.9]], 0.24, 10), lam(0x9ca3af));
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
  // suction rerouted through the centrifugal charge pump (casing centre 24.0, 0.7, 1.5)
  add(G, pipeRun([[24.0, 0.7, -1.0], [24.0, 0.7, 0.89]], 0.22, 10), lam(0x6b7280));
  add(G, pipeRun([[23.45, 1.285, 1.5], [23.0, 1.285, 1.5], [23.0, 1.285, 2.6], [23.0, 0.7, 3.0], [23.0, 0.7, 4.4], [21.25, 0.7, 4.4], [21.25, 0.62, 6.1]], 0.2, 10), lam(0x6b7280));
  add(G, xCyl(0.26, 0.3, 10), lam(0x6b7280), 21.25, 0.62, 6.3);
  add(G, pipeRun([[21.4, 1.85, 7.2], [20.3, 1.85, 7.2], [20.3, 0.45, 7.2], [8.0, 0.45, 7.2], [8.0, 0.45, 1.5], [8.0, 7.75, 1.5], [7.55, 7.75, 1.5]], 0.17, 8), pipeM);
  add(G, pipeRun([[5.15, 7.75, 1.5], [4.7, 7.75, 1.5], [4.7, 23.5, 1.5]], 0.17, 8), pipeM); // standpipe (manifold sits between)
  add(G, strip([box(0.5, 0.15, 0.15).translate(4.45, 12, 1.5), box(0.5, 0.15, 0.15).translate(4.4, 17, 1.5), box(0.8, 0.15, 0.15).translate(4.3, 22, 1.5)]), darkM);
  add(G, zCyl(0.16, 0.08, 12), basic(0xf8fafc), 20.3, 1.85, 7.42); // pressure gauge face
  // rotary (kelly) hose to the top drive
  O.hose = hosePts();
  O.hoseMesh = add(G, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(O.hose.map(p => new THREE.Vector3(...p))), 40, 0.16, 6), lam(0x111827));
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


// ================================================================ WELL set (cutaway, ported from EP03; cut plane z = 0, camera at +z)
const RH = 1.6, RC = 2.0, Y_SHOE = -14, YB = -38.4, YBT = YB + 2.0, Y_COL = -28.0, Y_TOP = 8.0;
const RP = 0.5, RPI = 0.38, RCO = 0.8;
const LAYERS = [
  { y0: 0, y1: -4, c: 0xd9bf8c }, { y0: -4, y1: -11, c: 0xb98a5a }, { y0: -11, y1: -18, c: 0x97a08a }, { y0: -18, y1: -24, c: 0xbdb5a8 },
  { y0: -24, y1: -31, c: 0xe1b98c }, { y0: -31, y1: -35, c: 0x7c8273 }, { y0: -35, y1: -42, c: 0xd9733f, gas: true }, { y0: -42, y1: -90, c: 0x5d6158 },
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
    const L = LAYERS.find(l => y <= l.y0 && y > l.y1), r = 0.2 + hash(i, 23) * 0.5;
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
  O.gasPores = add(G, strip(peb.gas), basic(0xfff2b0, { transparent: true, opacity: 0.6 }));
  // surface + mini rig
  add(G, strip([box(Wd - RC, 0.4, Dd).translate(-(RC + Wd) / 2, 0.2, -Dd / 2), box(Wd - RC, 0.4, Dd).translate((RC + Wd) / 2, 0.2, -Dd / 2)]), lam(0xe9d3a3));
  add(G, box(9, 0.5, 7), lam(0x52627a), 0, 3.0, -2.0);
  add(G, box(9.1, 0.18, 7.1), lam(0xfbbf24), 0, 3.3, -2.0);
  add(G, strip([cylBetween([-4, 0.4, -5], [-4, 2.8, -5], 0.2, 4), cylBetween([4, 0.4, -5], [4, 2.8, -5], 0.2, 4), cylBetween([-4, 0.4, 1.2], [-4, 2.8, 1.2], 0.2, 4), cylBetween([4, 0.4, 1.2], [4, 2.8, 1.2], 0.2, 4)]), lam(0x3f4d63));
  const lt = lattice(3.4, 20, 3.0, 0.9, 5, 0.22, 0.12, 0.09); lt.translate(0, 0, -1.5);
  add(G, lt, lam(0xf8fafc));
  add(G, box(1.6, 2.2, 1.3), lam(0xdc2626), 0, Y_TOP + 1.0, 0);
  add(G, pipeRun([[0.2, Y_TOP + 2.1, 0], [3.5, Y_TOP + 4.5, -0.5], [6.5, Y_TOP + 1.0, -0.8], [6.5, 3.4, -0.8]], 0.16, 6), lam(0x111827));
  add(G, pipeRun([[RC, 1.0, 0], [9.0, 1.0, 0]], 0.36, 10), cb(0x9ca3af));
  add(G, cyl(RC + 0.25, 1.4, 16, true), cb(0x9ca3af), 0, 1.0, 0);
  // cement + casing
  add(G, cyl(RC, -Y_SHOE + 0.4, 18, true), cb(0xc9c3b6), 0, Y_SHOE / 2 + 0.2, 0);
  add(G, cyl(RH, -Y_SHOE + 0.4, 18, true), cb(0x8f9cab), 0, Y_SHOE / 2 + 0.2, 0);
  add(G, strip([1, -1].map(s => box(RC - RH - 0.1, -Y_SHOE, 0.2).translate(s * (RC + RH + 0.1) / 2, Y_SHOE / 2, -0.1))), lam(0xd6d0c4));
  add(G, strip([1, -1].map(s => box(0.12, -Y_SHOE + 0.4, 0.22).translate(s * (RH + 0.06), Y_SHOE / 2 + 0.2, -0.1))), lam(0x475569));
  add(G, strip([1, -1].map(s => box(0.5, 0.6, 0.3).translate(s * (RH + 0.15), Y_SHOE - 0.2, -0.1))), lam(0x475569));
  O.mudTint = add(G, cyl(RH - 0.03, -YB + 0.4, 18, true), lam(0x8a5a2e, { clippingPlanes: [clip], side: THREE.DoubleSide, transparent: true, opacity: 0.42, depthWrite: false }), 0, YB / 2 + 0.2, 0);
  O.mudTint.renderOrder = 1;
  // drill string (cut)
  const DS = new THREE.Group(); G.add(DS);
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
  for (let y = Y_COL - 1.5; y > YBT + 1; y -= 2.6) stripes.push(box(0.16, 0.5, 0.1).translate(RCO, y, -0.12), box(0.16, 0.5, 0.1).translate(-RCO, y, -0.12));
  add(DR, strip(tjs), cb(0xaab4c3));
  add(DR, strip(stripes), cb(0x1e293b));
  add(DS, strip([1, -1].map(s => box(RP - RPI, Y_TOP - Y_COL, 0.14).translate(s * (RP + RPI) / 2, (Y_TOP + Y_COL) / 2, -0.07))), lam(0x475569));
  add(DS, strip([1, -1].map(s => box(RCO - RPI, Y_COL - YBT, 0.14).translate(s * (RCO + RPI) / 2, (Y_COL + YBT) / 2, -0.07))), lam(0x4b5563));
  // bit (whole, not cut) with 3 nozzles + jets
  const BIT = O.bit = new THREE.Group(); BIT.position.y = YB; DS.add(BIT);
  add(BIT, cyl(1.45, 1.1, 18), lam(0x9ca3af), 0, 1.45, 0);
  add(BIT, cyl(0.9, 0.5, 18, false, RCO), lam(0xb0b7c2), 0, 2.05, 0);
  add(BIT, new THREE.ConeGeometry(1.5, 0.9, 18).rotateX(Math.PI), lam(0xb0b7c2), 0, 0.45, 0);
  const teeth = [];
  for (let i = 0; i < 18; i++) {
    const a = i / 18 * Math.PI * 2, r = 0.55 + (i % 3) * 0.42;
    teeth.push(new THREE.ConeGeometry(0.2, 0.42, 4).rotateX(Math.PI).translate(Math.cos(a) * r, 0.42 - (r - 0.55) * 0.42, Math.sin(a) * r));
  }
  add(BIT, strip(teeth), lam(0xfbbf24));
  const nz = [];
  for (let k = 0; k < 3; k++) { const a = k * 2.094; nz.push(cylBetween([Math.cos(a) * 0.62, 0.55, Math.sin(a) * 0.62], [Math.cos(a) * 0.8, 0.3, Math.sin(a) * 0.8], 0.13, 8)); }
  add(BIT, strip(nz), lam(0x111827));
  O.jetM = basic(0xd9fffa, { transparent: true, opacity: 0.0, blending: THREE.AdditiveBlending, depthWrite: false });
  for (let k = 0; k < 3; k++) {
    const a = k * 2.094;
    const g = new THREE.ConeGeometry(0.24, 1.0, 10, 1, true); g.translate(0, -0.5, 0);
    const m = add(BIT, g, O.jetM, Math.cos(a) * 0.74, 0.36, Math.sin(a) * 0.74);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), new THREE.Vector3(Math.cos(a) * 0.5, -0.86, Math.sin(a) * 0.5).normalize());
  }
  O.NPW = 640;
  O.mudW = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.13, 0), basic(0xffffff), O.NPW);
  O.mudW.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(O.NPW * 3), 3);
  O.cutW = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1, 0), lam(0xffffff), 240);
  O.cutW.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(240 * 3), 3);
  O.chipsW = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1, 0), lam(0xb45f2a), 4);
  for (const m of [O.mudW, O.cutW, O.chipsW]) { m.frustumCulled = false; G.add(m); }
}
const TA = (Y_TOP - YBT) / 12, TB = 0.4, TCt = 0.5, TD = (0.3 - (YB + 1.4)) / 3.0, TE = 2.0;
const TT = TA + TB + TCt + TD + TE;
const BIT_ROT = t => t * 1.3;
const pp = [0, 0, 0];
function mudPathW(tau, i, rot, out) {
  const jx = (hash(i, 41) - 0.5) * 2, jz = -0.3 + hash(i, 42) * 0.55;
  const side = hash(i, 43) < 0.5 ? -1 : 1, lane = 0.95 + hash(i, 44) * 0.5, lz = -0.55 + hash(i, 45) * 0.85;
  if (tau < TA) { out[0] = jx * 0.25; out[1] = Y_TOP - 12 * tau; out[2] = jz; return 0; }
  const a = rot + (i % 3) * 2.094, ca = Math.cos(a), sa = Math.sin(a);
  if (tau < TA + TB) { const u = (tau - TA) / TB; out[0] = lerp(0.74, 1.45, u) * ca; out[1] = YB + lerp(0.36, 0.1, u); out[2] = lerp(0.74, 1.45, u) * sa; return 1; }
  const sd = ca >= 0 ? 1 : -1;
  if (tau < TA + TB + TCt) { const u = (tau - TA - TB) / TCt; out[0] = lerp(1.45 * ca, sd * lane, u); out[1] = YB + lerp(0.1, 1.4, u); out[2] = lerp(1.45 * sa, lz, u); return 2; }
  const c = tau - TA - TB - TCt;
  if (c < TD) { const y = YB + 1.4 + 3.0 * c, u = clamp(c / 0.6); out[0] = lerp(sd * lane, side * lane, u) + Math.sin(y * 0.7 + i) * 0.06; out[1] = y; out[2] = lz; return 3; }
  const e = c - TD;
  if (e < 0.4) { const u = e / 0.4; out[0] = lerp(side * lane, RC + 0.3, u); out[1] = lerp(0.3, 1.0, u); out[2] = lerp(lz, 0.1, u); return 4; }
  out[0] = RC + 0.3 + 3.2 * (e - 0.4); out[1] = 1.0 + jz * 0.4; out[2] = 0.15; return out[0] < 9 ? 4 : -1;
}
function stateWell(t) {
  const rot = BIT_ROT(t);
  O.dsRot.rotation.y = rot; O.bit.rotation.y = rot;
  const ks = 1.25;
  let n = 0;
  for (let i = 0; i < O.NPW; i++) {
    const tau = ((hash(i, 40) * TT + t) % TT + TT) % TT;
    const ph = mudPathW(tau, i, rot, pp);
    if (ph < 0) continue;
    if (ph === 1 && pp[2] < -0.2 && Math.abs(pp[0]) < 1.4) continue;
    setI(O.mudW, n, pp[0], pp[1], pp[2], ph === 1 ? ks * 1.35 : ks);
    O.col.setHex(ph === 0 ? 0x7fe3d6 : ph === 1 ? 0xe8fffb : 0xd9b48a).toArray(O.mudW.instanceColor.array, n * 3); n++;
  }
  done(O.mudW, n);
  const Tc = 0.6 + TD * 3 / 1.8 + TE;
  n = 0;
  for (let i = 0; i < 220; i++) {
    const tau = ((hash(i, 60) * Tc + t) % Tc + Tc) % Tc;
    const side = hash(i, 61) < 0.5 ? -1 : 1, lane = 1.0 + hash(i, 62) * 0.45, lz = -0.5 + hash(i, 63) * 0.8;
    const a = hash(i, 64) * 6.283, r0 = 0.3 + hash(i, 65) * 1.1;
    let x, y, z;
    if (tau < 0.6) { const u = tau / 0.6; x = lerp(Math.cos(a) * r0, side * lane, u); y = YB + lerp(0.06, 1.3, u); z = lerp(clamp(Math.sin(a) * r0, -0.6, 0.4), lz, u); }
    else {
      y = YB + 1.3 + 1.8 * (tau - 0.6);
      if (y > 0.3) { const e = (y - 0.3) / 1.8; x = RC + 0.3 + 3.2 * e; y = 1.0; z = 0.12; if (x > 9) continue; }
      else { x = side * lane + Math.sin(y * 0.9 + i) * 0.08; z = lz; }
    }
    setI(O.cutW, n, x, y, z, (0.11 + hash(i, 66) * 0.1) * ks);
    O.col.setHex([0x5b4a3a, 0x6f6252, 0x4a3b2e][i % 3]).toArray(O.cutW.instanceColor.array, n * 3); n++;
  }
  done(O.cutW, n);
  // 4 chips popping loose under a cutter at 82.0 (the cutters break the rock, the jets sweep it away)
  let nc = 0;
  if (t > 81.9 && t < 84.5) for (let k = 0; k < 4; k++) {
    const age = t - 81.9 - k * 0.07; if (age < 0) continue;
    const a = 0.25 + k * 0.32, x = 1.05 + Math.cos(a) * 0.3 + age * 0.35, y = YB + 0.08 + age * (1.6 - 0.9 * age), z = 0.55 + Math.sin(a) * 0.2 - age * 0.2;
    setI(O.chipsW, nc++, x, Math.max(YB + 0.06, y), z, 0.13 * clamp(1 - (age - 1.8) / 0.6));
  }
  done(O.chipsW, nc);
  O.jetM.opacity = (0.32 + 0.58 * sstep(80.6, 81.0, t)) * (0.88 + 0.12 * Math.sin(t * 23));
  O.gasPores.material.opacity = 0.5 + 0.18 * Math.sin(t * 3);
}

// ================================================================ NEW land assets (circulating system)
const PADDLE = [8.16, 5.36, -3.78], FLOW_DIR = [10.35, -0.85, -4.5];
function tripStencilTex() {
  const c = document.createElement('canvas'); c.width = 128; c.height = 768;
  const x = c.getContext('2d');
  x.fillStyle = '#56677d'; x.fillRect(0, 0, 128, 768);
  x.save(); x.translate(64, 384); x.rotate(-Math.PI / 2);
  x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = '#ffd23f';
  fitFont(x, 'TRIP TANK', 600, 92, 700); x.fillText('TRIP TANK', 0, 4);
  x.restore();
  grime(x, 128, 768, 160, 977, 0.2);
  return canvasTex(c);
}
function buildCircAdds(G) {
  SYS.cur = 'circ';
  const place = (a, p) => { a.group.position.set(...p); G.add(a.group); return a; };
  O.cp = place(A.chargePump(), [24.0, 0.7, 1.5]);
  O.sm = place(A.standpipeManifold(), [6.35, 7.75, 1.5]);
  O.dg = place(A.degasser(), [14.45, 3.0, -5.6]);
  O.dsn = place(A.hydrocyclones({ kind: 'desander' }), [17.0, 3.0, -5.6]);
  O.dsl = place(A.hydrocyclones({ kind: 'desilter' }), [19.8, 3.0, -5.6]);
  O.cf = place(A.centrifuge(), [25.7, 4.6, -5.6]);
  O.fp = place(A.flowPaddle({ dir: FLOW_DIR }), PADDLE);
  // trip tank: tall and narrow, beside the active tank (no volume marked)
  const TT0 = new THREE.Group(); TT0.position.set(28.1, 0, -5.5); G.add(TT0); O.trip = TT0;
  add(TT0, box(1.2, 4.2, 1.2), lam(0x56677d), 0, 2.1, 0);
  add(TT0, strip([box(1.3, 0.12, 0.14).translate(0, 4.2, 0.6), box(1.3, 0.12, 0.14).translate(0, 4.2, -0.6), box(0.14, 0.12, 1.3).translate(0.6, 4.2, 0), box(0.14, 0.12, 1.3).translate(-0.6, 4.2, 0)]), lam(0xfbbf24));
  add(TT0, box(0.2, 3.7, 0.04), lam(0x1f2937), 0.35, 2.15, 0.61);
  add(TT0, box(0.12, 3.6, 0.03), basic(0xbfe9e4, { transparent: true, opacity: 0.55 }), 0.35, 2.15, 0.635);
  O.tripFloat = add(TT0, box(0.16, 0.12, 0.05), basic(0x14b8a6), 0.35, 2.4, 0.65);
  add(TT0, new THREE.PlaneGeometry(0.42, 2.6), new THREE.MeshLambertMaterial({ map: tripStencilTex(), emissive: 0x222222 }), -0.22, 2.2, 0.605);
  add(TT0, pipeRun([[0, 0.5, -0.6], [0, 0.5, -1.0], [-1.2, 0.5, -1.0]], 0.09, 8), lam(0x6b7280));
  // gooseneck on the land top drive (static): the kelly hose lands here
  O.tdGoose = add(O.topDrive, new THREE.TorusGeometry(0.35, 0.12, 8, 14, Math.PI).rotateY(Math.PI / 2), lam(0x94a3b8), 0.0, 1.95, 0.0);
  // pop-off valve on the land pump discharge, vented back to the tanks
  add(G, box(0.32, 0.32, 0.32), lam(0xdc2626), 20.8, 2.05, 7.2);
  add(G, pipeRun([[20.8, 2.2, 7.2], [20.8, 2.5, 7.2], [20.8, 2.5, -0.6], [20.8, 3.3, -1.6]], 0.06, 6), lam(0x9ca3af));
  SYS.cur = null;
}

// ================================================================ STUDIO set: slots for the new studio models
const SLOT = { PUMP_A: [100, -0.3, 0], PUMP_B: [100, 1.95, 40], WASH: [60, 0.1, 40], CAB: [20, -0.3, 40] };
function windowTex() {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 384;
  const x = c.getContext('2d');
  const g = x.createLinearGradient(0, 0, 0, 384);
  g.addColorStop(0, '#1f2a63'); g.addColorStop(0.55, '#9a4f86'); g.addColorStop(0.82, '#ffab6b'); g.addColorStop(1, '#ffc58f');
  x.fillStyle = g; x.fillRect(0, 0, 1024, 384);
  x.fillStyle = '#3a2a2e'; x.fillRect(0, 330, 1024, 54);
  // flat derrick silhouette seen through the window
  x.strokeStyle = '#2a1f26'; x.lineWidth = 6; x.fillStyle = '#2a1f26';
  const L = (a, b, c2, d) => { x.beginPath(); x.moveTo(a, b); x.lineTo(c2, d); x.stroke(); };
  L(600, 340, 680, 30); L(800, 340, 720, 30); L(680, 30, 720, 30);
  for (let k = 0; k < 7; k++) { const y0 = 340 - k * 44, y1 = y0 - 44, u0 = k / 7, u1 = (k + 1) / 7; L(600 + 80 * u0, y0, 800 - 80 * u1, y1); L(800 - 80 * u0, y0, 600 + 80 * u1, y1); L(600 + 80 * u0, y0, 800 - 80 * u0, y0); }
  x.fillRect(560, 320, 280, 20);
  return canvasTex(c);
}
function sideScreenTex(k) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 384;
  const x = c.getContext('2d');
  x.fillStyle = '#0b1220'; x.fillRect(0, 0, 512, 384);
  x.strokeStyle = 'rgba(20,184,166,0.5)'; x.lineWidth = 3;
  for (let j = 0; j < 3; j++) {
    x.beginPath();
    for (let i = 0; i <= 60; i++) { const px = 30 + i * 7.5, py = 70 + j * 110 + 26 * Math.sin(i * 0.3 + j * 2 + k) * (0.4 + 0.6 * hash(i, j + k * 9)); i ? x.lineTo(px, py) : x.moveTo(px, py); }
    x.stroke();
  }
  return canvasTex(c);
}
function buildCab(G) {
  const C = O.cab = new THREE.Group(); C.position.set(...SLOT.CAB); G.add(C);
  add(C, box(6, 0.2, 5), lam(0x2b3445), 0, 0.1, 0.4);
  // back wall with the window
  add(C, strip([box(6, 1.0, 0.2).translate(0, 0.7, -2.2), box(6, 0.7, 0.2).translate(0, 4.75, -2.2), box(0.5, 4.6, 0.2).translate(-2.75, 2.5, -2.2), box(0.5, 4.6, 0.2).translate(2.75, 2.5, -2.2)]), lam(0x3a4558));
  add(C, new THREE.PlaneGeometry(5.0, 3.2), basic(0xffffff, { map: windowTex() }), 0, 2.8, -2.25);
  add(C, box(5.0, 0.08, 0.1), lam(0x1f2937), 0, 2.8, -2.1);
  // console + screens
  add(C, box(3.0, 0.9, 1.2), lam(0x334155), 0, 1.4, -1.3);
  add(C, box(3.1, 0.08, 1.3), lam(0x1f2937), 0, 1.88, -1.3);
  const SG = O.screen = new THREE.Group(); SG.position.set(0, 2.6, -1.0); SG.rotation.x = -0.17; C.add(SG);
  add(SG, box(2.6, 1.6, 0.08), lam(0x111827), 0, 0, -0.06);
  add(SG, new THREE.PlaneGeometry(2.4, 1.4), basic(0x0b1220), 0, 0, -0.01);
  add(SG, box(0.2, 0.9, 0.12), lam(0x1f2937), 0, -1.1, -0.15);
  O.scr = { tl: mark(SG, -1.2, 0.7, 0), tr: mark(SG, 1.2, 0.7, 0), bl: mark(SG, -1.2, -0.7, 0) };
  for (const s of [-1, 1]) {
    const sg = new THREE.Group(); sg.position.set(s * 1.95, 2.45, -0.75); sg.rotation.y = -s * 0.52; sg.rotation.x = -0.12; C.add(sg);
    add(sg, box(1.32, 1.0, 0.07), lam(0x111827), 0, 0, -0.05);
    add(sg, new THREE.PlaneGeometry(1.2, 0.9), basic(0xffffff, { map: sideScreenTex(s > 0 ? 3 : 0) }), 0, 0, -0.01);
  }
  // chair with joystick armrests
  add(C, box(1.0, 0.2, 1.0), lam(0x1f2937), 0, 1.0, 1.4);
  add(C, box(1.05, 1.4, 0.18), lam(0x1f2937), 0, 1.8, 1.95);
  add(C, cyl(0.08, 0.9, 8), lam(0x475569), 0, 0.5, 1.4);
  for (const s of [-1, 1]) {
    add(C, box(0.18, 0.12, 0.9), lam(0x334155), s * 0.62, 1.35, 1.35);
    add(C, box(0.3, 0.14, 0.3), lam(0x111827), s * 0.62, 1.45, 1.0);
    add(C, cylBetween([s * 0.62, 1.5, 1.0], [s * 0.62, 1.78, 0.98], 0.04, 6), lam(0x0f172a));
    add(C, new THREE.SphereGeometry(0.07, 8, 6), lam(0xdc2626), s * 0.62, 1.8, 0.98);
  }
  // the driller, seated, seen from behind
  const d = buildHuman(0xf97316, 0xffffff); d.scale.setScalar(1.15); d.position.set(0, 0.12, 1.5); C.add(d);
}
function buildStudio(G) {
  add(G, cyl(120, 0.4, 48), lam(0x16233a), 30, -0.5, 0);
  const place = (a, p) => { a.group.position.set(...p); G.add(a.group); return a; };
  O.tri = place(A.triplex(), SLOT.PUMP_A);
  O.pb = place(A.pumpSection(), SLOT.PUMP_B);
  O.wp = place(A.washpipe(), SLOT.WASH);
  buildCab(G);
  O.sGroups = { PUMP_A: O.tri.group, PUMP_B: O.pb.group, WASH: O.wp.group, CAB: O.cab };
}

// ================================================================ paths (set-local polylines with named vertices)
function mkPath(list) {
  const pts = list.map(e => e[1]), poly = new Poly(pts), s = {};
  list.forEach((e, i) => { if (!(e[0] in s)) s[e[0]] = poly.c[i]; });
  return { poly, s, L: poly.L, pts };
}
const pAt = (path, s) => { path.poly.at(s, O.v3); return [O.v3.x, O.v3.y, O.v3.z]; };
const HOSE_W = [0, 0, 0, 0.15, 0.25, 0.55, 0.9, 1, 1];
function hosePtsDy(dy) {
  const cv = new THREE.CatmullRomCurve3(HOSE_CTRL.map((p, i) => new THREE.Vector3(p[0], p[1] + dy * HOSE_W[i], p[2])));
  return cv.getPoints(26).map(v => [v.x, v.y, v.z]);
}
// top drive drills ahead ~2 m (1.5 u) during the kelly-hose shot, then stays there
const tdDy = t => -1.5 * clamp((t - 61.5) / 7.5);
const _dn = { dy: null, path: null };
function DN(dy) {
  if (_dn.dy === dy) return _dn.path;
  const H = hosePtsDy(dy);
  const list = [
    ['hover', [24, 5.2, -3.4]], ['sink', [24, 2.1, -3.4]], ['suc0', [24, 0.85, -1.7]], ['wall', [24, 0.7, -1.0]], ['flange', [24, 0.7, 0.89]], ['eye', [24, 0.7, 1.22]],
    ['out', [23.45, 1.285, 1.5]], ['r1', [23.0, 1.285, 1.5]], ['r2', [23.0, 1.285, 2.6]], ['r3', [23.0, 0.7, 3.0]], ['r4', [23.0, 0.7, 4.4]], ['r5', [21.25, 0.7, 4.4]], ['tsuc', [21.25, 0.62, 6.1]],
    ['tin', [21.25, 0.62, 7.2]], ['fe', [21.6, 1.4, 7.2]], ['dis0', [21.0, 1.85, 7.2]], ['dis1', [20.3, 1.85, 7.2]], ['dis2', [20.3, 0.45, 7.2]], ['dis3', [8.0, 0.45, 7.2]], ['dis4', [8.0, 0.45, 1.5]],
    ['riser', [8.0, 7.75, 1.5]], ['manIn', [7.55, 7.75, 1.5]], ['manOut', [5.15, 7.75, 1.5]], ['spBase', [4.7, 7.75, 1.5]],
    ...H.map((p, i) => [i === 0 ? 'spTop' : i === H.length - 1 ? 'goose' : 'h' + i, p]),
    ['td', [0, 20.6 + dy, 0]], ['floor', [0, 7.4, 0]], ['ground', [0, -1.0, 0]],
  ];
  _dn.dy = dy; _dn.path = mkPath(list); _dn.list = list;
  return _dn.path;
}
const HOLE = [['ground', [0, -1.0, 0]], ['deep', [0, -20, 0]], ['turn', [0.35, -20.4, 0]], ['up', [0.35, 2.9, 0]]];
function wpos(o, set = 'L') { o.getWorldPosition(O.v3); const f = OFF[set]; return [O.v3.x - f[0], O.v3.y - f[1], O.v3.z - f[2]]; }
const addV = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
function buildRET() {
  scene.updateMatrixWorld(true);
  const dgO = O.dg.group.position.toArray();
  O.cascade = O.dg.paths.cascade.map(p => addV(p, dgO));
  O.wp_ = {
    dgTankIn: wpos(O.dg.anchors.tankIn), dgInlet: wpos(O.dg.anchors.inlet), dgOut: wpos(O.dg.anchors.outlet), dgTankOut: wpos(O.dg.anchors.tankOut), vac: wpos(O.dg.anchors.vacuumPump),
    dsFeed: wpos(O.dsn.anchors.feed), dsHead: wpos(O.dsn.anchors.head), dsOver: wpos(O.dsn.anchors.overflow), dsOut: wpos(O.dsn.anchors.overflowOut), dsApex: wpos(O.dsn.anchors.apex),
    dlFeed: wpos(O.dsl.anchors.feed), dlHead: wpos(O.dsl.anchors.head), dlOver: wpos(O.dsl.anchors.overflow), dlOut: wpos(O.dsl.anchors.overflowOut),
    cfFeed: wpos(O.cf.anchors.feed), cfBowl: wpos(O.cf.anchors.bowlMid), cfLiq: wpos(O.cf.anchors.liquidOut), cfSol: wpos(O.cf.anchors.solidsOut), cfChute: wpos(O.cf.anchors.chuteEnd),
    cpCase: wpos(O.cp.anchors.casing), spGauge: wpos(O.sm.anchors.gauge), spValveA: wpos(O.sm.anchors.valveA), fpSensor: wpos(O.fp.anchors.sensor), fpPaddle: wpos(O.fp.anchors.paddle),
  };
  const P = O.wp_;
  const list = [
    ['bop', [0, 2.9, 0]], ['bell', [0, 6.0, 0]], ['fl0', [0.4, 6.0, -0.4]], ['fl1', [10.75, 5.15, -4.9]], ['belly', [12.25, 5.3, -5.0]], ['deck0', [12.25, 4.95, -4.1]], ['deck1', [12.25, 4.6, -2.6]], ['tankA', [12.6, 2.55, -2.4]],
    ['dgTankIn', P.dgTankIn], ['dgUp', [P.dgTankIn[0], P.dgInlet[1], P.dgTankIn[2]]], ['dgInlet', P.dgInlet], ...O.cascade.map((p, i) => ['c' + i, p]), ['dgOut', P.dgOut], ['dgEd', [P.dgOut[0] + 0.7, P.dgOut[1], P.dgOut[2]]], ['dgTankOut', P.dgTankOut],
    ['tankB0', [P.dsFeed[0] - 0.4, 2.2, P.dsFeed[2]]], ['dsFeedUp', [P.dsFeed[0] - 0.4, P.dsFeed[1], P.dsFeed[2]]], ['dsFeed', P.dsFeed], ['dsCore', [P.dsHead[0], P.dsApex[1] + 0.3, P.dsHead[2]]], ['dsOver', P.dsOver], ['dsOut', P.dsOut],
    ['tankB1', [P.dlFeed[0] - 0.4, 2.2, P.dlFeed[2]]], ['dlFeedUp', [P.dlFeed[0] - 0.4, P.dlFeed[1], P.dlFeed[2]]], ['dlFeed', P.dlFeed], ['dlOver', P.dlOver], ['dlOut', P.dlOut],
    ['tankC0', [P.dlOut[0] + 0.4, 2.2, P.dlOut[2]]], ['cfUp0', [P.cfFeed[0], 2.2, P.cfFeed[2]]], ['cfFeed', P.cfFeed], ['cfBowl', P.cfBowl], ['cfWeir', [P.cfLiq[0], P.cfBowl[1] - 0.2, P.cfBowl[2]]], ['cfLiq', P.cfLiq], ['splash', [P.cfLiq[0], MUDY, P.cfLiq[2]]],
  ];
  O.RET = mkPath(list);
  O.RETlist = list;
}
function LOOPpath(dy) {
  const k = 'loop' + dy;
  if (O[k]) return O[k];
  const dn = DN(dy);
  const list = [..._dn.list, ...HOLE.slice(1), ...O.RETlist];
  const p = mkPath(list); p.sRet = p.s.bop; p.sHole = p.s.ground; p.sCent = p.s.cfLiq;
  O[k] = p; return p;
}

// ================================================================ the drop: one lap of the loop
// returns { par: 'L'|'W'|'PA'|'PB'|'WS', p:[x,y,z] in that parent's space, dirt, shimmer, op, squash, chip, bubbles, ring, vis, splashPos, splashAge }
const E = { l: u => u, io: eio, o: eout, i: u => u * u * u, s: u => u * u * (3 - 2 * u) };
function keyS(keys, t, S) {
  let i = 0; while (i < keys.length - 2 && t >= keys[i + 1][0]) i++;
  const a = keys[i], b = keys[i + 1], u = clamp((t - a[0]) / (b[0] - a[0]));
  const sv = k => (Array.isArray(k) ? S[k[0]] + k[1] : typeof k === 'number' ? k : S[k]);
  return lerp(sv(a[1]), sv(b[1]), (E[a[2]] || E.l)(u));
}
function dirtAt(t) {
  if (t < 82.2) return 0;
  if (t < 110.2) return sstep(82.2, 82.6, t);
  if (t < 120.5) return 0.7;
  if (t < 125.0) return lerp(0.7, 0.6, sstep(120.3, 120.7, t));
  if (t < 129.2) return lerp(0.6, 0.4, sstep(124.8, 125.2, t));
  if (t < 133.0) return lerp(0.4, 0.2, sstep(129.0, 129.4, t));
  if (t < 145) return 0.2 * (1 - sstep(133.0, 135.0, t));
  return 0;
}
const bob = (t, t0) => 0.1 * Math.sin(2.4 * (t - t0)) * sstep(t0, t0 + 0.6, t);
const posAlong = (pts, u) => { const p = new Poly(pts); p.at(u * p.L, O.v3); return [O.v3.x, O.v3.y, O.v3.z]; };
function dropAt(t) {
  const d = { par: 'L', p: [0, 0, 0], dirt: dirtAt(t), shimmer: 0, op: 1, squash: 1, ring: true, vis: true, chip: 0, bubbles: 0 };
  d.chip = t > 82.2 && t < 110.2 ? sstep(82.2, 82.5, t) : 0;
  d.bubbles = t > 86 && t < 118 ? sstep(86.0, 86.4, t) * (1 - sstep(116.6, 117.6, t)) : 0;
  if (t < 6.0) { d.vis = false; return d; }
  if (t < 16.6) { // pops out of the active tank, hovers
    const u = eout((t - 6.0) / 0.6);
    d.p = [24, lerp(MUDY, 5.2, u) + bob(t, 6.6), -3.4];
    d.splashPos = [24, MUDY + 0.02, -3.4]; d.splashAge = t - 6.0; d.ring = t > 6.2;
    return d;
  }
  const dn = DN(tdDy(t)), S = dn.s;
  if (t < 19.8) { // sinks, suction nozzle, through the wall to the charge pump
    const s = keyS([[16.6, 'hover', 's'], [17.3, 'sink', 'l'], [17.8, 'suc0', 'l'], [18.3, 'wall', 'l'], [19.0, 'flange', 'o'], [19.8, 'eye', 'l']], t, S);
    d.p = pAt(dn, s); d.op = d.p[1] < MUDY ? 0.55 : 1; return d;
  }
  if (t < 20.8) { // 3/4 spiral on the impeller
    const sp = O.cp.spiral(eio((t - 19.8) / 1.0), t); d.p = addV(O.wp_.cpCase, [sp.x, sp.y, sp.z + 0.06]); d.squash = 0.8; return d;
  }
  if (t < 22.5) {
    if (t < 21.0) { const sp = O.cp.spiral(1, t), a = addV(O.wp_.cpCase, [sp.x, sp.y, sp.z]); d.p = V(a, pAt(dn, S.out), (t - 20.8) / 0.2); return d; }
    d.p = pAt(dn, keyS([[21.0, 'out', 'l'], [22.3, 'tsuc', 'o'], [22.5, 'tsuc', 'l']], t, S)); return d;
  }
  if (t < 29.7) { // triplex overview: rides into the suction manifold, then is hidden inside the block
    d.par = 'PA'; const a = O.tri.anchors.suctionInlet.position.toArray();
    d.p = addV(a, [0, 0, 1.8 * (1 - eio((t - 22.5) / 0.9))]); d.vis = t < 23.5; return d;
  }
  if (t < 45.5) { // pump section: suction -> chamber -> discharge port (parked) -> under the dampener -> off frame
    d.par = 'PB';
    if (t < 29.9) { d.p = O.pbSuc.at(0, O.v3).toArray(); return d; }
    if (t < 30.65) { d.p = O.pbSuc.at(O.pbSuc.L * eio((t - 29.9) / 0.75), O.v3).toArray(); return d; }
    d.shimmer = 1;
    if (t < 38.0) { d.p = O.pbDis.at(O.pbDisPort * eio((t - 30.65) / 0.75), O.v3).toArray(); return d; }
    d.p = O.pbDis.at(lerp(O.pbDisPort, O.pbDis.L, sstep(38.0, 42.0, t)), O.v3).toArray(); d.vis = t < 42.0; return d;
  }
  if (t < 53.5) { d.vis = false; return d; }
  if (t < 69.5) { // manifold -> standpipe -> kelly hose -> gooseneck
    d.shimmer = 1;
    const s = keyS([[53.5, ['riser', -2.2], 'l'], [54.4, 'manIn', 'l'], [54.6, 'manIn', 'l'], [55.6, 'manOut', 'l'], [56.2, 'spBase', 'l'], [57.4, ['spBase', 0.9], 's'], [61.0, 'spTop', 'l'], [61.9, 'h2', 'l'], [62.0, 'h2', 's'], [66.4, 'goose', 'l'], [69.5, 'goose', 'l']], t, S);
    d.p = pAt(dn, s); if (t > 66.4) d.p[1] += 0.05 * Math.sin((t - 66.4) * 3); return d;
  }
  if (t < 76.9) { // studio washpipe: gooseneck -> washpipe -> packing -> rotating shaft
    d.par = 'WS'; d.shimmer = 1; const W_ = O.wpS;
    const s = keyS([[69.5, 0, 'l'], [70.0, W_.g0, 'l'], [71.4, W_.wTop, 'l'], [72.6, W_.wTop + 1.25, 'l'], [73.6, W_.sTop, 'l'], [74.8, W_.L, 'l'], [76.9, W_.L + 4.0, 'l']], t, {});
    d.p = O.wpFlow.at(Math.min(s, O.wpFlow.L), O.v3).toArray();
    if (s > O.wpFlow.L) d.p[1] -= s - O.wpFlow.L;
    if (s > W_.sTop) { const a = (t - 73.6) * 1.6 * 0.3 * 6.283; d.p[0] += 0.08 * Math.sin(a); }
    d.vis = s < O.wpFlow.L + 0.6; return d;
  }
  if (t < 90.7) { d.par = 'W'; return dropW(t, d); }
  if (t < 98.7) { // bell nipple -> flowline (gravity) -> possum belly
    const s = keyS([[90.7, 'bop', 'l'], [90.9, 'bop', 'o'], [92.0, 'bell', 'l'], [92.3, 'fl0', 'l'], [97.6, 'fl1', 'l'], [97.8, 'belly', 'l'], [98.7, 'belly', 'l']], t, O.RET.s);
    d.p = pAt(O.RET, s); if (t > 92.3 && t < 97.6) d.p[1] += 0.04 * Math.abs(Math.sin((t - 92.3) * 5)) - 0.1;
    return d;
  }
  if (t < 106.5) { // replay ghost under the flow paddle
    const u = (t - 98.9) / 1.0, dl = Math.hypot(...FLOW_DIR), k = lerp(-1.4, 1.4, clamp(u));
    d.p = [PADDLE[0] + FLOW_DIR[0] / dl * k, PADDLE[1] + FLOW_DIR[1] / dl * k - 0.1, PADDLE[2] + FLOW_DIR[2] / dl * k];
    d.op = 0.6; d.ring = false; d.vis = u > 0 && u < 1; return d;
  }
  if (t < 113.9) { // shale shaker
    if (t < 107.2) { d.p = pAt(O.RET, keyS([[106.5, 'belly', 'l'], [106.8, 'belly', 'l'], [107.2, 'deck0', 'l']], t, O.RET.s)); return d; }
    if (t < 111.0) {
      d.p = V(O.RET.pts[5], O.RET.pts[6], sstep(107.4, 110.0, t));
      d.p[0] += O.basket.position.x - 12.25; d.p[1] += O.basket.position.y - 4.55; d.p[2] += O.basket.position.z + 2.65; return d;
    }
    if (t < 111.6) { const u = sstep(111.0, 111.6, t); d.p = [12.3, lerp(4.6, 4.2, u), -2.55]; d.squash = [1 + 0.4 * Math.sin(u * Math.PI), 1 - 0.5 * Math.sin(u * Math.PI), 1 + 0.4 * Math.sin(u * Math.PI)]; return d; }
    const u = E.i((t - 111.6) / 0.9);
    d.p = V([12.3, 4.2, -2.55], [12.6, MUDY - 0.15 * clamp((t - 112.5) / 1), -2.4], clamp(u));
    d.splashPos = [12.6, MUDY + 0.02, -2.4]; d.splashAge = t - 112.5; d.op = t > 112.5 ? 0.6 : 1; return d;
  }
  if (t < 121.7) { // vacuum degasser
    const R = O.RET, S2 = R.s;
    if (t < 116.0) { d.p = pAt(R, keyS([[113.9, 'tankA', 'l'], [114.8, 'dgTankIn', 'l'], [115.5, 'dgUp', 'l'], [116.0, 'dgInlet', 'l']], t, S2)); d.op = t < 114.9 ? 0.6 : 1; return d; }
    if (t < 119.4) { d.p = pAt(R, lerp(S2.c0, S2.dgOut, sstep(116.0, 119.2, t))); d.squash = [1.35, 0.4, 1.35]; return d; }
    d.p = pAt(R, keyS([[119.4, 'dgOut', 'l'], [119.8, 'dgOut', 'l'], [120.2, 'dgEd', 'l'], [120.6, 'dgTankOut', 'l'], [121.7, 'tankB0', 'l']], t, S2));
    d.op = t > 120.6 ? 0.6 : 1; d.splashPos = R.pts[R.pts.findIndex((p, i) => O.RETlist[i][0] === 'dgTankOut')]; d.splashAge = t - 120.6; return d;
  }
  if (t < 125.6) return cyc(t, d, O.dsn, 'ds', 121.7, [122.0, 122.4, 124.4, 124.7, 125.0, 125.4], 'tankB0');
  if (t < 129.7) return cyc(t, d, O.dsl, 'dl', 125.4, [125.9, 126.0, 128.4, 128.6, 129.0, 129.4], 'dsOut');
  if (t < 137.7) { // decanting centrifuge -> clean -> back into the active tank
    const R = O.RET, S2 = R.s;
    if (t < 131.0) { d.p = pAt(R, keyS([[129.7, 'dlOut', 'l'], [129.9, 'tankC0', 'l'], [130.2, 'cfUp0', 'l'], [130.5, 'cfFeed', 'l'], [131.0, 'cfBowl', 'l']], t, S2)); d.op = d.p[1] < MUDY ? 0.6 : 1; return d; }
    if (t < 135.6) {
      const u = sstep(131.0, 135.0, t), a = 1.1 * Math.sin((t - 131) * 1.8), r = 0.26 * sstep(131.0, 131.5, t);
      const b = O.wp_.cfBowl;
      d.p = [lerp(b[0], O.wp_.cfLiq[0] - 0.1, u), b[1] + r * Math.sin(a), b[2] + r * Math.cos(a)]; return d;
    }
    const u = E.i((t - 135.6) / 0.8);
    d.p = V([O.wp_.cfLiq[0] - 0.1, O.wp_.cfBowl[1], O.wp_.cfBowl[2]], [O.wp_.cfLiq[0], MUDY - 0.2 * clamp((t - 136.4) / 1.2), O.wp_.cfLiq[2]], clamp(u));
    d.splashPos = [O.wp_.cfLiq[0], MUDY + 0.02, O.wp_.cfLiq[2]]; d.splashAge = t - 136.4; d.op = t > 136.4 ? 0.6 : 1; return d;
  }
  if (t < 145.7) { d.vis = false; return d; }
  if (t < 161.3) { // recap: one fast lap, splash, then hover over the active tank
    const L = LOOPpath(tdDy(t));
    if (t < 146.0) { d.p = pAt(L, 0); return d; }
    if (t < 150.0) {
      const s = L.L * eio((t - 146.0) / 4.0); d.p = pAt(L, s);
      d.dirt = s < L.sHole ? 0 : s < L.s.belly ? 1 : s < L.s.tankA ? 0.7 : s < L.s.dgTankOut ? 0.6 : s < L.s.dsOut ? 0.4 : s < L.s.dlOut ? 0.2 : 0;
      d.chip = s > L.sHole && s < L.s.belly ? 1 : 0; d.bubbles = 0; d.shimmer = s < L.sHole ? 1 : 0;
      d.op = s > L.s.ground && s < L.sRet ? 0.7 : 1;
      return d;
    }
    const sp = pAt(L, L.L);
    const u = eout((t - 150.4) / 0.8);
    d.p = [sp[0], lerp(MUDY - 0.1, 4.6, clamp(u)) + bob(t, 151.2), sp[2]];
    d.splashPos = [sp[0], MUDY + 0.02, sp[2]]; d.splashAge = t - 150.0; d.op = t < 150.6 ? 0.6 : 1; d.ring = t > 150.8; return d;
  }
  d.vis = false; return d;
}
function cyc(t, d, H, k, t0, T, from) { // through a hydrocyclone: feed -> wall spiral down -> core spiral up -> overflow
  const R = O.RET, S2 = R.s, g = H.group.position.toArray();
  const V_ = (u, down) => { const v = H.vortex(u, t, down); return [v.x + g[0], v.y + g[1], v.z + g[2]]; };
  if (t < T[0]) { d.p = pAt(R, keyS([[t0, from, 'l'], [lerp(t0, T[0], 0.55), k === 'ds' ? 'dsFeedUp' : 'dlFeedUp', 'l'], [T[0], k + 'Feed', 'l']], t, S2)); d.op = d.p[1] < MUDY ? 0.6 : 1; return d; }
  if (t < T[1]) { d.p = V(pAt(R, S2[k + 'Feed']), V_(0, true), (t - T[0]) / (T[1] - T[0])); return d; }
  if (t < T[2]) { d.p = V_(0.72 * sstep(T[1], T[2], t), true); d.squash = 0.85; return d; }
  if (t < T[3]) { d.p = V(V_(0.72, true), V_(0.05, false), sstep(T[2], T[3], t)); return d; }
  if (t < T[4]) { d.p = V_(lerp(0.05, 1, sstep(T[3], T[4], t)), false); return d; }
  d.p = pAt(R, keyS([[T[4], k + 'Over', 'l'], [T[5], k + 'Out', 'l'], [T[5] + 0.4, k + 'Out', 'l']], t, S2));
  return d;
}
function dropW(t, d) { // well cutaway: dive down the bore, out of a nozzle, up the annulus
  d.shimmer = t < 81.2 ? 1 : 0;
  if (t < 80.4) { const y = lerp(8, -36, eio((t - 77.1) / 3.3)); d.p = [0, y, -0.1]; d.vis = true; return d; }
  const rot = BIT_ROT(81.2); let best = 0, bz = -9;
  for (let k = 0; k < 3; k++) { const z = Math.sin(rot + k * 2.094); if (z > bz) { bz = z; best = k; } }
  const a = rot + best * 2.094, N = [0.8 * Math.cos(a), YB + 0.3, 0.8 * Math.sin(a)];
  if (t < 81.2) { d.p = posAlong([[0, -36, -0.1], [0, YB + 1.0, -0.1], N], sstep(80.4, 81.2, t)); return d; }
  if (t < 82.8) { d.p = posAlong([N, [1.0, YB + 0.12, 0.6], [1.38, YB + 0.22, 0.32]], eout((t - 81.2) / 0.8)); d.p[1] += 0.03 * Math.sin(t * 9); return d; }
  if (t < 83.9) { d.p = V([1.38, YB + 0.22, 0.32], [1.15, -35.4, -0.3], sstep(82.8, 83.9, t)); return d; }
  if (t < 90.0) { const y = lerp(-35.4, 0.8, sstep(83.9, 90.0, t)); d.p = [1.15 + 0.05 * Math.sin(y * 1.3), y, -0.3]; return d; }
  d.p = V([1.15, 0.8, -0.3], [4.2, 1.0, 0.1], sstep(90.0, 90.7, t)); return d;
}
const V = (a, b, u) => [lerp(a[0], b[0], u), lerp(a[1], b[1], u), lerp(a[2], b[2], u)];

// ================================================================ shots (28). cam(t) -> { p, l, fov, vo:[dx,dy] } in the shot's frame
// frame = OFF[set] + base. blend: seconds over which the camera eases in from the previous shot's last pose (same frame).
const dropY = t => dropAt(t).p[1];
const SHOTS = [
  { id: 1, t0: 0, t1: 8, set: 'L', cam: t => { const u = clamp(t / 8); return { p: V([114, 5, 44], [106, 5.3, 41.5], u), l: V([18, 6.5, 0], [18, 6.8, 0], u), fov: 40 }; } },
  { id: 2, t0: 8, t1: 15.7, set: 'L', blend: 3.5, cam: t => ({ p: V([17, 88, 66], [18, 86, 65], clamp((t - 11.5) / 4.2)), l: [15, 4, -1], fov: 40, vo: [0, 120] }) },
  { id: 3, t0: 15.7, t1: 19.0, set: 'L', cam: t => { const u = eio((t - 15.7) / 2.3), h = Math.max(0, t - 18) * 0.12; return { p: V([13, 9.5, 17], [18 + h, 10, 17], u), l: V([20, 2.5, -2.5], [25, 2.5, -2.5], u), fov: 40, vo: [0, 60] }; } },
  { id: 4, t0: 19.0, t1: 22.5, set: 'L', blend: 1.0, cam: t => ({ p: [27.6 - 0.15 * clamp((t - 20) / 2.5), 3.2, 5.0], l: V([24.0, 0.9, 1.2], [21.8, 0.7, 4.4], eio((t - 21.4) / 1.1)), fov: 40, vo: [0, 60] }) },
  { id: 5, t0: 22.5, t1: 29.7, set: 'S', base: SLOT.PUMP_A, sub: 'PUMP_A', cam: t => ({ p: V([-15, 11, 7], [-14, 11.5, 9.5], (t - 22.5) / 7.2), l: [-1.5, 2.4, 0], fov: 44, vo: [0, 120] }) },
  { id: 6, t0: 29.7, t1: 37.5, set: 'S', base: SLOT.PUMP_B, sub: 'PUMP_B', cam: t => ({ p: V([-4.6, 3.4, 15], [-4.6, 3.4, 14], (t - 29.7) / 7.8), l: [-3.0, 2.4, 0], fov: 40, vo: [0, 200] }) },
  { id: 7, t0: 37.5, t1: 45.5, set: 'S', base: SLOT.PUMP_B, sub: 'PUMP_B', blend: 1.0, cam: t => ({ p: [-5.8, 6.2, 12.5 - 0.2 * clamp((t - 38.5) / 7)], l: [-6.4, 5.4, 0], fov: 40, vo: [0, 160] }) },
  { id: 8, t0: 45.5, t1: 53.5, set: 'S', base: SLOT.PUMP_B, sub: 'PUMP_B', cam: t => ({ p: [-1.6, 2.4, 8.6], l: [-1.6, 2.0, 0], fov: 36, vo: [0, 200] }) },
  { id: 9, t0: 53.5, t1: 57.2, set: 'L', cam: t => ({ p: V([11.5, 10.2, 8.5], [10.8, 10.0, 7.9], (t - 53.5) / 3.7), l: [6.2, 8.3, 1.5], fov: 40, vo: [0, 80] }) },
  { id: 10, t0: 57.2, t1: 61.5, set: 'L', blend: 0.9, cam: t => { const y = clamp(dropY(t - 0.4), 9.5, 23); return { p: [13, y - 0.5, 10], l: [4.9, y, 1.5], fov: 40, vo: [0, 60] }; } },
  { id: 11, t0: 61.5, t1: 69.5, set: 'L', blend: 1.2, cam: t => { const u = (t - 61.5) / 8, k = eio((t - 66.5) / 3); return { p: V(V([18.5, 26, 22.5], [17.5, 25.2, 23.5], u), [12.5, 24.2, 18.5], 0.25 * k), l: V([2.4, 20.6, 0.8], [1.0, 21.0, 0.4], k), fov: 40, vo: [0, 100] }; } },
  { id: 12, t0: 69.5, t1: 76.9, set: 'S', base: SLOT.WASH, sub: 'WASH', cam: t => { const a = eio((t - 72) / 2), b = clamp((t - 74) / 2.9); return { p: [lerp(2.0, 0.9, a), lerp(9.0, 6.8, a), lerp(9.5, 8.6, b)], l: V([1.2, 7.6, 0], [0.3, 5.0, 0], a), fov: 40, vo: [0, 140] }; } },
  { id: 13, t0: 76.9, t1: 80.6, set: 'W', cam: t => { const y = dropY(Math.max(77.0, t - 0.15)); return { p: [2.2, y + 1.4, 9.5], l: [0, y - 0.8, 0], fov: 40, vo: [0, 120] }; } },
  { id: 14, t0: 80.6, t1: 83.7, set: 'W', blend: 0.6, cam: t => ({ p: V([4.5, -35.4, 15.5], [3.8, -35.6, 15.0], (t - 80.6) / 3.1), l: [0.2, -37.0, 0], fov: 40, vo: [0, 160] }) },
  { id: 15, t0: 83.7, t1: 90.7, set: 'W', blend: 0.6, cam: t => { const y = dropY(Math.max(83.9, t - 0.3)); return { p: [5.5, y + 0.6, 12.5], l: [1.15, y, 0], fov: 40, vo: [-60, 140] }; } },
  { id: 16, t0: 90.7, t1: 94.6, set: 'L', cam: t => ({ p: [4.6, 4.4, -12.5], l: V([0.8, 4.6, -1.0], [4.0, 5.5, -2.2], eio((t - 92.6) / 2.0)), fov: 40, vo: [0, 80] }) },
  { id: 17, t0: 94.6, t1: 98.7, set: 'L', cam: t => ({ p: [14.0, 10.5, 9.0], l: V([8.6, 5.3, -3.8], [10.6, 5.2, -4.8], eio((t - 94.6) / 3.6)), fov: 40, vo: [0, 80] }) },
  { id: 18, t0: 98.7, t1: 106.5, set: 'L', cam: t => ({ p: V([10.4, 6.9, -0.2], [10.3, 6.85, -0.32], (t - 98.7) / 7.8), l: [8.2, 5.6, -3.8], fov: 40, vo: [0, 200] }) },
  { id: 19, t0: 106.5, t1: 113.9, set: 'L', cam: t => ({ p: V([19.5, 10.5, 9.0], [18.6, 10.0, 8.0], (t - 106.5) / 7.4), l: [12.3, 4.5, -2.6], fov: 40, vo: [0, 220] }) },
  { id: 20, t0: 113.9, t1: 121.7, set: 'L', blend: 0.9, cam: t => ({ p: V([17.8, 7.0, 1.5], [17.2, 6.6, 0.4], (t - 114.8) / 6.9), l: [14.45, 4.1, -5.6], fov: 40, vo: [0, 220] }) },
  { id: 21, t0: 121.7, t1: 125.6, set: 'L', blend: 0.7, cam: t => ({ p: V([21.5, 7.0, 1.0], [20.6, 6.6, 0.2], (t - 121.7) / 3.9), l: [17.0, 4.6, -5.6], fov: 40, vo: [0, 220] }) },
  { id: 22, t0: 125.6, t1: 129.7, set: 'L', blend: 0.7, cam: t => ({ p: [24.3, 6.4, 0.5], l: [19.8, 4.2, -5.6], fov: 40, vo: [0, 220] }) },
  { id: 23, t0: 129.7, t1: 137.7, set: 'L', blend: 0.8, cam: t => ({ p: V([28.0, 7.0, 1.8], [27.4, 6.6, 0.8], (t - 130.5) / 4.5), l: V([25.7, 4.6, -5.6], [26.4, 3.4, -5.6], eio((t - 135.2) / 2.0)), fov: 40, vo: [0, 220] }) },
  { id: 24, t0: 137.7, t1: 145.7, set: 'S', base: SLOT.CAB, sub: 'CAB', cam: t => ({ p: V([1.4, 3.3, 3.0], [1.1, 3.1, 2.3], (t - 137.7) / 8), l: [0, 2.6, -1.0], fov: 40, vo: [0, 120] }) },
  { id: 25, t0: 145.7, t1: 153.7, set: 'L', cam: t => ({ p: V([21, 92, 72], [18, 86, 65], eio((t - 145.7) / 7.3)), l: [15, 4, -1], fov: 40, vo: [0, 120] }) },
  { id: 26, t0: 153.7, t1: 161.3, set: 'L', cam: t => ({ p: V([18, 86, 65], [17, 84, 63], (t - 153.7) / 7.6), l: [15, 4, -1], fov: 40, vo: [0, 120] }) },
  { id: 27, t0: 161.3, t1: 165.0, set: 'L', cam: t => ({ p: V([3.2, 5.6, -6.4], [2.6, 5.0, -5.6], (t - 161.3) / 3.7), l: [0, 0.9, 0], fov: 40, vo: [0, 200] }) },
  { id: 28, t0: 165.0, t1: 170.01, set: 'L', cam: t => ({ p: V([-8.0, 4.8, 24], [-8.6, 5.0, 22.5], (t - 165) / 5), l: [-12.0, 3.4, 4], fov: 40, vo: [0, 120] }) },
];
function shotFor(t) {
  let i = 0; while (i < SHOTS.length - 1 && t >= SHOTS[i + 1].t0) i++;
  const S = SHOTS[i]; let c = S.cam(t);
  if (S.blend && i > 0 && t < S.t0 + S.blend) {
    const P = SHOTS[i - 1], c0 = P.cam(S.t0), u = eio((t - S.t0) / S.blend);
    c = { p: V(c0.p, c.p, u), l: V(c0.l, c.l, u), fov: lerp(c0.fov, c.fov, u), vo: V([...(c0.vo || [0, 0]), 0], [...(c.vo || [0, 0]), 0], u) };
  }
  const base = addV(OFF[S.set], S.base || [0, 0, 0]);
  return { id: S.id, set: S.set, sub: S.sub, base, v: [...addV(base, c.p), ...addV(base, c.l), c.fov], vo: c.vo || [0, 0] };
}
// highlight: circulating meshes glow teal, the rest dims; well control purple in the teaser
function focusAt(t) {
  if (t >= 161.3) return ['wc', 0.85 * sstep(161.3, 162.0, t)];
  return ['circ', 0.8 * sstep(8.6, 9.6, t) * (1 - sstep(153.4, 154.4, t))];
}

// ================================================================ init
async function init(opts) {
  THREE = opts.THREE; renderer = opts.renderer; W = opts.width || 1080; H = opts.height || 1920;
  renderer.localClippingEnabled = true;
  _c.a = new THREE.Color();
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(40, W / H, 0.1, 5000);
  scene.fog = new THREE.Fog(0x000000, 10, 1000);
  scene.background = new THREE.Color();
  O.hemi = new THREE.HemisphereLight(0xffffff, 0x445566, 1.5); scene.add(O.hemi);
  O.dir = new THREE.DirectionalLight(0xffffff, 2.2); scene.add(O.dir); scene.add(O.dir.target);
  O.sets = {}; O.mk = {};
  O.v3 = new THREE.Vector3(); O.v3b = new THREE.Vector3(); O.tan = new THREE.Vector3(); O.q = new THREE.Quaternion(); O.up = new THREE.Vector3(0, 1, 0);
  O.m4 = new THREE.Matrix4(); O.scl = new THREE.Vector3(); O.col = new THREE.Color(); O.hc = new THREE.Color();
  for (const k of Object.keys(OFF)) { const g = new THREE.Group(); g.position.set(...OFF[k]); scene.add(g); O.sets[k] = g; }
  A = createAssets({ THREE, mergeGeometries, stdMat, quality: 0.8 });
  buildLand(O.sets.L);
  SYS.cur = 'hoist'; buildHoistExtras(O.sets.L);
  SYS.cur = 'rotate'; buildRotateRig(O.sets.L); SYS.cur = null;
  buildCircAdds(O.sets.L);
  buildWell(O.sets.W);
  buildStudio(O.sets.S);
  O.flare.visible = false;
  for (const r of [O.racked[5], O.stand, O.stub, O.slips]) r.visible = false;
  // tag the new land assets as circulating so the highlight treats them like the rest of the mud system
  for (const a of [O.cp, O.sm, O.dg, O.dsn, O.dsl, O.cf, O.fp]) a.group.traverse(m => { if (m.isMesh) m.userData.sys = 'circ'; });
  // drops: one per parent space (sizes from the storyboard)
  O.drops = {
    L: A.drop({ radius: 0.22, halo: 0.7 }), W: A.drop({ radius: 0.24, halo: 0.8 }),
    PA: A.drop({ radius: 0.22, halo: 0.6 }), PB: A.drop({ radius: 0.18, halo: 0.5 }), WS: A.drop({ radius: 0.16, halo: 0.45 }),
  };
  O.sets.L.add(O.drops.L.group); O.sets.W.add(O.drops.W.group); O.tri.group.add(O.drops.PA.group); O.pb.group.add(O.drops.PB.group); O.wp.group.add(O.drops.WS.group);
  // in the land set the drop draws over everything (it travels inside pipes): the 2D ring then marks it
  O.drops.L.group.traverse(m => { if (m.material) { m.material.depthTest = false; m.renderOrder = 30; } });
  // a cutting that leaves the drop on the shaker and walks off the screen into the skip
  O.relChip = add(O.sets.L, new THREE.DodecahedronGeometry(0.13, 0).scale(1.25, 0.7, 0.95), lam(0xb45f2a), 0, 0, 0);
  O.relChip.material.depthTest = false; O.relChip.renderOrder = 31;
  // loop line (aerials): teal down leg, x-ray hole, mud-brown returns, teal after the centrifuge
  const lp = LOOPpath(0);
  O.loopLines = [];
  const seg = (s0, s1, col, xr) => {
    const pts = []; for (let s = s0; s < s1; s += 0.35) pts.push(lp.poly.at(s, new THREE.Vector3()).clone()); pts.push(lp.poly.at(s1, new THREE.Vector3()).clone());
    const path = new THREE.CurvePath(); for (let i = 0; i < pts.length - 1; i++) path.add(new THREE.LineCurve3(pts[i], pts[i + 1]));
    const n = Math.max(8, Math.round((s1 - s0) / 0.3));
    const m = new THREE.Mesh(new THREE.TubeGeometry(path, n, 0.16, 6, false), basic(col, { transparent: true, opacity: xr ? 0.55 : 0.95, depthTest: false, depthWrite: false }));
    m.renderOrder = 25; m.userData = { s0, s1, n }; O.sets.L.add(m); O.loopLines.push(m); return m;
  };
  O.lineA = seg(0, lp.sHole, 0x2dd4bf); O.lineX = seg(lp.sHole, lp.sRet, 0x2dd4bf, true);
  O.lineB = seg(lp.sRet, lp.sCent, 0xc8925a); O.lineC = seg(lp.sCent, lp.L, 0x2dd4bf);
  O.comet = add(O.sets.L, new THREE.SphereGeometry(0.42, 16, 10), basic(0xccfbf1, { depthTest: false })); O.comet.renderOrder = 26;
  O.arrowsB = new THREE.InstancedMesh(new THREE.ConeGeometry(0.24, 0.66, 6), basic(0xc8925a), 300);
  O.arrowsB.frustumCulled = false; O.sets.L.add(O.arrowsB);
  O.arrows.material.color.setHex(0x2dd4bf);
  // ---- look upgrade (before the highlight caches materials)
  const DUSK = { top: 0x1f2a63, mid: 0x9a4f86, hor: 0xffab6b, low: 0x7a5a44, glow: 0xffb27a, ground: 0x8a6448, sunDir: new THREE.Vector3(-0.62, 0.05, -0.78) };
  O.skyL.material = skyMaterial(DUSK);
  LOOK = await applyLook({ THREE, renderer, scene, camera, sets: O.sets, light: O.dir, presets: {
    L: { sky: DUSK, exposure: 1.08, envIntensity: 1.0, lightDir: [70, 52, 22], glow: { strength: 0.35, threshold: 0.86 }, rim: { color: 0xffb27a, intensity: 1.2, lift: 0.35 } },
    S: { refl: { top: 0xe6eefc, hor: 0x5a6b8a, ground: 0x1a2840, sun: 0xffffff, sunK: 3, sunDir: [0.4, 0.7, 0.6] }, exposure: 1.0, envIntensity: 1.1, shadowMin: 10, lightDir: [45, 55, 40],
      glow: { strength: 0.4, threshold: 0.8 }, rim: { color: 0x9cc4ff, intensity: 2.2, lift: 0.6, side: 0.5 }, backdrop: { top: 0x0a1222, mid: 0x1c2f52, hor: 0x0d1a2e, low: 0x0d1a2e } },
    W: { refl: { top: 0xdfe8f5, hor: 0x6b7c96, ground: 0x2a2018, sun: 0xffffff, sunK: 2, sunDir: [0.3, 0.8, 0.5] }, exposure: 1.0, envIntensity: 0.9, shadow: false,
      glow: { strength: 0.35, threshold: 0.82 }, rim: { color: 0xbcd4ff, intensity: 0.8, lift: 0.5 } },
  }, opts: (typeof window !== 'undefined' && window.LOOK_OPTS) || {} });
  O.tagged = []; const seen = new Set();
  O.sets.L.traverse(m => {
    if (!m.isMesh || !m.userData.sys || !m.material || seen.has(m.material) || !m.material.color) return;
    if (m.material.transparent && m.userData.sys === 'circ' && !m.material.isMeshStandardMaterial) return;
    seen.add(m.material);
    O.tagged.push({ mat: m.material, sys: m.userData.sys, col: m.material.color.clone(), em: m.material.emissive ? m.material.emissive.clone() : null });
  });
  // drop paths in the studio models
  O.pbSuc = new Poly(O.pb.paths.suction); O.pbDis = new Poly(O.pb.paths.discharge);
  { let s = 0; for (let i = 1; i < O.pbDis.p.length; i++) { if (O.pbDis.p[i].y >= 3.4 - 1e-3) { s = O.pbDis.c[i]; break; } } O.pbDisPort = s; }
  const fl = O.wp.paths.flow; O.wpFlow = new Poly(fl);
  const iW = fl.findIndex((p, i) => i > 2 && Math.abs(p[0]) < 1e-6 && Math.abs(p[1] - 7.6) < 1e-6);
  const iS = fl.findIndex((p, i) => i > 2 && Math.abs(p[0]) < 1e-6 && Math.abs(p[1] - 5.0) < 1e-6);
  O.wpS = { g0: O.wpFlow.c[fl.length - 3 - 49], wTop: O.wpFlow.c[iW], sTop: O.wpFlow.c[iS], L: O.wpFlow.L };
  buildRET(); LOOPpath(-1.5);
  O.avatar = new Image(); O.avatar.src = 'assets/avatar.png';
  try { await O.avatar.decode(); } catch (e) { O.avatar = null; }
  O.lastT = null;
}

// ================================================================ per-frame state
function setI(mesh, i, x, y, z, s, sy = s) {
  const e = mesh.instanceMatrix.array, o = i * 16;
  e[o] = s; e[o + 1] = 0; e[o + 2] = 0; e[o + 3] = 0; e[o + 4] = 0; e[o + 5] = sy; e[o + 6] = 0; e[o + 7] = 0;
  e[o + 8] = 0; e[o + 9] = 0; e[o + 10] = s; e[o + 11] = 0; e[o + 12] = x; e[o + 13] = y; e[o + 14] = z; e[o + 15] = 1;
}
function done(mesh, n) { mesh.count = n; mesh.instanceMatrix.needsUpdate = true; if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true; }
function env(set) {
  const o = OFF[set];
  if (set === 'L') {
    scene.background.setHex(0x9a4f86); scene.fog.color.setHex(0xe8a27a); scene.fog.near = 160; scene.fog.far = 1600;
    O.hemi.color.setHex(0xffe6cf); O.hemi.groundColor.setHex(0x8a6448); O.hemi.intensity = 1.75;
    O.dir.color.setHex(0xffc58f); O.dir.intensity = 2.5; O.dir.position.set(60, 55, 75); O.dir.target.position.set(0, 0, 0);
  } else if (set === 'W') {
    scene.background.setHex(0x0f2236); scene.fog.color.setHex(0x0f2236); scene.fog.near = 300; scene.fog.far = 1200;
    O.hemi.color.setHex(0xffffff); O.hemi.groundColor.setHex(0x7a8796); O.hemi.intensity = 1.9;
    O.dir.color.setHex(0xffffff); O.dir.intensity = 1.8; O.dir.position.set(o[0] + 40, 70, o[2] + 90); O.dir.target.position.set(o[0], -10, o[2]);
  } else {
    scene.background.setHex(0x0d1a2e); scene.fog.color.setHex(0x0d1a2e); scene.fog.near = 80; scene.fog.far = 260;
    O.hemi.color.setHex(0xffffff); O.hemi.groundColor.setHex(0x3a4a66); O.hemi.intensity = 1.8;
    O.dir.color.setHex(0xffffff); O.dir.intensity = 2.1; O.dir.position.set(o[0] + 30, 50, o[2] + 60); O.dir.target.position.set(o[0] + 30, 0, o[2]);
  }
}
function applyHighlight(t, on) {
  const [sys, a0] = focusAt(t), a = on ? a0 : 0;
  for (const e of O.tagged) {
    const hit = sys && e.sys === sys;
    e.mat.color.copy(e.col).multiplyScalar(hit || !sys ? 1 : 1 - 0.65 * a);
    if (e.em) { e.mat.emissive.copy(e.em); if (hit) e.mat.emissive.add(O.hc.setHex(SYSCOL[sys]).multiplyScalar(0.26 * a)); }
  }
}
function arrowsAlong(mesh, n0, path, s0, s1, phase, sp, scale, maxN) {
  let n = n0;
  if (s1 <= s0) return n;
  const N = Math.floor(path.L / sp);
  for (let j = 0; j < N && n < maxN; j++) {
    const s = fract(j / N + phase / path.L) * path.L;
    if (s < s0 || s > s1) continue;
    path.at(s, O.v3, O.tan);
    O.q.setFromUnitVectors(O.up, O.tan); O.scl.setScalar(scale); O.m4.compose(O.v3, O.q, O.scl);
    mesh.setMatrixAt(n++, O.m4);
  }
  return n;
}
const ROTD = t => t * 1.6;
function stateRig(t) {
  const dy = tdDy(t), yb = 20.6 + dy;
  O.topDrive.position.y = yb;
  const yB = yb + 4.6, top = yB + 0.9;
  O.tblock.position.set(0, yB, 0);
  for (const l of O.blines) { l.position.y = top; l.scale.y = Math.max(0.01, 41.2 - top); }
  O.dp.visible = true; O.dp.scale.y = Math.max(0.01, yb - 1.15 - 7.4); O.dp.rotation.y = ROTD(t); O.quill.rotation.y = ROTD(t);
  O.ir.position.x = 4.0;
  if (O.hoseDy !== dy) { // kelly hose re-mesh: it follows the top drive (pure function of dy)
    if (O.hoseMesh) { O.hoseMesh.geometry.dispose(); O.hoseMesh.geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(hosePtsDy(dy).map(p => new THREE.Vector3(...p))), 40, 0.16, 6); }
    O.hoseDy = dy;
  }
}
function stateLand(t, s) {
  O.skyL.position.set(camera.position.x, 0, camera.position.z);
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
  const th = t * 2 * Math.PI * 100 / 60;
  O.rods.forEach((r, k) => { r.position.x = 0.34 * Math.sin(th + k * 2.094); });
  O.wheel.rotation.z = -th;
  O.basket.position.set(12.25 + 0.018 * Math.sin(t * 47), 4.55 + 0.022 * Math.sin(t * 53 + 1), -2.65 + 0.018 * Math.cos(t * 41));
  O.genGroups.forEach((g, i) => { g.position.y = 0.012 * Math.sin(t * 61 + i * 2); });
  let n = 0;
  O.stacks.forEach((p, i) => { for (let j = 0; j < 14; j++) { const age = fract(t / 2.6 + j / 14 + i * 0.13) * 2.6; setI(O.smoke, n++, p[0] + 0.7 * age + 0.15 * Math.sin(j * 3.1 + t), p[1] + 1.4 * age, p[2] + 0.35 * age, 0.16 + 0.3 * age); } });
  done(O.smoke, n); done(O.pulses, 0);
  // shaker: cuttings walk off the discharge end into the skip, mud drips through the screen
  const ca = Math.cos(0.187), sa = Math.sin(0.187), bp = O.basket.position;
  n = 0;
  for (let i = 0; i < 46; i++) {
    const u = fract(hash(i, 71) + t * 0.16), x = (hash(i, 72) - 0.5) * 2.3;
    if (u < 0.82) { const z = -1.8 + 3.7 * (u / 0.82), y = 0.09; setI(O.shCut, n++, bp.x + x, bp.y + y * ca - z * sa, bp.z + y * sa + z * ca, 0.07 + hash(i, 73) * 0.06); }
    else { const f = (u - 0.82) / 0.18; setI(O.shCut, n++, bp.x + x * 0.8, lerp(bp.y - 1.9 * sa + 0.09, 1.15, f * f), lerp(bp.z + 1.9 * ca, 0.9, f), 0.07 + hash(i, 73) * 0.06); }
  }
  done(O.shCut, n);
  n = 0;
  for (let i = 0; i < 40; i++) { const u = fract(hash(i, 81) + t * 1.4), x = (hash(i, 82) - 0.5) * 2.4, z = -1.6 + hash(i, 83) * 2.6; setI(O.shDrip, n++, bp.x + x, lerp(bp.y - 0.2 - z * sa, MUDY, u), bp.z + z * ca, 0.05); }
  done(O.shDrip, n);
  O.arrowsG.count = 0;
  stateRig(t);
  // new assets
  O.cp.update(t, { omega: 14, open: sstep(19.2, 19.8, t) * (1 - sstep(53.0, 53.1, t)) });
  O.sm.update(t, { spp: 0.62 * (t < 54.6 ? 0 : sstep(54.6, 56.0, t)), wheelA: sstep(54.4, 54.9, t) });
  O.dg.update(t, { open: sstep(114.4, 115.0, t) * (1 - sstep(121.8, 121.9, t)) });
  O.dsn.update(t, { open: sstep(121.9, 122.4, t) * (1 - sstep(129.8, 129.9, t)) });
  O.dsl.update(t, { open: sstep(125.7, 126.2, t) * (1 - sstep(129.8, 129.9, t)) });
  O.cf.update(t, { open: sstep(130.2, 130.8, t) * (1 - sstep(137.8, 137.9, t)) });
  O.fp.update(t, { flow: t < 101 ? 1 : lerp(1, 1.55, sstep(102.0, 105.0, t)) });
  O.tripFloat.position.y = 2.4 + 0.05 * Math.sin(t * 1.3);
  // released cutting (shaker beat)
  if (t > 110.2 && t < 112.8) {
    const u = (t - 110.2) / 1.6, z = lerp(-0.1, 1.9, clamp(u)), y = 0.12;
    if (u < 1) O.relChip.position.set(bp.x + 0.05, bp.y + y * ca - z * sa, bp.z + y * sa + z * ca);
    else { const f = clamp((t - 111.8) / 0.8); O.relChip.position.set(bp.x + 0.1, lerp(bp.y - 1.9 * sa + 0.12, 1.2, f * f), lerp(bp.z + 1.9 * ca, 0.9, f)); }
    O.relChip.rotation.set(t * 3, t * 2, 0); O.relChip.visible = true;
  } else O.relChip.visible = false;
  // loop line: drawn by a comet in the aerial (8.6-14.6), full in the recap; hidden in close shots
  const aerial = s.id === 2 || s.id === 25 || s.id === 26;
  const lp = LOOPpath(tdDy(t));
  const drawS = s.id === 2 ? lp.L * eio((t - 8.6) / 6.0) : lp.L;
  const glowK = s.id === 26 ? lerp(1, 0.45, sstep(154.0, 156.0, t)) : 1;
  for (const m of O.loopLines) {
    const { s0, s1, n: segN } = m.userData;
    m.visible = aerial && drawS > s0;
    const k = clamp((drawS - s0) / (s1 - s0));
    m.geometry.setDrawRange(0, Math.floor(k * segN) * 6 * 6);
    m.material.opacity = (m === O.lineX ? 0.55 : 0.95) * glowK;
  }
  if (s.id >= 25) O.lineB.material.color.setHex(0xc8925a).lerp(O.hc.setHex(0x2dd4bf), sstep(150.0, 150.8, t));
  else O.lineB.material.color.setHex(0xc8925a);
  O.comet.visible = s.id === 2 && t > 8.6 && t < 14.7;
  if (O.comet.visible) O.comet.position.set(...pAt(lp, drawS));
  // flow arrows on what the drop has already passed (teal down leg, mud-brown returns, teal after the centrifuge)
  const close = !aerial && s.id !== 27 && s.id !== 28 && s.id !== 1;
  let na = 0, nb = 0;
  if (close) {
    const dn = DN(tdDy(t)), sp = 1.3, sc = 0.75;
    const revDN = t < 16.6 ? 0 : t < 22.6 ? keyS([[16.6, 0, 'l'], [19.8, 'eye', 'l'], [20.8, 'out', 'l'], [22.4, 'tsuc', 'l']], t, dn.s)
      : t < 53.5 ? dn.s.tsuc + (t > 42 ? dn.s.dis3 - dn.s.tsuc : 0) : t < 69.5 ? Math.max(dn.s.dis3, keyS([[53.5, ['riser', -2.2], 'l'], [54.4, 'manIn', 'l'], [54.6, 'manIn', 'l'], [55.6, 'manOut', 'l'], [56.2, 'spBase', 'l'], [57.4, ['spBase', 0.9], 's'], [61.0, 'spTop', 'l'], [62.0, 'h2', 's'], [66.4, 'goose', 'l'], [70, 'goose', 'l']], t, dn.s)) : dn.L;
    na = arrowsAlong(O.arrows, 0, dn.poly, 0, Math.min(revDN, dn.s.floor), 3.2 * t, sp, sc, 420);
    if (t > 90.7) {
      const R = O.RET, rs = t < 98.7 ? keyS([[90.7, 'bop', 'l'], [90.9, 'bop', 'o'], [92.0, 'bell', 'l'], [92.3, 'fl0', 'l'], [97.6, 'fl1', 'l'], [97.8, 'belly', 'l'], [99, 'belly', 'l']], t, R.s)
        : t < 106.8 ? R.s.belly : t < 137.7 ? keyS([[106.8, 'belly', 'l'], [112.5, 'tankA', 'l'], [113.9, 'tankA', 'l'], [119.2, 'dgOut', 'l'], [120.6, 'dgTankOut', 'l'], [125.4, 'dsOut', 'l'], [129.4, 'dlOut', 'l'], [131.0, 'cfBowl', 'l'], [135.6, 'cfLiq', 'l'], [136.4, 'splash', 'l'], [138, 'splash', 'l']], t, R.s) : R.L;
      nb = arrowsAlong(O.arrowsB, 0, R.poly, R.s.bell, Math.min(rs, R.s.cfLiq), 2.0 * t, sp, sc, 300);
      na = arrowsAlong(O.arrows, na, R.poly, R.s.cfLiq, rs, 2.0 * t, sp, sc, 420);
    }
  }
  O.arrows.count = na; O.arrows.instanceMatrix.needsUpdate = true;
  O.arrowsB.count = nb; O.arrowsB.instanceMatrix.needsUpdate = true;
  // the riser is ghosted while the drop rises inside it (shot 16)
}
function stateStudio(t, s) {
  for (const k in O.sGroups) O.sGroups[k].visible = k === s.sub;
  if (s.sub === 'PUMP_A') O.tri.update(t, { spm: 100, flash: 1 });
  if (s.sub === 'PUMP_B') {
    const w = 2 * Math.PI * 100 / 60;
    let th;
    if (t < 29.9) th = 0;
    else if (t < 31.4) th = 2 * Math.PI * (t - 29.9) / 1.5;
    else if (t < 45.5) th = 2 * Math.PI + w * (t - 31.4);
    else th = 0.5 * w * (t - 45.5) + Math.PI;
    const bore = t < 30.2 ? 0.5 : t < 33.2 ? lerp(0.5, 0.583, sstep(30.2, 30.8, t)) : t < 37.5 ? lerp(0.583, 0.375, sstep(33.2, 33.8, t)) : t < 45.5 ? 0.5 : 0.5;
    O.pb.update(t, { theta: th, bore, popoff: t > 43.0 && t < 44.6 ? sstep(43.0, 43.3, t) * (1 - sstep(44.1, 44.4, t)) : 0, damp: 1, glow: 0 });
  }
  if (s.sub === 'WASH') O.wp.update(t, { omega: 1.6, glow: t > 72.4 && t < 76.9 ? sstep(72.4, 72.8, t) : 0, wear: t > 75.0 ? 0.5 - 0.5 * Math.cos(clamp((t - 75.0) / 1.6) * 4 * Math.PI) : 0, ghost: 0.12 });
}
function placeCamV(v, vo) {
  camera.position.set(v[0], v[1], v[2]); camera.lookAt(v[3], v[4], v[5]);
  camera.fov = v[6];
  if (vo && (vo[0] || vo[1])) camera.setViewOffset(W, H, -vo[0], -vo[1], W, H); else camera.clearViewOffset();
  camera.updateProjectionMatrix(); camera.updateMatrixWorld();
}
function applyState(t) {
  if (O.lastT === t) return;
  O.lastT = t;
  const s = O.shot = shotFor(t);
  for (const k in O.sets) O.sets[k].visible = k === s.set;
  placeCamV(s.v, s.vo);
  if (s.set === 'L') stateLand(t, s);
  else if (s.set === 'W') stateWell(t);
  else stateStudio(t, s);
  applyHighlight(t, s.set === 'L');
  // the drop
  const D = O.drop = dropAt(t);
  for (const k in O.drops) {
    const dd = O.drops[k], vis = D.vis && D.par === k;
    if (!vis) { dd.update(t, { visible: false }); continue; }
    const path = tt => { if (tt === t) return D.p; const q = dropAt(tt); return q.vis && q.par === D.par ? q.p : D.p; };
    dd.update(t, { path, dirt: D.dirt, shimmer: D.shimmer, squash: D.squash, opacity: D.op, chip: D.chip, bubbles: D.bubbles,
      splashPos: D.splashPos, splashAge: D.splashAge, stretch: 0.6 });
  }
  scene.updateMatrixWorld();
}
function renderFrame(t) {
  applyState(t);
  env(O.shot.set);
  const v = O.shot.v;
  LOOK.frame(O.shot.set, camera, O.v3b.set(v[3], v[4], v[5]));
  LOOK.render(scene, camera);
}

// ================================================================ overlay (2D) — "Field Manual" kit (overlay_kit.js)
const CIRC = KIT.SYS.circ, MUDC = '#c8925a', AMBER = '#f59e0b', WC = KIT.SYS.wc, KC = KIT.C;
const CARD_TOP = 360;
const clean = s => String(s).replace(/ · /g, ', ');
function proj(p) {
  const v = O.v3b.set(p[0], p[1], p[2]).project(camera);
  return { x: (v.x + 1) / 2 * W, y: (1 - v.y) / 2 * H, ok: v.z < 1 && v.z > -1 };
}
const wOf = o => { o.getWorldPosition(O.v3b); return [O.v3b.x, O.v3b.y, O.v3b.z]; };
const inSet = (set, p) => addV(OFF[set], p);
const inSlot = (k, p) => addV(addV(OFF.S, SLOT[k]), p);
// a numbered schematic label attached to a 3D point (kit callout: anchor dot, cased leader, paper tab)
function co(ctx, t, t0, t1, P, x, y, label, sub = '', o = {}) {
  if (t < t0 || t > t1 || !P) return;
  const s = proj(P); if (!s.ok) return;
  KIT.callout(ctx, t, { t0, t1, ax: s.x, ay: s.y, x, y, label, sub, color: o.color || CIRC, align: o.align || 'left', n: o.n ?? null, size: o.size || 32 });
}
// a static label tab (no anchor), one entrance
function tag(ctx, t, t0, t1, x, y, label, sub, color, align = 'left') {
  const e = KIT.env(t, t0, t1, 0.35, 0.3); if (!e.live || e.a <= 0) return;
  ctx.save(); ctx.globalAlpha = e.a; ctx.translate(0, (1 - e.i) * 16);
  KIT.labelPill(ctx, x, y, label, sub, color, { size: 32, align, u: KIT.eout((t - t0) / 0.35) });
  ctx.restore();
}
function cased(ctx, fn, lw = 3, casing = 8) {
  ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.strokeStyle = KIT.hexA(KC.paper, 0.95); ctx.lineWidth = casing; fn(); ctx.stroke();
  ctx.strokeStyle = KC.ink; ctx.lineWidth = lw; fn(); ctx.stroke();
  ctx.restore();
}

// ---- fact card with an optional figure (right column or a band below the lines). One sheet = one panel.
function figCard(ctx, t, o) {
  const { t0, t1, title, color = CIRC, top = CARD_TOP, lineAt = null, fig = null, figH = 0, figW = 0, figAt = null } = o;
  const lines = (o.lines || []).map(clean);
  const e = KIT.env(t, t0, t1, 0.45, 0.3); if (!e.live || e.a <= 0) return;
  const x = 60, w = 900, pad = 40, lh = 58, n = lines.length, headH = 66;
  const colW = w - pad * 2 - (figW ? figW + 36 : 0);
  const textH = 8 + pad + headH + (n ? 22 + n * lh : 0);
  const h = textH + (figH ? figH + 12 : 0) + pad - 8;
  ctx.save(); ctx.globalAlpha = e.a; ctx.translate(0, (1 - e.i) * 24 + e.o * 12);
  KIT.sheet(ctx, x, top, w, h, { band: color });
  const hy = top + 8 + pad;
  KIT.text(ctx, title, x + pad, hy + 30, { w: 600, size: 46, color: KC.ink, maxW: colW });
  if (n) { ctx.fillStyle = KC.rule; ctx.fillRect(x + pad, hy + headH + 5, colW, 2); }
  for (let i = 0; i < n; i++) {
    const lt = lineAt ? lineAt[i] : t0 + 0.5 + i * 0.8, u = KIT.eout((t - lt) / 0.35); if (u <= 0) continue;
    const ly = hy + headH + 22 + i * lh + lh / 2;
    ctx.save(); ctx.globalAlpha *= u;
    ctx.fillStyle = KC.ink; ctx.fillRect(x + pad, ly - 1.5, 16, 3);
    if (o.dots && o.dots[i]) { ctx.fillStyle = o.dots[i]; ctx.beginPath(); ctx.arc(x + pad + 8, ly, 9, 0, 7); ctx.fill(); }
    KIT.text(ctx, lines[i], x + pad + 32 + (1 - u) * 8, ly + 1, { w: 400, size: 34, color: KC.ink, maxW: colW - 32 });
    ctx.restore();
  }
  if (fig) {
    const fk = KIT.eout((t - (figAt ?? t0 + 0.5)) / 0.45);
    if (fk > 0) {
      const r = figW ? { x: x + w - pad - figW, y: top + 8 + pad, w: figW, h: textH - 8 - pad } : { x: x + pad, y: top + textH + 6, w: w - pad * 2, h: figH };
      if (!figW) { ctx.save(); ctx.globalAlpha *= fk; ctx.fillStyle = KC.rule; ctx.fillRect(r.x, r.y - 4, r.w, 2); ctx.restore(); }
      ctx.save(); ctx.globalAlpha *= fk; fig(ctx, r, t, fk); ctx.restore();
    }
  }
  ctx.restore();
}

// ---- figures drawn inside cards
function seesaw(ctx, r, t) {
  const cx = r.x + r.w / 2, cy = r.y + 92, L = 600;
  const k = sstep(33.2, 33.8, t), ang = lerp(-11, 11, k) * Math.PI / 180;
  ctx.fillStyle = KC.ink; ctx.beginPath(); ctx.moveTo(cx, cy + 4); ctx.lineTo(cx - 34, cy + 64); ctx.lineTo(cx + 34, cy + 64); ctx.closePath(); ctx.fill();
  ctx.fillStyle = KC.rule; ctx.fillRect(cx - 120, cy + 64, 240, 3);
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(ang);
  ctx.fillStyle = KC.ink; ctx.fillRect(-L / 2, -4, L, 8);
  const blk = (bx, col, a, b) => {
    ctx.fillStyle = col; KIT.rr(ctx, bx, -76, 170, 68, 4); ctx.fill();
    KIT.text(ctx, a, bx + 16, -52, { w: 600, size: 30, color: KC.ink, maxW: 150 });
    KIT.text(ctx, b, bx + 16, -24, { w: 400, size: 26, color: KC.ink, maxW: 150 });
  };
  blk(-L / 2, KIT.light(CIRC, 0.35), 'Flow', 'gpm');
  blk(L / 2 - 170, KIT.light(AMBER, 0.35), 'Pressure', 'psi');
  // the liner chip slides to the heavy side
  const lab = t < 33.5 ? '7 in' : '4½ in', cxp = lerp(-0.12 * L, 0.12 * L, k);
  ctx.fillStyle = KC.ink; KIT.rr(ctx, cxp - 58, -54, 116, 46, 4); ctx.fill();
  KIT.text(ctx, lab, cxp, -30, { w: 600, size: 30, color: KC.paper, align: 'center', maxW: 104 });
  ctx.restore();
  KIT.text(ctx, t < 33.5 ? 'Liner ใหญ่: ไหลมาก แรงดันต่ำ' : 'Liner เล็ก: แรงดันสูง ไหลน้อย', r.x, r.y + r.h - 12, { w: 400, size: 28, color: KC.ink2, maxW: r.w });
}
function trace(ctx, r, t) {
  const x0 = r.x + 8, x1 = r.x + r.w, yTop = r.y + 30, yBot = r.y + r.h - 18, mid = lerp(yTop, yBot, 0.58), amp = (yBot - yTop) * 0.26;
  ctx.fillStyle = KC.ink; ctx.fillRect(x0, yTop - 10, 2, yBot - yTop + 10); ctx.fillRect(x0, yBot, x1 - x0, 2);
  KIT.text(ctx, 'แรงดันขาออกปั๊ม', x0 + 14, yTop - 4, { w: 400, size: 26, color: KC.ink2 });
  const lim = yTop + 8;
  if (t > 42.6) { ctx.save(); ctx.globalAlpha *= KIT.eout((t - 42.6) / 0.3); ctx.fillStyle = '#dc2626'; ctx.fillRect(x0 + 300, lim - 1, x1 - x0 - 300, 2); KIT.text(ctx, 'ตั้ง Pop-off', x1, lim - 20, { w: 600, size: 26, color: '#b91c1c', align: 'right' }); ctx.restore(); }
  const rip = tau => 1 - Math.abs(Math.sin(Math.PI * 5 * tau));
  const val = (tau, smooth) => {
    const a = smooth ? 1 - 0.88 * sstep(39.4, 40.6, tau) : 1;
    const sp = sstep(43.0, 43.5, tau) * (1 - sstep(44.0, 44.4, tau));
    return lerp(mid - amp * rip(tau) * a, lim + 6, sp * (smooth ? 1 : 0));
  };
  const span = 3.0, N = 240;
  const line = (smooth, col, lw) => {
    ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.lineJoin = 'round'; ctx.beginPath();
    for (let i = 0; i <= N; i++) { const tau = t - span + span * i / N, px = lerp(x0 + 6, x1, i / N), py = val(tau, smooth); i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
    ctx.stroke();
  };
  line(false, KIT.hexA(KC.ink, 0.22), 2);
  line(true, t > 42.9 && t < 44.6 ? AMBER : '#0f766e', 4);
  KIT.text(ctx, t < 40.0 ? 'ไม่มี Dampener: กระชากทุก Stroke' : 'มี Dampener: เรียบขึ้น', x0 + 14, yBot - 22, { w: 600, size: 26, color: KC.ink });
}
function splitBar(ctx, r, t) {
  const bx = r.x + 92, bw = r.w - 92, by = r.y + 22, bh = 36, k = KIT.eio((t - 78.9) / 0.7);
  KIT.text(ctx, 'SPP', r.x, by + bh / 2, { w: 600, size: 32, color: KC.ink });
  ctx.save(); ctx.beginPath(); ctx.rect(bx, by - 2, bw * k, bh + 4); ctx.clip();
  const X = f => bx + bw * f;
  ctx.fillStyle = CIRC; ctx.fillRect(X(0), by, X(0.5) - X(0), bh);
  ctx.fillStyle = KIT.light(CIRC, 0.55); ctx.fillRect(X(0.5), by, X(0.667) - X(0.5), bh);
  ctx.save(); ctx.beginPath(); ctx.rect(X(0.5), by, X(0.667) - X(0.5), bh); ctx.clip(); ctx.strokeStyle = KIT.hexA(KC.ink, 0.35); ctx.lineWidth = 2;
  for (let xx = X(0.5) - bh; xx < X(0.667); xx += 10) { ctx.beginPath(); ctx.moveTo(xx, by + bh); ctx.lineTo(xx + bh, by); ctx.stroke(); } ctx.restore();
  ctx.fillStyle = '#b8bec8'; ctx.fillRect(X(0.667), by, X(0.94) - X(0.667), bh);
  ctx.fillStyle = '#0f766e'; ctx.fillRect(X(0.94), by, X(1) - X(0.94), bh);
  ctx.strokeStyle = KC.ink; ctx.lineWidth = 2; ctx.strokeRect(bx + 1, by, bw - 2, bh);
  ctx.restore();
  if (k > 0.6) {
    KIT.text(ctx, 'Bit ~½–⅔', bx, by + bh + 34, { w: 600, size: 30, color: KC.ink });
    KIT.text(ctx, 'Drill string', X(0.667) + 6, by + bh + 34, { w: 400, size: 26, color: KC.ink2 });
    ctx.fillStyle = KC.ink; ctx.fillRect(X(0.97) - 1, by + bh, 2, 62);
    KIT.text(ctx, 'Annulus (เล็กสุด)', X(0.97) - 12, by + bh + 76, { w: 400, size: 26, color: KC.ink2, align: 'right' });
  }
}
function annulusInset(ctx, r, t) {
  const cx = r.x + r.w / 2, cy = r.y + r.h / 2 - 20, R = Math.min(104, r.h / 2 - 30);
  ctx.fillStyle = KC.paper2; ctx.beginPath(); ctx.arc(cx, cy, R, 0, 7); ctx.fill();
  for (let i = 0; i < 30; i++) {
    const a = hash(i, 91) * 6.283, rr2 = lerp(R * 0.5, R * 0.9, hash(i, 92)), ph = fract(hash(i, 93) + t * 0.7);
    ctx.save(); ctx.globalAlpha *= Math.sin(ph * Math.PI); ctx.fillStyle = KC.mud; ctx.strokeStyle = KC.ink; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.arc(cx + Math.cos(a) * rr2, cy + Math.sin(a) * rr2, 3 + 4 * hash(i, 94), 0, 7); ctx.fill(); ctx.stroke(); ctx.restore();
  }
  ctx.strokeStyle = '#7a4a22'; ctx.lineWidth = 12; ctx.beginPath(); ctx.arc(cx, cy, R, 0, 7); ctx.stroke();
  ctx.fillStyle = '#9ca3af'; ctx.beginPath(); ctx.arc(cx, cy, R * 0.42, 0, 7); ctx.fill();
  ctx.strokeStyle = KC.ink; ctx.lineWidth = 2.5; ctx.stroke();
  ctx.fillStyle = CIRC; ctx.beginPath(); ctx.arc(cx, cy, R * 0.26, 0, 7); ctx.fill();
  KIT.text(ctx, 'ภาพตัดขวาง', cx, cy + R + 30, { w: 600, size: 28, color: KC.ink, align: 'center', maxW: r.w });
}
function dial(ctx, cx, cy, R, v, col, readout, label, sub) {
  const A0 = Math.PI * 5 / 6, A1 = Math.PI * 13 / 6, ang = u => lerp(A0, A1, clamp(u));
  ctx.lineCap = 'butt';
  ctx.strokeStyle = KC.paper2; ctx.lineWidth = 12; ctx.beginPath(); ctx.arc(cx, cy, R - 6, A0, A1); ctx.stroke();
  ctx.strokeStyle = col; ctx.beginPath(); ctx.arc(cx, cy, R - 6, A0, ang(v)); ctx.stroke();
  for (let i = 0; i <= 16; i++) { const q = lerp(A0, A1, i / 16), mj = i % 4 === 0; ctx.strokeStyle = KC.ink; ctx.lineWidth = mj ? 2.5 : 1.5; ctx.beginPath(); ctx.moveTo(cx + Math.cos(q) * (R - 16), cy + Math.sin(q) * (R - 16)); ctx.lineTo(cx + Math.cos(q) * (R - (mj ? 32 : 24)), cy + Math.sin(q) * (R - (mj ? 32 : 24))); ctx.stroke(); }
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(ang(v)); ctx.fillStyle = KC.ink; ctx.beginPath(); ctx.moveTo(-R * 0.14, -3); ctx.lineTo(R - 26, -1); ctx.lineTo(R - 26, 1); ctx.lineTo(-R * 0.14, 3); ctx.closePath(); ctx.fill(); ctx.beginPath(); ctx.arc(0, 0, 7, 0, 7); ctx.fill(); ctx.restore();
  KIT.text(ctx, readout, cx, cy + R * 0.55, { w: 600, size: 30, color: KC.ink, align: 'center', maxW: R * 1.2 });
  KIT.text(ctx, label, cx - R, cy + R * 0.55 + 56, { w: 600, size: 30, color: KC.ink, maxW: 2 * R + 60 });
  KIT.text(ctx, sub, cx - R, cy + R * 0.55 + 90, { w: 400, size: 26, color: KC.ink2, maxW: 2 * R + 80 });
}
function flowGauges(ctx, r, t) {
  const R = 82, cy = r.y + R + 10;
  dial(ctx, r.x + 150, cy, R, 0.5, CIRC, '100 SPM', 'Flow In', 'คิดจาก Pump Stroke');
  const rise = sstep(102.0, 105.0, t);
  dial(ctx, r.x + r.w - 250, cy, R, lerp(0.5, 0.76, rise), rise > 0.05 ? AMBER : CIRC, '%', 'Flow Out', 'จาก Flow Paddle');
  if (rise > 0.05) { ctx.save(); ctx.globalAlpha *= clamp(rise * 3); KIT.icon(ctx, 'arrowR', r.x + r.w - 250 + R + 40, cy - R * 0.2, 30, KC.ink, 2.6); ctx.restore(); }
}

// ---- solids control: one sheet = particle-size ladder (coarse -> fine) + the current stage's notes
const SOL = [
  { name: 'Shale Shaker', size: '> ~75 µm, API 200', at: 107.4, a0: 107.4, a1: 114.2, w: 196, dot: 8.5 },
  { gas: true, name: 'Degasser', size: 'แยกแก๊ส', at: 114.6, a0: 114.2, a1: 121.7, w: 120 },
  { name: 'Desander', size: 'D50 ~40–50 µm', at: 122.2, a0: 121.7, a1: 125.6, w: 176, dot: 5.5 },
  { name: 'Desilter', size: 'D50 ~15–20 µm', at: 125.6, a0: 125.6, a1: 129.9, w: 170, dot: 3.5 },
  { name: 'Centrifuge', size: '~2–7 µm', at: 130.2, a0: 129.9, a1: 137.5, w: 158, dot: 2 },
];
const SOLCARD = [
  { t0: 108.4, t1: 113.6, n: 1, title: 'Shale Shaker', lines: ['ตะแกรงสั่น Linear Motion ~4–7 G', 'API 200 ≈ 69–82.5 µm', 'เลข API ไม่ใช่ Mesh'] },
  { t0: 114.4, t1: 121.4, n: null, title: 'Vacuum Degasser', lines: ['ดูดแก๊สที่ปนในโคลนออก', 'อยู่ก่อนเครื่องที่ใช้ปั๊มหอยโข่ง', '≠ Mud Gas Separator (Part 5)'], dot: 2 },
  { t0: 122.6, t1: 129.4, n: 2, title: 'Hydrocyclones', lines: ['Desander: กรวย 10 in · ~500 gpm', 'Desilter: กรวย 4 in · ~60 gpm', 'Desander ต้องมาก่อน Desilter'], lineAt: [123.1, 125.9, 126.8] },
  { t0: 131.0, t1: 137.4, n: 4, title: 'Centrifuge', lines: ['ถังหมุนแนวนอน + Screw Conveyor', 'Mud หนัก: เก็บ Barite (~650 G)', 'Mud เบา: ทิ้งของแข็งละเอียด'] },
];
function solidsSheet(ctx, t) {
  const e = KIT.env(t, 107.0, 137.4, 0.45, 0.3); if (!e.live || e.a <= 0) return;
  const x = 60, y = 236, w = 900, pad = 44;
  const y1 = y + 8 + 112, y2 = y1 + 178, h = (y2 + 236) - y;
  ctx.save(); ctx.globalAlpha = e.a; ctx.translate(0, (1 - e.i) * 24 + e.o * 12);
  KIT.sheet(ctx, x, y, w, h, { band: CIRC });
  KIT.text(ctx, 'Solids Control', x + pad, y + 8 + 50, { w: 600, size: 44, color: KC.ink, maxW: 500 });
  KIT.text(ctx, 'หยาบ → ละเอียด', x + w - pad, y + 8 + 52, { w: 400, size: 30, color: KC.ink2, align: 'right' });
  ctx.fillStyle = KC.ink; ctx.fillRect(x + pad, y + 8 + 92, w - pad * 2, 2);
  // the ladder: one column per machine, left to right in process order
  let cx = x + 40; let si = 0;
  SOL.forEach((c, i) => {
    const on = t >= c.a0 && t < c.a1, lit = KIT.eout((t - c.at) / 0.4), mx = cx + c.w / 2;
    if (on && lit > 0) { ctx.save(); ctx.globalAlpha *= lit; ctx.fillStyle = KC.paper2; ctx.fillRect(cx + 4, y1 - 8, c.w - 8, 160); ctx.fillStyle = CIRC; ctx.fillRect(cx + 4, y1 + 146, c.w - 8, 6); ctx.restore(); }
    const ink = lit > 0 ? KC.ink : KC.rule, txt = lit > 0 ? KC.ink : KC.mute;
    if (c.gas) {
      ctx.save(); ctx.strokeStyle = ink; ctx.lineWidth = 2.2;
      for (const [dx, dy, rr2] of [[-22, 30, 8], [4, 18, 11], [24, 34, 6]]) { ctx.beginPath(); ctx.arc(mx + dx, y1 + dy, rr2, 0, 7); ctx.stroke(); }
      ctx.restore();
      KIT.text(ctx, c.name, cx + 12, y1 + 84, { w: 600, size: 26, color: txt, maxW: c.w - 20 });
      KIT.text(ctx, c.size, cx + 12, y1 + 118, { w: 400, size: 26, color: lit > 0 ? KC.ink2 : KC.mute, maxW: c.w - 20 });
    } else {
      const tw = lerp(150, 62, si / 3), bw = tw * 0.62, th = 44, top = y1 + 4;
      const path = () => { ctx.beginPath(); ctx.moveTo(mx - tw / 2, top); ctx.lineTo(mx + tw / 2, top); ctx.lineTo(mx + bw / 2, top + th); ctx.lineTo(mx - bw / 2, top + th); ctx.closePath(); };
      path(); ctx.fillStyle = on && lit > 0 ? KIT.hexA(CIRC, 0.45) : KC.paper; ctx.fill();
      ctx.save(); path(); ctx.clip(); ctx.strokeStyle = KIT.hexA(KC.ink, lit > 0 ? 0.3 : 0.12); ctx.lineWidth = 1.2;
      const sp = Math.max(5, 20 - si * 5);
      for (let gx = mx - tw / 2 - th; gx < mx + tw / 2 + th; gx += sp) { ctx.beginPath(); ctx.moveTo(gx, top); ctx.lineTo(gx + th * 0.5, top + th); ctx.stroke(); ctx.beginPath(); ctx.moveTo(gx + th * 0.5, top); ctx.lineTo(gx, top + th); ctx.stroke(); }
      ctx.restore();
      path(); ctx.strokeStyle = ink; ctx.lineWidth = 2.5; ctx.stroke();
      if (lit > 0) { // the particle size this stage catches, drawn to relative scale
        ctx.save(); ctx.globalAlpha *= lit;
        for (let j = 0; j < 3; j++) { ctx.fillStyle = KC.mud; ctx.strokeStyle = KC.ink; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(mx + (j - 1) * (c.dot * 2.6 + 4), top - c.dot - 3, c.dot, 0, 7); ctx.fill(); ctx.stroke(); }
        ctx.restore();
      }
      KIT.numKey(ctx, si + 1, cx + 24, y1 + 84, 32, CIRC, { filled: on && lit > 0 });
      KIT.text(ctx, c.name, cx + 48, y1 + 84, { w: 600, size: 28, color: txt, maxW: c.w - 54 });
      KIT.text(ctx, c.size, cx + 10, y1 + 120, { w: 400, size: 26, color: lit > 0 ? KC.ink2 : KC.mute, maxW: c.w - 14 });
      si++;
    }
    if (i < SOL.length - 1) { ctx.save(); ctx.globalAlpha *= 0.9; KIT.icon(ctx, 'arrowR', cx + c.w, y1 + 28, 18, KC.ink2, 2.2); ctx.restore(); }
    cx += c.w;
  });
  ctx.fillStyle = KC.rule; ctx.fillRect(x + pad, y2 - 14, w - pad * 2, 2);
  // the current stage's notes (one at a time)
  for (const c of SOLCARD) {
    const ce = KIT.env(t, c.t0, c.t1, 0.35, 0.25); if (!ce.live || ce.a <= 0) continue;
    ctx.save(); ctx.globalAlpha *= ce.a; ctx.translate((1 - ce.i) * 16, 0);
    if (c.n != null) KIT.numKey(ctx, c.n, x + pad + 18, y2 + 30, 36, CIRC);
    else { ctx.strokeStyle = KC.ink; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.arc(x + pad + 18, y2 + 30, 14, 0, 7); ctx.stroke(); }
    KIT.text(ctx, c.title, x + pad + 50, y2 + 32, { w: 600, size: 40, color: KC.ink, maxW: 700 });
    c.lines.forEach((ln, i) => {
      const lt = c.lineAt ? c.lineAt[i] : c.t0 + 0.5 + i * 0.8, u = KIT.eout((t - lt) / 0.35); if (u <= 0) return;
      const ly = y2 + 84 + i * 50;
      ctx.save(); ctx.globalAlpha *= u;
      if (c.dot === i) { ctx.fillStyle = WC; ctx.beginPath(); ctx.arc(x + pad + 8, ly, 9, 0, 7); ctx.fill(); }
      else { ctx.fillStyle = KC.ink; ctx.fillRect(x + pad, ly - 1.5, 16, 3); }
      KIT.text(ctx, clean(ln), x + pad + 32 + (1 - u) * 8, ly + 1, { w: 400, size: 32, color: KC.ink, maxW: w - pad * 2 - 32 });
      ctx.restore();
    });
    ctx.restore();
  }
  KIT.text(ctx, 'ค่าประมาณทั่วไป, Degasser อยู่หลัง Shaker (ไม่ได้แยกตามขนาด)', x + pad, y + h - 30, { w: 400, size: 26, color: KC.ink2, maxW: w - pad * 2 });
  ctx.restore();
}

// ---- persistent chrome: section tab (current stage crossfades) + loop mini-map
const STG = [[8.0, 'ระบบไหลเวียน Mud'], [16.0, 'Mud Tank'], [22.5, 'Mud Pump'], [53.5, 'Standpipe'], [61.5, 'Kelly Hose'], [69.5, 'Top Drive'], [76.9, 'Drill String'], [80.6, 'Bit'], [83.7, 'Annulus'], [90.7, 'Flowline'], [106.5, 'Solids Control'], [137.7, 'Driller Monitors'], [145.7, 'สรุป']];
function sectionTab(ctx, t) {
  const e = KIT.env(t, 8.0, 153.8, 0.4, 0.3); if (!e.live || e.a <= 0) return;
  const x = 60, y = 168, h = 64, iw = 64, L = 'Circulating System';
  const lw = KIT.measure(ctx, L, 600, 30);
  const subW = Math.max(...STG.map(s => KIT.measure(ctx, s[1], 400, 28)));
  const full = iw + 24 + lw + 30 + subW + 28;
  ctx.save(); ctx.globalAlpha = e.a;
  const g = KIT.eout((t - 8.0) / 0.4);
  ctx.save(); ctx.beginPath(); ctx.rect(x - 30, y - 30, iw + (full - iw + 30) * g + 30, h + 60); ctx.clip();
  KIT.sheet(ctx, x, y, full, h);
  ctx.fillStyle = CIRC; KIT.rr(ctx, x, y, iw, h, 6); ctx.fill(); ctx.fillRect(x + iw - 8, y, 8, h);
  KIT.text(ctx, 'P4', x + iw / 2, y + h / 2 + 1, { w: 600, size: 28, align: 'center', color: KC.ink });
  const tx = x + iw + 24;
  KIT.text(ctx, L, tx, y + h / 2 + 1, { w: 600, size: 30, color: KC.ink });
  ctx.fillStyle = KC.rule; ctx.fillRect(tx + lw + 14, y + 16, 2, h - 32);
  let i = 0; while (i < STG.length - 1 && t >= STG[i + 1][0]) i++;
  const k = KIT.eout((t - STG[i][0]) / 0.35);
  if (i > 0 && k < 1) { ctx.save(); ctx.globalAlpha *= 1 - k; KIT.text(ctx, STG[i - 1][1], tx + lw + 30, y + h / 2 + 1, { w: 400, size: 28, color: KC.ink2 }); ctx.restore(); }
  ctx.save(); ctx.globalAlpha *= k; KIT.text(ctx, STG[i][1], tx + lw + 30, y + h / 2 + 1 + (1 - k) * 8, { w: 400, size: 28, color: KC.ink2 }); ctx.restore();
  ctx.restore(); ctx.restore();
}
const NODE_T = [16.0, 23.0, 56.0, 62.0, 66.5, 77.2, 81.0, 84.0, 91.0, 106.8];
function mapPhase(t) { // continuous position on the ring, 0..10 (10 = back at the tank)
  if (t < 16.0) return 0;
  if (t >= 146.0 && t < 150.0) return 10 + 10 * eio((t - 146.0) / 4.0);
  if (t >= 150.0) return 20;
  if (t >= 136.4) return 10;
  if (t >= 106.8) return 9 + clamp((t - 106.8) / (136.4 - 106.8));
  let i = 0; while (i < NODE_T.length - 1 && t >= NODE_T[i + 1]) i++;
  const nx = NODE_T[i + 1] ?? 136.4;
  return i + clamp((t - NODE_T[i]) / (nx - NODE_T[i])) * 0.999;
}
function miniMap(ctx, t) {
  const hidden = (t > 45.6 && t < 53.4) || (t > 106.7 && t < 137.6);
  const e = KIT.env(t, 8.6, 153.8, 0.4, 0.3); if (!e.live || e.a <= 0) return;
  const hk = hidden ? 0 : 1;
  const fadeK = Math.min(sstep(45.6, 45.9, t) ? 1 - sstep(45.6, 45.9, t) + sstep(53.1, 53.4, t) : 1, 1);
  let a = e.a;
  if (t > 45.4 && t < 53.6) a *= 1 - sstep(45.4, 45.7, t) * (1 - sstep(53.3, 53.6, t));
  if (t > 106.5 && t < 137.8) a *= 1 - sstep(106.5, 106.8, t) * (1 - sstep(137.5, 137.8, t));
  if (a <= 0.001) return;
  const x = 790, y = 168, s = 170, cx = x + s / 2, cy = y + s / 2 + 4, R = 58;
  ctx.save(); ctx.globalAlpha = a;
  KIT.sheet(ctx, x, y, s, s, { band: CIRC });
  const ang = i => -Math.PI / 2 + i * 2 * Math.PI / 10;
  const draw = KIT.eio((t - 8.8) / 5.8);
  ctx.strokeStyle = KC.ink; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(cx, cy, R, ang(0), ang(0) + 2 * Math.PI * draw); ctx.stroke();
  const ph = mapPhase(t), lap = ph > 10 ? ph - 10 : ph;
  const solidsDone = t >= 135.0;
  const arc = (p0, p1, col) => { if (p1 <= p0) return; ctx.strokeStyle = col; ctx.lineWidth = 8; ctx.beginPath(); ctx.arc(cx, cy, R, ang(p0), ang(p1)); ctx.stroke(); };
  if (ph > 10) { arc(0, 10, CIRC); }
  else { arc(0, Math.min(ph, 6.5), CIRC); arc(6.5, Math.max(6.5, ph), solidsDone ? CIRC : MUDC); }
  const cur = ph >= 10 ? (ph >= 20 ? 0 : Math.floor(lap) % 10) : Math.min(9, Math.floor(ph));
  for (let i = 0; i < 10; i++) {
    const k = KIT.eout((t - 8.8 - i * 0.58) / 0.3); if (k <= 0) continue;
    const px = cx + Math.cos(ang(i)) * R, py = cy + Math.sin(ang(i)) * R;
    const visited = t >= NODE_T[i] || ph > 10;
    ctx.save(); ctx.globalAlpha *= k;
    if (i === cur && t >= 16.0) KIT.numKey(ctx, i + 1, px, py, 24, CIRC);
    else {
      ctx.fillStyle = visited ? KC.ink : KC.paper; ctx.strokeStyle = KC.ink; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(px, py, 7, 0, 7); ctx.fill(); ctx.stroke();
    }
    ctx.restore();
  }
  // the parcel = the drop's progress (the only continuous motion)
  if (t > 15.8 && !(t > 137.7 && t < 146.0)) {
    const q = ang(lap % 10), px = cx + Math.cos(q) * R, py = cy + Math.sin(q) * R;
    const col = lap > 6.6 && lap < 9.95 && !solidsDone && ph < 10 ? MUDC : CIRC;
    ctx.fillStyle = col; ctx.strokeStyle = KC.ink; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(px, py, 9, 0, 7); ctx.fill(); ctx.stroke();
  }
  ctx.restore();
}
// a cased ring that marks the drop when it is small on screen (land set)
function dropRing(ctx, t) {
  const D = O.drop; if (!D || !D.vis || !D.ring || D.par !== 'L' || O.shot.set !== 'L') return;
  const P = proj(inSet('L', D.p)); if (!P.ok || P.x < 40 || P.x > 1040 || P.y < 40 || P.y > 1300) return;
  const dist = camera.position.distanceTo(O.v3.set(D.p[0], D.p[1], D.p[2]));
  const rpx = 0.22 / (dist * Math.tan(camera.fov * Math.PI / 360)) * (H / 2);
  if (rpx > 16) return;
  const r = Math.max(24, rpx * 2.2);
  cased(ctx, () => { ctx.beginPath(); ctx.arc(P.x, P.y, r, 0, 7); }, 2.5, 7);
}

// ---- driller's screen (drawn into the projected quad of the 3D monitor; illustrative, no values except SPM)
function drillerScreen(ctx, t) {
  if (O.shot.id !== 24) return;
  const TL = proj(wOf(O.scr.tl)), TR = proj(wOf(O.scr.tr)), BL = proj(wOf(O.scr.bl));
  const DW = 1000, DH = 583;
  ctx.save();
  ctx.transform((TR.x - TL.x) / DW, (TR.y - TL.y) / DW, (BL.x - TL.x) / DH, (BL.y - TL.y) / DH, TL.x, TL.y);
  ctx.fillStyle = '#0b1220'; ctx.fillRect(0, 0, DW, DH);
  const tiles = [
    { x: 20, y: 20, at: 138.6, title: 'SPP', unit: 'psi' }, { x: 510, y: 20, at: 139.0, title: 'SPM', unit: 'Pump 1' },
    { x: 20, y: 300, at: 139.4, title: 'Flow Out', unit: '%' }, { x: 510, y: 300, at: 139.8, title: 'PVT', unit: 'bbl, รวมทุกถัง' },
  ];
  const tw = 470, th = 263;
  const gain = sstep(141.4, 143.6, t) * (1 - sstep(144.0, 144.6, t));
  for (const T of tiles) {
    const k = KIT.eout((t - T.at) / 0.4); if (k <= 0) continue;
    ctx.save(); ctx.globalAlpha *= k;
    ctx.fillStyle = '#121c31'; ctx.fillRect(T.x, T.y, tw, th);
    ctx.fillStyle = T.title === 'PVT' ? AMBER : CIRC; ctx.fillRect(T.x, T.y, 8, th);
    KIT.text(ctx, T.title, T.x + 28, T.y + 40, { w: 600, size: 44, color: '#e2e8f0' });
    KIT.text(ctx, T.unit, T.x + tw - 20, T.y + 42, { w: 400, size: 36, color: '#94a3b8', align: 'right' });
    const gx = T.x + 28, gy = T.y + 84, gw = tw - 56, gh = th - 110;
    if (T.title === 'SPP') {
      ctx.strokeStyle = CIRC; ctx.lineWidth = 5; ctx.beginPath();
      for (let i = 0; i <= 80; i++) { const v = 0.55 + 0.04 * Math.sin(i * 0.9 + t * 3) + 0.02 * Math.sin(i * 2.3); const px = gx + gw * i / 80, py = gy + gh * (1 - v); i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
      ctx.stroke();
    } else if (T.title === 'SPM') {
      KIT.text(ctx, '100', gx, gy + gh * 0.55, { w: 600, size: 130, color: '#e2e8f0' });
    } else if (T.title === 'Flow Out') {
      ctx.fillStyle = '#1e293b'; ctx.fillRect(gx, gy + gh * 0.35, gw, 46);
      ctx.fillStyle = CIRC; ctx.fillRect(gx, gy + gh * 0.35, gw * 0.5, 46);
      KIT.text(ctx, 'Flow Paddle', gx, gy + gh * 0.35 + 96, { w: 400, size: 36, color: '#94a3b8' });
    } else {
      const bars = [0.55, 0.6 + 0.22 * gain, 0.5];
      bars.forEach((b, i) => { const bx = gx + i * 78; ctx.fillStyle = '#1e293b'; ctx.fillRect(bx, gy, 56, gh); ctx.fillStyle = i === 1 && gain > 0.05 ? AMBER : '#5eead4'; ctx.fillRect(bx, gy + gh * (1 - b), 56, gh * b); });
      const tx0 = gx + 250, tw2 = gw - 250;
      ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 4; ctx.beginPath();
      for (let i = 0; i <= 40; i++) { const tau = t - 4 + 4 * i / 40, g = sstep(141.4, 143.6, tau) * (1 - sstep(144.0, 144.6, tau)); const px = tx0 + tw2 * i / 40, py = gy + gh * (0.62 - 0.3 * g); i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
      ctx.stroke();
      if (t > 142.0 && t < 143.8) {
        const blink = Math.floor((t - 142.0) / 0.3) % 2 === 0 ? 1 : 0.35;
        ctx.save(); ctx.globalAlpha *= blink; ctx.fillStyle = AMBER; KIT.rr(ctx, tx0, gy + gh - 60, 210, 58, 4); ctx.fill();
        KIT.text(ctx, 'PIT GAIN', tx0 + 105, gy + gh - 30, { w: 600, size: 36, color: KC.ink, align: 'center' }); ctx.restore();
      }
      if (t > 144.4 && t < 145.4) { ctx.save(); ctx.globalAlpha *= 1 - sstep(145.0, 145.4, t); ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 3; KIT.rr(ctx, tx0, gy + gh - 60, 150, 58, 4); ctx.stroke(); KIT.text(ctx, 'LOSS', tx0 + 75, gy + gh - 30, { w: 600, size: 36, color: '#94a3b8', align: 'center' }); ctx.restore(); }
    }
    ctx.restore();
  }
  ctx.restore();
}

// ---- shot 08: dimension marks on the liner + stroke counter
function linerMarks(ctx, t) {
  if (O.shot.id !== 8) return;
  const a = O.pb.anchors, base = addV(OFF.S, SLOT.PUMP_B);
  const P = p => proj(addV(base, p));
  const dk = KIT.env(t, 46.6, 49.3, 0.35, 0.3), lk = KIT.env(t, 47.2, 49.3, 0.35, 0.3);
  if (dk.live && dk.a > 0) {
    const top = P([-1.2, 2.5, 0.05]), bot = P([-1.2, 1.5, 0.05]);
    ctx.save(); ctx.globalAlpha = dk.a;
    const u = KIT.eio((t - 46.6) / 0.45), m = (top.y + bot.y) / 2, y0 = lerp(m, top.y, u), y1 = lerp(m, bot.y, u);
    cased(ctx, () => { ctx.beginPath(); ctx.moveTo(top.x, y0); ctx.lineTo(top.x, y1); });
    for (const yy of [y0, y1]) { ctx.fillStyle = CIRC; ctx.fillRect(top.x - 16, yy - 3, 32, 6); }
    KIT.labelPill(ctx, top.x + 40, m, 'D = 6 in', 'Liner', CIRC, { size: 32, align: 'left', u: KIT.eout((t - 46.9) / 0.35) });
    ctx.restore();
  }
  if (lk.live && lk.a > 0) {
    const s0 = P([-2.625, 1.25, 0.05]), s1 = P([-0.625, 1.25, 0.05]);
    ctx.save(); ctx.globalAlpha = lk.a;
    const u = KIT.eio((t - 47.2) / 0.45), x1 = lerp(s0.x, s1.x, u);
    cased(ctx, () => { ctx.beginPath(); ctx.moveTo(s0.x, s0.y + 60); ctx.lineTo(x1, s1.y + 60); });
    for (const xx of [s0.x, x1]) { ctx.fillStyle = CIRC; ctx.fillRect(xx - 3, s0.y + 44, 6, 32); }
    KIT.labelPill(ctx, (s0.x + s1.x) / 2, s0.y + 130, 'L = 12 in', 'ระยะชัก (Stroke)', CIRC, { size: 32, align: 'center', u: KIT.eout((t - 47.5) / 0.35) });
    ctx.restore();
  }
  const ce = KIT.env(t, 49.4, 53.3, 0.35, 0.3);
  if (ce.live && ce.a > 0) {
    const n = Math.round(100 * clamp((t - 49.6) / 2.4));
    ctx.save(); ctx.globalAlpha = ce.a; ctx.translate(0, (1 - ce.i) * 16);
    KIT.labelPill(ctx, 100, 1236, `${n} SPM`, 'นับ Stroke ต่อนาที', CIRC, { size: 34, align: 'left', u: KIT.eout((t - 49.4) / 0.35) });
    ctx.restore();
  }
}

// ---- transitions
const DIPS = [15.7, 45.5, 90.7, 94.6, 106.5, 137.7, 145.7, 165.0];
const IRIS = [22.5, 29.7, 53.5, 69.5, 98.7];
function transitions(ctx, t) {
  for (const tc of DIPS) KIT.wipe(ctx, t, { tc, dur: 0.5, type: 'dip' });
  KIT.wipe(ctx, t, { tc: 76.9, dur: 0.3, type: 'dip' });
  KIT.wipe(ctx, t, { tc: 161.3, dur: 0.6, type: 'dip', color: '#26163d' });
  for (const tc of IRIS) {
    if (t < tc - 0.3 || t > tc + 0.3) continue;
    let cx = 540, cy = 1000;
    const D = O.drop; if (D && D.vis) { const P = proj(dropWorld(D)); if (P.ok && P.x > 0 && P.x < W && P.y > 0 && P.y < H) { cx = P.x; cy = P.y; } }
    KIT.wipe(ctx, t, { tc, dur: 0.6, type: 'iris', cx, cy });
  }
  if (t > 169.3) { ctx.save(); ctx.globalAlpha = sstep(169.3, 170.0, t); ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); ctx.restore(); }
}
function dropWorld(D) {
  if (D.par === 'L') return inSet('L', D.p);
  if (D.par === 'W') return inSet('W', D.p);
  const g = { PA: O.tri.group, PB: O.pb.group, WS: O.wp.group }[D.par];
  return addV(g.position.toArray(), addV(OFF.S, D.p));
}

function drawOverlay(ctx, t) {
  applyState(t);
  ctx.save(); ctx.textBaseline = 'middle';
  const id = O.shot.id;
  dropRing(ctx, t);
  drillerScreen(ctx, t);
  // ---- title (0.4-7.8)
  KIT.titleCard(ctx, t, { t0: 0.4, t1: 7.8, part: 4, total: 5, kicker: 'Drilling Rig 101, EP.05', title: 'Circulating System', subtitle: 'ระบบไหลเวียนของ Mud', hook: 'Mud 1 หยด เดินทางผ่านอะไรบ้าง?', hookAt: 2.8, color: CIRC });
  sectionTab(ctx, t);
  miniMap(ctx, t);
  // ---- callouts (max 2 at once; tabs sit below the card band)
  const L_ = p => inSet('L', p), Wl = p => inSet('W', p);
  if (id === 2) {
    co(ctx, t, 11.5, 15.2, L_([4.7, 15, 1.5]), 120, 1170, 'ขาลง', 'ปั๊มอัดแรงดันสูง', { n: 1 });
    co(ctx, t, 12.6, 15.2, L_([12.25, 5.2, -3.0]), 580, 1170, 'ขาขึ้น', 'กลับมาคัดกรองที่ผิวดิน', { n: 2, color: MUDC });
  }
  if (id === 3) {
    co(ctx, t, 16.4, 19.2, L_([24.25, 3.05, -1.0]), 120, 790, 'Active Tank', 'Mud ที่หมุนเวียน');
    co(ctx, t, 17.0, 19.2, L_([28.1, 4.25, -5.2]), 940, 790, 'Trip Tank', 'ถังแคบ', { align: 'right' });
  }
  if (id === 4) co(ctx, t, 19.6, 22.3, wOf(O.cp.anchors.impeller), 120, 790, 'Charge Pump', 'ปั๊มหอยโข่ง (Centrifugal)');
  if (id === 5) {
    co(ctx, t, 23.6, 29.4, wOf(O.tri.anchors.liner1), 120, 1220, 'Piston', 'ลูกสูบ 3 ลูก อัดทีละจังหวะ', { n: 1 });
    co(ctx, t, 24.6, 29.4, wOf(O.tri.anchors.crank), 940, 790, 'Crankshaft', 'เพลาข้อเหวี่ยง', { n: 2, align: 'right' });
  }
  if (id === 7) {
    co(ctx, t, 38.6, 41.8, wOf(O.pb.anchors.n2), 120, 760, 'Pulsation Dampener', 'ถุงยาง อัดก๊าซไนโตรเจน (N₂)');
    co(ctx, t, 42.0, 45.2, wOf(O.pb.anchors.popoff), 120, 760, 'Pop-off Valve', 'ระบายกลับถัง');
    tag(ctx, t, 43.0, 44.7, 940, 1240, 'ถ้าแรงดันเกิน', 'วาล์วเปิดเอง', AMBER, 'right');
  }
  if (id === 9 || (id === 10 && t < 58.2)) {
    co(ctx, t, 54.4, 58.2, L_(O.wp_.spValveA), 120, 1220, 'Standpipe Manifold', 'วาล์วแยกทาง Mud');
    co(ctx, t, 55.2, 58.2, L_(O.wp_.spGauge), 940, 790, 'SPP Gauge', 'แรงดันที่ Standpipe', { align: 'right' });
  }
  if (id === 11) {
    const H_ = hosePtsDy(tdDy(t)); co(ctx, t, 62.4, 69.2, L_(H_[12]), 940, 1220, 'Kelly Hose', 'สายยางแรงดันสูง', { align: 'right' });
    co(ctx, t, 66.6, 69.2, wOf(O.tdGoose), 120, 790, 'Gooseneck', 'ท่อโค้ง อยู่กับที่', { color: '#94a3b8' });
  }
  if (id === 12) {
    co(ctx, t, 70.2, 72.4, inSlot('WASH', [1.6, 9.8, 0]), 940, 790, 'Gooseneck', 'อยู่กับที่', { color: '#94a3b8', align: 'right' });
    co(ctx, t, 72.6, 76.6, inSlot('WASH', [0.45, 5.7, 0]), 120, 790, 'Washpipe + Packing', 'ซีลระหว่างส่วนนิ่งกับส่วนหมุน', { color: '#f97316' });
    co(ctx, t, 73.8, 76.6, inSlot('WASH', [0.4, 3.0, 0.1]), 940, 1220, 'Main Shaft', 'หมุนไปกับ Top Drive', { align: 'right' });
  }
  if (id === 14) {
    const rot = BIT_ROT(t); let best = 0, bz = -9; for (let k = 0; k < 3; k++) { const z = Math.sin(rot + k * 2.094); if (z > bz) { bz = z; best = k; } }
    const a = rot + best * 2.094;
    co(ctx, t, 80.9, 83.5, Wl([0.8 * Math.cos(a), YB + 0.4, 0.8 * Math.sin(a)]), 940, 1220, 'Nozzle', 'มี 3 ตัวที่ Bit', { align: 'right' });
  }
  if (id === 16) co(ctx, t, 91.4, 94.6, L_([0, 5.4, 0.3]), 940, 790, 'Bell Nipple', 'ไม่ได้ใช้ปิดหลุม', { align: 'right' });
  if (id === 17) {
    co(ctx, t, 94.9, 98.7, L_([5.0, 5.66, -2.4]), 120, 1220, 'Flowline', 'ลาดลง ไม่มีแรงดัน');
    co(ctx, t, 95.8, 98.7, L_(O.wp_.fpSensor), 940, 790, 'Flow Paddle', 'วัด Flow Out', { align: 'right' });
    const a0 = proj(L_([2.2, 5.85, -1.2])), a1 = proj(L_([5.2, 5.6, -2.5]));
    const sk = KIT.env(t, 95.4, 97.2, 0.3, 0.3);
    if (sk.live && sk.a > 0 && a0.ok && a1.ok) {
      ctx.save(); ctx.globalAlpha = sk.a; const oy = -46, u = KIT.eio((t - 95.4) / 0.45), ex = lerp(a0.x, a1.x, u), ey = lerp(a0.y, a1.y, u) + oy;
      cased(ctx, () => { ctx.beginPath(); ctx.moveTo(a0.x, a0.y + oy); ctx.lineTo(ex, ey); const ang = Math.atan2(a1.y - a0.y, a1.x - a0.x); ctx.moveTo(ex - 16 * Math.cos(ang - 0.5), ey - 16 * Math.sin(ang - 0.5)); ctx.lineTo(ex, ey); ctx.lineTo(ex - 16 * Math.cos(ang + 0.5), ey - 16 * Math.sin(ang + 0.5)); });
      ctx.restore();
    }
  }
  if (id === 18) tag(ctx, t, 104.0, 106.3, 120, 1236, 'Possible kick → Part 5', 'Flow Out เพิ่ม ทั้งที่ปั๊มเท่าเดิม', AMBER);
  if (id === 19) co(ctx, t, 106.8, 110.2, L_([12.25, 5.45, -4.6]), 940, 1200, 'Possum Belly', 'Mud จาก Flowline ตกลงที่นี่', { align: 'right' });
  if (id === 20) co(ctx, t, 117.0, 121.4, L_(O.wp_.vac), 940, 1200, 'Vacuum Pump', 'ดูดแก๊สออก', { align: 'right' });
  if (id === 21) co(ctx, t, 122.4, 125.6, L_(O.wp_.dsHead), 940, 1200, 'Desander', 'กรวยใหญ่ 10 in', { align: 'right' });
  if (id === 22) co(ctx, t, 125.9, 129.5, L_(O.wp_.dlHead), 940, 1200, 'Desilter', 'กรวยเล็ก 4 in', { align: 'right' });
  if (id === 23) {
    co(ctx, t, 131.6, 137.3, L_(O.wp_.cfSol), 120, 1220, 'ของแข็ง', 'ออกทางปลายกรวย', { color: MUDC });
    co(ctx, t, 132.2, 137.3, L_(O.wp_.cfLiq), 940, 1220, 'Mud สะอาด', 'กลับ Active Tank', { align: 'right' });
  }
  if (id === 27) co(ctx, t, 162.2, 165.0, L_([0.9, 1.5, 0.5]), 940, 1220, 'BOP', 'Blowout Preventer', { color: WC, align: 'right' });
  if (id === 28) {
    co(ctx, t, 165.4, 169.2, L_([-10.5, 2.4, 4.0]), 940, 1220, 'Choke Manifold', 'คุมแรงดันตอนปิดหลุม', { color: WC, align: 'right' });
    co(ctx, t, 166.0, 169.2, L_([-14, 5.0, 5.0]), 120, 860, 'MGS', 'Mud Gas Separator', { color: WC });
  }
  linerMarks(ctx, t);
  // ---- sheets (one at a time)
  figCard(ctx, t, { t0: 8.6, t1: 15.4, title: 'Circulating System', lines: ['Closed loop · วงปิด', 'ขาลง: ปั๊มอัดแรงดันสูง', 'ขาขึ้น: กลับมาคัดกรองที่ผิวดิน'] });
  figCard(ctx, t, { t0: 16.2, t1: 22.4, title: 'Mud Tanks', lines: ['Active Tank: Mud ที่หมุนเวียน', 'Trip Tank: ถังแคบ วัดตอนถอนท่อ', 'Charge Pump: ป้อน Mud ให้ปั๊มใหญ่'] });
  figCard(ctx, t, { t0: 23.0, t1: 29.4, title: 'Triplex Mud Pump', lines: ['3 ลูกสูบ · Single-acting', 'ตัวอย่าง: 1,600 hp · 120 SPM', 'Stroke 12 in · 5,000 / 7,500 psi'] });
  figCard(ctx, t, { t0: 30.2, t1: 37.2, title: 'Liner Size', lines: ['7 in → 720 gpm · 3,429 psi', '4½ in → 297 gpm · 7,500 psi', 'ข้อมูล FC-1600 @ 120 SPM'], lineAt: [30.7, 33.9, 34.7], fig: seesaw, figH: 210, figAt: 30.5 });
  figCard(ctx, t, { t0: 38.0, t1: 45.2, title: 'Pump Safety', lines: ['Pulsation Dampener: อัด N₂', 'ลดแรงกระชากของแรงดัน', 'Pop-off Valve: กันแรงดันเกิน'], fig: trace, figH: 190, figAt: 38.4 });
  KIT.formulaCard(ctx, t, { t0: 46.0, t1: 53.4, title: 'Pump Output (Triplex)', y: 236, first: 0.5, step: 1.6, color: CIRC,
    lines: [{ label: 'สูตร', text: 'bbl/stk = [[0.000243]] × D² × L' }, { label: 'แทนค่า', text: '6 in × 12 in = [[0.105 bbl/stk]]' }, { label: 'ต่อนาที', text: '× 100 SPM ≈ [[441 gpm*]]' }],
    result: { label: '* ที่ 100% efficiency (95% ≈ 419 gpm)', value: 441, unit: 'gpm' } });
  figCard(ctx, t, { t0: 54.0, t1: 61.2, title: 'Standpipe', lines: ['Manifold: วาล์วแยกทาง Mud', 'SPP Gauge ให้ Driller ดู', 'ท่อเหล็กขึ้นเสา ~2/3 ความสูง'], lineAt: [54.5, 55.3, 59.4] });
  figCard(ctx, t, { t0: 62.0, t1: 69.2, title: 'Rotary / Kelly Hose', lines: ['สายยางเสริมเหล็ก แรงดันสูง', 'ขยับขึ้นลงตาม Top Drive', 'ต่อเข้า Gooseneck ไม่ใช่ Kelly'] });
  figCard(ctx, t, { t0: 70.0, t1: 76.6, title: 'Gooseneck + Washpipe', lines: ['Gooseneck: ท่อโค้ง อยู่กับที่', 'Washpipe: ซีลระหว่างนิ่งกับหมุน', 'Packing สึกหรอ ต้องเปลี่ยน'] });
  figCard(ctx, t, { t0: 77.4, t1: 83.4, title: 'Bit Nozzles', lines: ['ขนาดเป็น 1/32 in (12 = 12/32)', 'แรงดันราว ½–⅔ ของ SPP ใช้ที่ Bit', 'เมื่อออกแบบ Hydraulics ให้เหมาะ'], fig: splitBar, figH: 150, figAt: 78.9 });
  figCard(ctx, t, { t0: 84.2, t1: 90.4, title: 'Annulus', lines: ['ช่องว่างรอบ Drill String', 'พา Cuttings ขึ้นผิวดิน', 'AV ทั่วไป ~100–200 ft/min'], fig: annulusInset, figW: 250, figAt: 85.0 });
  figCard(ctx, t, { t0: 91.2, t1: 98.4, title: 'Return Line', lines: ['Bell Nipple: บนสุดของ BOP Stack', 'ไม่ได้ใช้ปิดหลุม', 'Flowline: ลาดลง ไม่มีแรงดัน'] });
  figCard(ctx, t, { t0: 99.2, t1: 106.2, title: 'Flow Check', lines: ['Flow Paddle วัด Flow Out (%)', 'Flow Out ↑ ขณะปั๊มเท่าเดิม', '= สัญญาณ Kick แรกสุดบนผิวดิน'], fig: flowGauges, figH: 300, figAt: 99.6 });
  solidsSheet(ctx, t);
  figCard(ctx, t, { t0: 138.2, t1: 145.4, title: 'Driller Monitors', lines: ['SPP: แรงดันที่ Standpipe', 'PVT: รวมปริมาตรทุกถัง', 'เตือน Pit Gain / Loss'] });
  figCard(ctx, t, { t0: 146.2, t1: 153.4, title: 'Circulating System', lines: ['Tank → Pump → Standpipe → Hose', 'Top Drive → Drill String → Bit', 'Annulus → Flowline → Solids Control'], lineAt: [146.7, 147.5, 148.3] });
  KIT.ctaFollow(ctx, t, { t0: 154.2, t1: 161.0, avatar: O.avatar, clickAt: 1.3, color: CIRC });
  KIT.nextTeaser(ctx, t, { t0: 161.8, t1: 169.0, part: 5, total: 5, title: 'Well Control System', sub: 'BOP, Choke Manifold และ MGS', color: WC });
  transitions(ctx, t);
  ctx.restore();
}

// ================================================================ captions & cues
const captions = [
  { t0: 0, t1: 8.0, th: 'Part 4: Circulating System ระบบไหลเวียน Mud', en: 'Part 4: the circulating system' },
  { t0: 8.0, t1: 15.7, th: 'Mud วิ่งเป็นวงปิด: ถัง → หลุม → ถัง', en: 'Mud runs in a closed loop: tank, hole, tank' },
  { t0: 15.7, t1: 22.5, th: 'Active Tank → Charge Pump → Mud Pump', en: 'Active tank, charge pump, then the mud pump' },
  { t0: 22.5, t1: 29.7, th: 'Triplex Pump: 3 ลูกสูบ อัดทางเดียว', en: 'Triplex pump: three single-acting pistons' },
  { t0: 29.7, t1: 37.5, th: 'Liner เล็ก = แรงดันสูง แต่ไหลน้อย', en: 'Smaller liner: more pressure, less flow' },
  { t0: 37.5, t1: 45.5, th: 'Dampener ลดกระชาก · Pop-off กันแรงดันเกิน', en: 'Dampener smooths pulses; pop-off stops overpressure' },
  { t0: 45.5, t1: 53.5, th: 'Liner 6 in · 100 SPM ≈ 441 gpm', en: '6-in liner at 100 SPM: about 441 gpm' },
  { t0: 53.5, t1: 61.5, th: 'Standpipe Manifold → Standpipe ขึ้นเสาแท่น', en: 'Manifold to standpipe, up the mast' },
  { t0: 61.5, t1: 69.5, th: 'Kelly Hose ขยับขึ้นลงตาม Top Drive', en: 'The kelly hose moves with the top drive' },
  { t0: 69.5, t1: 76.9, th: 'Gooseneck → Washpipe ซีลเข้าเพลาที่หมุน', en: 'Gooseneck and washpipe: the rotating seal' },
  { t0: 76.9, t1: 83.7, th: 'Mud ลงก้านเจาะ พุ่งออก Nozzle ที่ Bit', en: 'Down the drill string, out of the bit nozzles' },
  { t0: 83.7, t1: 90.7, th: 'เศษหินขึ้นทาง Annulus รอบก้านเจาะ', en: 'Cuttings ride up the annulus' },
  { t0: 90.7, t1: 98.7, th: 'Bell Nipple → Flowline ไหลด้วยแรงโน้มถ่วง', en: 'Bell nipple to flowline, by gravity' },
  { t0: 98.7, t1: 106.5, th: 'Flow Out มากกว่า Flow In: ระวัง Kick', en: 'More flow out than in: a possible kick' },
  { t0: 106.5, t1: 113.9, th: 'Solids Control: หยาบ → ละเอียด เริ่ม Shaker', en: 'Solids control, coarse to fine: shakers first' },
  { t0: 113.9, t1: 121.7, th: 'Degasser ดึงแก๊สออก ก่อนถึงปั๊มหอยโข่ง', en: 'The degasser removes gas before centrifugal pumps' },
  { t0: 121.7, t1: 129.7, th: 'Desander แยกทราย · Desilter แยกตะกอน', en: 'Desander takes sand; desilter takes silt' },
  { t0: 129.7, t1: 137.7, th: 'Centrifuge: อนุภาคเล็กสุด / เก็บ Barite', en: 'Centrifuge: finest solids, or barite recovery' },
  { t0: 137.7, t1: 145.7, th: 'Driller ดู SPP และ PVT เตือนเพิ่ม/ลด', en: 'The driller watches SPP and PVT alarms' },
  { t0: 145.7, t1: 153.7, th: 'ครบวง: นี่คือ Circulating System', en: 'Full loop: that is the circulating system' },
  { t0: 153.7, t1: 161.3, th: 'กดติดตามไว้ เพื่อไม่พลาดตอนต่อไป', en: 'Follow so you don’t miss the next part' },
  { t0: 161.3, t1: 169.3, th: 'ตอนต่อไป: Well Control System', en: 'Next: the well control system' },
];
const cues = [
  { t: 0.3, sfx: 'whoosh' }, { t: 0.8, sfx: 'impact' }, { t: 3.2, sfx: 'blip' }, { t: 6.0, sfx: 'bubble' },
  { t: 8.0, sfx: 'whoosh' }, { t: 8.6, sfx: 'flow' }, { t: 8.7, sfx: 'blip' },
  { t: 15.5, sfx: 'whoosh' }, { t: 16.2, sfx: 'blip' }, { t: 16.7, sfx: 'bubble' }, { t: 19.4, sfx: 'blip' }, { t: 19.8, sfx: 'swirl' },
  { t: 22.3, sfx: 'whoosh' }, { t: 23.0, sfx: 'blip' }, { t: 23.2, sfx: 'pump' }, { t: 25.0, sfx: 'pump' }, { t: 26.8, sfx: 'pump' }, { t: 28.6, sfx: 'pump' },
  { t: 29.5, sfx: 'whoosh' }, { t: 30.2, sfx: 'blip' }, { t: 30.65, sfx: 'pump' }, { t: 33.2, sfx: 'clunk' }, { t: 35.0, sfx: 'pump' },
  { t: 37.6, sfx: 'whoosh' }, { t: 38.0, sfx: 'blip' }, { t: 39.2, sfx: 'hiss' }, { t: 43.0, sfx: 'hiss' }, { t: 43.1, sfx: 'pulse' },
  { t: 45.3, sfx: 'whoosh' }, { t: 46.0, sfx: 'blip' },
  ...[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(i => ({ t: 49.84 + i * 0.24, sfx: 'blip' })), { t: 51.3, sfx: 'success' },
  { t: 53.3, sfx: 'whoosh' }, { t: 54.0, sfx: 'blip' }, { t: 54.4, sfx: 'clunk' }, { t: 57.4, sfx: 'flow' },
  { t: 61.5, sfx: 'whoosh' }, { t: 62.0, sfx: 'blip' }, { t: 62.2, sfx: 'flow' },
  { t: 69.3, sfx: 'whoosh' }, { t: 70.0, sfx: 'blip' }, { t: 72.6, sfx: 'spin' }, { t: 75.0, sfx: 'blip' },
  { t: 76.8, sfx: 'whoosh' }, { t: 77.4, sfx: 'blip' }, { t: 77.6, sfx: 'flow' }, { t: 81.2, sfx: 'zap' }, { t: 82.2, sfx: 'clunk' },
  { t: 84.2, sfx: 'blip' }, { t: 86.0, sfx: 'bubble' },
  { t: 90.5, sfx: 'whoosh' }, { t: 91.2, sfx: 'blip' }, { t: 92.3, sfx: 'flow' }, { t: 94.4, sfx: 'whoosh' }, { t: 97.8, sfx: 'bubble' },
  { t: 98.5, sfx: 'whoosh' }, { t: 99.2, sfx: 'blip' }, { t: 103.0, sfx: 'alarm' }, { t: 104.0, sfx: 'blip' },
  { t: 106.3, sfx: 'whoosh' }, { t: 107.4, sfx: 'blip' }, { t: 107.6, sfx: 'vibe' }, { t: 112.5, sfx: 'bubble' },
  { t: 114.4, sfx: 'blip' }, { t: 114.6, sfx: 'hiss' }, { t: 117.0, sfx: 'bubble' }, { t: 120.6, sfx: 'bubble' },
  { t: 122.2, sfx: 'blip' }, { t: 122.4, sfx: 'swirl' }, { t: 125.6, sfx: 'blip' }, { t: 126.0, sfx: 'swirl' },
  { t: 130.2, sfx: 'blip' }, { t: 130.6, sfx: 'spin' }, { t: 136.4, sfx: 'bubble' },
  { t: 137.5, sfx: 'whoosh' }, { t: 138.2, sfx: 'blip' }, { t: 142.0, sfx: 'alarm' },
  { t: 145.5, sfx: 'whoosh' }, { t: 146.0, sfx: 'flow' }, { t: 150.0, sfx: 'success' }, { t: 150.0, sfx: 'bubble' },
  { t: 154.2, sfx: 'whoosh' }, { t: 155.5, sfx: 'blip' },
  { t: 161.1, sfx: 'whoosh' }, { t: 161.8, sfx: 'impact' }, { t: 164.8, sfx: 'whoosh' },
];

export default { DURATION, init, renderFrame, post, drawOverlay, captions, cues };
