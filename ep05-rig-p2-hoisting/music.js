/* music.js — original synthesized score + SFX for namman.story EP05 "Drilling Rig 101 — Part 2/5: Hoisting System", 148 s.
 * Classic browser script. Defines window.Score.renderWav(duration, cues) -> Promise<Uint8Array>
 * (16-bit PCM WAV, 48 kHz, stereo, exactly `duration` seconds), rendered with OfflineAudioContext.
 * Same synth engine / SFX / mix chain as EP01–EP05 Part 1 for a consistent channel sound; new arrangement.
 *
 * "DRILLING RIG 101" series theme (reused across Parts 1–5): confident, industrial, educational. E major.
 * Tempo 120 BPM grid felt in HALF-TIME (~60 BPM pulse; beat 0.5 s, bar 2 s). Short 1-s bars realign so
 * 7, 16, 26, 36, 46, 58, 70, 80, 90, 100, 110, 118, 122, 130, 138, 145 land on downbeats. Melodic hooks stay sparse
 * (accents / gaps); under speech the bed is pads, low (<1.5 kHz) ostinati and >7 kHz ticks.
 * Sections: 0–7 title (OPEN signature at 0.8, long 3rd over Amaj7; rig pulse wakes at 4) · 7–16 what hoisting does
 *   (half-time groove) · 16–26 derrick/mast: BIG arrival, heroic E–C–D, low pedal + climbing octave bells (tall)
 *   · 26–36 crown block: high, airy, light kick, triangle shimmer · 36–46 traveling block: 8th arpeggio that climbs
 *   one bar and descends the next + panning swells · 46–58 reeving: counting pulse (tok on every beat, 10 soft
 *   counts 52–56.5) · 58–70 drawworks: mechanical gear groove + drum pulses · 70–80 deadline / weight indicator:
 *   steady groove, 'needle' swells · 80–90 links & elevator: rig groove · 90–100 monkeyboard: high, windy, light
 *   · 100–122 TRIPPING demo (most energetic): hit at 100, rising line during lift 101.8–108, slips accent 108.8,
 *   break-out 110–112.5, rack back 113–118, falling line as the block lowers 118–121.5 · 122–130 recap
 *   · 130–138 call to action, warm (gap at 133.6 for the success SFX) · 138–145 teaser (Rotating System):
 *   rising bell line + 16th current + riser · 145 resolved signature on E, tail; master fade -> silent by END-0.5.
 * SFX: all EP01–EP05 Part 1 SFX incl. 'engine' and 'zap'. New: 'winch' (drawworks drum whirr with gear-tooth
 *   ratchet, ~3 s; rises by default, cue {dir:'down'} for a falling / braking wind-down), 'chain' (metallic
 *   latch clank + short link rattle, ~0.6 s; elevator latch / slips set).
 * "namman.story" SIGNATURE MOTIF (series-wide, scale degrees 5-1-2-3, rhythm 8th-8th-8th-long):
 *   B4 E5 F#5 G#5 (71 76 78 80) — open over Amaj7 at 0.8 s; resolved over E at 145.0 s.
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

  function renderWav(duration, cues) {
    duration = +duration > 0 ? +duration : 148;
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
    var arc = [[0, 0.8], [7, 0.84], [15.9, 0.88], [16, 0.98], [18, 0.93], [25.9, 0.92], [26, 0.86], [36, 0.88], [46, 0.85], [58, 0.9], [70, 0.87], [80, 0.89], [90, 0.85], [99.9, 0.9], [100, 0.98], [104, 0.95], [121.9, 0.97], [122, 0.92], [130, 0.88], [138, 0.88], [145, 1.0], [END, 1.0]];
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

    // ============ SCORE ============
    // ---- TITLE 0–7 'Part 2 · Hoisting System': E(add9) swell, OPEN signature at 0.8 (long 3rd over Amaj7), rig wakes at 4 ----
    pad(0, 1.55, CH.Eadd9.pad, { vol: 0.1, att: 1.1, rel: 0.5, cut0: 500, cut1: 1800, wet: 0.65, width: 0.85 });
    pad(0.3, 4.0, [76, 80, 83], { type: 'triangle', vol: 0.025, att: 1.8, rel: 0.8, cut0: 2200, cut1: 4500, wet: 0.8, width: 0.9 });
    sig(0.8, 0.075, { last: 2.6 });
    pad(1.55, 4.2, CH.Amaj7.pad, { vol: 0.085, att: 0.25, rel: 0.4, cut0: 900, cut1: 1400, wet: 0.6, width: 0.9 });
    bass(1.55, 2.5, 45, { vol: 0.12, att: 0.4, rel: 0.4 });
    for (s = 0; s < 3; s++) tick(2.75 + s * 0.5, 0.01 + s * 0.003);
    bars([['Csm7', 4, 2], ['Bsus4', 6, 1]], function (c, t0, L, i) { rigBar(c, t0, L, 0.3 + 0.3 * i, { att: i ? 0.1 : 0.5 }); });
    rollTo(7, 6, 0.02, 0.01);
    riser(5.8, 7, 0.06, 400, 4000);

    // ---- WHAT HOISTING DOES 7–16: half-time groove ----
    crash(7, 0.04); kick(7, 0.45); chime(7.02, CH.E, 0.022);
    bars([['E', 7, 2], ['BD', 9, 2], ['Csm7', 11, 2], ['A', 13, 2], ['Bsus4', 15, 1]], function (c, t0, L, i) {
      var lv = 0.5 + i * 0.06, br = i / 8;
      pad(t0, t0 + L, c.pad, { vol: 0.045 + 0.01 * br, att: 0.15, rel: 0.3, cut0: 800 + 400 * br, cut1: 950 + 400 * br, wet: 0.5, width: 0.9 });
      if (L === 2) groove(t0, c, i, { lv: lv, br: br * 0.6, noKick1: t0 === 7 });
      else { bass(t0, 0.45, c.b, { vol: 0.16 }); bass(t0 + 0.5, 0.35, c.b + 12, { vol: 0.11 }); kick(t0, 0.4); kick(t0 + 0.5, 0.28); hat(t0 + 0.25, 0.028); hat(t0 + 0.75, 0.028); }
      if (i >= 2) ost(t0, c, L, 0.5 + 0.05 * i, 1050);
    });
    rollTo(16, 8, 0.02, 0.009);
    riser(14.6, 16, 0.07, 350, 4800);

    // ---- DERRICK / MAST & SUBSTRUCTURE 16–26: BIG and tall — arrival hit, heroic E–C–D, low pedal, climbing octave bells ----
    kick(16, 0.58); crash(16, 0.09, { dec: 2.6 }); boom(16, 0.13, { dur: 1.8 }); tom(16, 55, 0.2, { dec: 0.9 });
    stab(16, CH.E.pad.concat([71]), 0.1, { rel: 1.8, cut0: 3400, cut1: 700, wet: 0.6 });
    bass(16, 1.8, 28, { vol: 0.07 });
    for (s = 0; s < 4; s++) bell(16.04 + s * 0.08, [71, 76, 80, 83][s], 0.03, { dur: 2.0, pan: (s - 1.5) * 0.3, wet: 0.7 });
    drone(16.2, 25.4, [28, 35], 0.022, { cut: 260, cut1: 380, att: 1.5, rel: 1.0, trem: 0.25 });
    bars([['E', 16, 2], ['C', 18, 2], ['D', 20, 2], ['E', 22, 2], ['Bsus4', 24, 1], ['B', 25, 1]], function (c, t0, L, i) {
      pad(t0, t0 + L, c.pad, { vol: 0.058, att: 0.12, rel: 0.3, cut0: 1100, cut1: 1350, wet: 0.55, width: 1 });
      if (L === 2) {
        groove(t0, c, i, { lv: 0.85, br: 0.5, noKick1: t0 === 16 });
        tom(t0, 82, 0.1, { dec: 0.5, pan: -0.15 });
      } else { bass(t0, 0.45, c.b, { vol: 0.16 }); bass(t0 + 0.5, 0.4, c.b + 12, { vol: 0.11 }); kick(t0, 0.42); kick(t0 + 0.5, 0.3); hat(t0 + 0.25, 0.03); hat(t0 + 0.75, 0.03); }
    });
    // the mast rising: one bell per bar climbing (in the bar gaps)
    bells(18, [[0, 72], [2, 74], [4, 76], [6, 80]], 0.024, { dur: 1.8 });
    pad(18.5, 25.5, [76, 83, 88], { type: 'triangle', vol: 0.014, att: 3.0, rel: 0.6, cut0: 2500, cut1: 4500, wet: 0.85, width: 1 });
    rollTo(26, 6, 0.02, 0.01);
    riser(24.8, 26, 0.06, 600, 6000);

    // ---- CROWN BLOCK 26–36: high, airy — light kick, sparkle, wind ----
    kick(26, 0.36); crash(26, 0.03, { dec: 2.4 });
    for (s = 0; s < 4; s++) bell(26.02 + s * 0.09, [83, 88, 92, 95][s], 0.02, { dur: 2.0, pan: (s - 1.5) * 0.35, wet: 0.75 });
    bars([['Amaj7', 26, 2], ['EG', 28, 2], ['Fsm7', 30, 2], ['Amaj7', 32, 2], ['Bsus4', 34, 1], ['B', 35, 1]], function (c, t0, L, i) { airBar(c, t0, L, 0.5 + 0.08 * i); });
    pad(26.3, 35.6, [80, 85, 88], { type: 'triangle', vol: 0.017, att: 2.0, rel: 0.8, cut0: 3000, cut1: 5000, wet: 0.85, width: 1, lfo: 0.3 });
    wind(26.5, 31, 0.012); wind(31, 35.8, 0.011);
    bells(27.5, [[0, 88], [2.25, 87], [4.5, 85], [6.5, 83]], 0.014, { dur: 1.6 });
    riser(34.8, 36, 0.05, 500, 3500);
    rollTo(36, 4, 0.02, 0.012);

    // ---- TRAVELING BLOCK 36–46: arpeggio climbs one bar, descends the next; swells pan L->R / R->L ----
    kick(36, 0.44); crash(36, 0.04); chime(36.02, CH.E, 0.022);
    bars([['E', 36, 2], ['Csm7', 38, 2], ['A', 40, 2], ['B', 42, 2], ['E', 44, 2]], function (c, t0, L, i) {
      pad(t0, t0 + L, c.pad, { vol: 0.048, att: 0.2, rel: 0.3, cut0: 900, cut1: 1050, wet: 0.55, width: 0.9 });
      groove(t0, c, i, { lv: 0.55 + 0.04 * i, br: 0.3, noKick1: t0 === 36 });
      travel(t0, L, c, i % 2 ? -1 : 1, 0.8 + 0.05 * i, 1200 + 80 * i);
    });
    for (s = 0; s < 5; s++) flow(36 + s * 2, 38 + s * 2 - 0.1, 0.018 + 0.002 * s, s % 2 ? 0.6 : -0.6, s % 2 ? -0.6 : 0.6);
    rollTo(46, 6, 0.02, 0.01);
    riser(45, 46, 0.05, 500, 3800);

    // ---- REEVING 46–58: thoughtful counting pulse; 10 soft counts (lines strung) 52–56.5 ----
    kick(46, 0.42); crash(46, 0.03); chime(46.02, CH.Csm7, 0.022);
    bars([['Csm7', 46, 2], ['A', 48, 2], ['E', 50, 2], ['B', 52, 2], ['Csm7', 54, 2], ['A', 56, 1], ['Bsus4', 57, 1]], function (c, t0, L, i) { countBar(c, t0, L, 0.6 + 0.06 * i); });
    for (s = 0; s < 10; s++) bell(52 + s * 0.5, [64, 66, 68, 71, 73, 76, 78, 80, 83, 85][s] + 12, 0.009 + s * 0.0008, { dur: 0.6, pan: (s / 9 - 0.5) * 1.2, wet: 0.5 });
    rollTo(58, 6, 0.02, 0.011);
    riser(56.8, 58, 0.055, 400, 4200);

    // ---- DRAWWORKS DRUM & BRAKES 58–70: mechanical groove (gear clacks, drum pulses) ----
    kick(58, 0.48); crash(58, 0.045); tom(58, 70, 0.14, { dec: 0.6 }); chime(58.02, CH.E, 0.022);
    bars([['E', 58, 2], ['Csm7', 60, 2], ['A', 62, 2], ['B', 64, 2], ['E', 66, 2], ['Bsus4', 68, 1], ['B', 69, 1]], function (c, t0, L, i) {
      if (L === 2) { gearBar(c, t0, L, 0.75 + 0.05 * i); pumpStroke(t0, 0.12); pumpStroke(t0 + 1.0, 0.1); }
      else {
        pad(t0, t0 + L, c.pad, { vol: 0.05, att: 0.05, rel: 0.1, cut0: 800, cut1: 2200, wet: 0.5 });
        bass(t0, 0.9, c.b, { vol: 0.14, drive: true, cut: 550 }); kick(t0, 0.4);
        for (var q = 0; q < 8; q++) hat(t0 + q * 0.125, 0.01 + q * 0.002, { f: 5200, dec: 0.02 });
      }
    });
    engineHum(58.5, 69, 0.022);
    rollTo(70, 6, 0.02, 0.011);
    riser(69, 70, 0.05, 500, 4200);

    // ---- DEADLINE ANCHOR & WEIGHT INDICATOR 70–80: steady, measured; 'needle' swells ----
    kick(70, 0.44); crash(70, 0.035); chime(70.02, CH.Amaj7, 0.022);
    bars([['Amaj7', 70, 2], ['Fsm7', 72, 2], ['EG', 74, 2], ['A', 76, 2], ['Bsus4', 78, 1], ['B', 79, 1]], function (c, t0, L, i) {
      pad(t0, t0 + L, c.pad, { vol: 0.048, att: 0.2, rel: 0.3, cut0: 850, cut1: 1000, wet: 0.55, width: 0.9 });
      if (L === 2) groove(t0, c, i, { lv: 0.55 + 0.04 * i, br: 0.35, noKick1: t0 === 70 });
      else { bass(t0, 0.45, c.b, { vol: 0.15 }); bass(t0 + 0.5, 0.35, c.b + 12, { vol: 0.1 }); kick(t0, 0.38); hat(t0 + 0.25, 0.026); hat(t0 + 0.75, 0.026); }
      ost(t0, c, L, 0.5, 1000);
    });
    flow(72, 75.8, 0.022, -0.5, 0.5); flow(76, 79.8, 0.024, 0.5, -0.5);
    bell(75.5, 83, 0.016, { dur: 1.6, pan: 0.3 }); bell(77.5, 85, 0.016, { dur: 1.6, pan: -0.3 });
    rollTo(80, 6, 0.02, 0.011);
    riser(79, 80, 0.05, 500, 4000);

    // ---- LINKS & ELEVATOR 80–90: industrial rig groove ----
    kick(80, 0.46); crash(80, 0.04); chime(80.02, CH.Csm7, 0.022);
    bars([['Csm7', 80, 2], ['A', 82, 2], ['E', 84, 2], ['B', 86, 2], ['Bsus4', 88, 1], ['B', 89, 1]], function (c, t0, L, i) {
      rigBar(c, t0, L, Math.min(0.85, 0.55 + 0.06 * i));
    });
    flow(84, 88, 0.022, -0.6, 0.6);
    rollTo(90, 6, 0.02, 0.01);
    riser(88.8, 90, 0.055, 600, 6000);

    // ---- MONKEYBOARD & DERRICKMAN 90–100: high up — airy bars, wind, high bells in the gaps ----
    kick(90, 0.38); crash(90, 0.03, { dec: 2.4 });
    for (s = 0; s < 4; s++) bell(90.02 + s * 0.09, [80, 85, 88, 92][s], 0.02, { dur: 2.0, pan: (s - 1.5) * 0.35, wet: 0.75 });
    bars([['Amaj7', 90, 2], ['E', 92, 2], ['Fsm7', 94, 2], ['A', 96, 2], ['Bsus4', 98, 1], ['B', 99, 1]], function (c, t0, L, i) { airBar(c, t0, L, 0.55 + 0.08 * i); });
    pad(90.3, 99.6, [80, 83, 88], { type: 'triangle', vol: 0.016, att: 2.0, rel: 0.6, cut0: 3000, cut1: 5000, wet: 0.85, width: 1, lfo: 0.3 });
    wind(90.5, 95, 0.013); wind(95, 99.8, 0.012);
    bells(91.5, [[0, 88], [4, 90], [6.5, 92]], 0.014, { dur: 1.6 });
    rollTo(100, 8, 0.02, 0.011);
    riser(98.5, 100, 0.075, 300, 5000);

    // ---- TRIPPING DEMO 100–122 (most energetic): latch 100.6, lift 101.8–108 (rising line), slips 108.8,
    //      break-out 110–112.5, rack back 113–118, block lowers 118–121.5 (falling line) ----
    kick(100, 0.56); crash(100, 0.08, { dec: 2.4 }); boom(100, 0.09, { dur: 1.4 });
    stab(100, CH.E.pad.concat([71]), 0.09, { rel: 1.4, cut0: 3400, cut1: 700, wet: 0.55 });
    var trip = [['E', 100, 2], ['Csm7', 102, 2], ['A', 104, 2], ['B', 106, 2], ['Bsus4', 108, 1], ['B', 109, 1],
      ['E', 110, 2], ['Csm7', 112, 2], ['A', 114, 2], ['Fsm7', 116, 2], ['E', 118, 2], ['Bsus4', 120, 1], ['B', 121, 1]];
    bars(trip, function (c, t0, L, i) {
      var lv = Math.min(1, 0.8 + 0.02 * i);
      rigBar(c, t0, L, lv);
      for (var q = 0; q < L; q += 0.5) hat(t0 + q + 0.25, 0.022, { f: 7000 });
      if (t0 >= 102 && t0 < 108) travel(t0, L, c, 1, 0.7 + 0.1 * (t0 - 102) / 2, 1300 + 120 * (t0 - 102)); // lifting
      if (t0 >= 110 && t0 < 118) zline(t0, L, c, 0.35 + 0.05 * (t0 - 110) / 2);                          // break out / rack back
      if (t0 >= 118 && t0 < 121) travel(t0, L, c, -1, 0.85, 1400);                                       // block lowers
    });
    flow(101.8, 108, 0.026, -0.7, 0.7);
    riser(106.4, 108.7, 0.05, 300, 3000);
    // slips set 108.8: dry accent
    kick(108.8, 0.4); tom(108.8, 90, 0.12, { dec: 0.35 }); stab(108.8, CH.Bsus4.pad, 0.05, { rel: 0.6, cut0: 2400, cut1: 600 });
    rollTo(110, 6, 0.02, 0.011);
    kick(110, 0.5); crash(110, 0.05, { dec: 2.0 }); chime(110.02, CH.E, 0.024);
    flow(113, 117.8, 0.026, 0.7, -0.7);
    kick(118, 0.48); crash(118, 0.045); chime(118.02, CH.E, 0.022);
    tom(121.5, 98, 0.12, { dec: 0.3 }); tom(121.75, 82, 0.14, { dec: 0.35 });
    rollTo(122, 6, 0.02, 0.011);

    // ---- RECAP 122–130: confident groove, a small lift on each bar ----
    kick(122, 0.5); crash(122, 0.06, { dec: 2.2 });
    stab(122, CH.E.pad, 0.07, { rel: 1.2, cut0: 3000, cut1: 800 });
    bars([['E', 122, 2], ['BD', 124, 2], ['Csm7', 126, 2], ['A', 128, 1], ['Bsus4', 129, 1]], function (c, t0, L, i) {
      pad(t0, t0 + L, c.pad, { vol: 0.05, att: 0.15, rel: 0.3, cut0: 1000, cut1: 1150, wet: 0.55, width: 0.95 });
      if (L === 2) groove(t0, c, i, { lv: 0.75, br: 0.5, noKick1: t0 === 122 });
      else { bass(t0, 0.45, c.b, { vol: 0.16 }); bass(t0 + 0.5, 0.35, c.b + 12, { vol: 0.11 }); kick(t0, 0.4); kick(t0 + 0.5, 0.28); hat(t0 + 0.25, 0.028); hat(t0 + 0.75, 0.028); }
      ost(t0, c, L, 0.6, 1100);
      if (i > 0 && L === 2) chime(t0 + 0.02, c, 0.018);
    });
    riser(129, 130, 0.045, 600, 3500);

    // ---- CALL TO ACTION 130–138 'กดติดตาม': warm, friendly, lighter groove (bells avoid the success SFX at ~133.6) ----
    kick(130, 0.45); crash(130, 0.04, { dec: 2.0 });
    stab(130, CH.Eadd9.pad, 0.07, { rel: 1.6, cut0: 2000, cut1: 800, wet: 0.65 });
    for (s = 0; s < 4; s++) bell(130.02 + s * 0.09, [76, 80, 83, 88][s], 0.024, { dur: 1.8, pan: (s - 1.5) * 0.3, wet: 0.7 });
    var cta = [['E', 130, 2], ['A', 132, 2], ['Csm7', 134, 2], ['Bsus4', 136, 1], ['B', 137, 1]];
    var ctaM = [[[1.5, 83]], [[0.5, 85]], [[0.5, 80], [1.0, 83]], [[0.5, 81]], [[0.5, 78]]];
    bars(cta, function (c, t0, L, i) {
      pad(t0, t0 + L, c.pad, { vol: 0.055, att: 0.2, rel: 0.35, cut0: 1000, cut1: 1150, wet: 0.6, width: 1 });
      if (L === 2) groove(t0, c, i, { lv: 0.55, br: 0.5, noKick1: t0 === 130 });
      else { bass(t0, 0.45, c.b, { vol: 0.15 }); bass(t0 + 0.5, 0.3, c.b + 12, { vol: 0.09 }); kick(t0, 0.3); hat(t0 + 0.25, 0.022); hat(t0 + 0.75, 0.022); }
      bells(t0, ctaM[i], 0.02, { dur: 1.4 });
    });
    pad(130.5, 137.8, [76, 80, 83], { type: 'triangle', vol: 0.016, att: 1.5, rel: 0.5, cut0: 2500, cut1: 3500, wet: 0.8, width: 1 });

    // ---- TEASER 138–145 (next: Rotating System): rising, anticipatory; RESOLVED signature at 145, tail ----
    crash(138, 0.04); kick(138, 0.45);
    bars([['Csm7', 138, 2], ['A', 140, 2], ['Fsm7', 142, 2], ['Bsus4', 144, 0.5], ['B', 144.5, 0.5]], function (c, t0, L, i) {
      rigBar(c, t0, L, Math.min(1, 0.45 + 0.15 * i));
      if (i >= 1) zline(t0, L, c, 0.3 + 0.15 * i);
    });
    var up = [[138.5, 68], [139.5, 71], [140.5, 73], [141.5, 76], [142.25, 78], [143, 80], [143.5, 81], [144, 83]];
    for (s = 0; s < up.length; s++) bell(up[s][0], up[s][1], 0.018 + s * 0.002, { dur: 1.3, pan: (s % 2 ? 0.3 : -0.3), wet: 0.65 });
    tom(144.5, 98, 0.14, { dec: 0.3 }); tom(144.75, 82, 0.16, { dec: 0.35 });
    rollTo(145, 8, 0.02, 0.011);
    riser(142.8, 145, 0.08, 300, 5000);
    // 145 home: E major, signature resolved (B E F# G#), gentle tail; master fade -> silent by END-0.5
    kick(145, 0.5); crash(145, 0.07, { dec: 2.4 }); boom(145, 0.09, { dur: 1.6 });
    pad(145, 146.2, CH.Eadd9.pad.concat([71]), { vol: 0.11, att: 0.03, rel: 1.8, cut0: 2600, cut1: 700, wet: 0.7, width: 0.85 });
    sig(145, 0.085, { last: 2.4 });
    bass(145, 1.8, 40, { vol: 0.18, rel: 0.8 }); bass(145, 1.8, 28, { vol: 0.07, rel: 0.8 });
    for (s = 0; s < 4; s++) bell(146.1 + s * 0.09, [80, 83, 88, 92][s], 0.022, { dur: 1.4, pan: (s - 1.5) * 0.3, wet: 0.7 });

    // ============ SFX ============
    var SFXLEN = { engine: 3.3, zap: 1.0, winch: 3.0, chain: 0.6, whoosh: 0.8, alarm: 1.5, clunk: 0.6, impact: 2.0, hiss: 1.2, fire: 2.0, pump: 1.5, success: 1.0, blip: 0.15, bubble: 0.8 };
    var DUCK = { engine: 0.78, zap: 0.85, winch: 0.8, chain: 0.85, whoosh: 0.85, alarm: 0.75, clunk: 0.8, impact: 0.65, hiss: 0.8, fire: 0.72, pump: 0.8, success: 0.8, blip: 0.95, bubble: 0.88 };

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

  window.Score = { renderWav: renderWav, SAMPLE_RATE: SR, BPM: 120, DURATION: 148 };
})();
