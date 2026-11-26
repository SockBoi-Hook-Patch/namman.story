# Overlay kit: design system and API

`overlay_kit.js` is an ES module of pure Canvas-2D drawing functions for the namman.story 9:16 videos (1080x1920). Each component is a function of `t` only. It uses no `Date`, no `Math.random` and no hidden state, so any frame renders the same way in any order. Each component draws its own entrance and exit and draws nothing outside its window `[t0, t1]`.

**Visual direction: "Field Manual"**: opaque paper sheets, ink type, one system accent used as a fill, cased leader lines, numbered schematic labels. There is no glass, glow, gradient, pill or letter-spaced caps. The reasoning, sources and slop checklist are in [`design_direction.md`](design_direction.md).

```js
import * as K from './overlay_kit.js';
// in drawOverlay(ctx, t):
K.sectionHeader(ctx, t, { t0: 7, t1: 127, index: 'P4', label: 'Mud Pumps', sub: 'ปั๊มโคลน' });
```

Preview: `NODE_PATH=/opt/node-tools/node_modules node kit_demo.js [scene ...] [--no-guides] [--no-sheets]` writes stills and contact sheets to `kit_preview/`. The backgrounds are **real 3D plates** from `lookdev/` (`kit_preview/bg/p_*.jpg`: t = 4, 21, 123 bright desert dusk; t = 37, 99 navy studio). Each scene picks its plate(s) with `bg` in `kit_demo.html`. The `composite` sheet shows the same busy frame over all five plates, and it is the legibility test. To refresh the plates, render `lookdev` with the overlay and caption calls removed from its `frame.html` (`node render.js out.mp4 --preview 4,21,37,99,123`), then save the `p_*.png` files as JPEG into `kit_preview/bg/`.

---

## 1. Tokens

### Colour

| Token | Value | Use |
|---|---|---|
| `C.paper` | `#f6f2ea` | Every text surface (`sheet()`) |
| `C.paper2` | `#e9e3d6` | Active row, done button, gauge track |
| `C.rule` | `#cfc6b4` | Hairlines on paper |
| `C.ink` / `C.ink2` / `C.mute` | `#16171b` / `#4a4d55` / `#6d6f75` | Text and line work: primary, secondary, tertiary |
| `SYS.power / hoist / rotate / circ / wc` | `#f59e0b` `#3b82f6` `#ef4444` `#14b8a6` `#a855f7` | Part colour. Used as a **fill only**: sheet top band, current key, visited path, value arc, result underline |
| `accentInk(hex)` | teal → `#0d6b62` | Accent used as text on paper (AA) |
| `C.mud` / `C.mudDark` | `#b07a45` / `#5f3a1a` | Particles, mud parcel |
| `C.follow` → `C.followHover` → `C.followDone` | `#e5372f` → `#c92a23` → `#e9e3d6` | Follow button states |
| `C.scrim` | `#16171b` | Transition fill |

Numerals and text on an accent fill are **ink**, never white, because ink clears 5:1 on all five series colours and white does not. There are no gradients anywhere. Legacy keys (`C.warm`, `C.warmSoft`, `C.text2`, `C.text3`, `C.slate`, `C.line`) still exist and map onto the neutrals.

### Type: Kanit 400 / 600 (`TYPE`)

| Role | Size / weight |
|---|---|
| Display (title, teaser) | 112 / 600 (`TYPE.display`), auto-fit, left-aligned |
| Recap title / CTA headline | 80 / 64, 600 |
| Card title | 42–46 / 600 |
| Thai deck line | 40–42 / 400, ink |
| Body | 34 / 400 · formula 42 / 600 |
| Label | 30–34 / 600, sub 26–28 / 400 ink2 |
| Kicker / meta | 28–30 / 400 ink2, **sentence case, no tracking** |
| Minimum | **26** (`TYPE.min`), enforced by `fit()` |

`tidy(str)` converts old ALL-CAPS ASCII labels to sentence case and keeps acronyms (SPP, BOP, API, RPM …). Components call it on every kicker and title. Thai is never letter-spaced. `text()` and `fit()` shrink the font to fit `maxW` and squeeze horizontally only as a last resort.

### Shape (`SHAPE`)
- A single radius, 6 px (keys 3 px). Circles appear only for nodes and dials.
- Rules are 2 px for structure and 1.5 px for rows. Leaders are 3 px ink over an 8 px paper casing.
- Sheets get a top band of 8 px (10 px on title plates) in the part colour.
- Sheet padding is 40–56 px, and content is left-aligned to the inner margin.

### Safe zones (`SAFE`)
- Visuals and labels: **x 60–960, y 160–1280**.
- Caption card (frame.html): y ≈ 1310–1560. y > 1600 is platform UI.
- The section tab sits top-left at y 168–232. Fact cards are bottom-anchored at y 1270.

### Motion (`MOTION`)

| Token | Value | Use |
|---|---|---|
| Entrance | 0.3–0.5 s `eout` | Opacity + 12–28 px translate, **or** a clip reveal. One move per element. |
| Exit | 0.3 s `ein` | Everything together, no staggered exit |
| Draw-on | 0.45 s `eio` | Leaders, loop path, rails |
| Stagger | 0.06–0.12 s (real sequences only); **0.8 s** for fact-card lines | `stag(t, t0, k, step, dur)` |
| Count-up / needle | 1.0 s `eout` | Once, no overshoot |
| Overshoot / pulse | **none** | `eback` is kept only for compatibility and is unused |

Helpers: `clamp, lerp, fract, sstep, eout, ein, eio, eexpo, eback, hash (pure), win, env, stag`.
`env(t, t0, t1, din, dout)` returns `{ a, i, o, live }`: opacity, eased entrance, eased exit and whether `t` is in the window.

---

## 2. Primitives

| Function | Purpose |
|---|---|
| `F(weight, size)` | Kanit font string |
| `rr(ctx, x, y, w, h, r)` | Rounded-rect path |
| `shadow` / `noShadow` | Shadow on and off |
| `fit`, `measure`, `text` | Fitted text (`text` returns `{size, width}`) |
| `tidy(str)` | ALL-CAPS label → sentence case |
| `ellipsize(ctx, str, weight, size, maxW)` | Cut at a word / Thai segment and append `...` (used instead of squeezing type) |
| `sheet(ctx, x, y, w, h, {theme:'paper'|'ink', band, r, lift, bandH})` | **The one surface**: opaque paper (or ink) with a tight contact shadow, faint keyline and optional top band |
| `glass(...)` | Legacy alias of `sheet` (`theme:'dark'` → ink sheet, `accent` → band) |
| `numKey(ctx, n, x, y, size, color, {filled})` | Square index key: accent fill + ink numeral, or an ink outline |
| `icon(ctx, name, x, y, size, color, lw)` | Line glyphs: `drop pump question filter calc gauge loop bell check arrowR arrowD plus play layers warn` |
| `iconBadge(...)` | Legacy. Now a bare line glyph with no disc |
| `labelPill(ctx, cx, cy, label, sub, color, {size, align, n, u, from})` | Static label tab (name 600 + Thai sub on a second line, optional key). Returns its bounds. |
| `pillMetrics(ctx, label, sub, size, n)` | Tab size |
| `fmtNum(v, decimals)`, `accentInk(hex)`, `hexA`, `mix`, `light`, `deep` | Number and colour helpers |

---

## 3. Components

All components take `(ctx, t, opts)`. `color` defaults to `SYS.circ`. Signatures are unchanged from the previous kit, and unknown legacy options (`iconName`, `glow` …) are ignored.

### titleCard
A cover plate: top band, a sentence-case kicker left and `Part n of 5` right, a 112 px headline (masked rise), a Thai deck line, a rule, and the 5-part ruler. The hook is a second sheet at y 1150 with a large accent `?`. The plate unrolls from the band down.
```js
K.titleCard(ctx, t, { t0: 0.3, t1: 6.8, part: 4, total: 5, kicker: 'Drilling Rig 101, ตอน 5', title: 'Circulating System',
  subtitle: 'ระบบหมุนเวียน Mud ลงหลุมแล้วกลับขึ้นมา', hook: 'Mud 1 หยด เดินทางผ่านอะไรบ้าง?', hookAt: 2.3 });
```

### partsBar
The 5-part index ruler: equal segments (done = ink, current = part colour, later = rule) with a numeral and name above each. `backing: true` puts it on its own sheet.
```js
K.partsBar(ctx, t, { x: 112, y: 642, w: 796, current: 3, t0: 1.3 });
```

### sectionHeader
A persistent tab, top-left: an accent index block (ink numerals), the label (600, 30), a rule, then the sub (400, 28). It reveals left to right in 0.4 s. If label and sub don't fit, it drops the sub.
```js
K.sectionHeader(ctx, t, { t0: 7, t1: 60, index: 'P4', label: 'Mud Pumps', sub: 'ปั๊มโคลน', x: 60, y: 168 });
```

### factCard
A bottom-anchored sheet: optional kicker (sentence case), a 46 px title, a rule, up to 3 dash-bulleted lines (≥ 0.8 s apart), and an optional big number column (96 px ink, a short accent underline, unit, label). `theme: 'dark'` gives an ink sheet with paper text.
```js
K.factCard(ctx, t, { t0: 18, t1: 25, kicker: 'Mud pump', title: 'Triplex Mud Pump',
  lines: ['ลูกสูบ 3 ตัว อัด Mud แรงดันสูง', 'แรงดันใช้งานได้ถึง ~5,000 psi'],
  big: { value: 1600, unit: 'hp', label: 'กำลังต่อเครื่อง (ทั่วไป)' }, bottom: 1270, stagger: 0.8 });
```

### callout
A numbered schematic label. The caller projects the 3D anchor to `(ax, ay)`. `(x, y)` is the tab anchor, with `y` the tab's centre line.
- Sequence: the anchor dot (paper ring, ink disc, accent centre) lands, the cased leader draws from it, then the tab reveals from the leader side.
- The leader is an oblique segment snapped to 15°, then a 36 px horizontal shoulder into the tab's side. When the anchor is under or over the tab, it drops straight into the tab's edge.
- `n` (new, optional) shows an index key. Number callouts clockwise and avoid crossing leaders.
```js
const P = proj([0, 0, 0], O.mk.pump);
if (P.ok) K.callout(ctx, t, { t0: 8.6, t1: 16.8, ax: P.x, ay: P.y, x: 120, y: 470, align: 'left',
  label: 'Fluid End', sub: 'ลูกสูบและวาล์ว', n: 1 });
```

### flowPathMap
A schematic of the loop on a sheet. The pipe is a 3 px ink line drawn on once, and the visited run is a 9 px accent stroke. Static ink arrowheads between nodes show direction. Nodes are numbered circles (done = ink fill), and the current node is an accent key. Node labels are 26 px (current 28/600). The centre readout gives the current node's name (48) and Thai line (30). One mud parcel travels the loop at `speed` px/s; it is the only continuous motion. The header has a sentence-case title left and `n / N` right.
```js
K.flowPathMap(ctx, t, { t0: 10, t1: 40, current: pwl([[10,0],[14,1],[20,4]], t), nodes: FLOW,
  x: 60, y: 196, w: 900, h: 560, title: 'วงจร Mud', speed: 160 });
```

### stepList
A sheet listing numbered steps. Done steps get an ink disc with a check, and the current step gets an accent key. An inset `paper2` band with an accent edge glides to `current` (float).
```js
K.stepList(ctx, t, { t0, t1, title: 'Solids control', current: 2, x: 60, y: 420, w: 380,
  items: [{ label: 'Shale Shaker', sub: 'ตะแกรงสั่น' }, /* … */] });
```

### sizeFunnel
A solids-control funnel drawn as a technical drawing:
- Ink-outlined trapezoids, with screen hatching that gets finer at each stage. The active stage is filled with the accent at 45%.
- Solid hairline leaders run to the stage rows. Each row is type on the sheet: key, name, cut size right-aligned, Thai line, separated by rules.
- Hashed particles drop out at their stage. A log µm axis has numbered stage markers.

The caller supplies every cut value.
```js
K.sizeFunnel(ctx, t, { t0, t1, active: 1, stages: [{ name: 'Shale Shaker', th: 'ตะแกรงสั่น API 200', cut: 75, prefix: '> ', unit: 'µm' }, /* … */] });
```
Height is about `260 + n·rowH + 110` (≈ 954 px at y 220 with 4 stages), which ends at about y 1174.

### formulaCard
A calculation sheet: optional kicker, title, then an ink rule. Each row has a Thai step label in the left column and a formula revealed left to right. Tokens in `[[ ]]` get an accent highlighter wash, with the text staying ink. The result is an inverted ink block with a paper value counting up, the unit, and a short accent underline.
```js
K.formulaCard(ctx, t, { t0, t1, kicker: 'Pump output', title: 'ปั๊มส่ง Mud ได้กี่บาร์เรลต่อสโตรก?', step: 0.9,
  lines: [{ label: 'สูตร', text: 'Output = [[0.000243]] × D² × L' }, /* … */],
  result: { label: '0.105 bbl × 42 gal/bbl', value: 4.41, unit: 'gal / stroke' } });
```

### gaugeDial
An instrument face on a sheet (with a band):
- A 240° sweep: `paper2` track, accent value arc, ink ticks, a thin ink needle. Optional zone arcs sit outside the track.
- The readout (number plus unit) owns the lower third, and min/max sit under the arc ends.
- Below a rule: the label (600, 32) and sub (26).

The needle sweeps once in 1.0 s, then follows `value`.
```js
K.gaugeDial(ctx, t, { t0, t1, cx: 510, cy: 560, r: 112, value: 3200, max: 5000, unit: 'psi', label: 'SPP', sub: 'แรงดัน Standpipe',
  zones: [{ from: 4500, to: 5000, color: '#ef4444' }], delay: 0.15 });
```
The footprint is a sheet `2r + 56` wide, from `cy - r - 30` to `cy + 2r + 128`. Three dials at r 112 fit at cx 200 / 510 / 820.

### recapGrid
An index page on one sheet: kicker, an 80 px title (masked rise), an ink rule, then numbered entries (`01`… in accent ink) in columns that read *down* each column, separated by rules.
```js
K.recapGrid(ctx, t, { t0, t1, kicker: 'สรุป Part 4', title: 'Circulating System', cols: 2, items: [/* strings or {label, sub} */] });
```

### ctaFollow
One sheet (y 440–1040): headline 64, sub 40, a rule, then the avatar (ink ring) with `namman.story` and the tagline, then a full-width red **+ ติดตาม** button (flat, radius 8). The cursor sequence is unchanged, relative to `clickAt`:
- `c-1.8` the cursor glides in on a curve.
- `c-0.6` hover: the button darkens.
- `c` click: the cursor squashes, the button presses, and one ink ring expands.
- `c+0.2` the button morphs to `paper2` **ติดตามแล้ว** with an ink outline, the bell wiggles, and an ink check *draws on*.
- `c+1.2` the cursor drifts away.
```js
K.ctaFollow(ctx, t, { t0: 135, t1: 143, avatar, clickAt: 3.0 });
```

### nextTeaser
An end plate in the next part's colour: `ตอนต่อไป →` left, `Part n of 5` right, a 104 px title, the Thai sub, a rule, and the parts ruler inside the plate. Pass `barY` to put the ruler on its own sheet at that y instead. `t1` is optional.
```js
K.nextTeaser(ctx, t, { t0: 143.4, part: 5, title: 'Well Control', sub: 'BOP ปิดหลุมกัน Kick ได้ยังไง?', color: K.SYS.wc });
```

### wipe (transitions)
The frame is fully covered at `tc`. The fill is ink. `diag` and `slide` carry one thin accent rule on the moving edge. `bars` (5 bars) and `iris` are plain. `dip` fades to ink.
```js
for (const tc of [17, 25, 33]) K.wipe(ctx, t, { tc, dur: 0.7, type: 'diag', accent: K.SYS.circ });
```

---

## 4. Integration notes
- Call order in `drawOverlay`: section tab, then callouts, then sheets, then wipes (always last).
- Density: 1 sheet + up to 2 callouts + the tab per frame. Hold labels ≥ 3 s. When a fact card is showing, keep callout tabs above about y 1000.
- `ctx` state is saved and restored inside every component.
- Fonts: wait for `document.fonts.load('600 32px Kanit')` before the first frame. frame.html already does this.
- Caption card: see `design_direction.md` §3.9 for a matching restyle of frame.html's caption (not applied).
