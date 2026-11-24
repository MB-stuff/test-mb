// Сборка в один офлайн-файл dist/Hotel.html: код + все картинки внутри.
import { build } from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';

const root = path.dirname(new URL(import.meta.url).pathname);
const res = await build({
  entryPoints: [path.join(root, 'src/main.js')],
  bundle: true, format: 'iife', minify: !process.env.DEV, write: false, target: 'es2020',
  loader: { '.json': 'json' }, legalComments: 'none',
});
const js = res.outputFiles[0].text;
const images = JSON.parse(fs.readFileSync(path.join(root, 'src/images.json'), 'utf8'));
const map = {};
for (const im of images) map[im.id] = 'data:image/jpeg;base64,' + fs.readFileSync(path.join(root, 'assets/img', im.id + '.jpg')).toString('base64');
let html = fs.readFileSync(path.join(root, 'src/template.html'), 'utf8');
html = html.replace('<!--IMAGES-->', () => `<script>window.__IMG=${JSON.stringify(map)}</script>`);
html = html.replace('<!--SCRIPT-->', () => `<script>${js.replace(/<\/script/gi, '<\\/script')}</script>`);
fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
fs.writeFileSync(path.join(root, 'dist/Hotel.html'), html);
console.log('dist/Hotel.html', (html.length / 1024 / 1024).toFixed(2), 'MB');
