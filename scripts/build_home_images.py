#!/usr/bin/env python3
"""Build homepage display images without modifying originals. Requires Pillow."""
import re
from pathlib import Path
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / 'img/optimized'


def build():
    OUTPUT.mkdir(exist_ok=True)
    page = (ROOT / 'index.html').read_text()
    sources = sorted(set(re.findall(r'(?:src|data-original)="(img/paper/[^"]+)"', page)))
    before = after = 0
    for source in sources:
        with Image.open(ROOT / source) as original:
            image = ImageOps.exif_transpose(original).convert('RGB')
            image.thumbnail((900, 640), Image.Resampling.LANCZOS)
            target = OUTPUT / (Path(source).stem + '.webp')
            image.save(target, 'WEBP', quality=88, method=6)
            before += (ROOT / source).stat().st_size
            after += target.stat().st_size
    with Image.open(ROOT / 'img/shjj_2024_3.jpg') as original:
        for width in (220, 440):
            image = ImageOps.exif_transpose(original).convert('RGB')
            image.thumbnail((width, 1000), Image.Resampling.LANCZOS)
            image.save(OUTPUT / f'portrait-{width}.webp', 'WEBP', quality=88, method=6)
    print(f'{len(sources)} paper images: {before:,} -> {after:,} bytes ({100 * (1-after/before):.1f}% smaller)')


if __name__ == '__main__':
    build()
