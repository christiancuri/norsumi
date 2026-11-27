// Deterministic placeholder art rendered as inline SVG data URIs. Used by the
// mock backend so the gallery looks like a real library without any network.

export type ScreenshotTemplate =
  | 'instagram-post'
  | 'instagram-profile'
  | 'tweet'
  | 'youtube'
  | 'article'
  | 'maps'
  | 'chat'
  | 'code';

export interface Art {
  url: string;
  width: number;
  height: number;
  dominantColor: string;
}

interface ScreenshotOptions {
  seed: number;
  title: string;
  subtitle?: string;
  handle?: string;
  palette: [string, string];
}

type Rng = () => number;
type Rgb = [number, number, number];

const FONT = '-apple-system, system-ui, sans-serif';
const MONO = 'ui-monospace, Menlo, monospace';
const SERIF = 'Georgia, serif';

// ---------------------------------------------------------------- helpers

function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(rng: Rng, list: readonly T[]): T {
  return list[Math.floor(rng() * list.length)] as T;
}

function range(rng: Rng, min: number, max: number): number {
  return min + rng() * (max - min);
}

function r1(n: number): number {
  return Math.round(n * 10) / 10;
}

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function parseHex(hex: string): Rgb {
  let v = hex.replace('#', '');
  if (v.length === 3) {
    v = v
      .split('')
      .map((c) => c + c)
      .join('');
  }
  const n = Number.parseInt(v, 16) || 0;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function toHex([r, g, b]: Rgb): string {
  const h = (x: number) =>
    Math.max(0, Math.min(255, Math.round(x)))
      .toString(16)
      .padStart(2, '0');
  return `#${h(r)}${h(g)}${h(b)}`;
}

function mix(a: string, b: string, t: number): string {
  const x = parseHex(a);
  const y = parseHex(b);
  return toHex([
    x[0] + (y[0] - x[0]) * t,
    x[1] + (y[1] - x[1]) * t,
    x[2] + (y[2] - x[2]) * t,
  ]);
}

const lighten = (c: string, t: number) => mix(c, '#ffffff', t);
const darken = (c: string, t: number) => mix(c, '#000000', t);

/** Simple char-count word wrap; the last line gets an ellipsis on overflow. */
function wrap(text: string, max: number, maxLines: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (next.length > max && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  if (lines.length > maxLines) {
    const kept = lines.slice(0, maxLines);
    const last = kept[maxLines - 1] ?? '';
    kept[maxLines - 1] =
      `${last.slice(0, Math.max(0, max - 1)).replace(/\s+\S*$/, '')}…`;
    return kept;
  }
  return lines;
}

interface TextOpts {
  w?: number;
  a?: 'middle' | 'end';
  f?: string;
  o?: number;
  i?: boolean;
}

function txt(
  x: number,
  y: number,
  s: string,
  size: number,
  fill: string,
  o: TextOpts = {},
): string {
  const attrs = [
    o.w ? ` font-weight="${o.w}"` : '',
    o.a ? ` text-anchor="${o.a}"` : '',
    o.f ? ` font-family="${o.f}"` : '',
    o.o !== undefined ? ` opacity="${o.o}"` : '',
    o.i ? ' font-style="italic"' : '',
  ].join('');
  return `<text x="${r1(x)}" y="${r1(y)}" font-size="${size}" fill="${fill}"${attrs}>${esc(s)}</text>`;
}

function rect(
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  fill: string,
  extra = '',
): string {
  return `<rect x="${r1(x)}" y="${r1(y)}" width="${r1(w)}" height="${r1(h)}"${r ? ` rx="${r}"` : ''} fill="${fill}"${extra}/>`;
}

function circle(
  cx: number,
  cy: number,
  r: number,
  fill: string,
  extra = '',
): string {
  return `<circle cx="${r1(cx)}" cy="${r1(cy)}" r="${r1(r)}" fill="${fill}"${extra}/>`;
}

function lin(id: string, a: string, b: string, vertical = true): string {
  const dir = vertical ? 'x2="0" y2="1"' : 'x2="1" y2="1"';
  return `<linearGradient id="${id}" ${dir}><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>`;
}

/** 24x24 stroke icons. */
const ICON = {
  heart:
    'M12 20s-7.5-4.6-9.3-9.2C1.4 7.4 4 4.5 7 4.5c2.1 0 3.6 1.2 5 3 1.4-1.8 2.9-3 5-3 3 0 5.6 2.9 4.3 6.3C19.5 15.4 12 20 12 20z',
  comment:
    'M20.5 11.5a8.5 8.5 0 1 1-4-7.2 8.5 8.5 0 0 1 4 7.2zM20.5 20.5l-2.2-4.3',
  send: 'M21.5 3 3 10.2l7.3 2.9L13.8 21z M21.5 3 10.3 13.1',
  bookmark: 'M6 3.5h12v17l-6-5.2-6 5.2z',
  home: 'M3.5 10.5 12 3.5l8.5 7V20.5h-5.5v-6h-6v6H3.5z',
  search: 'M10.5 17.5a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM15.5 15.5l5 5',
  plus: 'M4 4h16v16H4zM12 8v8M8 12h8',
  reels: 'M4 4h16v16H4zM4 8.5h16M10 11l5 2.7-5 2.8z',
  back: 'M15 4.5 7.5 12l7.5 7.5',
  repost: 'M7 7h10v6M14 10l3 3 3-3M17 17H7v-6M10 14l-3-3-3 3',
  share: 'M12 3.5v12M7.5 8 12 3.5 16.5 8M5 13v7h14v-7',
  menu: 'M4 7h16M4 12h16M4 17h16',
} as const;

function icon(
  d: string,
  x: number,
  y: number,
  color: string,
  scale = 1,
  sw = 1.8,
): string {
  return `<path d="${d}" transform="translate(${r1(x)} ${r1(y)})${scale !== 1 ? ` scale(${scale})` : ''}" fill="none" stroke="${color}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"/>`;
}

function svgDoc(
  w: number,
  h: number,
  vw: number,
  vh: number,
  body: string,
): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${vw} ${vh}" font-family="${FONT}">${body}</svg>`;
}

function dataUri(svg: string): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function statusBar(fg: string): string {
  return [
    txt(54, 33, '9:41', 16, fg, { w: 600, a: 'middle' }),
    rect(137, 11, 116, 34, 17, '#000'),
    rect(296, 25, 3, 5, 1, fg),
    rect(300.5, 23, 3, 7, 1, fg),
    rect(305, 21, 3, 9, 1, fg),
    rect(309.5, 19, 3, 11, 1, fg),
    `<path d="M318 23.5a9 9 0 0 1 12 0M320.5 26.3a5 5 0 0 1 7 0" fill="none" stroke="${fg}" stroke-width="1.8" stroke-linecap="round"/>`,
    circle(324, 29, 1.5, fg),
    rect(338, 19, 25, 12, 3.5, 'none', ` stroke="${fg}" stroke-opacity=".4"`),
    rect(340, 21, 18, 8, 2, fg),
    rect(364.5, 23, 1.6, 4, 0.8, fg, ' opacity=".4"'),
  ].join('');
}

function homeIndicator(fg: string): string {
  return rect(128, 832, 134, 5, 2.5, fg);
}

function avatar(
  id: string,
  cx: number,
  cy: number,
  r: number,
  pal: [string, string],
  letter: string,
): string {
  return (
    `<defs>${lin(id, lighten(pal[0], 0.1), darken(pal[1], 0.15), false)}</defs>` +
    circle(cx, cy, r, `url(#${id})`) +
    txt(cx, cy + r * 0.36, letter.toUpperCase(), r, '#fff', {
      w: 600,
      a: 'middle',
    })
  );
}

function initial(s: string | undefined, fallback = 'N'): string {
  const m = (s ?? '').match(/[\p{L}\p{N}]/u);
  return m ? m[0] : fallback;
}

function prettyName(handle: string): string {
  return handle
    .replace(/^@/, '')
    .split(/[._-]+/)
    .filter(Boolean)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(' ');
}

// ---------------------------------------------------------------- scenes

type SceneKind = 'food' | 'landscape' | 'portrait' | 'city';
const SCENES: readonly SceneKind[] = ['food', 'landscape', 'portrait', 'city'];

/** A photo-like composition inside a nested (clipping) <svg>. */
function scene(
  rng: Rng,
  pal: [string, string],
  x: number,
  y: number,
  w: number,
  h: number,
  id: string,
  kind: SceneKind = pick(rng, SCENES),
): string {
  const [a, b] = pal;
  const p: string[] = [];
  const defs: string[] = [];
  const m = Math.min(w, h);

  if (kind === 'food') {
    defs.push(lin(`${id}b`, darken(mix(a, '#6b4a33', 0.55), 0.2), '#2a1d16'));
    defs.push(
      `<radialGradient id="${id}f"><stop offset="0" stop-color="${lighten(a, 0.35)}"/><stop offset="1" stop-color="${darken(a, 0.25)}"/></radialGradient>`,
    );
    p.push(rect(0, 0, w, h, 0, `url(#${id}b)`));
    const cx = w * range(rng, 0.42, 0.58);
    const cy = h * range(rng, 0.45, 0.58);
    const r = m * 0.4;
    p.push(circle(cx + 10, cy + 14, r, '#000', ' opacity=".35"'));
    p.push(circle(cx, cy, r, '#efe9e1'));
    p.push(circle(cx, cy, r * 0.8, '#faf7f2'));
    p.push(circle(cx, cy, r * 0.62, `url(#${id}f)`));
    for (let i = 0; i < 7; i++) {
      const ang = rng() * Math.PI * 2;
      const d = rng() * r * 0.45;
      const color = pick(rng, [b, lighten(b, 0.2), darken(a, 0.2), '#f4d9a6']);
      p.push(
        `<ellipse cx="${r1(cx + Math.cos(ang) * d)}" cy="${r1(cy + Math.sin(ang) * d)}" rx="${r1(r * range(rng, 0.08, 0.16))}" ry="${r1(r * range(rng, 0.06, 0.12))}" fill="${color}" opacity=".9"/>`,
      );
    }
    for (let i = 0; i < 6; i++) {
      const ang = rng() * Math.PI * 2;
      const d = rng() * r * 0.5;
      p.push(
        circle(
          cx + Math.cos(ang) * d,
          cy + Math.sin(ang) * d,
          r * 0.035,
          pick(rng, ['#5f9b3c', '#7fb34c', '#3f7a2a']),
        ),
      );
    }
    p.push(
      circle(w * 0.92, h * 0.1, m * 0.2, '#fff', ' opacity=".12"'),
      circle(w * 0.92, h * 0.1, m * 0.15, '#fff', ' opacity=".08"'),
      rect(w * 0.05, h * 0.68, m * 0.04, h * 0.36, m * 0.02, '#c9c3bb'),
    );
  } else if (kind === 'landscape') {
    defs.push(lin(`${id}s`, lighten(b, 0.45), lighten(a, 0.25)));
    p.push(rect(0, 0, w, h, 0, `url(#${id}s)`));
    p.push(
      circle(
        w * range(rng, 0.25, 0.75),
        h * range(rng, 0.2, 0.35),
        m * 0.12,
        '#fff7e3',
        ' opacity=".95"',
      ),
    );
    const layers = 3;
    for (let l = 0; l < layers; l++) {
      const base = h * (0.45 + l * 0.13);
      let d = `M0 ${r1(h)} L0 ${r1(base)}`;
      const steps = 5;
      for (let s = 1; s <= steps; s++) {
        const px = (w / steps) * s;
        const py = base - range(rng, -0.02, 0.16) * h;
        d += ` L${r1(px - w / steps / 2)} ${r1(py)} L${r1(px)} ${r1(base + range(rng, -0.03, 0.04) * h)}`;
      }
      d += ` L${r1(w)} ${r1(h)}Z`;
      p.push(
        `<path d="${d}" fill="${darken(mix(a, b, 0.3 + l * 0.2), 0.15 + l * 0.2)}"/>`,
      );
    }
    p.push(
      rect(0, h * 0.86, w, h * 0.14, 0, darken(b, 0.55), ' opacity=".85"'),
    );
  } else if (kind === 'portrait') {
    defs.push(lin(`${id}p`, lighten(a, 0.15), darken(b, 0.1), false));
    p.push(rect(0, 0, w, h, 0, `url(#${id}p)`));
    for (let i = 0; i < 7; i++) {
      p.push(
        circle(
          rng() * w,
          rng() * h * 0.7,
          m * range(rng, 0.04, 0.12),
          '#fff',
          ` opacity="${r1(range(rng, 0.08, 0.25))}"`,
        ),
      );
    }
    const skin = pick(rng, ['#e0ac8a', '#c68863', '#8d5a3b', '#f1c7a5']);
    const hair = pick(rng, ['#2b1d16', '#4a2f1f', '#1a1a1a', '#7a4d2a']);
    const cx = w / 2;
    p.push(
      `<ellipse cx="${r1(cx)}" cy="${r1(h * 1.02)}" rx="${r1(w * 0.38)}" ry="${r1(h * 0.3)}" fill="${darken(b, 0.45)}"/>`,
      rect(
        cx - m * 0.07,
        h * 0.55,
        m * 0.14,
        h * 0.2,
        m * 0.05,
        darken(skin, 0.1),
      ),
      rng() > 0.5
        ? `<ellipse cx="${r1(cx)}" cy="${r1(h * 0.45 + m * 0.06)}" rx="${r1(m * 0.2)}" ry="${r1(m * 0.26)}" fill="${hair}"/>`
        : '',
      `<ellipse cx="${r1(cx)}" cy="${r1(h * 0.45)}" rx="${r1(m * 0.16)}" ry="${r1(m * 0.2)}" fill="${skin}"/>`,
      hairCap(cx, h * 0.45, m * 0.16, m * 0.2, hair),
    );
  } else {
    defs.push(lin(`${id}c`, lighten(a, 0.3), mix(b, '#ffb36b', 0.35)));
    p.push(rect(0, 0, w, h, 0, `url(#${id}c)`));
    let bx = -10;
    while (bx < w) {
      const bw = range(rng, w * 0.09, w * 0.2);
      const bh = range(rng, h * 0.3, h * 0.75);
      const fill = darken(mix(a, b, rng()), range(rng, 0.45, 0.7));
      p.push(rect(bx, h - bh, bw - 2, bh, 0, fill));
      for (let i = 0; i < 4; i++) {
        p.push(
          rect(
            bx + range(rng, 3, bw - 10),
            h - bh + range(rng, 8, bh - 10),
            m * 0.02,
            m * 0.025,
            0,
            '#ffd98a',
            ' opacity=".8"',
          ),
        );
      }
      bx += bw;
    }
  }

  defs.push(
    `<radialGradient id="${id}g" cx=".2" cy=".1" r="1"><stop offset="0" stop-color="#fff" stop-opacity=".22"/><stop offset=".6" stop-color="#fff" stop-opacity="0"/></radialGradient>`,
  );
  p.push(rect(0, 0, w, h, 0, `url(#${id}g)`));
  return `<svg x="${r1(x)}" y="${r1(y)}" width="${r1(w)}" height="${r1(h)}" viewBox="0 0 ${r1(w)} ${r1(h)}"><defs>${defs.join('')}</defs>${p.join('')}</svg>`;
}

/** Hair covering the top of a head ellipse, with a curved fringe. */
function hairCap(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  fill: string,
): string {
  const y = cy - ry * 0.12;
  const l = cx - rx - 2;
  const r = cx + rx + 2;
  return `<path d="M${r1(l)} ${r1(y)}A${r1(rx + 2)} ${r1(ry + 3)} 0 0 1 ${r1(r)} ${r1(y)}Q${r1(cx + rx * 0.3)} ${r1(cy - ry * 0.75)} ${r1(l)} ${r1(y)}Z" fill="${fill}"/>`;
}

/** Cheap tile for grids/strips: gradient + one blob. */
function tile(
  rng: Rng,
  pal: [string, string],
  x: number,
  y: number,
  w: number,
  h: number,
  id: string,
): string {
  const c1 = mix(pal[0], pal[1], rng());
  const c2 = darken(mix(pal[1], pal[0], rng()), range(rng, 0.1, 0.45));
  return (
    `<defs>${lin(id, lighten(c1, range(rng, 0, 0.35)), c2, rng() > 0.5)}</defs>` +
    rect(x, y, w, h, 0, `url(#${id})`) +
    `<ellipse cx="${r1(x + w * range(rng, 0.3, 0.7))}" cy="${r1(y + h * range(rng, 0.4, 0.75))}" rx="${r1(w * range(rng, 0.2, 0.4))}" ry="${r1(h * range(rng, 0.12, 0.3))}" fill="${lighten(c1, 0.5)}" opacity=".45"/>`
  );
}

// ---------------------------------------------------------------- templates

const IG_RING = `<defs><linearGradient id="igr" x2="1" y2="1"><stop offset="0" stop-color="#feda75"/><stop offset=".4" stop-color="#fa7e1e"/><stop offset=".7" stop-color="#d62976"/><stop offset="1" stop-color="#4f5bd5"/></linearGradient></defs>`;

function igTabBar(pal: [string, string]): string {
  return [
    rect(0, 790, 390, 55, 0, '#fff'),
    rect(0, 790, 390, 0.5, 0, '#dbdbdb'),
    `<path d="${ICON.home}" transform="translate(22 800)" fill="#000"/>`,
    icon(ICON.search, 98, 800, '#000'),
    icon(ICON.plus, 183, 800, '#000'),
    icon(ICON.reels, 268, 800, '#000'),
    circle(356, 812, 12, pal[0], ' stroke="#000" stroke-width="1.5"'),
  ].join('');
}

function instagramPost(rng: Rng, o: ScreenshotOptions): string {
  const handle = o.handle ?? 'norsumi';
  const pal = o.palette;
  const likes = Math.floor(range(rng, 400, 48000)).toLocaleString('en-US');
  const lines = wrap(`${handle} ${o.title}`, 46, 2);
  const caption = lines
    .map((l, i) => {
      const y = 722 + i * 18;
      if (i === 0 && l.startsWith(handle)) {
        return `<text x="14" y="${y}" font-size="14" fill="#000"><tspan font-weight="600">${esc(handle)}</tspan>${esc(l.slice(handle.length))}</text>`;
      }
      return txt(14, y, l, 14, '#000');
    })
    .join('');
  const dots = rng() > 0.4;
  return [
    rect(0, 0, 390, 845, 0, '#fff'),
    IG_RING,
    statusBar('#000'),
    txt(16, 80, 'Instagram', 26, '#000', { w: 700, i: true }),
    icon(ICON.heart, 316, 62, '#000'),
    icon(ICON.send, 354, 62, '#000'),
    circle(34, 122, 18, 'none', ' stroke="url(#igr)" stroke-width="2.2"'),
    avatar('ia', 34, 122, 14.5, pal, initial(handle)),
    txt(62, o.subtitle ? 118 : 127, handle, 14, '#000', { w: 600 }),
    o.subtitle
      ? txt(62, 135, wrap(o.subtitle, 40, 1)[0] ?? '', 12, '#000')
      : '',
    txt(372, 127, '•••', 13, '#000', { a: 'end' }),
    scene(rng, pal, 0, 150, 390, 488, 'ps'),
    icon(ICON.heart, 14, 652, '#000', 1.05),
    icon(ICON.comment, 54, 652, '#000', 1.05),
    icon(ICON.send, 94, 652, '#000', 1.05),
    icon(ICON.bookmark, 352, 652, '#000', 1.05),
    dots
      ? circle(186, 664, 3, '#0095f6') +
        circle(195, 664, 2.5, '#c7c7c7') +
        circle(204, 664, 2.5, '#c7c7c7')
      : '',
    txt(14, 700, `${likes} likes`, 14, '#000', { w: 600 }),
    caption,
    txt(
      14,
      722 + lines.length * 18 + 4,
      `View all ${Math.floor(range(rng, 12, 400))} comments`,
      14,
      '#737373',
    ),
    txt(
      14,
      722 + lines.length * 18 + 24,
      `${Math.floor(range(rng, 2, 9))} days ago`,
      11,
      '#737373',
    ),
    igTabBar(pal),
    homeIndicator('#000'),
  ].join('');
}

function instagramProfile(rng: Rng, o: ScreenshotOptions): string {
  const handle = o.handle ?? 'norsumi';
  const pal = o.palette;
  const k = (min: number, max: number) => {
    const n = range(rng, min, max);
    return n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(Math.floor(n));
  };
  const bio = wrap(o.subtitle ?? '', 46, 3);
  const grid: string[] = [];
  const tw = 129;
  const th = 172;
  for (let i = 0; i < 6; i++) {
    const col = i % 3;
    const row = Math.floor(i / 3);
    grid.push(
      tile(rng, pal, col * (tw + 1.5), 500 + row * (th + 1.5), tw, th, `g${i}`),
    );
  }
  const highlights: string[] = [];
  const hl = ['Menu', 'Travel', 'Team', 'Events', 'Press'];
  for (let i = 0; i < 5; i++) {
    const cx = 44 + i * 76;
    highlights.push(
      circle(cx, 388, 31, '#fff', ' stroke="#dbdbdb" stroke-width="1"'),
      `<g clip-path="url(#hc${i})">${tile(rng, pal, cx - 27, 361, 54, 54, `h${i}`)}</g>`,
      `<clipPath id="hc${i}"><circle cx="${cx}" cy="388" r="27"/></clipPath>`,
      txt(cx, 436, hl[i] ?? '', 11, '#000', { a: 'middle' }),
    );
  }
  return [
    rect(0, 0, 390, 845, 0, '#fff'),
    IG_RING,
    statusBar('#000'),
    txt(16, 82, handle, 21, '#000', { w: 700 }),
    icon(ICON.plus, 312, 64, '#000'),
    icon(ICON.menu, 352, 64, '#000'),
    circle(58, 152, 44, 'none', ' stroke="url(#igr)" stroke-width="2.5"'),
    `<clipPath id="pc"><circle cx="58" cy="152" r="39"/></clipPath>`,
    `<g clip-path="url(#pc)">${scene(rng, pal, 19, 113, 78, 78, 'pa', 'portrait')}</g>`,
    ...[
      [k(40, 900), 'posts', 170],
      [k(2000, 980000), 'followers', 252],
      [k(80, 1200), 'following', 334],
    ].map(
      ([n, l, x]) =>
        txt(Number(x), 148, String(n), 17, '#000', { w: 700, a: 'middle' }) +
        txt(Number(x), 167, String(l), 13, '#000', { a: 'middle' }),
    ),
    txt(16, 222, wrap(o.title, 40, 1)[0] ?? '', 14, '#000', { w: 600 }),
    ...bio.map((l, i) => txt(16, 241 + i * 18, l, 14, '#000')),
    txt(16, 241 + bio.length * 18, `linktr.ee/${handle}`, 14, '#00376b', {
      w: 600,
    }),
    rect(16, 300, 174, 34, 8, '#0095f6'),
    txt(103, 322, 'Follow', 14, '#fff', { w: 600, a: 'middle' }),
    rect(196, 300, 144, 34, 8, '#efefef'),
    txt(268, 322, 'Message', 14, '#000', { w: 600, a: 'middle' }),
    rect(346, 300, 30, 34, 8, '#efefef'),
    ...highlights,
    rect(0, 498, 390, 1, 0, '#dbdbdb'),
    rect(0, 462, 390, 0.5, 0, '#efefef'),
    `<path d="M50 470h18v18H50zM56 470v18M62 470v18M50 476h18M50 482h18" fill="none" stroke="#000" stroke-width="1.6" transform="translate(4 -1)"/>`,
    icon(ICON.reels, 183, 467, '#737373', 1),
    rect(0, 497, 130, 1.5, 0, '#000'),
    ...grid,
    igTabBar(pal),
    homeIndicator('#000'),
  ].join('');
}

function tweet(rng: Rng, o: ScreenshotOptions): string {
  const handle = (o.handle ?? 'norsumi').replace(/^@/, '');
  const pal = o.palette;
  const body = wrap(
    [o.title, o.subtitle].filter(Boolean).join(' '),
    38,
    o.subtitle ? 9 : 6,
  );
  let y = 186;
  const text = body
    .map((l, i) => txt(16, y + i * 24, l, 17, '#0f1419'))
    .join('');
  y += body.length * 24;
  const media = rng() > 0.35 && body.length < 7;
  let mediaSvg = '';
  if (media) {
    mediaSvg =
      `<clipPath id="tm"><rect x="16" y="${y}" width="358" height="200" rx="16"/></clipPath>` +
      `<g clip-path="url(#tm)">${scene(rng, pal, 16, y, 358, 200, 'tw')}</g>` +
      rect(16, y, 358, 200, 16, 'none', ' stroke="#cfd9de" stroke-width=".8"');
    y += 216;
  } else {
    y += 4;
  }
  const n = (min: number, max: number) => {
    const v = range(rng, min, max);
    return v >= 1000 ? `${(v / 1000).toFixed(1)}K` : String(Math.floor(v));
  };
  const views = n(8000, 900000);
  const replies: string[] = [];
  let ry = y + 128;
  for (let i = 0; i < 2 && ry < 720; i++) {
    replies.push(
      avatar(
        `ra${i}`,
        36,
        ry + 18,
        18,
        [pal[1], pal[0]],
        pick(rng, ['M', 'J', 'S', 'R', 'K']),
      ),
      rect(64, ry + 6, range(rng, 70, 120), 10, 5, '#0f1419', ' opacity=".85"'),
      rect(64 + 130, ry + 6, 70, 10, 5, '#536471', ' opacity=".4"'),
      rect(
        64,
        ry + 26,
        range(rng, 220, 300),
        9,
        4.5,
        '#536471',
        ' opacity=".35"',
      ),
      rect(
        64,
        ry + 42,
        range(rng, 120, 220),
        9,
        4.5,
        '#536471',
        ' opacity=".35"',
      ),
      rect(0, ry + 70, 390, 0.6, 0, '#eff3f4'),
    );
    ry += 84;
  }
  return [
    rect(0, 0, 390, 845, 0, '#fff'),
    statusBar('#0f1419'),
    icon(ICON.back, 14, 64, '#0f1419'),
    txt(195, 82, 'Post', 17, '#0f1419', { w: 700, a: 'middle' }),
    rect(0, 100, 390, 0.6, 0, '#eff3f4'),
    avatar('ta', 40, 136, 22, pal, initial(handle)),
    txt(72, 131, prettyName(handle), 15, '#0f1419', { w: 700 }),
    circle(80 + prettyName(handle).length * 8.4, 126.5, 7.5, '#1d9bf0'),
    `<path d="M${r1(76.5 + prettyName(handle).length * 8.4)} 126.5l2.5 2.5 4.5-4.5" fill="none" stroke="#fff" stroke-width="1.6"/>`,
    txt(72, 150, `@${handle}`, 15, '#536471'),
    txt(372, 140, '•••', 13, '#536471', { a: 'end' }),
    text,
    mediaSvg,
    txt(
      16,
      y + 6,
      `9:41 AM · Nov ${Math.floor(range(rng, 2, 26))}, 2026 · `,
      15,
      '#536471',
    ) + txt(220, y + 6, `${views} Views`, 15, '#0f1419', { w: 600 }),
    rect(16, y + 24, 358, 0.6, 0, '#eff3f4'),
    txt(16, y + 52, n(100, 9000), 14, '#0f1419', { w: 700 }),
    txt(58, y + 52, 'Reposts', 14, '#536471'),
    txt(130, y + 52, n(1000, 90000), 14, '#0f1419', { w: 700 }),
    txt(178, y + 52, 'Likes', 14, '#536471'),
    txt(230, y + 52, n(100, 20000), 14, '#0f1419', { w: 700 }),
    txt(274, y + 52, 'Bookmarks', 14, '#536471'),
    rect(16, y + 70, 358, 0.6, 0, '#eff3f4'),
    icon(ICON.comment, 28, y + 80, '#536471', 0.9),
    icon(ICON.repost, 108, y + 80, '#536471', 0.9),
    icon(ICON.heart, 190, y + 80, '#f91880', 0.9).replace(
      'fill="none"',
      'fill="#f91880"',
    ),
    icon(ICON.bookmark, 270, y + 80, '#536471', 0.9),
    icon(ICON.share, 344, y + 80, '#536471', 0.9),
    rect(0, y + 116, 390, 0.6, 0, '#eff3f4'),
    ...replies,
    rect(0, 770, 390, 75, 0, '#fff'),
    rect(0, 770, 390, 0.6, 0, '#eff3f4'),
    rect(16, 780, 358, 38, 19, '#eff3f4'),
    txt(36, 804, 'Post your reply', 15, '#536471'),
    homeIndicator('#0f1419'),
  ].join('');
}

function youtube(rng: Rng, o: ScreenshotOptions): string {
  const pal = o.palette;
  const channel = o.handle ?? 'norsumi';
  const title = wrap(o.title, 34, 2);
  const progress = range(rng, 60, 330);
  const ty = 298;
  const after = ty + (title.length - 1) * 24;
  const recs: string[] = [];
  for (let i = 0; i < 3; i++) {
    const y = after + 236 + i * 104;
    recs.push(
      `<clipPath id="rc${i}"><rect x="12" y="${r1(y)}" width="160" height="90" rx="8"/></clipPath>`,
      `<g clip-path="url(#rc${i})">${tile(rng, pal, 12, y, 160, 90, `r${i}`)}</g>`,
      rect(132, y + 70, 34, 15, 4, '#000', ' opacity=".8"'),
      txt(
        149,
        y + 81.5,
        `${Math.floor(range(rng, 3, 59))}:${String(Math.floor(range(rng, 10, 59)))}`,
        10,
        '#fff',
        { w: 600, a: 'middle' },
      ),
      rect(184, y + 6, range(rng, 150, 190), 10, 5, '#f1f1f1', ' opacity=".9"'),
      rect(184, y + 24, range(rng, 90, 150), 10, 5, '#f1f1f1', ' opacity=".9"'),
      rect(184, y + 46, range(rng, 80, 120), 8, 4, '#aaa', ' opacity=".6"'),
      rect(184, y + 60, range(rng, 60, 100), 8, 4, '#aaa', ' opacity=".6"'),
    );
  }
  const pills = ['24K', 'Share', 'Remix', 'Save'].map((l, i) => {
    const x = 12 + i * 92;
    return (
      rect(x, after + 102, 84, 34, 17, '#272727') +
      txt(x + 42, after + 123, i === 0 ? `▲ ${l}` : l, 13, '#f1f1f1', {
        w: 500,
        a: 'middle',
      })
    );
  });
  return [
    rect(0, 0, 390, 845, 0, '#0f0f0f'),
    statusBar('#fff'),
    scene(rng, pal, 0, 47, 390, 219, 'yv'),
    `<defs><linearGradient id="ys" x2="0" y2="1"><stop offset=".6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".6"/></linearGradient></defs>`,
    rect(0, 47, 390, 219, 0, 'url(#ys)'),
    txt(
      12,
      254,
      `${Math.floor(progress / 22)}:${String(Math.floor(range(rng, 10, 59)))} / 18:47`,
      11,
      '#fff',
      { w: 500 },
    ),
    rect(0, 264, 390, 3, 0, '#fff', ' opacity=".3"'),
    rect(0, 264, progress, 3, 0, '#f00'),
    circle(progress, 265.5, 6, '#f00'),
    ...title.map((l, i) => txt(12, ty + i * 24, l, 18, '#f1f1f1', { w: 700 })),
    txt(
      12,
      after + 22,
      `${(range(rng, 0.1, 4)).toFixed(1)}M views  ${Math.floor(range(rng, 1, 11))}d ago  ...more`,
      12,
      '#aaa',
    ),
    avatar('yc', 30, after + 60, 16, pal, initial(channel)),
    txt(54, after + 65, channel, 14, '#f1f1f1', { w: 600 }),
    txt(
      54 + channel.length * 8 + 8,
      after + 65,
      `${Math.floor(range(rng, 12, 900))}K`,
      12,
      '#aaa',
    ),
    rect(290, after + 43, 88, 34, 17, '#f1f1f1'),
    txt(334, after + 65, 'Subscribe', 13, '#0f0f0f', { w: 600, a: 'middle' }),
    ...pills,
    rect(12, after + 150, 366, 70, 12, '#272727'),
    txt(24, after + 174, 'Comments', 14, '#f1f1f1', { w: 600 }),
    txt(
      100,
      after + 174,
      `${Math.floor(range(rng, 1, 9))}.${Math.floor(range(rng, 0, 9))}K`,
      13,
      '#aaa',
    ),
    circle(36, after + 198, 10, pal[1]),
    rect(54, after + 193, 260, 9, 4.5, '#aaa', ' opacity=".5"'),
    ...recs,
    homeIndicator('#fff'),
  ].join('');
}

function article(rng: Rng, o: ScreenshotOptions): string {
  const pal = o.palette;
  const site = o.handle ?? 'norsumi.com';
  const accent = darken(pal[0], 0.25);
  const head = wrap(o.title, 23, 4);
  let y = 172;
  const parts: string[] = [];
  parts.push(
    txt(
      16,
      140,
      pick(rng, ['FEATURE', 'ANALYSIS', 'GUIDE', 'ESSAY', 'NEWS']),
      11,
      accent,
      { w: 700 },
    ),
  );
  head.forEach((l, i) => {
    parts.push(txt(16, y + i * 34, l, 29, '#111', { w: 700, f: SERIF }));
  });
  y += (head.length - 1) * 34 + 30;
  if (o.subtitle) {
    const dek = wrap(o.subtitle, 42, 3);
    dek.forEach((l, i) => {
      parts.push(txt(16, y + i * 21, l, 16, '#555'));
    });
    y += dek.length * 21 + 10;
  }
  parts.push(
    avatar('aa', 30, y + 4, 14, pal, pick(rng, ['A', 'M', 'L', 'T', 'E'])),
    txt(
      52,
      y + 9,
      `By ${pick(rng, ['Ana Ribeiro', 'Tom Hale', 'Mei Chen', 'Lucas Prado', 'Eva Moss'])} · ${Math.floor(range(rng, 3, 14))} min read`,
      12,
      '#666',
    ),
  );
  y += 30;
  parts.push(scene(rng, pal, 0, y, 390, 210, 'ah'));
  y += 230;
  while (y < 740) {
    const n = Math.floor(range(rng, 3, 6));
    for (let i = 0; i < n && y < 740; i++) {
      const w = i === n - 1 ? range(rng, 120, 260) : range(rng, 320, 358);
      parts.push(rect(16, y, w, 9, 4.5, '#1a1a1a', ' opacity=".16"'));
      y += 18;
    }
    y += 14;
  }
  return [
    rect(0, 0, 390, 845, 0, '#fff'),
    statusBar('#000'),
    icon(ICON.menu, 14, 60, '#111'),
    txt(195, 80, site.replace(/\.(com|org|dev|io|net)$/, ''), 21, '#111', {
      w: 700,
      a: 'middle',
      f: SERIF,
    }),
    icon(ICON.search, 352, 60, '#111'),
    rect(0, 100, 390, 0.6, 0, '#e5e5e5'),
    ...parts,
    rect(0, 752, 390, 93, 0, '#f6f6f6'),
    rect(0, 752, 390, 0.6, 0, '#ddd'),
    rect(16, 762, 358, 44, 12, '#e3e3e8'),
    txt(34, 789, 'aA', 15, '#111', { w: 600 }),
    txt(195, 789, site, 15, '#111', { a: 'middle' }),
    homeIndicator('#000'),
  ].join('');
}

function maps(rng: Rng, o: ScreenshotOptions): string {
  const pal = o.palette;
  const ang = r1(range(rng, -28, 28));
  const streets: string[] = [];
  for (let i = -6; i < 14; i++) {
    const major = i % 3 === 0;
    const sw = major ? 9 : 4.5;
    streets.push(
      `<path d="M${i * 62} -300V1200M-300 ${i * 70}H1000" stroke="#fff" stroke-width="${sw}"/>`,
    );
  }
  const title = wrap(o.title, 26, 2);
  const ty = 538;
  const sub = wrap(o.subtitle ?? '', 44, 2);
  const after = ty + (title.length - 1) * 27;
  const photos: string[] = [];
  for (let i = 0; i < 3; i++) {
    const x = 16 + i * 122;
    photos.push(
      `<clipPath id="mp${i}"><rect x="${x}" y="${after + 158}" width="114" height="110" rx="10"/></clipPath>`,
      `<g clip-path="url(#mp${i})">${tile(rng, pal, x, after + 158, 114, 110, `mt${i}`)}</g>`,
    );
  }
  const rating = range(rng, 4.2, 4.9).toFixed(1);
  return [
    rect(0, 0, 390, 845, 0, '#eef0ea'),
    `<g transform="rotate(${ang} 195 300)">`,
    rect(40, 120, 150, 110, 6, '#cfe7c3'),
    rect(250, 360, 120, 90, 6, '#cfe7c3'),
    `<path d="M-60 520C80 470 170 560 460 470V700H-60Z" fill="#aad3f2"/>`,
    ...streets,
    `<path d="M-200 260C60 300 250 180 600 240" stroke="#f7c65c" stroke-width="12" fill="none"/>`,
    `<path d="M-200 260C60 300 250 180 600 240" stroke="#fde39b" stroke-width="8" fill="none"/>`,
    '</g>',
    txt(
      86,
      186,
      pick(rng, ['Jardim', 'Parque', 'Park', 'Praça']),
      10,
      '#4b7f3f',
      { w: 600 },
    ),
    `<ellipse cx="195" cy="342" rx="11" ry="4" fill="#000" opacity=".25"/>`,
    `<path d="M195 342c-3-10-20-22-20-38a20 20 0 0 1 40 0c0 16-17 28-20 38z" fill="${darken(pal[0], 0.1)}" stroke="#fff" stroke-width="2"/>`,
    circle(195, 304, 7, '#fff'),
    statusBar('#000'),
    rect(16, 56, 358, 50, 25, '#fff', ' stroke="#000" stroke-opacity=".08"'),
    icon(ICON.search, 32, 69, '#5f6368', 0.95),
    txt(66, 87, title[0] ?? '', 16, '#202124'),
    circle(350, 81, 15, pal[1]),
    txt(350, 86.5, initial(o.handle, 'A'), 14, '#fff', { w: 600, a: 'middle' }),
    ...['Restaurants', 'Coffee', 'Hotels', 'Bars'].map((c, i) => {
      const x = 16 + i * 96;
      return (
        rect(
          x,
          118,
          88,
          32,
          16,
          '#fff',
          ' stroke="#000" stroke-opacity=".08"',
        ) + txt(x + 44, 139, c, 13, '#3c4043', { w: 500, a: 'middle' })
      );
    }),
    rect(0, 486, 390, 380, 22, '#fff'),
    rect(0, 486, 390, 380, 22, 'none', ' stroke="#000" stroke-opacity=".08"'),
    rect(177, 496, 36, 5, 2.5, '#dadce0'),
    ...title.map((l, i) => txt(16, ty + i * 27, l, 23, '#202124', { w: 500 })),
    txt(16, after + 26, rating, 14, '#3c4043'),
    txt(42, after + 26, '★★★★★', 14, '#fbbc04'),
    txt(
      118,
      after + 26,
      `(${Math.floor(range(rng, 120, 9000)).toLocaleString('en-US')})`,
      14,
      '#70757a',
    ),
    ...sub.map((l, i) => txt(16, after + 48 + i * 19, l, 14, '#70757a')),
    txt(16, after + 50 + sub.length * 19, 'Open', 14, '#188038', { w: 600 }),
    txt(
      56,
      after + 50 + sub.length * 19,
      `· Closes ${pick(rng, ['10 PM', '11 PM', '12 AM', '6 PM'])}`,
      14,
      '#3c4043',
    ),
    rect(16, after + 100, 120, 40, 20, '#1a73e8'),
    txt(76, after + 125, 'Directions', 14, '#fff', { w: 600, a: 'middle' }),
    ...['Start', 'Call', 'Save'].map((l, i) => {
      const x = 144 + i * 78;
      return (
        rect(x, after + 100, 72, 40, 20, '#fff', ' stroke="#dadce0"') +
        txt(x + 36, after + 125, l, 14, '#1a73e8', { w: 600, a: 'middle' })
      );
    }),
    ...photos,
    homeIndicator('#000'),
  ].join('');
}

const CHAT_FILLER = [
  'omg yes',
  'saving this!!',
  'we have to go before the trip',
  'Saturday works for me',
  'can you send the address?',
  'booked for 8pm',
  'haha that’s the one I told you about',
];

function chat(rng: Rng, o: ScreenshotOptions): string {
  const pal = o.palette;
  const who = o.handle ?? 'Marina';
  const msgs: Array<{ me: boolean; text: string }> = [
    { me: false, text: pick(rng, CHAT_FILLER) },
    { me: false, text: o.title },
  ];
  if (o.subtitle) msgs.push({ me: true, text: o.subtitle });
  msgs.push({ me: true, text: pick(rng, CHAT_FILLER) });
  msgs.push({ me: false, text: pick(rng, CHAT_FILLER) });
  msgs.push({ me: true, text: pick(rng, CHAT_FILLER) });

  const parts: string[] = [];
  let y = 168;
  for (const m of msgs) {
    if (y > 700) break;
    const lines = wrap(m.text, 30, 5);
    const longest = Math.max(...lines.map((l) => l.length));
    const w = Math.min(270, longest * 8.1 + 28);
    const h = lines.length * 21 + 16;
    const x = m.me ? 374 - w : 16;
    parts.push(rect(x, y, w, h, 18, m.me ? '#0a84ff' : '#e9e9eb'));
    lines.forEach((l, i) => {
      parts.push(txt(x + 14, y + 26 + i * 21, l, 16, m.me ? '#fff' : '#000'));
    });
    y += h + 8;
  }
  parts.push(txt(370, y + 8, 'Read 9:38 AM', 11, '#8e8e93', { a: 'end' }));
  return [
    rect(0, 0, 390, 845, 0, '#fff'),
    statusBar('#000'),
    rect(0, 47, 390, 82, 0, '#f6f6f6'),
    rect(0, 129, 390, 0.6, 0, '#d1d1d6'),
    icon(ICON.back, 8, 66, '#0a84ff', 1.1, 2.2),
    txt(36, 87, String(Math.floor(range(rng, 2, 40))), 17, '#0a84ff'),
    avatar('ca', 195, 78, 21, pal, initial(who)),
    txt(195, 118, who, 12, '#000', { a: 'middle' }),
    txt(195, 154, 'Today 9:12 AM', 11, '#8e8e93', { a: 'middle', w: 500 }),
    ...parts,
    circle(32, 794, 16, '#e9e9eb'),
    `<path d="M32 786v16M24 794h16" stroke="#8e8e93" stroke-width="2"/>`,
    rect(58, 777, 316, 34, 17, '#fff', ' stroke="#d1d1d6"'),
    txt(74, 799, 'iMessage', 16, '#c7c7cc'),
    homeIndicator('#000'),
  ].join('');
}

function code(rng: Rng, o: ScreenshotOptions): string {
  const pal = o.palette;
  const bg = mix('#17181f', pal[0], 0.06);
  const colors = [
    '#c678dd',
    '#61afef',
    '#98c379',
    '#d19a66',
    '#abb2bf',
    '#e5c07b',
    '#56b6c2',
    lighten(pal[0], 0.2),
  ];
  const parts: string[] = [];
  const nums: string[] = [];
  const start = 132;
  const lh = 20;
  let indent = 0;
  const first = [
    o.subtitle ? `// ${o.subtitle}` : '',
    `import { useEffect, useState } from 'react';`,
    '',
  ].filter((l, i) => i !== 0 || l);
  for (let i = 0; i < 30; i++) {
    const y = start + i * lh;
    nums.push(`<text x="34" y="${y}">${i + 1}</text>`);
    const fixed = first[i];
    if (fixed !== undefined) {
      if (fixed) {
        const comment = fixed.startsWith('//');
        parts.push(
          txt(
            48,
            y,
            wrap(fixed, 44, 1)[0] ?? '',
            12,
            comment ? '#7f848e' : '#c678dd',
            { f: MONO, i: comment },
          ),
        );
      }
      continue;
    }
    if (rng() < 0.12) continue;
    if (rng() < 0.25 && indent < 3) indent++;
    else if (rng() < 0.25 && indent > 0) indent--;
    let x = 48 + indent * 16;
    const tokens = Math.floor(range(rng, 1, 5));
    for (let t = 0; t < tokens && x < 360; t++) {
      const w = Math.min(range(rng, 18, 80), 370 - x);
      parts.push(rect(x, y - 9, w, 9, 3, pick(rng, colors)));
      x += w + 7;
    }
  }
  const file = wrap(o.title, 34, 1)[0] ?? '';
  return [
    rect(0, 0, 390, 845, 0, bg),
    statusBar('#fff'),
    rect(0, 47, 390, 60, 0, darken(bg, 0.25)),
    icon(ICON.back, 12, 62, '#d7dae0'),
    txt(195, 74, file, 15, '#e6e6e6', { w: 600, a: 'middle', f: MONO }),
    txt(195, 94, o.handle ?? 'main', 11, '#7f848e', { a: 'middle' }),
    rect(0, 107, 390, 0.6, 0, '#2c313a'),
    `<g font-family="${MONO}" font-size="11" fill="#4b5263" text-anchor="end">${nums.join('')}</g>`,
    `<g opacity=".9">${parts.join('')}</g>`,
    rect(42, 132 + 9 * lh - 14, 2, 18, 0, '#528bff'),
    rect(0, 760, 390, 85, 0, darken(bg, 0.25)),
    rect(0, 760, 390, 0.6, 0, '#2c313a'),
    circle(24, 784, 5, pal[0]),
    txt(36, 788, 'main', 12, '#abb2bf', { f: MONO }),
    txt(374, 788, 'Ln 10, Col 7  TypeScript', 12, '#7f848e', {
      a: 'end',
      f: MONO,
    }),
    homeIndicator('#fff'),
  ].join('');
}

const TEMPLATES: Record<
  ScreenshotTemplate,
  {
    draw: (rng: Rng, o: ScreenshotOptions) => string;
    tone: (p: [string, string]) => string;
  }
> = {
  'instagram-post': {
    draw: instagramPost,
    tone: (p) => mix('#f4f4f4', p[0], 0.25),
  },
  'instagram-profile': {
    draw: instagramProfile,
    tone: (p) => mix('#f4f4f4', p[0], 0.2),
  },
  tweet: { draw: tweet, tone: (p) => mix('#f7f9f9', p[0], 0.08) },
  youtube: { draw: youtube, tone: (p) => mix('#0f0f0f', p[0], 0.15) },
  article: { draw: article, tone: (p) => mix('#f6f6f6', p[0], 0.1) },
  maps: { draw: maps, tone: () => '#e3e8df' },
  chat: { draw: chat, tone: () => '#f2f4f8' },
  code: { draw: code, tone: (p) => mix('#17181f', p[0], 0.06) },
};

// ---------------------------------------------------------------- exports

/** Phone screenshot at 9:19.5 (1080x2340, drawn on a 390x845 canvas). */
export function screenshotArt(
  t: ScreenshotTemplate,
  o: ScreenshotOptions,
): Art {
  const tpl = TEMPLATES[t];
  const rng = mulberry32(o.seed);
  const svg = svgDoc(1080, 2340, 390, 845, tpl.draw(rng, o));
  return {
    url: dataUri(svg),
    width: 1080,
    height: 2340,
    dominantColor: tpl.tone(o.palette),
  };
}

/** Photo-like composition (not a screenshot) at an arbitrary aspect ratio. */
export function photoArt(o: {
  seed: number;
  palette: [string, string];
  width: number;
  height: number;
  label?: string;
}): Art {
  const rng = mulberry32(o.seed);
  const vw = 400;
  const vh = Math.round((400 * o.height) / o.width);
  const body: string[] = [scene(rng, o.palette, 0, 0, vw, vh, 'ph')];
  if (o.label) {
    body.push(
      `<defs><linearGradient id="pl" x2="0" y2="1"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".55"/></linearGradient></defs>`,
      rect(0, 0, vw, vh, 0, 'url(#pl)'),
      txt(20, vh - 22, wrap(o.label, 34, 1)[0] ?? '', 18, '#fff', { w: 600 }),
    );
  }
  return {
    url: dataUri(svgDoc(o.width, o.height, vw, vh, body.join(''))),
    width: o.width,
    height: o.height,
    dominantColor: darken(mix(o.palette[0], o.palette[1], 0.5), 0.15),
  };
}

/** og:image style 1200x630 card for link items. */
export function ogArt(o: {
  seed: number;
  title: string;
  domain: string;
  palette: [string, string];
  dark?: boolean;
}): Art {
  const rng = mulberry32(o.seed);
  const [a, b] = o.palette;
  const dark = o.dark ?? false;
  const bg1 = dark ? darken(a, 0.72) : lighten(a, 0.86);
  const bg2 = dark ? darken(b, 0.82) : lighten(b, 0.7);
  const fg = dark ? '#ffffff' : '#111318';
  const muted = dark ? '#ffffffa0' : '#11131899';
  const lines = wrap(o.title, 22, 3);
  const blobs: string[] = [];
  for (let i = 0; i < 3; i++) {
    blobs.push(
      circle(
        range(rng, 700, 1200),
        range(rng, 0, 630),
        range(rng, 140, 300),
        i % 2 ? a : b,
        ` opacity="${dark ? 0.35 : 0.3}" filter="url(#ob)"`,
      ),
    );
  }
  const body = [
    `<defs>${lin('og', bg1, bg2, false)}<filter id="ob" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="70"/></filter><pattern id="od" width="28" height="28" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.6" fill="${fg}" opacity=".08"/></pattern></defs>`,
    rect(0, 0, 1200, 630, 0, 'url(#og)'),
    ...blobs,
    rect(0, 0, 1200, 630, 0, 'url(#od)'),
    rect(
      840,
      170,
      300,
      300,
      48,
      a,
      ` opacity=".9" transform="rotate(${r1(range(rng, -14, 14))} 990 320)"`,
    ),
    rect(
      880,
      210,
      220,
      220,
      36,
      'none',
      ` stroke="${dark ? '#fff' : '#fff'}" stroke-opacity=".6" stroke-width="6" transform="rotate(${r1(range(rng, -14, 14))} 990 320)"`,
    ),
    rect(72, 72, 56, 56, 14, a),
    txt(100, 112, initial(o.domain).toUpperCase(), 30, '#fff', {
      w: 700,
      a: 'middle',
    }),
    txt(146, 110, o.domain, 30, muted, { w: 500 }),
    ...lines.map((l, i) => txt(72, 262 + i * 74, l, 60, fg, { w: 800 })),
    rect(72, 548, 120, 8, 4, a),
  ].join('');
  return {
    url: dataUri(svgDoc(1200, 630, 1200, 630, body)),
    width: 1200,
    height: 630,
    dominantColor: mix(bg1, bg2, 0.5),
  };
}

/** Tiny favicon (rounded square with a letter), 64x64. */
export function faviconArt(letter: string, color: string): string {
  const body =
    rect(0, 0, 64, 64, 14, color) +
    txt(32, 44, initial(letter).toUpperCase(), 34, '#fff', {
      w: 700,
      a: 'middle',
    });
  return dataUri(svgDoc(64, 64, 64, 64, body));
}
