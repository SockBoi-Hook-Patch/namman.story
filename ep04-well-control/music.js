/* music.js — original synthesized score + SFX for namman.story EP04 "Well Control: จาก Kick ถึง Kill", 120 s.
 * Classic browser script. Defines window.Score.renderWav(duration, cues) -> Promise<Uint8Array>
 * (16-bit PCM WAV, 48 kHz, stereo, exactly `duration` seconds), rendered with OfflineAudioContext.
 * Same synth engine / SFX / mix chain as EP01–EP03 for a consistent channel sound; new composition.
 *
 * Tempo 120 BPM grid felt in HALF-TIME (~60 BPM pulse; beat 0.5 s, bar 2 s). Short 1-s / 1.5-s bars realign so
 * the card boundaries 8, 20, 27, 34, 42, 56, 70, 80, 86, 100, 110 land on downbeats.
 * Key arc: D minor (tension) -> D major (resolution at 101.5 / 110.5).
 * Sections: 0–8 title (minor signature + falling question) · 8–20 KICK (heartbeat + drone, D/Eb creep, HIT at
 *   12.5 alarm: boom + D-Eb-Ab cluster; barrier stamps 15.5 / 17.6) · 20–42 kick signs (low 8th ostinato + clock
 *   ticks building per card 20 / 27 / 34; pump winds down at 35.5 -> eerie dim pad, the well still flows)
 *   · 42–56 shut-in (march pulse, step accents 42.5 / 45 / 47.5 / 51.5, A7 -> Bbmaj7 relief at 53)
 *   · 56–70 read pressures (sparse, pings 57 / 60, formula 63.5) · 70–86 Driller's circ 1 (pumps on, half-time
 *   groove gaining energy, gas-expansion riser into 80, flare 80–86) · 86–100 circ 2 kill mud (brighter, lydian
 *   sparkle, chimes 92 / 98) · 100–110 flow-check hush, triumphant D major at 101.5, gentle · 110–120 signature
 *   in D major at 110.5, plagal tail, silent by ~119.5.
 * "namman.story" SIGNATURE MOTIF (series-wide, scale degrees 5-1-2-3, rhythm 8th-8th-8th-long):
 *   minor A4 D5 E5 F5 (69 74 76 77) at 1.0 s; resolved A4 D5 E5 F#5 (69 74 76 78) at 110.5 s.
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

  // Chord table: bass root (MIDI), pad voicing, arpeggio tones.
  var CH = {
    // D minor world
    Dm:     { b: 38, pad: [50, 57, 62, 65],     arp: [62, 65, 69, 74] },
    Dm9:    { b: 38, pad: [50, 57, 60, 64, 65], arp: [60, 64, 65, 69] },
    DmC:    { b: 36, pad: [50, 57, 62, 65],     arp: [62, 65, 69, 74] }, // Dm/C
    Bb:     { b: 34, pad: [50, 53, 58, 62],     arp: [58, 62, 65, 70] },
    Bbmaj7: { b: 34, pad: [50, 53, 57, 62],     arp: [57, 62, 65, 69] },
    Gm:     { b: 43, pad: [50, 55, 58, 62],     arp: [55, 58, 62, 67] },
    Gm7:    { b: 43, pad: [50, 53, 58, 62],     arp: [58, 62, 65, 67] },
    Eb:     { b: 39, pad: [51, 55, 58, 63],     arp: [58, 63, 67, 70] }, // bII (Neapolitan colour)
    C:      { b: 36, pad: [52, 55, 60, 64],     arp: [60, 64, 67, 72] },
    F:      { b: 41, pad: [53, 57, 60, 65],     arp: [60, 65, 69, 72] },
    FA:     { b: 45, pad: [53, 57, 60, 65],     arp: [60, 65, 69, 72] }, // F/A
    A7:     { b: 45, pad: [49, 55, 57, 64],     arp: [57, 61, 64, 67] },
    Asus4:  { b: 45, pad: [52, 57, 62, 64],     arp: [62, 64, 69, 74] },
    A:      { b: 45, pad: [52, 57, 61, 64],     arp: [61, 64, 69, 73] },
    // D major world (resolution)
    D:      { b: 38, pad: [50, 57, 62, 66],     arp: [62, 66, 69, 74] },
    Dadd9:  { b: 38, pad: [50, 57, 62, 64, 66], arp: [62, 64, 66, 69] },
    Gmaj7:  { b: 43, pad: [54, 59, 62, 67],     arp: [62, 66, 71, 74] },
    Gadd9:  { b: 43, pad: [55, 57, 62, 67],     arp: [62, 67, 69, 71] },
    Bm7:    { b: 35, pad: [50, 54, 57, 62],     arp: [59, 62, 66, 69] }
  };
  // Series signature motif ("nam-man-sto-ry"): degrees 5-1-2-3 of the home key (D minor, then D major).
  var SIG_MIN = [69, 74, 76, 77], SIG_MAJ = [69, 74, 76, 78];

  function renderWav(duration, cues) {
    duration = +duration > 0 ? +duration : 120;
    cues = Array.isArray(cues) ? cues : [];
    var len = Math.max(1, Math.round(duration * SR));
    var END = len / SR;
    var ctx = new OfflineAudioContext({ numberOfChannels: 2, length: len, sampleRate: SR });
    var rnd = mulberry32(0xE904C7);

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
    var arc = [[0, 0.8], [8, 0.84], [12.4, 0.84], [12.5, 0.9], [20, 0.86], [34, 0.9], [35.5, 0.86], [42, 0.92], [53, 0.9], [56, 0.85], [70, 0.86], [80, 0.94], [86, 0.92], [100, 0.95], [101.5, 1.0], [120, 1.0]];
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

    // ---------- shared music voices (from EP03) ----------
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

    // ---------- EP04 voices ----------
    function heart(t, v) { // uneasy 'lub-dub' low pulse
      kick(t, v, { f0: 115, f1: 40, dec: 0.3 });
      kick(t + 0.26, v * 0.55, { f0: 100, f1: 38, dec: 0.25 });
    }
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
    function step(t, c, big) { // procedural shut-in step accent
      kick(t, 0.5); tom(t, 62, 0.2, { dec: 0.6 }); snare(t, 0.05, { dec: 0.22, wet: 0.3 });
      stab(t, c.pad, big ? 0.11 : 0.09);
      bass(t, 0.6, c.b, { vol: 0.17, drive: true, cut: 700 });
      bell(t, c.arp[3] + 12, 0.028, { dur: 1.2, wet: 0.6 });
      if (big) boom(t, 0.07, { dur: 1.2 });
    }
    function bars(list, fn) { for (var i = 0; i < list.length; i++) fn(CH[list[i][0]], list[i][1], list[i][2], i); }

    // ============ SCORE ============
    // ---- TITLE 0–8: dark Dm(add9) bed, minor signature at 1.0, falling 'what do we do?' answer ----
    pad(0, 4, CH.Dm9.pad, { vol: 0.11, att: 2.6, rel: 0.8, cut0: 420, cut1: 2200, wet: 0.65, width: 0.85 });
    pad(0.4, 4, [74, 77, 81], { type: 'triangle', vol: 0.03, att: 2.8, rel: 0.8, cut0: 2000, cut1: 4500, wet: 0.8, width: 0.9 });
    sig(1.0, 0.075, { notes: SIG_MIN, last: 2.6 });
    bass(1.75, 2.1, 38, { vol: 0.12, att: 0.8, rel: 0.5 });
    var ask = [81, 79, 77, 74];
    for (s = 0; s < ask.length; s++) bell(3.25 + s * 0.25, ask[s], 0.03 + s * 0.002, { dur: s === 3 ? 2.0 : 1.0, pan: (s % 2 ? 0.45 : -0.45), wet: 0.75 });
    bars([['Bbmaj7', 4, 2], ['Asus4', 6, 1], ['A7', 7, 1]], function (c, t0, L, i) {
      pad(t0, t0 + L, c.pad, { vol: 0.065, att: i === 0 ? 0.6 : 0.1, rel: 0.35, cut0: 800 + i * 250, cut1: 1000 + i * 250, wet: 0.55, width: 0.8 });
      bass(t0, L - 0.15, c.b, { vol: 0.13, att: 0.05, rel: 0.3 });
    });
    for (s = 0; s < 4; s++) tick(4.25 + s * 0.5, 0.014 + s * 0.003);
    for (s = 0; s < 8; s++) tick(6 + s * 0.25, 0.016 + s * 0.003, s % 2 ? 0.35 : -0.35);
    ost(6, CH.Asus4, 1, 0.7, 1000); ost(7, CH.A7, 1, 0.8, 1100);
    heart(6, 0.28); heart(7, 0.32);
    riser(6.5, 8, 0.07, 400, 3800);

    // ---- KICK 8–20: heartbeat + low drone, creeping D/Eb semitone; HIT at the 12.5 alarm; barriers 15.5–20 ----
    crash(8, 0.04);
    drone(8, 12.45, [26, 33], 0.022, { cut: 200, cut1: 340, att: 1.2, rel: 0.25, trem: 1.0 });
    pad(8, 12.45, CH.Dm.pad, { vol: 0.05, att: 1.2, rel: 0.15, cut0: 450, cut1: 1000, wet: 0.5, width: 0.8 });
    for (s = 0; s < 5; s++) heart(8 + s, 0.34 + s * 0.02);
    for (s = 0; s < 8; s++) tick(8.5 + s * 0.5, 0.014 + s * 0.002);
    for (s = 0; s < 10; s++) pluck(10 + s * 0.25, s % 2 ? 51 : 50, { vol: 0.045 + s * 0.003, dur: 0.2, cut: 700, q: 3, pan: s % 2 ? 0.25 : -0.25, wet: 0.3 });
    riser(11.2, 12.45, 0.07, 300, 3000);
    for (s = 0; s < 4; s++) snare(12 + s * 0.1, 0.03 + s * 0.012, { dec: 0.08 });
    // 12.5 KICK! — boom + dissonant cluster (D Eb Ab), drone grinds a semitone
    boom(12.5, 0.16, { dur: 2.2 }); kick(12.5, 0.55); crash(12.5, 0.07, { dec: 2.4 }); tom(12.5, 55, 0.22, { dec: 0.9 });
    stab(12.5, [50, 51, 56, 62, 63], 0.11, { rel: 2.2, cut0: 3200, cut1: 350, wet: 0.6 });
    drone(12.5, 15.6, [26, 27, 33], 0.02, { cut: 260, cut1: 200, att: 0.05, rel: 0.6, trem: 3 });
    for (s = 0; s < 6; s++) {
      var kt = 13 + s * 0.5;
      bass(kt, 0.2, 38, { vol: 0.12, cut: 500 }); bass(kt + 0.25, 0.15, 38, { vol: 0.08, cut: 500 });
      tick(kt + 0.25, 0.02); tick(kt, 0.012, -0.3);
      if (s % 2 === 0) kick(kt, 0.36);
      pluck(kt, s % 2 ? 63 : 62, { vol: 0.035, dur: 0.25, cut: 900, q: 3, pan: 0.3, wet: 0.4 });
    }
    // 15.5 'Mud = Primary' stamp, 17.6 'BOP = Secondary' stamp
    kick(15.5, 0.4); bell(15.55, 74, 0.035, { dur: 1.8, wet: 0.6 }); bell(15.55, 62, 0.03, { dur: 1.8, wet: 0.5 });
    bars([['Gm', 16, 2], ['A7', 18, 2]], function (c, t0, L, i) {
      pad(t0, t0 + L, c.pad, { vol: 0.05, att: 0.3, rel: 0.3, cut0: 650 + 300 * i, cut1: 900 + 400 * i, wet: 0.5, width: 0.85 });
      bass(t0, 0.9, c.b, { vol: 0.16 }); bass(t0 + 1, 0.4, c.b, { vol: 0.13 }); bass(t0 + 1.5, 0.35, c.b + 7, { vol: 0.1 });
      kick(t0, 0.42); kick(t0 + 1.0, 0.26);
      for (var q = 0; q < 8; q++) tick(t0 + q * 0.25, q % 2 ? 0.018 : 0.012, q % 2 ? 0.35 : -0.35);
      ost(t0, c, 2, 0.7 + 0.2 * i, 1000 + 300 * i);
    });
    bell(17.6, 79, 0.033, { dur: 1.6 }); bell(17.6, 67, 0.028, { dur: 1.6 });
    for (s = 0; s < 4; s++) snare(19.5 + s * 0.125, 0.035 + s * 0.012, { pan: s % 2 ? 0.2 : -0.2 });
    riser(18.8, 20, 0.06, 500, 4000);

    // ---- KICK SIGNS 20–42: investigative ostinato + ticking, building card by card (20 / 27 / 34);
    //      pump stops at 35.5 -> groove drops out, eerie dim pad while the well keeps flowing ----
    function signBar(c, t0, L, lv, o) {
      o = o || {};
      pad(t0, t0 + L, c.pad, { vol: 0.045 + 0.01 * lv, att: 0.2, rel: 0.3, cut0: 700 + 300 * lv, cut1: 850 + 300 * lv, wet: 0.5, width: 0.9 });
      ost(t0, c, L, 0.75 + 0.25 * lv, 1000 + 500 * lv);
      kick(t0, 0.42);
      if (L >= 1.5) kick(t0 + 1.0, 0.24 + 0.08 * lv);
      var n8 = Math.round(L / 0.25), q;
      if (o.drive) {
        for (q = 0; q < n8; q++) bass(t0 + q * 0.25, 0.16, c.b, { vol: q % 4 === 0 ? 0.16 : 0.1, cut: 550 });
        kick(t0 + 0.75, 0.2);
        if (L >= 1.5) snare(t0 + 1.0, 0.06, { dec: 0.15, f: 2200 });
      } else {
        bass(t0, L * 0.45, c.b, { vol: 0.16 });
        if (L === 2) bass(t0 + 1.0, 0.9, c.b, { vol: 0.13 });
      }
      for (q = 0; q < n8; q++) if (o.drive || q % 2 === 1) tick(t0 + q * 0.25, (q % 2 ? 0.02 : 0.012) * (0.8 + 0.3 * lv), q % 2 ? 0.35 : -0.35);
      for (q = 0; q < n8; q += 2) if (q % 4 !== 3) pumpStroke(t0 + q * 0.25, 0.12 + 0.06 * lv);
      if (o.mel) bells(t0, o.mel, 0.026, { dur: 1.3 });
    }
    // card 1 — Pit Gain
    crash(20, 0.035); chime(20.02, CH.Dm, 0.026);
    var card1 = [['Dm', 20, 2, [[0.5, 77], [1.0, 76], [1.5, 74]]], ['Bb', 22, 2, [[0.5, 77], [1.0, 81]]], ['Gm', 24, 2, [[0.5, 82], [1.0, 81], [1.5, 79]]], ['A', 26, 1, [[0, 76], [0.5, 73]]]];
    for (s = 0; s < card1.length; s++) signBar(CH[card1[s][0]], card1[s][1], card1[s][2], 0, { mel: card1[s][3] });
    // card 2 — Flow Increase (driving 8th bass, flow swells)
    crash(27, 0.04); chime(27.02, CH.Dm, 0.028); riser(26.2, 27, 0.04, 600, 3500);
    var card2 = [['Dm', 27, 2, [[0.5, 81], [0.75, 77], [1.0, 74]]], ['Bb', 29, 2, [[0.5, 82], [1.0, 77]]], ['Eb', 31, 2, [[0.5, 79], [1.0, 82], [1.5, 79]]], ['A7', 33, 1, [[0, 79], [0.5, 76]]]];
    for (s = 0; s < card2.length; s++) signBar(CH[card2[s][0]], card2[s][1], card2[s][2], 0.5, { drive: true, mel: card2[s][3] });
    flow(27, 30.5, 0.03, -0.6, 0.6); flow(30.5, 34, 0.035, 0.6, -0.6);
    // card 3 — Flow Check: full groove until the pump stops at 35.5
    crash(34, 0.045); chime(34.02, CH.Dm, 0.03); riser(33.2, 34, 0.05, 600, 4000);
    signBar(CH.Dm, 34, 1.5, 1, { drive: true, mel: [[0, 86], [0.75, 81]] });
    // 35.5 pump winds down (falling low tone), then near-silence
    var wdo = osc('sawtooth', 110, 35.5, 37.1);
    wdo.frequency.setValueAtTime(110, 35.5); wdo.frequency.exponentialRampToValueAtTime(28, 36.9);
    var wdl = filt('lowpass', 500, 1), wdg = gain(0);
    wdg.gain.setValueAtTime(0, 35.5); wdg.gain.linearRampToValueAtTime(0.06, 35.53); wdg.gain.exponentialRampToValueAtTime(0.0005, 37.0);
    wdo.connect(wdl); wdl.connect(wdg); outTo(wdg, { wet: 0.3 });
    pad(35.6, 39.8, [74, 77, 80, 86], { type: 'triangle', vol: 0.028, att: 1.2, rel: 0.6, cut0: 1800, cut1: 3000, wet: 0.85, width: 1, lfo: 4.5 });
    drone(35.6, 41.8, [26, 33], 0.02, { cut: 180, cut1: 380, att: 1.0, rel: 0.3, trem: 0.7 });
    for (s = 0; s < 4; s++) heart(36 + s, 0.22 + s * 0.02);
    bells(36, [[0.25, 86], [1.75, 85], [2.5, 86], [3.25, 80]], 0.022, { dur: 1.8, wet: 0.8 });
    flow(36, 39.6, 0.035, -0.5, 0.5); // the well keeps flowing with the pumps off
    pad(38, 40, CH.Bbmaj7.pad, { vol: 0.035, att: 0.8, rel: 0.2, cut0: 500, cut1: 700, wet: 0.6 });
    // 40–42 build into the shut-in
    pad(40, 42, CH.A7.pad, { vol: 0.05, att: 0.3, rel: 0.1, cut0: 600, cut1: 2200, wet: 0.5, width: 0.9 });
    for (s = 0; s < 16; s++) tick(40 + s * 0.125, 0.008 + s * 0.0015, s % 2 ? 0.3 : -0.3);
    for (s = 0; s < 8; s++) bass(40 + s * 0.25, 0.16, 45, { vol: 0.09 + s * 0.01, cut: 500 });
    kick(40, 0.4); kick(41, 0.4);
    ost(40, CH.A7, 2, 0.8, 900);
    for (s = 0; s < 8; s++) snare(41 + s * 0.125, 0.02 + s * 0.008, { dec: 0.1, pan: s % 2 ? 0.2 : -0.2 });
    riser(40.4, 42, 0.08, 400, 4500);

    // ---- SHUT-IN 42–56: decisive march pulse, accents on each step (42.5 / 45 / 47.5 / 51.5),
    //      deceptive cadence A7 -> Bbmaj7 at 53 = relief ('WELL SHUT-IN') ----
    crash(42, 0.05);
    var shut = [['Dm', 42, 2], ['DmC', 44, 2], ['Bb', 46, 2], ['Gm', 48, 2], ['Eb', 50, 1.5], ['A7', 51.5, 1.5]];
    bars(shut, function (c, t0, L, i) {
      pad(t0, t0 + L, c.pad, { vol: 0.05 + i * 0.003, att: 0.08, rel: 0.25, cut0: 800 + i * 80, cut1: 950 + i * 120, wet: 0.45, width: 0.9 });
      var n8 = Math.round(L / 0.25), q;
      for (q = 0; q < n8; q++) {
        var qt = t0 + q * 0.25;
        bass(qt, 0.15, c.b, { vol: q % 2 ? 0.09 : 0.13, cut: 520 });
        tick(qt, q % 2 ? 0.02 : 0.011, q % 2 ? 0.35 : -0.35);
      }
      for (q = 0; q < L; q += 1) { var kq = t0 + q; if (Math.abs(kq - 45) > 0.01 && Math.abs(kq - 51.5) > 0.01) kick(kq, 0.36); }
      ost(t0, c, L, 0.8, 1100);
    });
    step(42.5, CH.Dm); step(45, CH.DmC); step(47.5, CH.Bb, true); step(51.5, CH.A7, true);
    for (s = 0; s < 4; s++) snare(51 + s * 0.1, 0.025 + s * 0.01, { dec: 0.08 });
    crash(53, 0.045, { dec: 2.2 }); kick(53, 0.42);
    pad(53, 55.6, CH.Bbmaj7.pad.concat([69]), { vol: 0.075, att: 0.25, rel: 1.2, cut0: 900, cut1: 1700, wet: 0.65, width: 0.95 });
    pad(53.3, 55.6, [77, 81, 86], { type: 'triangle', vol: 0.022, att: 1.0, rel: 1.0, cut0: 3000, cut1: 4000, wet: 0.8, width: 1 });
    bass(53, 2.6, 34, { vol: 0.16, att: 0.05, rel: 0.8 });
    chime(53.02, CH.Bbmaj7, 0.032);
    bells(53, [[0.75, 77], [1.25, 81], [2.0, 74]], 0.024, { dur: 1.8 });
    for (s = 0; s < 5; s++) tick(53.5 + s * 0.5, 0.012);

    // ---- READ PRESSURES 56–70: calm, focused, sparse; pings for SIDPP (57) / SICP (60, higher), formula card 63.5 ----
    var prs = [['Dm9', 56, 2], ['Bbmaj7', 58, 2], ['Gm7', 60, 2], ['Asus4', 62, 1], ['A', 63, 1], ['Dm9', 64, 2], ['Bbmaj7', 66, 2], ['C', 68, 1], ['Asus4', 69, 1]];
    bars(prs, function (c, t0, L, i) {
      pad(t0, t0 + L, c.pad, { vol: 0.048, att: 0.4, rel: 0.4, cut0: 650, cut1: 800, wet: 0.6, width: 0.9 });
      bass(t0, L - 0.1, c.b, { vol: 0.14, att: 0.06, rel: 0.25 });
      kick(t0, L === 2 ? 0.3 : 0.24, { dec: 0.4 });
      var q;
      for (q = 0; q < L / 0.5; q++) tick(t0 + q * 0.5 + 0.25, 0.012, 0.35);
      if (t0 >= 64) for (q = 0; q < L / 0.5; q++) pluck(t0 + q * 0.5, c.arp[[0, 2, 1, 3][q % 4]], { vol: 0.028, dur: 0.3, cut: 1000, pan: q % 2 ? 0.3 : -0.3, wet: 0.45 });
    });
    drone(56, 69.5, [26], 0.01, { cut: 160, att: 2, rel: 1, trem: 0.2 });
    bells(57, [[0, 81], [0.5, 77]], 0.026, { dur: 1.6 });
    bells(60, [[0, 82], [0.5, 86]], 0.026, { dur: 1.6 });
    for (s = 0; s < 4; s++) bell(63.5 + s * 0.125, [69, 73, 76, 81][s], 0.022, { dur: s === 3 ? 1.6 : 0.8, pan: (s - 1.5) * 0.3, wet: 0.6 });
    bells(68, [[0, 79], [0.5, 84]], 0.022, { dur: 1.4 });
    riser(69, 70, 0.05, 500, 3500);

    // ---- DRILLER'S METHOD circ 1 70–86: pumps come on slowly, steady half-time groove gaining energy;
    //      gas rises & expands (swells + riser into 80); flare 80–86 (fire SFX ≈81) ----
    crash(70, 0.04); kick(70, 0.46); chime(70.02, CH.Dm, 0.026);
    var c1 = [['Dm', 70, 2], ['Bb', 72, 2], ['F', 74, 2], ['C', 76, 2], ['Dm', 78, 2], ['Bb', 80, 2], ['C', 82, 2], ['Gm7', 84, 1], ['A', 85, 1]];
    var c1mel = [[[0, 74], [0.75, 77], [1.0, 81]], [[0, 82], [1.0, 81], [1.5, 77]], [[0, 77], [0.75, 81], [1.0, 84]], [[0, 79], [0.75, 84], [1.0, 88]],
      [[0, 86], [1.0, 81]], [[0, 86], [0.75, 84], [1.0, 82]], [[0, 84], [1.0, 88]], [[0, 86], [0.5, 82]], [[0, 85], [0.5, 88]]];
    bars(c1, function (c, t0, L, i) {
      var lv = 0.62 + i * 0.05, br = i / 8;
      pad(t0, t0 + L, c.pad, { vol: 0.045 + 0.012 * br, att: 0.15, rel: 0.3, cut0: 800 + 500 * br, cut1: 950 + 500 * br, wet: 0.5, width: 0.9 });
      if (L === 2) groove(t0, c, i, { lv: lv, br: br * 0.6, noKick1: t0 === 70 || t0 === 80 });
      else { bass(t0, 0.45, c.b, { vol: 0.16 }); bass(t0 + 0.5, 0.35, c.b + 7, { vol: 0.11 }); kick(t0, 0.4); hat(t0 + 0.25, 0.028); hat(t0 + 0.75, 0.028); }
      var np = t0 < 72 ? 1 : (t0 < 74 ? 2 : 3);
      for (var q = 0; q < np && q * 0.5 < L; q++) pumpStroke(t0 + q * 0.5, 0.2 + 0.03 * Math.min(i, 4));
      bells(t0, c1mel[i], 0.027 + 0.002 * br, { dur: 1.3 });
    });
    flow(70, 74, 0.025, -0.5, 0.5); flow(74, 78, 0.03, 0.5, -0.5);
    riser(77, 80, 0.07, 300, 4200);
    crash(80, 0.06, { dec: 2.0 }); kick(80, 0.5);
    pad(80, 84, [77, 81, 86], { type: 'triangle', vol: 0.02, att: 0.8, rel: 0.6, cut0: 3000, cut1: 4000, wet: 0.8, width: 1 });
    for (s = 0; s < 24; s++) if (s % 4) shaker(80 + s * 0.25 + 0.125, 0.012, { pan: 0.35 });
    for (s = 0; s < 4; s++) snare(85.5 + s * 0.125, 0.035 + s * 0.012, { pan: s % 2 ? 0.2 : -0.2 });
    riser(85, 86, 0.05, 600, 4500);

    // ---- circ 2 KILL MUD 86–100: brighter, building optimism; lydian E sparkle lifts toward major;
    //      chimes for SIDPP -> 0 (92) and SICP -> 0 (98) ----
    crash(86, 0.05); kick(86, 0.5); chime(86.02, CH.Bb, 0.028);
    var c2 = [['Bb', 86, 2], ['F', 88, 2], ['Gm7', 90, 2], ['C', 92, 2], ['Bbmaj7', 94, 2], ['FA', 96, 2], ['Gm7', 98, 1], ['Asus4', 99, 1]];
    var c2mel = [[[0, 81], [0.75, 82], [1.0, 86]], [[0, 84], [1.0, 81]], [[0, 82], [0.75, 81], [1.0, 79]], [[0, 79], [0.75, 84], [1.0, 88]],
      [[0, 86], [1.0, 89]], [[0, 88], [0.75, 86], [1.0, 84]], [[0, 82], [0.5, 86]], [[0, 86], [0.5, 88]]];
    bars(c2, function (c, t0, L, i) {
      var lv = 0.85 + i * 0.022, br = 0.4 + i * 0.08;
      pad(t0, t0 + L, c.pad, { vol: 0.05 + 0.01 * br, att: 0.15, rel: 0.3, cut0: 900 + 500 * br, cut1: 1050 + 500 * br, wet: 0.5, width: 0.95 });
      if (L === 2) groove(t0, c, i, { lv: lv, br: br, noKick1: t0 === 86 });
      else { bass(t0, 0.45, c.b, { vol: 0.16 }); bass(t0 + 0.5, 0.3, c.b + 12, { vol: 0.1 }); kick(t0, 0.4); hat(t0 + 0.25, 0.028); hat(t0 + 0.75, 0.028); }
      for (var q = 0; q < 3 && q * 0.5 < L; q++) pumpStroke(t0 + q * 0.5, q ? 0.2 : 0.26);
      bells(t0, c2mel[i], 0.028, { dur: 1.3 });
    });
    pad(90, 99.9, [86, 88], { type: 'triangle', vol: 0.018, att: 3, rel: 0.2, cut0: 2500, cut1: 5000, wet: 0.8, width: 1 });
    chime(92.02, CH.C, 0.028); chime(98.02, CH.Gm7, 0.024);
    flow(86, 92, 0.025, 0.5, -0.5); flow(92, 98, 0.025, -0.5, 0.5);

    // ---- WELL DEAD 100–110: flow-check hush 100–101.5, triumphant D major at 101.5, then gentle ----
    pad(100, 101.45, CH.Asus4.pad, { vol: 0.045, att: 0.05, rel: 0.1, cut0: 900, cut1: 1600, wet: 0.6 });
    bass(100, 1.4, 45, { vol: 0.12, rel: 0.1 });
    tick(100, 0.016); tick(100.5, 0.018); tick(101, 0.02); tick(101.25, 0.022);
    riser(100.3, 101.5, 0.07, 500, 5000);
    kick(101.5, 0.55); crash(101.5, 0.09, { dec: 2.6 }); boom(101.5, 0.12, { dur: 1.6 });
    pad(101.5, 104, CH.D.pad.concat([69]), { vol: 0.1, att: 0.02, rel: 0.6, cut0: 2600, cut1: 1100, wet: 0.65, width: 0.9 });
    pad(101.6, 104, [78, 81, 86], { type: 'triangle', vol: 0.025, att: 0.6, rel: 0.6, cut0: 4000, cut1: 3000, wet: 0.8, width: 1 });
    bass(101.5, 0.45, 38, { vol: 0.19 }); bass(101.5, 2.4, 26, { vol: 0.06 });
    for (s = 0; s < 4; s++) bell(101.52 + s * 0.08, [74, 78, 81, 86][s], 0.034, { dur: 2.0, pan: (s - 1.5) * 0.3, wet: 0.7 });
    groove(102, CH.D, 1, { lv: 0.6, br: 0.8 });
    var wd2 = [['Gmaj7', 104, 2], ['Bm7', 106, 2], ['Gadd9', 108, 1], ['Asus4', 109, 1]];
    var wdm = [[[0, 83], [1.0, 86]], [[0, 86], [0.75, 85], [1.0, 81]], [[0, 79], [0.5, 81]], [[0, 81], [0.5, 85]]];
    bars(wd2, function (c, t0, L, i) {
      pad(t0, t0 + L, c.pad, { vol: 0.045, att: 0.2, rel: 0.3, cut0: 1000, cut1: 1100, wet: 0.55, width: 0.95 });
      if (L === 2) groove(t0, c, i, { lv: 0.6, br: 0.8 });
      else { bass(t0, 0.45, c.b, { vol: 0.15 }); bass(t0 + 0.5, 0.3, c.b + 12, { vol: 0.09 }); kick(t0, 0.3); hat(t0 + 0.25, 0.022); hat(t0 + 0.75, 0.022); }
      bells(t0, wdm[i], 0.024, { dur: 1.4 });
    });
    chime(105.02, CH.Gmaj7, 0.022);
    riser(109.2, 110, 0.05, 600, 4500);

    // ---- END 110–120: signature resolved in D major at 110.5, plagal G -> D tail, silence by ~119.5 ----
    kick(110, 0.45); crash(110, 0.08, { dec: 2.6 }); boom(110, 0.1, { dur: 1.6 });
    pad(110, 112.5, CH.Dadd9.pad.concat([74]), { vol: 0.11, att: 0.05, rel: 2.6, cut0: 2600, cut1: 700, wet: 0.7, width: 0.85 });
    sig(110.5, 0.085, { notes: SIG_MAJ, last: 3.0 });
    bass(110, 2.4, 38, { vol: 0.18, rel: 1.2 }); bass(110, 2.4, 26, { vol: 0.07, rel: 1.2 });
    var fin = [78, 81, 86, 88];
    for (var fi = 0; fi < fin.length; fi++) bell(111.6 + fi * 0.09, fin[fi], 0.03, { dur: 2.2, pan: (fi - 1.5) * 0.3, wet: 0.7 });
    pad(113, 115, CH.Gadd9.pad, { vol: 0.045, att: 0.8, rel: 0.6, cut0: 700, cut1: 600, wet: 0.7 });
    pad(115, 116.5, CH.Dadd9.pad, { vol: 0.045, att: 0.6, rel: 2.0, cut0: 700, cut1: 300, wet: 0.7 });
    bass(113, 1.9, 43, { vol: 0.1, att: 0.3, rel: 0.4 }); bass(115, 1.5, 38, { vol: 0.1, att: 0.3, rel: 1.5 });
    bell(115.2, 86, 0.02, { dur: 2.5, wet: 0.8 });

    // ============ SFX ============
    var SFXLEN = { whoosh: 0.8, alarm: 1.5, clunk: 0.6, impact: 2.0, hiss: 1.2, fire: 2.0, pump: 1.5, success: 1.0, blip: 0.15, bubble: 0.8 };
    var DUCK = { whoosh: 0.85, alarm: 0.75, clunk: 0.8, impact: 0.65, hiss: 0.8, fire: 0.72, pump: 0.8, success: 0.8, blip: 0.95, bubble: 0.88 };

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
      SFX[cu.sfx](cu.t);
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

  window.Score = { renderWav: renderWav, SAMPLE_RATE: SR, BPM: 120, DURATION: 120 };
})();
