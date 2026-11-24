// ЭЛИЗИУМ · звук
// Всё процедурно (WebAudio, без файлов). Три шины: музыка, эффекты (с эхом комнаты), окружение (ветер, гул).
// Позиционные петли (вода, телевизор, телефон) — через soundSpot() + updateSounds() каждые 0.2 с.
// Главное правило: петля начинается с тишины и не перезапускается на границе слышимости — иначе «шипит заново».
let ctx = null, master, musicBus, sfxBus, envBus, reverb, reverbSend, musicLP, noiseBuf, humGain;
export const audio = { get ready() { return !!ctx; }, get ctx() { return ctx; }, musicVolume: 0.55, sfxVolume: 0.9 };

function makeImpulse(dur, decay) {
  const len = ctx.sampleRate * dur, b = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay); }
  return b;
}
// вызывать из обработчика клика/клавиши (браузер не даёт звуку стартовать сам); в Electron — сразу
export function initAudio() {
  if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
  ctx = new AC();
  master = ctx.createGain(); master.gain.value = 0.9; master.connect(ctx.destination);
  reverb = ctx.createConvolver(); reverb.buffer = makeImpulse(4, 2.6);
  const revOut = ctx.createGain(); revOut.gain.value = 0.9; reverb.connect(revOut); revOut.connect(master);
  musicLP = ctx.createBiquadFilter(); musicLP.type = 'lowpass'; musicLP.frequency.value = 3200;
  musicBus = ctx.createGain(); musicBus.gain.value = audio.musicVolume; musicLP.connect(musicBus); musicBus.connect(master);
  const mr = ctx.createGain(); mr.gain.value = 0.5; musicLP.connect(mr); mr.connect(reverb);
  sfxBus = ctx.createGain(); sfxBus.gain.value = audio.sfxVolume; sfxBus.connect(master);
  envBus = ctx.createGain(); envBus.gain.value = audio.sfxVolume; envBus.connect(master);
  reverbSend = ctx.createGain(); reverbSend.gain.value = 0.25; sfxBus.connect(reverbSend); reverbSend.connect(reverb);
  const len = ctx.sampleRate * 2; noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  if (musicFn) startMusic();
}
export function setMusicVolume(v) { audio.musicVolume = v; if (ctx) musicBus.gain.setTargetAtTime(v, ctx.currentTime, 0.2); }
export function setSfxVolume(v) { audio.sfxVolume = v; if (ctx) { sfxBus.gain.setTargetAtTime(v, ctx.currentTime, 0.1); envBus.gain.setTargetAtTime(v, ctx.currentTime, 0.1); } }
export function setRoomReverb(v) { if (ctx) reverbSend.gain.setTargetAtTime(v, ctx.currentTime, 0.4); }
export function setMusicMuffle(cut) { if (ctx) musicLP.frequency.setTargetAtTime(cut, ctx.currentTime, 0.6); } // подвал, «под водой»

// ---------- примитивы ----------
export const now = () => ctx.currentTime;
function env(g, t, a, peak, dcy) { g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + dcy); }
export function noise(t, dur, { type = 'bandpass', freq = 1000, q = 1, gain = 0.3, attack = 0.005, out = sfxBus, freqEnd = null } = {}) {
  const src = ctx.createBufferSource(); src.buffer = noiseBuf; src.playbackRate.value = 0.8 + Math.random() * 0.4;
  const f = ctx.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
  if (freqEnd) f.frequency.exponentialRampToValueAtTime(freqEnd, t + dur);
  const g = ctx.createGain(); env(g, t, attack, gain, dur);
  src.connect(f); f.connect(g); g.connect(out); src.start(t, Math.random() * 1.5); src.stop(t + dur + attack + 0.05);
}
export function tone(t, freq, dur, { type = 'sine', gain = 0.2, attack = 0.005, out = sfxBus, freqEnd = null } = {}) {
  const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, t);
  if (freqEnd) o.frequency.exponentialRampToValueAtTime(freqEnd, t + dur);
  const g = ctx.createGain(); env(g, t, attack, gain, dur); o.connect(g); g.connect(out); o.start(t); o.stop(t + attack + dur + 0.05);
}

// ---------- эффекты ----------
// шаги: у каждой поверхности свой фильтр; чередование левой/правой ноги чуть меняет тон
const STEP = { carpet: [380, 0.5, 0.06], wood: [900, 1.6, 0.11], marble: [2400, 2.5, 0.07], tile: [2800, 3, 0.07], concrete: [1500, 1.2, 0.09], water: [700, 0.6, 0.12] };
let flip = 0;
export function sfxStep(surface = 'carpet', run = false) {
  if (!ctx) return; const t = now(); flip ^= 1;
  const [f, q, g] = STEP[surface] || STEP.concrete;
  noise(t, 0.06 + (run ? 0 : 0.02), { freq: f * (flip ? 1 : 0.88), q, gain: g * (run ? 1.3 : 1) });
  if (surface === 'wood') tone(t, 110 + flip * 12, 0.05, { gain: 0.05 });
  if (surface === 'water') noise(t + 0.03, 0.18, { type: 'highpass', freq: 2500, gain: 0.04 });
}
export function sfxDoorOpen(heavy = false) {
  if (!ctx) return; const t = now();
  noise(t, 0.05, { freq: 2200, gain: 0.12 }); tone(t + 0.04, heavy ? 140 : 220, 0.5, { type: 'sawtooth', gain: 0.012, freqEnd: heavy ? 110 : 330 });
}
export function sfxDoorClose() { if (!ctx) return; const t = now(); noise(t, 0.12, { type: 'lowpass', freq: 500, gain: 0.35 }); tone(t, 70, 0.15, { gain: 0.18 }); }
export function sfxLocked() { if (!ctx) return; const t = now(); for (let i = 0; i < 2; i++) noise(t + i * 0.09, 0.04, { freq: 1800, q: 4, gain: 0.15 }); }
export function sfxClick() { if (!ctx) return; const t = now(); noise(t, 0.015, { type: 'highpass', freq: 3500, gain: 0.25 }); tone(t, 2400, 0.02, { type: 'square', gain: 0.03 }); }
export function sfxSwitch(heavy = false) { if (!ctx) return; const t = now(); noise(t, heavy ? 0.08 : 0.03, { freq: heavy ? 600 : 2600, q: 2, gain: heavy ? 0.4 : 0.22 }); }
export function sfxPaper() { if (!ctx) return; const t = now(); noise(t, 0.25, { type: 'highpass', freq: 3000, gain: 0.06, attack: 0.04 }); }
export function sfxCurtain() { if (!ctx) return; const t = now(); noise(t, 0.6, { freq: 1200, q: 0.5, gain: 0.06, attack: 0.15 }); }
export function sfxPickup() { if (!ctx) return; const t = now(); tone(t, 660, 0.12, { gain: 0.05 }); tone(t + 0.08, 990, 0.18, { gain: 0.05 }); }
export function sfxSecret() { if (!ctx) return; const t = now(); [523, 659, 784, 1046].forEach((f, i) => tone(t + i * 0.09, f, 0.6, { type: 'triangle', gain: 0.05 })); }

// ---------- петли ----------
const loops = {};
const LOOP_KINDS = {
  // каждая: (out) => узлы; громкость задаёт вызывающий
  static(out) { const s = src(); const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 1200; s.connect(f); f.connect(out); return [s]; },
  water(out) { const s = src(); const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1800; f.Q.value = 0.6; s.connect(f); f.connect(out); return [s]; },
  hum(out) { const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 100; const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 200; f.Q.value = 2; o.connect(f); f.connect(out); o.start(); return [o]; },
  ring(out) { const o = ctx.createOscillator(); o.frequency.value = 880; const m = ctx.createOscillator(); m.frequency.value = 20; const mg = ctx.createGain(); mg.gain.value = 0.5; const am = ctx.createGain(); am.gain.value = 0.5; m.connect(mg); mg.connect(am.gain); o.connect(am); am.connect(out); o.start(); m.start(); return [o, m]; },
};
function src() { const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true; s.start(); return s; }
export function loopStart(id, kind) {
  if (!ctx || loops[id] || !LOOP_KINDS[kind]) return;
  const out = ctx.createGain(); out.gain.value = 0.0001; out.connect(kind === 'hum' ? envBus : sfxBus);
  loops[id] = { out, nodes: LOOP_KINDS[kind](out) };
}
export function loopGain(id, v) { const l = loops[id]; if (l) l.out.gain.setTargetAtTime(v, ctx.currentTime, 0.3); }
export function loopStop(id) {
  const l = loops[id]; if (!l) return; const t = now();
  l.out.gain.cancelScheduledValues(t); l.out.gain.setTargetAtTime(0.0001, t, 0.05);
  l.nodes.forEach(n => { try { n.stop(t + 0.3); } catch (e) { } }); delete loops[id];
}
export const loopActive = id => !!loops[id];
export function addLoopKind(name, fn) { LOOP_KINDS[name] = fn; } // свои петли: fn(out, ctx, noiseBuf) → [узлы]

// ---------- позиционные источники ----------
// soundSpot('water', pos, 0.12, 6) → { active } ; включать/выключать через snd.active
export function soundSpot(kind, pos, gain, range = 7, { level = 0, anyLevel = false } = {}) {
  const snd = { id: kind + Math.random(), kind, pos: pos.clone(), level, range, gain, active: false, anyLevel, zone: undefined, idle: 0 };
  return snd;
}
// вызывать ~5 раз в секунду. wallK(snd) — множитель за стены (1 — та же комната, 0.25 — соседняя, 0.06 — за закрытой дверью)
export function updateSounds(sounds, listener, level, wallK = () => 1, dt = 0.2) {
  if (!ctx) return;
  for (const s of sounds) {
    const d = s.active === false ? 999 : s.anyLevel ? s.pos.distanceTo(listener) + Math.abs(s.level - level) * 6 : s.level === level ? s.pos.distanceTo(listener) : 999;
    const v = Math.max(0, 1 - d / s.range) ** 1.5 * s.gain * wallK(s);
    if (v > 0.0015) { loopStart(s.id, s.kind); loopGain(s.id, v); s.idle = 0; }
    else if (loops[s.id]) { loopGain(s.id, 0.0001); s.idle += dt; if (s.active === false || s.idle > 6) { loopStop(s.id); s.idle = 0; } }
  }
}
// гул ближайшей люминесцентной лампы (одна общая петля, громкость по расстоянию)
export function setHum(v) { if (!ctx) return; if (!humGain) { loopStart('__hum', 'hum'); humGain = true; } loopGain('__hum', v); }

// ---------- музыка ----------
// setMusic(fn): fn(t, bar, ctx, out) планирует такт; вызывается заранее, на 1.5 с вперёд
let musicFn = null, musicTimer = null, nextBar = 0, barLen = 8, barIdx = 0;
export function setMusic(fn, bar = 8) { musicFn = fn; barLen = bar; if (ctx) { nextBar = ctx.currentTime + 0.3; barIdx = 0; if (!musicTimer) startMusic(); } }
function startMusic() {
  nextBar = ctx.currentTime + 0.3;
  musicTimer = setInterval(() => { if (!musicFn) return; while (nextBar < ctx.currentTime + 1.5) { musicFn(nextBar, barIdx++, ctx, musicLP); nextBar += barLen; } }, 250);
}
// готовый мягкий пэд: аккорды по кругу (midi-ноты)
export function padMusic(chords, { cut = 1500, vol = 0.05 } = {}) {
  const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
  return (t, i, ctx, out) => {
    const ch = chords[i % chords.length];
    for (const m of ch) for (const det of [-7, 7]) {
      const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = mtof(m); o.detune.value = det;
      const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = cut;
      const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol / ch.length, t + barLen * 0.4); g.gain.linearRampToValueAtTime(0.0001, t + barLen + 2);
      o.connect(f); f.connect(g); g.connect(out); o.start(t); o.stop(t + barLen + 2.2);
    }
  };
}
