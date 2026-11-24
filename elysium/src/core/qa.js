// ЭЛИЗИУМ · автопроверки (запускать из консоли или из тестов Playwright)
//   __qa()        — расстановка: висит в воздухе / не на стене / в стене / загорожено
//   __qaCoplanar()— совпадающие видимые поверхности ближе 6 мм (главная причина мерцания)
//   __qaGaps()    — щели 1–120 мм между соседними блоками (просветы между этажами, у дверей)
// Открывайте игру с ?qa=1: все этажи и предметы видимы, лучам ничего не мешает.
import * as THREE from 'three';
import { W, CFG } from './world.js';

export function installQA() {
  const statics = () => { const a = []; for (const lv of Object.values(W.levels)) lv.traverse(o => { if (o.isMesh && !o.userData.noRay && !o.userData.hit) a.push(o); }); return a; };
  window.__qa = () => {
    const out = [], rc = new THREE.Raycaster(), list = statics();
    const hitDist = (from, dir, self, far = 0.5) => {
      rc.set(from, dir); rc.far = far;
      for (const h of rc.intersectObjects(list, false)) { let o = h.object, mine = false; while (o) { if (o === self) { mine = true; break; } o = o.parent; } if (!mine) return h.distance; }
      return Infinity;
    };
    const q = new THREE.Quaternion(), n = new THREE.Vector3(), r = new THREE.Vector3(), u = new THREE.Vector3(), p = new THREE.Vector3();
    for (const it of W.qa) {
      const o = it.obj; o.updateMatrixWorld(true); o.getWorldPosition(p); o.getWorldQuaternion(q);
      const l = o.userData.interact && o.userData.interact.label, name = it.what || (typeof l === 'function' ? l() : l) || 'объект', at = p.toArray().map(v => +v.toFixed(2));
      if (it.kind === 'wall') {
        // пять точек (центр и углы) чуть перед предметом: за каждой в пределах 14 см должна быть стена
        n.set(0, 0, 1).applyQuaternion(q); r.set(1, 0, 0).applyQuaternion(q); u.set(0, 1, 0).applyQuaternion(q);
        const c = p.clone().addScaledVector(u, it.dy || 0);
        const bad = [[0, 0], [-0.45, -0.45], [0.45, -0.45], [-0.45, 0.45], [0.45, 0.45]].filter(([a, b]) => hitDist(c.clone().addScaledVector(r, a * (it.w || 0.3)).addScaledVector(u, b * (it.h || 0.3)).addScaledVector(n, 0.06), n.clone().negate(), o, 0.2) > 0.14);
        if (bad.length) out.push(`${name} @${at}: ${bad.length}/5 точек не на стене`);
        if (it.what && it.what.startsWith('картина')) { const fd = hitDist(c.clone().addScaledVector(n, 0.07), n, o, 0.3); if (fd < 0.3) out.push(`${name} @${at}: загорожена (${fd.toFixed(2)} м)`); }
      } else if (it.kind === 'floor' || it.kind === 'table') {
        const d = hitDist(p.clone().add(new THREE.Vector3(0, 0.05, 0)), new THREE.Vector3(0, -1, 0), o, 0.6);
        if (d > (it.kind === 'floor' ? 0.12 : 0.1)) out.push(`${name} @${at}: висит над опорой (${d === Infinity ? '∞' : d.toFixed(2)} м)`);
      } else if (it.kind === 'ceiling') {
        const d = hitDist(p.clone().add(new THREE.Vector3(0, -0.05, 0)), new THREE.Vector3(0, 1, 0), o, 0.6);
        if (d > 0.15) out.push(`${name} @${at}: не касается потолка (${d === Infinity ? '∞' : d.toFixed(2)} м)`);
      }
    }
    // мебель, торчащая в стену: из центра к нижним углам корпуса; если до стены ближе, чем до угла — торчит
    const inv = new THREE.Matrix4(), bb = new THREE.Box3(), tmp = new THREE.Box3(), dir = new THREE.Vector3();
    const shell = list.filter(m => m.parent && m.parent.name && m.parent.name.startsWith('level') && !m.userData.owner);
    for (const it of W.qa) {
      if (!['floor', 'table', 'support'].includes(it.kind)) continue;
      const o = it.obj; o.updateMatrixWorld(true); inv.copy(o.matrixWorld).invert(); bb.makeEmpty();
      o.traverse(m => { if (m.isMesh && !m.userData.hit && m.geometry) { m.geometry.computeBoundingBox(); tmp.copy(m.geometry.boundingBox).applyMatrix4(m.matrixWorld).applyMatrix4(inv); bb.union(tmp); } });
      if (bb.isEmpty()) continue;
      const c = new THREE.Vector3((bb.min.x + bb.max.x) / 2, bb.min.y + Math.min(0.5, (bb.max.y - bb.min.y) / 2), (bb.min.z + bb.max.z) / 2).applyMatrix4(o.matrixWorld);
      let worst = 0;
      for (const [x, z] of [[bb.min.x, bb.min.z], [bb.max.x, bb.min.z], [bb.min.x, bb.max.z], [bb.max.x, bb.max.z]]) {
        const cw = new THREE.Vector3(x, c.y - o.position.y, z).applyMatrix4(o.matrixWorld); cw.y = c.y;
        dir.subVectors(cw, c); const len = dir.length(); if (len < 0.05) continue; dir.normalize();
        rc.set(c, dir); rc.far = len; const h = rc.intersectObjects(shell, false)[0];
        if (h) worst = Math.max(worst, len - h.distance);
      }
      if (worst > 0.035) { const l = o.userData.interact && o.userData.interact.label; out.push(`в стене на ${(worst * 100).toFixed(0)} см: ${it.what || (typeof l === 'function' ? l() : l) || 'предмет'} @${o.position.toArray().map(v => +v.toFixed(2))}`); }
    }
    return out;
  };

  window.__qaCoplanar = (maxReport = 60) => {
    const tris = [], a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), n = new THREE.Vector3(), e1 = new THREE.Vector3(), e2 = new THREE.Vector3();
    for (const root of Object.values(W.levels)) root.traverse(o => {
      if (!o.isMesh || o.userData.noRay || o.userData.hit) return;
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      if (mats.every(m => m.transparent || m.polygonOffset || m.blending !== THREE.NormalBlending)) return;
      o.updateMatrixWorld(true);
      const g = o.geometry, pos = g.attributes.position, idx = g.index, cnt = idx ? idx.count : pos.count;
      const matOf = i => { if (!Array.isArray(o.material)) return o.material; const gr = g.groups.find(gr => i >= gr.start && i < gr.start + gr.count); return gr ? o.material[gr.materialIndex] : o.material[0]; };
      for (let i = 0; i < cnt; i += 3) {
        const m = matOf(i); if (m.transparent || m.polygonOffset) continue;
        a.fromBufferAttribute(pos, idx ? idx.getX(i) : i).applyMatrix4(o.matrixWorld); b.fromBufferAttribute(pos, idx ? idx.getX(i + 1) : i + 1).applyMatrix4(o.matrixWorld); c.fromBufferAttribute(pos, idx ? idx.getX(i + 2) : i + 2).applyMatrix4(o.matrixWorld);
        n.crossVectors(e1.subVectors(b, a), e2.subVectors(c, a)); if (n.length() / 2 < 1e-4) continue; n.normalize();
        const ax = Math.abs(n.x) > 0.999 ? 0 : Math.abs(n.y) > 0.999 ? 1 : Math.abs(n.z) > 0.999 ? 2 : -1; if (ax < 0) continue;
        const sgn = Math.sign([n.x, n.y, n.z][ax]), d = [a.x, a.y, a.z][ax], uI = (ax + 1) % 3, vI = (ax + 2) % 3;
        const P = [a, b, c].map(p => [[p.x, p.y, p.z][uI], [p.x, p.y, p.z][vI]]);
        tris.push({ ax, sgn, d, P, minU: Math.min(...P.map(q => q[0])), maxU: Math.max(...P.map(q => q[0])), minV: Math.min(...P.map(q => q[1])), maxV: Math.max(...P.map(q => q[1])), m: m.name || m.type, o });
      }
    });
    const buckets = new Map();
    for (const t of tris) { const k = t.ax + '|' + t.sgn + '|' + Math.round(t.d / 0.01); (buckets.get(k) || buckets.set(k, []).get(k)).push(t); }
    const res = new Map();
    const ov = (p, q) => Math.min(p.maxU, q.maxU) - Math.max(p.minU, q.minU) > 0.02 && Math.min(p.maxV, q.maxV) - Math.max(p.minV, q.minV) > 0.02;
    const sepAx = (A, B) => { for (const T of [A, B]) for (let i = 0; i < 3; i++) { const p = T[i], q = T[(i + 1) % 3], nx = q[1] - p[1], ny = p[0] - q[0]; const pa = A.map(r => r[0] * nx + r[1] * ny), pb = B.map(r => r[0] * nx + r[1] * ny); if (Math.max(...pa) < Math.min(...pb) + 1e-3 || Math.max(...pb) < Math.min(...pa) + 1e-3) return true; } return false; };
    for (const [k, list] of buckets) {
      const [ax, sg, di] = k.split('|');
      for (const L of [list, buckets.get(ax + '|' + sg + '|' + (+di + 1)) || []]) for (let i = 0; i < list.length; i++) for (let j = (L === list ? i + 1 : 0); j < L.length; j++) {
        const p = list[i], q = L[j];
        if ((p.o === q.o && p.m === q.m) || Math.abs(p.d - q.d) > 0.006 || !ov(p, q) || sepAx(p.P, q.P)) continue;
        const FH = CFG.FH;
        if (p.ax === 1 && p.sgn < 0 && Math.abs(p.d / FH - Math.round(p.d / FH)) < 0.003) continue; // низ на уровне пола не виден
        const up = Math.ceil(p.d / FH - 1e-6) * FH - p.d;
        if (p.ax === 1 && p.sgn > 0 && up < 0.03 && up > 0.005) continue; // верх стены под полом следующего этажа
        // видна ли грань: точка в 12 мм перед ней не должна быть внутри стены/пола/потолка
        const cu = (Math.max(p.minU, q.minU) + Math.min(p.maxU, q.maxU)) / 2, cv = (Math.max(p.minV, q.minV) + Math.min(p.maxV, q.maxV)) / 2;
        const pt = [0, 0, 0]; pt[p.ax] = p.d + p.sgn * 0.012; pt[(p.ax + 1) % 3] = cu; pt[(p.ax + 2) % 3] = cv;
        if (W.solids.some(s => pt[0] > s[0] + 1e-3 && pt[0] < s[3] - 1e-3 && pt[1] > s[1] + 1e-3 && pt[1] < s[4] - 1e-3 && pt[2] > s[2] + 1e-3 && pt[2] < s[5] - 1e-3)) continue;
        const key = [p.m, q.m].sort().join(' × ') + ' @' + 'xyz'[p.ax] + '=' + p.d.toFixed(2);
        const r = res.get(key) || { n: 0, at: [] }; r.n++; if (r.at.length < 2) r.at.push([(p.minU + p.maxU) / 2, (p.minV + p.maxV) / 2].map(x => +x.toFixed(1)).join(',')); res.set(key, r);
      }
    }
    return [...res.entries()].sort((x, y) => y[1].n - x[1].n).slice(0, maxReport).map(([k, r]) => `${k} (${r.n} пар; ${r.at.join(' / ')})`);
  };

  window.__qaGaps = (minMM = 1, maxMM = 120) => {
    const S = W.solids, out = [];
    for (let i = 0; i < S.length; i++) for (let j = i + 1; j < S.length; j++) {
      const a = S[i], c = S[j];
      for (let ax = 0; ax < 3; ax++) {
        const o1 = (ax + 1) % 3, o2 = (ax + 2) % 3;
        if (Math.min(a[o1 + 3], c[o1 + 3]) - Math.max(a[o1], c[o1]) < 0.05 || Math.min(a[o2 + 3], c[o2 + 3]) - Math.max(a[o2], c[o2]) < 0.05) continue;
        const gap = Math.max(c[ax] - a[ax + 3], a[ax] - c[ax + 3]);
        if (!(gap > minMM / 1000 && gap < maxMM / 1000)) continue;
        // щель закрыта третьим блоком (наличник, рама)? — тогда это не щель
        const mid = [0, 0, 0]; mid[ax] = (Math.max(a[ax], c[ax]) + Math.min(a[ax + 3], c[ax + 3])) / 2;
        mid[o1] = (Math.max(a[o1], c[o1]) + Math.min(a[o1 + 3], c[o1 + 3])) / 2; mid[o2] = (Math.max(a[o2], c[o2]) + Math.min(a[o2 + 3], c[o2 + 3])) / 2;
        if (S.some(s => mid[0] >= s[0] && mid[0] <= s[3] && mid[1] >= s[1] && mid[1] <= s[4] && mid[2] >= s[2] && mid[2] <= s[5])) continue;
        out.push(`ось ${'xyz'[ax]}: щель ${(gap * 1000).toFixed(0)} мм между [${a.map(v => +v.toFixed(2))}] и [${c.map(v => +v.toFixed(2))}]`);
      }
    }
    return out;
  };
}
