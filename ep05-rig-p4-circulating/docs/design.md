# Overlay kit: design system and API

`overlay_kit.js` is an ES module of pure Canvas-2D drawing functions for the namman.story 9:16 videos (1080x1920). Each component is a function of `t` only. It uses no `Date`, no `Math.random` and no hidden state, so any frame renders the same way in any order. Each component draws its own entrance and exit and draws nothing outside its window `[t0, t1]`.

```js
import * as K from './overlay_kit.js';
// in drawOverlay(ctx, t):
K.sectionHeader(ctx, t, { t0: 7, t1: 127, index: 'P4', label: 'Mud Pumps', sub: 'ปั๊มโคลน' });
```

Preview: `NODE_PATH=/opt/node-tools/node_modules node kit_demo.js [scene ...] [--no-guides] [--no-sheets]` writes stills and contact sheets to `kit_preview/`. You can also open `kit_demo.html` through any local server and use the scene picker and time slider.

---

## 1. Design system

### Colour

| Token | Value | Use |
|---|---|---|
| `SYS.power` | `#f59e0b` | Part 1 |
| `SYS.hoist` | `#3b82f6` | Part 2 |
| `SYS.rotate` | `#ef4444` | Part 3 |
| `SYS.circ` | `#14b8a6` | **Part 4 accent (default for every component)** |
| `SYS.wc` | `#a855f7` | Part 5 |
| `C.warm` / `C.warmSoft` | `#ffd166` / `#ffe3a3` | Series warm highlight: subtitles, Thai sub-lines, tinted formula tokens |
| `C.ink` / `C.ink2` / `C.slate` / `C.mute` | `#0f172a` / `#1e293b` / `#334155` / `#64748b` | Text on light surfaces |
| `C.text2` / `C.text3` | white at 88 % / slate-300 at 62 % | Secondary and tertiary text on dark surfaces |
| `C.mud` / `C.mudDark` | `#c8925a` / `#7c4a22` | Solids particles |
| `C.follow` → `C.followHover` → `C.followDone` | `#ef4444` → `#dc2626` → `#e2e8f0` | Follow button states |
| `C.scrim` | `#06101e` | Transition fill (same as the series `fade`) |

Derived tints come from `light(hex, u)` (mix toward white) and `deep(hex, u)` (mix toward ink). For example, `light(circ, .45)` gives `#7fd8cd`, used for accent text on dark glass. `deep(circ, .3)` is used for accent text on white so that teal keeps AA contrast. `hexA(hex, a)` returns an rgba string.

**Surfaces**
- **Dark glass**, the default: a vertical gradient from `rgba(28,40,70,.90)` to `rgba(9,15,31,.86)`, a top sheen (white 7 %), a 1.5 px rim that fades from white 30 % at the top, and a drop shadow of blur 40, offset y 14, black 42 %.
- **Light glass**, for `factCard` (default), callout pills and the CTA card: white 98 % to `#eef3f9` at 96 %, with a white rim.
- An accent bar (8 px on the left edge, accent gradient) marks content cards.

### Type: Kanit 400 / 600

| Role | Size / weight | Notes |
|---|---|---|
| Display (title, next teaser) | 104–112 / 600 | Auto-fit to 820 px. Masked rise-in. |
| Recap title | 88 / 600 | |
| Hook / CTA headline | 46–58 / 600 | |
| Card title | 38–40 / 600 | |
| Subtitle (Thai) | 42 / 400, `warmSoft` | |
| Body line | 32 / 400 | |
| Callout label / sub | 34 / 600 · 30 / 400 | |
| Chip label | 28 / 600 | |
| Kicker (caps) | 20–24 / 600, letter-spacing 2–5 px | English caps only. Thai is never letter-spaced. |
| Micro (axis, tags) | 16–22 | Data only. Never below 16 px. |

**Text never clips.** `text()` and `fit()` shrink the font to fit `maxW` (down to 55 % of its size). If it is still too wide, they squeeze it horizontally. Every component passes a `maxW` taken from its layout. Thai upper marks need about 0.6 em of headroom, so a Thai line sits at least 40 px below a caps kicker.

Glyph note: the Google Fonts Kanit subsets include `× ² µ · – ~` but not `≈ ✓ →`. Checkmarks and arrows are drawn as vector icons. Write "~" for "approximately". A `→` inside a string still renders, but from a fallback font.

### Spacing and shape
- Grid of 8 px. Card padding 36. Gap between stacked cards 18–24.
- Radii: cards 28–34, hero panels 40, chips and pills fully round (h/2), tags 17–18.
- Strokes: 2–3 px for structure, 1.5 px for rims, 6–8 px for flow rails.

### Safe zones (`SAFE`)
- Visuals and labels: **x 60–960, y 160–1280**. The horizontal centre is **x = 510**.
- Caption card (drawn by frame.html): y ≈ 1310–1560. Overlays must stay out of it.
- y > 1600: platform UI. Nothing goes there.
- Persistent chip: top-left, y 168–228. Fact cards are bottom-anchored at y 1270.

### Motion

| Token | Value | Use |
|---|---|---|
| Entrance | 0.5–0.6 s `eout` (cubic out) | Fade plus 30–46 px slide, or 0.96 → 1 scale |
| Exit | 0.35–0.45 s `ein` (cubic in) | Fade plus 20–30 px drift, the opposite way to the entrance |
| Pop | 0.35–0.55 s `eback` (overshoot 1.6–2.5) | Badges, pills, anchor dots, recap tiles |
| Stagger | 0.07–0.12 s for lists and tiles; 0.35 s for fact-card lines | `stag(t, t0, k, step, dur)` |
| Sweep / count-up | 1.1–1.2 s `eexpo` / `eback(1.3)` | Numbers, gauge needles |
| Draw-on | 0.5–0.9 s `eio` | Leader lines, rails, underline |
| Pulse | 1.2–1.4 s period, two rings | Active node or anchor |
| Transition | 0.6–0.7 s total, fully covered at `tc` | `wipe()` |

Helpers: `clamp, lerp, fract, sstep, eout, ein, eio, eexpo, eback, hash (pure), win, env, stag`.
`env(t, t0, t1, din, dout)` returns `{ a, i, o, live }`: opacity, eased entrance, eased exit and whether `t` is in the window.

---

## 2. Primitives

| Function | Purpose |
|---|---|
| `F(weight, size)` | Kanit font string |
| `rr(ctx, x, y, w, h, r)` | Rounded-rect path, clamped radius |
| `shadow(ctx, blur, oy, alpha)` / `noShadow(ctx)` | Shadow on and off |
| `fit(ctx, str, weight, size, maxW, min)` | Sets `ctx.font` to the largest size that fits. Returns the size. |
| `measure(ctx, str, weight, size, ls)` | Width in px |
| `text(ctx, str, x, y, {w, size, maxW, min, align, color, baseline, ls})` | Fitted text. Returns `{size, width}`. |
| `glass(ctx, x, y, w, h, r, {theme, accent, glow, shadowA, sheen})` | Glass panel |
| `icon(ctx, name, x, y, size, color, lw)` | Vector glyphs: `drop pump question filter calc gauge loop bell check arrowR arrowD plus play layers warn` |
| `iconBadge(ctx, name, x, y, d, color, {solid, ring, lw, ink})` | Glyph inside a tinted disc |
| `labelPill(ctx, cx, cy, label, sub, color, {size, align, scale})` | Static callout pill. Returns its bounds. |
| `fmtNum(v, decimals)` | Adds thousands separators |

---

## 3. Components

All components take `(ctx, t, opts)`. `color` defaults to `SYS.circ`.

### titleCard
Part opener: a kicker, a `PART n / 5` pill, a big masked title, an underline sweep, a Thai subtitle, the 5-part progress bar (staggered) and a hook-question pill (pops in at `t0 + hookAt`).
```js
K.titleCard(ctx, t, { t0: 0.3, t1: 6.8, part: 4, total: 5, kicker: 'DRILLING RIG 101 · EP.05',
  title: 'Circulating System', subtitle: 'ระบบหมุนเวียน Mud ลงหลุมแล้วกลับขึ้นมา',
  hook: 'Mud ไหลวนในหลุมได้ยังไง?', hookAt: 2.3 });
```
Layout: panel y 196–636, parts bar y 664, hook at y 1150.

### partsBar
The 5-part progress bar on its own. Parts before `current` show a check, the current part is filled and glows, and later parts are dim. Used inside titleCard and nextTeaser.
```js
K.partsBar(ctx, t, { y: 664, current: 3, t0: 1.3, a: 1 });
```

### sectionHeader
A small chip, top-left, that stays on screen through a section. It pops a badge, expands its width, then slides the text in. If the label and sub together don't fit in 900 px, it drops the sub.
```js
K.sectionHeader(ctx, t, { t0: 7, t1: 60, index: 'P4', label: 'Mud Pumps', sub: 'ปั๊มโคลน', x: 60, y: 168 });
```

### factCard
Bottom-anchored card: icon, optional caps kicker, title, up to 3 staggered lines and an optional big number that counts up. The `light` theme is the default, matching the series cards; `dark` is also available.
```js
K.factCard(ctx, t, { t0: 18, t1: 25, kicker: 'MUD PUMP', title: 'Triplex Mud Pump', iconName: 'pump',
  lines: ['ลูกสูบ 3 ตัว อัด Mud แรงดันสูง', 'แรงดันใช้งานได้ถึง ~5,000 psi'],
  big: { value: 1600, unit: 'hp', label: 'กำลังต่อเครื่อง (ทั่วไป)' }, bottom: 1270, stagger: 0.35 });
```
`big.value` can be a number (it counts up, keeping the target's decimals) or a string (shown as is).

### callout
A leader line from the anchor `(ax, ay)` to a label pill at `(x, y)`. The caller projects the 3D point. The leader bends into the pill's side, or drops straight down when the anchor sits under the pill. The anchor dot pops and pulses, the line draws on, and the pill pops in.
```js
const P = proj([0, 0, 0], O.mk.pump);           // caller-side projection
if (P.ok) K.callout(ctx, t, { t0: 8.6, t1: 16.8, ax: P.x, ay: P.y, x: 300, y: 600,
  label: 'Mud Pump', sub: 'ปั๊มแรงดันสูง', align: 'center', size: 34 });
```
`align` positions the pill relative to `x` (`center`, `left` or `right`). The pill is clamped to x 62–958 and shrinks so it is never wider than 900 px.

### flowPathMap
A compact schematic of the mud circulation loop. Nodes are spread over the four sides of a rounded-rect loop, clockwise from the left side. The default split for 10 nodes is left 1, top 4, right 2, bottom 3; override it with `sides: [l, t, r, b]`. It shows a visited trail up to `current` (a float glides between nodes), flow chevrons, a comet dot that loops at `speed` px/s, a pulsing current node and a "you are here" readout in the centre (label plus `th`).
```js
K.flowPathMap(ctx, t, { t0: 10, t1: 40, current: pwl([[10,0],[14,1],[20,4]], t),
  nodes: [{ label: 'Mud Tank', th: 'บ่อพัก Mud' }, { label: 'Mud Pump', th: 'ปั๊มแรงดันสูง' }, /* … 10 total */],
  x: 60, y: 196, w: 900, h: 520, title: 'MUD CIRCULATION LOOP', speed: 210 });
```

### stepList
A vertical progress rail in a glass panel. Done steps get a check, the active step pulses, and a highlight bar glides to `current` (float).
```js
K.stepList(ctx, t, { t0, t1, title: 'SOLIDS CONTROL', current: 2, x: 60, y: 420, w: 340,
  items: [{ label: 'Shale Shaker', sub: 'ตะแกรงสั่น' }, { label: 'Degasser', sub: 'แยกแก๊ส' }, /* … */] });
```

### sizeFunnel
A solids-control funnel. Stacked trapezoid stages have finer screen hatching at each stage and a numbered disc each. A label card for each stage carries a cut-point tag. Particles are deterministic and hashed by index: each one falls until the stage that removes its size class, then gets flung out and drops. Below the funnel are an outlet line and a log-scale µm axis with stage markers. **All cut values come from the caller.** `cut` can be a number or a range string such as `'40–50'`; a range is plotted at its mean.
```js
K.sizeFunnel(ctx, t, { t0, t1, active: 1, stagger: 0.55, title: 'Solids Control', kicker: 'PARTICLE SIZE · µm',
  outlet: 'Mud สะอาด กลับสู่ Active Tank', scaleLabel: 'ขนาดอนุภาค (ไมครอน, µm)',
  stages: [
    { name: 'Shale Shaker', th: 'ตะแกรงสั่น · API 200', cut: 75, prefix: '> ', unit: 'µm' },
    { name: 'Desander', th: 'Hydrocyclone 10 นิ้ว', cut: '40–50', prefix: '~' },
    { name: 'Desilter', th: 'Hydrocyclone 4 นิ้ว', cut: '15–25', prefix: '~' },
    { name: 'Centrifuge', th: 'เหวี่ยงแยกด้วยแรง G', cut: '2–7', prefix: '~' } ] });
```
Height is about `204 + n·rowH + 96` (≈ 890 px at y 230 with 4 stages), which ends above y 1280.

### formulaCard
A calculation card. Each line has a step tag and appears one at a time (`step` seconds apart) with a left-to-right wipe and a glowing caret. A token in `[[ ]]` is tinted warm. The result block pops in at the end and its number counts up.
```js
K.formulaCard(ctx, t, { t0, t1, kicker: 'PUMP OUTPUT · TRIPLEX', title: 'ปั๊มส่ง Mud ได้กี่บาร์เรลต่อสโตรก?', step: 0.9,
  lines: [{ label: 'สูตร', text: 'Output = [[0.000243]] × D² × L' },
          { label: 'แทนค่า', text: 'D = 6 in (Liner) · L = 12 in (Stroke)' },
          { label: 'คำนวณ', text: '= 0.000243 × 36 × 12 = [[0.105 bbl/stk]]' }],
  result: { label: '0.105 bbl × 42 gal/bbl', value: 4.41, unit: 'gal / stroke' } });
```

### gaugeDial
A 270° dial: gradient value arc with glow, minor and major ticks, min/mid/max labels (when r ≥ 100), optional zone arcs, a tapered needle and a digital readout. On entrance it pops in, the needle sweeps with a slight overshoot, and the readout counts up. Afterwards it follows `value`, so the caller can make it wobble. `delay` staggers several dials.
```js
K.gaugeDial(ctx, t, { t0, t1, cx: 510, cy: 640, r: 112, value: 3200, max: 5000, unit: 'psi',
  label: 'SPP', sub: 'แรงดัน Standpipe', color: K.SYS.power, zones: [{ from: 4500, to: 5000, color: '#ef4444' }], delay: 0.15 });
```
Footprint: circle `r + 26`, plus a label tag down to `cy + r + 116`.

### recapGrid
A recap: kicker pill, big masked title, and a grid of glass tiles (number disc plus label, optional sub) that pop in staggered. Ten items in 2 columns fill y 250–1000.
```js
K.recapGrid(ctx, t, { t0, t1, kicker: 'สรุป PART 4', title: 'Circulating System', cols: 2, stagger: 0.16,
  items: ['Mud Tank · Pits', 'Mud Pump (Triplex)', /* … */] });   // or [{ label, sub }]
```

### ctaFollow
The follow card: headline and sub, a white card with the avatar (gradient ring), `namman.story` and a tagline, and a red **+ ติดตาม** button. The cursor sequence is relative to `clickAt` (seconds after `t0`), keeping the series cursor:
- `c-1.8` the white arrow cursor (dark outline) glides in on a curve;
- `c-0.6` hover: the button darkens and gets a glow ring;
- `c` click: the cursor squashes, the button presses and a red-then-white ripple plays;
- `c+0.2` the button morphs to grey **ติดตามแล้ว** with a green check that pops and a bell that wiggles;
- `c+1.2` the cursor drifts away.
```js
const avatar = new Image(); avatar.src = 'assets/avatar.png';   // preload before rendering
K.ctaFollow(ctx, t, { t0: 135, t1: 143, avatar, clickAt: 3.0, name: 'namman.story',
  tagline: 'Oil & Gas 101 · เข้าใจง่ายใน 2 นาที', headline: 'กดติดตามไว้', sub: 'เพื่อไม่พลาดตอนต่อไป' });
```
If no image is loaded, the avatar falls back to an orange disc with "n".

### nextTeaser
End card: animated chevrons with `ตอนต่อไป · PART n / 5`, a masked big title, an underline, a Thai sub, and the parts bar at `barY` with the next part highlighted. `t1` is optional; leave it out for the final frames.
```js
K.nextTeaser(ctx, t, { t0: 143.4, part: 5, title: 'Well Control', sub: 'BOP ปิดหลุมกัน Kick ได้ยังไง?', color: K.SYS.wc });
```

### wipe (transitions)
The frame is fully covered at `tc`. Covering runs over `[tc - dur/2, tc]` and revealing over `[tc, tc + dur/2]`. Cut the 3D shot at `tc`.

| type | Look |
|---|---|
| `diag` | A skewed scrim band sweeps left to right, with an accent edge |
| `bars` | 6 staggered vertical bars, alternating from top and bottom, with accent tips |
| `iris` | A circle closes on `(cx, cy)`, then the hole opens, with an accent ring |
| `slide` | A scrim slides up and then off the top, with an accent edge |
| `dip` | A plain dip to the scrim colour (same as the series `fade`) |

```js
for (const tc of [17, 25, 33]) K.wipe(ctx, t, { tc, dur: 0.7, type: 'diag', accent: K.SYS.circ });
```

---

## 4. Integration notes
- Call order in `drawOverlay`: persistent chip, then callouts, then cards, then wipes (always last).
- Keep at most 2 new callouts at once and hold labels for at least 3 s (series pacing). Fact cards use the band from y 1270 up to their own height; place callout pills above about y 1000 when a fact card is showing.
- `ctx` state is saved and restored inside every component, so callers can draw in any order.
- Fonts: wait for `document.fonts.load('600 32px Kanit')` before the first frame. frame.html already does this.
