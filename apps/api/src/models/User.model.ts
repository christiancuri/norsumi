import {
  getModelForClass,
  index,
  modelOptions,
  prop,
} from "@typegoose/typegoose";
import { TimeStamps } from "@typegoose/typegoose/lib/defaultClasses.js";

@modelOptions({ schemaOptions: { collection: "users", timestamps: true } })
@index({ email: 1 }, { unique: true })
@index(
  { googleSub: 1 },
  { unique: true, partialFilterExpression: { googleSub: { $type: "string" } } },
)
export class IUser extends TimeStamps {
  /** Lowercased and trimmed. */
  @prop({ type: String, required: true })
  public email!: string;

  @prop({ type: String, required: true })
  public name!: string;

  /** `v1$<argon2id PHC>`; null for Google-only accounts. */
  @prop({ type: String, default: null })
  public passwordHash?: string | null;

  /** Google account id (`sub`) once Google sign-in is linked. */
  @prop({ type: String, default: null })
  public googleSub?: string | null;

  @prop({ type: String, default: null })
  public avatarUrl?: string | null;

  /** Per-user data key, sealed with MASTER_KEY (see infra/crypto.ts). */
  @prop({ type: Buffer, required: true })
  public wrappedDek!: Buffer;
}

export const User = getModelForClass(IUser);
