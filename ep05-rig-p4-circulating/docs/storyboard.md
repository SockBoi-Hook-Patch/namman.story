# Storyboard / previs: Drilling Rig 101 · EP.05 · Part 4/5: Circulating System

1080x1920 (9:16) · 30 fps · 170 s · timing source: `docs/script.json` · treatment: `docs/director.md` · facts: `docs/research.md`.
System colour **teal #14b8a6** (`SYSCOL.circ`); return-leg mud **#c8925a**; teaser purple **#a855f7**.

---

## 0. Conventions (read first)

**Sets** (same `OFF` pattern as Part 3):

| Set | Offset | Source |
|---|---|---|
| **L** rig | (0, 0, 0) | Part 3 `buildLand` + `buildMudSystem` + `buildWellControl` + `buildPower` + `buildDrawworks` + `buildHoistExtras` + `buildRotateRig`, plus the NEW L-assets below |
| **W** well cutaway | (5000, 0, 0) | port EP03 `buildWell` + `mudPathW` + constants (`RH 1.6, RC 2.0, Y_SHOE -14, YB -38.4, YBT -36.4, Y_COL -28, Y_TOP 8, RP 0.5, RPI 0.38, RCO 0.8`). The cut plane is z = 0. The camera is always at +z. |
| **S** studio | (0, 0, -5000) | Part 3 studio floor disc (r 120 around x 30). New studio models sit at the slots below. Hide every S sub-group that is not in shot (`group.visible`). |

**Studio slots (S-local):** `PUMP_A` (100, 0, 0) · `PUMP_B` (100, 0, 40) · `WASH` (60, 0, 40) · `CAB` (20, 0, 40). These are at least 40 units from the Part 3 kelly/string/bit props.

**Camera notation:** `cam (px,py,pz) → look (tx,ty,tz) fov` in set-local coordinates. Model-local cameras for studio models are given relative to the model origin. `vo [dx,dy]` means the look-at point lands at screen (540+dx, 960+dy). Implement it as `camera.setViewOffset(W, H, -dx, -dy, W, H)`, the same mechanism as EP03 `placeCam(..., vo)`. Moves use `eio` (ease-in-out cubic) unless noted. "Hold" means the camera keeps drifting at no more than 2 % of the distance, so nothing looks frozen. Several L cameras were checked with a pinhole projection; the screen positions given in [brackets] are those results.

**Screen layout (all shots unless noted):**

| Element | Box (px) |
|---|---|
| Chapter pill "P4 Circulating System" (small pill only, never the big variant) | x 70, y 166–220 |
| Loop mini-map | x 770–950, y 168–348 |
| Fact card (3 lines, h 232) | x 70–950, y 372–604. Calc card with note: y 372–650 |
| 3D subject box | y 640–1280, x 60–960 |
| Callout pills | inside the subject box; **no more than 2 new labels at once** |
| Captions | y 1310–1560 (TH line + EN line) |
| Solids section (106.5–137.7) | funnel diagram at left x 60–410, y 380–900; stage card at right x 430–950, y 380–640 (28 px body font); 3D subject at `vo [120,80]` |

Card lines reveal one at a time, 0.8 s apart (use `t0+0.5+i*0.8`, which slows the Part 3 `factCard` timing).

**The drop (hero), `O.drop`:** an emissive teal sphere with an additive halo sprite, a 12-sample fading trail (InstancedMesh), and a 2D overlay ring (teal stroke, r 22 px, pulsing) drawn at `proj(drop)` whenever it is on screen. The ring keeps the drop visible against teal geometry.

| Set | Drop radius | Halo radius |
|---|---|---|
| L | 0.22 | 0.7 |
| W | 0.24 | 0.8 |
| S pump (1 u = 6 in) | 0.18 | 0.5 |
| S wash | 0.16 | 0.45 |

**Drop "dirt state" `dirt ∈ [0,1]`:** the colour lerps from teal #14b8a6 (dirt 0) to #c8925a (dirt 1). Up to 14 satellite specks orbit at r 1.4× drop size, in three sizes (big/med/small), plus 3 white gas micro-bubbles and the cutting chip (orange-brown dodecahedron, 0.6× drop size, #b45f2a).

| From | dirt | What the drop carries |
|---|---|---|
| down leg | 0 | clean teal; adds a "pressure shimmer" (scale 1 ± 0.06 at 8 Hz) |
| after bit (82.2) | 1 | chip + all specks + bubbles |
| after shaker (112.5) | 0.7 | chip and big specks gone |
| after degasser (120.5) | 0.6 | bubbles gone |
| after desander (125.0) | 0.4 | medium specks gone |
| after desilter (129.2) | 0.2 | small specks thinned |
| after centrifuge (135.0) | 0 | clean teal |

**Highlight mode:** reuse Part 3 `applyHighlight` with `focusAt → ['circ', 0.8]` from 8.6 to 153.4, so circ meshes glow and the rest dims to about 35 %. Switch to `['wc', 0.85]` from 161.3. Tag every NEW L-asset `SYS.cur = 'circ'`. The trip tank is tagged circ too.

**Flow ribbons:** the Part 3 `O.arrows` InstancedMesh gets per-instance colour.

- Teal arrows on every path segment the drop has passed (reveal by arc length, like EP03 `revealDN`).
- Return segments use #c8925a.
- Return segments after the centrifuge turn teal.

---

## 1. One-page summary

| # | Time (s) | Set | Shot | Camera | Drop beat | Card / overlay |
|---|---|---|---|---|---|---|
| 01 | 0.0–8.0 | L | Dusk wide, low, backlit rig | slow push-in | pops out of the active tank at 6.0 | Title (0.4–7.8) |
| 02 | 8.0–15.7 | L | Crane to high aerial; teal loop line draws | crane up, hold | hovers over tank C | Circulating System (8.6–15.4); mini-map builds |
| 03 | 15.7–19.0 | L | Tank row → active tank C + trip tank, stencil | lateral dolly, hold | sinks into the suction | Mud Tanks (16.2–22.4) |
| 04 | 19.0–22.5 | L | Charge pump cutaway | push-in | spins through the impeller | (card continues) |
| 05 | 22.5–29.7 | S PUMP_A | Triplex overview, 3 pistons in sequence | 3/4 high, slow orbit | rides into the fluid end | Triplex Mud Pump (23.0–29.4); nameplate |
| 06 | 29.7–37.5 | S PUMP_B | Single-cylinder section, liner swap | locked + micro push | sucked in, squeezed out | Liner Size (30.2–37.2) + seesaw |
| 07 | 37.5–45.5 | S PUMP_B | Dampener bladder + pop-off | tilt up | passes under the dampener | Pump Safety (38.0–45.2) + pressure trace |
| 08 | 45.5–53.5 | S PUMP_B | Liner macro with D/L arrows | locked-off | parked (dimmed) | Calc card (46.0–53.4) + counter + gauge |
| 09 | 53.5–57.2 | L | Standpipe manifold on the floor | slow push | through the valve block | Standpipe (54.0–61.2) + SPP needle |
| 10 | 57.2–61.5 | L | Climb up the standpipe | crane alongside | climbs y 7.75 → 23.5 | (card continues) |
| 11 | 61.5–69.5 | L | Kelly hose + top drive moving | slow arc | runs the hose, reaches the gooseneck | Rotary / Kelly Hose (62.0–69.2) |
| 12 | 69.5–76.9 | S WASH | Gooseneck + washpipe cutaway | push-in, tilt down | gooseneck → washpipe → rotating shaft | Gooseneck + Washpipe (70.0–76.6) |
| 13 | 76.9–80.6 | W | Dive down the drill string | follow-dive | fast plunge with speed lines | Bit Nozzles card starts 77.4 |
| 14 | 80.6–83.7 | W | Bit close-up, 3 jets | push-in | blasts out of a nozzle | Bit Nozzles (77.4–83.4) + SPP split bar |
| 15 | 83.7–90.7 | W | Up the annulus with a cutting | crane up (follow) | slower climb, dirt 1 | Annulus (84.2–90.4) + ring inset |
| 16 | 90.7–94.6 | L | Under the floor: bell nipple | locked, pan left | rises out of the bell nipple | Return Line (91.2–98.4) |
| 17 | 94.6–98.7 | L | Flowline outside the substructure | follow pan | slides down by gravity | (card continues) |
| 18 | 98.7–106.5 | L | Flow paddle macro + gauges | locked macro | deflects the paddle | Flow Check (99.2–106.2) + Flow In/Out gauges |
| 19 | 106.5–113.9 | L | Possum belly → shaker | slow push | screened; chip walks off | Funnel tier 1 + Shale Shaker card |
| 20 | 113.9–121.7 | L | Vacuum degasser cutaway | push + shell opens | thin film; bubbles leave | Degasser bubble icon + Vacuum Degasser card |
| 21 | 121.7–125.6 | L | Desander cones cutaway | push | vortex; sand out of the apex | Tier 2 + Hydrocyclones card |
| 22 | 125.6–129.7 | L | Desilter cones cutaway | truck right | small vortex | Tier 3 (card continues) |
| 23 | 129.7–137.7 | L | Decanting centrifuge cutaway | push, hold | cleaned to teal, splashes into tank C | Tier 4 + Centrifuge card |
| 24 | 137.7–145.7 | S CAB | Driller's chair over-shoulder, screen | slow push | none (icon on screen) | Driller Monitors (138.2–145.4) + screen UI |
| 25 | 145.7–153.7 | L | High aerial; loop closes | slow crane-in | one fast lap, splash | Recap (146.2–153.4); ring pulses |
| 26 | 153.7–161.3 | L | Aerial hold, dusk | drift | idle bob in tank | CTA (154.2–161.0) |
| 27 | 161.3–165.0 | L | Cellar: BOP glows purple | push-in | none | Teaser card (161.8–169.0) |
| 28 | 165.0–170.0 | L | Choke manifold + MGS, purple | lateral drift | none | (teaser continues); logo fade from 169.3 |

**28 shots.** Transitions:

- Most cuts use the house 0.25 s navy dip (`fade(ctx,t,tc,'#06101e')`).
- L ↔ macro cutaways use a **soft circular iris** (radius 0 → 1300 px over 0.5 s, centred on the drop's screen position).
- No whip pans.

---

## 2. NEW 3D assets, in priority order

All assets are low-poly, built from primitives with the Part 3 helpers (`add`, `box`, `cyl`, `xCyl`, `zCyl`, `cylBetween`, `pipeRun`, `strip`, `labelTex`).

**Cutaway technique (no CSG, no clipping planes needed):**

- Tubes and shells use `CylinderGeometry(..., openEnded, thetaStart, thetaLength = π)` half-shells, with DoubleSide and the inner face 25 % darker, open toward the camera.
- Blocks with cavities are an `ExtrudeGeometry` of the cross-section `Shape` with `holes`, extruded toward -z from the cut face at z = 0.
- To "open" a closed unit on camera, crossfade a full shell (opacity 1 → 0 over 0.6 s) that sits over the half-shell, and flash a 2 px teal outline along the cut edge.

| P | Asset | Set / position | Low-poly spec | Moving parts | ~lines |
|---|---|---|---|---|---|
| 1 | **Drop + trail + dirt satellites** | all | Icosahedron(1,2) basic #14b8a6. Additive halo sprite (CircleGeometry, opacity 0.45). Trail: InstancedMesh of 12 spheres with fading scale. Satellites: InstancedMesh of 14 dodecahedra (#6b5a48 / #8a6a4a / #a07850). Chip: Dodecahedron #b45f2a. Bubbles: 3 white spheres. | position from per-section path functions; colour by `dirt`; satellites orbit at 2 rad/s | 70 |
| 2 | **Loop path + drop path polylines** | L | `DROP_DN` = DN_PRE rerouted through the charge pump (§2 #5) + standpipe manifold + `O.hose` + `[0,20.6,0] → [0,7.4,0] → [0,-1,0]`. `DROP_RET` = see §3 shots 16–23. "X-ray hole" line (depthTest false, dashed, opacity 0.5): (0,-1,0) → (0,-20,0) → (0.6,-20,0) → (0.6,4.8,0). The loop line itself is a TubeGeometry r 0.09 basic teal with `drawRange` growing. | reveal by arc length | 60 |
| 3 | **Triplex section `PUMP_B`** (single cylinder, 1 u = 6 in) | S (100,0,40) | Axis along x, cylinder axis at y 2.0, cut face z = 0. **Fluid-end block**: Extrude of the cross-section x -5.4..-3.0, y -0.4..4.4 with holes: chamber 1.6×1.2 at (-4.2, 2.0), suction port r 0.45 y 0.2–1.4, discharge port r 0.45 y 2.6–4.4. Depth 1.2, steel #a3acb9, cavity walls #475569. **Liner**: half-shell bore r 0.5 (6 in), OD 0.7, x -3.0..0, #e5e7eb. Alternates: bore r 0.583 (7 in) and r 0.375 (4½ in). **Piston**: disc r = bore, w 0.45, rubber ring #f97316 + steel hub; rod r 0.14 to x +3.5. **Suction valve**: disc r 0.42 h 0.12 on seat torus at y 1.35, stem + 3-turn spring. **Discharge valve**: same, seat at y 2.95. **Suction manifold**: half-pipe r 0.5 along z at y -0.6 (filled with teal mud). **Discharge**: half-pipe r 0.4 up to y 4.9, then along -x to x -9. **Pulsation dampener** on the discharge at x -5.6: neck cyl r 0.3 y 4.9–5.4, half-shell sphere r 1.1 at (-5.6, 6.4), #dc2626 (matches the rig dampener). Inside: half-shell rubber bladder r 0.9 #334155; N₂ fill sphere r 0.85 #bfdbfe, opacity 0.55, with canvas text "N₂". **Pop-off valve** at (-7.6, 4.9): red box 0.5×0.7×0.5, internal disc + spring (half-section), vent pipe r 0.12 up to y 6.2 then -x off frame, with a 2D arrow "→ ถัง". | piston `x = -1.4 - cos θ` (θ = crank angle; the forward stroke moves toward -x). Suction valve lifts 0.25 while ẋ > 0, discharge valve lifts 0.25 while ẋ < 0. Bladder scale `1 - 0.07*pulse`. Pop-off disc lifts 0.2 only in the 43.0–44.4 demo. Liner/piston radius morph over 0.6 s. | 120 |
| 4 | **Triplex overview `PUMP_A`** (1 u = 6 in) | S (100,0,0) | Axis x. Skid 12×0.4×4.4 at y 0.2 (#334155). **Power end**: open-top tub (bottom + 4 walls 0.15 thick, h 2.0) x -1.6..4.0, z -2..2, blue #1d4ed8. **Crankshaft**: axis z at (2.4, 2.4, 0), r 0.22, L 4.2, 3 crank pins at z -1.3/0/1.3 offset r 1.0, phases 0/120/240°. Conrods: boxes 0.25² × 3.0. **Crossheads**: yellow #facc15 boxes 0.7³ sliding in x, with open guides. **Extension rods** r 0.14. **Liners**: 3 half-shells (open upward) r 0.5/0.65, L 3.0, x -5.0..-2.0, at z -1.3/0/1.3, y 2.4. Pistons as in #3. **Fluid end**: closed steel box 1.6×3.2×4.2 at x -5.9, with 3 discharge caps cyl r 0.35 on top, a suction manifold below (zCyl r 0.45), and a red dampener ball r 0.8 on top at z -1.3. **Bull gear**: 24-gon disc r 1.7, thick 0.25, at z 2.2 on the crankshaft (#374151) with a yellow cross; pinion r 0.45 at (2.4, 4.55, 2.2). **Nameplate** (easter egg): plane 1.6×0.5 on the tub front (z 2.01) at (1.2, 1.4), `labelTex([['namman.story · TRIPLEX 1600',…]])`. | crank θ = 2π·(100/60)·t (100 SPM, the same visual rate as the calc). Crossheads/pistons via slider-crank (L 3.0). Gear turns with the crank; pinion ×(1.7/0.45). | 110 |
| 5 | **Charge pump** (centrifugal) | L, casing centre (24.0, 0.7, 1.5) | Casing (volute) cyl r 0.6, depth 0.45, axis z (#2563eb), with a front half-shell for the cutaway. Impeller: hub r 0.12 + 6 curved vanes (thin boxes 0.45×0.06×0.3, rotated 60° apart, swept 20°) #f59e0b. Motor box 0.8×0.6×0.6 at (24.0, 0.7, 2.25) (#1d4ed8) + coupling cyl. **Reroute the suction pipe** (replace the Part 3 pipeRun `[24,0.7,-1.0]…[21.25,0.62,6.1]`): `[24,0.7,-1.0] → [24,0.7,1.25] (eye) → [23.45,1.25,1.5] (tangential outlet) → [23.0,1.25,1.5] → [23.0,1.25,2.6] → [23.0,0.7,3.0] → [23.0,0.7,4.4] → [21.25,0.7,4.4] → [21.25,0.62,6.1]`. | impeller spin 14 rad/s; the drop takes a ¾ spiral r 0 → 0.5 | 50 |
| 6 | **Vacuum degasser** | L, base (14.45, 3.0, -5.6) on tank A's free right strip | Grating deck 1.3×0.08×1.6 at y 3.05 (#52627a). Vessel cyl r 0.5, h 1.9 (y 3.2–5.1) + dome, #0f9488. Full shell + half-shell (open to +z). Inside: 4 baffle plates 0.8×0.04×0.8, tilted ±25°, alternating, at y 3.6/3.9/4.2/4.5. Inlet pipe r 0.1 from tank A mud (13.9, 2.2, -5.6) up to the side inlet (13.95, 4.9). Outlet from the bottom (14.45, 3.15) → over the A/B wall → (15.9, 2.8, -5.6) into tank B. Vacuum line r 0.07 from the dome to a vacuum-pump box 0.45×0.35×0.35 at (14.45, 5.6, -6.55) and a vent pipe up to y 7.6. | thin mud film (a plane with a scrolling stripe texture) on each baffle; 20 bubbles growing r 0.03 → 0.12, rising and sucked into the vacuum line | 70 |
| 7 | **Hydrocyclone banks** (desander + desilter) | L. Desander base (17.0, 3.0, -5.6) on tank B, left of the agitator; desilter base (19.8, 3.0, -5.6), right of the agitator | **Desander**: 2 cones at z -6.1 / -5.1. Each cone = head cyl r 0.32 h 0.35 (top at y 5.6) + cone r 0.32 → 0.06, L 1.4, apex down at y 3.85. Feed manifold r 0.14 along z at y 5.4 with tangential stubs. Vortex-finder pipes up to an overflow header at y 5.95 that returns into tank B downstream at (18.9, 3.0, -5.6). Underflow trough (box 1.6×0.12×0.5, sloped) at y 3.7 discharging off the back wall. 4 legs. **Desilter**: 6 cones r 0.15, L 0.8, along z from -6.5 to -4.7, heads at y 4.9; header and overflow alike; overflow pipe over the B/C wall to (22.0, 2.8, -5.0). Colour #0d9488 heads, #94a3b8 cones. The front cone of each bank is a half-shell when "open". | vortex particles in the open cone: 40 brown (#8a6a4a) spiralling **down** the wall to the apex spray, 30 teal spiralling **up** the core to the vortex finder | 90 |
| 8 | **Decanting centrifuge** | L, centre (25.7, 4.6, -5.6) on a stand over tank C | Stand: 4 legs (x 24.6/26.8, z -6.1/-5.1) from y 3.0, + frame. Housing box 2.6×0.9×0.9 (x 24.4–27.0) #cbd5e1, full + front-cut version. **Bowl**: cyl r 0.38, L 1.6 (x 25.0–26.6) + cone 0.38 → 0.22, L 0.6 (beach, x 24.4–25.0), half-shell, #64748b. **Scroll**: hub r 0.12 + helix TubeGeometry r 0.3, pitch 0.25, tube 0.04, #f59e0b. Feed tube r 0.06 entering axially from the -x end to the bowl middle. Motor 0.5³ + belt guard at (26.9, 4.6, -6.5). Solids chute from the beach end (24.5, 4.2) down to a small bin behind the tank at (24.6, 0.5, -8.3). Liquid outlet at the +x end down into tank C at (26.6, 2.8, -5.6). | bowl spin 30 rad/s (stripe texture so it reads); scroll 28 rad/s (visible differential); solids specks migrate to the wall and crawl toward -x | 90 |
| 9 | **Gooseneck + washpipe cutaway `WASH`** | S (60,0,40) | Vertical axis, cut face z = 0. **Gooseneck**: TubeGeometry half-shell r 0.35 along [(3.2,7.6),(3.0,9.0),(1.6,9.8),(0.3,9.2),(0,8.2)], steel #94a3b8; kelly-hose stub (black r 0.4) from (3.2,7.6) to (4.6,5.4). **Static housing**: half-shell cyl r 0.9 h 1.2 at y 7.4 (#64748b). **Washpipe**: polished half-tube OD 0.42 / ID 0.3, y 5.0–7.6, static, #e2e8f0. **Packing**: 5 V-ring tori (r 0.48, tube 0.07) stacked y 5.3–6.1, #f97316, inside a **rotating packing box** half-shell r 0.7. **Rotating main shaft**: half-tube OD 0.75 / ID 0.3, y 0–5.4, with a white stripe, #94a3b8. Optional ghost top-drive body (box 3×4×2.4, opacity 0.15, #dc2626). | shaft + packing box rotate 1.6 rad/s (a seam/tick on the cut rim shows it); gooseneck, washpipe and housing static | 60 |
| 10 | **Standpipe manifold + SPP gauge** | L, centre (6.35, 7.75, 1.5) on the rig floor | Header box 1.4×0.5×0.5 steel, on the existing line (8.0 → 4.7). 2 gate valves: stem cyl + red handwheel torus r 0.28 on top at x 5.9 (open, to the standpipe) and x 6.8 (closed, branch stub along -z to a blind flange at (6.8, 7.75, 0.6)). SPP gauge: dial zCyl r 0.28, depth 0.08, white face, black needle box 0.02×0.22, on a riser at (6.35, 8.6, 1.6), turned 0.6 rad toward +x. | needle angle; handwheel of valve A spins a quarter turn at 54.4 ("clunk") | 40 |
| 11 | **Flow paddle** | L on the flowline at (8.16, 5.36, -3.78) | Sensor box 0.4×0.3×0.3 on top of the pipe, external arm 0.5 long + counterweight, pivot. Hinged paddle 0.05×0.35×0.25 inside the pipe. Flowline cut window: a half-shell section r 0.25, 1.6 long, centred on the paddle (replace that span of pipe with a half-shell when in macro). | paddle and arm rotate 0° → 22° (normal flow) → 34° (flow-out rise at 102–105) | 35 |
| 12 | **Trip tank** | L, (28.1, 0, -5.5), next to active tank C | Box 1.2×4.2×1.2 #56677d, yellow rim; vertical sight-glass strip 0.15×3.6 on the front (z -4.89) with a teal level float; stencil "TRIP TANK" (vertical canvas text, no volume). | float bob | 30 |
| 13 | **Driller's cabin `CAB`** | S (20,0,40) | Floor 6×0.2×5. Chair: seat 1.0×0.2×1.0 at y 1.0, back 1.0×1.3×0.15, two armrests with joystick boxes + sticks. Console 3.0×0.9×1.2 at y 1.4. Main screen plane 2.4×1.4 at (0, 2.6, -1.0), tilted 10°, black (#0b1220) with a teal bezel glow. 2 side screens 1.2×0.9 at ±1.9, angled 30°. Back window 6×2.2 with a canvas dusk gradient + flat derrick silhouette. Driller silhouette (`buildHuman` scaled ×1.6, seated, seen from behind). | screen UI drawn in 2D at the projected screen rect (camera nearly locked) | 60 |
| 14 | Small L adds | L | (a) gooseneck on the L top drive: half-torus r 0.35, tube 0.12 at TD-local (0.3, 1.95, 0.1); (b) pop-off valve on the L pump discharge at (20.8, 1.85, 7.2) (red box 0.25³) + vent pipe r 0.06: `[20.8,2.2,7.2] → [20.8,2.4,7.2] → [20.8,2.4,-0.6] → [20.8,3.2,-1.6]`; (c) nameplate on the L pump power end (26.3, 1.35, 8.31), same texture as #4; (d) **stencil fix**: move the Part 3 stencil to tank C front (24.25, 1.55, -0.99), text "namman.story" / "ACTIVE TANK" (**remove "400 BBL"**, a [U] volume), and move the stiffener gap from k = 1 to k = 2; (e) hose re-mesh: rebuild `O.hose` from `HOSE_CTRL` with points 3–8 shifted by Δy of the top drive (lerp 100/80/60/40/60/100 %) each frame of shot 11. | — | 40 |
| 15 | 2D overlays (not 3D) | overlay | mini-map ring, seesaw, pressure trace, calc counter + bucket gauge, SPP split bar, annulus ring inset, Flow In / Flow Out gauges, particle-size funnel, degasser bubble icon, driller screen UI, IF-chip. Specs are in the shots. | | — |

**Reused as-is:**

- L: tanks A/B/C with agitators + swirl mud, shaker + basket shake + skip, flowline, triplex (rods + wheel), dampener ball, discharge line + standpipe, `O.hose`, top drive + quill + drill pipe, BOP stack, choke manifold, MGS, flare, sky and dusk `env()`.
- W: the whole EP03 well (strata, casing, drill string, bit with 3 nozzles + jets, mud and cuttings particles).
- S: floor disc.

---

## 3. Shot-by-shot

### SHOT 01 · 0.0–8.0 · L · Title + hook
- **On screen:** low dusk wide of the whole land rig, backlit by the sunset (sun at -x,-z). Tanks and pump sit in the lower third.
- **Camera:** `cam (114, 5, 44) → (106, 5.3, 41.5) look (18, 6.5, 0) → (18, 6.8, 0) fov 40`, linear-eased push 0.0–8.0. [crown ≈ (370,120–166), floor (378,950), tank C (710,1070)]
- **Beats:**
  - Agitators turn; the shaker shakes.
  - Highlight is off (a full-colour rig).
  - **6.0:** the drop pops up out of tank C at (24.0, 2.55, -3.4) with a `bubble` SFX and a mud splash ring (a 0.6 s expanding torus).
  - 6.0–6.6: rises with `eout` to (24.0, 5.2, -3.4) [≈ (700,1000)], then bobs ±0.1.
  - The 2D ring locks on at 6.2.
- **Overlay:**
  - `partTitle` 0.4–7.8: "DRILLING RIG 101 · EP.05" / "PART 4 / 5" (teal) / "Circulating System" / sub "ระบบไหลเวียนของ Mud".
  - partsBar highlights Part 4.
  - Hook pill "Mud 1 หยด เดินทางผ่านอะไรบ้าง?" at y 1150, 3.2–6.8. It fades before the drop is fully up, and the drop sits just above it.
  - Caption 0–8.0.
- **Transition:** continuous (no cut) into shot 02.
- **Assets:** rig (existing), drop (NEW #1), stencil fix (#14d).

### SHOT 02 · 8.0–15.7 · L · The loop
- **On screen:** a high 3/4 aerial of the whole circulating system in the lower box. A teal loop line draws itself; the mini-map forms.
- **Camera:** crane 8.0–11.0 (`eio`) from shot 01's end to `cam (16, 82, 56) look (14, 4, -2) fov 40`; hold 11.0–15.7 with a drift to (17, 80, 55). [TD (93,684), standpipe top (226,644), tank C (814,948), shaker (493,936), pump (814,1211), bell nipple (152,977)]. The derrick foreshortens toward the top-left behind the card. That is fine; it frames the loop and covers nothing in the loop.
- **Beats:**
  - 8.6–14.6: the loop-line head (a brighter comet, r 0.25) travels the full loop in 6 s, leaving a teal tube: tank C → charge pump → pump → discharge → manifold → standpipe → hose → TD → down the hole (x-ray dashed line into the ground) → back up → bell nipple → flowline → shaker → degasser → hydrocyclones → centrifuge → tank C.
  - The drop stays hovering over tank C and pulses.
  - 14.6–15.4: the whole ring pulses once.
- **Overlay:**
  - Card "Circulating System" 8.6–15.4.
  - Mini-map: 10 grey nodes on a ring, drawn 8.8–14.6 in sync with the comet (each node pops grey as the comet passes).
  - Chapter pill on from 8.0.
  - Callouts (≤ 2): "ขาลง · แรงดันสูง" teal at 11.5, anchored to the standpipe mid (4.7, 15, 1.5), pill at (300, 700); "ขาขึ้น · คัดกรอง" brown at 12.6, anchored to the shaker (12.25, 5, -3), pill at (700, 1220). Both out at 15.2.
- **Transition:** crane down / match-dissolve 0.4 s into shot 03.
- **Assets:** loop path (#2), mini-map (#15), x-ray line (#2).

### SHOT 03 · 15.7–19.0 · L · Tanks + trip tank
- **On screen:** the tank row seen from above the pump; agitator paddles turning; active tank C with the "namman.story / ACTIVE TANK" stencil; the narrow trip tank on the right.
- **Camera:** lateral dolly 15.7–18.0 from `cam (13, 9.5, 17) look (20, 2.5, -2.5)` to `cam (18, 10, 17) look (25, 2.5, -2.5) fov 40`; hold 18.0–19.0. End frame: tank C front (161–824, 1003–1269), stencil (515,1145), trip tank top (740,654), suction (367,879). The ray clears the pump top (it passes at y 6 over z 8.6).
- **Beats:**
  - Agitator paddles turn (existing).
  - 16.0: the "Tank" node on the mini-map lights teal.
  - 16.6–17.8: the drop sinks into the mud (dim under the surface: 50 % opacity + ring) and moves to the suction inlet (24, 2.8, -4.2).
  - 17.8–19.0: up and over the front wall, down the suction pipe to (24, 0.7, -1.4) at 0.9 u/s.
  - The trip tank float bobs.
  - The stencil is readable 16.4–19.0 (2.6 s).
- **Overlay:**
  - Card "Mud Tanks" 16.2–22.4.
  - Callouts: "Active Tank" (anchor (24.25, 3.1, -1.0), pill (300, 700)) at 16.4; "Trip Tank" (anchor (28.1, 4.2, -5.5), pill (760, 700)) at 17.6.
  - Caption 15.7–22.5.
- **Transition:** continuous push into shot 04.
- **Assets:** tanks (existing), trip tank (#12), stencil (#14d), charge pump (#5, in the background).

### SHOT 04 · 19.0–22.5 · L · Charge pump
- **On screen:** the small blue centrifugal charge pump on the suction line. The front of its volute opens and shows the impeller.
- **Camera:** push 19.0–20.0 to `cam (27.6, 3.2, 5.0) look (24.0, 0.9, 1.2) fov 40` [casing (442,1066); suction pipe enters top-right, outlet exits bottom-left]; hold 20.0–21.4; pan left 21.4–22.5 following the drop to look (21.8, 0.7, 4.4).
- **Beats:**
  - 19.2: the full casing fades out to the half-shell (0.6 s).
  - 19.8: the drop enters the eye.
  - 19.8–20.8: ¾ spiral outward on the spinning impeller (14 rad/s), with a speed-up streak.
  - 20.8–22.3: tangential outlet → new pipe route → arrives at the triplex suction manifold (21.25, 0.62, 6.1).
  - Teal arrows reveal behind it.
  - 22.0: the "Pump" node is half-lit.
- **Overlay:** callout "Charge Pump" (anchor the casing, pill (320, 760)) at 19.4; card continues; caption.
- **Transition:** **iris** (centre on the drop) into S PUMP_A at 22.5.
- **Assets:** charge pump (#5).

### SHOT 05 · 22.5–29.7 · S PUMP_A · Triplex overview
- **On screen:** the power end open from above; crankshaft, conrods and crossheads drive 3 pistons 120° apart in half-liners; the bull gear turns; the fluid end sits at the left/bottom.
- **Camera (model-local):** `cam (-15, 11, 7) look (-1, 2.4, 0) fov 40`; slow orbit to `cam (-14, 11.5, 9.5)` over 22.5–29.7. Fluid end bottom-left (≈ (60,1450)); liners centre (170–540, 1100–1200); crank (764,741); nameplate (≈ (940,970)). If the gear clips the right edge, raise the fov to 44 or move the look-at to x -0.5. Keep the pistons and nameplate inside x 60–960.
- **Beats:**
  - The crank turns at 100 SPM from 22.5. Each piston flashes teal on its forward (discharge) stroke, so the 1-2-3 sequence reads.
  - 22.8: the drop enters the suction manifold under the fluid end and disappears into the block (ring stays, dashed).
  - 24.5–27.0: the nameplate "namman.story · TRIPLEX 1600" is readable. The orbit passes closest at 25.5 and a short spec glint sweeps across it.
  - 26.0–27.5: a mini "one-way" cue: on the back stroke a ghost arrow points into the cylinder ("ดูด"); on the forward stroke a teal arrow points out ("อัด"). This shows single-acting (one push per piston per turn).
  - SFX `pump` thump on each piston's forward stroke end (5 thumps/s ≈ 100 SPM × 3 / 60).
- **Overlay:**
  - Card "Triplex Mud Pump" 23.0–29.4.
  - Callouts: "Piston × 3" (anchor the middle piston, pill (300, 1240)) at 23.6; "Crankshaft" (anchor the crank, pill (760, 680)) at 24.6.
  - Mini-map "Pump" fully lit at 23.0.
  - Caption.
- **Transition:** iris onto the middle cylinder → shot 06 at 29.7.
- **Assets:** PUMP_A (#4).

### SHOT 06 · 29.7–37.5 · S PUMP_B · Inside one cylinder + liner size
- **On screen:** a clean cross-section of one cylinder: piston in liner, suction valve below, discharge valve above, chambers full of teal mud.
- **Camera (model-local):** `cam (-4.6, 3.4, 15) look (-3.0, 2.4, 0) fov 40`; micro push to z 14 over 29.7–37.5. Liner (piston travel) in the right half; valves left of centre; dampener above the frame (used in shot 07).
- **Beats:**
  - The crank runs at 100 SPM.
  - 29.9–31.4: one slow "explainer stroke", time-warped to 0.4× for one revolution.
    - Back stroke: the suction valve lifts, and the drop + teal mud are pulled up from the suction manifold into the chamber.
    - Forward stroke: the suction valve shuts, the discharge valve lifts, and the drop is squeezed up through the discharge port (pressure shimmer starts).
  - Back to normal speed at 31.4. The drop is parked in the discharge port (it reappears in shot 07).
  - **Liner swap:**
    - 30.2–33.2: the liner + piston morph to **7 in** (bore r 0.583). The teal "slug" volume per stroke is large; arrows are fat and slow.
    - 33.2–33.8: the swap (scale morph 0.6 s, `clunk`).
    - 33.8–37.2: **4½ in** (bore r 0.375): thin slug, arrows thin, and the shimmer stronger (higher pressure).
- **Overlay:**
  - Card "Liner Size" 30.2–37.2 (line 1 at 30.7 with the 7 in state, line 2 at 33.9 with the 4½ in state, line 3 at 34.7).
  - **Seesaw** (2D) at y 660–860:
    - Beam 560 px wide pivoting at (540, 800), with pans labelled "Flow · gpm" (left, teal) and "Pressure · psi" (right, amber).
    - A sliding chip on the beam shows "7 in" then "4½ in".
    - The beam tilts left −12° for 7 in and right +12° for 4½ in, easing over 0.6 s at the swap.
  - The 3D liner sits below in y 880–1280.
  - No other labels.
  - Caption.
- **Transition:** tilt up (continuous) into shot 07.
- **Assets:** PUMP_B (#3).

### SHOT 07 · 37.5–45.5 · S PUMP_B · Dampener + pop-off
- **On screen:** the discharge line, the red dampener cut open (black rubber bladder, pale-blue N₂ inside), and the red pop-off valve on the line with its vent pipe.
- **Camera:** tilt/crane 37.5–38.5 to `cam (-5.8, 6.2, 12.5) look (-6.4, 5.4, 0) fov 40`; hold. Dampener centre ≈ screen (600, 820); pop-off lower-left.
- **Beats:**
  - 38.0: the drop runs from the discharge port up and along the manifold under the dampener.
  - 39.0–41.5: each pump stroke pulse makes the bladder squeeze (scale 0.93) and relax. A `hiss` sits under it, and the trace smooths.
  - 41.5: the drop leaves toward -x (to the standpipe), off frame by 42.0.
  - **43.0–44.4 "what-if" demo:**
    - An amber IF-chip "ถ้าแรงดันเกิน" appears.
    - The pressure trace spikes to a dashed red limit line.
    - The pop-off disc lifts and amber mud squirts into the vent line (arrow "→ ถัง"), with a `hiss`.
    - The pressure drops back and the disc reseats at 44.4.
  - No numbers on the trace.
- **Overlay:**
  - Card "Pump Safety" 38.0–45.2.
  - **Pressure trace** panel x 560–950, y 1080–1260 (dark glass, teal line): jagged triplex ripple until 39.4, morphing to near-flat by 40.6. A ghost grey jagged line stays faint for comparison.
  - Callouts: "N₂" (anchor the bladder, pill (330, 700)) at 38.6; "Pop-off Valve" (anchor the pop-off, pill (330, 1240)) at 42.0. The first fades at 41.8 so there are never more than 2.
  - Caption.
- **Transition:** cut (0.25 s dip) to shot 08.
- **Assets:** PUMP_B (#3).

### SHOT 08 · 45.5–53.5 · S PUMP_B · Pump-output calc
- **On screen:** a locked-off macro of the 6 in liner with the piston (side section), dimension arrows D (across the bore) and L (stroke travel).
- **Camera:** `cam (-1.6, 2.4, 7.5) look (-1.6, 2.0, 0) fov 36`, locked, with the look-at at `vo [0, 140]` so the liner sits at y ≈ 1100, below the tall calc card.
- **Beats:**
  - The liner morphs back to **6 in** at 45.6.
  - The piston strokes slowly (0.5× real).
  - **D arrow** (vertical, white with teal ends, label "D = 6 in") highlights 46.6–48.0.
  - **L arrow** (horizontal along the piston travel, "L = 12 in") highlights 47.2–48.6.
  - 49.4–52.0: the stroke counter ticks 0 → 100 (SPM), a `blip` every 10.
  - 49.6–52.4: the bucket gauge fills.
  - The drop is parked dim; its ring is hidden.
- **Overlay:**
  - Calc card "Pump Output (Triplex)" 46.0–53.4, y 372–650: line 1 at 46.5, line 2 at 48.3, line 3 at 49.6, footnote "* ที่ 100% efficiency (95% ≈ 419 gpm)" at 50.6 (small, 24 px).
  - **Stroke counter** (left, x 90–470, y 700–840): big digits "0 → 100" + "SPM".
  - **Bucket gauge** (right, x 600–950, y 690–850): an outlined bucket filling teal, label "≈ 441 gpm" appearing at 51.8.
  - These are 2 new labels; the dimension arrows' labels are already on screen from 46.6, so the counter and gauge come in after 49.4 once the D/L emphasis ends.
  - Caption.
- **Transition:** iris out from the parked drop → L shot 09 at 53.5. The drop is re-placed at the manifold inlet.
- **Assets:** PUMP_B (#3), overlays (#15).

### SHOT 09 · 53.5–57.2 · L · Standpipe manifold
- **On screen:** the manifold valve block on the rig-floor edge (red handwheels), the SPP gauge, and the standpipe rising at the left.
- **Camera:** `cam (11.5, 10.2, 8.5) → (10.8, 10.0, 7.9) look (6.2, 8.3, 1.5) fov 40` (slow push). Manifold (587,1083), gauge (570,824), standpipe base (224,1051).
- **Beats:**
  - 53.8: the drop arrives from the discharge riser (8.0, 0.45 → 7.75, 1.5) (from below frame).
  - 54.4: valve A handwheel quarter-turn + `clunk`; valve B stays closed (red tag).
  - 54.6–55.6: the drop passes through the block at 1.2 u/s.
  - The SPP needle rises from rest to the working position 54.6–56.0 (no numbers).
  - 56.0: the "Standpipe" node lights.
  - 56.4–57.2: the drop turns up into the standpipe.
- **Overlay:**
  - Card "Standpipe" 54.0–61.2.
  - Callouts: "Standpipe Manifold" (anchor the block, pill (300, 1230)) at 54.4; "SPP Gauge" (anchor the dial, pill (760, 700)) at 55.2.
  - A tiny 2D SPP dial echo (r 70) beside the "SPP Gauge" pill, needle only, label "SPP".
  - Caption.
- **Transition:** continuous crane into shot 10.
- **Assets:** standpipe manifold + SPP gauge (#10), discharge line (existing).

### SHOT 10 · 57.2–61.5 · L · Up the standpipe
- **On screen:** the steel standpipe running up the outside of the mast leg; the derrick behind it.
- **Camera:** crane `cam (13, 10 → 23, 10) look (4.9, 10.5 → 23.0, 1.5) fov 40`. The look-at y tracks the drop with 0.4 s lag, so the drop sits slightly above centre and leads upward. The standpipe stays at x ≈ 508.
- **Beats:**
  - The drop climbs y 7.75 → 23.5 over 57.4–61.0 (4.4 u/s, `eio`) with the pressure shimmer.
  - Clamp brackets pass by (existing dark boxes at y 12/17/22).
  - 59.6: callout "~2/3 ของความสูงเสา", using a 2D bracket from floor to standpipe top.
- **Overlay:** card continues (line 3 "ท่อเหล็กขึ้นเสา ~2/3 ความสูง" is revealed at 59.4 to match); caption.
- **Transition:** continuous arc to shot 11.
- **Assets:** existing standpipe.

### SHOT 11 · 61.5–69.5 · L · Kelly hose + top drive
- **On screen:** the black hose looping from the standpipe gooseneck at the top of the mast down and back up to the top drive, which moves down 1.5 u (≈ 2 m) while drilling.
- **Camera:** `cam (18.5, 26, 22.5) → (17.5, 25.2, 23.5) look (2.4, 20.6, 0.8) fov 40` (slow arc). Standpipe top (690,701), hose low point (547,1279), gooseneck (412,758), TD (411,924).
- **Beats:**
  - Top drive y 21.4 → 19.9 (61.5–69.0, linear: "drilling ahead"). `O.dp` length follows; quill rotates.
  - The hose re-mesh (#14e) makes the loop droop deepen. Keep the hose's low point ≥ y 16.8 so it stays in frame.
  - 62.0–66.4: the drop runs through the hose (rendered on top of the black hose with an outline), slowing at the bottom of the loop and speeding up the rise.
  - 66.4: arrives at the gooseneck; the "Hose" and "Top Drive" nodes light (62.0 / 66.5).
  - 66.5–69.3: a 1 s hold on the gooseneck (a small teal flare), then a gentle push toward it.
- **Overlay:**
  - Card "Rotary / Kelly Hose" 62.0–69.2.
  - Callouts: "Kelly Hose" (anchor the hose mid-point, pill (760, 1180)) at 62.4; "Gooseneck" (anchor the TD gooseneck #14a, pill (300, 680)) at 66.6. Gooseneck is grey (static).
  - Caption.
- **Transition:** **iris** on the gooseneck → S WASH at 69.5.
- **Assets:** hose re-mesh (#14e), TD gooseneck (#14a), top drive (existing).

### SHOT 12 · 69.5–76.9 · S WASH · Gooseneck + washpipe
- **On screen:** a cutaway: the static curved gooseneck at the top-right, the static polished washpipe going down into an orange packing stack, and below it the rotating main shaft (striped) of the top drive.
- **Camera (model-local):** 69.5–72.0: `cam (2.0, 9.0, 9.5) look (1.2, 7.6, 0) fov 40` (gooseneck + washpipe top). 72.0–74.0: tilt down to `look (0.3, 5.0, 0)`, cam y → 6.8, with the packing centred. 74.0–76.9: hold, slight push (cam z → 8.6).
- **Beats:**
  - 70.0–71.4: the drop follows the gooseneck curve.
  - 71.4–72.6: down the static washpipe bore.
  - 72.6–73.6: crosses the packing zone. Packing rings glow orange 72.4–75.8. A "static | rotating" split is made obvious: a thin dashed boundary line around the packing, with the static parts tinted grey and the rotating parts with a teal motion tick.
  - 73.6–74.6: enters the rotating shaft bore and spirals slightly (follows rotation 0.3×).
  - Exits the bottom at 74.8.
  - 75.0: one packing ring pulses amber twice ("wear").
- **Overlay:**
  - Card "Gooseneck + Washpipe" 70.0–76.6.
  - Callouts: "Gooseneck · อยู่กับที่" (grey, anchor (1.6,9.8,0), pill (780, 700)) at 70.2; "Washpipe + Packing" (orange, anchor (0.5,5.7,0), pill (300, 1150)) at 72.6. The first fades at 72.4.
  - Small rotating-arrow glyph beside the shaft (2D) labelled "หมุน".
  - Caption.
- **Transition:** follow the drop down: a hard cut with a 0.2 s motion-blur streak into W at 76.9.
- **Assets:** WASH (#9).

### SHOT 13 · 76.9–80.6 · W · Dive down the drill string
- **On screen:** the earth cutaway with the cut drill string. The camera rides down beside the bore as the drop plunges; strata rush upward.
- **Camera:** follow-dive. `cam (2.2, yd+1.4, 9.5) look (0, yd-0.8, 0) fov 40`, where `yd` is the drop y with critically damped lag 0.15 s.
- **Drop:** inside the bore (x 0, z -0.1). `yd = lerp(8, -36.0, eio((t-77.1)/3.3))`. Peak speed ≈ 20 u/s.
- **Beats:**
  - EP03 mud particles flow down the pipe (existing `mudPathW` phase 0) at their own rate; the drop overtakes them.
  - Speed lines: 2D vertical streaks around the drop, 77.6–80.0.
  - Tool-joint rings flash by.
  - 77.2: the "Drill String" node lights.
- **Overlay:**
  - Card "Bit Nozzles" starts 77.4 (line 1 at 77.9).
  - Caption 76.9–83.7.
  - No callouts (motion shot).
- **Transition:** the camera decelerates into shot 14 (continuous, no cut).
- **Assets:** W well (existing, ported), drop.

### SHOT 14 · 80.6–83.7 · W · Out of the bit
- **On screen:** the bit at hole bottom, turning; 3 nozzles; jets fanning onto the hole bottom.
- **Camera:** EP03 bit framing `cam (4.5, -35.4, 15.5) → (3.8, -35.6, 15.0) look (0, -37.0, 0) fov 40`.
- **Beats:**
  - The bit rotates (`BIT_ROT`).
  - Jets on (O.jetM opacity → 0.9) from 80.8.
  - **81.2:** the drop shoots out of the front nozzle with the jet, a white-teal flash and a short `whoosh`.
  - 81.2–82.0: sweeps across the hole bottom toward the wall, past the bit teeth.
  - **82.2:** a cutting (chip) that the teeth just broke loose (show 4 chips popping from under a tooth) sticks to the drop. Dirt jumps to 1 over 0.4 s.
  - 82.8: starts up the wall side.
  - Direct the jets so they clean the hole bottom and the cutters. **Do not show the jet cutting rock.**
  - 81.0: the "Bit" node lights.
- **Overlay:**
  - Card lines 2–3 at 78.7 and 79.5 (already visible).
  - **SPP split bar** (2D) at 81.6–83.4, x 120–960, y 1180–1240: a horizontal bar labelled "SPP" split into "Bit ~½–⅔" (teal, wide), "Drill string" (grey) and "Annulus (เล็กสุด)" (thin dark-teal). No other percentages.
  - Callout "Nozzle 3 ตัว" (anchor the nozzle, pill (760, 720)) at 80.9.
  - Caption.
- **Transition:** continuous crane up into shot 15.
- **Assets:** W bit + jets (existing).

### SHOT 15 · 83.7–90.7 · W · Up the annulus
- **On screen:** the drop (now brownish with an orange chip and specks) climbs the annulus between pipe and hole wall, with other cuttings particles (EP03 `cutW`) rising alongside.
- **Camera:** crane-follow `cam (5.5, ya+0.6, 12.5) look (1.15, ya, 0) fov 40` (lag 0.3 s).
- **Drop:** in the annulus lane x = +1.15 (collars: 1.2), z -0.3. `ya = lerp(-35.4, 0.8, sstep(83.9, 90.0, t))`, which averages 5.9 u/s (visibly slower than the dive).
- **Beats:**
  - The drop wobbles ±0.05 in x.
  - It passes the collar → drill-pipe step at y -28 and the casing shoe at y -14 (callout-free).
  - 86.0: 3 tiny gas micro-bubbles join the drop as it passes the gas layer. This is subtle and sets up the degasser.
  - 89.6: reaches the wellhead stub and turns out of the EP03 flowline stub (x → 3).
  - 84.0: the "Annulus" node lights.
- **Overlay:**
  - Card "Annulus" 84.2–90.4.
  - **Annulus ring inset** (2D) 85.0–90.4, circle at (820, 1120) r 110: outer ring = hole wall (brown), inner disc = pipe (grey, with a small teal bore), and the annular gap filled with animated brown particles rising (dots fading in and out). Label "Annulus" under it.
  - Caption 83.7–90.7.
- **Transition:** 0.25 s dip → L shot 16 (a geography reset to the real rig).
- **Assets:** W (existing), inset (#15).

### SHOT 16 · 90.7–94.6 · L · Bell nipple
- **On screen:** under the rig floor, looking past the open V-door side. The BOP stack top and the tall grey riser / bell nipple, with the flowline leaving its top.
- **Camera:** `cam (4.6, 4.4, -12.5) look (0.8, 4.6, -1.0) fov 40`, locked 90.7–92.6. Bell nipple top (628,687), riser down to ≈ y 1300. Then pan 92.6–94.6 to `look (4.0, 5.5, -2.2)` following the drop leftward. In this view +x appears screen-left.
- **Beats:**
  - The riser gets a ghost (opacity 0.35 over 0.4 s) so the drop is seen rising inside.
  - The drop enters at (0, 2.9, 0) at 90.9 and rises to (0, 6.0, 0) by 92.0.
  - Turns into the flowline (0.4, 6.0, -0.4) at 92.3.
  - Slides down the flowline at 1.6 u/s (gravity: slight bounce, no shimmer).
  - Brown arrows reveal.
  - 91.0: the "Flowline" node lights.
- **Overlay:**
  - Card "Return Line" 91.2–98.4.
  - Callout "Bell Nipple" (anchor (0, 5.8, 0), pill (760, 700)) at 91.4.
  - At 92.4 a small amber sub-pill under it: "ไม่ได้ปิดหลุม" (counts as the 2nd label).
  - Caption 90.7–98.7.
- **Transition:** cut (dip) to shot 17.
- **Assets:** BOP stack + riser (existing, ghost material), flowline (existing).

### SHOT 17 · 94.6–98.7 · L · Flowline by gravity
- **On screen:** the sloped flowline running outside the substructure down to the shaker's possum belly; the trip-tank top and tanks below.
- **Camera:** `cam (14.0, 10.5, 9.0) look (8.6, 5.3, -3.8) fov 40` → pan to `look (10.6, 5.2, -4.8)` by 98.2, following the drop. The floor slab edge sits at the left; the ray passes below the slab.
- **Beats:**
  - The drop slides to the header box (10.75, 5.15, -4.9) by 97.6 and drops into the possum belly 97.8 (`bubble`).
  - 95.4–97.0: a 2D slope glyph (a small angled line with a down arrow, **no number**) near the pipe.
  - The paddle sensor box is visible on the pipe as the drop passes it at 95.8. Foreshadow only; the paddle twitches.
- **Overlay:**
  - Card line 3 "Flowline: ลาดลง ไม่มีแรงดัน" is already revealed.
  - Callout "Flowline" (anchor (7.0, 5.46, -3.27), pill (330, 1220)) at 94.9.
  - Caption.
- **Transition:** iris on the paddle → shot 18.
- **Assets:** flow paddle (#11), flowline (existing).

### SHOT 18 · 98.7–106.5 · L · Flow check
- **On screen:** a macro of the flow paddle in the cut-open flowline section; mud stream under the hinged paddle; the outside arm and sensor box.
- **Camera:** `cam (10.4, 6.9, -0.2) look (8.2, 5.6, -3.8) fov 40`, `vo [0, 120]`, locked + 2 % push. Paddle ≈ (514, 1100); the sensor top is above it.
- **Beats:**
  - The music drops to a tick.
  - The mud ribbon flows (brown); the drop is replayed passing under the paddle at 99.4. It is a "replay ghost" (60 % opacity, dashed ring) so the timeline stays honest.
  - The paddle settles at 22°.
  - **102.0–105.0:** the flow-out rise. The ribbon thickens, the paddle swings to 34°, and the arm follows.
  - 103.0: soft `alarm`.
  - 104.0: the amber chip "Possible kick → Part 5" appears.
- **Overlay:**
  - Card "Flow Check" 99.2–106.2.
  - **Gauges** (2D) side by side at y 700–900:
    - Left "Flow In" (from pump strokes) centred (300, 800), r 90: shows the SPM counter "100 SPM" fixed with a flat needle.
    - Right "Flow Out" centred (780, 800), r 90, unit "%": needle at mid, creeping up 102.0–105.0. No numeric scale.
  - Amber chip "Possible kick → Part 5" (pill, #f59e0b, not red) at (540, 1240), 104.0–106.3.
  - Caption 98.7–106.5.
- **Transition:** dip → shot 19.
- **Assets:** flow paddle (#11), gauges (#15).

### SHOT 19 · 106.5–113.9 · L · Shale shaker (tier 1)
- **On screen:** the shaker on tank A: possum belly, tilted vibrating screen deck, and the discharge end over the cuttings skip.
- **Camera:** `cam (19.5, 10.5, 9.0) → (18.6, 10.0, 8.0) look (12.3, 4.5, -2.6) fov 40, vo [120, 80]`. The deck runs diagonally from the top-right (header) to the bottom-left (discharge); the skip is at the bottom edge.
- **Beats:**
  - The music's "clean" arpeggio starts.
  - 106.8: the drop spills from the possum belly onto the screen (12.25, 4.95, -4.1).
  - 107.4–110.0: the drop rides the vibrating deck (inherits the basket shake).
  - **110.2:** the chip and the big specks detach and "walk" off the discharge end (existing `shCut` particles boosted ×2) into the skip.
  - 111.0–112.5: the drop passes through the screen (stretch + squash) and falls into tank A (12.6, 2.55, -2.4). Dirt 0.7.
  - The "Solids" node fills ¼.
- **Overlay:**
  - **Funnel diagram** (left column, persistent 107.0–137.4): a 4-tier funnel outline, title "Solids Control: หยาบ → ละเอียด". Tier 1 "Shale Shaker · > ~75 µm (API 200)" appears at 107.4 and big particles stop in it. Footer note small at the bottom of the column: "ค่าประมาณทั่วไป · Degasser อยู่หลัง Shaker (ไม่ได้แยกตามขนาด)".
  - Stage card "Shale Shaker" (right column) 108.4–113.6.
  - At most one callout: "Possum Belly" (anchor (12.25, 5.3, -5.0)) at 106.8–108.2.
  - Caption 106.5–113.9.
- **Transition:** truck right (continuous) → shot 20.
- **Assets:** shaker, skip (existing), funnel (#15).

### SHOT 20 · 113.9–121.7 · L · Vacuum degasser
- **On screen:** the degasser vessel beside the shaker on tank A; its front shell opens to show the baffles with a thin mud film and bubbles growing and leaving through the vacuum line.
- **Camera:** truck 113.9–114.8 to `cam (17.8, 7.0, 1.5) look (14.45, 4.1, -5.6) fov 40, vo [140, 80]`; push to `cam (17.2, 6.6, 0.4)` by 121.0. Vessel from y ≈ 554 to 1271 before vo.
- **Beats:**
  - 114.4: the shell opens (crossfade + cut-edge flash).
  - 114.8: the drop is pulled up the inlet pipe from tank A.
  - 116.0–119.2: the drop flattens into a disc (scale y 0.3) and cascades down 4 baffles. Its 3 gas micro-bubbles separate, swell (×3) and rise. 20 ambient bubbles do the same and are sucked into the vacuum line (`bubble` SFX).
  - 119.4: the drop reforms at the bottom outlet; 120.0–120.6 it travels over the A/B wall into tank B. Dirt 0.6.
- **Overlay:**
  - Funnel: the **gas bubble icon** appears beside the funnel between tiers 1 and 2 at 114.6, labelled "Degasser · แก๊ส". It is not a tier.
  - Stage card "Vacuum Degasser" 114.4–121.4. Line 3 "≠ Mud Gas Separator (Part 5)" gets a small purple dot.
  - Callout "Vacuum" (anchor the vacuum-pump box) at 117.0.
  - Caption 113.9–121.7.
- **Transition:** truck right → shot 21.
- **Assets:** degasser (#6).

### SHOT 21 · 121.7–125.6 · L · Desander
- **On screen:** 2 big 10-in cones on tank B. The front cone is open: brown particles spiral down to the apex spray and a teal core spirals up and out of the top.
- **Camera:** `cam (21.5, 7.0, 1.0) look (17.0, 4.6, -5.6) fov 40, vo [120, 80]` → push to `cam (20.6, 6.6, 0.2)`.
- **Beats:**
  - 122.0: the drop enters the tangential feed of the front cone.
  - 122.4–124.4: spirals down the wall (3 turns). Medium specks are flung to the wall, exit at the apex as a brown spray and fall into the trough.
  - 124.4–125.0: the drop joins the up-core and leaves through the vortex finder into the overflow header. Dirt 0.4.
  - 125.2: falls into tank B downstream.
- **Overlay:**
  - Funnel tier 2 "Desander · D50 ~40–50 µm" at 122.2.
  - Stage card "Hydrocyclones" 122.6–129.4 (line 1 at 123.1).
  - Callout "Desander · กรวยใหญ่" (anchor the cone head) at 122.4.
  - Caption 121.7–129.7.
- **Transition:** truck right (continuous) → shot 22.
- **Assets:** hydrocyclones (#7).

### SHOT 22 · 125.6–129.7 · L · Desilter
- **On screen:** a row of 6 small 4-in cones. The front one is open with a tighter, faster vortex.
- **Camera:** truck to `cam (24.3, 6.4, 0.5) look (19.8, 4.2, -5.6) fov 40, vo [120, 80]` by 126.2; hold.
- **Beats:**
  - 125.8: the drop enters the front small cone.
  - 126.0–128.4: a fast, tight spiral; small specks exit the apex.
  - 128.6: up the core and out.
  - 129.0–129.4: through the overflow pipe over the B/C wall into tank C. Dirt 0.2.
  - Line 3 "Desander ต้องมาก่อน Desilter" reveals at 126.8. Show a 2D order arrow "Desander → Desilter" under the funnel tiers 2–3 at 127.0.
- **Overlay:**
  - Funnel tier 3 "Desilter · D50 ~15–20 µm" at 125.6.
  - Callout "Desilter · กรวยเล็ก" at 125.9.
  - The desander callout is already gone, so there are ≤ 2 labels.
- **Transition:** truck right → shot 23.
- **Assets:** hydrocyclones (#7).

### SHOT 23 · 129.7–137.7 · L · Centrifuge
- **On screen:** the horizontal decanting centrifuge on its stand over tank C. The housing opens: a spinning bowl and a slightly slower scroll inside; a solids chute at the cone end; clean liquid falling into tank C.
- **Camera:** `cam (28.0, 7.0, 1.8) look (25.7, 4.6, -5.6) fov 40, vo [120, 60]` → slow push to `cam (27.4, 6.6, 0.8)` by 135.0. 135.0–137.7: tilt down to follow the drop into the tank (look → (26.6, 2.8, -5.6)).
- **Beats:**
  - 130.2: the housing opens.
  - 130.6: the drop rides the feed tube into the bowl middle.
  - 131.0–134.6: flung into the liquid pool on the bowl wall. Its last fine specks drift outward and are carried by the scroll toward the conical beach. Solids exit the chute (`shCut`-style brown particles) into the bin.
  - The drop travels toward the liquid end, colour → clean teal (dirt 0 by 135.0), with a sparkle.
  - **133.6–135.4 barite mode (2D only):** the chip toggle "Mud เบา ↔ Mud หนัก" flips. The outlet arrows recolour: the solids arrow becomes "Barite → กลับถัง" (amber, curving back to the tank) and the liquid arrow becomes "ทิ้ง" (grey). Then it flips back at 135.4.
  - 135.6: the drop leaves the weir. **136.4:** splashes into tank C (`bubble` + splash ring).
  - The return ribbon from the centrifuge to tank C turns teal.
  - The "Solids" node is fully lit.
- **Overlay:**
  - Funnel tier 4 "Centrifuge · ~2–7 µm" at 130.2.
  - Stage card "Centrifuge" 131.0–137.4.
  - Mode chip at (690, 1240) 133.4–135.6.
  - Caption 129.7–137.7.
- **Transition:** dip → S CAB at 137.7.
- **Assets:** centrifuge (#8).

### SHOT 24 · 137.7–145.7 · S CAB · Driller monitors
- **On screen:** over the shoulder of the seated driller (silhouette): console with joysticks, a big main screen, two side screens, and a dusk window.
- **Camera (model-local):** `cam (1.4, 3.3, 3.0) → (1.1, 3.1, 2.3) look (0, 2.6, -1.0) fov 40`, slow push. The main screen projects to about x 180–900, y 700–1180. Compute its 4 corners each frame with `proj` and draw the UI into that quad (affine fit).
- **Screen UI** (2D, dark #0b1220, teal accents). No numeric values except "100 SPM"; all trends are illustrative.
  - Tile 1 "SPP · psi": steady trend line.
  - Tile 2 "SPM": "100".
  - Tile 3 "Flow Out · %": bar.
  - Tile 4 "PVT (รวมทุกถัง) · bbl": a pit-level bar + total trend.
- **Beats:**
  - 138.4: tiles light up in order: SPP (138.6), SPM (139.0), Flow Out (139.4), PVT (139.8).
  - 141.4–143.6: one tank level bar rises; the PVT total trend steps up.
  - **142.0:** chip "PIT GAIN" blinks amber 3× with a soft `alarm`.
  - 144.0: resets to normal (green-teal) to show it also warns on loss. A brief "LOSS" ghost label flashes grey at 144.4.
  - Keep the flow paddle (tile 3) and PVT (tile 4) visually separate (different tiles, different colours).
- **Overlay:**
  - Card "Driller Monitors" 138.2–145.4.
  - Callouts: none (the screen tiles carry their own titles).
  - Mini-map stays.
  - Caption 137.7–145.7.
- **Transition:** dip → L aerial at 145.7.
- **Assets:** CAB (#13), screen UI (#15).

### SHOT 25 · 145.7–153.7 · L · Recap: the loop closes
- **On screen:** the same high aerial as shot 02, at dusk, with the full teal loop.
- **Camera:** `cam (20, 86, 62) → (16, 82, 56) look (14, 4, -2) fov 40` (slow crane-in, `eio`, 145.7–153.0).
- **Beats:**
  - 146.0–150.0: the drop does one fast lap of the full loop (L path + x-ray hole segment) in 4.0 s with a long trail. Arrows run on all segments, the return now teal after the centrifuge.
  - Each mini-map node pings as the drop passes.
  - **150.0:** splash into tank C, the ring closes, and the whole loop + mini-map ring pulse ×2 with the `success` SFX.
  - 150.0–153.7: the drop bobs; the loop holds glowing.
- **Overlay:**
  - Recap card 146.2–153.4 (3 lines at 146.7 / 147.5 / 148.3).
  - Mini-map in the "closed" state.
  - Caption 145.7–153.7.
- **Transition:** continuous into shot 26.
- **Assets:** loop path (#2).

### SHOT 26 · 153.7–161.3 · L · CTA
- **On screen:** a held aerial while the loop glow eases to 40 %.
- **Camera:** drift `cam (16, 82, 56) → (15, 80, 54)`.
- **Beats:**
  - The drop idles.
  - Follow-button tap animation at 155.5.
  - The mini-map fades out 153.8.
  - The chapter pill fades 153.8.
- **Overlay:** CTA card 154.2–161.0 (Part 3 `ctaCard` layout x 110–910, y 560–1000, avatar `assets/avatar.png`, title "กดติดตาม", line "namman.story"); caption 153.7–161.3.
- **Transition:** 0.3 s purple-tinted dip → shot 27.
- **Assets:** avatar (existing).

### SHOT 27 · 161.3–165.0 · L · Teaser: BOP
- **On screen:** looking down into the cellar under the floor: the BOP stack glowing purple (wc highlight); the circ loop dims.
- **Camera:** `cam (3.2, 5.6, -6.4) → (2.6, 5.0, -5.6) look (0, 0.9, 0) fov 40` (push). Annular top (540,533), rams (540,1060).
- **Beats:** `focusAt` switches to `['wc', 0.85]` from 161.3 (purple glow pulse); the drop is hidden.
- **Overlay:**
  - Teaser card 161.8–169.0 (top, y 200–560, purple #a855f7): "PART 5 / 5", "Well Control System", "BOP · Choke Manifold · MGS".
  - Callout "BOP" (purple, anchor (0, 1.5, 0), pill (780, 1200)) at 162.2.
  - Caption 161.3–169.3.
- **Transition:** dip → shot 28.
- **Assets:** BOP (existing).

### SHOT 28 · 165.0–170.0 · L · Teaser: choke manifold + MGS
- **On screen:** a low front view of the choke manifold and the tall MGS vessel (purple glow), with the worker for scale and the gas vent line rising.
- **Camera:** `cam (-8.0, 4.8, 24) → (-8.6, 5.0, 22.5) look (-12.0, 3.4, 4) fov 40`. MGS (291, 341–1381), choke (731,1196). The doghouse corner sits top-right (y ≤ 380, hidden under the card) and does not occlude.
- **Beats:**
  - 165.4: purple arrows run along `CHK_PTS` → `GAS_PTS` (existing `O.arrowsG`, tinted purple).
  - No flare (keep `O.flare.visible = false`).
- **Overlay:**
  - Callouts "Choke Manifold" (165.4, pill (760, 1240)) and "MGS" (166.0, pill (300, 1240)).
  - Logo/black fade 169.3–170.0.
- **Transition:** fade to black / logo.
- **Assets:** choke manifold, MGS, gas line (existing).

---

## 4. Drop timeline (master)

| t (s) | Where (set: coords) | Speed / look |
|---|---|---|
| 6.0 | L tank C surface (24.0, 2.55, -3.4) → hover (24.0, 5.2, -3.4) | pop, bob |
| 16.6–19.0 | L tank C → suction (24, 2.8, -4.2) → (24, 0.7, -1.4) | 0.9 u/s, dimmed under mud |
| 19.8–22.3 | L charge pump eye → impeller → outlet → triplex suction (21.25, 0.62, 6.1) | spiral, then 2 u/s |
| 22.8–29.0 | S PUMP_A (hidden in block, ring only) | — |
| 29.9–31.4 | S PUMP_B suction → chamber → discharge port | slowed stroke |
| 38.0–42.0 | S PUMP_B manifold under dampener → off -x | shimmer |
| 53.8–57.2 | L riser (8, 0.45 → 7.75, 1.5) → manifold → standpipe base (4.7, 7.75, 1.5) | 1.2 u/s |
| 57.4–61.0 | L standpipe y 7.75 → 23.5 | 4.4 u/s |
| 62.0–66.4 | L hose (`O.hose`, live) → gooseneck (0, 22.35, 0) | 3.5 u/s, slows at the low point |
| 70.0–74.8 | S WASH gooseneck → washpipe → packing → rotating shaft | 1.5 u/s |
| 77.1–80.4 | W bore y 8 → -36 | `eio`, peak ≈ 20 u/s |
| 81.2–82.8 | W nozzle → hole bottom → wall; chip attached 82.2 | jet burst |
| 83.9–90.0 | W annulus x 1.15, y -35.4 → 0.8, then the flowline stub | ≈ 5.9 u/s |
| 90.9–97.8 | L riser (0, 2.9 → 6, 0) → flowline → possum belly (12.25, 5.3, -5.0) | 1.6 u/s, gravity |
| 106.8–112.5 | L screen → through the mesh → tank A | deck shake |
| 114.8–120.6 | L degasser inlet → baffles → outlet → tank B (15.9, 2.8, -5.6) | film |
| 122.0–125.2 | L desander front cone (17.0, 5.4, -5.85) | vortex |
| 125.8–129.4 | L desilter front cone (19.8, 4.8, -4.7) → tank C (22.0, 2.8, -5.0) | fast vortex |
| 130.6–136.4 | L centrifuge feed → bowl → weir → tank C (26.6, 2.55, -5.6) | → clean |
| 146.0–150.0 | L full lap | 4 s lap |

**`DROP_RET` polyline (L)**, append to existing `RET_PTS[0..5]`:

`[0,2.9,0], [0,6.0,0], [0.4,6.0,-0.4], [10.75,5.15,-4.9], [12.25,5.3,-5.0], [12.25,4.95,-4.1], [12.25,4.6,-2.4], [12.6,2.55,-2.4], [13.9,2.2,-5.6], [13.95,4.9,-5.6], (baffle zig-zag ×4 down to) [14.45,3.15,-5.6], [15.25,3.3,-5.6], [15.9,2.8,-5.6], [16.6,2.2,-5.6], [17.0,5.4,-5.85] (cone spiral), [17.0,5.95,-5.85], [18.9,3.0,-5.6], [19.4,2.2,-5.2], [19.8,4.9,-4.7] (cone spiral), [21.25,3.3,-5.0], [22.0,2.8,-5.0], [24.4,2.2,-5.6], [24.4,4.6,-5.6], [25.6,4.6,-5.6] (bowl), [26.6,4.3,-5.6], [26.6,2.55,-5.6]`.

---

## 5. Mini-map (2D, top-right)

- Ring r 70 at (860, 258). 10 nodes, clockwise from the top: Tank, Pump, Standpipe, Hose, Top Drive, Drill String, Bit, Annulus, Flowline, Solids.
- Grey nodes are drawn 8.8–14.6.
- Each node lights teal on its first visit: 16.0, 23.0, 56.0, 62.0, 66.5, 77.2, 81.0, 84.0, 91.0, 106.8 (Solids fills in 4 quarter-arcs: 112.5 / 120.5 / 129.2 / 135.0).
- The arc between lit nodes fills teal (down leg) or brown → teal (return).
- The current node gets a 9-px pulse dot and its name as 18 px text under the ring.
- 150.0: the ring closes and pulses. Hidden from 153.8.

## 6. Readability checks

- Holds of ≥ 1–2 s: the hover in shot 01, the aerial hold 11–15.7, the stencil 16.4–19.0, the charge-pump hold 20–21.4, the gooseneck hold 66.5–67.5, the paddle macro, the centrifuge 131–135, the driller screen and the recap.
- Occlusion was checked for:
  - the tank row (ray passes over the pump top, y ≈ 6 > 4.4);
  - the under-floor shots (camera below the slab bottom y 6.5, outside the braced planes x = 3.4 and z = -7);
  - the standpipe (outside the derrick leg, camera on the +x/+z side);
  - the teaser (MGS left of the doghouse);
  - the solids cameras (rays miss the agitator gearboxes on tanks B/C).
- No [U] values on screen: no tank volumes (the stencil text is fixed), no SPP / precharge / slope / flow numbers. Gauges are needle-only with unit tags.
