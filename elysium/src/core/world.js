// ЭЛИЗИУМ · мир
// Общее состояние и строительные блоки: этажи-группы, материалы, стены с проёмами (двери, окна, арки),
// полы и потолки, коллизии, поверхности для ходьбы, лестницы, зоны, триггеры, интерактив, метки для QA.
// Единицы — метры, ось Y вверх. Этаж L занимает высоты [L·FH, (L+1)·FH).
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// ---------- настройки мира ----------
export const CFG = {
  FH: 4,       // высота этажа (от пола до пола следующего)
  T: 0.3,      // толщина стен: тоньше 0.25 стены выглядят картонными, а мебель у стен не помещается
  CEIL: 3.7,   // высота потолка от пола этажа
  TRIM: 0.02,  // на сколько плинтус и карниз выступают из стены
};
export function configure(o) { Object.assign(CFG, o); }

// ---------- общее состояние ----------
export const W = {
  scene: null, levels: {}, group: null, level: 0,
  colliders: [],    // AABB { minX..maxZ, enabled, ref } — то, сквозь что нельзя пройти
  surfaces: [],     // прямоугольники, по которым ходят: { minX..maxZ, y(x,z), sound }
  solids: [],       // [x0,y0,z0,x1,y1,z1] — «сплошное» для детектора мерцания (видна ли грань)
  interactables: [], anchors: [], zones: [], triggers: [], doors: [], windows: [], sounds: [], qa: [],
  animated: [],     // функции (dt, t), вызываются каждый кадр, если их этаж виден
  flags: { blackout: false },
  state: { started: false, paused: true, modal: null, busy: false, zone: null, title: true },
  shadowDirty: true, realSun: false,
};
export const G = {}; // крючки, которые заполняет интерфейс/игра: G.toast, G.note, G.subtitle, G.hasItem…

// анимации запоминают этаж, на котором созданы: пока этаж скрыт, они не считаются
W.animated.push = function (...fs) { for (const f of fs) if (f.__lvl === undefined && !f.always) f.__lvl = W.level; return Array.prototype.push.apply(this, fs); };

export function initWorld(scene) { W.scene = scene; setLevel(0); }
export function setLevel(L) {
  W.level = L;
  if (!W.levels[L]) { const g = new THREE.Group(); g.name = 'level' + L; W.levels[L] = g; W.scene.add(g); }
  W.group = W.levels[L];
}
export const Y = () => W.level * CFG.FH; // высота пола текущего этажа

// ---------- материалы (кэшируются по ключу) ----------
const matCache = {};
export function lam(key, params, uv = 0) {
  if (matCache[key]) return matCache[key];
  const m = new THREE.MeshLambertMaterial(params);
  m.userData.worldUV = uv; m.name = key; // worldUV: метров на один повтор текстуры при слиянии статики
  return (matCache[key] = m);
}
export function col(hex, extra = {}) { return lam('c' + hex + JSON.stringify(extra), { color: hex, ...extra }); }
export function texMat(key, tex, color = 0xffffff, extra = {}, uv = 2) { return lam('t' + key, { map: tex, color, ...extra }, uv); }
export function emis(hex, intensity = 1) { return lam('e' + hex + intensity, { color: 0x000000, emissive: hex, emissiveIntensity: intensity }); }
export function basic(key, params) { return matCache['b' + key] || (matCache['b' + key] = new THREE.MeshBasicMaterial(params)); }
// наклейки (пятна света, ореолы, таблички поверх стены): не спорят с поверхностью по глубине
export function decalMat(params) { return new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4, ...params }); }

// коробка с UV в метрах (s — метров на повтор): текстура не растягивается на длинных блоках
export function boxGeo(w, h, d, s = 1) {
  const g = new THREE.BoxGeometry(w, h, d);
  const uv = g.attributes.uv;
  const dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) for (let v = 0; v < 4; v++) { const i = f * 4 + v; uv.setXY(i, uv.getX(i) * dims[f][0] / s, uv.getY(i) * dims[f][1] / s); }
  return g;
}

// ---------- геометрия ----------
export function addCollider(x0, y0, z0, x1, y1, z1, ref = null) {
  const c = { minX: Math.min(x0, x1), maxX: Math.max(x0, x1), minY: Math.min(y0, y1), maxY: Math.max(y0, y1), minZ: Math.min(z0, z1), maxZ: Math.max(z0, z1), enabled: true, ref };
  W.colliders.push(c); return c;
}
// блок по двум углам; mats — материал или массив из 6 (+x,-x,+y,-y,+z,-z)
export function block(x0, y0, z0, x1, y1, z1, mats, { collide = true, parent = null } = {}) {
  const w = Math.abs(x1 - x0), h = Math.abs(y1 - y0), d = Math.abs(z1 - z0);
  if (w < 0.001 || h < 0.001 || d < 0.001) return null;
  const m = new THREE.Mesh(boxGeo(w, h, d), mats);
  m.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  (parent || W.group).add(m);
  if (!parent) W.solids.push([Math.min(x0, x1), Math.min(y0, y1), Math.min(z0, z1), Math.max(x0, x1), Math.max(y0, y1), Math.max(z0, z1)]);
  if (collide) m.userData.collider = addCollider(x0, y0, z0, x1, y1, z1, m);
  return m;
}
// коробка по размеру; (x, y, z) — центр низа
export function box(w, h, d, mat, x, y, z, { ry = 0, parent = null, s = 1 } = {}) {
  const m = new THREE.Mesh(boxGeo(w, h, d, s), mat); m.position.set(x, y + h / 2, z); m.rotation.y = ry; (parent || W.group).add(m); return m;
}
export function cyl(rt, rb, h, seg, mat, x, y, z, { parent = null } = {}) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat); m.position.set(x, y + h / 2, z); (parent || W.group).add(m); return m;
}
export function plane(w, h, mat, x, y, z, rx = 0, ry = 0, { parent = null } = {}) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); m.position.set(x, y, z); m.rotation.set(rx, ry, 0, 'YXZ'); (parent || W.group).add(m); return m;
}

// группа-предмет: (x, z) на полу текущего этажа, ry — поворот; локально +Z — «лицо» предмета
export function grp(x, z, ry = 0, y = Y()) { const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry; W.group.add(g); return g; }
// невидимая коробка для попадания луча взгляда (мелкие предметы трудно «поймать» центром экрана)
const hitMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false });
export function hitBox(g, w, h, d, y = 0) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), hitMat); m.position.y = y + h / 2; m.userData.hit = true; g.add(m); return m; }
// точка в мировых координатах по локальным координатам группы
export function wp(g, x, y, z) { return new THREE.Vector3(x, y, z).applyEuler(g.rotation).add(g.position); }

// отделка стен: плинтус, карниз, рамы окон, подоконники
export const TRIM = {};
function trims() {
  if (!TRIM.skirt) Object.assign(TRIM, { skirt: col(0x24160c), crown: col(0x3a2818), frame: col(0x2a1a10), sill: col(0x5a4030) });
  return TRIM;
}

// ---------- стены ----------
// Стена вдоль оси axis ('x' — тянется по X на линии z = c; 'z' — по Z на линии x = c), от a0 до a1.
// mats: материал или { neg, pos, edge } — отделка стороны с меньшей координатой, с большей и торцов.
// openings: [{ at, w, type, h, sill, mull, light }]
//   door / hole — проём от пола высотой h; open — широкий проём-арка; gap — дыра на высоте sill;
//   window — окно (рама, переплёты, подоконники, стекло, коллайдер)
// inside: +1/−1 — где интерьер (для пятен солнца под окнами); ceil — абсолютная высота потолка (для карниза)
export function wall(axis, c, a0, a1, y0, h, mats, openings = [], { inside = 0, trim = true, ceil = null } = {}) {
  const { T, FH, CEIL, TRIM: E0 } = CFG;
  const neg = mats.neg || mats, pos = mats.pos || mats, edge = mats.edge || neg;
  const arr = axis === 'x' ? [edge, edge, edge, edge, pos, neg] : [pos, neg, edge, edge, edge, edge];
  const tm = trims();
  const seg = (s0, s1, yy0, yy1) => {
    if (s1 - s0 < 0.01 || yy1 - yy0 < 0.01) return;
    axis === 'x' ? block(s0, yy0, c - T / 2, s1, yy1, c + T / 2, arr) : block(c - T / 2, yy0, s0, c + T / 2, yy1, s1, arr);
    if (!trim) return;
    // плинтус и карниз выступают на TRIM с обеих сторон; их концы — ещё на 12 мм дальше торца стены,
    // иначе торец полосы совпадает с торцом стены и мерцает
    const TT = T / 2 + E0, E = 0.012;
    const band = (ya, yb, m) => axis === 'x' ? block(s0 - E, ya, c - TT, s1 + E, yb, c + TT, m, { collide: false }) : block(c - TT, ya, s0 - E, c + TT, yb, s1 + E, m, { collide: false });
    if (Math.abs(yy0 - y0) < 0.001) band(y0, y0 + 0.12, tm.skirt);
    const cy = ceil ?? (y0 + Math.min(h, CEIL));
    if (yy0 < cy - 0.1 && yy1 > cy - 0.01) band(cy - 0.1, cy, tm.crown);
  };
  const ops = openings.slice().sort((p, q) => p.at - q.at);
  let cur = Math.min(a0, a1); const end = Math.max(a0, a1);
  // стена, доходящая до пола следующего этажа, кончается на 12 мм ниже: верх не совпадает с полом
  const top = y0 + h, Y1 = Math.abs(top / FH - Math.round(top / FH)) < 1e-6 ? top - 0.012 : top;
  for (const o of ops) {
    const s0 = o.at - o.w / 2, s1 = o.at + o.w / 2;
    seg(cur, s0, y0, Y1);
    if (o.type === 'door' || o.type === 'hole') seg(s0, s1, y0 + (o.h || 2.2), Y1);
    else if (o.type === 'open') seg(s0, s1, y0 + (o.h || 3), Y1);
    else if (o.type === 'gap') { seg(s0, s1, y0, y0 + o.sill); seg(s0, s1, y0 + o.sill + o.h, Y1); }
    else if (o.type === 'window') {
      const sill = o.sill ?? 0.8, wh = o.h ?? 1.9;
      seg(s0, s1, y0, y0 + sill); seg(s0, s1, y0 + sill + wh, Y1);
      const mull = o.mull ?? Math.max(1, Math.round((s1 - s0) / 0.9));
      addWindow(axis, c, s0, s1, y0 + sill, y0 + sill + wh, mull);
      W.windows.push({ axis, c, s0, s1, y0, sill, wh, mull, inside, light: o.light ?? 0.2, level: W.level });
    }
    cur = s1;
  }
  seg(cur, end, y0, Y1);
}
function addWindow(axis, c, s0, s1, ya, yb, mull) {
  const w = s1 - s0, h = yb - ya, mid = (s0 + s1) / 2, tm = trims();
  const put = (along, y, aw, hh, thick, m = tm.frame, off = 0) => axis === 'x'
    ? block(along - aw / 2, y - hh / 2, c + off - thick, along + aw / 2, y + hh / 2, c + off + thick, m, { collide: false })
    : block(c + off - thick, y - hh / 2, along - aw / 2, c + off + thick, y + hh / 2, along + aw / 2, m, { collide: false });
  put(mid, yb - 0.03, w, 0.06, 0.06); put(s0 + 0.03, (ya + yb) / 2, 0.06, h, 0.06); put(s1 - 0.03, (ya + yb) / 2, 0.06, h, 0.06);
  for (let i = 1; i < mull; i++) put(s0 + w * i / mull, (ya + yb) / 2, 0.05, h, 0.04);
  if (h > 1.4) put(mid, ya + h * 0.72, w, 0.045, 0.04);
  put(mid, ya, w + 0.16, 0.05, 0.1, tm.sill, -0.1); put(mid, ya, w + 0.16, 0.05, 0.1, tm.sill, 0.1);
  const glass = basic('glass', { color: 0xffd9a0, transparent: true, opacity: 0.08, depthWrite: false, side: THREE.DoubleSide });
  const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), glass);
  p.position.set(axis === 'x' ? mid : c, (ya + yb) / 2, axis === 'x' ? c : mid); if (axis === 'z') p.rotation.y = Math.PI / 2;
  W.group.add(p);
  if (axis === 'x') addCollider(s0, ya, c - CFG.T / 2, s1, yb, c + CFG.T / 2); else addCollider(c - CFG.T / 2, ya, s0, c + CFG.T / 2, yb, s1);
}

// ---------- полы, потолки, поверхности ----------
export function planeUV(w, h, s) {
  const g = new THREE.PlaneGeometry(w, h);
  const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w / s, uv.getY(i) * h / s);
  return g;
}
export function floorRect(x0, z0, x1, z1, y, mat, sound = 'concrete', { walk = true } = {}) {
  const w = x1 - x0, d = z1 - z0; if (w <= 0.001 || d <= 0.001) return null;
  const m = new THREE.Mesh(planeUV(w, d, 2), mat); m.rotation.x = -Math.PI / 2; m.position.set((x0 + x1) / 2, y, (z0 + z1) / 2);
  W.group.add(m); W.solids.push([x0, y - 0.3, z0, x1, y, z1]);
  if (walk) W.surfaces.push({ minX: x0, maxX: x1, minZ: z0, maxZ: z1, y: () => y, sound });
  return m;
}
export function ceilRect(x0, z0, x1, z1, y, mat) {
  const w = x1 - x0, d = z1 - z0; if (w <= 0.001 || d <= 0.001) return null;
  const m = new THREE.Mesh(planeUV(w, d, 2), mat); m.rotation.x = Math.PI / 2; m.position.set((x0 + x1) / 2, y, (z0 + z1) / 2);
  W.group.add(m); W.solids.push([x0, y, z0, x1, y + 0.3, z1]); return m;
}
// поверхность для ходьбы с произвольной высотой yFn(x, z): пандусы, лестницы, сцены
export function surface(x0, z0, x1, z1, yFn, sound) {
  W.surfaces.push({ minX: Math.min(x0, x1), maxX: Math.max(x0, x1), minZ: Math.min(z0, z1), maxZ: Math.max(z0, z1), y: yFn, sound });
}
// прямоугольник минус дыра (лестничный проём, шахта лифта) → список прямоугольников
export function rectMinus(r, h) {
  const [x0, z0, x1, z1] = r, [hx0, hz0, hx1, hz1] = h;
  if (hx1 <= x0 || hx0 >= x1 || hz1 <= z0 || hz0 >= z1) return [r];
  const out = [];
  if (hz0 > z0) out.push([x0, z0, x1, Math.min(hz0, z1)]);
  if (hz1 < z1) out.push([x0, Math.max(hz1, z0), x1, z1]);
  const zz0 = Math.max(z0, hz0), zz1 = Math.min(z1, hz1);
  if (zz1 > zz0) { if (hx0 > x0) out.push([x0, zz0, Math.min(hx0, x1), zz1]); if (hx1 < x1) out.push([Math.max(hx1, x0), zz0, x1, zz1]); }
  return out;
}
export function rectsMinus(rects, holes) { let out = rects; for (const h of holes) out = out.flatMap(r => rectMinus(r, h)); return out; }

// Лестничный марш: ступени-блоки и гладкая «поверхность» под ногами (по ступеням идти не нужно — нога
// поднимается на 0.46 м сама). dir — куда идёт подъём: '+z', '-z', '+x', '-x'.
export function stairs(x0, z0, x1, z1, y0, y1, dir, mat, { n = null, sound = 'wood' } = {}) {
  const along = dir[1], sgn = dir[0] === '+' ? 1 : -1;
  const a0 = along === 'z' ? z0 : x0, a1 = along === 'z' ? z1 : x1, len = a1 - a0, rise = y1 - y0;
  n = n || Math.max(2, Math.round(rise / 0.17));
  for (let i = 0; i < n; i++) {
    const s0 = sgn > 0 ? a0 + len * i / n : a1 - len * (i + 1) / n, s1 = s0 + len / n, yy = y0 + rise * (i + 1) / n;
    along === 'z' ? block(x0, y0, s0, x1, yy, s1, mat, { collide: false }) : block(s0, y0, z0, s1, yy, z1, mat, { collide: false });
  }
  surface(x0, z0, x1, z1, (x, z) => { const a = along === 'z' ? z : x; const t = sgn > 0 ? (a - a0) / len : (a1 - a) / len; return y0 + rise * Math.max(0, Math.min(1, t)); }, sound);
}

// ---------- интерактив и метки ----------
// label — строка или функция (подсказка меняется: «Открыть» / «Закрыть»); action(obj) — по E / клику
export function interact(obj, label, action, extra = {}) {
  obj.userData.interact = { label, action, ...extra };
  obj.traverse(o => { if (o !== obj) o.userData.owner = obj; });
  if (!W.interactables.includes(obj)) W.interactables.push(obj);
  return obj;
}
// метка для автопроверки (qa.js): на чём держится предмет — 'floor' | 'table' | 'wall' | 'ceiling' | 'support'
export function mount(obj, kind, extra = {}) { W.qa.push({ obj, kind, ...extra }); return obj; }

// источник света-«якорь»: настоящий PointLight ему выдаёт пул (lights.js), если он близко и важен
export function anchor(x, y, z, { color = 0xffb070, intensity = 4, distance = 7, flicker = 0, level = W.level, on = true, grid = true } = {}) {
  const a = { pos: new THREE.Vector3(x, y, z), color: new THREE.Color(color), intensity, distance, flicker, level, on, grid, phase: Math.random() * 100 };
  W.anchors.push(a); return a;
}
// мягкий ореол-наклейка (у бра, ламп, неона)
let glowTex = null;
function makeGlowTex() {
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c);
}
export function glow(x, y, z, size, color = 0xffa860, opacity = 0.25, { rx = -Math.PI / 2, ry = 0, parent = null } = {}) {
  glowTex = glowTex || makeGlowTex();
  const p = new THREE.Mesh(new THREE.PlaneGeometry(size, size), decalMat({ map: glowTex, color, opacity, blending: THREE.AdditiveBlending }));
  p.userData.noRay = true; p.userData.noMerge = true;
  p.position.set(x, y, z); p.rotation.order = 'YXZ'; p.rotation.set(rx, ry, 0);
  (parent || W.group).add(p); return p;
}

// Зона — комната: имя на экране, реверберация, рассеянный свет, границы света ламп и звука.
// Границы зоны проводятся по ОСЯМ стен. opts: h — высота (по умолчанию FH), shaft — продлить по вертикали
// на соседние этажи (лестничная клетка: свет и звук идут по всей шахте), reverb, amb, muffle, wind…
export function zone(x0, z0, x1, z1, name, opts = {}) {
  const z = { minX: Math.min(x0, x1), maxX: Math.max(x0, x1), minZ: Math.min(z0, z1), maxZ: Math.max(z0, z1), level: W.level, name, reverb: 0.25, amb: 1.15, muffle: 3200, ...opts };
  W.zones.push(z); return z;
}
export function zoneAt(level, x, z) {
  let best = null, ba = Infinity;
  for (const zn of W.zones) if (zn.level === level && x >= zn.minX && x <= zn.maxX && z >= zn.minZ && z <= zn.maxZ) { const a = (zn.maxX - zn.minX) * (zn.maxZ - zn.minZ); if (a < ba) { ba = a; best = zn; } }
  return best;
}
export function trigger(x0, z0, x1, z1, fn, { once = true, level = W.level } = {}) {
  W.triggers.push({ minX: Math.min(x0, x1), maxX: Math.max(x0, x1), minZ: Math.min(z0, z1), maxZ: Math.max(z0, z1), level, fn, once, done: false });
}

// ---------- оптимизация: слияние статики по материалам с мировыми UV ----------
// Из тысяч блоков получаются десятки мешей. Не сливаются: интерактивные, noMerge, прозрачные, dynamic, hit.
const _n = new THREE.Vector3();
function applyWorldUV(geo, scale) {
  const pos = geo.attributes.position, nor = geo.attributes.normal, uv = geo.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    _n.fromBufferAttribute(nor, i);
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i), ax = Math.abs(_n.x), ay = Math.abs(_n.y), az = Math.abs(_n.z);
    let u, v;
    if (ay >= ax && ay >= az) { u = x; v = _n.y > 0 ? -z : z; } else if (ax >= az) { u = _n.x > 0 ? -z : z; v = y; } else { u = _n.z > 0 ? x : -x; v = y; }
    uv.setXY(i, u / scale, v / scale);
  }
}
export function optimize() {
  let before = 0, after = 0;
  const targets = [];
  for (const lv of Object.values(W.levels)) { targets.push([lv, true]); lv.traverse(o => { if (o !== lv && o.isGroup && o.children.length > 1) targets.push([o, false]); }); }
  for (const [g, isLevel] of targets) {
    const buckets = new Map(), victims = [];
    for (const m of g.children) {
      if (!m.isMesh || m.userData.interact || m.userData.dynamic || m.userData.noMerge || m.userData.hit || m.children.length) continue;
      if (isLevel && m.userData.owner) continue;
      const mats = Array.isArray(m.material) ? m.material : [m.material];
      if (mats.some(x => x.transparent || x.blending !== THREE.NormalBlending)) continue;
      m.updateMatrix();
      const geo = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone(); geo.applyMatrix4(m.matrix);
      const parts = [];
      const groups = Array.isArray(m.material) ? m.geometry.groups : [{ start: 0, count: geo.attributes.position.count, materialIndex: -1 }];
      for (const gr of groups) {
        const sub = new THREE.BufferGeometry();
        for (const name of ['position', 'normal', 'uv']) { const a = geo.attributes[name]; if (a) sub.setAttribute(name, new THREE.BufferAttribute(a.array.slice(gr.start * a.itemSize, (gr.start + gr.count) * a.itemSize), a.itemSize)); }
        if (!sub.attributes.uv || !sub.attributes.normal) continue;
        const mat = gr.materialIndex < 0 ? m.material : m.material[gr.materialIndex];
        if (isLevel && mat.userData.worldUV) applyWorldUV(sub, mat.userData.worldUV);
        parts.push([mat, sub]);
      }
      if (!parts.length) continue;
      for (const [mat, sub] of parts) { if (!buckets.has(mat)) buckets.set(mat, []); buckets.get(mat).push(sub); }
      victims.push(m); before++;
    }
    for (const m of victims) g.remove(m);
    for (const [mat, geos] of buckets) {
      const merged = mergeGeometries(geos, false); if (!merged) continue;
      merged.computeBoundingSphere();
      const mm = new THREE.Mesh(merged, mat); g.add(mm); after++;
      if (!isLevel) mm.userData.owner = g.userData.owner || (g.userData.interact ? g : null);
    }
  }
  return [before, after];
}
