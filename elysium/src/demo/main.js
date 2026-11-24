// ЭЛИЗИУМ · образец
// Маленький павильон, на котором видны все механики набора: комната с дверью и шторами, зал со сценой
// и лестницей, окна на солнечную и теневую сторону, лампы с выключателями, записки в журнал,
// телевизор и кран со звуком по радиусу, пасхалка «пять щелчков выключателем».
// Новый проект начинается с копии этой папки: game.json (название) + main.js (мир).
import * as THREE from 'three';
import { createGame } from '../core/game.js';
import { W, G, CFG, Y, wall, floorRect, ceilRect, block, stairs, zone, trigger, col, texMat, plane } from '../core/world.js';
import { Door } from '../core/door.js';
import * as PR from '../core/props.js';
import * as TX from '../core/textures.js';
import * as S from '../core/audio.js';

const P = Math.PI;

createGame({
  key: 'elysium-demo',
  world: { FH: 4, T: 0.3, CEIL: 3.7 },
  start: { pos: [5, 0, 3], yaw: P / 2 },
  bounds: [-9, -1, -7, 9, 5, 7],
  sun: { azimuth: 1.17, elevation: 0.384, intensity: 13 }, // солнце низко на западо-юго-западе
  music: S.padMusic([[53, 57, 60, 64], [52, 55, 59, 62], [50, 53, 57, 60], [55, 58, 62, 65]]),
  stories: { demo: { title: 'Павильон', hint: 'Записки лежат в комнате и в зале.', total: 2 } },
  // пасхалка: пять быстрых щелчков выключателем в зале
  switches: { onClicks: (zn, n) => { if (zn.name !== 'ЗАЛ' || n < 5) return false; S.sfxSecret(); G.toast('Пятый щелчок. Где-то под сценой что-то ответило тем же.'); return true; } },
  cull: { roomTest: z => !!z.room, seeThrough: () => false },
  build,
});

function build() {
  const { T, FH, CEIL } = CFG, y = Y();
  // ---------- материалы ----------
  const ext = texMat('ext', TX.plaster('#a8725a'), 0xffffff, {}, 3);
  const roomW = texMat('roomW', TX.wallpaper('#3a4a32', '#445a3a'), 0xffffff, {}, 1.2);
  const hallW = texMat('hallW', TX.wallpaper('#4a2420', '#5e3026'), 0xffffff, {}, 1.2);
  const woodF = texMat('woodF', TX.wood('#5a3420'), 0xffffff, {}, 1.5);
  const tileF = texMat('tileF', TX.tiles('#5a1a22', '#2a1012', '#140808', 2), 0xffffff, {}, 1.6);
  const ceilM = texMat('ceil', TX.plaster('#4a3a30'), 0xffffff, {}, 2);

  // ---------- коробка павильона: x −8..8, z −6..6; комната x < −1, зал x > −1 ----------
  // стены вдоль Z идут на всю длину (с запасом T/2 на углы), стены вдоль X — между их внутренними гранями:
  // так на углах нет совпадающих торцов
  const win = (at, o = {}) => ({ at, w: 1.6, type: 'window', sill: 0.8, h: 1.9, light: 0.25, ...o });
  wall('z', -8, -6 - T / 2, 6 + T / 2, y, FH, { neg: ext, pos: roomW }, [win(-3.5), win(2.5)], { inside: 1 });  // запад: на солнце
  wall('z', 8, -6 - T / 2, 6 + T / 2, y, FH, { neg: hallW, pos: ext }, [win(2)], { inside: -1 });                 // восток: тень
  wall('x', -6, -8 + T / 2, -1, y, FH, { neg: ext, pos: roomW }, [win(-5)], { inside: 1 });                               // юг
  wall('x', -6, -1, 8 - T / 2, y, FH, { neg: ext, pos: hallW }, [win(1.5), win(6.2, { sill: 1.3, h: 1.5 })], { inside: 1 });
  wall('x', 6, -8 + T / 2, -1, y, FH, { neg: roomW, pos: ext }, [win(-4.5)], { inside: -1 });                             // север: солнца нет
  wall('x', 6, -1, 8 - T / 2, y, FH, { neg: hallW, pos: ext }, [win(3)], { inside: -1 });
  wall('z', -1, -6, 6, y, FH, { neg: roomW, pos: hallW }, [{ at: 2, w: 1, type: 'door' }]);                        // перегородка с дверью
  new Door('z', -1, 2, { name: 'комната', swing: 1, hinge: 1 });
  PR.sign('КОМНАТА\nROOM · CHAMBRE', -1 + T / 2 + 0.004, y + 2.7, 2, P / 2, { w: 0.9, h: 0.3, sub: true });

  floorRect(-8, -6, -1, 6, y, woodF, 'wood');
  floorRect(-1, -6, 8, 6, y, tileF, 'tile');
  ceilRect(-8, -6, 8, 6, y + CEIL, ceilM);

  // ---------- снаружи: малиновая пустыня и жёлтое небо (только чтобы было что видеть в окнах) ----------
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshLambertMaterial({ color: 0x8a2a30, fog: false }));
  ground.rotation.x = -P / 2; ground.position.y = -0.05; W.scene.add(ground);
  const sky = new THREE.Mesh(new THREE.SphereGeometry(300, 24, 12), new THREE.MeshBasicMaterial({ map: TX.skyTex(), side: THREE.BackSide, fog: false, depthWrite: false }));
  sky.renderOrder = -10; W.scene.add(sky);

  // ---------- комната ----------
  PR.curtains('z', -8 + T / 2, -3.5 - 0.8, -3.5 + 0.8, y, 1, 0x7a2030); // c — внутренняя грань стены
  PR.curtains('z', -8 + T / 2, 2.5 - 0.8, 2.5 + 0.8, y, 1, 0x7a2030);
  PR.armchair(-6.9, -0.6, P / 2, 0x5a2a2a);
  const t = PR.table(-5.7, -0.6, { w: 0.8, round: true, h: 0.6 });
  PR.tableLamp(...PR.top(t, 0.2, -0.15), { shade: 0x2a5a3a });
  PR.note(...PR.top(t, -0.1, 0.12), 0.3, 'Записка на столике', 'Если ты это читаешь, значит, павильон построился.\nСтены, дверь, окна, шторы — всё на месте.\n\nЗадёрни шторы: солнечное пятно на полу погаснет.', { story: 'demo' });
  PR.ceilingLamp(-4.5, 0, { kind: 'pendant', intensity: 2.8, distance: 7 });
  const tvT = PR.table(-2.4, 5.2, { w: 1.0, d: 0.6, h: 0.5 }); // не под окном: телевизор закрыл бы стекло
  PR.tv(...PR.top(tvT), P, { on: true });
  PR.shelf(-6.8, 6 - T / 2 - 0.22, P, { w: 1.6, h: 2.2 });
  const cv = document.createElement('canvas'); cv.width = 240; cv.height = 180; const g = cv.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 0, 180); gr.addColorStop(0, '#ffd070'); gr.addColorStop(0.6, '#ff7a3a'); gr.addColorStop(0.61, '#5a1018'); gr.addColorStop(1, '#2a0810');
  g.fillStyle = gr; g.fillRect(0, 0, 240, 180); g.fillStyle = '#ff5a1a'; g.beginPath(); g.arc(150, 80, 14, 0, 7); g.fill();
  PR.picture(cv, -1 - T / 2 - 0.004, y + 1.7, -3, -P / 2, 0.9, { title: 'Полдень', text: 'Солнце над пустыней. Оно здесь не садится.' });
  zone(-8, -6, -1, 6, 'КОМНАТА', { room: true, reverb: 0.12, amb: 1.1, muffle: 2400 });
  trigger(-8, -6, -1, 6, () => G.subtitle('Здесь тихо. Слышно только, как шипит телевизор.'));

  // ---------- зал ----------
  block(4.5, y, -6 + T / 2, 8 - T / 2, y + 0.6, -2, texMat('stage', TX.wood('#4a2a14'), 0xffffff, {}, 1.5));      // сцена (коллайдер: сбоку не залезть)
  W.surfaces.push({ minX: 4.5, maxX: 8 - T / 2, minZ: -6 + T / 2, maxZ: -2, y: () => y + 0.6, sound: 'wood' });
  stairs(3.5, -4.6, 4.5, -3.0, y, y + 0.6, '+x', texMat('steps', TX.wood('#3a2214'), 0xffffff, {}, 1));          // на сцену — по ступеням
  PR.sign('ЭЛИЗИУМ', 8 - T / 2 - 0.004, y + 2.6, -4, -P / 2, { w: 2.2, h: 0.5, bg: '#1a0610', fg: '#ff7aa8', glowing: true });
  PR.note(6.2, y + 0.6, -3.0, 0.4, 'Программа вечера', 'На сцене никого.\nЗал всё равно аплодирует — эхом.\n\nВыключатель у двери в комнату помнит, сколько раз на него нажали.', { story: 'demo' });
  for (let r = 0; r < 2; r++) for (let c = 0; c < 3; c++) PR.chair(1.2 + r * 1.1, -4.6 + c * 0.9, P / 2, { color: 0x3a1a10, seatColor: 0x6a1a24 });
  PR.ceilingLamp(1.5, 0, { intensity: 3.2, distance: 8 });
  PR.ceilingLamp(5.5, 2.5, { intensity: 3.2, distance: 8 });
  PR.ceilingLamp(6.2, -4, { kind: 'tube', color: 0xe8f0d0, intensity: 2, distance: 6, flicker: 0.4 });
  PR.sconce(-1 + T / 2, y + 2.0, -4.5, P / 2);
  PR.sink(6.5, 6 - T / 2 - 0.25, P);
  PR.plant(7.2, 5.2); PR.plant(0.2, -5.1); // от стены не ближе 0.6 м: листья торчат во все стороны
  PR.floorLamp(0, 5.3);
  PR.rug(2, 1.5, 3, 2.4, TX.carpet('#4a0f18', '#a07a3a'));
  PR.curtains('x', -6 + T / 2, 1.5 - 0.8, 1.5 + 0.8, y, 1, 0x4a0a14);
  zone(-1, -6, 8, 6, 'ЗАЛ', { reverb: 0.5, amb: 1.3 });
}
