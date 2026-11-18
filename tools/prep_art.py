"""Отбирает и ужимает картинки из Art.zip в museum/art/.
Запуск: python3 tools/prep_art.py <папка_с_распакованным_Art>"""
import sys, os
from PIL import Image
src = sys.argv[1]
dst = os.path.join(os.path.dirname(__file__), '..', 'museum', 'art')
os.makedirs(dst, exist_ok=True)
K = 'Kara Eklund/'; S = 'Sayaka Kanamori/'; O = 'Other/'
pick = {
 'k01': K+'24324.jpg', 'k02': K+'313123.jpg', 'k03': K+'images.jpg',
 'k04': K+'images32323.jpg', 'k05': K+'photo_12_2026-11-18_23-56-37.jpg',
 'k06': K+'photo_19_2026-11-18_23-56-38.jpg', 'k07': K+'photo_1_2026-11-18_23-56-37.jpg',
 'k08': K+'photo_6_2026-11-18_23-56-37.jpg', 'k09': K+'photo_7_2026-11-18_23-56-37.jpg',
 'k10': K+'photo_9_2026-11-18_23-56-37.jpg',
 's01': S+'Illstar1-Mizusaki-Tsubame-Eizouken-ni-wa-Te-wo-Dasu-na!-Anime-9142724.png',
 's02': S+'Zienu-artist-Eizouken-ni-wa-Te-wo-Dasu-na!-Anime-8915592.png',
 's03': S+'photo_10_2026-11-18_23-51-50.jpg',
 's04': S+'photo_11_2026-11-18_23-51-50.jpg', 's05': S+'photo_15_2026-11-18_23-51-51.jpg',
 's06': S+'photo_18_2026-11-18_23-51-51.jpg', 's07': S+'photo_20_2026-11-18_23-51-51.jpg',
 's08': S+'photo_2_2026-11-18_23-51-50.jpg', 's09': S+'photo_5_2026-11-18_23-51-50.jpg',
 's10': S+'red-core-timber-0322-kanamori-14-2-sq-3088900687.jpg',
 'm01': O+'August.jpg', 'm02': O+'photo_2026-02-11_03-19-52.jpg',
 'm03': O+'photo_2026-05-08_20-07-36.jpg', 'm04': O+'photo_2026-07-21_17-48-12.jpg',
 'm05': O+'photo_2026-07-26_21-01-20.jpg',
}
for k, p in pick.items():
    im = Image.open(os.path.join(src, p)).convert('RGB')
    im.thumbnail((1100, 1100), Image.LANCZOS)
    im.save(os.path.join(dst, k + '.jpg'), quality=84, optimize=True, progressive=True)
    print(k, im.size)
