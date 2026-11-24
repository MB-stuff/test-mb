// ЭЛИЗИУМ · двери
// Дверь ставится в проём стены типа 'door' (тот же axis, c, at, w, h). Полотно на петле, наличник с двух
// сторон, коллайдер на время «закрыто». Полотно на 18 мм уже проёма и заходит под наличник: никаких щелей на просвет.
import * as THREE from 'three';
import { W, G, CFG, col, block, boxGeo, addCollider, interact } from './world.js';
import * as S from './audio.js';

const cap = s => s[0].toUpperCase() + s.slice(1);

export class Door {
  // swing: +1/−1 — в какую сторону открывается; hinge: −1/+1 — петли с меньшей/большей стороны проёма.
  // Проверь, куда ложится открытое полотно: оно не должно закрывать то, с чем игроку нужно взаимодействовать.
  constructor(axis, c, at, { w = 1, h = 2.2, swing = 1, hinge = -1, mat = null, locked = false, name = 'дверь',
    lockedMsg = 'Заперто.', key = null, onOpen = null, onLocked = null, heavy = false, sound = true } = {}) {
    Object.assign(this, { axis, c, at, w, h, swing, hinge, locked, name, lockedMsg, key, onOpen, onLocked, heavy, sound });
    this.level = W.level; W.doors.push(this);
    this.open = false; this.angle = 0; this.target = 0;
    const y0 = W.level * CFG.FH, T = CFG.T;
    this.pivot = new THREE.Group();
    this.pivot.position.set(axis === 'x' ? at + hinge * w / 2 : c, y0, axis === 'x' ? c : at + hinge * w / 2);
    if (axis === 'z') this.pivot.rotation.y = -Math.PI / 2;
    W.group.add(this.pivot);
    const panel = new THREE.Mesh(boxGeo(w - 0.036, h - 0.017, 0.06, 1), mat || col(0x4a2a18));
    panel.position.set(-hinge * (w / 2), 0.005 + (h - 0.017) / 2, 0); this.pivot.add(panel); this.panel = panel;
    const inset = col(0x2a160c);
    for (const s of [-1, 1]) for (const yy of [0.62, 1.55]) { const p = new THREE.Mesh(boxGeo(w * 0.62, yy < 1 ? 0.8 : 0.9, 0.02, 1), inset); p.position.set(-hinge * (w / 2), yy, s * 0.035); this.pivot.add(p); }
    const brass = col(0xc09a4a, { emissive: 0x2a1a00 });
    for (const s of [-1, 1]) { const k = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), brass); k.position.set(-hinge * (w - 0.1), 1.0, s * 0.06); this.pivot.add(k); }
    // наличник выступает из стены на 4 см с каждой стороны и заходит в проём на 2 см
    const fm = col(0x24160c), TT = T / 2 + 0.04;
    const A = (a0, a1, ya, yb) => axis === 'x' ? block(a0, ya, c - TT, a1, yb, c + TT, fm, { collide: false }) : block(c - TT, ya, a0, c + TT, yb, a1, fm, { collide: false });
    A(at - w / 2 - 0.08, at - w / 2 + 0.02, y0, y0 + h + 0.08); A(at + w / 2 - 0.02, at + w / 2 + 0.08, y0, y0 + h + 0.08); A(at - w / 2 + 0.02, at + w / 2 - 0.02, y0 + h - 0.02, y0 + h + 0.08);
    this.collider = axis === 'x' ? addCollider(at - w / 2, y0, c - 0.1, at + w / 2, y0 + h, c + 0.1) : addCollider(c - 0.1, y0, at - w / 2, c + 0.1, y0 + h, at + w / 2);
    this.pivot.userData.owner = panel; this.pivot.userData.isDoor = true; panel.userData.dynamic = true;
    interact(panel, () => this.locked ? `${cap(this.name)}: заперто` : (this.open ? 'Закрыть: ' : 'Открыть: ') + this.name, () => this.toggle());
    const upd = dt => this.update(dt); upd.always = true; W.animated.push(upd);
  }
  toggle(force) {
    if (this.locked) {
      if (this.key && G.hasItem && G.hasItem(this.key)) { this.locked = false; G.toast && G.toast(`Ключ подошёл: ${this.name}`); S.sfxClick(); }
      else { S.sfxLocked(); if (this.onLocked) this.onLocked(this); else G.toast && G.toast(this.lockedMsg); return; }
    }
    this.open = force !== undefined ? force : !this.open;
    this.target = this.open ? this.swing * this.hinge * 1.45 * (this.axis === 'z' ? -1 : 1) : 0;
    this.collider.enabled = !this.open;
    if (this.sound) { if (this.open) S.sfxDoorOpen(this.heavy); else setTimeout(() => S.sfxDoorClose(), 380); }
    if (this.open && this.onOpen) this.onOpen(this);
  }
  update(dt) {
    const d = this.target - this.angle;
    if (Math.abs(d) > 0.001) { this.angle += d * Math.min(1, dt * 4); this.pivot.rotation.y = (this.axis === 'z' ? -Math.PI / 2 : 0) + this.angle; W.shadowDirty = true; }
  }
  get closed() { return !this.open && Math.abs(this.angle) < 0.01; }
}
