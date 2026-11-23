"""Распаковывает архивы с картинками из корня репозитория, ужимает их
и пишет манифест src/images.json. Работы Кары Эклунд и Саяки Канамори
(и схема музея) намеренно пропускаются."""
import io, json, os, re, sys, zipfile
from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
OUT = os.path.join(ROOT, 'hotel', 'assets', 'img')
MAN = os.path.join(ROOT, 'hotel', 'src', 'images.json')
EXCLUDE = ('kara eklund', 'sayaka kanamori', 'art/scheme')
MAXSIDE = 400

def credits_from(z):
    out = {}
    for n in z.namelist():
        if n.endswith('CREDITS.txt'):
            txt = z.read(n).decode('utf-8')
            for m in re.finditer(r'^(\S+\.jpg)\n\s+«(.+?)» — (.+)\n\s+Лицензия: (.+)\n\s+Источник: (\S+)', txt, re.M):
                out[m.group(1)] = dict(title=m.group(2), author=m.group(3), license=m.group(4), url=m.group(5))
    return out

def main():
    os.makedirs(OUT, exist_ok=True)
    items = []
    for zname, group in (('Pictures.zip', 'portrait'), ('Art.zip', 'art'), ('weirdcore_y2k_100.zip', None)):
        z = zipfile.ZipFile(os.path.join(ROOT, zname))
        cr = credits_from(z)
        for n in sorted(z.namelist()):
            low = n.lower()
            if not re.search(r'\.(jpe?g|png)$', low) or any(e in low for e in EXCLUDE):
                continue
            g = group or n.split('/')[0]
            im = Image.open(io.BytesIO(z.read(n))).convert('RGB')
            im.thumbnail((MAXSIDE, MAXSIDE), Image.LANCZOS)
            fid = 'p%03d' % len(items)
            im.save(os.path.join(OUT, fid + '.jpg'), 'JPEG', quality=74, optimize=True)
            key = '/'.join(n.split('/')[-2:])
            c = cr.get(key, {})
            items.append(dict(id=fid, group=g, w=im.width, h=im.height,
                              title=c.get('title') or os.path.splitext(os.path.basename(n))[0],
                              author=c.get('author', ''), license=c.get('license', ''), url=c.get('url', '')))
    # чертежи из референс-пака — висят как «планы отеля» в архиве и кабинете
    kit = zipfile.ZipFile(os.path.join(ROOT, 'Hotel_Noir_Retrofuture_Kit.zip'))
    plans = [('01_Riviera_1954_Ground_Floor.png', 'План первого этажа, 1954'), ('02_Riviera_1954_Basement.png', 'План подвала, 1954'),
             ('03_Plaza_1952_Guest_Floor.png', 'План жилого этажа, 1952'), ('02_International_1968_Ground_Floor.png', 'Проект атриума, 1968'),
             ('03_Radial_Hotel_Concept.png', 'Неосуществлённый проект: отель-кольцо')]
    for fn, title in plans:
        n = next(x for x in kit.namelist() if x.endswith(fn))
        im = Image.open(io.BytesIO(kit.read(n))).convert('RGB'); im.thumbnail((720, 720), Image.LANCZOS)
        fid = 'p%03d' % len(items)
        im.save(os.path.join(OUT, fid + '.jpg'), 'JPEG', quality=80, optimize=True)
        items.append(dict(id=fid, group='plans', w=im.width, h=im.height, title=title, author='', license='', url=''))
    json.dump(items, open(MAN, 'w'), ensure_ascii=False, indent=0)
    from collections import Counter
    print(len(items), Counter(i['group'] for i in items))

main()
