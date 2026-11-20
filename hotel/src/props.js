// Мебель и предметы (низкополигональные), с интерактивом.
import * as THREE from 'three';
import { W, G, FH, box, cyl, plane, col, texMat, emis, basic, interact, anchor, glow, addCollider, boxGeo, picture, cap } from './engine.js';
import * as TX from './textures.js';
import * as S from './audio.js';

const Y = () => W.level * FH;
const P = Math.PI;

export function grp(x, z, ry = 0, y = Y()) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry; W.group.add(g); return g;
}
// коллайдер по габаритам (w — по локальному X, d — по Z), учитывая поворот на 90°
export function solid(g, w, d, h, ox = 0, oz = 0) {
  const r = Math.round(g.rotation.y / (P / 2)) & 1;
  const c = Math.cos(g.rotation.y), s = Math.sin(g.rotation.y);
  const cx = g.position.x + ox * c + oz * s, cz = g.position.z - ox * s + oz * c;
  const hw = (r ? d : w) / 2, hd = (r ? w : d) / 2;
  return addCollider(cx - hw, g.position.y, cz - hd, cx + hw, g.position.y + h, cz + hd, g);
}
const B = (g, w, h, d, mat, x, y, z) => box(w, h, d, mat, x, y, z, { parent: g });
const C = (g, rt, rb, h, seg, mat, x, y, z) => cyl(rt, rb, h, seg, mat, x, y, z, { parent: g });

// Невидимый хитбокс, чтобы мелкие предметы было легко «поймать» прицелом
const hitMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false });
export function hitBox(g, w, h, d, y = 0) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), hitMat); m.position.y = y + h / 2; m.userData.hit = true; g.add(m); return m; }
// Мировая точка из локальной точки группы
function wp(g, x, y, z) { return new THREE.Vector3(x, y, z).applyEuler(g.rotation).add(g.position); }

// Сесть: камера на высоте eye, взгляд по направлению группы (+Z локально)
function seat(g, label, { eye = 1.15, fwd = 0.05, lie = false, yawOff = 0, onSit = null } = {}) {
  interact(g, label, () => {
    const p = wp(g, 0, 0, fwd);
    G.sit({ x: p.x, y: g.position.y + eye, z: p.z, yaw: g.rotation.y + P + yawOff, lie });
    if (onSit) onSit();
  });
}

// ---------- сиденья ----------
export function chair(x, z, ry, { color = 0x3a2418, seatColor = 0x4a1e22, sit = true } = {}) {
  const g = grp(x, z, ry); const w = col(color), s = col(seatColor);
  B(g, 0.46, 0.08, 0.46, s, 0, 0.44, 0);
  B(g, 0.46, 0.55, 0.06, w, 0, 0.5, -0.21);
  for (const [a, b] of [[-0.2, -0.2], [0.2, -0.2], [-0.2, 0.2], [0.2, 0.2]]) B(g, 0.05, 0.44, 0.05, w, a, 0, b);
  if (sit) seat(g, 'Сесть на стул', { eye: 1.15 });
  solid(g, 0.5, 0.5, 0.9);
  return g;
}
export function stool(x, z, { color = 0x7a1a2a } = {}) {
  const g = grp(x, z, 0);
  C(g, 0.2, 0.2, 0.08, 8, col(color), 0, 0.72, 0); C(g, 0.03, 0.05, 0.72, 5, col(0x8a8a8a), 0, 0, 0);
  C(g, 0.2, 0.2, 0.02, 8, col(0x555555), 0, 0, 0);
  seat(g, 'Сесть на табурет', { eye: 1.42, fwd: 0 }); solid(g, 0.4, 0.4, 0.8); return g;
}
export function armchair(x, z, ry, color = 0x3a1a2a) {
  const g = grp(x, z, ry); const m = col(color), d = col(0x1a0e0a);
  B(g, 0.85, 0.3, 0.8, m, 0, 0.12, 0); B(g, 0.85, 0.65, 0.2, m, 0, 0.4, -0.32);
  B(g, 0.16, 0.3, 0.75, m, -0.38, 0.42, 0); B(g, 0.16, 0.3, 0.75, m, 0.38, 0.42, 0);
  for (const [a, b] of [[-0.35, -0.3], [0.35, -0.3], [-0.35, 0.3], [0.35, 0.3]]) B(g, 0.06, 0.12, 0.06, d, a, 0, b);
  seat(g, 'Сесть в кресло', { eye: 1.05 }); solid(g, 0.9, 0.85, 0.9); return g;
}
export function sofa(x, z, ry, color = 0x23303a, len = 2.1) {
  const g = grp(x, z, ry); const m = col(color), d = col(0x120a08);
  B(g, len, 0.32, 0.9, m, 0, 0.1, 0); B(g, len, 0.7, 0.22, m, 0, 0.35, -0.36);
  B(g, 0.2, 0.3, 0.9, m, -len / 2 + 0.1, 0.42, 0); B(g, 0.2, 0.3, 0.9, m, len / 2 - 0.1, 0.42, 0);
  const cu = col(new THREE.Color(color).multiplyScalar(1.25).getHex());
  for (let i = 0; i < 2; i++) B(g, len / 2 - 0.25, 0.1, 0.62, cu, (i - 0.5) * (len / 2 - 0.15), 0.42, 0.06);
  for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) B(g, 0.06, 0.1, 0.06, d, a * (len / 2 - 0.08), 0, b * 0.38);
  seat(g, 'Сесть на диван', { eye: 1.08 }); solid(g, len, 0.95, 0.9); return g;
}
export function bed(x, z, ry, { double = true, color = 0x5a1e2a, frame = 0x2a170e, msg = null } = {}) {
  const g = grp(x, z, ry); const w = double ? 1.7 : 1.0, L = 2.05;
  const f = texMat('bedwood' + frame, TX.wood('#' + new THREE.Color(frame).getHexString()), 0xffffff);
  B(g, w, 0.32, L, f, 0, 0, 0);
  B(g, w + 0.06, 1.05, 0.08, f, 0, 0, -L / 2); // изголовье
  B(g, w - 0.06, 0.2, L - 0.1, col(0xc9bfa8), 0, 0.32, 0.02);
  B(g, w - 0.02, 0.06, L * 0.62, col(color), 0, 0.5, L * 0.18);
  B(g, w + 0.02, 0.32, 0.03, col(color), 0, 0.22, L / 2 - 0.03 + 0.01);
  const pc = col(0xd8d0c0);
  if (double) { B(g, 0.6, 0.14, 0.36, pc, -0.4, 0.52, -L / 2 + 0.3); B(g, 0.6, 0.14, 0.36, pc, 0.4, 0.52, -L / 2 + 0.3); }
  else B(g, 0.65, 0.14, 0.36, pc, 0, 0.52, -L / 2 + 0.3);
  interact(g, 'Лечь на кровать', () => {
    const p = wp(g, 0, 0, -0.25);
    G.sit({ x: p.x, y: g.position.y + 0.85, z: p.z, yaw: g.rotation.y + P, lie: true });
    if (msg) setTimeout(() => G.toast(msg), 1200);
  });
  solid(g, w + 0.05, L, 0.6);
  return g;
}
export function bunk(x, z, ry) {
  const g = bed(x, z, ry, { double: false, color: 0x2a4a6a });
  const f = col(0x6a6a70);
  B(g, 1.0, 0.12, 2.05, f, 0, 1.4, 0); B(g, 0.9, 0.15, 1.9, col(0xc9bfa8), 0, 1.52, 0); B(g, 0.9, 0.05, 1.2, col(0x6a2a4a), 0, 1.67, 0.3);
  for (const [a, b] of [[-0.48, -1], [0.48, -1], [-0.48, 1], [0.48, 1]]) B(g, 0.05, 1.9, 0.05, f, a, 0, b);
  return g;
}

// ---------- столы и тумбы ----------
export function table(x, z, { w = 1.2, d = 0.8, h = 0.75, color = 0x2a1a10, round = false, y = Y() } = {}) {
  const g = grp(x, z, 0, y); const m = texMat('tbl' + color, TX.wood('#' + new THREE.Color(color).getHexString()), 0xffffff);
  if (round) { C(g, w / 2, w / 2, 0.05, 12, m, 0, h - 0.05, 0); C(g, 0.05, 0.06, h - 0.05, 6, col(0x111111), 0, 0, 0); C(g, 0.25, 0.25, 0.03, 8, col(0x111111), 0, 0, 0); }
  else { B(g, w, 0.05, d, m, 0, h - 0.05, 0); for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) B(g, 0.05, h - 0.05, 0.05, m, a * (w / 2 - 0.05), 0, b * (d / 2 - 0.05)); }
  solid(g, w, round ? w : d, h); g.userData.top = h; return g;
}
export function nightstand(x, z, ry, { lamp = true, phone = null } = {}) {
  const g = grp(x, z, ry); const m = texMat('ns', TX.wood('#2e1a10'), 0xffffff);
  B(g, 0.5, 0.55, 0.42, m, 0, 0, 0); B(g, 0.42, 0.02, 0.01, col(0x0a0604), 0, 0.3, 0.21);
  C(g, 0.015, 0.015, 0.02, 5, col(0xa08040), 0, 0.4, 0.22);
  solid(g, 0.5, 0.42, 0.55);
  if (lamp) tableLamp(g.position.x + Math.cos(ry) * 0.08, g.position.y + 0.55, g.position.z - Math.sin(ry) * 0.08);
  if (phone) phoneProp(g.position.x - Math.cos(ry) * 0.12, g.position.y + 0.55, g.position.z + Math.sin(ry) * 0.12, ry, phone);
  return g;
}
export function desk(x, z, ry, { color = 0x2a1a10 } = {}) {
  const g = grp(x, z, ry); const m = texMat('desk' + color, TX.wood('#' + new THREE.Color(color).getHexString()), 0xffffff);
  B(g, 1.3, 0.05, 0.6, m, 0, 0.72, 0); B(g, 0.45, 0.72, 0.58, m, 0.42, 0, 0); B(g, 0.04, 0.72, 0.58, m, -0.63, 0, 0);
  B(g, 0.4, 0.15, 0.01, col(0x0a0604), 0.42, 0.5, 0.295); B(g, 0.4, 0.15, 0.01, col(0x0a0604), 0.42, 0.28, 0.295);
  solid(g, 1.3, 0.6, 0.77); return g;
}
export function dresser(x, z, ry, { w = 1.2 } = {}) {
  const g = grp(x, z, ry); const m = texMat('dres', TX.wood('#33200f'), 0xffffff);
  B(g, w, 0.8, 0.5, m, 0, 0, 0);
  for (let i = 0; i < 3; i++) { B(g, w - 0.1, 0.2, 0.01, col(0x1a0e06), 0, 0.08 + i * 0.25, 0.255); C(g, 0.02, 0.02, 0.02, 5, col(0xa08040), 0, 0.17 + i * 0.25, 0.27); }
  solid(g, w, 0.5, 0.8); return g;
}

// ---------- свет ----------
export function tableLamp(x, y, z, { color = 0xd8b070, shade = 0x8a6a3a, on = true } = {}) {
  const g = grp(x, z, 0, y);
  C(g, 0.08, 0.1, 0.04, 8, col(0x2a2018), 0, 0, 0); C(g, 0.015, 0.015, 0.3, 5, col(0x8a7040), 0, 0.04, 0);
  const sh = C(g, 0.1, 0.17, 0.2, 8, lamShade(shade), 0, 0.3, 0); sh.userData.noMerge = true;
  const a = anchor(x, y + 0.42, z, { color: 0xffa860, intensity: 2.2, distance: 4.5, on });
  const gl = glow(x, y + 0.002 + 0.0, z, 1.0, 0xffaa60, 0.35); gl.visible = on;
  const set = v => { a.on = v; sh.material = v ? lamShade(shade, true) : lamShade(shade); gl.visible = v; };
  set(on);
  hitBox(g, 0.36, 0.5, 0.36);
  interact(g, () => a.on ? 'Выключить лампу' : 'Включить лампу', () => { set(!a.on); S.sfxClick(); });
  return g;
}
function lamShade(c, lit = false) { return lit ? col(c, { emissive: 0xffb060, emissiveIntensity: 0.9, side: THREE.DoubleSide }) : col(c, { side: THREE.DoubleSide }); }
export function floorLamp(x, z, { on = true } = {}) {
  const g = grp(x, z);
  C(g, 0.16, 0.18, 0.04, 8, col(0x1a1410), 0, 0, 0); C(g, 0.02, 0.02, 1.5, 5, col(0x6a5a3a), 0, 0.04, 0);
  const sh = C(g, 0.16, 0.26, 0.32, 8, lamShade(0x9a7a4a), 0, 1.45, 0); sh.userData.noMerge = true;
  const a = anchor(x, Y() + 1.55, z, { intensity: 3, distance: 6, on });
  const gl = glow(x, Y() + 0.003, z, 2.2, 0xffaa60, 0.3);
  const set = v => { a.on = v; sh.material = lamShade(0x9a7a4a, v); gl.visible = v; };
  set(on);
  interact(g, () => a.on ? 'Выключить торшер' : 'Включить торшер', () => { set(!a.on); S.sfxClick(); });
  solid(g, 0.35, 0.35, 1.8); return g;
}
export function ceilingLamp(x, z, { y = Y() + 3.7, color = 0xffb878, intensity = 3.5, distance = 8, flicker = 0, on = true, kind = 'dome' } = {}) {
  const g = grp(x, z, 0, y);
  const bulb = emis(color, 1);
  if (kind === 'tube') { const t = box(1.2, 0.05, 0.12, bulb, 0, -0.06, 0, { parent: g }); B(g, 1.3, 0.04, 0.2, col(0x777777), 0, -0.02, 0); }
  else if (kind === 'pendant') { C(g, 0.01, 0.01, 0.7, 3, col(0x111111), 0, -0.7, 0); C(g, 0.06, 0.28, 0.2, 8, col(0x1a2a1a, { side: THREE.DoubleSide }), 0, -0.9, 0); C(g, 0.08, 0.08, 0.06, 6, bulb, 0, -0.92, 0); }
  else { C(g, 0.25, 0.3, 0.1, 10, bulb, 0, -0.1, 0); }
  const yy = kind === 'pendant' ? y - 1 : y - 0.25;
  const a = anchor(x, yy, z, { color, intensity, distance, flicker, on, bulb: g });
  const gl = glow(x, Y() + 0.004, z, 3.2, color, 0.13);
  a.glow = gl;
  return a;
}
export function chandelier(x, z, y) {
  const g = grp(x, z, 0, y);
  C(g, 0.015, 0.015, 1.2, 3, col(0x222222), 0, -1.2, 0);
  const brass = col(0x6a5020); const bulb = emis(0xffc070, 1.2);
  C(g, 0.5, 0.35, 0.08, 8, brass, 0, -1.4, 0);
  for (let i = 0; i < 8; i++) { const a = i / 8 * P * 2; C(g, 0.04, 0.04, 0.12, 5, bulb, Math.cos(a) * 0.48, -1.38, Math.sin(a) * 0.48); }
  for (let i = 0; i < 12; i++) { const a = i / 12 * P * 2; C(g, 0.01, 0.025, 0.25, 4, col(0xd0c0a0, { emissive: 0x403020 }), Math.cos(a) * 0.38, -1.7, Math.sin(a) * 0.38); }
  return anchor(x, y - 1.5, z, { color: 0xffb060, intensity: 14, distance: 16 });
}
export function sconce(x, y, z, ry) {
  const g = grp(x, z, ry, y);
  B(g, 0.12, 0.2, 0.05, col(0x6a5020), 0, -0.1, 0);
  C(g, 0.06, 0.1, 0.16, 6, col(0xc8a070, { emissive: 0xffa050, emissiveIntensity: 0.8 }), 0, 0, 0.1);
  glow(x + Math.sin(ry) * 0.02, y + 0.1, z + Math.cos(ry) * 0.02, 1.4, 0xffa050, 0.28, { rx: 0, ry });
  return anchor(x + Math.sin(ry) * 0.25, y, z + Math.cos(ry) * 0.25, { color: 0xffa050, intensity: 1.6, distance: 4 });
}

// ---------- мелочи ----------
export function glass(x, y, z, { tint = 0xbfe0e0, wine = false } = {}) {
  const g = grp(x, z, 0, y);
  const gm = col(tint, { transparent: true, opacity: 0.45, emissive: 0x202830 });
  if (wine) { C(g, 0.035, 0.005, 0.08, 6, gm, 0, 0.1, 0); C(g, 0.005, 0.005, 0.09, 3, gm, 0, 0.01, 0); C(g, 0.03, 0.03, 0.01, 6, gm, 0, 0, 0); C(g, 0.03, 0.01, 0.04, 6, col(0x5a0a1a), 0, 0.105, 0); }
  else { C(g, 0.035, 0.03, 0.11, 7, gm, 0, 0, 0); C(g, 0.03, 0.028, 0.04, 7, col(0xc89040, { transparent: true, opacity: 0.6 }), 0, 0.005, 0); }
  hitBox(g, 0.16, 0.2, 0.16);
  interact(g, 'Звякнуть стаканом', () => { S.sfxClink(wine ? 0.85 : 1 + Math.random() * 0.1); g.rotation.z = 0.1; setTimeout(() => g.rotation.z = 0, 120); });
  return g;
}
export function bottle(x, y, z, color = 0x1a4a2a) {
  const g = grp(x, z, 0, y); const m = col(color, { transparent: true, opacity: 0.8, emissive: 0x050a05 });
  C(g, 0.04, 0.04, 0.2, 7, m, 0, 0, 0); C(g, 0.015, 0.04, 0.08, 7, m, 0, 0.2, 0);
  hitBox(g, 0.16, 0.32, 0.16);
  interact(g, 'Постучать по бутылке', () => S.sfxClink(0.55 + Math.random() * 0.2));
  return g;
}
export function tv(x, y, z, ry, { on = false, big = false, screen = null } = {}) {
  const g = grp(x, z, ry, y); const s = big ? 1.3 : 1;
  B(g, 0.6 * s, 0.48 * s, 0.5 * s, col(0x1c1a18), 0, 0, -0.05);
  B(g, 0.4 * s, 0.32 * s, 0.25 * s, col(0x141210), 0, 0.08 * s, -0.4 * s);
  const offMat = col(0x0a120e, { emissive: 0x020604 });
  const onMat = screen ? basic('scr' + screen.uuid, { map: screen }) : basic('static', { map: TX.staticTex() });
  const sc = plane(0.48 * s, 0.36 * s, on ? onMat : offMat, 0, 0.24 * s, 0.205 * s, 0, 0, { parent: g }); sc.userData.noMerge = true;
  const a = anchor(0, 0, 0, { color: 0x9ab8ff, intensity: 1.2, distance: 3, on }); a.pos.copy(wp(g, 0, 0.25, 0.6));
  let isOn = on; const id = 'tv' + Math.random();
  const set = v => { isOn = v; sc.material = v ? onMat : offMat; a.on = v; if (v && !screen) S.loopStart(id, 'static'); else S.loopStop(id); };
  interact(g, () => isOn ? 'Выключить телевизор' : 'Включить телевизор', () => { S.sfxClick(); set(!isOn); });
  g.userData.setOn = set;
  return g;
}
export function phoneProp(x, y, z, ry, msg) {
  const g = grp(x, z, ry, y);
  B(g, 0.2, 0.07, 0.16, col(0x2a0a0e), 0, 0, 0); B(g, 0.22, 0.05, 0.06, col(0x3a0e12), 0, 0.08, 0);
  hitBox(g, 0.28, 0.16, 0.24);
  let busy = false;
  interact(g, 'Снять трубку', () => {
    if (busy) return; busy = true; S.loopStart('dial', 'dialtone');
    setTimeout(() => { S.loopStop('dial'); G.subtitle(typeof msg === 'function' ? msg() : msg); busy = false; }, 1400);
  });
  return g;
}
export function plant(x, z, { s = 1, y = Y() } = {}) {
  const g = grp(x, z, Math.random() * 6, y);
  C(g, 0.22 * s, 0.16 * s, 0.4 * s, 7, col(0x3a2418), 0, 0, 0);
  const lm = col(0x1d3a1e, { flatShading: true });
  for (let i = 0; i < 4; i++) {
    const l = new THREE.Mesh(new THREE.IcosahedronGeometry(0.28 * s, 0), lm);
    l.position.set((Math.random() - 0.5) * 0.3 * s, (0.6 + i * 0.25) * s, (Math.random() - 0.5) * 0.3 * s); l.scale.y = 1.4; g.add(l);
  }
  interact(g, 'Потрогать листья', () => { S.sfxPaper(); G.toast('Пластиковые. Пыльные.'); });
  solid(g, 0.45 * s, 0.45 * s, 1.5 * s); return g;
}
export function palm(x, z, { y = Y(), s = 1 } = {}) {
  const g = grp(x, z, Math.random() * 6, y);
  C(g, 0.3 * s, 0.24 * s, 0.5 * s, 8, col(0x2a1a14), 0, 0, 0);
  C(g, 0.05 * s, 0.07 * s, 1.6 * s, 5, col(0x3a2a1a), 0, 0.5 * s, 0);
  const lm = col(0x1a3a22, { side: THREE.DoubleSide });
  for (let i = 0; i < 7; i++) {
    const l = new THREE.Mesh(new THREE.PlaneGeometry(0.25 * s, 1.1 * s), lm);
    l.position.set(0, 2.05 * s, 0); l.rotation.order = 'YXZ'; l.rotation.set(-1.0, i / 7 * P * 2, 0);
    l.translateY(0.5 * s); g.add(l);
  }
  interact(g, 'Потрогать пальму', () => { S.sfxPaper(); G.toast('Шелестит, хотя ветра нет.'); });
  solid(g, 0.6 * s, 0.6 * s, 2 * s); return g;
}
export function rug(x, z, w, d, tex, { ry = 0, y = Y() } = {}) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), texMat('rug' + tex.uuid, tex));
  m.geometry.attributes.uv.array.forEach((v, i, a) => { a[i] = v * (i % 2 ? d : w) / 1.6; });
  m.rotation.x = -P / 2; m.rotation.z = ry; m.position.set(x, y + 0.006, z); W.group.add(m); return m;
}
export function curtains(axis, c, s0, s1, y0, inside, color = 0x4a1420) {
  const m = col(color, { side: THREE.DoubleSide });
  const panels = [];
  const mk = (from, dir) => {
    const g = new THREE.Group(); W.group.add(g);
    const ww = 0.5;
    for (let i = 0; i < 5; i++) {
      const p = new THREE.Mesh(boxGeo(ww / 5, 2.6, 0.06), m); p.position.set(dir * (i * ww / 5 + ww / 10), 1.3, (i % 2) * 0.06); g.add(p);
    }
    if (axis === 'x') { g.position.set(from, y0 + 0.4, c + inside * 0.2); }
    else { g.position.set(c + inside * 0.2, y0 + 0.4, from); g.rotation.y = P / 2; }
    g.userData.dir = dir; panels.push(g); return g;
  };
  const a = mk(s0, 1), b = mk(s1, -1);
  // карниз
  if (axis === 'x') box(s1 - s0 + 0.2, 0.04, 0.04, col(0x3a2a14), (s0 + s1) / 2, y0 + 3.0, c + inside * 0.2);
  else box(0.04, 0.04, s1 - s0 + 0.2, col(0x3a2a14), c + inside * 0.2, y0 + 3.0, (s0 + s1) / 2);
  let closed = false; const span = (s1 - s0) / 2;
  const set = () => {
    for (const g of panels) { g.scale.x = closed ? span / 0.5 : 1; }
  };
  for (const g of panels) interact(g, () => closed ? 'Раздвинуть шторы' : 'Задёрнуть шторы', () => { closed = !closed; set(); S.sfxCurtain(); });
  return panels;
}
export function wardrobe(x, z, ry, { label = 'Открыть шкаф', action = null } = {}) {
  const g = grp(x, z, ry); const m = texMat('wardrobe', TX.wood('#2e1b10'), 0xffffff);
  B(g, 1.1, 2.1, 0.6, m, 0, 0, 0); B(g, 0.01, 1.9, 0.01, col(0x0a0604), 0, 0.1, 0.305);
  C(g, 0.02, 0.02, 0.03, 5, col(0xa08040), -0.06, 1.1, 0.31); C(g, 0.02, 0.02, 0.03, 5, col(0xa08040), 0.06, 1.1, 0.31);
  interact(g, label, action || (() => { S.sfxDoorOpen(); G.toast(['Пустые вешалки звякнули.', 'Внутри пахнет нафталином.', 'На полке — забытый носок.'][Math.floor(Math.random() * 3)]); }));
  solid(g, 1.1, 0.6, 2.1); return g;
}
export function note(x, y, z, ry, title, text, { flat = true, color = 0xd8ccb0 } = {}) {
  const g = grp(x, z, ry, y);
  const p = plane(0.24, 0.3, col(color, { emissive: 0x2a2620 }), 0, 0.003, 0, flat ? -P / 2 : 0, 0, { parent: g });
  for (let i = 0; i < 5; i++) plane(0.16, 0.01, col(0x3a3020), (i % 2) * -0.02, 0.004, -0.09 + i * 0.04, flat ? -P / 2 : 0, 0, { parent: g }).position.y = flat ? 0.0045 : -0.09 + i * 0.04;
  hitBox(g, 0.36, flat ? 0.06 : 0.36, 0.4, flat ? 0 : -0.18);
  interact(g, 'Прочитать: ' + title, () => { S.sfxPaper(); G.note(title, text); });
  return g;
}
export function clock(x, y, z, ry, { r = 0.3 } = {}) {
  const g = grp(x, z, ry, y);
  C(g, r + 0.03, r + 0.03, 0.06, 16, col(0x3a2a1a), 0, 0, 0).rotation.x = P / 2;
  const f = new THREE.Mesh(new THREE.CircleGeometry(r, 20), texMat('clock', TX.clockTex(), 0xffffff, { emissive: 0x302820, emissiveMap: TX.clockTex() }));
  f.position.z = 0.035; g.add(f);
  g.children[0].position.set(0, 0, 0);
  interact(g, 'Посмотреть на часы', () => G.toast('3:33. Секундная стрелка дрожит, но не идёт.'));
  return g;
}
export function sign(text, x, y, z, ry, { w = 0.6, h = 0.22, bg = '#14100c', fg = '#d8c08a', glowing = false, font } = {}) {
  const tex = TX.signTex(text, { bg, fg, w: Math.round(256 * w / h * 0.4), h: 100, font: font || `bold ${text.length > 12 ? 30 : 46}px Georgia, serif` });
  const m = glowing ? basic('sign' + text + fg, { map: tex }) : texMat('sign' + text + bg + fg, tex, 0xffffff, { emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.25 });
  return plane(w, h, m, x, y, z, 0, ry);
}
export function exitSign(x, y, z, ry) {
  const s = sign('ВЫХОД', x, y, z, ry, { w: 0.45, h: 0.16, bg: '#0a2a14', fg: '#5aff8a', glowing: true, font: 'bold 52px Arial, sans-serif' });
  glow(x, y, z + 0.01, 0.9, 0x40ff80, 0.18, { rx: 0, ry });
  return s;
}
export function radio(x, y, z, ry) {
  const g = grp(x, z, ry, y);
  B(g, 0.38, 0.22, 0.16, texMat('radio', TX.wood('#4a2a14'), 0xffffff), 0, 0, 0);
  plane(0.18, 0.14, col(0x2a2018), -0.07, 0.11, 0.081, 0, 0, { parent: g });
  plane(0.1, 0.04, emis(0xffa040, 0.8), 0.1, 0.15, 0.081, 0, 0, { parent: g });
  hitBox(g, 0.44, 0.28, 0.24);
  interact(g, 'Переключить радиостанцию', () => { const n = S.nextStation(); G.toast('📻 ' + n); });
  return g;
}
export function column(x, z, h, { r = 0.35, mat = null, y = Y() } = {}) {
  const m = mat || col(0x1e2a24);
  cyl(r, r, h, 10, m, x, y, z);
  cyl(r + 0.1, r + 0.1, 0.25, 10, col(0x141a16), x, y, z);
  cyl(r + 0.12, r + 0.05, 0.3, 10, col(0x141a16), x, y + h - 0.3, z);
  addCollider(x - r, y, z - r, x + r, y + h, z + r);
}
export function piano(x, z, ry) {
  const g = grp(x, z, ry); const k = col(0x0a0808, { emissive: 0x050404 });
  const body = new THREE.Shape(); body.moveTo(-0.75, 0); body.lineTo(0.75, 0); body.lineTo(0.75, -1.2); body.quadraticCurveTo(0.6, -2.0, 0, -2.0); body.quadraticCurveTo(-0.75, -1.9, -0.75, -1.2); body.closePath();
  const geo = new THREE.ExtrudeGeometry(body, { depth: 0.3, bevelEnabled: false, curveSegments: 4 });
  const m = new THREE.Mesh(geo, k); m.rotation.x = -P / 2; m.position.y = 0.68; g.add(m);
  // откинутая крышка
  const lid = new THREE.Mesh(new THREE.ShapeGeometry(body, 4), col(0x0a0808, { side: THREE.DoubleSide })); lid.rotation.x = -P / 2 + 0.6; lid.position.set(0, 1.0, 0); lid.rotation.order = 'XYZ'; g.add(lid);
  B(g, 1.5, 0.05, 0.22, col(0xd8d0c0), 0, 0.92, 0.1);
  for (let i = 0; i < 20; i++) if (i % 7 !== 2 && i % 7 !== 6) B(g, 0.03, 0.03, 0.12, k, -0.68 + i * 0.075, 0.96, 0.06);
  for (const [a, b] of [[-0.65, 0.05], [0.65, 0.05], [0.1, -1.8]]) B(g, 0.08, 0.68, 0.08, k, a, 0, b);
  const chords = [[60, 64, 67, 71], [57, 60, 64, 67], [62, 65, 69, 72], [55, 59, 62, 65], [53, 57, 60, 64]];
  let ci = 0;
  interact(g, 'Сыграть на рояле', () => { const ch = chords[ci++ % chords.length]; ch.forEach((n, i) => S.sfxPiano(n, 0.1, i * 0.09)); });
  solid(g, 1.6, 2.1, 1.0, 0, -1.0);
  bench(g.position.x + Math.sin(ry) * 0.6, g.position.z + Math.cos(ry) * 0.6, ry);
  return g;
}
function bench(x, z, ry) {
  const g = grp(x, z, ry); B(g, 0.8, 0.08, 0.35, col(0x0a0808), 0, 0.45, 0);
  for (const a of [-0.35, 0.35]) B(g, 0.05, 0.45, 0.3, col(0x0a0808), a, 0, 0);
  seat(g, 'Сесть за рояль', { eye: 1.2, yawOff: P });
  return g;
}
export function vending(x, z, ry) {
  const g = grp(x, z, ry);
  B(g, 0.9, 1.9, 0.75, col(0x5a0e1e), 0, 0, 0);
  const front = plane(0.6, 1.2, emis(0xffd0a0, 0.55), -0.08, 1.1, 0.38, 0, 0, { parent: g });
  for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) B(g, 0.08, 0.16, 0.02, col([0xd04040, 0x40a0d0, 0xe0c040, 0x60c060][(r + c) % 4], { emissive: 0x222222 }), -0.3 + c * 0.15, 0.62 + r * 0.28, 0.38);
  B(g, 0.15, 0.6, 0.02, col(0x1a1a1a), 0.33, 1.1, 0.38); B(g, 0.5, 0.15, 0.02, col(0x050505), -0.08, 0.2, 0.38);
  anchor(0, 0, 0, { color: 0xffc0a0, intensity: 1.5, distance: 3.5 }).pos.copy(wp(g, 0, 1.1, 0.8));
  const names = ['«Закат» апельсиновая', 'Персиковый чай «Пустыня»', 'Вишнёвая газировка «∞»', 'Минеральная вода «Тишина»', 'Ничего. Монетка вернулась.'];
  interact(g, 'Купить газировку', () => { S.sfxVending(); setTimeout(() => G.toast('Выпало: ' + names[Math.floor(Math.random() * names.length)]), 1300); });
  solid(g, 0.9, 0.75, 1.9); return g;
}
export function payphone(x, z, ry, msg) {
  const g = grp(x, z, ry);
  B(g, 0.4, 0.7, 0.2, col(0x2a3a3a), 0, 1.0, 0); B(g, 0.08, 0.25, 0.08, col(0x111111), -0.12, 1.25, 0.12);
  for (let i = 0; i < 12; i++) B(g, 0.04, 0.04, 0.02, col(0xbbbbbb), 0.03 + (i % 3) * 0.06, 1.2 + Math.floor(i / 3) * 0.06, 0.1);
  let busy = false;
  interact(g, 'Позвонить', () => {
    if (busy) return; busy = true; S.loopStart('pp', 'dialtone');
    setTimeout(() => { S.loopStop('pp'); S.sfxTypewriter(7); setTimeout(() => { G.subtitle(typeof msg === 'function' ? msg() : msg); busy = false; }, 900); }, 1200);
  });
  return g;
}
export function sink(x, z, ry, { mirror = true } = {}) {
  const g = grp(x, z, ry); const por = col(0xc8c4b8);
  B(g, 0.6, 0.15, 0.45, por, 0, 0.75, 0); C(g, 0.06, 0.08, 0.75, 6, por, 0, 0, -0.05);
  B(g, 0.03, 0.15, 0.03, col(0xaaaaaa), 0, 0.9, -0.18);
  if (mirror) { plane(0.6, 0.8, col(0x40505a, { emissive: 0x0a1418 }), 0, 1.6, -0.23, 0, 0, { parent: g }); }
  const id = 'water' + Math.random(); let on = false;
  interact(g, () => on ? 'Закрыть кран' : 'Открыть кран', () => { on = !on; S.sfxClick(); on ? S.loopStart(id, 'water') : S.loopStop(id); });
  solid(g, 0.6, 0.45, 0.9); return g;
}
export function toilet(x, z, ry) {
  const g = grp(x, z, ry); const por = col(0xc8c4b8);
  B(g, 0.38, 0.4, 0.5, por, 0, 0, 0.05); B(g, 0.42, 0.06, 0.55, por, 0, 0.4, 0.05); B(g, 0.45, 0.4, 0.18, por, 0, 0.42, -0.22);
  interact(g, 'Смыть', () => S.sfxFlush());
  solid(g, 0.45, 0.6, 0.8); return g;
}
export function bathtub(x, z, ry) {
  const g = grp(x, z, ry); const por = col(0xc8c4b8);
  B(g, 0.8, 0.55, 1.7, por, 0, 0, 0); B(g, 0.62, 0.02, 1.5, col(0x4a7a8a, { emissive: 0x0a2028 }), 0, 0.5, 0);
  interact(g, 'Открыть воду', () => { S.loopStart('tub', 'water'); setTimeout(() => S.loopStop('tub'), 3000); G.toast('Вода тёплая. Пахнет хлоркой и чем-то сладким.'); });
  solid(g, 0.8, 1.7, 0.55); return g;
}
export function washer(x, z, ry) {
  const g = grp(x, z, ry);
  B(g, 0.65, 0.85, 0.6, col(0xb8b4a8), 0, 0, 0);
  const d = new THREE.Mesh(new THREE.CircleGeometry(0.22, 12), col(0x2a3a4a, { emissive: 0x0a1018 })); d.position.set(0, 0.42, 0.305); g.add(d);
  B(g, 0.55, 0.1, 0.02, col(0x555555), 0, 0.72, 0.3);
  interact(g, 'Запустить стирку', () => { S.sfxWasher(); let t = 0; const iv = setInterval(() => { t++; g.position.x += (t % 2 ? 0.01 : -0.01); if (t > 60) clearInterval(iv); }, 90); });
  solid(g, 0.65, 0.6, 0.85); return g;
}
export function shelf(x, z, ry, { w = 1.8, h = 2.2, d = 0.45, fill = 'boxes', color = 0x4a4a4a } = {}) {
  const g = grp(x, z, ry); const m = col(color);
  for (const a of [-w / 2, w / 2]) B(g, 0.04, h, d, m, a, 0, 0);
  const n = 4;
  for (let i = 0; i < n; i++) {
    const yy = 0.1 + i * (h - 0.2) / (n - 1); B(g, w, 0.03, d, m, 0, yy, 0);
    if (i < n - 1) for (let k = 0; k < 3; k++) {
      if (Math.random() < 0.25) continue;
      if (fill === 'boxes') B(g, 0.4 + Math.random() * 0.15, 0.28, d * 0.8, col([0x6a5030, 0x5a4428, 0x7a6040][k]), -w / 2 + 0.35 + k * w / 3.2, yy + 0.03, 0);
      else if (fill === 'towels') for (let t = 0; t < 3; t++) B(g, 0.45, 0.08, d * 0.8, col(0xd8d2c4), -w / 2 + 0.35 + k * w / 3.2, yy + 0.03 + t * 0.085, 0);
      else if (fill === 'files') for (let t = 0; t < 6; t++) B(g, 0.06, 0.32, d * 0.75, col([0x2a3a5a, 0x5a2a2a, 0x3a4a2a, 0x6a5a3a][(t + k) % 4]), -w / 2 + 0.15 + k * w / 3.2 + t * 0.075, yy + 0.03, 0);
    }
  }
  solid(g, w, d, h); return g;
}
export function boiler(x, z) {
  const g = grp(x, z);
  const m = col(0x5a3a2a); C(g, 0.7, 0.7, 2.6, 10, m, 0, 0, 0);
  C(g, 0.12, 0.12, 0.9, 6, col(0x3a3a3a), 0, 2.6, 0);
  const d = new THREE.Mesh(new THREE.CircleGeometry(0.18, 10), emis(0xff5010, 0.9)); d.position.set(0, 0.6, 0.71); g.add(d);
  anchor(x, Y() + 0.6, z + 1.0, { color: 0xff5010, intensity: 2, distance: 4, flicker: 0.5 });
  interact(g, 'Постучать по котлу', () => { S.sfxKnock(1); setTimeout(() => S.sfxKnock(2, 0.1), 1500); G.toast('Котёл ответил эхом.'); });
  addCollider(x - 0.7, Y(), z - 0.7, x + 0.7, Y() + 3, z + 0.7); return g;
}
export function pipe(x0, y0, z0, x1, y1, z1, r = 0.08, color = 0x3a4a3a) {
  const a = new THREE.Vector3(x0, y0, z0), b = new THREE.Vector3(x1, y1, z1);
  const len = a.distanceTo(b); const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 6), col(color));
  m.position.copy(a).add(b).multiplyScalar(0.5); m.lookAt(b); m.rotateX(P / 2); W.group.add(m); return m;
}
export function arcade(x, z, ry, imgGroups = ['05_retro_games_arcade']) {
  const g = grp(x, z, ry);
  B(g, 0.75, 1.75, 0.8, col(0x1a1030), 0, 0, 0);
  B(g, 0.75, 0.25, 0.4, col(0x2a1a4a), 0, 0.95, 0.4);
  for (let i = 0; i < 4; i++) C(g, 0.03, 0.03, 0.03, 6, col([0xff3050, 0x30a0ff, 0xffd030, 0x30ff80][i], { emissive: 0x333333 }), -0.2 + i * 0.12, 1.2, 0.5);
  const scr = plane(0.55, 0.42, basic('arc' + x, { color: 0x30ffd0 }), 0, 1.5, 0.405, -0.15, 0, { parent: g });
  const p = picture(imgGroups, 0, 0, 0, 0, 0.5); if (p) { g.add(p); p.position.set(0, 1.5, 0.39); p.rotation.x = -0.15; scr.visible = false; }
  plane(0.7, 0.18, emis(0xff40a0, 0.9), 0, 1.92, 0.405, 0, 0, { parent: g });
  anchor(0, 0, 0, { color: 0xb060ff, intensity: 1.4, distance: 3 }).pos.copy(wp(g, 0, 1.5, 0.9));
  const tunes = [[72, 76, 79, 84], [67, 71, 74, 79, 83], [60, 63, 67, 70, 72]];
  interact(g, 'Сыграть', () => { const t = tunes[Math.floor(Math.random() * tunes.length)]; t.forEach((n, i) => S.sfxPiano(n, 0.05, i * 0.08)); G.toast('INSERT COIN · HI-SCORE: 999999 · «???»'); });
  solid(g, 0.75, 0.8, 1.9); return g;
}
export function ceilingFan(x, z, y) {
  const g = grp(x, z, 0, y);
  C(g, 0.02, 0.02, 0.4, 4, col(0x2a2018), 0, -0.4, 0); C(g, 0.12, 0.1, 0.12, 8, col(0x3a2a18), 0, -0.52, 0);
  const rot = new THREE.Group(); rot.position.y = -0.48; g.add(rot);
  for (let i = 0; i < 4; i++) { const b = new THREE.Mesh(boxGeo(0.7, 0.015, 0.14, 1), col(0x3a2414)); b.position.x = 0.42; const h = new THREE.Group(); h.rotation.y = i * P / 2; h.add(b); rot.add(h); }
  W.animated.push(dt => { rot.rotation.y += dt * 2.2; });
  return g;
}
export function luggageCart(x, z, ry) {
  const g = grp(x, z, ry); const brass = col(0x8a6a2a, { emissive: 0x1a1000 });
  B(g, 1.1, 0.06, 0.6, col(0x5a1a22), 0, 0.25, 0);
  for (const a of [-0.5, 0.5]) { C(g, 0.02, 0.02, 1.6, 5, brass, a, 0.25, 0); }
  const top = C(g, 0.025, 0.025, 1.0, 5, brass, 0, 1.85, 0); top.rotation.z = P / 2; top.position.y = 1.85;
  B(g, 0.5, 0.35, 0.3, col(0x3a2a1a), -0.2, 0.31, 0); B(g, 0.35, 0.25, 0.4, col(0x5a4a3a), 0.25, 0.31, 0);
  for (const [a, b] of [[-0.45, -0.25], [0.45, -0.25], [-0.45, 0.25], [0.45, 0.25]]) C(g, 0.08, 0.08, 0.04, 8, col(0x111111), a, 0.05, b).rotation.x = P / 2;
  interact(g, 'Осмотреть багаж', () => G.toast('Бирки на чемоданах: «Номер 0». Внутри пусто.'));
  solid(g, 1.1, 0.6, 1.9); return g;
}
export function fridge(x, z, ry) {
  const g = grp(x, z, ry); B(g, 0.7, 1.8, 0.65, col(0xb8b0a0), 0, 0, 0); B(g, 0.02, 0.4, 0.04, col(0x888888), 0.28, 1.0, 0.34);
  const id = 'fr' + x; S.loopStart && 0;
  interact(g, 'Открыть холодильник', () => { S.sfxDoorOpen(); G.toast(['Внутри — один лимон и лёд.', 'Пусто. Лампочка мигает.', 'Пахнет 1999 годом.'][Math.floor(Math.random() * 3)]); });
  solid(g, 0.7, 0.65, 1.8); return g;
}
export function counter(x0, z0, x1, z1, h = 1.05, { top = 0x1a1210, front = 0x3a1a14 } = {}) {
  const y = Y();
  const m = box(Math.abs(x1 - x0), h - 0.05, Math.abs(z1 - z0), texMat('cnt' + front, TX.wood('#' + new THREE.Color(front).getHexString()), 0xffffff), (x0 + x1) / 2, y, (z0 + z1) / 2);
  box(Math.abs(x1 - x0) + 0.1, 0.05, Math.abs(z1 - z0) + 0.1, col(top, { emissive: 0x050302 }), (x0 + x1) / 2, y + h - 0.05, (z0 + z1) / 2);
  addCollider(Math.min(x0, x1), y, Math.min(z0, z1), Math.max(x0, x1), y + h, Math.max(z0, z1));
  return m;
}
export function bell(x, y, z) {
  const g = grp(x, z, 0, y);
  C(g, 0.06, 0.07, 0.015, 10, col(0x1a1a1a), 0, 0, 0);
  const d = new THREE.Mesh(new THREE.SphereGeometry(0.055, 10, 5, 0, P * 2, 0, P / 2), col(0xc0a050, { emissive: 0x2a2000 })); d.position.y = 0.015; g.add(d);
  C(g, 0.008, 0.008, 0.03, 4, col(0xc0a050), 0, 0.07, 0);
  hitBox(g, 0.2, 0.15, 0.2);
  interact(g, 'Позвонить в звонок', () => { S.sfxBell(); });
  return g;
}
export function locker(x, z, ry, n = 3) {
  const g = grp(x, z, ry);
  for (let i = 0; i < n; i++) {
    B(g, 0.38, 1.9, 0.45, col(0x3a4a4a), (i - (n - 1) / 2) * 0.4, 0, 0);
    for (let k = 0; k < 4; k++) B(g, 0.22, 0.02, 0.01, col(0x1a2222), (i - (n - 1) / 2) * 0.4, 1.5 + k * 0.05, 0.23);
  }
  interact(g, 'Открыть шкафчик', () => { S.sfxLocked(); G.toast(['Внутри — униформа с бейджем «Персонал».', 'Заперто. За дверцей что-то шуршит.', 'Пусто. Только старый пропуск без фото.'][Math.floor(Math.random() * 3)]); });
  solid(g, n * 0.4, 0.45, 1.9); return g;
}
export function tray(x, y, z) {
  const g = grp(x, z, 0, y);
  C(g, 0.25, 0.25, 0.02, 12, col(0x8a8a8a, { emissive: 0x111111 }), 0, 0, 0);
  C(g, 0.12, 0.12, 0.08, 10, col(0xd8d0c0), -0.08, 0.02, 0);
  glass(x + 0.1, y + 0.02, z + 0.05, { wine: true }); glass(x + 0.08, y + 0.02, z - 0.1);
  return g;
}
export function fireExt(x, z, ry) {
  const g = grp(x, z, ry);
  C(g, 0.08, 0.08, 0.5, 8, col(0x8a0a0a, { emissive: 0x200000 }), 0, 0.6, 0);
  C(g, 0.03, 0.03, 0.08, 5, col(0x222222), 0, 1.1, 0);
  interact(g, 'Осмотреть огнетушитель', () => G.toast('Проверен: 03.03.1999. Подпись неразборчива.'));
  return g;
}
export function stackedChairs(x, z, ry, n = 5) {
  const g = grp(x, z, ry);
  for (let i = 0; i < n; i++) { B(g, 0.46, 0.06, 0.46, col(0x4a1e22), 0, 0.44 + i * 0.12, 0); B(g, 0.46, 0.45, 0.04, col(0x3a2418), 0, 0.5 + i * 0.12, -0.21); }
  for (const [a, b] of [[-0.2, -0.2], [0.2, -0.2], [-0.2, 0.2], [0.2, 0.2]]) B(g, 0.04, 0.44, 0.04, col(0x3a2418), a, 0, b);
  solid(g, 0.5, 0.5, 1.2); return g;
}
export function sheetCovered(x, z, ry, w = 1.6, h = 0.9, d = 0.9) {
  const g = grp(x, z, ry);
  const m = new THREE.Mesh(new THREE.DodecahedronGeometry(0.5, 0), col(0xb8b2a4, { flatShading: true }));
  m.scale.set(w, h * 1.6, d); m.position.y = h / 2; g.add(m);
  interact(g, 'Приподнять простыню', () => { S.sfxCurtain(); G.toast(['Под простынёй — диван. Тёплый, будто кто-то сидел.', 'Под простынёй — ещё одна простыня.', 'Рояль без клавиш.'][Math.floor(Math.random() * 3)]); });
  solid(g, w * 0.9, d * 0.9, h); return g;
}
export function pickup(x, y, z, id, name, msg, build) {
  const g = grp(x, z, 0, y); build(g);
  hitBox(g, 0.3, 0.2, 0.3, -0.02);
  interact(g, 'Взять: ' + name, () => { S.sfxPickup(); G.addItem(id, name); g.visible = false; g.userData.interact = null; if (msg) G.note(name, msg); });
  return g;
}
export function keyMesh(g, color = 0xc0a040) {
  const m = col(color, { emissive: 0x302000 });
  const r = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.012, 4, 8), m); r.rotation.x = P / 2; r.position.y = 0.012; g.add(r);
  B(g, 0.12, 0.02, 0.018, m, 0.09, 0.0, 0);
  B(g, 0.02, 0.02, 0.04, m, 0.13, 0.0, 0.02);
  glow(g.position.x, g.position.y + 0.005, g.position.z, 0.5, 0xffd060, 0.3);
}
export { wp, seat };
