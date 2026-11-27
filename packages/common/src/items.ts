import type { CategoryRef } from "./categories.js";
import type { EntityType, ItemKind, ItemStatus } from "./constants.js";

export interface ItemEntity {
  type: EntityType;
  /** Human label, e.g. "Bráz Elettrica" or "@lucasmontano". */
  name: string;
  /** Extra detail, e.g. an address, a price, a handle. */
  value: string | null;
  /** Deep link when one is known or derivable (maps, profile, site). */
  url: string | null;
}

export interface ItemImage {
  width: number;
  height: number;
  /** Hex color (#rrggbb) for placeholders while the image loads. */
  dominantColor: string;
  mime: string;
  bytes: number;
  /** Signed, short-lived URLs (no auth header needed). */
  thumbUrl: string;
  url: string;
}

export interface ItemLink {
  url: string;
  /** Hostname without www, e.g. "github.com". */
  domain: string;
  siteName: string | null;
  title: string | null;
  description: string | null;
  faviconUrl: string | null;
  /** og:image as published by the site (not proxied). */
  imageUrl: string | null;
}

export interface Item {
  id: string;
  kind: ItemKind;
  status: ItemStatus;
  /** AI title until the user edits it. Empty while pending. */
  title: string;
  /** 1-3 sentence AI summary. */
  summary: string;
  /** App or site the content came from, e.g. "Instagram", "X", "github.com". */
  source: string | null;
  /** Breadcrumb root → leaf. Empty when uncategorized. */
  categoryPath: CategoryRef[];
  /** Leaf category id (last of categoryPath) or null. */
  categoryId: string | null;
  tags: string[];
  entities: ItemEntity[];
  /** Text read from the image or extracted from the page (may be long). */
  text: string | null;
  /** User's own note. */
  note: string | null;
  image: ItemImage | null;
  link: ItemLink | null;
  favorite: boolean;
  archived: boolean;
  /** Present when status === "failed". */
  error: string | null;
  /** When the user captured it (screenshot time, share time). */
  capturedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface ItemListQuery {
  categoryId?: string;
  /** Also include items from child categories (default true). */
  includeChildren?: boolean;
  /**
   * One kind or several. On the wire: `kind=screenshot` or a
   * comma-separated list `kind=screenshot,image`.
   */
  kind?: ItemKind | ItemKind[];
  status?: ItemStatus;
  favorite?: boolean;
  archived?: boolean;
  /** Free text; hybrid keyword + semantic search when set. */
  q?: string;
  cursor?: string;
  limit?: number;
}

export interface ItemListResponse {
  items: Item[];
  nextCursor: string | null;
}

export interface CreateLinkBody {
  url: string;
  /** Optional text shared along with the URL (e.g. tweet text). */
  text?: string;
  capturedAt?: string;
}

export interface CreateNoteBody {
  text: string;
  capturedAt?: string;
}

/**
 * Multipart form for POST /api/items/upload:
 *  - file: the image (required)
 *  - kind: "screenshot" | "image" (default "screenshot")
 *  - capturedAt: ISO date (optional)
 *  - clientId: device-side id used for idempotency (optional)
 */
export interface UploadFields {
  kind?: Extract<ItemKind, "screenshot" | "image">;
  capturedAt?: string;
  clientId?: string;
}

export interface UpdateItemBody {
  title?: string;
  summary?: string;
  note?: string | null;
  categoryId?: string | null;
  tags?: string[];
  favorite?: boolean;
  archived?: boolean;
}

export interface LibraryStats {
  total: number;
  byKind: Record<ItemKind, number>;
  favorites: number;
  processing: number;
  failed: number;
  uncategorized: number;
  /** Archived items (every other count excludes them). */
  archived: number;
}
