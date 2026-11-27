# Research notes: Drilling Rig 101, Part 5, the Well Control System (equipment)

Fact-check notes for namman.story EP05 Part 5. Same reference rig as Parts 1–4: a land rig of about 1,500–2,000 hp with a top drive and a surface BOP stack in the cellar. Part 4 ended with the teaser "Well Control System: BOP, Choke Manifold และ MGS".

**Scope:** this part covers the **equipment**. Kick detection, shut-in steps, SIDPP/SICP, KMW, Driller's method and Wait & Weight were covered in EP04 (`ep04-well-control/SPEC.md`). Refer to them only as one-line callbacks (see §0).

**Verification key** (same as Part 4):
- **[V]** verified against at least two authoritative sources, or one primary document (standard table, regulation text, OEM data sheet) that I read during this research.
- **[T]** textbook / training-syllabus standard (IWCF/IADC level), or a simple calculation from verified numbers.
- **[R]** a typical value or range. Sources or rigs differ, so give the range, not one "true" number.
- **[U]** uncertain or rig-specific. **Do not put it on screen as a hard fact.**

**Source caveats:**
- The full API Std 53 text is paywalled. I read a **transcription of the API 53 5th-ed. (2018) Annex C test tables** (Murchison Drilling Schools PDF) and secondary IWCF/API-53 study guides. Clause-level claims from the guides are marked [V] only where a second source agrees.
- The **US onshore regulation 43 CFR 3172.6** (BLM, ex-Onshore Order No. 2) was read in full (Cornell LII). It is the most concrete *land-rig* rulebook. Where it differs from API 53, both are given.
- NOV data sheets were read as PDF text.

---

## 0. EP04 callbacks (one line each, do not re-explain)

- Kick = formation fluid enters the well because mud hydrostatic < pore pressure. → "จำ Kick จาก EP04 ได้ไหม"
- Shut-in = close the BOP + open the HCR to the choke line (choke closed), then read SIDPP/SICP. → just show which **equipment** does each step.
- Kill = circulate through the choke manifold → MGS → flare (Driller's / W&W). → show the hardware path only.

---

## 1. Barrier concept (one line)

**Primary barrier = mud hydrostatic. Secondary barrier = the BOP equipment** (BOP stack, choke/kill system, control unit). **[V]** (EP04 SPEC; IWCF barrier syllabus.)

On-screen line: "Mud คือด่านแรก — Well Control Equipment คือด่านที่สอง".

---

## 2. Surface BOP stack (land rig)

### 2.1 What it is and where it sits
- **What it is:** a stack of several large hydraulic valves ("preventers") bolted or clamped onto the wellhead. It sits in the **cellar** under the rig floor. It is **not one valve**. **[V]**
- Above the annular there is the **bell nipple** → flowline (Part 4). The bell nipple is not a pressure device. **[V]** (P4 §6)
- Below the stack: **casing head / wellhead** (casing head housing on the surface casing). **[V]**
- The **stack's rating is limited by its lowest-rated component**. For example, a 10M ram stack often carries a 5M annular. **[V]** (IWCF L2 stack guide; drillingmanual/Eni configs)

### 2.2 Typical arrangement (top → bottom) for the video
Asked-for arrangement, valid and widely used for a 3-ram land stack **[V/R]**:

| Position (top→bottom) | Component | Job |
|---|---|---|
| 1 | Bell nipple / flowline outlet | Normal returns to shakers (P4) |
| 2 | **Annular preventer** | First, flexible shut-in on almost anything in the hole |
| 3 | **Upper pipe ram** (often VBR) | Seals around drill pipe |
| 4 | **Blind / blind-shear ram (BSR)** | Seals the empty hole, or cuts pipe and then seals |
| 5 | **Drilling spool** with choke + kill side outlets | Takes choke and kill lines. A sacrificial erosion part. |
| 6 | **Lower pipe ram** | Backup pipe seal. Can be closed below the spool to isolate the outlets. Hang-off. |
| 7 | Casing head / wellhead | Bottom connection to the casing |

- IWCF L2 study guide (citing API 53 codes) describes the same logic. The lower pipe ram is below the spool. The BSR sits between pipe rams. The upper pipe ram is often a VBR. The annular is on top. **[V]**
- **API stack code** is read **bottom up**: e.g. "10M – 13-5/8 – S-R-R-Rd-A". The codes are A = annular, R = single ram, Rd = double, Rt = triple, S = spool, G = rotating head, M = 1,000 psi. **[V]** (drillingmanual.com; IWCF L2 guide)
- **Arrangements vary by operator.** "Blind above pipe" and "pipe above blind" both exist. Side outlets can be on the ram body instead of a spool, which is common on compact land stacks with low cellars. **[V]** Do not claim one order is "the" standard.
- **Note for design:** the current `scene3d.js` model (copied from P4) has, bottom→top: single ram (pipe), double ram (pipe, **shear**), annular. The choke outlet is drawn below the rams. If the VO names the order "annular → upper pipe ram → blind-shear → lower pipe ram", re-colour or re-order the model to match. Either order is real, but VO and model must agree.

### 2.3 Pressure ratings and bore sizes
- **Rated working pressures:** 2,000 / 3,000 / 5,000 / 10,000 / 15,000 psi (2M…15M; 20M exists, mainly offshore). **[V]**
- **Land rigs:** 3M–5M is common for shallow and medium wells, and 10M for deep or high-pressure wells. 15M on land is rare (HPHT). **[R]**
- **Bore:** **13-5/8 in** is the workhorse land bore. Others are 11 in and 7-1/16 in for small rigs or late sections, and 20-3/4 / 21-1/4 in for large top-hole sections. NOV's land range lists 7", 11", 13-5/8" (3M/5M/10M) and 21-1/4" (5M) ram BOPs. **[V]**
- **Weights (NOV land data sheets) [V]:**

| Item | Weight |
|---|---|
| 13-5/8" 5M LXT double ram, flanged | 14,185 lb (≈6.4 t) |
| 13-5/8" 10M LXT single ram | 17,000 lb |
| 13-5/8" 10M LXT double ram | 26,700 lb (≈12 t) |
| NOV 6012 13-5/8" 10M double | ≈22,400 lb |
| 13-5/8" 5M spherical annular | 17,518 lb (≈8 t) |

- A complete 13-5/8" land stack is therefore **roughly 20 t (5M) to 35–40 t (10M)** before the spool, valves and lines. **[R]** This is my sum of the OEM parts, not a published stack weight. On screen say "หนักหลายสิบตัน".

### 2.4 Minimum stack configuration by rating
**API 53 class tables: [U].** I could not read API 53's stack-class table.
- One secondary (SafeOCS supplement, citing API 53 4th ed.) maps Class 2 → 3,000 psi MASP up to Class 5 → ≥10,000 psi. Class 5 = ≥1 annular + 1 BSR + 2 pipe rams + 1 more annular or ram.
- A search summary claimed a different class mapping. **Sources disagree → do not quote API 53 "classes" on screen.**

**US land regulation 43 CFR 3172.6(b) (read in full) [V]:**

| Rating | Minimum BOP equipment (summary) |
|---|---|
| **2M** | Annular *or* double ram / two rams (one blind, one pipe). Kill line ≥2", choke line ≥2", 2 chokes, upper kelly cock + safety valve. |
| **3M** | Annular + double ram (blind + pipe). Spool or BOP with 2 side outlets. Choke line ≥3" with 2 valves. Kill line ≥2" with 2 valves + check valve. 2 chokes. |
| **5M** | Annular + pipe ram + blind ram (+ 2nd pipe ram/VBR if warranted). As 3M, plus **one choke remote-operated from the floor**, upper + lower kelly cocks, **inside BOP or float sub**. |
| **10M / 15M** | Annular + **2 pipe rams** + blind rams. 3" choke line with **manual + hydraulic** valves. **3 chokes (1 remote)**. Remote kill line to the substructure edge. Upper + lower kelly cocks, IBOP or float sub. |

**Operator practice (Eni, quoted by drillingmanual.com) for land/jack-up [R]:**
- 5M = 2 rams (1 shear + 1 pipe) + 2M annular.
- 10M = 3 rams (1 shear + 2 pipe) + 5M annular.
- 15M = 4 rams (1 shear + 3 pipe) + 10M annular.

**Offshore US surface stacks (30 CFR 250.733), not land [V]:** at least 4 BOPs = 1 annular + 1 BSR + 2 pipe rams.

**Safe on-screen statement:** "Stack บนบกทั่วไป: Annular 1 ตัว + Ram 2–3 ชุด — ยิ่งแรงดันสูง ยิ่งมี Ram มาก". **[V/R]**

### 2.5 Ram preventers: nomenclature
**General [V]:** two opposed hydraulic pistons in the **bonnets** drive steel **ram blocks** with elastomer faces across the bore. (SLB glossary; IWCF L4 guide; Wikipedia BOP)

| Ram | What it does | Notes |
|---|---|---|
| **Pipe ram** (fixed bore) | Half-moon cut-out fits **one pipe OD** (e.g. 5"). Seals the annulus around that pipe. | Highest hang-off rating. Does not seal on a different OD or on open hole. **[V]** |
| **Variable bore ram (VBR)** | Steel inserts + rubber seal a **range** of ODs, e.g. 3-1/2"–5", or HMH 3-1/2" × 5-7/8". | Hang-off typically 200,000–350,000 lb, lower than fixed rams. **[V/R]** |
| **Blind ram** | Flat face, no cut-out. Seals the **empty** hole. SLB: "no space for pipe … blanked off … like the sliding gate on a gate valve." | A plain blind ram does **not** cut pipe. **[V]** |
| **Blind-shear ram (BSR)** | Hardened blades **cut drill pipe body, then seal**. Acts as a blind ram if the hole is empty. | IWCF glossary definition. SLB glossary: "normally used as a last resort." **[V]** |
| **Casing shear ram (CSR)** | Heavy blades to cut casing or thick tubulars. **Non-sealing.** | Mostly offshore / high-spec. Needs a separate sealing ram. **[V]** |
| "Shear ram" | Loose term. SLB glossary uses it = blind-shear ram. | In VO say "Blind Shear Ram" to be precise. |

**Shear limits [V]:** shear rams **cannot cut** tool joints, drill collars, HWDP tool joints or BHA tools (motor, MWD, jars, stabilisers). The driller must **space out** so plain pipe body is across the blades. Cutting capability and sealing after the cut are qualified separately.

### 2.6 How a ram seals
- Each ram carries a **front packer** (face seal, against the pipe or the other ram) and a **top seal** (against the body cavity above the ram). Together they form one continuous seal. Pressure on the front packer energises the top seal against the housing. **[V]** (US 4323256, US 4647002; SLB "packer, top seal and ram body act in unison")
- **Wellbore pressure assists the seal** on common designs, e.g. Cameron U: "wellbore pressure acts on the rams to increase the sealing force". Pressure below the closed ram pushes it **up** against the top seal and pushes the packers together. **[V]** for "assists sealing".
- Do **not** claim that well pressure *closes* the rams: hydraulic closing force must overcome well pressure acting on the ram rod. **[V]**
- **Closing ratio** = well pressure ÷ hydraulic pressure needed to close against it. NOV LXT 13-5/8": 5M = 6.47:1, 10M = 10.69:1. Volume to close one set: 5.1 gal (5M), 12.9 gal (10M). **[V]**
- **Weep (tell-tale) hole** in the bonnet shows a leaking rod seal. Mud = wellbore-side seal failed; hydraulic oil = operating-side seal failed. Never plug it. **[V]** (IWCF L4 guide)

### 2.7 Ram locks
- **Purpose:** hold rams closed mechanically if hydraulic closing pressure is lost. API 53 requires a positive mechanical lock (IWCF L4 guide). 43 CFR 3172 requires locking devices on 2M and above. **[V]**
- **Manual locks:** a screw (handwheel) on each bonnet. NOV 6012: "manual locking screws to ensure ram position in event of hydraulic pressure loss." **[V]**
- **Hydraulic automatic locks:** Cameron **Wedgelock**, NOV/Shaffer **Poslock** and **Ultralock**. They lock automatically on closing, and the hold is mechanical, not trapped fluid. **[V]**
- API 53 Table C.4 note: land rams are pressure-tested with locks engaged and closing pressure vented at commissioning and annually. **[V]**

### 2.8 Annular preventer
- **What it is:** a doughnut-shaped **rubber packing element** reinforced with **steel inserts/segments**. A hydraulic **piston** moves up and squeezes the element inward (Hydril GK: cone-shaped piston; Shaffer: spherical element). **[V]**
- **Closes on almost anything:** drill pipe, tool joint, collars, casing, kelly, and **open hole**. API certification requires it to seal on open hole, though less reliably. (SLB glossary; HMH GK literature: "will close on an open hole") **[V]**
- Closing on open hole shortens element life, so keep it for well-control situations. **[V]**
- Steel inserts form a ring that **stops the rubber extruding** upward under well pressure. **[V]**
- **Closing pressure** is set by the annular regulator, typically about **500–1,500 psi** depending on model. Hydril GK about 800 psi (GK and GL are well-pressure-assisted, so closing pressure is reduced as well pressure rises). Shaffer spherical 1,500 psi. Cameron D from about 500 psi. Max operating pressure is 3,000 psi on the GK spec sheet. **[V/R]**
- **Stripping:** the annular can let pipe and tool joints be pushed or pulled through while closed and sealing.
  - Closing pressure is bled down so joints pass with a slight leak.
  - A **surge bottle** (small accumulator) on the closing line absorbs the displaced fluid.
  - Strip slowly.
  - (Hydril GK manual; drillingmanual.com) **[V]**
- **Hydraulic volume:** large. NOV 13-5/8" 5M spherical: **25.6 gal to close**, 14.6 gal to open, piston WP 1,500 psi. That is about 5× one ram set. **[V]**

**Common mistakes:**
- "BOP = one valve."
- "Blind ram cuts pipe." Only a BSR cuts.
- "Shear ram cuts anything." Not tool joints or collars.
- "The annular is a ram."
- "Pipe ram seals the open hole."
- "Well pressure closes the rams."

---

## 3. Accumulator / BOP control unit ("Koomey unit")

### 3.1 What it is
- A skid of **nitrogen-precharged accumulator bottles + hydraulic fluid reservoir + pumps + regulators + 4-way control valves**. It stores enough hydraulic energy to close the BOPs **with rig power off**.
- It stands away from the wellhead, at ground level and often in a shelter. **[V]** (IWCF L2 guide; SLB Land Closing Unit page)
- **"Koomey"** is a brand name that became generic. It is named after **Paul Koomey**, who built an early BOP control system and took it to Shaffer (University of Houston oral history, 2001). Today **Koomey™ is an NOV brand** (NOV flyer). **[V]** Year 1951 **[R]**.

### 3.2 Pressures (classic 3,000 psi surface system)

| Item | Value | Tag |
|---|---|---|
| Accumulator (stored) pressure | **3,000 psi** | **[V]** IWCF guide; 43 CFR 3172 table |
| Nitrogen precharge | **1,000 psi** (±100). 43 CFR 3172: desired 1,000, max 1,100, min 900 psi | **[V]** |
| Gas | **Nitrogen only, never air or oxygen** | **[V]** |
| Minimum pressure after closing ("200 psi above precharge") | **1,200 psi**. API 53 calls it the calculated **MOP** (minimum operating pressure). | **[V]** |
| Manifold (ram + HCR) regulated pressure | **1,500 psi**, with a bypass to full 3,000 psi for shearing | **[V]** IWCF L2; drillingformulas (regulator + bypass) |
| Annular regulator | Variable, about **500–1,500 psi** (model-specific) | **[V/R]** |
| Rig air for air pumps | about 80–125 psi | **[R]** |

**Usable fluid:**
- Usable fluid = the volume a bottle delivers between 3,000 psi and 1,200 psi.
- By Boyle's law a **10–11 gal bottle gives only about 5 gal usable (~50 %)**. Worked example from the IWCF guide: 1,000 psi precharge, 3,000 psi charged, 1,200 psi floor.
- Formula: V_usable = P_pre·V·(1/P_min − 1/P_max) = 1000·10·(1/1200 − 1/3000) = **5.0 gal**. **[V/T]**

### 3.3 Capacity requirement (sources differ in wording)
- **API 53 (via IWCF L4 guide + drillingformulas) [V]:** with **pumps off**, the accumulators must close the annular + rams (drawdown test: annular + up to 4 rams) **and open the HCR**, with final pressure **above MOP**. Drawdown test interval ≤ 180 days. After drawdown, the pumps must restore system RWP within **15 min**.
- **43 CFR 3172 (land, US) [V]:**
  - 3M: open the HCR, close all rams + annular, keep **200 psi above precharge**, no pumps.
  - **5M+: add a 50 % safety factor** on 3-ram systems.
  - Reservoir **≥ 2× usable volume**.
- **Illustration [T]** (NOV volumes): annular 25.6 + 3 ram sets × 5.1 + HCR ≈ **42 gal**. × 1.5 safety factor ≈ 63 gal usable ≈ **13 bottles** of 11 gal. NOV's standard land units hold 264–360 gal total, with 6–8 control stations. **[V]** for the NOV unit sizes.

### 3.4 Pumps
- At least **two independent pump systems**, typically **electric triplex + air (pneumatic) pumps**. Air pumps keep working in an electrical blackout. **[V]** (API 53 via IWCF guide; 43 CFR 3172; NOV unit table "1 electric + 3 pneumatic")
- Electric pump auto-starts at about **90 % of RWP (2,700 psi)** and stops at 3,000 psi. **[V]**
- **Pump-only test** (accumulators isolated):
  - 43 CFR 3172: pumps must close the annular on the smallest pipe and open the HCR, reaching 200 psi above precharge, within **2 minutes**.
  - API 16D recharge: combined pumps from precharge to RWP in **≤15 min**.
  - **[V]** Two different tests; do not mix them.

### 3.5 Closing-time requirements (API 53, surface stacks) [V]
- **Each ram BOP: ≤ 30 s.**
- **Annular < 18-3/4" bore: ≤ 30 s. Annular ≥ 18-3/4": ≤ 45 s.** (Subsea: ram 45 s, annular 60 s; not our rig.)
- Timing runs from activation at any panel until the BOP is closed and sealing.
- Our 13-5/8" annular → **30 s**.
- Sources: API RP 16E/API 53 copies; IWCF L4 guide; drillingformulas.

### 3.6 Control stations
- **Master hydraulic unit** at the accumulator: manual 4-way valves with **OPEN / CLOSE / BLOCK** positions.
  - Valves stay in OPEN/CLOSE, **never BLOCK**, while drilling.
  - The blind/shear handle has a **guard** against accidental operation.
  - **[V]** (IWCF L2; drillingformulas)
- **Driller's remote panel** on the rig floor / driller's cabin. It usually needs a **two-hand "master push + function"** action. **[V]**
- **Second remote panel**, e.g. toolpusher's office or muster point. **[V/R]**
- 43 CFR 3172: remote controls readily accessible to the driller; 3M+ must close all preventers; 5M+ must open and close all; master controls at the accumulator. **[V]**
- Panel gauges: accumulator 3,000 / manifold 1,500 / annular 500–1,500 / rig air. **[V]**
- **Hydraulic fluid:** sources differ. The IWCF guide says hydraulic oil. Many land units use a **water + soluble-oil/glycol mix** (IWCF L4 example: ~95 % water, 5 % lubricant). **[R]** Say "น้ำมันไฮดรอลิก" generically.

**Common mistakes:**
- "Accumulator is charged with air."
- "Koomey is the official name."
- "Accumulator pumps close the BOP." Stored bottles do; pumps recharge them.
- "All 3,000 psi go to the rams." Rams get about 1,500 psi regulated.

---

## 4. Choke & kill system

### 4.1 Side outlets and valves
- Choke and kill lines leave the **drilling spool** (or ram body outlets), typically **below** the upper pipe/blind rams. **[V]**
- **Choke side:** **2 full-opening gate valves in series**. Inner = **manual**, outer = **HCR** (hydraulic, remote from the driller's panel). API 53 5.2.1.2–3 requires 2 full-opening valves with a remotely controlled valve on the choke line. **[V]** (IWCF L4 guide; NM permit example; 30 CFR 250)
- **Kill side:** 2 valves (manual + HCR) **or** 2 manual + a **check valve** toward the pump. **[V]** (43 CFR 3172; 30 CFR 250.733)
- **HCR** = "High Closing Ratio" hydraulic gate valve. It is an on/off **isolation** valve, fully open or fully closed, **not** the adjustable choke. **[V]** for function; acronym expansion **[R]** (drillingformulas; trade usage).
- **Line sizes:**
  - API 53 5th ed.: surface choke line ≥ **2" ID** for MASP ≤ 5,000 psi, ≥ **3"** above 5,000 psi. Kill line ≥ **2"**. (IWCF L4 guide)
  - **43 CFR 3172 is stricter on land:** 3" choke line from 3M up.
  - **[V]** Sources disagree; say "ท่อโช้กใหญ่กว่าท่อคิล" (choke ≥ kill), which is true in both.
- **Kill line purpose:** pump mud **into** the annulus below the closed BOP when you cannot pump down the drill pipe. It is not used in a normal Driller's-method kill, which pumps down the drill string. **[V/T]**
- Flexible choke/kill hoses: API Spec 16C, fire-rated (e.g. 30 min at 1,300 °F / 700 °C). **[V]** (IWCF L4 guide)

### 4.2 Choke manifold
- **What it is:** a skid of high-pressure gate valves, crosses and **adjustable chokes**. It holds controlled back-pressure on the well while circulating a kick out (EP04). **[V]**
- **Rating:** everything upstream of and including the chokes is rated at least equal to the ram BOPs. **[V]**
- **Chokes:**
  - At least **2 adjustable chokes**: one **manual adjustable** (handwheel) and one **hydraulic/remote**.
  - 43 CFR 3172: 5M → 1 remote; 10M+ → **3 chokes (1 remote)**.
  - IWCF L4 guide warns that "1 manual + 1 remote" is not universal; check the approved manifold drawing.
  - **[V]**
- **Adjustable chokes are not full-sealing devices.** API 53 does not require a pressure test against a closed choke. The valves do the sealing. **[V]** (API 53 Table C.4 note e)
- **Remote choke panel** on the rig floor [V]:
  - **Drill pipe pressure** gauge
  - **Casing pressure** gauge
  - **SPM + total stroke counter**
  - **Choke position** (% open)
  - Choke open/close lever + speed control
  - Backup hand pump
- Example products: SLB/Cameron, NOV, Swaco "Super Choke" (brand only **[U]**).
- **Downstream:** the choke outlet goes to a buffer/header, then to the **MGS** (normal kill path), **straight to flare** (bypass/"panic" line), or to the **shakers** (only for gas-free returns). **[V]**
- Choke differential pressure can exceed 3,000–5,000 psi. Abrasive flow can exceed 300 ft/s through the choke trim (erosion). Gas expansion through the choke can cause icing (Joule-Thomson). **[R]**

### 4.3 Mud-gas separator (MGS, "poor-boy degasser", "gas buster")
- **What it is:** a tall, **near-atmospheric** vessel fed from the choke manifold during well control. Mud and gas hit a **target plate and baffles**. **Free gas** rises out of a **large vent line to the flare**. Mud drains back to the **shakers / trip tank / pits**. **[V]** (Wikipedia; drillingmanual FAQ; SLB glossary via P4)
- **Principle: U-tube liquid seal ("mud leg")** [V]:
  - The liquid outlet is a U-bend (closed-bottom type) or the vessel is dipped into a tank (open-bottom "poor-boy").
  - The column of mud in the leg seals gas from going out with the mud.
  - Gas back-pressure in the vessel = vent-line friction. It must stay **below** the mud-leg hydrostatic, 0.052 × MW × h_leg.
  - If not, gas **blows through** to the shakers. This is the main MGS hazard.
- **Typical design numbers [R]** (drillingmanual FAQ; IWCF L2 guide):
  - Mud leg ≥ **10 ft**. At ~0.52 psi/ft that holds only about **5 psi**.
  - Vessel ≥ **48 in** diameter × ≥ **16 ft** tall.
  - Inlet about 4 in.
  - Liquid outlet ≥ 8 in (12 in advised).
  - **Vent line 8–12 in**, straight, with few bends.
  - One example vessel is hydrotested to 190 psi for 150 psi MWP. Operating pressure ≈ vent-line friction only.
- **Types [V]:** open-bottom (poor-boy, on a tank); closed-bottom (U-tube); float-type (less common).
- **MGS ≠ vacuum degasser.** The degasser is routine treatment of entrained gas after the shakers (P4 §7.2). Gas still in the mud after the MGS goes to the vacuum degasser. **[V]**

**Common mistakes:**
- "The choke shuts in the well." BOP + valves do; the choke throttles.
- "HCR = choke."
- "MGS is pressurized like a production separator." It runs at a few psi.
- "Gas goes to the shakers." Only if the seal is lost.
- "Kill line is how you always kill the well."

---

## 5. Trip tank, flow sensor, PVT (brief link to Part 4)

- **Trip tank:** a small, tall, calibrated tank that keeps the hole full while **tripping**. Compare the measured fill with the steel volume pulled out.
  - Less fill than calculated → influx/swab.
  - More flow on the trip in → possible kick or loss.
  - It is a primary well-control monitoring tool. **[V]** (P4 §2; IWCF)
  - Size 20–50 bbl **[U/R]**.
  - The MGS liquid outlet can return to the trip tank. **[V]**
- **Flow-out sensor (paddle):** the earliest surface kick sign (flow up with pumps unchanged). **[V]** (P4 §6)
- **PVT:** total pit volume with gain/loss alarms. IWCF (citing API 53) defines it as a device that "combines all of the individual pit volume indicators". **[V]** (P4 §2)
- 43 CFR 3172: weekly BOP / pit-level drill per crew. **[V]**
- **Video use:** one shot "ตรวจจับ → Trip Tank / Flow Sensor / PVT (จาก Part 4)" then move on.

---

## 6. Drill-string barriers (inside the pipe)

The BOP closes the **annulus**. These valves close the **inside of the drill string**. **[V]**

| Device | Where | How / key fact | Tag |
|---|---|---|---|
| **Upper IBOP** | Top drive main shaft | Ball valve, **remote-actuated** from the driller's console. Also used as a mud-saver. | **[V]** (IWCF L2; NOV TDS brochure) |
| **Lower IBOP** | Below the upper IBOP on the top drive | Ball valve, **manual** (wrench). Kept for emergencies. Can be broken off and left in the string. | **[V]** |
| **FOSV** (Full-Opening Safety Valve, "TIW valve", stabbing valve) | **Rig floor**, kept **open** with its wrench and crossovers ready | Quarter-turn ball valve, full bore. Stab it **open** while the string flows, make up, then close. Full bore lets wireline tools pass. | **[V]** |
| **Inside BOP / Gray valve** (dart-type check valve) | Stabbed on top of the closed FOSV if needed (stripping) | Spring check valve: pump down, no flow up. A release rod holds it open while stabbing. Not full bore. | **[V]** |
| **Float valve** (float sub) | In the BHA just above the bit | Flapper or plunger check valve. Stops back-flow into the string. An un-vented float makes the SIDPP gauge read 0; the float must be "bumped" (EP04 link, one line only). | **[V]** |
| **Kelly cock** (kelly rigs only) | Upper (left-hand thread) above the kelly; lower below it | On top-drive rigs the upper/lower IBOPs replace them. 43 CFR 3172 requires lower kelly cocks for 5M+. | **[V]** |

- **TIW** is an old brand (Texas Iron Works) that became generic. **[R]**
- API 53 Table C.5: kelly valves, drill-pipe safety valves and IBOPs are pressure-tested (250–350 psi low / MASP high), not to exceed 21 days. **[V]** Floor safety valves are function-tested daily (IWCF L4 guide). **[R]**

**Common mistakes:**
- "The BOP also seals inside the pipe." Only the shear ram cuts across it.
- "FOSV is kept closed." It is kept **open**, so it can be stabbed into a flowing string.

---

## 7. Diverter (brief)

- **What it is:** a low-pressure annular-type closing device with large **vent line(s)**, installed on the **conductor** before the BOP for the top-hole section. It is used where **shallow gas** is possible.
- When it closes, a vent valve opens (sequenced), and flow is **redirected** away from the rig. **It does not stop the flow.** **[V]**
  - IADC lexicon / API definitions: "close the vertical access and direct any flow into a line away from the rig."
  - Oklahoma rule: "flow is not stopped but rather the flow path is redirected."
- **Why not shut in:** below a shallow conductor the formation is weak. Shutting in can fracture it and let gas **broach** to surface around the rig. **[V/T]** (IWCF L2 guide)
- **Standard:** **API Std 64** *Diverter Equipment Systems* (3rd ed. 2017, reaffirmed 2023). Diverter content was removed from RP 53 in its 4th edition. **[V]**
- Control functions sit on the same control unit (NOV units list "complete diverter controls with sequencing"). **[V]**
- Exact vent-line sizes on land: **[U]** (offshore rules use 10–12 in).
- On land rigs in many basins no diverter is used if shallow gas is not expected. **[R]** Say "ใช้เมื่อมีความเสี่ยง Shallow Gas".

---

## 8. BOP testing

### 8.1 Function test vs pressure test
- **Function test:** operate each preventer and valve open/close from the panels. Record closing times and check the gauges. **No wellbore pressure.** **[V]**
- **Pressure test:** set a **test plug** in the wellhead (or use a cup tester). Close the component and pump water to a **low test**, then a **high test**. Hold, with no leaks and a stable pressure. **[V]**

### 8.2 API Std 53 (5th ed. 2018) Annex C, surface stacks (transcribed tables) [V]

| Item | Value |
|---|---|
| **Low test** | **250–350 psi** on every component, always before the high test |
| **High test (initial)** | Rams = ram RWP or wellhead RWP (lower). **Annular = its RWP after element change-out**, otherwise MASP or 70 % RWP (lower). |
| **High test (subsequent)** | Rams, valves, choke manifold, IBOPs = **MASP for the hole section**. **Annular = MASP or 70 % of RWP, whichever is lower.** |
| **Hold time** | **≥ 5 minutes**, no visible leaks, pressure stable |
| **Pressure-test frequency** | **Not to exceed 21 days**. Blind/BSR at casing points. Plus after any seal is broken or a repair. |
| **Operating chambers** | Tested every 12 months |
| **Function test** | Rams, annular, choke/kill valves **≤ 7 days**; BSR ≤ 21 days; adjustable chokes and floor valves daily. **[V/R]** These come from IWCF/API-53 study guides; I could not read the surface table C.3 itself. The 7-day annular/ram figure matches 30 CFR 250.737 and 43 CFR 3172 (weekly). |
| **Accumulator drawdown test** | ≤ 180 days. Final pressure > MOP. Recharge to RWP ≤ 15 min. |
| **Annular / VBR** | Tested on the smallest (and largest) pipe OD to be used |

### 8.3 Where rules disagree (do not mix on screen)

| Rule | Interval | Hold | Annular high |
|---|---|---|---|
| **API 53 (2018)** | ≤ 21 days | 5 min | MASP or 70 % RWP |
| **US onshore 43 CFR 3172** | initial + every **30 days** + after seal break | **10 min** (ram ≤10 % drop in 30 min without plug) | **50 % RWP** |
| **US offshore 30 CFR 250.737** | **14 days** (21 with approval); BSR function 14 days | | |

- **Thailand DMF requirements: [U]** (not researched).
- **Safe on-screen line:** "ทดสอบแรงดันต่ำ 250–350 psi ก่อน แล้วค่อยแรงดันสูง — ตาม API 53 ทุกไม่เกิน 21 วัน และ Function Test ทุกสัปดาห์".

---

## 9. "Wow" facts for short video (all safe as written)

1. **Over 600 tonnes pushing up.** 10,000 psi on a 13-5/8" bore (area ≈ 145.8 in²) ≈ **1.46 million lbf ≈ 660 t-force** on the closed rams. At 5,000 psi it is ≈ 330 t. **[T]** (calculation)
2. **30 seconds.** API 53: each ram must close in **≤ 30 s**, and a 13-5/8" annular too. The power comes from nitrogen bottles, so the closing works **even with rig power off**. **[V]**
3. **Hundreds of tonnes to cut.** Theory F ≈ 0.577 × yield × area gives about **410,000 lbf (≈185 t)** to shear 5" 19.5 lb/ft S-135 pipe. Real tough pipe needs more, which is why shear rams get extra pressure/boosters. **[R]** (BSEE TAP 463/455 method; own calc) On screen: "แรงตัดหลายร้อยตัน".
4. **12 tonnes for one double ram.** A 13-5/8" 10M double ram weighs about **26,700 lb (≈12 t)**. The whole land stack is "หลายสิบตัน". **[V]** NOV LXT sheet / **[R]** total.
5. **Born in 1922.** James Abercrombie and Harry Cameron sketched the first ram BOP on a machine-shop **sawdust floor** in Humble, Texas. It was rated 3,000 psi, a record then, and is now an ASME engineering landmark (2003). **[V]**
6. **A rubber donut that seals on nothing.** The annular can close on any pipe shape and even on an **empty hole**. **[V]**
7. **Only half of each bottle is usable.** An 11-gal accumulator bottle delivers about 5 gal before pressure falls to 1,200 psi (Boyle's law). **[V/T]**
8. **A 5-psi seal that tames a kick.** The MGS has no valves in the gas path. A ~10-ft column of mud is the only seal, holding about 5 psi, so the vent line must be big (8–12") to keep back-pressure low. **[R/T]**
9. **Koomey was a person.** The "Koomey unit" is named after inventor Paul Koomey. **[V]**

---

## 10. Pronunciation guide (Thai phonetic for TTS)

Terms marked **(spell)** are read letter by letter. Keep English terms in captions (EP04 rule); use these spellings only in the VO text sent to TTS.

| English | TTS (Thai phonetic) | Thai one-line meaning |
|---|---|---|
| BOP **(spell)** | บี-โอ-พี | ชุดวาล์วป้องกันหลุมพ่น |
| Blowout Preventer | โบลว์เอาท์ พรีเวนเตอร์ | ชื่อเต็มของ BOP |
| BOP Stack | บี-โอ-พี สแต็ก | BOP หลายตัวซ้อนกัน |
| Well Control | เวล คอนโทรล | การควบคุมหลุม |
| Barrier (Primary / Secondary) | แบริเออร์ (ไพรมารี / เซคันดารี) | ด่านกั้นแรงดันชั้นแรก / ชั้นสอง |
| Annular Preventer | แอนนิวลาร์ พรีเวนเตอร์ | ยางโดนัทบีบปิดรอบทุกอย่าง |
| Packing Element | แพ็คกิ้ง เอลิเมนต์ | ยางวงแหวนเสริมเหล็กในแอนนิวลาร์ |
| Ram / Pipe Ram | แรม / ไปป์แรม | ก้อนเหล็กสองข้างปิดรอบท่อ |
| Variable Bore Ram / VBR **(spell)** | แวริเอเบิล บอร์ แรม / วี-บี-อาร์ | แรมที่ปิดได้หลายขนาดท่อ |
| Blind Ram | ไบลนด์ แรม | แรมหน้าเรียบ ปิดหลุมเปล่า |
| Blind Shear Ram / BSR **(spell)** | ไบลนด์ เชียร์ แรม / บี-เอส-อาร์ | ใบมีดตัดท่อแล้วปิดสนิท |
| Shear Ram | เชียร์ แรม | แรมตัดท่อ |
| Ram Lock / Wedgelock | แรมล็อก / เวดจ์ล็อก | ตัวล็อกแรมไว้ไม่ให้เปิดเอง |
| Bonnet | บอนเน็ต | ฝาข้างที่มีลูกสูบดันแรม |
| Drilling Spool | ดริลลิ่ง สปูล | ท่อต่อกลางที่มีทางออกโช้ก/คิล |
| Casing Head / Wellhead | เคซิ่งเฮด / เวลเฮด | หัวหลุมที่ BOP ตั้งอยู่ |
| Cellar | เซลลาร์ | หลุมใต้พื้นแท่นที่วาง BOP |
| Accumulator | แอค-คิว-มู-เล-เตอร์ | ถังเก็บพลังงานไฮดรอลิก |
| Koomey Unit | คูมีย์ ยูนิต | ชื่อเรียกติดปากของชุดควบคุม BOP |
| BOP Control Unit | บี-โอ-พี คอนโทรล ยูนิต | ชุดปั๊ม+ถังที่สั่งเปิดปิด BOP |
| Nitrogen Precharge | ไนโตรเจน พรีชาร์จ | อัดไนโตรเจนรองในถังไว้ก่อน |
| psi **(spell)** | พี-เอส-ไอ (or ปอนด์ต่อตารางนิ้ว) | หน่วยแรงดัน |
| Driller's Panel / Remote Panel | ดริลเลอร์ส แพเนล / รีโมต แพเนล | แผงสั่งงานบนพื้นแท่น |
| Toolpusher | ทูลพุชเชอร์ | หัวหน้าแท่นเจาะ |
| Choke Line / Kill Line | โช้กไลน์ / คิลไลน์ | ท่อระบายออก / ท่อสูบเข้าใต้ BOP |
| HCR **(spell)** | เอช-ซี-อาร์ | วาล์วไฮดรอลิกเปิด/ปิดท่อโช้ก |
| Gate Valve | เกต วาล์ว | วาล์วประตูเปิดสุด/ปิดสุด |
| Check Valve | เช็ก วาล์ว | วาล์วกันไหลกลับ |
| Choke Manifold | โช้ก แมนิโฟลด์ | ชุดวาล์วและโช้กคุมแรงดันย้อนกลับ |
| Adjustable Choke | แอดจัสเทเบิล โช้ก | วาล์วหรี่ปรับรูได้ |
| Remote Choke Panel | รีโมต โช้ก แพเนล | แผงคุมโช้กพร้อมเกจแรงดัน |
| Mud Gas Separator / MGS **(spell)** | มัดแก๊ส เซพพาเรเตอร์ / เอ็ม-จี-เอส | ถังแยกแก๊สออกจากโคลนตอนคิก |
| Poor-boy Degasser | พัวร์บอย ดีแก๊สเซอร์ | ชื่อเล่นของ MGS |
| Gas Buster | แก๊ส บัสเตอร์ | ชื่อเล่นของ MGS |
| Mud Leg / Liquid Seal | มัดเลก / ลิควิด ซีล | ลำโคลนรูปตัวยูกันแก๊สรั่วออก |
| Vent Line / Flare | เวนต์ไลน์ / แฟลร์ | ท่อปล่อยแก๊สไปเผา |
| Trip Tank | ทริป แท้งค์ | ถังวัดน้ำโคลนตอนถอน/ลงท่อ |
| PVT **(spell)** | พี-วี-ที | ระบบรวมปริมาตรถังโคลน |
| Flow Sensor | โฟลว์ เซนเซอร์ | ตัววัดโคลนไหลกลับ |
| Top Drive | ท็อป ไดรฟ์ | ตัวหมุนก้านเจาะ (Part 3) |
| IBOP **(spell)** | ไอ-บี-โอ-พี | วาล์วปิดในก้านเจาะบนท็อปไดรฟ์ |
| FOSV **(spell)** | เอฟ-โอ-เอส-วี | วาล์วบอลสำรองบนพื้นแท่น (เปิดค้างไว้) |
| TIW Valve **(spell)** | ที-ไอ-ดับเบิลยู วาล์ว | ชื่อเรียกติดปากของ FOSV |
| Stabbing Valve | สแตบบิ้ง วาล์ว | วาล์วที่เสียบเข้าท่อได้ทันที |
| Float Valve | โฟลต วาล์ว | วาล์วกันไหลกลับเหนือดอกสว่าน |
| Kelly Cock | เคลลี่ ค็อก | วาล์วบนเคลลี่ (แท่นรุ่นเก่า) |
| Diverter | ไดเวอร์เตอร์ | ปิดแล้วเบี่ยงทางแก๊สออกข้าง |
| Shallow Gas | แชลโลว์ แก๊ส | แก๊สตื้นก่อนลง BOP |
| Stripping | สตริปปิ้ง | ดันท่อผ่านแอนนิวลาร์ที่ปิดอยู่ |
| Space Out | สเปซ เอาท์ | จัดระยะไม่ให้ข้อต่อตรงแรม |
| Function Test / Pressure Test | ฟังก์ชัน เทสต์ / เพรสเชอร์ เทสต์ | ทดสอบการทำงาน / ทดสอบแรงดัน |
| Test Plug | เทสต์ ปลั๊ก | ตัวอุดหัวหลุมตอนทดสอบ |
| API / IADC / IWCF **(spell)** | เอ-พี-ไอ / ไอ-เอ-ดี-ซี / ไอ-ดับเบิลยู-ซี-เอฟ | สถาบัน/มาตรฐานอุตสาหกรรม |
| MASP **(spell)** | เอ็ม-เอ-เอส-พี | แรงดันผิวสูงสุดที่คาดไว้ |
| Kick / Shut-in | คิก / ชัท-อิน | (EP04 callback) |

---

## 11. Misconceptions to avoid on screen

1. "BOP is one valve." → It is a **stack** of annular + rams + spool + valves. **[V]**
2. "BOP is the main barrier." → **Mud** is primary; the BOP is secondary. **[V]**
3. "The blind ram cuts the pipe." → Only a **blind-shear** ram cuts. A plain blind ram must not be closed on pipe. **[V]**
4. "Shear rams cut anything." → Not tool joints, collars or BHA; the driller spaces out first. **[V]**
5. "The annular and rams have the same rating." → The annular is often lower (e.g. 5M annular on a 10M stack), and it is tested to 70 % RWP or MASP. **[V]**
6. "The choke closes the well / HCR is the choke." → Adjustable chokes are not full-seal devices. The HCR is an on/off gate valve. **[V]**
7. "The accumulator is filled with air / pumps close the BOP." → Nitrogen precharge; stored energy closes; pumps recharge. **[V]**
8. "The MGS is the degasser / works at high pressure." → The MGS runs at a few psi and is limited by its mud-leg seal. The vacuum degasser is the routine unit (P4). **[V]**
9. "The diverter shuts in shallow gas." → It **redirects** flow; shutting in shallow gas risks broaching. **[V]**
10. "The FOSV is kept closed on the floor." → It is kept **open** with its wrench, ready to stab. **[V]**
11. "Rams close in exactly 30 s." → 30 s is the **maximum allowed**, not a typical time. Real times are model-specific. **[U]**
12. "A land BOP sits on the seabed." → That is subsea (EP02). On land the stack sits in the **cellar** on the wellhead. **[V]**
13. "Koomey is the official name." → It is a brand name. The generic terms are accumulator unit / BOP control unit (API 16D "control systems"). **[V]**

---

## 12. Relevant standards (for an end-card or lower-third, optional)

| Standard | Scope | Tag |
|---|---|---|
| **API Spec 16A** | Drill-through equipment: BOPs, spools (design/manufacture) | **[V]** |
| **API Spec 16C** | Choke & kill equipment | **[V]** |
| **API Spec 16D** | Control systems for well control equipment and diverters | **[V]** |
| **API Std 53** (5th ed. 2018) | Well control equipment *systems*: installation, arrangement, testing | **[V]** |
| **API Std 64** | Diverter equipment systems | **[V]** |

Land, US: 43 CFR 3172. Offshore, US: 30 CFR 250 Subpart G. **[V]**

---

## 13. Facts safe to state on screen (short list)

1. The well has two barriers: **mud first, BOP equipment second**. — EP04; IWCF
2. A land BOP stack = **annular on top + 2–3 ram preventers + drilling spool**, on the wellhead in the cellar. — IWCF L2; 43 CFR 3172
3. **13-5/8 in** is the common land BOP bore; ratings run **3,000–15,000 psi**. — NOV land sheet
4. **Pipe ram** seals one pipe size; **VBR** seals a range; **blind ram** seals an empty hole; **blind-shear ram** cuts pipe then seals. — SLB & IWCF glossaries
5. The **annular** is a steel-reinforced rubber donut squeezed by a piston. It can close on any shape, even open hole. — SLB glossary; HMH GK
6. **Ram locks** hold the rams closed mechanically if hydraulic pressure is lost. — NOV 6012; API 53 (via IWCF)
7. The **accumulator** stores **3,000 psi** hydraulic fluid on a **1,000 psi nitrogen precharge**. Rams get about **1,500 psi** regulated. — IWCF L2; 43 CFR 3172
8. It must close the BOPs **with pumps off**, ending above about **1,200 psi** (200 psi over precharge). — 43 CFR 3172; API 53 MOP
9. API 53: **rams ≤ 30 s, annular (<18-3/4") ≤ 30 s** closing time. — API 53 / RP 16E copies; IWCF L4
10. Two pump systems, **electric + air**, recharge it. — API 53; 43 CFR 3172
11. The choke line has **2 valves: inner manual + outer HCR** (remote hydraulic). — API 53 5.2.1 (via IWCF L4); permit example
12. The **choke manifold** holds back-pressure with adjustable chokes (manual + remote). The remote panel shows **drill-pipe and casing pressure** plus strokes. — IWCF L4; NOV/SLB
13. The **MGS** separates free gas to the **flare** using a **U-tube mud seal**. Mud goes back to the shakers/tanks. — drillingmanual; Wikipedia
14. **Top drive IBOPs** (upper remote, lower manual) and a floor **FOSV kept open** close the inside of the pipe; a **float valve** sits above the bit. — IWCF L2; NOV TDS
15. A **diverter** redirects shallow gas away from the rig; it does not shut the well in. — IADC lexicon / API 64
16. BOP tests: **low 250–350 psi, then high; hold ≥ 5 min; pressure test at least every 21 days (API 53)**; function test weekly. — API 53 Table C.5; 30 CFR 250.737; 43 CFR 3172
17. The first ram BOP was invented in **1922** by Abercrombie & Cameron. — ASME Landmark #227

---

## Sources

- API Std 53 5th ed. Annex C tables (transcription, Murchison Drilling Schools): https://cdn.shopify.com/s/files/1/0098/1843/9761/files/API_Standard_53_5th_Edition_Tables.pdf
- 43 CFR 3172.6 (BLM onshore well control): https://www.law.cornell.edu/cfr/text/43/3172.6
- BLM accumulator function test sheet (Onshore Order 2): https://www.ntc.blm.gov/krc/uploads/244/Accumulator%20Function%20Test.pdf
- 30 CFR 250.733 / 250.737 (offshore surface stack / testing): https://www.law.cornell.edu/cfr/text/30/250.733 ; https://www.law.cornell.edu/cfr/text/30/250.737
- IWCF-syllabus study guides (open-exam-prep; secondary):
  - Accumulators: https://open-exam-prep.com/study-guides/iwcf-level-2-drilling-well-control/choke-manifolds-auxiliary-control-systems/bop-control-systems-accumulators
  - Accumulator sizing (API 53): https://open-exam-prep.com/study-guides/iwcf-level-4-drilling-well-control/control-systems-testing-subsea-configurations/accumulator-closing-units-sizing-api-53
  - BOP testing: https://open-exam-prep.com/study-guides/iwcf-level-4-drilling-well-control/control-systems-testing-subsea-configurations/bop-testing-standards-frequency-drawdown
  - Rams: https://open-exam-prep.com/study-guides/iwcf-level-4-drilling-well-control/blowout-preventers-associated-rig-equipment/ram-preventers-pipe-variable-bore-blind-shear
  - Stack configurations: https://open-exam-prep.com/study-guides/iwcf-level-2-drilling-well-control/bop-equipment-stack-arrangements/bop-stack-configurations-spools
  - Side outlets / HCR: https://open-exam-prep.com/study-guides/iwcf-level-4-drilling-well-control/bop-stack-outlets-connections-manifold-hardware/bop-side-outlet-valves-drilling-spools-hcr
  - Choke manifolds: https://open-exam-prep.com/study-guides/iwcf-level-4-drilling-well-control/blowout-preventers-associated-rig-equipment/choke-manifolds-remote-chokes-buffer-tanks
  - Internal BOPs: https://open-exam-prep.com/study-guides/iwcf-level-2-drilling-well-control/choke-manifolds-auxiliary-control-systems/internal-bop-auxiliary-equipment
  - Shallow gas: https://open-exam-prep.com/study-guides/iwcf-level-2-drilling-well-control/kick-detection-warning-signs/shallow-gas-diverter-operations
- IWCF glossary, blind shear ram: https://www.iwcf.org/glossary/bop-blind-shear-ram/
- NOV Land Pressure Control Equipment technical sheet (6012, LXT, Spherical): https://assets.nov.com/NCP4N68N/at/r4q97ns4cjhxqbv45qq6bk/Land_Pressure_Control_Equipment_Technical_Marketing_Sheet.pdf
- NOV BOP Control Unit flyer (Koomey™): https://assets.nov.com/NCP4N68N/at/sjm59zvb3gp3wcprxp33tvr9/BOP_Control_Unit_Flyer.pdf
- NOV top drive brochure (upper/lower IBOP): https://nov.com/media/nov/files/products/rig/rig-equipment/top-drive-systems/top-drive-technologies-brochure.pdf
- HMH (Hydril) GK annular and packing element sheets: https://hmhw.com/wp-content/uploads/2022/06/GK-ABOP.pdf ; https://hmhw.com/wp-content/uploads/2023/08/GK13-5-HNBR-080723.pdf
- HMH BOP rams brochure (VBR ranges): https://hmhw.com/wp-content/uploads/2023/08/BOP-Rams-A4.pdf
- SLB Energy Glossary: "annular BOP", "blind ram", "shear ram" (glossary.slb.com); SLB U BOP / Land Closing Unit product pages
- Drillingmanual.com:
  - Stack arrangements (Eni configs): https://www.drillingmanual.com/blowout-preventer-stack-arrangements/
  - Annular BOP: https://www.drillingmanual.com/annular-bop-blowout-preventer-cameron-hydril/
  - MGS FAQ: https://drillingmanual.com/mud-gas-separator-poorboy-buster
  - IBOP: https://www.drillingmanual.com/inside-bop-ibop-top-drive-kellycock-valve/
- DrillingFormulas.com:
  - Accumulator requirements: https://www.drillingformulas.com/accumulators-for-surface-well-control-system-and-requirements/
  - HCR: https://www.drillingformulas.com/tag/hcr/
  - Poor boy degasser: https://www.drillingformulas.com/whats-a-poor-boy-degasser-mud-gas-separator/
- Wikipedia "Mud Gas Separator", "Blowout preventer" (secondary)
- Ram seal patents: US 4323256, US 4647002 (patents.google.com)
- BSEE TAP 463/455 shear-ram studies: https://bsee.gov/sites/bsee.gov/files/tap-technical-assessment-program/463aa.pdf
- IADC Lexicon "diverter": https://iadclexicon.org/diverter/ ; API Std 64 listing: https://standards.globalspec.com/std/14604566/std-64 ; BSEE API-revision presentation (diverter removed from RP 53 4th ed.)
- ASME Landmark #227 First Ram-Type BOP: https://www.asme.org/about-asme/engineering-history/landmarks/227-first-ram-type-blowout-preventer
- Paul Koomey oral history, Univ. of Houston (2001): https://av.lib.uh.edu/media_objects/3b591866g ; World Oil "Innovative thinkers" (Dec 2011)
- Part 4 dossier (trip tank, PVT, flow sensor, degasser vs MGS): `../../ep05-rig-p4-circulating/docs/research.md`

## Items NOT verified (avoid on screen or say "ประมาณ")

- API 53 stack **class** table (Class 2–6 ↔ pressure mapping); sources disagree.
- Exact surface function-test table (API 53 C.3) wording; the 7-day figure is from secondary guides + CFR.
- Total land stack weight (my sum of OEM parts, ≈20–40 t).
- Typical (as opposed to maximum) BOP closing times.
- Hydraulic fluid type (oil vs water-glycol); it varies by unit.
- HCR acronym origin/brand; TIW brand origin; Swaco "Super Choke" specifics.
- Koomey invention year (1951).
- Diverter vent-line size on land; whether a diverter is used on our reference rig.
- Trip-tank volume for this rig class.
- Thai DMF regulatory test intervals.
- Real shear force for modern S-135 pipe (theory ≈410 klbf; actual is higher and model-specific).
