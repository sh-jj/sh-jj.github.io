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

The homepage uses photo-based cinemagraphs in `photography-motion.js`.
The three existing 800px WebP covers are reused as textures; no additional media
is downloaded. Sayram Lake animates only its clouds; the original landscape,
lake and lighting remain fixed. Hong Kong animates only its sky;
the original boat and water remain fixed. Nanjing modulates the existing light
trails with travelling exposure lifts (up to +2.8 EV for headlights and +3 EV in the red channel, with highlight rolloff):
orange headlights run from far to near, and red taillights run from near to far.
Taillight crests lift only the red channel, retaining the original green/blue
levels so the moving sections become richer red rather than pale pink.
The original exposure is the minimum, preserving continuous trails without
dark gaps or added coloured strokes. Two to three spaced light crests have soft advancing
fronts and longer fading tails, travelling along the road in about six seconds.
A small lane-progress texture is drawn
locally once; bridge towers are masked out. These are visual simulations, not
recorded footage. Mask coordinates are tied to
the exact cover files. A changed cover falls back to its original still image
until its scene is retuned.

The composition is fixed: there is no camera movement or animated zoom.
Only the local scene effects animate; no additional image or video assets are loaded.

The animation module loads only near the visible photography section, after its
cover image decodes. A shared loop caps rendering at 24 fps and 720px per card;
it stops offscreen and in hidden tabs. Reduced motion, data saving, unavailable
WebGL, or a lost graphics context use the static cover. Visible scenes loop automatically without a playback control. Original source photographs are unchanged.

Actual video is optional. Save a reviewed clip in `photography/videos/`, set that
album's `previewVideo` in `catalog.json` to its repository-relative URL, then
rebuild. Prefer a fixed-camera, silent H.264 MP4 with web fast-start, around
640–800px wide. Never configure a clip that does not exist. Video takes priority
over simulation; the original WebP stays visible until playback succeeds.

- `python3 tests/photography-build.test.py`
- `node --check photography.js`
- Serve the repository with `python3 -m http.server 8765` and open `http://localhost:8765/photography.html`.
