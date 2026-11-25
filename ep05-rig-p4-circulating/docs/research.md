# Research notes: Drilling Rig 101, Part 4, the Circulating System

Fact-check notes for namman.story EP05 Part 4. The reference case is a land rig of about 1,500–2,000 hp.

**Verification key:**
- **[V]** verified against an OEM document, a standard summary or an SPE/industry source I read during this research.
- **[T]** textbook value I know well but could not re-open online in this session (mainly Bourgoyne et al., *Applied Drilling Engineering*, SPE Textbook Series Vol. 2, 1986).
- **[R]** a typical range where sources disagree. The range is given, not one "true" number.
- **[U]** unverified or rig-specific. Do not put it on screen as a hard fact.

Note: PetroWiki pages now redirect to OnePetro, so I could only use PetroWiki through search excerpts. NOV spec sheets were read in full from their PDFs.

---

## 1. Flow path overview

**What it is:** The circulating system is a closed loop. It pumps drilling mud down through the drill string, out of the bit and back up the annulus. At surface, solids and gas are removed from the mud before it is pumped down again.

**Conventional order (high-pressure side):**
suction tank → (charge pump) → mud pumps → discharge line, with pulsation dampener and pop-off valve at each pump → standpipe manifold → standpipe → rotary (kelly) hose → gooseneck → washpipe and swivel section of the top drive → drill string (drill pipe, HWDP, collars, BHA) → bit nozzles.

**Conventional order (low-pressure return side):**
annulus → bell nipple → flowline → possum belly / header box → shale shakers → (sand trap under the shakers) → degasser → desander → desilter (or mud cleaner) → centrifuge → active / suction tank → back to the pumps.

**Solids-control order is coarse to fine.** Each stage removes progressively finer particles:

| Stage | Typical size removed |
|---|---|
| Shakers | above about 75 µm with API 200 screens, or coarser |
| Desander | about 40–50 µm D50 |
| Desilter | about 15–25 µm D50 |
| Centrifuge | about 2–7 µm |

Sources: Wikipedia "Desander" and "Solids control" (secondary); GlobalSpec desander/desilter page; ASME *Drilling Fluids Processing Handbook* (2005) chapter structure. **[V/R]**

**So a desander always comes BEFORE a desilter.** If the desilter came first, its small 4-in cones would be overloaded and plugged by sand-size solids. **[V]**

**Why the degasser is right after the shakers:**
- Every unit downstream of the shakers (desander, desilter, mud cleaner) is fed by a centrifugal pump. The vacuum degasser's own discharge eductor is also driven by a centrifugal "power-mud" pump.
- Gas-cut mud makes centrifugal pumps lose head and efficiency, and can gas-lock them. Hydrocyclones then run below their design feed head and separate poorly.
- So gas must come out before mud reaches any centrifugal-pump-fed equipment.
- The degasser takes its suction from the shaker-discharge compartment. It discharges into the next compartment downstream.

Sources: IADC-based mud-equipment training chapter on degassers (Scribd copy, secondary); Elgin vacuum degasser catalog (MGS → shakers → degasser → hydrocyclones → centrifuges); US patent 4411673. **[V]**

**Gas buster / MGS.** On a well-control event, returns are routed through the choke manifold to the mud-gas separator (MGS) *before* the shakers. This is a separate path from normal drilling (see §7).

**Common mistakes to avoid:**
- "Desilter before desander." Wrong.
- "Centrifuge first." Wrong.
- Putting the MGS in the routine solids-control line. Wrong.
- Calling the loop "open." It is a closed loop, apart from the solids and gas that are discarded.

---

## 2. Mud tanks / pits

**What they are:** Steel tanks on the rig that hold the surface mud volume. They are divided into compartments for different jobs.

**Tank types:**

| Tank | Purpose |
|---|---|
| **Active system** | The mud currently being circulated: the suction tank plus the intermediate/treatment compartments under the solids-control equipment. |
| **Reserve tank(s)** | Extra mud, or premixed kill-weight / spare mud, that is not in circulation. |
| **Pill tank / slug tank** | A small tank for mixing small special batches: a heavy slug before a trip, LCM pills, or sweeps. |
| **Trip tank** | A tall, narrow, calibrated tank used to keep the hole full and measure fill-up or displacement while tripping. Because it is narrow, a small volume change shows as a large, easily seen level change. It is a primary well-control tool. |
| **Sand trap** | The first compartment under the shakers. It has no agitation and a sloped bottom with a dump valve, so coarse solids that pass a torn screen settle out. It is normally not stirred. |

Sources: IWCF/OpenExamPrep trip-tank notes; *Drilling Fluids Processing Handbook*. **[V]**

**Other tank equipment:**
- **Compartments / weirs / equalizers.** Each solids-control unit should take suction from one compartment and discharge into the next one downstream. This stops processed and unprocessed mud from mixing back. **[V]**
- **Agitators.** Electric-motor paddle (impeller) mixers mounted on top of the tanks. They keep solids and barite in suspension. **[V]**
- **Mud guns.** Nozzles fed by a centrifugal pump that jet mud into the tank to mix it. **[V]**
- **Mixing hopper.** A venturi or jet hopper. A centrifugal pump forces mud through a nozzle, and the low-pressure throat pulls in sacked barite, bentonite or chemicals poured into the funnel. **[V]**
- **Shearing devices.** High-shear units, such as shear pumps or shearing hoppers, used to hydrate polymers and clays faster. **[V]**
- **Chemical barrel.** Liquid chemicals are added slowly, often through a chemical barrel. **[V]**
- **PVT (Pit Volume Totalizer).** Level sensors on each pit (float, ultrasonic or radar) are combined into a total active volume, with high/low (gain/loss) alarms for the driller. IWCF, quoting API STD 53, defines it as a device that "combines all of the individual pit volume indicators and registers the total drilling fluid volume in the various tanks." **[V]**

**Typical sizes for a 1,500–2,000 hp land rig [U/R]:**
- Total surface system about 1,000–2,000 bbl.
- Active about 400–800 bbl.
- Trip tank about 20–50 bbl.

These vary widely with rig design. Do not show them as a hard fact.

**Common mistakes to avoid:**
- Calling the trip tank a "reserve tank."
- Saying the sand trap is agitated.
- Saying PVT measures flow. It measures volume. Flow is measured by the flow-out sensor.

---

## 3. Mud pumps

**What they are:** High-pressure, **positive-displacement reciprocating piston pumps**. They are often called "the heart of the rig" (NOV brochure wording).

**Triplex vs duplex:**
- **Triplex, single-acting.** Three pistons, each pumping only on the forward stroke. This is the modern standard.
- **Duplex, double-acting.** Two pistons, each pumping on both the forward and back stroke, with a piston rod passing through one side. This is older technology.

Triplex pumps are lighter per horsepower and give smoother flow. **[V]**

**Power end vs fluid end:**
- **Power end.** Electric motor(s) → belts or pinion → bull gear → crankshaft → connecting rods → crossheads. It changes rotation into back-and-forth motion. The FB-1600 gear ratio is 4.31:1. **[V]**
- **Fluid end.** Cylinders (modules) with replaceable **liners**, **pistons** with rubber/urethane seals, and **suction and discharge valves with seats**. The FB-1600 has API #7 valve-over-valve pots. **[V]**
- Liners, pistons, valves and seats are the main consumables.
- A spray system cools and lubricates the liners.

**Typical numbers (NOV FB-1600 / FC-1600 / 12-P-160 data sheets) [V]:**
- **1,600 hp input** at **120 SPM**, with a **12-in stroke**. Maximum liner 7 in.
- The standard fluid end is **5,000 psi**. An optional **7,500 psi** fluid end exists (12-P-160 and FC-1600).
- Bigger 2,200 hp pumps, such as the 14-P-220 (14-in stroke, rated speed 105 SPM), are found on larger rigs.
- Normal operating range is roughly 40–120 SPM. A 1,500–2,000 hp land rig typically has two pumps (sometimes three) of about 1,300–1,600 hp each. **[R/U]**

**Liner size trades pressure for flow:** a smaller liner gives more pressure and less flow. Liner size and pressure rating on the FC-1600 at 120 SPM:

| Liner | Max pressure | gpm at 120 SPM |
|---|---|---|
| 7 in | 3,429 psi | 720 |
| 6 in | 4,668 psi | 529 |
| 5 in | 6,722 psi | 367 |
| 4.5 in | 7,500 psi | 297 |

Source: NOV FB/FC-1600 brochure. The FB-1600 (5,000 psi fluid end) caps at 5,000 psi for 5–5.5 in liners. **[V]**

**Output formula (triplex, single-acting):**
- Output (bbl/stk) = **0.000243 × D² × L**, where D = liner ID (in) and L = stroke length (in), at 100 % volumetric efficiency.
- The constant comes from 3 cylinders × π/4 ÷ 9,702 in³/bbl.

**Duplex formula:** bbl/stk = 0.000162 × L × (2D² − d²), where d = rod diameter. Sources: drillingformulas.com, vCalc, drillingmanual.com, all agreeing. **[V/T]**

**Worked example** (FB-1600, 6-in liner, 12-in stroke):
- 0.000243 × 6² × 12 = **0.105 bbl/stk** = 0.105 × 42 = **4.41 gal/stk**.
- At **100 SPM**: 10.5 bbl/min = **441 gpm** at 100 % efficiency.
- At 95 % volumetric efficiency: about **419 gpm**.
- NOV's own table gives 4.41 gal per revolution and 441 gpm at 100 SPM, so the example matches. **[V]**
- Hydraulic hp at maximum pressure for that liner: 441 × 4,665 ÷ 1,714 ≈ **1,200 hhp**. That is 90 % of 1,333 input hp at 100 SPM, which matches NOV's stated 90 % mechanical efficiency. **[V]**

**Ancillaries:**
- **Charge (supercharge) pump.** A centrifugal pump, for example a NOV Mission Magnum, on the suction side. It keeps positive pressure at the triplex suction so the cylinders fill completely. This prevents "hydraulic knock" (cavitation / incomplete fill). Source: World Oil "Know your triplex mud pump" via OSTI. **[V]** The exact charge pressure is OEM-specific; tens of psi is typical. **[U]**
- **Pulsation dampener.** A bladder/diaphragm vessel on the discharge, pre-charged with **nitrogen** (never air or oxygen). It smooths the pressure pulses from each piston stroke. The precharge must be below operating pressure; too high and it does nothing, too low and it is damaged. **[V]** Fixed "rule" percentages (for example ⅓ or ⅔ of operating pressure) depend on the OEM. **[U]**
- **Pressure relief / pop-off valve.** Fitted on each pump discharge, *before* any isolation valve. It is set no higher than the rating of the weakest component, usually the liner rating. It must vent to the pits or suction, not onto the floor. Shear-pin and resettable types exist. **[V/T]**
- **Stroke counters.** Count strokes per pump (SPM and cumulative). Strokes × output per stroke × efficiency = volume pumped. **[V]**

**Common mistakes to avoid:**
- "Mud pumps are centrifugal." Only the charge pump is.
- "Triplex is double-acting." Wrong.
- "A bigger liner gives more pressure." It is the opposite.
- "Dampener filled with air." It is nitrogen.

---

## 4. Standpipe manifold, standpipe, rotary hose, gooseneck, washpipe

**Standpipe manifold:**
- A valve block on the rig floor or substructure. It routes pump output to one or two standpipes, to a fill/kill line, or to a bleed-off back to the pits.
- It has high-pressure gate valves, a **standpipe pressure gauge** (the driller's SPP), and a **pressure transducer** for the driller's display and mud-logging.
- Working pressure is typically **5,000 psi** on land rigs in this class. High-spec and deep rigs use **7,500 psi**, matching the pump fluid end. **[V/R]**

**Standpipe:** A rigid steel pipe running up the derrick/mast leg to roughly 2/3 of mast height. There it connects to the rotary hose. **[V]**

**Rotary hose ("kelly hose"):**
- A flexible, steel-reinforced rubber hose from the top of the standpipe to the gooseneck. It moves up and down with the traveling block/top drive.
- Crews still call it the "kelly hose" on top-drive rigs.
- It is covered by API Spec 7K. Gates datasheets are published as "Grade D" and "Grade E" rotary drilling hose. **[V]**
- Grade D is 5,000 psi WP. Grade E is 7,500 psi WP, with a 15,000 psi test pressure. **[R]**
- API 7K purchasing guidance says line-pipe-thread couplings should not be used above 5,000 psi WP. **[V]**
- ID is typically 3–4 in. **[U]**

**Gooseneck:** The curved, stationary steel pipe on top of the swivel or top drive. The hose connects here. **[V]**

**Washpipe:**
- A short, hardened tube with packing (the "washpipe packing").
- It is the dynamic seal between the stationary gooseneck and the **rotating** main shaft of the top drive or swivel.
- It is a routine wear/leak item. A leaking washpipe is a common reason to stop circulating. **[V/T]**

**Common mistakes to avoid:**
- The kelly hose connects to the gooseneck, not "to the kelly."
- The washpipe is the rotating seal, not "a pipe for washing."

---

## 5. Down the drill string and out the bit

**Flow path:** Mud goes down inside the drill pipe, HWDP and collars (and through MWD/motor if used). It leaves through **nozzles** (jets) in the bit.

**Nozzle sizes and TFA:**
- Nozzle sizes are in 32nds of an inch. For example, a "12" nozzle is 12/32 in.
- **TFA (total flow area)** = sum of nozzle areas, in in².
- Example: 3 × 12/32 in nozzles give TFA ≈ 3 × 0.1104 = 0.331 in². **[T]**

**Bit hydraulics formulas** (field units: gpm, ppg, in², psi):

| Quantity | Formula |
|---|---|
| Jet (nozzle) velocity | vₙ (ft/s) = 0.3208 × Q ÷ TFA |
| Bit pressure drop | ΔP_bit = 8.311×10⁻⁵ × ρ × Q² ÷ (0.95² × TFA²) ≈ ρ Q² ÷ (10,858 × TFA²) |
| Hydraulic impact force | F (lbf) = 0.01823 × 0.95 × Q × √(ρ × ΔP_bit) |

Source: *Applied Drilling Engineering*; PetroWiki "Drill bit hydraulics" excerpt confirms the method. **[T]**

**Where the pressure goes:**
- **SPP = surface equipment + drill string + BHA/motor/MWD + bit + annulus losses.**
- In a design optimized for hole cleaning, roughly **half or more of the SPP is spent at the bit**:
  - **≈ 65 %** for maximum bit hydraulic horsepower.
  - **≈ 48 %** for maximum jet impact force.
  - These figures assume a flow exponent m ≈ 1.75.
- Most of the rest is lost inside the drill string.
- **The annulus is usually the smallest share** (often under about 10 %). It matters for ECD, not for pump load.

Source: *Applied Drilling Engineering*; the 48 % figure is confirmed in the PE 311 / Scribd notes. **[T/R]**

**Typical jet velocity:** about 250–450 ft/s. **[R/U]** This is a rule of thumb.

**Annular velocity for hole cleaning [V/R]:**
- PetroWiki (hole cleaning, via search excerpt): the old practical minimum was about 200 ft/min, later about 100 ft/min was accepted. Sifferman & Becker suggest about 50 ft/min may suffice in vertical holes with good mud. **180–200 ft/min** is needed for deviations above about 10°.
- A safe on-screen statement: "typically about 100–200 ft/min, higher in deviated wells."
- AV (ft/min) = 24.5 × Q ÷ (Dh² − Dp²), with Q in gpm and diameters in inches. **[T]**

**Common mistakes to avoid:**
- "Most pressure is lost in the annulus." Wrong.
- "Nozzles are sized in mm." In the US/IADC convention they are in 32nds of an inch.
- "The bit cuts with the mud jet." The jets clean the cutters and the hole bottom; the bit cuts the rock.

---

## 6. Returns

**Annulus:** The ring-shaped space between the drill string and the hole wall or casing. Cuttings are carried up here. **[V]**

**Bell nipple:**
- A large-diameter pipe spool on top of the BOP stack (above the annular preventer).
- It has a side outlet to the flowline and a fill-up line connection.
- It is not a pressure-control device. **[V]**

**Flowline:**
- A large-diameter pipe or trough from the bell nipple outlet to the shakers.
- It is **gravity-fed and sloped downhill**, so it runs at atmospheric pressure.
- The exact slope figure could not be verified. **[U]**

**Flow-out sensor ("flow paddle"):**
- A hinged paddle in the flowline. It deflects with the return flow and reads as **% flow**.
- Comparing flow out with flow in (pump strokes) is the **earliest surface kick indicator**: flow-out up with pumps unchanged, or flow with pumps off. It is faster than waiting for a pit gain.
- A paddle is only semi-quantitative: one patent gives about 40 % uncalibrated accuracy, and SLB notes it can miss changes at low flow.
- Coriolis or electromagnetic flowmeters are more accurate alternatives used on MPD and high-spec rigs.

Sources: EP0437872 patent; SLB FLAG HD product sheet; IWCF PVT/flow-sensor notes. **[V]**

**Common mistakes to avoid:**
- "Bell nipple seals the well." It does not.
- "Flowline is pressurized." It is not.
- "Paddle gives exact bbl/min." It does not.

---

## 7. Solids control

### 7.1 Shale shakers

**What they are:** Vibrating screen decks. They are the first and most important solids-removal stage, removing the bulk of cuttings. Wikipedia, citing training material, says up to about 80 % when working well. **[V/R]**

**How they work:**
- Mud flows from the possum belly / feeder onto screens.
- Two counter-rotating vibrator motors produce **linear motion**, which conveys cuttings uphill off the end of the deck.
- Liquid and fine solids pass through the screen.
- Linear-motion shakers are now the standard. **[V]**

**G-force [V/R]:**
- Drilling Contractor (2007): "a typical G force in a shaker today is around 4.5–4.7," with some reaching 7–8 G.
- Derrick FLC 2000 Super-G: 7.0 G (3-panel) and 7.3 G (4-panel).
- NOV Brandt King Cobra II: 6.1 → 7.2 G with VFD boost.
- **Safe statement:** "typically about 4–7 G."

**Screens: API RP 13C designation [V]:**
- Screens are labelled by an **API number** set by the measured **D100** opening (the largest particle that passes). The label is not the mesh count.
- Examples of D100 ranges:
  - API 170: >82.5–98.0 µm
  - API 200: >69.0–82.5 µm
  - API 230: >58–69 µm
  - API 325: >41.5–49 µm
- Source: API 13C work-group table (secondary copy). A D100 of 114.88 µm classifies as API 140.
- API says the number labels separation potential under test conditions. It does not predict field performance.

**Cut point:**
- A screen's effective cut is about its D100.
- With common API 140–230 screens, shakers remove solids larger than roughly 60–110 µm.
- "Above about 75 µm" (API 200) is a common teaching figure. **[R]**

**Gumbo:** Sticky clay "gumbo" may need a gumbo remover (scalping conveyor/shaker) ahead of the shakers in some areas. **[V]** This is optional and regional.

### 7.2 Degasser vs mud-gas separator (MGS)

**Vacuum degasser [V]:**
- A vessel under vacuum. Mud spreads in thin films over internal baffles, gas bubbles expand and break out, and the vacuum pump removes the gas.
- An eductor (jet) driven by a centrifugal pump pulls the mud through.
- This is **routine mud treatment** for entrained (dispersed) gas.
- SLB glossary: "A device that removes air or gases (methane, H2S, CO2, and others) from drilling liquids."

**Mud-gas separator / "poor-boy degasser" / gas buster [V]:**
- An atmospheric vessel fed from the **choke manifold** during **well-control** operations, when circulating out a kick.
- Free gas is vented through a tall vent line, away from the rig and to a flare. The mud drops back to the shakers/tanks.
- SLB glossary describes it as larger-capacity than a degasser and venting to a flare.
- **It belongs to the well-control system (see EP04), not routine solids control.**

### 7.3 Desander (hydrocyclone)

**What it is:** A bank of conical hydrocyclones fed by a centrifugal pump. **[V]**

**How it works:**
- Mud enters tangentially and spins.
- Heavier and coarser solids go to the wall and out of the bottom **apex** as underflow, which is discarded.
- Cleaned mud goes out of the top **overflow**.
- Feed head about 75 ft is the common design point. **[T]**

**Typical numbers [R]:**
- **Cone size:** 10–12 in cones are common; the range is 6–12 in.
- **D50 cut point:** about **40–50 µm**. Wikipedia and GlobalSpec give a 10-in cone, about 500 gpm, D50 40–50 µm. A training deck gives 40–45 µm. A broader quoted range is 45–74 µm.
- **Sizing:** about 110–125 % of the circulating rate.

### 7.4 Desilter

**What it is:** The same principle as the desander, with smaller cones. **[V]**

**Typical numbers [R]:**
- **Cone size:** **4 in** is typical; the range is 2–5 in. Many cones are on one manifold.
- **D50 cut point:** about **15–25 µm**. Wikipedia and GlobalSpec give a 4-in cone, about 60 gpm, D50 15–20 µm. A training deck gives 20–25 µm.

**Weighted muds:** Hydrocyclones discard barite, because API barite is mostly in the silt range. API 13A allows max 3 % above 75 µm and max 30 % below 6 µm. **[T]** So on weighted mud, plain desanders and desilters are normally shut off or replaced by a mud cleaner.

### 7.5 Mud cleaner

SLB glossary: "A desilter unit in which the underflow is further processed by a fine vibrating screen, mounted directly under the cones." **[V]**
- Barite and liquid pass through the fine screen and are returned to the system.
- Coarse drilled solids are discarded.
- It is used for weighted water-based mud and for OBM/SBM.

### 7.6 Decanting centrifuge

**What it is:** A horizontal rotating bowl with an internal screw conveyor. It turns at a slightly different speed from the bowl and scrolls the settled solids to the discharge end. **[V]**

**Two jobs:**
1. **Weighted mud: barite recovery.**
   - Run at low G, about 500–800 G (OGJ: about 650 G).
   - The heavy underflow, which is mostly barite, is **returned** to the system.
   - The liquid overflow, carrying fine/colloidal low-gravity solids, is **discarded** or sent to a second high-speed unit.
   - Cut is about 4–7 µm (patent literature).
   - OEM claim: up to about 95 % barite recovery (SLB 414).
2. **Unweighted mud: low-gravity-solids removal.**
   - Run at high G.
   - The solids underflow is **discarded** and the clean liquid is returned.
   - Example: SLB CD-500 HV, 3,200 rpm, 2,656 G.
   - Field units commonly run about 1,500–3,000 G, cutting about 2–5 µm. **[R]**

**Common mistakes to avoid:**
- Calling the screen number "mesh."
- "Desilter before desander."
- "MGS = degasser for normal drilling."
- "Centrifuge throws away the barite." In barite recovery it keeps the barite.
- "Hydrocyclones are fine on heavy mud." They waste barite unless a mud cleaner is used.

---

## 8. Monitoring

**Driller's and mud-logger's real-time parameters [V]:**

| Parameter | What it tells you |
|---|---|
| **SPP** (standpipe pressure) | A slow decline at constant SPM suggests a washout or pump problem. A sudden rise suggests plugged nozzles or packing-off. |
| **SPM / strokes** per pump | Flow in (gpm), from strokes × output × efficiency. Cumulative strokes are used for bottoms-up and displacement. |
| **Flow in vs flow out** | Flow out from the paddle, flow in from strokes. This is the earliest kick/loss signal. |
| **Pit volume** (PVT, per-tank and total) | Gain (kick) or loss (lost circulation), with alarms. |
| **Trip tank volume** | Used while tripping. |
| **Gas** (mud-logging) | Measured at the possum belly. |

**Mud properties checked by the mud engineer** (procedures in API RP 13B-1 for WBM and 13B-2 for OBM) **[V]**:

| Test | Instrument | Notes |
|---|---|---|
| Density | **Mud balance**, ppg / SG; pressurized balance for gas-cut mud | Calibrated with water = 8.33–8.34 ppg. |
| Funnel viscosity | **Marsh funnel**, s/qt | Fresh water = 26 ± 0.5 s per quart (946 mL) at 70 °F. A quick trend check, not a true viscosity. |
| Rheology | **Rotational viscometer (rheometer)** | 600/300/200/100/6/3 rpm readings give PV, YP and gels. |
| Filtration | **API filter press** (100 psi, 30 min, filtrate in mL) | HPHT filter press for OBM/hot wells. |
| Sand content | Sand-content kit with a 200-mesh (74 µm) screen | % by volume. |
| Solids / water / oil | **Retort**, % by volume | |
| Other | pH, alkalinity, chlorides, hardness, MBT | |

**Typical frequency [R/U, common practice, not a standard]:**
- Mud weight and funnel viscosity in and out: every **15–30 minutes** while drilling, by the derrickman or mud hand.
- A full API mud check by the mud engineer: at least **once or twice per 24 h**, usually reported daily. More often when properties are changing.

**Common mistakes to avoid:**
- "Marsh funnel measures viscosity in cP." It gives seconds per quart.
- "PVT detects kicks instantly." Flow-out responds first.

---

## 9. Glossary (35 terms)

Pronunciation column = what TTS should read (Thai rig-crew usage). Terms marked **(spell)** are acronyms read letter by letter.

| # | English | Thai explanation (one line) | Pronunciation for TTS |
|---|---|---|---|
| 1 | Circulating System | ระบบหมุนเวียนน้ำโคลนจากถังลงหลุมแล้วกลับขึ้นมา | เซอร์คิวเลติ้ง ซิสเต็ม |
| 2 | Drilling Mud | ของไหลที่ใช้เจาะ พาเศษหินขึ้นและคุมแรงดันหลุม | ดริลลิ่งมัด / น้ำโคลน |
| 3 | Mud Pump | ปั๊มลูกสูบแรงดันสูงที่ส่งโคลนลงหลุม | มัดปั๊ม |
| 4 | Triplex Pump | ปั๊มสามลูกสูบ อัดทางเดียว | ทริปเพล็กซ์ปั๊ม |
| 5 | Liner | ปลอกกระบอกสูบที่เปลี่ยนขนาดได้ | ไลเนอร์ |
| 6 | Piston | ลูกสูบที่ดันโคลนในไลเนอร์ | พิสตั้น |
| 7 | Valve and Seat | ลิ้นกันกลับและบ่าวาล์วในหัวปั๊ม | วาล์ว แอนด์ ซีท |
| 8 | Charge Pump | ปั๊มหอยโข่งที่ป้อนโคลนเข้าปั๊มใหญ่ | ชาร์จปั๊ม |
| 9 | Pulsation Dampener | ถังอัดไนโตรเจนลดการกระชากของแรงดัน | พัลเซชั่น แดมเปนเนอร์ |
| 10 | Pop-off Valve | วาล์วระบายแรงดันเกินของปั๊ม | ป๊อปออฟวาล์ว |
| 11 | SPM (Strokes per Minute) **(spell)** | จำนวนช่วงชักต่อนาที | เอส-พี-เอ็ม |
| 12 | SPP (Standpipe Pressure) **(spell)** | แรงดันที่สแตนด์ไปป์ ดูบนจอของดริลเลอร์ | เอส-พี-พี |
| 13 | GPM **(spell)** | อัตราไหล แกลลอนต่อนาที | จี-พี-เอ็ม |
| 14 | Standpipe Manifold | ชุดวาล์วแยกทางโคลนแรงดันสูงบนพื้นแท่น | สแตนด์ไปป์ แมนิโฟลด์ |
| 15 | Standpipe | ท่อเหล็กแนวตั้งส่งโคลนขึ้นเสาแท่น | สแตนด์ไปป์ |
| 16 | Rotary / Kelly Hose | สายยางแรงดันสูงจากสแตนด์ไปป์ไปท็อปไดรฟ์ | โรตารี่โฮส / เคลลี่โฮส |
| 17 | Gooseneck | ท่อโค้งคอห่านบนท็อปไดรฟ์ | กูสเน็ค |
| 18 | Washpipe | ซีลหมุนระหว่างกูสเน็คกับเพลาที่หมุน | วอชไปป์ |
| 19 | Nozzle | หัวฉีดที่ดอกสว่าน ทำให้โคลนพุ่งแรง | นอซเซิล |
| 20 | TFA **(spell)** | พื้นที่หน้าตัดรวมของหัวฉีด | ที-เอฟ-เอ |
| 21 | Annulus | ช่องว่างวงแหวนระหว่างก้านเจาะกับผนังหลุม | แอนนูลัส |
| 22 | Bell Nipple | ท่อบนสุดของ BOP ที่โคลนไหลออกสู่โฟลว์ไลน์ | เบลนิปเปิ้ล |
| 23 | Flowline | รางหรือท่อลาดเอียงพาโคลนไปเชลเชคเกอร์ | โฟลว์ไลน์ |
| 24 | Possum Belly | กล่องรับโคลนหน้าเชลเชคเกอร์ | พอสซั่มเบลลี่ |
| 25 | Shale Shaker | ตะแกรงสั่นแยกเศษหินออกจากโคลน | เชลเชคเกอร์ |
| 26 | Degasser | เครื่องดูดแก๊สออกจากโคลนด้วยสุญญากาศ | ดีแก๊สเซอร์ |
| 27 | Mud Gas Separator / MGS **(spell acronym)** | ถังแยกแก๊สใช้ตอนควบคุมหลุม (คิก) | มัดแก๊ส เซพพาเรเตอร์ / เอ็ม-จี-เอส |
| 28 | Desander | ไฮโดรไซโคลนกรวยใหญ่ แยกทราย | ดีแซนเดอร์ |
| 29 | Desilter | ไฮโดรไซโคลนกรวยเล็ก แยกตะกอนละเอียด | ดีซิลเตอร์ |
| 30 | Hydrocyclone | กรวยหมุนวนแยกของแข็งด้วยแรงเหวี่ยง | ไฮโดรไซโคลน |
| 31 | Mud Cleaner | ดีซิลเตอร์ที่มีตะแกรงละเอียดรองข้างใต้ | มัดคลีนเนอร์ |
| 32 | Centrifuge | เครื่องเหวี่ยงความเร็วสูง แยกของแข็งละเอียดหรือเก็บแบไรต์ | เซ็นตริฟิวจ์ |
| 33 | Barite | ผงแร่หนักใช้เพิ่มน้ำหนักโคลน | แบไรต์ |
| 34 | Active / Trip / Pill Tank | ถังโคลนที่หมุนเวียน / ถังวัดตอนถอนท่อ / ถังผสมเฉพาะกิจ | แอคทีฟแท้งค์ / ทริปแท้งค์ / พิลแท้งค์ |
| 35 | PVT (Pit Volume Totalizer) **(spell)** | ระบบรวมปริมาตรโคลนในถัง แจ้งเตือนเพิ่ม/ลด | พี-วี-ที |

Other acronyms to spell letter by letter: BOP = บี-โอ-พี, ECD = อี-ซี-ดี, API = เอ-พี-ไอ, OBM = โอ-บี-เอ็ม, LGS = แอล-จี-เอส. Write "ppg" as พี-พี-จี, or say "ปอนด์ต่อแกลลอน".

---

## 10. Facts safe to state on screen

1. The **1,600 hp** NOV FB-1600 / 12-P-160 triplex pumps are rated at **120 strokes per minute** with a **12-inch stroke**. — NOV FB/FC-1600 brochure; NOV 12-P-160 spec sheet
2. The standard mud-pump fluid end is rated **5,000 psi**. An optional **7,500 psi** fluid end exists. — NOV 12-P-160 spec sheet
3. A triplex pump has **three single-acting pistons**. A duplex has **two double-acting pistons**. — drilling formula references; Wikipedia "Mud pump"
4. Triplex output = **0.000243 × liner² × stroke** (bbl/stroke, inches). — drillingformulas.com; vCalc
5. A **6-in liner × 12-in stroke** pumps about **0.105 bbl (4.41 gal) per stroke**, which is about **441 gpm at 100 SPM**. — NOV FB-1600 table
6. A smaller liner means more pressure and less flow. On the FC-1600: 7-in liner = 3,429 psi and 720 gpm; 4½-in liner = 7,500 psi and 297 gpm (at 120 SPM). — NOV FB/FC-1600 brochure
7. Pulsation dampeners are pre-charged with **nitrogen**. — OEM/patent literature on gas-charged dampeners
8. Solids control works **coarse → fine**: shakers → (degasser) → desander → desilter → centrifuge. — *Drilling Fluids Processing Handbook*; Wikipedia "Desander"
9. Typical linear-motion shakers run about **4–7 G**. — Drilling Contractor 2007; Derrick FLC 2000 notice
10. API RP 13C labels screens by **D100** (largest particle passing). **API 200 ≈ 69–82.5 µm.** It is not a mesh count. — API 13C work-group table; World Oil 2006
11. A **10-inch desander cone** handles about **500 gpm** and has a D50 cut of about **40–50 µm**. — Wikipedia "Desander"; GlobalSpec
12. A **4-inch desilter cone** handles about **60 gpm** and has a D50 cut of about **15–20 µm**. — Wikipedia "Desander"; GlobalSpec
13. A **mud cleaner** is a desilter with a fine vibrating screen under its cones, used to save barite and base fluid. — SLB Energy Glossary
14. Barite-recovery centrifuges run at low G, around **650 G**. — Oil & Gas Journal
15. A high-speed drilling centrifuge such as the SLB CD-500 HV spins at **3,200 rpm, about 2,650 G**. — SLB product data
16. Centrifuges can recover up to about **95 %** of barite from weighted mud. — SLB 414 product page; US patent literature
17. The **vacuum degasser** comes before the hydrocyclones, because gas-cut mud makes their centrifugal feed pumps lose efficiency. — IADC-based degasser training chapter; Elgin catalog
18. The **mud-gas separator ("poor-boy")** is well-control equipment fed from the choke manifold. It is not routine solids control. — SLB Energy Glossary; Wikipedia "Mud Gas Separator"
19. A **Marsh funnel** passes 1 quart of fresh water in **26 seconds** (±0.5 s) at 70 °F. — Wikipedia / SLB glossary "Marsh funnel"; API RP 13B-1
20. Fresh water weighs **8.33 ppg** (SG 1.0), the calibration point of the mud balance. — Halliburton Baroid / API RP 13B-1 practice
21. Roughly **half to two-thirds of pump pressure** is designed to be used at the bit: ~65 % for maximum hydraulic horsepower, ~48 % for maximum impact force. — *Applied Drilling Engineering* (SPE)
22. Hole-cleaning annular velocity is typically about **100–200 ft/min**, and about **180–200 ft/min** or more in wells deviated more than 10°. — PetroWiki "Hole cleaning"
23. A rise in **flow out** with unchanged pump strokes is the earliest surface sign of a kick, before the pits show a gain. — IWCF trip-tank/PVT notes; kick-detection literature
24. The **PVT** adds up all the individual pit level sensors into one total volume, with gain/loss alarms. — IWCF glossary (API STD 53)

---

## Sources

- NOV, *FB-1600 and FC-1600 Triplex Mud Pumps* brochure: https://assets.nov.com/NCP4N68N/at/tjr66psg8bjn2xkfm3qxxsnv/23-RT-RE-1473-Triplex_Mud_Pump-BRCH_WEB.pdf
- NOV, *12-P-160 Triplex Mud Pump* spec sheet: https://assets.nov.com/NCP4N68N/at/6rt96ptxvfxb7rb3ct5mwsg/12P160_Triplex_Mud_Pump_Spec_Sheet.pdf
- NOV 14-P-220 product listing: https://www.nov.com/products/mud-pumps-fluid-mixing-and-processing-systems
- World Oil / OSTI, "Know your triplex mud pump": https://www.osti.gov/biblio/5213417
- Pump output formulas: https://www.drillingformulas.com/pump-output-calculation-for-duplex-pump-and-triplex-pump/ ; https://vcalc.com/wiki/triplex-pump-output
- Drilling Contractor (2007), "Shale shaker makers push advances…": https://drillingcontractor.org/solids-control-shale-shaker-makers-push-advances-in-power-efficiency-automation-1351
- Derrick Super G motor notice: https://www.oilandgasonline.com/doc/derrick-super-g-motor-0001
- API RP 13C summaries: https://www.worldoil.com/magazine/2006/august-2006/features/new-api-labeling-describes-shale-shaker-screens ; https://www.scribd.com/document/493574886/API-13C-Work-Group-v15 ; https://www.aipusolidscontrol.com/?p=2199
- ASME Shale Shaker Committee, *Drilling Fluids Processing Handbook* (Elsevier, 2005), chapters on hydrocyclones and centrifuges (GlobalSpec previews)
- Wikipedia "Desander", "Solids control", "Mud Gas Separator", "Marsh funnel" (secondary)
- GlobalSpec desanders/desilters: https://www.globalspec.com/learnmore/specialized_industrial_products/mining_equipment/desanders_desilters
- SLB Energy Glossary: "mud cleaner", "degasser", "Marsh funnel" (glossary.slb.com)
- SLB 414 and CD-500 HV centrifuge product pages; OGJ "Dewatering cuts drilling mud and disposal costs"
- Elgin vacuum degasser catalog (DirectIndustry); US 4411673
- IWCF glossary "Pit volume totaliser (PVT)" (citing API STD 53); OpenExamPrep IWCF L3 trip tanks/PVT notes
- SLB FLAG HD flow sensor sheet; EP0437872 (paddle accuracy)
- PetroWiki "Hole cleaning" and "Drill bit hydraulics" (search excerpts; pages now behind OnePetro)
- Bourgoyne, Millheim, Chenevert & Young, *Applied Drilling Engineering*, SPE Textbook Series Vol. 2 (1986) **[T]**
- API RP 13B-1 / 13B-2 scope (GlobalSpec standards listing); API Spec 13A (barite) **[T]**
- API Spec 7K purchasing guideline (api.org); Gates Grade D/E rotary hose datasheets

## Items NOT verified (avoid on screen or present as "approximately")

- Tank volumes for this rig class.
- Charge-pump pressure.
- Pulsation dampener precharge percentage.
- Flowline slope.
- Jet-velocity range.
- Rotary hose ID.
- Exact mud-check frequency (company/contract-specific).
- Exact centrifuge G range for LGS removal (varies by model).
