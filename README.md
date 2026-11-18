# Музей.exe

Бродилка-галерея в духе старых PC-игр (рейкастер как в Wolfenstein/Doom), работает прямо в браузере.

* `museum/` — сама игра. Открыть `museum/index.html` через любой локальный сервер
  (например `cd museum && python3 -m http.server`, потом http://localhost:8000).
* `museum/art/` — картины (ужатые копии из `Art.zip`), подписи — в `museum/js/data.js`.
* `museum/music/` — музыка, сгенерирована скриптом `tools/make_music.py`.
* `tools/build_map.py` — план здания: залы, картины, декорации. После правок запустить его — он перепишет `museum/map.js`.

Управление: WASD + мышь, Shift — быстрее, E — смотреть/двери/простучать стену, M — карта, Esc — пауза.
