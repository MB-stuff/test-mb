// ЭЛИЗИУМ · процедурные текстуры
// Всё рисуется на canvas при загрузке: файлов нет, сборка — один HTML. Бесшовность: всё, что пересекает
// край тайла, рисуется девять раз со сдвигом (wrap). UV в мире задаются в метрах (см. texMat(…, uv)).
import * as THREE from 'three';

export function canvas(w, h = w) { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; }
export function toTex(c, { repeat = true, srgb = true } = {}) {
  const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t;
}
export function rnd(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
export function wrap(S, fn) { for (const dx of [-S, 0, S]) for (const dy of [-S, 0, S]) fn(dx, dy); }
const cache = {};
export function cached(key, fn) { return cache[key] || (cache[key] = fn()); }
function grain(g, S, n, alpha, r) { for (let i = 0; i < n; i++) { g.fillStyle = `rgba(0,0,0,${r() * alpha})`; g.fillRect(r() * S, r() * S, 1 + r() * 2, 1 + r() * 2); } }

export const wood = (base = '#4a2a18') => cached('wood' + base, () => {
  const S = 128, [c, g] = canvas(S), r = rnd(7); g.fillStyle = base; g.fillRect(0, 0, S, S);
  for (let i = 0; i < 40; i++) { const y = r() * S, a = 0.05 + r() * 0.12; g.strokeStyle = `rgba(0,0,0,${a})`; g.lineWidth = 1 + r() * 2; wrap(S, (dx, dy) => { g.beginPath(); g.moveTo(dx, y + dy); for (let x = 0; x <= S; x += 8) g.lineTo(x + dx, y + dy + Math.sin(x * 0.05 + i) * 2); g.stroke(); }); }
  return toTex(c);
});
export const tiles = (a = '#2b3a3a', b = '#253232', grout = '#121a1a', n = 4) => cached(`tl${a}${b}${grout}${n}`, () => {
  const S = 128, [c, g] = canvas(S), r = rnd(3), t = S / n; g.fillStyle = grout; g.fillRect(0, 0, S, S);
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { g.fillStyle = (i + j) % 2 ? a : b; g.fillRect(i * t + 1, j * t + 1, t - 2, t - 2); }
  grain(g, S, 300, 0.08, r); return toTex(c);
});
export const carpet = (base = '#1e4a2e', line = '#8a7a3a') => cached('cp' + base + line, () => {
  const S = 128, [c, g] = canvas(S), r = rnd(5); g.fillStyle = base; g.fillRect(0, 0, S, S);
  g.strokeStyle = line; g.lineWidth = 2; g.beginPath(); g.moveTo(S / 2, 8); g.lineTo(S - 8, S / 2); g.lineTo(S / 2, S - 8); g.lineTo(8, S / 2); g.closePath(); g.stroke();
  g.fillStyle = line; g.beginPath(); g.arc(S / 2, S / 2, 5, 0, 7); g.fill();
  grain(g, S, 1500, 0.12, r); return toTex(c);
});
export const wallpaper = (a = '#4a2420', b = '#5e3026') => cached('wp' + a + b, () => {
  const S = 128, [c, g] = canvas(S), r = rnd(11); g.fillStyle = a; g.fillRect(0, 0, S, S); g.fillStyle = b;
  for (let x = 0; x < S; x += 16) g.fillRect(x, 0, 6, S);
  grain(g, S, 600, 0.06, r); return toTex(c);
});
export const plaster = (base = '#8a7a68') => cached('pl' + base, () => {
  const S = 128, [c, g] = canvas(S), r = rnd(13); g.fillStyle = base; g.fillRect(0, 0, S, S);
  for (let i = 0; i < 60; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '0,0,0' : '255,255,255'},${r() * 0.05})`; const x = r() * S, y = r() * S, rr = 6 + r() * 20; wrap(S, (dx, dy) => { g.beginPath(); g.arc(x + dx, y + dy, rr, 0, 7); g.fill(); }); }
  return toTex(c);
});
// табличка: текст подгоняется по размеру; sub — главная строка крупно, остальные (переводы) мелко
export function signTex(text, { aspect = 3, bg = '#14100c', fg = '#d8c08a', family = 'Georgia, serif', border = true, sub = false } = {}) {
  return cached(`sign${text}${aspect.toFixed(2)}${bg}${fg}${sub}`, () => {
    const H = 128, Wd = Math.min(1024, Math.max(64, Math.round(H * aspect))), [c, g] = canvas(Wd, H);
    g.fillStyle = bg; g.fillRect(0, 0, Wd, H);
    if (border) { g.strokeStyle = fg; g.globalAlpha = 0.55; g.lineWidth = 4; g.strokeRect(7, 7, Wd - 14, H - 14); g.globalAlpha = 1; }
    const lines = String(text).split('\n'), pad = border ? 22 : 10; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = fg;
    const fit = (str, size, weight) => { g.font = `${weight} ${size}px ${family}`; while (g.measureText(str).width > Wd - pad * 2 && size > 6) { size *= 0.92; g.font = `${weight} ${size}px ${family}`; } return size; };
    if (sub && lines.length > 1) {
      const s1 = fit(lines[0], (H - pad * 2) * 0.5, 'bold'); let s2 = (H - pad * 2) * 0.24; for (const l of lines.slice(1)) s2 = Math.min(s2, fit(l, s2, ''));
      const y0 = H / 2 - (s1 * 1.05 + (lines.length - 1) * s2 * 1.2) / 2;
      g.font = `bold ${s1}px ${family}`; g.fillText(lines[0], Wd / 2, y0 + s1 * 0.52);
      g.globalAlpha = 0.8; g.font = `${s2}px ${family}`; lines.slice(1).forEach((l, i) => g.fillText(l, Wd / 2, y0 + s1 * 1.05 + s2 * (0.6 + i * 1.2)));
    } else {
      let size = (H - pad * 2) / lines.length * 0.8; for (const l of lines) size = Math.min(size, fit(l, size, 'bold'));
      g.font = `bold ${size}px ${family}`; lines.forEach((l, i) => g.fillText(l, Wd / 2, H / 2 + (i - (lines.length - 1) / 2) * size * 1.12));
    }
    return toTex(c, { repeat: false });
  });
}
// небо-градиент для фона за окнами
export function skyTex(top = '#ffe9a0', mid = '#ffc070', bottom = '#7a1a24') {
  const [c, g] = canvas(4, 256); const gr = g.createLinearGradient(0, 0, 0, 256);
  gr.addColorStop(0, top); gr.addColorStop(0.55, mid); gr.addColorStop(0.56, bottom); gr.addColorStop(1, bottom);
  g.fillStyle = gr; g.fillRect(0, 0, 4, 256); return toTex(c, { repeat: false });
}
