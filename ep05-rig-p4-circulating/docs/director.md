# Director's treatment: Drilling Rig 101 · EP.05 · Part 4/5: Circulating System

Format: 1080x1920 (9:16), 30 fps, **170 s**, Thai VO (TTS) + Thai/English captions + on-screen fact cards.
Timing source of truth: `docs/script.json` (22 VO lines, 1,172 VO characters, 22 captions, 23 cards).
Facts: only **[V]/[T]/[R]** items from `docs/research.md`. Every **[U]** item is kept off screen (tank volumes, charge-pump pressure, dampener precharge %, flowline slope, jet velocity, hose ID, mud-check frequency).
System colour: **Circulating = teal #14b8a6**. Part 5 teaser uses Well Control purple **#a855f7**.

---

## 1. Creative concept: "ตาม Mud หนึ่งหยด" (follow one drop)

One glowing **teal drop of mud** is our guide. It leaves the active tank, gets squeezed by the pump, climbs the mast, dives down the string, blasts out of a bit nozzle, picks up a cutting, rides up the annulus, falls down the flowline and gets "cleaned" stage by stage, until it drops back into the same tank. The episode is literally one lap of the loop.

- A **loop map** (mini-map, top-right) is built as the drop travels. Each component lights up teal once visited. At 146 s the loop closes and the whole ring pulses: that is the recap.
- Two legs, two looks:
  - **Down leg (high pressure):** the drop is bright teal, moving fast, with a pressure "shimmer" and a small SPP needle.
  - **Up leg (returns):** the drop carries one rock cutting (orange-brown chip), moves slower, and the mud looks dirtier. After each solids-control stage the drop visibly sheds particles and gets cleaner, until it is clean teal again at the tank.
- Hook (title card): **"Mud 1 หยด เดินทางผ่านอะไรบ้าง?"**, which answers Part 3's teaser ("Mud ไหลวนในหลุมได้ยังไง?").

**Not a repeat of EP03.** EP03 covered what mud is, its 5 jobs, the mud-weight window, WBM/OBM/SBM and mud tests. Part 4 is about the **equipment and flow path** only. Do not show mud-weight windows, mud types or the mud balance/Marsh funnel.

## 2. Emotional arc

| Beat | Time | Feeling |
|---|---|---|
| Curiosity | 0–16 s | "Where does this drop actually go?" Small drop, huge rig. |
| Power | 16–54 s | The pump as the heart: heavy, rhythmic, pistons thumping, numbers that impress (1,600 hp, 7,500 psi). |
| Ascent and plunge | 54–91 s | Thrill ride: up the mast, through the hose, a fast dive down the string, a jet blast at the bit. |
| Watchfulness | 91–106 s | Quiet tension: the flow paddle. "More out than in = possible kick." Plants the seed for Part 5. |
| Satisfaction | 106–138 s | Order from mess: the drop gets cleaner stage by stage (coarse → fine). |
| Control and closure | 138–154 s | The driller's screen, then the loop closes in one teal ring. |
| Anticipation | 154–170 s | Follow CTA, then the teaser turns purple: well control. |

Music: a low pulse that locks to pump strokes in 16–54 s (about 100 BPM, a nod to "100 SPM"), lifts in the ascent, drops to a near-silent tick under the flow-check beat, a light "clean" arpeggio in solids control, and a resolve at the recap.

## 3. Visual style notes for the animator

- Same stylized low-poly rig, palette, Kanit fonts, `partTitle` / `chapter` / `factCard` / `badge` helpers as Parts 1–3. Reuse the EP03/EP04 mud system (tanks, shakers, hydrocyclones, degasser) and the rig from Part 3 (top drive, hose, standpipe already modelled).
- **Highlight mode:** the circulating system meshes are tagged `circ` and glow teal; other systems dim to about 35 %. Pipe interiors are shown with a cut-away (a half-section with a teal flow ribbon inside).
- **The drop:** an emissive teal sphere (about 0.35 m at rig scale, grown in macro shots) with a soft trail. It must always be visible, so give it an outline when it passes in front of teal geometry.
- **Flow ribbons:** animated dashed teal arrows along every pipe the drop has passed; the return leg uses a mud-brown ribbon (#c8925a) that turns teal after the centrifuge.
- **Camera:** slow, with a 1–2 s hold on each key view before moving. No whip pans. Macro cut-aways get a soft circular iris transition.
- **Safe zones:** visuals and labels y 160–1280, x 60–960; captions y 1310–1560; cards sit in the upper half (y about 180–620) or the right column, never over the caption band.
- **Readability:** at most 2 new labels appear at once. Card lines reveal one at a time, at least 0.8 s apart. Cards are held for their full window (all ≥ 6 s). Units are always shown (in, psi, gpm, µm, G).
- **Easter eggs ("namman.story"):** stencilled on the active-tank wall (16–22 s, readable ≥ 2 s) and on the mud-pump nameplate (23–29 s, "namman.story · TRIPLEX 1600").
- **No brand imitation:** the pump is a generic triplex model. "FC-1600" appears only as the data citation line on the liner card.

## 4. Section list

| # | Section | Start–end (s) | VO ids | Summary |
|---|---|---|---|---|
| 1 | Title + hook | 0.0–8.0 | 1 | Series title card, Part 4/5, teal accent; hook question. |
| 2 | The loop | 8.0–15.7 | 2 | Wide rig shot, loop map draws itself, the drop appears in the tank. |
| 3 | Tanks + charge pump | 15.7–22.5 | 3 | Active tank, trip tank, charge pump feeding the triplex. |
| 4 | The mud pump | 22.5–45.5 | 4–6 | Triplex cut-away; liner trade-off; dampener + pop-off. |
| 5 | Pump output calc | 45.5–53.5 | 7 | Calc card: 0.000243 × D² × L → 441 gpm. |
| 6 | Up the rig | 53.5–76.9 | 8–10 | Standpipe manifold → standpipe → kelly hose → gooseneck → washpipe. |
| 7 | Down the hole | 76.9–90.7 | 11–12 | Inside the string, bit nozzles jet; cuttings up the annulus. |
| 8 | Returns + flow check | 90.7–106.5 | 13–14 | Bell nipple, flowline, flow paddle, flow out vs flow in. |
| 9 | Solids control | 106.5–137.7 | 15–18 | Shakers → degasser → desander → desilter → centrifuge; particle funnel. |
| 10 | Monitoring | 137.7–145.7 | 19 | Driller's screen: SPP, PVT gain/loss alarm. |
| 11 | Recap | 145.7–153.7 | 20 | The loop closes; full teal ring. |
| 12 | Follow CTA | 153.7–161.3 | 21 | The existing "กดติดตามไว้…" audio (about 2.8 s) in a 7 s window. |
| 13 | Teaser Part 5 | 161.3–170.0 | 22 | Purple: BOP stack, choke manifold, MGS. Fade to logo at 169.3. |

## 5. On-screen fact cards per section

All text matches `script.json` → `cards`. "≈" and "~" mark typical values; keep them on screen.

**1. Title (0.4–7.8):** DRILLING RIG 101 · EP.05 / PART 4 / 5 / Circulating System / hook "Mud 1 หยด เดินทางผ่านอะไรบ้าง?"

**2. Circulating System (8.6–15.4):** Closed loop · วงปิด / ขาลง: ปั๊มอัดแรงดันสูง / ขาขึ้น: กลับมาคัดกรองที่ผิวดิน

**3. Mud Tanks (16.2–22.4):** Active Tank: Mud ที่หมุนเวียน / Trip Tank: ถังแคบ วัดตอนถอนท่อ / Charge Pump: ป้อน Mud ให้ปั๊มใหญ่
- Do not show tank volumes (they are [U]).

**4a. Triplex Mud Pump (23.0–29.4):** 3 ลูกสูบ · Single-acting / ตัวอย่าง: 1,600 hp · 120 SPM / Stroke 12 in · 5,000 / 7,500 psi
- 5,000 psi is the standard fluid end; 7,500 psi is optional. Both [V].

**4b. Liner Size (30.2–37.2):** 7 in → 720 gpm · 3,429 psi / 4½ in → 297 gpm · 7,500 psi / ข้อมูล FC-1600 @ 120 SPM
- Show as a **seesaw diagram**: a big liner tips toward "Flow", a small liner toward "Pressure".

**4c. Pump Safety (38.0–45.2):** Pulsation Dampener: อัด N₂ / ลดแรงกระชากของแรงดัน / Pop-off Valve: กันแรงดันเกิน
- Do not show any precharge % ([U]). Show the pressure trace smoothing from a sawtooth to a near-flat line.

**5. Pump Output calc card (46.0–53.4).** The lines build one at a time:
1. `bbl/stk = 0.000243 × D² × L`
2. `6 in × 12 in = 0.105 bbl/stk`
3. `× 100 SPM ≈ 441 gpm*`
- Footnote (small): "* ที่ 100% efficiency (95% ≈ 419 gpm)".
- Animation: D² and L highlight on the 3D liner, a stroke counter ticks to 100, and a bucket gauge fills to 441 gpm. Do **not** say "per minute = 0.105 × 100 × 42" too fast; the three lines are enough.

**6a. Standpipe (54.0–61.2):** Manifold: วาล์วแยกทาง Mud / SPP Gauge ให้ Driller ดู / ท่อเหล็กขึ้นเสา ~2/3 ความสูง

**6b. Rotary / Kelly Hose (62.0–69.2):** สายยางเสริมเหล็ก แรงดันสูง / ขยับขึ้นลงตาม Top Drive / ต่อเข้า Gooseneck ไม่ใช่ Kelly

**6c. Gooseneck + Washpipe (70.0–76.6):** Gooseneck: ท่อโค้ง อยู่กับที่ / Washpipe: ซีลระหว่างนิ่งกับหมุน / Packing สึกหรอ ต้องเปลี่ยน

**7a. Bit Nozzles (77.4–83.4):** ขนาดเป็น 1/32 in (12 = 12/32) / แรงดันราว ½–⅔ ของ SPP ใช้ที่ Bit / เมื่อออกแบบ Hydraulics ให้เหมาะ
- Optional mini bar: an SPP bar split into "Bit ~½–⅔" (teal), "Drill string" (grey) and "Annulus (เล็กสุด)" (thin). Use no other percentages.
- The jets clean the cutters and hole bottom; **the bit cuts the rock**. Do not animate the jet "cutting" the rock.

**7b. Annulus (84.2–90.4):** ช่องว่างรอบ Drill String / พา Cuttings ขึ้นผิวดิน / AV ทั่วไป ~100–200 ft/min

**8a. Return Line (91.2–98.4):** Bell Nipple: บนสุดของ BOP Stack / ไม่ได้ใช้ปิดหลุม / Flowline: ลาดลง ไม่มีแรงดัน
- No slope number ([U]).

**8b. Flow Check (99.2–106.2):** Flow Paddle วัด Flow Out (%) / Flow Out ↑ ขณะปั๊มเท่าเดิม / = สัญญาณ Kick แรกสุดบนผิวดิน
- Diagram: two gauges side by side, **Flow In** (from pump strokes) and **Flow Out** (paddle %). Flow Out creeps up while the SPM counter stays fixed, and an amber (not red) warning chip says "Possible kick → Part 5".

**9. Solids control: particle-size funnel diagram (107.0–137.4).** A persistent diagram in the left column: a funnel with 4 tiers, each tier added as its machine is shown. Particles fall into the funnel; big ones are caught at the top, smaller ones lower down.

| Tier | Appears at | Label | Size |
|---|---|---|---|
| 1 | 107.4 | Shale Shaker | > ~75 µm (API 200) |
| 2 | 122.2 | Desander | D50 ~40–50 µm |
| 3 | 125.6 | Desilter | D50 ~15–20 µm |
| 4 | 130.2 | Centrifuge | ~2–7 µm |

- Footer: "ค่าประมาณทั่วไป · Degasser อยู่หลัง Shaker (ไม่ได้แยกตามขนาด)". The degasser is drawn as a **gas bubble icon beside the funnel**, between tier 1 and tier 2, not as a tier: it removes gas, not particles.
- Stage cards in the right column (one at a time):
  - **Shale Shaker (108.4–113.6):** ตะแกรงสั่น Linear Motion ~4–7 G / API 200 ≈ 69–82.5 µm / เลข API ไม่ใช่ Mesh
  - **Vacuum Degasser (114.4–121.4):** ดูดแก๊สที่ปนในโคลนออก / อยู่ก่อนเครื่องที่ใช้ปั๊มหอยโข่ง / ≠ Mud Gas Separator (Part 5)
  - **Hydrocyclones (122.6–129.4):** Desander: กรวย 10 in · ~500 gpm / Desilter: กรวย 4 in · ~60 gpm / Desander ต้องมาก่อน Desilter
  - **Centrifuge (131.0–137.4):** ถังหมุนแนวนอน + Screw Conveyor / Mud หนัก: เก็บ Barite (~650 G) / Mud เบา: ทิ้งของแข็งละเอียด

**10. Driller Monitors (138.2–145.4):** SPP: แรงดันที่ Standpipe / PVT: รวมปริมาตรทุกถัง / เตือน Pit Gain / Loss
- PVT measures **volume**, not flow. Keep the flow paddle and the PVT visually separate.

**11. Recap (146.2–153.4):** Tank → Pump → Standpipe → Hose / Top Drive → Drill String → Bit / Annulus → Flowline → Solids Control

**12. CTA (154.2–161.0):** "กดติดตาม" + namman.story avatar (`assets/avatar.png`), follow button tap animation at about 155.5 s.

**13. Teaser (161.8–169.0):** PART 5 / 5 / Well Control System / BOP · Choke Manifold · MGS, in purple #a855f7.

## 6. 3D shots and assets per section

| # | Shots | Assets (new = ★) |
|---|---|---|
| 1 | Dusk wide of the land rig, slow push-in; the teal drop pops out of the active tank at 6 s. | Rig (Part 3), title overlay, teal drop ★ |
| 2 | Crane up to a 3/4 aerial of the whole rig; teal loop line traces tank → pump → mast → hole → flowline → shakers → tank; mini-map forms top-right. | Loop path spline ★, mini-map overlay ★ |
| 3 | Low dolly along the tank row (agitator paddles turning), tilt to the tall narrow trip tank, then follow the drop into the suction line and through a small centrifugal charge pump (impeller cut-away). | Mud tanks with agitators (EP03), trip tank ★, charge pump ★ |
| 4 | Hero shot of the triplex pump; cut-away of the power end (crankshaft, rods, crossheads) driving 3 pistons in sequence; drop squeezed out of a discharge valve. Liner swap 7 in ↔ 4½ in with the seesaw. Dampener ball on the discharge with an N₂ label and pressure trace; pop-off valve with a vent line back to the tank. | Triplex pump with fluid-end cut-away ★, liners (2 sizes) ★, pulsation dampener ★, pop-off valve ★, nameplate easter egg ★ |
| 5 | Locked-off macro of one liner: D and L dimension arrows; stroke counter; gallon gauge filling. | Dimension-arrow overlay ★, stroke counter ★ |
| 6 | Follow the drop through the standpipe manifold valve block (SPP gauge needle rises) → long climb up the standpipe on the mast leg (camera rides alongside) → through the drooping kelly hose as the top drive moves 2 m → over the gooseneck → washpipe cut-away (stationary top, rotating shaft below, packing rings highlighted). | Standpipe manifold ★, SPP gauge ★, standpipe + kelly hose (Part 3; animate droop), gooseneck/washpipe cut-away ★ |
| 7 | Cut-away of the drill string: drop dives down (speed lines); cut to the bit at the bottom: 3 nozzles fire jets that sweep cuttings off the cutters and hole bottom (the cutters are what break the rock). The drop grabs a cutting and rises in the annulus (ring cross-section inset). | Drill-string cut-away, PDC bit (Part 3) + nozzles ★, cuttings particles ★, annulus inset ★ |
| 8 | Up through the BOP stack to the bell nipple (label "not a seal"), out the side outlet, along the sloped open flowline; macro of the hinged flow paddle deflecting; flow-in vs flow-out gauges. | BOP stack (EP04), bell nipple ★, flowline ★, flow paddle ★, gauge overlay ★ |
| 9 | Possum belly → shaker deck vibrating with linear motion, cuttings walking off the end → vacuum degasser (thin film over baffles, bubbles expand and leave) → hydrocyclone bank (tangential swirl, underflow out of the apex, clean overflow on top), desander's big cones then desilter's small cones → decanting centrifuge cut-away (bowl + scroll) → clean drop falls into the tank. | Shakers, degasser, hydrocyclones (EP03; add cut-aways ★), centrifuge ★, particle-size funnel overlay ★ |
| 10 | Over-shoulder of the driller's chair: screen with SPP, SPM, flow-out %, PVT total; one pit-level bar rises and a "PIT GAIN" chip blinks amber. | Driller's cabin + screen UI ★ |
| 11 | Pull back to the aerial; the full loop glows teal; the drop completes the lap and splashes into the active tank. | Loop spline, mini-map |
| 12 | Hold the aerial at dusk; CTA card. | Avatar |
| 13 | Camera tilts down to the BOP stack, which glows purple; choke manifold and MGS ("poor-boy") silhouettes; fade. | BOP, choke manifold, MGS (EP04) |

## 7. Fact guardrails for the animator and editor

- The loop is **closed** (only solids and gas leave it).
- Order: shakers → degasser → desander → desilter → centrifuge. Never put the desilter before the desander or the centrifuge first.
- The **MGS is not in the routine loop**; it is fed from the choke manifold during well control. Show it only in the teaser.
- The mud pumps are **positive-displacement reciprocating** pumps. Only the charge pump and the solids-control feed pumps are centrifugal.
- Triplex = **single-acting**. A smaller liner = **more pressure, less flow**.
- The dampener is charged with **nitrogen**, never air.
- The kelly hose connects to the **gooseneck**. The washpipe is a **seal**, not a pipe for washing.
- Nozzle sizes are in **32nds of an inch**. The annulus takes the **smallest** share of pressure loss.
- The bell nipple **does not seal the well**; the flowline is **not pressurized**; the flow paddle reads **%**, not exact bbl/min.
- Screens are labelled by **API number (D100)**, not mesh.
- The barite-recovery centrifuge **keeps** barite (heavy underflow returned).

## 8. VO / TTS notes

- 22 lines, 1,172 characters in total. Every line fits its window at ≤ 8.0 characters per second (most lines at 7.3–7.6). Gaps are ≥ 0.4 s (mostly 0.6 s).
- Phonetic spellings from the glossary: เซอร์คิวเลติ้ง ซิสเต็ม, แอคทีฟแท้งค์, ชาร์จปั๊ม, ทริปเพล็กซ์, ไลเนอร์, แดมเปนเนอร์, ป๊อปออฟวาล์ว, สแตนด์ไปป์ แมนิโฟลด์, เคลลี่โฮส, กูสเน็ค, วอชไปป์, นอซเซิล, แอนนูลัส, เบลนิปเปิ้ล, โฟลว์ไลน์, เชลเชคเกอร์, ดีแก๊สเซอร์, ดีแซนเดอร์, ดีซิลเตอร์, เซ็นตริฟิวจ์, แบไรต์. Acronyms are spelled letter by letter: จี-พี-เอ็ม, บี-โอ-พี, เอส-พี-พี, พี-วี-ที. SPM is spoken as "ร้อยชักต่อนาที", so no acronym is needed there.
- Numbers in the VO are written as Thai words (หกนิ้ว, สี่ร้อยสี่สิบ) so the TTS does not read them in English.
- VO 21 is the reused CTA file (exact text "กดติดตามไว้ เพื่อไม่พลาดตอนต่อไปนะครับ", about 2.8 s) in the 154.0–161.0 window.
- VO 22 begins "ตอนต่อไป เราจะไปดู Well Control System …".

## 9. SFX cue suggestions

whoosh at section changes; `pump` thumps synced to piston strokes (23–53 s); `hiss` on the dampener and the pop-off vent; `bubble` at the drop's tank exit, the degasser and the final splash; `clunk` on the manifold valve; `blip` on each card/tier; `alarm` (soft) on the flow check at about 103 s and the PVT gain chip at about 142 s; `success` at the loop close (about 150 s).
