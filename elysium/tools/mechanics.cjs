// ЭЛИЗИУМ · проверка механик образца: дверь, выключатель, рубильник, шторы, сидение, журнал, пасхалка, звук
//   node tools/mechanics.cjs [dist/Файл.html]
const { chromium } = require('playwright');
const path = require('path');
const file = path.resolve(process.argv[2] || path.join(__dirname, '..', 'dist', 'Pavilion.html'));
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
  const pg = await b.newPage({ viewport: { width: 480, height: 300 } });
  const errs = []; pg.on('pageerror', e => errs.push(e.message));
  await pg.goto('file://' + file + '?autostart=1&shadows=0&x=0.5&z=2&yaw=1.5708'); await pg.waitForTimeout(2000);
  const ev = f => pg.evaluate(f);
  const ok = (name, v) => console.log((v ? '✓ ' : '✗ ') + name);
  // дверь: открыть, пройти, закрыть — вещи комнаты прячутся
  await ev(() => window.__game.act(/Открыть: комната/)); await pg.waitForTimeout(1200);
  ok('дверь открывается', await ev(() => window.__game.W.doors[0].open));
  await pg.keyboard.down('KeyW'); await pg.waitForTimeout(1600); await pg.keyboard.up('KeyW'); await pg.waitForTimeout(300);
  ok('прошёл в комнату', await ev(() => window.__game.W.state.zone && window.__game.W.state.zone.name === 'КОМНАТА'));
  await ev(() => { const g = window.__game; g.player.pos.set(1, 0, 2); }); await pg.waitForTimeout(400);
  await ev(() => window.__game.act(/Закрыть: комната/)); await pg.waitForTimeout(1500);
  ok('закрытая комната не рисуется снаружи', await ev(() => { const g = window.__game; let n = 0, v = 0; g.W.levels[0].children.forEach(o => { if (o.userData.cullZ) { n++; if (o.visible) v++; } }); return n > 3 && v === 0; }));
  // выключатель: свет гаснет и включается снова; плафон тускнеет
  const lit = () => ev(() => window.__game.W.anchors.filter(a => a.switchable && a.zone && a.zone.name === 'ЗАЛ').map(a => a.on));
  const before = await lit();
  await ev(() => window.__game.act(/выключить свет/i)); await pg.waitForTimeout(600); const off = await lit();
  await ev(() => window.__game.act(/включить свет/i)); await pg.waitForTimeout(600); const on = await lit();
  ok('выключатель гасит и зажигает лампы зала', before.every(Boolean) && off.every(v => !v) && on.every(Boolean));
  // рубильник
  await ev(() => window.__game.setBlackout(true)); await pg.waitForTimeout(600);
  ok('рубильник: пул источников пуст', await ev(() => window.__game.scene.children.filter(o => o.isPointLight && o.intensity > 0.01 && o.userData.a && o.userData.a.grid).length === 0));
  await ev(() => window.__game.setBlackout(false));
  // пасхалка: пять щелчков подряд
  const toasts0 = await ev(() => document.querySelectorAll('.toast').length);
  for (let i = 0; i < 5; i++) { await ev(() => window.__game.act(/свет$/)); await pg.waitForTimeout(150); }
  ok('пасхалка на 5 щелчков', await ev(() => [...document.querySelectorAll('.toast')].some(t => /Пятый щелчок/.test(t.textContent))));
  // шторы гасят пятно солнца
  await ev(() => { const g = window.__game; g.player.pos.set(-6, 0, -3.5); }); await pg.waitForTimeout(400);
  const vis = () => ev(() => window.__game.W.windowPatches.filter(p => p.mesh.visible).length);
  const p0 = await vis(); await ev(() => window.__game.act(/Задёрнуть шторы/)); await pg.waitForTimeout(400); const p1 = await vis();
  ok(`шторы гасят пятно (${p0} → ${p1})`, p1 === p0 - 1);
  ok('комната темнеет (zone.dark > 0)', await ev(() => window.__game.W.state.zone.dark > 0));
  // сесть и встать
  await ev(() => { const g = window.__game; g.player.pos.set(-6, 0, -0.6); }); await pg.waitForTimeout(300);
  await ev(() => window.__game.act(/Сесть в кресло/)); await pg.waitForTimeout(300);
  ok('сидение', await ev(() => !!window.__game.player.sitting));
  await pg.keyboard.down('KeyW'); await pg.waitForTimeout(900); await pg.keyboard.up('KeyW');
  ok('встал от движения', await ev(() => !window.__game.player.sitting));
  // записка → журнал
  await ev(() => window.__game.act(/Прочитать: Записка на столике/)); await pg.waitForTimeout(300);
  ok('записка открыта и в журнале', await ev(() => window.__game.W.state.modal === 'note' && Object.keys(window.__game.UI.JOURNAL.entries.demo || {}).length === 1));
  await ev(() => window.__game.UI.closeModal());
  // звук: телевизор в комнате, кран в зале — громкость по расстоянию
  await ev(() => window.__game.S.initAudio()); await ev(() => window.__game.act(/Открыть кран/));
  ok('у крана в зале активен звук воды', await ev(() => window.__game.W.sounds.some(s => s.kind === 'water' && s.active)));
  // лестница на сцену
  await ev(() => { const g = window.__game; g.player.pos.set(3.0, 0, -3.8); g.player.yaw = -Math.PI / 2; }); await pg.waitForTimeout(300);
  await pg.keyboard.down('KeyW'); await pg.waitForTimeout(1500); await pg.keyboard.up('KeyW'); await pg.waitForTimeout(300);
  ok('поднялся на сцену по ступеням', await ev(() => window.__game.player.pos.y > 0.55));
  await ev(() => { const g = window.__game; g.player.pos.set(6, 0, -1.4); g.player.yaw = Math.PI; }); await pg.waitForTimeout(300);
  await pg.keyboard.down('KeyW'); await pg.waitForTimeout(1200); await pg.keyboard.up('KeyW'); await pg.waitForTimeout(300);
  ok('сбоку на сцену не запрыгнуть', await ev(() => window.__game.player.pos.y < 0.05 && window.__game.player.pos.z > -2.0));
  console.log(errs.length ? 'ОШИБКИ:\n' + errs.join('\n') : 'ошибок в консоли нет');
  await b.close();
})();
