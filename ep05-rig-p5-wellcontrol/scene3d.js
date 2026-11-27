// scene3d.js — namman.story EP05 "Drilling Rig 101" Part 5/5: WELL CONTROL SYSTEM, 183.6 s, 1080x1920.
// Contract: see ../SPEC.md. Sets: L = land rig (Part 1-4 rig + mud system + the Part 5 well-control equipment from
// assets_p5.js, with a section trench in front of the cellar), W = well cut-away (EP03) + nested casing (teaser),
// S = studio macros (annular, rams, blind-shear, IBOP half-sections). Shot list: docs/storyboard.md (S1-S26).
// renderFrame(t) / drawOverlay(ctx,t) are pure functions of t. Look: ./look.js. Overlays: ./overlay_kit.js.
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { applyLook, skyMaterial, stdMat } from './look.js';
import { createAssets } from './assets_p4.js';
import { createAssetsP5 } from './assets_p5.js';
import * as KIT from './overlay_kit.js';

const DURATION = 183.6;
let THREE, renderer, scene, camera, LOOK, A, P5, LOOKP;
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


function buildLand(G) {
  O.skyL = makeSky(0x1f2a63, 0x9a4f86, 0xffab6b, 0x7a5a44); G.add(O.skyL);
  const sunDir = new THREE.Vector3(-0.62, 0.05, -0.78).normalize();
  O.sunL = add(G, new THREE.CircleGeometry(60, 28), basic(0xfff1c9, { fog: false }), ...sunDir.clone().multiplyScalar(2300).toArray());
  O.sunL.lookAt(0, 0, 0);
  const sg2 = add(G, new THREE.CircleGeometry(240, 28), basic(0xffb27a, { fog: false, transparent: true, opacity: 0.35, depthWrite: false }), ...sunDir.clone().multiplyScalar(2320).toArray());
  sg2.lookAt(0, 0, 0); sg2.visible = false; // look.js sky shader draws the sun glow
  // drill pad with cellar opening
  const pad = new THREE.Shape(); pad.moveTo(-45, -45); pad.lineTo(45, -45); pad.lineTo(45, 45); pad.lineTo(-45, 45); pad.closePath();
  const hole = new THREE.Path(); hole.moveTo(-3.2, -3.2); hole.lineTo(-3.2, 3.2); hole.lineTo(3.2, 3.2); hole.lineTo(3.2, -3.2); hole.closePath();
  pad.holes.push(hole);
  const pg = new THREE.ExtrudeGeometry(pad, { depth: 0.6, bevelEnabled: false }); pg.rotateX(-Math.PI / 2); pg.translate(0, -0.6, 0);
  O.padMesh = add(G, pg, lam(0xcdb48a));
  // desert terrain
  const tg = new THREE.PlaneGeometry(2400, 2400, 56, 56); tg.rotateX(-Math.PI / 2);
  const tp = tg.attributes.position;
  for (let i = 0; i < tp.count; i++) {
    const x = tp.getX(i), z = tp.getZ(i), r = Math.hypot(x, z);
    const n = Math.sin(x * 0.012) * Math.cos(z * 0.01) * 9 + Math.sin(x * 0.031 + z * 0.023) * 3.5 + (hash(i, 3) - 0.5) * 1.5;
    tp.setY(i, -0.35 + n * sstep(80, 260, r));
  }
  O.terrMesh = add(G, tg, lam(0xe0b47e));
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
  // cellar 5.8 x 5.8 m inside (the -z wall is the one the section trench removes: it is a separate mesh)
  O.cellarFloor = add(G, box(6.4, 0.2, 6.4), lam(0x7b8794), 0, -2.5, 0);
  add(G, strip([box(6.4, 2.4, 0.3).translate(0, -1.2, 3.05),
    box(0.3, 2.4, 6.4).translate(-3.05, -1.2, 0), box(0.3, 2.4, 6.4).translate(3.05, -1.2, 0)]), conc);
  O.cellarWallS = add(G, box(6.4, 2.4, 0.3), conc, 0, -1.2, -3.05);
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
  O.lgMesh = add(G, strip(lg), basic(0xfff3c4));
  // doghouse + V-door + pipe racks
  add(G, box(4, 3, 5), lam(0x7aa6d6), -5.4, 8.7, 5);
  O.dogWin = add(G, box(4.1, 0.9, 5.1), basic(0xffe9b0), -5.4, 9.2, 5);
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
  buildWellControlP5(G);
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
  pump: [[-5.0, 0.22, -12.9], [-5.0, 0.22, -15.4], [29.2, 0.22, -15.4], [29.2, 0.22, 7.2], [28.3, 0.7, 7.2]],
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
  const peb = { light: [], dark: [], gas: [] }; // (10-gon pebbles read as stones, not hexagons)
  for (let i = 0; i < 300; i++) {
    const x = (hash(i, 21) - 0.5) * 2 * 30, y = 0.2 - hash(i, 22) * 70;
    if (Math.abs(x) < 2.4) continue;
    const L = LAYERS.find(l => y <= l.y0 && y > l.y1), r = 0.2 + hash(i, 23) * 0.5;
    const gq = new THREE.CircleGeometry(r * 0.6, 10).translate(x, y, 0.03);
    if (L && L.gas) peb.gas.push(gq); else (hash(i, 24) < 0.5 ? peb.light : peb.dark).push(gq);
  }
  for (let i = 0; i < 110; i++) {
    const x = (hash(i, 31) - 0.5) * 2 * 28, y = -35.3 - hash(i, 32) * 6.4;
    if (Math.abs(x) < 1.8) continue;
    peb.gas.push(new THREE.CircleGeometry(0.12 + hash(i, 33) * 0.14, 10).translate(x, y, 0.04));
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
  const ks = 0.62;
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
  // gooseneck on the land top drive (static): the kelly hose lands here
  O.tdGoose = add(O.topDrive, new THREE.TorusGeometry(0.35, 0.12, 8, 14, Math.PI).rotateY(Math.PI / 2), lam(0x94a3b8), 0.0, 1.95, 0.0);
  // pop-off valve on the land pump discharge, vented back to the tanks
  add(G, box(0.32, 0.32, 0.32), lam(0xdc2626), 20.8, 2.05, 7.2);
  add(G, pipeRun([[20.8, 2.2, 7.2], [20.8, 2.5, 7.2], [20.8, 2.5, -0.6], [20.8, 3.3, -1.6]], 0.06, 6), lam(0x9ca3af));
  SYS.cur = null;
}

// ================================================================ PART 5: well-control equipment on the land rig
// The P5 stack is built with its camera side at local +z and choke at local +x. It is turned 180 deg in the rig so the
// choke outlet faces world -x (toward the choke manifold) and its section side faces world -z (the trench cameras):
// seen from the trench (camera at z < 0 looking +z) world -x is screen-right, so the choke is always on screen-right.
const STACK_Y = -2.4;
const ACC_POS = [6.0, 0, -12.5], PANEL_POS = [-2.2, 7.33, 2.6], CPANEL_POS = [2.8, 7.33, -5.6], FOSV_POS = [-2.4, 7.33, -3.4];
const MAN_POS = [-9.3, 0.25, 4.0], MGS_POS = [-14, 0, 4], TRIP_POS = [28.1, 0, -5.5], REC_POS = [-4.4, 0, -9.2];
const CMD_PTS = [[-2.2, 7.6, 2.4], [-2.2, 7.4, 2.2], [-2.2, 6.2, 2.2], [-2.2, 6.2, -6.8], [3.65, 6.2, -6.8], [3.65, 0.3, -6.8], [3.65, 0.3, -10.6], [4.6, 0.6, -11.3]];
const HOSE_PTS = [[6.0, 1.14, -11.45], [6.0, 0.3, -11.0], [6.0, 0.3, -7.5], [6.0, 0.55, -7.0], [6.0, 0.3, -6.5], [6.0, 0.3, -1.6], [3.9, 0.3, -1.6], [3.5, 0.55, -1.6], [3.15, 0.3, -1.6], [2.8, 0.2, -1.6], [2.8, -0.6, -1.6]];
const KILL_PUMP = [[2.76, -2.05, 0.6], [2.76, -2.05, 2.2], [2.76, 0.55, 2.2], [2.76, 0.55, 4.4], [7.7, 0.55, 4.4], [8.0, 0.45, 4.4]];
function wpos(o) { o.updateWorldMatrix(true, false); o.getWorldPosition(O.v3); return [O.v3.x, O.v3.y, O.v3.z]; }
const wa = (g, k) => wpos(g.anchors[k]);
function tube(pts, r, mat, seg = 6) { return add(O.sets.L, pipeRun(pts, r, seg), mat); }
function dashMesh(n, color, r = 0.05, len = 0.4) {
  const g = new THREE.CylinderGeometry(r, r, len, 6); const m = new THREE.InstancedMesh(g, basic(color, { transparent: true, opacity: 0.95, depthWrite: false }), n);
  m.frustumCulled = false; m.count = 0; m.renderOrder = 12; m.userData.sys = null; return m;
}
// one gas bubble = white core + thin purple rim (a back-face shell, slightly larger)
function bubbleMesh(G, n) {
  const core = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 2), basic(0xf8fafc), n);
  const rim = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1.16, 2), basic(0xa855f7, { side: THREE.BackSide }), n);
  for (const m of [core, rim]) { m.frustumCulled = false; m.count = 0; m.userData.sys = null; G.add(m); }
  return { core, rim };
}
function buildWellControlP5(G) {
  SYS.cur = 'wc';
  // ---- BOP stack in the cellar
  const st = O.stack = P5.bopStack({ pipe: true, lines: true });
  st.position.set(0, STACK_Y, 0); st.rotation.y = Math.PI; G.add(st);
  O.stackTop = STACK_Y + (st.userData.height || 5.9);
  // riser from the bell nipple up to the Part 4 flowline (grey, never purple)
  SYS.cur = null;
  add(G, cyl(0.3, 6.45 - O.stackTop, 18).translate(0, (6.45 + O.stackTop) / 2, 0), lam(0x9ca3af));
  add(G, cyl(0.42, 0.18, 18), lam(0x8b939e), 0, O.stackTop + 0.09, 0);
  SYS.cur = 'wc';
  // ---- choke manifold (inlet faces the rig: +x), MGS, flare at the vent top
  const man = O.man = P5.chokeManifold(); man.position.set(...MAN_POS); man.rotation.y = Math.PI; G.add(man);
  const mgs = O.mgs = P5.mudGasSeparator({ ventHeight: 9 }); mgs.position.set(...MGS_POS); mgs.rotation.y = -1.265; G.add(mgs);
  // ---- accumulator (Koomey) unit: front (control manifold, nameplate) faces -z
  const acc = O.acc = P5.accumulatorUnit(); acc.position.set(...ACC_POS); acc.rotation.y = Math.PI; G.add(acc);
  // ---- driller's BOP remote panel (faces -z), remote choke panel (faces +x), FOSV rack
  const dp = O.dpanel = P5.drillerPanel(); dp.position.set(...PANEL_POS); dp.rotation.y = Math.PI; G.add(dp);
  const cp = O.cpanel = P5.chokePanel(); cp.position.set(...CPANEL_POS); cp.rotation.y = Math.PI / 2; G.add(cp);
  const fv = O.fosv = P5.fosv(); fv.position.set(...FOSV_POS); fv.rotation.y = Math.PI * 0.85; G.add(fv);
  // ---- trip tank (replaces the Part 4 box), test plug + chart recorder, diverter (S22 only)
  SYS.cur = 'circ';
  const tt = O.trip = P5.tripTank(); tt.position.set(...TRIP_POS); G.add(tt);
  tt.traverse(m => { if (m.isMesh) m.userData.sys = 'circ'; });
  SYS.cur = 'wc';
  const tp = O.tplug = P5.testPlug(); tp.position.set(0, STACK_Y + 0.315, 0); G.add(tp); tp.visible = false;
  const rec = O.rec = P5.chartRecorder(); rec.position.set(...REC_POS); rec.rotation.y = 2.45; G.add(rec);
  add(G, box(1.4, 0.8, 0.9), lam(0x334155), REC_POS[0] - 0.95, 0.4, REC_POS[2] - 0.35); // air-driven test pump skid
  add(G, cyl(0.12, 0.55, 10), lam(0x9ca3af), REC_POS[0] - 0.95, 1.05, REC_POS[2] - 0.35);
  const dv = O.div = P5.diverter({ ventLength: 22 }); dv.position.set(0, -0.85, 0); G.add(dv); dv.visible = false;
  G.updateMatrixWorld(true);
  // ---- lines: choke (spool -> manifold), manifold -> MGS, MGS liquid return, kill line from the pump
  const pM = lam(0x8f99a6), dark = lam(0x1f2937);
  const ce = wa(st, 'chokeLineEnd'), ke = wa(st, 'killLineEnd'), inl = wa(man, 'inlet'), toM = wa(man, 'toMGS'), mi = wa(mgs, 'inlet');
  O.CHK = [ce, [ce[0], ce[1], 2.2], [ce[0], 0.55, 2.2], [ce[0], 0.55, inl[2]], [inl[0] + 0.6, 0.55, inl[2]], [inl[0] + 0.6, inl[1], inl[2]], inl];
  tube(O.CHK, 0.055, pM, 10);
  O.TOMGS = [toM, [toM[0], mi[1], toM[2]], [toM[0], mi[1], mi[2]], mi];
  tube(O.TOMGS, 0.06, pM, 10);
  const mo = wa(mgs, 'mudOut');
  O.MGSR = [mo, [mo[0], 0.45, mo[2]], [mo[0], 0.45, 8.4], [9, 0.45, 8.4], [9, 0.45, -1.5], [9, 3.3, -1.5], [10.2, 3.3, -1.5]];
  tube(O.MGSR, 0.1, pM, 10);
  O.KILL = [ke, ...KILL_PUMP.slice(1)];
  tube(O.KILL, 0.045, pM, 10);
  add(G, box(0.36, 0.36, 0.36), lam(0x475569), 7.2, 0.55, 4.4); // kill-line gate valve at the pump tee
  O.killWheel = add(G, new THREE.TorusGeometry(0.2, 0.03, 6, 16), lam(0xdc2626), 7.2, 0.95, 4.4); O.killWheel.rotation.x = Math.PI / 2;
  // ---- hose bundle (unit -> cellar junction) and the fan-out to the bonnet close ports; command cable
  SYS.cur = null;
  tube(HOSE_PTS, 0.07, lam(0x111317), 8);
  add(G, box(0.18, 0.5, 0.6), lam(0x334155), 2.8, -0.8, -1.6); // junction box on the cellar +x wall
  tube(CMD_PTS, 0.025, lam(0x4b5563), 5);
  SYS.cur = 'wc';
  const dbl = st.parts.doubleRam, low = st.parts.lowerRam;
  const J = [2.8, -0.8, -1.4];
  O.bonHoses = [];
  for (const [ram, k] of [[dbl, 'port1L'], [dbl, 'port1R'], [dbl, 'port0L'], [dbl, 'port0R'], [low, 'port0L'], [low, 'port0R']]) {
    if (!ram.anchors[k]) continue;
    const p = wpos(ram.anchors[k]), side = p[0] > 0 ? 1 : -1;
    const pts = side > 0 ? [J, [J[0] - 0.4, p[1] + 0.25, -1.0], [p[0], p[1] + 0.25, p[2] - 0.6], p]
      : [J, [2.2, STACK_Y + 0.25, -1.3], [-2.2, STACK_Y + 0.25, -1.3], [p[0], p[1] + 0.25, p[2] - 0.6], p];
    const cv = new THREE.CatmullRomCurve3(pts.map(q => new THREE.Vector3(...q)), false, 'centripetal');
    add(G, new THREE.TubeGeometry(cv, 30, 0.022, 6), lam(0x15171b));
    O.bonHoses.push({ poly: new Poly(cv.getPoints(40).map(v => [v.x, v.y, v.z])), cav: k[4] === '1' ? 'vbr' : ram === low ? 'low' : 'bsr' });
  }
  O.pCMD = new Poly(CMD_PTS); O.pHOSE = new Poly(HOSE_PTS); O.pCHK = new Poly(O.CHK); O.pTOMGS = new Poly(O.TOMGS); O.pMGSR = new Poly(O.MGSR); O.pKILL = new Poly([...O.KILL].reverse());
  // ---- flare at the vent top (pilot always lit; grows when gas arrives), wind sock on the crown
  const ve = wa(mgs, 'ventEnd');
  O.flare = new THREE.Group(); O.flare.position.set(ve[0] + 0.15, ve[1], ve[2]); G.add(O.flare);
  O.flameM = [0xff4d00, 0xff9a1f, 0xffe07a].map(c => basic(c, { transparent: true, opacity: 0.0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  O.flames = [];
  for (let i = 0; i < 9; i++) {
    const h = 2.6 - (i % 3) * 0.6, g = new THREE.ConeGeometry(0.55 - (i % 3) * 0.13, h, 9, 1, true); g.translate(0, h / 2, 0);
    const m = add(O.flare, g, O.flameM[i % 3]); m.userData = { k: i, sys: null }; O.flames.push(m);
  }
  O.flareGlow = add(O.flare, new THREE.SphereGeometry(3.2, 12, 8), basic(0xff7a1a, { transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }), -0.8, 1.6, 0);
  O.flareGlow.userData.sys = null;
  SYS.cur = null;
  const sock = O.sock = new THREE.Group(); sock.position.set(2.2, 44.6, 0); G.add(sock);
  add(sock, cyl(0.03, 1.6, 6).translate(0, -0.8, 0), lam(0x9ca3af));
  O.sockCone = [];
  for (let k = 0; k < 4; k++) {
    const g = new THREE.CylinderGeometry(0.26 - k * 0.045, 0.3 - k * 0.045, 0.32, 10, 1, true); g.rotateZ(Math.PI / 2);
    const m = add(sock, g, lam(k % 2 ? 0xffffff : 0xf97316, { side: THREE.DoubleSide }), -0.2 - k * 0.32, 0, 0); O.sockCone.push(m);
  }
  // ---- crew: cellar hand (S3-S4) and the choke-manifold worker
  O.crew = buildHuman(); O.crew.position.set(2.25, STACK_Y, -2.1); O.crew.rotation.y = -1.9; G.add(O.crew);
  const ch = buildHuman(0xf97316, 0xffffff); ch.position.set(-10.5, 0, 6.6); ch.rotation.y = 3.0; G.add(ch);
  // ---- gloved hands for the panel press and the manual valve
  const glove = lam(0xf97316);
  const hand = () => { const g = new THREE.Group(); add(g, box(0.09, 0.05, 0.11), glove); add(g, box(0.085, 0.03, 0.07), glove, 0, -0.005, 0.085); add(g, cyl(0.045, 0.16, 8).rotateX(Math.PI / 2), lam(0x1f2937), 0, 0, -0.13); return g; };
  O.handL = hand(); O.handR = hand(); O.handV = hand(); for (const h of [O.handL, O.handR, O.handV]) { G.add(h); h.visible = false; }
  // ---- particles and dashes
  O.dash = dashMesh(260, 0xa855f7); G.add(O.dash);
  O.cmdDash = dashMesh(40, 0xc084fc, 0.04, 0.7); G.add(O.cmdDash);
  O.bubL = bubbleMesh(G, 160);
  O.mudArr = new THREE.InstancedMesh(new THREE.ConeGeometry(0.07, 0.2, 6), basic(0xc8925a), 120); O.mudArr.frustumCulled = false; O.mudArr.count = 0; G.add(O.mudArr);
  O.gasStreak = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.05, 0.05, 0.9, 5), basic(0xf1f5f9, { transparent: true, opacity: 0.35, depthWrite: false }), 60); O.gasStreak.frustumCulled = false; O.gasStreak.count = 0; G.add(O.gasStreak);
  O.plume = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), basic(0xe5e7eb, { transparent: true, opacity: 0.22, depthWrite: false }), 60); O.plume.frustumCulled = false; O.plume.count = 0; G.add(O.plume);
  O.drops = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), lam(0x9b6a3c), 40); O.drops.frustumCulled = false; O.drops.count = 0; G.add(O.drops);
  // ---- section trench (L-4): clip planes on pad / terrain / cellar -z wall, plus soil liner faces that grow with it
  O.trenchY = new THREE.Plane(new THREE.Vector3(0, 1, 0), 3);
  const tp4 = [new THREE.Plane(new THREE.Vector3(-1, 0, 0), -3.2), new THREE.Plane(new THREE.Vector3(1, 0, 0), -3.2), new THREE.Plane(new THREE.Vector3(0, 0, 1), 2.85), O.trenchY];
  O.trenchClip = tp4;
  O.terrZ = new THREE.Plane(new THREE.Vector3(0, 0, -1), -3.2);
  O.terrClip = [new THREE.Plane(new THREE.Vector3(-1, 0, 0), -3.2), new THREE.Plane(new THREE.Vector3(1, 0, 0), -3.2), new THREE.Plane(new THREE.Vector3(0, 0, 1), -3.2), O.terrZ];
  O.linerTop = new THREE.Plane(new THREE.Vector3(0, -1, 0), -3);
  const soil = new THREE.MeshLambertMaterial({ color: 0x8a6a4a, side: THREE.DoubleSide, clippingPlanes: [O.linerTop] });
  const soilD = new THREE.MeshLambertMaterial({ color: 0x6f553b, side: THREE.DoubleSide, clippingPlanes: [O.linerTop] });
  const T = O.trench = new THREE.Group(); G.add(T);
  add(T, new THREE.PlaneGeometry(6.4, 16).rotateX(-Math.PI / 2), soilD, 0, -2.45, -11.0);
  for (const s of [-1, 1]) {
    const w = add(T, new THREE.PlaneGeometry(16, 2.45), soil, s * 3.2, -1.225, -11.0); w.rotation.y = Math.PI / 2;
    // strata bands on the side walls
    for (let k = 0; k < 3; k++) { const b = add(T, new THREE.PlaneGeometry(16, 0.07), basic(0x5a4330, { transparent: true, opacity: 0.35, clippingPlanes: [O.linerTop] }), s * (3.2 - 0.01), -0.55 - k * 0.62, -11.0); b.rotation.y = Math.PI / 2; }
  }
  const slope = new THREE.PlaneGeometry(6.4, Math.hypot(4, 2.45)); slope.rotateX(-Math.PI / 2 + Math.atan2(2.45, 4));
  add(T, slope, soil, 0, -1.225, -21.0);
  // pad cut edge (concrete) where the trench meets the cellar
  T.traverse(m => { if (m.isMesh) m.userData.sys = null; });
  // ---- rig lights (L-10): LED floods on the substructure legs + light pools; one switch with the derrick lights
  O.flood = []; O.pools = [];
  const fm = basic(0xfff6d8);
  for (const [x, z, ry] of [[-3.4, -7, 0.6], [3.4, -7, -0.6], [-6.6, 7, 2.6], [6.6, 7, -2.6], [-3.4, 0, 1.57], [3.4, 0, -1.57]]) {
    const f = add(G, box(0.4, 0.25, 0.15), fm, x, 6.0, z); f.rotation.y = ry; f.rotation.x = -0.5; f.userData.sys = null;
  }
  O.floodM = fm;
  const poolM = basic(0xffe6a8, { transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false });
  for (const [x, y, z, r] of [[0, -2.38, 0, 2.6], [0, 7.36, 0, 5.5], [0, 0.03, -9, 6], [5, 0.03, 8, 5]]) {
    const p = add(G, new THREE.CircleGeometry(r, 32).rotateX(-Math.PI / 2), poolM, x, y, z); p.userData.sys = null; O.pools.push(p);
  }
  O.poolM = poolM;
  SYS.cur = null;
}

// ================================================================ STUDIO set (S): half-section macros at real scale (metres)
const SLOT = { ANN: [-40, 0, 0], RAM: [-40, 0, 40], BSR: [-80, 0, 40], IBOP: [-80, 0, 0] };
function buildStudio(G) {
  const floorM = new THREE.MeshLambertMaterial({ color: 0x1b2638 });
  add(G, new THREE.CircleGeometry(160, 64).rotateX(-Math.PI / 2), floorM, -60, -0.002, 20);
  const place = (g, k) => { g.position.set(...SLOT[k]); G.add(g); return g; };
  O.sANN = place(P5.annularPreventer(), 'ANN');
  O.sRAM = place(P5.ramPreventer({ cavities: ['pipe', 'vbr'], floorY: 0 }), 'RAM');
  O.sBSR = place(P5.ramPreventer({ cavities: ['bsr'], floorY: 0 }), 'BSR');
  O.sIBOP = place(P5.ibopValves(), 'IBOP');
  // plinths (machined steel blocks the models sit on)
  for (const k of Object.keys(SLOT)) add(G, cyl(1.6, 0.04, 48), new THREE.MeshLambertMaterial({ color: 0x243248 }), SLOT[k][0], 0.0, SLOT[k][2]);
  // props: tool joint + hex kelly for the annular are inside the asset (setTarget); a 3.5 in ghost pipe, a tool joint
  // across the BSR blades, the IBOP wrench, the pressure disc, arrows
  const steel = new THREE.MeshStandardMaterial({ color: 0x46505b, metalness: 0.7, roughness: 0.42 });
  const tj = O.bsrTJ = new THREE.Group(); O.sBSR.add(tj);
  add(tj, cyl(0.0635, 3.2, 24), steel); add(tj, cyl(0.084, 0.42, 28), steel, 0, 0.1, 0);
  add(tj, cyl(0.0635, 0.06, 24, false, 0.084), steel, 0, -0.14, 0); add(tj, cyl(0.084, 0.06, 24, false, 0.0635), steel, 0, 0.34, 0);
  tj.visible = false;
  const w = O.wrench = new THREE.Group(); O.sIBOP.add(w);
  add(w, cyl(0.012, 0.16, 6).rotateZ(Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x9aa3ad, metalness: 0.8, roughness: 0.35 }), 0.08, 0, 0);
  add(w, cyl(0.014, 0.34, 8), new THREE.MeshStandardMaterial({ color: 0xdc2626, metalness: 0.2, roughness: 0.5 }), 0.17, 0, 0);
  w.visible = false;
  // pressure disc under the closed rams (S9) + force arrow
  O.pDisc = add(O.sRAM, new THREE.CircleGeometry(0.173, 48).rotateX(-Math.PI / 2), basic(0xa855f7, { transparent: true, opacity: 0.55, depthWrite: false, side: THREE.DoubleSide }), 0, 0, 0);
  O.pArrow = new THREE.Group(); O.sRAM.add(O.pArrow);
  const ink = basic(0x16171b), paper = basic(0xf6f2ea, { side: THREE.BackSide });
  add(O.pArrow, cyl(0.022, 1, 10).translate(0, 0.5, 0), ink); add(O.pArrow, cyl(0.032, 1, 10).translate(0, 0.5, 0), paper);
  O.pHead = add(O.pArrow, new THREE.ConeGeometry(0.06, 0.12, 14).translate(0, 0.06, 0), ink);
  O.upArr = new THREE.InstancedMesh(new THREE.ConeGeometry(0.018, 0.05, 8), ink, 12); O.upArr.frustumCulled = false; O.upArr.count = 0; O.sRAM.add(O.upArr);
  // BSR sparks + chips
  O.spark = new THREE.InstancedMesh(new THREE.BoxGeometry(0.004, 0.004, 0.03), basic(0xffd27a, { transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }), 48);
  O.spark.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(48 * 3), 3); O.spark.frustumCulled = false; O.spark.count = 0; O.sBSR.add(O.spark);
  O.chips = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(0.006, 0), lam(0x2a2a30), 6); O.chips.frustumCulled = false; O.chips.count = 0; O.sBSR.add(O.chips);
  // ghost 3-1/2 in pipe for the "one size" beat (S7) and the VBR pipe (S8)
  O.ghost35 = add(O.sRAM, cyl(0.0445, 1.6, 24), new THREE.MeshStandardMaterial({ color: 0x5a6470, metalness: 0.7, roughness: 0.4, transparent: true, opacity: 0.0, depthWrite: false }), 0, 0.5, 0);
  O.sGroups = { ANN: O.sANN, RAM: O.sRAM, BSR: O.sBSR, IBOP: O.sIBOP };
  for (const g of Object.values(O.sGroups)) g.traverse(m => { if (m.isMesh) m.userData.sys = null; });
}

// ================================================================ W additions: BOP proxy, float sub, nested casing (teaser)
function buildWellAdds(G) {
  const px = O.wBOP = P5.bopStack({ pipe: false, lines: false }); px.scale.setScalar(0.42); px.position.set(0, 0.4, 0); px.rotation.y = Math.PI; G.add(px);
  px.traverse(m => { if (m.isMesh) m.userData.sys = null; });
  const fs = O.wFloat = P5.floatSub(); fs.scale.setScalar(7); fs.position.set(0, YBT + 0.3, 0); G.add(fs);
  // EP04 ghost bubble
  O.wGhost = add(G, new THREE.SphereGeometry(0.6, 24, 16), basic(0xf8fafc, { transparent: true, opacity: 0, depthWrite: false }), 0.9, -36, 0.4);
  O.wGhostRim = add(G, new THREE.SphereGeometry(0.68, 24, 16), basic(0xa855f7, { transparent: true, opacity: 0, side: THREE.BackSide, depthWrite: false }), 0.9, -36, 0.4);
  // back-flow / down-flow arrows in the bore (S21)
  O.wArr = new THREE.InstancedMesh(new THREE.ConeGeometry(0.12, 0.34, 8), basic(0xc8925a), 30); O.wArr.frustumCulled = false; O.wArr.count = 0; G.add(O.wArr);
  O.wBub = bubbleMesh(G, 6);
  // nested casing (S26) at W-local x +80: 4 half tubes (back half) + cement annuli, shoes stepping deeper
  const C = O.casingG = new THREE.Group(); C.position.set(80, 0, 0); G.add(C);
  const earth = [[0, -12, 0xd9bf8c], [-12, -24, 0xb98a5a], [-24, -34, 0x97a08a], [-34, -48, 0xbdb5a8]];
  for (const [y0, y1, c] of earth) add(C, box(40, y0 - y1, 12).translate(0, (y0 + y1) / 2, -6.0 - 3.0), lam(c));
  const CS = [[2.6, -6, 0x8f9cab], [2.1, -14, 0x9aa6b4], [1.7, -26, 0xa7b2bf], [1.3, -38, 0xb3bdc8]];
  O.casings = []; O.cements = [];
  CS.forEach(([r, shoe, col], i) => {
    const h = 6.4 - shoe;
    const g = new THREE.CylinderGeometry(r, r, h, 40, 1, true, Math.PI / 2, Math.PI); g.translate(0, (6.4 + shoe) / 2, 0);
    const m = add(C, g, new THREE.MeshLambertMaterial({ color: col, side: THREE.DoubleSide, transparent: true, opacity: 1 })); O.casings.push(m);
    add(C, new THREE.TorusGeometry(r, 0.06, 6, 24, Math.PI).rotateX(Math.PI / 2).rotateY(Math.PI), lam(0x5b6573), 0, shoe, 0); // shoe
    for (const sx of [-1, 1]) O.casings.push(add(C, box(0.09, h, 0.05).translate(sx * r, (6.4 + shoe) / 2, 0.02), new THREE.MeshLambertMaterial({ color: 0x3a4350, transparent: true, opacity: 1 }))); // cut edges
    const ri = i < 3 ? CS[i + 1][0] : 0.9;
    const cg = new THREE.RingGeometry(ri + 0.05, r - 0.03, 40, 1, 0, Math.PI); cg.rotateX(Math.PI / 2);
    // cement: a back half-shell between this string and the next, filled from the shoe up (scale.y)
    const cm = new THREE.CylinderGeometry((r + ri) / 2, (r + ri) / 2, 1, 40, 1, true, Math.PI / 2, Math.PI); cm.translate(0, 0.5, 0);
    const cmm = add(C, cm, new THREE.MeshLambertMaterial({ color: 0x94a3b8, transparent: true, opacity: 0.6, side: THREE.DoubleSide, depthWrite: false }), 0, i < 3 ? CS[i + 1][1] : -46, 0);
    cmm.userData.y0 = cmm.position.y; cmm.userData.top = i < 3 ? shoe + 0.2 : shoe + 0.2; O.cements.push(cmm);
  });
  add(C, box(40, 0.4, 12).translate(0, 6.6, -9), lam(0xe9d3a3));
  for (const [y0, y1, c] of earth) for (const sx of [-1, 1]) add(C, box(17, y0 - y1, 0.4).translate(sx * (2.75 + 8.5), (y0 + y1) / 2, -0.2), lam(c));
  for (const sx of [-1, 1]) add(C, box(17, 6.4, 0.4).translate(sx * (2.75 + 8.5), 3.2, -0.2), lam(0xd9bf8c));
  C.traverse(m => { if (m.isMesh) m.userData.sys = null; });
}

// ================================================================ motion helpers (pure in t)
const eio5 = u => { u = clamp(u); return u < 0.5 ? 16 * u * u * u * u * u : 1 - Math.pow(-2 * u + 2, 5) / 2; };
const ein = u => Math.pow(clamp(u), 3);
const V = (a, b, u) => [lerp(a[0], b[0], u), lerp(a[1], b[1], u), lerp(a[2], b[2], u)];
const addV = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
// camera keys [[t, p, l, fov, vo]]: each segment eased (quintic for >= 1.5 s, cubic below), soft stop at every key
function K(t, keys) {
  if (t <= keys[0][0]) return { p: keys[0][1], l: keys[0][2], fov: keys[0][3], vo: keys[0][4] || [0, 0] };
  let i = 0; while (i < keys.length - 2 && t >= keys[i + 1][0]) i++;
  const a = keys[i], b = keys[i + 1], d = b[0] - a[0], u = (d >= 1.5 ? eio5 : eio)((t - a[0]) / d);
  const va = a[4] || [0, 0], vb = b[4] || [0, 0];
  return { p: V(a[1], b[1], u), l: V(a[2], b[2], u), fov: lerp(a[3], b[3], u), vo: [lerp(va[0], vb[0], u), lerp(va[1], vb[1], u)] };
}
// a hold that slowly pushes toward the look-at (k = fraction of the distance)
function push(c, t, t0, t1, k) { const u = eio((t - t0) / (t1 - t0)) * k; return { ...c, p: V(c.p, c.l, u) }; }
// weighted move through several points: centripetal Catmull-Rom by arc length, one quintic ease over the whole move
const _sp = new Map();
function spline(id, pts, t, t0, t1) {
  if (!_sp.has(id)) _sp.set(id, new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p)), false, 'centripetal'));
  const v = _sp.get(id).getPointAt(eio5((t - t0) / (t1 - t0)), O.v3c); return [v.x, v.y, v.z];
}
// rule 6: damped-spring gauge needle (zeta 0.75, omega 12): steps [[t, value], ...] -> value at t
function needle(t, steps, z = 0.75, w = 12) {
  let v = steps[0][1];
  const s = Math.sqrt(1 - z * z), wd = w * s;
  for (let k = 1; k < steps.length; k++) {
    const [tk, vk] = steps[k], dv = vk - steps[k - 1][1], tt = t - tk;
    if (tt <= 0) break;
    v += dv * (1 - Math.exp(-z * w * tt) * (Math.cos(wd * tt) + z / s * Math.sin(wd * tt)));
  }
  return v;
}
// rule 2: hydraulic ram stroke: ein over the first 0.15 s, constant speed, last 8 % slower, hard stop at t1
function ramU(t, t0, t1) {
  if (t <= t0) return 0; if (t >= t1) return 1;
  const T = t1 - t0, x = t - t0, a = Math.min(0.15, T * 0.2), vmax = 1 / (T - a / 2 - 0.0);
  if (x < a) return 0.5 * vmax * x * x / a;
  return Math.min(1, 0.5 * vmax * a + vmax * (x - a));
}
const shudder = (t, t0, A) => (t < t0 || t > t0 + 0.25) ? 0 : A * Math.exp(-(t - t0) / 0.08) * Math.sin(2 * Math.PI * 14 * (t - t0));
// rule 3: annular closing: near-linear, eased over the last 25 %
function annU(t, t0, t1) { const u = clamp((t - t0) / (t1 - t0)); return u < 0.75 ? u * (0.86 / 0.75) : 0.86 + 0.14 * eout((u - 0.75) / 0.25); }
const pulseIn = (t, t0, t1, d = 0.3) => sstep(t0, t0 + d, t) * (1 - sstep(t1 - d, t1, t));

// ================================================================ shots (cam(t) -> { p, l, fov, vo }) in the shot's frame
const TIER = { bell: 20.9, ann: 21.9, vbr: 23.7, bsr: 26.2, spool: 28.6, low: 32.3, ch: 34.7 };
const YC = { bell: 3.05, ann: 1.97, vbr: 1.01, bsr: 0.44, spool: -0.49, low: -1.18, ch: -2.09 };
const liftCam = (y, z = -8.4) => [-2.6, y + 0.55, z];
const SHOTS = [
  { id: 1, t0: 0, t1: 6.2, set: 'L', cam: t => K(t, [[0, [-14, 3.6, -54], [0, 8.6, 0], 34, [0, 120]], [6.2, [-11.5, 3.5, -46], [0, 8.0, 0], 34, [0, 120]]]) },
  { id: 2, t0: 6.2, t1: 13.2, set: 'W', cam: t => push(K(t, [[6.2, [14, -14, 72], [0, -14, 0], 40], [9.6, [11, -10, 60], [0, -12, 0], 40], [12.0, [6, 6, 24], [0, 2.2, 0], 40, [0, 80]]]), t, 12.0, 13.2, 0.02) },
  { id: 3, t0: 13.2, t1: 20.2, set: 'L', cam: t => push(K(t, [[13.2, [-2.2, 10.2, -12.5], [0, 8.2, 0], 40], [14.8, [-2.2, 10.0, -12.5], [0, 7.3, 0], 40], [17.0, [-1.6, 0.6, -12.6], [0, 0.6, 0], 46, [0, 60]]]), t, 17.0, 20.2, 0.03) },
  { id: 4, t0: 20.2, t1: 36.8, set: 'L', cam: t => {
    const S = [['bell', TIER.bell], ['ann', TIER.ann], ['vbr', TIER.vbr], ['bsr', TIER.bsr], ['spool', TIER.spool], ['low', TIER.low], ['ch', TIER.ch]];
    const keys = [[20.2, [-1.55, 0.6, -12.2], [0, 0.6, 0], 46, [0, 60]]];
    for (let i = 0; i < S.length; i++) {
      const [k, ta] = S[i], y = YC[k], z = k === 'spool' ? -11.0 : -8.4;
      const prev = keys[keys.length - 1];
      if (ta - 0.85 > prev[0] + 0.01) keys.push([ta - 0.85, prev[1], prev[2], prev[3], prev[4]]);
      keys.push([ta, liftCam(y, z), [0, y, 0], 36, [40, 40]]);
      if (k === 'spool') keys.push([31.9, liftCam(y, -11.0), [0, y, 0], 36, [40, 40]]);
    }
    let c = K(t, keys);
    // 2 % push on every hold
    const ks = keys.map(k => k[0]); let j = 0; while (j < ks.length - 1 && t >= ks[j + 1]) j++;
    if (j < ks.length - 1 && keys[j + 1][1] === keys[j][1]) c = push(c, t, ks[j], ks[j + 1], 0.02);
    return c;
  } },
  { id: 5, t0: 36.8, t1: 43.6, set: 'S', sub: 'ANN', cam: t => K(t, [[36.8, [1.3, 1.25, 5.0], [0, 0.64, 0], 34, [40, 110]], [43.6, [1.1, 1.12, 4.3], [0, 0.64, 0], 34, [40, 110]]]) },
  { id: 6, t0: 43.6, t1: 50.1, set: 'S', sub: 'ANN', cam: t => K(t, [[43.6, [1.1, 1.12, 4.3], [0, 0.64, 0], 34, [40, 110]], [47.0, [1.0, 1.06, 4.0], [0, 0.64, 0], 34, [40, 110]], [49.8, [1.0, 1.02, 3.95], [0, 0.6, 0], 34, [40, 110]]]) },
  { id: 7, t0: 50.1, t1: 56.3, set: 'S', sub: 'RAM', cam: t => K(t, [[50.1, [0, 4.7, 1.35], [0, 1.17, -0.03], 40, [40, 150]], [53.2, [0, 4.6, 1.33], [0, 1.17, -0.03], 40, [40, 150]], [56.3, [0, 2.55, 0.6], [0, 1.17, 0], 40, [40, 150]]]) },
  { id: 8, t0: 56.3, t1: 63.7, set: 'S', sub: 'RAM', cam: t => {
    if (t < 58.6) return K(t, [[56.3, [0, 2.55, 0.6], [0, 1.17, 0], 40, [40, 150]], [58.6, [0, 2.3, 0.62], [0, 0.6, 0], 40, [40, 150]]]);
    // orbit down about the bore axis to the side elevation, then truck to the bonnet tail and back
    if (t < 59.6) { const u = eio((t - 58.6) / 1.0), a = lerp(Math.atan2(1.7, 0.62), 0.12, u), r = lerp(Math.hypot(1.7, 0.62), 3.4, u);
      return { p: [lerp(0, 0.35, u), 0.6 + r * Math.sin(a), r * Math.cos(a)], l: [lerp(0, 0.25, u), 0.6, 0], fov: 40, vo: [40, lerp(150, 120, u)] }; }
    return K(t, [[59.6, [0.35, 0.6 + 3.4 * Math.sin(0.12), 3.4 * Math.cos(0.12)], [0.25, 0.6, 0], 40, [40, 120]], [61.4, [1.55, 0.72, 2.7], [1.5, 0.6, 0], 40, [0, 120]], [63.7, [0.3, 0.68, 3.2], [0.2, 0.62, 0], 40, [40, 120]]]);
  } },
  { id: 9, t0: 63.7, t1: 70.6, set: 'S', sub: 'RAM', cam: t => K(t, [[63.7, [0.3, 0.68, 3.2], [0.2, 0.62, 0], 40, [40, 120]], [64.6, [0.28, 0.34, 3.4], [0, 0.6, 0], 36, [40, 140]], [70.6, [0.24, 0.32, 3.1], [0, 0.6, 0], 36, [40, 140]]]) },
  { id: 10, t0: 70.6, t1: 77.6, set: 'S', sub: 'BSR', cam: t => {
    let c = K(t, [[70.6, [0.78, 0.98, 3.2], [0, 0.63, 0], 32, [40, 170]], [73.4, [0.6, 0.86, 2.6], [0, 0.63, 0], 32, [40, 170]], [75.0, [0.6, 0.86, 2.6], [0, 0.63, 0], 32, [40, 170]], [77.6, [0.6, 0.95, 2.6], [0, 0.75, 0], 32, [40, 170]]]);
    const j = shudder(t, 73.6, 0.0035); c.p = [c.p[0], c.p[1] + j, c.p[2]]; return c;
  } },
  { id: 11, t0: 77.6, t1: 84.6, set: 'L', cam: t => {
    const A = [[-2.22, 8.72, -0.2], [-2.22, 8.68, 2.45]];
    if (t < 78.6) return { p: A[0], l: A[1], fov: 40, vo: [0, 90] };
    if (t < 80.8) { const P = spline('s11p', [A[0], [-1.6, 8.2, -0.6], [3.0, 6.4, -9.6], [7.2, 4.0, -15.5], [6.0, 1.7, -18.6]], t, 78.6, 80.8);
      const L = spline('s11l', [A[1], [0.0, 7.5, -2.0], [3.6, 2.5, -8.0], [6.0, 1.15, -12.6]], t, 78.6, 80.8);
      return { p: P, l: L, fov: 40, vo: V([0, 90, 0], [0, 40, 0], eio5((t - 78.6) / 2.2)).slice(0, 2) }; }
    return push({ p: [6.0, 1.7, -18.6], l: [6.0, 1.15, -12.6], fov: 40, vo: [0, 40] }, t, 80.8, 84.6, 0.035);
  } },
  { id: 12, t0: 84.6, t1: 91.4, set: 'L', blend: 0.8, cam: t => K(t, [[84.6, [7.95, 1.3, -15.6], [8.3, 1.05, -13.2], 36, [0, 60]], [88.2, [7.9, 1.3, -15.4], [8.3, 1.05, -13.2], 36, [0, 60]], [89.2, [6.25, 1.72, -14.75], [6.0, 1.6, -12.8], 36, [0, 40]], [91.4, [6.2, 1.7, -14.6], [6.0, 1.58, -12.8], 36, [0, 40]]]) },
  { id: 13, t0: 91.4, t1: 92.7, set: 'L', cam: t => K(t, [[91.4, [34, 6.0, -30], [0, 6, 0], 38, [0, 0]], [92.7, [32, 6.2, -28], [0, 6, 0], 38, [0, 0]]]) },
  { id: 13.2, t0: 92.7, t1: 93.6, set: 'L', cam: t => K(t, [[92.7, [7.7, 1.42, -16.4], [8.0, 1.15, -13.2], 36, [0, 60]], [93.6, [7.7, 1.4, -16.2], [8.0, 1.15, -13.2], 36, [0, 60]]]) },
  { id: 13.3, t0: 93.6, t1: 98.2, set: 'L', cam: t => K(t, [[93.6, [-1.3, 1.05, -9.3], [0, 0.75, 0], 40, [0, 20]], [98.2, [-1.1, 0.95, -8.7], [0, 0.75, 0], 40, [0, 20]]]) },
  { id: 14, t0: 98.2, t1: 104.4, set: 'L', cam: t => K(t, [[98.2, [-0.55, -0.12, -3.5], [-0.95, -0.42, 0], 34, [-40, 80]], [104.4, [-0.68, -0.18, -3.05], [-0.95, -0.42, 0], 34, [-40, 80]]]) },
  { id: 15, t0: 104.4, t1: 111.8, set: 'L', cam: t => push(K(t, [[104.4, [-0.68, -0.18, -3.05], [-0.95, -0.42, 0], 34, [-40, 80]], [107.0, [-0.68, -0.18, -3.05], [-0.95, -0.42, 0], 34, [-40, 80]], [108.6, [0.9, -0.2, -3.6], [0.95, -0.6, 0], 36, [40, 80]]]), t, 108.6, 111.8, 0.04) },
  { id: 16, t0: 111.8, t1: 116.2, set: 'L', cam: t => K(t, [[111.8, [-2.5, 1.6, 10.5], [-2.2, 0.8, 4.0], 36], [113.4, [-6.8, 1.9, 11.0], [-7.6, 1.2, 4.4], 36], [116.2, [-8.55, 1.6, 6.75], [-9.01, 1.2, 4.71], 34, [0, 80]]]) },
  { id: 16.2, t0: 116.2, t1: 119.2, set: 'L', cam: t => push({ p: [4.6, 8.72, -5.6], l: [3.05, 8.62, -5.6], fov: 36, vo: [0, 40] }, t, 116.2, 119.2, 0.03) },
  { id: 17, t0: 119.2, t1: 126.4, set: 'L', cam: t => K(t, [[119.2, [-20.0, 4.6, 23.5], [-14, 4.2, 4], 34, [-170, -150]], [122.4, [-19.6, 4.5, 21.8], [-14, 4.2, 4], 34, [-170, -150]], [124.2, [-19.6, 4.8, 21.8], [-14.4, 12.5, 4.5], 34, [-170, -150]], [126.4, [-19.2, 3.4, 20.4], [-14.6, 2.0, 4.4], 34, [-170, -60]]]) },
  { id: 18, t0: 126.4, t1: 133.4, set: 'L', cam: t => K(t, [[126.4, [-19.2, 3.4, 20.4], [-14.6, 2.0, 4.4], 34, [-170, -60]], [128.0, [-17.6, 2.0, 12.9], [-14.8, 1.7, 4.3], 34, [-120, 40]], [133.4, [-17.4, 1.95, 12.2], [-14.8, 1.7, 4.3], 34, [-120, 40]]]) },
  { id: 19, t0: 133.4, t1: 135.2, set: 'L', cam: t => K(t, [[133.4, [1.6, 12.0, -15.5], [0, 12.6, 0], 42], [135.2, [1.55, 12.3, -15.3], [0, 13.4, 0], 42]]) },
  { id: 19.2, t0: 135.2, t1: 139.6, set: 'L', cam: t => K(t, [[135.2, [30.0, 2.6, 0.9], [28.1, 2.15, -5.0], 36, [0, 40]], [139.6, [29.75, 2.5, 0.3], [28.1, 2.1, -5.0], 36, [0, 40]]]) },
  { id: 20, t0: 139.6, t1: 141.0, set: 'L', cam: t => K(t, [[139.6, [2.6, 19.4, 3.0], [0, 19.4, 0], 36], [141.0, [2.2, 19.2, 2.5], [0, 19.2, 0], 36]]) },
  { id: 20.2, t0: 141.0, t1: 145.2, set: 'S', sub: 'IBOP', cam: t => K(t, [[141.0, [0.62, 1.0, 2.15], [0, 0.78, 0], 32, [40, 60]], [145.2, [0.52, 0.92, 1.85], [0, 0.76, 0], 32, [40, 60]]]) },
  { id: 21, t0: 145.2, t1: 148.9, set: 'L', cam: t => K(t, [[145.2, [-3.75, 7.92, -6.45], [-2.4, 7.78, -3.4], 36], [148.9, [-3.55, 7.88, -5.95], [-2.4, 7.76, -3.4], 36]]) },
  { id: 21.2, t0: 148.9, t1: 149.4, set: 'W', cam: t => { const u = eio((t - 148.9) / 0.5), yd = lerp(-20, -34.6, u); return { p: [2.2, yd + 1.4, 9.5], l: [0, yd - 0.8, 0], fov: 36 }; } },
  { id: 21.3, t0: 149.4, t1: 152.1, set: 'W', cam: t => push({ p: [2.8, YBT + 0.3 + 3.9, 8.4], l: [0, YBT + 0.3 + 3.0, 0], fov: 34, vo: [0, 60] }, t, 149.4, 152.1, 0.04) },
  { id: 22, t0: 152.1, t1: 159.2, set: 'L', cam: t => K(t, [[152.1, [-1.4, 1.1, -11.0], [0, -0.6, 0], 44], [154.6, [-1.35, 1.1, -10.6], [0, -0.6, 0], 44], [157.4, [16, 26, -40], [-12, 0, -1], 40], [159.2, [15.6, 25.6, -39.4], [-12, 0, -1], 40]]) },
  { id: 23, t0: 159.2, t1: 160.6, set: 'L', cam: t => K(t, [[159.2, [-1.1, 0.25, -10.2], [0, -1.2, 0], 40], [160.6, [-1.0, 0.2, -9.8], [0, -1.3, 0], 40]]) },
  { id: 23.2, t0: 160.6, t1: 163.3, set: 'L', cam: t => push({ p: [-3.25, 1.42, -10.45], l: [-4.4, 1.2, -9.2], fov: 34, vo: [0, 20] }, t, 160.6, 163.3, 0.03) },
  { id: 23.3, t0: 163.3, t1: 166.1, set: 'L', cam: t => push({ p: [-1.3, 1.3, -9.4], l: [0, 1.0, 0], fov: 40, vo: [0, 40] }, t, 163.3, 166.1, 0.03) },
  { id: 24, t0: 166.1, t1: 172.4, set: 'L', cam: t => K(t, [[166.1, [112, 34, -14], [-2, 13, 1], 26, [0, -380]], [171.0, [150, 56, -20], [-2, 14, 1], 22, [0, -380]], [172.4, [150, 56, -20], [-2, 14, 1], 22, [0, -380]]]) },
  { id: 25, t0: 172.4, t1: 177.4, set: 'L', cam: t => K(t, [[172.4, [150, 56, -20], [-2, 14, 1], 22, [0, -380]], [177.4, [146, 55, -19.5], [-2, 14, 1], 22, [0, -380]]]) },
  { id: 26, t0: 177.4, t1: 183.61, set: 'W', base: [80, 0, 0], cam: t => K(t, [[177.4, [5, 17, 17], [0, 3, -1], 40], [180.0, [6, 9, 22], [0, -4, -1], 40], [183.0, [6.5, -10, 26], [0, -20, -1], 40]]) },
];
function shotFor(t) {
  let i = 0; while (i < SHOTS.length - 1 && t >= SHOTS[i + 1].t0) i++;
  const S = SHOTS[i]; let c = S.cam(t);
  if (S.blend && i > 0 && t < S.t0 + S.blend) {
    const P = SHOTS[i - 1], c0 = P.cam(S.t0), u = eio((t - S.t0) / S.blend);
    c = { p: V(c0.p, c.p, u), l: V(c0.l, c.l, u), fov: lerp(c0.fov, c.fov, u), vo: [lerp((c0.vo || [0, 0])[0], (c.vo || [0, 0])[0], u), lerp((c0.vo || [0, 0])[1], (c.vo || [0, 0])[1], u)] };
  }
  const base = addV(OFF[S.set], S.sub ? SLOT[S.sub] : S.base || [0, 0, 0]);
  return { id: S.id, set: S.set, sub: S.sub, base, v: [...addV(base, c.p), ...addV(base, c.l), c.fov], vo: c.vo || [0, 0] };
}
// highlight: which systems glow (purple wc lift 1.5-166.1, five colours in the recap). k scales the lift in close-ups.
function focusAt(t, id) {
  if (t >= 166.1) {
    const at = { power: 167.4, hoist: 168.1, rotate: 168.9, circ: 169.6, wc: 170.9 }, lift = {};
    for (const k in at) lift[k] = 0.35 + 0.5 * eout((t - at[k]) / 0.4) - 0.45 * sstep(172.4, 173.4, t);
    return { lift, dim: 0 };
  }
  const a = 0.85 * sstep(1.5, 4.0, t);
  if (id === 22) return { lift: { wc: a }, dim: 0.62 * sstep(152.2, 152.9, t) };
  const close = [5, 6, 7, 8, 9, 10, 11, 12, 13.2, 14, 15, 16, 16.2, 17, 18, 19.2, 20, 21, 23.2].includes(id);
  return { lift: { wc: close ? a * 0.22 : a }, dim: (close ? 0.2 : 0.45) * a, sweep: t < 4.2 ? O.stackTop + 0.4 - (t - 1.5) * 2.4 : -99 };
}

// ================================================================ init
async function init(opts) {
  THREE = opts.THREE; renderer = opts.renderer; W = opts.width || 1080; H = opts.height || 1920;
  renderer.localClippingEnabled = true;
  _c.a = new THREE.Color();
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(40, W / H, 0.05, 5000);
  scene.fog = new THREE.Fog(0x000000, 10, 1000);
  scene.background = new THREE.Color();
  O.hemi = new THREE.HemisphereLight(0xffffff, 0x445566, 1.5); scene.add(O.hemi);
  O.dir = new THREE.DirectionalLight(0xffffff, 2.2); scene.add(O.dir); scene.add(O.dir.target);
  O.sets = {}; O.mk = {};
  O.v3 = new THREE.Vector3(); O.v3b = new THREE.Vector3(); O.v3c = new THREE.Vector3(); O.tan = new THREE.Vector3(); O.q = new THREE.Quaternion(); O.up = new THREE.Vector3(0, 1, 0);
  O.m4 = new THREE.Matrix4(); O.scl = new THREE.Vector3(); O.col = new THREE.Color(); O.hc = new THREE.Color();
  for (const k of Object.keys(OFF)) { const g = new THREE.Group(); g.position.set(...OFF[k]); scene.add(g); O.sets[k] = g; }
  A = createAssets({ THREE, mergeGeometries, stdMat, quality: 0.8 });
  P5 = createAssetsP5({ THREE, mergeGeometries, stdMat, quality: 0.85 });
  buildLand(O.sets.L);
  SYS.cur = 'hoist'; buildHoistExtras(O.sets.L);
  SYS.cur = 'rotate'; buildRotateRig(O.sets.L); SYS.cur = null;
  buildCircAdds(O.sets.L);
  buildWell(O.sets.W);
  buildWellAdds(O.sets.W);
  buildStudio(O.sets.S);
  for (const r of [O.racked[5], O.stand, O.slips]) r.visible = false;
  for (const a of [O.cp, O.sm, O.dg, O.dsn, O.dsl, O.cf, O.fp]) a.group.traverse(m => { if (m.isMesh) m.userData.sys = 'circ'; });
  // ---- look upgrade (before the highlight caches materials)
  const DUSK = { top: 0x1f2a63, mid: 0x9a4f86, hor: 0xffab6b, low: 0x7a5a44, glow: 0xffb27a, ground: 0x8a6448, sunDir: new THREE.Vector3(-0.62, 0.05, -0.78) };
  O.skyL.material = skyMaterial(DUSK);
  LOOKP = {
    L: { sky: DUSK, exposure: 1.08, envIntensity: 1.0, lightDir: [70, 52, 22], glow: { strength: 0.35, threshold: 0.86 }, rim: { color: 0xffb27a, intensity: 1.2, lift: 0.35 }, shadowMin: 6 },
    S: { refl: { top: 0xe6eefc, hor: 0x5a6b8a, ground: 0x1a2840, sun: 0xffffff, sunK: 2.6, sunDir: [0.5, 0.65, 0.55] }, exposure: 1.0, envIntensity: 1.05, shadowMin: 2.5, shadowFit: 0.7, lightDir: [0.55, 0.9, 0.6],
      glow: { strength: 0.25, threshold: 0.88 }, grade: { saturate: 1.04, contrast: 1.05 }, rim: { color: 0xbfd4ff, intensity: 1.6, lift: 0.5, side: 0.6 }, backdrop: { top: 0x0a1222, mid: 0x1c2f52, hor: 0x16233a, low: 0x0d1a2e } },
    W: { refl: { top: 0xdfe8f5, hor: 0x6b7c96, ground: 0x2a2018, sun: 0xffffff, sunK: 2, sunDir: [0.3, 0.8, 0.5] }, exposure: 1.0, envIntensity: 0.9, shadow: false,
      glow: { strength: 0.3, threshold: 0.84 }, rim: { color: 0xbcd4ff, intensity: 0.8, lift: 0.5 } },
  };
  LOOK = await applyLook({ THREE, renderer, scene, camera, sets: O.sets, light: O.dir, presets: LOOKP, opts: (typeof window !== 'undefined' && window.LOOK_OPTS) || {} });
  // section trench clipping on the (upgraded) pad / terrain / cellar -z wall materials
  for (const m of [O.padMesh, O.terrMesh, O.cellarWallS]) { m.material.clippingPlanes = m === O.terrMesh ? O.terrClip : O.trenchClip; m.material.clipIntersection = true; m.material.side = THREE.DoubleSide; m.material.needsUpdate = true; }
  O.tagged = []; const seen = new Set();
  O.sets.L.traverse(m => {
    if (!m.isMesh || !m.userData.sys || !m.material || seen.has(m.material) || !m.material.color) return;
    if (m.material.userData && m.material.userData.lampColor) return;
    if (m.material.transparent && !m.material.isMeshStandardMaterial) return;
    seen.add(m.material);
    O.tagged.push({ mat: m.material, sys: m.userData.sys, col: m.material.color.clone(), em: m.material.emissive ? m.material.emissive.clone() : null, y: wpos(m)[1] });
  });
  // per-tier stack material groups for the top->bottom sweep (S1) and the lift (S4)
  O.tierMats = {};
  const tiers = { bell: O.stack.parts.bell, ann: O.stack.parts.annular, dbl: O.stack.parts.doubleRam, spool: O.stack.parts.spool, low: O.stack.parts.lowerRam, ch: O.stack.parts.casingHead };
  for (const k in tiers) { const s = new Set(); tiers[k].traverse(m => { if (m.isMesh && m.material && m.material.emissive) s.add(m.material); }); O.tierMats[k] = [...s]; }
  O.bellMats = new Set(O.tierMats.bell); O.chMats = new Set(O.tierMats.ch);
  for (const e of O.tagged) if (O.bellMats.has(e.mat) || O.chMats.has(e.mat)) e.sys = 'grey';
  O.avatar = new Image(); O.avatar.src = 'assets/avatar.png';
  try { await O.avatar.decode(); } catch (e) { O.avatar = null; }
  scene.updateMatrixWorld(true);
  for (const g of [O.stack, O.man, O.mgs, O.acc, O.fosv, O.trip, O.div, O.sANN, O.sRAM, O.sBSR, O.sIBOP, O.wBOP, O.wFloat]) if (g.api.refreshCut) g.api.refreshCut();
  // shared clip planes of the cut assets (for the oblique / horizontal sections)
  const planeOf = g => { let p = null; g.traverse(m => { if (!p && m.isMesh) for (const mm of [].concat(m.material)) if (mm && mm.userData && mm.userData.clipPlane) { p = mm.userData.clipPlane; break; } }); return p; };
  O.cam = camera; O.THREE = THREE;
  O.stand.material.color.setHex(0x8792a2); if (O.stand.material.emissive) O.stand.material.emissive.setHex(0x000000);
  // shadow pass budget: bolts / nuts / small instanced parts do not cast
  for (const g of [O.stack, O.man, O.mgs, O.acc, O.dpanel, O.cpanel, O.trip, O.rec, O.sANN, O.sRAM, O.sBSR, O.sIBOP]) g.traverse(m => { if (m.isInstancedMesh) m.castShadow = false; else if (m.isMesh && m.geometry) { if (!m.geometry.boundingSphere) m.geometry.computeBoundingSphere(); if (m.geometry.boundingSphere.radius < 0.06) m.castShadow = false; } });
  O.capMats = []; { const seen2 = new Set(); for (const g of [O.stack, O.mgs, O.acc, O.tplug]) g.traverse(m => { if (m.isMesh) for (const mm of [].concat(m.material)) if (mm && mm.userData && mm.userData.wU && !seen2.has(mm)) { seen2.add(mm); O.capMats.push([mm.userData.wU.capCol.value, mm.userData.wU.capCol.value.clone()]); } }); }
  O.ramPlane = planeOf(O.sRAM); O.mgsPlane = planeOf(O.mgs); O.chokePlane = planeOf(O.man.parts.chokeA);
  O.lastT = null;
}

// ================================================================ per-frame state
function setI(mesh, i, x, y, z, s, sy = s) {
  const e = mesh.instanceMatrix.array, o = i * 16;
  e[o] = s; e[o + 1] = 0; e[o + 2] = 0; e[o + 3] = 0; e[o + 4] = 0; e[o + 5] = sy; e[o + 6] = 0; e[o + 7] = 0;
  e[o + 8] = 0; e[o + 9] = 0; e[o + 10] = s; e[o + 11] = 0; e[o + 12] = x; e[o + 13] = y; e[o + 14] = z; e[o + 15] = 1;
}
function done(mesh, n) { mesh.count = n; mesh.instanceMatrix.needsUpdate = true; if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true; }
const DARK = t => t >= 91.9 && t < 166.1;
function env(set, t) {
  const o = OFF[set];
  if (set === 'L') {
    const dk = DARK(t) ? 1 : 0;
    scene.background.setHex(0x9a4f86); scene.fog.color.setHex(dk ? 0xa8789a : 0xe8a27a); scene.fog.near = 160; scene.fog.far = 1600;
    O.hemi.color.setHex(0xffe6cf); O.hemi.groundColor.setHex(0x8a6448); O.hemi.intensity = dk ? 1.35 : 1.75;
    O.dir.color.setHex(0xffc58f); O.dir.intensity = dk ? 2.0 : 2.5; O.dir.position.set(60, 55, 75); O.dir.target.position.set(0, 0, 0);
    LOOKP.L.exposure = 1.08 * (dk ? 0.84 : 1);
    // depth: in close shots the fog racks in behind the subject
    const s = O.shot, dist = Math.hypot(s.v[0] - s.v[3], s.v[1] - s.v[4], s.v[2] - s.v[5]);
    if (dist < 14) { scene.fog.near = dist + 8; scene.fog.far = dist + 90; }
    if (O.shot.id === 22) { scene.fog.color.setHex(0x8f84a6); }
  } else if (set === 'W') {
    scene.background.setHex(0x0f2236); scene.fog.color.setHex(0x0f2236); scene.fog.near = 300; scene.fog.far = 1200;
    O.hemi.color.setHex(0xffffff); O.hemi.groundColor.setHex(0x7a8796); O.hemi.intensity = 1.9;
    O.dir.color.setHex(0xffffff); O.dir.intensity = 1.8; O.dir.position.set(o[0] + 40, 70, o[2] + 90); O.dir.target.position.set(o[0], -10, o[2]);
  } else {
    scene.background.setHex(0x0d1a2e); scene.fog.color.setHex(0x0d1a2e); scene.fog.near = 5; scene.fog.far = 26;
    O.hemi.color.setHex(0xf2f4ff); O.hemi.groundColor.setHex(0x2a3448); O.hemi.intensity = 1.25;
    const b = O.shot.base; O.dir.color.setHex(0xfff4e6); O.dir.intensity = 2.5; O.dir.position.set(b[0] + 12, 20, b[2] + 14); O.dir.target.position.set(b[0], 0.6, b[2]);
  }
}
function applyHighlight(t, id) {
  const F = focusAt(t, id);
  for (const e of O.tagged) {
    const lift = clamp(F.lift[e.sys] || 0, 0, 1);
    const sweep = F.sweep != null && e.sys === 'wc' ? sstep(F.sweep + 0.5, F.sweep - 0.5, e.y) : 1;
    const l = lift * sweep;
    e.mat.color.copy(e.col).multiplyScalar(e.sys === 'grey' ? 1 - 0.35 * F.dim : (F.lift[e.sys] ? 1 : 1 - F.dim));
    if (e.em) { e.mat.emissive.copy(e.em); if (l > 0.001) e.mat.emissive.add(O.hc.setHex(SYSCOL[e.sys]).multiplyScalar((t >= 166.1 ? 0.62 : 0.045) * l)); }
  }
}
// S4: the current component gets a full lift, the rest of the stack drops back
function tierLift(t) {
  const order = [['bell', TIER.bell], ['ann', TIER.ann], ['dbl', TIER.vbr], ['spool', TIER.spool], ['low', TIER.low], ['ch', TIER.ch]];
  if (t < 20.2 || t > 36.8) return;
  let cur = null; for (const [k, ta] of order) if (t >= ta - 0.1) cur = k;
  for (const [k] of order) {
    if (k === 'bell' || k === 'ch') continue;
    const on = k === cur ? eout((t - (order.find(o => o[0] === k)[1] - 0.1)) / 0.4) : 0;
    for (const m of O.tierMats[k]) if (m.emissive) { if (on > 0.001) m.emissive.add(O.hc.setHex(0xa855f7).multiplyScalar(0.03 * on)); }
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
// a hydraulic pulse: the front leaves at t0 with speed v; dashes behind it ride along at the same speed until t1
function pulse(mesh, n, poly, t, t0, t1, v, sp = 0.8, scale = 1) {
  if (t < t0 || t > t1 + 0.3) return n;
  const front = Math.min(poly.L, v * (t - t0)), fade = 1 - clamp((t - t1) / 0.3);
  return arrowsAlong(mesh, n, poly, 0, front, v * (t - t0), sp, scale * fade, 260);
}
const ROTD = t => t * 1.6;
function stateRig(t, s) {
  // top drive height: normal 20.6; in S19 it lifts one stand out of the hole
  let yb = 20.6;
  const S19 = t >= 133.4 && t < 135.2;
  if (S19) yb = lerp(27.4, 31.0, eio((t - 133.6) / 1.4));
  O.topDrive.position.y = yb;
  const yB = yb + 4.6, top = yB + 0.9;
  O.tblock.position.set(0, yB, 0);
  for (const l of O.blines) { l.position.y = top; l.scale.y = Math.max(0.01, 41.2 - top); }
  const rotOn = t < 91.9 ? 1 : 0;
  O.dp.visible = !S19; O.dp.scale.y = Math.max(0.01, yb - 1.15 - 7.4); O.dp.rotation.y = ROTD(Math.min(t, 91.9)) * rotOn + (1 - rotOn) * ROTD(91.9); O.quill.rotation.y = O.dp.rotation.y;
  O.stand.visible = S19; O.slips.visible = S19 && t > 135.0; O.stub.visible = !S19 || t > 134.9;
  if (S19) placeStand(O.stand, [0, yb - 3.35 - SLEN, 0], [0, yb - 3.35, 0]);
  O.ir.position.x = 4.0;
  if (O.hoseDy !== yb) {
    const dy = yb - 20.6;
    if (O.hoseMesh) { O.hoseMesh.geometry.dispose(); O.hoseMesh.geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(HOSE_CTRL.map((p, i) => new THREE.Vector3(p[0], p[1] + dy * [0, 0, 0, 0.15, 0.25, 0.55, 0.9, 1, 1][i], p[2]))), 40, 0.16, 6); }
    O.hoseDy = yb;
  }
}
function stateLand(t, s) {
  const id = s.id;
  O.skyL.position.set(camera.position.x, 0, camera.position.z);
  const run = t < 91.9 ? 1 : 0; // rig power: generators, agitators, shakers stop when the lights go out
  O.swirl.rotation = -Math.min(t, 91.9) * 0.55;
  if (id === 1 || id === 24 || id === 25 || id === 19.2) for (const m of O.mudSurf) {
    const a = m.geometry.attributes.position, b = m.userData.base, k = m.userData.k, tt = Math.min(t, 91.9);
    for (let i = 0; i < a.array.length; i += 3) { const x = b[i], z = b[i + 2], r = Math.hypot(x, z), th = Math.atan2(z, x); a.array[i + 1] = 0.06 * Math.sin(r * 2.6 - tt * 2.4 + th * 2 + k) + 0.03 * Math.sin(x * 3.1 + tt * 3.3); }
    a.needsUpdate = true;
  }
  const tr = t < 91.9 ? t : 91.9 + 0.6 * (1 - Math.exp(-(t - 91.9) / 0.6)); // 1.5 s spin-down
  for (const a of O.agit) a.rotation.y = tr * 5.5;
  const pumpOn = t > 108.6 && t < 111.6 ? 1 : 0, th = (Math.min(t, 91.9) + (t > 108.6 ? Math.min(t, 111.6) - 108.6 : 0)) * 2 * Math.PI * 100 / 60;
  O.rods.forEach((r, k) => { r.position.x = 0.34 * Math.sin(th + k * 2.094); });
  O.wheel.rotation.z = -th;
  O.basket.position.set(12.25 + 0.018 * Math.sin(t * 47) * run, 4.55 + 0.022 * Math.sin(t * 53 + 1) * run, -2.65 + 0.018 * Math.cos(t * 41) * run);
  O.genGroups.forEach((g, i) => { g.position.y = 0.012 * Math.sin(t * 61 + i * 2) * run; });
  let n = 0;
  if (run || t < 93) O.stacks.forEach((p, i) => { for (let j = 0; j < 14; j++) { const age = fract(t / 2.6 + j / 14 + i * 0.13) * 2.6, born = t - age; if (born > 91.9) continue; setI(O.smoke, n++, p[0] + 0.7 * age + 0.15 * Math.sin(j * 3.1 + t), p[1] + 1.4 * age, p[2] + 0.35 * age, 0.16 + 0.3 * age); } });
  done(O.smoke, n);
  done(O.shCut, 0); done(O.shDrip, 0);
  O.arrows.count = 0; O.arrows.instanceMatrix.needsUpdate = true;
  stateRig(t, s);
  O.cp.update(t, { omega: 14 * run, open: 0 });
  O.sm.update(t, { spp: 0.62 * run, wheelA: 1 });
  for (const a of [O.dg, O.dsn, O.dsl, O.cf]) a.update(t, { open: 0 });
  O.fp.update(t, { flow: run });
  // ---- rig lights (L-10): on until 91.9 (one-frame flicker, 0.12 s decay), off after
  const fl = t < 91.9 ? 1 : t < 91.9 + 1 / 30 ? 0.35 : t < 91.97 ? 0.8 : Math.exp(-(t - 91.97) / 0.04) * 0.8;
  const lit = fl > 0.02;
  O.lgMesh.material.color.setHex(0xfff3c4).lerp(O.hc.setHex(0x1f2937), 1 - fl);
  O.dogWin.material.color.setHex(0xffe9b0).lerp(O.hc.setHex(0x2a3442), 1 - fl);
  O.floodM.color.setHex(0xfff6d8).lerp(O.hc.setHex(0x1f2937), 1 - fl);
  O.poolM.opacity = 0.22 * fl; for (const p of O.pools) p.visible = lit;
  // ---- section trench: closed before 16.0; the earth drops away 16.0-16.6; closed again for the aerials
  const open = id >= 24 ? 0 : id === 1 ? 0 : eio((t - 16.0) / 0.6);
  const Y = lerp(-3.0, 0.02, open);
  O.trenchY.constant = -Y; O.linerTop.constant = Y; O.terrZ.constant = open > 0.001 ? lerp(-3.2, -24, open) : -3.2; O.trench.visible = open > 0.001;
  O.cellarWallS.visible = true;
  O.crew.visible = t > 13.0 && t < 37; O.crew.rotation.y = -1.9 + 0.35 * eio((t - 17.4) / 0.8) + 0.02 * Math.sin(t * 1.6);
  stateWC(t, s);
}
// ---------------------------------------------------------------- well-control equipment states (L)
const HCR = t => { // closed until 102.6, open 103.8-105.0, closed 105.6-105.9, open from 106.5
  if (t < 102.6) return 0; if (t < 103.8) return ramU(t, 102.6, 103.8);
  if (t < 105.0) return 1; if (t < 105.6) return 1 - ramU(t, 105.0, 105.6);
  if (t < 105.9) return 0; if (t < 106.5) return ramU(t, 105.9, 106.5); return 1;
};
function vbrState(t) { // upper pipe ram (VBR) in the land stack
  if (t < 94.3) return 0; if (t < 160.4 && t >= 94.3) { if (t < 152.1) return ramU(t, 94.3, 94.9); }
  if (t >= 152.1 && t < 160.4) return 0;
  if (t < 163.4) return ramU(t, 160.4, 161.0);
  if (t < 164.6) return 1 - ramU(t, 163.6, 164.2);
  return ramU(t, 164.8, 165.4);
}
function stateWC(t, s) {
  const id = s.id, st = O.stack;
  { const k = DARK(t) ? 0.6 : 0.78; for (const [c, b] of O.capMats) c.copy(b).multiplyScalar(k); }
  // stack: cut-away (x-ray) in the trench shots that show the rams working
  const cutOn = id === 13.3 ? 1 : id === 15 ? eio((t - 107.0) / 0.6) : id === 23 || id === 23.3 ? 1 : 0;
  st.api.setCut(cutOn);
  st.visible = id !== 22 || t < 152.9;
  if (id === 22) st.position.y = STACK_Y + 1.0 * eio((t - 152.2) / 0.7); else st.position.y = STACK_Y;
  if (id === 22) st.api.refreshCut();
  const vb = vbrState(t);
  st.api.setUpperRam(vb); st.api.setBSR(0); st.api.setLowerRam(0); st.api.setAnnular(id === 23.3 ? 0.6 * (sstep(164.0, 164.6, t) - sstep(165.2, 165.8, t)) : 0);
  st.position.x = shudder(t, 94.9, 0.0006) + shudder(t, 161.0, 0.0006);
  st.api.setChokeManual(t < 100.4 ? 0.9 : t < 101.5 ? lerp(0.9, 1.0, (t - 100.4) / 1.1) : 1 - 0.02 * eout((t - 101.5) / 0.2));
  st.api.setChokeHCR(HCR(t)); st.api.setKillManual(1);
  // test plug (S23): run down through the open stack, lands at 160.2
  O.tplug.visible = id === 23 || id === 23.3;
  if (O.tplug.visible) { O.tplug.api.setDrop(t < 160.2 ? 0.9 * (1 - eout((t - 159.4) / 0.8)) : 0); O.tplug.api.setSeal(sstep(160.2, 160.5, t)); }
  // accumulator unit: gauges, 4-way handle, bottle cut + charge (Boyle)
  const acc = O.acc;
  acc.api.setBottleCut(id === 12 || id === 13.2 ? 1 : 0);
  let charge;
  if (t < 86.5) charge = 0; else if (t < 89.8) charge = (t - 86.5) / 3.3; else charge = 1;
  if (id === 13.2 || t > 92.75) charge = 1 - 0.35 * eout((t - 92.75) / 0.6);
  acc.api.setCharge(clamp(charge));
  const P = c => 1000 / (1 - 0.6667 * c); // N2 at 1,000 psi precharge, V falls linearly: P = 1000 / V
  const accPsi = t < 84.6 ? 3000 : t < 85.0 ? 0 : t < 86.5 ? needle(t, [[0, 0], [85.0, 1000]]) : t < 89.8 ? P(charge) * (1 + 0.004 * Math.sin(t * 2 * Math.PI * 3.3)) : t < 92.75 ? needle(t, [[0, 3000], [89.8, 3000]]) + 90 * Math.exp(-(t - 89.8) * 6) * Math.sin((t - 89.8) * 18) : needle(t, [[0, 3000], [92.75, 2150]]);
  acc.api.setPsi(0, id === 11 ? 3000 : accPsi);
  acc.api.setPsi(1, t < 90.0 && (id === 12) ? 0 : needle(t, [[0, 0], [90.0, 1500]]));
  acc.api.setPsi(2, 1200);
  acc.api.setValve(1, t < 80.6 ? 1 : 1 - eout((t - 80.6) / 0.25));
  acc.api.setPumpLamp(t > 86.5 && t < 89.8 ? 1 : 0);
  acc.api.setMotor(t < 86.5 ? 0.3 * t : t < 89.8 ? 0.3 * 86.5 + 40 * (t - 86.5) : 0.3 * 86.5 + 40 * 3.3 + 24 * (1 - Math.exp(-(t - 89.8) / 0.6)));
  // driller's panel: two-hand press (MASTER 77.8, upper pipe close 78.1)
  const dp = O.dpanel;
  const pr = (t0) => sstep(t0, t0 + 0.06, t) * (1 - sstep(t0 + 0.5, t0 + 0.6, t));
  dp.api.setPress('master', pr(77.8)); dp.api.setPress('upperPipe.close', pr(78.1));
  dp.api.setLamp('upperPipe.open', t < 78.15 ? 1 : 0); dp.api.setLamp('upperPipe.close', t < 78.15 ? 0 : 1);
  dp.api.setLamp('annular.open', 1); dp.api.setLamp('blindShear.open', 1); dp.api.setLamp('lowerPipe.open', 1); dp.api.setLamp('chokeHCR.close', 1); dp.api.setLamp('killHCR.close', 1);
  dp.api.setGuard(0);
  const hv = false; // (low-poly gloves read as blocks: the press reads from the button travel + lamps)
  O.handL.visible = O.handR.visible = hv;
  if (hv) {
    const ma = wa(dp, 'master'), up = wa(dp, 'upperPipe.close');
    const inL = eout((t - 77.6) / 0.25) - 0.0, pl = pr(77.8), pR = pr(78.1);
    O.handL.position.set(ma[0], ma[1] + 0.01, ma[2] - 0.12 + 0.07 * inL + 0.012 * pl); O.handL.rotation.set(-0.3, Math.PI, 0);
    O.handR.position.set(up[0], up[1] + 0.01, up[2] - 0.14 + 0.08 * eout((t - 77.75) / 0.3) + 0.012 * pR); O.handR.rotation.set(-0.3, Math.PI, 0);
  }
  // remote choke panel (S16b): small corrections, choke position replays 60 -> 25 %
  const cp = O.cpanel;
  cp.api.setDP(needle(t, [[0, 0.3], [116.4, 0.32], [117.3, 0.31], [118.2, 0.315]]) + 0.002 * Math.sin(t * 9));
  cp.api.setCasing(needle(t, [[0, 0.45], [116.6, 0.44], [117.6, 0.445]]) + 0.002 * Math.sin(t * 7 + 1));
  cp.api.setChokePos(lerp(0.6, 0.25, eio((t - 116.4) / 1.6)));
  cp.api.setLever(t < 116.4 ? 0.5 : t < 117.2 ? 0.2 : 0.2 + 0.3 * eout((t - 117.2) / 0.3));
  cp.api.setCounter(30, Math.floor(1240 + Math.max(0, t - 112) * 0.5)); cp.api.setPumpLamp(1);
  // choke manifold (S16): choke A trim cut-away, needle advances in 3 steps
  const man = O.man;
  man.api.setChokeCut(0);
  let ch = 0.6; for (const [a, b] of [[114.4, 0.48], [114.9, 0.36], [115.4, 0.25]]) if (t > a) ch = lerp(ch, b, eio((t - a) / 0.3));
  man.api.setChokeA(ch); man.api.setChokeB(0.0);
  if (false) { const zA = wa(man, 'trimA')[2], k = eout((t - 113.6) / 0.4); O.chokePlane.set(O.v3b.set(0, 0, -1), zA + 0.25 * (1 - k)); }
  // MGS: oblique window in S17 (stencil stays), mud-leg section in S18
  const mg = O.mgs;
  const cutM = id === 17 ? eout((t - 119.4) / 0.6) : id === 18 ? 1 : 0;
  mg.api.setCut(cutM);
  mg.api.setLevel(id === 18 ? 0.85 - 0.18 * (eio((t - 128.0) / 1.2) - eio((t - 131.6) / 1.0)) : 0.85);
  mg.api.setLegLevel(1); mg.api.setGauge(clamp(0.22 + 0.02 * Math.sin(t * 7.3) + 0.015 * Math.sin(t * 13.1), 0, 0.45));
  if (cutM > 0 && O.mgsPlane) {
    const ang = id === 17 ? 32.5 * Math.PI / 180 : null;
    let n;
    if (id === 17) n = new THREE.Vector3(-Math.sin(ang), 0, -Math.cos(ang));
    else { n = new THREE.Vector3(-1, 0, 0).applyQuaternion(mg.quaternion); }
    const C = O.v3b.set(MGS_POS[0], 0, MGS_POS[2]), ext = lerp(1.2, 0, eio(cutM));
    O.mgsPlane.set(n, -n.dot(C) + ext);
  }
  // trip tank: one step down as the hole is filled (S19b)
  O.trip.api.setCut(0);
  O.trip.api.setLevel(0.62 - 0.1 * eio((t - 136.2) / 1.0) + 0.006 * Math.sin((t - 136.2) * 9) * Math.exp(-Math.max(0, t - 137.2) * 3) * (t > 137.2 ? 1 : 0));
  // FOSV: always open
  O.fosv.api.setClose(0); O.fosv.api.setWrenchIn(0); O.fosv.api.setCut(0);
  // chart recorder (S23b): low test, bleed, high test, hold, bleed off
  const u = clamp((t - 160.6) / (163.3 - 160.6));
  O.rec.api.setTrace(t < 160.6 ? 0 : u);
  // diverter stage (S22)
  O.div.visible = id === 22 && t > 152.4;
  if (O.div.visible) { O.div.api.setVent('L', eout((t - 154.9) / 0.4)); O.div.api.setVent('R', 0); O.div.api.setClose(eio((t - 155.1) / 0.8)); }
  // flare: pilot until 123.4, then a steady flame (rule 8), leaning 15 deg downwind (-x)
  const fgrow = 0.25 + 0.75 * eout((t - 123.4) / 0.6);
  O.flare.visible = true;
  O.flames.forEach((m, i) => {
    const ph = hash(i, 91) * 6.283, hh = 1 + 0.10 * (Math.sin(1.7 * t * 2 * Math.PI + ph) + 0.6 * Math.sin(3.1 * t * 2 * Math.PI + ph * 1.3) + 0.35 * Math.sin(5.3 * t * 2 * Math.PI + ph * 0.7)) / 1.95;
    m.scale.set(fgrow * (0.85 + 0.15 * hh), fgrow * hh * (1 - (i % 3) * 0.12), fgrow * (0.85 + 0.15 * hh));
    m.rotation.z = 0.26 + 0.04 * Math.sin(t * 2.3 + i);
    m.position.set(-0.05 * (i % 3), 0, 0.05 * Math.sin(i * 2.1));
  });
  O.flameM.forEach((m, i) => { m.opacity = [0.55, 0.6, 0.8][i]; });
  O.flareGlow.material.opacity = 0.16 * fgrow * (1 + 0.08 * Math.sin(t * 9.1));
  // wind sock (points -x: wind blows +x -> -x)
  O.sockCone.forEach((m, k) => { m.rotation.y = 0.05 * Math.sin(t * 3.1 + k * 0.8) * k; m.position.y = -0.03 * k * k + 0.02 * Math.sin(t * 4 + k); });
  // ---- dashes: hydraulic pulses (purple) and the command signal; bubbles; mud arrows; gas streaks; plume
  let nd = 0, nc = 0;
  if (id === 11) nc = pulse(O.cmdDash, nc, O.pCMD, t, 78.3, 80.6, 15, 1.4, 1);
  if (id === 13.2) nd = pulse(O.dash, nd, O.pHOSE, t, 92.8, 93.6, 12, 0.9, 1.3);
  if (id === 13.3) for (const h of O.bonHoses) if (h.cav === 'vbr') nd = pulse(O.dash, nd, h.poly, t, 93.7, 94.6, 12, 0.35, 0.55);
  if (id === 23.3) for (const h of O.bonHoses) if (h.cav === 'vbr') { nd = pulse(O.dash, nd, h.poly, t, 163.4, 163.9, 10, 0.35, 0.55); nd = pulse(O.dash, nd, h.poly, t, 164.6, 165.1, 10, 0.35, 0.55); }
  done(O.dash, nd); done(O.cmdDash, nc);
  // gas bubbles in the choke line (S14-S16), into the MGS (S17-S18)
  let nb = 0;
  const bub = (x, y, z, r) => { setI(O.bubL.core, nb, x, y, z, r); setI(O.bubL.rim, nb, x, y, z, r); nb++; };
  if (id === 14 || id === 15) {
    const open = id === 14 ? t > 103.8 : HCR(t) > 0.95;
    if (open) for (let i = 0; i < 10; i++) { const s0 = fract(hash(i, 5) + (t - 103.8) * 0.25) * 2.6; if (id === 14 && s0 > (t - 103.8) * 0.8) continue; O.pCHK.at(s0, O.v3); bub(O.v3.x, O.v3.y + 0.012 * Math.sin(t * 25 + i), O.v3.z, 0.022 * (0.8 + 0.4 * hash(i, 6))); }
  }
  if (id === 16) for (let i = 0; i < 28; i++) {
    const s0 = fract(hash(i, 7) + t * 0.32) * O.pCHK.L; if (t < 113.4 && s0 > (t - 111.8) * 3.5 + 6) continue;
    O.pCHK.at(s0, O.v3); bub(O.v3.x, O.v3.y + 0.015 * Math.sin(t * 22 + i), O.v3.z, 0.028 * (0.8 + 0.4 * hash(i, 8)));
  }
  if (id === 17 || id === 18) { // inside the vessel: bubbles rise in the liquid, burst at the surface; slugs at the inlet
    const C = MGS_POS, lv = id === 18 ? 2.65 : 2.65;
    for (let i = 0; i < 70; i++) {
      const life = 1.1 + hash(i, 11) * 0.9, age = fract(t / life + hash(i, 12)) * life, r0 = 0.02 + 0.03 * hash(i, 13);
      const a = hash(i, 14) * 6.283, rr = 0.15 + 0.4 * hash(i, 15);
      const y = 0.95 + age * 1.6 * Math.sqrt(r0 / 0.035); if (y > lv) continue;
      const wob = 0.1 * r0 * Math.sin(t * 2 * Math.PI * (3 + hash(i, 16) * 2));
      bub(C[0] + Math.cos(a) * rr + wob, y, C[2] + Math.sin(a) * rr, 0.7 * r0 * (1 + 0.6 * (y - 0.95) / 1.7));
    }
  }
  done(O.bubL.core, nb); done(O.bubL.rim, nb);
  // mud arrows: kill line (S15), MGS liquid out (S17 end), trip-tank fill
  let na = 0;
  if (id === 15 && t > 108.6) { const pulseK = 0.75 + 0.25 * Math.abs(Math.sin((t - 108.6) * Math.PI * 5)); na = arrowsAlong(O.mudArr, na, O.pKILL, Math.max(0, O.pKILL.L - (t - 108.6) * 4), O.pKILL.L, (t - 108.6) * 1.4 * pulseK + t * 0.4, 0.4, 0.9, 120); }
  if ((id === 17 && t > 124.7) || id === 18) na = arrowsAlong(O.mudArr, na, O.pMGSR, 0, Math.min(O.pMGSR.L, (t - 124.7) * 3), t * 1.2, 0.6, 1.6, 120);
  done(O.mudArr, na);
  // gas streaks up the vent (S17 122.4-124.2, S18 130.0-131.6)
  let ng = 0;
  if ((id === 17 && t > 122.4) || (id === 18 && t > 130.0 && t < 131.8)) {
    const vb = wa(O.mgs, 'ventBase'), vt = wa(O.mgs, 'ventTop');
    for (let i = 0; i < 24; i++) { const u = fract(hash(i, 21) + t * 0.55); if (id === 17 && u * 9 > (t - 122.4) * 7) continue; setI(O.gasStreak, ng++, vb[0] + 0.04 * Math.sin(i * 2.3), lerp(vb[1], vt[1], u), vb[2] + 0.04 * Math.cos(i * 1.7), 1, 1); }
  }
  done(O.gasStreak, ng);
  // diverter plume downwind (-x) from the line-A end
  let np = 0;
  if (id === 22 && t > 155.4) { const e = wa(O.div, 'ventEndL'); for (let i = 0; i < 50; i++) { const age = fract(hash(i, 31) + t * 0.35) * 3.0; if (t - age < 155.4 + (i % 5) * 0.1) continue; setI(O.plume, np++, e[0] - 1.6 * age - 0.4 * Math.sin(i), e[1] + 0.45 * age + 0.2 * hash(i, 32), e[2] + (hash(i, 33) - 0.5) * age * 0.9, 0.25 + 0.4 * age); } }
  done(O.plume, np);
  done(O.drops, 0);
  // the hand on the manual choke valve (S14)
  O.handV.visible = false;
  if (O.handV.visible) { const c = wa(st, 'chokeManual'); const a = (t < 101.5 ? (t - 100.4) * 1.1 : 1.21 - 0.25 * eout((t - 101.5) / 0.2)) * 2 * Math.PI; O.handV.position.set(c[0] + 0.0 + 0.2 * Math.cos(a), c[1] + 0.2 * Math.sin(a), c[2] - 0.45); O.handV.rotation.set(0, Math.PI, a); }
  // ghost / memory look for S22: hide the bits that would clutter the aerial
  O.trip.visible = true;
}
// ---------------------------------------------------------------- studio
function stateStudio(t, s) {
  for (const k in O.sGroups) O.sGroups[k].visible = k === s.sub;
  const sub = s.sub;
  if (sub === 'ANN') {
    const a = O.sANN.api; a.setCut(1);
    let tgt = 'pipe', u = 0, py = null;
    if (t < 42.2) { u = annU(t, 38.4, 40.4) * (1 - ein((t - 41.6) / 0.6)); tgt = 'pipe'; }
    else if (t < 43.9) { tgt = 'hex'; u = annU(t, 42.4, 43.4); }
    else if (t < 46.4) { tgt = 'open'; u = t < 44.4 ? 0 : annU(t, 44.4, 46.0); }
    else { tgt = 'pipe'; py = lerp(1.15, 0.38, clamp((t - 46.6) / 3.2)); const joint = Math.exp(-Math.pow((py - 0.7) / 0.09, 2)); u = 0.8 - 0.06 * joint; }
    a.setTarget(tgt); a.setClose(u); if (py != null) a.setPropY(py); else a.setPropY(null);
  }
  if (sub === 'RAM') {
    const a = O.sRAM.api;
    // index 0 = VBR (lower cavity), 1 = 5 in pipe ram (upper cavity)
    const upper = t < 56.3 ? ramU(t, 50.7, 52.6) : t < 56.8 ? 1 - ramU(t, 56.3, 56.8) : 0;
    const vbr = t < 56.7 ? 0 : ramU(t, 56.7, 58.3);
    a.setClose(1, upper); a.setClose(0, vbr); a.setPipeR(0, 0.0445);
    a.setLock(0, t < 59.8 ? 0.78 : t < 61.2 ? lerp(0.78, 1.0, (t - 59.8) / 1.4) : 1);
    const pipe5 = O.sRAM.parts.pipe; if (pipe5) pipe5.visible = t < 56.45 && s.id !== 9;
    O.ghost35.material.opacity = s.id === 9 ? 0 : t > 56.3 ? clamp((t - 56.3) / 0.3) : t > 55.0 && t < 56.2 ? 0.4 * pulseIn(t, 55.0, 56.2) : 0;
    O.ghost35.material.depthWrite = t > 56.3; O.ghost35.visible = O.ghost35.material.opacity > 0.01;
    O.ghost35.position.y = 0.75 + (t > 63.7 ? 0 : 0);
    if (s.id === 9) O.ghost35.visible = false;
    O.sRAM.position.x = SLOT.RAM[0] + shudder(t, 52.6, 0.0006) + shudder(t, 58.3, 0.0006);
    // section: horizontal through the upper cavity for the plan view, rotating to the vertical half-section in the orbit
    a.setCut(1);
    if (O.ramPlane) {
      const ry = 1.17 + 0.02;
      const k = t < 58.6 ? 0 : eio((t - 58.6) / 1.0); // 0 = horizontal (keep y <= ry), 1 = vertical (keep z <= 0)
      const ang = k * Math.PI / 2, n = new THREE.Vector3(0, -Math.cos(ang), -Math.sin(ang));
      const Cw = O.v3b.set(OFF.S[0] + SLOT.RAM[0], ry, OFF.S[2] + SLOT.RAM[2]);
      O.ramPlane.set(n, -n.dot(Cw));
    }
    // S9: pressure disc + force arrow under the closed VBR rams
    const s9 = s.id === 9;
    O.pDisc.visible = s9 && t > 64.2; O.pDisc.position.y = 0.46; const f = eout((t - 64.2) / 1.0); O.pDisc.scale.setScalar(Math.max(0.01, f));
    O.pArrow.visible = s9 && t > 68.2; const g = eio((t - 68.2) / 0.8);
    O.pArrow.position.set(0, 0.05, 0.02); O.pArrow.children[0].scale.y = O.pArrow.children[1].scale.y = Math.max(0.01, 0.36 * g); O.pHead.position.y = 0.36 * g; O.pArrow.children[0].position.y = 0;
    let nu = 0; if (s9 && t > 66.0) { const e = eout((t - 66.0) / 0.8); for (let i = 0; i < 6; i++) { const aa = i / 6 * 6.283 + 0.3; setI(O.upArr, nu++, Math.cos(aa) * 0.12, 0.36 + 0.04 * e, Math.sin(aa) * 0.12, e); } }
    if (s.id === 8 && t > 62.2) { const e = eout((t - 62.2) / 0.6); for (let i = 0; i < 6; i++) { const aa = i / 6 * 6.283 + 0.3; setI(O.upArr, nu++, Math.cos(aa) * 0.12, 0.34 + 0.04 * e, Math.sin(aa) * 0.12, e); } }
    done(O.upArr, nu);
  }
  if (sub === 'BSR') {
    const a = O.sBSR.api; a.setCut(1);
    // 71.2-72.5 travel, 72.5-73.5 crush at 30 %, 73.6 fracture, 74.0-74.8 seal; 75.0-75.3 dip: reset with a tool joint
    let u;
    if (t < 75.15) {
      if (t < 71.2) u = 0; else if (t < 72.5) u = lerp(0, 0.42, ramU(t, 71.2, 72.5)); else if (t < 73.55) u = lerp(0.42, 0.565, (t - 72.5) / 1.05);
      else if (t < 73.62) u = lerp(0.565, 0.62, (t - 73.55) / 0.07); else u = lerp(0.62, 1.0, ramU(t, 74.0, 74.8) ) * (t < 74.0 ? 0 : 1) + (t < 74.0 ? 0.62 : 0);
    } else u = 0;
    a.setShear(u); a.setSparks(false);
    const tj = t > 75.15;
    for (const k of ['pipeUpper', 'pipeLower']) if (O.sBSR.parts[k]) O.sBSR.parts[k].visible = !tj;
    O.bsrTJ.visible = tj; O.bsrTJ.position.y = 0.62 + (tj ? 1.0 * eio((t - 76.0) / 0.9) * 0.6 : 0) - 0.1;
    O.sBSR.position.y = shudder(t, 74.8, 0.0006);
    // sparks: 48 streaks along the blade edges in the cut plane, gravity 9.8 m/s2
    let ns = 0; const sy = 0.64;
    if (t > 73.58 && t < 74.1) for (let i = 0; i < 48; i++) {
      const life = 0.18 + 0.27 * hash(i, 41), age = t - 73.58 - hash(i, 42) * 0.06; if (age < 0 || age > life) continue;
      const side = i % 2 ? 1 : -1, ang = (hash(i, 43) - 0.5) * 0.9, sp = 1.4 + 1.6 * hash(i, 44);
      const vx = side * Math.cos(ang) * sp, vy = Math.sin(ang) * sp + 0.6, vz = 0.25 + 0.6 * hash(i, 45);
      const x = vx * age, y = sy + vy * age - 4.9 * age * age, z = 0.02 + vz * age;
      O.m4.compose(O.v3.set(side * 0.06 + x, y, z), O.q.setFromUnitVectors(new THREE.Vector3(0, 0, 1), O.tan.set(vx, vy - 9.8 * age, vz).normalize()), O.scl.set(1, 1, 1 + 2 * sp * (1 - age / life)));
      O.spark.setMatrixAt(ns, O.m4);
      const k = age / life; O.col.setHex(k < 0.25 ? 0xffffff : k < 0.5 ? 0xffd27a : k < 0.8 ? 0xff6a00 : 0x5a1a00).toArray(O.spark.instanceColor.array, ns * 3); ns++;
    }
    done(O.spark, ns);
    let nch = 0; if (t > 73.6 && t < 75.0) for (let i = 0; i < 6; i++) { const age = t - 73.6, side = i % 2 ? 1 : -1; setI(O.chips, nch++, side * (0.05 + 0.5 * age * (0.6 + hash(i, 51))), Math.max(0.25, sy + 0.4 * age - 4.9 * age * age), 0.05 + 0.2 * age * hash(i, 52), 1); }
    done(O.chips, nch);
  }
  if (sub === 'IBOP') {
    const a = O.sIBOP.api; a.setCut(1);
    a.setUpper(t < 141.6 ? 0 : t < 142.6 ? ramU(t, 141.6, 142.6) : 1); a.setLower(0);
    O.wrench.visible = t > 143.4; const so = wa(O.sIBOP, 'socket'), base = addV(OFF.S, SLOT.IBOP);
    const e = eout((t - 143.4) / 0.4); O.wrench.position.set(so[0] - base[0] + 0.25 * (1 - e), so[1] - base[1], so[2] - base[2] + 0.02 + 0.15 * (1 - e));
  }
}
// ---------------------------------------------------------------- well cut-away (W)
function stateWellP5(t, s) {
  stateWell(t);
  const id = s.id;
  O.casingG.visible = id === 26;
  for (const k of ['mudW', 'cutW', 'chipsW']) O[k].count = id === 2 ? O[k].count : 0;
  O.dsRot.rotation.y = 0; O.bit.rotation.y = 0;
  O.jetM.opacity = 0;
  // S2: mud column brightens bottom-up (barrier), the BOP proxy lights purple; the EP04 ghost bubble
  const fill = sstep(8.7, 9.6, t);
  O.mudTint.material.opacity = id === 2 ? lerp(0.42, 0.72, fill) : 0.42;
  O.mudTint.material.color.setHex(0x8a5a2e).lerp(O.hc.setHex(0xc8925a), fill * 0.6);
  const g = id === 2 ? sstep(6.6, 7.0, t) * (1 - sstep(7.2, 7.6, t)) * 0.6 : 0;
  O.wGhost.material.opacity = g; O.wGhostRim.material.opacity = g;
  O.wGhost.position.y = O.wGhostRim.position.y = -36 + clamp((t - 6.6) / 1.0);
  const px = eout((t - 10.8) / 0.5) * (id === 2 ? 1 : 0);
  O.wBOP.visible = id === 2 || id === 21.2;
  O.wBOP.traverse(m => { if (m.isMesh && m.material && m.material.emissive) { m.material.emissive.setHex(0xa855f7).multiplyScalar(0.12 * px); } });
  // S21: float valve flapper (down-flow holds it open; back-flow slams it shut at 150.4)
  O.wFloat.visible = id === 21.3 || id === 21.2;
  O.wFloat.api.setCut(1);
  const flap = t < 150.4 ? 0 : clamp((t - 150.4) / 0.12) - 0.03 * Math.sin(clamp((t - 150.52) / 0.07) * Math.PI);
  O.wFloat.api.setFlap(clamp(flap, 0, 1));
  let n = 0;
  if (id === 21.3) {
    const yS = YBT + 0.3 + 0.45 * 7;
    if (t < 150.3) for (let i = 0; i < 6; i++) { const y = yS + 1.8 - fract(i / 6 + t * 0.9) * 2.6; setI(O.wArr, n++, 0, y, 0.15, 1); O.wArr.setMatrixAt(n - 1, O.m4.compose(O.v3.set(0, y, 0.15), O.q.setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI), O.scl.set(1, 1, 1))); }
    else for (let i = 0; i < 5; i++) { const y = YBT + 0.3 + fract(i / 5 + t * 0.9) * 2.4; if (y > yS - 0.2) continue; setI(O.wArr, n++, 0, y, 0.15, 1); }
  }
  done(O.wArr, n);
  let nb = 0;
  if (id === 21.3 && t > 150.4) { const y = Math.min(YBT + 0.4 + (t - 150.4) * 2.0, YBT + 0.3 + 0.45 * 7 - 0.5); setI(O.wBub.core, 0, 0.05, y, 0.2, 0.12); setI(O.wBub.rim, 0, 0.05, y, 0.2, 0.12); nb = 1; }
  done(O.wBub.core, nb); done(O.wBub.rim, nb);
  // S26: casing strings reveal outer -> inner, cement fills from the shoes up
  if (id === 26) {
    O.casings.forEach((m, i) => { m.material.opacity = eout((t - 177.6 - Math.floor(i / 3) * 0.12) / 0.4); m.visible = m.material.opacity > 0.01; });
    O.cements.forEach((m, i) => { const h = Math.max(0.01, (m.userData.top - m.userData.y0) * eio((t - 179.6) / 1.8)); m.scale.y = h; m.visible = t > 179.6 && i < 3; });
  }
}
function placeCamV(v, vo) {
  camera.position.set(v[0], v[1], v[2]); camera.up.set(0, 1, 0); camera.lookAt(v[3], v[4], v[5]);
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
  else if (s.set === 'W') stateWellP5(t, s);
  else stateStudio(t, s);
  if (s.set === 'L') { applyHighlight(t, s.id); tierLift(t); }
  scene.updateMatrixWorld();
}
function renderFrame(t) {
  applyState(t);
  env(O.shot.set, t);
  const v = O.shot.v;
  LOOK.frame(O.shot.set, camera, O.v3b.set(v[3], v[4], v[5]));
  LOOK.render(scene, camera);
}

// ================================================================ overlay (2D) — "Field Manual" kit (overlay_kit.js)
const WC = KIT.SYS.wc, KC = KIT.C, MUDC = '#c8925a';
const clean = s => String(s).replace(/ · /g, ', ');
function proj(p) {
  const v = O.v3b.set(p[0], p[1], p[2]).project(camera);
  return { x: (v.x + 1) / 2 * W, y: (1 - v.y) / 2 * H, ok: v.z < 1 && v.z > -1 };
}
const inSlot = (k, p) => addV(addV(OFF.S, SLOT[k]), p);
const inW = p => addV(OFF.W, p);
function co(ctx, t, t0, t1, P, x, y, label, sub = '', o = {}) {
  if (t < t0 || t > t1 || !P) return;
  const s = proj(P); if (!s.ok) return;
  KIT.callout(ctx, t, { t0, t1, ax: s.x, ay: s.y, x, y, label, sub, color: o.color || WC, align: o.align || 'left', n: o.n ?? null, size: o.size || 32 });
}
function cased(ctx, fn, lw = 3, casing = 8) {
  ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.strokeStyle = KIT.hexA(KC.paper, 0.95); ctx.lineWidth = casing; fn(); ctx.stroke();
  ctx.strokeStyle = KC.ink; ctx.lineWidth = lw; fn(); ctx.stroke();
  ctx.restore();
}
// ---- fact card: lines reveal at given times (lineAt), optional note (noteAt), x / width per layout zone
function card(ctx, t, o) {
  const { t0, t1, title, color = WC, top = 252, x = 60, w = 900, lineAt = null, noteAt = null, note = '' } = o;
  const lines = (o.lines || []).map(clean);
  const e = KIT.env(t, t0, t1, 0.45, 0.3); if (!e.live || e.a <= 0) return;
  const pad = 40, lh = 58, n = lines.length, headH = 66;
  const colW = w - pad * 2, noteH = note ? 70 : 0;
  const h = 8 + pad + headH + (n ? 22 + n * lh : 0) + noteH + pad - 8;
  ctx.save(); ctx.globalAlpha = e.a; ctx.translate(0, (1 - e.i) * 24 + e.o * 12);
  KIT.sheet(ctx, x, top, w, h, { band: color });
  const hy = top + 8 + pad;
  KIT.text(ctx, title, x + pad, hy + 30, { w: 600, size: 46, color: KC.ink, maxW: colW });
  if (n) { ctx.fillStyle = KC.rule; ctx.fillRect(x + pad, hy + headH + 5, colW, 2); }
  for (let i = 0; i < n; i++) {
    const lt = lineAt ? lineAt[i] : t0 + 0.5 + i * 0.8, u = KIT.eout((t - lt) / 0.35); if (u <= 0) continue;
    const ly = hy + headH + 22 + i * lh + lh / 2;
    ctx.save(); ctx.globalAlpha *= u;
    if (o.glyph && o.glyph[i]) glyph(ctx, o.glyph[i], x + pad + 10, ly, 26); else { ctx.fillStyle = KC.ink; ctx.fillRect(x + pad, ly - 1.5, 16, 3); }
    let str = lines[i];
    if (o.count && o.count.line === i) { const k = KIT.eout((t - o.count.t) / o.count.dur); str = str.replace(o.count.token, KIT.fmtNum(Math.round(o.count.value * k / 10) * 10)); }
    KIT.text(ctx, str, x + pad + 32 + (1 - u) * 8, ly + 1, { w: 400, size: 34, color: KC.ink, maxW: colW - 32 });
    ctx.restore();
  }
  if (note) {
    const u = KIT.eout((t - (noteAt ?? t0 + 0.5 + n * 0.8)) / 0.35);
    if (u > 0) { const ny = top + h - pad - 24; ctx.save(); ctx.globalAlpha *= u; ctx.fillStyle = KC.rule; ctx.fillRect(x + pad, ny - 34, colW, 1.5); KIT.text(ctx, clean(note), x + pad, ny, { w: 400, size: 26, color: KC.ink2, maxW: colW }); ctx.restore(); }
  }
  ctx.restore();
}
// small line glyphs (ink): cross, check, calendar, wrench
function glyph(ctx, k, x, y, s, a = 1) {
  ctx.save(); ctx.globalAlpha *= a; ctx.strokeStyle = KC.ink; ctx.lineWidth = Math.max(2.5, s * 0.11); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath();
  if (k === 'cross') { ctx.moveTo(x - s / 2, y - s / 2); ctx.lineTo(x + s / 2, y + s / 2); ctx.moveTo(x + s / 2, y - s / 2); ctx.lineTo(x - s / 2, y + s / 2); }
  else if (k === 'check') { ctx.moveTo(x - s / 2, y); ctx.lineTo(x - s / 6, y + s / 3); ctx.lineTo(x + s / 2, y - s / 2.5); }
  else if (k === 'calendar') { ctx.rect(x - s / 2, y - s / 2.4, s, s * 0.85); ctx.moveTo(x - s / 2, y - s / 6); ctx.lineTo(x + s / 2, y - s / 6); ctx.moveTo(x - s / 4, y - s / 1.8); ctx.lineTo(x - s / 4, y - s / 3); ctx.moveTo(x + s / 4, y - s / 1.8); ctx.lineTo(x + s / 4, y - s / 3); }
  ctx.stroke(); ctx.restore();
}
// a stroke that draws on (check / cross) — u 0..1
function drawOn(ctx, k, x, y, s, u, a = 1) {
  if (u <= 0) return;
  ctx.save(); ctx.globalAlpha *= a;
  ctx.beginPath(); ctx.rect(x - s, y - s, 2 * s * clamp(u), 2 * s); ctx.clip();
  ctx.save(); ctx.strokeStyle = KIT.hexA(KC.paper, 0.95); ctx.lineWidth = s * 0.3; ctx.lineCap = 'round'; ctx.beginPath();
  if (k === 'check') { ctx.moveTo(x - s / 2, y); ctx.lineTo(x - s / 6, y + s / 3); ctx.lineTo(x + s / 2, y - s / 2.5); } else { ctx.moveTo(x - s / 2, y - s / 2); ctx.lineTo(x + s / 2, y + s / 2); ctx.moveTo(x + s / 2, y - s / 2); ctx.lineTo(x - s / 2, y + s / 2); }
  ctx.stroke(); ctx.restore();
  glyph(ctx, k, x, y, s);
  ctx.restore();
}
// ---- diagram card: BOP Stack top -> bottom, rows reveal at the tier times
const TIERS = [['Annular Preventer', '5,000 psi', TIER.ann], ['Upper Pipe Ram (VBR)', 'Double Ram, ช่องบน', TIER.vbr], ['Blind Shear Ram', 'Double Ram, ช่องล่าง', TIER.bsr],
  ['Drilling Spool', 'Choke ⟷ Kill outlets', TIER.spool], ['Lower Pipe Ram', 'Single Ram', TIER.low], ['Casing Head', 'Wellhead', TIER.ch]];
function diagramCard(ctx, t) {
  const t0 = 20.4, t1 = 36.5, e = KIT.env(t, t0, t1, 0.45, 0.3); if (!e.live || e.a <= 0) return;
  const x = 150, w = 810, top = 252, pad = 36, rowH = 46, h = 8 + pad + 62 + 14 + 6 * rowH + 74 + pad - 18;
  ctx.save(); ctx.globalAlpha = e.a; ctx.translate(0, (1 - e.i) * 24 + e.o * 12);
  KIT.sheet(ctx, x, top, w, h, { band: WC });
  KIT.text(ctx, 'BOP Stack: บน → ล่าง', x + pad, top + 8 + pad + 24, { w: 600, size: 42, color: KC.ink, maxW: w - pad * 2 });
  ctx.fillStyle = KC.rule; ctx.fillRect(x + pad, top + 8 + pad + 62, w - pad * 2, 2);
  const cur = TIERS.reduce((c, r, i) => (t >= r[2] - 0.1 ? i : c), -1);
  TIERS.forEach(([lab, size, ta], i) => {
    const u = KIT.eout((t - ta + 0.1) / 0.35); if (u <= 0) return;
    const ry = top + 8 + pad + 62 + 14 + i * rowH + rowH / 2;
    ctx.save(); ctx.globalAlpha *= u;
    if (i === cur) { ctx.fillStyle = KC.paper2; ctx.fillRect(x + pad - 10, ry - rowH / 2 + 3, w - pad * 2 + 20, rowH - 6); }
    KIT.numKey(ctx, i + 1, x + pad + 16, ry, 30, i === cur ? WC : KC.paper2);
    KIT.text(ctx, lab, x + pad + 46, ry + 1, { w: 600, size: 30, color: KC.ink, maxW: 430 });
    KIT.text(ctx, size, x + w - pad, ry + 1, { w: 400, size: 26, color: KC.ink2, align: 'right', maxW: 300 });
    ctx.restore();
  });
  const nu = KIT.eout((t - 35.2) / 0.35);
  if (nu > 0) { ctx.save(); ctx.globalAlpha *= nu; const ny = top + h - pad - 44; ctx.fillStyle = KC.rule; ctx.fillRect(x + pad, ny - 24, w - pad * 2, 1.5);
    KIT.text(ctx, 'ตัวอย่าง Land Stack 13-5/8 in, Ram 10,000 psi', x + pad, ny + 4, { w: 400, size: 26, color: KC.ink2, maxW: w - pad * 2 });
    KIT.text(ctx, 'Arrangement จริงต่างกันตามผู้ดำเนินการ', x + pad, ny + 38, { w: 400, size: 26, color: KC.ink2, maxW: w - pad * 2 }); ctx.restore(); }
  ctx.restore();
}
// ---- floor indicator: the stack pictogram at x 60-130, y 300-900 (UI, not a label)
const FI = [['bell', 0.13], ['ann', 0.2], ['vbr', 0.12], ['bsr', 0.12], ['spool', 0.1], ['low', 0.17], ['ch', 0.1]];
function floorIndicator(ctx, t) {
  const e = KIT.env(t, 20.2, 77.6, 0.4, 0.3); if (!e.live || e.a <= 0) return;
  let cur = 'bell';
  if (t < 36.8) { for (const [k] of FI) if (TIER[k] != null && t >= TIER[k] - 0.1) cur = k; }
  else if (t < 50.1) cur = 'ann'; else if (t < 70.6) cur = 'vbr'; else cur = 'bsr';
  const x = 60, w = 70, y0 = 300, H0 = 600;
  ctx.save(); ctx.globalAlpha = e.a;
  KIT.sheet(ctx, x, y0 - 14, w, H0 + 28);
  let y = y0; const order = FI.map(f => f[0]), ci = order.indexOf(cur);
  FI.forEach(([k, f], i) => {
    const hh = f * H0, ww = k === 'bell' ? 22 : k === 'ann' ? 46 : k === 'spool' ? 30 : k === 'ch' ? 34 : 50;
    const cx = x + w / 2;
    ctx.fillStyle = k === cur ? WC : i < ci ? KC.paper2 : KC.paper;
    const gap = (k === 'bsr') ? 0 : 4;
    ctx.fillRect(cx - ww / 2, y + gap / 2, ww, hh - gap);
    ctx.strokeStyle = k === 'bell' || k === 'ch' ? KC.rule : KC.ink; ctx.lineWidth = 2; ctx.strokeRect(cx - ww / 2, y + gap / 2, ww, hh - gap);
    if (k === 'vbr') { ctx.fillStyle = KC.ink; ctx.fillRect(cx - ww / 2, y + hh - 1, ww, 1.5); } // double body hairline
    y += hh;
  });
  ctx.restore();
}
// ---- section tab: "P5 Well Control" + the current stage (crossfades)
const STG = [[13.2, 'BOP Stack'], [77.6, 'Accumulator'], [98.2, 'Choke & Kill'], [111.8, 'Choke Manifold'], [119.2, 'Mud Gas Separator'], [133.4, 'Trip Tank'], [139.6, 'Inside the pipe'], [152.1, 'Diverter'], [159.2, 'Testing']];
function sectionTab(ctx, t) {
  const e = KIT.env(t, 13.4, 166.1, 0.4, 0.3); if (!e.live || e.a <= 0) return;
  const x = 60, y = 168, h = 64, iw = 64, L = 'Well Control';
  const lw = KIT.measure(ctx, L, 600, 30), subW = Math.max(...STG.map(s => KIT.measure(ctx, s[1], 400, 28)));
  const full = iw + 24 + lw + 30 + subW + 28;
  ctx.save(); ctx.globalAlpha = e.a;
  const g = KIT.eout((t - 13.4) / 0.4);
  ctx.save(); ctx.beginPath(); ctx.rect(x - 30, y - 30, iw + (full - iw + 30) * g + 30, h + 60); ctx.clip();
  KIT.sheet(ctx, x, y, full, h);
  ctx.fillStyle = WC; KIT.rr(ctx, x, y, iw, h, 6); ctx.fill(); ctx.fillRect(x + iw - 8, y, 8, h);
  KIT.text(ctx, 'P5', x + iw / 2, y + h / 2 + 1, { w: 600, size: 28, align: 'center', color: KC.ink });
  const tx = x + iw + 24;
  KIT.text(ctx, L, tx, y + h / 2 + 1, { w: 600, size: 30, color: KC.ink });
  ctx.fillStyle = KC.rule; ctx.fillRect(tx + lw + 14, y + 16, 2, h - 32);
  let i = 0; while (i < STG.length - 1 && t >= STG[i + 1][0]) i++;
  const k = KIT.eout((t - STG[i][0]) / 0.35);
  if (i > 0 && k < 1) { ctx.save(); ctx.globalAlpha *= 1 - k; KIT.text(ctx, STG[i - 1][1], tx + lw + 30, y + h / 2 + 1, { w: 400, size: 28, color: KC.ink2 }); ctx.restore(); }
  ctx.save(); ctx.globalAlpha *= k; KIT.text(ctx, STG[i][1], tx + lw + 30, y + h / 2 + 1 + (1 - k) * 8, { w: 400, size: 28, color: KC.ink2 }); ctx.restore();
  ctx.restore(); ctx.restore();
}
// ---- S13: status tab "Rig Power: OFF" + limit ring "<= 30 s" with a check
function powerTab(ctx, t) {
  const e = KIT.env(t, 92.0, 95.4, 0.35, 0.3); if (!e.live || e.a <= 0) return;
  ctx.save(); ctx.globalAlpha = e.a; ctx.translate(0, (1 - e.i) * 14);
  const lab = 'Rig Power: OFF', w = KIT.measure(ctx, lab, 600, 34) + 74, x = 60, y = 660, h = 70;
  KIT.sheet(ctx, x, y, w, h);
  ctx.fillStyle = '#6d6f75'; ctx.fillRect(x, y, 10, h);
  KIT.text(ctx, lab, x + 40, y + h / 2 + 1, { w: 600, size: 34, color: KC.ink });
  ctx.restore();
}
function limitRing(ctx, t) {
  const e = KIT.env(t, 94.2, 98.2, 0.35, 0.3); if (!e.live || e.a <= 0) return;
  const cx = 840, cy = 760, r = 70;
  ctx.save(); ctx.globalAlpha = e.a;
  ctx.fillStyle = KC.paper; ctx.beginPath(); ctx.arc(cx, cy, r + 14, 0, 7); ctx.fill();
  ctx.strokeStyle = KC.ink; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.stroke();
  const u = KIT.eio((t - 94.2) / 0.5);
  ctx.strokeStyle = WC; ctx.lineWidth = 10; ctx.lineCap = 'butt'; ctx.beginPath(); ctx.arc(cx, cy, r - 9, -Math.PI / 2, -Math.PI / 2 + 2 * Math.PI * u); ctx.stroke();
  KIT.text(ctx, '≤ 30 s', cx, cy + 2, { w: 600, size: 34, color: KC.ink, align: 'center' });
  drawOn(ctx, 'check', cx - 20, cy + r + 50, 40, KIT.eout((t - 94.9) / 0.3));
  ctx.restore();
}
// ---- S9: calc card with the count-up
function calcCard(ctx, t) {
  card(ctx, t, { t0: 63.9, t1: 70.3, x: 150, w: 810, title: 'แรงบน Ram ที่ปิด', lines: ['Bore 13-5/8 in ≈ 145.8 in²', '× 10,000 psi ≈ 1.46 ล้าน lbf', '≈ 660 ตัน (แรง)'], lineAt: [64.4, 65.2, 68.3],
    note: 'คำนวณที่แรงดันใช้งานสูงสุดของ Stack 10M', noteAt: 69.1, count: { line: 1, token: '10,000', value: 10000, t: 64.2, dur: 1.0 } });
}
// ---- S18: dimension line on the mud leg; S19 tally tick + check
function legDim(ctx, t) {
  if (O.shot.id !== 18) return;
  const e = KIT.env(t, 126.8, 133.4, 0.3, 0.3); if (!e.live || e.a <= 0) return;
  const b = proj(wa(O.mgs, 'legBottom')), tp = proj(wa(O.mgs, 'legTop'));
  const x = Math.min(b.x, tp.x) - 70, u = KIT.eio((t - 126.8) / 0.45), y1 = lerp(b.y, tp.y, u);
  ctx.save(); ctx.globalAlpha = e.a;
  cased(ctx, () => { ctx.beginPath(); ctx.moveTo(x, b.y); ctx.lineTo(x, y1); });
  for (const yy of [b.y, y1]) cased(ctx, () => { ctx.beginPath(); ctx.moveTo(x - 14, yy); ctx.lineTo(x + 14, yy); });
  ctx.restore();
}
function tripTally(ctx, t) {
  if (O.shot.id !== 19.2) return;
  const e = KIT.env(t, 135.8, 139.6, 0.3, 0.3); if (!e.live || e.a <= 0) return;
  const lv = wa(O.trip, 'level'), bd = wa(O.trip, 'board');
  // calculated mark: the level after one stand of steel (computed from the same setLevel step)
  const yTank = lv[1] - 0.1 * (2.9 - 1.3) * 0; // level anchor tracks the mud; draw the mark at the settled height
  const P = proj([bd[0] + 0.12, O.tripMarkY || lv[1], bd[2]]);
  ctx.save(); ctx.globalAlpha = e.a;
  ctx.setLineDash([10, 8]); cased(ctx, () => { ctx.beginPath(); ctx.moveTo(P.x, P.y); ctx.lineTo(P.x + 90, P.y); }); ctx.setLineDash([]);
  drawOn(ctx, 'check', P.x + 130, P.y, 40, KIT.eout((t - 137.9) / 0.3));
  ctx.restore();
}
// ---- S10: cross / check on the tool joint (space-out)
function spaceOut(ctx, t) {
  if (O.shot.id !== 10) return;
  const P = proj(inSlot('BSR', [0, 0.64, 0.12]));
  if (t > 75.4 && t < 76.9) drawOn(ctx, 'cross', P.x, P.y, 64, KIT.eout((t - 75.4) / 0.3), 1 - sstep(76.0, 76.5, t));
  if (t > 77.0) drawOn(ctx, 'check', P.x, P.y, 64, KIT.eout((t - 77.0) / 0.3));
}
// ---- S16: the choke trim as a section inset (needle + seat), the needle steps into the seat, never seals
function trimInset(ctx, t) {
  const e = KIT.env(t, 113.6, 116.2, 0.35, 0.3); if (!e.live || e.a <= 0) return;
  const cx = 770, cy = 870, R0 = 150;
  ctx.save(); ctx.globalAlpha = e.a; ctx.translate(0, (1 - e.i) * 14);
  ctx.fillStyle = KC.paper; ctx.beginPath(); ctx.arc(cx, cy, R0 + 10, 0, 7); ctx.fill();
  ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, R0, 0, 7); ctx.clip();
  ctx.fillStyle = KC.paper2; ctx.fillRect(cx - R0, cy - R0, 2 * R0, 2 * R0);
  // body section (hatched ink), flow passage, seat ring
  ctx.fillStyle = '#c9c3b6'; ctx.fillRect(cx - R0, cy - R0, 2 * R0, 2 * R0);
  ctx.fillStyle = KIT.light(MUDC, 0.25); ctx.fillRect(cx - R0, cy - 34, R0 - 34, 68); ctx.fillRect(cx - 34, cy - 34, 68, R0 + 40);
  let ch = 0.6; for (const [a, b] of [[114.4, 0.48], [114.9, 0.36], [115.4, 0.25]]) if (t > a) ch = lerp(ch, b, KIT.eio((t - a) / 0.3));
  ctx.fillStyle = KC.ink; ctx.fillRect(cx - 34, cy + 20, 14, 30); ctx.fillRect(cx + 20, cy + 20, 14, 30); // seat
  // needle: conical tip moves down into the seat as the choke closes (gap stays open)
  const ny = cy + 24 - 54 * ch;
  ctx.fillStyle = '#8b939e'; ctx.beginPath(); ctx.moveTo(cx - 26, cy - R0); ctx.lineTo(cx - 26, ny - 30); ctx.lineTo(cx, ny + 12); ctx.lineTo(cx + 26, ny - 30); ctx.lineTo(cx + 26, cy - R0); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = KC.ink; ctx.lineWidth = 2.5; ctx.stroke();
  // flow: arrows in, narrowed jet out (faster, bubbles grow downstream)
  ctx.fillStyle = WC; for (let i = 0; i < 4; i++) { const u = fract(t * 1.2 + i / 4), x = cx - R0 + 20 + u * (R0 - 70); ctx.beginPath(); ctx.arc(x, cy, 7, 0, 7); ctx.fill(); }
  for (let i = 0; i < 4; i++) { const u = fract(t * 2.2 + i / 4), y = cy + 40 + u * 120; ctx.beginPath(); ctx.arc(cx + 6 * Math.sin(i * 2 + t * 9), y, 7 + 5 * u, 0, 7); ctx.fill(); }
  ctx.restore();
  ctx.strokeStyle = KC.ink; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(cx, cy, R0, 0, 7); ctx.stroke();
  KIT.labelPill(ctx, cx, cy + R0 + 44, 'Needle + Seat', 'ภาพตัด Trim', WC, { size: 28, align: 'center' });
  ctx.restore();
}
// ---- recap: compact sheet with 5 colour chips that land on their words
function recap(ctx, t) {
  const t0 = 166.3, t1 = 172.1, e = KIT.env(t, t0, t1, 0.45, 0.3); if (!e.live || e.a <= 0) return;
  const x = 60, y = 176, w = 900, h = 214, pad = 40;
  ctx.save(); ctx.globalAlpha = e.a; ctx.translate(0, (1 - e.i) * 24 + e.o * 12);
  KIT.sheet(ctx, x, y, w, h, { band: WC });
  KIT.text(ctx, 'Drilling Rig 101: 5 ระบบ', x + pad, y + 8 + 56, { w: 600, size: 52, color: KC.ink, maxW: w - pad * 2 });
  const chips = [['Power', SYSHEX.power, 167.4], ['Hoisting', SYSHEX.hoist, 168.1], ['Rotating', SYSHEX.rotate, 168.9], ['Circulating', SYSHEX.circ, 169.6], ['Well Control', SYSHEX.wc, 170.9]];
  let cx = x + pad; const cy = y + 8 + 136;
  for (const [lab, col, ta] of chips) {
    const u = KIT.eout((t - ta + 0.1) / 0.35), cw = KIT.measure(ctx, lab, 600, 26) + 44;
    if (u > 0) { ctx.save(); ctx.globalAlpha *= u; ctx.translate(0, (1 - u) * 10);
      ctx.fillStyle = KC.paper2; KIT.rr(ctx, cx, cy - 24, cw, 48, 6); ctx.fill(); ctx.fillStyle = col; KIT.rr(ctx, cx, cy - 24, 12, 48, 4); ctx.fill(); ctx.fillRect(cx + 6, cy - 24, 6, 48);
      KIT.text(ctx, lab, cx + 24, cy + 1, { w: 600, size: 26, color: KC.ink }); ctx.restore(); }
    cx += cw + 10;
  }
  ctx.restore();
}
// ---- EP06 teaser: grey cement tone, "EP.06" in place of the part counter, no parts ruler
function teaser(ctx, t) {
  const t0 = 177.4, t1 = 182.7, E = KIT.env(t, t0, t1, 0.5, 0.3); if (!E.live || E.a <= 0) return;
  const x = 60, y = 220, w = 900, h = 400, px = x + 52, col = '#94a3b8';
  ctx.save(); ctx.globalAlpha = E.a;
  const pk = KIT.eout((t - t0) / 0.5);
  ctx.save(); ctx.beginPath(); ctx.rect(x - 30, y - 30, w + 60, (h + 60) * pk); ctx.clip(); KIT.sheet(ctx, x, y, w, h, { band: col, bandH: 10 }); ctx.restore();
  const k1 = KIT.stag(t, t0 + 0.2, 0);
  ctx.save(); ctx.globalAlpha *= k1;
  const kw = KIT.text(ctx, 'ตอนต่อไป', px, y + 76, { w: 600, size: 34, color: KC.ink, maxW: 500 }).width;
  KIT.icon(ctx, 'arrowR', px + kw + 30, y + 76, 30, KC.ink, 2.6);
  KIT.text(ctx, 'EP.06', x + w - 52, y + 76, { w: 600, size: 30, align: 'right', color: KIT.deep(col, 0.45) });
  ctx.restore();
  const k2 = KIT.eout((t - t0 - 0.3) / 0.6);
  ctx.save(); ctx.beginPath(); ctx.rect(x, y + 110, w, 150); ctx.clip();
  KIT.text(ctx, 'Casing & Cementing', px - 4, y + 186 + (1 - k2) * 130, { w: 600, size: 96, color: KC.ink, maxW: w - 104 });
  ctx.restore();
  const k4 = KIT.stag(t, t0 + 0.7, 0);
  ctx.save(); ctx.globalAlpha *= k4; KIT.text(ctx, 'ท่อกรุ, ซีเมนต์หลุม', px, y + 300, { w: 400, size: 42, color: KC.ink, maxW: w - 104 }); ctx.restore();
  ctx.restore();
}
// ---- transitions
const DIPS = [6.2, 13.2, 91.4, 92.7, 93.6, 98.2, 111.8, 116.2, 119.2, 133.4, 135.2, 139.6, 152.1, 159.2, 160.6, 163.3, 166.1];
const SHORT_DIPS = [42.2, 43.9, 46.4, 75.15];
const IRIS = [[36.8, () => proj(addV(OFF.L, [0, YC.ch, 0]))], [50.1, null], [70.6, null], [77.6, null], [141.0, () => proj([0, 19.0, 0])], [145.2, null]];
function transitions(ctx, t) {
  for (const tc of DIPS) KIT.wipe(ctx, t, { tc, dur: 0.5, type: 'dip' });
  for (const tc of SHORT_DIPS) KIT.wipe(ctx, t, { tc, dur: 0.3, type: 'dip' });
  KIT.wipe(ctx, t, { tc: 148.9, dur: 0.4, type: 'dip' });
  KIT.wipe(ctx, t, { tc: 177.4, dur: 0.6, type: 'dip', color: '#2b3038' });
  for (const [tc, f] of IRIS) {
    if (t < tc - 0.3 || t > tc + 0.3) continue;
    let cx = 540, cy = 1000;
    if (f && t < tc) { const P = f(); if (P.ok && P.x > 0 && P.x < W && P.y > 0 && P.y < H) { cx = P.x; cy = P.y; } }
    KIT.wipe(ctx, t, { tc, dur: 0.6, type: 'iris', cx, cy });
  }
  // dive streak (S21): a short vertical motion blur
  if (t > 183.0) { ctx.save(); ctx.globalAlpha = sstep(183.0, 183.6, t); ctx.fillStyle = KC.ink; ctx.fillRect(0, 0, W, H); ctx.restore(); }
  // edge vignette in studio macros (fog-rack fallback for DOF)
  if (O.shot.set === 'S') { const g = ctx.createRadialGradient(540, 980, 420, 540, 980, 1250); g.addColorStop(0, 'rgba(5,10,20,0)'); g.addColorStop(1, 'rgba(5,10,20,0.45)'); ctx.save(); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore(); }
}

function drawOverlay(ctx, t) {
  applyState(t);
  ctx.save(); ctx.textBaseline = 'middle';
  const id = O.shot.id, L_ = p => p;
  if (id === 22) { ctx.save(); ctx.globalAlpha = 0.22 * sstep(152.2, 152.9, t); ctx.fillStyle = '#5b5578'; ctx.fillRect(0, 0, W, H); ctx.restore(); }
  // ---- title
  KIT.titleCard(ctx, t, { t0: 0.4, t1: 5.9, part: 5, total: 5, kicker: 'Drilling Rig 101, ตอน 5', title: 'Well Control System', subtitle: 'BOP, Choke Manifold และ MGS', color: WC });
  sectionTab(ctx, t);
  floorIndicator(ctx, t);
  // ---- callouts (max 2 at once)
  const S = O.stack;
  if (id === 2) {
    co(ctx, t, 8.9, 12.0, inW([1.15, -20, 0.3]), 700, 880, 'Primary: Mud', 'Hydrostatic', { color: MUDC });
    co(ctx, t, 10.9, 13.2, inW([0, 2.6, 0.4]), 300, 760, 'Secondary: Equipment', 'BOP');
  }
  if (id === 3) {
    co(ctx, t, 17.0, 20.2, wa(S, 'annular'), 760, 720, 'BOP Stack', '');
    co(ctx, t, 17.4, 20.4, [2.4, -2.4, -2.6], 280, 1180, 'Cellar', 'ห้องใต้พื้นแท่น');
  }
  if (id === 4 || (id === 3 && t > 20.1)) {
    const C = [['Annular Preventer', '', 'annular', TIER.ann, TIER.vbr + 0.6], ['Upper Pipe Ram (VBR)', '', 'upperRam', TIER.vbr, TIER.bsr + 0.5], ['Blind Shear Ram', '', 'bsr', TIER.bsr, TIER.spool + 0.4],
      ['Drilling Spool', 'Choke ⟷ Kill', 'spool', TIER.spool, TIER.low + 0.1], ['Lower Pipe Ram', '', 'lowerRam', TIER.low, TIER.ch + 0.6], ['Casing Head', '', 'casingHead', TIER.ch, 37.1]];
    C.forEach(([lab, sub, k, a, b], i) => { const p = wa(S, k); co(ctx, t, a, Math.min(b, a + 4.0), [p[0] - 0.45, p[1], p[2]], 640, 860, lab, sub, { n: i + 1 }); });
  }
  if (id === 5) {
    co(ctx, t, 37.6, 41.2, inSlot('ANN', [0.3, 0.7, 0.02]), 300, 1180, 'Packing Element', 'ยาง + Steel Inserts');
    co(ctx, t, 38.6, 42.0, inSlot('ANN', [0.42, 0.5, 0.02]), 760, 1220, 'Piston', 'ลูกสูบดันขึ้น', { align: 'right' });
  }
  if (id === 6) {
    co(ctx, t, 44.4, 47.4, inSlot('ANN', [0, 0.74, 0.02]), 760, 760, 'Open Hole', 'ไม่มีท่อ', { align: 'right' });
    co(ctx, t, 46.8, 50.0, inSlot('ANN', [0.08, lerp(1.15, 0.38, clamp((t - 46.6) / 3.2)), 0.05]), 300, 1220, 'Stripping', 'ลดแรงปิด ดันท่อผ่าน');
  }
  if (id === 7) {
    co(ctx, t, 50.9, 54.6, wpos(O.sRAM.anchors.ram1L), 300, 1180, 'Pipe Ram', 'ร่องพอดีท่อ 5 in');
    co(ctx, t, 51.6, 55.0, wpos(O.sRAM.anchors.bonnet1R), 780, 740, 'Bonnet', '', { align: 'right' });
  }
  if (id === 8) {
    co(ctx, t, 56.8, 59.8, wpos(O.sRAM.anchors.ram0R), 760, 760, 'VBR', '3½–5 in', { align: 'right' });
    co(ctx, t, 59.8, 63.6, wpos(O.sRAM.anchors.lock0R), 330, 760, 'Ram Lock', 'ล็อกเชิงกล');
  }
  if (id === 10) {
    co(ctx, t, 71.0, 74.6, wpos(O.sBSR.anchors.ram0L), 300, 760, 'Blind Shear Ram', '');
    co(ctx, t, 75.8, 77.6, inSlot('BSR', [0.06, 0.64, 0.08]), 760, 1200, 'Space Out', 'ยกท่อให้ใบมีดตรงเนื้อท่อ', { align: 'right' });
  }
  spaceOut(ctx, t);
  if (id === 11) {
    co(ctx, t, 77.9, 81.0, wa(O.dpanel, 'gauges'), 760, 1180, "Driller's Panel", 'แผงสั่ง BOP', { align: 'right' });
    co(ctx, t, 81.0, 84.4, wa(O.acc, 'manifold'), 300, 1180, 'Koomey Unit', 'Accumulator');
  }
  if (id === 12) {
    co(ctx, t, 85.0, 88.4, wa(O.acc, 'n2'), 760, 1200, 'N₂ Precharge', 'ถุงยาง Bladder', { align: 'right' });
    co(ctx, t, 89.0, 91.4, wa(O.acc, 'gauge0'), 300, 760, '3,000 psi', 'Accumulator');
  }
  if (id >= 13 && id < 14) { powerTab(ctx, t); limitRing(ctx, t); }
  if (id === 14) {
    co(ctx, t, 98.7, 101.9, wa(S, 'chokeManual'), 300, 1200, 'Manual Valve', 'ตัวใน หมุนมือ');
    co(ctx, t, 101.7, 104.4, wa(S, 'chokeHCR'), 780, 760, 'HCR', 'Hydraulic gate valve', { align: 'right' });
  }
  if (id === 15) {
    co(ctx, t, 104.4, 108.0, wa(S, 'chokeHCR'), 780, 760, 'HCR', t < 104.6 ? 'Hydraulic gate valve' : 'เปิดสุด / ปิดสุด', { align: 'right' });
    co(ctx, t, 108.5, 111.8, wa(S, 'killCheck'), 300, 760, 'Kill Line', 'สูบเข้า Annulus');
  }
  if (id === 16) { co(ctx, t, 113.2, 116.2, wa(O.man, 'chokeA'), 300, 1200, 'Adjustable Choke', 'หรี่รู ไม่ปิดสนิท'); trimInset(ctx, t); }
  if (id === 16.2) co(ctx, t, 116.4, 119.2, wa(O.cpanel, 'dp'), 760, 760, 'Choke Panel', 'บนพื้นแท่น', { align: 'right' });
  if (id === 17) {
    co(ctx, t, 120.0, 123.2, wa(O.mgs, 'target'), 620, 1000, 'MGS', 'Mud Gas Separator');
    co(ctx, t, 123.0, 126.4, wpos(O.flare), 300, 1240, 'Flare', 'เผาแก๊สทิ้ง');
  }
  if (id === 18) {
    const b = wa(O.mgs, 'legBottom'), tp = wa(O.mgs, 'legTop');
    co(ctx, t, 126.9, 130.4, [(b[0] + tp[0]) / 2, (b[1] + tp[1]) / 2, (b[2] + tp[2]) / 2], 300, 1240, 'Mud Leg ~10 ft', '≈ 5 psi');
    co(ctx, t, 130.0, 133.4, wa(O.mgs, 'ventBase'), 300, 680, 'Vent Line', 'ท่อใหญ่ 8–12 in');
  }
  legDim(ctx, t);
  if (id === 19.2) co(ctx, t, 135.4, 139.6, wa(O.trip, 'board'), 300, 760, 'Trip Tank', 'ถังแคบ มีสเกล');
  tripTally(ctx, t);
  if (id === 20.2) {
    co(ctx, t, 141.6, 144.8, wpos(O.sIBOP.anchors.upper), 760, 780, 'Upper IBOP', 'Remote', { align: 'right' });
    co(ctx, t, 142.8, 145.2, wpos(O.sIBOP.anchors.socket), 300, 1220, 'Lower IBOP', 'Manual');
  }
  if (id === 21) co(ctx, t, 145.5, 148.9, wa(O.fosv, 'valve'), 760, 780, 'FOSV (Open)', 'พร้อมขันเข้า', { align: 'right' });
  if (id === 21.3) co(ctx, t, 149.5, 152.1, wpos(O.wFloat.anchors.flapper), 760, 780, 'Float Valve', 'Check valve', { align: 'right' });
  if (id === 22) {
    co(ctx, t, 155.0, 158.0, wa(O.div, 'diverter'), 760, 1200, 'Diverter', 'บน Conductor', { align: 'right' });
    const e = wa(O.div, 'ventEndL'); co(ctx, t, 156.4, 159.2, [e[0] * 0.5, e[1], e[2]], 300, 760, 'Vent Line', 'ออกห่างแท่น');
  }
  if (id === 23) co(ctx, t, 159.5, 160.6, wa(O.tplug, 'plug'), 760, 760, 'Test Plug', '', { align: 'right' });
  if (id === 23.2) co(ctx, t, 160.8, 163.3, wa(O.rec, 'pen'), 300, 1220, 'Chart Recorder', 'Low → High');
  // ---- cards (one at a time)
  card(ctx, t, { t0: 6.4, t1: 12.9, title: 'Barriers', lines: ['Primary: Mud Hydrostatic', 'Secondary: Well Control Equipment', 'BOP · Choke & Kill · Control Unit'], lineAt: [7.0, 10.9, 11.7] });
  card(ctx, t, { t0: 13.4, t1: 19.9, title: 'BOP = Blowout Preventer', lines: ['Blowout = ของเหลวในหลุมพุ่งขึ้นมาจนคุมไม่ได้', 'Stack หลายตัว ใน Cellar ใต้พื้นแท่น', 'Double Ram 13-5/8" 10M หนักราว 12 ตัน'], lineAt: [14.0, 15.4, 16.8] });
  diagramCard(ctx, t);
  card(ctx, t, { t0: 37.0, t1: 49.8, x: 150, w: 810, title: 'Annular Preventer', lines: ['ยาง + Steel Inserts · ลูกสูบดันบีบ', 'ปิดได้: ท่อ · Tool Joint · Collar · หลุมเปล่า', 'Stripping: ลดแรงปิด ดันท่อผ่านช้าๆ'], lineAt: [37.6, 40.6, 46.6], note: 'ปิดหลุมเปล่าทำให้ยางสึกเร็ว ใช้เมื่อจำเป็น', noteAt: 48.4 });
  card(ctx, t, { t0: 50.3, t1: 63.4, x: 150, w: 810, title: 'Ram Preventers', lines: ['Pipe Ram: ร่องพอดีท่อ 1 ขนาด (เช่น 5 in)', 'VBR: หลายขนาด (เช่น 3½–5 in)', 'Ram Lock: ล็อกเชิงกล ถ้าไฮดรอลิกหาย'], lineAt: [53.3, 57.2, 59.6], note: 'แรงดันหลุมช่วยดันซีลให้แน่น (แต่ไม่ได้ทำให้ Ram ปิด)', noteAt: 61.8 });
  calcCard(ctx, t);
  card(ctx, t, { t0: 70.8, t1: 77.3, x: 150, w: 810, title: 'Blind Shear Ram', lines: ['ใบมีดตัด Drill Pipe แล้วซีลหลุม', 'ตัด Tool Joint / Drill Collar ไม่ได้', 'ต้อง Space Out ก่อน · ทางเลือกสุดท้าย'], lineAt: [72.6, 75.3, 76.3] });
  card(ctx, t, { t0: 77.8, t1: 91.1, title: 'Accumulator (Koomey Unit)', lines: ['ถัง N₂ Precharge 1,000 psi', 'ชาร์จถึง 3,000 psi · Manifold ~1,500 psi', 'ไนโตรเจนเท่านั้น ห้ามใช้อากาศ'], lineAt: [84.9, 86.9, 88.8], note: 'Koomey = ชื่อคน: Paul Koomey ผู้สร้างระบบยุคแรก', noteAt: 82.8 });
  card(ctx, t, { t0: 91.6, t1: 97.9, title: 'Closing Time (API 53)', lines: ['ใช้พลังงานในถัง ไฟดับก็ปิดได้', 'Ram ≤ 30 s · Annular 13-5/8 in ≤ 30 s', 'หลังปิดยังเหลือ ≥ 1,200 psi'], lineAt: [92.4, 93.4, 95.2], note: '30 s คือเวลาสูงสุดที่ยอมให้ ไม่ใช่เวลาปกติ', noteAt: 96.4, x: 150, w: 650 });
  card(ctx, t, { t0: 98.4, t1: 111.5, title: 'Choke & Kill Lines', lines: ['Choke: Manual (ใน) + HCR (นอก)', 'HCR = Gate Valve เปิด/ปิดสุด ≠ Choke', 'Kill Line: สูบเข้า Annulus ใต้ BOP'], lineAt: [98.9, 104.8, 108.6], note: 'ท่อ Choke ใหญ่กว่าหรือเท่าท่อ Kill', noteAt: 110.2 });
  card(ctx, t, { t0: 112.0, t1: 118.9, title: 'Choke Manifold', lines: ['Adjustable Choke: Manual + Remote', 'Panel: DP Pressure · Casing Pressure · Strokes', 'Choke หรี่ได้ แต่ไม่ใช่ตัวปิดสนิท'], lineAt: [112.5, 116.5, 117.3], note: 'Kill ตาม EP04: คุม Bottomhole Pressure ให้คงที่', noteAt: 118.1 });
  card(ctx, t, { t0: 119.4, t1: 133.1, x: 520, w: 440, title: 'Mud Gas Separator', lines: ['แก๊ส → Vent Line → Flare', 'Mud → Shaker / Pits', 'Mud Leg ≥ 10 ft ≈ 5 psi'], lineAt: [122.9, 124.8, 129.6], note: '≠ Vacuum Degasser (Part 4)', noteAt: 131.2 });
  card(ctx, t, { t0: 133.6, t1: 139.3, title: 'Trip Tank', lines: ['ถังแคบ สูง มีสเกลวัด', 'เติมน้อยกว่าที่คำนวณ = ระวัง Kick', 'ร่วมกับ Flow Sensor · PVT (Part 4)'], lineAt: [134.1, 136.6, 137.6] });
  card(ctx, t, { t0: 139.8, t1: 151.8, title: 'ปิดข้างในก้านเจาะ', lines: ['Upper IBOP: Remote · Lower IBOP: Manual', 'FOSV: Ball Valve เปิดค้าง พร้อมขันเข้า', 'Float Valve: Check Valve เหนือ Bit'], lineAt: [142.4, 145.6, 149.5], note: 'BOP ปิด Annulus · วาล์วเหล่านี้ปิดใน Drill String', noteAt: 140.4 });
  card(ctx, t, { t0: 152.3, t1: 158.9, title: 'Diverter', lines: ['ติดบน Conductor ก่อนติด BOP', 'ปิดแล้วเปิด Vent Line ออกห่างแท่น', 'เบี่ยงทาง ไม่หยุดการไหล'], lineAt: [152.8, 155.6, 157.0], note: 'ปิดหลุมตื้นอาจทำให้ชั้นหินแตก แก๊สขึ้นรอบแท่น', noteAt: 157.9 });
  card(ctx, t, { t0: 159.4, t1: 165.8, title: 'BOP Testing (API 53)', lines: ['Low 250–350 psi → High · Hold ≥ 5 min', 'Pressure Test ≤ 21 วัน', 'Function Test ทุก 7 วัน'], lineAt: [159.9, 161.4, 163.2], glyph: [null, 'calendar', 'calendar'], note: 'ข้อกำหนดแต่ละประเทศอาจต่างกัน', noteAt: 164.4 });
  recap(ctx, t);
  KIT.ctaFollow(ctx, t, { t0: 172.6, t1: 176.9, avatar: O.avatar, clickAt: 174.2 - 172.6, color: WC });
  teaser(ctx, t);
  transitions(ctx, t);
  ctx.restore();
}

// ================================================================ captions & cues
const captions = [
  { t0: 0.0, t1: 6.2, th: 'Part 5/5: Well Control System', en: 'Part 5 of 5: the well control system' },
  { t0: 6.2, t1: 13.2, th: 'ด่านแรก Mud · ด่านสอง Well Control Equipment', en: 'Mud is barrier one; this equipment is barrier two' },
  { t0: 13.2, t1: 20.2, th: 'BOP: วาล์วหลายตัวซ้อนกัน ไม่ใช่ตัวเดียว', en: 'The BOP is a stack of preventers, not one valve' },
  { t0: 20.2, t1: 25.6, th: 'บนสุด Annular → Upper Pipe Ram (VBR)', en: 'Top down: annular, then the upper pipe ram' },
  { t0: 25.6, t1: 31.7, th: 'Blind Shear Ram → Drilling Spool', en: 'Blind-shear ram, then the drilling spool' },
  { t0: 31.7, t1: 36.8, th: 'Lower Pipe Ram บน Casing Head', en: 'Lower pipe ram, sitting on the casing head' },
  { t0: 36.8, t1: 43.6, th: 'Annular: ยางโดนัทเสริมเหล็ก ปิดได้ทุกรูปทรง', en: 'Annular: a steel-reinforced rubber donut' },
  { t0: 43.6, t1: 50.1, th: 'ปิดหลุมเปล่าได้ · Stripping ดันท่อผ่าน', en: 'Seals open hole; pipe can strip through' },
  { t0: 50.1, t1: 56.3, th: 'Ram: เหล็ก 2 ฝั่ง · Pipe Ram = ท่อ 1 ขนาด', en: 'Rams close from both sides; one pipe size' },
  { t0: 56.3, t1: 63.7, th: 'VBR หลายขนาด · Ram Lock ล็อกเชิงกล', en: 'VBRs fit a range; ram locks hold mechanically' },
  { t0: 63.7, t1: 70.6, th: '10,000 psi ใต้ Ram ที่ปิด ≈ 660 ตัน', en: '10,000 psi under closed rams: about 660 t' },
  { t0: 70.6, t1: 77.6, th: 'Blind Shear Ram: ตัดท่อแล้วปิดสนิท', en: 'Blind-shear ram: cuts the pipe, then seals' },
  { t0: 77.6, t1: 84.6, th: 'Accumulator (Koomey Unit) สั่งจาก Panel', en: 'Panels command; the accumulator powers it' },
  { t0: 84.6, t1: 91.4, th: 'N₂ Precharge 1,000 psi · ชาร์จถึง 3,000 psi', en: '1,000 psi nitrogen precharge, charged to 3,000' },
  { t0: 91.4, t1: 98.2, th: 'ไฟดับก็ยังปิดได้ · Ram ปิด ≤ 30 วินาที', en: 'Works with rig power off; rams close in ≤30 s' },
  { t0: 98.2, t1: 104.4, th: 'Choke Line: Manual Valve + HCR', en: 'Choke line: inner manual valve, outer HCR' },
  { t0: 104.4, t1: 111.8, th: 'HCR เปิด/ปิดสุด · Kill Line สูบ Mud เข้า', en: 'HCR is on/off; the kill line pumps in' },
  { t0: 111.8, t1: 119.2, th: 'Choke Manifold: หรี่โช้ก คุม BHP คงที่', en: 'The choke manifold holds bottomhole pressure' },
  { t0: 119.2, t1: 126.4, th: 'MGS: แก๊ส → Flare · Mud → ถัง', en: 'MGS: gas to the flare, mud back to the tanks' },
  { t0: 126.4, t1: 133.4, th: 'Mud Seal ตัว U รับได้แค่ ~5 psi', en: 'A U-tube mud seal holds only about 5 psi' },
  { t0: 133.4, t1: 139.6, th: 'Trip Tank: วัด Mud ที่เติมตอนถอนท่อ', en: 'Trip tank: checks hole fill while tripping' },
  { t0: 139.6, t1: 145.2, th: 'IBOP บน Top Drive ปิดในก้านเจาะ', en: 'IBOPs on the top drive close the bore' },
  { t0: 145.2, t1: 152.1, th: 'FOSV เปิดค้างไว้ · Float Valve เหนือ Bit', en: 'FOSV kept open; float valve above the bit' },
  { t0: 152.1, t1: 159.2, th: 'Diverter: เบี่ยงแก๊สตื้น ไม่ได้ปิดหลุม', en: 'A diverter redirects shallow gas' },
  { t0: 159.2, t1: 166.1, th: 'Pressure Test ≤ 21 วัน · Function ทุกสัปดาห์', en: 'Pressure test ≤21 days; function test weekly' },
  { t0: 166.1, t1: 172.4, th: 'ครบ 5 ระบบ: Drilling Rig 101', en: 'All five systems of the drilling rig' },
  { t0: 172.4, t1: 177.4, th: 'กดติดตามไว้ เพื่อไม่พลาดตอนต่อไป', en: 'Follow so you don’t miss the next episode' },
  { t0: 177.4, t1: 183.3, th: 'ตอนต่อไป: EP06 Casing & Cementing', en: 'Next: EP06, casing and cementing' },
];
// SFX (music.js cue names; vol / pan / dur where useful). Times follow the storyboard §7 table, retimed to the shots.
const cues = [
  { t: 0.4, sfx: 'whoosh' },
  { t: 6.6, sfx: 'bubble', vol: 0.5 },
  { t: 7.0, sfx: 'blip' }, { t: 10.9, sfx: 'blip' }, { t: 11.7, sfx: 'blip' },
  { t: 14.0, sfx: 'blip' }, { t: 15.4, sfx: 'blip' }, { t: 16.0, sfx: 'whoosh', vol: 0.4 }, { t: 16.6, sfx: 'clunk', vol: 0.6 }, { t: 16.8, sfx: 'blip' },
  ...['ann', 'vbr', 'bsr', 'spool', 'low', 'ch'].flatMap(k => [{ t: TIER[k], sfx: 'valve', vol: 0.55 }, { t: TIER[k] + 0.1, sfx: 'blip' }]),
  { t: 37.6, sfx: 'blip' }, { t: 38.4, sfx: 'hydraulic', dur: 1.8, vol: 0.6 }, { t: 39.0, sfx: 'rubber', dur: 1.2 }, { t: 40.6, sfx: 'blip' },
  { t: 42.4, sfx: 'hydraulic', dur: 0.9, vol: 0.45 }, { t: 42.8, sfx: 'rubber', dur: 0.6, vol: 0.6 },
  { t: 44.4, sfx: 'hydraulic', dur: 1.2, vol: 0.6 }, { t: 44.6, sfx: 'rubber', dur: 1.2 }, { t: 46.6, sfx: 'blip' },
  { t: 47.6, sfx: 'rubber', dur: 1.8, vol: 0.7 }, { t: 47.6, sfx: 'vibe', vol: 0.4 }, { t: 48.4, sfx: 'blip' },
  { t: 50.4, sfx: 'hydraulic', dur: 2.2 }, { t: 52.6, sfx: 'clunk' }, { t: 53.3, sfx: 'blip' },
  { t: 56.5, sfx: 'hydraulic', dur: 1.8 }, { t: 57.2, sfx: 'blip' }, { t: 58.3, sfx: 'clunk' }, { t: 59.6, sfx: 'blip' },
  { t: 59.8, sfx: 'ratchet', dur: 1.4 }, { t: 61.2, sfx: 'clunk' }, { t: 61.4, sfx: 'hiss', vol: 0.5 }, { t: 61.8, sfx: 'blip' },
  { t: 64.4, sfx: 'blip' }, { t: 65.2, sfx: 'blip' }, { t: 68.3, sfx: 'impact', vol: 0.45 }, { t: 69.1, sfx: 'blip' },
  { t: 71.0, sfx: 'hiss' }, { t: 72.6, sfx: 'blip' }, { t: 73.25, sfx: 'shear', pre: 0.35 }, { t: 74.8, sfx: 'clunk' }, { t: 75.3, sfx: 'blip' },
  { t: 76.0, sfx: 'winch', vol: 0.5 }, { t: 76.3, sfx: 'blip' }, { t: 77.0, sfx: 'blip' },
  { t: 77.8, sfx: 'blip' }, { t: 78.1, sfx: 'blip' }, { t: 78.3, sfx: 'pulse', vol: 0.6 }, { t: 80.6, sfx: 'valve', vol: 0.5 }, { t: 82.8, sfx: 'blip' },
  { t: 84.9, sfx: 'blip' }, { t: 85.0, sfx: 'hiss', vol: 0.5 }, { t: 86.5, sfx: 'pump', vol: 0.6 }, { t: 86.6, sfx: 'tick', n: 6, rate: 2 }, { t: 86.9, sfx: 'blip' },
  { t: 88.0, sfx: 'pump', vol: 0.6 }, { t: 88.8, sfx: 'blip' }, { t: 89.8, sfx: 'clunk', vol: 0.7 },
  { t: 91.9, sfx: 'powerdown' }, { t: 92.75, sfx: 'hiss' }, { t: 93.7, sfx: 'pulse' }, { t: 94.2, sfx: 'hydraulic', dur: 0.7 }, { t: 94.9, sfx: 'clunk' },
  { t: 98.9, sfx: 'blip' }, { t: 100.4, sfx: 'ratchet', dur: 1.1 }, { t: 101.5, sfx: 'valve' }, { t: 102.4, sfx: 'hydraulic', dur: 1.4, vol: 0.6 }, { t: 103.8, sfx: 'valve', open: true }, { t: 103.8, sfx: 'bubble', vol: 0.5 },
  { t: 104.8, sfx: 'blip' }, { t: 105.6, sfx: 'valve', vol: 0.7 }, { t: 106.5, sfx: 'valve', vol: 0.7 },
  { t: 108.4, sfx: 'clunk', vol: 0.3, pan: 0.6 }, { t: 108.6, sfx: 'pump', vol: 0.4 }, { t: 108.6, sfx: 'blip' }, { t: 108.8, sfx: 'flow' }, { t: 110.1, sfx: 'pump', vol: 0.4 }, { t: 110.2, sfx: 'blip' },
  { t: 112.0, sfx: 'gas', dur: 1.4, vent: false }, { t: 112.5, sfx: 'blip' },
  { t: 114.4, sfx: 'flow' }, { t: 114.4, sfx: 'blip', vol: 0.6 }, { t: 114.9, sfx: 'blip', vol: 0.6 }, { t: 115.4, sfx: 'blip', vol: 0.6 },
  { t: 116.5, sfx: 'blip' }, { t: 117.2, sfx: 'blip' }, { t: 118.1, sfx: 'blip' },
  { t: 120.0, sfx: 'gas', dur: 2.6 }, { t: 122.9, sfx: 'blip' }, { t: 123.4, sfx: 'flare', dur: 4.5 }, { t: 124.7, sfx: 'flow', dir: 'down' }, { t: 124.8, sfx: 'blip' },
  { t: 126.8, sfx: 'blip' }, { t: 128.0, sfx: 'bubble', vol: 0.4 }, { t: 129.6, sfx: 'blip' }, { t: 130.5, sfx: 'bubble', vol: 0.4 }, { t: 131.2, sfx: 'blip' },
  { t: 133.6, sfx: 'winch', vol: 0.5 }, { t: 134.1, sfx: 'blip' }, { t: 135.0, sfx: 'clunk' }, { t: 136.2, sfx: 'flow' }, { t: 136.6, sfx: 'blip' }, { t: 137.6, sfx: 'blip' }, { t: 137.9, sfx: 'success' },
  { t: 140.4, sfx: 'blip' }, { t: 141.6, sfx: 'hiss' }, { t: 142.4, sfx: 'blip' }, { t: 142.6, sfx: 'valve' }, { t: 144.2, sfx: 'ratchet', dur: 0.5, vol: 0.7 },
  { t: 145.6, sfx: 'blip' }, { t: 148.9, sfx: 'whoosh' }, { t: 149.4, sfx: 'flow' }, { t: 149.5, sfx: 'blip' }, { t: 150.4, sfx: 'valve', vol: 0.7 },
  { t: 152.2, sfx: 'whoosh', vol: 0.5 }, { t: 152.8, sfx: 'blip' }, { t: 153.0, sfx: 'bubble', vol: 0.5 }, { t: 154.9, sfx: 'hydraulic', dur: 0.6 }, { t: 155.4, sfx: 'gas', dur: 3.4, vol: 0.6 },
  { t: 155.6, sfx: 'blip' }, { t: 157.0, sfx: 'blip' }, { t: 157.9, sfx: 'blip' },
  { t: 159.9, sfx: 'blip' }, { t: 160.2, sfx: 'clunk' }, { t: 160.8, sfx: 'pump', vol: 0.4 }, { t: 160.8, sfx: 'tick', n: 8, rate: 4 }, { t: 161.4, sfx: 'blip' },
  { t: 163.0, sfx: 'hiss' }, { t: 163.2, sfx: 'blip' }, { t: 163.6, sfx: 'hydraulic', dur: 0.6, vol: 0.5 }, { t: 164.2, sfx: 'clunk' }, { t: 164.4, sfx: 'blip' }, { t: 165.4, sfx: 'clunk' },
  { t: 171.2, sfx: 'success' },
  { t: 177.4, sfx: 'whoosh', vol: 0.5 },
];

export default { DURATION, init, renderFrame, post, drawOverlay, captions, cues, dbg: () => O };
