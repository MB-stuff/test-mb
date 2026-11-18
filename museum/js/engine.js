// Рейкастер-бродилка «Музей». Стены, двери, объёмные пропы, пол/потолок/небо, спрайты, свет от ламп.
(function () {
  'use strict';
  const M = window.MUSEUM_MAP, T = window.MuseumTex, PR = window.MuseumProps, AU = window.MuseumAudio, ART = window.MUSEUM_ART;
  const MW = M.w, MH = M.h;
  const WALL_H = 1.5, CAM_H = 0.8, TAN_V = 0.47;
  const LMR = 4, LW = MW * LMR, LH = MH * LMR;

  // ---------------------------------------------------------------- карта
  const zoneChars = Object.keys(M.zones);
  const zones = zoneChars.map(c => Object.assign({ c }, M.zones[c]));
  const zoneOf = {}; zoneChars.forEach((c, i) => zoneOf[c] = i);
  const cellType = new Uint8Array(MW * MH);     // 0 пол, 1 стена, 2 дверь
  const zoneIdx = new Uint8Array(MW * MH);
  const ceilType = new Uint8Array(MW * MH);     // 0 плитка, 1 лампа, 2 пятно, 3 небо
  const at = (x, y) => (x < 0 || y < 0 || x >= MW || y >= MH) ? '#' : M.grid[y][x];
  for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
    const ch = at(x, y), i = y * MW + x;
    if (ch === '#') cellType[i] = 1;
    else if (ch === 'D' || ch === 'X') cellType[i] = 2;
    else { cellType[i] = 0; zoneIdx[i] = zoneOf[ch]; }
  }
  // двери
  const doors = new Map();
  for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
    const ch = at(x, y); if (ch !== 'D' && ch !== 'X') continue;
    const i = y * MW + x;
    const horizWalls = at(x - 1, y) === '#' && at(x + 1, y) === '#';
    const axis = horizWalls ? 1 : 0;
    const nb = axis ? [at(x, y - 1), at(x, y + 1)] : [at(x - 1, y), at(x + 1, y)];
    const zc = nb.find(c => c !== '#' && c !== 'x' && c !== 'D' && c !== 'X') || nb[0];
    zoneIdx[i] = zoneOf[zc] ?? 0;
    const secret = ch === 'X';
    let off = 0.5;
    if (secret) off = (nb[1] === zc) ? 0.97 : 0.03;
    let tex = T.walls.door;
    if (secret) tex = T.walls[M.zones[zc].wall];
    else if (nb.includes('w')) tex = T.walls.door_wc;
    else if (nb.includes('j')) tex = T.walls.door_staff;
    doors.set(i, { x, y, i, axis, off, open: 0, target: 0, timer: 0, secret, tex });
  }
  // потолок и лампы
  const lamps = [];
  for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
    const i = y * MW + x; if (cellType[i] === 1) continue;
    const z = zones[zoneIdx[i]];
    if (z.sky) { ceilType[i] = 3; continue; }
    if ('wjx'.includes(z.c)) { ceilType[i] = Math.random() < 0.35 ? 2 : 0; continue; }
    if (x % 3 === 1 && y % 3 === 1) { ceilType[i] = 1; lamps.push({ x: x + 0.5, y: y + 0.5, flick: false, I: 0.42 }); }
  }
  for (const [x, y, fl] of M.extraLamps || []) {
    ceilType[y * MW + x] = 1; lamps.push({ x: x + 0.5, y: y + 0.5, flick: fl, I: 0.55 });
  }
  const AMB = { '.': 0.42, r: 0.78, e: 0.74, a: 0.4, b: 0.4, c: 0.38, k: 0.37, l: 0.37, n: 0.35, w: 0.4, j: 0.26, x: 0.18 };
  const lmS = new Float32Array(LW * LH), lmF = new Float32Array(LW * LH);
  function los(x0, y0, x1, y1) {
    const d = Math.hypot(x1 - x0, y1 - y0), n = Math.ceil(d / 0.2);
    for (let k = 1; k < n; k++) {
      const x = x0 + (x1 - x0) * k / n, y = y0 + (y1 - y0) * k / n;
      if (cellType[(y | 0) * MW + (x | 0)] === 1) return false;
    }
    return true;
  }
  for (let ly = 0; ly < LH; ly++) for (let lx = 0; lx < LW; lx++) {
    const wx = (lx + 0.5) / LMR, wy = (ly + 0.5) / LMR, ci = (wy | 0) * MW + (wx | 0);
    if (cellType[ci] === 1) continue;
    let s = AMB[zones[zoneIdx[ci]].c] ?? 0.4, f = 0;
    for (const L of lamps) {
      const dx = L.x - wx, dy = L.y - wy, d2 = dx * dx + dy * dy;
      if (d2 > 30) continue;
      if (!los(wx, wy, L.x, L.y)) continue;
      const v = L.I / (1 + d2 * 0.55);
      if (L.flick) f += v; else s += v;
    }
    lmS[ly * LW + lx] = Math.min(1.1, s); lmF[ly * LW + lx] = f;
  }

  // ---------------------------------------------------------------- грани стен
  const faceTex = new Array(MW * MH * 4).fill(null);  // 0 N,1 S,2 E,3 W
  const facePaint = new Map();
  const DIRS = [[0, -1], [0, 1], [1, 0], [-1, 0]];
  const SIDE = { N: 0, S: 1, E: 2, W: 3 };
  for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
    if (cellType[y * MW + x] !== 1) continue;
    for (let f = 0; f < 4; f++) {
      const nx = x + DIRS[f][0], ny = y + DIRS[f][1];
      if (nx < 0 || ny < 0 || nx >= MW || ny >= MH) continue;
      const ni = ny * MW + nx;
      if (cellType[ni] === 1) continue;
      let tex;
      if (cellType[ni] === 2) { const d = doors.get(ni); tex = d.secret ? d.tex : T.walls.jamb; }
      else tex = T.walls[zones[zoneIdx[ni]].wall];
      faceTex[(y * MW + x) * 4 + f] = tex;
    }
  }
  const frontZone = (x, y, side) => { const f = SIDE[side]; return zones[zoneIdx[(y + DIRS[f][1]) * MW + x + DIRS[f][0]]]; };
  for (const e of M.entrance || []) faceTex[(e.y * MW + e.x) * 4 + SIDE[e.side]] = T.walls.entrance;
  for (const d of M.decals || []) {
    const z = frontZone(d.x, d.y, d.side);
    faceTex[(d.y * MW + d.x) * 4 + SIDE[d.side]] = PR.decalFace(T.walls[z.wall], d.kind);
  }
  const FRAMES = { a: 'wood', b: 'wood', c: 'wood', k: 'gold', l: 'gold', n: 'gold', '.': 'gold', w: 'white', j: 'black', x: 'black', e: 'black', r: 'gold' };
  function buildPaintings(images) {
    for (const p of M.paintings) {
      const z = frontZone(p.x, p.y, p.side);
      const info = ART[p.id] || {};
      const key = (p.y * MW + p.x) * 4 + SIDE[p.side];
      faceTex[key] = T.paintingFace(T.walls[z.wall], images[p.id], { hero: info.hero, meme: info.meme, frame: FRAMES[z.c] });
      facePaint.set(key, p.id);
    }
  }

  // ---------------------------------------------------------------- спрайты (билборды)
  const SPR = {
    column: { h: 1.5, block: 0.22 }, plant: { h: 0.72, block: 0.25 }, cooler: { h: 0.68, block: 0.2 },
    sign: { h: 0.85, block: 0.2 }, trash: { h: 0.27, block: 0.13 }, donation: { h: 0.6, block: 0.2 },
    wetfloor: { h: 0.3, block: 0.15 }, bucket: { h: 0.66, block: 0.22 }, chair: { h: 0.5, block: 0.2 },
    rope: { h: 0.48, block: 0 }, shark: { h: 0.14, block: 0 },
  };
  const sprites = [];
  function addSprite(t, x, y, o = {}) {
    const fr = o.frames || T.sprites[t] || PR.extra[t] || PR.shapes[t];
    if (!fr) { console.warn('нет спрайта', t); return; }
    const d = SPR[t] || {};
    const h = o.h ?? d.h ?? 0.5;
    sprites.push({
      x, y, t, frames: fr, h, w: o.w ?? h * fr[0].w / fr[0].h * (d.wm || 1), z: o.z ?? 0,
      block: o.block ?? d.block ?? 0, float: o.float || 0, phase: o.phase || 0, bright: !!o.bright, speed: o.speed || 7, dist: 0,
    });
  }
  for (const s of M.sprites) addSprite(s.t, s.x, s.y, s);
  for (const s of M.floaters || []) addSprite(s.t, s.x, s.y, { z: s.z, h: s.h, float: 0.07, phase: s.x * 1.7 + s.y, bright: true, speed: 5 + (s.x % 3) });

  // ---------------------------------------------------------------- объёмные пропы
  const boxes = [];      // {x0,y0,x1,y1,z0,z1,tex:[N,S,E,W],top,tf,prop}
  const usables = [];    // пропы, с которыми можно взаимодействовать
  const FD = { N: [0, -1], S: [0, 1], E: [1, 0], W: [-1, 0] };
  const OPP = { N: 'S', S: 'N', E: 'W', W: 'E' };
  function toWorld(cx, cy, f, u, v) {
    if (f === 'S') return [cx + u, cy + v];
    if (f === 'N') return [cx - u, cy - v];
    if (f === 'E') return [cx + v, cy - u];
    return [cx - v, cy + u];
  }
  function addProp(p) {
    const def = PR.PROPS[p.t];
    if (!def) { console.warn('нет пропа', p.t); return; }
    const f = p.f || 'S';
    const prop = { t: p.t, x: p.x, y: p.y, f, boxes: [] };
    for (const b of def.boxes) {
      const [ax, ay] = toWorld(p.x, p.y, f, b.u0, b.v0), [bx, by] = toWorld(p.x, p.y, f, b.u1, b.v1);
      const ff = b.flip ? OPP[f] : f;
      const tex = [0, 0, 0, 0];
      for (const s of ['N', 'S', 'E', 'W']) {
        const name = s === ff ? b.front : s === OPP[ff] ? b.back : b.side;
        tex[SIDE[s]] = PR.F[name];
      }
      const box = { x0: Math.min(ax, bx), x1: Math.max(ax, bx), y0: Math.min(ay, by), y1: Math.max(ay, by), z0: b.z0, z1: b.z1, tex, top: PR.F[b.top], tf: ff, prop };
      boxes.push(box); prop.boxes.push(box);
    }
    for (const s of def.sprites || []) {
      const [sx, sy] = toWorld(p.x, p.y, f, s.u, s.v);
      addSprite(s.t, sx, sy, { z: s.z, h: s.h, w: s.w, block: 0 });
    }
    if (USE[p.t]) usables.push(prop);
  }
  for (const b of M.boxes || []) {
    const box = { x0: b.x0, x1: b.x1, y0: b.y0, y1: b.y1, z0: b.z0, z1: b.z1, tex: [0, 1, 2, 3].map(() => PR.F[b.tex]), top: PR.F[b.top || b.tex], tf: 'S', prop: null };
    boxes.push(box);
  }
  const USE = {
    vending: { label: 'купить газировку', act: () => { AU.clunk(); toast(pick(['Выпало «Байкал». Холодный.', 'Автомат съел монетку и задумался.', 'Выпала газировка «Дюшес». Вкус детства.', 'Банка застряла. Классика.'])); } },
    snack: { label: 'купить снэк', act: () => { AU.clunk(); toast(pick(['Пачка чипсов «Со вкусом ожидания».', 'Шоколадка повисла на спирали. Не судьба.', 'Сухарики. Хрустим тихо, это музей.'])); } },
    deskpc: { label: 'посмотреть в монитор', act: () => { AU.blip(true); toast(pick(['На экране: «Пасьянс». Счёт 4 120.', 'Открыт файл «смета_v7_ФИНАЛ_точно.xls».', '«Ваш сеанс истёк. Нажмите любую клавишу».'])); } },
    reception: { label: 'позвонить в звонок', act: () => { AU.bell(); toast('Динь! Никто не вышел. Администратор на обеде.'); } },
    toilet: { label: 'смыть', act: () => { AU.flush(); toast('Шшшшш…'); } },
    sinks: { label: 'помыть руки', act: () => { AU.flush(true); toast('Руки чистые. Можно смотреть картины.'); } },
    tvstand: { label: 'переключить канал', act: () => { AU.blip(true); toast(pick(['Канал 7: прогноз погоды на вчера.', 'Канал 12: реклама реклам.', 'Канал 0: только шум. Красиво.'])); } },
    fountain: { label: 'бросить монетку', act: () => { AU.coin(); toast(pick(['Плюх. Желание загадано.', 'Монетка легла рядом с другими. Их тут много.'])); } },
    smallfountain: { label: 'бросить монетку', act: () => { AU.coin(); toast('Плюх.'); } },
    chairs: { label: 'присесть и подождать', act: () => { toast('Вы подождали. Ваш номер так и не вызвали.'); } },
    lockers: { label: 'открыть шкафчик', act: () => { AU.door(false); toast(pick(['Заперто.', 'Внутри только старая куртка и надежда.'])); } },
  };
  const pick = a => a[(Math.random() * a.length) | 0];
  for (const p of M.props || []) addProp(p);
  const fountains = [...(M.props || []).filter(p => p.t === 'fountain' || p.t === 'smallfountain').map(p => ({ x: p.x, y: p.y, t: p.t }))];

  // ---------------------------------------------------------------- состояние
  const P = { x: M.start.x, y: M.start.y, a: M.start.a, pitch: 0, bob: 0, bobAmp: 0, lastStepSign: 1 };
  const G = {
    state: 'title', time: 0, zone: -1, fog: [178, 184, 190], fogT: [178, 184, 190],
    seen: new Set(), target: null, crt: true, res: 270, sens: 1, keys: {}, flick: 1, toastT: 0,
  };
  const FOGC = { lobby: [178, 184, 190], sayaka: [168, 188, 178], kara: [188, 168, 174], service: [44, 48, 46], dream: [230, 190, 230] };
  const FOG_ZONE = { x: [70, 62, 30], r: [190, 220, 240] };
  try { const s = JSON.parse(localStorage.getItem('museum_seen') || '[]'); s.forEach(id => G.seen.add(id)); } catch (e) { }

  // ---------------------------------------------------------------- холст
  const canvas = document.getElementById('view');
  const ctx = canvas.getContext('2d', { alpha: false });
  let RW = 480, RH = 270, img, buf32, zb, zcol, projV, planeLen, skyU;
  function resize() {
    const vw = window.innerWidth, vh = window.innerHeight;
    RH = G.res;
    const aspect = Math.max(0.6, Math.min(2.4, vw / vh));
    RW = Math.round(RH * aspect) & ~1;
    canvas.width = RW; canvas.height = RH;
    img = ctx.createImageData(RW, RH);
    buf32 = new Uint32Array(img.data.buffer);
    zb = new Float32Array(RW * RH);
    zcol = new Float32Array(RW);
    skyU = new Int32Array(RW);
    projV = RH / 2 / TAN_V;
    planeLen = TAN_V * RW / RH;
    if (planeLen > 1.0) planeLen = 1.0, projV = RW / 2 / planeLen;
  }
  window.addEventListener('resize', resize);

  // ---------------------------------------------------------------- рейкаст по сетке
  const hit = { dist: 0, tex: null, u: 0, side: 0, cell: 0, face: 0, door: null, lx: 0, ly: 0 };
  function cast(px, py, rdx, rdy, maxSteps) {
    let mapX = px | 0, mapY = py | 0;
    const ddx = Math.abs(1 / rdx), ddy = Math.abs(1 / rdy);
    let stepX, stepY, sdx, sdy;
    if (rdx < 0) { stepX = -1; sdx = (px - mapX) * ddx; } else { stepX = 1; sdx = (mapX + 1 - px) * ddx; }
    if (rdy < 0) { stepY = -1; sdy = (py - mapY) * ddy; } else { stepY = 1; sdy = (mapY + 1 - py) * ddy; }
    let side = 0, tEnter = 0;
    for (let s = 0; s < maxSteps; s++) {
      if (sdx < sdy) { tEnter = sdx; sdx += ddx; mapX += stepX; side = 0; }
      else { tEnter = sdy; sdy += ddy; mapY += stepY; side = 1; }
      if (mapX < 0 || mapY < 0 || mapX >= MW || mapY >= MH) break;
      const ci = mapY * MW + mapX, ct = cellType[ci];
      if (ct === 1) {
        const face = side === 0 ? (stepX > 0 ? 3 : 2) : (stepY > 0 ? 0 : 1);
        const key = ci * 4 + face;
        let u = side === 0 ? py + tEnter * rdy : px + tEnter * rdx;
        u -= Math.floor(u);
        if ((side === 0 && rdx < 0) || (side === 1 && rdy > 0)) u = 1 - u;
        hit.dist = tEnter; hit.tex = faceTex[key] || T.walls.plaster; hit.u = u; hit.side = side; hit.cell = ci; hit.face = key; hit.door = null;
        hit.lx = px + tEnter * rdx - stepX * (side === 0 ? 0.1 : 0); hit.ly = py + tEnter * rdy - stepY * (side === 1 ? 0.1 : 0);
        return true;
      }
      if (ct === 2) {
        const d = doors.get(ci);
        const t = d.axis === 0 ? (mapX + d.off - px) / rdx : (mapY + d.off - py) / rdy;
        const tExit = Math.min(sdx, sdy);
        if (t >= tEnter && t <= tExit) {
          let c = d.axis === 0 ? py + t * rdy : px + t * rdx;
          c -= Math.floor(c);
          if (c >= d.open) {
            let u = c - d.open;
            if ((d.axis === 0 && rdx < 0) || (d.axis === 1 && rdy > 0)) u = 1 - u;
            hit.dist = t; hit.tex = d.tex; hit.u = u; hit.side = d.axis; hit.cell = ci; hit.face = -1; hit.door = d;
            hit.lx = px + t * rdx - (d.axis === 0 ? stepX * 0.1 : 0); hit.ly = py + t * rdy - (d.axis === 1 ? stepY * 0.1 : 0);
            return true;
          }
        }
      }
    }
    hit.dist = 1e9; hit.tex = null; return false;
  }
  // луч против коробки: возвращает [tEnter, tExit, грань] или null
  const bh = { t0: 0, t1: 0, face: 0 };
  function rayBox(b, px, py, rdx, rdy) {
    let tx0 = -1e9, tx1 = 1e9, ty0 = -1e9, ty1 = 1e9;
    if (rdx !== 0) { const a = (b.x0 - px) / rdx, c = (b.x1 - px) / rdx; tx0 = a < c ? a : c; tx1 = a < c ? c : a; }
    else if (px < b.x0 || px > b.x1) return false;
    if (rdy !== 0) { const a = (b.y0 - py) / rdy, c = (b.y1 - py) / rdy; ty0 = a < c ? a : c; ty1 = a < c ? c : a; }
    else if (py < b.y0 || py > b.y1) return false;
    const t0 = tx0 > ty0 ? tx0 : ty0, t1 = tx1 < ty1 ? tx1 : ty1;
    if (t1 <= 0.02 || t0 >= t1 || t0 <= 0.02) return false;
    bh.t0 = t0; bh.t1 = t1;
    bh.face = tx0 > ty0 ? (rdx > 0 ? 3 : 2) : (rdy > 0 ? 0 : 1);
    return true;
  }
  function lightAt(x, y) {
    const lx = (x * LMR) | 0, ly = (y * LMR) | 0;
    if (lx < 0 || ly < 0 || lx >= LW || ly >= LH) return 0.3;
    const i = ly * LW + lx;
    return lmS[i] + lmF[i] * G.flick;
  }

  // ---------------------------------------------------------------- рендер
  const floorTexZ = zones.map(z => T.floors[z.floor].px);
  const ceilTexs = [T.ceilings.tile.px, T.ceilings.lamp.px, T.ceilings.stain.px];
  const SKY = PR.sky.px, SKW = PR.SKY_W, SKH = PR.SKY_H;
  function fogF(d) { let f = (d - 3) / 22; f = f < 0 ? 0 : f > 1 ? 1 : f; return f * f * (3 - 2 * f) * 0.75; }

  function render() {
    const W = RW, H = RH, b = buf32, Z = zb;
    const dirX = Math.cos(P.a), dirY = Math.sin(P.a);
    const plX = -dirY * planeLen, plY = dirX * planeLen;
    const horizon = ((H >> 1) + P.pitch) | 0;
    const camZ = CAM_H + P.bob;
    const px = P.x, py = P.y;
    const fogR = G.fog[0], fogG = G.fog[1], fogB = G.fog[2];
    const fl = G.flick;
    for (let x = 0; x < W; x++) {
      const ang = P.a + Math.atan((2 * x / W - 1) * planeLen);
      let u = ((ang / (Math.PI * 2)) * SKW * 2) % SKW; if (u < 0) u += SKW;
      skyU[x] = u | 0;
    }

    // пол, потолок, небо
    for (let y = 0; y < H; y++) {
      const isFloor = y > horizon;
      const p = isFloor ? (y - horizon) : (horizon - y);
      let o = y * W;
      if (p === 0) { for (let x = 0; x < W; x++, o++) { b[o] = 0xff000000 | (fogB << 16) | (fogG << 8) | fogR; Z[o] = 1e9; } continue; }
      const rowDist = (isFloor ? camZ : (WALL_H - camZ)) * projV / p;
      const f = fogF(rowDist);
      const kf = 1 - f, ar = fogR * f, ag = fogG * f, ab = fogB * f;
      const sx = rowDist * 2 * plX / W, sy = rowDist * 2 * plY / W;
      let wx = px + rowDist * (dirX - plX), wy = py + rowDist * (dirY - plY);
      let sv = SKH - 1 - (((horizon - y) / (H * 0.85)) * SKH) | 0; if (sv < 0) sv = 0; if (sv >= SKH) sv = SKH - 1;
      const skyRow = sv * SKW;
      for (let x = 0; x < W; x++, o++, wx += sx, wy += sy) {
        const cx = wx | 0, cy = wy | 0;
        if (cx < 0 || cy < 0 || cx >= MW || cy >= MH) { b[o] = 0xff000000; Z[o] = 1e9; continue; }
        const ci = cy * MW + cx;
        const tx = ((wx - cx) * 64) & 63, ty = ((wy - cy) * 64) & 63;
        let col, k;
        const li = ((wy * LMR) | 0) * LW + ((wx * LMR) | 0);
        if (isFloor) {
          col = floorTexZ[zoneIdx[ci]][ty * 64 + tx];
          k = (lmS[li] + lmF[li] * fl) * kf;
        } else {
          const ct = ceilType[ci];
          if (ct === 3) { b[o] = SKY[skyRow + skyU[x]]; Z[o] = 1e9; continue; }
          col = ceilTexs[ct][ty * 64 + tx];
          if (ct === 1 && tx >= 16 && tx < 48 && ty >= 16 && ty < 48) k = (lmF[li] > 0.05 ? fl * 0.8 + 0.25 : 1.12) * kf;
          else k = (lmS[li] + lmF[li] * fl) * 0.78 * kf;
        }
        let r = (col & 255) * k + ar, g = ((col >> 8) & 255) * k + ag, bl = ((col >> 16) & 255) * k + ab;
        if (r > 255) r = 255; if (g > 255) g = 255; if (bl > 255) bl = 255;
        b[o] = 0xff000000 | (bl << 16) | (g << 8) | r;
        Z[o] = rowDist;
      }
    }

    // стены
    for (let x = 0; x < W; x++) {
      const cam = 2 * x / W - 1;
      const rdx = dirX + plX * cam, rdy = dirY + plY * cam;
      if (!cast(px, py, rdx, rdy, 96)) { zcol[x] = 1e9; continue; }
      const dist = hit.dist;
      zcol[x] = dist;
      const tex = hit.tex, tw = tex.w, th = tex.h, tp = tex.px, em = tex.emit;
      const top = horizon - (WALL_H - camZ) * projV / dist;
      const bot = horizon + camZ * projV / dist;
      const f = fogF(dist);
      const kf = 1 - f, ar = fogR * f, ag = fogG * f, ab = fogB * f;
      let k = tex.emissive ? 1.15 : lightAt(hit.lx, hit.ly) * (hit.side === 0 ? 1.0 : 0.88);
      k *= kf;
      const ke = 1.1 * kf;
      const tx = Math.min(tw - 1, (hit.u * tw) | 0);
      let y0 = Math.ceil(top), y1 = Math.ceil(bot);
      if (y0 < 0) y0 = 0; if (y1 > H) y1 = H;
      const vstep = th / (bot - top);
      let v = (y0 - top) * vstep;
      for (let y = y0; y < y1; y++, v += vstep) {
        let ty = v | 0; if (ty >= th) ty = th - 1;
        const ti = ty * tw + tx, col = tp[ti];
        const kk = em && em[ti] ? ke : k;
        let r = (col & 255) * kk + ar, g = ((col >> 8) & 255) * kk + ag, bl = ((col >> 16) & 255) * kk + ab;
        if (r > 255) r = 255; if (g > 255) g = 255; if (bl > 255) bl = 255;
        const o = y * W + x;
        b[o] = 0xff000000 | (bl << 16) | (g << 8) | r;
        Z[o] = dist;
      }
    }

    // объёмные пропы
    const vis = [];
    for (const bx of boxes) {
      const cx = (bx.x0 + bx.x1) / 2 - px, cy = (bx.y0 + bx.y1) / 2 - py;
      const d2 = cx * cx + cy * cy;
      if (d2 > 700) continue;
      if (cx * dirX + cy * dirY < -1.6) continue;
      vis.push(bx);
    }
    for (let x = 0; x < W; x++) {
      const cam = 2 * x / W - 1;
      const rdx = dirX + plX * cam, rdy = dirY + plY * cam;
      const wallD = zcol[x];
      for (const bx of vis) {
        if (!rayBox(bx, px, py, rdx, rdy)) continue;
        const t0 = bh.t0, t1 = bh.t1;
        if (t0 >= wallD) continue;
        // передняя грань
        const fi = bh.face, tex = bx.tex[fi];
        const hx = px + t0 * rdx, hy = py + t0 * rdy;
        let u;
        if (fi === 1) u = (hx - bx.x0) / (bx.x1 - bx.x0);
        else if (fi === 0) u = (bx.x1 - hx) / (bx.x1 - bx.x0);
        else if (fi === 2) u = (bx.y1 - hy) / (bx.y1 - bx.y0);
        else u = (hy - bx.y0) / (bx.y1 - bx.y0);
        const tw = tex.w, th = tex.h, tp = tex.px, em = tex.emit;
        const tx = Math.max(0, Math.min(tw - 1, (u * tw) | 0));
        const top = horizon - (bx.z1 - camZ) * projV / t0;
        const bot = horizon + (camZ - bx.z0) * projV / t0;
        const f = fogF(t0), kf = 1 - f, ar = fogR * f, ag = fogG * f, ab = fogB * f;
        const nx = fi === 2 ? 0.08 : fi === 3 ? -0.08 : 0, ny = fi === 1 ? 0.08 : fi === 0 ? -0.08 : 0;
        const k = lightAt(hx + nx, hy + ny) * (fi >= 2 ? 1.0 : 0.88) * kf, ke = 1.1 * kf;
        let y0 = Math.ceil(top), y1 = Math.ceil(bot);
        if (y0 < 0) y0 = 0; if (y1 > H) y1 = H;
        const vstep = th / (bot - top);
        let v = (y0 - top) * vstep;
        for (let y = y0; y < y1; y++, v += vstep) {
          const o = y * W + x;
          if (Z[o] <= t0) continue;
          let ty = v | 0; if (ty >= th) ty = th - 1;
          const ti = ty * tw + tx, col = tp[ti];
          const kk = em && em[ti] ? ke : k;
          let r = (col & 255) * kk + ar, g = ((col >> 8) & 255) * kk + ag, bl = ((col >> 16) & 255) * kk + ab;
          if (r > 255) r = 255; if (g > 255) g = 255; if (bl > 255) bl = 255;
          b[o] = 0xff000000 | (bl << 16) | (g << 8) | r; Z[o] = t0;
        }
        // верхняя грань
        if (camZ > bx.z1 + 0.005) {
          const hz = camZ - bx.z1;
          let ya = Math.ceil(horizon + hz * projV / Math.min(t1, wallD)), yb = Math.ceil(top);
          if (ya < 0) ya = 0; if (yb > H) yb = H;
          const tt = bx.top, ttw = tt.w, tth = tt.h, ttp = tt.px;
          const W0 = bx.x1 - bx.x0, H0 = bx.y1 - bx.y0, tf = bx.tf;
          for (let y = ya; y < yb; y++) {
            const o = y * W + x;
            const d = hz * projV / (y - horizon);
            if (Z[o] <= d) continue;
            const wx = px + d * rdx, wy = py + d * rdy;
            let tu, tv;
            if (tf === 'S') { tu = (wx - bx.x0) / W0; tv = (wy - bx.y0) / H0; }
            else if (tf === 'N') { tu = (bx.x1 - wx) / W0; tv = (bx.y1 - wy) / H0; }
            else if (tf === 'E') { tu = (bx.y1 - wy) / H0; tv = (wx - bx.x0) / W0; }
            else { tu = (wy - bx.y0) / H0; tv = (bx.x1 - wx) / W0; }
            let ix = (tu * ttw) | 0, iy = (tv * tth) | 0;
            if (ix < 0) ix = 0; if (ix >= ttw) ix = ttw - 1; if (iy < 0) iy = 0; if (iy >= tth) iy = tth - 1;
            const col = ttp[iy * ttw + ix];
            const ff = fogF(d), kk = lightAt(wx, wy) * 1.05 * (1 - ff);
            let r = (col & 255) * kk + fogR * ff, g = ((col >> 8) & 255) * kk + fogG * ff, bl = ((col >> 16) & 255) * kk + fogB * ff;
            if (r > 255) r = 255; if (g > 255) g = 255; if (bl > 255) bl = 255;
            b[o] = 0xff000000 | (bl << 16) | (g << 8) | r; Z[o] = d;
          }
        }
      }
    }

    // спрайты
    const invDet = 1 / (plX * dirY - dirX * plY);
    for (const s of sprites) { const dx = s.x - px, dy = s.y - py; s.dist = dx * dx + dy * dy; }
    sprites.sort((a, c) => c.dist - a.dist);
    for (const s of sprites) {
      if (s.dist > 900) continue;
      const dx = s.x - px, dy = s.y - py;
      const tX = invDet * (dirY * dx - dirX * dy);
      const tY = invDet * (-plY * dx + plX * dy);
      if (tY < 0.08) continue;
      const scx = (W / 2) * (1 + tX / tY);
      const sc = projV / tY;
      const sw = s.w * sc, sh = s.h * sc;
      const sz = s.z + (s.float ? Math.sin(G.time * 1.3 + s.phase) * s.float : 0);
      const botY = horizon + (camZ - sz) * sc, topY = botY - sh;
      const x0 = Math.max(0, Math.ceil(scx - sw / 2)), x1 = Math.min(W, Math.ceil(scx + sw / 2));
      if (x0 >= x1) continue;
      const y0 = Math.max(0, Math.ceil(topY)), y1 = Math.min(H, Math.ceil(botY));
      const fr = s.frames, tex = fr[((G.time * s.speed + s.phase * 3) | 0) % fr.length], tw = tex.w, th = tex.h, tp = tex.px;
      const f = fogF(tY);
      const k = (s.bright ? 1.05 : lightAt(s.x, s.y) * 1.05) * (1 - f), ar = fogR * f, ag = fogG * f, ab = fogB * f;
      for (let x = x0; x < x1; x++) {
        const tx = (((x - (scx - sw / 2)) / sw) * tw) | 0;
        if (tx < 0 || tx >= tw) continue;
        for (let y = y0; y < y1; y++) {
          const o = y * W + x;
          if (Z[o] < tY) continue;
          const ty = (((y - topY) / sh) * th) | 0;
          const col = tp[ty * tw + tx];
          if (!col) continue;
          let r = (col & 255) * k + ar, g = ((col >> 8) & 255) * k + ag, bl = ((col >> 16) & 255) * k + ab;
          if (r > 255) r = 255; if (g > 255) g = 255; if (bl > 255) bl = 255;
          b[o] = 0xff000000 | (bl << 16) | (g << 8) | r;
        }
      }
    }
    ctx.putImageData(img, 0, 0);
  }

  // ---------------------------------------------------------------- физика
  const R = 0.2;
  function solidCell(cx, cy) {
    if (cx < 0 || cy < 0 || cx >= MW || cy >= MH) return true;
    const i = cy * MW + cx, t = cellType[i];
    if (t === 1) return true;
    if (t === 2) return doors.get(i).open < 0.9;
    return false;
  }
  function blocked(x, y) {
    if (solidCell((x - R) | 0, (y - R) | 0) || solidCell((x + R) | 0, (y - R) | 0) ||
      solidCell((x - R) | 0, (y + R) | 0) || solidCell((x + R) | 0, (y + R) | 0)) return true;
    for (const bx of boxes) {
      if (bx.z0 > 0.6) continue;
      if (x + R > bx.x0 && x - R < bx.x1 && y + R > bx.y0 && y - R < bx.y1) return true;
    }
    return false;
  }
  function move(dx, dy) {
    if (!blocked(P.x + dx, P.y)) P.x += dx;
    if (!blocked(P.x, P.y + dy)) P.y += dy;
    for (const s of sprites) {
      if (!s.block) continue;
      const ex = P.x - s.x, ey = P.y - s.y, d = Math.hypot(ex, ey), m = s.block + R * 0.6;
      if (d < m && d > 1e-4) {
        const nx = s.x + ex / d * m, ny = s.y + ey / d * m;
        if (!blocked(nx, P.y)) P.x = nx;
        if (!blocked(P.x, ny)) P.y = ny;
      }
    }
  }

  // ---------------------------------------------------------------- взаимодействие
  const hud = {
    zone: document.getElementById('zone'), prompt: document.getElementById('prompt'),
    counter: document.getElementById('counter'), toast: document.getElementById('toast'),
  };
  function updateTarget() {
    const dx = Math.cos(P.a), dy = Math.sin(P.a);
    G.target = null;
    const wallHit = cast(P.x, P.y, dx, dy, 12) ? hit.dist : 1e9;
    // ближайший полезный проп по лучу
    let best = null, bd = 1.5;
    for (const pr of usables) for (const bx of pr.boxes) {
      if (rayBox(bx, P.x, P.y, dx, dy) && bh.t0 < bd && bh.t0 < wallHit) { bd = bh.t0; best = pr; }
    }
    if (!best) {
      for (const pr of usables) {
        const d = Math.hypot(pr.x - P.x, pr.y - P.y);
        const ang = Math.atan2(pr.y - P.y, pr.x - P.x) - P.a;
        const da = Math.abs(Math.atan2(Math.sin(ang), Math.cos(ang)));
        if (d < 1.4 && da < 0.35 && d < bd + 0.3 && d < wallHit + 0.5) { bd = d; best = pr; }
      }
    }
    if (best) { G.target = { kind: 'prop', prop: best }; return; }
    if (wallHit === 1e9) return;
    cast(P.x, P.y, dx, dy, 12);
    if (hit.door && hit.dist < 1.8 && !hit.door.secret) { G.target = { kind: 'door', door: hit.door }; return; }
    if (hit.door && hit.door.secret && hit.dist < 1.5) { G.target = { kind: 'secret', door: hit.door }; return; }
    if (hit.face >= 0 && facePaint.has(hit.face) && hit.dist < 3.6) { G.target = { kind: 'paint', id: facePaint.get(hit.face) }; return; }
    if (hit.dist < 1.2) G.target = { kind: 'wall' };
  }
  function promptText() {
    const t = G.target;
    if (!t) return '';
    if (t.kind === 'paint') { const a = ART[t.id]; return `<b>[E]</b> рассмотреть «${a.title}»${G.seen.has(t.id) ? '' : ' <span class="new">новое</span>'}`; }
    if (t.kind === 'door') return t.door.open > 0.5 ? '<b>[E]</b> закрыть дверь' : '<b>[E]</b> открыть дверь';
    if (t.kind === 'prop') return `<b>[E]</b> ${USE[t.prop.t].label}`;
    return '';
  }
  function toast(msg, sec = 2.6) { hud.toast.innerHTML = msg; hud.toast.classList.add('show'); G.toastT = sec; }
  function interact() {
    const t = G.target;
    if (!t) return;
    if (t.kind === 'paint') return openViewer(t.id);
    if (t.kind === 'prop') return USE[t.prop.t].act();
    if (t.kind === 'door') { const d = t.door; d.target = d.target > 0.5 ? 0 : 1; d.timer = 0; AU.door(false); return; }
    if (t.kind === 'secret') { const d = t.door; if (d.target) return; d.target = 1; AU.door(true); toast('Стена поддалась…'); return; }
    if (t.kind === 'wall') { AU.blip(false); toast(pick(['Тук-тук. Обычная стена.', 'Стена как стена.', 'Звучит глухо.']), 1.4); }
  }
  function totals() {
    const main = M.paintings.filter(p => !ART[p.id]?.meme).length;
    const memes = M.paintings.length - main;
    let sm = 0, ss = 0;
    for (const id of G.seen) { if (ART[id]?.meme) ss++; else if (ART[id]) sm++; }
    return { main, memes, sm, ss };
  }
  function updateCounter() {
    const t = totals();
    hud.counter.textContent = `Осмотрено ${t.sm}/${t.main} · Секретики ${t.ss}/${t.memes}`;
  }

  // ---------------------------------------------------------------- просмотрщик
  const viewer = document.getElementById('viewer');
  function openViewer(id) {
    const a = ART[id];
    G.state = 'view';
    document.exitPointerLock && document.exitPointerLock();
    viewer.querySelector('.title-text').textContent = `C:\\МУЗЕЙ\\${a.meme ? 'СЕКРЕТИКИ' : a.who.split(' ')[1].toUpperCase()}\\${id}.jpg`;
    viewer.querySelector('img').src = 'art/' + id + '.jpg';
    viewer.querySelector('.p-title').textContent = a.title;
    viewer.querySelector('.p-who').textContent = a.who + (a.meme ? ' · секретик' : ' · фан-арт');
    viewer.querySelector('.p-text').textContent = a.text;
    viewer.classList.add('open');
    AU.blip(true);
    const wasNew = !G.seen.has(id);
    G.seen.add(id);
    try { localStorage.setItem('museum_seen', JSON.stringify([...G.seen])); } catch (e) { }
    updateCounter();
    if (wasNew) {
      const t = totals();
      if (a.meme) toast(`Секретик найден! ${t.ss}/${t.memes}`);
      if (!a.meme && t.sm === t.main) toast('Все экспонаты осмотрены. Спасибо, что зашли!', 4);
      if (a.meme && t.ss === t.memes) toast('Все секретики найдены. Вы — настоящий уборщик.', 4);
    }
  }
  function closeViewer() { viewer.classList.remove('open'); G.state = 'play'; lockPointer(); }
  viewer.querySelector('.close').addEventListener('click', e => { e.stopPropagation(); closeViewer(); });
  viewer.addEventListener('click', e => { if (e.target === viewer) closeViewer(); });

  // ---------------------------------------------------------------- миникарта
  const mapWrap = document.getElementById('mapwrap'), mapCanvas = document.getElementById('map');
  const MS = 8;
  const mapBase = document.createElement('canvas'); mapBase.width = MW * MS; mapBase.height = MH * MS;
  mapCanvas.width = MW * MS; mapCanvas.height = MH * MS;
  {
    const g = mapBase.getContext('2d');
    const col = { lobby: '#c9cdd2', sayaka: '#8fc9a4', kara: '#d99aa4', service: '#9aa4ae', dream: '#e8c64a' };
    g.fillStyle = '#1b1f24'; g.fillRect(0, 0, MW * MS, MH * MS);
    for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
      const i = y * MW + x;
      if (cellType[i] === 1) continue;
      const z = zones[zoneIdx[i]];
      g.fillStyle = cellType[i] === 2 ? (doors.get(i).secret ? '#1b1f24' : '#a0763a') : (z.c === 'x' ? '#1b1f24' : z.c === 'r' ? '#bfe6f6' : col[z.music]);
      g.fillRect(x * MS, y * MS, MS, MS);
    }
    g.fillStyle = 'rgba(40,40,50,0.55)';
    for (const bx of boxes) if (zones[zoneIdx[((bx.y0 + bx.y1) / 2 | 0) * MW + ((bx.x0 + bx.x1) / 2 | 0)]].c !== 'x') g.fillRect(bx.x0 * MS, bx.y0 * MS, Math.max(2, (bx.x1 - bx.x0) * MS), Math.max(2, (bx.y1 - bx.y0) * MS));
    g.fillStyle = '#ffd34a';
    for (const p of M.paintings) {
      if (ART[p.id]?.meme) continue;
      const f = SIDE[p.side]; const nx = p.x + DIRS[f][0] * 0.7, ny = p.y + DIRS[f][1] * 0.7;
      g.fillRect((nx + 0.3) * MS, (ny + 0.3) * MS, MS * 0.4 + 1, MS * 0.4 + 1);
    }
    g.font = 'bold 11px Tahoma, Verdana, sans-serif'; g.textAlign = 'center';
    for (const [t, x, y] of M.labels || []) { g.fillStyle = 'rgba(0,0,0,0.55)'; g.fillText(t, x * MS + 1, y * MS + 1); g.fillStyle = '#fff'; g.fillText(t, x * MS, y * MS); }
  }
  function drawMap() {
    const g = mapCanvas.getContext('2d');
    g.drawImage(mapBase, 0, 0);
    g.save(); g.translate(P.x * MS, P.y * MS); g.rotate(P.a);
    g.fillStyle = '#ff3b3b'; g.strokeStyle = '#fff'; g.lineWidth = 1.5;
    g.beginPath(); g.moveTo(9, 0); g.lineTo(-6, -6); g.lineTo(-3, 0); g.lineTo(-6, 6); g.closePath(); g.fill(); g.stroke();
    g.restore();
  }
  function toggleMap(v) { mapWrap.classList.toggle('open', v ?? !mapWrap.classList.contains('open')); }

  // ---------------------------------------------------------------- ввод
  const isTouch = matchMedia('(pointer: coarse)').matches;
  function lockPointer() { if (!isTouch && canvas.requestPointerLock) { try { const r = canvas.requestPointerLock(); r && r.catch && r.catch(() => { }); } catch (e) { } } }
  document.addEventListener('pointerlockchange', () => {
    if (!document.pointerLockElement && G.state === 'play' && !isTouch) showPause(true);
  });
  canvas.addEventListener('click', () => { if (G.state === 'play') { if (!document.pointerLockElement) lockPointer(); else interact(); } });
  document.addEventListener('mousemove', e => {
    if (G.state !== 'play' || !document.pointerLockElement) return;
    P.a += e.movementX * 0.0024 * G.sens;
    P.pitch = Math.max(-RH * 0.35, Math.min(RH * 0.35, P.pitch - e.movementY * 0.35 * G.sens * RH / 270));
  });
  document.addEventListener('keydown', e => {
    const k = e.code;
    G.keys[k] = true;
    if (G.state === 'view') {
      if (k === 'KeyE' || k === 'Escape' || k === 'Enter' || k === 'Space') { e.preventDefault(); closeViewer(); }
      return;
    }
    if (G.state !== 'play') return;
    if (k === 'KeyE' || k === 'Enter' || k === 'Space') { e.preventDefault(); interact(); }
    if (k === 'KeyM' || k === 'Tab') { e.preventDefault(); toggleMap(); }
  });
  document.addEventListener('keyup', e => { G.keys[e.code] = false; });
  window.addEventListener('blur', () => { G.keys = {}; });

  const touch = { moveId: null, mx0: 0, my0: 0, mx: 0, my: 0, lookId: null, lx: 0, ly: 0, moved: 0 };
  if (isTouch) {
    document.body.classList.add('touch');
    canvas.addEventListener('touchstart', e => {
      for (const t of e.changedTouches) {
        if (t.clientX < window.innerWidth * 0.45 && touch.moveId === null) { touch.moveId = t.identifier; touch.mx0 = touch.mx = t.clientX; touch.my0 = touch.my = t.clientY; }
        else if (touch.lookId === null) { touch.lookId = t.identifier; touch.lx = t.clientX; touch.ly = t.clientY; touch.moved = 0; }
      }
      e.preventDefault();
    }, { passive: false });
    canvas.addEventListener('touchmove', e => {
      for (const t of e.changedTouches) {
        if (t.identifier === touch.moveId) { touch.mx = t.clientX; touch.my = t.clientY; }
        if (t.identifier === touch.lookId) {
          const dx = t.clientX - touch.lx, dy = t.clientY - touch.ly;
          touch.moved += Math.abs(dx) + Math.abs(dy);
          P.a += dx * 0.006 * G.sens; P.pitch = Math.max(-RH * 0.35, Math.min(RH * 0.35, P.pitch - dy * 0.4 * G.sens));
          touch.lx = t.clientX; touch.ly = t.clientY;
        }
      }
      e.preventDefault();
    }, { passive: false });
    const end = e => {
      for (const t of e.changedTouches) {
        if (t.identifier === touch.moveId) touch.moveId = null;
        if (t.identifier === touch.lookId) { if (touch.moved < 10 && G.state === 'play') interact(); touch.lookId = null; }
      }
    };
    canvas.addEventListener('touchend', end); canvas.addEventListener('touchcancel', end);
    document.getElementById('btn-map').addEventListener('click', () => toggleMap());
    document.getElementById('btn-pause').addEventListener('click', () => showPause(true));
  }

  // ---------------------------------------------------------------- цикл
  let last = performance.now(), stepAcc = 0;
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    G.time += dt;
    if (G.state === 'play') update(dt);
    for (const d of doors.values()) {
      if (d.open !== d.target) {
        const sp = d.secret ? 0.6 : 1.8;
        d.open += Math.sign(d.target - d.open) * sp * dt;
        if (Math.abs(d.open - d.target) < sp * dt) d.open = d.target;
      }
      if (!d.secret && d.target === 1 && d.open === 1) {
        d.timer += dt;
        const inside = ((P.x | 0) === d.x && (P.y | 0) === d.y);
        if (d.timer > 7 && !inside) { d.target = 0; d.timer = 0; AU.door(false); }
      }
    }
    const n = Math.sin(G.time * 13.1) + Math.sin(G.time * 7.3 + 1) + Math.sin(G.time * 31.7);
    G.flick = (n > 2.2 || (G.time % 6.3) < 0.08) ? 0.15 : 1.0;
    for (let i = 0; i < 3; i++) G.fog[i] += (G.fogT[i] - G.fog[i]) * Math.min(1, dt * 1.5);
    if (G.state !== 'title') render();
    if (mapWrap.classList.contains('open')) drawMap();
    if (G.toastT > 0) { G.toastT -= dt; if (G.toastT <= 0) hud.toast.classList.remove('show'); }
    requestAnimationFrame(frame);
  }
  function update(dt) {
    const K = G.keys;
    let fw = 0, st = 0, rot = 0;
    if (K.KeyW || K.ArrowUp) fw += 1;
    if (K.KeyS || K.ArrowDown) fw -= 1;
    if (K.KeyA) st -= 1;
    if (K.KeyD) st += 1;
    if (K.ArrowLeft || K.KeyQ) rot -= 1;
    if (K.ArrowRight) rot += 1;
    if (touch.moveId !== null) {
      const dx = (touch.mx - touch.mx0) / 60, dy = (touch.my - touch.my0) / 60;
      st += Math.max(-1, Math.min(1, dx)); fw -= Math.max(-1, Math.min(1, dy));
    }
    P.a += rot * 2.2 * dt;
    const run = K.ShiftLeft || K.ShiftRight;
    const sp = (run ? 3.4 : 2.1) * dt;
    const len = Math.hypot(fw, st);
    const ca = Math.cos(P.a), sa = Math.sin(P.a);
    if (len > 0.01) {
      const nf = fw / Math.max(1, len), ns = st / Math.max(1, len);
      const ox = P.x, oy = P.y;
      move((ca * nf - sa * ns) * sp, (sa * nf + ca * ns) * sp);
      const moved = Math.hypot(P.x - ox, P.y - oy);
      stepAcc += moved;
      P.bobAmp = Math.min(1, P.bobAmp + dt * 4);
      const stride = run ? 0.95 : 0.8;
      const phase = stepAcc / stride * Math.PI;
      P.bob = Math.sin(phase * 2) * 0.012 * P.bobAmp;
      const s = Math.sign(Math.sin(phase));
      if (s !== P.lastStepSign && moved > 0) { P.lastStepSign = s; AU.step(zones[zoneIdx[(P.y | 0) * MW + (P.x | 0)]].step); }
    } else { P.bobAmp = Math.max(0, P.bobAmp - dt * 4); P.bob *= 0.85; }
    const ci = (P.y | 0) * MW + (P.x | 0), zi = zoneIdx[ci];
    if (zi !== G.zone && cellType[ci] === 0) {
      const prev = G.zone; G.zone = zi;
      const z = zones[zi];
      if (prev === -1 || zones[prev].name !== z.name) {
        hud.zone.textContent = z.name; hud.zone.classList.remove('show'); void hud.zone.offsetWidth; hud.zone.classList.add('show');
      }
      AU.playMusic(z.music);
      G.fogT = FOG_ZONE[z.c] || FOGC[z.music];
    }
    let fd = 1e9; for (const f of fountains) fd = Math.min(fd, Math.hypot(f.x - P.x, f.y - P.y) - (f.t === 'fountain' ? 1.0 : 0.4));
    AU.ambience(Math.max(0, fd), zones[zi].music === 'service');
    updateTarget();
    const pt = promptText();
    if (hud.prompt._t !== pt) { hud.prompt.innerHTML = pt; hud.prompt._t = pt; hud.prompt.classList.toggle('show', !!pt); }
  }

  // ---------------------------------------------------------------- меню
  const title = document.getElementById('title'), pause = document.getElementById('pause');
  function showPause(v) {
    if (v) { G.state = 'pause'; pause.classList.add('open'); G.keys = {}; }
    else { pause.classList.remove('open'); G.state = 'play'; lockPointer(); }
  }
  document.getElementById('resume').addEventListener('click', () => showPause(false));
  document.getElementById('restart').addEventListener('click', () => { P.x = M.start.x; P.y = M.start.y; P.a = M.start.a; P.pitch = 0; showPause(false); });
  function bindSettings(root) {
    const q = s => root.querySelector(s);
    q('.opt-music').addEventListener('input', e => { AU.setVolumes(+e.target.value, AU.sfxVol); syncSettings(); });
    q('.opt-sfx').addEventListener('input', e => { AU.setVolumes(AU.musicVol, +e.target.value); syncSettings(); });
    q('.opt-crt').addEventListener('change', e => { G.crt = e.target.checked; document.body.classList.toggle('crt', G.crt); syncSettings(); });
    q('.opt-res').addEventListener('change', e => { G.res = +e.target.value; resize(); syncSettings(); });
    q('.opt-sens').addEventListener('input', e => { G.sens = +e.target.value; syncSettings(); });
  }
  function syncSettings() {
    for (const r of document.querySelectorAll('.settings')) {
      r.querySelector('.opt-music').value = AU.musicVol; r.querySelector('.opt-sfx').value = AU.sfxVol;
      r.querySelector('.opt-crt').checked = G.crt; r.querySelector('.opt-res').value = G.res; r.querySelector('.opt-sens').value = G.sens;
    }
    try { localStorage.setItem('museum_opts', JSON.stringify({ m: AU.musicVol, s: AU.sfxVol, crt: G.crt, res: G.res, sens: G.sens })); } catch (e) { }
  }
  try {
    const o = JSON.parse(localStorage.getItem('museum_opts') || 'null');
    if (o) { AU.musicVol = o.m; AU.sfxVol = o.s; G.crt = o.crt; G.res = o.res; G.sens = o.sens || 1; }
  } catch (e) { }
  document.body.classList.toggle('crt', G.crt);
  document.querySelectorAll('.settings').forEach(bindSettings);
  syncSettings();

  const bar = document.getElementById('loadbar'), enter = document.getElementById('enter'), loadText = document.getElementById('loadtext');
  const ids = [...new Set(M.paintings.map(p => p.id))];
  let pImg = 0, pMus = 0;
  const showProg = () => { bar.style.width = ((pImg * 0.6 + pMus * 0.4) * 100).toFixed(0) + '%'; };
  const images = {};
  const imgP = Promise.all(ids.map(id => new Promise(res => {
    const im = new Image();
    im.onload = () => { images[id] = im; pImg += 1 / ids.length; showProg(); res(); };
    im.onerror = () => { const c = document.createElement('canvas'); c.width = c.height = 8; images[id] = c; pImg += 1 / ids.length; showProg(); res(); };
    im.src = 'art/' + id + '.jpg';
  })));
  const musP = AU.preload(['lobby', 'sayaka', 'kara', 'service', 'dream'], v => { pMus = v; showProg(); });
  Promise.all([imgP, musP]).then(() => {
    buildPaintings(images);
    loadText.textContent = 'Готово. Экспонаты на местах.';
    enter.disabled = false; enter.focus({ preventScroll: true });
  });
  enter.addEventListener('click', () => {
    AU.init(); AU.setVolumes(AU.musicVol, AU.sfxVol);
    title.classList.remove('open');
    G.state = 'play'; G.zone = -1;
    updateCounter();
    lockPointer();
  });

  resize();
  requestAnimationFrame(frame);
  window.__museum = { P, G, render, sprites, doors, boxes };
})();
