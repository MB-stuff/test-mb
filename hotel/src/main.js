import * as THREE from 'three';
import { W, G, FH, boxGeo, optimizeLevels } from './engine.js';
import { buildHotel, ELEV, elevatorDoors } from './hotel.js';
import { buildExterior, SUN_DIR } from './sky.js';
import * as S from './audio.js';
import { updateStatic, concrete } from './textures.js';
import IMAGES from './images.json';

const P = Math.PI;
const $ = id => document.getElementById(id);
const params = new URLSearchParams(location.search);
const TOUCH = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
const SECRETS_TOTAL = 8;

// ---------- рендер ----------
const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance', preserveDrawingBuffer: params.has('shot') });
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
$('game').appendChild(renderer.domElement);
let retro = localStorage.getItem('hotel.retro') !== '0';
function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  renderer.setPixelRatio(retro ? Math.max(0.35, dpr * 0.42) : dpr);
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix();
  renderer.domElement.style.imageRendering = retro ? 'pixelated' : 'auto';
}
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x120a08);
scene.fog = new THREE.Fog(0x0e0808, 7, 42);
const camera = new THREE.PerspectiveCamera(72, 1, 0.05, 2500);
scene.add(camera);
W.scene = scene;
window.addEventListener('resize', resize);

const hemi = new THREE.HemisphereLight(0x8a6048, 0x2a0a14, 1.1); scene.add(hemi);
const amb = new THREE.AmbientLight(0x3a2a2a, 0.5); scene.add(amb);
const sun = new THREE.DirectionalLight(0xffc080, 0); sun.position.copy(SUN_DIR).multiplyScalar(100); scene.add(sun);
const POOL = [];
for (let i = 0; i < 8; i++) { const l = new THREE.PointLight(0xffaa66, 0, 8, 1.6); scene.add(l); POOL.push(l); }
const flash = new THREE.SpotLight(0xfff0d0, 0, 18, 0.45, 0.5, 1.4); camera.add(flash); flash.position.set(0.15, -0.1, 0); flash.target.position.set(0, 0, -1); camera.add(flash.target);

// ---------- картинки ----------
W.images = IMAGES;
for (const im of IMAGES) W.imageUrls[im.id] = (window.__IMG && window.__IMG[im.id]) || `../assets/img/${im.id}.jpg`;

// ---------- мир ----------
const proxies = {};
const ext = buildExterior(scene);
buildHotel();
const [mb, ma] = optimizeLevels(); console.log('merged', mb, '->', ma);
buildProxies();
ext.onGlitch = () => { if (Math.random() < 0.5) S.sfxGlitch(); };

// Упрощённые «коробки» фасадов для скрытых этажей (видны из окон сверху)
function buildProxies() {
  const c = document.createElement('canvas'); c.width = 96; c.height = 64; const g = c.getContext('2d');
  g.fillStyle = '#4a3a3a'; g.fillRect(0, 0, 96, 64);
  g.fillStyle = '#e8b870'; g.fillRect(30, 18, 36, 33); g.fillStyle = '#1a1010'; g.fillRect(30, 18, 36, 2); g.fillRect(47, 18, 2, 33);
  g.fillStyle = '#2a2020'; g.fillRect(0, 58, 96, 6);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.magFilter = THREE.NearestFilter;
  const mat = new THREE.MeshBasicMaterial({ map: tex, color: 0x9a8070 });
  const top = new THREE.MeshBasicMaterial({ map: concrete('#3a2a2a', 33), color: 0x8a6a5a });
  const mk = (L, x0, z0, x1, z1, y0, y1) => {
    const m = new THREE.Mesh(boxGeo(x1 - x0, y1 - y0, z1 - z0, 1), [mat, mat, top, mat, mat, mat]);
    const uv = m.geometry.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / 6, uv.getY(i) / 4);
    m.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); scene.add(m); (proxies[L] = proxies[L] || []).push(m);
  };
  for (let L = 0; L <= 3; L++) mk(L, -0.12, -6.52, 30.12, 6.52, L * FH, L * FH + FH - 0.02);
  mk(0, -26.12, -14.12, 0, 14.12, 0, 8.3);
}

// ---------- состояние игрока ----------
const player = {
  pos: new THREE.Vector3(-23, 0, 0.5), vy: 0, yaw: -P / 2, pitch: 0, radius: 0.28, eye: 1.62,
  sitting: null, standPos: null, bob: 0, lastStepPhase: 0, level: 0, ground: 'marble', vel: new THREE.Vector3(),
};
if (params.has('x')) { player.pos.set(+params.get('x'), +(params.get('y') || 0), +params.get('z')); }
if (params.has('yaw')) player.yaw = +params.get('yaw');
if (params.has('pitch')) player.pitch = +params.get('pitch');

const state = { started: false, paused: true, modal: null, secrets: new Set(), items: new Map(), zone: null, flags: W.flags, fade: 0, busy: false, sens: +(localStorage.getItem('hotel.sens') || 1) };
G.flags = W.flags;

// ---------- ввод ----------
const keys = {};
addEventListener('keydown', e => {
  if (e.repeat) return;
  keys[e.code] = true;
  if (state.modal) { if (['Escape', 'KeyE', 'Space', 'Enter'].includes(e.code) && state.modal !== 'ending') closeModal(); return; }
  if (!state.started) return;
  if (e.code === 'Escape' && lockFailed) { state.paused = true; showPause(); return; }
  if (e.code === 'KeyE') doInteract();
  if (e.code === 'Space' && player.sitting) standUp();
  if (e.code === 'KeyF') toggleFlash();
  if (e.code === 'KeyM') { const v = S.audio.musicVolume > 0 ? 0 : 0.55; S.setMusicVolume(v); $('vol').value = v; toast(v ? 'Музыка включена' : 'Музыка выключена'); }
  if (e.code === 'KeyP') { retro = !retro; localStorage.setItem('hotel.retro', retro ? '1' : '0'); $('retro').checked = retro; resize(); }
});
addEventListener('keyup', e => { keys[e.code] = false; });
function toggleFlash() { flash.intensity = flash.intensity > 0 ? 0 : 12; S.sfxClick(); }

const canvas = renderer.domElement;
let downAt = null;
canvas.addEventListener('mouseup', e => { if (lockFailed && downAt && Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) < 6 && !state.modal) doInteract(); downAt = null; });
canvas.addEventListener('mousedown', e => {
  if (!state.started || state.modal) return;
  if (document.pointerLockElement !== canvas && !TOUCH && !lockFailed) { lockPointer(); return; }
  if (e.button === 0) { downAt = [e.clientX, e.clientY]; if (!lockFailed) doInteract(); }
});
// Если захват курсора недоступен (например, во встроенном окне) — смотрим, зажав кнопку мыши
let lockFailed = false;
function lockPointer() {
  if (lockFailed) { state.paused = false; $('start').classList.add('hidden'); return; }
  try { const r = canvas.requestPointerLock(); if (r && r.catch) r.catch(onLockFail); } catch (e) { onLockFail(); }
  setTimeout(() => { if (document.pointerLockElement !== canvas && !state.modal && state.started && $('start').classList.contains('hidden') === false) onLockFail(); }, 700);
}
function onLockFail() {
  if (lockFailed) return; lockFailed = true;
  state.paused = false; $('start').classList.add('hidden');
  toast('Курсор не захватывается: зажми кнопку мыши и веди, чтобы осматриваться.', 6000);
}
document.addEventListener('pointerlockerror', onLockFail);
addEventListener('mousemove', e => {
  if (document.pointerLockElement === canvas) look(e.movementX, e.movementY);
  else if (lockFailed && e.buttons && !state.modal) look(e.movementX, e.movementY);
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
document.addEventListener('pointerlockchange', () => {
  if (document.pointerLockElement === canvas) { state.paused = false; $('start').classList.add('hidden'); }
  else if (state.started && !state.modal && !TOUCH) { state.paused = true; showPause(); }
});

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
}
function showStick(x, y) { const s = $('stick'); s.style.display = 'block'; s.style.left = x - 50 + 'px'; s.style.top = y - 50 + 'px'; }
function moveStick(x, y) { $('knob').style.transform = `translate(${x * 30}px, ${y * 30}px)`; }
function hideStick() { $('stick').style.display = 'none'; $('knob').style.transform = ''; }

// ---------- старт / пауза ----------
function showPause() {
  $('start').classList.remove('hidden'); $('startBtn').textContent = 'Продолжить';
  $('startTitle').textContent = 'Пауза';
}
$('startBtn').addEventListener('click', start);
$('vol').addEventListener('input', e => S.setMusicVolume(+e.target.value));
$('sens').value = state.sens; $('sens').addEventListener('input', e => { state.sens = +e.target.value; localStorage.setItem('hotel.sens', state.sens); });
$('retro').checked = retro; $('retro').addEventListener('change', e => { retro = e.target.checked; localStorage.setItem('hotel.retro', retro ? '1' : '0'); resize(); });
function start() {
  S.initAudio(); S.setMusicVolume(+$('vol').value);
  if (!state.started) { state.started = true; setTimeout(() => toast('Отель «Полдень». Добро пожаловать. Снова.'), 800); setTimeout(() => { if (!state.zone) return; }, 0); $('help').classList.add('show'); setTimeout(() => $('help').classList.remove('show'), 12000); }
  if (TOUCH) { state.paused = false; $('start').classList.add('hidden'); try { document.documentElement.requestFullscreen && document.documentElement.requestFullscreen().catch(() => { }); } catch (e) { } }
  else lockPointer();
}

// ---------- UI: сообщения и модальные окна ----------
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
  if (!TOUCH) lockPointer();
}
$('modal').addEventListener('click', e => { if (e.target.dataset.floor !== undefined) return; if (state.modal !== 'ending' || e.target.id === 'stay') closeModal(); });
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

G.toast = toast; G.subtitle = subtitle;
G.note = (title, text) => openModal('note', `<div class="paper"><h3>${esc(title)}</h3><p>${esc(text).replace(/\n/g, '<br>')}</p><small>E / клик — закрыть</small></div>`);
G.showPicture = im => {
  if (!im) return;
  const credit = im.author ? `${esc(im.author)} · ${esc(im.license)}${im.url ? ` · <a href="${esc(im.url)}" target="_blank" rel="noopener">источник</a>` : ''}` : (im.group === 'portrait' ? 'портрет из коллекции отеля' : 'из коллекции отеля');
  let title = im.title.replace(/_/g, ' ').replace(/\(cropped\)/, '').trim();
  if (/^(images|photo|vtym|\w{20,}|\d)/i.test(title)) title = 'Без названия';
  openModal('picture', `<figure><img src="${W.imageUrls[im.id]}" alt=""><figcaption><b>${esc(title)}</b><br>${credit}</figcaption></figure><small>E / клик — закрыть</small>`);
};
G.addItem = (id, name) => { state.items.set(id, name); renderInv(); toast('Получено: ' + name); };
G.hasItem = id => state.items.has(id);
G.secret = (id, name) => {
  if (state.secrets.has(id)) return;
  state.secrets.add(id); S.sfxSecret(); renderInv();
  toast(`✦ Секрет найден: ${name} (${state.secrets.size}/${SECRETS_TOTAL})`, 5000);
  if (state.secrets.size >= 4 && !W.flags.phoneRang) {
    W.flags.phoneRang = true;
    setTimeout(() => { W.flags.phoneRinging = true; S.loopStart('lobbyPhone', 'ring'); subtitle('Где-то внизу, на стойке регистрации, звонит телефон.'); }, 15000);
  }
};
G.answerPhone = () => {
  W.flags.phoneRinging = false; S.loopStop('lobbyPhone');
  return `«Вы нашли ${state.secrets.size} из ${SECRETS_TOTAL}. Управляющий ждёт вас там, где солнце видно целиком. Возьмите карту в подвале. Лифт поймёт».`;
};
function renderInv() {
  $('secrets').textContent = `✦ ${state.secrets.size}/${SECRETS_TOTAL}`;
  $('inv').innerHTML = [...state.items.values()].map(n => `<div>▪ ${esc(n)}</div>`).join('');
}
renderInv();

G.sit = ({ x, y, z, yaw, lie }) => {
  if (player.sitting) return;
  S.sfxSit();
  player.standPos = player.pos.clone();
  player.sitting = { x, y, z, yaw, lie, t: 0 };
  player.yaw = yaw; player.pitch = lie ? 1.1 : -0.05;
  hint(TOUCH ? 'Кнопка «E» — встать' : 'Пробел / движение — встать', true);
};
function standUp() {
  if (!player.sitting) return;
  player.sitting = null; S.sfxSit(); player.pitch = 0;
  if (player.standPos) player.pos.copy(player.standPos);
}
G.teleport = (x, y, z, yaw, msg) => {
  if (state.busy) return; state.busy = true;
  fadeTo(1, 350, () => {
    player.pos.set(x, y, z); player.yaw = yaw; player.pitch = 0; player.vy = 0;
    if (msg) toast(msg);
    setTimeout(() => fadeTo(0, 500, () => { state.busy = false; }), 250);
  });
};
function fadeTo(v, ms, cb) {
  const f = $('fade'); f.style.transition = `opacity ${ms}ms`; f.style.opacity = v;
  setTimeout(() => cb && cb(), ms + 30);
}

// ---------- лифт ----------
const FLOOR_NAMES = { '-1': 'Б · подвал', 0: '1 · вестибюль', 1: '2', 2: '3', 3: '4', 4: '∞' };
G.elevatorPanel = L => {
  const opts = [-1, 0, 1, 2, 3];
  if (G.hasItem('infCard') || L === 4) opts.push(4);
  const btns = opts.map(f => `<button data-floor="${f}" class="${f === L ? 'cur' : ''} ${f === 4 ? 'inf' : ''}">${f === -1 ? 'Б' : f === 4 ? '∞' : f + 1}</button>`).join('');
  openModal('elevator', `<div class="lift"><div class="liftTitle">ЛИФТ · сейчас: ${FLOOR_NAMES[L]}</div><div class="liftBtns">${btns}</div>${G.hasItem('infCard') ? '' : '<div class="liftHint">Под кнопками — пустое место и щель для карты.</div>'}<small>Esc — закрыть</small></div>`);
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
  fadeTo(0.0, 10);
  setTimeout(() => {
    openModal('ending', `<div class="end"><h2>Солнце не садится</h2><p>Ты сидишь на крыше отеля «Полдень». Внизу — малиновая пустыня, над тобой — тёплое жёлтое небо. Никуда не нужно идти.</p><p class="big">Секретов найдено: ${state.secrets.size} из ${SECRETS_TOTAL}</p><button id="stay">Остаться ещё немного</button></div>`);
  }, 1500);
};

// ---------- взаимодействие ----------
const ray = new THREE.Raycaster(); ray.far = 2.6;
let focus = null, rayTimer = 0;
const center = new THREE.Vector2(0, 0);
function isShown(o) { while (o) { if (!o.visible) return false; o = o.parent; } return true; }
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
    let own = o.userData.owner || o;
    while (own && !(own.userData.interact)) own = own.parent && own.parent.userData ? (own.parent.userData.owner || own.parent) : null;
    f = own && own.userData.interact ? own : null;
    break;
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
      let dx = p.x - cx, dz = p.z - cz; const d2 = dx * dx + dz * dz;
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

const fwd = new THREE.Vector3(), right = new THREE.Vector3(), wish = new THREE.Vector3();
function updatePlayer(dt) {
  if (player.sitting) {
    const s = player.sitting;
    const moving = keys.KeyW || keys.KeyS || keys.KeyA || keys.KeyD || keys.ArrowUp || keys.ArrowDown || Math.abs(touch.mx) + Math.abs(touch.my) > 0.6;
    if (moving && performance.now() > hintSticky - 2000) { standUp(); }
    else {
      camera.position.lerp(new THREE.Vector3(s.x, s.y, s.z), Math.min(1, dt * 6));
      return;
    }
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
  const nx = p.x + player.vel.x * dt, nz = p.z + player.vel.z * dt;
  const np = new THREE.Vector3(nx, p.y, nz); collide(np);
  // не даём шагнуть в пустоту без опоры (кроме лестничных провалов — там есть поверхности)
  const [g2] = groundAt(np.x, np.z, p.y);
  if (g2 > -Infinity) { p.x = np.x; p.z = np.z; }
  const [g, snd] = groundAt(p.x, p.z, p.y);
  player.vy -= 22 * dt; p.y += player.vy * dt;
  if (g > -Infinity && p.y <= g) { p.y = g; player.vy = 0; player.ground = snd; }
  if (p.y < -12) { p.set(-23, 0, 0.5); player.vy = 0; }
  // покачивание и шаги
  const sp = Math.hypot(player.vel.x, player.vel.z);
  if (sp > 0.3 && player.vy === 0) {
    player.bob += dt * sp * (run ? 2.2 : 2.6);
    const ph = Math.floor(player.bob / P);
    if (ph !== player.lastStepPhase) { player.lastStepPhase = ph; S.sfxStep(player.ground, run); }
  } else player.bob += (Math.round(player.bob / P) * P - player.bob) * Math.min(1, dt * 6);
  const bobY = Math.abs(Math.sin(player.bob)) * 0.05;
  camera.position.set(p.x, p.y + player.eye - 0.03 + bobY, p.z);
}

// ---------- свет: пул ближайших источников ----------
let lightTimer = 0;
function updateLights(t, dt) {
  lightTimer -= dt;
  const blackout = W.flags.blackout;
  if (lightTimer <= 0) {
    lightTimer = 0.2;
    const cands = [];
    for (const a of W.anchors) {
      if (a.glow) a.glow.visible = a.on && !blackout;
      if (!a.on || blackout || a.level !== player.level) continue;
      const d = a.pos.distanceTo(camera.position);
      if (d > a.distance + 9) continue;
      cands.push([d - a.intensity * 0.3, a]);
    }
    cands.sort((x, y) => x[0] - y[0]);
    POOL.forEach((l, i) => { const a = cands[i] && cands[i][1]; l.userData.a = a || null; if (a) { l.position.copy(a.pos); l.color.copy(a.color); l.distance = a.distance; } });
  }
  for (const l of POOL) {
    const a = l.userData.a;
    if (!a) { l.intensity = 0; continue; }
    let k = 1;
    if (a.flicker) { const n = Math.sin(t * 13 + a.phase) + Math.sin(t * 31 + a.phase * 2); k = n > 1.75 - a.flicker * 0.4 ? 0.15 : (Math.random() < a.flicker * 0.02 ? 0.3 : 1); }
    l.intensity = a.intensity * 3.2 * k;
  }
  hemi.intensity = (blackout ? 0.5 : 1) * (state.zone && state.zone.amb || 1.1);
  sun.intensity = player.level === 4 ? 2.2 : 0;
  hemi.color.setHex(player.level === 4 ? 0xffd090 : 0x8a6048);
  hemi.intensity *= player.level === 4 ? 1.6 : 1;
}

// ---------- зоны, триггеры, видимость ----------
function updateWorld() {
  const p = player.pos;
  const L = Math.max(-1, Math.min(4, Math.floor((p.y + 1.2) / FH)));
  player.level = L;
  for (const [k, g] of Object.entries(W.levels)) {
    const vis = Math.abs(+k - L) <= 1;
    g.visible = vis;
    if (proxies[k]) proxies[k].forEach(m => m.visible = !vis);
  }
  scene.fog.far = L === 4 ? 2000 : 42; scene.fog.near = L === 4 ? 1500 : 7;
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
let staticT = 0, fpsAcc = 0, fpsN = 0;
function frame() {
  const dt = Math.min(0.05, clock.getDelta()); const t = clock.elapsedTime;
  if (state.started && !state.paused || TOUCH && state.started) updatePlayer(dt);
  else { camera.position.set(player.pos.x, player.pos.y + player.eye, player.pos.z); }
  camera.rotation.set(player.pitch, player.yaw, 0, 'YXZ');
  updateWorld();
  updateLights(t, dt);
  for (const f of W.animated) f(dt, t);
  ext.update(t, dt);
  staticT -= dt; if (staticT < 0) { staticT = 0.07; updateStatic(t); }
  rayTimer -= dt; if (rayTimer < 0) { rayTimer = 0.08; if (state.started && !state.modal) updateFocus(); }
  renderer.render(scene, camera);
  fpsAcc += dt; fpsN++; if (fpsAcc > 1) { window.__fps = fpsN / fpsAcc; fpsAcc = 0; fpsN = 0; }
  requestAnimationFrame(frame);
}
resize();
requestAnimationFrame(frame);
$('loading').classList.add('hidden');
if (params.has('autostart')) { state.started = true; state.paused = false; $('start').classList.add('hidden'); }
window.__game = { player, W, state, camera, renderer, G, scene, S };
