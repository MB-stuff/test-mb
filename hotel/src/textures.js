// Процедурные текстуры на canvas: ковёр, обои, дерево, плитка, мрамор и т.д.
import * as THREE from 'three';

function canvas(w, h = w) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  return [c, c.getContext('2d')];
}
function toTex(c, { nearest = true, repeat = true } = {}) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  if (nearest) t.magFilter = THREE.NearestFilter;
  t.anisotropy = 4;
  return t;
}
function rnd(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
function speckle(g, w, h, n, alpha, r) {
  for (let i = 0; i < n; i++) {
    const v = r() < 0.5 ? 0 : 255;
    g.fillStyle = `rgba(${v},${v},${v},${alpha * r()})`;
    g.fillRect(Math.floor(r() * w), Math.floor(r() * h), 1, 1);
  }
}

const cache = {};
function cached(key, fn) { return cache[key] || (cache[key] = fn()); }

// Зелёный ковёр коридоров с ромбами и золотистой окантовкой
export const carpetGreen = () => cached('carpet', () => {
  const [c, g] = canvas(128); const r = rnd(7);
  g.fillStyle = '#163a20'; g.fillRect(0, 0, 128, 128);
  g.strokeStyle = '#0d2614'; g.lineWidth = 6;
  for (let i = -128; i < 256; i += 32) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + 128, 128); g.stroke(); g.beginPath(); g.moveTo(i + 128, 0); g.lineTo(i, 128); g.stroke(); }
  g.strokeStyle = '#4a5a24'; g.lineWidth = 1.5;
  for (let i = -128; i < 256; i += 32) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + 128, 128); g.stroke(); g.beginPath(); g.moveTo(i + 128, 0); g.lineTo(i, 128); g.stroke(); }
  g.fillStyle = '#6b6a2a';
  for (let y = 0; y < 128; y += 32) for (let x = 0; x < 128; x += 32) { g.beginPath(); g.arc(x + 16, y, 2.5, 0, 7); g.fill(); g.beginPath(); g.arc(x, y + 16, 2.5, 0, 7); g.fill(); }
  g.fillStyle = '#21502c';
  for (let y = 0; y < 128; y += 32) for (let x = 0; x < 128; x += 32) { g.fillRect(x + 13, y + 13, 6, 6); }
  speckle(g, 128, 128, 2500, 0.18, r);
  return toTex(c);
});
// Коврик в номерах — бордовый с узором
export const carpetRed = () => cached('carpetRed', () => {
  const [c, g] = canvas(64); const r = rnd(9);
  g.fillStyle = '#3a1218'; g.fillRect(0, 0, 64, 64);
  g.strokeStyle = '#5a2228'; g.lineWidth = 2; g.strokeRect(8, 8, 48, 48);
  g.fillStyle = '#6a4a22'; g.fillRect(30, 30, 4, 4);
  speckle(g, 64, 64, 900, 0.2, r);
  return toTex(c);
});
export const carpetPlain = (hex, seed = 3) => cached('cp' + hex, () => {
  const [c, g] = canvas(64); const r = rnd(seed);
  g.fillStyle = hex; g.fillRect(0, 0, 64, 64);
  speckle(g, 64, 64, 1400, 0.16, r);
  return toTex(c);
});

// Обои: base — фон, line — цвет узора, kind — stripes | damask | dots | diamonds
export const wallpaper = (base, line, kind = 'stripes', seed = 1) => cached(`wp${base}${line}${kind}`, () => {
  const [c, g] = canvas(64); const r = rnd(seed);
  g.fillStyle = base; g.fillRect(0, 0, 64, 64);
  g.fillStyle = line; g.strokeStyle = line;
  if (kind === 'stripes') { for (let x = 0; x < 64; x += 16) { g.fillRect(x, 0, 3, 64); g.globalAlpha = 0.5; g.fillRect(x + 7, 0, 1, 64); g.globalAlpha = 1; } }
  if (kind === 'damask') {
    for (let y = 0; y < 64; y += 32) for (let x = 0; x < 64; x += 32) {
      const ox = x + (y % 64 ? 16 : 0);
      g.beginPath(); g.moveTo(ox + 16, y + 4); g.quadraticCurveTo(ox + 28, y + 16, ox + 16, y + 28); g.quadraticCurveTo(ox + 4, y + 16, ox + 16, y + 4); g.fill();
      g.globalAlpha = 0.6; g.fillRect(ox + 15, y, 2, 32); g.globalAlpha = 1;
    }
  }
  if (kind === 'dots') { for (let y = 4; y < 64; y += 16) for (let x = 4; x < 64; x += 16) { g.beginPath(); g.arc(x + (y % 32 ? 8 : 0), y, 2, 0, 7); g.fill(); } }
  if (kind === 'diamonds') {
    for (let y = 0; y < 64; y += 16) for (let x = 0; x < 64; x += 16) { g.beginPath(); g.moveTo(x + 8, y + 2); g.lineTo(x + 14, y + 8); g.lineTo(x + 8, y + 14); g.lineTo(x + 2, y + 8); g.closePath(); g.lineWidth = 1; g.stroke(); }
  }
  speckle(g, 64, 64, 600, 0.1, r);
  return toTex(c);
});

export const wood = (base = '#3a2216', seed = 4) => cached('wood' + base, () => {
  const [c, g] = canvas(64); const r = rnd(seed);
  g.fillStyle = base; g.fillRect(0, 0, 64, 64);
  for (let y = 0; y < 64; y++) {
    if (r() < 0.35) { g.fillStyle = `rgba(0,0,0,${0.1 + r() * 0.2})`; g.fillRect(0, y, 64, 1); }
    if (r() < 0.12) { g.fillStyle = `rgba(255,220,180,${0.04 + r() * 0.05})`; g.fillRect(0, y, 64, 1); }
  }
  g.fillStyle = 'rgba(0,0,0,0.35)'; for (let x = 0; x < 64; x += 16) g.fillRect(x, 0, 1, 64);
  return toTex(c);
});
export const parquet = () => cached('parquet', () => {
  const [c, g] = canvas(64); const r = rnd(11);
  for (let y = 0; y < 64; y += 8) for (let x = 0; x < 64; x += 32) {
    const o = (y / 8) % 2 ? 16 : 0; const v = 40 + r() * 18;
    g.fillStyle = `rgb(${v + 18},${v * 0.65},${v * 0.4})`; g.fillRect((x + o) % 64, y, 32, 8);
    if ((x + o) % 64 > 32) { g.fillRect((x + o) % 64 - 64, y, 32, 8); }
    g.fillStyle = 'rgba(0,0,0,0.4)'; g.fillRect((x + o) % 64, y, 1, 8); g.fillRect(0, y, 64, 1);
  }
  speckle(g, 64, 64, 400, 0.12, r);
  return toTex(c);
});

export const tiles = (a = '#2b3a3a', b = '#253232', grout = '#121a1a', n = 4) => cached(`tl${a}${b}${n}`, () => {
  const [c, g] = canvas(64); const r = rnd(5); const s = 64 / n;
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { g.fillStyle = (x + y) % 2 ? a : b; g.fillRect(x * s, y * s, s, s); }
  g.fillStyle = grout; for (let i = 0; i <= n; i++) { g.fillRect(i * s - 1, 0, 2, 64); g.fillRect(0, i * s - 1, 64, 2); }
  speckle(g, 64, 64, 300, 0.12, r);
  return toTex(c);
});
export const marble = (a = '#151112', b = '#3a1620') => cached('marble' + a + b, () => {
  const [c, g] = canvas(128); const r = rnd(13);
  for (let y = 0; y < 2; y++) for (let x = 0; x < 2; x++) {
    g.fillStyle = (x + y) % 2 ? a : b; g.fillRect(x * 64, y * 64, 64, 64);
    g.strokeStyle = 'rgba(255,240,230,0.08)'; g.lineWidth = 1;
    for (let k = 0; k < 4; k++) { g.beginPath(); let px = x * 64 + r() * 64, py = y * 64; g.moveTo(px, py); for (let j = 0; j < 6; j++) { px += (r() - 0.5) * 22; py += 11; g.lineTo(px, py); } g.stroke(); }
  }
  g.fillStyle = 'rgba(0,0,0,0.6)'; g.fillRect(63, 0, 2, 128); g.fillRect(0, 63, 128, 2);
  return toTex(c);
});
export const concrete = (base = '#3a3634', seed = 8) => cached('conc' + base, () => {
  const [c, g] = canvas(64); const r = rnd(seed);
  g.fillStyle = base; g.fillRect(0, 0, 64, 64);
  speckle(g, 64, 64, 2200, 0.15, r);
  g.fillStyle = 'rgba(0,0,0,0.12)'; for (let i = 0; i < 6; i++) { g.beginPath(); g.arc(r() * 64, r() * 64, 3 + r() * 10, 0, 7); g.fill(); }
  return toTex(c);
});
export const ceilingTiles = () => cached('ceil', () => {
  const [c, g] = canvas(64); const r = rnd(21);
  g.fillStyle = '#2b2824'; g.fillRect(0, 0, 64, 64);
  speckle(g, 64, 64, 1500, 0.2, r);
  g.fillStyle = '#151311'; g.fillRect(0, 0, 64, 2); g.fillRect(0, 0, 2, 64);
  g.fillStyle = 'rgba(90,70,30,0.25)'; g.beginPath(); g.arc(40, 30, 9, 0, 7); g.fill(); // пятно протечки
  return toTex(c);
});
export const glassBlock = () => cached('gblock', () => {
  const [c, g] = canvas(64);
  for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
    const gr = g.createRadialGradient(x * 16 + 8, y * 16 + 8, 1, x * 16 + 8, y * 16 + 8, 10);
    gr.addColorStop(0, '#ffe7a0'); gr.addColorStop(1, '#c08a40'); g.fillStyle = gr; g.fillRect(x * 16, y * 16, 16, 16);
  }
  g.fillStyle = '#4a3a2a'; for (let i = 0; i <= 4; i++) { g.fillRect(i * 16 - 1, 0, 2, 64); g.fillRect(0, i * 16 - 1, 64, 2); }
  return toTex(c);
});

// Мягкое световое пятно (для фальш-освещения от окон и ламп)
export const glowTex = () => cached('glow', () => {
  const [c, g] = canvas(64);
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.4, 'rgba(255,255,255,0.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  const t = toTex(c, { nearest: false, repeat: false }); t.colorSpace = THREE.NoColorSpace; return t;
});
// Пятно света из окна: яркое у окна, гаснет вглубь комнаты
export const windowPatchTex = () => cached('wpatch', () => {
  const [c, g] = canvas(32, 64);
  const gr = g.createLinearGradient(0, 0, 0, 64);
  gr.addColorStop(0, 'rgba(255,255,255,0.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 32, 64);
  const gx = g.createLinearGradient(0, 0, 32, 0);
  gx.addColorStop(0, 'rgba(0,0,0,1)'); gx.addColorStop(0.15, 'rgba(0,0,0,0)'); gx.addColorStop(0.85, 'rgba(0,0,0,0)'); gx.addColorStop(1, 'rgba(0,0,0,1)');
  g.globalCompositeOperation = 'destination-out'; g.fillStyle = gx; g.fillRect(0, 0, 32, 64);
  const t = toTex(c, { nearest: false, repeat: false }); t.colorSpace = THREE.NoColorSpace; return t;
});

// Табличка с текстом
export function signTex(text, { bg = '#14100c', fg = '#d8c08a', w = 256, h = 96, font = 'bold 54px Georgia, serif', border = true } = {}) {
  return cached(`sign${text}${bg}${fg}${w}${h}${font}`, () => {
    const [c, g] = canvas(w, h);
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    if (border) { g.strokeStyle = fg; g.globalAlpha = 0.6; g.lineWidth = 4; g.strokeRect(6, 6, w - 12, h - 12); g.globalAlpha = 1; }
    g.fillStyle = fg; g.font = font; g.textAlign = 'center'; g.textBaseline = 'middle';
    const lines = String(text).split('\n');
    lines.forEach((ln, i) => g.fillText(ln, w / 2, h / 2 + (i - (lines.length - 1) / 2) * (h / lines.length) * 0.9));
    return toTex(c, { nearest: false, repeat: false });
  });
}
export function clockTex() {
  return cached('clock', () => {
    const [c, g] = canvas(128);
    g.fillStyle = '#d9cfb0'; g.beginPath(); g.arc(64, 64, 62, 0, 7); g.fill();
    g.strokeStyle = '#1a1410'; g.lineWidth = 5; g.stroke();
    g.fillStyle = '#1a1410';
    for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; g.fillRect(64 + Math.sin(a) * 50 - 2, 64 - Math.cos(a) * 50 - 2, 4, 4); }
    g.lineCap = 'round';
    const hand = (a, l, w) => { g.lineWidth = w; g.beginPath(); g.moveTo(64, 64); g.lineTo(64 + Math.sin(a) * l, 64 - Math.cos(a) * l); g.stroke(); };
    hand((3 + 33 / 60) / 12 * Math.PI * 2, 30, 6); hand(33 / 60 * Math.PI * 2, 46, 4);
    g.strokeStyle = '#8a1a1a'; hand(33 / 60 * Math.PI * 2 + 0.05, 50, 1.5);
    return toTex(c, { nearest: false, repeat: false });
  });
}

// Анимированный шум для телевизоров
let staticCanvas, staticCtx, staticTexture, staticImg;
export function staticTex() {
  if (staticTexture) return staticTexture;
  [staticCanvas, staticCtx] = canvas(64, 48);
  staticImg = staticCtx.createImageData(64, 48);
  staticTexture = toTex(staticCanvas, { repeat: false });
  updateStatic(0);
  return staticTexture;
}
export function updateStatic(t) {
  if (!staticTexture) return;
  const d = staticImg.data; const bar = (t * 20) % 48;
  for (let y = 0; y < 48; y++) {
    const roll = Math.abs(y - bar) < 3 ? 60 : 0;
    for (let x = 0; x < 64; x++) {
      const v = Math.random() * 200 + roll, i = (y * 64 + x) * 4;
      d[i] = v * 0.85; d[i + 1] = v * 0.9; d[i + 2] = v; d[i + 3] = 255;
    }
  }
  staticCtx.putImageData(staticImg, 0, 0); staticTexture.needsUpdate = true;
}
// Экран ЭЛТ с текстом (для комнаты наблюдения и кабинета)
export function screenTex(lines, { bg = '#061a10', fg = '#7dffb0' } = {}) {
  return cached('scr' + lines.join('|') + bg, () => {
    const [c, g] = canvas(128, 96);
    g.fillStyle = bg; g.fillRect(0, 0, 128, 96);
    g.fillStyle = fg; g.font = '10px monospace';
    lines.forEach((l, i) => g.fillText(l, 6, 14 + i * 12));
    g.fillStyle = 'rgba(0,0,0,0.35)'; for (let y = 0; y < 96; y += 2) g.fillRect(0, y, 128, 1);
    return toTex(c, { repeat: false });
  });
}
// Вода бассейна (сдвигаем offset в цикле)
export const waterTex = () => cached('water', () => {
  const [c, g] = canvas(64); const r = rnd(31);
  g.fillStyle = '#1a6a7a'; g.fillRect(0, 0, 64, 64);
  g.strokeStyle = 'rgba(180,255,250,0.35)'; g.lineWidth = 1.5;
  for (let i = 0; i < 14; i++) { g.beginPath(); const x = r() * 64, y = r() * 64; g.ellipse(x, y, 6 + r() * 8, 2 + r() * 3, r() * 3, 0, 5); g.stroke(); }
  return toTex(c, { nearest: false });
});
