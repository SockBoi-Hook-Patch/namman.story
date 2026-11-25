/* music.js — original synthesized score + SFX for namman.story EP05 "Drilling Rig 101 — Part 3/5: Rotating System", 153 s.
 * Classic browser script. Defines window.Score.renderWav(duration, cues) -> Promise<Uint8Array>
 * (16-bit PCM WAV, 48 kHz, stereo, exactly `duration` seconds), rendered with OfflineAudioContext.
 * Same synth engine / SFX / mix chain as EP01–EP05 Part 2 for a consistent channel sound; new arrangement.
 *
 * "DRILLING RIG 101" series theme (reused across Parts 1–5): confident, industrial, educational. E major.
 * Tempo 120 BPM grid felt in HALF-TIME (~60 BPM pulse; beat 0.5 s, bar 2 s). Short 1-s bars realign so
 * 7, 17, 25, 33, 41, 49, 53, 57, 64, 70, 77, 82, 87, 91, 96, 108, 119, 127, 135, 143, 150 land on downbeats. Melodic
 * hooks stay sparse (accents / gaps); under speech the bed is pads, low (<1.5 kHz) ostinati and >7 kHz ticks.
 * Part 3 colour: a 'rotation' figure (16th arpeggio on a 6-step cycle whose pan circles) runs through the spinning parts.
 * Sections: 0–7 title (OPEN signature at 0.8; rig pulse wakes at 4) · 7–17 what the rotating system does (half-time
 *   groove; rotation figure enters at 8) · 17–33 TOP DRIVE: big arrival, heroic E–C–D + motor hum (17), electric
 *   voltBar drive (25) · 33–49 KELLY + rotary table: vintage square-wave pad with tape wobble, oom-pah bass,
 *   chain-drive chug · 49–57 Kelly (retro, 49) vs Top Drive (electric, 53) · 57–96 DOWN THE DRILL STRING: one
 *   continuous descent (pad darkens, falling arpeggios, low drone) with a lift + one bell of a descending line on each
 *   component: Drill Pipe 57, HWDP 64, Drill Collar 70, Stabilizer 77, Jar 82 (tension -> jar hit 84), MWD 87
 *   (digital mud-pulse colour), Mud Motor 91 (churning rotor) · 96–108 DRILL BITS: crunchy — PDC shearing grind
 *   96–102, Tricone crushing triplet toms 102–108 · 108–119 rig-floor tools: mechanical gear groove, spin-in 112,
 *   ratchet tightening 113.3–115, made-up stab 115 · 119–127 drilling parameters: focused counting pulse
 *   · 127–135 recap · 135–143 call to action, warm (gap at 138.6 for the success SFX) · 143–150 teaser
 *   (Circulating System): flowing, liquid — rolling arps, bubbles, swells, rising bell line · 150 resolved signature
 *   on E, tail; master fade -> silent by END-0.5.
 * SFX: all EP01–EP05 Part 2 SFX incl. 'engine', 'zap', 'winch' (cue {dir:'down'} falls) and 'chain'. New in Part 3:
 *   'spin' (rotating machine whirr, ~2 s: spins up by default; cue {dir:'down'} spins down), 'torque' (ratcheting
 *   wrench / iron-roughneck tightening burst ending in a seating clunk, ~0.8 s).
 * "namman.story" SIGNATURE MOTIF (series-wide, scale degrees 5-1-2-3, rhythm 8th-8th-8th-long):
 *   B4 E5 F#5 G#5 (71 76 78 80) — open over Amaj7 at 0.8 s; resolved over E at 150.0 s.
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
  var DURATION = 153;

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
    master.gain.setValueAtTime(1, Math.max(0, END - 2.5));
    master.gain.linearRampToValueAtTime(0, Math.max(0.01, END - 0.5)); // last 0.5 s silent

    var musicBus = ctx.createGain();
    var section = ctx.createGain();
    var duck = ctx.createGain();
    musicBus.connect(section); section.connect(duck); duck.connect(master);
    var musicVerbIn = ctx.createGain();
    var musicVerb = ctx.createConvolver(); musicVerb.buffer = IR;
    musicVerbIn.connect(musicVerb); musicVerb.connect(section);

    var sfxBus = ctx.createGain(); sfxBus.gain.value = 1.0; sfxBus.connect(master);
    var sfxVerbIn = ctx.createGain();
    var sfxVerb = ctx.createConvolver(); sfxVerb.buffer = IR;
    sfxVerbIn.connect(sfxVerb); sfxVerb.connect(master);

    // section loudness arc (music only)
    var arc = [[0, 0.959], [7, 1.007], [16.9, 1.055], [17, 1.175], [19, 1.115], [25, 1.102], [33, 1.03], [41, 1.04], [49, 1.04], [53, 1.08], [57, 1.06], [87, 1.05], [95.9, 1.07], [96, 1.16], [100, 1.13], [108, 1.08], [119, 1.03], [127, 1.102], [135, 1.055], [143, 1.055], [150, 1.198], [END, 1.198]]; // same level family as Parts 1–2
    section.gain.setValueAtTime(arc[0][1], 0);
    for (var ai = 1; ai < arc.length; ai++) section.gain.linearRampToValueAtTime(arc[ai][1], arc[ai][0]);

    // ---------- helpers ----------
    function outTo(node, o) {
      o = o || {};
      var bus = o.sfx ? sfxBus : musicBus;
      var vin = o.sfx ? sfxVerbIn : musicVerbIn;
      var n = node;
      if (o.pan) { var p = ctx.createStereoPanner(); p.pan.value = Math.max(-1, Math.min(1, o.pan)); node.connect(p); n = p; }
      n.connect(bus);
      var wet = o.wet == null ? 0.2 : o.wet;
      if (wet > 0) { var g = ctx.createGain(); g.gain.value = wet; n.connect(g); g.connect(vin); }
      return n;
    }
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
      outTo(g, { wet: 0.4 });
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
        var tt = t0 + i * 0.25;
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

    // ============ SCORE ============
    // ---- TITLE 0–7 'Part 3 · Rotating System': E(add9) swell, OPEN signature at 0.8 (long 3rd over Amaj7), rig wakes at 4 ----
    pad(0, 1.55, CH.Eadd9.pad, { vol: 0.1, att: 1.1, rel: 0.5, cut0: 500, cut1: 1800, wet: 0.65, width: 0.85 });
    pad(0.3, 4.0, [76, 80, 83], { type: 'triangle', vol: 0.025, att: 1.8, rel: 0.8, cut0: 2200, cut1: 4500, wet: 0.8, width: 0.9 });
    sig(0.8, 0.075, { last: 2.6 });
    pad(1.55, 4.2, CH.Amaj7.pad, { vol: 0.085, att: 0.25, rel: 0.4, cut0: 900, cut1: 1400, wet: 0.6, width: 0.9 });
    bass(1.55, 2.5, 45, { vol: 0.12, att: 0.4, rel: 0.4 });
    for (s = 0; s < 3; s++) tick(2.75 + s * 0.5, 0.01 + s * 0.003);
    bars([['Csm7', 4, 2], ['Bsus4', 6, 1]], function (c, t0, L, i) { rigBar(c, t0, L, 0.3 + 0.3 * i, { att: i ? 0.1 : 0.5 }); });
    rotLine(5, 2, CH.Bsus4, 0.35, 900);
    rollTo(7, 6, 0.02, 0.01);
    riser(5.8, 7, 0.06, 400, 4000);

    // ---- WHAT THE ROTATING SYSTEM DOES 7–17: half-time groove; the string starts turning at 8 (rotation figure fades in) ----
    crash(7, 0.04); kick(7, 0.45); chime(7.02, CH.E, 0.022);
    bars([['E', 7, 2], ['BD', 9, 2], ['Csm7', 11, 2], ['A', 13, 2], ['Bsus4', 15, 2]], function (c, t0, L, i) {
      var lv = 0.5 + i * 0.06, br = i / 8;
      pad(t0, t0 + L, c.pad, { vol: 0.045 + 0.01 * br, att: 0.15, rel: 0.3, cut0: 800 + 400 * br, cut1: 950 + 400 * br, wet: 0.5, width: 0.9 });
      groove(t0, c, i, { lv: lv, br: br * 0.6, noKick1: t0 === 7 });
      if (i === 0) rotLine(t0 + 1, 1, c, 0.35, 900);
      else rotLine(t0, L, c, 0.4 + 0.1 * i, 950 + 60 * i);
    });
    rollTo(17, 8, 0.02, 0.009);
    riser(15.6, 17, 0.07, 350, 4800);

    // ---- TOP DRIVE 17–33: powerful — arrival hit, heroic E–C–D, motor hum; 25–33 electric drive (voltBar + rotation) ----
    kick(17, 0.48); crash(17, 0.07, { dec: 2.6 }); tom(17, 55, 0.16, { dec: 0.9 });
    stab(17, CH.E.pad.concat([71]), 0.1, { rel: 1.8, cut0: 3400, cut1: 700, wet: 0.6 });
    bass(17, 1.8, 28, { vol: 0.07 });
    for (s = 0; s < 4; s++) bell(17.04 + s * 0.08, [71, 76, 80, 83][s], 0.03, { dur: 2.0, pan: (s - 1.5) * 0.3, wet: 0.7 });
    motorHum(17.3, 32.6, 0.02, 5);
    bars([['E', 17, 2], ['C', 19, 2], ['D', 21, 2], ['Bsus4', 23, 1], ['B', 24, 1]], function (c, t0, L, i) {
      pad(t0, t0 + L, c.pad, { vol: 0.058, att: 0.12, rel: 0.3, cut0: 1100, cut1: 1350, wet: 0.55, width: 1 });
      if (L === 2) { groove(t0, c, i, { lv: 0.85, br: 0.5, noKick1: t0 === 17 }); tom(t0, 82, 0.1, { dec: 0.5, pan: -0.15 }); }
      else { bass(t0, 0.45, c.b, { vol: 0.16 }); bass(t0 + 0.5, 0.4, c.b + 12, { vol: 0.11 }); kick(t0, 0.42); kick(t0 + 0.5, 0.3); hat(t0 + 0.25, 0.03); hat(t0 + 0.75, 0.03); }
      rotLine(t0, L, c, 0.6, 1050);
    });
    bells(19, [[0, 72], [2, 74]], 0.022, { dur: 1.8 });
    rollTo(25, 6, 0.02, 0.01);
    riser(23.8, 25, 0.06, 500, 5000);
    kick(25, 0.5); crash(25, 0.05, { dec: 2.0 }); chime(25.02, CH.E, 0.022);
    bars([['E', 25, 2], ['Csm7', 27, 2], ['A', 29, 2], ['Bsus4', 31, 1], ['B', 32, 1]], function (c, t0, L, i) {
      voltBar(c, t0, L, 0.6 + 0.08 * i);
      rotLine(t0, L, c, 0.45, 1000, 12);
    });
    bells(26.5, [[0, 83], [2, 85], [4, 88]], 0.016, { dur: 1.4 });
    rollTo(33, 6, 0.02, 0.011);
    riser(31.8, 33, 0.055, 500, 3800);

    // ---- KELLY + ROTARY TABLE 33–49: vintage colour — square-wave pad with tape wobble, oom-pah bass, chain-drive chug ----
    kick(33, 0.44); crash(33, 0.03, { dec: 2.0 });
    stab(33, CH.Amaj7.pad, 0.06, { rel: 1.2, cut0: 1800, cut1: 500 });
    bars([['Amaj7', 33, 2], ['EG', 35, 2], ['Fsm7', 37, 2], ['Bsus4', 39, 2], ['A', 41, 2], ['E', 43, 2], ['Csm7', 45, 2], ['Bsus4', 47, 1], ['B', 48, 1]], function (c, t0, L, i) {
      retroBar(c, t0, L, 0.6 + 0.05 * i);
      if (t0 >= 41 && L === 2) rotLine(t0, L, c, 0.3, 800); // rotary table turning
    });
    bells(34.5, [[0, 80], [4, 78]], 0.016, { dur: 1.4 });
    bells(41, [[0.02, 81], [4, 83]], 0.016, { dur: 1.4 });
    tom(40.75, 98, 0.08, { dec: 0.3 }); kick(41, 0.42); crash(41, 0.025);
    rollTo(49, 6, 0.02, 0.011);
    riser(47.8, 49, 0.05, 500, 3800);

    // ---- KELLY vs TOP DRIVE 49–57: 49 old (retro), 53 new (electric + rotation) ----
    kick(49, 0.46); crash(49, 0.035); stab(49, CH.Csm7.pad, 0.06, { rel: 1.0, cut0: 1600, cut1: 500 });
    bars([['Csm7', 49, 2], ['A', 51, 2]], function (c, t0, L, i) { retroBar(c, t0, L, 0.75); });
    tom(52.5, 98, 0.1, { dec: 0.3 }); tom(52.75, 82, 0.12, { dec: 0.35 }); riser(52, 53, 0.045, 500, 4000);
    kick(53, 0.5); crash(53, 0.05, { dec: 2.0 }); stab(53, CH.E.pad.concat([71]), 0.075, { rel: 1.2, cut0: 3000, cut1: 700 });
    bars([['E', 53, 2], ['Bsus4', 55, 1], ['B', 56, 1]], function (c, t0, L, i) {
      voltBar(c, t0, L, 0.8); rotLine(t0, L, c, 0.5, 1050);
    });
    motorHum(53.2, 56.6, 0.018, 6);
    rollTo(57, 6, 0.02, 0.011);

    // ---- DOWN THE DRILL STRING 57–96: continuous descent (pad darkens, falling lines), a lift on each component ----
    //      Drill Pipe 57 · HWDP 64 · Drill Collar 70 · Stabilizer 77 · Jar 82 (jar hit 84) · MWD 87 (digital) · Mud Motor 91
    var desc = [['E', 57, 2], ['BD', 59, 2], ['Csm7', 61, 2], ['A', 63, 1],
      ['A', 64, 2], ['EG', 66, 2], ['Fsm7', 68, 2],
      ['Csm7', 70, 2], ['A', 72, 2], ['Fsm7', 74, 2], ['Bsus4', 76, 1],
      ['E', 77, 2], ['Csm7', 79, 2], ['B', 81, 1],
      ['A', 82, 2], ['Fsm7', 84, 2], ['Bsus4', 86, 1]];
    bars(desc, function (c, t0, L, i) { descBar(c, t0, L, 0.6 + 0.02 * i, (t0 - 57) / 30); });
    var comps = [[57, 'E', 88], [64, 'A', 85], [70, 'Csm7', 83], [77, 'E', 80], [82, 'A', 78], [87, 'Csm7', 76], [91, 'Fsm7', 73]];
    for (s = 0; s < comps.length; s++) compLift(comps[s][0], CH[comps[s][1]], comps[s][2], s);
    crash(57, 0.03, { dec: 2.2 });
    drone(57.5, 95.5, [28, 35], 0.018, { cut: 300, cut1: 200, att: 2.0, rel: 1.0, trem: 0.2 });
    flow(58, 63.8, 0.02, 0.6, -0.6); flow(71, 76.8, 0.02, -0.6, 0.6);
    // HWDP: heavier — extra low tom on bar starts; Collar: weight (low pedal)
    tom(66, 70, 0.08, { dec: 0.5 }); tom(68, 70, 0.08, { dec: 0.5 });
    bass(70, 6.5, 28, { vol: 0.05, att: 0.6, rel: 0.6 });
    // Stabilizer: blades — short bright 'fin' plucks in the gaps
    for (s = 0; s < 3; s++) pluck(78.5 + s * 0.25, [80, 83, 85][s], { vol: 0.025, dur: 0.25, cut: 2500, pan: (s - 1) * 0.5, wet: 0.5 });
    // Jar: tension builds 82–84, then the 'jar hit' at 84
    riser(82.4, 84, 0.04, 200, 1500, { q: 4 });
    for (s = 0; s < 6; s++) tom(83.25 + s * 0.125, 90 + s * 6, 0.05 + s * 0.012, { dec: 0.12 });
    kick(84, 0.55); boom(84, 0.1, { dur: 1.2 }); tom(84, 60, 0.18, { dec: 0.7 }); crash(84, 0.05, { dec: 1.6 });
    stab(84, CH.Fsm7.pad, 0.08, { rel: 1.0, cut0: 2600, cut1: 500 });
    rollTo(87, 6, 0.02, 0.01);
    // MWD 87–91: digital mud-pulse colour
    bars([['Csm7', 87, 2], ['A', 89, 2]], function (c, t0, L, i) { mwdBar(c, t0, L, 0.8 + 0.1 * i); });
    // Mud motor 91–96: churning rotor (fast rotation figure + rotor whirr)
    bars([['Fsm7', 91, 2], ['D', 93, 2], ['B', 95, 1]], function (c, t0, L, i) {
      descBar(c, t0, L, 0.7, 1); rotLine(t0, L, c, 0.55 + 0.1 * i, 850);
    });
    motorHum(91.2, 95.6, 0.018, 9);
    rollTo(96, 8, 0.02, 0.011);
    riser(94.6, 96, 0.07, 300, 5000);

    // ---- DRILL BITS 96–108: crunchy, rock-cutting — PDC (shearing grind) 96–102, Tricone (crushing triplet toms) 102–108 ----
    kick(96, 0.56); crash(96, 0.07, { dec: 2.2 }); boom(96, 0.08, { dur: 1.3 });
    stab(96, CH.E.pad.concat([71]), 0.085, { rel: 1.3, cut0: 3400, cut1: 700, wet: 0.55 });
    bars([['E', 96, 2], ['C', 98, 2], ['D', 100, 2], ['E', 102, 2], ['Csm7', 104, 2], ['Bsus4', 106, 1], ['B', 107, 1]], function (c, t0, L, i) {
      voltBar(c, t0, L, 0.85);
      rotLine(t0, L, c, 0.4, 900);
      if (t0 >= 102) for (var q = 0; q < L * 3; q++) tom(t0 + q / 3, q % 3 === 0 ? 90 : 120, q % 3 === 0 ? 0.07 : 0.045, { dec: 0.12, pan: (q % 3 - 1) * 0.4 });
    });
    grind(96.3, 101.8, 0.03, 16, 650); grind(102.2, 107.8, 0.034, 8, 450);
    kick(102, 0.5); crash(102, 0.045); chime(102.02, CH.E, 0.02);
    rollTo(108, 6, 0.02, 0.012);
    riser(106.8, 108, 0.06, 400, 4000);

    // ---- RIG-FLOOR TOOLS 108–119: slips + iron roughneck (mechanical gear groove); torque accent 113–115 ----
    kick(108, 0.5); crash(108, 0.045); tom(108, 70, 0.14, { dec: 0.6 }); chime(108.02, CH.Csm7, 0.02);
    bars([['Csm7', 108, 2], ['A', 110, 2], ['E', 112, 2], ['B', 114, 2], ['Csm7', 116, 2], ['Bsus4', 118, 1]], function (c, t0, L, i) {
      gearBar(c, t0, L, 0.75 + 0.05 * i); pumpStroke(t0, 0.1);
    });
    // spinning in (fast rotation) then torquing up: ratchet toms tighten, stab when made up at 115
    rotLine(112, 1.2, CH.E, 0.5, 1000);
    for (s = 0; s < 8; s++) tom(113.3 + s * 0.2 - s * s * 0.006, 100 + s * 8, 0.05 + s * 0.008, { dec: 0.1, pan: s % 2 ? 0.3 : -0.3 });
    kick(115, 0.48); stab(115, CH.B.pad, 0.07, { rel: 0.9, cut0: 2800, cut1: 600 }); tom(115, 82, 0.14, { dec: 0.4 });
    rollTo(119, 6, 0.02, 0.011);
    riser(117.8, 119, 0.05, 500, 4000);

    // ---- DRILLING PARAMETERS 119–127 (RPM · Torque · WOB): focused counting pulse, gauge 'needle' swells ----
    kick(119, 0.44); crash(119, 0.03);
    bars([['Csm7', 119, 2], ['A', 121, 2], ['E', 123, 2], ['Bsus4', 125, 1], ['B', 126, 1]], function (c, t0, L, i) { countBar(c, t0, L, 0.7 + 0.05 * i); });
    pad(119.3, 126.6, [76, 80, 83], { type: 'triangle', vol: 0.013, att: 1.5, rel: 0.5, cut0: 2500, cut1: 3500, wet: 0.8, width: 1 });
    flow(119.5, 122, 0.02, -0.5, 0.5); flow(122, 124.5, 0.02, 0.5, -0.5); flow(124.5, 126.8, 0.02, -0.5, 0.5);
    rollTo(127, 6, 0.02, 0.011);
    riser(125.8, 127, 0.05, 500, 3800);

    // ---- RECAP 127–135: confident groove, rotation figure, a small lift on each bar ----
    kick(127, 0.5); crash(127, 0.06, { dec: 2.2 });
    stab(127, CH.E.pad, 0.07, { rel: 1.2, cut0: 3000, cut1: 800 });
    bars([['E', 127, 2], ['BD', 129, 2], ['Csm7', 131, 2], ['A', 133, 1], ['Bsus4', 134, 1]], function (c, t0, L, i) {
      pad(t0, t0 + L, c.pad, { vol: 0.05, att: 0.15, rel: 0.3, cut0: 1000, cut1: 1150, wet: 0.55, width: 0.95 });
      if (L === 2) groove(t0, c, i, { lv: 0.75, br: 0.5, noKick1: t0 === 127 });
      else { bass(t0, 0.45, c.b, { vol: 0.16 }); bass(t0 + 0.5, 0.35, c.b + 12, { vol: 0.11 }); kick(t0, 0.4); kick(t0 + 0.5, 0.28); hat(t0 + 0.25, 0.028); hat(t0 + 0.75, 0.028); }
      rotLine(t0, L, c, 0.4, 1000);
      if (i > 0 && L === 2) chime(t0 + 0.02, c, 0.018);
    });
    riser(134, 135, 0.045, 600, 3500);

    // ---- CALL TO ACTION 135–143 'กดติดตาม': warm, lighter groove (bells avoid the success SFX at ~138.6) ----
    kick(135, 0.45); crash(135, 0.04, { dec: 2.0 });
    stab(135, CH.Eadd9.pad, 0.07, { rel: 1.6, cut0: 2000, cut1: 800, wet: 0.65 });
    for (s = 0; s < 4; s++) bell(135.02 + s * 0.09, [76, 80, 83, 88][s], 0.024, { dur: 1.8, pan: (s - 1.5) * 0.3, wet: 0.7 });
    var cta = [['E', 135, 2], ['A', 137, 2], ['Csm7', 139, 2], ['Bsus4', 141, 1], ['B', 142, 1]];
    var ctaM = [[[1.5, 83]], [[0.5, 85]], [[0.5, 80], [1.0, 83]], [[0.5, 81]], [[0.5, 78]]];
    bars(cta, function (c, t0, L, i) {
      pad(t0, t0 + L, c.pad, { vol: 0.055, att: 0.2, rel: 0.35, cut0: 1000, cut1: 1150, wet: 0.6, width: 1 });
      if (L === 2) groove(t0, c, i, { lv: 0.55, br: 0.5, noKick1: t0 === 135 });
      else { bass(t0, 0.45, c.b, { vol: 0.15 }); bass(t0 + 0.5, 0.3, c.b + 12, { vol: 0.09 }); kick(t0, 0.3); hat(t0 + 0.25, 0.022); hat(t0 + 0.75, 0.022); }
      bells(t0, ctaM[i], 0.02, { dur: 1.4 });
    });
    pad(135.5, 142.8, [76, 80, 83], { type: 'triangle', vol: 0.016, att: 1.5, rel: 0.5, cut0: 2500, cut1: 3500, wet: 0.8, width: 1 });

    // ---- TEASER 143–150 (next: Circulating System): flowing, liquid — rolling arps, bubbles, swells; RESOLVED signature at 150 ----
    var RES = 150;
    crash(143, 0.04); kick(143, 0.45);
    bars([['Csm7', 143, 2], ['A', 145, 2], ['Fsm7', 147, 2], ['Bsus4', 149, 0.5], ['B', 149.5, 0.5]], function (c, t0, L, i) {
      pad(t0, t0 + L, c.pad, { vol: 0.05, att: 0.25, rel: 0.4, cut0: 900 + 150 * i, cut1: 1100 + 150 * i, wet: 0.7, width: 1, lfo: 0.4 });
      bass(t0, L - 0.05, c.b, { vol: 0.13, att: 0.06, rel: 0.25 });
      kick(t0, L === 2 ? 0.36 : 0.3, { dec: 0.4 });
      if (L === 2) { travel(t0, L, c, i % 2 ? -1 : 1, 0.75 + 0.1 * i, 1200 + 100 * i); for (var q = 0; q < 4; q++) tick(t0 + q * 0.5 + 0.25, 0.014, q % 2 ? 0.4 : -0.4); }
    });
    flow(143, 145.9, 0.024, -0.7, 0.7); flow(145, 147.9, 0.026, 0.7, -0.7); flow(147, 149.9, 0.028, -0.7, 0.7);
    for (s = 0; s < 14; s++) bubble(143.3 + s * 0.45 + rnd() * 0.15, 320 + rnd() * 380, 0.03, { dur: 0.08 + rnd() * 0.06, pan: rnd() * 1.4 - 0.7, wet: 0.6 });
    var up = [[143.5, 68], [144.5, 71], [145.5, 73], [146.5, 76], [147.25, 78], [148, 80], [148.5, 81], [149, 83]];
    for (s = 0; s < up.length; s++) bell(up[s][0], up[s][1], 0.018 + s * 0.002, { dur: 1.3, pan: (s % 2 ? 0.3 : -0.3), wet: 0.65 });
    tom(RES - 0.5, 98, 0.14, { dec: 0.3 }); tom(RES - 0.25, 82, 0.16, { dec: 0.35 });
    rollTo(RES, 8, 0.02, 0.011);
    riser(RES - 2.2, RES, 0.08, 300, 5000);
    // home: E major, signature resolved (B E F# G#), gentle tail; master fade -> silent by END-0.5
    kick(RES, 0.5); crash(RES, 0.07, { dec: 2.4 }); boom(RES, 0.09, { dur: 1.6 });
    pad(RES, RES + 1.2, CH.Eadd9.pad.concat([71]), { vol: 0.11, att: 0.03, rel: 1.8, cut0: 2600, cut1: 700, wet: 0.7, width: 0.85 });
    sig(RES, 0.085, { last: 2.4 });
    bass(RES, 1.8, 40, { vol: 0.18, rel: 0.8 }); bass(RES, 1.8, 28, { vol: 0.07, rel: 0.8 });
    for (s = 0; s < 4; s++) bell(RES + 1.1 + s * 0.09, [80, 83, 88, 92][s], 0.022, { dur: 1.4, pan: (s - 1.5) * 0.3, wet: 0.7 });
    // ============ SFX ============
    var SFXLEN = { spin: 2.0, torque: 0.8, engine: 3.3, zap: 1.0, winch: 3.0, chain: 0.6, whoosh: 0.8, alarm: 1.5, clunk: 0.6, impact: 2.0, hiss: 1.2, fire: 2.0, pump: 1.5, success: 1.0, blip: 0.15, bubble: 0.8 };
    var DUCK = { spin: 0.8, torque: 0.85, engine: 0.78, zap: 0.85, winch: 0.8, chain: 0.85, whoosh: 0.85, alarm: 0.75, clunk: 0.8, impact: 0.65, hiss: 0.8, fire: 0.72, pump: 0.8, success: 0.8, blip: 0.95, bubble: 0.88 };

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
      }
    };

    // ducking curve for music under SFX
    var DR = 50, dn = Math.max(2, Math.ceil(END * DR) + 1);
    var dcurve = new Float32Array(dn);
    for (i = 0; i < dn; i++) dcurve[i] = 1;
    for (var q = 0; q < cues.length; q++) {
      var cu = cues[q];
      if (!cu || typeof cu.t !== 'number' || !SFX.hasOwnProperty(cu.sfx)) continue;
      if (cu.t < 0 || cu.t >= END) continue;
      SFX[cu.sfx](cu.t, cu);
      var ds = cu.t - 0.08, de = cu.t + SFXLEN[cu.sfx], amt = DUCK[cu.sfx];
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
      var Lc = buf.getChannelData(0), Rc = buf.getChannelData(1), n = buf.length;
      var peak = 0;
      for (var i = 0; i < n; i++) {
        var a = Math.abs(Lc[i]), b = Math.abs(Rc[i]);
        if (a > peak) peak = a; if (b > peak) peak = b;
      }
      var g = peak > 1e-9 ? Math.pow(10, -1 / 20) / peak : 1;
      var fadeN = Math.min(n, Math.round(0.02 * SR));
      var dataLen = n * 4, out = new Uint8Array(44 + dataLen), dv = new DataView(out.buffer);
      function str(o, s) { for (var k = 0; k < s.length; k++) out[o + k] = s.charCodeAt(k); }
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
      return out;
    });
  }

  window.Score = { renderWav: renderWav, SAMPLE_RATE: SR, BPM: 120, DURATION: DURATION };
})();
