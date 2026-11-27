import {
  ENTITY_TYPES,
  type EntityType,
  ITEM_KINDS,
  ITEM_STATUSES,
  type ItemKind,
  type ItemStatus,
} from "@norsumi/common";
import {
  getModelForClass,
  index,
  modelOptions,
  prop,
  Severity,
} from "@typegoose/typegoose";
import { TimeStamps } from "@typegoose/typegoose/lib/defaultClasses.js";
import { Types } from "mongoose";

/** Fields the user can edit that automatic processing must not overwrite. */
export const EDITABLE_AI_FIELDS = [
  "title",
  "summary",
  "tags",
  "categoryId",
] as const;
export type EditableAiField = (typeof EDITABLE_AI_FIELDS)[number];

export class IItemEntity {
  @prop({ type: String, required: true, enum: ENTITY_TYPES })
  public type!: EntityType;

  @prop({ type: String, required: true })
  public name!: string;

  @prop({ type: String, default: null })
  public value?: string | null;

  @prop({ type: String, default: null })
  public url?: string | null;
}

export class IItemImage {
  @prop({ type: Number, required: true })
  public width!: number;

  @prop({ type: Number, required: true })
  public height!: number;

  @prop({ type: String, required: true })
  public dominantColor!: string;

  /** Mime of the original (detected from magic bytes). */
  @prop({ type: String, required: true })
  public mime!: string;

  @prop({ type: Number, required: true })
  public bytes!: number;

  /** False when the original could not be decoded (no thumb stored). */
  @prop({ type: Boolean, required: true })
  public hasThumb!: boolean;
}

export class IItemLink {
  @prop({ type: String, required: true })
  public url!: string;

  @prop({ type: String, required: true })
  public domain!: string;

  @prop({ type: String, default: null })
  public siteName?: string | null;

  @prop({ type: String, default: null })
  public title?: string | null;

  @prop({ type: String, default: null })
  public description?: string | null;

  @prop({ type: String, default: null })
  public faviconUrl?: string | null;

  @prop({ type: String, default: null })
  public imageUrl?: string | null;
}

/** Last AI run (internal bookkeeping, never returned by the API). */
export class IItemAi {
  @prop({ type: String, required: true })
  public model!: string;

  @prop({ type: Boolean, required: true })
  public fallbackUsed!: boolean;

  @prop({ type: Number, required: true })
  public latencyMs!: number;

  @prop({ type: Number, required: true })
  public promptTokens!: number;

  @prop({ type: Number, required: true })
  public completionTokens!: number;

  /** USD for the completion(s) plus the embedding, as reported. */
  @prop({ type: Number, required: true })
  public cost!: number;
}

@modelOptions({
  schemaOptions: { collection: "items", timestamps: true },
  options: { allowMixed: Severity.ALLOW },
})
@index({ userId: 1, capturedAt: -1, _id: -1 })
@index({ userId: 1, categoryId: 1 })
@index(
  { userId: 1, sha256: 1 },
  { unique: true, partialFilterExpression: { sha256: { $type: "string" } } },
)
@index(
  { userId: 1, clientId: 1 },
  { unique: true, partialFilterExpression: { clientId: { $type: "string" } } },
)
// Worker queue: pending items due now, and stale claims.
@index({ status: 1, nextAttemptAt: 1 })
@index(
  {
    title: "text",
    summary: "text",
    text: "text",
    note: "text",
    tags: "text",
    source: "text",
    "entities.name": "text",
  },
  {
    name: "item_text",
    // Content is multilingual: no stemming or stop words.
    default_language: "none",
    language_override: "textLanguage",
    weights: {
      title: 10,
      tags: 6,
      source: 5,
      "entities.name": 5,
      summary: 3,
      note: 2,
      text: 1,
    },
  },
)
export class IItem extends TimeStamps {
  @prop({ type: Types.ObjectId, required: true })
  public userId!: Types.ObjectId;

  @prop({ type: String, required: true, enum: ITEM_KINDS })
  public kind!: ItemKind;

  @prop({ type: String, required: true, enum: ITEM_STATUSES })
  public status!: ItemStatus;

  @prop({ type: String, default: "" })
  public title!: string;

  @prop({ type: String, default: "" })
  public summary!: string;

  @prop({ type: String, default: null })
  public source?: string | null;

  /** Leaf category; the breadcrumb is derived at read time. */
  @prop({ type: Types.ObjectId, default: null })
  public categoryId?: Types.ObjectId | null;

  @prop({ type: () => [String], default: [] })
  public tags!: string[];

  @prop({ type: () => [IItemEntity], _id: false, default: [] })
  public entities!: IItemEntity[];

  @prop({ type: String, default: null })
  public text?: string | null;

  @prop({ type: String, default: null })
  public note?: string | null;

  @prop({ type: () => IItemImage, _id: false, default: null })
  public image?: IItemImage | null;

  @prop({ type: () => IItemLink, _id: false, default: null })
  public link?: IItemLink | null;

  /** Text shared along with a link (e.g. tweet text); prompt context. */
  @prop({ type: String, default: null })
  public sharedText?: string | null;

  @prop({ type: Boolean, default: false })
  public favorite!: boolean;

  @prop({ type: Boolean, default: false })
  public archived!: boolean;

  @prop({ type: String, default: null })
  public error?: string | null;

  @prop({ type: Date, required: true })
  public capturedAt!: Date;

  /** SHA-256 (hex) of the uploaded plaintext, for dedupe. */
  @prop({ type: String })
  public sha256?: string;

  /** Device-side id for idempotent uploads. */
  @prop({ type: String })
  public clientId?: string;

  /** User-edited fields the pipeline must keep (see EDITABLE_AI_FIELDS). */
  @prop({ type: () => [String], default: [] })
  public editedFields!: EditableAiField[];

  /**
   * Semantic search vector: Float32 little-endian bytes (see
   * modules/items/vector.ts). Never selected by default or returned.
   */
  @prop({ type: Buffer, select: false, default: undefined })
  public embedding?: Buffer;

  @prop({ type: () => IItemAi, _id: false, default: null })
  public ai?: IItemAi | null;

  // Worker bookkeeping.
  @prop({ type: Number, default: 0 })
  public attempts!: number;

  @prop({ type: Date, default: null })
  public nextAttemptAt?: Date | null;

  @prop({ type: Date, default: null })
  public claimedAt?: Date | null;

  @prop({ type: Date, default: null })
  public processedAt?: Date | null;
}

export const Item = getModelForClass(IItem);
