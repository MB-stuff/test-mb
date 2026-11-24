# Элизиум

Кодекс и набор механик для бродилок от первого лица на three.js, собранный из проекта Grand Simulacre.

- **[ЭЛИЗИУМ.md](ЭЛИЗИУМ.md)** — кодекс: принципы, устройство каждой механики, рабочие числа, журнал граблей, чек-лист.
- **`src/core/`** — модули: мир, двери, игрок, свет, солнце, отсечение, звук, ввод, интерфейс, автопроверки.
- **`src/demo/`** — образец «Павильон»: все механики в одном маленьком здании. Новый проект начинается с копии этой папки.
- **`tools/`** — проверки в браузере: `qa.cjs` (расстановка, мерцание, щели), `mechanics.cjs` (механики образца), `shot.cjs` (скриншоты).
- **`desktop/`** — шаблон Electron для exe под Windows.

## Быстрый старт

```bash
npm install
```

```bash
node build.mjs
```

Откройте `dist/Pavilion.html`. Своя игра:

```bash
cp -r src/demo src/mygame
```

Поменяйте `src/mygame/game.json` и функцию `build()` в `src/mygame/main.js`, затем:

```bash
node build.mjs mygame
```

```bash
node tools/qa.cjs dist/<out из game.json>.html
```

Для проверок нужен Playwright с Chromium.
