// ЭЛИЗИУМ · искусственный свет
// Сотни ламп-«якорей» (anchor) и всего 10 настоящих PointLight. Каждые 0.25 с пул раздаётся ближайшим
// и самым ярким якорям текущего этажа; источник появляется и гаснет плавно (без «хлопков»).
// Свет каждой лампы ограничен коробкой её комнаты (зоны): шейдер обнуляет вклад за пределами коробки,
// поэтому свет не проходит сквозь стены. Границы зон — по осям стен: внутренняя грань стены освещается,
// соседняя комната — нет.
import * as THREE from 'three';
import { W, CFG, zoneAt, setLevel, box, col, interact, mount, grp, hitBox } from './world.js';
import * as S from './audio.js';

const POOL_N = 10;
const LBU = { min: { value: [] }, max: { value: [] } };
for (let i = 0; i < POOL_N; i++) { LBU.min.value.push(new THREE.Vector3(-1e5, -1e5, -1e5)); LBU.max.value.push(new THREE.Vector3(1e5, 1e5, 1e5)); }
// патч шейдеров three.js: маска «точка внутри коробки» для каждого точечного источника
THREE.ShaderChunk.lights_pars_begin += `
float lbMask( vec3 p, vec3 a, vec3 b ) { vec3 s = step( a, p ) * step( p, b ); return s.x * s.y * s.z; }
#if NUM_POINT_LIGHTS > 0
uniform vec3 uLBMin[ NUM_POINT_LIGHTS ]; uniform vec3 uLBMax[ NUM_POINT_LIGHTS ];
#endif
`;
THREE.ShaderChunk.lights_fragment_begin = THREE.ShaderChunk.lights_fragment_begin
  .replace('vec3 geometryPosition = - vViewPosition;', 'vec3 geometryPosition = - vViewPosition;\nvec3 lbWorld = transpose( mat3( viewMatrix ) ) * ( geometryPosition - viewMatrix[ 3 ].xyz );')
  .replace('getPointLightInfo( pointLight, geometryPosition, directLight );', 'getPointLightInfo( pointLight, geometryPosition, directLight );\n\t\tdirectLight.color *= lbMask( lbWorld, uLBMin[ i ], uLBMax[ i ] );');
THREE.Material.prototype.onBeforeCompile = function (sh) {
  if (sh.fragmentShader.includes('lights_pars_begin')) { sh.uniforms.uLBMin = LBU.min; sh.uniforms.uLBMax = LBU.max; }
};

export const L = { pool: [], hemi: null, amb: null, ambBase: 0.32, hemiBase: 0.78 };
export function initLights(scene, { hemiSky = 0xc08a5a, hemiGround = 0x2a1008, ambColor = 0x5a3a28 } = {}) {
  L.hemi = new THREE.HemisphereLight(hemiSky, hemiGround, 1); scene.add(L.hemi);
  L.amb = new THREE.AmbientLight(ambColor, L.ambBase); scene.add(L.amb);
  for (let i = 0; i < POOL_N; i++) { const l = new THREE.PointLight(0xffaa66, 0, 8, 1.6); l.userData = { a: null, fade: 0, dying: false }; scene.add(l); L.pool.push(l); }
}

// коробка света лампы = коробка её зоны (+ высота зоны; у лестничной шахты — продлена вверх и вниз)
const boxCache = new Map();
function lightBox(a) {
  if (boxCache.has(a)) return boxCache.get(a);
  const z = zoneAt(a.level, a.pos.x, a.pos.z); let b = null;
  if (z && !z.open) {
    const y0 = z.level * CFG.FH, sh = z.shaft || 0;
    b = [new THREE.Vector3(z.minX - 0.02, y0 - 0.05 - sh, z.minZ - 0.02), new THREE.Vector3(z.maxX + 0.02, y0 + (z.h || CFG.FH) - 0.02 + sh, z.maxZ + 0.02)];
  }
  a.zone = z; boxCache.set(a, b); return b;
}

let lightT = 0;
const blackoutOff = a => W.flags.blackout && a.grid;
export function updateLights(t, dt, camera, level, zone) {
  lightT -= dt;
  if (lightT <= 0) {
    lightT = 0.25;
    const cands = [];
    for (const a of W.anchors) {
      if (!a.on || blackoutOff(a)) continue;
      lightBox(a);
      // свет других этажей — только если из текущей зоны их видно (атриум, окно во двусветный зал)
      if (a.level !== level && !(zone && zone.lightsFrom && zone.lightsFrom.includes(a.zone))) continue;
      const d = a.pos.distanceTo(camera.position); if (d > a.distance + 10) continue;
      cands.push([d - a.intensity * 0.25, a]);
    }
    cands.sort((x, y) => x[0] - y[0]);
    const top = new Set(cands.slice(0, POOL_N).map(c => c[1])), keep = new Set(cands.slice(0, POOL_N + 3).map(c => c[1])), want = new Set(top);
    for (const l of L.pool) { const a = l.userData.a; if (a && (!keep.has(a) || !a.on || blackoutOff(a))) l.userData.dying = true; else if (a) { want.delete(a); l.userData.dying = false; } }
    for (const a of want) {
      // свободного нет — забираем у гаснущего или у дальней лампы «из запаса»: иначе включённая заново
      // ближняя лампа ждала бы, пока игрок отойдёт
      const l = L.pool.find(l => !l.userData.a) || L.pool.find(l => l.userData.dying) || L.pool.find(l => !top.has(l.userData.a)); if (!l) break;
      Object.assign(l.userData, { a, fade: 0, dying: false }); l.position.copy(a.pos); l.color.copy(a.color); l.distance = a.distance;
    }
  }
  L.pool.forEach((l, i) => {
    const b = l.userData.a && lightBox(l.userData.a);
    if (b) { LBU.min.value[i].copy(b[0]); LBU.max.value[i].copy(b[1]); } else { LBU.min.value[i].setScalar(-1e5); LBU.max.value[i].setScalar(1e5); }
    const a = l.userData.a; if (!a) { l.intensity = 0; return; }
    if (l.userData.dying) { l.userData.fade -= dt * 2.5; if (l.userData.fade <= 0) { l.userData.a = null; l.userData.dying = false; l.intensity = 0; return; } }
    else l.userData.fade = Math.min(1, l.userData.fade + dt * 2.5);
    let k = 1; if (a.flicker) { const n = Math.sin(t * 13 + a.phase) + Math.sin(t * 31 + a.phase * 2); k = n > 1.82 - a.flicker * 0.3 ? 0.35 : 1; }
    l.intensity = a.intensity * 3.2 * k * l.userData.fade;
  });
  // рассеянный свет комнаты: слабее при задёрнутых шторах и погашенном верхнем свете —
  // иначе картины и стены «светятся» в тёмной комнате
  const amb = zone && zone.amb || 1.15, dark = zone && zone.dark || 0;
  const lampsOff = zone && zone.lamps && !zone.lamps.some(a => a.on && !blackoutOff(a)) ? 1 : 0;
  L.hemi.intensity = (W.flags.blackout ? 0.55 : 1) * amb * L.hemiBase * (1 - 0.62 * dark) * (1 - 0.4 * lampsOff);
  L.amb.intensity = L.ambBase * (1 - 0.5 * dark) * (1 - 0.35 * lampsOff);
  // гул ближайшей лампы-трубки
  let hum = 0;
  if (!W.flags.blackout) for (const a of W.anchors) if (a.hum && a.on && a.level === level) { const v = Math.max(0, 1 - a.pos.distanceTo(camera.position) / 7); hum = Math.max(hum, v * v * (a.flicker ? 0.05 : 0.03)); }
  S.setHum(hum);
}

// Видимое состояние лампы. Плафон светится, только если лампа включена И есть ток (рубильник).
// a.setOn(v) — выключатель; a.refresh() — после рубильника. extra(lit) — погасить ореол и т. п.
// ВАЖНО: всё, что лампа прячет, помечается userData.off — иначе отсечение по расстоянию включит его обратно.
export function lampVis(a, meshes, onMat, offMat, extra = null) {
  for (const m of meshes) m.userData.noMerge = true;
  a.refresh = () => { const lit = a.on && !blackoutOff(a); for (const m of meshes) m.material = lit ? onMat : offMat; if (extra) extra(lit); };
  a.setOn = v => { a.on = v; a.refresh(); };
  a.refresh(); return a;
}
export function setBlackout(v) { W.flags.blackout = v; for (const a of W.anchors) if (a.refresh) a.refresh(); }

// ---------- выключатели ----------
// Расставляются автоматически, ПОСЛЕ постройки мира: у каждой двери в комнату с верхним светом
// (со стороны ручки), а в комнатах без дверей — у края проёма. Проверяется, что за выключателем
// настоящая стена (не окно, не дверь), что место не занято картиной и не загорожено мебелью.
// Лампы, которыми управляет выключатель, — все якоря с switchable в этой зоне.
// opts.onClicks(zone, n) — пасхалки на «много щелчков подряд»; вернуть true, чтобы не переключать свет.
export function addLightSwitches({ onClicks = null, height = 1.2 } = {}) {
  const T = CFG.T, lampsOf = new Map(), done = new Set();
  for (const a of W.anchors) if (a.switchable) { const zn = zoneAt(a.level, a.pos.x, a.pos.z); if (zn) { if (!lampsOf.has(zn)) lampsOf.set(zn, []); lampsOf.get(zn).push(a); } }
  const doorCols = new Set(W.doors.map(d => d.collider));
  const wallItems = W.qa.filter(q => q.kind === 'wall').map(q => q.obj.getWorldPosition(new THREE.Vector3()));
  const free = (x, y, z) => wallItems.every(p => Math.abs(p.y - y) > 0.55 || Math.hypot(p.x - x, p.z - z) > 0.45);
  const wallCol = (axis, c, s, y) => W.colliders.find(cl => cl.enabled !== false && !doorCols.has(cl) && cl.ref && cl.ref.isMesh && cl.minY <= y && cl.maxY >= y &&
    (axis === 'x' ? cl.minZ <= c && cl.maxZ >= c && cl.minX <= s && cl.maxX >= s && cl.maxZ - cl.minZ < 0.6 : cl.minX <= c && cl.maxX >= c && cl.minZ <= s && cl.maxZ >= s && cl.maxX - cl.minX < 0.6));
  const wallAt = (...a) => !!wallCol(...a);
  const blocked = (x, y, z) => W.colliders.some(cl => cl.enabled !== false && x > cl.minX && x < cl.maxX && z > cl.minZ && z < cl.maxZ && y > cl.minY && y < cl.maxY);
  const ok = (zn, axis, c, sd, s) => {
    const lo = axis === 'x' ? zn.minX : zn.minZ, hi = axis === 'x' ? zn.maxX : zn.maxZ, y = zn.level * CFG.FH + height;
    if (s < lo + 0.35 || s > hi - 0.35 || !wallAt(axis, c, s, y) || !wallAt(axis, c, s - 0.08, y) || !wallAt(axis, c, s + 0.08, y)) return false;
    const fx = axis === 'x' ? s : c + sd * (T / 2 + 0.1), fz = axis === 'x' ? c + sd * (T / 2 + 0.1) : s;
    return !blocked(fx, y, fz) && free(axis === 'x' ? s : c, y, axis === 'x' ? c : s);
  };
  const place = (zn, axis, c, sd, along) => {
    const lamps = lampsOf.get(zn), y = zn.level * CFG.FH + height; zn.lamps = lamps;
    done.add(zn); setLevel(zn.level);
    const wc = wallCol(axis, c, along, y); // грань — у настоящего блока стены, а не у оси зоны
    const face = wc ? (axis === 'x' ? (sd > 0 ? wc.maxZ : wc.minZ) : (sd > 0 ? wc.maxX : wc.minX)) + sd * 0.003 : c + sd * (T / 2 + 0.003);
    const x = axis === 'x' ? along : face, z = axis === 'x' ? face : along;
    const g = grp(x, z, axis === 'x' ? (sd > 0 ? 0 : Math.PI) : (sd > 0 ? Math.PI / 2 : -Math.PI / 2), y);
    box(0.08, 0.12, 0.012, col(0xd8d0bc), 0, -0.06, 0.006, { parent: g });
    const key = box(0.022, 0.04, 0.012, col(0xf0e8d8), 0, -0.02, 0.016, { parent: g }); key.userData.noMerge = true;
    hitBox(g, 0.16, 0.2, 0.08, -0.1);
    const st = () => lamps.some(a => a.on), setKey = () => { key.rotation.x = st() ? -0.35 : 0.35; }; setKey();
    let clicks = 0, last = 0;
    interact(g, () => st() ? 'Выключить свет' : 'Включить свет', () => {
      const t = performance.now(); clicks = t - last < 2500 ? clicks + 1 : 1; last = t;
      if (onClicks && onClicks(zn, clicks, g)) { clicks = 0; S.sfxSwitch(); return; }
      const v = !st(); for (const a of lamps) a.setOn(v); setKey(); S.sfxSwitch();
      if (v && W.flags.blackout && W.onDeadSwitch) W.onDeadSwitch();
    });
    mount(g, 'wall', { w: 0.08, h: 0.12, what: 'выключатель' });
    wallItems.push(new THREE.Vector3(x, y, z));
  };
  for (const d of W.doors) for (const sd of [-1, 1]) {
    const zn = zoneAt(d.level, d.axis === 'x' ? d.at : d.c + sd * 0.8, d.axis === 'x' ? d.c + sd * 0.8 : d.at);
    if (!zn || done.has(zn) || !lampsOf.has(zn)) continue;
    const s = [d.at - d.hinge * (d.w / 2 + 0.25), d.at + d.hinge * (d.w / 2 + 0.25), d.at - d.hinge * (d.w / 2 + 0.5)].find(s => ok(zn, d.axis, d.c, sd, s));
    if (s !== undefined) place(zn, d.axis, d.c, sd, s);
  }
  for (const [zn] of lampsOf) {
    if (done.has(zn)) continue;
    const y = zn.level * CFG.FH; let best = null;
    const sides = [['x', zn.minZ, 1], ['x', zn.maxZ, -1], ['z', zn.minX, 1], ['z', zn.maxX, -1]];
    for (const [axis, c, sd] of sides) {
      const lo = axis === 'x' ? zn.minX : zn.minZ, hi = axis === 'x' ? zn.maxX : zn.maxZ; let prev = null;
      for (let s = lo + 0.2; s < hi - 0.2; s += 0.1) {
        const open = !wallAt(axis, c, s, y + 0.3) && !wallAt(axis, c, s, y + height);
        if (prev !== null && open !== prev) for (const off of [0.3, 0.45, 0.6]) { const ss = open ? s - 0.1 - off : s + off; if (ok(zn, axis, c, sd, ss)) { if (!best || off < best[0]) best = [off, axis, c, sd, ss]; break; } }
        prev = open;
      }
    }
    if (!best) for (const [axis, c, sd] of sides) for (let s = (axis === 'x' ? zn.minX : zn.minZ) + 0.5; !best && s < (axis === 'x' ? zn.maxX : zn.maxZ) - 0.5; s += 0.25) if (ok(zn, axis, c, sd, s)) best = [9, axis, c, sd, s];
    if (best) place(zn, best[1], best[2], best[3], best[4]);
  }
  return [...lampsOf.keys()].map(zn => (done.has(zn) ? '+ ' : '- ') + zn.name);
}
