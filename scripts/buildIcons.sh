#!/usr/bin/env bash
# Render the app icon from assets/logo.svg into PNG files, the Linux icon set in assets/icons,
# and the .icns.
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

# The Linux packages install one icon per size into the hicolor theme, which declares sizes up
# to 512x512. A 1024 icon alone lands in a folder the theme never looks in, and the dock shows a
# generic icon.
mkdir -p icons
for size in 16 24 32 48 64 128 256 512; do
  rsvg-convert -w "$size" -h "$size" logo.svg -o "icons/${size}x${size}.png"
done

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
