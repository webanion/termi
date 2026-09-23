#!/usr/bin/env bash
# Render the app icon from assets/logo.svg into PNG and .icns files.
# Needs rsvg-convert (brew install librsvg) and iconutil (macOS).
set -euo pipefail
cd "$(dirname "$0")/../assets"

rsvg-convert -w 1024 -h 1024 logo.svg -o icon.png
rsvg-convert -w 256 -h 256 logo.svg -o icon-256.png

rm -rf icon.iconset && mkdir icon.iconset
for size in 16 32 128 256 512; do
  rsvg-convert -w "$size" -h "$size" logo.svg -o "icon.iconset/icon_${size}x${size}.png"
  rsvg-convert -w "$((size * 2))" -h "$((size * 2))" logo.svg -o "icon.iconset/icon_${size}x${size}@2x.png"
done
iconutil -c icns icon.iconset -o icon.icns
rm -rf icon.iconset
echo "Icons written to assets/"
