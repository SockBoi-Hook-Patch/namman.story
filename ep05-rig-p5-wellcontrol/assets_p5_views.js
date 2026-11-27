// Preview views for assets_p5_demo.html: { name: { build(P5, THREE) -> Group, floor, views: [{ cam, look, fov, key, p(asset), note }] } }
export const CFG = {
  stack: {
    build: P => P.bopStack(), floor: 0,
    views: [
      { cam: [6.2, 3.6, 9.4], look: [0, 2.9, 0], fov: 38, note: 'full stack', p: a => { a.api.setCut(0); } },
      { cam: [4.4, 4.6, 6.0], look: [0, 4.2, 0], fov: 32, note: 'annular + double ram', p: a => { a.api.setCut(0); } },
      { cam: [2.6, 2.4, 6.5], look: [0, 2.9, 0], fov: 40, note: 'half-section', p: a => { a.api.setCut(1); a.api.setAnnular(0.0); a.api.setUpperRam(0); a.api.setBSR(0); } },
      { cam: [2.2, 2.6, 5.2], look: [0, 3.0, 0], fov: 38, note: 'section, closed', p: a => { a.api.setCut(1); a.api.setAnnular(1); a.api.setUpperRam(1); a.api.setLowerRam(1); a.api.setBSR(0); } },
      { cam: [3.4, 2.3, 2.6], look: [1.0, 1.9, 0], fov: 36, note: 'choke side valves', p: a => { a.api.setCut(0); a.api.setChokeHCR(1); } },
    ],
  },
};
CFG.annular = {
  build: P => P.annularPreventer(), floor: 0,
  views: [
    { cam: [2.3, 1.9, 3.0], look: [0, 0.62, 0], fov: 36, note: 'exterior', p: a => { a.api.setCut(0); a.api.setTarget('pipe'); a.api.setClose(0); } },
    { cam: [0.0, 0.7, 4.6], look: [0, 0.66, 0], fov: 33, note: 'elevation open', p: a => { a.api.setCut(1); a.api.setTarget('pipe'); a.api.setClose(0); } },
    { cam: [0.0, 0.7, 4.6], look: [0, 0.66, 0], fov: 33, note: 'elevation closed', p: a => { a.api.setCut(1); a.api.setTarget('pipe'); a.api.setClose(1); } },
    { cam: [0.9, 1.15, 2.6], look: [0, 0.68, 0], fov: 34, note: 'section open', p: a => { a.api.setCut(1); a.api.setTarget('pipe'); a.api.setClose(0); } },
    { cam: [0.9, 1.15, 2.6], look: [0, 0.68, 0], fov: 34, note: 'closed on 5in pipe', p: a => { a.api.setCut(1); a.api.setTarget('pipe'); a.api.setClose(1); } },
    { cam: [0.7, 1.6, 2.0], look: [0, 0.72, 0], fov: 34, note: 'closed on hex', p: a => { a.api.setCut(1); a.api.setTarget('hex'); a.api.setClose(1); } },
    { cam: [0.7, 1.6, 2.0], look: [0, 0.72, 0], fov: 34, note: 'open hole', p: a => { a.api.setCut(1); a.api.setTarget('open'); a.api.setClose(1); } },
    { cam: [0.9, 1.15, 2.6], look: [0, 0.68, 0], fov: 34, note: 'stripping tool joint', p: a => { a.api.setCut(1); a.api.setTarget('pipe'); a.api.setPropY(0.66); a.api.setClose(0.8); } },
  ],
};
CFG.doubleRam = {
  build: P => P.ramPreventer({ cavities: ['bsr', 'vbr'], floorY: -0.3 }), floor: -0.3,
  views: [
    { cam: [3.4, 2.2, 4.2], look: [0, 0.8, 0], fov: 38, note: 'exterior', p: a => { a.api.setCut(0); a.api.setClose(1, 0); a.api.setShear(0); } },
    { cam: [0.0, 0.9, 3.6], look: [0, 0.85, 0], fov: 40, note: 'section open', p: a => { a.api.setCut(1); a.api.setClose(1, 0); a.api.setShear(0); } },
    { cam: [0.6, 1.7, 2.0], look: [0, 1.12, 0], fov: 38, note: 'VBR closed + locked', p: a => { a.api.setCut(1); a.api.setClose(1, 1); a.api.setLock(1, 1); a.api.setShear(0); } },
    { cam: [0.7, 0.75, 1.5], look: [0, 0.6, 0], fov: 38, note: 'BSR crushing', p: a => { a.api.setCut(1); a.api.setClose(1, 0); a.api.setShear(0.5); } },
    { cam: [0.7, 0.75, 1.5], look: [0, 0.6, 0], fov: 38, note: 'BSR cut + sealed', p: a => { a.api.setCut(1); a.api.setShear(1); } },
  ],
};
CFG.accumulator = {
  build: P => P.accumulatorUnit(), floor: 0,
  views: [
    { cam: [4.2, 2.9, 6.2], look: [0, 0.9, 0], fov: 38, note: 'unit', p: a => { a.api.setBottleCut(0); } },
    { cam: [1.2, 1.9, 2.4], look: [0, 1.4, 0.3], fov: 36, note: 'manifold + gauges', p: a => { a.api.setBottleCut(0); a.api.setValve(2, 0); a.api.setPumpLamp(1); } },
    { cam: [-1.6, 1.2, 2.3], look: [-2.3, 0.95, 0.57], fov: 34, note: 'bottle cut, precharge', p: a => { a.api.setBottleCut(1); a.api.setCharge(0); a.api.setPsi(0, 1000); } },
    { cam: [-1.6, 1.2, 2.3], look: [-2.3, 0.95, 0.57], fov: 34, note: 'bottle cut, 3000 psi', p: a => { a.api.setBottleCut(1); a.api.setCharge(1); a.api.setPsi(0, 3000); } },
  ],
};
CFG.drillerPanel = {
  build: P => P.drillerPanel(), floor: 0,
  views: [
    { cam: [0.9, 1.7, 1.6], look: [0, 1.38, 0], fov: 36, note: 'panel', p: a => { a.api.setGuard(0); } },
    { cam: [0.25, 1.45, 0.9], look: [0.05, 1.33, 0.1], fov: 34, note: 'BSR guard open, master held', p: a => { a.api.setGuard(1); a.api.setPress('master', 1); a.api.setPress('blindShear.close', 1); a.api.setLamp('blindShear.close', 1); a.api.setLamp('blindShear.open', 0); } },
  ],
};
CFG.chokePanel = {
  build: P => P.chokePanel(), floor: 0,
  views: [
    { cam: [0.8, 1.7, 1.6], look: [0, 1.36, 0], fov: 36, note: 'panel', p: a => { a.api.setDP(0.32); a.api.setCasing(0.45); a.api.setChokePos(0.35); a.api.setCounter(30, 1250); a.api.setLever(1); a.api.setPumpLamp(1); } },
  ],
};
CFG.chokeManifold = {
  build: P => P.chokeManifold(), floor: -0.25,
  views: [
    { cam: [3.4, 3.4, 5.2], look: [0, 0.6, 0], fov: 40, note: 'manifold', p: a => { a.api.setChokeCut(0); } },
    { cam: [0.9, 1.3, 0.3], look: [-0.1, 0.85, -0.86], fov: 34, note: 'choke A trim cut-away', p: a => { a.api.setChokeCut(1); a.api.setChokeA(0.3); } },
  ],
};
CFG.mgs = {
  build: P => P.mudGasSeparator(), floor: 0,
  views: [
    { cam: [7.5, 6.0, 12.5], look: [0, 5.5, 0], fov: 42, note: 'MGS + vent', p: a => { a.api.setCut(0); } },
    { cam: [2.2, 3.4, 6.4], look: [0, 3.0, 0.6], fov: 40, note: 'cut-away', p: a => { a.api.setCut(1); a.api.setLevel(0.8); } },
  ],
};
CFG.tripTank = {
  build: P => P.tripTank(), floor: 0,
  views: [
    { cam: [3.4, 2.6, 4.6], look: [-0.2, 1.8, 0], fov: 40, note: 'trip tank', p: a => { a.api.setCut(0); a.api.setLevel(0.6); } },
    { cam: [1.6, 2.2, 3.6], look: [0, 1.9, 0], fov: 40, note: 'cut, level 0.35', p: a => { a.api.setCut(1); a.api.setLevel(0.35); } },
  ],
};
