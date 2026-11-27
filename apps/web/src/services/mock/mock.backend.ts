import {
  type AuthSession,
  type Category,
  type CategoryRef,
  DEFAULT_PAGE_SIZE,
  type Item,
  type ItemKind,
  type LibraryStats,
  type User,
} from '@norsumi/common';

import type { Backend } from '../backend';
import { faviconArt, ogArt } from './art';
import { seedCategories, seedItems, seedUser } from './seed';

/**
 * In-memory fake of the norsumi API (VITE_MOCK=1). State lives for the tab's
 * lifetime; new items walk through pending → processing → ready like the
 * real worker so the UI's polling and shimmer states can be exercised.
 */

let user: User = { ...seedUser };
let categories: Category[] = seedCategories.map((c) => ({ ...c }));
let items: Item[] = seedItems.map((i) => ({ ...i }));

const wait = (ms = 220 + Math.random() * 180) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

const clone = <T>(value: T): T => structuredClone(value);

let counter = 0;
function objectId() {
  counter += 1;
  const time = Math.floor(Date.now() / 1000).toString(16);
  const rest = (counter + Math.floor(Math.random() * 1e9))
    .toString(16)
    .padStart(16, '0');
  return (time + rest).slice(0, 24).padEnd(24, '0');
}

class MockHttpError extends Error {
  response: { status: number; data: { message: string } };
  constructor(status: number, message: string) {
    super(message);
    this.response = { status, data: { message } };
  }
}

function session(): AuthSession {
  return {
    user: clone(user),
    accessToken: 'mock-access-token',
    refreshToken: `mock-refresh-${Date.now()}`,
    expiresIn: 900,
  };
}

function ref(c: Category): CategoryRef {
  return { id: c.id, name: c.name, emoji: c.emoji, color: c.color };
}

function pathFor(categoryId: string | null): CategoryRef[] {
  if (!categoryId) return [];
  const leaf = categories.find((c) => c.id === categoryId);
  if (!leaf) return [];
  const parent = leaf.parentId
    ? categories.find((c) => c.id === leaf.parentId)
    : undefined;
  return parent ? [ref(parent), ref(leaf)] : [ref(leaf)];
}

function recount() {
  for (const c of categories) {
    c.itemCount = items.filter((i) => i.categoryId === c.id).length;
  }
}

function findItem(id: string) {
  const item = items.find((i) => i.id === id);
  if (!item) throw new MockHttpError(404, 'Item not found');
  return item;
}

function findCategoryByName(root: string, child: string) {
  const parent = categories.find(
    (c) => !c.parentId && c.name.toLowerCase() === root.toLowerCase(),
  );
  return categories.find(
    (c) =>
      c.parentId === parent?.id && c.name.toLowerCase() === child.toLowerCase(),
  );
}

/** Pretend to be the AI worker. */
function simulatePipeline(id: string) {
  setTimeout(() => {
    const item = items.find((i) => i.id === id);
    if (!item) return;
    item.status = 'processing';
    item.updatedAt = new Date().toISOString();
  }, 1200);

  setTimeout(() => {
    const item = items.find((i) => i.id === id);
    if (!item) return;
    const guess = guessCategory(item.kind);
    item.status = 'ready';
    item.categoryId = guess?.id ?? null;
    item.categoryPath = pathFor(item.categoryId);
    item.source ??= item.categoryPath[0]?.name ?? null;
    if (!item.title) item.title = guessTitle(item);
    if (!item.summary) item.summary = guessSummary(item);
    if (item.tags.length === 0) item.tags = guessTags(item.kind);
    item.updatedAt = new Date().toISOString();
    recount();
  }, 5200);
}

function guessCategory(kind: ItemKind) {
  if (kind === 'link') return findCategoryByName('Web', 'Dev Tools');
  if (kind === 'note') return findCategoryByName('Notes', 'Ideas');
  return findCategoryByName('Instagram', 'Travel');
}

function guessTitle(item: Item) {
  if (item.kind === 'note') {
    return (item.text ?? 'Untitled note').split('\n')[0]?.slice(0, 60) ?? '';
  }
  if (item.kind === 'link') return item.link?.title ?? item.link?.domain ?? '';
  return 'A moment worth keeping';
}

function guessSummary(item: Item) {
  if (item.kind === 'note') return 'A quick thought, saved for later.';
  if (item.kind === 'link') {
    return `Saved from ${item.link?.domain ?? 'the web'}. Read it when you have a quiet minute.`;
  }
  return 'A screenshot you captured. The details were read and filed automatically.';
}

function guessTags(kind: ItemKind) {
  if (kind === 'link') return ['reading', 'web'];
  if (kind === 'note') return ['idea'];
  return ['inspiration'];
}

function blankItem(kind: ItemKind): Item {
  const now = new Date().toISOString();
  return {
    id: objectId(),
    kind,
    status: 'pending',
    title: '',
    summary: '',
    source: null,
    categoryPath: [],
    categoryId: null,
    tags: [],
    entities: [],
    text: null,
    note: null,
    image: null,
    link: null,
    favorite: false,
    archived: false,
    error: null,
    capturedAt: now,
    createdAt: now,
    updatedAt: now,
  };
}

function imageSize(url: string) {
  return new Promise<{ width: number; height: number }>((resolve) => {
    const img = new Image();
    img.onload = () =>
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => resolve({ width: 1080, height: 2340 });
    img.src = url;
  });
}

function matches(item: Item, q: string) {
  const haystack = [
    item.title,
    item.summary,
    item.source,
    item.text,
    item.note,
    item.link?.domain,
    ...item.tags,
    ...item.entities.map((e) => e.name),
    ...item.categoryPath.map((c) => c.name),
  ]
    .join(' ')
    .toLowerCase();
  return q
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((word) => haystack.includes(word));
}

export const mockBackend: Backend = {
  info: async () => {
    await wait(60);
    return {
      name: 'norsumi',
      version: '0.1.0-mock',
      registrationOpen: true,
      auth: { password: true, google: null },
    };
  },

  auth: {
    login: async ({ email }) => {
      await wait(500);
      if (email) user = { ...user, email };
      return session();
    },
    register: async ({ email, name }) => {
      await wait(600);
      user = { ...user, email, name };
      return session();
    },
    google: async () => {
      await wait(400);
      return session();
    },
    logout: async () => {
      await wait(80);
    },
    me: async () => {
      await wait(80);
      return clone(user);
    },
    deleteMe: async ({ password }) => {
      await wait(500);
      if (user.providers.includes('password') && !password) {
        throw new MockHttpError(401, 'Enter your password to confirm');
      }
      items = [];
      categories = [];
    },
    updateMe: async (body) => {
      await wait();
      user = { ...user, ...body };
      return clone(user);
    },
  },

  categories: {
    list: async () => {
      await wait(120);
      recount();
      return clone(categories);
    },
    create: async (body) => {
      await wait();
      const parentId = body.parentId ?? null;
      const clash = categories.some(
        (c) =>
          c.parentId === parentId &&
          c.name.toLowerCase() === body.name.trim().toLowerCase(),
      );
      if (clash) throw new MockHttpError(409, 'That category already exists');
      const now = new Date().toISOString();
      const category: Category = {
        id: objectId(),
        name: body.name.trim(),
        slug: body.name.trim().toLowerCase().replace(/\W+/g, '-'),
        parentId,
        emoji: body.emoji ?? '📁',
        color: body.color ?? 'blue',
        description: body.description ?? null,
        itemCount: 0,
        createdAt: now,
        updatedAt: now,
      };
      categories.push(category);
      return clone(category);
    },
    update: async (id, body) => {
      await wait();
      const category = categories.find((c) => c.id === id);
      if (!category) throw new MockHttpError(404, 'Category not found');
      Object.assign(category, body, { updatedAt: new Date().toISOString() });
      for (const item of items) item.categoryPath = pathFor(item.categoryId);
      return clone(category);
    },
    remove: async (id) => {
      await wait();
      const doomed = new Set(
        categories
          .filter((c) => c.id === id || c.parentId === id)
          .map((c) => c.id),
      );
      categories = categories.filter((c) => !doomed.has(c.id));
      for (const item of items) {
        if (item.categoryId && doomed.has(item.categoryId)) {
          item.categoryId = null;
          item.categoryPath = [];
        }
      }
    },
  },

  items: {
    list: async (query) => {
      await wait(query.q ? 260 : 320);
      let result = items.filter(
        (i) => i.archived === (query.archived ?? false),
      );
      if (query.categoryId) {
        const ids = new Set([query.categoryId]);
        if (query.includeChildren !== false) {
          for (const c of categories) {
            if (c.parentId === query.categoryId) ids.add(c.id);
          }
        }
        result = result.filter((i) => i.categoryId && ids.has(i.categoryId));
      }
      if (query.kind) {
        const kinds = [query.kind].flat();
        result = result.filter((i) => kinds.includes(i.kind));
      }
      if (query.status)
        result = result.filter((i) => i.status === query.status);
      if (query.favorite !== undefined) {
        result = result.filter((i) => i.favorite === query.favorite);
      }
      if (query.q) result = result.filter((i) => matches(i, query.q ?? ''));
      result.sort((a, b) => b.capturedAt.localeCompare(a.capturedAt));

      const limit = query.limit ?? DEFAULT_PAGE_SIZE;
      const offset = Number(query.cursor ?? 0);
      const page = result.slice(offset, offset + limit);
      const next =
        offset + limit < result.length ? String(offset + limit) : null;
      return { items: clone(page), nextCursor: next };
    },

    stats: async () => {
      await wait(100);
      const live = items.filter((i) => !i.archived);
      const byKind = { screenshot: 0, image: 0, link: 0, note: 0 };
      for (const i of live) byKind[i.kind] += 1;
      const stats: LibraryStats = {
        total: live.length,
        byKind,
        favorites: live.filter((i) => i.favorite).length,
        processing: live.filter(
          (i) => i.status === 'pending' || i.status === 'processing',
        ).length,
        failed: live.filter((i) => i.status === 'failed').length,
        uncategorized: live.filter((i) => !i.categoryId).length,
        archived: items.filter((i) => i.archived).length,
      };
      return stats;
    },

    get: async (id) => {
      await wait(120);
      return clone(findItem(id));
    },

    upload: async (file, fields = {}) => {
      await wait(700);
      const url = URL.createObjectURL(file);
      const { width, height } = await imageSize(url);
      const item = blankItem(fields.kind ?? 'screenshot');
      item.capturedAt = fields.capturedAt ?? item.capturedAt;
      item.image = {
        width,
        height,
        dominantColor: '#8a94b8',
        mime: file.type || 'image/png',
        bytes: file.size,
        thumbUrl: url,
        url,
      };
      items.unshift(item);
      simulatePipeline(item.id);
      return clone(item);
    },

    createLink: async ({ url, text }) => {
      await wait(400);
      let domain = url;
      try {
        domain = new URL(url).hostname.replace(/^www\./, '');
      } catch {
        throw new MockHttpError(400, 'That does not look like a valid URL');
      }
      const item = blankItem('link');
      const seed = Math.floor(Math.random() * 1000);
      const title = domain.split('.')[0] ?? domain;
      item.text = text ?? null;
      item.source = domain;
      item.link = {
        url,
        domain,
        siteName: title.charAt(0).toUpperCase() + title.slice(1),
        title: null,
        description: null,
        faviconUrl: faviconArt(domain.charAt(0).toUpperCase(), '#2e6bff'),
        imageUrl: ogArt({
          seed,
          title: domain,
          domain,
          palette: ['#4f8cff', '#2e6bff'],
        }).url,
      };
      items.unshift(item);
      simulatePipeline(item.id);
      return clone(item);
    },

    createNote: async ({ text }) => {
      await wait(300);
      const item = blankItem('note');
      item.text = text;
      items.unshift(item);
      simulatePipeline(item.id);
      return clone(item);
    },

    update: async (id, body) => {
      await wait(180);
      const item = findItem(id);
      Object.assign(item, body, { updatedAt: new Date().toISOString() });
      if ('categoryId' in body) item.categoryPath = pathFor(item.categoryId);
      recount();
      return clone(item);
    },

    remove: async (id) => {
      await wait(200);
      items = items.filter((i) => i.id !== id);
      recount();
    },

    reprocess: async (id) => {
      await wait(200);
      const item = findItem(id);
      item.status = 'pending';
      item.error = null;
      item.updatedAt = new Date().toISOString();
      simulatePipeline(id);
      return clone(item);
    },
  },
};
