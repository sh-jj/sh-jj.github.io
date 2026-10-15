"""Regression coverage for album discovery and exported image metadata."""
import importlib.util
import tempfile
import unittest
from pathlib import Path
from PIL import Image

spec = importlib.util.spec_from_file_location('gallery', Path(__file__).resolve().parents[1] / 'scripts/build_photography.py')
gallery = importlib.util.module_from_spec(spec)
spec.loader.exec_module(gallery)


class GalleryBuildTests(unittest.TestCase):
    def test_empty_folders_removal_and_portrait(self):
        with tempfile.TemporaryDirectory() as temporary:
            base = Path(temporary)
            source, output = base / 'source', base / 'output'
            empty = source / '2026-south-korea-seoul'
            empty.mkdir(parents=True)
            (empty / '.gitkeep').touch()
            (empty / '.DS_Store').touch()
            active = source / '2025-china-nanjing'
            active.mkdir()
            photo = active / 'Portrait-20250615.jpg'
            Image.new('RGB', (1000, 2000), 'blue').save(photo)
            albums = gallery.build(source, output, {})
            self.assertEqual(len(albums), 1)
            self.assertEqual(albums[0]['place'], 'Nanjing')
            data = albums[0]['photos'][0]
            self.assertEqual(data['date'], '2025-06-15')
            with Image.open(output / 'images' / Path(data['thumb']).name) as image:
                self.assertEqual(image.size, (400, 800))
                self.assertEqual(image.width, data['thumbWidth'])
            photo.unlink()
            self.assertEqual(gallery.build(source, output, {}), [])
            self.assertEqual(list((output / 'images').glob('*.webp')), [])

    def test_date_fallback(self):
        self.assertEqual(gallery.photo_date('photo-20250231', '2025'), '2025')
        self.assertEqual(gallery.photo_date('photo', '2026'), '2026')
        self.assertEqual(gallery.photo_date('photo-20261007', '2026'), '2026-10-07')


if __name__ == '__main__':
    unittest.main()
