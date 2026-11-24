// Кладёт собранную игру (../hotel/dist/Hotel.html) в app/index.html — её и открывает окно.
const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, '..', '..', 'hotel', 'dist', 'Hotel.html');
const dst = path.join(__dirname, '..', 'app', 'index.html');
if (!fs.existsSync(src)) {
  console.error('Нет файла ' + src + '. Сначала соберите игру: cd hotel && npm install && npm run build');
  process.exit(1);
}
fs.mkdirSync(path.dirname(dst), { recursive: true });
fs.copyFileSync(src, dst);
console.log('игра скопирована:', dst, (fs.statSync(dst).size / 1048576).toFixed(2) + ' МБ');
