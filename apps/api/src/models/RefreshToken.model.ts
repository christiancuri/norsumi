import {
  getModelForClass,
  index,
  modelOptions,
  prop,
} from "@typegoose/typegoose";
import { TimeStamps } from "@typegoose/typegoose/lib/defaultClasses.js";
import { Types } from "mongoose";

@modelOptions({
  schemaOptions: { collection: "refresh_tokens", timestamps: true },
})
@index({ tokenHash: 1 }, { unique: true })
@index({ familyId: 1 })
@index({ userId: 1 })
// Expired tokens (and their revoked siblings) are swept by MongoDB.
@index({ expiresAt: 1 }, { expireAfterSeconds: 0 })
export class IRefreshToken extends TimeStamps {
  @prop({ type: Types.ObjectId, required: true })
  public userId!: Types.ObjectId;

  /** SHA-256 (hex) of the opaque token; the token itself is never stored. */
  @prop({ type: String, required: true })
  public tokenHash!: string;

  /** Every rotation of one sign-in shares a family. */
  @prop({ type: String, required: true })
  public familyId!: string;

  @prop({ type: Date, required: true })
  public expiresAt!: Date;

  @prop({ type: Date, default: null })
  public revokedAt?: Date | null;

  /** Set when revoked by rotation (not logout): starts the grace window. */
  @prop({ type: Date, default: null })
  public rotatedAt?: Date | null;
}

export const RefreshToken = getModelForClass(IRefreshToken);
