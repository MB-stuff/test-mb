"""Готовит фото из Instagram для сайта.

Берёт исходники из images/instagram/originals/<slug>.(jpg|jpeg|png|webp),
делает WebP 480px и 960px по ширине (пропорции сохраняются)
и обновляет images/instagram/sources.json.

Запуск: python3 tools/optimize_images.py
"""
import json, pathlib
from PIL import Image, ImageOps

ROOT = pathlib.Path(__file__).resolve().parent.parent / "images" / "instagram"
SRC = ROOT / "originals"
WIDTHS = (480, 960)

def main():
    manifest_path = ROOT / "sources.json"
    manifest = json.loads(manifest_path.read_text("utf-8")) if manifest_path.exists() else {"images": []}
    by_slug = {m["slug"]: m for m in manifest["images"]}
    for f in sorted(SRC.iterdir()):
        if f.suffix.lower() not in {".jpg", ".jpeg", ".png", ".webp"}:
            continue
        im = ImageOps.exif_transpose(Image.open(f)).convert("RGB")
        files = {}
        for w in WIDTHS:
            out = im if im.width <= w else im.resize((w, round(im.height * w / im.width)), Image.LANCZOS)
            name = f"{f.stem}-{w}.webp"
            out.save(ROOT / name, "WEBP", quality=82, method=6)
            files[str(w)] = name
        entry = by_slug.setdefault(f.stem, {"slug": f.stem})
        entry.update(files=files, width=im.width, height=im.height)
    manifest["images"] = list(by_slug.values())
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", "utf-8")
    print(f"готово: {len(manifest['images'])} изображений")

if __name__ == "__main__":
    main()
