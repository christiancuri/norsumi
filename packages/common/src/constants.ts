/** Item kinds the library can hold. */
export const ITEM_KINDS = ["screenshot", "image", "link", "note"] as const;
export type ItemKind = (typeof ITEM_KINDS)[number];

/** Lifecycle of an item through the AI pipeline. */
export const ITEM_STATUSES = [
  "pending",
  "processing",
  "ready",
  "failed",
] as const;
export type ItemStatus = (typeof ITEM_STATUSES)[number];

/**
 * Named palette used for categories. Clients map each name to their own
 * light/dark shades; the API and the LLM only ever deal with the names.
 */
export const CATEGORY_COLORS = [
  "slate",
  "red",
  "orange",
  "amber",
  "lime",
  "emerald",
  "teal",
  "sky",
  "blue",
  "violet",
  "fuchsia",
  "rose",
] as const;
export type CategoryColor = (typeof CATEGORY_COLORS)[number];

/** Kinds of structured entities the AI extracts from an item. */
export const ENTITY_TYPES = [
  "place",
  "person",
  "account",
  "organization",
  "product",
  "event",
  "book",
  "movie",
  "music",
  "url",
  "date",
  "price",
  "other",
] as const;
export type EntityType = (typeof ENTITY_TYPES)[number];

/** Category tree depth: 1 = source (e.g. Instagram), 2 = topic. */
export const MAX_CATEGORY_DEPTH = 2;

/** Upload limits shared by every client. */
export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;
export const ACCEPTED_IMAGE_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/heic",
  "image/heif",
] as const;

export const DEFAULT_PAGE_SIZE = 40;
export const MAX_PAGE_SIZE = 100;
