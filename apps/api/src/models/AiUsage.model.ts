import {
  getModelForClass,
  index,
  modelOptions,
  prop,
} from "@typegoose/typegoose";
import { Types } from "mongoose";

/** AI runs started per user per UTC day (daily budget). */
@modelOptions({ schemaOptions: { collection: "ai_usage" } })
@index({ userId: 1, day: 1 }, { unique: true })
@index({ expireAt: 1 }, { expireAfterSeconds: 0 })
export class IAiUsage {
  @prop({ type: Types.ObjectId, required: true })
  public userId!: Types.ObjectId;

  /** UTC date, YYYY-MM-DD. */
  @prop({ type: String, required: true })
  public day!: string;

  @prop({ type: Number, required: true, default: 0 })
  public count!: number;

  @prop({ type: Date, required: true })
  public expireAt!: Date;
}

export const AiUsage = getModelForClass(IAiUsage);
