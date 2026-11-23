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
    # мемы и схемы в отеле не висят: их места занимают процедурные орнаменты (src/textures.js, ornamentImage)
    MEMES = {'p018', 'p022', 'p023', 'p024', 'p087', 'p092', 'p107', 'p108'}
    for it in [i for i in items if i['id'] in MEMES]:
        os.remove(os.path.join(OUT, it['id'] + '.jpg')); items.remove(it)
    json.dump(items, open(MAN, 'w'), ensure_ascii=False, indent=0)
    from collections import Counter
    print(len(items), Counter(i['group'] for i in items))

main()
