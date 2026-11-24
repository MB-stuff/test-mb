// Мебель и предметы (низкополигональные), с интерактивом.
// Каждый предмет помечается, на чём он держится (пол / стол / стена) — по этим меткам
// работает автопроверка «ничего не висит в воздухе».
import * as THREE from 'three';
import { W, G, FH, box, cyl, plane, col, texMat, emis, basic, decalMat, interact, anchor, glow, addCollider, boxGeo, picture, mount } from './engine.js';
import * as TX from './textures.js';
import * as S from './audio.js';

const Y = () => W.level * FH;
const P = Math.PI;

export function grp(x, z, ry = 0, y = Y()) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry; W.group.add(g); return g;
}
export function solid(g, w, d, h, ox = 0, oz = 0) {
  const r = Math.round(g.rotation.y / (P / 2)) & 1;
  const c = Math.cos(g.rotation.y), s = Math.sin(g.rotation.y);
  const cx = g.position.x + ox * c + oz * s, cz = g.position.z - ox * s + oz * c;
  const hw = (r ? d : w) / 2, hd = (r ? w : d) / 2;
  return addCollider(cx - hw, g.position.y, cz - hd, cx + hw, g.position.y + h, cz + hd, g);
}
const B = (g, w, h, d, mat, x, y, z) => box(w, h, d, mat, x, y, z, { parent: g });
const C = (g, rt, rb, h, seg, mat, x, y, z) => cyl(rt, rb, h, seg, mat, x, y, z, { parent: g });
const woodM = (hex) => texMat('w' + hex, TX.wood(hex), 0xffffff, {}, 1);
const pick = a => a[Math.floor(Math.random() * a.length)];

const hitMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false });
export function hitBox(g, w, h, d, y = 0) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), hitMat); m.position.y = y + h / 2; m.userData.hit = true; g.add(m); return m; }
export function wp(g, x, y, z) { return new THREE.Vector3(x, y, z).applyEuler(g.rotation).add(g.position); }
const floor = g => mount(g, 'floor');
// источник звука с радиусом слышимости (громкость считается в main.js по расстоянию)
export function soundSpot(kind, pos, gain, range = 7) {
  const snd = { id: kind + Math.random(), kind, pos: pos.clone(), level: W.level, range, gain, active: false };
  (W.sounds = W.sounds || []).push(snd); return snd;
}
// видимое состояние лампы: светится, только если включена и в отеле есть ток
export function lampVis(a, meshes, onMat, offMat, extra = null) {
  for (const m of meshes) m.userData.noMerge = true;
  a.refresh = () => { const lit = a.on && !(W.flags.blackout && a.grid); for (const m of meshes) m.material = lit ? onMat : offMat; if (extra) extra(lit); };
  a.setOn = v => { a.on = v; a.refresh(); };
  a.refresh(); return a;
}
const onTable = g => mount(g, 'table');
const onWall = (g, w = 0.3, h = 0.3) => mount(g, 'wall', { w, h });

export function seat(g, label, { eye = 1.15, fwd = 0.05, lie = false, yawOff = 0, onSit = null } = {}) {
  interact(g, label, () => {
    const p = wp(g, 0, 0, fwd);
    G.sit({ x: p.x, y: g.position.y + eye, z: p.z, yaw: g.rotation.y + P + yawOff, lie });
    if (onSit) onSit();
  });
}

// ---------- сиденья ----------
export function chair(x, z, ry, { color = 0x4a2a1a, seatColor = 0x6a2026, sit = true, y = Y() } = {}) {
  const g = grp(x, z, ry, y); const w = col(color), s = col(seatColor);
  B(g, 0.46, 0.08, 0.46, s, 0, 0.44, 0);
  B(g, 0.46, 0.55, 0.06, w, 0, 0.5, -0.21);
  for (const [a, b] of [[-0.2, -0.2], [0.2, -0.2], [-0.2, 0.2], [0.2, 0.2]]) B(g, 0.05, 0.44, 0.05, w, a, 0, b);
  if (sit) seat(g, 'Сесть на стул', { eye: 1.15 });
  solid(g, 0.5, 0.5, 0.9); floor(g);
  return g;
}
export function stool(x, z, { color = 0x8a1a2a } = {}) {
  const g = grp(x, z, 0);
  C(g, 0.2, 0.2, 0.08, 10, col(color), 0, 0.72, 0); C(g, 0.03, 0.05, 0.72, 6, col(0x9a8a6a), 0, 0, 0);
  C(g, 0.2, 0.2, 0.02, 10, col(0x555555), 0, 0, 0);
  seat(g, 'Сесть на табурет', { eye: 1.42, fwd: 0 }); solid(g, 0.4, 0.4, 0.8); floor(g); return g;
}
export function armchair(x, z, ry, color = 0x5a2a2a) {
  const g = grp(x, z, ry); const m = col(color), d = col(0x1a0e0a);
  B(g, 0.85, 0.3, 0.8, m, 0, 0.12, 0); B(g, 0.85, 0.65, 0.2, m, 0, 0.4, -0.32);
  B(g, 0.16, 0.3, 0.75, m, -0.38, 0.42, 0); B(g, 0.16, 0.3, 0.75, m, 0.38, 0.42, 0);
  for (const [a, b] of [[-0.35, -0.3], [0.35, -0.3], [-0.35, 0.3], [0.35, 0.3]]) B(g, 0.06, 0.12, 0.06, d, a, 0, b);
  seat(g, 'Сесть в кресло', { eye: 1.05 }); solid(g, 0.9, 0.85, 0.9); floor(g); return g;
}
export function sofa(x, z, ry, color = 0x3a2a3a, len = 2.1) {
  const g = grp(x, z, ry); const m = col(color), d = col(0x120a08);
  B(g, len, 0.32, 0.9, m, 0, 0.1, 0); B(g, len, 0.7, 0.22, m, 0, 0.35, -0.36);
  B(g, 0.2, 0.3, 0.9, m, -len / 2 + 0.1, 0.42, 0); B(g, 0.2, 0.3, 0.9, m, len / 2 - 0.1, 0.42, 0);
  const cu = col(new THREE.Color(color).multiplyScalar(1.25).getHex());
  for (let i = 0; i < 2; i++) B(g, len / 2 - 0.25, 0.1, 0.62, cu, (i - 0.5) * (len / 2 - 0.15), 0.42, 0.06);
  for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) B(g, 0.06, 0.1, 0.06, d, a * (len / 2 - 0.08), 0, b * 0.38);
  seat(g, 'Сесть на диван', { eye: 1.08 }); solid(g, len, 0.95, 0.9); floor(g); return g;
}
export function bed(x, z, ry, { double = true, color = 0x6a2030, frame = '#3a2010', msg = null } = {}) {
  const g = grp(x, z, ry); const w = double ? 1.7 : 1.0, L = 2.05;
  const f = woodM(frame);
  B(g, w, 0.32, L, f, 0, 0, 0);
  B(g, w + 0.06, 1.05, 0.08, f, 0, 0, -L / 2 + 0.04);
  B(g, w - 0.06, 0.2, L - 0.12, col(0xd8ccb0), 0, 0.32, 0.02);
  B(g, w + 0.05, 0.07, L * 0.62, col(color), 0, 0.5, L * 0.18);
  B(g, w + 0.05, 0.3, 0.03, col(color), 0, 0.24, L / 2 + 0.02);
  const pc = col(0xe0d6c0);
  if (double) { B(g, 0.6, 0.14, 0.36, pc, -0.4, 0.52, -L / 2 + 0.32); B(g, 0.6, 0.14, 0.36, pc, 0.4, 0.52, -L / 2 + 0.32); }
  else B(g, 0.65, 0.14, 0.36, pc, 0, 0.52, -L / 2 + 0.32);
  interact(g, 'Лечь на кровать', () => {
    const p = wp(g, 0, 0, -0.25);
    G.sit({ x: p.x, y: g.position.y + 0.85, z: p.z, yaw: g.rotation.y + P, lie: true });
    if (msg) setTimeout(() => G.toast(msg), 1200);
  });
  solid(g, w + 0.05, L, 0.6); floor(g);
  return g;
}
export function bunk(x, z, ry) {
  const g = bed(x, z, ry, { double: false, color: 0x2a4a6a });
  const f = col(0x7a7a80);
  B(g, 1.0, 0.12, 2.05, f, 0, 1.4, 0); B(g, 0.9, 0.15, 1.9, col(0xd8ccb0), 0, 1.52, 0); B(g, 0.9, 0.05, 1.2, col(0x7a2a4a), 0, 1.67, 0.3);
  for (const [a, b] of [[-0.535, -1], [0.535, -1], [-0.535, 1], [0.535, 1]]) B(g, 0.05, 1.9, 0.05, f, a, 0, b);
  return g;
}

// ---------- столы ----------
export function table(x, z, { w = 1.2, d = 0.8, h = 0.75, color = '#3a2214', round = false, cloth = null, y = Y(), ry = 0 } = {}) {
  const g = grp(x, z, ry, y); const m = woodM(color);
  if (round) {
    C(g, w / 2, w / 2, 0.05, 16, cloth ? col(cloth) : m, 0, h - 0.05, 0);
    if (cloth) C(g, w / 2 + 0.01, w / 2 + 0.06, 0.32, 16, col(cloth), 0, h - 0.36, 0);
    C(g, 0.05, 0.06, h - 0.05, 8, col(0x1a1410), 0, 0, 0); C(g, 0.25, 0.25, 0.03, 12, col(0x1a1410), 0, 0, 0);
  } else {
    B(g, w, 0.05, d, cloth ? col(cloth) : m, 0, h - 0.05, 0);
    if (cloth) { B(g, w + 0.04, 0.3, 0.01, col(cloth), 0, h - 0.33, d / 2 + 0.015); B(g, w + 0.04, 0.3, 0.01, col(cloth), 0, h - 0.33, -d / 2 - 0.015); }
    for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) B(g, 0.05, h - 0.05, 0.05, m, a * (w / 2 - 0.06), 0, b * (d / 2 - 0.06));
  }
  solid(g, w, round ? w : d, h); g.userData.top = h; floor(g);
  return g;
}
export function nightstand(x, z, ry, { lamp = true, phone = null } = {}) {
  const g = grp(x, z, ry); const m = woodM('#3a2214');
  B(g, 0.5, 0.55, 0.42, m, 0, 0, 0); B(g, 0.42, 0.02, 0.01, col(0x0a0604), 0, 0.3, 0.215);
  C(g, 0.015, 0.015, 0.02, 6, col(0xc0a050), 0, 0.4, 0.225);
  solid(g, 0.5, 0.42, 0.55); floor(g); g.userData.top = 0.55;
  if (lamp) tableLamp(...wp(g, 0.08, 0.55, -0.02).toArray());
  if (phone) phoneProp(...wp(g, -0.13, 0.55, 0.02).toArray(), ry, phone);
  return g;
}
export function desk(x, z, ry, { color = '#3a2214' } = {}) {
  const g = grp(x, z, ry); const m = woodM(color);
  B(g, 1.3, 0.05, 0.6, m, 0, 0.72, 0); B(g, 0.45, 0.72, 0.58, m, 0.42, 0, 0); B(g, 0.04, 0.72, 0.58, m, -0.63, 0, 0);
  B(g, 0.4, 0.15, 0.01, col(0x0a0604), 0.42, 0.5, 0.295); B(g, 0.4, 0.15, 0.01, col(0x0a0604), 0.42, 0.28, 0.295);
  solid(g, 1.3, 0.6, 0.77); floor(g); g.userData.top = 0.77; return g;
}
export function dresser(x, z, ry, { w = 1.2 } = {}) {
  const g = grp(x, z, ry); const m = woodM('#40260f');
  B(g, w, 0.8, 0.5, m, 0, 0, 0);
  for (let i = 0; i < 3; i++) { B(g, w - 0.1, 0.2, 0.01, col(0x1a0e06), 0, 0.08 + i * 0.25, 0.255); C(g, 0.02, 0.02, 0.02, 6, col(0xc0a050), 0, 0.17 + i * 0.25, 0.27); }
  solid(g, w, 0.5, 0.8); floor(g); g.userData.top = 0.8; return g;
}
// верхняя точка мебели в мировых координатах: удобно ставить вещи на стол
export function top(g, lx = 0, lz = 0) { return wp(g, lx, g.userData.top || 0.75, lz); }

// ---------- свет ----------
function lamShade(c, lit = false) { return lit ? col(c, { emissive: 0xffb060, emissiveIntensity: 0.9, side: THREE.DoubleSide }) : col(c, { side: THREE.DoubleSide }); }
export function tableLamp(x, y, z, { shade = 0x9a7a3a, on = true } = {}) {
  const g = grp(x, z, 0, y);
  C(g, 0.08, 0.1, 0.04, 10, col(0x2a2018), 0, 0, 0); C(g, 0.015, 0.015, 0.3, 6, col(0x9a8040), 0, 0.04, 0);
  const sh = C(g, 0.1, 0.17, 0.2, 10, lamShade(shade), 0, 0.3, 0); sh.userData.noMerge = true;
  const a = anchor(x, y + 0.42, z, { color: 0xffa860, intensity: 2.2, distance: 4.5, on });
  lampVis(a, [sh], lamShade(shade, true), lamShade(shade, false)); const set = a.setOn;
  hitBox(g, 0.36, 0.5, 0.36);
  interact(g, () => a.on ? 'Выключить лампу' : 'Включить лампу', () => { set(!a.on); S.sfxClick(); });
  onTable(g); return g;
}
export function floorLamp(x, z, { on = true } = {}) {
  const g = grp(x, z);
  C(g, 0.16, 0.18, 0.04, 10, col(0x1a1410), 0, 0, 0); C(g, 0.02, 0.02, 1.5, 6, col(0x7a6a3a), 0, 0.04, 0);
  const sh = C(g, 0.16, 0.26, 0.32, 10, lamShade(0xa8844a), 0, 1.45, 0); sh.userData.noMerge = true;
  const a = anchor(x, Y() + 1.55, z, { intensity: 3, distance: 6, on });
  lampVis(a, [sh], lamShade(0xa8844a, true), lamShade(0xa8844a, false)); const set = a.setOn;
  interact(g, () => a.on ? 'Выключить торшер' : 'Включить торшер', () => { set(!a.on); S.sfxClick(); });
  solid(g, 0.35, 0.35, 1.8); floor(g); return g;
}
export function ceilingLamp(x, z, { y = Y() + 3.7, color = 0xffb878, intensity = 3.5, distance = 8, flicker = 0, on = true, kind = 'dome' } = {}) {
  const g = grp(x, z, 0, y);
  const bulb = emis(color, 1), bulbOff = col(0x8a8478);
  const n0 = g.children.length;
  if (kind === 'tube') { box(1.2, 0.05, 0.12, bulb, 0, -0.08, 0, { parent: g }); B(g, 1.3, 0.04, 0.2, col(0x777777), 0, -0.04, 0); }
  else if (kind === 'pendant') { C(g, 0.01, 0.01, 0.7, 4, col(0x111111), 0, -0.7, 0); C(g, 0.06, 0.28, 0.2, 10, col(0x2a3a22, { side: THREE.DoubleSide }), 0, -0.9, 0); C(g, 0.08, 0.08, 0.06, 8, bulb, 0, -0.92, 0); }
  else { C(g, 0.25, 0.3, 0.1, 12, bulb, 0, -0.1, 0); C(g, 0.32, 0.32, 0.02, 12, col(0x6a5020), 0, -0.02, 0); }
  const yy = kind === 'pendant' ? y - 1 : y - 0.25;
  const a = anchor(x, yy, z, { color, intensity, distance, flicker, on });
  if (kind === 'tube') a.hum = true;
  // лампа под выключателем: светящиеся части не сливаются с остальной геометрией, чтобы их можно было погасить
  const bulbs = g.children.slice(n0).filter(m => m.material === bulb);
  a.ceiling = true; a.switchable = true;
  lampVis(a, bulbs, bulb, bulbOff);
  mount(g, 'ceiling');
  return a;
}
export function chandelier(x, z, y, { s = 1, drop = 1.2, tiers = 1, intensity = 14, distance = 16, color = 0xffb060 } = {}) {
  const g = grp(x, z, 0, y);
  C(g, 0.015 * s, 0.015 * s, drop, 4, col(0x222222), 0, -drop, 0);
  const brass = col(0x8a6a2a, { emissive: 0x1a1000 }); const bulb = emis(0xffc070, 1.2);
  const crystal = col(0xe0d0b0, { emissive: 0x504030 }), crystalOff = col(0x8a8070);
  const bulbs = [], drops = [];
  for (let k = 0; k < tiers; k++) {
    const r = (0.5 - k * 0.18) * s, yy = -drop - 0.2 * s - k * 0.42 * s, n = 8 - k * 2;
    C(g, r, r * 0.7, 0.08 * s, 12, brass, 0, yy, 0);
    for (let i = 0; i < n; i++) {
      const a = i / n * P * 2 + k * 0.3;
      bulbs.push(C(g, 0.04 * s, 0.04 * s, 0.12 * s, 6, bulb, Math.cos(a) * (r - 0.02), yy + 0.02 * s, Math.sin(a) * (r - 0.02)));
    }
    for (let i = 0; i < n + 4; i++) { const a = (i + 0.5) / (n + 4) * P * 2; drops.push(C(g, 0.01 * s, 0.025 * s, 0.25 * s, 5, crystal, Math.cos(a) * r * 0.78, yy - 0.3 * s, Math.sin(a) * r * 0.78)); }
  }
  if (tiers > 1) { C(g, 0.06 * s, 0.03 * s, (tiers - 1) * 0.42 * s + 0.2 * s, 8, brass, 0, -drop - 0.2 * s - (tiers - 1) * 0.42 * s, 0); C(g, 0.02 * s, 0.08 * s, 0.3 * s, 8, crystal, 0, -drop - 0.5 * s - (tiers - 1) * 0.42 * s, 0); }
  mount(g, 'ceiling');
  const an = anchor(x, y - drop - 0.3 * s - (tiers - 1) * 0.3 * s, z, { color, intensity, distance }); an.switchable = true;
  // погашенная люстра: лампочки и хрусталь тускнеют
  return lampVis(an, [...bulbs, ...drops], bulb, col(0x6a5a40), lit => { for (const d of drops) d.material = lit ? crystal : crystalOff; });
}
// Зеркало на ножках у окна: ловит солнце, которого не видно в окне
export function sunMirror(x, z, ry) {
  const g = grp(x, z, ry);
  const wood = woodM('#4a2a14');
  B(g, 0.05, 1.7, 0.05, wood, -0.42, 0, 0); B(g, 0.05, 1.7, 0.05, wood, 0.42, 0, 0);
  B(g, 0.5, 0.04, 0.3, wood, -0.42, 0, 0); B(g, 0.5, 0.04, 0.3, wood, 0.42, 0, 0);
  const fr = new THREE.Group(); fr.position.set(0, 1.0, 0); fr.rotation.x = -0.12; g.add(fr);
  B(fr, 0.8, 1.3, 0.04, wood, 0, -0.65, -0.01);
  // в отражении — жёлтое небо и маленькое оранжевое солнце
  const c = document.createElement('canvas'); c.width = 64; c.height = 104; const cx = c.getContext('2d');
  const gr = cx.createLinearGradient(0, 0, 0, 104); gr.addColorStop(0, '#ffe7a0'); gr.addColorStop(0.62, '#ffb860'); gr.addColorStop(0.63, '#8a2a30'); gr.addColorStop(1, '#4a1018');
  cx.fillStyle = gr; cx.fillRect(0, 0, 64, 104); cx.fillStyle = '#ff6a20'; cx.beginPath(); cx.arc(38, 46, 6, 0, 7); cx.fill();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const glass = plane(0.7, 1.2, new THREE.MeshBasicMaterial({ map: t, color: 0xd8c8b0 }), 0, 0, 0.012, 0, 0, { parent: fr }); glass.userData.noMerge = true;
  const a = anchor(0, 0, 0, { color: 0xffa050, intensity: 0.8, distance: 2.5, grid: false }); a.pos.copy(wp(g, 0, 1.0, 0.5));
  solid(g, 0.9, 0.35, 1.7);
  interact(g, 'Посмотреть в зеркало', () => { S.sfxPaper(); G.toast(pick([
    'В зеркале — солнце. Обернёшься к окну — солнца нет.',
    'Отражение теплее, чем комната. Ты протягиваешь руку — стекло тёплое, как песок в полдень.',
    'В зеркале ты сидишь на стуле и смотришь на солнце. Стул за твоей спиной пуст.',
  ])); });
  floor(g); return g;
}
// Бра на стене: (x,z) — точка на поверхности стены, ry — нормаль стены
export function sconce(x, y, z, ry, { glowSize = 1.3 } = {}) {
  const g = grp(x, z, ry, y);
  B(g, 0.12, 0.2, 0.04, col(0x8a6a2a), 0, -0.1, 0.02);
  B(g, 0.03, 0.03, 0.1, col(0x8a6a2a), 0, -0.02, 0.07);
  const onM = col(0xd8b080, { emissive: 0xffa050, emissiveIntensity: 0.8 }), offM = col(0x8a7a60);
  const shade = C(g, 0.06, 0.1, 0.16, 8, onM, 0, -0.06, 0.13);
  const gl = glow(x + Math.sin(ry) * 0.01, y + 0.05, z + Math.cos(ry) * 0.01, glowSize, 0xffa050, 0.25, { rx: 0, ry });
  gl.userData.noMerge = true;
  onWall(g, 0.12, 0.2);
  const an = anchor(x + Math.sin(ry) * 0.3, y, z + Math.cos(ry) * 0.3, { color: 0xffa050, intensity: 1.6, distance: 4 }); an.switchable = true;
  return lampVis(an, [shade], onM, offM, lit => { if (gl) { gl.visible = lit; gl.userData.off = !lit; } });
}

// ---------- мелочи на столах ----------
export function glass(x, y, z, { tint = 0xcfe8e8, wine = false } = {}) {
  const g = grp(x, z, 0, y);
  const gm = col(tint, { transparent: true, opacity: 0.45, emissive: 0x202830 });
  if (wine) { C(g, 0.035, 0.005, 0.08, 8, gm, 0, 0.1, 0); C(g, 0.005, 0.005, 0.09, 4, gm, 0, 0.01, 0); C(g, 0.03, 0.03, 0.01, 8, gm, 0, 0, 0); C(g, 0.03, 0.01, 0.04, 8, col(0x6a0a1a), 0, 0.105, 0); }
  else { C(g, 0.035, 0.03, 0.11, 8, gm, 0, 0, 0); C(g, 0.03, 0.028, 0.04, 8, col(0xc89040, { transparent: true, opacity: 0.6 }), 0, 0.005, 0); }
  hitBox(g, 0.16, 0.2, 0.16);
  interact(g, 'Звякнуть стаканом', () => { S.sfxClink(wine ? 0.85 : 1 + Math.random() * 0.1); g.rotation.z = 0.1; setTimeout(() => g.rotation.z = 0, 120); });
  onTable(g); return g;
}
export function bottle(x, y, z, color = 0x1a4a2a) {
  const g = grp(x, z, 0, y); const m = col(color, { transparent: true, opacity: 0.85, emissive: 0x050a05 });
  C(g, 0.04, 0.04, 0.2, 8, m, 0, 0, 0); C(g, 0.015, 0.04, 0.08, 8, m, 0, 0.2, 0);
  hitBox(g, 0.16, 0.32, 0.16);
  interact(g, 'Постучать по бутылке', () => S.sfxClink(0.55 + Math.random() * 0.2));
  onTable(g); return g;
}
export function plate(x, y, z, { cutlery = true, ry = 0 } = {}) {
  const g = grp(x, z, ry, y);
  C(g, 0.13, 0.1, 0.02, 14, col(0xe8e0d0), 0, 0, 0); C(g, 0.08, 0.08, 0.004, 12, col(0xd8ccb8), 0, 0.028, 0);
  if (cutlery) { B(g, 0.015, 0.006, 0.19, col(0xb8b8b8), -0.17, 0, 0); B(g, 0.015, 0.006, 0.19, col(0xb8b8b8), 0.17, 0, 0); }
  hitBox(g, 0.3, 0.06, 0.3);
  interact(g, 'Постучать вилкой по тарелке', () => S.sfxClink(1.6));
  onTable(g); return g;
}
export function candle(x, y, z, { on = true } = {}) {
  const g = grp(x, z, 0, y);
  C(g, 0.04, 0.05, 0.03, 8, col(0xa08040), 0, 0, 0); C(g, 0.022, 0.022, 0.16, 8, col(0xf0e8d0), 0, 0.03, 0);
  const fl = new THREE.Mesh(new THREE.ConeGeometry(0.014, 0.05, 6), emis(0xffa030, 1.6)); fl.position.y = 0.215; g.add(fl); fl.userData.noMerge = true;
  const a = anchor(x, y + 0.3, z, { color: 0xff9a40, intensity: 0.9, distance: 2.6, flicker: 0.3, on, grid: false });
  const set = v => { a.on = v; fl.visible = v; };
  set(on);
  W.animated.push((dt, t) => { if (fl.visible) fl.scale.y = 0.85 + Math.sin(t * 17 + x * 9) * 0.15; });
  hitBox(g, 0.14, 0.28, 0.14);
  interact(g, () => a.on ? 'Задуть свечу' : 'Зажечь свечу', () => { if (a.on) S.sfxCurtain(); else S.sfxSwitch(); set(!a.on); });
  onTable(g); return g;
}
export function chips(x, y, z, n = 3) {
  const g = grp(x, z, Math.random() * 3, y);
  const cs = [0xb01020, 0x1a3a8a, 0x111111, 0xe8e0d0, 0x2a7a3a];
  for (let k = 0; k < n; k++) { const h = 0.02 + Math.floor(Math.random() * 6) * 0.006; C(g, 0.022, 0.022, h, 10, col(cs[(k + n) % cs.length]), (k % 2) * 0.05 - 0.02, 0, Math.floor(k / 2) * 0.05); }
  hitBox(g, 0.16, 0.08, 0.16);
  interact(g, 'Перебрать фишки', () => { for (let i = 0; i < 4; i++) setTimeout(() => S.sfxClink(2.2 + Math.random() * 0.3), i * 70); });
  onTable(g); return g;
}
export function tv(x, y, z, ry, { on = false, big = false, screen = null } = {}) {
  const g = grp(x, z, ry, y); const s = big ? 1.3 : 1;
  B(g, 0.6 * s, 0.48 * s, 0.36 * s, col(0x24201c), 0, 0, 0.02 * s);
  B(g, 0.4 * s, 0.32 * s, 0.14 * s, col(0x1a1612), 0, 0.08 * s, -0.23 * s);
  const offMat = col(0x0a120e, { emissive: 0x020604 });
  const onMat = screen ? basic('scr' + screen.uuid, { map: screen }) : basic('static', { map: TX.staticTex() });
  const sc = plane(0.48 * s, 0.36 * s, on ? onMat : offMat, 0, 0.24 * s, 0.2 * s + 0.015, 0, 0, { parent: g }); sc.userData.noMerge = true;
  const a = anchor(0, 0, 0, { color: 0x9ab8ff, intensity: 1.2, distance: 3, on }); a.pos.copy(wp(g, 0, 0.25, 0.6));
  let isOn = on; const snd = screen ? null : soundSpot('static', wp(g, 0, 0.3, 0.3), 0.035, 5);
  if (snd) snd.active = on;
  const set = v => { isOn = v; sc.material = v ? onMat : offMat; a.on = v; if (snd) snd.active = v; };
  interact(g, () => isOn ? 'Выключить телевизор' : 'Включить телевизор', () => { S.sfxClick(); set(!isOn); });
  g.userData.setOn = set; g.userData.top = 0.48 * s;
  mount(g, 'support'); return g;
}
export function phoneProp(x, y, z, ry, msg) {
  const g = grp(x, z, ry, y);
  B(g, 0.2, 0.07, 0.16, col(0x3a0a10), 0, 0, 0); B(g, 0.22, 0.05, 0.06, col(0x4a0e14), 0, 0.08, 0);
  hitBox(g, 0.28, 0.16, 0.24);
  let busy = false;
  interact(g, 'Снять трубку', () => {
    if (busy) return; busy = true; S.loopStart('dial', 'dialtone');
    setTimeout(() => { S.loopStop('dial'); G.subtitle(typeof msg === 'function' ? msg() : msg); busy = false; }, 1400);
  });
  onTable(g); return g;
}
// Компьютер: файлы читаются в окне «SIMULACRE-OS»
export function computer(x, y, z, ry, name, files, { on = true } = {}) {
  const g = grp(x, z, ry, y);
  B(g, 0.42, 0.36, 0.4, col(0xc8bca0), 0, 0.06, -0.02);
  B(g, 0.3, 0.06, 0.3, col(0xb8ac90), 0, 0, -0.02);
  B(g, 0.44, 0.03, 0.15, col(0xb8ac90), 0, 0, 0.3);
  const scr = plane(0.32, 0.25, on ? basic('pcOn', { map: TX.screenTex(['SIMULACRE-OS 98', '', '> ' + name.toUpperCase(), '', 'нажми E']) }) : col(0x0a120e), 0, 0.25, 0.196, 0, 0, { parent: g });
  scr.userData.noMerge = true;
  anchor(0, 0, 0, { color: 0x80ffb0, intensity: 0.8, distance: 2.4, grid: false }).pos.copy(wp(g, 0, 0.3, 0.5));
  hitBox(g, 0.5, 0.45, 0.6);
  interact(g, 'Компьютер: ' + name, () => { S.sfxTypewriter(3); G.computer(name, files); });
  onTable(g); return g;
}
export function typewriter(x, y, z, ry, title, text, story) {
  const g = grp(x, z, ry, y);
  B(g, 0.4, 0.1, 0.32, col(0x1a1a1a), 0, 0, 0); B(g, 0.44, 0.06, 0.06, col(0x2a2a2a), 0, 0.1, -0.08);
  B(g, 0.24, 0.005, 0.18, col(0xe8e0c8), 0, 0.17, -0.12).rotation.x = -0.6;
  hitBox(g, 0.46, 0.25, 0.36);
  interact(g, 'Напечатать на машинке', () => { S.sfxTypewriter(10); setTimeout(() => G.note(title, text, story), 1200); });
  onTable(g); return g;
}
export function recordPlayer(x, y, z, ry) {
  const g = grp(x, z, ry, y);
  B(g, 0.42, 0.1, 0.34, woodM('#4a2a14'), 0, 0, 0);
  const disc = C(g, 0.14, 0.14, 0.01, 18, col(0x0e0e0e), -0.03, 0.1, 0); disc.userData.noMerge = true;
  C(g, 0.04, 0.04, 0.012, 10, col(0xb02020), -0.03, 0.1, 0).userData.noMerge = true;
  let spin = false; W.animated.push(dt => { if (spin) disc.rotation.y += dt * 3.5; });
  hitBox(g, 0.46, 0.2, 0.38);
  interact(g, () => spin ? 'Снять иглу' : 'Поставить пластинку', () => {
    spin = !spin; S.sfxClick();
    if (spin) { [64, 67, 71, 74, 72, 69, 67, 64].forEach((n, i) => S.sfxPiano(n, 0.07, i * 0.45)); G.toast('Пластинка «Полдень навсегда». На конверте — автограф Л. Орлова.'); }
  });
  onTable(g); return g;
}
export function radio(x, y, z, ry) {
  const g = grp(x, z, ry, y);
  B(g, 0.38, 0.22, 0.16, woodM('#5a3018'), 0, 0, 0);
  plane(0.18, 0.14, col(0x2a2018), -0.07, 0.11, 0.092, 0, 0, { parent: g });
  plane(0.1, 0.04, emis(0xffa040, 0.8), 0.1, 0.15, 0.092, 0, 0, { parent: g });
  hitBox(g, 0.44, 0.28, 0.24);
  interact(g, 'Переключить радиостанцию', () => { const n = S.nextStation(); G.toast('📻 ' + n); });
  onTable(g); return g;
}
export function globe(x, y, z) {
  const g = grp(x, z, 0, y);
  C(g, 0.08, 0.1, 0.03, 10, col(0x3a2414), 0, 0, 0); C(g, 0.012, 0.012, 0.12, 5, col(0xa08040), 0, 0.03, 0);
  const s = new THREE.Mesh(new THREE.IcosahedronGeometry(0.15, 1), col(0xa8885a, { flatShading: true })); s.position.y = 0.3; s.userData.noMerge = true; g.add(s);
  let v = 0; W.animated.push(dt => { s.rotation.y += v * dt; v *= 0.985; });
  interact(g, 'Крутануть глобус', () => { v = 9; S.sfxSlide(); setTimeout(() => G.toast('Глобус останавливается. Под пальцем — пустыня. Везде пустыня.'), 1600); });
  onTable(g); return g;
}

// ---------- крупные предметы ----------
export function plant(x, z, { s = 1, y = Y() } = {}) {
  const g = grp(x, z, Math.random() * 6, y);
  C(g, 0.22 * s, 0.16 * s, 0.4 * s, 8, col(0x5a3020), 0, 0, 0);
  const lm = col(0x2a4a24, { flatShading: true });
  for (let i = 0; i < 4; i++) {
    const l = new THREE.Mesh(new THREE.IcosahedronGeometry(0.28 * s, 0), lm);
    l.position.set(((i % 2) - 0.5) * 0.18 * s, (0.6 + i * 0.25) * s, (i > 1 ? 0.08 : -0.08) * s); l.scale.y = 1.4; g.add(l);
  }
  interact(g, 'Потрогать листья', () => { S.sfxPaper(); G.toast(pick(['Пластиковые. Пыльные.', 'Под листом прилеплена жвачка 1999 года.', 'Земля в горшке влажная. Кто-то поливает.'])); });
  solid(g, 0.45 * s, 0.45 * s, 1.5 * s); floor(g); return g;
}
export function palm(x, z, { y = Y(), s = 1 } = {}) {
  const g = grp(x, z, Math.random() * 6, y);
  C(g, 0.3 * s, 0.24 * s, 0.5 * s, 10, col(0x5a3020), 0, 0, 0);
  C(g, 0.05 * s, 0.07 * s, 1.6 * s, 6, col(0x4a3420), 0, 0.5 * s, 0);
  const lm = col(0x2a4a28, { side: THREE.DoubleSide });
  for (let i = 0; i < 7; i++) {
    const l = new THREE.Mesh(new THREE.PlaneGeometry(0.25 * s, 1.1 * s), lm);
    l.position.set(0, 2.05 * s, 0); l.rotation.order = 'YXZ'; l.rotation.set(-1.0, i / 7 * P * 2, 0);
    l.translateY(0.5 * s); g.add(l);
  }
  interact(g, 'Потрогать пальму', () => { S.sfxPaper(); G.toast('Шелестит, хотя ветра нет.'); });
  solid(g, 0.6 * s, 0.6 * s, 2 * s); floor(g); return g;
}
export function rug(x, z, w, d, tex, { y = Y(), whole = false } = {}) {
  const mat = texMat('rug' + tex.uuid, tex, 0xffffff, { polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2 }, 0);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat);
  if (!whole) m.geometry.attributes.uv.array.forEach((v, i, a) => { a[i] = v * (i % 2 ? d : w) / 1.6; });
  m.rotation.x = -P / 2; m.position.set(x, y + 0.01, z); m.userData.noMerge = true; W.group.add(m);
  // кайма
  const bm = col(0x1a0c06, { polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2 });
  for (const [bw, bd, bx, bz] of [[w + 0.16, 0.08, 0, d / 2 + 0.04], [w + 0.16, 0.08, 0, -d / 2 - 0.04], [0.08, d, w / 2 + 0.04, 0], [0.08, d, -w / 2 - 0.04, 0]]) {
    const b = new THREE.Mesh(new THREE.PlaneGeometry(bw, bd), bm); b.rotation.x = -P / 2; b.position.set(x + bx, y + 0.01, z + bz); b.userData.noMerge = true; W.group.add(b);
  }
  return m;
}
// Шторы у окна: axis/c — стена, s0..s1 — проём, inside — сторона комнаты
export function curtains(axis, c, s0, s1, y0, inside, color = 0x6a1a24) {
  const m = col(color, { side: THREE.DoubleSide });
  const panels = [];
  const mk = (from, dir) => {
    const g = new THREE.Group(); W.group.add(g);
    for (let i = 0; i < 5; i++) {
      const p = new THREE.Mesh(boxGeo(0.1, 2.6, 0.05), m); p.position.set(dir * (i * 0.1 + 0.05), 1.3, (i % 2) * 0.05); g.add(p);
    }
    if (axis === 'x') { g.position.set(from, y0 + 0.35, c + inside * HANG); }
    else { g.position.set(c + inside * HANG, y0 + 0.35, from); g.rotation.y = P / 2; }
    panels.push(g); return g;
  };
  // Шторы висят близко к стене и заходят за край окна на 45 см: косые лучи низкого солнца
  // не проскальзывают в щель между краем задёрнутой шторы и стеной.
  const HANG = 0.16, OVER = 0.45;
  mk(s0 - OVER, 1); mk(s1 + OVER, -1);
  const rod = axis === 'x' ? box(s1 - s0 + OVER * 2 + 0.2, 0.04, 0.04, col(0x5a4020), (s0 + s1) / 2, y0 + 2.96, c + inside * HANG) : box(0.04, 0.04, s1 - s0 + OVER * 2 + 0.2, col(0x5a4020), c + inside * HANG, y0 + 2.96, (s0 + s1) / 2);
  for (const e of [s0 - OVER - 0.08, s1 + OVER + 0.08]) axis === 'x' ? box(0.04, 0.04, HANG, col(0x5a4020), e, y0 + 2.96, c + inside * HANG / 2) : box(HANG, 0.04, 0.04, col(0x5a4020), c + inside * HANG / 2, y0 + 2.96, e);
  let closed = false; const span = (s1 - s0) / 2 + OVER;
  // задёрнутые шторы гасят солнечное пятно на полу и затемняют комнату
  const lvl = W.level, mid = (s0 + s1) / 2;
  const me = { closed: false, zone: null };
  (W.curtainList = W.curtainList || []).push(me);
  const resolve = () => {
    if (me.patches) return;
    me.patches = (W.windowPatches || []).filter(p => p.level === lvl && (axis === 'x'
      ? Math.abs(p.cz - c) < 0.4 && p.cx > s0 - 0.1 && p.cx < s1 + 0.1
      : Math.abs(p.cx - c) < 0.4 && p.cz > s0 - 0.1 && p.cz < s1 + 0.1));
    const px = axis === 'x' ? mid : c + inside * 1.0, pz = axis === 'x' ? c + inside * 1.0 : mid;
    me.zone = W.zones.find(z => z.level === lvl && px > z.minX && px < z.maxX && pz > z.minZ && pz < z.maxZ) || null;
  };
  const set = () => {
    for (const g of panels) g.scale.x = closed ? span / 0.5 : 1;
    resolve(); me.closed = closed;
    for (const p of me.patches) { p.curtained = closed; const off = closed || !!W.realSun; p.mesh.userData.off = off; p.mesh.visible = !off; }
    W.shadowDirty = true;
    if (me.zone) { const all = W.curtainList.filter(o => { if (!o.patches && o.resolve) o.resolve(); return o.zone === me.zone; }); me.zone.dark = all.filter(o => o.closed).length / all.length; }
  };
  me.resolve = resolve;
  for (const g of panels) interact(g, () => closed ? 'Раздвинуть шторы' : 'Задёрнуть шторы', () => { closed = !closed; set(); S.sfxCurtain(); });
  return panels;
}
export function wardrobe(x, z, ry, { label = 'Открыть шкаф', action = null } = {}) {
  const g = grp(x, z, ry); const m = woodM('#3a2212');
  B(g, 1.1, 2.1, 0.6, m, 0, 0, 0); B(g, 0.01, 1.9, 0.01, col(0x0a0604), 0, 0.1, 0.305);
  C(g, 0.02, 0.02, 0.03, 6, col(0xc0a050), -0.06, 1.1, 0.31); C(g, 0.02, 0.02, 0.03, 6, col(0xc0a050), 0.06, 1.1, 0.31);
  interact(g, label, action || (() => { S.sfxDoorOpen(); G.toast(pick(['Пустые вешалки звякнули.', 'Внутри пахнет нафталином.', 'На полке — забытый носок.', 'На дне шкафа — билет на автобус. Дата стёрта.'])); }));
  solid(g, 1.1, 0.6, 2.1); floor(g); return g;
}
// Записка. flat — лежит на поверхности; иначе приколота к стене
export function note(x, y, z, ry, title, text, { flat = true, story = null, color = 0xe0d4b4, mountKind = null } = {}) {
  const g = grp(x, z, ry, y);
  const pm = col(color, { emissive: 0x2a2620, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2 });
  const p = plane(0.22, 0.29, pm, 0, flat ? 0.004 : 0, flat ? 0 : 0.01, flat ? -P / 2 : 0, 0, { parent: g }); p.userData.noMerge = true;
  hitBox(g, 0.34, flat ? 0.06 : 0.36, flat ? 0.4 : 0.08, flat ? 0 : -0.18);
  interact(g, 'Прочитать: ' + title, () => { S.sfxPaper(); G.note(title, text, story); });
  mount(g, mountKind || (flat ? 'table' : 'wall'), { w: 0.22, h: 0.29 });
  return g;
}
export function clock(x, y, z, ry, { r = 0.3 } = {}) {
  const g = grp(x, z, ry, y);
  const rim = C(g, r + 0.03, r + 0.03, 0.06, 20, col(0x4a3220), 0, -0.03, 0); rim.rotation.x = P / 2; rim.position.set(0, 0, 0.03);
  const f = new THREE.Mesh(new THREE.CircleGeometry(r, 24), texMat('clock', TX.clockTex(), 0xffffff, { emissive: 0x302820, emissiveMap: TX.clockTex() }, 0));
  f.position.z = 0.075; g.add(f);
  interact(g, 'Посмотреть на часы', () => G.toast('3:33. Секундная стрелка дрожит, но не идёт.'));
  onWall(g, r * 2, r * 2); return g;
}
// Табличка на стене: (x,y,z) — точка на поверхности, ry — нормаль
// Таблички дублируются: главная строка (у заведений — по-французски) и мелкая строка с переводами
export const TRI = {
  'ВЫХОД': ['ВЫХОД', 'EXIT · SORTIE'],
  'ВЫХОД · ЛЕСТНИЦА': ['ВЫХОД · ЛЕСТНИЦА', 'EXIT · STAIRS  ·  SORTIE · ESCALIER'],
  '←  ВЕСТИБЮЛЬ': ['←  ВЕСТИБЮЛЬ', 'LOBBY · HALL D’ACCUEIL'],
  'ПОДВАЛ ↓   ЭТАЖИ ↑': ['ПОДВАЛ ↓   ЭТАЖИ ↑', 'BASEMENT · SOUS-SOL ↓   FLOORS · ÉTAGES ↑'],
  'П О Л Д Е Н Ь': ['Bar « Le Midi »', 'БАР «ПОЛДЕНЬ» · NOON BAR'],
  'ГАРДЕРОБ': ['Vestiaire', 'ГАРДЕРОБ · CLOAKROOM'],
  '«МИРАЖ»': ['Restaurant « Le Mirage »', 'РЕСТОРАН «МИРАЖ» · RESTAURANT'],
  'КАССА': ['Caisse', 'КАССА · CASHIER'],
  'КАЗИНО «ОАЗИС» →': ['Casino « L’Oasis » →', 'КАЗИНО «ОАЗИС» · CASINO'],
  'ОАЗИС': ['L’Oasis', 'КАЗИНО «ОАЗИС» · CASINO'],
  'ВХОД · ENTRANCE': ['ВХОД', 'ENTRANCE · ENTRÉE'],
  'ГАРДЕРОБ · РЕСТОРАН →': ['Vestiaire · Restaurant →', 'ГАРДЕРОБ · РЕСТОРАН  ·  CLOAKROOM · RESTAURANT'],
  'КАЗИНО →': ['Casino →', 'КАЗИНО · CASINO'],
  'УПРАВЛЯЮЩИЙ': ['УПРАВЛЯЮЩИЙ', 'MANAGER · DIRECTION'],
  'ОПАСНО': ['ОПАСНО', 'DANGER · DANGER DE MORT'],
  'КАМЕРА ХРАНЕНИЯ': ['КАМЕРА ХРАНЕНИЯ', 'LUGGAGE ROOM · CONSIGNE'],
  'FUMOIR · КУРИТЕЛЬНАЯ': ['Fumoir', 'КУРИТЕЛЬНАЯ · SMOKING ROOM'],
  'BIBLIOTHÈQUE': ['Bibliothèque', 'БИБЛИОТЕКА · LIBRARY'],
  'SALLE DE BAL': ['Salle de bal', 'БАЛЬНЫЙ ЗАЛ · BALLROOM'],
  'PISCINE': ['Piscine', 'БАССЕЙН · SWIMMING POOL'],
  'ЭЙДОСЫ': ['ЭЙДОСЫ', 'IDEAS · IDÉES'],
  'АРХИВ': ['АРХИВ', 'ARCHIVE · ARCHIVES'],
  'ПОДСОБКА': ['ПОДСОБКА', 'STOREROOM · DÉBARRAS'],
  'КУХНЯ': ['КУХНЯ', 'KITCHEN · CUISINE'],
  'БАР': ['Bar « Le Midi »', 'БАР «ПОЛДЕНЬ» · BAR'],
  'М': ['М', 'MEN · HOMMES'],
  'Ж': ['Ж', 'WOMEN · FEMMES'],
  'ПЕРСОНАЛ': ['ПЕРСОНАЛ', 'STAFF ONLY · PERSONNEL'],
  'ИГРЫ': ['Salle de jeux', 'ИГРОВОЙ ЗАЛ · ARCADE'],
  'НАБЛЮДЕНИЕ': ['НАБЛЮДЕНИЕ', 'SECURITY · SURVEILLANCE'],
  'КАМЕРА ХРАНЕНИЯ ': ['КАМЕРА ХРАНЕНИЯ', 'LUGGAGE ROOM · CONSIGNE'],
  'КОТЕЛЬНАЯ': ['КОТЕЛЬНАЯ', 'BOILER ROOM · CHAUFFERIE'],
  'ПРАЧЕЧНАЯ': ['ПРАЧЕЧНАЯ', 'LAUNDRY · BLANCHISSERIE'],
  'СКЛАД МЕБЕЛИ': ['СКЛАД МЕБЕЛИ', 'FURNITURE STORE · GARDE-MEUBLE'],
  'ЭЛЕКТРОЩИТОВАЯ': ['ЭЛЕКТРОЩИТОВАЯ', 'ELECTRICAL · LOCAL ÉLECTRIQUE'],
  'ВИННЫЙ ПОГРЕБ': ['ВИННЫЙ ПОГРЕБ', 'WINE CELLAR · CAVE À VIN'],
};
export function tri(text) {
  if (TRI[text]) return TRI[text];
  let m = /^ЭТАЖ (\d+)$/.exec(text); if (m) return [text, `FLOOR ${m[1]} · ÉTAGE ${m[1]}`];
  m = /^(\d)01 – \d08  →$/.exec(text); if (m) return [text, 'ROOMS · CHAMBRES'];
  return null;
}
export function sign(text, x, y, z, ry, { w = 0.6, h = 0.22, bg = '#1a120c', fg = '#e0c890', glowing = false, family, border = true, qa = true } = {}) {
  const t3 = tri(text); if (t3) { text = t3.join('\n'); h *= 1.5; }
  const tex = TX.signTex(text, { aspect: w / h, bg, fg, family: family || 'Georgia, serif', border, glowText: glowing, sub: !!t3 });
  const m = glowing ? basic('sign' + text.replace(/\n/g, '|') + fg + w, { map: tex }) : texMat('sign' + text.replace(/\n/g, '|') + bg + fg + w, tex, 0xffffff, { emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.2 }, 0);
  const g = grp(x, z, ry, y);
  B(g, w + 0.03, h + 0.03, 0.016, col(0x140c08), 0, -h / 2 - 0.015, 0.008);
  const p = plane(w, h, m, 0, 0, 0.03, 0, 0, { parent: g }); p.userData.noMerge = true;
  if (qa) onWall(g, w, h);
  return g;
}
export function exitSign(x, y, z, ry) {
  const s = sign('ВЫХОД', x, y, z, ry, { w: 0.45, h: 0.16, bg: '#0a2a14', fg: '#6aff9a', glowing: true, family: 'Arial, sans-serif' });
  glow(x + Math.sin(ry) * 0.03, y, z + Math.cos(ry) * 0.03, 0.9, 0x40ff80, 0.16, { rx: 0, ry });
  return s;
}
export function column(x, z, h, { r = 0.35, mat = null, y = Y() } = {}) {
  const m = mat || col(0x2a3a30);
  cyl(r, r, h, 14, m, x, y, z);
  cyl(r + 0.1, r + 0.12, 0.25, 14, col(0x1a1410), x, y, z);
  cyl(r + 0.12, r + 0.05, 0.3, 14, col(0x6a5020, { emissive: 0x100800 }), x, y + h - 0.3, z);
  addCollider(x - r, y, z - r, x + r, y + h, z + r);
}
export function piano(x, z, ry, { onPlay = null, sheet = null } = {}) {
  // корпус уходит от клавиатуры назад (по -Z), крышка откинута на петлях правого борта
  const g = grp(x, z, ry); const k = col(0x120c0c, { emissive: 0x060404 });
  const body = new THREE.Shape(); body.moveTo(-0.75, 0); body.lineTo(0.75, 0); body.lineTo(0.75, -1.2); body.quadraticCurveTo(0.6, -2.0, 0, -2.0); body.quadraticCurveTo(-0.75, -1.9, -0.75, -1.2); body.closePath();
  const m = new THREE.Mesh(new THREE.ExtrudeGeometry(body, { depth: 0.3, bevelEnabled: false, curveSegments: 8 }), k);
  m.rotation.x = P / 2; m.position.y = 0.98; g.add(m);
  const hinge = new THREE.Group(); hinge.position.set(0.75, 0.985, 0); hinge.rotation.z = -0.5; g.add(hinge);
  const lid = new THREE.Mesh(new THREE.ShapeGeometry(body, 8), col(0x120c0c, { side: THREE.DoubleSide })); lid.rotation.x = P / 2; lid.position.x = -0.75; hinge.add(lid);
  B(g, 0.025, 0.7, 0.025, col(0x2a2018), -0.42, 0.98, -1.0); // подпорка крышки
  B(g, 1.56, 0.14, 0.32, k, 0, 0.78, 0.16); // клавишный блок
  B(g, 1.42, 0.03, 0.2, col(0xe8e0d0), 0, 0.92, 0.19);
  for (let i = 0; i < 20; i++) if (i % 7 !== 2 && i % 7 !== 6) B(g, 0.03, 0.03, 0.1, k, -0.68 + i * 0.072, 0.95, 0.14);
  const stand = new THREE.Mesh(boxGeo(0.8, 0.28, 0.02, 1), k); stand.position.set(0, 1.12, -0.06); stand.rotation.x = -0.25; g.add(stand);
  for (const [a, b] of [[-0.62, -0.15], [0.62, -0.15], [0.0, -1.8]]) B(g, 0.09, 0.68, 0.09, k, a, 0, b);
  B(g, 0.22, 0.55, 0.05, k, 0, 0.12, -0.12); B(g, 0.2, 0.03, 0.12, col(0xb09040), 0, 0.06, -0.06);
  const chords = [[60, 64, 67, 71], [57, 60, 64, 67], [62, 65, 69, 72], [55, 59, 62, 65], [53, 57, 60, 64]];
  let ci = 0;
  interact(g, 'Сыграть на рояле', () => { const ch = chords[ci++ % chords.length]; ch.forEach((n, i) => S.sfxPiano(n, 0.1, i * 0.09)); if (onPlay) onPlay(ci); });
  solid(g, 1.6, 2.35, 1.0, 0, -0.85); floor(g);
  if (sheet) { const sp = wp(g, 0, 1.0, -0.035); const n = note(sp.x, sp.y + 0.12, sp.z, ry, sheet[0], sheet[1], { ...sheet[2], flat: false, mountKind: 'hang' }); n.rotation.x = -0.25; n.rotation.order = 'YXZ'; }
  const bp = wp(g, 0, 0, 0.62);
  const bn = grp(bp.x, bp.z, ry); B(bn, 0.8, 0.08, 0.35, k, 0, 0.45, 0);
  for (const a of [-0.35, 0.35]) B(bn, 0.05, 0.45, 0.3, k, a, 0, 0);
  seat(bn, 'Сесть за рояль', { eye: 1.2, yawOff: P }); floor(bn);
  return g;
}
export function vending(x, z, ry) {
  const g = grp(x, z, ry);
  B(g, 0.9, 1.9, 0.75, col(0x7a1424), 0, 0, 0);
  plane(0.6, 1.2, emis(0xffd8b0, 0.6), -0.08, 1.1, 0.382, 0, 0, { parent: g });
  for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) B(g, 0.08, 0.16, 0.02, col([0xd04040, 0x40a0d0, 0xe0c040, 0x60c060][(r + c) % 4], { emissive: 0x222222 }), -0.3 + c * 0.15, 0.62 + r * 0.28, 0.38);
  B(g, 0.15, 0.6, 0.02, col(0x1a1a1a), 0.33, 1.1, 0.38); B(g, 0.5, 0.15, 0.02, col(0x050505), -0.08, 0.2, 0.38);
  anchor(0, 0, 0, { color: 0xffc0a0, intensity: 1.5, distance: 3.5, grid: false }).pos.copy(wp(g, 0, 1.1, 0.8));
  const names = ['«Закат» апельсиновая', 'Персиковый чай «Пустыня»', 'Вишнёвая газировка «∞»', 'Минеральная вода «Тишина»', 'Ничего. Монетка вернулась.'];
  interact(g, 'Купить газировку', () => { S.sfxVending(); setTimeout(() => G.toast('Выпало: ' + pick(names)), 1300); });
  solid(g, 0.9, 0.75, 1.9); floor(g); return g;
}
export function payphone(x, y, z, ry, msg) {
  const g = grp(x, z, ry, y);
  B(g, 0.4, 0.7, 0.18, col(0x3a4a4a), 0, -0.35, 0.09); B(g, 0.08, 0.25, 0.08, col(0x111111), -0.12, -0.15, 0.22);
  for (let i = 0; i < 12; i++) B(g, 0.04, 0.04, 0.02, col(0xbbbbbb), 0.03 + (i % 3) * 0.06, -0.2 + Math.floor(i / 3) * 0.06, 0.19);
  let busy = false;
  interact(g, 'Позвонить', () => {
    if (busy) return; busy = true; S.loopStart('pp', 'dialtone');
    setTimeout(() => { S.loopStop('pp'); S.sfxTypewriter(7); setTimeout(() => { G.subtitle(typeof msg === 'function' ? msg() : msg); busy = false; }, 900); }, 1200);
  });
  onWall(g, 0.4, 0.7); return g;
}
export function sink(x, z, ry, { mirror = true } = {}) {
  const g = grp(x, z, ry); const por = col(0xd8d4c8);
  B(g, 0.6, 0.15, 0.45, por, 0, 0.75, 0); C(g, 0.06, 0.08, 0.75, 8, por, 0, 0, -0.05);
  B(g, 0.03, 0.15, 0.03, col(0xb8b8b8), 0, 0.9, -0.18);
  if (mirror) { const mr = plane(0.6, 0.8, col(0x50606a, { emissive: 0x101c20 }), 0, 1.6, -0.198, 0, 0, { parent: g }); mr.userData.noMerge = true; B(g, 0.66, 0.86, 0.02, col(0x8a7a5a), 0, 1.17, -0.225); }
  const snd = soundSpot('water', wp(g, 0, 0.9, 0), 0.12, 6); let on = false;
  interact(g, () => on ? 'Закрыть кран' : 'Открыть кран', () => { on = !on; S.sfxClick(); snd.active = on; });
  if (mirror) { const mp = wp(g, 0, 0, -0.2); const mh = grp(mp.x, mp.z, ry, Y() + 1.2); hitBox(mh, 0.6, 0.8, 0.05); interact(mh, 'Посмотреть в зеркало', () => G.toast(pick(['В зеркале — пустая уборная. Тебя там нет.', 'Отражение моргнуло позже тебя.', 'За твоей спиной в отражении — окно. Здесь нет окна.', 'Всё нормально. Просто ты.']))); }
  solid(g, 0.6, 0.45, 0.9); floor(g); return g;
}
export function toilet(x, z, ry) {
  const g = grp(x, z, ry); const por = col(0xd8d4c8);
  B(g, 0.38, 0.4, 0.5, por, 0, 0, 0.05); B(g, 0.42, 0.06, 0.55, por, 0, 0.4, 0.05); B(g, 0.45, 0.4, 0.18, por, 0, 0.42, -0.22);
  interact(g, 'Смыть', () => S.sfxFlush());
  solid(g, 0.45, 0.6, 0.8); floor(g); return g;
}
export function bathtub(x, z, ry) {
  const g = grp(x, z, ry); const por = col(0xd8d4c8);
  B(g, 0.8, 0.55, 1.7, por, 0, 0, 0); B(g, 0.62, 0.02, 1.5, col(0x4a7a8a, { emissive: 0x0a2028 }), 0, 0.5, 0);
  const snd = soundSpot('water', wp(g, 0, 0.6, 0), 0.12, 6);
  interact(g, 'Открыть воду', () => { snd.active = true; setTimeout(() => { snd.active = false; }, 3000); G.toast('Вода тёплая. Пахнет хлоркой и чем-то сладким.'); });
  solid(g, 0.8, 1.7, 0.55); floor(g); return g;
}
export function washer(x, z, ry) {
  const g = grp(x, z, ry);
  B(g, 0.65, 0.85, 0.6, col(0xc8c4b8), 0, 0, 0);
  const d = new THREE.Mesh(new THREE.CircleGeometry(0.22, 16), col(0x2a3a4a, { emissive: 0x0a1018 })); d.position.set(0, 0.42, 0.318); g.add(d);
  B(g, 0.55, 0.1, 0.02, col(0x555555), 0, 0.72, 0.31);
  interact(g, 'Запустить стирку', () => { S.sfxWasher(); let t = 0; const x0 = g.position.x; const iv = setInterval(() => { t++; g.position.x = x0 + (t % 2 ? 0.008 : -0.008); if (t > 60) { clearInterval(iv); g.position.x = x0; } }, 90); });
  solid(g, 0.65, 0.6, 0.85); floor(g); return g;
}
export function shelf(x, z, ry, { w = 1.8, h = 2.2, d = 0.45, fill = 'boxes', color = 0x5a5048, books = false, full = false } = {}) {
  const g = grp(x, z, ry); const m = col(color);
  for (const a of [-w / 2, w / 2]) B(g, 0.04, h, d, m, a, 0, 0);
  B(g, w, 0.04, d, m, 0, h - 0.04, 0);
  const n = full ? Math.max(4, Math.floor((h - 0.1) / 0.4) + 1) : 4; let seed = Math.round(x * 13 + z * 7);
  const rr = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
  for (let i = 0; i < n; i++) {
    const yy = 0.1 + i * (h - 0.25) / (n - 1); B(g, w, 0.03, d, m, 0, yy, 0);
    if (i === n - 1) continue;
    for (let k = 0; k < 3; k++) {
      if (!full && rr() < 0.2) continue;
      const cx = -w / 2 + (k + 0.5) * w / 3;
      if (fill === 'boxes') B(g, w / 3 - 0.12, 0.28, d * 0.8, col([0x7a5a34, 0x6a4c2c, 0x8a6a44][k]), cx, yy + 0.03, 0);
      else if (fill === 'towels') for (let t = 0; t < 3; t++) B(g, w / 3 - 0.14, 0.08, d * 0.8, col(0xe0dacc), cx, yy + 0.03 + t * 0.085, 0);
      else if (fill === 'files') for (let t = 0; t < 6; t++) B(g, 0.06, 0.26 + rr() * 0.08, d * 0.75, col([0x3a4a6a, 0x6a2a2a, 0x4a5a2a, 0x7a6a3a, 0x2a2a2a][(t + k) % 5]), cx - 0.18 + t * 0.07, yy + 0.03, 0);
      else if (fill === 'books') { const gap = (h - 0.25) / (n - 1) - 0.05, nb = Math.floor((w / 3 - (full ? 0.02 : 0.1)) / 0.062); for (let t = 0; t < nb; t++) B(g, 0.055, Math.min(gap, 0.24 + rr() * 0.12), d * 0.8, col([0x8a2a2a, 0x2a4a8a, 0x9a7a2a, 0x3a7a3a, 0x9a4a2a, 0x6a2a6a, 0xc8b890][(t * 3 + k + i) % 7], { emissive: 0x0a0806 }), cx - nb * 0.062 / 2 + 0.031 + t * 0.062, yy + 0.03, 0); }
      else if (fill === 'wine') for (let t = 0; t < 5; t++) { const b = C(g, 0.035, 0.035, d * 0.8, 8, col([0x2a0a10, 0x1a3a1a][t % 2]), cx - 0.16 + t * 0.08, yy + 0.07, 0); b.rotation.x = P / 2; b.position.y = yy + 0.07; }
    }
  }
  if (books || fill === 'books') interact(g, 'Взять книгу с полки', () => { S.sfxPaper(); if (G.library && Math.random() < 0.75) G.library(); else G.toast('«' + pick(BOOKS) + '»'); });
  solid(g, w, d, h); floor(g); return g;
}
const BOOKS = ['Путеводитель по пустыне. Издание 0', 'Как выписаться из отеля (страницы вырваны)', 'Сборник рецептов ресторана «Мираж»', 'Теория вероятностей для начинающих игроков', 'Символы и знаки — Р. Генон (с пометками на полях)', 'Справочник постояльца, 1999', 'Роман без последней главы', 'Атлас звёздного неба (звёзд нет)', 'Ноты: «Полдень навсегда», Л. Орлов'];
export function boiler(x, z) {
  const g = grp(x, z);
  C(g, 0.7, 0.7, 2.6, 14, col(0x6a4430), 0, 0, 0);
  C(g, 0.12, 0.12, 1.0, 8, col(0x3a3a3a), 0, 2.6, 0);
  const d = new THREE.Mesh(new THREE.CircleGeometry(0.18, 12), emis(0xff5010, 0.9)); d.position.set(0, 0.6, 0.71); g.add(d);
  anchor(x, Y() + 0.6, z + 1.0, { color: 0xff5010, intensity: 2, distance: 4, flicker: 0.5, grid: false });
  interact(g, 'Постучать по котлу', () => { S.sfxKnock(1); setTimeout(() => S.sfxKnock(2, 0.1), 1500); G.toast('Котёл ответил эхом.'); });
  addCollider(x - 0.7, Y(), z - 0.7, x + 0.7, Y() + 3, z + 0.7); floor(g); return g;
}
export function pipe(x0, y0, z0, x1, y1, z1, r = 0.08, color = 0x4a5a4a) {
  const a = new THREE.Vector3(x0, y0, z0), b = new THREE.Vector3(x1, y1, z1);
  const len = a.distanceTo(b); const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 8), col(color));
  m.position.copy(a).add(b).multiplyScalar(0.5); m.lookAt(b); m.rotateX(P / 2); W.group.add(m); return m;
}
// горизонтальная труба под потолком: подвесы-хомуты через каждые step метров
export function ceilingPipe(x0, x1, y, z, ceilY, r = 0.08, color = 0x4a5a4a, step = 2.5) {
  const m = pipe(x0, y, z, x1, y, z, r, color);
  const hm = col(0x2a2a2a);
  for (let x = Math.min(x0, x1) + 0.6; x < Math.max(x0, x1) - 0.3; x += step) {
    box(0.03, ceilY - y, 0.03, hm, x, y, z);
    box(0.05, 0.05, r * 2 + 0.04, hm, x, y - r - 0.02, z);
    box(0.16, 0.012, 0.16, hm, x, ceilY - 0.012, z);
  }
  return m;
}
export function arcade(x, z, ry, imgGroups = ['05_retro_games_arcade']) {
  const g = grp(x, z, ry);
  B(g, 0.75, 1.75, 0.8, col(0x221438), 0, 0, 0);
  B(g, 0.75, 0.25, 0.4, col(0x32204a), 0, 0.95, 0.4);
  for (let i = 0; i < 4; i++) C(g, 0.03, 0.03, 0.03, 8, col([0xff3050, 0x30a0ff, 0xffd030, 0x30ff80][i], { emissive: 0x333333 }), -0.2 + i * 0.12, 1.2, 0.5);
  const p = picture(imgGroups, 0, 0, 0, 0, 0.5, { qa: false }); if (p) { g.add(p); p.position.set(0, 1.5, 0.4); p.rotation.x = -0.15; }
  plane(0.7, 0.18, emis(0xff40a0, 0.9), 0, 1.92, 0.418, 0, 0, { parent: g });
  anchor(0, 0, 0, { color: 0xb060ff, intensity: 1.4, distance: 3, grid: false }).pos.copy(wp(g, 0, 1.5, 0.9));
  const tunes = [[72, 76, 79, 84], [67, 71, 74, 79, 83], [60, 63, 67, 70, 72]];
  interact(g, 'Сыграть', () => { pick(tunes).forEach((n, i) => S.sfxPiano(n, 0.05, i * 0.08)); G.toast('INSERT COIN · HI-SCORE: 999999 · «???»'); });
  solid(g, 0.75, 0.8, 1.9); floor(g); return g;
}
export function ceilingFan(x, z, y) {
  const g = grp(x, z, 0, y);
  C(g, 0.02, 0.02, 0.4, 5, col(0x3a2a18), 0, -0.4, 0); C(g, 0.12, 0.1, 0.12, 10, col(0x4a3418), 0, -0.52, 0);
  const rot = new THREE.Group(); rot.position.y = -0.48; g.add(rot);
  for (let i = 0; i < 4; i++) { const b = new THREE.Mesh(boxGeo(0.7, 0.015, 0.14, 1), col(0x4a2c18)); b.position.x = 0.42; const h = new THREE.Group(); h.rotation.y = i * P / 2; h.add(b); rot.add(h); }
  W.animated.push(dt => { rot.rotation.y += dt * 2.2; });
  mount(g, 'ceiling'); return g;
}
export function luggageCart(x, z, ry) {
  const g = grp(x, z, ry); const brass = col(0xa08030, { emissive: 0x1a1000 });
  B(g, 1.1, 0.06, 0.6, col(0x6a1a22), 0, 0.22, 0);
  for (const a of [-0.5, 0.5]) { C(g, 0.02, 0.02, 1.6, 6, brass, a, 0.25, 0); }
  const topBar = C(g, 0.025, 0.025, 1.0, 6, brass, 0, 1.85, 0); topBar.rotation.z = P / 2; topBar.position.y = 1.85;
  B(g, 0.5, 0.35, 0.3, col(0x4a3420), -0.2, 0.28, 0); B(g, 0.35, 0.25, 0.4, col(0x6a5a44), 0.25, 0.28, 0);
  for (const [a, b] of [[-0.45, -0.25], [0.45, -0.25], [-0.45, 0.25], [0.45, 0.25]]) { const wh = C(g, 0.08, 0.08, 0.04, 10, col(0x111111), a, 0, b); wh.rotation.x = P / 2; wh.position.y = 0.08; }
  interact(g, 'Осмотреть багаж', () => G.toast('Бирки на чемоданах: «Номер 0». Внутри пусто.'));
  solid(g, 1.1, 0.6, 1.9); floor(g); return g;
}
export function fridge(x, z, ry) {
  const g = grp(x, z, ry); B(g, 0.7, 1.8, 0.65, col(0xc8c0b0), 0, 0, 0); B(g, 0.02, 0.4, 0.04, col(0x888888), 0.28, 1.0, 0.34);
  interact(g, 'Открыть холодильник', () => { S.sfxDoorOpen(); G.toast(pick(['Внутри — один лимон и лёд.', 'Пусто. Лампочка мигает.', 'Пахнет 1999 годом.', 'Торт с надписью «С открытием!». Свечи не тронуты.'])); });
  solid(g, 0.7, 0.65, 1.8); floor(g); return g;
}
export function counter(x0, z0, x1, z1, h = 1.05, { top: tc = 0x1a1210, front = '#4a1e16' } = {}) {
  const y = Y();
  box(Math.abs(x1 - x0), h - 0.05, Math.abs(z1 - z0), woodM(front), (x0 + x1) / 2, y, (z0 + z1) / 2);
  box(Math.abs(x1 - x0) + 0.1, 0.05, Math.abs(z1 - z0) + 0.1, col(tc, { emissive: 0x050302 }), (x0 + x1) / 2, y + h - 0.05, (z0 + z1) / 2);
  addCollider(Math.min(x0, x1), y, Math.min(z0, z1), Math.max(x0, x1), y + h, Math.max(z0, z1));
}
export function bell(x, y, z) {
  const g = grp(x, z, 0, y);
  C(g, 0.06, 0.07, 0.015, 12, col(0x1a1a1a), 0, 0, 0);
  const d = new THREE.Mesh(new THREE.SphereGeometry(0.055, 12, 6, 0, P * 2, 0, P / 2), col(0xd0b060, { emissive: 0x2a2000 })); d.position.y = 0.015; g.add(d);
  C(g, 0.008, 0.008, 0.03, 5, col(0xd0b060), 0, 0.07, 0);
  hitBox(g, 0.2, 0.15, 0.2);
  interact(g, 'Позвонить в звонок', () => S.sfxBell());
  onTable(g); return g;
}
export function locker(x, z, ry, n = 3, onOpen = null) {
  const g = grp(x, z, ry);
  for (let i = 0; i < n; i++) {
    B(g, 0.38, 1.9, 0.45, col(0x4a5a5a), (i - (n - 1) / 2) * 0.4, 0, 0);
    for (let k = 0; k < 4; k++) B(g, 0.22, 0.02, 0.01, col(0x1a2222), (i - (n - 1) / 2) * 0.4, 1.5 + k * 0.05, 0.23);
  }
  interact(g, 'Открыть шкафчик', onOpen || (() => { S.sfxLocked(); G.toast(pick(['Внутри — униформа с бейджем «Персонал».', 'Заперто. За дверцей что-то шуршит.', 'Пусто. Только старый пропуск без фото.'])); }));
  solid(g, n * 0.4, 0.45, 1.9); floor(g); return g;
}
export function fireExt(x, z, ry) {
  // висит на стене: (x,z) — поверхность стены
  const g = grp(x, z, ry);
  B(g, 0.2, 0.04, 0.06, col(0x2a2a2a), 0, 1.15, 0.03);
  C(g, 0.08, 0.08, 0.5, 10, col(0xa01010, { emissive: 0x200000 }), 0, 0.6, 0.1);
  C(g, 0.03, 0.03, 0.08, 6, col(0x222222), 0, 1.1, 0.1);
  interact(g, 'Осмотреть огнетушитель', () => G.toast('Проверен: 03.03.1999. Подпись неразборчива.'));
  mount(g, 'wall', { w: 0.2, h: 0.04, dy: 1.17 }); return g;
}
export function stackedChairs(x, z, ry, n = 5) {
  const g = grp(x, z, ry);
  for (let i = 0; i < n; i++) { B(g, 0.44, 0.06, 0.42, col(0x6a2026), 0, 0.44 + i * 0.12, 0.01); B(g, 0.46, 0.45, 0.04, col(0x4a2a1a), 0, 0.5 + i * 0.12, -0.21); }
  for (const [a, b] of [[-0.2, -0.2], [0.2, -0.2], [-0.2, 0.2], [0.2, 0.2]]) B(g, 0.04, 0.44, 0.04, col(0x4a2a1a), a, 0, b);
  interact(g, 'Снять стул со стопки', () => { S.sfxSit(); G.toast('Стопка качнулась. Лучше не трогать.'); });
  solid(g, 0.5, 0.5, 1.2); floor(g); return g;
}
export function sheetCovered(x, z, ry, w = 1.6, h = 0.9, d = 0.9, msgs = null) {
  const g = grp(x, z, ry);
  const m = new THREE.Mesh(new THREE.DodecahedronGeometry(0.5, 0), col(0xc8c0b0, { flatShading: true }));
  m.scale.set(w, h * 1.6, d); m.position.y = h * 0.8; g.add(m);
  interact(g, 'Приподнять простыню', () => { S.sfxCurtain(); G.toast(pick(msgs || ['Под простынёй — диван. Тёплый, будто кто-то сидел.', 'Под простынёй — ещё одна простыня.', 'Рояль без клавиш.'])); });
  solid(g, w * 0.9, d * 0.9, h); floor(g); return g;
}
export function pickup(x, y, z, id, name, msg, build, story = null) {
  const g = grp(x, z, 0, y); build(g);
  hitBox(g, 0.3, 0.2, 0.3, -0.02);
  interact(g, 'Взять: ' + name, () => { S.sfxPickup(); G.addItem(id, name); g.visible = false; g.userData.gone = true; g.userData.interact = null; if (msg) G.note(name, msg, story); });
  onTable(g); return g;
}
export function keyMesh(g, color = 0xd0b040) {
  const m = col(color, { emissive: 0x302000 });
  const r = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.012, 6, 12), m); r.rotation.x = P / 2; r.position.y = 0.012; g.add(r);
  B(g, 0.12, 0.02, 0.018, m, 0.09, 0.002, 0);
  B(g, 0.02, 0.02, 0.04, m, 0.13, 0.002, 0.02);
}
export function coatRack(x, z, coats = 3) {
  const g = grp(x, z);
  C(g, 0.22, 0.25, 0.04, 10, col(0x2a1a10), 0, 0, 0); C(g, 0.025, 0.025, 1.8, 6, col(0x4a2c18), 0, 0.04, 0);
  for (let i = 0; i < 4; i++) { const a = i * P / 2; const hk = B(g, 0.2, 0.02, 0.02, col(0x8a6a2a), Math.cos(a) * 0.1, 1.72, Math.sin(a) * 0.1); hk.rotation.y = -a; }
  const cc = [0x3a2a24, 0x5a4a3a, 0x2a2a3a, 0x6a2a2a];
  for (let i = 0; i < coats; i++) { const a = i * P / 2; const c = B(g, 0.3, 0.9, 0.12, col(cc[i]), Math.cos(a) * 0.22, 0.85, Math.sin(a) * 0.22); c.rotation.y = -a + P / 2; }
  interact(g, 'Проверить карманы пальто', () => { S.sfxPaper(); G.toast(pick(['В кармане — номерок гардероба №33.', 'Пусто. Только песок.', 'Билет в кино на сеанс «03:33». Фильм не указан.', 'Записка: «встретимся в ресторане, Л.»'])); });
  solid(g, 0.6, 0.6, 1.8); floor(g); return g;
}
export function mic(x, z, ry, onUse) {
  const g = grp(x, z, ry);
  C(g, 0.15, 0.15, 0.02, 12, col(0x1a1a1a), 0, 0, 0); C(g, 0.012, 0.012, 1.45, 6, col(0x9a9a9a), 0, 0, 0);
  const h = new THREE.Mesh(new THREE.SphereGeometry(0.04, 10, 8), col(0x4a4a4a)); h.position.set(0, 1.5, 0.03); g.add(h);
  hitBox(g, 0.3, 1.6, 0.3);
  interact(g, 'Сказать в микрофон', onUse);
  floor(g); return g;
}
export function fireplace(x, z, ry) {
  // стоит у стены: (x,z) — поверхность стены, ry — нормаль
  const g = grp(x, z, ry);
  const st = texMat('fpStone', TX.marble('#3a2a24', '#2a1c18'), 0xffffff, {}, 0);
  // корпус с настоящим зевом: огонь горит внутри ниши, а не за глухой стенкой
  B(g, 0.45, 1.5, 0.6, st, -0.875, 0, 0.3); B(g, 0.45, 1.5, 0.6, st, 0.875, 0, 0.3);
  B(g, 1.3, 0.45, 0.6, st, 0, 1.05, 0.3); B(g, 1.3, 0.15, 0.6, st, 0, 0, 0.3);
  B(g, 2.5, 0.12, 0.75, col(0x5a3a28), 0, 1.5, 0.35);
  const soot = col(0x0c0606);
  B(g, 1.3, 0.9, 0.08, soot, 0, 0.15, 0.04); B(g, 0.02, 0.9, 0.52, soot, -0.64, 0.15, 0.34); B(g, 0.02, 0.9, 0.52, soot, 0.64, 0.15, 0.34);
  B(g, 1.26, 0.02, 0.52, soot, 0, 1.03, 0.34);
  // живой огонь: клеточная симуляция пламени на маленьком холсте (тепло поднимается снизу, остывает и сносится вбок)
  const fire = new THREE.Group(); g.add(fire);
  const flames = [makeFlame(48, 64, 11), makeFlame(40, 56, 29)];
  const fb = new THREE.Mesh(new THREE.PlaneGeometry(1.15, 0.8), flames[0].mat); fb.position.set(0, 0.57, 0.26); fire.add(fb);
  const ff = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 0.6), flames[1].mat); ff.position.set(0.04, 0.47, 0.46); fire.add(ff);
  for (const m of [fb, ff]) { m.userData.noRay = true; m.userData.noMerge = true; }
  for (let i = 0; i < 3; i++) { const l = C(g, 0.06, 0.06, 0.8, 6, col(0x3a2010), 0, 0.16, 0.3 + i * 0.09); l.rotation.z = P / 2; l.rotation.y = (i - 1) * 0.25; l.position.y = 0.21 + (i === 1 ? 0.06 : 0); }
  // угли под поленьями тлеют и «дышат»
  const coalM = col(0x1a0604, { emissive: 0xff4010, emissiveIntensity: 0.8 });
  for (let i = 0; i < 9; i++) { const c = B(g, 0.07 + (i % 3) * 0.02, 0.035, 0.07, coalM, -0.42 + i * 0.105, 0.15, 0.24 + (i % 3) * 0.12); c.rotation.y = i; c.userData.noMerge = true; }
  // искры
  const sparkM = new THREE.MeshBasicMaterial({ color: 0xffb050, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
  const sparks = []; for (let i = 0; i < 7; i++) { const sp = new THREE.Mesh(new THREE.PlaneGeometry(0.02, 0.02), sparkM); sp.userData = { noRay: true, noMerge: true, t: Math.random() * 2, x: 0 }; fire.add(sp); sparks.push(sp); }
  const a = anchor(0, 0, 0, { color: 0xff8030, intensity: 4, distance: 7, flicker: 0, grid: false }); a.pos.copy(wp(g, 0, 0.6, 1.2));
  let ft = 0;
  W.animated.push((dt, t) => {
    if (!fire.visible) return;
    ft += dt; if (ft > 0.05) { ft = 0; for (const f of flames) f.step(); }
    // свет дрожит плавно, как от настоящего пламени, а не мигает
    const n = Math.sin(t * 7.3) * 0.5 + Math.sin(t * 13.1 + 1.7) * 0.3 + Math.sin(t * 2.1) * 0.2;
    a.intensity = 4 * (0.85 + n * 0.18);
    coalM.emissiveIntensity = 0.65 + Math.sin(t * 1.3) * 0.15 + Math.sin(t * 4.7) * 0.08;
    for (const sp of sparks) {
      sp.userData.t += dt * (0.45 + (sp.id % 5) * 0.08);
      if (sp.userData.t > 1) { sp.userData.t = 0; sp.userData.x = (Math.random() - 0.5) * 0.7; }
      const k = sp.userData.t; sp.position.set(sp.userData.x + Math.sin(k * 9 + sp.id) * 0.05, 0.3 + k * 0.7, 0.42);
      sp.scale.setScalar(1 - k * 0.7);
    }
    sparkM.opacity = 0.9;
  });
  let lit = true;
  interact(g, () => lit ? 'Погреть руки у камина' : 'Разжечь камин', () => {
    if (!lit) { lit = true; fire.visible = true; a.on = true; S.sfxSwitch(); return; }
    S.sfxCurtain(); G.toast(pick(['Тепло. Впервые за долгое время по-настоящему тепло.', 'Дрова не сгорают. Огонь горит сам по себе.', 'В золе — обрывок открытки: «…скучаю. С.»']));
  });
  solid(g, 2.4, 0.75, 1.6, 0, 0.35); mount(g, 'wall', { w: 2.2, h: 1.4, dy: 0.75 });
  return g;
}
// ---------- казино ----------
export function slotMachine(x, z, ry) {
  const g = grp(x, z, ry);
  B(g, 0.7, 1.0, 0.6, col(0x8a1a24), 0, 0, 0); B(g, 0.7, 0.7, 0.45, col(0xa02030), 0, 1.0, -0.07);
  B(g, 0.72, 0.2, 0.5, col(0xc8a040, { emissive: 0x302000 }), 0, 1.7, -0.05);
  plane(0.6, 0.14, emis(0xffe080, 1.2), 0, 1.8, 0.218, 0, 0, { parent: g });
  const reels = [];
  for (let i = 0; i < 3; i++) {
    const t = TX.reelTex().clone(); t.needsUpdate = true; t.repeat.set(1, 1 / 6); t.offset.y = Math.floor(Math.random() * 6) / 6;
    const r = plane(0.16, 0.2, basic('reel' + i + x + z, { map: t }), -0.19 + i * 0.19, 1.35, 0.172, 0, 0, { parent: g }); r.userData.noMerge = true;
    reels.push({ t, v: 0, target: 0 });
  }
  const lever = new THREE.Group(); lever.position.set(0.38, 1.1, 0); g.add(lever);
  C(lever, 0.015, 0.015, 0.45, 6, col(0xb8b8b8), 0, 0, 0); const knob = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), col(0xd01020)); knob.position.y = 0.47; lever.add(knob);
  lever.children.forEach(c => c.userData.noMerge = true);
  let spinning = false;
  W.animated.push(dt => {
    for (const r of reels) if (r.v > 0) { r.t.offset.y += r.v * dt; r.v = Math.max(0, r.v - dt * 2.2); if (r.v === 0) r.t.offset.y = r.target / 6; }
    lever.rotation.x *= 0.9;
  });
  anchor(0, 0, 0, { color: 0xff6080, intensity: 1.0, distance: 2.5, grid: false }).pos.copy(wp(g, 0, 1.6, 0.7));
  interact(g, 'Дёрнуть рычаг', () => {
    if (spinning) return; spinning = true; lever.rotation.x = 1.0; S.sfxSlide();
    const res = reels.map((r, i) => { r.v = 3 + i * 0.9; r.target = Math.floor(Math.random() * 6); return r.target; });
    if (Math.random() < 0.12) res.fill(0), reels.forEach(r => r.target = 0);
    const tick = setInterval(() => S.sfxClick(), 90);
    setTimeout(() => {
      clearInterval(tick); spinning = false;
      const s = res.map(i => TX.REEL_SYMBOLS[i]).join(' ');
      if (res.every(v => v === res[0])) { for (let i = 0; i < 14; i++) setTimeout(() => S.sfxClink(2 + Math.random()), i * 60); G.toast(`${s} — ДЖЕКПОТ! Из лотка высыпаются жетоны с надписью «НЕ ДЛЯ ВЫВОДА».`); }
      else G.toast(`${s} — не повезло.`);
    }, 2600);
  });
  solid(g, 0.7, 0.6, 1.9); floor(g); return g;
}
export function roulette(x, z, ry) {
  const g = grp(x, z, ry);
  const felt = texMat('felt', TX.felt('#1a5a3a'), 0xffffff, {}, 0);
  B(g, 2.6, 0.8, 1.2, woodM('#3a1a10'), 0, 0, 0); B(g, 2.5, 0.04, 1.1, felt, 0, 0.8, 0);
  // разметка поля
  for (let i = 0; i < 12; i++) for (let j = 0; j < 3; j++) B(g, 0.085, 0.004, 0.2, col((i * 3 + j) % 2 ? 0xa01818 : 0x141010), 0.0 + i * 0.095, 0.842, -0.25 + j * 0.22);
  B(g, 0.2, 0.004, 0.64, col(0x0a6a3a), -0.15, 0.842, -0.03);
  const WX = -0.68; const bowl = C(g, 0.46, 0.4, 0.14, 24, woodM('#4a2210'), WX, 0.8, 0);
  const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.03, 37), [col(0x3a2210), texMat('rlt', TX.rouletteTex(), 0xffffff, {}, 0), col(0x3a2210)]);
  wheel.position.set(WX, 0.95, 0); g.add(wheel); wheel.userData.noMerge = true;
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 6), col(0xf0f0f0, { emissive: 0x333333 })); ball.position.set(WX, 0.98, 0.32); g.add(ball); ball.userData.noMerge = true;
  let v = 0, ba = 0, bv = 0;
  W.animated.push(dt => {
    wheel.rotation.y += v * dt; v *= 0.992; ba -= bv * dt; bv *= 0.985;
    const r = 0.32 - Math.max(0, 0.08 - bv * 0.01);
    ball.position.set(WX + Math.cos(ba) * r, 0.98, Math.sin(ba) * r);
  });
  interact(g, 'Крутить рулетку', () => {
    v = 7; bv = 14; S.sfxSlide();
    let n = 0; const tick = setInterval(() => { S.sfxClick(); if (++n > 30) clearInterval(tick); }, 60 + n * 3);
    setTimeout(() => {
      const k = Math.floor(Math.random() * 37); const color = k === 0 ? 'зеро' : (k % 2 ? 'красное' : 'чёрное');
      G.toast(`Выпало ${k}, ${color}. ${pick(['Ставок нет.', 'Крупье нет.', 'Фишки со стола исчезли — их никто не ставил.', 'Ты ничего не поставил и ничего не проиграл.'])}`);
    }, 3600);
  });
  solid(g, 2.6, 1.2, 0.95); floor(g); g.userData.top = 0.84; return g;
}
export function pokerTable(x, z, { ry = 0, cards = true } = {}) {
  const g = grp(x, z, ry);
  const top = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.08, 24), col(0x3a1a10)); top.scale.set(1.15, 1, 0.7); top.position.y = 0.72; g.add(top);
  const fm = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 0.02, 24), texMat('felt', TX.felt('#1a5a3a'), 0xffffff, {}, 0)); fm.scale.set(1.15, 1, 0.7); fm.position.y = 0.77; g.add(fm);
  C(g, 0.15, 0.3, 0.72, 10, col(0x2a140a), 0, 0, 0);
  const deck = ['A♥', 'K♠', 'Q♥', '7♦', '3♣', 'J♦', '10♠', '9♥'];
  if (cards) for (let i = 0; i < 5; i++) { const c = plane(0.09, 0.13, basic('cb' + i, { map: (i < 3 ? TX.cardTex(deck[i], deck[i].match(/[♥♦]/)) : TX.cardBackTex()) }), -0.24 + i * 0.12, 0.795, 0, -P / 2, 0, { parent: g }); c.userData.noMerge = true; }
  for (let i = 0; i < 4; i++) { const a = i * P / 2 + P / 4; chips(...wp(g, Math.cos(a) * 0.65, 0.78, Math.sin(a) * 0.42).toArray(), 2 + i); }
  hitBox(g, 2.2, 0.85, 1.4);
  interact(g, 'Раздать карты', () => {
    for (let i = 0; i < 5; i++) setTimeout(() => S.sfxPaper(), i * 120);
    const hands = ['пара дам', 'старшая карта — туз', 'две пары', 'ничего', 'флеш из одних червей', 'роял-флеш. Некому показать.'];
    setTimeout(() => G.toast(`У тебя — ${pick(hands)}. Дилер молчит: его стул пуст.`), 700);
  });
  for (let i = 0; i < 4; i++) { const a = i * P / 2; const p = wp(g, Math.cos(a) * 1.55, 0, Math.sin(a) * 1.05); chair(p.x, p.z, -a - P / 2 + ry, { color: 0x3a1a10, seatColor: 0x2a5a3a }); }
  addCollider(x - 1.15, Y(), z - 0.75, x + 1.15, Y() + 0.8, z + 0.75); floor(g); return g;
}

// ---------- мелочи: сигары, пепельницы, книги, сувениры ----------
let smokeMat;
export function ashtray(x, y, z, { cigar = true, ry = Math.random() * 6 } = {}) {
  const g = grp(x, z, ry, y);
  C(g, 0.08, 0.07, 0.03, 12, col(0x2a3a3a, { emissive: 0x050808 }), 0, 0, 0);
  C(g, 0.06, 0.06, 0.004, 12, col(0x7a7a72), 0, 0.034, 0);
  let smoke = null;
  if (cigar) {
    const c = C(g, 0.011, 0.011, 0.13, 8, col(0x6a3a1a), 0.03, 0.035, 0); c.rotation.z = P / 2 - 0.12; c.position.set(0.03, 0.04, 0);
    B(g, 0.014, 0.022, 0.022, col(0xc8a040, { emissive: 0x201000 }), 0.0, 0.03, 0);
    const tip = C(g, 0.012, 0.012, 0.01, 8, emis(0xff5010, 1.2), 0.095, 0.045, 0); tip.rotation.z = P / 2; tip.userData.noMerge = true;
    smokeMat = smokeMat || new THREE.MeshBasicMaterial({ color: 0xc8c0b8, transparent: true, opacity: 0.12, depthWrite: false, side: THREE.DoubleSide });
    smoke = new THREE.Group(); smoke.position.set(0.095, 0.05, 0); g.add(smoke);
    for (let i = 0; i < 3; i++) { const p = new THREE.Mesh(new THREE.PlaneGeometry(0.05, 0.22), smokeMat); p.position.y = 0.12 + i * 0.05; p.rotation.y = i * 1.1; p.userData.noRay = true; p.userData.noMerge = true; smoke.add(p); }
    W.animated.push((dt, t) => { if (smoke.visible) { smoke.rotation.y += dt * 0.6; smoke.children.forEach((p, i) => { p.position.x = Math.sin(t * 1.3 + i) * 0.02; p.scale.x = 1 + Math.sin(t * 2 + i) * 0.3; }); } });
  }
  hitBox(g, 0.2, 0.08, 0.2);
  const lines = ['Сигара ещё тлеет. Пахнет вишней и пылью. Бирка: «Havana · 1999».', 'Пепел не осыпается: он держит форму сигары.', 'Кто-то только что отошёл. Кресло ещё тёплое.', 'На ободке пепельницы — гравировка: «Grand Simulacre».'];
  interact(g, cigar ? 'Взять сигару' : 'Пепельница', () => { S.sfxClink(1.9); G.toast(pick(lines)); });
  onTable(g); return g;
}
export function cigarBox(x, y, z, ry = 0) {
  const g = grp(x, z, ry, y);
  B(g, 0.32, 0.08, 0.2, woodM('#6a3a1a'), 0, 0, 0);
  const lid = new THREE.Group(); lid.position.set(0, 0.08, -0.1); lid.rotation.x = -1.2; g.add(lid); B(lid, 0.32, 0.015, 0.2, woodM('#6a3a1a'), 0, 0, 0.1);
  for (let i = 0; i < 6; i++) { const c = C(g, 0.011, 0.011, 0.17, 8, col(0x6a3a1a), -0.12 + i * 0.045, 0.06, 0); c.rotation.x = P / 2; c.position.y = 0.06; }
  hitBox(g, 0.36, 0.2, 0.26);
  interact(g, 'Хьюмидор с сигарами', () => { S.sfxCurtain(); G.toast(pick(['Внутри — шесть сигар. Сосчитал ещё раз: шесть. Одну ты только что взял.', 'Гигрометр показывает 70%. В пустыне.', 'На крышке: «Pour les invités qui ne partent pas» — «для гостей, которые не уезжают».'])); });
  onTable(g); return g;
}
export function book(x, y, z, ry, key, { color = 0x7a2a2a, open = false } = {}) {
  const g = grp(x, z, ry, y);
  if (open) { B(g, 0.36, 0.012, 0.25, col(color), 0, 0, 0); const l = B(g, 0.17, 0.022, 0.24, col(0xe8e0c8), -0.087, 0.012, 0); l.rotation.z = 0.05; const r = B(g, 0.17, 0.022, 0.24, col(0xe8e0c8), 0.087, 0.012, 0); r.rotation.z = -0.05; }
  else { B(g, 0.17, 0.04, 0.24, col(color), 0, 0, 0); B(g, 0.16, 0.034, 0.23, col(0xe8e0c8), 0.006, 0.003, 0); }
  hitBox(g, 0.4, 0.1, 0.3);
  interact(g, open ? 'Читать раскрытую книгу' : 'Прочитать книгу', () => { S.sfxPaper(); G.noteKey(key); });
  onTable(g); return g;
}
export function matchbook(x, y, z, ry = 0) {
  const g = grp(x, z, ry, y);
  B(g, 0.05, 0.012, 0.035, col(0x8a1a2a, { emissive: 0x100000 }), 0, 0, 0); B(g, 0.04, 0.013, 0.008, col(0xd8b060), 0, 0, 0.012);
  hitBox(g, 0.14, 0.06, 0.12);
  interact(g, 'Спичечный коробок', () => { S.sfxSwitch(); G.noteKey('matchbook'); });
  onTable(g); return g;
}
export function postcard(x, y, z, ry, key) {
  const g = grp(x, z, ry, y);
  const p = plane(0.15, 0.1, col(0xe8c890, { emissive: 0x2a2010 }), 0, 0.003, 0, -P / 2, 0, { parent: g }); p.userData.noMerge = true;
  plane(0.06, 0.05, col(0x9a3a4a), -0.03, 0.004, 0.0, -P / 2, 0, { parent: g }).userData.noMerge = true;
  hitBox(g, 0.22, 0.05, 0.16);
  interact(g, 'Открытка', () => { S.sfxPaper(); G.noteKey(key); });
  onTable(g); return g;
}
export function snowGlobe(x, y, z) {
  const g = grp(x, z, 0, y);
  C(g, 0.06, 0.07, 0.04, 12, woodM('#3a2010'), 0, 0, 0);
  const s = new THREE.Mesh(new THREE.SphereGeometry(0.065, 14, 10), col(0xd0e8f0, { transparent: true, opacity: 0.35, emissive: 0x101820 })); s.position.y = 0.1; g.add(s);
  B(g, 0.03, 0.05, 0.025, col(0x9a5a4a), 0, 0.045, 0); B(g, 0.07, 0.006, 0.07, col(0x6a1a2a), 0, 0.04, 0);
  hitBox(g, 0.16, 0.2, 0.16);
  interact(g, 'Встряхнуть снежный шар', () => { S.sfxSlide(); G.toast('Внутри — этот отель и малиновая пустыня. Ты трясёшь шар, но снег не идёт: в пустыне не бывает снега.'); });
  onTable(g); return g;
}
export function hourglass(x, y, z) {
  const g = grp(x, z, 0, y);
  for (const yy of [0, 0.22]) C(g, 0.06, 0.06, 0.015, 10, woodM('#4a2a14'), 0, yy, 0);
  const gl = col(0xd8e8e8, { transparent: true, opacity: 0.35 });
  C(g, 0.045, 0.006, 0.1, 10, gl, 0, 0.115, 0); C(g, 0.006, 0.045, 0.1, 10, gl, 0, 0.015, 0);
  C(g, 0.02, 0.04, 0.035, 10, col(0xd8a860), 0, 0.15, 0);
  hitBox(g, 0.14, 0.26, 0.14);
  interact(g, 'Перевернуть песочные часы', () => { S.sfxSlide(); G.toast('Ты переворачиваешь часы. Песок остаётся наверху и не сыплется.'); });
  onTable(g); return g;
}
export function chessboard(x, y, z, ry = 0) {
  const g = grp(x, z, ry, y);
  const c = document.createElement('canvas'); c.width = c.height = 64; const cx = c.getContext('2d');
  for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) { cx.fillStyle = (i + j) % 2 ? '#2a1a10' : '#d8c8a0'; cx.fillRect(i * 8, j * 8, 8, 8); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.magFilter = THREE.NearestFilter;
  B(g, 0.42, 0.03, 0.42, woodM('#3a2010'), 0, 0, 0);
  plane(0.38, 0.38, new THREE.MeshLambertMaterial({ map: t }), 0, 0.032, 0, -P / 2, 0, { parent: g }).userData.noMerge = true;
  const pcs = [[-0.16, -0.12, 1], [0.0, 0.04, 0], [0.12, -0.02, 1], [-0.04, 0.16, 0], [0.08, 0.12, 1], [-0.12, 0.0, 0]];
  for (const [a, b, wcol] of pcs) { C(g, 0.016, 0.02, 0.05, 8, col(wcol ? 0xe8e0d0 : 0x1a1210), a, 0.035, b); C(g, 0.012, 0.012, 0.02, 8, col(wcol ? 0xe8e0d0 : 0x1a1210), a, 0.085, b); }
  hitBox(g, 0.46, 0.14, 0.46);
  interact(g, 'Сделать ход', () => { S.sfxClick(); G.toast(pick(['Ты двигаешь пешку. Через секунду чёрный конь сдвигается сам.', 'Отложенная партия. На бланке: «ход белых, 1999 год».', 'Король стоит на клетке, которой нет на доске.'])); });
  onTable(g); return g;
}
export function mirrorBall(x, z, y) {
  const g = grp(x, z, 0, y);
  C(g, 0.01, 0.01, 1.0, 4, col(0x222222), 0, -1.0, 0);
  const b = new THREE.Mesh(new THREE.IcosahedronGeometry(0.4, 1), col(0xb8c0c8, { flatShading: true, emissive: 0x404858 })); b.position.y = -1.4; b.userData.noMerge = true; g.add(b);
  W.animated.push(dt => { b.rotation.y += dt * 0.4; });
  mount(g, 'ceiling'); return g;
}

// ---------- антураж вестибюля: мир идей ----------
// пять платоновых тел («Тимей»): огонь, земля, воздух, вода, эфир. Висят над фонтаном, ни на чём не держатся.
export function platonicSolids(x, z, y, r = 3.0) {
  const g = grp(x, z, 0, y);
  const defs = [
    [new THREE.TetrahedronGeometry(0.34), 0xff7a3a],
    [new THREE.BoxGeometry(0.42, 0.42, 0.42), 0x8a5a3a],
    [new THREE.OctahedronGeometry(0.34), 0xd8d0b0],
    [new THREE.IcosahedronGeometry(0.34), 0x4a9aa8],
    [new THREE.DodecahedronGeometry(0.36), 0xd0a8ff],
  ];
  const ms = defs.map(([geo, c], i) => {
    const m = new THREE.Mesh(geo, col(c, { flatShading: true, emissive: c, emissiveIntensity: 0.22 }));
    m.userData.noMerge = true; m.userData.noRay = true; g.add(m); return m;
  });
  W.animated.push((dt, t) => {
    ms.forEach((m, i) => {
      const a = t * 0.07 + i * (P * 2 / 5);
      m.position.set(Math.cos(a) * r, Math.sin(t * 0.4 + i * 1.3) * 0.25 + (i % 2) * 0.5, Math.sin(a) * r);
      m.rotation.x += dt * (0.15 + i * 0.03); m.rotation.y += dt * 0.2;
    });
  });
  return g;
}
// бюст на постаменте
export function bust(x, z, ry, label, lines, { color = 0xc8c0b0, faceless = false, y = Y() } = {}) {
  const g = grp(x, z, ry, y);
  const stone = texMat('pedestal', TX.marble('#2a2a2c', '#3a3a3a'), 0xffffff, {}, 0);
  B(g, 0.5, 0.08, 0.5, stone, 0, 0, 0); B(g, 0.38, 1.02, 0.38, stone, 0, 0.08, 0); B(g, 0.5, 0.06, 0.5, stone, 0, 1.1, 0);
  const m = col(color, { flatShading: true });
  const sh = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.24, 0.26, 7), m); sh.position.y = 1.29; sh.scale.z = 0.6; g.add(sh);
  C(g, 0.06, 0.07, 0.1, 6, m, 0, 1.45, 0);
  const head = new THREE.Mesh(new THREE.IcosahedronGeometry(0.13, faceless ? 1 : 0), m); head.position.y = 1.62; head.scale.set(0.85, 1.15, 0.95); g.add(head);
  if (!faceless) { B(g, 0.035, 0.05, 0.05, m, 0, 1.58, 0.11); const bd = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.16, 6), m); bd.position.set(0, 1.47, 0.07); bd.rotation.x = P; g.add(bd); }
  B(g, 0.26, 0.07, 0.01, col(0xb08a3a, { emissive: 0x201004 }), 0, 0.9, 0.195);
  solid(g, 0.5, 0.5, 1.8);
  interact(g, label, () => { S.sfxPaper(); G.toast(pick(lines)); });
  floor(g); return g;
}
// полосатое закатное солнце — рельеф над входом
export function sunRelief(x, y, z, ry, r = 1.1) {
  const g = grp(x, z, ry, y);
  B(g, r * 2 + 0.2, 0.06, 0.02, col(0x3a1a14), 0, -r - 0.18, 0.01);
  const p = plane(r * 2, r * 2, basic('sunrelief', { map: TX.sunTex(), transparent: true, alphaTest: 0.5, color: 0xd8b090 }), 0, 0, 0.03, 0, 0, { parent: g }); p.userData.noMerge = true;
  glow(0, 0, 0.05, r * 3.2, 0xff8a40, 0.1, { rx: 0, parent: g });
  onWall(g, r * 1.4, r * 1.4); return g;
}
// заплатка «нулевого уровня»: под обоями вестибюля — другие обои
export function backroomsPatch(x, y, z, ry, w = 1.2, h = 2.4) {
  const g = grp(x, z, ry, y);
  const ed = col(0x2a1a10);
  B(g, w + 0.08, h + 0.08, 0.01, ed, 0, 0, 0.005);
  const tex = TX.backroomsTex(); tex.repeat.set(w / 0.8, h / 0.8);
  plane(w, h, col(0xffffff, { map: tex, emissive: 0x2a2208 }), 0, h / 2 + 0.04, 0.016, 0, 0, { parent: g }).userData.noMerge = true;
  // свёрнутый лоскут отклеившихся обоев
  const curl = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, w * 0.7, 8, 1, true, 0, P * 1.4), col(0x5e3026, { side: THREE.DoubleSide }));
  curl.rotation.z = P / 2; curl.position.set(-0.08, h + 0.08, 0.07); g.add(curl);
  const tube = B(g, w * 0.8, 0.04, 0.06, emis(0xfff0c0, 1.3), 0, h + 0.35, 0.04); tube.userData.noMerge = true;
  B(g, w * 0.84, 0.06, 0.04, col(0x9a9a90), 0, h + 0.33, 0.02);
  let k = 0; W.animated.push((dt, t) => { if (!tube.visible) return; k -= dt; if (k < 0) { k = 0.05 + Math.random() * 0.3; tube.material.emissiveIntensity = Math.random() < 0.12 ? 0.2 : 1.3; } });
  interact(g, 'Провести рукой по обоям', () => {
    S.sfxPaper(); G.toast(pick([
      'Под бархатными обоями вестибюля — другие: жёлтые, влажные, бесконечные. Пахнет старым ковролином.',
      'Обои гудят вместе с лампой. Если отклеить ещё кусок, под ним будут те же обои — и так до самого низа.',
      'Карандашом по жёлтому: «тут копия без оригинала. уровень 0». Почерк твой.',
    ]));
  });
  mount(g, 'wall', { w, h, dy: h / 2 + 0.04 }); return g;
}
// напольный телевизор с помехами, канал ничего
export function floorTV(x, z, ry) {
  const g = tv(x, Y(), z, ry, { on: true });
  floor(g);
  const lines = ['Канал 0. Помехи складываются в коридор, который уходит дальше, чем помещается в экран.', 'Сквозь шум — диктор: «…копия заменяет оригинал, оригинал благодарит копию…»', 'В помехах на секунду мелькает этот вестибюль. Сверху. В нём кто-то стоит. Это ты.'];
  interact(g, 'Смотреть помехи', () => { S.sfxClick(); G.toast(pick(lines)); });
  return g;
}
// табличка на латунной стойке
export function plaqueStand(x, z, ry, title, text) {
  const g = grp(x, z, ry);
  const brass = col(0xb08a3a, { emissive: 0x1a0c02 });
  C(g, 0.16, 0.18, 0.04, 12, brass, 0, 0, 0); C(g, 0.02, 0.02, 0.95, 6, brass, 0, 0.04, 0);
  const pl = new THREE.Group(); pl.position.set(0, 1.0, 0); pl.rotation.x = -0.6; g.add(pl);
  B(pl, 0.4, 0.26, 0.02, brass, 0, -0.13, 0);
  const sg = plane(0.36, 0.22, texMat('plq' + title, TX.signTex(tri(title) ? tri(title).join('\n') : title, { aspect: 0.36 / 0.22, bg: '#1a1008', fg: '#d8b060', sub: !!tri(title) }), 0xffffff, { emissive: 0xffffff, emissiveIntensity: 0.15 }, 0), 0, 0, 0.012, 0, 0, { parent: pl }); sg.userData.noMerge = true;
  hitBox(g, 0.4, 1.2, 0.4);
  interact(g, 'Читать табличку', () => { S.sfxPaper(); G.note(title, text); });
  floor(g); return g;
}

// статуя человека в полный рост на постаменте (белый мрамор, драпировка)
export function statue(x, z, ry, y = Y()) {
  const g = grp(x, z, ry, y);
  const mm = col(0xf0ece4, { flatShading: true, emissive: 0x2a2826 });
  const pm = texMat('statPed', TX.marble('#d8d4cc', '#bcb6ac'), 0xffffff, {}, 0);
  B(g, 0.8, 0.12, 0.8, pm, 0, 0, 0); B(g, 0.66, 0.5, 0.66, pm, 0, 0.12, 0); B(g, 0.8, 0.08, 0.8, pm, 0, 0.62, 0);
  const Y0 = 0.7;
  const robe = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.32, 1.0, 9), mm); robe.position.y = Y0 + 0.5; g.add(robe);
  for (let i = 0; i < 6; i++) { const f = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.05, 0.95, 5), mm); const a = -1 + i * 0.4; f.position.set(Math.sin(a) * 0.27, Y0 + 0.48, Math.cos(a) * 0.27); f.rotation.z = Math.sin(a) * 0.08; g.add(f); }
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.17, 0.62, 8), mm); torso.position.y = Y0 + 1.31; torso.scale.z = 0.7; g.add(torso);
  const sh = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.5, 6), mm); sh.rotation.z = P / 2; sh.position.y = Y0 + 1.58; g.add(sh);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.1, 6), mm); neck.position.y = Y0 + 1.66; g.add(neck);
  const head = new THREE.Mesh(new THREE.IcosahedronGeometry(0.11, 1), mm); head.position.y = Y0 + 1.8; head.scale.set(0.9, 1.15, 1); g.add(head);
  // одна рука опущена вдоль тела, вторая прижата к груди
  const armL = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.04, 0.62, 6), mm); armL.position.set(-0.25, Y0 + 1.28, 0.02); armL.rotation.z = 0.08; g.add(armL);
  const armR = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.04, 0.34, 6), mm); armR.position.set(0.2, Y0 + 1.44, 0.04); armR.rotation.z = -0.3; g.add(armR);
  const fore = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.035, 0.3, 6), mm); fore.position.set(0.08, Y0 + 1.36, 0.12); fore.rotation.set(1.2, 0, 1.1); g.add(fore);
  solid(g, 0.8, 0.8, 2.6);
  interact(g, 'Осмотреть статую', () => { S.sfxPaper(); G.toast(pick([
    'Статуя стоит спиной к залу, хотя ты видишь её лицо. Мрамор тёплый.',
    'На постаменте нет имени. Есть только дата: «вчера, завтра».',
    'Ты моргаешь — и статуя стоит на шаг ближе к краю сцены. Ты моргаешь снова — на прежнем месте.',
    'Если долго смотреть, кажется, что она говорит. Слова доходят задом наперёд.',
  ])); });
  floor(g); return g;
}

// трофеи на стене: копьё наискосок и высокий плетёный щит. (x, y, z) — точка на стене, ry — нормаль стены.
export function trophies(x, y, z, ry, { note = null } = {}) {
  const g = grp(x, z, ry, y);
  const wood = col(0x3a2414), iron = col(0x2a2a2c, { emissive: 0x050505 }), brass = col(0xb08a3a, { emissive: 0x1a0c02 });
  // копьё: древко наискосок, листовидный наконечник, подток
  const sp = new THREE.Group(); sp.position.set(0, 0.95, 0.07); sp.rotation.z = 0.62; g.add(sp);
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.021, 0.025, 2.1, 6), wood); sp.add(shaft);
  const blade = new THREE.Mesh(new THREE.OctahedronGeometry(1, 0), iron); blade.scale.set(0.075, 0.27, 0.016); blade.position.y = 1.3; sp.add(blade);
  const socket = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.028, 0.12, 6), iron); socket.position.y = 1.02; sp.add(socket);
  const butt = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.12, 6), iron); butt.position.y = -1.1; butt.rotation.x = P; sp.add(butt);
  for (const yy of [-0.55, 0.55]) { const peg = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.09, 6), brass); peg.rotation.x = P / 2; peg.position.set(-Math.sin(0.62) * -yy * 0 + Math.cos(0.62) * 0 - Math.sin(0.62) * yy, 0.95 + Math.cos(0.62) * yy, 0.035); g.add(peg); }
  // щит: вытянутый выпуклый овал, ребро по центру, обмотка у края
  const sh = new THREE.Group(); sh.position.set(0.05, 1.0, 0.1); sh.rotation.z = -0.1; g.add(sh);
  const body = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 12), col(0xffffff, { map: TX.shieldTex() })); body.scale.set(0.27, 0.68, 0.06); sh.add(body);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(1, 0.025, 4, 22), col(0x3a2a16)); rim.scale.set(0.27, 0.68, 1); sh.add(rim);
  B(sh, 0.035, 1.2, 0.03, col(0x4a3420), 0, -0.6, 0.05);
  for (let i = 0; i < 5; i++) B(sh, 0.11, 0.012, 0.02, col(0xc8b080), 0.17, 0.34 + i * 0.035, 0.045);
  const hook = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.08, 6), brass); hook.rotation.x = P / 2; hook.position.set(0.05, 1.72, 0.04); g.add(hook);
  // табличка
  const pl = plane(0.34, 0.08, texMat('plq302', TX.signTex('№ 302', { aspect: 4.25, bg: '#8a6a2a', fg: '#1a1008', border: false }), 0xffffff, { emissive: 0x1a1006 }, 0), 0.05, 0.24, 0.018, 0, 0, { parent: g });
  pl.userData.noMerge = true; B(g, 0.37, 0.1, 0.01, brass, 0.05, 0.19, 0.005);
  hitBox(g, 1.3, 1.9, 0.25, 0.1);
  interact(g, 'Осмотреть трофеи', () => { S.sfxClink(0.6); if (note) G.noteKey(note); });
  mount(g, 'wall', { w: 1.1, h: 1.6, dy: 0.95, what: 'трофеи' });
  return g;
}

// Пламя «как в старых играх»: сетка жара, нижний ряд — угли; каждый шаг жар поднимается на клетку вверх,
// случайно остывает и сносится в сторону. Палитра — от прозрачной черноты до белого.
const FIRE_PAL = (() => { const p = []; const st = [[0, 0, 0], [40, 6, 2], [110, 18, 4], [180, 40, 6], [220, 80, 10], [240, 120, 20], [250, 165, 40], [255, 205, 80], [255, 235, 160], [255, 250, 220]];
  for (let i = 0; i < 37; i++) { const f = i / 36 * (st.length - 1), k = Math.floor(f), u = f - k, a = st[k], b = st[Math.min(st.length - 1, k + 1)]; p.push(a.map((v, j) => Math.round(v + (b[j] - v) * u))); } return p; })();
function makeFlame(Wd, Hd, seed) {
  const c = document.createElement('canvas'); c.width = Wd; c.height = Hd; const cx = c.getContext('2d');
  const img = cx.createImageData(Wd, Hd); const heat = new Uint8Array(Wd * Hd);
  let sd = seed; const rnd = () => ((sd = (sd * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.LinearFilter;
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const step = () => {
    // источник: угли посередине очага, края гаснут, жар неровный
    for (let x = 0; x < Wd; x++) { const e = Math.abs(x / (Wd - 1) - 0.5) * 2; heat[(Hd - 1) * Wd + x] = e > 0.8 ? 0 : Math.max(0, Math.min(36, Math.round(36 - e * e * 22 - rnd() * 12))); }
    for (let y = 0; y < Hd - 1; y++) for (let x = 0; x < Wd; x++) {
      const src = heat[(y + 1) * Wd + x]; const r = Math.floor(rnd() * 3);
      const dx = Math.min(Wd - 1, Math.max(0, x - r + 1));
      heat[y * Wd + dx] = Math.max(0, src - (r & 1) - (rnd() < 0.14 ? 1 : 0));
    }
    for (let i = 0; i < Wd * Hd; i++) { const p = FIRE_PAL[heat[i]]; img.data[i * 4] = p[0]; img.data[i * 4 + 1] = p[1]; img.data[i * 4 + 2] = p[2]; img.data[i * 4 + 3] = 255; }
    cx.putImageData(img, 0, 0); tex.needsUpdate = true;
  };
  for (let i = 0; i < Hd; i++) step();
  return { mat, step };
}
