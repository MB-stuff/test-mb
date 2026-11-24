// ЭЛИЗИУМ · интерфейс
// Подсказка действия, всплывающие сообщения, субтитры, записки на бумаге, затемнение, журнал, настройки.
// Разметка и стили — в template.html. Настройки сохраняются в localStorage (с защитой от запрета хранилища).
import { W, G } from './world.js';

const $ = id => document.getElementById(id);
export const store = {
  get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch (e) { } },
};
export const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
export const nl = s => esc(s).replace(/\n/g, '<br>');

let hintSticky = 0;
export function hint(t, focused = false, sticky = false) {
  if (!sticky && performance.now() < hintSticky) return;
  if (sticky) hintSticky = performance.now() + 2500;
  const h = $('hint'); h.textContent = t; h.classList.toggle('show', !!t);
  $('cross').classList.toggle('active', focused);
}
export function toast(msg, ms = 3800) {
  const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg; $('toasts').appendChild(t);
  setTimeout(() => t.classList.add('out'), ms); setTimeout(() => t.remove(), ms + 600);
}
let subT = 0;
export function subtitle(msg) { const s = $('subtitle'); s.textContent = msg; s.classList.add('show'); clearTimeout(subT); subT = setTimeout(() => s.classList.remove('show'), 5500); }
export function fadeTo(v, ms, cb) { const f = $('fade'); f.style.transition = `opacity ${ms}ms`; f.style.opacity = v; setTimeout(() => cb && cb(), ms + 30); }
export function zoneTitle(name) { const el = $('zone'); el.textContent = name; el.classList.remove('show'); void el.offsetWidth; el.classList.add('show'); }

// модальные окна: записка, картина, журнал. closeHook — что сделать после закрытия (вернуть захват мыши)
let closeHook = null;
export function openModal(kind, html, onClose = null) {
  W.state.modal = kind; $('modalBody').innerHTML = html; $('modal').className = 'show ' + kind; hint('');
  closeHook = onClose; if (document.pointerLockElement) document.exitPointerLock();
}
export function closeModal() { W.state.modal = null; $('modal').className = ''; const f = closeHook; closeHook = null; f && f(); }

// журнал находок: истории собираются из записок (story → { title: text })
export const JOURNAL = { stories: {}, entries: {} };
export function remember(story, title, text) {
  if (!story) return;
  const j = JOURNAL.entries[story] = JOURNAL.entries[story] || {};
  if (!j[title]) { j[title] = text; const st = JOURNAL.stories[story]; if (st) setTimeout(() => toast(`Журнал: «${st.title}» ${Object.keys(j).length}/${st.total || '?'}`), 400); }
}
export function note(title, text, story = null, onClose) {
  openModal('note', `<div class="paper"><h3>${esc(title)}</h3><p>${nl(text)}</p><small>E / клик — закрыть</small></div>`, onClose);
  remember(story, title, text);
}
export function journalHTML() {
  return '<div class="journal"><h2>Журнал</h2>' + Object.entries(JOURNAL.stories).map(([id, s]) => {
    const j = JOURNAL.entries[id] || {}, n = Object.keys(j).length;
    return `<section><h4>${esc(s.title)} <span>${n}/${s.total || '?'}</span></h4>${n ? '<ul>' + Object.keys(j).map(t => `<li>${esc(t)}</li>`).join('') + '</ul>' : `<p class="dim">Пока ничего. ${esc(s.hint || '')}</p>`}</section>`;
  }).join('') + '<small>J / клик — закрыть</small></div>';
}

// привязка элемента настроек к хранилищу: тип определяется по элементу (range / checkbox / select)
export function bindSetting(id, key, def, apply) {
  const el = $(id); if (!el) return def;
  let v = store.get(key); v = v === null ? def : (el.type === 'checkbox' ? v === '1' : el.type === 'range' ? +v : v);
  if (el.type === 'checkbox') el.checked = v; else el.value = v;
  apply(v);
  el.addEventListener(el.tagName === 'SELECT' || el.type === 'checkbox' ? 'change' : 'input', () => {
    const nv = el.type === 'checkbox' ? el.checked : el.type === 'range' ? +el.value : el.value;
    store.set(key, el.type === 'checkbox' ? (nv ? '1' : '0') : String(nv)); apply(nv);
  });
  return v;
}
export function setChecked(id, v) { const el = $(id); if (el) el.checked = v; }

// крючки для предметов
G.toast = toast; G.subtitle = subtitle; G.note = note; G.hint = hint;
