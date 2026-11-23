// Планировка отеля «Grand Simulacre».
// X — с запада на восток, Z — с юга на север, Y — вверх; 1 единица = 1 м.
// Уровни: -1 подвал, 0 вестибюль и подиум (ресторан, казино), 1–3 жилые этажи (2–4), 4 крыша.
import * as THREE from 'three';
import { W, G, FH, T, CEIL, EXT, setLevel, wall, block, floorRect, ceilRect, surface, rectMinus, rectsMinus, col, texMat, emis, basic, Door, interact, anchor, glow, zone, trigger, picture, addCollider, box, cyl, plane, mount } from './engine.js';
import * as TX from './textures.js';
import * as PR from './props.js';
import * as S from './audio.js';
import { T as TXT } from './stories.js';

const P = Math.PI;
const TX0 = 0, TX1 = 30, TZ0 = -6.4, TZ1 = 6.4;
const CZ0 = -1.3, CZ1 = 1.3;
const LA = [0.15, 1.75], LB = [1.95, 3.4], SZ0 = -6.3, SZ1 = -1.5, SLAND = -4.7;
const EX0 = 1.2, EX1 = 4.2, EZ0 = 3.6;
const LX0 = -26, LZ0 = -14, LZ1 = 14, LH = 8, PH = 4.6, PCEIL = 4.2;
// крыло за вестибюлем: бальный зал (x -26..-8), библиотека (z 14..23) и курительная (z 23..32)
const WZ1 = 32, WX = -8, WZS = 23;
const SX0 = LB[1] + 0.1, SX1 = 6;
const CAB = [EX0, EZ0, EX1, TZ1], SERV = [SX0, TZ0, SX1, SZ1];
export const LAYOUT = { TX0, TX1, TZ0, TZ1, LX0, LZ0, LZ1, LH, PH, EX0, EX1, EZ0, WZ1 };

const M = {};
function mats() {
  M.ext = texMat('ext', TX.stucco('#a8725a', 15), 0xffffff, {}, 3); EXT.mats.add(M.ext);
  M.corrWall = texMat('corrWall', TX.wallpaper('#5a4228', '#6e5232', 'stripes', 2), 0xffffff, {}, 1.2);
  M.carpet = texMat('carpet', TX.carpetGreen(), 0xffffff, {}, 1.3);
  M.ceil = texMat('ceil', TX.ceilingTiles(), 0xffffff, {}, 0.8);
  M.lobbyWall = texMat('lobbyWall', TX.wallpaper('#4a2420', '#5e3026', 'damask', 5), 0xffffff, {}, 1.3);
  M.marble = texMat('marble', TX.marble(), 0xffffff, {}, 2.4);
  M.concrete = texMat('conc', TX.concrete('#4a443e', 6), 0xffffff, {}, 2);
  M.concWall = texMat('concWall', TX.concrete('#58504a', 12), 0xffffff, {}, 2);
  M.tileW = texMat('tileW', TX.tiles('#6a7068', '#626860', '#2a2e2a', 8), 0xffffff, {}, 1.2);
  M.tileFloor = texMat('tileF', TX.tiles('#3a3436', '#2a2426', '#141012', 4), 0xffffff, {}, 1);
  M.pinkTile = texMat('pinkT', TX.tiles('#b8708a', '#aa6480', '#6a3a4a', 8), 0xffffff, { emissive: 0x2a0a14 }, 1.2);
  M.poolTile = texMat('poolT', TX.tiles('#3a8a9a', '#348292', '#14444c', 8), 0xffffff, {}, 1.2);
  // бассейн в духе вейпорвейва: розовая плитка, бирюзово-розовая шахматка, дно с розовой сеткой
  M.vaporWall = texMat('vapW', TX.tiles('#e8a0c4', '#e098bc', '#a05080', 8), 0xffffff, {}, 1.0);
  M.vaporDeck = texMat('vapD', TX.tiles('#f0b0d0', '#7ad0d8', '#3a2040', 2), 0xffffff, {}, 1.2);
  M.vaporBottom = texMat('vapB', TX.tiles('#2aa0bc', '#2898b2', '#ff7ac0', 6), 0xffffff, {}, 1.0);
  M.parquet = texMat('parq', TX.parquet(), 0xffffff, {}, 1.4);
  M.restWall = texMat('restWall', TX.wallpaper('#5a1a1c', '#74282a', 'damask', 21), 0xffffff, {}, 1.3);
  M.casinoWall = texMat('casWall', TX.wallpaper('#173a34', '#a8843a', 'trellis', 22), 0xffffff, {}, 1.2);
  M.casinoCarpet = texMat('casCarp', TX.carpetCasino(), 0xffffff, {}, 1.6);
  M.cloakWall = texMat('cloak', TX.wallpaper('#4a3a22', '#5e4a2a', 'diamonds', 23), 0xffffff, {}, 1.2);
  M.coffer = texMat('coffer', TX.coffer(), 0xffffff, {}, 1.6);
  M.rooms = [
    texMat('rw0', TX.wallpaper('#2a4a4a', '#386060', 'stripes', 3), 0xffffff, {}, 1.2),
    texMat('rw1', TX.wallpaper('#5a3046', '#703c58', 'damask', 4), 0xffffff, {}, 1.3),
    texMat('rw2', TX.wallpaper('#5a3e24', '#70502e', 'diamonds', 5), 0xffffff, {}, 1.2),
    texMat('rw3', TX.wallpaper('#2e3452', '#40486a', 'dots', 6), 0xffffff, {}, 1.2),
    texMat('rw4', TX.wallpaper('#5a2626', '#743232', 'stripes', 7), 0xffffff, {}, 1.2),
    texMat('rw5', TX.wallpaper('#3a4a2a', '#4c5e36', 'trellis', 8), 0xffffff, {}, 1.2),
  ];
  M.roomFloors = [
    texMat('rf0', TX.carpetOrnament('#3a2018', '#7a5a2a', '0'), 0xffffff, {}, 1.6),
    texMat('rf1', TX.carpetPlain('#2a3438', 5), 0xffffff, {}, 2),
    texMat('rf2', TX.carpetOrnament('#3a1a2a', '#8a4a5a', '2'), 0xffffff, {}, 1.6),
    M.parquet,
  ];
  M.roof = texMat('roof', TX.gravel(), 0xffffff, {}, 1.5);
  M.dark = col(0x1a1410);
  M.ballWall = texMat('ballWall', TX.wallpaper('#4a3a2a', '#6a5236', 'damask', 31), 0xffffff, {}, 1.4);
  M.libWall = texMat('libWall', TX.wallpaper('#22382c', '#2e4a3a', 'stripes', 32), 0xffffff, {}, 1.2);
  M.cigarWall = texMat('cigarWall', TX.wallpaper('#3a1e14', '#4e2a1a', 'trellis', 33), 0xffffff, {}, 1.2);
  M.serviceFloor = { [-1]: M.concrete, 1: M.tileFloor, 2: M.tileFloor, 3: M.carpet };
}
export { M as HOTEL_MATS };

export function buildHotel() {
  mats();
  buildBasement();
  buildGround();
  buildLobby();
  buildWing();
  for (const L of [1, 2, 3]) buildGuestFloor(L);
  buildRoof();
  buildStairs();
  buildElevator();
  fillLeftoverImages();
  addLightSwitches();
}

// Выключатели: в каждой комнате с верхним светом (потолочные лампы, люстры, бра).
// Сначала — у дверей со стороны ручки; потом — у проёмов в комнатах без дверей.
function smallestZone(level, x, z) {
  let best = null;
  for (const zn of W.zones) if (zn.level === level && x >= zn.minX && x <= zn.maxX && z >= zn.minZ && z <= zn.maxZ) { const ar = (zn.maxX - zn.minX) * (zn.maxZ - zn.minZ); if (!best || ar < best[0]) best = [ar, zn]; }
  return best && best[1];
}
function addLightSwitches() {
  const lampsOf = new Map();
  for (const a of W.anchors) if (a.switchable && a.level < 4) { const zn = smallestZone(a.level, a.pos.x, a.pos.z); if (zn) { if (!lampsOf.has(zn)) lampsOf.set(zn, []); lampsOf.get(zn).push(a); } }
  const done = new Set(), doorCols = new Set((W.doors || []).map(d => d.collider));
  const wallItems = W.qa.filter(q => q.kind === 'wall').map(q => { const p = new THREE.Vector3(); q.obj.getWorldPosition(p); return p; });
  const free = (x, y, zz) => wallItems.every(p => Math.abs(p.y - y) > 0.55 || Math.hypot(p.x - x, p.z - zz) > 0.45);
  // стена на оси c в точке s: настоящий блок стены (не окно, не дверь) на высоте h от пола
  const wallCol = (axis, c, s, y) => W.colliders.find(cl => cl.enabled !== false && !doorCols.has(cl) && cl.ref && cl.ref.isMesh && cl.minY <= y && cl.maxY >= y &&
    (axis === 'x' ? cl.minZ <= c && cl.maxZ >= c && cl.minX <= s && cl.maxX >= s && cl.maxZ - cl.minZ < 0.5 : cl.minX <= c && cl.maxX >= c && cl.minZ <= s && cl.maxZ >= s && cl.maxX - cl.minX < 0.5));
  const wallAt = (...a) => !!wallCol(...a);
  const blockedIn = (x, y, zz) => W.colliders.some(cl => cl.enabled !== false && x > cl.minX && x < cl.maxX && zz > cl.minZ && zz < cl.maxZ && y > cl.minY && y < cl.maxY);
  const place = (zn, axis, c, sd, along) => {
    const lamps = lampsOf.get(zn); const y = zn.level * FH + 1.2;
    done.add(zn); setLevel(zn.level);
    // грань берём у настоящего блока стены: границы некоторых зон не совпадают с осью стены
    const wc = wallCol(axis, c, along, y);
    const face = wc ? (axis === 'x' ? (sd > 0 ? wc.maxZ : wc.minZ) : (sd > 0 ? wc.maxX : wc.minX)) + sd * 0.003 : c + sd * (T / 2 + 0.003);
    const x = axis === 'x' ? along : face, zz = axis === 'x' ? face : along;
    const ry = axis === 'x' ? (sd > 0 ? 0 : P) : (sd > 0 ? P / 2 : -P / 2);
    const g = PR.grp(x, zz, ry, y);
    box(0.08, 0.12, 0.012, col(0xd8d0bc), 0, -0.06, 0.006, { parent: g });
    const key = box(0.022, 0.04, 0.012, col(0xf0e8d8), 0, -0.02, 0.016, { parent: g }); key.userData.noMerge = true;
    PR.hitBox(g, 0.16, 0.2, 0.08, -0.1);
    const st = () => lamps.some(a => a.on);
    const setKey = () => { key.rotation.x = st() ? -0.35 : 0.35; };
    setKey();
    interact(g, () => st() ? 'Выключить свет' : 'Включить свет', () => {
      const v = !st(); for (const a of lamps) a.setOn(v); setKey(); S.sfxSwitch();
      if (v && W.flags.blackout) G.toast('Щелчок. Света нет — внизу выключен общий рубильник.');
    });
    mount(g, 'wall', { w: 0.08, h: 0.12, what: 'выключатель' });
    wallItems.push(new THREE.Vector3(x, y, zz));
  };
  const ok = (zn, axis, c, sd, s) => {
    const lo = axis === 'x' ? zn.minX : zn.minZ, hi = axis === 'x' ? zn.maxX : zn.maxZ, y = zn.level * FH;
    if (s < lo + 0.35 || s > hi - 0.35 || !wallAt(axis, c, s, y + 1.2) || !wallAt(axis, c, s - 0.08, y + 1.2) || !wallAt(axis, c, s + 0.08, y + 1.2)) return false;
    const fx = axis === 'x' ? s : c + sd * (T / 2 + 0.1), fz = axis === 'x' ? c + sd * (T / 2 + 0.1) : s;
    return !blockedIn(fx, y + 1.2, fz) && free(axis === 'x' ? s : c, y + 1.2, axis === 'x' ? c : s);
  };
  // 1) у дверей
  for (const d of W.doors || []) {
    for (const sd of [-1, 1]) {
      const px = d.axis === 'x' ? d.at : d.c + sd * 0.8, pz = d.axis === 'x' ? d.c + sd * 0.8 : d.at;
      const zn = smallestZone(d.level, px, pz); if (!zn || done.has(zn) || !lampsOf.has(zn)) continue;
      const cand = [d.at - d.hinge * (d.w / 2 + 0.25), d.at + d.hinge * (d.w / 2 + 0.25), d.at - d.hinge * (d.w / 2 + 0.5)];
      const s = cand.find(s => ok(zn, d.axis, d.c, sd, s)); if (s !== undefined) place(zn, d.axis, d.c, sd, s);
    }
  }
  // 2) комнаты без дверей: рядом с проёмом в стене по периметру зоны
  for (const [zn, lamps] of lampsOf) {
    if (done.has(zn)) continue;
    const y = zn.level * FH; let bestC = null;
    const sides = [['x', zn.minZ, 1], ['x', zn.maxZ, -1], ['z', zn.minX, 1], ['z', zn.maxX, -1]];
    for (const [axis, c, sd] of sides) {
      const lo = axis === 'x' ? zn.minX : zn.minZ, hi = axis === 'x' ? zn.maxX : zn.maxZ;
      let prevOpen = null;
      for (let s = lo + 0.2; s < hi - 0.2; s += 0.1) {
        const open = !wallAt(axis, c, s, y + 0.3) && !wallAt(axis, c, s, y + 1.2);
        if (prevOpen !== null && open !== prevOpen) { // край проёма
          for (const off of [0.3, 0.45, 0.6]) { const ss = open ? s - 0.1 - off : s + off; if (ok(zn, axis, c, sd, ss)) { const sc = off; if (!bestC || sc < bestC[0]) bestC = [sc, axis, c, sd, ss]; break; } }
        }
        prevOpen = open;
      }
    }
    if (!bestC) for (const [axis, c, sd] of sides) { const lo = axis === 'x' ? zn.minX : zn.minZ; for (let s = lo + 0.5; !bestC && s < (axis === 'x' ? zn.maxX : zn.maxZ) - 0.5; s += 0.25) if (ok(zn, axis, c, sd, s)) bestC = [9, axis, c, sd, s]; }
    if (bestC) place(zn, bestC[1], bestC[2], bestC[3], bestC[4]);
  }
  W.switchReport = [...lampsOf.keys()].map(zn => (done.has(zn) ? '+ ' : '- ') + zn.name + ' L' + zn.level);
}

// ======================================================================
// ПОМОЩНИКИ
function onWall(axis, c, side, along) {
  if (axis === 'x') return { x: along, z: c + side * T / 2, ry: side > 0 ? 0 : P };
  return { x: c + side * T / 2, z: along, ry: side > 0 ? P / 2 : -P / 2 };
}
function pic(groups, axis, c, side, along, y, size, opts) { const p = onWall(axis, c, side, along); return picture(groups, p.x, y, p.z, p.ry, size, opts); }
function sgn(text, axis, c, side, along, y, opts) { const p = onWall(axis, c, side, along); return PR.sign(text, p.x, y, p.z, p.ry, opts); }
function sconceAt(axis, c, side, along, y) { const p = onWall(axis, c, side, along); return PR.sconce(p.x, y, p.z, p.ry); }
function hangSign(text, x, yy, z, ry, { w = 1.0, h = 0.22, bg, fg } = {}) {
  const g = PR.grp(x, z, ry, yy);
  box(w + 0.04, h + 0.04, 0.03, col(0x140c08), 0, -h / 2 - 0.02, 0, { parent: g });
  const t3 = PR.tri(text); if (t3) { text = t3.join('\n'); h *= 1.5; }
  const tex = TX.signTex(text, { aspect: w / h, bg: bg || '#1a120c', fg: fg || '#e0c890', sub: !!t3 });
  const m = texMat('hs' + text.replace(/\n/g, '|') + w, tex, 0xffffff, { emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.25 }, 0);
  for (const s of [1, -1]) { const p = plane(w, h, m, 0, 0, s * 0.03, 0, s > 0 ? 0 : P, { parent: g }); p.userData.noMerge = true; }
  box(0.015, 0.4, 0.015, col(0x111111), -w * 0.4, h / 2, 0, { parent: g }); box(0.015, 0.4, 0.015, col(0x111111), w * 0.4, h / 2, 0, { parent: g });
  mount(g, 'hang');
  return g;
}
const dT = (T - 0.2) / 2;
function roomFrame(r) {
  const fz = r.side > 0 ? CZ1 + T / 2 : CZ0 - T / 2;
  const F = {
    W: r.x1 - r.x0, D: (TZ1 - T / 2) - (CZ1 + T / 2), y: r.y,
    // u, v отсчитаны от разметки под стены 0,2 м: у дальних стен сдвигаем на прирост толщины
    p: (u, v) => [r.x0 + u + (u < (r.x1 - r.x0) / 2 ? dT : -dT), fz + r.side * (v > 2.25 ? v - 2 * dT : v)],
    ry: dir => ({ win: r.side > 0 ? 0 : P, door: r.side > 0 ? P : 0, east: P / 2, west: -P / 2 }[dir]),
  };
  F.pic = (groups, wallName, t, y, size, opts) => {
    if (wallName === 'west') return pic(groups, 'z', r.x0, 1, F.p(0, t)[1], r.y + y, size, opts);
    if (wallName === 'east') return pic(groups, 'z', r.x1, -1, F.p(0, t)[1], r.y + y, size, opts);
    if (wallName === 'door') return pic(groups, 'x', r.side > 0 ? CZ1 : CZ0, r.side, r.x0 + t, r.y + y, size, opts);
    return pic(groups, 'x', r.side > 0 ? TZ1 : TZ0, -r.side, r.x0 + t, r.y + y, size, opts);
  };
  return F;
}
function noteArgs(k) { const [title, text, story] = TXT[k]; return [title, text, { story }]; }

// ======================================================================
// КАРКАС БАШНИ
// торец перекрытия у лестничного проёма со стороны лифтового холла: между потолком и полом
// следующего этажа 30 см пустоты, без торца сквозь неё виден соседний этаж
function stairFascia(y, mat) {
  block(LA[0], y + CEIL + 0.005, SZ1 - 0.04, LB[1], y + FH - 0.005, SZ1 + 0.02, mat, { collide: false });
}
function towerFloorsAndCeiling(L, rooms, { corrMat, corrSound, coreMat, coreSound }) {
  const y = L * FH;
  const holeBelow = [LA[0], SZ0, LB[1], SZ1];
  const hole = L === -1 ? null : (L === 3 ? [LB[0], SLAND, LB[1], SZ1] : holeBelow);
  for (const r of rectsMinus([[TX0, TZ0, 6, TZ1]], [hole, CAB, SERV].filter(Boolean))) floorRect(r[0], r[1], r[2], r[3], y, coreMat, coreSound);
  floorRect(SERV[0], SERV[1], SERV[2], SERV[3], y, M.serviceFloor[L] || coreMat, 'tile');
  floorRect(6, CZ0, TX1, CZ1, y, corrMat, corrSound);
  for (const r of rooms) floorRect(r.x0, Math.min(r.z0, r.z1), r.x1, Math.max(r.z0, r.z1), y, r.floor || corrMat, r.sound || corrSound);
  const ceilRects = L === 3 ? [[TX0, TZ0, TX1, TZ1]] : rectMinus([TX0, TZ0, TX1, TZ1], holeBelow);
  for (const r of ceilRects) ceilRect(r[0], r[1], r[2], r[3], y + CEIL, M.ceil);
  if (L !== 3) stairFascia(y, coreMat);
}
function roomsSpec(L) {
  const out = [];
  [[6, 12], [12, 18], [18, 24], [24, 30]].forEach((xr, i) => {
    out.push({ x0: xr[0], x1: xr[1], z0: CZ1, z1: TZ1, side: 1, idx: i * 2 + 1, y: L * FH });
    out.push({ x0: xr[0], x1: xr[1], z0: TZ0, z1: CZ0, side: -1, idx: i * 2 + 2, y: L * FH });
  });
  return out;
}
function towerOuter(L, rooms, { coreMat, glassBlocks = false }) {
  const y = L * FH;
  const win = (x0, x1) => glassBlocks ? [{ at: (x0 + x1) / 2, w: 1.6, type: 'blocks', sill: 2.9, h: 0.6 }] : [{ at: (x0 + x1) / 2, w: 2.2, type: 'window', sill: 0.75, h: 2.1, light: 0.24 }];
  for (const side of [1, -1]) {
    const c = side > 0 ? TZ1 : TZ0;
    const coreOps = glassBlocks ? [] : (side > 0 ? [{ at: 0.6, w: 0.9, type: 'window', sill: 0.9, h: 2 }] : [{ at: 1.8, w: 2.4, type: 'window', sill: 1.6, h: 1.8, light: 0.12 }]);
    const spans = [[TX0, 6, coreMat, coreOps]];
    for (const r of rooms.filter(r => r.side === side).sort((a, b) => a.x0 - b.x0)) spans.push([r.x0, r.x1, r.mat, r.wins || win(r.x0, r.x1)]);
    for (const [a, b, m, ops] of spans) wall('x', c, a, b, y, FH, side > 0 ? { neg: m, pos: M.ext } : { neg: M.ext, pos: m }, ops, { inside: -side });
  }
  const nr = rooms.find(r => r.side > 0 && r.x1 === TX1), sr = rooms.find(r => r.side < 0 && r.x1 === TX1);
  wall('z', TX1, CZ0, CZ1, y, FH, { neg: L === -1 ? M.concWall : M.corrWall, pos: M.ext }, [glassBlocks ? { at: 0, w: 1.6, type: 'blocks', sill: 2.9, h: 0.6 } : { at: 0, w: 1.8, type: 'window', sill: 0.5, h: 2.6, light: 0.3 }], { inside: -1 });
  for (const [r, a, b] of [[nr, CZ1, TZ1 + T / 2], [sr, TZ0 - T / 2, CZ0]]) {
    const ops = glassBlocks ? [{ at: (a + b) / 2, w: 1.4, type: 'blocks', sill: 2.9, h: 0.6 }] : [];
    wall('z', TX1, a, b, y, FH, { neg: r.mat, pos: M.ext }, ops, { inside: -1 });
  }
  if (L >= 1) {
    const ws = [{ at: 1.0, w: 2.6, type: 'window', sill: 0.6, h: 2.4, light: 0.25 }, { at: -3.6, w: 2.4, type: 'window', sill: 1.4, h: 2.0, light: 0.1 }];
    wall('z', TX0, TZ0 - T / 2, TZ1 + T / 2, y, FH, { neg: L === 1 ? M.lobbyWall : M.ext, pos: coreMat }, ws, { inside: L === 1 ? 0 : 1 });
  } else if (L === -1) wall('z', TX0, TZ0 - T / 2, TZ1 + T / 2, y, FH, { neg: M.ext, pos: coreMat });
}
function corridorWalls(L, rooms, { corrMat, doorOpts, partitionOps = {} }) {
  const y = L * FH;
  for (const side of [1, -1]) {
    const c = side > 0 ? CZ1 : CZ0;
    const rs = rooms.filter(r => r.side === side).sort((a, b) => a.x0 - b.x0);
    for (const r of rs) {
      const o = doorOpts(r);
      const ops = [];
      if (o) ops.push({ at: r.x0 + 1.1, w: 1.0, type: 'door' });
      if (r.secretDoorAt) ops.push({ at: r.secretDoorAt, w: 1.0, type: 'hole' });
      wall('x', c, r.x0, r.x1, y, FH, side > 0 ? { neg: corrMat, pos: r.mat } : { neg: r.mat, pos: corrMat }, ops);
      if (o) {
        r.door = new Door('x', c, r.x0 + 1.1, { swing: side, hinge: -1, ...o });
        if (o.plate !== false) { const pw = Math.max(PR.tri(o.plate || '') ? 0.95 : 0.3, (o.plate || '').length * 0.07); sgn(o.plate || String(r.num), 'x', c, -side, r.x0 + 1.82 + pw / 2, y + 1.6, { w: pw, h: 0.15, bg: '#1e140a', fg: '#e0c070' }); }
      }
    }
    const z0 = side > 0 ? CZ1 : TZ0, z1 = side > 0 ? TZ1 : CZ0;
    wall('z', 6, z0, z1, y, FH, { neg: rs[0].coreSideMat || corrMat, pos: rs[0].mat }, partitionOps[6 * side] || []);
    for (let i = 1; i < rs.length; i++) {
      if (rs[i].merged) continue;
      wall('z', rs[i].x0, z0, z1, y, FH, { neg: rs[i - 1].mat, pos: rs[i].mat }, partitionOps[rs[i].x0 * side] || []);
    }
  }
}
function coreWalls(L, { coreMat, serviceDoor = true, serviceName = 'служебное помещение', serviceLocked = false, serviceMat = null, lockedMsg = null }) {
  const y = L * FH, h = FH;
  const shaft = col(0x2a2622);
  wall('z', EX0, EZ0, TZ1, y, h, { neg: coreMat, pos: shaft });
  wall('z', EX1, EZ0, TZ1, y, h, { neg: shaft, pos: coreMat });
  wall('x', EZ0, EX0 - T / 2, EX1 + T / 2, y, h, { neg: coreMat, pos: shaft }, [{ at: (EX0 + EX1) / 2, w: 1.4, type: 'open', h: 2.3 }]);
  const sm = serviceMat || col(0x6a6058);
  wall('z', SX0, TZ0, SZ1, y, h, { neg: M.concWall, pos: sm });
  const sx = (SX0 + 6) / 2;
  wall('x', SZ1, SX0, 6 - T / 2, y, h, { neg: sm, pos: coreMat }, serviceDoor ? [{ at: sx, w: 1.0, type: 'door' }] : []);
  if (serviceDoor) return new Door('x', SZ1, sx, { name: serviceName, swing: -1, locked: serviceLocked, lockedMsg: lockedMsg || 'Заперто.' });
}
function liftLobbyDecor(L, fname) {
  const y = L * FH;
  sgn(fname, 'z', TX0, 1, -0.95, y + 2.0, { w: 0.7, h: 0.25 });
  hangSign('ВЫХОД · ЛЕСТНИЦА', 0.95, y + 3.35, -1.45, 0, { w: 1.2, h: 0.2, bg: '#0a2a14', fg: '#6aff9a' });
  const p = onWall('x', EZ0, -1, 1.55); PR.fireExt(p.x, p.z, p.ry);
  PR.plant(0.62, 5.72, { s: 0.75 });
}

// ======================================================================
// ЖИЛЫЕ ЭТАЖИ
const ROOMS = {
  1: { 1: 'standard', 2: 'twin', 3: 'empty', 4: 'pianist', 5: 'lounge', 6: 'knock', 7: 'writer', 8: 'party' },
  2: { 1: 'standard', 2: 'gamer', 3: 'flooded', 4: 'photo', 5: 'kids', 6: 'twin', 7: 'tvroom', 8: 'pool' },
  3: { 1: 'fur', 2: 'wardrobe', 3: 'empty', 4: 'lounge', 5: 'suite', 6: 'party', 8: 'gamer' },
};
const LOCKED = { 1: [6], 2: [6], 3: [4] };
const FLOOR_GROUPS = {
  1: ['01_japan_underground', 'portrait', '06_vintage_photos'],
  2: ['06_vintage_photos', 'portrait', 'art', '01_japan_underground'],
  3: ['03_y2k', '04_retro_consoles', '05_retro_games_arcade', '01_japan_underground'],
};

function buildGuestFloor(L) {
  setLevel(L); const y = L * FH; const fnum = L + 1;
  let rooms = roomsSpec(L);
  rooms.forEach((r, i) => {
    r.num = fnum * 100 + r.idx; r.kind = ROOMS[L][r.idx];
    r.mat = M.rooms[(i + L * 3) % M.rooms.length];
    r.floor = M.roomFloors[(i + L) % M.roomFloors.length];
    r.sound = r.floor === M.parquet ? 'wood' : 'carpet';
  });
  if (L === 3) {
    const a = rooms.find(r => r.idx === 5), b = rooms.find(r => r.idx === 7);
    a.x1 = 30; a.mat = M.rooms[1]; a.floor = M.parquet; a.sound = 'wood';
    a.wins = [21, 27].map(x => ({ at: x, w: 2.2, type: 'window', sill: 0.75, h: 2.1, light: 0.24 }));
    rooms = rooms.filter(r => r !== b);
  }
  if (L === 2) {
    // бассейн занимает два номера: 306 (бывший запертый) и 308
    const a = rooms.find(r => r.idx === 8), b = rooms.find(r => r.idx === 6);
    a.x0 = 18; a.wins = [21, 27].map(x => ({ at: x, w: 2.2, type: 'window', sill: 0.75, h: 2.1, light: 0.3 }));
    rooms = rooms.filter(r => r !== b);
  }
  const pool = rooms.find(r => r.kind === 'pool');
  if (pool) { pool.num = 313; pool.mat = M.vaporWall; pool.floor = M.vaporDeck; pool.sound = 'tile'; pool.secretDoorAt = pool.x1 - 3; }
  towerFloorsAndCeiling(L, rooms, { corrMat: M.carpet, corrSound: 'carpet', coreMat: M.carpet, coreSound: 'carpet' });
  towerOuter(L, rooms, { coreMat: M.corrWall });
  corridorWalls(L, rooms, {
    corrMat: M.corrWall,
    doorOpts: r => {
      if (r.kind === 'pool') return null;
      return {
        name: 'номер ' + r.num, locked: (LOCKED[L] || []).includes(r.idx), plate: String(r.num),
        lockedMsg: ['Заперто. Табличка «Не беспокоить».', 'Заперто. Из-под двери тянет холодом.', 'Заперто. Внутри играет та же музыка, но на полтона ниже.'][r.idx % 3],
        onLocked: r.kind === 'knock' ? () => { S.sfxKnock(3); setTimeout(() => { S.sfxKnock(3); G.subtitle('…кто-то постучал в ответ изнутри.'); }, 1300); } : null,
      };
    },
  });
  coreWalls(L, { coreMat: M.corrWall, serviceName: L === 1 ? 'бельевая' : 'подсобка этажа', serviceDoor: L !== 3, serviceLocked: L === 2, lockedMsg: 'Заперто. На двери нацарапано: «Не там ищешь».' });
  liftLobbyDecor(L, `ЭТАЖ ${fnum}`);
  hangSign(`${fnum}01 – ${fnum}08  →`, 5.9, y + 3.3, 0, P / 2);
  for (const x of [3, 9, 15, 21, 27]) PR.ceilingLamp(x, 0, { y: y + CEIL, intensity: 3, distance: 7, flicker: (x === 15 && L === 2) ? 0.6 : 0 });
  const cg = ['02_weirdcore_liminal', ...FLOOR_GROUPS[L]];
  for (const r of rooms) {
    const c = r.side > 0 ? CZ1 : CZ0;
    for (const off of r.x1 - r.x0 > 6 ? [0, 6] : [0]) {
      // на сдвижной панели секретного входа ничего не висит, иначе после сдвига бра повиснет в воздухе
      const sx = r.x0 + off + 3.0;
      if (!(r.secretDoorAt && Math.abs(sx - r.secretDoorAt) < 1.3)) sconceAt('x', c, -r.side, sx, y + 2.0);
      else sconceAt('x', c, -r.side, r.secretDoorAt - 1.55, y + 2.0);
      if (r.kind === 'pool') continue;
      pic(cg, 'x', c, -r.side, r.x0 + off + 4.5, y + 1.75, 0.72, { frame: 'gold' });
    }
  }
  PR.vending(5.1, TZ1 - T / 2 - 0.4, P);
  PR.chair(5.35, 4.3, -P / 2);
  if (L === 2) maidCart(20.5, -0.7, y);
  if (L === 3) PR.luggageCart(22, 0.55, 0.05);
  zone(6, CZ0, TX1, CZ1, `ЭТАЖ ${fnum} · КОРИДОР`, { reverb: 0.2, amb: 1.25 });
  zone(0, -1.5, 6, TZ1, `ЭТАЖ ${fnum} · ЛИФТОВОЙ ХОЛЛ`, { reverb: 0.25, amb: 1.25 });
  for (const r of rooms) {
    if (r.kind === 'pool') { poolRoom(r); continue; }
    zone(r.x0, r.z0, r.x1, r.z1, 'НОМЕР ' + r.num, { reverb: 0.12, amb: 1.2 });
    furnishRoom(r, L);
  }
  if (L === 1) linenRoom(y);
  if (L === 2) iceRoom(y);
  if (L === 3) tvSecretRoom(y);
}

function maidCart(x, z, y) {
  const g = PR.grp(x, z, 0, y);
  box(1.1, 0.06, 0.5, col(0x8a8a8a), 0, 0.15, 0, { parent: g }); box(1.1, 0.06, 0.5, col(0x8a8a8a), 0, 0.6, 0, { parent: g });
  for (const [a, b] of [[-0.5, -0.2], [0.5, -0.2], [-0.5, 0.2], [0.5, 0.2]]) box(0.03, 1.0, 0.03, col(0x6a6a6a), a, 0, b, { parent: g });
  for (let i = 0; i < 4; i++) box(0.24, 0.08, 0.4, col(0xe8e0d0), -0.38 + i * 0.25, 0.66, 0, { parent: g });
  box(0.3, 0.4, 0.3, col(0x5a2a6a), 0.3, 0.21, 0, { parent: g });
  interact(g, 'Тележка горничной', () => { S.sfxPaper(); G.note(...TXT.maidCart); });
  PR.solid(g, 1.1, 0.5, 1.0); mount(g, 'floor');
}

function furnishRoom(r, L) {
  const F = roomFrame(r); const y = r.y; const groups = FLOOR_GROUPS[L];
  const at = (u, v) => F.p(u, v);
  const RY = F.ry;
  const cx = r.x0 + F.W / 2;
  const oc = r.side > 0 ? TZ1 - T / 2 : TZ0 + T / 2;
  for (const w of (r.wins || [{ at: cx, w: 2.2 }])) PR.curtains('x', oc, w.at - w.w / 2, w.at + w.w / 2, y, -r.side, [0x7a2030, 0x204a6a, 0x5a4220, 0x4a2a5a][r.idx % 4]);
  const lightOn = !['empty', 'photo', 'tvroom'].includes(r.kind);
  const lampAt = (u, v, kind) => { const [x, z] = at(u, v); PR.ceilingLamp(x, z, { y: y + CEIL, intensity: 2.6, distance: 6, on: lightOn, kind }); };
  if (F.W > 6) { lampAt(3, 2.45, 'pendant'); lampAt(9, 2.45, 'dome'); } else lampAt(3, 2.45, r.idx % 3 === 0 ? 'pendant' : 'dome');
  const bedEast = (v, opts = {}) => PR.bed(...at(F.W - 1.14, v), RY('west'), opts);
  const nsEast = (v, opts) => PR.nightstand(...at(F.W - 0.33, v), RY('west'), opts);
  const phone = phoneMsg(r.num);
  const P_ = (g, wl, t, yy, size, o) => F.pic(g, wl, t, yy, size, o);
  const onTop = (g, lx = 0, lz = 0) => PR.top(g, lx, lz).toArray();
  switch (r.kind) {
    case 'standard': case 'knock': case 'fur': default: {
      bedEast(2.5, { color: [0x7a2030, 0x204a7a, 0x5a5a20][r.idx % 3], msg: r.kind === 'fur' ? 'На подушке — длинный светлый волос и клочок чёрного меха.' : null });
      nsEast(1.1, { phone, lamp: false }); nsEast(3.9, { lamp: true });
      const dr = PR.dresser(...at(0.37, 2.9), RY('east'), { w: 1.3 });
      PR.tv(...onTop(dr, 0, 0.06), RY('east'));
      PR.armchair(...at(2.2, 3.95), RY('east') - 0.5);
      PR.rug(...at(2.6, 2.4), 2.2, 1.6, TX.carpetOrnament('#5a1a22', '#a07a3a', 'rug'));
      P_(groups, 'east', 2.5, 1.95, 0.9); P_(groups, 'west', 1.2, 1.7, 0.6); P_(groups, 'door', 4.1, 1.7, 0.6);
      if (r.kind === 'fur') PR.coatRack(...at(5.4, 4.4), 1);
      break;
    }
    case 'twin': {
      PR.bed(...at(F.W - 1.14, 1.55), RY('west'), { double: false, color: 0x2a5a3a });
      PR.bed(...at(F.W - 1.14, 3.65), RY('west'), { double: false, color: 0x2a5a3a });
      nsEast(2.6, { phone, lamp: true });
      const d = PR.desk(...at(0.42, 2.8), RY('east')); PR.chair(...at(1.1, 2.8), RY('west'));
      PR.radio(...onTop(d, -0.3, 0), RY('east'));
      P_(groups, 'east', 2.6, 1.9, 0.55); P_(groups, 'west', 1.2, 1.7, 0.6); P_(groups, 'door', 4.1, 1.7, 0.6);
      break;
    }
    case 'empty': {
      PR.chair(...at(3, 3.7), RY('win'));
      PR.book(at(3.7, 3.55)[0], y, at(3.7, 3.55)[1], 0.7, 'libGuenonIllusion', { color: 0x2a2a2a });
      P_(['02_weirdcore_liminal', ...groups], 'east', 2.45, 1.8, 1.2); P_(['02_weirdcore_liminal', ...groups], 'west', 2.45, 1.8, 0.7);
      PR.note(...at(3.5, 3.1).slice(0, 1), y, at(3.5, 3.1)[1], 0.4, 'Записка на полу', 'Я сижу здесь и смотрю на солнце уже третий день.\nОно не садится.\nОно никогда не садится.');
      break;
    }
    case 'pianist': case 'writer': {
      const d = PR.desk(...at(0.42, 3.3), RY('east')); PR.chair(...at(1.1, 3.3), RY('west'));
      PR.tableLamp(...onTop(d, -0.45, -0.1));
      if (r.kind === 'pianist') { PR.note(...onTop(d, 0.1, 0), 0.2, ...noteArgs('pianistLetter')); PR.radio(...onTop(d, 0.42, -0.1), RY('east')); }
      else PR.computer(...onTop(d, 0.25, -0.05), RY('east'), 'писатель_207', [
        { name: 'роман/глава_1.txt', text: 'Глава 1. Отель стоял посреди пустыни, как забытая на столе чашка. Солнце висело над ним, не решаясь опуститься.' },
        { name: 'роман/глава_2.txt', text: 'Глава 2. Портье выдал ему ключ от номера, которого не было в плане. «Вам понравится», — сказал он, не поднимая глаз.' },
        { name: 'роман/глава_последняя.txt', text: '(файл пуст)\n\nДата изменения: 03.03.1999 03:33' },
      ]);
      PR.shelf(...at(F.W - 0.32, 1.4), RY('west'), { fill: 'books', w: 1.6, color: 0x3a2214, d: 0.4 });
      PR.bed(...at(F.W - 1.14, 3.75), RY('west'), { double: false, color: 0x4a3a1a });
      P_(groups, 'west', 1.4, 1.75, 0.6); P_(groups, 'door', 3.0, 1.7, 0.6); P_(groups, 'east', 3.75, 1.9, 0.7);
      break;
    }
    case 'kids': {
      PR.bunk(...at(F.W - 1.14, 1.6), RY('west'));
      const t = PR.table(...at(2.4, 3.0), { w: 0.7, h: 0.5, round: true, color: '#6a4a2a' });
      PR.chair(...at(2.4, 3.75), RY('door'), { color: 0x2a4a6a, seatColor: 0x7a2a2a });
      PR.tv(...at(0.5, 1.6).slice(0, 1), y, at(0.5, 1.6)[1], RY('east'), { on: true });
      PR.note(...onTop(t, 0.1, 0), 0.3, ...noteArgs('sonyaDrawing'));
      teddy(...at(4.6, 3.6), y);
      const kg = ['06_vintage_photos', '05_retro_games_arcade', ...groups];
      P_(kg, 'west', 3.4, 1.6, 0.5); P_(kg, 'door', 3.2, 1.6, 0.5); P_(kg, 'east', 3.8, 1.6, 0.5);
      break;
    }
    case 'gamer': {
      bedEast(3.3, { color: 0x4a1a6a }); nsEast(1.9, { lamp: true });
      const d = PR.desk(...at(0.42, 2.6), RY('east')); PR.chair(...at(1.1, 2.6), RY('west'));
      PR.tv(...onTop(d, 0.1, 0.06), RY('east'), { on: true });
      const cg = ['04_retro_consoles', '05_retro_games_arcade', ...groups];
      P_(cg, 'west', 1.0, 1.8, 0.5); P_(cg, 'west', 4.0, 1.8, 0.5); P_(cg, 'east', 3.3, 2.0, 0.8);
      PR.rug(...at(2.5, 2.4), 2, 2, TX.carpetPlain('#4a2a5a', 9));
      break;
    }
    case 'party': {
      bedEast(2.5, { color: 0x7a1a4a }); nsEast(1.1, { lamp: true });
      const t = PR.table(...at(2.2, 2.2), { w: 1.2, d: 0.8, color: '#2a1810' });
      for (let i = 0; i < 6; i++) PR.glass(...onTop(t, -0.45 + i * 0.18, (i % 2 ? 0.2 : -0.15)), { wine: i % 2 === 0 });
      PR.bottle(...onTop(t, 0.35, 0.05), 0x4a0a1a);
      PR.bottle(at(5.5, 4.5)[0], y, at(5.5, 4.5)[1], 0x1a4a1a);
      PR.sofa(...at(0.62, 3.4), RY('east'), 0x5a1a40, 1.8);
      PR.ceilingFan(...at(3, 1.4), y + CEIL);
      P_(groups, 'east', 2.5, 2.0, 0.9); P_(groups, 'west', 3.4, 2.05, 0.8); P_(groups, 'door', 4.1, 1.7, 0.6);
      break;
    }
    case 'photo': {
      const [ax, az] = at(3, 2.4); anchor(ax, y + 2.6, az, { color: 0xff1020, intensity: 4, distance: 7 });
      const t = PR.table(...at(0.55, 2.4), { w: 0.8, d: 2.6, color: '#1a1a1a' });
      for (let i = 0; i < 3; i++) { const [bx, bz] = at(0.55, 1.6 + i * 0.8); box(0.4, 0.06, 0.3, col(0x2a2a2a), bx, y + 0.75, bz); }
      const pg = ['06_vintage_photos', '02_weirdcore_liminal', ...groups];
      const [sx0, sz0] = at(3.2, 0.1), [, sz1] = at(3.2, 4.8);
      box(0.012, 0.012, Math.abs(sz1 - sz0), col(0x8a8a8a), sx0, y + 2.4, (sz0 + sz1) / 2);
      for (let i = 0; i < 3; i++) { const [x, z] = at(3.2, 1.2 + i * 1.3); const p = picture(pg, x, y + 2.15, z, P / 2, 0.42, { frame: 'white', qa: false }); mount(p, 'hang'); }
      P_(pg, 'east', 2.4, 1.8, 0.7);
      PR.note(...onTop(t, 0, -0.9), 0.1, 'Конверт с негативами', 'На всех негативах — один и тот же пустой коридор.\nНа последнем кадре в конце коридора кто-то стоит.\nНа отпечатке его уже нет.');
      break;
    }
    case 'lounge': {
      PR.sofa(...at(3, 4.0), RY('door'), 0x1a4a4a, 2.2);
      PR.armchair(...at(1.0, 2.4), RY('east'), 0x5a3a1a);
      const t = PR.table(...at(3, 3.0), { w: 1.0, d: 0.6, h: 0.45, color: '#2a1810' });
      PR.glass(...onTop(t, -0.2, 0)); PR.glass(...onTop(t, 0.15, 0.1), { wine: true });
      PR.floorLamp(...at(5.5, 4.4));
      const dr = PR.dresser(...at(F.W - 0.37, 2.2), RY('west'), { w: 1.3 }); PR.tv(...onTop(dr, 0, 0.06), RY('west'));
      PR.ceilingFan(...at(3, 2.0), y + CEIL);
      P_(groups, 'west', 3.6, 1.8, 0.8); P_(groups, 'east', 3.7, 2.1, 0.5); P_(groups, 'door', 4.1, 1.8, 0.7);
      break;
    }
    case 'tvroom': {
      bedEast(2.5, { color: 0x1a1a4a });
      const [cx_, cz_] = at(0.4, 2.5);
      box(0.5, 0.5, 2.0, col(0x2a1c14), cx_, y, cz_); addCollider(cx_ - 0.25, y, cz_ - 1, cx_ + 0.25, y + 0.5, cz_ + 1);
      for (let i = 0; i < 4; i++) { const [tx, tz] = at(0.48, 1.95 + (i % 2) * 1.1); PR.tv(tx, y + 0.5 + (i > 1 ? 0.48 : 0), tz, RY('east'), { on: true }); }
      P_(['03_y2k', ...groups], 'east', 2.5, 2.0, 0.9); P_(['03_y2k', ...groups], 'door', 4.1, 1.8, 0.6);
      break;
    }
    case 'flooded': {
      const wm = new THREE.MeshLambertMaterial({ map: TX.waterTex().clone(), transparent: true, opacity: 0.7, emissive: 0x0a3038, color: 0x88c8d0, depthWrite: false });
      wm.map.needsUpdate = true; wm.map.repeat.set(5, 4); wm.opacity = 0.55;
      const [wx, wz] = at(F.W / 2, F.D / 2);
      plane(F.W - 0.2, F.D - 0.2, wm, wx, y + 0.1, wz, -P / 2, 0).userData.noRay = true;
      W.animated.push((dt, t) => { wm.map.offset.set(t * 0.02, Math.sin(t * 0.3) * 0.05); });
      W.surfaces.push({ minX: r.x0 + 0.2, maxX: r.x1 - 0.2, minZ: Math.min(r.z0, r.z1) + 0.2, maxZ: Math.max(r.z0, r.z1) - 0.2, y: () => y + 0.001, sound: 'water' });
      bedEast(2.5, { color: 0x2a3a4a, msg: 'Матрас влажный. Сквозь воду виден ковёр с тем же узором, что и в коридоре.' });
      PR.chair(...at(2.5, 2.0), 0.7);
      P_(['02_weirdcore_liminal', ...groups], 'east', 2.5, 2.0, 0.9); P_(groups, 'west', 2.5, 1.9, 0.7); P_(groups, 'door', 4.1, 1.9, 0.55);
      zone(r.x0, r.z0, r.x1, r.z1, 'НОМЕР ' + r.num + ' · ВОДА', { reverb: 0.4, muffle: 900 });
      break;
    }
    case 'wardrobe': {
      bedEast(2.5, { color: 0x3a1a3a }); const ns = nsEast(1.1, { phone, lamp: false });
      PR.wardrobe(...at(0.42, 2.5), RY('east'), {
        label: 'Залезть в шкаф', action: () => { S.sfxDoorOpen(); G.teleport(4.8, y, -3.3, 0, 'Из шкафа дует. Ты протискиваешься между пальто…'); },
      });
      PR.armchair(...at(2.6, 3.95), RY('east') - 0.4);
      PR.note(...onTop(ns, 0.1, 0), 0, 'Жалоба гостя', 'Администрации.\nИз шкафа в моём номере постоянно дует и слышно телевизоры.\nПроверьте, пожалуйста, что за стеной.\n— гость 402');
      P_(groups, 'east', 2.5, 2.0, 0.9); P_(groups, 'door', 4.1, 1.8, 0.6); P_(groups, 'west', 4.2, 1.8, 0.45);
      break;
    }
    case 'suite': {
      PR.sofa(...at(3, 3.85), RY('door'), 0x6a3a2a, 2.4);
      PR.armchair(...at(1.2, 2.4), RY('east') + 0.3, 0x5a2a1a); PR.armchair(...at(4.8, 2.4), RY('west') - 0.3, 0x5a2a1a);
      const t = PR.table(...at(3, 2.6), { w: 1.2, d: 0.7, h: 0.45, color: '#2a1810' });
      PR.bottle(...onTop(t, 0.2, 0), 0x2a4a1a); PR.glass(...onTop(t, -0.1, 0.1), { wine: true }); PR.glass(...onTop(t, -0.3, -0.1), { wine: true });
      const sb = PR.dresser(...at(0.37, 3.3), RY('east'), { w: 1.4 });
      PR.recordPlayer(...onTop(sb, 0, 0), RY('east')); PR.snowGlobe(...onTop(sb, 0.48, 0));
      PR.ashtray(...onTop(t, 0.45, -0.15));
      PR.bed(...at(F.W - 1.14, 2.45), RY('west'), { color: 0x8a6a2a });
      PR.nightstand(...at(F.W - 0.33, 1.0), RY('west'), { phone }); const ns4 = PR.nightstand(...at(F.W - 0.33, 3.9), RY('west')); PR.postcard(...onTop(ns4, -0.1, 0.05), 0.2, 'postcard2');
      PR.floorLamp(...at(6.6, 4.4));
      PR.rug(...at(3, 3.0), 3.4, 2.4, TX.carpetOrnament('#6a2a1a', '#c09040', 'suite'));
      const sg = ['art', 'portrait', ...groups];
      P_(sg, 'east', 2.45, 2.0, 1.0, { frame: 'gold' }); P_(sg, 'west', 1.4, 1.9, 0.8, { frame: 'gold' }); P_(sg, 'door', 4.0, 1.8, 0.7, { frame: 'gold' }); P_(sg, 'door', 8.5, 1.8, 0.8, { frame: 'gold' });
      zone(r.x0, r.z0, r.x1, r.z1, 'ЛЮКС 405', { reverb: 0.15, amb: 1.25 });
      break;
    }
  }
}
function teddy(x, z, y) {
  const g = PR.grp(x, z, 0.4, y);
  const m = col(0x9a6a3a);
  const b = new THREE.Mesh(new THREE.IcosahedronGeometry(0.13, 1), m); b.position.y = 0.13; g.add(b);
  const h = new THREE.Mesh(new THREE.IcosahedronGeometry(0.09, 1), m); h.position.y = 0.32; g.add(h);
  for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.IcosahedronGeometry(0.035, 0), m); e.position.set(s * 0.05, 0.43, 0); e.scale.y = 2; g.add(e); }
  interact(g, 'Обнять плюшевого зайца', () => { S.sfxSit(); G.toast('На ухе вышито: «Соня». Он пахнет газировкой «Закат».'); });
  mount(g, 'floor');
}
function phoneMsg(num) {
  const msgs = [
    '«Ресепшен слушает… Ресепшен слушает… Ресепшен слушает…»',
    '«Ваш номер оплачен. Выезд не предусмотрен. Приятного отдыха».',
    'В трубке — тихая музыка из лобби. И чьё-то дыхание.',
    '«Будильник на 3:33 установлен». Гудки.',
    'Длинный гудок. Потом кто-то тихо говорит: «ты опять здесь».',
    '«Обслуживание номеров не работает с 1999 года».',
  ];
  return msgs[num % msgs.length];
}

// ======================================================================
// СЛУЖЕБНЫЕ КОМНАТЫ ЯДРА
const SZC = (TZ0 + SZ1) / 2;
function linenRoom(y) {
  PR.shelf(SX1 - T / 2 - 0.24, SZC - 0.8, -P / 2, { fill: 'towels', w: 2.2, color: 0x7a7a7a, d: 0.45 });
  PR.ceilingLamp((SX0 + SX1) / 2, SZC, { y: y + CEIL, kind: 'tube', color: 0xd0f0ff, intensity: 2, distance: 5, flicker: 0.4 });
  pic(['02_weirdcore_liminal'], 'x', TZ0, 1, (SX0 + 6) / 2, y + 1.7, 0.7, { frame: 'black' });
  PR.note(SX0 + 0.6, y, SZC + 0.6, 0.3, ...noteArgs('maidLinen'));
  trigger(SX0, TZ0, SX1, SZ1, () => G.secret('linen', 'Бельевая'));
  zone(SX0, TZ0, SX1, SZ1, 'БЕЛЬЕВАЯ', { reverb: 0.05, buzz: 0.02 });
}
function iceRoom(y) {
  const g = PR.grp(SX1 - T / 2 - 0.42, SZC, -P / 2, y);
  box(0.8, 1.6, 0.8, col(0x9a9aa0), 0, 0, 0, { parent: g });
  interact(g, 'Взять лёд', () => { S.sfxVending(); G.toast('Лёд с запахом хлорки. Где-то рядом бассейн?'); }); PR.solid(g, 0.8, 0.8, 1.6); mount(g, 'floor');
  PR.ceilingLamp((SX0 + SX1) / 2, SZC, { y: y + CEIL, kind: 'tube', color: 0xd0f0ff, intensity: 2, distance: 5 });
  zone(SX0, TZ0, SX1, SZ1, 'ПОДСОБКА ЭТАЖА', { reverb: 0.05, buzz: 0.03 });
}
function tvSecretRoom(y) {
  for (let i = 0; i < 6; i++) PR.tv(SX0 + 0.55 + (i % 2) * 0.95, y + Math.floor(i / 2) * 0.5, TZ0 + T / 2 + 0.45, 0, { on: true });
  for (let k = 1; k < 3; k++) box(1.95, 0.02, 0.6, col(0x2a2018), SX0 + 1.03, y + k * 0.5 - 0.02, TZ0 + T / 2 + 0.42);
  PR.tv(SX0 + 0.65, y, SZ1 - 0.62, P / 2 + 0.3, { on: true, screen: TX.screenTex(['NO SIGNAL', '', 'КАНАЛ 0', '', 'ВЫ УЖЕ', 'СМОТРИТЕ ЭТО']) });
  pic(['03_y2k', '02_weirdcore_liminal'], 'z', SX1, -1, SZC + 1.4, y + 1.9, 0.6);
  PR.candle(SX1 - 0.4, y, SZ1 - 0.45);
  PR.wardrobe(SX1 - T / 2 - 0.32, SZC - 0.6, -P / 2, { label: 'Вылезти через шкаф', action: () => { S.sfxDoorOpen(); G.teleport(7.6, y, -3.9, -P / 2, 'Ты выбираешься обратно в номер 402.'); } });
  trigger(SX0, TZ0, SX1, SZ1, () => G.secret('tvs', 'Комната телевизоров'));
  zone(SX0, TZ0, SX1, SZ1, '???', { reverb: 0.05, muffle: 1400 });
}
function poolRoom(r) {
  const y = r.y, at = r.secretDoorAt, c = CZ0;
  const pg = new THREE.Group(); W.group.add(pg);
  const panel = new THREE.Mesh(new THREE.BoxGeometry(1.0, 2.2, 0.06), M.corrWall); panel.position.set(at, y + 1.1, c + T / 2 + 0.03); pg.add(panel);
  const pp = picture(['02_weirdcore_liminal'], at, y + 1.5, c + T / 2 + 0.06, 0, 0.7, { frame: 'gold', parent: pg, qa: false });
  const col0 = addCollider(at - 0.5, y, c - 0.1, at + 0.5, y + 2.2, c + 0.2);
  let opened = false;
  pp.userData.interact.label = 'Поправить картину';
  pp.userData.interact.action = () => {
    if (opened) { G.showPicture(pp.userData.img); return; }
    opened = true; S.sfxSlide(); col0.enabled = false;
    let k = 0; const iv = setInterval(() => { k++; pg.position.x = k * 0.03; if (k >= 37) clearInterval(iv); }, 16);
    G.toast('Картина сдвинулась вместе со стеной…');
  };
  interact(panel, 'Постучать по стене', () => { S.sfxKnock(2); G.toast('Звук гулкий. За стеной пустота.'); });
  sgn('3̶1̶3̶', 'x', c, 1, at - 0.85, y + 1.6, { w: 0.3, h: 0.15, bg: '#1e140a', fg: '#e0c070' });
  const DK = 0.32, x0 = r.x0 + 1.6, x1 = r.x1 - 1.6, z0 = TZ0 + 1.0, z1 = CZ0 - 1.6;
  for (const rr of rectMinus([r.x0, TZ0, r.x1, CZ0], [x0, z0, x1, z1])) {
    floorRect(rr[0], rr[1], rr[2], rr[3], y + DK, M.vaporDeck, 'tile');
    block(rr[0], y + 0.003, rr[1], rr[2], y + DK - 0.02, rr[3], M.vaporBottom, { collide: false });
  }
  floorRect(x0, z0, x1, z1, y + 0.02, M.vaporBottom, 'water');
  const wt = TX.waterTex().clone(); wt.needsUpdate = true; wt.repeat.set(4, 1.4);
  const wm = new THREE.MeshBasicMaterial({ map: wt, transparent: true, opacity: 0.5, color: 0xb0f4ff, depthWrite: false });
  plane(x1 - x0, z1 - z0, wm, (x0 + x1) / 2, y + DK - 0.08, (z0 + z1) / 2, -P / 2, 0).userData.noRay = true;
  // надувной круг покачивается на воде
  const ring = new THREE.Group(); ring.position.set(23.6, y + DK - 0.06, -4.0); W.group.add(ring);
  for (let i = 0; i < 8; i++) { const seg = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.13, 6, 4, P / 4 + 0.01), col(i % 2 ? 0xfff0f4 : 0xff5aa8)); seg.rotation.set(P / 2, 0, i * P / 4); ring.add(seg); }
  ring.children.forEach(m => { m.userData.noMerge = true; m.userData.noRay = true; });
  W.animated.push((dt, t) => { wt.offset.set(t * 0.025, Math.sin(t * 0.35) * 0.05); ring.position.y = y + DK - 0.06 + Math.sin(t * 1.3) * 0.02; ring.rotation.y = t * 0.05; ring.position.x = 23.6 + Math.sin(t * 0.11) * 1.4; });
  anchor((x0 + x1) / 2 - 2, y + 0.6, (z0 + z1) / 2, { color: 0x40e0ff, intensity: 5, distance: 7 });
  anchor((x0 + x1) / 2 + 2.5, y + 2.6, (z0 + z1) / 2, { color: 0xff5ac0, intensity: 4, distance: 8 });
  glow((x0 + x1) / 2, y + CEIL - 0.01, (z0 + z1) / 2, 6, 0x40d0ff, 0.2, { rx: P / 2 });
  // колонны с розовым мрамором по углам чаши
  const pm = texMat('vapCol', TX.marble('#f0c8dc', '#c8a0d8'), 0xffffff, {}, 0);
  for (const [cx, cz] of [[x0 - 0.35, z0 - 0.4], [x1 + 0.35, z0 - 0.4]]) PR.column(cx, cz, CEIL - DK, { r: 0.2, mat: pm, y: y + DK });
  const lounger = (lx, lz) => {
    const g = PR.grp(lx, lz, 0, y + DK);
    box(0.6, 0.35, 1.8, col(0xf0e8f0), 0, 0, 0, { parent: g }); box(0.6, 0.5, 0.08, col(0xf0e8f0), 0, 0.35, -0.86, { parent: g });
    box(0.5, 0.04, 1.2, col(0x7ad8e0), 0, 0.35, 0.2, { parent: g }); PR.solid(g, 0.6, 1.8, 0.4); mount(g, 'floor');
    interact(g, 'Прилечь на шезлонг', () => G.sit({ x: lx, y: y + DK + 0.8, z: lz - 0.3, yaw: P, lie: true }));
    return g;
  };
  lounger(r.x1 - 0.6, -3.3); lounger(r.x0 + 0.6, -3.9);
  const uni = PR.grp(r.x1 - 0.6, -2.95, 0, y + DK + 0.395);
  box(0.35, 0.06, 0.3, col(0x3a3a5a), 0, 0, 0, { parent: uni }); box(0.25, 0.04, 0.2, col(0xe8e0d0), 0, 0.06, 0, { parent: uni });
  PR.hitBox(uni, 0.4, 0.15, 0.4); interact(uni, 'Сложенная униформа', () => { S.sfxPaper(); G.note(...TXT.maidPool); }); mount(uni, 'table');
  PR.bust(r.x0 + 0.7, -2.2, P / 2, 'Осмотреть статую', [
    'Гипсовый Аполлон в солнечных очках, которые кто-то нарисовал маркером. Очки не стираются.',
    'Табличка: «Копия копии. Вода в бассейне — тоже копия: настоящую выпили в 1999-м».',
  ], { color: 0xf0d0e0, y: y + DK });
  PR.plant(r.x1 - 0.55, -1.95, { y: y + DK, s: 0.9 });
  sgn('PISCINE', 'x', TZ0, 1, (r.x0 + r.x1) / 2, y + DK + 2.3, { w: 2.2, h: 0.5, bg: '#14081e', fg: '#ff6ad0', glowing: true });
  glow((r.x0 + r.x1) / 2, y + DK + 2.3, TZ0 + T / 2 + 0.04, 3.2, 0xff40c0, 0.22, { rx: 0 });
  PR.sunRelief(r.x1 - T / 2 - 0.005, y + DK + 2.2, -4.2, -P / 2, 0.85);
  pic(['02_weirdcore_liminal'], 'z', r.x0, 1, -4.6, y + DK + 1.7, 0.9, { frame: 'pink' });
  PR.book(r.x0 + 2.4, y + DK, -2.0, 0.3, 'libHeraclitus', { color: 0x1a5a6a });
  PR.note(r.x0 + 1.2, y + DK, CZ0 - 0.45, 0.2, 'Табличка у бассейна', 'БАССЕЙН ЗАКРЫТ НА СЕЗОН.\nPISCINE FERMÉE · POOL CLOSED\n\nСезон: всегда.\nСпасатель: на обеде с 1999 года.');
  trigger(r.x0, TZ0, r.x1, CZ0, () => G.secret('pool', 'Номер 313 · бассейн'));
  zone(r.x0, TZ0, r.x1, CZ0, 'PISCINE · НОМЕР 313', { reverb: 0.75, muffle: 1300, amb: 1.35 });
}

// ======================================================================
// ПЕРВЫЙ ЭТАЖ
function buildGround() {
  setLevel(0); const y = 0;
  const holeBelow = [LA[0], SZ0, LB[1], SZ1];
  for (const r of rectsMinus([[TX0, TZ0, 6, TZ1]], [holeBelow, CAB, SERV])) floorRect(r[0], r[1], r[2], r[3], y, M.marble, 'marble');
  floorRect(SERV[0], SERV[1], SERV[2], SERV[3], y, M.pinkTile, 'tile');
  floorRect(6, CZ0, TX1, CZ1, y, M.carpet, 'carpet');
  floorRect(6, CZ1, 18, TZ1, y, M.tileFloor, 'tile');
  floorRect(18, CZ1, TX1, TZ1, y, M.parquet, 'wood');
  floorRect(6, TZ0, 18, CZ0, y, M.tileFloor, 'tile');
  floorRect(18, TZ0, 24, CZ0, y, M.concrete, 'concrete');
  floorRect(24, TZ0, TX1, CZ0, y, texMat('arcadeF', TX.carpetPlain('#2a1840', 12), 0xffffff, {}, 2), 'carpet');
  for (const r of rectMinus([TX0, TZ0, TX1, TZ1], holeBelow)) ceilRect(r[0], r[1], r[2], r[3], y + CEIL, M.ceil);
  stairFascia(y, M.lobbyWall);
  const spec = {
    1: ['подсобка', M.concWall, 'ПОДСОБКА'], 3: ['кухня', M.tileW, 'КУХНЯ'], 5: ['бар «Полдень»', M.rooms[1], 'БАР'], 7: ['бар «Полдень»', M.rooms[1], null],
    2: ['мужская уборная', M.tileW, 'М'], 4: ['женская уборная', M.tileW, 'Ж'], 6: ['комната персонала', M.concWall, 'ПЕРСОНАЛ'], 8: ['игровой зал', M.rooms[3], 'ИГРЫ'],
  };
  const rooms = roomsSpec(0);
  rooms.forEach(r => { [r.name, r.mat, r.plate] = spec[r.idx]; });
  rooms.find(r => r.idx === 7).merged = true;
  rooms.find(r => r.idx === 2).coreSideMat = M.pinkTile;
  corridorWalls(0, rooms, {
    corrMat: M.corrWall,
    doorOpts: r => r.plate ? { name: r.name, plate: r.plate } : null,
    partitionOps: { [-6]: [{ at: -5.7, w: 0.7, type: 'gap', sill: 0.25, h: 1.0 }] },
  });
  wall('x', TZ1, TX0, 6, y, FH, { neg: M.lobbyWall, pos: M.cloakWall }, [], { ceil: CEIL });
  wall('x', TZ1, 6, 12, y, FH, { neg: M.concWall, pos: M.restWall }, [], { ceil: CEIL });
  wall('x', TZ1, 12, 18, y, FH, { neg: M.tileW, pos: M.restWall }, [{ at: 15, w: 1.0, type: 'door' }], { ceil: CEIL });
  wall('x', TZ1, 18, TX1, y, FH, { neg: M.rooms[1], pos: M.restWall }, [{ at: 26, w: 3.6, type: 'open', h: 3.0 }], { ceil: CEIL });
  new Door('x', TZ1, 15, { name: 'дверь в ресторан', swing: 1 });
  wall('x', TZ0, TX0, SX0, y, FH, { neg: M.casinoWall, pos: M.concWall }, [], { ceil: CEIL });
  wall('x', TZ0, SX0, 6, y, FH, { neg: M.casinoWall, pos: M.pinkTile }, [], { ceil: CEIL });
  wall('x', TZ0, 6, 18, y, FH, { neg: M.casinoWall, pos: M.tileW }, [], { ceil: CEIL });
  wall('x', TZ0, 18, 24, y, FH, { neg: M.casinoWall, pos: M.concWall }, [], { ceil: CEIL });
  wall('x', TZ0, 24, TX1, y, FH, { neg: M.casinoWall, pos: M.rooms[3] }, [{ at: 27, w: 1.0, type: 'door' }], { ceil: CEIL });
  new Door('x', TZ0, 27, { name: 'дверь в казино', swing: -1, mat: texMat('doorRed', TX.wood('#5a1a1a'), 0xffffff, {}, 1) });
  wall('z', TX1, CZ0, CZ1, y, FH, { neg: M.corrWall, pos: M.ext }, [{ at: 0, w: 1.8, type: 'window', sill: 0.5, h: 2.6, light: 0.3 }], { inside: -1, ceil: CEIL });
  wall('z', TX1, CZ1, TZ1, y, FH, { neg: M.rooms[1], pos: M.ext }, [{ at: 3.85, w: 1.8, type: 'window', sill: 0.75, h: 2.1 }], { inside: -1, ceil: CEIL });
  wall('z', TX1, TZ0, CZ0, y, FH, { neg: M.rooms[3], pos: M.ext }, [{ at: -3.85, w: 1.8, type: 'window', sill: 0.75, h: 2.1 }], { inside: -1, ceil: CEIL });
  wall('z', TX0, TZ0 - T / 2, TZ1 + T / 2, y, FH, { neg: M.lobbyWall, pos: M.lobbyWall }, [{ at: 1.1, w: 4.8, type: 'open', h: 3.3 }], { ceil: CEIL });
  coreWalls(0, { coreMat: M.lobbyWall, serviceDoor: false, serviceMat: M.pinkTile });
  hangSign('ВЫХОД · ЛЕСТНИЦА', 0.95, y + 3.35, -1.45, 0, { w: 1.2, h: 0.2, bg: '#0a2a14', fg: '#6aff9a' });
  hangSign('←  ВЕСТИБЮЛЬ', 5.9, y + 3.3, 0, P / 2);
  sgn('ПОДВАЛ ↓   ЭТАЖИ ↑', 'x', EZ0, -1, 1.55, y + 2.0, { w: 0.8, h: 0.2 });
  for (const x of [9, 15, 21, 27]) PR.ceilingLamp(x, 0, { y: y + CEIL, intensity: 2.6, distance: 7, flicker: x === 21 ? 0.5 : 0 });
  PR.ceilingLamp(3, 1, { y: y + CEIL, intensity: 3, distance: 7 });
  zone(6, CZ0, TX1, CZ1, 'СЛУЖЕБНЫЙ КОРИДОР', { reverb: 0.22, amb: 1.25 });
  zone(0, -1.5, 6, TZ1, 'ЛИФТОВОЙ ХОЛЛ', { reverb: 0.3, amb: 1.3 });
  for (const r of rooms) if (r.side > 0 && r.idx !== 7) sconceAt('x', CZ1, -1, r.x0 + 3.0, y + 2.0);
  pic(['02_weirdcore_liminal', 'art'], 'x', CZ0, 1, 15.5, y + 1.8, 0.75, { frame: 'gold' });
  pic(['02_weirdcore_liminal', 'art'], 'x', CZ0, 1, 21.5, y + 1.8, 0.75, { frame: 'gold' });

  // Подсобка
  PR.shelf(12 - T / 2 - 0.24, 3.85, -P / 2, { fill: 'boxes', w: 3, d: 0.45 });
  PR.shelf(8.4, TZ1 - T / 2 - 0.24, P, { fill: 'boxes', w: 2.4, d: 0.45 });
  PR.ceilingLamp(9, 3.8, { y: y + CEIL, kind: 'pendant', intensity: 2.2, distance: 5, flicker: 0.3 });
  PR.stackedChairs(6.5, 5.5, 0.3, 6);
  PR.sheetCovered(9.4, 4.0, 0.2, 1.6, 0.9, 0.9);
  box(0.6, 0.6, 0.6, col(0x6a5034), 9.6, y, 2.4); addCollider(9.3, y, 2.1, 9.9, y + 0.6, 2.7);
  PR.pickup(9.6, y + 0.6, 2.4, 'archiveKey', 'ключ от архива', 'Латунный ключ с биркой «АРХИВ · подвал».\nНа обороте бирки карандашом: «полка 1999 — не полка».', g => PR.keyMesh(g));
  pic(['portrait', 'art'], 'z', 6, 1, 4.6, y + 1.8, 0.7);
  PR.note(10.5, y, 2.6, 0.4, 'Накладная', 'Списано: 300 стульев, 300 ламп, 1 солнце (запасное).\nМесто хранения: подвал.');
  trigger(6, CZ1, 12, TZ1, () => G.secret('storage', 'Подсобка'));
  zone(6, CZ1, 12, TZ1, 'ПОДСОБКА', { reverb: 0.05 });
  // Кухня
  PR.fridge(16.6, TZ1 - T / 2 - 0.33, P); PR.fridge(17.4, TZ1 - T / 2 - 0.33, P);
  PR.counter(12 + T / 2, 2.4, 12.8, 5.4, 0.95, { top: 0x7a7a7a, front: '#5a5a5a' });
  for (let i = 0; i < 4; i++) PR.glass(12.45, y + 0.95, 2.8 + i * 0.3, { wine: i % 2 === 1 });
  PR.bottle(12.45, y + 0.95, 4.2, 0x6a4a0a);
  const cake = PR.grp(12.45, 4.9, 0, y + 0.95);
  cyl(0.16, 0.16, 0.12, 14, col(0xf0e0e8), 0, 0, 0, { parent: cake }); cyl(0.16, 0.16, 0.02, 14, col(0xc04060), 0, 0.12, 0, { parent: cake });
  interact(cake, 'Торт «С открытием!»', () => G.toast('Свечи не тронуты. Крем не тает, хотя на кухне тепло.')); mount(cake, 'table');
  PR.ceilingLamp(15, 3.8, { y: y + CEIL, kind: 'tube', color: 0xfff0d8, intensity: 2.5, distance: 6 });
  pic(['06_vintage_photos'], 'z', 18, -1, 3.0, y + 1.7, 0.6, { frame: 'white' });
  zone(12, CZ1, 18, TZ1, 'КУХНЯ', { reverb: 0.15, buzz: 0.02 });
  // Бар
  PR.counter(19, 4.7, 23.5, 5.3, 1.1, { top: 0x0a0806, front: '#4a1420' });
  for (let i = 0; i < 4; i++) PR.stool(19.6 + i * 1.1, 4.15);
  box(4.5, 1.1, 0.35, texMat('barback', TX.wood('#3a1a10'), 0xffffff, {}, 1), 21.25, y, TZ1 - T / 2 - 0.18);
  addCollider(19, y, TZ1 - 0.45, 23.5, y + 1.1, TZ1 - 0.1);
  for (let i = 0; i < 9; i++) PR.bottle(19.3 + i * 0.5, y + 1.1, TZ1 - T / 2 - 0.18, [0x1a4a2a, 0x6a1a1a, 0x5a4a0a, 0x1a2a6a][i % 4]);
  for (let i = 0; i < 4; i++) PR.glass(19.7 + i * 1.1, y + 1.1, 5.0, { wine: i % 2 === 0 });
  PR.note(22.4, y + 1.1, 4.95, 0.3, ...noteArgs('pianistNapkin'));
  PR.radio(23.2, y + 1.1, 5.05, P);
  PR.ashtray(21.35, y + 1.1, 4.85); PR.matchbook(19.25, y + 1.1, 4.9, 0.3);
  const bt = PR.table(27.6, 2.6, { w: 0.8, round: true, color: '#2a1810' }); PR.chair(27.6, 3.35, P); PR.chair(27.6, 1.85, 0);
  PR.glass(...PR.top(bt).toArray(), { wine: true });
  PR.armchair(29.05, 2.2, -P * 0.75, 0x5a1a1a);
  PR.sofa(21.4, CZ1 + T / 2 + 0.48, 0, 0x5a1a40, 2.0);
  PR.ceilingLamp(21, 3, { y: y + CEIL, kind: 'pendant', intensity: 2.5, distance: 6, color: 0xff8090 });
  PR.ceilingLamp(27, 3.5, { y: y + CEIL, kind: 'pendant', intensity: 2.5, distance: 6, color: 0xffa070 });
  sgn('П О Л Д Е Н Ь', 'x', TZ1, -1, 21.25, y + 2.6, { w: 2.2, h: 0.45, bg: '#1a0610', fg: '#ff7aa8', glowing: true });
  glow(21.25, y + 2.6, TZ1 - T / 2 - 0.03, 3.5, 0xff4080, 0.2, { rx: 0, ry: P });
  pic(['portrait', 'art'], 'z', 18, 1, 3.4, y + 2.0, 0.7, { frame: 'gold' });
  zone(18, CZ1, TX1, TZ1, 'БАР «ПОЛДЕНЬ»', { reverb: 0.2, amb: 1.3 });
  // Мужская уборная
  for (const zz of [-5.1, -3.8, -2.5]) block(6 + T / 2, y, zz - 0.02, 7.5, y + 2.1, zz + 0.02, col(0x6a2030));
  for (const zz of [-5.75, -4.45, -3.15]) PR.toilet(6 + T / 2 + 0.35, zz + (zz === -5.75 ? 0.35 : 0), P / 2);
  for (let i = 0; i < 3; i++) PR.sink(12 - T / 2 - 0.25, -5.5 + i * 1.2, -P / 2);
  PR.ceilingLamp(9, -4, { y: y + CEIL, kind: 'tube', color: 0xf0fff0, intensity: 2.6, distance: 6, flicker: 0.3 });
  const tile = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.0, 0.7), M.pinkTile);
  tile.position.set(6 + T / 2 + 0.025, y + 0.75, -5.7); W.group.add(tile); tile.userData.noMerge = true;
  addCollider(6 - T / 2, y, -6.05, 6 + T / 2 + 0.05, y + 1.25, -5.35);
  let moved = false;
  interact(tile, () => moved ? 'Пролезть в лаз' : 'Плитка шатается…', () => {
    if (!moved) { moved = true; S.sfxSlide(); tile.position.x += 0.4; tile.position.z += 0.3; tile.rotation.y = 0.5; tile.position.y = y + 0.5; G.toast('Плитка отвалилась. За ней — розовый свет.'); return; }
    G.teleport(4.8, y, -5.0, P / 2, 'Ты пролезаешь в узкий лаз…');
  });
  zone(6, TZ0, 12, CZ0, 'УБОРНАЯ', { reverb: 0.45 });
  // Розовая комната
  anchor((SX0 + SX1) / 2, y + 2.8, -4, { color: 0xff70b0, intensity: 5, distance: 6 });
  plane(0.3, 0.3, emis(0xff80c0, 1.2), (SX0 + SX1) / 2, y + CEIL - 0.01, -4, P / 2, 0);
  pic(['02_weirdcore_liminal'], 'z', SX0, 1, -3.4, y + 1.7, 0.8, { frame: 'pink' });
  pic(['02_weirdcore_liminal'], 'x', SZ1, -1, 4.75, y + 1.7, 0.6, { frame: 'pink' });
  PR.chair((SX0 + SX1) / 2, -2.4, P, { color: 0xd8b0c0, seatColor: 0xff80b0 });
  PR.note((SX0 + SX1) / 2 + 0.3, y, -4.2, 0.5, ...noteArgs('sonyaExit'));
  const back = PR.grp(6 - T / 2, -5.7, -P / 2, y + 0.25);
  PR.hitBox(back, 0.7, 1.0, 0.1);
  interact(back, 'Вылезти обратно', () => G.teleport(7.0, y, -5.7, -P / 2, ''));
  trigger(SX0, TZ0, SX1, SZ1, () => G.secret('pink', 'Розовая комната'));
  zone(SX0, TZ0, SX1, SZ1, 'КОМНАТА 0', { reverb: 0.5, muffle: 1600 });
  // Женская уборная
  for (let i = 0; i < 3; i++) PR.sink(12 + T / 2 + 0.25, -5.5 + i * 1.2, P / 2);
  for (let i = 0; i < 2; i++) { PR.toilet(18 - T / 2 - 0.35, -5.6 + i * 1.5, -P / 2); block(16.4, y, -4.87 + i * 1.5, 18 - T / 2, y + 2.1, -4.83 + i * 1.5, col(0x2a5a6a)); }
  PR.ceilingLamp(15, -4, { y: y + CEIL, kind: 'tube', color: 0xf0fff0, intensity: 2.6, distance: 6 });
  PR.note(12 + T / 2, y + 1.8, -2.4, P / 2, 'Помадой на стене', 'не смотри в окно слишком долго\nсолнце смотрит в ответ', { flat: false, color: 0xd8b0b0 });
  zone(12, TZ0, 18, CZ0, 'УБОРНАЯ', { reverb: 0.45 });
  // Комната персонала
  PR.locker(24 - T / 2 - 0.24, -4.0, -P / 2, 4, () => { S.sfxDoorOpen(); G.note(...TXT.maidLocker); });
  const st = PR.table(21.0, -4.2, { w: 1.4, d: 0.8 }); PR.chair(20.0, -4.2, P / 2); PR.chair(22.0, -4.2, -P / 2);
  PR.glass(...PR.top(st, -0.3, 0.1).toArray()); PR.glass(...PR.top(st, 0.2, -0.1).toArray());
  const sd = PR.desk(18 + T / 2 + 0.32, -3.0, P / 2);
  PR.computer(...PR.top(sd, 0, 0).toArray(), P / 2, 'персонал', [
    { name: 'смены/вера.txt', story: 'maid', title: TXT.maidShifts[0], text: TXT.maidShifts[1] },
    { name: 'объявление.txt', text: 'Сотрудникам: кнопку под стойкой регистрации больше не нажимать. Кабинет управляющего — только по вызову.\nВызова не будет.' },
  ]);
  PR.ceilingLamp(21, -4, { y: y + CEIL, kind: 'tube', color: 0xfff0d8, intensity: 2.3, distance: 6, flicker: 0.4 });
  pic(['06_vintage_photos', 'portrait'], 'z', 18, 1, -5.3, y + 1.8, 0.55, { frame: 'white' });
  zone(18, TZ0, 24, CZ0, 'КОМНАТА ПЕРСОНАЛА', { reverb: 0.1 });
  // Игровой зал
  for (const x of [24.9, 25.8, 28.2, 29.1]) PR.arcade(x, TZ0 + T / 2 + 0.42, 0);
  PR.sofa(27, -2.3, P, 0x3a1a5a, 1.8);
  PR.book(25.4, y, -4.3, 0.6, 'libBaudDisney', { color: 0x2a5a8a, open: true });
  PR.ceilingLamp(27, -3.8, { y: y + CEIL, kind: 'tube', color: 0xc080ff, intensity: 2.5, distance: 6 });
  pic(['05_retro_games_arcade', '04_retro_consoles'], 'z', 24, 1, -4.0, y + 1.9, 0.8);
  pic(['04_retro_consoles', '05_retro_games_arcade'], 'z', 24, 1, -2.2, y + 1.9, 0.5);
  zone(24, TZ0, TX1, CZ0, 'ИГРОВОЙ ЗАЛ', { reverb: 0.15 });
  buildPodium();
}

function buildPodium() {
  const y = 0;
  floorRect(0, TZ1, 6, LZ1, y, M.marble, 'marble');
  floorRect(6, TZ1, TX1, LZ1, y, M.parquet, 'wood');
  floorRect(0, LZ0, 6, TZ0, y, M.marble, 'marble');
  floorRect(6, LZ0, TX1, TZ0, y, M.casinoCarpet, 'carpet');
  const sky = [14, 9.2, 22, 11.4];
  for (const r of rectMinus([6, TZ1, TX1, LZ1], sky)) ceilRect(r[0], r[1], r[2], r[3], y + PCEIL, M.coffer);
  ceilRect(0, TZ1, 6, LZ1, y + PCEIL, M.ceil);
  ceilRect(0, LZ0, TX1, TZ0, y + PCEIL, texMat('casCeil', TX.coffer(), 0x9a8070, {}, 1.6));
  const [sx0, sz0, sx1, sz1] = sky;
  for (const [a, b, c2, d] of [[sx0, sz0, sx1, sz0 + 0.05], [sx0, sz1 - 0.05, sx1, sz1], [sx0, sz0, sx0 + 0.05, sz1], [sx1 - 0.05, sz0, sx1, sz1]]) block(a, y + PCEIL, b, c2, y + PH, d, M.restWall, { collide: false });
  plane(sx1 - sx0, sz1 - sz0, basic('skyglass', { color: 0xffe0b0, transparent: true, opacity: 0.12, depthWrite: false, side: THREE.DoubleSide }), (sx0 + sx1) / 2, y + PH - 0.02, (sz0 + sz1) / 2, -P / 2, 0);
  for (let i = 1; i < 4; i++) box(0.05, 0.06, sz1 - sz0, M.dark, sx0 + i * (sx1 - sx0) / 4, y + PH - 0.08, (sz0 + sz1) / 2);
  glow((sx0 + sx1) / 2, y + 0.02, (sz0 + sz1) / 2, 6, 0xffc070, 0.16);
  const tallWin = (at, w = 2.0) => ({ at, w, type: 'window', sill: 0.5, h: 3.2, light: 0.28, mull: 2 });
  wall('x', LZ1, TX0, 6, y, PH, { neg: M.cloakWall, pos: M.ext }, [tallWin(3, 1.8)], { inside: -1, ceil: PCEIL });
  wall('x', LZ1, 6, TX1 + T / 2, y, PH, { neg: M.restWall, pos: M.ext }, [8.5, 12.5, 16.5, 20.5, 24.5, 28.2].map(x => tallWin(x)), { inside: -1, ceil: PCEIL });
  wall('x', LZ0, TX0, 6, y, PH, { neg: M.ext, pos: M.casinoWall }, [], { ceil: PCEIL });
  wall('x', LZ0, 6, TX1 + T / 2, y, PH, { neg: M.ext, pos: M.casinoWall }, [16, 21, 26].map(x => ({ at: x, w: 1.8, type: 'window', sill: 0.9, h: 2.4, light: 0.15 })), { inside: 1, ceil: PCEIL });
  wall('z', TX1, TZ1, LZ1 + T / 2, y, PH, { neg: M.restWall, pos: M.ext }, [tallWin(8.4, 1.4)], { inside: -1, ceil: PCEIL });
  wall('z', TX1, LZ0 - T / 2, TZ0, y, PH, { neg: M.casinoWall, pos: M.ext }, [{ at: -10.2, w: 1.8, type: 'window', sill: 0.9, h: 2.4, light: 0.15 }], { inside: -1, ceil: PCEIL });
  wall('z', 6, TZ1, LZ1, y, PH, { neg: M.cloakWall, pos: M.restWall }, [{ at: 10.2, w: 3.0, type: 'open', h: 3.0 }], { ceil: PCEIL });
  wall('z', 6, LZ0, TZ0, y, PH, { neg: M.casinoWall, pos: M.casinoWall }, [{ at: -10.2, w: 3.0, type: 'open', h: 3.0 }], { ceil: PCEIL });

  // Гардероб
  PR.counter(3.9, 7.4, 4.5, 12.6, 1.05, { top: 0x2a1a10, front: '#4a2a18' });
  for (const z of [8.0, 9.4, 10.8, 12.2]) PR.coatRack(1.3, z, 2 + (z > 10 ? 1 : 0));
  PR.bell(4.2, y + 1.05, 10.2);
  const tk = PR.grp(4.2, 11.6, 0, y + 1.05); box(0.12, 0.005, 0.08, col(0xd8c8a0), 0, 0, 0, { parent: tk }); PR.hitBox(tk, 0.25, 0.08, 0.2);
  interact(tk, 'Взять номерок', () => { S.sfxClink(1.8); G.toast('Номерок № 33. Пальто по нему никто не забрал.'); }); mount(tk, 'table');
  sgn('ГАРДЕРОБ', 'x', TZ1, 1, 3, y + 2.8, { w: 1.4, h: 0.3 });
  PR.ceilingLamp(3, 10.2, { y: y + PCEIL, intensity: 3, distance: 7, kind: 'pendant' });
  pic(['portrait', '06_vintage_photos'], 'x', TZ1, 1, 0.9, y + 1.7, 0.55, { frame: 'gold' });
  zone(0, TZ1, 6, LZ1, 'ГАРДЕРОБ', { reverb: 0.2, amb: 1.3 });
  // Ресторан «Мираж»
  const stg = [26.6, 7.6, TX1 - T / 2, 13.2];
  block(stg[0], y, stg[1], stg[2], y + 0.3, stg[3], texMat('stage', TX.wood('#4a2a14'), 0xffffff, {}, 1.5), { collide: false });
  surface(stg[0], stg[1], stg[2], stg[3], () => y + 0.3, 'wood');
  PR.mic(27.6, 10.4, -P / 2, () => { S.sfxClick(); S.sfxKnock(1); G.subtitle('«Раз… раз…» — эхо возвращается через секунду, хотя зал небольшой.'); });
  W.group.children[W.group.children.length - 1].position.y = y + 0.3;
  const ms = PR.grp(28.6, 9.2, -P / 2, y + 0.3);
  box(0.02, 1.1, 0.02, col(0x222222), 0, 0, 0, { parent: ms }); box(0.42, 0.32, 0.02, col(0x222222), 0, 1.0, 0, { parent: ms }); mount(ms, 'floor');
  PR.note(28.6 - 0.02, y + 1.6, 9.2, -P / 2, ...noteArgs('pianistSetlist').slice(0, 2), { flat: false, story: 'pianist', mountKind: 'hang' });
  drums(28.9, 12.0, y + 0.3);
  sgn('«МИРАЖ»', 'z', TX1, -1, 11.4, y + 3.1, { w: 2.0, h: 0.5, bg: '#2a0a10', fg: '#ffb070', glowing: true });
  glow(TX1 - T / 2 - 0.03, y + 3.1, 11.4, 3.5, 0xff9040, 0.18, { rx: 0, ry: -P / 2 });
  anchor(27.6, y + 3.6, 10.4, { color: 0xffc080, intensity: 6, distance: 6 });
  for (const [tx, tz] of [[9, 8.6], [9, 12.2], [12.6, 10.4], [16.2, 8.6], [16.2, 12.2], [19.8, 10.4], [23.4, 8.6], [23.4, 12.2]]) {
    const t = PR.table(tx, tz, { w: 1.0, round: true, cloth: 0xe8e0d0 });
    for (let k = 0; k < 3; k++) { const a = k * 2.09 + 0.5; PR.chair(tx + Math.cos(a) * 0.85, tz + Math.sin(a) * 0.85, -a - P / 2, { color: 0x3a1a10, seatColor: 0x7a1a24 }); }
    PR.plate(...PR.top(t, 0.2, 0.1).toArray()); PR.glass(...PR.top(t, -0.2, 0.22).toArray(), { wine: true });
    PR.candle(...PR.top(t, -0.05, -0.2).toArray(), { on: (tx + tz) % 3 < 2 });
  }
  PR.counter(7.8, TZ1 + T / 2, 12.4, 7.1, 0.95, { top: 0xe0d8c8, front: '#4a2418' });
  for (let i = 0; i < 4; i++) {
    const g = PR.grp(8.3 + i * 1.1, 6.82, 0, y + 0.95); cyl(0.22, 0.22, 0.04, 14, col(0xb8b8b8), 0, 0, 0, { parent: g }); cyl(0.2, 0.06, 0.14, 14, col(0xc8c8c8), 0, 0.04, 0, { parent: g });
    interact(g, 'Поднять крышку блюда', () => { S.sfxClink(1.3); G.toast(['Пусто. Пахнет корицей.', 'Апельсины. Свежие.', 'Пусто. На дне — жетон казино.', 'Песок.'][i]); }); mount(g, 'table');
  }
  const jb = PR.grp(7.0, LZ1 - T / 2 - 0.32, P);
  box(0.9, 1.5, 0.6, col(0x8a3a1a), 0, 0, 0, { parent: jb });
  const arch = cyl(0.45, 0.45, 0.56, 16, col(0xc89a3a, { emissive: 0x302000 }), 0, 1.2, 0, { parent: jb }); arch.rotation.x = P / 2; arch.position.y = 1.5;
  plane(0.6, 0.4, emis(0xffb060, 0.9), 0, 0.95, 0.316, 0, 0, { parent: jb });
  interact(jb, 'Музыкальный автомат: сменить пластинку', () => { const n = S.nextStation(); G.toast('🎵 ' + n); }); PR.solid(jb, 0.9, 0.6, 1.9); mount(jb, 'floor');
  for (const x of [10.8, 24.6]) PR.chandelier(x, 10.4, y + PCEIL);
  for (const x of [8.5, 12.5, 16.5, 20.5, 24.5]) PR.curtains('x', LZ1 - T / 2, x - 1, x + 1, y, -1, 0x7a1a24);
  const rg = ['portrait', 'art', '06_vintage_photos', '01_japan_underground'];
  for (const x of [10.5, 17.2, 22.5]) pic(rg, 'x', TZ1, 1, x, y + 2.0, 0.8, { frame: 'gold' });
  pic(rg, 'z', 6, 1, 7.6, y + 2.0, 0.7, { frame: 'gold' }); pic(rg, 'z', 6, 1, 12.8, y + 2.0, 0.7, { frame: 'gold' });
  for (const x of [8.4, 12.6, 20.0, 29.0]) sconceAt('x', TZ1, 1, x, y + 2.6);
  zone(6, TZ1, TX1, LZ1, 'РЕСТОРАН «МИРАЖ»', { reverb: 0.35, amb: 1.4 });
  // Фойе казино
  const cg = PR.grp(1.6, LZ0 + T / 2 + 2.2, 0);
  box(2.4, 1.1, 0.3, texMat('cashier', TX.wood('#4a2418'), 0xffffff, {}, 1), 0, 0, 0, { parent: cg });
  for (let i = 0; i < 9; i++) box(0.02, 1.4, 0.02, col(0xc0a050, { emissive: 0x201000 }), -1.1 + i * 0.275, 1.1, 0, { parent: cg });
  box(2.4, 0.06, 0.06, col(0xc0a050), 0, 2.5, 0, { parent: cg });
  PR.solid(cg, 2.4, 0.3, 2.5); mount(cg, 'floor');
  interact(cg, 'Окошко кассы', () => { S.sfxBell(); G.toast('КАССА ЗАКРЫТА. Обмен жетонов на деньги не производится с 1999 года.'); });
  block(2.8 + 0.01, y, LZ0 + T / 2, 2.85, y + 2.5, LZ0 + T / 2 + 2.05, col(0x4a2418));
  const cd = PR.desk(1.4, LZ0 + T / 2 + 0.6, P);
  PR.computer(...PR.top(cd, 0.2, 0).toArray(), P, 'касса', [
    { name: 'долги.txt', story: 'pianist', title: TXT.pianistDebt[0], text: TXT.pianistDebt[1] },
    { name: 'выигрыши.txt', text: 'Выигрышей за отчётный период: 1 (джекпот, автомат № 3).\nВыплачено: жетонами.\nЖетоны к выводу не принимаются.' },
  ]);
  PR.book(...PR.top(cd, -0.35, 0).toArray(), P + 0.2, 'libBaudCons', { color: 0x8a6a1a });
  sgn('КАССА', 'x', TZ0, -1, 1.6, y + 3.2, { w: 1.0, h: 0.25, fg: '#ffd070' });
  PR.plant(5.3, -13.3); PR.plant(0.7, -7.2);
  PR.sofa(5.35, -8.6, -P / 2, 0x1a4a3a, 1.8);
  PR.ceilingLamp(3, -10.2, { y: y + PCEIL, intensity: 3, distance: 7, kind: 'pendant', color: 0xffc070 });
  sgn('КАЗИНО «ОАЗИС» →', 'z', 6, -1, -12.85, y + 3.0, { w: 1.6, h: 0.3, bg: '#1a0a10', fg: '#ff6a9a', glowing: true });
  zone(0, LZ0, 6, TZ0, 'ФОЙЕ КАЗИНО', { reverb: 0.25, amb: 1.3 });
  // Казино «Оазис»
  PR.roulette(11.5, -9.8, 0);
  PR.note(11.0, y, -11.0, 0.6, ...noteArgs('sonyaRoulette'));
  PR.pokerTable(17.6, -9.8);
  PR.pokerTable(23.4, -11.6);
  PR.ashtray(17.6 - 0.75, y + 0.78, -9.8); PR.ashtray(23.4 + 0.75, y + 0.78, -11.6);
  PR.note(17.4, y + 0.78, -10.25, 0.3, ...noteArgs('sonyaMom'));
  for (let i = 0; i < 6; i++) PR.slotMachine(8.0 + i * 1.0, LZ0 + T / 2 + 0.32, 0);
  for (const z of [-7.4, -8.35, -12.1, -13.05]) PR.slotMachine(TX1 - T / 2 - 0.32, z, -P / 2);
  for (const x of [16, 21, 26]) PR.curtains('x', LZ0 + T / 2, x - 0.9, x + 0.9, y, 1, 0x4a0a14);
  for (const [x, z] of [[11.5, -9.8], [17.6, -9.8], [23.4, -11.6]]) PR.ceilingLamp(x, z, { y: y + PCEIL, kind: 'pendant', intensity: 3.5, distance: 6, color: 0xfff0c0 });
  PR.chandelier(20.5, -7.8, y + PCEIL);
  sgn('ОАЗИС', 'x', TZ0, -1, 18, y + 3.2, { w: 2.4, h: 0.5, bg: '#0a1a14', fg: '#7affc0', glowing: true });
  glow(18, y + 3.2, TZ0 - T / 2 - 0.03, 3.5, 0x40ffa0, 0.18, { rx: 0, ry: P });
  const kg = ['05_retro_games_arcade', 'art', '06_vintage_photos'];
  pic(kg, 'x', TZ0, -1, 9.5, y + 2.1, 0.8, { frame: 'gold' }); pic(kg, 'x', TZ0, -1, 13.5, y + 2.1, 0.7, { frame: 'gold' });
  pic(kg, 'x', TZ0, -1, 23.5, y + 2.1, 0.8, { frame: 'gold' });
  zone(6, LZ0, TX1, TZ0, 'КАЗИНО «ОАЗИС»', { reverb: 0.35, amb: 1.25 });
}
function drums(x, z, y) {
  const g = PR.grp(x, z, -P / 2, y);
  const bd = cyl(0.3, 0.3, 0.35, 14, col(0x8a1a2a), 0, 0.12, 0, { parent: g }); bd.rotation.x = P / 2; bd.position.y = 0.3;
  cyl(0.18, 0.18, 0.2, 12, col(0xd8d0c0), -0.4, 0.5, 0.15, { parent: g }); cyl(0.18, 0.18, 0.2, 12, col(0xd8d0c0), 0.4, 0.5, 0.15, { parent: g });
  for (const sx of [-0.4, 0.4]) box(0.03, 0.5, 0.03, col(0x888888), sx, 0, 0.15, { parent: g });
  box(0.03, 1.1, 0.03, col(0x888888), 0.55, 0, -0.2, { parent: g });
  cyl(0.2, 0.2, 0.01, 14, col(0xc0a040, { emissive: 0x201000 }), 0.55, 1.1, -0.2, { parent: g });
  interact(g, 'Ударить по барабану', () => { S.sfxKnock(1); S.sfxClink(0.6); }); PR.solid(g, 1.3, 0.8, 1.0); mount(g, 'floor');
}

// ======================================================================
// ВЕСТИБЮЛЬ
function buildLobby() {
  setLevel(0); const y = 0;
  for (const r of rectMinus([LX0, LZ0, TX0, LZ1], [-6, LZ0, 0, -9.4])) floorRect(r[0], r[1], r[2], r[3], y, M.marble, 'marble');
  ceilRect(LX0, LZ0, TX0, LZ1, y + LH, M.coffer);
  const tall = (at, w = 1.8) => ({ at, w, type: 'window', sill: 0.5, h: 6.4, light: 0.3, mull: 2 });
  const wOps = [-11.5, -8, -4.5, 4.5, 8, 11.5].map(z => tall(z));
  wOps.push({ at: 0, w: 3.2, type: 'window', sill: 0.02, h: 3.1, light: 0.3, mull: 4 });
  wall('z', LX0, LZ0 - T / 2, LZ1 + T / 2, y, LH, { neg: M.ext, pos: M.lobbyWall }, wOps, { inside: 1, ceil: LH });
  wall('x', LZ1, LX0, WX, y, LH, { neg: M.lobbyWall, pos: M.ballWall }, [{ at: -20, w: 3.6, type: 'open', h: 4.8 }], { ceil: LH });
  wall('x', LZ1, WX, TX0, y, LH, { neg: M.lobbyWall, pos: M.libWall }, [{ at: -4, w: 1.2, type: 'door', h: 2.4 }], { ceil: LH });
  new Door('x', LZ1, -4, { name: 'библиотека', swing: 1, w: 1.2, h: 2.4 });
  sgn('BIBLIOTHÈQUE', 'x', LZ1, -1, -4, y + 2.9, { w: 1.2, h: 0.22 });
  sgn('SALLE DE BAL', 'x', LZ1, -1, -20, y + 5.4, { w: 2.6, h: 0.32 });
  wall('x', LZ0, LX0, -6, y, LH, { neg: M.ext, pos: M.lobbyWall }, [-23, -19.5, -16, -12.5, -9].map(x => tall(x, 2.0)), { inside: 1, ceil: LH });
  wall('z', TX0, TZ1, LZ1, y, PH, { neg: M.lobbyWall, pos: M.cloakWall }, [{ at: 10.2, w: 2.4, type: 'open', h: 3.0 }], { ceil: LH });
  wall('z', TX0, TZ1, LZ1, y + PH, LH - PH, { neg: M.lobbyWall, pos: M.ext }, [], { trim: false });
  wall('z', TX0, -9.4, TZ0, y, PH, { neg: M.lobbyWall, pos: M.casinoWall }, [{ at: -7.9, w: 2.2, type: 'open', h: 3.0 }], { ceil: LH });
  wall('z', TX0, -9.4, TZ0, y + PH, LH - PH, { neg: M.lobbyWall, pos: M.ext }, [], { trim: false });
  const colMat = texMat('colm', TX.marble('#203028', '#2a3a30'), 0xffffff, {}, 0);
  for (const x of [-20, -14, -8]) for (const z of [-6, 6]) PR.column(x, z, LH, { r: 0.45, mat: colMat });
  // вращающаяся дверь
  const rd = PR.grp(LX0 + 1.55, 0, 0);
  box(0.05, 3, 2.6, basic('rdglass', { color: 0xffd9a0, transparent: true, opacity: 0.12, depthWrite: false }), 0, 0, 0, { parent: rd });
  for (let i = 0; i < 4; i++) { const pnl = box(1.3, 2.9, 0.05, basic('rdg2', { color: 0xffd9a0, transparent: true, opacity: 0.18, depthWrite: false }), 0, 0, 0, { parent: rd }); pnl.rotation.y = i * P / 2; pnl.position.set(Math.sin(i * P / 2) * 0.65, 1.45, Math.cos(i * P / 2) * 0.65); }
  box(0.08, 3, 0.08, col(0x8a6a2a), 0, 0, 0, { parent: rd });
  box(2.7, 0.15, 2.7, col(0x3a2414), 0, 3.0, 0, { parent: rd });
  addCollider(LX0, y, -1.6, LX0 + 2.9, y + 3, 1.6);
  let spin = 0;
  interact(rd, 'Выйти наружу', () => {
    spin = 1.2; S.sfxSlide();
    G.toast(['Дверь проворачивается и возвращает тебя обратно в вестибюль.', 'Снаружи только пустыня. Дверь не выпускает.', 'Ты делаешь полный круг. Ты всё ещё внутри.'][Math.floor(Math.random() * 3)]);
  });
  W.animated.push(dt => { if (spin > 0) { rd.rotation.y += dt * 3; spin -= dt; } });
  mount(rd, 'floor');
  sgn('ВХОД · ENTRANCE', 'z', LX0, 1, 0, y + 3.6, { w: 1.6, h: 0.3 });
  PR.rug(LX0 + 4.2, 0, 3, 4, TX.chevronTex());
  // стойка регистрации
  PR.counter(-6.5, -9, -5.5, -2.5, 1.15, { top: 0x140a08, front: '#3a160e' });
  PR.counter(-6.5, -9.2, -3, -8.6, 1.15, { top: 0x140a08, front: '#3a160e' });
  PR.bell(-6.0, y + 1.15, -5.2);
  PR.tableLamp(-6.0, y + 1.15, -7.7, { shade: 0x2a5a3a });
  PR.tableLamp(-6.0, y + 1.15, -2.9, { shade: 0x2a5a3a });
  PR.note(-6.0, y + 1.15, -6.4, 0.4, 'Книга регистрации', 'Гость: —     Номер: 101 … выезд: —\nГость: —     Номер: 204 … выезд: —\nГость: ты     Номер: ∞ … заезд: сейчас\n\nНа полях: «лифт знает больше этажей, чем кнопок».');
  PR.computer(-6.0, y + 1.15, -4.1, P / 2, 'ресепшен', [
    { name: 'регистрация/гости_1999.txt', story: 'manager', title: TXT.registry[0], text: TXT.registry[1] },
    { name: 'журнал/ночь.txt', story: 'guard', title: TXT.guardNight[0], text: TXT.guardNight[1] },
  ]);
  PR.chair(-4.6, -4.1, -P / 2);
  PR.postcard(-5.9, y + 1.15, -5.78, 0.3, 'postcard1'); PR.matchbook(-6.05, y + 1.15, -3.55, 0.5);
  PR.phoneProp(-6.0, y + 1.15, -8.3, P / 2, () => G.flags.phoneRinging ? G.answerPhone() : 'Гудок. Потом — далёкий шум прибоя, хотя до моря тысячи километров.');
  const kb = PR.grp(-T / 2, -4.3, -P / 2);
  box(2.4, 1.4, 0.2, texMat('kbox', TX.wood('#3a2010'), 0xffffff, {}, 1), 0, 1.4, 0.1, { parent: kb });
  for (let r = 0; r < 4; r++) for (let c = 0; c < 8; c++) {
    box(0.26, 0.28, 0.02, col(0x1a0e08), -1.05 + c * 0.3, 1.47 + r * 0.33, 0.2, { parent: kb });
    if ((r * 8 + c) % 3 === 0) box(0.03, 0.12, 0.01, col(0xc09a4a, { emissive: 0x201000 }), -1.05 + c * 0.3, 1.55 + r * 0.33, 0.215, { parent: kb });
  }
  interact(kb, 'Взять ключ от номера', () => { S.sfxClick(); G.toast('Все ключи — от номера 000. Таких номеров нет.'); });
  mount(kb, 'wall', { w: 2.4, h: 1.4, dy: 2.1 });
  PR.clock(-T / 2, y + 4.2, -5.6, -P / 2, { r: 0.45 });
  sgn('Grand Simulacre', 'z', TX0, -1, -6.65, y + 5.3, { w: 3.4, h: 0.6, bg: '#140a08', fg: '#d8a850' });
  glow(-T / 2 - 0.04, y + 5.3, -6.65, 4, 0xffb060, 0.1, { rx: 0, ry: -P / 2 });
  buildManagerOffice();
  // фонтан
  const fx = -14, fz = 0;
  const fm = texMat('fount', TX.marble('#3a2a2c', '#2a2022'), 0xffffff, {}, 0);
  const f = PR.grp(fx, fz, 0);
  const basin = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.3, 0.5, 20, 1, true), fm); basin.position.y = 0.25; f.add(basin);
  const inner = new THREE.Mesh(new THREE.CircleGeometry(2.15, 20), col(0x1a1010)); inner.rotation.x = -P / 2; inner.position.y = 0.08; f.add(inner);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(2.25, 0.1, 6, 20), fm); rim.rotation.x = P / 2; rim.position.y = 0.5; f.add(rim);
  const stt = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.35, 1.6, 10), fm); stt.position.y = 0.8; f.add(stt);
  const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.3, 0.3, 14), fm); bowl.position.y = 1.7; f.add(bowl);
  addCollider(fx - 2.2, y, fz - 2.2, fx + 2.2, y + 0.6, fz + 2.2);
  // вода: чаша внизу, верхняя чаша, переливающийся «занавес» и струя
  const wtex = TX.waterTex().clone(); wtex.needsUpdate = true; wtex.repeat.set(2, 2);
  const wtop = new THREE.MeshBasicMaterial({ map: wtex, color: 0x9ad8e0, transparent: true, opacity: 0.6, depthWrite: false });
  const ftex = TX.waterTex().clone(); ftex.needsUpdate = true; ftex.repeat.set(3, 1);
  const wfall = new THREE.MeshBasicMaterial({ map: ftex, color: 0xc8f0f4, transparent: true, opacity: 0.28, depthWrite: false, side: THREE.DoubleSide });
  const pool = new THREE.Mesh(new THREE.CircleGeometry(2.15, 28), wtop); pool.rotation.x = -P / 2; pool.position.y = 0.4; f.add(pool);
  const bw = new THREE.Mesh(new THREE.CircleGeometry(0.86, 20), wtop); bw.rotation.x = -P / 2; bw.position.y = 1.83; f.add(bw);
  const fall = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.12, 1.43, 24, 1, true), wfall); fall.position.y = 1.12; f.add(fall);
  const jet = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.06, 0.6, 8, 1, true), wfall); jet.position.y = 2.15; f.add(jet);
  for (const m of [pool, bw, fall, jet]) { m.userData.noRay = true; m.userData.noMerge = true; }
  W.animated.push((dt, t) => { wtex.offset.set(t * 0.02, Math.sin(t * 0.5) * 0.03); ftex.offset.y = t * 0.6; jet.scale.y = 1 + Math.sin(t * 7) * 0.06; });
  W.sounds = W.sounds || []; W.sounds.push({ id: 'fountain', kind: 'fountain', pos: new THREE.Vector3(fx, 1, fz), level: 0, range: 14, gain: 0.16 });
  interact(f, 'Бросить монетку', () => { S.sfxSplash(); G.toast('Монетка булькнула и легла на дно к сотне таких же. Все — одного года: 1999.'); });
  mount(f, 'floor');
  PR.sofa(fx, fz + 4.2, P, 0x2a3e4a, 2.4); PR.sofa(fx, fz - 4.2, 0, 0x2a3e4a, 2.4);
  PR.armchair(fx - 3.6, fz + 3.0, P * 0.75, 0x5a2a2a); PR.armchair(fx + 3.6, fz - 3.0, -P * 0.25, 0x5a2a2a);
  const t1 = PR.table(fx - 3.4, fz - 3.4, { w: 0.7, round: true, h: 0.5 }); PR.glass(...PR.top(t1).toArray(), { wine: true });
  const t2 = PR.table(fx + 3.4, fz + 3.4, { w: 0.7, round: true, h: 0.5 }); PR.glass(...PR.top(t2, -0.1, 0).toArray()); PR.glass(...PR.top(t2, 0.12, -0.08).toArray());
  PR.floorLamp(fx - 1.8, fz + 5.2); PR.floorLamp(fx + 1.8, fz - 5.2);
  PR.rug(fx, fz, 10, 11, TX.carpetGreen());
  // камин
  PR.fireplace(-14.5, LZ1 - T / 2, P);
  PR.book(-15.3, y + 1.62, LZ1 - T / 2 - 0.33, P + 0.1, 'libZeno', { color: 0x3a2a5a }); PR.book(-13.7, y + 1.62, LZ1 - T / 2 - 0.33, P - 0.15, 'libTimaeus', { color: 0x5a3a1a });
  PR.sofa(-14.5, 10.4, 0, 0x5a2a2a, 2.4);
  PR.armchair(-16.9, 11.4, 0.6, 0x3a1a1a); PR.armchair(-12.1, 11.4, -0.6, 0x3a1a1a);
  pic(['art', 'portrait'], 'x', LZ1, -1, -14.5, y + 3.0, 1.1, { frame: 'gold' });
  for (let r = 0; r < 3; r++) for (let c = 0; c < 6; c++) PR.chair(-24.5 + c * 1.0, -12.6 + r * 1.4, 0, { color: 0x3a3a3a, seatColor: 0x2a4a5a });
  PR.piano(-22.3, 9.0, P * 0.8, { sheet: noteArgs('pianistSheet'), onPlay: n => { if (n % 5 === 0) { [64, 67, 71, 74, 72, 71, 67, 64, 62, 64].forEach((k, i) => S.sfxPiano(k, 0.09, 0.6 + i * 0.42)); setTimeout(() => G.subtitle('Рояль доигрывает мелодию сам. «Полдень навсегда».'), 800); } } });
  for (const [x, z] of [[-24.1, 12.1], [-10.75, -12.1], [-24.1, -2.4], [-24.1, 2.4]]) PR.palm(x, z, { s: 1.2 });
  PR.payphone(-T / 2, y + 1.7, 8.75, -P / 2, () => G.flags.phoneRinging ? 'Занято.' : ['«Вы позвонили в Grand Simulacre. Вы уже в Grand Simulacre».', 'Гудки. Потом твой собственный голос: «алло?»', '«Номер не существует. Номер не существует. Номер…»'][Math.floor(Math.random() * 3)]);
  PR.vending(-T / 2 - 0.4, 13.1, -P / 2);
  const ct = PR.table(-8.6, 9.6, { w: 1.2, d: 0.6, h: 0.5 }); PR.radio(...PR.top(ct).toArray(), P);
  PR.sofa(-8.6, 11.2, P, 0x5a2a40, 2.2);
  for (const x of [-20, -14, -8]) PR.chandelier(x, 0, y + LH);
  PR.ceilingLamp(-4, -6, { y: y + LH, intensity: 6, distance: 10, kind: 'pendant' });
  pic(['portrait', 'art'], 'z', TX0, -1, 7.6, y + 2.2, 1.0, { frame: 'gold' });
  sgn('ГАРДЕРОБ · РЕСТОРАН →', 'z', TX0, -1, 10.2, y + 3.4, { w: 1.6, h: 0.25 });
  sgn('КАЗИНО →', 'z', TX0, -1, -7.9, y + 3.4, { w: 1.0, h: 0.25, fg: '#ff8ab0' });
  pic(['art', 'portrait'], 'z', LX0, 1, 6.2, y + 7.0, 0.7, { frame: 'gold' });
  pic(['art', 'portrait'], 'z', LX0, 1, -6.2, y + 7.0, 0.7, { frame: 'gold' });
  buildLobbyIdeas();
  zone(LX0, LZ0, TX0, LZ1, 'ВЕСТИБЮЛЬ', { reverb: 0.9, wind: 0.035, amb: 1.7 });
}

// антураж: Платон, Бодрийяр и нулевой уровень. Всё стоит у стен или висит в воздухе — проходу не мешает.
function buildLobbyIdeas() {
  const y = 0, wx = LX0 + T / 2 + 0.005;
  PR.platonicSolids(-14, 0, y + 4.3);
  PR.plaqueStand(-15.7, -5.9, 0, 'ЭЙДОСЫ', 'Латунная табличка, начищенная до блеска.\n\n«Над фонтаном — пять правильных тел: огонь, земля, воздух, вода и то, из чего сделано небо. Демиург лепил мир по их образцу. Мы сделали наоборот: сначала вестибюль, потом образцы — для вестибюля».\n\nНиже, мелко: «Просьба не трогать идеи руками».');
  PR.bust(-25.2, 6.25, P / 2, 'Осмотреть бюст', [
    'Табличка: «Платон. Гипсовая копия мраморной копии бронзового оригинала, которого не было».',
    'У бюста стёрт нос — как будто его слишком часто трогали на удачу. Удачи не прибавилось.',
    'Платон смотрит в окно, на малиновую пустыню. Тень от него падает в другую сторону.',
  ]);
  PR.bust(-25.2, -6.25, P / 2, 'Осмотреть бюст', [
    'Табличка: «Неизвестный. Модель для отливки. Образец, по которому ничего не отлили».',
    'Лица нет — гладкий гипс. Но ты точно знаешь, что он на тебя смотрит.',
    'На постаменте карандашом: «копия, которая знает, что она копия, — уже оригинал?»',
  ], { faceless: true, color: 0xd8d0c4 });
  PR.sunRelief(wx, y + 5.4, 0, P / 2, 1.1);
  PR.floorTV(-10.6, 13.1, P + 0.35);
  PR.backroomsPatch(-14.25, y + 0.25, LZ0 + T / 2 + 0.005, 0, 1.2, 2.3);
  PR.chair(-23.8, 4.5, -P / 2, { color: 0x2a1a14, seatColor: 0x5a1420 });
}

function buildManagerOffice() {
  const y = 0, x0 = -6, x1 = 0, z0 = LZ0, z1 = -9.4, OH = 3.4;
  const om = texMat('office', TX.wallpaper('#2a3e30', '#344c3a', 'stripes', 14), 0xffffff, {}, 1.2);
  wall('z', x0, z0, z1, y, OH, { neg: M.lobbyWall, pos: om }, [], { ceil: OH });
  wall('z', x0, z0, z1, y + OH, LH - OH, M.lobbyWall, [], { trim: false });
  wall('x', z1, x0 - T / 2, x1, y, OH, { neg: om, pos: M.lobbyWall }, [{ at: -2.0, w: 1.0, type: 'door' }], { ceil: OH });
  wall('x', z1, x0 - T / 2, x1, y + OH, LH - OH, M.lobbyWall, [], { trim: false });
  wall('x', LZ0, x0, x1, y, LH, { neg: M.ext, pos: om }, [{ at: -3, w: 1.8, type: 'window', sill: 0.8, h: 2.2, light: 0.2 }], { inside: 1, ceil: OH });
  wall('z', TX0, LZ0, z1, y, PH, { neg: om, pos: M.casinoWall }, [], { ceil: OH });
  wall('z', TX0, LZ0, z1, y + PH, LH - PH, { neg: M.lobbyWall, pos: M.ext }, [], { trim: false });
  floorRect(x0, z0, x1, z1, y, M.parquet, 'wood');
  ceilRect(x0, z0, x1, z1, y + OH, M.ceil);
  const d = new Door('x', z1, -2.0, { name: 'кабинет управляющего', swing: -1, locked: true, lockedMsg: 'Заперто. На табличке: «Управляющий. Без стука не входить». Стук ничего не даёт.', mat: texMat('doorDark', TX.wood('#2a160c'), 0xffffff, {}, 1) });
  sgn('УПРАВЛЯЮЩИЙ', 'x', z1, 1, -0.95, y + 1.8, { w: 0.7, h: 0.16 });
  const btn = PR.grp(-5.5, -6.0, P / 2, y + 0.85);
  box(0.06, 0.06, 0.04, col(0x9a1010, { emissive: 0x300000 }), 0, -0.03, 0.02, { parent: btn });
  PR.hitBox(btn, 0.2, 0.2, 0.1, -0.1);
  interact(btn, 'Нажать кнопку под стойкой', () => { S.sfxClick(); setTimeout(() => { S.sfxSwitch(); d.locked = false; d.toggle(true); G.toast('Где-то щёлкнул замок. Дверь кабинета приоткрылась.'); }, 300); });
  mount(btn, 'wall', { w: 0.06, h: 0.06, dy: -0.03 });
  const dk = PR.desk(-3, -12.55, 0, { color: "#2a160c" }); PR.armchair(-3, -13.36, 0, 0x2a1a1a);
  PR.tableLamp(...PR.top(dk, -0.5, -0.1).toArray(), { shade: 0x2a5a3a });
  PR.note(...PR.top(dk, -0.15, 0.05).toArray(), 0.2, ...noteArgs('managerDiary'));
  PR.computer(...PR.top(dk, 0.35, -0.05).toArray(), 0, 'управляющий', [
    { name: 'почта/владельцу.txt', story: 'manager', title: TXT.managerMail1[0], text: TXT.managerMail1[1] },
    { name: 'почта/без_темы.txt', story: 'manager', title: TXT.managerMail2[0], text: TXT.managerMail2[1] },
  ]);
  const sd = PR.table(-5.4, -10.5, { w: 0.6, d: 0.8, color: '#2a160c' });
  PR.typewriter(...PR.top(sd).toArray(), P / 2, ...TXT.managerOrder);
  PR.shelf(x0 + T / 2 + 0.22, -12.6, P / 2, { fill: 'books', w: 2.0, color: 0x2a1a0e, d: 0.4 });
  const gt = PR.table(-0.7, -10.2, { w: 0.5, d: 0.5, color: '#2a160c' }); PR.globe(...PR.top(gt).toArray());
  pic(['portrait', '06_vintage_photos'], 'z', x1, -1, -11.7, y + 2.0, 0.9, { frame: 'gold' });
  pic(['plans'], 'z', x1, -1, -13.2, y + 1.9, 0.85, { frame: 'black' }); pic(['plans'], 'z', x1, -1, -10.2, y + 2.0, 0.85, { frame: 'black' });
  PR.ceilingLamp(-3, -11.7, { y: y + OH, kind: 'pendant', intensity: 3, distance: 7, color: 0xffd0a0 });
  PR.matchbook(...PR.top(dk, 0.1, 0.22).toArray(), 0.4);
  pic(['06_vintage_photos', 'portrait'], 'x', z0, 1, -0.9, y + 2.1, 0.5, { frame: 'gold' });
  pic(['06_vintage_photos', 'portrait'], 'x', z1, -1, -4.4, y + 2.0, 0.6, { frame: 'gold' });
  trigger(x0, z0, x1, z1, () => G.secret('office', 'Кабинет управляющего'));
  zone(x0, z0, x1, z1, 'КАБИНЕТ УПРАВЛЯЮЩЕГО', { reverb: 0.08, muffle: 2000 });
}

// ======================================================================
// ПОДВАЛ
function buildBasement() {
  const L = -1; setLevel(L); const y = L * FH;
  const rooms = roomsSpec(L);
  const spec = { 1: 'котельная', 3: 'прачечная', 5: 'архив', 7: 'наблюдение', 2: 'склад мебели', 4: 'электрощитовая', 6: 'винный погреб', 8: 'камера хранения' };
  rooms.forEach(r => { r.name = spec[r.idx]; r.mat = M.concWall; r.floor = M.concrete; r.sound = 'concrete'; });
  rooms.find(r => r.idx === 6).floor = M.tileFloor;
  towerFloorsAndCeiling(L, rooms, { corrMat: M.concrete, corrSound: 'concrete', coreMat: M.concrete, coreSound: 'concrete' });
  towerOuter(L, rooms, { coreMat: M.concWall, glassBlocks: true });
  corridorWalls(L, rooms, {
    corrMat: M.concWall,
    doorOpts: r => {
      if (r.idx === 7) return null;
      const mt = col(0x4a5050);
      if (r.idx === 5) return { name: 'архив', locked: true, key: 'archiveKey', lockedMsg: 'Архив заперт. Нужен ключ.', plate: 'АРХИВ', heavy: true, mat: mt };
      return { name: r.name, plate: r.name.toUpperCase(), heavy: true, mat: mt };
    },
    partitionOps: { [24]: [{ at: 3.2, w: 1.4, type: 'open', h: 2.3 }] },
  });
  coreWalls(L, { coreMat: M.concWall, serviceName: 'кладовка' });
  for (const z of [-0.9, 0.9]) PR.ceilingPipe(TX0, TX1, y + 3.45, z, y + CEIL, 0.08, z > 0 ? 0x4a5a4a : 0x6a4a3a);
  for (const x of [4, 9, 14, 19, 24, 29]) PR.ceilingLamp(x, 0, { y: y + CEIL, kind: 'tube', color: 0xe8f0d0, intensity: 2.4, distance: 7, flicker: x === 14 || x === 24 ? 0.6 : 0.05 });
  // верхний свет в подвальных комнатах (котельная, прачечная, склад, наблюдение, кладовка) — у каждой свой выключатель
  for (const [lx, lz, on] of [[9.4, 3.3, true], [15, 3.9, true], [27, 4.6, false], [9, -3.9, true], [(SX0 + SX1) / 2, (TZ0 + SZ1) / 2, true]])
    PR.ceilingLamp(lx, lz, { y: y + CEIL, kind: 'tube', color: 0xe8f0d0, intensity: 1.8, distance: 6, flicker: 0.15, on });
  zone(6, CZ0, TX1, CZ1, 'ПОДВАЛ', { reverb: 0.55, buzz: 0.03, muffle: 1100, wind: 0 });
  zone(0, -1.5, 6, TZ1, 'ПОДВАЛ · ЛЕСТНИЦА', { reverb: 0.5, buzz: 0.02, muffle: 1100, wind: 0 });
  sgn('Б', 'z', TX0, 1, -0.95, y + 2.2, { w: 0.4, h: 0.4 });
  hangSign('ВЫХОД · ЛЕСТНИЦА', 0.95, y + 3.35, -1.45, 0, { w: 1.2, h: 0.2, bg: '#0a2a14', fg: '#6aff9a' });
  // Котельная
  PR.boiler(8.5, 4.5); PR.boiler(10.8, 3.9);
  PR.pipe(8.5, y + 3.0, 4.5, 8.5, y + 3.7, 4.5, 0.12); PR.pipe(10.8, y + 3.0, 3.9, 10.8, y + 3.7, 3.9, 0.12);
  const th = PR.grp(7.0, 2.2, 0); box(0.08, 0.25, 0.08, col(0x6a6a7a), 0, 0, 0, { parent: th }); PR.hitBox(th, 0.2, 0.3, 0.2);
  interact(th, 'Термос охранника', () => { S.sfxDrink(); G.note(...TXT.guardThermos); }); mount(th, 'floor');
  zone(6, CZ1, 12, TZ1, 'КОТЕЛЬНАЯ', { reverb: 0.5, buzz: 0.05, muffle: 900, wind: 0 });
  // Прачечная
  for (let i = 0; i < 5; i++) PR.washer(12.8 + i * 1.0, TZ1 - T / 2 - 0.32, P);
  PR.table(15, 3.2, { w: 2.0, d: 0.9 });
  PR.shelf(18 - T / 2 - 0.24, 3.4, -P / 2, { fill: 'towels', w: 1.6, color: 0x6a6a6a, d: 0.45 });
  pic(['01_japan_underground', '02_weirdcore_liminal'], 'z', 12, 1, 3.0, y + 1.8, 0.6, { frame: 'white' });
  zone(12, CZ1, 18, TZ1, 'ПРАЧЕЧНАЯ', { reverb: 0.35, muffle: 1000, wind: 0 });
  // Архив
  for (let i = 0; i < 2; i++) PR.shelf(19.4 + i * 2.0, 4.6, 0, { fill: 'files', w: 1.4, color: 0x4a4a4a, d: 0.45 });
  PR.ceilingLamp(21, 3.8, { y: y + CEIL, kind: 'pendant', intensity: 2, distance: 5, flicker: 0.2 });
  const sh = PR.shelf(24 - T / 2 - 0.24, 3.2, -P / 2, { fill: 'files', w: 1.6, color: 0x5a4a32, d: 0.45 });
  const shCol = W.colliders[W.colliders.length - 1];
  const tag = PR.sign('1999', 24 - T / 2 - 0.47, y + 2.05, 3.2, -P / 2, { w: 0.3, h: 0.12, qa: false });
  let slid = false;
  interact(sh, () => slid ? 'Стеллаж «1999»' : 'Толкнуть стеллаж «1999»', () => {
    if (slid) { G.toast('Папки пустые. На корешках — даты, которых не было.'); return; }
    slid = true; S.sfxSlide(); S.sfxSwitch(true);
    let k = 0; const iv = setInterval(() => { k++; sh.position.z += 0.025; tag.position.z += 0.025; if (k >= 60) clearInterval(iv); }, 16);
    shCol.minZ += 1.5; shCol.maxZ += 1.5;
    setTimeout(() => G.toast('Стеллаж отъехал. За ним — проход и мерцание экранов.'), 600);
  });
  pic(['01_japan_underground'], 'z', 18, 1, 3.0, y + 1.8, 0.6);
  pic(['plans'], 'x', CZ1, 1, 20.8, y + 1.8, 0.8, { frame: 'black' }); pic(['plans'], 'x', CZ1, 1, 23.0, y + 1.8, 0.8, { frame: 'black' });
  zone(18, CZ1, 24, TZ1, 'АРХИВ', { reverb: 0.1, muffle: 900, wind: 0 });
  // Комната наблюдения
  const od = PR.desk(27, 4.6, P);
  PR.chair(27, 3.95, P);
  PR.computer(...PR.top(od, -0.35, 0).toArray(), P, 'охрана', [
    { name: 'журнал/камеры.txt', story: 'guard', title: TXT.guardCctv[0], text: TXT.guardCctv[1] },
    { name: 'камера/карта.txt', story: 'manager', title: TXT.managerCard[0], text: TXT.managerCard[1] },
  ]);
  const feeds = [['CAM 01 ВЕСТИБЮЛЬ', '', '  [пусто]'], ['CAM 07 ЭТАЖ 3', '', '  [пусто]', '', ' 313 ?'], ['CAM 13 КРЫША', '', '  [стул]', '', ' [солнце]'], ['CAM 00', '', '  [ты]']];
  const zr = TZ1 - T / 2 - 0.38;
  box(5.2, 0.5, 0.55, col(0x2a2a2a), 27, y, zr); addCollider(24.4, y, zr - 0.28, 29.6, y + 0.5, zr + 0.28);
  feeds.forEach((f, i) => PR.tv(25.0 + i * 1.3, y + 0.5, zr, P, { on: true, screen: TX.screenTex(f) }));
  pic(['02_weirdcore_liminal', '03_y2k'], 'z', TX1, -1, 3.0, y + 1.9, 0.6);
  pic(['02_weirdcore_liminal', '03_y2k'], 'z', 24, 1, 5.3, y + 1.9, 0.45);
  PR.pickup(...PR.top(od, 0.3, 0.05).toArray(), 'infCard', 'карта-ключ «∞»', 'Пластиковая карта с голограммой: ∞.\nНа обороте: «Лифт. Нажать то, чего нет».', g => {
    box(0.16, 0.005, 0.1, col(0xd0d0e0, { emissive: 0x404060 }), 0, 0, 0, { parent: g });
  });
  PR.book(...PR.top(od, 0.02, 0.05).toArray(), P + 0.2, 'libParmenides', { color: 0x4a4a1a });
  trigger(24, CZ1, TX1, TZ1, () => G.secret('monitor', 'Комната наблюдения'));
  zone(24, CZ1, TX1, TZ1, 'КОМНАТА НАБЛЮДЕНИЯ', { reverb: 0.05, muffle: 700, buzz: 0.04, wind: 0 });
  // Склад мебели
  for (let i = 0; i < 4; i++) PR.stackedChairs(8.6 + i * 0.62, TZ0 + T / 2 + 0.38, (i % 3) * 0.2, 4 + i % 3);
  PR.sheetCovered(9.5, -3.6, 0.3, 2.0, 0.9, 1.0); PR.sheetCovered(11.0, -4.9, -0.4, 1.4, 1.2, 0.8);
  zone(6, TZ0, 12, CZ0, 'СКЛАД МЕБЕЛИ', { reverb: 0.3, muffle: 900, wind: 0 });
  // Электрощитовая
  const eg = PR.grp(18 - T / 2, -3.8, -P / 2);
  box(1.4, 1.8, 0.3, col(0x4a5a4a), 0, 0.5, 0.15, { parent: eg });
  const lever = box(0.08, 0.4, 0.08, col(0x9a1010, { emissive: 0x200000 }), 0.4, 1.3, 0.34, { parent: eg }); lever.userData.noMerge = true;
  for (let i = 0; i < 12; i++) box(0.12, 0.2, 0.05, col(0x111111), -0.5 + (i % 6) * 0.15, 1.0 + Math.floor(i / 6) * 0.35, 0.31, { parent: eg });
  interact(eg, () => G.flags.blackout ? 'Включить рубильник' : 'Выключить рубильник', () => {
    S.sfxSwitch(true); G.flags.blackout = !G.flags.blackout; lever.rotation.x = G.flags.blackout ? 2.6 : 0;
    for (const a of W.anchors) if (a.refresh) a.refresh(); // плафоны гаснут вместе с сетью
    G.toast(G.flags.blackout ? 'Свет погас во всём отеле. Остались только окна и солнце.' : 'Свет вернулся. Лампы гудят чуть громче, чем раньше.');
  });
  PR.solid(eg, 1.4, 0.3, 2.3, 0, 0.15); mount(eg, 'floor');
  sgn('ОПАСНО', 'z', 18, -1, -3.8, y + 2.7, { w: 0.5, h: 0.18, bg: '#e0c020', fg: '#111111', border: false });
  PR.note(18 - T / 2, y + 1.9, -2.5, -P / 2, ...noteArgs('guardSwitch').slice(0, 2), { flat: false, story: 'guard', color: 0xe8d84a });
  zone(12, TZ0, 18, CZ0, 'ЭЛЕКТРОЩИТОВАЯ', { reverb: 0.2, buzz: 0.09, muffle: 900, wind: 0 });
  PR.ceilingLamp(15, -4, { y: y + CEIL, kind: 'tube', color: 0xe8f0d0, intensity: 1.8, distance: 6, flicker: 0.5 });
  // Винный погреб
  for (let i = 0; i < 3; i++) PR.shelf(19.1 + i * 1.88, TZ0 + T / 2 + 0.26, 0, { fill: 'wine', w: 1.7, d: 0.45, color: 0x3a2214 });
  const barrel = PR.grp(21.5, -3.0, 0);
  const bb = cyl(0.42, 0.42, 0.9, 14, texMat('barrel', TX.wood('#5a3018'), 0xffffff, {}, 0), 0, 0, 0, { parent: barrel }); bb.rotation.z = P / 2; bb.position.y = 0.42;
  interact(barrel, 'Постучать по бочке', () => { S.sfxKnock(1); G.toast('Бочка полная. На крышке мелом: «на открытие ресторана».'); });
  PR.solid(barrel, 0.9, 0.84, 0.84); mount(barrel, 'floor');
  PR.glass(23.2, y, -2.2, { wine: true });
  PR.ceilingLamp(21, -3.8, { y: y + CEIL, kind: 'pendant', intensity: 2, distance: 5, color: 0xffa060 });
  zone(18, TZ0, 24, CZ0, 'ВИННЫЙ ПОГРЕБ', { reverb: 0.25, muffle: 800, wind: 0 });
  // Камера хранения
  const bags = [[25.4, -5.7, 0x6a2a1a], [26.3, -5.75, 0x2a3a5a], [27.4, -5.7, 0x8a1a1a], [28.4, -5.7, 0x3a3a2a], [29.3, -4.2, 0x5a4a2a]];
  bags.forEach(([x, z, c], i) => {
    const g = PR.grp(x, z, i === 4 ? P / 2 : 0);
    box(0.7, 0.5, 0.28, col(c), 0, 0, 0, { parent: g }); box(0.2, 0.06, 0.04, col(0x111111), 0, 0.5, 0, { parent: g });
    if (c === 0x8a1a1a) interact(g, 'Красный чемодан с наклейками', () => { S.sfxPaper(); G.note(...TXT.sonyaTag); });
    else interact(g, 'Осмотреть багаж', () => { S.sfxPaper(); G.toast(['Бирка: «Номер 401». Внутри — шуба. Летняя.', 'Бирка: «Орлов Л.». Внутри — ноты и галстук-бабочка.', 'Бирки нет. Чемодан тёплый.', 'Бирка: «до востребования». Востребовать некому.'][i % 4]); });
    PR.solid(g, 0.7, 0.28, 0.5); mount(g, 'floor');
  });
  PR.counter(26.4, -3.35, TX1 - T / 2, -2.85, 1.0, { top: 0x2a2a2a, front: '#4a4a4a' });
  PR.bell(27.2, y + 1.0, -3.1);
  sgn('КАМЕРА ХРАНЕНИЯ', 'z', TX1, -1, -2.2, y + 2.4, { w: 1.2, h: 0.22 });
  PR.ceilingLamp(27, -4, { y: y + CEIL, kind: 'tube', color: 0xe8f0d0, intensity: 2, distance: 6, flicker: 0.3 });
  zone(24, TZ0, TX1, CZ0, 'КАМЕРА ХРАНЕНИЯ', { reverb: 0.3, muffle: 900, wind: 0 });
  PR.shelf(SX1 - T / 2 - 0.24, -4.0, -P / 2, { fill: 'boxes', w: 2.6, d: 0.45 });
  zone(SX0, TZ0, SX1, SZ1, 'КЛАДОВКА', { reverb: 0.05, muffle: 900, wind: 0 });
}

// ======================================================================
// ЛЕСТНИЦА
function buildStairs() {
  const stepMat = texMat('steps', TX.wood('#3a2214'), 0xffffff, {}, 1);
  const rail = col(0x2a1c12);
  for (let L = -1; L <= 2; L++) {
    setLevel(L); const yb = L * FH;
    const n = 12;
    for (let i = 0; i < n; i++) {
      const z1 = SZ1 - i * (SZ1 - SLAND) / n, z0 = SZ1 - (i + 1) * (SZ1 - SLAND) / n;
      const yy = yb + (i + 1) * 2 / n;
      block(LA[0], yy - 0.22, z0, LA[1], yy, z1, stepMat, { collide: false });
    }
    surface(LA[0], SLAND, LA[1], SZ1, (x, z) => yb + 2 * (SZ1 - z) / (SZ1 - SLAND), 'wood');
    block(LA[0], yb + 1.8, SZ0, LB[1], yb + 2, SLAND, stepMat, { collide: false });
    surface(LA[0], SZ0, LB[1], SLAND, () => yb + 2, 'wood');
    for (let i = 0; i < n; i++) {
      const z0 = SLAND + i * (SZ1 - SLAND) / n, z1 = SLAND + (i + 1) * (SZ1 - SLAND) / n;
      const yy = yb + 2 + (i + 1) * 2 / n;
      block(LB[0], yy - 0.22, z0, LB[1], yy, z1, stepMat, { collide: false });
    }
    surface(LB[0], SLAND, LB[1], SZ1, (x, z) => yb + 2 + 2 * (z - SLAND) / (SZ1 - SLAND), 'wood');
    block(LA[1], yb, SLAND, LB[0], yb + FH, SZ1, rail);
    pic(['02_weirdcore_liminal', '01_japan_underground'], 'z', TX0, 1, -5.5, yb + 3.0, 0.55, { frame: 'black' });
    zone(LA[0], SZ0, LB[1], SZ1, 'ЛЕСТНИЦА', { reverb: 0.6, amb: 0.9 });
    // пролёты: тёплое бра над площадкой, второе над верхним маршем и холодный светильник у начала нижнего —
    // свет пятнами, а не ровной заливкой
    const s1 = sconceAt('z', LB[1] + 0.1, -1, -5.6, yb + 3.2); s1.intensity = 2.6; s1.distance = 5.5;
    const s2 = sconceAt('z', LB[1] + 0.1, -1, -2.9, yb + 3.35); s2.intensity = 1.8; s2.distance = 4.5;
    const ls = PR.sconce(LA[0] + 0.003, yb + 1.9, -2.2, P / 2); ls.color.setHex(0xc8d8ff); ls.intensity = 1.5;
  }
  setLevel(3);
  block(LA[1], 3 * FH, SLAND, LB[0], 3 * FH + 1.0, SZ1, rail);
  block(LB[0], 3 * FH, SLAND - 0.1, LB[1], 3 * FH + 1.0, SLAND, rail);
  zone(LA[0], SZ0, LB[1], SZ1, 'ЛЕСТНИЦА', { reverb: 0.6 });
  ceilRect(LA[0], SZ0, LB[1], SLAND, 3 * FH - 0.02, M.ceil); ceilRect(LA[0], SLAND, LA[1] + 0.2, SZ1, 3 * FH - 0.02, M.ceil);
}

// ======================================================================
// ЛИФТ
export const ELEV = { cx: (EX0 + EX1) / 2, cz: (EZ0 + TZ1) / 2, doors: {} };
function buildElevator() {
  for (const L of [-1, 0, 1, 2, 3, 4]) {
    setLevel(L); const y = L * FH;
    const cab = texMat('cab', TX.wood('#4a2814'), 0xffffff, {}, 1);
    block(EX0 + T / 2 + 0.03, y + 0.15, TZ1 - T / 2 - 0.05, EX1 - T / 2 - 0.03, y + 2.55, TZ1 - T / 2 - 0.03, cab, { collide: false });
    floorRect(EX0, EZ0, EX1, TZ1, y, texMat('cabF', TX.carpetOrnament('#5a1a22', '#a07a3a', 'cab'), 0xffffff, {}, 1.2), 'carpet');
    plane(1.6, 0.5, emis(0xffd090, 0.9), ELEV.cx, y + 2.59, ELEV.cz, P / 2, 0);
    anchor(ELEV.cx, y + 2.3, ELEV.cz, { color: 0xffd090, intensity: 2, distance: 4 });
    block(EX0, y + 2.6, EZ0, EX1, y + (L === 4 ? 2.99 : CEIL - 0.01), TZ1, col(0x2a2018), { collide: false });
    const dm = col(0x8a7450, { emissive: 0x100c06 });
    const dl = box(0.7, 2.3, 0.05, dm, ELEV.cx - 0.35, y, EZ0 - T / 2 - 0.03);
    const dr = box(0.7, 2.3, 0.05, dm, ELEV.cx + 0.35, y, EZ0 - T / 2 - 0.03);
    dl.userData.dynamic = dr.userData.dynamic = true;
    const dc = addCollider(ELEV.cx - 0.7, y, EZ0 - 0.1, ELEV.cx + 0.7, y + 2.3, EZ0 + 0.1);
    const st = { open: L === 0, k: L === 0 ? 1 : 0, dl, dr, dc };
    dc.enabled = !st.open;
    ELEV.doors[L] = st;
    W.animated.push(dt => {
      const t = st.open ? 1 : 0; st.k += (t - st.k) * Math.min(1, dt * 3);
      dl.position.x = ELEV.cx - 0.35 - st.k * 0.66; dr.position.x = ELEV.cx + 0.35 + st.k * 0.66;
    });
    if (L !== 4) {
      const p = onWall('x', EZ0, -1, 3.85);
      const cb = PR.grp(p.x, p.z, p.ry, y + 1.2);
      box(0.12, 0.2, 0.025, col(0x8a6a2a), 0, -0.1, 0.012, { parent: cb });
      box(0.05, 0.05, 0.02, emis(0xffa040, 0.8), 0, -0.03, 0.03, { parent: cb });
      interact(cb, () => st.open ? 'Двери лифта открыты' : 'Вызвать лифт', () => { S.sfxClick(); if (!st.open) setTimeout(() => { S.sfxElevatorDing(); st.open = true; dc.enabled = false; }, 900); });
      mount(cb, 'wall', { w: 0.12, h: 0.2, dy: -0.1 });
      sgn(L === -1 ? 'Б' : String(L + 1), 'x', EZ0, -1, ELEV.cx, y + 2.65, { w: 0.25, h: 0.2, bg: '#1a0800', fg: '#ff9a40', glowing: true, border: false });
    }
    const pp = onWall('z', EX1, -1, EZ0 + 0.8);
    const panel = PR.grp(pp.x, pp.z, pp.ry, y + 1.5);
    box(0.25, 0.6, 0.025, col(0x9a8a6a, { emissive: 0x100c06 }), 0, -0.3, 0.012, { parent: panel });
    for (let i = 0; i < 6; i++) box(0.05, 0.05, 0.015, emis(0xffb060, 0.6), (i % 2 - 0.5) * 0.09, -0.24 + Math.floor(i / 2) * 0.15, 0.03, { parent: panel });
    interact(panel, 'Панель лифта', () => G.elevatorPanel(L));
    mount(panel, 'wall', { w: 0.25, h: 0.6, dy: -0.3 });
    zone(EX0, EZ0, EX1, TZ1, 'ЛИФТ', { reverb: 0.03, muffle: 1800 });
  }
}
export function elevatorDoors(L, open) { const st = ELEV.doors[L]; if (!st) return; st.open = open; st.dc.enabled = !open; }

// ======================================================================
// КРЫША
function buildRoof() {
  setLevel(4); const y = 4 * FH;
  for (const r of rectMinus([TX0, TZ0, TX1, TZ1], [EX0, EZ0, EX1, TZ1])) floorRect(r[0], r[1], r[2], r[3], y, M.roof, 'roof');
  const pm = M.ext, cap = col(0xc8a070);
  block(TX0 - 0.2, y, TZ0 - 0.2, TX1 + 0.2, y + 1.0, TZ0, pm); block(TX0 - 0.2, y, TZ1, TX1 + 0.2, y + 1.0, TZ1 + 0.2, pm);
  block(TX0 - 0.2, y, TZ0, TX0, y + 1.0, TZ1, pm); block(TX1, y, TZ0, TX1 + 0.2, y + 1.0, TZ1, pm);
  block(TX0 - 0.26, y + 1.0, TZ0 - 0.26, TX1 + 0.26, y + 1.08, TZ0 + 0.04, cap, { collide: false }); block(TX0 - 0.26, y + 1.0, TZ1 - 0.04, TX1 + 0.26, y + 1.08, TZ1 + 0.26, cap, { collide: false });
  block(TX0 - 0.26, y + 1.001, TZ0 + 0.04, TX0 + 0.04, y + 1.079, TZ1 - 0.04, cap, { collide: false }); block(TX1 - 0.04, y + 1.001, TZ0 + 0.04, TX1 + 0.26, y + 1.079, TZ1 - 0.04, cap, { collide: false });
  wall('z', EX0, EZ0, TZ1, y, 3, { neg: M.ext, pos: col(0x2a2622) }, [], { trim: false });
  wall('z', EX1, EZ0, TZ1, y, 3, { neg: col(0x2a2622), pos: M.ext }, [], { trim: false });
  wall('x', EZ0, EX0 - T / 2, EX1 + T / 2, y, 3, { neg: M.ext, pos: col(0x2a2622) }, [{ at: ELEV.cx, w: 1.4, type: 'open', h: 2.3 }], { trim: false });
  block(EX0 - 0.2, y + 3, EZ0 - 0.2, EX1 + 0.2, y + 3.2, TZ1, M.ext, { collide: false });
  const tank = PR.grp(20, 3, 0);
  cyl(1.4, 1.4, 2.4, 14, col(0x6a4a40), 0, 1.6, 0, { parent: tank });
  for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) box(0.12, 1.6, 0.12, col(0x3a2a24), a * 0.9, 0, b * 0.9, { parent: tank });
  interact(tank, 'Постучать по баку', () => { S.sfxKnock(2); G.toast('Бак полон до краёв. Вода тёплая даже через металл.'); }); mount(tank, 'floor');
  addCollider(18.6, y, 1.6, 21.4, y + 4, 4.4);
  const ant = PR.grp(27, -4, 0); box(0.1, 6, 0.1, col(0x3a2a24), 0, 0, 0, { parent: ant }); box(1.5, 0.05, 0.05, col(0x3a2a24), 0, 5, 0, { parent: ant });
  const blink = box(0.12, 0.12, 0.12, emis(0xff2020, 1), 0, 6, 0, { parent: ant }); blink.userData.noMerge = true;
  W.animated.push((dt, t) => { blink.visible = (t % 2) < 0.4; }); mount(ant, 'floor');
  addCollider(26.9, y, -4.1, 27.1, y + 6, -3.9);
  const ch = PR.chair(8, -2, -P / 2 - 0.25, { sit: false, color: 0x7a6a5a, seatColor: 0x9a2a3a });
  interact(ch, 'Сесть и смотреть на солнце', () => { G.sit({ x: 8, y: y + 1.15, z: -2, yaw: P / 2 - 0.25, lie: false }); setTimeout(() => G.ending(), 2500); });
  PR.note(8.6, y, -2.6, 0.2, ...noteArgs('managerRoof'));
  trigger(TX0, TZ0, TX1, TZ1, () => G.secret('roof', 'Крыша'));
  zone(TX0, TZ0, TX1, TZ1, 'КРЫША', { reverb: 0.02, wind: 0.12, muffle: 2400 });
}

// ======================================================================
// КРЫЛО ЗА ВЕСТИБЮЛЕМ: бальный зал, библиотека, курительная (по схеме Riviera 1954)
function buildWing() {
  setLevel(0); const y = 0;
  const tall = (at, w = 2.0) => ({ at, w, type: 'window', sill: 0.5, h: 6.4, light: 0.3, mull: 2 });
  // полы и потолки
  floorRect(LX0, LZ1, WX, WZ1, y, M.parquet, 'wood');
  floorRect(WX, LZ1, TX0, WZS, y, texMat('libCarp', TX.carpetOrnament('#1e3226', '#8a7a3a', 'lib'), 0xffffff, {}, 1.6), 'carpet');
  floorRect(WX, WZS, TX0, WZ1, y, texMat('cigCarp', TX.carpetOrnament('#3a1410', '#9a6a2a', 'cig'), 0xffffff, {}, 1.6), 'carpet');
  ceilRect(LX0, LZ1, TX0, WZ1, y + LH, M.coffer);
  // наружные стены
  wall('z', LX0, LZ1, WZ1 + T / 2, y, LH, { neg: M.ext, pos: M.ballWall }, [17.5, 21.5, 25.5, 29.5].map(z => tall(z, 1.8)), { inside: 1, ceil: LH });
  wall('x', WZ1, LX0, WX, y, LH, { neg: M.ballWall, pos: M.ext }, [tall(-23.8, 2.2), tall(-10.4, 2.2)], { inside: -1, ceil: LH });
  wall('x', WZ1, WX, TX0 + T / 2, y, LH, { neg: M.cigarWall, pos: M.ext }, [tall(-4, 2.6)], { inside: -1, ceil: LH });
  wall('z', TX0, LZ1, WZS, y, LH, { neg: M.libWall, pos: M.ext }, [tall(18.5, 2.4)], { inside: -1, ceil: LH });
  wall('z', TX0, WZS, WZ1, y, LH, { neg: M.cigarWall, pos: M.ext }, [tall(27.5, 2.4)], { inside: -1, ceil: LH });
  // внутренние
  wall('z', WX, LZ1, WZS, y, LH, { neg: M.ballWall, pos: M.libWall }, [{ at: 18.5, w: 1.2, type: 'door', h: 2.4 }], { ceil: LH });
  wall('z', WX, WZS, WZ1, y, LH, { neg: M.ballWall, pos: M.cigarWall }, [], { ceil: LH });
  wall('x', WZS, WX, TX0, y, LH, { neg: M.libWall, pos: M.cigarWall }, [{ at: -4, w: 1.2, type: 'door', h: 2.4 }], { ceil: LH });
  new Door('z', WX, 18.5, { name: 'дверь в библиотеку', swing: 1, w: 1.2, h: 2.4 });
  new Door('x', WZS, -4, { name: 'курительная', swing: 1, w: 1.2, h: 2.4, mat: texMat('doorRed', TX.wood('#5a1a1a'), 0xffffff, {}, 1) });
  sgn('FUMOIR · КУРИТЕЛЬНАЯ', 'x', WZS, -1, -4, y + 2.9, { w: 1.5, h: 0.22 });

  // ---------- бальный зал: пусто, просторно, зеркала и тишина ----------
  const bx = (LX0 + WX) / 2; // -17
  for (const [cx, cz] of [[-21.5, 18.5], [-12.5, 18.5], [-21.5, 26], [-12.5, 26]]) PR.chandelier(cx, cz, y + LH);
  PR.mirrorBall(bx, 22.2, y + LH);
  anchor(bx, y + 5.5, 22.2, { color: 0xffc8a0, intensity: 6, distance: 14 });
  // сцена с занавесом
  const st = [-21.2, 28.8, -12.8, WZ1 - T / 2];
  block(st[0], y, st[1], st[2], y + 0.45, st[3], texMat('stage', TX.wood('#4a2a14'), 0xffffff, {}, 1.5), { collide: false });
  surface(st[0], st[1], st[2], st[3], () => y + 0.45, 'wood');
  for (let i = 0; i < 14; i++) box(0.6, 6.5, 0.12, col(0x6a1020), st[0] + 0.3 + i * 0.6, y + 0.45, WZ1 - T / 2 - 0.1 - (i % 2) * 0.06);
  box(8.6, 0.6, 0.3, col(0x4a0c18), bx, y + 6.95, WZ1 - T / 2 - 0.2);
  for (let i = 0; i < 8; i++) { const ox = st[0] + 0.6 + i * 1.0; plane(0.16, 0.08, emis(0xffd090, 1.2), ox, y + 0.47, st[1] + 0.08, -P / 2, 0).userData.noRay = true; }
  anchor(bx, y + 2.5, 30, { color: 0xffb070, intensity: 5, distance: 8 });
  for (let i = 0; i < 6; i++) PR.chair(-20 + i * 1.3, 30.2, P, { color: 0x2a1a10, seatColor: 0x6a1a24, y: y + 0.45 });
  PR.mic(bx, 29.4, P, () => { S.sfxClick(); S.sfxKnock(1); setTimeout(() => S.sfxKnock(1), 900); G.subtitle('«Дамы и господа…» — эхо отвечает через секунду: «…господа…»'); });
  W.group.children[W.group.children.length - 1].position.y = y + 0.45;
  // столы вдоль стен, остальное пространство — пусто
  for (const [tx, tz] of [[-23.6, 16.6], [-23.6, 23.5], [-10.4, 16.0], [-10.4, 25.8]]) {
    const t = PR.table(tx, tz, { w: 1.1, round: true, cloth: 0xe8e0d0 });
    for (let k = 0; k < 3; k++) { const a = k * 2.09 + 0.3; PR.chair(tx + Math.cos(a) * 0.9, tz + Math.sin(a) * 0.9, -a - P / 2, { color: 0x3a1a10, seatColor: 0x7a1a24 }); }
    PR.glass(...PR.top(t, -0.2, 0.15).toArray(), { wine: true }); PR.candle(...PR.top(t, 0.1, -0.15).toArray(), { on: tx > -20 });
  }
  PR.ashtray(...PR.top({ position: new THREE.Vector3(-23.6, y, 23.5), rotation: new THREE.Euler(), userData: { top: 0.75 } }, 0.25, 0.1).toArray());
  PR.note(-10.4 - 0.2, y + 0.75, 16.0 + 0.2, 0.3, ...noteArgs('ballProgram'));
  for (const [cx, cz, r] of [[-25.2, 31.0, 0.2], [-24.6, 31.2, 0.5], [-9.0, 31.1, -0.3]]) PR.stackedChairs(cx, cz, r, 6);
  PR.book(-17.6, y + 0.45, 29.2, 0.4, 'libPlatoCave', { open: true, color: 0x2a3a6a });
  // зеркала на стене к библиотеке
  for (const z of [21.4, 24.8, 28.2]) mirrorPanel('z', WX, -1, z, y + 2.4, 1.2, 3.6);
  // портреты со стендов вестибюля — теперь на стенах бального зала
  for (const z of [19.5, 23.5, 27.5]) pic(['portrait', 'art'], 'z', LX0, 1, z, y + 2.3, 1.0, { frame: 'gold' });
  for (const x of [-24.3, -15.6, -12.6, -9.8]) pic(['portrait', 'art'], 'x', LZ1, 1, x, y + 2.3, 0.95, { frame: 'gold' });
  zone(LX0, LZ1, WX, WZ1, 'БАЛЬНЫЙ ЗАЛ', { reverb: 1.0, amb: 1.5, wind: 0.03 });

  // ---------- библиотека ----------
  const sh = (x, z, ry, w) => PR.shelf(x, z, ry, { fill: 'books', w, h: 3.0, d: 0.4, color: 0x3a2214 });
  sh(TX0 - T / 2 - 0.25, 15.75, -P / 2, 2.0); sh(TX0 - T / 2 - 0.25, 21.45, -P / 2, 1.8);
  sh(-6.3, WZS - T / 2 - 0.25, P, 2.4); sh(-1.6, WZS - T / 2 - 0.25, P, 2.4);
  sh(WX + T / 2 + 0.25, 16.05, P / 2, 2.4); sh(WX + T / 2 + 0.25, 21.4, P / 2, 1.8);
  sh(-6.4, LZ1 + T / 2 + 0.25, 0, 2.4); sh(-1.6, LZ1 + T / 2 + 0.25, 0, 2.4);
  for (const tz of [17.3, 20.3]) {
    const t = PR.table(-4, tz, { w: 2.0, d: 0.9, color: '#3a2214' });
    PR.chair(-4.6, tz - 0.75, 0); PR.chair(-3.4, tz + 0.75, P);
    PR.tableLamp(...PR.top(t, -0.75, 0).toArray(), { shade: 0x2a6a3a });
  }
  const t1 = { position: new THREE.Vector3(-4, y, 17.3), rotation: new THREE.Euler(), userData: { top: 0.75 } };
  const t2 = { position: new THREE.Vector3(-4, y, 20.3), rotation: new THREE.Euler(), userData: { top: 0.75 } };
  PR.book(...PR.top(t1, 0.2, 0).toArray(), 0.1, 'libPlatoSophist', { open: true, color: 0x2a3a6a });
  PR.book(...PR.top(t1, 0.75, 0.1).toArray(), -0.3, 'libGuenonSolid', { color: 0x1a1a1a });
  PR.book(...PR.top(t2, 0.2, 0).toArray(), -0.1, 'libBaudEccl', { open: true, color: 0x8a2a2a });
  PR.book(...PR.top(t2, 0.75, -0.1).toArray(), 0.4, 'libGuenonCrisis', { color: 0x3a2a1a });
  PR.hourglass(...PR.top(t2, -0.4, 0.2).toArray());
  const gt = PR.table(-6.6, 19, { w: 0.5, d: 0.5, color: '#3a2214' }); PR.globe(...PR.top(gt).toArray());
  PR.armchair(-1.2, 19.0, -P / 2 - 0.3, 0x2a4a3a); PR.floorLamp(-1.0, 17.4);
  // кафедра с картой, которая «предшествует территории»
  const lec = PR.grp(-6.4, 22.0 - 0.1, P * 0.85); box(0.5, 1.0, 0.4, texMat('lectern', TX.wood('#4a2a14'), 0xffffff, {}, 1), 0, 0, 0, { parent: lec }); PR.solid(lec, 0.5, 0.4, 1.0); mount(lec, 'floor');
  PR.book(...PR.wp(lec, 0, 1.02, 0).toArray(), P * 0.85, 'libBaudMap', { open: true, color: 0x6a1a2a });
  pic(['plans'], 'z', TX0, -1, 21.6, y + 4.6, 1.5, { frame: 'black' });
  PR.ceilingLamp(-4, 18.8, { y: y + LH, kind: 'pendant', intensity: 4, distance: 9, color: 0xffd0a0 });
  zone(WX, LZ1, TX0, WZS, 'БИБЛИОТЕКА', { reverb: 0.12, amb: 1.25, muffle: 2200 });

  // ---------- курительная ----------
  PR.sofa(-4, 29.6, P, 0x4a2418, 2.6);
  PR.armchair(-6.5, 26.8, P / 2 + 0.2, 0x5a2a1a); PR.armchair(-1.5, 26.8, -P / 2 - 0.2, 0x5a2a1a); PR.armchair(-4, 25.0, 0, 0x5a2a1a);
  const ct = PR.table(-4, 27.3, { w: 1.4, d: 0.8, h: 0.45, color: '#2a1810' });
  PR.ashtray(...PR.top(ct, -0.4, 0.1).toArray()); PR.ashtray(...PR.top(ct, 0.45, -0.15).toArray(), { cigar: false });
  PR.cigarBox(...PR.top(ct, 0.05, 0.15).toArray(), 0.2);
  PR.matchbook(...PR.top(ct, 0.25, -0.25).toArray(), 0.4);
  PR.book(...PR.top(ct, -0.05, -0.2).toArray(), 0.2, 'libLandDesire', { color: 0x1a1a1a });
  PR.glass(...PR.top(ct, 0.55, 0.2).toArray()); PR.bottle(...PR.top(ct, -0.6, -0.2).toArray(), 0x6a3a0a);
  const st2 = PR.table(-7.0, 30.6, { w: 0.6, d: 0.6, color: '#2a1810' }); PR.chessboard(...PR.top(st2).toArray(), 0.3);
  PR.chair(-7.0, 29.8, 0, { color: 0x3a1a10, seatColor: 0x2a4a3a });
  const st3 = PR.table(-1.0, 31.1, { w: 0.6, d: 0.5, color: '#2a1810' }); PR.book(...PR.top(st3).toArray(), -0.4, 'libLandHuman', { color: 0x4a0a1a }); PR.postcard(...PR.top(st3, 0.15, 0.1).toArray(), 0.3, 'postcard3');
  PR.ashtray(-6.6, y + 0, 24.0);
  PR.floorLamp(-7.3, 24.0); PR.floorLamp(-0.8, 24.2);
  pic(['art', 'portrait', '06_vintage_photos'], 'x', WZS, 1, -6.4, y + 2.1, 0.8, { frame: 'gold' });
  pic(['art', 'portrait', '06_vintage_photos'], 'x', WZS, 1, -1.6, y + 2.1, 0.8, { frame: 'gold' });
  PR.ceilingLamp(-4, 27.5, { y: y + LH, kind: 'pendant', intensity: 3, distance: 8, color: 0xffa060 });
  zone(WX, WZS, TX0, WZ1, 'КУРИТЕЛЬНАЯ', { reverb: 0.1, amb: 1.15, muffle: 1800 });
}
// Зеркало в раме на стене
function mirrorPanel(axis, c, side, along, yc, w, h) {
  const p = onWall(axis, c, side, along);
  const g = PR.grp(p.x, p.z, p.ry, yc);
  const fm = col(0x8a6a2a, { emissive: 0x1a1000 });
  for (const [bw, bh, bx, by] of [[w + 0.16, 0.08, 0, h / 2 + 0.04], [w + 0.16, 0.08, 0, -h / 2 - 0.04], [0.08, h, -w / 2 - 0.04, 0], [0.08, h, w / 2 + 0.04, 0]]) box(bw, bh, 0.05, fm, bx, by - bh / 2, 0.025, { parent: g });
  const m = plane(w, h, col(0x5a6670, { emissive: 0x1a2228 }), 0, 0, 0.02, 0, 0, { parent: g }); m.userData.noMerge = true;
  interact(g, 'Посмотреть в зеркало', () => G.toast(['В зеркале зал полон танцующих пар. Ты оборачиваешься — пусто.', 'Отражение отстаёт на полсекунды.', 'В зеркале люстры горят. Здесь — тоже. Но иначе.', 'Ты видишь себя со спины.'][Math.floor(Math.random() * 4)]));
  mount(g, 'wall', { w: w + 0.16, h: h + 0.16 });
}

function fillLeftoverImages() {
  setLevel(-1); const y = -FH;
  let i = 0;
  while (true) {
    const im = W.images.find(im => !W.usedImages.has(im.id) && im.group !== 'plans'); if (!im) break;
    W.usedImages.add(im.id);
    if (i < 8) {
      const side = i % 2 ? 1 : -1, slot = Math.floor(i / 2);
      pic(im, 'x', side > 0 ? CZ1 : CZ0, -side, 9.6 + slot * 6, y + 1.7, 0.6, { frame: 'dark' });
    } else {
      const k = i - 8;
      const g = picture(im, 6.6 + (k % 7) * 0.7, y + 0.38, CZ0 - T / 2 - 0.13 - Math.floor(k / 7) * 0.13, P, 0.6, { frame: 'dark', lean: 0.2, qa: false });
      mount(g, 'lean');
    }
    i++;
  }
}
