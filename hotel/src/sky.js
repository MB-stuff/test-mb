// Пейзаж: тёмно-малиновая пустыня, тёпло-жёлтое небо, маленькое оранжевое солнце.
import * as THREE from 'three';

export const SUN_DIR = new THREE.Vector3(-1, 0.16, -0.42).normalize();

const skyVert = `
varying vec3 vDir;
void main(){ vDir = normalize(position); vec4 p = modelViewMatrix * vec4(position,1.0); gl_Position = projectionMatrix * p; gl_Position.z = gl_Position.w; }`;
const skyFrag = `
uniform float uTime; uniform vec3 uSun; uniform float uGlitch;
varying vec3 vDir;
float h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
float n(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
  return mix(mix(h(i),h(i+vec2(1,0)),f.x), mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x), f.y); }
float fbm(vec2 p){ float a=0.5, s=0.0; for(int i=0;i<5;i++){ s+=a*n(p); p*=2.03; a*=0.5; } return s; }
void main(){
  vec3 d = normalize(vDir);
  float y = d.y;
  // градиент: у горизонта светлый тёплый жёлтый, в зените — насыщенный янтарь
  vec3 horizon = vec3(1.0, 0.86, 0.52);
  vec3 mid = vec3(0.98, 0.74, 0.30);
  vec3 zenith = vec3(0.80, 0.50, 0.16);
  vec3 col = mix(horizon, mid, smoothstep(0.0, 0.25, y));
  col = mix(col, zenith, smoothstep(0.25, 0.95, y));
  // розоватая дымка у самой земли — переход к малиновой пустыне
  col = mix(vec3(0.86, 0.42, 0.36), col, smoothstep(-0.02, 0.06, y));
  // облака: вытянутые полосы, медленно плывут
  if (y > 0.0) {
    vec2 uv = d.xz / (y + 0.12);
    float t = uTime * 0.012;
    float c = fbm(uv * vec2(0.55, 1.6) + vec2(t, t * 0.3));
    float c2 = fbm(uv * vec2(1.2, 3.5) - vec2(t * 1.7, 0.0) + 7.0);
    float cl = smoothstep(0.52, 0.78, c * 0.75 + c2 * 0.35);
    float fade = smoothstep(0.0, 0.18, y) * (1.0 - smoothstep(0.7, 1.0, y) * 0.6);
    vec3 cc = mix(vec3(0.85, 0.42, 0.20), vec3(1.0, 0.93, 0.72), smoothstep(0.4, 0.9, c2));
    col = mix(col, cc, cl * fade * 0.75);
  }
  // солнце: маленький оранжевый диск с мерцающим ореолом
  float sd = dot(d, uSun);
  float pulse = 0.85 + 0.15 * sin(uTime * 0.7);
  col += vec3(1.0, 0.55, 0.18) * pow(max(sd, 0.0), 220.0) * 0.6 * pulse;
  col += vec3(1.0, 0.65, 0.25) * pow(max(sd, 0.0), 18.0) * 0.18;
  float disk = smoothstep(0.99972, 0.99980, sd);
  vec3 sunCol = mix(vec3(1.0, 0.36, 0.06), vec3(1.0, 0.55, 0.12), smoothstep(0.9998, 0.99998, sd));
  // полосы как у «ретро-солнца»
  float band = step(0.5, fract((d.y - uSun.y) * 900.0 + uTime * 0.2));
  sunCol *= mix(1.0, 0.75 + 0.25 * band, smoothstep(uSun.y, uSun.y - 0.012, d.y));
  col = mix(col, sunCol, disk);
  // редкий weirdcore-глитч
  if (uGlitch > 0.0) {
    float row = floor(d.y * 120.0);
    float g = step(0.85, h(vec2(row, floor(uTime * 20.0))));
    col = mix(col, col.gbr * 1.1, g * uGlitch);
  }
  // мягкая плёночная зернистость
  gl_FragColor = vec4(pow(max(col, vec3(0.0)), vec3(2.2)), 1.0);
}`;

const groundVert = `
varying vec3 vPos; varying float vDist;
void main(){ vec4 w = modelMatrix * vec4(position,1.0); vPos = w.xyz; vDist = length(w.xz); gl_Position = projectionMatrix * viewMatrix * w; }`;
const groundFrag = `
uniform vec3 uSun; uniform vec3 uBase; uniform vec3 uLit; uniform vec3 uShadow; uniform vec3 uHaze; uniform float uTime;
varying vec3 vPos; varying float vDist;
float h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
void main(){
  vec3 nrm = normalize(cross(dFdx(vPos), dFdy(vPos)));
  if (nrm.y < 0.0) nrm = -nrm;
  float l = clamp(dot(nrm, uSun), 0.0, 1.0);
  vec3 c = mix(uShadow, uBase, smoothstep(0.0, 0.25, l));
  c = mix(c, uLit, smoothstep(0.25, 0.9, l));
  c *= 0.92 + 0.16 * h(floor(vPos.xz * 2.0));
  // дымка к горизонту + лёгкое марево
  float hz = smoothstep(60.0, 420.0, vDist + sin(vPos.x * 0.05 + uTime) * 4.0);
  c = mix(c, uHaze, hz * 0.7);
  gl_FragColor = vec4(c, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

export function buildExterior(scene) {
  const out = { update: () => { } };
  const skyU = { uTime: { value: 0 }, uSun: { value: SUN_DIR }, uGlitch: { value: 0 } };
  const sky = new THREE.Mesh(new THREE.SphereGeometry(900, 32, 16), new THREE.ShaderMaterial({
    vertexShader: skyVert, fragmentShader: skyFrag, uniforms: skyU, side: THREE.BackSide, depthWrite: false, fog: false,
  }));
  sky.renderOrder = -10; sky.frustumCulled = false; scene.add(sky);

  const gU = {
    uSun: { value: SUN_DIR }, uTime: { value: 0 },
    uBase: { value: new THREE.Color(0x4a0c20) }, uLit: { value: new THREE.Color(0x7a1a34) },
    uShadow: { value: new THREE.Color(0x22040f) }, uHaze: { value: new THREE.Color(0x9a3446) },
  };
  const gMat = new THREE.ShaderMaterial({ vertexShader: groundVert, fragmentShader: groundFrag, uniforms: gU, fog: false });
  // Дюны: плоско у отеля, волны дальше. Под зданием земли нет (она опущена и закрыта
  // ближней площадкой с вырезом под фундамент) — иначе её видно в лестничном проёме подвала.
  const geo = new THREE.PlaneGeometry(1600, 1600, 120, 120); geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i); const r = Math.hypot(x, z);
    const k = THREE.MathUtils.smoothstep(r, 80, 180);
    const hgt = (Math.sin(x * 0.021) * Math.cos(z * 0.017) * 5 + Math.sin(x * 0.007 + z * 0.011) * 9 + Math.sin(z * 0.05 + x * 0.013) * 1.6) * k;
    pos.setY(i, r < 70 ? -9 : hgt - 0.06 - 0.5 * k);
  }
  geo.computeVertexNormals();
  scene.add(new THREE.Mesh(geo, gMat));
  // ближняя ровная земля 180×180 с вырезом под здание
  // ближняя земля: квадрат 180×180 минус фундамент (основной корпус и крыло за вестибюлем)
  const E = 90, holes = [[-26.3, -14.3, 30.3, 14.3], [-26.3, 14.2, 0.3, 32.3]];
  const cut = (r, h) => { const [x0, z0, x1, z1] = r, [a, b, c, d] = h; if (c <= x0 || a >= x1 || d <= z0 || b >= z1) return [r]; const o = []; if (b > z0) o.push([x0, z0, x1, b]); if (d < z1) o.push([x0, d, x1, z1]); const zz0 = Math.max(z0, b), zz1 = Math.min(z1, d); if (a > x0) o.push([x0, zz0, a, zz1]); if (c < x1) o.push([c, zz0, x1, zz1]); return o; };
  let rects = [[-E, -E, E, E]]; for (const h of holes) rects = rects.flatMap(r => cut(r, h));
  for (const [x0, z0, x1, z1] of rects) {
    const pg = new THREE.PlaneGeometry(x1 - x0, z1 - z0, Math.max(1, Math.ceil((x1 - x0) / 10)), Math.max(1, Math.ceil((z1 - z0) / 10))); pg.rotateX(-Math.PI / 2);
    const m = new THREE.Mesh(pg, gMat); m.position.set((x0 + x1) / 2, -0.05, (z0 + z1) / 2); scene.add(m);
  }

  // Столовые горы и скалы
  const mesa = (x, z, r, h, seg = 7) => {
    const g = new THREE.CylinderGeometry(r * 0.7, r, h, seg, 2);
    const p = g.attributes.position; for (let i = 0; i < p.count; i++) { p.setX(i, p.getX(i) * (0.85 + Math.random() * 0.3)); p.setZ(i, p.getZ(i) * (0.85 + Math.random() * 0.3)); }
    const m = new THREE.Mesh(g, gMat); m.position.set(x, h / 2 - 1, z); scene.add(m);
  };
  mesa(-420, -260, 60, 38); mesa(-500, 40, 90, 52, 8); mesa(-360, 320, 40, 26); mesa(380, -420, 70, 44); mesa(520, 200, 55, 30); mesa(80, 560, 80, 40); mesa(-120, -560, 50, 34);
  for (let i = 0; i < 40; i++) {
    const a = Math.random() * Math.PI * 2, r = 40 + Math.random() * 200;
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.6 + Math.random() * 2.5, 0), gMat);
    rock.position.set(Math.cos(a) * r, 0, Math.sin(a) * r); rock.rotation.set(Math.random(), Math.random(), 0); rock.scale.y = 0.5; scene.add(rock);
  }
  // Телеграфные столбы, уходящие к горизонту (на запад, к солнцу)
  const poleMat = new THREE.MeshBasicMaterial({ color: 0x2a0a10, fog: false });
  const wireMat = new THREE.LineBasicMaterial({ color: 0x3a1018, fog: false });
  const tops = [];
  for (let i = 0; i < 22; i++) {
    const x = -38 - i * 26, z = 22 + Math.sin(i * 0.3) * 3;
    const p = new THREE.Mesh(new THREE.BoxGeometry(0.25, 8, 0.25), poleMat); p.position.set(x, 3.9, z); scene.add(p);
    const c = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.15, 2.2), poleMat); c.position.set(x, 7.4, z); scene.add(c);
    tops.push(new THREE.Vector3(x, 7.45, z - 0.9), new THREE.Vector3(x, 7.45, z + 0.9));
  }
  for (const side of [0, 1]) {
    const pts = []; for (let i = 0; i < 21; i++) { const a = tops[i * 2 + side], b = tops[(i + 1) * 2 + side]; for (let k = 0; k <= 8; k++) { const t = k / 8; pts.push(new THREE.Vector3().lerpVectors(a, b, t).add(new THREE.Vector3(0, -Math.sin(t * Math.PI) * 0.8, 0))); } }
    scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), wireMat));
  }
  // Одинокий билборд вдали
  const bc = document.createElement('canvas'); bc.width = 256; bc.height = 96; const g2 = bc.getContext('2d');
  g2.fillStyle = '#2a0a18'; g2.fillRect(0, 0, 256, 96); g2.fillStyle = '#ffcf7a'; g2.font = 'bold 30px Georgia'; g2.textAlign = 'center';
  g2.fillText('ВЫ УЖЕ ЗДЕСЬ', 128, 45); g2.font = '16px Georgia'; g2.fillText('отель · 0 км', 128, 75);
  const bt = new THREE.CanvasTexture(bc); bt.colorSpace = THREE.SRGBColorSpace;
  const bb = new THREE.Mesh(new THREE.PlaneGeometry(14, 5.2), new THREE.MeshBasicMaterial({ map: bt, color: 0xb08070, fog: false }));
  bb.position.set(-120, 9, -70); bb.rotation.y = Math.PI / 2 - 0.4; scene.add(bb);
  for (const o of [-5, 5]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.4, 7, 0.4), poleMat); l.position.set(-120 + Math.sin(0.4) * o, 3.4, -70 + Math.cos(0.4) * o * -1); scene.add(l); }

  // Птицы, кружащие далеко
  const birds = [];
  const bm = new THREE.LineBasicMaterial({ color: 0x4a2010, fog: false });
  for (let i = 0; i < 7; i++) {
    const b = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-1, 0.3, 0), new THREE.Vector3(0, 0, 0), new THREE.Vector3(1, 0.3, 0)]), bm);
    b.userData = { r: 90 + Math.random() * 60, a: Math.random() * 6, h: 35 + Math.random() * 25, s: 0.03 + Math.random() * 0.03, cx: -150, cz: -40 };
    b.scale.setScalar(1.6); scene.add(b); birds.push(b);
  }

  let glitchT = 0, nextGlitch = 40 + Math.random() * 60;
  out.update = (t, dt) => {
    skyU.uTime.value = t; gU.uTime.value = t;
    for (const b of birds) {
      const u = b.userData; u.a += u.s * dt; b.position.set(u.cx + Math.cos(u.a) * u.r, u.h + Math.sin(t * 0.3 + u.r) * 2, u.cz + Math.sin(u.a) * u.r);
      b.rotation.y = -u.a; const f = Math.sin(t * 6 + u.r) * 0.3; b.geometry.attributes.position.setY(0, f); b.geometry.attributes.position.setY(2, f); b.geometry.attributes.position.needsUpdate = true;
    }
    nextGlitch -= dt;
    if (nextGlitch < 0) { glitchT = 0.6; nextGlitch = 50 + Math.random() * 90; out.onGlitch && out.onGlitch(); }
    glitchT = Math.max(0, glitchT - dt); skyU.uGlitch.value = glitchT > 0 ? 0.8 : 0;
  };
  out.sky = sky;
  return out;
}
