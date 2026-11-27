# Director's treatment: Drilling Rig 101 · EP.05 · Part 5/5: Well Control System

Format: 1080x1920 (9:16), 30 fps, **183.6 s**. Thai VO (TTS), Thai/English captions and on-screen fact cards.
Timing source of truth: `docs/script.json`. It has 28 VO lines (1,616 VO characters), 28 captions and 20 cards.
Facts: only **[V]/[T]/[R]** items from `docs/research.md`. Every **[U]** item stays off screen: the API 53 stack classes, total stack weight as a number, typical closing times, trip-tank volume, diverter vent size, Thai DMF rules and the Koomey year.
System colour: **Well Control = purple #a855f7**. The series recap also uses Power #f59e0b, Hoisting #3b82f6, Rotating #ef4444 and Circulating #14b8a6.

**EP04 boundary.** EP04 already covered the kick, the warning signs, the shut-in steps, SIDPP/SICP, KMW and the kill methods. This part is about the **equipment** only. Callbacks are one line each: VO 2 ("จำ Kick จาก EP04 ได้ไหม") and the Choke Manifold card note ("Kill ตาม EP04: คุม Bottomhole Pressure ให้คงที่"). Do not show SIDPP/SICP numbers, the KMW formula or kill graphs.

---

## 1. Creative concept: "ประตูสองชั้นของหลุม" (the well's two doors)

Part 4 followed one drop of mud. Part 5 follows **three journeys**, each one a purple path that lights up:

1. **Down the stack (0–77 s).** The camera moves top to bottom past each component, like a lift going down floors. A small **floor indicator** on the left edge shows a stack silhouette with the current component lit purple. Each component then gets its own "how it closes" macro.
2. **The command (77.6–98 s).** A purple **pulse** travels from the driller's panel to the accumulator unit and along the hydraulic hoses into the BOP bonnets, and the rams close. The power is shown as stored energy: the nitrogen bottles discharge and the rig lights go dark, but the BOP still closes.
3. **The way out (98–140 s).** A gas bubble (white with a purple rim) leaves through the spool's choke outlet, passes the manual valve and the HCR, gets throttled at the adjustable choke, falls into the MGS, and splits: gas up to the flare, mud back to the tanks.

Then we turn inward (**inside the pipe**, 140–152 s), take a short look back at the top hole (**diverter**), close with **testing**, and end on the **5-system recap**.

- Hook (title card): "PART 5 / 5 · Well Control System · BOP · Choke Manifold · MGS". This answers Part 4's teaser word for word.
- Tone: calm confidence, not disaster drama. No blowout footage or fireballs, and no red alarm screens. The flare is a controlled, steady flame.

## 2. Emotional arc

| Beat | Time (s) | VO | Feeling |
|---|---|---|---|
| Payoff | 0–13.2 | 1–2 | "Finally, the last system." The answer to the teaser, then the reminder: mud first, equipment second. |
| Respect | 13.2–36.8 | 3–6 | Scale: a huge steel stack in the cellar, heavier than it looks. We go down it floor by floor. |
| Fascination | 36.8–63.7 | 7–10 | Mechanisms: the rubber donut squeezes, the rams slide in and lock. "Oh, so that's how it seals." |
| Awe (wow 1) | 63.7–77.6 | 11–12 | More than 600 t pushing up on closed rams; blades shearing pipe. The tension peaks here. |
| Reassurance (wow 2) | 77.6–98.2 | 13–15 | The rig lights go out, the bottles still close the BOP in ≤ 30 s. The well is safe. |
| Control | 98.2–139.6 | 16–21 | A smooth, controlled path: valve, choke, MGS, flare. A 5-psi mud seal (wow 3) is a small, clever surprise. |
| Thoroughness | 139.6–166.1 | 22–25 | Valves inside the pipe, the diverter, testing. "Nothing is left to chance." |
| Pride and closure | 166.1–183.6 | 26–28 | Five colours light up the whole rig. Follow CTA. EP06 teaser. |

## 3. Music notes

- Key and tempo: a low, steady synth pad with a soft pulse at about **72 BPM**, slower than Part 4's pump groove. The mood is "a heavy steel door closing."
- 0–13 s: the purple motif from the end of Part 4 resolves (same 3-note figure, now in major).
- 13–64 s: a sparse pulse. Each component hit gets a soft low "thunk" in time with the beat.
- 64–78 s: strings swell and the low end thickens under the 660-t card; a dry metallic accent lands on the shear cut (about 74 s).
- 84–99 s: a **near-silent drop** when the rig lights go out (about 93 s), then the pulse returns as the rams close. This is the emotional beat of the episode.
- 99–140 s: a flowing arpeggio follows the gas path, and a warm swell at the flare.
- 140–166 s: light and tidy, with a ticking motif under testing.
- 166–183.6 s: the full theme. The five-colour recap gets five rising notes, one per system. Duck under the CTA and fade out with the teaser.

## 4. THE STACK ARRANGEMENT (modeler and VO must match)

**One arrangement for the whole episode: a 13-5/8 in, 10,000 psi land stack with three rams and a 5,000 psi annular.**
This is the "10M = 3 rams (1 shear + 2 pipe) + 5M annular" land practice, and it is consistent with the 43 CFR 3172 10M minimum (annular + 2 pipe rams + blind rams). Research §2.2 and §2.4.

| # top → bottom | Component | Body | Colour in highlight mode | Notes for the model |
|---|---|---|---|---|
| 0 | Bell nipple + flowline outlet | short pipe | grey #9ca3af | Not a pressure device (Part 4). Never highlight purple. |
| 1 | **Annular preventer** (5M) | spherical/conical body | purple #a855f7 | Cut-away: rubber donut + steel inserts + piston below. |
| 2 | **Upper pipe ram (VBR)** | **upper cavity of a double-ram body** | purple | Two bonnets left/right; ram blocks with half-moon cut-outs. |
| 3 | **Blind-shear ram (BSR)** | **lower cavity of the same double-ram body** | purple + red edge on the blades | Blades offset vertically so they cut, then seal faces meet. |
| 4 | **Drilling spool** | short flanged spool | purple | **Choke outlet on the right side (camera's right), kill outlet on the left.** |
| 5 | **Lower pipe ram** | single-ram body | purple | Backup pipe seal below the spool. |
| 6 | **Casing head** (wellhead) | flanged housing on the surface casing | steel grey | Sits at the cellar floor. |

- **API code, read bottom-up: `10M – 13-5/8 – R-S-Rd-A`.** It is shown only as the small note on the stack diagram card if space allows; do not say it in the VO.
- The Diagram card (`kind: "diagram"`, 20.4–36.5 s) lists the same 6 tiers top to bottom. Its note says that real arrangements vary by operator.
- **Change needed in `scene3d.js`.** The model copied from Part 4 has, bottom to top: single pipe ram (y 1.73), pipe ram (y 2.52), shear (y 3.2), annular, with the choke outlet drawn below the rams. Rebuild it to the table above. Bottom to top, the order is: casing head → single lower pipe ram → **spool with side outlets** → double-ram body (BSR in the lower cavity, VBR in the upper cavity) → annular → bell nipple. Move the choke line so it leaves the **spool**, not the space below the lowest ram.
- Choke side valves, from the spool outwards: **manual gate valve (inner) → HCR (outer, with a small hydraulic actuator)**. Kill side: **manual gate valve → HCR or check valve → kill line**. Research §4.1.
- Scale: the stack is about 5–6 m tall in the cellar. Show a crew member for scale in the first wide shot.

## 5. Visual style notes for the animator

- Same stylized low-poly rig, palette, Kanit fonts and `partTitle` / `chapter` / `factCard` / `badge` / `nextTeaser` helpers as Parts 1–4. Reuse the EP04 BOP cut-away studio set ("B"), the land rig ("L") and Part 4's tanks/shakers/flare line.
- **Highlight mode:** meshes tagged `wc` glow purple #a855f7, and the other systems dim to about 35 %. In the recap (166.1–172.4 s) all five tags glow at once, each in its own colour.
- **Cut-aways:** half-section with a clean purple rim light on the cut face. Rubber parts are dark charcoal (#2b2b33); steel inserts and ram blocks are light steel.
- **Hydraulic pulse:** a short purple dash travelling along the hoses (about 3 m/s at rig scale), in Part 4's flow-ribbon style.
- **Gas:** white bubbles with a thin purple rim. Mud is Part 4 mud brown (#c8925a). Inside the MGS, gas and mud separate visibly.
- **Camera:** slow, with a 1–2 s hold on every key view. The "lift" move down the stack is one continuous vertical dolly with soft stops at each component (no cuts). Macro cut-aways use the Part 4 circular iris.
- **Safe zones:** visuals and labels y 160–1280, x 60–960. Captions y 1310–1560. Cards in the upper half (y about 180–620) or the right column, never over the caption band.
- **Readability (client rule):** at most **1 card and 2 labels per frame**. Card lines reveal one at a time, at least 0.8 s apart. Units are always shown (in, psi, s, ft, ตัน).
- **Floor indicator (new overlay):** a narrow stack silhouette at x 60–130, y 300–900, visible 20–77 s. The current component is purple, the others grey. It counts as a UI element, not a label.
- **Easter eggs ("namman.story" credit, nowhere else):**
  - the accumulator unit nameplate, "namman.story · BOP CONTROL UNIT 3000 PSI" (readable 79–85 s);
  - stencilled on the MGS vessel, as in EP04 (readable 120–126 s).
  No brand logos: the accumulator is a generic unit, and "Koomey" appears only as the name in VO/card text.

## 6. Section list

| # | Section | Start–end (s) | VO ids | Card |
|---|---|---|---|---|
| 1 | Title + hook | 0.0–6.2 | 1 | title |
| 2 | Barrier recap | 6.2–13.2 | 2 | Barriers |
| 3 | BOP = stack, not one valve | 13.2–20.2 | 3 | BOP = Blowout Preventer |
| 4 | Stack top → bottom | 20.2–36.8 | 4–6 | BOP Stack diagram (6 tiers) |
| 5 | Annular | 36.8–50.1 | 7–8 | Annular Preventer |
| 6 | Rams, seal and locks | 50.1–63.7 | 9–10 | Ram Preventers |
| 7 | Wow 1: 660 t | 63.7–70.6 | 11 | calc |
| 8 | Blind-shear ram | 70.6–77.6 | 12 | Blind Shear Ram |
| 9 | Accumulator / Koomey + panels | 77.6–91.4 | 13–14 | Accumulator (Koomey Unit) |
| 10 | Wow 2: power off, ≤ 30 s | 91.4–98.2 | 15 | Closing Time (API 53) |
| 11 | Choke & kill lines, HCR | 98.2–111.8 | 16–17 | Choke & Kill Lines |
| 12 | Choke manifold | 111.8–119.2 | 18 | Choke Manifold |
| 13 | MGS + wow 3: 5-psi seal | 119.2–133.4 | 19–20 | Mud Gas Separator |
| 14 | Trip tank | 133.4–139.6 | 21 | Trip Tank |
| 15 | Inside-the-pipe barriers | 139.6–152.1 | 22–23 | ปิดข้างในก้านเจาะ |
| 16 | Diverter | 152.1–159.2 | 24 | Diverter |
| 17 | BOP testing | 159.2–166.1 | 25 | BOP Testing (API 53) |
| 18 | 5-system recap | 166.1–172.4 | 26 | recap (5 colour chips) |
| 19 | Follow CTA | 172.4–177.4 | 27 (reused audio) | cta |
| 20 | EP06 teaser | 177.4–183.6 | 28 | teaser |

## 7. Shot-by-shot intent (3D) and labels

Labels are 3D callouts (`co(...)`): **at most 2 on screen at once**, each visible ≥ 3 s, ≤ 6 words. The English term goes on the first line; a short Thai line is optional.

| Shot | Time (s) | Set | Shot and intent | Labels (max 2) | Assets (new = ★) |
|---|---|---|---|---|---|
| S1 | 0.0–6.2 | L | Dusk wide of the rig. Purple light pours down from the floor into the cellar; slow push-in. The "Part 4 teaser" purple 3-note sting resolves. | none (title card) | Rig (P4) |
| S2 | 6.2–13.2 | W | Well cut-away: a mud column (brown) is labelled barrier 1, then the BOP at the top lights purple as barrier 2. A one-second ghost of EP04's gas bubble at the bottom. | "Primary: Mud" · "Secondary: Equipment" | Well cut-away (EP04) |
| S3 | 13.2–20.2 | L/Cellar | Tilt down from the rig floor into the cellar. The whole stack is revealed, with a crew member beside it for scale. | "BOP Stack" · "Cellar" | **Rebuilt BOP stack ★** (see §4), cellar, crew figure |
| S4 | 20.2–36.8 | Cellar | **The lift.** One continuous vertical dolly from the bell nipple down to the casing head, with a soft stop at each component as the diagram tier appears. Floor indicator active. | one label per stop (the current component), the previous one fades out | Floor-indicator overlay ★ |
| S5 | 36.8–43.6 | B | Annular half-section. The piston rises, the donut squeezes inward, steel inserts form a ring. First it closes on 5 in pipe. | "Packing Element" · "Piston" | Annular cut-away ★ |
| S6 | 43.6–50.1 | B | Same section: the element closes on a square kelly-like shape, then on an **empty hole**. Then stripping: the element is slightly relaxed as a tool joint passes slowly upward. | "Open Hole" → "Stripping" | Tool joint, square shape props ★ |
| S7 | 50.1–56.3 | B | Top-down section of the ram cavity: two ram blocks drive in from the bonnets and meet around the pipe; a half-moon close-up. | "Pipe Ram" · "Bonnet" | Ram cavity cut-away ★ |
| S8 | 56.3–63.7 | B | VBR inserts fan around a smaller pipe. Then the front packer + top seal glow; small upward arrows (well pressure) push the seal tighter. A manual lock screw turns / a wedge slides behind the piston. | "VBR" · "Ram Lock" | VBR insert ★, lock screw/wedge ★ |
| S9 | 63.7–70.6 | B | **Wow 1.** Under the closed rams, a 13-5/8 in disc fills with pressure-colour; numbers count up 0 → 10,000 psi; a giant "660 t" weight icon hangs (upside-down arrow) beneath the rams. | none (calc card) | Pressure disc overlay ★ |
| S10 | 70.6–77.6 | B | BSR: the blades close, the pipe body is sheared, the cut pipe drops slightly, then the faces seal. Insert: a tool joint at the blades gets a grey "✕" (cannot cut) and the string is picked up so plain pipe sits across the blades (space-out). | "Blind Shear Ram" · "Space Out" | BSR blades ★, sheared pipe pieces ★ |
| S11 | 77.6–84.6 | L | Driller presses the two-hand "master + function" buttons on the floor panel. The purple pulse runs down the hose bundle to the accumulator unit at ground level (nameplate easter egg). | "Driller's Panel" · "Koomey Unit" | Driller's remote panel ★, accumulator unit ★, hose bundle ★ |
| S12 | 84.6–91.4 | Unit | Accumulator macro: a bottle cut-away with a nitrogen bladder (blue-grey) and hydraulic fluid (amber). Gauges read **1,000** precharge, then **3,000** as the pump charges. The manifold gauge reads 1,500. | "N₂ Precharge" · "3,000 psi" | Bottle cut-away ★, gauge set ★ |
| S13 | 91.4–98.2 | L → Cellar | **Wow 2.** The rig lights go out (generator hum stops). Bottles discharge; the purple pulse reaches the bonnets; the rams close. A "≤ 30 s" stopwatch ring completes in the corner. | "Rig Power: OFF" | Light-off state, stopwatch overlay ★ |
| S14 | 98.2–104.4 | Cellar | Close on the spool's choke side: the inner manual gate valve (handwheel), then the HCR actuator. The HCR opens fully (gate slides). | "Manual Valve" · "HCR" | Gate valves + HCR actuator ★ |
| S15 | 104.4–111.8 | Cellar | HCR open/closed toggled once (only two states). Pan to the kill side; a mud pump arrow pushes mud **into** the annulus below the closed rams. | "HCR: Open/Closed" · "Kill Line" | Kill line + check valve ★ |
| S16 | 111.8–119.2 | L | Follow the choke line to the choke manifold skid. The adjustable choke trim narrows; the remote choke panel shows DP and casing gauges + stroke counter (no specific numbers). | "Adjustable Choke" · "Choke Panel" | Choke manifold (P4/EP04, add choke trim cut-away ★), remote choke panel ★ |
| S17 | 119.2–126.4 | L | Mud + gas into the MGS (cut-away): it hits the target plate and baffles; gas rises up the big vent line to a steady flare; mud flows out of the bottom. Easter egg stencil on the vessel. | "MGS" · "Flare" | MGS cut-away ★ (upgrade EP04 MGS), vent line, flare |
| S18 | 126.4–133.4 | MGS | **Wow 3.** Close on the U-shaped mud leg: the liquid column (about 10 ft) is outlined; a small "≈ 5 psi" gauge; the gas pressure arrow pushes on the mud surface but stays below it. The vent line diameter is highlighted (8–12 in). | "Mud Leg ~10 ft" · "Vent Line" | U-tube mud-leg detail ★ |
| S19 | 133.4–139.6 | L | Tripping out: a stand comes out of the hole; the tall narrow trip tank level drops in steps as it fills the hole; the measured fill matches the calculated fill (check mark). | "Trip Tank" | Trip tank (P4) |
| S20 | 139.6–145.2 | L (floor/top drive) | Cut-away of the top drive main shaft: the upper IBOP (remote) ball rotates closed; the lower IBOP gets a wrench icon. | "Upper IBOP" · "Lower IBOP" | Top drive (P3), IBOP ball valves ★ |
| S21 | 145.2–152.1 | Floor → W | The FOSV sits on the rig floor, **open**, with its wrench beside it. Quick cut down the string to the float valve flapper above the bit, which closes against back-flow. | "FOSV (Open)" · "Float Valve" | FOSV + wrench ★, float sub cut-away ★ |
| S22 | 152.1–159.2 | L (ghost) | A semi-transparent earlier stage of the well: only the conductor, a low diverter on top, two big vent lines. Shallow gas arrives, the diverter closes, the vent valve opens and gas leaves downwind, away from the rig. | "Diverter" · "Vent Line" | Diverter + vent lines ★ |
| S23 | 159.2–166.1 | Cellar | A test plug in the wellhead; a pressure chart pen draws a low step (250–350), then a high step, and holds flat; a calendar chip "≤ 21 days" and a weekly "Function" chip. | "Test Plug" | Test plug ★, chart recorder overlay ★ |
| S24 | 166.1–172.4 | L | Crane up to the full rig; the five systems light up one by one in their colours: Power (engines), Hoisting (drawworks/blocks), Rotating (top drive), Circulating (pumps/loop), Well Control (BOP/choke/MGS). | none (recap card) | Five highlight tags |
| S25 | 172.4–177.4 | L | Hold the dusk aerial; CTA card with avatar, follow tap at about 174 s. | none | `assets/avatar.png` |
| S26 | 177.4–183.6 | W | Tilt down the wellbore: casing strings shown as nested tubes, a hint of grey cement between them (silhouette only, no facts). Fade at 183.0. | none | Nested casing silhouette ★ |

## 8. On-screen cards (exact text in `script.json` → `cards`)

Cards never overlap. Each one runs over its VO window and holds at least 4.3 s (the CTA); every content card holds 5.5–16 s.

- **Barriers:** Primary: Mud Hydrostatic / Secondary: Well Control Equipment / BOP · Choke & Kill · Control Unit.
- **BOP = Blowout Preventer:** the blowout is defined precisely as "ของเหลวในหลุมพุ่งขึ้นมาจนคุมไม่ได้" (client rule: no vague verbs).
- **BOP Stack diagram:** 6 tiers revealed in sync with the lift (see §4).
- **calc "แรงบน Ram ที่ปิด":** 145.8 in² × 10,000 psi ≈ 1.46 million lbf ≈ 660 t. Note: calculated at the 10M rated pressure.
- **Accumulator:** includes the Koomey trivia as the note ("ชื่อคน: Paul Koomey").
- **Closing Time:** note "30 s คือเวลาสูงสุดที่ยอมให้ ไม่ใช่เวลาปกติ" (misconception 11).
- **Recap card:** adds a `chips` array with the five system colours. The renderer draws five pills in order. If `KIT` has no chip support yet, draw the two `lines` and tint each word.
- **Teaser:** "EP.06 / Casing & Cementing / ท่อกรุ · ซีเมนต์หลุม". Purple is not required here; use a neutral grey/cement tone (#94a3b8) so it does not look like a sixth rig system.

## 9. Fact guardrails for the animator and editor

- The BOP is a **stack**, not one valve. It sits in the **cellar** on the casing head, not on the seabed.
- Mud is the **primary** barrier; the BOP equipment is **secondary**.
- Only the **blind-shear** ram cuts. It **cannot** cut tool joints, collars or BHA tools. Never show a plain blind ram closing on pipe.
- The annular can close on open hole; do not animate it as a ram.
- Well pressure **assists the seal**; it does **not** close the rams. The hydraulic pulse must arrive before the rams move.
- The accumulator holds **nitrogen** (never air). The **stored bottles close** the BOP; the pumps only recharge.
- The HCR is an **on/off gate valve**, not the choke. The adjustable choke throttles but is **not** a full-seal device.
- The kill line pumps **into the annulus below the BOP**; do not show it as the normal kill path.
- The MGS works at **a few psi**. Gas goes to the **flare**; mud goes to the shakers/trip tank/pits. Do not label it "degasser".
- The FOSV is kept **open** on the floor.
- The diverter **redirects** flow and does not shut in the well.
- Testing: low 250–350 psi first, then high; hold ≥ 5 min; pressure test ≤ 21 days (API 53); function test weekly.
- No blowout footage, no fire on the rig, no injured people.

## 10. VO / TTS notes

- 28 lines, 1,616 characters (with spaces). Every window is sized at ≤ 9.0 Thai characters per second (spaces excluded); most are about 8.8. Every line is ≤ 70 characters. Gaps are 0.3 s. Measured TTS speed on this voice is about 13 chars/s (vo12.mp3: 37 chars in 2.85 s), so each window has real breathing room.
- `text` = what goes to TTS, with English terms in Thai phonetics from research §10. Acronyms are spelled out: บี-โอ-พี, วี-บี-อาร์, เอช-ซี-อาร์, เอ็ม-จี-เอส, ไอ-บี-โอ-พี, เอฟ-โอ-เอส-วี, พี-เอส-ไอ, and อีพีสี่ for EP04. Numbers are Thai words (หมื่น, สามพัน, ยี่สิบเอ็ด).
- `text_display` = the same sentence with English spellings, for reference and for checking against the captions.
- No line stacks 3 or more English terms. Loanwords that crew say in Thai (ไนโตรเจน, ไฮดรอลิก) are not counted.
- Client terminology rule: no vague verbs for technical events. Use "โบลว์เอาท์" (VO 3) and "ของเหลวในหลุมพุ่งขึ้นมาจนคุมไม่ได้" (card). The word "พ่น" is not used anywhere. Use crew terms where they exist: ทูลจอยต์ (not "ข้อต่อ"), สปูล, แรมล็อก.
- VO 27 is the **reused CTA**: `"reuse": "ep05-rig-p1-power/vo/vo12.mp3"`, exact text "กดติดตามไว้ เพื่อไม่พลาดตอนต่อไปนะครับ", about 2.85 s in a 4.5 s window (172.4–176.9). Copy it to `vo/vo27.mp3` before running `tools/mix_vo.py`.
- VO 28 teaser: "ตอนต่อไปเราจะไปพูดถึง เคซิ่ง แอนด์ ซีเมนติ้ง กันครับ". It is generic, with no facts.
- Recap VO 26 uses Thai system names (ต้นกำลัง ยก หมุน ไหลเวียนโคลน ควบคุมหลุม) so that no line stacks five English terms. The English names are on the recap chips.

## 11. SFX cue suggestions

`whoosh` at section changes; `clunk` at each lift stop (20–37 s) and on ram contact (about 53, 94 s); `hiss` on the annular squeeze (about 39 s) and the accumulator discharge (about 94 s); `impact` (dry, metallic) on the shear cut (about 74 s); a power-down hum cut + silence at about 93 s; `bubble` on gas in the choke line and MGS (119–127 s); `fire` (soft, steady) at the flare (about 123 s); `blip` on each card line and diagram tier; `success` on the trip-tank check (about 138 s) and at the recap (about 171 s). No `alarm` in this episode: the mood is control.
