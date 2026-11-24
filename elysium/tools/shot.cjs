// ЭЛИЗИУМ · скриншоты из заданных точек
//   node tools/shot.cjs dist/Файл.html '[{"n":"имя","p":{"x":0,"y":0,"z":0,"yaw":0,"pitch":0}}]' [папка]
const { chromium } = require('playwright');
const path = require('path');
const file = path.resolve(process.argv[2]), views = JSON.parse(process.argv[3]), out = process.argv[4] || path.join(__dirname, '..', 'dist', 'shots');
require('fs').mkdirSync(out, { recursive: true });
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const pg = await b.newPage({ viewport: { width: 960, height: 600 } });
  pg.on('pageerror', e => console.log('ОШИБКА', e.message));
  for (const v of views) {
    await pg.goto('file://' + file + '?' + new URLSearchParams({ autostart: 1, shot: 1, ...v.p })); await pg.waitForTimeout(v.wait || 2500);
    if (v.act) { await pg.evaluate(re => window.__game.act(new RegExp(re)), v.act); await pg.waitForTimeout(1500); }
    await pg.screenshot({ path: path.join(out, v.n + '.png') });
    console.log(v.n, JSON.stringify(await pg.evaluate(() => ({ fps: Math.round(window.__fps || 0), zone: window.__game.W.state.zone && window.__game.W.state.zone.name, hint: document.getElementById('hint').textContent }))));
  }
  await b.close();
})();
