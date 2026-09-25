#!/usr/bin/env bash
# Render the app icon from assets/logo.svg into PNG and .icns files.
# Needs rsvg-convert (brew install librsvg, or apt install librsvg2-bin). The .icns also needs
# iconutil, which only macOS has. Without it the PNGs are written and the committed icon.icns
# is left as it is.
set -euo pipefail
cd "$(dirname "$0")/../assets"

if ! command -v rsvg-convert > /dev/null; then
  echo "rsvg-convert not found: brew install librsvg on macOS, apt install librsvg2-bin on Debian and Ubuntu" >&2
  exit 1
fi

rsvg-convert -w 1024 -h 1024 logo.svg -o icon.png
rsvg-convert -w 256 -h 256 logo.svg -o icon-256.png

if ! command -v iconutil > /dev/null; then
  echo "PNG icons written to assets/"
  echo "Skipped icon.icns: it needs iconutil, which only macOS has. The committed icon.icns is unchanged."
  exit 0
fi

rm -rf icon.iconset && mkdir icon.iconset
for size in 16 32 128 256 512; do
  rsvg-convert -w "$size" -h "$size" logo.svg -o "icon.iconset/icon_${size}x${size}.png"
  rsvg-convert -w "$((size * 2))" -h "$((size * 2))" logo.svg -o "icon.iconset/icon_${size}x${size}@2x.png"
done
iconutil -c icns icon.iconset -o icon.icns
rm -rf icon.iconset
echo "Icons written to assets/"
