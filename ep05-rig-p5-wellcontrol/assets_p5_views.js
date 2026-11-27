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
