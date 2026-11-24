// Экстерьер: фасад (пилястры, карнизы, козырёк), площадь у входа, дорога,
// неоновые вывески, крыша подиума. Всё — в постоянно видимой группе.
import * as THREE from 'three';
import { W, FH, T, setExterior, block, box, cyl, plane, col, texMat, emis, basic, glow } from './engine.js';
import * as TX from './textures.js';
import { LAYOUT } from './hotel.js';

const P = Math.PI;

function neonTex(text, { color = '#ff5a9a', aspect = 5, family = 'Georgia, serif' } = {}) {
  const H = 128, Wd = Math.round(H * aspect);
  const c = document.createElement('canvas'); c.width = Wd; c.height = H; const g = c.getContext('2d');
  g.clearRect(0, 0, Wd, H);
  let size = 100; g.font = `bold ${size}px ${family}`;
  while (g.measureText(text).width > Wd * 0.92 && size > 10) { size -= 4; g.font = `bold ${size}px ${family}`; }
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.shadowColor = color; g.shadowBlur = 22; g.fillStyle = color; g.fillText(text, Wd / 2, H / 2 + 4);
  g.shadowBlur = 0; g.fillStyle = '#fff4f8'; g.globalAlpha = 0.85; g.fillText(text, Wd / 2, H / 2 + 4);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function neon(text, x, y, z, ry, w, h, color) {
  const m = new THREE.MeshBasicMaterial({ map: neonTex(text, { color, aspect: w / h }), transparent: true, depthWrite: false, side: THREE.DoubleSide, fog: false });
  const p = plane(w, h, m, x, y, z, 0, ry); p.userData.noRay = true; return p;
}

// Кольцо карниза вокруг прямоугольника стен (x0..x1, z0..z1 — оси стен): только снаружи,
// внутрь заходит не дальше середины стены, чтобы не попадать в интерьер.
function ring(x0, z0, x1, z1, y0, y1, out, mat, { skipEastZ = null, inner = 0 } = {}) {
  const o = { collide: false };
  block(x0 - out, y0, z1 - inner, x1 + out, y1, z1 + out, mat, o);
  block(x0 - out, y0, z0 - out, x1 + out, y1, z0 + inner, mat, o);
  block(x0 - out, y0, z0 + inner, x0 + inner, y1, z1 - inner, mat, o);
  if (skipEastZ) {
    block(x1 - inner, y0, z0 + inner, x1 + out, y1, skipEastZ[0], mat, o);
    block(x1 - inner, y0, skipEastZ[1], x1 + out, y1, z1 - inner, mat, o);
  } else block(x1 - inner, y0, z0 + inner, x1 + out, y1, z1 - inner, mat, o);
}

export function buildExterior() {
  setExterior();
  const { TX0, TX1, TZ0, TZ1, LX0, LZ0, LZ1, LH, PH, WZ1 } = LAYOUT;
  const stucco = texMat('ext', TX.stucco('#a8725a', 15), 0xffffff, {}, 3);
  const trim = texMat('trimStone', TX.stucco('#c09a6a', 4), 0xffffff, {}, 3);
  const plinth = texMat('plinth', TX.concrete('#3a2620', 44), 0xffffff, {}, 2);
  const dark = col(0x2a1a14);
  const o = 0.14; // вынос пилястр/карнизов от стены

  // ---------- башня ----------
  const tTop = 4 * FH;
  // угловые пилястры и пилястры между номерами (выше крыши подиума)
  for (const x of [6, 12, 18, 24]) for (const [z, s] of [[TZ1, 1], [TZ0, -1]]) block(x - 0.2, PH + 0.4, z + s * T / 2, x + 0.2, tTop, z + s * (T / 2 + o), trim, { collide: false });
  // угловые пилястры — только снаружи стен (две полосы на внешних гранях угла)
  for (const [x, z, sx, sz] of [[TX0, TZ0, -1, -1], [TX0, TZ1, -1, 1], [TX1, TZ0, 1, -1], [TX1, TZ1, 1, 1]]) {
    const y0 = x === TX0 ? LH + 0.75 : PH + 0.4;
    const fx = x + sx * T / 2, fz = z + sz * T / 2;
    block(Math.min(x - sx * 0.3, fx + sx * 0.2), y0, Math.min(fz, fz + sz * 0.2), Math.max(x - sx * 0.3, fx + sx * 0.2), tTop - 0.55, Math.max(fz, fz + sz * 0.2), trim, { collide: false });
    block(Math.min(fx, fx + sx * 0.2), y0, Math.min(z - sz * 0.3, fz), Math.max(fx, fx + sx * 0.2), tTop - 0.55, Math.max(z - sz * 0.3, fz), trim, { collide: false });
  }
  // венчающий карниз башни
  ring(TX0, TZ0, TX1, TZ1, tTop - 0.3, tTop, 0.45, trim);
  ring(TX0, TZ0, TX1, TZ1, tTop - 0.55, tTop - 0.3, 0.3, stucco);

  // ---------- подиум и вестибюль ----------
  // цоколь по всему периметру первого этажа
  const zMin = LZ0 - T / 2, zMax = LZ1 + T / 2;
  block(LX0 - T / 2 - 0.12, -0.05, zMin - 0.12, TX1 + T / 2 + 0.12, 0.45, zMin, plinth, { collide: false });
  const zW = WZ1 + T / 2;
  block(TX0 + T / 2, -0.05, zMax, TX1 + T / 2 + 0.12, 0.45, zMax + 0.12, plinth, { collide: false });
  block(LX0 - T / 2 - 0.12, -0.05, zW, TX0 + T / 2 + 0.12, 0.45, zW + 0.12, plinth, { collide: false });
  block(TX0 + T / 2, -0.05, zMax + 0.12, TX0 + T / 2 + 0.12, 0.45, zW, plinth, { collide: false });
  block(TX1 + T / 2, -0.05, zMin, TX1 + T / 2 + 0.12, 0.45, zMax, plinth, { collide: false });
  block(LX0 - T / 2 - 0.12, -0.05, zMin, LX0 - T / 2, 0.45, -1.6, plinth, { collide: false });
  block(LX0 - T / 2 - 0.12, -0.05, 1.6, LX0 - T / 2, 0.45, zW, plinth, { collide: false });
  // карниз и парапет подиума
  for (const [x0, z0, x1, z1] of [[TX0, zMax, TX1 + T / 2, zMax + 0.3], [TX0, zMin - 0.3, TX1 + T / 2, zMin], [TX1 + T / 2, zMin - 0.3, TX1 + T / 2 + 0.3, zMax + 0.3]]) {
    block(x0, PH - 0.25, z0, x1, PH, z1, trim, { collide: false });
  }
  // парапет подиума: прячется внутри стены (не доходит до внутренней грани) и чуть выступает наружу
  block(TX0, PH, zMax - T / 2 - 0.05, TX1 + T / 2 + 0.02, PH + 0.45, zMax + 0.02, stucco, { collide: false });
  block(TX0, PH, zMin - 0.02, TX1 + T / 2 + 0.02, PH + 0.45, zMin + T / 2 + 0.05, stucco, { collide: false });
  block(TX1 - 0.1, PH, zMin - 0.02, TX1 + T / 2 + 0.02, PH + 0.45, zMax + 0.02, stucco, { collide: false });
  // крыша подиума (гравий) — без площадки над башней и без дырки фонаря ресторана
  const roofM = texMat('roof', TX.gravel(), 0xffffff, {}, 1.5);
  const sky = [14, 9.2, 22, 11.4];
  const roofPlane = (x0, z0, x1, z1) => { const m = plane(x1 - x0, z1 - z0, roofM, (x0 + x1) / 2, PH + 0.01, (z0 + z1) / 2, -P / 2, 0); m.userData.noRay = true; };
  roofPlane(TX0, TZ1, TX1, sky[1]); roofPlane(TX0, sky[3], TX1, zMax); roofPlane(TX0, sky[1], sky[0], sky[3]); roofPlane(sky[2], sky[1], TX1, sky[3]);
  roofPlane(TX0, zMin, TX1, TZ0);
  // рама светового фонаря
  for (const [a, b, c, d] of [[sky[0] - 0.1, sky[1] - 0.1, sky[2] + 0.1, sky[1]], [sky[0] - 0.1, sky[3], sky[2] + 0.1, sky[3] + 0.1], [sky[0] - 0.1, sky[1], sky[0], sky[3]], [sky[2], sky[1], sky[2] + 0.1, sky[3]]]) block(a, PH, b, c, PH + 0.3, d, dark, { collide: false });
  // кондиционеры и вентиляция на крыше подиума
  for (const [x, z] of [[4, 10], [9, -9], [26, -11], [27, 12.5], [12, -12.5]]) {
    box(1.4, 0.8, 1.0, col(0x8a8478), x, PH, z);
    const f = cyl(0.35, 0.35, 0.05, 12, col(0x222222), x, PH + 0.8, z); f.userData.noRay = true;
  }
  for (const [x, z] of [[17, -8.2], [20, 8.4]]) cyl(0.18, 0.18, 1.0, 8, col(0x6a6a6a), x, PH, z);
  // вестибюль: пилястры между высокими окнами и карниз
  for (const z of [-13.4, -9.75, -6.25, -2.6, 2.6, 6.25, 9.75, 13.4, 15.6, 19.5, 23.5, 27.5, 31.4]) block(LX0 - T / 2 - o, 0.45, z - 0.22, LX0 - T / 2, LH, z + 0.22, trim, { collide: false });
  for (const x of [-24.6, -21.75, -18, -14.25, -10.75, -7.4]) block(x - 0.2, 0.45, zMin - o, x + 0.2, LH, zMin, trim, { collide: false });
  for (const x of [-25.4, -21.6, -17, -12.6, -8.1, -6.6, -1.3]) block(x - 0.2, 0.45, zW, x + 0.2, LH, zW + o, trim, { collide: false });
  for (const z of [15.2, 21.2, 23.0, 25.2, 30.2]) block(TX0 + T / 2, 0.45, z - 0.22, TX0 + T / 2 + o, LH, z + 0.22, trim, { collide: false });
  // карниз и парапет вестибюля — кольцом снаружи стен (с восточной стороны — только вне башни)
  ring(LX0, LZ0, TX0, WZ1, LH, LH + 0.35, 0.45, trim, { skipEastZ: [TZ0 - T / 2, TZ1 + T / 2] });
  ring(LX0, LZ0, TX0, WZ1, LH + 0.35, LH + 0.75, 0.2, stucco, { skipEastZ: [TZ0 - T / 2, TZ1 + T / 2], inner: 0.3 });
  const lobbyRoof = plane(TX0 - LX0, WZ1 - LZ0, roofM, (LX0 + TX0) / 2, LH + 0.02, (LZ0 + WZ1) / 2, -P / 2, 0); lobbyRoof.userData.noRay = true;

  // ---------- козырёк над входом ----------
  const cx0 = LX0 - 9, cx1 = LX0 - T / 2;
  block(cx0, 3.9, -4.2, cx1, 4.35, 4.2, trim, { collide: false });
  block(cx0 - 0.05, 4.35, -4.25, cx1, 4.45, 4.25, dark, { collide: false });
  for (const x of [cx0 + 0.6, cx0 + 4.6]) for (const z of [-3.6, 3.6]) {
    cyl(0.22, 0.25, 3.9, 12, trim, x, 0, z); cyl(0.32, 0.32, 0.3, 12, plinth, x, 0, z);
  }
  // светильники под козырьком
  for (let i = 0; i < 4; i++) for (const z of [-2, 2]) { const p = plane(0.4, 0.4, emis(0xffd090, 1.3), cx0 + 1.2 + i * 2, 3.89, z, P / 2, 0); p.userData.noRay = true; }
  for (let i = 0; i < 3; i++) glow(cx0 + 2 + i * 2.6, 0.03, 0, 4.5, 0xffb060, 0.22);
  neon('GRAND SIMULACRE', cx0 - 0.08, 4.12, 0, -P / 2, 7.4, 0.42, '#ffb070');
  neon('HÔTEL', cx0 + 4.5, 4.12, -4.27, P, 5, 0.42, '#ffb070');
  neon('HÔTEL', cx0 + 4.5, 4.12, 4.27, 0, 5, 0.42, '#ffb070');

  // ---------- площадь и дорога ----------
  const paving = texMat('paving', TX.tiles('#6a4a40', '#5e4038', '#3a2620', 4), 0xffffff, {}, 2.4);
  const asphalt = texMat('asph', TX.asphalt(), 0xffffff, {}, 4);
  const flat = (x0, z0, x1, z1, y, m) => { const p = plane(x1 - x0, z1 - z0, m, (x0 + x1) / 2, y, (z0 + z1) / 2, -P / 2, 0); p.userData.noRay = true; return p; };
  flat(LX0 - 26, -12, LX0 - T / 2, 12, 0.0, paving);
  flat(LX0 - 900, -4, LX0 - 26, 4, 0.0, asphalt);
  for (let i = 0; i < 120; i++) flat(LX0 - 30 - i * 7, -0.08, LX0 - 27 - i * 7, 0.08, 0.03, basic('dash', { color: 0xc8a050 }));
  // фонари вдоль площади
  for (let i = 0; i < 4; i++) for (const z of [-11, 11]) {
    const x = LX0 - 4 - i * 6;
    cyl(0.07, 0.09, 4.2, 8, dark, x, 0, z); cyl(0.25, 0.25, 0.05, 10, dark, x, 4.2, z);
    const h = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), emis(0xffd8a0, 1.4)); h.position.set(x, 4.45, z); W.group.add(h);
    glow(x, 0.02, z, 3.2, 0xffb060, 0.2);
  }
  // кадки с пальмами у входа
  const palmAt = (x, z) => {
    const g = new THREE.Group(); g.position.set(x, 0, z); W.group.add(g);
    cyl(0.5, 0.4, 0.6, 10, plinth, 0, 0, 0, { parent: g }); cyl(0.07, 0.1, 3, 6, col(0x5a4028), 0, 0.6, 0, { parent: g });
    const lm = col(0x3a5a30, { side: THREE.DoubleSide });
    for (let i = 0; i < 7; i++) { const l = new THREE.Mesh(new THREE.PlaneGeometry(0.35, 1.6), lm); l.position.set(0, 3.6, 0); l.rotation.order = 'YXZ'; l.rotation.set(-1.0, i / 7 * P * 2, 0); l.translateY(0.7); g.add(l); }
  };
  for (const z of [-6, 6]) for (const x of [LX0 - 2, LX0 - 11]) palmAt(x, z);
  // скамейки
  for (const z of [-9.5, 9.5]) { box(2.0, 0.08, 0.5, texMat('bench', TX.wood('#6a4020'), 0xffffff, {}, 1), LX0 - 15, 0.45, z); for (const s of [-0.85, 0.85]) box(0.08, 0.45, 0.45, dark, LX0 - 15 + s, 0, z); }
  // сухой фонтан на площади
  cyl(2.6, 2.8, 0.5, 18, plinth, LX0 - 19, 0, 0); cyl(2.3, 2.3, 0.05, 18, col(0x2a1a14), LX0 - 19, 0.46, 0); cyl(0.3, 0.45, 1.6, 10, trim, LX0 - 19, 0.5, 0);
  // пилон у дороги
  const px = LX0 - 34, pz = -7.5;
  box(0.5, 9, 0.5, dark, px, 0, pz); box(0.5, 9, 0.5, dark, px, 0, pz + 3.6);
  box(0.4, 3.2, 4.6, col(0x3a1420), px, 6.6, pz + 1.8);
  neon('SIMULACRE', px - 0.22, 8.9, pz + 1.8, -P / 2, 4.4, 1.1, '#ff6aa0');
  neon('GRAND HÔTEL · CASINO', px - 0.22, 7.9, pz + 1.8, -P / 2, 4.4, 0.45, '#ffc070');
  neon('СВОБОДНО · VACANCY · LIBRE : ∞', px - 0.22, 7.15, pz + 1.8, -P / 2, 4.4, 0.45, '#80ffc0');
  neon('SIMULACRE', px + 0.22, 8.9, pz + 1.8, P / 2, 4.4, 1.1, '#ff6aa0');

  // ---------- неоновая вывеска на крыше башни ----------
  const rx = TX0 + 1.0, ry0 = tTop + 1.2;
  for (const z of [-5, -1.7, 1.7]) { box(0.08, 2.8, 0.08, dark, rx, tTop, z); }
  box(0.12, 0.12, 10.4, dark, rx, ry0 + 0.3, -0.5); box(0.12, 0.12, 10.4, dark, rx, ry0 + 2.4, -0.5);
  const sgnRoof = neon('GRAND SIMULACRE', rx - 0.08, ry0 + 1.35, -0.5, -P / 2, 10.2, 1.7, '#ff5a8a');
  // мигание отдельных «букв»: лёгкое дрожание яркости
  W.animated.push((dt, t) => { sgnRoof.material.opacity = (Math.sin(t * 23) > 0.97) ? 0.4 : 1; });
  // световые пятна на фасаде от вывесок и козырька
  glow(LX0 - T / 2 - 0.05, 2.5, 0, 9, 0xffa060, 0.12, { rx: 0, ry: -P / 2 });

  // ---------- далёкие кактусы и колючки вдоль дороги ----------
  const cact = col(0x2a3a24);
  for (let i = 0; i < 14; i++) {
    const x = LX0 - 40 - i * 23 - (i % 3) * 7, z = (i % 2 ? 1 : -1) * (9 + (i * 13) % 17);
    cyl(0.35, 0.4, 3 + (i % 3), 7, cact, x, 0, z);
    const arm = cyl(0.22, 0.22, 1.2, 6, cact, x + 0.6, 1.4, z); arm.rotation.z = 0.2;
  }
}
