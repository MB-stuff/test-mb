"""Строит оба этажа музея и пишет museum/map.js (window.MUSEUM_LEVELS).
Клетка = 2 метра. Всё, что не вырезано, — стена.
Пропы — prop(тип, x, y, куда_смотрит_лицо); размеры в museum/js/props.js.
Картины в новых залах развешиваются автоматически (hang): ровные участки стен, не у дверей и не за мебелью.
Запуск: python3 tools/build_map.py  (рисует ещё tools/debug_map_1.png и debug_map_2.png)
"""
import json, math, os

HERE = os.path.dirname(__file__)
OFF = {'N': (0, -1), 'S': (0, 1), 'E': (1, 0), 'W': (-1, 0)}
FOOT = {'vending': (.46, .4), 'snack': (.46, .4), 'desk': (.75, .34), 'deskpc': (.75, .34), 'reception': (1.6, .36), 'bench': (.76, .22),
        'chairs': (1.0, .25), 'planter': (.9, .32), 'pedestal_bust': (.26, .26), 'pedestal_vase': (.26, .26), 'toilet': (.18, .27),
        'sinks': (1.0, .28), 'lockers': (.9, .26), 'shelf': (.6, .2), 'cardboard': (.3, .3), 'tvstand': (.5, .26),
        'fountain': (2.2, 2.2), 'smallfountain': (.9, .9), 'enablock': (.4, .4), 'bookshelf': (.9, .22), 'filecab': (.3, .34),
        'rack': (.4, .5), 'tank': (1.6, .6), 'lounger': (.24, .76)}


class Level:
    def __init__(self, w, h, name):
        self.W, self.H, self.name = w, h, name
        self.g = [['#'] * w for _ in range(h)]
        self.P, self.D, self.PR, self.BX, self.S, self.FL = [], [], [], [], [], []
        self.zones, self.labels, self.extra_lamps, self.entrance = {}, [], [], []

    # --- геометрия
    def rect(self, x0, y0, x1, y1, z):
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                self.g[y][x] = z

    def circle(self, cx, cy, r, z):
        for y in range(self.H):
            for x in range(self.W):
                if math.hypot(x + 0.5 - cx, y + 0.5 - cy) <= r:
                    self.g[y][x] = z

    def at(self, x, y):
        return '#' if x < 0 or y < 0 or x >= self.W or y >= self.H else self.g[y][x]

    # --- наполнение
    def pic(self, x, y, side, pid): self.P.append({'x': x, 'y': y, 'side': side, 'id': pid})
    def dec(self, x, y, side, kind): self.D.append({'x': x, 'y': y, 'side': side, 'kind': kind})
    def prop(self, t, x, y, f='S'): self.PR.append({'t': t, 'x': round(x, 3), 'y': round(y, 3), 'f': f})
    def sp(self, t, x, y, **kw): self.S.append(dict(t=t, x=round(x, 3), y=round(y, 3), **kw))
    def floater(self, t, x, y, z, h): self.FL.append({'t': t, 'x': x, 'y': y, 'z': z, 'h': h})
    def box(self, x0, y0, x1, y1, z0, z1, tex, top=None): self.BX.append({'x0': x0, 'y0': y0, 'x1': x1, 'y1': y1, 'z0': z0, 'z1': z1, 'tex': tex, 'top': top or tex})

    def wall_prop(self, t, wall_side, along, wall_coord, gap=0.0):
        d = FOOT[t][1] / 2 + gap
        if wall_side == 'N': self.prop(t, along, wall_coord + d, 'S')
        if wall_side == 'S': self.prop(t, along, wall_coord - d, 'N')
        if wall_side == 'W': self.prop(t, wall_coord + d, along, 'E')
        if wall_side == 'E': self.prop(t, wall_coord - d, along, 'W')

    def footprints(self):
        out = []
        for p in self.PR:
            w, d = FOOT[p['t']]
            if p['f'] in 'EW': w, d = d, w
            out.append((p['x'] - w / 2, p['y'] - d / 2, p['x'] + w / 2, p['y'] + d / 2))
        for b in self.BX: out.append((b['x0'], b['y0'], b['x1'], b['y1']))
        for s in self.S:
            r = {'plant': .25, 'cooler': .15, 'palm': .25, 'fern': .2, 'bucket': .2, 'sign': .2, 'column': .22}.get(s['t'], 0)
            if r: out.append((s['x'] - r, s['y'] - r, s['x'] + r, s['y'] + r))
        return out

    def used_faces(self):
        return {(p['x'], p['y'], p['side']) for p in self.P + self.D} | {(e['x'], e['y'], e['side']) for e in self.entrance}

    def hang(self, zone_chars, ids, spacing=2, depth=0.7):
        """Развешивает ids по свободным ровным участкам стен залов zone_chars, равномерно."""
        used, fps = self.used_faces(), self.footprints()
        cands = []
        for y in range(self.H):
            for x in range(self.W):
                if self.g[y][x] != '#': continue
                for side, (dx, dy) in OFF.items():
                    fx, fy = x + dx, y + dy
                    fz = self.at(fx, fy)
                    if fz not in zone_chars or (x, y, side) in used: continue
                    # ровная стена: соседи вдоль стены — тоже стены с тем же залом перед ними
                    ax, ay = (1, 0) if side in 'NS' else (0, 1)
                    ok = sum(self.at(x + s * ax, y + s * ay) == '#' for s in (-1, 1)) >= 1 and all(self.at(fx + s * ax, fy + s * ay) not in 'DX' for s in (-1, 1))
                    if not ok: continue
                    # не возле дверей
                    if any(self.at(fx + i, fy + j) in 'DX' for i in (-1, 0, 1) for j in (-1, 0, 1)): continue
                    # перед картиной ничего не стоит
                    if side == 'S': zr = (fx, fy, fx + 1, fy + depth)
                    elif side == 'N': zr = (fx, fy + 1 - depth, fx + 1, fy + 1)
                    elif side == 'E': zr = (fx, fy, fx + depth, fy + 1)
                    else: zr = (fx + 1 - depth, fy, fx + 1, fy + 1)
                    if any(a < zr[2] and c > zr[0] and b < zr[3] and d > zr[1] for (a, b, c, d) in fps): continue
                    # не рядом с другой вещью на той же стене
                    if any(s2 == side and ((side in 'NS' and y2 == y and abs(x2 - x) < spacing) or (side in 'EW' and x2 == x and abs(y2 - y) < spacing)) for (x2, y2, s2) in used): continue
                    cands.append((x, y, side))
        # обход по периметру: сортируем по углу вокруг центра зала
        cx = sum(c[0] for c in cands) / max(1, len(cands)); cy = sum(c[1] for c in cands) / max(1, len(cands))
        cands.sort(key=lambda c: (math.atan2(c[1] - cy, c[0] - cx), c[0], c[1]))
        acc = []
        for c in cands:
            if any(s2 == c[2] and ((c[2] in 'NS' and y2 == c[1] and abs(x2 - c[0]) < spacing) or (c[2] in 'EW' and x2 == c[0] and abs(y2 - c[1]) < spacing)) for (x2, y2, s2) in acc): continue
            acc.append(c)
        assert len(acc) >= len(ids), f'в залах {zone_chars} места на {len(acc)} картин, а нужно {len(ids)}'
        step = len(acc) / len(ids)
        for i, pid in enumerate(ids):
            x, y, side = acc[int(i * step)]
            self.pic(x, y, side, pid)

    # --- проверка и вывод
    def check(self):
        grid = [''.join(r) for r in self.g]
        def floor_at(x, y): return grid[int(y)][int(x)] not in '#'
        for p in self.P + self.D:
            assert grid[p['y']][p['x']] == '#', ('не на стене', self.name, p)
            dx, dy = OFF[p['side']]
            assert grid[p['y'] + dy][p['x'] + dx] not in '#DX', ('перед вещью стена', self.name, p)
        seen = {}
        for p in self.P + self.D:
            k = (p['x'], p['y'], p['side']); assert k not in seen, ('две вещи на одной грани', p, seen[k]); seen[k] = p
        for p in self.PR:
            w, d = FOOT[p['t']]
            if p['f'] in 'EW': w, d = d, w
            for (cx, cy) in [(p['x'] - w / 2 + 1e-3, p['y'] - d / 2 + 1e-3), (p['x'] + w / 2 - 1e-3, p['y'] - d / 2 + 1e-3), (p['x'] - w / 2 + 1e-3, p['y'] + d / 2 - 1e-3), (p['x'] + w / 2 - 1e-3, p['y'] + d / 2 - 1e-3)]:
                assert floor_at(cx, cy), ('проп в стене', self.name, p)
        for s in self.S + self.FL:
            assert floor_at(s['x'], s['y']), ('спрайт в стене', self.name, s)
        for c in {ch for row in grid for ch in row} - set('#DX'):
            assert c in self.zones, ('нет описания зоны', self.name, c)
        return grid

    def export(self, extra):
        grid = self.check()
        d = {'name': self.name, 'w': self.W, 'h': self.H, 'grid': grid, 'paintings': self.P, 'decals': self.D, 'props': self.PR,
             'boxes': self.BX, 'sprites': self.S, 'floaters': self.FL, 'labels': self.labels, 'zones': self.zones,
             'entrance': self.entrance, 'extraLamps': self.extra_lamps}
        d.update(extra)
        return d

    def debug_png(self, path):
        try:
            from PIL import Image, ImageDraw
        except ImportError:
            return
        sc = 14
        im = Image.new('RGB', (self.W * sc, self.H * sc)); dr = ImageDraw.Draw(im)
        for y in range(self.H):
            for x in range(self.W):
                c = self.g[y][x]
                col = (40, 40, 40) if c == '#' else (140, 90, 40) if c == 'D' else (255, 0, 255) if c == 'X' else tuple(int(self.zones[c].get('map', '#c9cdd2')[i:i + 2], 16) for i in (1, 3, 5))
                dr.rectangle([x * sc, y * sc, x * sc + sc - 1, y * sc + sc - 1], fill=col)
        for p in self.P: dr.rectangle([p['x'] * sc + 3, p['y'] * sc + 3, p['x'] * sc + sc - 4, p['y'] * sc + sc - 4], fill=(255, 200, 0))
        for p in self.D: dr.rectangle([p['x'] * sc + 5, p['y'] * sc + 5, p['x'] * sc + sc - 6, p['y'] * sc + sc - 6], fill=(0, 220, 220))
        for (a, b, c, d) in self.footprints(): dr.rectangle([a * sc, b * sc, c * sc, d * sc], fill=(120, 60, 160), outline=(0, 0, 0))
        for s in self.FL: dr.ellipse([s['x'] * sc - 3, s['y'] * sc - 3, s['x'] * sc + 3, s['y'] * sc + 3], fill=(255, 0, 180))
        im.save(path)


def Z(name, music, floor, wall, step, **kw):
    z = {'name': name, 'music': music, 'floor': floor, 'wall': wall, 'step': step}
    z.update(kw)
    return z


# ======================================================================= ЭТАЖ 1
L1 = Level(60, 50, 'Этаж 1')
g = L1
# коридоры и залы (сначала коридоры, ротонда потом — чтобы стены коридоров не торчали в неё)
g.rect(23, 34, 37, 43, '.'); g.rect(29, 29, 31, 33, '.')
g.rect(6, 17, 18, 29, 'a'); g.rect(19, 22, 24, 24, 'c'); g.rect(10, 7, 12, 16, 'c'); g.rect(10, 7, 21, 9, 'c')
g.rect(22, 3, 38, 11, 'b'); g.rect(29, 12, 31, 16, 'c')
g.rect(42, 17, 54, 29, 'k'); g.rect(36, 22, 41, 24, 'n'); g.rect(47, 30, 49, 34, 'n'); g.rect(41, 35, 55, 45, 'l'); g.rect(38, 38, 40, 40, 'n')
g.rect(42, 2, 56, 7, 'e'); g.rect(39, 4, 41, 5, 'e')
g.circle(30.0, 23.0, 7.6, 'r')
g.rect(14, 36, 20, 42, 'w'); g.g[39][21] = 'w'; g.g[39][22] = 'D'
g.rect(46, 10, 52, 15, 'j'); g.g[16][49] = 'D'
g.rect(1, 21, 3, 26, 'x'); g.g[23][4] = 'x'; g.g[23][5] = 'X'
g.rect(22, 31, 24, 32, 'v'); g.g[33][23] = 'D'           # лифт

CX, CY = 30.0, 23.0
L1.zones = {
    '.': Z('Вестибюль под стеклянной пирамидой', 'lobby', 'checker', 'plaster', 'hard', sky='glass', amb=0.74, fog=[190, 205, 220], map='#c9cdd2'),
    'r': Z('Ротонда «Фонтан ожидания»', 'lobby', 'marble', 'marble', 'hard', sky='day', amb=0.78, fog=[190, 220, 240], map='#bfe6f6'),
    'a': Z('Крыло Канамори · Зал I «Сделка»', 'sayaka', 'parquet', 'mint', 'wood', amb=0.4, fog=[168, 188, 178], map='#8fc9a4'),
    'b': Z('Крыло Канамори · Зал II «Бухгалтерия чувств»', 'sayaka', 'parquet', 'mint', 'wood', amb=0.4, fog=[168, 188, 178], map='#8fc9a4'),
    'c': Z('Галерея Канамори', 'sayaka', 'parquet', 'mint', 'wood', amb=0.38, fog=[168, 188, 178], map='#a8d8b8'),
    'k': Z('Крыло Экланд · Зал I «Ночная смена»', 'kara', 'carpet', 'rose', 'soft', amb=0.37, fog=[188, 168, 174], map='#d99aa4'),
    'l': Z('Крыло Экланд · Зал II «Не выходя из комнаты»', 'kara', 'carpet', 'rose', 'soft', amb=0.37, fog=[188, 168, 174], map='#d99aa4'),
    'n': Z('Галерея Экланд', 'kara', 'carpet', 'rose', 'soft', amb=0.35, fog=[188, 168, 174], map='#e8b4bc'),
    'e': Z('Зал ожидания', 'dream', 'enafloor', 'ena', 'hard', sky='day', amb=0.74, fog=[230, 190, 230], map='#e8c64a'),
    'w': Z('Туалет (служебный)', 'service', 'tiles', 'tiles', 'hard', amb=0.4, dim=True, hum=True, fog=[44, 48, 46], map='#9aa4ae'),
    'j': Z('Подсобка уборщика', 'service', 'concrete', 'block', 'hard', amb=0.26, dim=True, hum=True, staff=True, fog=[44, 48, 46], map='#9aa4ae'),
    'x': Z('???', 'service', 'oldcarpet', 'wallpaper', 'soft', amb=0.18, dim=True, hum=True, secret=True, fog=[70, 62, 30], map='#1b1f24'),
    'v': Z('Лифт', 'elevator', 'rubber', 'steel', 'hard', ceil='office', lampEvery=99, amb=0.7, elevator=True, fog=[200, 205, 210], map='#dfe4ea'),
}
L1.extra_lamps = [[17, 39, True], [15, 41, False], [49, 12, False], [2, 23, True], [23, 31, False]]
L1.entrance = [{'x': x, 'y': 44, 'side': 'N'} for x in (29, 30, 31)]
L1.labels = [['КАНАМОРИ I', 12.5, 23.0], ['КАНАМОРИ II', 30.5, 7.0], ['ЭКЛАНД I', 48.5, 20.5], ['ЭКЛАНД II', 48.5, 38.5],
             ['РОТОНДА', 30, 18.5], ['ВЕСТИБЮЛЬ', 30.5, 40], ['WC', 17.5, 40.5], ['ПОДСОБКА', 49.5, 13], ['ЗАЛ ОЖИДАНИЯ', 49.5, 6.5], ['ЛИФТ', 23.5, 32.2]]

# картины (основные)
for a in [(26, 33, 'S', 'k10'), (34, 33, 'S', 's04'),
          (5, 19, 'E', 's01'), (5, 27, 'E', 's02'), (8, 30, 'N', 's03'), (15, 30, 'N', 's05'), (16, 16, 'S', 's06'),
          (25, 2, 'S', 's07'), (30, 2, 'S', 's08'), (35, 2, 'S', 's09'), (39, 8, 'W', 's10'),
          (55, 19, 'W', 'k01'), (55, 23, 'W', 'k02'), (55, 27, 'W', 'k03'), (45, 30, 'N', 'k04'), (52, 30, 'N', 'k05'),
          (44, 46, 'N', 'k06'), (48, 46, 'N', 'k07'), (52, 46, 'N', 'k08'), (56, 40, 'W', 'k09'),
          (13, 39, 'E', 'm05'), (18, 43, 'N', 'm04'), (53, 12, 'W', 'm01'), (49, 9, 'S', 'm02'), (0, 23, 'E', 'm03')]:
    g.pic(*a)
# декали
for a in [(22, 41, 'E', 'extinguisher'), (22, 36, 'E', 'poster_touch'), (24, 33, 'S', 'clock'), (36, 33, 'S', 'poster_quiet'),
          (38, 36, 'W', 'exitsign'), (22, 38, 'E', 'exitsign'),
          (14, 16, 'S', 'clock'), (19, 20, 'W', 'extinguisher'), (10, 30, 'N', 'poster_quiet'), (19, 27, 'W', 'vent'),
          (21, 4, 'E', 'poster_touch'), (39, 10, 'W', 'extinguisher'), (28, 2, 'S', 'clock'), (11, 6, 'S', 'vent'),
          (46, 16, 'S', 'clock'), (48, 16, 'S', 'extinguisher'), (41, 19, 'E', 'poster_quiet'),
          (52, 34, 'S', 'clock'), (56, 43, 'W', 'poster_touch'), (40, 36, 'E', 'extinguisher'),
          (49, 1, 'S', 'tvwall'), (52, 1, 'S', 'queue'), (45, 1, 'S', 'clock'), (47, 8, 'N', 'poster_quiet'), (57, 6, 'W', 'extinguisher'),
          (15, 43, 'N', 'mirror'), (16, 43, 'N', 'mirror'), (21, 37, 'W', 'urinal'), (21, 38, 'W', 'urinal'),
          (21, 41, 'W', 'dryer'), (21, 42, 'W', 'paper'), (17, 35, 'S', 'vent'),
          (45, 14, 'E', 'panel'), (47, 9, 'S', 'vent'),
          (21, 31, 'E', 'elevpanel'), (25, 32, 'W', 'poster_quiet')]:
    g.dec(*a)

# пропы этажа 1
g.prop('fountain', CX, CY)
g.prop('bench', CX, CY - 2.5, 'S'); g.prop('bench', CX, CY + 2.5, 'N'); g.prop('bench', CX - 2.5, CY, 'E'); g.prop('bench', CX + 2.5, CY, 'W')
for i in range(8):
    a = i * math.pi / 4 + math.pi / 8
    g.sp('column', CX + math.cos(a) * 5.2, CY + math.sin(a) * 5.2)
for a in (math.pi / 4, 3 * math.pi / 4, 5 * math.pi / 4, 7 * math.pi / 4):
    g.prop('planter', CX + math.cos(a) * 6.3, CY + math.sin(a) * 6.3, 'S')
g.floater('fcube', CX, CY, 1.75, .38); g.floater('fpyr', CX - 2.6, CY - 1.6, 1.35, .32); g.floater('focta', CX + 2.7, CY + 1.9, 1.5, .32)
g.floater('fball', CX + 1.9, CY - 2.3, 1.2, .26); g.floater('fcube', CX - 2.0, CY + 2.6, 1.1, .2); g.floater('fball', CX - 4.0, CY + 0.5, 1.6, .2)
# вестибюль
g.prop('reception', 35.6, 36.8, 'W'); g.sp('chair', 36.6, 36.4); g.sp('chair', 36.6, 37.2)
g.prop('bench', 26.0, 36.8, 'N'); g.prop('bench', 34.0, 36.8, 'N')
g.sp('rope', 26.0, 34.55); g.sp('rope', 34.0, 34.55)
g.wall_prop('planter', 'S', 26.0, 44.0); g.wall_prop('planter', 'S', 34.4, 44.0)
g.sp('plant', 23.5, 43.5); g.sp('plant', 37.5, 43.5); g.sp('palm', 24.0, 35.0); g.sp('palm', 36.6, 42.0)
g.sp('sign', 28.0, 41.0); g.sp('cooler', 23.28, 37.0); g.sp('trash', 27.0, 37.0); g.sp('trash', 33.0, 37.0)
# Канамори
g.prop('smallfountain', 12.5, 23.5); g.prop('bench', 8.1, 19.5, 'W'); g.prop('bench', 15.5, 27.7, 'S')
g.wall_prop('planter', 'S', 11.6, 30.0); g.prop('pedestal_bust', 6.45, 21.7); g.prop('pedestal_bust', 6.45, 25.3); g.prop('pedestal_vase', 18.5, 17.5)
g.sp('plant', 6.5, 17.5); g.sp('plant', 18.5, 29.5); g.sp('plant', 6.5, 29.5); g.sp('donation', 18.4, 21.2)
g.wall_prop('vending', 'W', 12.0, 10.0); g.wall_prop('snack', 'W', 12.5, 10.0); g.sp('trash', 10.22, 13.1)
g.sp('plant', 10.5, 7.5); g.sp('plant', 21.5, 7.5)
g.prop('bench', 25.5, 5.0, 'N'); g.prop('bench', 30.5, 5.0, 'N'); g.prop('bench', 35.5, 5.0, 'N'); g.prop('bench', 37.2, 8.5, 'W')
g.prop('planter', 30.5, 8.6, 'S'); g.wall_prop('deskpc', 'S', 24.5, 12.0); g.sp('chair', 24.5, 11.25)
g.prop('pedestal_bust', 38.6, 3.4); g.prop('pedestal_vase', 22.4, 3.4); g.sp('plant', 38.5, 11.5); g.sp('plant', 22.5, 11.5)
# Экланд
g.prop('smallfountain', 48.5, 23.5); g.prop('bench', 52.4, 21.5, 'E'); g.prop('bench', 52.4, 25.5, 'E'); g.sp('shark', 52.4, 21.55, z=0.22)
g.wall_prop('planter', 'N', 44.5, 17.0); g.wall_prop('planter', 'N', 53.0, 17.0); g.prop('pedestal_bust', 42.6, 26.3); g.prop('pedestal_vase', 42.6, 20.5)
g.sp('plant', 42.5, 17.5); g.sp('plant', 54.5, 29.5); g.sp('plant', 42.5, 29.5); g.sp('plant', 54.5, 17.5)
g.wall_prop('deskpc', 'N', 43.5, 35.0); g.sp('chair', 43.5, 35.85); g.sp('shark', 44.3, 35.75, z=0)
g.wall_prop('vending', 'W', 42.6, 41.0); g.wall_prop('snack', 'W', 43.1, 41.0); g.sp('trash', 41.2, 43.7)
g.prop('bench', 46.5, 43.2, 'S'); g.prop('bench', 50.5, 43.2, 'S'); g.prop('planter', 48.5, 40.0, 'S'); g.prop('pedestal_bust', 55.4, 37.4)
g.sp('plant', 55.5, 35.5); g.sp('plant', 41.5, 45.5); g.sp('plant', 55.5, 45.5)
# зал ожидания
for x in (45.6, 46.65, 51.4, 52.45):
    g.prop('chairs', x, 4.4, 'N'); g.prop('chairs', x, 5.8, 'N')
g.wall_prop('vending', 'E', 2.8, 57.0); g.wall_prop('snack', 'E', 3.3, 57.0); g.wall_prop('tvstand', 'N', 49.0, 2.0)
g.prop('enablock', 43.0, 6.9); g.prop('enablock', 43.6, 7.4); g.prop('enablock', 55.6, 7.4)
g.sp('plant', 42.5, 2.5); g.sp('cooler', 56.72, 7.3); g.sp('trash', 48.9, 7.6)
g.floater('focta', 45.0, 3.3, 1.15, .26); g.floater('fball', 49.5, 6.4, 1.3, .22); g.floater('fpyr', 54.0, 5.2, 1.05, .26); g.floater('fcube', 47.8, 7.0, 1.4, .2)
# туалет
for x0 in (14.0, 14.85, 15.7):
    x1 = x0 + 0.85
    g.prop('toilet', (x0 + x1) / 2, 36.14, 'S')
    g.box(x1 - 0.02, 36.0, x1 + 0.02, 36.95, 0.04, 0.95, 'stall'); g.box(x0 + 0.02, 36.93, x0 + 0.2, 36.97, 0.04, 0.95, 'stall')
    g.box(x1 - 0.06, 36.5, x1 - 0.02, 36.93, 0.04, 0.95, 'stalldoor')
g.wall_prop('sinks', 'S', 16.0, 43.0); g.sp('trash', 17.4, 42.75); g.sp('wetfloor', 18.6, 39.6)
# подсобка и тайник
g.wall_prop('lockers', 'W', 11.0, 46.0); g.wall_prop('shelf', 'W', 12.4, 46.0); g.wall_prop('shelf', 'W', 13.1, 46.0)
g.prop('cardboard', 52.55, 10.45); g.prop('cardboard', 51.95, 10.4); g.sp('bucket', 48.0, 14.0); g.sp('wetfloor', 50.6, 14.6); g.sp('trash', 52.6, 15.6)
g.wall_prop('deskpc', 'N', 2.0, 21.0); g.sp('chair', 2.0, 21.85); g.prop('cardboard', 2.6, 26.6)
# остальные арты Экланд и Канамори — по свободным стенам их крыльев
g.hang('abc', ['s11', 's12', 's13', 's14', 's15', 's16', 's17', 's18', 's19', 's20', 's21'])
g.hang('kln', ['k11', 'k12', 'k13', 'k14', 'k15', 'k16', 'k17', 'k18', 'k19'])

# ======================================================================= ЭТАЖ 2
L2 = Level(60, 50, 'Этаж 2')
h = L2
h.rect(23, 35, 37, 42, 'q'); h.rect(29, 30, 31, 34, 'q')                 # приёмная
h.rect(29, 44, 31, 45, 'v'); h.g[43][30] = 'D'                            # лифт
h.rect(3, 14, 17, 30, 'h'); h.rect(18, 21, 23, 23, 'h')                   # Ночные окна
h.rect(19, 1, 41, 10, 'g'); h.rect(29, 11, 31, 15, 'g')                   # Пустые пространства
h.rect(43, 14, 57, 30, 'o'); h.rect(37, 21, 42, 23, 'o')                  # Кабинет диковин
h.circle(30.0, 22.0, 8.2, 'A')                                            # атриум
# перегородки-стены внутри залов (на них тоже висят картины)
h.rect(9, 19, 10, 24, '#'); h.rect(25, 4, 26, 7, '#'); h.rect(31, 4, 32, 7, '#'); h.rect(37, 4, 38, 7, '#'); h.rect(49, 19, 50, 25, '#')
# служебные и секретные
h.rect(16, 36, 20, 41, 'w'); h.g[38][21] = 'w'; h.g[38][22] = 'D'
h.rect(39, 36, 43, 41, 'j'); h.g[38][38] = 'D'
h.rect(43, 2, 51, 9, 'K'); h.g[5][42] = 'D'
h.rect(4, 3, 15, 12, 'T'); h.g[13][9] = 'X'
h.rect(45, 32, 56, 42, 'Q'); h.g[31][50] = 'X'
h.rect(53, 2, 57, 7, 'z'); h.g[4][52] = 'X'

L2.zones = {
    'q': Z('Приёмная второго этажа', 'elevator', 'greycarpet', 'office', 'soft', ceil='office', lampEvery=2, lampI=0.35, amb=0.5, fog=[220, 224, 228], map='#e4e8ec'),
    'v': Z('Лифт', 'elevator', 'rubber', 'steel', 'hard', ceil='office', lampEvery=99, amb=0.7, elevator=True, fog=[200, 205, 210], map='#dfe4ea'),
    'A': Z('Атриум «Бассейн, в котором никто не плавает»', 'dream', 'pooltile', 'poolwhite', 'hard', sky='day', amb=0.82, fog=[200, 230, 245], map='#bfe6f6'),
    'h': Z('Зал III «Ночные окна»', 'night', 'starcarpet', 'webdream', 'soft', sky='night', amb=0.58, fog=[30, 24, 80], map='#6a5aff'),
    'g': Z('Зал IV «Пустые пространства»', 'service', 'beigecarpet', 'liminal', 'soft', lampEvery=2, lampI=0.3, amb=0.42, hum=True, fog=[200, 192, 150], map='#d9cf9e'),
    'o': Z('Зал V «Кабинет диковин»', 'cabinet', 'darkparquet', 'velvet', 'wood', ceil='coffer', lampI=0.5, amb=0.34, fog=[40, 30, 20], map='#3f8a6a'),
    'w': Z('Туалет второго этажа', 'service', 'tiles', 'tiles', 'hard', amb=0.42, dim=True, hum=True, fog=[44, 48, 46], map='#9aa4ae'),
    'j': Z('Подсобка второго этажа', 'service', 'concrete', 'block', 'hard', amb=0.26, dim=True, hum=True, staff=True, fog=[44, 48, 46], map='#9aa4ae'),
    'K': Z('Кабинет хранителя', 'cabinet', 'darkparquet', 'woodpanel', 'wood', ceil='coffer', lampI=0.5, amb=0.35, staff=True, fog=[50, 36, 24], map='#a0763a'),
    'T': Z('Террариум', 'dream', 'moss', 'glasshouse', 'soft', sky='day', amb=0.72, secret=True, lowpass=2600, fog=[120, 170, 120], map='#1b1f24'),
    'Q': Z('Аквариум', 'night', 'bluetile', 'aquarium', 'hard', ceil='pool', lampEvery=3, lampI=0.25, amb=0.3, secret=True, lowpass=650, fog=[10, 40, 90], map='#1b1f24'),
    'z': Z('Серверная', 'service', 'rubber', 'steel', 'hard', ceil='office', lampEvery=99, amb=0.16, hum=True, secret=True, lowpass=1500, fog=[14, 22, 40], map='#1b1f24'),
}
L2.extra_lamps = [[30, 44, False], [18, 38, False], [41, 38, True], [55, 4, True]]
L2.labels = [['НОЧНЫЕ ОКНА', 10, 17], ['ПУСТЫЕ ПРОСТРАНСТВА', 30.5, 3.0], ['КАБИНЕТ ДИКОВИН', 50, 17], ['АТРИУМ', 30, 18],
             ['ПРИЁМНАЯ', 30, 39], ['WC', 18.5, 40], ['ПОДСОБКА', 41, 40.5], ['КАБИНЕТ', 47, 6], ['ЛИФТ', 30.5, 45]]

AX, AY = 30.0, 22.0
# декали этажа 2
for a in [(28, 44, 'E', 'elevpanel'), (36, 34, 'S', 'clock'), (22, 40, 'E', 'exitsign'), (38, 41, 'W', 'extinguisher'),
          (24, 34, 'S', 'poster_quiet'),
          # Ночные окна: webcore
          (5, 13, 'S', 'webbanner'), (13, 13, 'S', 'hitcounter'), (2, 22, 'E', 'construction'), (18, 27, 'W', 'webbanner'),
          # Пустые пространства: двери, которые не открываются
          (21, 0, 'S', 'fakedoor'), (38, 0, 'S', 'fakedoor'), (18, 6, 'E', 'fakedoor'), (24, 11, 'N', 'fakedoor'), (37, 11, 'N', 'fakedoor'), (42, 8, 'W', 'fakedoor'),
          (32, 0, 'S', 'clock'), (35, 11, 'N', 'vent'),
          # Кабинет диковин
          (58, 22, 'W', 'clock'), (47, 13, 'S', 'extinguisher'),
          # туалет, подсобка
          (17, 42, 'N', 'mirror'), (18, 42, 'N', 'mirror'), (15, 38, 'E', 'urinal'), (15, 39, 'E', 'urinal'), (21, 40, 'W', 'dryer'),
          (44, 39, 'W', 'panel'), (40, 35, 'S', 'vent'),
          ]:
    h.dec(*a)

# приёмная: стойка, кресла ожидания, автоматы, кулер — стерильный офис
h.prop('reception', 26.0, 37.5, 'E'); h.sp('chair', 24.6, 37.2); h.sp('chair', 24.6, 37.9)
h.prop('chairs', 32.5, 37.0, 'W'); h.prop('chairs', 33.8, 37.0, 'W')
h.wall_prop('vending', 'E', 40.0, 38.0); h.wall_prop('snack', 'E', 40.5, 38.0)
h.sp('cooler', 37.72, 35.4); h.sp('plant', 23.5, 35.5); h.sp('plant', 37.5, 42.5); h.sp('plant', 23.5, 42.5); h.sp('trash', 37.7, 39.5)
# атриум: бассейн, лежаки, пальмы, мячи в воздухе
h.box(27.0, 19.6, 33.0, 24.4, 0.0, 0.09, 'marble_side', 'water')
for x in (27.6, 29.2, 30.8, 32.4):
    h.prop('lounger', x, 26.0, 'N'); h.prop('lounger', x, 18.0, 'S')
for a in (math.pi / 4, 3 * math.pi / 4, 5 * math.pi / 4, 7 * math.pi / 4):
    h.sp('palm', AX + math.cos(a) * 6.2, AY + math.sin(a) * 6.2)
h.floater('fball', 28.5, 21.0, 0.9, .3); h.floater('fball', 31.6, 23.2, 1.2, .26); h.floater('focta', 30.0, 22.0, 1.8, .34); h.floater('fcube', 25.0, 22.0, 1.4, .22)
# Ночные окна: старые компьютеры, вазы, скамейки, звёзды-фигуры
h.wall_prop('deskpc', 'W', 17.0, 3.0); h.sp('chair', 3.85, 17.0); h.wall_prop('deskpc', 'E', 27.0, 18.0); h.sp('chair', 17.15, 27.0)
h.prop('bench', 13.5, 22.0, 'E'); h.prop('bench', 6.0, 22.0, 'W'); h.prop('pedestal_vase', 3.4, 29.6); h.prop('pedestal_vase', 17.6, 14.4)
h.floater('fpyr', 6.0, 17.5, 1.3, .25); h.floater('fball', 14.0, 27.0, 1.2, .22); h.floater('focta', 13.5, 17.0, 1.4, .22); h.floater('fcube', 6.0, 27.5, 1.15, .2)
# Пустые пространства: стулья в никуда, кулер, растения
h.prop('chairs', 22.0, 6.0, 'E'); h.prop('chairs', 28.5, 8.6, 'N'); h.prop('bench', 28.5, 3.0, 'S'); h.sp('cooler', 40.72, 2.0); h.sp('plant', 19.5, 1.5)
h.sp('plant', 40.5, 9.5); h.sp('trash', 23.0, 9.6); h.sp('wetfloor', 34.6, 5.5)
# Кабинет диковин: книжные шкафы, постаменты, скамейки
h.wall_prop('bookshelf', 'N', 54.5, 14.0); h.wall_prop('bookshelf', 'S', 45.5, 31.0); h.wall_prop('bookshelf', 'E', 28.5, 58.0)
h.prop('pedestal_bust', 46.5, 22.0); h.prop('pedestal_vase', 53.5, 22.0); h.prop('pedestal_bust', 53.5, 17.0); h.prop('pedestal_vase', 46.5, 27.5)
h.prop('bench', 47.6, 22.0, 'E'); h.prop('bench', 51.9, 22.0, 'W'); h.sp('plant', 43.5, 14.5); h.sp('plant', 57.5, 30.5)
# туалет 2
for x0 in (16.0, 17.0):
    x1 = x0 + 0.95
    h.prop('toilet', (x0 + x1) / 2, 36.14, 'S')
    h.box(x1 - 0.02, 36.0, x1 + 0.02, 36.95, 0.04, 0.95, 'stall'); h.box(x0 + 0.02, 36.93, x0 + 0.22, 36.97, 0.04, 0.95, 'stall')
    h.box(x1 - 0.06, 36.5, x1 - 0.02, 36.93, 0.04, 0.95, 'stalldoor')
h.wall_prop('sinks', 'S', 18.0, 42.0); h.sp('trash', 19.6, 41.75)
# подсобка 2
h.wall_prop('shelf', 'N', 40.5, 36.0); h.wall_prop('shelf', 'N', 41.2, 36.0); h.wall_prop('lockers', 'S', 41.0, 42.0)
h.sp('bucket', 43.3, 37.0); h.prop('cardboard', 39.4, 41.5); h.sp('wetfloor', 42.0, 39.5)
# кабинет хранителя
h.wall_prop('deskpc', 'N', 47.0, 2.0); h.sp('chair', 47.0, 2.85); h.wall_prop('bookshelf', 'W', 4.5, 43.0); h.wall_prop('bookshelf', 'W', 6.5, 43.0)
h.wall_prop('filecab', 'E', 8.5, 52.0); h.wall_prop('filecab', 'E', 8.1, 52.0); h.sp('plant', 51.5, 2.5); h.sp('trash', 48.2, 2.3)
# террариум
h.prop('smallfountain', 9.5, 7.5)
for (x, y) in [(5.0, 4.0), (14.6, 4.0), (5.0, 12.4), (14.6, 12.4), (9.6, 3.6)]: h.sp('palm', x, y)
for (x, y) in [(6.5, 6.0), (12.8, 6.2), (7.0, 10.6), (12.4, 10.8), (5.2, 8.0), (14.4, 8.4), (8.2, 4.4), (11.0, 4.4)]: h.sp('fern', x, y)
for (x, y) in [(10.6, 8.6), (6.4, 9.2), (13.2, 9.6)]: h.sp('mushroom', x, y)
h.sp('frog', 9.5, 8.62, z=0.13)
# аквариум: две большие витрины по центру, скамейки
h.prop('tank', 48.5, 37.0, 'S'); h.prop('tank', 53.0, 37.0, 'S'); h.prop('bench', 48.5, 39.5, 'N'); h.prop('bench', 53.0, 39.5, 'N')
h.prop('bench', 48.5, 34.5, 'S'); h.prop('bench', 53.0, 34.5, 'S')
# серверная
for y in (2.5, 3.5, 5.5, 6.5):
    h.wall_prop('rack', 'E', y, 58.0)
h.wall_prop('deskpc', 'S', 54.5, 8.0)

# картины этажа 2
h.pic(3, 7, 'E', 'o12')                       # террариум: ваза-цветок
h.pic(57, 39, 'W', 'o11')                     # аквариум: тритонесса
h.pic(25, 34, 'S', 'o01'); h.pic(35, 43, 'N', 'o02'); h.pic(22, 36, 'E', 'o03'); h.pic(38, 36, 'W', 'o04'); h.pic(27, 43, 'N', 'o05')
h.pic(45, 1, 'S', 'o06'); h.pic(49, 1, 'S', 'o07'); h.pic(51, 10, 'N', 'o08'); h.pic(44, 10, 'N', 'o09'); h.pic(52, 7, 'W', 'o10')
h.hang('h', [f'w{i:02d}' for i in range(1, 26)])
h.hang('g', [f'e{i:02d}' for i in range(1, 26)])
h.hang('o', [f'd{i:02d}' for i in range(1, 26)])

# ======================================================================= вывод
levels = [
    L1.export({'start': {'x': 30.5, 'y': 42.3, 'a': -math.pi / 2}, 'elevator': {'x': 23.5, 'y': 31.5, 'a': math.pi / 2}, 'glassApex': [30.5, 39.0]}),
    L2.export({'start': {'x': 30.5, 'y': 44.6, 'a': -math.pi / 2}, 'elevator': {'x': 30.5, 'y': 44.6, 'a': -math.pi / 2}}),
]
with open(os.path.join(HERE, '..', 'museum', 'map.js'), 'w', encoding='utf-8') as f:
    f.write('// Сгенерировано tools/build_map.py — правь там, а не здесь.\nwindow.MUSEUM_LEVELS = ' + json.dumps(levels, ensure_ascii=False) + ';\n')
L1.debug_png(os.path.join(HERE, 'debug_map_1.png')); L2.debug_png(os.path.join(HERE, 'debug_map_2.png'))
for L in (L1, L2):
    print(L.name, len(L.P), 'картин', len(L.D), 'декалей', len(L.PR), 'пропов', len(L.S), 'спрайтов')
