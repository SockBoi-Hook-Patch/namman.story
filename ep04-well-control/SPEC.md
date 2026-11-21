# namman.story EP04 — Well Control: จาก Kick ถึง Kill — Spec / Contract

Same production format as EP03 (`../ep03-drilling-mud/`): MP4 1080x1920 (9:16), 30 fps, **DURATION = 120 s**,
not looped. Stylized LOW-POLY 3D motion graphics (same look/palette as EP01–03), Thai captions burned in by the
integrator (Kanit card at y≈1310–1560), music + SFX. Voice-over (Gamo) can be added afterwards with
`tools/mix_vo.py`. Brand: "namman.story" only as easter eggs inside the 3D world.

API identical to EP03 (`scene3d.js` default export: DURATION, init, renderFrame(t) pure fn of t, drawOverlay,
captions, cues; `music.js` global `Score.renderWav(duration, cues)`). three@0.160.0 in ./node_modules.
Safe zones: visuals/labels y 160–1280, x 60–960; caption zone y 1310–1560 calm; y>1600 background only.
SFX names: 'whoosh','alarm','clunk','impact','hiss','fire','pump','success','blip','bubble'.

## Language
Thai sentences, but technical terms stay in ENGLISH (viewers asked for this): Kick, Pit Gain, Flow Check,
Shut-in, BOP, Annular, Pipe Ram, Choke, Choke Manifold, Mud Gas Separator, SIDPP, SICP, Kill Mud, Mud Weight,
Driller's Method, Wait & Weight, Primary/Secondary Barrier, Bottomhole Pressure.

## Readability rules (same as EP03)
- Each caption 5–8 s, Thai ≤ 45 characters; duration ≥ 1.5 s + chars/9.
- Labels ≤ ~6 words, visible ≥ 3 s; never more than 2 new labels at once. Camera holds on key views.

## Facts
- KICK = unwanted influx of formation fluid (gas/oil/water) into the wellbore because bottomhole pressure
  (mud hydrostatic) < formation (pore) pressure. Left uncontrolled → BLOWOUT.
- Barriers: PRIMARY = drilling mud hydrostatic; SECONDARY = BOP.
- Kick warning signs: PIT GAIN (mud tank volume rises), FLOW RATE INCREASE on the return flowline,
  WELL FLOWS WITH PUMPS OFF (flow check positive), drilling break (sudden faster ROP).
- Hard shut-in while drilling (land rig): space out (pick up so no tool joint across the BOP element),
  stop rotation, PUMPS OFF, flow check, CLOSE BOP (annular or pipe ram), open HCR valve to the choke line with
  the choke closed, record pressures.
- After stabilising: SIDPP (shut-in drill pipe pressure) and SICP (shut-in casing pressure; > SIDPP because
  of the light gas in the annulus). Pit gain also recorded.
- Kill Mud Weight: KMW = OMW + SIDPP ÷ (0.052 × TVD). Example: 10.0 + 520 ÷ (0.052 × 10,000) = 11.0 ppg.
- DRILLER'S METHOD (2 circulations): 1st circulation with ORIGINAL mud pumps the kick out through the choke
  line → choke manifold → MUD GAS SEPARATOR (gas → vent/flare, mud → pits); the choke operator adjusts the
  choke to keep BOTTOMHOLE PRESSURE CONSTANT; gas EXPANDS as it rises. 2nd circulation pumps KILL MUD:
  SIDPP falls to 0 when kill mud reaches the bit, SICP falls to 0 when the annulus is full of kill mud.
- Flow check with pumps off: no flow, 0 psi → well is dead → open the BOP.
- WAIT & WEIGHT method: mix kill mud first, kill in ONE circulation (lower casing pressure, takes longer to start).

## Storyboard (120 s) — sets: L = land rig, W = well cutaway, B = BOP cutaway studio
| time | set | scene |
|---|---|---|
| 0–8 | L | TITLE "Well Control" + "จาก Kick ถึง Kill"; hook "ถ้าเกิด Kick ต้องทำยังไง?" |
| 8–20 | W | KICK: bit drills into gas zone, mud lighter than pore pressure, gas bubbles enter annulus; KICK! alarm ≈12.5; 15.5–20 two barriers: Mud = Primary, BOP = Secondary |
| 20–42 | L | KICK SIGNS: 1 Pit Gain (20–27, tank level rises, PVT +12 bbl) · 2 Flow Increase (27–34, returns faster at shaker) · 3 Flow Check (34–42, pump stops ≈35.5, well still flows) |
| 42–56 | B | SHUT-IN: steps Space Out (42.5) → Pump Off (45) → Close BOP (47.5; annular ≈47.8, pipe ram ≈49.3) → Close Choke/HCR (51.5); gas stopped under the BOP; "WELL SHUT-IN ✓" 53–56 |
| 56–70 | W | READ PRESSURES: SIDPP 520 psi (57), SICP 720 psi (60), KMW formula card 63.5–70 → 11.0 ppg |
| 70–80 | W | DRILLER'S METHOD circ 1: pumps on slowly, gas slug rises & expands, exits via choke line; "Constant BHP" |
| 80–86 | L | Choke manifold → Mud Gas Separator → gas burns at the flare (fire ≈81) |
| 86–100 | W | circ 2: KILL MUD (blue) down the pipe, SIDPP → 0 (≈92), up the annulus, SICP → 0 (≈98) |
| 100–110 | W | WELL DEAD: flow check, 0/0 psi, "WELL UNDER CONTROL ✓" ≈101.5; note card Wait & Weight 105–110 |
| 110–120 | L | END: "Well Control" recap chips Detect · Shut-in · Kill; signature; fade |

## Easter eggs ("namman.story")
- Stencilled on the mud tank (from EP03) — readable during Pit Gain (20–27).
- Painted on the Mud Gas Separator vessel — readable 80–86.
