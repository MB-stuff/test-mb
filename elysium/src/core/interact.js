// ЭЛИЗИУМ · взгляд и действие
// Луч из центра экрана (2.6 м) раз в 80 мс; первый видимый объект → его «владелец» с userData.interact.
// Пропускаются: noRay (наклейки, вода), аддитивные ореолы, почти прозрачное стекло (кроме hitBox).
// Подсказка «[E] …» — подпись владельца (строка или функция).
import * as THREE from 'three';
import { W } from './world.js';

const ray = new THREE.Raycaster(); ray.far = 2.6;
const center = new THREE.Vector2(0, 0);
export const FOCUS = { obj: null, t: 0 };
const isShown = o => { while (o) { if (!o.visible) return false; o = o.parent; } return true; };
function ownerOf(o) {
  let own = o.userData.owner || o;
  while (own && !own.userData.interact) own = own.parent && own.parent.userData ? (own.parent.userData.owner || own.parent) : null;
  return own && own.userData.interact ? own : null;
}
export const labelOf = o => { const l = o && o.userData.interact && o.userData.interact.label; return typeof l === 'function' ? l() : l; };
export function updateFocus(dt, camera, hint, prefix = '[E] ') {
  FOCUS.t -= dt; if (FOCUS.t > 0) return; FOCUS.t = 0.08;
  ray.setFromCamera(center, camera);
  const hits = ray.intersectObjects(Object.values(W.levels).filter(g => g.visible), true);
  let f = null;
  for (const h of hits) {
    const o = h.object, m = o.material;
    if (o.userData.noRay || (m && m.blending === THREE.AdditiveBlending)) continue;
    if (m && m.transparent && m.opacity < 0.2 && !o.userData.owner && !o.userData.hit) continue;
    if (!isShown(o)) continue;
    f = ownerOf(o); break; // первое попадание решает: стена перед предметом его закрывает
  }
  FOCUS.obj = f;
  hint(f ? prefix + labelOf(f) : '', !!f);
}
export function doInteract() { const f = FOCUS.obj; if (f && f.userData.interact) f.userData.interact.action(f); }
// найти взаимодействие по подписи (для тестов и скриптов): act(/Открыть: архив/)
export function findInteract(re, near = null) {
  const list = W.interactables.filter(o => o.userData.interact && re.test(labelOf(o)));
  if (near) list.sort((a, b) => a.getWorldPosition(new THREE.Vector3()).distanceTo(near) - b.getWorldPosition(new THREE.Vector3()).distanceTo(near));
  return list[0] || null;
}
