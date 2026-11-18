// Звук: музыка по зонам (бесшовные петли через WebAudio), шаги, фонтан, гул ламп, двери.
(function () {
  'use strict';
  const A = {
    ctx: null, musicGain: null, sfxGain: null, ambGain: null,
    raw: {}, decoded: {}, cur: null, curName: null,
    musicVol: 0.6, sfxVol: 0.7,
  };

  A.preload = async function (names, onProgress) {
    let done = 0;
    await Promise.all(names.map(async n => {
      try {
        const r = await fetch('music/' + n + '.mp3');
        A.raw[n] = await r.arrayBuffer();
      } catch (e) { console.warn('музыка не загрузилась', n, e); }
      done++; onProgress && onProgress(done / names.length);
    }));
  };

  A.init = function () {
    if (A.ctx) { A.ctx.resume(); return; }
    const C = window.AudioContext || window.webkitAudioContext;
    A.ctx = new C();
    const ctx = A.ctx;
    A.musicGain = ctx.createGain(); A.musicGain.gain.value = A.musicVol; A.musicGain.connect(ctx.destination);
    A.sfxGain = ctx.createGain(); A.sfxGain.gain.value = A.sfxVol; A.sfxGain.connect(ctx.destination);
    A.ambGain = ctx.createGain(); A.ambGain.gain.value = 1; A.ambGain.connect(A.sfxGain);

    // общий буфер шума
    const n = ctx.sampleRate * 2;
    A.noise = ctx.createBuffer(1, n, ctx.sampleRate);
    const d = A.noise.getChannelData(0);
    let b = 0;
    for (let i = 0; i < n; i++) { const w = Math.random() * 2 - 1; b = 0.97 * b + 0.03 * w; d[i] = w * 0.6 + b * 2; }

    // фонтан
    const fs = ctx.createBufferSource(); fs.buffer = A.noise; fs.loop = true;
    const f1 = ctx.createBiquadFilter(); f1.type = 'bandpass'; f1.frequency.value = 1400; f1.Q.value = 0.4;
    const f2 = ctx.createBiquadFilter(); f2.type = 'highshelf'; f2.frequency.value = 4000; f2.gain.value = 4;
    A.fountainGain = ctx.createGain(); A.fountainGain.gain.value = 0;
    fs.connect(f1); f1.connect(f2); f2.connect(A.fountainGain); A.fountainGain.connect(A.ambGain); fs.start();

    // гул люминесцентных ламп
    const hum = ctx.createOscillator(); hum.type = 'sawtooth'; hum.frequency.value = 100;
    const hl = ctx.createBiquadFilter(); hl.type = 'lowpass'; hl.frequency.value = 380;
    A.humGain = ctx.createGain(); A.humGain.gain.value = 0.006;
    hum.connect(hl); hl.connect(A.humGain); A.humGain.connect(A.ambGain); hum.start();
  };

  A.setVolumes = function (music, sfx) {
    A.musicVol = music; A.sfxVol = sfx;
    if (!A.ctx) return;
    A.musicGain.gain.setTargetAtTime(music, A.ctx.currentTime, 0.05);
    A.sfxGain.gain.setTargetAtTime(sfx, A.ctx.currentTime, 0.05);
  };

  async function getBuffer(name) {
    if (A.decoded[name]) return A.decoded[name];
    if (!A.raw[name]) return null;
    const buf = await A.ctx.decodeAudioData(A.raw[name].slice(0));
    // держим в памяти не больше двух расжатых треков
    const keys = Object.keys(A.decoded);
    if (keys.length >= 2) delete A.decoded[keys.find(k => k !== A.curName) || keys[0]];
    A.decoded[name] = buf;
    return buf;
  }

  A.playMusic = async function (name) {
    if (!A.ctx || name === A.curName) return;
    A.curName = name;
    const buf = await getBuffer(name);
    if (!buf || A.curName !== name) return;
    const t = A.ctx.currentTime;
    if (A.cur) {
      const old = A.cur;
      old.gain.gain.cancelScheduledValues(t);
      old.gain.gain.setValueAtTime(old.gain.gain.value, t);
      old.gain.gain.linearRampToValueAtTime(0, t + 2.5);
      old.src.stop(t + 2.6);
    }
    const src = A.ctx.createBufferSource(); src.buffer = buf; src.loop = true;
    const g = A.ctx.createGain(); g.gain.value = 0;
    g.gain.linearRampToValueAtTime(1, t + 2.5);
    src.connect(g); g.connect(A.musicGain);
    src.start(t, Math.random() * buf.duration * 0.5);
    A.cur = { src, gain: g };
  };

  // мягкий шаг: короткий шум через фильтр + лёгкий «тук»
  A.step = function (surface) {
    if (!A.ctx) return;
    const ctx = A.ctx, t = ctx.currentTime;
    const cfg = { hard: [2600, 0.22, 0.07], wood: [1300, 0.26, 0.09], soft: [550, 0.3, 0.11] }[surface] || [1500, 0.22, 0.08];
    const src = ctx.createBufferSource(); src.buffer = A.noise;
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = cfg[0] * (0.85 + Math.random() * 0.3);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(cfg[1] * (0.8 + Math.random() * 0.4), t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.001, t + cfg[2]);
    src.connect(f); f.connect(g); g.connect(A.sfxGain);
    src.start(t, Math.random() * 1.5, cfg[2] + 0.02);
    if (surface !== 'soft') {
      const o = ctx.createOscillator(); o.frequency.setValueAtTime(110, t); o.frequency.exponentialRampToValueAtTime(55, t + 0.06);
      const og = ctx.createGain(); og.gain.setValueAtTime(0.12, t); og.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
      o.connect(og); og.connect(A.sfxGain); o.start(t); o.stop(t + 0.08);
    }
  };

  A.door = function (secret) {
    if (!A.ctx) return;
    const ctx = A.ctx, t = ctx.currentTime;
    const src = ctx.createBufferSource(); src.buffer = A.noise;
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = secret ? 300 : 900;
    const g = ctx.createGain(); const len = secret ? 1.4 : 0.5;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(secret ? 0.6 : 0.18, t + 0.08); g.gain.linearRampToValueAtTime(0, t + len);
    src.connect(f); f.connect(g); g.connect(A.sfxGain); src.start(t, 0, len + 0.05);
    if (secret) {
      const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = 48;
      const og = ctx.createGain(); og.gain.setValueAtTime(0, t); og.gain.linearRampToValueAtTime(0.2, t + 0.1); og.gain.linearRampToValueAtTime(0, t + len);
      o.connect(og); og.connect(A.sfxGain); o.start(t); o.stop(t + len);
    }
  };

  A.blip = function (hi) {
    if (!A.ctx) return;
    const ctx = A.ctx, t = ctx.currentTime;
    const o = ctx.createOscillator(); o.type = 'square'; o.frequency.value = hi ? 880 : 660;
    const g = ctx.createGain(); g.gain.setValueAtTime(0.04, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
    o.connect(g); g.connect(A.sfxGain); o.start(t); o.stop(t + 0.1);
  };

  function noiseBurst(t, len, type, freq, gain, q) {
    const ctx = A.ctx;
    const src = ctx.createBufferSource(); src.buffer = A.noise;
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; if (q) f.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(gain, t + 0.01); g.gain.exponentialRampToValueAtTime(0.001, t + len);
    src.connect(f); f.connect(g); g.connect(A.sfxGain); src.start(t, Math.random(), len + 0.05);
    return f;
  }
  function tone(t, freq, len, gain, type = 'sine') {
    const o = A.ctx.createOscillator(); o.type = type; o.frequency.value = freq;
    const g = A.ctx.createGain(); g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.001, t + len);
    o.connect(g); g.connect(A.sfxGain); o.start(t); o.stop(t + len + 0.02);
  }
  A.clunk = function () {
    if (!A.ctx) return; const t = A.ctx.currentTime;
    noiseBurst(t, 0.15, 'bandpass', 2400, 0.2, 3); tone(t, 1300, 0.08, 0.05, 'square');
    noiseBurst(t + 0.55, 0.25, 'lowpass', 400, 0.6); tone(t + 0.55, 70, 0.2, 0.35);
  };
  A.bell = function () {
    if (!A.ctx) return; const t = A.ctx.currentTime;
    for (const [f, g] of [[1760, 0.12], [4400, 0.04], [2640, 0.05]]) tone(t, f, 1.4, g);
  };
  A.coin = function () {
    if (!A.ctx) return; const t = A.ctx.currentTime;
    tone(t, 2600, 0.12, 0.06, 'triangle'); tone(t + 0.09, 3200, 0.1, 0.04, 'triangle');
    noiseBurst(t + 0.45, 0.3, 'bandpass', 900, 0.25, 1);
  };
  A.flush = function (short) {
    if (!A.ctx) return; const t = A.ctx.currentTime, len = short ? 1.4 : 2.6;
    const f = noiseBurst(t, len, 'bandpass', 600, short ? 0.25 : 0.45, 0.7);
    f.frequency.setValueAtTime(400, t); f.frequency.linearRampToValueAtTime(1600, t + 0.5); f.frequency.linearRampToValueAtTime(500, t + len);
  };

  A.ambience = function (fountainDist, service) {
    if (!A.ctx) return;
    const t = A.ctx.currentTime;
    const fg = 0.35 / (1 + fountainDist * fountainDist * 0.35);
    A.fountainGain.gain.setTargetAtTime(fg, t, 0.2);
    A.humGain.gain.setTargetAtTime(service ? 0.022 : 0.006, t, 0.5);
  };

  window.MuseumAudio = A;
})();
