// Кладёт собранную игру в app/index.html — её открывает окно.
// Какой файл брать: поле "gameHtml" в package.json (путь от папки desktop), по умолчанию ../dist/<productName>.html
const fs = require('fs');
const path = require('path');
const pkg = require('../package.json');
const src = path.resolve(__dirname, '..', pkg.gameHtml || path.join('..', 'dist', pkg.productName + '.html'));
const dst = path.join(__dirname, '..', 'app', 'index.html');
if (!fs.existsSync(src)) { console.error('Нет файла ' + src + '. Сначала соберите игру: npm run build в корне Элизиума.'); process.exit(1); }
fs.mkdirSync(path.dirname(dst), { recursive: true });
fs.copyFileSync(src, dst);
console.log('игра скопирована:', dst, (fs.statSync(dst).size / 1048576).toFixed(2) + ' МБ');
