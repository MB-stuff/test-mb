// ЭЛИЗИУМ · ввод
// Клавиатура, захват мыши (pointer lock), обзор, тач-стик.
// Правила, выстраданные на практике:
//  • пауза — только по Esc; уход на другую вкладку/окно — НЕ пауза: игра ждёт и продолжается сама;
//  • после возвращения камера сразу слушается мыши («свободный взгляд»), захват тихо восстанавливается
//    от первой клавиши или клика (браузер разрешает захват только в ответ на действие человека);
//  • первый mousemove после захвата — скачок к центру окна, его пропускаем;
//  • при уходе все клавиши отпускаются, иначе зажатая W «залипает»;
//  • если захват не работает вовсе (встроенные окна), включается обзор зажатой кнопкой мыши.
import { W } from './world.js';

export const keys = {};
export const touch = { move: null, look: null, mx: 0, my: 0 };
export const input = { sens: 1, lockFailed: false, away: false, TOUCH: matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window };
let canvas = null, H = {}, lockedAt = 0, wasLocked = false, quietLock = false, awayT = 0;
const S = W.state;

// handlers: { look(dx,dy), onKey(e), onInteract(), onPause(), onResume(), hint(text) }
export function initInput(cv, handlers) {
  canvas = cv; H = handlers;
  addEventListener('keydown', e => {
    if (e.repeat) return;
    keys[e.code] = true;
    if (S.modal || e.code === 'F11') { H.onKey && H.onKey(e); return; } // F11 работает и в меню
    if (!S.started) return;
    if (e.code === 'Escape' && input.lockFailed) { S.paused = true; H.onPause && H.onPause(); return; }
    if (input.away && e.code !== 'Escape') relockQuiet();
    H.onKey && H.onKey(e);
  });
  addEventListener('keyup', e => { keys[e.code] = false; });
  let downAt = null;
  canvas.addEventListener('mouseup', e => { if (input.lockFailed && downAt && Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) < 6 && !S.modal) H.onInteract && H.onInteract(); downAt = null; });
  canvas.addEventListener('mousedown', e => {
    if (!S.started || S.modal) return;
    if (document.pointerLockElement !== canvas && !input.TOUCH && !input.lockFailed) { lockPointer(); return; }
    if (e.button === 0) { downAt = [e.clientX, e.clientY]; if (!input.lockFailed) H.onInteract && H.onInteract(); }
  });
  addEventListener('mousemove', e => {
    const locked = document.pointerLockElement === canvas, fresh = locked && !wasLocked; wasLocked = locked;
    if (locked) { if (!fresh && performance.now() - lockedAt > 150 && Math.abs(e.movementX) < 400 && Math.abs(e.movementY) < 400) H.look(e.movementX, e.movementY); }
    else if (input.lockFailed && e.buttons && !S.modal) H.look(e.movementX, e.movementY);
    else if (input.away && !S.modal && !S.paused && Math.abs(e.movementX) < 300) H.look(e.movementX, e.movementY);
  });
  document.addEventListener('pointerlockerror', onLockFail);
  document.addEventListener('pointerlockchange', () => {
    if (document.pointerLockElement === canvas) {
      input.away = false; S.paused = false; document.body.classList.remove('freelook'); lockedAt = performance.now();
      H.onResume && H.onResume(); return;
    }
    if (!S.started || S.modal || input.TOUCH) return;
    // браузеры присылают события в разном порядке: решаем, когда фокус уже известен
    clearTimeout(awayT);
    awayT = setTimeout(() => {
      if (document.pointerLockElement === canvas || S.modal) return;
      if (input.away || isAway()) { goAway(); comeBack(); return; }
      S.paused = true; H.onPause && H.onPause();
    }, 150);
  });
  addEventListener('blur', goAway);
  document.addEventListener('visibilitychange', () => { if (document.hidden) goAway(); else setTimeout(comeBack, 50); });
  addEventListener('focus', () => setTimeout(comeBack, 50));
  if (input.TOUCH) initTouch();
}
const isAway = () => document.hidden || !document.hasFocus();
function goAway() {
  for (const k in keys) keys[k] = false;
  if (!S.started || input.TOUCH || input.lockFailed || S.paused && !input.away && H.menuOpen && H.menuOpen()) return;
  input.away = true; S.paused = true;
}
function comeBack() {
  if (!input.away || !S.started || input.TOUCH || isAway()) return;
  if (H.menuOpen && H.menuOpen()) { input.away = false; return; }
  S.paused = !!S.modal; document.body.classList.add('freelook');
}
function relockQuiet() {
  if (document.pointerLockElement === canvas || input.lockFailed || input.TOUCH) return;
  quietLock = true; lockedAt = performance.now();
  try { const r = canvas.requestPointerLock(); if (r && r.catch) r.catch(() => { }); } catch (e) { }
  setTimeout(() => { quietLock = false; }, 600);
}
export function lockPointer() {
  if (input.TOUCH) { S.paused = false; return; }
  if (input.lockFailed) { S.paused = false; H.onResume && H.onResume(); return; }
  lockedAt = performance.now();
  try { const r = canvas.requestPointerLock(); if (r && r.catch) r.catch(onLockFail); } catch (e) { onLockFail(); }
  setTimeout(() => { if (document.pointerLockElement !== canvas && !S.modal && S.started && S.paused && !input.away) onLockFail(); }, 700);
}
export function unlockPointer() { if (document.pointerLockElement) document.exitPointerLock(); }
function onLockFail() {
  if (quietLock) { quietLock = false; return; }
  if (input.lockFailed) return; input.lockFailed = true;
  S.paused = false; H.onResume && H.onResume();
  H.hint && H.hint('Курсор не захватывается: зажми кнопку мыши и веди, чтобы осматриваться.');
}

// тач: левая половина экрана — стик ходьбы, правая — обзор, короткий тап — действие
function initTouch() {
  document.body.classList.add('touch');
  canvas.addEventListener('touchstart', e => {
    for (const t of e.changedTouches) {
      if (t.clientX < innerWidth * 0.45 && !touch.move) touch.move = { id: t.identifier, x: t.clientX, y: t.clientY };
      else if (!touch.look) touch.look = { id: t.identifier, x: t.clientX, y: t.clientY, sx: t.clientX, sy: t.clientY, t: performance.now() };
    }
    e.preventDefault();
  }, { passive: false });
  canvas.addEventListener('touchmove', e => {
    for (const t of e.changedTouches) {
      if (touch.move && t.identifier === touch.move.id) { touch.mx = Math.max(-1, Math.min(1, (t.clientX - touch.move.x) / 50)); touch.my = Math.max(-1, Math.min(1, (t.clientY - touch.move.y) / 50)); }
      if (touch.look && t.identifier === touch.look.id) { H.look((t.clientX - touch.look.x) * 1.6, (t.clientY - touch.look.y) * 1.6); touch.look.x = t.clientX; touch.look.y = t.clientY; }
    }
    e.preventDefault();
  }, { passive: false });
  canvas.addEventListener('touchend', e => {
    for (const t of e.changedTouches) {
      if (touch.move && t.identifier === touch.move.id) { touch.move = null; touch.mx = touch.my = 0; }
      if (touch.look && t.identifier === touch.look.id) { if (performance.now() - touch.look.t < 250 && Math.hypot(t.clientX - touch.look.sx, t.clientY - touch.look.sy) < 12) H.onInteract && H.onInteract(); touch.look = null; }
    }
  });
}
