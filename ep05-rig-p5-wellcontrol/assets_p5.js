// assets_p5.js: hero 3D assets for namman.story "Drilling Rig 101 · EP05 Part 5/5: Well Control System".
// ES module, imports nothing. THREE, mergeGeometries and (optionally) look.js' stdMat are passed in.
//
//   import { createAssetsP5 } from './assets_p5.js';
//   const P5 = createAssetsP5({ THREE, mergeGeometries, stdMat });   // stdMat from look.js (recommended)
//   renderer.localClippingEnabled = true;                            // needed for every cut-away
//   const stack = P5.bopStack();  scene.add(stack);  stack.api.setCut(1);  stack.api.setAnnular(0.6);
//
// Every builder returns a THREE.Group with
//   group.api      { setX(u) ... }  setters are pure in their arguments (u in [0,1] unless noted): no time, no history,
//                  so any frame can be rendered in any order. Call them every frame you need, they are cheap.
//   group.anchors  { name: Object3D }  empty nodes for callouts / particle paths (anchor.getWorldPosition(v)).
//   group.parts    { name: Object3D }  named animatable children (also reachable by group.getObjectByName).
// Units are metres, +y up. The BOP stack sits on the cellar floor at y = 0, camera side is +z,
// choke outlet +x (camera right), kill outlet -x (camera left), as in docs/director.md §4.
//
// LOOK. Lit materials are MeshStandardMaterial (via look.js stdMat when given, so they get look.js' analytic reflection
// env). On top, each material gets (onBeforeCompile, chained after look.js):
//   * weathering: tri-planar object-space grunge from a code-generated noise texture (blotches, vertical run-off
//     streaks, paint chips), varying albedo and roughness at a consistent world scale (no UVs needed);
//   * cut caps: with a clipping plane, back faces render as a flat section colour with a faint screen-space hatch,
//     so closed solids read as solid steel / rubber in a half-section (the "capping by back faces" trick).
// Cut-aways use a per-asset clipping plane (setCut(u) sweeps it from closed to the half section). The materials of
// an asset are its own, so cutting one asset never cuts another. Internal moving parts are not clipped (shown whole,
// as in a technical cutaway). Highlight systems can drive material.emissive (all lit materials are standard).
//
// See the BUILDERS section at the bottom of this file (createAssetsP5 return value) for the full list and api.

export function createAssetsP5({ THREE, mergeGeometries, stdMat = null, quality = 1 } = {}) {
  const PI = Math.PI, TAU = 2 * PI, IN = 0.0254;
  const clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
  const lerp = (a, b, u) => a + (b - a) * u;
  const sstep = (a, b, x) => { const u = clamp((x - a) / (b - a)); return u * u * (3 - 2 * u); };
  const fract = x => x - Math.floor(x);
  const hash = (i, k = 0) => fract(Math.sin(i * 127.1 + k * 311.7 + 0.123) * 43758.5453);
  const V2 = (x, y) => new THREE.Vector2(x, y);
  const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
  const SEG = n => Math.max(6, Math.round(n * quality));
  const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _s = V3(), _v = V3(), _e = new THREE.Euler();
  // eases
  const easeIO = u => { u = clamp(u); return u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2; };
  const easeOut = u => 1 - Math.pow(1 - clamp(u), 3);
  const easeIn = u => Math.pow(clamp(u), 2.2);
  // needle / pointer overshoot: 0 -> 1 with a damped wobble (~6 % first overshoot), exactly 1 at u = 1
  const overshoot = u => { u = clamp(u); return 1 - Math.exp(-7 * u) * Math.cos(9.5 * u) + Math.exp(-7) * Math.cos(9.5) * u; };
  // hydraulic ram travel: accelerates over the first 20 %, cruises at constant speed, hits the mechanical stop
  // (no ease-out: a real ram slams onto its stop / the opposite packer) at u = stop and stays there
  const ramTravel = (u, stop = 0.86) => { u = clamp(u); if (u >= stop) return 1; const x = u / stop; return x < 0.2 ? 2.7778 * x * x : 0.11111 + 1.11111 * (x - 0.2); };

  // ------------------------------------------------------------------ noise texture (generated in code)
  // R: multi-octave blotches, G: vertical run-off streaks (along texture v), B: fine speckle (chips / pitting)
  const NOISE = (() => {
    const N = 256, data = new Uint8Array(N * N * 4);
    const lat = (P, seed) => { const a = new Float32Array(P * P); for (let i = 0; i < P * P; i++) a[i] = hash(i, seed); return a; };
    const smp = (a, P, x, y) => { // tileable bilinear-smooth value noise, x,y in [0,1)
      const fx = x * P, fy = y * P, ix = Math.floor(fx), iy = Math.floor(fy), tx = fx - ix, ty = fy - iy;
      const sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
      const g = (i, j) => a[((j % P + P) % P) * P + ((i % P + P) % P)];
      return lerp(lerp(g(ix, iy), g(ix + 1, iy), sx), lerp(g(ix, iy + 1), g(ix + 1, iy + 1), sx), sy);
    };
    const oct = [4, 8, 16, 32, 64].map((P, k) => [P, lat(P, 11 + k)]);
    const stx = lat(64, 31), sty = lat(4, 32), st2 = lat(32, 33), sp = lat(128, 41), sp2 = lat(256, 42);
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const x = i / N, y = j / N;
      let r = 0, w = 0.5, tw = 0;
      for (const [P, a] of oct) { r += smp(a, P, x, y) * w; tw += w; w *= 0.55; }
      r /= tw;
      const streak = Math.pow(smp(stx, 64, x, y * 0.0625), 3) * smp(sty, 4, x, y) * 1.6 + smp(st2, 32, x, y) * 0.15;
      const speck = Math.max(smp(sp, 128, x, y), smp(sp2, 256, x, y) * 0.9);
      const o = (j * N + i) * 4;
      data[o] = clamp(r * 1.25 - 0.12) * 255; data[o + 1] = clamp(streak) * 255; data[o + 2] = clamp(speck) * 255; data[o + 3] = 255;
    }
    const t = new THREE.DataTexture(data, N, N, THREE.RGBAFormat);
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter;
    t.generateMipmaps = true; t.needsUpdate = true;
    return t;
  })();

  // ------------------------------------------------------------------ materials
  const W_VERT_DECL = 'varying vec3 wOP; varying vec3 wON;';
  const W_FRAG_DECL_ = `
uniform sampler2D wTex; uniform vec4 wP; uniform vec2 wQ; uniform vec3 capCol; uniform float capOn;
uniform float capH;
varying vec3 wOP; varying vec3 wON;
vec3 wTri(vec3 p, vec3 n, out float side) {
  vec3 b = pow(abs(n), vec3(4.0)); b /= (b.x + b.y + b.z + 1e-4); side = 1.0 - b.y;
  return texture2D(wTex, p.zy * wQ.x).rgb * b.x + texture2D(wTex, p.xz * wQ.x).rgb * b.y + texture2D(wTex, p.xy * wQ.x).rgb * b.z;
}`;
  // wP = (blotch amount, streak amount, chip amount, roughness variation), wQ = (scale 1/m, chip threshold)
  function enhance(m, o = {}) {
    const U = {
      wTex: { value: NOISE },
      wP: { value: new THREE.Vector4(o.blotch ?? 0.16, o.streak ?? 0.12, o.chip ?? 0.0, o.rough ?? 0.18) },
      wQ: { value: new THREE.Vector2(o.scale ?? 0.9, o.chipT ?? 0.88) },
      capCol: { value: new THREE.Color(o.cap ?? 0xd6d0c2) }, capOn: { value: 0 }, capH: { value: o.capH ?? 1 },
    };
    // cap colour is written after tone mapping / sRGB encoding: give it as raw sRGB components
    const cc = new THREE.Color(o.cap ?? 0xd6d0c2); U.capCol.value.setRGB(...cc.clone().convertLinearToSRGB().toArray());
    m.userData.wU = U;
    const prev = m.onBeforeCompile;
    m.onBeforeCompile = (sh, r) => {
      if (prev) prev.call(m, sh, r);
      Object.assign(sh.uniforms, U);
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\n' + W_VERT_DECL)
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nwOP = transformed; wON = objectNormal;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\n' + W_FRAG_DECL_)
        .replace('#include <color_fragment>', `#include <color_fragment>
  float wSide; vec3 wN = wTri(wOP, normalize(wON), wSide);
  float wStreak = wN.g * wSide;
  float wChip = smoothstep(wQ.y, wQ.y + 0.06, wN.b) * wP.z;
  diffuseColor.rgb *= clamp(1.0 + (wN.r - 0.5) * 2.0 * wP.x - wStreak * wP.y, 0.0, 1.6);
  diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.11, 0.105, 0.10), wChip);`)
        .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
  roughnessFactor = clamp(roughnessFactor + (wN.r - 0.5) * 2.0 * wP.w + wStreak * wP.w * 0.8 + wChip * 0.25, 0.04, 1.0);`)
        .replace('#include <dithering_fragment>', `#include <dithering_fragment>
  #if NUM_CLIPPING_PLANES > 0
  if (capOn > 0.5 && !gl_FrontFacing) {
    // cap: flat section colour with a faint hatch (back faces of closed solids seen through the cut)
    float hh = step(0.82, fract((gl_FragCoord.x + gl_FragCoord.y * capH) / 11.0));
    gl_FragColor = vec4(capCol * (1.0 - 0.07 * hh), 1.0);
  }
  #endif`);
    };
    m.customProgramCacheKey = () => 'lkEnv1+p5w';
    return m;
  }
  function makeStd(color, kind, o) {
    if (stdMat) return stdMat(color, kind, o);
    const m = new THREE.MeshStandardMaterial({ color, ...o }); m.userData.kind = kind; return m;
  }
  // mat(color, { metal, rough, kind, cap, blotch, streak, chip, rough, scale, side, ... })
  function mat(color, o = {}) {
    const { metal = 0.1, rough = 0.55, kind = 'paint', cap, capH, blotch, streak, chip, rv, scale, chipT, noW, ...rest } = o;
    const m = makeStd(color, kind, rest);
    m.metalness = metal; m.roughness = rough;
    m.userData.pbr = { metalness: metal, roughness: rough };
    if (!noW) enhance(m, { cap, capH, blotch, streak, chip, rough: rv, scale, chipT });
    return m;
  }
  // one palette per asset instance (so clip planes / highlight tints stay per asset)
  const PAL = {
    bopRed: 0x8a2a1f, bopRedDk: 0x5e1d16, grey: 0x5d646d, greyLt: 0x9aa1a9, gunmetal: 0x3a3f46, machined: 0xb9bfc6,
    chrome: 0xdfe3e8, stud: 0x34373c, nut: 0x8d9298, rubber: 0x2b2b33, hose: 0x18191c, brass: 0xb38b3f, yellow: 0xd9a21b,
    wheel: 0xc22d22, white: 0xe9e6dd, stainless: 0xc4c8cc, black: 0x141518, amber: 0xd98a1c, n2: 0x8aa0b8, mud: 0xc8925a,
    green: 0x2f6b3a, blueGrey: 0x4f6478, cream: 0xe9dfc8, carbide: 0x4a4d52, skid: 0x2f343b, orange: 0xd9661f,
  };
  function palette(over = {}) {
    const c = { ...PAL, ...over };
    return {
      paint: mat(c.paint ?? c.bopRed, { metal: 0.15, rough: 0.5, blotch: 0.16, streak: 0.2, chip: 0.22, chipT: 0.88, rv: 0.16, scale: 0.7, cap: 0xd9d3c6 }),
      paintDk: mat(c.paintDk ?? c.bopRedDk, { metal: 0.15, rough: 0.55, blotch: 0.12, streak: 0.14, chip: 0.4, cap: 0xd9d3c6 }),
      grey: mat(c.grey, { metal: 0.25, rough: 0.55, blotch: 0.14, streak: 0.18, chip: 0.4, cap: 0xd9d3c6 }),
      greyLt: mat(c.greyLt, { metal: 0.3, rough: 0.5, blotch: 0.1, streak: 0.1, chip: 0.3, cap: 0xd9d3c6 }),
      gun: mat(c.gunmetal, { metal: 0.45, rough: 0.48, blotch: 0.12, streak: 0.1, cap: 0xd9d3c6 }),
      machined: mat(c.machined, { kind: 'steel', metal: 0.88, rough: 0.3, blotch: 0.08, streak: 0.04, rv: 0.1, scale: 2.5, cap: 0xdedad0 }),
      chrome: mat(c.chrome, { kind: 'steel', metal: 1.0, rough: 0.12, blotch: 0.03, streak: 0.0, rv: 0.04, scale: 3, cap: 0xe4e2dc }),
      stud: mat(c.stud, { kind: 'steel', metal: 0.6, rough: 0.5, blotch: 0.1, streak: 0.05, scale: 4, cap: 0xcfcac0 }),
      nut: mat(c.nut, { kind: 'steel', metal: 0.75, rough: 0.42, blotch: 0.12, streak: 0.05, scale: 4, flatShading: true, cap: 0xcfcac0 }),
      rubber: mat(c.rubber, { kind: 'rubber', metal: 0.0, rough: 0.82, blotch: 0.12, streak: 0.0, rv: 0.08, scale: 2, cap: 0x4a4a55, capH: -1 }),
      hose: mat(c.hose, { kind: 'rubber', metal: 0.0, rough: 0.7, blotch: 0.1, streak: 0.06, scale: 3, cap: 0x303036 }),
      brass: mat(c.brass, { kind: 'steel', metal: 1.0, rough: 0.32, blotch: 0.1, streak: 0.0, scale: 4, cap: 0xe6d3a0 }),
      yellow: mat(c.yellow, { metal: 0.15, rough: 0.5, blotch: 0.12, streak: 0.14, chip: 0.55, cap: 0xd9d3c6 }),
      wheel: mat(c.wheel, { metal: 0.15, rough: 0.45, blotch: 0.12, streak: 0.06, chip: 0.5, chipT: 0.8, cap: 0xd9d3c6 }),
      white: mat(c.white, { metal: 0.05, rough: 0.55, blotch: 0.1, streak: 0.2, chip: 0.3, cap: 0xd9d3c6 }),
      stainless: mat(c.stainless, { kind: 'steel', metal: 0.9, rough: 0.34, blotch: 0.06, streak: 0.03, scale: 2, cap: 0xdedad0 }),
      black: mat(c.black, { kind: 'dark', metal: 0.2, rough: 0.6, blotch: 0.06, streak: 0.0, cap: 0x2a2a30 }),
      skid: mat(c.skid, { kind: 'dark', metal: 0.3, rough: 0.6, blotch: 0.16, streak: 0.2, chip: 0.5, cap: 0xd9d3c6 }),
      carbide: mat(c.carbide, { kind: 'steel', metal: 0.8, rough: 0.35, blotch: 0.05, cap: 0x8e9196 }),
      orange: mat(c.orange, { metal: 0.12, rough: 0.5, blotch: 0.12, streak: 0.15, chip: 0.4, cap: 0xd9d3c6 }),
      green: mat(c.green, { metal: 0.12, rough: 0.5, blotch: 0.12, streak: 0.12, chip: 0.4, cap: 0xd9d3c6 }),
      blueGrey: mat(c.blueGrey, { metal: 0.15, rough: 0.5, blotch: 0.12, streak: 0.15, chip: 0.4, cap: 0xd9d3c6 }),
    };
  }
  function tintCaps(pal, color, h = 1) {
    const c = new THREE.Color(color).convertLinearToSRGB();
    for (const m of Object.values(pal)) { const U = m.userData.wU; if (!U || m.userData.kind === 'rubber') continue; U.capCol.value.setRGB(c.r, c.g, c.b); U.capH.value = h; }
    return pal;
  }
  // flat (unlit-ish) helpers
  const basic = (color, o = {}) => new THREE.MeshBasicMaterial({ color, ...o });
  function glowMat(color, o = {}) { // indicator lamps: lit standard material whose emissive is driven by the api
    const m = makeStd(color, 'paint', {}); m.metalness = 0; m.roughness = 0.25; m.emissive = new THREE.Color(color); m.emissiveIntensity = 0;
    m.userData.lampColor = new THREE.Color(color); return m;
  }
  function labelMat(texture, o = {}) {
    const { metal, rough, blotch, streak, ...rest } = o;
    const m = makeStd(0xffffff, 'label', { map: texture, ...rest }); m.metalness = metal ?? 0.2; m.roughness = rough ?? 0.5;
    enhance(m, { blotch: blotch ?? 0.08, streak: streak ?? 0.1, chip: 0, rough: 0.1, scale: 3 }); m.userData.noCap = true; return m;
  }
  // clip support: put a plane on the given materials (cap rendering + double side)
  function clipMaterials(mats, plane) {
    for (const m of mats) { m.userData.clipPlane = plane; m.clipShadows = true; }
  }
  function setClipActive(mats, on) {
    for (const m of mats) {
      const want = on ? 1 : 0, has = m.clippingPlanes && m.clippingPlanes.length ? 1 : 0;
      if (want === has) continue;
      m.clippingPlanes = on ? [m.userData.clipPlane] : null;
      const cap = on && !m.userData.noCap && m.userData.wU;
      m.side = cap ? THREE.DoubleSide : THREE.FrontSide; m.shadowSide = cap ? THREE.BackSide : null;
      if (m.userData.wU) m.userData.wU.capOn.value = cap ? 1 : 0;
      m.needsUpdate = true;
    }
  }

  // ------------------------------------------------------------------ canvas textures
  function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  function ctex(c) { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; }
  const FONT = '"Kanit", "Inter", "DejaVu Sans", sans-serif';
  const MONO = '"DejaVu Sans Mono", "Liberation Mono", monospace';
  function fit(x, txt, weight, size, maxW, fam = FONT) { let s = size; do { x.font = `${weight} ${s}px ${fam}`; s -= 2; } while (x.measureText(txt).width > maxW && s > 8); }
  // grime on a label canvas (deterministic)
  function grime(x, w, h, seed, a = 0.18) {
    for (let i = 0; i < 90; i++) {
      const px = hash(i, seed) * w, py = hash(i, seed + 1) * h, r = 4 + hash(i, seed + 2) * 40;
      const g = x.createRadialGradient(px, py, 0, px, py, r);
      g.addColorStop(0, `rgba(40,30,20,${a * hash(i, seed + 3)})`); g.addColorStop(1, 'rgba(40,30,20,0)');
      x.fillStyle = g; x.fillRect(px - r, py - r, 2 * r, 2 * r);
    }
    for (let i = 0; i < 26; i++) { // run-off streaks
      const px = hash(i, seed + 5) * w, len = h * (0.2 + 0.6 * hash(i, seed + 6));
      const g = x.createLinearGradient(0, 0, 0, len); g.addColorStop(0, `rgba(50,35,20,${a * 0.7})`); g.addColorStop(1, 'rgba(50,35,20,0)');
      x.fillStyle = g; x.fillRect(px, 0, 1.5 + 3 * hash(i, seed + 7), len);
    }
  }
  // stainless nameplate: engraved black text, 4 rivets
  function nameplateTex(lines, { w = 1024, h = 512, base = '#c9cdd1', ink = '#1d2024', title = null } = {}) {
    const c = canvas(w, h), x = c.getContext('2d');
    const g = x.createLinearGradient(0, 0, w, h); g.addColorStop(0, base); g.addColorStop(0.5, '#e3e6e8'); g.addColorStop(1, base);
    x.fillStyle = g; x.fillRect(0, 0, w, h);
    x.globalAlpha = 0.18; for (let i = 0; i < h; i += 3) { x.fillStyle = i % 6 ? '#ffffff' : '#7d8389'; x.fillRect(0, i, w, 1); } x.globalAlpha = 1; // brushed
    x.strokeStyle = ink; x.lineWidth = 6; x.strokeRect(26, 26, w - 52, h - 52);
    for (const [px, py] of [[52, 52], [w - 52, 52], [52, h - 52], [w - 52, h - 52]]) {
      x.fillStyle = '#8b9096'; x.beginPath(); x.arc(px, py, 14, 0, TAU); x.fill(); x.fillStyle = '#e8eaec'; x.beginPath(); x.arc(px - 3, py - 3, 6, 0, TAU); x.fill();
    }
    x.fillStyle = ink; x.textBaseline = 'middle';
    let y = 92;
    if (title) { fit(x, title, 700, 64, w - 170); x.textAlign = 'center'; x.fillText(title, w / 2, y + 6); y += 74; x.fillRect(80, y - 18, w - 160, 4); y += 18; }
    const lh = (h - y - 50) / Math.max(1, lines.length);
    x.textAlign = 'left';
    for (const [k, v] of lines) {
      x.font = `600 ${Math.min(40, lh * 0.62)}px ${FONT}`; x.fillText(k, 86, y + lh * 0.5);
      x.font = `500 ${Math.min(40, lh * 0.62)}px ${MONO}`; x.fillText(v, w * 0.46, y + lh * 0.5);
      y += lh;
    }
    grime(x, w, h, 77, 0.1);
    return ctex(c);
  }
  // spray-painted stencil text (transparent background, soft overspray, stencil bridges)
  function stencilTex(lines, { w = 1024, h = 256, color = '#f1ede2', size = 150 } = {}) {
    const c = canvas(w, h), x = c.getContext('2d');
    x.textAlign = 'center'; x.textBaseline = 'middle';
    const n = lines.length;
    lines.forEach((t, i) => {
      const yy = h * (i + 0.5) / n, s = typeof t === 'object' ? t[1] : size, txt = typeof t === 'object' ? t[0] : t;
      fit(x, txt, 800, s, w - 40, '"Inter", "DejaVu Sans", sans-serif');
      x.save(); x.shadowColor = color; x.shadowBlur = 10; x.globalAlpha = 0.25; x.fillStyle = color; x.fillText(txt, w / 2, yy); x.restore();
      x.fillStyle = color; x.fillText(txt, w / 2, yy);
      x.globalCompositeOperation = 'destination-out'; x.fillStyle = '#000'; // stencil bridges
      const fs = parseFloat(x.font.match(/(\d+)px/)[1]); x.fillRect(0, yy - fs * 0.04, w, fs * 0.06);
      x.globalCompositeOperation = 'source-over';
    });
    x.globalCompositeOperation = 'destination-out'; // worn paint
    for (let i = 0; i < 400; i++) { x.globalAlpha = 0.5 * hash(i, 3); x.fillRect(hash(i, 1) * w, hash(i, 2) * h, 2 + 6 * hash(i, 4), 2 + 4 * hash(i, 5)); }
    x.globalAlpha = 1; x.globalCompositeOperation = 'source-over';
    return ctex(c);
  }
  function decalMat(texture, o = {}) {
    const m = makeStd(0xffffff, 'label', { map: texture, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, ...o });
    m.metalness = 0.1; m.roughness = 0.6; m.userData.noCap = true; return m;
  }
  // gauge dial: white face, black scale 0..max, red band optional, label
  function dialTex({ max = 6000, major = 1000, minor = 200, label = 'PSI', sub = '', red = null, w = 512, unit = 'PSI', face = '#f4f1e8' } = {}) {
    const c = canvas(w, w), x = c.getContext('2d'), R = w / 2;
    x.fillStyle = face; x.beginPath(); x.arc(R, R, R, 0, TAU); x.fill();
    const a0 = -PI * 1.25, a1 = PI * 0.25; // -225deg .. +45deg (canvas angles, clockwise)
    const ang = v => a0 + (a1 - a0) * v / max;
    if (red) { x.strokeStyle = '#c0261d'; x.lineWidth = R * 0.07; x.beginPath(); x.arc(R, R, R * 0.8, ang(red[0]), ang(red[1])); x.stroke(); }
    x.strokeStyle = '#151515'; x.fillStyle = '#151515';
    for (let v = 0; v <= max + 1e-6; v += minor) {
      const a = ang(v), big = Math.abs(v / major - Math.round(v / major)) < 1e-6, r0 = R * (big ? 0.72 : 0.78);
      x.lineWidth = big ? R * 0.022 : R * 0.01;
      x.beginPath(); x.moveTo(R + Math.cos(a) * r0, R + Math.sin(a) * r0); x.lineTo(R + Math.cos(a) * R * 0.86, R + Math.sin(a) * R * 0.86); x.stroke();
      if (big) { x.font = `600 ${R * 0.12}px ${FONT}`; x.textAlign = 'center'; x.textBaseline = 'middle'; const t = max >= 10000 ? (v / 1000) + '' : v >= 1000 ? (v / 1000) + 'k' : v + ''; x.fillText(max >= 10000 ? t : (v === 0 ? '0' : String(v)), R + Math.cos(a) * R * 0.58, R + Math.sin(a) * R * 0.58); }
    }
    x.font = `700 ${R * 0.13}px ${FONT}`; x.textAlign = 'center'; x.fillText(label, R, R * 1.38);
    x.font = `500 ${R * 0.09}px ${FONT}`; x.fillText(sub || unit, R, R * 1.56);
    if (max >= 10000) { x.font = `500 ${R * 0.07}px ${FONT}`; x.fillText('x1000', R, R * 0.62); }
    grime(x, w, w, 91, 0.05);
    return ctex(c);
  }

  // ------------------------------------------------------------------ geometry helpers
  function merge(geos) {
    const list = geos.filter(Boolean).map(g => { g = g.index ? g.toNonIndexed() : g; for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k); if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2)); return g; });
    if (!list.length) return new THREE.BufferGeometry();
    return list.length === 1 ? list[0] : mergeGeometries(list);
  }
  // lathe from a profile [[r, y, smooth?], ...]; a point without `smooth` is a hard corner (crisp chamfers)
  function lathe(pts, seg = 48, p0 = 0, pl = TAU) {
    const geos = []; let run = [pts[0]];
    for (let i = 1; i < pts.length; i++) {
      run.push(pts[i]);
      if (!pts[i][2] || i === pts.length - 1) {
        if (run.length >= 2) geos.push(new THREE.LatheGeometry(run.map(p => V2(Math.max(0, p[0]), p[1])), seg, p0, pl));
        run = [pts[i]];
      }
    }
    return merge(geos);
  }
  // closed ring solid: outer profile bottom->top, inner (bore) profile bottom->top
  function ringSolid(outer, inner, seg = 48) {
    const pts = [...outer, ...inner.slice().reverse(), outer[0]];
    return lathe(pts, seg);
  }
  const toX = g => g.rotateZ(-PI / 2);   // lathe axis y -> +x
  const toZ = g => g.rotateX(PI / 2);    // lathe axis y -> +z
  function cyl(r, h, seg = 24, r2 = r, open = false) { return new THREE.CylinderGeometry(r2, r, h, seg, 1, open); }
  function cylBetween(a, b, r, seg = 12, open = false) {
    const A = a.isVector3 ? a : V3(...a), B = b.isVector3 ? b : V3(...b);
    const d = B.clone().sub(A), len = d.length();
    const g = cyl(r, len, seg, r, open);
    g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(V3(0, 1, 0), d.normalize()));
    g.translate((A.x + B.x) / 2, (A.y + B.y) / 2, (A.z + B.z) / 2);
    return g;
  }
  // chamfered box (crisp 45-degree chamfers on every edge); segs > 1 gives a rounded fillet
  function cbox(w, h, d, c = 0.01, segs = 1) {
    c = Math.min(c, w / 2 - 1e-4, h / 2 - 1e-4, d / 2 - 1e-4);
    const s = new THREE.Shape(), hw = w / 2 - c, hh = h / 2 - c;
    s.moveTo(-hw, -hh); s.lineTo(hw, -hh); s.lineTo(hw, hh); s.lineTo(-hw, hh); s.closePath();
    const g = new THREE.ExtrudeGeometry(s, { depth: d - 2 * c, bevelEnabled: true, bevelThickness: c, bevelSize: c, bevelSegments: segs, curveSegments: 1 });
    g.translate(0, 0, -(d - 2 * c) / 2);
    return g;
  }
  function rrectShape(x0, y0, x1, y1, r, holes = []) {
    const s = new THREE.Shape(); r = Math.min(r, (x1 - x0) / 2, (y1 - y0) / 2);
    s.moveTo(x0 + r, y0); s.lineTo(x1 - r, y0); s.quadraticCurveTo(x1, y0, x1, y0 + r); s.lineTo(x1, y1 - r); s.quadraticCurveTo(x1, y1, x1 - r, y1);
    s.lineTo(x0 + r, y1); s.quadraticCurveTo(x0, y1, x0, y1 - r); s.lineTo(x0, y0 + r); s.quadraticCurveTo(x0, y0, x0 + r, y0);
    for (const h of holes) s.holes.push(h);
    return s;
  }
  function circlePath(cx, cy, r, n = 32) { const p = new THREE.Path(); p.absarc(cx, cy, r, 0, TAU, true); return p; }
  // extrude a shape drawn in plan (shape x = world x, shape y = world z) between y0 and y1, optional bevel
  function slab(shape, y0, y1, bevel = 0, cs = 12) {
    const d = y1 - y0 - 2 * bevel;
    const g = new THREE.ExtrudeGeometry(shape, { depth: d, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 1, curveSegments: cs });
    g.rotateX(PI / 2); g.translate(0, y1 - bevel, 0);
    return g;
  }
  // 45-degree chamfer strip + cap face for a plan outline: planFn(inset) -> Shape; top = true chamfers the top edge at y
  function chamferRim(planFn, y, c, top = true, holes = [], div = 10) {
    const A = planFn(c).getPoints(div), Bp = planFn(0).getPoints(div);
    const n = Math.min(A.length, Bp.length), pos = [];
    const ya = y, yb = top ? y - c : y + c;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n, a0 = A[i], a1 = A[j], b0 = Bp[i], b1 = Bp[j];
      pos.push(a0.x, ya, a0.y, b0.x, yb, b0.y, a1.x, ya, a1.y, a1.x, ya, a1.y, b0.x, yb, b0.y, b1.x, yb, b1.y);
    }
    let gg = new THREE.BufferGeometry(); gg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); gg.computeVertexNormals();
    // orient outward: test the first face normal against its outward direction
    const nr = gg.attributes.normal; const cx = (A[0].x + A[1].x) / 2, cz = (A[0].y + A[1].y) / 2;
    if (nr.getX(0) * cx + nr.getZ(0) * cz < 0) gg = flipGeo(gg);
    const sh = planFn(c); for (const h of holes) sh.holes.push(h);
    const capG = new THREE.ShapeGeometry(sh, div); capG.rotateX(top ? -PI / 2 : PI / 2);
    capG.computeVertexNormals(); capG.translate(0, y, 0);
    return merge([gg, capG]);
  }
  function flipGeo(gg) { gg = gg.index ? gg.toNonIndexed() : gg; const p = gg.attributes.position.array; for (let i = 0; i < p.length; i += 9) for (let k = 0; k < 3; k++) { const t = p[i + 3 + k]; p[i + 3 + k] = p[i + 6 + k]; p[i + 6 + k] = t; } gg.attributes.position.needsUpdate = true; gg.computeVertexNormals(); return gg; }
  // extrude a shape drawn in the x-y plane along z (z0..z1)
  function extZ(shape, z0, z1, bevel = 0, cs = 12) {
    const g = new THREE.ExtrudeGeometry(shape, { depth: z1 - z0 - 2 * bevel, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 1, curveSegments: cs });
    g.translate(0, 0, z0 + bevel); return g;
  }
  // pipe through points with smooth bends (bend radius rb), returned as one geometry
  function pipe(points, r, rb = r * 3, radial = 16, caps = false) {
    const P = points.map(p => (p.isVector3 ? p.clone() : V3(...p)));
    const geos = []; let prev = P[0].clone();
    for (let i = 1; i < P.length - 1; i++) {
      const c = P[i], dIn = c.clone().sub(P[i - 1]).normalize(), dOut = P[i + 1].clone().sub(c).normalize();
      const lim = Math.min(rb, c.distanceTo(P[i - 1]) * 0.45, c.distanceTo(P[i + 1]) * 0.45);
      const p1 = c.clone().addScaledVector(dIn, -lim), p2 = c.clone().addScaledVector(dOut, lim);
      if (prev.distanceTo(p1) > 1e-4) geos.push(cylBetween(prev, p1, r, radial, true));
      geos.push(new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(p1, c, p2), 10, r, radial, false));
      prev = p2;
    }
    geos.push(cylBetween(prev, P[P.length - 1], r, radial, !caps));
    return merge(geos);
  }
  // hex nut (unit: across corners radius 1, height 1, chamfered both faces) -> flat shaded
  const NUT_G = (() => { const g = lathe([[0.55, -0.5], [0.86, -0.5], [1.0, -0.36], [1.0, 0.36], [0.86, 0.5], [0.55, 0.5]], 6); g.rotateY(PI / 6); return g; })();
  const STUD_G = (() => lathe([[0, -0.5], [0.42, -0.5], [0.5, -0.46], [0.5, 0.46], [0.42, 0.5], [0, 0.5]], 8))();
  const CAPSCREW_G = (() => lathe([[0, -0.5], [0.46, -0.5], [0.5, -0.45], [0.5, 0.45], [0.44, 0.5], [0.22, 0.5], [0.22, 0.2], [0, 0.2]], 16))(); // socket head
  // place a geometry with a transform
  function place(g, pos = [0, 0, 0], rot = [0, 0, 0], scl = 1) {
    const s = typeof scl === 'number' ? [scl, scl, scl] : scl;
    _m.compose(V3(...pos), _q.setFromEuler(_e.set(...rot)), V3(...s));
    return g.clone().applyMatrix4(_m);
  }

  // ------------------------------------------------------------------ part bins (merge per material)
  // const B = bin(); B.add('paint', geo); ... B.build(parent, mats) -> meshes
  function bin() {
    const m = new Map();
    return {
      add(key, g) { if (!g) return g; if (!m.has(key)) m.set(key, []); m.get(key).push(g); return g; },
      build(parent, mats, name) {
        const out = {};
        for (const [k, list] of m) {
          const mesh = new THREE.Mesh(merge(list), mats[k] || mats.grey);
          mesh.castShadow = true; mesh.receiveShadow = true; mesh.name = (name ? name + '_' : '') + k;
          parent.add(mesh); out[k] = mesh;
        }
        m.clear(); return out;
      },
    };
  }
  // bolts: instanced studs + nuts + cap screws. frame = Matrix4 (local +y = bolt axis)
  function boltSet() {
    const studs = [], nuts = [], caps = [];
    const M = (frame, x, y, z, sx, sy, sz, rotY = 0) => {
      const mm = new THREE.Matrix4().compose(V3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, rotY, 0)), V3(sx, sy, sz));
      return frame ? frame.clone().multiply(mm) : mm;
    };
    return {
      // ring of n studs (diameter d) at radius R, stud from y0 to y1, nuts centred at each of nutYs (nut height ~ d)
      circle(frame, R, n, d, y0, y1, nutYs = [], phase = 0.5, seed = 1) {
        const af = d * 1.55, rc = af / Math.sqrt(3); // heavy hex across flats ~ 1.55 d
        for (let i = 0; i < n; i++) {
          const a = (i + phase) / n * TAU, x = Math.cos(a) * R, z = Math.sin(a) * R;
          studs.push(M(frame, x, (y0 + y1) / 2, z, d, y1 - y0, d));
          for (const ny of nutYs) nuts.push(M(frame, x, ny, z, rc, d * 0.98, rc, hash(i + seed * 37, 9) * PI));
        }
      },
      // ring of socket cap screws (head only visible), head top at yTop
      capCircle(frame, R, n, d, yTop, phase = 0.5) {
        for (let i = 0; i < n; i++) { const a = (i + phase) / n * TAU; caps.push(M(frame, Math.cos(a) * R, yTop - d * 0.5, Math.sin(a) * R, d * 1.5, d, d * 1.5)); }
      },
      // arbitrary list of [x,y,z] stud positions along +y of the frame
      line(frame, pts, d, len, nutYOffs = [], seed = 3) {
        const rc = d * 1.55 / Math.sqrt(3);
        pts.forEach(([x, y, z], i) => {
          studs.push(M(frame, x, y, z, d, len, d));
          for (const o of nutYOffs) nuts.push(M(frame, x, y + o, z, rc, d * 0.98, rc, hash(i + seed * 13, 5) * PI));
        });
      },
      addRaw(kind, m) { ({ studs, nuts, caps })[kind].push(m); },
      build(parent, mats) {
        const mk = (geo, list, mt, name) => {
          if (!list.length) return null;
          const im = new THREE.InstancedMesh(geo, mt, list.length); list.forEach((mm, i) => im.setMatrixAt(i, mm));
          im.instanceMatrix.needsUpdate = true; im.castShadow = true; im.receiveShadow = true; im.name = name; im.computeBoundingSphere(); parent.add(im); return im;
        };
        const res = { studs: mk(STUD_G, studs, mats.stud, 'studs'), nuts: mk(NUT_G, nuts, mats.nut, 'nuts'), caps: mk(CAPSCREW_G, caps, mats.stud, 'capscrews') };
        // in a half-section, studs lying wholly behind the cut plane (z < 0) sit inside flange material: hide them
        const zero = new THREE.Matrix4().makeScale(0, 0, 0), pz = V3();
        res.hideBehind = on => {
          if (!res.studs) return;
          studs.forEach((mm, i) => { pz.setFromMatrixPosition(mm); res.studs.setMatrixAt(i, on && pz.z < -0.03 ? zero : mm); });
          res.studs.instanceMatrix.needsUpdate = true;
        };
        (parent.userData.boltSets = parent.userData.boltSets || []).push(res);
        return res;
      },
    };
  }
  const frameAt = (pos, axis = 'y', rotY = 0) => {
    const q = new THREE.Quaternion();
    if (axis === 'x') q.setFromAxisAngle(V3(0, 0, 1), -PI / 2); else if (axis === '-x') q.setFromAxisAngle(V3(0, 0, 1), PI / 2);
    else if (axis === 'z') q.setFromAxisAngle(V3(1, 0, 0), PI / 2); else if (axis === '-z') q.setFromAxisAngle(V3(1, 0, 0), -PI / 2);
    else if (axis === '-y') q.setFromAxisAngle(V3(1, 0, 0), PI);
    if (rotY) q.multiply(new THREE.Quaternion().setFromAxisAngle(V3(0, 1, 0), rotY));
    return new THREE.Matrix4().compose(V3(...pos), q, V3(1, 1, 1));
  };

  // API 6A/6BX flange data (metres): OD radius, thickness, bolt-circle radius, studs, stud diameter, ring-groove radius
  const FL = {
    '13-5/8x10M': { R: 34.88 * IN / 2, T: 7.12 * IN, BC: 30.56 * IN / 2, n: 20, d: 1.875 * IN, ring: 7.8 * IN, hub: 0.30 },
    '13-5/8x5M': { R: 26.5 * IN / 2, T: 4.44 * IN, BC: 23.25 * IN / 2, n: 16, d: 1.625 * IN, ring: 7.3 * IN, hub: 0.25 },
    '3-1/16x10M': { R: 10.62 * IN / 2, T: 2.53 * IN, BC: 8.5 * IN / 2, n: 8, d: 1.125 * IN, ring: 2.3 * IN, hub: 0.075 },
    '2-1/16x5M': { R: 8.5 * IN / 2, T: 1.81 * IN, BC: 6.5 * IN / 2, n: 8, d: 0.875 * IN, ring: 1.7 * IN, hub: 0.055 },
    '4-1/16x5M': { R: 12.25 * IN / 2, T: 2.69 * IN, BC: 9.5 * IN / 2, n: 8, d: 1.25 * IN, ring: 2.9 * IN, hub: 0.09 },
    '29-1/2x500': { R: 41.5 * IN / 2, T: 3.0 * IN, BC: 38.5 * IN / 2, n: 28, d: 1.125 * IN, ring: 15.5 * IN, hub: 0.43 },
  };
  const BORE = 13.625 * IN / 2; // 0.173 m
  // flange disc profile pieces (outer profile, bottom->top). dir +1: flange at the bottom, hub rising above it
  function flangeUp(y0, f, hubR, hubLen, c = 0.006) { // flange face at y0 (facing down), hub above
    return [[f.R - c, y0], [f.R, y0 + c], [f.R, y0 + f.T - c], [f.R - c, y0 + f.T], [hubR + 0.02, y0 + f.T], [hubR, y0 + f.T + hubLen * 0.35, 1], [hubR * 0.97, y0 + f.T + hubLen]];
  }
  function flangeDown(y1, f, hubR, hubLen, c = 0.006) { // flange face at y1 (facing up), hub below
    return [[hubR * 0.97, y1 - f.T - hubLen], [hubR, y1 - f.T - hubLen * 0.35, 1], [hubR + 0.02, y1 - f.T], [f.R - c, y1 - f.T], [f.R, y1 - f.T + c], [f.R, y1 - c], [f.R - c, y1]];
  }
  // BX/R ring gasket (octagonal) between two faces at y, groove radius rg, for the cut view
  function ringGasket(y, rg, w = 0.018) { return lathe([[rg - w / 2, y - w * 0.4], [rg - w / 2 + 0.004, y - w * 0.7], [rg + w / 2 - 0.004, y - w * 0.7], [rg + w / 2, y - w * 0.4], [rg + w / 2, y + w * 0.4], [rg + w / 2 - 0.004, y + w * 0.7], [rg - w / 2 + 0.004, y + w * 0.7], [rg - w / 2, y + w * 0.4], [rg - w / 2, y - w * 0.4]], SEG(48)); }
  // handwheel (rim + spokes + hub + spinner knob) in the local x-y plane, axis +z; radius R
  function handwheelGeo(R, spokes = 4, rimR = R * 0.075, knob = true) {
    const g = [new THREE.TorusGeometry(R, rimR, 8, SEG(36))];
    for (let i = 0; i < spokes; i++) { const a = i / spokes * TAU + PI / 4; g.push(cylBetween([0, 0, 0], [Math.cos(a) * R, Math.sin(a) * R, 0], rimR * 0.62, 6)); }
    g.push(toZ(lathe([[0, -0.03], [R * 0.16, -0.03], [R * 0.18, -0.015], [R * 0.18, 0.02], [R * 0.12, 0.04], [0, 0.04]], 16)));
    if (knob) g.push(cylBetween([R, 0, 0.0], [R, 0, R * 0.38], rimR * 0.9, 8));
    return merge(g);
  }
  // little things used on many assets
  function padEye(w = 0.12, h = 0.14, t = 0.04, hole = 0.028) { // lifting pad eye standing on y=0, plate in x-y
    const s = new THREE.Shape(); s.moveTo(-w / 2, 0); s.lineTo(w / 2, 0); s.lineTo(w / 2, h - w / 2); s.absarc(0, h - w / 2, w / 2, 0, PI, false); s.lineTo(-w / 2, 0);
    s.holes.push(circlePath(0, h - w / 2, hole));
    return extZ(s, -t / 2, t / 2, 0.004, 12);
  }
  function hexPlug(r, h) { return lathe([[0, 0], [r * 0.95, 0], [r, h * 0.15], [r, h * 0.85], [r * 0.9, h], [0, h]], 6); }
  // gauge (bezel + glass + dial + needle) facing +z, radius r, stem down. returns { group, setValue(v01) }
  function gauge(mats, r, dial, { stem = 0.08, bezel = 'stainless', back = true } = {}) {
    const g = new THREE.Group();
    const B = bin();
    B.add(bezel, toZ(lathe([[0, -0.035], [r * 1.0, -0.035], [r * 1.08, -0.02], [r * 1.08, 0.012], [r * 1.02, 0.018], [r * 0.97, 0.014], [r * 0.96, 0.004], [0, 0.004]], SEG(40))));
    if (stem) { B.add('brass', cylBetween([0, -r * 0.95, -0.012], [0, -r - stem, -0.012], r * 0.1, 10)); B.add('brass', place(hexPlug(r * 0.16, r * 0.16), [0, -r - stem * 0.6, -0.012])); }
    B.build(g, mats);
    const face = new THREE.Mesh(new THREE.CircleGeometry(r * 0.95, SEG(40)), labelMat(dial, { metal: 0, rough: 0.6, streak: 0.0, blotch: 0.04 }));
    face.position.z = 0.006; g.add(face);
    const needle = new THREE.Group(); needle.position.z = 0.012; g.add(needle); needle.name = 'needle';
    const ng = merge([place(new THREE.BoxGeometry(r * 0.04, r * 0.82, 0.003), [0, r * 0.33, 0]), place(new THREE.BoxGeometry(r * 0.07, r * 0.25, 0.003), [0, -r * 0.1, 0]), toZ(cyl(r * 0.07, 0.006, 12))]);
    const nm = makeStd(0x151515, 'dark', {}); nm.metalness = 0.3; nm.roughness = 0.4;
    needle.add(new THREE.Mesh(ng, nm));
    // dial spans -225..+45 deg (canvas clockwise) = needle angle +135 .. -135 deg around +z
    const setValue = v => { needle.rotation.z = lerp(PI * 0.75, -PI * 0.75, clamp(v, 0, 1.04)); };
    setValue(0);
    const glass = new THREE.Mesh(new THREE.CircleGeometry(r * 0.97, SEG(32)), new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0, roughness: 0.05, transparent: true, opacity: 0.12, depthWrite: false }));
    glass.position.z = 0.016; g.add(glass);
    return { group: g, setValue, needle };
  }

  // make a group with api/anchors/parts conventions
  function asset(name) {
    const g = new THREE.Group(); g.name = name; g.api = {}; g.anchors = {}; g.parts = {};
    g.anchor = (k, pos, parent = g) => { const o = new THREE.Object3D(); o.name = 'anchor_' + k; o.position.set(...pos); parent.add(o); g.anchors[k] = o; return o; };
    g.part = (k, obj) => { obj.name = k; g.parts[k] = obj; return obj; };
    return g;
  }
  // clipping plane per asset: removes the half toward +z (camera side) of a local frame; u sweeps from closed to half
  function cutter(g, mats, { axis = V3(0, 0, -1), extent = 1.0, offset = 0 } = {}) {
    const plane = new THREE.Plane(axis.clone(), 1e6);
    clipMaterials(mats, plane);
    const local = new THREE.Plane(); const nrm = new THREE.Matrix3();
    let u0 = 0;
    const set = (u = u0) => {
      u0 = u;
      for (const m of mats) m.userData.clipPlane = plane; // last cutter assigned wins (a stack overrides its parts)
      setClipActive(mats, u > 0);
      g.traverse(o => { if (o.userData.boltSets) for (const b of o.userData.boltSets) b.hideBehind(u > 0); if (o.userData.onCut) o.userData.onCut(u > 0); });
      if (u <= 0) return;
      local.set(axis, lerp(extent, offset, easeIO(u))); // plane: axis . p + c >= 0 is kept
      g.updateWorldMatrix(true, false);
      plane.copy(local).applyMatrix4(g.matrixWorld, nrm.getNormalMatrix(g.matrixWorld));
    };
    set(0);
    return { plane, set, refresh: () => set(u0) };
  }
  function collectMats(root, exclude = []) {
    const ex = new Set(exclude), out = new Set();
    root.traverse(o => { if (!o.isMesh) return; for (const m of [].concat(o.material)) if (m && !ex.has(m) && (m.userData.wU || m.userData.noCap) && !m.transparent) out.add(m); else if (m && m.userData.noCap && !ex.has(m)) out.add(m); });
    return [...out];
  }
  function triCount(root) {
    let t = 0; root.traverse(o => { if (!o.isMesh || !o.visible) return; const g = o.geometry; const n = (g.index ? g.index.count : g.attributes.position.count) / 3; t += n * (o.isInstancedMesh ? o.count : 1); });
    return Math.round(t);
  }

  // lathe with per-segment materials: pts [[r, y, smooth?, matKey?]] (matKey = material of the segment that starts here)
  function latheM(pts, seg, def = 'paint', p0 = 0, pl = TAU) {
    const out = {}; let run = [pts[0]], key = pts[0][3] || def;
    const flush = () => { if (run.length >= 2) (out[key] = out[key] || []).push(new THREE.LatheGeometry(run.map(p => V2(Math.max(0, p[0]), p[1])), seg, p0, pl)); };
    for (let i = 1; i < pts.length; i++) {
      run.push(pts[i]);
      const nk = pts[i][3] || key;
      if (!pts[i][2] || nk !== key || i === pts.length - 1) { flush(); run = [pts[i]]; key = nk; }
    }
    for (const k of Object.keys(out)) out[k] = merge(out[k]);
    return out;
  }
  function addM(B, geos, xf = null) { for (const [k, g] of Object.entries(geos)) B.add(k, xf ? xf(g) : g); }
  function subdiv(pts, n) { const o = []; for (let i = 0; i < pts.length - 1; i++) for (let k = 0; k < n; k++) { const u = k / n; o.push([lerp(pts[i][0], pts[i + 1][0], u), lerp(pts[i][1], pts[i + 1][1], u)]); } o.push(pts[pts.length - 1]); return o; }
  // indexed revolve grid (no seam), runs = strips with hard edges between them; keeps rest (r, y, theta) for deformers
  function revolveGrid(runs, N) {
    const pos = [], idx = [], rest = []; let base = 0;
    for (const run of runs) {
      const M = run.length;
      for (let j = 0; j < M; j++) for (let i = 0; i < N; i++) { const th = i / N * TAU, [r, y] = run[j]; pos.push(r * Math.sin(th), y, r * Math.cos(th)); rest.push(r, y, th); }
      for (let j = 0; j < M - 1; j++) for (let i = 0; i < N; i++) {
        const a = base + j * N + i, b = base + j * N + (i + 1) % N, c = base + (j + 1) * N + i, d = base + (j + 1) * N + (i + 1) % N;
        idx.push(a, b, c, b, d, c);
      }
      base += M * N;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
    g.userData.rest = new Float32Array(rest);
    return g;
  }
  // drill pipe prop: 5" body r 0.0635 with an optional 6-5/8" tool joint (18 deg tapers) centred at yTJ
  const PIPE_R = 2.5 * IN, TJ_R = 3.3125 * IN;
  function pipeProfileR(y, yTJ) { // radius of the pipe prop at height y
    if (yTJ == null) return PIPE_R;
    const d = Math.abs(y - yTJ), half = 0.24, tap = (TJ_R - PIPE_R) / Math.tan(18 * PI / 180) * 0.35;
    if (d < half) return TJ_R; if (d < half + tap) return lerp(TJ_R, PIPE_R, (d - half) / tap); return PIPE_R;
  }
  function drillPipeGeo(y0, y1, yTJ = null) {
    const pts = [[0, y0]], tap = (TJ_R - PIPE_R) / Math.tan(18 * PI / 180) * 0.35;
    if (yTJ != null) { pts.push([PIPE_R, y0], [PIPE_R, yTJ - 0.24 - tap], [TJ_R, yTJ - 0.24], [TJ_R, yTJ - 0.01], [TJ_R - 0.003, yTJ], [TJ_R, yTJ + 0.01], [TJ_R, yTJ + 0.24], [PIPE_R, yTJ + 0.24 + tap], [PIPE_R, y1]); }
    else pts.push([PIPE_R, y0], [PIPE_R, y1]);
    pts.push([0, y1]);
    return lathe(pts, SEG(28));
  }

  // ================================================================== ANNULAR PREVENTER (13-5/8" 5M, piston + donut)
  // local y = 0 at the bottom flange face. Top (studded, 5M) at y = 1.20.
  // api: setClose(u)  piston stroke 0..140 mm; the element closes onto the current target and bulges (vertex deform)
  //      setTarget('pipe'|'hex'|'square'|'open')  what is in the bore (shows the matching prop)
  //      setPropY(y)   moves the pipe prop (tool joint centre at local y; null = plain pipe) for stripping
  //      setCut(u)     half-section sweep (0 closed .. 1 half removed toward +z)
  // anchors: element, piston, closeChamber, openChamber, top, bottom, toolJoint
  function annularPreventer(o = {}) {
    const g = asset('annular');
    const P = palette(o.colors), PI_ = tintCaps(palette(o.colors), 0xa7b2be, -1); // body / internals (internals cut too: rings read as halves)
    const B = bin(), bolts = boltSet(), seg = SEG(72);
    const F10 = FL['13-5/8x10M'], F5 = FL['13-5/8x5M'];
    // ---- body (bottom flange, hub flaring out to the piston housing, inner sleeve)
    addM(B, latheM([[BORE, 0, 0, 'machined'], [F10.R - 0.006, 0, 0, 'paint'], [F10.R, 0.006], [F10.R, F10.T - 0.006], [F10.R - 0.006, F10.T], [0.40, F10.T], [0.55, 0.25, 1], [0.62, 0.30, 1], [0.655, 0.34], [0.66, 0.36],
      [0.66, 0.725], [0.73, 0.735], [0.73, 0.80, 0, 'machined'], [0.572, 0.80], [0.572, 0.36], [0.31, 0.36], [0.31, 0.478], [0.30, 0.48], [0.20, 0.48], [0.185, 0.47], [BORE, 0.45], [BORE, 0]], seg));
    // ---- head (bolted cover with a lip, dome, studded 5M top)
    addM(B, latheM([[0.572, 0.80, 0, 'machined'], [0.73, 0.80, 0, 'paint'], [0.73, 0.865], [0.722, 0.873], [0.668, 0.873], [0.665, 0.885], [0.645, 0.94, 1], [0.60, 0.99, 1], [0.53, 1.035, 1], [0.45, 1.07, 1], [0.36, 1.09], [F5.R + 0.006, 1.095],
      [F5.R, 1.10], [F5.R, 1.194], [F5.R - 0.006, 1.20, 0, 'machined'], [0.19, 1.20], [BORE, 1.185], [BORE, 0.95], [0.186, 0.894], [0.36, 0.879], [0.545, 0.859], [0.572, 0.842], [0.572, 0.80]], seg));
    // head lip studs (24 x 1"), nuts on top
    bolts.circle(null, 0.70, 24, 1.0 * IN, 0.75, 0.873 + 0.045, [0.873 + 0.0125], 0.5, 4);
    // ring groove gasket on the top face (visible in section), bell-nipple studs are added by the stack
    B.add('machined', ringGasket(0.80, 0.64, 0.016));
    // lifting pad eyes on the dome (welded, radial plates)
    for (const a of [PI / 2 - 0.0, -PI / 2]) B.add('paint', place(padEye(0.13, 0.15, 0.045, 0.03), [Math.cos(a) * 0.50, 1.02, Math.sin(a) * 0.50], [0, -a + PI / 2, 0]));
    // hydraulic ports (close below the piston, open above), back-left side, with JIC fittings + hose stubs
    for (const [y, k] of [[0.42, 0], [0.70, 1]]) {
      const a = PI + 0.55 + k * 0.18, cx = Math.cos(a), cz = Math.sin(a);
      B.add('paint', place(toX(cyl(0.05, 0.07, 16)), [cx * 0.685, y, cz * 0.685], [0, -a, 0]));
      B.add('brass', place(toX(hexPlug(0.03, 0.04)), [cx * 0.72, y, cz * 0.72], [0, -a, 0]));
      B.add('hose', pipe([[cx * 0.75, y, cz * 0.75], [cx * 0.86, y, cz * 0.86], [cx * 0.92, y - 0.12, cz * 0.92], [cx * 0.98, 0.04, cz * 0.98 - 0.3]], 0.016, 0.08, 10));
    }
    // nameplate + stencil on the front (+z)
    const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.662, 0.662, 0.13, 16, 1, true, -0.2, 0.4), labelMat(nameplateTex([['TYPE', 'ANNULAR BOP'], ['SIZE', '13-5/8"'], ['WP', '5,000 PSI'], ['BTM CONN', '10M 6BX'], ['SER. NO.', 'A-1371-22']], { title: 'ANNULAR PREVENTER' })));
    plate.position.y = 0.53; plate.rotation.y = 0; g.add(plate);
    const sten = new THREE.Mesh(new THREE.CylinderGeometry(0.664, 0.664, 0.16, 24, 1, true, 0.45, 0.9), decalMat(stencilTex([['5M', 170], ['13-5/8"', 70]], { w: 512, h: 256 })));
    sten.position.y = 0.53; g.add(sten);
    const body = B.build(g, P, 'annBody');
    bolts.build(g, P);

    // ---- piston (moves up 0.14)
    const piston = new THREE.Group(); g.add(g.part('piston', piston));
    const yp = 0.37;
    addM(B, latheM([[0.315, yp, 0, 'machined'], [0.565, yp], [0.565, yp + 0.34], [0.548, yp + 0.34], [0.33, yp + 0.12], [0.315, yp + 0.12], [0.315, yp]], seg, 'machined'));
    for (const y of [yp + 0.05, yp + 0.27]) B.add('rubber', lathe([[0.558, y - 0.008], [0.571, y - 0.008], [0.571, y + 0.008], [0.558, y + 0.008], [0.558, y - 0.008]], seg));
    B.add('rubber', lathe([[0.309, yp + 0.04], [0.322, yp + 0.04], [0.322, yp + 0.056], [0.309, yp + 0.056], [0.309, yp + 0.04]], seg));
    B.build(piston, PI_, 'piston');

    // ---- element: deformable rubber donut + 12 steel inserts
    const RIN = 0.186, YB = 0.49, YT = 0.888, H = YT - YB;
    const prof = [
      subdiv([[0.335, YB], [0.535, 0.71]], 10).concat(subdiv([[0.535, 0.71], [0.545, 0.80], [0.54, 0.855]], 4).slice(1)),
      subdiv([[0.54, 0.855], [0.36, 0.876], [0.20, 0.888], [RIN, 0.876]], 6),
      subdiv([[RIN, 0.876], [RIN - 0.004, 0.69], [RIN, 0.505]], 12),
      subdiv([[RIN, 0.505], [0.20, YB], [0.335, YB]], 6),
    ];
    const eg = revolveGrid(prof, SEG(112));
    const rest = eg.userData.rest, epos = eg.attributes.position;
    const routRest = y => y <= 0.71 ? lerp(0.335, 0.535, (y - YB) / 0.22) : y <= 0.80 ? lerp(0.535, 0.545, (y - 0.71) / 0.09) : lerp(0.545, 0.54, (y - 0.80) / 0.055);
    const NV = epos.count, sArr = new Float32Array(NV), tArr = new Float32Array(NV);
    for (let i = 0; i < NV; i++) { const r = rest[i * 3], y = rest[i * 3 + 1]; tArr[i] = clamp((y - YB) / H); sArr[i] = clamp((r - RIN) / (routRest(clamp(y, YB, 0.855)) - RIN)); }
    const element = new THREE.Mesh(eg, PI_.rubber); element.castShadow = element.receiveShadow = true;
    g.add(g.part('element', element));
    const NI = 12, insG = (() => {
      const tp = new THREE.Shape(); tp.moveTo(-0.018, 0); tp.lineTo(0.018, 0); tp.lineTo(0.034, 0.25); tp.lineTo(-0.034, 0.25); tp.closePath();
      const top = extZ(tp, -0.011, 0.011, 0.003); top.rotateX(-PI / 2); top.rotateX(-0.11); top.translate(0, 0.873, 0.19); // plate along +z (radial)
      const bp = new THREE.Shape(); bp.moveTo(-0.017, 0); bp.lineTo(0.017, 0); bp.lineTo(0.025, 0.08); bp.lineTo(-0.025, 0.08); bp.closePath();
      const bot = extZ(bp, -0.012, 0.012, 0.003); bot.rotateX(-PI / 2); bot.translate(0, 0.517, 0.19);
      const web = cbox(0.022, 0.34, 0.10, 0.004); web.translate(0, 0.70, 0.19 + 0.05);
      return merge([top, bot, web]);
    })();
    const inserts = new THREE.InstancedMesh(insG, PI_.machined, NI); inserts.castShadow = inserts.receiveShadow = true;
    g.add(g.part('inserts', inserts));
    // props in the bore
    const props = {
      pipe: new THREE.Mesh(drillPipeGeo(-0.6, 1.9, null), P.machined),
      tj: new THREE.Mesh(drillPipeGeo(-0.6, 1.9, 0.0), P.machined),
      hex: new THREE.Mesh(lathe([[0, -0.6], [0.054 / Math.cos(PI / 6), -0.6], [0.054 / Math.cos(PI / 6), 1.9], [0, 1.9]], 6), P.machined),
      square: new THREE.Mesh(lathe([[0, -0.6], [0.054 * Math.SQRT2, -0.6], [0.054 * Math.SQRT2, 1.9], [0, 1.9]], 4), P.machined),
    };
    const pipeM = mat(0x46505b, { kind: 'steel', metal: 0.7, rough: 0.42, blotch: 0.2, streak: 0.1, scale: 2, noW: false });
    for (const [k, m] of Object.entries(props)) { m.material = pipeM; m.castShadow = m.receiveShadow = true; m.visible = false; g.add(g.part('prop_' + k, m)); }
    props.hex.rotation.y = 0; props.square.rotation.y = PI / 4;

    // ---- state + deformer
    let target = o.target || 'pipe', propY = null, close = 0;
    const tjAnchor = g.anchor('toolJoint', [0, 0.7, 0]);
    const rt = (th, y) => {
      if (target === 'open') return 0.0;
      if (target === 'hex') { const a = 0.054, s = PI / 3; return a / Math.cos(((th % s) + s) % s - s / 2); }
      if (target === 'square') { const a = 0.054, s = PI / 2; return a / Math.cos((((th - PI / 4) % s) + s) % s - s / 2); }
      return pipeProfileR(y, propY);
    };
    const insAng = k => k / NI * TAU + PI / 2; // k = 0 and 6 lie on the section plane
    function deform() {
      const e = close, dy = 0.14 * e, ec = easeIO(clamp(e / 0.9));
      const open = target === 'open';
      for (let i = 0; i < NV; i++) {
        const r0 = rest[i * 3], y0 = rest[i * 3 + 1], th = rest[i * 3 + 2], s = sArr[i], t = tArr[i];
        const w = Math.pow(1 - s, 2.2);
        let y = y0 + (t - 0.5) * H * (open ? 0.5 : 0.34) * ec * w;
        const rinT = rt(th, y);
        const rin = lerp(RIN, rinT, ec);
        const coneR = 0.335 + (y0 - YB - dy) * 0.909, rr = routRest(clamp(y0, YB, 0.855));
        const rout = Math.max(rin + 0.03, Math.min(rr, coneR));
        let r = rin + s * (rout - rin) + (r0 - (RIN + s * (rr - RIN)));
        // rubber between the steel inserts bulges further in (petals); stronger with nothing in the bore
        const ph = (th * NI / TAU) % 1, between = 0.5 - 0.5 * Math.cos(ph * TAU); // 0 at an insert, 1 between
        r -= (open ? 0.03 : 0.006) * ec * w * (between - 0.35);
        r = Math.max(open ? 0.0025 : rinT, r);
        epos.setXYZ(i, r * Math.sin(th), y, r * Math.cos(th));
      }
      epos.needsUpdate = true; eg.computeVertexNormals(); eg.computeBoundingSphere();
      lastEc = ec; updateInserts();
      piston.position.y = dy;
    }
    let lastEc = 0, lastCut = false;
    function updateInserts() {
      const cutOn = !!(inserts.material.clippingPlanes && inserts.material.clippingPlanes.length); lastCut = cutOn;
      for (let k = 0; k < NI; k++) {
        const th = insAng(k), tip = Math.max(lerp(0.19, rt(th, 0.70) + 0.006, lastEc), 0.088);
        // in a half-section, inserts wholly behind the plane are buried in rubber: hide them (k = 0, 6 show their section)
        const hide = cutOn && Math.cos(th) < -0.05;
        _m.compose(V3(Math.sin(th) * (tip - 0.19), 0, Math.cos(th) * (tip - 0.19)), _q.setFromAxisAngle(V3(0, 1, 0), th), hide ? V3(0, 0, 0) : V3(1, 1, 1));
        inserts.setMatrixAt(k, _m);
      }
      inserts.instanceMatrix.needsUpdate = true; inserts.computeBoundingSphere();
    }
    inserts.userData.onCut = updateInserts;
    function showProps() {
      props.pipe.visible = target === 'pipe' && propY == null; props.tj.visible = target === 'pipe' && propY != null;
      props.hex.visible = target === 'hex'; props.square.visible = target === 'square';
      if (propY != null) props.tj.position.y = propY; tjAnchor.position.y = propY ?? 0.7;
    }
    g.api.setClose = u => { close = clamp(u); deform(); };
    g.api.setTarget = (k = 'pipe') => { target = k; showProps(); deform(); };
    g.api.setPropY = y => { propY = y; showProps(); deform(); };
    g.api.showProps = v => { if (!v) for (const m of Object.values(props)) m.visible = false; else showProps(); };
    g.userData.cutMats = collectMats(g, [pipeM]);
    const cut = cutter(g, g.userData.cutMats, { extent: 0.8 });
    g.api.setCut = u => cut.set(u);
    g.api.refreshCut = () => cut.refresh();
    g.anchor('element', [0, 0.70, 0.36]); g.anchor('piston', [0, 0.55, 0.45]); g.anchor('closeChamber', [0, 0.40, 0.45]); g.anchor('openChamber', [0, 0.76, 0.52]);
    g.anchor('top', [0, 1.20, 0]); g.anchor('bottom', [0, 0, 0]);
    g.userData.height = 1.20;
    showProps(); deform();
    return g;
  }

  // ================================================================== RAM PREVENTER (single / double, 13-5/8" 10M)
  // ramPreventer({ cavities: ['bsr','vbr'] (bottom -> top) | ['pipe'], pipe: true (own drill pipe pieces), pipeExtent:[y0,y1],
  //                floorY (local y of the cellar floor for the hose runs), bonnetSide })
  // local y = 0 at the bottom flange face (flanged bottom, studded top at y = height). Rams move along x; camera +z.
  // api (cavity index i, 0 = lowest):
  //   setClose(i, u)   ram travel: accelerate, cruise, hard mechanical stop at u = 0.86, packers pre-load to u = 1
  //   setLock(i, u)    manual lock screw: handwheel turns 8 x u, screw advances to the piston (only reaches it when closed)
  //   setPipeR(i, r)   VBR: pipe radius the inserts fan to (default 2.5" pipe)
  //   setShear(u)      BSR only: 0..0.55 rams travel, pipe crushes from blade contact, cut at ~0.6, lower piece drops,
  //                    seal faces meet and pre-load by 1. (Use instead of setClose for the BSR cavity.)
  //   sparkLevel(u)    0..1 hook for the lead's spark particles (peaks at the cut); setSparks(on) shows built-in sparks
  //   setCut(u)        half-section (removes +z half of body, bonnets, cylinders; internals stay whole)
  // anchors: ram<i>L, ram<i>R, bonnet<i>L/R, lock<i>L/R, port<i>L/R (hydraulic close port), shear (BSR cut point), top, bottom
  function ramPreventer(o = {}) {
    const cav = (o.cavities || ['pipe']).map(c => (typeof c === 'string' ? { type: c } : c));
    const g = asset(cav.length > 1 ? 'doubleRam' : 'singleRam');
    const P = palette(o.colors), PI_ = palette(o.colors);
    const B = bin(), bolts = boltSet(), seg = SEG(64);
    const F10 = FL['13-5/8x10M'];
    const LX = 0.70, LZ = 0.42, HC = 0.26, CZ = 0.22, YB0 = 0.24;
    // vertical layout
    const yc = []; let y = YB0 + 0.23;
    for (let i = 0; i < cav.length; i++) { yc.push(y + HC / 2); y += HC + (i < cav.length - 1 ? 0.31 : 0); }
    const H = y + 0.23; g.userData.height = H; g.userData.cavityY = yc;
    // ---- bottom flange + hub (lathe), body slabs (plan extrusions with the bore / cavities as real voids)
    addM(B, latheM([[BORE, 0, 0, 'machined'], [F10.R - 0.006, 0, 0, 'paint'], [F10.R, 0.006], [F10.R, F10.T - 0.006], [F10.R - 0.006, F10.T], [0.33, F10.T], [0.31, YB0 - 0.02, 1], [0.30, YB0 + 0.005], [BORE, YB0 + 0.005, 0, 'machined'], [BORE, 0]], seg));
    const plan = (holes = true) => rrectShape(-LX, -LZ, LX, LZ, 0.075, holes ? [circlePath(0, 0, BORE, 48)] : []);
    const bands = []; // solid bands between cavities (with bore)
    let yy = YB0;
    for (let i = 0; i < cav.length; i++) { bands.push([yy, yc[i] - HC / 2]); yy = yc[i] + HC / 2; }
    bands.push([yy, H]);
    const planI = c => rrectShape(-LX + c, -LZ + c, LX - c, LZ - c, 0.075 - c);
    const CH = 0.02;
    bands.forEach(([a, b], k) => {
      const a2 = k === 0 ? a + CH : a, b2 = k === bands.length - 1 ? b - CH : b;
      B.add('paint', slab(plan(), a2, b2, 0, 24));
      B.add('machined', lathe([[BORE - 0.0008, b2 + (k === bands.length - 1 ? CH : 0)], [BORE - 0.0008, a2 - (k === 0 ? CH : 0)]], seg)); // machined bore liner
    });
    B.add('paint', chamferRim(planI, H, CH, true, [circlePath(0, 0, BORE, 48)]));
    B.add('paint', chamferRim(planI, YB0, CH, false, [circlePath(0, 0, BORE, 48)]));
    for (const c of yc) { // cavity layer: front + back walls only (cavity is a through slot closed by the bonnets)
      for (const s of [1, -1]) {
        const sh = s > 0 ? rrectShape(-LX, CZ, LX, LZ, 0.075) : rrectShape(-LX, -LZ, LX, -CZ, 0.075);
        B.add('paint', slab(sh, c - HC / 2, c + HC / 2, 0, 24));
      }
      B.add('machined', place(new THREE.BoxGeometry(2 * LX - 0.02, 0.004, 2 * CZ), [0, c - HC / 2 + 0.002, 0])); // ram guide wear plate
    }
    // top: studded face with ring gasket groove ring (machined), lifting eyes
    B.add('machined', lathe([[BORE, H], [F10.R * 0.98, H], [F10.R * 0.98, H + 0.002], [BORE, H + 0.002], [BORE, H]], seg));
    B.add('machined', ringGasket(H + 0.001, F10.ring / 2 + 0.06, 0.018));
    for (const s of [1, -1]) B.add('paint', place(padEye(0.14, 0.16, 0.05, 0.032), [s * 0.56, H, 0], [0, PI / 2, 0]));
    // ---- bonnets, operating cylinders, locks, handwheels, ports, hoses (per cavity per side)
    const parts = [];
    for (let i = 0; i < cav.length; i++) {
      const c = cav[i], big = c.type === 'bsr', yC = yc[i];
      const L = big ? 0.66 : 0.46, Rb = big ? 0.29 : 0.235, Rin = Rb - 0.035;
      const travel = big ? 0.31 : BORE + 0.015;
      const pc = { yC, L, Rb, Rin, travel, side: {} };
      for (const s of [1, -1]) {
        const xb = LX, xc = LX + 0.15; // bonnet outer face
        const shB = rrectShape(-0.40, -0.275, 0.40, 0.275, 0.07, [circlePath(0, 0, 0.058, 24)]);
        const bon = extZ(shB, 0, 0.15, 0.014, 10); bon.rotateY(PI / 2); bon.translate(xb, yC, 0);
        // cylinder: flange ring + barrel + head cap + lock housing (closed ring solid with the piston chamber as void)
        const cp = latheM([[0.058, 0, 0, 'paint'], [Rb + 0.04, 0], [Rb + 0.04, 0.05], [Rb, 0.06], [Rb, L - 0.07], [Rb + 0.045, L - 0.065], [Rb + 0.045, L - 0.005], [Rb + 0.035, L], [0.13, L], [0.13, L + 0.02, 1], [0.105, L + 0.03], [0.105, L + 0.2], [0.095, L + 0.21],
          [0.045, L + 0.21, 0, 'machined'], [0.045, L - 0.03], [Rin, L - 0.03], [Rin, 0.035], [0.058, 0.035], [0.058, 0, 0, 'paint']], SEG(48));
        const geoX = gg => { gg = toX(gg); if (s < 0) gg.rotateY(PI); gg.translate(s * xc, yC, 0); return gg; };
        addM(B, cp, geoX);
        const bonX = bon.clone(); if (s < 0) bonX.rotateY(PI); B.add(big ? 'paint' : 'paint', bonX);
        // bonnet bolts (6 large socket cap screws on the bonnet face), cylinder flange + head studs
        const fb = new THREE.Matrix4().compose(V3(s * xc, yC, 0), new THREE.Quaternion().setFromAxisAngle(V3(0, 0, 1), -s * PI / 2), V3(1, 1, 1));
        for (const [zz, dy] of [[0.31, 0.2], [-0.31, 0.2], [0.31, -0.2], [-0.31, -0.2], [0.33, 0], [-0.33, 0]]) {
          bolts.addRaw('caps', fb.clone().multiply(new THREE.Matrix4().compose(V3(-dy * s, 0.022, zz), _q.identity(), V3(0.066, 0.044, 0.066))));
        }
        const fc = new THREE.Matrix4().compose(V3(s * xc, yC, 0), new THREE.Quaternion().setFromAxisAngle(V3(0, 0, 1), -s * PI / 2), V3(1, 1, 1));
        bolts.circle(fc, Rb + 0.022, 12, 0.75 * IN, 0.0, 0.085, [0.064], 0.5, 11 + i * 3 + (s > 0 ? 0 : 1));
        bolts.circle(fc, Rb + 0.025, 12, 0.875 * IN, L - 0.07, L + 0.03, [L + 0.012], 0.0, 17 + i * 3 + (s > 0 ? 0 : 1));
        // weep hole boss under the bonnet (tell-tale)
        B.add('paint', place(cyl(0.018, 0.03, 12), [s * (xb + 0.075), yC - 0.29, 0.12]));
        B.add('black', place(cyl(0.008, 0.032, 10), [s * (xb + 0.075), yC - 0.29, 0.12]));
        // hydraulic ports on the cylinder top: close (head end) + open (bonnet end), fittings, hoses to the floor/back
        const ports = [];
        for (const [k, xx] of [['close', L - 0.13], ['open', 0.13]]) {
          const px = s * (xc + xx), py = yC + Rb;
          B.add('paint', place(cyl(0.038, 0.05, 16), [px, py + 0.012, 0]));
          B.add('nut', place(hexPlug(0.026, 0.035), [px, py + 0.035, 0]));
          B.add('machined', place(cyl(0.017, 0.05, 12), [px, py + 0.09, 0]));
          // JIC elbow + crimped ferrule, then the hose
          const floorY = o.floorY ?? -0.3, zEnd = -0.95 - 0.04 * i - (k === 'open' ? 0.05 : 0), xEnd = s * (0.95 + 0.06 * i + (k === 'open' ? 0.04 : 0));
          B.add('machined', pipe([[px, py + 0.11, 0], [px, py + 0.145, 0], [px, py + 0.145, -0.06]], 0.017, 0.03, 10));
          B.add('nut', place(toZ(hexPlug(0.026, 0.05)), [px, py + 0.145, -0.08]));
          B.add('stainless', place(toZ(cyl(0.024, 0.07, 12)), [px, py + 0.145, -0.135]));
          const hp = [V3(px, py + 0.145, -0.17), V3(px, py + 0.15, -0.36), V3(lerp(px, xEnd, 0.5), lerp(py, floorY, 0.35), -0.62), V3(xEnd, floorY + 0.22, zEnd + 0.1), V3(xEnd, floorY + 0.03, zEnd - 0.25), V3(xEnd * 1.02, floorY + 0.03, -1.9)];
          B.add('hose', new THREE.TubeGeometry(new THREE.CatmullRomCurve3(hp, false, 'centripetal'), 56, 0.019, 10, false));
          ports.push([px, py + 0.145, 0]);
        }
        pc.side[s] = { ports, xc };
        g.anchor(`bonnet${i}${s > 0 ? 'R' : 'L'}`, [s * (xb + 0.08), yC, 0.42]);
        g.anchor(`port${i}${s > 0 ? 'R' : 'L'}`, ports[0]);
        g.anchor(`lock${i}${s > 0 ? 'R' : 'L'}`, [s * (xc + L + 0.3), yC, 0]);
      }
      parts.push(pc);
    }
    // nameplate + pressure-rating stencil on the body front (+z)
    const np = new THREE.Mesh(new THREE.PlaneGeometry(0.36, 0.18), labelMat(nameplateTex([['TYPE', cav.length > 1 ? 'DOUBLE RAM BOP' : 'SINGLE RAM BOP'], ['SIZE', '13-5/8"'], ['WP', '10,000 PSI'], ['TEST', '15,000 PSI'], ['SER. NO.', cav.length > 1 ? 'R-2211-07' : 'R-2211-09']], { title: 'RAM PREVENTER' })));
    np.position.set(-0.43, yc[0], LZ + 0.003); g.add(np);
    const st = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.2), decalMat(stencilTex([['10M', 150], ['13-5/8" WP 10,000 PSI', 46]], { w: 768, h: 300 })));
    st.position.set(0.30, cav.length > 1 ? (yc[0] + yc[1]) / 2 : yc[0] + 0.0, LZ + 0.002); g.add(st);
    if (cav.length > 1) {
      const tags = cav.map((c, i) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.24, 0.07), decalMat(stencilTex([[c.type === 'bsr' ? 'BLIND SHEAR' : c.type === 'vbr' ? 'VBR 3-1/2"-5"' : 'PIPE 5"', 120]], { w: 512, h: 150, color: '#f6d34a' }))); m.position.set(-0.43, yc[i] + 0.15, LZ + 0.002); g.add(m); return m; });
    }
    B.build(g, P, 'ramBody');
    // ---- bolts at the studded top are added by the stack; here only the body bolts
    bolts.build(g, P);

    // ---- internals (not clipped: shown whole)
    const IB = bin();
    const api = g.api, state = parts.map(() => ({ u: 0, lock: 0, pr: PIPE_R }));
    const blocks = [];
    function planNotch(x0, x1, w, rn, rr = 0.035) {
      const s = new THREE.Shape();
      s.moveTo(x0, -w); s.lineTo(x1 - rr, -w); s.quadraticCurveTo(x1, -w, x1, -w + rr); s.lineTo(x1, w - rr); s.quadraticCurveTo(x1, w, x1 - rr, w); s.lineTo(x0, w);
      if (rn > x0 + 1e-4) { const zc = Math.sqrt(rn * rn - x0 * x0), a = Math.atan2(zc, x0); s.lineTo(x0, zc); s.absarc(0, 0, rn, a, -a, true); s.lineTo(x0, -w); }
      s.closePath(); return s;
    }
    const RW = 0.21, RH = 0.11; // ram half width (z), half height (y)
    function topSealGeo(x0, rOut, w = 0.022, h = 0.009) { // horseshoe top seal on the ram top (y = RH)
      const s = new THREE.Shape(); s.absarc(x0, 0, rOut, -PI / 2, PI / 2, false); s.absarc(x0, 0, rOut - w, PI / 2, -PI / 2, true); s.closePath();
      return slab(s, RH - 0.004, RH + h, 0, 24);
    }
    for (let i = 0; i < parts.length; i++) {
      const c = cav[i], pc = parts[i];
      pc.rams = {};
      for (const s of [1, -1]) {
        const ram = new THREE.Group(); ram.position.set(s * pc.travel, pc.yC, 0); if (s < 0) ram.rotation.y = PI;
        g.add(g.part(`ram${i}${s > 0 ? 'R' : 'L'}`, ram));
        const RB = bin(); const LR = c.type === 'bsr' ? 0.36 : 0.42;
        const ramParts = { group: ram, packer: null, inserts: null, type: c.type, s };
        if (c.type === 'pipe') {
          RB.add('machined', slab(planNotch(0.045, LR, RW, PIPE_R + 0.004), -RH, RH, 0.004));
          RB.add('machined', slab(planNotch(0.0, 0.047, RW - 0.004, PIPE_R + 0.002), 0.072, RH - 0.002));
          RB.add('machined', slab(planNotch(0.0, 0.047, RW - 0.004, PIPE_R + 0.002), -RH + 0.002, -0.072));
          const pk = new THREE.Mesh(slab(planNotch(-0.003, 0.05, RW - 0.006, PIPE_R + 0.001), -0.072, 0.072), PI_.rubber); ram.add(pk); ramParts.packer = pk;
          RB.add('rubber', topSealGeo(0.05, RW - 0.012));
        } else if (c.type === 'vbr') {
          RB.add('machined', slab(planNotch(0.09, LR, RW, 0.15), -RH, RH, 0.004));
          const pk = new THREE.Mesh(new THREE.BufferGeometry(), PI_.rubber); ram.add(pk); ramParts.packer = pk;
          RB.add('rubber', topSealGeo(0.09, RW - 0.012));
          // steel insert fingers (top + bottom rows), instanced, fan to the pipe size
          const ig = cbox(0.05, 0.024, 0.024, 0.004);
          const ins = new THREE.InstancedMesh(ig, PI_.machined, 14); ram.add(ins); ramParts.inserts = ins;
        } else { // blind-shear: side profile extrusions (blade upper on the R ram, lower on the L ram)
          const prof = s > 0
            ? { main: [[0.36, -RH], [0.36, RH], [0.10, RH], [0.10, 0.04], [0.13, 0.04], [0.13, 0.0], [0.0, 0.0], [0.0, -RH]], blade: [[0.10, RH], [0.03, RH], [-0.11, 0.075], [-0.13, 0.06], [-0.13, 0.04], [0.10, 0.04]] }
            : { main: [[0.36, -RH], [0.36, RH], [0.13, RH], [0.13, 0.04], [0.10, 0.04], [0.10, 0.0], [0.0, 0.0], [0.0, -RH]], blade: [[0.10, 0.04], [-0.11, 0.04], [-0.13, 0.025], [-0.13, 0.0], [0.10, 0.0]] };
          const sh = pts => { const q = new THREE.Shape(); q.moveTo(...pts[0]); for (const p of pts.slice(1)) q.lineTo(...p); q.closePath(); return q; };
          RB.add('machined', extZ(sh(prof.main), -RW, RW, 0.003));
          RB.add('carbide', extZ(sh(prof.blade), -RW + 0.01, RW - 0.01, 0.002));
          const pk = new THREE.Mesh(extZ(sh([[-0.004, -0.095], [0.03, -0.095], [0.03, -0.012], [-0.004, -0.012]]), -RW + 0.012, RW - 0.012, 0.002), PI_.rubber); ram.add(pk); ramParts.packer = pk;
          RB.add('rubber', topSealGeo(0.12, RW - 0.012));
        }
        // ram-to-rod button (T-slot) on the back
        RB.add('machined', place(toX(cyl(0.06, 0.04, 20)), [LR + 0.02, 0, 0]));
        RB.build(ram, PI_, `ram${i}`);
        ramParts.LR = LR;
        // rod + piston + lock screw (in the cylinder)
        const rodLen = pc.side[s].xc + 0.05 - (pc.travel + LR) + 0.0;
        const rod = new THREE.Mesh(toX(cyl(0.048, 1, 20)), PI_.chrome); rod.castShadow = true; g.add(rod);
        const pist = new THREE.Group(); g.add(pist);
        IB.add('machined', toX(lathe([[0.0, -0.035], [pc.Rin - 0.004, -0.035], [pc.Rin - 0.001, -0.03], [pc.Rin - 0.001, 0.03], [pc.Rin - 0.004, 0.035], [0.0, 0.035]], SEG(40))));
        IB.add('rubber', toX(lathe([[pc.Rin - 0.012, -0.012], [pc.Rin + 0.0, -0.012], [pc.Rin + 0.0, 0.012], [pc.Rin - 0.012, 0.012], [pc.Rin - 0.012, -0.012]], SEG(40))));
        IB.build(pist, PI_, 'piston');
        const screw = new THREE.Mesh(toX(cyl(0.032, 1, 16)), PI_.machined); g.add(screw);
        const wheel = new THREE.Mesh(handwheelGeo(0.19, 3).rotateY(s > 0 ? PI / 2 : -PI / 2), P.yellow); wheel.castShadow = true; g.add(wheel);
        // short lock-extension shaft between housing and wheel (static)
        const shaftX0 = pc.side[s].xc + pc.L + 0.21;
        B.add('machined', place(toX(cyl(0.028, 0.16, 12)), [s * (shaftX0 + 0.08), pc.yC, 0]));
        ramParts.rod = rod; ramParts.piston = pist; ramParts.screw = screw; ramParts.wheel = wheel; ramParts.wheelX = s * (shaftX0 + 0.17);
        pc.rams[s] = ramParts;
      }
    }
    B.build(g, P, 'lockShafts');
    // ---- BSR drill pipe pieces (deformable tubes split at the shear plane)
    const bsrI = cav.findIndex(c => c.type === 'bsr');
    let pipeUp = null, pipeLo = null, yS = 0;
    const PZ = 0.18;
    function tubeGrid(y0, y1, cutAtTop) {
      const ri = PIPE_R - 0.362 * IN, n = 26, ys = [];
      for (let k = 0; k <= n; k++) { const u = k / n, f = Math.pow(u, 2.2); ys.push(cutAtTop ? y1 - (y1 - y0) * f : y0 + (y1 - y0) * f); }
      ys.sort((a, b) => a - b);
      const outer = ys.map(y => [PIPE_R, y]), inner = ys.slice().reverse().map(y => [ri, y]);
      const runs = [outer, [[PIPE_R, y1], [ri, y1]], inner, [[ri, y0], [PIPE_R, y0]]];
      return revolveGrid(runs, SEG(28));
    }
    if (bsrI >= 0) {
      yS = parts[bsrI].yC + 0.04;
      const ext = o.pipeExtent || [-0.4, H + 0.4];
      const pm = mat(0x46505b, { kind: 'steel', metal: 0.7, rough: 0.42, blotch: 0.2, streak: 0.1, scale: 2 });
      g.userData.pipeMat = pm;
      if (o.pipe !== false) {
        pipeUp = new THREE.Mesh(tubeGrid(yS, ext[1], false), pm); pipeLo = new THREE.Mesh(tubeGrid(ext[0], yS, true), pm);
        for (const m of [pipeUp, pipeLo]) { m.castShadow = m.receiveShadow = true; g.add(m); }
        g.part('pipeUpper', pipeUp); g.part('pipeLower', pipeLo);
      }
      g.anchor('shear', [0, yS, 0]);
    } else if (o.pipe !== false) {
      const pm = mat(0x46505b, { kind: 'steel', metal: 0.7, rough: 0.42, blotch: 0.2, streak: 0.1, scale: 2 });
      const ext = o.pipeExtent || [-0.4, H + 0.4];
      const pp = new THREE.Mesh(drillPipeGeo(ext[0], ext[1]), pm); pp.castShadow = true; g.add(g.part('pipe', pp));
    }
    function deformPipe(m, f, shift, drop, up) {
      if (!m) return;
      const gg = m.geometry, rest = gg.userData.rest, pos = gg.attributes.position;
      for (let k = 0; k < pos.count; k++) {
        const r = rest[k * 3], y0 = rest[k * 3 + 1], th = rest[k * 3 + 2];
        const d = Math.abs(y0 - yS), w = d < PZ ? Math.pow(1 - d / PZ, 2) : 0;
        let x = r * Math.sin(th), z = r * Math.cos(th);
        x = x * (1 - 0.8 * f * w) + shift * w; z = z * (1 + 0.42 * f * w);
        pos.setXYZ(k, x, y0 - drop + (up ? 1 : -1) * 0.0, z);
      }
      pos.needsUpdate = true; gg.computeVertexNormals(); gg.computeBoundingSphere();
    }
    // sparks (hook + optional built-in streaks, deterministic in u)
    const NS = 48, sparks = new THREE.InstancedMesh(new THREE.BoxGeometry(0.004, 0.004, 0.03), new THREE.MeshBasicMaterial({ color: 0xffd9a0, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }), NS);
    sparks.visible = false; sparks.frustumCulled = false; g.add(g.part('sparks', sparks)); let sparksOn = false;
    const shearCut = 0.60;
    api.sparkLevel = u => sstep(shearCut - 0.12, shearCut - 0.01, u) * (1 - sstep(shearCut + 0.0, shearCut + 0.1, u));
    api.setSparks = on => { sparksOn = !!on; sparks.visible = sparksOn; };

    function place_(i, u) {
      const pc = parts[i], c = cav[i];
      const xf = lerp(pc.travel, 0, ramTravel(u));
      for (const s of [1, -1]) {
        const R = pc.rams[s];
        R.group.position.x = s * xf;
        const pre = sstep(0.86, 1, u);
        if (R.packer) R.packer.position.x = -0.0 * pre; // packers protrude 3 mm, pre-loaded flat at u = 1
        if (R.packer) R.packer.scale.x = 1 - 0.06 * pre;
        if (c.type === 'vbr') {
          const rI = lerp(0.105, state[i].pr + 0.003, sstep(0.55, 0.95, u));
          R.packer.geometry.dispose(); R.packer.geometry = slab(planNotch(-0.003, 0.095, RW - 0.006, rI - 0.003), -0.085, 0.085, 0, 16);
          for (let k = 0; k < 7; k++) for (let row = 0; row < 2; row++) {
            const a = lerp(-1.25, 1.25, k / 6), rr = rI + 0.026;
            _m.compose(V3(Math.cos(a) * rr, row ? 0.074 : -0.074, Math.sin(a) * rr), _q.setFromAxisAngle(V3(0, 1, 0), -a), V3(1, 1, 1));
            R.inserts.setMatrixAt(k * 2 + row, _m);
          }
          R.inserts.instanceMatrix.needsUpdate = true; R.inserts.computeBoundingSphere();
        }
        // rod from the ram back to the piston, piston in the cylinder, lock screw behind the piston
        const back = xf + R.LR + 0.04, pistX = pc.side[s].xc + pc.L - 0.12 - (pc.travel - xf); // piston face (head side)
        const pX = Math.max(pc.side[s].xc + 0.08, pistX);
        R.rod.position.set(s * (back + pX) / 2, pc.yC, 0); R.rod.scale.set(Math.max(0.01, pX - back), 1, 1); // unit length along x
        R.piston.position.set(s * pX, pc.yC, 0);
        const lk = state[i].lock, home = pc.side[s].xc + pc.L - 0.03, tip = lerp(home, pX + 0.036, Math.min(1, lk * (pc.travel > 0 ? 1 : 0)) * ramTravel(u));
        const wheelX = Math.abs(R.wheelX);
        R.screw.position.set(s * (tip + wheelX) / 2, pc.yC, 0); R.screw.scale.set(Math.max(0.01, wheelX - tip), 1, 1);
        R.wheel.position.set(R.wheelX, pc.yC, 0); R.wheel.rotation.x = s * lk * 8 * TAU;
      }
    }
    const placeAll = place_;
    api.setClose = (i, u) => { state[i].u = clamp(u); placeAll(i, state[i].u); };
    api.setLock = (i, u) => { state[i].lock = clamp(u); placeAll(i, state[i].u); };
    api.setPipeR = (i, r) => { state[i].pr = r; placeAll(i, state[i].u); };
    api.setShear = u => {
      if (bsrI < 0) return; u = clamp(u);
      state[bsrI].u = u; placeAll(bsrI, u);
      const xf = lerp(parts[bsrI].travel, 0, ramTravel(u));
      const contact = PIPE_R + 0.13, cutX = 0.13;
      const f = clamp((contact - xf) / (contact - cutX));
      const post = clamp((cutX - xf) / 0.06);
      deformPipe(pipeUp, f, -0.05 * post, 0, true);
      deformPipe(pipeLo, f, 0.05 * post, 0.06 * sstep(0, 1, post), false);
      if (sparksOn) {
        const lv = api.sparkLevel(u), tt = (u - (shearCut - 0.12)) * 3;
        for (let k = 0; k < NS; k++) {
          const a = hash(k, 1) * TAU, sp = 0.6 + hash(k, 2) * 1.2, t0 = hash(k, 3) * 0.25, t = Math.max(0, tt - t0);
          const px = Math.cos(a) * sp * t * 0.5, pz = Math.sin(a) * sp * t * 0.5, py = 0.3 * sp * t - 2.0 * t * t;
          const vis = lv > 0.02 && t > 0 && t < 0.35;
          _m.compose(V3(px, yS + py, pz), _q.setFromUnitVectors(V3(0, 0, 1), V3(Math.cos(a), 0.3 - 4 * t, Math.sin(a)).normalize()), V3(1, 1, vis ? 1 + 3 * sp : 0));
          sparks.setMatrixAt(k, _m);
        }
        sparks.instanceMatrix.needsUpdate = true;
      }
    };
    g.userData.cutMats = collectMats(g, [...Object.values(PI_), g.userData.pipeMat].filter(Boolean));
    const cut = cutter(g, g.userData.cutMats, { extent: 0.9 });
    api.setCut = u => cut.set(u);
    api.refreshCut = () => cut.refresh();
    for (let i = 0; i < parts.length; i++) {
      g.anchor(`ram${i}L`, [0.2, 0, 0], g.parts[`ram${i}L`]); g.anchor(`ram${i}R`, [0.2, 0, 0], g.parts[`ram${i}R`]);
      if (cav[i].type === 'bsr') api.setShear(0); else api.setClose(i, 0);
    }
    g.anchor('top', [0, H, 0]); g.anchor('bottom', [0, 0, 0]);
    g.userData.parts = parts;
    return g;
  }

  // ================================================================== GATE VALVE (flanged, flow along x, centred at 0)
  // gateValve({ size: '3-1/16x10M', kind: 'manual'|'hcr'|'check', pal })
  // api.setOpen(u): manual = handwheel turns (12.5 turns for full stroke, rising-stem tail) / hcr = actuator indicator rod
  //                 rises, hydraulic / check = disc swings (cut view only)
  function gateValve(o = {}) {
    const kind = o.kind || 'manual', f = FL[o.size || '3-1/16x10M'], k = f.R / FL['3-1/16x10M'].R;
    const g = asset('gateValve_' + kind);
    const P = o.pal || palette(o.colors), B = bin(), bolts = o.bolts || boltSet();
    const ftf = (o.ftf || 0.52) * k, hw = ftf / 2, bodyW = 0.27 * k;
    const bodyKey = o.bodyKey || 'grey';
    // body (chamfered block) + end hubs + flanges
    B.add(bodyKey, cbox(bodyW, 0.30 * k, 0.25 * k, 0.025 * k));
    for (const s of [1, -1]) {
      const pr = [[0.039 * k, 0], [f.R - 0.004, 0], [f.R, 0.004], [f.R, f.T - 0.004], [f.R - 0.006, f.T], [f.hub + 0.012 * k, f.T], [f.hub, f.T + 0.03 * k, 1], [f.hub * 0.95, hw - bodyW / 2 + 0.01], [0.039 * k, hw - bodyW / 2 + 0.01], [0.039 * k, 0]];
      const gg = toX(lathe(pr, SEG(32))); // flange face at x=0, hub to +x
      if (s > 0) gg.rotateY(PI); gg.translate(s * hw, 0, 0);
      B.add(bodyKey, gg);
    }
    B.add('machined', place(toX(cyl(0.034 * k, ftf + 0.002, 20, 0.034 * k, true)), [0, 0, 0])); // bore (seen through the flange)
    B.add(bodyKey, place(hexPlug(0.022 * k, 0.03 * k), [0, -0.15 * k - 0.03 * k, 0.0], [PI, 0, 0])); // body drain plug
    const top = 0.15 * k;
    let handle = null, stem = null;
    if (kind !== 'check') {
      // bonnet flange (8 studs), bonnet, packing, stem
      B.add(bodyKey, lathe([[0, top], [0.14 * k, top], [0.142 * k, top + 0.004], [0.142 * k, top + 0.045 * k], [0.10 * k, top + 0.05 * k], [0.095 * k, top + 0.15 * k], [0.06 * k, top + 0.16 * k], [0.05 * k, top + 0.2 * k], [0, top + 0.2 * k]], SEG(32)));
      bolts.circle(frameAt([g.position.x, 0, 0]), 0.118 * k, 8, 0.875 * IN * k, top - 0.02, top + 0.075 * k, [top + 0.056 * k], 0.5, 31);
    }
    if (kind === 'manual') {
      B.add('nut', place(hexPlug(0.045 * k, 0.04 * k), [0, top + 0.2 * k, 0]));
      B.add('machined', place(cyl(0.045 * k, 0.05 * k, 20), [0, top + 0.26 * k, 0])); // bearing cap
      const wheel = new THREE.Group(); wheel.position.y = top + 0.33 * k; g.add(g.part('handwheel', wheel));
      const wm = new THREE.Mesh(handwheelGeo(0.21 * k, 5, 0.016 * k).rotateX(-PI / 2), o.wheelMat || P.wheel); wm.castShadow = true; wheel.add(wm);
      stem = new THREE.Mesh(cyl(0.019 * k, 0.32 * k, 12), P.machined); stem.castShadow = true; g.add(g.part('stemTail', stem));
      handle = wheel;
      g.api.setOpen = u => { u = clamp(u); wheel.rotation.y = -u * 12.5 * TAU; stem.position.y = top + 0.33 * k + 0.02 + u * 0.075 * k; };
    } else if (kind === 'hcr') {
      // hydraulic actuator: yoke + cylinder + top cap + indicator rod + 2 ports with hoses
      const y0 = top + 0.2 * k;
      B.add(bodyKey, lathe([[0, y0], [0.12 * k, y0], [0.12 * k, y0 + 0.025 * k], [0.165 * k, y0 + 0.03 * k], [0.165 * k, y0 + 0.06 * k], [0.15 * k, y0 + 0.07 * k], [0.15 * k, y0 + 0.36 * k], [0.168 * k, y0 + 0.37 * k], [0.168 * k, y0 + 0.40 * k], [0.15 * k, y0 + 0.41 * k], [0.05 * k, y0 + 0.41 * k], [0.04 * k, y0 + 0.43 * k], [0, y0 + 0.43 * k]], SEG(40)));
      bolts.circle(null, 0.157 * k, 8, 0.625 * IN * k, y0 + 0.33 * k, y0 + 0.43 * k, [y0 + 0.41 * k + 0.01], 0.5, 37);
      bolts.circle(null, 0.157 * k, 8, 0.625 * IN * k, y0 + 0.0, y0 + 0.10 * k, [y0 + 0.07 * k], 0.5, 38);
      for (const [yy, a] of [[y0 + 0.11 * k, 0.6], [y0 + 0.31 * k, 0.6]]) {
        const cx = Math.cos(a) * 0.15 * k, cz = -Math.sin(a) * 0.15 * k;
        B.add('nut', place(toX(hexPlug(0.022 * k, 0.04 * k)), [cx, yy, cz], [0, a, 0]));
        B.add('hose', pipe([[cx + 0.03 * k, yy, cz - 0.02 * k], [cx + 0.12 * k, yy, cz - 0.08 * k], [cx + 0.18 * k, yy - 0.2, cz - 0.3], [cx + 0.2 * k, -0.9, cz - 0.7]], 0.014, 0.06, 8));
      }
      stem = new THREE.Mesh(cyl(0.02 * k, 0.2 * k, 12), P.yellow); stem.castShadow = true; g.add(g.part('indicator', stem));
      g.api.setOpen = u => { u = clamp(u); stem.position.y = y0 + 0.43 * k + 0.02 * k + easeIO(u) * 0.09 * k; };
      g.anchor('actuator', [0, y0 + 0.2 * k, 0.17 * k]);
      // OPEN / CLOSED tag plate
      const tag = new THREE.Mesh(new THREE.PlaneGeometry(0.16 * k, 0.06 * k), labelMat(nameplateTex([], { title: 'HCR', w: 512, h: 200 })));
      tag.position.set(0, y0 + 0.2 * k, 0.152 * k); g.add(tag);
    } else { // check valve: bolted flat cover + flow arrow
      B.add(bodyKey, place(cbox(0.25 * k, 0.05 * k, 0.24 * k, 0.012), [0, top + 0.025 * k, 0]));
      bolts.line(null, [[-0.095, 0, -0.09], [0, 0, -0.095], [0.095, 0, -0.09], [-0.095, 0, 0.09], [0, 0, 0.095], [0.095, 0, 0.09]].map(([x, y, z]) => [x * k, top + 0.05 * k, z * k]), 0.75 * IN * k, 0.06 * k, [0.012 * k], 41);
      const ar = new THREE.Shape(); ar.moveTo(-0.07, -0.012); ar.lineTo(0.03, -0.012); ar.lineTo(0.03, -0.03); ar.lineTo(0.08, 0); ar.lineTo(0.03, 0.03); ar.lineTo(0.03, 0.012); ar.lineTo(-0.07, 0.012); ar.closePath();
      B.add(bodyKey, place(extZ(ar, 0, 0.006 * k, 0.001), [0, 0, 0.125 * k], [0, 0, 0], k));
      g.api.setOpen = () => {};
    }
    B.build(g, P, 'valve');
    if (!o.bolts) bolts.build(g, P);
    // end-flange studs (the mating flange's nuts) are added by whoever bolts it in; anchors at both faces
    g.anchor('in', [-hw, 0, 0]); g.anchor('out', [hw, 0, 0]); g.anchor('top', [0, top + 0.45 * k, 0]);
    g.userData.ftf = ftf; g.userData.flange = f;
    g.userData.cutMats = Object.values(P);
    g.api.setOpen(o.open ?? 0);
    return g;
  }

  // ================================================================== DRILLING SPOOL (13-5/8 10M, 3-1/16 10M side outlets)
  function drillingSpool(o = {}) {
    const g = asset('spool'); const P = o.pal || palette(o.colors), B = bin(), bolts = o.bolts || boltSet();
    const F10 = FL['13-5/8x10M'], F3 = FL['3-1/16x10M'], H = 0.66, yc = H / 2;
    addM(B, latheM([[BORE, 0, 0, 'machined'], ...flangeUp(0, F10, 0.32, 0.05).map(p => [...p.slice(0, 2), p[2] || 0, 'grey']), [0.32, H / 2, 1, 'grey'],
      ...flangeDown(H, F10, 0.32, 0.05).map(p => [...p.slice(0, 2), p[2] || 0, 'grey']), [BORE, H, 0, 'machined'], [BORE, 0]], SEG(64), 'grey'));
    for (const s of [1, -1]) { // outlet bosses with studded faces
      const gg = toX(lathe([[0.039, 0.25], [0.105, 0.25], [0.105, 0.40], [0.1, 0.42], [0.039, 0.42], [0.039, 0.25]], SEG(32)));
      if (s < 0) gg.rotateY(PI); gg.translate(0, yc, 0); B.add('grey', gg);
      bolts.circle(frameAt([s * 0.42, yc, 0], s > 0 ? 'x' : '-x'), F3.BC, F3.n, F3.d, -0.05, F3.T + F3.d + 0.012, [F3.T + F3.d * 0.5], 0.5, 51 + (s > 0 ? 0 : 1));
    }
    // stencil
    const st = new THREE.Mesh(new THREE.CylinderGeometry(0.323, 0.323, 0.1, 16, 1, true, -0.5, 1.0), decalMat(stencilTex([['DRILLING SPOOL 13-5/8" 10M', 70]], { w: 1024, h: 128 })));
    st.position.y = yc + 0.11; g.add(st);
    B.build(g, P, 'spool'); if (!o.bolts) bolts.build(g, P);
    g.userData.height = H; g.userData.outletY = yc;
    g.anchor('choke', [0.42, yc, 0]); g.anchor('kill', [-0.42, yc, 0]);
    g.userData.cutMats = collectMats(g);
    return g;
  }

  // ================================================================== CASING HEAD (13-5/8 10M top, 2-1/16 5M outlets)
  function casingHead(o = {}) {
    const g = asset('casingHead'); const P = o.pal || palette(o.colors), B = bin(), bolts = o.bolts || boltSet();
    const F10 = FL['13-5/8x10M'], F2 = FL['2-1/16x5M'], H = 0.62;
    addM(B, latheM([[0.171, 0, 0, 'grey'], [0.245, 0], [0.25, 0.012], [0.275, 0.05, 1], [0.31, 0.11], [0.312, 0.30], [0.30, 0.37],
      ...flangeDown(H, F10, 0.30, 0.04).slice(2), [BORE, H, 0, 'machined'], [BORE, 0.315], [0.158, 0.30], [0.158, 0.25, 0, 'grey'], [0.171, 0.25], [0.171, 0]], SEG(64), 'grey'));
    // casing (13-3/8") + landing base plate
    B.add('gun', lathe([[0.157, -0.9], [0.170, -0.9], [0.170, 0.25], [0.157, 0.25], [0.157, -0.9]], SEG(48)));
    B.add('skid', place(cbox(1.1, 0.04, 1.1, 0.008), [0, -0.02, 0]));
    // side outlets: +x valve, -x flange + bull plug + needle valve + gauge
    const yo = 0.19;
    for (const s of [1, -1]) {
      const gg = toX(lathe([[0.026, 0.28], [0.07, 0.28], [0.07, 0.37], [0.066, 0.38], [0.026, 0.38], [0.026, 0.28]], SEG(24)));
      if (s < 0) gg.rotateY(PI); gg.translate(0, yo, 0); B.add('grey', gg);
      bolts.circle(frameAt([s * 0.38, yo, 0], s > 0 ? 'x' : '-x'), F2.BC, F2.n, F2.d, -0.03, F2.T * 2 + F2.d + 0.01, [F2.T * 2 + F2.d * 0.5], 0.5, 61 + (s > 0 ? 0 : 1));
    }
    const v = gateValve({ size: '2-1/16x5M', kind: 'manual', pal: P, bolts, ftf: 0.42 }); v.position.set(0.38 + v.userData.ftf / 2, yo, 0); g.add(g.part('outletValve', v));
    // companion flange + bull plug on the -x side, with a needle valve and casing gauge
    B.add('grey', place(toX(lathe([[0, 0], [F2.R, 0], [F2.R, F2.T * 2], [0.04, F2.T * 2 + 0.01], [0.04, F2.T * 2 + 0.06], [0, F2.T * 2 + 0.06]], SEG(24))), [-0.38, yo, 0], [0, PI, 0]));
    B.add('stainless', place(toX(cyl(0.012, 0.1, 10)), [-0.38 - F2.T * 2 - 0.1, yo, 0]));
    B.add('stainless', place(cbox(0.05, 0.05, 0.05, 0.006), [-0.38 - F2.T * 2 - 0.17, yo, 0]));
    B.add('wheel', place(cyl(0.01, 0.06, 8), [-0.38 - F2.T * 2 - 0.17, yo, 0.05], [PI / 2, 0, 0]));
    B.add('stainless', place(cyl(0.009, 0.08, 10), [-0.38 - F2.T * 2 - 0.17, yo + 0.065, 0]));
    const gs = gauge(P, 0.055, dialTex({ max: 5000, major: 1000, minor: 250, label: 'CASING', sub: 'PSI' }), { stem: 0.02 });
    gs.group.position.set(-0.38 - F2.T * 2 - 0.17, yo + 0.16, 0.0); g.add(g.part('gauge', gs.group));
    B.build(g, P, 'casingHead'); if (!o.bolts) bolts.build(g, P);
    g.userData.height = H; g.userData.cutMats = collectMats(g, [P.skid, ...collectMats(v)]);
    g.api.setGauge = v_ => gs.setValue(v_); g.api.setValve = u => v.api.setOpen(u);
    g.anchor('bowl', [0, 0.315, 0]); g.anchor('outlet', [0.38, yo, 0]);
    return g;
  }

  // ================================================================== BELL NIPPLE (16" with 10" flowline outlet)
  function bellNipple(o = {}) {
    const g = asset('bellNipple'); const P = o.pal || palette(o.colors), B = bin();
    const F5 = FL['13-5/8x5M'], H = 0.95, R = 0.203;
    B.add('grey', lathe([[0.19, 0], [F5.R - 0.005, 0], [F5.R, 0.005], [F5.R, F5.T - 0.005], [F5.R - 0.005, F5.T], [R + 0.02, F5.T], [R, F5.T + 0.03], [R, H - 0.06], [R + 0.03, H - 0.02], [R + 0.035, H], [R + 0.02, H + 0.005], [R - 0.012, H - 0.01], [R - 0.012, 0.02], [0.19, 0.0]], SEG(56)));
    // 10" flowline outlet toward -z, sloping down, flanged end; 2" fill-up line toward -x with a small valve
    const fl = [V3(0, 0.62, -R + 0.03), V3(0, 0.56, -0.62)];
    B.add('grey', cylBetween(fl[0], fl[1], 0.137, SEG(28)));
    B.add('grey', place(lathe([[0.13, 0], [0.24, 0], [0.24, 0.04], [0.145, 0.05], [0.13, 0.05]], SEG(28)), [0, 0.556, -0.6], [-PI / 2 + 0.1, 0, 0]));
    B.add('grey', cylBetween([-R + 0.02, 0.45, 0], [-0.42, 0.45, 0], 0.03, 12));
    B.add('wheel', place(cyl(0.05, 0.012, 16), [-0.33, 0.52, 0]));
    B.add('grey', place(cbox(0.07, 0.07, 0.06, 0.008), [-0.33, 0.45, 0]));
    B.add('grey', place(cyl(0.008, 0.07, 8), [-0.33, 0.49, 0]));
    B.build(g, P, 'bell');
    g.userData.height = H; g.userData.cutMats = collectMats(g);
    g.anchor('flowline', [0, 0.56, -0.66]); g.anchor('top', [0, H, 0]);
    return g;
  }

  // ================================================================== BOP STACK (director.md §4 order)
  // bopStack({ pipe: true, lines: true })  y = 0 at the cellar floor (casing-head base). Top of the bell nipple ~5.9 m.
  // api: setCut(u)                 one half-section plane through the whole stack (+z half removed)
  //      setAnnular(u)             annular element closes on the drill pipe (setAnnularTarget('pipe'|'open'|'hex'|'square'))
  //      setUpperRam(u)            upper VBR (double body, upper cavity)
  //      setBSR(u)                 blind-shear: travel, crush, cut (~0.6), seal (see ramPreventer.setShear)
  //      setLowerRam(u)            single lower pipe ram
  //      setLock(which, u)         which = 'upper'|'bsr'|'lower': manual lock screws / handwheels
  //      setChokeManual(u), setChokeHCR(u), setKillManual(u)   side valves (HCR indicator rises when open)
  //      setPipeVisible(bool), setHoses(bool), setLines(bool)
  // anchors: bell, annular, upperRam, bsr, spool, lowerRam, casingHead, chokeOutlet, killOutlet, chokeManual, chokeHCR,
  //          killManual, killCheck, chokeLineEnd, killLineEnd, hoseBundle, shear, flowline, tiers (array of [name, y0, y1])
  function bopStack(o = {}) {
    const g = asset('bopStack');
    const F10 = FL['13-5/8x10M'], F5 = FL['13-5/8x5M'];
    const bolts = boltSet(), P = palette(o.colors);
    const ch = casingHead({}); const I0 = ch.userData.height;
    const lower = ramPreventer({ cavities: ['pipe'], pipe: false, floorY: -I0 }); lower.position.y = I0;
    const I1 = I0 + lower.userData.height;
    const spool = drillingSpool({}); spool.position.y = I1; const I2 = I1 + spool.userData.height;
    const dbl = ramPreventer({ cavities: ['bsr', 'vbr'], pipe: o.pipe !== false, floorY: -I2, pipeExtent: [-(I2 + 0.8), 7.4 - I2] }); dbl.position.y = I2;
    const I3 = I2 + dbl.userData.height;
    const ann = annularPreventer({}); ann.position.y = I3; ann.api.showProps(false);
    const I4 = I3 + ann.userData.height;
    const bell = bellNipple({}); bell.position.y = I4;
    for (const [k, c] of [['casingHead', ch], ['lowerRam', lower], ['spool', spool], ['doubleRam', dbl], ['annular', ann], ['bell', bell]]) g.add(g.part(k, c));
    const nh = d => d * 0.98;
    // flange joints
    const both = (I, f, ph = 0.5) => bolts.circle(null, f.BC, f.n, f.d, I - f.T - nh(f.d) - 0.012, I + f.T + nh(f.d) + 0.012, [I - f.T - nh(f.d) / 2, I + f.T + nh(f.d) / 2], ph, Math.round(I * 100));
    const studded = (I, f, ph = 0.5) => bolts.circle(null, f.BC, f.n, f.d, I - 0.05, I + f.T + nh(f.d) + 0.014, [I + f.T + nh(f.d) / 2], ph, Math.round(I * 100));
    both(I0, F10); studded(I1, F10); both(I2, F10); studded(I3, F10); studded(I4, F5);
    // side valves on the spool: choke (+x): manual (inner) -> HCR (outer); kill (-x): manual -> check
    const yo = I1 + spool.userData.outletY, F3 = FL['3-1/16x10M'];
    const vb = boltSet();
    const mkV = (kind, side, idx) => {
      const v = gateValve({ kind, bolts: vb, bodyKey: 'grey' });
      const L = v.userData.ftf, x0 = 0.42 + idx * L;
      v.position.set(side * (x0 + L / 2), yo, 0); if (side < 0) v.rotation.y = PI;
      g.add(v);
      // flange-to-flange studs at the outer face (nuts both sides); the inner face of idx 0 is on studs from the spool
      const xf = side * (x0 + L);
      vb.circle(frameAt([xf, yo, 0], side > 0 ? 'x' : '-x'), F3.BC, F3.n, F3.d, -F3.T - nh(F3.d) - 0.01, F3.T + nh(F3.d) + 0.01, [-F3.T - nh(F3.d) / 2, F3.T + nh(F3.d) / 2], 0.5, 71 + idx + (side > 0 ? 0 : 5));
      return v;
    };
    const vCM = g.part('chokeManual', mkV('manual', 1, 0)), vCH = g.part('chokeHCR', mkV('hcr', 1, 1));
    const vKM = g.part('killManual', mkV('manual', -1, 0)), vKC = g.part('killCheck', mkV('check', -1, 1));
    // companion flanges + choke / kill lines (3" XXS hard pipe) down into the cellar and out
    const LB = bin(), xEnd = 0.42 + 2 * 0.52;
    const lines = new THREE.Group(); g.add(g.part('lines', lines));
    for (const s of [1, -1]) {
      const r = s > 0 ? 0.0445 : 0.0365;
      LB.add('grey', place(toX(lathe([[r - 0.012, 0], [F3.R, 0], [F3.R, F3.T], [r + 0.03, F3.T + 0.02], [r + 0.012, F3.T + 0.07], [r - 0.012, F3.T + 0.07], [r - 0.012, 0]], SEG(28))), [s * (xEnd + F3.T + 0.07), yo, 0], s > 0 ? [0, PI, 0] : [0, 0, 0]));
      const run = [[s * (xEnd + F3.T + 0.07), yo, 0], [s * (xEnd + 0.45), yo, 0], [s * (xEnd + 0.45), 0.35, 0], [s * (xEnd + 0.45), 0.35, -0.6], [s * (xEnd + 1.3), 0.35, -0.6]];
      LB.add('grey', pipe(run, r, 0.22, 16));
      // pipe clamps on the floor
      for (const t of [0.35, 0.8]) LB.add('skid', place(cbox(0.14, 0.32, 0.12, 0.01), [s * (xEnd + 0.45 + t), 0.16, -0.6]));
      g.anchor(s > 0 ? 'chokeLineEnd' : 'killLineEnd', [s * (xEnd + 1.3), 0.35, -0.6]);
    }
    LB.build(lines, P, 'lines');
    // hydraulic hose bundle leaving the cellar toward the accumulator (-z): a bundle tray on the floor
    const HB = bin();
    HB.add('skid', place(cbox(1.9, 0.08, 0.5, 0.01), [0, 0.04, -1.9]));
    for (let i = 0; i < 14; i++) HB.add('hose', cylBetween([-0.6 + i * 0.09, 0.1, -1.6], [-0.6 + i * 0.09, 0.1, -2.6], 0.019, 8));
    HB.build(g, P, 'hoseTray');
    g.anchor('hoseBundle', [0, 0.1, -2.6]);
    bolts.build(g, P); vb.build(g, P);
    // drill pipe below the BSR body goes through the lower stack: lower piece already spans it (pipeExtent)
    // ---- api
    const subs = [ch, lower, spool, dbl, ann, bell];
    const cutMats = [...new Set([].concat(...subs.map(s => s.userData.cutMats || [])))].concat([P.stud, P.nut]);
    const cut = cutter(g, cutMats, { extent: 1.0 });
    g.api.setCut = u => cut.set(u);
    g.api.refreshCut = () => cut.refresh();
    g.api.setAnnular = u => ann.api.setClose(u);
    g.api.setAnnularTarget = k => { ann.api.setTarget(k); ann.api.showProps(false); };
    g.api.setUpperRam = u => dbl.api.setClose(1, u);
    g.api.setBSR = u => dbl.api.setShear(u);
    g.api.setLowerRam = u => lower.api.setClose(0, u);
    g.api.setLock = (w, u) => { if (w === 'lower') lower.api.setLock(0, u); else dbl.api.setLock(w === 'bsr' ? 0 : 1, u); };
    g.api.setChokeManual = u => vCM.api.setOpen(u); g.api.setChokeHCR = u => vCH.api.setOpen(u); g.api.setKillManual = u => vKM.api.setOpen(u);
    g.api.setPipeVisible = v => { for (const k of ['pipeUpper', 'pipeLower']) if (dbl.parts[k]) dbl.parts[k].visible = v; };
    g.api.setLines = v => { lines.visible = v; };
    g.api.sparkLevel = u => dbl.api.sparkLevel(u); g.api.setSparks = on => dbl.api.setSparks(on);
    // anchors
    const tiers = [['bell', I4, I4 + bell.userData.height], ['annular', I3, I4], ['upperRam', I2 + dbl.userData.cavityY[1] - 0.3, I3], ['bsr', I2, I2 + dbl.userData.cavityY[0] + 0.3],
      ['spool', I1, I2], ['lowerRam', I0, I1], ['casingHead', 0, I0]];
    for (const [k, a, b] of tiers) g.anchor(k, [0, (a + b) / 2, 0.75]);
    g.anchors.upperRam.position.y = I2 + dbl.userData.cavityY[1]; g.anchors.bsr.position.y = I2 + dbl.userData.cavityY[0]; g.anchors.lowerRam.position.y = I0 + lower.userData.cavityY[0];
    g.userData.tiers = tiers; g.userData.interfaces = { I0, I1, I2, I3, I4 }; g.userData.height = I4 + bell.userData.height;
    g.anchor('chokeOutlet', [0.42, yo, 0]); g.anchor('killOutlet', [-0.42, yo, 0]);
    g.anchor('chokeManual', [0.68, yo + 0.2, 0.15]); g.anchor('chokeHCR', [1.2, yo + 0.45, 0.17]); g.anchor('killManual', [-0.68, yo + 0.2, 0.15]); g.anchor('killCheck', [-1.2, yo + 0.12, 0.15]);
    g.anchor('shear', [0, I2 + dbl.userData.cavityY[0] + 0.04, 0]); g.anchor('flowline', [0, I4 + 0.56, -0.66]);
    g.traverse(m => { if (m.isMesh) m.userData.sys = 'wc'; });
    g.api.setPipeVisible(o.pipe !== false);
    g.api.setAnnular(0); g.api.setChokeHCR(0); g.api.setChokeManual(1); g.api.setKillManual(1);
    return g;
  }


  // ================================================================== shared small parts
  // lever-operated 4-way manipulator valve (body + handle), handle pivot at +y, lever toward +z; returns {group, set(u)}
  function fourWay(P) {
    const g = new THREE.Group(), B = bin();
    B.add('grey', cbox(0.13, 0.13, 0.11, 0.012));
    for (const s of [1, -1]) B.add('nut', place(toX(hexPlug(0.022, 0.03)), [s * 0.08, 0, 0], [0, s > 0 ? 0 : PI, 0]));
    B.add('machined', place(cyl(0.022, 0.03, 16), [0, 0.08, 0]));
    B.build(g, P, 'fourway');
    const h = new THREE.Group(); h.position.y = 0.095; g.add(h);
    const HB = bin(); HB.add('machined', cylBetween([0, 0, 0], [0, 0.03, 0.2], 0.011, 10)); HB.add('black', place(cyl(0.018, 0.07, 14), [0, 0.035, 0.235], [PI / 2 - 0.15, 0, 0]));
    HB.build(h, P, 'handle');
    // u: 0 = CLOSE (lever right), 0.5 = BLOCK (centre), 1 = OPEN (lever left)
    return { group: g, set: u => { h.rotation.y = lerp(-0.6, 0.6, clamp(u)); } };
  }
  // accumulator bottle shell profile (OD 0.24, overall 1.30, hemispherical-ish heads, bottom fluid port, top gas valve)
  function bottleProfile(R = 0.12, Hh = 1.3, t = 0.012) {
    const o = [], n = 8;
    for (let i = 0; i <= n; i++) { const a = -PI / 2 + i / n * PI / 2; o.push([0.03 + (R - 0.03) * Math.cos(a), 0.06 + 0.1 * (1 + Math.sin(a)) - 0.1 + 0.04, 1]); }
    for (let i = 0; i <= n; i++) { const a = i / n * PI / 2; o.push([0.022 + (R - 0.022) * Math.cos(a), Hh - 0.12 + 0.1 * Math.sin(a), 1]); }
    return o;
  }

  // ================================================================== ACCUMULATOR (KOOMEY) UNIT, 3,000 psi land closing unit
  // accumulatorUnit()  y = 0 at the ground, front (+z) = control manifold side. Skid 5.2 x 1.9 m, 24 x 11-gal bottles
  // (two racks of 3 x 4 at the ends), reservoir in the middle, electric triplex + 2 air pumps in front, 6 manipulator
  // valves, gauge board with ACCUMULATOR / MANIFOLD / ANNULAR gauges, regulators, nameplate easter egg.
  // api: setGauge(i, v01)              i 0 acc (0-6000), 1 manifold (0-6000), 2 annular (0-3000)
  //      setGaugeMove(i, from, to, u)  needle travel with overshoot (values 0..1 of full scale)
  //      setPsi(i, psi)                convenience: value in psi
  //      setValve(i, u)                i 0..5 = annular, upper pipe, blind shear, lower pipe, choke HCR, kill HCR
  //                                    (u 0 close, 0.5 block, 1 open)
  //      setCharge(u)                  cut bottle: 0 = 1,000 psi precharge (bladder full) .. 1 = 3,000 psi (N2 at 1/3)
  //      setBottleCut(u)               half-section of the front-left bottle
  //      setPumpLamp(on01), setMotor(phase)  electric pump running lamp / coupling rotation (radians)
  // anchors: nameplate, gauges, gauge0..2, bottleCut, manifold, valve0..5, electricPump, airPumps, hoseOut, n2, fluid
  function accumulatorUnit(o = {}) {
    const g = asset('accumulatorUnit');
    const P = palette({ paint: 0x2f5175, ...(o.colors || {}) }), B = bin(), bolts = boltSet();
    const LX = 2.6, LZ = 0.95, SK = 0.22;
    // ---- skid (W-beam perimeter, cross members, fork pockets, lifting lugs)
    for (const s of [1, -1]) {
      B.add('skid', place(cbox(2 * LX, SK, 0.14, 0.006), [0, SK / 2, s * (LZ - 0.07)]));
      B.add('skid', place(cbox(0.14, SK, 2 * LZ - 0.28, 0.006), [s * (LX - 0.07), SK / 2, 0]));
      B.add('skid', place(cbox(0.24, 0.12, 2 * LZ + 0.02, 0.008), [s * 0.9, 0.08, 0]));
      for (const z of [1, -1]) B.add('yellow', place(padEye(0.12, 0.13, 0.03, 0.03), [s * (LX - 0.22), SK, z * (LZ - 0.07)], [0, 0, 0]));
    }
    for (const x of [-1.5, 0, 1.5]) B.add('skid', place(cbox(0.12, SK * 0.8, 2 * LZ - 0.28, 0.006), [x, SK * 0.4, 0]));
    B.add('greyLt', place(cbox(2 * LX - 0.1, 0.012, 2 * LZ - 0.1, 0.004), [0, SK + 0.006, 0])); // deck plate
    // ---- reservoir
    const RX = 1.3, RZ0 = -0.80, RZ1 = 0.22, RY = 1.05;
    B.add('paint', place(cbox(2 * RX, RY - SK, RZ1 - RZ0, 0.03), [0, (RY + SK) / 2, (RZ0 + RZ1) / 2]));
    B.add('paint', place(cbox(0.6, 0.03, 0.4, 0.01), [-0.6, RY + 0.015, -0.35])); // inspection hatch
    bolts.line(null, [-0.85, -0.6, -0.35].flatMap(x => [[x, RY + 0.03, -0.53], [x, RY + 0.03, -0.17]]), 0.5 * IN, 0.02, [0.008], 81);
    B.add('grey', place(cyl(0.06, 0.06, 20), [0.9, RY + 0.03, -0.5])); B.add('black', place(cyl(0.07, 0.03, 20), [0.9, RY + 0.075, -0.5])); // filler + breather
    // level sight glass on the front
    B.add('stainless', place(cbox(0.05, 0.55, 0.03, 0.006), [1.05, 0.62, RZ1 + 0.02]));
    const sg = new THREE.Mesh(cyl(0.012, 0.48, 12), mat(0xc79a3a, { kind: 'wet', metal: 0.0, rough: 0.25, noW: true })); sg.position.set(1.05, 0.58, RZ1 + 0.04); sg.scale.y = 0.75; sg.position.y = 0.38 + 0.18; g.add(sg);
    // nameplate (easter egg, director §7)
    const np = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.22), labelMat(nameplateTex([['WORKING PRESSURE', '3,000 PSI'], ['N2 PRECHARGE', '1,000 PSI'], ['BOTTLES', '24 x 11 GAL'], ['SER. NO.', 'NS-0505']], { title: 'namman.story · BOP CONTROL UNIT 3000 PSI', w: 1024, h: 380 })));
    np.position.set(-0.55, 0.86, RZ1 + 0.003); g.add(np); g.anchor('nameplate', [-0.55, 0.86, RZ1 + 0.01]);
    // ---- bottle racks + bottles
    const cols = [1.66, 1.98, 2.30], rows = [-0.57, -0.19, 0.19, 0.57];
    const bp = bottleProfile(); const shellG = lathe([[0, 0.04], ...bottleProfile().map(p => [p[0], p[1], 1]), [0, 1.28]], SEG(28));
    let cutPos = null;
    for (const s of [1, -1]) {
      for (const x of cols) for (const z of rows) {
        const isCut = s < 0 && x === cols[2] && z === rows[3];
        const px = s * x, py = SK + 0.1;
        if (isCut) { cutPos = [px, py, z]; continue; }
        B.add('paint', place(shellG, [px, py, z]));
        B.add('brass', place(cyl(0.02, 0.06, 10), [px, py + 1.3, z])); B.add('black', place(cyl(0.028, 0.04, 12), [px, py + 1.35, z]));
      }
      for (const x of cols) { // bottom headers (along z) + fluid ports
        B.add('grey', cylBetween([s * x, SK + 0.06, rows[0] - 0.12], [s * x, SK + 0.06, rows[3] + 0.12], 0.03, 12));
        for (const z of rows) B.add('grey', cylBetween([s * x, SK + 0.06, z], [s * x, SK + 0.14, z], 0.018, 8));
      }
      // rack frame: corner posts, lower + upper clamp bars, rack cross bars
      const x0 = s * (cols[0] - 0.2), x1 = s * (cols[2] + 0.2);
      for (const xx of [x0, x1]) for (const z of [rows[0] - 0.2, rows[3] + 0.2]) B.add('skid', place(cbox(0.06, 1.25, 0.06, 0.005), [xx, SK + 0.62, z]));
      for (const yy of [SK + 0.5, SK + 1.18]) for (const z of rows) B.add('skid', place(cbox(Math.abs(x1 - x0) + 0.06, 0.05, 0.04, 0.004), [(x0 + x1) / 2, yy, z - 0.14]));
      for (const yy of [SK + 0.5, SK + 1.18]) for (const xx of [x0, x1]) B.add('skid', place(cbox(0.05, 0.05, rows[3] - rows[0] + 0.46, 0.004), [xx, yy, 0]));
      // header to the manifold (along x under the reservoir front)
      B.add('grey', pipe([[s * cols[0], SK + 0.06, rows[3] + 0.12], [s * cols[0], SK + 0.06, 0.62], [s * 1.1, SK + 0.06, 0.62], [s * 1.1, 1.1, 0.62]], 0.03, 0.1, 12));
    }
    // ---- control manifold on the reservoir front, 6 four-way valves, header, regulators
    const VZ = 0.48, VY = 1.18, xs = [-0.95, -0.57, -0.19, 0.19, 0.57, 0.95];
    B.add('grey', cylBetween([-1.15, VY - 0.12, VZ], [1.15, VY - 0.12, VZ], 0.035, 14));
    B.add('skid', place(cbox(2.5, 0.06, 0.3, 0.006), [0, VY - 0.19, VZ - 0.05]));
    for (const s of [1, -1]) B.add('skid', place(cbox(0.06, VY - 0.2 - RY + 0.4, 0.06, 0.004), [s * 1.2, (VY - 0.2 + RY - 0.4) / 2 + 0.2, VZ - 0.12]));
    const valves = xs.map((x, i) => {
      const v = fourWay(P); v.group.position.set(x, VY, VZ); g.add(v.group); g.parts['valve' + i] = v.group;
      B.add('grey', cylBetween([x, VY - 0.12, VZ], [x, VY - 0.06, VZ], 0.02, 8));
      // function tag + outlet lines going back to the hose connections
      const tg = new THREE.Mesh(new THREE.PlaneGeometry(0.17, 0.05), labelMat(nameplateTex([], { title: ['ANNULAR', 'UPPER PIPE', 'BLIND SHEAR', 'LOWER PIPE', 'CHOKE HCR', 'KILL HCR'][i], w: 512, h: 150 })));
      tg.position.set(x, VY - 0.13, VZ + 0.155); g.add(tg);
      for (const dz of [-0.03, 0.03]) B.add('stainless', pipe([[x + dz, VY, VZ - 0.06], [x + dz, VY, VZ - 0.2], [x + dz, VY + 0.12, -0.0], [x + dz * 3, RY + 0.09, -0.6], [x + dz * 3, RY + 0.09, -0.98]], 0.011, 0.06, 8));
      g.anchor('valve' + i, [x, VY + 0.15, VZ + 0.2]);
      return v;
    });
    // hydraulic outlet bulkhead at the back (hoses to the BOP leave here)
    B.add('grey', place(cbox(2.2, 0.16, 0.06, 0.01), [0, RY + 0.09, -1.0]));
    g.anchor('hoseOut', [0, RY + 0.09, -1.05]);
    // gauge board (3 large gauges) + regulators
    B.add('stainless', place(cbox(1.15, 0.5, 0.03, 0.008), [0, 1.62, 0.12]));
    for (const s of [1, -1]) B.add('skid', place(cbox(0.05, 0.6, 0.05, 0.004), [s * 0.55, 1.35, 0.08]));
    const gs = [];
    const gt = [['ACCUMULATOR', 6000], ['MANIFOLD', 6000], ['ANNULAR', 3000]];
    gt.forEach(([lab, max], i) => {
      const gg = gauge(P, 0.13, dialTex({ max, major: 1000, minor: max > 3000 ? 200 : 100, label: lab, sub: 'PSI', red: max > 3000 ? [5000, 6000] : null }), { stem: 0 });
      gg.group.position.set(-0.38 + i * 0.38, 1.65, 0.15); g.add(gg.group); gs.push(gg); g.anchor('gauge' + i, [-0.38 + i * 0.38, 1.65, 0.3]);
    });
    g.anchor('gauges', [0, 1.65, 0.35]);
    for (const [x, lab] of [[-0.8, 'MANIFOLD REG'], [0.8, 'ANNULAR REG']]) {
      B.add('grey', place(cyl(0.07, 0.14, 20), [x, VY + 0.25, VZ - 0.08])); B.add('grey', place(cyl(0.045, 0.06, 16), [x, VY + 0.35, VZ - 0.08]));
      B.add('black', cylBetween([x - 0.09, VY + 0.4, VZ - 0.08], [x + 0.09, VY + 0.4, VZ - 0.08], 0.012, 8));
      B.add('grey', cylBetween([x, VY + 0.18, VZ - 0.08], [x, VY - 0.08, VZ - 0.08], 0.018, 8));
    }
    // ---- electric triplex pump + motor (front right), air pumps (front left)
    const EP = new THREE.Group(); EP.position.set(0.55, SK, 0.66); g.add(g.part('electricPump', EP));
    const EB = bin();
    const fins = []; for (let i = 0; i <= 14; i++) { const y = -0.2 + i * 0.03; fins.push([i % 2 ? 0.17 : 0.155, y]); }
    EB.add('green', toX(lathe([[0, -0.24], [0.15, -0.24], ...fins.map(p => [p[0], p[1]]), [0.15, 0.24], [0.06, 0.26], [0, 0.26]], SEG(36))).translate(0, 0.21, 0));
    EB.add('green', place(cbox(0.14, 0.1, 0.16, 0.01), [0, 0.42, 0])); // terminal box
    EB.add('green', place(cbox(0.5, 0.04, 0.3, 0.006), [0, 0.02, 0])); // motor feet / base
    EB.add('yellow', place(cbox(0.08, 0.36, 0.34, 0.01), [0.32, 0.2, 0])); // belt / coupling guard
    EB.add('grey', place(cbox(0.3, 0.22, 0.28, 0.02), [0.55, 0.15, 0])); // triplex power end
    for (const z of [-0.08, 0, 0.08]) EB.add('machined', place(toX(cyl(0.026, 0.12, 12)), [0.76, 0.17, z]));
    EB.add('grey', place(cbox(0.1, 0.16, 0.3, 0.012), [0.86, 0.17, 0]));
    EB.build(EP, P, 'ePump');
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.02, 12, 8), glowMat(0x22c55e)); lamp.position.set(0.0, 0.48, 0.09); EP.add(lamp);
    const coupling = new THREE.Mesh(toX(cyl(0.05, 0.05, 12)), P.machined); coupling.position.set(0.27, 0.21, 0); EP.add(coupling);
    const AP = new THREE.Group(); AP.position.set(-0.9, SK, 0.68); g.add(g.part('airPumps', AP));
    const AB = bin();
    for (const x of [-0.25, 0.1]) {
      AB.add('grey', place(cbox(0.16, 0.18, 0.16, 0.015), [x, 0.09, 0]));
      AB.add('machined', place(cyl(0.03, 0.12, 14), [x, 0.24, 0]));
      AB.add('black', place(lathe([[0, 0], [0.09, 0], [0.095, 0.01], [0.095, 0.26], [0.09, 0.27], [0, 0.27]], SEG(28)), [x, 0.3, 0]));
      AB.add('grey', place(cyl(0.1, 0.03, 28), [x, 0.3, 0])); AB.add('grey', place(cyl(0.1, 0.03, 28), [x, 0.57, 0]));
      AB.add('hose', pipe([[x + 0.1, 0.45, 0], [x + 0.2, 0.45, 0], [x + 0.2, 0.62, -0.2]], 0.012, 0.05, 8));
    }
    AB.add('grey', place(cbox(0.09, 0.2, 0.09, 0.01), [0.32, 0.5, -0.1])); // air filter / regulator / lubricator
    AB.add('stainless', place(cyl(0.035, 0.12, 14), [0.32, 0.33, -0.1]));
    AB.build(AP, P, 'airPumps');
    B.build(g, P, 'acc'); bolts.build(g, P);
    // ---- cut bottle (own palette + clip plane): shell, hydraulic fluid (amber), bladder (rubber), N2 (blue-grey)
    const CB = asset('bottleCut'); CB.position.set(...cutPos); g.add(g.part('bottleCut', CB));
    const CP = palette({ paint: 0x2f5175 });
    const fluidM = mat(0xc9861c, { kind: 'wet', metal: 0.0, rough: 0.3, blotch: 0.04, streak: 0, cap: 0xd99a2b }), n2M = mat(0x8aa0b8, { metal: 0.0, rough: 0.6, blotch: 0.04, streak: 0, cap: 0x9fb4c9 });
    const R = 0.12, Hh = 1.3;
    const prof = bottleProfile(R, Hh), inner = bottleProfile(R - 0.012, Hh).map(p => [p[0], p[1] + (p[1] < 0.6 ? 0.012 : -0.012), 1]);
    const shellPts = [[0.012, 0.04], ...prof, [0.012, Hh - 0.02], [0.012, Hh - 0.02 - 0.012], ...inner.slice().reverse(), [0.012, 0.052], [0.012, 0.04]];
    const CBB = bin();
    CBB.add('paint', lathe(shellPts, SEG(40)));
    CBB.add('brass', place(cyl(0.02, 0.06, 10), [0, Hh, 0])); CBB.add('black', place(cyl(0.028, 0.04, 12), [0, Hh + 0.05, 0]));
    CBB.build(CB, CP, 'bottleShell');
    const fluid = new THREE.Mesh(lathe([[0, 0.058], ...inner.map(p => [p[0] - 0.002, p[1], 1]), [0, Hh - 0.035]], SEG(40)), fluidM); CB.add(fluid);
    // bladder: hangs from the top, its shape squeezes with the charge level
    const bl = new THREE.Group(); bl.position.y = Hh - 0.06; CB.add(bl);
    const bprof = []; for (let i = 0; i <= 18; i++) { const t = i / 18; const y = -t; const r = (R - 0.0135) * Math.sin(Math.min(1, t * 6) * PI / 2) * (t > 0.85 ? Math.cos((t - 0.85) / 0.15 * PI / 2) : 1); bprof.push([Math.max(0.0, r), y * (Hh - 0.13)]); }
    const blOuter = bprof.map(p => [p[0], p[1], 1]), blInner = bprof.map(p => [Math.max(0, p[0] - 0.005), p[1] + 0.005, 1]);
    const bladder = new THREE.Mesh(lathe([[0.01, 0], ...blOuter.slice(1), ...blInner.slice(1).reverse(), [0.01, 0]], SEG(40)), CP.rubber); bl.add(bladder);
    const n2 = new THREE.Mesh(lathe([[0, -0.004], ...blInner.slice(1).map(p => [Math.max(0, p[0] - 0.001), p[1], 1]), [0, blInner[blInner.length - 1][1]]], SEG(40)), n2M); bl.add(n2);
    CB.anchor('n2', [0, Hh * 0.6, 0.0]); CB.anchor('fluid', [0, 0.2, 0]);
    g.anchors.n2 = CB.anchors.n2; g.anchors.fluid = CB.anchors.fluid; g.anchor('bottleCut', [cutPos[0], cutPos[1] + 0.7, cutPos[2] + 0.14]);
    const cutMats = collectMats(CB);
    const ccut = cutter(CB, cutMats, { extent: 0.14 });
    g.api.setBottleCut = u => ccut.set(u);
    g.api.refreshCut = () => ccut.refresh();
    g.api.setCharge = u => { u = clamp(u); const v = lerp(1, 1 / 3, u); // N2 volume fraction (Boyle: 1000 -> 3000 psi)
      const sy = lerp(1, 0.52, u), sr = Math.sqrt(v / sy); bl.scale.set(sr, sy, sr); };
    g.api.setGauge = (i, v) => gs[i].setValue(v);
    g.api.setGaugeMove = (i, a, b, u) => gs[i].setValue(lerp(a, b, overshoot(u)));
    g.api.setPsi = (i, psi) => gs[i].setValue(psi / gt[i][1]);
    g.api.setValve = (i, u) => valves[i].set(u);
    g.api.setPumpLamp = v => { lamp.material.emissiveIntensity = 2.5 * clamp(v); };
    g.api.setMotor = ph => { coupling.rotation.x = ph; };
    g.api.setCharge(1); g.api.setPsi(0, 3000); g.api.setPsi(1, 1500); g.api.setPsi(2, 1000); valves.forEach(v => v.set(0.5)); g.api.setPumpLamp(0);
    g.anchor('manifold', [0, VY, VZ + 0.3]); g.anchor('electricPump', [0.8, 0.6, 0.8]); g.anchor('airPumps', [-0.9, 0.7, 0.8]);
    g.traverse(m => { if (m.isMesh) m.userData.sys = 'wc'; });
    return g;
  }

  // ================================================================== CONTROL PANELS (driller's BOP remote, remote choke)
  // console shell on a pedestal, face tilted back 12 deg, face texture drawn in code; returns { g, face (Group on the face
  // plane: x right, y up, +z out), B, P }
  function consoleShell(name, W, Hc, D, colors) {
    const g = asset(name), P = palette({ paint: 0xb7bcc2, ...(colors || {}) }), B = bin();
    B.add('stainless', place(cbox(W, Hc, D, 0.02, 2), [0, 1.0 + Hc / 2, 0]));
    B.add('stainless', place(cbox(W + 0.04, 0.03, D + 0.06, 0.008), [0, 1.0 + Hc + 0.015, 0.015])); // rain hood
    B.add('grey', place(cbox(0.14, 1.0, 0.14, 0.01), [0, 0.5, -0.02])); // pedestal
    B.add('grey', place(cbox(0.55, 0.02, 0.45, 0.004), [0, 0.01, 0]));
    // purge / pressurisation unit + air supply + hose bundle entering from below
    B.add('stainless', place(cbox(0.12, 0.16, 0.1, 0.01), [W / 2 + 0.07, 1.0 + Hc * 0.75, -D * 0.2]));
    B.add('gun', place(cyl(0.028, 0.04, 12), [W / 2 + 0.07, 1.0 + Hc * 0.75 + 0.1, -D * 0.2]));
    B.add('hose', pipe([[0.04, 1.0, -0.05], [0.04, 0.75, -0.08], [0.1, 0.25, -0.3], [0.1, 0.02, -0.9]], 0.03, 0.15, 10));
    const face = new THREE.Group(); face.position.set(0, 1.0 + Hc / 2, D / 2 + 0.001); face.rotation.x = -0.0; g.add(face);
    return { g, face, B, P };
  }
  function pushButton(P, color, r = 0.022, guard = true) { // mushroom button with chrome bezel + collar guard; press along -z
    const grp = new THREE.Group(), B = bin();
    B.add('chrome', toZ(lathe([[r * 1.05, 0], [r * 1.5, 0], [r * 1.55, 0.006], [r * 1.35, 0.012], [r * 1.05, 0.012], [r * 1.05, 0]], SEG(24))));
    if (guard) B.add('black', toZ(lathe([[r * 1.12, 0.012], [r * 1.32, 0.012], [r * 1.32, 0.03], [r * 1.22, 0.032], [r * 1.12, 0.03], [r * 1.12, 0.012]], SEG(24))));
    B.build(grp, P, 'btn');
    const cap = new THREE.Mesh(toZ(lathe([[0, 0], [r, 0], [r, 0.012], [r * 0.85, 0.02], [0, 0.022]], SEG(24))), glowMat(color));
    cap.material.roughness = 0.35; grp.add(cap); cap.castShadow = true;
    return { group: grp, cap, press: u => { cap.position.z = -0.009 * clamp(u); } };
  }
  function lamp(P, color, r = 0.012) {
    const grp = new THREE.Group(), B = bin();
    B.add('chrome', toZ(lathe([[r, 0], [r * 1.6, 0], [r * 1.6, 0.008], [r * 1.1, 0.012], [r, 0.012]], SEG(20)))); B.build(grp, P, 'lampBezel');
    const lens = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 10, 0, TAU, 0, PI / 2).rotateX(PI / 2), glowMat(color)); lens.scale.z = 0.7; lens.position.z = 0.006;
    lens.material.color.multiplyScalar(0.55); grp.add(lens);
    return { group: grp, set: v => { lens.material.emissiveIntensity = 3.2 * clamp(v); } };
  }
  // driller's BOP remote panel. ids: annular, upperPipe, blindShear, lowerPipe, chokeHCR, killHCR (+ .open/.close), master
  // api: setPress(id, u) (e.g. 'blindShear.close', 'master'), setLamp(id, v01) (e.g. 'annular.close'),
  //      setGuard(u) (BSR flip cover lifts), setGauge(i, v01) (0 accum 0-6000, 1 manifold 0-6000, 2 annular 0-3000, 3 rig air 0-200)
  // anchors: master, <id>.open/.close for every button, gauges, guard
  function drillerPanel(o = {}) {
    const W = 0.95, Hc = 0.78, D = 0.26;
    const { g, face, B, P } = consoleShell('drillerPanel', W, Hc, D, o.colors);
    const fns = [['annular', 'ANNULAR'], ['upperPipe', 'UPPER PIPE RAM'], ['blindShear', 'BLIND SHEAR RAM'], ['lowerPipe', 'LOWER PIPE RAM'], ['chokeHCR', 'CHOKE HCR'], ['killHCR', 'KILL HCR']];
    // face texture: mimic diagram of the stack (lines), labels, OPEN/CLOSE legends
    const cw = 1024, chh = Math.round(1024 * (Hc - 0.04) / (W - 0.04)), c = canvas(cw, chh), x = c.getContext('2d');
    x.fillStyle = '#2a3038'; x.fillRect(0, 0, cw, chh);
    x.fillStyle = '#e8e4da'; x.font = `700 40px ${FONT}`; x.textAlign = 'center'; x.fillText("DRILLER'S BOP CONTROL PANEL", cw / 2, 52);
    x.fillRect(40, 70, cw - 80, 3);
    const rowY = i => 150 + i * 90 * (chh - 200) / 560;
    x.strokeStyle = '#a855f7'; x.lineWidth = 6; x.beginPath(); x.moveTo(120, rowY(0) - 30); x.lineTo(120, rowY(5) + 25); x.stroke(); // mimic: well bore line
    x.lineWidth = 4;
    fns.forEach(([id, lab], i) => {
      const y = rowY(i);
      x.strokeStyle = '#cbd5e1'; x.beginPath(); if (i < 4) { x.rect(84, y - 18, 72, 36); } else { x.moveTo(120, y); x.lineTo(180, y); } x.stroke();
      x.fillStyle = '#f1efe8'; x.font = `600 30px ${FONT}`; x.textAlign = 'left'; x.fillText(lab, 200, y + 10);
      x.font = `600 22px ${FONT}`; x.textAlign = 'center'; x.fillStyle = '#86efac'; x.fillText('OPEN', 640, y + 48); x.fillStyle = '#fca5a5'; x.fillText('CLOSE', 820, y + 48);
    });
    x.fillStyle = '#facc15'; x.font = `700 24px ${FONT}`; x.textAlign = 'center'; x.fillText('MASTER · PUSH & HOLD', 200, chh - 40);
    grime(x, cw, chh, 17, 0.08);
    const fm = labelMat(ctex(c), { metal: 0.1, rough: 0.6 });
    const fp = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.04, Hc - 0.04), fm); face.add(fp);
    const fx = px => (px / cw - 0.5) * (W - 0.04), fy = py => (0.5 - py / chh) * (Hc - 0.04);
    const btn = {}, lamps = {};
    fns.forEach(([id], i) => {
      const y = fy(rowY(i));
      for (const [k, col, px] of [['open', 0x16a34a, 640], ['close', 0xdc2626, 820]]) {
        const b = pushButton(P, col, 0.019); b.group.position.set(fx(px), y + 0.005, 0); face.add(b.group); btn[`${id}.${k}`] = b;
        const l = lamp(P, k === 'open' ? 0x22c55e : 0xef4444, 0.009); l.group.position.set(fx(px) + 0.055, y + 0.005, 0); face.add(l.group); lamps[`${id}.${k}`] = l;
        g.anchor(`${id}.${k}`, [fx(px), 1.0 + Hc / 2 + y, D / 2 + 0.05]);
      }
    });
    // BSR close: hinged clear-red flip guard
    const guard = new THREE.Group(); const bsr = btn['blindShear.close'].group.position; guard.position.set(bsr.x, bsr.y + 0.04, 0.0); face.add(guard);
    const gm = makeStd(0xcc2222, 'paint', { transparent: true, opacity: 0.55, depthWrite: false }); gm.roughness = 0.2; gm.metalness = 0;
    const gbox = new THREE.Mesh(cbox(0.085, 0.08, 0.045, 0.006), gm); gbox.position.set(0, -0.04, 0.026); guard.add(gbox);
    const hinge = new THREE.Mesh(toX(cyl(0.006, 0.09, 8)), P.chrome); hinge.position.copy(guard.position); face.add(hinge);
    g.anchor('guard', [bsr.x, 1.0 + Hc / 2 + bsr.y, D / 2 + 0.06]);
    // master button
    const m = pushButton(P, 0x1d4ed8, 0.03); m.group.position.set(fx(200), fy(chh - 90), 0); face.add(m.group); btn.master = m;
    g.anchor('master', [fx(200), 1.0 + Hc / 2 + fy(chh - 90), D / 2 + 0.06]);
    // gauges (4) along the bottom right
    const gs = [['ACCUM', 6000], ['MANIFOLD', 6000], ['ANNULAR', 3000], ['RIG AIR', 200]].map(([lab, max], i) => {
      const gg = gauge(P, 0.045, dialTex({ max, major: max > 1000 ? 1000 : 50, minor: max > 1000 ? 500 : 10, label: lab, sub: 'PSI' }), { stem: 0 });
      gg.group.position.set(fx(440 + i * 150), fy(chh - 70), 0.01); face.add(gg.group); return gg;
    });
    g.anchor('gauges', [fx(660), 1.0 + Hc / 2 + fy(chh - 70), D / 2 + 0.06]);
    B.build(g, P, 'panel');
    g.api.setPress = (id, u) => { if (btn[id]) btn[id].press(u); };
    g.api.setLamp = (id, v) => { if (lamps[id]) lamps[id].set(v); };
    g.api.setGuard = u => { guard.rotation.x = -easeIO(u) * 1.9; };
    g.api.setGauge = (i, v) => gs[i].setValue(v);
    g.api.setGaugeMove = (i, a, b, u) => gs[i].setValue(lerp(a, b, overshoot(u)));
    // default state: everything open (green lamps on), as while drilling
    for (const [id] of fns) { g.api.setLamp(id + '.open', id === 'chokeHCR' || id === 'killHCR' ? 0 : 1); g.api.setLamp(id + '.close', id === 'chokeHCR' || id === 'killHCR' ? 1 : 0); }
    g.api.setGauge(0, 0.5); g.api.setGauge(1, 0.25); g.api.setGauge(2, 0.33); g.api.setGauge(3, 0.6);
    g.traverse(mm => { if (mm.isMesh) mm.userData.sys = 'wc'; });
    return g;
  }
  // remote choke panel: DP + casing gauges (0-10,000), choke position indicator, SPM / stroke counter LCD, choke lever.
  // api: setDP(v01), setCasing(v01), setChokePos(u) (0 closed .. 1 open), setLever(u) (0 close, 0.5 hold, 1 open),
  //      setCounter(spm, strokes), setPumpLamp(v)
  function chokePanel(o = {}) {
    const W = 0.9, Hc = 0.72, D = 0.3;
    const { g, face, B, P } = consoleShell('chokePanel', W, Hc, D, o.colors);
    const c = canvas(1024, 820), x = c.getContext('2d');
    x.fillStyle = '#2a3038'; x.fillRect(0, 0, 1024, 820);
    x.fillStyle = '#e8e4da'; x.font = `700 40px ${FONT}`; x.textAlign = 'center'; x.fillText('REMOTE CHOKE CONTROL', 512, 54); x.fillRect(40, 72, 944, 3);
    x.font = `600 26px ${FONT}`; x.fillText('DRILL PIPE', 260, 470); x.fillText('CASING', 764, 470); x.fillText('CHOKE POSITION', 260, 780); x.fillText('PUMP STROKES', 764, 618); x.fillText('CHOKE CONTROL', 764, 800);
    x.fillText('CLOSE', 620, 745); x.fillText('OPEN', 910, 745);
    grime(x, 1024, 820, 23, 0.08);
    const fp = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.04, Hc - 0.04), labelMat(ctex(c), { metal: 0.1, rough: 0.6 })); face.add(fp);
    const fx = px => (px / 1024 - 0.5) * (W - 0.04), fy = py => (0.5 - py / 820) * (Hc - 0.04);
    const dp = gauge(P, 0.11, dialTex({ max: 10000, major: 1000, minor: 250, label: 'DRILL PIPE', sub: 'PSI' }), { stem: 0 }); dp.group.position.set(fx(260), fy(270), 0.012); face.add(dp.group);
    const cs = gauge(P, 0.11, dialTex({ max: 10000, major: 1000, minor: 250, label: 'CASING', sub: 'PSI' }), { stem: 0 }); cs.group.position.set(fx(764), fy(270), 0.012); face.add(cs.group);
    const cp = gauge(P, 0.06, dialTex({ max: 100, major: 25, minor: 5, label: 'CHOKE', sub: '% OPEN' }), { stem: 0 }); cp.group.position.set(fx(260), fy(640), 0.012); face.add(cp.group);
    // LCD stroke counter
    const lc = canvas(512, 192), lx = lc.getContext('2d'), lt = ctex(lc);
    const lcd = new THREE.Mesh(new THREE.PlaneGeometry(0.19, 0.07), new THREE.MeshBasicMaterial({ map: lt, toneMapped: false })); lcd.position.set(fx(764), fy(540), 0.006); face.add(lcd);
    B.add('black', place(cbox(0.22, 0.095, 0.02, 0.004), [fx(764), 1.0 + Hc / 2 + fy(540), D / 2 - 0.004]));
    const drawLCD = (spm, stk) => { lx.fillStyle = '#9db08a'; lx.fillRect(0, 0, 512, 192); lx.fillStyle = '#1d2a1a'; lx.font = `700 70px ${MONO}`; lx.textAlign = 'left';
      lx.fillText(`SPM ${String(Math.round(spm)).padStart(3, ' ')}`, 24, 80); lx.fillText(`STK ${String(Math.round(stk)).padStart(5, '0')}`, 24, 168); lt.needsUpdate = true; };
    // choke control lever (3-position, spring return to HOLD)
    const lev = new THREE.Group(); lev.position.set(fx(764), fy(730), 0.01); face.add(lev);
    { const hub = new THREE.Mesh(toZ(cyl(0.03, 0.03, 20)), P.chrome); hub.position.set(fx(764), fy(730), 0.015); face.add(hub); }
    const LB = bin(); LB.add('chrome', cylBetween([0, 0, 0.02], [0, 0.11, 0.05], 0.007, 10)); LB.add('black', place(new THREE.SphereGeometry(0.022, 16, 10), [0, 0.115, 0.052])); LB.build(lev, P, 'lever');
    const pl = lamp(P, 0x22c55e, 0.01); pl.group.position.set(fx(930), fy(540), 0); face.add(pl.group);
    const rb = pushButton(P, 0xe5e7eb, 0.015); rb.group.position.set(fx(600), fy(540), 0); face.add(rb.group);
    B.build(g, P, 'panel');
    g.api.setDP = v => dp.setValue(v); g.api.setCasing = v => cs.setValue(v); g.api.setChokePos = u => cp.setValue(clamp(u));
    g.api.setLever = u => { lev.rotation.z = lerp(0.5, -0.5, clamp(u)); };
    g.api.setCounter = (spm, stk) => drawLCD(spm, stk); g.api.setPumpLamp = v => pl.set(v);
    g.api.setGaugeMove = (which, a, b, u) => (which === 'dp' ? dp : cs).setValue(lerp(a, b, overshoot(u)));
    g.api.setDP(0); g.api.setCasing(0); g.api.setChokePos(0.0); g.api.setLever(0.5); drawLCD(0, 0); pl.set(0);
    g.anchor('dp', [fx(260), 1.0 + Hc / 2 + fy(270), D / 2 + 0.1]); g.anchor('casing', [fx(764), 1.0 + Hc / 2 + fy(270), D / 2 + 0.1]);
    g.anchor('lever', [fx(764), 1.0 + Hc / 2 + fy(700), D / 2 + 0.1]); g.anchor('counter', [fx(764), 1.0 + Hc / 2 + fy(600), D / 2 + 0.05]);
    g.traverse(mm => { if (mm.isMesh) mm.userData.sys = 'wc'; });
    return g;
  }


  // ================================================================== CHOKE MANIFOLD (10M, 3-1/16 bore, 2 adjustable chokes)
  // chokeManifold()  skid top at y = 0 (skid stands on the ground at y = -0.25). Inlet from the choke line at -x.
  //   inlet: 2 gate valves in series -> 5-way cross (gauge on top) -> 3 parallel paths along +x:
  //   z = -1.04 manual adjustable choke A (trim cut-away), z = 0 straight-through bleed line, z = +1.04 hydraulic choke B;
  //   each with an upstream and downstream gate valve -> buffer chamber (x 1.55) -> outlets: MGS (top), flare, pits.
  // api: setValve(id, u)  ids: in1, in2, upA, upB, bleed, dnA, dnB, mgs, flare, pit   (u 1 = open; handwheel turns)
  //      setChokeA(u) / setChokeB(u)  choke opening 0..1 (needle lifts out of the seat; A handwheel turns, B indicator)
  //      setChokeCut(u)   half-section of choke A's body (trim, seat, needle)   setGauge(v01) / setBufferGauge(v01)
  // anchors: inlet, cross, chokeA, chokeB, trimA, buffer, toMGS, toFlare, toPit, gauge, + one per valve id
  //   paths: g.userData.paths.{ chokeA, chokeB, bleed } polylines (local) for the gas bubble
  function chokeManifold(o = {}) {
    const g = asset('chokeManifold'); const P = palette({ grey: 0x5d646d, ...(o.colors || {}) }), B = bin(), bolts = boltSet();
    const F3 = FL['3-1/16x10M'], Y = 0.85, nh = F3.d * 0.98;
    // ---- skid with grating deck + pipe stands
    B.add('skid', place(cbox(4.6, 0.25, 2.9, 0.01), [0.1, -0.125, 0]));
    const grate = (() => { const c = canvas(256, 256), x = c.getContext('2d'); x.fillStyle = '#2b2f35'; x.fillRect(0, 0, 256, 256); x.fillStyle = '#4b525b';
      for (let i = 0; i < 256; i += 16) { x.fillRect(i, 0, 4, 256); } for (let j = 0; j < 256; j += 32) x.fillRect(0, j, 256, 3); const t = ctex(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(18, 11); return t; })();
    const deck = new THREE.Mesh(new THREE.PlaneGeometry(4.5, 2.8).rotateX(-PI / 2), labelMat(grate, { metal: 0.4, rough: 0.6 })); deck.position.set(0.1, 0.002, 0); deck.receiveShadow = true; g.add(deck);
    const stand = (x, z, y = Y) => { B.add('skid', place(cbox(0.1, y - 0.07, 0.1, 0.006), [x, (y - 0.07) / 2, z])); B.add('skid', place(cbox(0.22, 0.03, 0.16, 0.004), [x, y - 0.075, z])); B.add('grey', place(new THREE.TorusGeometry(0.065, 0.008, 6, 16, PI), [x, y, z], [0, 0, PI])); };
    // ---- generic flanged run helpers
    const valves = {};
    const addValve = (id, pos, axis, open = 1, kind = 'manual') => {
      const v = gateValve({ kind, bolts, bodyKey: 'grey', wheelMat: P.wheel });
      v.position.set(...pos); if (axis === 'z') v.rotation.y = -PI / 2; g.add(v); valves[id] = v; g.part('valve_' + id, v);
      const hw = v.userData.ftf / 2;
      for (const s of [1, -1]) { // flange pairs at both faces (studs with nuts both sides)
        const fp = axis === 'x' ? [pos[0] + s * hw, pos[1], pos[2]] : [pos[0], pos[1], pos[2] + s * hw];
        bolts.circle(frameAt(fp, axis === 'x' ? 'x' : 'z'), F3.BC, F3.n, F3.d, -F3.T - nh - 0.01, F3.T + nh + 0.01, [-F3.T - nh / 2, F3.T + nh / 2], 0.5, Math.round((pos[0] + pos[2]) * 37 + s));
      }
      v.api.setOpen(open); g.anchor(id, [pos[0], pos[1] + 0.5, pos[2] + 0.15]);
      return v;
    };
    const spoolX = (x0, x1, z, y = Y) => { // flanged pipe spool along x (companion flanges at both ends)
      B.add('grey', cylBetween([x0, y, z], [x1, y, z], 0.06, 20));
      for (const [xx, s] of [[x0, 1], [x1, -1]]) B.add('grey', place(toX(lathe([[0.04, 0], [F3.R, 0], [F3.R, F3.T], [0.075, F3.T + 0.02], [0.06, F3.T + 0.06], [0.04, F3.T + 0.06]], SEG(24))), [xx, y, z], s > 0 ? [0, 0, 0] : [0, PI, 0]));
    };
    const block = (pos, faces) => { // forged cross / tee block with flanged faces (studded)
      B.add('grey', place(cbox(0.34, 0.34, 0.34, 0.03), pos));
      for (const f of faces) {
        const n = { '+x': [1, 0, 0], '-x': [-1, 0, 0], '+z': [0, 0, 1], '-z': [0, 0, -1], '+y': [0, 1, 0] }[f];
        const fp = [pos[0] + n[0] * 0.17, pos[1] + n[1] * 0.17, pos[2] + n[2] * 0.17];
        const ax = { '+x': 'x', '-x': '-x', '+z': 'z', '-z': '-z', '+y': 'y' }[f];
        bolts.circle(frameAt(fp, ax), F3.BC, F3.n, F3.d, -0.04, F3.T + nh + 0.012, [F3.T + nh / 2], 0.5, Math.round(fp[0] * 91 + fp[2] * 13));
      }
    };
    // ---- inlet run
    const xIn = -2.05;
    spoolX(xIn - 0.3, xIn, 0);
    g.anchor('inlet', [xIn - 0.3, Y, 0]);
    addValve('in1', [xIn + 0.26, Y, 0], 'x'); addValve('in2', [xIn + 0.78, Y, 0], 'x');
    const xc = xIn + 1.04 + F3.T + 0.17;
    block([xc, Y, 0], ['-x', '+x', '+z', '-z', '+y']);
    g.anchor('cross', [xc, Y, 0.3]);
    // gauge on the cross (needle valve + gauge), pressure transmitter
    B.add('grey', place(lathe([[0, 0], [F3.R, 0], [F3.R, F3.T], [0.04, F3.T + 0.02], [0.03, F3.T + 0.12], [0, F3.T + 0.12]], SEG(24)), [xc, Y + 0.17, 0]));
    B.add('stainless', place(cbox(0.06, 0.06, 0.06, 0.006), [xc, Y + 0.17 + F3.T + 0.15, 0])); B.add('wheel', place(cyl(0.012, 0.06, 8), [xc + 0.05, Y + 0.17 + F3.T + 0.15, 0], [0, 0, PI / 2]));
    const gz = gauge(P, 0.08, dialTex({ max: 10000, major: 1000, minor: 250, label: 'CHOKE MANIFOLD', sub: 'PSI' }), { stem: 0.06 });
    gz.group.position.set(xc, Y + 0.17 + F3.T + 0.33, 0); gz.group.rotation.y = 0.0; g.add(gz.group); g.anchor('gauge', [xc, Y + 0.6, 0.12]);
    B.add('stainless', place(cyl(0.022, 0.14, 12), [xc + 0.12, Y + 0.17 + F3.T + 0.1, 0.0])); // transmitter body
    B.add('grey', cylBetween([xc + 0.04, Y + 0.17 + F3.T + 0.05, 0], [xc + 0.12, Y + 0.17 + F3.T + 0.05, 0], 0.012, 8));
    // ---- branches
    const ZB = 1.04, xb = xc;
    for (const s of [1, -1]) {
      addValve(s > 0 ? 'upB' : 'upA', [xb, Y, s * (0.17 + F3.T * 0 + 0.26)], 'z');
      block([xb, Y, s * (0.17 + 0.52 + 0.17)], [s > 0 ? '-z' : '+z', '+x']);
    }
    const zBr = 0.86;
    // chokes at x0 + ..
    const xCh = xb + 0.17 + 0.32;
    const chokes = {};
    for (const [id, s] of [['A', -1], ['B', 1]]) {
      const ch = adjustableChoke({ hydraulic: id === 'B', pal: P, bolts });
      ch.position.set(xCh, Y, s * zBr); g.add(ch); chokes[id] = ch; g.part('choke' + id, ch);
      bolts.circle(frameAt([xCh - 0.32, Y, s * zBr], 'x'), F3.BC, F3.n, F3.d, -F3.T - nh - 0.01, F3.T + nh + 0.01, [-F3.T - nh / 2, F3.T + nh / 2], 0.5, 300 + s);
      spoolX(xCh + 0.32, xCh + 0.62, s * zBr);
      addValve(s > 0 ? 'dnB' : 'dnA', [xCh + 0.62 + 0.26, Y, s * zBr], 'x');
      spoolX(xCh + 1.14, 1.55 - 0.25, s * zBr);
      g.anchor('choke' + id, [xCh, Y + 0.6, s * zBr + 0.2]);
      stand(xCh + 1.2, s * zBr); stand(xb, s * zBr);
    }
    // straight-through bleed line
    addValve('bleed', [xb + 0.17 + 0.26, Y, 0], 'x');
    spoolX(xb + 0.17 + 0.52, 1.55 - 0.25, 0);
    stand(xIn + 0.0, 0); stand(xb + 1.3, 0);
    // ---- buffer chamber (heavy-wall vessel along z) with saddles, outlets
    const BR = 0.25, BL = 2.5, xB = 1.55;
    B.add('grey', toZ(lathe([[0, -BL / 2 - 0.12], [0.12, -BL / 2 - 0.11, 1], [0.2, -BL / 2 - 0.06, 1], [BR, -BL / 2], [BR, BL / 2], [0.2, BL / 2 + 0.06, 1], [0.12, BL / 2 + 0.11, 1], [0, BL / 2 + 0.12]], SEG(40))).translate(xB, Y, 0));
    for (const z of [-0.8, 0.8]) { B.add('skid', place(cbox(0.4, Y - 0.2, 0.12, 0.01), [xB, (Y - 0.2) / 2, z])); }
    for (const z of [-zBr, 0, zBr]) B.add('grey', place(toX(cyl(0.075, 0.1, 20)), [xB - BR - 0.02, Y, z]));
    const outs = [['mgs', [xB, Y + BR, -0.5], 'y'], ['flare', [xB + BR, Y, 0.45], 'x'], ['pit', [xB + BR, Y, -0.45], 'x']];
    for (const [id, p, ax] of outs) {
      if (ax === 'y') { B.add('grey', place(cyl(0.075, 0.12, 20), [p[0], p[1] + 0.03, p[2]])); const v = gateValve({ kind: 'manual', bolts, bodyKey: 'grey' }); v.rotation.z = PI / 2; v.position.set(p[0], p[1] + 0.09 + 0.26, p[2]); g.add(v); valves[id] = v; v.api.setOpen(1);
        B.add('grey', pipe([[p[0], p[1] + 0.61, p[2]], [p[0], p[1] + 0.95, p[2]], [p[0] - 0.5, p[1] + 0.95, p[2]]], 0.06, 0.2, 16)); g.anchor('toMGS', [p[0] - 0.5, p[1] + 0.95, p[2]]); }
      else { B.add('grey', place(toX(cyl(0.075, 0.12, 20)), [p[0] + 0.03, p[1], p[2]])); const v = gateValve({ kind: 'manual', bolts, bodyKey: 'grey' }); v.position.set(p[0] + 0.09 + 0.26, p[1], p[2]); g.add(v); valves[id] = v; v.api.setOpen(id === 'flare' ? 0 : 0);
        spoolX(p[0] + 0.61, p[0] + 1.0, p[2]); g.anchor(id === 'flare' ? 'toFlare' : 'toPit', [p[0] + 1.0, p[1], p[2]]); }
    }
    const gb = gauge(P, 0.07, dialTex({ max: 5000, major: 1000, minor: 250, label: 'BUFFER', sub: 'PSI' }), { stem: 0.05 });
    gb.group.position.set(xB, Y + BR + 0.16, 0.55); g.add(gb.group); B.add('grey', place(cyl(0.03, 0.06, 12), [xB, Y + BR, 0.55]));
    g.anchor('buffer', [xB, Y + 0.3, 1.3]);
    // stencil on the buffer chamber
    const st = new THREE.Mesh(new THREE.CylinderGeometry(BR + 0.002, BR + 0.002, 1.2, 24, 1, true, -0.6, 1.2).rotateX(PI / 2), decalMat(stencilTex([['CHOKE MANIFOLD 10M', 90]], { w: 1024, h: 160 })));
    st.position.set(xB, Y, 0.0); st.rotation.z = -PI / 2; g.add(st);
    B.build(g, P, 'cm'); bolts.build(g, P);
    // ---- api
    g.api.setValve = (id, u) => { if (valves[id]) valves[id].api.setOpen(u); };
    g.api.setChokeA = u => chokes.A.api.setOpen(u); g.api.setChokeB = u => chokes.B.api.setOpen(u);
    g.api.setChokeCut = u => chokes.A.api.setCut(u);
    g.api.refreshCut = () => chokes.A.api.refreshCut();
    g.api.setGauge = v => gz.setValue(v); g.api.setBufferGauge = v => gb.setValue(v);
    g.anchor('trimA', [xCh, Y + 0.05, -zBr + 0.15]);
    const L = (...pts) => pts.map(p => V3(...p));
    g.userData.paths = {
      chokeA: L([xIn - 0.3, Y, 0], [xc, Y, 0], [xb, Y, -zBr], [xCh - 0.06, Y, -zBr], [xCh - 0.06, Y + 0.06, -zBr], [xCh, Y - 0.02, -zBr], [xCh + 0.08, Y - 0.06, -zBr], [xCh + 0.3, Y, -zBr], [xB - BR, Y, -zBr], [xB, Y + 0.1, -0.5], [xB, Y + BR + 0.95, -0.5], [xB - 0.5, Y + BR + 0.95, -0.5]),
      chokeB: L([xIn - 0.3, Y, 0], [xc, Y, 0], [xb, Y, zBr], [xCh, Y, zBr], [xB - BR, Y, zBr], [xB, Y + 0.1, -0.5], [xB, Y + BR + 0.95, -0.5], [xB - 0.5, Y + BR + 0.95, -0.5]),
      bleed: L([xIn - 0.3, Y, 0], [xc, Y, 0], [xB - BR, Y, 0], [xB + BR, Y, 0.45], [xB + 1.0, Y, 0.45]),
    };
    g.api.setChokeA(0.35); g.api.setChokeB(0.0);
    g.traverse(mm => { if (mm.isMesh) mm.userData.sys = 'wc'; });
    return g;
  }
  // adjustable choke: globe-pattern body (flow in -x, out +x through a carbide seat), needle on a vertical stem.
  // manual: bonnet + handwheel + position scale; hydraulic: actuator + position transmitter.
  // api.setOpen(u) (0 = needle in the seat .. 1 = full open), api.setCut(u) (body half-section)
  function adjustableChoke(o = {}) {
    const g = asset(o.hydraulic ? 'chokeHydraulic' : 'chokeManual'); const P = o.pal || palette(), B = bin(), bolts = o.bolts || boltSet();
    const CP = tintCaps(palette({ grey: (P.grey && P.grey.color && P.grey.color.getHex()) || 0x5d646d }), 0xd9d3c6, 1);
    const F3 = FL['3-1/16x10M'], CB = bin();
    // body: side profile (x-y) with passages as voids, extruded along z; solid side plates close it
    const sh = rrectShape(-0.2, -0.2, 0.2, 0.17, 0.03);
    const pas = new THREE.Path(); // inlet channel -> upper chamber -> seat throat -> lower chamber -> outlet
    pas.moveTo(-0.2 + 0.0001, -0.035); pas.lineTo(-0.2 + 0.0001, 0.035); pas.lineTo(-0.075, 0.035); pas.lineTo(-0.075, 0.12); pas.lineTo(0.075, 0.12); pas.lineTo(0.075, 0.0);
    pas.lineTo(0.03, 0.0); pas.lineTo(0.03, -0.03); pas.lineTo(0.06, -0.06); pas.lineTo(0.2 - 0.0001, -0.06); pas.lineTo(0.2 - 0.0001, -0.0); pas.lineTo(0.2 - 0.0001, 0.035);
    // (outlet at mid height): rebuild cleanly as a closed polygon
    const hole = new THREE.Path();
    hole.moveTo(-0.199, -0.034); hole.lineTo(-0.06, -0.034); hole.lineTo(-0.06, -0.0); hole.lineTo(-0.03, 0.0); hole.lineTo(-0.03, 0.13); hole.lineTo(0.06, 0.13); hole.lineTo(0.06, 0.034); hole.lineTo(0.199, 0.034); hole.lineTo(0.199, -0.034);
    hole.lineTo(0.02, -0.034); hole.lineTo(0.02, -0.11); hole.lineTo(-0.1, -0.11); hole.lineTo(-0.1, -0.06); hole.lineTo(-0.199, -0.06); hole.closePath();
    // simpler readable path: inlet low-left -> up into the chamber around the needle -> seat at the chamber floor -> outlet low-right
    const h2 = new THREE.Path();
    h2.moveTo(-0.199, -0.035); h2.lineTo(-0.045, -0.035); h2.lineTo(-0.045, 0.14); h2.lineTo(0.045, 0.14); h2.lineTo(0.045, -0.01); h2.lineTo(0.022, -0.035); h2.lineTo(0.022, -0.075);
    h2.lineTo(0.199, -0.075); h2.lineTo(0.199, -0.145); h2.lineTo(-0.012, -0.145); h2.lineTo(-0.012, -0.035 - 0.001);
    // keep it simple and valid: one closed polygon without self-touching
    const H = new THREE.Path();
    H.moveTo(-0.199, -0.03); H.lineTo(-0.05, -0.03); H.lineTo(-0.05, 0.135); H.lineTo(0.05, 0.135); H.lineTo(0.05, 0.03); H.lineTo(0.03, 0.03); H.lineTo(0.03, 0.03); H.lineTo(0.022, 0.0);
    H.lineTo(0.022, -0.04); H.lineTo(0.199, -0.04); H.lineTo(0.199, -0.1); H.lineTo(-0.022, -0.1); H.lineTo(-0.022, -0.06); H.lineTo(-0.03, -0.06); H.lineTo(-0.03, -0.03); H.closePath();
    sh.holes.push(H);
    CB.add('grey', extZ(sh, -0.053, 0.053, 0, 8));
    CB.add('grey', extZ(rrectShape(-0.2, -0.2, 0.2, 0.17, 0.03), 0.05, 0.13, 0.012, 8));
    CB.add('grey', extZ(rrectShape(-0.2, -0.2, 0.2, 0.17, 0.03), -0.13, -0.05, 0.012, 8));
    for (const s of [1, -1]) { // end flanges (inlet low, outlet low)
      const yy = s < 0 ? 0 : -0.07;
      const gg = toX(lathe([[0.03, 0], [F3.R, 0], [F3.R, F3.T], [0.08, F3.T + 0.02], [0.075, 0.12], [0.03, 0.12], [0.03, 0]], SEG(28)));
      if (s > 0) gg.rotateY(PI); gg.translate(s * 0.32, yy * 0 + 0, 0); CB.add('grey', gg);
    }
    CB.build(g, CP, 'chokeBody');
    // seat ring (tungsten carbide) at the chamber floor + needle (stem + carbide tip)
    const IB = bin();
    IB.add('carbide', lathe([[0.012, -0.03], [0.03, -0.03], [0.03, 0.005], [0.016, 0.005], [0.012, -0.002], [0.012, -0.03]], SEG(28)).translate(0, 0, 0));
    IB.build(g, CP, 'seat');
    const needle = new THREE.Group(); g.add(g.part('needle', needle));
    const NB = bin();
    NB.add('carbide', lathe([[0, -0.012], [0.006, -0.01], [0.022, 0.03], [0.024, 0.05], [0, 0.05]], SEG(28)));
    NB.add('machined', lathe([[0, 0.05], [0.016, 0.05], [0.016, 0.30], [0, 0.30]], SEG(16)));
    NB.build(needle, CP, 'needle');
    // bonnet (outside, not cut) + operator
    B.add('grey', place(lathe([[0.017, 0], [0.1, 0], [0.1, 0.06], [0.07, 0.08], [0.06, 0.2], [0.03, 0.22], [0.017, 0.22]], SEG(28)), [0, 0.17, 0]));
    bolts.circle(frameAt([0, 0.17, 0]), 0.085, 6, 0.75 * IN, -0.03, 0.08, [0.064], 0.5, 401);
    let setOp;
    if (!o.hydraulic) {
      const wheel = new THREE.Mesh(handwheelGeo(0.18, 5, 0.014).rotateX(-PI / 2), P.wheel); wheel.position.y = 0.46; wheel.castShadow = true; g.add(g.part('handwheel', wheel));
      B.add('machined', place(cyl(0.018, 0.1, 12), [0, 0.41, 0]));
      // position indicator scale (1/64 in bean sizes) beside the stem
      const sc = canvas(128, 512), sx = sc.getContext('2d'); sx.fillStyle = '#e9e6dd'; sx.fillRect(0, 0, 128, 512); sx.fillStyle = '#111'; sx.font = `600 30px ${FONT}`;
      for (let i = 0; i <= 8; i++) { const yy = 490 - i * 58; sx.fillRect(0, yy, i % 2 ? 40 : 70, 5); if (!(i % 2)) sx.fillText(String(i * 8), 76, yy + 12); }
      const scale = new THREE.Mesh(new THREE.PlaneGeometry(0.035, 0.14), labelMat(ctex(sc))); scale.position.set(0.035, 0.32, 0.035); g.add(scale);
      const ptr = new THREE.Mesh(cbox(0.02, 0.006, 0.01, 0.001), P.wheel); g.add(ptr);
      setOp = u => { wheel.rotation.y = -u * 6 * TAU; ptr.position.set(0.03, 0.26 + u * 0.12, 0.04); };
    } else {
      B.add('blueGrey', place(lathe([[0, 0], [0.13, 0], [0.13, 0.02], [0.12, 0.03], [0.12, 0.33], [0.13, 0.34], [0.13, 0.36], [0, 0.36]], SEG(36)), [0, 0.39, 0]));
      bolts.circle(null, 0.115, 8, 0.5 * IN, 0.70, 0.765, [0.757], 0.5, 403);
      B.add('stainless', place(cbox(0.08, 0.1, 0.06, 0.008), [0.17, 0.6, 0])); // position transmitter
      B.add('hose', pipe([[0.1, 0.45, -0.08], [0.2, 0.45, -0.16], [0.25, 0.1, -0.35], [0.3, -0.85, -0.5]], 0.012, 0.06, 8));
      B.add('hose', pipe([[0.1, 0.68, -0.08], [0.22, 0.68, -0.18], [0.29, 0.1, -0.38], [0.34, -0.85, -0.52]], 0.012, 0.06, 8));
      const ind = new THREE.Mesh(cyl(0.015, 0.12, 10), P.yellow); g.add(g.part('indicator', ind));
      setOp = u => { ind.position.y = 0.75 + 0.04 + u * 0.06; };
    }
    B.build(g, P, 'chokeTop'); if (!o.bolts) bolts.build(g, P);
    g.api.setOpen = u => { u = clamp(u); needle.position.y = -0.012 + 0.0 + u * 0.075; setOp(u); };
    const cmats = [...collectMats(g).filter(m => Object.values(CP).includes(m))];
    const cut = cutter(g, cmats, { extent: 0.14 });
    g.api.setCut = u => cut.set(u); g.api.refreshCut = () => cut.refresh();
    g.api.setOpen(0.3);
    g.anchor('seat', [0, 0, 0.0]);
    return g;
  }

  // ================================================================== MUD GAS SEPARATOR (poor-boy, closed-bottom U-tube mud leg)
  // mudGasSeparator({ ventHeight = 9 })  y = 0 ground. Vessel 48" x 16 ft (r 0.61, shell y 0.9..5.8), 4" inlet at y 4.4
  // from +x onto a target (wear) plate, 5 staggered baffles, 10" vent line from the top head, 10" liquid outlet down into
  // the U-tube mud leg (seal height ~3 m = 10 ft), siphon breaker, outlet to the shaker header (+z).
  // api: setCut(u)  half-section of vessel + mud leg;  setLevel(u)  vessel mud level 0 (low, 1.3) .. 1 (2.9, normal)
  //      setLegLevel(u)  mud-leg column on the vessel side (1 = full seal; < 1 shows gas pushing the column down)
  // anchors: inlet, target, gasTop, ventBase, ventTop, ventEnd, legBottom, legTop, mudOut, level, stencil, gauge
  // paths (g.userData.paths): gas [inlet .. vent end], mud [inlet .. baffles .. leg .. out] (local Vector3 polylines)
  function mudGasSeparator(o = {}) {
    const g = asset('mudGasSeparator'); const P = palette({ paint: 0xd0731c, ...(o.colors || {}) }), B = bin(), bolts = boltSet();
    const R = 0.61, Y0 = 0.9, Y1 = 5.8, t = 0.012, ventH = o.ventHeight ?? 9;
    const head = (y, dir) => { const pts = []; for (let i = 0; i <= 10; i++) { const a = i / 10 * PI / 2; pts.push([R * Math.cos(a), y + dir * 0.32 * Math.sin(a), 1]); } return pts; };
    // shell + 2:1 heads as one closed solid with wall thickness
    const outer = [[0.13, Y0 - 0.32], ...head(Y0, -1).reverse().slice(0, -1), [R, Y0], [R, Y1, 1], ...head(Y1, 1).slice(1), [0.14, Y1 + 0.32]];
    const inner = outer.map(([r, y]) => [Math.max(0.12, r - t), y + (y < Y0 ? t : y > Y1 ? -t : 0)]);
    B.add('paint', lathe([...outer, ...inner.slice().reverse(), outer[0]], SEG(56)));
    // legs (4 pipe legs) + base plates, nozzle reinforcement pads
    for (let i = 0; i < 4; i++) { const a = PI / 4 + i * PI / 2, x = Math.cos(a) * (R - 0.02), z = Math.sin(a) * (R - 0.02);
      B.add('paint', cylBetween([x * 1.18, 0.02, z * 1.18], [x * 1.08, Y0 + 0.25, z * 1.08], 0.07, 14)); B.add('paint', place(cbox(0.16, 0.3, 0.03, 0.006), [x * 1.04, Y0 + 0.3, z * 1.04], [0, -Math.atan2(z, x) + PI / 2, 0])); B.add('skid', place(cbox(0.3, 0.02, 0.3, 0.004), [x * 1.18, 0.01, z * 1.18])); }
    // inlet nozzle (4") at +x, flanged, with incoming line
    const yIn = 4.4;
    B.add('paint', place(toX(cyl(0.06, 0.4, 18)), [R + 0.1, yIn, 0])); B.add('grey', place(toX(lathe([[0.05, 0], [0.135, 0], [0.135, 0.05], [0.07, 0.07], [0.05, 0.07]], SEG(24))), [R + 0.3, yIn, 0], [0, PI, 0]));
    B.add('grey', pipe([[R + 0.3, yIn, 0], [R + 1.0, yIn, 0], [R + 1.0, 1.2, 0], [R + 2.4, 1.2, 0]], 0.057, 0.25, 16));
    g.anchor('inlet', [R + 1.0, yIn, 0]);
    // vent (10") from the top head, straight up, elbow at the top
    const vr = 0.137, yv = Y1 + 0.32;
    B.add('paint', place(cyl(vr + 0.012, 0.2, 24), [0, yv + 0.05, 0]));
    B.add('grey', pipe([[0, yv + 0.15, 0], [0, yv + ventH, 0], [0.9, yv + ventH, 0]], vr, 0.4, 24));
    for (let k = 1; k <= Math.floor(ventH / 3); k++) B.add('grey', place(lathe([[vr, -0.03], [vr + 0.11, -0.03], [vr + 0.11, 0.03], [vr, 0.03]], SEG(24)), [0, yv + k * 3, 0])); // flanged joints
    // guy collar + 3 guy wires to ground anchors
    B.add('skid', place(cyl(vr + 0.04, 0.08, 24), [0, yv + ventH * 0.7, 0]));
    for (let i = 0; i < 3; i++) { const a = i / 3 * TAU + 0.4; B.add('stud', cylBetween([0, yv + ventH * 0.7, 0], [Math.cos(a) * 5.5, 0.05, Math.sin(a) * 5.5], 0.006, 4)); }
    g.anchor('ventBase', [0, yv + 0.2, 0]); g.anchor('ventTop', [0, yv + ventH, 0]); g.anchor('ventEnd', [0.9, yv + ventH, 0]);
    // liquid outlet (10") from the bottom head -> U-tube mud leg -> outlet to the shakers
    const lr = 0.137, legTop = 3.0;
    const leg = [[0, Y0 - 0.32, 0], [0, 0.32, 0], [0, 0.32, 1.25], [0, legTop, 1.25], [0, legTop, 2.3], [0, 1.6, 3.2]];
    B.add('grey', pipe(leg, lr, 0.35, 22));
    B.add('grey', pipe([[0, legTop + 0.15, 1.25], [0, Y1 + 0.1, 1.25], [0, Y1 + 0.1, R + 0.05]], 0.03, 0.12, 10)); // siphon breaker / equaliser
    B.add('skid', place(cbox(0.3, 0.3, 0.3, 0.01), [0, 0.15, 1.25])); // leg support
    B.add('grey', place(cyl(0.025, 0.08, 10), [0, 0.32 - lr - 0.04, 0.6])); // drain
    B.add('wheel', place(cyl(0.05, 0.01, 14), [0, 0.32 - lr - 0.09, 0.6]));
    g.anchor('legBottom', [0, 0.32, 0.6]); g.anchor('legTop', [0, legTop, 1.25]); g.anchor('mudOut', [0, 1.6, 3.2]);
    // ladder (rails + rungs) on -x side, top platform ring
    for (const z of [-0.22, 0.22]) B.add('yellow', cylBetween([-R - 0.18, 0.05, z], [-R - 0.18, Y1 + 0.3, z], 0.018, 8));
    for (let y = 0.35; y < Y1 + 0.2; y += 0.3) B.add('yellow', cylBetween([-R - 0.18, y, -0.22], [-R - 0.18, y, 0.22], 0.011, 6));
    for (let y = 1.0; y < Y1 + 0.2; y += 1.6) for (const z of [-0.2, 0.2]) B.add('skid', cylBetween([-R - 0.18, y, z], [-R, y, z * 0.7], 0.012, 6));
    // pressure gauge on top
    B.add('paint', place(cyl(0.03, 0.12, 12), [0.32, Y1 + 0.22, 0.0]));
    const gz = gauge(P, 0.07, dialTex({ max: 30, major: 5, minor: 1, label: 'MGS', sub: 'PSI' }), { stem: 0.04 }); gz.group.position.set(0.32, Y1 + 0.42, 0.02); g.add(gz.group);
    g.anchor('gauge', [0.32, Y1 + 0.45, 0.12]);
    // stencil (orange band label as in EP04)
    const lab = (() => { const c = canvas(1024, 512), x = c.getContext('2d'); x.clearRect(0, 0, 1024, 512); x.textAlign = 'center'; x.textBaseline = 'middle';
      x.fillStyle = '#1f2937'; fit(x, 'MUD GAS SEPARATOR', 700, 96, 940); x.fillText('MUD GAS SEPARATOR', 512, 110); x.fillRect(80, 186, 864, 8);
      x.fillStyle = '#fff7e6'; fit(x, 'namman.story', 700, 160, 900); x.fillText('namman.story', 512, 315);
      x.fillStyle = '#1f2937'; fit(x, 'MAX 150 PSI · VENT TO FLARE', 600, 48, 860); x.fillText('MAX 150 PSI · VENT TO FLARE', 512, 448); return ctex(c); })();
    const st = new THREE.Mesh(new THREE.CylinderGeometry(R + 0.003, R + 0.003, 1.4, 32, 1, true, -0.9, 1.8), decalMat(lab)); st.position.y = 3.2; g.add(st);
    g.anchor('stencil', [0, 3.2, R + 0.05]);
    // ---- internals (clipped too, shown as sections): target plate, 5 staggered baffles
    const IB = bin();
    IB.add('greyLt', place(cbox(0.03, 0.5, 0.6, 0.006), [-R + 0.08, yIn, 0]));
    IB.add('greyLt', place(cbox(0.12, 0.03, 0.5, 0.004), [-R + 0.14, yIn - 0.26, 0]));
    const baff = [];
    for (let k = 0; k < 5; k++) {
      const yb = 3.9 - k * 0.42, s = k % 2 ? 1 : -1;
      const shp = new THREE.Shape(); const cx = s * 0.12; // half-disc (chord at x = cx), slightly tilted
      shp.absarc(0, 0, R - t - 0.002, s > 0 ? PI / 2 + Math.acos(0.12 / R) - PI / 2 : -Math.acos(-0.12 / R), 0, false);
      const sd = new THREE.Shape(); const a0 = Math.acos(clamp(-cx * s / (R - 0.014), -1, 1));
      sd.moveTo(cx, -Math.sqrt((R - 0.014) ** 2 - cx * cx)); sd.absarc(0, 0, R - 0.014, -Math.acos(cx / (R - 0.014)), Math.acos(cx / (R - 0.014)), s < 0 ? true : false); sd.closePath();
      const gg = slab(sd, yb - 0.01, yb + 0.01, 0, 24); if (s < 0) gg.rotateY(0);
      gg.translate(0, -yb, 0); gg.rotateZ(-s * 0.18); gg.translate(0, yb, 0);
      IB.add('greyLt', gg); baff.push([s * 0.3, yb]);
    }
    IB.build(g, P, 'mgsInternals');
    // mud: vessel pool + mud in the leg (seal column)
    const mudM = mat(0xc8925a, { kind: 'wet', metal: 0.0, rough: 0.35, blotch: 0.1, streak: 0.0, scale: 1.5, cap: 0xb88452 });
    const pool = new THREE.Mesh(lathe([[0, Y0 - 0.32 + t], ...inner.filter(p => p[1] <= Y0 + 0.01).reverse().map(p => [p[0] - 0.002, p[1], 1]), [R - t - 0.002, Y0 + 0.01], [R - t - 0.002, Y0 + 1], [0, Y0 + 1]], SEG(48)), mudM); g.add(g.part('pool', pool));
    const legMud = new THREE.Mesh(pipe(leg.slice(0, 4), lr - 0.012, 0.35, 18, true), mudM); g.add(g.part('legMud', legMud));
    B.build(g, P, 'mgs'); bolts.build(g, P);
    const cutMats = collectMats(g, []);
    const cut = cutter(g, cutMats, { extent: R + 0.4 });
    g.api.setCut = u => cut.set(u); g.api.refreshCut = () => cut.refresh();
    const levelA = g.anchor('level', [0, 2.9, 0.0]);
    const poolBaseH = 1; // pool geometry top at Y0 + 1 (scaled about Y0)
    g.api.setLevel = u => { const yl = lerp(1.3, 2.9, clamp(u)); const sy = (yl - Y0) / poolBaseH; pool.scale.y = 1; pool.geometry.computeBoundingBox();
      // scale only the cylindrical part: shift by moving the mesh and scaling around Y0
      pool.position.y = Y0 * (1 - sy); pool.scale.y = sy; levelA.position.y = yl; };
    g.api.setLegLevel = u => { legMud.visible = u > 0.01; };
    g.api.setGauge = v => gz.setValue(v);
    g.api.setLevel(1);
    const L = (...pts) => pts.map(p => V3(...p));
    g.userData.paths = {
      gas: L([R + 1.0, yIn, 0], [R + 0.1, yIn, 0], [-R + 0.15, yIn, 0], [-0.1, yIn + 0.4, 0], [0, Y1 + 0.2, 0], [0, yv + ventH, 0], [0.9, yv + ventH, 0]),
      mud: L([R + 1.0, yIn, 0], [-R + 0.15, yIn, 0], [-R + 0.2, yIn - 0.3, 0], ...baff.map(([x, y]) => [x, y + 0.05, 0]), [0, 2.9, 0], [0, Y0 - 0.3, 0], [0, 0.32, 0], [0, 0.32, 1.25], [0, legTop, 1.25], [0, legTop, 2.3], [0, 1.6, 3.2]),
    };
    g.anchor('target', [-R + 0.12, yIn, 0.2]); g.anchor('gasTop', [0, Y1 + 0.1, 0]);
    g.traverse(mm => { if (mm.isMesh) mm.userData.sys = 'wc'; });
    return g;
  }

  // ================================================================== TRIP TANK (tall narrow, sight glass + scale, pump)
  // tripTank()  y = 0 ground. Tank r 0.55 x 3.2 m on a skirt, sight glass + level board (+z), fill line to the bell
  // nipple (top), suction to a small centrifugal pump. api: setLevel(u) (0 empty .. 1 full), setCut(u)
  // anchors: level, board, pump, fillLine, top
  function tripTank(o = {}) {
    const g = asset('tripTank'); const P = palette({ paint: 0xb9b2a4, ...(o.colors || {}) }), B = bin();
    const R = 0.55, Y0 = 0.35, Y1 = 3.55, t = 0.008;
    const outer = [[0.0, Y0], [R - 0.02, Y0], [R, Y0 + 0.02], [R, Y1 - 0.02], [R - 0.02, Y1], [0.0, Y1]];
    B.add('paint', lathe([[0.0, Y0], [R - 0.02, Y0], [R, Y0 + 0.02], [R, Y1 - 0.02], [R - 0.02, Y1], [0.05, Y1], [0.05, Y1 - t], [R - t, Y1 - t], [R - t, Y0 + t], [0, Y0 + t]], SEG(56)));
    B.add('paint', lathe([[R - 0.05, 0], [R + 0.02, 0], [R + 0.02, 0.03], [R - 0.0, 0.03], [R - 0.0, Y0], [R - 0.05, Y0], [R - 0.05, 0]], SEG(56))); // skirt
    for (const y of [1.2, 2.4]) B.add('paint', lathe([[R, y - 0.025], [R + 0.012, y - 0.02], [R + 0.012, y + 0.02], [R, y + 0.025]], SEG(56))); // stiffener rings
    // sight glass (+z) with guards and the level board
    B.add('stainless', place(cbox(0.06, Y1 - Y0 - 0.2, 0.04, 0.006), [0.18, (Y0 + Y1) / 2, R + 0.06]));
    for (const y of [Y0 + 0.12, Y1 - 0.12]) B.add('grey', cylBetween([0.18, y, R - 0.01], [0.18, y, R + 0.07], 0.018, 10));
    const glass = new THREE.Mesh(cyl(0.02, Y1 - Y0 - 0.3, 12), new THREE.MeshStandardMaterial({ color: 0xdfe8ee, transparent: true, opacity: 0.25, roughness: 0.05, metalness: 0, depthWrite: false })); glass.position.set(0.18, (Y0 + Y1) / 2, R + 0.09); g.add(glass);
    const mudM = mat(0xc8925a, { kind: 'wet', metal: 0, rough: 0.35, blotch: 0.08, streak: 0, cap: 0xb88452 });
    const col = new THREE.Mesh(cyl(0.016, 1, 12), mudM); g.add(g.part('sightMud', col));
    const bc = canvas(256, 1536), bx = bc.getContext('2d'); bx.fillStyle = '#f2efe6'; bx.fillRect(0, 0, 256, 1536); bx.fillStyle = '#16181b'; bx.font = `600 44px ${FONT}`;
    for (let i = 0; i <= 40; i++) { const y = 1500 - i * 36; bx.fillRect(0, y, i % 5 ? 50 : 110, i % 5 ? 4 : 8); if (!(i % 5)) bx.fillText(String(i), 128, y + 16); }
    bx.font = `700 40px ${FONT}`; bx.fillText('BBL', 120, 40);
    const board = new THREE.Mesh(new THREE.PlaneGeometry(0.16, Y1 - Y0 - 0.25), labelMat(ctex(bc))); board.position.set(0.32, (Y0 + Y1) / 2, R + 0.03); board.rotation.y = 0.15; g.add(board);
    // fill line up to the bell nipple, suction + pump
    B.add('grey', pipe([[-0.25, Y1, 0.1], [-0.25, Y1 + 0.5, 0.1], [-1.4, Y1 + 0.5, 0.1]], 0.05, 0.15, 14)); g.anchor('fillLine', [-1.4, Y1 + 0.5, 0.1]);
    B.add('grey', pipe([[-R + 0.02, Y0 + 0.15, 0], [-R - 0.4, Y0 + 0.15, 0], [-R - 0.4, 0.4, 0]], 0.05, 0.12, 14));
    const PB = new THREE.Group(); PB.position.set(-R - 0.75, 0, 0); g.add(g.part('pump', PB));
    const pb = bin(); pb.add('skid', place(cbox(0.9, 0.08, 0.45, 0.006), [0, 0.04, 0]));
    pb.add('grey', toZ(lathe([[0, -0.08], [0.16, -0.08], [0.18, -0.05], [0.18, 0.05], [0.16, 0.08], [0, 0.08]], SEG(28))).translate(0.32, 0.34, 0));
    pb.add('green', toX(lathe([[0, -0.2], [0.12, -0.2], [0.13, -0.18], [0.13, 0.18], [0.1, 0.2], [0, 0.22]], SEG(28))).translate(-0.12, 0.25, 0));
    pb.add('yellow', place(cbox(0.12, 0.2, 0.2, 0.008), [0.16, 0.25, 0])); pb.build(PB, P, 'ttPump');
    g.anchor('pump', [-R - 0.75, 0.5, 0.3]);
    const st = new THREE.Mesh(new THREE.CylinderGeometry(R + 0.003, R + 0.003, 1.6, 24, 1, true, -0.55, 0.7), decalMat(stencilTex([['TRIP TANK', 120], ['40 BBL', 80]], { w: 512, h: 512, color: '#1f2937' })));
    st.position.y = 2.2; st.rotation.y = -0.5; g.add(st);
    // tank mud column (for the cut)
    const tm = new THREE.Mesh(cyl(R - t - 0.002, 1, 48), mudM); g.add(g.part('mud', tm));
    B.build(g, P, 'trip');
    const cut = cutter(g, collectMats(g, [glass.material]), { extent: R + 0.3 });
    g.api.setCut = u => cut.set(u); g.api.refreshCut = () => cut.refresh();
    const levA = g.anchor('level', [0, 2, R + 0.1]); g.anchor('board', [0.32, 2, R + 0.12]); g.anchor('top', [0, Y1, 0]);
    g.api.setLevel = u => { const h = lerp(0.05, Y1 - Y0 - 0.25, clamp(u)); tm.scale.y = h; tm.position.y = Y0 + t + h / 2; col.scale.y = Math.max(0.01, h - 0.1); col.position.set(0.18, Y0 + 0.15 + (h - 0.1) / 2, R + 0.09); levA.position.y = Y0 + h; };
    g.api.setLevel(0.6);
    g.traverse(mm => { if (mm.isMesh) mm.userData.sys = 'wc'; });
    return g;
  }


  // ================================================================== IN-PIPE VALVES
  // ball valve sub body: closed lathe with bore r 0.038 and a spherical ball cavity at yb (radius rb); box up, pin down
  function ballSubProfile(y0, y1, R, yb, rb = 0.072, bore = 0.038) {
    const outer = [[bore, y0], [R * 0.82, y0], [R * 0.86, y0 + 0.012], [R * 0.86, y0 + 0.09], [R - 0.006, y0 + 0.1], [R, y0 + 0.106], [R, y1 - 0.006], [R - 0.006, y1]];
    const inner = [[bore, y0], [bore, yb - rb * 0.95]];
    for (let i = 1; i < 12; i++) { const a = -PI / 2 + i / 12 * PI; inner.push([Math.max(bore, rb * Math.cos(a) * 1.02), yb + rb * Math.sin(a), 1]); }
    inner.push([bore, yb + rb * 0.95], [bore, y1 - 0.12], [0.06, y1 - 0.11], [0.062, y1]);
    return [...outer, ...inner.slice().reverse()];
  }
  function ballGeo(rb = 0.07, bore = 0.038) { // sphere with a through bore along y (lathe), flats for the stem on +-x
    const pts = [[bore, -Math.sqrt(rb * rb - bore * bore)]];
    for (let i = 1; i < 16; i++) { const a = -PI / 2 + i / 16 * PI; const r = rb * Math.cos(a); if (r > bore) pts.push([r, rb * Math.sin(a), 1]); }
    pts.push([bore, Math.sqrt(rb * rb - bore * bore)], [bore, -Math.sqrt(rb * rb - bore * bore)]);
    return lathe(pts, SEG(36));
  }
  // top drive IBOP pair: drive-stem stub, upper IBOP (remote, actuator yoke + crank + 2 cylinders), lower IBOP (manual,
  // hex socket for the IBOP wrench), saver sub. y = 0 at the saver-sub pin. Stem (ball axis) along x.
  // api: setUpper(u), setLower(u) (0 open .. 1 closed, ball turns 90 deg about x), setCut(u)
  // anchors: upper, lower, socket (lower IBOP wrench socket), actuator
  function ibopValves(o = {}) {
    const g = asset('ibopValves'); const P = palette({ grey: 0x6b7280, ...(o.colors || {}) }), B = bin(), R = 0.1;
    const yL = 0.42, yU = 1.12;
    B.add('machined', lathe([[0.038, 0], [0.07, 0], [0.075, 0.02], [0.075, 0.12], [R - 0.01, 0.13], [R, 0.15], [R, 0.18], [0.038, 0.18], [0.038, 0]], SEG(40))); // saver sub
    B.add('greyLt', lathe(ballSubProfile(0.18, 0.72, R, yL), SEG(48)));
    B.add('greyLt', lathe(ballSubProfile(0.72, 1.55, R + 0.004, yU), SEG(48)));
    B.add('machined', lathe([[0.038, 1.55], [0.09, 1.55], [0.095, 1.57], [0.095, 2.1], [0.038, 2.1], [0.038, 1.55]], SEG(40))); // drive stem stub
    for (const y of [0.72, 1.55]) B.add('nut', lathe([[R - 0.004, y - 0.006], [R + 0.004, y - 0.004], [R + 0.004, y + 0.004], [R - 0.004, y + 0.006]], SEG(48))); // tool-joint shoulders
    // lower IBOP: hex socket on +x (wrench), stem caps both sides
    for (const s of [1, -1]) { B.add('machined', place(toX(cyl(0.03, 0.012, 20)), [s * (R + 0.002), yL, 0])); }
    B.add('black', place(toX(cyl(0.017, 0.014, 6)), [R + 0.006, yL, 0]));
    // upper IBOP actuator: shell collar, yoke arms, 2 hydraulic cylinders, crank on the +x stem
    B.add('grey', lathe([[R + 0.005, yU - 0.2], [R + 0.07, yU - 0.2], [R + 0.075, yU - 0.19], [R + 0.075, yU + 0.25], [R + 0.07, yU + 0.26], [R + 0.005, yU + 0.26], [R + 0.005, yU - 0.2]], SEG(48)));
    for (const s of [1, -1]) {
      B.add('yellow', place(cbox(0.06, 0.32, 0.05, 0.008), [s * (R + 0.11), yU + 0.03, 0.12]));
      B.add('grey', place(cyl(0.035, 0.24, 16), [s * (R + 0.11), yU + 0.1, -0.12]));
      B.add('machined', place(cyl(0.012, 0.12, 10), [s * (R + 0.11), yU - 0.06, -0.12]));
      B.add('hose', pipe([[s * (R + 0.11), yU + 0.22, -0.12], [s * (R + 0.11), yU + 0.4, -0.14], [s * 0.05, yU + 0.7, -0.25]], 0.01, 0.06, 8));
    }
    B.build(g, P, 'ibop');
    const mkBall = (y, crank) => { const grp = new THREE.Group(); grp.position.y = y; g.add(grp); const m = new THREE.Mesh(ballGeo(0.068), P.chrome); m.castShadow = true; grp.add(m);
      const sb = bin(); for (const s of [1, -1]) sb.add('carbide', place(lathe([[0.04, -0.012], [0.07, -0.012], [0.07, 0.012], [0.042, 0.012], [0.04, -0.012]], SEG(32)), [0, s * 0.062, 0])); sb.build(g, P, 'seats').position.y = 0;
      return grp; };
    // seats live in the body (static): rebuild with y offsets
    const seatsL = bin(), seatsU = bin();
    for (const [bb, y] of [[seatsL, yL], [seatsU, yU]]) { for (const s of [1, -1]) bb.add('carbide', place(lathe([[0.04, -0.012], [0.072, -0.012], [0.072, 0.012], [0.042, 0.012], [0.04, -0.012]], SEG(32)), [0, y + s * 0.064, 0])); bb.build(g, P, 'seat'); }
    const ballL = new THREE.Group(); ballL.position.y = yL; g.add(g.part('lowerBall', ballL)); const bl = new THREE.Mesh(ballGeo(0.068), P.chrome); bl.castShadow = true; ballL.add(bl);
    const ballU = new THREE.Group(); ballU.position.y = yU; g.add(g.part('upperBall', ballU)); const bu = new THREE.Mesh(ballGeo(0.068), P.chrome); bu.castShadow = true; ballU.add(bu);
    const crank = new THREE.Mesh(merge([place(cbox(0.03, 0.16, 0.03, 0.005), [0, 0.06, 0]), toX(cyl(0.03, 0.03, 16))]), P.machined); crank.position.set(R + 0.09, yU, 0); g.add(g.part('crank', crank));
    const cutMats = collectMats(g, [P.chrome, P.machined]).concat([]);
    const cut = cutter(g, collectMats(g, [P.chrome]), { extent: 0.2 });
    g.api.setCut = u => cut.set(u); g.api.refreshCut = () => cut.refresh();
    g.api.setUpper = u => { const a = easeIO(u) * PI / 2; ballU.rotation.x = a; crank.rotation.x = a; };
    g.api.setLower = u => { ballL.rotation.x = easeIO(u) * PI / 2; };
    g.api.setUpper(0); g.api.setLower(0);
    g.anchor('upper', [R + 0.2, yU, 0.15]); g.anchor('lower', [R + 0.1, yL, 0.12]); g.anchor('socket', [R + 0.02, yL, 0]); g.anchor('actuator', [R + 0.12, yU + 0.1, 0.18]);
    g.traverse(mm => { if (mm.isMesh) mm.userData.sys = 'wc'; });
    return g;
  }
  // FOSV (full-opening safety / TIW valve) standing on the rig floor, open, with its wrench and a crossover beside it.
  // y = 0 floor. api: setClose(u) (ball + wrench turn 90 deg), setWrenchIn(u) (0 lying beside .. 1 in the socket),
  //      setCut(u). anchors: valve, socket, wrench
  function fosv(o = {}) {
    const g = asset('fosv'); const P = palette({ ...(o.colors || {}) }), B = bin(), R = 0.085, yb = 0.33;
    const body = new THREE.Group(); g.add(body);
    B.add('greyLt', lathe(ballSubProfile(0.0, 0.62, R, yb, 0.062, 0.036), SEG(48)));
    B.add('yellow', lathe([[R, 0.5], [R + 0.003, 0.5], [R + 0.003, 0.53], [R, 0.53]], SEG(48))); // colour band (valve ID)
    B.add('machined', place(toZ(cyl(0.026, 0.01, 20)), [0, yb, R + 0.001])); B.add('black', place(toZ(cyl(0.015, 0.012, 6)), [0, yb, R + 0.004]));
    B.add('machined', place(toZ(cyl(0.026, 0.01, 20)), [0, yb, -R - 0.001]));
    // stand / thread protector on the floor
    B.add('black', lathe([[0, 0], [0.07, 0], [0.07, 0.03], [0, 0.03]], SEG(24)));
    // open / close marks
    const mk = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 0.03), labelMat(nameplateTex([], { title: 'OPEN', w: 256, h: 128 }))); mk.position.set(0, yb + 0.06, R + 0.002); g.add(mk);
    // crossover sub beside it
    B.add('machined', place(lathe([[0.03, 0], [0.075, 0], [0.075, 0.18], [0.065, 0.2], [0.065, 0.36], [0.03, 0.36], [0.03, 0]], SEG(32)), [0.32, 0, -0.12]));
    B.build(g, P, 'fosv');
    const ball = new THREE.Group(); ball.position.y = yb; g.add(g.part('ball', ball)); const bm = new THREE.Mesh(ballGeo(0.06, 0.036).rotateZ(0), P.chrome); ball.add(bm);
    const sb = bin(); for (const s of [1, -1]) sb.add('carbide', place(lathe([[0.036, -0.01], [0.064, -0.01], [0.064, 0.01], [0.038, 0.01], [0.036, -0.01]], SEG(32)), [0, yb + s * 0.057, 0])); sb.build(g, P, 'seats');
    // wrench: hex key bar (L) — short leg in the socket, long handle
    const wr = new THREE.Group(); g.add(g.part('wrench', wr));
    const wb = bin(); wb.add('wheel', place(cbox(0.034, 0.034, 0.5, 0.004), [0, 0, 0.27])); wb.add('machined', place(toZ(cyl(0.015, 0.06, 6)), [0, 0, 0.0])); wb.add('black', place(cbox(0.044, 0.044, 0.16, 0.006), [0, 0, 0.45]));
    wb.build(wr, P, 'wrench');
    let wIn = 0, cl = 0;
    const upd = () => {
      const e = easeIO(wIn);
      // lying on the floor beside the valve -> socket (+z face), handle pointing up then turned
      const lie = { p: V3(0.02, 0.022, 0.24), r: new THREE.Euler(0, 1.45, 0) }, ins = { p: V3(0, yb, R + 0.03), r: new THREE.Euler(-PI / 2 + 0.0, 0, 0) };
      wr.position.lerpVectors(lie.p, ins.p, e);
      const q0 = new THREE.Quaternion().setFromEuler(lie.r), q1 = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, -easeIO(cl) * PI / 2)).multiply(new THREE.Quaternion().setFromEuler(ins.r));
      wr.quaternion.slerpQuaternions(q0, q1, e);
      ball.rotation.z = easeIO(cl) * PI / 2;
    };
    g.api.setWrenchIn = u => { wIn = clamp(u); upd(); }; g.api.setClose = u => { cl = clamp(u); upd(); };
    const cut = cutter(g, collectMats(g, [P.chrome, P.wheel, P.black]), { extent: 0.15 });
    g.api.setCut = u => cut.set(u); g.api.refreshCut = () => cut.refresh();
    upd(); g.anchor('valve', [0, 0.45, R + 0.1]); g.anchor('socket', [0, yb, R]); g.anchor('wrench', [0.22, 0.05, 0.3], wr);
    g.traverse(mm => { if (mm.isMesh) mm.userData.sys = 'wc'; });
    return g;
  }
  // float sub with a flapper float valve, just above the bit. y = 0 at the pin. api: setFlap(u) (0 open, pushed down
  // by flow .. 1 closed on the seat by back-flow; small bounce near 1), setCut(u). anchors: flapper, seat, flowIn
  function floatSub(o = {}) {
    const g = asset('floatSub'); const P = palette({}), B = bin(), R = 0.085, L = 0.9;
    B.add('greyLt', lathe([[0.05, 0], [0.07, 0], [0.074, 0.012], [0.074, 0.1], [R, 0.11], [R, L - 0.005], [R - 0.005, L], [0.058, L], [0.058, 0.62], [0.052, 0.6], [0.052, 0.12], [0.05, 0.1], [0.05, 0]], SEG(48)));
    // valve cartridge: cage sleeve + seat
    const yS = 0.5;
    B.add('machined', lathe([[0.034, yS - 0.32], [0.051, yS - 0.32], [0.051, yS + 0.08], [0.034, yS + 0.08], [0.034, yS + 0.0], [0.03, yS - 0.005], [0.03, yS - 0.02], [0.044, yS - 0.03], [0.044, yS - 0.3], [0.034, yS - 0.32]], SEG(40)));
    B.add('rubber', lathe([[0.03, yS - 0.03], [0.036, yS - 0.03], [0.036, yS - 0.022], [0.03, yS - 0.022], [0.03, yS - 0.03]], SEG(40))); // seat seal
    B.build(g, P, 'float');
    // flapper (disc + hinge pin + torsion spring) hinged at -x below the seat
    const fl = new THREE.Group(); fl.position.set(-0.034, yS - 0.04, 0); g.add(g.part('flapper', fl));
    const fb = bin(); fb.add('chrome', place(cyl(0.036, 0.01, 28), [0.034, 0, 0])); fb.add('chrome', place(cbox(0.016, 0.012, 0.02, 0.002), [0.004, 0, 0])); fb.add('black', place(cyl(0.03, 0.004, 28), [0.034, 0.007, 0]));
    fb.build(fl, P, 'flap');
    const pin = new THREE.Mesh(toZ(cyl(0.004, 0.05, 8)), P.stud); pin.position.copy(fl.position); g.add(pin);
    const spring = new THREE.Mesh(new THREE.TorusGeometry(0.008, 0.0018, 6, 16).rotateY(PI / 2), P.stud); spring.position.copy(fl.position); g.add(spring);
    const cut = cutter(g, collectMats(g, [P.chrome, P.stud]), { extent: 0.12 });
    g.api.setCut = u => cut.set(u); g.api.refreshCut = () => cut.refresh();
    // open = swung down along the cage wall (-90 deg), closed = horizontal under the seat
    g.api.setFlap = u => { u = clamp(u); const k = u < 0.85 ? easeIn(u / 0.85) : 1 + 0.05 * Math.sin((u - 0.85) / 0.15 * PI) * (1 - (u - 0.85) / 0.15); fl.rotation.z = -PI / 2 * (1 - Math.min(1.02, k)); };
    g.api.setFlap(0);
    g.anchor('flapper', [0, yS - 0.05, 0.1]); g.anchor('seat', [0, yS, 0.1]); g.anchor('flowIn', [0, L, 0]);
    g.traverse(mm => { if (mm.isMesh) mm.userData.sys = 'wc'; });
    return g;
  }

  // ================================================================== DIVERTER on the conductor (shallow-gas top hole)
  // diverter({ ventLength = 7 })  y = 0 ground. 30" conductor, 29-1/2" 500 psi diverter housing (y 0.6..1.55), two 12" vent
  // outlets (+x / -x) with hydraulic full-opening valves and vent lines, flowline outlet (-z).
  // api: setClose(u) (packer closes onto the pipe), setVent(side, u) side 'R'|'L' (valve indicator), setCut(u)
  // anchors: diverter, ventR, ventL, ventEndR, ventEndL, flowline, packer
  function diverter(o = {}) {
    const g = asset('diverter'); const P = palette({ paint: 0x6b6f2a, ...(o.colors || {}) }), B = bin(), bolts = boltSet();
    const F = FL['29-1/2x500'], Rc = 0.381, y0 = 0.6, y1 = 1.55, Rb = 0.82, vl = o.ventLength ?? 7;
    B.add('gun', lathe([[Rc - 0.02, -1.2], [Rc, -1.2], [Rc, y0], [Rc - 0.02, y0], [Rc - 0.02, -1.2]], SEG(56))); // conductor
    B.add('paint', lathe([[0.38, y0], [F.R, y0], [F.R, y0 + F.T], [Rb, y0 + F.T + 0.05], [Rb, y1 - 0.12], [Rb - 0.05, y1 - 0.05], [0.55, y1], [0.38, y1], [0.38, y1 - 0.25, 0, 'machined'], [0.6, y1 - 0.3], [0.6, y0 + 0.25], [0.38, y0 + 0.2], [0.38, y0]], SEG(64)));
    bolts.circle(null, F.BC, F.n, F.d, y0 - 0.05, y0 + F.T + 0.03, [y0 + F.T + 0.015], 0.5, 501);
    B.add('paint', place(padEye(0.15, 0.17, 0.05, 0.035), [0, y1 - 0.02, 0.5], [0, 0, 0]));
    const vents = {};
    for (const [k, s] of [['R', 1], ['L', -1]]) {
      const yv = y0 + 0.42, vr = 0.162;
      B.add('paint', place(toX(cyl(vr + 0.015, 0.4, 28)), [s * (Rb + 0.12), yv, 0]));
      const vg = new THREE.Group(); vg.position.set(s * (Rb + 0.55), yv, 0); g.add(vg);
      const vb = bin(); vb.add('grey', cbox(0.36, 0.5, 0.42, 0.03)); vb.add('grey', place(cyl(0.12, 0.35, 28), [0, 0.42, 0])); vb.add('grey', place(cyl(0.135, 0.04, 28), [0, 0.61, 0]));
      for (const ss of [1, -1]) vb.add('grey', place(toX(lathe([[vr, 0], [vr + 0.12, 0], [vr + 0.12, 0.05], [vr + 0.02, 0.08], [vr, 0.08]], SEG(28))), [ss * 0.22, 0, 0], ss > 0 ? [0, PI, 0] : [0, 0, 0]));
      vb.build(vg, P, 'ventValve');
      const ind = new THREE.Mesh(cyl(0.02, 0.15, 10), P.yellow); vg.add(ind); vents[k] = ind;
      B.add('grey', pipe([[s * (Rb + 0.78), yv, 0], [s * (Rb + 0.78 + vl), yv, 0]], vr, 0.4, 28));
      for (let d = 2; d < vl; d += 2.5) B.add('skid', place(cbox(0.25, yv - vr, 0.3, 0.01), [s * (Rb + 0.78 + d), (yv - vr) / 2, 0]));
      g.anchor('vent' + k, [s * (Rb + 0.55), yv + 0.4, 0.3]); g.anchor('ventEnd' + k, [s * (Rb + 0.78 + vl), yv, 0]);
    }
    B.add('paint', place(cyl(0.15, 0.4, 24).rotateX(PI / 2), [0, y1 - 0.3, -(Rb + 0.12)])); g.anchor('flowline', [0, y1 - 0.3, -(Rb + 0.35)]);
    // packer (rubber) inside the housing: annular ring that closes in
    const pk = new THREE.Mesh(lathe([[0.4, y0 + 0.3], [0.59, y0 + 0.3], [0.59, y1 - 0.32], [0.4, y1 - 0.32], [0.4, y0 + 0.3]], SEG(56)), P.rubber); g.add(g.part('packer', pk));
    const pipeM = mat(0x46505b, { kind: 'steel', metal: 0.7, rough: 0.42, blotch: 0.2, streak: 0.1, scale: 2 });
    const dp = new THREE.Mesh(drillPipeGeo(-1.0, 3.2), pipeM); g.add(g.part('pipe', dp));
    const st = new THREE.Mesh(new THREE.CylinderGeometry(Rb + 0.003, Rb + 0.003, 0.3, 32, 1, true, -0.5, 1.0), decalMat(stencilTex([['DIVERTER 29-1/2" 500 PSI', 70]], { w: 1024, h: 128 }))); st.position.y = y0 + 0.62; g.add(st);
    B.build(g, P, 'div'); bolts.build(g, P);
    const cut = cutter(g, collectMats(g, [pipeM]), { extent: 1.0 });
    g.api.setCut = u => cut.set(u); g.api.refreshCut = () => cut.refresh();
    g.api.setClose = u => { const e = easeIO(u), rin = lerp(0.4, PIPE_R + 0.0, e); const k = (rin) / 0.4; pk.scale.set(lerp(1, 0.62, e), 1 + 0.08 * e, lerp(1, 0.62, e)); pk.position.y = -0.04 * e; };
    g.api.setVent = (side, u) => { const m = vents[side]; if (m) m.position.y = 0.68 + 0.1 * easeIO(u); };
    g.api.setClose(0); g.api.setVent('R', 0); g.api.setVent('L', 0);
    g.anchor('diverter', [0, y1, Rb]); g.anchor('packer', [0, (y0 + y1) / 2, 0.6]);
    g.traverse(mm => { if (mm.isMesh) mm.userData.sys = 'wc'; });
    return g;
  }

  // ================================================================== TEST PLUG + CHART RECORDER
  // testPlug()  origin at the landing shoulder (place at casingHead/stack anchor 'bowl' or at y 0.315 above the casing-
  // head base). Mandrel with box connection + drill-pipe stub, plug body with elastomer seal, 45 deg landing shoulder,
  // bull nose, weep port. api: setDrop(u) (0 = landed .. 1 = 1.2 m above), setSeal(u) (seal swells)
  function testPlug(o = {}) {
    const g = asset('testPlug'); const P = palette({}), B = bin();
    const R = 0.172;
    B.add('greyLt', lathe([[0, -0.12], [0.08, -0.12], [0.12, -0.06], [0.156, -0.015], [R - 0.004, 0.0], [R, 0.004], [R, 0.06], [R - 0.004, 0.065], [0.16, 0.065], [0.16, 0.1], [R, 0.1], [R, 0.16], [0.14, 0.18], [0.1, 0.19], [0.09, 0.26], [0.0, 0.26]], SEG(56)));
    const seal = new THREE.Mesh(lathe([[0.155, 0.065], [R + 0.003, 0.068, 1], [R + 0.004, 0.082, 1], [R + 0.003, 0.097], [0.155, 0.1], [0.155, 0.065]], SEG(56)), P.rubber); g.add(g.part('seal', seal));
    B.add('black', place(toX(cyl(0.008, 0.02, 8)), [R - 0.005, 0.13, 0])); // weep port
    for (let i = 0; i < 4; i++) { const a = i / 4 * TAU + PI / 4; B.add('nut', place(cyl(0.018, 0.012, 12), [Math.cos(a) * 0.13, 0.181, Math.sin(a) * 0.13])); } // lifting holes / set screws
    B.add('machined', drillPipeGeo(0.26, 1.6, 0.42));
    B.build(g, P, 'plug');
    g.api.setDrop = u => { g.children.forEach(c => { if (c.isMesh) c.position.y = 1.2 * easeIO(u); }); };
    g.api.setSeal = u => { seal.scale.set(1 + 0.012 * clamp(u), 1, 1 + 0.012 * clamp(u)); };
    g.anchor('plug', [0, 0.1, R + 0.05]); g.anchor('seal', [R, 0.08, 0]);
    g.traverse(mm => { if (mm.isMesh) mm.userData.sys = 'wc'; });
    return g;
  }
  // circular chart recorder (12" chart, 0-15,000 psi, pen + rotating chart). Box faces +z, centre at y 1.2 on a stand.
  // api: setTrace(u, profile?)  u = test time 0..1; profile(u) -> psi (default: low test 300 psi hold, bleed, high test
  //      10,000 psi hold flat); the trace is drawn on the chart up to u, the chart turns, the pen follows.
  // anchors: chart, pen
  function chartRecorder(o = {}) {
    const g = asset('chartRecorder'); const P = palette({ paint: 0x2f3a46 }), B = bin();
    const Y = 1.2, Rch = 0.152;
    B.add('paint', place(cbox(0.42, 0.46, 0.13, 0.015, 2), [0, Y, 0]));
    B.add('stainless', toZ(lathe([[Rch + 0.006, 0], [Rch + 0.03, 0], [Rch + 0.03, 0.022], [Rch + 0.02, 0.028], [Rch + 0.006, 0.024], [Rch + 0.006, 0]], SEG(48))).translate(0, Y, 0.064));
    B.add('grey', place(cbox(0.06, Y - 0.23, 0.06, 0.006), [0, (Y - 0.23) / 2, -0.03]));
    B.add('grey', place(cbox(0.4, 0.02, 0.4, 0.004), [0, 0.01, 0]));
    B.add('stainless', pipe([[0.16, Y - 0.23, -0.02], [0.16, Y - 0.5, -0.02], [0.3, Y - 0.7, -0.2]], 0.006, 0.05, 6));
    B.build(g, P, 'rec');
    const c = canvas(1024, 1024), x = c.getContext('2d'), tx = ctex(c);
    const chart = new THREE.Mesh(new THREE.CircleGeometry(Rch, SEG(64)), new THREE.MeshStandardMaterial({ map: tx, roughness: 0.8, metalness: 0 }));
    chart.position.set(0, Y, 0.067); g.add(g.part('chart', chart));
    const glass = new THREE.Mesh(new THREE.CircleGeometry(Rch + 0.016, 48), new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.1, roughness: 0.05, metalness: 0, depthWrite: false })); glass.position.set(0, Y, 0.088); g.add(glass);
    const hub = new THREE.Mesh(toZ(cyl(0.01, 0.01, 16)), P.chrome); hub.position.set(0, Y, 0.072); g.add(hub);
    // pen arm: pivot at upper-left, red ink nib
    const piv = V3(-0.13, Y + 0.13, 0.076);
    const arm = new THREE.Group(); arm.position.copy(piv); g.add(g.part('pen', arm));
    const am = new THREE.Mesh(merge([place(cbox(0.2, 0.004, 0.003, 0.001), [0.1, 0, 0]), place(cyl(0.004, 0.006, 8), [0.2, 0, 0], [PI / 2, 0, 0])]), P.chrome); arm.add(am);
    const nib = new THREE.Mesh(new THREE.SphereGeometry(0.004, 8, 6), basic(0xb91c1c)); nib.position.set(0.2, 0, -0.004); arm.add(nib);
    const prof0 = u => u < 0.06 ? 0 : u < 0.1 ? lerp(0, 300, (u - 0.06) / 0.04) : u < 0.36 ? 300 - 6 * (u - 0.1) : u < 0.4 ? lerp(298, 0, (u - 0.36) / 0.04) : u < 0.46 ? 0 : u < 0.56 ? lerp(0, 10000, sstep(0.46, 0.56, u)) : 10000 - 15 * (u - 0.56);
    const SPAN = PI * 0.9, r0 = 0.12, r1 = 0.96; // trace radius (fraction of chart radius) 0 psi .. 15,000 psi
    const rOf = psi => r0 + (r1 - r0) * clamp(psi / 15000);
    function drawChart(u, prof) {
      x.fillStyle = '#f7f3e8'; x.fillRect(0, 0, 1024, 1024); const C = 512;
      x.strokeStyle = 'rgba(30,90,160,0.45)';
      for (let k = 0; k <= 15; k++) { x.lineWidth = k % 5 ? 1 : 2.5; x.beginPath(); x.arc(C, C, C * rOf(k * 1000), 0, TAU); x.stroke(); }
      for (let k = 0; k < 48; k++) { const a = k / 48 * TAU; x.lineWidth = k % 4 ? 1 : 2; x.beginPath(); x.moveTo(C + Math.cos(a) * C * r0, C + Math.sin(a) * C * r0);
        // curved time lines (arcs like a real chart): approximate with a bent polyline
        for (let t = 0; t <= 1; t += 0.1) { const rr = lerp(r0, r1, t), aa = a + 0.35 * t; x.lineTo(C + Math.cos(aa) * C * rr, C + Math.sin(aa) * C * rr); } x.stroke(); }
      x.fillStyle = 'rgba(30,90,160,0.8)'; x.font = `600 26px ${FONT}`; x.textAlign = 'center';
      for (let k = 0; k <= 15; k += 5) x.fillText(String(k * 1000), C, C - C * rOf(k * 1000) + 30);
      x.font = `700 30px ${FONT}`; x.fillText('PSI · 0-15,000', C, C + 90); x.font = `500 24px ${FONT}`; x.fillText('BOP TEST · namman.story', C, C + 130);
      // trace: chart time angle runs counter-clockwise on the paper; the pen sits at the top (-90 deg on canvas)
      x.strokeStyle = '#b91c1c'; x.lineWidth = 4; x.lineJoin = 'round'; x.beginPath();
      const n = Math.max(2, Math.round(240 * u));
      for (let i = 0; i <= n; i++) { const uu = u * i / n, a = -PI / 2 - SPAN * (u - uu), rr = C * rOf(prof(uu)); const px = C + Math.cos(a) * rr, py = C + Math.sin(a) * rr; i ? x.lineTo(px, py) : x.moveTo(px, py); }
      x.stroke(); tx.needsUpdate = true;
    }
    g.api.setTrace = (u, prof = prof0) => {
      u = clamp(u); drawChart(u, prof);
      // pen tip at (0, rOf(p) * Rch) above the centre; arm from the pivot to there
      const tip = V3(0, Y + rOf(prof(u)) * Rch, 0.076), d = tip.clone().sub(piv);
      arm.rotation.z = Math.atan2(d.y, d.x); arm.scale.x = d.length() / 0.2;
    };
    g.api.profile = prof0;
    g.api.setTrace(0);
    g.anchor('chart', [0, Y, 0.12]); g.anchor('pen', [0, Y + 0.1, 0.1]);
    g.traverse(mm => { if (mm.isMesh) mm.userData.sys = 'wc'; });
    return g;
  }

  // @@MORE_BUILDERS@@

  // ================================================================== exports
  return {
    // BOP stack and its components
    bopStack, annularPreventer, ramPreventer, drillingSpool, casingHead, bellNipple, gateValve,
    accumulatorUnit, drillerPanel, chokePanel, chokeManifold, adjustableChoke, mudGasSeparator, tripTank,
    ibopValves, fosv, floatSub, diverter, testPlug, chartRecorder,
    // helpers for the lead
    triCount, palette, easing: { easeIO, easeOut, easeIn, overshoot, ramTravel, sstep }, noiseTexture: NOISE,
    enableClipping: renderer => { renderer.localClippingEnabled = true; },
  };
}
