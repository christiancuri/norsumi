import type {
  Category,
  CategoryColor,
  CategoryRef,
  Item,
  ItemEntity,
  ItemImage,
  ItemKind,
  ItemLink,
  ItemStatus,
  User,
} from '@norsumi/common';
import {
  type Art,
  faviconArt,
  ogArt,
  photoArt,
  type ScreenshotTemplate,
  screenshotArt,
} from 'src/services/mock/art';

// Fixed anchor so every relative date in the seed is consistent.
const NOW = Date.now();
const HOUR = 3_600_000;
const DAY = 24 * HOUR;

function iso(ms: number): string {
  return new Date(ms).toISOString();
}

/** Mongo ObjectId-like, deterministic 24-hex id. */
function oid(prefix: string, n: number): string {
  return `${prefix}${n.toString(16).padStart(24 - prefix.length, '0')}`;
}

// ------------------------------------------------------------------ user

export const seedUser: User = {
  id: oid('6740a1a0', 1),
  email: 'ada@norsumi.com',
  name: 'Ada Lovelace',
  avatarUrl: null,
  providers: ['password'],
  createdAt: iso(NOW - 62 * DAY),
};

// ------------------------------------------------------------ categories

interface CatSpec {
  key: string;
  name: string;
  emoji: string;
  color: CategoryColor;
  description: string;
  parent?: string;
}

const CAT_SPECS: CatSpec[] = [
  {
    key: 'instagram',
    name: 'Instagram',
    emoji: '📸',
    color: 'fuchsia',
    description: 'Posts, profiles and reels saved from Instagram.',
  },
  {
    key: 'restaurants',
    parent: 'instagram',
    name: 'Restaurants',
    emoji: '🍝',
    color: 'orange',
    description: 'Places to eat you spotted on Instagram.',
  },
  {
    key: 'profiles',
    parent: 'instagram',
    name: 'Profiles',
    emoji: '👤',
    color: 'violet',
    description: 'Creators and accounts worth following.',
  },
  {
    key: 'travel',
    parent: 'instagram',
    name: 'Travel',
    emoji: '✈️',
    color: 'sky',
    description: 'Viewpoints, neighborhoods and trip inspiration.',
  },
  {
    key: 'x',
    name: 'X',
    emoji: '🐦',
    color: 'slate',
    description: 'Posts and threads saved from X.',
  },
  {
    key: 'ai',
    parent: 'x',
    name: 'AI',
    emoji: '🤖',
    color: 'teal',
    description: 'Prompting tips, models and AI engineering notes.',
  },
  {
    key: 'study',
    parent: 'x',
    name: 'Study',
    emoji: '📚',
    color: 'amber',
    description: 'Learning techniques and study habits.',
  },
  {
    key: 'web',
    name: 'Web',
    emoji: '🌐',
    color: 'blue',
    description: 'Articles and pages from around the web.',
  },
  {
    key: 'devtools',
    parent: 'web',
    name: 'Dev Tools',
    emoji: '🛠️',
    color: 'emerald',
    description: 'Libraries, snippets and tooling for building software.',
  },
  {
    key: 'design',
    parent: 'web',
    name: 'Design',
    emoji: '🎨',
    color: 'rose',
    description: 'UI references, color systems and visual inspiration.',
  },
  {
    key: 'youtube',
    name: 'YouTube',
    emoji: '▶️',
    color: 'red',
    description: 'Videos saved from YouTube.',
  },
  {
    key: 'music',
    parent: 'youtube',
    name: 'Music',
    emoji: '🎵',
    color: 'lime',
    description: 'Live sets and playlists to come back to.',
  },
  {
    key: 'talks',
    parent: 'youtube',
    name: 'Talks',
    emoji: '🎤',
    color: 'violet',
    description: 'Conference talks and long-form explainers.',
  },
  {
    key: 'notes',
    name: 'Notes',
    emoji: '📝',
    color: 'amber',
    description: 'Things you wrote down yourself.',
  },
  {
    key: 'ideas',
    parent: 'notes',
    name: 'Ideas',
    emoji: '💡',
    color: 'emerald',
    description: 'Product ideas, plans and lists in progress.',
  },
];

type CatKey = (typeof CAT_SPECS)[number]['key'];

const catIdByKey = new Map<CatKey, string>(
  CAT_SPECS.map((c, i) => [c.key, oid('6740c0de', i + 1)]),
);
const specByKey = new Map<CatKey, CatSpec>(CAT_SPECS.map((c) => [c.key, c]));

function ref(key: CatKey): CategoryRef {
  const s = specByKey.get(key)!;
  return {
    id: catIdByKey.get(key)!,
    name: s.name,
    emoji: s.emoji,
    color: s.color,
  };
}

function pathFor(key: CatKey | null): CategoryRef[] {
  if (!key) return [];
  const s = specByKey.get(key)!;
  return s.parent ? [ref(s.parent), ref(key)] : [ref(key)];
}

// -------------------------------------------------------------- entities

function place(name: string, value: string): ItemEntity {
  return {
    type: 'place',
    name,
    value,
    url: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${name}, ${value}`)}`,
  };
}

function account(
  handle: string,
  platform: 'instagram' | 'x' | 'youtube',
  value: string | null = null,
): ItemEntity {
  const base = {
    instagram: 'https://instagram.com/',
    x: 'https://x.com/',
    youtube: 'https://www.youtube.com/@',
  }[platform];
  return { type: 'account', name: `@${handle}`, value, url: base + handle };
}

function site(name: string, url: string): ItemEntity {
  return { type: 'url', name, value: null, url };
}

function entity(
  type: ItemEntity['type'],
  name: string,
  value: string | null = null,
): ItemEntity {
  return { type, name, value, url: null };
}

// ----------------------------------------------------------------- items

function imageFrom(art: Art, bytes: number): ItemImage {
  return {
    width: art.width,
    height: art.height,
    dominantColor: art.dominantColor,
    mime: 'image/svg+xml',
    bytes,
    thumbUrl: art.url,
    url: art.url,
  };
}

interface ItemSpec {
  kind: ItemKind;
  title: string;
  summary: string;
  source: string | null;
  cat: CatKey | null;
  tags: string[];
  entities: ItemEntity[];
  text: string | null;
  note?: string | null;
  image?: ItemImage | null;
  link?: ItemLink | null;
  favorite?: boolean;
  archived?: boolean;
  status?: ItemStatus;
  error?: string | null;
  /** Days (fractional) before the anchor. */
  ago: number;
  /** Hours after creation of the last edit. */
  editedAfter?: number;
}

let seedCounter = 0;

function shot(
  template: ScreenshotTemplate,
  o: {
    title: string;
    subtitle?: string;
    handle?: string;
    palette: [string, string];
  },
): ItemImage {
  seedCounter += 1;
  const art = screenshotArt(template, { seed: 1000 + seedCounter * 7, ...o });
  return imageFrom(art, 380_000 + ((seedCounter * 97_331) % 1_400_000));
}

function linkOf(o: {
  url: string;
  siteName: string | null;
  title: string | null;
  description: string | null;
  palette: [string, string];
  og?: boolean;
  dark?: boolean;
}): ItemLink {
  seedCounter += 1;
  const domain = new URL(o.url).hostname.replace(/^www\./, '');
  return {
    url: o.url,
    domain,
    siteName: o.siteName,
    title: o.title,
    description: o.description,
    faviconUrl: faviconArt(domain.charAt(0), o.palette[0]),
    imageUrl:
      o.og === false
        ? null
        : ogArt({
            seed: 2000 + seedCounter * 13,
            title: o.title ?? domain,
            domain,
            palette: o.palette,
            dark: o.dark,
          }).url,
  };
}

const SPECS: ItemSpec[] = [
  // ---------------------------------------------------------- screenshots
  {
    kind: 'screenshot',
    ago: 0.08,
    title: 'Bráz Elettrica — wood-fired pizza in Pinheiros',
    summary:
      'Instagram post from Bráz Elettrica showing their margherita with burrata. Open late on weekends; no reservations for small groups.',
    source: 'Instagram',
    cat: 'restaurants',
    tags: ['pizza', 'são paulo', 'pinheiros', 'dinner'],
    entities: [
      place('Bráz Elettrica', 'R. Vupabussu, 271 - Pinheiros, São Paulo'),
      account('brazelettrica', 'instagram'),
      entity('product', 'Margherita com burrata', 'R$ 78'),
    ],
    text: 'brazelettrica\nPinheiros, São Paulo\n12,481 likes\nbrazelettrica Margherita com burrata saindo do forno 🔥\nAberto até 1h sexta e sábado\nView all 214 comments\n3 days ago',
    image: shot('instagram-post', {
      title: 'Margherita com burrata saindo do forno, aberto até 1h sexta',
      subtitle: 'Pinheiros, São Paulo',
      handle: 'brazelettrica',
      palette: ['#e2573b', '#f2c14e'],
    }),
    favorite: true,
  },
  {
    kind: 'screenshot',
    ago: 0.9,
    title: 'Claude tip: put long documents before the question',
    summary:
      'Thread arguing that placing long reference material at the top of a prompt and the question at the end measurably improves answers.',
    source: 'X',
    cat: 'ai',
    tags: ['prompting', 'llm', 'long context'],
    entities: [account('promptcraft', 'x')],
    text: 'Prompt Craft @promptcraft\nLong-context tip that keeps paying off: put the documents first and your question last.\nWrap each doc in tags, ask the model to quote the relevant parts before answering.\nQuality jump is very noticeable on 50+ page inputs.\n9:41 AM · Nov 24, 2026 · 214K Views\n1.2K Reposts 9.8K Likes',
    image: shot('tweet', {
      title:
        'Long-context tip that keeps paying off: put the documents first and your question last.',
      subtitle:
        'Wrap each doc in tags and ask the model to quote the relevant parts before answering.',
      handle: 'promptcraft',
      palette: ['#14b8a6', '#6366f1'],
    }),
  },
  {
    kind: 'screenshot',
    ago: 1.6,
    status: 'processing',
    title: '',
    summary: '',
    source: null,
    cat: null,
    tags: [],
    entities: [],
    text: null,
    image: shot('chat', {
      title: 'You have to try the tasting menu at Taberna da Rua das Flores',
      subtitle: 'adding it to the Lisbon list!',
      handle: 'Marina',
      palette: ['#f97316', '#ec4899'],
    }),
  },
  {
    kind: 'screenshot',
    ago: 2.3,
    title: 'Time Out Market Lisboa — stalls worth the queue',
    summary:
      'Carousel ranking the best counters at Time Out Market in Cais do Sodré, from bifanas to pastéis de nata.',
    source: 'Instagram',
    cat: 'restaurants',
    tags: ['lisbon', 'food hall', 'pastel de nata'],
    entities: [
      place('Time Out Market Lisboa', 'Av. 24 de Julho 49, Lisboa'),
      account('timeoutmarketlisboa', 'instagram'),
      entity('product', 'Pastel de nata', '€1.40'),
    ],
    text: 'timeoutmarketlisboa\nCais do Sodré, Lisboa\n8,902 likes\ntimeoutmarketlisboa 5 stalls worth the queue this week 🇵🇹\n1. Manteigaria 2. Croqueteria 3. Henrique Sá Pessoa\nView all 96 comments',
    image: shot('instagram-post', {
      title: '5 stalls worth the queue this week: Manteigaria, Croqueteria',
      subtitle: 'Cais do Sodré, Lisboa',
      handle: 'timeoutmarketlisboa',
      palette: ['#f59e0b', '#b45309'],
    }),
  },
  {
    kind: 'screenshot',
    ago: 3.1,
    title: 'Tiny Desk-style bossa nova trio set',
    summary:
      'A 22-minute live session by a São Paulo bossa nova trio, recorded in a small studio with a nylon guitar, upright bass and brushes.',
    source: 'YouTube',
    cat: 'music',
    tags: ['bossa nova', 'live set', 'brazil'],
    entities: [
      account('bossasessions', 'youtube', 'Bossa Sessions'),
      entity('music', 'Corcovado', 'Tom Jobim'),
    ],
    text: 'Bossa Sessions — Trio ao vivo no estúdio (full set)\n1.4M views 4d ago\nBossa Sessions 312K subscribers\nSubscribe\nComments 2.1K',
    image: shot('youtube', {
      title: 'Trio ao vivo no estúdio — bossa nova full set',
      handle: 'Bossa Sessions',
      palette: ['#d97706', '#7c2d12'],
    }),
    favorite: true,
  },
  {
    kind: 'screenshot',
    ago: 4.2,
    title: 'Pastéis de Belém on Google Maps',
    summary:
      'Map card for Pastéis de Belém with opening hours and rating. Saved while planning a morning in Belém.',
    source: 'Google Maps',
    cat: null,
    tags: ['lisbon', 'bakery', 'belém'],
    entities: [
      place('Pastéis de Belém', 'R. de Belém 84-92, Lisboa'),
      entity('price', 'Pastel de Belém', '€1.50'),
    ],
    text: 'Pastéis de Belém\n4.6 ★★★★★ (98,412)\nBakery · R. de Belém 84-92\nOpen · Closes 11 PM\nDirections Start Call Save',
    image: shot('maps', {
      title: 'Pastéis de Belém',
      subtitle: 'Bakery · R. de Belém 84-92, 1300-085 Lisboa',
      handle: 'Ada',
      palette: ['#ea4335', '#fbbc04'],
    }),
  },
  {
    kind: 'screenshot',
    ago: 5,
    title: 'Marina Alves — weeknight pasta recipes',
    summary:
      'Profile of a Lisbon-based home cook posting 20-minute pasta recipes and seasonal market hauls.',
    source: 'Instagram',
    cat: 'profiles',
    tags: ['recipes', 'pasta', 'creator'],
    entities: [account('marinacooks', 'instagram', '182K followers')],
    text: 'marinacooks\n412 posts 182K followers 640 following\nMarina Alves\n20-minute pasta, market hauls and the occasional dessert.\nLisbon 🇵🇹 · new recipe every Thursday\nFollow Message',
    image: shot('instagram-profile', {
      title: 'Marina Alves',
      subtitle:
        '20-minute pasta, market hauls and the occasional dessert. Lisbon · new recipe every Thursday',
      handle: 'marinacooks',
      palette: ['#ef4444', '#fde68a'],
    }),
  },
  {
    kind: 'screenshot',
    ago: 6.4,
    title: 'useDebounce hook in TypeScript',
    summary:
      'A small generic React hook that debounces a value with a configurable delay and cleans up its timer on unmount.',
    source: 'github.com',
    cat: 'devtools',
    tags: ['react', 'typescript', 'hooks'],
    entities: [site('github.com', 'https://github.com')],
    text: "// Debounce any value for search inputs\nimport { useEffect, useState } from 'react';\nexport function useDebounce<T>(value: T, delay = 300) {\n  const [debounced, setDebounced] = useState(value);\n  useEffect(() => {\n    const id = setTimeout(() => setDebounced(value), delay);\n    return () => clearTimeout(id);\n  }, [value, delay]);\n  return debounced;\n}",
    image: shot('code', {
      title: 'useDebounce.ts',
      subtitle: 'Debounce any value for search inputs',
      handle: 'hooks/src',
      palette: ['#61afef', '#c678dd'],
    }),
  },
  {
    kind: 'screenshot',
    ago: 7.2,
    title: "Joe's Pizza on Carmine St, NYC",
    summary:
      "Post about Joe's Pizza in the West Village: classic thin slice, cash and card, usually a short line after 10pm.",
    source: 'Instagram',
    cat: 'restaurants',
    tags: ['nyc', 'pizza', 'west village'],
    entities: [
      place("Joe's Pizza", '7 Carmine St, New York, NY'),
      account('joespizzanyc', 'instagram'),
    ],
    text: 'joespizzanyc\nCarmine St, New York\n23,118 likes\njoespizzanyc The plain slice. Since 1975.\nOpen till 4am on weekends\nView all 388 comments',
    image: shot('instagram-post', {
      title: 'The plain slice. Since 1975. Open till 4am on weekends',
      subtitle: 'Carmine St, New York',
      handle: 'joespizzanyc',
      palette: ['#dc2626', '#fbbf24'],
    }),
  },
  {
    kind: 'screenshot',
    ago: 8.5,
    title: 'Spaced repetition beats cramming',
    summary:
      'Post recommending 20 minutes of daily spaced-repetition review over long cramming sessions, with Anki settings that work.',
    source: 'X',
    cat: 'study',
    tags: ['spaced repetition', 'anki', 'learning'],
    entities: [account('learnbetter', 'x'), entity('product', 'Anki')],
    text: 'Learn Better @learnbetter\n20 minutes of spaced repetition a day beats a 4-hour cram every time.\nMy Anki setup: 15 new cards/day, 1d 3d learning steps, max interval 180d.\n9:41 AM · Nov 18, 2026 · 88K Views',
    image: shot('tweet', {
      title:
        '20 minutes of spaced repetition a day beats a 4-hour cram every time.',
      subtitle:
        'My Anki setup: 15 new cards a day, 1d 3d learning steps, max interval 180 days.',
      handle: 'learnbetter',
      palette: ['#f59e0b', '#84cc16'],
    }),
  },
  {
    kind: 'screenshot',
    ago: 9.8,
    title: 'Miradouro da Senhora do Monte at sunset',
    summary:
      "Sunset view over Lisbon's rooftops and the castle from the city's highest viewpoint, best reached by tram 28.",
    source: 'Instagram',
    cat: 'travel',
    tags: ['lisbon', 'viewpoint', 'sunset'],
    entities: [
      place('Miradouro da Senhora do Monte', 'Graça, Lisboa'),
      account('nomadnotes.pt', 'instagram'),
    ],
    text: 'nomadnotes.pt\nMiradouro da Senhora do Monte\n4,551 likes\nnomadnotes.pt Golden hour from the highest viewpoint in Lisbon. Go 40 min before sunset.\nView all 61 comments',
    image: shot('instagram-post', {
      title:
        'Golden hour from the highest viewpoint in Lisbon. Go 40 min before sunset',
      subtitle: 'Miradouro da Senhora do Monte',
      handle: 'nomadnotes.pt',
      palette: ['#fb923c', '#7c3aed'],
    }),
  },
  {
    kind: 'screenshot',
    ago: 11,
    title: 'Designing calm technology',
    summary:
      'Conference talk on building products that stay in the periphery, notify less, and respect attention.',
    source: 'YouTube',
    cat: 'talks',
    tags: ['design', 'ux', 'attention'],
    entities: [account('designmattersconf', 'youtube', 'Design Matters')],
    text: 'Designing calm technology | Design Matters 2026\n212K views 2w ago\nDesign Matters 98K subscribers\nComments 640',
    image: shot('youtube', {
      title: 'Designing calm technology | Design Matters 2026',
      handle: 'Design Matters',
      palette: ['#0ea5e9', '#1e3a8a'],
    }),
  },
  {
    kind: 'screenshot',
    ago: 12.4,
    title: 'Beco do Batman street art walk',
    summary:
      "Reel guide to Vila Madalena's graffiti alley, with the best time of day for photos and nearby coffee stops.",
    source: 'Instagram',
    cat: 'travel',
    tags: ['são paulo', 'street art', 'vila madalena'],
    entities: [
      place('Beco do Batman', 'Vila Madalena, São Paulo'),
      account('spurbano', 'instagram'),
    ],
    text: 'spurbano\nBeco do Batman\n6,240 likes\nspurbano Go before 10am to have the alley to yourself 🎨\nCoffee after at Coffee Lab\nView all 73 comments',
    image: shot('instagram-post', {
      title: 'Go before 10am to have the alley to yourself. Coffee after',
      subtitle: 'Beco do Batman, São Paulo',
      handle: 'spurbano',
      palette: ['#8b5cf6', '#22d3ee'],
    }),
  },
  {
    kind: 'screenshot',
    ago: 13.7,
    title: 'Small models + good retrieval beat big models',
    summary:
      'Benchmark thread showing a small model with a tuned retrieval step outperforming a much larger model on internal docs QA.',
    source: 'X',
    cat: 'ai',
    tags: ['rag', 'retrieval', 'benchmarks'],
    entities: [account('mlweekly', 'x')],
    text: 'ML Weekly @mlweekly\nWe swapped a frontier model for a small one plus better retrieval and accuracy went UP on our docs QA set.\nChunking by heading + reranking did most of the work.\n9:41 AM · Nov 13, 2026 · 402K Views',
    image: shot('tweet', {
      title:
        'We swapped a frontier model for a small one plus better retrieval and accuracy went up on our docs QA set.',
      subtitle: 'Chunking by heading + reranking did most of the work.',
      handle: 'mlweekly',
      palette: ['#0d9488', '#facc15'],
    }),
  },
  {
    kind: 'screenshot',
    ago: 15.2,
    title: 'The quiet return of texture in UI design',
    summary:
      'Article on how subtle grain, depth and material cues are coming back to interfaces after a decade of flat design.',
    source: 'smashingmagazine.com',
    cat: 'design',
    tags: ['ui', 'visual design', 'trends'],
    entities: [site('Smashing Magazine', 'https://www.smashingmagazine.com')],
    text: 'FEATURE\nThe quiet return of texture in UI design\nAfter a decade of flat surfaces, grain, depth and material cues are back — in moderation.\nBy Eva Moss · 9 min read',
    image: shot('article', {
      title: 'The quiet return of texture in UI design',
      subtitle:
        'After a decade of flat surfaces, grain, depth and material cues are back, in moderation.',
      handle: 'smashingmagazine.com',
      palette: ['#e11d48', '#fb7185'],
    }),
  },
  {
    kind: 'screenshot',
    ago: 17,
    title: 'Mocotó — sertanejo classics in Vila Medeiros',
    summary:
      'Post from Mocotó featuring dadinhos de tapioca and baião de dois; expect a wait on Saturdays.',
    source: 'Instagram',
    cat: 'restaurants',
    tags: ['são paulo', 'brazilian', 'lunch'],
    entities: [
      place(
        'Mocotó',
        'Av. Nossa Sra. do Loreto, 1100 - Vila Medeiros, São Paulo',
      ),
      account('mocotorestaurante', 'instagram'),
      entity('product', 'Dadinhos de tapioca'),
    ],
    text: 'mocotorestaurante\nVila Medeiros, São Paulo\n9,877 likes\nmocotorestaurante Dadinho de tapioca: o original 🧀\nSábado tem fila, chega cedo\nView all 142 comments',
    image: shot('instagram-post', {
      title: 'Dadinho de tapioca: o original. Sábado tem fila, chega cedo',
      subtitle: 'Vila Medeiros, São Paulo',
      handle: 'mocotorestaurante',
      palette: ['#ca8a04', '#9a3412'],
    }),
  },
  {
    kind: 'screenshot',
    ago: 19.5,
    title: 'Nomad Notes — Portugal travel photography',
    summary:
      'Profile of a travel photographer sharing Portugal itineraries, viewpoints and off-season tips.',
    source: 'Instagram',
    cat: 'profiles',
    tags: ['photography', 'portugal', 'creator'],
    entities: [account('nomadnotes.pt', 'instagram', '96K followers')],
    text: 'nomadnotes.pt\n780 posts 96K followers 312 following\nNomad Notes\nPortugal, slowly. Itineraries, viewpoints and off-season tips.\nGuides ↓\nFollow Message',
    image: shot('instagram-profile', {
      title: 'Nomad Notes',
      subtitle:
        'Portugal, slowly. Itineraries, viewpoints and off-season tips. Guides below',
      handle: 'nomadnotes.pt',
      palette: ['#0284c7', '#f59e0b'],
    }),
  },
  {
    kind: 'screenshot',
    ago: 22,
    title: 'How SQLite is tested',
    summary:
      "Talk walking through SQLite's test suite: 100% branch coverage, fuzzing, and out-of-memory and I/O fault injection.",
    source: 'YouTube',
    cat: 'talks',
    tags: ['sqlite', 'testing', 'databases'],
    entities: [
      account('systemstalks', 'youtube', 'Systems Talks'),
      entity('product', 'SQLite'),
    ],
    text: 'How SQLite is tested — 100% branch coverage in practice\n87K views 3w ago\nSystems Talks 41K subscribers\nComments 318',
    image: shot('youtube', {
      title: 'How SQLite is tested: 100% branch coverage in practice',
      handle: 'Systems Talks',
      palette: ['#2563eb', '#10b981'],
    }),
  },
  {
    kind: 'screenshot',
    ago: 25,
    title: 'Bun vs Node: cold start benchmarks',
    summary:
      'Benchmark write-up comparing cold start and install times for Bun and Node across three project sizes.',
    source: 'dev.to',
    cat: 'devtools',
    tags: ['bun', 'node', 'performance'],
    entities: [
      site('DEV Community', 'https://dev.to'),
      entity('product', 'Bun'),
      entity('product', 'Node.js'),
    ],
    text: 'ANALYSIS\nBun vs Node: cold start benchmarks\nWe measured install and startup times on three real projects.\nBy Lucas Prado · 7 min read',
    image: shot('article', {
      title: 'Bun vs Node: cold start benchmarks',
      subtitle:
        'We measured install and startup times on three real projects. The gap is smaller than you think.',
      handle: 'dev.to',
      palette: ['#16a34a', '#0f172a'],
    }),
  },
  {
    kind: 'screenshot',
    ago: 34,
    archived: true,
    title: 'The Feynman technique in 4 steps',
    summary:
      'Short post outlining the Feynman technique: pick a concept, explain it simply, find gaps, then simplify again.',
    source: 'X',
    cat: 'study',
    tags: ['learning', 'feynman', 'notes'],
    entities: [account('notesbyana', 'x'), entity('person', 'Richard Feynman')],
    text: 'Ana @notesbyana\nThe Feynman technique in 4 steps:\n1. Pick a concept\n2. Explain it to a 12-year-old\n3. Find the gaps, go back to the source\n4. Simplify and use analogies\n9:41 AM · Oct 22, 2026 · 51K Views',
    image: shot('tweet', {
      title:
        'The Feynman technique in 4 steps: 1. Pick a concept 2. Explain it to a 12-year-old 3. Find the gaps 4. Simplify',
      handle: 'notesbyana',
      palette: ['#f97316', '#0ea5e9'],
    }),
  },

  // --------------------------------------------------------------- images
  {
    kind: 'image',
    ago: 10.3,
    title: 'Sunset over Ponte 25 de Abril',
    summary:
      'Photo of the 25 de Abril bridge at dusk from the LX Factory riverside, saved as Lisbon trip inspiration.',
    source: 'Instagram',
    cat: 'travel',
    tags: ['lisbon', 'bridge', 'sunset'],
    entities: [place('Ponte 25 de Abril', 'Lisboa')],
    text: null,
    image: imageFrom(
      photoArt({
        seed: 4101,
        palette: ['#fb923c', '#be185d'],
        width: 1080,
        height: 1350,
      }),
      1_284_331,
    ),
  },
  {
    kind: 'image',
    ago: 20.7,
    title: 'Moodboard: warm terracotta palette',
    summary:
      'Interior photo with terracotta, sand and olive tones, saved as a color reference for the onboarding screens.',
    source: 'pinterest.com',
    cat: 'design',
    tags: ['moodboard', 'color', 'terracotta'],
    entities: [entity('other', 'Terracotta', '#c2633d')],
    text: null,
    image: imageFrom(
      photoArt({
        seed: 4202,
        palette: ['#c2633d', '#a3a65b'],
        width: 1500,
        height: 1000,
        label: 'terracotta · sand · olive',
      }),
      842_117,
    ),
  },

  // ---------------------------------------------------------------- links
  {
    kind: 'link',
    ago: 1.2,
    title: 'Biome — one toolchain for formatting and linting',
    summary:
      'Biome is a fast Rust-based formatter and linter for JavaScript, TypeScript, JSON and CSS that replaces Prettier and ESLint.',
    source: 'github.com',
    cat: 'devtools',
    tags: ['tooling', 'linter', 'formatter', 'rust'],
    entities: [
      site('github.com/biomejs/biome', 'https://github.com/biomejs/biome'),
      entity('product', 'Biome'),
    ],
    text: 'Biome is a performant toolchain for web projects. It aims to provide developer tools to maintain the health of said projects. Biome is a fast formatter for JavaScript, TypeScript, JSX, JSON, CSS and GraphQL, and a performant linter with hundreds of rules.',
    link: linkOf({
      url: 'https://github.com/biomejs/biome',
      siteName: 'GitHub',
      title: 'GitHub - biomejs/biome: A toolchain for web projects',
      description:
        'A toolchain for web projects, aimed to provide functionalities to maintain them. Biome offers formatter and linter.',
      palette: ['#60a5fa', '#1e293b'],
      dark: true,
    }),
    favorite: true,
  },
  {
    kind: 'link',
    ago: 2.8,
    title: 'Thread: evaluating LLM apps with small test sets',
    summary:
      'Thread on building a 50-example eval set from real user queries and grading it with rubric-based checks before every prompt change.',
    source: 'X',
    cat: 'ai',
    tags: ['evals', 'llm', 'testing'],
    entities: [
      account('evalsguy', 'x'),
      site('x.com', 'https://x.com/evalsguy/status/1861200000000000000'),
    ],
    text: 'You do not need 10k examples to evaluate your LLM app. Start with 50 real queries, write a rubric per case, and run it on every prompt change. Most regressions show up in the first 20.',
    link: linkOf({
      url: 'https://x.com/evalsguy/status/1861200000000000000',
      siteName: 'X (formerly Twitter)',
      title: 'Start with 50 real queries, not 10k synthetic ones',
      description:
        'You do not need 10k examples to evaluate your LLM app. Start with 50 real queries and a rubric.',
      palette: ['#14b8a6', '#0f172a'],
      dark: true,
    }),
  },
  {
    kind: 'link',
    ago: 14.1,
    title: 'Vite — next generation frontend tooling',
    summary:
      'Vite offers instant dev server start, lightning-fast HMR and optimized production builds for modern web apps.',
    source: 'vite.dev',
    cat: 'devtools',
    tags: ['vite', 'bundler', 'frontend'],
    entities: [site('vite.dev', 'https://vite.dev'), entity('product', 'Vite')],
    text: 'Vite: The Build Tool for the Web. Instant server start, lightning fast HMR, rich features out of the box, optimized build, universal plugins, fully typed APIs.',
    link: linkOf({
      url: 'https://vite.dev/',
      siteName: 'Vite',
      title: 'Vite | Next Generation Frontend Tooling',
      description:
        'Get ready for a development environment that can finally catch up with you.',
      palette: ['#a855f7', '#facc15'],
    }),
  },
  {
    kind: 'link',
    ago: 18.3,
    title: 'Radix Colors — scales for accessible UIs',
    summary:
      'An open-source color system with 12-step scales designed for backgrounds, borders and text with guaranteed contrast.',
    source: 'radix-ui.com',
    cat: 'design',
    tags: ['color', 'design system', 'accessibility'],
    entities: [site('Radix Colors', 'https://www.radix-ui.com/colors')],
    text: 'Radix Colors. A gorgeous, accessible color system for user interfaces. Each scale has 12 steps, each with a specific use case: app backgrounds, component states, borders, solid colors and text.',
    link: linkOf({
      url: 'https://www.radix-ui.com/colors',
      siteName: 'Radix UI',
      title: 'Radix Colors',
      description:
        'An open-source color system for designing beautiful, accessible websites and apps.',
      palette: ['#111827', '#6366f1'],
      og: false,
    }),
  },
  {
    kind: 'link',
    ago: 23.6,
    title: 'Lisbon on foot: 3 walking routes',
    summary:
      'Guide to three self-guided walks through Alfama, Bairro Alto and Belém, with distances and coffee stops.',
    source: 'timeout.com',
    cat: 'web',
    tags: ['lisbon', 'walking', 'guide'],
    entities: [
      site('Time Out Lisbon', 'https://www.timeout.com/lisbon'),
      place('Alfama', 'Lisboa'),
      place('Bairro Alto', 'Lisboa'),
    ],
    text: 'Lisbon is best explored on foot. These three routes cover Alfama, Bairro Alto and Belém, each between 3 and 5 km, with stops for coffee, viewpoints and pastries along the way.',
    link: linkOf({
      url: 'https://www.timeout.com/lisbon/things-to-do/lisbon-walking-routes',
      siteName: 'Time Out Lisbon',
      title: 'Lisbon on foot: 3 walking routes for your first visit',
      description:
        'Three self-guided walks through Alfama, Bairro Alto and Belém.',
      palette: ['#ef4444', '#fca5a5'],
    }),
  },
  {
    kind: 'link',
    ago: 27.4,
    title: 'Lo-fi beats for deep focus (live)',
    summary:
      'A 24/7 lo-fi hip hop live stream used as background music for focused work sessions.',
    source: 'YouTube',
    cat: 'music',
    tags: ['lo-fi', 'focus', 'playlist'],
    entities: [account('chillfocus', 'youtube', 'Chill Focus')],
    text: 'lo-fi beats for deep focus 📚 24/7 live radio. Beats to study, code and relax to.',
    link: linkOf({
      url: 'https://www.youtube.com/watch?v=jfKfPfyJRdk',
      siteName: 'YouTube',
      title: 'lo-fi beats for deep focus — 24/7 live radio',
      description: 'Beats to study, code and relax to.',
      palette: ['#8b5cf6', '#f472b6'],
      dark: true,
    }),
  },
  {
    kind: 'link',
    ago: 30.2,
    status: 'failed',
    error: 'Could not fetch the page (HTTP 403). The site may require a login.',
    title: '',
    summary: '',
    source: 'nytimes.com',
    cat: null,
    tags: [],
    entities: [],
    text: null,
    link: {
      url: 'https://www.nytimes.com/2026/10/26/dining/best-new-restaurants-nyc.html',
      domain: 'nytimes.com',
      siteName: null,
      title: null,
      description: null,
      faviconUrl: null,
      imageUrl: null,
    },
  },

  // ---------------------------------------------------------------- notes
  {
    kind: 'note',
    ago: 0.4,
    title: 'App idea: grocery list that learns prices',
    summary:
      'Idea for a shared grocery list that reads receipts, learns typical prices per store and flags when something is unusually expensive.',
    source: null,
    cat: 'ideas',
    tags: ['app idea', 'groceries', 'ocr'],
    entities: [],
    text: 'App idea: grocery list that learns prices\n- shared list with partner\n- snap the receipt → OCR → price per item per store\n- warn when milk is 30% above usual\n- weekly "where to shop" suggestion',
    favorite: true,
  },
  {
    kind: 'note',
    ago: 8.9,
    editedAfter: 26,
    title: 'Weekend in NYC — must-eat list',
    summary:
      "A short list of NYC spots for a weekend trip, from Katz's pastrami to a slice at Joe's and bagels at Russ & Daughters.",
    source: null,
    cat: 'ideas',
    tags: ['nyc', 'food', 'trip'],
    entities: [
      place("Katz's Delicatessen", '205 E Houston St, New York, NY'),
      place("Joe's Pizza", '7 Carmine St, New York, NY'),
      place('Russ & Daughters', '179 E Houston St, New York, NY'),
    ],
    text: "Weekend in NYC — must-eat list\nFri: Katz's (pastrami on rye, split it)\nSat: Russ & Daughters bagels → walk the High Line\nSat night: slice at Joe's on Carmine\nSun: dim sum in Chinatown",
  },
  {
    kind: 'note',
    ago: 21.3,
    title: 'Talk proposal: local-first apps',
    summary:
      'Outline for a 25-minute talk on local-first sync: CRDTs, offline UX and what to do when two devices disagree.',
    source: null,
    cat: 'ideas',
    tags: ['talk', 'local-first', 'sync'],
    entities: [entity('event', 'Local-first meetup', 'São Paulo')],
    text: 'Talk proposal: local-first apps\n1. Why offline still matters\n2. CRDTs in 5 minutes\n3. Conflict UX: show, don’t hide\n4. Demo: two phones, airplane mode\nTarget: 25 min + Q&A',
  },
  {
    kind: 'note',
    ago: 37.5,
    editedAfter: 120,
    title: 'Books to read this winter',
    summary:
      'Reading list mixing fiction and nonfiction, including a design classic and a history of computing.',
    source: null,
    cat: 'notes',
    tags: ['books', 'reading list'],
    entities: [
      entity('book', 'The Design of Everyday Things', 'Don Norman'),
      entity('book', 'The Innovators', 'Walter Isaacson'),
      entity('book', 'Klara and the Sun', 'Kazuo Ishiguro'),
    ],
    text: 'Books to read this winter\n- The Design of Everyday Things (Don Norman)\n- The Innovators (Walter Isaacson)\n- Klara and the Sun (Kazuo Ishiguro)\n- A Philosophy of Software Design (John Ousterhout)',
  },
];

export const seedItems: Item[] = SPECS.map((s, i) => {
  const captured = NOW - s.ago * DAY;
  const created = captured + (s.kind === 'screenshot' ? 4 : 1) * 60_000;
  const updated = created + (s.editedAfter ?? 0.02) * HOUR;
  const path = pathFor(s.cat);
  return {
    id: oid('6741be00', i + 1),
    kind: s.kind,
    status: s.status ?? 'ready',
    title: s.title,
    summary: s.summary,
    source: s.source,
    categoryPath: path,
    categoryId: path.at(-1)?.id ?? null,
    tags: s.tags,
    entities: s.entities,
    text: s.text,
    note: s.note ?? null,
    image: s.image ?? null,
    link: s.link ?? null,
    favorite: s.favorite ?? false,
    archived: s.archived ?? false,
    error: s.error ?? null,
    capturedAt: iso(captured),
    createdAt: iso(created),
    updatedAt: iso(Math.min(updated, NOW)),
  };
}).sort((a, b) => b.capturedAt.localeCompare(a.capturedAt));

export const seedCategories: Category[] = CAT_SPECS.map((c, i) => {
  const id = catIdByKey.get(c.key)!;
  const created = NOW - (40 - i * 0.5) * DAY;
  return {
    id,
    name: c.name,
    slug: c.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, ''),
    parentId: c.parent ? catIdByKey.get(c.parent)! : null,
    emoji: c.emoji,
    color: c.color,
    description: c.description,
    itemCount: seedItems.filter((it) => it.categoryId === id).length,
    createdAt: iso(created),
    updatedAt: iso(created),
  };
});
