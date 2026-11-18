// Объёмные пропы (коробки с текстурами на гранях), настенные декали, небо и парящие фигуры.
(function () {
  'use strict';
  let seed = 98765;
  const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  const ri = (a, b) => a + Math.floor(rnd() * (b - a + 1));
  function cv(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); g.imageSmoothingEnabled = false; return [c, g]; }
  function toTex(c, emit, sprite) {
    const d = c.getContext('2d').getImageData(0, 0, c.width, c.height);
    const px = new Uint32Array(d.data.buffer.slice(0));
    if (sprite) for (let i = 0; i < px.length; i++) if ((px[i] >>> 24) < 140) px[i] = 0; else px[i] |= 0xff000000;
    const t = { w: c.width, h: c.height, px, canvas: c };
    if (emit) {
      t.emit = new Uint8Array(c.width * c.height);
      for (const [x, y, w, h] of emit) for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if (i >= 0 && j >= 0 && i < c.width && j < c.height) t.emit[j * c.width + i] = 1;
    }
    return t;
  }
  function grain(g, w, h, amp, x0 = 0, y0 = 0) {
    const d = g.getImageData(x0, y0, w, h), a = d.data;
    for (let i = 0; i < a.length; i += 4) { const n = (rnd() - 0.5) * amp; a[i] = Math.max(0, Math.min(255, a[i] + n)); a[i + 1] = Math.max(0, Math.min(255, a[i + 1] + n)); a[i + 2] = Math.max(0, Math.min(255, a[i + 2] + n)); }
    g.putImageData(d, x0, y0);
  }
  const R = (g, c, x, y, w, h) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
  const E = (g, c, x, y, rx, ry) => { g.fillStyle = c; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); g.fill(); };

  // ------------------------------------------------------------ текстуры граней
  const F = {};
  function face(name, w, h, fn) { const [c, g] = cv(w, h); const emit = fn(g, w, h); F[name] = toTex(c, emit); }

  face('metal', 16, 16, g => { R(g, '#8a9096', 0, 0, 16, 16); grain(g, 16, 16, 10); });
  face('darkmetal', 16, 16, g => { R(g, '#3a3e44', 0, 0, 16, 16); grain(g, 16, 16, 8); });
  face('wood_side', 32, 32, g => { R(g, '#8a5a34', 0, 0, 32, 32); for (let y = 0; y < 32; y += 3) R(g, 'rgba(60,30,10,0.25)', 0, y, 32, 1); grain(g, 32, 32, 12); R(g, '#5f3a1f', 0, 0, 32, 1); });
  face('desk_top', 64, 32, g => {
    R(g, '#9c6a3f', 0, 0, 64, 32); for (let y = 0; y < 32; y += 4) R(g, 'rgba(70,40,15,0.2)', 0, y, 64, 1); grain(g, 64, 32, 10);
    R(g, '#f4f1e8', 40, 6, 12, 15); R(g, '#d8d4c8', 40, 9, 10, 1); R(g, '#d8d4c8', 40, 12, 9, 1); R(g, '#d8d4c8', 40, 15, 10, 1);
    E(g, '#e8e2d4', 10, 20, 3, 3); E(g, '#5a3018', 10, 20, 2, 2);
  });
  face('counter_front', 128, 48, g => {
    R(g, '#d9d3c4', 0, 0, 128, 48); grain(g, 128, 48, 6);
    for (let x = 4; x < 128; x += 31) { R(g, '#c6bfae', x, 8, 27, 34); R(g, '#e8e3d6', x, 8, 27, 1); R(g, '#a8a090', x, 41, 27, 1); }
    R(g, '#2b5ea8', 0, 0, 128, 4); R(g, '#3a3a40', 0, 44, 128, 4);
    R(g, '#ffffff', 52, 18, 24, 12); R(g, '#2b5ea8', 54, 20, 20, 8); R(g, '#fff', 58, 22, 2, 4); R(g, '#fff', 63, 22, 2, 4); R(g, '#fff', 68, 22, 2, 4);
  });
  face('counter_top', 128, 32, g => { R(g, '#e9e6de', 0, 0, 128, 32); grain(g, 128, 32, 6); R(g, '#c9c4b6', 0, 31, 128, 1); R(g, '#f4f1e8', 90, 8, 14, 10); });
  // автоматы
  function machine(g, w, h, items) {
    R(g, '#c81e3a', 0, 0, w, h); grain(g, w, h, 10);
    R(g, '#ffffff', 3, 3, w - 6, 9); R(g, '#c81e3a', 6, 5, w - 12, 5);
    R(g, '#14161a', 4, 15, w - 16, 56);
    const gx = 5, gy = 16, gw = w - 18, rows = 5;
    for (let r = 0; r < rows; r++) {
      R(g, '#6c7278', gx, gy + r * 11 + 9, gw, 1);
      for (let x = gx + 1; x < gx + gw - 3; x += 5) R(g, items[(r + x) % items.length], x, gy + r * 11 + 2, 3, 7);
    }
    R(g, 'rgba(200,240,255,0.18)', 4, 15, 6, 56);
    R(g, '#2a2a30', w - 11, 16, 8, 30); R(g, '#7dff9a', w - 10, 18, 6, 3);
    for (let y = 24; y < 40; y += 4) for (let x = w - 10; x < w - 4; x += 3) R(g, '#9aa0a6', x, y, 2, 2);
    R(g, '#14161a', 8, 76, w - 22, 10); R(g, '#3a3e44', 9, 77, w - 24, 8);
    R(g, '#8a0e22', 0, h - 4, w, 4);
    return [[4, 15, w - 16, 56], [w - 10, 18, 6, 3]];
  }
  face('vend_front', 48, 96, (g, w, h) => machine(g, w, h, ['#e8486b', '#3a7ad0', '#f2c81e', '#3c8a3a', '#ffffff', '#ff8a3d']));
  face('snack_front', 48, 96, (g, w, h) => { const e = machine(g, w, h, ['#f2c81e', '#ff6a2a', '#7a3a1a', '#e8486b', '#3aa0d0']); R(g, '#1e4fc8', 0, 0, w, 3); R(g, '#1e4fc8', 0, h - 4, w, 4); return e; });
  face('vend_side', 32, 96, g => { R(g, '#b81a34', 0, 0, 32, 96); grain(g, 32, 96, 10); R(g, '#ffffff', 0, 20, 32, 6); R(g, '#8a0e22', 0, 92, 32, 4); });
  // монитор
  face('crt_front', 32, 28, g => {
    R(g, '#d6d0be', 0, 0, 32, 28); R(g, '#bdb6a0', 0, 24, 32, 4);
    R(g, '#14286e', 3, 3, 26, 19); R(g, '#2a52c8', 4, 4, 9, 3); R(g, '#ffffff', 5, 9, 18, 1); R(g, '#9fd0ff', 5, 12, 14, 1); R(g, '#9fd0ff', 5, 15, 20, 1);
    R(g, '#ffd34a', 22, 17, 5, 3); R(g, '#48c84a', 27, 25, 2, 1);
    return [[3, 3, 26, 19], [27, 25, 2, 1]];
  });
  face('crt_side', 16, 16, g => { R(g, '#cfc8b4', 0, 0, 16, 16); for (let y = 3; y < 13; y += 3) R(g, '#a8a08a', 2, y, 12, 1); });
  face('crt_back', 32, 28, g => { R(g, '#c2bba6', 0, 0, 32, 28); for (let y = 6; y < 22; y += 3) R(g, '#9a927c', 6, y, 20, 1); R(g, '#3a3a40', 14, 22, 4, 6); });
  face('keyboard', 32, 12, g => { R(g, '#d6d0be', 0, 0, 32, 12); for (let y = 1; y < 11; y += 3) for (let x = 1; x < 31; x += 3) R(g, '#a8a08a', x, y, 2, 2); });
  face('tv_front', 48, 40, g => {
    R(g, '#2a2a30', 0, 0, 48, 40); R(g, '#111', 3, 3, 34, 30);
    const cols = ['#ffffff', '#f2d01e', '#1ee8e8', '#1ee83a', '#e81ec8', '#e8281e', '#1e3ae8'];
    for (let i = 0; i < 7; i++) R(g, cols[i], 4 + i * 4.6, 4, 5, 20);
    for (let i = 0; i < 7; i++) R(g, i % 2 ? '#111' : cols[6 - i], 4 + i * 4.6, 24, 5, 3);
    R(g, '#1e2a8a', 4, 27, 12, 5); R(g, '#fff', 16, 27, 8, 5); R(g, '#3a0a6a', 24, 27, 12, 5);
    E(g, '#5a5a62', 42, 10, 2.5, 2.5); E(g, '#5a5a62', 42, 18, 2.5, 2.5); for (let y = 24; y < 34; y += 2) R(g, '#444', 40, y, 6, 1);
    return [[4, 4, 32, 28]];
  });
  // мебель
  face('bench_top', 64, 20, g => { R(g, '#2b2b30', 0, 0, 64, 20); for (let x = 6; x < 64; x += 9) for (let y = 5; y < 18; y += 7) R(g, '#18181c', x, y, 1, 1); R(g, '#45454d', 0, 0, 64, 1); });
  face('leather_side', 32, 8, g => { R(g, '#1f1f24', 0, 0, 32, 8); R(g, '#3a3a42', 0, 0, 32, 1); });
  face('plastic_top', 64, 16, g => { R(g, '#2f6fd0', 0, 0, 64, 16); for (let x = 21; x < 64; x += 21) R(g, '#1c4c98', x, 0, 1, 16); grain(g, 64, 16, 8); });
  face('plastic_side', 16, 16, g => { R(g, '#245cb4', 0, 0, 16, 16); });
  face('chairback', 64, 24, g => { R(g, '#2f6fd0', 0, 0, 64, 24); for (let x = 21; x < 64; x += 21) R(g, '#151b2a', x - 1, 0, 2, 24); R(g, '#4a8af0', 0, 0, 64, 2); grain(g, 64, 24, 8); });
  face('planter_side', 64, 24, g => { R(g, '#8b8478', 0, 0, 64, 24); grain(g, 64, 24, 16); R(g, '#a39c8e', 0, 0, 64, 3); R(g, '#6e685e', 0, 21, 64, 3); });
  face('soil', 64, 24, g => {
    R(g, '#4a3424', 0, 0, 64, 24); grain(g, 64, 24, 20);
    for (let k = 0; k < 50; k++) E(g, rnd() < 0.5 ? '#3c8a3a' : '#2f6b2f', ri(2, 62), ri(2, 22), 2, 1.5);
  });
  face('pedestal', 24, 48, g => { R(g, '#e6e0d2', 0, 0, 24, 48); grain(g, 24, 48, 8); R(g, '#f4f0e6', 0, 0, 24, 3); R(g, '#c8c0ae', 0, 44, 24, 4); R(g, '#d6cfbe', 0, 3, 24, 1); });
  face('marble_top', 16, 16, g => { R(g, '#efe9dc', 0, 0, 16, 16); grain(g, 16, 16, 6); });
  face('porcelain', 16, 16, g => { R(g, '#eef3f5', 0, 0, 16, 16); grain(g, 16, 16, 4); });
  face('toilet_front', 24, 20, g => { R(g, '#eef3f5', 0, 0, 24, 20); R(g, '#d4dde2', 0, 0, 24, 3); R(g, '#c2cbd0', 4, 14, 16, 6); grain(g, 24, 20, 4); });
  face('toilet_top', 24, 32, g => { R(g, '#eef3f5', 0, 0, 24, 32); E(g, '#ffffff', 12, 18, 11, 13); E(g, '#c9d6dc', 12, 18, 7, 9); E(g, '#a8c4d8', 12, 20, 5, 6); });
  face('stall', 32, 64, g => { R(g, '#8ea6b8', 0, 0, 32, 64); grain(g, 32, 64, 6); R(g, '#a8bccb', 0, 0, 32, 2); R(g, '#6e8698', 0, 62, 32, 2); });
  face('stalldoor', 32, 64, g => { R(g, '#8ea6b8', 0, 0, 32, 64); grain(g, 32, 64, 6); R(g, '#c0c8cc', 26, 30, 3, 6); R(g, '#d02a2a', 26, 26, 3, 3); R(g, '#a8bccb', 0, 0, 32, 2); });
  face('sink_front', 64, 32, g => { R(g, '#d8d2c4', 0, 0, 64, 32); for (let x = 2; x < 64; x += 21) { R(g, '#c6bfae', x, 6, 19, 24); R(g, '#9a927c', x + 15, 16, 2, 4); } R(g, '#b0a898', 0, 0, 64, 4); });
  face('sink_top', 96, 24, g => {
    R(g, '#e9e6de', 0, 0, 96, 24); grain(g, 96, 24, 5);
    for (const cx of [24, 72]) { E(g, '#ffffff', cx, 13, 13, 8); E(g, '#c9d2d6', cx, 13, 10, 6); E(g, '#8a9aa2', cx, 14, 1.5, 1.5); R(g, '#a8b2b8', cx - 1, 1, 3, 6); }
  });
  face('locker_front', 64, 64, g => {
    R(g, '#5a7a8e', 0, 0, 64, 64);
    for (let x = 0; x < 64; x += 16) { R(g, '#6a8ca2', x + 1, 1, 14, 62); for (let y = 6; y < 18; y += 3) R(g, '#3e5464', x + 4, y, 8, 1); R(g, '#c0c8cc', x + 12, 32, 2, 6); R(g, '#3e5464', x, 0, 1, 64); }
    grain(g, 64, 64, 8);
  });
  face('shelf_front', 48, 76, g => {
    R(g, '#2a2a2e', 0, 0, 48, 76);
    for (const y of [0, 24, 49, 73]) R(g, '#8a9096', 0, y, 48, 3);
    R(g, '#6c7278', 0, 0, 2, 76); R(g, '#6c7278', 46, 0, 2, 76);
    const items = ['#d03a3a', '#3a7ad0', '#f2c81e', '#ffffff', '#3c8a3a', '#c9a24a', '#e8486b'];
    for (const y of [3, 27, 52]) { let x = 3; while (x < 44) { const w = ri(3, 7), h = ri(8, 18); R(g, items[ri(0, 6)], x, y + 21 - h, w, h); R(g, 'rgba(255,255,255,0.3)', x, y + 21 - h, 1, h); x += w + 1; } }
  });
  face('cardboard', 32, 24, g => { R(g, '#b88a52', 0, 0, 32, 24); grain(g, 32, 24, 10); R(g, '#d8c4a0', 0, 10, 32, 3); R(g, '#3a2a1a', 6, 16, 10, 1); R(g, '#3a2a1a', 6, 18, 6, 1); });
  face('cardboard_top', 32, 32, g => { R(g, '#c89a62', 0, 0, 32, 32); R(g, '#d8c4a0', 14, 0, 4, 32); grain(g, 32, 32, 10); });
  face('water', 64, 64, g => {
    R(g, '#2f7fb8', 0, 0, 64, 64); grain(g, 64, 64, 14);
    for (let k = 0; k < 30; k++) R(g, rnd() < 0.5 ? '#6fb8e8' : '#9ed4f2', ri(0, 60), ri(0, 63), ri(2, 6), 1);
    R(g, '#d8cbad', 0, 0, 64, 4); R(g, '#d8cbad', 0, 60, 64, 4); R(g, '#d8cbad', 0, 0, 4, 64); R(g, '#d8cbad', 60, 0, 4, 64);
    for (let k = 0; k < 8; k++) R(g, '#c9a24a', ri(10, 54), ri(10, 54), 1, 1);
  });
  face('marble_side', 64, 16, g => { R(g, '#d8cbad', 0, 0, 64, 16); grain(g, 64, 16, 10); R(g, '#efe6d2', 0, 0, 64, 2); R(g, '#a89676', 0, 14, 64, 2); });
  face('ena_block', 32, 32, g => { R(g, '#f2c230', 0, 0, 16, 32); R(g, '#2f5bd7', 16, 0, 16, 32); R(g, '#111', 15, 0, 2, 32); });
  face('ena_top', 32, 32, g => { for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) R(g, (x + y) % 2 ? '#111' : '#f4f4f4', x * 8, y * 8, 8, 8); });

  face('books', 64, 76, g => {
    R(g, '#3a2212', 0, 0, 64, 76);
    for (const y of [2, 26, 50]) { let x = 3; while (x < 60) { const w = ri(2, 5), h = ri(14, 21); R(g, ['#7a1c1c', '#1c3a7a', '#2a5a2a', '#c9a24a', '#5a2a6a', '#d8d0b8', '#8a4a1a'][ri(0, 6)], x, y + 22 - h, w, h); R(g, 'rgba(255,230,160,0.4)', x, y + 26 - h, w, 1); x += w; } R(g, '#5a361e', 0, y + 22, 64, 3); }
    R(g, '#2a160a', 0, 0, 3, 76); R(g, '#2a160a', 61, 0, 3, 76);
  });
  face('filecab', 32, 48, g => { R(g, '#8a9096', 0, 0, 32, 48); for (let y = 2; y < 46; y += 15) { R(g, '#9aa0a6', 2, y, 28, 13); R(g, '#5a6066', 12, y + 5, 8, 2); R(g, '#f4f1e8', 13, y + 2, 6, 2); } grain(g, 32, 48, 6); });
  face('rack', 32, 64, g => {
    R(g, '#16181c', 0, 0, 32, 64); R(g, '#3a3e44', 0, 0, 32, 2); R(g, '#3a3e44', 0, 0, 2, 64); R(g, '#3a3e44', 30, 0, 2, 64);
    for (let y = 4; y < 62; y += 5) { R(g, '#24282e', 3, y, 26, 4); for (let x = 5; x < 26; x += 3) R(g, ['#3fff7a', '#3fff7a', '#ffb02a', '#3a7aff'][(x + y) % 4], x, y + 1, 1, 1); }
    return [[3, 4, 26, 58]];
  });
  face('tank_top', 32, 32, g => { R(g, '#2a8ac8', 0, 0, 32, 32); grain(g, 32, 32, 18); R(g, '#3a4048', 0, 0, 32, 2); R(g, '#3a4048', 0, 30, 32, 2); });
  face('lounger', 64, 24, g => { R(g, '#f4f4f0', 0, 0, 64, 24); for (let x = 0; x < 64; x += 8) R(g, '#58b8d8', x, 0, 4, 24); });
  face('white', 16, 16, g => { R(g, '#eef0f2', 0, 0, 16, 16); grain(g, 16, 16, 4); });

  // ------------------------------------------------------------ декали на стенах
  // Рисуются поверх текстуры стены (64×96), результат ×2.
  const DEC = {
    clock(g) {
      E(g, '#2a2a2e', 32, 24, 9, 9); E(g, '#f4f4ee', 32, 24, 7.5, 7.5);
      for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; R(g, '#333', 32 + Math.cos(a) * 6 - 0.5, 24 + Math.sin(a) * 6 - 0.5, 1, 1); }
      g.strokeStyle = '#111'; g.lineWidth = 1; g.beginPath(); g.moveTo(32, 24); g.lineTo(32, 19); g.moveTo(32, 24); g.lineTo(36, 26); g.stroke();
      R(g, '#d02a2a', 32, 24, 1, 6);
    },
    extinguisher(g) {
      R(g, '#b81a1a', 22, 50, 20, 36); R(g, '#e8e8e8', 24, 52, 16, 22); R(g, '#d02a2a', 28, 55, 8, 17); R(g, '#222', 30, 53, 4, 3);
      R(g, '#ffffff', 23, 76, 18, 7); R(g, '#d02a2a', 25, 78, 14, 3);
    },
    poster_quiet(g) {
      R(g, '#f4f1e8', 18, 22, 28, 34); R(g, '#2b5ea8', 18, 22, 28, 8); R(g, '#fff', 21, 25, 22, 2);
      E(g, '#2a2a2e', 32, 41, 6, 6); R(g, '#f4f1e8', 31, 36, 2, 10); R(g, '#d02a2a', 22, 51, 20, 2);
    },
    poster_touch(g) {
      R(g, '#f2c81e', 18, 22, 28, 34); R(g, '#1a1a1a', 20, 24, 24, 30); R(g, '#f2c81e', 21, 25, 22, 28);
      E(g, '#d02a2a', 32, 39, 8, 8); E(g, '#f2c81e', 32, 39, 6, 6); R(g, '#d02a2a', 26, 38, 12, 2);
      R(g, '#1a1a1a', 28, 33, 3, 9); R(g, '#1a1a1a', 31, 34, 2, 8); R(g, '#1a1a1a', 33, 35, 2, 7);
    },
    mirror(g) {
      R(g, '#9aa2a8', 8, 10, 48, 34);
      const gr = g.createLinearGradient(8, 10, 56, 44); gr.addColorStop(0, '#dfeaf0'); gr.addColorStop(0.5, '#b8c8d2'); gr.addColorStop(1, '#e8f0f4');
      g.fillStyle = gr; g.fillRect(10, 12, 44, 30);
      g.fillStyle = 'rgba(255,255,255,0.6)'; g.beginPath(); g.moveTo(14, 40); g.lineTo(24, 14); g.lineTo(28, 14); g.lineTo(18, 40); g.fill();
    },
    dryer(g) { R(g, '#e8e8e8', 22, 34, 20, 16); R(g, '#c0c0c0', 22, 47, 20, 3); R(g, '#3a3a40', 28, 50, 8, 3); R(g, '#3a7ad0', 38, 37, 2, 2); },
    paper(g) { R(g, '#d6d6d6', 24, 30, 16, 20); R(g, '#a8a8a8', 24, 46, 16, 4); R(g, '#ffffff', 28, 49, 8, 5); },
    panel(g) { R(g, '#9aa0a6', 18, 20, 28, 40); R(g, '#b0b6bc', 20, 22, 24, 36); R(g, '#f2c81e', 28, 26, 8, 8); R(g, '#111', 31, 27, 2, 4); R(g, '#111', 30, 30, 2, 3); R(g, '#666', 40, 38, 2, 6); },
    queue(g) {
      R(g, '#111', 10, 14, 44, 20); R(g, '#2a2a2e', 11, 15, 42, 18);
      const D = { '0': [1, 1, 1, 0, 1, 1, 1], '7': [1, 0, 1, 0, 0, 1, 0] };
      const seg = (x, d) => {
        const s = D[d], c = '#ff3a2a';
        if (s[0]) R(g, c, x + 1, 17, 6, 2); if (s[1]) R(g, c, x, 18, 2, 6); if (s[2]) R(g, c, x + 6, 18, 2, 6);
        if (s[3]) R(g, c, x + 1, 23, 6, 2); if (s[4]) R(g, c, x, 24, 2, 6); if (s[5]) R(g, c, x + 6, 24, 2, 6); if (s[6]) R(g, c, x + 1, 29, 6, 2);
      };
      seg(36, '0'); seg(45, '7');
      R(g, '#ff3a2a', 14, 20, 16, 2); R(g, '#ff3a2a', 14, 25, 12, 2);
      return [[11, 15, 42, 18]];
    },
    tvwall(g) {
      R(g, '#2a2a30', 6, 12, 52, 38); R(g, '#0a0a10', 9, 15, 46, 32);
      g.fillStyle = '#f2c230'; g.beginPath(); g.moveTo(12, 44); g.lineTo(32, 18); g.lineTo(52, 44); g.fill();
      E(g, '#2f5bd7', 32, 34, 8, 8); E(g, '#ffffff', 32, 34, 3, 3); E(g, '#111', 32, 34, 1.5, 1.5);
      R(g, '#3a3a40', 28, 50, 8, 4);
      return [[9, 15, 46, 32]];
    },
    exitsign(g) { R(g, '#1d7a3a', 18, 4, 28, 10); R(g, '#9ff0b0', 20, 6, 24, 6); R(g, '#1d7a3a', 23, 7, 3, 4); R(g, '#1d7a3a', 29, 7, 3, 4); R(g, '#1d7a3a', 35, 7, 3, 4); return [[18, 4, 28, 10]]; },
    vent(g) { R(g, '#b8b4aa', 20, 6, 24, 12); for (let y = 8; y < 17; y += 2) R(g, '#6a6660', 21, y, 22, 1); },
    elevpanel(g) {
      R(g, '#8a9096', 22, 30, 20, 40); R(g, '#c8ced4', 23, 31, 18, 38);
      R(g, '#111', 26, 34, 12, 6); R(g, '#ff7a2a', 28, 35, 2, 4); R(g, '#ff7a2a', 33, 35, 3, 1); R(g, '#ff7a2a', 35, 35, 1, 4);
      for (const [y, n] of [[46, 2], [56, 1]]) { E(g, '#e8e4d8', 32, y, 4, 4); E(g, '#ffd34a', 32, y, 2.5, 2.5); R(g, '#333', 31, y - 1, 2, 2); }
      return [[26, 34, 12, 6], [29, 43, 6, 6], [29, 53, 6, 6]];
    },
    fakedoor(g) {
      R(g, '#8e949a', 14, 18, 36, 70); R(g, '#b8a888', 17, 21, 30, 67); R(g, '#a89878', 20, 26, 24, 26); R(g, '#a89878', 20, 58, 24, 26);
      R(g, '#c9a24a', 41, 56, 4, 3); R(g, '#2a2a2a', 17, 86, 30, 2);
    },
    construction(g) {
      for (let x = 10; x < 54; x += 6) { g.fillStyle = (x / 6) % 2 ? '#111' : '#f2c81e'; g.beginPath(); g.moveTo(x, 20); g.lineTo(x + 6, 20); g.lineTo(x + 2, 26); g.lineTo(x - 4, 26); g.fill(); }
      R(g, '#f2c81e', 10, 26, 44, 16); R(g, '#111', 12, 28, 40, 1); R(g, '#111', 12, 33, 30, 2); R(g, '#111', 12, 37, 36, 2);
      R(g, '#ff7a2a', 46, 30, 5, 5); R(g, '#3a7ad0', 46, 35, 5, 6);
    },
    hitcounter(g) {
      R(g, '#9aa0a6', 12, 30, 40, 14); R(g, '#000', 14, 32, 36, 10);
      for (let i = 0; i < 6; i++) { R(g, '#3fff7a', 16 + i * 6, 34, 4, 1); R(g, '#3fff7a', 16 + i * 6, 34, 1, 6); R(g, '#3fff7a', 19 + i * 6, 34, 1, 6); R(g, '#3fff7a', 16 + i * 6, 39, 4, 1); }
      return [[14, 32, 36, 10]];
    },
    webbanner(g) {
      R(g, '#000080', 4, 14, 56, 14); R(g, '#ffff00', 6, 16, 52, 1); R(g, '#ffff00', 6, 25, 52, 1);
      for (let x = 8; x < 56; x += 5) R(g, ['#ff5ab4', '#3fffb0', '#ffffff', '#ffd34a'][(x / 5 | 0) % 4], x, 19, 3, 4);
      return [[4, 14, 56, 14]];
    },
    urinal(g) { R(g, '#f2f6f8', 24, 44, 16, 26); R(g, '#d4dde2', 26, 48, 12, 18); R(g, '#a8b2b8', 30, 38, 4, 6); },
  };
  function decalFace(baseWall, kind) {
    const [c, g] = cv(64, 96);
    g.drawImage(baseWall.canvas, 0, 0);
    const emit = DEC[kind] ? DEC[kind](g) : null;
    const [c2, g2] = cv(128, 192);
    g2.drawImage(c, 0, 0, 128, 192);
    return toTex(c2, emit && emit.map(r => r.map(v => v * 2)));
  }

  // ------------------------------------------------------------ небо (в духе ENA: кислотный градиент и пиксельные облака)
  const SKY_W = 512, SKY_H = 160;
  let sky;
  {
    const [c, g] = cv(SKY_W, SKY_H);
    const gr = g.createLinearGradient(0, 0, 0, SKY_H);
    gr.addColorStop(0, '#1b2bd8'); gr.addColorStop(0.45, '#3a8af0'); gr.addColorStop(0.8, '#7fe0f0'); gr.addColorStop(1, '#f7f0a0');
    g.fillStyle = gr; g.fillRect(0, 0, SKY_W, SKY_H);
    for (let k = 0; k < 14; k++) {
      const cx = ri(0, SKY_W), cy = ri(50, 140), n = ri(3, 6);
      for (let j = 0; j < n; j++) for (const dx of [0, -SKY_W, SKY_W]) {
        const x = cx + dx + j * ri(8, 14), y = cy + ri(-4, 4), r = ri(7, 13);
        E(g, '#ffffff', x, y, r, r * 0.65); E(g, '#dfe8ff', x + 2, y + 3, r * 0.8, r * 0.4);
      }
    }
    // плоские «горы»-силуэты у горизонта
    g.fillStyle = '#e04aa8';
    for (let x = 0; x < SKY_W; x += 64) { g.beginPath(); g.moveTo(x, SKY_H); g.lineTo(x + 32, SKY_H - ri(10, 22)); g.lineTo(x + 64, SKY_H); g.fill(); }
    sky = toTex(c);
  }

  let skyNight;
  {
    const [c, g] = cv(SKY_W, SKY_H);
    const gr = g.createLinearGradient(0, 0, 0, SKY_H);
    gr.addColorStop(0, '#05061a'); gr.addColorStop(0.6, '#1a1450'); gr.addColorStop(1, '#5a2a7a');
    g.fillStyle = gr; g.fillRect(0, 0, SKY_W, SKY_H);
    for (let k = 0; k < 400; k++) R(g, rnd() < 0.15 ? '#ffe98a' : rnd() < 0.3 ? '#9fd0ff' : '#ffffff', ri(0, SKY_W - 1), ri(0, SKY_H - 20), 1, 1);
    for (let k = 0; k < 12; k++) { const x = ri(0, SKY_W), y = ri(5, 100); R(g, '#fff', x, y - 2, 1, 5); R(g, '#fff', x - 2, y, 5, 1); }
    E(g, '#fff6d8', 120, 40, 14, 14); E(g, '#05061a', 126, 36, 12, 12);
    E(g, '#fff6d8', 120 + SKY_W / 2, 40, 14, 14); E(g, '#05061a', 126 + SKY_W / 2, 36, 12, 12);
    g.fillStyle = '#0a0a24'; for (let x = 0; x < SKY_W; x += 48) { g.beginPath(); g.moveTo(x, SKY_H); g.lineTo(x + 24, SKY_H - ri(8, 18)); g.lineTo(x + 48, SKY_H); g.fill(); }
    skyNight = toTex(c);
  }

  // ------------------------------------------------------------ парящие фигуры (вращение по кадрам)
  const shapes = {};
  const N = 12;
  function poly(g, pts, col) { g.fillStyle = col; g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (const p of pts.slice(1)) g.lineTo(p[0], p[1]); g.closePath(); g.fill(); }
  function project(v, a, tilt, s, cx, cy) {
    const x = v[0] * Math.cos(a) - v[2] * Math.sin(a), z = v[0] * Math.sin(a) + v[2] * Math.cos(a);
    const y = v[1] * Math.cos(tilt) - z * Math.sin(tilt), z2 = v[1] * Math.sin(tilt) + z * Math.cos(tilt);
    return [cx + x * s, cy - y * s, z2];
  }
  function solid(name, verts, faces, cols, period) {
    const arr = [];
    for (let f = 0; f < N; f++) {
      const [c, g] = cv(48, 48);
      const a = f / N * period;
      const P = verts.map(v => project(v, a, 0.45, 15, 24, 24));
      const fs = faces.map((fc, i) => ({ fc, i, z: fc.reduce((s, k) => s + P[k][2], 0) / fc.length }));
      fs.sort((p, q) => p.z - q.z);
      for (const o of fs) {
        // освещённость по нормали (грубо): ближние грани светлее
        poly(g, o.fc.map(k => P[k]), cols[o.i % cols.length]);
      }
      g.strokeStyle = '#111'; g.lineWidth = 1;
      for (const o of fs.slice(-3)) { g.beginPath(); const p = o.fc.map(k => P[k]); g.moveTo(p[0][0], p[0][1]); for (const q of p.slice(1)) g.lineTo(q[0], q[1]); g.closePath(); g.stroke(); }
      arr.push(toTex(c, null, true));
    }
    shapes[name] = arr;
  }
  solid('fcube', [[-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1], [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]],
    [[0, 1, 2, 3], [4, 5, 6, 7], [0, 1, 5, 4], [3, 2, 6, 7], [0, 3, 7, 4], [1, 2, 6, 5]],
    ['#2f5bd7', '#2f5bd7', '#f2c230', '#ff5ab4', '#3fd0c0', '#3fd0c0'], Math.PI / 2);
  solid('fpyr', [[-1, -0.9, -1], [1, -0.9, -1], [1, -0.9, 1], [-1, -0.9, 1], [0, 1.2, 0]],
    [[0, 1, 2, 3], [0, 1, 4], [1, 2, 4], [2, 3, 4], [3, 0, 4]],
    ['#111', '#f2c230', '#e8a020', '#f2c230', '#e8a020'], Math.PI / 2);
  solid('focta', [[1.2, 0, 0], [-1.2, 0, 0], [0, 1.3, 0], [0, -1.3, 0], [0, 0, 1.2], [0, 0, -1.2]],
    [[0, 2, 4], [4, 2, 1], [1, 2, 5], [5, 2, 0], [0, 3, 4], [4, 3, 1], [1, 3, 5], [5, 3, 0]],
    ['#ff5ab4', '#c03a90', '#ff5ab4', '#c03a90', '#3fd0c0', '#2aa094', '#3fd0c0', '#2aa094'], Math.PI / 2);
  {
    const arr = [];
    for (let f = 0; f < N; f++) {
      const [c, g] = cv(48, 48);
      E(g, '#f4f4f4', 24, 24, 15, 15);
      const a = f / N * Math.PI;
      for (let k = 0; k < 3; k++) {
        const ph = a + k * Math.PI / 3, w = Math.abs(Math.cos(ph)) * 15, x = 24 + Math.sin(ph) * 15 * 0.0;
        g.fillStyle = ['#2f5bd7', '#f2c230', '#ff5ab4'][k];
        g.save(); g.beginPath(); g.ellipse(24, 24, 15, 15, 0, 0, 7); g.clip();
        g.beginPath(); g.ellipse(24 + Math.sin(ph) * 15, 24, Math.max(1, w * 0.35), 15, 0, 0, 7); g.fill(); g.restore();
      }
      g.strokeStyle = '#111'; g.beginPath(); g.ellipse(24, 24, 15, 15, 0, 0, 7); g.stroke();
      R(g, 'rgba(255,255,255,0.7)', 15, 14, 4, 3);
      arr.push(toTex(c, null, true));
    }
    shapes.fball = arr;
  }

  // мелкие спрайты для верхушек коробок
  const extra = {};
  {
    const [c, g] = cv(64, 14);
    const fl = ['#e8486b', '#f7d046', '#ffffff', '#b06ae8', '#ff8a3d', '#ff6fae'];
    for (let k = 0; k < 60; k++) { const x = ri(1, 62), h = ri(3, 12); R(g, '#3e8a3a', x, 14 - h, 1, h); R(g, fl[ri(0, 5)], x - 1, 13 - h, 3, 2); }
    for (let k = 0; k < 40; k++) E(g, rnd() < 0.5 ? '#3c8a3a' : '#2f6b2f', ri(2, 62), ri(9, 13), 2.5, 1.5);
    extra.flowers = [toTex(c, null, true)];
  }
  {
    const [c, g] = cv(40, 16);
    E(g, '#6c95c9', 18, 9, 15, 5.5); E(g, '#f2f2f2', 18, 11, 12, 2.5);
    g.fillStyle = '#6c95c9'; g.beginPath(); g.moveTo(16, 4); g.lineTo(21, -2); g.lineTo(23, 4); g.fill();
    g.beginPath(); g.moveTo(31, 9); g.lineTo(39, 3); g.lineTo(38, 14); g.fill();
    R(g, '#111', 8, 7, 2, 2); R(g, '#c94a5c', 4, 11, 4, 1);
    extra.shark = [toTex(c, null, true)];
  }
  function spout(w, h, frames, big) {
    const arr = [];
    for (let f = 0; f < frames; f++) {
      const [c, g] = cv(w, h);
      const cx = w / 2;
      if (big) {
        R(g, '#c7b896', cx - 5, h - 46, 10, 46); R(g, '#a8987a', cx + 3, h - 46, 2, 46);
        E(g, '#c7b896', cx, h - 46, 20, 5); E(g, '#3d86b8', cx, h - 47, 16, 3);
        R(g, '#c7b896', cx - 3, h - 72, 6, 26); E(g, '#d8cbad', cx, h - 72, 8, 3);
      } else {
        R(g, '#c7b896', cx - 3, h - 22, 6, 22); E(g, '#d6c9ab', cx, h - 22, 7, 2);
      }
      g.fillStyle = 'rgba(190,230,255,0.95)';
      const jets = big ? [[h - 80, h - 47, 5], [h - 47, h - 2, 9]] : [[h - 30, h - 2, 5]];
      for (const [top, base, sp] of jets) for (let k = -2; k <= 2; k++) for (let t = 0; t <= 1; t += 0.035) {
        const x = cx + k * sp * t, y = top + (base - top) * t * t, wob = ((f + Math.floor(t * 10)) % 2);
        g.fillRect(Math.round(x + wob), Math.round(y), 1, 2);
      }
      for (let k = 0; k < 10; k++) { g.fillStyle = (k + f) % 3 ? '#e8f8ff' : '#9fd8f5'; g.fillRect(Math.round(cx + (rnd() - 0.5) * (big ? 44 : 24)), h - 3 + ri(0, 2), 1, 1); }
      arr.push(toTex(c, null, true));
    }
    return arr;
  }
  extra.spout = spout(64, 92, 4, true);
  extra.spoutsmall = spout(32, 34, 4, false);

  // ------------------------------------------------------------ сборка пропов
  // Локальные координаты: u — вправо, v — к «лицу» (лицо смотрит в facing), z — вверх. Размеры в клетках (1 = 2 м).
  const B = (u0, u1, v0, v1, z0, z1, front, side, top, back, opt) => Object.assign({ u0, u1, v0, v1, z0, z1, front, side: side || front, top: top || side || front, back: back || side || front }, opt || {});
  function desk(w = 0.75, d = 0.34) {
    const h = 0.38, hw = w / 2, hd = d / 2;
    return [
      B(-hw, hw, -hd, hd, h - 0.03, h, 'wood_side', 'wood_side', 'desk_top'),
      B(-hw, -hw + 0.14, -hd, hd - 0.02, 0, h - 0.03, 'wood_side'),
      B(hw - 0.14, hw, -hd, hd - 0.02, 0, h - 0.03, 'wood_side'),
      B(-hw + 0.14, hw - 0.14, -hd, -hd + 0.03, 0.12, h - 0.03, 'wood_side'),
    ];
  }
  function crt(du = 0, dv = -0.03, z = 0.38, flip = false) {
    return [
      B(du - 0.11, du + 0.11, dv - 0.1, dv + 0.08, z, z + 0.19, 'crt_front', 'crt_side', 'crt_side', 'crt_back', { flip }),
      B(du - 0.1, du + 0.1, flip ? dv - 0.2 : dv + 0.1, flip ? dv - 0.12 : dv + 0.18, z, z + 0.012, 'keyboard', 'crt_side', 'keyboard', null, { flip }),
    ];
  }
  const PROPS = {
    vending: { boxes: [B(-0.23, 0.23, -0.2, 0.2, 0, 0.95, 'vend_front', 'vend_side', 'darkmetal', 'vend_side')] },
    snack: { boxes: [B(-0.23, 0.23, -0.2, 0.2, 0, 0.95, 'snack_front', 'vend_side', 'darkmetal', 'vend_side')] },
    desk: { boxes: desk() },
    deskpc: { boxes: desk().concat(crt()) },
    reception: {
      boxes: [B(-0.8, 0.8, -0.18, 0.18, 0, 0.55, 'counter_front', 'wood_side', 'counter_top', 'wood_side')]
        .concat(crt(-0.35, -0.02, 0.55, true)).concat(crt(0.35, -0.02, 0.55, true)),
    },
    bench: { boxes: [B(-0.38, 0.38, -0.11, 0.11, 0.16, 0.22, 'leather_side', 'leather_side', 'bench_top'), B(-0.34, -0.3, -0.09, 0.09, 0, 0.16, 'metal'), B(0.3, 0.34, -0.09, 0.09, 0, 0.16, 'metal')] },
    chairs: {
      boxes: [B(-0.5, 0.5, -0.1, 0.12, 0.16, 0.21, 'plastic_side', 'plastic_side', 'plastic_top'), B(-0.5, 0.5, -0.13, -0.1, 0.21, 0.44, 'chairback', 'plastic_side', 'plastic_side', 'plastic_side'),
        B(-0.46, -0.43, -0.06, 0.06, 0, 0.16, 'metal'), B(0.43, 0.46, -0.06, 0.06, 0, 0.16, 'metal')],
    },
    planter: { boxes: [B(-0.45, 0.45, -0.16, 0.16, 0, 0.22, 'planter_side', 'planter_side', 'soil')], sprites: [{ t: 'flowers', u: 0, v: 0, z: 0.22, h: 0.12, w: 0.85 }] },
    pedestal_bust: { boxes: [B(-0.13, 0.13, -0.13, 0.13, 0, 0.48, 'pedestal', 'pedestal', 'marble_top')], sprites: [{ t: 'bust', u: 0, v: 0, z: 0.48, h: 0.36 }] },
    pedestal_vase: { boxes: [B(-0.13, 0.13, -0.13, 0.13, 0, 0.48, 'pedestal', 'pedestal', 'marble_top')], sprites: [{ t: 'vase', u: 0, v: 0, z: 0.48, h: 0.3 }] },
    toilet: { boxes: [B(-0.09, 0.09, -0.14, -0.06, 0.2, 0.42, 'porcelain'), B(-0.08, 0.08, -0.06, 0.13, 0, 0.2, 'toilet_front', 'porcelain', 'toilet_top')] },
    sinks: { boxes: [B(-0.5, 0.5, -0.14, 0.14, 0, 0.42, 'sink_front', 'sink_front', 'sink_top')] },
    lockers: { boxes: [B(-0.45, 0.45, -0.13, 0.13, 0, 0.9, 'locker_front', 'metal', 'metal', 'metal')] },
    shelf: { boxes: [B(-0.3, 0.3, -0.1, 0.1, 0, 0.95, 'shelf_front', 'metal', 'metal', 'metal')] },
    cardboard: { boxes: [B(-0.15, 0.15, -0.15, 0.15, 0, 0.24, 'cardboard', 'cardboard', 'cardboard_top'), B(-0.11, 0.1, -0.12, 0.08, 0.24, 0.42, 'cardboard', 'cardboard', 'cardboard_top')] },
    tvstand: { boxes: [B(-0.25, 0.25, -0.13, 0.13, 0, 0.24, 'wood_side', 'wood_side', 'desk_top'), B(-0.2, 0.2, -0.1, 0.1, 0.24, 0.56, 'tv_front', 'crt_side', 'crt_side', 'crt_back')] },
    fountain: { boxes: [B(-1.1, 1.1, -1.1, 1.1, 0, 0.16, 'marble_side', 'marble_side', 'water')], sprites: [{ t: 'spout', u: 0, v: 0, z: 0.1, h: 1.35 }] },
    smallfountain: { boxes: [B(-0.45, 0.45, -0.45, 0.45, 0, 0.13, 'marble_side', 'marble_side', 'water')], sprites: [{ t: 'spoutsmall', u: 0, v: 0, z: 0.08, h: 0.5 }] },
    bookshelf: { boxes: [B(-0.45, 0.45, -0.11, 0.11, 0, 1.0, 'books', 'wood_side', 'wood_side', 'wood_side')] },
    filecab: { boxes: [B(-0.15, 0.15, -0.17, 0.17, 0, 0.62, 'filecab', 'metal', 'metal', 'metal')] },
    rack: { boxes: [B(-0.2, 0.2, -0.25, 0.25, 0, 1.0, 'rack', 'darkmetal', 'darkmetal', 'rack')] },
    tank: { boxes: [B(-0.8, 0.8, -0.3, 0.3, 0.0, 0.9, 'tank', 'tank', 'tank_top', 'tank')] },
    lounger: { boxes: [B(-0.12, 0.12, -0.38, 0.38, 0.08, 0.14, 'white', 'white', 'lounger'), B(-0.12, 0.12, -0.38, -0.3, 0.14, 0.34, 'lounger', 'white', 'white', 'white')] },
    enablock: { boxes: [B(-0.2, 0.2, -0.2, 0.2, 0, 0.4, 'ena_block', 'ena_block', 'ena_top')] },
  };

  F.tank = window.MuseumTex.walls.aquarium;
  window.MuseumProps = { F, PROPS, decalFace, sky, skyNight, SKY_W, SKY_H, shapes, extra };
})();
