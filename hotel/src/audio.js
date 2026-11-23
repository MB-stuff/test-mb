// Весь звук синтезируется на лету через WebAudio: музыка vaporwave ambient,
// шаги, двери, стаканы, лифт и прочее. Внешних аудиофайлов нет.

let ctx = null;
let master, musicBus, sfxBus, reverb, reverbSend, musicLP;
let noiseBuf = null;
const loops = {};

export const audio = {
  get ready() { return !!ctx; },
  get ctx() { return ctx; },
  musicVolume: 0.55,
  sfxVolume: 0.9,
  station: 0,
};

function makeImpulse(seconds, decay) {
  const rate = ctx.sampleRate, len = Math.floor(rate * seconds);
  const buf = ctx.createBuffer(2, len, rate);
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
  }
  return buf;
}

export function initAudio() {
  if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  ctx = new AC();
  master = ctx.createGain(); master.gain.value = 0.9; master.connect(ctx.destination);
  reverb = ctx.createConvolver(); reverb.buffer = makeImpulse(4.5, 2.6);
  const revOut = ctx.createGain(); revOut.gain.value = 0.9; reverb.connect(revOut); revOut.connect(master);
  musicLP = ctx.createBiquadFilter(); musicLP.type = 'lowpass'; musicLP.frequency.value = 3200; musicLP.Q.value = 0.4;
  musicBus = ctx.createGain(); musicBus.gain.value = audio.musicVolume;
  musicLP.connect(musicBus); musicBus.connect(master);
  const musicRev = ctx.createGain(); musicRev.gain.value = 0.55; musicLP.connect(musicRev); musicRev.connect(reverb);
  sfxBus = ctx.createGain(); sfxBus.gain.value = audio.sfxVolume; sfxBus.connect(master);
  reverbSend = ctx.createGain(); reverbSend.gain.value = 0.25; sfxBus.connect(reverbSend); reverbSend.connect(reverb);

  const len = ctx.sampleRate * 2;
  noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;

  startMusic();
  startAmbience();
}

export function setMusicVolume(v) {
  audio.musicVolume = v;
  if (musicBus) musicBus.gain.setTargetAtTime(v, ctx.currentTime, 0.2);
}
export function setRoomReverb(v) {
  if (reverbSend) reverbSend.gain.setTargetAtTime(v, ctx.currentTime, 0.4);
}
// Приглушение музыки (например, в подвале или под водой)
export function setMusicMuffle(cut) {
  if (musicLP) musicLP.frequency.setTargetAtTime(cut, ctx.currentTime, 0.6);
}

// ---------- примитивы ----------
const now = () => ctx.currentTime;
function env(g, t, a, peak, dcy, sustain = 0) {
  g.gain.cancelScheduledValues(t);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(peak, t + a);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0001, sustain), t + a + dcy);
}
function noise(t, dur, { type = 'bandpass', freq = 1000, q = 1, gain = 0.3, attack = 0.005, out = sfxBus, freqEnd = null } = {}) {
  const src = ctx.createBufferSource(); src.buffer = noiseBuf;
  src.playbackRate.value = 0.8 + Math.random() * 0.4;
  const f = ctx.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
  if (freqEnd) f.frequency.exponentialRampToValueAtTime(freqEnd, t + dur);
  const g = ctx.createGain(); env(g, t, attack, gain, dur);
  src.connect(f); f.connect(g); g.connect(out);
  src.start(t, Math.random() * 1.5); src.stop(t + dur + attack + 0.05);
  return g;
}
function tone(t, freq, dur, { type = 'sine', gain = 0.2, attack = 0.005, out = sfxBus, freqEnd = null, detune = 0 } = {}) {
  const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, t); o.detune.value = detune;
  if (freqEnd) o.frequency.exponentialRampToValueAtTime(freqEnd, t + dur);
  const g = ctx.createGain(); env(g, t, attack, gain, dur);
  o.connect(g); g.connect(out); o.start(t); o.stop(t + attack + dur + 0.05);
  return o;
}

// ---------- шаги ----------
let stepFlip = 0;
export function sfxStep(surface = 'carpet', run = false) {
  if (!ctx) return;
  const t = now(); stepFlip ^= 1;
  const k = run ? 1.25 : 1;
  switch (surface) {
    case 'carpet':
      noise(t, 0.12, { type: 'lowpass', freq: 380 + stepFlip * 60, gain: 0.22 * k, attack: 0.012 });
      noise(t, 0.05, { type: 'bandpass', freq: 1400, q: 0.8, gain: 0.03 * k });
      break;
    case 'tile':
    case 'marble':
      noise(t, 0.05, { type: 'highpass', freq: 2200, gain: 0.12 * k });
      tone(t, surface === 'marble' ? 190 + stepFlip * 20 : 260 + stepFlip * 25, 0.06, { gain: 0.12 * k, type: 'triangle' });
      noise(t + 0.03, 0.08, { type: 'bandpass', freq: 900, q: 2, gain: 0.05 * k });
      break;
    case 'wood':
      tone(t, 120 + stepFlip * 15, 0.09, { gain: 0.22 * k, type: 'triangle' });
      noise(t, 0.07, { type: 'bandpass', freq: 700, q: 1.5, gain: 0.1 * k });
      if (Math.random() < 0.08) tone(t + 0.05, 420, 0.25, { type: 'sawtooth', gain: 0.012, freqEnd: 300 }); // скрип
      break;
    case 'metal':
      tone(t, 340 + stepFlip * 40, 0.15, { gain: 0.08 * k, type: 'square' });
      noise(t, 0.08, { type: 'bandpass', freq: 3000, q: 4, gain: 0.08 * k });
      break;
    case 'water':
      noise(t, 0.25, { type: 'bandpass', freq: 900, q: 0.7, gain: 0.25 * k, freqEnd: 400 });
      break;
    case 'roof':
    case 'concrete':
    default:
      noise(t, 0.07, { type: 'bandpass', freq: 1700, q: 0.9, gain: 0.14 * k });
      tone(t, 95, 0.07, { gain: 0.18 * k, type: 'sine' });
      break;
  }
}

// ---------- взаимодействия ----------
export function sfxDoorOpen(heavy = false) {
  if (!ctx) return; const t = now();
  noise(t, 0.04, { type: 'highpass', freq: 3000, gain: 0.2 }); // щелчок замка
  tone(t + 0.02, 1800, 0.03, { type: 'square', gain: 0.05 });
  // скрип петель
  const o = ctx.createOscillator(); o.type = 'sawtooth';
  o.frequency.setValueAtTime(heavy ? 160 : 260, t + 0.08);
  o.frequency.linearRampToValueAtTime(heavy ? 120 : 390, t + 0.5);
  o.frequency.linearRampToValueAtTime(heavy ? 140 : 310, t + 0.85);
  const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1100; f.Q.value = 6;
  const lfo = ctx.createOscillator(); lfo.frequency.value = 23; const lg = ctx.createGain(); lg.gain.value = 40;
  lfo.connect(lg); lg.connect(o.frequency);
  const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(0.05, t + 0.2); g.gain.linearRampToValueAtTime(0.0001, t + 0.9);
  o.connect(f); f.connect(g); g.connect(sfxBus);
  o.start(t + 0.08); o.stop(t + 1); lfo.start(t); lfo.stop(t + 1);
  noise(t + 0.1, 0.6, { type: 'lowpass', freq: 300, gain: 0.05, attack: 0.2 });
}
export function sfxDoorClose() {
  if (!ctx) return; const t = now();
  noise(t, 0.25, { type: 'lowpass', freq: 220, gain: 0.5, attack: 0.002 });
  tone(t, 70, 0.2, { gain: 0.35 });
  noise(t + 0.05, 0.04, { type: 'highpass', freq: 2500, gain: 0.15 });
}
export function sfxLocked() {
  if (!ctx) return; const t = now();
  for (let i = 0; i < 3; i++) {
    noise(t + i * 0.09, 0.05, { type: 'bandpass', freq: 2400, q: 3, gain: 0.18 });
    tone(t + i * 0.09, 900 + i * 40, 0.04, { type: 'square', gain: 0.03 });
  }
}
export function sfxKnock(times = 3, delay = 0) {
  if (!ctx) return; const t = now() + delay;
  for (let i = 0; i < times; i++) {
    tone(t + i * 0.22, 110, 0.1, { gain: 0.5, type: 'triangle' });
    noise(t + i * 0.22, 0.06, { type: 'lowpass', freq: 500, gain: 0.35 });
  }
}
export function sfxClink(pitch = 1) {
  if (!ctx) return; const t = now();
  [2637, 3520, 4186, 5274].forEach((f, i) => tone(t, f * pitch * (1 + Math.random() * 0.01), 0.9 - i * 0.15, { gain: 0.07 / (i + 1) }));
  noise(t, 0.02, { type: 'highpass', freq: 5000, gain: 0.08 });
}
export function sfxBell() {
  if (!ctx) return; const t = now();
  [1568, 1568 * 2.76, 1568 * 5.4].forEach((f, i) => tone(t, f, 2.2 - i * 0.6, { gain: 0.12 / (i + 1) }));
}
export function sfxElevatorDing() {
  if (!ctx) return; const t = now();
  tone(t, 1318.5, 1.6, { gain: 0.15 }); tone(t, 2637, 0.8, { gain: 0.03 });
  tone(t + 0.45, 1046.5, 1.8, { gain: 0.15 }); tone(t + 0.45, 2093, 0.9, { gain: 0.03 });
}
export function sfxElevatorRide(dur = 2.6) {
  if (!ctx) return; const t = now();
  const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 55;
  const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 180;
  const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(0.18, t + 0.6); g.gain.setValueAtTime(0.18, t + dur - 0.6); g.gain.linearRampToValueAtTime(0.0001, t + dur);
  o.connect(f); f.connect(g); g.connect(sfxBus); o.start(t); o.stop(t + dur + 0.1);
  noise(t, dur, { type: 'lowpass', freq: 400, gain: 0.07, attack: 0.5 });
  noise(t + dur - 0.3, 0.2, { type: 'lowpass', freq: 160, gain: 0.3 });
}
export function sfxSlide() {
  if (!ctx) return; const t = now();
  noise(t, 0.7, { type: 'bandpass', freq: 600, q: 1.2, gain: 0.12, attack: 0.05, freqEnd: 900 });
}
export function sfxClick() {
  if (!ctx) return; const t = now();
  noise(t, 0.015, { type: 'highpass', freq: 3500, gain: 0.25 });
  tone(t, 2400, 0.02, { type: 'square', gain: 0.03 });
}
export function sfxSwitch(heavy = false) {
  if (!ctx) return; const t = now();
  noise(t, heavy ? 0.12 : 0.03, { type: 'bandpass', freq: heavy ? 500 : 2600, q: 1, gain: heavy ? 0.6 : 0.3 });
  if (heavy) { tone(t, 60, 0.4, { gain: 0.4 }); noise(t + 0.1, 0.4, { type: 'highpass', freq: 4000, gain: 0.08 }); }
}
export function sfxSit() {
  if (!ctx) return; const t = now();
  noise(t, 0.35, { type: 'lowpass', freq: 600, gain: 0.25, attack: 0.04 });
  noise(t + 0.15, 0.3, { type: 'bandpass', freq: 1800, q: 0.6, gain: 0.04, attack: 0.05 });
  tone(t + 0.05, 80, 0.2, { gain: 0.12 });
}
export function sfxPaper() {
  if (!ctx) return; const t = now();
  for (let i = 0; i < 4; i++) noise(t + i * 0.06 + Math.random() * 0.03, 0.08, { type: 'highpass', freq: 2500 + Math.random() * 2000, gain: 0.08 });
}
export function sfxPickup() {
  if (!ctx) return; const t = now();
  tone(t, 880, 0.12, { gain: 0.08, type: 'triangle' }); tone(t + 0.08, 1320, 0.25, { gain: 0.07, type: 'triangle' });
  noise(t, 0.05, { type: 'highpass', freq: 4000, gain: 0.1 });
}
export function sfxSecret() {
  if (!ctx) return; const t = now();
  [523.25, 659.25, 783.99, 987.77, 1174.66].forEach((f, i) => {
    tone(t + i * 0.13, f, 2.2, { gain: 0.06, type: 'sine' });
    tone(t + i * 0.13, f * 2, 1.2, { gain: 0.015, type: 'triangle' });
  });
}
export function sfxFlush() {
  if (!ctx) return; const t = now();
  noise(t, 0.1, { type: 'highpass', freq: 2000, gain: 0.15 });
  noise(t + 0.1, 2.6, { type: 'bandpass', freq: 700, q: 0.5, gain: 0.35, attack: 0.25, freqEnd: 250 });
  noise(t + 1.5, 1.8, { type: 'highpass', freq: 3000, gain: 0.04, attack: 0.4 });
}
export function sfxPiano(midi, vel = 0.12, when = 0) {
  if (!ctx) return; const t = now() + when;
  const f = 440 * Math.pow(2, (midi - 69) / 12);
  tone(t, f, 2.5, { gain: vel, type: 'triangle' });
  tone(t, f * 2, 1.2, { gain: vel * 0.35, type: 'sine' });
  tone(t, f * 3.01, 0.5, { gain: vel * 0.12, type: 'sine' });
  noise(t, 0.02, { type: 'bandpass', freq: f * 4, q: 2, gain: vel * 0.3 });
}
export function sfxVending() {
  if (!ctx) return; const t = now();
  tone(t, 60, 1.2, { type: 'sawtooth', gain: 0.06, attack: 0.1 });
  noise(t, 1.0, { type: 'bandpass', freq: 300, q: 2, gain: 0.08, attack: 0.1 });
  noise(t + 1.2, 0.2, { type: 'lowpass', freq: 250, gain: 0.6 });
  tone(t + 1.2, 140, 0.25, { gain: 0.3, type: 'triangle' });
  tone(t + 1.35, 95, 0.2, { gain: 0.2, type: 'triangle' });
}
export function sfxSplash() {
  if (!ctx) return; const t = now();
  noise(t, 0.6, { type: 'bandpass', freq: 1200, q: 0.6, gain: 0.3, freqEnd: 300 });
  for (let i = 0; i < 6; i++) tone(t + 0.1 + Math.random() * 0.4, 600 + Math.random() * 900, 0.06, { gain: 0.04, freqEnd: 1800 });
}
export function sfxWasher() {
  if (!ctx) return; const t = now();
  sfxClick();
  const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = 48;
  const lfo = ctx.createOscillator(); lfo.frequency.value = 1.6; const lg = ctx.createGain(); lg.gain.value = 0.08;
  const g = ctx.createGain(); g.gain.value = 0.0001; g.gain.linearRampToValueAtTime(0.12, t + 1); g.gain.linearRampToValueAtTime(0.0001, t + 6);
  lfo.connect(lg); lg.connect(g.gain); o.connect(g); g.connect(sfxBus);
  o.start(t); o.stop(t + 6.1); lfo.start(t); lfo.stop(t + 6.1);
  noise(t + 0.5, 5, { type: 'bandpass', freq: 500, q: 0.8, gain: 0.06, attack: 1 });
}
export function sfxCurtain() {
  if (!ctx) return; const t = now();
  noise(t, 0.6, { type: 'bandpass', freq: 2500, q: 0.5, gain: 0.07, attack: 0.1 });
  for (let i = 0; i < 5; i++) tone(t + i * 0.08, 2000 + i * 120, 0.03, { type: 'square', gain: 0.008 });
}
export function sfxGlitch() {
  if (!ctx) return; const t = now();
  for (let i = 0; i < 8; i++) tone(t + i * 0.035, 200 + Math.random() * 2000, 0.03, { type: 'square', gain: 0.03 });
}
export function sfxDrink() {
  if (!ctx) return; const t = now();
  for (let i = 0; i < 3; i++) { noise(t + i * 0.35, 0.18, { type: 'lowpass', freq: 500, gain: 0.25 }); tone(t + i * 0.35, 180, 0.1, { gain: 0.1 }); }
}
export function sfxTypewriter(n = 6) {
  if (!ctx) return; const t = now();
  for (let i = 0; i < n; i++) { noise(t + i * 0.11 + Math.random() * 0.04, 0.03, { type: 'bandpass', freq: 2200, q: 2, gain: 0.3 }); }
  tone(t + n * 0.12, 3000, 0.4, { gain: 0.04 });
}

// ---------- петли (ТВ-шум, вода, телефон, гул) ----------
export function loopStart(id, kind, quiet = false) {
  if (!ctx || loops[id]) return;
  const t = now(); const out = ctx.createGain(); out.gain.value = 0.0001; out.connect(sfxBus);
  const nodes = [];
  if (kind === 'static') {
    const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
    const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 1200;
    s.connect(f); f.connect(out); s.start(); nodes.push(s);
    const hum = ctx.createOscillator(); hum.frequency.value = 15734 / 2; const hg = ctx.createGain(); hg.gain.value = 0.003;
    hum.connect(hg); hg.connect(out); hum.start(); nodes.push(hum);
    out.gain.linearRampToValueAtTime(0.06, t + 0.1);
  } else if (kind === 'fountain') {
    const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 900; f.Q.value = 0.35;
    const f2 = ctx.createBiquadFilter(); f2.type = 'highpass'; f2.frequency.value = 2500;
    const s2 = ctx.createBufferSource(); s2.buffer = noiseBuf; s2.loop = true; s2.playbackRate.value = 0.7;
    const g2 = ctx.createGain(); g2.gain.value = 0.25;
    s.connect(f); f.connect(out); s2.connect(f2); f2.connect(g2); g2.connect(out); s.start(); s2.start(0.7); nodes.push(s, s2);
  } else if (kind === 'water') {
    const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1500; f.Q.value = 0.4;
    s.connect(f); f.connect(out); s.start(); nodes.push(s);
    out.gain.linearRampToValueAtTime(0.12, t + 0.3);
  } else if (kind === 'ring') {
    const o = ctx.createOscillator(); o.frequency.value = 440; const o2 = ctx.createOscillator(); o2.frequency.value = 480;
    const am = ctx.createGain(); am.gain.value = 0;
    o.connect(am); o2.connect(am); am.connect(out);
    for (let k = 0; k < 40; k++) { const s0 = t + k * 4; am.gain.setValueAtTime(0.5, s0); am.gain.setValueAtTime(0, s0 + 1.6); }
    o.start(); o2.start(); nodes.push(o, o2);
    out.gain.linearRampToValueAtTime(0.06, t + 0.05);
  } else if (kind === 'dialtone') {
    const o = ctx.createOscillator(); o.frequency.value = 425;
    o.connect(out); o.start(); nodes.push(o); out.gain.linearRampToValueAtTime(0.03, t + 0.05);
  } else if (kind === 'fridge') {
    const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 50;
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 160;
    o.connect(f); f.connect(out); o.start(); nodes.push(o); out.gain.linearRampToValueAtTime(0.05, t + 1);
  } else if (kind === 'radio') {
    const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1800; f.Q.value = 3;
    s.connect(f); f.connect(out); s.start(); nodes.push(s); out.gain.linearRampToValueAtTime(0.03, t + 0.1);
  }
  loops[id] = { out, nodes };
}
// позиционные петли (main.js) задают громкость сами: начинать с тишины, без собственной «атаки»
function quietStart(id) { const l = loops[id]; if (!l) return; const t = now(); l.out.gain.cancelScheduledValues(t); l.out.gain.setValueAtTime(0.0001, t); }
export function loopStartQuiet(id, kind) { if (loops[id]) return; loopStart(id, kind); quietStart(id); }
export function loopStop(id) {
  const l = loops[id]; if (!l) return;
  const t = now(); l.out.gain.cancelScheduledValues(t); l.out.gain.setTargetAtTime(0.0001, t, 0.05);
  l.nodes.forEach(n => { try { n.stop(t + 0.3); } catch (e) { } });
  delete loops[id];
}
export function loopActive(id) { return !!loops[id]; }

// ---------- эмбиент: ветер снаружи + гул ламп ----------
let windGain, buzzGain;
function startAmbience() {
  const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
  const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 400; f.Q.value = 0.5;
  const lfo = ctx.createOscillator(); lfo.frequency.value = 0.07; const lg = ctx.createGain(); lg.gain.value = 250;
  lfo.connect(lg); lg.connect(f.frequency);
  windGain = ctx.createGain(); windGain.gain.value = 0.03;
  s.connect(f); f.connect(windGain); windGain.connect(master); s.start(); lfo.start();
  const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 100;
  const bf = ctx.createBiquadFilter(); bf.type = 'bandpass'; bf.frequency.value = 200; bf.Q.value = 3;
  buzzGain = ctx.createGain(); buzzGain.gain.value = 0;
  o.connect(bf); bf.connect(buzzGain); buzzGain.connect(master); o.start();
}
// Гул люминесцентных ламп: 100 Гц с обертонами, слегка «дрожит»
let humGain = null;
function startHum() {
  const out = ctx.createGain(); out.gain.value = 0; out.connect(sfxBus); humGain = out;
  const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 220; f.Q.value = 1.2; f.connect(out);
  for (const [fr, g] of [[100, 0.6], [200, 0.35], [300, 0.12], [1200, 0.02]]) {
    const o = ctx.createOscillator(); o.type = fr > 1000 ? 'sine' : 'sawtooth'; o.frequency.value = fr; const og = ctx.createGain(); og.gain.value = g; o.connect(og); og.connect(fr > 1000 ? out : f); o.start();
  }
  const lfo = ctx.createOscillator(); lfo.frequency.value = 0.37; const lg = ctx.createGain(); lg.gain.value = 0.25; lfo.connect(lg);
  const trem = ctx.createGain(); trem.gain.value = 1; lg.connect(trem.gain); lfo.start();
}
export function setHum(v) { if (!ctx) return; if (!humGain) startHum(); humGain.gain.setTargetAtTime(v, ctx.currentTime, 0.25); }
export function loopGain(id, v) { const l = loops[id]; if (l) l.out.gain.setTargetAtTime(v, ctx.currentTime, 0.3); }
export function setAmbience(wind, buzz) {
  if (!ctx) return;
  windGain.gain.setTargetAtTime(wind, ctx.currentTime, 0.8);
  buzzGain.gain.setTargetAtTime(buzz, ctx.currentTime, 0.3);
}

// ---------- музыка: vaporwave ambient ----------
// Каждая «станция» — свой набор аккордов, темп и характер.
const STATIONS = [
  { name: 'FM 88.1 — ЛОББИ', bar: 8.5, cut: 1500, ep: 0.55,
    chords: [[53, 57, 60, 64, 67], [52, 55, 59, 62, 66], [50, 53, 57, 60, 64], [55, 58, 62, 65, 69]] },
  { name: 'FM 91.4 — ТОРГОВЫЙ ЦЕНТР 2002', bar: 6.5, cut: 2100, ep: 0.8,
    chords: [[49, 53, 56, 60, 63], [48, 51, 55, 58, 62], [46, 49, 53, 56, 60], [51, 55, 58, 61, 65]] },
  { name: 'FM 77.7 — БАССЕЙН НОЧЬЮ', bar: 11, cut: 1100, ep: 0.3,
    chords: [[45, 52, 55, 59, 64], [41, 48, 52, 55, 60], [43, 50, 53, 57, 62], [40, 47, 50, 55, 59]] },
];
export const stationNames = STATIONS.map(s => s.name);
// сон за шторой: медленный тёмный джаз — контрабас шагами, щётки, пэд и «терменвокс» с вибрато
const DREAM = { name: '···', bar: 7, cut: 1300, ep: 0.12,
  chords: [[41, 48, 51, 55, 56], [39, 46, 50, 53, 58], [37, 44, 48, 51, 55], [36, 43, 46, 52, 55]] };
let dream = false;
export function setDream(on) {
  dream = on; if (!ctx) return;
  activeVoices.forEach(o => { try { o.stop(ctx.currentTime + 0.3); } catch (e) { } });
  nextBar = ctx.currentTime + 0.4; chordIdx = 0;
}
function pluck(t, midi) {
  const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = mtof(midi);
  const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(900, t); f.frequency.exponentialRampToValueAtTime(200, t + 0.6);
  const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.22, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.4);
  o.connect(f); f.connect(g); g.connect(musicLP); o.start(t); o.stop(t + 1.5);
}
function brush(t, v) {
  const s = ctx.createBufferSource(); s.buffer = noiseBuf; const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 5200; f.Q.value = 0.7;
  const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + 0.06); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
  s.connect(f); f.connect(g); g.connect(musicLP); s.start(t, Math.random()); s.stop(t + 0.4);
}
function theremin(t, m1, m2, dur) {
  const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(mtof(m1), t); o.frequency.exponentialRampToValueAtTime(mtof(m2), t + dur * 0.6);
  const v = ctx.createOscillator(); v.frequency.value = 5.5; const vg = ctx.createGain(); vg.gain.value = 9; v.connect(vg); vg.connect(o.detune);
  const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.05, t + dur * 0.3); g.gain.linearRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(epOut); o.start(t); v.start(t); o.stop(t + dur + 0.1); v.stop(t + dur + 0.1);
  activeVoices.add(o); o.onended = () => activeVoices.delete(o);
}
let musicTimer = null, nextBar = 0, chordIdx = 0, wobble, padOut, epOut, delay;
const activeVoices = new Set();

function startMusic() {
  // «плёночное» плавание тона
  wobble = ctx.createOscillator(); wobble.frequency.value = 0.21;
  const wg = ctx.createGain(); wg.gain.value = 9; wobble.connect(wg); wobble._g = wg; wobble.start();
  padOut = ctx.createGain(); padOut.gain.value = 0.22; padOut.connect(musicLP);
  epOut = ctx.createGain(); epOut.gain.value = 0.16;
  delay = ctx.createDelay(2); delay.delayTime.value = 0.62;
  const fb = ctx.createGain(); fb.gain.value = 0.42; const dlp = ctx.createBiquadFilter(); dlp.type = 'lowpass'; dlp.frequency.value = 1800;
  epOut.connect(musicLP); epOut.connect(delay); delay.connect(dlp); dlp.connect(fb); fb.connect(delay); dlp.connect(musicLP);
  // виниловый треск
  const len = ctx.sampleRate * 3; const cb = ctx.createBuffer(1, len, ctx.sampleRate); const cd = cb.getChannelData(0);
  for (let i = 0; i < len; i++) cd[i] = Math.random() < 0.0007 ? (Math.random() * 2 - 1) * 0.8 : (Math.random() * 2 - 1) * 0.012;
  const cs = ctx.createBufferSource(); cs.buffer = cb; cs.loop = true;
  const cf = ctx.createBiquadFilter(); cf.type = 'bandpass'; cf.frequency.value = 2500; cf.Q.value = 0.5;
  const cg = ctx.createGain(); cg.gain.value = 0.35; cs.connect(cf); cf.connect(cg); cg.connect(musicBus); cs.start();
  nextBar = ctx.currentTime + 0.3;
  musicTimer = setInterval(scheduleMusic, 250);
}

const mtof = m => 440 * Math.pow(2, (m - 69) / 12);

function padVoice(t, midi, dur, st) {
  const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(0.05, t + dur * 0.35);
  g.gain.setValueAtTime(0.05, t + dur * 0.7);
  g.gain.linearRampToValueAtTime(0.0001, t + dur + 2.5);
  const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(st.cut * 0.5, t);
  f.frequency.linearRampToValueAtTime(st.cut, t + dur * 0.5); f.frequency.linearRampToValueAtTime(st.cut * 0.4, t + dur + 2);
  f.connect(g); g.connect(padOut);
  for (const det of [-8, 7]) {
    const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = mtof(midi); o.detune.value = det;
    wobble._g.connect(o.detune);
    o.connect(f); o.start(t); o.stop(t + dur + 2.6);
    activeVoices.add(o); o.onended = () => activeVoices.delete(o);
  }
}
function epNote(t, midi, vel) {
  const f0 = mtof(midi);
  const car = ctx.createOscillator(); car.frequency.value = f0;
  const mod = ctx.createOscillator(); mod.frequency.value = f0 * 14; const mg = ctx.createGain();
  mg.gain.setValueAtTime(f0 * 1.6, t); mg.gain.exponentialRampToValueAtTime(1, t + 0.6);
  mod.connect(mg); mg.connect(car.frequency); wobble._g.connect(car.detune);
  const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vel, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 3.2);
  car.connect(g); g.connect(epOut);
  car.start(t); mod.start(t); car.stop(t + 3.3); mod.stop(t + 3.3);
}
function bass(t, midi, dur) {
  const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = mtof(midi - 12);
  const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.16, t + 0.8);
  g.gain.setValueAtTime(0.16, t + dur - 0.5); g.gain.linearRampToValueAtTime(0.0001, t + dur + 0.6);
  o.connect(g); g.connect(musicLP); o.start(t); o.stop(t + dur + 0.7);
}
function scheduleMusic() {
  if (!ctx) return;
  const st = dream ? DREAM : STATIONS[audio.station];
  while (nextBar < ctx.currentTime + 1.5) {
    const t = nextBar, ch = st.chords[chordIdx % st.chords.length];
    if (dream) {
      const beat = st.bar / 4;
      for (let b = 0; b < 4; b++) { pluck(t + b * beat, ch[b % 3] - 12 + (b === 3 ? 2 : 0)); brush(t + b * beat, 0.05); brush(t + b * beat + beat * 0.66, 0.025); }
      if (Math.random() < 0.7) { const a = ch[3 + Math.floor(Math.random() * 2)] + 12, b2 = ch[1 + Math.floor(Math.random() * 3)] + 12; theremin(t + beat * 0.5, a, b2, st.bar * 0.9); }
    }
    ch.forEach(m => padVoice(t, m, st.bar, st));
    bass(t, ch[0], st.bar);
    // россыпь нот электропиано по звукам аккорда
    const n = 3 + Math.floor(Math.random() * 4);
    for (let i = 0; i < n; i++) {
      if (Math.random() > st.ep) continue;
      const m = ch[Math.floor(Math.random() * ch.length)] + 12 + (Math.random() < 0.3 ? 12 : 0);
      epNote(t + (i / n) * st.bar + Math.random() * 0.3, m, 0.05 + Math.random() * 0.05);
    }
    chordIdx++; nextBar += st.bar;
  }
}
export function nextStation() {
  if (!ctx) return '';
  audio.station = (audio.station + 1) % STATIONS.length;
  activeVoices.forEach(o => { try { o.stop(ctx.currentTime + 0.4); } catch (e) { } });
  nextBar = ctx.currentTime + 0.6; chordIdx = 0;
  loopStart('tune', 'radio'); setTimeout(() => loopStop('tune'), 500);
  return STATIONS[audio.station].name;
}
