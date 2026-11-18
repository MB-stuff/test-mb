"""Собирает museum/ в один файл dist/Museum.html (всё внутри: код, картинки, музыка).
Такой файл открывается двойным кликом, без интернета и без сервера."""
import base64, os, re
ROOT = os.path.join(os.path.dirname(__file__), '..', 'museum')
OUT = os.path.join(os.path.dirname(__file__), '..', 'dist')
os.makedirs(OUT, exist_ok=True)
html = open(os.path.join(ROOT, 'index.html'), encoding='utf-8').read()
assets = {}
for sub, mime in (('art', 'image/jpeg'), ('music', 'audio/mpeg')):
    for f in sorted(os.listdir(os.path.join(ROOT, sub))):
        b = open(os.path.join(ROOT, sub, f), 'rb').read()
        assets[f'{sub}/{f}'] = f'data:{mime};base64,' + base64.b64encode(b).decode()
blob = 'window.MUSEUM_ASSETS = {' + ','.join(f'"{k}":"{v}"' for k, v in assets.items()) + '};'
def inline(m):
    src = m.group(1)
    code = open(os.path.join(ROOT, src), encoding='utf-8').read().replace('</script', '<\\/script')
    return '<script>\n' + code + '\n</script>'
html = re.sub(r'<script src="([^"]+)"></script>', inline, html)
html = html.replace('<script>\n  // Ресурсы:', '<script>' + blob + '</script>\n<script>\n  // Ресурсы:', 1)
path = os.path.join(OUT, 'Museum.html')
open(path, 'w', encoding='utf-8').write(html)
print(path, round(os.path.getsize(path) / 1e6, 1), 'MB')
