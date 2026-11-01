#!/usr/bin/env python3
"""Convert raw JPEG (or PNG/TIFF) artwork into a Photoshop PSD file.

Creates a single-layer PSD + embedded DPI (resolution info) so the result
opens in Photoshop as an editable document instead of a flat image.

Requires: pip install pillow psd-tools

Usage:
    python jpeg2psd.py flyer.jpg
    python jpeg2psd.py flyer.jpg -o editable.psd --dpi 300
    python jpeg2psd.py flyer.jpg --cmyk --name "Flyer Artwork"
    python jpeg2psd.py ./raw_flyers/            # batch: converts the folder
    python jpeg2psd.py ./raw_flyers/ -o ./psds/ # batch into another folder
"""

import argparse
import sys
from pathlib import Path

IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".tif", ".tiff"}
FALLBACK_DPI = 72


def die(msg: str) -> "None":
    print(f"error: {msg}", file=sys.stderr)
    sys.exit(1)


def ensure_deps() -> None:
    missing = []
    try:
        from PIL import Image  # noqa: F401
    except ImportError:
        missing.append("pillow")
    try:
        from psd_tools import PSDImage  # noqa: F401
    except ImportError:
        missing.append("psd-tools")
    if missing:
        die(f"missing dependencies {missing} -> pip install pillow psd-tools")


def detect_dpi(img, requested: int | None) -> int:
    """Requested --dpi wins; else EXIF DPI; else FALLBACK_DPI."""
    if requested:
        return int(requested)
    exif_dpi = img.info.get("dpi")
    if exif_dpi and exif_dpi[0]:
        return max(1, round(float(exif_dpi[0])))
    return FALLBACK_DPI


def convert_one(src: Path, dst: Path, dpi: int | None, cmyk: bool,
                layer_name: str) -> int:
    """Convert one image file. Returns effective DPI."""
    from PIL import Image
    from psd_tools import PSDImage
    from psd_tools.psd.image_resources import ImageResource, ResoulutionInfo
    from psd_tools.constants import Resource as ResId

    try:
        img = Image.open(src)
        img.load()
    except Exception as e:
        die(f"cannot read {src}: {e}")

    eff_dpi = detect_dpi(img, dpi)

    # Preserve alpha when present, otherwise RGB / CMYK canvas.
    if cmyk:
        mode = "CMYK"
    elif img.mode in ("RGBA", "LA") or "transparency" in img.info:
        mode = "RGBA"
    else:
        mode = "RGB"
    if img.mode != mode:
        img = img.convert(mode)

    try:
        psd_doc = PSDImage.new(mode, img.size, 255 if mode != "CMYK" else (0, 0, 0, 0))
        psd_doc.create_pixel_layer(img, name=layer_name)
        psd_doc._record.image_resources[ResId.RESOLUTION_INFO] = ImageResource(
            key=ResId.RESOLUTION_INFO,
            data=ResoulutionInfo(
                eff_dpi << 16, 1, 1,   # horizontal (fixed 16.16), dpi, inches
                eff_dpi << 16, 1, 1,   # vertical
            ),
        )
        dst.parent.mkdir(parents=True, exist_ok=True)
        psd_doc.save(str(dst))
    except Exception as e:
        die(f"writing {dst} failed: {e}")

    mb = dst.stat().st_size / (1024 * 1024)
    print(f"OK  {src.name} -> {dst}  ({img.size[0]}x{img.size[1]} "
          f"{mode}, {eff_dpi} dpi, layer '{layer_name}', {mb:.1f} MB)")
    return eff_dpi


def main() -> None:
    ap = argparse.ArgumentParser(description="JPEG/PNG/TIFF -> PSD converter")
    ap.add_argument("input", help="image file or directory")
    ap.add_argument("-o", "--output", help="output .psd file or directory")
    ap.add_argument("--dpi", type=int, default=None,
                    help="document DPI (default: EXIF DPI, else 72)")
    ap.add_argument("--cmyk", action="store_true",
                    help="convert to CMYK mode (approximate conversion)")
    ap.add_argument("--name", default="JPEG Artwork", dest="layer_name",
                    help="layer name (default: 'JPEG Artwork')")
    ap.add_argument("--overwrite", action="store_true",
                    help="overwrite existing .psd without asking")
    args = ap.parse_args()

    ensure_deps()
    src = Path(args.input)
    if not src.exists():
        die(f"input not found: {src}")

    if src.is_dir():
        files = sorted(p for p in src.iterdir() if p.suffix.lower() in IMAGE_EXTS)
        if not files:
            print("nothing to convert (no jpg/png/tiff files found)")
            return
        out_dir = Path(args.output) if args.output else (src / "psd")
        out_dir.mkdir(parents=True, exist_ok=True)
        for f in files:
            dst = out_dir / (f.stem + ".psd")
            if dst.exists() and not args.overwrite:
                print(f"skip {f.name}: {dst} exists (use --overwrite)")
                continue
            convert_one(f, dst, args.dpi, args.cmyk, args.layer_name)
        return

    base = Path(args.output) if args.output else None
    if base is None:
        dst = src.with_suffix(".psd")
    elif base.suffix.lower() == ".psd":
        dst = base
    else:
        dst = base / (src.stem + ".psd")
        base.parent.mkdir(parents=True, exist_ok=True)
    if dst.exists() and not args.overwrite:
        die(f"{dst} exists (use --overwrite)")
    convert_one(src, dst, args.dpi, args.cmyk, args.layer_name)


if __name__ == "__main__":
    main()
