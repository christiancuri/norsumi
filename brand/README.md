# norsumi brand

Elephants never forget. The mark is a friendly, confident elephant, flat and minimal, with no sharp corners:

- **A round head** with small, solid, wide-set eyes. There is deliberately no sparkle and no blush: the tone is friendly, not babyish.
- **Big floppy ears** shaped as soft rounded cards, a quiet nod to screenshots. They are tilted outward and wrap the head with an even gap.
- **A short trunk curling up happily** (a J-curl) that joins the head with smooth fillets.

## Files

| File | Use |
| --- | --- |
| `mark.svg` | Mark alone, `fill="currentColor"`, 512 viewBox, optically centred (shifted 3% down from the bounding-box centre). |
| `icon.svg` | 1024 full-bleed app icon for stores and OS masks (iOS / Play apply the rounding). |
| `icon-rounded.svg` | Same with a built-in superellipse (n=5) for web, README and docs. |
| `wordmark.svg` | Icon + "norsumi" (Instrument Serif, outlined). The text switches ink / white through `prefers-color-scheme`. |
| `wordmark-light.svg` / `wordmark-dark.svg` | Fixed variants for light or dark backgrounds. |
| `web/favicon.svg` | Rounded tile, mark at 80% for small-size legibility, brighter gradient in dark mode. |
| `web/favicon.ico` | 16 / 32 / 48. |
| `web/apple-touch-icon.png` | 180, full-bleed (iOS rounds it). |
| `web/icon-192.png`, `web/icon-512.png` | Manifest `purpose: "any"` (rounded). |
| `web/icon-maskable-512.png` | Manifest `purpose: "maskable"`: full-bleed, mark inside the 80% safe circle. |
| `web/og-image.png` | 1200×630 social card. |
| `android/drawable/ic_launcher_{foreground,background,monochrome}.xml` | Adaptive icon layers (VectorDrawables, 108 dp). |
| `android/mipmap-anydpi-v26/ic_launcher{,_round}.xml` | Adaptive icon definitions, including `<monochrome>` for themed icons. |
| `android/values/ic_launcher_background.xml` | `@color/ic_launcher_background` solid fallback (`#3F7CFF`). |
| `android/playstore-512.png` | Play Store listing icon (full-bleed; Play applies the mask). |
| `previews/` | Contact sheet, concept exploration and renders at 1024 / 192 / 96 / 48. |
| `scripts/` | Generators for all of the above (see *Regenerating*). |

### Android integration

Copy `android/drawable`, `android/mipmap-anydpi-v26` and `android/values` into `app/src/main/res/`. If the app already has a `values/` resource with the same name, merge it instead of copying over it. The foreground mark is about 46 dp wide, with a maximum radius of 23.6 dp from centre, so it sits well inside the 66 dp safe zone. The gradients use `aapt:attr`, which builds fine with minSdk 24+; adaptive icons need API 26+.

### Web integration

```html
<link rel="icon" href="/favicon.ico" sizes="48x48">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<meta property="og:image" content="/og-image.png">
<meta name="theme-color" content="#2E6BFF">
```

## Colour

| Token | Hex | Use |
| --- | --- | --- |
| `brand-blue-400` (gradient start) | `#4F8CFF` | Icon gradient, top-left |
| `brand-blue-600` (gradient end) | `#2E6BFF` | Icon gradient, bottom-right; `theme-color`; primary actions |
| `brand-blue-500` (solid fallback) | `#3F7CFF` | Where a gradient is impossible (Android colour resource, splash) |
| Mark white | `#FFFFFF` → `#F1F5FF` | Mark fill (very subtle vertical gradient in the app icon) |
| Ink | `#0A1030` | Wordmark on light |
| Paper | `#F4F6FF` | Wordmark on dark |
| OG background | `#10235F` → `#070C2A` | Social card, with a `#4F8CFF` glow behind the icon |
| Tagline on dark | `#A8C6FF` | Secondary text on dark |

The icon gradient is linear at 135°, from `#4F8CFF` (top-left) to `#2E6BFF` (bottom-right). It adds a soft top-left specular highlight (white, 16% → 0) and a faint `#1F4FE0` vignette at the bottom-right. The mark has a soft blue drop shadow.

**Contrast (WCAG 2.x, white mark on the gradient):** 3.22:1 at `#4F8CFF`, the lightest stop, and 4.50:1 at `#2E6BFF`, so the mark is at least 3:1 everywhere. Don't make the start stop lighter than about `#4C8DFF`: `#5AA2FF` only reaches 2.61:1.

## Typography

- **Wordmark:** Instrument Serif Regular, lowercase, tracking −8/1000. Always set "norsumi" in lowercase.
- **UI / tagline:** Geist (Regular / Medium).

## Clear space and minimum size

- **Clear space:** keep at least ¼ of the icon's width clear on every side. For the wordmark, keep the eye-to-eye distance of the mark (about 30% of the tile height) clear.
- **Minimum size:** the icon down to 16 px (use `favicon.svg`, whose mark is larger). The mark alone down to 12 px. The wordmark down to 20 px tall.

## Don'ts

- Don't recolour the elephant to anything other than white on blue, or single-colour `currentColor`. Don't add cheeks, blush or eye sparkles.
- Don't add outlines, rotate, stretch, or place the mark on busy imagery without the blue tile.
- Don't rebuild the wordmark in another serif. The SVGs contain outlined text and need no font.

## Regenerating

Every asset is generated from code in `scripts/`:

- `geo.py`: boolean-geometry helpers.
- `cute.py`: the elephant's parameters (`P` dict).
- `build.py`: writes all SVG and XML files.
- `render_all.sh`: rasterises the PNGs, ICO and previews.

```bash
python3 -m venv .venv && .venv/bin/pip install picosvg skia-pathops fonttools uharfbuzz
# fonts: Instrument Serif (github.com/google/fonts ofl/instrumentserif) and Geist
# (github.com/vercel/geist-font releases) unpacked into $FONTS:
#   $FONTS/InstrumentSerif-Regular.ttf, $FONTS/geist/geist-font/Geist/ttf/Geist-{Regular,Medium}.ttf
brew install resvg imagemagick
PYTHON=.venv/bin/python brand/scripts/render_all.sh brand "$FONTS" /tmp/norsumi-brand
```

To tweak the character (ear tilt, eye size, trunk curl), edit `P` in `scripts/cute.py`. `hl` > 0 re-enables eye highlights, but they are off by brand decision. Brand colours live at the top of `scripts/build.py`.
