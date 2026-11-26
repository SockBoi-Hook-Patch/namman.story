# Look upgrade (look.js)

This upgrade gives the stylised rig scenes a "premium explainer" finish: PBR steel and paint, tone mapping, soft shadows, sky reflections, rim light, a nicer dusk sky and a gentle glow. Geometry and the colour palette stay the same, and so does the highlight system. Everything lives in `lookdev/look.js`. A production `scene3d.js` needs about 15 changed lines, and `frame.html` needs 1.

Comparisons are in `lookdev/compare/`:
- `tNNN_before_after.png`: full composite with overlays and captions.
- `tNNN_before_after_3d_only.png`: the 3D layer only.
- `overview_top_before_bottom_after.png`: before on the top row, after on the bottom.

Times covered: t = 4, 21, 37, 99 and 123.

## Cost (SwiftShader, 1080x1920, measured with 149 frames over t = 0..153 on one page, PNG encode included)

| | ms / frame |
|---|---|
| before (Lambert, no post) | **159** |
| after (defaults below) | **585** (land set ~650–750, studio ~520) |

At 3 pages, a 150 s video (4,500 frames) is about 15 min of frame time per page. That is well under the 3 s/frame budget. The first frame on each page takes about 1.8 s because of shader compilation.

What each part costs, and what made the cut:

| feature | cost/frame | status |
|---|---|---|
| MeshStandardMaterial + ACES + analytic env reflections + rim | ~+250 ms | **on** |
| directional shadow map, PCF soft 2048 (1024 is no faster) | ~+90–160 ms | **on** |
| 2D grade + 1/4-res glow on the compositor canvas | ~0–20 ms (in the noise) | **on** |
| sky shader (gradient, sun glow, clouds) | negligible | **on** |
| real PMREM env map (`opts.ibl:'pmrem'`) | +~550 ms | off: the analytic env looks almost the same |
| UnrealBloomPass via EffectComposer (`opts.bloom:{…}`) | +~650 ms | off: replaced by the 2D glow |
| GTAO ambient occlusion (`opts.ao:true`) | +~2,200 ms | off: over budget. Shadows already give contact grounding |
| SMAA / supersampling | n/a | not needed: the canvas is already MSAA (`antialias:true`), and lattice edges are clean |

Each option can be switched at run time with `window.LOOK_OPTS = {...}` (for example `{shadows:false}`, `{glow:false, grade:false}` or `{ibl:'pmrem'}`), which is handy for A/B tests.

## What it does

1. **Tone mapping and colour.** `renderer.toneMapping = ACESFilmicToneMapping`, with sRGB output and exposure set per set. A small 2D grade (`saturate(1.12) contrast(1.04)`) wins back the saturation that ACES takes out of the brand colours.
2. **Materials.** `upgradeMaterials()` walks each set and replaces every `MeshLambertMaterial` and `MeshPhongMaterial` with a `MeshStandardMaterial`. It makes one new material per old one, so shared materials stay shared. It keeps colour, map, emissive, transparency, side, blending, fog and clipping. The material kind is guessed from the colour unless `material.userData.kind` is set:

   | kind | metal / rough | rule |
   |---|---|---|
   | steel | 0.7 / 0.42 | low-chroma mid greys and blue-greys (pipe, drill pipe, bits) |
   | paint | 0.12 / 0.58 | saturated colours (red top drive, blue pump, yellow) |
   | white | 0.08 / 0.5 | near-white paint (derrick, tanks) |
   | dark | 0.25 / 0.5 | dark slate (skids, kelly) |
   | rubber | 0 / 0.75 | near-black (hoses, cables, lines) |
   | ground | 0 / 0.95, flat | any mesh with a bounding radius over 40 m (terrain, mesas, studio floor) |
   | label | 0 / 0.7 | textured signs and sacks |
   | wet | 0 / 0.5, weaker reflection | Phong (mud surface) |

   Shading is smooth for machinery, so cylinders read as round. It stays flat for ground, rocks and displaced `PlaneGeometry`, whose normals are never recomputed. Rocks, scrub and cuttings (detail-0 polyhedra) keep their faceted look either way. Transparent smoke becomes matte (metal 0, roughness 1).
3. **Reflections (cheap image-based lighting).** Each look material gets a small `onBeforeCompile` injection. The reflected ray picks a colour from a top/horizon/ground gradient (blurred by roughness) plus a sun lobe, and that feeds three's physical indirect-specular term. Fresnel, metalness and roughness therefore behave correctly. The land set derives its colours from the dusk sky. The studio uses a soft cool "softbox" gradient.
4. **Shadows.** The existing `O.dir` key light gets a 2048 PCF-soft shadow map. `LOOK.frame()` fits the ortho shadow camera to the shot every frame: centre = camera target, radius = 0.85 × camera distance (clamped 8–80 m), snapped to the texel grid so shadows do not crawl. Cast and receive flags: lit meshes cast and receive. Big landscape receives only. Instanced, transparent and additive meshes and basic materials do neither. Set `mesh.userData.castShadow = false` to opt a mesh out. The key direction can be overridden per set (`lightDir`). The land key is rotated about 45° off the camera axis so shadows are visible, because the old front light hid them.
5. **Rim light.** A second directional light (no shadow) is placed behind the subject relative to the camera: warm at dusk, cool blue in the studio. It always exists, with intensity 0 when it is unused, so set switches never trigger shader recompiles.
6. **Sky.** `skyMaterial()` is a full-direction gradient shader using the same 4 colours as `makeSky()`, plus a soft sun glow, a horizon haze band and stylised cloud streaks. The old hard-edged 240 m sun halo disc is hidden. A studio "backdrop" dome (navy gradient, same colour as the fog at the horizon) replaces the flat background colour.
7. **Glow.** `glow2D()` draws the WebGL canvas at 1/4 resolution through CSS filters `brightness()+contrast()` (a soft threshold) and `blur()`, then adds it back with `'lighter'`. Highlights, lamps, the flare and the emissive highlight pulse get a soft bloom almost for free.

**Highlight system.** `applyHighlight()` is unchanged. `MeshStandardMaterial` has `color` and `emissive`, and because `applyLook()` runs before `O.tagged` caches materials, the dimming and the glow pulse act on the new materials.

## How to apply it to a production `scene3d.js`

1. Copy `lookdev/look.js` next to `scene3d.js`. It imports only from `three` and `three/addons/...` (same import map), so no new packages are needed.
2. Add the import at the top (after the BufferGeometryUtils import):
   ```js
   import { applyLook, skyMaterial } from './look.js';
   ```
3. Add `LOOK` to the module state and a `post` hook:
   ```js
   let THREE, renderer, scene, camera, LOOK;
   function post(ctx, glCanvas, t) { if (LOOK && O.shot) LOOK.post(ctx, glCanvas, O.shot.set); }
   ```
4. In `buildLand()`, hide the hard sun halo. This is the line after `const sg2 = ...`:
   ```js
   sg2.lookAt(0, 0, 0); sg2.visible = false;
   ```
5. In `init()`, paste this **after all sets are built and before** `O.tagged = []; ...`:
   ```js
   const DUSK = { top: 0x1f2a63, mid: 0x9a4f86, hor: 0xffab6b, low: 0x7a5a44, glow: 0xffb27a, ground: 0x8a6448,
                  sunDir: new THREE.Vector3(-0.62, 0.05, -0.78) };          // same colours as makeSky(...) in buildLand
   O.skyL.material = skyMaterial(DUSK);
   LOOK = await applyLook({ THREE, renderer, scene, camera, sets: O.sets, light: O.dir, presets: {
     L: { sky: DUSK, exposure: 1.08, envIntensity: 1.0, lightDir: [70, 52, 22],
          glow: { strength: 0.35, threshold: 0.86 }, rim: { color: 0xffb27a, intensity: 1.2, lift: 0.35 } },
     S: { refl: { top: 0xe6eefc, hor: 0x5a6b8a, ground: 0x1a2840, sun: 0xffffff, sunK: 3, sunDir: [0.4, 0.7, 0.6] },
          exposure: 1.0, envIntensity: 1.1, shadowMin: 10, lightDir: [45, 55, 40],
          glow: { strength: 0.4, threshold: 0.8 }, rim: { color: 0x9cc4ff, intensity: 2.2, lift: 0.6, side: 0.5 },
          backdrop: { top: 0x0a1222, mid: 0x1c2f52, hor: 0x0d1a2e, low: 0x0d1a2e } },
   }, opts: (typeof window !== 'undefined' && window.LOOK_OPTS) || {} });
   ```
   If a part has more sets (for example the BOP close-up or subsurface sets), add a preset key for each set in `O.sets`. A set with no preset still gets the materials and shadows, with exposure 1 and no rim.
6. In `renderFrame(t)`, replace `renderer.render(scene, camera);` with:
   ```js
   const o = OFF[O.shot.set], v = O.shot.v;
   LOOK.frame(O.shot.set, camera, O.v3b.set(v[3] + o[0], v[4] + o[1], v[5] + o[2]));
   LOOK.render(scene, camera);
   ```
   This must run after `envSet()`, because the scene positions the light and the look then refits it.
7. Export `post`: `export default { DURATION, init, renderFrame, post, drawOverlay, captions, cues };`
8. In `frame.html`, add one line right after `o.drawImage(renderer.domElement, 0, 0, W, H);`:
   ```js
   if (Scene.post) Scene.post(o, renderer.domElement, t);
   ```

For new code, `stdMat(color, kind, opts)` makes a look material directly, for example `stdMat(0x9ca3af, 'steel')` or `stdMat(0xdc2626)` (kind guessed). You can also keep using `lam()` and tag a material with `m.userData.kind = 'steel'` before `applyLook` runs.

## Caveats

- **Call order matters.** `applyLook` swaps materials on meshes. Any code that kept a reference to a Lambert material and changes it per frame must run its caching after `applyLook`, or look up the new material with `LOOK.mat(old)`. In Part 3, only `O.tagged` caches materials, and it is built after the call. `O.mudSurfM` is only used at build time.
- **Light ownership.** `LOOK.frame()` moves `O.dir` (position and target) each frame to fit the shadow. `envSet()` resets it each frame, so the result stays a pure function of t.
- **Very wide shots** (camera more than about 95 m from the target) clamp the shadow box to ±80 m. Shadows beyond it fade out, which is not visible in Part 3.
- **The kind guess is a heuristic.** If something looks too chrome or too matte, set `material.userData.kind` (or `userData.envScale` for reflection strength) on that material before `applyLook`.
- **Determinism.** The 3D layer was verified identical across render orders. The look adds no frame history. The full composite differed between runs in both the old and the new version: the overlay/caption layer has its own render-order differences, which already existed and are unrelated to the look.
- **ACES tone mapping** shifts saturated colours slightly toward lighter, warmer tones. The 2D grade compensates. Overlay and caption colours are drawn in 2D after the 3D layer, so they are unaffected.
- The first frame per page is about 1.8 s because shaders compile then. `look.js` also adds a `post` export, and `frame.html` calls it only if it exists, so old scenes still work with the new `frame.html`.
