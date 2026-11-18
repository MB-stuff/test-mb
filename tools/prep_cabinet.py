"""Берёт скачанные сборщиком Cabinet of Reveries работы (CC0) и кладёт отобранные в museum/art/.
Запуск: python3 tools/prep_cabinet.py <папка cabinet_of_reveries>"""
import sys, os, json
from PIL import Image
src = sys.argv[1]
dst = os.path.join(os.path.dirname(__file__), '..', 'museum', 'art')
rec = {(r['room'][:2], r['slot']): r for r in json.load(open(os.path.join(src, 'manifest.json')))}
PICK = {
 'w': ['01-1','01-2','01-3','01-4','01-5','01-10','02-1','02-2','02-3','02-4','02-5','02-10','05-1','05-3','03-6','03-7','07-4','07-3','06-10','02-7','02-8','01-6','08-7','08-9','09-5'],
 'e': ['03-1','03-2','03-3','03-4','03-5','03-8','03-9','03-10','06-9','09-9','07-9','09-3','10-3','07-5','07-6','07-8','07-2','07-10','02-6','05-4','05-5','07-7','07-1','09-7','10-9'],
 'd': ['04-1','04-2','04-3','04-5','04-6','04-7','04-9','04-10','05-2','05-7','06-1','06-2','06-3','06-4','06-5','06-6','06-7','06-8','08-1','08-2','08-4','08-5','08-6','10-1','10-4'],
 'o': ['09-8','09-2','09-6','09-1','09-4','10-2','09-10','01-8','10-10','10-5','05-10','10-8'],
}
meta = {}
for pref, lst in PICK.items():
    for i, key in enumerate(lst, 1):
        room, slot = key.split('-'); r = rec[(room, int(slot))]
        pid = f'{pref}{i:02d}'
        im = Image.open(os.path.join(src, r['file'])).convert('RGB'); im.thumbnail((1000, 1000), Image.LANCZOS)
        im.save(os.path.join(dst, pid + '.jpg'), quality=82, optimize=True, progressive=True)
        meta[pid] = {k: (r.get(k) or '').strip() for k in ('title', 'artist', 'date', 'source', 'url')}
json.dump(meta, open(os.path.join(os.path.dirname(__file__), 'cabinet_meta.json'), 'w'), ensure_ascii=False, indent=1)
print(len(meta), 'работ')
