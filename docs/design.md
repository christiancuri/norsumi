# norsumi design language

norsumi turns a messy camera roll of screenshots into a calm, beautiful
library. The UI should feel like a premium editorial product: quiet chrome,
content first, generous whitespace, confident typography, tactile motion.
Mascot: a cute baby elephant (it never forgets) on a bright blue field.

## Brand

- Name is always lowercase: **norsumi**.
- Tagline: "Every screenshot, remembered."
- Primary: **Norsumi Blue**. The logo is a white baby-elephant mark on a
  bright blue gradient squircle (`#4F8CFF` → `#2E6BFF`, 135°, top-left →
  bottom-right; solid fallback `#3F7CFF`). Assets live in `brand/` (see
  `brand/README.md`); never redraw the mark in code, import the SVGs.

## Color tokens

| Token                       | Light           | Dark            |
| --------------------------- | --------------- | --------------- |
| background                  | `#F6F7FB`       | `#07080C`       |
| surface (cards)             | `#FFFFFF`       | `#10121A`       |
| surface-2 (sidebar, inputs) | `#EEF0F6`       | `#161925`       |
| border                      | `#E3E6EF`       | `#232738`       |
| foreground                  | `#0A0D17`       | `#EEF0F8`       |
| muted-foreground            | `#626A80`       | `#8B92A8`       |
| primary                     | `#2E6BFF`       | `#5B8FFF`       |
| primary-foreground          | `#FFFFFF`       | `#FFFFFF`       |
| ring                        | `#2E6BFF` @ 40% | `#5B8FFF` @ 50% |
| success                     | `#16A36A`       | `#3DD68C`       |
| warning                     | `#D97706`       | `#FBBF24`       |
| destructive                 | `#E5484D`       | `#FF6369`       |

Category palette names (from `CATEGORY_COLORS`) map to Tailwind's 500 shade
for the dot/emoji badge, 100 (light) / 950 (dark) for chip backgrounds.

## Typography

- UI: **Geist** (fallback Inter, system-ui). Android: Geist bundled as a font
  resource (or Inter if unavailable).
- Display / big titles: **Instrument Serif** (regular + italic). Used for
  page titles ("Instagram › _Restaurants_"), empty states and the landing
  hero. Never for body text.
- Mono (OCR text, metadata): **Geist Mono**.
- Scale: 12 / 13 / 14 (body) / 16 / 20 / 28 / 40 / 56 / 72 (hero).
- Tight tracking on display sizes (-0.02em), numbers tabular.

## Shape, depth, motion

- Radius: 10 (controls), 16 (cards), 24 (sheets/dialogs), full (chips).
- Cards: 1px border, no heavy shadows; on hover lift 2px with a soft shadow
  `0 8px 30px -12px rgb(10 13 23 / 0.25)`.
- Glass top bar: background at 72% opacity + `backdrop-blur(16px)`.
- Motion: 180–260ms, easing `cubic-bezier(0.22, 1, 0.36, 1)`; respect
  reduced motion. Items appear with a short fade+rise stagger. Pending items
  show a subtle shimmer sweep and a "Thinking…" label.

## Core layouts

- **Library (home)**: masonry grid of cards. Screenshot cards show the image
  at its real aspect ratio with the `dominantColor` as placeholder, then
  title (2 lines), source favicon/app badge, category chip. Link cards show
  og:image (if any), domain + favicon, title, summary. Notes are text cards
  with a serif first line.
- **Navigation (web)**: left sidebar (logo, search ⌘K, All / Screenshots /
  Links / Notes / Favorites / Archive, then the category tree with emoji +
  counts, collapsible roots). **Android**: bottom navigation (Library,
  Categories, Search, Settings) + FAB for "New note / Paste link".
- **Category page**: serif breadcrumb title, description, child chips row,
  then the grid.
- **Item detail**: web = large dialog/sheet with the image on the left (zoom
  on click) and an editable panel on the right (title, summary, source,
  category picker, tags, entities as actionable chips — places open Maps,
  accounts open profiles, urls open sites — note, extracted text collapsible,
  actions: favorite, archive, reprocess, delete). Android = full screen with
  shared-element image, same panel as a draggable bottom sheet.
- **Empty states**: elephant mark, serif headline, one-line guidance.
