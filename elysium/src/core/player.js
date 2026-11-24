// ЭЛИЗИУМ · игрок и физика
// Цилиндр радиуса r против AABB-коллайдеров (окружность против прямоугольника в плане XZ, по высоте —
// только коллайдеры между коленом и макушкой). Высота пола берётся из «поверхностей»: самая высокая,
// на которую можно шагнуть (не выше 0.46 м над ногами). Шаг движения дробится по 12 см — на низком FPS
// игрок не проходит сквозь тонкие стены. Если под новой точкой нет поверхности — туда шагнуть нельзя.
import * as THREE from 'three';
import { W, CFG } from './world.js';
import { keys, touch } from './input.js';
import * as S from './audio.js';

const P = Math.PI;
export const player = {
  pos: new THREE.Vector3(0, 0, 0), vel: new THREE.Vector3(), vy: 0, yaw: 0, pitch: 0,
  radius: 0.28, eye: 1.62, walk: 2.5, run: 4.6, stepUp: 0.46, gravity: 22,
  level: 0, ground: 'concrete', bob: 0, lastStepPhase: 0, sitting: null, standPos: null,
  spawn: new THREE.Vector3(0, 0, 0),
};

export function look(dx, dy, sens = 1) {
  const k = 0.0022 * sens;
  player.yaw -= dx * k; player.pitch = Math.max(-1.45, Math.min(1.45, player.pitch - dy * k));
  if (player.sitting) { // сидя голова поворачивается не дальше плеча
    const base = player.sitting.yaw; let d = Math.atan2(Math.sin(player.yaw - base), Math.cos(player.yaw - base));
    const lim = player.sitting.lie ? 1.2 : 1.6; player.yaw = base + Math.max(-lim, Math.min(lim, d));
  }
}

export function groundAt(x, z, y) {
  let best = -Infinity, snd = 'concrete';
  for (const s of W.surfaces) {
    if (x < s.minX || x > s.maxX || z < s.minZ || z > s.maxZ) continue;
    const h = s.y(x, z);
    if (h <= y + player.stepUp && h > best) { best = h; snd = s.sound; }
  }
  return [best, snd];
}
export function collide(p) {
  const r = player.radius, y0 = p.y + 0.3, y1 = p.y + 1.75;
  for (let it = 0; it < 3; it++) {
    let moved = false;
    for (const c of W.colliders) {
      if (!c.enabled || c.maxY <= y0 || c.minY >= y1) continue;
      if (p.x + r < c.minX || p.x - r > c.maxX || p.z + r < c.minZ || p.z - r > c.maxZ) continue;
      const cx = Math.max(c.minX, Math.min(p.x, c.maxX)), cz = Math.max(c.minZ, Math.min(p.z, c.maxZ));
      const dx = p.x - cx, dz = p.z - cz, d2 = dx * dx + dz * dz;
      if (d2 > r * r) continue;
      if (d2 > 1e-8) { const d = Math.sqrt(d2), push = r - d; p.x += dx / d * push; p.z += dz / d * push; }
      else { // центр внутри коробки: выталкиваем по кратчайшей оси
        const pen = [p.x - c.minX + r, c.maxX - p.x + r, p.z - c.minZ + r, c.maxZ - p.z + r], m = Math.min(...pen), i = pen.indexOf(m);
        if (i === 0) p.x -= m; else if (i === 1) p.x += m; else if (i === 2) p.z -= m; else p.z += m;
      }
      moved = true;
    }
    if (!moved) break;
  }
}

// сесть / лечь: камера переезжает в точку, взгляд ограничен; движение — встать
export function sit({ x, y, z, yaw, lie = false }, hint) {
  if (player.sitting) return;
  player.standPos = player.pos.clone(); player.sitting = { x, y, z, yaw, lie, t: performance.now() };
  player.yaw = yaw; player.pitch = lie ? 1.1 : -0.05; hint && hint();
}
export function standUp() { if (!player.sitting) return; player.sitting = null; player.pitch = 0; if (player.standPos) player.pos.copy(player.standPos); }
export function teleport(x, y, z, yaw) { player.pos.set(x, y, z); player.yaw = yaw; player.pitch = 0; player.vy = 0; player.vel.set(0, 0, 0); }

const fwd = new THREE.Vector3(), right = new THREE.Vector3(), wish = new THREE.Vector3(), tmp = new THREE.Vector3(), np = new THREE.Vector3();
export function updatePlayer(dt, camera, canMove) {
  if (player.sitting) {
    const moving = keys.KeyW || keys.KeyS || keys.KeyA || keys.KeyD || keys.ArrowUp || keys.ArrowDown || Math.abs(touch.mx) + Math.abs(touch.my) > 0.6;
    if (moving && performance.now() - player.sitting.t > 600) standUp();
    else { camera.position.lerp(tmp.set(player.sitting.x, player.sitting.y, player.sitting.z), Math.min(1, dt * 6)); camera.rotation.set(player.pitch, player.yaw, 0, 'YXZ'); return; }
  }
  fwd.set(-Math.sin(player.yaw), 0, -Math.cos(player.yaw)); right.set(Math.cos(player.yaw), 0, -Math.sin(player.yaw));
  wish.set(0, 0, 0);
  if (canMove) {
    if (keys.KeyW || keys.ArrowUp) wish.add(fwd);
    if (keys.KeyS || keys.ArrowDown) wish.sub(fwd);
    if (keys.KeyD || keys.ArrowRight) wish.add(right);
    if (keys.KeyA || keys.ArrowLeft) wish.sub(right);
    if (touch.move) { wish.addScaledVector(fwd, -touch.my); wish.addScaledVector(right, touch.mx); }
  }
  const run = keys.ShiftLeft || keys.ShiftRight;
  if (wish.lengthSq() > 1) wish.normalize();
  player.vel.lerp(wish.multiplyScalar(run ? player.run : player.walk), Math.min(1, dt * 10)); // инерция ~0.1 с
  const p = player.pos;
  const steps = Math.max(1, Math.ceil(Math.hypot(player.vel.x, player.vel.z) * dt / 0.12));
  for (let i = 0; i < steps; i++) {
    np.set(p.x + player.vel.x * dt / steps, p.y, p.z + player.vel.z * dt / steps); collide(np);
    if (groundAt(np.x, np.z, p.y)[0] > -Infinity) { p.x = np.x; p.z = np.z; }
  }
  const [g, snd] = groundAt(p.x, p.z, p.y);
  player.vy -= player.gravity * dt; p.y += player.vy * dt;
  if (g > -Infinity && p.y <= g) { p.y = g; player.vy = 0; player.ground = snd; }
  if (p.y < -50) { p.copy(player.spawn); player.vy = 0; } // страховка: провалился — вернуть на старт
  player.level = Math.floor((p.y + 1.2) / CFG.FH);
  // покачивание головы и шаги по фазе покачивания (звук шага — в нижней точке)
  const sp = Math.hypot(player.vel.x, player.vel.z);
  if (sp > 0.3 && player.vy === 0) {
    player.bob += dt * sp * (run ? 2.2 : 2.6);
    const ph = Math.floor(player.bob / P); if (ph !== player.lastStepPhase) { player.lastStepPhase = ph; S.sfxStep(player.ground, run); }
  } else player.bob += (Math.round(player.bob / P) * P - player.bob) * Math.min(1, dt * 6);
  camera.position.set(p.x, p.y + player.eye - 0.03 + Math.abs(Math.sin(player.bob)) * 0.045, p.z);
  camera.rotation.set(player.pitch, player.yaw, 0, 'YXZ');
}
