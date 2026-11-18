"""Строит план музея (по мотивам присланной схемы) и пишет museum/map.js.
Клетка = 2 метра. Всё, что не вырезано, — стена.

Зоны пола (символ в сетке):
  .  вестибюль      r  ротонда (открытое небо)    e  зал ожидания (открытое небо)
  a  Канамори, зал I   b  Канамори, зал II   c  галерея Канамори
  k  Экланд, зал I     l  Экланд, зал II     n  галерея Экланд
  w  туалет            j  подсобка уборщика  x  тайник
Особые клетки:  D  дверь   X  секретная дверь (выглядит как стена)

Пропы (объёмные коробки) — prop(тип, x, y, куда_смотрит_лицо). Размеры см. в museum/js/props.js.
Запуск: python3 tools/build_map.py  (рисует ещё tools/debug_map.png)
"""
import json, math, os

W, H = 60, 50
g = [['#'] * W for _ in range(H)]


def rect(x0, y0, x1, y1, z):
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            g[y][x] = z


# --- ротонда (центр) ---
CX, CY, RR = 30.0, 23.0, 7.6
for y in range(H):
    for x in range(W):
        if math.hypot(x + 0.5 - CX, y + 0.5 - CY) <= RR:
            g[y][x] = 'r'

# --- вестибюль (вход, юг) ---
rect(23, 34, 37, 43, '.')
rect(29, 30, 31, 33, '.')

# --- крыло Канамори (запад и север) ---
rect(6, 17, 18, 29, 'a')
rect(19, 22, 23, 24, 'c')
rect(10, 7, 12, 16, 'c')
rect(10, 7, 21, 9, 'c')
rect(22, 3, 38, 11, 'b')
rect(29, 12, 31, 15, 'c')

# --- крыло Экланд (восток и юго-восток) ---
rect(42, 17, 54, 29, 'k')
rect(37, 22, 41, 24, 'n')
rect(47, 30, 49, 34, 'n')
rect(41, 35, 55, 45, 'l')
rect(38, 38, 40, 40, 'n')

# --- зал ожидания (северо-восток, вход из Канамори II) ---
rect(42, 2, 56, 7, 'e')
rect(39, 4, 41, 5, 'e')

# --- служебные ---
rect(14, 36, 20, 42, 'w')
g[39][21] = 'w'
g[39][22] = 'D'
rect(46, 10, 52, 15, 'j')
g[16][49] = 'D'
rect(1, 21, 3, 26, 'x')
g[23][4] = 'x'
g[23][5] = 'X'

grid = [''.join(r) for r in g]

# ------------------------------------------------------------------ картины
P = []
def pic(x, y, side, pid): P.append({'x': x, 'y': y, 'side': side, 'id': pid})
pic(26, 33, 'S', 'k10'); pic(34, 33, 'S', 's04')
pic(5, 19, 'E', 's01'); pic(5, 27, 'E', 's02'); pic(8, 30, 'N', 's03'); pic(15, 30, 'N', 's05'); pic(16, 16, 'S', 's06')
pic(25, 2, 'S', 's07'); pic(30, 2, 'S', 's08'); pic(35, 2, 'S', 's09'); pic(39, 8, 'W', 's10')
pic(55, 19, 'W', 'k01'); pic(55, 23, 'W', 'k02'); pic(55, 27, 'W', 'k03'); pic(45, 30, 'N', 'k04'); pic(52, 30, 'N', 'k05')
pic(44, 46, 'N', 'k06'); pic(48, 46, 'N', 'k07'); pic(52, 46, 'N', 'k08'); pic(56, 40, 'W', 'k09')
pic(13, 39, 'E', 'm05'); pic(18, 43, 'N', 'm04'); pic(53, 12, 'W', 'm01'); pic(49, 9, 'S', 'm02'); pic(0, 23, 'E', 'm03')

# ------------------------------------------------------------------ декали на стенах
D = []
def dec(x, y, side, kind): D.append({'x': x, 'y': y, 'side': side, 'kind': kind})
# вестибюль
dec(22, 41, 'E', 'extinguisher'); dec(22, 36, 'E', 'poster_touch'); dec(24, 33, 'S', 'clock'); dec(36, 33, 'S', 'poster_quiet')
dec(38, 36, 'W', 'exitsign'); dec(22, 38, 'E', 'exitsign')
# Канамори
dec(14, 16, 'S', 'clock'); dec(19, 20, 'W', 'extinguisher'); dec(10, 30, 'N', 'poster_quiet'); dec(19, 27, 'W', 'vent')
dec(21, 4, 'E', 'poster_touch'); dec(39, 10, 'W', 'extinguisher'); dec(28, 2, 'S', 'clock'); dec(11, 6, 'S', 'vent')
# Экланд
dec(46, 16, 'S', 'clock'); dec(48, 16, 'S', 'extinguisher'); dec(41, 19, 'E', 'poster_quiet')
dec(52, 34, 'S', 'clock'); dec(56, 43, 'W', 'poster_touch'); dec(40, 36, 'E', 'extinguisher')
# зал ожидания
dec(49, 1, 'S', 'tvwall'); dec(52, 1, 'S', 'queue'); dec(45, 1, 'S', 'clock'); dec(47, 8, 'N', 'poster_quiet'); dec(57, 6, 'W', 'extinguisher')
# туалет
dec(15, 43, 'N', 'mirror'); dec(16, 43, 'N', 'mirror'); dec(21, 37, 'W', 'urinal'); dec(21, 38, 'W', 'urinal')
dec(21, 41, 'W', 'dryer'); dec(21, 42, 'W', 'paper'); dec(17, 35, 'S', 'vent')
# подсобка
dec(45, 14, 'E', 'panel'); dec(47, 9, 'S', 'vent')

# ------------------------------------------------------------------ объёмные пропы
PR = []
FOOT = {'vending': (.46, .4), 'snack': (.46, .4), 'desk': (.75, .34), 'deskpc': (.75, .34), 'reception': (1.6, .36), 'bench': (.76, .22),
        'chairs': (1.0, .25), 'planter': (.9, .32), 'pedestal_bust': (.26, .26), 'pedestal_vase': (.26, .26), 'toilet': (.18, .27),
        'sinks': (1.0, .28), 'lockers': (.9, .26), 'shelf': (.6, .2), 'cardboard': (.3, .3), 'tvstand': (.5, .26),
        'fountain': (2.2, 2.2), 'smallfountain': (.9, .9), 'enablock': (.4, .4)}
def prop(t, x, y, f='S'): PR.append({'t': t, 'x': round(x, 3), 'y': round(y, 3), 'f': f})
def wall_prop(t, wall_side, along, wall_coord, gap=0.0):
    """Ставит проп вплотную к стене. wall_side — где стена относительно пропа (N/S/E/W)."""
    d = FOOT[t][1] / 2 + gap
    if wall_side == 'N': prop(t, along, wall_coord + d, 'S')
    if wall_side == 'S': prop(t, along, wall_coord - d, 'N')
    if wall_side == 'W': prop(t, wall_coord + d, along, 'E')
    if wall_side == 'E': prop(t, wall_coord - d, along, 'W')

BX = []
def box(x0, y0, x1, y1, z0, z1, tex, top=None): BX.append({'x0': x0, 'y0': y0, 'x1': x1, 'y1': y1, 'z0': z0, 'z1': z1, 'tex': tex, 'top': top or tex})

S = []
def sp(t, x, y, **kw): S.append(dict(t=t, x=round(x, 3), y=round(y, 3), **kw))
FL = []
def floater(t, x, y, z, h): FL.append({'t': t, 'x': x, 'y': y, 'z': z, 'h': h})

# ротонда: фонтан, скамейки вокруг лицом к воде, колонны, клумбы, парящие фигуры
prop('fountain', CX, CY)
prop('bench', CX, CY - 2.5, 'S'); prop('bench', CX, CY + 2.5, 'N'); prop('bench', CX - 2.5, CY, 'E'); prop('bench', CX + 2.5, CY, 'W')
for i in range(8):
    a = i * math.pi / 4 + math.pi / 8
    sp('column', CX + math.cos(a) * 5.2, CY + math.sin(a) * 5.2)
for a in (math.pi / 4, 3 * math.pi / 4, 5 * math.pi / 4, 7 * math.pi / 4):
    x, y = CX + math.cos(a) * 6.3, CY + math.sin(a) * 6.3
    prop('planter', x, y, 'S')
floater('fcube', CX, CY, 1.75, .38); floater('fpyr', CX - 2.6, CY - 1.6, 1.35, .32); floater('focta', CX + 2.7, CY + 1.9, 1.5, .32)
floater('fball', CX + 1.9, CY - 2.3, 1.2, .26); floater('fcube', CX - 2.0, CY + 2.6, 1.1, .2); floater('fball', CX - 4.0, CY + 0.5, 1.6, .2)

# вестибюль
prop('reception', 35.6, 36.8, 'W')                   # стойка, мониторы смотрят на администратора
sp('chair', 36.6, 36.4); sp('chair', 36.6, 37.2)
prop('bench', 26.0, 36.8, 'N'); prop('bench', 34.0, 36.8, 'N')
sp('rope', 26.0, 34.55); sp('rope', 34.0, 34.55)
wall_prop('planter', 'S', 26.0, 44.0); wall_prop('planter', 'S', 34.4, 44.0)
sp('plant', 23.5, 43.5); sp('plant', 37.5, 43.5); sp('plant', 23.5, 34.5)
sp('sign', 28.0, 41.0); sp('cooler', 23.28, 37.0); sp('trash', 27.0, 37.0); sp('trash', 33.0, 37.0)

# Канамори I: фонтанчик, скамейки лицом к картинам, бюсты у подозрительной стены
prop('smallfountain', 12.5, 23.5)
prop('bench', 8.1, 19.5, 'W'); prop('bench', 15.5, 27.7, 'S')
wall_prop('planter', 'S', 11.6, 30.0)
prop('pedestal_bust', 6.45, 21.7); prop('pedestal_bust', 6.45, 25.3)
prop('pedestal_vase', 18.5, 17.5)
sp('plant', 6.5, 17.5); sp('plant', 18.5, 29.5); sp('plant', 6.5, 29.5); sp('donation', 18.4, 21.2)
# галерея Канамори: автоматы у стены коридора
wall_prop('vending', 'W', 12.0, 10.0); wall_prop('snack', 'W', 12.5, 10.0); sp('trash', 10.22, 13.1)
sp('plant', 10.5, 7.5); sp('plant', 21.5, 7.5)
# Канамори II
prop('bench', 25.5, 5.0, 'N'); prop('bench', 30.5, 5.0, 'N'); prop('bench', 35.5, 5.0, 'N'); prop('bench', 37.2, 8.5, 'W')
prop('planter', 30.5, 8.6, 'S')
wall_prop('deskpc', 'S', 24.5, 12.0); sp('chair', 24.5, 11.25)
prop('pedestal_bust', 38.6, 3.4); prop('pedestal_vase', 22.4, 3.4)
sp('plant', 38.5, 11.5); sp('plant', 22.5, 11.5)

# Экланд I
prop('smallfountain', 48.5, 23.5)
prop('bench', 52.4, 21.5, 'E'); prop('bench', 52.4, 25.5, 'E')
sp('shark', 52.4, 21.55, z=0.22)
wall_prop('planter', 'N', 44.5, 17.0); wall_prop('planter', 'N', 53.0, 17.0)
prop('pedestal_bust', 42.6, 26.3); prop('pedestal_vase', 42.6, 20.5)
sp('plant', 42.5, 17.5); sp('plant', 54.5, 29.5); sp('plant', 42.5, 29.5); sp('plant', 54.5, 17.5)
# Экланд II: «уголок геймера», автоматы у стены
wall_prop('deskpc', 'N', 43.5, 35.0); sp('chair', 43.5, 35.85); sp('shark', 44.3, 35.75, z=0)
wall_prop('vending', 'W', 42.6, 41.0); wall_prop('snack', 'W', 43.1, 41.0); sp('trash', 41.2, 43.7)
prop('bench', 46.5, 43.2, 'S'); prop('bench', 50.5, 43.2, 'S')
prop('planter', 48.5, 40.0, 'S')
prop('pedestal_bust', 55.4, 37.4)
sp('plant', 55.5, 35.5); sp('plant', 41.5, 45.5); sp('plant', 55.5, 45.5)

# зал ожидания (ENA-местами): ряды кресел лицом к телевизору, автоматы, табло
for x in (45.6, 46.65, 51.4, 52.45):
    prop('chairs', x, 4.4, 'N'); prop('chairs', x, 5.8, 'N')
wall_prop('vending', 'E', 2.8, 57.0); wall_prop('snack', 'E', 3.3, 57.0)
wall_prop('tvstand', 'N', 49.0, 2.0)
prop('enablock', 43.0, 6.9); prop('enablock', 43.6, 7.4); prop('enablock', 55.6, 7.4)
sp('plant', 42.5, 2.5); sp('cooler', 56.72, 7.3); sp('trash', 48.9, 7.6)
floater('focta', 45.0, 3.3, 1.15, .26); floater('fball', 49.5, 6.4, 1.3, .22); floater('fpyr', 54.0, 5.2, 1.05, .26); floater('fcube', 47.8, 7.0, 1.4, .2)

# туалет: кабинки у северной стены, раковины под зеркалами
for i, x0 in enumerate((14.0, 14.85, 15.7)):
    x1 = x0 + 0.85
    prop('toilet', (x0 + x1) / 2, 36.14, 'S')
    box(x1 - 0.02, 36.0, x1 + 0.02, 36.95, 0.04, 0.95, 'stall')                    # перегородка справа
    box(x0 + 0.02, 36.93, x0 + 0.2, 36.97, 0.04, 0.95, 'stall')                     # передняя панель
    box(x1 - 0.06, 36.5, x1 - 0.02, 36.93, 0.04, 0.95, 'stalldoor')                 # распахнутая дверца
wall_prop('sinks', 'S', 16.0, 43.0)
sp('trash', 17.4, 42.75); sp('wetfloor', 18.6, 39.6)
# подсобка
wall_prop('lockers', 'W', 11.0, 46.0); wall_prop('shelf', 'W', 12.4, 46.0); wall_prop('shelf', 'W', 13.1, 46.0)
prop('cardboard', 52.55, 10.45); prop('cardboard', 51.95, 10.4)
sp('bucket', 48.0, 14.0); sp('wetfloor', 50.6, 14.6); sp('trash', 52.6, 15.6)
# тайник
wall_prop('deskpc', 'N', 2.0, 21.0); sp('chair', 2.0, 21.85); prop('cardboard', 2.6, 26.6)

LABELS = [['КАНАМОРИ I', 12.5, 23.0], ['КАНАМОРИ II', 30.5, 7.0], ['ЭКЛАНД I', 48.5, 20.5], ['ЭКЛАНД II', 48.5, 38.5],
          ['РОТОНДА', 30, 18.5], ['ВЕСТИБЮЛЬ', 30.5, 40], ['WC', 17.5, 40.5], ['ПОДСОБКА', 49.5, 13], ['ЗАЛ ОЖИДАНИЯ', 49.5, 6.5]]

ZONES = {
    '.': {'name': 'Вестибюль', 'music': 'lobby', 'floor': 'checker', 'wall': 'plaster', 'step': 'hard'},
    'r': {'name': 'Ротонда «Фонтан ожидания»', 'music': 'lobby', 'floor': 'marble', 'wall': 'marble', 'step': 'hard', 'sky': True},
    'a': {'name': 'Крыло Канамори · Зал I «Сделка»', 'music': 'sayaka', 'floor': 'parquet', 'wall': 'mint', 'step': 'wood'},
    'b': {'name': 'Крыло Канамори · Зал II «Бухгалтерия чувств»', 'music': 'sayaka', 'floor': 'parquet', 'wall': 'mint', 'step': 'wood'},
    'c': {'name': 'Галерея Канамори', 'music': 'sayaka', 'floor': 'parquet', 'wall': 'mint', 'step': 'wood'},
    'k': {'name': 'Крыло Экланд · Зал I «Ночная смена»', 'music': 'kara', 'floor': 'carpet', 'wall': 'rose', 'step': 'soft'},
    'l': {'name': 'Крыло Экланд · Зал II «Не выходя из комнаты»', 'music': 'kara', 'floor': 'carpet', 'wall': 'rose', 'step': 'soft'},
    'n': {'name': 'Галерея Экланд', 'music': 'kara', 'floor': 'carpet', 'wall': 'rose', 'step': 'soft'},
    'e': {'name': 'Зал ожидания', 'music': 'dream', 'floor': 'enafloor', 'wall': 'ena', 'step': 'hard', 'sky': True},
    'w': {'name': 'Туалет (служебный)', 'music': 'service', 'floor': 'tiles', 'wall': 'tiles', 'step': 'hard'},
    'j': {'name': 'Подсобка уборщика', 'music': 'service', 'floor': 'concrete', 'wall': 'block', 'step': 'hard'},
    'x': {'name': '???', 'music': 'service', 'floor': 'oldcarpet', 'wall': 'wallpaper', 'step': 'soft'},
}

out = os.path.join(os.path.dirname(__file__), '..', 'museum', 'map.js')
with open(out, 'w', encoding='utf-8') as f:
    f.write('// Сгенерировано tools/build_map.py — правь там, а не здесь.\n')
    f.write('window.MUSEUM_MAP = ' + json.dumps({
        'w': W, 'h': H, 'grid': grid, 'start': {'x': 30.5, 'y': 42.3, 'a': -math.pi / 2},
        'paintings': P, 'decals': D, 'props': PR, 'boxes': BX, 'sprites': S, 'floaters': FL, 'labels': LABELS, 'zones': ZONES,
        'entrance': [{'x': x, 'y': 44, 'side': 'N'} for x in (29, 30, 31)],
        'extraLamps': [[17, 39, True], [15, 41, False], [49, 12, False], [2, 23, True]],
    }, ensure_ascii=False, indent=0) + ';\n')

# ------------------------------------------------------------------ проверки
def floor_at(x, y): return grid[int(y)][int(x)] not in '#'
OFF = {'N': (0, -1), 'S': (0, 1), 'E': (1, 0), 'W': (-1, 0)}
for p in P + D:
    assert grid[p['y']][p['x']] == '#', ('не на стене', p)
    dx, dy = OFF[p['side']]
    assert grid[p['y'] + dy][p['x'] + dx] not in '#DX', ('перед декалью/картиной стена', p)
keys = {}
for p in P + D:
    k = (p['x'], p['y'], p['side']); assert k not in keys, ('две вещи на одной грани', p, keys[k]); keys[k] = p
footprints = []
for p in PR:
    w, d = FOOT[p['t']]
    if p['f'] in 'EW': w, d = d, w
    x0, x1, y0, y1 = p['x'] - w / 2, p['x'] + w / 2, p['y'] - d / 2, p['y'] + d / 2
    for (cx, cy) in [(x0 + 1e-3, y0 + 1e-3), (x1 - 1e-3, y0 + 1e-3), (x0 + 1e-3, y1 - 1e-3), (x1 - 1e-3, y1 - 1e-3)]:
        assert floor_at(cx, cy), ('проп в стене', p)
    footprints.append((x0, y0, x1, y1, p['t']))
for b in BX:
    footprints.append((b['x0'], b['y0'], b['x1'], b['y1'], 'box'))
for s in S + FL:
    assert floor_at(s['x'], s['y']), ('спрайт в стене', s)
print('ok', len(P), 'картин', len(D), 'декалей', len(PR), 'пропов', len(BX), 'панелей', len(S), 'спрайтов')

try:
    from PIL import Image, ImageDraw
    col = {'#': (40, 40, 40), '.': (220, 220, 220), 'r': (190, 225, 245), 'a': (150, 220, 160), 'b': (120, 200, 140),
           'c': (180, 230, 190), 'k': (230, 140, 150), 'l': (210, 110, 130), 'n': (240, 180, 190), 'w': (170, 200, 240),
           'j': (160, 160, 160), 'x': (230, 220, 120), 'e': (240, 200, 60), 'D': (140, 90, 40), 'X': (255, 0, 255)}
    sc = 14
    im = Image.new('RGB', (W * sc, H * sc))
    dr = ImageDraw.Draw(im)
    for y in range(H):
        for x in range(W):
            dr.rectangle([x * sc, y * sc, x * sc + sc - 1, y * sc + sc - 1], fill=col[grid[y][x]])
    for p in P:
        dr.rectangle([p['x'] * sc + 3, p['y'] * sc + 3, p['x'] * sc + sc - 4, p['y'] * sc + sc - 4], fill=(255, 200, 0))
    for p in D:
        dr.rectangle([p['x'] * sc + 5, p['y'] * sc + 5, p['x'] * sc + sc - 6, p['y'] * sc + sc - 6], fill=(0, 220, 220))
    for (x0, y0, x1, y1, t) in footprints:
        dr.rectangle([x0 * sc, y0 * sc, x1 * sc, y1 * sc], fill=(120, 60, 160), outline=(0, 0, 0))
    for s in S:
        dr.ellipse([s['x'] * sc - 2, s['y'] * sc - 2, s['x'] * sc + 2, s['y'] * sc + 2], fill=(0, 90, 255))
    for s in FL:
        dr.ellipse([s['x'] * sc - 3, s['y'] * sc - 3, s['x'] * sc + 3, s['y'] * sc + 3], fill=(255, 0, 180))
    im.save(os.path.join(os.path.dirname(__file__), 'debug_map.png'))
except ImportError:
    pass
