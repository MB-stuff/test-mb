"""Строит план музея (по мотивам присланной схемы) и пишет museum/map.js.
Клетка = 1 «метр». Всё, что не вырезано, — стена.

Зоны пола (символ в сетке):
  .  лобби          r  ротонда
  a  Канамори, зал I   b  Канамори, зал II   c  коридор Канамори
  k  Кара, зал I       l  Кара, зал II       n  коридор Кары
  w  туалет            j  подсобка уборщика  x  тайник
Особые клетки:  D  дверь   X  секретная дверь (выглядит как стена)
Запуск: python3 tools/build_map.py  (рисует ещё debug_map.png рядом, если есть PIL)
"""
import json, math, os

W, H = 60, 50
g = [['#'] * W for _ in range(H)]


def rect(x0, y0, x1, y1, z):
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            g[y][x] = z


# --- ротонда (центр) ---
CX, CY, R = 30.0, 23.0, 7.6
for y in range(H):
    for x in range(W):
        if math.hypot(x + 0.5 - CX, y + 0.5 - CY) <= R:
            g[y][x] = 'r'

# --- лобби (вход, юг) ---
rect(23, 34, 37, 43, '.')
rect(29, 30, 31, 33, '.')          # проход лобби -> ротонда

# --- крыло Канамори (запад и север, «зелёное») ---
rect(6, 17, 18, 29, 'a')           # зал I
rect(19, 22, 23, 24, 'c')          # коридор ротонда -> зал I
rect(10, 7, 12, 16, 'c')           # коридор на север
rect(10, 7, 21, 9, 'c')
rect(22, 3, 38, 11, 'b')           # зал II
rect(29, 12, 31, 15, 'c')          # ротонда -> зал II

# --- крыло Кары (восток и юго-восток, «красное») ---
rect(42, 17, 54, 29, 'k')          # зал I
rect(37, 22, 41, 24, 'n')          # ротонда -> зал I
rect(47, 30, 49, 34, 'n')          # зал I -> зал II
rect(41, 35, 55, 45, 'l')          # зал II
rect(38, 38, 40, 40, 'n')          # лобби <-> зал II

# --- служебные ---
rect(14, 36, 20, 42, 'w')          # туалет
g[39][21] = 'w'
g[39][22] = 'D'                    # дверь туалета (лобби x=23)
rect(46, 10, 52, 15, 'j')          # подсобка уборщика
g[16][49] = 'D'                    # дверь подсобки (зал I y=17)
rect(1, 21, 3, 26, 'x')            # тайник за стеной зала I Канамори
g[23][4] = 'x'
g[23][5] = 'X'                     # секретная дверь

# стойки туалетных кабинок — пара стенок
for y in (36, 37):
    g[y][16] = '#'
    g[y][18] = '#'

grid = [''.join(r) for r in g]

# --- картины: (x, y стены, сторона, id). Сторона — куда смотрит лицо картины.
# N: лицо смотрит на север (картина на южной стене зала) и т.д.
P = []
def pic(x, y, side, pid):
    P.append({'x': x, 'y': y, 'side': side, 'id': pid})

# Лобби: две главные работы по бокам от прохода в ротонду
pic(26, 33, 'S', 'k10')
pic(34, 33, 'S', 's04')
# Канамори, зал I (x 6..18, y 17..29)
pic(5, 19, 'E', 's01')
pic(5, 27, 'E', 's02')
pic(8, 30, 'N', 's03')
pic(15, 30, 'N', 's05')
pic(16, 16, 'S', 's06')
# Канамори, зал II (x 22..38, y 3..11)
pic(25, 2, 'S', 's07')
pic(30, 2, 'S', 's08')
pic(35, 2, 'S', 's09')
pic(39, 7, 'W', 's10')
# Кара, зал I (x 42..54, y 17..29)
pic(55, 19, 'W', 'k01')
pic(55, 23, 'W', 'k02')
pic(55, 27, 'W', 'k03')
pic(45, 30, 'N', 'k04')
pic(52, 30, 'N', 'k05')
# Кара, зал II (x 41..55, y 35..45)
pic(44, 46, 'N', 'k06')
pic(48, 46, 'N', 'k07')
pic(52, 46, 'N', 'k08')
pic(56, 40, 'W', 'k09')
# Мемы
pic(13, 39, 'E', 'm05')   # туалет, у входа
pic(17, 43, 'N', 'm04')   # туалет, у раковин
pic(53, 12, 'W', 'm01')   # подсобка
pic(49, 9, 'S', 'm02')    # подсобка
pic(0, 23, 'E', 'm03')    # тайник

# --- спрайты-декорации: (тип, x, y) в мировых координатах
S = []
def sp(t, x, y):
    S.append({'t': t, 'x': x, 'y': y})

sp('fountain', CX, CY)
for i in range(8):
    a = i * math.pi / 4 + math.pi / 8
    sp('column', CX + math.cos(a) * 5.2, CY + math.sin(a) * 5.2)
for a in (0, math.pi / 2, math.pi, 3 * math.pi / 2):
    sp('plant', CX + math.cos(a + math.pi / 4) * 6.6, CY + math.sin(a + math.pi / 4) * 6.6)
# лобби
sp('desk', 25.5, 41.0); sp('monitor', 25.0, 40.6); sp('plant', 23.6, 43.4); sp('plant', 37.4, 43.4)
sp('bench', 30.0, 38.5); sp('bench', 33.5, 38.5); sp('cooler', 37.3, 35.0); sp('sign', 28.2, 36.0)
sp('flowerbed', 30.5, 42.6); sp('rope', 26.0, 34.6); sp('rope', 34.0, 34.6)
sp('trash', 23.4, 37.0)
# Канамори I
sp('smallfountain', 12.5, 23.5); sp('bench', 12.5, 20.6); sp('bench', 12.5, 26.4)
sp('plant', 6.5, 17.5); sp('plant', 18.5, 29.5); sp('plant', 6.5, 29.5); sp('donation', 18.2, 21.2)
sp('flowerbed', 9.0, 23.5); sp('flowerbed', 16.0, 23.5)
# коридор Канамори
sp('plant', 10.5, 7.5); sp('cooler', 21.4, 9.4)
# Канамори II
sp('bench', 27.5, 7.5); sp('bench', 33.5, 7.5); sp('flowerbed', 30.5, 7.5); sp('plant', 22.5, 3.5); sp('plant', 38.5, 11.4)
sp('plant', 22.5, 11.4); sp('crt', 37.6, 3.6)
# Кара I
sp('smallfountain', 48.5, 23.5); sp('bench', 45.0, 23.5); sp('benchshark', 52.0, 23.5)
sp('plant', 42.5, 17.5); sp('plant', 54.5, 29.5); sp('plant', 42.5, 29.5)
sp('flowerbed', 48.5, 19.5); sp('flowerbed', 48.5, 27.5)
# Кара II
sp('bench', 48.5, 40.5); sp('plant', 41.5, 35.5); sp('plant', 55.5, 35.5); sp('plant', 41.5, 45.5)
sp('crt', 55.4, 45.4); sp('flowerbed', 44.5, 40.5); sp('flowerbed', 52.5, 40.5); sp('trash', 41.4, 41.6)
# скульптуры и вазы
for (x, y) in [(6.6, 21.6), (18.4, 25.6), (22.6, 7.5), (38.4, 3.6), (54.4, 23.5), (42.6, 25.6), (55.4, 37.5), (41.6, 38.5)]:
    sp('bust', x, y)
for (x, y) in [(23.5, 26.5), (36.5, 26.5), (23.5, 19.5), (36.5, 19.5), (18.5, 17.5), (42.5, 21.5), (30.5, 11.4), (55.5, 42.5)]:
    sp('vase', x, y)
# туалет
sp('toilet', 15.0, 36.4); sp('toilet', 17.0, 36.4); sp('toilet', 19.0, 36.4)
sp('sink', 15.0, 42.6); sp('sink', 16.6, 42.6); sp('trash', 20.5, 42.5); sp('wetfloor', 18.0, 39.5)
# подсобка
sp('bucket', 48.0, 13.5); sp('shelf', 46.4, 10.6); sp('shelf', 46.4, 12.0); sp('trash', 52.4, 15.4); sp('boxes', 51.6, 10.6)
sp('boxes', 52.4, 11.5); sp('wetfloor', 50.2, 14.4)
# тайник
sp('crt', 2.0, 21.6); sp('chair', 2.0, 22.6); sp('boxes', 2.4, 26.4)

# названия зон
ZONES = {
    '.': {'name': 'Вестибюль', 'music': 'lobby', 'floor': 'checker', 'wall': 'plaster', 'step': 'hard'},
    'r': {'name': 'Ротонда «Фонтан ожидания»', 'music': 'lobby', 'floor': 'marble', 'wall': 'marble', 'step': 'hard'},
    'a': {'name': 'Крыло Канамори · Зал I «Сделка»', 'music': 'sayaka', 'floor': 'parquet', 'wall': 'mint', 'step': 'wood'},
    'b': {'name': 'Крыло Канамори · Зал II «Бухгалтерия чувств»', 'music': 'sayaka', 'floor': 'parquet', 'wall': 'mint', 'step': 'wood'},
    'c': {'name': 'Галерея Канамори', 'music': 'sayaka', 'floor': 'parquet', 'wall': 'mint', 'step': 'wood'},
    'k': {'name': 'Крыло Экланд · Зал I «Ночная смена»', 'music': 'kara', 'floor': 'carpet', 'wall': 'rose', 'step': 'soft'},
    'l': {'name': 'Крыло Экланд · Зал II «Не выходя из комнаты»', 'music': 'kara', 'floor': 'carpet', 'wall': 'rose', 'step': 'soft'},
    'n': {'name': 'Галерея Экланд', 'music': 'kara', 'floor': 'carpet', 'wall': 'rose', 'step': 'soft'},
    'w': {'name': 'Туалет (служебный)', 'music': 'service', 'floor': 'tiles', 'wall': 'tiles', 'step': 'hard'},
    'j': {'name': 'Подсобка уборщика', 'music': 'service', 'floor': 'concrete', 'wall': 'block', 'step': 'hard'},
    'x': {'name': '???', 'music': 'service', 'floor': 'oldcarpet', 'wall': 'wallpaper', 'step': 'soft'},
}

out = os.path.join(os.path.dirname(__file__), '..', 'museum', 'map.js')
with open(out, 'w', encoding='utf-8') as f:
    f.write('// Сгенерировано tools/build_map.py — правь там, а не здесь.\n')
    f.write('window.MUSEUM_MAP = ' + json.dumps({
        'w': W, 'h': H, 'grid': grid, 'start': {'x': 30.5, 'y': 42.0, 'a': -math.pi / 2},
        'paintings': P, 'sprites': S, 'zones': ZONES,
    }, ensure_ascii=False, indent=0) + ';\n')

# проверки
for p in P:
    assert grid[p['y']][p['x']] == '#', ('картина не на стене', p)
    dx, dy = {'N': (0, -1), 'S': (0, 1), 'E': (1, 0), 'W': (-1, 0)}[p['side']]
    fz = grid[p['y'] + dy][p['x'] + dx]
    assert fz not in '#DX', ('перед картиной стена', p, fz)
for s in S:
    c = grid[int(s['y'])][int(s['x'])]
    assert c not in '#', ('спрайт в стене', s)
print('ok', len(P), 'картин', len(S), 'спрайтов')
print('\n'.join(grid))

try:
    from PIL import Image, ImageDraw
    col = {'#': (40, 40, 40), '.': (220, 220, 220), 'r': (240, 230, 200), 'a': (150, 220, 160), 'b': (120, 200, 140),
           'c': (180, 230, 190), 'k': (230, 140, 150), 'l': (210, 110, 130), 'n': (240, 180, 190), 'w': (170, 200, 240),
           'j': (160, 160, 160), 'x': (230, 220, 120), 'D': (140, 90, 40), 'X': (255, 0, 255)}
    sc = 12
    im = Image.new('RGB', (W * sc, H * sc))
    d = ImageDraw.Draw(im)
    for y in range(H):
        for x in range(W):
            d.rectangle([x * sc, y * sc, x * sc + sc - 1, y * sc + sc - 1], fill=col[grid[y][x]])
    for p in P:
        d.rectangle([p['x'] * sc + 2, p['y'] * sc + 2, p['x'] * sc + sc - 3, p['y'] * sc + sc - 3], fill=(255, 200, 0))
        d.text((p['x'] * sc, p['y'] * sc - 1), p['id'][0] + p['id'][2], fill=(0, 0, 0))
    for s in S:
        d.ellipse([s['x'] * sc - 3, s['y'] * sc - 3, s['x'] * sc + 3, s['y'] * sc + 3], fill=(0, 90, 255))
    im.save(os.path.join(os.path.dirname(__file__), 'debug_map.png'))
except ImportError:
    pass
