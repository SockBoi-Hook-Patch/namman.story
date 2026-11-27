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
uniform mat4 projectionMatrix;
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
      capCol: { value: new THREE.Color(o.cap ?? 0xd6d0c2) }, capOn: { value: 0 },
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
    // cap: flat section colour, depth moved onto the cut plane so parts embedded in the solid stay hidden
    float hh = step(0.82, fract((gl_FragCoord.x + gl_FragCoord.y) / 11.0));
    gl_FragColor = vec4(capCol * (1.0 - 0.07 * hh), 1.0);
    vec4 cpl = clippingPlanes[0];
    float cdn = dot(vClipPosition, cpl.xyz);
    vec3 cq = -vClipPosition * (cpl.w / (abs(cdn) > 1e-6 ? cdn : 1e-6));
    vec4 ccp = projectionMatrix * vec4(cq, 1.0);
    gl_FragDepth = clamp(ccp.z / ccp.w * 0.5 + 0.5, 0.0, 1.0);
  } else { gl_FragDepth = gl_FragCoord.z; }
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
    const { metal = 0.1, rough = 0.55, kind = 'paint', cap, blotch, streak, chip, rv, scale, chipT, noW, ...rest } = o;
    const m = makeStd(color, kind, rest);
    m.metalness = metal; m.roughness = rough;
    m.userData.pbr = { metalness: metal, roughness: rough };
    if (!noW) enhance(m, { cap, blotch, streak, chip, rough: rv, scale, chipT });
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
      rubber: mat(c.rubber, { kind: 'rubber', metal: 0.0, rough: 0.82, blotch: 0.12, streak: 0.0, rv: 0.08, scale: 2, cap: 0x3c3c47 }),
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
      m.side = cap ? THREE.DoubleSide : THREE.FrontSide;
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
        return { studs: mk(STUD_G, studs, mats.stud, 'studs'), nuts: mk(NUT_G, nuts, mats.nut, 'nuts'), caps: mk(CAPSCREW_G, caps, mats.stud, 'capscrews') };
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
      const nk = pts[i][3] || def;
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
    const P = palette(o.colors), PI_ = palette(o.colors); // body / internals (internals cut too: rings read as halves)
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
    const insAng = k => (k + 0.5) / NI * TAU;
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
      for (let k = 0; k < NI; k++) {
        const th = insAng(k), tip = Math.max(lerp(0.19, rt(th, 0.70) + 0.006, ec), 0.088);
        _m.compose(V3(Math.sin(th) * (tip - 0.19), 0, Math.cos(th) * (tip - 0.19)), _q.setFromAxisAngle(V3(0, 1, 0), th), V3(1, 1, 1));
        inserts.setMatrixAt(k, _m);
      }
      inserts.instanceMatrix.needsUpdate = true; inserts.computeBoundingSphere();
      piston.position.y = dy;
    }
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

  // @@MORE_BUILDERS@@

  // ================================================================== exports
  return {
    // BOP stack and its components
    bopStack, annularPreventer, ramPreventer, drillingSpool, casingHead, bellNipple, gateValve,
    // helpers for the lead
    triCount, palette, easing: { easeIO, easeOut, easeIn, overshoot, ramTravel, sstep }, noiseTexture: NOISE,
    enableClipping: renderer => { renderer.localClippingEnabled = true; },
  };
}
