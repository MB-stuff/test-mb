// ЭЛИЗИУМ · сборка игры и цикл кадра
// createGame({ build, … }) — всё остальное (рендер, свет, солнце, отсечение, ввод, меню, настройки, QA)
// подключается само. build() строит мир функциями из world.js / props.js.
//
// Порядок кадра (важен):
//   ввод → игрок → этажи и зона → триггеры → отсечение → свет → анимации → звук (5 раз/с) → взгляд → солнце → рендер
//
// Параметры адреса (для отладки и тестов): ?autostart=1 &x= &y= &z= &yaw= &pitch= — старт в точке;
//   ?qa=1 — всё видно, есть __qa(); ?shot=1 — можно делать скриншоты; ?shadows=0|1 ?draw=0|1|2 ?pixel=0|1 ?ao=0|1|2
import * as THREE from 'three';
import { W, G, CFG, configure, initWorld, setLevel, optimize, zoneAt } from './world.js';
import * as S from './audio.js';
import { initInput, lockPointer, input, keys } from './input.js';
import { player, updatePlayer, look, standUp } from './player.js';
import { initLights, updateLights, addLightSwitches, setBlackout } from './lights.js';
import { initSun, applyShadowFlags, setShadows, updateSun, buildWindowPatches, SUN } from './sun.js';
import { initPost, resize, render, setPixel, warmup, POST } from './post.js';
import { initCull, updateCull, updateLevels, CULL, roomClosed } from './cull.js';
import { updateFocus, doInteract, findInteract } from './interact.js';
import { installQA } from './qa.js';
import * as UI from './ui.js';

const $ = id => document.getElementById(id);
export const params = new URLSearchParams(location.search);

export function createGame(o) {
  const {
    key = 'elysium',                    // префикс ключей настроек в localStorage
    world = {},                         // configure(): FH, T, CEIL…
    build,                              // () => void — построить мир
    start = { pos: [0, 0, 0], yaw: 0 }, // точка появления
    bounds = [-20, -5, -20, 20, 12, 20],// габарит здания (для камеры тени)
    sun = {},                           // { azimuth, elevation, intensity, color }
    fog = { color: 0x1e120a, near: 8, far: 46 },
    background = 0x1e120a,
    ambient = {},                       // initLights(): hemiSky, hemiGround, ambColor
    music = null,                       // S.padMusic([...аккорды]) или своя функция
    musicBar = 8,
    stories = {},                       // { id: { title, hint, total } } — для журнала
    switches = {},                      // addLightSwitches(): onClicks
    cull = {},                          // initCull(): seeThrough, roomTest
    onZone = null,                      // (zone) => void при входе в зону
    onKey = null,                       // (e) => void — свои клавиши
    onFrame = null,                     // (dt, t) => void
    hud = null,                         // () => string — текст в правом верхнем углу
  } = o;
  configure(world);

  // ---------- рендер ----------
  const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance', preserveDrawingBuffer: params.has('shot') });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  $('game').appendChild(renderer.domElement);
  const scene = new THREE.Scene(); scene.background = new THREE.Color(background);
  scene.fog = new THREE.Fog(fog.color, fog.near, fog.far);
  const camera = new THREE.PerspectiveCamera(72, 1, 0.08, 2000);
  initPost(renderer, { pixel: UI.store.get(key + '.pixel') !== '0', ao: +(params.get('ao') ?? 1) });
  if (params.has('pixel')) POST.pixel = params.get('pixel') !== '0';
  initLights(scene, ambient);
  const sunLight = initSun(scene, renderer, { ...sun, bounds });
  if (sun.intensity) SUN.intensity = sun.intensity;

  // ---------- мир ----------
  initWorld(scene);
  build();
  setLevel(0);
  const [mb, ma] = optimize(); console.log('слито мешей', mb, '→', ma);
  const sw = addLightSwitches(switches); if (sw.some(s => s[0] === '-')) console.warn('без выключателя:', sw.filter(s => s[0] === '-'));
  buildWindowPatches(W.levels);
  for (const lv of Object.values(W.levels)) applyShadowFlags(lv);
  initCull(cull);
  player.pos.set(...start.pos); player.spawn.copy(player.pos); player.yaw = start.yaw || 0;
  if (params.has('x')) player.pos.set(+params.get('x'), +(params.get('y') || 0), +params.get('z'));
  if (params.has('yaw')) player.yaw = +params.get('yaw');
  if (params.has('pitch')) player.pitch = +params.get('pitch');
  UI.JOURNAL.stories = stories;

  // ---------- настройки (запоминаются) ----------
  UI.bindSetting('vol', key + '.vol', 0.55, v => S.setMusicVolume(v));
  UI.bindSetting('sfx', key + '.sfx', 0.9, v => S.setSfxVolume(v));
  UI.bindSetting('sens', key + '.sens', 1, v => { input.sens = v; });
  UI.bindSetting('pixel', key + '.pixel', POST.pixel, v => setPixel(v, camera));
  UI.bindSetting('ui', key + '.ui', true, v => document.body.classList.toggle('noui', !v));
  UI.bindSetting('shadows', key + '.shadows', !input.TOUCH, v => setShadows(v));
  if (params.has('shadows')) { const v = params.get('shadows') !== '0'; setShadows(v); UI.setChecked('shadows', v); }
  UI.bindSetting('draw', key + '.draw', input.TOUCH ? '0' : '1', v => { CULL.level = +v; CULL.t = 0; });
  if (params.has('draw')) CULL.level = +params.get('draw');

  // ---------- меню, пауза, настольная версия ----------
  const DESKTOP = window.desktop || null; if (DESKTOP) document.body.classList.add('desktop');
  const menuOpen = () => !$('start').classList.contains('hidden');
  const showPause = () => { input.away = false; document.body.classList.remove('freelook'); $('start').classList.remove('hidden'); $('startBtn').textContent = 'Продолжить'; };
  const hideMenu = () => $('start').classList.add('hidden');
  const isFull = () => DESKTOP ? !!DESKTOP.isFullscreen() : !!document.fullscreenElement;
  const updFs = () => { $('fsBtn').textContent = isFull() ? 'В окне' : 'Во весь экран'; };
  const toggleFs = () => { if (DESKTOP) DESKTOP.toggleFullscreen(); else if (document.fullscreenElement) document.exitFullscreen().catch(() => { }); else document.documentElement.requestFullscreen && document.documentElement.requestFullscreen().catch(() => { }); setTimeout(updFs, 300); };
  $('fsBtn').addEventListener('click', toggleFs); document.addEventListener('fullscreenchange', updFs); if (DESKTOP && DESKTOP.onFullscreen) DESKTOP.onFullscreen(updFs); setTimeout(updFs, 500);
  $('quitBtn').addEventListener('click', () => UI.fadeTo(1, 400, () => DESKTOP && DESKTOP.quit()));
  $('journalBtn').addEventListener('click', () => UI.openModal('journal', UI.journalHTML()));
  const afterModal = () => { if (!input.TOUCH && W.state.started) lockPointer(); };
  G.note = (t, x, s) => UI.note(t, x, s, afterModal);
  $('modal').addEventListener('click', e => { if (!e.target.closest('[data-keep]')) UI.closeModal(); });
  function startGame() {
    S.initAudio(); S.setMusicVolume(+$('vol').value); S.setSfxVolume(+$('sfx').value);
    if (music) S.setMusic(music, musicBar);
    if (!W.state.started) { W.state.started = true; W.state.title = false; document.body.classList.add('playing'); UI.fadeTo(1, 10); setTimeout(() => UI.fadeTo(0, 900), 60); $('help').classList.add('show'); setTimeout(() => $('help').classList.remove('show'), 10000); }
    hideMenu(); lockPointer();
  }
  $('startBtn').addEventListener('click', startGame);
  if (DESKTOP) { try { S.initAudio(); if (music) S.setMusic(music, musicBar); } catch (e) { } }

  initInput(renderer.domElement, {
    look: (dx, dy) => look(dx, dy, input.sens),
    onInteract: () => { if (W.state.busy) return; if (player.sitting) standUp(); else doInteract(); },
    onPause: showPause, onResume: hideMenu, menuOpen, hint: t => UI.toast(t, 6000),
    onKey: e => {
      if (W.state.modal) { if (['Escape', 'KeyE', 'Enter', 'KeyJ'].includes(e.code)) UI.closeModal(); return; }
      if (e.code === 'F11') { if (DESKTOP) { e.preventDefault(); toggleFs(); } return; }
      if (e.code === 'KeyE') { if (player.sitting) standUp(); else doInteract(); }
      if (e.code === 'Space' && player.sitting) standUp();
      if (e.code === 'KeyJ') UI.openModal('journal', UI.journalHTML(), afterModal);
      if (e.code === 'KeyM') { const v = S.audio.musicVolume > 0 ? 0 : 0.55; S.setMusicVolume(v); $('vol').value = v; UI.store.set(key + '.vol', v); UI.toast(v ? 'Музыка включена' : 'Музыка выключена'); }
      if (e.code === 'KeyP') { POST.pixel = !POST.pixel; setPixel(POST.pixel, camera); UI.setChecked('pixel', POST.pixel); UI.store.set(key + '.pixel', POST.pixel ? '1' : '0'); }
      if (e.code === 'KeyH') { const v = document.body.classList.toggle('noui'); UI.setChecked('ui', !v); UI.store.set(key + '.ui', v ? '0' : '1'); }
      onKey && onKey(e);
    },
  });
  addEventListener('resize', () => resize(camera));

  // ---------- зоны и звук ----------
  const wallK = s => {
    if (s.zone === undefined) s.zone = zoneAt(s.level, s.pos.x, s.pos.z);
    const z = W.state.zone; if (!s.zone || !z || s.zone === z) return 1;
    return s.zone.doors && roomClosed(s.zone) ? 0.06 : 0.25; // соседняя комната — тише, за закрытой дверью — почти не слышно
  };
  function updateZone() {
    const p = player.pos, z = zoneAt(player.level, p.x, p.z);
    if (z !== W.state.zone) {
      W.state.zone = z;
      if (z) { UI.zoneTitle(z.name); if (S.audio.ready) { S.setRoomReverb(z.reverb); S.setMusicMuffle(z.muffle); } onZone && onZone(z); }
    }
    for (const tr of W.triggers) if (!tr.done && tr.level === player.level && p.x > tr.minX && p.x < tr.maxX && p.z > tr.minZ && p.z < tr.maxZ) { tr.done = tr.once; tr.fn(); }
  }

  // ---------- цикл ----------
  const showAll = params.has('qa');
  let last = performance.now(), t = 0, soundT = 0, fpsN = 0, fpsT = performance.now();
  function frame() {
    const nowT = performance.now(), dt = Math.min(0.1, (nowT - last) / 1000); last = nowT; t += dt; // dt ≤ 0.1: после паузы/вкладки не «прыгаем»
    const st = W.state, canMove = st.started && !st.paused && !st.modal && !st.busy;
    if (st.started || params.has('autostart')) updatePlayer(dt, camera, canMove || params.has('autostart') && !st.modal);
    updateLevels(player.level, showAll);
    if (player.level !== W.lastLevel) { W.lastLevel = player.level; W.shadowDirty = true; }
    updateZone();
    updateCull(dt, camera, player.level, st.zone, showAll);
    updateLights(t, dt, camera, player.level, st.zone);
    for (const f of W.animated) { if (f.__lvl !== undefined && W.levels[f.__lvl] && !W.levels[f.__lvl].visible) continue; f(dt, t); }
    soundT -= dt; if (soundT <= 0) { soundT = 0.2; S.updateSounds(W.sounds, camera.position, player.level, wallK); }
    if (!player.sitting) updateFocus(dt, camera, UI.hint, input.TOUCH ? '' : '[E] ');
    updateSun(dt, !(st.zone && st.zone.noSun));
    onFrame && onFrame(dt, t);
    if (hud) $('hud').textContent = hud();
    render(scene, camera);
    fpsN++; if (nowT - fpsT > 1000) { window.__fps = fpsN * 1000 / (nowT - fpsT); fpsT = nowT; fpsN = 0; }
    requestAnimationFrame(frame);
  }
  resize(camera); warmup(scene, camera);
  if (params.has('autostart')) { W.state.started = true; W.state.paused = false; W.state.title = false; hideMenu(); document.body.classList.add('playing'); }
  $('loading').classList.add('hidden');
  requestAnimationFrame(frame);

  installQA();
  const game = { W, G, S, UI, player, scene, camera, renderer, sun: sunLight, setBlackout, setShadows, findInteract, keys,
    act: re => { const o = findInteract(re, player.pos); if (o) o.userData.interact.action(o); return !!o; } };
  window.__game = game; window.__THREE = THREE;
  return game;
}
