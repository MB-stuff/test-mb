// Строительные блоки мира: стены с окнами и дверями (с плинтусами, карнизами
// и подоконниками), полы, коллизии, интерактив, свет, зоны, картины.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import * as TX from './textures.js';
import * as SFX from './audio.js';
import CAPTIONS from './captions.json';

export const FH = 4;          // высота этажа
export const T = 0.3;         // толщина стен
export const CEIL = 3.7;      // высота потолка от пола этажа

export const W = {
  scene: null, levels: {}, group: null, level: 0, exterior: null,
  colliders: [], surfaces: [], solids: [], interactables: [], anchors: [], zones: [], animated: [], triggers: [],
  images: [], imageUrls: {}, usedImages: new Set(), flags: {}, qa: [],
};
export const G = {};

// анимации запоминают этаж, на котором созданы: пока этаж скрыт, они не считаются
W.animated.push = function (...fs) { for (const f of fs) if (f.__lvl === undefined && !f.always) f.__lvl = W.level; return Array.prototype.push.apply(this, fs); };
export function setLevel(L) {
  W.level = L;
  if (!W.levels[L]) { const g = new THREE.Group(); g.name = 'level' + L; W.levels[L] = g; W.scene.add(g); }
  W.group = W.levels[L];
}
export function setExterior() {
  if (!W.exterior) { W.exterior = new THREE.Group(); W.exterior.name = 'exterior'; W.scene.add(W.exterior); }
  W.group = W.exterior; W.level = 99;
}

// ---------- материалы ----------
const matCache = {};
export function lam(key, params, uv = 0) {
  if (matCache[key]) return matCache[key];
  const m = new THREE.MeshLambertMaterial(params);
  m.userData.worldUV = uv; m.name = key;
  return (matCache[key] = m);
}
export function col(hex, extra = {}) { return lam('c' + hex + JSON.stringify(extra), { color: hex, ...extra }); }
// тайловый материал: uv — сколько метров на один повтор текстуры
export function texMat(key, tex, color = 0xffffff, extra = {}, uv = 2) { return lam('t' + key, { map: tex, color, ...extra }, uv); }
export function emis(hex, intensity = 1) { return lam('e' + hex + intensity, { color: 0x000000, emissive: hex, emissiveIntensity: intensity }); }
export function basic(key, params) { return matCache['b' + key] || (matCache['b' + key] = new THREE.MeshBasicMaterial(params)); }
// материал для наклеек (световые пятна, таблички): не спорит с поверхностью по глубине
export function decalMat(params) { return new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4, ...params }); }

export function boxGeo(w, h, d, s = 1) {
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

// ---------- отделка ----------
const M0 = {};
function trims() {
  if (M0.skirt) return M0;
  M0.skirt = texMat('skirt', TX.wood('#2a170d'), 0xffffff, {}, 2);
  M0.crown = col(0x5a3e28);
  M0.stone = texMat('trimStone', TX.stucco('#c09a6a', 4), 0xffffff, {}, 3);
  M0.sill = texMat('sill', TX.wood('#3a2416'), 0xffffff, {}, 2);
  M0.frame = col(0x2a1c14);
  return M0;
}
export const EXT = { mats: new Set() }; // материалы наружной стороны стен (для отделки камнем)

// ---------- окна ----------
const glassMat = () => basic('glass', { color: 0xffd9a0, transparent: true, opacity: 0.08, depthWrite: false, side: THREE.DoubleSide });
let patchBase;
function windowLightPatch(cx, cz, y, w, inwardX, inwardZ, depth = 2.6, strength = 0.22) {
  patchBase = patchBase || decalMat({ map: TX.windowPatchTex(), color: 0xffb35a, blending: THREE.AdditiveBlending });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w * 1.05, depth), patchBase.clone());
  m.material.opacity = strength; m.userData.noRay = true;
  const ang = Math.atan2(inwardX, inwardZ);
  m.rotation.order = 'YXZ'; m.rotation.set(-Math.PI / 2, ang + Math.PI, 0);
  m.position.set(cx + inwardX * depth / 2, y + 0.02, cz + inwardZ * depth / 2);
  W.group.add(m);
  (W.windowPatches = W.windowPatches || []).push({ mesh: m, cx, cz, w, y, level: W.level });
}

// Стена. openings: [{at, w, type:'door'|'open'|'window'|'blocks'|'hole', sill, h, light, mull}]
// mats: материал или {neg, pos}; inside: +1/-1 — где интерьер (для световых пятен)
// trim: плинтус/карниз; ceil — абсолютная высота потолка для карниза
export function wall(axis, c, a0, a1, y0, h, mats, openings = [], { inside = 0, patch = true, trim = true, ceil = null } = {}) {
  const neg = mats.neg || mats, pos = mats.pos || mats, edge = mats.edge || neg;
  const arr = axis === 'x' ? [edge, edge, edge, edge, pos, neg] : [pos, neg, edge, edge, edge, edge];
  const tm = trims();
  const sideMat = m => EXT.mats.has(m) ? tm.stone : null;
  const trimArr = (inner, outerExt) => {
    const nm = sideMat(neg) || inner, pm = sideMat(pos) || inner;
    return axis === 'x' ? [inner, inner, inner, inner, pm, nm] : [pm, nm, inner, inner, inner, inner];
  };
  const seg = (s0, s1, yy0, yy1) => {
    if (s1 - s0 < 0.01 || yy1 - yy0 < 0.01) return;
    const b = axis === 'x' ? block(s0, yy0, c - T / 2, s1, yy1, c + T / 2, arr) : block(c - T / 2, yy0, s0, c + T / 2, yy1, s1, arr);
    if (!trim) return b;
    // плинтус внизу и карниз под потолком (выступают на 2 см с каждой стороны)
    const TT = T / 2 + 0.02, E = 0.012; // концы полос выступают на 1,2 см, чтобы не совпадать с торцом стены
    const band = (ya, yb, m) => axis === 'x' ? block(s0 - E, ya, c - TT, s1 + E, yb, c + TT, trimArr(m), { collide: false }) : block(c - TT, ya, s0 - E, c + TT, yb, s1 + E, trimArr(m), { collide: false });
    if (Math.abs(yy0 - y0) < 0.001) band(y0, y0 + 0.12, tm.skirt);
    const cy = ceil ?? (y0 + Math.min(h, CEIL));
    if (yy0 < cy - 0.1 && yy1 > cy - 0.01) band(cy - 0.1, cy, tm.crown);
    return b;
  };
  const ops = openings.slice().sort((p, q) => p.at - q.at);
  let cur = Math.min(a0, a1); const end = Math.max(a0, a1);
  const top = y0 + h, Y1 = Math.abs(top / FH - Math.round(top / FH)) < 1e-6 ? top - 0.012 : top;
  for (const o of ops) {
    const s0 = o.at - o.w / 2, s1 = o.at + o.w / 2;
    seg(cur, s0, y0, Y1);
    if (o.type === 'door' || o.type === 'hole') seg(s0, s1, y0 + (o.h || 2.2), Y1);
    else if (o.type === 'open') seg(s0, s1, y0 + (o.h || 3), Y1);
    else if (o.type === 'gap') { seg(s0, s1, y0, y0 + o.sill); seg(s0, s1, y0 + o.sill + o.h, Y1); }
    else if (o.type === 'window' || o.type === 'blocks') {
      const sill = o.sill ?? 0.8, wh = o.h ?? 1.9;
      seg(s0, s1, y0, y0 + sill); seg(s0, s1, y0 + sill + wh, Y1);
      addWindow(axis, c, s0, s1, y0 + sill, y0 + sill + wh, o.type === 'blocks', o.mull ?? Math.max(1, Math.round((s1 - s0) / 0.9)), neg, pos);
      if (inside && patch && o.type === 'window' && sill < 1.5) {
        const mid = (s0 + s1) / 2;
        if (axis === 'x') windowLightPatch(mid, c + inside * T / 2, y0, s1 - s0, 0, inside, Math.min(3.2, wh * 1.4), o.light ?? 0.2);
        else windowLightPatch(c + inside * T / 2, mid, y0, s1 - s0, inside, 0, Math.min(3.2, wh * 1.4), o.light ?? 0.2);
      }
    }
    cur = s1;
  }
  seg(cur, end, y0, Y1);
}

function addWindow(axis, c, s0, s1, ya, yb, blocks, mull, neg, pos) {
  const w = s1 - s0, h = yb - ya, mid = (s0 + s1) / 2;
  const tm = trims(); const fm = tm.frame;
  const put = (along, y, aw, hh, thick, m = fm, off = 0) => {
    if (axis === 'x') block(along - aw / 2, y - hh / 2, c + off - thick, along + aw / 2, y + hh / 2, c + off + thick, m, { collide: false });
    else block(c + off - thick, y - hh / 2, along - aw / 2, c + off + thick, y + hh / 2, along + aw / 2, m, { collide: false });
  };
  // рама, импосты, подоконники с обеих сторон
  put(mid, yb - 0.03, w, 0.06, 0.06); put(s0 + 0.03, (ya + yb) / 2, 0.06, h, 0.06); put(s1 - 0.03, (ya + yb) / 2, 0.06, h, 0.06);
  for (let i = 1; i < mull; i++) put(s0 + w * i / mull, (ya + yb) / 2, 0.05, h, 0.04);
  if (h > 1.4 && !blocks) put(mid, ya + h * 0.72, w, 0.045, 0.04);
  put(mid, ya, w + 0.16, 0.05, 0.1, tm.sill, -0.1);
  put(mid, ya, w + 0.16, 0.05, 0.1, EXT.mats.has(neg) || EXT.mats.has(pos) ? tm.stone : tm.sill, 0.1);
  let m;
  if (blocks) m = texMat('gblock', TX.glassBlock(), 0xffffff, { emissive: 0xffc070, emissiveIntensity: 0.5, emissiveMap: TX.glassBlock() }, 0.5);
  else m = glassMat();
  const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m);
  if (blocks) p.geometry.attributes.uv.array.forEach((v, i, a) => { a[i] = v * (i % 2 ? h : w) / 0.5; });
  p.position.set(axis === 'x' ? mid : c, (ya + yb) / 2, axis === 'x' ? c : mid);
  if (axis === 'z') p.rotation.y = Math.PI / 2;
  if (blocks) { p.material.side = THREE.DoubleSide; p.userData.noMerge = true; }
  W.group.add(p);
  if (axis === 'x') addCollider(s0, ya, c - T / 2, s1, yb, c + T / 2);
  else addCollider(c - T / 2, ya, s0, c + T / 2, yb, s1);
}

// ---------- полы, потолки ----------
export function planeUV(w, h, s) {
  const g = new THREE.PlaneGeometry(w, h);
  const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w / s, uv.getY(i) * h / s);
  return g;
}
export function floorRect(x0, z0, x1, z1, y, mat, sound = 'concrete', { walk = true } = {}) {
  const w = x1 - x0, d = z1 - z0; if (w <= 0.001 || d <= 0.001) return;
  const m = new THREE.Mesh(planeUV(w, d, 2), mat);
  m.rotation.x = -Math.PI / 2; m.position.set((x0 + x1) / 2, y, (z0 + z1) / 2);
  W.group.add(m); W.solids.push([x0, y - 0.3, z0, x1, y, z1]);
  if (walk) W.surfaces.push({ minX: x0, maxX: x1, minZ: z0, maxZ: z1, y: () => y, sound });
  return m;
}
export function ceilRect(x0, z0, x1, z1, y, mat) {
  const w = x1 - x0, d = z1 - z0; if (w <= 0.001 || d <= 0.001) return;
  const m = new THREE.Mesh(planeUV(w, d, 2), mat);
  m.rotation.x = Math.PI / 2; m.position.set((x0 + x1) / 2, y, (z0 + z1) / 2);
  W.group.add(m); W.solids.push([x0, y, z0, x1, y + 0.3, z1]); return m;
}
export function surface(x0, z0, x1, z1, yFn, sound) {
  W.surfaces.push({ minX: Math.min(x0, x1), maxX: Math.max(x0, x1), minZ: Math.min(z0, z1), maxZ: Math.max(z0, z1), y: yFn, sound });
}
export function rectMinus(r, h) {
  const [x0, z0, x1, z1] = r, [hx0, hz0, hx1, hz1] = h;
  if (hx1 <= x0 || hx0 >= x1 || hz1 <= z0 || hz0 >= z1) return [r];
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
export function rectsMinus(rects, holes) { let out = rects; for (const h of holes) out = out.flatMap(r => rectMinus(r, h)); return out; }

// ---------- интерактив ----------
export function interact(obj, label, action, extra = {}) {
  obj.userData.interact = { label, action, ...extra };
  obj.traverse(o => { if (o !== obj) o.userData.owner = obj; });
  if (!W.interactables.includes(obj)) W.interactables.push(obj);
  return obj;
}
// метка для автопроверки: на чём держится предмет
export function mount(obj, kind, extra = {}) { W.qa.push({ obj, kind, ...extra }); return obj; }

// ---------- свет ----------
export function anchor(x, y, z, { color = 0xffb070, intensity = 4, distance = 7, flicker = 0, level = W.level, on = true, grid = true } = {}) {
  const a = { pos: new THREE.Vector3(x, y, z), color: new THREE.Color(color), intensity, distance, flicker, level, on, grid, phase: Math.random() * 100 };
  W.anchors.push(a); return a;
}
let glowBase;
export function glow(x, y, z, size, color = 0xffa860, opacity = 0.25, { rx = -Math.PI / 2, ry = 0, parent = null } = {}) {
  glowBase = glowBase || decalMat({ map: TX.glowTex(), blending: THREE.AdditiveBlending });
  const m = glowBase.clone(); m.color.set(color); m.opacity = opacity;
  const p = new THREE.Mesh(new THREE.PlaneGeometry(size, size), m); p.userData.noRay = true;
  p.position.set(x, y, z); p.rotation.order = 'YXZ'; p.rotation.set(rx, ry, 0);
  (parent || W.group).add(p); return p;
}

// ---------- зоны ----------
export function zone(x0, z0, x1, z1, name, opts = {}) {
  W.zones.push({ minX: Math.min(x0, x1), maxX: Math.max(x0, x1), minZ: Math.min(z0, z1), maxZ: Math.max(z0, z1), level: W.level, name, reverb: 0.25, wind: 0.02, buzz: 0, muffle: 3200, ...opts });
}
export function trigger(x0, z0, x1, z1, fn, { once = true, level = W.level } = {}) {
  W.triggers.push({ minX: Math.min(x0, x1), maxX: Math.max(x0, x1), minZ: Math.min(z0, z1), maxZ: Math.max(z0, z1), level, fn, once, done: false });
}

// ---------- двери ----------
export class Door {
  constructor(axis, c, at, { w = 1, h = 2.2, swing = 1, hinge = -1, mat = null, locked = false, name = 'дверь',
    lockedMsg = 'Заперто.', key = null, onOpen = null, onLocked = null, heavy = false, sound = true } = {}) {
    Object.assign(this, { axis, c, at, w, h, swing, locked, name, lockedMsg, key, onOpen, onLocked, heavy, sound });
    this.hinge = hinge; this.level = W.level; (W.doors = W.doors || []).push(this);
    this.open = false; this.angle = 0; this.target = 0;
    const y0 = W.level * FH;
    this.pivot = new THREE.Group();
    const hx = axis === 'x' ? at + hinge * w / 2 : c, hz = axis === 'x' ? c : at + hinge * w / 2;
    this.pivot.position.set(hx, y0, hz);
    if (axis === 'z') this.pivot.rotation.y = -Math.PI / 2;
    W.group.add(this.pivot);
    const panelMat = mat || texMat('doorwood', TX.wood('#4a2a18'), 0xffffff, {}, 1);
    const panel = new THREE.Mesh(boxGeo(w - 0.036, h - 0.017, 0.06, 1), panelMat); // полотно чуть заходит под наличник — без щелей на просвет
    panel.position.set(-hinge * (w / 2), 0.005 + (h - 0.017) / 2, 0);
    this.pivot.add(panel); this.panel = panel;
    const inset = col(0x2a160c);
    for (const s of [-1, 1]) for (const yy of [0.62, 1.55]) {
      const p = new THREE.Mesh(boxGeo(w * 0.62, yy < 1 ? 0.8 : 0.9, 0.02, 1), inset);
      p.position.set(-hinge * (w / 2), yy, s * 0.035); this.pivot.add(p);
    }
    const brass = col(0xc09a4a, { emissive: 0x2a1a00 });
    for (const s of [-1, 1]) {
      const k = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), brass);
      k.position.set(-hinge * (w - 0.1), 1.0, s * 0.06); this.pivot.add(k);
    }
    // наличник
    const fm = col(0x24160c);
    const TT = T / 2 + 0.04;
    if (axis === 'x') {
      block(at - w / 2 - 0.08, y0, c - TT, at - w / 2 + 0.02, y0 + h + 0.08, c + TT, fm, { collide: false });
      block(at + w / 2 - 0.02, y0, c - TT, at + w / 2 + 0.08, y0 + h + 0.08, c + TT, fm, { collide: false });
      block(at - w / 2 + 0.02, y0 + h - 0.02, c - TT, at + w / 2 - 0.02, y0 + h + 0.08, c + TT, fm, { collide: false });
    } else {
      block(c - TT, y0, at - w / 2 - 0.08, c + TT, y0 + h + 0.08, at - w / 2 + 0.02, fm, { collide: false });
      block(c - TT, y0, at + w / 2 - 0.02, c + TT, y0 + h + 0.08, at + w / 2 + 0.08, fm, { collide: false });
      block(c - TT, y0 + h - 0.02, at - w / 2 + 0.02, c + TT, y0 + h + 0.08, at + w / 2 - 0.02, fm, { collide: false });
    }
    this.collider = axis === 'x' ? addCollider(at - w / 2, y0, c - 0.1, at + w / 2, y0 + h, c + 0.1)
      : addCollider(c - 0.1, y0, at - w / 2, c + 0.1, y0 + h, at + w / 2);
    this.hingeSign = hinge; this.pivot.userData.owner = panel; this.pivot.userData.isDoor = true;
    interact(panel, () => this.locked ? `${cap(this.name)}: заперто` : (this.open ? 'Закрыть: ' : 'Открыть: ') + this.name, () => this.toggle());
    W.animated.push(dt => this.update(dt));
  }
  toggle(force) {
    if (this.locked) {
      if (this.key && G.hasItem && G.hasItem(this.key)) { this.locked = false; G.toast(`Ключ подошёл: ${this.name}`); SFX.sfxClick(); }
      else { SFX.sfxLocked(); if (this.onLocked) this.onLocked(this); else G.toast(this.lockedMsg); return; }
    }
    this.open = force !== undefined ? force : !this.open;
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
  const t = texLoader.load(W.imageUrls[id]); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return (picTex[id] = t);
}
// вместо мемов и чертежей — самодельные орнаменты
let ornN = 0;
export function ornament() {
  const o = TX.ornamentImage(ornN); const id = 'orn' + (ornN++);
  W.imageUrls[id] = o.url;
  return { id, group: 'ornament', w: o.w, h: o.h, title: o.title, author: '', cap: { title: o.title, text: o.text } };
}
export function takeImage(groups = []) {
  if (groups.includes('plans') || groups.includes('ornament')) return ornament();
  for (const g of groups) {
    const im = W.images.find(i => i.group === g && !W.usedImages.has(i.id));
    if (im) { W.usedImages.add(im.id); return im; }
  }
  const im = W.images.find(i => !W.usedImages.has(i.id) && i.group !== 'plans');
  if (im) { W.usedImages.add(im.id); return im; }
  return ornament();
}
export function caption(im) { return im.cap || CAPTIONS[im.id] || null; }
// Картина в раме: (x,y,z) — центр на поверхности стены; ry — куда смотрит картина
export function picture(groups, x, y, z, ry, size = 0.9, { frame = 'dark', parent = null, lean = 0, qa = true } = {}) {
  const im = Array.isArray(groups) ? takeImage(groups) : groups; if (!im) return null;
  const asp = im.w / im.h;
  const pw = asp >= 1 ? size : size * asp, ph = asp >= 1 ? size / asp : size;
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.order = 'YXZ'; g.rotation.y = ry; g.rotation.x = lean;
  const fc = { dark: 0x1e120a, gold: 0x8a6a2a, white: 0xc8c0b0, black: 0x0c0a0a, pink: 0x9a4a6a, chrome: 0x9a9fa5 }[frame] || 0x1e120a;
  const fm = col(fc, frame === 'gold' ? { emissive: 0x1a1000 } : {});
  const fw = 0.07;
  // рама из четырёх планок + задник
  const bar = (w, h, x, y) => { const b = new THREE.Mesh(boxGeo(w, h, 0.05, 1), fm); b.position.set(x, y, 0.025); g.add(b); };
  bar(pw + fw * 2, fw, 0, ph / 2 + fw / 2); bar(pw + fw * 2, fw, 0, -ph / 2 - fw / 2); bar(fw, ph, -pw / 2 - fw / 2, 0); bar(fw, ph, pw / 2 + fw / 2, 0);
  const back = new THREE.Mesh(boxGeo(pw, ph, 0.016, 1), col(0x0e0806)); back.position.z = 0.008; g.add(back);
  const mat = new THREE.MeshLambertMaterial({ map: pictureTexture(im.id), emissive: 0xffffff, emissiveMap: pictureTexture(im.id), emissiveIntensity: 0.18 });
  const p = new THREE.Mesh(new THREE.PlaneGeometry(pw, ph), mat); p.position.z = 0.032; p.userData.noMerge = true; g.add(p);
  (parent || W.group).add(g);
  g.userData.img = im; g.userData.size = [pw + fw * 2, ph + fw * 2];
  interact(g, 'Рассмотреть картину', () => G.showPicture(im));
  if (qa) mount(g, 'wall', { w: pw + fw * 2, h: ph + fw * 2, what: 'картина ' + im.id });
  return g;
}

// ---------- оптимизация: слияние статичной геометрии с мировыми UV ----------
const _n = new THREE.Vector3();
function applyWorldUV(geo, scale) {
  const pos = geo.attributes.position, nor = geo.attributes.normal, uv = geo.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    _n.fromBufferAttribute(nor, i);
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const ax = Math.abs(_n.x), ay = Math.abs(_n.y), az = Math.abs(_n.z);
    let u, v;
    if (ay >= ax && ay >= az) { u = x; v = _n.y > 0 ? -z : z; }
    else if (ax >= az) { u = _n.x > 0 ? -z : z; v = y; }
    else { u = _n.z > 0 ? x : -x; v = y; }
    uv.setXY(i, u / scale, v / scale);
  }
}
export function optimizeLevels() {
  let before = 0, after = 0;
  const targets = [];
  for (const lv of [...Object.values(W.levels), W.exterior].filter(Boolean)) { targets.push([lv, true]); lv.traverse(o => { if (o !== lv && o.isGroup && o.children.length > 1) targets.push([o, false]); }); }
  for (const [g, isLevel] of targets) {
    const buckets = new Map();
    const victims = [];
    for (const m of g.children) {
      if (!m.isMesh || m.userData.interact || m.userData.dynamic || m.userData.noMerge || m.userData.hit || m.children.length) continue;
      if (isLevel && m.userData.owner) continue;
      const mats = Array.isArray(m.material) ? m.material : [m.material];
      if (mats.some(x => x.transparent || x.blending !== THREE.NormalBlending)) continue;
      m.updateMatrix();
      const geo = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone();
      geo.applyMatrix4(m.matrix);
      const parts = [];
      const groups = Array.isArray(m.material) ? m.geometry.groups : [{ start: 0, count: geo.attributes.position.count, materialIndex: -1 }];
      for (const gr of groups) {
        const sub = new THREE.BufferGeometry();
        for (const name of ['position', 'normal', 'uv']) {
          const a = geo.attributes[name]; if (!a) continue;
          sub.setAttribute(name, new THREE.BufferAttribute(a.array.slice(gr.start * a.itemSize, (gr.start + gr.count) * a.itemSize), a.itemSize));
        }
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
      const merged = mergeGeometries(geos, false);
      if (!merged) continue;
      merged.computeBoundingSphere();
      const mm = new THREE.Mesh(merged, mat); g.add(mm); after++;
      if (!isLevel) mm.userData.owner = g.userData.owner || (g.userData.interact ? g : null);
    }
  }
  return [before, after];
}
