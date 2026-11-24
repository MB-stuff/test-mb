// ЭЛИЗИУМ · предметы
// Каждый предмет — группа: (x, z) на полу текущего этажа, ry — поворот; локальная +Z — «лицо» предмета
// (у стула — куда смотрит сидящий, у телевизора — экран). Каждый помечает, на чём держится (mount) —
// по этим меткам работает __qa(). Коллайдер — solid(); то, на что можно что-то поставить, хранит userData.top.
import * as THREE from 'three';
import { W, G, CFG, Y, grp, hitBox, wp, box, cyl, plane, col, texMat, emis, basic, interact, mount, anchor, glow, addCollider, zoneAt } from './world.js';
import { lampVis } from './lights.js';
import { soundSpot } from './audio.js';
import * as S from './audio.js';
import * as TX from './textures.js';
import { sit as sitDown } from './player.js';

const P = Math.PI;
const B = (g, w, h, d, m, x, y, z) => box(w, h, d, m, x, y, z, { parent: g });
const C = (g, rt, rb, h, seg, m, x, y, z) => cyl(rt, rb, h, seg, m, x, y, z, { parent: g });
export const pick = a => a[Math.floor(Math.random() * a.length)];
const floor = g => mount(g, 'floor'), onTable = g => mount(g, 'table'), onWall = (g, w, h, dy = 0) => mount(g, 'wall', { w, h, dy });
// коллайдер предмета по его размеру в локальных осях (учитывает поворот на 90°)
export function solid(g, w, d, h, ox = 0, oz = 0) {
  const r = Math.round(g.rotation.y / (P / 2)) & 1, c = Math.cos(g.rotation.y), s = Math.sin(g.rotation.y);
  const cx = g.position.x + ox * c + oz * s, cz = g.position.z - ox * s + oz * c, hw = (r ? d : w) / 2, hd = (r ? w : d) / 2;
  return addCollider(cx - hw, g.position.y, cz - hd, cx + hw, g.position.y + h, cz + hd, g);
}
export const top = (g, lx = 0, lz = 0) => wp(g, lx, g.userData.top || 0.75, lz).toArray();
// сесть: камера в точку над сиденьем, взгляд — туда, куда смотрит предмет
export function seat(g, label, { eye = 1.15, fwd = 0.05, lie = false } = {}) {
  interact(g, label, () => { const p = wp(g, 0, eye, fwd); S.sfxSwitch(); sitDown({ x: p.x, y: p.y, z: p.z, yaw: g.rotation.y + P, lie }, () => G.hint && G.hint('Пробел / движение — встать', false, true)); });
}

// ---------- мебель ----------
export function chair(x, z, ry, { color = 0x4a2a1a, seatColor = 0x6a2026, y = Y() } = {}) {
  const g = grp(x, z, ry, y), w = col(color);
  B(g, 0.46, 0.08, 0.46, col(seatColor), 0, 0.44, 0); B(g, 0.46, 0.55, 0.06, w, 0, 0.5, -0.21);
  for (const [a, b] of [[-0.2, -0.2], [0.2, -0.2], [-0.2, 0.2], [0.2, 0.2]]) B(g, 0.05, 0.44, 0.05, w, a, 0, b);
  seat(g, 'Сесть на стул'); solid(g, 0.5, 0.5, 0.9); floor(g); return g;
}
export function armchair(x, z, ry, color = 0x5a2a2a) {
  const g = grp(x, z, ry), m = col(color);
  B(g, 0.85, 0.3, 0.8, m, 0, 0.12, 0); B(g, 0.85, 0.65, 0.2, m, 0, 0.4, -0.32); B(g, 0.16, 0.3, 0.75, m, -0.38, 0.42, 0); B(g, 0.16, 0.3, 0.75, m, 0.38, 0.42, 0);
  seat(g, 'Сесть в кресло', { eye: 1.05 }); solid(g, 0.9, 0.85, 0.9); floor(g); return g;
}
export function table(x, z, { w = 1.2, d = 0.8, h = 0.75, color = '#3a2214', round = false, ry = 0, y = Y() } = {}) {
  const g = grp(x, z, ry, y), m = texMat('w' + color, TX.wood(color), 0xffffff, {}, 1);
  if (round) { C(g, w / 2, w / 2, 0.04, 20, m, 0, h - 0.04, 0); C(g, 0.05, 0.08, h - 0.04, 8, m, 0, 0, 0); C(g, 0.25, 0.28, 0.03, 12, m, 0, 0, 0); }
  else { B(g, w, 0.04, d, m, 0, h - 0.04, 0); for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) B(g, 0.05, h - 0.04, 0.05, m, a * (w / 2 - 0.06), 0, b * (d / 2 - 0.06)); }
  solid(g, w, round ? w : d, h); g.userData.top = h; floor(g); return g;
}
export function shelf(x, z, ry, { w = 1.8, h = 2.2, d = 0.4, color = 0x3a2214, books = true } = {}) {
  const g = grp(x, z, ry), m = col(color), n = Math.max(4, Math.floor((h - 0.1) / 0.4) + 1); let seed = Math.round(x * 13 + z * 7);
  const rr = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
  for (const a of [-w / 2, w / 2]) B(g, 0.04, h, d, m, a, 0, 0); B(g, w, 0.04, d, m, 0, h - 0.04, 0);
  for (let i = 0; i < n; i++) {
    const yy = 0.1 + i * (h - 0.25) / (n - 1); B(g, w, 0.03, d, m, 0, yy, 0);
    if (i === n - 1 || !books) continue;
    const gap = (h - 0.25) / (n - 1) - 0.05, nb = Math.floor((w - 0.1) / 0.062);
    for (let t = 0; t < nb; t++) B(g, 0.055, Math.min(gap, 0.24 + rr() * 0.12), d * 0.8, col([0x8a2a2a, 0x2a4a8a, 0x9a7a2a, 0x3a7a3a, 0x9a4a2a, 0x6a2a6a, 0xc8b890][(t * 3 + i) % 7], { emissive: 0x0a0806 }), -nb * 0.031 + 0.031 + t * 0.062, yy + 0.03, 0);
  }
  if (books) interact(g, 'Взять книгу с полки', () => { S.sfxPaper(); G.onBook ? G.onBook() : G.toast('Книга без названия. Все страницы пустые, кроме последней.'); });
  solid(g, w, d, h); floor(g); return g;
}
export function rug(x, z, w, d, tex, { y = Y(), whole = false } = {}) {
  const mat = texMat('rug' + tex.uuid, tex, 0xffffff, { polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2 }, 0);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat);
  if (!whole) m.geometry.attributes.uv.array.forEach((v, i, a) => { a[i] = v * (i % 2 ? d : w) / 1.6; });
  m.rotation.x = -P / 2; m.position.set(x, y + 0.01, z); m.userData.noMerge = true; W.group.add(m); return m;
}
export function plant(x, z, { s = 1, y = Y() } = {}) {
  const g = grp(x, z, Math.random() * 6, y), lm = col(0x2a4a24, { flatShading: true });
  C(g, 0.22 * s, 0.16 * s, 0.4 * s, 8, col(0x5a3020), 0, 0, 0);
  for (let i = 0; i < 7; i++) { const l = new THREE.Mesh(new THREE.ConeGeometry(0.09 * s, 0.7 * s, 4), lm); const a = i / 7 * P * 2; l.position.set(Math.cos(a) * 0.12 * s, 0.7 * s, Math.sin(a) * 0.12 * s); l.rotation.set(Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5); g.add(l); }
  hitBox(g, 0.5 * s, 1.1 * s, 0.5 * s); interact(g, 'Потрогать листья', () => G.toast(pick(['Листья пластиковые. Но земля в горшке влажная.', 'На листе — пыль. Её здесь давно не вытирали.'])));
  solid(g, 0.45 * s, 0.45 * s, 0.4 * s); floor(g); return g;
}

// ---------- свет ----------
// потолочная лампа: 'dome' — плафон, 'pendant' — подвес, 'tube' — люминесцентная трубка (гудит)
export function ceilingLamp(x, z, { y = Y() + CFG.CEIL, color = 0xffb878, intensity = 3, distance = 7, flicker = 0, on = true, kind = 'dome' } = {}) {
  const g = grp(x, z, 0, y), bulb = emis(color, 1), bulbOff = col(0x8a8478), n0 = g.children.length;
  if (kind === 'tube') { box(1.2, 0.05, 0.12, bulb, 0, -0.08, 0, { parent: g }); B(g, 1.3, 0.04, 0.2, col(0x777777), 0, -0.04, 0); }
  else if (kind === 'pendant') { C(g, 0.01, 0.01, 0.7, 4, col(0x111111), 0, -0.7, 0); C(g, 0.06, 0.28, 0.2, 10, col(0x2a3a22, { side: THREE.DoubleSide }), 0, -0.9, 0); C(g, 0.08, 0.08, 0.06, 8, bulb, 0, -0.92, 0); }
  else { C(g, 0.25, 0.3, 0.1, 12, bulb, 0, -0.1, 0); C(g, 0.32, 0.32, 0.02, 12, col(0x6a5020), 0, -0.02, 0); }
  const a = anchor(x, kind === 'pendant' ? y - 1 : y - 0.25, z, { color, intensity, distance, flicker, on });
  a.hum = kind === 'tube'; a.switchable = true;
  lampVis(a, g.children.slice(n0).filter(m => m.material === bulb), bulb, bulbOff);
  mount(g, 'ceiling'); return a;
}
const shadeMat = (c, lit) => lit ? col(c, { emissive: 0xffb060, emissiveIntensity: 0.9, side: THREE.DoubleSide }) : col(c, { side: THREE.DoubleSide });
export function tableLamp(x, y, z, { shade = 0x9a7a3a, on = true } = {}) {
  const g = grp(x, z, 0, y);
  C(g, 0.08, 0.1, 0.04, 10, col(0x2a2018), 0, 0, 0); C(g, 0.015, 0.015, 0.3, 6, col(0x9a8040), 0, 0.04, 0);
  const sh = C(g, 0.1, 0.17, 0.2, 10, shadeMat(shade, true), 0, 0.3, 0);
  const a = anchor(x, y + 0.42, z, { color: 0xffa860, intensity: 2.2, distance: 4.5, on });
  lampVis(a, [sh], shadeMat(shade, true), shadeMat(shade, false));
  hitBox(g, 0.36, 0.5, 0.36); interact(g, () => a.on ? 'Выключить лампу' : 'Включить лампу', () => { a.setOn(!a.on); S.sfxClick(); });
  onTable(g); return g;
}
export function floorLamp(x, z, { on = true } = {}) {
  const g = grp(x, z);
  C(g, 0.16, 0.18, 0.04, 10, col(0x1a1410), 0, 0, 0); C(g, 0.02, 0.02, 1.5, 6, col(0x7a6a3a), 0, 0.04, 0);
  const sh = C(g, 0.16, 0.26, 0.32, 10, shadeMat(0xa8844a, true), 0, 1.45, 0);
  const a = anchor(x, Y() + 1.55, z, { intensity: 3, distance: 6, on });
  lampVis(a, [sh], shadeMat(0xa8844a, true), shadeMat(0xa8844a, false));
  interact(g, () => a.on ? 'Выключить торшер' : 'Включить торшер', () => { a.setOn(!a.on); S.sfxClick(); });
  solid(g, 0.35, 0.35, 1.8); floor(g); return g;
}
// бра: (x, z) — точка на поверхности стены, ry — нормаль стены. Ореол прячется вместе с лампой (флаг off!)
export function sconce(x, y, z, ry, { glowSize = 1.3 } = {}) {
  const g = grp(x, z, ry, y);
  B(g, 0.12, 0.2, 0.04, col(0x8a6a2a), 0, -0.1, 0.02); B(g, 0.03, 0.03, 0.1, col(0x8a6a2a), 0, -0.02, 0.07);
  const onM = col(0xd8b080, { emissive: 0xffa050, emissiveIntensity: 0.8 }), offM = col(0x8a7a60);
  const shade = C(g, 0.06, 0.1, 0.16, 8, onM, 0, -0.06, 0.13);
  const gl = glow(x + Math.sin(ry) * 0.01, y + 0.05, z + Math.cos(ry) * 0.01, glowSize, 0xffa050, 0.25, { rx: 0, ry });
  onWall(g, 0.12, 0.2);
  const a = anchor(x + Math.sin(ry) * 0.3, y, z + Math.cos(ry) * 0.3, { color: 0xffa050, intensity: 1.6, distance: 4 }); a.switchable = true;
  return lampVis(a, [shade], onM, offM, lit => { gl.visible = lit; gl.userData.off = !lit; });
}

// ---------- шторы ----------
// Шторы у окна: axis — ось стены, c — ВНУТРЕННЯЯ грань стены (ось ± T/2), s0..s1 — проём, inside — сторона комнаты (+1/−1).
// Висят в 16 см от стены и заходят за край окна на 45 см: косые лучи низкого солнца не проскальзывают
// в щель. Задёрнутые: гасят пятно солнца под окном и затемняют рассеянный свет комнаты (zone.dark).
export function curtains(axis, c, s0, s1, y0, inside, color = 0x6a1a24) {
  const m = col(color, { side: THREE.DoubleSide }), panels = [], HANG = 0.16, OVER = 0.45;
  const mk = (from, dir) => {
    const g = new THREE.Group(); W.group.add(g);
    for (let i = 0; i < 5; i++) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2.6, 0.05), m); p.position.set(dir * (i * 0.1 + 0.05), 1.3, (i % 2) * 0.05); g.add(p); }
    if (axis === 'x') g.position.set(from, y0 + 0.35, c + inside * HANG); else { g.position.set(c + inside * HANG, y0 + 0.35, from); g.rotation.y = P / 2; }
    panels.push(g);
  };
  mk(s0 - OVER, 1); mk(s1 + OVER, -1);
  axis === 'x' ? box(s1 - s0 + OVER * 2 + 0.2, 0.04, 0.04, col(0x5a4020), (s0 + s1) / 2, y0 + 2.96, c + inside * HANG) : box(0.04, 0.04, s1 - s0 + OVER * 2 + 0.2, col(0x5a4020), c + inside * HANG, y0 + 2.96, (s0 + s1) / 2);
  const span = (s1 - s0) / 2 + OVER, lvl = W.level, me = { closed: false, zone: undefined, patches: null };
  (W.curtainList = W.curtainList || []).push(me);
  me.resolve = () => {
    if (me.patches) return;
    me.patches = (W.windowPatches || []).filter(p => p.level === lvl && p.win.axis === axis && Math.abs(p.win.c - c) < CFG.T / 2 + 0.05 && (p.win.s0 + p.win.s1) / 2 > s0 - 0.1 && (p.win.s0 + p.win.s1) / 2 < s1 + 0.1);
    me.zone = zoneAt(lvl, axis === 'x' ? (s0 + s1) / 2 : c + inside, axis === 'x' ? c + inside : (s0 + s1) / 2);
  };
  let closed = false;
  for (const g of panels) interact(g, () => closed ? 'Раздвинуть шторы' : 'Задёрнуть шторы', () => {
    closed = !closed; S.sfxCurtain(); for (const g of panels) g.scale.x = closed ? span / 0.5 : 1;
    me.resolve(); me.closed = closed;
    for (const p of me.patches) { p.curtained = closed; const off = closed || W.realSun; p.mesh.userData.off = off; p.mesh.visible = !off; }
    if (me.zone) { const all = W.curtainList.filter(o => { o.resolve(); return o.zone === me.zone; }); me.zone.dark = all.filter(o => o.closed).length / all.length; }
    W.shadowDirty = true;
  });
  return panels;
}

// ---------- бумага, таблички, картины ----------
export function note(x, y, z, ry, title, text, { flat = true, story = null, color = 0xe0d4b4 } = {}) {
  const g = grp(x, z, ry, y);
  const pm = col(color, { emissive: 0x2a2620, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2 });
  plane(0.22, 0.29, pm, 0, flat ? 0.004 : 0, flat ? 0 : 0.01, flat ? -P / 2 : 0, 0, { parent: g }).userData.noMerge = true;
  hitBox(g, 0.34, flat ? 0.06 : 0.36, flat ? 0.4 : 0.08, flat ? 0 : -0.18);
  interact(g, 'Прочитать: ' + title, () => { S.sfxPaper(); G.note(title, text, story); });
  mount(g, flat ? 'table' : 'wall', { w: 0.22, h: 0.29 }); return g;
}
// табличка на стене: (x, y, z) — центр на поверхности стены, ry — нормаль
export function sign(text, x, y, z, ry, { w = 0.6, h = 0.22, bg = '#1a120c', fg = '#e0c890', glowing = false, sub = false } = {}) {
  const tex = TX.signTex(text, { aspect: w / h, bg, fg, sub });
  const key = text.replace(/\n/g, '|') + bg + fg + w; // перевод строки в имени материала ломает шейдер — заменяем
  const m = glowing ? basic('sign' + key, { map: tex }) : texMat('sign' + key, tex, 0xffffff, { emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.2 }, 0);
  const g = grp(x, z, ry, y);
  B(g, w + 0.03, h + 0.03, 0.016, col(0x140c08), 0, -h / 2 - 0.015, 0.008);
  plane(w, h, m, 0, 0, 0.03, 0, 0, { parent: g }).userData.noMerge = true; // 14 мм от подложки: не мерцает
  onWall(g, w, h); return g;
}
// картина: canvas или текстура в раме; картина НЕ светится сама — в тёмной комнате она тёмная
export function picture(src, x, y, z, ry, size = 0.9, { frame = 0x8a6a2a, title = 'Картина', text = '' } = {}) {
  const tex = src.isTexture ? src : TX.toTex(src, { repeat: false }); const img = tex.image || {};
  const asp = (img.width || 4) / (img.height || 3), pw = asp >= 1 ? size : size * asp, ph = asp >= 1 ? size / asp : size, fw = 0.07;
  const g = grp(x, z, ry, y), fm = col(frame, { emissive: 0x1a1000 });
  for (const [w, h, px, py] of [[pw + fw * 2, fw, 0, ph / 2 + fw / 2], [pw + fw * 2, fw, 0, -ph / 2 - fw / 2], [fw, ph, -pw / 2 - fw / 2, 0], [fw, ph, pw / 2 + fw / 2, 0]]) { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.05), fm); b.position.set(px, py, 0.025); g.add(b); }
  const back = new THREE.Mesh(new THREE.BoxGeometry(pw, ph, 0.016), col(0x0e0806)); back.position.z = 0.008; g.add(back);
  const p = new THREE.Mesh(new THREE.PlaneGeometry(pw, ph), new THREE.MeshLambertMaterial({ map: tex })); p.position.z = 0.032; p.userData.noMerge = true; g.add(p);
  interact(g, 'Рассмотреть картину', () => G.note(title, text || 'Подписи нет.'));
  mount(g, 'wall', { w: pw + fw * 2, h: ph + fw * 2, what: 'картина ' + title }); return g;
}

// ---------- техника со звуком ----------
// Звук с радиусом: soundSpot регистрируется в W.sounds, громкость считает игра по расстоянию и стенам.
export function tv(x, y, z, ry, { on = false } = {}) {
  const g = grp(x, z, ry, y);
  B(g, 0.6, 0.48, 0.36, col(0x24201c), 0, 0, 0.02); B(g, 0.4, 0.32, 0.14, col(0x1a1612), 0, 0.08, -0.23);
  const offMat = col(0x0a120e, { emissive: 0x020604 }), onMat = basic('static', { map: staticTex() });
  const sc = plane(0.48, 0.36, on ? onMat : offMat, 0, 0.24, 0.215, 0, 0, { parent: g }); sc.userData.noMerge = true;
  const a = anchor(0, 0, 0, { color: 0x9ab8ff, intensity: 1.2, distance: 3, on, grid: true }); a.pos.copy(wp(g, 0, 0.25, 0.6));
  const snd = soundSpot('static', wp(g, 0, 0.3, 0.3), 0.035, 5, { level: W.level }); snd.active = on; W.sounds.push(snd);
  let isOn = on;
  interact(g, () => isOn ? 'Выключить телевизор' : 'Включить телевизор', () => { S.sfxClick(); isOn = !isOn; sc.material = isOn ? onMat : offMat; a.on = isOn; snd.active = isOn; });
  g.userData.top = 0.48; mount(g, 'support'); return g;
}
let staticCanvas = null, staticTexture = null;
export function staticTex() {
  if (staticTexture) return staticTexture;
  staticCanvas = document.createElement('canvas'); staticCanvas.width = 64; staticCanvas.height = 48;
  staticTexture = new THREE.CanvasTexture(staticCanvas); staticTexture.magFilter = THREE.NearestFilter;
  const ctx = staticCanvas.getContext('2d'), img = ctx.createImageData(64, 48);
  const upd = () => { for (let i = 0; i < img.data.length; i += 4) { const v = Math.random() * 200; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255; } ctx.putImageData(img, 0, 0); staticTexture.needsUpdate = true; };
  let t = 0; const f = dt => { t -= dt; if (t < 0) { t = 0.07; upd(); } }; f.always = true; W.animated.push(f); upd();
  return staticTexture;
}
export function sink(x, z, ry) {
  const g = grp(x, z, ry), por = col(0xd8d4c8);
  B(g, 0.6, 0.15, 0.45, por, 0, 0.75, 0); C(g, 0.06, 0.08, 0.75, 8, por, 0, 0, -0.05); B(g, 0.03, 0.15, 0.03, col(0xb8b8b8), 0, 0.9, -0.18);
  const snd = soundSpot('water', wp(g, 0, 0.9, 0), 0.12, 6, { level: W.level }); W.sounds.push(snd);
  interact(g, () => snd.active ? 'Закрыть кран' : 'Открыть кран', () => { S.sfxClick(); snd.active = !snd.active; });
  solid(g, 0.6, 0.45, 0.9); floor(g); return g;
}
