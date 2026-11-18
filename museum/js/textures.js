// Процедурные пиксельные текстуры и спрайты. Всё рисуется кодом при запуске.
(function () {
  'use strict';
  const WT_W = 64, WT_H = 96;   // стена: 1 клетка × 1.5 высоты
  const FT = 64;                // пол/потолок

  let seed = 1234567;
  const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  const ri = (a, b) => a + Math.floor(rnd() * (b - a + 1));

  function cv(w, h) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const g = c.getContext('2d');
    g.imageSmoothingEnabled = false;
    return [c, g];
  }
  function toTex(c, sprite) {
    const g = c.getContext('2d');
    const d = g.getImageData(0, 0, c.width, c.height);
    const px = new Uint32Array(d.data.buffer.slice(0));
    if (sprite) {
      for (let i = 0; i < px.length; i++) if ((px[i] >>> 24) < 140) px[i] = 0; else px[i] |= 0xff000000;
    }
    return { w: c.width, h: c.height, px, canvas: c };
  }
  // шум по яркости поверх нарисованного
  function grain(g, w, h, amp, x0 = 0, y0 = 0) {
    const d = g.getImageData(x0, y0, w, h);
    const a = d.data;
    for (let i = 0; i < a.length; i += 4) {
      const n = (rnd() - 0.5) * amp;
      a[i] = Math.max(0, Math.min(255, a[i] + n));
      a[i + 1] = Math.max(0, Math.min(255, a[i + 1] + n));
      a[i + 2] = Math.max(0, Math.min(255, a[i + 2] + n));
    }
    g.putImageData(d, x0, y0);
  }
  const R = (g, c, x, y, w, h) => { g.fillStyle = c; g.fillRect(x, y, w, h); };

  // ------------------------------------------------------------ стены
  const walls = {};
  function wall(name, fn) { const [c, g] = cv(WT_W, WT_H); fn(g); walls[name] = toTex(c); }

  wall('plaster', g => {
    R(g, '#d8d2c4', 0, 0, 64, 96); grain(g, 64, 96, 10);
    R(g, '#efebe2', 0, 0, 64, 4); R(g, '#b8b1a2', 0, 4, 64, 1);
    R(g, '#c2baa9', 0, 62, 64, 2); R(g, '#e8e2d4', 0, 61, 64, 1); R(g, '#a39b8b', 0, 64, 64, 1);
    R(g, '#4a3a2c', 0, 88, 64, 8); R(g, '#6a5440', 0, 88, 64, 1); grain(g, 64, 8, 12, 0, 88);
  });
  wall('marble', g => {
    R(g, '#e6dac2', 0, 0, 64, 96); grain(g, 64, 96, 8);
    g.strokeStyle = 'rgba(160,140,110,0.55)'; g.lineWidth = 1;
    for (let k = 0; k < 4; k++) {
      g.beginPath(); let x = ri(0, 64), y = 8;
      g.moveTo(x, y);
      while (y < 86) { x += ri(-3, 3); y += ri(2, 5); g.lineTo(x, y); }
      g.stroke();
    }
    R(g, '#efe6d2', 0, 0, 6, 96); R(g, '#efe6d2', 58, 0, 6, 96);
    R(g, '#c9b897', 6, 0, 1, 96); R(g, '#c9b897', 57, 0, 1, 96);
    R(g, '#f4eee0', 0, 0, 64, 6); R(g, '#bfae8c', 0, 6, 64, 2); R(g, '#d9cbb0', 0, 8, 64, 1);
    R(g, '#a89676', 0, 86, 64, 10); R(g, '#c8b898', 0, 86, 64, 1); grain(g, 64, 10, 14, 0, 86);
  });
  wall('mint', g => {
    R(g, '#a9d4bb', 0, 0, 64, 96); grain(g, 64, 56, 7);
    R(g, '#c4e4d0', 0, 0, 64, 4); R(g, '#86b39a', 0, 4, 64, 1);
    R(g, '#7a4d2b', 0, 56, 64, 36); grain(g, 64, 36, 16, 0, 56);
    for (let px = 0; px < 64; px += 32) {
      R(g, '#946039', px + 4, 61, 24, 25); R(g, '#5f3a1f', px + 4, 61, 24, 1); R(g, '#5f3a1f', px + 4, 61, 1, 25);
      R(g, '#a8734a', px + 27, 61, 1, 25); R(g, '#a8734a', px + 4, 85, 24, 1);
    }
    R(g, '#5c3920', 0, 54, 64, 3); R(g, '#9a6a44', 0, 54, 64, 1);
    R(g, '#3a2414', 0, 90, 64, 6);
  });
  wall('rose', g => {
    R(g, '#d6a1a6', 0, 0, 64, 96);
    for (let x = 0; x < 64; x += 8) R(g, '#cc959b', x, 0, 3, 84);
    grain(g, 64, 84, 8);
    R(g, '#e8bfc3', 0, 0, 64, 4); R(g, '#b07e84', 0, 4, 64, 1);
    R(g, '#c9a24a', 0, 83, 64, 1);
    R(g, '#5a1f2b', 0, 84, 64, 12); R(g, '#7a3341', 0, 84, 64, 1); grain(g, 64, 12, 10, 0, 84);
  });
  wall('tiles', g => {
    R(g, '#b9c3ca', 0, 0, 64, 96);
    for (let y = 0; y < 96; y += 8) for (let x = 0; x < 64; x += 8) {
      const band = y >= 48 && y < 56;
      R(g, band ? '#4a7fb0' : (rnd() < 0.08 ? '#dfe6ea' : '#e9eff2'), x, y, 7, 7);
    }
    grain(g, 64, 96, 6);
  });
  wall('block', g => {
    R(g, '#6a6a66', 0, 0, 64, 96);
    for (let y = 0, row = 0; y < 96; y += 12, row++) {
      for (let x = (row % 2) * -16; x < 64; x += 32) {
        R(g, rnd() < 0.5 ? '#8e8e89' : '#868681', x + 1, y + 1, 30, 10);
      }
    }
    grain(g, 64, 96, 18);
    R(g, '#55595e', 0, 14, 64, 5); R(g, '#7c8288', 0, 14, 64, 1); R(g, '#3c4044', 0, 18, 64, 1);
    R(g, '#4a4e52', 20, 12, 3, 9);
  });
  wall('wallpaper', g => {
    R(g, '#cbb66b', 0, 0, 64, 96);
    for (let x = 2; x < 64; x += 8) for (let y = 0; y < 90; y += 6) {
      R(g, '#b8a258', x, y, 1, 3); R(g, '#b8a258', x + 1, y + 3, 1, 2);
    }
    grain(g, 64, 96, 10);
    for (let k = 0; k < 4; k++) {
      g.fillStyle = 'rgba(120,96,40,0.18)';
      g.beginPath(); g.ellipse(ri(0, 64), ri(10, 80), ri(4, 10), ri(6, 16), 0, 0, 7); g.fill();
    }
    R(g, '#8a7440', 0, 90, 64, 6);
  });
  wall('ena', g => {
    R(g, '#2f5bd7', 0, 0, 32, 96); R(g, '#f2c230', 32, 0, 32, 96);
    R(g, '#111', 31, 0, 2, 96);
    for (let y = 70; y < 84; y += 7) for (let x = 0; x < 64; x += 7) R(g, ((x + y) / 7) % 2 ? '#111' : '#f4f4f4', x, y, 7, 7);
    R(g, '#111', 0, 69, 64, 1); R(g, '#111', 0, 84, 64, 1);
    R(g, '#ff5ab4', 0, 0, 64, 4); R(g, '#111', 0, 4, 64, 1);
    R(g, '#111', 0, 88, 64, 8);
    g.fillStyle = 'rgba(255,255,255,0.18)'; g.beginPath(); g.ellipse(14, 34, 6, 6, 0, 0, 7); g.fill();
    g.fillStyle = 'rgba(0,0,0,0.15)'; g.beginPath(); g.moveTo(42, 24); g.lineTo(54, 46); g.lineTo(42, 46); g.fill();
  });
  function doorTex(kind) {
    const [c, g] = cv(WT_W, WT_H);
    R(g, '#8e949a', 0, 0, 64, 96);
    R(g, '#a76f3f', 4, 4, 56, 92); grain(g, 56, 92, 14, 4, 4);
    for (let x = 6; x < 60; x += 5) R(g, 'rgba(90,50,20,0.25)', x, 4, 1, 92);
    R(g, '#d0e2ea', 16, 12, 32, 30); R(g, '#e8f2f6', 18, 14, 10, 26); R(g, '#7a8288', 15, 11, 34, 1); R(g, '#7a8288', 15, 42, 34, 1);
    R(g, '#c8a24a', 50, 56, 7, 3); R(g, '#8a6a2a', 50, 59, 7, 1);
    if (kind === 'wc') {
      R(g, '#2b5ea8', 24, 18, 16, 16); R(g, '#fff', 27, 21, 3, 3); R(g, '#fff', 27, 25, 3, 7);
      R(g, '#fff', 34, 21, 3, 3); g.fillStyle = '#fff'; g.beginPath(); g.moveTo(35.5, 24); g.lineTo(32, 32); g.lineTo(39, 32); g.fill();
    } else if (kind === 'staff') {
      R(g, '#b02a2a', 18, 48, 28, 8); R(g, '#fff', 20, 51, 24, 1); R(g, '#fff', 22, 53, 20, 1);
    }
    return toTex(c);
  }
  walls.door = doorTex('');
  walls.door_wc = doorTex('wc');
  walls.door_staff = doorTex('staff');
  wall('jamb', g => { R(g, '#8a9096', 0, 0, 64, 96); for (let x = 0; x < 64; x += 16) R(g, '#6e747a', x, 0, 2, 96); grain(g, 64, 96, 6); });
  wall('entrance', g => {
    R(g, '#2c3036', 0, 0, 64, 96);
    const gr = g.createLinearGradient(0, 14, 0, 96);
    gr.addColorStop(0, '#ffffff'); gr.addColorStop(1, '#cfe6f6');
    g.fillStyle = gr; g.fillRect(4, 14, 26, 82); g.fillRect(34, 14, 26, 82);
    R(g, 'rgba(255,255,255,0.7)', 8, 18, 3, 70); R(g, 'rgba(255,255,255,0.7)', 38, 18, 3, 70);
    R(g, '#9aa2aa', 26, 50, 2, 14); R(g, '#9aa2aa', 36, 50, 2, 14);
    R(g, '#1d7a3a', 22, 3, 20, 8); R(g, '#9ff0b0', 24, 5, 16, 4); R(g, '#1d7a3a', 26, 6, 2, 2); R(g, '#1d7a3a', 31, 6, 2, 2); R(g, '#1d7a3a', 36, 6, 2, 2);
  });
  walls.entrance.emissive = true;

  // ------------------------------------------------------------ полы
  const floors = {};
  function floor(name, fn) { const [c, g] = cv(FT, FT); fn(g); floors[name] = toTex(c); }
  floor('checker', g => {
    for (let y = 0; y < 2; y++) for (let x = 0; x < 2; x++) R(g, (x + y) % 2 ? '#2a2a2e' : '#e4e0d8', x * 32, y * 32, 32, 32);
    grain(g, 64, 64, 10);
    R(g, '#8a8680', 0, 0, 64, 1); R(g, '#8a8680', 0, 0, 1, 64); R(g, '#8a8680', 0, 32, 64, 1); R(g, '#8a8680', 32, 0, 1, 64);
  });
  floor('marble', g => {
    R(g, '#e3d6bb', 0, 0, 64, 64); grain(g, 64, 64, 9);
    g.fillStyle = '#b58f5c';
    for (const [cx, cy] of [[0, 0], [64, 0], [0, 64], [64, 64], [32, 32]]) {
      g.beginPath(); g.moveTo(cx, cy - 8); g.lineTo(cx + 8, cy); g.lineTo(cx, cy + 8); g.lineTo(cx - 8, cy); g.fill();
    }
    R(g, '#c4b392', 0, 0, 64, 1); R(g, '#c4b392', 0, 0, 1, 64);
  });
  floor('parquet', g => {
    const woods = ['#9b6537', '#a86f3e', '#8f5b30', '#b07843', '#94602f'];
    for (let by = 0; by < 2; by++) for (let bx = 0; bx < 2; bx++) {
      const hor = (bx + by) % 2 === 0;
      for (let k = 0; k < 4; k++) {
        g.fillStyle = woods[ri(0, woods.length - 1)];
        if (hor) g.fillRect(bx * 32, by * 32 + k * 8, 32, 8); else g.fillRect(bx * 32 + k * 8, by * 32, 8, 32);
        g.fillStyle = '#6a4220';
        if (hor) g.fillRect(bx * 32, by * 32 + k * 8, 32, 1); else g.fillRect(bx * 32 + k * 8, by * 32, 1, 32);
      }
    }
    grain(g, 64, 64, 12);
  });
  floor('carpet', g => {
    R(g, '#6b2332', 0, 0, 64, 64); grain(g, 64, 64, 18);
    for (let y = 0; y < 64; y += 16) for (let x = 0; x < 64; x += 16) {
      const ox = (y / 16) % 2 ? 8 : 0;
      g.fillStyle = '#8a3446';
      g.beginPath(); g.moveTo(x + ox + 8, y + 3); g.lineTo(x + ox + 13, y + 8); g.lineTo(x + ox + 8, y + 13); g.lineTo(x + ox + 3, y + 8); g.fill();
      R(g, '#c9a24a', x + ox + 7, y + 7, 2, 2);
    }
  });
  floor('tiles', g => {
    R(g, '#8f999f', 0, 0, 64, 64);
    for (let y = 0; y < 64; y += 8) for (let x = 0; x < 64; x += 8) R(g, rnd() < 0.1 ? '#bcc6cc' : '#ccd5da', x, y, 7, 7);
    grain(g, 64, 64, 8);
  });
  floor('concrete', g => {
    R(g, '#7a7872', 0, 0, 64, 64); grain(g, 64, 64, 22);
    for (let k = 0; k < 5; k++) { g.fillStyle = 'rgba(40,40,36,0.15)'; g.beginPath(); g.ellipse(ri(0, 64), ri(0, 64), ri(3, 9), ri(2, 7), 0, 0, 7); g.fill(); }
    g.strokeStyle = 'rgba(40,40,36,0.5)'; g.beginPath(); let x = 0, y = ri(10, 50); g.moveTo(x, y);
    while (x < 64) { x += ri(3, 8); y += ri(-3, 3); g.lineTo(x, y); } g.stroke();
  });
  floor('enafloor', g => {
    for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) R(g, (x + y) % 2 ? '#ff5ab4' : '#3fd0c0', x * 16, y * 16, 16, 16);
    for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) if ((x + y) % 2) R(g, '#ff7ac4', x * 16 + 2, y * 16 + 2, 4, 1);
    grain(g, 64, 64, 6);
  });
  floor('oldcarpet', g => {
    R(g, '#b19a55', 0, 0, 64, 64); grain(g, 64, 64, 22);
    for (let k = 0; k < 3; k++) { g.fillStyle = 'rgba(90,70,30,0.2)'; g.beginPath(); g.ellipse(ri(0, 64), ri(0, 64), ri(5, 14), ri(4, 10), 0, 0, 7); g.fill(); }
  });

  // ------------------------------------------------------------ потолок
  function ceilBase(g) {
    R(g, '#e8e5dc', 0, 0, 64, 64);
    for (let k = 0; k < 260; k++) R(g, rnd() < 0.5 ? '#cfcabd' : '#d8d4c8', ri(0, 63), ri(0, 63), 1, 1);
    for (let i = 0; i < 64; i += 16) { R(g, '#bdb8ab', i, 0, 1, 64); R(g, '#bdb8ab', 0, i, 64, 1); R(g, '#f6f4ee', i + 1, 0, 1, 64); R(g, '#f6f4ee', 0, i + 1, 64, 1); }
  }
  const ceilings = {};
  { const [c, g] = cv(FT, FT); ceilBase(g); ceilings.tile = toTex(c); }
  {
    const [c, g] = cv(FT, FT); ceilBase(g);
    R(g, '#c9c9c9', 15, 15, 34, 34);
    R(g, '#fffdf0', 16, 16, 32, 32);
    for (let i = 16; i < 48; i += 4) { R(g, '#ebe6cf', i, 16, 1, 32); R(g, '#ebe6cf', 16, i, 32, 1); }
    R(g, '#f0ead2', 31, 16, 2, 32); R(g, '#f0ead2', 16, 31, 32, 2);
    ceilings.lamp = toTex(c);
  }
  {
    const [c, g] = cv(FT, FT); ceilBase(g);
    for (let k = 0; k < 3; k++) { g.fillStyle = 'rgba(150,120,60,0.25)'; g.beginPath(); g.ellipse(ri(10, 54), ri(10, 54), ri(5, 12), ri(4, 9), 0, 0, 7); g.fill(); }
    ceilings.stain = toTex(c);
  }

  // ------------------------------------------------------------ спрайты
  const sprites = {};
  function spr(name, w, h, fn, frames = 1) {
    const arr = [];
    for (let f = 0; f < frames; f++) { const [c, g] = cv(w, h); fn(g, f); arr.push(toTex(c, true)); }
    sprites[name] = arr;
  }
  const E = (g, c, x, y, rx, ry) => { g.fillStyle = c; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); g.fill(); };

  function waterJets(g, cx, top, base, spread, f, scale) {
    g.fillStyle = 'rgba(190,230,255,0.95)';
    for (let k = -2; k <= 2; k++) {
      for (let t = 0; t <= 1; t += 0.04) {
        const x = cx + k * spread * t;
        const y = top + (base - top) * (t * t) - (1 - t) * 2;
        const wob = ((f + Math.floor(t * 10)) % 2) ? 1 : 0;
        g.fillRect(Math.round(x + wob), Math.round(y), 1 * scale, 2);
      }
    }
    for (let k = 0; k < 10; k++) { g.fillStyle = (k + f) % 3 ? '#e8f8ff' : '#9fd8f5'; g.fillRect(Math.round(cx + (rnd() - 0.5) * spread * 4.4), Math.round(base - 2 + rnd() * 4), 1, 1); }
  }
  spr('fountain', 96, 88, (g, f) => {
    E(g, '#b9ab8c', 48, 76, 46, 10); R(g, '#b9ab8c', 2, 66, 92, 10); E(g, '#d8cbad', 48, 66, 46, 10);
    E(g, '#3d86b8', 48, 66, 40, 7); E(g, '#5aa6d6', 48, 65, 34, 5);
    for (let k = 0; k < 6; k++) R(g, '#9ed4f2', 18 + ((k * 13 + f * 5) % 60), 64 + (k % 3), 4, 1);
    R(g, '#c7b896', 43, 36, 10, 30); R(g, '#a8987a', 51, 36, 2, 30);
    E(g, '#c7b896', 48, 38, 18, 5); E(g, '#3d86b8', 48, 37, 15, 3);
    R(g, '#c7b896', 45, 18, 6, 20); E(g, '#d8cbad', 48, 18, 8, 3);
    waterJets(g, 48, 10, 37, 4, f, 1);
    waterJets(g, 48, 38, 64, 7, f + 1, 1);
    grain(g, 96, 88, 6);
  }, 4);
  spr('smallfountain', 48, 48, (g, f) => {
    E(g, '#b5a888', 24, 42, 22, 5); R(g, '#b5a888', 2, 34, 44, 8); E(g, '#d6c9ab', 24, 34, 22, 5); E(g, '#4b93c4', 24, 34, 18, 3.5);
    R(g, '#c7b896', 21, 18, 6, 16); E(g, '#d6c9ab', 24, 18, 6, 2);
    waterJets(g, 24, 8, 33, 3, f, 1);
  }, 4);
  spr('column', 24, 144, g => {
    R(g, '#e9e0cc', 3, 10, 18, 124);
    for (let x = 5; x < 21; x += 4) R(g, '#cbbd9e', x, 12, 1, 120);
    R(g, '#f6f0e2', 6, 10, 2, 124); R(g, '#b9aa88', 19, 10, 2, 124);
    R(g, '#ddd2b8', 0, 0, 24, 6); R(g, '#c8b993', 1, 6, 22, 4); R(g, '#ddd2b8', 0, 134, 24, 4); R(g, '#c8b993', 0, 138, 24, 6);
  });
  spr('plant', 40, 64, g => {
    R(g, '#6b4a33', 12, 46, 16, 16); R(g, '#7f593e', 10, 44, 20, 4); R(g, '#553926', 12, 60, 16, 4);
    R(g, '#5a3a20', 19, 26, 2, 20);
    const greens = ['#2f6b2f', '#3c8a3a', '#4fa24a', '#265a28', '#62b85a'];
    for (let k = 0; k < 70; k++) {
      const a = rnd() * Math.PI * 2, r = rnd() * 15;
      E(g, greens[ri(0, 4)], 20 + Math.cos(a) * r, 22 + Math.sin(a) * r * 0.9, 3, 2);
    }
  });
  spr('flowerbed', 72, 26, g => {
    R(g, '#8b8478', 2, 12, 68, 14); R(g, '#a39c8e', 0, 10, 72, 4); R(g, '#6e685e', 2, 24, 68, 2);
    R(g, '#4a3424', 4, 10, 64, 3);
    const fl = ['#e8486b', '#f7d046', '#ffffff', '#b06ae8', '#ff8a3d', '#ff6fae'];
    for (let k = 0; k < 40; k++) { const x = ri(5, 66), h = ri(2, 9); R(g, '#3e8a3a', x, 11 - h, 1, h); R(g, fl[ri(0, fl.length - 1)], x - 1, 10 - h, 2, 2); }
    for (let k = 0; k < 30; k++) E(g, rnd() < 0.5 ? '#3c8a3a' : '#2f6b2f', ri(5, 66), ri(7, 10), 2, 1.5);
  });
  function bench(g, shark) {
    R(g, '#3a2a1e', 6, 14, 3, 10); R(g, '#3a2a1e', 55, 14, 3, 10);
    R(g, '#2b2b30', 2, 8, 60, 7); R(g, '#45454d', 2, 8, 60, 2);
    for (let x = 8; x < 60; x += 8) R(g, '#1f1f24', x, 10, 1, 1);
    if (shark) {
      E(g, '#6c95c9', 34, 4, 13, 4.5); E(g, '#f2f2f2', 34, 6, 11, 2);
      g.fillStyle = '#6c95c9'; g.beginPath(); g.moveTo(32, 1); g.lineTo(36, -4); g.lineTo(38, 1); g.fill();
      g.beginPath(); g.moveTo(46, 4); g.lineTo(52, 0); g.lineTo(51, 8); g.fill();
      R(g, '#111', 25, 3, 1, 1);
    }
  }
  spr('bench', 64, 24, g => bench(g, false));
  spr('benchshark', 64, 30, g => { g.translate(0, 6); bench(g, true); });
  spr('rope', 72, 40, g => {
    for (const x of [6, 64]) { R(g, '#b8902e', x, 6, 3, 30); E(g, '#d9b44a', x + 1.5, 6, 3, 3); R(g, '#8a6a20', x - 2, 36, 7, 3); }
    g.strokeStyle = '#8a1c2a'; g.lineWidth = 3; g.beginPath(); g.moveTo(8, 9); g.quadraticCurveTo(36, 26, 65, 9); g.stroke();
  });
  spr('desk', 72, 40, g => {
    R(g, '#e9e6de', 2, 4, 68, 6); R(g, '#c9c4b6', 2, 10, 68, 2);
    R(g, '#6b8fb0', 4, 12, 64, 28); R(g, '#5a7c9b', 4, 12, 64, 2);
    for (let x = 8; x < 66; x += 12) R(g, '#7da1c2', x, 16, 8, 20);
  });
  spr('monitor', 24, 22, g => {
    R(g, '#d6d0be', 2, 0, 20, 16); R(g, '#244c7a', 4, 2, 16, 11); R(g, '#3d77b8', 5, 3, 6, 2); R(g, '#fff', 5, 7, 10, 1);
    R(g, '#c9c2ac', 8, 16, 8, 3); R(g, '#bdb6a0', 4, 19, 16, 3);
  });
  spr('crt', 32, 52, (g, f) => {
    R(g, '#5a5048', 2, 22, 28, 3); R(g, '#3e362f', 4, 25, 2, 27); R(g, '#3e362f', 26, 25, 2, 27);
    R(g, '#d6d0be', 3, 0, 26, 21); R(g, '#bdb6a0', 3, 18, 26, 3);
    R(g, f % 2 ? '#0f2b8c' : '#1a3aa8', 5, 2, 22, 14);
    R(g, '#ffffff', 7, 4, 12, 2); R(g, '#9fd0ff', 7, 8, 18, 1); R(g, '#9fd0ff', 7, 10, 14, 1);
    if (f % 2) R(g, '#ffffff', 22, 12, 3, 2);
    R(g, '#48c84a', 25, 17, 2, 1);
  }, 2);
  spr('cooler', 24, 56, g => {
    E(g, '#7cc3ea', 12, 9, 8, 9); R(g, '#9ad4f2', 9, 4, 3, 10);
    R(g, '#e9e6de', 4, 18, 16, 36); R(g, '#c9c4b6', 4, 18, 16, 2); R(g, '#3a7ad0', 7, 26, 3, 3); R(g, '#d03a3a', 14, 26, 3, 3);
    R(g, '#8a8a8a', 6, 32, 12, 2); R(g, '#bdb8ab', 4, 52, 16, 4);
  });
  spr('sign', 32, 64, g => {
    R(g, '#3a3a40', 15, 30, 3, 30); R(g, '#2a2a30', 8, 60, 17, 4);
    R(g, '#24456e', 2, 2, 28, 30); R(g, '#e9e6de', 3, 3, 26, 28);
    R(g, '#3f9a5a', 5, 6, 9, 9); R(g, '#c94a5c', 18, 6, 9, 9);
    g.fillStyle = '#fff'; g.beginPath(); g.moveTo(6, 10.5); g.lineTo(10, 7); g.lineTo(10, 14); g.fill();
    g.beginPath(); g.moveTo(26, 10.5); g.lineTo(22, 7); g.lineTo(22, 14); g.fill();
    for (let y = 19; y < 29; y += 3) R(g, '#8a8a90', 5, y, 22, 1);
  });
  spr('trash', 16, 22, g => { R(g, '#5d6a72', 2, 4, 12, 18); R(g, '#7a8890', 1, 2, 14, 3); for (let x = 4; x < 14; x += 3) R(g, '#4a565e', x, 6, 1, 14); });
  spr('donation', 24, 52, g => {
    R(g, '#6b4a33', 10, 24, 4, 26); R(g, '#4a3424', 5, 48, 14, 4);
    R(g, '#d8e8ee', 2, 4, 20, 20); R(g, '#a8c0c8', 2, 4, 20, 2); R(g, '#3a3a40', 8, 4, 8, 1);
    R(g, '#c9a24a', 5, 14, 14, 9);
    g.fillStyle = '#7a1c1c'; g.font = 'bold 9px monospace'; g.fillText('¥', 8, 22);
    R(g, '#e8c84a', 7, 10, 3, 2); R(g, '#7cc36a', 12, 8, 5, 3);
  });
  spr('toilet', 32, 32, g => {
    R(g, '#e9eef0', 6, 0, 20, 12); R(g, '#c9d2d6', 6, 10, 20, 2);
    E(g, '#f2f6f8', 16, 18, 13, 6); E(g, '#d4dde2', 16, 17, 9, 3.5);
    R(g, '#e2e8eb', 10, 20, 12, 10); R(g, '#c2cbd0', 10, 28, 12, 4);
  });
  spr('sink', 32, 44, g => {
    R(g, '#c0c8cc', 13, 18, 6, 26);
    E(g, '#f2f6f8', 16, 14, 15, 6); E(g, '#c9d2d6', 16, 13, 10, 3);
    R(g, '#a8b2b8', 14, 2, 4, 8); R(g, '#a8b2b8', 14, 2, 8, 2);
  });
  spr('wetfloor', 22, 32, g => {
    g.fillStyle = '#f2c81e'; g.beginPath(); g.moveTo(11, 0); g.lineTo(21, 32); g.lineTo(1, 32); g.fill();
    g.fillStyle = '#1a1a1a'; g.beginPath(); g.moveTo(11, 10); g.lineTo(15, 18); g.lineTo(7, 18); g.fill();
    R(g, '#1a1a1a', 6, 22, 10, 1); R(g, '#1a1a1a', 7, 25, 8, 1);
  });
  spr('bucket', 32, 64, g => {
    R(g, '#8a6a40', 20, 0, 2, 50); for (let x = 14; x < 28; x += 2) R(g, '#d8d2c0', x, 46 + (x % 4), 2, 10);
    R(g, '#f2c81e', 2, 42, 20, 18); R(g, '#d8ae10', 2, 42, 20, 2); R(g, '#2a2a2a', 4, 60, 3, 3); R(g, '#2a2a2a', 17, 60, 3, 3);
    R(g, '#4a7fb0', 4, 44, 16, 3);
  });
  spr('shelf', 40, 76, g => {
    R(g, '#6c7278', 2, 0, 2, 76); R(g, '#6c7278', 36, 0, 2, 76);
    for (const y of [2, 26, 50, 72]) R(g, '#8a9096', 2, y, 36, 3);
    const items = ['#d03a3a', '#3a7ad0', '#f2c81e', '#ffffff', '#3c8a3a', '#c9a24a'];
    for (const y of [2, 26, 50]) { let x = 5; while (x < 34) { const w = ri(3, 7), h = ri(6, 14); R(g, items[ri(0, 5)], x, y + 24 - h - 1 + (y === 2 ? 0 : 0), w, h); x += w + 1; } }
  });
  spr('boxes', 40, 40, g => {
    R(g, '#b88a52', 2, 18, 22, 22); R(g, '#c89a62', 2, 18, 22, 2); R(g, '#d8c4a0', 12, 18, 2, 22);
    R(g, '#a87a42', 18, 4, 20, 36); R(g, '#b88a52', 18, 4, 20, 2); R(g, '#d8c4a0', 18, 20, 20, 2);
  });
  spr('chair', 28, 44, g => {
    R(g, '#2a2a30', 6, 0, 16, 18); R(g, '#3a3a42', 7, 1, 14, 3);
    R(g, '#2a2a30', 4, 20, 20, 5); R(g, '#555', 13, 25, 2, 12);
    R(g, '#444', 3, 37, 22, 2); R(g, '#222', 3, 39, 3, 3); R(g, '#222', 22, 39, 3, 3);
  });

  spr('bust', 28, 64, g => {
    R(g, '#e6e0d2', 6, 30, 16, 32); R(g, '#f4f0e6', 6, 30, 3, 32); R(g, '#bdb6a6', 19, 30, 3, 32);
    R(g, '#d6cfbe', 3, 26, 22, 5); R(g, '#d6cfbe', 3, 60, 22, 4);
    E(g, '#ece6d8', 14, 22, 9, 5); R(g, '#e2dccd', 11, 12, 6, 9);
    E(g, '#efe9dc', 14, 9, 6, 7.5); R(g, '#cfc8b6', 17, 6, 2, 7); R(g, '#bdb6a6', 12, 9, 1, 1); R(g, '#bdb6a6', 16, 9, 1, 1);
  });
  spr('vase', 24, 48, g => {
    R(g, '#3a3a40', 6, 30, 12, 18); R(g, '#55555c', 6, 30, 12, 2);
    E(g, '#2b5ea8', 12, 20, 8, 9); R(g, '#2b5ea8', 9, 6, 6, 8); E(g, '#3d77c8', 12, 6, 4, 1.5);
    R(g, '#e8e8f0', 6, 18, 12, 1); R(g, '#e8e8f0', 7, 22, 10, 1); R(g, '#5a8ad8', 9, 14, 2, 10);
  });

  // ------------------------------------------------------------ картина на стене
  // Рисует стену с картиной в раме, табличкой и лампой-подсветкой.
  function paintingFace(baseWall, img, opts) {
    const S = 4, w = WT_W * S, h = WT_H * S;
    const [c, g] = cv(w, h);
    g.drawImage(baseWall.canvas, 0, 0, w, h);
    const maxW = opts.hero ? 228 : opts.meme ? 120 : 204;
    const maxH = opts.hero ? 236 : opts.meme ? 120 : 214;
    const k = Math.min(maxW / img.width, maxH / img.height);
    const iw = Math.round(img.width * k), ih = Math.round(img.height * k);
    const cx = w / 2, cy = opts.hero ? 168 : opts.meme ? 170 : 172;
    const fr = opts.hero ? 12 : opts.meme ? 5 : 8;
    const x0 = Math.round(cx - iw / 2), y0 = Math.round(cy - ih / 2);
    g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(x0 - fr + 4, y0 - fr + 6, iw + fr * 2, ih + fr * 2);
    const frames = {
      gold: ['#8a6418', '#e2bb55', '#b8902e'], wood: ['#3e2410', '#9a6a3c', '#6b4220'],
      black: ['#111', '#555', '#2a2a2a'], white: ['#bdbdbd', '#ffffff', '#e0e0e0'],
    };
    const [dark, light, mid] = frames[opts.frame] || frames.gold;
    g.fillStyle = mid; g.fillRect(x0 - fr, y0 - fr, iw + fr * 2, ih + fr * 2);
    g.fillStyle = light; g.fillRect(x0 - fr, y0 - fr, iw + fr * 2, 2); g.fillRect(x0 - fr, y0 - fr, 2, ih + fr * 2);
    g.fillStyle = dark; g.fillRect(x0 - fr, y0 + ih + fr - 2, iw + fr * 2, 2); g.fillRect(x0 + iw + fr - 2, y0 - fr, 2, ih + fr * 2);
    g.fillStyle = dark; g.fillRect(x0 - 2, y0 - 2, iw + 4, ih + 4);
    g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
    g.drawImage(img, x0, y0, iw, ih);
    g.imageSmoothingEnabled = false;
    // табличка
    const py = y0 + ih + fr + 10;
    g.fillStyle = '#b8902e'; g.fillRect(cx - 22, py, 44, 14); g.fillStyle = '#e2bb55'; g.fillRect(cx - 22, py, 44, 2);
    g.fillStyle = '#4a3a10'; for (let i = 0; i < 3; i++) g.fillRect(cx - 16, py + 5 + i * 3, i === 0 ? 32 : 24 - i * 4, 1);
    // лампа подсветки
    if (!opts.meme) {
      const ly = y0 - fr - 18;
      g.fillStyle = '#b8902e'; g.fillRect(cx - 2, ly - 6, 4, 10); g.fillRect(cx - 34, ly, 68, 6); g.fillStyle = '#e2bb55'; g.fillRect(cx - 34, ly, 68, 2);
      const grd = g.createLinearGradient(0, ly + 6, 0, y0 + ih * 0.5);
      grd.addColorStop(0, 'rgba(255,240,200,0.35)'); grd.addColorStop(1, 'rgba(255,240,200,0)');
      g.fillStyle = grd; g.beginPath(); g.moveTo(cx - 34, ly + 6); g.lineTo(cx + 34, ly + 6); g.lineTo(cx + iw / 2 + fr, y0 + ih * 0.5); g.lineTo(cx - iw / 2 - fr, y0 + ih * 0.5); g.fill();
    }
    return toTex(c);
  }

  window.MuseumTex = { walls, floors, ceilings, sprites, paintingFace, WT_W, WT_H, FT };
})();
