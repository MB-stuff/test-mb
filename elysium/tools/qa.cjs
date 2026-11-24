// ЭЛИЗИУМ · проверка сборки в браузере (Playwright + программный WebGL)
//   node tools/qa.cjs [dist/Файл.html]
// Печатает ошибки консоли, результаты __qa(), __qaCoplanar(), __qaGaps() и пробует ключевые действия.
const { chromium } = require('playwright');
const path = require('path');
const file = path.resolve(process.argv[2] || path.join(__dirname, '..', 'dist', 'Pavilion.html'));
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const pg = await b.newPage({ viewport: { width: 480, height: 300 } });
  const errs = []; pg.on('pageerror', e => errs.push('ОШИБКА: ' + e.message)); pg.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 300)); });
  await pg.goto('file://' + file + '?autostart=1&qa=1'); await pg.waitForTimeout(2500);
  const r = await pg.evaluate(() => ({ qa: __qa(), cop: __qaCoplanar(20), gaps: __qaGaps(1, 60).length }));
  console.log(`__qa: ${r.qa.length} проблем`); r.qa.forEach(s => console.log('  ' + s));
  console.log(`__qaCoplanar: ${r.cop.length} групп`); r.cop.forEach(s => console.log('  ' + s));
  console.log(`__qaGaps (1–60 мм): ${r.gaps}`);
  console.log(errs.length ? errs.join('\n') : 'ошибок в консоли нет');
  await b.close();
})();
