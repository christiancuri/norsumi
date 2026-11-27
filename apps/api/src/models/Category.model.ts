import {
  CATEGORY_COLORS,
  type CategoryColor,
  type CategoryOrigin,
} from "@norsumi/common";
import {
  getModelForClass,
  index,
  modelOptions,
  prop,
} from "@typegoose/typegoose";
import { TimeStamps } from "@typegoose/typegoose/lib/defaultClasses.js";
import { Types } from "mongoose";

@modelOptions({ schemaOptions: { collection: "categories", timestamps: true } })
// Sibling names are unique per user, case-insensitively.
@index({ userId: 1, parentId: 1, nameKey: 1 }, { unique: true })
export class ICategory extends TimeStamps {
  @prop({ type: Types.ObjectId, required: true })
  public userId!: Types.ObjectId;

  @prop({ type: Types.ObjectId, default: null })
  public parentId?: Types.ObjectId | null;

  @prop({ type: String, required: true })
  public name!: string;

  /** Normalized name (lowercase, no accents, collapsed spaces). */
  @prop({ type: String, required: true })
  public nameKey!: string;

  @prop({ type: String, required: true })
  public slug!: string;

  @prop({ type: String, required: true })
  public emoji!: string;

  @prop({ type: String, required: true, enum: CATEGORY_COLORS })
  public color!: CategoryColor;

  @prop({ type: String, default: null })
  public description?: string | null;

  /** "ai" categories are pruned when empty; "user" ones stay. */
  @prop({ type: String, required: true, enum: ["ai", "user"], default: "ai" })
  public origin!: CategoryOrigin;
}

export const Category = getModelForClass(ICategory);
