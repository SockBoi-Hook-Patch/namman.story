# Storyboard / previs: Drilling Rig 101 · EP.05 · Part 5/5: Well Control System

1080x1920 (9:16) · 30 fps · 183.6 s · timing source: `docs/script.json` · treatment: `docs/director.md` · facts: `docs/research.md` · overlay style: `ep05-rig-p4-circulating/docs/design.md` + `design_direction.md` ("Field Manual").
System colour **purple #a855f7** (`SYSCOL.wc`); mud **#c8925a** (3D) / `C.mud` **#b07a45** (2D); teaser grey **#94a3b8**.

The client's top request for this part is **realism**. Read §0.4 (motion physics) and §0.5 (camera grammar) before you animate anything. Those two sections apply to every shot.

---

## 0. Conventions (read first)

### 0.1 Sets and units

| Set | Offset | Scale | Source |
|---|---|---|---|
| **L** rig | (0, 0, 0) | **1 u = 1 m** (the crew figure is 1.8 u) | P4 `buildLand` and the rest, with the **rebuilt BOP stack**, the **section trench** and the NEW L-assets in §2 |
| **W** well cut-away | (5000, 0, 0) | stylised (hole r 1.6) | P4/EP03 `buildWell` (`RH 1.6, Y_SHOE -14, YB -38.4, YBT -36.4, Y_COL -28, Y_TOP 8`). Cut plane z = 0, camera always at +z. |
| **S** studio | (0, 0, -5000) | **×8: 1 u = 0.125 m** (bore r 1.4, 5 in pipe r 0.5; same scale as the EP04 "B" cut-away set) | Navy studio floor + backdrop from EP04 `buildBOPSet` (floor cyl r 60 #16233a). New macro models sit at the slots below. Hide every S sub-group that is not in shot. |

**Studio slots (S-local):** `ANN` (-40, 0, 0) · `RAM` (-40, 0, 40) · `BSR` (-80, 0, 40) · `IBOP` (-80, 0, 0). They are ≥ 40 u from each other and ≥ 60 u from the Part 4 slots (`PUMP_A`, `PUMP_B`, `WASH`, `CAB`), which stay hidden.
All studio models use the EP04 technique: **only the back half is built (z ≤ 0)**, so the z = 0 face reads as a clean section and the camera is always on +z. **Studio cameras therefore see the choke side at +x** (see §5, continuity).

### 0.2 Camera notation

`cam (px,py,pz) → look (tx,ty,tz) fov` in set-local coordinates. `fov` is the **vertical** three.js fov; the 35 mm-equivalent focal length for a portrait frame is given in brackets (fov 50 ≈ 39 mm, 44 ≈ 45 mm, 40 ≈ 49 mm, 36 ≈ 55 mm, 34 ≈ 58 mm, 32 ≈ 63 mm, 28 ≈ 72 mm, 22 ≈ 93 mm). The horizontal fov is only 0.56 × as wide, so wide subjects need distance, not a wider lens.
`vo [dx,dy]` means the look-at point lands at screen (540+dx, 960+dy), implemented with `camera.setViewOffset(W, H, -dx, -dy, W, H)` exactly as in P4. Screen positions in [brackets] were checked with a pinhole projection (vertical fov, 1080x1920). Shots marked **(verify)** have not been checked: run the same pinhole check before blocking.

### 0.3 Screen layout (all shots unless noted)

| Element | Box (px) |
|---|---|
| Section tab (`sectionHeader`, index "P5", label "Well Control", sub = chapter) | x 60, y 168–232 |
| **Floor indicator** (20.2–77.6, see §4) | x 60–130, y 300–900 |
| Fact card, top variant (3 lines, `bottom: 600`) | x 60–960, y ≈ 252–600; with a note to y ≈ 660. **During 20.2–77.6 cards use x 150–960** so they never touch the floor indicator. |
| Fact card, right-column variant (tall subjects: S17–S18) | x 560–960, y 252–820 |
| 3D subject box | y 640–1280 (x 150–960 while the floor indicator is up) |
| Callout tabs (`callout`) | inside the subject box; **≤ 2 on screen, each ≥ 3 s, ≤ 6 words** |
| Captions (frame.html) | y 1310–1560. Nothing important below y 1600. |

**Density rule (client):** 1 card + 2 labels + the section tab per frame. Instruments drawn in 2D (stopwatch ring, check glyph) count as a label. The floor indicator is UI and does not count.
**Card lines** reveal one at a time, ≥ 0.8 s apart, at the times given per shot (not a uniform stagger). Where a shot says "note first", the note is revealed in its bottom slot before the lines, because that is when the VO says it; this needs `noteAt` / `lineAt` options on `factCard` (a small kit change).
**Field Manual rules that the animator must keep:** opaque paper sheets #f6f2ea with ink #16171b, one 8 px purple top band per sheet, cased leaders (ink 3 px on paper 8 px) snapped to 15° with a dot terminator, left-aligned type, sentence case (no letter-spaced caps), Kanit ≥ 26 px, one entrance move per element (`eout` 0.3–0.5 s), exits `ein` 0.3 s all together, **no glow, glass, gradient, pulse or overshoot in 2D**. Physical 3D instruments (gauge needles) *do* overshoot (§0.4); 2D gauges never do.

### 0.4 Realistic motion rules (apply everywhere)

These are the client's realism notes, turned into rules the animator can check frame by frame.

1. **Cause before effect.** A hydraulic function always reads in this order: control signal → fluid moves in the hose (purple dash) → the operating chamber fills (purple tint inside the cylinder) → a **0.12 s dead time** → the part moves. Well pressure never starts a motion.
2. **Ram blocks** ride on hydraulic pistons. Their motion profile is:
   - accelerate with `ein` over 0.15 s;
   - travel at **constant velocity** (the speed is limited by flow), not with an ease-in-out;
   - slow down over the last 8 % of travel while the rubber packer compresses;
   - stop **mechanically**: velocity goes to 0 within 2 frames, then the body has a micro-shudder `Δ = A·e^(−t/0.08)·sin(2π·14·t)` with A = 0.6 mm real (0.005 u in S, 0.0006 u in L) for 0.25 s, plus `clunk`.
   - Rubber front packers bulge 3–4 % sideways and extrude 2 % up and down at contact, then relax 1 % over 0.4 s.
   - Tail-rod position indicators on the bonnets move with the piston (out = closed).
   Ram travel (each side) is about 0.19 m (≈ 7½ in): 1.5 u in S, 0.19 u in L.
3. **Annular element:** a conical piston rises and wedges the rubber inward. The motion is near-linear, then it **eases out as the rubber resists** (last 25 %), then the rubber creeps 0.3 % over 1 s after the piston stops. The steel inserts move as rigid bodies (rotate inward about their outer heel, max 22°). The rubber between them flows and bulges slightly upward into the bore. There is no bounce.
4. **Shear:** contact → the pipe ovalises (the blades slow to 30 % speed, and the force builds) → sudden fracture (the remaining 30 % of travel in 2 frames) → sparks and chips → the seal faces meet with a normal ram stop (rule 2). See S10 for the full sequence.
5. **Handwheels** turn with the thread: `turns = travel / pitch`, at no more than **1.3 turns/s**, which is a crew member's pace. Use pitch 0.25 in (6.35 mm) for ram-lock screws and 0.19 in/turn for 4-1/16 in gate valves (≈ 22 turns for a full 4.2 in stroke; this is manufacturer-dependent and is never shown as a number). We never fake a full stroke in 1 s. We show the **last turns** at a real pace, then a **hard shoulder stop**, then the standard **¼-turn back-off** on gate valves.
6. **Gauge needles** (3D Bourdon gauges) follow a damped spring toward the target: `θ = θ1 + (θ0−θ1)·e^(−ζωt)(cos ω_d t + ζ/√(1−ζ²) sin ω_d t)`, with **ζ = 0.75 and ω = 12 rad/s**. That gives ≈ 3 % overshoot and settling in about 0.5 s. Add a ±0.4 % jitter at the pump stroke rate while a pump runs.
7. **Gas** is never a smooth stream:
   - Bubbles rise with `v ∝ √r`, wobble ±10 % of r at 3–5 Hz, grow as pressure falls (×1.6 volume after the choke), coalesce, and burst at a liquid surface with a 0.2 s ring.
   - In the MGS the inlet arrives as **slugs** (mud and gas alternating every 0.4–0.7 s, hash-timed).
8. **Flare:** a steady, controlled flame.
   - Flame height is `1 + 0.10·(sin 1.7t·2π + 0.6 sin 3.1t·2π + 0.35 sin 5.3t·2π)/1.95` plus a per-cone hash phase.
   - It leans 15° downwind (toward −x). The colour runs core #ffe07a → #ff9a1f → #ff4d00 at the tips. The glow sprite varies ±8 %.
   - A faint heat-haze strip above it (2D displacement 2 px, optional). No black smoke, no fireball.
9. **Everything is a pure function of `t`:** no `Math.random`, no frame history. Particles use `hash(i, seed)`.
10. **Time compression:** a few real operations are faster on screen than in life (ram closing, accumulator charging). We never put a running clock next to a compressed action. The only timer on screen (S13) is a **limit ring**, not a stopwatch reading (see S13).

### 0.5 Camera grammar (cinematography)

- **No handheld noise, ever.** Moves are "weighted": camera position follows a centripetal Catmull-Rom path through the keyframes with an arc-length time warp, so velocity is continuous between segments. Segment easing is quintic in/out (`eio5`) for moves ≥ 1.5 s and cubic (`eio`) for shorter ones. A hold drifts at ≤ 2 % of the camera distance per hold, so nothing looks frozen.
- **The single allowed jolt:** the shear impact (S10, 73.6) gets a one-impulse frame kick of 0.15 % of frame height, damped to zero in 0.25 s. That is not handheld.
- **Slow push-ins** on every reveal: 3–8 % of the distance over the hold.
- **Parallax:** foreground elements are used where they exist, such as substructure legs, the trench lip, hoses and the bonnet in the foreground. Speed comes from depth, not from pans.
- **Rack focus:** use DOF where available, and a fog rack otherwise.
  - Preferred: `LOOK.dof = { focus, aperture, maxblur }` via three's `BokehPass` at half resolution, opt-in **only** on the shots marked "DOF" (macros S5–S10, S12, S13c, S17, S20, S21, S23). Focus is keyframed per shot.
  - Fallback if render time is too high: a **fog rack**, where `scene.fog.near/far` are keyed so the plane behind the subject falls off (L: near = focus + 6, far = focus + 60; S: near = focus + 4, far = focus + 30), plus a 2D vignette-blur on the frame edges at 12 % strength.
  - Both are deterministic.
- **Never inside geometry.**
  - Every camera keyframe *and the path between keyframes* must be ≥ 0.25 u from any mesh bounding box in the active set (≥ 0.15 u in S).
  - Add a dev check `camClear(t)` that ray-casts 6 axis directions plus the view ray from the camera and logs any frame closer than that. Run it over the whole timeline before every review render.
  - Each shot below lists its clearance against the nearest obstacles (substructure legs at x ±3.4 / ±6.6, z −7/0/7; their braces in the planes x = ±3.4 and ±6.6 and along z = −7 / 7; V-door ramp `cylBetween([0,7,-7.7],[0,1.2,-21], r 0.9)`; floor slab y 6.5–7.33; cellar walls at ±2.35).
  - The near plane is 0.05.
- **Section trench (L).** The cellar is below ground, so every cellar camera sits in a **section trench** on the −z side of the cellar (asset L-4).
  - Inside the box x ∈ [−3.2, 3.2], z ≤ −2.2, y ≤ 0.02, the pad, terrain and cellar −z wall are clipped away (material `clippingPlanes` with `clipIntersection: true`: planes x > −3.2, x < 3.2, z < −2.2, y < 0.02).
  - Soil liner faces close the cut: floor y −2.45, walls x = ±3.2, back slope from z −18.
  - Every trench camera stays inside that box (|x| < 3.0, z < −2.4, y > −2.2).
  - The trench is revealed on camera in S3 and stays until the end of S23.

### 0.6 Highlight and colour

- `applyHighlight` with `focusAt`:
  - full colour 0–1.5;
  - `['wc', 0.85]` ramps in 1.5–4.0 (top-down sweep, S1) and holds to 166.1;
  - the recap (S24) lights all five tags in their own colours;
  - off for S25–S26.
- Tag every NEW L-asset `SYS.cur = 'wc'`, except the bell nipple (grey #9ca3af, never purple), the casing head (steel grey) and the trip tank (circ teal, as in P4, but purple-rimmed in S19).
- Cut faces of equipment get a thin purple rim light. Cut faces of soil and concrete get 45° ink section hatching at 15 % opacity (a technical-drawing cue that matches the Field Manual overlays).
- Fixed 3D colours:

| Element | Colour |
|---|---|
| Rubber | #2b2b33 |
| Steel inserts and ram blocks | #cbd5e1 |
| Freshly cut steel | #e5e7eb |
| BSR blade edge | #ef4444 |
| Hydraulic fluid | #e0a23a, honey (deliberately not Power #f59e0b) |
| Nitrogen | #9fb3c8, blue-grey |
| Mud | #c8925a |
| Gas | #f8fafc with a 1 px #a855f7 rim |
| Hydraulic pulse | #a855f7, a flat emissive dash 0.4 m long, 3 m/s at rig scale in close shots, up to 12 m/s in wides |
| Command signal (panel → unit) | a thin #a855f7 dash, 15 m/s |

### 0.7 Timing note (VO word sync)

Word times below are **estimates**: characters are spread evenly through each `script.json` window. The measured TTS rate on this voice is about 13 chars/s, against window rates of about 8.8, so real lines finish about 30 % before their window ends.
**Before blocking, measure every `vo/voNN.mp3`.** Use whisper word timestamps, or at minimum `ffprobe` the duration and scale the character positions into `[t, t + dur]`. Then move every beat marked "@word" to the measured onset, with the visual 0.1–0.2 s *ahead* of the word.
Card and label times in this file follow `script.json` unless a shot says otherwise.

---

## 1. One-page summary

| # | Time (s) | Set | Shot | Camera | Key motion | Card / overlay | Music (0–5) |
|---|---|---|---|---|---|---|---|
| S1 | 0.0–6.2 | L | Golden-hour wide; purple pours down the stack | slow push-in | wc glow sweeps top→bottom | Title (0.4–5.9) | 2 |
| S2 | 6.2–13.2 | W | Well cut-away: mud = barrier 1, BOP = barrier 2 | crane up the well | mud column fills; EP04 gas ghost | Barriers (6.4–12.9) | 2 |
| S3 | 13.2–20.2 | L | Floor → cellar; trench reveal; crew for scale | tilt + crane down, push | section cut opens | BOP = Blowout Preventer (13.4–19.9) | 2→3 |
| S4 | 20.2–36.8 | L | **The lift**: bell nipple → casing head | one vertical dolly, 6 soft stops | each tier lights | Diagram (20.4–36.5); floor indicator | 3 |
| S5 | 36.8–43.6 | S ANN | Annular closes on 5 in pipe, then on a hex kelly | push-in, DOF | piston up, rubber squeeze | Annular Preventer (37.0–49.8) | 3 |
| S6 | 43.6–50.1 | S ANN | Closes on open hole; stripping a tool joint | locked + micro push | full squeeze; element relaxes, joint passes | (card continues) | 3 |
| S7 | 50.1–56.3 | S RAM | Top-down ram cavity: rams meet on pipe | 70° plan, push to half-moon | rams drive in, stop | Ram Preventers (50.3–63.4) | 3 |
| S8 | 56.3–63.7 | S RAM | VBR on 3½ in; orbit to side; ram lock | orbit down 60°, hold | inserts fan; lock screw 3 turns | (card continues) | 3 |
| S9 | 63.7–70.6 | S RAM | Wow 1: 10,000 psi on closed ram ≈ 660 t | locked, slow push | pressure disc fills, force arrow | Calc (63.9–70.3) | 4 |
| S10 | 70.6–77.6 | S BSR | BSR shears pipe and seals; tool-joint ✕; space-out | 3/4 push, impact jolt | shear sequence, sparks | Blind Shear Ram (70.8–77.3) | 5 |
| S11 | 77.6–84.6 | L | Two-hand press on driller's panel; signal to Koomey unit | macro → crane follow → hold | buttons, signal dash, 4-way valve flips | Accumulator (77.8–91.1) | 3 |
| S12 | 84.6–91.4 | L | Bottle cut-away: 1,000 → 3,000 psi; manifold 1,500 | locked macro, DOF | bladder compresses (Boyle), needles | (card continues) | 3 |
| S13 | 91.4–98.2 | L | **Wow 2**: lights out; bottles discharge; rams close | wide → unit → trench, rack focus | power-down, discharge, ram close | Closing Time (91.6–97.9) | 5→0→4 |
| S14 | 98.2–104.4 | L | Choke side: manual valve (hand turns), HCR opens | close 3/4, push | last 1¼ turns + ¼ back-off; HCR gate rises | Choke & Kill Lines (98.4–111.5) | 3 |
| S15 | 104.4–111.8 | L | HCR shut/open; truck to kill side; mud pumped in | truck right→left in trench | 2-state gate; check-valve flapper | (card continues) | 3 |
| S16 | 111.8–119.2 | L | Choke line → manifold; choke trim narrows; choke panel | parallax track, push, cut | needle trim closes; gas expands | Choke Manifold (112.0–118.9) | 3 |
| S17 | 119.2–126.4 | L | MGS cut-away; gas to flare; mud out | push, tilt + pan, rack to flare | slugs, baffles, bubbles; flare flicker | Mud Gas Separator (119.4–133.1), right column | 4 |
| S18 | 126.4–133.4 | L | Wow 3: U-tube mud leg ≈ 5 psi | locked macro, push | U-tube balance under gas push | (card continues) | 3 |
| S19 | 133.4–139.6 | L | Trip out one stand; trip tank level step; check | floor → cut → tank push | stand pulled; float steps down | Trip Tank (133.6–139.3) | 3 |
| S20 | 139.6–145.2 | L → S IBOP | Top drive, then IBOP section | push → iris | upper IBOP ball quarter-turns closed | ปิดข้างในก้านเจาะ (139.8–151.8) | 2 |
| S21 | 145.2–152.1 | L → W | FOSV open on the floor; dive to the float valve | low floor dolly → dive | flapper slams shut on back-flow | (card continues) | 2 |
| S22 | 152.1–159.2 | L ghost | Top-hole diverter; gas vented downwind | crane up and out | element closes, vent valve opens | Diverter (152.3–158.9) | 2–3 |
| S23 | 159.2–166.1 | L | Test plug lands; chart recorder low → high; function test | trench → recorder, rack focus | pen steps; tail rods cycle | BOP Testing (159.4–165.8) | 2 |
| S24 | 166.1–172.4 | L | Five systems light in turn | dip → crane out to the high aerial | 5 tags light | Recap (166.3–172.1) | 5 |
| S25 | 172.4–177.4 | L | Dusk aerial hold; follow tap | drift | none | CTA (172.6–176.9) | 3 |
| S26 | 177.4–183.6 | W | Tilt down nested casing; fade | slow tilt | cement hint | Teaser EP.06 (177.4–182.7) | 2→0 |

**26 shots.** Transitions:
- Cuts inside a set use a 0.25 s ink dip (`K.wipe` type `dip`, colour #16171b).
- L ↔ S macros use the Part 4 **soft circular iris** (0.5 s, centred on the subject's screen position).
- Continuous moves join S3→S4, S5→S6, S7→S8→S9 and S17→S18. No whip pans.

---

## 2. 3D asset list (for the 3D modeler)

**Budget:** ≤ 150k triangles in view, SwiftShader ≤ 400 ms/frame. Build from the P3/P4 helpers (`add`, `box`, `cyl`, `xCyl`, `zCyl`, `cylBetween`, `pipeRun`, `strip`, `labelTex`), plus `LatheGeometry`, `ExtrudeGeometry` and morph targets where noted.
**Detail level:**
- **A** = hero: seen at ≤ 4 m (L) or ≤ 20 u (S). Has bevels or chamfers on the main edges, bolts/studs, real proportions, separate moving parts and a half-section variant.
- **B** = mid: seen at 4–15 m. Correct silhouette, main sub-parts, no bolts.
- **C** = background: silhouette only.

All dimensions are real metres (L) unless marked S-u.

### 2.1 L-set (rig)

| # | Asset | Level | Position (L) | Spec | Moving parts | Tris |
|---|---|---|---|---|---|---|
| L-1 | **BOP stack, rebuilt** (13-5/8 in, 10M rams, 5M annular) | A | axis x = z = 0, on the cellar floor y −2.4 | Replaces `buildSurfaceBOP`. Bore Ø 0.346 m. Tiers and world y are in §5.1. Body #cbd5e1 steel. **Flanges:** API 6BX-style rings r 0.52, h 0.2, with **20 stud bolts + nuts** each and a 6 mm dark ring-gasket line between faces. **Ram bodies** are 1.25 (x) × h × 0.85 (z). **Bonnets** on the ±x axis: a hinge-block box 0.5 × h × 0.7, then the operating cylinder xCyl r 0.28, L 0.75. A **ram-lock screw housing** and a **lock handwheel** (Ø 0.4, 4 spokes, red #dc2626) sit at the bonnet tail at x ±1.85–1.95. Tail-rod indicator r 0.03 (white tip), weep-hole dot under each bonnet. 2 hydraulic hose fittings per bonnet (open/close). **Annular:** LatheGeometry profile (r 0.71 max, h 1.45; GK-like dome) with 12 cover bolts and 2 hose ports at +z. **Drilling spool** r 0.42 between flanges, h 0.6, 4-1/16 in flanged side outlets: **choke at −x, kill at +x** (outlet flange r 0.2). **Casing head:** body r 0.38, h 0.4 on the surface casing stub; 2 small 2-in side-outlet valves at ±45° toward +z (grey, never purple). Small engraved tags (3D texture, realistic caps allowed): "ANNULAR", "VBR", "BSR", "LPR". **X-ray mode:** per-cavity window materials (body opacity 0.35 over the cavity box) so ram blocks inside can be shown (S13, S23). Internal ram blocks per cavity: 2 boxes 0.42 × 0.30 × 0.35 that travel 0.19 on ±x. | ram blocks, tail rods, lock handwheels, annular piston (hidden), hose pulses | 30k |
| L-2 | **Choke-side valves** | A | spool −x outlet, y −0.7 | **Manual gate valve** (inner) centre (−0.85, −0.7, 0): body 0.32 × 0.34 × 0.30, bonnet + stem along **−z** (toward the trench camera), handwheel Ø 0.45 m, 5 spokes, rim r 0.025, at z −0.55; non-rising stem with a stem-position collar. **HCR** (outer) centre (−1.4, −0.7, 0): body as above, hydraulic actuator cylinder r 0.13, L 0.45 along −z, a **position-indicator rod** at the actuator end (out 0.11 = open) and 2 hose fittings. **Targeted tee** at the turn (−1.95, −0.7, 0) with a blind target flange (real choke-line practice). **Half-section variants** of both bodies (front half removed): gate plate 0.16 × 0.20 × 0.04, seats, bore r 0.052. The gate travels 0.107 (4.2 in); the HCR gate moves only in S14/S15. | handwheel, gate, actuator rod | 6k |
| L-3 | **Kill-side valves + kill line** | A/B | spool +x outlet | Manual gate valve (0.85, −0.7, 0) mirrored (handwheel toward −z). **Check valve** (1.4, −0.7, 0): body 0.34 × 0.30 × 0.30 with a half-section showing a **flapper** (disc r 0.05 on a top hinge, max swing 70°). `KILL_PTS = [[0.42,-0.7,0],[1.95,-0.7,0],[1.95,-0.7,1.6],[1.95,0.6,1.6],[1.95,0.6,4.4],[7.7,0.6,4.4],[8.0,0.45,4.4]]`, pipe r 0.07, with a closed gate valve at (7.2, 0.6, 4.4) (opens in S15) and a tee into the P4 discharge line at x 8. | flapper, valve wheel | 3k |
| L-4 | **Section trench** | B | −z of the cellar | Clip box as in §0.5. Liner meshes: floor plane y −2.45 (x ±3.2, z −2.2…−18), side walls x = ±3.2 (y −2.45…0), back slope z −18 → −22 rising to y 0. Soil #8a6a4a with 3 faint strata bands; pad cut edge concrete #9ca3af; 45° hatch (15 %) on all cut faces. Cellar −z wall stubs get caps. **Reveal:** clip plane `y` animates from −3 to 0.02 over 0.6 s (the earth "drops away"), with a 2 px ink line along the moving cut edge. | reveal clip | 1k |
| L-5 | **Crew figure in the cellar** | B | (1.75, −2.4, −1.5), facing −x | `buildHuman` (orange coveralls, white hat) + safety glasses (dark box) + gloves. Idle: weight shift ±1° every 4 s, head turns toward the stack at 17.4. | idle | 1k |
| L-6 | **Choke & kill re-route** | B | — | New `CHK_PTS = [[-0.42,-0.7,0],[-1.95,-0.7,0],[-1.95,-0.7,1.6],[-1.95,0.7,1.6],[-1.95,0.7,4.0],[-8.2,0.7,4.0],[-8.2,1.6,4.0],[-8.2,1.6,5.0],[-11.6,1.6,5.0],[-11.6,1.6,4.0],[-12.3,1.6,4.0],[-12.3,3.6,4.0],[-13.0,3.6,4.0]]`. The **active branch is now z = 5.0** (front, toward +z cameras). Delete the old line that left below the rams. Choke pipe r 0.1. | gas path | 1k |
| L-7 | **Accumulator unit** (generic Koomey-style closing unit) | A | skid x 3.8–8.2, z −13.4…−11.6, front face **−z** | Skid 4.4 × 0.15 × 1.8 (#334155). **Bottle rack:** 2 rows × 7 bladder bottles (Ø 0.23, h 0.9, domed ends, red #b91c1c with white bands) behind the manifold. **Reservoir tank** 3.0 × 0.7 × 0.9 under the manifold. **Electric triplex pump + motor** at the +x end (motor fan visible). 2 air pumps (small cylinders) at the −x end. **Front manifold panel:** 5 **4-way valve handles** (Annular, Upper pipe ram, BSR with a hinged red guard, Lower pipe ram, Choke HCR) with OPEN / CLOSE / BLOCK detents; a regulator; **3 gauges** (Ø 0.16: Accumulator 0–6,000, Manifold 0–6,000, Annular 0–3,000; real numerals in steps of 1,000 / 500). **Nameplate** (easter egg) 0.9 × 0.25 at (6.0, 1.7, −13.42): "namman.story · BOP CONTROL UNIT 3000 PSI". Hose-bundle outlet on the +z face. **One bottle (front row, x 5.0) has a half-section variant:** bladder (N₂ #9fb3c8) as a morphing sphere-capsule whose volume follows Boyle (100 % at 1,000 psi, 33 % at 3,000 psi); hydraulic fluid #e0a23a fills the rest; an **anti-extrusion poppet** at the bottom port is closed when the bladder is full. | handles, needles, pump motor, bladder, poppet | 18k |
| L-8 | **Hose bundle + command cable** | B | — | `HOSE_PTS` (bundle r 0.07, black, 6 strands visible near the cellar): `[[5.0,0.5,-11.6],[4.8,0.3,-11.0],[4.8,0.3,-7.4],[4.8,0.6,-7.0],[4.8,0.3,-6.6],[4.8,0.3,-1.6],[3.6,0.3,-1.6],[3.4,0.55,-1.6],[2.55,0.55,-1.6],[2.15,0.2,-1.6],[2.15,-0.5,-1.6]]`. It steps over the substructure bottom chords at z −7 and x 3.4, crossing at z −1.6 where the diagonal braces are high, then reaches a junction box on the cellar +x wall. It fans out to each operator: +x side direct; −x side along the cellar floor behind the stack (z +1.2). `CMD_PTS` (cable r 0.03, grey): `[[-2.2,7.0,2.6],[-2.2,6.2,2.6],[-2.2,6.2,-6.8],[3.65,6.2,-6.8],[3.65,0.3,-6.8],[3.65,0.3,-11.2],[4.2,0.5,-11.6]]`, clamped down the outside of the leg at (3.4, ·, −7). | purple dashes | 2k |
| L-9 | **Driller's remote BOP panel** | A | pedestal (−2.2, 7.33, 2.6), face toward −z | Pedestal 0.6 × 1.25 × 0.4 (#1f2937). Face: a mimic stack diagram (line art of the 5 functions in the §5.1 order), per function a push button + green (open) / red (closed) lamp, a **MASTER** push button at the left, a **flip-up guard** over the BSR button, 4 small gauges (Accumulator, Manifold, Annular, Rig air), a small "namman.story" plate. **Gloved hands** (orange, low-poly, two) for the two-hand press. | buttons (4 mm press), lamps, guard, hands | 5k |
| L-10 | **Rig lights (on/off)** | B | substructure + cellar | 6 LED floods (box 0.4 × 0.25 × 0.15 with an emissive face) on the substructure legs at y 6.0, aimed at the cellar and floor. 2 cellar work lights on the +x/−x walls. Additive light-pool decals on the cellar floor and the ground (opacity 0.25). The existing derrick lights (`lg`) and the doghouse window join the same `O.rigLights` switch. Off-state: emissive → #1f2937, pools hidden, L exposure −0.25 EV. | on/off with a 1-frame flicker | 1k |
| L-11 | **Choke manifold upgrade** | A (choke) / B | P4 manifold at (−10, ·, 4) | Front branch (z 5.0) = **remote hydraulic adjustable choke**: orange body + actuator + choke-position indicator (0–100 % ink scale, 3D texture), with a **half-section of the trim** (needle-and-seat: a conical needle r 0.06 → 0 into a seat r 0.04; flow ribbon through it). Back branch (z 3.0) = **manual adjustable choke** with a handwheel Ø 0.35. Gate valves on each branch keep their red handwheels. 5-way buffer cross at (−11.6, 1.6, 4.0). The worker stays at (−10.5, 0, 6.5). | needle, indicator, flow | 6k |
| L-12 | **Remote choke panel** | A | rig floor (2.6, 7.33, −3.0), face toward −x | Console 0.9 × 1.3 × 0.5. **Drill-pipe pressure** and **casing pressure** gauges (Ø 0.2, ticks only, **no numerals**), SPM and total-stroke mechanical counters (digit wheels; shown soft/out of focus, no legible values), choke-position gauge (%), open/close lever + speed knob, a backup hand-pump lever. | needles (rule 6), counters roll, lever | 4k |
| L-13 | **MGS upgrade** | A | vessel (−14, 1.2–7.2, 4) | Keep the P4 vessel (r 1.0, orange). **Cut window**: the front-left sector θ ∈ [−120°, −5°] (the −x/+z quarter) is removed and rimmed purple, so the **stencil (θ ≈ +45°) stays readable**. Inside: **target plate** (0.5 × 0.6 steel, facing the inlet at (−13.0, 3.6, 4)), **5 baffle plates** (half-discs alternating sides, tilted 15°, y 4.0–6.6), liquid level at y ≈ 3.2 with a wet surface plane, foam ring. **Mud leg (U-tube):** vessel bottom outlet (−14, 1.2, 4) → (−14, 0.25, 4) → (−14, 0.25, 5.6) → up to the **crest** (−14, 3.25, 5.6) with a small **siphon-breaker** pipe on top → (−14, 3.25, 6.0) → down to (−14, 1.5, 6.0) → joins `MGSR_PTS` (now starting at (−14, 1.5, 6.0)). The U-tube is a half-section pipe r 0.15 with mud inside, so the column reads. **Low-pressure gauge** on the vessel shell (−13.2, 6.0, 4.6): Ø 0.18, scale 0–10 psi (numerals 0, 5, 10), red band from 5. **Vent line** now r 0.13 (10 in) on `GAS_PTS`. **Stencil texture fix:** remove "MAX 150 PSI · VENT TO FLARE" and use "MUD GAS SEPARATOR / namman.story / VENT TO FLARE" (no pressure number: this episode says the MGS works at a few psi). | slugs, bubbles, level, U-tube levels | 8k |
| L-14 | **Flare + wind sock** | B | flare (−44.6, 0.7, 4); sock on the crown (2.2, 44.6, 0) | Pilot nozzle + igniter box. Flame cones as P4 with the flicker of rule 8; glow sprite. **Wind sock:** orange/white cone 1.2 m on a pole, pointing −x (wind blows +x → −x, away from the rig toward the flare); cloth ripple. | flicker, sock ripple | 2k |
| L-15 | **Trip tank (P4) + fill line** | B | (28.1, 0, −5.5) | P4 tank. Add the fill line from the tank to the bell nipple (pipe r 0.06 via the mud-tank walkway), a small centrifugal trip-tank pump, and a **sight-glass float** with a white index. | float steps | 1k |
| L-16 | **FOSV + wrench + crossovers** | A | floor rack (−2.2, 7.33, −2.6) | FOSV: a ball-valve sub Ø 0.18 × 0.55 (silver, 2 tool-joint ends) standing **open** on a small rack, with a ball-position slot mark. An L-shaped **hex wrench** (0.45 m) hanging on the rack, 2 crossover subs beside it. | none (static, open) | 2k |
| L-17 | **Diverter stage (ghost)** | B | cellar | **Conductor** stub (Ø 0.76 m / 30 in) in the cellar; **diverter housing** (low annular-type, r 0.75, h 0.7) on it; 2 **vent lines** r 0.15 (12 in): line A along −x at z −2.0 to x −42; line B along +x at z −9 to x 45. Each has a hydraulic **full-opening vent valve** (box + actuator) at x ±3.0. Gas plume: 60 hashed sprites (white-grey, opacity 0.25) drifting −x from the line-A outlet. **Ghost mode** for everything else: opacity 0.22, desaturate 70 %, lines in ink. | element squeeze, valve gate, plume | 4k |
| L-18 | **Test plug + test unit + chart recorder** | A (recorder) | plug in the casing head; unit at (−4.2, 0, −6.0), face toward +x/−z | **Test plug:** a cup/hanger-type steel plug (r 0.30, h 0.25, 3 elastomer rings) on a **test joint** of drill pipe, landing in the casing-head bowl. **Test unit:** skid 1.4 × 0.9 × 0.8 with an air-driven pump and a **circular chart recorder** (Ø 0.36 face, glass, paper chart with rings + 60 minute ticks, red ink pen arm on a pivot). | plug descent, pen arm, chart rotation | 5k |
| L-19 | **Stand pull** | B | — | Reuse P2/P3 top drive, elevator, slips and `O.stand` (one stand rising out of the rotary). | block rise | — |

### 2.2 S-set (studio macros, ×8: 1 u = 0.125 m)

| # | Asset | Level | Slot | Spec (S-u) | Moving parts | Tris |
|---|---|---|---|---|---|---|
| S-1 | **Annular half-section** (GK-style) | A | `ANN` | Housing back half: outer r 5.7, y 0–11.6, dome cap. Bore r 1.4. **Conical piston:** inner cone face from r 3.9 (y 3.0) to r 2.6 (y 6.2), with the closing chamber below it (hydraulic fluid #e0a23a, fills purple-tinted when pressurised) and the opening chamber above it. Stroke **0.9 u** (≈ 4.5 in). **Packing element:** rubber #2b2b33 Lathe ring, outer r 3.6, inner r 1.4 (open), h 3.0, centred y 7.6. **12 steel inserts** (I-section fingers, #cbd5e1) embedded, top flange and bottom flange visible in the cut. Morph keys of the element's inner profile: `open`, `on5in` (ID → r 0.5), `onHex` (radial clamp to the hex kelly polygon `r(θ) = 0.53 / cos(((θ mod 60°) − 30°))`), `openHole` (ID → 0, an irregular 6-lobe seam), `strip` (relaxed: ID r 0.5 + 0.04, follows a passing tool joint r 0.67 with 0.15 s lag). Upward bulge of the inner lip ≤ 0.12 u. | piston, element morph, inserts | 14k |
| S-2 | **Annular props** | A | `ANN` | 5 in drill pipe r 0.5 with a **tool joint** r 0.67, L 3.6, with 18° tapered shoulders and a hard-band ring; hex kelly 1.07 u across flats; open-hole state (no pipe). | translate y | 2k |
| S-3 | **Ram cavity section** | A | `RAM` | Ram body slab (x ±5.0, y −1.5…+1.5 cavity, z ≤ 0 back half for the side view; plus a **horizontal cut variant** removing y > 0 for the plan view). Bonnets out to x ±14.4: operating cylinder r 2.2, piston r 2.0, connecting rod r 0.45, lock-screw housing + **handwheel** r 1.6 at x ±15. **Pipe-ram blocks** (#cbd5e1) 3.4 (z) × 2.8 (x) × 2.4 (y), with a **front packer** (rubber, 0.35 deep) and a **top seal** (rubber U-strip across the top), half-moon cut-out r 0.52 (5 in). **VBR blocks:** same envelope, the front packer holds 8 **steel insert segments** that fan (rotate about pins) to fit r 0.44 (3½ in) … 0.63 (5 in). Ram travel 1.5 u each side. Ghost pipes: 5 in (r 0.5) and 3½ in (r 0.44). | blocks, pistons, rods, lock screw (pitch 0.05 u/turn ≈ 0.25 in), inserts | 16k |
| S-4 | **Pressure disc + force arrow** | — | `RAM` | A disc r 1.4 in the bore just under the closed rams (shader fill sweeping centre → rim, #a855f7 at 0.55 alpha), a cased ink 3D arrow (shaft r 0.18, head r 0.5) pointing **up** at the ram underside, and a 6-arrow ring of small up-arrows. | fill, arrow growth | 1k |
| S-5 | **Blind-shear ram section** | A | `BSR` | Body as S-3 (vertical cut, back half). **Upper blade ram** (from −x): blade on its lower front edge, a V-profile 25° with a red edge #ef4444. **Lower blade ram** (from +x): blade on its upper front edge. The blades are **offset vertically 0.25 u** so they pass like scissors. Behind each blade there is a blade seal (rubber) and a face seal that meet after the cut. Hardened-steel look (metalness 0.8). | blocks; seal compression | 10k |
| S-6 | **Shear pipe + particles** | A | `BSR` | 5 in pipe r 0.5 (wall 0.045). **Morph targets:** `round`, `oval60` (60 % flattening within ±0.75 u of the cut plane, smooth falloff), `cutUpper` / `cutLower` (crimped, fish-mouth ends with a burr lip). Pieces split at the cut plane. **Sparks:** InstancedMesh 48 thin quads, additive, colour ramp #ffffff → #ffd27a → #ff6a00 → #5a1a00, life 0.18–0.45 s (hash), launched tangent to the blade edges ±25°, gravity 78 u/s² (9.8 m/s² × 8). **Chips:** 6 dark dodecahedra r 0.05. Tool-joint prop r 0.67 as S-2. | split, drop, sparks | 4k |
| S-7 | **IBOP section** (top-drive main shaft) | A | `IBOP` | Scale ×6 for this slot (1 u = 0.167 m). Shaft half-section OD r 1.0, bore r 0.4, vertical, y 0–12. **Upper IBOP** (y 7–9): ball r 0.55 with a through-bore, seats, crank arms, and an **actuator shell** (sleeve r 1.25) that slides down 0.3 to rotate the ball 90° (remote). **Lower IBOP** (y 2.5–4.5): ball with a hex socket on its side for the wrench, no actuator. Saver sub below. **3D IBOP wrench** (hex key + T-bar). | shell slide, ball 90°, wrench | 6k |

### 2.3 W-set

| # | Asset | Level | Spec | Moving parts |
|---|---|---|---|---|
| W-1 | **Mud column + barrier tint** | B | The existing annulus/bore mud mesh, with a tint uniform (brown #c8925a 0.55 → "barrier" 0.75) and a fill-height uniform. | fill height |
| W-2 | **BOP proxy** | C | The L-1 stack cloned, uniform scale 2.0, base on the W wellhead (0, 8.0, 0); wc highlight. | glow |
| W-3 | **EP04 ghost bubble** | B | One gas bubble (r 0.6, white, purple rim) at the bottom gas layer (y −36); opacity 0 → 0.6 → 0 over 1.0 s. | rise 1 u |
| W-4 | **Float sub cut-away** | A | Above the bit at y −35.6…−34.4, bore r 0.38: a **flapper** (disc r 0.36 on a hinge at the bore wall, spring), seat ring. Flow arrows down (normal) / up (back-flow). | flapper 0–80° |
| W-5 | **Nested casing silhouette** | B | New W variant: 4 nested half-tubes (conductor r 2.6, surface r 2.1, intermediate r 1.7, production r 1.3), shoes stepping deeper (−6 / −14 / −26 / −38). The thin annuli between them are filled grey #94a3b8 at 0.6 ("cement hint", no labels). | tilt only |

### 2.4 2D overlay additions (kit, not 3D)

- floor indicator (§4);
- limit ring "≤ 30 s" (S13);
- status tab "Rig Power: OFF" (S13);
- new line glyphs `cross`, `wrench`, `calendar`;
- `factCard` options `lineAt[]` and `noteAt`;
- callout sub-line swap (S14/S15);
- trip-tank tally ticks (S19).

All follow `design.md`: paper, ink and a purple fill only.

---

## 3. Shot-by-shot

### S1 · 0.0–6.2 · L · Title + hook
- **On screen:** a low golden-hour wide of the land rig from the V-door side. The V-door ramp and pipe racks lead in from the right foreground, and the cellar sits under the floor between the substructure legs. Purple light drains down the stack.
- **Camera:** `cam (26, 3.0, −40) → (20, 3.4, −32) look (0, 5, 0) → (0, 4.4, 0) fov 36 [55 mm], vo [0, −180]`. Push-in 0.0–6.2 with `eio5`.
  - Screen positions: start [floor (540, 464), stack top (540, 755), cellar (540, 1004), accumulator unit (696, 899)]; end [floor (540, 381), stack top (540, 749), cellar (540, 1064)].
  - The derrick rises out of frame behind the title plate (y 196–716).
  - The camera faces +z, so the choke side (−x) is screen-right (§5).
  - Clearance: the path stays at x ≥ 20, y ≥ 3, z ≤ −32: 17 m clear of the pipe racks (x ≤ 3.5) and above the terrain (y −0.35).
- **VO sync:** VO 1 "พาร์ทห้า" @0.6, "เวล คอนโทรล" @3.5–4.9.
- **Beats:**
  - 0.0–1.5: full-colour rig. Agitators turn and the generator exhaust drifts (P1). The rig lights are on (L-10).
  - **1.5–4.0:** the wc highlight sweeps **top → bottom**. Purple fills the bell nipple, then the annular, rams, spool and lower ram (`glow(y) = sstep(top − (t−1.5)·2.2 …)`). The other systems dim to 35 % at the same time.
  - **2.6–4.6:** a soft additive purple "pour" cone (opacity 0.10, no bloom) runs from the rotary opening down into the cellar and fades.
  - 4.0–6.2: everything holds. The purple stays as a flat lift, with no pulsing.
- **Overlay:**
  - `titleCard` 0.4–5.9: kicker "Drilling Rig 101, ตอน 5", `Part 5 of 5`, title "Well Control System", subtitle "BOP, Choke Manifold และ MGS", parts ruler current = 5, colour wc. No hook sheet (the frame below is the hook).
  - No labels.
  - Caption 0–6.2.
- **SFX / music:** the P4 teaser 3-note purple figure resolves in major on the title (0.4). A soft `whoosh` at 0.4 as the plate unrolls. Music level 2.
- **Transition:** 0.25 s ink dip at 6.2 → W.
- **Assets:** rig (existing), L-1, L-10.

### S2 · 6.2–13.2 · W · Barriers: mud first, equipment second
- **On screen:** the earth cut-away of the well: strata, casing, drill string. The mud column is brown. The BOP proxy sits on the wellhead at the top.
- **Camera:** 6.2–9.6: `cam (14, −14, 72) → (11, −10, 60) look (0, −14, 0) → (0, −12, 0) fov 40`, a slow crane (the whole well fits). 9.6–12.0: crane up `→ cam (6, 7, 24) look (0, 6, 0)`, `eio5`. 12.0–13.2: hold with a 2 % push. At the end the BOP proxy is at ≈ (540, 900) **(verify)**.
- **VO sync:** VO 2 "จำคิกจาก อีพีสี่" @6.2–7.6, "ถ้ามัดกันแรงดันไม่อยู่" @8.7, "ด่านที่สองก็คือชุดนี้" @10.8.
- **Beats:**
  - 6.6–7.6: the **EP04 ghost bubble** (W-3) appears at the gas layer, rises 1 u and fades. This is a one-second memory with no SFX except a soft `bubble`.
  - **8.7–9.6:** the mud column brightens from the bottom up (barrier tint), as a fill-height sweep 0 → 1 in 0.9 s.
  - **10.8–11.6:** during the crane up, the BOP proxy lights purple (`eout` 0.5 s).
- **Overlay:**
  - Card "Barriers" 6.4–12.9 (`bottom: 600`): line 1 @7.0, line 2 @10.9, line 3 @11.7.
  - Callouts:
    - "Primary: Mud" (sub "โคลน"), anchored mid-column (1.15, −20, 0.3), tab (700, 880), 8.9–12.0;
    - "Secondary: Equipment" (sub "BOP"), anchored to the proxy top, tab (300, 760), 10.9–13.2. It reads 2.3 s here and is allowed to fade 0.3 s into the dip (exception: the shot ends).
  - The two labels overlap 8.9–12.0, which is within the max of 2.
- **SFX / music:** `blip` on each card line. Music level 2.
- **Transition:** 0.25 s ink dip at 13.2 → L.
- **Assets:** W (existing), W-1, W-2, W-3.

### S3 · 13.2–20.2 · L · BOP = a stack, not one valve
- **On screen:** from the rig floor the camera tilts and cranes down past the V-door edge to ground level. The earth in front of the cellar drops away (section trench) and reveals the whole stack standing in the cellar, with a crew member beside it for scale.
- **Camera:**
  - 13.2–14.8: `cam (−2.2, 10.2, −12.5) look (0, 7.8, 0) fov 40` (the floor, rotary and drill pipe), with a slow tilt down.
  - 14.8–17.0: crane down `→ cam (−1.4, 0.4, −15.0) look (0, 0, 0) fov 50 [39 mm], vo [0, −40]`, `eio5`.
  - 17.0–20.2: hold, push 3 % (z → −14.6).
  - End frame: [annular top (540, 584), VBR (540, 835), spool (540, 1022), casing-head base (540, 1246), kill-side bonnet (285, 919), choke-side bonnet (801, 921), HCR (746, 1024), crew head (258, 1015), feet (259, 1283)].
  - The bell nipple runs up under the card.
  - Clearance:
    - the V-door ramp at z −15 has its bottom at y ≈ 2.9 and lies within |x| ≤ 0.9, while the camera is at x −1.4, y 0.4 — clear;
    - leg (−3.4, ·, −7): ≥ 2.0 away;
    - after 16.4 the camera is in trench air.
- **VO sync:** VO 3 "บี-โอ-พี" @14.3, "วาล์วหลายตัวซ้อนกัน" @15.2, "โบลว์เอาท์" @17.3.
- **Beats:**
  - 13.4–14.8: drill pipe in the rotary. The floor crew stands still, and the slips are set.
  - **16.0–16.6:** the trench reveal (L-4 clip animates). A 2 px ink cut-edge line travels down, with a soft `whoosh` (low-passed).
  - 16.6–17.0: the trench is open, and the stack stands in full height.
  - **15.2–17.0** (@"ซ้อนกัน"): the five pressure devices pick up their purple one after another, top → bottom, 0.12 s apart (a real sequence, so a stagger is allowed). The bell nipple and casing head stay grey.
  - 17.4: the crew member turns his head to look up at the stack.
- **Overlay:**
  - Card "BOP = Blowout Preventer" 13.4–19.9: line 1 @14.0, line 2 @15.4, line 3 @16.8.
  - Callouts: "BOP Stack" anchored to the annular face (−0.6, 1.75, −0.6), tab (760, 720), 17.0–20.2; "Cellar" anchored to the cellar floor corner (2.0, −2.4, −1.0), tab (280, 1180), 17.4–20.4 (it carries 0.2 s into S4 and then exits).
- **SFX / music:** `clunk` (soft) when the trench edge lands at 16.6. The pulse enters at 72 BPM. Music level 2 → 3.
- **Transition:** continuous into S4 (the camera is already in the trench).
- **Assets:** L-1, L-4, L-5, L-10.

### S4 · 20.2–36.8 · L · The lift (top → bottom)
- **On screen:** one continuous vertical dolly down the stack from a 3/4 front-right angle (the choke side is nearer the camera, on screen-right), with a soft stop on each component. The floor indicator and diagram card follow.
- **Camera:** `cam (−2.6, yc + 0.55, −8.4) look (0, yc, 0) fov 36 [55 mm], vo [40, 40]`. The current component sits at screen (580, 1000), spanning ≈ y 849–1150.
  - **Stops** (`yc`, arrival = tier time):

    | t (s) | Stop | yc |
    |---|---|---|
    | 20.2 | bell nipple / flowline | 3.4 |
    | 21.1 | annular | 1.75 |
    | 23.2 | VBR | 0.68 |
    | 26.2 | BSR | 0.0 |
    | 28.6 | spool | −0.7 |
    | 32.3 | lower pipe ram | −1.42 |
    | 34.3 | casing head | −2.1 |

  - Each move takes **0.7–0.9 s, `eio5`**, ending exactly on the tier time, so it departs 0.8 s before.
  - **Spool exception (28.6–31.9):** the camera also dollies back to z −11.0 so both side outlets fit [choke valves ≈ 970, kill valves ≈ 190]. It returns to z −8.4 on the way to the lower pipe ram.
  - Each hold pushes 2 % toward the part.
  - At 8.4 m the bonnet tips crop off the frame edges. That is intended: it gives scale.
  - Clearance: the camera is always inside the trench box (x −2.6, z −8.4/−11.0, y 3.95 → −1.55; trench floor −2.45). The ramp at z −8.4 is at y ≈ 6.7. Leg (−3.4, ·, −7) is ≥ 1.6 away. At 21.5 the camera passes y 0 (ground) inside the clipped volume.
- **VO sync:** VO 4 "แอนนิวลาร์" @≈21.8–22.7, "ไปป์แรม" @≈24.3; VO 5 "ไบลน์ เชียร์ แรม" @25.6–27.9, "สปูล…ทางออกด้านข้าง" @28.0–31.4; VO 6 "ล่างสุดไปป์แรมอีกชุด" @31.7, "หัวหลุม" @≈35.2.
  - The tier times for Annular (21.1), VBR (23.2) and Casing Head (34.3) run ahead of these estimates. Re-time them after measuring the VO (§6).
- **Beats (at each stop):**
  - the current component goes from purple at 0.85 to a full purple lift, and the others drop back to 0.6;
  - a `clunk` (soft, musical "thunk") lands on arrival;
  - the floor-indicator tier and the diagram row light together.
  - **Spool stop:** both outlets glow briefly, the choke outlet first (28.8), then the kill outlet (29.4). The camera's pull-back shows the HCR on the right and the check valve on the left.
  - **Casing-head stop:** the camera settles; the surface-casing stub under the head is visible.
- **Overlay:**
  - **Diagram card** "BOP Stack: บน → ล่าง" 20.4–36.5, at x 150–960, y 252–722: title row, then 6 rows on a 46 px pitch, each with a numbered key 1–6, the label (30/600) and the size text (26/400, right-aligned). Each row reveals at its tier time. The note (26 px, 2 lines) @35.2.
  - Callouts, one per component, each 3.0 s, overlapping the next by ≤ 0.9 s (never more than 2): "Annular Preventer" 21.1–24.1 · "Upper Pipe Ram (VBR)" 23.2–26.4 · "Blind Shear Ram" 26.2–29.2 · "Drilling Spool" (sub "Choke ⟷ Kill") 28.6–32.4 · "Lower Pipe Ram" 32.3–35.3 · "Casing Head" 34.3–37.1 (it exits during the iris).
  - Tabs sit at the right, x 640–940, y 820–900. Leaders run from the component's choke-side face. The anchor is re-projected every frame, and the tab exits before its anchor leaves the subject box.
  - The floor indicator turns on at 20.2.
  - Caption.
- **SFX / music:** `clunk` (soft) on each stop, plus `blip` on each tier row. Music level 3 (sparse pulse).
- **Transition:** iris at 36.8, centred on the casing head (580, 1000) → S ANN.
- **Assets:** L-1, L-2, L-3, L-4, floor indicator.

### S5 · 36.8–43.6 · S ANN · The annular squeezes (5 in pipe, then a hex kelly)
- **On screen:** a clean half-section of the annular: housing, conical piston (yellow-steel), black rubber element with 12 steel inserts, and 5 in drill pipe through the bore.
- **Camera (slot-local):** `cam (6.0, 13.5, 28.5) → (4.8, 12.0, 25.0) look (0, 7.4, 0) fov 34 [58 mm], vo [40, 60]`, push 36.8–43.6 `eio5`. **DOF** focus on the element's cut face (distance ≈ 26 → 24.5), aperture so the back wall of the housing is slightly soft. The element sits ≈ y 900–1100, and the piston is visible below it **(verify)**. Clearance: the camera is 25 u from the housing and outside the studio floor disc (y > 0).
- **VO sync:** VO 7 "แอนนิวลาร์คือยางโดนัทเสริมเหล็ก" @36.8–40.3, "บีบปิดรอบท่อ" @40.3, "แทบทุกรูปทรง" @≈42.0.
- **Beats:**
  - 37.2: the closing chamber tints honey → purple (the hydraulic pulse arrives through the port at the lower right).
  - **38.4–40.4:** the piston rises 0.9 u (rule 3: linear, then eases over the last 25 %). The element's ID morphs `open → on5in`, and the inserts rotate inward up to 18°. **40.2** contact with the pipe; 40.2–40.6 the rubber bulges 0.1 u up at the inner lip and flattens on the pipe; 40.6–41.6 creep.
  - 41.6–42.2: the piston retracts (`ein` 0.6 s) and the element relaxes to `open`. The pipe lifts out of the top of the frame and a **hex kelly** prop slides down in (42.0–42.4).
  - **42.4–43.4** (@"แทบทุกรูปทรง"): a second close `open → onHex`. The rubber wraps the six flats and the inserts stop at the corners. Hold.
  - This deliberately moves the "any shape" demo into S5, because VO 7 says it here. The director put the square shape in S6.
- **Overlay:**
  - Card "Annular Preventer" 37.0–49.8 (x 150–960): line 1 @37.6, line 2 @40.6, line 3 @46.6, note @48.4.
  - Callouts: "Packing Element" (sub "ยาง + Steel Inserts"), anchored to the element cut face (2.4, 7.6, 0), tab (300, 1180), 37.6–41.2; "Piston", anchored to the piston cone (3.3, 4.6, 0), tab (760, 1220), 38.6–42.0. Both are out before the kelly demo.
  - Floor indicator: tier 1 (Annular) lit.
- **SFX / music:** `hiss` 38.4–40.4 (hydraulic), a soft rubber `clunk` at 40.2. Music level 3.
- **Transition:** continuous into S6 (same set, no cut).
- **Assets:** S-1, S-2.

### S6 · 43.6–50.1 · S ANN · Open hole, then stripping
- **On screen:** the same section with the kelly gone and an empty bore. The element closes on nothing. Then pipe with a tool joint is pushed down through the closed, relaxed element.
- **Camera:** continues `→ cam (4.4, 11.6, 23.8) look (0, 7.4, 0)` with a micro push to 47.0. For the stripping, a slow tilt down (look y 7.4 → 6.8) follows the tool joint, 46.4–49.8. DOF focus stays on the element.
- **VO sync:** VO 8 "ไม่มีท่อในหลุมก็ปิดได้" @43.6–46.1, "ค่อยๆ" @46.1, "ดันท่อผ่านได้" @48.3.
- **Beats:**
  - 43.6–44.2: the element opens (piston down) and the kelly lifts out.
  - **44.4–46.0:** **open-hole close**, the deepest squeeze. The piston uses its full 0.9 u stroke and the ID goes to 0 as an irregular 6-lobe seam. The inserts reach their 22° stop and form a steel ring above the rubber, with the extrusion stopped at the ring. 46.0: the hold has a 0.3 % creep.
  - **46.2–46.8:** the closing pressure bleeds down. The piston settles 0.08 u and the element relaxes to `strip` around a 5 in pipe that has just entered from above (the pipe appears from the top of the frame, already inside the relaxed element).
  - **46.8–49.6:** stripping *in*. The pipe moves down at 1.0 u/s. The **tool joint** reaches the element at 47.6: the rubber ID follows the 18° shoulder with a 0.15 s lag and bulges outward, and the piston is pushed back down 0.06 u (displaced fluid) and returns after the joint passes. A few brown droplets weep above the element (the realistic slight leak that lubricates), 47.8–49.0. The joint clears the element at 49.4.
  - The **direction is down** (stripping in, which is what "ดัน" means and the usual well-control case). The director's note said upward; this storyboard changes it on purpose.
- **Overlay:**
  - The card continues (line 3 @46.6, note @48.4).
  - Callouts: "Open Hole" (sub "ไม่มีท่อ"), anchored to the closed seam (0, 8.6, 0), tab (760, 760), 44.4–47.4; "Stripping" (sub "ลดแรงปิด"), anchored to the tool joint (follows it), tab (300, 1220), 46.8–50.0.
- **SFX / music:** `hiss` 44.4–45.6; a soft rubber `clunk` at 45.8; a low rubbery friction rumble (use `vibe`, low) 47.6–49.4. Music level 3.
- **Transition:** iris at 50.1 → S RAM.
- **Assets:** S-1, S-2.

### S7 · 50.1–56.3 · S RAM · Pipe rams meet around the pipe
- **On screen:** a plan section through the ram cavity (top half removed): the bore with 5 in pipe in the middle, two steel ram blocks with rubber front packers waiting in the bonnets on the left and right, and the pistons behind them.
- **Camera:** 50.1–53.2: `cam (0, 30, 11) look (0, 0, −0.3) fov 34, vo [40, 40]`. This is a 70° look-down, not a pure plan, so the block thickness reads. Use `camera.up = (0,1,0)` (no gimbal problem at 70°). Then 53.2–56.3: a slow push to the half-moon, `→ cam (0, 13, 5.5) look (0, 0, 0)`, `eio5`. The bonnet flanges are visible at the frame edges, and the cylinders crop off **(verify)**. DOF focus on the packers. Clearance: the camera is above the cut plane (y 0) by ≥ 13 u.
- **VO sync:** VO 9 "ส่วนแรมคือก้อนเหล็กสองฝั่ง" @50.1–53.1, "ไปป์แรมพอดีกับท่อขนาดเดียว" @53.1.
- **Beats:**
  - 50.4: purple dashes run along both closing hoses into the cylinders; the chambers tint.
  - **50.6 + 0.12 dead time → 50.7–52.6:** both rams travel 1.5 u at constant speed (rule 2), with the tail rods coming out behind.
  - **52.6** contact: the packers meet the pipe and each other. The 4 % bulge is visible at the packer faces. Mechanical stop, shudder, `clunk` (the director's ~53).
  - 53.2–55.4: during the push to the half-moon, the rubber in the cut-out wraps the pipe with no gap.
  - **55.0–56.2:** a ghost **3½ in** pipe (dashed ink outline, 40 % opacity) cross-fades in its place, and a visible crescent gap opens between the pipe and the half-moon (a thin #ef4444 outline on the gap, no text). It fades back to the 5 in pipe at 56.2. The point: "one size".
- **Overlay:**
  - Card "Ram Preventers" 50.3–63.4 (x 150–960): line 1 @53.3, line 2 @57.2, line 3 @59.6, note @61.8.
  - Callouts: "Pipe Ram" (sub "ร่องพอดีท่อ 5 in"), anchored to the left block's top face, tab (300, 1180), 50.9–54.6; "Bonnet", anchored to the right bonnet flange, tab (780, 740), 51.6–55.0.
  - Floor indicator: tier 2.
- **SFX / music:** `hiss` 50.4–50.8, `clunk` at 52.6. Music level 3.
- **Transition:** continuous into S8.
- **Assets:** S-3.

### S8 · 56.3–63.7 · S RAM · VBR inserts, the seal, the ram lock
- **On screen:** the upper cavity's VBR blocks close on 3½ in pipe with steel segments fanning around it. Then the camera orbits down to a side elevation: the front packer and top seal, the bonnet tail and the lock-screw handwheel.
- **Camera:**
  - 56.3–58.6: hold the plan push frame from S7.
  - **58.6–59.6:** orbit down 60° about the bore axis to the side elevation, `cam (5.5, 2.6, 26) look (2.0, 0.6, 0) fov 34` (1.0 s, `eio`, weighted; the camera passes over the cut plane at y 0 with ≥ 2 u clearance).
  - 59.6–61.4: truck right along x to the bonnet tail, `look (12.5, 0, 0)`.
  - 61.4–63.7: truck back to the ram face, `look (1.5, 0.6, 0)`.
  - DOF focus follows the look-at.
- **VO sync:** VO 10 "วี-บี-อาร์" @56.3, "ปิดได้หลายขนาด" @57.4, "แรมล็อก" @59.0, "กันแรมเปิดเอง" @59.7, "ถ้าแรงดันไฮดรอลิกหาย" @≈61.4.
- **Beats:**
  - 56.4: the pipe swaps to 3½ in (cross-fade 0.3 s) and the 5 in rams open off-screen (implied).
  - **56.7–58.4:** the **VBR** blocks close (rule 2). At 57.9 the 8 insert segments fan on their pins, tightening on the smaller OD like a camera iris. Contact at 58.3, `clunk`.
  - **59.0–59.6** (during the orbit): the front packer and **top seal** take a purple lift (emissive +0.35, not a glow halo).
  - **59.8–61.2:** the bonnet tail. The **lock-screw handwheel turns 1.8 turns** at 1.3 turns/s (rule 5: the last turns), the screw advances 0.09 u (1.8 × 0.05), then a **hard shoulder stop** at 61.2 (wheel dead-stops, 1-frame 2° recoil). `ratchet` (NEW) clicks at each half turn, then a `clunk`.
  - **61.4–62.2** (@"ไฮดรอลิกหาย"): the closing chamber's purple tint drains to grey and the hose dashes stop. **The ram does not move** (no motion at all; that stillness is the proof).
  - **62.2–63.6:** a ring of 6 small ink up-arrows rises under the ram (well pressure), and the top seal visibly tightens (compresses 2 %). No label: the card note carries it.
- **Overlay:**
  - The card continues.
  - Callouts: "VBR" (sub "3½–5 in"), anchored to an insert segment, tab (760, 760), 56.8–59.8; "Ram Lock" (sub "ล็อกเชิงกล"), anchored to the handwheel, tab (330, 760), 59.8–63.6.
- **SFX / music:** `hiss` 56.5, `clunk` 58.3, `ratchet` 59.8–61.2, `clunk` 61.2, and a soft air-bleed `hiss` at 61.4. Music level 3.
- **Transition:** continuous into S9 (the camera comes back toward the bore).
- **Assets:** S-3.

### S9 · 63.7–70.6 · S RAM · Wow 1: 10,000 psi ≈ 660 t on a closed ram
- **On screen:** the side section of the closed ram body. The pipe is **hidden** for this shot so the bore under the rams reads as the full 13-5/8 in disc. That matches the card's full-bore area (as for a closed blind ram; with pipe in the hole the force acts on the annulus area, which is why the pipe is removed here). A purple pressure disc fills the bore under the rams, and a huge ink arrow pushes up.
- **Camera:** `cam (2.0, −3.2, 24) → (1.6, −2.6, 21.5) look (0, −0.6, 0) fov 34, vo [40, 120]`, locked with a 10 % push, `eio5`. The camera is slightly below the cavity, looking up, which makes the ram feel heavy. The rams sit at y ≈ 900; the disc and arrow are below them at ≈ 1050–1250 **(verify)**.
- **VO sync:** VO 11 "แรงดันหมื่น พี-เอส-ไอ" @63.7–65.9, "ดันใส่แรมที่ปิดอยู่" @65.9, "แรงกว่าหกร้อยตัน" @68.1.
- **Beats:**
  - 63.8: the pipe fades out (0.3 s).
  - **64.2–65.2:** the pressure disc fills from the centre to the rim (shader sweep), synced with the calc card's count-up 0 → 10,000 psi (1.0 s, `eout`, once).
  - **66.0–66.8:** the 6 small up-arrows appear under the ram undersides, `eout`.
  - **68.2–69.0:** the big force arrow grows from the disc to the ram underside (one draw-on, 0.8 s, `eio`). It is the only large moving element. The rams, of course, do not move.
  - 69.0–70.6: hold.
- **Overlay:**
  - Calc card "แรงบน Ram ที่ปิด" 63.9–70.3 (x 150–960, `bottom: 660`): line 1 @64.4 with the count-up on "10,000 psi" in line 2 @65.2, line 3 "≈ 660 ตัน (แรง)" @68.3, note @69.1.
  - No callouts (it is a calc shot).
  - Floor indicator: tiers 2–3 lit.
- **SFX / music:** low swell; `blip` on each line; a deep sub-thump at 68.3. Strings swell, low end thickens. Music level 4.
- **Transition:** iris at 70.6 → S BSR.
- **Assets:** S-3, S-4.

### S10 · 70.6–77.6 · S BSR · Blind-shear: cut, seal, and the tool-joint limit
- **On screen:** a vertical cut through the BSR cavity. 5 in pipe body sits across the blades. The upper blade ram waits on the left, the lower on the right, with the red blade edges offset.
- **Camera:** `cam (6.0, 4.0, 24) → (4.6, 2.8, 19.5) look (0, 0, 0) fov 32 [63 mm], vo [40, 40]`, push 70.6–73.4 `eio5`, then hold. **73.6: the single impact jolt** (§0.5). 75.0–77.6: tilt up 1.2 u to frame the tool joint. DOF focus on the blade plane.
- **VO sync:** VO 12 "ไบลน์ เชียร์ แรม" @70.6–72.2, "ตัดดริลไปป์ขาด" @72.2–73.5, "แล้วปิดสนิท" @≈73.8–75.0, "แต่ตัดทูลจอยต์ไม่ได้" @75.0.
- **Beats (rule 4):**
  - 71.0: hydraulic pulse into both operators. The closing pressure line flashes brighter (shear bypass: full accumulator pressure, implied, no number).
  - **71.2–72.5:** the rams travel at constant speed.
  - **72.5:** blade contact. **72.5–73.5:** the blades slow to 30 % and the pipe ovalises (`round → oval60`); the steel under the blades brightens (#e5e7eb).
  - **73.6:** fracture. The last 30 % of travel happens in 2 frames, with `impact` (dry metallic). **Sparks** (48) spray along the blade edges in the cut plane, plus 6 chips. Jolt.
  - **73.6–74.0:** the upper pipe stub springs up 0.05 u (released tension) and shows the crimped fish-mouth end (`cutUpper`). The lower piece drops 0.12 u with `ein` (gravity) and stops (it is resting on the closed lower pipe ram below, which is implied).
  - **74.0–74.8:** the blades pass and the blade seal meets the face seal: a normal ram stop (rule 2), `clunk`, rubber squeeze. The bore below takes the purple pressure tint; above it is clear.
  - **75.0–75.3:** a 0.3 s ink dip within the shot, used as a "what if" reset (blades open, pipe whole again, **a tool joint now sits across the blades**).
  - 75.4: a grey **✕** (2D line glyph `cross`, 64 px, ink) is drawn on the tool joint.
  - **76.0–76.9:** the string is **picked up** 1.0 u (`eio`, weighted: a slow start, as from the drawworks) until plain pipe body sits across the blades. The ✕ fades and an ink **check** draws on at 77.0.
- **Overlay:**
  - Card "Blind Shear Ram" 70.8–77.3 (x 150–960): line 1 @72.6, line 2 @75.3, line 3 @76.3.
  - Callouts: "Blind Shear Ram", anchored to the upper blade, tab (300, 760), 71.0–74.6; "Space Out" (sub "ยกท่อให้ใบมีดตรงเนื้อท่อ"), anchored to the pipe body at the blade plane, tab (760, 1200), 75.8–77.6 + exit in the iris. The ✕ / check counts as the second slot (the first label is gone by 74.6).
  - Floor indicator: tier 3.
- **SFX / music:** `hiss` 71.0; `impact` 73.6 (the director's ~74 dry metallic accent; music hits a dry accent on it); `clunk` 74.8; `winch` (short, low) 76.0–76.9; `blip` 77.0. Music level 5.
- **Transition:** iris at 77.6 → L floor.
- **Assets:** S-5, S-6, S-2 (tool joint).

### S11 · 77.6–84.6 · L · The command: driller's panel → Koomey unit
- **On screen:** a macro of the driller's remote panel on the rig floor. Gloved hands press **MASTER** and **Upper Pipe Ram: Close** together. The command dash runs off the floor, down a substructure leg and along the ground to the accumulator unit, where a 4-way valve handle flips by itself. The nameplate is readable.
- **Camera:**
  - 77.6–78.6: `cam (−2.1, 8.55, 1.15) look (−2.2, 8.2, 2.6) fov 40, vo [0, 80]`, locked macro. Clearance: rotary (0, 7.4, 0) r 1.1 is 1.6 away; drill pipe at x 0 is 2.1 away.
  - **78.6–80.8:** a weighted crane-follow of the dash: the camera moves out past the floor edge `→ cam (7.0, 4.0, −15.5) look (3.6, 2.5, −8.0)`, then down `→ cam (6.0, 1.6, −19.8) look (6.0, 1.1, −12.5) fov 40`. This is one centripetal spline, `eio5`. Clearance: the path passes outside the substructure (x 7.0 > 6.6 + 1 at z −15.5; it never crosses the planes x = 3.4/6.6 inside z −7…7); the V-door ramp is ≥ 5 m away.
  - 80.8–84.6: hold on the unit front with a 2 % push (z → −19.6). The nameplate is at ≈ (540, 640), the manifold handles at ≈ y 900, gauges at ≈ y 820 **(verify)**.
- **VO sync:** VO 13 "กดสั่งจากแผง" @77.6–78.9, "แต่แรงดันมาจาก…" @78.9–82.6, "คูมีย์ ยูนิต" @82.6–84.3.
- **Beats:**
  - **77.8:** the left glove presses MASTER (a 4 mm button travel, 0.12 s); **78.1** the right glove presses the function button. The lamp switches green → red. A soft `blip`.
  - 78.3–80.6: the **command dash** (thin, 15 m/s) runs `CMD_PTS`. The camera leads it slightly.
  - **80.6:** on the unit, the "Upper pipe ram" 4-way handle swings from OPEN to CLOSE by itself (air pilot), 0.25 s with a mechanical detent stop, `clunk` (small).
  - 80.8–84.6: hold. The nameplate "namman.story · BOP CONTROL UNIT 3000 PSI" is readable 81.0–84.6 (the director asked for 79–85; it is unreadable during the follow move, so it is held longer at the end). The electric pump motor idles (fan turning slowly; it is in standby). Accumulator gauge needle at 3,000 (rule 6 jitter off).
- **Overlay:**
  - Card "Accumulator (Koomey Unit)" 77.8–91.1 (x 150–960, `bottom: 660`): **note first** "Koomey = ชื่อคน…" @82.8 (@"คูมีย์"); lines @84.9 / @86.9 / @88.8 (S12).
  - Callouts: "Driller's Panel", anchored to the panel face, tab (760, 1180), 77.9–81.0; "Koomey Unit" (sub "Accumulator"), anchored to the manifold panel, tab (300, 1180), 81.0–84.4.
  - Section tab sub → "Accumulator".
- **SFX / music:** `blip` 77.8 / 78.1; `pulse` (light) along the dash 78.3–80.6; `clunk` 80.6. Music level 3.
- **Transition:** continuous push into S12 (the camera moves to the bottle).
- **Assets:** L-7, L-8, L-9.

### S12 · 84.6–91.4 · L · Inside a bottle: N₂ precharge, then charged
- **On screen:** one bottle in half-section beside the manifold gauges. First the bladder (blue-grey N₂) fills the whole bottle; then honey hydraulic fluid is pumped in under it and the bladder shrinks. Three gauges read the story.
- **Camera:** 84.6–85.4 push from the S11 frame `→ cam (5.6, 1.35, −15.0) look (5.2, 1.15, −12.7) fov 36 [55 mm], vo [0, 60]`, then locked with a 2 % drift. The bottle is at the screen left-centre, the accumulator gauge at the upper right, the manifold gauge below it. **DOF** rack: 84.6–86.4 focus on the bottle (distance 2.3); 88.6 rack to the gauges (2.0); 90.0 rack to the manifold gauge. Clearance: the camera is 1.6 m in front of the unit face (z −13.4); the trench edge (x 3.2) is 2.4 m away.
- **VO sync:** VO 14 "ไนโตรเจนรองไว้พัน" @84.6–86.5, "อัดน้ำมันไฮดรอลิกจนถึงสามพัน" @86.5–90.1, "พี-เอส-ไอ" @90.1.
- **Beats:**
  - 84.6–85.0: the bottle front shell fades to its half-section (0.4 s) with a purple rim on the cut. To show precharge, the system is in its **pre-charge state**: no fluid, the bladder at 100 %, and the anti-extrusion poppet closed.
  - 85.0: the accumulator gauge needle at **1,000** (it swings in from 0 with rule-6 overshoot as the state is "connected", 85.0–85.5).
  - **86.5–89.8:** the electric pump starts (motor spin-up 0.4 s, `pump` stroke ticks). The poppet opens. Fluid rises from the bottom, and the **bladder shrinks from 100 % → 33 % of the bottle** following Boyle, so pressure rises *faster near the end*: `P(t) = 1000 / V(t)` with V falling linearly. The needle tracks P (1,000 → 3,000) with pump-rate jitter.
  - **89.8:** the pressure switch cuts the pump out. The needle overshoots 3 % and settles at 3,000 (rule 6). The motor spins down over 0.6 s.
  - **90.0–90.6:** the manifold (regulated) gauge needle rises 0 → **1,500** with rule-6 overshoot.
- **Overlay:**
  - Card lines: line 1 "ถัง N₂ Precharge 1,000 psi" @84.9, line 2 @86.9, line 3 "ไนโตรเจนเท่านั้น ห้ามใช้อากาศ" @88.8.
  - Callouts: "N₂ Precharge", anchored to the bladder, tab (760, 1200), 85.0–88.4; "3,000 psi" (sub "Accumulator"), anchored to the gauge needle hub, tab (300, 760), 88.2–91.4.
- **SFX / music:** a soft gas `hiss` at 85.0; `pump` strokes 86.5–89.8; `clunk` (pressure switch) at 89.8. Music level 3.
- **Transition:** 0.25 s ink dip at 91.4 → S13a.
- **Assets:** L-7.

### S13 · 91.4–98.2 · L · Wow 2: the rig goes dark, the BOP still closes
Three linked beats. This is the emotional centre of the episode.
- **S13a · 91.4–92.7 · exterior wide.**
  - Camera: `cam (34, 6.0, −30) → (32, 6.2, −28) look (0, 6, 0) fov 38`. The camera faces +z; the rig lights read against the dusk sky **(verify)**.
  - Beats:
    - **91.9** (@"ไฟดับ"): every rig light, the doghouse glow and the derrick lights go out (L-10) with **one 1-frame flicker** at 91.9 and a 0.12 s decay. L exposure −0.25 EV.
    - The generator exhaust stops and the drawworks and pumps begin a 1.5 s spin-down.
    - `powerdown` (NEW: the generator hum cut plus a falling whine), then **near-silence** from 92.0 (music drops out).
- **S13b · 92.7–93.6 · the unit, in the dark.**
  - Camera: the S12 bottle framing, slightly wider: `cam (5.8, 1.45, −15.6) look (5.4, 1.2, −12.7) fov 36`.
  - Beats:
    - **92.75:** a `hiss` as the bottles **discharge**. The bladder in the cut bottle expands from 33 % → ≈ 50 % (fluid pushed out through the poppet).
    - The accumulator needle drops and settles **well above a red tick at 1,200** (rule 6; no reading is called out).
    - A purple hydraulic pulse leaves the hose-bundle outlet.
    - The pump motor stays still: **no power, and it is not needed**.
- **S13c · 93.6–98.2 · the trench.**
  - Camera: `cam (−1.2, 0.9, −9.2) → (−1.0, 0.8, −8.6) look (0, 0.4, 0) fov 40, vo [0, 20]`. The hose junction on the cellar +x wall is in the soft foreground at screen-left.
    - **Rack focus** 93.7–94.2 from the hoses (distance 7) to the VBR cavity (distance 9).
    - The VBR cavity is shown in **x-ray mode** (body window 35 %).
    - Clearance: the camera is in the trench box; the cellar wall cut is at z −2.35.
  - Beats:
    - **93.7–94.2:** purple dashes run up the hoses into both VBR bonnets (12 m/s, since this is a wide).
    - **94.2 + 0.12 → 94.3–94.9:** the rams travel (rule 2) and the tail-rod indicators slide out. **Contact at 94.9**, `clunk`, shudder. The director's ~94 is close enough.
    - 95.0–98.2: hold in the dark. Only the purple stack is lit; the rest stays at the 35 % dim plus the darker exposure.
    - **95.0:** the pulse (music) returns, warm.
- **Overlay:**
  - Card "Closing Time (API 53)" 91.6–97.9 (x 150–960): line 1 @92.4, line 2 @93.4, line 3 @95.2, note @96.4.
    - Optional script tweak: swap lines 1 and 2 so the "power off" line comes first with the VO.
  - **Status tab** "Rig Power: OFF" (paper tab, no leader, ink text, a grey band instead of purple) at (60, 660), 92.0–95.4. It persists across the S13a/b/c cuts and counts as label 1.
  - **Limit ring** (2D, label 2), 94.2–98.2: an ink circle r 70 at (840, 760) with a purple arc drawn on to a full ring (0.5 s `eio`) and "≤ 30 s" (34/600) inside. At **94.9**, as the rams stop, an ink check draws on beside it.
    - The ring is **not proportional to time**. A stopwatch fraction would imply a typical closing time, which is [U] and banned. It reads as "the limit, and we are inside it". This is a deliberate change from the director's "ring completes".
  - Caption.
- **SFX / music:** `powerdown` 91.9; silence 92.0–94.9 (only `hiss` 92.75 and `pulse` 93.7); `clunk` 94.9; the music pulse returns at 95.0. Music level 5 → 0 → 4.
- **Transition:** 0.25 s ink dip at 98.2 (the lights stay off for the rest of the episode except S24–S25, where dusk is enough).
- **Assets:** L-1 (x-ray), L-7, L-8, L-10.

### S14 · 98.2–104.4 · L · Choke line: manual inner valve, HCR outer
- **On screen:** a close 3/4 view of the spool's choke side (screen-right of the stack): the inner manual gate valve with its big handwheel facing us, then the HCR with its hydraulic actuator, then the targeted tee turning the line back.
- **Camera:** `cam (−0.6, −0.25, −3.8) → (−0.75, −0.3, −3.4) look (−1.2, −0.72, 0) fov 34, vo [−40, 80]`, a slow push 98.2–104.4 (`eio5`). The manual handwheel is at the left-centre and the HCR at the right-centre **(verify)**. DOF focus on the manual wheel 98.2–101.6, rack to the HCR 101.8. Clearance: the camera is at z −3.4 in the trench box; the handwheel (z −0.55) is 2.9 away; the cellar floor is −2.4.
- **VO sync:** VO 16 "ท่อโช้กมีวาล์วสองตัว" @98.2–100.5, "ตัวในหมุนมือ" @100.5–101.8, "ตัวนอกคือ เอช-ซี-อาร์" @101.8–104.1.
- **Beats:**
  - 98.4: both valve bodies fade to their half-sections (0.4 s). Inner gate: nearly open (gate 92 % up); HCR gate: **closed**. This is the normal line-up: the inner manual valve open, the HCR shut.
  - **100.4–101.6** (@"หมุนมือ"): a gloved hand (L-9 hands, one) turns the handwheel **the last 1.25 turns** at 1.1 turns/s. The gate rises the matching 0.24 in (0.006 u, visible in the half-section because the gate top and seat align) to the **full-open shoulder** (hard stop at 101.5). Then the standard **¼-turn back-off** (101.5–101.7). `ratchet`, then a `clunk` at the shoulder.
  - **102.4:** the HCR's open-side hose gets a purple dash; actuator chamber tint; dead time.
  - **102.6–103.8:** the HCR gate rises at constant speed (time-compressed; travel 0.107). Its **position-indicator rod** slides out 0.11 and it stops mechanically.
  - 103.8: the first **gas bubble** (white, purple rim) leaves the spool outlet and slides through both open bores toward the tee (0.8 u/s).
- **Overlay:**
  - Card "Choke & Kill Lines" 98.4–111.5 (x 60–960; the floor indicator is gone from here): line 1 @98.9, line 2 @104.8, line 3 @108.6, note @110.2.
  - Callouts: "Manual Valve" (sub "ตัวใน, หมุนมือ"), anchored to the handwheel hub, tab (300, 1200), 98.7–101.9; "HCR" (sub "Hydraulic gate valve"), anchored to the actuator, tab (780, 760), 101.7–108.0. **Its sub-line swaps to "เปิดสุด / ปิดสุด" at 104.6** as a text change inside the tab, cross-faded 0.3 s.
  - Section tab sub → "Choke & Kill".
- **SFX / music:** `ratchet` 100.4–101.5, `clunk` 101.5, `hiss` 102.4, `clunk` 103.8, a soft `bubble` 103.8. The flowing arpeggio starts at 98.2. Music level 3.
- **Transition:** continuous into S15.
- **Assets:** L-2, L-9 (hand).

### S15 · 104.4–111.8 · L · HCR is on/off; the kill line pumps in
- **On screen:** the HCR shuts and reopens: two states and nothing between. Then the camera trucks across the front of the stack to the kill side (screen-left), where mud is pumped through the check valve into the spool below the closed rams.
- **Camera:**
  - 104.4–107.0: hold the S14 end frame.
  - **107.0–108.6:** truck right→left in the trench `→ cam (0.75, −0.3, −3.6) look (1.2, −0.72, 0)` (1.6 s, `eio5`). The stack's lower body passes in the foreground and the cellar back wall shifts slower behind it (parallax).
  - 108.6–111.8: push 4 %.
  - Clearance: the truck path is at z −3.4…−3.6, ≥ 2.8 from the stack's front face (z −0.43) and ≥ 2.9 from the valve handwheels.
- **VO sync:** VO 17 "เอช-ซี-อาร์ เปิดสุดหรือปิดสุดเท่านั้น" @104.4–108.4, "ส่วนท่อคิลไว้สูบโคลนเข้าหลุม" @108.4–111.5.
- **Beats:**
  - **105.0–105.6:** the HCR closes (gate down, rod in), then **105.9–106.5** opens again. The gate never pauses mid-stroke: each stroke is constant speed with a mechanical stop and a `clunk`. Gas bubbles stop and start with it.
  - 107.4 (during the truck): the closed VBR rams above are shown in x-ray for 1 s so "below the closed BOP" reads.
  - **108.4:** the kill-line gate at the pump tee (7.2, 0.6, 4.4) opens off-screen (implied; `clunk` far).
  - **108.6–111.4:** a brown mud ribbon arrives along the kill line in **3 pulses per pump stroke** (triplex pulsation). The **check-valve flapper** swings open to 65° and flutters ±3° at the stroke rate. Mud enters the spool and flows **down into the annulus** (an x-ray of the spool and lower body: brown arrows going down past the lower pipe ram).
- **Overlay:**
  - The card continues.
  - Callouts: "HCR" continues to 108.0; "Kill Line" (sub "สูบเข้า Annulus"), anchored to the check-valve body, tab (300, 760), 108.5–111.8.
- **SFX / music:** `clunk` ×2 (105.6, 106.5); `pump` (distant, low) 108.6–111.4; `flow` 108.8. Music level 3.
- **Transition:** 0.25 s ink dip at 111.8 → S16.
- **Assets:** L-2, L-3, L-6.

### S16 · 111.8–119.2 · L · The choke manifold does the throttling
- **On screen:** a low tracking shot along the choke line at ground level from the +z side, with substructure legs sliding through the foreground. Then the remote adjustable choke in half-section, its needle closing on the seat. Then the remote choke panel on the rig floor.
- **Camera:**
  - **111.8–113.4:** parallax track `cam (−2.5, 1.6, 10.5) → (−6.8, 1.9, 11.0) look (−2.0, 0.8, 4.0) → (−9.6, 1.6, 4.6) fov 36`. The bubble rides the line at about 3.5 u/s with the camera leading it slightly. Legs (−3.4 / −6.6, ·, 7) pass between the camera and the line as foreground wipes, each ≤ 0.3 s. Clearance: the camera at z ≥ 10.5 is 3.5 m outside the leg line z 7; the worker at (−8.5, 0, 9.5) is 1.8 m from the track end.
  - **113.4–116.2:** push `→ cam (−9.0, 2.0, 8.2) look (−10.5, 1.6, 5.0) fov 34`, onto the front-branch choke (z 5.0). DOF focus on the trim (distance 3.5). Clearance: the worker at (−10.5, 0, 6.5) is to the camera's right, 2.1 m away, and is in frame as a foreground silhouette (good, for scale).
  - **116.2:** dip cut → **116.2–119.2:** the remote choke panel on the floor, `cam (4.2, 8.6, −3.0) look (2.6, 8.3, −3.0) fov 36`, locked with a 2 % push. Clearance: the iron roughneck at (4.0, 7.45, 0) is 3.0 m away; the rack stands at z −3.3 x ≥ 0.9 are behind the console.
- **VO sync:** VO 18 "ตัวคุมแรงดันจริงๆ" @111.8–114.3, "คือโช้กปรับรูได้" @114.3, "บนโช้ก แมนิโฟลด์" @116.7.
- **Beats:**
  - 111.8–113.4: bubble along the line, purple arrows revealing behind it.
  - **113.6:** the choke body fades to its trim half-section (0.4 s). The flow ribbon (brown + bubbles) passes the needle.
  - **114.4–116.0:** the needle advances into the seat in **3 small steps** (an operator nudging the lever), each 0.3 s with a 0.2 s pause. The orifice goes from about 60 % to 25 % open and the indicator scale on the actuator moves with it (3D ink scale, no number called out). Downstream: the flow narrows, speeds up and becomes turbulent; **the bubbles expand ×1.6 after the trim**. The needle stays clear of the seat (there is never a full seal, which supports card line 3).
  - **116.4–119.0 (panel):** the drill-pipe and casing gauge needles make small corrections (rule 6, no numerals on the faces). The stroke counters roll (out of focus). The choke-position gauge eases from 60 → 25 % in sync with the steps just shown (a replay feel). The open/close lever nudges back to neutral at 117.2 (spring return).
- **Overlay:**
  - Card "Choke Manifold" 112.0–118.9: line 1 @112.5, line 2 @116.5, line 3 @117.3, note "Kill ตาม EP04…" @118.1.
  - Callouts: "Adjustable Choke" (sub "หรี่รู ไม่ปิดสนิท"), anchored to the needle, tab (300, 1200), 113.2–116.2; "Choke Panel" (sub "บนพื้นแท่น"), anchored to the panel face, tab (760, 760), 116.2–119.2.
  - Section tab sub → "Choke Manifold".
- **SFX / music:** `bubble` 112.0–113.4; `flow` (rising pitch) 114.4–116.0 with 3 small `blip`s on the needle steps; panel `blip` at 117.2. Music level 3.
- **Transition:** 0.25 s ink dip at 119.2 → S17.
- **Assets:** L-6, L-11, L-12.

### S17 · 119.2–126.4 · L · Mud gas separator → flare
- **On screen:** the tall orange MGS, cut open on its left-front quarter, with the stencil on the right-front still readable. Slugs of gas-cut mud slam into the target plate, cascade down the baffles, and gas bubbles rise and burst. The camera then follows the gas up and out to the flare in the far background.
- **Camera:**
  - **119.2–122.4:** `cam (−7.0, 4.4, 25) → (−7.6, 4.3, 23.2) look (−14.0, 4.4, 4) fov 34, vo [−170, −210]`, a push.
    - The MGS fills the left column [vessel top ≈ (370, 343), bottom ≈ (370, 1194), inlet ≈ (507, 855), stencil ≈ (435, 740)].
    - The right column is the card.
    - The camera faces −z; the stack is not in frame, so the choke-side rule does not apply (§5).
    - Clearance: leg (−6.6, ·, 7) is 16 m away; the worker is 17 m away.
  - **122.4–124.2:** a tilt up and a weighted **pan left** `look → (−24.0, 4.0, 4)` (1.8 s, `eio5`) following the vent line. **Rack focus 123.0–123.8** from the MGS (21 m) to the flare (≈ 35 m), which lands in the frame's upper-left third.
  - **124.2–126.4:** pan back down `look → (−14.0, 2.0, 4.6)` to the vessel bottom and liquid outlet, and focus back to 21 m.
- **VO sync:** VO 19 "จากโช้ก" @119.2, "มัดปนแก๊สเข้าเอ็ม-จี-เอส" @120.0, "แก๊สไปเผาที่แฟลร์" @122.8, "มัดกลับลงถัง" @124.7.
- **Beats:**
  - 119.4: the shell window opens (crossfade 0.6 s + purple rim draw-on).
  - **120.0–122.4:** slug flow from the inlet (rule 7), alternating mud and gas every 0.4–0.7 s. Each slug hits the **target plate** with a splash (12 mud droplets, 0.3 s) and runs down the 5 baffles as a thin sheet. Bubbles break out of the sheet, rise through the headspace and burst at the liquid level (y 3.2) with rings. A gentle foam band sits on the surface.
  - **The stencil "namman.story" is readable 120.0–126.0** (the director asked for 120–126).
  - **122.4–124.2:** gas (faint white streaks, opacity 0.3) travels up the vent line and along it. **123.4:** gas reaches the flare: the pilot flame **grows to a steady flame** over 0.6 s (rule 8), leaning downwind (−x). The wind sock in frame (if visible on the crown) points the same way.
  - **124.7–126.2:** the camera returns to the bottom: mud leaves the vessel bottom through the U-tube (brown arrows) toward the tanks (`MGSR_PTS`).
- **Overlay:**
  - Card "Mud Gas Separator", **right-column variant** x 560–960, y 252–820, 119.4–133.1: line 1 @122.9, line 2 @124.8, line 3 @129.6, note @131.2.
  - Callouts: "MGS" (sub "Mud Gas Separator"), anchored to the vessel's cut rim, tab (620, 1000) (just under the right-column card, so the leader stays short), 120.0–123.2; "Flare", anchored to the flame base, tab (300, 1240), 123.0–126.4. They overlap ≤ 0.2 s.
  - Section tab sub → "Mud Gas Separator".
- **SFX / music:** `bubble` (dense) 120.0–122.4; `fire` (soft, steady) from 123.4 with a warm music swell; `flow` 124.7. Music level 4.
- **Transition:** continuous push into S18.
- **Assets:** L-13, L-14.

### S18 · 126.4–133.4 · L · Wow 3: a 5 psi seal made of mud
- **On screen:** a close view of the vessel's lower half and the outside U-tube mud leg (half-section, mud visible). An ink dimension line runs from the bottom of the U to the crest. The small low-pressure gauge is on the shell, and an ink arrow (gas pressure) presses on the liquid surface inside.
- **Camera:** `cam (−9.6, 2.0, 17.0) → (−10.0, 1.9, 15.8) look (−14.0, 1.8, 5.0) fov 34, vo [−170, 40]`, a slow push `eio5`. The U-tube from the bottom to the crest spans ≈ y 700–1260; the gauge is at the upper right of the vessel **(verify)**. DOF focus on the U-tube (distance 11.5). Clearance: the MGSR return line at z 11 lies along x −14 → +9 at y 1.5. The camera at y 1.9, z 15.8 is 4.8 m from it.
- **VO sync:** VO 20 "ที่กันแก๊สไว้คือมัดในท่อตัวยู" @126.4–129.5, "รับได้แค่ราวห้า" @129.5, "พี-เอส-ไอ" @132.1.
- **Beats:**
  - **126.8–127.8:** the **dimension line** (cased ink, two end ticks) draws on from the U bottom (y 0.25) to the crest (y 3.25), `eio` 0.45 s, then holds.
  - **128.0–130.0:** a pressure push. The ink gas arrow grows on the vessel's liquid surface; **the vessel level drops 0.3 u while the outlet-leg level rises 0.3 u** (U-tube balance, `eio` 1.2 s), and it stays **far above the bottom of the U**. The seal holds.
  - The gauge needle on the shell sits low (vent-line friction) with a ±2 % flicker as slugs arrive. **It stays below the red band at 5.**
  - **130.0–131.6:** the vent line gets a purple lift (its large bore is the reason back-pressure stays low). A brief bubble stream rises up it.
  - 131.6–133.4: hold. The levels relax back (`eio` 1.0 s).
- **Overlay:**
  - The card continues (right column).
  - Callouts: "Mud Leg ~10 ft" (sub "≈ 5 psi"), anchored to the dimension line midpoint, tab (300, 1240), 126.9–130.4; "Vent Line" (sub "ท่อใหญ่ 8–12 in"), anchored to the vent pipe where it leaves the top (the top is out of frame, so anchor where the vent enters the frame edge (−14.7, 6.0, 4)), tab (300, 680), 130.0–133.4.
- **SFX / music:** a soft `bubble` bed; `blip` on the dimension line. Music level 3.
- **Transition:** 0.25 s ink dip at 133.4 → S19.
- **Assets:** L-13.

### S19 · 133.4–139.6 · L · Trip tank: does the hole take the right fill?
- **On screen:** first on the rig floor: the top drive lifts a stand out of the hole. Then the narrow trip tank, its sight glass and float. The level steps down once as the hole is filled, and lands exactly on the calculated mark.
- **Camera:**
  - **133.4–135.2:** `cam (5.2, 9.2, −6.4) look (0, 10.5, 0) fov 40`, a slow tilt up with the stand. Clearance: the camera is on the floor slab top (y 7.33) + 1.9; the iron roughneck (4.0, 7.45, 0) is 6.4 m away; the V-door edge at z −7.7 is 1.3 m away; the camera is within the floor footprint (|x| < 7.5).
  - **135.2:** dip cut → **135.2–139.6:** `cam (30.2, 3.0, 1.2) → (29.8, 2.9, 0.6) look (28.1, 2.6, −4.9) fov 36`, a push. The sight glass is centred, with the full tank height ≈ y 700–1260 **(verify)**. Clearance: the camera is 5.5 m in front of the tank at y 3.0; pump P4 is at z 7.2, and the camera at z 1.2 is between the tanks (z −1) and the pump (z ≥ 6). Check the walkway at tank C (x 21.5–27 front z −1): x 30.2 is outside.
- **VO sync:** VO 21 "ส่วนตอนทริปท่อ" @133.4, "ทริป แท้งค์" @135.0, "คอยวัดว่าเติมมัดลงหลุมครบไหม" @136.1.
- **Beats:**
  - 133.6–135.2: the block rises (P2 hoist assets) and one stand comes out of the rotary. The slips are set at 135.0 (`clunk`).
  - **136.2–137.6:** the trip-tank pump runs and the **float drops one step** (the volume of one stand of steel) with an `eio` 1.0 s descent and a 2 % liquid slosh. A dashed ink **calculated mark** (2D tally tick beside the glass) has been on since 135.8.
  - **137.9:** the float settles **on** the calculated mark, and an ink check draws on beside it. `success`.
- **Overlay:**
  - Card "Trip Tank" 133.6–139.3 (x 60–960): line 1 @134.1, line 2 @136.6, line 3 @137.6.
  - Callout: "Trip Tank" (sub "ถังแคบ มีสเกล"), anchored to the sight glass, tab (300, 760), 135.4–139.6. The tally tick and check count as label 2.
  - Section tab sub → "Trip Tank".
- **SFX / music:** `winch` (soft) 133.6–135.0; `clunk` 135.0; `flow` 136.2; `success` 137.9 (the director's ~138). Music level 3.
- **Transition:** 0.25 s ink dip at 139.6 → S20.
- **Assets:** L-15, L-19.

### S20 · 139.6–145.2 · L → S IBOP · Valves inside the string: IBOPs on the top drive
- **On screen:** the red top drive high in the derrick. Then an iris into a half-section of its main shaft: the upper IBOP ball turns closed (remote), and the lower IBOP takes a wrench.
- **Camera:**
  - **139.6–141.0 (L):** `cam (2.2, 19.6, 2.4) → (1.9, 19.4, 2.0) look (0, 19.0, 0) fov 36`, a push onto the shaft below the gearbox. Clearance: inside the derrick (half-width ≈ 3.05 at y 19.6); kelly-hose points (2.6, 17.2, 0.95) and (1.5, 18.4, 0.6) are ≥ 1.6 away; the guide rail at z −1.25 is 3.8 away.
  - **141.0:** iris → **141.0–145.2 (S IBOP):** `cam (3.0, 7.0, 16) → (2.6, 6.4, 14.5) look (0, 6.0, 0) fov 32, vo [40, 60]`, a push. Upper IBOP ≈ y 850, lower ≈ y 1150 **(verify)**. DOF focus on the upper ball 141.0–143.2, rack to the lower 143.2.
- **VO sync:** VO 22 "ข้างในดริลสตริงก็มีวาล์วนะ" @139.6–142.5, "ไอ-บี-โอ-พี" @142.5, "บนท็อป ไดรฟ์" @143.7.
- **Beats:**
  - 140.0: the top drive is still (not rotating; we are in a well-control state).
  - **141.6–142.6:** the upper IBOP's actuator shell gets a purple dash and slides down 0.3 u (constant speed, mechanical stop). The cranks turn the **ball 90°** and the bore rotates out of line (closed). `clunk`.
  - **143.4–144.2:** the **3D IBOP wrench** moves into the lower IBOP's hex socket (one `eout` move, 0.4 s) and stays seated. The lower IBOP stays **open**: it is the manual back-up.
- **Overlay:**
  - Card "ปิดข้างในก้านเจาะ" 139.8–151.8 (x 60–960): **note first** "BOP ปิด Annulus · วาล์วเหล่านี้ปิดใน Drill String" @140.4; line 1 @142.4; line 2 @145.6; line 3 @149.5.
  - Callouts: "Upper IBOP" (sub "Remote"), anchored to the ball, tab (760, 780), 141.6–144.8; "Lower IBOP" (sub "Manual"), anchored to the socket, tab (300, 1220), 142.8–145.2. The 2D `wrench` glyph next to the tab is not used: the 3D wrench is the mark.
  - Section tab sub → "Inside the pipe".
- **SFX / music:** `hiss` 141.6; `clunk` 142.6; a small metallic `clunk` 144.2. Light, tidy music. Music level 2.
- **Transition:** iris at 145.2 → L floor.
- **Assets:** S-7, top drive (P3).

### S21 · 145.2–152.1 · L → W · FOSV ready and open; float valve above the bit
- **On screen:** a low dolly across the rig floor to the FOSV standing **open** on its rack with its wrench. Then a fast dive down the string (W) to the float sub above the bit, where the flapper slams shut on back-flow.
- **Camera:**
  - **145.2–148.9 (L):** `cam (−4.6, 7.9, −5.6) → (−4.0, 7.85, −4.9) look (−2.2, 7.75, −2.6) fov 36`, a low slow dolly with the drill pipe in the soft background (DOF focus on the FOSV, 2.8 m). Clearance: the floor top is 7.33, so the camera is 0.5 above it; the doghouse (x −7.4…−3.4, z 2.5…7.5) is clear (camera z ≤ −4.9); the rack stands at x ≥ 0.9 are clear.
  - **148.9–149.4:** a dip with a 0.2 s motion-blur streak (as P4's dive) → **W**: `cam (2.2, yd + 1.4, 9.5) look (0, yd − 0.8, 0)`, yd from −20 to −34.6, `eio`.
  - **149.4–152.1:** `cam (3.4, −34.6, 11) look (0, −35.0, 0) fov 34`, locked macro of the float sub (cut-away, W-4).
- **VO sync:** VO 23 "เอฟ-โอ-เอส-วี" @145.2, "เปิดค้างไว้บนพื้นแท่น" @146.7, "โฟลต วาล์ว" @149.1, "อยู่เหนือบิท" @150.4.
- **Beats:**
  - 145.4–148.8: the FOSV's ball slot mark points along the bore (open). The wrench hangs beside it. Nothing moves: **readiness is the message**.
  - **149.4–150.2:** normal down-flow pushes the flapper open (80°), with brown arrows down.
  - **150.3:** the pumps stop. **150.4:** back-flow arrows (brown with a gas bubble) push up from the bit. The **flapper swings shut** in 0.12 s (spring + back-flow) and seats with a 1-frame rebound of 2°. `clunk`. The back-flow arrows stop at the flapper.
- **Overlay:**
  - The card continues (line 2 @145.6, line 3 @149.5).
  - Callouts: "FOSV (Open)" (sub "พร้อมขันเข้า"), anchored to the valve body, tab (760, 780), 145.5–148.9; "Float Valve" (sub "Check valve"), anchored to the flapper, tab (760, 780), 149.1–152.1.
- **SFX / music:** `whoosh` (short) 148.9; `flow` 149.4; `clunk` 150.4. Music level 2.
- **Transition:** 0.25 s ink dip at 152.1 → L ghost.
- **Assets:** L-16, W-4.

### S22 · 152.1–159.2 · L (ghost) · Top hole: the diverter
- **On screen:** a memory of an earlier stage of the well. The BOP stack lifts away as a ghost, a wide conductor and a low diverter take its place, and the rig is ghosted around it. Shallow gas arrives; the diverter closes as the downwind vent valve opens; gas leaves along the vent line far from the rig.
- **Camera:**
  - **152.1–154.6:** `cam (−1.4, 1.2, −11.0) look (0, −0.6, 0) fov 44` (the S3 end frame, closer).
  - **154.6–157.4:** crane up and back `→ cam (16, 26, −40) look (−14, 0, −2) fov 40`, `eio5`. The camera now faces toward −x/+z: the vent line A runs away to the upper left toward the flare side, and the wind sock is in frame top-left **(verify)**.
  - 157.4–159.2: hold.
  - Clearance: the crane path leaves the trench at y 0 at x −1.4, z −11 (inside the clip box), then rises clear of the V-door ramp (at z −15 the ramp top is y ≈ 4.7; the camera passes that z at y ≈ 9).
- **VO sync:** VO 24 "หลุมตื้นเสี่ยงแชลโลว์ แก๊ส" @152.1–154.9, "ใช้ไดเวอร์เตอร์" @154.9, "เบี่ยงแก๊สออกห่างแท่น" @156.6.
- **Beats:**
  - **152.2–152.9:** ghost transition. The rig goes to ghost mode (opacity 0.22, desaturated), the BOP stack rises 1 u and dissolves, and the conductor and diverter fade in solid (`eout` 0.6 s).
  - **153.0–154.8:** shallow-gas bubbles rise in the conductor annulus, seen through an x-ray dashed section of the ground.
  - **154.9:** the **vent valve on line A opens first** (gate up, 0.4 s). **155.1:** the diverter element closes (a small annular squeeze, rule 3). The flow path is never blocked.
  - **155.4–158.8:** gas travels along line A (white streaks) and exits at x −42 as a grey-white plume that drifts further −x (downwind; the wind sock agrees). Line B's valve stays closed.
- **Overlay:**
  - Card "Diverter" 152.3–158.9: line 1 @152.8, line 2 @155.6, line 3 @157.0, note @157.9.
  - Callouts: "Diverter" (sub "บน Conductor"), anchored to the housing, tab (760, 1200), 155.0–158.0; "Vent Line" (sub "ออกห่างแท่น"), anchored to line A at x −20, tab (300, 760), 156.4–159.2.
  - Section tab sub → "Diverter".
- **SFX / music:** a soft `whoosh` (reverse feel) on the ghost transition 152.2; `bubble` 153.0; `clunk` 154.9 / `hiss` 155.1; `flow` (airy) 155.4–158.8. Music level 2–3.
- **Transition:** 0.25 s ink dip at 159.2 → L (ghost off).
- **Assets:** L-17, L-14 (sock).

### S23 · 159.2–166.1 · L · Testing: test plug, chart recorder, weekly function test
- **On screen:** in the trench, the test plug is run down into the casing head (x-ray) and lands. Then a circular chart recorder in the foreground, with the stack soft behind: the pen draws a low step, then a high step, and holds flat. Then a function test: the rams open and close with no pressure.
- **Camera:**
  - **159.2–160.6:** `cam (−1.0, 0.2, −10.0) look (0, −1.4, 0) fov 40` (the stack's lower half in x-ray).
  - **160.6:** dip cut → **160.6–166.1:** `cam (−2.4, 1.15, −8.2) look (−3.9, 1.05, −6.1) fov 34` with the chart face ≈ 420 px wide at screen centre **(verify)**. Clearance: the camera is 2.5 m from the test unit at (−4.2, 0, −6.0); it is outside the trench at |x| = 2.4 < 3.2, so it is in trench air at y 1.15 above ground. That is legal; the trench lip is below the camera.
  - **163.3–163.9:** **rack focus** to the stack behind (distance 9.5) for the function test.
- **VO sync:** VO 25 "ทดสอบแรงดันทุกไม่เกินยี่สิบเอ็ดวัน" @159.2–163.0, "และทดสอบเปิดปิดทุกสัปดาห์" @163.0.
- **Beats:**
  - **159.4–160.2:** the test plug on its test joint descends through the open stack (x-ray), slowing for the last 0.1 u, and **lands** in the casing-head bowl at 160.2 (`clunk`; the elastomer rings squeeze 3 %).
  - 160.4: the pipe rams close on the test joint (x-ray, rule 2).
  - **160.8–161.6:** the **low test**. The air pump strokes (`pump`, light), and the pen arm swings from the zero ring to a shaded **250–350 band** and holds flat, while the chart rotates through its minute ticks (time-compressed).
  - **162.0–162.6:** the **high test**. The pen climbs to an outer ring (no number called out) and **holds flat** through the ≥ 5-minute arc to 163.0. The pen flutters ±0.5 % only, and there is no drop: a good test.
  - 163.0–163.3: bleed off. The pen returns to zero (`hiss`).
  - **163.4–165.8:** **function test** (rack focus to the stack). Purple hose dashes; the upper pipe ram's tail rods go in (open) then out (close); the annular cycles. Each motion follows rule 2/3, without well pressure.
- **Overlay:**
  - Card "BOP Testing (API 53)" 159.4–165.8: line 1 @159.9, line 2 @161.4, line 3 @163.2, note @164.4.
  - Lines 2 and 3 carry a small `calendar` line glyph at their left (in place of the director's two "chips", so the frame stays at 1 card + 2 labels).
  - Callouts: "Test Plug", anchored to the plug (in x-ray), tab (760, 760), 159.5–160.9. It exits at the cut, so it shows only 1.4 s, which breaks the ≥ 3 s rule. Fix: move the cut to the recorder from 160.6 to 162.4 and run the low test (160.8–161.6) in the x-ray frame with a small 2D pen inset, **or** accept the exception. "Chart Recorder" (sub "Low → High"), anchored to the pen hub, tab (300, 1220), 160.8–164.0.
  - Section tab sub → "Testing".
- **SFX / music:** `clunk` 160.2; `pump` (light) 160.8–162.6; `tick` (NEW, soft) on chart ticks; `hiss` 163.0; `clunk` ×2 on the function test. Ticking motif. Music level 2.
- **Transition:** 0.25 s ink dip at 166.1 → S24.
- **Assets:** L-18, L-1 (x-ray).

### S24 · 166.1–172.4 · L · Five systems, one rig
- **On screen:** a high dusk aerial from far along +x, with the rig compressed by a long lens. The five systems light one by one in their own colours.
- **Camera:** 166.1–171.0: crane-out `cam (112, 34, −14) → (150, 56, −20) look (−2, 13, 1) → (−2, 14, 1) fov 26 → 22 [≈ 93 mm], vo [0, −380]`, `eio5`. 171.0–172.4: hold.
  - End frame: [TD (563, 395), floor (562, 801), cellar (562, 1041), tank A (641, 1094), tank C (590, 1250), pump (201, 1231), choke (486, 863), MGS (502, 675), flare (609, 611), generators (855, 779), accumulator unit (936, 1068)].
  - The crown is under the recap card.
  - Clearance: open air, 100+ m from everything.
- **VO sync:** VO 26 "ครบห้าระบบแล้ว" @166.1, "พาวเวอร์" @167.4, "ฮอยสติ้ง" @168.1, "โรเทติ้ง" @168.9, "เซอร์คิวเลติ้ง" @169.6, "เวล คอนโทรล" @170.9.
- **Beats:**
  - 166.1: all tags at 35 %.
  - Lights, each a 0.4 s `eout` lift to 0.85 in its colour, each landing on its word: **167.4 Power** (gensets, SCR house, cables) · **168.1 Hoisting** (drawworks, blocks, derrick lines) · **168.9 Rotating** (top drive, drill pipe, rotary) · **169.6 Circulating** (pumps, standpipe, hose, tanks, shaker, trip tank) · **170.9 Well Control** (BOP, choke line, manifold, MGS, flare line, accumulator).
  - **171.2:** all five hold together; `success`.
  - The rig lights stay off (continuity from S13); the dusk sky carries the frame.
- **Overlay:**
  - Recap card "Drilling Rig 101: 5 ระบบ", compact top variant x 60–960, y 176–380 (title 64/600 and **5 colour chips in one row**; the two `lines` are not drawn because the chips carry the names). Each chip reveals on its system's word, as a real sequence. 166.3–172.1.
  - No callouts.
  - The section tab is hidden from 166.1.
- **SFX / music:** five rising notes, one per chip; `success` 171.2. Full theme. Music level 5.
- **Transition:** continuous into S25.
- **Assets:** all highlight tags.

### S25 · 172.4–177.4 · L · Follow
- **On screen:** the same aerial, holding while the five colours ease to 40 %.
- **Camera:** drift `cam (150, 56, −20) → (146, 55, −19.5)`.
- **VO sync:** VO 27 (reused) "กดติดตามไว้" @172.4, "เพื่อไม่พลาดตอนต่อไปนะครับ" @173.7.
- **Beats:** 172.4–173.4: the highlight eases to 40 %.
- **Overlay:**
  - `ctaFollow` 172.6–176.9 (sheet y 440–1040, avatar `assets/avatar.png`, headline "กดติดตาม", line "namman.story"), with **clickAt 174.2**.
  - Caption 172.4–177.4.
- **SFX / music:** the click is the kit's built-in sound; music ducks under the CTA. Music level 3.
- **Transition:** 0.3 s grey-tinted dip (#94a3b8 at 0.4 over ink) at 177.4 → W.
- **Assets:** avatar (existing).

### S26 · 177.4–183.6 · W · Teaser: casing & cementing
- **On screen:** the nested casing silhouette (W-5): concentric half-tubes stepping deeper, with thin grey cement between them. There are no labels and no facts.
- **Camera:** `cam (9, 6, 30) → (7, −14, 26) look (0, 4, 0) → (0, −20, 0) fov 40`, a slow tilt and crane down, 177.4–183.0, `eio5`.
- **VO sync:** VO 28 starts at **177.2** in `script.json`, 0.2 s before this cut (see §6). "เคซิ่ง แอนด์ ซีเมนติ้ง" @179.6–181.9.
- **Beats:**
  - The casing strings reveal outer → inner (stagger 0.12 s, a real sequence) 177.6–178.4.
  - The cement annuli fill grey from the shoes upward 179.6–181.4 (soft, 1.8 s `eio`).
  - **Fade to ink 183.0–183.6.**
- **Overlay:**
  - `nextTeaser` 177.4–182.7: "ตอนต่อไป →", title "Casing & Cementing", sub "ท่อกรุ, ซีเมนต์หลุม", colour **#94a3b8**. The right-hand "Part n of 5" is replaced by "EP.06", and the **parts ruler is hidden** (the series of 5 is complete).
  - Caption 177.4–183.3.
- **SFX / music:** a soft `whoosh` 177.4; the theme fades out from 182.0. Music level 2 → 0.
- **Transition:** fade to ink, end.
- **Assets:** W-5.

---

## 4. Floor indicator (2D, 20.2–77.6)

- A narrow stack silhouette on a paper strip, x 60–130, y 300–900, with 7 tiers drawn top → bottom in the §5.1 order: bell nipple (always grey #cfc6b4 outline only), then Annular, VBR, BSR, Spool, Lower pipe ram, and casing head (grey).
- Each tier is an ink outline in its true relative height. The double-ram body reads as one box split by a hairline.
- The **current tier is filled purple** (fill only, ink outline kept). Visited tiers are `paper2`, and later tiers are paper.
- It changes at the S4 tier times, then: S5–S6 Annular; S7 VBR (upper cavity); S8–S9 VBR; S10 BSR. It hides at 77.6 (`ein` 0.3 s).
- There is no text inside; at 70 px wide it is a pictogram. It is UI, not a label.
- Cards during 20.2–77.6 use x 150–960 so they never touch it.

---

## 5. Continuity rules

### 5.1 Stack order and geometry (L, 1 u = 1 m). Never change between shots.

| # top → bottom | Component | World y (L) | Highlight colour | Notes |
|---|---|---|---|---|
| 0 | Bell nipple + flowline outlet | 2.5 → 6.4 (flowline at 6.0) | grey #9ca3af, **never purple** | not a pressure device |
| 1 | **Annular preventer** (5M) | 1.05 → 2.5 (centre 1.75) | purple | GK-like dome |
| 2 | **Upper pipe ram (VBR)**, upper cavity of the double body | 0.68 | purple | bonnets ±x |
| 3 | **Blind-shear ram**, lower cavity of the same double body | 0.0 (double body −0.4 → 1.05) | purple, red blade edges in macros | bonnets ±x |
| 4 | **Drilling spool** | −1.0 → −0.4 (centre −0.7) | purple | **choke outlet −x, kill outlet +x** |
| 5 | **Lower pipe ram** (single body) | −1.85 → −1.0 (centre −1.42) | purple | bonnets ±x |
| 6 | **Casing head** | −2.4 → −1.85 | steel grey | on the cellar floor |

API code (for the diagram note only): `10M – 13-5/8 – R-S-Rd-A`, read bottom-up.

### 5.2 Choke right, kill left

- **The choke outlet is always on screen-right and the kill outlet on screen-left.**
  - L: the stack is filmed only from the **−z half-space** (camera forward z-component > 0). In that half-space world −x maps to screen-right, so the choke side (−x) is on the right. Every shot in this file that shows the stack (S1, S3, S4, S13c, S14, S15, S22, S23) has its camera at z < 0.
  - S: studio cameras sit at +z, so the choke side is modelled at **+x** in the studio (as in EP04's B set). Every studio model that has side outlets puts the choke at +x.
  - Any frame where the stack is ≥ 150 px tall and the choke appears on the left is a continuity error.
  - S24/S25 are far aerials where the stack is < 80 px, so they are exempt. S24's camera is still at z < 0.
- Choke-side valve order from the spool outwards: **manual (inner) → HCR (outer) → targeted tee**. Kill side: **manual (inner) → check valve (outer) → kill line**.
- The active choke branch on the manifold is the **front branch z = 5.0** (remote choke); the back branch z = 3.0 is the manual choke.

### 5.3 State continuity

| Item | State |
|---|---|
| HCR | closed until 102.6; open 103.8–105.0; closed 105.6–105.9; open from 106.5 onward |
| Inner manual choke valve | open throughout (the last 1¼ turns happen in S14) |
| Upper pipe ram (VBR) | closed from 94.9 (S13) through S15 (x-ray views); open again by S23's start (the test sequence closes it at 160.4 and cycles it 163.4–165.8) |
| Rig lights | on 0–91.9, off from 91.9 to the end |
| Exposure | −0.25 EV from 91.9 to 166.1; S24–S25 back to the normal dusk preset, with the rig lights still off |
| FOSV | always **open** |
| Lower IBOP | open |
| Upper IBOP | closed from 142.6 (S20 only) |
| Wind | **+x → −x everywhere**: flare lean, diverter plume, wind sock |
| Crew member in the cellar | present S3–S4 only (removed from S13 on, so the dark cellar reads as "remote, no hands") |
| Choke-manifold worker | always present at (−10.5, 0, 6.5) |

### 5.4 Colours (3D)

- Well control #a855f7.
- Recap: Power #f59e0b, Hoisting #3b82f6, Rotating #ef4444, Circulating #14b8a6.
- Mud #c8925a; gas #f8fafc with a purple rim; nitrogen #9fb3c8; hydraulic fluid #e0a23a; rubber #2b2b33; steel inserts and rams #cbd5e1; cut steel #e5e7eb; BSR blade edge #ef4444; teaser and cement #94a3b8.
- Purple is the *only* glow-like lift, and it is a flat emissive lift, not a bloom halo (LOOK glow threshold ≥ 0.86 keeps it under the bloom).

### 5.5 Overlay continuity

- The section tab label is always "Well Control" (index "P5"). Only the sub changes: BOP Stack (13.2) → Accumulator (77.6) → Choke & Kill (98.2) → Choke Manifold (111.8) → Mud Gas Separator (119.2) → Trip Tank (133.4) → Inside the pipe (139.6) → Diverter (152.1) → Testing (159.2). It is hidden at 166.1. It is absent in S1.
- Callout numbering keys (`n`) are used only in S4 (1–6, matching the diagram rows and the floor indicator).

---

## 6. Timing issues found in `script.json` (for the director / VO)

1. **VO 28 starts at 177.2**, but the teaser card, the caption and the director's section 20 start at 177.4. The VO leads the picture by 0.2 s. Recommend `vo[28].t = 177.4, end = 182.9`: VO 27 ends at 176.9, so the gap becomes 0.5 s, and it still ends before the 183.0 fade. Otherwise cut S26 at 177.2.
2. **Window rates above the director's ≤ 9.0 chars/s claim** (spaces excluded):
   - VO 2: 68 chars / 6.7 s = **10.1**. The TTS text "ด่านที่สองก็คือ…ครับ" is longer than `text_display`.
   - VO 20: **9.4**.
   - VO 26: **10.8**.
   At the measured 13 chars/s they all still fit, so this is a documentation mismatch, not a hard failure.
3. **VO 26 TTS text uses English names** ("พาวเวอร์ ฮอยสติ้ง โรเทติ้ง เซอร์คิวเลติ้ง และเวล คอนโทรล"). Director §10 and `text_display` say the Thai names (ต้นกำลัง ยก หมุน ไหลเวียนโคลน ควบคุมหลุม). One of the two must change. The storyboard syncs to the TTS words.
4. **VO 18 `text` vs `text_display`.**
   - The TTS line lacks "…ให้แรงดันก้นหลุมคงที่" (the display line and caption have it), and says "ตัวคุมแรงดันจริงๆ" where the display says "ตัวคุมแรงดัน".
   - Its window rate is only 6.8, so either add the clause to the TTS (it would become about 9.7 chars/s in the window but fits the real TTS speed) or align `text_display`.
5. **The diagram tier times run ahead of their spoken words.**
   - Annular 21.1, while "แอนนิวลาร์" is at ≈ 21.8 (at 13 chars/s) to ≈ 22.7 (window-proportional).
   - Upper pipe ram 23.2, while "ไปป์แรม" is at ≈ 23.0–24.3.
   - Casing head 34.3, while "หัวหลุม" is at ≈ 34.9–35.6.
   Re-time them to measured onsets − 0.15 s. The BSR (26.2), spool (28.6) and lower pipe ram (32.3) times are fine.
6. **Total VO characters are 1,620** (with spaces), not the 1,616 stated in director §10.
7. **Label holds below 3 s that the timing forces:** "Secondary: Equipment" (S2) and "Casing Head" (S4) end on a shot cut. "Test Plug" (S23) is cut short by the cut to the recorder; the shot notes give the fix.
8. **Card notes that must reveal before their lines** because of the VO order: Accumulator (Koomey note @82.8 with VO 13, while lines 1–3 belong to VO 14) and "ปิดข้างในก้านเจาะ" (note @140.4). `factCard` needs `noteAt` / `lineAt`.
9. **Content flags (not timing):**
   - The card line "หนักรวมหลายสิบตัน" (BOP card) is a weight claim. Total stack weight is [U] in research; the phrase is vague, but confirm with research or drop it.
   - The existing MGS stencil text "MAX 150 PSI" contradicts the "few psi" story. It is replaced in L-13.

---

## 7. SFX cue list (for `music.js`)

The cue names are from the existing set. **NEW** marks a sound the music agent needs to add.

| t (s) | Cue | Note |
|---|---|---|
| 0.4 | whoosh | title |
| 6.6 | bubble | EP04 ghost |
| 7.0, 10.9, 11.7 | blip | card lines (and every card line below) |
| 16.6 | clunk (soft) | trench lands |
| 21.1, 23.2, 26.2, 28.6, 32.3, 34.3 | clunk (soft thunk) + blip | lift stops |
| 38.4 | hiss | annular closing |
| 40.2 | clunk (rubber) | contact |
| 44.4 | hiss | open-hole close |
| 47.6 | vibe (low) | stripping friction |
| 50.4 | hiss | rams |
| 52.6 | clunk | ram contact |
| 58.3 | clunk | VBR |
| 59.8–61.2 | **ratchet (NEW)** | lock screw |
| 61.2 | clunk | shoulder |
| 61.4 | hiss (bleed) | |
| 68.3 | low thump (music) | 660 t |
| 71.0 | hiss | |
| 73.6 | **impact** | shear cut |
| 74.8 | clunk | seal |
| 76.0 | winch (short) | space-out |
| 77.8, 78.1 | blip | two-hand press |
| 78.3 | pulse | command |
| 80.6 | clunk (small) | 4-way valve |
| 86.5–89.8 | pump | charge pump |
| 89.8 | clunk | pressure switch |
| 91.9 | **powerdown (NEW)** | hum cut, then silence |
| 92.75 | hiss | bottles discharge |
| 93.7 | pulse | hydraulic |
| 94.9 | clunk | rams close |
| 100.4–101.5 | ratchet | handwheel |
| 101.5 | clunk | shoulder |
| 102.4 | hiss | HCR |
| 103.8 | clunk + bubble | HCR open |
| 105.6, 106.5 | clunk | HCR toggle |
| 108.6–111.4 | pump (distant) + flow | kill line |
| 112.0 | bubble | choke line |
| 114.4–116.0 | flow + 3 blips | choke steps |
| 120.0–122.4 | bubble (dense) | MGS |
| 123.4 | fire (soft, steady) | flare |
| 124.7 | flow | mud out |
| 133.6 | winch (soft) | stand |
| 135.0 | clunk | slips |
| 137.9 | success | trip tank check |
| 141.6 | hiss | upper IBOP |
| 142.6 | clunk | upper IBOP |
| 144.2 | clunk | wrench |
| 148.9 | whoosh | dive |
| 150.4 | clunk | float valve |
| 152.2 | whoosh (soft) | ghost |
| 154.9 / 155.1 | clunk / hiss | diverter |
| 155.4 | flow | gas vent |
| 160.2 | clunk | test plug |
| 160.8–162.6 | pump (light) + **tick (NEW)** | chart |
| 163.0 | hiss | bleed-off |
| 163.4, 164.6 | clunk | function test |
| 167.4 → 170.9 | 5 rising notes (music) | recap |
| 171.2 | success | recap |
| 174.2 | (kit click) | CTA |
| 177.4 | whoosh (soft) | teaser |

There is no `alarm` anywhere in this episode: the mood is control.
