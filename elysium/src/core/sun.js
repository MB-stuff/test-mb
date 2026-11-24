// ЭЛИЗИУМ · солнце
// Два режима, переключаются настройкой «тени»:
//  • тени ВКЛ — направленный свет с картой теней на всё здание: рамы, шторы и мебель честно отбрасывают тень;
//  • тени ВЫКЛ — мягкие «пятна солнца» под окнами (наклейки): скошены по ходу лучей, с тенями переплётов,
//    и только у окон, которые смотрят на солнце.
// Никогда не показывать оба сразу: пятно поверх настоящей тени выглядит как «свет из ниоткуда».
import * as THREE from 'three';
import { W, CFG, decalMat } from './world.js';

export const SUN = { light: null, on: false, intensity: 13, dir: new THREE.Vector3(), travel: new THREE.Vector2(), timer: 0 };

// azimuth — откуда светит (радианы, 0 = с −Z, π/2 = с −X); elevation — высота (0.38 ≈ 22°: на полу видны пятна)
// bounds — [x0,y0,z0,x1,y1,z1] всего здания: камера тени охватывает его целиком и не «плывёт» за игроком
export function initSun(scene, renderer, { azimuth = 1.17, elevation = 0.384, color = 0xffc080, bounds = [-20, -5, -20, 20, 20, 20], mapSize = [4096, 2048] } = {}) {
  const dir = new THREE.Vector3(-Math.sin(azimuth), 0, -Math.cos(azimuth)).multiplyScalar(Math.cos(elevation)).setY(Math.sin(elevation));
  SUN.dir.copy(dir); SUN.travel.set(-dir.x, -dir.z).normalize(); // направление, в котором идут лучи (в плане)
  const sun = new THREE.DirectionalLight(color, 0); SUN.light = sun; scene.add(sun); scene.add(sun.target);
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap; renderer.shadowMap.autoUpdate = false;
  sun.shadow.mapSize.set(...mapSize); sun.shadow.bias = -0.0003; sun.shadow.normalBias = 0.008;
  const [x0, y0, z0, x1, y1, z1] = bounds, C = new THREE.Vector3((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  sun.position.copy(C).addScaledVector(dir, 150); sun.target.position.copy(C); sun.updateMatrixWorld(); sun.target.updateMatrixWorld();
  const cam = new THREE.PerspectiveCamera(); cam.position.copy(sun.position); cam.lookAt(C); cam.updateMatrixWorld();
  const bb = new THREE.Box3(), v = new THREE.Vector3();
  for (const x of [x0, x1]) for (const y of [y0, y1]) for (const z of [z0, z1]) bb.expandByPoint(v.set(x, y, z).applyMatrix4(cam.matrixWorldInverse));
  const sc = sun.shadow.camera; Object.assign(sc, { left: bb.min.x, right: bb.max.x, bottom: bb.min.y, top: bb.max.y, near: -bb.max.z - 2, far: -bb.min.z + 2 }); sc.updateProjectionMatrix();
  SUN.renderer = renderer;
  return sun;
}
// после постройки и слияния: тень отбрасывают только непрозрачные меши, принимают — освещаемые материалы
export function applyShadowFlags(root) {
  root.traverse(o => {
    if (!o.isMesh) return;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    o.castShadow = mats.every(m => m && !m.transparent && m.blending === THREE.NormalBlending && !m.isShaderMaterial) && !o.userData.hit;
    o.receiveShadow = mats.every(m => m && (m.isMeshLambertMaterial || m.isMeshStandardMaterial || m.isMeshPhongMaterial));
  });
}
export function setShadows(v) {
  SUN.on = v; W.realSun = v; W.shadowDirty = true;
  if (SUN.light) SUN.light.castShadow = v;
  for (const p of W.windowPatches || []) { const off = v || !!p.curtained; p.mesh.userData.off = off; p.mesh.visible = !off; }
}
// карта теней обновляется не каждый кадр: при движении дверей/штор (W.shadowDirty) и раз в полсекунды
export function updateSun(dt, indoorsLit = true) {
  if (!SUN.light) return;
  SUN.light.intensity = SUN.on && indoorsLit ? SUN.intensity : 0;
  SUN.timer -= dt;
  if (SUN.on && SUN.light.intensity > 0 && (W.shadowDirty || SUN.timer <= 0)) { SUN.renderer.shadowMap.needsUpdate = true; W.shadowDirty = false; SUN.timer = 0.5; }
}

// ---------- пятна солнца (режим без теней) ----------
const patchTex = {};
function patchTexture(mull, transom) {
  const key = mull + '_' + transom; if (patchTex[key]) return patchTex[key];
  const S = 128, c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d');
  const tmp = document.createElement('canvas'); tmp.width = tmp.height = S; const t = tmp.getContext('2d');
  t.fillStyle = '#fff'; t.fillRect(10, 6, S - 20, S - 12); t.fillStyle = '#000';
  for (let i = 1; i < mull; i++) t.fillRect(10 + (S - 20) * i / mull - 2, 0, 4, S);
  if (transom) t.fillRect(0, 6 + (S - 12) * 0.72 - 2, S, 4);
  g.filter = 'blur(5px)'; g.drawImage(tmp, 0, 0); g.filter = 'none';
  g.globalCompositeOperation = 'destination-in';
  const gr = g.createLinearGradient(0, 0, 0, S); gr.addColorStop(0, 'rgba(0,0,0,0.95)'); gr.addColorStop(0.55, 'rgba(0,0,0,0.6)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr; g.fillRect(0, 0, S, S);
  return (patchTex[key] = new THREE.CanvasTexture(c));
}
// вызвать после постройки: по всем окнам с inside ≠ 0 и подоконником ниже 1.5 м
export function buildWindowPatches(levelGroups) {
  W.windowPatches = [];
  for (const w of W.windows) {
    if (!w.inside || w.sill > 1.5) continue;
    const inX = w.axis === 'x' ? 0 : w.inside, inZ = w.axis === 'x' ? w.inside : 0;
    const dotN = SUN.travel.x * inX + SUN.travel.y * inZ; if (dotN < 0.2) continue; // окно смотрит от солнца
    const tX = -inZ, tZ = inX, shear = Math.max(-0.45, Math.min(0.45, (SUN.travel.x * tX + SUN.travel.y * tZ) / dotN));
    const width = w.s1 - w.s0, mid = (w.s0 + w.s1) / 2, cx = w.axis === 'x' ? mid : w.c + w.inside * CFG.T / 2, cz = w.axis === 'x' ? w.c + w.inside * CFG.T / 2 : mid;
    const d0 = 0.12 + w.sill * 0.5, d1 = Math.min(d0 + Math.max(1.1, w.wh * 0.62), 3.4), pos = [], uv = [];
    for (const [u, v] of [[0, 0], [1, 0], [1, 1], [0, 1]]) { const sv = (u - 0.5) * width * 1.02, d = d0 + (d1 - d0) * v; pos.push(cx + tX * (sv + shear * d) + inX * d, w.y0 + 0.018, cz + tZ * (sv + shear * d) + inZ * d); uv.push(u, v); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geo.setIndex([0, 1, 2, 0, 2, 3]);
    const m = new THREE.Mesh(geo, decalMat({ map: patchTexture(w.mull, w.wh > 1.4), color: 0xffb060, blending: THREE.AdditiveBlending, opacity: w.light * (0.55 + 0.45 * dotN), side: THREE.DoubleSide }));
    m.userData.noRay = true; m.userData.noMerge = true; levelGroups[w.level].add(m);
    W.windowPatches.push({ mesh: m, win: w, cx, cz, level: w.level, curtained: false });
  }
}
