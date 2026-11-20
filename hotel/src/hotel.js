// Планировка отеля: подвал, вестибюль + служебное крыло, три жилых этажа, крыша.
// Координаты: X — с запада на восток, Z — с юга на север, Y — вверх. 1 единица = 1 м.
import * as THREE from 'three';
import { W, G, FH, T, setLevel, wall, block, floorRect, ceilRect, surface, rectMinus, col, texMat, emis, basic, Door, interact, anchor, glow, zone, trigger, picture, addCollider, box, cyl, plane } from './engine.js';
import * as TX from './textures.js';
import * as PR from './props.js';
import * as S from './audio.js';

const P = Math.PI;
// башня
const TX0 = 0, TX1 = 30, TZ0 = -6.4, TZ1 = 6.4;
const CZ0 = -1.3, CZ1 = 1.3; // коридор
// лестница: две полосы
const LA = [0.15, 1.75], LB = [1.95, 3.4], SZ0 = -6.3, SZ1 = -1.5, SLAND = -4.7;
// лифт
const EX0 = 1.2, EX1 = 4.2, EZ0 = 3.6;
// вестибюль
const LX0 = -26, LZ0 = -14, LZ1 = 14, LH = 8;

// ----- материалы -----
const M = {};
function mats() {
  M.ext = texMat('ext', TX.concrete('#4a3a3a', 3), 0xffffff);
  M.corrWall = texMat('corrWall', TX.wallpaper('#3a3220', '#4d4128', 'stripes', 2), 0xffffff);
  M.carpet = texMat('carpet', TX.carpetGreen(), 0xffffff);
  M.ceil = texMat('ceil', TX.ceilingTiles(), 0xffffff);
  M.door = null;
  M.lobbyWall = texMat('lobbyWall', TX.wallpaper('#2a1618', '#3a1e20', 'damask', 5), 0xffffff);
  M.marble = texMat('marble', TX.marble(), 0xffffff);
  M.concrete = texMat('conc', TX.concrete('#34302c', 6), 0xffffff);
  M.concWall = texMat('concWall', TX.concrete('#3e3a34', 12), 0xffffff);
  M.tileW = texMat('tileW', TX.tiles('#4a5050', '#444a4a', '#1a1e1e', 6), 0xffffff);
  M.tileFloor = texMat('tileF', TX.tiles('#2a2a2e', '#1c1c20', '#0a0a0a', 4), 0xffffff);
  M.pinkTile = texMat('pinkT', TX.tiles('#a8607a', '#9a5470', '#5a2a3a', 6), 0xffffff, { emissive: 0x2a0a14 });
  M.poolTile = texMat('poolT', TX.tiles('#2a6a7a', '#256070', '#0a2a30', 6), 0xffffff);
  M.parquet = texMat('parq', TX.parquet(), 0xffffff);
  M.roof = texMat('roof', TX.concrete('#3a2a2a', 33), 0xffffff);
  M.rooms = [
    texMat('rw0', TX.wallpaper('#1d3438', '#25444a', 'stripes', 3), 0xffffff),
    texMat('rw1', TX.wallpaper('#3b2433', '#4c2e42', 'damask', 4), 0xffffff),
    texMat('rw2', TX.wallpaper('#33261c', '#45331f', 'diamonds', 5), 0xffffff),
    texMat('rw3', TX.wallpaper('#1c2033', '#2a3050', 'dots', 6), 0xffffff),
    texMat('rw4', TX.wallpaper('#2e1a1a', '#452424', 'stripes', 7), 0xffffff),
    texMat('rw5', TX.wallpaper('#26301c', '#34422a', 'damask', 8), 0xffffff),
  ];
  M.roomFloors = [
    texMat('rf0', TX.carpetPlain('#2a1a14', 4), 0xffffff), texMat('rf1', TX.carpetPlain('#1a2228', 5), 0xffffff),
    texMat('rf2', TX.carpetPlain('#2c1a22', 6), 0xffffff), M.parquet,
  ];
}

// ======================================================================
export function buildHotel() {
  mats();
  buildBasement();
  buildGround();
  buildLobby();
  for (const L of [1, 2, 3]) buildGuestFloor(L);
  buildRoof();
  buildStairs();
  buildElevator();
  fillLeftoverImages();
}

// ---------- общий каркас этажа башни ----------
function towerShell(L, { floorMat, floorSound, wallInMat, westOpen = false, basement = false }) {
  setLevel(L);
  const y = L * FH;
  // пол (с дырой под лестницу, кроме подвала) и потолок
  const full = [TX0, TZ0, TX1, TZ1];
  const holeBelow = [LA[0], SZ0, LB[1], SZ1];
  const floorRects = basement ? [full] : (L === 3 ? rectMinus(full, [LB[0], SLAND, LB[1], SZ1]) : rectMinus(full, holeBelow));
  for (const r of floorRects) floorRect(r[0], r[1], r[2], r[3], y, floorMat, floorSound);
  const ceilRects = L === 3 ? [full] : rectMinus(full, holeBelow);
  for (const r of ceilRects) ceilRect(r[0], r[1], r[2], r[3], y + 3.7, M.ceil);
  // межэтажная плита (видна снаружи) — тонкий торец
  block(TX0 - 0.1, y + 3.7, TZ0 - 0.1, TX1 + 0.1, y + 4, TZ0 + 0.1, M.ext, { collide: false });
  block(TX0 - 0.1, y + 3.7, TZ1 - 0.1, TX1 + 0.1, y + 4, TZ1 + 0.1, M.ext, { collide: false });
  return y;
}

// Комнаты вдоль коридора: возвращает описания
function roomsSpec() {
  const xs = [[6, 12], [12, 18], [18, 24], [24, 30]];
  const out = [];
  xs.forEach((xr, i) => { out.push({ x0: xr[0], x1: xr[1], z0: CZ1, z1: TZ1, side: 1, idx: i * 2 + 1 }); out.push({ x0: xr[0], x1: xr[1], z0: TZ0, z1: CZ0, side: -1, idx: i * 2 + 2 }); });
  return out;
}

// Окна на наружных стенах номеров
function roomWin(x0, x1, opts = {}) { return [{ at: (x0 + x1) / 2, w: opts.w || 2.2, type: 'window', sill: 0.75, h: 2.1, light: 0.24 }]; }

// ---------- стены ядра (лифт, лестница, служебная) — одинаковы на всех этажах ----------
function coreWalls(L, y, { coreMat, serviceDoor = true, serviceName = 'служебное помещение', serviceLocked = false, serviceOnOpen = null, serviceKey = null, westWindows = true, westMat = null } = {}) {
  const h = FH;
  // шахта лифта
  wall('z', EX0, EZ0, TZ1, y, h, { neg: coreMat, pos: col(0x2a2622) });
  wall('z', EX1, EZ0, TZ1, y, h, { neg: col(0x2a2622), pos: coreMat });
  wall('x', EZ0, EX0 - T / 2, EX1 + T / 2, y, h, { neg: coreMat, pos: col(0x2a2622) }, [{ at: (EX0 + EX1) / 2, w: 1.4, type: 'open', h: 2.3 }]);
  // восточная стенка лестничной клетки
  wall('z', LB[1] + 0.1, TZ0, SZ1, y, h, { neg: M.concWall, pos: coreMat });
  // служебная комнатка x 3.6..6, z -6.4..-1.5
  const sx = (LB[1] + 0.1 + 6) / 2;
  wall('x', SZ1, LB[1] + 0.1, 6 - T / 2, y, h, { neg: col(0x3a3630), pos: coreMat }, serviceDoor ? [{ at: sx, w: 1.0, type: 'door' }] : []);
  let door = null;
  if (serviceDoor) door = new Door('x', SZ1, sx, { name: serviceName, swing: -1, locked: serviceLocked, onOpen: serviceOnOpen, key: serviceKey });
  return door;
}

function towerOuterWalls(L, y, { inMat, westOpenZ = null, westInMat = null, basement = false, corridorEnd = true, northRooms = true, southRooms = true, stairWindows = true }) {
  const h = FH;
  const wi = basement ? (a, b) => [{ at: (a + b) / 2, w: 1.6, type: 'blocks', sill: 2.9, h: 0.6 }] : roomWin;
  // северная и южная стены по комнатам
  const segsN = [], segsS = [];
  for (const [a, b] of [[6, 12], [12, 18], [18, 24], [24, 30]]) { segsN.push(...wi(a, b)); segsS.push(...wi(a, b)); }
  // окна в ядре: у лифтового холла северная ниша, у лестницы южная
  if (!basement) { segsN.push({ at: 0.6, w: 0.9, type: 'window', sill: 0.9, h: 2 }); segsN.push({ at: 5.1, w: 1.4, type: 'window', sill: 0.9, h: 2 }); }
  if (!basement && stairWindows) segsS.push({ at: 1.8, w: 2.4, type: 'window', sill: 1.6, h: 1.8, light: 0.12 });
  wall('x', TZ1, TX0 - T / 2, TX1 + T / 2, y, h, { neg: inMat, pos: M.ext }, segsN, { inside: -1 });
  wall('x', TZ0, TX0 - T / 2, TX1 + T / 2, y, h, { neg: M.ext, pos: inMat }, segsS, { inside: 1 });
  // восточный торец: окно в конце коридора
  const east = [];
  if (corridorEnd) east.push(basement ? { at: 0, w: 1.6, type: 'blocks', sill: 2.9, h: 0.6 } : { at: 0, w: 1.8, type: 'window', sill: 0.5, h: 2.6, light: 0.3 });
  for (const [a, b] of [[CZ1, TZ1], [TZ0, CZ0]]) east.push(basement ? { at: (a + b) / 2, w: 1.4, type: 'blocks', sill: 2.9, h: 0.6 } : { at: (a + b) / 2, w: 1.8, type: 'window', sill: 0.75, h: 2.1 });
  wall('z', TX1, TZ0, TZ1, y, h, { neg: inMat, pos: M.ext }, east, { inside: -1 });
  // западная стена
  if (westOpenZ) {
    wall('z', TX0, TZ0, TZ1, y, h, { neg: westInMat || M.lobbyWall, pos: inMat }, [{ at: (westOpenZ[0] + westOpenZ[1]) / 2, w: westOpenZ[1] - westOpenZ[0], type: 'open', h: 3.3 }]);
  } else {
    const ws = basement ? [] : [{ at: 1.0, w: 2.6, type: 'window', sill: 0.6, h: 2.4, light: 0.25 }, { at: -3.6, w: 2.4, type: 'window', sill: 1.4, h: 2.0, light: 0.1 }];
    wall('z', TX0, TZ0, TZ1, y, h, { neg: L === 1 ? M.lobbyWall : M.ext, pos: inMat }, ws, { inside: L === 1 ? 0 : 1 });
  }
}

// Стены коридора с дверьми номеров. spec — список комнат; makeDoor(room) -> опции двери или null (стена)
function corridorWalls(L, y, rooms, { corrMat, doorOpts }) {
  for (const side of [1, -1]) {
    const c = side > 0 ? CZ1 : CZ0;
    const rs = rooms.filter(r => r.side === side);
    const ops = []; const doors = [];
    for (const r of rs) {
      const o = doorOpts(r);
      if (o) { const at = r.x0 + 1.1; ops.push({ at, w: 1.0, type: 'door' }); doors.push([r, at, o]); }
    }
    wall('x', c, 6 - T / 2, TX1, y, FH, side > 0 ? { neg: corrMat, pos: rs[0].mat } : { neg: rs[0].mat, pos: corrMat }, ops);
    for (const [r, at, o] of doors) {
      r.door = new Door('x', c, at, { swing: side, hinge: -1, ...o });
      // табличка с номером
      if (o.plate !== false) {
        PR.sign(o.plate || String(r.num), at + 0.85, y + 1.6, c - side * 0.11, side > 0 ? P : 0, { w: 0.26, h: 0.14, bg: '#1a120a', fg: '#c8a860', font: 'bold 52px Georgia, serif' });
      }
    }
  }
  // перегородки между комнатами (по X), материал по обе стороны — обои соседних номеров
  for (const side of [1, -1]) {
    const rs = rooms.filter(r => r.side === side).sort((a, b) => a.x0 - b.x0);
    const z0 = side > 0 ? CZ1 : TZ0, z1 = side > 0 ? TZ1 : CZ0;
    // x = 6 — граница с ядром
    wall('z', 6, z0, z1, y, FH, { neg: rs[0].coreSideMat || M.corrWall, pos: rs[0].mat });
    for (let i = 1; i < rs.length; i++) wall('z', rs[i].x0, z0, z1, y, FH, { neg: rs[i - 1].mat, pos: rs[i].mat });
  }
}

// ======================================================================
// ГОСТЕВЫЕ ЭТАЖИ
const ROOM_KINDS = ['standard', 'twin', 'empty', 'gamer', 'office', 'kids', 'party', 'photo', 'lounge', 'tvroom', 'flooded', 'standard'];
const FLOOR_GROUPS = {
  1: ['01_japan_underground', 'portrait', '06_vintage_photos'],
  2: ['06_vintage_photos', 'portrait', 'art', '01_japan_underground'],
  3: ['03_y2k', '04_retro_consoles', '05_retro_games_arcade', '01_japan_underground'],
};

function buildGuestFloor(L) {
  const y = towerShell(L, { floorMat: M.carpet, floorSound: 'carpet' });
  const fnum = L + 1; // этажи 2,3,4
  const rooms = roomsSpec();
  rooms.forEach((r, i) => {
    r.num = fnum * 100 + r.idx;
    r.mat = M.rooms[(i + L * 3) % M.rooms.length];
    r.floor = M.roomFloors[(i + L) % M.roomFloors.length];
    r.kind = ROOM_KINDS[(i * 5 + L * 3) % ROOM_KINDS.length];
  });
  // особые комнаты
  if (L === 2) { const r = rooms.find(r => r.idx === 8); r.secretPool = true; r.mat = M.poolTile; r.num = 313; }
  if (L === 3) { rooms.find(r => r.idx === 2).kind = 'wardrobe'; }
  if (L === 1) { rooms.find(r => r.idx === 6).kind = 'knock'; }
  if (L === 3) { rooms.find(r => r.idx === 1).kind = 'tvroom'; }
  if (L === 2) { rooms.find(r => r.idx === 3).kind = 'flooded'; }
  // коридор (стены — обои коридора)
  towerOuterWalls(L, y, { inMat: M.corrWall });
  // перекрасим внутренние стороны наружных стен в номерах: используем дополнительные «облицовки»
  for (const r of rooms) roomLining(r, y);
  corridorWalls(L, y, rooms, {
    corrMat: M.corrWall,
    doorOpts: r => {
      if (r.secretPool) return null; // вместо двери — картина
      const locked = (r.idx + L) % 4 === 0 || r.kind === 'knock';
      return {
        name: 'номер ' + r.num, locked, plate: String(r.num),
        lockedMsg: ['Заперто. Табличка «Не беспокоить».', 'Заперто. Из-под двери тянет холодом.', 'Заперто. Внутри играет та же музыка, но на полтона ниже.'][r.idx % 3],
        onLocked: r.kind === 'knock' ? () => { S.sfxKnock(3); setTimeout(() => { S.sfxKnock(3); G.subtitle('…кто-то постучал в ответ изнутри.'); }, 1300); } : null,
      };
    },
  });
  // ядро
  const corr = coreWalls(L, y, {
    coreMat: M.corrWall,
    serviceName: L === 1 ? 'бельевая' : 'подсобка этажа',
    serviceDoor: L !== 3,
    serviceLocked: L === 2,
    serviceOnOpen: null,
  });
  if (L === 2 && corr) corr.lockedMsg = 'Заперто. На двери нацарапано: «Не там ищешь».';
  // светильники коридора, бра, ковровая дорожка уже — пол
  for (let x = 2; x < 30; x += 4) PR.ceilingLamp(x + 1, 0, { y: y + 3.7, intensity: 3, distance: 7, flicker: (x === 18 && L === 2) ? 0.9 : 0, kind: 'dome' });
  for (const r of rooms) if (r.side > 0) { PR.sconce(r.x0 + 3.6, y + 2.0, CZ1 - 0.12, P); }
  for (const r of rooms) if (r.side < 0) { PR.sconce(r.x0 + 3.6, y + 2.0, CZ0 + 0.12, 0); }
  // плинтус-панель по низу коридора
  const wain = texMat('wain', TX.wood('#24160e'), 0xffffff);
  block(6, y, CZ1 - T / 2 - 0.04, TX1 - 0.1, y + 0.9, CZ1 - T / 2, wain, { collide: false });
  block(6, y, CZ0 + T / 2, TX1 - 0.1, y + 0.9, CZ0 + T / 2 + 0.04, wain, { collide: false });
  // картины в коридоре
  const cg = ['02_weirdcore_liminal', ...FLOOR_GROUPS[L]];
  for (const r of rooms) {
    if (r.secretPool) continue;
    const zc = r.side > 0 ? CZ1 - T / 2 - 0.03 : CZ0 + T / 2 + 0.03;
    picture(cg, r.x0 + 4.4, y + 1.75, zc, r.side > 0 ? P : 0, 0.75, { frame: 'gold' });
  }
  // знаки, огнетушитель, предметы
  PR.exitSign(0.95, y + 3.3, SZ1 + 0.02, 0);
  PR.sign(`ЭТАЖ ${fnum}`, 0.12, y + 2.2, -0.95, P / 2, { w: 0.7, h: 0.25 });
  hangSign(`${fnum}01 – ${fnum}08  →`, 5.9, y + 3.3, 0);
  PR.fireExt(29.2, CZ0 + 0.2, 0);
  PR.plant(29.4, CZ1 - 0.45, { s: 0.9 });
  PR.chair(5.2, 2.9, -P / 2 - 0.3);
  PR.vending(5.15, 5.6, -P / 2);
  if (L === 1) PR.tray(16.6, y, CZ1 - 0.35);
  if (L === 2) PR.luggageCart(21, 0.4, 0.1);
  if (L === 3) { PR.stackedChairs(28.8, -0.5, 0.4, 4); }
  zone(0, CZ0, TX1, CZ1, `ЭТАЖ ${fnum} · КОРИДОР`, { reverb: 0.2, sound: 'carpet' });
  zone(0, -1.5, 6, TZ1, `ЭТАЖ ${fnum} · ЛИФТОВОЙ ХОЛЛ`, { reverb: 0.25 });
  // наполнение номеров
  for (const r of rooms) {
    if (r.secretPool) { poolRoom(r, y); continue; }
    zone(r.x0, r.z0, r.x1, r.z1, 'НОМЕР ' + r.num, { reverb: 0.12 });
    furnishRoom(r, y, L);
  }
  // служебные комнаты ядра
  const sx0 = LB[1] + 0.2, sx1 = 6 - T / 2;
  if (L === 1) linenRoom(sx0, sx1, y);
  if (L === 2) { iceRoom(sx0, sx1, y); }
  if (L === 3) tvSecretRoom(sx0, sx1, y);
  // ниши ядра
  PR.plant(0.6, 5.7, { s: 1 });
}

// внутренняя отделка номера — перекрываем наружную стену и пол обоями/ковром
function roomLining(r, y) {
  // на наружной стене делаем тонкую «обойную» облицовку, чтобы номер был своего цвета
  const zin = r.side > 0 ? TZ1 - T / 2 - 0.01 : TZ0 + T / 2 + 0.01;
  const win = { a: (r.x0 + r.x1) / 2 - 1.1, b: (r.x0 + r.x1) / 2 + 1.1 };
  const addLin = (x0, x1, y0, y1) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, y1 - y0), r.mat);
    m.geometry.attributes.uv.array.forEach((v, i, a) => { a[i] = v * (i % 2 ? (y1 - y0) : (x1 - x0)) / 2; });
    m.position.set((x0 + x1) / 2, (y0 + y1) / 2, zin); m.rotation.y = r.side > 0 ? P : 0; W.group.add(m);
  };
  addLin(r.x0 + 0.1, win.a, y, y + 3.7); addLin(win.b, r.x1 - 0.1, y, y + 3.7);
  addLin(win.a, win.b, y, y + 0.75); addLin(win.a, win.b, y + 2.85, y + 3.7);
  if (r.secretPool) return;
  // пол номера поверх коридорного ковра
  const fm = new THREE.Mesh(new THREE.PlaneGeometry(r.x1 - r.x0 - 0.2, r.z1 - r.z0 - 0.2), r.floor);
  fm.geometry.attributes.uv.array.forEach((v, i, a) => { a[i] = v * (i % 2 ? (r.z1 - r.z0) : (r.x1 - r.x0)) / 2; });
  fm.rotation.x = -P / 2; fm.position.set((r.x0 + r.x1) / 2, y + 0.004, (r.z0 + r.z1) / 2); W.group.add(fm);
  W.surfaces.push({ minX: r.x0 + 0.1, maxX: r.x1 - 0.1, minZ: Math.min(r.z0, r.z1) + 0.1, maxZ: Math.max(r.z0, r.z1) - 0.1, y: () => y, sound: r.floor === M.parquet ? 'wood' : 'carpet' });
}

// Расстановка мебели в номере. Локальная система: «глубь» — от коридора к окну.
function furnishRoom(r, y, L) {
  const s = r.side; // +1 север, -1 юг
  const cx = (r.x0 + r.x1) / 2;
  const zWin = s > 0 ? TZ1 - 0.35 : TZ0 + 0.35;      // у окна
  const zDoor = s > 0 ? CZ1 + 0.4 : CZ0 - 0.4;       // у двери
  const zMid = (r.z0 + r.z1) / 2;
  const faceIn = s > 0 ? P : 0;                      // ry «лицом» от окна к коридору
  const faceWin = s > 0 ? 0 : P;
  const groups = FLOOR_GROUPS[L];
  const pic = (x, zz, ry, g = groups, size = 0.8, yy = y + 1.75) => picture(g, x, yy, zz, ry, size);
  const xr = r.x1 - 0.12, xl = r.x0 + 0.12; // восточная и западная стены (внутренние поверхности)
  // шторы и потолочный свет — у всех
  PR.curtains('x', s > 0 ? TZ1 - T / 2 : TZ0 + T / 2, cx - 1.1, cx + 1.1, y, -s, [0x4a1420, 0x14304a, 0x3a2a14, 0x2a1a3a][r.idx % 4]);
  const lightOn = !['empty', 'photo', 'tvroom'].includes(r.kind);
  PR.ceilingLamp(cx, zMid, { y: y + 3.7, intensity: 2.5, distance: 6, on: lightOn, kind: r.idx % 3 === 0 ? 'pendant' : 'dome' });
  const sideWall = r.idx % 4 < 2 ? 'east' : 'west';
  const xs = sideWall === 'east' ? xr : xl; const xo = sideWall === 'east' ? xl : xr; const ryWall = sideWall === 'east' ? -P / 2 : P / 2; const dx = sideWall === 'east' ? -1 : 1;

  switch (r.kind) {
    case 'standard': case 'knock': default: {
      PR.bed(xs + dx * 1.1, zMid + s * 0.2, ryWall, { color: [0x5a1e2a, 0x1e3a5a, 0x3a3a1e][r.idx % 3], msg: r.num === 207 ? 'Потолок здесь чуть ниже, чем должен быть.' : null });
      PR.nightstand(xs + dx * 0.3, zMid + s * 1.5, ryWall, { phone: phoneMsg(r.num) });
      PR.nightstand(xs + dx * 0.3, zMid - s * 1.1, ryWall, { lamp: true });
      PR.dresser(xo - dx * 0.27, zMid, -ryWall, { w: 1.3 });
      PR.tv(xo - dx * 0.3, y + 0.8, zMid, -ryWall);
      PR.armchair(cx + dx * 1.5, zWin - s * 0.9, faceIn + dx * 0.5);
      PR.rug(cx, zMid, 2.6, 1.6, TX.carpetRed());
      pic(xs + dx * 0.01, zMid + s * 0.2, ryWall, groups, 1.0, y + 1.9);
      pic(xs + dx * 5.76, zMid + s * 1.5, -ryWall, groups, 0.6);
      pic(cx + dx * 1.6, zDoor - s * 0.3 + s * 0.12, faceWin, groups, 0.6, y + 1.7);
      break;
    }
    case 'twin': {
      PR.bed(xs + dx * 0.9, zMid + s * 0.6, ryWall, { double: false, color: 0x2a4a3a });
      PR.bed(xs + dx * 2.5, zMid + s * 0.6, ryWall, { double: false, color: 0x2a4a3a });
      PR.nightstand(xs + dx * 1.7, zMid + s * 1.2 + s * 0.4, ryWall, { phone: phoneMsg(r.num) });
      PR.desk(xo - dx * 0.35, zMid, -ryWall); PR.chair(xo - dx * 0.95, zMid, -ryWall + P);
      PR.radio(xo - dx * 0.35, y + 0.77, zMid + 0.3, -ryWall);
      pic(xs + dx * 0.01, zMid + s * 0.6, ryWall, groups, 0.9, y + 2.0);
      pic(xs + dx * 5.76, zMid + s * 0.1, -ryWall, groups, 0.7, y + 1.8);
      pic(cx, zDoor - s * 0.28, faceWin, groups, 0.55, y + 2.4);
      break;
    }
    case 'empty': {
      // пустой номер: стул лицом к окну и одна картина
      PR.chair(cx, zWin - s * 1.4, faceWin + P);
      pic(xs + dx * 0.01, zMid, ryWall, ['02_weirdcore_liminal', ...groups], 1.2, y + 1.8);
      pic(xs + dx * 5.76, zMid, -ryWall, ['02_weirdcore_liminal', ...groups], 0.6, y + 1.8);
      PR.note(cx + 0.4, y + 0.003, zWin - s * 1.0, 0.4, 'Записка на полу', 'Я сижу здесь и смотрю на солнце уже третий день.\nОно не садится.\nОно никогда не садится.');
      break;
    }
    case 'gamer': {
      PR.bed(xs + dx * 1.1, zMid + s * 0.3, ryWall, { color: 0x3a1a5a });
      PR.desk(xo - dx * 0.35, zMid + s * 0.4, -ryWall); PR.chair(xo - dx * 0.95, zMid + s * 0.4, -ryWall + P);
      PR.tv(xo - dx * 0.3, y + 0.77, zMid + s * 0.4, -ryWall, { on: true });
      const cg = ['04_retro_consoles', '05_retro_games_arcade', ...groups];
      pic(xs + dx * 5.76, zMid + s * 1.6, -ryWall, cg, 0.6); pic(xs + dx * 5.76, zMid - s * 0.9, -ryWall, cg, 0.6);
      pic(xs + dx * 0.01, zMid + s * 0.3, ryWall, cg, 0.9, y + 2.0);
      PR.rug(cx, zMid, 2, 2, TX.carpetPlain('#3a1a4a', 9));
      break;
    }
    case 'office': {
      PR.desk(cx, zWin - s * 1.1, faceIn); PR.chair(cx, zWin - s * 1.7, faceWin + P);
      PR.tableLamp(cx - 0.45, y + 0.77, zWin - s * 1.1);
      PR.note(cx + 0.2, y + 0.775, zWin - s * 1.1, 0.2, 'Бланк отеля', `Отель «Полдень». Номер ${r.num}.\nВыезд: —\nОплачено: навсегда.\nПримечание: гость просил не будить.`);
      PR.shelf(xs + dx * 0.3, zMid, ryWall, { fill: 'files', w: 1.6, color: 0x2a1a10 });
      PR.bed(xo - dx * 1.1, zMid + s * 0.2, -ryWall, { double: false, color: 0x3a2a1a });
      pic(xs + dx * 5.76, zMid + s * 1.6, -ryWall, groups, 0.55);
      pic(cx + 1.5, zDoor - s * 0.28, faceWin, groups, 0.7, y + 1.8);
      pic(cx - 1.5, zDoor - s * 0.28, faceWin, groups, 0.7, y + 1.8);
      break;
    }
    case 'kids': {
      PR.bunk(xs + dx * 0.7, zMid + s * 0.4, ryWall);
      PR.table(cx + dx * 1.2, zMid, { w: 0.7, d: 0.7, h: 0.5, round: true, color: 0x5a3a2a });
      PR.chair(cx + dx * 1.7, zMid, -P / 2 * dx, { color: 0x2a4a6a, seatColor: 0x6a2a2a });
      PR.tv(xo - dx * 0.35, y, zMid - s * 1.0, -ryWall, { on: true });
      const kg = ['06_vintage_photos', '05_retro_games_arcade', ...groups];
      pic(xs + dx * 5.76, zMid + s * 1.2, -ryWall, kg, 0.55); pic(cx, zDoor - s * 0.28, faceWin, kg, 0.6, y + 1.6);
      pic(xs + dx * 0.01, zMid - s * 1.7, ryWall, kg, 0.5, y + 1.5);
      PR.note(cx + dx * 1.2, y + 0.5, zMid, 0.3, 'Рисунок карандашом', 'На рисунке — этот отель. Над крышей нарисован стул и солнце.\nПодпись: «туда можно только на лифте ∞».');
      break;
    }
    case 'party': {
      PR.bed(xs + dx * 1.1, zMid + s * 0.2, ryWall, { color: 0x6a1a3a });
      const t = PR.table(cx + dx * 1.3, zMid - s * 0.4, { w: 1.2, d: 0.8, color: 0x1a1210 });
      for (let i = 0; i < 6; i++) PR.glass(cx + dx * 1.3 - 0.45 + i * 0.18, y + 0.75, zMid - s * 0.4 + (i % 2 ? 0.2 : -0.15), { wine: i % 2 === 0 });
      PR.bottle(cx + dx * 1.3 + 0.2, y + 0.75, zMid - s * 0.4 - 0.05, 0x3a0a1a);
      PR.bottle(xs + dx * 0.4, y, zMid + s * 1.9, 0x1a3a1a);
      for (let i = 0; i < 3; i++) PR.glass(xs + dx * (3 + i * 0.4), y, zMid + s * (1.2 + (i % 2) * 0.3));
      PR.radio(xs + dx * 0.3, y, zMid - s * 1.6, ryWall);
      PR.sofa(xo - dx * 0.5, zMid, -ryWall, 0x3a1030, 1.8);
      pic(xs + dx * 5.76, zMid, -ryWall, groups, 0.8, y + 2.05);
      pic(xs + dx * 0.01, zMid + s * 0.2, ryWall, groups, 0.9, y + 2.0);
      PR.ceilingFan(cx, zMid + s * 1.3, y + 3.7);
      break;
    }
    case 'photo': {
      // фотолаборатория с красным светом
      anchor(cx, y + 2.6, zMid, { color: 0xff1020, intensity: 4, distance: 7 });
      plane(0.25, 0.25, emis(0xff1010, 1), cx, y + 3.68, zMid, P / 2, 0);
      PR.table(xs + dx * 0.5, zMid, { w: 0.8, d: 2.6, color: 0x1a1a1a });
      for (let i = 0; i < 4; i++) box(0.4, 0.06, 0.3, col(0x2a2a2a), xs + dx * 0.5, y + 0.75, zMid - 1 + i * 0.65);
      const pg = ['06_vintage_photos', '02_weirdcore_liminal', ...groups];
      // «сохнущие» фото на верёвке
      box(0.01, 0.01, 4, col(0x777777), cx + dx * 0.3, y + 2.4, zMid);
      for (let i = 0; i < 3; i++) { const p = picture(pg, cx + dx * 0.3, y + 2.15, zMid - 1.2 + i * 1.2, P / 2, 0.42, { frame: 'white' }); }
      pic(xs + dx * 5.76, zMid, -ryWall, pg, 0.7);
      PR.note(xs + dx * 0.5, y + 0.76, zMid + 1.1, 0.1, 'Конверт с негативами', 'На всех негативах — один и тот же пустой коридор.\nНа последнем кадре в конце коридора кто-то стоит.\nНа отпечатке его уже нет.');
      break;
    }
    case 'lounge': {
      PR.sofa(cx, zWin - s * 1.2, faceIn, 0x1a3a3a, 2.2);
      PR.armchair(xs + dx * 1.0, zMid - s * 0.6, ryWall + dx * 0.3, 0x3a2a1a);
      PR.table(cx, zMid, { w: 1.0, d: 0.6, h: 0.45, color: 0x1a1210 });
      PR.glass(cx - 0.2, y + 0.45, zMid); PR.glass(cx + 0.15, y + 0.45, zMid + 0.1, { wine: true });
      PR.floorLamp(xo - dx * 0.4, zWin - s * 0.6);
      PR.tv(xo - dx * 0.35, y, zMid - s * 0.8, -ryWall);
      pic(xs + dx * 0.01, zMid + s * 1.0, ryWall, groups, 0.9); pic(xs + dx * 5.76, zMid + s * 1.2, -ryWall, groups, 0.6);
      pic(cx, zDoor - s * 0.28, faceWin, groups, 0.7, y + 1.9);
      PR.ceilingFan(cx, zMid, y + 3.7);
      break;
    }
    case 'tvroom': {
      // номер, где все телевизоры включены
      PR.bed(xs + dx * 1.1, zMid + s * 0.2, ryWall, { color: 0x1a1a3a });
      for (let i = 0; i < 4; i++) PR.tv(xo - dx * 0.4, y + 0.5 + (i > 1 ? 0.55 : 0), zMid - s * 0.4 + (i % 2) * 0.75 * s, -ryWall, { on: true });
      box(0.6, 0.5, 1.9, col(0x1a1410), xo - dx * 0.4, y, zMid - s * 0.05);
      pic(xs + dx * 0.01, zMid + s * 0.2, ryWall, ['03_y2k', ...groups], 0.9, y + 2.0);
      pic(cx, zDoor - s * 0.28, faceWin, ['03_y2k', ...groups], 0.6, y + 1.8);
      pic(xs + dx * 5.76, zMid + s * 1.5, -ryWall, ['03_y2k', ...groups], 0.55);
      break;
    }
    case 'flooded': {
      // затопленный номер: вода по щиколотку
      const wm = new THREE.MeshLambertMaterial({ map: TX.waterTex(), transparent: true, opacity: 0.75, emissive: 0x0a3038, color: 0x88c8d0 });
      wm.map = TX.waterTex().clone(); wm.map.needsUpdate = true;
      const water = plane(r.x1 - r.x0 - 0.3, Math.abs(r.z1 - r.z0) - 0.3, wm, cx, y + 0.12, zMid, -P / 2, 0);
      W.animated.push((dt, t) => { wm.map.offset.set(t * 0.02, Math.sin(t * 0.3) * 0.05); });
      W.surfaces.push({ minX: r.x0 + 0.3, maxX: r.x1 - 0.3, minZ: Math.min(r.z0, r.z1) + 0.3, maxZ: Math.max(r.z0, r.z1) - 0.3, y: () => y + 0.01, sound: 'water' });
      PR.bed(xs + dx * 1.1, zMid + s * 0.2, ryWall, { color: 0x2a3a4a, msg: 'Матрас влажный. Сквозь воду видно ковёр с тем же узором, что и в коридоре.' });
      PR.chair(cx + dx * 1.5, zMid - s * 0.5, 0.7);
      pic(xs + dx * 0.01, zMid + s * 0.2, ryWall, ['02_weirdcore_liminal', ...groups], 0.9, y + 2.0);
      pic(xs + dx * 5.76, zMid, -ryWall, groups, 0.7, y + 1.9);
      pic(cx, zDoor - s * 0.28, faceWin, groups, 0.55, y + 1.9);
      zone(r.x0, r.z0, r.x1, r.z1, 'НОМЕР ' + r.num + ' · ВОДА', { reverb: 0.4, muffle: 900 });
      break;
    }
    case 'wardrobe': {
      // секрет: шкаф у западной стены ведёт в «комнату телевизоров»
      PR.bed(xr - 1.1, zMid + s * 0.2, -P / 2, { color: 0x2a1a2a });
      PR.nightstand(xr - 0.3, zMid + s * 1.5, -P / 2, { phone: phoneMsg(r.num) });
      PR.wardrobe(r.x0 + 0.45, zMid, P / 2, {
        label: 'Залезть в шкаф', action: () => {
          S.sfxDoorOpen(); G.teleport(4.8, y, -3.4, 0, 'Из шкафа дует. Ты протискиваешься между пальто…');
        },
      });
      PR.armchair(cx, zWin - s * 0.9, faceIn);
      PR.note(xr - 0.3, y + 0.56, zMid - s * 1.1, 0, 'Жалоба гостя', 'Администрации.\nИз шкафа в моём номере постоянно дует и слышно телевизоры.\nПроверьте, пожалуйста, что за стеной.\n— гость 402');
      pic(xr, zMid + s * 0.2, -P / 2, groups, 0.9, y + 2.0);
      pic(cx, zDoor - s * 0.28, faceWin, groups, 0.6, y + 1.8);
      pic(r.x0 + 0.13, zMid + s * 1.8, P / 2, groups, 0.5, y + 1.8);
      break;
    }
  }
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
// СЕКРЕТНЫЕ И СЛУЖЕБНЫЕ ПОМЕЩЕНИЯ ЯДРА
function serviceBox(x0, x1, y, mat, floorMat, sound) {
  floorRect(x0, TZ0 + T / 2, x1, SZ1 - T / 2, y, floorMat, sound, { walk: false });
}
function linenRoom(x0, x1, y) {
  // Бельевая (этаж 2): секрет №4
  const zc = (TZ0 + SZ1) / 2;
  PR.shelf(x1 - 0.3, zc - 0.8, -P / 2, { fill: 'towels', w: 2.2, color: 0x6a6a6a });
  PR.shelf(x0 + 0.3, zc - 1.2, P / 2, { fill: 'towels', w: 1.6, color: 0x6a6a6a });
  PR.ceilingLamp((x0 + x1) / 2, zc, { y: y + 3.7, kind: 'tube', color: 0xd0f0ff, intensity: 2, distance: 5, flicker: 0.6 });
  picture(['02_weirdcore_liminal'], (x0 + x1) / 2, y + 1.7, TZ0 + T / 2 + 0.03, 0, 0.8, { frame: 'black' });
  PR.note((x0 + x1) / 2 + 0.3, y + 0.003, zc + 0.6, 0.3, 'Записка горничной', 'Если найдёшь это — значит, ты тоже здесь застрял(а).\n\nНа третьем этаже нет номера 308.\nЗато в конце коридора висит картина, которую нельзя трогать.\nЯ её тронула.');
  trigger(x0, TZ0, x1, SZ1, () => G.secret('linen', 'Бельевая'));
  zone(x0, TZ0, x1, SZ1, 'БЕЛЬЕВАЯ', { reverb: 0.05, buzz: 0.02 });
}
function iceRoom(x0, x1, y) {
  const zc = (TZ0 + SZ1) / 2;
  const g = PR.grp(x1 - 0.5, zc, -P / 2);
  box(0.8, 1.6, 0.8, col(0x8a8a90), 0, 0, 0, { parent: g });
  interact(g, 'Взять лёд', () => { S.sfxVending(); G.toast('Лёд с запахом хлорки. Где-то рядом бассейн?'); });
  PR.ceilingLamp((x0 + x1) / 2, zc, { y: y + 3.7, kind: 'tube', color: 0xd0f0ff, intensity: 2, distance: 5 });
  zone(x0, TZ0, x1, SZ1, 'ПОДСОБКА ЭТАЖА', { reverb: 0.05, buzz: 0.03 });
}
function tvSecretRoom(x0, x1, y) {
  // Этаж 4: комната телевизоров, без двери — только через шкаф 402. Секрет №6
  const zc = (TZ0 + SZ1) / 2;
  for (let i = 0; i < 6; i++) {
    const t = PR.tv(x0 + 0.5 + (i % 2) * 0.9, y + Math.floor(i / 2) * 0.55, TZ0 + 0.6, 0.1 * (i % 2 ? -1 : 1), { on: true });
  }
  PR.tv(x0 + 0.4, y, SZ1 - 0.7, P / 2 + 0.3, { on: true, screen: TX.screenTex(['NO SIGNAL', '', 'КАНАЛ 0', '', 'ВЫ УЖЕ', 'СМОТРИТЕ ЭТО']) });
  picture(['03_y2k', '02_weirdcore_liminal'], x1 - 0.03 - T / 2, y + 1.9, zc - 0.7, -P / 2, 0.8);
  picture(['03_y2k', '02_weirdcore_liminal'], x1 - 0.03 - T / 2, y + 1.9, zc + 1.2, -P / 2, 0.6);
  // свеча
  const c = PR.grp(x1 - 0.6, SZ1 - 0.5, 0); box(0.06, 0.18, 0.06, col(0xe8e0c8), 0, 0, 0, { parent: c });
  box(0.02, 0.04, 0.02, emis(0xffa030, 1.5), 0, 0.18, 0, { parent: c });
  anchor(x1 - 0.6, y + 0.4, SZ1 - 0.5, { color: 0xffa040, intensity: 1.2, distance: 3, flicker: 0.4 });
  PR.wardrobe(5.55, -3.9, -P / 2, { label: 'Вылезти через шкаф', action: () => { S.sfxDoorOpen(); G.teleport(7.4, y, -3.9, -P / 2, 'Ты выбираешься обратно в номер 402.'); } });
  trigger(x0, TZ0, x1, SZ1, () => G.secret('tvs', 'Комната телевизоров'));
  zone(x0, TZ0, x1, SZ1, '???', { reverb: 0.05, muffle: 1400 });
}

// Комната 313 — бассейн (этаж 4… нет, этаж 3). Секрет №5
function poolRoom(r, y) {
  const s = r.side;
  // дверь-картина в коридоре: при взаимодействии отъезжает
  const at = r.x0 + 3;
  const c = CZ0;
  // стена коридора без двери уже построена; делаем секретную панель — проём закрыт «картиной-дверью»
  // сначала прорежем: поставим отдельную секцию стены с проёмом
  const panelGroup = new THREE.Group(); W.group.add(panelGroup);
  const pm = M.corrWall;
  const panel = new THREE.Mesh(new THREE.BoxGeometry(1.0, 2.2, 0.06), pm);
  panel.position.set(at, y + 1.1, c + 0.13); panelGroup.add(panel);
  const pic = picture(['02_weirdcore_liminal'], at, y + 1.5, c + 0.17, 0, 0.75, { frame: 'gold', parent: panelGroup });
  pic.position.set(at, y + 1.5, c + 0.17);
  const col0 = addCollider(at - 0.5, y, c - 0.1, at + 0.5, y + 2.2, c + 0.2);
  let opened = false;
  // переопределяем действие картины
  const openIt = () => {
    if (opened) { G.showPicture(pic.userData.img); return; }
    opened = true; S.sfxSlide(); col0.enabled = false;
    let k = 0; const iv = setInterval(() => { k++; panelGroup.position.x = k * 0.03; if (k >= 37) clearInterval(iv); }, 16);
    G.toast('Картина сдвинулась вместе со стеной…');
  };
  pic.userData.interact.label = 'Поправить картину';
  pic.userData.interact.action = openIt;
  interact(panel, 'Постучать по стене', () => { S.sfxKnock(2); G.toast('Звук гулкий. За стеной пустота.'); });
  // настоящая стена коридора напротив этой комнаты была построена сплошной — прорезаем: отключим её коллайдер в проёме
  // (стена строится до этого вызова; найдём сегмент и заменим)
  carveOpening('x', c, at, 1.0, y, 2.2);
  // интерьер: бассейн. Пол — приподнятая палуба, чаша утоплена (чтобы не залезать в номер под ним)
  const DK = 0.32, x0 = r.x0 + 0.8, x1 = r.x1 - 0.8, z0 = TZ0 + 0.8, z1 = CZ0 - 1.5;
  const fm = M.poolTile;
  for (const rr of rectMinus([r.x0 + 0.1, TZ0 + 0.1, r.x1 - 0.1, CZ0 - 0.1], [x0, z0, x1, z1])) {
    floorRect(rr[0], rr[1], rr[2], rr[3], y + DK, fm, 'tile', { s: 1 });
    block(rr[0], y, rr[1], rr[2], y + DK, rr[3], fm, { collide: false, s: 1 });
  }
  floorRect(x0, z0, x1, z1, y + 0.02, texMat('poolBottom', TX.tiles('#1a4a5a', '#184452', '#08202a', 6), 0xffffff), 'water', { s: 1 });
  const wm = new THREE.MeshBasicMaterial({ map: TX.waterTex(), transparent: true, opacity: 0.6, color: 0x9ae8f0, depthWrite: false });
  plane(x1 - x0, z1 - z0, wm, (x0 + x1) / 2, y + DK - 0.06, (z0 + z1) / 2, -P / 2, 0);
  W.animated.push((dt, t) => { wm.map.offset.set(t * 0.03, Math.sin(t * 0.4) * 0.04); });
  anchor((x0 + x1) / 2, y + 0.6, (z0 + z1) / 2, { color: 0x40e0ff, intensity: 5, distance: 7 });
  glow((x0 + x1) / 2, y + 3.68, (z0 + z1) / 2, 4, 0x40d0ff, 0.25, { rx: P / 2 });
  // обои комнаты — плитка; добавим лежак и картины
  const lounger = PR.grp(r.x1 - 0.5, CZ0 - 0.75, -P / 2); PR.solid(lounger, 1.8, 0.6, 0.7);
  box(0.6, 0.35, 1.8, col(0xd8d0c0), 0, DK, 0, { parent: lounger });
  interact(lounger, 'Прилечь на шезлонг', () => G.sit({ x: r.x1 - 0.5, y: y + DK + 0.8, z: CZ0 - 0.75, yaw: P / 2, lie: true }));
  picture(['02_weirdcore_liminal'], r.x0 + 0.13, y + 1.8, -3.8, P / 2, 1.0, { frame: 'white' });
  picture(['02_weirdcore_liminal'], r.x1 - 0.13, y + 1.8, -4.4, -P / 2, 0.8, { frame: 'white' });
  PR.note(r.x0 + 0.5, y + DK, CZ0 - 0.4, 0.2, 'Табличка у бассейна', 'БАССЕЙН ЗАКРЫТ НА СЕЗОН.\n\nСезон: всегда.\nСпасатель: на обеде с 1999 года.');
  trigger(r.x0, TZ0, r.x1, CZ0, () => G.secret('pool', 'Номер 313 · бассейн'));
  zone(r.x0, TZ0, r.x1, CZ0, 'НОМЕР 313', { reverb: 0.7, muffle: 1300 });
  // табличка 313 — перечёркнутая
  PR.sign('3̶1̶3̶', at + 0.85, y + 1.6, c + 0.11, 0, { w: 0.26, h: 0.14, bg: '#1a120a', fg: '#c8a860' });
  // ряд номеров подсказывает: 302, 304, 306, —
}

// Прорезает проём в уже построенной стене: удаляет меши/коллайдеры сегментов,
// пересекающих проём, и строит их заново с дыркой
function carveOpening(axis, c, at, w, y, h) {
  const s0 = at - w / 2, s1 = at + w / 2;
  const victims = W.group.children.filter(m => m.isMesh && m.userData.collider && (() => {
    const cl = m.userData.collider; if (!cl.enabled) return false;
    if (axis === 'x') return Math.abs((cl.minZ + cl.maxZ) / 2 - c) < 0.05 && cl.minX < s1 && cl.maxX > s0 && cl.minY < y + h && cl.maxY > y && cl.maxZ - cl.minZ < 0.25;
    return false;
  })());
  for (const m of victims) {
    const cl = m.userData.collider; cl.enabled = false; W.group.remove(m);
    const mats = m.material;
    if (cl.minX < s0) block(cl.minX, cl.minY, cl.minZ, s0, cl.maxY, cl.maxZ, mats);
    if (cl.maxX > s1) block(s1, cl.minY, cl.minZ, cl.maxX, cl.maxY, cl.maxZ, mats);
    if (cl.maxY > y + h) block(Math.max(s0, cl.minX), Math.max(cl.minY, y + h), cl.minZ, Math.min(s1, cl.maxX), cl.maxY, cl.maxZ, mats);
    if (cl.minY < y) block(Math.max(s0, cl.minX), cl.minY, cl.minZ, Math.min(s1, cl.maxX), y, cl.maxZ, mats);
  }
}

// ======================================================================
// ПЕРВЫЙ ЭТАЖ: служебное крыло башни
function buildGround() {
  const L = 0; setLevel(L); const y = 0;
  // пол: коридор — ковёр, комнаты — по-разному
  const holeBelow = [LA[0], SZ0, LB[1], SZ1];
  for (const r of rectMinus([TX0, TZ0, 6, TZ1], holeBelow)) floorRect(r[0], r[1], r[2], r[3], y, M.marble, 'marble', { s: 2 });
  floorRect(6, CZ0, TX1, CZ1, y, M.carpet, 'carpet');
  floorRect(6, CZ1, 18, TZ1, y, M.tileFloor, 'tile', { s: 1 });      // подсобка + кухня
  floorRect(18, CZ1, TX1, TZ1, y, M.parquet, 'wood');                // бар
  floorRect(6, TZ0, 18, CZ0, y, M.tileFloor, 'tile', { s: 1 });      // уборные
  floorRect(18, TZ0, 24, CZ0, y, M.concrete, 'concrete');            // персонал
  floorRect(24, TZ0, TX1, CZ0, y, texMat('arcadeF', TX.carpetPlain('#1a1030', 12), 0xffffff), 'carpet'); // игровая
  for (const r of rectMinus([TX0, TZ0, TX1, TZ1], holeBelow)) ceilRect(r[0], r[1], r[2], r[3], y + 3.7, M.ceil);
  towerOuterWalls(L, y, { inMat: M.corrWall, westOpenZ: [-1.3, 3.5], westInMat: M.lobbyWall });
  const rooms = roomsSpec();
  const spec = {
    1: { name: 'подсобка', mat: M.concWall }, 3: { name: 'кухня', mat: M.tileW },
    5: { name: 'бар «Полдень»', mat: M.rooms[1] }, 7: { name: 'бар «Полдень»', mat: M.rooms[1], noDoor: true },
    2: { name: 'мужская уборная', mat: M.tileW }, 4: { name: 'женская уборная', mat: M.tileW },
    6: { name: 'комната персонала', mat: M.concWall }, 8: { name: 'игровой зал', mat: M.rooms[3] },
  };
  rooms.forEach(r => { Object.assign(r, spec[r.idx]); });
  rooms.find(r => r.idx === 2).coreSideMat = M.pinkTile;
  corridorWalls(L, y, rooms, {
    corrMat: M.corrWall,
    doorOpts: r => r.noDoor ? null : { name: r.name, plate: { 1: 'ПОДСОБКА', 3: 'КУХНЯ', 5: 'БАР', 2: 'М', 4: 'Ж', 6: 'ПЕРСОНАЛ', 8: 'ИГРЫ' }[r.idx] },
  });
  // бар занимает два пролёта: уберём перегородку между 18..24 и 24..30 на севере
  // (стена построена — прорежем широкий проём)
  carveOpeningZ(24, CZ1, TZ1, y);
  // ядро
  coreWalls(L, y, { coreMat: M.lobbyWall, serviceDoor: false });
  PR.exitSign(0.95, y + 3.3, SZ1 + 0.02, 0);
  hangSign('←  ВЕСТИБЮЛЬ', 5.9, y + 3.3, 0);
  PR.sign('ПОДВАЛ ↓   ЭТАЖИ ↑', 0.95, y + 2.95, SZ1 + 0.02, 0, { w: 1.0, h: 0.2 });
  for (let x = 8; x < 30; x += 4) PR.ceilingLamp(x, 0, { y: y + 3.7, intensity: 2.6, distance: 7, flicker: x === 20 ? 0.7 : 0 });
  PR.ceilingLamp(3, 1, { y: y + 3.7, intensity: 3, distance: 7 });
  zone(6, CZ0, TX1, CZ1, 'СЛУЖЕБНЫЙ КОРИДОР', { reverb: 0.22 });
  zone(0, -1.5, 6, TZ1, 'ЛИФТОВОЙ ХОЛЛ', { reverb: 0.3 });
  for (const r of rooms) { if (r.side > 0) PR.sconce(r.x0 + 3.6, y + 2.0, CZ1 - 0.12, P); }
  picture(['02_weirdcore_liminal', 'art'], 13.5, y + 1.8, CZ0 + T / 2 + 0.03, 0, 0.8, { frame: 'gold' });
  picture(['02_weirdcore_liminal', 'art'], 21.5, y + 1.8, CZ0 + T / 2 + 0.03, 0, 0.8, { frame: 'gold' });

  // --- Подсобка (секрет №1): ключ от архива
  {
    const x0 = 6, x1 = 12, z0 = CZ1, z1 = TZ1;
    PR.shelf(11.6, 3.9, -P / 2, { fill: 'boxes', w: 3 }); PR.shelf(7.8, 6.0, P, { fill: 'boxes', w: 2.6 });
    PR.ceilingLamp(9, 3.8, { y: y + 3.7, kind: 'pendant', intensity: 2.2, distance: 5, flicker: 0.3 });
    PR.stackedChairs(6.6, 5.6, 0.3, 6);
    PR.sheetCovered(9.4, 4.4, 0.2, 1.6, 0.9, 0.9);
    box(0.6, 0.6, 0.6, col(0x5a4428), 8.0, y, 2.6); addCollider(7.7, y, 2.3, 8.3, y + 0.6, 2.9);
    PR.pickup(8.0, y + 0.61, 2.6, 'archiveKey', 'ключ от архива', 'Латунный ключ с биркой «АРХИВ · подвал».\nНа обороте бирки карандашом: «полка 1999 не полка».', g => PR.keyMesh(g));
    picture(['portrait', 'art'], 6.13, y + 1.8, 4.6, P / 2, 0.7, { frame: 'dark' });
    PR.note(9.6, y + 0.91, 4.4, 0.4, 'Накладная', 'Списано: 300 стульев, 300 ламп, 1 солнце (запасное).\nМесто хранения: подвал.');
    trigger(x0, z0, x1, z1, () => G.secret('storage', 'Подсобка'));
    zone(x0, z0, x1, z1, 'ПОДСОБКА', { reverb: 0.05 });
  }
  // --- Кухня
  {
    PR.fridge(17.5, 5.9, P); PR.fridge(16.7, 5.9, P);
    PR.counter(12.2, 4.4, 15.5, 5.1, 0.95, { top: 0x6a6a6a, front: 0x4a4a4a });
    for (let i = 0; i < 4; i++) PR.glass(12.6 + i * 0.25, y + 0.95, 4.75, { wine: i % 2 === 1 });
    PR.bottle(14.6, y + 0.95, 4.7, 0x5a3a0a);
    PR.ceilingLamp(15, 3.8, { y: y + 3.7, kind: 'tube', color: 0xe0f0ff, intensity: 2.5, distance: 6 });
    picture(['06_vintage_photos'], 17.87, y + 1.7, 3.0, -P / 2, 0.6, { frame: 'white' });
    zone(12, CZ1, 18, TZ1, 'КУХНЯ', { reverb: 0.15, buzz: 0.02 });
  }
  // --- Бар «Полдень»
  {
    PR.counter(19, 4.8, 25, 5.4, 1.1, { top: 0x0a0806, front: 0x3a1018 });
    for (let i = 0; i < 6; i++) PR.stool(19.5 + i * 1.0, 4.2);
    for (let i = 0; i < 8; i++) PR.bottle(19.3 + i * 0.7, y + 1.1, 5.9 + (i % 2) * 0.1, [0x1a4a2a, 0x5a1a1a, 0x4a3a0a, 0x1a2a5a][i % 4]);
    box(6, 0.04, 0.3, col(0x2a1a10), 22, y + 1.1, 6.0);
    for (let i = 0; i < 5; i++) PR.glass(19.6 + i * 1.1, y + 1.1, 5.0, { wine: i % 2 === 0 });
    PR.table(27.5, 2.6, { w: 0.8, round: true }); PR.chair(27.5, 3.4, P); PR.chair(27.5, 1.9, 0);
    PR.glass(27.4, y + 0.75, 2.6, { wine: true });
    PR.table(28.4, 5.0, { w: 0.8, round: true }); PR.chair(28.4, 4.3, 0); PR.armchair(29.2, 5.6, -P * 0.75, 0x3a1a1a);
    PR.radio(24.6, y + 1.1, 5.0, P);
    PR.sofa(20.5, 2.0, 0, 0x3a1030, 2.0);
    PR.ceilingLamp(21, 3, { y: y + 3.7, kind: 'pendant', intensity: 2.5, distance: 6, color: 0xff7080 });
    PR.ceilingLamp(27, 3.5, { y: y + 3.7, kind: 'pendant', intensity: 2.5, distance: 6, color: 0xff9060 });
    PR.sign('П О Л Д Е Н Ь', 22, y + 2.7, 6.28, P, { w: 2.2, h: 0.45, bg: '#1a0610', fg: '#ff6a9a', glowing: true, font: 'bold 52px Georgia, serif' });
    glow(22, y + 2.7, 6.2, 3.5, 0xff4080, 0.25, { rx: 0, ry: P });
    picture(['portrait', 'art'], 29.87, y + 2.0, 3.0, -P / 2, 0.9, { frame: 'gold' });
    picture(['portrait', 'art'], 18.13, y + 2.0, 3.5, P / 2, 0.7, { frame: 'gold' });
    zone(18, CZ1, TX1, TZ1, 'БАР «ПОЛДЕНЬ»', { reverb: 0.2 });
  }
  // --- Мужская уборная (кабинки, секрет: розовая комната за плиткой)
  {
    const z0 = TZ0, z1 = CZ0;
    // кабинки вдоль западной стены (x=6), открытые к востоку
    for (let i = 0; i < 3; i++) {
      const zz = -5.9 + i * 1.3;
      if (i > 0) block(6.1, y, zz - 0.68, 7.5, y + 2.1, zz - 0.64, col(0x5a1a2a));
      PR.toilet(6.45, zz, P / 2);
    }
    block(6.1, y, -2.33, 7.5, y + 2.1, -2.29, col(0x5a1a2a));
    for (let i = 0; i < 3; i++) PR.sink(11.6, -5.5 + i * 1.1, -P / 2);
    PR.ceilingLamp(9, -4, { y: y + 3.7, kind: 'tube', color: 0xe0fff0, intensity: 2.6, distance: 6, flicker: 0.4 });
    // расшатанная плитка в первой кабинке (x=6, z≈-5.9)
    const tz = -5.6;
    const tile = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.0, 0.7), M.pinkTile);
    tile.position.set(6.13, y + 0.75, tz); W.group.add(tile);
    carveOpeningZWall(6, tz, 0.7, y + 0.25, 1.0);
    const tc = addCollider(6.0, y, tz - 0.4, 6.2, y + 2.4, tz + 0.4);
    let moved = false;
    interact(tile, () => moved ? 'Пролезть в дыру' : 'Плитка шатается…', () => {
      if (!moved) { moved = true; S.sfxSlide(); tile.position.x += 0.3; tile.rotation.z = 0.3; G.toast('Плитка отвалилась. За ней — розовый свет.'); return; }
      G.teleport(4.8, y, -5.0, P / 2, 'Ты пролезаешь в узкий лаз…');
    });
    zone(6, z0, 12, z1, 'УБОРНАЯ', { reverb: 0.45 });
  }
  // --- Розовая комната (секрет №2) в ядре x 3.6..6
  {
    const x0 = LB[1] + 0.2, x1 = 6 - T / 2;
    floorRect(x0, TZ0 + T / 2, x1, SZ1 - T / 2, y + 0.005, M.pinkTile, 'tile', { s: 1, walk: false });
    for (const [a, b, c, d] of [[x0, TZ0 + 0.11, x1, TZ0 + 0.12], [x0, SZ1 - 0.12, x1, SZ1 - 0.11]]) block(a, y, b, c, y + 3.7, d, M.pinkTile, { collide: false });
    block(x0 - 0.01, y, TZ0, x0, y + 3.7, SZ1, M.pinkTile, { collide: false });
    block(x1 - 0.01, y, TZ0, x1, y + 3.7, -5.95, M.pinkTile, { collide: false });
    block(x1 - 0.01, y, -5.25, x1, y + 3.7, SZ1, M.pinkTile, { collide: false });
    block(x1 - 0.01, y + 1.25, -5.95, x1, y + 3.7, -5.25, M.pinkTile, { collide: false });
    anchor((x0 + x1) / 2, y + 2.8, -4, { color: 0xff70b0, intensity: 5, distance: 6 });
    plane(0.3, 0.3, emis(0xff80c0, 1.2), (x0 + x1) / 2, y + 3.68, -4, P / 2, 0);
    picture(['02_weirdcore_liminal'], x0 + 0.03, y + 1.7, -3.6, P / 2, 0.8, { frame: 'pink' });
    picture(['02_weirdcore_liminal'], (x0 + x1) / 2, y + 1.7, SZ1 - 0.15, P, 0.6, { frame: 'pink' });
    PR.chair((x0 + x1) / 2, -5.6, 0.2, { color: 0xd8b0c0, seatColor: 0xff80b0 });
    PR.note((x0 + x1) / 2 + 0.3, y + 0.01, -4.2, 0.5, 'Надпись маркером на плитке', 'ТЫ ЗДЕСЬ УЖЕ БЫЛ(А).\n\nтыздесьужебыл(а)\nтыздесьужебыл(а)\n\nвыход — там же, где вход');
    const back = PR.grp(x1 - 0.1, -5.6, -P / 2);
    box(0.1, 1.0, 0.7, M.pinkTile, 0, 0.25, 0, { parent: back });
    interact(back, 'Вылезти обратно', () => G.teleport(6.9, y, -5.6, -P / 2, ''));
    trigger(x0, TZ0, x1, SZ1, () => G.secret('pink', 'Розовая комната'));
    zone(x0, TZ0, x1, SZ1, 'КОМНАТА 0', { reverb: 0.5, muffle: 1600 });
    W.surfaces.push({ minX: x0, maxX: x1, minZ: TZ0 + 0.1, maxZ: SZ1 - 0.1, y: () => y, sound: 'tile' });
  }
  // --- Женская уборная
  {
    for (let i = 0; i < 3; i++) PR.sink(12.4, -5.5 + i * 1.1, P / 2);
    for (let i = 0; i < 2; i++) { PR.toilet(17.5, -5.6 + i * 1.5, -P / 2); block(16.2, y, -4.85 + i * 1.5, 17.9, y + 2.1, -4.81 + i * 1.5, col(0x2a4a5a)); }
    PR.ceilingLamp(15, -4, { y: y + 3.7, kind: 'tube', color: 0xe0fff0, intensity: 2.6, distance: 6 });
    PR.note(12.6, y + 0.9, -3.3, P / 2, 'Помадой на зеркале', 'не смотри в окно слишком долго\nсолнце смотрит в ответ');
    zone(12, TZ0, 18, CZ0, 'УБОРНАЯ', { reverb: 0.45 });
  }
  // --- Комната персонала
  {
    PR.locker(23.5, -4.3, -P / 2, 4);
    PR.table(20.6, -4.2, { w: 1.4, d: 0.8 }); PR.chair(20.0, -4.2, P / 2); PR.chair(21.2, -4.2, -P / 2);
    PR.tv(18.4, y + 0.0, -5.9, 0.4, { on: true });
    PR.glass(20.4, y + 0.75, -4.1); PR.glass(20.9, y + 0.75, -4.3);
    PR.note(20.6, y + 0.751, -4.4, 0.2, 'График смен', 'Ночная смена: —\nДневная смена: —\nУправляющий: всегда на месте.\n\nP.S. Кнопка под стойкой регистрации больше не работает. Не нажимайте её.');
    PR.ceilingLamp(21, -4, { y: y + 3.7, kind: 'tube', color: 0xe0f0ff, intensity: 2.3, distance: 6, flicker: 0.5 });
    picture(['06_vintage_photos', 'portrait'], 18.13, y + 1.8, -3.2, P / 2, 0.6, { frame: 'white' });
    zone(18, TZ0, 24, CZ0, 'КОМНАТА ПЕРСОНАЛА', { reverb: 0.1 });
  }
  // --- Игровой зал
  {
    for (let i = 0; i < 4; i++) PR.arcade(25 + i * 1.2, -5.85, 0);
    PR.arcade(29.5, -3.4, -P / 2);
    PR.ceilingLamp(27, -3.8, { y: y + 3.7, kind: 'tube', color: 0xb070ff, intensity: 2.5, distance: 6 });
    picture(['05_retro_games_arcade', '04_retro_consoles'], 29.87, y + 1.9, -2.2, -P / 2, 0.6);
    picture(['04_retro_consoles', '05_retro_games_arcade'], 24.13, y + 1.9, -4.0, P / 2, 0.8);
    picture(['04_retro_consoles', '05_retro_games_arcade'], 24.13, y + 1.9, -2.4, P / 2, 0.5);
    PR.sofa(26.5, -2.3, P, 0x2a1a4a, 1.8);
    zone(24, TZ0, TX1, CZ0, 'ИГРОВОЙ ЗАЛ', { reverb: 0.15 });
  }
}
function removeWallZ(x, z0, z1, y) {
  const victims = W.group.children.filter(m => m.isMesh && m.userData.collider && (() => {
    const c = m.userData.collider; return c.enabled && Math.abs((c.minX + c.maxX) / 2 - x) < 0.05 && c.minZ >= z0 - 0.2 && c.maxZ <= z1 + 0.2 && c.minY >= y - 0.01 && c.maxY <= y + FH + 0.01;
  })());
  for (const m of victims) { m.userData.collider.enabled = false; W.group.remove(m); }
}
function hangSign(text, x, yy, z) {
  for (const ry of [P / 2, -P / 2]) PR.sign(text, x + (ry > 0 ? 0.012 : -0.012), yy, z, ry, { w: 1.0, h: 0.22 });
  box(0.02, 0.22, 1.0, col(0x140c08), x, yy - 0.11, z);
  box(0.02, 0.4, 0.02, col(0x111111), x, yy + 0.1, z - 0.4); box(0.02, 0.4, 0.02, col(0x111111), x, yy + 0.1, z + 0.4);
}
// широкий проём в перегородке (стена вдоль Z на x)
function carveOpeningZ(x, z0, z1, y) {
  const victims = W.group.children.filter(m => m.isMesh && m.userData.collider && (() => {
    const c = m.userData.collider; return c.enabled && Math.abs((c.minX + c.maxX) / 2 - x) < 0.05 && c.minZ >= z0 - 0.2 && c.maxZ <= z1 + 0.2 && c.minY >= y - 0.01 && c.maxY <= y + FH + 0.01;
  })());
  for (const m of victims) { m.userData.collider.enabled = false; W.group.remove(m); }
  block(x - 0.25, y, z1 - 0.5, x + 0.25, y + FH, z1 - 0.1, M.rooms[1]);
  block(x - 0.25, y + 3.2, z0, x + 0.25, y + FH, z1, M.rooms[1], { collide: false });
}
function carveOpeningZWall(x, at, w, y0, h) {
  const s0 = at - w / 2, s1 = at + w / 2;
  const victims = W.group.children.filter(m => m.isMesh && m.userData.collider && (() => {
    const c = m.userData.collider; return c.enabled && Math.abs((c.minX + c.maxX) / 2 - x) < 0.05 && c.minZ < s1 && c.maxZ > s0 && c.minY < y0 + h && c.maxY > y0 && c.maxX - c.minX < 0.25;
  })());
  for (const m of victims) {
    const cl = m.userData.collider; cl.enabled = false; W.group.remove(m); const mats = m.material;
    if (cl.minZ < s0) block(cl.minX, cl.minY, cl.minZ, cl.maxX, cl.maxY, s0, mats);
    if (cl.maxZ > s1) block(cl.minX, cl.minY, s1, cl.maxX, cl.maxY, cl.maxZ, mats);
    if (cl.maxY > y0 + h) block(cl.minX, Math.max(cl.minY, y0 + h), Math.max(s0, cl.minZ), cl.maxX, cl.maxY, Math.min(s1, cl.maxZ), mats);
    if (cl.minY < y0) block(cl.minX, cl.minY, Math.max(s0, cl.minZ), cl.maxX, y0, Math.min(s1, cl.maxZ), mats);
  }
}

// ======================================================================
// ВЕСТИБЮЛЬ — тёмный, высокий, с множеством окон
function buildLobby() {
  setLevel(0); const y = 0;
  floorRect(LX0, LZ0, TX0, LZ1, y, M.marble, 'marble', { s: 2 });
  ceilRect(LX0, LZ0, TX0, LZ1, y + LH, texMat('lobbyCeil', TX.wallpaper('#1a1210', '#241a14', 'diamonds', 9), 0xffffff), { s: 2 });
  // крыша вестибюля (видна из окон башни)
  const roofTop = new THREE.Mesh(new THREE.PlaneGeometry(TX0 - LX0 + 0.4, LZ1 - LZ0 + 0.4), M.roof);
  roofTop.rotation.x = -P / 2; roofTop.position.set((LX0 + TX0) / 2, y + LH + 0.31, 0); W.levels[1] ? W.levels[1].add(roofTop) : W.group.add(roofTop);
  block(LX0 - 0.1, y + LH, LZ0 - 0.1, TX0, y + LH + 0.3, LZ0 + 0.1, M.ext, { collide: false });
  block(LX0 - 0.1, y + LH, LZ1 - 0.1, TX0, y + LH + 0.3, LZ1 + 0.1, M.ext, { collide: false });
  block(LX0 - 0.1, y + LH, LZ0, LX0 + 0.1, y + LH + 0.3, LZ1, M.ext, { collide: false });
  // западная стена: высокие окна + вход
  const tall = (at, w = 1.8) => ({ at, w, type: 'window', sill: 0.5, h: 6.4, light: 0.3, mull: 2 });
  const wOps = [];
  for (const z of [-11.5, -8, -4.5, 4.5, 8, 11.5]) wOps.push(tall(z));
  wOps.push({ at: 0, w: 3.2, type: 'window', sill: 0.02, h: 3.1, light: 0.3, mull: 4 });
  wall('z', LX0, LZ0, LZ1, y, LH, { neg: M.ext, pos: M.lobbyWall }, wOps, { inside: 1 });
  // фрамуга над входом
  // север и юг
  const nsOps = []; for (let x = -23; x <= -3; x += 3.5) nsOps.push(tall(x, 2.0));
  wall('x', LZ1, LX0, TX0, y, LH, { neg: M.lobbyWall, pos: M.ext }, nsOps, { inside: -1 });
  wall('x', LZ0, LX0, TX0, y, LH, { neg: M.ext, pos: M.lobbyWall }, nsOps.filter(o => o.at < -7), { inside: 1 });
  // восточная стена вестибюля вне башни
  wall('z', TX0, TZ1, LZ1, y, LH, { neg: M.lobbyWall, pos: M.ext }, [{ at: 10.2, w: 3, type: 'window', sill: 0.5, h: 6, light: 0.2, mull: 3 }], { inside: -1 });
  wall('z', TX0, LZ0, TZ0, y, LH, { neg: M.lobbyWall, pos: M.ext }, [{ at: -10.2, w: 2.0, type: 'window', sill: 0.5, h: 6, light: 0.2 }], { inside: -1 });
  // верхняя часть стены башни над вестибюлем (4..8) — окна холла 2 этажа смотрят внутрь
  // (строится в buildGuestFloor L=1 как западная стена с окнами)

  // колонны
  const colMat = texMat('colm', TX.marble('#14201a', '#1c2a22'), 0xffffff);
  for (const x of [-20, -14, -8]) for (const z of [-6, 6]) PR.column(x, z, LH, { r: 0.45, mat: colMat });
  // вход — вращающаяся дверь (не открывается)
  const rd = PR.grp(LX0 + 1.4, 0, 0);
  PR.grp; box(0.05, 3, 2.6, basic('rdglass', { color: 0xffd9a0, transparent: true, opacity: 0.12, depthWrite: false }), 0, 0, 0, { parent: rd });
  for (let i = 0; i < 4; i++) { const pnl = box(1.3, 2.9, 0.05, basic('rdg2', { color: 0xffd9a0, transparent: true, opacity: 0.18, depthWrite: false }), 0, 0, 0, { parent: rd }); pnl.rotation.y = i * P / 2; pnl.position.set(Math.sin(i * P / 2) * 0.65, 1.45, Math.cos(i * P / 2) * 0.65); }
  box(0.08, 3, 0.08, col(0x6a5020), 0, 0, 0, { parent: rd });
  const ring = box(2.9, 0.15, 2.9, col(0x2a1a10), 0, 3.0, 0, { parent: rd });
  addCollider(LX0, y, -1.6, LX0 + 2.9, y + 3, 1.6);
  let spin = 0;
  interact(rd, 'Выйти наружу', () => {
    spin = 1.2; S.sfxSlide();
    G.toast(['Дверь проворачивается и возвращает тебя обратно в вестибюль.', 'Снаружи только пустыня. Дверь не выпускает.', 'Ты делаешь полный круг. Ты всё ещё внутри.'][Math.floor(Math.random() * 3)]);
  });
  W.animated.push(dt => { if (spin > 0) { rd.rotation.y += dt * 3; spin -= dt; } });
  PR.sign('ВХОД · ENTRANCE', LX0 + 0.12, y + 3.6, 0, P / 2, { w: 1.6, h: 0.3 });
  // коврик у входа
  PR.rug(LX0 + 4, 0, 3, 4, TX.carpetRed());

  // стойка регистрации
  PR.counter(-6.5, -9, -5.5, -2.5, 1.15, { top: 0x120a08, front: 0x2a120e });
  PR.counter(-6.5, -9.2, -3, -8.6, 1.15, { top: 0x120a08, front: 0x2a120e });
  PR.bell(-6.0, y + 1.15, -5.2);
  PR.tableLamp(-6.0, y + 1.15, -7.4, { shade: 0x1a4a2a });
  PR.tableLamp(-6.0, y + 1.15, -3.4, { shade: 0x1a4a2a });
  PR.note(-6.0, y + 1.151, -6.3, 0.4, 'Книга регистрации', 'Гость: —     Номер: 101 … выезд: —\nГость: —     Номер: 204 … выезд: —\nГость: ты     Номер: ∞ … заезд: сейчас\n\nНа полях: «лифт знает больше этажей, чем кнопок».');
  PR.chair(-4.4, -5.8, -P / 2);
  PR.phoneProp(-6.0, y + 1.15, -8.2, P / 2, () => G.flags.phoneRinging ? G.answerPhone() : 'Гудок. Потом — далёкий шум прибоя, хотя до моря тысячи километров.');
  // ячейки для ключей на стене за стойкой (x≈-0.1)
  const kb = PR.grp(-0.2, -4.3, -P / 2);
  box(2.4, 1.4, 0.2, texMat('kbox', TX.wood('#2a1810'), 0xffffff), 0, 1.4, 0, { parent: kb });
  for (let r = 0; r < 4; r++) for (let c = 0; c < 8; c++) {
    box(0.26, 0.28, 0.02, col(0x140c08), -1.05 + c * 0.3, 1.47 + r * 0.33, 0.1, { parent: kb });
    if ((r * 8 + c) % 3 === 0) box(0.03, 0.12, 0.01, col(0xb08a3a, { emissive: 0x201000 }), -1.05 + c * 0.3, 1.55 + r * 0.33, 0.115, { parent: kb });
  }
  interact(kb, 'Взять ключ от номера', () => { S.sfxClick(); G.toast('Все ключи — от номера 000. Таких номеров нет.'); });
  PR.clock(-0.15, y + 4.2, -5.6, -P / 2, { r: 0.45 });
  PR.sign('Отель «ПОЛДЕНЬ»', -0.13, y + 5.3, -5.6, -P / 2, { w: 3.4, h: 0.6, bg: '#120a08', fg: '#c8a050', font: 'bold 64px Georgia, serif' });
  glow(-0.2, y + 5.3, -5.6, 4, 0xffb060, 0.12, { rx: 0, ry: -P / 2 });
  // скрытая кнопка под стойкой -> кабинет управляющего
  buildManagerOffice();

  // зона отдыха: диваны вокруг сухого фонтана
  const fx = -14, fz = 0;
  const fm = texMat('fount', TX.marble('#2a2224', '#1e1a1c'), 0xffffff);
  PR.grp; const f = PR.grp(fx, fz, 0);
  const basin = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.3, 0.5, 12, 1, true), fm); basin.position.y = 0.25; f.add(basin);
  const inner = new THREE.Mesh(new THREE.CircleGeometry(2.15, 12), col(0x0e0a0a)); inner.rotation.x = -P / 2; inner.position.y = 0.08; f.add(inner);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(2.25, 0.1, 4, 12), fm); rim.rotation.x = P / 2; rim.position.y = 0.5; f.add(rim);
  const st = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.35, 1.6, 8), fm); st.position.y = 0.8; f.add(st);
  const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.3, 0.3, 10), fm); bowl.position.y = 1.7; f.add(bowl);
  addCollider(fx - 2.2, y, fz - 2.2, fx + 2.2, y + 0.6, fz + 2.2);
  interact(f, 'Бросить монетку', () => { S.sfxClink(1.4); setTimeout(() => S.sfxClink(1.2), 260); G.toast('Монетка звякнула о сухое дно. Желание принято к рассмотрению.'); });
  PR.sofa(fx, fz + 4.2, P, 0x1e2c34, 2.4); PR.sofa(fx, fz - 4.2, 0, 0x1e2c34, 2.4);
  PR.armchair(fx - 3.6, fz + 3.0, P * 0.75, 0x3a1a1a); PR.armchair(fx + 3.6, fz - 3.0, -P * 0.25, 0x3a1a1a);
  PR.table(fx - 3.4, fz - 3.4, { w: 0.7, round: true, h: 0.5 }); PR.glass(fx - 3.4, y + 0.5, fz - 3.4, { wine: true });
  PR.table(fx + 3.4, fz + 3.4, { w: 0.7, round: true, h: 0.5 }); PR.glass(fx + 3.3, y + 0.5, fz + 3.4); PR.glass(fx + 3.5, y + 0.5, fz + 3.3);
  PR.floorLamp(fx - 1.8, fz + 5.2); PR.floorLamp(fx + 1.8, fz - 5.2);
  PR.rug(fx, fz, 10, 12, TX.carpetGreen());
  // зал ожидания: ряды стульев у южных окон
  for (let r = 0; r < 3; r++) for (let c = 0; c < 6; c++) PR.chair(-24.5 + c * 1.0, -12.6 + r * 1.4, 0, { color: 0x2a2a2a, seatColor: 0x1a3a4a });
  // рояль
  PR.piano(-22.3, 9.0, P * 0.8);
  // пальмы и растения
  for (const [x, z] of [[-24.6, 12.8], [-1.4, 12.6], [-9.5, -12.6], [-24.6, -2.2], [-24.6, 2.2], [-6.6, 0.0]]) PR.palm(x, z, { s: 1.3 });
  // телефон-автомат, автомат с газировкой, тележка
  PR.payphone(-3.0, 13.75, P, () => G.flags.phoneRinging ? 'Занято.' : ['«Вы позвонили в отель „Полдень“. Вы уже в отеле „Полдень“».', 'Гудки. Потом твой собственный голос: «алло?»', '«Номер не существует. Номер не существует. Номер…»'][Math.floor(Math.random() * 3)]);
  PR.vending(-7.25, 13.45, P);
  PR.luggageCart(-18, -3.6, 0.4);
  // журнальный столик с радио
  PR.table(-9.5, 10.5, { w: 1.2, d: 0.6, h: 0.5 }); PR.radio(-9.5, y + 0.5, 10.5, P);
  PR.sofa(-9.5, 12.3, P, 0x3a1a2a, 2.2); PR.armchair(-11.6, 10.4, P / 2, 0x1e2c34);
  // освещение: тусклые люстры
  for (const x of [-20, -14, -8]) PR.chandelier(x, 0, y + LH);
  PR.ceilingLamp(-4, -6, { y: y + LH, intensity: 6, distance: 10, kind: 'pendant' });
  // выставка портретов на отдельных панелях — посреди зала
  const panels = [[-17.5, 9.8], [-17.5, -9.8], [-10.5, -10.5], [-10.5, 6.5]];
  for (const [px, pz] of panels) {
    const g = PR.grp(px, pz, 0);
    box(2.6, 2.6, 0.12, texMat('panelw', TX.wallpaper('#1e1416', '#2a1c1e', 'stripes', 10), 0xffffff), 0, 0, 0, { parent: g });
    box(2.8, 0.1, 0.4, col(0x140c08), 0, 0, 0, { parent: g });
    addCollider(px - 1.3, y, pz - 0.15, px + 1.3, y + 2.6, pz + 0.15);
    picture(['portrait', 'art'], px, y + 1.55, pz + 0.07, 0, 1.0, { frame: 'gold' });
    picture(['portrait', 'art'], px, y + 1.55, pz - 0.07, P, 1.0, { frame: 'gold' });
    PR.sconce(px, y + 2.75, pz + 0.12, 0);
  }
  // портреты на восточной стене (у лифтового холла)
  picture(['portrait', 'art'], -0.13, y + 2.2, 7.5, -P / 2, 1.0, { frame: 'gold' });
  picture(['portrait', 'art'], -0.13, y + 2.2, 12.9, -P / 2, 0.9, { frame: 'gold' });
  picture(['art', 'portrait'], LX0 + 0.13, y + 7.2, 6.2, P / 2, 0.7, { frame: 'gold' });
  picture(['art', 'portrait'], LX0 + 0.13, y + 7.2, -6.2, P / 2, 0.7, { frame: 'gold' });
  zone(LX0, LZ0, TX0, LZ1, 'ВЕСТИБЮЛЬ', { reverb: 0.9, wind: 0.035, amb: 1.7 });
}

function buildManagerOffice() {
  // кабинет x -6..0, z -14..-9.4; секрет №3
  const y = 0, x0 = -6, x1 = 0, z0 = LZ0, z1 = -9.4;
  const om = texMat('office', TX.wallpaper('#1a2a22', '#22382c', 'stripes', 14), 0xffffff);
  wall('z', x0, z0, z1, y, LH, { neg: M.lobbyWall, pos: om });
  wall('x', z1, x0 - T / 2, x1, y, LH, { neg: om, pos: M.lobbyWall }, [{ at: -2.0, w: 1.0, type: 'door' }]);
  floorRect(x0 + 0.1, z0 + 0.1, x1 - 0.1, z1 - 0.1, y + 0.004, M.parquet, 'wood', { s: 2 });
  ceilRect(x0, z0, x1, z1, y + 3.4, M.ceil);
  block(x0, y + 3.4, z0, x1, y + 3.42, z1, M.lobbyWall, { collide: false });
  const d = new Door('x', z1, -2.0, { name: 'кабинет управляющего', swing: -1, locked: true, lockedMsg: 'Заперто. На табличке: «Управляющий. Без стука не входить». Стук ничего не даёт.', mat: texMat('doorDark', TX.wood('#1e120a'), 0xffffff) });
  PR.sign('УПРАВЛЯЮЩИЙ', -1.5, y + 2.45, z1 + 0.12, 0, { w: 0.8, h: 0.16 });
  // кнопка под стойкой
  const btn = PR.grp(-5.42, -6.0, 0, y + 0.85);
  box(0.06, 0.06, 0.06, col(0x8a1010, { emissive: 0x300000 }), 0, 0, 0, { parent: btn });
  interact(btn, 'Нажать кнопку под стойкой', () => { S.sfxClick(); setTimeout(() => { S.sfxSwitch(); d.locked = false; d.toggle(true); G.toast('Где-то щёлкнул замок. Дверь кабинета приоткрылась.'); }, 300); });
  // интерьер
  PR.desk(-3, -12.2, 0, { color: 0x1a0e08 }); PR.armchair(-3, -13.1, 0, 0x1a1a1a);
  PR.tableLamp(-3.5, y + 0.77, -12.1, { shade: 0x1a4a2a });
  PR.tv(-2.4, y + 0.77, -12.25, 0, { on: true, screen: TX.screenTex(['ДОБРО ПОЖАЛОВАТЬ', 'ОБРАТНО.', '', 'гостей: 1', 'номеров: ∞', 'выезд: —']) });
  PR.shelf(-5.65, -11.7, P / 2, { fill: 'files', w: 2.6, color: 0x1a120a });
  PR.note(-3.3, y + 0.775, -11.95, 0.2, 'Дневник управляющего', 'День 1. Гости перестали приезжать.\nДень 40. Солнце не сдвинулось ни на градус.\nДень 300. Я перевесил все картины. Они вернулись на места.\nДень ?. Я спрятал карту-ключ «∞» в подвале, за архивом.\nНа крыше хорошо. Там можно наконец сесть.');
  picture(['portrait', '06_vintage_photos'], -0.13, y + 2.0, -11.7, -P / 2, 1.0, { frame: 'gold' });
  picture(['06_vintage_photos', 'portrait'], -3.0, y + 2.1, z0 + T / 2 + 0.03, 0, 0.8, { frame: 'gold' });
  picture(['06_vintage_photos', 'portrait'], -1.0, y + 2.1, z0 + T / 2 + 0.03, 0, 0.5, { frame: 'gold' });
  trigger(x0, z0, x1, z1, () => G.secret('office', 'Кабинет управляющего'));
  zone(x0, z0, x1, z1, 'КАБИНЕТ УПРАВЛЯЮЩЕГО', { reverb: 0.08, muffle: 2000 });
}

// ======================================================================
// ПОДВАЛ
function buildBasement() {
  const L = -1; const y = towerShell(L, { floorMat: M.concrete, floorSound: 'concrete', basement: true });
  towerOuterWalls(L, y, { inMat: M.concWall, basement: true });
  const rooms = roomsSpec();
  const spec = { 1: 'котельная', 3: 'прачечная', 5: 'архив', 7: 'archive2', 2: 'склад мебели', 4: 'электрощитовая', 6: 'разгрузка', 8: 'разгрузка2' };
  rooms.forEach(r => { r.name = spec[r.idx]; r.mat = M.concWall; });
  corridorWalls(L, y, rooms, {
    corrMat: M.concWall,
    doorOpts: r => {
      if (r.idx === 7 || r.idx === 8) return null;
      if (r.idx === 5) return { name: 'архив', locked: true, key: 'archiveKey', lockedMsg: 'Архив заперт. Нужен ключ.', plate: 'АРХИВ', heavy: true, mat: col(0x3a4040) };
      return { name: r.name, plate: r.name.toUpperCase(), heavy: true, mat: col(0x3a4040) };
    },
  });
  coreWalls(L, y, { coreMat: M.concWall, serviceName: 'кладовка' });
  // архив (18..24) и комната наблюдения (24..30) — разделяет стеллаж
  // разгрузка (18..30 юг) — одна большая
  carveOpeningZ(24, TZ0, CZ0, y);
  // трубы под потолком
  for (const z of [-0.9, 0.9]) PR.pipe(0.5, y + 3.4, z, 30, y + 3.4, z, 0.08, z > 0 ? 0x3a4a3a : 0x5a3a2a);
  for (let x = 4; x < 30; x += 5) PR.ceilingLamp(x, 0, { y: y + 3.7, kind: 'tube', color: 0xd8f0d0, intensity: 2.4, distance: 7, flicker: x === 14 || x === 24 ? 0.85 : 0.1 });
  zone(0, CZ0, TX1, CZ1, 'ПОДВАЛ', { reverb: 0.55, buzz: 0.03, muffle: 1100, wind: 0 });
  zone(0, -1.5, 6, TZ1, 'ПОДВАЛ · ЛЕСТНИЦА', { reverb: 0.5, buzz: 0.02, muffle: 1100, wind: 0 });
  PR.exitSign(0.95, y + 3.3, SZ1 + 0.02, 0);
  PR.sign('Б', 0.12, y + 2.2, 2.0, P / 2, { w: 0.4, h: 0.4 });
  // Котельная
  PR.boiler(8.5, 4.5); PR.boiler(10.8, 4.0);
  PR.pipe(8.5, y + 3, 4.5, 8.5, y + 3.6, 4.5, 0.12); PR.pipe(10.8, y + 3, 4.0, 10.8, y + 3.6, 4.0, 0.12);
  PR.pipe(8.5, y + 3.5, 4.5, 11.9, y + 3.5, 4.5, 0.1, 0x5a3a2a);
  zone(6, CZ1, 12, TZ1, 'КОТЕЛЬНАЯ', { reverb: 0.5, buzz: 0.05, muffle: 900, wind: 0 });
  // Прачечная
  for (let i = 0; i < 5; i++) PR.washer(12.6 + i * 1.0, 5.9, P);
  PR.table(15, 3.2, { w: 2.0, d: 0.9 });
  PR.shelf(17.6, 3.8, -P / 2, { fill: 'towels', w: 1.6, color: 0x5a5a5a });
  picture(['01_japan_underground', '02_weirdcore_liminal'], 12.13, y + 1.8, 3.5, P / 2, 0.6, { frame: 'white' });
  zone(12, CZ1, 18, TZ1, 'ПРАЧЕЧНАЯ', { reverb: 0.35, muffle: 1000, wind: 0 });
  // Архив: стеллажи, один — сдвигается
  for (let i = 0; i < 3; i++) PR.shelf(19.0 + i * 1.6, 4.4, P / 2 * 0, { fill: 'files', w: 1.2, color: 0x3a3a3a, d: 0.45 });
  PR.ceilingLamp(21, 3.8, { y: y + 3.7, kind: 'pendant', intensity: 2, distance: 5, flicker: 0.2 });
  // стеллаж-дверь на x=24 (проём прорезан выше)
  const sh = PR.shelf(23.7, 3.2, -P / 2, { fill: 'files', w: 1.6, color: 0x4a3a2a });
  PR.sign('1999', 23.45, y + 2.0, 3.2, -P / 2, { w: 0.3, h: 0.12 });
  const shCol = W.colliders[W.colliders.length - 1];
  let slid = false;
  interact(sh, () => slid ? 'Стеллаж «1999»' : 'Толкнуть стеллаж «1999»', () => {
    if (slid) { G.toast('Папки пустые. На корешках — даты, которых не было.'); return; }
    slid = true; S.sfxSlide(); S.sfxSwitch(true);
    let k = 0; const iv = setInterval(() => { k++; sh.position.z += 0.025; if (k >= 60) { clearInterval(iv); } }, 16);
    shCol.minZ += 1.5; shCol.maxZ += 1.5;
    setTimeout(() => G.toast('Стеллаж отъехал. За ним — проход и мерцание экранов.'), 600);
  });
  // перегородка архив / наблюдение (с проёмом под стеллажом)
  removeWallZ(24, CZ1, TZ1, y);
  wall('z', 24, CZ1, TZ1, y, FH, M.concWall, [{ at: 3.2, w: 1.4, type: 'open', h: 2.3 }]);
  picture(['01_japan_underground'], 18.13, y + 1.8, 3.0, P / 2, 0.6, { frame: 'dark' });
  zone(18, CZ1, 24, TZ1, 'АРХИВ', { reverb: 0.1, muffle: 900, wind: 0 });
  // Комната наблюдения (секрет №7): мониторы и карта «∞»
  {
    const x0 = 24, x1 = 30;
    PR.desk(27, 5.7, P);
    PR.chair(27, 4.9, P);
    const feeds = [['CAM 01 ВЕСТИБЮЛЬ', '', '  [пусто]'], ['CAM 07 ЭТАЖ 3', '', '  [пусто]', '', ' 313 ?'], ['CAM 13 КРЫША', '', '  [стул]', '', ' [солнце]'], ['CAM 00', '', '  [ты]']];
    feeds.forEach((f, i) => PR.tv(25.2 + i * 1.2, y + 0.77 + (i % 2) * 0.0, 6.0, P, { on: true, screen: TX.screenTex(f) }));
    for (let i = 0; i < 3; i++) PR.tv(25.8 + i * 1.2, y + 1.3, 6.05, P, { on: true });
    picture(['02_weirdcore_liminal', '03_y2k'], 29.87, y + 1.9, 3.4, -P / 2, 0.8);
    picture(['02_weirdcore_liminal', '03_y2k'], 29.87, y + 1.9, 5.2, -P / 2, 0.5);
    picture(['02_weirdcore_liminal', '03_y2k'], 24.13, y + 1.9, 5.3, P / 2, 0.6);
    const card = PR.pickup(27.4, y + 0.77, 5.6, 'infCard', 'карта-ключ «∞»', 'Пластиковая карта с голограммой: ∞.\nНа обороте: «Лифт. Нажать то, чего нет».', g => {
      box(0.16, 0.005, 0.1, col(0xd0d0e0, { emissive: 0x404060 }), 0, 0, 0, { parent: g });
      glow(27.4, y + 0.78, 5.6, 0.5, 0x8080ff, 0.4);
    });
    trigger(x0, CZ1, x1, TZ1, () => G.secret('monitor', 'Комната наблюдения'));
    zone(x0, CZ1, x1, TZ1, 'КОМНАТА НАБЛЮДЕНИЯ', { reverb: 0.05, muffle: 700, buzz: 0.04, wind: 0 });
  }
  // Склад мебели
  for (let i = 0; i < 5; i++) PR.stackedChairs(6.8 + i * 0.6, -5.8, (i % 3) * 0.2, 4 + i % 3);
  PR.sheetCovered(9.5, -3.5, 0.3, 2.0, 0.9, 1.0); PR.sheetCovered(11.0, -5.2, -0.4, 1.4, 1.2, 0.8);
  PR.sheetCovered(7.5, -3.0, 1.2, 1.2, 1.6, 0.6);
  zone(6, TZ0, 12, CZ0, 'СКЛАД МЕБЕЛИ', { reverb: 0.3, muffle: 900, wind: 0 });
  // Электрощитовая: рубильник гасит/включает свет во всём отеле
  {
    const g = PR.grp(17.85, -3.8, -P / 2);
    box(1.4, 1.8, 0.3, col(0x3a4a3a), 0, 0.5, 0, { parent: g });
    const lever = box(0.08, 0.4, 0.08, col(0x8a1010, { emissive: 0x200000 }), 0.4, 1.3, 0.2, { parent: g }); lever.userData.noMerge = true;
    for (let i = 0; i < 12; i++) box(0.12, 0.2, 0.05, col(0x111111), -0.5 + (i % 6) * 0.15, 1.0 + Math.floor(i / 6) * 0.35, 0.16, { parent: g });
    interact(g, () => G.flags.blackout ? 'Включить рубильник' : 'Выключить рубильник', () => {
      S.sfxSwitch(true); G.flags.blackout = !G.flags.blackout; lever.rotation.x = G.flags.blackout ? 2.6 : 0;
      G.toast(G.flags.blackout ? 'Свет погас во всём отеле. Остались только окна и солнце.' : 'Свет вернулся. Лампы гудят чуть громче, чем раньше.');
    });
    PR.sign('ОПАСНО', 17.84, y + 2.6, -3.8, -P / 2, { w: 0.5, h: 0.18, bg: '#e0c020', fg: '#111111', font: 'bold 48px Arial' });
    zone(12, TZ0, 18, CZ0, 'ЭЛЕКТРОЩИТОВАЯ', { reverb: 0.2, buzz: 0.09, muffle: 900, wind: 0 });
    PR.ceilingLamp(15, -4, { y: y + 3.7, kind: 'tube', color: 0xd8f0d0, intensity: 1.8, distance: 6, flicker: 0.7 });
  }
  // Разгрузка: рулонные ворота, ящики
  {
    for (let i = 0; i < 6; i++) box(0.9, 0.9, 0.9, col(0x5a4428), 19 + (i % 3) * 1.0, y + Math.floor(i / 3) * 0.9, -5.6, {});
    addCollider(18.5, y, -6.1, 21.5, y + 1.8, -5.1);
    const gate = PR.grp(27, -6.2, 0);
    for (let i = 0; i < 10; i++) box(3.6, 0.27, 0.08, col(0x5a5a5a), 0, i * 0.28, 0, { parent: gate });
    interact(gate, 'Поднять ворота', () => { S.sfxLocked(); G.toast('Ворота не поддаются. Сквозь щель видна малиновая пыль и жёлтый свет.'); });
    glow(27, y + 0.01, -5.6, 3.5, 0xffc060, 0.25);
    PR.luggageCart(25, -3.5, 1.2);
    zone(18, TZ0, TX1, CZ0, 'РАЗГРУЗКА', { reverb: 0.6, muffle: 900, wind: 0.03 });
  }
  // кладовка в ядре
  PR.shelf(5.5, -4.0, -P / 2, { fill: 'boxes', w: 2.6 });
  zone(LB[1] + 0.1, TZ0, 6, SZ1, 'КЛАДОВКА', { reverb: 0.05, muffle: 900, wind: 0 });
}

// ======================================================================
// ЛЕСТНИЦА: два марша на каждый пролёт
function buildStairs() {
  const stepMat = texMat('steps', TX.wood('#2a1a12'), 0xffffff);
  const rail = col(0x1a1410);
  for (let L = -1; L <= 2; L++) {
    setLevel(L); const yb = L * FH;
    // марш A: z от SZ1 (y=yb) к SLAND (yb+2)
    const n = 12;
    for (let i = 0; i < n; i++) {
      const z1 = SZ1 - i * (SZ1 - SLAND) / n, z0 = SZ1 - (i + 1) * (SZ1 - SLAND) / n;
      const yy = yb + (i + 1) * 2 / n;
      block(LA[0], yy - 0.22, z0, LA[1], yy, z1, stepMat, { collide: false });
    }
    surface(LA[0], SLAND, LA[1], SZ1, (x, z) => yb + 2 * (SZ1 - z) / (SZ1 - SLAND), 'wood');
    // площадка
    block(LA[0], yb + 1.8, SZ0, LB[1], yb + 2, SLAND, stepMat, { collide: false });
    surface(LA[0], SZ0, LB[1], SLAND, () => yb + 2, 'wood');
    // марш B: z от SLAND (yb+2) к SZ1 (yb+4)
    for (let i = 0; i < n; i++) {
      const z0 = SLAND + i * (SZ1 - SLAND) / n, z1 = SLAND + (i + 1) * (SZ1 - SLAND) / n;
      const yy = yb + 2 + (i + 1) * 2 / n;
      block(LB[0], yy - 0.22, z0, LB[1], yy, z1, stepMat, { collide: false });
    }
    surface(LB[0], SLAND, LB[1], SZ1, (x, z) => yb + 2 + 2 * (z - SLAND) / (SZ1 - SLAND), 'wood');
    // перила между маршами
    block(LA[1], yb, SLAND, LB[0], yb + FH, SZ1, rail);
    // стенка под площадкой (подвал: лестница уходит в пол)
    picture(['02_weirdcore_liminal', '01_japan_underground'], LA[0] + 0.03 - 0.0 + 0.01, yb + 3.2, -5.4, P / 2, 0.6, { frame: 'black' });
    zone(LA[0], SZ0, LB[1], SZ1, 'ЛЕСТНИЦА', { reverb: 0.6, sound: 'wood' });
    PR.ceilingLamp(1.8, -5.5, { y: yb + 3.7, intensity: 2.2, distance: 6, flicker: L === 1 ? 0.5 : 0 });
  }
  // верхний этаж: перила вокруг проёма
  setLevel(3);
  block(LA[1], 3 * FH, SLAND, LB[0], 3 * FH + 1.0, SZ1, rail);
  block(LB[0], 3 * FH, SLAND - 0.1, LB[1], 3 * FH + 1.0, SLAND, rail);
  zone(LA[0], SZ0, LB[1], SZ1, 'ЛЕСТНИЦА', { reverb: 0.6 });
  ceilRect(LA[0], SZ0, LB[1], SLAND, 3 * FH - 0.02, M.ceil); ceilRect(LA[0], SLAND, LA[1] + 0.2, SZ1, 3 * FH - 0.02, M.ceil);
}

// ======================================================================
// ЛИФТ: кабина на каждом этаже, переход — затемнением
export const ELEV = { cx: (EX0 + EX1) / 2, cz: (EZ0 + TZ1) / 2, doors: {} };
function buildElevator() {
  const levels = [-1, 0, 1, 2, 3, 4];
  for (const L of levels) {
    setLevel(L); const y = L * FH;
    // кабина
    const cab = texMat('cab', TX.wood('#3a2010'), 0xffffff);
    if (L !== 4) {
      block(EX0 + T / 2, y, TZ1 - T / 2 - 0.02, EX1 - T / 2, y + 2.6, TZ1 - T / 2, cab, { collide: false });
      floorRect(EX0 + T / 2, EZ0, EX1 - T / 2, TZ1 - T / 2, y + 0.002, texMat('cabF', TX.carpetRed(), 0xffffff), 'carpet', { walk: false });
      ceilRect(EX0, EZ0, EX1, TZ1, y + 2.6, col(0x1a1410));
      plane(1.6, 0.5, emis(0xffd090, 0.9), ELEV.cx, y + 2.59, ELEV.cz, P / 2, 0);
      anchor(ELEV.cx, y + 2.3, ELEV.cz, { color: 0xffd090, intensity: 2, distance: 4 });
      block(EX0, y + 2.6, EZ0, EX1, y + FH, TZ1, col(0x111111), { collide: false });
    }
    // раздвижные двери
    const dm = col(0x6a5a40, { emissive: 0x100c06 });
    const dl = box(0.7, 2.3, 0.05, dm, ELEV.cx - 0.35, y, EZ0 - 0.02);
    const dr = box(0.7, 2.3, 0.05, dm, ELEV.cx + 0.35, y, EZ0 - 0.02);
    dl.userData.dynamic = dr.userData.dynamic = true;
    const dc = addCollider(ELEV.cx - 0.7, y, EZ0 - 0.1, ELEV.cx + 0.7, y + 2.3, EZ0 + 0.1);
    const st = { open: L === 0, k: L === 0 ? 1 : 0, dl, dr, dc };
    dc.enabled = !st.open;
    ELEV.doors[L] = st;
    W.animated.push(dt => {
      const t = st.open ? 1 : 0; st.k += (t - st.k) * Math.min(1, dt * 3);
      dl.position.x = ELEV.cx - 0.35 - st.k * 0.66; dr.position.x = ELEV.cx + 0.35 + st.k * 0.66;
    });
    if (L === 4) continue;
    // кнопка вызова
    const cb = PR.grp(EX1 + 0.25, EZ0 - 0.12, P, y + 1.2);
    box(0.12, 0.2, 0.03, col(0x6a5020), 0, 0, 0, { parent: cb });
    box(0.05, 0.05, 0.02, emis(0xffa040, 0.8), 0, 0.07, 0.02, { parent: cb });
    interact(cb, () => st.open ? 'Двери лифта открыты' : 'Вызвать лифт', () => { S.sfxClick(); if (!st.open) setTimeout(() => { S.sfxElevatorDing(); st.open = true; dc.enabled = false; }, 900); });
    // панель внутри
    const panel = PR.grp(EX1 - T / 2 - 0.02, EZ0 + 0.8, -P / 2, y + 1.1);
    box(0.25, 0.6, 0.03, col(0x8a7a5a, { emissive: 0x100c06 }), 0, 0, 0, { parent: panel });
    for (let i = 0; i < 6; i++) box(0.05, 0.05, 0.02, emis(0xffb060, 0.6), (i % 2 - 0.5) * 0.09, 0.1 + Math.floor(i / 2) * 0.12, 0.02, { parent: panel });
    interact(panel, 'Панель лифта', () => G.elevatorPanel(L));
    // табло над дверью
    PR.sign(L === -1 ? 'Б' : String(L + 1), ELEV.cx, y + 2.6, EZ0 - 0.12, P, { w: 0.25, h: 0.2, bg: '#1a0800', fg: '#ff9040', glowing: true, font: 'bold 70px Arial' });
    zone(EX0, EZ0, EX1, TZ1, 'ЛИФТ', { reverb: 0.03, muffle: 1800 });
  }
}
export function elevatorDoors(L, open) { const st = ELEV.doors[L]; if (!st) return; st.open = open; st.dc.enabled = !open; }

// ======================================================================
// КРЫША — секрет №8 (только через лифт с картой «∞»)
function buildRoof() {
  setLevel(4); const y = 4 * FH;
  floorRect(TX0, TZ0, TX1, TZ1, y, M.roof, 'roof', { s: 3 });
  // парапет
  const pm = M.ext;
  block(TX0 - 0.2, y, TZ0 - 0.2, TX1 + 0.2, y + 1.0, TZ0, pm); block(TX0 - 0.2, y, TZ1, TX1 + 0.2, y + 1.0, TZ1 + 0.2, pm);
  block(TX0 - 0.2, y, TZ0, TX0, y + 1.0, TZ1, pm); block(TX1, y, TZ0, TX1 + 0.2, y + 1.0, TZ1, pm);
  // будка лифта
  const hm = M.ext;
  wall('z', EX0, EZ0, TZ1, y, 3, hm); wall('z', EX1, EZ0, TZ1, y, 3, hm);
  wall('x', EZ0, EX0 - T / 2, EX1 + T / 2, y, 3, hm, [{ at: ELEV.cx, w: 1.4, type: 'open', h: 2.3 }]);
  block(EX0 - 0.2, y + 3, EZ0 - 0.2, EX1 + 0.2, y + 3.2, TZ1, hm, { collide: false });
  floorRect(EX0, EZ0, EX1, TZ1, y + 0.002, texMat('cabF', TX.carpetRed(), 0xffffff), 'carpet', { walk: false });
  ceilRect(EX0, EZ0, EX1, TZ1, y + 2.6, col(0x1a1410));
  const panel = PR.grp(EX1 - T / 2 - 0.02, EZ0 + 0.8, -P / 2, y + 1.1);
  box(0.25, 0.6, 0.03, col(0x8a7a5a), 0, 0, 0, { parent: panel });
  interact(panel, 'Панель лифта', () => G.elevatorPanel(4));
  // бак, антенна
  PR.grp; const tank = PR.grp(20, 3, 0);
  cyl(1.4, 1.4, 2.4, 10, col(0x4a3030), 0, 1.6, 0, { parent: tank });
  for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) box(0.12, 1.6, 0.12, col(0x2a2020), a * 0.9, 0, b * 0.9, { parent: tank });
  addCollider(18.6, y, 1.6, 21.4, y + 4, 4.4);
  const ant = PR.grp(27, -4, 0); box(0.1, 6, 0.1, col(0x2a2020), 0, 0, 0, { parent: ant }); box(1.5, 0.05, 0.05, col(0x2a2020), 0, 5, 0, { parent: ant });
  const blink = box(0.12, 0.12, 0.12, emis(0xff2020, 1), 0, 6, 0, { parent: ant }); blink.userData.noMerge = true;
  W.animated.push((dt, t) => { blink.visible = (t % 2) < 0.4; });
  // одинокий стул лицом к солнцу (на запад)
  const ch = PR.chair(8, -2, -P / 2 - 0.25, { sit: false, color: 0x6a5a4a, seatColor: 0x8a2a3a });
  interact(ch, 'Сесть и смотреть на солнце', () => {
    G.sit({ x: 8, y: y + 1.15, z: -2, yaw: P / 2 - 0.25, lie: false });
    setTimeout(() => G.ending(), 2500);
  });
  PR.note(8.6, y + 0.003, -2.6, 0.2, 'Последняя страница дневника', 'Отсюда видно всё: пустыню, столбы, солнце.\nОно не садится — и это хорошо.\nСадись. Смотри. Никуда не нужно идти.');
  trigger(TX0, TZ0, TX1, TZ1, () => G.secret('roof', 'Крыша'));
  zone(TX0, TZ0, TX1, TZ1, 'КРЫША', { reverb: 0.02, wind: 0.12, muffle: 2400 });
}

// ======================================================================
// Оставшиеся картины — «склад картин» в подвале: рамы стоят у стен
function fillLeftoverImages() {
  setLevel(-1); const y = -FH;
  let i = 0;
  // в коридоре подвала
  while (true) {
    const im = W.images.find(im => !W.usedImages.has(im.id)); if (!im) break;
    W.usedImages.add(im.id);
    if (i < 10) {
      const x = 7 + i * 2.3, side = i % 2 ? 1 : -1;
      picture(im, x, y + 1.7, side > 0 ? CZ1 - T / 2 - 0.03 : CZ0 + T / 2 + 0.03, side > 0 ? P : 0, 0.7, { frame: 'dark' });
    } else {
      // составлены у стены склада мебели, наклонно
      const k = i - 10; const x = 6.6 + (k % 8) * 0.65;
      picture(im, x, y + 0.45, -6.05 + Math.floor(k / 8) * 0.12 + 0.6, 0, 0.75, { frame: 'dark', lean: -0.18 });
    }
    i++;
  }
}
