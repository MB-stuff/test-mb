import * as THREE from 'three';
import { W, G, FH, boxGeo, optimizeLevels } from './engine.js';
import { buildHotel, ELEV, elevatorDoors, LAYOUT, RED } from './hotel.js';
import { buildExterior as buildSky, SUN_DIR } from './sky.js';
import { buildExterior as buildFacade } from './exterior.js';
import * as S from './audio.js';
import { updateStatic, stucco } from './textures.js';
import { STORIES, T as STORY_TEXTS, LIBRARY_KEYS } from './stories.js';
import { caption } from './engine.js';
import IMAGES from './images.json';

const P = Math.PI;
const $ = id => document.getElementById(id);
const params = new URLSearchParams(location.search);
const TOUCH = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
const SECRETS_TOTAL = 8;
const store = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) { } } };

// ---------- рендер: сцена рисуется в буфер, потом постобработка (пиксели) ----------
const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance', preserveDrawingBuffer: params.has('shot') });
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.NoToneMapping;
renderer.setPixelRatio(1);
$('game').appendChild(renderer.domElement);
// пиксельный режим: сцена рисуется в маленький буфер и растягивается без сглаживания
let pixel = store.get('hotel.pixel') !== '0';
let rt = null;
const postU = { tDiffuse: { value: null }, tDepth: { value: null }, uRes: { value: new THREE.Vector2(1, 1) }, uPixel: { value: 1 }, uExposure: { value: 1.12 },
  uInvProj: { value: new THREE.Matrix4() }, uProjY: { value: 1 }, uAO: { value: +(params.get('ao') ?? 1) } };
function makeRT() {
  if (rt) rt.dispose();
  rt = new THREE.WebGLRenderTarget(16, 16, { type: THREE.HalfFloatType, samples: pixel ? 0 : +(params.get('msaa') ?? 2),
    magFilter: pixel ? THREE.NearestFilter : THREE.LinearFilter, minFilter: pixel ? THREE.NearestFilter : THREE.LinearFilter });
  rt.depthTexture = new THREE.DepthTexture(16, 16); rt.depthTexture.type = THREE.UnsignedIntType;
  postU.tDiffuse.value = rt.texture; postU.tDepth.value = rt.depthTexture;
}
makeRT();
const post = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
  uniforms: postU, depthTest: false, depthWrite: false,
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
  fragmentShader: `
  uniform sampler2D tDiffuse, tDepth; uniform vec2 uRes; uniform float uPixel, uExposure, uProjY, uAO; uniform mat4 uInvProj;
  varying vec2 vUv;
  vec3 tone(vec3 c){ c *= uExposure; vec3 k = vec3(0.8); vec3 o = max(c - k, 0.0); return min(c, k) + (1.0 - k) * (1.0 - exp(-o / (1.0 - k))); }
  vec3 srgb(vec3 c){ c = clamp(c, 0.0, 1.0); return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c)); }
  float bayer(vec2 p){ vec2 q = mod(floor(p), 4.0); int i = int(q.x + q.y * 4.0);
    float m[16]; m[0]=0.;m[1]=8.;m[2]=2.;m[3]=10.;m[4]=12.;m[5]=4.;m[6]=14.;m[7]=6.;m[8]=3.;m[9]=11.;m[10]=1.;m[11]=9.;m[12]=15.;m[13]=7.;m[14]=13.;m[15]=5.;
    for (int k = 0; k < 16; k++) if (k == i) return m[k] / 16.0 - 0.5; return 0.0; }
  vec3 vpos(vec2 uv){ float d = texture2D(tDepth, uv).x; vec4 p = uInvProj * vec4(uv * 2.0 - 1.0, d * 2.0 - 1.0, 1.0); return p.xyz / p.w; }
  // затенение углов и стыков по буферу глубины (SSAO): даёт предметам объём и «прижимает» их к полу
  float ssao(vec2 uv, vec2 px){
    float d0 = texture2D(tDepth, uv).x; if (d0 > 0.99999) return 1.0;
    vec2 t = 1.0 / uRes; vec3 P = vpos(uv);
    vec3 dx1 = vpos(uv + vec2(t.x, 0.0)) - P, dx2 = P - vpos(uv - vec2(t.x, 0.0));
    vec3 dy1 = vpos(uv + vec2(0.0, t.y)) - P, dy2 = P - vpos(uv - vec2(0.0, t.y));
    vec3 N = normalize(cross(abs(dx1.z) < abs(dx2.z) ? dx1 : dx2, abs(dy1.z) < abs(dy2.z) ? dy1 : dy2));
    const float R = 1.0;
    float rpx = R * uProjY * 0.5 * uRes.y / max(-P.z, 0.1); rpx = clamp(rpx, 3.0, uRes.y * 0.25);
    float ang = fract(52.9829189 * fract(dot(px, vec2(0.06711056, 0.00583715)))) * 6.2832;
    float occ = 0.0;
    for (int i = 0; i < 14; i++) {
      float f = (float(i) + 0.5) / 14.0; float a = ang + float(i) * 2.39996;
      vec2 o = vec2(cos(a), sin(a)) * rpx * f * f * t + vec2(cos(a), sin(a)) * t;
      vec3 v = vpos(uv + o) - P; float L = length(v);
      occ += max(0.0, dot(v, N) / (L + 1e-4) - 0.12) * (1.0 - smoothstep(R * 0.6, R * 1.6, L));
    }
    float ao = clamp(1.0 - occ / 14.0 * 3.2, 0.0, 1.0); return ao * ao;
  }
  void main(){
    vec2 px = floor(vUv * uRes), uv = uPixel > 0.5 ? (px + 0.5) / uRes : vUv;
    vec3 lin = texture2D(tDiffuse, uv).rgb;
    if (uAO > 2.5) { gl_FragColor = vec4(vec3(fract(-vpos(uv).z)), 1.0); return; }
    if (uAO > 1.5) { gl_FragColor = vec4(vec3(ssao(uv, px)), 1.0); return; }
    if (uAO > 0.0) lin *= mix(1.0, ssao(uv, px), uAO * 0.85);
    vec3 col = srgb(tone(lin));
    if (uPixel > 0.5) col = floor(col * 31.0 + 0.5 + bayer(px) * 0.9) / 31.0;
    vec2 q = vUv - 0.5; col *= 1.0 - dot(q, q) * 0.6;
    gl_FragColor = vec4(col, 1.0);
  }`,
}));
const postScene = new THREE.Scene(); postScene.add(post);
const postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  renderer.setSize(window.innerWidth, window.innerHeight);
  const scale = pixel ? Math.min(1, 360 / window.innerHeight) : dpr;
  const w = Math.round(window.innerWidth * scale), h = Math.round(window.innerHeight * scale);
  rt.setSize(w, h); postU.uRes.value.set(w, h); postU.uPixel.value = pixel ? 1 : 0;
  camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix();
}
function setPixel(v) { pixel = v; store.set('hotel.pixel', v ? '1' : '0'); makeRT(); resize(); }
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a0e08);
scene.fog = new THREE.Fog(0x1e120a, 8, 46);
const camera = new THREE.PerspectiveCamera(72, 1, 0.08, 2000);
scene.add(camera);
W.scene = scene;
window.addEventListener('resize', resize);

const hemi = new THREE.HemisphereLight(0xc08a5a, 0x2a1008, 1.0); scene.add(hemi);
const amb = new THREE.AmbientLight(0x5a3a28, 0.32); scene.add(amb);
const sun = new THREE.DirectionalLight(0xffc080, 0); sun.position.copy(SUN_DIR).multiplyScalar(100); scene.add(sun); scene.add(sun.target);
// Солнечный свет в помещениях — настоящий: направленный свет с картой теней. Стены, рамы, шторы и мебель
// отбрасывают тень, поэтому пятна света на полу и стенах честно обрываются о предметы.
// Свет падает чуть круче видимого солнца (22° вместо 9°), иначе на полу почти не видно пятен.
const LIGHT_DIR = new THREE.Vector3(SUN_DIR.x, 0, SUN_DIR.z).normalize().multiplyScalar(Math.cos(0.384)).setY(Math.sin(0.384));
let SUN_IN = +(params.get('sun') || 13);
let shadowsOn = store.get('hotel.shadows') !== null ? store.get('hotel.shadows') === '1' : !TOUCH;
if (params.has('shadows')) shadowsOn = params.get('shadows') !== '0';
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap; renderer.shadowMap.autoUpdate = false;
sun.shadow.mapSize.set(4096, 2048); sun.shadow.bias = -0.0003; sun.shadow.normalBias = 0.008;
const POOL = [];
// Свет ламп не проходит сквозь стены: каждая лампа освещает только коробку своей комнаты (зоны).
// Границы зон проходят по осям стен, поэтому внутренняя грань стены освещается, а соседняя комната — нет.
const LB_N = 10, LBU = { min: { value: [] }, max: { value: [] } };
for (let i = 0; i < LB_N; i++) { LBU.min.value.push(new THREE.Vector3(-1e5, -1e5, -1e5)); LBU.max.value.push(new THREE.Vector3(1e5, 1e5, 1e5)); }
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
const zoneBoxCache = new Map();
function lightZoneName(a) {
  if (a._zn !== undefined) return a._zn;
  let best = null;
  for (const z of W.zones) if (z.level === a.level && a.pos.x >= z.minX && a.pos.x <= z.maxX && a.pos.z >= z.minZ && a.pos.z <= z.maxZ) { const ar = (z.maxX - z.minX) * (z.maxZ - z.minZ); if (!best || ar < best[0]) best = [ar, z]; }
  return (a._zn = best ? best[1].name : null);
}
function lightBox(a) {
  if (zoneBoxCache.has(a)) return zoneBoxCache.get(a);
  let best = null;
  for (const z of W.zones) if (z.level === a.level && a.pos.x >= z.minX && a.pos.x <= z.maxX && a.pos.z >= z.minZ && a.pos.z <= z.maxZ) { const ar = (z.maxX - z.minX) * (z.maxZ - z.minZ); if (!best || ar < best[0]) best = [ar, z]; }
  let box = null;
  if (best && best[1].yBox) box = [new THREE.Vector3(best[1].minX - 0.02, best[1].yBox[0], best[1].minZ - 0.02), new THREE.Vector3(best[1].maxX + 0.02, best[1].yBox[1], best[1].maxZ + 0.02)];
  else if (best && a.level < 4) {
    const z = best[1], { TZ0, TZ1, LH, PH } = LAYOUT, y0 = z.level * FH;
    const H = z.level !== 0 ? FH : z.maxX <= 0.01 ? LH : (z.minZ >= TZ1 - 0.01 || z.maxZ <= TZ0 + 0.01) ? PH : FH;
    const stair = /ЛЕСТНИЦА/.test(z.name); // лестничный пролёт — одна шахта на все этажи
    box = [new THREE.Vector3(z.minX - 0.02, y0 - (stair ? 2.6 : 0.05), z.minZ - 0.02), new THREE.Vector3(z.maxX + 0.02, y0 + H + (stair ? 2.6 : -0.02), z.maxZ + 0.02)];
  }
  zoneBoxCache.set(a, box); return box;
}
for (let i = 0; i < 10; i++) { const l = new THREE.PointLight(0xffaa66, 0, 8, 1.6); l.userData = { a: null, fade: 0 }; scene.add(l); POOL.push(l); }
const flash = new THREE.SpotLight(0xfff0d0, 0, 18, 0.45, 0.5, 1.4); camera.add(flash); flash.position.set(0.15, -0.1, 0); flash.target.position.set(0, 0, -1); camera.add(flash.target);

// ---------- картинки ----------
W.images = IMAGES;
for (const im of IMAGES) W.imageUrls[im.id] = (window.__IMG && window.__IMG[im.id]) || `../assets/img/${im.id}.jpg`;

// ---------- мир ----------
const sky = buildSky(scene);
buildHotel();
buildFacade();
const [mb, ma] = optimizeLevels(); console.log('merged', mb, '->', ma);
const proxies = {};
buildProxies();
// мелкие предметы дальше ~25 м не рисуются (туман их всё равно почти скрывает)
const cullables = [];
for (const [lk, lv] of Object.entries(W.levels)) for (const o of lv.children) if (o.isGroup || (o.isMesh && o.userData.noMerge)) {
  const bb = new THREE.Box3().setFromObject(o); if (bb.isEmpty()) continue;
  o.userData.cullC = bb.getCenter(new THREE.Vector3()); o.userData.cullR = bb.getSize(new THREE.Vector3()).length() / 2; o.userData.cullL = +lk; cullables.push(o);
}
// Предметы соседних этажей видны только сквозь лестничный проём, шахту лифта и атриум вестибюля.
// В остальных местах их закрывают перекрытия, и рисовать их незачем.
// откуда видны другие этажи: лестница, лифт, вестибюль-атриум и холл 2-го этажа с окнами в атриум
const SEE_THROUGH = /ЛЕСТНИЦА|ЛИФТ|ВЕСТИБЮЛЬ|КРЫША/;
// --- тени: кто отбрасывает и кто принимает ---
for (const root of [...Object.values(W.levels), W.exterior].filter(Boolean)) root.traverse(o => {
  if (!o.isMesh) return;
  const mats = Array.isArray(o.material) ? o.material : [o.material];
  const opaque = mats.every(m => m && !m.transparent && m.blending === THREE.NormalBlending && !m.isShaderMaterial);
  o.castShadow = opaque && !o.userData.hit;
  o.receiveShadow = mats.every(m => m && (m.isMeshLambertMaterial || m.isMeshStandardMaterial || m.isMeshPhongMaterial));
});
// камера тени охватывает весь отель целиком: тени не «съезжают» при ходьбе, а карту можно обновлять редко
{
  const C = new THREE.Vector3(2, 8, 9);
  sun.position.copy(C).addScaledVector(LIGHT_DIR, 150); sun.target.position.copy(C); sun.updateMatrixWorld(); sun.target.updateMatrixWorld();
  const cam = new THREE.PerspectiveCamera(); cam.position.copy(sun.position); cam.lookAt(C); cam.updateMatrixWorld();
  const bb = new THREE.Box3(); const v = new THREE.Vector3();
  for (const x of [-28, 32]) for (const y of [-5, 22]) for (const z of [-16, 34]) bb.expandByPoint(v.set(x, y, z).applyMatrix4(cam.matrixWorldInverse));
  const sc = sun.shadow.camera; sc.left = bb.min.x; sc.right = bb.max.x; sc.bottom = bb.min.y; sc.top = bb.max.y; sc.near = -bb.max.z - 2; sc.far = -bb.min.z + 2; sc.updateProjectionMatrix();
}
W.shadowDirty = true; let shadowT = 0;
function setShadows(v) {
  shadowsOn = v; store.set('hotel.shadows', v ? '1' : '0'); sun.castShadow = v; W.realSun = v; W.shadowDirty = true;
  // плоские «пятна света» под окнами нужны только без настоящих теней
  // флаг off не даёт отсечению по расстоянию снова «включить» пятно
  for (const p of W.windowPatches || []) { const off = v || !!p.curtained; p.mesh.userData.off = off; p.mesh.visible = !off; }
  const cb = document.getElementById('shadows'); if (cb) cb.checked = v;
}
setShadows(shadowsOn);
// Номер с закрытой дверью не виден снаружи: его вещи не рисуются, пока ты не войдёшь или дверь не откроется.
const zoneAt = (lv, x, z) => { let b = null, ba = Infinity; for (const zn of W.zones) if (zn.level === lv && x >= zn.minX && x <= zn.maxX && z >= zn.minZ && z <= zn.maxZ) { const a = (zn.maxX - zn.minX) * (zn.maxZ - zn.minZ); if (a < ba) { ba = a; b = zn; } } return b; };
// двери и всё, что висит на стене коридора (центр почти на границе зон), к номеру не относим
for (const o of cullables) {
  if (o.userData.isDoor) continue;
  const zn = zoneAt(o.userData.cullL, o.userData.cullC.x, o.userData.cullC.z);
  if (zn && /^НОМЕР \d/.test(zn.name) && o.userData.cullC.z > zn.minZ + 0.3 && o.userData.cullC.z < zn.maxZ - 0.3 && o.userData.cullC.x > zn.minX + 0.3 && o.userData.cullC.x < zn.maxX - 0.3) o.userData.cullZ = zn;
}
for (const d of W.doors || []) for (const sd of [-1, 1]) {
  const zn = zoneAt(d.level, d.axis === 'x' ? d.at : d.c + sd * 0.8, d.axis === 'x' ? d.c + sd * 0.8 : d.at);
  if (zn && /^НОМЕР \d/.test(zn.name)) (zn.doors = zn.doors || []).push(d);
}
const roomClosed = zn => zn.doors && zn.doors.length && zn.doors.every(d => !d.open && Math.abs(d.angle) < 0.01);
let cullT = 0;
// Дальность прорисовки предметов (настройка «прорисовка»):
//   0 — ближняя: только рядом, соседние этажи — лишь с лестницы и из атриума; быстрее всего
//   1 — дальняя: весь этаж целиком, соседние этажи видны отовсюду, откуда их видно (окна в атриум)
//   2 — вся: ничего не прячется, даже вещи в закрытых номерах
const DRAW = [
  { same: 25, other: 12, otherAlways: false, closed: true },
  { same: 45, other: 40, otherAlways: false, closed: true },
  { same: Infinity, other: Infinity, otherAlways: true, closed: false },
];
let drawLevel = +(store.get('hotel.draw') ?? (TOUCH ? 0 : 1)); if (!(drawLevel >= 0 && drawLevel <= 2)) drawLevel = TOUCH ? 0 : 1;
if (params.has('draw')) drawLevel = +params.get('draw');
function setDraw(v) { drawLevel = v; store.set('hotel.draw', String(v)); cullT = 0; W.shadowDirty = true; const el = document.getElementById('draw'); if (el) el.value = String(v); }
function updateCull(dt) {
  cullT -= dt; if (cullT > 0) return; cullT = 0.1;
  const all = state.title || params.has('qa');
  const D = DRAW[drawLevel] || DRAW[1];
  const L = player.level, open = D.otherAlways || (state.zone && SEE_THROUGH.test(state.zone.name));
  for (const o of cullables) {
    const d = camera.position.distanceTo(o.userData.cullC) - o.userData.cullR;
    const hidden = D.closed && o.userData.cullZ && o.userData.cullZ !== state.zone && roomClosed(o.userData.cullZ);
    // userData.off — предмет выключен игрой (погасшее бра, ещё не открытый лаз): отсечение не должно его «включать»
    o.visible = !o.userData.gone && !o.userData.off && (all || (!hidden && (o.userData.cullL === L ? d < D.same : open && d < D.other)));
  }
}
sky.onGlitch = () => { if (state.started) { S.sfxGlitch(); glitch(0.5); } };

function buildProxies() {
  const c = document.createElement('canvas'); c.width = 192; c.height = 128; const g = c.getContext('2d');
  g.drawImage(stucco('#a8725a', 15).image, 0, 0, 192, 128);
  g.fillStyle = '#e8b870'; g.fillRect(60, 30, 72, 64); g.fillStyle = '#2a1a14'; g.fillRect(60, 30, 72, 4); g.fillRect(94, 30, 4, 64); g.fillRect(56, 94, 80, 5);
  g.fillStyle = '#c09a6a'; g.fillRect(0, 118, 192, 10);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  const mat = new THREE.MeshLambertMaterial({ map: tex });
  const { TX0, TX1, TZ0, TZ1, LX0, LZ0, LZ1, LH, PH } = LAYOUT;
  const mk = (L, x0, z0, x1, z1, y0, y1) => {
    const m = new THREE.Mesh(boxGeo(x1 - x0, y1 - y0, z1 - z0, 1), mat);
    const uv = m.geometry.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / 6, uv.getY(i) / 4);
    m.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); scene.add(m); (proxies[L] = proxies[L] || []).push(m);
  };
  for (let L = 1; L <= 3; L++) mk(L, TX0 - 0.11, TZ0 - 0.11, TX1 + 0.11, TZ1 + 0.11, L * FH, L * FH + FH - 0.02);
  mk(0, LX0 - 0.11, LZ0 - 0.11, TX1 + 0.11, LZ1 + 0.11, 0, PH - 0.02);
  mk(0, LX0 - 0.11, LZ0 - 0.11, TX0, LZ1 + 0.11, PH - 0.02, LH);
  mk(0, TX0, TZ0 - 0.11, TX1 + 0.11, TZ1 + 0.11, PH - 0.02, FH);
  mk(0, LX0 - 0.11, LZ1, TX0 + 0.11, LAYOUT.WZ1 + 0.11, 0, LH);
}

// ---------- состояние игрока ----------
const player = {
  pos: new THREE.Vector3(-23, 0, 0.5), vy: 0, yaw: -P / 2, pitch: 0, radius: 0.28, eye: 1.62,
  sitting: null, standPos: null, bob: 0, lastStepPhase: 0, level: 0, ground: 'marble', vel: new THREE.Vector3(),
};
if (params.has('x')) player.pos.set(+params.get('x'), +(params.get('y') || 0), +params.get('z'));
if (params.has('yaw')) player.yaw = +params.get('yaw');
if (params.has('pitch')) player.pitch = +params.get('pitch');

const state = { started: false, paused: true, modal: null, secrets: new Set(), items: new Map(), zone: null, busy: false, sens: +(store.get('hotel.sens') || 1), journal: {}, title: true };
G.flags = W.flags;

// ---------- ввод ----------
const keys = {};
addEventListener('keydown', e => {
  if (e.repeat) return;
  keys[e.code] = true;
  if (state.modal) {
    if (['Escape', 'KeyE', 'Enter'].includes(e.code) && state.modal !== 'ending') closeModal();
    if (e.code === 'KeyJ' && state.modal === 'journal') closeModal();
    return;
  }
  if (!state.started) return;
  if (e.code === 'Escape' && lockFailed) { state.paused = true; showPause(); return; }
  if (away && e.code !== 'Escape') relockQuiet();
  if (e.code === 'KeyE') doInteract();
  if (e.code === 'Space' && player.sitting) standUp();
  if (e.code === 'KeyF') toggleFlash();
  if (e.code === 'KeyJ') openJournal();
  if (e.code === 'KeyM') { const v = S.audio.musicVolume > 0 ? 0 : 0.55; S.setMusicVolume(v); $('vol').value = v; store.set('hotel.vol', v); toast(v ? 'Музыка включена' : 'Музыка выключена'); }
  if (e.code === 'KeyH') { setUI(!showUI); toast(showUI ? 'Интерфейс: включён' : 'Интерфейс: скрыт'); }
  if (e.code === 'KeyP') { setPixel(!pixel); $('pixel').checked = pixel; toast(pixel ? 'Пиксели: включены' : 'Пиксели: выключены'); }
});
addEventListener('keyup', e => { keys[e.code] = false; });
function toggleFlash() { flash.intensity = flash.intensity > 0 ? 0 : 14; S.sfxClick(); }

const canvas = renderer.domElement;
let downAt = null, lockFailed = false;
canvas.addEventListener('mouseup', e => { if (lockFailed && downAt && Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) < 6 && !state.modal) doInteract(); downAt = null; });
canvas.addEventListener('mousedown', e => {
  if (!state.started || state.modal) return;
  if (document.pointerLockElement !== canvas && !TOUCH && !lockFailed) { lockPointer(); return; }
  if (e.button === 0) { downAt = [e.clientX, e.clientY]; if (!lockFailed) doInteract(); }
});
function lockPointer() {
  if (lockFailed) { state.paused = false; $('start').classList.add('hidden'); return; }
  lockedAt = performance.now();
  try { const r = canvas.requestPointerLock(); if (r && r.catch) r.catch(onLockFail); } catch (e) { onLockFail(); }
  setTimeout(() => { if (document.pointerLockElement !== canvas && !state.modal && state.started && !$('start').classList.contains('hidden')) onLockFail(); }, 700);
}
function onLockFail() {
  if (quietLock) { quietLock = false; return; }
  if (lockFailed) return; lockFailed = true;
  state.paused = false; $('start').classList.add('hidden');
  toast('Курсор не захватывается: зажми кнопку мыши и веди, чтобы осматриваться.', 6000);
}
document.addEventListener('pointerlockerror', onLockFail);
let lockedAt = 0, wasLocked = false;
addEventListener('mousemove', e => {
  // сразу после захвата браузер присылает скачок на всё расстояние до центра окна — его пропускаем
  const locked = document.pointerLockElement === canvas, fresh = locked && !wasLocked; wasLocked = locked;
  if (locked) { if (!fresh && performance.now() - lockedAt > 150 && Math.abs(e.movementX) < 400 && Math.abs(e.movementY) < 400) look(e.movementX, e.movementY); }
  else if (lockFailed && e.buttons && !state.modal) look(e.movementX, e.movementY);
  // вернулся из другой вкладки: камера сразу слушается мыши, захват восстановится от первой клавиши или клика
  else if (away && !state.modal && !state.paused && Math.abs(e.movementX) < 300) look(e.movementX, e.movementY);
});
function look(dx, dy) {
  const k = 0.0022 * state.sens;
  player.yaw -= dx * k; player.pitch -= dy * k;
  player.pitch = Math.max(-1.45, Math.min(1.45, player.pitch));
  if (player.sitting) {
    const base = player.sitting.yaw; let d = player.yaw - base;
    d = Math.atan2(Math.sin(d), Math.cos(d)); const lim = player.sitting.lie ? 1.2 : 1.6;
    player.yaw = base + Math.max(-lim, Math.min(lim, d));
  }
}
// Потеря захвата мыши. Esc — это осознанная пауза: показываем меню.
// Переключение вкладки, Alt+Tab, всплывшее окно — не пауза: игра просто ждёт и продолжается сама,
// как только окно снова в фокусе (камера сразу слушается мыши, захват вернётся от первой клавиши или клика).
let away = false, awayT = 0, quietLock = false;
const isAway = () => document.hidden || !document.hasFocus();
function relockQuiet() {
  if (document.pointerLockElement === canvas || lockFailed || TOUCH) return;
  quietLock = true; lockedAt = performance.now();
  try { const r = canvas.requestPointerLock(); if (r && r.catch) r.catch(() => { }); } catch (e) { }
  setTimeout(() => { quietLock = false; }, 600);
}
function goAway() {
  for (const k in keys) keys[k] = false; // иначе клавиша, зажатая при уходе, «залипает»
  if (!state.started || TOUCH || lockFailed) return;
  if (!$('start').classList.contains('hidden')) return; // меню паузы уже открыто — пусть остаётся
  away = true; state.paused = true;
}
function comeBack() {
  if (!away || !state.started || TOUCH || isAway()) return;
  if (!$('start').classList.contains('hidden')) { away = false; return; }
  state.paused = !!state.modal; document.body.classList.add('freelook');
}
document.addEventListener('pointerlockchange', () => {
  if (document.pointerLockElement === canvas) {
    away = false; state.paused = false; $('start').classList.add('hidden'); document.body.classList.remove('freelook');
    lockedAt = performance.now(); return;
  }
  if (!state.started || state.modal || TOUCH) return;
  // порядок событий у браузеров разный: решаем чуть позже, когда фокус уже известен
  clearTimeout(awayT);
  awayT = setTimeout(() => {
    if (document.pointerLockElement === canvas || state.modal) return;
    if (away || isAway()) { goAway(); comeBack(); return; }
    state.paused = true; showPause();
  }, 150);
});
addEventListener('blur', goAway);
document.addEventListener('visibilitychange', () => { if (document.hidden) goAway(); else setTimeout(comeBack, 50); });
addEventListener('focus', () => setTimeout(comeBack, 50));

// ---------- тач ----------
const touch = { move: null, look: null, mx: 0, my: 0 };
if (TOUCH) {
  document.body.classList.add('touch');
  canvas.addEventListener('touchstart', e => {
    for (const t of e.changedTouches) {
      if (t.clientX < innerWidth * 0.45 && !touch.move) { touch.move = { id: t.identifier, x: t.clientX, y: t.clientY }; showStick(t.clientX, t.clientY); }
      else if (!touch.look) touch.look = { id: t.identifier, x: t.clientX, y: t.clientY, sx: t.clientX, sy: t.clientY, t: performance.now() };
    }
    e.preventDefault();
  }, { passive: false });
  canvas.addEventListener('touchmove', e => {
    for (const t of e.changedTouches) {
      if (touch.move && t.identifier === touch.move.id) { touch.mx = Math.max(-1, Math.min(1, (t.clientX - touch.move.x) / 50)); touch.my = Math.max(-1, Math.min(1, (t.clientY - touch.move.y) / 50)); moveStick(touch.mx, touch.my); }
      if (touch.look && t.identifier === touch.look.id) { look((t.clientX - touch.look.x) * 2.2, (t.clientY - touch.look.y) * 2.2); touch.look.x = t.clientX; touch.look.y = t.clientY; }
    }
    e.preventDefault();
  }, { passive: false });
  const end = e => {
    for (const t of e.changedTouches) {
      if (touch.move && t.identifier === touch.move.id) { touch.move = null; touch.mx = touch.my = 0; hideStick(); }
      if (touch.look && t.identifier === touch.look.id) {
        const tap = performance.now() - touch.look.t < 250 && Math.hypot(t.clientX - touch.look.sx, t.clientY - touch.look.sy) < 12;
        touch.look = null; if (tap && state.started && !state.modal) doInteract();
      }
    }
  };
  canvas.addEventListener('touchend', end); canvas.addEventListener('touchcancel', end);
  $('btnUse').addEventListener('touchstart', e => { e.preventDefault(); if (player.sitting) standUp(); else doInteract(); });
  $('btnRun').addEventListener('touchstart', e => { e.preventDefault(); keys.ShiftLeft = !keys.ShiftLeft; $('btnRun').classList.toggle('on', keys.ShiftLeft); });
  $('btnLight').addEventListener('touchstart', e => { e.preventDefault(); toggleFlash(); });
  $('btnMenu').addEventListener('touchstart', e => { e.preventDefault(); state.paused = true; showPause(); });
  $('btnJournal').addEventListener('touchstart', e => { e.preventDefault(); openJournal(); });
}
function showStick(x, y) { const s = $('stick'); s.style.display = 'block'; s.style.left = x - 50 + 'px'; s.style.top = y - 50 + 'px'; }
function moveStick(x, y) { $('knob').style.transform = `translate(${x * 30}px, ${y * 30}px)`; }
function hideStick() { $('stick').style.display = 'none'; $('knob').style.transform = ''; }

// ---------- старт / пауза ----------
function showPause() { away = false; document.body.classList.remove('freelook'); $('start').classList.remove('hidden'); $('startBtn').textContent = 'Продолжить'; $('startTitle').textContent = 'Пауза'; }
$('startBtn').addEventListener('click', start);
// громкости запоминаются между запусками
{ const mv = store.get('hotel.vol'), sv = store.get('hotel.sfx'); if (mv !== null && mv !== undefined && mv !== '') $('vol').value = mv; if (sv !== null && sv !== undefined && sv !== '') $('sfx').value = sv; }
S.setSfxVolume(+$('sfx').value);
$('vol').addEventListener('input', e => { S.setMusicVolume(+e.target.value); store.set('hotel.vol', e.target.value); });
$('sfx').addEventListener('input', e => { S.setSfxVolume(+e.target.value); store.set('hotel.sfx', e.target.value); S.sfxClick(); });
$('sens').value = state.sens; $('sens').addEventListener('input', e => { state.sens = +e.target.value; store.set('hotel.sens', state.sens); });
$('pixel').checked = pixel; $('pixel').addEventListener('change', e => setPixel(e.target.checked));
$('shadows').checked = shadowsOn; $('shadows').addEventListener('change', e => setShadows(e.target.checked));
$('draw').value = String(drawLevel); $('draw').addEventListener('change', e => setDraw(+e.target.value));
// интерфейс: счётчики, название комнаты, прицел. Подсказки действий, сообщения и субтитры остаются всегда.
let showUI = store.get('hotel.ui') !== '0';
function setUI(v) { showUI = v; store.set('hotel.ui', v ? '1' : '0'); document.body.classList.toggle('noui', !v); $('ui').checked = v; }
setUI(showUI); $('ui').addEventListener('change', e => setUI(e.target.checked));
$('journalBtn').addEventListener('click', () => openJournal());
function start() {
  S.initAudio(); S.setMusicVolume(+$('vol').value); S.setSfxVolume(+$('sfx').value);
  if (!state.started) {
    state.started = true; state.title = false;
    fadeTo(1, 10); setTimeout(() => fadeTo(0, 900), 60);
    setTimeout(() => toast('Grand Simulacre. Добро пожаловать. Снова.'), 900);
    $('help').classList.add('show'); setTimeout(() => $('help').classList.remove('show'), 12000);
    document.body.classList.add('playing');
  }
  if (TOUCH) { state.paused = false; $('start').classList.add('hidden'); try { document.documentElement.requestFullscreen && document.documentElement.requestFullscreen().catch(() => { }); } catch (e) { } }
  else lockPointer();
}

// ---------- сообщения и окна ----------
function toast(msg, ms = 3800) {
  if (!msg) return;
  const d = document.createElement('div'); d.className = 'toast'; d.textContent = msg; $('toasts').appendChild(d);
  setTimeout(() => d.classList.add('out'), ms); setTimeout(() => d.remove(), ms + 600);
}
let subT = null;
function subtitle(msg) { const s = $('subtitle'); s.textContent = msg; s.classList.add('show'); clearTimeout(subT); subT = setTimeout(() => s.classList.remove('show'), 5500); }
function openModal(kind, html) {
  state.modal = kind; $('modalBody').innerHTML = html; $('modal').className = 'show ' + kind; hint('');
  if (document.pointerLockElement) document.exitPointerLock();
}
function closeModal() {
  state.modal = null; $('modal').className = '';
  if (!TOUCH && state.started) lockPointer();
}
$('modal').addEventListener('click', e => {
  if (e.target.closest('[data-keep]')) return;
  if (state.modal !== 'ending' || e.target.id === 'stay') closeModal();
});
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const nl = s => esc(s).replace(/\n/g, '<br>');

// журнал: что найдено по каждой сюжетной линии
const STORY_TOTAL = {};
for (const [, , st] of Object.values(STORY_TEXTS)) if (st) STORY_TOTAL[st] = (STORY_TOTAL[st] || 0) + 1;
function remember(story, title, text) {
  if (!story) return;
  const j = state.journal[story] = state.journal[story] || {};
  if (!j[title]) {
    j[title] = text; S.sfxPaper();
    const n = Object.keys(j).length;
    setTimeout(() => toast(`Журнал: «${STORIES[story].title}» ${n}/${STORY_TOTAL[story]}`), 400);
    if (n === STORY_TOTAL[story]) setTimeout(() => toast(`История «${STORIES[story].title}» собрана целиком.`, 5000), 1600);
  }
  renderInv();
}
function openJournal(openStory = null) {
  const items = Object.entries(STORIES).map(([id, s]) => {
    const j = state.journal[id] || {}; const n = Object.keys(j).length;
    const entries = Object.keys(j).map((t, i) => `<li><button data-keep data-s="${id}" data-i="${i}">${esc(t)}</button></li>`).join('');
    return `<section><h4>${esc(s.title)} <span>${n}/${STORY_TOTAL[id]}</span></h4>${n ? `<ul>${entries}</ul>` : `<p class="dim">Пока ничего. Где искать: ${esc(s.hint)}.</p>`}</section>`;
  }).join('');
  openModal('journal', `<div class="journal" data-keep><h3>Журнал постояльца</h3><div class="jgrid">${items}</div><div class="jread" id="jread"></div><small>J / Esc — закрыть</small></div>`);
  $('modalBody').querySelectorAll('button[data-s]').forEach(b => b.addEventListener('click', () => {
    const j = state.journal[b.dataset.s]; const t = Object.keys(j)[+b.dataset.i];
    $('jread').innerHTML = `<div class="paper"><h3>${esc(t)}</h3><p>${nl(j[t])}</p></div>`;
  }));
}

G.toast = toast; G.subtitle = subtitle;
G.note = (title, text, story) => {
  const st = story && typeof story === 'object' ? story.story : story;
  openModal('note', `<div class="paper"><h3>${esc(title)}</h3><p>${nl(text)}</p><small>E / клик — закрыть</small></div>`);
  remember(st, title, text);
};
G.noteKey = key => { const t = STORY_TEXTS[key]; if (t) G.note(t[0], t[1], t[2]); };
// с полки берётся случайный ещё не прочитанный отрывок
G.library = () => {
  const read = state.journal.library || {};
  const fresh = LIBRARY_KEYS.filter(k => !read[STORY_TEXTS[k][0]]);
  const k = (fresh.length ? fresh : LIBRARY_KEYS)[Math.floor(Math.random() * (fresh.length || LIBRARY_KEYS.length))];
  G.noteKey(k);
};
G.computer = (name, files) => {
  const list = files.map((f, i) => `<button data-keep data-f="${i}">📄 ${esc(f.name)}</button>`).join('');
  openModal('pc', `<div class="pc" data-keep><div class="pcbar">SIMULACRE-OS 98 — ${esc(name)}<span>✕</span></div><div class="pcbody"><div class="pcfiles">${list}</div><pre class="pctext" id="pctext">Выбери файл.\n\n> _</pre></div><small>Esc — выключить</small></div>`);
  $('modalBody').querySelectorAll('button[data-f]').forEach(b => b.addEventListener('click', () => {
    const f = files[+b.dataset.f]; S.sfxTypewriter(4);
    $('pctext').textContent = f.text;
    $('modalBody').querySelectorAll('button[data-f]').forEach(x => x.classList.toggle('on', x === b));
    remember(f.story, f.title || f.name, f.text);
  }));
  $('modalBody').querySelector('.pcbar span').addEventListener('click', closeModal);
};
G.showPicture = im => {
  if (!im) return;
  const cap = caption(im);
  let title = cap ? cap.title : im.title.replace(/_/g, ' ').trim();
  const text = cap ? `<i>${esc(cap.text)}</i><br>` : '';
  const credit = im.author ? `«${esc(im.title)}» — ${esc(im.author)} · ${esc(im.license)}${im.url ? ` · <a data-keep href="${esc(im.url)}" target="_blank" rel="noopener">источник</a>` : ''}` : 'из коллекции отеля';
  openModal('picture', `<figure><img src="${W.imageUrls[im.id]}" alt=""><figcaption><b>${esc(title)}</b><br>${text}<span class="dim">${credit}</span></figcaption></figure><small>E / клик — закрыть</small>`);
};
G.addItem = (id, name) => { state.items.set(id, name); renderInv(); toast('Получено: ' + name); };
G.hasItem = id => state.items.has(id);
G.secret = (id, name) => {
  if (state.secrets.has(id)) return;
  state.secrets.add(id); S.sfxSecret(); renderInv(); glitch(0.35);
  toast(`✦ Секрет найден: ${name} (${state.secrets.size}/${SECRETS_TOTAL})`, 5000);
  if (state.secrets.size >= 4 && !W.flags.phoneRang) {
    W.flags.phoneRang = true;
    setTimeout(() => { W.flags.phoneRinging = true; ringSnd.active = true; subtitle('Где-то внизу, на стойке регистрации, звонит телефон.'); }, 15000);
  }
};
G.answerPhone = () => {
  W.flags.phoneRinging = false; ringSnd.active = false;
  return `«Вы нашли ${state.secrets.size} из ${SECRETS_TOTAL}. Управляющий ждёт вас там, где солнце видно целиком. Возьмите карту в подвале. Лифт поймёт».`;
};
function renderInv() {
  $('secrets').textContent = `✦ ${state.secrets.size}/${SECRETS_TOTAL}`;
  const notes = Object.values(state.journal).reduce((a, j) => a + Object.keys(j).length, 0);
  const total = Object.values(STORY_TOTAL).reduce((a, b) => a + b, 0);
  $('inv').innerHTML = [...state.items.values()].map(n => `<div>▪ ${esc(n)}</div>`).join('') + `<div class="jl">журнал ${notes}/${total} · J</div>`;
}
renderInv();

G.sit = ({ x, y, z, yaw, lie }) => {
  if (player.sitting) return;
  S.sfxSit();
  player.standPos = player.pos.clone();
  player.sitting = { x, y, z, yaw, lie, t: performance.now() };
  player.yaw = yaw; player.pitch = lie ? 1.1 : -0.05;
  hint(TOUCH ? 'Кнопка «E» — встать' : 'Пробел / движение — встать', true);
};
// За шторой: телепорт туда и обратно. Возвращение — «как будто ничего не было»: та же точка, тот же взгляд.
let redReturn = null;
G.redRoom = (on) => {
  if (player.sitting) standUp();
  if (on) {
    redReturn = { pos: player.pos.clone(), yaw: player.yaw, pitch: player.pitch };
    glitch(0.8); S.sfxGlitch && S.sfxGlitch();
    player.pos.copy(RED.spawn); player.yaw = RED.yaw; player.pitch = 0; player.vy = 0;
    S.setDream(true);
  } else if (redReturn) {
    player.pos.copy(redReturn.pos); player.yaw = redReturn.yaw; player.pitch = redReturn.pitch; player.vy = 0;
    redReturn = null; S.setDream(false);
  }
};
function standUp() {
  if (!player.sitting) return;
  player.sitting = null; S.sfxSit(); player.pitch = 0;
  if (player.standPos) player.pos.copy(player.standPos);
}
G.teleport = (x, y, z, yaw, msg) => {
  if (state.busy) return; state.busy = true; glitch(0.6);
  fadeTo(1, 350, () => {
    player.pos.set(x, y, z); player.yaw = yaw; player.pitch = 0; player.vy = 0;
    if (msg) toast(msg);
    setTimeout(() => fadeTo(0, 500, () => { state.busy = false; }), 250);
  });
};
function fadeTo(v, ms, cb) { const f = $('fade'); f.style.transition = `opacity ${ms}ms`; f.style.opacity = v; setTimeout(() => cb && cb(), ms + 30); }
let glitchT = 0;
// телефон на стойке регистрации слышно по всему отелю, но тише с каждым этажом
const ringSnd = { id: 'lobbyPhone', kind: 'ring', pos: new THREE.Vector3(-6.0, 1.2, -8.3), level: 0, anyLevel: true, range: 45, gain: 0.07, active: false };
(W.sounds = W.sounds || []).push(ringSnd);
function glitch(s) { glitchT = Math.max(glitchT, s); }

// ---------- лифт ----------
const FLOOR_NAMES = { '-1': 'Б · подвал', 0: '1 · вестибюль', 1: '2', 2: '3', 3: '4', 4: '∞' };
G.elevatorPanel = L => {
  const opts = [-1, 0, 1, 2, 3];
  if (G.hasItem('infCard') || L === 4) opts.push(4);
  const btns = opts.map(f => `<button data-keep data-floor="${f}" class="${f === L ? 'cur' : ''} ${f === 4 ? 'inf' : ''}">${f === -1 ? 'Б' : f === 4 ? '∞' : f + 1}</button>`).join('');
  openModal('elevator', `<div class="lift" data-keep><div class="liftTitle">ЛИФТ · сейчас: ${FLOOR_NAMES[L]}</div><div class="liftBtns">${btns}</div>${G.hasItem('infCard') ? '' : '<div class="liftHint">Под кнопками — пустое место и щель для карты.</div>'}<small>Esc — закрыть</small></div>`);
  $('modalBody').querySelectorAll('button[data-floor]').forEach(b => b.addEventListener('click', ev => { ev.stopPropagation(); ride(L, +b.dataset.floor); }));
};
function ride(from, to) {
  closeModal();
  if (from === to) { S.sfxElevatorDing(); return; }
  state.busy = true;
  elevatorDoors(from, false); S.sfxClick();
  setTimeout(() => {
    S.sfxElevatorRide(2.6 + Math.abs(to - from) * 0.3);
    fadeTo(0.92, 600, () => {
      player.pos.y += (to - from) * FH; player.vy = 0;
      for (const k of Object.keys(ELEV.doors)) if (+k !== to) elevatorDoors(+k, false);
      setTimeout(() => {
        fadeTo(0, 600, () => {
          S.sfxElevatorDing(); elevatorDoors(to, true); state.busy = false;
          if (to === 4) toast('Этаж ∞. Двери открываются прямо в небо.');
        });
      }, 1600 + Math.abs(to - from) * 300);
    });
  }, 1100);
}
G.ending = () => {
  setTimeout(() => {
    const total = Object.values(STORY_TOTAL).reduce((a, b) => a + b, 0);
    const notes = Object.values(state.journal).reduce((a, j) => a + Object.keys(j).length, 0);
    openModal('ending', `<div class="end"><h2>Солнце не садится</h2><p>Ты сидишь на крыше отеля Grand Simulacre. Внизу — малиновая пустыня, над тобой — тёплое жёлтое небо. Никуда не нужно идти.</p><p class="big">Секретов: ${state.secrets.size} из ${SECRETS_TOTAL} · Историй: ${notes} из ${total}</p><button id="stay">Остаться ещё немного</button></div>`);
  }, 1500);
};

// ---------- взаимодействие ----------
const ray = new THREE.Raycaster(); ray.far = 2.6;
let focus = null, rayTimer = 0;
const center = new THREE.Vector2(0, 0);
function isShown(o) { while (o) { if (!o.visible) return false; o = o.parent; } return true; }
function ownerOf(o) {
  let own = o.userData.owner || o;
  while (own && !own.userData.interact) own = own.parent && own.parent.userData ? (own.parent.userData.owner || own.parent) : null;
  return own && own.userData.interact ? own : null;
}
function updateFocus() {
  ray.setFromCamera(center, camera);
  const groups = Object.values(W.levels).filter(g => g.visible);
  const hits = ray.intersectObjects(groups, true);
  let f = null;
  for (const h of hits) {
    const o = h.object;
    if (o.userData.noRay || (o.material && o.material.blending === THREE.AdditiveBlending)) continue;
    if (o.material && o.material.transparent && o.material.opacity < 0.2 && !o.userData.owner && !o.userData.hit) continue;
    if (!isShown(o)) continue;
    f = ownerOf(o); break;
  }
  focus = f;
  if (player.sitting) return;
  if (focus) { const it = focus.userData.interact; hint((TOUCH ? '' : '[E] ') + (typeof it.label === 'function' ? it.label() : it.label)); }
  else hint('');
}
let hintSticky = 0;
function hint(t, sticky = false) {
  if (!sticky && performance.now() < hintSticky) return;
  if (sticky) hintSticky = performance.now() + 2500;
  const h = $('hint'); h.textContent = t; h.classList.toggle('show', !!t);
  $('cross').classList.toggle('active', !!focus && !player.sitting);
}
function doInteract() {
  if (state.busy) return;
  if (player.sitting) { standUp(); return; }
  if (!focus) return;
  const it = focus.userData.interact; if (!it) return;
  it.action(focus);
}

// ---------- физика ----------
function groundAt(x, z, y) {
  let best = -Infinity, snd = 'concrete';
  for (const s of W.surfaces) {
    if (x < s.minX || x > s.maxX || z < s.minZ || z > s.maxZ) continue;
    const h = s.y(x, z);
    if (h <= y + 0.46 && h > best) { best = h; snd = s.sound; }
  }
  return [best, snd];
}
function collide(p) {
  const r = player.radius, y0 = p.y + 0.3, y1 = p.y + 1.75;
  for (let it = 0; it < 3; it++) {
    let moved = false;
    for (const c of W.colliders) {
      if (!c.enabled || c.maxY <= y0 || c.minY >= y1) continue;
      if (p.x + r < c.minX || p.x - r > c.maxX || p.z + r < c.minZ || p.z - r > c.maxZ) continue;
      const cx = Math.max(c.minX, Math.min(p.x, c.maxX)), cz = Math.max(c.minZ, Math.min(p.z, c.maxZ));
      const dx = p.x - cx, dz = p.z - cz; const d2 = dx * dx + dz * dz;
      if (d2 > r * r) continue;
      if (d2 > 1e-8) { const d = Math.sqrt(d2), push = r - d; p.x += dx / d * push; p.z += dz / d * push; }
      else {
        const pen = [p.x - c.minX + r, c.maxX - p.x + r, p.z - c.minZ + r, c.maxZ - p.z + r];
        const m = Math.min(...pen), i = pen.indexOf(m);
        if (i === 0) p.x -= m; else if (i === 1) p.x += m; else if (i === 2) p.z -= m; else p.z += m;
      }
      moved = true;
    }
    if (!moved) break;
  }
}
const fwd = new THREE.Vector3(), right = new THREE.Vector3(), wish = new THREE.Vector3(), tmpV = new THREE.Vector3();
function updatePlayer(dt) {
  if (player.sitting) {
    const s = player.sitting;
    const moving = keys.KeyW || keys.KeyS || keys.KeyA || keys.KeyD || keys.ArrowUp || keys.ArrowDown || Math.abs(touch.mx) + Math.abs(touch.my) > 0.6;
    if (moving && performance.now() - s.t > 600) standUp();
    else { camera.position.lerp(tmpV.set(s.x, s.y, s.z), Math.min(1, dt * 6)); return; }
  }
  fwd.set(-Math.sin(player.yaw), 0, -Math.cos(player.yaw));
  right.set(Math.cos(player.yaw), 0, -Math.sin(player.yaw));
  wish.set(0, 0, 0);
  if (!state.paused && !state.modal && !state.busy) {
    if (keys.KeyW || keys.ArrowUp) wish.add(fwd);
    if (keys.KeyS || keys.ArrowDown) wish.sub(fwd);
    if (keys.KeyD || keys.ArrowRight) wish.add(right);
    if (keys.KeyA || keys.ArrowLeft) wish.sub(right);
    if (touch.move) { wish.addScaledVector(fwd, -touch.my); wish.addScaledVector(right, touch.mx); }
  }
  const run = keys.ShiftLeft || keys.ShiftRight;
  const speed = run ? 4.6 : 2.5;
  if (wish.lengthSq() > 1) wish.normalize();
  player.vel.lerp(wish.multiplyScalar(speed), Math.min(1, dt * 10));
  const p = player.pos;
  // шаг дробится, чтобы на низком FPS не проходить сквозь тонкие стены
  const steps = Math.max(1, Math.ceil(Math.hypot(player.vel.x, player.vel.z) * dt / 0.12));
  for (let i = 0; i < steps; i++) {
    const np = new THREE.Vector3(p.x + player.vel.x * dt / steps, p.y, p.z + player.vel.z * dt / steps); collide(np);
    const [g2] = groundAt(np.x, np.z, p.y);
    if (g2 > -Infinity) { p.x = np.x; p.z = np.z; }
  }
  const [g, snd] = groundAt(p.x, p.z, p.y);
  player.vy -= 22 * dt; p.y += player.vy * dt;
  if (g > -Infinity && p.y <= g) { p.y = g; player.vy = 0; player.ground = snd; }
  if (p.y < -12 && !redReturn) { p.set(-23, 0, 0.5); player.vy = 0; }
  const sp = Math.hypot(player.vel.x, player.vel.z);
  if (sp > 0.3 && player.vy === 0) {
    player.bob += dt * sp * (run ? 2.2 : 2.6);
    const ph = Math.floor(player.bob / P);
    if (ph !== player.lastStepPhase) { player.lastStepPhase = ph; S.sfxStep(player.ground, run); }
  } else player.bob += (Math.round(player.bob / P) * P - player.bob) * Math.min(1, dt * 6);
  const bobY = Math.abs(Math.sin(player.bob)) * 0.045;
  camera.position.set(p.x, p.y + player.eye - 0.03 + bobY, p.z);
}

// ---------- свет: пул ближайших источников с плавным появлением ----------
let lightTimer = 0, soundT = 0;
function updateLights(t, dt) {
  lightTimer -= dt;
  const blackout = W.flags.blackout;
  if (lightTimer <= 0) {
    lightTimer = 0.25;
    const cands = [];
    const atriumView = player.level === 1 && state.zone && /ЭТАЖ 2 · ЛИФТОВОЙ ХОЛЛ/.test(state.zone.name);
    for (const a of W.anchors) {
      if (!a.on || (blackout && a.grid)) continue;
      // из лифтового холла второго этажа через окна виден двусветный вестибюль: его люстры тоже светят
      if (a.level !== player.level && !(atriumView && a.level === 0 && lightZoneName(a) === 'ВЕСТИБЮЛЬ')) continue;
      const d = a.pos.distanceTo(camera.position);
      if (d > a.distance + 10) continue;
      cands.push([d - a.intensity * 0.25, a]);
    }
    cands.sort((x, y) => x[0] - y[0]);
    const want = new Set(cands.slice(0, POOL.length).map(c => c[1]));
    const keep = new Set(cands.slice(0, POOL.length + 3).map(c => c[1]));
    for (const l of POOL) { const a = l.userData.a; if (a && (!keep.has(a) || !a.on || (blackout && a.grid))) l.userData.dying = true; else if (a) { want.delete(a); l.userData.dying = false; } }
    const top = new Set(cands.slice(0, POOL.length).map(c => c[1]));
    for (const a of want) {
      // свободного источника нет — забираем тот, что держит дальнюю лампу из «запаса» (иначе
      // включённая заново ближняя лампа ждала бы, пока ты отойдёшь)
      const l = POOL.find(l => !l.userData.a) || POOL.find(l => l.userData.dying) || POOL.find(l => !top.has(l.userData.a)); if (!l) break;
      l.userData.a = a; l.userData.fade = 0; l.userData.dying = false; l.position.copy(a.pos); l.color.copy(a.color); l.distance = a.distance;
    }
  }
  POOL.forEach((l, i) => {
    const b = l.userData.a && lightBox(l.userData.a);
    if (b) { LBU.min.value[i].copy(b[0]); LBU.max.value[i].copy(b[1]); } else { LBU.min.value[i].setScalar(-1e5); LBU.max.value[i].setScalar(1e5); }
  });
  for (const l of POOL) {
    const a = l.userData.a;
    if (!a) { l.intensity = 0; continue; }
    if (l.userData.dying) { l.userData.fade -= dt * 2.5; if (l.userData.fade <= 0) { l.userData.a = null; l.userData.dying = false; l.intensity = 0; continue; } }
    else l.userData.fade = Math.min(1, l.userData.fade + dt * 2.5);
    let k = 1;
    if (a.flicker) { const n = Math.sin(t * 13 + a.phase) + Math.sin(t * 31 + a.phase * 2); k = n > 1.82 - a.flicker * 0.3 ? 0.35 : 1; }
    l.intensity = a.intensity * 3.2 * k * l.userData.fade;
  }
  const zoneAmb = state.zone && state.zone.amb || 1.15;
  const roof = player.level === 4 || state.title;
  // гул ближайшей люминесцентной лампы и звуки мест (фонтан)
  soundT -= dt;
  if (soundT <= 0 && S.audio.ready) {
    soundT = 0.2;
    let hum = 0;
    if (!blackout) for (const a of W.anchors) if (a.hum && a.on && a.level === player.level) { const d = a.pos.distanceTo(camera.position); const v = Math.max(0, 1 - d / 7); hum = Math.max(hum, v * v * (a.flicker ? 0.05 : 0.03)); }
    S.setHum(hum);
    for (const snd of (W.sounds || [])) {
      const d = snd.active === false ? 999 : snd.anyLevel ? snd.pos.distanceTo(camera.position) + Math.abs(snd.level - player.level) * 6 : snd.level === player.level ? snd.pos.distanceTo(camera.position) : 999;
      if (snd.zone === undefined) snd.zone = W.zones.filter(z => z.level === snd.level && snd.pos.x >= z.minX && snd.pos.x <= z.maxX && snd.pos.z >= z.minZ && snd.pos.z <= z.maxZ).sort((a, b) => (a.maxX - a.minX) * (a.maxZ - a.minZ) - (b.maxX - b.minX) * (b.maxZ - b.minZ))[0] || null;
      // из другой комнаты звук глуше; из номера с закрытой дверью почти не слышен
      let wallK = 1;
      if (snd.zone && state.zone && snd.zone !== state.zone) wallK = snd.zone.doors && roomClosed(snd.zone) ? 0.06 : 0.25;
      const v = Math.max(0, 1 - d / snd.range) ** 1.5 * snd.gain * wallK;
      // петля не перезапускается каждый раз на границе слышимости: стихает до нуля и живёт ещё несколько секунд
      if (v > 0.0015) { S.loopStartQuiet(snd.id, snd.kind); S.loopGain(snd.id, v); snd.idle = 0; }
      else if (S.loopActive(snd.id)) {
        S.loopGain(snd.id, 0.0001); snd.idle = (snd.idle || 0) + 0.2;
        if (snd.active === false || snd.idle > 6) { S.loopStop(snd.id); snd.idle = 0; }
      }
    }
  }
  const curtainDark = !roof && state.zone && state.zone.dark || 0;
  // в комнате с погашенным верхним светом рассеянный свет тоже слабее: картины и стены темнеют вместе
  const zl = !roof && state.zone && state.zone.lamps;
  const lampsOff = zl && !zl.some(a => a.on && !(blackout && a.grid)) ? 1 : 0;
  hemi.intensity = (blackout ? 0.55 : 1) * (roof ? 2.0 : zoneAmb * 0.78) * (1 - 0.62 * curtainDark) * (1 - 0.4 * lampsOff);
  amb.intensity = 0.32 * (1 - 0.5 * curtainDark) * (1 - 0.35 * lampsOff);
  hemi.color.setHex(roof ? 0xffd090 : 0xc08a5a);
  const dream = state.zone && state.zone.name === 'ЗА ШТОРОЙ';
  if (roof) { sun.intensity = 2.4; }
  else sun.intensity = shadowsOn && !dream ? SUN_IN : 0;
}

// ---------- зоны, триггеры, видимость ----------
function updateWorld() {
  const p = player.pos;
  const L = Math.max(-1, Math.min(4, Math.floor((p.y + 1.2) / FH)));
  player.level = L;
  if (L !== player.lastL) { player.lastL = L; W.shadowDirty = true; }
  for (const [k, g] of Object.entries(W.levels)) {
    const vis = state.title || params.has('qa') || Math.abs(+k - L) <= 1;
    g.visible = vis;
    if (proxies[k]) proxies[k].forEach(m => m.visible = !vis);
  }
  const far = L === 4 || state.title;
  scene.fog.far = far ? 2000 : 46; scene.fog.near = far ? 1500 : 8;
  if (state.title) return;
  let z = null, za = Infinity;
  for (const zn of W.zones) {
    if (zn.level !== L || p.x < zn.minX || p.x > zn.maxX || p.z < zn.minZ || p.z > zn.maxZ) continue;
    const a = (zn.maxX - zn.minX) * (zn.maxZ - zn.minZ); if (a < za) { za = a; z = zn; }
  }
  if (z !== state.zone) {
    state.zone = z;
    if (z) {
      const el = $('zone'); el.textContent = z.name; el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
      if (S.audio.ready) { S.setRoomReverb(z.reverb); S.setAmbience(z.wind, z.buzz); S.setMusicMuffle(z.muffle); }
    }
  }
  for (const tr of W.triggers) {
    if (tr.done || tr.level !== L) continue;
    if (p.x > tr.minX && p.x < tr.maxX && p.z > tr.minZ && p.z < tr.maxZ) { tr.done = tr.once; tr.fn(); }
  }
}

// ---------- цикл ----------
const clock = new THREE.Clock();
let staticT = 0, fpsT0 = performance.now(), fpsN = 0;
function frame() {
  const dt = Math.min(0.1, clock.getDelta()); const t = clock.elapsedTime;
  if (state.title && !params.has('autostart') && !params.has('x')) {
    // облёт фасада на стартовом экране
    const a = t * 0.045 + 2.4, R = 78;
    camera.position.set(2 + Math.cos(a) * R, 20 + Math.sin(t * 0.1) * 3, Math.sin(a) * R);
    camera.lookAt(0, 5, 0);
  } else {
    if (state.title) state.title = false;
    if ((state.started && !state.paused) || (TOUCH && state.started) || params.has('autostart')) updatePlayer(dt);
    else camera.position.set(player.pos.x, player.pos.y + player.eye, player.pos.z);
    camera.rotation.set(player.pitch, player.yaw, 0, 'YXZ');
  }
  updateWorld();
  updateCull(dt);
  updateLights(t, dt);
  for (const f of W.animated) { if (f.__lvl !== undefined && W.levels[f.__lvl] && !W.levels[f.__lvl].visible) continue; f(dt, t); }
  sky.update(t, dt);
  staticT -= dt; if (staticT < 0) { staticT = 0.07; updateStatic(t); }
  rayTimer -= dt; if (rayTimer < 0) { rayTimer = 0.08; if (state.started && !state.modal) updateFocus(); }
  glitchT = Math.max(0, glitchT - dt);
  shadowT -= dt;
  if (sun.castShadow && sun.intensity > 0 && (W.shadowDirty || shadowT <= 0)) { renderer.shadowMap.needsUpdate = true; W.shadowDirty = false; shadowT = 0.5; }
  renderer.setRenderTarget(rt); renderer.render(scene, camera); window.__calls = renderer.info.render.calls;
  postU.uInvProj.value.copy(camera.projectionMatrixInverse); postU.uProjY.value = camera.projectionMatrix.elements[5];
  renderer.setRenderTarget(null); renderer.render(postScene, postCam);
  fpsN++; { const nw = performance.now(); if (nw - fpsT0 > 1000) { window.__fps = fpsN * 1000 / (nw - fpsT0); fpsT0 = nw; fpsN = 0; } }
  requestAnimationFrame(frame);
}
resize();
{
  const saved = [];
  scene.traverse(o => { if (o.isGroup || o.isMesh) { saved.push([o, o.visible]); o.visible = true; } });
  try { renderer.setRenderTarget(rt); renderer.compile(scene, camera); renderer.setRenderTarget(null); } catch (e) { }
  for (const [o, v] of saved) o.visible = v;
}
requestAnimationFrame(frame);
$('loading').classList.add('hidden');
if (params.has('autostart')) { state.started = true; state.paused = false; state.title = false; $('start').classList.add('hidden'); document.body.classList.add('playing'); }

// ---------- автопроверка расстановки (?qa=1) ----------
window.__qa = () => {
  const out = [];
  const statics = [];
  const underDoor = o => { while (o) { if (o.userData.isDoor) return true; o = o.parent; } return false; };
  for (const g of Object.values(W.levels)) g.traverse(o => { if (o.isMesh && !o.userData.noRay && !o.userData.hit && !(o.material && o.material.transparent) && !underDoor(o)) statics.push(o); });
  // «каркас»: только слитая геометрия уровней (стены, полы, потолки, отделка)
  const shell = []; for (const g of Object.values(W.levels)) for (const o of g.children) if (o.isMesh && !o.userData.noRay && !(o.material && o.material.transparent) && !o.userData.dynamic) shell.push(o);
  const rc = new THREE.Raycaster();
  const hitDist = (from, dir, self, far = 0.5) => {
    rc.set(from, dir); rc.far = far;
    const hs = rc.intersectObjects(statics, false);
    for (const h of hs) { let o = h.object, mine = false; while (o) { if (o === self) { mine = true; break; } o = o.parent; } if (!mine) return h.distance; }
    return Infinity;
  };
  const q = new THREE.Quaternion(), n = new THREE.Vector3(), r = new THREE.Vector3(), u = new THREE.Vector3(), p = new THREE.Vector3();
  for (const it of W.qa) {
    const o = it.obj; o.updateMatrixWorld(true);
    o.getWorldPosition(p); o.getWorldQuaternion(q);
    const name = it.what || (o.userData.interact ? (typeof o.userData.interact.label === 'function' ? o.userData.interact.label() : o.userData.interact.label) : 'объект');
    const at = p.toArray().map(v => +v.toFixed(2));
    if (it.kind === 'wall') {
      n.set(0, 0, 1).applyQuaternion(q); r.set(1, 0, 0).applyQuaternion(q); u.set(0, 1, 0).applyQuaternion(q);
      const c = p.clone().addScaledVector(u, it.dy || 0);
      const corners = [[0, 0], [-0.45, -0.45], [0.45, -0.45], [-0.45, 0.45], [0.45, 0.45]];
      const bad = corners.filter(([a, b]) => {
        const s = c.clone().addScaledVector(r, a * (it.w || 0.3)).addScaledVector(u, b * (it.h || 0.3)).addScaledVector(n, 0.06);
        return hitDist(s, n.clone().negate(), o, 0.2) > 0.14;
      });
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
  // над каждой зоной должен быть потолок своего этажа, а не фасад/экстерьер
  if (W.exterior) {
    const ext = [], lvl = [];
    W.exterior.traverse(o => { if (o.isMesh) ext.push(o); });
    for (const z of W.zones) {
      for (const [fx, fz] of [[0.5, 0.5], [0.15, 0.15], [0.85, 0.85], [0.15, 0.85], [0.85, 0.15]]) {
        const x = z.minX + (z.maxX - z.minX) * fx, zz = z.minZ + (z.maxZ - z.minZ) * fz, y = z.level * FH + 1.6;
        rc.set(new THREE.Vector3(x, y, zz), new THREE.Vector3(0, 1, 0)); rc.far = 7;
        const he = rc.intersectObjects(ext, false)[0]; if (!he) continue;
        const hl = rc.intersectObjects(statics, false)[0];
        if (!hl || he.distance < hl.distance + 0.005) { out.push(`фасад внутри помещения: ${z.name} @${[x, y, zz].map(v => +v.toFixed(1))} (на ${he.distance.toFixed(2)} м выше глаз)`); break; }
      }
    }
  }
  // предметы, торчащие в стену или сквозь неё: лучи из центра к углам корпуса
  {
    const rc2 = new THREE.Raycaster(); const box3 = new THREE.Box3(); const inv = new THREE.Matrix4(); const tmpB = new THREE.Box3();
    for (const it of W.qa) {
      if (!['floor', 'table', 'support'].includes(it.kind)) continue;
      const o = it.obj; o.updateMatrixWorld(true); inv.copy(o.matrixWorld).invert();
      box3.makeEmpty();
      o.traverse(m => { if (!m.isMesh || m.userData.hit || m.userData.noRay) return; m.geometry.computeBoundingBox(); tmpB.copy(m.geometry.boundingBox).applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, m.matrixWorld)); box3.union(tmpB); });
      if (box3.isEmpty()) continue;
      const cl = box3.getCenter(new THREE.Vector3()), c = cl.clone().applyMatrix4(o.matrixWorld);
      let worst = 0;
      for (let k = 0; k < 8; k++) {
        const pl = new THREE.Vector3(k & 1 ? box3.max.x : box3.min.x, k & 2 ? box3.max.y : box3.min.y, k & 4 ? box3.max.z : box3.min.z);
        pl.lerp(cl, 0.02); const pw = pl.applyMatrix4(o.matrixWorld);
        const dir = pw.clone().sub(c); const dist = dir.length(); dir.normalize();
        rc2.set(c, dir); rc2.far = dist;
        const h = rc2.intersectObjects(shell, false)[0];
        if (h && dist - h.distance > worst) worst = dist - h.distance;
      }
      if (worst > 0.035) { const l = o.userData.interact; out.push(`в стене на ${(worst * 100).toFixed(0)} см: ${l ? (typeof l.label === 'function' ? l.label() : l.label) : 'предмет'} @${c.toArray().map(v => +v.toFixed(2))}`); }
    }
  }
  // мебель, врезанная в стены
  const walls = W.colliders.filter(c => c.ref && c.ref.isMesh && c.enabled);
  for (const c of W.colliders) {
    if (!c.ref || !c.ref.isGroup || !c.enabled) continue;
    for (const w of walls) {
      const ox = Math.min(c.maxX, w.maxX) - Math.max(c.minX, w.minX), oz = Math.min(c.maxZ, w.maxZ) - Math.max(c.minZ, w.minZ), oy = Math.min(c.maxY, w.maxY) - Math.max(c.minY, w.minY);
      if (ox > 0.04 && oz > 0.04 && oy > 0.05) { const l = c.ref.userData.interact; out.push(`в стене: ${l ? (typeof l.label === 'function' ? l.label() : l.label) : 'мебель'} @${[(c.minX + c.maxX) / 2, c.minY, (c.minZ + c.maxZ) / 2].map(v => +v.toFixed(2))} (${ox.toFixed(2)}×${oz.toFixed(2)})`); break; }
    }
  }
  // картины, налезающие друг на друга
  const pics = W.qa.filter(i => i.kind === 'wall');
  for (let i = 0; i < pics.length; i++) for (let j = i + 1; j < pics.length; j++) {
    const a = pics[i], b = pics[j]; const pa = a.obj.getWorldPosition(new THREE.Vector3()), pb = b.obj.getWorldPosition(new THREE.Vector3());
    if (Math.abs(pa.y - pb.y) > (a.h + b.h) / 2 + 0.6) continue;
    const dxz = Math.hypot(pa.x - pb.x, pa.z - pb.z);
    if (dxz < (a.w + b.w) / 2 - 0.02 && Math.abs(pa.y + (a.dy || 0) - pb.y - (b.dy || 0)) < (a.h + b.h) / 2 && Math.abs(a.obj.rotation.y - b.obj.rotation.y) < 0.1) out.push(`наложение: ${a.what || 'предмет'} и ${b.what || 'предмет'} @${pa.toArray().map(v => +v.toFixed(2))}`);
  }
  return out;
};
// ---------- поиск совпадающих поверхностей (мерцание) ----------
window.__qaCoplanar = (maxReport = 60) => {
  const tris = [];
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), n = new THREE.Vector3(), e1 = new THREE.Vector3(), e2 = new THREE.Vector3();
  const roots = [...Object.values(W.levels), W.exterior].filter(Boolean);
  for (const root of roots) root.traverse(o => {
    if (!o.isMesh || o.userData.noRay || o.userData.hit) return;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    if (mats.every(m => m.transparent || m.polygonOffset || m.blending !== THREE.NormalBlending)) return;
    o.updateMatrixWorld(true);
    const g = o.geometry, pos = g.attributes.position, idx = g.index;
    const cnt = idx ? idx.count : pos.count;
    const matOf = i => { if (!Array.isArray(o.material)) return o.material; const gr = g.groups.find(gr => i >= gr.start && i < gr.start + gr.count); return gr ? o.material[gr.materialIndex] : o.material[0]; };
    for (let i = 0; i < cnt; i += 3) {
      const m = matOf(i); if (m.transparent || m.polygonOffset) continue;
      const ia = idx ? idx.getX(i) : i, ib = idx ? idx.getX(i + 1) : i + 1, ic = idx ? idx.getX(i + 2) : i + 2;
      a.fromBufferAttribute(pos, ia).applyMatrix4(o.matrixWorld); b.fromBufferAttribute(pos, ib).applyMatrix4(o.matrixWorld); c.fromBufferAttribute(pos, ic).applyMatrix4(o.matrixWorld);
      n.crossVectors(e1.subVectors(b, a), e2.subVectors(c, a)); const area = n.length() / 2; if (area < 1e-4) continue; n.normalize();
      const ax = Math.abs(n.x) > 0.999 ? 0 : Math.abs(n.y) > 0.999 ? 1 : Math.abs(n.z) > 0.999 ? 2 : -1;
      if (ax < 0) continue; // проверяем только осевые грани — их подавляющее большинство
      const sgn = Math.sign([n.x, n.y, n.z][ax]);
      const d = [a.x, a.y, a.z][ax];
      const u = (ax + 1) % 3, v = (ax + 2) % 3;
      const P = [a, b, c].map(p => [[p.x, p.y, p.z][u], [p.x, p.y, p.z][v]]);
      tris.push({ ax, sgn, d, P, minU: Math.min(...P.map(q => q[0])), maxU: Math.max(...P.map(q => q[0])), minV: Math.min(...P.map(q => q[1])), maxV: Math.max(...P.map(q => q[1])), m: m.name || m.type, o });
    }
  });
  const buckets = new Map();
  for (const t of tris) { const k = t.ax + '|' + t.sgn + '|' + Math.round(t.d / 0.01); (buckets.get(k) || buckets.set(k, []).get(k)).push(t); }
  const res = new Map();
  const ov = (p, q) => Math.min(p.maxU, q.maxU) - Math.max(p.minU, q.minU) > 0.02 && Math.min(p.maxV, q.maxV) - Math.max(p.minV, q.minV) > 0.02;
  // точная проверка пересечения двух треугольников в плоскости (разделяющие оси)
  const sepAx = (A, B) => { for (const T of [A, B]) for (let i = 0; i < 3; i++) { const p = T[i], q = T[(i + 1) % 3]; const nx = q[1] - p[1], ny = p[0] - q[0]; const pa = A.map(r => r[0] * nx + r[1] * ny), pb = B.map(r => r[0] * nx + r[1] * ny); if (Math.max(...pa) < Math.min(...pb) + 1e-3 || Math.max(...pb) < Math.min(...pa) + 1e-3) return true; } return false; };
  for (const [k, list] of buckets) {
    const [ax, sg, di] = k.split('|');
    const near = [list, buckets.get(ax + '|' + sg + '|' + (+di + 1)) || []];
    for (let i = 0; i < list.length; i++) for (const L of near) for (let j = (L === list ? i + 1 : 0); j < L.length; j++) {
      const p = list[i], q = L[j];
      if (p.o === q.o && p.m === q.m) continue;
      if (Math.abs(p.d - q.d) > 0.006) continue;
      if (!ov(p, q) || sepAx(p.P, q.P)) continue;
      if (p.ax === 1 && p.sgn < 0 && Math.abs(p.d / FH - Math.round(p.d / FH)) < 0.003) continue; // низ на уровне пола не виден
      if (p.ax === 1 && p.sgn > 0 && (Math.ceil(p.d / FH - 1e-6) * FH - p.d) < 0.03 && (Math.ceil(p.d / FH - 1e-6) * FH - p.d) > 0.005) continue; // верх стены под полом следующего этажа
      // видна ли эта грань: точка чуть перед ней не должна быть внутри стены/пола/потолка
      const cu = (Math.max(p.minU, q.minU) + Math.min(p.maxU, q.maxU)) / 2, cv = (Math.max(p.minV, q.minV) + Math.min(p.maxV, q.maxV)) / 2;
      const pt = [0, 0, 0]; pt[p.ax] = p.d + p.sgn * 0.012; pt[(p.ax + 1) % 3] = cu; pt[(p.ax + 2) % 3] = cv;
      if (W.solids.some(b => pt[0] > b[0] + 1e-3 && pt[0] < b[3] - 1e-3 && pt[1] > b[1] + 1e-3 && pt[1] < b[4] - 1e-3 && pt[2] > b[2] + 1e-3 && pt[2] < b[5] - 1e-3)) continue;
      const key = [p.m, q.m].sort().join(' × ') + ' @' + ['x', 'y', 'z'][p.ax] + '=' + p.d.toFixed(2);
      const r = res.get(key) || { n: 0, at: [], gap: Math.abs(p.d - q.d) }; r.n++;
      if (r.at.length < 2) r.at.push([(p.minU + p.maxU) / 2, (p.minV + p.maxV) / 2].map(x => +x.toFixed(1)).join(','));
      res.set(key, r);
    }
  }
  return [...res.entries()].sort((x, y) => y[1].n - x[1].n).slice(0, maxReport).map(([k, r]) => `${k} (${r.n} пар, зазор ${(r.gap * 1000).toFixed(1)} мм; в осях плоскости: ${r.at.join(' / ')})`);
};
window.__THREE = THREE;
window.__game = { player, W, state, camera, renderer, G, scene, S };
