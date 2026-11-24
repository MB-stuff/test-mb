// ЭЛИЗИУМ · что рисовать
// 1) Этажи-группы: видны свой этаж и соседние (±1), остальные скрыты целиком.
// 2) Предметы (группы и noMerge-меши верхнего уровня) — по расстоянию, по уровню «прорисовки».
// 3) Вещи внутри комнаты с закрытыми дверьми не рисуются, пока игрок снаружи.
// 4) Предметы других этажей — только из зон, откуда их видно (лестница, атриум) или на уровне «дальняя/вся».
// Правило: объект с userData.off (погашенный ореол, спрятанное пятно) отсечение НЕ включает.
import * as THREE from 'three';
import { W, zoneAt } from './world.js';

export const DRAW = [
  { name: 'ближняя', same: 25, other: 12, otherAlways: false, closed: true },
  { name: 'дальняя', same: 45, other: 40, otherAlways: false, closed: true },
  { name: 'вся', same: Infinity, other: Infinity, otherAlways: true, closed: false },
];
export const CULL = { level: 1, list: [], t: 0, seeThrough: null, roomTest: null };
// seeThrough(zone) → true, если из этой зоны видны другие этажи; roomTest(zone) → true, если зона —
// закрываемая комната (номер, кабинет), а не коридор
export function initCull({ seeThrough = z => !!(z && z.seeThrough), roomTest = z => !!(z && z.room) } = {}) {
  CULL.seeThrough = seeThrough; CULL.roomTest = roomTest; CULL.list = [];
  for (const [lk, lv] of Object.entries(W.levels)) for (const o of lv.children) if (o.isGroup || (o.isMesh && o.userData.noMerge)) {
    const bb = new THREE.Box3().setFromObject(o); if (bb.isEmpty()) continue;
    const c = bb.getCenter(new THREE.Vector3()), r = bb.getSize(new THREE.Vector3()).length() / 2;
    o.userData.cullC = c; o.userData.cullR = r; o.userData.cullL = +lk;
    // к комнате относим только то, что внутри неё с запасом 0.3 м: двери и вещи на стене коридора — не её
    if (!o.userData.isDoor) { const zn = zoneAt(+lk, c.x, c.z); if (zn && roomTest(zn) && c.x > zn.minX + 0.3 && c.x < zn.maxX - 0.3 && c.z > zn.minZ + 0.3 && c.z < zn.maxZ - 0.3) o.userData.cullZ = zn; }
    CULL.list.push(o);
  }
  for (const d of W.doors) for (const sd of [-1, 1]) {
    const zn = zoneAt(d.level, d.axis === 'x' ? d.at : d.c + sd * 0.8, d.axis === 'x' ? d.c + sd * 0.8 : d.at);
    if (zn && roomTest(zn)) (zn.doors = zn.doors || []).includes(d) || zn.doors.push(d);
  }
}
export const roomClosed = zn => !!(zn.doors && zn.doors.length && zn.doors.every(d => d.closed));
export function updateLevels(level, showAll = false) {
  for (const [k, g] of Object.entries(W.levels)) g.visible = showAll || Math.abs(+k - level) <= 1;
}
export function updateCull(dt, camera, level, zone, showAll = false) {
  CULL.t -= dt; if (CULL.t > 0) return; CULL.t = 0.1;
  const D = DRAW[CULL.level] || DRAW[1], open = D.otherAlways || CULL.seeThrough(zone);
  for (const o of CULL.list) {
    const d = camera.position.distanceTo(o.userData.cullC) - o.userData.cullR;
    const hidden = D.closed && o.userData.cullZ && o.userData.cullZ !== zone && roomClosed(o.userData.cullZ);
    o.visible = !o.userData.gone && !o.userData.off && (showAll || (!hidden && (o.userData.cullL === level ? d < D.same : open && d < D.other)));
  }
}
