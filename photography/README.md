# Photography

Original photographs live in `img/photography/YYYY-country-place/`. The site uses generated WebP copies, never the large originals. Existing originals should not be resized or overwritten.

## Add or update photographs

1. Put JPG, JPEG, PNG, or WebP files in the appropriate album folder.
2. Optionally edit `photography/catalog.json` to choose the display place, description, cover filename, and English/Chinese titles. Photo title keys may be a filename or `album-folder/filename` for duplicates across albums. Unlisted files use their filename as their title; unlisted folders derive their place and country from the folder name.
3. Run `python3 scripts/build_photography.py` from the repository root (requires Pillow). On this Mac you can also double-click `scripts/update-photography.command`.
4. Include the updated `photography/data.js` and `photography/images/` when publishing the site through the existing GitHub Pages process.

The generator scans actual image files. Folders containing only hidden files or no supported images are excluded. Removing the last photo and rebuilding removes that album and its generated images. Folder changes require rebuilding: a static website cannot inspect local directories at runtime.

Dates are read from an eight-digit YYYYMMDD in the filename. Without a valid date, only the folder year is displayed. Album order is newest year/date first. The chosen cover appears first within its album. Titles are editable metadata; original filenames stay intact.

The generator corrects EXIF orientation, converts embedded colour profiles to sRGB for web display, and exports 800px thumbnails and 2400px viewing copies. Exported images do not contain original EXIF/GPS metadata. Album covers may be cropped; photographs inside albums and the full-screen viewer retain their full composition.

## Check

- `python3 tests/photography-build.test.py`
- `node --check photography.js`
- Serve the repository with `python3 -m http.server 8765` and open `http://localhost:8765/photography.html`.
