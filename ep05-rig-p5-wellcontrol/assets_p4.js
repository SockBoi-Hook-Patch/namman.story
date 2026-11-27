// assets_p4.js: NEW 3D assets for namman.story "Drilling Rig 101 · Part 4/5: Circulating System".
// ES module, imports nothing. Everything (THREE, mergeGeometries, and optionally look.js' stdMat) is passed in.
//
//   import { createAssets } from './assets_p4.js';
//   const A = createAssets({ THREE, mergeGeometries, stdMat });   // stdMat (from look.js) is optional, see MATERIALS
//   const pump = A.pumpSection();  S.add(pump.group);  ...  pump.update(t, { bore: 0.5 });
//
// Every builder returns { group, update(t, params), anchors: { name: Object3D }, ...extras }.
// update() is a pure function of (t, params): no Math.random, no Date, no frame history, so any frame can be
// rendered in any order. Build once at init; call update() every frame you show the asset (it is cheap:
// matrices, a few uniforms, one InstancedMesh per particle system).
// Anchors are empty Object3Ds parented inside the asset, so `anchor.getWorldPosition(v)` gives callout / drop targets.
// Fonts: textures with text (nameplate, N2, gauge) are drawn at build time; load Kanit before createAssets().
//
// MATERIALS. If `stdMat` (look.js export) is passed, every lit material is a look MeshStandardMaterial with its own
// metalness/roughness (machined steel, chrome washpipe, rubber, brass bezel, glossy paint). Without it, materials are
// MeshLambertMaterial tagged with userData.kind (steel/paint/white/dark/rubber/label) so a later applyLook() converts
// them; then call A.applyPBR(root) after applyLook to restore the per-material roughness/metalness.
// Cutaways: half-shells are real section geometry (lathe halves / swept half-pipes / extruded slabs), the cut faces
// are a separate hatched cream "section" material, and moving inner parts (pistons, valves, springs, impellers,
// scrolls) are shown whole, as in a technical cutaway illustration. Fluids are translucent with instanced tracers.
//
// createAssets({ THREE, mergeGeometries, stdMat?, quality = 0.8 })  quality scales lathe segment counts (1 = finest).
// Triangle counts at quality 0.8 (instances counted): drop 5.9k, pumpSection 29k, triplex 31k, chargePump 6.5k,
// degasser 21k, desander 10k, desilter 20k, centrifuge 8k, washpipe 17k, standpipeManifold 6.5k, flowPaddle 3k.
// update() costs < 0.05 ms each. Preview stills: assets_preview/ (assets_demo.html + assets_demo.js).
//
// ===================================================================== BUILDERS, PARAMS, ANCHORS
// drop({ radius=0.22, halo=radius*3.2, trail=12, trailDt=0.035 })   hero teal mud drop (storyboard §0 sizes:
//   L 0.22/0.7, W 0.24/0.8, S pump 0.18/0.5, S wash 0.16/0.45). Lives in its parent's space: add drop.group to the set
//   and pass set-local positions.
//   update(t, { pos:[x,y,z] | path:(t)=>[x,y,z]|Vector3 (path also gives velocity stretch + the 12-sample trail),
//               dirt=0 (0 teal #14b8a6 .. 1 #c8925a), shimmer=0 (0..1, scale 1±0.06 at 8 Hz), squash=1 | [sx,sy,sz]
//               (e.g. [1.4,0.3,1.4] = film on a baffle), stretch=1 (velocity stretch gain), visible=true, opacity=1,
//               trailOn=true, ring=0 (0..1 extra glow), splashPos:[x,y,z] + splashAge (s, ring shown 0..0.6),
//               specks / chip / bubbles: 0..1 overrides (default from dirt: chip+big specks > 0.75, bubbles > 0.6,
//               medium specks > 0.45, small specks thin out below 0.4, all gone at 0) })
//   anchors: core (moves with the drop), chip.   extras: colorAt(dirt) -> THREE.Color.
//
// pumpSection()  PUMP_B single-cylinder section. 1 u = 6 in. Cylinder axis y = 2.0 along x, cut face z = 0, view from +z.
//   Fluid-end block x -5.4..-3.0 (suction bore below, discharge bore above, chamber at (-4.2, 2.0)); liner x -3.0..0;
//   suction manifold runs along z at (-4.2, -1.25) (ring section + tunnel into -z); discharge rises out of the block
//   and runs along -x at y 4.9 to x -9.6; dampener (red, section) at (-5.6, 6.45) r 1.1; pop-off at x -7.6 with a
//   vent pipe up to y 6.2 and off toward -x; crosshead (yellow) in a cut guide at x +2.6..+4.6.
//   update(t, { spm=100, theta (crank angle; overrides spm*t), bore=0.5 (6 in; 0.583 = 7 in, 0.375 = 4.5 in; the liner
//               keeps its OD, the wall thickens), valveLift=0.3 (spec 0.25), popoff=0 (0..1 disc lift 0.2 + amber vent
//               squirt), damp=1 (bladder flex gain), glow=0 (extra discharge-fluid glow), tracers=true, crossheadGhost=1 })
//   Kinematics: piston x = -1.4 - cos(theta); suction valve lifts while dx/dt > 0 (sin > 0), discharge valve while
//   dx/dt < 0; tracers advance by exact displaced volume; bladder squeezes (and the mud level in the dampener rises)
//   with the discharge pulse.
//   anchors: piston, pistonFace, rod, crosshead, suctionValve, dischargeValve, chamber, suctionPort, dischargePort,
//            manifold, linerMid, linerTop, linerBottom, strokeStart, strokeEnd (piston face travel, for the L arrow),
//            dampener, bladder, n2, popoff, popoffVent, dischargeOut, dischargeLine.
//   extras: paths { suction, discharge, vent } (local polylines for the drop), state { theta, x, suction, discharge, pulse }.
//
// triplex()  PUMP_A overview. 1 u = 6 in, axis x. Fluid end (3 forged modules) x -8.7..-7.1, liners x -7.1..-4.1 cut open
//   from above at y 2.4 (z -1.3 / 0 / 1.3), distance piece, open-top power end x -1.6..4.6, crank at (2.8, 2.4, 0)
//   r 1.0, conrods L 3.0, bull gear r 1.7 on the +z side, pinion above it, nameplate on the +z wall at (0.2, 1.55).
//   Suggested camera: cam (-15, 11, 7) look (-1, 2.4, 0) fov 44, or cam (-12, 14, 12) look (-2.2, 2.0, 0) fov 40.
//   update(t, { spm=100, theta, flash=1 (teal glow on each piston's forward/discharge stroke) })
//   anchors: crank, gear, pinion, nameplate, fluidEnd, suctionInlet, dischargeOut, dampener, piston0..2, crosshead0..2, liner0..2.
//   extras: state.pistonX[3], state.forward[3] (0..1 = on the discharge stroke; use it for the 1-2-3 thump SFX).
//
// chargePump()  centrifugal charge pump, L set. Origin = casing centre (24.0, 0.7, 1.5); axis z; suction eye at the back
//   (local z -0.25, flange at -0.61), tangential outlet toward -x at the top-left (local (-0.55, 0.59, 0)), motor on +z.
//   The front cover's +x half is the cutaway (fades with `open`); the open impeller and volute stay visible.
//   update(t, { omega=14 (rad/s, impeller + coupling), open=1 (0 full cover .. 1 cut away), blur=1 (faint speed disc) })
//   anchors: eye, suctionFlange, outlet, impeller, casing, motor.   extras: spiral(u) -> local point on the 3/4 spiral
//   (u 0..1, radius 0 -> 0.48) for the drop; add impeller rotation yourself if the drop should ride a vane.
//
// degasser()  vacuum degasser, L set. Origin = deck base (14.45, 3.0, -5.6) on tank A. Vessel r 0.5, y 0.2..2.4 + nozzle,
//   4 baffles at y 1.5/1.2/0.9/0.6 tilted 17 deg alternately with a moving mud film + falling curtains, mud pool in the
//   bottom cone, side inlet at y 1.88 (pipe from tank A mud at local (-0.55,-0.8,0)), bottom outlet with an eductor
//   over to tank B (local (1.45,-0.25,0)), vacuum line from the head to the vacuum pump (local (0,2.6,-0.95)) + vent.
//   update(t, { open=1 (shell fade), flow=1 (film speed), vacuum=1 (bubble rate), mud (hex film/curtain tint) })
//   anchors: inlet, outlet, tankIn, tankOut, vacuumPump, vent, dome, baffle0..3.   extras: paths.cascade (local zig-zag).
//
// hydrocyclones({ kind:'desander'|'desilter' })  L set. Origin = bank base on the tank top: desander (17.0,3.0,-5.6),
//   2 cones r 0.32 L 1.4 at z ±0.5, heads top y 2.6; desilter (19.8,3.0,-5.6), 6 cones r 0.14 L 0.8 from z -0.9..0.9,
//   heads top y 1.95. Tangential feed from a manifold along z at x -0.55, vortex finders up into an overflow header
//   (desander returns to (1.9,0.25,z0), desilter over the wall to (2.2,-0.2,z1)), underflow trough under the apexes.
//   The front (+z) cone is the openable one: half-shell + fading full shell, translucent mud, dashed streamline helices
//   (brown down the wall, teal up the core), particles on interleaved helices, brown apex spray.
//   update(t, { open=1, flow=1, spin=1 })
//   anchors: head, feed, apex, overflow, overflowOut, trough, cone.   extras: vortex(u, t, down=true) -> local point
//   (u 0 head .. 1 apex for down; 0 lower core .. 1 vortex-finder top for up).
//
// centrifuge()  decanting centrifuge, L set. Origin = centre (25.7, 4.6, -5.6), axis x, conical beach at -x
//   (bowl x -1.25..0.95), stand legs down to the tank top (local y -1.6), housing 2.6 x 0.9 x 0.9 (front cut + fading
//   full box), feed tube from the -x end, amber helicoid scroll, translucent pond, brown solids cake on the beach,
//   drive (motor + belt guard + gearbox) at +x, solids chute down/back to a bin (local (-0.95,-3.8,-2.75)), liquid
//   outlet down into the tank (local (1.07,-1.8,0)).
//   update(t, { open=1, bowl=7 (rad/s, visual; stripes scroll), diff=0.93 (scroll/bowl ratio), feed=1, solids=1 })
//   (spec rates 30/28 rad/s alias at 30 fps; the defaults keep the same ~7 % differential at a readable speed.)
//   anchors: feed, bowlMid, beach, solidsOut, chuteEnd, bin, liquidOut, motor.
//
// washpipe()  WASH gooseneck + washpipe cutaway (studio units), vertical axis, cut face z = 0. Gooseneck half-pipe through
//   (3.2,7.6) (3.0,9.0) (1.6,9.8) (0.3,9.2) (0,8.2), black hose stub to (5.4,5.05), static housing y 6.9..8.0, upper
//   gland nut, polished washpipe y 5.0..7.6, rotating packing box y 5.1..6.35 with 5 orange V (chevron) rings,
//   rotating lower gland nut, rotating main shaft y 0..5.0. Static cut faces grey, rotating cut faces teal-tinted;
//   rotating outer surfaces carry scrolling stripes with a teal tick.
//   update(t, { omega=1.6 (rad/s), glow=0 (packing glow 0..1), wear=0 (0..1 amber pulse on the middle ring),
//               ghost=0.15 (red top-drive ghost opacity, back half only; 0 hides), flow=1 })
//   anchors: hoseEnd, gooseneckTop, gooseneckMid, washpipeTop, packing, shaftTop, shaftBottom, housing.
//   extras: paths.flow (hose -> gooseneck -> washpipe -> shaft bottom), split = 6.35 (static | rotating seam y).
//
// standpipeManifold()  L set. Origin = (6.35, 7.75, 1.5). Header along x (pump side +x, standpipe side -x, ends at ±1.2
//   with hammer unions), gate valve A in line at x -0.55 (red handwheel), branch along -z at x 0.45 with gate valve B
//   (closed, red tag) and a blind flange at z -1.02, SPP gauge (brass bezel, dial, needle) on an isolator riser at
//   (0, 0.85, 0.1) turned 0.6 rad toward +x, floor stands to local y -0.57 (rig floor).
//   update(t, { spp=0 (0..1 needle, -135..+135 deg), wheelA=0 (0..1 = quarter turn of valve A), flicker=0 })
//   anchors: inlet, outlet, valveA, valveB, gauge, needle, blind.
//
// flowPaddle({ dir })  flowline paddle sensor, L set. Origin = pipe axis under the pivot (8.16, 5.36, -3.78); flow along
//   local +x (pass dir = flowline direction, e.g. [10.35,-0.85,-4.5], to orient it). Pipe r 0.24 with a 1.6-long cut
//   window (half-pipe, flanged) and full stubs to ±1.7; sensor box on a saddle, hinged paddle inside, external arm +
//   counterweight outside, partially full mud stream (by gravity) with rippled surface and cuttings.
//   update(t, { angle (deg, overrides), flow=1 (1 -> 22 deg, 1.55 -> 34 deg; also raises the stream), level (0..1 fill),
//               speed=1 })
//   anchors: paddle, sensor, arm, window.
// =====================================================================

export function createAssets({ THREE, mergeGeometries, stdMat = null, quality = 0.8 }) {
  const PI = Math.PI, TAU = 2 * PI;
  const clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
  const lerp = (a, b, u) => a + (b - a) * u;
  const sstep = (a, b, x) => { const u = clamp((x - a) / (b - a)); return u * u * (3 - 2 * u); };
  const fract = x => x - Math.floor(x);
  const hash = (i, k = 0) => fract(Math.sin(i * 127.1 + k * 311.7 + 0.123) * 43758.5453);
  const V2 = (x, y) => new THREE.Vector2(x, y);
  const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
  const _v = V3(), _v2 = V3(), _q = new THREE.Quaternion(), _m = new THREE.Matrix4(), _s = V3(), _e = new THREE.Euler();
  const QX = new THREE.Quaternion().setFromAxisAngle(V3(0, 0, 1), -PI / 2); // lathe axis y -> x
  const QZ = new THREE.Quaternion().setFromAxisAngle(V3(1, 0, 0), PI / 2);  // lathe axis y -> z

  // ------------------------------------------------------------------ palette
  const C = {
    teal: 0x14b8a6, tealHi: 0x5eead4, mud: 0xc8925a, chip: 0xb45f2a, steel: 0xa3acb9, steelDk: 0x6b7686, machined: 0xc9d1db,
    chrome: 0xcfd5dc, cavity: 0x4b5a70, cut: 0xf1e6d2, red: 0xdc2626, blue: 0x1d4ed8, blue2: 0x2563eb, yellow: 0xfacc15,
    orange: 0xf97316, amber: 0xf59e0b, rubber: 0x1f2329, slate: 0x334155, n2: 0xbfdbfe, brass: 0xc9a23a, white: 0xf3f4f6,
    tealPaint: 0x0d9488, cone: 0x94a3b8, grate: 0x52627a,
  };

  // ------------------------------------------------------------------ materials
  const ALLM = [];
  function mat(color, kind = 'paint', o = {}) {
    const { metalness, roughness, envScale, ...rest } = o;
    let m;
    if (stdMat) {
      m = stdMat(color, kind, rest);
      if (metalness != null) m.metalness = metalness;
      if (roughness != null) m.roughness = roughness;
    } else {
      m = new THREE.MeshLambertMaterial({ color, ...rest });
      m.userData.kind = kind;
    }
    m.userData.pbr = { metalness, roughness };
    if (envScale != null) m.userData.envScale = envScale;
    ALLM.push(m);
    return m;
  }
  const basic = (color, o = {}) => new THREE.MeshBasicMaterial({ color, ...o });
  // after look.js applyLook() converted Lambert materials: restore our per-material PBR values
  function applyPBR(root) {
    root.traverse(o => {
      if (!o.isMesh) return;
      for (const m of [].concat(o.material)) {
        const p = m && m.userData && m.userData.pbr;
        if (!p || !m.isMeshStandardMaterial) continue;
        if (p.metalness != null) m.metalness = p.metalness;
        if (p.roughness != null) m.roughness = p.roughness;
      }
    });
  }

  // ------------------------------------------------------------------ canvas textures
  function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  function tex(c, repeat = false) {
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
    if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; }
    return t;
  }
  // section hatch (cream with fine diagonal lines), world-scaled through texture.repeat
  function hatchTex(density, base = '#f1e6d2', line = 'rgba(150,120,80,0.30)') {
    const c = canvas(64, 64), x = c.getContext('2d');
    x.fillStyle = base; x.fillRect(0, 0, 64, 64);
    x.strokeStyle = line; x.lineWidth = 3;
    for (let k = -64; k <= 128; k += 16) { x.beginPath(); x.moveTo(k, 64); x.lineTo(k + 64, 0); x.stroke(); }
    const t = tex(c, true); t.repeat.set(density, density); return t;
  }
  // stripes around a rotating part (u = around); scrolled through texture.offset.x
  function stripeTex(base, stripe, n = 6, w = 0.18, tick = null) {
    const c = canvas(512, 16), x = c.getContext('2d');
    x.fillStyle = base; x.fillRect(0, 0, 512, 16);
    x.fillStyle = stripe;
    for (let i = 0; i < n; i++) x.fillRect((i / n) * 512, 0, (w / n) * 512, 16);
    if (tick) { x.fillStyle = tick; x.fillRect(0, 0, 10, 16); }
    return tex(c, true);
  }
  function radialTex(inner, outer, stops = null) {
    const c = canvas(128, 128), x = c.getContext('2d');
    const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
    (stops || [[0, inner], [1, outer]]).forEach(([s, col]) => g.addColorStop(s, col));
    x.fillStyle = g; x.fillRect(0, 0, 128, 128);
    return tex(c);
  }
  const FONT = (w, px) => `${w} ${px}px Kanit, "Helvetica Neue", Arial, sans-serif`;

  // ------------------------------------------------------------------ geometry helpers
  function merge(geos) {
    const gs = geos.filter(Boolean).map(g => {
      g = g.index ? g.toNonIndexed() : g;
      if (!g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
      if (!g.attributes.normal) g.computeVertexNormals();
      for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
      return g;
    });
    const out = mergeGeometries(gs, false);
    return out;
  }
  function add(parent, geo, m, x = 0, y = 0, z = 0) {
    const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); parent.add(o); return o;
  }
  function grp(parent, x = 0, y = 0, z = 0) { const g = new THREE.Group(); g.position.set(x, y, z); if (parent) parent.add(g); return g; }
  function anchor(parent, x = 0, y = 0, z = 0) { const o = new THREE.Object3D(); o.position.set(x, y, z); parent.add(o); return o; }
  // chamfered box (edges bevelled by b)
  function cbox(w, h, d, b = 0.03) {
    b = Math.min(b, w / 2 - 1e-3, h / 2 - 1e-3, d / 2 - 1e-3);
    const s = new THREE.Shape(), hw = w / 2 - b, hh = h / 2 - b;
    s.moveTo(-hw, -hh); s.lineTo(hw, -hh); s.lineTo(hw, hh); s.lineTo(-hw, hh); s.closePath();
    const g = new THREE.ExtrudeGeometry(s, { depth: d - 2 * b, bevelEnabled: true, bevelThickness: b, bevelSize: b, bevelSegments: 1, curveSegments: 1 });
    g.translate(0, 0, -(d - 2 * b) / 2);
    return g;
  }
  const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
  const cyl = (r, h, s = 16, open = false, r2 = r) => new THREE.CylinderGeometry(r2, r, h, s, 1, open);
  function cylBetween(a, b, r, seg = 10, r2 = r) {
    const A = V3(...a), B = V3(...b), d = B.clone().sub(A), len = d.length();
    const g = new THREE.CylinderGeometry(r2, r, len, seg, 1, false);
    g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(V3(0, 1, 0), d.normalize()));
    g.translate((A.x + B.x) / 2, (A.y + B.y) / 2, (A.z + B.z) / 2);
    return g;
  }
  function pipeRun(pts, r, seg = 12) {
    const g = [];
    for (let i = 0; i < pts.length - 1; i++) g.push(cylBetween(pts[i], pts[i + 1], r, seg));
    for (let i = 1; i < pts.length - 1; i++) g.push(new THREE.SphereGeometry(r, seg, 8).translate(...pts[i]));
    return merge(g);
  }
  // Curved pipe through points (CatmullRom, smooth bends), full tube
  function tubeThrough(pts, r, n = 40, radial = 12, tension = 0.0) {
    const cv = new THREE.CatmullRomCurve3(pts.map(p => V3(...p)), false, 'catmullrom', tension);
    return new THREE.TubeGeometry(cv, n, r, radial, false);
  }
  // polyline with filleted corners (radius rad), returns dense point list
  function fillet(pts, rad, n = 6) {
    const P = pts.map(p => V3(...p)), out = [P[0].clone()];
    for (let i = 1; i < P.length - 1; i++) {
      const a = P[i - 1], b = P[i], c = P[i + 1];
      const d1 = _v.subVectors(a, b).normalize().clone(), d2 = _v.subVectors(c, b).normalize().clone();
      const r = Math.min(rad, a.distanceTo(b) * 0.5, c.distanceTo(b) * 0.5);
      const p1 = b.clone().addScaledVector(d1, r), p2 = b.clone().addScaledVector(d2, r);
      for (let k = 0; k <= n; k++) { // quadratic bezier p1 -> b -> p2
        const u = k / n, w0 = (1 - u) * (1 - u), w1 = 2 * u * (1 - u), w2 = u * u;
        out.push(V3(p1.x * w0 + b.x * w1 + p2.x * w2, p1.y * w0 + b.y * w1 + p2.y * w2, p1.z * w0 + b.z * w1 + p2.z * w2));
      }
    }
    out.push(P[P.length - 1].clone());
    return out;
  }

  // ---- custom triangle soup builder with orientation by a hint normal
  function Soup() {
    const pos = [], nor = [], uv = [];
    return {
      tri(a, b, c, na, nb, nc, ua, ub, uc, hint) {
        // orient so that the face normal agrees with hint (or with na)
        const h = hint || na;
        const e1x = b.x - a.x, e1y = b.y - a.y, e1z = b.z - a.z, e2x = c.x - a.x, e2y = c.y - a.y, e2z = c.z - a.z;
        const fx = e1y * e2z - e1z * e2y, fy = e1z * e2x - e1x * e2z, fz = e1x * e2y - e1y * e2x;
        if (fx * h.x + fy * h.y + fz * h.z < 0) { [b, c] = [c, b]; [nb, nc] = [nc, nb]; [ub, uc] = [uc, ub]; }
        pos.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
        nor.push(na.x, na.y, na.z, nb.x, nb.y, nb.z, nc.x, nc.y, nc.z);
        uv.push(ua[0], ua[1], ub[0], ub[1], uc[0], uc[1]);
      },
      quad(a, b, c, d, na, nb, nc, nd, ua, ub, uc, ud, hint) { // a-b-c-d around
        this.tri(a, b, c, na, nb, nc, ua, ub, uc, hint); this.tri(a, c, d, na, nc, nd, ua, uc, ud, hint);
      },
      geo() {
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
        g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
        g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
        return g;
      },
      get empty() { return pos.length === 0; },
    };
  }

  // ---- turned (lathe) part from a closed CCW profile [[r, h, smooth?], ...] in (radius, height).
  // Each sharp edge is its own lathe band, so chamfers read crisp; smooth vertices are shared.
  // open: final-space direction of the removed half (e.g. [0,0,1]) -> half-shell + planar section caps.
  // q: quaternion taking the lathe axis (y) to the final axis.  Returns { body, cap } geometries.
  function turned(profile, { seg = 32, open = null, q = null } = {}) {
    seg = Math.max(10, Math.round(seg * (open ? quality : quality * 1.25 > 1 ? 1 : quality * 1.25)));
    let phiStart = 0, phiLen = TAU, dl = null;
    if (open) {
      dl = V3(...open); if (q) dl.applyQuaternion(q.clone().invert());
      dl.y = 0; dl.normalize();
      const pm = Math.atan2(dl.x, dl.z); phiStart = pm + PI / 2; phiLen = PI;
    }
    const n = profile.length, geos = [];
    let start = profile.findIndex(p => !p[2]); if (start < 0) start = 0;
    let run = [profile[start]];
    const pushRun = r => {
      if (r.every(p => p[0] < 1e-5)) return;
      geos.push(new THREE.LatheGeometry(r.map(p => V2(Math.max(p[0], 0), p[1])), seg, phiStart, phiLen));
    };
    for (let k = 1; k <= n; k++) {
      const p = profile[(start + k) % n]; run.push(p);
      if (!p[2] || k === n) { pushRun(run); run = [p]; }
    }
    const body = merge(geos);
    let cap = null;
    if (open) {
      const S = Soup(), contour = profile.map(p => V2(Math.max(0, p[0]), p[1]));
      const tris = THREE.ShapeUtils.triangulateShape(contour, []);
      const nrm = V3(dl.x, 0, dl.z);
      for (const side of [0, 1]) {
        const phi = phiStart + side * PI, ux = Math.sin(phi), uz = Math.cos(phi), sg = side ? -1 : 1;
        for (const t of tris) {
          const P = t.map(i => V3(contour[i].x * ux, contour[i].y, contour[i].x * uz));
          const U = t.map(i => [sg * contour[i].x, contour[i].y]);
          S.tri(P[0], P[1], P[2], nrm, nrm, nrm, U[0], U[1], U[2], nrm);
        }
      }
      cap = S.geo();
    }
    if (q) { body.applyQuaternion(q); if (cap) cap.applyQuaternion(q); }
    return { body, cap };
  }
  // add a turned part: returns a Group with .body and .cap meshes
  function addTurned(parent, profile, m, capM, o = {}, x = 0, y = 0, z = 0) {
    const g = grp(parent, x, y, z);
    const { body, cap } = turned(profile, o);
    g.body = add(g, body, m);
    if (cap) g.cap = add(g, cap, capM || m);
    return g;
  }
  // straight turned part between two points (profile h runs 0..len along A->B)
  function qAlong(dir) { return new THREE.Quaternion().setFromUnitVectors(V3(0, 1, 0), V3(...dir).normalize()); }

  // ---- swept pipe along a path in the plane z = zc (cut face z = zc, kept half z <= zc when half)
  // pts: Vector3 list (z ignored for the frame, all should share z). ro/ri radii. Returns { outer, inner, cut, ends }.
  function sweep(pts, ro, ri, { seg = 16, half = true, ends = true, uvScale = 1 } = {}) {
    const N = pts.length, Z = V3(0, 0, 1);
    const Ts = [], Ns = [], L = [0];
    for (let i = 0; i < N; i++) {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(N - 1, i + 1)];
      const T = V3().subVectors(b, a); T.z = 0; T.normalize();
      Ts.push(T); Ns.push(V3(-T.y, T.x, 0));
      if (i) L.push(L[i - 1] + pts[i].distanceTo(pts[i - 1]));
    }
    const a0 = half ? PI : 0, a1 = half ? TAU : TAU;
    const ring = (i, j, r) => {
      const al = a0 + (a1 - a0) * j / seg, ca = Math.cos(al), sa = Math.sin(al);
      const n = V3().copy(Ns[i]).multiplyScalar(ca).addScaledVector(Z, sa);
      return { p: V3().copy(pts[i]).addScaledVector(n, r), n };
    };
    const So = Soup(), Si = Soup(), Sc = Soup(), Se = Soup();
    for (let i = 0; i < N - 1; i++) for (let j = 0; j < seg; j++) {
      const A = ring(i, j, ro), B = ring(i + 1, j, ro), Cc = ring(i + 1, j + 1, ro), D = ring(i, j + 1, ro);
      So.quad(A.p, B.p, Cc.p, D.p, A.n, B.n, Cc.n, D.n, [j / seg, L[i] * uvScale], [j / seg, L[i + 1] * uvScale], [(j + 1) / seg, L[i + 1] * uvScale], [(j + 1) / seg, L[i] * uvScale], A.n);
      if (ri > 0) {
        const a = ring(i, j, ri), b = ring(i + 1, j, ri), c = ring(i + 1, j + 1, ri), d = ring(i, j + 1, ri);
        const na = a.n.clone().negate(), nb = b.n.clone().negate(), nc = c.n.clone().negate(), nd = d.n.clone().negate();
        Si.quad(a.p, b.p, c.p, d.p, na, nb, nc, nd, [j / seg, L[i] * uvScale], [j / seg, L[i + 1] * uvScale], [(j + 1) / seg, L[i + 1] * uvScale], [(j + 1) / seg, L[i] * uvScale], na);
      }
    }
    if (half) { // section strips in the cut plane
      for (let i = 0; i < N - 1; i++) for (const s of [-1, 1]) {
        const p = (k, r) => V3().copy(pts[k]).addScaledVector(Ns[k], s * r);
        const a = p(i, ri), b = p(i + 1, ri), c = p(i + 1, ro), d = p(i, ro);
        const uv = v => [v.x, v.y];
        Sc.quad(a, b, c, d, Z, Z, Z, Z, uv(a), uv(b), uv(c), uv(d), Z);
      }
    }
    if (ends) for (const [i, sg] of [[0, -1], [N - 1, 1]]) {
      const nn = Ts[i].clone().multiplyScalar(sg);
      for (let j = 0; j < seg; j++) {
        const A = ring(i, j, ro).p, D = ring(i, j + 1, ro).p;
        const a = ri > 0 ? ring(i, j, ri).p : pts[i], d = ri > 0 ? ring(i, j + 1, ri).p : pts[i];
        Se.quad(a, A, D, d, nn, nn, nn, nn, [0, 0], [1, 0], [1, 1], [0, 1], nn);
      }
    }
    return { outer: So.geo(), inner: Si.empty ? null : Si.geo(), cut: Sc.empty ? null : Sc.geo(), ends: Se.empty ? null : Se.geo() };
  }
  function addSweep(parent, pts, ro, ri, mo, mi, mc, o = {}) {
    const s = sweep(pts, ro, ri, o), g = grp(parent);
    g.outer = add(g, s.ends ? merge([s.outer, s.ends]) : s.outer, mo);
    if (s.inner) g.inner = add(g, s.inner, mi || mo);
    if (s.cut) g.cut = add(g, s.cut, mc || mo);
    return g;
  }

  // hex bolt head (+ washer) along +y, base at y = 0
  function boltGeo(r, h) {
    return merge([cyl(r * 1.25, h * 0.18, 8, true).translate(0, h * 0.09, 0), cyl(r, h, 6).translate(0, h * 0.18 + h * 0.5, 0),
      cyl(r * 0.55, h * 0.45, 6).translate(0, h * 1.18 + h * 0.22, 0)]);
  }
  // instanced bolts from a list of {p:[x,y,z], n:[nx,ny,nz]} (n = bolt axis)
  function bolts(parent, list, r, h, m) {
    const im = new THREE.InstancedMesh(boltGeo(r, h), m, list.length);
    list.forEach((b, i) => {
      _q.setFromUnitVectors(V3(0, 1, 0), V3(...b.n).normalize());
      _m.compose(V3(...b.p), _q, V3(1, 1, 1)); im.setMatrixAt(i, _m);
    });
    im.userData.castShadow = false; parent.add(im); return im;
  }
  // bolt circle on a flange: centre c, axis n (unit, one of x/y/z), radius R, count k; keep(p) filters (cut half)
  function boltCircle(c, n, R, k, keep = () => true, phase = 0) {
    const out = [], N = V3(...n).normalize();
    const U = Math.abs(N.y) > 0.9 ? V3(1, 0, 0) : V3(0, 1, 0); const W = V3().crossVectors(N, U).normalize(); U.crossVectors(W, N).normalize();
    for (let i = 0; i < k; i++) {
      const a = phase + (i / k) * TAU;
      const p = V3(...c).addScaledVector(U, Math.cos(a) * R).addScaledVector(W, Math.sin(a) * R);
      if (keep(p)) out.push({ p: [p.x, p.y, p.z], n: [N.x, N.y, N.z] });
    }
    return out;
  }
  // helical spring along +y, unit height (scale y to compress)
  function springGeo(R, wire, turns, seg = 20) {
    class Helix extends THREE.Curve {
      getPoint(u, o = V3()) { const a = u * turns * TAU; return o.set(Math.cos(a) * R, u, Math.sin(a) * R); }
    }
    return new THREE.TubeGeometry(new Helix(), Math.round(turns * seg), wire, 6, false);
  }
  // instanced particle system: returns { mesh, set(i, x,y,z, s), hideFrom(i) }
  function particles(parent, geo, m, n) {
    const im = new THREE.InstancedMesh(geo, m, n); im.frustumCulled = false; im.userData.castShadow = false;
    parent.add(im);
    const P = {
      mesh: im, n,
      set(i, x, y, z, s, sy = s, sz = s) { _m.makeScale(s, sy, sz); _m.setPosition(x, y, z); im.setMatrixAt(i, _m); },
      setQ(i, p, q, s) { _m.compose(p, q, s); im.setMatrixAt(i, _m); },
      hide(i) { _m.makeScale(0, 0, 0); im.setMatrixAt(i, _m); },
      color(i, c) { im.setColorAt(i, c); },
      done() { im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true; },
    };
    return P;
  }
  // polyline sampler
  function Poly(pts) {
    const p = pts.map(a => (a.isVector3 ? a.clone() : V3(...a))), c = [0];
    for (let i = 1; i < p.length; i++) c.push(c[i - 1] + p[i].distanceTo(p[i - 1]));
    const L = c[c.length - 1];
    return {
      L, pts: p,
      at(s, out = V3()) {
        s = clamp(s, 0, L); let i = 0; while (i < c.length - 2 && s > c[i + 1]) i++;
        const u = (s - c[i]) / Math.max(1e-6, c[i + 1] - c[i]); return out.lerpVectors(p[i], p[i + 1], u);
      },
    };
  }
  const arr = v => [v.x, v.y, v.z];

  // ------------------------------------------------------------------ shared materials
  const M = {};
  const lazy = (k, f) => (M[k] || (M[k] = f()));
  const SM = {
    steel: () => lazy('steel', () => mat(C.steel, 'steel', { metalness: 0.75, roughness: 0.38 })),
    steelDk: () => lazy('steelDk', () => mat(C.steelDk, 'steel', { metalness: 0.7, roughness: 0.45 })),
    machined: () => lazy('machined', () => mat(C.machined, 'steel', { metalness: 0.9, roughness: 0.22 })),
    chrome: () => lazy('chrome', () => mat(C.chrome, 'steel', { metalness: 1.0, roughness: 0.16, envScale: 1.0 })),
    cavity: () => lazy('cavity', () => mat(C.cavity, 'dark', { metalness: 0.3, roughness: 0.6, side: THREE.DoubleSide })),
    rubber: () => lazy('rubber', () => mat(C.rubber, 'rubber', { metalness: 0, roughness: 0.8 })),
    slate: () => lazy('slate', () => mat(C.slate, 'dark', { metalness: 0.3, roughness: 0.55 })),
    bolt: () => lazy('bolt', () => mat(0x8b95a3, 'steel', { metalness: 0.85, roughness: 0.35 })),
    red: () => lazy('red', () => mat(C.red, 'paint', { metalness: 0.1, roughness: 0.42 })),
    blue: () => lazy('blue', () => mat(C.blue, 'paint', { metalness: 0.25, roughness: 0.55 })),
    blue2: () => lazy('blue2', () => mat(C.blue2, 'paint', { metalness: 0.25, roughness: 0.5 })),
    yellow: () => lazy('yellow', () => mat(C.yellow, 'paint', { metalness: 0.1, roughness: 0.45 })),
    orange: () => lazy('orange', () => mat(C.orange, 'paint', { metalness: 0.0, roughness: 0.6 })),
    amber: () => lazy('amber', () => mat(C.amber, 'paint', { metalness: 0.1, roughness: 0.45 })),
    brass: () => lazy('brass', () => mat(C.brass, 'steel', { metalness: 0.95, roughness: 0.28 })),
    white: () => lazy('white', () => mat(C.white, 'white', { metalness: 0.05, roughness: 0.5 })),
    tealPaint: () => lazy('tealPaint', () => mat(C.tealPaint, 'paint', { metalness: 0.12, roughness: 0.45 })),
    cone: () => lazy('cone', () => mat(C.cone, 'steel', { metalness: 0.55, roughness: 0.45 })),
    grate: () => lazy('grate', () => mat(C.grate, 'dark', { metalness: 0.5, roughness: 0.55 })),
  };
  const cutMats = {};
  // section material; tint keeps a painted part's identity on its cut face ('red', 'blue', 'teal', 'yellow')
  const TINT = { steel: ['#f1e6d2', 'rgba(150,120,80,0.30)'], grey: ['#d5dbe3', 'rgba(70,85,105,0.30)'], white: ['#f4f7fb', 'rgba(120,135,155,0.25)'], red: ['#f4c3bb', 'rgba(170,50,40,0.32)'], blue: ['#c8d5f3', 'rgba(40,70,160,0.30)'],
    teal: ['#bfe8e1', 'rgba(15,110,100,0.30)'], yellow: ['#f6e3a1', 'rgba(150,110,20,0.30)'], orange: ['#f7c9a3', 'rgba(170,80,20,0.30)'] };
  function cutMat(density = 2, tint = 'steel') {
    const k = density.toFixed(2) + tint, [b, l] = TINT[tint] || TINT.steel;
    return cutMats[k] || (cutMats[k] = mat(0xffffff, 'label', { map: hatchTex(density, b, l), metalness: 0, roughness: 0.78 }));
  }
  const cutRubber = () => lazy('cutRubber', () => mat(0x2a2f37, 'rubber', { metalness: 0, roughness: 0.85 }));
  function fluidMat(color = C.teal, o = {}) {
    return mat(color, 'paint', { metalness: 0, roughness: 0.25, transparent: true, opacity: o.opacity ?? 0.62, depthWrite: o.depthWrite ?? true,
      emissive: new THREE.Color(color).multiplyScalar(o.glow ?? 0.18), side: o.side ?? THREE.FrontSide, envScale: 0.6 });
  }

  // =================================================================== 1. DROP
  function drop(o = {}) {
    const R = o.radius ?? 0.22, HALO = o.halo ?? R * 3.2, NT = o.trail ?? 12, TDT = o.trailDt ?? 0.035;
    const group = new THREE.Group(), anchors = {};
    const cTeal = new THREE.Color(C.teal), cMud = new THREE.Color(C.mud), col = new THREE.Color();
    const colorAt = d => col.copy(cTeal).lerp(cMud, clamp(d));
    // core: a glossy liquid bead that glows from inside
    const coreM = mat(C.teal, 'paint', { metalness: 0.0, roughness: 0.12, emissive: new THREE.Color(C.teal).multiplyScalar(0.55), envScale: 1.6 });
    const body = grp(group); const core = add(body, new THREE.IcosahedronGeometry(R, 4), coreM);
    // inner hot core (additive) for a "lit from within" read
    const glowM = basic(C.tealHi, { transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false });
    const inner = add(core, new THREE.IcosahedronGeometry(R * 0.7, 2), glowM);
    // halo sprite
    const haloT = radialTex(null, null, [[0, 'rgba(94,234,212,0.9)'], [0.25, 'rgba(20,184,166,0.45)'], [0.6, 'rgba(20,184,166,0.12)'], [1, 'rgba(20,184,166,0)']]);
    const haloM = new THREE.SpriteMaterial({ map: haloT, color: 0xffffff, transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending, depthWrite: false });
    const halo = new THREE.Sprite(haloM); halo.scale.setScalar(HALO * 2); body.add(halo);
    anchors.core = anchor(body);
    // trail
    const trailM = basic(C.teal, { transparent: true, opacity: 0.2, blending: THREE.AdditiveBlending, depthWrite: false });
    const trail = particles(group, new THREE.SphereGeometry(R, 14, 10), trailM, NT);
    // satellites (14 dodecahedra: 4 big, 5 medium, 5 small)
    const SPK = [];
    for (let i = 0; i < 14; i++) {
      const tier = i < 4 ? 0 : i < 9 ? 1 : 2;
      SPK.push({ tier, s: R * [0.3, 0.2, 0.12][tier] * (0.85 + 0.3 * hash(i, 3)), col: new THREE.Color([0x6b5a48, 0x8a6a4a, 0xa07850][tier]),
        incl: (hash(i, 1) - 0.5) * 2.2, ph: hash(i, 2) * TAU, sp: 2 * (0.8 + 0.5 * hash(i, 4)) * (hash(i, 5) > 0.5 ? 1 : -1), rr: 1.4 * R * (0.9 + 0.25 * hash(i, 6)) });
    }
    const spkM = mat(0xffffff, 'paint', { metalness: 0, roughness: 0.85, flatShading: true });
    const specks = particles(group, new THREE.DodecahedronGeometry(1, 0), spkM, 14);
    SPK.forEach((k, i) => specks.color(i, k.col));
    // cutting chip: irregular faceted rock
    const chipG = new THREE.DodecahedronGeometry(R * 0.6, 0); chipG.scale(1.25, 0.7, 0.95);
    const chipM = mat(C.chip, 'paint', { metalness: 0, roughness: 0.8, flatShading: true });
    const chip = add(group, chipG, chipM); anchors.chip = anchor(chip);
    // gas micro-bubbles
    const bubM = mat(0xffffff, 'white', { metalness: 0, roughness: 0.05, transparent: true, opacity: 0.85, emissive: new THREE.Color(0x8fdcff).multiplyScalar(0.25) });
    const bubs = particles(group, new THREE.SphereGeometry(1, 12, 8), bubM, 3);
    // splash ring
    const splM = basic(C.tealHi, { transparent: true, opacity: 0.0, depthWrite: false });
    const splash = add(group, new THREE.TorusGeometry(1, 0.035, 6, 48).rotateX(PI / 2), splM); splash.visible = false;
    const splash2 = add(group, new THREE.TorusGeometry(1, 0.025, 6, 48).rotateX(PI / 2), splM); splash2.visible = false;

    const P = V3(), Pb = V3(), Pa = V3(), vel = V3(), Y = V3(0, 1, 0);
    const at = (p, tt, out) => { const r = p.path(tt); return r.isVector3 ? out.copy(r) : out.set(r[0], r[1], r[2]); };
    function update(t, p = {}) {
      const vis = p.visible !== false;
      group.visible = vis; if (!vis) return;
      const dirt = clamp(p.dirt ?? 0);
      if (p.path) { at(p, t, P); at(p, t - 0.02, Pb); at(p, t + 0.02, Pa); vel.subVectors(Pa, Pb).divideScalar(0.04); }
      else { P.set(...(p.pos || [0, 0, 0])); vel.set(0, 0, 0); }
      body.position.copy(P);
      // colour
      colorAt(dirt);
      coreM.color.copy(col);
      if (coreM.emissive) coreM.emissive.copy(col).multiplyScalar(0.5 - 0.22 * dirt + 0.35 * (p.ring ?? 0));
      glowM.color.copy(col).lerp(new THREE.Color(0xffffff), 0.35);
      haloM.color.copy(col).lerp(new THREE.Color(0xffffff), 0.2); trailM.color.copy(col);
      const op = p.opacity ?? 1;
      haloM.opacity = 0.55 * op * (1 - 0.4 * dirt); trailM.opacity = 0.2 * op;
      coreM.transparent = op < 1; coreM.opacity = op; glowM.opacity = 0.35 * op;
      // shape: wobble, shimmer, motion stretch, squash
      const sh = p.shimmer ?? 0, w = 1 + 0.035 * Math.sin(t * 7.3), pul = 1 + 0.06 * sh * Math.sin(t * TAU * 8);
      const sp = vel.length(), k = Math.min(0.55, sp * 0.045 / Math.max(0.05, R * 4)) * (p.stretch ?? 1);
      if (sp > 1e-3) core.quaternion.setFromUnitVectors(Y, _v.copy(vel).normalize()); else core.quaternion.identity();
      core.scale.set(pul * w * (1 - k * 0.35), pul / w * (1 + k), pul * w * (1 - k * 0.35));
      const sq = p.squash ?? 1;
      if (Array.isArray(sq)) body.scale.set(sq[0], sq[1], sq[2]); else body.scale.setScalar(sq);
      // trail (needs a path)
      if (p.path && p.trailOn !== false) {
        for (let i = 0; i < NT; i++) {
          at(p, t - (i + 1) * TDT, _v2); const s = (1 - (i + 1) / (NT + 1)) * 0.85 * pul;
          trail.set(i, _v2.x, _v2.y, _v2.z, s);
        }
        trail.mesh.visible = true;
      } else trail.mesh.visible = false;
      trail.done();
      // satellites
      const vBig = p.specks != null ? p.specks : sstep(0.7, 0.85, dirt);
      const vMed = p.specks != null ? p.specks : sstep(0.4, 0.5, dirt);
      SPK.forEach((s, i) => {
        let v = s.tier === 0 ? vBig : s.tier === 1 ? vMed : (p.specks != null ? p.specks : sstep(0.02 + (i - 9) * 0.07, 0.07 + (i - 9) * 0.07, dirt));
        if (v < 0.01) { specks.hide(i); return; }
        const a = s.ph + t * s.sp, ci = Math.cos(s.incl), si = Math.sin(s.incl);
        const x = Math.cos(a) * s.rr, y0 = Math.sin(a) * s.rr;
        _q.setFromEuler(_e.set(t * 1.7 + i, t * 1.3 + i * 2, 0));
        specks.setQ(i, _v.set(P.x + x, P.y + y0 * ci, P.z + y0 * si), _q, _s.setScalar(s.s * v * sq0(sq)));
      });
      specks.done();
      // chip
      const vChip = p.chip != null ? p.chip : sstep(0.82, 0.95, dirt);
      chip.visible = vChip > 0.01;
      if (chip.visible) {
        const a = t * 1.4 + 1.0;
        chip.position.set(P.x + Math.cos(a) * R * 1.75, P.y + Math.sin(a * 0.7) * R * 0.5, P.z + Math.sin(a) * R * 1.75);
        chip.rotation.set(t * 2.1, t * 1.3, t * 0.7); chip.scale.setScalar(vChip);
      }
      // bubbles
      const vB = p.bubbles != null ? p.bubbles : sstep(0.6, 0.66, dirt);
      for (let i = 0; i < 3; i++) {
        if (vB < 0.01) { bubs.hide(i); continue; }
        const a = t * 2.6 + i * TAU / 3;
        bubs.set(i, P.x + Math.cos(a) * R * 1.15, P.y + R * 0.9 + 0.1 * R * Math.sin(t * 5 + i), P.z + Math.sin(a) * R * 1.15, R * 0.17 * vB);
      }
      bubs.done();
      // splash ring
      const age = p.splashAge;
      if (p.splashPos && age != null && age >= 0 && age <= 0.6) {
        const u = age / 0.6;
        splash.visible = splash2.visible = true;
        splash.position.set(...p.splashPos); splash2.position.set(...p.splashPos);
        splash.scale.setScalar(R * (1.2 + 3.2 * (1 - Math.pow(1 - u, 3)))); splash2.scale.setScalar(R * (0.8 + 2.0 * u));
        splM.opacity = 0.8 * (1 - u); splM.color.copy(col);
      } else splash.visible = splash2.visible = false;
    }
    const sq0 = sq => (Array.isArray(sq) ? 1 : sq);
    update(0, {});
    return { group, update, anchors, colorAt: d => colorAt(d).clone() };
  }

  // piston (axis x, face toward -x, width 0.45, bore 0.5): urethane/rubber seal with lips + steel hub + lock nut
  function pistonGroup(rubM) {
    const g = new THREE.Group();
    g.rub = addTurned(g, [[0, -0.225], [0.47, -0.225], [0.5, -0.2], [0.5, -0.16], [0.47, -0.13], [0.5, -0.09], [0.5, -0.03], [0.42, -0.02], [0, -0.02]], rubM, null, { seg: 36, q: QX });
    addTurned(g, [[0, -0.02], [0.46, -0.02], [0.46, 0.17], [0.42, 0.21], [0.2, 0.225], [0.2, 0.33], [0, 0.33]], SM.machined(), null, { seg: 36, q: QX });
    add(g, cyl(0.2, 0.12, 6).rotateZ(PI / 2).translate(0.3, 0, 0), SM.bolt());
    return g;
  }
  // spur gear outline (teeth n, pitch radius R, tooth depth d) with lightening holes
  function gearGeo(R, n, d, depth, { holes = 0, holeR = 0, holeAt = 0, bore = 0 } = {}) {
    const s = new THREE.Shape();
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU, w = TAU / n;
      const pts = [[R - d / 2, a], [R + d / 2, a + w * 0.18], [R + d / 2, a + w * 0.42], [R - d / 2, a + w * 0.6]];
      pts.forEach(([r, b], k) => { const x = Math.cos(b) * r, y = Math.sin(b) * r; (i === 0 && k === 0) ? s.moveTo(x, y) : s.lineTo(x, y); });
    }
    s.closePath();
    for (let i = 0; i < holes; i++) { const a = (i / holes) * TAU + PI / holes, h = new THREE.Path(); h.absarc(Math.cos(a) * holeAt, Math.sin(a) * holeAt, holeR, 0, TAU, true); s.holes.push(h); }
    if (bore) { const h = new THREE.Path(); h.absarc(0, 0, bore, 0, TAU, true); s.holes.push(h); }
    const g = new THREE.ExtrudeGeometry(s, { depth: depth - 0.04, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.015, bevelSegments: 1, curveSegments: 16 });
    g.translate(0, 0, -(depth - 0.04) / 2);
    return g;
  }

  // =================================================================== 3. PUMP_B single-cylinder section
  function pumpSection() {
    const group = new THREE.Group(), anchors = {}, state = {};
    const steel = SM.steel(), cav = SM.cavity(), cut = cutMat(2.2), chrome = SM.chrome(), mach = SM.machined();
    const fluid = fluidMat(C.teal, { opacity: 0.6, glow: 0.22 });
    const fluidD = fluidMat(C.teal, { opacity: 0.62, glow: 0.3 }); // discharge side (pressure glow)
    const AX = 2.0; // cylinder axis y

    // ---- fluid-end block: 3 section slabs (cavity splits the cut face) + outer shell behind
    const D = 1.4;
    const shp = pts => { const s = new THREE.Shape(); s.moveTo(...pts[0]); for (let i = 1; i < pts.length; i++) s.lineTo(...pts[i]); s.closePath(); return s; };
    const ch = 0.08; // outer chamfer
    const pieces = [
      shp([[-5.4 + ch, -0.4], [-4.65, -0.4], [-4.65, 1.4], [-5.0, 1.4], [-5.0, 2.6], [-4.65, 2.6], [-4.65, 4.4], [-5.4 + ch, 4.4], [-5.4, 4.4 - ch], [-5.4, -0.4 + ch]]),
      shp([[-3.75, -0.4], [-3.0 - ch, -0.4], [-3.0, -0.4 + ch], [-3.0, AX - 0.5], [-3.4, AX - 0.5], [-3.4, 1.4], [-3.75, 1.4]]),
      shp([[-3.75, 2.6], [-3.4, 2.6], [-3.4, AX + 0.5], [-3.0, AX + 0.5], [-3.0, 4.4 - ch], [-3.0 - ch, 4.4], [-3.75, 4.4]]),
    ];
    const slab = new THREE.ExtrudeGeometry(pieces, { depth: 0.02, bevelEnabled: false }); slab.translate(0, 0, -0.02);
    add(group, slab, cut);
    // outer shell (no front face) with chamfered edges
    const outer = new THREE.Shape(); {
      const x0 = -5.4, x1 = -3.0, y0 = -0.4, y1 = 4.4;
      outer.moveTo(x0 + ch, y0); outer.lineTo(x1 - ch, y0); outer.lineTo(x1, y0 + ch); outer.lineTo(x1, y1 - ch); outer.lineTo(x1 - ch, y1);
      outer.lineTo(x0 + ch, y1); outer.lineTo(x0, y1 - ch); outer.lineTo(x0, y0 + ch); outer.closePath();
    }
    const og = new THREE.ExtrudeGeometry(outer, { depth: D - 0.1, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.0001, bevelSegments: 1 });
    og.translate(0, 0, -D + 0.02);
    const hidden = new THREE.MeshBasicMaterial({ visible: false });
    add(group, og, [hidden, steel]);
    // cavity walls (dark): chamber box + port half-cylinders + bore half-cylinder
    const chamberD = 0.75;
    const chS = shp([[-5.0, 1.4], [-3.4, 1.4], [-3.4, 2.6], [-5.0, 2.6]]);
    const chG = new THREE.ExtrudeGeometry(chS, { depth: chamberD, bevelEnabled: false }); chG.translate(0, 0, -chamberD);
    add(group, chG, [hidden, cav]);
    add(group, new THREE.PlaneGeometry(1.6, 1.2), cav, -4.2, 2.0, -chamberD + 0.001);
    const halfCylY = (x, y0, y1, r) => turned([[r, y0], [r, y1], [r - 0.001, y1], [r - 0.001, y0]], { seg: 20, open: [0, 0, 1] }).body.translate(x, 0, 0);
    add(group, halfCylY(-4.2, -0.4, 1.4, 0.45), cav);
    add(group, halfCylY(-4.2, 2.6, 4.4, 0.45), cav);
    {
      const g = turned([[0.5, 0], [0.5, 0.4], [0.499, 0.4], [0.499, 0]], { seg: 20, open: [0, 0, 1], q: QX }).body; g.translate(-3.4, AX, 0); add(group, g, cav);
    }
    // fluid fill: chamber + ports
    {
      const fg = [];
      fg.push(box(1.6, 1.2, chamberD - 0.01).translate(-4.2, 2.0, -chamberD / 2 - 0.004));
      const pf = turned([[0, -1.0], [0.44, -1.0], [0.44, 1.4], [0, 1.4]], { seg: 20, open: [0, 0, 1] });
      fg.push(pf.body.translate(-4.2, 0, 0), pf.cap.translate(-4.2, 0, -0.004));
      add(group, merge(fg), fluid);
      const dg = [turned([[0, 2.6], [0.44, 2.6], [0.44, 4.4], [0, 4.4]], { seg: 20, open: [0, 0, 1] })];
      add(group, merge([dg[0].body, dg[0].cap.translate(0, 0, -0.004)]).translate(-4.2, 0, 0), fluidD);
    }

    // ---- valve seats (section rings) + valves (whole) + springs
    const seatProf = (y) => [[0.3, y - 0.3], [0.45, y - 0.3], [0.45, y + 0.02], [0.36, y + 0.02], [0.3, y - 0.08]];
    for (const ys of [1.38, 2.98]) addTurned(group, seatProf(ys), mach, cut, { seg: 28, open: [0, 0, 1] }, -4.2, 0, 0);
    function valve() {
      const g = new THREE.Group();
      // disc: conical underside matching the seat, urethane insert ring, top boss
      addTurned(g, [[0, -0.04], [0.3, -0.04], [0.37, 0.05], [0.37, 0.09], [0.3, 0.12], [0.08, 0.12], [0.08, 0.36], [0, 0.36]], null, null, { seg: 28 }).body.material = mach;
      const ins = addTurned(g, [[0.3, 0.0], [0.39, 0.06], [0.39, 0.1], [0.3, 0.1]], SM.rubber(), null, { seg: 28 });
      // 4 guide wings below the disc
      const wg = []; for (let k = 0; k < 4; k++) wg.push(box(0.04, 0.26, 0.5).translate(0, -0.17, 0).rotateY(k * PI / 4 + PI / 8));
      add(g, merge(wg), mach);
      // spring (unit height, scaled per frame), from disc top to retainer
      const sp = add(g, springGeo(0.17, 0.028, 3.2), SM.steelDk(), 0, 0.12, 0); g.spring = sp;
      return g;
    }
    const sv = valve(); group.add(sv); sv.position.set(-4.2, 1.42, 0);
    const dv = valve(); group.add(dv); dv.position.set(-4.2, 3.02, 0);
    // retainers: suction keeper arm from the chamber wall, discharge cage cross-bar in the port
    add(group, merge([cbox(0.7, 0.06, 0.18, 0.02).translate(-4.55, 2.2, -0.12), cyl(0.09, 0.12, 12).translate(-4.2, 2.17, -0.12)]), SM.steelDk());
    add(group, merge([cbox(0.9, 0.06, 0.18, 0.02).translate(-4.2, 3.8, -0.12), cyl(0.09, 0.12, 12).translate(-4.2, 3.77, -0.12)]), SM.steelDk());
    anchors.suctionValve = anchor(sv, 0, 0.1, 0); anchors.dischargeValve = anchor(dv, 0, 0.1, 0);

    // ---- liner (fixed OD, bore morphs) + clamp ring
    const linerT = turned([[0.5, -3.0], [0.5, 0.0], [0.62, 0.0], [0.66, -0.04], [0.66, -2.62], [0.78, -2.62], [0.85, -2.68], [0.85, -2.94], [0.8, -3.0]], { seg: 40, open: [0, 0, 1], q: QX });
    const liner = grp(group, 0, AX, 0);
    const linerBody = add(liner, linerT.body, chrome), linerCap = add(liner, linerT.cap, cut);
    // liner outside is bare steel: separate band material so the bore stays chrome
    const morphs = [];
    function radialMorph(geo, thresh, r0) {
      const p = geo.attributes.position, base = Float32Array.from(p.array);
      const rec = { geo, base, thresh, r0, k: 1 }; morphs.push(rec); return rec;
    }
    function applyMorph(rec, r) {
      const k = r / rec.r0; if (Math.abs(k - rec.k) < 1e-5) return; rec.k = k;
      const p = rec.geo.attributes.position.array, b = rec.base;
      for (let i = 0; i < p.length; i += 3) {
        const y = b[i + 1], z = b[i + 2], rr = Math.hypot(y, z);
        if (rr < rec.thresh) { p[i + 1] = y * k; p[i + 2] = z * k; } else { p[i + 1] = y; p[i + 2] = z; }
      }
      rec.geo.attributes.position.needsUpdate = true; rec.geo.computeBoundingSphere();
    }
    const mLB = radialMorph(linerT.body, 0.52, 0.5), mLC = radialMorph(linerT.cap, 0.52, 0.5);
    // liner clamp / retainer ring at the fluid-end face, with studs (back half)
    addTurned(liner, [[0.86, -2.62], [1.1, -2.62], [1.14, -2.58], [1.14, -2.4], [1.1, -2.36], [0.86, -2.36]], SM.steelDk(), cut, { seg: 40, open: [0, 0, 1], q: QX });
    bolts(group, boltCircle([-2.4, AX, 0], [1, 0, 0], 0.98, 10, p => p.z < -0.05, PI / 10), 0.07, 0.16, SM.bolt());
    // liner fluid (unit length along x, radius 1, scaled per frame)
    const lfT = turned([[0, 0], [1, 0], [1, 1], [0, 1]], { seg: 24, open: [0, 0, 1], q: QX });
    const lf = add(group, merge([lfT.body, lfT.cap.translate(0, 0, -0.004)]), fluid);
    // ---- piston (whole) + rod + clamp + crosshead hint
    const piston = pistonGroup(SM.orange()); group.add(piston); piston.position.y = AX;
    const rod = add(group, cylBetween([0, 0, 0], [4.6, 0, 0], 0.14, 20), chrome);
    const clamp_ = add(group, merge([cyl(0.26, 0.34, 20).rotateZ(PI / 2), cbox(0.08, 0.62, 0.16, 0.02).translate(0, 0, 0.0)]), SM.steelDk());
    // crosshead (yellow) in a half-cut guide (painted power-end blue)
    const xh = grp(group, 0, AX, 0);
    addTurned(xh, [[0, -0.45], [0.42, -0.45], [0.46, -0.41], [0.46, 0.41], [0.42, 0.45], [0, 0.45]], SM.yellow(), null, { seg: 32, q: QX });
    add(xh, cyl(0.1, 0.98, 14).rotateX(PI / 2), mach); // wrist pin
    const conrod = add(group, merge([cbox(3.2, 0.3, 0.22, 0.04).translate(1.6, 0, 0), cyl(0.22, 0.26, 18).rotateX(PI / 2)]), SM.blue2());
    const guideX0 = 2.0, guideX1 = 6.2;
    addTurned(group, [[0.48, guideX0], [0.62, guideX0], [0.62, guideX1], [0.48, guideX1]], SM.blue(), cutMat(2.2, 'blue'), { seg: 36, open: [0, 0, 1], q: QX }, 0, AX, 0);
    add(group, cbox(guideX1 - guideX0 + 0.4, 0.25, 1.5, 0.04), SM.blue(), (guideX0 + guideX1) / 2, AX - 0.75, -0.55);
    // wiper box / stuffing gland where the rod enters the power end
    addTurned(group, [[0.16, 1.7], [0.42, 1.7], [0.42, 2.0], [0.16, 2.0]], SM.steelDk(), cut, { seg: 28, open: [0, 0, 1], q: QX }, 0, AX, 0);

    // ---- suction: neck + manifold along z (cut perpendicular -> ring section with a tunnel into -z)
    const MY = -1.25, MR = 0.55, MRi = 0.45;
    const neck = addSweep(group, [V3(-4.2, -0.4, 0), V3(-4.2, MY + 0.3, 0)], 0.6, 0.45, steel, cav, cut, { seg: 18 });
    const man = grp(group, -4.2, MY, 0);
    const mT = turned([[MRi, -3.0], [MR, -3.0], [MR, 0], [MRi, 0]], { seg: 36, q: QZ });
    add(man, mT.body, steel); // full ring tube, z 0 .. -3 (lathe h maps to +z -> flip)
    add(man, new THREE.RingGeometry(MRi, MR, 36), cut, 0, 0, 0.001);
    add(man, cyl(MRi - 0.005, 3.0, 28, false).rotateX(PI / 2).translate(0, 0, -1.5), fluid);
    add(man, new THREE.CircleGeometry(MRi * 0.98, 28), cav, 0, 0, -2.9);
    // flange where the neck meets the block
    addTurned(group, [[0.45, -0.62], [0.78, -0.62], [0.82, -0.58], [0.82, -0.44], [0.78, -0.4], [0.45, -0.4]], SM.steelDk(), cut, { seg: 36, open: [0, 0, 1] }, -4.2, 0, 0);
    bolts(group, boltCircle([-4.2, -0.62, 0], [0, -1, 0], 0.68, 8, p => p.z < -0.1, PI / 8), 0.06, 0.13, SM.bolt());

    // ---- discharge: forged elbow up out of the block then line along -x at y 4.9
    const DY = 4.9, DRo = 0.4, DRi = 0.3;
    const dPts = fillet([[-4.2, 4.4, 0], [-4.2, DY, 0], [-9.6, DY, 0]], 0.45, 10);
    addSweep(group, dPts, DRo, DRi, steel, cav, cut, { seg: 20 });
    const dFluid = sweep(dPts, DRi - 0.005, 0, { seg: 16 });
    add(group, merge([dFluid.outer, dFluid.cut.translate(0, 0, -0.004)]), fluidD);
    // flanges on the discharge line
    for (const x of [-6.6, -8.6]) {
      addTurned(group, [[DRo, -0.12], [0.62, -0.12], [0.66, -0.08], [0.66, 0.08], [0.62, 0.12], [DRo, 0.12]], SM.steelDk(), cut, { seg: 32, open: [0, 0, 1], q: QX }, x, DY, 0);
      bolts(group, boltCircle([x + 0.12, DY, 0], [1, 0, 0], 0.53, 8, p => p.z < -0.05, PI / 8), 0.05, 0.1, SM.bolt());
    }
    // block-top flange
    addTurned(group, [[DRi, 4.4], [0.7, 4.4], [0.74, 4.44], [0.74, 4.56], [0.7, 4.6], [DRi, 4.6]], SM.steelDk(), cut, { seg: 32, open: [0, 0, 1] }, -4.2, 0, 0);
    bolts(group, boltCircle([-4.2, 4.6, 0], [0, 1, 0], 0.6, 8, p => p.z < -0.1, PI / 8), 0.05, 0.11, SM.bolt());

    // ---- pulsation dampener (red sphere, section) with rubber bladder + N2
    const DX = -5.6, DC = 6.45, DR = 1.1, DT = 0.12;
    const sph = (r, a0, a1, n) => { const o = []; for (let i = 0; i <= n; i++) { const a = lerp(a0, a1, i / n); o.push([Math.cos(a) * r, Math.sin(a) * r, i > 0 && i < n ? 1 : 0]); } return o; };
    // profile (r,h) relative to sphere centre: neck at the bottom, top port with cover
    const aB = -Math.asin(0.36 / DR), aT = Math.asin(0.42 / DR);
    // build the shell profile explicitly: outer arc from the neck to the top port, inner arc back
    {
      const prof = [];
      const ob = Math.asin(-Math.sqrt(1 - (0.42 / DR) ** 2)), ot = Math.asin(Math.sqrt(1 - (0.5 / DR) ** 2));
      prof.push([0.26, -DR - 0.6], [0.40, -DR - 0.6], [0.40, -DR - 0.2]);
      for (let i = 0; i <= 20; i++) { const a = lerp(ob, ot, i / 20); prof.push([Math.cos(a) * DR, Math.sin(a) * DR, i > 0 && i < 20 ? 1 : 0]); }
      const RI = DR - DT, ib = Math.asin(-Math.sqrt(1 - (0.26 / RI) ** 2)), it = Math.asin(Math.sqrt(1 - (0.36 / RI) ** 2));
      prof.push([0.5, DR * Math.sin(ot) + 0.12], [0.36, DR * Math.sin(ot) + 0.12]);
      for (let i = 0; i <= 20; i++) { const a = lerp(it, ib, i / 20); prof.push([Math.cos(a) * RI, Math.sin(a) * RI, i > 0 && i < 20 ? 1 : 0]); }
      const dg = addTurned(group, prof, SM.red(), cutMat(2.2, 'red'), { seg: 36, open: [0, 0, 1] }, DX, DC, 0);
      dg.body.material = SM.red();
    }
    // inner wall darker
    add(group, turned((() => { const o = []; const RI = DR - DT - 0.004; for (let i = 0; i <= 24; i++) { const a = lerp(-PI / 2 + 0.25, PI / 2 - 0.33, i / 24); o.push([Math.cos(a) * RI, Math.sin(a) * RI, 1]); } const p = o.map(a => [a[0], a[1], a[2]]); p[0][2] = 0; p[p.length - 1][2] = 0; for (let i = o.length - 1; i >= 0; i--) p.push([o[i][0] - 0.002, o[i][1], i > 0 && i < o.length - 1 ? 1 : 0]); return p; })(), { seg: 40, open: [0, 0, 1] }).body.translate(DX, DC, 0), SM.cavity());
    // top cover with charging valve + tiny gauge
    const topY = DC + DR * Math.sin(Math.asin(Math.sqrt(1 - (0.5 / DR) ** 2))) + 0.12;
    addTurned(group, [[0, topY], [0.62, topY], [0.66, topY + 0.04], [0.66, topY + 0.18], [0.62, topY + 0.22], [0, topY + 0.22]], SM.red(), cutMat(2.2, 'red'), { seg: 40, open: [0, 0, 1] }, DX, 0, 0);
    bolts(group, boltCircle([DX, topY + 0.22, 0], [0, 1, 0], 0.52, 10, p => p.z < -0.08, PI / 10), 0.05, 0.11, SM.bolt());
    add(group, merge([cyl(0.06, 0.3, 10).translate(0, 0.15, 0), cyl(0.09, 0.1, 6).translate(0, 0.32, 0)]), SM.brass(), DX + 0.2, topY + 0.22, -0.2);
    const gz = grp(group, DX - 0.25, topY + 0.5, -0.15);
    add(gz, cyl(0.035, 0.28, 8).translate(0, -0.14, 0), SM.brass());
    add(gz, cyl(0.16, 0.08, 24).rotateX(PI / 2), SM.brass());
    add(gz, new THREE.CircleGeometry(0.135, 24), SM.white(), 0, 0, 0.041);
    // neck flange to the discharge line
    addTurned(group, [[0.26, DY + DRo - 0.02], [0.66, DY + DRo - 0.02], [0.7, DY + DRo + 0.02], [0.7, DY + DRo + 0.14], [0.66, DY + DRo + 0.18], [0.26, DY + DRo + 0.18]], SM.red(), cutMat(2.2, 'red'), { seg: 36, open: [0, 0, 1] }, DX, 0, 0);
    bolts(group, boltCircle([DX, DY + DRo + 0.18, 0], [0, 1, 0], 0.56, 8, p => p.z < -0.08, PI / 8), 0.05, 0.1, SM.bolt());
    // tee bore from the line into the neck (cavity + fluid)
    add(group, halfCylY(DX, DY, DC - DR - 0.2, 0.26), cav);
    // mud inside the dampener lower part (level breathes with the pulse)
    const dmud = grp(group, DX, DC - DR + DT, 0);
    {
      const RI = DR - DT - 0.01, lev = 0.55, prof = [[0, -0.6]];
      prof.push([0.25, -0.6]);
      const a0 = Math.asin(-Math.sqrt(1 - (0.25 / RI) ** 2)), a1 = Math.asin(clamp((lev - (DR - DT)) / RI, -1, 1));
      for (let i = 0; i <= 16; i++) { const a = lerp(a0, a1, i / 16); prof.push([Math.cos(a) * RI, Math.sin(a) * RI + (DR - DT), i > 0 && i < 16 ? 1 : 0]); }
      prof.push([0, Math.sin(a1) * RI + (DR - DT)]);
      const mt = turned(prof, { seg: 40, open: [0, 0, 1] });
      add(dmud, merge([mt.body, mt.cap.translate(0, 0, -0.004)]), fluidD);
    }
    // bladder (rubber bag, section) + N2 fill + label
    const blad = grp(group, DX, topY - 0.02, 0);
    {
      const ro = 0.9, ri = 0.8, cy = -1.0; // bag centre below the top port
      const prof = [[0.2, 0.0], [0.34, 0.0]];
      const at0 = Math.asin(clamp((0.0 - 0.12 - cy) / ro, -1, 1));
      for (let i = 0; i <= 22; i++) { const a = lerp(at0, -PI / 2, i / 22); prof.push([Math.max(0.001, Math.cos(a) * ro), cy + Math.sin(a) * ro, i > 0 && i < 22 ? 1 : 0]); }
      prof.push([0.001, cy - ri]);
      for (let i = 0; i <= 22; i++) { const a = lerp(-PI / 2, at0 + 0.05, i / 22); prof.push([Math.max(0.0015, Math.cos(a) * ri), cy + Math.sin(a) * ri, i > 0 && i < 22 ? 1 : 0]); }
      prof.push([0.2, -0.12]);
      const bt = turned(prof, { seg: 30, open: [0, 0, 1] });
      blad.bag = add(blad, bt.body, mat(0x2b3442, 'rubber', { metalness: 0, roughness: 0.55 }));
      add(blad, bt.cap, cutRubber());
      const n2M = mat(C.n2, 'white', { metalness: 0, roughness: 0.3, transparent: true, opacity: 0.55, emissive: new THREE.Color(C.n2).multiplyScalar(0.25), depthWrite: false });
      const nt = turned((() => { const o = [[0, cy - ri + 0.01]]; for (let i = 1; i <= 20; i++) { const a = lerp(-PI / 2, at0, i / 20); o.push([Math.cos(a) * (ri - 0.01), cy + Math.sin(a) * (ri - 0.01), i < 20 ? 1 : 0]); } o.push([0.18, -0.13], [0, -0.13]); return o; })(), { seg: 40, open: [0, 0, 1] });
      add(blad, merge([nt.body, nt.cap.translate(0, 0, -0.006)]), n2M);
      // N2 label
      const c = canvas(256, 256), x = c.getContext('2d');
      x.fillStyle = '#1e3a8a'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.font = FONT(600, 120); x.fillText('N', 110, 128);
      x.font = FONT(600, 64); x.fillText('2', 178, 166);
      const lbl = add(blad, new THREE.PlaneGeometry(0.75, 0.75), new THREE.MeshBasicMaterial({ map: tex(c), transparent: true, depthWrite: false }), 0, cy + 0.05, 0.01);
      lbl.renderOrder = 2;
      anchors.n2 = anchor(blad, 0, cy, 0);
    }
    anchors.dampener = anchor(group, DX, DC, 0); anchors.bladder = anchor(group, DX, DC + 0.2, 0);

    // ---- pop-off (relief) valve on the line at x -7.6: red body section, disc + spring, side vent
    const PX = -7.6, PB = DY + DRo - 0.05;
    const pop = grp(group, PX, 0, 0);
    {
      const s = new THREE.Shape();
      const pts = [[-0.32, PB], [0.32, PB], [0.32, PB + 0.95], [0.26, PB + 1.0], [-0.26, PB + 1.0], [-0.32, PB + 0.95]];
      s.moveTo(...pts[0]); pts.slice(1).forEach(p => s.lineTo(...p)); s.closePath();
      const hole = new THREE.Path(); // inner chamber + inlet bore + vent bore toward -x
      [[-0.11, PB], [0.11, PB], [0.11, PB + 0.2], [0.18, PB + 0.2], [0.18, PB + 0.82], [-0.18, PB + 0.82], [-0.18, PB + 0.62], [-0.32, PB + 0.62], [-0.32, PB + 0.44], [-0.18, PB + 0.44], [-0.18, PB + 0.2], [-0.11, PB + 0.2]]
        .forEach((p, i) => (i ? hole.lineTo(...p) : hole.moveTo(...p)));
      // the hole touches the outline (bores exit) -> build the cut face as two pieces instead
      const L1 = new THREE.Shape(), L2 = new THREE.Shape();
      [[-0.32, PB], [-0.11, PB], [-0.11, PB + 0.2], [-0.18, PB + 0.2], [-0.18, PB + 0.44], [-0.32, PB + 0.44]].forEach((p, i) => (i ? L1.lineTo(...p) : L1.moveTo(...p)));
      [[0.11, PB], [0.32, PB], [0.32, PB + 0.95], [0.26, PB + 1.0], [-0.26, PB + 1.0], [-0.32, PB + 0.95], [-0.32, PB + 0.62], [-0.18, PB + 0.62], [-0.18, PB + 0.82], [0.18, PB + 0.82], [0.18, PB + 0.2], [0.11, PB + 0.2]].forEach((p, i) => (i ? L2.lineTo(...p) : L2.moveTo(...p)));
      const sl = new THREE.ExtrudeGeometry([L1, L2], { depth: 0.02, bevelEnabled: false }); sl.translate(0, 0, -0.02);
      add(pop, sl, cutMat(2.2, 'red'));
      const ob = new THREE.ExtrudeGeometry(s, { depth: 0.5, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.0001, bevelSegments: 1 }); ob.translate(0, 0, -0.52);
      add(pop, ob, [hidden, SM.red()]);
      const inner = new THREE.Shape(); [[-0.18, PB + 0.2], [0.18, PB + 0.2], [0.18, PB + 0.82], [-0.18, PB + 0.82]].forEach((p, i) => (i ? inner.lineTo(...p) : inner.moveTo(...p)));
      const ig = new THREE.ExtrudeGeometry(inner, { depth: 0.3, bevelEnabled: false }); ig.translate(0, 0, -0.3);
      add(pop, ig, [hidden, cav]); add(pop, new THREE.PlaneGeometry(0.36, 0.62), cav, 0, PB + 0.51, -0.299);
      // seat, disc (moves), spring, adjusting screw + cap
      add(pop, merge([cyl(0.13, 0.04, 20).translate(0, PB + 0.22, -0.13)]), mach);
      pop.disc = grp(pop, 0, PB + 0.24, 0);
      add(pop.disc, merge([cyl(0.16, 0.06, 24).translate(0, 0.03, 0), cyl(0.05, 0.08, 12).translate(0, 0.1, 0)]), mach);
      pop.spring = add(pop, springGeo(0.11, 0.02, 4), SM.steelDk(), 0, PB + 0.34, 0);
      add(pop, merge([cyl(0.06, 0.4, 12).translate(0, PB + 1.1, 0), cyl(0.13, 0.12, 6).translate(0, PB + 1.08, 0), cyl(0.1, 0.16, 16).translate(0, PB + 1.32, 0)]), SM.steelDk());
      add(pop, cbox(0.3, 0.05, 0.3, 0.015), SM.steelDk(), 0, PB + 0.83, -0.1);
      // name tag
      add(pop, cbox(0.22, 0.1, 0.02, 0.005), SM.brass(), 0.0, PB + 0.9, -0.53);
      // inlet bore from the line (cavity), vent bore to the left
      add(pop, halfCylY(0, PB - 0.2, PB + 0.2, 0.11), cav);
      const vpts = fillet([[-0.32, PB + 0.53, 0], [-0.6, PB + 0.53, 0], [-0.6, 6.2, 0], [-2.8, 6.2, 0]], 0.25, 8);
      addSweep(pop, vpts, 0.12, 0.08, SM.steelDk(), cav, cut, { seg: 14 });
      pop.ventPath = Poly(vpts.map(v => V3(v.x + PX, v.y, 0.03)).concat([V3(PX - 3.2, 6.2, 0.03)]));
      pop.ventPathInner = vpts.map(v => [v.x + PX, v.y, 0.03]);
    }
    anchors.popoff = anchor(pop, 0, PB + 0.5, 0); anchors.popoffVent = anchor(pop, -1.6, 6.2, 0);

    // ---- skid & supports
    add(group, cbox(16.2, 0.36, 2.6, 0.05), SM.slate(), -1.4, -2.05, -0.9);
    add(group, cbox(1.6, 0.3, 1.8, 0.04), SM.slate(), -4.2, -1.75 - 0.05, -1.0);
    add(group, cbox(0.25, 1.8, 1.6, 0.03), SM.slate(), -4.2, -1.0, -2.2);

    // ---- tracers (teal specks) + vent squirt (amber)
    const NS = 16, NB = 12, ND = 28, NV = 14, NT = NS + NB + ND + NV;
    const trM = mat(0xffffff, 'paint', { metalness: 0, roughness: 0.5, emissive: new THREE.Color(0x2dd4bf).multiplyScalar(0.25) });
    const tr = particles(group, new THREE.IcosahedronGeometry(1, 0), trM, NT);
    const cT = new THREE.Color(0x99f6e4), cT2 = new THREE.Color(0x0f766e), cA = new THREE.Color(C.amber);
    for (let i = 0; i < NT; i++) tr.color(i, i >= NS + NB + ND ? cA : hash(i, 19) > 0.55 ? cT2 : cT);
    const sucP = Poly([[-4.2, MY, -2.6], [-4.2, MY, -0.6], [-4.2, MY + 0.15, 0.05], [-4.2, -0.4, 0.05], [-4.2, 1.2, 0.05], [-4.2, 2.0, 0.05], [-3.9, 2.0, 0.05]]);
    const disP = Poly([[-4.0, 2.0, 0.05], [-4.2, 2.3, 0.05], [-4.2, 3.6, 0.05], ...dPts.slice(1).map(v => [v.x, v.y, 0.05])]);
    const paths = {
      suction: [[-4.2, MY, -2.6], [-4.2, MY, 0], [-4.2, -0.4, 0], [-4.2, 1.2, 0], [-4.2, 2.0, 0], [-3.2, 2.0, 0]],
      discharge: [[-3.2, 2.0, 0], [-4.2, 2.0, 0], [-4.2, 3.4, 0], ...dPts.map(v => [v.x, v.y, 0])],
      vent: pop.ventPathInner,
    };
    anchors.chamber = anchor(group, -4.2, 2.0, 0); anchors.suctionPort = anchor(group, -4.2, 0.6, 0);
    anchors.dischargePort = anchor(group, -4.2, 3.6, 0); anchors.manifold = anchor(group, -4.2, MY, 0);
    anchors.linerMid = anchor(group, -1.5, AX, 0); anchors.linerTop = anchor(group, -1.6, AX + 0.5, 0); anchors.linerBottom = anchor(group, -1.6, AX - 0.5, 0);
    anchors.strokeStart = anchor(group, -2.625, AX, 0); anchors.strokeEnd = anchor(group, -0.625, AX, 0);
    anchors.dischargeOut = anchor(group, -9.6, DY, 0); anchors.dischargeLine = anchor(group, -6.4, DY, 0);
    anchors.piston = anchor(piston); anchors.pistonFace = anchor(piston, -0.225, 0, 0); anchors.crosshead = anchor(xh); anchors.rod = anchor(rod, 2, 0, 0);

    const dmudBase = dmud.position.y;
    function update(t, p = {}) {
      const spm = p.spm ?? 100;
      const th = p.theta ?? TAU * spm / 60 * t;
      const bore = p.bore ?? 0.5;
      const xp = -1.4 - Math.cos(th), s = Math.sin(th);
      const suc = sstep(0, 1, s * 3), dis = sstep(0, 1, -s * 3);
      const pulse = sstep(0, 1, -s * 1.4) * (p.damp ?? 1);
      Object.assign(state, { theta: th, x: xp, suction: suc, discharge: dis, pulse });
      // liner bore morph + piston scale
      applyMorph(mLB, bore); applyMorph(mLC, bore);
      piston.position.x = xp; piston.scale.set(1, bore / 0.5, bore / 0.5);
      const face = xp - 0.225;
      lf.position.set(-3.4, AX, 0); lf.scale.set(face + 3.4, bore - 0.006, bore - 0.006);
      rod.position.set(xp + 0.25, AX, 0); clamp_.position.set(xp + 3.0, AX, 0);
      const xc = xp + 5.0; xh.position.x = xc;
      // conrod to an off-frame crank (r 1, centre x 6.6+1.6)
      const cx = 8.2, py = AX + Math.sin(th) * 1.0, px = cx - Math.cos(th) * 1.0;
      conrod.position.set(xc, AX, 0); conrod.rotation.z = Math.atan2(py - AX, px - xc);
      xh.visible = conrod.visible = (p.crossheadGhost ?? 1) > 0;
      // valves
      const lift = p.valveLift ?? 0.3; sv.position.y = 1.42 + lift * suc; dv.position.y = 3.02 + lift * dis;
      sv.spring.scale.y = (2.17 - 0.12 - 0.06 - sv.position.y) / 1; dv.spring.scale.y = (3.77 - 0.12 - 0.06 - dv.position.y);
      // dampener: bladder squeezes up, mud level rises
      const sq = 0.07 * pulse;
      blad.scale.set(1 - sq * 0.5, 1 - sq * 1.6, 1 - sq * 0.5);
      dmud.scale.set(1, 1 + sq * 2.6, 1); dmud.position.y = dmudBase;
      fluidD.emissive.setHex(C.teal).multiplyScalar(0.22 + 0.5 * pulse * (1 + (p.glow ?? 0)) + 0.3 * (p.glow ?? 0));
      // pop-off
      const po = clamp(p.popoff ?? 0);
      pop.disc.position.y = PB + 0.24 + 0.2 * po;
      pop.spring.position.y = PB + 0.34 + 0.2 * po; pop.spring.scale.y = (PB + 0.81 - pop.spring.position.y);
      // tracers: displacement-exact (fluid moves only when the piston pushes or pulls)
      const rev = Math.floor(th / TAU), ph = th - rev * TAU;
      const vin = rev * 2 + (ph < PI ? 1 - Math.cos(ph) : 2);
      const vout = rev * 2 + (ph < PI ? 0 : 1 + Math.cos(ph));
      const area = (bore / 0.5) ** 2;
      const on = p.tracers !== false;
      let k = 0;
      for (let i = 0; i < NS; i++, k++) {
        const L = sucP.L, sPos = fract(hash(i, 11) + vin * area * 0.55 / L) * L;
        sucP.at(sPos, _v); const e = Math.min(sstep(0, 0.4, sPos), sstep(0, 0.4, L - sPos));
        const j = (hash(i, 12) - 0.5) * 0.5;
        if (on) tr.set(k, _v.x + (_v.y < 1.4 ? j : 0), _v.y + (_v.y >= 1.4 ? j * 0.8 : 0), _v.z, 0.034 * e); else tr.hide(k);
      }
      for (let i = 0; i < NB; i++, k++) {
        const f = fract(hash(i, 13) + (vin - vout) * 0.0), x = lerp(-3.3, face - 0.06, f), y = AX + (hash(i, 14) - 0.5) * 1.6 * (bore - 0.08);
        if (on) tr.set(k, x, y, 0.05, 0.032); else tr.hide(k);
      }
      for (let i = 0; i < ND; i++, k++) {
        const L = disP.L, sPos = fract(hash(i, 15) + vout * area * 0.9 / L) * L;
        disP.at(sPos, _v); const e = Math.min(sstep(0, 0.3, sPos), sstep(0, 0.6, L - sPos));
        const j = (hash(i, 16) - 0.5) * 0.4;
        if (on) tr.set(k, _v.x + (_v.y < DY - 0.3 ? j : 0), _v.y + (_v.y >= DY - 0.3 ? j * 0.9 : 0), _v.z, 0.034 * e); else tr.hide(k);
      }
      for (let i = 0; i < NV; i++, k++) {
        const L = pop.ventPath.L, sPos = fract(hash(i, 17) + t * 2.2 / L) * L;
        pop.ventPath.at(sPos, _v);
        const vis = sstep(0.05, 0.4, po) * Math.min(sstep(0, 0.2, sPos), 1);
        if (vis > 0.01) tr.set(k, _v.x, _v.y + (hash(i, 18) - 0.5) * 0.08, _v.z, 0.05 * vis); else tr.hide(k);
      }
      tr.done();
    }
    update(0, {});
    return { group, update, anchors, paths, state };
  }

  // placeholder registry; later builders appended below
  // =================================================================== 4. PUMP_A triplex overview
  function triplex() {
    const group = new THREE.Group(), anchors = {}, state = { pistonX: [0, 0, 0], forward: [0, 0, 0] };
    const AY = 2.4, CX = 2.8, CR = 1.0, LR = 3.0, ZS = [-1.3, 0, 1.3];
    const cut = cutMat(2.2), blue = SM.blue(), steel = SM.steel(), mach = SM.machined();
    const fluid = fluidMat(C.teal, { opacity: 0.6, glow: 0.25 });
    // skid with side rails
    add(group, cbox(14.6, 0.3, 4.7, 0.05), SM.slate(), -1.9, 0.15, 0);
    for (const z of [-2.25, 2.25]) add(group, cbox(14.6, 0.5, 0.22, 0.04), SM.slate(), -1.9, 0.4, z);
    for (let x = -8.6; x < 5; x += 1.6) add(group, cbox(0.12, 0.42, 4.3, 0.02), SM.slate(), x, 0.44, 0);
    // ---- power end: open-top tub
    const X0 = -1.6, X1 = 4.6, Y0 = 0.5, Y1 = 3.5, ZW = 2.0, T = 0.16;
    const tub = grp(group);
    add(tub, cbox(X1 - X0, 0.2, 2 * ZW, 0.04), blue, (X0 + X1) / 2, Y0 + 0.1, 0);
    add(tub, cbox(X1 - X0 - 2 * T, 0.02, 2 * ZW - 2 * T, 0.005), mat(0x1b2332, 'dark', { roughness: 0.35, metalness: 0.4 }), (X0 + X1) / 2, Y0 + 0.21, 0);
    add(tub, cbox(T, Y1 - Y0, 2 * ZW, 0.04), blue, X0 + T / 2, (Y0 + Y1) / 2, 0);
    add(tub, cbox(T, Y1 - Y0, 2 * ZW, 0.04), blue, X1 - T / 2, (Y0 + Y1) / 2, 0);
    for (const z of [-1, 1]) add(tub, cbox(X1 - X0, Y1 - Y0, T, 0.04), blue, (X0 + X1) / 2, (Y0 + Y1) / 2, z * (ZW - T / 2));
    // top flange lip
    add(tub, merge([cbox(X1 - X0 + 0.2, 0.1, 0.32, 0.03).translate(0, 0, ZW - 0.1), cbox(X1 - X0 + 0.2, 0.1, 0.32, 0.03).translate(0, 0, -ZW + 0.1),
      cbox(0.32, 0.1, 2 * ZW, 0.03).translate(X0 - (X0 + X1) / 2 + 0.1, 0, 0), cbox(0.32, 0.1, 2 * ZW, 0.03).translate(X1 - (X0 + X1) / 2 - 0.1, 0, 0)]), blue, (X0 + X1) / 2, Y1 + 0.05, 0);
    bolts(group, [...Array(14)].map((_, i) => ({ p: [X0 + 0.25 + i * (X1 - X0 - 0.5) / 13, Y1 + 0.1, ZW - 0.08], n: [0, 1, 0] }))
      .concat([...Array(14)].map((_, i) => ({ p: [X0 + 0.25 + i * (X1 - X0 - 0.5) / 13, Y1 + 0.1, -ZW + 0.08], n: [0, 1, 0] }))), 0.04, 0.04, SM.bolt());
    // vertical ribs outside the side walls
    for (const z of [-1, 1]) for (const x of [-1.05, 1.45, 4.1]) add(tub, cbox(0.14, Y1 - Y0 - 0.1, 0.16, 0.03), blue, x, (Y0 + Y1) / 2, z * (ZW + 0.06));
    // main bearing bosses on both walls
    for (const z of [-1, 1]) {
      addTurned(group, [[0.3, 0], [0.78, 0], [0.82, 0.04], [0.82, 0.2], [0.78, 0.24], [0.3, 0.24]], blue, null, { seg: 40, q: z > 0 ? QZ : QZ.clone().multiply(new THREE.Quaternion().setFromAxisAngle(V3(1, 0, 0), PI)) }, CX, AY, z * ZW);
      bolts(group, boltCircle([CX, AY, z * (ZW + 0.24)], [0, 0, z], 0.62, 8, () => true, PI / 8), 0.04, 0.09, SM.bolt());
    }
    // crosshead guides: troughs open upward (cut) + support webs
    const cutB = cutMat(2.2, 'blue');
    for (const z of ZS) {
      addTurned(group, [[0.43, X0], [0.55, X0], [0.55, 1.4], [0.43, 1.4]], mat(0x3b5bd9, 'paint', { roughness: 0.5, metalness: 0.15, side: THREE.DoubleSide }), cutB, { seg: 28, open: [0, 1, 0], q: QX }, 0, AY, z);
      add(group, cbox(2.9, AY - 0.5 - Y0 - 0.2, 0.18, 0.03), blue, (X0 + 1.4) / 2, (AY - 0.5 + Y0 + 0.2) / 2, z);
      // wiper box on the front wall
      addTurned(group, [[0.15, -0.35], [0.36, -0.35], [0.4, -0.31], [0.4, 0], [0.15, 0]], SM.steelDk(), null, { seg: 24, q: QX }, X0, AY, z);
    }
    // ---- crankshaft (rotating group)
    const crank = grp(group, CX, AY, 0);
    const web = (() => {
      const s = new THREE.Shape();
      s.moveTo(CR, 0.3); s.absarc(CR, 0, 0.3, PI / 2, -PI / 2, true); s.lineTo(0.15, -0.46);
      s.absarc(0, 0, 0.78, -PI / 2 - 0.2, PI / 2 + 0.2, true); s.lineTo(0.15, 0.46); s.closePath();
      const g = new THREE.ExtrudeGeometry(s, { depth: 0.1, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 1, curveSegments: 10 });
      g.translate(0, 0, -0.05); return g;
    })();
    const cg = [];
    ZS.forEach((z, i) => {
      const ph = i * TAU / 3, c = Math.cos(ph), sn = Math.sin(ph);
      for (const dz of [-0.24, 0.24]) cg.push(web.clone().rotateZ(ph).translate(0, 0, z + dz));
      cg.push(cyl(0.22, 0.4, 20).rotateX(PI / 2).translate(c * CR, sn * CR, z));
    });
    // main journals between throws + ends through the walls
    const jz = [-ZW - 0.3, -1.54, -1.06, -0.24, 0.24, 1.06, 1.54, ZW + 0.6];
    for (let k = 0; k < jz.length - 1; k += 2) cg.push(cyl(0.3, jz[k + 1] - jz[k], 24).rotateX(PI / 2).translate(0, 0, (jz[k] + jz[k + 1]) / 2));
    cg.push(cyl(0.3, 0.6, 24).rotateX(PI / 2).translate(0, 0, -0.65), cyl(0.3, 0.6, 24).rotateX(PI / 2).translate(0, 0, 0.65));
    add(crank, merge(cg), mach);
    anchors.crank = anchor(crank);
    // bull gear (+ yellow index cross) on the crank outside the +z wall
    const gear = grp(crank, 0, 0, ZW + 0.38);
    add(gear, gearGeo(1.7, 52, 0.11, 0.26, { holes: 6, holeR: 0.27, holeAt: 1.05, bore: 0.29 }), mat(0x737d8c, 'steel', { metalness: 0.75, roughness: 0.4 }));
    add(gear, merge([cbox(2.4, 0.16, 0.02, 0.005), cbox(0.16, 2.4, 0.02, 0.005)]), SM.yellow(), 0, 0, 0.14);
    addTurned(gear, [[0.3, -0.16], [0.52, -0.16], [0.52, 0.18], [0.3, 0.18]], SM.steelDk(), null, { seg: 32, q: QZ });
    anchors.gear = anchor(gear, 0, 1.2, 0.15);
    // pinion + shaft + pedestal
    const PY = AY + 1.7 + 0.45 - 0.02;
    const pinion = grp(group, CX, PY, ZW + 0.38);
    add(pinion, gearGeo(0.45, 14, 0.1, 0.3, { bore: 0.0 }), mach);
    add(group, cyl(0.12, 1.9, 16).rotateX(PI / 2).translate(CX, PY, ZW + 0.2), mach);
    add(group, merge([cbox(0.5, 0.5, 0.36, 0.04).translate(0, 0, 0), cbox(0.5, PY - Y1 - 0.1, 0.36, 0.04).translate(0, -(PY - Y1) / 2 - 0.05, 0)]), blue, CX, PY, ZW - 0.05);
    addTurned(group, [[0.12, 0], [0.38, 0], [0.38, 0.06], [0.3, 0.1], [0.38, 0.14], [0.38, 0.22], [0.3, 0.26], [0.38, 0.3], [0.38, 0.36], [0.12, 0.36]], SM.steelDk(), null, { seg: 32, q: QZ }, CX, PY, ZW + 0.85);
    anchors.pinion = anchor(pinion);
    // ---- per-cylinder: conrod, crosshead, rods, clamp, liner (cut), piston, liner fluid
    const conrodG = merge([
      turned([[0.25, -0.13], [0.42, -0.13], [0.42, 0.13], [0.25, 0.13]], { seg: 28, q: QZ }).body.translate(LR, 0, 0),
      turned([[0.1, -0.11], [0.24, -0.11], [0.24, 0.11], [0.1, 0.11]], { seg: 20, q: QZ }).body,
      cbox(LR - 0.5, 0.26, 0.2, 0.05).translate(LR / 2 + 0.03, 0, 0), cbox(LR - 0.7, 0.4, 0.08, 0.02).translate(LR / 2 + 0.05, 0, 0),
      cbox(0.3, 0.2, 0.3, 0.03).translate(LR + 0.3, 0.32, 0), cbox(0.3, 0.2, 0.3, 0.03).translate(LR + 0.3, -0.32, 0),
    ]);
    const xhG = merge([turned([[0, -0.38], [0.38, -0.38], [0.42, -0.34], [0.42, 0.34], [0.38, 0.38], [0, 0.38]], { seg: 28, q: QX }).body, cyl(0.1, 0.62, 14).rotateX(PI / 2)]);
    const linerT = turned([[0.5, 0], [0.5, 3.0], [0.66, 3.0], [0.66, 0.3], [0.86, 0.3], [0.9, 0.26], [0.9, 0.04], [0.86, 0]], { seg: 36, open: [0, 1, 0], q: QX });
    const lfT = turned([[0, 0], [1, 0], [1, 1], [0, 1]], { seg: 24, open: [0, 1, 0], q: QX });
    const lfG = merge([lfT.body, lfT.cap.translate(0, -0.004, 0)]);
    const FX1 = -7.1, LX1 = -4.1; // fluid end face / liner end
    const cyls = ZS.map((z, i) => {
      const o = {};
      o.conrod = add(group, conrodG, SM.steelDk());
      o.xh = add(group, xhG, SM.yellow());
      o.pony = add(group, cylBetween([0, 0, 0], [2.55, 0, 0], 0.13, 16), SM.chrome());
      o.rod = add(group, cylBetween([0, 0, 0], [2.73, 0, 0], 0.13, 16), SM.chrome());
      o.clamp = add(group, merge([cyl(0.24, 0.36, 20).rotateZ(PI / 2), cbox(0.1, 0.6, 0.14, 0.02)]), SM.steelDk());
      const lg = grp(group, FX1, AY, z); add(lg, linerT.body, SM.chrome()); add(lg, linerT.cap, cut);
      bolts(group, boltCircle([FX1 + 0.3, AY, z], [1, 0, 0], 0.76, 8, p => p.y < AY - 0.05, PI / 8), 0.045, 0.1, SM.bolt());
      o.rubM = mat(C.orange, 'paint', { metalness: 0, roughness: 0.6 });
      o.piston = pistonGroup(o.rubM); group.add(o.piston);
      o.fluid = add(group, lfG, fluid);
      anchors['piston' + i] = anchor(o.piston); anchors['crosshead' + i] = anchor(o.xh); anchors['liner' + i] = anchor(group, (FX1 + LX1) / 2, AY, z);
      return o;
    });
    // distance-piece (cradle) frame between fluid end and power end
    for (const z of [-ZW + 0.1, ZW - 0.1]) add(group, cbox(X0 - FX1, 0.3, 0.2, 0.04), blue, (X0 + FX1) / 2, 1.0, z);
    for (const z of [-ZW + 0.1, ZW - 0.1]) add(group, cbox(0.3, 1.3, 0.2, 0.04), blue, LX1 + 0.4, 1.6, z);
    add(group, cbox(X0 - LX1, 0.22, 2 * ZW, 0.04), blue, (X0 + LX1) / 2, 0.75, 0);
    for (const z of ZS) for (const x of [-6.2, -4.5]) add(group, merge([cbox(0.3, AY - 0.66 - 0.6, 0.5, 0.03).translate(0, (AY - 0.66 + 0.6) / 2, 0), cbox(0.4, 0.06, 0.6, 0.02).translate(0, 0.62, 0)]), SM.steelDk(), x, 0, z);
    // ---- fluid end (closed forged block) with cylinder-head covers, discharge covers, manifolds
    const FX0 = -8.7, FY0 = 1.0, FY1 = 4.0, FZ = 2.1;
    // three forged modules (one per cylinder) side by side on a common base
    for (const z of ZS) add(group, cbox(FX1 - FX0, FY1 - FY0, 1.36, 0.1), steel, (FX0 + FX1) / 2, (FY0 + FY1) / 2, z);
    add(group, cbox(FX1 - FX0 + 0.2, 0.3, 2 * FZ + 0.1, 0.05), SM.steelDk(), (FX0 + FX1) / 2, FY0 + 0.05, 0);
    for (const z of ZS) for (const y of [FY0 + 0.45, FY1 - 0.35]) for (const dz of [-0.45, 0.45])
      bolts(group, [{ p: [FX1, y, z + dz], n: [1, 0, 0] }], 0.06, 0.12, SM.bolt());
    for (const z of ZS) {
      // front cylinder-head cover (threaded retainer with lugs)
      addTurned(group, [[0, 0], [0.55, 0], [0.6, 0.05], [0.6, 0.25], [0.5, 0.3], [0, 0.3]], SM.steelDk(), null, { seg: 32, q: new THREE.Quaternion().setFromAxisAngle(V3(0, 0, 1), PI / 2) }, FX0, AY, z);
      for (let k = 0; k < 4; k++) add(group, cbox(0.1, 0.18, 0.3, 0.02).rotateX(k * PI / 4), SM.steelDk(), FX0 - 0.22, AY, z);
      // discharge valve cover on top
      addTurned(group, [[0, 0], [0.42, 0], [0.45, 0.04], [0.45, 0.22], [0.38, 0.28], [0, 0.28]], SM.steelDk(), null, { seg: 28 }, -7.9, FY1, z);
      for (let k = 0; k < 3; k++) add(group, cbox(0.32, 0.1, 0.1, 0.02).rotateY(k * PI / 3), SM.steelDk(), -7.9, FY1 + 0.33, z);
      // studs at the liner side of the block
    }
    const fe = anchors.fluidEnd = anchor(group, (FX0 + FX1) / 2, AY, 0);
    // suction manifold (charge-pump feed) under the block, along z
    const SY = 0.75;
    add(group, cyl(0.45, 5.2, 32).rotateX(PI / 2), steel, -7.9, SY, 0.2);
    for (const z of [-2.4, 2.8]) addTurned(group, [[0, -0.08], [0.62, -0.08], [0.66, -0.04], [0.66, 0.04], [0.62, 0.08], [0, 0.08]], SM.steelDk(), null, { seg: 32, q: QZ }, -7.9, SY, z);
    bolts(group, boltCircle([-7.9, SY, 2.88], [0, 0, 1], 0.54, 8), 0.04, 0.08, SM.bolt());
    for (const z of ZS) add(group, cyl(0.3, 0.4, 20), steel, -7.9, SY + 0.35, z);
    anchors.suctionInlet = anchor(group, -7.9, SY, 2.9);
    // discharge cross at the -z end + dampener (red ball) + pop-off + outlet
    add(group, cbox(1.0, 1.0, 0.9, 0.08), steel, -7.9, 3.35, -2.5);
    addTurned(group, [[0, 0], [0.5, 0], [0.54, 0.04], [0.54, 0.16], [0.5, 0.2], [0, 0.2]], SM.steelDk(), null, { seg: 32, q: QZ.clone().multiply(new THREE.Quaternion().setFromAxisAngle(V3(1, 0, 0), PI)) }, -7.9, 3.35, -2.95);
    add(group, cyl(0.28, 0.5, 24), SM.red(), -7.9, 4.05, -2.5);
    const damp = grp(group, -7.9, 4.95, -2.5);
    addTurned(damp, (() => { const o = [[0, -0.86], [0.3, -0.86, 0]]; for (let i = 0; i <= 20; i++) { const a = lerp(-1.18, 1.22, i / 20); o.push([Math.cos(a) * 0.8, Math.sin(a) * 0.8, i > 0 && i < 20 ? 1 : 0]); } o.push([0.32, 0.86], [0, 0.86]); return o; })(), SM.red(), null, { seg: 40 });
    addTurned(damp, [[0, 0.82], [0.42, 0.82], [0.46, 0.86], [0.46, 0.98], [0.42, 1.02], [0, 1.02]], SM.red(), null, { seg: 32 });
    bolts(damp, boltCircle([0, 1.02, 0], [0, 1, 0], 0.36, 8), 0.035, 0.08, SM.bolt());
    add(damp, merge([cyl(0.04, 0.22, 8).translate(0.15, 1.12, 0), cyl(0.06, 0.08, 6).translate(0.15, 1.24, 0)]), SM.brass());
    anchors.dampener = anchor(damp);
    add(group, cbox(0.3, 0.42, 0.3, 0.04), SM.red(), -7.25, 3.6, -2.5);
    add(group, cylBetween([-7.25, 3.8, -2.5], [-7.25, 4.3, -2.5], 0.06, 10), SM.steelDk());
    add(group, cylBetween([-7.9, 3.35, -2.95], [-7.9, 3.35, -3.5], 0.2, 20), steel);
    anchors.dischargeOut = anchor(group, -7.9, 3.35, -3.5);
    // ---- nameplate (namman.story)
    const npT = (() => {
      const c = canvas(1024, 320), x = c.getContext('2d');
      const g = x.createLinearGradient(0, 0, 1024, 320); g.addColorStop(0, '#d9dde3'); g.addColorStop(0.5, '#f4f6f8'); g.addColorStop(1, '#c4cad2');
      x.fillStyle = g; x.fillRect(0, 0, 1024, 320);
      for (let i = 0; i < 320; i += 3) { x.fillStyle = `rgba(0,0,0,${0.02 + 0.03 * hash(i, 5)})`; x.fillRect(0, i, 1024, 1); }
      x.strokeStyle = '#2b3442'; x.lineWidth = 10; x.strokeRect(16, 16, 992, 288);
      x.lineWidth = 3; x.strokeRect(34, 34, 956, 252);
      for (const [cx, cy] of [[60, 60], [964, 60], [60, 260], [964, 260]]) { x.fillStyle = '#8b939e'; x.beginPath(); x.arc(cx, cy, 13, 0, TAU); x.fill(); x.fillStyle = '#e6e9ed'; x.beginPath(); x.arc(cx - 3, cy - 3, 5, 0, TAU); x.fill(); }
      x.fillStyle = '#0f766e'; x.fillRect(90, 70, 12, 120);
      x.textBaseline = 'alphabetic'; x.fillStyle = '#1f2937';
      x.font = FONT(600, 92); x.fillText('namman.story', 124, 150);
      x.font = FONT(600, 48); x.fillStyle = '#0f766e'; x.fillText('TRIPLEX 1600', 124, 208);
      x.font = FONT(400, 30); x.fillStyle = '#374151'; x.fillText('1600 HP  ·  12 in STROKE  ·  SINGLE-ACTING', 124, 258);
      return tex(c);
    })();
    add(group, cbox(1.68, 0.56, 0.03, 0.01), SM.steelDk(), 0.2, 1.55, ZW + 0.015);
    const np = add(group, new THREE.PlaneGeometry(1.6, 0.5), mat(0xffffff, 'label', { map: npT, metalness: 0.55, roughness: 0.35 }), 0.2, 1.55, ZW + 0.032);
    anchors.nameplate = anchor(np);

    const tmp = V3();
    function update(t, p = {}) {
      const spm = p.spm ?? 100, th = p.theta ?? TAU * spm / 60 * t;
      crank.rotation.z = th;
      gear.rotation.z = 0; // rides with the crank group
      pinion.rotation.z = -th * (52 / 14) + 0.11;
      ZS.forEach((z, i) => {
        const o = cyls[i], ph = th + i * TAU / 3;
        const xcAt = a => CX + CR * Math.cos(a) - Math.sqrt(LR * LR - (CR * Math.sin(a)) ** 2);
        const pinx = CX + CR * Math.cos(ph), piny = AY + CR * Math.sin(ph);
        const xc = xcAt(ph), xp = xc - 5.5;
        const fwd = clamp((xcAt(ph - 0.05) - xcAt(ph + 0.05)) * 12) * (p.flash ?? 1);
        state.pistonX[i] = xp; state.forward[i] = fwd;
        o.conrod.position.set(xc, AY, z); o.conrod.rotation.z = Math.atan2(piny - AY, pinx - xc);
        o.xh.position.set(xc, AY, z);
        o.pony.position.set(xc - 2.95, AY, z);
        o.clamp.position.set(xp + 2.95, AY, z);
        o.rod.position.set(xp + 0.22, AY, z);
        o.piston.position.set(xp, AY, z);
        const face = xp - 0.225;
        o.fluid.position.set(FX1, AY, z); o.fluid.scale.set(face - FX1, 0.494, 0.494);
        o.rubM.emissive.setHex(C.teal).multiplyScalar(0.9 * fwd);
      });
    }
    update(0, {});
    return { group, update, anchors, state };
  }

  // =================================================================== 5. Charge pump (centrifugal)
  function chargePump() {
    const group = new THREE.Group(), anchors = {};
    const cas = SM.blue2(), cut = cutMat(9, 'blue');
    const ZB = -0.25, ZF = 0.25, WT = 0.05;
    // volute outline: spiral r(phi) from the cutwater, ending in a tangential outlet toward -x at the top
    const r0 = 0.46, r1 = 0.68, ph0 = 1.85;
    const outline = [];
    for (let i = 0; i <= 48; i++) { const a = ph0 + (i / 48) * (TAU - 0.25); const r = lerp(r0, r1, i / 48) + WT; outline.push([Math.cos(a) * r, Math.sin(a) * r]); }
    // outlet nozzle (rectangular throat to the flange) toward -x
    const yTop = outline[outline.length - 1][1];
    outline.push([-0.55, yTop], [-0.55, r0 - 0.02], [Math.cos(ph0) * (r0 + WT), r0 - 0.02]);
    const shape = pts => { const s = new THREE.Shape(); s.moveTo(...pts[0]); pts.slice(1).forEach(p => s.lineTo(...p)); s.closePath(); return s; };
    // inner cavity outline (spiral offset inward by the wall)
    const inner = [];
    for (let i = 0; i <= 48; i++) { const a = ph0 + (i / 48) * (TAU - 0.25); const r = lerp(r0, r1, i / 48); inner.push([Math.cos(a) * r, Math.sin(a) * r]); }
    inner.push([-0.56, inner[inner.length - 1][1]], [-0.56, r0 + 0.03], [Math.cos(ph0) * r0, r0 + 0.03]);
    // back plate (full outline)
    const bp = new THREE.ExtrudeGeometry(shape(outline), { depth: WT, bevelEnabled: true, bevelThickness: 0.015, bevelSize: 0.015, bevelSegments: 1 });
    bp.translate(0, 0, ZB - 0.015);
    add(group, bp, cas);
    // scroll wall: a C-shaped band (outer spiral -> nozzle roof -> inner spiral back to the cutwater) + nozzle floor
    const band = [];
    for (let i = 0; i <= 48; i++) band.push(outline[i]);
    band.push([-0.55, yTop], [-0.55, yTop - WT]);
    for (let i = 48; i >= 0; i--) band.push(inner[i]);
    const floorY = r0 - 0.02;
    const wg = new THREE.ExtrudeGeometry([shape(band), shape([[inner[0][0] + 0.02, floorY], [-0.55, floorY], [-0.55, floorY - WT], [inner[0][0] + 0.02, floorY - WT]])], { depth: ZF - ZB - 2 * WT, bevelEnabled: false });
    wg.translate(0, 0, ZB + WT);
    add(group, wg, [cut, mat(C.blue2, 'paint', { roughness: 0.5, metalness: 0.25, side: THREE.DoubleSide })]);
    // cavity floor (inside of the back plate) slightly darker so the impeller pops
    add(group, new THREE.ShapeGeometry(shape(inner.slice(0, 49))), mat(0x16307a, 'paint', { roughness: 0.6 }), 0, 0, ZB + WT + 0.002);
    // front cover: left part stays, right part is the removable (fading) piece; section strip on the cut
    const clip = (pts, keepLeft, xc) => { // Sutherland-Hodgman against x = xc
      const o = [], inside = p => (keepLeft ? p[0] <= xc : p[0] >= xc);
      for (let i = 0; i < pts.length; i++) {
        const a = pts[i], b = pts[(i + 1) % pts.length];
        const ia = inside(a), ib = inside(b);
        if (ia) o.push(a);
        if (ia !== ib) { const u = (xc - a[0]) / (b[0] - a[0]); o.push([xc, a[1] + (b[1] - a[1]) * u]); }
      }
      return o;
    };
    const XC = -0.08;
    const fcL = new THREE.ExtrudeGeometry(shape(clip(outline, true, XC)), { depth: WT, bevelEnabled: false }); fcL.translate(0, 0, ZF - WT);
    const fcR = new THREE.ExtrudeGeometry(shape(clip(outline, false, XC)), { depth: WT, bevelEnabled: false }); fcR.translate(0, 0, ZF - WT);
    add(group, fcL, cas);
    const fadeM = mat(C.blue2, 'paint', { transparent: true, opacity: 1, roughness: 0.45 });
    const cover = add(group, fcR, fadeM);
    // section strip on the cut edge of the kept cover (cream hatch reads as "cut")
    const yr = clip(outline, true, XC).filter(p => Math.abs(p[0] - XC) < 1e-6).map(p => p[1]);
    if (yr.length >= 2) add(group, box(0.012, Math.max(...yr) - Math.min(...yr), WT), cut, XC + 0.006, (Math.max(...yr) + Math.min(...yr)) / 2, ZF - WT / 2);
    // cover bolts along the rim (left part)
    const cb = [];
    for (let i = 0; i < 16; i++) { const k = Math.round((i / 16) * 47); const [x, y] = outline[k]; const r = Math.hypot(x, y), a = Math.atan2(y, x); const p = [Math.cos(a) * (r - 0.035), Math.sin(a) * (r - 0.035)]; if (p[0] < XC - 0.03) cb.push({ p: [p[0], p[1], ZF], n: [0, 0, 1] }); }
    bolts(group, cb, 0.018, 0.04, SM.bolt());
    // suction nozzle at the back (eye) + flange
    addTurned(group, [[0.2, -0.3], [0.25, -0.3], [0.25, 0], [0.2, 0]], cas, null, { seg: 32, q: QZ }, 0, 0, ZB);
    addTurned(group, [[0.2, -0.36], [0.34, -0.36], [0.36, -0.34], [0.36, -0.3], [0.34, -0.28], [0.2, -0.28]], cas, null, { seg: 32, q: QZ }, 0, 0, ZB);
    bolts(group, boltCircle([0, 0, ZB - 0.36], [0, 0, -1], 0.3, 8), 0.018, 0.04, SM.bolt());
    // outlet flange
    const OY = (yTop + r0 - 0.02) / 2;
    addTurned(group, [[0.0, 0], [0.2, 0], [0.22, 0.02], [0.22, 0.06], [0.2, 0.08], [0.0, 0.08]], cas, null, { seg: 32, q: new THREE.Quaternion().setFromAxisAngle(V3(0, 0, 1), PI / 2) }, -0.55, OY, 0);
    bolts(group, boltCircle([-0.63, OY, 0], [-1, 0, 0], 0.16, 6), 0.016, 0.035, SM.bolt());
    // impeller (open vanes on a small back hub disc) amber
    const imp = grp(group, 0, 0, 0.02);
    addTurned(imp, [[0, -0.09], [0.24, -0.09], [0.26, -0.07], [0.26, -0.05], [0.1, -0.04], [0.1, 0.1], [0.06, 0.13], [0, 0.13]], SM.amber(), null, { seg: 32, q: QZ });
    {
      const vg = [];
      for (let k = 0; k < 6; k++) {
        const s = new THREE.Shape(), n = 10, a0 = k * TAU / 6;
        const P = (u, off) => { const r = lerp(0.09, 0.4, u), a = a0 - 1.0 * u + off; return [Math.cos(a) * r, Math.sin(a) * r]; };
        for (let i = 0; i <= n; i++) { const [x, y] = P(i / n, 0); i ? s.lineTo(x, y) : s.moveTo(x, y); }
        for (let i = n; i >= 0; i--) { const [x, y] = P(i / n, 0.09 / lerp(0.09, 0.4, i / n) * 0.6); s.lineTo(x, y); }
        s.closePath();
        vg.push(new THREE.ExtrudeGeometry(s, { depth: 0.13, bevelEnabled: true, bevelThickness: 0.006, bevelSize: 0.006, bevelSegments: 1 }).translate(0, 0, -0.065));
      }
      add(imp, merge(vg), SM.amber());
      add(imp, cyl(0.05, 0.05, 6).rotateX(PI / 2).translate(0, 0, 0.16), SM.bolt());
    }
    anchors.impeller = anchor(imp);
    // motion-blur disc (faint) so a fast impeller still reads as spinning
    const blurM = basic(0xfbbf24, { transparent: true, opacity: 0.0, depthWrite: false, side: THREE.DoubleSide });
    const blur = add(imp, new THREE.RingGeometry(0.1, 0.4, 40), blurM, 0, 0, 0.06);
    // stuffing box / frame adapter, shaft, coupling + guard, motor
    addTurned(group, [[0.06, 0], [0.18, 0], [0.18, 0.08], [0.12, 0.12], [0.12, 0.2], [0.06, 0.2]], SM.steelDk(), null, { seg: 28, q: QZ }, 0, 0, ZF);
    add(group, cyl(0.04, 0.4, 16).rotateX(PI / 2).translate(0, 0, ZF + 0.25), SM.machined());
    const cpl = grp(group, 0, 0, 0.42);
    add(cpl, merge([cyl(0.1, 0.06, 20).rotateX(PI / 2).translate(0, 0, -0.02), cyl(0.1, 0.06, 20).rotateX(PI / 2).translate(0, 0, 0.04), cyl(0.08, 0.02, 6).rotateX(PI / 2).translate(0, 0, 0.01)]), SM.slate());
    add(group, merge([cbox(0.3, 0.02, 0.2, 0.005).translate(0, 0.14, 0), cbox(0.02, 0.28, 0.2, 0.005).translate(0.14, 0, 0), cbox(0.02, 0.28, 0.2, 0.005).translate(-0.14, 0, 0)]), SM.yellow(), 0, 0, 0.42);
    const mot = grp(group, 0, 0, 0.75); const mb = SM.blue();
    addTurned(mot, [[0, -0.28], [0.22, -0.28], [0.27, -0.24], [0.27, 0.24], [0.24, 0.3], [0, 0.3]], mb, null, { seg: 32, q: QZ });
    add(mot, merge([...Array(14)].map((_, k) => { const a = (k / 14) * TAU; return box(0.05, 0.03, 0.46).translate(0.285, 0, 0).rotateZ(a); })), mb);
    addTurned(mot, [[0, 0.3], [0.25, 0.3], [0.25, 0.42], [0.2, 0.46], [0, 0.46]], SM.slate(), null, { seg: 28, q: QZ }); // fan cowl
    add(mot, cbox(0.16, 0.12, 0.18, 0.02), mb, 0, 0.32, -0.02); // terminal box
    add(mot, merge([cbox(0.5, 0.06, 0.08, 0.01).translate(0, -0.28, -0.18), cbox(0.5, 0.06, 0.08, 0.01).translate(0, -0.28, 0.18)]), mb);
    anchors.motor = anchor(mot);
    // pedestal + base plate
    add(group, merge([cbox(0.34, 0.07, 0.3, 0.02), cbox(0.5, 0.03, 0.38, 0.01).translate(0, -0.035, 0)]), cas, 0, -0.6, -0.06);
    add(group, cbox(0.86, 0.07, 1.6, 0.02), SM.slate(), 0, -0.7 + 0.035, 0.45);
    anchors.casing = anchor(group); anchors.eye = anchor(group, 0, 0, ZB - 0.03); anchors.outlet = anchor(group, -0.55, OY, 0);
    anchors.suctionFlange = anchor(group, 0, 0, ZB - 0.36);
    let omega = 14, tNow = 0;
    function spiral(u, t = tNow) {
      const a = 1.95 - 1.5 * PI * (1 - u) + 0 * t, r = 0.48 * Math.sqrt(clamp(u));
      return V3(Math.cos(a) * r, Math.sin(a) * r, 0.05);
    }
    function update(t, p = {}) {
      omega = p.omega ?? 14; tNow = t;
      imp.rotation.z = omega * t;
      cpl.rotation.z = omega * t;
      const op = clamp(p.open ?? 1);
      cover.visible = op < 0.999; fadeM.opacity = 1 - op; fadeM.depthWrite = op < 0.5;
      blurM.opacity = 0.12 * clamp(omega / 14) * (p.blur ?? 1);
    }
    update(0, {});
    return { group, update, anchors, spiral };
  }

  // half-shell + full fading shell of a turned profile (for "open on camera" units)
  function openable(parent, profile, m, capM, o = {}) {
    const g = grp(parent);
    const h = turned(profile, { seg: o.seg || 40, open: o.open || [0, 0, 1], q: o.q });
    g.half = add(g, h.body, m); g.cap = add(g, h.cap, capM);
    const fm = mat(m.color.getHex(), m.userData.kind || 'paint', { metalness: m.metalness, roughness: m.roughness, transparent: true, depthWrite: false });
    const f = turned(profile.map(p => [p[0] + 0.004, p[1], p[2]]), { seg: o.seg || 40, q: o.q });
    g.full = add(g, f.body, fm); g.fullM = fm;
    g.setOpen = u => { u = clamp(u); g.full.visible = u < 0.999; fm.opacity = 1 - u; fm.depthWrite = u < 0.3; };
    return g;
  }

  // =================================================================== 6. Vacuum degasser
  function degasser() {
    const group = new THREE.Group(), anchors = {}, paths = {};
    const paint = mat(0x0f9488, 'paint', { metalness: 0.2, roughness: 0.45 }), cutT = cutMat(9, 'teal');
    // grating deck + legs
    const gr = (() => { const c = canvas(128, 128), x = c.getContext('2d'); x.fillStyle = '#2c3646'; x.fillRect(0, 0, 128, 128); x.fillStyle = '#6b7a90';
      for (let i = 0; i < 128; i += 16) { x.fillRect(i, 0, 5, 128); } for (let j = 0; j < 128; j += 32) x.fillRect(0, j, 128, 3); const t = tex(c, true); t.repeat.set(4, 5); return t; })();
    add(group, cbox(1.3, 0.08, 1.6, 0.015), mat(0xffffff, 'dark', { map: gr, metalness: 0.5, roughness: 0.55 }), 0, 0.05, 0);
    for (const a of [0.25, 1.25, 2.25, 3.25].map(k => k * PI / 2)) { const x = Math.cos(a) * 0.5, z = Math.sin(a) * 0.5;
      add(group, merge([cylBetween([x * 1.3, 0.09, z * 1.3], [x * 1.06, 0.62, z * 1.06], 0.03, 10), cbox(0.13, 0.02, 0.13, 0.005).translate(x * 1.3, 0.1, z * 1.3), cylBetween([x * 1.06, 0.5, z * 1.06], [x * 1.06, 0.78, z * 1.06], 0.045, 10)]), SM.steelDk()); }
    // vessel profile (r,h): bottom outlet, cone, shell, elliptical head, top nozzle
    const R = 0.5, Tk = 0.03, Y0 = 0.2, Y1 = 2.1;
    const prof = [[0.075, 0.12], [0.105, 0.12], [0.105, 0.22], [R, 0.42], [R, Y1]];
    for (let i = 1; i <= 10; i++) { const a = (i / 10) * (PI / 2 - 0.2); prof.push([R * Math.cos(a), Y1 + 0.32 * Math.sin(a), i < 10 ? 1 : 0]); }
    prof.push([0.1, Y1 + 0.42], [0.1, Y1 + 0.52], [0.07, Y1 + 0.52]);
    const ri = R - Tk;
    for (let i = 10; i >= 1; i--) { const a = (i / 10) * (PI / 2 - 0.2); prof.push([Math.max(0.07, ri * Math.cos(a)), Y1 + 0.29 * Math.sin(a), i < 10 && i > 1 ? 1 : 0]); }
    prof.push([ri, Y1], [ri, 0.43], [0.075, 0.24]);
    const shell = openable(group, prof, paint, cutT, { seg: 48 });
    shell.cap.material = cutT;
    // girth flange (half) + manway hint
    addTurned(group, [[R, 1.18], [R + 0.05, 1.18], [R + 0.05, 1.24], [R, 1.24]], paint, cutT, { seg: 48, open: [0, 0, 1] });
    addTurned(group, [[ri - 0.001, 0.43], [ri, 0.43], [ri, Y1], [ri - 0.001, Y1]], SM.cavity(), null, { seg: 40, open: [0, 0, 1] }).body.material = mat(0x0b4f4a, 'dark', { side: THREE.DoubleSide, roughness: 0.6 });
    // baffles: D-shaped plates (cut at z = 0), tilted 20 deg, alternating
    const tilt = 0.3, PW = 0.66;
    const plate = (() => {
      const s = new THREE.Shape(), rr = ri - 0.01, xg = -rr + PW;
      const pts = [];
      for (let i = 0; i <= 16; i++) { const a = PI + (i / 16) * (PI / 2); const x = Math.cos(a) * rr, z = Math.sin(a) * rr; pts.push([x, z]); }
      const zx = -Math.sqrt(Math.max(0, rr * rr - xg * xg));
      const fil = pts.filter(p => p[0] <= xg); fil.push([xg, zx], [xg, 0]);
      fil.forEach((p, i) => (i ? s.lineTo(p[0], p[1]) : s.moveTo(p[0], p[1]))); s.lineTo(-rr, 0); s.closePath();
      return s;
    })();
    const plateG = new THREE.ExtrudeGeometry(plate, { depth: 0.025, bevelEnabled: false }); plateG.rotateX(PI / 2); // shape (x,z) -> plane xz
    const filmT = stripeTex('#c79a6a', '#e9c59b', 10, 0.35); filmT.repeat.set(1, 1);
    const filmM = mat(0xffffff, 'paint', { map: filmT, transparent: true, opacity: 0.92, roughness: 0.3, metalness: 0, side: THREE.DoubleSide, envScale: 0.5 });
    const filmG = new THREE.ShapeGeometry(plate); filmG.rotateX(PI / 2);
    { // uv along the slope: u = x
      const p = filmG.attributes.position, uv = filmG.attributes.uv;
      for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) * 2.2, p.getZ(i) * 2.2);
    }
    const curtG = new THREE.PlaneGeometry(0.02, 1, 1, 1);
    const baffles = [];
    const YS = [1.5, 1.2, 0.9, 0.6];
    YS.forEach((y, k) => {
      const s = k % 2 ? -1 : 1, b = grp(group, 0, y, 0);
      b.rotation.z = -s * tilt; b.scale.x = s; // s=+1: high at -x, flows toward +x
      add(b, plateG, mat(0x9aa7b8, 'steel', { metalness: 0.6, roughness: 0.45, side: THREE.DoubleSide }), 0, -0.0125, 0);
      add(b, filmG, filmM, 0, 0.017, 0);
      baffles.push(b); anchors['baffle' + k] = anchor(b, -0.1, 0.03, -0.2);
    });
    // falling curtains at the low edges (thin sheets, half depth)
    const curtT = stripeTex('#b88a5c', '#e6c294', 8, 0.4); curtT.wrapT = THREE.RepeatWrapping; curtT.rotation = PI / 2;
    const curtM = mat(0xffffff, 'paint', { map: curtT, transparent: true, opacity: 0.7, roughness: 0.35, side: THREE.DoubleSide });
    const curtains = YS.map((y, k) => {
      const s = k % 2 ? -1 : 1, xg = -(ri - 0.01) + PW;
      const xe = s * (xg * Math.cos(tilt)) + 0.0, ye = y - Math.sin(tilt) * (xg + 0.0) * 1;
      const yb = k < 3 ? YS[k + 1] + Math.sin(tilt) * xg * 0.9 : 0.35;
      const g = new THREE.PlaneGeometry(0.035, Math.max(0.05, ye - yb), 1, 1); g.rotateY(PI / 2);
      const m = add(group, g, curtM, xe + s * 0.02, (ye + yb) / 2, -0.2); m.scale.z = 1;
      const g2 = new THREE.PlaneGeometry(0.4, Math.max(0.05, ye - yb)); g2.rotateY(PI / 2); m.geometry = g2;
      return m;
    });
    // mud pool in the bottom cone (half section)
    const pool = turned([[0, 0.24], [0.08, 0.24], [ri - 0.02, 0.43], [ri - 0.02, 0.46], [0, 0.46]], { seg: 32, open: [0, 0, 1] });
    add(group, merge([pool.body, pool.cap.translate(0, 0, -0.003)]), fluidMat(0xb98a5c, { opacity: 0.85, glow: 0.08 }));
    // inlet (side, near the top), outlet (bottom) with eductor, vacuum line, vacuum pump, vent
    const pipeM = mat(0x8f9aab, 'steel', { metalness: 0.7, roughness: 0.4 });
    const inl = fillet([[-0.55, -0.8, 0.0], [-0.72, -0.8, 0.0], [-0.72, 1.88, 0.0], [-R + 0.02, 1.88, 0.0]], 0.15, 6);
    add(group, pipeRun(inl.map(arr), 0.1, 14), pipeM);
    addTurned(group, [[0.1, -0.06], [0.16, -0.06], [0.16, 0.06], [0.1, 0.06]], pipeM, null, { seg: 24, q: QX }, -R - 0.08, 1.88, 0);
    anchors.inlet = anchor(group, -R, 1.88, 0); anchors.tankIn = anchor(group, -0.55, -0.8, 0);
    const outl = fillet([[0, 0.12, 0], [0, -0.06, 0], [1.45, -0.06, 0], [1.45, -0.25, 0]], 0.12, 6);
    add(group, pipeRun(outl.map(arr), 0.08, 12), pipeM);
    addTurned(group, [[0.08, -0.22], [0.1, -0.22], [0.16, -0.08], [0.16, 0.0], [0.1, 0.16], [0.08, 0.16]], SM.steelDk(), null, { seg: 24, q: QX }, 0.75, -0.06, 0);
    add(group, pipeRun([[0.75, -0.06, -0.15], [0.75, -0.06, -0.75], [0.75, -0.6, -0.75]], 0.06, 10), pipeM); // eductor motive line
    anchors.outlet = anchor(group, 0, 0.12, 0); anchors.tankOut = anchor(group, 1.45, -0.25, 0);
    const vac = fillet([[0, Y1 + 0.52, 0], [0, Y1 + 0.7, 0], [0, Y1 + 0.7, -0.78]], 0.1, 6);
    add(group, pipeRun(vac.map(arr), 0.07, 12), pipeM);
    const vp = grp(group, 0, 2.6, -0.95);
    add(vp, cbox(0.45, 0.35, 0.35, 0.03), mat(0x1f4fbf, 'paint', { metalness: 0.2, roughness: 0.5 }));
    add(vp, cyl(0.13, 0.36, 18).rotateZ(PI / 2).translate(0, 0, 0), SM.slate(), 0.0, 0.0, 0.0).position.set(-0.36, 0, 0);
    add(vp, cbox(0.6, 0.04, 0.42, 0.01), SM.steelDk(), -0.1, -0.2, 0);
    add(group, pipeRun([[0, 2.25, -0.55], [0, 2.4, -0.82]], 0.03, 6), SM.steelDk());
    add(group, pipeRun([[0.15, 2.78, -0.95], [0.15, 4.6, -0.95], [0.3, 4.75, -0.95], [0.42, 4.68, -0.95]], 0.06, 10), pipeM);
    anchors.vacuumPump = anchor(vp); anchors.vent = anchor(group, 0.42, 4.68, -0.95); anchors.dome = anchor(group, 0, Y1 + 0.3, 0);
    // small vacuum gauge on the head
    const gg = grp(group, 0.28, Y1 + 0.32, -0.12);
    add(gg, cyl(0.02, 0.12, 6).translate(0, 0.06, 0), SM.brass()); add(gg, cyl(0.07, 0.035, 20).rotateX(PI / 2).translate(0, 0.16, 0), SM.brass());
    add(gg, new THREE.CircleGeometry(0.06, 20), SM.white(), 0, 0.16, 0.019);
    // bubbles (gas breaking out of the film) + gas leaving through the vacuum line
    const NB = 20, NG = 10;
    const bubM = mat(0xffffff, 'white', { metalness: 0, roughness: 0.05, transparent: true, opacity: 0.5, emissive: new THREE.Color(0xbfe9ff).multiplyScalar(0.2), envScale: 1.5 });
    const bub = particles(group, new THREE.SphereGeometry(1, 14, 10), bubM, NB + NG);
    const gasP = Poly(vac.map(v => V3(v.x, v.y, v.z)).concat([V3(0, Y1 + 0.7, -0.78), V3(0.15, 2.78, -0.95), V3(0.15, 4.6, -0.95)]));
    // cascade path for the drop (local)
    paths.cascade = [[-R, 1.88, 0], [-0.35, 1.62, -0.05]];
    YS.forEach((y, k) => { const s = k % 2 ? -1 : 1; paths.cascade.push([-s * 0.3, y + Math.sin(tilt) * 0.3 + 0.03, -0.05], [s * 0.18, y - Math.sin(tilt) * 0.18 + 0.03, -0.05]); });
    paths.cascade.push([-0.05, 0.4, -0.05], [0, 0.15, 0]);
    function update(t, p = {}) {
      shell.setOpen(p.open ?? 1);
      const flow = p.flow ?? 1;
      filmT.offset.x = -t * 0.9 * flow; curtT.offset.x = -t * 1.4 * flow;
      if (p.mud != null) { filmM.color.setHex(p.mud); curtM.color.setHex(p.mud); }
      const rate = p.vacuum ?? 1;
      for (let i = 0; i < NB; i++) {
        const P = 2.2 + 1.2 * hash(i, 1), u = fract(t * rate / P + hash(i, 2));
        const k = i % 4, s = k % 2 ? -1 : 1, y = YS[k], lx = lerp(-0.3, 0.2, hash(i, 3));
        const z0 = -lerp(0.08, 0.38, hash(i, 4));
        const x0 = s * lx * Math.cos(tilt), y0 = y - Math.sin(tilt) * lx * 1 + 0.04;
        let x, yy, z, r;
        if (u < 0.25) { const v = u / 0.25; x = x0; yy = y0 + 0.02 * v; z = z0; r = lerp(0.02, 0.05, v); }
        else if (u < 0.85) { const v = sstep(0.25, 0.85, u); x = lerp(x0, 0.03 * Math.sin(i), v) + 0.04 * Math.sin(t * 3 + i); yy = lerp(y0 + 0.02, Y1 + 0.3, v); z = lerp(z0, -0.04, v); r = lerp(0.05, 0.12, v); }
        else { const v = (u - 0.85) / 0.15; x = 0; yy = Y1 + 0.3 + 0.22 * v; z = -0.02; r = lerp(0.12, 0.03, v); }
        // keep bubbles between plates (they pop through the gap side)
        bub.set(i, x, yy, z, r * 0.45);
      }
      for (let i = 0; i < NG; i++) {
        const sPos = fract(t * 0.5 * rate + i / NG) * gasP.L; gasP.at(sPos, _v);
        bub.set(NB + i, _v.x, _v.y, _v.z, 0.028);
      }
      bub.done();
    }
    update(0, {});
    return { group, update, anchors, paths };
  }

  // =================================================================== 7. Hydrocyclones (desander / desilter)
  function hydrocyclones(o = {}) {
    const kind = o.kind || 'desander', big = kind === 'desander';
    const group = new THREE.Group(), anchors = {};
    const n = big ? 2 : 6, R = big ? 0.32 : 0.14, HH = big ? 0.35 : 0.2, TOP = big ? 2.6 : 1.95, CL = big ? 1.4 : 0.8, AR = big ? 0.06 : 0.032, Tk = big ? 0.035 : 0.016, FL = big ? 0.03 : 0.01;
    const ZS = big ? [-0.5, 0.5] : [...Array(6)].map((_, i) => -0.9 + i * 0.36);
    const headM = SM.tealPaint(), coneM = mat(C.cone, 'paint', { metalness: 0.1, roughness: 0.45 }), cutT = cutMat(big ? 7 : 12, 'teal'), cutS = cutMat(big ? 7 : 12);
    const pipeM = mat(0x8f9aab, 'steel', { metalness: 0.7, roughness: 0.4 });
    const frameM = mat(0xd9a521, 'paint', { roughness: 0.55, metalness: 0.15 });
    const yJ = TOP - HH, yA = yJ - CL, vfR = R * 0.34, vfT = Tk * 0.8, vfL = HH * 0.75;
    const coneProf = [[AR, yA], [AR + Tk, yA], [R + Tk, yJ], [R, yJ]];
    const headProf = [[R, yJ], [R + Tk, yJ], [R + Tk + FL * 0.7, yJ - 0.02], [R + Tk + FL, yJ], [R + Tk + FL, yJ + 0.05], [R + Tk, yJ + 0.06], [R + Tk, TOP], [R + Tk + FL * 0.7, TOP + 0.02],
      [vfR + vfT, TOP + 0.05], [vfR + vfT, TOP + 0.16], [vfR, TOP + 0.16], [vfR, TOP - vfL], [vfR + vfT, TOP - vfL], [vfR + vfT, TOP - Tk], [R, TOP - Tk]];
    const zFront = ZS[ZS.length - 1];
    let front = null;
    ZS.forEach((z, i) => {
      const g = grp(group, 0, 0, z);
      if (i === n - 1) {
        front = g;
        g.cone = openable(g, coneProf, coneM, cutS, { seg: 36 });
        g.head = openable(g, headProf, headM, cutT, { seg: 36 });
        // dark inner surface of the open cone for contrast
        const inner = turned([[AR + 0.001, yA], [R - 0.001 + 0.0, yJ], [R - 0.002, yJ], [AR, yA]], { seg: 32, open: [0, 0, 1] });
        add(g, inner.body, mat(0x5b6678, 'dark', { side: THREE.DoubleSide, roughness: 0.6 }));
        // swirling mud inside (translucent cone volume, half)
        const mv = turned([[0, yA + 0.02], [AR, yA + 0.02], [R - 0.01, yJ], [R - 0.01, TOP - Tk - 0.005], [vfR + vfT + 0.005, TOP - Tk - 0.005], [vfR + vfT + 0.005, TOP - vfL], [0, TOP - vfL]], { seg: 32, open: [0, 0, 1] });
        add(g, merge([mv.body, mv.cap.translate(0, 0, -0.003)]), fluidMat(0xc9a27a, { opacity: 0.28, glow: 0.06, depthWrite: false }));
      } else {
        addTurned(g, coneProf, coneM, null, { seg: 32 });
        addTurned(g, headProf, headM, null, { seg: 32 });
      }
      // apex valve (rubber) + tangential feed stub + overflow gooseneck
      addTurned(g, [[AR, yA - 0.06], [AR + Tk + 0.015, yA - 0.06], [AR + Tk + 0.015, yA + 0.02], [AR, yA + 0.02]], SM.rubber(), cutRubber(), i === n - 1 ? { seg: 24, open: [0, 0, 1] } : { seg: 24 });
      const fr = R * 0.36;
      add(g, cylBetween([-0.55, TOP - HH * 0.5, -R + fr + Tk], [0.0, TOP - HH * 0.5, -R + fr + Tk], fr, 14), pipeM);
      add(g, pipeRun([[0, TOP + 0.16, 0], [0, TOP + 0.3, 0], [0.25, TOP + 0.3, 0]], (vfR + vfT) * 0.9, 14), pipeM);
      // head clamp bolts (V-clamp hint)
      add(g, new THREE.TorusGeometry(R + Tk + FL, big ? 0.018 : 0.01, 6, 36).rotateX(PI / 2).translate(0, yJ + 0.02, 0), SM.steelDk());
    });
    // feed manifold along z, overflow header along z, legs, frame, underflow trough
    const z0 = ZS[0] - 0.35, z1 = ZS[n - 1] + 0.3;
    add(group, cylBetween([-0.55, TOP - HH * 0.5, z0], [-0.55, TOP - HH * 0.5, z1], big ? 0.14 : 0.1, 18), pipeM);
    addTurned(group, [[0, -0.04], [big ? 0.2 : 0.15, -0.04], [big ? 0.2 : 0.15, 0.04], [0, 0.04]], SM.steelDk(), null, { seg: 20, q: QZ }, -0.55, TOP - HH * 0.5, z1);
    add(group, pipeRun([[-0.55, TOP - HH * 0.5, z0], [-0.55, -0.3, z0]], big ? 0.14 : 0.1, 14), pipeM); // feed riser from the centrifugal feed pump
    const hy = TOP + 0.3, hr = big ? 0.12 : 0.08;
    add(group, cylBetween([0.25, hy, z0], [0.25, hy, z1], hr, 18), pipeM);
    const ovEnd = big ? [[0.25, hy, z0], [0.25, hy, z0 - 0.0], [1.9, hy, z0], [1.9, 0.25, z0 + 0.0]] : [[0.25, hy, z1], [2.2, hy, z1], [2.2, -0.2, z1]];
    add(group, pipeRun(ovEnd, hr, 14), pipeM);
    anchors.overflowOut = anchor(group, ...ovEnd[ovEnd.length - 1]);
    // frame + legs
    const legs = [];
    const fx0 = -0.75, fx1 = 0.85, fz0 = z0 - 0.05, fz1 = z1 + 0.25;
    for (const x of [fx0, fx1]) for (const z of [fz0, fz1]) legs.push(cylBetween([x, 0, z], [x, TOP - HH - 0.05, z], big ? 0.03 : 0.022, 8));
    legs.push(cylBetween([fx0, TOP - HH - 0.05, fz0], [fx0, TOP - HH - 0.05, fz1], 0.025, 8), cylBetween([fx1, TOP - HH - 0.05, fz0], [fx1, TOP - HH - 0.05, fz1], 0.025, 8));
    for (const z of [fz0, fz1]) legs.push(cylBetween([fx0, TOP - HH - 0.05, z], [fx1, TOP - HH - 0.05, z], 0.025, 8));
    // cross bearers under the cone heads
    legs.push(cylBetween([fx0, TOP - HH - 0.05, 0], [fx1, TOP - HH - 0.05, 0], 0.02, 6));
    add(group, merge(legs), frameM);
    // underflow trough (U channel) sloping to the back
    const ty = yA - 0.25, tl = z1 - z0 + 0.6;
    const tr = grp(group, 0, ty, (z0 + z1) / 2 - 0.25); tr.rotation.x = -0.12;
    add(tr, merge([cbox(0.45, 0.03, tl, 0.01), cbox(0.03, 0.14, tl, 0.01).translate(-0.22, 0.07, 0), cbox(0.03, 0.14, tl, 0.01).translate(0.22, 0.07, 0)]), SM.steelDk());
    anchors.trough = anchor(tr, 0, 0.05, 0);
    anchors.head = anchor(front, 0, TOP - HH / 2, 0); anchors.feed = anchor(front, -0.3, TOP - HH * 0.5, -R + fr0(R, Tk));
    anchors.apex = anchor(front, 0, yA - 0.06, 0); anchors.overflow = anchor(front, 0, TOP + 0.16, 0); anchors.cone = anchor(front, 0, (yA + yJ) / 2, 0);
    function fr0(R_, T_) { return R_ * 0.36 + T_; }
    // animated streamlines: dashed helix down the wall (brown) and up the core (teal)
    const dashT = (col) => { const c = canvas(256, 8), x = c.getContext('2d'); x.clearRect(0, 0, 256, 8); const g = x.createLinearGradient(0, 0, 256, 0);
      g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.15, 'rgba(0,0,0,0)'); g.addColorStop(0.8, col); g.addColorStop(0.86, col); g.addColorStop(0.9, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(0, 0, 256, 8);
      const t = tex(c, true); return t; };
    const turns0 = big ? 3 : 4.5;
    class HelixC extends THREE.Curve {
      constructor(down) { super(); this.down = down; }
      getPoint(u, o = V3()) {
        if (this.down) { const y = lerp(TOP - HH * 0.55, yA + 0.04, u), r = (y >= yJ ? R : lerp(AR, R, (y - yA) / CL)) * 0.88, a = u * turns0 * TAU; return o.set(Math.cos(a) * r, y, Math.sin(a) * r); }
        const y = lerp(yA + CL * 0.2, TOP + 0.1, u), rw = (y >= yJ ? R : lerp(AR, R, (y - yA) / CL)), r = y < TOP - vfL ? rw * 0.26 : vfR * 0.55, a = -u * turns0 * 0.8 * TAU;
        return o.set(Math.cos(a) * r, y, Math.sin(a) * r);
      }
    }
    const tDn = dashT('rgba(150,105,60,0.95)'), tUp = dashT('rgba(94,234,212,0.95)');
    tDn.repeat.set(turns0 * 2, 1); tUp.repeat.set(turns0 * 1.5, 1);
    const sDn = add(front, new THREE.TubeGeometry(new HelixC(true), Math.round(turns0 * 48), big ? 0.009 : 0.005, 5, false), basic(0xffffff, { map: tDn, transparent: true, depthWrite: false }));
    const sUp = add(front, new THREE.TubeGeometry(new HelixC(false), Math.round(turns0 * 40), big ? 0.009 : 0.005, 5, false), basic(0xffffff, { map: tUp, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    // vortex particles in the open cone: brown down the wall, teal up the core, brown apex spray
    const ND = 40, NU = 30, NS = 18;
    const pM = mat(0xffffff, 'paint', { metalness: 0, roughness: 0.7 });
    const pg = new THREE.IcosahedronGeometry(1, 0);
    const P = particles(front, pg, pM, ND + NU + NS);
    const cB = new THREE.Color(0x8a6a4a), cB2 = new THREE.Color(0x6b4f35), cT = new THREE.Color(C.teal), cT2 = new THREE.Color(0x5eead4);
    for (let i = 0; i < ND + NU + NS; i++) P.color(i, i < ND ? (hash(i, 7) > 0.5 ? cB : cB2) : i < ND + NU ? (hash(i, 7) > 0.5 ? cT : cT2) : cB2);
    const turns = big ? 3 : 4.5;
    const rWall = y => (y >= yJ ? R : lerp(AR, R, (y - yA) / CL));
    function vortex(u, t, down = true, ph = 0, spin = 1) {
      if (down) { const y = lerp(TOP - HH * 0.55, yA + 0.03, u), r = rWall(y) * 0.86, a = ph + u * turns * TAU + t * 0 ; return V3(Math.cos(a) * r, y, Math.sin(a) * r); }
      const y = lerp(yA + CL * 0.25, TOP + 0.12, u), r = (y < TOP - vfL ? rWall(y) * 0.28 : vfR * 0.6), a = ph - u * turns * 0.8 * TAU;
      return V3(Math.cos(a) * r, y, Math.sin(a) * r);
    }
    const ps = (big ? 0.016 : 0.009);
    function update(t, p = {}) {
      const op = p.open ?? 1; front.cone.setOpen(op); front.head.setOpen(op);
      const spin = (p.spin ?? 1) * (big ? 1 : 1.6), flow = p.flow ?? 1;
      for (let i = 0; i < ND; i++) {
        const u = fract(hash(i, 1) + t * 0.32 * spin * flow), v = vortex(u, t, true, (i % 3) * TAU / 3 + 0.25 * hash(i, 2));
        P.set(i, v.x, v.y, v.z, ps * (0.8 + 0.6 * hash(i, 3)) * Math.min(1, u * 8, (1 - u) * 12));
      }
      for (let i = 0; i < NU; i++) {
        const u = fract(hash(i, 4) + t * 0.42 * spin * flow), v = vortex(u, t, false, (i % 2) * PI + 0.2 * hash(i, 5));
        P.set(ND + i, v.x, v.y, v.z, ps * 0.85 * Math.min(1, u * 6, (1 - u) * 10));
      }
      for (let i = 0; i < NS; i++) {
        const u = fract(hash(i, 8) + t * 1.3 * flow), a = hash(i, 9) * TAU, spread = (big ? 0.3 : 0.16) * Math.sqrt(u);
        const y = yA - 0.06 - u * (yA - 0.06 - ty - 0.04) - 0.0, sc = ps * 0.9 * (1 - u * 0.3);
        P.set(ND + NU + i, Math.cos(a) * spread, Math.max(ty + 0.04, y), Math.sin(a) * spread, sc);
      }
      P.done();
      tDn.offset.x = -t * 0.32 * spin * flow * turns0 * 2; tUp.offset.x = -t * 0.42 * spin * flow * turns0 * 1.5;
      sDn.visible = sUp.visible = op > 0.05; sDn.material.opacity = sUp.material.opacity = op;
    }
    update(0, {});
    return { group, update, anchors, vortex: (u, t, down = true) => vortex(u, t, down, 0).add(V3(0, 0, zFront)) };
  }

  // =================================================================== 8. Decanting centrifuge
  function centrifuge() {
    const group = new THREE.Group(), anchors = {};
    const housM = mat(0xcbd5e1, 'white', { metalness: 0.15, roughness: 0.4 }), cut = cutMat(8);
    const XL = -1.3, XR = 1.3, HH = 0.45, WD = 0.45, T = 0.04;
    // stand
    const st = [];
    for (const x of [-1.1, 1.1]) for (const z of [-0.5, 0.5]) st.push(cbox(0.1, 1.15, 0.1, 0.02).translate(x, -1.6 + 0.575, z));
    st.push(cbox(2.4, 0.1, 0.1, 0.02).translate(0, -0.5, -0.5), cbox(2.4, 0.1, 0.1, 0.02).translate(0, -0.5, 0.5), cbox(0.1, 0.1, 1.1, 0.02).translate(-1.1, -0.5, 0), cbox(0.1, 0.1, 1.1, 0.02).translate(1.1, -0.5, 0));
    st.push(cbox(2.4, 0.08, 0.08, 0.02).translate(0, -1.25, -0.5), cbox(2.4, 0.08, 0.08, 0.02).translate(0, -1.25, 0.5));
    for (const x of [-1.1, 1.1]) for (const z of [-0.5, 0.5]) st.push(cbox(0.24, 0.03, 0.24, 0.01).translate(x, -1.585, z));
    add(group, merge(st), SM.slate());
    // housing: cut half (back) with section strips + a full fading box over it
    const shp = (w, h) => { const s = new THREE.Shape(); s.moveTo(-w / 2, -h / 2); s.lineTo(w / 2, -h / 2); s.lineTo(w / 2, h / 2); s.lineTo(-w / 2, h / 2); s.closePath(); return s; };
    const slab = (w, h, x, y) => { const g = new THREE.ExtrudeGeometry(shp(w, h), { depth: WD, bevelEnabled: false }); g.translate(x, y, -WD); return g; };
    add(group, merge([slab(XR - XL, T, 0, HH - T / 2), slab(XR - XL, T, 0, -HH + T / 2), slab(T, 2 * HH, XL + T / 2, 0), slab(T, 2 * HH, XR - T / 2, 0)]), [cut, housM]);
    add(group, cbox(XR - XL, 2 * HH, T, 0.01), housM, 0, 0, -WD + T / 2);
    add(group, merge([cbox(XR - XL + 0.06, 0.05, 0.04, 0.01).translate(0, HH - 0.02, -WD), cbox(XR - XL + 0.06, 0.05, 0.04, 0.01).translate(0, -HH + 0.02, -WD)]), SM.steelDk());
    const fullM = mat(0xcbd5e1, 'white', { metalness: 0.15, roughness: 0.4, transparent: true, opacity: 1 });
    const full = add(group, cbox(XR - XL + 0.01, 2 * HH + 0.01, 2 * WD + 0.01, 0.05), fullM);
    // housing interior dark
    add(group, new THREE.PlaneGeometry(XR - XL - 2 * T, 2 * HH - 2 * T), mat(0x3a4656, 'dark', { roughness: 0.7 }), 0, 0, -WD + T + 0.002);
    // bowl (half-shell, rotating stripes) : cone beach at -x, cylinder to +x, end plates
    const bR = 0.38, bT = 0.03, xb0 = -1.25, xc0 = -0.65, xb1 = 0.95, rb = 0.2;
    const bowlT = stripeTex('#5b6b80', '#9fb0c4', 4, 0.12); bowlT.repeat.set(1, 1);
    const bowlM = mat(0xffffff, 'steel', { map: bowlT, metalness: 0.7, roughness: 0.35, side: THREE.DoubleSide });
    const bowlProf = [[rb - bT, xb0], [rb, xb0], [bR, xc0], [bR, xb1], [0.16, xb1], [0.16, xb1 + 0.05], [bR - bT, xb1 + 0.05].slice(0, 2), [bR - bT, xb1 - bT].slice(0, 2), [bR - bT, xc0 + 0.01], [rb - bT, xb0 + 0.0]];
    const bp = [[0.09, xb0 - 0.06], [rb, xb0 - 0.06], [rb, xb0], [rb - bT, xb0], [bR - bT, xc0 + 0.01], [bR - bT, xb1 - bT], [0.09, xb1 - bT], [0.09, xb1 + 0.06], [bR + 0.02, xb1 + 0.06], [bR + 0.02, xb1], [bR, xb1], [bR, xc0], [rb + bT * 0.2, xb0 - 0.06]];
    const bowl = turned([[0.09, xb0 - 0.05], [rb + 0.005, xb0 - 0.05], [bR, xc0], [bR, xb1], [bR + 0.03, xb1], [bR + 0.03, xb1 + 0.06], [0.09, xb1 + 0.06], [0.09, xb1 - 0.0], [bR - bT, xb1 - 0.0], [bR - bT, xc0 + 0.02], [rb - bT, xb0 + 0.01], [0.09, xb0 + 0.01]], { seg: 48, open: [0, 0, 1], q: QX });
    add(group, bowl.body, bowlM); add(group, bowl.cap, cut);
    // trunnion shafts + main bearings
    add(group, cyl(0.07, XR - xb1 + 0.5, 16).rotateZ(PI / 2).translate((xb1 + XR + 0.5) / 2, 0, 0), SM.machined());
    add(group, cyl(0.07, xb0 - XL + 0.35, 16).rotateZ(PI / 2).translate((xb0 + XL - 0.35) / 2, 0, 0), SM.machined());
    for (const x of [XL - 0.12, XR + 0.12]) add(group, merge([cbox(0.2, 0.3, 0.3, 0.03).translate(0, -0.06, 0), cbox(0.24, 0.32, 0.36, 0.02).translate(0, -0.32, 0)]), SM.steelDk(), x, 0, 0);
    // conveyor scroll (whole, amber): hub + helicoid flights following the bowl wall
    const scroll = grp(group);
    add(scroll, cyl(0.11, xb1 - xb0 - 0.1, 24).rotateZ(PI / 2).translate((xb0 + xb1) / 2, 0, 0), SM.amber());
    {
      const S = Soup(), pitch = 0.25, NN = Math.round((xb1 - 0.08 - xb0 - 0.06) / pitch * 28);
      const rin = 0.11, rout = x => (x < xc0 ? lerp(rb - bT - 0.03, bR - bT - 0.03, (x - xb0) / (xc0 - xb0)) : bR - bT - 0.03);
      const pt = (x, r) => { const a = TAU * x / pitch; return V3(x, Math.cos(a) * r, Math.sin(a) * r); };
      for (let i = 0; i < NN; i++) {
        const xa = xb0 + 0.06 + (i / NN) * (xb1 - 0.08 - xb0 - 0.06), xbb = xb0 + 0.06 + ((i + 1) / NN) * (xb1 - 0.08 - xb0 - 0.06);
        const A = pt(xa, rin), B = pt(xbb, rin), Cc = pt(xbb, rout(xbb)), D = pt(xa, rout(xa));
        const nrm = (x, r) => { const a = TAU * x / pitch, k = TAU / pitch; const tr = V3(0, Math.cos(a), Math.sin(a)), tx = V3(1, -r * k * Math.sin(a), r * k * Math.cos(a)); return V3().crossVectors(tx, tr).normalize(); };
        const nA = nrm(xa, rin), nB = nrm(xbb, rin), nC = nrm(xbb, rout(xbb)), nD = nrm(xa, rout(xa));
        S.quad(A, B, Cc, D, nA, nB, nC, nD, [0, 0], [1, 0], [1, 1], [0, 1], nA);
      }
      const fl = S.geo();
      add(scroll, fl, mat(C.amber, 'paint', { metalness: 0.3, roughness: 0.45, side: THREE.DoubleSide }));
      // hard-facing tile edge (thin tube along the flight tip)
      class Tip extends THREE.Curve { getPoint(u, o = V3()) { const x = xb0 + 0.06 + u * (xb1 - 0.08 - xb0 - 0.06); return o.copy(pt(x, rout(x))); } }
      add(scroll, new THREE.TubeGeometry(new Tip(), NN, 0.014, 5, false), SM.steelDk());
    }
    // feed tube (static) from the -x end to the bowl middle, with feed ports
    add(group, cylBetween([XL - 0.9, 0.12, 0], [XL - 0.35, 0.0, 0], 0.06, 14), mat(0x8f9aab, 'steel'));
    add(group, cylBetween([XL - 0.35, 0, 0], [0.05, 0, 0], 0.055, 14), mat(0x8f9aab, 'steel', { metalness: 0.7, roughness: 0.4 }));
    anchors.feed = anchor(group, XL - 0.9, 0.12, 0);
    // liquid pond on the bowl wall (half, translucent) + solids cake ring at the beach
    const pondR = 0.25;
    const pond = turned([[pondR, -0.92], [bR - bT - 0.003, -0.53], [bR - bT - 0.003, xb1 - 0.003], [pondR, xb1 - 0.003]], { seg: 40, open: [0, 0, 1], q: QX });
    const pondM = fluidMat(0x7bb7a0, { opacity: 0.55, glow: 0.12, side: THREE.DoubleSide });
    add(group, merge([pond.body, pond.cap.translate(0, 0, -0.003)]), pondM);
    // solids cake on the wall: thick at the beach, thinning toward the pond
    const cake = turned([[rb - bT - 0.002, xb0 + 0.02], [rb - bT - 0.05, xb0 + 0.04], [bR - bT - 0.045, xc0], [bR - bT - 0.02, 0.2], [bR - bT - 0.002, 0.3], [bR - bT - 0.002, xc0 + 0.0]].map(p => [p[0], p[1]]).concat([[rb - bT - 0.001, xb0 + 0.03]]).slice(0, 6), { seg: 40, open: [0, 0, 1], q: QX });
    add(group, merge([cake.body, cake.cap.translate(0, 0, -0.002)]), mat(0x6b4f35, 'paint', { roughness: 0.95, side: THREE.DoubleSide }));
    // motor + belt guard + gearbox at +x
    const mot = grp(group, XR - 0.1, -0.1, -0.9);
    addTurned(mot, [[0, -0.3], [0.2, -0.3], [0.24, -0.26], [0.24, 0.26], [0.2, 0.3], [0, 0.3]], SM.blue(), null, { seg: 28, q: QX });
    add(mot, merge([...Array(12)].map((_, k) => box(0.5, 0.025, 0.04).translate(0, 0.25, 0).rotateX((k / 12) * TAU))), SM.blue());
    add(mot, cbox(0.62, 0.06, 0.36, 0.01), SM.slate(), 0, -0.27, 0);
    add(group, merge([cbox(0.14, 0.5, 1.15, 0.04).translate(0, 0, 0), cyl(0.25, 0.14, 24).rotateZ(PI / 2).translate(0, 0.0, 0.5), cyl(0.25, 0.14, 24).rotateZ(PI / 2).translate(0, -0.1, -0.5)]), mat(0xf59e0b, 'paint', { roughness: 0.5 }), XR + 0.35, -0.05, -0.45);
    add(group, cyl(0.2, 0.3, 24).rotateZ(PI / 2).translate(XR + 0.62, 0, 0), SM.steelDk());
    anchors.motor = anchor(mot);
    // solids discharge: hopper under the beach end, chute down and back to a bin
    add(group, merge([cbox(0.55, 0.04, 0.6, 0.01).translate(0, 0, 0)]), housM, XL + 0.25, -HH - 0.02, 0);
    const ch = grp(group, XL + 0.25, -HH - 0.1, 0);
    const chuteDir = V3(0.1, -3.5, -2.6); const chL = chuteDir.length();
    ch.quaternion.setFromUnitVectors(V3(0, 0, -1), chuteDir.clone().normalize());
    add(ch, merge([cbox(0.4, 0.03, chL, 0.01).translate(0, -0.1, -chL / 2), cbox(0.03, 0.18, chL, 0.01).translate(-0.2, -0.02, -chL / 2), cbox(0.03, 0.18, chL, 0.01).translate(0.2, -0.02, -chL / 2)]), SM.steelDk());
    const bin = grp(group, XL + 0.35, -4.1 + 0.3, -2.75);
    add(bin, merge([cbox(1.0, 0.06, 0.8, 0.02).translate(0, -0.27, 0), cbox(1.0, 0.6, 0.06, 0.02).translate(0, 0, 0.37), cbox(1.0, 0.6, 0.06, 0.02).translate(0, 0, -0.37), cbox(0.06, 0.6, 0.8, 0.02).translate(0.47, 0, 0), cbox(0.06, 0.6, 0.8, 0.02).translate(-0.47, 0, 0)]), mat(0x3f6212, 'paint', { roughness: 0.6 }));
    add(bin, cbox(0.88, 0.2, 0.68, 0.05), mat(0x6b4f35, 'paint', { roughness: 0.95, flatShading: true }), 0, -0.15, 0);
    anchors.bin = anchor(bin, 0, 0.1, 0); anchors.chuteEnd = anchor(group, XL + 0.25 + chuteDir.x, -HH - 0.1 + chuteDir.y, chuteDir.z);
    // liquid outlet (+x end) down into the tank
    add(group, pipeRun([[xb1 + 0.12, -HH, 0], [xb1 + 0.12, -1.8, 0]], 0.09, 14), mat(0x8f9aab, 'steel', { metalness: 0.7, roughness: 0.4 }));
    anchors.liquidOut = anchor(group, xb1 + 0.12, -1.8, 0); anchors.solidsOut = anchor(group, XL + 0.25, -HH - 0.1, 0);
    anchors.bowlMid = anchor(group, 0.1, 0, 0); anchors.beach = anchor(group, -0.95, 0, 0);
    // particles: solids crawling on the wall toward the beach, discharge fall, clean liquid stream
    const NSo = 46, NF = 16, NL = 16;
    const pM = mat(0xffffff, 'paint', { metalness: 0, roughness: 0.75 });
    const P = particles(group, new THREE.IcosahedronGeometry(1, 0), pM, NSo + NF + NL);
    const cB = new THREE.Color(0x8a6a4a), cB2 = new THREE.Color(0x6b4f35), cT = new THREE.Color(C.teal);
    for (let i = 0; i < NSo + NF + NL; i++) P.color(i, i < NSo + NF ? (hash(i, 3) > 0.5 ? cB : cB2) : cT);
    const rWall = x => (x < xc0 ? lerp(rb - bT, bR - bT, (x - xb0) / (xc0 - xb0)) : bR - bT) - 0.025;
    function update(t, p = {}) {
      const op = clamp(p.open ?? 1); full.visible = op < 0.999; fullM.opacity = 1 - op; fullM.depthWrite = op < 0.3;
      const wb = p.bowl ?? 7, ws = wb * (p.diff ?? 0.93);
      const ab = wb * t, as = ws * t;
      bowlT.offset.x = -ab / PI; scroll.rotation.x = as;
      // solids conveyed axially: one pitch per relative turn
      const vax = (wb - ws) / TAU * 0.25 * 1.0 * (p.solids ?? 1);
      for (let i = 0; i < NSo; i++) {
        const L = xb1 - 0.1 - (xb0 + 0.02), s = fract(hash(i, 1) - t * vax * 1.8 / L - 0.0);
        const x = xb0 + 0.02 + s * L, a = hash(i, 2) * TAU + ab, r = rWall(x) - 0.01 * hash(i, 4);
        const z = Math.sin(a) * r, y = Math.cos(a) * r;
        if (z > 0.02) { P.hide(i); continue; }
        P.set(i, x, y, z, 0.024 * (0.7 + 0.6 * hash(i, 5)) * Math.min(1, s * 10));
      }
      for (let i = 0; i < NF; i++) { // fall into the chute
        const u = fract(hash(i, 6) + t * 0.9 * (p.solids ?? 1));
        P.set(NSo + i, XL + 0.25 + (hash(i, 7) - 0.5) * 0.3 + chuteDir.x * u, -HH - 0.08 + chuteDir.y * u, chuteDir.z * u + (hash(i, 8) - 0.5) * 0.2, 0.03 * (0.7 + 0.6 * hash(i, 9)));
      }
      for (let i = 0; i < NL; i++) {
        const u = fract(hash(i, 10) + t * 1.4 * (p.feed ?? 1));
        P.set(NSo + NF + i, xb1 + 0.12 + (hash(i, 11) - 0.5) * 0.06, -1.82 - u * 0.9, (hash(i, 12) - 0.5) * 0.06, 0.03 * (1 - u * 0.4));
      }
      P.done();
    }
    update(0, {});
    return { group, update, anchors };
  }

  // =================================================================== 9. Gooseneck + washpipe cutaway (WASH)
  function washpipe() {
    const group = new THREE.Group(), anchors = {}, paths = {};
    const steel = mat(C.cone, 'steel', { metalness: 0.75, roughness: 0.38 }), house = mat(0x64748b, 'steel', { metalness: 0.65, roughness: 0.45 });
    const cav = SM.cavity(), cut = cutMat(2.4, 'grey'), cutRot = cutMat(2.4, 'teal'), cutW = cutMat(2.4, 'white'), chrome = mat(0xe2e8f0, 'steel', { metalness: 1, roughness: 0.1, envScale: 1.2 });
    const fluid = fluidMat(C.teal, { opacity: 0.55, glow: 0.22 });
    // gooseneck (static): smooth half-pipe through the spec points, then straight down into the housing
    const gc = new THREE.CatmullRomCurve3([[3.2, 7.6], [3.0, 9.0], [1.6, 9.8], [0.3, 9.2], [0, 8.2], [0, 8.0]].map(p => V3(p[0], p[1], 0)), false, 'centripetal');
    const gPts = gc.getPoints(48);
    addSweep(group, gPts, 0.35, 0.25, steel, cav, cut, { seg: 22 });
    const gf = sweep(gPts, 0.245, 0, { seg: 18 }); add(group, merge([gf.outer, gf.cut.translate(0, 0, -0.004)]), fluid);
    // hammer union at the hose end + hose stub (black, half)
    addTurned(group, [[0.25, -0.05], [0.48, -0.05], [0.48, 0.25], [0.25, 0.25]], steel, cut, { seg: 28, open: [0, 0, 1], q: qAlong([0.2, -1.4, 0].map(x => -x)) }, 3.2, 7.6, 0);
    const hosePts = new THREE.CatmullRomCurve3([V3(3.2, 7.62, 0), V3(3.3, 6.9, 0), V3(3.8, 6.0, 0), V3(4.6, 5.4, 0), V3(5.4, 5.05, 0)]).getPoints(30);
    addSweep(group, hosePts, 0.4, 0.27, mat(0x16191e, 'rubber', { roughness: 0.65, metalness: 0 }), mat(0x2a2f37, 'rubber'), cutRubber(), { seg: 20 });
    const hf = sweep(hosePts, 0.265, 0, { seg: 16 }); add(group, merge([hf.outer, hf.cut.translate(0, 0, -0.004)]), fluid);
    // static housing (half) + gooseneck flange + bolts
    addTurned(group, [[0.35, 6.9], [0.86, 6.9], [0.9, 6.94], [0.9, 7.96], [0.86, 8.0], [0.35, 8.0]], house, cut, { seg: 48, open: [0, 0, 1] });
    addTurned(group, [[0.35, 8.0], [0.62, 8.0], [0.62, 8.14], [0.35, 8.14]], steel, cut, { seg: 40, open: [0, 0, 1] });
    bolts(group, boltCircle([0, 8.0, 0], [0, 1, 0], 0.74, 12, p => p.z < -0.1, PI / 12), 0.05, 0.1, SM.bolt());
    add(group, halfCyl(0, 6.9, 8.0, 0.35), cav);
    // upper gland nut (static) with hammer lugs
    addTurned(group, [[0.21, 6.5], [0.58, 6.5], [0.62, 6.54], [0.62, 6.86], [0.58, 6.9], [0.21, 6.9]], steel, cut, { seg: 40, open: [0, 0, 1] });
    for (const a of [PI * 1.15, PI * 1.5, PI * 1.85]) add(group, cbox(0.16, 0.2, 0.14, 0.03), steel, Math.cos(a) * 0.68, 6.7, Math.sin(a) * 0.68);
    // washpipe (static, polished)
    addTurned(group, [[0.15, 5.0], [0.21, 5.0], [0.21, 7.6], [0.15, 7.6]], chrome, cutW, { seg: 40, open: [0, 0, 1] });
    // rotating packing box with V packing stack + lower gland nut (rotating), stripes scroll to show spin
    const rotT = stripeTex('#7b8798', '#a7b3c3', 6, 0.12, '#14b8a6'); const rotM = mat(0xffffff, 'steel', { map: rotT, metalness: 0.65, roughness: 0.4 });
    const shT = stripeTex('#94a3b8', '#f8fafc', 1, 0.08, '#14b8a6'); const shM = mat(0xffffff, 'steel', { map: shT, metalness: 0.6, roughness: 0.38 });
    addTurned(group, [[0.36, 5.1], [0.66, 5.1], [0.7, 5.14], [0.7, 6.31], [0.66, 6.35], [0.36, 6.35]], rotM, cutRot, { seg: 48, open: [0, 0, 1] });
    addTurned(group, [[0.21, 5.12], [0.36, 5.12], [0.36, 5.24], [0.21, 5.24]], SM.steelDk(), cut, { seg: 36, open: [0, 0, 1] }); // male adapter
    addTurned(group, [[0.21, 6.16], [0.36, 6.16], [0.36, 6.3], [0.21, 6.3]], SM.steelDk(), cut, { seg: 36, open: [0, 0, 1] }); // female adapter
    const packM = mat(C.orange, 'rubber', { metalness: 0, roughness: 0.55 });
    const rings = [];
    for (let k = 0; k < 5; k++) { // chevron (V) section rings
      const y0 = 5.3 + k * 0.17;
      const m = k === 2 ? mat(C.orange, 'rubber', { metalness: 0, roughness: 0.55 }) : packM;
      const g = addTurned(group, [[0.21, y0], [0.285, y0 + 0.06], [0.36, y0], [0.36, y0 + 0.1], [0.285, y0 + 0.16], [0.21, y0 + 0.1]], m, m, { seg: 40, open: [0, 0, 1] });
      rings.push(g);
    }
    addTurned(group, [[0.3, 4.8], [0.62, 4.8], [0.66, 4.84], [0.66, 5.06], [0.62, 5.1], [0.3, 5.1]], rotM, cutRot, { seg: 48, open: [0, 0, 1] });
    // main shaft (rotating), bore, flange/thread shoulder
    addTurned(group, [[0.15, 0], [0.375, 0], [0.375, 4.5], [0.42, 4.55], [0.42, 4.8], [0.3, 4.8], [0.3, 5.0], [0.15, 5.0]], shM, cutRot, { seg: 48, open: [0, 0, 1] });
    add(group, halfCyl(0, 0, 5.0, 0.15), cav);
    // bore fluid (washpipe + shaft) half volume
    const bf = turned([[0, 0], [0.148, 0], [0.148, 8.0], [0, 8.0]], { seg: 24, open: [0, 0, 1] });
    add(group, merge([bf.body, bf.cap.translate(0, 0, -0.004)]), fluid);
    // ghost top-drive body (back half only, very faint)
    const ghostM = basic(0xdc2626, { transparent: true, opacity: 0.15, depthWrite: false });
    const ghost = add(group, box(3, 4, 1.2), ghostM, 0, 2.6, -0.62);
    // tracers along the flow path (spiral in the rotating shaft)
    paths.flow = [[5.4, 5.0, 0], ...hosePts.slice().reverse().map(arr), ...gPts.map(arr), [0, 7.6, 0], [0, 5.0, 0], [0, 0, 0]];
    const fl = Poly(paths.flow.map(p => V3(...p)));
    const NT = 46, trM = mat(0xffffff, 'paint', { metalness: 0, roughness: 0.5, emissive: new THREE.Color(0x2dd4bf).multiplyScalar(0.25) });
    const tr = particles(group, new THREE.IcosahedronGeometry(1, 0), trM, NT);
    const c1 = new THREE.Color(0x99f6e4), c2 = new THREE.Color(0x0f766e);
    for (let i = 0; i < NT; i++) tr.color(i, hash(i, 3) > 0.5 ? c1 : c2);
    anchors.hoseEnd = anchor(group, 3.2, 7.6, 0); anchors.gooseneckTop = anchor(group, 1.6, 9.8, 0); anchors.gooseneckMid = anchor(group, 3.0, 9.0, 0);
    anchors.washpipeTop = anchor(group, 0, 7.6, 0); anchors.packing = anchor(group, 0.5, 5.7, 0); anchors.shaftTop = anchor(group, 0, 4.8, 0);
    anchors.shaftBottom = anchor(group, 0, 0, 0); anchors.housing = anchor(group, 0.9, 7.4, 0);
    function update(t, p = {}) {
      const w = p.omega ?? 1.6, ang = w * t;
      rotT.offset.x = -ang / PI; shT.offset.x = -ang / PI;
      const gl = clamp(p.glow ?? 0), wr = clamp(p.wear ?? 0);
      packM.emissive.setHex(C.orange).multiplyScalar(0.12 + 0.5 * gl);
      rings[2].body.material.emissive.setHex(wr > 0 ? C.amber : C.orange).multiplyScalar(0.12 + 0.5 * gl + 0.9 * wr);
      ghost.visible = (p.ghost ?? 0.15) > 0.001; ghostM.opacity = p.ghost ?? 0.15;
      const v = 1.6 * (p.flow ?? 1);
      for (let i = 0; i < NT; i++) {
        const s = fract(hash(i, 1) + t * v / fl.L) * fl.L; fl.at(s, _v);
        let x = _v.x, y = _v.y, z = 0.02;
        const jr = (hash(i, 2) - 0.5);
        if (Math.abs(_v.x) < 0.01 && y < 7.6) { // in the bores: spread radially, spiral in the shaft
          const rr = (y < 5.0 ? 0.12 : 0.1) * jr * 2, a = y < 5.0 ? ang * 0.3 + hash(i, 4) * TAU : 0;
          x = rr * Math.cos(a); z = 0.02;
        } else { x += jr * 0.3 * (Math.abs(_v.y - 9.5) < 0.6 ? 0 : 1) * 0.5; y += jr * 0.25 * (Math.abs(_v.y - 9.5) < 0.6 ? 1 : 0.4); }
        tr.set(i, x, y, z, 0.05 * Math.min(1, s * 2, (fl.L - s) * 2));
      }
      tr.done();
    }
    function halfCyl(x, y0, y1, r) { return turned([[r, y0], [r, y1], [r - 0.001, y1], [r - 0.001, y0]], { seg: 24, open: [0, 0, 1] }).body.translate(x, 0, 0); }
    update(0, {});
    return { group, update, anchors, paths, split: 6.35 };
  }

  // =================================================================== 10. Standpipe manifold + SPP gauge
  function standpipeManifold() {
    const group = new THREE.Group(), anchors = {};
    const steel = mat(0x9aa4b2, 'steel', { metalness: 0.7, roughness: 0.4 }), red = SM.red(), dk = SM.steelDk();
    const PR = 0.17;
    // header pipe and centre forged tee
    add(group, cylBetween([-1.2, 0, 0], [1.2, 0, 0], PR, 18), steel);
    add(group, cbox(0.46, 0.46, 0.46, 0.05), steel, 0, 0, 0);
    // hammer unions at both ends (wing nuts)
    for (const x of [-1.1, 1.1]) {
      addTurned(group, [[PR, -0.09], [0.27, -0.09], [0.29, -0.07], [0.29, 0.07], [0.27, 0.09], [PR, 0.09]], dk, null, { seg: 24, q: QX }, x, 0, 0);
      for (let k = 0; k < 3; k++) add(group, cbox(0.1, 0.12, 0.16, 0.02).translate(0, 0.33, 0).rotateX(k * TAU / 3 + 0.3), dk, x, 0, 0);
    }
    // gate valve: flanged body + bonnet + stem + handwheel
    function gate(x, y, z, axis) {
      const g = grp(group, x, y, z);
      add(g, cbox(0.38, 0.44, 0.34, 0.05), steel);
      const q = axis === 'x' ? QX : QZ;
      for (const s of [-1, 1]) addTurned(g, [[PR * 0.6, 0], [0.3, 0], [0.32, 0.02], [0.32, 0.08], [0.3, 0.1], [PR * 0.6, 0.1]], steel, null, { seg: 28, q: s > 0 ? q : q.clone().multiply(new THREE.Quaternion().setFromAxisAngle(V3(1, 0, 0), PI)) }, axis === 'x' ? s * 0.19 : 0, 0, axis === 'z' ? s * 0.17 : 0);
      add(g, merge([cyl(0.15, 0.32, 20).translate(0, 0.38, 0), cyl(0.2, 0.06, 20).translate(0, 0.24, 0), cyl(0.12, 0.06, 6).translate(0, 0.56, 0)]), steel);
      add(g, cyl(0.03, 0.28, 10).translate(0, 0.7, 0), SM.machined());
      const w = grp(g, 0, 0.84, 0);
      add(w, new THREE.TorusGeometry(0.28, 0.035, 10, 36).rotateX(PI / 2), red);
      add(w, merge([0, 1, 2, 3].map(k => cbox(0.27, 0.035, 0.035, 0.01).translate(0.135, 0, 0).rotateY(k * PI / 2))), red);
      add(w, cyl(0.06, 0.08, 12), red);
      add(w, cyl(0.025, 0.12, 8).translate(0.28, 0.06, 0), SM.rubber());
      g.wheel = w;
      return g;
    }
    const vA = gate(-0.55, 0, 0, 'x');
    // branch to -z with valve B (closed) and a blind flange
    add(group, cylBetween([0.45, 0, 0], [0.45, 0, -0.95], PR, 18), steel);
    add(group, cbox(0.4, 0.4, 0.4, 0.04), steel, 0.45, 0, 0);
    const vB = gate(0.45, 0, -0.5, 'z');
    addTurned(group, [[0, 0], [0.3, 0], [0.32, 0.02], [0.32, 0.1], [0.3, 0.12], [0, 0.12]], dk, null, { seg: 28, q: QZ.clone().multiply(new THREE.Quaternion().setFromAxisAngle(V3(1, 0, 0), PI)) }, 0.45, 0, -0.9);
    bolts(group, boltCircle([0.45, 0, -1.02], [0, 0, -1], 0.24, 8), 0.025, 0.05, SM.bolt());
    // red "closed" tag on valve B
    const tg = grp(vB.wheel, 0.22, -0.12, 0.08);
    add(tg, cbox(0.16, 0.22, 0.012, 0.004), mat(0xef4444, 'paint', { roughness: 0.6 }), 0, -0.12, 0);
    add(tg, cylBetween([0, 0.05, 0], [0, -0.02, 0], 0.006, 4), SM.steelDk());
    // gauge riser with isolator, then the SPP gauge (brass bezel, white dial, needle)
    add(group, cylBetween([0, 0.23, 0], [0, 0.5, 0.1], 0.04, 10), steel);
    add(group, merge([cyl(0.09, 0.16, 18).translate(0, 0, 0), cyl(0.06, 0.08, 6).translate(0, 0.12, 0)]), dk, 0, 0.55, 0.1);
    const gauge = grp(group, 0, 0.85, 0.1); gauge.rotation.y = 0.6;
    add(group, cylBetween([0, 0.6, 0.1], [0, 0.66, 0.1], 0.035, 10), steel);
    add(gauge, cylBetween([0, -0.3, -0.02], [0, -0.2, -0.02], 0.035, 8), SM.brass());
    addTurned(gauge, [[0, -0.06], [0.28, -0.06], [0.3, -0.04], [0.3, 0.03], [0.27, 0.05], [0.25, 0.03], [0, 0.03]], SM.brass(), null, { seg: 40, q: QZ });
    const dial = (() => {
      const c = canvas(512, 512), x = c.getContext('2d');
      x.fillStyle = '#f8fafc'; x.beginPath(); x.arc(256, 256, 250, 0, TAU); x.fill();
      x.translate(256, 256);
      const A0 = -0.75 * PI - PI / 2, A1 = 0.75 * PI - PI / 2; // canvas angles (0 = +x, clockwise)
      x.lineWidth = 22; x.strokeStyle = '#ef4444'; x.beginPath(); x.arc(0, 0, 200, lerp(A0, A1, 0.82) + 0, A1); x.stroke();
      x.lineWidth = 22; x.strokeStyle = '#14b8a6'; x.beginPath(); x.arc(0, 0, 200, lerp(A0, A1, 0.45), lerp(A0, A1, 0.7)); x.stroke();
      for (let i = 0; i <= 50; i++) { const a = lerp(A0, A1, i / 50), big = i % 5 === 0; x.strokeStyle = '#1f2937'; x.lineWidth = big ? 7 : 3; x.beginPath(); x.moveTo(Math.cos(a) * (big ? 170 : 186), Math.sin(a) * (big ? 170 : 186)); x.lineTo(Math.cos(a) * 214, Math.sin(a) * 214); x.stroke(); }
      x.fillStyle = '#1f2937'; x.textAlign = 'center'; x.font = FONT(600, 54); x.fillText('SPP', 0, 110);
      x.font = FONT(400, 30); x.fillStyle = '#475569'; x.fillText('psi', 0, 152);
      x.font = FONT(600, 26); x.fillStyle = '#0f766e'; x.fillText('namman.story', 0, -80);
      return tex(c);
    })();
    add(gauge, new THREE.CircleGeometry(0.255, 40), mat(0xffffff, 'label', { map: dial, roughness: 0.4 }), 0, 0, 0.031);
    const needle = grp(gauge, 0, 0, 0.045);
    add(needle, merge([cbox(0.022, 0.24, 0.01, 0.004).translate(0, 0.09, 0), cbox(0.03, 0.06, 0.01, 0.004).translate(0, -0.03, 0)]), basic(0x111827));
    add(gauge, cyl(0.025, 0.03, 12).rotateX(PI / 2).translate(0, 0, 0.055), basic(0x111827));
    add(gauge, new THREE.CircleGeometry(0.27, 40), mat(0xffffff, 'white', { transparent: true, opacity: 0.12, roughness: 0.02, metalness: 0, envScale: 2, depthWrite: false }), 0, 0, 0.065);
    // floor stands
    for (const x of [-0.85, 0.85]) add(group, merge([cbox(0.08, 0.42, 0.08, 0.02).translate(0, -0.38, 0), cbox(0.28, 0.03, 0.28, 0.01).translate(0, -0.56, 0), cbox(0.3, 0.04, 0.06, 0.01).translate(0, -0.2, 0)]), SM.slate(), x, 0, 0);
    anchors.inlet = anchor(group, 1.2, 0, 0); anchors.outlet = anchor(group, -1.2, 0, 0); anchors.valveA = anchor(vA, 0, 0.84, 0); anchors.valveB = anchor(vB, 0, 0.84, 0);
    anchors.gauge = anchor(gauge); anchors.needle = anchor(needle, 0, 0.18, 0); anchors.blind = anchor(group, 0.45, 0, -1.02);
    function update(t, p = {}) {
      const v = clamp(p.spp ?? 0) + (p.flicker ?? 0) * 0.008 * Math.sin(t * 37) ;
      needle.rotation.z = lerp(0.75 * PI, -0.75 * PI, v);
      vA.wheel.rotation.y = -(p.wheelA ?? 0) * PI / 2;
    }
    update(0, {});
    return { group, update, anchors };
  }

  // =================================================================== 11. Flow paddle (flowline flow sensor)
  function flowPaddle(o = {}) {
    const group = new THREE.Group(), anchors = {}, inner = grp(group);
    const PR = 0.24, PRi = 0.2, WL = 0.8;
    const pipeM = mat(0x9ca3af, 'steel', { metalness: 0.65, roughness: 0.42 }), cut = cutMat(10), cav = mat(0x3c4655, 'dark', { side: THREE.DoubleSide, roughness: 0.6 });
    addSweep(inner, [V3(-WL, 0, 0), V3(WL, 0, 0)], PR, PRi, pipeM, cav, cut, { seg: 28 });
    for (const s of [-1, 1]) {
      add(inner, cylBetween([s * WL, 0, 0], [s * 1.7, 0, 0], PR, 24), pipeM);
      addTurned(inner, [[PR, -0.05], [0.33, -0.05], [0.35, -0.03], [0.35, 0.03], [0.33, 0.05], [PR, 0.05]], SM.steelDk(), cut, { seg: 32, open: [0, 0, 1], q: QX }, s * WL, 0, 0);
      bolts(inner, boltCircle([s * (WL + 0.05), 0, 0], [s, 0, 0], 0.29, 8, p => p.z < 0.25), 0.02, 0.045, SM.bolt());
    }
    // saddle + sensor box on top (static), pivot shaft along z
    add(inner, cbox(0.5, 0.06, 0.34, 0.015), SM.steelDk(), 0, PR + 0.02, -0.02);
    const sb = add(inner, cbox(0.4, 0.3, 0.3, 0.03), mat(0xf59e0b, 'paint', { roughness: 0.5 }), 0, PR + 0.2, -0.05);
    add(inner, cbox(0.3, 0.02, 0.2, 0.01), SM.steelDk(), 0, PR + 0.36, -0.05);
    add(inner, merge([cyl(0.05, 0.12, 10).translate(0, 0, 0), cyl(0.035, 0.12, 8).rotateZ(PI / 2).translate(0.09, 0.03, 0)]), SM.rubber(), 0.16, PR + 0.4, -0.05); // cable gland
    // paddle (hinged inside the pipe) + external arm with counterweight (same angle)
    const PIV = PRi - 0.03;
    const paddle = grp(inner, 0, PIV, 0);
    add(paddle, merge([cbox(0.05, 0.35, 0.25, 0.012).translate(0, -0.2, 0), cyl(0.025, 0.3, 10).rotateX(PI / 2)]), mat(0xe5e7eb, 'steel', { metalness: 0.8, roughness: 0.3 }));
    const arm = grp(inner, 0, PR + 0.2, -0.22);
    add(arm, merge([cbox(0.04, 0.5, 0.03, 0.01).translate(0, -0.25 + 0.0, 0).rotateZ(PI), cyl(0.04, 0.05, 12).rotateX(PI / 2)]), SM.steelDk());
    add(arm, cyl(0.07, 0.09, 16).rotateX(PI / 2).translate(0, 0.5, 0), SM.slate());
    // mud stream (partially full, by gravity): section face + rippled top surface + cuttings
        const ripT = stripeTex('#b07a4a', '#d6a874', 7, 0.3); ripT.repeat.set(1, 1);
    const topM = mat(0xffffff, 'paint', { map: ripT, metalness: 0, roughness: 0.3, side: THREE.DoubleSide, envScale: 0.6 });
    const topG = new THREE.PlaneGeometry(2 * WL, 1); topG.rotateX(-PI / 2); topG.translate(0, 0, -0.5);
    { const uv = topG.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 3.2, uv.getY(i)); }
    const top = add(inner, topG, topM);
    const mudBody = add(inner, new THREE.BufferGeometry(), mat(0x7a5232, 'paint', { roughness: 0.7, side: THREE.DoubleSide }));
    const NP = 22, pM = mat(0xffffff, 'paint', { metalness: 0, roughness: 0.8, flatShading: true });
    const P = particles(inner, new THREE.DodecahedronGeometry(1, 0), pM, NP);
    for (let i = 0; i < NP; i++) P.color(i, new THREE.Color(hash(i, 2) > 0.5 ? 0x6b4f35 : 0xa07850));
    if (o.dir) { const d = V3(...o.dir).normalize(); group.quaternion.setFromUnitVectors(V3(1, 0, 0), d); }
    anchors.paddle = anchor(paddle, 0, -0.2, 0); anchors.sensor = anchor(inner, 0, PR + 0.2, -0.05); anchors.arm = anchor(arm, 0, 0.5, 0); anchors.window = anchor(inner);
    function update(t, p = {}) {
      const flow = p.flow ?? 1;
      const deg = p.angle != null ? p.angle : (flow <= 1 ? 22 * flow : 22 + (flow - 1) / 0.55 * 12);
      paddle.rotation.z = deg * PI / 180; arm.rotation.z = deg * PI / 180;
      const lev = clamp(p.level ?? (0.36 + 0.1 * clamp(flow - 1, 0, 1)), 0.05, 0.95);
      const r = PRi - 0.004, h = -r + 2 * r * lev;
      // section face in the cut plane: the lower circular segment (x along the pipe -> extrude look via body)
      const hw = Math.sqrt(Math.max(0, r * r - h * h));
      top.position.y = h; top.scale.z = hw; top.position.z = 0;
      ripT.offset.x = -t * 1.6 * (p.speed ?? 1) * (0.7 + 0.3 * flow);
      // body: half-cylinder segment along x (back half) rebuilt only when the level changes
      const k = h.toFixed(3);
      if (mudBody.userData.k !== k) {
        mudBody.userData.k = k;
        const S = Soup(), n = 18, a0 = Math.asin(clamp(h / r, -1, 1));
        const pts = []; for (let i = 0; i <= n; i++) { const a = lerp(-PI / 2, a0, i / n); pts.push([Math.cos(a) * r, Math.sin(a) * r]); } // (z-depth, y), z = -cos
        const Z = V3(0, 0, 1);
        for (let i = 0; i < n; i++) {
          const [c0, y0] = pts[i], [c1, y1] = pts[i + 1];
          const A = V3(-WL, y0, -c0), B = V3(WL, y0, -c0), Cc = V3(WL, y1, -c1), D = V3(-WL, y1, -c1);
          const nn = V3(0, y0, -c0).normalize().negate();
          S.quad(A, B, Cc, D, nn, nn, nn, nn, [0, 0], [1, 0], [1, 1], [0, 1], nn.clone().negate());
        }
        // section rectangle-ish face: polygon in the z = 0 plane between y = -r and y = h (front cut of the stream)
        const fa = V3(-WL, -r, -0.001), fb = V3(WL, -r, -0.001), fc = V3(WL, h, -0.001), fd = V3(-WL, h, -0.001);
        S.quad(fa, fb, fc, fd, Z, Z, Z, Z, [0, 0], [1, 0], [1, 1], [0, 1], Z);
        const g = S.geo(); mudBody.geometry.dispose(); mudBody.geometry = g;
      }
      for (let i = 0; i < NP; i++) {
        const u = fract(hash(i, 1) + t * 0.55 * flow * (0.8 + 0.4 * hash(i, 3)));
        const x = -WL + u * 2 * WL, y = -r + (h + r) * (0.15 + 0.75 * hash(i, 4)), sc = 0.018 * (0.7 + 0.8 * hash(i, 5)) * Math.min(1, u * 10, (1 - u) * 10);
        _q.setFromEuler(_e.set(t * 3 + i, t * 2 + i, 0)); P.setQ(i, _v.set(x, y, 0.012), _q, _s.setScalar(sc));
      }
      P.done();
    }
    update(0, {});
    return { group, update, anchors };
  }


  const B = { drop, pumpSection, triplex, chargePump, degasser, hydrocyclones, centrifuge, washpipe, standpipeManifold, flowPaddle };
  // __MORE_BUILDERS__
  return { ...B, applyPBR, materials: ALLM, colors: C, util: { turned, sweep, fillet, cbox } };
}
