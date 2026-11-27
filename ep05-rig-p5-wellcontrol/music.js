/* music.js — original synthesized score + SFX for namman.story EP05 "Drilling Rig 101 — Part 5/5: Well Control System", 183.6 s.
 * Classic browser script. Defines window.Score.renderWav(duration, cues) -> Promise<Uint8Array>
 * (16-bit PCM WAV, 48 kHz, stereo, exactly `duration` seconds), rendered with OfflineAudioContext.
 * Same synth engine / SFX / mix chain as EP01–EP05 Part 4 for a consistent channel sound; new arrangement.
 * Fully deterministic: one seeded PRNG (mulberry32), no Math.random / Date; same (duration, cues) -> same bytes.
 *
 * PART 5 MOOD: "a heavy steel door closing" — tense but controlled, never disaster drama. Purple Well Control world =
 *   E minor colours (Em(add9) · C · Am · B7sus · G · D) at 72 BPM (beat 0.833 s, bar 3.33 s) over a weighty low
 *   'thump' pulse (sub sine + 150 Hz body). The P4 teaser figure B–E–F#–G (minor) is the Well Control motif; it
 *   resolves to major (G#) on the title and at the finale.
 * Sections: 0–6.2 title (P4 teaser figure resolved in E major) · 6.2–16.6 barriers, pulse-less tension · 16.6 pulse
 *   enters (72 BPM) · 20.2–36.8 the lift down the stack (descending low steps) · 36.8–63.3 mechanisms (machine
 *   ostinato) · 63.7–77.6 awe: strings swell, low end thickens, sub thump 68.3, DRY accent on the shear 73.6
 *   · 77.6–91.9 the command (low motif) and the bottles: QUIET TENSION (thin pulse, gauge ticks, tremolo pad)
 *   · 91.9 power-off: the bed winds down like a dying motor -> near-silence 92.0–94.95 (sub drone only)
 *   · 95.0 the pulse returns, warm (Cmaj7) · 98.2–139.6 flowing triplet arpeggio that travels L->R with the gas path,
 *   warm swell at the flare 123.4 · 139.6–166.1 light and tidy; ticking motif under testing 159.2–166.1
 *   · 166.1–172.4 SERIES FINALE in E major: five rising notes B4 E5 F#5 G#5 B5 (the series signature + 5th) land on
 *   the five systems, each wrapped in a quote of that Part's motif: 167.4 Power (P1 16th 'current' line),
 *   168.1 Hoisting (P2 climbing travel arpeggio), 168.9 Rotating (P3 circling rotation figure), 169.6 Circulating
 *   (P4 'one drop' plink + journey wave), 170.9 Well Control (P5 thump + full E-major stab) · 172.4–177.4 CTA, light
 *   · 177.4–183.6 teaser (Casing & Cementing, grey): thin layered pads; fade from 182.0, silent by END-0.5.
 * VOICE SPACE: VO (script.json, 28 lines, mixed later by tools/mix_vo.py) runs almost wall to wall. Under VO the
 *   melodic bed stays below ~1.3 kHz, ticks sit above 8 kHz, bells only in the 0.3 s line gaps, and a broad
 *   peaking cut (-4.5 dB @ 2.4 kHz, Q 0.6) on the music bus is automated on inside every VO window (VO table below).
 * MASTER: loudness-normalised in JS to -20 LUFS integrated (BS.1770 K-weighting + gating), capped so the 4x-oversampled
 *   true peak stays <= -1.5 dBTP. 20 ms end fade.
 *
 * ---------------- CUES ----------------
 * cues = [{ t: seconds, sfx: name, ...params }]. Unknown names, non-numeric t, or t outside [0, duration) are ignored
 * silently. Every cue also ducks the music briefly (per-name depth). Common optional params for ANY cue:
 *   vol  (number, default 1, clamped 0..2)  — level multiplier for that one cue ('soft clunk' -> vol: 0.5)
 *   pan  (number -1..1)                      — extra stereo placement for that one cue
 * SUPPORTED SFX NAMES (≈ length):
 *   Series set (EP01–P4):
 *   whoosh (0.8 s) · alarm (1.5) · clunk (0.6) · impact (2.0) · hiss (1.2) · fire (2.0) · pump (1.5, 3 strokes)
 *   success (1.0) · blip (0.15) · bubble (0.8) · engine (3.3) · zap (1.0)
 *   winch (3.0; {dir:'down'} = falling/braking) · chain (0.6) · spin (2.0; {dir:'down'} = spin-down)
 *   torque (0.8) · flow (1.5; {dir:'down'} sweeps down) · pulse (0.5) · vibe (2.0) · swirl (2.0)
 *   NEW in Part 5:
 *   hydraulic {dur=0.9}   ram close: fluid rush + high-pressure hiss + ram groan for `dur` s, then a heavy steel clunk
 *                         at the mechanical stop (t+dur) and a short bleed. Place t = start of ram travel.
 *   rubber    {dur=1.2}   annular squeeze: stick-slip rubber creak that tightens (rate/pitch rise) + low squish.
 *   shear     {pre=0.35}  blind-shear cut: strain groan + hiss for `pre` s, then crunch/tear, deep impact and a long
 *                         metallic ring (~2.6 s). The cut lands at t+pre.
 *   powerdown {pre=0.4, dur=2.2}  rig power off: generator hum audible `pre` s BEFORE t, breaker clack + hum cut at t,
 *                         then the generator/motor winds down (pitch + whine fall) over `dur` s.
 *   ratchet   {dur=1.2, rate=9}   handwheel / ratchet wrench: pawl clicks at `rate`/s, grouped (hand re-grips).
 *   tick      {n=1, rate=2}       gauge / timer / chart-recorder tick; n ticks at `rate`/s (tick-tock alternation).
 *   valve     {open=false}        gate valve thunk (muffled heavy seat); open:true adds a short fluid whoomph after.
 *   gas       {dur=2.5, vent=true} gas bubbling up through mud; vent:true crossfades into a turbulent vent roar.
 *   flare     {dur=3.0}           soft, steady flare roar (low, warm, gentle flicker; softer than 'fire').
 * --------------------------------------
 * "namman.story" SIGNATURE MOTIF (series-wide, scale degrees 5-1-2-3, rhythm 8th-8th-8th-long):
 *   B4 E5 F#5 G#5 (71 76 78 80) — resolved (from the P4 minor teaser) at 0.05 s; extended to 5 notes at the recap.
 */
(function () {
  'use strict';

  var SR = 48000;

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function mtof(m) { return 440 * Math.pow(2, (m - 69) / 12); }

  // Chord table (E major world): bass root (MIDI), pad voicing, arpeggio tones.
  var CH = {
    E:      { b: 40, pad: [52, 59, 64, 68],     arp: [64, 68, 71, 76] },
    Eadd9:  { b: 40, pad: [52, 59, 64, 66, 68], arp: [64, 66, 68, 71] },
    EG:     { b: 44, pad: [52, 59, 64, 68],     arp: [64, 68, 71, 76] }, // E/G#
    A:      { b: 45, pad: [57, 61, 64, 69],     arp: [61, 64, 69, 73] },
    Amaj7:  { b: 45, pad: [56, 61, 64, 69],     arp: [61, 64, 68, 73] },
    B:      { b: 47, pad: [54, 59, 63, 66],     arp: [63, 66, 71, 75] },
    BD:     { b: 39, pad: [54, 59, 63, 66],     arp: [63, 66, 71, 75] }, // B/D#
    Bsus4:  { b: 47, pad: [52, 59, 64, 66],     arp: [64, 66, 71, 76] },
    Csm7:   { b: 37, pad: [52, 56, 59, 61],     arp: [61, 64, 68, 71] },
    Fsm7:   { b: 42, pad: [52, 57, 61, 66],     arp: [61, 64, 66, 69] },
    C:      { b: 36, pad: [52, 55, 60, 64],     arp: [60, 64, 67, 72] }, // bVI (heroic lift)
    D:      { b: 38, pad: [54, 57, 62, 66],     arp: [62, 66, 69, 74] }  // bVII
  };
  // Series signature motif ("nam-man-sto-ry"): degrees 5-1-2-3 of E major.
  var SIG_MAJ = [71, 76, 78, 80];
  var DURATION = 183.6;

  function renderWav(duration, cues) {
    duration = +duration > 0 ? +duration : DURATION;
    cues = Array.isArray(cues) ? cues : [];
    var len = Math.max(1, Math.round(duration * SR));
    var END = len / SR;
    var ctx = new OfflineAudioContext({ numberOfChannels: 2, length: len, sampleRate: SR });
    var rnd = mulberry32(0xE905A1);

    // ---------- shared buffers ----------
    var noiseBuf = ctx.createBuffer(2, SR * 3, SR);
    for (var c = 0; c < 2; c++) {
      var nd = noiseBuf.getChannelData(c);
      for (var i = 0; i < nd.length; i++) nd[i] = rnd() * 2 - 1;
    }
    function makeIR(sec, decay) {
      var n = Math.floor(sec * SR), b = ctx.createBuffer(2, n, SR);
      for (var ch = 0; ch < 2; ch++) {
        var d = b.getChannelData(ch), y = 0;
        for (var k = 0; k < n; k++) {
          var t = k / SR;
          var x = (rnd() * 2 - 1) * Math.exp(-t / decay);
          var a = 0.8 * Math.exp(-t / 1.1) + 0.06; // gets darker as it decays
          y += a * (x - y);
          d[k] = t < 0.015 ? 0 : y;
        }
      }
      return b;
    }
    var IR = makeIR(3.2, 0.6);

    // ---------- buses ----------
    var master = ctx.createGain();
    var hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 30; hp.Q.value = 0.7;
    var comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16; comp.knee.value = 10; comp.ratio.value = 3;
    comp.attack.value = 0.008; comp.release.value = 0.25;
    var ls = filt('lowshelf', 160); ls.gain.value = -5;
    var pk = filt('peaking', 2500, 0.8); pk.gain.value = 3;
    master.connect(hp); hp.connect(ls); ls.connect(pk); pk.connect(comp); comp.connect(ctx.destination);
    master.gain.setValueAtTime(1, 0);
    master.gain.setValueAtTime(1, Math.max(0, END - 1.6)); // fade from 182.0 (teaser)
    master.gain.linearRampToValueAtTime(0, Math.max(0.01, END - 0.5)); // last 0.5 s silent

    var musicBus = ctx.createGain();
    var section = ctx.createGain();
    var duck = ctx.createGain();
    // voEq: broad 1–4 kHz cut on the music, automated on inside the VO windows (see VO table in the score)
    var voEq = filt('peaking', 2400, 0.6); voEq.gain.value = 0;
    musicBus.connect(section); section.connect(duck); duck.connect(voEq); voEq.connect(master);
    var quietBus = ctx.createGain(); quietBus.connect(duck); // bypasses the section arc (power-off silence)
    var musicVerbIn = ctx.createGain();
    var musicVerb = ctx.createConvolver(); musicVerb.buffer = IR;
    musicVerbIn.connect(musicVerb); musicVerb.connect(section);

    var sfxBus = ctx.createGain(); sfxBus.gain.value = 1.0; sfxBus.connect(master);
    var sfxVerbIn = ctx.createGain();
    var sfxVerb = ctx.createConvolver(); sfxVerb.buffer = IR;
    sfxVerbIn.connect(sfxVerb); sfxVerb.connect(master);

    // section loudness arc (music only)
    // storyboard 'music level' 2..5 -> gain; 91.9–94.95 power-off near-silence (only quietBus sounds)
    var arc = [[0, 0.82], [13.2, 0.85], [16.6, 0.92], [63.7, 0.95], [70.6, 1.05], [77.6, 0.92], [84.6, 0.86], [91.88, 0.86], [92.05, 0.0],
      [94.9, 0.0], [95.0, 1.0], [98.2, 0.92], [119.2, 1.0], [126.4, 0.92], [139.6, 0.84], [166.0, 0.86], [166.1, 1.12], [172.2, 1.1],
      [172.6, 0.86], [177.4, 0.8], [END, 0.75]];
    section.gain.setValueAtTime(arc[0][1], 0);
    for (var ai = 1; ai < arc.length; ai++) section.gain.linearRampToValueAtTime(arc[ai][1], arc[ai][0]);

    // ---------- helpers ----------
    function outTo(node, o) {
      o = o || {};
      var bus = o.sfx ? (sfxOut || sfxBus) : (o.bus || musicBus);
      var vin = o.sfx ? (sfxVerbOut || sfxVerbIn) : (o.bus ? null : musicVerbIn);
      var n = node;
      if (o.pan) { var p = ctx.createStereoPanner(); p.pan.value = Math.max(-1, Math.min(1, o.pan)); node.connect(p); n = p; }
      n.connect(bus);
      var wet = o.wet == null ? 0.2 : o.wet;
      if (wet > 0 && vin) { var g = ctx.createGain(); g.gain.value = wet; n.connect(g); g.connect(vin); }
      return n;
    }
    var sfxOut = null, sfxVerbOut = null; // per-cue vol/pan stage (set while a cue renders)
    function osc(type, f, t0, t1) {
      var o = ctx.createOscillator(); o.type = type; o.frequency.value = f;
      o.start(t0); o.stop(t1); return o;
    }
    function noise(t, dur) {
      var s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
      s.start(t, rnd() * 2.5); s.stop(t + dur + 0.05); return s;
    }
    function filt(type, f, q) {
      var b = ctx.createBiquadFilter(); b.type = type; b.frequency.value = f; if (q != null) b.Q.value = q; return b;
    }
    function gain(v) { var g = ctx.createGain(); g.gain.value = v == null ? 1 : v; return g; }
    function decayEnv(g, t, vol, dur, att) {
      att = att || 0.003;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(vol, t + att);
      g.gain.exponentialRampToValueAtTime(0.0003, t + dur);
    }
    function ok(t) { return t < END && t >= 0; }

    // ---------- instruments (same engine as EP01–EP03) ----------
    function pad(t0, t1, notes, o) {
      o = o || {};
      if (!ok(t0)) return;
      var vol = 1.3 * (o.vol == null ? 0.1 : o.vol), att = o.att == null ? 0.4 : o.att, rel = o.rel == null ? 0.6 : o.rel;
      var cut0 = o.cut0 || 1200, cut1 = o.cut1 || cut0, det = o.det == null ? 11 : o.det;
      var type = o.type || 'sawtooth', width = o.width == null ? 0.55 : o.width;
      var stop = t1 + rel + 0.05;
      var f = filt('lowpass', cut0, o.q == null ? 0.9 : o.q);
      f.frequency.setValueAtTime(cut0, t0);
      f.frequency.exponentialRampToValueAtTime(cut1, t1 + rel);
      var lfo = osc('sine', o.lfo || 0.13, t0, stop);
      var lg = gain(Math.min(cut0, cut1) * 0.3); lfo.connect(lg); lg.connect(f.frequency);
      var g = gain(0);
      var per = vol / Math.sqrt(notes.length);
      g.gain.setValueAtTime(0, t0);
      g.gain.linearRampToValueAtTime(per, t0 + att);
      g.gain.setValueAtTime(per, Math.max(t0 + att, t1));
      g.gain.linearRampToValueAtTime(0, t1 + rel);
      for (var n = 0; n < notes.length; n++) {
        for (var k = -1; k <= 1; k += 2) {
          var oc = osc(type, mtof(notes[n]), t0, stop);
          oc.detune.value = k * det + (rnd() - 0.5) * 5;
          var p = ctx.createStereoPanner(); p.pan.value = k * width * (0.6 + 0.4 * (n % 2));
          var lv = gain(0.5); oc.connect(lv); lv.connect(p); p.connect(f);
        }
      }
      f.connect(g);
      outTo(g, { wet: o.wet == null ? 0.45 : o.wet });
    }

    function pluck(t, m, o) {
      o = o || {};
      if (!ok(t)) return;
      var vol = 1.45 * (o.vol == null ? 0.08 : o.vol), dur = o.dur || 0.3, cut = o.cut || 1800;
      var fr = mtof(m);
      var f = filt('lowpass', cut, o.q == null ? 2.5 : o.q);
      f.frequency.setValueAtTime(Math.min(cut * 5, 16000), t);
      f.frequency.exponentialRampToValueAtTime(cut, t + 0.1);
      var o1 = osc('sawtooth', fr, t, t + dur + 0.02); o1.detune.value = -7;
      var o2 = osc('square', fr, t, t + dur + 0.02); o2.detune.value = 7;
      var g2 = gain(0.35); o1.connect(f); o2.connect(g2); g2.connect(f);
      var g = gain(0); decayEnv(g, t, vol, dur, 0.004);
      f.connect(g);
      outTo(g, { pan: o.pan || 0, wet: o.wet == null ? 0.3 : o.wet });
    }

    function bell(t, m, vol, o) {
      o = o || {};
      if (!ok(t)) return;
      var dur = o.dur || 1.4, fr = mtof(m), sfx = !!o.sfx;
      var g = gain(0); decayEnv(g, t, vol, dur, 0.004);
      var parts = [[1, 1], [2, 0.35], [3.01, 0.12], [4.2, 0.06]];
      for (var i = 0; i < parts.length; i++) {
        var oc = osc('sine', fr * parts[i][0], t, t + dur + 0.02);
        var pg = gain(parts[i][1]);
        if (i > 0) { pg.gain.setValueAtTime(parts[i][1], t); pg.gain.exponentialRampToValueAtTime(0.0005, t + dur * 0.4); }
        oc.connect(pg); pg.connect(g);
      }
      outTo(g, { pan: o.pan || 0, wet: o.wet == null ? 0.5 : o.wet, sfx: sfx });
    }

    function bubble(t, f0, vol, o) {
      o = o || {};
      if (!ok(t)) return;
      var d = o.dur || 0.12;
      var oc = osc('sine', f0, t, t + d + 0.02);
      oc.frequency.setValueAtTime(f0, t);
      oc.frequency.exponentialRampToValueAtTime(f0 * 2.2, t + d);
      var g = gain(0);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0005, t + d);
      oc.connect(g);
      outTo(g, { pan: o.pan || 0, wet: o.wet == null ? 0.5 : o.wet, sfx: !!o.sfx });
    }

    function bass(t, dur, m, o) {
      o = o || {};
      if (!ok(t)) return;
      var vol = o.vol == null ? 0.2 : o.vol, att = o.att || 0.008, rel = o.rel || 0.07;
      var fr = mtof(m), stop = t + dur + rel + 0.02;
      var g = gain(0);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + att);
      g.gain.setValueAtTime(vol, Math.max(t + att, t + dur));
      g.gain.linearRampToValueAtTime(0, t + dur + rel);
      var s = osc('sine', fr, t, stop); var sg = gain(0.55); s.connect(sg); sg.connect(g);
      // harmonics for phone-speaker presence
      var lp = filt('lowpass', o.cut || 650, 1.2);
      var tr = osc(o.drive ? 'sawtooth' : 'triangle', fr * 2, t, stop); tr.detune.value = 4;
      var tg = gain(o.drive ? 0.4 : 0.6); tr.connect(tg); tg.connect(lp); lp.connect(g);
      outTo(g, { wet: 0.04 });
    }

    function kick(t, vol, o) {
      o = o || {};
      if (!ok(t)) return;
      var dec = o.dec || 0.34;
      var oc = osc('sine', o.f0 || 155, t, t + dec + 0.02);
      oc.frequency.setValueAtTime(o.f0 || 155, t);
      oc.frequency.exponentialRampToValueAtTime(o.f1 || 47, t + 0.11);
      var g = gain(0); decayEnv(g, t, vol, dec, 0.002); oc.connect(g);
      var n = noise(t, 0.03), hf = filt('highpass', 2500), ng = gain(0);
      decayEnv(ng, t, vol * 0.3, 0.03, 0.001);
      n.connect(hf); hf.connect(ng); ng.connect(g);
      outTo(g, { wet: o.wet == null ? 0.04 : o.wet });
    }

    function snare(t, vol, o) {
      o = o || {};
      if (!ok(t)) return;
      var dec = o.dec || 0.2;
      var n = noise(t, dec), bp = filt('bandpass', o.f || 2000, 0.7), hpf = filt('highpass', 350);
      var g = gain(0); decayEnv(g, t, vol, dec, 0.002);
      n.connect(bp); bp.connect(hpf); hpf.connect(g);
      var tr = osc('triangle', 200, t, t + 0.12);
      tr.frequency.setValueAtTime(210, t); tr.frequency.exponentialRampToValueAtTime(160, t + 0.08);
      var tg = gain(0); decayEnv(tg, t, vol * 0.7, 0.1, 0.002); tr.connect(tg); tg.connect(g);
      outTo(g, { pan: o.pan || 0, wet: o.wet == null ? 0.22 : o.wet });
    }

    function hat(t, vol, o) {
      o = o || {};
      if (!ok(t)) return;
      var dec = o.open ? 0.22 : (o.dec || 0.045);
      var n = noise(t, dec), hf = filt('highpass', o.f || 7500, 0.8);
      var g = gain(0); decayEnv(g, t, vol, dec, 0.001);
      n.connect(hf); hf.connect(g);
      outTo(g, { pan: o.pan == null ? 0.25 : o.pan, wet: 0.1 });
    }

    function crash(t, vol, o) {
      o = o || {};
      if (!ok(t)) return;
      var dec = o.dec || 1.8;
      var n = noise(t, dec), hf = filt('highpass', 4200, 0.5), sh = filt('peaking', 8000, 1); sh.gain.value = 4;
      var g = gain(0); decayEnv(g, t, vol, dec, 0.002);
      n.connect(hf); hf.connect(sh); sh.connect(g);
      outTo(g, { wet: 0.35, sfx: !!o.sfx });
    }

    function tom(t, f0, vol, o) {
      o = o || {};
      if (!ok(t)) return;
      var dec = o.dec || 0.5;
      var oc = osc('sine', f0, t, t + dec + 0.02);
      oc.frequency.setValueAtTime(f0 * 1.5, t); oc.frequency.exponentialRampToValueAtTime(f0 * 0.75, t + dec);
      var g = gain(0); decayEnv(g, t, vol, dec, 0.002); oc.connect(g);
      var n = noise(t, 0.08), lp = filt('lowpass', 1200), ng = gain(0);
      decayEnv(ng, t, vol * 0.35, 0.08, 0.001); n.connect(lp); lp.connect(ng); ng.connect(g);
      outTo(g, { pan: o.pan || 0, wet: 0.3 });
    }

    function riser(t0, t1, vol, f0, f1, o) {
      o = o || {};
      if (!ok(t0)) return;
      var n = noise(t0, t1 - t0 + 0.1), bp = filt('bandpass', f0, o.q || 2.5);
      bp.frequency.setValueAtTime(f0, t0); bp.frequency.exponentialRampToValueAtTime(f1, t1);
      var g = gain(0);
      g.gain.setValueAtTime(0, t0);
      g.gain.linearRampToValueAtTime(vol * 0.3, t0 + (t1 - t0) * 0.6);
      g.gain.linearRampToValueAtTime(vol, t1 - 0.01);
      g.gain.linearRampToValueAtTime(0, t1 + 0.05);
      n.connect(bp); bp.connect(g);
      outTo(g, { wet: o.wet == null ? 0.5 : o.wet, sfx: !!o.sfx, pan: o.pan || 0 });
    }

    function boom(t, vol, o) {
      o = o || {};
      if (!ok(t)) return;
      var dur = o.dur || 2.0;
      var oc = osc('sine', 75, t, t + dur + 0.02);
      oc.frequency.setValueAtTime(o.f0 || 78, t); oc.frequency.exponentialRampToValueAtTime(o.f1 || 30, t + dur * 0.8);
      var g = gain(0); decayEnv(g, t, vol, dur, 0.004); oc.connect(g);
      // mid body so it reads on phones
      var body = osc('triangle', 110, t, t + 0.6);
      body.frequency.setValueAtTime(140, t); body.frequency.exponentialRampToValueAtTime(55, t + 0.5);
      var bg = gain(0); decayEnv(bg, t, vol * 0.45, 0.55, 0.003); body.connect(bg); bg.connect(g);
      var n = noise(t, dur * 0.7), lp = filt('lowpass', 3000, 0.7), ng = gain(0);
      lp.frequency.setValueAtTime(4000, t); lp.frequency.exponentialRampToValueAtTime(90, t + dur * 0.6);
      decayEnv(ng, t, vol * 0.7, dur * 0.65, 0.003);
      n.connect(lp); lp.connect(ng); ng.connect(g);
      outTo(g, { wet: o.wet == null ? 0.45 : o.wet, sfx: !!o.sfx });
    }

    function drone(t0, t1, notes, vol, o) {
      o = o || {};
      if (!ok(t0)) return;
      var att = o.att || 1.0, rel = o.rel || 1.5, stop = t1 + rel + 0.05;
      var lp = filt('lowpass', o.cut || 400, 1.5);
      lp.frequency.setValueAtTime(o.cut || 400, t0);
      lp.frequency.linearRampToValueAtTime(o.cut1 || o.cut || 400, t1);
      var g = gain(0);
      g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(vol, t0 + att);
      g.gain.setValueAtTime(vol, t1); g.gain.linearRampToValueAtTime(0, t1 + rel);
      var trem = osc('sine', o.trem || 0.5, t0, stop), tg = gain(vol * 0.25);
      trem.connect(tg); tg.connect(g.gain);
      for (var i = 0; i < notes.length; i++) {
        for (var k = -1; k <= 1; k += 2) {
          var oc = osc('sawtooth', mtof(notes[i]), t0, stop); oc.detune.value = k * 9;
          var p = ctx.createStereoPanner(); p.pan.value = k * 0.4;
          oc.connect(p); p.connect(lp);
        }
      }
      lp.connect(g);
      outTo(g, { wet: 0.4, bus: o.bus });
    }

    // extra light percussion for the dry 'land' groove (soft-attack shaker)
    function shaker(t, vol, o) {
      o = o || {};
      if (!ok(t)) return;
      var dec = o.dec || 0.07;
      var n = noise(t, dec + 0.02), bp = filt('bandpass', o.f || 5800, 1.1);
      var g = gain(0);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.018);
      g.gain.exponentialRampToValueAtTime(0.0003, t + dec);
      n.connect(bp); bp.connect(g);
      outTo(g, { pan: o.pan == null ? -0.3 : o.pan, wet: o.wet == null ? 0.06 : o.wet });
    }
    function sig(t0, vol, o) { // the namman.story signature: 8th, 8th, 8th, long
      o = o || {};
      var tr = o.tr || 0, SIG = o.notes || SIG_MAJ;
      for (var i = 0; i < 4; i++) {
        var tt = t0 + i * (o.st || 0.25);
        bell(tt, SIG[i] + tr, vol * (i === 3 ? 1.15 : 1), { dur: i === 3 ? (o.last || 2.4) : 1.0, pan: (i - 1.5) * 0.22, wet: o.wet == null ? 0.6 : o.wet });
        if (!o.noPluck) pluck(tt, SIG[i] + tr - 12, { vol: vol * 0.9, dur: i === 3 ? 0.9 : 0.3, cut: 2600, wet: 0.35, pan: (i - 1.5) * -0.15 });
      }
    }

    var ARP_UP = [0, 1, 2, 3, 2, 1, 2, 3];
    var OST = [0, 2, 1, 2, 0, 2, 3, 2]; // investigative 8th-note ostinato cell
    var s;

    // ---------- shared music voices (from EP03/EP04) ----------
    function pumpStroke(t, v) { // soft triplex-pump pulse (musical, much quieter than the 'pump' SFX)
      if (!ok(t)) return;
      var oc = osc('sine', 96, t, t + 0.27);
      oc.frequency.setValueAtTime(96, t); oc.frequency.exponentialRampToValueAtTime(48, t + 0.16);
      var g = gain(0); decayEnv(g, t, v, 0.25, 0.006); oc.connect(g);
      var n = noise(t, 0.2), lp = filt('lowpass', 320, 1.2), ng = gain(0);
      ng.gain.setValueAtTime(0, t); ng.gain.linearRampToValueAtTime(v * 0.5, t + 0.04);
      ng.gain.exponentialRampToValueAtTime(0.0004, t + 0.2);
      n.connect(lp); lp.connect(ng); ng.connect(g);
      outTo(g, { wet: 0.08 });
    }
    function flow(t0, t1, vol, p0, p1) { // slow filtered-noise swell that travels across the stereo field
      if (!ok(t0)) return;
      var n = noise(t0, t1 - t0 + 0.1), bp = filt('bandpass', 350, 1.4), mid = (t0 + t1) / 2;
      bp.frequency.setValueAtTime(350, t0);
      bp.frequency.exponentialRampToValueAtTime(950, mid);
      bp.frequency.exponentialRampToValueAtTime(350, t1);
      var g = gain(0);
      g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(vol, mid); g.gain.linearRampToValueAtTime(0, t1);
      var pn = ctx.createStereoPanner();
      pn.pan.setValueAtTime(p0, t0); pn.pan.linearRampToValueAtTime(p1, t1);
      n.connect(bp); bp.connect(g); g.connect(pn);
      outTo(pn, { wet: 0.5 });
    }
    function chime(t, ch, vol) { // small 'new card' lift: rolled bell triad
      for (var i = 0; i < 3; i++) bell(t + i * 0.06, ch.arp[i + 1] + 12, vol * (1 - i * 0.15), { dur: 1.6, pan: (i - 1) * 0.4, wet: 0.7 });
    }
    // relaxed half-time groove for one bar (2 s): kick 1 (+ pickup), soft snare on 3, offbeat hats,
    // whisper shaker, bouncy bass, sparse offbeat high plucks (keeps the caption mids clear)
    var GB = [[0, 0.28, 0, 0.19], [0.75, 0.14, 7, 0.12], [1.0, 0.3, 0, 0.17], [1.5, 0.16, 12, 0.11]];
    function groove(bt, c, bi, o) {
      o = o || {};
      var lv = o.lv == null ? 1 : o.lv, br = o.br || 0;
      for (var k = 0; k < GB.length; k++) bass(bt + GB[k][0], GB[k][1], c.b + GB[k][2], { vol: GB[k][3] * (0.85 + 0.15 * lv) });
      if (!o.noKick1) kick(bt, 0.45 * lv);
      if (bi % 2 === 1) kick(bt + 1.75, 0.22 * lv);
      snare(bt + 1.0, 0.085 * lv, { dec: 0.14, f: 2400, wet: 0.25 });
      for (var q = 0; q < 4; q++) {
        hat(bt + q * 0.5 + 0.25, 0.03 * lv);
        shaker(bt + q * 0.5 + 0.125, 0.012 * lv, { pan: -0.35 }); shaker(bt + q * 0.5 + 0.375, 0.012 * lv, { pan: -0.35 });
      }
      for (var s2 = 1; s2 < 8; s2 += 2) {
        if (s2 === 5 && bi % 2 === 0) continue;
        pluck(bt + s2 * 0.25, c.arp[ARP_UP[s2]] + 12, { vol: 0.04 * lv, dur: 0.15, cut: 3800 + br * 1200, pan: (s2 % 4 === 1 ? 0.45 : -0.45), wet: 0.3 });
      }
    }
    function bells(bt, list, vol, o) {
      o = o || {};
      for (var k = 0; k < list.length; k++) bell(bt + list[k][0], list[k][1], vol, { dur: o.dur || 1.3, pan: (k % 2 ? -0.3 : 0.3), wet: o.wet || 0.6 });
    }

    // ---------- EP05 'Drilling Rig 101' voices ----------
    function tick(t, v, p) { hat(t, v, { f: 8500, dec: 0.02, pan: p == null ? 0.35 : p }); } // clock tick (kept above the voice band)
    function ost(t, c, L, lv, cut) { // low pluck ostinato on 8ths (below ~1 kHz so the VO band stays clear)
      for (var k = 0; k < Math.round(L / 0.25); k++) {
        var idx = OST[k % 8];
        pluck(t + k * 0.25, c.arp[idx], { vol: (k % 2 ? 0.03 : 0.04) * lv, dur: 0.18, cut: cut || 1200, q: 2, pan: (idx - 1.5) * 0.28, wet: 0.32 });
      }
    }
    function stab(t, notes, vol, o) { // short bright chord hit that darkens as it decays
      o = o || {};
      pad(t, t + 0.06, notes, { vol: vol, att: 0.008, rel: o.rel || 0.9, cut0: o.cut0 || 2600, cut1: o.cut1 || 450, wet: o.wet == null ? 0.5 : o.wet, width: 0.9 });
    }
    function bars(list, fn) { for (var i = 0; i < list.length; i++) fn(CH[list[i][0]], list[i][1], list[i][2], i); }
    function rollTo(t1, n, v0, dv) { for (var r = 0; r < n; r++) snare(t1 - (n - r) * 0.125, v0 + r * dv, { dec: 0.09, pan: r % 2 ? 0.2 : -0.2 }); }

    // industrial 'rig' bar: driving 8th bass, low pluck ostinato, kick on the beats, ticks
    function rigBar(c, t0, L, lv, o) {
      o = o || {};
      pad(t0, t0 + L, c.pad, { vol: 0.045 + 0.012 * lv, att: o.att || 0.15, rel: 0.3, cut0: 750 + 400 * lv, cut1: 900 + 450 * lv, wet: 0.5, width: 0.9 });
      ost(t0, c, L, 0.7 + 0.3 * lv, 1000 + 500 * lv);
      var n8 = Math.round(L / 0.25), q;
      for (q = 0; q < n8; q++) bass(t0 + q * 0.25, 0.15, c.b + (q % 4 === 3 ? 12 : 0), { vol: q % 4 === 0 ? 0.15 : 0.095, cut: 560 });
      kick(t0, 0.42);
      if (L >= 1.5) kick(t0 + 1.0, 0.26 + 0.1 * lv);
      if (L === 2) snare(t0 + 1.0, 0.025 + 0.055 * lv, { dec: 0.14, f: 2400 });
      for (q = 0; q < n8; q++) if (q % 2 === 1 || lv > 0.6) tick(t0 + q * 0.25, (q % 2 ? 0.02 : 0.011) * (0.8 + 0.3 * lv), q % 2 ? 0.35 : -0.35);
    }
    // 16th-note 'current' line: octave-bouncing synth pluck, low fundamentals, zingy attack; 16th ticks above 8 kHz
    var ZP = [0, 1, 2, 3, 1, 2, 3, 2];
    function zline(t0, L, c, lv) {
      var n16 = Math.round(L / 0.125);
      for (var q = 0; q < n16; q++) {
        var tq = t0 + q * 0.125;
        pluck(tq, c.arp[ZP[q % 8]] - (q % 2 ? 0 : 12), { vol: (q % 4 === 0 ? 0.03 : 0.02) * lv, dur: 0.1, cut: 650 + 350 * lv, q: 3, pan: q % 2 ? 0.35 : -0.35, wet: 0.2 });
        if (q % 2) hat(tq, 0.006 + 0.008 * lv, { f: 9500, dec: 0.018, pan: q % 4 === 1 ? 0.45 : -0.45 });
      }
    }
    // electric SCR/VFD bar: zline + driving bass + four-on-the-beat (half-time) kick + clap on 3
    function voltBar(c, t0, L, lv, o) {
      o = o || {};
      pad(t0, t0 + L, c.pad, { vol: 0.042 + 0.014 * lv, att: 0.1, rel: 0.25, cut0: 900 + 600 * lv, cut1: 1000 + 700 * lv, wet: 0.45, width: 0.95, lfo: 4 });
      zline(t0, L, c, lv);
      var n8 = Math.round(L / 0.25), q;
      for (q = 0; q < n8; q++) bass(t0 + q * 0.25, 0.14, c.b + (q % 2 ? 12 : 0), { vol: q % 2 ? 0.09 : 0.15, cut: 600, drive: q % 4 === 0 });
      for (q = 0; q < L; q += 0.5) kick(t0 + q, q % 1 === 0 ? 0.42 : 0.2 + 0.08 * lv);
      if (L === 2) { snare(t0 + 1.0, 0.05 + 0.04 * lv, { dec: 0.16, f: 2000 }); snare(t0 + 1.02, 0.03 * lv, { dec: 0.12, f: 3200, pan: 0.3 }); }
      if (lv > 0.8) for (q = 0; q < L; q += 0.5) hat(t0 + q + 0.25, 0.022, { f: 7000 });
    }
    // mechanical clockwork: gear clacks on 8ths, low 'tok' on the offbeats, chain rattle at bar end
    function gearBar(c, t0, L, lv) {
      pad(t0, t0 + L, c.pad, { vol: 0.05, att: 0.15, rel: 0.3, cut0: 750, cut1: 850, wet: 0.5, width: 0.85 });
      var n8 = Math.round(L / 0.25), q;
      for (q = 0; q < n8; q++) {
        var tq = t0 + q * 0.25;
        hat(tq, q % 2 ? 0.02 : 0.013, { f: 5200, dec: 0.025, pan: q % 2 ? 0.4 : -0.4 });
        if (q % 4 === 2) tom(tq, 150, 0.09 * lv, { dec: 0.16, pan: -0.2 });
        if (q % 2 === 0) bass(tq, 0.2, c.b, { vol: q % 4 === 0 ? 0.16 : 0.11, cut: 520 });
      }
      kick(t0, 0.42); if (L >= 1.5) kick(t0 + 1.0, 0.3);
      if (L === 2) { snare(t0 + 1.0, 0.06, { dec: 0.12, f: 2600 }); for (q = 0; q < 3; q++) hat(t0 + 1.75 + q * 0.06, 0.016, { f: 6000, dec: 0.02, pan: 0.2 }); }
      ost(t0, c, L, 0.7 * lv, 900);
    }
    // diesel prime-mover bed: low E/B sawtooth drone amplitude-modulated at the firing rate + rumble noise
    function engineHum(t0, t1, vol) {
      if (!ok(t0)) return;
      var stop = t1 + 1.3;
      var lp = filt('lowpass', 240, 1.3);
      var am = gain(0.6), fire = osc('sine', 12.5, t0, stop), fg = gain(0.4);
      fire.connect(fg); fg.connect(am.gain);
      var g = gain(0);
      g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(vol, t0 + 1.2);
      g.gain.setValueAtTime(vol, t1); g.gain.linearRampToValueAtTime(0, t1 + 1.2);
      var notes = [[28, 1], [35, 0.45], [40, 0.25]];
      for (var i = 0; i < notes.length; i++) {
        for (var k = -1; k <= 1; k += 2) {
          var oc = osc('sawtooth', mtof(notes[i][0]), t0, stop); oc.detune.value = k * 6;
          var og = gain(notes[i][1] * 0.5); oc.connect(og); og.connect(lp);
        }
      }
      var n = noise(t0, stop - t0), nl = filt('lowpass', 140, 1), ng = gain(0.5);
      n.connect(nl); nl.connect(ng); ng.connect(lp);
      lp.connect(am); am.connect(g);
      outTo(g, { wet: 0.06 });
    }
    function lift(t, c, k) { // overview 'system highlighted' accent, grows with k (0..4)
      kick(t, 0.4 + 0.03 * k);
      crash(t, 0.022 + 0.007 * k, { dec: 1.3 + 0.2 * k });
      chime(t + 0.02, c, 0.021 + 0.003 * k);
      bass(t, 0.45, c.b, { vol: 0.15, drive: true, cut: 650 });
      if (k >= 2) tom(t - 0.25, 98, 0.08 + 0.02 * k, { dec: 0.35 });
      if (k >= 3) stab(t, c.pad, 0.045 + 0.012 * (k - 3), { rel: 0.8 });
    }

    // ---------- EP05 Part 2 'Hoisting' voices ----------
    // traveling-block line: 8th arpeggio across two octaves, climbing (dir>0) or descending (dir<0); low cut
    function travel(t0, L, c, dir, lv, cut) {
      var n8 = Math.round(L / 0.25);
      for (var k = 0; k < n8; k++) {
        var j = dir > 0 ? k : n8 - 1 - k, step = j % 8;
        var m = c.arp[step % 4] + 12 * Math.floor(step / 4) - 12;
        pluck(t0 + k * 0.25, m, { vol: (k % 2 ? 0.026 : 0.034) * lv, dur: 0.2, cut: cut || 1300, q: 2, pan: (step / 7 - 0.5) * 0.8 * (dir > 0 ? 1 : -1), wet: 0.35 });
      }
    }
    // reeving 'counting' bar: sustained pad + bass on the beats, a low wooden tok on each beat, ticks above 8 kHz
    function countBar(c, t0, L, lv) {
      pad(t0, t0 + L, c.pad, { vol: 0.05, att: 0.3, rel: 0.35, cut0: 700, cut1: 850, wet: 0.6, width: 0.9 });
      for (var q = 0; q < L / 0.5; q++) {
        var tq = t0 + q * 0.5;
        bass(tq, 0.32, c.b + (q % 2 ? 12 : 0), { vol: q % 2 ? 0.09 : 0.14, cut: 520 });
        tom(tq, q % 4 === 0 ? 130 : 165, (q % 2 ? 0.05 : 0.075) * lv, { dec: 0.14, pan: q % 2 ? 0.25 : -0.25 });
        tick(tq + 0.25, 0.015 * (0.8 + 0.3 * lv), 0.35);
      }
      kick(t0, 0.36);
      ost(t0, c, L, 0.45 * lv, 950);
    }
    // airy 'up high' bar: light kick, high shimmer, soft 8th plucks, wind (crown block / monkeyboard)
    function airBar(c, t0, L, lv) {
      pad(t0, t0 + L, c.pad, { vol: 0.045, att: 0.4, rel: 0.45, cut0: 900, cut1: 1100, wet: 0.7, width: 1 });
      bass(t0, L - 0.1, c.b, { vol: 0.12, att: 0.08, rel: 0.3 });
      kick(t0, L === 2 ? 0.28 : 0.24, { dec: 0.4 });
      for (var q = 0; q < L / 0.5; q++) {
        tick(t0 + q * 0.5 + 0.25, 0.012 + 0.004 * lv, q % 2 ? 0.4 : -0.4);
        pluck(t0 + q * 0.5, c.arp[[0, 2, 1, 3][q % 4]], { vol: 0.026, dur: 0.32, cut: 1100, pan: q % 2 ? 0.35 : -0.35, wet: 0.5 });
      }
    }
    function wind(t0, t1, vol) { // airy high band-passed noise, slow pan
      if (!ok(t0)) return;
      var n = noise(t0, t1 - t0 + 0.1), bp = filt('bandpass', 5500, 0.9);
      bp.frequency.setValueAtTime(4200, t0); bp.frequency.linearRampToValueAtTime(7000, (t0 + t1) / 2); bp.frequency.linearRampToValueAtTime(4800, t1);
      var g = gain(0);
      g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(vol, t0 + (t1 - t0) * 0.4); g.gain.linearRampToValueAtTime(0, t1);
      var pn = ctx.createStereoPanner(); pn.pan.setValueAtTime(-0.6, t0); pn.pan.linearRampToValueAtTime(0.6, t1);
      n.connect(bp); bp.connect(g); g.connect(pn);
      outTo(pn, { wet: 0.6 });
    }

    // ---------- EP05 Part 3 'Rotating' voices ----------
    // circular 'rotation' figure: 16th arpeggio on a 6-step cycle (0-1-2-3-2-1) against the 8-step bar, so it
    // keeps turning over the beat; each note's pan follows a circle (string spinning). Low cut keeps the VO band clear.
    var ROT = [0, 1, 2, 3, 2, 1];
    function rotLine(t0, L, c, lv, cut, oct) {
      var n16 = Math.round(L / 0.125);
      for (var q = 0; q < n16; q++) {
        pluck(t0 + q * 0.125, c.arp[ROT[q % 6]] + (oct || 0) - 12, { vol: (q % 4 === 0 ? 0.028 : 0.019) * lv, dur: 0.12, cut: cut || 1100, q: 2.5, pan: 0.6 * Math.sin(2 * Math.PI * q / 6), wet: 0.25 });
      }
    }
    // electric top-drive motor bed: low E/B saws with a slow 'rotation' AM and a sweeping low-pass whirr
    function motorHum(t0, t1, vol, rate) {
      if (!ok(t0)) return;
      var stop = t1 + 1.1;
      var lp = filt('lowpass', 300, 1.6);
      var sw = osc('sine', 0.25, t0, stop), swg = gain(90); sw.connect(swg); swg.connect(lp.frequency);
      var am = gain(0.75), rot = osc('sine', rate || 5, t0, stop), rg = gain(0.25);
      rot.connect(rg); rg.connect(am.gain);
      var g = gain(0);
      g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(vol, t0 + 0.8);
      g.gain.setValueAtTime(vol, t1); g.gain.linearRampToValueAtTime(0, t1 + 1.0);
      var notes = [[28, 0.8], [35, 0.4], [40, 0.35], [47, 0.12]];
      for (var i = 0; i < notes.length; i++) {
        for (var k = -1; k <= 1; k += 2) {
          var oc = osc('sawtooth', mtof(notes[i][0]), t0, stop); oc.detune.value = k * 7;
          var og = gain(notes[i][1] * 0.5); oc.connect(og); og.connect(lp);
        }
      }
      lp.connect(am); am.connect(g);
      outTo(g, { wet: 0.08 });
    }
    // vintage Kelly / rotary-table bar: darker square-wave pad with tape wobble, oom-pah bass (root/5th),
    // low tom 'chain drive' chug on 8ths, swung shaker, soft square plucks on 2 and 4
    function retroBar(c, t0, L, lv) {
      pad(t0, t0 + L, c.pad, { type: 'square', vol: 0.04 + 0.01 * lv, att: 0.12, rel: 0.3, cut0: 650 + 200 * lv, cut1: 760 + 200 * lv, wet: 0.45, width: 0.7, det: 5, lfo: 5.5, q: 0.7 });
      for (var q = 0; q < L / 0.5; q++) {
        var tq = t0 + q * 0.5;
        bass(tq, 0.3, c.b + (q % 2 ? 7 : 0), { vol: q % 2 ? 0.1 : 0.15, cut: 480 });
        tom(tq + 0.25, q % 2 ? 120 : 108, 0.045 * lv, { dec: 0.12, pan: q % 2 ? 0.3 : -0.3 });
        shaker(tq + 0.33, 0.016 * lv, { pan: 0.3, dec: 0.06 });
        if (q % 2) pluck(tq, c.arp[q % 4 === 1 ? 1 : 2], { vol: 0.03 * lv, dur: 0.22, cut: 900, q: 1.2, pan: -0.2, wet: 0.4 });
      }
      kick(t0, 0.4); if (L >= 1.5) { kick(t0 + 1.0, 0.24); snare(t0 + 1.0, 0.05 * lv, { dec: 0.12, f: 1800, wet: 0.3 }); }
    }
    // drill-string descent bar: pad darkens with depth (dp 0..1), descending travel line, steady pulse
    function descBar(c, t0, L, lv, dp) {
      pad(t0, t0 + L, c.pad, { vol: 0.05, att: 0.15, rel: 0.3, cut0: 1150 - 450 * dp, cut1: 1050 - 450 * dp, wet: 0.6, width: 0.95 });
      travel(t0, L, c, -1, 0.65 + 0.15 * lv, 1350 - 400 * dp);
      for (var q = 0; q < L / 0.5; q++) {
        bass(t0 + q * 0.5, 0.35, c.b + (q % 2 ? 12 : 0), { vol: q % 2 ? 0.09 : 0.14, cut: 540 });
        tick(t0 + q * 0.5 + 0.25, 0.016 * (0.8 + 0.3 * lv), q % 2 ? 0.35 : -0.35);
      }
      kick(t0, 0.4); if (L >= 1.5) { kick(t0 + 1.0, 0.24); snare(t0 + 1.0, 0.04 + 0.02 * lv, { dec: 0.13, f: 2200 }); }
    }
    // new-component lift on the way down: kick, light crash, a downward air sweep into it, one bell from a descending line
    function compLift(t, c, m, k) {
      riser(t - 0.9, t, 0.035, 3200, 700, { pan: 0 });
      kick(t, 0.42); crash(t, 0.02 + 0.003 * k, { dec: 1.4 });
      bell(t + 0.02, m, 0.024, { dur: 1.8, pan: 0.2, wet: 0.7 }); bell(t + 0.12, m - 12, 0.018, { dur: 1.6, pan: -0.2, wet: 0.7 });
      bass(t, 0.45, c.b, { vol: 0.15, drive: true, cut: 650 });
    }
    // MWD mud-pulse telemetry: low pressure pulses in a binary pattern + high digital ticks
    var MWDB = [1, 0, 1, 1, 0, 1, 0, 0, 1, 1, 0, 1, 0, 0, 1, 0];
    function mwdBar(c, t0, L, lv) {
      pad(t0, t0 + L, c.pad, { type: 'square', vol: 0.036, att: 0.1, rel: 0.25, cut0: 700, cut1: 800, wet: 0.5, width: 0.9, det: 3 });
      var n16 = Math.round(L / 0.125);
      for (var q = 0; q < n16; q++) {
        var tq = t0 + q * 0.125;
        if (MWDB[q % 16]) {
          var oc = osc('sine', mtof(c.b + 12), tq, tq + 0.1), g = gain(0);
          oc.frequency.setValueAtTime(mtof(c.b + 24), tq); oc.frequency.exponentialRampToValueAtTime(mtof(c.b + 12), tq + 0.04);
          decayEnv(g, tq, 0.06 * lv, 0.09, 0.002); oc.connect(g); outTo(g, { wet: 0.15, pan: q % 2 ? 0.25 : -0.25 });
        }
        hat(tq, MWDB[(q + 5) % 16] ? 0.014 : 0.007, { f: 9800, dec: 0.012, pan: q % 2 ? 0.5 : -0.5 });
      }
      for (q = 0; q < L / 0.5; q++) bass(t0 + q * 0.5, 0.2, c.b, { vol: q % 2 ? 0.1 : 0.14, cut: 500 });
      kick(t0, 0.38); if (L >= 1.5) kick(t0 + 1.0, 0.26);
    }
    // rock-cutting grind: band-passed noise chopped at a 'cutter' rate (chips), low body
    function grind(t0, t1, vol, rate, f) {
      if (!ok(t0)) return;
      var n = noise(t0, t1 - t0 + 0.1), bp = filt('bandpass', f || 700, 1.3);
      var am = gain(0.5), ch = osc('square', rate || 12, t0, t1 + 0.1), cg = gain(0.5); ch.connect(cg); cg.connect(am.gain);
      var g = gain(0);
      g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(vol, t0 + 0.3);
      g.gain.setValueAtTime(vol, t1 - 0.3); g.gain.linearRampToValueAtTime(0, t1);
      n.connect(bp); bp.connect(am); am.connect(g);
      outTo(g, { wet: 0.15, pan: -0.15 });
    }

    // ---------- EP05 Part 4 'Circulating' voices ----------
    var CP = { // extra (teaser) colours: E minor world for Well Control purple
      Emadd9: { b: 40, pad: [52, 55, 59, 66], arp: [64, 66, 67, 71] },
      Am:     { b: 45, pad: [57, 60, 64, 69], arp: [60, 64, 69, 72] },
      B7sus:  { b: 47, pad: [52, 57, 59, 66], arp: [64, 66, 69, 71] }
    };
    function CX(n) { return CH[n] || CP[n]; }
    // list of [chord, t0] (last entry [chord, t0, t1]); each bar runs to the next bar's start
    function seq(list, fn) {
      for (var i = 0; i < list.length; i++) {
        var a = list[i], t1 = a[2] != null ? a[2] : list[i + 1][1];
        fn(CX(a[0]), a[1], t1 - a[1], i);
      }
    }
    // the 'one drop' hook: water-drop plink + falling bell ripple (fits a 0.6 s VO gap)
    var DROP = [88, 83, 80, 83];
    function dropHook(t, vol, o) {
      o = o || {};
      var tr = o.tr || 0, st = o.st || 0.12;
      bubble(t, 900, vol * 1.3, { dur: 0.07, pan: 0.1, wet: 0.6 });
      for (var i = 0; i < 4; i++) bell(t + 0.03 + i * st, DROP[i] + tr, vol * (i === 3 ? 1.1 : 0.9), { dur: i === 3 ? 1.6 : 0.8, pan: (i - 1.5) * 0.25, wet: 0.65 });
    }
    // 'follow one drop' journey motif: rolling 8th-triplet wave whose pan travels across the bar (dir<0 = inverted)
    var JR = [0, 1, 2, 3, 2, 1];
    function journey(t0, L, c, lv, cut, oct, dir) {
      var st = 1 / 6, n = Math.floor(L / st + 1e-6);
      for (var q = 0; q < n; q++) {
        var idx = JR[q % 6]; if (dir < 0) idx = 3 - idx;
        pluck(t0 + q * st, c.arp[idx] + (oct || 0) - 12, { vol: (q % 3 === 0 ? 0.026 : 0.017) * lv, dur: 0.2, cut: cut || 1100, q: 1.8, pan: -0.6 + 1.2 * (q / Math.max(1, n - 1)), wet: 0.4 });
      }
    }
    // one piston thump of the triplex, panned per cylinder
    function piston(t, v, pan) {
      if (!ok(t)) return;
      var oc = osc('sine', 92, t, t + 0.25);
      oc.frequency.setValueAtTime(100, t); oc.frequency.exponentialRampToValueAtTime(46, t + 0.15);
      var g = gain(0); decayEnv(g, t, v, 0.22, 0.004); oc.connect(g);
      var n = noise(t, 0.16), lp = filt('lowpass', 380, 1.3), ng = gain(0);
      decayEnv(ng, t, v * 0.45, 0.14, 0.01); n.connect(lp); lp.connect(ng); ng.connect(g);
      outTo(g, { wet: 0.08, pan: pan || 0 });
    }
    // TRIPLEX groove: one stroke per 0.6 s (100 strokes/min = 100 BPM) split in three phases (pistons L-C-R, 8th
    // triplets); bass root-5th-octave per phase, hydraulic hiss after each phase. sm (0..1) = pulsation dampener:
    // accents even out, hiss and drive fade, pad opens.
    var PG = 22.5, SP = 0.6;
    function pumpSeg(c, t0, L, lv, sm, o) {
      o = o || {}; sm = sm || 0;
      var t1 = t0 + L;
      pad(t0, t1, c.pad, { vol: 0.046 + 0.012 * lv, att: o.att || 0.12, rel: 0.3, cut0: 760 + 300 * lv + 300 * sm, cut1: 860 + 350 * lv + 300 * sm, wet: 0.5, width: 0.95 });
      var k0 = Math.ceil((t0 - PG) / SP - 1e-6);
      for (var k = k0; PG + k * SP < t1 - 0.05; k++) {
        var ts = PG + k * SP;
        for (var ph = 0; ph < 3; ph++) {
          var tp = ts + ph * SP / 3; if (tp >= t1 - 0.03) break;
          var a = ph === 0 ? 1 : 0.5 + 0.35 * sm;
          piston(tp, 0.16 * lv * a, (ph - 1) * 0.45);
          bass(tp, 0.17, c.b + [0, 7, 12][ph], { vol: ph === 0 ? 0.15 : 0.085 + 0.03 * sm, cut: 560, drive: ph === 0 && sm < 0.5 });
          pluck(tp + SP / 6, c.arp[[0, 2, 1][ph]], { vol: 0.022 * lv, dur: 0.14, cut: 1000 + 300 * lv, q: 2, pan: (1 - ph) * 0.4, wet: 0.3 });
          if (!o.noHiss) hat(tp + 0.1, (0.018 - 0.012 * sm) * lv, { f: 6500, dec: 0.07, pan: (ph - 1) * -0.4 });
          if (o.count) tick(tp, ph === 0 ? 0.02 : 0.012, (ph - 1) * 0.4);
        }
        if (!o.noKick) kick(ts, (0.4 - 0.08 * sm) * (o.kv || 1));
        if (k % 2 === 1 && !o.noSnare) snare(ts, 0.05 * lv, { dec: 0.13, f: 2300 });
        if (o.count) tom(ts, k % 4 === 0 ? 130 : 165, 0.06, { dec: 0.14, pan: k % 2 ? 0.25 : -0.25 });
      }
    }
    // ascent: airy pad opening with height h (0..1), rising travel line, steady half-time pulse
    function climbBar(c, t0, L, lv, h) {
      pad(t0, t0 + L, c.pad, { vol: 0.048, att: 0.2, rel: 0.35, cut0: 850 + 500 * h, cut1: 1000 + 550 * h, wet: 0.6, width: 1 });
      travel(t0, L, c, 1, 0.7 + 0.2 * lv, 1100 + 400 * h);
      for (var q = 0; q < Math.round(L / 0.5); q++) {
        var tq = t0 + q * 0.5;
        bass(tq, 0.3, c.b + (q % 2 ? 12 : 0), { vol: q % 2 ? 0.09 : 0.14, cut: 540 });
        tick(tq + 0.25, 0.015 * (0.8 + 0.3 * lv), q % 2 ? 0.4 : -0.4);
      }
      kick(t0, 0.4); if (L >= 1.5) { kick(t0 + 1.0, 0.26); snare(t0 + 1.0, 0.05 * lv, { dec: 0.14, f: 2400 }); }
    }
    // fast 16th falling line (the dive down the string)
    function fallLine(t0, L, c, lv, cut) {
      var n = Math.round(L / 0.125);
      for (var q = 0; q < n; q++) {
        var step = 7 - (q % 8);
        pluck(t0 + q * 0.125, c.arp[step % 4] + 12 * Math.floor(step / 4) - 12, { vol: (q % 4 === 0 ? 0.022 : 0.015) * lv, dur: 0.1, cut: cut || 1100, q: 2.5, pan: 0.5 - (q % 8) / 7, wet: 0.3 });
      }
    }
    // jet burst at the bit nozzles: bright high-pressure blast + low boom
    function jetBurst(t, vol) {
      if (!ok(t)) return;
      var n = noise(t, 0.9), bp = filt('bandpass', 1500, 1.2), g = gain(0);
      bp.frequency.setValueAtTime(1200, t); bp.frequency.exponentialRampToValueAtTime(6000, t + 0.12); bp.frequency.exponentialRampToValueAtTime(900, t + 0.85);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0005, t + 0.85);
      n.connect(bp); bp.connect(g); outTo(g, { wet: 0.4 });
      kick(t, 0.55); boom(t, 0.09, { dur: 1.3 }); crash(t, 0.055, { dec: 1.6 });
      for (var k = 0; k < 3; k++) bell(t + 0.02 + k * 0.07, [83, 88, 95][k], 0.02, { dur: 1.2, pan: (k - 1) * 0.5, wet: 0.6 });
    }
    // annulus return: muddier, heavier churning swirl; cuttings ride up (up 0..1)
    function churnBar(c, t0, L, lv, up) {
      pad(t0, t0 + L, c.pad, { vol: 0.05, att: 0.2, rel: 0.3, cut0: 600 + 150 * up, cut1: 700 + 200 * up, wet: 0.5, width: 0.9, lfo: 0.6 });
      rotLine(t0, L, c, 0.55, 750 + 150 * up);
      for (var q = 0; q < Math.round(L / 0.5); q++) {
        var tq = t0 + q * 0.5;
        bass(tq, 0.35, c.b + (q % 2 ? 7 : 0), { vol: q % 2 ? 0.1 : 0.15, cut: 480 });
        tom(tq + 0.25, 100 + 12 * (q % 4), 0.045 * lv, { dec: 0.14, pan: q % 2 ? 0.3 : -0.3 });
      }
      kick(t0, 0.42); if (L >= 1.5) { kick(t0 + 1.0, 0.28); snare(t0 + 1.0, 0.04 * lv, { dec: 0.13, f: 2000 }); }
    }
    // flow check: near-silent watchfulness — low heartbeat, sparse ticks, held bass
    function watchBar(c, t0, L, lv) {
      pad(t0, t0 + L, c.pad, { vol: 0.038, att: 0.4, rel: 0.4, cut0: 600, cut1: 680, wet: 0.7, width: 1 });
      bass(t0, L - 0.1, c.b, { vol: 0.1, att: 0.15, rel: 0.3 });
      kick(t0, 0.28 * lv, { dec: 0.4 }); kick(t0 + 0.28, 0.15 * lv, { dec: 0.3 });
      for (var q = 0; q < Math.round(L / 0.5); q++) tick(t0 + q * 0.5 + 0.25, 0.012, q % 2 ? 0.4 : -0.4);
    }
    // solids control: light 'clean' arpeggio that brightens stage by stage (br 0..1); mode adds the machine colour
    function cleanBar(c, t0, L, br, mode, oct) {
      pad(t0, t0 + L, c.pad, { vol: 0.046, att: 0.15, rel: 0.3, cut0: 800 + 700 * br, cut1: 900 + 800 * br, wet: 0.55, width: 1, lfo: mode === 'vibe' ? 9 : 0.13 });
      var n8 = Math.round(L / 0.25), q;
      for (q = 0; q < n8; q++) {
        var tq = t0 + q * 0.25;
        pluck(tq, c.arp[ARP_UP[q % 8]], { vol: (q % 2 ? 0.017 : 0.024) * (0.8 + 0.3 * br), dur: 0.18, cut: 1000 + 900 * br, q: 1.6, pan: q % 2 ? 0.35 : -0.35, wet: 0.4 });
        if (q % 2 === 0) bass(tq, 0.2, c.b + (q % 4 === 2 ? 12 : 0), { vol: q % 4 === 0 ? 0.14 : 0.09, cut: 520 });
        if (q % 2 === 1) hat(tq, 0.015 + 0.012 * br);
      }
      kick(t0, 0.4); if (L >= 1.5) { kick(t0 + 1.0, 0.26); snare(t0 + 1.0, 0.045 + 0.02 * br, { dec: 0.13, f: 2400 }); }
      if (mode === 'vibe') for (q = 0; q < n8 * 2; q++) hat(t0 + q * 0.125, q % 2 ? 0.008 : 0.013, { f: 5200, dec: 0.02, pan: q % 2 ? 0.3 : -0.3 });
      if (mode === 'bubble') for (q = 0; q < 5; q++) bubble(t0 + 0.2 + q * L / 5 + rnd() * 0.1, 260 + rnd() * 260, 0.022, { dur: 0.09, pan: rnd() * 1.2 - 0.6, wet: 0.5 });
      if (mode === 'swirl') rotLine(t0, L, c, 0.5, 900 + 300 * br, oct || 0);
      if (mode === 'spin') rotLine(t0, L, c, 0.55, 1100, 12);
    }
    // Well Control teaser: purple, tense — wide detuned pad, pulsing 8th bass, heartbeat kick
    function tenseBar(c, t0, L, lv) {
      pad(t0, t0 + L, c.pad, { vol: 0.052, att: 0.25, rel: 0.4, cut0: 700, cut1: 950, wet: 0.65, width: 1, det: 16, lfo: 0.3 });
      for (var q = 0; q < Math.round(L / 0.25); q++) bass(t0 + q * 0.25, 0.16, c.b, { vol: q % 4 === 0 ? 0.13 : 0.06, cut: 450 });
      kick(t0, 0.36 * lv, { dec: 0.4 }); kick(t0 + 0.28, 0.2 * lv, { dec: 0.3 }); if (L >= 1.5) kick(t0 + 1.0, 0.28 * lv, { dec: 0.4 });
      for (q = 0; q < Math.round(L / 0.5); q++) tick(t0 + q * 0.5 + 0.25, 0.014, q % 2 ? 0.4 : -0.4);
    }

    // ---------- EP05 Part 5 'Well Control' voices ----------
    var BEAT = 60 / 72, BAR = 4 * BEAT; // 72 BPM: slower and heavier than Part 4's pump groove
    CP.Em    = { b: 40, pad: [52, 55, 59, 64], arp: [64, 67, 71, 76] };
    CP.G     = { b: 43, pad: [55, 59, 62, 67], arp: [62, 67, 71, 74] };
    CP.Cmaj7 = { b: 36, pad: [52, 55, 59, 64], arp: [60, 64, 67, 71] };
    CP.Dadd9 = { b: 38, pad: [54, 57, 62, 64], arp: [62, 64, 66, 69] };
    var WC = [59, 64, 66, 67];      // Well Control motif (P4 teaser figure, minor), low octave
    var WC_MAJ = [59, 64, 66, 68];  // ... resolved
    // bars of exactly 4 beats from t0; the last bar ends at tEnd when given
    function grid(t0, names, tEnd) {
      var out = [];
      for (var i = 0; i < names.length; i++) out.push([names[i], t0 + i * BAR]);
      out[out.length - 1][2] = tEnd != null ? tEnd : t0 + names.length * BAR;
      return out;
    }
    // the weighty low pulse: sub sine (felt), 150 Hz body (heard on phones), soft lowpassed knock
    function thump(t, v, o) {
      o = o || {};
      if (!ok(t) || v <= 0) return;
      var dec = o.dec || 0.55;
      var oc = osc('sine', 64, t, t + dec + 0.02);
      oc.frequency.setValueAtTime(o.f0 || 66, t); oc.frequency.exponentialRampToValueAtTime(o.f1 || 36, t + 0.22);
      var g = gain(0); decayEnv(g, t, v, dec, 0.004); oc.connect(g);
      var b = osc('triangle', 150, t, t + 0.22);
      b.frequency.setValueAtTime(165, t); b.frequency.exponentialRampToValueAtTime(70, t + 0.16);
      var bg = gain(0); decayEnv(bg, t, v * 0.32, 0.18, 0.003); b.connect(bg); bg.connect(g);
      var n = noise(t, 0.08), lp = filt('lowpass', 260, 1), ng = gain(0);
      decayEnv(ng, t, v * 0.4, 0.07, 0.002); n.connect(lp); lp.connect(ng); ng.connect(g);
      outTo(g, { wet: o.wet == null ? 0.12 : o.wet, bus: o.bus });
    }
    // the 'steel door' bar: dark wide pad, held bass, thump on every beat (1 strong, 3 medium), ticks > 8 kHz
    function steelBar(c, t0, L, lv, o) {
      o = o || {};
      var cut = o.cut || 700;
      pad(t0, t0 + L, c.pad, { vol: (o.pv || 0.046) + 0.008 * lv, att: o.att || 0.35, rel: o.rel || 0.5, cut0: cut + 150 * lv, cut1: cut + 280 * lv, wet: 0.6, width: 1, det: o.det || 13, lfo: o.lfo || 0.2 });
      bass(t0, L - 0.12, c.b, { vol: 0.095 + 0.025 * lv, att: 0.12, rel: 0.4, cut: 420 });
      var nb = Math.max(1, Math.round(L / BEAT - 0.25));
      for (var k = 0; k < nb; k++) {
        var tb = t0 + k * BEAT;
        if (!(o.sparse && k % 2)) thump(tb, (k === 0 ? 0.36 : (k === 2 ? 0.25 : 0.17)) * lv * (o.tv || 1));
        if (o.eighths) thump(tb + BEAT / 2, 0.08 * lv, { dec: 0.3 });
        if (!o.noTick) tick(tb + BEAT / 2, 0.008 + 0.004 * lv, k % 2 ? 0.4 : -0.4);
        if (o.ticks16) for (var s16 = 1; s16 < 4; s16 += 2) hat(tb + s16 * BEAT / 4, 0.005 + 0.004 * lv, { f: 9500, dec: 0.015, pan: s16 === 1 ? -0.5 : 0.5 });
      }
    }
    // the lift down the stack: one low step per beat, descending through the chord (floors going by)
    function stepDown(t0, L, c, lv) {
      for (var k = 0; k < Math.round(L / BEAT - 0.25); k++) {
        pluck(t0 + k * BEAT + 0.02, c.arp[3 - (k % 4)] - 12, { vol: 0.036 * lv, dur: 0.45, cut: 900, q: 1.6, pan: 0.3 - 0.2 * (k % 4), wet: 0.45 });
      }
    }
    // mechanisms: low machine ostinato on 72-BPM 8ths (below ~1 kHz)
    function mechOst(t0, L, c, lv) {
      var st = BEAT / 2, n = Math.round(L / st - 0.25);
      for (var k = 0; k < n; k++) {
        var idx = OST[k % 8];
        pluck(t0 + k * st, c.arp[idx] - 12, { vol: (k % 2 ? 0.022 : 0.03) * lv, dur: 0.22, cut: 1000, q: 2, pan: (idx - 1.5) * 0.3, wet: 0.3 });
      }
    }
    // Well Control motif in the low register (8th 8th 8th long), soft plucks + sub — reads under the voice
    function wcMotif(t, vol, notes, o) {
      o = o || {};
      var N = notes || WC, st = o.st || BEAT / 4;
      for (var i = 0; i < 4; i++) {
        pluck(t + i * st, N[i], { vol: vol * (i === 3 ? 1.1 : 0.9), dur: i === 3 ? 1.2 : 0.3, cut: o.cut || 1200, q: 1.4, pan: (i - 1.5) * 0.2, wet: 0.45 });
      }
      bass(t + 3 * st, 1.0, N[0] - 12, { vol: vol * 2.2, att: 0.05, rel: 0.5 });
    }
    // gas path: rolling triplet wave (P4 'journey' DNA at 72 BPM) whose pan travels L -> R (the choke side is camera-right)
    function gasLine(t0, L, c, lv, cut, oct) {
      var st = BEAT / 3, n = Math.floor(L / st + 1e-6);
      for (var q = 0; q < n; q++) {
        pluck(t0 + q * st, c.arp[JR[q % 6]] + (oct || 0) - 12, { vol: (q % 3 === 0 ? 0.026 : 0.017) * lv, dur: 0.24, cut: cut || 1100, q: 1.8, pan: -0.55 + 1.15 * (q / Math.max(1, n - 1)), wet: 0.45 });
      }
    }
    // dying-motor pad: holds, then its pitch and filter collapse (the bed 'loses power' at tOff)
    function windDown(tOn, tOff, notes, vol) {
      if (!ok(tOn)) return;
      var stop = tOff + 0.75, lp = filt('lowpass', 900, 1.1), g = gain(0);
      lp.frequency.setValueAtTime(900, tOn); lp.frequency.setValueAtTime(900, tOff); lp.frequency.exponentialRampToValueAtTime(120, tOff + 0.6);
      g.gain.setValueAtTime(0, tOn); g.gain.linearRampToValueAtTime(vol, tOn + 1.2);
      g.gain.setValueAtTime(vol, tOff); g.gain.linearRampToValueAtTime(vol * 0.6, tOff + 0.12); g.gain.exponentialRampToValueAtTime(0.0003, tOff + 0.7);
      for (var i = 0; i < notes.length; i++) for (var k = -1; k <= 1; k += 2) {
        var oc = osc('sawtooth', mtof(notes[i]), tOn, stop); oc.detune.value = k * 10;
        oc.frequency.setValueAtTime(mtof(notes[i]), tOff); oc.frequency.exponentialRampToValueAtTime(mtof(notes[i]) * 0.5, tOff + 0.6);
        var p = ctx.createStereoPanner(); p.pan.value = k * 0.6; oc.connect(p); p.connect(lp);
      }
      lp.connect(g); outTo(g, { wet: 0.35 });
    }

    // ---------- VO windows (docs/script.json) — music leaves the 1–4 kHz band while the voice speaks ----------
    var VO = [[0.6, 5.9], [6.2, 12.9], [13.2, 19.9], [20.2, 25.3], [25.6, 31.4], [31.7, 36.5], [36.8, 43.3], [43.6, 49.8],
      [50.1, 56.0], [56.3, 63.4], [63.7, 70.3], [70.6, 77.3], [77.6, 84.3], [84.6, 91.1], [91.4, 97.9], [98.2, 104.1],
      [104.4, 111.5], [111.8, 118.9], [119.2, 126.1], [126.4, 133.1], [133.4, 139.3], [139.6, 144.9], [145.2, 151.8],
      [152.1, 158.9], [159.2, 165.8], [165.3, 172.1], [172.4, 176.9], [177.4, 182.9]];
    (function () {
      var R = 50, n = Math.max(2, Math.ceil(END * R) + 1), cv = new Float32Array(n), DIP = -4.5, RMP = 0.12;
      for (var j = 0; j < n; j++) {
        var tt = j / R, w = 0;
        for (var v = 0; v < VO.length; v++) {
          var a = VO[v][0], b = VO[v][1], x = 0;
          if (tt >= a && tt <= b) x = 1;
          else if (tt < a && tt > a - RMP) x = 1 - (a - tt) / RMP;
          else if (tt > b && tt < b + RMP) x = 1 - (tt - b) / RMP;
          if (x > w) w = x;
        }
        cv[j] = DIP * w;
      }
      voEq.gain.setValueCurveAtTime(cv, 0, END);
    })();

    // ============ SCORE ============
    // ---- 1 TITLE 0–6.2: the P4 teaser figure (B E F# G, minor) answered in MAJOR — "finally, the last system" ----
    pad(0, 1.8, CH.Eadd9.pad, { vol: 0.1, att: 0.45, rel: 0.6, cut0: 600, cut1: 1700, wet: 0.65, width: 0.9 });
    pad(0.3, 5.6, [76, 80, 83], { type: 'triangle', vol: 0.018, att: 1.6, rel: 0.8, cut0: 2000, cut1: 3200, wet: 0.8, width: 0.9 });
    sig(0.05, 0.075, { last: 2.6, st: 0.17 }); // B E F# G#: resolved (P4 ended on G natural)
    thump(0.4, 0.42, { dec: 0.9 }); boom(0.4, 0.04, { dur: 1.6 });
    seq([['Amaj7', 1.8], ['E', 3.4], ['Cmaj7', 4.6, 6.2]], function (c, t0, L, i) {
      pad(t0, t0 + L, c.pad, { vol: 0.07 - 0.01 * i, att: 0.35, rel: 0.5, cut0: 1000 - 120 * i, cut1: 1100 - 150 * i, wet: 0.6, width: 0.95 });
      bass(t0, L - 0.1, c.b, { vol: 0.11, att: 0.25, rel: 0.4 });
    });
    bell(5.92, 71, 0.022, { dur: 1.6, wet: 0.75 }); // gap 5.9–6.2

    // ---- 2 BARRIERS 6.2–16.6: no pulse yet — purple minor world, low drone, held breath ----
    seq([['Emadd9', 6.2], ['C', 9.55], ['Am', 12.9], ['B7sus', 14.75, 16.6]], function (c, t0, L, i) {
      pad(t0, t0 + L, c.pad, { vol: 0.05, att: i ? 0.4 : 0.8, rel: 0.5, cut0: 620 + 40 * i, cut1: 720 + 40 * i, wet: 0.65, width: 1, det: 15, lfo: 0.25 });
      bass(t0, L - 0.1, c.b, { vol: 0.1, att: 0.3, rel: 0.4 });
      for (var q = 0; q < Math.floor(L / BEAT); q++) tick(t0 + q * BEAT + BEAT / 2, 0.007, q % 2 ? 0.4 : -0.4);
    });
    drone(6.4, 16.4, [28, 35], 0.014, { cut: 260, att: 2.0, rel: 0.6, trem: 0.3 });
    pad(7.0, 12.6, [79, 83], { type: 'triangle', vol: 0.008, att: 2.5, rel: 0.4, cut0: 1500, cut1: 2000, wet: 0.85, width: 1, lfo: 5 }); // high, thin, tense (soft under VO)
    bell(12.95, 67, 0.02, { dur: 1.4, wet: 0.75 }); // gap 12.9–13.2
    thump(13.2, 0.3, { dec: 0.8 }); // the stack appears
    riser(15.4, 16.55, 0.03, 300, 2200);

    // ---- 3 PULSE ENTERS 16.6 (trench lands) · 4 THE LIFT 20.2–36.8 · 5 MECHANISMS 36.8–63.3 ----
    thump(16.6, 0.5, { dec: 0.8 }); crash(16.6, 0.02, { dec: 1.8 });
    seq(grid(16.6, ['Em', 'C', 'Am', 'B7sus', 'Em', 'Cmaj7', 'D', 'B7sus', 'Em', 'C', 'G', 'D', 'Am', 'B7sus']), function (c, t0, L, i) {
      var lv = i < 1 ? 0.6 : (t0 < 36.6 ? 0.72 : 0.8 + 0.01 * (i - 6));
      steelBar(c, t0, L, lv, { pv: 0.044 });
      if (t0 >= 19.9 && t0 < 36.6) stepDown(t0, L, c, 0.9);   // floors going by
      if (t0 >= 36.6) mechOst(t0, L, c, 0.75 + 0.03 * (i - 6)); // mechanisms
    });
    drone(20.4, 36.4, [28], 0.01, { cut: 220, att: 2.0, rel: 0.8, trem: 0.25 });
    // line-gap accents (VO gaps): tiny low bells / motif tails
    bell(25.35, 71, 0.016, { dur: 1.2, pan: 0.3 }); bell(31.45, 69, 0.016, { dur: 1.2, pan: -0.3 });
    bell(36.52, 67, 0.018, { dur: 1.4 }); thump(36.8, 0.3);
    bell(43.33, 71, 0.015, { dur: 1.1, pan: 0.3 }); bell(49.82, 74, 0.015, { dur: 1.1, pan: -0.3 }); bell(56.02, 71, 0.016, { dur: 1.2 });
    wcMotif(38.2, 0.03); wcMotif(51.5, 0.03);
    riser(62.2, 63.65, 0.035, 250, 2400); tom(63.25, 70, 0.1, { dec: 0.45 });

    // ---- 6 AWE 63.7–77.6: 10,000 psi ≈ 660 t, then the blind-shear cut — strings swell, low end thickens ----
    var AWE = [['Am', 63.7], ['C', 63.7 + BAR], ['B7sus', 63.7 + 2 * BAR], ['Em', 73.6], ['B7sus', 73.6 + BAR, 77.6]];
    seq(AWE, function (c, t0, L, i) {
      var lv = 0.85 + 0.07 * i;
      steelBar(c, t0, L, lv, { pv: 0.046, cut: 650, eighths: i >= 1, ticks16: i >= 2, tv: 1.05 });
    });
    pad(63.8, 73.4, [57, 64, 69, 72], { vol: 0.045, att: 4.5, rel: 0.6, cut0: 500, cut1: 1500, det: 8, wet: 0.75, width: 1, lfo: 0.15 }); // strings swell
    drone(65.5, 73.5, [28, 35, 40], 0.02, { cut: 200, cut1: 320, att: 3.0, rel: 0.3, trem: 0.4 });           // low end thickens
    thump(68.3, 0.62, { dec: 1.2, f0: 58, f1: 28 }); boom(68.3, 0.06, { dur: 2.0, f0: 60, f1: 24 });          // 660 t sub-thump
    bell(70.32, 69, 0.018, { dur: 1.2 });                                                                       // gap 70.3–70.6
    // 73.6 the DRY metallic accent: everything stops for one beat, dry stab + kick, no reverb
    kick(73.6, 0.55, { dec: 0.3, wet: 0 }); stab(73.6, [52, 59, 64, 67], 0.07, { rel: 0.35, cut0: 2400, cut1: 400, wet: 0 });
    drone(74.0, 77.4, [28, 35], 0.014, { cut: 240, att: 0.8, rel: 0.4, trem: 0.5 });
    bell(77.32, 71, 0.018, { dur: 1.2 });                                                                       // gap 77.3–77.6

    // ---- 7 THE COMMAND 77.6–84.6 · 8 THE BOTTLES 84.6–91.9: quiet tension ----
    seq(grid(77.6, ['Em', 'C'], 84.6), function (c, t0, L, i) { steelBar(c, t0, L, 0.7, { pv: 0.04, cut: 680 }); });
    wcMotif(78.3, 0.034); // the command travels (with the 'pulse' SFX)
    wcMotif(81.6, 0.026, [59, 64, 66, 71]);
    bell(84.32, 67, 0.016, { dur: 1.2 });
    seq([['Am', 84.6], ['B7sus', 84.6 + BAR, 91.9]], function (c, t0, L, i) {
      // thin pulse (1 and 3 only), gauge ticks on 8ths, held tremolo tension above
      steelBar(c, t0, L, 0.55 + 0.1 * i, { pv: 0.032, cut: 600, sparse: true, noTick: true });
      for (var q = 0; q < Math.round(L / (BEAT / 2)); q++) tick(t0 + q * BEAT / 2, q % 2 ? 0.007 : 0.011, q % 2 ? 0.45 : -0.45);
    });
    windDown(84.8, 91.9, [52, 59, 64, 66], 0.016); // the rig's electric bed: collapses with the power at 91.9
    pad(85.5, 91.5, [71, 72], { type: 'triangle', vol: 0.007, att: 3, rel: 0.3, cut0: 1300, cut1: 1300, wet: 0.8, width: 1, lfo: 7 });
    drone(85.0, 91.6, [28, 35], 0.012, { cut: 240, att: 2.5, rel: 0.25, trem: 0.6 });

    // ---- 9 POWER OFF 91.9: near-silence 92.0–94.95 — only a sub drone and air (bypasses the section arc) ----
    drone(92.0, 94.7, [28], 0.012, { cut: 150, att: 0.6, rel: 0.4, trem: 0.15, bus: quietBus });
    // ---- 95.0 the pulse returns, warm: the BOP closed without rig power ----
    thump(95.0, 0.5, { dec: 1.0 }); crash(95.0, 0.018, { dec: 2.2 });
    steelBar(CP.Cmaj7, 95.0, 98.2 - 95.0, 0.7, { pv: 0.05, cut: 900, att: 0.5 });
    pad(95.2, 97.8, [67, 71, 76], { type: 'triangle', vol: 0.012, att: 1.2, rel: 0.6, cut0: 1500, cut1: 2200, wet: 0.85, width: 1 });
    bell(97.95, 76, 0.02, { dur: 1.6, wet: 0.75 }); // gap 97.9–98.2

    // ---- 10 THE WAY OUT 98.2–139.6: flowing arpeggio follows the gas: valves, choke, MGS, flare, mud seal, trip tank ----
    seq(grid(98.2, ['Em', 'C', 'G', 'D', 'Em', 'Am', 'C', 'G', 'D', 'Em', 'C', 'Dadd9'], 138.2), function (c, t0, L, i) {
      var lv = t0 >= 118 && t0 < 128 ? 0.85 : 0.72;
      steelBar(c, t0, L, lv, { pv: 0.042, cut: 760, tv: 0.85 });
      gasLine(t0, L, c, 0.6 + (t0 >= 118 && t0 < 128 ? 0.2 : 0.08), 1050);
    });
    steelBar(CX('B7sus'), 138.2, 139.6 - 138.2, 0.6, { pv: 0.04 });
    for (var g5 = 0; g5 < 3; g5++) bell(104.12 + g5 * 0.08, [71, 74, 79][g5], 0.014, { dur: 1.0, pan: (g5 - 1) * 0.4 }); // gap 104.1–104.4
    bell(111.52, 74, 0.016, { dur: 1.2, pan: 0.4 }); bell(118.92, 71, 0.016, { dur: 1.2, pan: 0.5 });
    // flare: warm swell (major-leaning) under the controlled flame
    pad(122.8, 127.6, [55, 59, 62, 67], { type: 'triangle', vol: 0.03, att: 1.6, rel: 1.0, cut0: 800, cut1: 1300, wet: 0.8, width: 1 });
    bass(123.4, 3.6, 43, { vol: 0.08, att: 0.6, rel: 0.8 });
    bell(126.12, 74, 0.016, { dur: 1.2 }); bell(133.12, 79, 0.015, { dur: 1.2, pan: -0.3 });
    // 5 psi mud seal: small clever surprise — a light triad 'plink' in the gap before the trip tank
    for (g5 = 0; g5 < 3; g5++) bubble(133.15 + g5 * 0.07, 500 + g5 * 160, 0.018, { dur: 0.07, pan: (g5 - 1) * 0.4 });
    bell(139.32, 76, 0.016, { dur: 1.2 });

    // ---- 11 THOROUGHNESS 139.6–166.1: light and tidy · ticking motif under testing 159.2–166.1 ----
    seq(grid(139.6, ['C', 'G', 'Am', 'Em', 'C', 'D'], 159.6), function (c, t0, L, i) {
      steelBar(c, t0, L, 0.55, { pv: 0.038, cut: 800, tv: 0.75 });
      mechOst(t0, L, c, 0.5);
    });
    bell(144.92, 71, 0.014, { dur: 1.0 }); bell(151.82, 74, 0.014, { dur: 1.0 }); bell(158.92, 78, 0.015, { dur: 1.0 });
    seq([['Am', 159.6], ['B7sus', 159.6 + BAR, 166.1]], function (c, t0, L, i) {
      steelBar(c, t0, L, 0.55 + 0.1 * i, { pv: 0.038, cut: 780, noTick: true, tv: 0.8 });
      for (var q = 0; q < Math.round(L / (BEAT / 2) - 0.25); q++) { // the ticking motif: tick-tock 8ths + low chart 'tok'
        tick(t0 + q * BEAT / 2, q % 2 ? 0.009 : 0.014, q % 2 ? 0.45 : -0.45);
        if (q % 4 === 3) pluck(t0 + q * BEAT / 2, c.arp[q % 8 === 3 ? 1 : 2] - 12, { vol: 0.022, dur: 0.2, cut: 900, wet: 0.35 });
      }
    });
    riser(164.6, 166.08, 0.05, 300, 3800); tom(165.6, 98, 0.1, { dec: 0.3 }); tom(165.85, 82, 0.12, { dec: 0.35 });

    // ---- 12 SERIES FINALE 166.1–172.4: five systems, one rig — E major, five rising notes, one quote per Part ----
    var FIN = 166.1;
    thump(FIN, 0.6, { dec: 1.0 }); kick(FIN, 0.45); crash(FIN, 0.05, { dec: 2.4 }); boom(FIN, 0.05, { dur: 1.4 });
    seq([['Eadd9', FIN], ['E', 167.4], ['Csm7', 168.1], ['A', 168.9], ['Bsus4', 169.6], ['B', 170.3], ['E', 170.9, 172.4]], function (c, t0, L, i) {
      pad(t0, t0 + L, c.pad, { vol: 0.055 + 0.004 * i, att: i ? 0.08 : 0.3, rel: 0.4, cut0: 950 + 50 * i, cut1: 1050 + 50 * i, wet: 0.6, width: 1 });
      bass(t0, L - 0.05, c.b, { vol: 0.15, att: 0.02, rel: 0.25, drive: i === 6 });
    });
    for (var fb = 0; fb < 8; fb++) { // full theme pulse at 72 BPM: thump on beats, light backbeat, hats
      var tb = FIN + fb * BEAT;
      thump(tb, fb % 2 ? 0.26 : 0.4);
      if (fb % 2) snare(tb, 0.045, { dec: 0.14, f: 2200 });
      hat(tb + BEAT / 2, 0.02, { f: 8000 });
    }
    var REC = [[167.4, 71, 'power'], [168.1, 76, 'hoist'], [168.9, 78, 'rot'], [169.6, 80, 'circ'], [170.9, 83, 'wc']];
    for (var r = 0; r < REC.length; r++) {
      var rt = REC[r][0], rm = REC[r][1], kind = REC[r][2];
      bell(rt, rm, 0.032 + 0.004 * r, { dur: r === 4 ? 2.6 : 1.3, pan: (r - 2) * 0.25, wet: 0.65 });
      pluck(rt, rm - 12, { vol: 0.05, dur: 0.5, cut: 1400, wet: 0.4, pan: (r - 2) * -0.15 });
      if (kind === 'power') zline(rt + 0.06, 0.62, CH.E, 0.75);                          // P1: 16th 'current'
      if (kind === 'hoist') travel(rt + 0.06, 0.75, CH.Csm7, 1, 0.8, 1300);              // P2: climbing travel line
      if (kind === 'rot') rotLine(rt + 0.06, 0.62, CH.A, 0.8, 1200, 12);                 // P3: circling rotation figure
      if (kind === 'circ') { bubble(rt + 0.02, 900, 0.03, { dur: 0.07, wet: 0.6 }); journey(rt + 0.1, 1.2, CH.Bsus4, 0.8, 1200); } // P4: one drop + journey
      if (kind === 'wc') {                                                                // P5: the thump + full resolve
        thump(rt, 0.7, { dec: 1.4 }); kick(rt, 0.4); crash(rt, 0.06, { dec: 2.6 }); boom(rt, 0.06, { dur: 1.8 });
        stab(rt, CH.E.pad.concat([71, 76]), 0.08, { rel: 1.6, cut0: 3000, cut1: 800, wet: 0.6 });
        bass(rt, 1.5, 28, { vol: 0.08, rel: 0.6 });
      }
      crash(rt, 0.012 + 0.003 * r, { dec: 1.2 });
    }
    wcMotif(171.4, 0.03, WC_MAJ); // the purple figure, resolved, low under the 'success'
    pad(171.0, 172.3, [76, 80, 83], { type: 'triangle', vol: 0.016, att: 0.4, rel: 0.6, cut0: 2200, cut1: 3000, wet: 0.85, width: 1 });

    // ---- 13 CTA 172.4–177.4: light, ducked, warm ----
    seq([['Amaj7', 172.4], ['E', 172.4 + 2 * BEAT], ['Amaj7', 172.4 + 4 * BEAT], ['B', 172.4 + 5 * BEAT, 177.4]], function (c, t0, L, i) {
      pad(t0, t0 + L, c.pad, { vol: 0.045, att: i ? 0.3 : 0.6, rel: 0.5, cut0: 900, cut1: 1000, wet: 0.65, width: 1 });
      bass(t0, L - 0.1, c.b, { vol: 0.1, att: 0.2, rel: 0.4 });
    });
    for (fb = 0; fb < 6; fb++) { thump(172.4 + fb * BEAT, fb % 2 ? 0.13 : 0.2); tick(172.4 + fb * BEAT + BEAT / 2, 0.008, fb % 2 ? 0.4 : -0.4); }
    bell(176.95, 80, 0.016, { dur: 1.4 }); bell(177.08, 76, 0.014, { dur: 1.4, pan: 0.3 }); // gap 176.9–177.4

    // ---- 14 TEASER EP06 Casing & Cementing 177.4–END: grey, layered, settling; fade from 182.0 ----
    seq([['Eadd9', 177.4], ['Csm7', 179.6], ['A', 181.4, END]], function (c, t0, L, i) {
      pad(t0, t0 + L, c.pad, { vol: 0.042 - 0.006 * i, att: 0.5, rel: 0.8, cut0: 850 - 120 * i, cut1: 780 - 120 * i, wet: 0.7, width: 1, det: 7 });
      bass(t0, L - 0.1, c.b, { vol: 0.09, att: 0.3, rel: 0.5 });
    });
    for (fb = 0; fb < 5; fb++) pluck(177.6 + fb * 0.12, [76, 71, 68, 64, 59][fb], { vol: 0.02, dur: 0.6, cut: 1100, pan: (fb - 2) * 0.25, wet: 0.6 }); // strings nest outer -> inner
    thump(177.4, 0.26, { dec: 0.9 }); thump(179.6, 0.18, { dec: 0.9 }); thump(181.4, 0.14, { dec: 0.9 });
    pad(179.6, 181.6, [64, 68], { type: 'triangle', vol: 0.01, att: 1.6, rel: 0.6, cut0: 1200, cut1: 1500, wet: 0.85, width: 1 }); // cement fills
    bell(182.95, 64, 0.016, { dur: 0.6, wet: 0.8 }); // final VO gap
    // ============ SFX ============
    var SFXLEN = { flow: 1.5, pulse: 0.5, vibe: 2.0, swirl: 2.0, spin: 2.0, torque: 0.8, engine: 3.3, zap: 1.0, winch: 3.0, chain: 0.6, whoosh: 0.8, alarm: 1.5, clunk: 0.6, impact: 2.0, hiss: 1.2, fire: 2.0, pump: 1.5, success: 1.0, blip: 0.15, bubble: 0.8,
      hydraulic: function (cu) { return cueNum(cu, 'dur', 0.9, 0.2, 4) + 0.5; },
      rubber: function (cu) { return cueNum(cu, 'dur', 1.2, 0.3, 4); },
      shear: function (cu) { return cueNum(cu, 'pre', 0.35, 0, 2) + 1.6; },
      powerdown: function (cu) { return cueNum(cu, 'dur', 2.2, 0.5, 6); },
      ratchet: function (cu) { return cueNum(cu, 'dur', 1.2, 0.1, 6); },
      tick: function (cu) { return Math.round(cueNum(cu, 'n', 1, 1, 64)) / cueNum(cu, 'rate', 2, 0.5, 20); },
      valve: function (cu) { return cu && cu.open ? 0.8 : 0.45; },
      gas: function (cu) { return cueNum(cu, 'dur', 2.5, 0.5, 10); },
      flare: function (cu) { return cueNum(cu, 'dur', 3.0, 0.8, 20); } };
    var DUCK = { flow: 0.85, pulse: 0.85, vibe: 0.85, swirl: 0.85, spin: 0.8, torque: 0.85, engine: 0.78, zap: 0.85, winch: 0.8, chain: 0.85, whoosh: 0.85, alarm: 0.75, clunk: 0.8, impact: 0.65, hiss: 0.8, fire: 0.72, pump: 0.8, success: 0.8, blip: 0.95, bubble: 0.88,
      hydraulic: 0.8, rubber: 0.85, shear: 0.65, powerdown: 0.7, ratchet: 0.88, tick: 0.95, valve: 0.82, gas: 0.8, flare: 0.8 };
    // numeric cue parameter with default + clamp (bad / missing values fall back to the default)
    function cueNum(cu, k, def, lo, hi) {
      var v = cu && typeof cu[k] === 'number' && isFinite(cu[k]) ? cu[k] : def;
      return Math.max(lo, Math.min(hi, v));
    }
    // heavy steel-on-steel stop: low sine drop, damped body, low-passed knock, inharmonic partials of `base` Hz
    function steelHit(tt, v, base, wet) {
      if (!ok(tt)) return;
      var oc = osc('sine', 95, tt, tt + 0.55);
      oc.frequency.setValueAtTime(100, tt); oc.frequency.exponentialRampToValueAtTime(38, tt + 0.35);
      var g = gain(0); decayEnv(g, tt, 0.75 * v, 0.5, 0.002); oc.connect(g);
      var b = osc('triangle', 220, tt, tt + 0.18); b.frequency.setValueAtTime(240, tt); b.frequency.exponentialRampToValueAtTime(110, tt + 0.12);
      var bg = gain(0); decayEnv(bg, tt, 0.3 * v, 0.15, 0.002); b.connect(bg); bg.connect(g);
      var n = noise(tt, 0.07), lp = filt('lowpass', 1800, 0.9), ng = gain(0); decayEnv(ng, tt, 0.5 * v, 0.05, 0.0008); n.connect(lp); lp.connect(ng); ng.connect(g);
      var P = [1, 2.32, 4.25, 6.63];
      for (var i = 0; i < P.length; i++) {
        var po = osc('sine', base * P[i], tt, tt + 0.62), pg = gain(0);
        decayEnv(pg, tt, 0.07 * v / (i + 1), 0.6 - i * 0.1, 0.001); po.connect(pg); pg.connect(g);
      }
      outTo(g, { sfx: true, wet: wet == null ? 0.22 : wet });
    }

    var SFX = {
      whoosh: function (t) {
        var n = noise(t, 0.85), bp = filt('bandpass', 300, 1.6);
        bp.frequency.setValueAtTime(300, t);
        bp.frequency.exponentialRampToValueAtTime(3200, t + 0.45);
        bp.frequency.exponentialRampToValueAtTime(700, t + 0.8);
        var g = gain(0);
        g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.55, t + 0.42);
        g.gain.exponentialRampToValueAtTime(0.0005, t + 0.82);
        var pn = ctx.createStereoPanner();
        pn.pan.setValueAtTime(-0.7, t); pn.pan.linearRampToValueAtTime(0.7, t + 0.8);
        n.connect(bp); bp.connect(g); g.connect(pn);
        outTo(pn, { sfx: true, wet: 0.3 });
      },
      alarm: function (t) {
        var g = gain(0), lp = filt('lowpass', 2600, 0.7);
        g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.16, t + 0.03);
        g.gain.setValueAtTime(0.16, t + 1.35); g.gain.linearRampToValueAtTime(0, t + 1.5);
        var o1 = osc('triangle', 660, t, t + 1.55), o2 = osc('sine', 660, t, t + 1.55);
        for (var k = 0; k < 6; k++) {
          var f = k % 2 ? 784 : 622;
          o1.frequency.setValueAtTime(f, t + k * 0.25); o2.frequency.setValueAtTime(f * 2, t + k * 0.25);
        }
        var g2 = gain(0.25); o1.connect(lp); o2.connect(g2); g2.connect(lp); lp.connect(g);
        outTo(g, { sfx: true, wet: 0.25 });
      },
      clunk: function (t) {
        function hit(tt, v) {
          var oc = osc('sine', 110, tt, tt + 0.45);
          oc.frequency.setValueAtTime(120, tt); oc.frequency.exponentialRampToValueAtTime(48, tt + 0.3);
          var g = gain(0); decayEnv(g, tt, v, 0.4, 0.002); oc.connect(g);
          var n = noise(tt, 0.12), bp = filt('bandpass', 500, 1.2), ng = gain(0);
          decayEnv(ng, tt, v * 0.8, 0.1, 0.001); n.connect(bp); bp.connect(ng); ng.connect(g);
          var parts = [523, 1131, 1873, 2650];
          for (var i = 0; i < parts.length; i++) {
            var po = osc('sine', parts[i], tt, tt + 0.3), pg = gain(0);
            decayEnv(pg, tt, v * 0.12 / (i + 1), 0.25 - i * 0.04, 0.001); po.connect(pg); pg.connect(g);
          }
          outTo(g, { sfx: true, wet: 0.2 });
        }
        hit(t, 0.8); hit(t + 0.13, 0.45);
      },
      impact: function (t) {
        boom(t, 1.0, { sfx: true, dur: 2.0, f0: 85, f1: 26, wet: 0.5 });
        crash(t, 0.12, { sfx: true, dec: 1.5 });
        var oc = osc('sine', 55, t, t + 2.0);
        oc.frequency.setValueAtTime(60, t); oc.frequency.exponentialRampToValueAtTime(28, t + 1.8);
        var g = gain(0); decayEnv(g, t, 0.45, 2.0, 0.01); oc.connect(g);
        outTo(g, { sfx: true, wet: 0 });
      },
      hiss: function (t) {
        var n = noise(t, 1.25), hpf = filt('highpass', 2500, 0.7), bp = filt('peaking', 6000, 1); bp.gain.value = 6;
        var g = gain(0);
        g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.22, t + 0.08);
        g.gain.linearRampToValueAtTime(0.16, t + 0.8); g.gain.linearRampToValueAtTime(0, t + 1.2);
        n.connect(hpf); hpf.connect(bp); bp.connect(g);
        outTo(g, { sfx: true, wet: 0.15 });
      },
      fire: function (t) {
        var d = 2.0;
        var n = noise(t, d), lp = filt('lowpass', 900, 0.8), g = gain(0);
        g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.5, t + 0.15);
        g.gain.setValueAtTime(0.5, t + 1.3); g.gain.linearRampToValueAtTime(0, t + d);
        var flick = osc('sine', 7, t, t + d), fg = gain(0.15); flick.connect(fg); fg.connect(g.gain);
        n.connect(lp); lp.connect(g);
        outTo(g, { sfx: true, wet: 0.25 });
        var rum = noise(t, d), rl = filt('lowpass', 160, 1), rg = gain(0);
        rg.gain.setValueAtTime(0, t); rg.gain.linearRampToValueAtTime(0.6, t + 0.2);
        rg.gain.linearRampToValueAtTime(0, t + d);
        rum.connect(rl); rl.connect(rg); outTo(rg, { sfx: true, wet: 0 });
        for (var i = 0; i < 26; i++) {
          var ct = t + rnd() * (d - 0.2), cn = noise(ct, 0.02), cb = filt('bandpass', 1500 + rnd() * 3500, 2), cg = gain(0);
          decayEnv(cg, ct, 0.15 + rnd() * 0.25, 0.015 + rnd() * 0.02, 0.001);
          cn.connect(cb); cb.connect(cg); outTo(cg, { sfx: true, wet: 0.1, pan: rnd() * 1.2 - 0.6 });
        }
      },
      pump: function (t) {
        for (var k = 0; k < 3; k++) {
          var tt = t + k * 0.5;
          var oc = osc('sine', 70, tt, tt + 0.3);
          oc.frequency.setValueAtTime(90, tt); oc.frequency.exponentialRampToValueAtTime(45, tt + 0.2);
          var g = gain(0); decayEnv(g, tt, 0.5, 0.28, 0.005); oc.connect(g);
          var n = noise(tt, 0.3), lp = filt('lowpass', 400, 1.5), ng = gain(0);
          ng.gain.setValueAtTime(0, tt); ng.gain.linearRampToValueAtTime(0.4, tt + 0.05);
          ng.gain.exponentialRampToValueAtTime(0.0005, tt + 0.3);
          n.connect(lp); lp.connect(ng); ng.connect(g);
          var cn = noise(tt + 0.32, 0.03), ch = filt('bandpass', 2400, 3), cg = gain(0);
          decayEnv(cg, tt + 0.32, 0.25, 0.03, 0.001); cn.connect(ch); ch.connect(cg); cg.connect(g);
          outTo(g, { sfx: true, wet: 0.12 });
        }
      },
      success: function (t) {
        var notes = [86, 90, 93];
        for (var k = 0; k < 3; k++) bell(t + k * 0.13, notes[k], 0.16, { sfx: true, dur: k === 2 ? 1.6 : 0.9, wet: 0.5, pan: (k - 1) * 0.3 });
        bell(t + 0.26, 98, 0.04, { sfx: true, dur: 1.2, wet: 0.6 });
      },
      blip: function (t) {
        var oc = osc('sine', 900, t, t + 0.15);
        oc.frequency.setValueAtTime(900, t); oc.frequency.exponentialRampToValueAtTime(1400, t + 0.05);
        var g = gain(0); decayEnv(g, t, 0.14, 0.13, 0.004); oc.connect(g);
        outTo(g, { sfx: true, wet: 0.2 });
      },
      bubble: function (t) {
        for (var k = 0; k < 7; k++) {
          bubble(t + rnd() * 0.65, 300 + rnd() * 600, 0.15, { sfx: true, dur: 0.06 + rnd() * 0.08, pan: rnd() * 1.2 - 0.6, wet: 0.3 });
        }
      },
      // EP05: big diesel prime mover — starter cranks (accelerating chugs + starter whine), catches with a pop,
      // revs up and settles into a firing-rate rumble (~3.2 s)
      engine: function (t) {
        var ct = [0, 0.22, 0.4, 0.55, 0.67];
        for (var k = 0; k < ct.length; k++) {
          var tt = t + ct[k];
          var oc = osc('sine', 80, tt, tt + 0.2);
          oc.frequency.setValueAtTime(85, tt); oc.frequency.exponentialRampToValueAtTime(42, tt + 0.15);
          var g = gain(0); decayEnv(g, tt, 0.3 + 0.05 * k, 0.17, 0.006); oc.connect(g);
          var n = noise(tt, 0.16), lp = filt('lowpass', 600, 1.2), ng = gain(0);
          decayEnv(ng, tt, 0.22 + 0.03 * k, 0.15, 0.008); n.connect(lp); lp.connect(ng); ng.connect(g);
          outTo(g, { sfx: true, wet: 0.1 });
        }
        var wh = osc('sawtooth', 160, t, t + 0.85), wbp = filt('bandpass', 700, 3), wg = gain(0);
        wh.frequency.setValueAtTime(160, t); wh.frequency.exponentialRampToValueAtTime(330, t + 0.8);
        wg.gain.setValueAtTime(0, t); wg.gain.linearRampToValueAtTime(0.05, t + 0.1); wg.gain.linearRampToValueAtTime(0, t + 0.85);
        wh.connect(wbp); wbp.connect(wg); outTo(wg, { sfx: true, wet: 0.15 });
        var t1 = t + 0.8, d = 2.4, stop = t1 + d + 0.05;
        boom(t1, 0.22, { sfx: true, dur: 0.8, f0: 90, f1: 35, wet: 0.2 });
        var elp = filt('lowpass', 420, 1.4);
        elp.frequency.setValueAtTime(300, t1); elp.frequency.linearRampToValueAtTime(700, t1 + 0.5); elp.frequency.linearRampToValueAtTime(380, t1 + 1.3);
        var am = gain(0.55), fire = osc('sine', 9, t1, stop), fg = gain(0.45);
        fire.frequency.setValueAtTime(9, t1); fire.frequency.linearRampToValueAtTime(24, t1 + 0.5); fire.frequency.linearRampToValueAtTime(14, t1 + 1.3);
        fire.connect(fg); fg.connect(am.gain);
        var fr = [[1, 0.5], [1.5, 0.3], [2, 0.2]];
        for (var i = 0; i < fr.length; i++) {
          var so = osc('sawtooth', 41 * fr[i][0], t1, stop);
          so.frequency.setValueAtTime(38 * fr[i][0], t1); so.frequency.linearRampToValueAtTime(62 * fr[i][0], t1 + 0.5); so.frequency.linearRampToValueAtTime(45 * fr[i][0], t1 + 1.3);
          var sg = gain(fr[i][1]); so.connect(sg); sg.connect(elp);
        }
        var rn = noise(t1, d), rl = filt('lowpass', 260, 1), rg = gain(0.8); rn.connect(rl); rl.connect(rg); rg.connect(elp);
        var eg = gain(0);
        eg.gain.setValueAtTime(0, t1); eg.gain.linearRampToValueAtTime(0.42, t1 + 0.08);
        eg.gain.linearRampToValueAtTime(0.3, t1 + 1.0); eg.gain.setValueAtTime(0.3, t1 + 1.6); eg.gain.linearRampToValueAtTime(0, t1 + d);
        elp.connect(am); am.connect(eg);
        outTo(eg, { sfx: true, wet: 0.12 });
      },
      // EP05: electric power surge — jittery arc buzz through a sweeping band-pass, rising power-up whine, crackles (~0.9 s)
      zap: function (t) {
        var d = 0.9, stop = t + d + 0.05;
        var o1 = osc('sawtooth', 120, t, stop), o2 = osc('square', 181, t, stop);
        var jn = noise(t, d), jg = gain(45); jn.connect(jg); jg.connect(o1.frequency); jg.connect(o2.frequency);
        var bp = filt('bandpass', 800, 2.2);
        bp.frequency.setValueAtTime(800, t); bp.frequency.exponentialRampToValueAtTime(4000, t + 0.25); bp.frequency.exponentialRampToValueAtTime(1200, t + d);
        var g = gain(0);
        g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.24, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0005, t + d);
        var g2 = gain(0.5); o1.connect(bp); o2.connect(g2); g2.connect(bp); bp.connect(g);
        outTo(g, { sfx: true, wet: 0.25 });
        var wo = osc('sine', 300, t, t + 0.45), wg = gain(0);
        wo.frequency.setValueAtTime(300, t); wo.frequency.exponentialRampToValueAtTime(2400, t + 0.35);
        wg.gain.setValueAtTime(0, t); wg.gain.linearRampToValueAtTime(0.06, t + 0.2); wg.gain.linearRampToValueAtTime(0, t + 0.42);
        wo.connect(wg); outTo(wg, { sfx: true, wet: 0.35 });
        for (var k = 0; k < 16; k++) {
          var ct = t + rnd() * 0.6, cn = noise(ct, 0.015), cb = filt('highpass', 3000 + rnd() * 4000, 1), cg = gain(0);
          decayEnv(cg, ct, 0.12 + rnd() * 0.2, 0.01 + rnd() * 0.015, 0.0008);
          cn.connect(cb); cb.connect(cg); outTo(cg, { sfx: true, wet: 0.1, pan: rnd() * 1.4 - 0.7 });
        }
      },
      // EP05 P2: drawworks drum winding — geared whirr (sawtooth + harmonic through a sweeping band-pass) with
      // gear-tooth ratchet AM and cable hiss; pitch rises (spooling up) or, with cue {dir:'down'}, falls (braking) (~3 s)
      winch: function (t, cu) {
        var d = 3.0, stop = t + d + 0.05, down = !!(cu && cu.dir === 'down');
        var f0 = down ? 140 : 55, f1 = down ? 50 : 135, r0 = down ? 34 : 12, r1 = down ? 10 : 36;
        var bp = filt('bandpass', 500, 1.6);
        bp.frequency.setValueAtTime(down ? 1400 : 380, t); bp.frequency.exponentialRampToValueAtTime(down ? 360 : 1300, t + d * 0.85);
        var parts = [[1, 0.5, 'sawtooth'], [2.02, 0.25, 'square'], [3.5, 0.08, 'sawtooth']];
        for (var i = 0; i < parts.length; i++) {
          var oc = osc(parts[i][2], f0 * parts[i][0], t, stop);
          oc.frequency.setValueAtTime(f0 * parts[i][0], t); oc.frequency.exponentialRampToValueAtTime(f1 * parts[i][0], t + d * 0.85);
          var og = gain(parts[i][1]); oc.connect(og); og.connect(bp);
        }
        var am = gain(0.6), rat = osc('square', r0, t, stop), rg = gain(0.35);
        rat.frequency.setValueAtTime(r0, t); rat.frequency.exponentialRampToValueAtTime(r1, t + d * 0.85);
        var rl = filt('lowpass', 300, 0.7); rat.connect(rl); rl.connect(rg); rg.connect(am.gain);
        bp.connect(am);
        var g = gain(0);
        g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.3, t + 0.25);
        g.gain.setValueAtTime(0.3, t + d - 0.6); g.gain.linearRampToValueAtTime(0, t + d);
        am.connect(g);
        outTo(g, { sfx: true, wet: 0.15 });
        // cable / drum hiss + low rumble
        var n = noise(t, d), nh = filt('bandpass', down ? 3000 : 1800, 1.2), ng = gain(0);
        nh.frequency.setValueAtTime(down ? 3000 : 1800, t); nh.frequency.exponentialRampToValueAtTime(down ? 1500 : 3200, t + d);
        ng.gain.setValueAtTime(0, t); ng.gain.linearRampToValueAtTime(0.05, t + 0.4); ng.gain.linearRampToValueAtTime(0, t + d);
        n.connect(nh); nh.connect(ng); outTo(ng, { sfx: true, wet: 0.2, pan: 0.2 });
        var rn = noise(t, d), rlp = filt('lowpass', 150, 1), rug = gain(0);
        rug.gain.setValueAtTime(0, t); rug.gain.linearRampToValueAtTime(0.35, t + 0.3); rug.gain.setValueAtTime(0.35, t + d - 0.7); rug.gain.linearRampToValueAtTime(0, t + d);
        rn.connect(rlp); rlp.connect(rug); outTo(rug, { sfx: true, wet: 0 });
        if (down) { // brake band squeal at the end
          var sq = osc('triangle', 1900, t + d - 1.0, t + d), sqg = gain(0);
          sq.frequency.setValueAtTime(1900, t + d - 1.0); sq.frequency.linearRampToValueAtTime(1700, t + d);
          sqg.gain.setValueAtTime(0, t + d - 1.0); sqg.gain.linearRampToValueAtTime(0.025, t + d - 0.6); sqg.gain.linearRampToValueAtTime(0, t + d - 0.05);
          sq.connect(sqg); outTo(sqg, { sfx: true, wet: 0.3 });
        }
      },
      // EP05 P2: elevator latch / slips set — sharp steel click, heavy metallic clank (inharmonic partials), short link rattle (~0.6 s)
      chain: function (t) {
        function metal(tt, v, base, dec) {
          var g = gain(0); decayEnv(g, tt, v, dec, 0.001);
          var parts = [1, 2.76, 5.4, 8.93];
          for (var i = 0; i < parts.length; i++) {
            var po = osc('sine', base * parts[i], tt, tt + dec + 0.02), pg = gain(0.5 / (i + 1));
            po.connect(pg); pg.connect(g);
          }
          var n = noise(tt, 0.03), hpf = filt('highpass', 2500, 0.8), ng = gain(0);
          decayEnv(ng, tt, v * 1.2, 0.03, 0.0008); n.connect(hpf); hpf.connect(ng); ng.connect(g);
          return g;
        }
        outTo(metal(t, 0.25, 1250, 0.08), { sfx: true, wet: 0.15, pan: 0.15 });              // latch click
        var cl = metal(t + 0.07, 0.42, 420, 0.45);                                          // clank
        var th = osc('sine', 110, t + 0.07, t + 0.35); th.frequency.setValueAtTime(130, t + 0.07); th.frequency.exponentialRampToValueAtTime(55, t + 0.3);
        var tg = gain(0); decayEnv(tg, t + 0.07, 0.4, 0.25, 0.002); th.connect(tg); tg.connect(cl);
        outTo(cl, { sfx: true, wet: 0.25 });
        for (var k = 0; k < 5; k++) {
          var rt = t + 0.2 + k * 0.055 + rnd() * 0.02;
          outTo(metal(rt, 0.1 * (1 - k * 0.15), 900 + rnd() * 900, 0.05), { sfx: true, wet: 0.2, pan: rnd() * 0.8 - 0.4 });
        }
      },
      // EP05 P3: rotating machine whirr — geared saw tones through a sweeping band-pass, 'per-revolution' AM and an
      // auto-pan that circles at the rotation rate, plus air swish; spins UP by default, cue {dir:'down'} spins down (~2 s)
      spin: function (t, cu) {
        var d = 2.0, stop = t + d + 0.05, down = !!(cu && cu.dir === 'down');
        var f0 = down ? 150 : 45, f1 = down ? 42 : 150, r0 = down ? 16 : 2.5, r1 = down ? 2 : 16;
        var bp = filt('bandpass', 600, 1.4);
        bp.frequency.setValueAtTime(down ? 1600 : 420, t); bp.frequency.exponentialRampToValueAtTime(down ? 380 : 1600, t + d * 0.8);
        var parts = [[1, 0.5, 'sawtooth'], [1.5, 0.2, 'triangle'], [3.0, 0.1, 'sawtooth']];
        for (var i = 0; i < parts.length; i++) {
          var oc = osc(parts[i][2], f0 * parts[i][0], t, stop);
          oc.frequency.setValueAtTime(f0 * parts[i][0], t); oc.frequency.exponentialRampToValueAtTime(f1 * parts[i][0], t + d * 0.8);
          var og = gain(parts[i][1]); oc.connect(og); og.connect(bp);
        }
        var rot = osc('sine', r0, t, stop); rot.frequency.setValueAtTime(r0, t); rot.frequency.exponentialRampToValueAtTime(r1, t + d * 0.8);
        var rg = gain(0.4); rot.connect(rg);
        var am = gain(0.6); rg.connect(am.gain); bp.connect(am);
        var pn = ctx.createStereoPanner(), pl = osc('sine', r0 / 2, t, stop), pg = gain(0.5);
        pl.frequency.setValueAtTime(r0 / 2, t); pl.frequency.exponentialRampToValueAtTime(r1 / 2, t + d * 0.8);
        pl.connect(pg); pg.connect(pn.pan); am.connect(pn);
        var g = gain(0);
        g.gain.setValueAtTime(0, t);
        if (down) { g.gain.linearRampToValueAtTime(0.3, t + 0.05); g.gain.setValueAtTime(0.3, t + 0.5); g.gain.linearRampToValueAtTime(0, t + d); }
        else { g.gain.linearRampToValueAtTime(0.08, t + 0.3); g.gain.linearRampToValueAtTime(0.3, t + d * 0.7); g.gain.linearRampToValueAtTime(0, t + d); }
        pn.connect(g);
        outTo(g, { sfx: true, wet: 0.15 });
        // air swish, chopped by the same rotation
        var n = noise(t, d), nb = filt('bandpass', 2500, 1.0), na = gain(0.5); rg.connect(na.gain);
        nb.frequency.setValueAtTime(down ? 3500 : 1500, t); nb.frequency.exponentialRampToValueAtTime(down ? 1200 : 3500, t + d * 0.8);
        var ng = gain(0);
        ng.gain.setValueAtTime(0, t);
        if (down) { ng.gain.linearRampToValueAtTime(0.06, t + 0.05); ng.gain.linearRampToValueAtTime(0, t + d); }
        else { ng.gain.linearRampToValueAtTime(0.06, t + d * 0.7); ng.gain.linearRampToValueAtTime(0, t + d); }
        n.connect(nb); nb.connect(na); na.connect(ng);
        outTo(ng, { sfx: true, wet: 0.2 });
      },
      // EP05 P3: wrench / iron-roughneck make-up — accelerating ratchet clicks over a rising tension groan,
      // ending in a solid seating clunk (~0.8 s)
      torque: function (t) {
        function click(tt, v, f) {
          var n = noise(tt, 0.03), bp = filt('bandpass', f, 4), g = gain(0);
          decayEnv(g, tt, v, 0.025, 0.0008); n.connect(bp); bp.connect(g);
          var po = osc('sine', f * 0.37, tt, tt + 0.05), pg = gain(0); decayEnv(pg, tt, v * 0.25, 0.04, 0.001); po.connect(pg); pg.connect(g);
          outTo(g, { sfx: true, wet: 0.12, pan: 0.15 });
        }
        var tt = t;
        for (var k = 0; k < 9; k++) { click(tt, 0.2 + 0.025 * k, 2000 + 160 * k); tt += 0.085 - 0.004 * k; }
        var gr = osc('sawtooth', 70, t, tt + 0.05), gl = filt('lowpass', 500, 2), gg = gain(0);
        gr.frequency.setValueAtTime(70, t); gr.frequency.exponentialRampToValueAtTime(115, tt);
        gg.gain.setValueAtTime(0, t); gg.gain.linearRampToValueAtTime(0.12, tt - 0.05); gg.gain.linearRampToValueAtTime(0, tt + 0.03);
        gr.connect(gl); gl.connect(gg); outTo(gg, { sfx: true, wet: 0.1 });
        // seating clunk
        var oc = osc('sine', 140, tt, tt + 0.25); oc.frequency.setValueAtTime(150, tt); oc.frequency.exponentialRampToValueAtTime(60, tt + 0.18);
        var cg = gain(0); decayEnv(cg, tt, 0.45, 0.2, 0.002); oc.connect(cg);
        var pp = [610, 1640, 2870];
        for (var i = 0; i < pp.length; i++) { var po = osc('sine', pp[i], tt, tt + 0.2), pg = gain(0); decayEnv(pg, tt, 0.08 / (i + 1), 0.16, 0.001); po.connect(pg); pg.connect(cg); }
        var cn = noise(tt, 0.04), ch = filt('highpass', 2500, 0.8), chg = gain(0); decayEnv(chg, tt, 0.3, 0.03, 0.0008); cn.connect(ch); ch.connect(chg); chg.connect(cg);
        outTo(cg, { sfx: true, wet: 0.2 });
      },
      // EP05 P4: liquid rush through a pipe — band-passed noise swell through a sweeping pipe resonance, gurgle AM,
      // low body rumble and a few droplets, travelling across the stereo field (~1.5 s); cue {dir:'down'} sweeps down
      flow: function (t, cu) {
        var d = 1.5, down = !!(cu && cu.dir === 'down');
        var n = noise(t, d), bp = filt('bandpass', 500, 1.3);
        bp.frequency.setValueAtTime(down ? 2200 : 380, t);
        bp.frequency.exponentialRampToValueAtTime(down ? 450 : 2000, t + d * 0.6);
        bp.frequency.exponentialRampToValueAtTime(down ? 300 : 900, t + d);
        var res = filt('peaking', 900, 6); res.gain.value = 7;
        res.frequency.setValueAtTime(down ? 1300 : 600, t); res.frequency.exponentialRampToValueAtTime(down ? 500 : 1300, t + d);
        var am = gain(0.7), gu = osc('sine', 6, t, t + d + 0.05), gg = gain(0.3);
        gu.frequency.setValueAtTime(5, t); gu.frequency.linearRampToValueAtTime(9, t + d);
        gu.connect(gg); gg.connect(am.gain);
        var g = gain(0);
        g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.5, t + d * 0.4);
        g.gain.linearRampToValueAtTime(0.3, t + d * 0.75); g.gain.linearRampToValueAtTime(0, t + d);
        var pn = ctx.createStereoPanner();
        pn.pan.setValueAtTime(down ? 0.6 : -0.6, t); pn.pan.linearRampToValueAtTime(down ? -0.6 : 0.6, t + d);
        n.connect(bp); bp.connect(res); res.connect(am); am.connect(g); g.connect(pn);
        outTo(pn, { sfx: true, wet: 0.3 });
        var rn = noise(t, d), rl = filt('lowpass', 180, 1), rg = gain(0);
        rg.gain.setValueAtTime(0, t); rg.gain.linearRampToValueAtTime(0.3, t + d * 0.4); rg.gain.linearRampToValueAtTime(0, t + d);
        rn.connect(rl); rl.connect(rg); outTo(rg, { sfx: true, wet: 0 });
        for (var k = 0; k < 4; k++) bubble(t + 0.3 + rnd() * 1.0, 400 + rnd() * 500, 0.07, { sfx: true, dur: 0.07, pan: rnd() * 1.2 - 0.6, wet: 0.3 });
      },
      // EP05 P4: one mud-pump stroke — low piston thump, valve click, then a short hydraulic hiss (~0.5 s)
      pulse: function (t) {
        var oc = osc('sine', 95, t, t + 0.35);
        oc.frequency.setValueAtTime(100, t); oc.frequency.exponentialRampToValueAtTime(42, t + 0.22);
        var g = gain(0); decayEnv(g, t, 0.6, 0.32, 0.004); oc.connect(g);
        var n = noise(t, 0.25), lp = filt('lowpass', 350, 1.3), ng = gain(0);
        decayEnv(ng, t, 0.35, 0.22, 0.01); n.connect(lp); lp.connect(ng); ng.connect(g);
        outTo(g, { sfx: true, wet: 0.1 });
        var cn = noise(t + 0.02, 0.03), cb = filt('bandpass', 2800, 3), cg = gain(0);
        decayEnv(cg, t + 0.02, 0.2, 0.025, 0.001); cn.connect(cb); cb.connect(cg); outTo(cg, { sfx: true, wet: 0.15, pan: 0.15 });
        var hn = noise(t + 0.1, 0.42), hh = filt('highpass', 3000, 0.7), hk = filt('peaking', 6500, 1); hk.gain.value = 5;
        var hg = gain(0);
        hg.gain.setValueAtTime(0, t + 0.1); hg.gain.linearRampToValueAtTime(0.13, t + 0.16); hg.gain.linearRampToValueAtTime(0, t + 0.5);
        hn.connect(hh); hh.connect(hk); hk.connect(hg); outTo(hg, { sfx: true, wet: 0.15, pan: -0.15 });
      },
      // EP05 P4: shale-shaker screen buzz — vibrator motor hum + screen rattle amplitude-modulated at the vibration
      // rate, with particles skittering across the deck (~2 s)
      vibe: function (t) {
        var d = 2.0, stop = t + d + 0.05;
        var vib = osc('sine', 24, t, stop), vg = gain(0.5);
        vib.connect(vg);
        var m1 = osc('sawtooth', 50, t, stop), m2 = osc('square', 100, t, stop), ml = filt('lowpass', 420, 1.2), m2g = gain(0.3);
        m1.connect(ml); m2.connect(m2g); m2g.connect(ml);
        var mam = gain(0.5); vg.connect(mam.gain); ml.connect(mam);
        var sn = noise(t, d), sb = filt('bandpass', 1900, 1.5), sam = gain(0.5); vg.connect(sam.gain); sn.connect(sb); sb.connect(sam);
        var g = gain(0);
        g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.3, t + 0.2);
        g.gain.setValueAtTime(0.3, t + d - 0.4); g.gain.linearRampToValueAtTime(0, t + d);
        var sg = gain(0.6); mam.connect(g); sam.connect(sg); sg.connect(g);
        outTo(g, { sfx: true, wet: 0.15 });
        for (var k = 0; k < 30; k++) {
          var ct = t + 0.1 + rnd() * (d - 0.4), cn = noise(ct, 0.02), cb = filt('bandpass', 3000 + rnd() * 3000, 2), cg = gain(0);
          decayEnv(cg, ct, 0.05 + rnd() * 0.08, 0.012 + rnd() * 0.012, 0.0008);
          cn.connect(cb); cb.connect(cg); outTo(cg, { sfx: true, wet: 0.1, pan: rnd() * 1.2 - 0.6 });
        }
      },
      // EP05 P4: hydrocyclone vortex — swirling band-passed noise whose pan circles faster and faster, a rising
      // vortex whistle and a low gurgle at the apex (~2 s)
      swirl: function (t) {
        var d = 2.0, stop = t + d + 0.05;
        var n = noise(t, d), bp = filt('bandpass', 600, 2);
        bp.frequency.setValueAtTime(600, t); bp.frequency.exponentialRampToValueAtTime(2400, t + d * 0.6); bp.frequency.exponentialRampToValueAtTime(900, t + d);
        var rot = osc('sine', 1, t, stop); rot.frequency.setValueAtTime(1, t); rot.frequency.exponentialRampToValueAtTime(6, t + d * 0.8);
        var pn = ctx.createStereoPanner(), pg = gain(0.7); rot.connect(pg); pg.connect(pn.pan);
        var am = gain(0.7), ag = gain(0.3); rot.connect(ag); ag.connect(am.gain);
        var g = gain(0);
        g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.4, t + d * 0.5); g.gain.linearRampToValueAtTime(0.25, t + d * 0.8); g.gain.linearRampToValueAtTime(0, t + d);
        n.connect(bp); bp.connect(am); am.connect(g); g.connect(pn);
        outTo(pn, { sfx: true, wet: 0.3 });
        var wh = osc('sine', 500, t, stop), wg = gain(0);
        wh.frequency.setValueAtTime(500, t); wh.frequency.exponentialRampToValueAtTime(1500, t + d * 0.8);
        wg.gain.setValueAtTime(0, t); wg.gain.linearRampToValueAtTime(0.03, t + d * 0.6); wg.gain.linearRampToValueAtTime(0, t + d);
        wh.connect(wg); outTo(wg, { sfx: true, wet: 0.4 });
        var rn = noise(t, d), rl = filt('lowpass', 250, 1), rg = gain(0);
        rg.gain.setValueAtTime(0, t); rg.gain.linearRampToValueAtTime(0.2, t + 0.5); rg.gain.linearRampToValueAtTime(0, t + d);
        rn.connect(rl); rl.connect(rg); outTo(rg, { sfx: true, wet: 0 });
      },

      // ===== EP05 P5 (Well Control) =====
      // BOP ram close: fluid rushes into the bonnet (band-passed noise rising with pressure) + high-pressure hiss
      // + ram/piston groan for `dur` s, then a heavy steel clunk at the mechanical stop and a short bleed
      hydraulic: function (t, cu) {
        var d = cueNum(cu, 'dur', 0.9, 0.2, 4), te = t + d;
        var n = noise(t, d + 0.1), bp = filt('bandpass', 1200, 1.1), hs = filt('highshelf', 5000); hs.gain.value = -6;
        bp.frequency.setValueAtTime(800, t); bp.frequency.exponentialRampToValueAtTime(2300, te);
        var g = gain(0);
        g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.17, t + 0.06);
        g.gain.linearRampToValueAtTime(0.12, te - 0.04); g.gain.linearRampToValueAtTime(0, te + 0.03);
        n.connect(bp); bp.connect(hs); hs.connect(g); outTo(g, { sfx: true, wet: 0.15, pan: -0.1 });
        var n2 = noise(t, d), hp2 = filt('highpass', 4500, 0.7), g2 = gain(0);
        g2.gain.setValueAtTime(0, t); g2.gain.linearRampToValueAtTime(0.05, t + 0.1); g2.gain.linearRampToValueAtTime(0.075, te - 0.05); g2.gain.linearRampToValueAtTime(0, te + 0.02);
        n2.connect(hp2); hp2.connect(g2); outTo(g2, { sfx: true, wet: 0.2, pan: 0.15 });
        var gr = osc('sawtooth', 46, t, te + 0.05), gl = filt('lowpass', 260, 1.5), gg = gain(0);
        gr.frequency.setValueAtTime(44, t); gr.frequency.linearRampToValueAtTime(66, te);
        gg.gain.setValueAtTime(0, t); gg.gain.linearRampToValueAtTime(0.14, t + 0.18); gg.gain.setValueAtTime(0.14, te - 0.05); gg.gain.linearRampToValueAtTime(0, te + 0.02);
        gr.connect(gl); gl.connect(gg); outTo(gg, { sfx: true, wet: 0.05 });
        steelHit(te, 1.0, 165, 0.22);
        var bn = noise(te + 0.08, 0.3), bh = filt('highpass', 3500, 0.7), bg = gain(0);
        bg.gain.setValueAtTime(0, te + 0.08); bg.gain.linearRampToValueAtTime(0.05, te + 0.12); bg.gain.linearRampToValueAtTime(0, te + 0.38);
        bn.connect(bh); bh.connect(bg); outTo(bg, { sfx: true, wet: 0.25, pan: 0.2 });
      },
      // annular squeeze: stick-slip creak — a slow jittered sawtooth 'slip rate' rising as the rubber tightens,
      // exciting two resonances (rubber body), plus a low squish
      rubber: function (t, cu) {
        var d = cueNum(cu, 'dur', 1.2, 0.3, 4), stop = t + d + 0.05;
        var rate = osc('sawtooth', 22, t, stop);
        rate.frequency.setValueAtTime(18 + rnd() * 4, t); rate.frequency.linearRampToValueAtTime(46 + rnd() * 6, t + d * 0.85);
        var jit = osc('sine', 3.3, t, stop), jg = gain(5); jit.connect(jg); jg.connect(rate.frequency);
        var jit2 = osc('sine', 7.1, t, stop), jg2 = gain(3); jit2.connect(jg2); jg2.connect(rate.frequency);
        var r1 = filt('bandpass', 480, 6), r2 = filt('bandpass', 1050, 5), lp = filt('lowpass', 1800, 0.7);
        r1.frequency.setValueAtTime(440, t); r1.frequency.linearRampToValueAtTime(540, t + d);
        r2.frequency.setValueAtTime(980, t); r2.frequency.linearRampToValueAtTime(1150, t + d);
        var r2g = gain(0.6); rate.connect(r1); rate.connect(r2); r2.connect(r2g); r1.connect(lp); r2g.connect(lp);
        var g = gain(0);
        g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.3, t + 0.15);
        g.gain.setValueAtTime(0.3, t + d * 0.7); g.gain.linearRampToValueAtTime(0, t + d);
        lp.connect(g); outTo(g, { sfx: true, wet: 0.2 });
        var sn = noise(t, d), sl = filt('lowpass', 240, 1), sg = gain(0);
        sg.gain.setValueAtTime(0, t); sg.gain.linearRampToValueAtTime(0.22, t + d * 0.4); sg.gain.linearRampToValueAtTime(0, t + d);
        sn.connect(sl); sl.connect(sg); outTo(sg, { sfx: true, wet: 0.05 });
      },
      // blind-shear cut: strain groan + hydraulic hiss for `pre` s, then crunch/tear grains, a deep impact and a long
      // inharmonic metallic ring (beating partial pairs)
      shear: function (t, cu) {
        var pre = cueNum(cu, 'pre', 0.35, 0, 2), tc = t + pre;
        if (pre > 0.02) {
          var gr = osc('sawtooth', 40, t, tc + 0.05), gl = filt('lowpass', 230, 1.6), gg = gain(0);
          gr.frequency.setValueAtTime(38, t); gr.frequency.linearRampToValueAtTime(58, tc);
          gg.gain.setValueAtTime(0, t); gg.gain.linearRampToValueAtTime(0.16, tc - 0.02); gg.gain.linearRampToValueAtTime(0, tc + 0.03);
          gr.connect(gl); gl.connect(gg); outTo(gg, { sfx: true, wet: 0.05 });
          var hn = noise(t, pre), hb = filt('bandpass', 2000, 1), hg = gain(0);
          hg.gain.setValueAtTime(0, t); hg.gain.linearRampToValueAtTime(0.07, tc - 0.02); hg.gain.linearRampToValueAtTime(0, tc + 0.01);
          hn.connect(hb); hb.connect(hg); outTo(hg, { sfx: true, wet: 0.15 });
        }
        for (var k = 0; k < 34; k++) { // crunch: dense metal-tear grains, thinning out
          var x = k / 34, ct = tc + 0.3 * x * x + rnd() * 0.02, cn = noise(ct, 0.035), cb = filt('bandpass', 1200 + rnd() * 4000, 3), cg = gain(0);
          decayEnv(cg, ct, (0.32 - 0.22 * x) * (0.7 + 0.3 * rnd()), 0.012 + rnd() * 0.02, 0.0008);
          cn.connect(cb); cb.connect(cg); outTo(cg, { sfx: true, wet: 0.15, pan: rnd() * 0.8 - 0.4 });
        }
        var tn = noise(tc, 0.35), tb = filt('bandpass', 900, 1.2), tg = gain(0);
        tg.gain.setValueAtTime(0, tc); tg.gain.linearRampToValueAtTime(0.3, tc + 0.01); tg.gain.exponentialRampToValueAtTime(0.0005, tc + 0.32);
        tn.connect(tb); tb.connect(tg); outTo(tg, { sfx: true, wet: 0.2 });
        boom(tc, 0.5, { sfx: true, dur: 1.2, f0: 90, f1: 32, wet: 0.3 });
        steelHit(tc, 0.9, 140, 0.3);
        var RING = [523, 1247, 1861, 2742, 3910];
        var rg = gain(0); decayEnv(rg, tc + 0.01, 1, 2.6, 0.002);
        for (var i = 0; i < RING.length; i++) for (var s2 = 0; s2 < 2; s2++) {
          var ro = osc('sine', RING[i] + s2 * (1.3 + i * 0.4), tc, tc + 2.7), rpg = gain(0.045 / (1 + i * 0.7));
          ro.connect(rpg); rpg.connect(rg);
        }
        outTo(rg, { sfx: true, wet: 0.5, pan: 0.1 });
      },
      // rig power off: generator hum fades in `pre` s before t; at t a breaker clack and the load drops, then the
      // machine winds down (hum pitch + filter + falling alternator whine) over `dur` s; a felt low 'lights out' thud
      powerdown: function (t, cu) {
        var pre = Math.min(cueNum(cu, 'pre', 0.4, 0, 2), t), dn = cueNum(cu, 'dur', 2.2, 0.5, 6), t0 = t - pre, stop = t + dn + 0.05;
        var lp = filt('lowpass', 700, 1.1);
        lp.frequency.setValueAtTime(700, t0); lp.frequency.setValueAtTime(700, t); lp.frequency.exponentialRampToValueAtTime(90, t + dn);
        var H = [[60, 0.5, 'sawtooth'], [120, 0.25, 'sine'], [180, 0.12, 'sine'], [360, 0.05, 'sine']];
        for (var i = 0; i < H.length; i++) {
          var ho = osc(H[i][2], H[i][0], t0, stop);
          ho.frequency.setValueAtTime(H[i][0], t); ho.frequency.exponentialRampToValueAtTime(H[i][0] * 0.15, t + dn);
          var hg = gain(H[i][1]); ho.connect(hg); hg.connect(lp);
        }
        var g = gain(0);
        g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(0.3, t0 + Math.min(pre, 0.2) + 0.001);
        g.gain.setValueAtTime(0.3, t); g.gain.linearRampToValueAtTime(0.2, t + 0.05); g.gain.exponentialRampToValueAtTime(0.0005, t + dn);
        lp.connect(g); outTo(g, { sfx: true, wet: 0.12 });
        var wo = osc('sine', 1400, t, t + dn * 0.85), wg = gain(0);
        wo.frequency.setValueAtTime(1400, t); wo.frequency.exponentialRampToValueAtTime(160, t + dn * 0.8);
        wg.gain.setValueAtTime(0, t); wg.gain.linearRampToValueAtTime(0.03, t + 0.08); wg.gain.exponentialRampToValueAtTime(0.0005, t + dn * 0.8);
        wo.connect(wg); outTo(wg, { sfx: true, wet: 0.3 });
        // breaker clack
        var cn = noise(t, 0.04), ch = filt('highpass', 2500, 0.8), cg = gain(0); decayEnv(cg, t, 0.32, 0.03, 0.0006);
        cn.connect(ch); ch.connect(cg); outTo(cg, { sfx: true, wet: 0.2, pan: 0.2 });
        var po = osc('sine', 880, t, t + 0.08), pg = gain(0); decayEnv(pg, t, 0.06, 0.06, 0.001); po.connect(pg); outTo(pg, { sfx: true, wet: 0.2, pan: 0.2 });
        boom(t + 0.01, 0.28, { sfx: true, dur: 1.4, f0: 70, f1: 26, wet: 0.25 });
      },
      // handwheel / ratchet wrench: pawl clicks at `rate`/s in groups of five (the hand re-grips)
      ratchet: function (t, cu) {
        var d = cueNum(cu, 'dur', 1.2, 0.1, 6), rate = cueNum(cu, 'rate', 9, 2, 30);
        function click(tt, v, f) {
          var n = noise(tt, 0.025), bp = filt('bandpass', f, 6), g = gain(0);
          decayEnv(g, tt, v, 0.018, 0.0006); n.connect(bp); bp.connect(g);
          var po = osc('sine', f * 0.62, tt, tt + 0.04), pg = gain(0); decayEnv(pg, tt, v * 0.2, 0.03, 0.0008); po.connect(pg); pg.connect(g);
          var lo = osc('sine', 380, tt, tt + 0.05), lg = gain(0); lo.frequency.setValueAtTime(380, tt); lo.frequency.exponentialRampToValueAtTime(240, tt + 0.04);
          decayEnv(lg, tt, v * 0.3, 0.04, 0.001); lo.connect(lg); lg.connect(g);
          outTo(g, { sfx: true, wet: 0.12, pan: 0.1 });
        }
        var tt = t, k = 0;
        while (tt < t + d && k < 200) {
          click(tt, (k % 5 === 4 ? 0.3 : 0.22) * (0.85 + 0.3 * rnd()), 3000 + rnd() * 900);
          k++; tt += (1 / rate) * (0.9 + 0.2 * rnd()); if (k % 5 === 0) tt += 0.12;
        }
      },
      // gauge / timer / chart-recorder tick: n short mechanical ticks at `rate`/s, alternating tick / tock
      tick: function (t, cu) {
        var n = Math.round(cueNum(cu, 'n', 1, 1, 64)), rate = cueNum(cu, 'rate', 2, 0.5, 20);
        for (var k = 0; k < n; k++) {
          var tt = t + k / rate, tk = k % 2;
          if (!ok(tt)) break;
          var ns = noise(tt, 0.015), hp = filt('highpass', 3500, 0.7), bp = filt('bandpass', tk ? 4600 : 5200, 2), g = gain(0);
          decayEnv(g, tt, 0.16, 0.009, 0.0004); ns.connect(hp); hp.connect(bp); bp.connect(g);
          var po = osc('sine', tk ? 2500 : 2900, tt, tt + 0.03), pg = gain(0); decayEnv(pg, tt, 0.035, 0.02, 0.0006); po.connect(pg); pg.connect(g);
          var bo = osc('sine', 900, tt, tt + 0.02), bg = gain(0); decayEnv(bg, tt, 0.045, 0.012, 0.0006); bo.connect(bg); bg.connect(g);
          outTo(g, { sfx: true, wet: 0.08, pan: 0.25 });
        }
      },
      // gate valve seating: muffled heavy thunk (low sine + damped body + low-passed knock, faint steel);
      // cue {open:true} adds a short fluid whoomph as flow starts
      valve: function (t, cu) {
        var oc = osc('sine', 72, t, t + 0.5);
        oc.frequency.setValueAtTime(76, t); oc.frequency.exponentialRampToValueAtTime(38, t + 0.32);
        var g = gain(0); decayEnv(g, t, 0.7, 0.45, 0.003); oc.connect(g);
        var b = osc('triangle', 180, t, t + 0.15); b.frequency.setValueAtTime(190, t); b.frequency.exponentialRampToValueAtTime(115, t + 0.1);
        var bg = gain(0); decayEnv(bg, t, 0.25, 0.12, 0.002); b.connect(bg); bg.connect(g);
        var n = noise(t, 0.1), lp = filt('lowpass', 700, 1), ng = gain(0); decayEnv(ng, t, 0.45, 0.08, 0.001); n.connect(lp); lp.connect(ng); ng.connect(g);
        var P = [610, 1430];
        for (var i = 0; i < P.length; i++) { var po = osc('sine', P[i], t, t + 0.15), pg = gain(0); decayEnv(pg, t, 0.05 / (i + 1), 0.12, 0.001); po.connect(pg); pg.connect(g); }
        outTo(g, { sfx: true, wet: 0.18 });
        if (cu && cu.open) {
          var fn = noise(t + 0.08, 0.7), fb = filt('bandpass', 400, 1.2), fg = gain(0);
          fb.frequency.setValueAtTime(400, t + 0.08); fb.frequency.exponentialRampToValueAtTime(900, t + 0.5);
          fg.gain.setValueAtTime(0, t + 0.08); fg.gain.linearRampToValueAtTime(0.14, t + 0.25); fg.gain.linearRampToValueAtTime(0, t + 0.75);
          fn.connect(fb); fb.connect(fg); outTo(fg, { sfx: true, wet: 0.3 });
        }
      },
      // gas through mud: accelerating bubbles + low glug; with vent (default) a turbulent roar swells in from 30 %
      gas: function (t, cu) {
        var d = cueNum(cu, 'dur', 2.5, 0.5, 10), vent = !(cu && cu.vent === false), stop = t + d + 0.05;
        var nb = Math.round(d * 14);
        for (var k = 0; k < nb; k++) {
          var x = k / nb, bt = t + d * 0.9 * Math.sqrt(x) + rnd() * 0.04;
          bubble(bt, 180 + rnd() * 520, (0.07 + 0.07 * rnd()) * (vent ? 1 - 0.5 * x : 1), { sfx: true, dur: 0.05 + rnd() * 0.09, pan: rnd() * 1.2 - 0.6, wet: 0.3 });
        }
        var gn = noise(t, d), gl = filt('lowpass', 300, 1.2), am = gain(0.7), lf = osc('sine', 6.5, t, stop), lfg = gain(0.3);
        lf.connect(lfg); lfg.connect(am.gain);
        var gg = gain(0); gg.gain.setValueAtTime(0, t); gg.gain.linearRampToValueAtTime(0.18, t + 0.3); gg.gain.linearRampToValueAtTime(0, t + d);
        gn.connect(gl); gl.connect(am); am.connect(gg); outTo(gg, { sfx: true, wet: 0.1 });
        if (vent) {
          var v0 = t + d * 0.3;
          var rn = noise(v0, d * 0.7), rb = filt('bandpass', 700, 0.6), rl = filt('lowpass', 2500, 0.7);
          var ram = gain(0.75), s1 = osc('sine', 3.3, v0, stop), s2 = osc('sine', 5.7, v0, stop), s1g = gain(0.15), s2g = gain(0.1);
          s1.connect(s1g); s1g.connect(ram.gain); s2.connect(s2g); s2g.connect(ram.gain);
          var rg = gain(0);
          rg.gain.setValueAtTime(0, v0); rg.gain.linearRampToValueAtTime(0.3, t + d * 0.6); rg.gain.setValueAtTime(0.3, t + d - 0.4); rg.gain.linearRampToValueAtTime(0, t + d);
          rn.connect(rb); rb.connect(rl); rl.connect(ram); ram.connect(rg); outTo(rg, { sfx: true, wet: 0.25 });
          var un = noise(v0, d * 0.7), ul = filt('lowpass', 120, 1), ug = gain(0);
          ug.gain.setValueAtTime(0, v0); ug.gain.linearRampToValueAtTime(0.35, t + d * 0.6); ug.gain.linearRampToValueAtTime(0, t + d);
          un.connect(ul); ul.connect(ug); outTo(ug, { sfx: true, wet: 0 });
        }
      },
      // controlled flare: soft, warm, steady roar with a slow flicker, low rumble, faint burner hiss, rare soft pops
      flare: function (t, cu) {
        var d = cueNum(cu, 'dur', 3.0, 0.8, 20), stop = t + d + 0.05, rel = Math.min(0.8, d * 0.3);
        var n = noise(t, d), lp = filt('lowpass', 650, 0.7), pk = filt('peaking', 180, 1); pk.gain.value = 4;
        var g = gain(0);
        g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.3, t + 0.6); g.gain.setValueAtTime(0.3, t + d - rel); g.gain.linearRampToValueAtTime(0, t + d);
        var am = gain(0.85), f1 = osc('sine', 0.9, t, stop), f2 = osc('sine', 3.7, t, stop), f1g = gain(0.08), f2g = gain(0.05);
        f1.connect(f1g); f1g.connect(am.gain); f2.connect(f2g); f2g.connect(am.gain);
        n.connect(lp); lp.connect(pk); pk.connect(am); am.connect(g); outTo(g, { sfx: true, wet: 0.3 });
        var rn = noise(t, d), rl = filt('lowpass', 110, 1), rg = gain(0);
        rg.gain.setValueAtTime(0, t); rg.gain.linearRampToValueAtTime(0.38, t + 0.8); rg.gain.setValueAtTime(0.38, t + d - rel); rg.gain.linearRampToValueAtTime(0, t + d);
        rn.connect(rl); rl.connect(rg); outTo(rg, { sfx: true, wet: 0 });
        var hn = noise(t, d), hb = filt('bandpass', 3000, 0.8), hg = gain(0);
        hg.gain.setValueAtTime(0, t); hg.gain.linearRampToValueAtTime(0.022, t + 0.8); hg.gain.setValueAtTime(0.022, t + d - rel); hg.gain.linearRampToValueAtTime(0, t + d);
        hn.connect(hb); hb.connect(hg); outTo(hg, { sfx: true, wet: 0.3, pan: 0.2 });
        var np = Math.min(24, Math.round(d * 2));
        for (var k = 0; k < np; k++) {
          var ct = t + 0.4 + rnd() * Math.max(0.1, d - 0.9), cn = noise(ct, 0.04), cl = filt('lowpass', 900, 1), cg = gain(0);
          decayEnv(cg, ct, 0.06 + rnd() * 0.05, 0.03 + rnd() * 0.03, 0.002);
          cn.connect(cl); cl.connect(cg); outTo(cg, { sfx: true, wet: 0.2, pan: rnd() * 0.8 - 0.4 });
        }
      }
    };

    // ---------- cues: each one renders into its own vol / pan stage, then ducks the music ----------
    var DR = 50, dn = Math.max(2, Math.ceil(END * DR) + 1);
    var dcurve = new Float32Array(dn);
    for (i = 0; i < dn; i++) dcurve[i] = 1;
    for (var q = 0; q < cues.length; q++) {
      var cu = cues[q];
      if (!cu || typeof cu.t !== 'number' || !isFinite(cu.t) || typeof cu.sfx !== 'string' || !SFX.hasOwnProperty(cu.sfx)) continue; // unknown -> ignored
      if (cu.t < 0 || cu.t >= END) continue;
      var cvol = cueNum(cu, 'vol', 1, 0, 2);
      if (cvol <= 0) continue;
      var cdry = gain(cvol), cwet = gain(cvol);
      if (typeof cu.pan === 'number' && isFinite(cu.pan) && cu.pan !== 0) {
        var cpn = ctx.createStereoPanner(); cpn.pan.value = Math.max(-1, Math.min(1, cu.pan));
        cdry.connect(cpn); cpn.connect(sfxBus);
      } else cdry.connect(sfxBus);
      cwet.connect(sfxVerbIn);
      sfxOut = cdry; sfxVerbOut = cwet;
      try { SFX[cu.sfx](cu.t, cu); } catch (e) { /* a malformed cue must never break the render */ }
      sfxOut = null; sfxVerbOut = null;
      var sl = SFXLEN[cu.sfx], slen = typeof sl === 'function' ? sl(cu) : sl;
      var ds = cu.t - 0.08 - (cu.sfx === 'powerdown' ? cueNum(cu, 'pre', 0.4, 0, 2) : 0), de = cu.t + slen;
      var amt = 1 - (1 - DUCK[cu.sfx]) * Math.min(1, cvol);
      for (i = 0; i < dn; i++) {
        var tt = i / DR, w = 0;
        if (tt >= ds && tt <= de) w = 1;
        else if (tt > de && tt < de + 0.4) w = 1 - (tt - de) / 0.4;
        else if (tt < ds && tt > ds - 0.08) w = 1 - (ds - tt) / 0.08;
        var v = 1 - (1 - amt) * w;
        if (v < dcurve[i]) dcurve[i] = v;
      }
    }
    duck.gain.setValueCurveAtTime(dcurve, 0, END);

    return ctx.startRendering().then(function (buf) {
      var Lc = buf.getChannelData(0), Rc = buf.getChannelData(1), n = buf.length, i, k;
      // --- integrated loudness (ITU-R BS.1770-4: K-weighting, 400 ms blocks / 75 % overlap, -70 LUFS + relative -10 LU gates)
      function kw(x) {
        var y = new Float32Array(x.length);
        var b0 = 1.53512485958697, b1 = -2.69169618940638, b2 = 1.19839281085285, a1 = -1.69065929318241, a2 = 0.73248077421585;
        var d1 = -1.99004745483398, d2 = 0.99007225036621; // stage 2: RLB high-pass (b = 1, -2, 1)
        var x1 = 0, x2 = 0, y1 = 0, y2 = 0, w1 = 0, w2 = 0;
        for (var j = 0; j < x.length; j++) {
          var s = b0 * x[j] + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2; x2 = x1; x1 = x[j];
          var o2 = s - 2 * y1 + y2 - d1 * w1 - d2 * w2; y2 = y1; y1 = s; w2 = w1; w1 = o2;
          y[j] = o2;
        }
        return y;
      }
      var STEP = Math.round(0.1 * SR), nsub = Math.floor(n / STEP), subL = new Float64Array(nsub), kL = kw(Lc), kR = kw(Rc);
      for (k = 0; k < nsub; k++) {
        var acc = 0;
        for (i = k * STEP; i < (k + 1) * STEP; i++) acc += kL[i] * kL[i] + kR[i] * kR[i];
        subL[k] = acc / STEP;
      }
      var blocks = [];
      for (k = 0; k + 4 <= nsub; k++) blocks.push((subL[k] + subL[k + 1] + subL[k + 2] + subL[k + 3]) / 4);
      function lufs(p) { return -0.691 + 10 * Math.log10(Math.max(p, 1e-12)); }
      var g1 = blocks.filter(function (p) { return lufs(p) > -70; });
      var mean1 = g1.reduce(function (a, b) { return a + b; }, 0) / Math.max(1, g1.length);
      var g2 = g1.filter(function (p) { return lufs(p) > lufs(mean1) - 10; });
      var mean2 = g2.reduce(function (a, b) { return a + b; }, 0) / Math.max(1, g2.length);
      var LI = g2.length ? lufs(mean2) : -70;
      // --- true peak: sample peak + 4x windowed-sinc interpolation around the loud samples
      var sp = 0;
      for (i = 0; i < n; i++) { var a = Math.abs(Lc[i]), b = Math.abs(Rc[i]); if (a > sp) sp = a; if (b > sp) sp = b; }
      var TAPS = 8, PH = [0.25, 0.5, 0.75], CO = [];
      for (k = 0; k < PH.length; k++) {
        var row = [];
        for (var j = -TAPS + 1; j <= TAPS; j++) {
          var xx = PH[k] - j, sinc = Math.abs(xx) < 1e-9 ? 1 : Math.sin(Math.PI * xx) / (Math.PI * xx);
          var w = 0.5 + 0.5 * Math.cos(Math.PI * xx / (TAPS + 0.5));
          row.push(sinc * w);
        }
        CO.push(row);
      }
      var tp = sp, thr = sp * 0.6;
      [Lc, Rc].forEach(function (x) {
        for (var m = TAPS; m < n - TAPS - 1; m++) {
          if (Math.abs(x[m]) < thr && Math.abs(x[m + 1]) < thr) continue;
          for (var p = 0; p < CO.length; p++) {
            var s = 0, row = CO[p];
            for (var jj = 0; jj < row.length; jj++) s += row[jj] * x[m - TAPS + 1 + jj];
            if (Math.abs(s) > tp) tp = Math.abs(s);
          }
        }
      });
      var gL = Math.pow(10, (-20 - LI) / 20), gT = tp > 1e-9 ? Math.pow(10, -1.5 / 20) / tp : 1;
      var g = Math.min(gL, gT);
      var fadeN = Math.min(n, Math.round(0.02 * SR));
      var dataLen = n * 4, out = new Uint8Array(44 + dataLen), dv = new DataView(out.buffer);
      function str(o, s) { for (var kk = 0; kk < s.length; kk++) out[o + kk] = s.charCodeAt(kk); }
      str(0, 'RIFF'); dv.setUint32(4, 36 + dataLen, true); str(8, 'WAVE');
      str(12, 'fmt '); dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, 2, true);
      dv.setUint32(24, SR, true); dv.setUint32(28, SR * 4, true); dv.setUint16(32, 4, true); dv.setUint16(34, 16, true);
      str(36, 'data'); dv.setUint32(40, dataLen, true);
      var off = 44;
      for (i = 0; i < n; i++) {
        var f = i >= n - fadeN ? (n - 1 - i) / fadeN : 1;
        var l = Math.max(-1, Math.min(1, Lc[i] * g * f)), r = Math.max(-1, Math.min(1, Rc[i] * g * f));
        dv.setInt16(off, Math.round(l * 32767), true);
        dv.setInt16(off + 2, Math.round(r * 32767), true);
        off += 4;
      }
      Score.lastStats = { lufsPre: LI, truePeakPre: tp, gainDb: 20 * Math.log10(g), lufs: LI + 20 * Math.log10(g), truePeakDb: 20 * Math.log10(tp * g) };
      return out;
    });
  }

  window.Score = { renderWav: renderWav, SAMPLE_RATE: SR, BPM: 72, DURATION: DURATION };
})();
