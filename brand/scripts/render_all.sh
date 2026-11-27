#!/usr/bin/env bash
# Rasterize all norsumi brand assets + previews.
# usage: render_all.sh <brand_dir> <fonts_dir> <tmp_dir>
# needs: python venv with picosvg skia-pathops fonttools uharfbuzz, resvg, imagemagick
set -euo pipefail
B=$1; FONTS=$2; O=$3; HERE="$(cd "$(dirname "$0")" && pwd)"; PY=${PYTHON:-python3}
mkdir -p "$O" "$B/web" "$B/android" "$B/previews"
"$PY" -I "$HERE/build.py" "$B" "$FONTS" "$O"
cd "$O"
# web
resvg -w 180 "$B/icon.svg" "$B/web/apple-touch-icon.png"
resvg -w 192 "$B/icon-rounded.svg" "$B/web/icon-192.png"
resvg -w 512 "$B/icon-rounded.svg" "$B/web/icon-512.png"
resvg -w 512 maskable.svg "$B/web/icon-maskable-512.png"
for s in 16 32 48; do resvg -w $s fav_light.svg fav$s.png 2>/dev/null; done
magick fav16.png fav32.png fav48.png "$B/web/favicon.ico"
resvg -w 1200 og.svg "$B/web/og-image.png"
resvg -w 512 "$B/icon.svg" "$B/android/playstore-512.png"
# previews
resvg -w 1024 "$B/icon-rounded.svg" "$B/previews/icon-1024.png"
resvg -w 192 "$B/icon-rounded.svg" "$B/previews/icon-192.png"
resvg -w 96 "$B/icon-rounded.svg" "$B/previews/icon-96.png"
resvg -w 48 "$B/icon-rounded.svg" "$B/previews/icon-48.png"
cp "$B/web/og-image.png" "$B/previews/og-image.png"
resvg -w 800 "$B/wordmark-light.svg" wl.png; resvg -w 800 "$B/wordmark-dark.svg" wd.png
magick wl.png -background white -flatten -bordercolor white -border 40 wl2.png
magick wd.png -background "#0A0F24" -flatten -bordercolor "#0A0F24" -border 40 wd2.png
magick wl2.png wd2.png -append "$B/previews/wordmarks.png"
# android simulations
FG=$(sed -E 's/.*d="([^"]+)".*/\1/' android_fg.svg);
mk () { cat > a_$2.svg <<SVG
<svg xmlns="http://www.w3.org/2000/svg" viewBox="18 18 72 72" width="288" height="288">
<defs><clipPath id="c">$1</clipPath>
<linearGradient id="g" x1="18" y1="18" x2="90" y2="90" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#4F8CFF"/><stop offset="1" stop-color="#2E6BFF"/></linearGradient>
<radialGradient id="h" cx="36" cy="22" r="62" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#fff" stop-opacity=".16"/><stop offset=".5" stop-color="#fff" stop-opacity=".03"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs>
<g clip-path="url(#c)">$3</g></svg>
SVG
resvg -w 288 a_$2.svg a_$2.png; }
COL='<rect width="108" height="108" fill="url(#g)"/><rect width="108" height="108" fill="url(#h)"/><path d="'$FG'" fill="#fff"/>'
mk '<circle cx="54" cy="54" r="36"/>' circle "$COL"
mk '<path d="M54 18 C80 18 90 28 90 54 C90 80 80 90 54 90 C28 90 18 80 18 54 C18 28 28 18 54 18Z"/>' squircle "$COL"
mk '<rect x="18" y="18" width="72" height="72" rx="16"/>' rsq "$COL"
MONO="<rect width=\"108\" height=\"108\" fill=\"#D8E6FF\"/><path d=\"$FG\" fill=\"#123C9C\"/>"
mk '<circle cx="54" cy="54" r="36"/>' mono "$MONO"
cat > a_safe.svg <<SVG
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 108 108" width="288" height="288"><rect width="108" height="108" fill="#3F7CFF"/>
<rect x="18" y="18" width="72" height="72" fill="none" stroke="#fff" stroke-opacity=".45" stroke-width=".4" stroke-dasharray="1 1"/>
<circle cx="54" cy="54" r="33" fill="none" stroke="#FFD24A" stroke-width=".5"/><path d="$FG" fill="#fff"/></svg>
SVG
resvg -w 288 a_safe.svg a_safe.png
cat > m_safe.svg <<SVG
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="288" height="288"><image href="$B/web/icon-maskable-512.png" width="512" height="512"/><circle cx="256" cy="256" r="204.8" fill="none" stroke="#FFD24A" stroke-width="3"/></svg>
SVG
resvg -w 288 m_safe.svg m_safe.png
# contact sheet
F="$FONTS/geist/geist-font/Geist/ttf/Geist-Medium.ttf"
resvg -w 288 "$B/icon-rounded.svg" i288.png; resvg -w 288 "$B/icon.svg" full288.png
resvg -w 96 "$B/icon-rounded.svg" i96.png; resvg -w 48 "$B/icon-rounded.svg" i48.png
resvg -w 32 fav_light.svg f32.png 2>/dev/null; resvg -w 16 fav_light.svg f16.png 2>/dev/null
resvg -w 288 "$B/mark.svg" mk.png; magick mk.png -background white -flatten markw.png
tile () { magick "$1" -background "#F3F4F8" -gravity center -extent 320x330 -font "$F" -pointsize 15 -fill "#5a6080" -gravity south -annotate +0+4 "$2" "$3"; }
tile i288.png "iOS / web (rounded)" t1.png; tile full288.png "full-bleed icon.svg" t2.png
magick -size 320x330 xc:"#F3F4F8" i96.png -gravity center -geometry -90-20 -composite i48.png -geometry +10-20 -composite f32.png -geometry +80-20 -composite f16.png -geometry +130-20 -composite -font "$F" -pointsize 15 -fill "#5a6080" -gravity south -annotate +0+4 "96 · 48 · 32 · 16 px" t3.png
tile markw.png "mark.svg (currentColor)" t4.png
tile a_circle.png "Android · circle mask" t5.png; tile a_squircle.png "Android · squircle mask" t6.png
tile a_rsq.png "Android · rounded square" t7.png; tile a_mono.png "Android · themed (monochrome)" t8.png
tile a_safe.png "foreground in 66dp safe zone" t9.png; tile m_safe.png "PWA maskable · 80% safe zone" t10.png
magick t1.png t2.png t3.png t4.png +append r1.png; magick t5.png t6.png t7.png t8.png +append r2.png
resvg -w 960 og.svg ogt0.png; magick ogt0.png -background "#F3F4F8" -gravity center -extent 960x520 ogt.png
magick ogt.png \( t9.png t10.png -append \) +append -background "#F3F4F8" -gravity west -extent 1280x660 r3.png
magick "$B/previews/wordmarks.png" -resize 600x -background "#F3F4F8" -gravity center -extent 1280x400 r4.png
magick r1.png r2.png r3.png r4.png -background "#F3F4F8" -append -bordercolor "#F3F4F8" -border 24 "$B/previews/contact-sheet.png"
echo "rendered to $B"
