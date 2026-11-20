// Строительные блоки мира: стены с окнами и дверями, полы, коллизии,
// интерактивные объекты, источники света, зоны.
import * as THREE from 'three';
import * as TX from './textures.js';
import * as SFX from './audio.js';

export const FH = 4;          // высота этажа
export const T = 0.2;         // толщина стен

export const W = {
  scene: null,
  levels: {},          // уровень -> THREE.Group
  group: null,         // текущая группа для добавления
  level: 0,
  colliders: [],
  surfaces: [],
  interactables: [],
  anchors: [],         // «якоря» света, из них выбираются реальные PointLight
  zones: [],
  animated: [],
  triggers: [],
  images: [],          // манифест картинок
  imageUrls: {},
  usedImages: new Set(),
  flags: {},
};
// API игры (заполняет main.js): toast, note, sit, secret, item, ...
export const G = {};

export function setLevel(L) {
  W.level = L;
  if (!W.levels[L]) { const g = new THREE.Group(); g.name = 'level' + L; W.levels[L] = g; W.scene.add(g); }
  W.group = W.levels[L];
}

// ---------- материалы ----------
const matCache = {};
export function lam(key, params) {
  if (matCache[key]) return matCache[key];
  const m = new THREE.MeshLambertMaterial(params);
  return (matCache[key] = m);
}
export function col(hex, extra = {}) { return lam('c' + hex + JSON.stringify(extra), { color: hex, ...extra }); }
export function texMat(key, tex, color = 0xffffff, extra = {}) { return lam('t' + key, { map: tex, color, ...extra }); }
export function emis(hex, intensity = 1) { return lam('e' + hex + intensity, { color: 0x000000, emissive: hex, emissiveIntensity: intensity }); }
export function basic(key, params) { return matCache['b' + key] || (matCache['b' + key] = new THREE.MeshBasicMaterial(params)); }

// Коробка с UV в «метрах»: текстура повторяется каждые s метров
export function boxGeo(w, h, d, s = 2) {
  const g = new THREE.BoxGeometry(w, h, d);
  const uv = g.attributes.uv;
  const dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) for (let v = 0; v < 4; v++) {
    const i = f * 4 + v; uv.setXY(i, uv.getX(i) * dims[f][0] / s, uv.getY(i) * dims[f][1] / s);
  }
  return g;
}

export function addCollider(x0, y0, z0, x1, y1, z1, ref = null) {
  const c = { minX: Math.min(x0, x1), maxX: Math.max(x0, x1), minY: Math.min(y0, y1), maxY: Math.max(y0, y1), minZ: Math.min(z0, z1), maxZ: Math.max(z0, z1), enabled: true, ref };
  W.colliders.push(c); return c;
}

// Блок по двум углам. mats: материал или массив из 6 материалов
export function block(x0, y0, z0, x1, y1, z1, mats, { collide = true, s = 2, parent = null } = {}) {
  const w = Math.abs(x1 - x0), h = Math.abs(y1 - y0), d = Math.abs(z1 - z0);
  if (w < 0.001 || h < 0.001 || d < 0.001) return null;
  const m = new THREE.Mesh(boxGeo(w, h, d, s), mats);
  m.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  (parent || W.group).add(m);
  if (collide) m.userData.collider = addCollider(x0, y0, z0, x1, y1, z1, m);
  return m;
}
// Коробка по центру/низу, с поворотом (для мебели)
export function box(w, h, d, mat, x, y, z, { ry = 0, parent = null, s = 1 } = {}) {
  const m = new THREE.Mesh(boxGeo(w, h, d, s), mat);
  m.position.set(x, y + h / 2, z); m.rotation.y = ry;
  (parent || W.group).add(m); return m;
}
export function cyl(rt, rb, h, seg, mat, x, y, z, { parent = null } = {}) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat);
  m.position.set(x, y + h / 2, z); (parent || W.group).add(m); return m;
}
export function plane(w, h, mat, x, y, z, rx = 0, ry = 0, { parent = null } = {}) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  m.position.set(x, y, z); m.rotation.set(rx, ry, 0, 'YXZ'); (parent || W.group).add(m); return m;
}

// ---------- окна ----------
const glassMat = () => basic('glass', { color: 0xffd9a0, transparent: true, opacity: 0.1, depthWrite: false, side: THREE.DoubleSide });
const frameMat = () => col(0x1a1512);
let patchMat;
function windowLightPatch(cx, cz, y, along, w, inwardX, inwardZ, depth = 2.6, strength = 0.22) {
  patchMat = patchMat || new THREE.MeshBasicMaterial({ map: TX.windowPatchTex(), color: 0xffb35a, transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w * 1.1, depth), patchMat.clone());
  m.material.opacity = strength;
  m.rotation.x = -Math.PI / 2;
  // ориентация: «верх» текстуры (яркий край) к окну
  const ang = Math.atan2(inwardX, inwardZ);
  m.rotation.order = 'YXZ'; m.rotation.y = ang + Math.PI;
  m.position.set(cx + inwardX * depth / 2, y + 0.012, cz + inwardZ * depth / 2);
  W.group.add(m);
  // лёгкий объёмный луч
  const sh = new THREE.Mesh(new THREE.PlaneGeometry(w, 2.2), patchMat.clone());
  sh.material.opacity = strength * 0.25; sh.material.side = THREE.DoubleSide;
  sh.position.set(cx + inwardX * 0.9, y + 1.25, cz + inwardZ * 0.9);
  sh.rotation.order = 'YXZ'; sh.rotation.y = ang; sh.rotation.x = -0.6;
  W.group.add(sh);
}

// openings: [{at, w, type:'door'|'window'|'open'|'blocks', sill, h}]
// at — координата центра проёма вдоль стены (абсолютная)
// mats: материал или {neg, pos} — сторона к -оси и к +оси нормали
// inside: +1/-1 — где интерьер (для световых пятен от окон), 0 — нет пятен
export function wall(axis, c, a0, a1, y0, h, mats, openings = [], { inside = 0, patch = true } = {}) {
  const neg = mats.neg || mats, pos = mats.pos || mats, edge = mats.edge || neg;
  // массив материалов по граням: px,nx,py,ny,pz,nz
  const arr = axis === 'x' ? [edge, edge, edge, edge, pos, neg] : [pos, neg, edge, edge, edge, edge];
  const seg = (s0, s1, yy0, yy1) => {
    if (s1 - s0 < 0.01 || yy1 - yy0 < 0.01) return;
    if (axis === 'x') block(s0, yy0, c - T / 2, s1, yy1, c + T / 2, arr);
    else block(c - T / 2, yy0, s0, c + T / 2, yy1, s1, arr);
  };
  const ops = openings.slice().sort((p, q) => p.at - q.at);
  let cur = Math.min(a0, a1); const end = Math.max(a0, a1);
  const Y1 = y0 + h;
  for (const o of ops) {
    const s0 = o.at - o.w / 2, s1 = o.at + o.w / 2;
    seg(cur, s0, y0, Y1);
    if (o.type === 'door') seg(s0, s1, y0 + (o.h || 2.2), Y1);
    else if (o.type === 'open') seg(s0, s1, y0 + (o.h || 3), Y1);
    else if (o.type === 'window' || o.type === 'blocks') {
      const sill = o.sill ?? 0.8, wh = o.h ?? 1.9;
      seg(s0, s1, y0, y0 + sill); seg(s0, s1, y0 + sill + wh, Y1);
      addWindow(axis, c, s0, s1, y0 + sill, y0 + sill + wh, o.type === 'blocks', o.mull ?? Math.max(1, Math.round((s1 - s0) / 0.9)));
      if (inside && patch && o.type === 'window' && sill < 1.5) {
        const mid = (s0 + s1) / 2;
        if (axis === 'x') windowLightPatch(mid, c + inside * T / 2, y0, 'x', s1 - s0, 0, inside, Math.min(3.2, wh * 1.4), o.light ?? 0.2);
        else windowLightPatch(c + inside * T / 2, mid, y0, 'z', s1 - s0, inside, 0, Math.min(3.2, wh * 1.4), o.light ?? 0.2);
      }
    }
    cur = s1;
  }
  seg(cur, end, y0, Y1);
}

function addWindow(axis, c, s0, s1, ya, yb, blocks, mull) {
  const w = s1 - s0, h = yb - ya, mid = (s0 + s1) / 2;
  const fm = frameMat();
  const put = (along, y, aw, hh, thick = 0.08) => {
    if (axis === 'x') block(along - aw / 2, y - hh / 2, c - thick, along + aw / 2, y + hh / 2, c + thick, fm, { collide: false });
    else block(c - thick, y - hh / 2, along - aw / 2, c + thick, y + hh / 2, along + aw / 2, fm, { collide: false });
  };
  put(mid, ya + 0.03, w, 0.06, 0.16); put(mid, yb - 0.03, w, 0.06, 0.12);
  put(s0 + 0.03, (ya + yb) / 2, 0.06, h); put(s1 - 0.03, (ya + yb) / 2, 0.06, h);
  for (let i = 1; i < mull; i++) put(s0 + w * i / mull, (ya + yb) / 2, 0.05, h, 0.05);
  if (h > 1.4 && !blocks) put(mid, ya + h * 0.72, w, 0.045, 0.05);
  let m;
  if (blocks) m = texMat('gblock', TX.glassBlock(), 0xffffff, { emissive: 0xffc070, emissiveIntensity: 0.5, emissiveMap: TX.glassBlock() });
  else m = glassMat();
  const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m);
  if (blocks) { p.geometry.attributes.uv.array.forEach((v, i, a) => { a[i] = v * (i % 2 ? h : w) / 0.6; }); }
  p.position.set(axis === 'x' ? mid : c, (ya + yb) / 2, axis === 'x' ? c : mid);
  if (axis === 'z') p.rotation.y = Math.PI / 2;
  if (blocks) { p.material.side = THREE.DoubleSide; }
  W.group.add(p);
  // невидимая преграда в проёме
  if (axis === 'x') addCollider(s0, ya, c - T / 2, s1, yb, c + T / 2);
  else addCollider(c - T / 2, ya, s0, c + T / 2, yb, s1);
}

// ---------- полы, потолки, лестницы ----------
export function planeUV(w, h, s) {
  const g = new THREE.PlaneGeometry(w, h);
  const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w / s, uv.getY(i) * h / s);
  return g;
}
export function floorRect(x0, z0, x1, z1, y, mat, sound = 'concrete', { s = 2, walk = true } = {}) {
  const w = x1 - x0, d = z1 - z0; if (w <= 0 || d <= 0) return;
  const m = new THREE.Mesh(planeUV(w, d, s), mat);
  m.rotation.x = -Math.PI / 2; m.position.set((x0 + x1) / 2, y + 0.001, (z0 + z1) / 2);
  W.group.add(m);
  if (walk) W.surfaces.push({ minX: x0, maxX: x1, minZ: z0, maxZ: z1, y: () => y, sound });
  return m;
}
export function ceilRect(x0, z0, x1, z1, y, mat, { s = 2 } = {}) {
  const w = x1 - x0, d = z1 - z0; if (w <= 0 || d <= 0) return;
  const m = new THREE.Mesh(planeUV(w, d, s), mat);
  m.rotation.x = Math.PI / 2; m.position.set((x0 + x1) / 2, y, (z0 + z1) / 2);
  W.group.add(m); return m;
}
export function surface(x0, z0, x1, z1, yFn, sound) {
  W.surfaces.push({ minX: Math.min(x0, x1), maxX: Math.max(x0, x1), minZ: Math.min(z0, z1), maxZ: Math.max(z0, z1), y: yFn, sound });
}
// прямоугольник минус дыра
export function rectMinus(r, h) {
  const [x0, z0, x1, z1] = r, [hx0, hz0, hx1, hz1] = h;
  const out = [];
  if (hz0 > z0) out.push([x0, z0, x1, Math.min(hz0, z1)]);
  if (hz1 < z1) out.push([x0, Math.max(hz1, z0), x1, z1]);
  const zz0 = Math.max(z0, hz0), zz1 = Math.min(z1, hz1);
  if (zz1 > zz0) {
    if (hx0 > x0) out.push([x0, zz0, Math.min(hx0, x1), zz1]);
    if (hx1 < x1) out.push([Math.max(hx1, x0), zz0, x1, zz1]);
  }
  return out;
}

// ---------- интерактив ----------
// label — строка или функция; action(obj) — что делать
export function interact(obj, label, action, extra = {}) {
  obj.userData.interact = { label, action, ...extra };
  obj.traverse(o => { o.userData.owner = obj; });
  W.interactables.push(obj);
  return obj;
}

// ---------- свет ----------
export function anchor(x, y, z, { color = 0xffb070, intensity = 4, distance = 7, flicker = 0, level = W.level, on = true, bulb = null } = {}) {
  const a = { pos: new THREE.Vector3(x, y, z), color: new THREE.Color(color), intensity, distance, flicker, level, on, bulb, phase: Math.random() * 100 };
  W.anchors.push(a); return a;
}
// Световое пятно на полу/стене (дешёвый «запечённый» свет)
let glowMatBase;
export function glow(x, y, z, size, color = 0xffa860, opacity = 0.25, { rx = -Math.PI / 2, ry = 0, parent = null } = {}) {
  glowMatBase = glowMatBase || new THREE.MeshBasicMaterial({ map: TX.glowTex(), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
  const m = glowMatBase.clone(); m.color.set(color); m.opacity = opacity;
  const p = new THREE.Mesh(new THREE.PlaneGeometry(size, size), m); p.userData.noRay = true;
  p.position.set(x, y, z); p.rotation.order = 'YXZ'; p.rotation.set(rx, ry, 0);
  (parent || W.group).add(p); return p;
}

// ---------- зоны (название места, акустика, звук шагов) ----------
export function zone(x0, z0, x1, z1, name, opts = {}) {
  W.zones.push({ minX: x0, maxX: x1, minZ: z0, maxZ: z1, level: W.level, name, reverb: 0.25, wind: 0.02, buzz: 0, muffle: 3200, ...opts });
}
export function trigger(x0, z0, x1, z1, fn, { once = true, level = W.level } = {}) {
  W.triggers.push({ minX: x0, maxX: x1, minZ: z0, maxZ: z1, level, fn, once, done: false });
}

// ---------- двери ----------
// Дверь в стене axis ('x' — стена вдоль X) с центром at, на линии c.
// swing: +1/-1 — в какую сторону по нормали открывается.
export class Door {
  constructor(axis, c, at, { w = 1, h = 2.2, swing = 1, hinge = -1, mat = null, locked = false, name = 'дверь',
    lockedMsg = 'Заперто.', key = null, onOpen = null, onLocked = null, frame = true, heavy = false, sound = true, hidden = false } = {}) {
    Object.assign(this, { axis, c, at, w, h, swing, locked, name, lockedMsg, key, onOpen, onLocked, heavy, sound });
    this.open = false; this.angle = 0; this.target = 0;
    const y0 = W.level * FH;
    this.pivot = new THREE.Group();
    const hx = axis === 'x' ? at + hinge * w / 2 : c, hz = axis === 'x' ? c : at + hinge * w / 2;
    this.pivot.position.set(hx, y0, hz);
    if (axis === 'z') this.pivot.rotation.y = -Math.PI / 2;
    W.group.add(this.pivot);
    const panelMat = mat || texMat('doorwood', TX.wood('#3b2215'), 0xffffff);
    const panel = new THREE.Mesh(boxGeo(w - 0.04, h - 0.02, 0.06, 1), panelMat);
    panel.position.set(-hinge * (w / 2), h / 2, 0);
    this.pivot.add(panel); this.panel = panel;
    if (!hidden) {
      // филёнки и ручка
      const inset = col(0x24140c);
      for (const s of [-1, 1]) for (const yy of [0.62, 1.55]) {
        const p = new THREE.Mesh(boxGeo(w * 0.62, yy < 1 ? 0.8 : 0.9, 0.02, 1), inset);
        p.position.set(-hinge * (w / 2), yy, s * 0.035); this.pivot.add(p);
      }
      const brass = col(0xb08a3a, { emissive: 0x2a1a00 });
      for (const s of [-1, 1]) {
        const k = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 4), brass);
        k.position.set(-hinge * (w - 0.1), 1.0, s * 0.06); this.pivot.add(k);
      }
    }
    if (frame && !hidden) {
      const fm = col(0x1c120c);
      if (axis === 'x') {
        block(at - w / 2 - 0.06, y0, c - 0.13, at - w / 2, y0 + h + 0.06, c + 0.13, fm, { collide: false });
        block(at + w / 2, y0, c - 0.13, at + w / 2 + 0.06, y0 + h + 0.06, c + 0.13, fm, { collide: false });
        block(at - w / 2, y0 + h, c - 0.13, at + w / 2, y0 + h + 0.06, c + 0.13, fm, { collide: false });
      } else {
        block(c - 0.13, y0, at - w / 2 - 0.06, c + 0.13, y0 + h + 0.06, at - w / 2, fm, { collide: false });
        block(c - 0.13, y0, at + w / 2, c + 0.13, y0 + h + 0.06, at + w / 2 + 0.06, fm, { collide: false });
        block(c - 0.13, y0 + h, at - w / 2, c + 0.13, y0 + h + 0.06, at + w / 2, fm, { collide: false });
      }
    }
    this.collider = axis === 'x' ? addCollider(at - w / 2, y0, c - 0.1, at + w / 2, y0 + h, c + 0.1)
      : addCollider(c - 0.1, y0, at - w / 2, c + 0.1, y0 + h, at + w / 2);
    this.hingeSign = hinge; this.pivot.userData.owner = panel;
    interact(panel, () => this.locked ? `${cap(this.name)} — заперто` : (this.open ? 'Закрыть ' : 'Открыть ') + this.name, () => this.toggle());
    W.animated.push(dt => this.update(dt));
  }
  toggle(force) {
    if (this.locked) {
      if (this.key && G.hasItem && G.hasItem(this.key)) {
        this.locked = false; G.toast(`Ключ подошёл: ${this.name}`); SFX.sfxClick();
      } else {
        SFX.sfxLocked();
        if (this.onLocked) this.onLocked(this); else G.toast(this.lockedMsg);
        return;
      }
    }
    this.open = force !== undefined ? force : !this.open;
    // дверь открывается от игрока: swing задан заранее
    this.target = this.open ? this.swing * this.hingeSign * 1.45 * (this.axis === 'z' ? -1 : 1) : 0;
    this.collider.enabled = !this.open;
    if (this.sound) { if (this.open) SFX.sfxDoorOpen(this.heavy); else setTimeout(() => SFX.sfxDoorClose(), 380); }
    if (this.open && this.onOpen) this.onOpen(this);
  }
  update(dt) {
    const d = this.target - this.angle;
    if (Math.abs(d) > 0.001) { this.angle += d * Math.min(1, dt * 4); this.pivot.rotation.y = (this.axis === 'z' ? -Math.PI / 2 : 0) + this.angle; }
  }
}
export const cap = s => s.charAt(0).toUpperCase() + s.slice(1);

// ---------- картины ----------
const texLoader = new THREE.TextureLoader();
const picTex = {};
function pictureTexture(id) {
  if (picTex[id]) return picTex[id];
  const t = texLoader.load(W.imageUrls[id]); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return (picTex[id] = t);
}
// Берёт следующую неиспользованную картинку из предпочтительных групп
export function takeImage(groups = []) {
  for (const g of groups) {
    const im = W.images.find(i => i.group === g && !W.usedImages.has(i.id));
    if (im) { W.usedImages.add(im.id); return im; }
  }
  const im = W.images.find(i => !W.usedImages.has(i.id));
  if (im) { W.usedImages.add(im.id); return im; }
  return null;
}
export function remainingImages() { return W.images.filter(i => !W.usedImages.has(i.id)).length; }

// Картина в раме. (x,z) — точка на стене, ry — куда смотрит картина (угол нормали),
// y — центр по высоте. size — длинная сторона.
export function picture(groups, x, y, z, ry, size = 0.9, { frame = 'dark', parent = null, lean = 0 } = {}) {
  const im = Array.isArray(groups) ? takeImage(groups) : groups; if (!im) return null;
  const asp = im.w / im.h;
  const pw = asp >= 1 ? size : size * asp, ph = asp >= 1 ? size / asp : size;
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.order = 'YXZ'; g.rotation.y = ry; g.rotation.x = lean;
  const fc = { dark: 0x1a0f0a, gold: 0x7a5a22, white: 0xb8b0a0, black: 0x0a0a0a, pink: 0x8a3a5a, chrome: 0x8a8f95 }[frame] || 0x1a0f0a;
  const fm = col(fc, frame === 'gold' ? { emissive: 0x1a1000 } : {});
  const fr = new THREE.Mesh(boxGeo(pw + 0.12, ph + 0.12, 0.05, 1), fm); fr.position.z = 0.025; g.add(fr);
  const mat = new THREE.MeshLambertMaterial({ map: pictureTexture(im.id), emissive: 0xffffff, emissiveMap: pictureTexture(im.id), emissiveIntensity: 0.22 });
  const p = new THREE.Mesh(new THREE.PlaneGeometry(pw, ph), mat); p.position.z = 0.052; g.add(p);
  (parent || W.group).add(g);
  g.userData.img = im;
  interact(g, 'Рассмотреть картину', () => G.showPicture(im));
  return g;
}

// ---------- оптимизация: слияние статичной геометрии уровня по материалам ----------
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
export function optimizeLevels() {
  let before = 0, after = 0;
  const targets = [];
  for (const lv of Object.values(W.levels)) { targets.push([lv, true]); lv.traverse(o => { if (o !== lv && o.isGroup && o.children.length > 1) targets.push([o, false]); }); }
  for (const [g, isLevel] of targets) {
    const buckets = new Map();
    const victims = [];
    for (const m of g.children) {
      if (!m.isMesh || m.userData.interact || m.userData.dynamic || m.userData.noMerge || m.children.length) continue;
      if (isLevel && m.userData.owner) continue;
      const mats = Array.isArray(m.material) ? m.material : [m.material];
      if (mats.some(x => x.transparent || x.blending !== THREE.NormalBlending)) continue;
      m.updateMatrix();
      let geo = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone();
      geo.applyMatrix4(m.matrix);
      const parts = [];
      if (Array.isArray(m.material)) {
        for (const gr of m.geometry.groups) {
          const sub = new THREE.BufferGeometry();
          for (const name of ['position', 'normal', 'uv']) {
            const a = geo.attributes[name];
            sub.setAttribute(name, new THREE.BufferAttribute(a.array.slice(gr.start * a.itemSize, (gr.start + gr.count) * a.itemSize), a.itemSize));
          }
          parts.push([m.material[gr.materialIndex], sub]);
        }
      } else {
        const sub = new THREE.BufferGeometry();
        for (const name of ['position', 'normal', 'uv']) if (geo.attributes[name]) sub.setAttribute(name, geo.attributes[name]);
        if (!sub.attributes.uv) continue;
        parts.push([m.material, sub]);
      }
      for (const [mat, sub] of parts) { if (!buckets.has(mat)) buckets.set(mat, []); buckets.get(mat).push(sub); }
      victims.push(m); before++;
    }
    for (const m of victims) g.remove(m);
    for (const [mat, geos] of buckets) {
      const merged = mergeGeometries(geos, false);
      if (!merged) continue;
      merged.computeBoundingSphere();
      const mm = new THREE.Mesh(merged, mat); g.add(mm); after++;
      if (!isLevel) mm.userData.owner = g.userData.owner || (g.userData.interact ? g : null);
    }
  }
  return [before, after];
}
