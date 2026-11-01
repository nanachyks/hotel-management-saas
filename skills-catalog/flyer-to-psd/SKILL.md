---
name: Flyer to PSD
description: Convert raw JPEG/PNG/TIFF flyer artwork into editable layered Photoshop PSD files, with DPI and optional CMYK. Use when the user asks to turn a raw image or flyer into a PSD.
---

Convert flat artwork (usually a raw JPEG exported from Canva, PosterMyWall, etc.)
into a proper Photoshop document: one editable pixel layer named `JPEG Artwork`,
with the document DPI embedded in the PSD resolution info.

## Files

- `scripts/jpeg2psd.py` — the converter. Run it with `python`.

## Prerequisites

- Python 3.10+ and `pip install pillow psd-tools` (check first; install only if missing).

## Usage

```sh
# single file (output next to input, defaults .psd, DPI auto-detected from EXIF, else 72)
python <skill>/scripts/jpeg2psd.py flyer.jpg

# explicit output + DPI
python <skill>/scripts/jpeg2psd.py flyer.jpg -o editable.psd --dpi 300

# custom layer name
python <skill>/scripts/jpeg2psd.py flyer.jpg --name "Flyer Artwork"

# print-ready CMYK document at 300 dpi
python <skill>/scripts/jpeg2psd.py flyer.jpg --cmyk --dpi 300

# batch: converts every jpg/png/tiff in the folder into <folder>/psd/
python <skill>/scripts/jpeg2psd.py ./raw_flyers/
```

Existing files are never overwritten silently; the script exits if the output
exists. Pass `--overwrite` to force.

On success the script prints `OK  src -> dst  (WxH MODE, N dpi, layer '...', X MB)`.

## Workflow

1. Locate the input file(s). If the user gave just a name, search the workspace
   for it before asking.
2. Run the script. For print flyers default to `--dpi 300` (unless EXIF DPI
   already says 300) and ask whether CMYK is needed; for screen/social
   graphics let the DPI default and skip `--cmyk`.
3. Verify: parse the `OK` line; if you want certainty, reopen the PSD:

   ```python
   from psd_tools import PSDImage
   doc = PSDImage.open(r"<path>.psd")
   print(doc.color_mode, doc.size, [l.name for l in doc.descendants()])
   ```

4. Report the output path, dimensions, color mode, DPI, and layer name.

## Notes

- The result is a single-layer PSD: the artwork stays as one layer users can
  duplicate, mask, or adjust in Photoshop — it is not text/vector editable.
- `--cmyk` conversion is approximate (Pillow RGB→CMYK). Warn for color-critical
  print jobs; check with the printer in Photoshop.
- The PSD has no flattened composite baked in; Photoshop regenerates the
  preview on open.
- 8-bit, RLE-compressed. Source alpha (PNG/TIFF) is preserved as RGBA.
