// Процедурные бесшовные текстуры на canvas. Все узоры рисуются с «заворотом»
// через края, поэтому плитка повторяется без швов; UV задаются в метрах мира.
import * as THREE from 'three';

function canvas(w, h = w) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  return [c, c.getContext('2d')];
}
function toTex(c, { repeat = true, srgb = true } = {}) {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  return t;
}
function rnd(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
// рисует fn девять раз со сдвигом на размер тайла — элементы на краях переходят на другую сторону
function wrap(S, fn) { for (const dx of [-S, 0, S]) for (const dy of [-S, 0, S]) fn(dx, dy); }
function grain(g, S, n, alpha, r) {
  for (let i = 0; i < n; i++) {
    const v = r() < 0.5 ? 0 : 255;
    g.fillStyle = `rgba(${v},${v},${v},${alpha * r()})`;
    g.fillRect(Math.floor(r() * S), Math.floor(r() * S), 1 + (r() < 0.2 ? 1 : 0), 1);
  }
}
// мягкие пятна (неравномерность покраски/износ), бесшовно
function blotch(g, S, n, alpha, r, dark = true) {
  for (let i = 0; i < n; i++) {
    const x = r() * S, y = r() * S, rad = S * (0.08 + r() * 0.25);
    wrap(S, (dx, dy) => {
      const gr = g.createRadialGradient(x + dx, y + dy, 0, x + dx, y + dy, rad);
      const c = dark ? '0,0,0' : '255,230,200';
      gr.addColorStop(0, `rgba(${c},${alpha})`); gr.addColorStop(1, `rgba(${c},0)`);
      g.fillStyle = gr; g.fillRect(x + dx - rad, y + dy - rad, rad * 2, rad * 2);
    });
  }
}

const cache = {};
function cached(key, fn) { return cache[key] || (cache[key] = fn()); }

// ---------- ковры ----------
// Зелёный ковёр коридоров: ромбическая решётка с медальонами. Тайл = 1 повтор узора.
export const carpetGreen = () => cached('carpet', () => {
  const S = 256, [c, g] = canvas(S); const r = rnd(7);
  g.fillStyle = '#1d4a2a'; g.fillRect(0, 0, S, S);
  const h = S / 2;
  // ромбы
  const diamond = (cx, cy, rr) => { g.beginPath(); g.moveTo(cx, cy - rr); g.lineTo(cx + rr, cy); g.lineTo(cx, cy + rr); g.lineTo(cx - rr, cy); g.closePath(); };
  for (const [cx, cy] of [[0, 0], [S, 0], [0, S], [S, S], [h, h]]) {
    g.fillStyle = '#163c22'; diamond(cx, cy, h); g.fill();
    g.strokeStyle = '#7a6a2e'; g.lineWidth = 3; diamond(cx, cy, h - 10); g.stroke();
    g.fillStyle = '#25583a'; diamond(cx, cy, h * 0.42); g.fill();
    g.strokeStyle = '#a08a3a'; g.lineWidth = 2; diamond(cx, cy, h * 0.3); g.stroke();
    g.fillStyle = '#b8963e'; g.beginPath(); g.arc(cx, cy, 7, 0, 7); g.fill();
  }
  for (const [cx, cy] of [[h, 0], [0, h], [S, h], [h, S]]) { g.fillStyle = '#8a7a34'; g.beginPath(); g.arc(cx, cy, 5, 0, 7); g.fill(); }
  grain(g, S, 9000, 0.12, r); blotch(g, S, 6, 0.08, r);
  return toTex(c);
});
// Бордовый ковёр с орнаментом (номера, ресторан)
export const carpetOrnament = (base = '#4a161c', line = '#8a5a2a', key = 'a') => cached('orn' + base + line + key, () => {
  const S = 256, [c, g] = canvas(S); const r = rnd(9);
  g.fillStyle = base; g.fillRect(0, 0, S, S);
  g.strokeStyle = line; g.lineWidth = 3;
  for (const [cx, cy] of [[0, 0], [S, 0], [0, S], [S, S], [S / 2, S / 2]]) {
    for (let k = 0; k < 8; k++) {
      const a = k * Math.PI / 4;
      g.beginPath(); g.ellipse(cx + Math.cos(a) * 34, cy + Math.sin(a) * 34, 22, 9, a, 0, 7); g.stroke();
    }
    g.beginPath(); g.arc(cx, cy, 14, 0, 7); g.stroke();
  }
  g.globalAlpha = 0.6; g.lineWidth = 2;
  for (const [cx, cy] of [[S / 2, 0], [0, S / 2], [S, S / 2], [S / 2, S]]) { g.beginPath(); g.arc(cx, cy, 22, 0, 7); g.stroke(); }
  g.globalAlpha = 1;
  grain(g, S, 8000, 0.14, r); blotch(g, S, 5, 0.1, r);
  return toTex(c);
});
export const carpetPlain = (hex, seed = 3) => cached('cp' + hex, () => {
  const S = 128, [c, g] = canvas(S); const r = rnd(seed);
  g.fillStyle = hex; g.fillRect(0, 0, S, S);
  grain(g, S, 5000, 0.14, r); blotch(g, S, 4, 0.1, r);
  return toTex(c);
});
// Казино: красный с золотыми звёздами
export const carpetCasino = () => cached('casino', () => {
  const S = 256, [c, g] = canvas(S); const r = rnd(41);
  g.fillStyle = '#5a0e18'; g.fillRect(0, 0, S, S);
  const star = (cx, cy, R, col) => { g.fillStyle = col; g.beginPath(); for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5 - Math.PI / 2, rr = i % 2 ? R * 0.42 : R; g.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); } g.closePath(); g.fill(); };
  for (const [cx, cy] of [[0, 0], [S, 0], [0, S], [S, S], [S / 2, S / 2]]) { star(cx, cy, 30, '#c89a3a'); star(cx, cy, 14, '#5a0e18'); }
  for (const [cx, cy] of [[S / 2, 0], [0, S / 2], [S, S / 2], [S / 2, S]]) { g.strokeStyle = '#2a6a5a'; g.lineWidth = 4; g.beginPath(); g.arc(cx, cy, 26, 0, 7); g.stroke(); star(cx, cy, 9, '#d0b060'); }
  grain(g, S, 8000, 0.14, r);
  return toTex(c);
});

// ---------- обои ----------
// kind: stripes | damask | dots | diamonds | trellis
export const wallpaper = (base, line, kind = 'stripes', seed = 1) => cached(`wp${base}${line}${kind}`, () => {
  const S = 128, [c, g] = canvas(S); const r = rnd(seed);
  g.fillStyle = base; g.fillRect(0, 0, S, S);
  g.fillStyle = line; g.strokeStyle = line;
  if (kind === 'stripes') {
    for (let x = 0; x < S; x += 32) { g.fillRect(x, 0, 6, S); g.globalAlpha = 0.45; g.fillRect(x + 14, 0, 2, S); g.fillRect(x + 20, 0, 2, S); g.globalAlpha = 1; }
  }
  if (kind === 'damask') {
    const motif = (cx, cy) => {
      g.beginPath(); g.moveTo(cx, cy - 28); g.bezierCurveTo(cx + 22, cy - 14, cx + 18, cy + 12, cx, cy + 28); g.bezierCurveTo(cx - 18, cy + 12, cx - 22, cy - 14, cx, cy - 28); g.fill();
      g.save(); g.fillStyle = base; g.beginPath(); g.ellipse(cx, cy, 6, 14, 0, 0, 7); g.fill(); g.restore();
      g.beginPath(); g.arc(cx - 16, cy - 20, 3, 0, 7); g.arc(cx + 16, cy - 20, 3, 0, 7); g.fill();
    };
    wrap(S, (dx, dy) => { motif(32 + dx, 32 + dy); motif(96 + dx, 96 + dy); });
  }
  if (kind === 'dots') { wrap(S, (dx, dy) => { for (let y = 0; y < S; y += 32) for (let x = 0; x < S; x += 32) { g.beginPath(); g.arc(x + 16 * ((y / 32) % 2) + dx, y + dy, 3.5, 0, 7); g.fill(); } }); }
  if (kind === 'diamonds' || kind === 'trellis') {
    g.lineWidth = kind === 'trellis' ? 3 : 1.6;
    for (let k = -S; k <= S; k += 32) { g.beginPath(); g.moveTo(k, 0); g.lineTo(k + S, S); g.stroke(); g.beginPath(); g.moveTo(k + S, 0); g.lineTo(k, S); g.stroke(); }
    if (kind === 'trellis') for (let y = 0; y <= S; y += 32) for (let x = 0; x <= S; x += 32) { g.beginPath(); g.arc(x, y, 4, 0, 7); g.fill(); }
  }
  grain(g, S, 3000, 0.07, r); blotch(g, S, 5, 0.09, r);
  return toTex(c);
});

export const wood = (base = '#3a2216', seed = 4) => cached('wood' + base, () => {
  const S = 128, [c, g] = canvas(S); const r = rnd(seed);
  g.fillStyle = base; g.fillRect(0, 0, S, S);
  // волокна идут по горизонтали и замкнуты по краям
  for (let y = 0; y < S; y++) {
    const ph = r() * 6.28, amp = 0.05 + r() * 0.15;
    for (let x = 0; x < S; x += 2) {
      const v = Math.sin(x / S * Math.PI * 2 * 2 + ph) * amp + (r() - 0.5) * 0.05;
      g.fillStyle = v > 0 ? `rgba(255,220,180,${v * 0.25})` : `rgba(0,0,0,${-v * 0.6})`;
      g.fillRect(x, y, 2, 1);
    }
  }
  g.fillStyle = 'rgba(0,0,0,0.3)'; for (let y = 0; y < S; y += 32) g.fillRect(0, y, S, 1);
  return toTex(c);
});
// Ёлочка (паркет), тайл бесшовный
export const parquet = (tone = 0) => cached('parquet' + tone, () => {
  const S = 128, [c, g] = canvas(S); const r = rnd(11 + tone);
  g.fillStyle = '#2a170c'; g.fillRect(0, 0, S, S);
  const L = 64, Wd = 16;
  wrap(S, (dx, dy) => {
    for (let i = -2; i < 6; i++) for (let j = -2; j < 6; j++) {
      const x = i * 32 + dx, y = j * 32 + dy;
      for (const dir of [0, 1]) {
        const v = 52 + r() * 22 + tone * 8;
        g.save(); g.translate(x + dir * 16, y + dir * 16); g.rotate(dir ? -Math.PI / 4 : Math.PI / 4);
        g.fillStyle = `rgb(${v + 22},${v * 0.62},${v * 0.36})`; g.fillRect(0, 0, L * 0.5, Wd * 0.7);
        g.strokeStyle = 'rgba(0,0,0,0.45)'; g.lineWidth = 1; g.strokeRect(0, 0, L * 0.5, Wd * 0.7);
        g.restore();
      }
    }
  });
  grain(g, S, 2500, 0.08, r);
  return toTex(c);
});

export const tiles = (a = '#2b3a3a', b = '#253232', grout = '#121a1a', n = 4) => cached(`tl${a}${b}${grout}${n}`, () => {
  const S = 128, [c, g] = canvas(S); const r = rnd(5); const s = S / n;
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    g.fillStyle = (x + y) % 2 ? a : b; g.fillRect(x * s, y * s, s, s);
    const gr = g.createLinearGradient(x * s, y * s, x * s + s, y * s + s); gr.addColorStop(0, 'rgba(255,255,255,0.07)'); gr.addColorStop(1, 'rgba(0,0,0,0.08)');
    g.fillStyle = gr; g.fillRect(x * s, y * s, s, s);
  }
  g.fillStyle = grout; for (let i = 0; i < n; i++) { g.fillRect(i * s, 0, 2, S); g.fillRect(0, i * s, S, 2); }
  grain(g, S, 1200, 0.08, r);
  return toTex(c);
});
// Мрамор в шахматку — одна текстура = 2×2 плиты
export const marble = (a = '#1a1214', b = '#4a1a24') => cached('marble' + a + b, () => {
  const S = 256, [c, g] = canvas(S); const r = rnd(13);
  for (let y = 0; y < 2; y++) for (let x = 0; x < 2; x++) {
    g.save(); g.beginPath(); g.rect(x * 128, y * 128, 128, 128); g.clip();
    g.fillStyle = (x + y) % 2 ? a : b; g.fillRect(x * 128, y * 128, 128, 128);
    for (let k = 0; k < 7; k++) {
      g.strokeStyle = `rgba(255,235,215,${0.04 + r() * 0.08})`; g.lineWidth = 0.6 + r() * 1.4;
      g.beginPath(); let px = x * 128 + r() * 128, py = y * 128 - 5; g.moveTo(px, py);
      for (let j = 0; j < 8; j++) { px += (r() - 0.5) * 34; py += 18; g.lineTo(px, py); } g.stroke();
    }
    g.restore();
  }
  g.fillStyle = 'rgba(0,0,0,0.55)'; for (const p of [0, 127]) { g.fillRect(p, 0, 2, S); g.fillRect(0, p, S, 2); }
  g.fillRect(255, 0, 1, S); g.fillRect(0, 255, S, 1);
  return toTex(c);
});
export const concrete = (base = '#3a3634', seed = 8) => cached('conc' + base, () => {
  const S = 128, [c, g] = canvas(S); const r = rnd(seed);
  g.fillStyle = base; g.fillRect(0, 0, S, S);
  blotch(g, S, 10, 0.12, r); blotch(g, S, 6, 0.05, r, false);
  grain(g, S, 6000, 0.13, r);
  return toTex(c);
});
// Штукатурка фасада с тонкими рустами
export const stucco = (base = '#9a6a52', seed = 15) => cached('stucco' + base, () => {
  const S = 128, [c, g] = canvas(S); const r = rnd(seed);
  g.fillStyle = base; g.fillRect(0, 0, S, S);
  blotch(g, S, 12, 0.1, r); blotch(g, S, 8, 0.06, r, false);
  grain(g, S, 7000, 0.12, r);
  g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(0, 0, S, 2);
  return toTex(c);
});
export const ceilingTiles = () => cached('ceil', () => {
  const S = 128, [c, g] = canvas(S); const r = rnd(21);
  g.fillStyle = '#3a3028'; g.fillRect(0, 0, S, S);
  grain(g, S, 5000, 0.16, r);
  g.fillStyle = '#1e1813'; g.fillRect(0, 0, S, 3); g.fillRect(0, 0, 3, S);
  blotch(g, S, 2, 0.12, r);
  return toTex(c);
});
// Кессонный потолок вестибюля
export const coffer = () => cached('coffer', () => {
  const S = 128, [c, g] = canvas(S);
  g.fillStyle = '#2a1a12'; g.fillRect(0, 0, S, S);
  g.fillStyle = '#1a0f0a'; g.fillRect(14, 14, 100, 100);
  g.strokeStyle = '#5a3a1e'; g.lineWidth = 3; g.strokeRect(20, 20, 88, 88);
  g.fillStyle = '#6a4a22'; g.beginPath(); g.arc(64, 64, 6, 0, 7); g.fill();
  return toTex(c);
});
export const glassBlock = () => cached('gblock', () => {
  const S = 128, [c, g] = canvas(S);
  for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
    const gr = g.createRadialGradient(x * 32 + 16, y * 32 + 16, 1, x * 32 + 16, y * 32 + 16, 22);
    gr.addColorStop(0, '#ffe7a0'); gr.addColorStop(1, '#c08a40'); g.fillStyle = gr; g.fillRect(x * 32, y * 32, 32, 32);
  }
  g.fillStyle = '#4a3a2a'; for (let i = 0; i < 4; i++) { g.fillRect(i * 32, 0, 3, S); g.fillRect(0, i * 32, S, 3); }
  return toTex(c);
});
export const gravel = () => cached('gravel', () => {
  const S = 128, [c, g] = canvas(S); const r = rnd(77);
  g.fillStyle = '#4a3630'; g.fillRect(0, 0, S, S);
  for (let i = 0; i < 900; i++) { const v = 40 + r() * 60; g.fillStyle = `rgb(${v + 20},${v * 0.75},${v * 0.65})`; g.fillRect(r() * S, r() * S, 2, 2); }
  return toTex(c);
});
export const asphalt = () => cached('asph', () => {
  const S = 128, [c, g] = canvas(S); const r = rnd(78);
  g.fillStyle = '#2a2224'; g.fillRect(0, 0, S, S); grain(g, S, 6000, 0.18, r); blotch(g, S, 6, 0.15, r);
  return toTex(c);
});
export const felt = (hex = '#1a5a3a') => cached('felt' + hex, () => {
  const S = 64, [c, g] = canvas(S); const r = rnd(5);
  g.fillStyle = hex; g.fillRect(0, 0, S, S); grain(g, S, 2000, 0.12, r);
  return toTex(c);
});

// Мягкое световое пятно
export const glowTex = () => cached('glow', () => {
  const [c, g] = canvas(64);
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.4, 'rgba(255,255,255,0.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  return toTex(c, { repeat: false, srgb: false });
});
export const windowPatchTex = () => cached('wpatch', () => {
  const [c, g] = canvas(32, 64);
  const gr = g.createLinearGradient(0, 0, 0, 64);
  gr.addColorStop(0, 'rgba(255,255,255,0.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 32, 64);
  const gx = g.createLinearGradient(0, 0, 32, 0);
  gx.addColorStop(0, 'rgba(0,0,0,1)'); gx.addColorStop(0.15, 'rgba(0,0,0,0)'); gx.addColorStop(0.85, 'rgba(0,0,0,0)'); gx.addColorStop(1, 'rgba(0,0,0,1)');
  g.globalCompositeOperation = 'destination-out'; g.fillStyle = gx; g.fillRect(0, 0, 32, 64);
  return toTex(c, { repeat: false, srgb: false });
});

// Табличка: холст в пропорциях таблички, шрифт подбирается, чтобы текст влез
export function signTex(text, { aspect = 3, bg = '#14100c', fg = '#d8c08a', family = 'Georgia, serif', weight = 'bold', border = true, glowText = false, sub = false } = {}) {
  return cached(`sign${text}${aspect.toFixed(2)}${bg}${fg}${family}${border}${sub}`, () => {
    const H = 128, Wd = Math.min(1024, Math.max(64, Math.round(H * aspect)));
    const [c, g] = canvas(Wd, H);
    g.fillStyle = bg; g.fillRect(0, 0, Wd, H);
    if (border) { g.strokeStyle = fg; g.globalAlpha = 0.55; g.lineWidth = 4; g.strokeRect(7, 7, Wd - 14, H - 14); g.globalAlpha = 1; }
    const lines = String(text).split('\n');
    const pad = border ? 22 : 10;
    let size = (H - pad * 2) / lines.length * 0.8;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    const fit = () => { g.font = `${weight} ${size}px ${family}`; return Math.max(...lines.map(l => g.measureText(l).width)); };
    while (fit() > Wd - pad * 2 && size > 8) size *= 0.92;
    if (glowText) { g.shadowColor = fg; g.shadowBlur = 14; }
    g.fillStyle = fg;
    if (sub && lines.length > 1) {
      // крупная главная строка и мелкие переводы под ней
      let s1 = (H - pad * 2) * 0.5, s2 = (H - pad * 2) * 0.24;
      g.font = `${weight} ${s1}px ${family}`; while (g.measureText(lines[0]).width > Wd - pad * 2 && s1 > 8) { s1 *= 0.92; g.font = `${weight} ${s1}px ${family}`; }
      g.font = `${s2}px ${family}`; while (Math.max(...lines.slice(1).map(l => g.measureText(l).width)) > Wd - pad * 2 && s2 > 6) { s2 *= 0.92; g.font = `${s2}px ${family}`; }
      const total = s1 * 1.05 + (lines.length - 1) * s2 * 1.2, y0 = H / 2 - total / 2;
      g.font = `${weight} ${s1}px ${family}`; g.fillText(lines[0], Wd / 2, y0 + s1 * 0.52);
      g.globalAlpha = 0.8; g.font = `${s2}px ${family}`;
      lines.slice(1).forEach((ln, i) => g.fillText(ln, Wd / 2, y0 + s1 * 1.05 + s2 * (0.6 + i * 1.2)));
      g.globalAlpha = 1;
      return toTex(c, { repeat: false });
    }
    const lh = size * 1.12;
    lines.forEach((ln, i) => g.fillText(ln, Wd / 2, H / 2 + (i - (lines.length - 1) / 2) * lh));
    return toTex(c, { repeat: false });
  });
}
export function clockTex() {
  return cached('clock', () => {
    const [c, g] = canvas(256);
    g.fillStyle = '#e0d4b0'; g.beginPath(); g.arc(128, 128, 124, 0, 7); g.fill();
    g.strokeStyle = '#2a1a10'; g.lineWidth = 8; g.stroke();
    g.fillStyle = '#1a1410'; g.font = 'bold 26px Georgia'; g.textAlign = 'center'; g.textBaseline = 'middle';
    for (let i = 1; i <= 12; i++) { const a = i / 12 * Math.PI * 2; g.fillText(['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'][i - 1], 128 + Math.sin(a) * 96, 128 - Math.cos(a) * 96); }
    g.lineCap = 'round';
    const hand = (a, l, w) => { g.lineWidth = w; g.beginPath(); g.moveTo(128, 128); g.lineTo(128 + Math.sin(a) * l, 128 - Math.cos(a) * l); g.stroke(); };
    hand((3 + 33 / 60) / 12 * Math.PI * 2, 56, 10); hand(33 / 60 * Math.PI * 2, 84, 6);
    g.strokeStyle = '#8a1a1a'; hand(33 / 60 * Math.PI * 2 + 0.05, 92, 2);
    return toTex(c, { repeat: false });
  });
}

// Анимированный шум для телевизоров
let staticCanvas, staticCtx, staticTexture, staticImg;
export function staticTex() {
  if (staticTexture) return staticTexture;
  [staticCanvas, staticCtx] = canvas(96, 72);
  staticImg = staticCtx.createImageData(96, 72);
  staticTexture = toTex(staticCanvas, { repeat: false });
  updateStatic(0);
  return staticTexture;
}
export function updateStatic(t) {
  if (!staticTexture) return;
  const d = staticImg.data; const bar = (t * 30) % 72;
  for (let y = 0; y < 72; y++) {
    const roll = Math.abs(y - bar) < 4 ? 60 : 0;
    for (let x = 0; x < 96; x++) {
      const v = Math.random() * 190 + roll, i = (y * 96 + x) * 4;
      d[i] = v * 0.9; d[i + 1] = v * 0.88; d[i + 2] = v; d[i + 3] = 255;
    }
  }
  staticCtx.putImageData(staticImg, 0, 0); staticTexture.needsUpdate = true;
}
export function screenTex(lines, { bg = '#06180e', fg = '#8dffbe' } = {}) {
  return cached('scr' + lines.join('|') + bg, () => {
    const [c, g] = canvas(256, 192);
    g.fillStyle = bg; g.fillRect(0, 0, 256, 192);
    g.fillStyle = fg; g.font = 'bold 18px monospace'; g.shadowColor = fg; g.shadowBlur = 6;
    lines.forEach((l, i) => g.fillText(l, 12, 30 + i * 24));
    g.shadowBlur = 0; g.fillStyle = 'rgba(0,0,0,0.3)'; for (let y = 0; y < 192; y += 3) g.fillRect(0, y, 256, 1);
    return toTex(c, { repeat: false });
  });
}
// вода: мягкая каустика — светлые прожилки по краям ячеек Вороного, без «колец»
export const waterTex = () => cached('water', () => {
  const S = 128, [c, g] = canvas(S); const r = rnd(31);
  const pts = []; for (let i = 0; i < 22; i++) pts.push([r() * S, r() * S]);
  const img = g.createImageData(S, S);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    let d1 = 1e9, d2 = 1e9;
    for (const [px, py] of pts) {
      let dx = Math.abs(x - px), dy = Math.abs(y - py); dx = Math.min(dx, S - dx); dy = Math.min(dy, S - dy);
      const d = dx * dx + dy * dy; if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) d2 = d;
    }
    const e = Math.sqrt(d2) - Math.sqrt(d1); // 0 на границе ячеек
    const k = Math.exp(-e * 0.55) * 0.85 + Math.exp(-e * 0.15) * 0.15;
    const i = (y * S + x) * 4;
    img.data[i] = 22 + k * 150; img.data[i + 1] = 92 + k * 150; img.data[i + 2] = 108 + k * 130; img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  return toTex(c);
});
// Барабан слот-машины: символы по вертикали
export const reelTex = () => cached('reel', () => {
  const [c, g] = canvas(64, 384);
  const syms = ['☀', '7', '∞', '♥', '★', '☾'];
  syms.forEach((s, i) => {
    g.fillStyle = i % 2 ? '#f0e4c8' : '#e8dcc0'; g.fillRect(0, i * 64, 64, 64);
    g.fillStyle = ['#e0601a', '#b01020', '#6a3ac0', '#c01050', '#c09010', '#2a4a8a'][i];
    g.font = 'bold 44px Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(s, 32, i * 64 + 34);
  });
  const t = toTex(c); t.wrapS = THREE.ClampToEdgeWrapping; return t;
});
export const REEL_SYMBOLS = ['☀', '7', '∞', '♥', '★', '☾'];
// Колесо рулетки
export const rouletteTex = () => cached('roulette', () => {
  const S = 256, [c, g] = canvas(S); const n = 37;
  for (let i = 0; i < n; i++) {
    const a0 = i / n * Math.PI * 2, a1 = (i + 1) / n * Math.PI * 2;
    g.fillStyle = i === 0 ? '#1a6a3a' : (i % 2 ? '#a01818' : '#141010');
    g.beginPath(); g.moveTo(128, 128); g.arc(128, 128, 126, a0, a1); g.closePath(); g.fill();
  }
  g.fillStyle = '#3a2210'; g.beginPath(); g.arc(128, 128, 80, 0, 7); g.fill();
  g.fillStyle = '#c8a050'; g.beginPath(); g.arc(128, 128, 20, 0, 7); g.fill();
  g.strokeStyle = '#c8a050'; g.lineWidth = 3; for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2; g.beginPath(); g.moveTo(128, 128); g.lineTo(128 + Math.cos(a) * 70, 128 + Math.sin(a) * 70); g.stroke(); }
  return toTex(c, { repeat: false });
});
// Игральная карта
export function cardTex(label, red) {
  return cached('card' + label, () => {
    const [c, g] = canvas(64, 96);
    g.fillStyle = '#f2ead6'; g.fillRect(0, 0, 64, 96);
    g.fillStyle = red ? '#b01020' : '#141010'; g.font = 'bold 30px Georgia'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(label, 32, 50);
    return toTex(c, { repeat: false });
  });
}
export const cardBackTex = () => cached('cardback', () => {
  const [c, g] = canvas(64, 96);
  g.fillStyle = '#7a1020'; g.fillRect(0, 0, 64, 96); g.strokeStyle = '#d8b060'; g.lineWidth = 3; g.strokeRect(5, 5, 54, 86);
  g.fillStyle = '#d8b060'; g.font = 'bold 28px Georgia'; g.textAlign = 'center'; g.fillText('∞', 32, 58);
  return toTex(c, { repeat: false });
});
// Огонь камина (меняем offset)
export const fireTex = () => cached('fire', () => {
  const [c, g] = canvas(64, 128); const r = rnd(3);
  for (let i = 0; i < 40; i++) {
    const x = r() * 64, y = 40 + r() * 88, rad = 6 + r() * 14;
    const gr = g.createRadialGradient(x, y, 0, x, y, rad); gr.addColorStop(0, 'rgba(255,220,120,0.9)'); gr.addColorStop(0.5, 'rgba(255,120,30,0.6)'); gr.addColorStop(1, 'rgba(120,20,0,0)');
    g.fillStyle = gr; g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
  return toTex(c);
});

// зигзаг из чёрных и белых полос — пол из снов
export function chevronTex(a = '#141010', b = '#d8d0c0') {
  const S = 128, [c, g] = canvas(S);
  g.fillStyle = a; g.fillRect(0, 0, S, S); g.fillStyle = b;
  for (let k = -2; k < 4; k++) {
    g.beginPath(); const y0 = k * 32;
    g.moveTo(0, y0); g.lineTo(64, y0 + 32); g.lineTo(128, y0); g.lineTo(128, y0 + 16); g.lineTo(64, y0 + 48); g.lineTo(0, y0 + 16); g.closePath(); g.fill();
  }
  return toTex(c);
}
// влажные жёлтые обои «нулевого уровня»
export function backroomsTex() {
  const S = 128, [c, g] = canvas(S), r = rnd(77);
  g.fillStyle = '#b8a250'; g.fillRect(0, 0, S, S);
  g.strokeStyle = 'rgba(120,96,30,0.35)'; g.lineWidth = 2;
  for (let x = 0; x < S; x += 16) { g.beginPath(); g.moveTo(x + 4, 0); g.lineTo(x + 4, S); g.stroke(); }
  g.fillStyle = 'rgba(140,110,40,0.4)';
  for (let y = 8; y < S; y += 32) for (let x = 12; x < S; x += 16) { g.beginPath(); g.moveTo(x, y); g.lineTo(x + 3, y + 5); g.lineTo(x, y + 10); g.lineTo(x - 3, y + 5); g.closePath(); g.fill(); }
  for (let i = 0; i < 6; i++) { g.fillStyle = `rgba(90,70,20,${0.05 + r() * 0.08})`; g.beginPath(); g.ellipse(r() * S, r() * S, 10 + r() * 20, 6 + r() * 14, 0, 0, 7); g.fill(); }
  return toTex(c);
}
// рельеф закатного солнца с прорезями
export function sunTex() {
  const S = 256, [c, g] = canvas(S);
  const gr = g.createLinearGradient(0, 0, 0, S); gr.addColorStop(0, '#ffd070'); gr.addColorStop(0.55, '#ff7a3a'); gr.addColorStop(1, '#a02a50');
  g.fillStyle = gr; g.beginPath(); g.arc(S / 2, S / 2, S / 2 - 2, 0, 7); g.fill();
  g.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 7; i++) { const y = S * 0.52 + i * i * 2.6 + i * 9, h = 2 + i * 1.6; g.fillRect(0, y, S, h); }
  return toTex(c, { repeat: false });
}

// ---------- самодельные орнаменты для рам: ар-деко, вейпорвейв, эйдосы, пустыня ----------
const ORN = [
  ['Восход ар-деко', 'Солнце поднимается из-за стойки регистрации. Оно поднимается так с открытия отеля и всё никак не поднимется.'],
  ['Закат над сеткой', 'Солнце над решёткой, у которой нет горизонта. Подпись на обороте: «вид из номера, которого нет».'],
  ['Эйдос №12', 'Додекаэдр, вписанный в круг. По Платону, из этого сделано небо. Здесь из этого сделан потолок.'],
  ['Малиновая пустыня', 'Тот же пейзаж, что за окнами. Художник рисовал с натуры — и натура ему позировала.'],
  ['Зигзаг', 'Чёрно-белые полосы, как на полу во сне. Если смотреть долго, рисунок начинает идти навстречу.'],
  ['Розетта', 'Двенадцать вложенных многоугольников. В центре — точка, вокруг которой всё вращается и которую никто не видел.'],
  ['Коридор', 'Коридор, нарисованный по линейке до самого конца. Конца нет, а линейка кончилась.'],
  ['Веер', 'Орнамент с обоев вестибюля, увеличенный в сто раз. Узор оказался буквами, но язык никто не узнал.'],
];
function classicOrnament(n, k) {
  const land = n % 2 === 1, Wd = land ? 480 : 384, Hd = land ? 360 : 480;
  const [c, g] = canvas(Wd, Hd); const r = rnd(101 + n * 17);
  const gold = '#d8a850', crimson = '#3a0a14', W2 = Wd / 2, H2 = Hd / 2;
  const lin = (a, b, cs) => { const gr = g.createLinearGradient(0, a, 0, b); cs.forEach((cc, i) => gr.addColorStop(i / (cs.length - 1), cc)); return gr; };
  switch (k) {
    case 0: { // ар-деко: лучи веером снизу, ступенчатые дуги
      g.fillStyle = '#140a0c'; g.fillRect(0, 0, Wd, Hd);
      for (let i = 0; i <= 24; i++) { const a = P0 + i / 24 * Math.PI; g.strokeStyle = i % 2 ? gold : '#8a5a2a'; g.lineWidth = i % 2 ? 3 : 1.5; g.beginPath(); g.moveTo(W2, Hd * 0.86); g.lineTo(W2 - Math.cos(a) * Wd, Hd * 0.86 - Math.sin(a) * Wd); g.stroke(); }
      for (let i = 5; i > 0; i--) { g.fillStyle = i % 2 ? '#2a1008' : '#d8a850'; g.beginPath(); g.arc(W2, Hd * 0.86, i * Wd * 0.07, Math.PI, 0); g.fill(); }
      g.fillStyle = '#140a0c'; g.fillRect(0, Hd * 0.86, Wd, Hd);
      for (let i = 0; i < 4; i++) { g.strokeStyle = gold; g.lineWidth = 2; g.strokeRect(12 + i * 8, 12 + i * 8, Wd - 24 - i * 16, Hd - 24 - i * 16); }
      break;
    }
    case 1: { // вейпорвейв: полосатое солнце над розовой сеткой
      g.fillStyle = lin(0, Hd * 0.62, ['#2a0a3a', '#a02a6a', '#ffb070']); g.fillRect(0, 0, Wd, Hd);
      const sy = Hd * 0.42, sr = Hd * 0.22; g.fillStyle = lin(sy - sr, sy + sr, ['#ffe070', '#ff7a3a', '#e0306a']); g.beginPath(); g.arc(W2, sy, sr, 0, 7); g.fill();
      g.fillStyle = '#a02a6a'; for (let i = 0; i < 6; i++) g.fillRect(0, sy + i * i * 2.2 + i * 6, Wd, 2 + i);
      const hz = Hd * 0.62; g.fillStyle = '#140820'; g.fillRect(0, hz, Wd, Hd - hz);
      g.strokeStyle = '#ff5ab0'; g.lineWidth = 1.5;
      for (let i = -12; i <= 12; i++) { g.beginPath(); g.moveTo(W2 + i * 8, hz); g.lineTo(W2 + i * 90, Hd); g.stroke(); }
      for (let i = 1; i < 12; i++) { const y = hz + (Hd - hz) * Math.pow(i / 11, 2.2); g.beginPath(); g.moveTo(0, y); g.lineTo(Wd, y); g.stroke(); }
      break;
    }
    case 2: { // эйдос: каркас додекаэдра в круге
      g.fillStyle = '#0c0a18'; g.fillRect(0, 0, Wd, Hd);
      for (let i = 0; i < 60; i++) { g.fillStyle = `rgba(255,220,160,${0.2 + r() * 0.5})`; g.fillRect(r() * Wd, r() * Hd, 1.5, 1.5); }
      const R = Math.min(Wd, Hd) * 0.36; g.strokeStyle = gold; g.lineWidth = 2; g.beginPath(); g.arc(W2, H2, R * 1.12, 0, 7); g.stroke();
      const ph = (1 + Math.sqrt(5)) / 2, V = [];
      for (const a of [-1, 1]) for (const b of [-1, 1]) for (const cc of [-1, 1]) V.push([a, b, cc]);
      for (const a of [-1, 1]) for (const b of [-1, 1]) { V.push([0, a / ph, b * ph]); V.push([a / ph, b * ph, 0]); V.push([a * ph, 0, b / ph]); }
      const rx = 0.5, ry = 0.7, pr = v => { let [x, y, z] = v; [y, z] = [y * Math.cos(rx) - z * Math.sin(rx), y * Math.sin(rx) + z * Math.cos(rx)]; [x, z] = [x * Math.cos(ry) + z * Math.sin(ry), -x * Math.sin(ry) + z * Math.cos(ry)]; return [W2 + x * R / 1.8, H2 + y * R / 1.8, z]; };
      const Pp = V.map(pr); g.lineWidth = 1.6;
      for (let i = 0; i < V.length; i++) for (let j = i + 1; j < V.length; j++) { const d = Math.hypot(V[i][0] - V[j][0], V[i][1] - V[j][1], V[i][2] - V[j][2]); if (Math.abs(d - 2 / ph) < 0.01) { g.strokeStyle = (Pp[i][2] + Pp[j][2]) > 0 ? '#ffd890' : 'rgba(216,168,80,0.35)'; g.beginPath(); g.moveTo(Pp[i][0], Pp[i][1]); g.lineTo(Pp[j][0], Pp[j][1]); g.stroke(); } }
      break;
    }
    case 3: { // пустыня: малиновые дюны, жёлтое небо, маленькое солнце, дверь
      g.fillStyle = lin(0, Hd * 0.6, ['#ffe9a0', '#ffc860', '#ff9a50']); g.fillRect(0, 0, Wd, Hd);
      g.fillStyle = '#ff6a20'; g.beginPath(); g.arc(Wd * 0.72, Hd * 0.3, Hd * 0.04, 0, 7); g.fill();
      const cols = ['#9a2a30', '#7a1a24', '#5a1018', '#3a0810'];
      cols.forEach((cc, i) => { g.fillStyle = cc; g.beginPath(); const base = Hd * (0.55 + i * 0.12); g.moveTo(0, Hd); g.lineTo(0, base);
        for (let x = 0; x <= Wd; x += 8) g.lineTo(x, base - Math.sin(x * 0.012 + i * 2 + n) * 14 - Math.sin(x * 0.031 + i) * 6); g.lineTo(Wd, Hd); g.fill(); });
      g.fillStyle = '#1a0608'; g.fillRect(Wd * 0.3, Hd * 0.58, Wd * 0.07, Hd * 0.16); g.fillStyle = '#ffd890'; g.fillRect(Wd * 0.31, Hd * 0.595, Wd * 0.05, Hd * 0.145);
      break;
    }
    case 4: { // зигзаг
      g.fillStyle = '#141010'; g.fillRect(0, 0, Wd, Hd); g.fillStyle = '#d8d0c0';
      for (let y = -40; y < Hd + 40; y += 40) { g.beginPath(); g.moveTo(0, y); for (let x = 0; x <= Wd; x += 40) g.lineTo(x, y + ((x / 40) % 2 ? 20 : 0)); for (let x = Wd; x >= 0; x -= 40) g.lineTo(x, y + 14 + ((x / 40) % 2 ? 20 : 0)); g.fill(); }
      g.fillStyle = '#6a0a14'; g.fillRect(W2 - 50, H2 - 70, 100, 140); g.strokeStyle = gold; g.lineWidth = 3; g.strokeRect(W2 - 50, H2 - 70, 100, 140);
      g.fillStyle = '#ffd070'; g.beginPath(); g.arc(W2, H2, 14, 0, 7); g.fill();
      break;
    }
    case 5: { // розетта
      g.fillStyle = crimson; g.fillRect(0, 0, Wd, Hd);
      for (let i = 12; i > 0; i--) { const n2 = 3 + (i % 6), R = i * Math.min(Wd, Hd) * 0.035; g.strokeStyle = i % 2 ? gold : '#ff8a6a'; g.lineWidth = 1.6; g.beginPath();
        for (let j = 0; j <= n2; j++) { const a = j / n2 * Math.PI * 2 + i * 0.3; const x = W2 + Math.cos(a) * R, y = H2 + Math.sin(a) * R; j ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); }
      g.fillStyle = '#ffd070'; g.beginPath(); g.arc(W2, H2, 3, 0, 7); g.fill();
      break;
    }
    case 6: { // бесконечный коридор
      g.fillStyle = '#2a1a0c'; g.fillRect(0, 0, Wd, Hd);
      const vx = W2, vy = Hd * 0.46;
      for (let i = 0; i < 14; i++) { const t = Math.pow(0.78, i), w = Wd * 0.48 * t, h = Hd * 0.5 * t; g.strokeStyle = `rgba(255,210,140,${0.25 + 0.6 * t})`; g.lineWidth = 1 + 2 * t; g.strokeRect(vx - w, vy - h, w * 2, h * 2);
        if (i % 2 === 0) { g.fillStyle = `rgba(30,12,6,${0.9})`; g.fillRect(vx - w + w * 0.08, vy - h * 0.2, w * 0.14, h * 1.15); g.fillRect(vx + w - w * 0.22, vy - h * 0.2, w * 0.14, h * 1.15); } }
      g.strokeStyle = 'rgba(255,210,140,0.5)'; g.lineWidth = 1; for (const [x, y] of [[0, 0], [Wd, 0], [0, Hd], [Wd, Hd]]) { g.beginPath(); g.moveTo(x, y); g.lineTo(vx, vy); g.stroke(); }
      g.fillStyle = '#fff0c0'; g.fillRect(vx - 2, vy - 3, 4, 6);
      break;
    }
    default: { // веер из обоев
      g.fillStyle = '#4a1a18'; g.fillRect(0, 0, Wd, Hd);
      for (let y = 0; y < Hd + 60; y += 60) for (let x = (y / 60) % 2 ? 30 : 0; x < Wd + 60; x += 60) {
        for (let i = 6; i > 0; i--) { g.fillStyle = i % 2 ? '#7a3024' : '#c08a4a'; g.beginPath(); g.moveTo(x, y); g.arc(x, y, i * 5, Math.PI, 0); g.fill(); }
      }
    }
  }
  return c;
}
const P0 = 0;

// ---------- штриховые сюжеты в духе кассетных обложек: два цвета, арки, сетка, барханы, без надписей ----------
function archPath(g, x, y, w, h) { g.beginPath(); g.moveTo(x, y + h); g.lineTo(x, y + w / 2); g.arc(x + w / 2, y + w / 2, w / 2, Math.PI, 0); g.lineTo(x + w, y + h); g.closePath(); }
function hatch(g, ang, step, W, H) { const c = Math.cos(ang), s = Math.sin(ang), L = W + H; g.beginPath(); for (let d = -L; d < L; d += step) { g.moveTo(W / 2 + c * -L - s * d, H / 2 + s * -L + c * d); g.lineTo(W / 2 + c * L - s * d, H / 2 + s * L + c * d); } g.stroke(); }
function gridLines(g, x0, y0, x1, y1, st, checker = null) {
  if (checker) { g.fillStyle = checker; for (let y = y0, j = 0; y < y1; y += st, j++) for (let x = x0, i = 0; x < x1; x += st, i++) if ((i + j) % 2) g.fillRect(x, y, st, st); }
  g.beginPath(); for (let x = x0; x <= x1 + 0.1; x += st) { g.moveTo(x, y0); g.lineTo(x, y1); } for (let y = y0; y <= y1 + 0.1; y += st) { g.moveTo(x0, y); g.lineTo(x1, y); } g.stroke();
}
function dunes(g, x0, y0, x1, y1, r, step = 7) {
  for (let y = y0; y < y1; y += step * (0.6 + (y - y0) / (y1 - y0))) { g.beginPath(); const ph = r() * 6, a = 2 + r() * 4 + (y - y0) * 0.03;
    for (let x = x0; x <= x1; x += 4) { const yy = y + Math.sin(x * 0.02 + ph) * a + Math.sin(x * 0.057 + ph * 2) * a * 0.5; x === x0 ? g.moveTo(x, yy) : g.lineTo(x, yy); } g.stroke(); }
}
function stars(g, W, H, n, r, col, maxY = H) { g.fillStyle = col; for (let i = 0; i < n; i++) { const s = r() < 0.1 ? 2.5 : 1.2; g.fillRect(r() * W, r() * maxY, s, s); } }
function temple(g, cx, by, w, h) { // фасад храма: ступени, колонны с каннелюрами, фронтон
  const cw = w / 13; g.strokeRect(cx - w / 2, by - h * 0.06, w, h * 0.06); g.strokeRect(cx - w / 2 + cw * 0.3, by - h * 0.11, w - cw * 0.6, h * 0.05);
  for (let i = 0; i < 6; i++) { const x = cx - w / 2 + cw * (1 + i * 2.2); g.strokeRect(x, by - h * 0.78, cw * 1.2, h * 0.67); for (let k = 1; k < 4; k++) { g.beginPath(); g.moveTo(x + cw * 0.3 * k, by - h * 0.76); g.lineTo(x + cw * 0.3 * k, by - h * 0.13); g.stroke(); } g.strokeRect(x - cw * 0.15, by - h * 0.82, cw * 1.5, h * 0.04); }
  g.strokeRect(cx - w / 2, by - h * 0.9, w, h * 0.08); g.beginPath(); g.moveTo(cx - w / 2 - 4, by - h * 0.9); g.lineTo(cx, by - h * 1.12); g.lineTo(cx + w / 2 + 4, by - h * 0.9); g.closePath(); g.stroke();
  g.beginPath(); g.moveTo(cx - w * 0.36, by - h * 0.92); g.lineTo(cx, by - h * 1.07); g.lineTo(cx + w * 0.36, by - h * 0.92); g.closePath(); g.stroke();
}
function amphora(g, cx, ty, h) {
  const w = h * 0.36; g.beginPath(); g.moveTo(cx - w * 0.3, ty); g.lineTo(cx - w * 0.25, ty + h * 0.14);
  g.bezierCurveTo(cx - w * 1.1, ty + h * 0.3, cx - w * 0.9, ty + h * 0.75, cx - w * 0.2, ty + h * 0.92); g.lineTo(cx - w * 0.3, ty + h); g.lineTo(cx + w * 0.3, ty + h); g.lineTo(cx + w * 0.2, ty + h * 0.92);
  g.bezierCurveTo(cx + w * 0.9, ty + h * 0.75, cx + w * 1.1, ty + h * 0.3, cx + w * 0.25, ty + h * 0.14); g.lineTo(cx + w * 0.3, ty); g.closePath(); g.stroke();
  for (const s of [-1, 1]) { g.beginPath(); g.moveTo(cx + s * w * 0.27, ty + h * 0.05); g.bezierCurveTo(cx + s * w * 0.9, ty + h * 0.02, cx + s * w * 0.8, ty + h * 0.2, cx + s * w * 0.55, ty + h * 0.26); g.stroke(); }
}
function meander(g, x0, y, x1, s) { g.beginPath(); g.moveTo(x0, y + s); for (let x = x0; x < x1 - s * 2; x += s * 2) { g.lineTo(x, y); g.lineTo(x + s * 1.5, y); g.lineTo(x + s * 1.5, y + s * 0.7); g.lineTo(x + s * 0.6, y + s * 0.7); g.lineTo(x + s * 0.6, y + s * 0.35); g.moveTo(x + s * 1.5, y + s); g.lineTo(x + s * 2, y + s); } g.stroke(); }
function profileHead(g, cx, cy, s) { // классический профиль бюста
  g.beginPath(); const P = [[0, -1], [0.32, -0.92], [0.5, -0.7], [0.52, -0.42], [0.56, -0.3], [0.72, -0.08], [0.6, -0.02], [0.62, 0.1], [0.56, 0.16], [0.6, 0.26], [0.5, 0.36], [0.44, 0.52], [0.2, 0.6], [0.16, 0.9], [0.5, 1.15], [-0.6, 1.15], [-0.4, 0.8], [-0.5, 0.4], [-0.62, 0], [-0.58, -0.5], [-0.34, -0.9]];
  P.forEach(([x, y], i) => i ? g.lineTo(cx + x * s, cy + y * s) : g.moveTo(cx + x * s, cy + y * s)); g.closePath(); g.stroke();
  for (let i = 0; i < 9; i++) { g.beginPath(); g.arc(cx + (-0.45 + (i % 3) * 0.28) * s, cy + (-0.78 + Math.floor(i / 3) * 0.26) * s, s * 0.12, 0, 6.3); g.stroke(); }
  g.beginPath(); g.arc(cx + 0.18 * s, cy - 0.32 * s, s * 0.05, 0, 6.3); g.stroke();
  g.beginPath(); g.moveTo(cx - 0.2 * s, cy - 0.05 * s); g.quadraticCurveTo(cx - 0.05 * s, cy + 0.2 * s, cx - 0.2 * s, cy + 0.3 * s); g.stroke();
}
function wirePyramid(g, cx, by, w, h, skew = 0.25) {
  const A = [cx - w / 2, by], B = [cx + w / 2 * (1 - skew), by + w * 0.12], C = [cx + w / 2, by - w * 0.08], T = [cx + w * 0.04, by - h];
  g.beginPath(); g.moveTo(...A); g.lineTo(...B); g.lineTo(...C); g.moveTo(...A); g.lineTo(...T); g.lineTo(...B); g.moveTo(...T); g.lineTo(...C); g.stroke();
  for (let i = 1; i < 22; i++) { const t = i / 22; g.beginPath(); g.moveTo(A[0] + (T[0] - A[0]) * t, A[1] + (T[1] - A[1]) * t); g.lineTo(B[0] + (T[0] - B[0]) * t, B[1] + (T[1] - B[1]) * t); g.stroke(); }
  return T;
}
const SUBJ = [
  ['Пирамида в ночных барханах', 'Пирамида стоит там, где днём ничего нет. Из вершины в небо уходит луч — проверка связи с миром идей.', 1, (g, W, H, r) => {
    g.fillStyle = '#0c0806'; g.fillRect(0, 0, W, H); g.strokeStyle = '#ff9a2a'; g.lineWidth = 1.2; stars(g, W, H, 90, r, '#ff9a2a', H * 0.55);
    g.strokeRect(14, 14, W - 28, H - 28); g.save(); g.beginPath(); g.rect(14, 14, W - 28, H - 28); g.clip();
    dunes(g, 14, H * 0.55, W - 14, H - 14, r, 6); g.fillStyle = '#0c0806'; const T = [W * 0.42, H * 0.28];
    g.beginPath(); g.moveTo(W * 0.15, H * 0.72); g.lineTo(T[0], T[1]); g.lineTo(W * 0.7, H * 0.78); g.lineTo(W * 0.78, H * 0.64); g.closePath(); g.fill(); g.lineWidth = 1;
    wirePyramid(g, W * 0.43, H * 0.72, W * 0.56, H * 0.44);
    g.lineWidth = 2; g.beginPath(); g.moveTo(T[0] + 8, T[1] - 2); g.lineTo(T[0] + 8, 14); g.stroke(); for (let i = 0; i < 18; i++) { const a = r() * 6.3, l = 6 + r() * 22; g.beginPath(); g.moveTo(T[0] + 8, T[1]); g.lineTo(T[0] + 8 + Math.cos(a) * l, T[1] + Math.sin(a) * l); g.stroke(); }
    g.beginPath(); g.arc(W * 0.83, H * 0.36, 9, 0, 6.3); g.fillStyle = '#ff9a2a'; g.fill(); g.restore();
  }],
  ['Храм за решёткой', 'Фасад храма, вписанный в арку. За колоннами — бассейновая плитка: вечное подставлено вместо неба.', 0, (g, W, H, r) => {
    g.fillStyle = '#f4ecdc'; g.fillRect(0, 0, W, H); const ax = W * 0.14, ay = H * 0.08, aw = W * 0.72, ah = H * 0.84;
    g.save(); archPath(g, ax, ay, aw, ah); g.clip(); g.strokeStyle = '#5a8ac8'; g.lineWidth = 1.3; gridLines(g, ax, ay, ax + aw, ay + ah, 16, '#d8e4f4'); g.restore();
    g.strokeStyle = '#5a8ac8'; g.lineWidth = 3; archPath(g, ax, ay, aw, ah); g.stroke(); g.lineWidth = 1.2; archPath(g, ax - 8, ay - 8, aw + 16, ah + 16); g.stroke();
    g.strokeStyle = '#d8402a'; g.lineWidth = 1.6; g.fillStyle = '#f4ecdc'; g.fillRect(W * 0.2, H * 0.47, W * 0.6, H * 0.4); temple(g, W / 2, H * 0.86, W * 0.6, H * 0.42);
    g.fillStyle = '#d8402a'; g.fillRect(0, H * 0.93, W, H * 0.07);
  }],
  ['Амфора на розовом', 'Амфора с меандром. Внутри неё, говорят, хранили вино, потом пепел, потом ничего — и это самое ценное, что в ней было.', 0, (g, W, H, r) => {
    g.fillStyle = '#f2b8d8'; g.fillRect(0, 0, W, H); g.strokeStyle = '#2a3aa8'; g.lineWidth = 2; amphora(g, W / 2, H * 0.16, H * 0.68);
    g.save(); g.beginPath(); g.rect(W * 0.25, H * 0.45, W * 0.5, H * 0.08); g.clip(); meander(g, W * 0.2, H * 0.465, W * 0.8, 12); g.restore();
    g.lineWidth = 1; g.save(); g.beginPath(); g.rect(W * 0.3, H * 0.56, W * 0.4, H * 0.18); g.clip(); hatch(g, 0.8, 6, W, H); g.restore();
    g.lineWidth = 2; meander(g, 20, 20, W - 20, 14); meander(g, 20, H - 36, W - 20, 14);
  }],
  ['Профиль', 'Профиль неизвестного героя. Те, кто долго смотрит, узнают в нём себя — со стороны, которой никогда не видели.', 0, (g, W, H, r) => {
    g.fillStyle = '#efe6d2'; g.fillRect(0, 0, W, H); g.strokeStyle = '#3a6ab8'; g.lineWidth = 1; g.save(); g.beginPath(); g.arc(W / 2, H * 0.46, W * 0.38, 0, 6.3); g.clip(); gridLines(g, 0, 0, W, H, 14, '#dbe4f2'); g.restore();
    g.lineWidth = 3; g.beginPath(); g.arc(W / 2, H * 0.46, W * 0.38, 0, 6.3); g.stroke();
    g.fillStyle = '#efe6d2'; g.strokeStyle = '#c8302a'; g.lineWidth = 2.2; profileHead(g, W * 0.5, H * 0.42, W * 0.3);
    g.lineWidth = 1; g.save(); g.beginPath(); g.rect(W * 0.2, H * 0.78, W * 0.6, H * 0.1); g.clip(); hatch(g, -0.7, 5, W, H); g.restore();
  }],
  ['Обелиск на закате', 'Обелиск отбрасывает тень длиннее, чем позволяет солнце. Тень показывает на отель.', 1, (g, W, H, r) => {
    g.fillStyle = '#2a1440'; g.fillRect(0, 0, W, H); g.strokeStyle = '#ffd070'; g.lineWidth = 1.2;
    for (let i = 0; i < 9; i++) { g.beginPath(); g.arc(W * 0.5, H * 0.62, 26 + i * 9, Math.PI, 0); g.stroke(); }
    g.fillStyle = '#2a1440'; g.fillRect(0, H * 0.62, W, H); dunes(g, 0, H * 0.64, W, H, r, 8);
    g.fillStyle = '#2a1440'; g.beginPath(); g.moveTo(W * 0.66, H * 0.76); g.lineTo(W * 0.68, H * 0.3); g.lineTo(W * 0.69, H * 0.26); g.lineTo(W * 0.70, H * 0.3); g.lineTo(W * 0.72, H * 0.76); g.closePath(); g.fill(); g.stroke();
    g.beginPath(); g.moveTo(W * 0.66, H * 0.76); g.lineTo(W * 0.1, H * 0.9); g.lineTo(W * 0.14, H * 0.93); g.lineTo(W * 0.72, H * 0.76); g.stroke();
  }],
  ['Капитель', 'Ионическая капитель крупным планом. Завитки закручиваются внутрь, как ступени лестницы, ведущей в подвал.', 1, (g, W, H, r) => {
    g.fillStyle = '#163a3a'; g.fillRect(0, 0, W, H); g.strokeStyle = '#e8d8b0'; g.lineWidth = 1.8;
    const vol = (cx, cy, dir) => { g.beginPath(); for (let a = 0; a < 6.3 * 3; a += 0.1) { const rr = 46 * Math.exp(-a * 0.1); const x = cx + Math.cos(a) * rr * dir, y = cy + Math.sin(a) * rr; a ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); };
    g.strokeRect(W * 0.12, H * 0.18, W * 0.76, H * 0.08); g.beginPath(); g.moveTo(W * 0.18, H * 0.3); g.quadraticCurveTo(W / 2, H * 0.4, W * 0.82, H * 0.3); g.stroke();
    vol(W * 0.22, H * 0.42, 1); vol(W * 0.78, H * 0.42, -1);
    for (let i = 0; i < 7; i++) { g.beginPath(); g.arc(W * (0.33 + i * 0.056), H * 0.42, 9, 0, Math.PI); g.stroke(); }
    for (let i = 0; i < 9; i++) { g.beginPath(); g.moveTo(W * (0.32 + i * 0.045), H * 0.52); g.lineTo(W * (0.32 + i * 0.045), H); g.stroke(); }
  }],
  ['Лавровый венок', 'Венок без победителя. Его вручают каждому, кто дошёл до этой стены, и тут же забирают обратно.', 0, (g, W, H, r) => {
    g.fillStyle = '#3a0a14'; g.fillRect(0, 0, W, H); g.strokeStyle = '#e0b060'; g.fillStyle = '#e0b060'; g.lineWidth = 1.5;
    const cx = W / 2, cy = H * 0.48, R = W * 0.33;
    for (const s of [-1, 1]) for (let i = 0; i < 16; i++) { const a = Math.PI / 2 + s * (0.25 + i * 0.16); const x = cx + Math.cos(a) * R, y = cy + Math.sin(a) * R; g.save(); g.translate(x, y); g.rotate(a + s * 0.9); g.beginPath(); g.ellipse(0, 0, 14, 5, 0, 0, 6.3); g.stroke(); g.beginPath(); g.moveTo(-14, 0); g.lineTo(14, 0); g.stroke(); g.restore(); }
    g.beginPath(); g.arc(cx, cy, R * 0.45, 0, 6.3); g.fill(); g.fillStyle = '#3a0a14'; for (let i = 0; i < 6; i++) g.fillRect(cx - R * 0.5, cy + R * 0.05 + i * i * 1.6 + i * 5, R, 2 + i * 0.6);
    g.strokeRect(16, 16, W - 32, H - 32);
  }],
  ['Фазы луны', 'Луна над отелем всегда в одной фазе. Здесь нарисованы остальные — на случай, если она передумает.', 1, (g, W, H, r) => {
    g.fillStyle = '#0e1430'; g.fillRect(0, 0, W, H); stars(g, W, H, 120, r, '#f4e4c0'); g.strokeStyle = '#f4e4c0'; g.fillStyle = '#f4e4c0'; g.lineWidth = 1.4;
    for (let i = 0; i < 7; i++) { const x = W * (0.1 + i * 0.133), y = H * 0.5, R = 22; g.beginPath(); g.arc(x, y, R, 0, 6.3); g.stroke();
      g.save(); g.beginPath(); g.arc(x, y, R, 0, 6.3); g.clip(); const k = i / 6; g.beginPath(); g.ellipse(x + (k - 0.5) * 4 * R * (k < 0.5 ? 1 : 1), y, R * Math.abs(1 - 2 * k) + 0.1, R, 0, 0, 6.3); g.fill(); g.restore(); }
    g.beginPath(); g.moveTo(20, H * 0.78); g.lineTo(W - 20, H * 0.78); g.stroke(); g.beginPath(); g.moveTo(20, H * 0.22); g.lineTo(W - 20, H * 0.22); g.stroke();
  }],
  ['Круги на воде', 'Вид сверху на бассейн 313. Кто-то бросил камень. Круги расходятся до сих пор.', 0, (g, W, H, r) => {
    g.fillStyle = '#f0e8d8'; g.fillRect(0, 0, W, H); g.strokeStyle = '#7aa8d8'; g.lineWidth = 1; gridLines(g, 0, 0, W, H, 20);
    g.strokeStyle = '#d83a3a'; for (let i = 1; i < 14; i++) { g.lineWidth = 2.4 - i * 0.12; g.beginPath(); g.arc(W * 0.45, H * 0.52, i * 15 + Math.sin(i) * 3, 0, 6.3); g.stroke(); }
    for (let i = 1; i < 6; i++) { g.lineWidth = 1; g.beginPath(); g.arc(W * 0.75, H * 0.25, i * 10, 0, 6.3); g.stroke(); }
  }],
  ['Лестница в никуда', 'Лестница поднимается, поворачивает и снова поднимается — и приходит туда, откуда начиналась. Как лифт.', 0, (g, W, H, r) => {
    g.fillStyle = '#f0c4d8'; g.fillRect(0, 0, W, H); g.strokeStyle = '#3a2a8a'; g.lineWidth = 1.6;
    const iso = (x, y, z) => [W / 2 + (x - y) * 26, H * 0.74 + (x + y) * 13 - z * 26];
    const step = (x, y, z) => { const p = [iso(x, y, z), iso(x + 1, y, z), iso(x + 1, y + 2, z), iso(x, y + 2, z)]; g.fillStyle = '#f8e0ec'; g.beginPath(); p.forEach((q, i) => i ? g.lineTo(...q) : g.moveTo(...q)); g.closePath(); g.fill(); g.stroke();
      const f = [iso(x + 1, y, z), iso(x + 1, y + 2, z), iso(x + 1, y + 2, z - 0.5), iso(x + 1, y, z - 0.5)]; g.fillStyle = '#c8a0d8'; g.beginPath(); f.forEach((q, i) => i ? g.lineTo(...q) : g.moveTo(...q)); g.closePath(); g.fill(); g.stroke(); };
    // замкнутый марш по периметру квадрата: каждая ступень выше предыдущей, а последняя приходит к первой
    const path = []; const N = 5;
    for (let i = 0; i < N; i++) path.push([-3 + i, -3]); for (let i = 0; i < N; i++) path.push([2, -3 + i + 1]); for (let i = 0; i < N; i++) path.push([1 - i, 2]); for (let i = 0; i < N - 1; i++) path.push([-3, 1 - i]);
    const st = path.map(([x, y], i) => [x, y, 0.4 + i * 0.22]);
    st.sort((a, b) => (a[0] + a[1]) - (b[0] + b[1]) || a[2] - b[2]);
    for (const [x, y, z] of st) { const cube = (x0, y0, z0) => {
        const top = [iso(x0, y0, z0), iso(x0 + 1, y0, z0), iso(x0 + 1, y0 + 1, z0), iso(x0, y0 + 1, z0)], fr = [iso(x0 + 1, y0, z0), iso(x0 + 1, y0 + 1, z0), iso(x0 + 1, y0 + 1, 0), iso(x0 + 1, y0, 0)], sd = [iso(x0, y0 + 1, z0), iso(x0 + 1, y0 + 1, z0), iso(x0 + 1, y0 + 1, 0), iso(x0, y0 + 1, 0)];
        for (const [q, c] of [[fr, '#c8a0d8'], [sd, '#9a78c8'], [top, '#f8e0ec']]) { g.fillStyle = c; g.beginPath(); q.forEach((p, i) => i ? g.lineTo(...p) : g.moveTo(...p)); g.closePath(); g.fill(); g.stroke(); } };
      cube(x, y, z); }
    g.lineWidth = 1; g.save(); g.beginPath(); g.rect(0, H * 0.82, W, H); g.clip(); hatch(g, 0.4, 7, W, H); g.restore();
  }],
  ['Пальма в арке', 'Пальма, которая растёт в окне, хотя окна здесь нет. Солнце за ней нарезано полосками, чтобы влезло в раму.', 0, (g, W, H, r) => {
    g.fillStyle = '#18303a'; g.fillRect(0, 0, W, H); const ax = W * 0.15, ay = H * 0.08, aw = W * 0.7, ah = H * 0.84;
    g.save(); archPath(g, ax, ay, aw, ah); g.clip(); const gr = g.createLinearGradient(0, ay, 0, ay + ah); gr.addColorStop(0, '#ff7ab8'); gr.addColorStop(1, '#ffc070'); g.fillStyle = gr; g.fillRect(ax, ay, aw, ah);
    g.fillStyle = '#18303a'; for (let i = 0; i < 9; i++) g.fillRect(ax, ay + ah * 0.42 + i * i * 2.4 + i * 8, aw, 2 + i * 0.8);
    g.strokeStyle = '#18303a'; g.lineWidth = 7; g.beginPath(); g.moveTo(W * 0.45, ay + ah); g.quadraticCurveTo(W * 0.42, H * 0.55, W * 0.52, H * 0.32); g.stroke();
    g.lineWidth = 3; for (let i = 0; i < 7; i++) { const a = -2.6 + i * 0.75; g.beginPath(); g.moveTo(W * 0.52, H * 0.32); g.quadraticCurveTo(W * 0.52 + Math.cos(a) * 50, H * 0.32 + Math.sin(a) * 50 - 18, W * 0.52 + Math.cos(a) * 95, H * 0.32 + Math.sin(a) * 85 + 10); g.stroke(); }
    g.restore(); g.strokeStyle = '#7ad8d0'; g.lineWidth = 3; archPath(g, ax, ay, aw, ah); g.stroke();
  }],
  ['Планета над горизонтом', 'Кольцевая планета встаёт над пустыней. Астрономы отеля называют её «Номер 000».', 1, (g, W, H, r) => {
    g.fillStyle = '#100818'; g.fillRect(0, 0, W, H); stars(g, W, H, 100, r, '#ffb070', H * 0.6); g.strokeStyle = '#ffb070'; g.lineWidth = 1.2;
    const cx = W * 0.58, cy = H * 0.4, R = 60; g.save(); g.beginPath(); g.arc(cx, cy, R, 0, 6.3); g.clip(); hatch(g, 0.3, 6, W, H); g.restore(); g.beginPath(); g.arc(cx, cy, R, 0, 6.3); g.stroke();
    g.lineWidth = 2; g.beginPath(); g.ellipse(cx, cy, R * 1.8, R * 0.38, -0.25, 0, 6.3); g.stroke(); g.lineWidth = 1;
    g.fillStyle = '#100818'; g.fillRect(0, H * 0.66, W, H); dunes(g, 0, H * 0.66, W, H, r, 6); g.beginPath(); g.moveTo(0, H * 0.66); g.lineTo(W, H * 0.66); g.stroke();
  }],
  ['Дверь в пустыне', 'Открытая дверь посреди барханов. За ней — тот же пейзаж, только на полчаса раньше.', 0, (g, W, H, r) => {
    g.fillStyle = '#1a0a0a'; g.fillRect(0, 0, W, H); g.strokeStyle = '#ff7a3a'; g.lineWidth = 1.1; dunes(g, 0, H * 0.5, W, H, r, 7);
    const dx = W * 0.4, dy = H * 0.3, dw = W * 0.2, dh = H * 0.36; g.fillStyle = '#ffd890'; g.fillRect(dx, dy, dw, dh); g.fillStyle = '#1a0a0a';
    g.beginPath(); g.moveTo(dx + dw, dy); g.lineTo(dx + dw * 1.6, dy + dh * 0.06); g.lineTo(dx + dw * 1.6, dy + dh * 1.02); g.lineTo(dx + dw, dy + dh); g.closePath(); g.fill(); g.lineWidth = 1.6; g.stroke();
    g.fillStyle = 'rgba(255,216,144,0.25)'; g.beginPath(); g.moveTo(dx, dy + dh); g.lineTo(dx + dw, dy + dh); g.lineTo(dx + dw * 2.2, H); g.lineTo(dx - dw * 1.2, H); g.closePath(); g.fill();
    g.strokeRect(14, 14, W - 28, H - 28);
  }],
  ['Песочные часы', 'Внутри часов — маленькая пустыня с барханами. Песок не сыплется, потому что время здесь стоит в полдень.', 0, (g, W, H, r) => {
    g.fillStyle = '#142038'; g.fillRect(0, 0, W, H); g.strokeStyle = '#e8c070'; g.lineWidth = 2; const cx = W / 2, t = H * 0.12, b = H * 0.88, w = W * 0.3;
    g.strokeRect(cx - w - 14, t - 14, (w + 14) * 2, 14); g.strokeRect(cx - w - 14, b, (w + 14) * 2, 14);
    g.beginPath(); g.moveTo(cx - w, t); g.bezierCurveTo(cx - w, H * 0.4, cx - 6, H * 0.45, cx - 6, H / 2); g.bezierCurveTo(cx - 6, H * 0.55, cx - w, H * 0.6, cx - w, b); g.lineTo(cx + w, b);
    g.bezierCurveTo(cx + w, H * 0.6, cx + 6, H * 0.55, cx + 6, H / 2); g.bezierCurveTo(cx + 6, H * 0.45, cx + w, H * 0.4, cx + w, t); g.closePath(); g.stroke(); g.save(); g.clip();
    g.lineWidth = 1; dunes(g, cx - w, H * 0.7, cx + w, b, r, 5); dunes(g, cx - w, t + 6, cx + w, H * 0.3, r, 5); g.restore();
    for (const x of [cx - w - 8, cx + w + 8]) { g.beginPath(); g.moveTo(x, t); g.lineTo(x, b); g.stroke(); }
  }],
  ['Цветок жизни', 'Девятнадцать окружностей, наложенных друг на друга. Если обвести их пальцем, придёшь в ту же точку, но уже другим.', 0, (g, W, H, r) => {
    g.fillStyle = '#7a1420'; g.fillRect(0, 0, W, H); g.strokeStyle = '#f4dcb0'; g.lineWidth = 1.4; const cx = W / 2, cy = H / 2, R = W * 0.12;
    const pts = [[0, 0]]; for (let k = 1; k <= 2; k++) for (let i = 0; i < 6 * k; i++) { const a = Math.floor(i / k) * Math.PI / 3, b = (Math.floor(i / k) + 2) * Math.PI / 3, f = (i % k); pts.push([Math.cos(a) * k * R + Math.cos(b) * f * R, Math.sin(a) * k * R + Math.sin(b) * f * R]); }
    for (const [x, y] of pts) { g.beginPath(); g.arc(cx + x, cy + y, R, 0, 6.3); g.stroke(); }
    g.lineWidth = 2.4; g.beginPath(); g.arc(cx, cy, R * 3, 0, 6.3); g.stroke(); g.beginPath(); g.arc(cx, cy, R * 3.15, 0, 6.3); g.stroke();
    for (let i = 0; i < 24; i++) { const a = i / 24 * 6.283; g.beginPath(); g.moveTo(cx + Math.cos(a) * R * 3.2, cy + Math.sin(a) * R * 3.2); g.lineTo(cx + Math.cos(a) * R * 3.9, cy + Math.sin(a) * R * 3.9); g.stroke(); }
  }],
  ['Сфера над шахматным полем', 'Каркасный шар висит над полом, который уходит за горизонт. Шар — это мир идей, пол — всё остальное.', 1, (g, W, H, r) => {
    g.fillStyle = '#f6c0dc'; g.fillRect(0, 0, W, H); g.strokeStyle = '#2a2a9a'; g.lineWidth = 1.2; const hz = H * 0.6;
    for (let i = -14; i <= 14; i++) { g.beginPath(); g.moveTo(W / 2 + i * 6, hz); g.lineTo(W / 2 + i * 70, H); g.stroke(); }
    for (let i = 1; i < 10; i++) { const y = hz + (H - hz) * Math.pow(i / 9, 2); g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
    g.beginPath(); g.moveTo(0, hz); g.lineTo(W, hz); g.stroke(); const cx = W / 2, cy = H * 0.34, R = 62;
    g.fillStyle = '#f6c0dc'; g.beginPath(); g.arc(cx, cy, R, 0, 6.3); g.fill(); g.stroke();
    for (let i = 1; i < 6; i++) { g.beginPath(); g.ellipse(cx, cy, R * Math.cos(i / 6 * Math.PI / 2 * 2 - Math.PI / 2 + 0.001) , R, 0, 0, 6.3); g.stroke(); g.beginPath(); g.ellipse(cx, cy - R + i * R / 3, R * Math.sin(Math.acos(Math.min(1, Math.abs(1 - i / 3)))), R * 0.12, 0, 0, 6.3); g.stroke(); }
    g.fillStyle = 'rgba(42,42,154,0.25)'; g.beginPath(); g.ellipse(cx, H * 0.75, R * 0.9, R * 0.16, 0, 0, 6.3); g.fill();
  }],
  ['Кипарисы', 'Аллея кипарисов, ведущая к храму, которого не построили. Деревья ждут, держа строй.', 1, (g, W, H, r) => {
    g.fillStyle = '#f2e6cc'; g.fillRect(0, 0, W, H); g.strokeStyle = '#2a6a4a'; g.lineWidth = 1.3; const hz = H * 0.62;
    g.beginPath(); g.moveTo(0, hz); g.lineTo(W, hz); g.stroke(); g.beginPath(); g.arc(W / 2, hz, 30, Math.PI, 0); g.stroke();
    for (let s = -1; s <= 1; s += 2) for (let i = 0; i < 6; i++) { const t = 1 - i / 7, x = W / 2 + s * (40 + 200 * t * t), by = hz + (H - hz) * t * 0.9, h = 30 + 170 * t * t, w = 6 + 18 * t * t;
      g.fillStyle = '#f2e6cc'; g.beginPath(); g.moveTo(x, by - h); g.quadraticCurveTo(x + w, by - h * 0.4, x, by); g.quadraticCurveTo(x - w, by - h * 0.4, x, by - h); g.fill(); g.stroke();
      g.save(); g.clip(); hatch(g, 1.2, 4, W, H); g.restore(); }
    g.beginPath(); g.moveTo(W / 2 - 30, H); g.lineTo(W / 2 - 4, hz); g.moveTo(W / 2 + 30, H); g.lineTo(W / 2 + 4, hz); g.stroke();
  }],
];
export function ornamentImage(n) {
  const total = SUBJ.length + ORN.length;
  const k = n % total;
  let c, title, text;
  if (k < SUBJ.length) {
    const [t, d, land, draw] = SUBJ[k]; const Wd = land ? 480 : 384, Hd = land ? 360 : 480;
    let g; [c, g] = canvas(Wd, Hd); g.lineCap = 'round'; g.lineJoin = 'round'; draw(g, Wd, Hd, rnd(211 + k * 31)); title = t; text = d;
  } else { const j = k - SUBJ.length; c = classicOrnament(n, j); title = ORN[j][0]; text = ORN[j][1]; }
  const g = c.getContext('2d'); g.strokeStyle = 'rgba(0,0,0,0.45)'; g.lineWidth = 6; g.strokeRect(0, 0, c.width, c.height);
  return { url: c.toDataURL('image/jpeg', 0.9), w: c.width, h: c.height, title, text };
}

// тяжёлый красный занавес: вертикальные складки со светом на гребнях
export const curtainTex = () => cached('redCurtain', () => {
  const W0 = 256, H0 = 64, [c, g] = canvas(W0, H0);
  const img = g.createImageData(W0, H0);
  for (let x = 0; x < W0; x++) {
    const ph = x / W0 * Math.PI * 2 * 4; const k = 0.5 + 0.5 * Math.sin(ph) * 0.8 + 0.2 * Math.sin(ph * 2.3 + 1);
    for (let y = 0; y < H0; y++) { const i = (y * W0 + x) * 4; img.data[i] = 120 + k * 120; img.data[i + 1] = 8 + k * 22; img.data[i + 2] = 14 + k * 26; img.data[i + 3] = 255; }
  }
  g.putImageData(img, 0, 0);
  return toTex(c);
});

// плетёный щит: косое плетение из травы с потемневшими полосами
export const shieldTex = () => cached('shield', () => {
  const W0 = 64, H0 = 256, [c, g] = canvas(W0, H0); const r = rnd(302);
  g.fillStyle = '#6e5634'; g.fillRect(0, 0, W0, H0);
  for (let y = -W0; y < H0 + W0; y += 6) {
    g.strokeStyle = 'rgba(40,26,12,0.55)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(0, y); g.lineTo(W0, y + W0 * 0.6); g.stroke();
    g.strokeStyle = 'rgba(190,160,110,0.35)'; g.lineWidth = 1; g.beginPath(); g.moveTo(0, y + 3); g.lineTo(W0, y + 3 - W0 * 0.6); g.stroke();
  }
  for (let i = 0; i < 7; i++) { g.fillStyle = `rgba(30,18,8,${0.15 + r() * 0.2})`; g.fillRect(0, 20 + i * 32 + r() * 6, W0, 5 + r() * 4); }
  return toTex(c, { repeat: false });
});
