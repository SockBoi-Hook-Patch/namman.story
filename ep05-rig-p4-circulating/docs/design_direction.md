# Design direction: "Field Manual"

namman.story overlay graphics, Drilling Rig 101 (EP05 onward). The client's note: *"no AI slop, study GitHub, I want it beautiful like a human designer made it."*

This file has three parts: what the research says separates crafted motion graphics from generated ones, a checklist of what to remove, and the visual direction the kit (`overlay_kit.js`) now follows. The API and the tokens are in `docs/design.md`.

---

## 1. Research findings

### 1.1 Anti-slop design rules (GitHub)

| Source | What it says (paraphrased or quoted) | What we take from it |
|---|---|---|
| Anthropic `frontend-design` skill: [github.com/anthropics/skills/…/frontend-design/SKILL.md](https://raw.githubusercontent.com/anthropics/skills/main/skills/frontend-design/SKILL.md) | Don't set labels in all caps, and don't put typographic labels above content by default. Don't accent one word of a headline. Avoid content "chopped into identical rounded cards" with one radius on everything. Avoid gradient washes as decoration, and avoid the same soft shadow on every element. Avoid meta strings joined with middle dots ("A · B · C"). Use numbered markers only for real sequences. "Visual structure is information": every rule, border and label must encode something. Use motion sparingly: "a single orchestrated moment … lands better than scattered effects." Write a plan, then revise any part that "could fit any similar page". | This is the core of the checklist. Our kit failed most of these: caps kickers, `·` separators, pill-everything, a gradient on every surface, the same glow on everything, and pulses on every node. |
| [Nutlope/hallmark](https://github.com/Nutlope/hallmark) (anti-slop skill, about 61k stars) | Names "the eyebrow above every heading" and "tracked-capital labels" as tells. | Our `MUD CIRCULATION LOOP` / `STEP 02/10` / `PARTICLE SIZE · µm` micro-labels are exactly this. |
| [Ferousco-dev/anti-slop-design](https://github.com/Ferousco-dev/anti-slop-design) | Tells: gradient hero, glassmorphic panels, "fade-in on every section", "1px gray borders on everything". Module 02 bans "gradients, glassmorphism, blobs, glows". Fix: name one visual direction first, then derive type, spacing and colour from it, with "one accent colour". | Our dark navy frosted glass with teal glow is the motion-graphics version of the glassmorphic SaaS hero. |
| Found with `gh api search/repositories q='anti ai slop design'`: [AThevon/genjutsu](https://github.com/AThevon/genjutsu), [jshmllr/tokyn](https://github.com/jshmllr/tokyn) | Both make the designer propose an "interaction thesis" or direction before any code. | Section 3 is that thesis. |

### 1.2 Human-crafted motion and explainer practice

| Source | Finding | Rule it gives us |
|---|---|---|
| [Motion Canvas: tweening docs](https://motioncanvas.io/docs/tweening) | Property tweens default to `easeInOutCubic`. Composition is done with explicit `all()` / chains: motion is *scripted* as a sequence, not sprinkled per element. | One timeline per component with deliberate order (anchor → leader → label). Cubic in/out by default. |
| [Remotion `spring()` docs](https://www.remotion.dev/docs/spring) | The default spring (`damping 10`) bounces; "to disable the default bounce, increase the damping parameter." | Bounce is a default you have to *opt out of*. Templates leave it on, so we take it off. No `eback` overshoot anywhere except the cursor click press. |
| [3b1b/manim `default_config.yml`](https://raw.githubusercontent.com/3b1b/manim/master/manimlib/default_config.yml), [3b1b/videos](https://github.com/3b1b/videos) | One plain flat background (`#333333`), generous fixed buffers (`0.25` to `1.0` units), and `default_wait_time 1.0`: the scene *holds* between animations. | Holding still is a feature. After an element lands, it stops moving while the VO explains it. |
| PremiumBeat, [replicating a Vox motion graphic](https://www.premiumbeat.com/blog/replicating-vox-motion-graphic/); Gestalten, [The social graphics wave](https://gestalten.com/blogs/journal/the-social-graphics-wave) (interview with Vox graphics editor Javier Zarracina) | Vox graphics feel handmade partly through *texture and constraint* (paper and print artefacts, stepped 12 fps animation). Their mobile-first type "has to be versatile so it can be read on different screen sizes". | Borrow print materiality (paper, ink, rules), not tech materiality (glass, glow). |
| Kurzgesagt write-ups: [Arts at Michigan](https://artsatmichigan.umich.edu/ink/2019/09/27/simple-bright-beautiful-the-work-of-kurzgesagt), [kurzgesagt.org/about](https://kurzgesagt.org/about/) | Simplified geometric shapes and a strict, small palette per film. | Strict palette discipline, simple flat shapes. |
| Technical illustration: MIL-STD-38784 summary ([emilspec](https://technicalmanualspecsstandards.emilspec.com/MIL-STD-38784/page43.html)), [McGill engineering design notes](https://www.mcgill.ca/engineeringdesign/node/642), [leader-line standards (BS ISO 128-22)](https://cadsetterout.com/drawing-standards/technical-drawing-standards-leader-lines/), MIL-DTL-87268D ([emilspec](https://technicalmanualspecsstandards.emilspec.com/MIL-DTL-87268/page10.html)) | Index numbers run from 1 consecutively, in disassembly or clockwise order. Leaders must not cross each other or obscure detail. A leader is a *continuous thin line* that differs in width from object lines, drawn at an angle (15° increments), never parallel to the drawing. A **dot** terminator points at a face; an arrow points at an edge. | Numbered schematic labels, one leader weight, 15°-snapped oblique plus horizontal shoulder, a dot terminator on the part. |
| Cartographic *casing* (standard road-map technique: a light stroke under a dark one) | One line holds over both light and dark ground. | Leaders are cased: paper 8 px under ink 3 px. They read on bright desert sand *and* on the navy studio. |
| W3C [Thai Layout Requirements](https://www.w3.org/TR/thai-lreq/), [r12a Thai script notes](https://r12a.github.io/scripts/thai/th), [Fontpad on loops](https://www.fontpad.co.uk/?p=666), ATypI 2025 study ([atypi.org](https://atypi.org/?p=34632)) | Thai stacks vowel and tone marks above the base, so it needs more line spacing than Latin. Loopless forms (Kanit) are a headline and display tradition, and "younger readers prefer loopless at small sizes". Thai is never letter-spaced; justification uses spaces. | Kanit is right for headlines and labels. Line pitch is at least 1.4 × size for Thai, never any tracking, and nothing below 26 px. |

### 1.3 What the real 3D plates taught us

The old previews were judged on a flat navy gradient, which flatters dark glass. The real frames (`kit_preview/bg/`, rendered from `lookdev/`) are of two kinds. Three of the five are **bright dusk desert**: pink sky, peach sand, pale derrick. The other two are **dark navy studio**. On the bright plates, dark translucent glass turns into muddy brown-grey, and teal glow vanishes into the sand. A thin white leader disappears against the sky. Anything translucent takes on the colour of what is behind it.

**Conclusion:** text surfaces must be **opaque**, lines must be **cased**, and the accent must be **a fill, not a glow**.

---

## 2. Slop checklist (remove on sight)

Each item is testable by looking at a still.

| # | Tell | Verdict | Replacement |
|---|---|---|---|
| 1 | Dark navy frosted "glass" panels with a sheen and a gradient rim | **Problem.** It is the default "tech" look, and it turns muddy over bright sand. | Opaque paper sheet `#f6f2ea`, radius 6, tight contact shadow, faint ink keyline |
| 2 | Teal glow and `shadowBlur` halos on arcs, nodes and badges | **Problem.** Glow means nothing and smears on video. | Flat fills. Emphasis comes from size, weight and the one accent. |
| 3 | Tiny letter-spaced ALL-CAPS kickers (`MUD CIRCULATION LOOP`, `STEP 02/10`, `PARTICLE SIZE · µm`) | **Problem.** It's an "eyebrow" tell, and 16–22 px is unreadable on a phone. | Sentence-case title at ≥ 30 px, or no kicker. `tidy()` converts old caps strings automatically. |
| 4 | Pill badges on everything (callouts, step tags, cut tags, kicker pills, part pill) | **Problem.** One radius on everything is the card-kit tell. | Square numbered keys (index numbers) and plain type on rules. Pills are gone. |
| 5 | Icon in a tinted circle (`iconBadge`) | **Problem.** It's template filler and encodes nothing. | Removed from cards. `iconBadge()` now draws a bare line glyph if called. |
| 6 | Pulsing rings, bouncing pop-ins (`eback`), comet trails, animated chevrons | **Problem.** It's scattered motion, and nothing holds still. | One entrance per element, cubic out, no overshoot. Only one thing moves continuously: the mud parcel in the loop map, because it *is* the subject. |
| 7 | Middle-dot meta strings (`Gooseneck · Washpipe`, `Liner 6" · Stroke 12"`) | **Problem** (named in frontend-design). | Commas or "และ", or two lines. |
| 8 | Gradient fills (title wash, result block, value arc, avatar ring, parts bar) | **Problem.** It's decoration. | Flat colour. |
| 9 | Dashed guide boxes and dashed connectors | **Partly.** The dashed safe-zone box is a *dev guide* (only in previews), which is fine. Dashed connectors in the funnel were a problem. | Solid hairline leaders with a dot terminator. |
| 10 | Too many simultaneous elements (chip + 3 callouts + card + map) | **Problem.** | At most 1 sheet + 2 labels + the section tab per frame (see 3.4). |
| 11 | Everything centred | **Problem.** Centring is the safe default. | Left-aligned editorial layout on the 60 px margin. Only instrument readouts are centred. |
| 12 | Accent used for text on a light surface (teal on white is 2.5:1) | **Problem.** | Accent is used for *fills and marks*. Accent-as-text uses `accentInk()` (teal becomes `#0d6b62`). Numerals on an accent fill are ink, never white. |
| 13 | "Dashboard" chrome: header rows with icon, title and counter, separators everywhere | **Problem** when the structure carries no information. | Keep a rule only where it separates *kinds* of content (heading / body / result). |
| 14 | Text below 26 px | **Problem.** At 1080 px across a 390 pt phone, 26 px is about 9.4 pt. | `TYPE.min = 26`, enforced in `fit()` (only a node numeral inside a 30 px circle is smaller). |

Things that are **not** problems, and stay:
- **The series colours.** They encode the part. They now appear as a fill only: the top band of each sheet, the active key and the visited path.
- **The numbered index.** It's legitimate here because the content *is* a sequence: the loop, the solids-control stages and the recap.
- **The cursor follow animation.** It responds to an action, and the frontend-design skill explicitly allows motion that "shows what changed".
- **Count-up numbers.** Once, 1.0 s, no overshoot.

---

## 3. The direction: "Field Manual"

> The overlays are pages from a rig hand's field manual laid over the live machine: opaque paper, ink line work, one system colour, numbered parts with precise leaders. The 3D is the photograph; the overlay is the annotation.

This is the right direction for this channel for three reasons. It is honest to the subject: drilling is an engineering trade, and its native graphic language is the technical manual and the P&ID. It is the opposite of the generic "tech-glass" look, so it reads as designed. And because it is opaque, it is the only treatment that survived the bright desert plates.

### 3.1 Palette (5 neutrals + 1 accent per part)

| Token | Hex | Role |
|---|---|---|
| `paper` | `#f6f2ea` | Every text surface |
| `paper2` | `#e9e3d6` | Active row, done button, gauge track |
| `rule` | `#cfc6b4` | Hairlines on paper |
| `ink` | `#16171b` | Text and line work (17:1 on paper) |
| `ink2` | `#4a4d55` | Secondary text (7.9:1) |
| `mute` | `#6d6f75` | Tertiary only (4.9:1) |
| **accent** | `SYS[part]` (Part 4 = `#14b8a6`) | Top band of each sheet, the current key, the visited path, value arcs, result underline. **Fills only.** |
| `accentInk(accent)` | teal → `#0d6b62` | The rare accent-coloured text (Part N of 5, recap numerals) |
| `mud` | `#b07a45` | Content colour (particles, mud parcel) |

Other part colours appear only in the 5-part ruler. There are no gradients anywhere.

### 3.2 Type (Kanit 400 / 600, Thai and English in one family)

| Role | Size / weight | Notes |
|---|---|---|
| Display (title, next teaser) | 112 / 600 | Left-aligned, masked rise |
| Recap title / CTA headline | 80, 64 / 600 | |
| Card title | 42–46 / 600 | |
| Deck line (Thai) | 40–42 / 400 ink | Not a tinted colour. Hierarchy comes from size and weight. |
| Body line, formula | 34, 42 / 400–600 | |
| Label (callout, node, step) | 30–34 / 600, sub 26–28 / 400 ink2 | |
| Kicker / meta | 28–30 / 400 ink2, sentence case | No tracking, no caps |
| Minimum | **26** | |

Scale steps are about ×1.33. Thai lines get at least 1.4 × size of pitch. Nothing is letter-spaced.

### 3.3 Grid and shape
- Content x 60–960 (900 wide). The inner margin of a sheet is 40–56 px. Everything aligns left to the inner margin.
- One radius: **6 px** for sheets and **3 px** for keys. Circles are used only for nodes and dials, because they *are* round things.
- Rules are 2 px (structure) and 1.5 px (rows). Leaders are 3 px ink on an 8 px paper casing.
- The top band is 8 px, or 10 px on title plates.
- Safe zones are unchanged: content y 160–1280. The caption card (frame.html) is at y ≈ 1310–1560. y > 1600 is platform UI.

### 3.4 Density
- Per frame: **1 sheet + up to 2 callouts + the section tab.** The fact card and callouts can coexist only if the callout tab sits above y 1000.
- A sheet holds at most 3 body lines, revealed **≥ 0.8 s apart** (director's rule).
- New elements: at most 2 at once. Hold every label ≥ 3 s.

### 3.5 Motion
1. **One move per element.** Opacity plus a 12–28 px translate, *or* a clip reveal, never both plus a scale.
2. **Easing:** entrances `eout` (cubic out) in 0.3–0.5 s. Exits are faster, `ein` in 0.3 s, and move everything together with no stagger out. Long travel (index band, loop progress) uses `eio`.
3. **No overshoot, no bounce, no pulse.** `eback` stays in the toolbox for the cursor press only.
4. **Cause before effect:** the callout anchor lands, then the leader draws from it (0.45 s), then the tab reveals *from the leader side*. Title plates unroll from the top band down.
5. **Stagger only real sequences** (loop nodes, funnel stages, ruler segments), 0.06–0.12 s.
6. **Hold still.** After 0.6 s nothing moves except data that is genuinely changing (gauge value, current node) and the one mud parcel.
7. Count-ups take 1.0 s cubic out, once.

### 3.6 Labels attach like a technical drawing
- The **dot terminator** sits on the part's face: paper ring, ink disc, accent centre.
- Leaders are an oblique segment **snapped to 15°**, then a horizontal shoulder into the tab's side. When the part is directly under the tab, the leader drops straight into its edge. Leaders never cross, and callers number them clockwise.
- The tab carries a **numbered key** (`n`) when the label is part of a set, with the English name 600 and the Thai sub 400 on a second line.
- No pill and no glow. The tab is a small paper sheet.

### 3.7 When to use no panel
- **Marks on the 3D get no panel:** leader lines, anchor dots, dimension arrows and the loop path in 3D. They are cased lines.
- **Text always gets paper.** On these plates there is no background that white or ink type survives everywhere. A "no panel" title would need a scrim, and that is what glass was.
- **No panel inside a panel.** Inner structure is rules, whitespace and one inset band (`paper2`), never nested cards. The funnel stage rows, the recap items and the step rows are type on the sheet, not tiles.

### 3.8 Iconography
- Line glyphs only, single ink weight, no discs. They are used where they *say* something: the arrow on the outlet, the check on done steps, the bell on the follow button. Cards have no decorative icons.

### 3.9 Recommendation outside the kit (not changed)
The caption card in `frame.html` is still the old navy rounded box (radius 28) with an amber bar. It reads fine, but stylistically it belongs to the old system. A matching restyle would be an `ink` sheet (`#16171b` at 0.9), radius 6, a 6 px top band in the system colour instead of amber, paper-coloured Thai, and `rule`-coloured English. It is a one-function change in frame.html. Since the caption is series-wide, it should be a director's call.

---

## 4. Self-critique log (stills over the real plates)

**Pass 1** (`kit_demo.js`, all scenes):
- Paper sheets on bright sand: edges hold thanks to the contact shadow and keyline. Text contrast is solid on all 5 plates (`sheet_composite.png`).
- Cased leaders read on pink sky, sand and navy. The 15° snap gives the Kelly bushing leader a clean 60° run.
- **Gauge:** the readout collided with the min/max labels and the lower ticks of the 270° dial. Fixed in pass 2.
- **Demo data:** still contained `·` meta strings and a caps kicker with `·`. Fixed in pass 2 (the kit converts caps, but separators are content).
- **CTA:** an empty band under the button. Fixed in pass 3.

**Pass 2:** the dial became a 240° sweep, so the readout owns the lower third and min/max sit under the arc ends. Re-rendered: no collisions. Middots were removed from the demo data.

**Pass 3:** the CTA card was trimmed to 600 px. Final full render. The remaining known compromise: in the parts ruler, "Well Control" is squeezed to fit its 150 px segment at 26 px. That is acceptable, since it only appears in the ruler.

**Pass 4:** the stress test (a 60-character Thai and English section label) was being squeezed horizontally, which looked broken. Now the label has priority: the sub is dropped first, then the label is cut at a Thai word boundary with `...` (`ellipsize()`). Determinism is checked: the same still rendered twice is byte-identical.
