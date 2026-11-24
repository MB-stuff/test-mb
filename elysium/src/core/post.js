// ЭЛИЗИУМ · кадр и постобработка
// Сцена рисуется в буфер HalfFloat (линейный свет, без тонмаппинга three.js), затем полноэкранный шейдер:
// SSAO по буферу глубины → мягкая тон-кривая → sRGB → (пиксельный режим: 5 бит на канал + дизеринг Байера)
// → виньетка. Пиксельный режим — буфер высотой 360 px без сглаживания, растянутый на экран.
import * as THREE from 'three';

export const POST = { pixel: true, ao: 1, exposure: 1.12, renderer: null, rt: null, u: null };
export function initPost(renderer, { pixel = true, ao = 1, exposure = 1.12 } = {}) {
  Object.assign(POST, { renderer, pixel, ao, exposure });
  renderer.toneMapping = THREE.NoToneMapping;
  POST.u = { tDiffuse: { value: null }, tDepth: { value: null }, uRes: { value: new THREE.Vector2(1, 1) }, uPixel: { value: 1 }, uExposure: { value: exposure }, uInvProj: { value: new THREE.Matrix4() }, uProjY: { value: 1 }, uAO: { value: ao } };
  POST.mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({ uniforms: POST.u, depthTest: false, depthWrite: false, vertexShader: VS, fragmentShader: FS }));
  POST.scene = new THREE.Scene(); POST.scene.add(POST.mesh); POST.cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  makeRT();
}
function makeRT() {
  if (POST.rt) POST.rt.dispose();
  const f = POST.pixel ? THREE.NearestFilter : THREE.LinearFilter;
  POST.rt = new THREE.WebGLRenderTarget(16, 16, { type: THREE.HalfFloatType, samples: POST.pixel ? 0 : 2, magFilter: f, minFilter: f });
  POST.rt.depthTexture = new THREE.DepthTexture(16, 16); POST.rt.depthTexture.type = THREE.UnsignedIntType;
  POST.u.tDiffuse.value = POST.rt.texture; POST.u.tDepth.value = POST.rt.depthTexture;
}
export function resize(camera) {
  const r = POST.renderer, dpr = Math.min(window.devicePixelRatio || 1, 2);
  r.setSize(innerWidth, innerHeight);
  const scale = POST.pixel ? Math.min(1, 360 / innerHeight) : dpr, w = Math.round(innerWidth * scale), h = Math.round(innerHeight * scale);
  POST.rt.setSize(w, h); POST.u.uRes.value.set(w, h); POST.u.uPixel.value = POST.pixel ? 1 : 0;
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
}
export function setPixel(v, camera) { POST.pixel = v; makeRT(); resize(camera); }
export function render(scene, camera) {
  const r = POST.renderer;
  r.setRenderTarget(POST.rt); r.render(scene, camera);
  POST.u.uInvProj.value.copy(camera.projectionMatrixInverse); POST.u.uProjY.value = camera.projectionMatrix.elements[5];
  r.setRenderTarget(null); r.render(POST.scene, POST.cam);
}
// прогрев: все материалы компилируются при загрузке, а не в момент, когда комната впервые попала в кадр
export function warmup(scene, camera) {
  const saved = []; scene.traverse(o => { if (o.isGroup || o.isMesh) { saved.push([o, o.visible]); o.visible = true; } });
  try { POST.renderer.setRenderTarget(POST.rt); POST.renderer.compile(scene, camera); POST.renderer.setRenderTarget(null); } catch (e) { }
  for (const [o, v] of saved) o.visible = v;
}

const VS = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';
const FS = `
uniform sampler2D tDiffuse, tDepth; uniform vec2 uRes; uniform float uPixel, uExposure, uProjY, uAO; uniform mat4 uInvProj;
varying vec2 vUv;
vec3 tone(vec3 c){ c *= uExposure; vec3 k = vec3(0.8); vec3 o = max(c - k, 0.0); return min(c, k) + (1.0 - k) * (1.0 - exp(-o / (1.0 - k))); }
vec3 srgb(vec3 c){ c = clamp(c, 0.0, 1.0); return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c)); }
float bayer(vec2 p){ vec2 q = mod(floor(p), 4.0); int i = int(q.x + q.y * 4.0);
  float m[16]; m[0]=0.;m[1]=8.;m[2]=2.;m[3]=10.;m[4]=12.;m[5]=4.;m[6]=14.;m[7]=6.;m[8]=3.;m[9]=11.;m[10]=1.;m[11]=9.;m[12]=15.;m[13]=7.;m[14]=13.;m[15]=5.;
  for (int k = 0; k < 16; k++) if (k == i) return m[k] / 16.0 - 0.5; return 0.0; }
vec3 vpos(vec2 uv){ float d = texture2D(tDepth, uv).x; vec4 p = uInvProj * vec4(uv * 2.0 - 1.0, d * 2.0 - 1.0, 1.0); return p.xyz / p.w; }
// затенение углов (SSAO): даёт объём, «прижимает» мебель к полу, затемняет стыки стен
float ssao(vec2 uv, vec2 px){
  float d0 = texture2D(tDepth, uv).x; if (d0 > 0.99999) return 1.0;
  vec2 t = 1.0 / uRes; vec3 P = vpos(uv);
  vec3 dx1 = vpos(uv + vec2(t.x, 0.0)) - P, dx2 = P - vpos(uv - vec2(t.x, 0.0)), dy1 = vpos(uv + vec2(0.0, t.y)) - P, dy2 = P - vpos(uv - vec2(0.0, t.y));
  vec3 N = normalize(cross(abs(dx1.z) < abs(dx2.z) ? dx1 : dx2, abs(dy1.z) < abs(dy2.z) ? dy1 : dy2));
  const float R = 1.0;
  float rpx = clamp(R * uProjY * 0.5 * uRes.y / max(-P.z, 0.1), 3.0, uRes.y * 0.25);
  float ang = fract(52.9829189 * fract(dot(px, vec2(0.06711056, 0.00583715)))) * 6.2832, occ = 0.0;
  for (int i = 0; i < 14; i++) {
    float f = (float(i) + 0.5) / 14.0; float a = ang + float(i) * 2.39996;
    vec2 o = vec2(cos(a), sin(a)) * (rpx * f * f + 1.0) * t;
    vec3 v = vpos(uv + o) - P; float L = length(v);
    occ += max(0.0, dot(v, N) / (L + 1e-4) - 0.12) * (1.0 - smoothstep(R * 0.6, R * 1.6, L));
  }
  float ao = clamp(1.0 - occ / 14.0 * 3.2, 0.0, 1.0); return ao * ao;
}
void main(){
  vec2 px = floor(vUv * uRes), uv = uPixel > 0.5 ? (px + 0.5) / uRes : vUv;
  vec3 lin = texture2D(tDiffuse, uv).rgb;
  if (uAO > 1.5) { gl_FragColor = vec4(vec3(ssao(uv, px)), 1.0); return; } // ?ao=2 — показать только карту затенения
  if (uAO > 0.0) lin *= mix(1.0, ssao(uv, px), uAO * 0.85);
  vec3 col = srgb(tone(lin));
  if (uPixel > 0.5) col = floor(col * 31.0 + 0.5 + bayer(px) * 0.9) / 31.0;
  vec2 q = vUv - 0.5; col *= 1.0 - dot(q, q) * 0.6;
  gl_FragColor = vec4(col, 1.0);
}`;
