// ЭЛИЗИУМ · сборка игры в один офлайн-файл
//   node build.mjs            — собрать src/demo
//   node build.mjs <папка>    — собрать src/<папка> (там main.js и game.json)
//   DEV=1 node build.mjs …    — без минификации (читаемые ошибки в консоли)
// Результат: dist/<out>.html — открывается двойным кликом, работает без сети.
import { build } from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';

const root = path.dirname(new URL(import.meta.url).pathname);
const name = process.argv[2] || 'demo';
const dir = path.join(root, 'src', name);
const meta = JSON.parse(fs.readFileSync(path.join(dir, 'game.json'), 'utf8'));
const res = await build({
  entryPoints: [path.join(dir, 'main.js')], bundle: true, format: 'iife', minify: !process.env.DEV, write: false,
  target: 'es2020', loader: { '.json': 'json' }, legalComments: 'none',
});
const js = res.outputFiles[0].text;
const tpl = fs.existsSync(path.join(dir, 'template.html')) ? path.join(dir, 'template.html') : path.join(root, 'src', 'template.html');
let html = fs.readFileSync(tpl, 'utf8');
html = html.replaceAll('<!--TITLE-->', meta.title).replace('<!--SUBTITLE-->', meta.subtitle || '').replace('<!--ABOUT-->', meta.about || '');
html = html.replace('<!--SCRIPT-->', () => `<script>${js.replace(/<\/script/gi, '<\\/script')}</script>`);
fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
const out = path.join(root, 'dist', (meta.out || name) + '.html');
fs.writeFileSync(out, html);
console.log(path.relative(root, out), (html.length / 1024 / 1024).toFixed(2), 'MB');
