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
export function ornamentImage(n) {
  const k = n % ORN.length, land = n % 2 === 1, Wd = land ? 480 : 384, Hd = land ? 360 : 480;
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
      g.fillStyle = gold; g.font = '20px Georgia, serif'; g.textAlign = 'center'; g.fillText('ΑΙΘΗΡ', W2, Hd - 22);
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
  // повторы в других тонах: фиолетовый и бирюзовый варианты
  const cyc = Math.floor(n / ORN.length) % 3;
  if (cyc) { g.globalCompositeOperation = 'color'; g.globalAlpha = 0.45; g.fillStyle = cyc === 1 ? '#9a6ad8' : '#3ab0a8'; g.fillRect(0, 0, Wd, Hd); g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1; }
  g.strokeStyle = 'rgba(0,0,0,0.5)'; g.lineWidth = 6; g.strokeRect(0, 0, Wd, Hd);
  return { url: c.toDataURL('image/jpeg', 0.9), w: Wd, h: Hd, title: ORN[k][0] + (cyc ? ['', ' (лиловый вариант)', ' (бирюзовый вариант)'][cyc] : ''), text: ORN[k][1] };
}
const P0 = 0;
