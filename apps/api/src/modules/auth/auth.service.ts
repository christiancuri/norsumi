import { createHash, randomBytes, randomUUID } from "node:crypto";

import type { AuthSession, User as PublicUser } from "@norsumi/common";
import { Types } from "mongoose";

import { Env } from "../../infra/env.js";
import {
  HTTP401Error,
  HTTP403Error,
  HTTP404Error,
  HTTP409Error,
} from "../../infra/http-errors.js";
import { ACCESS_TOKEN_TTL_SECONDS, signAccessToken } from "../../infra/jwt.js";
import { createLogger } from "../../infra/logger.js";
import { isDuplicateKeyError } from "../../infra/mongoose.js";
import { RefreshToken } from "../../models/RefreshToken.model.js";
import { User } from "../../models/User.model.js";
import { purgeUser } from "../users/purge.js";
import { createUserKey } from "../users/user-keys.js";
import { deletionNeedsPassword } from "./account-deletion.js";
import { GoogleTokenError, verifyGoogleIdToken } from "./google.js";
import { decideGoogleSignIn } from "./google-policy.js";
import { hashPassword, verifyDummy, verifyPassword } from "./password.js";
import { classifyRevokedToken } from "./refresh-policy.js";

const log = createLogger("auth");

const REFRESH_TTL_MS = 60 * 24 * 60 * 60 * 1000;
const INVALID_CREDENTIALS = "Invalid email or password";

export interface UserDoc {
  _id: Types.ObjectId;
  email: string;
  name: string;
  passwordHash?: string | null;
  googleSub?: string | null;
  avatarUrl?: string | null;
  createdAt?: Date;
}

export function toPublicUser(doc: UserDoc): PublicUser {
  const providers: PublicUser["providers"] = [];
  if (doc.passwordHash) providers.push("password");
  if (doc.googleSub) providers.push("google");
  return {
    id: doc._id.toString(),
    email: doc.email,
    name: doc.name,
    avatarUrl: doc.avatarUrl ?? null,
    providers,
    createdAt: (doc.createdAt ?? new Date()).toISOString(),
  };
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

async function issueRefreshToken(
  userId: Types.ObjectId,
  familyId: string,
): Promise<string> {
  const token = randomBytes(32).toString("base64url");
  await RefreshToken.create({
    userId,
    familyId,
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
  });
  return token;
}

async function startSession(
  user: UserDoc,
  familyId: string = randomUUID(),
): Promise<AuthSession> {
  const [accessToken, refreshToken] = await Promise.all([
    signAccessToken(user._id.toString(), user.email),
    issueRefreshToken(user._id, familyId),
  ]);
  return {
    user: toPublicUser(user),
    accessToken,
    refreshToken,
    expiresIn: ACCESS_TOKEN_TTL_SECONDS,
  };
}

async function createUser(fields: {
  email: string;
  name: string;
  passwordHash?: string | null;
  googleSub?: string | null;
  avatarUrl?: string | null;
}): Promise<UserDoc> {
  const _id = new Types.ObjectId();
  const { wrapped } = createUserKey(_id.toString());
  try {
    const doc = await User.create({ _id, ...fields, wrappedDek: wrapped });
    return doc.toObject() as UserDoc;
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      throw new HTTP409Error("An account with this email already exists");
    }
    throw error;
  }
}

export async function register(input: {
  email: string;
  password: string;
  name: string;
}): Promise<AuthSession> {
  if (!Env.REGISTRATION_OPEN) {
    throw new HTTP403Error("Registration is closed on this server");
  }
  if (await User.exists({ email: input.email })) {
    throw new HTTP409Error("An account with this email already exists");
  }
  const passwordHash = await hashPassword(input.password, Env.ARGON2_PEPPER);
  const user = await createUser({
    email: input.email,
    name: input.name,
    passwordHash,
  });
  log.info({ userId: user._id.toString() }, "User registered");
  return startSession(user);
}

export async function login(input: {
  email: string;
  password: string;
}): Promise<AuthSession> {
  const user = await User.findOne({ email: input.email }).lean<UserDoc>();
  if (!user?.passwordHash) {
    await verifyDummy(input.password, Env.ARGON2_PEPPER);
    throw new HTTP401Error(INVALID_CREDENTIALS);
  }
  const ok = await verifyPassword(
    user.passwordHash,
    input.password,
    Env.ARGON2_PEPPER,
  );
  if (!ok) throw new HTTP401Error(INVALID_CREDENTIALS);
  return startSession(user);
}

/** Returns the session and whether the account was just created. */
export async function googleSignIn(
  idToken: string,
): Promise<{ session: AuthSession; created: boolean }> {
  if (Env.GOOGLE_CLIENT_IDS.length === 0) {
    throw new HTTP404Error("Google sign-in is not enabled on this server");
  }
  let identity: Awaited<ReturnType<typeof verifyGoogleIdToken>>;
  try {
    identity = await verifyGoogleIdToken(idToken, Env.GOOGLE_CLIENT_IDS);
  } catch (error) {
    if (error instanceof GoogleTokenError)
      throw new HTTP401Error(error.message);
    throw error;
  }

  const bySub = await User.findOne({ googleSub: identity.sub }).lean<UserDoc>();
  const byEmail = bySub
    ? null
    : await User.findOne({ email: identity.email }).lean<UserDoc>();
  const decision = decideGoogleSignIn({
    bySub: bySub ? { id: bySub._id.toString() } : null,
    byEmail,
    registrationOpen: Env.REGISTRATION_OPEN,
  });
  if (decision.action === "signin" && bySub) {
    return { session: await startSession(bySub), created: false };
  }
  if (decision.action === "reject") {
    throw decision.status === 409
      ? new HTTP409Error(decision.message)
      : new HTTP403Error(decision.message);
  }
  const user = await createUser({
    email: identity.email,
    name: identity.name ?? identity.email.split("@")[0] ?? "norsumi user",
    googleSub: identity.sub,
    avatarUrl: identity.picture,
  });
  log.info({ userId: user._id.toString() }, "User registered with Google");
  return { session: await startSession(user), created: true };
}

/**
 * Rotates a refresh token. A token that was already used (revoked) means it
 * leaked or was replayed: the whole family is revoked.
 */
export async function refresh(token: string): Promise<AuthSession> {
  const now = new Date();
  const record = await RefreshToken.findOneAndUpdate(
    { tokenHash: hashToken(token), revokedAt: null, expiresAt: { $gt: now } },
    { $set: { revokedAt: now, rotatedAt: now } },
  ).lean();

  if (!record) {
    const reused = await RefreshToken.findOne({
      tokenHash: hashToken(token),
    }).lean();
    if (
      reused?.revokedAt &&
      classifyRevokedToken(reused, new Date()) === "grace"
    ) {
      // Concurrent refresh: another request already rotated this token.
      throw new HTTP409Error(
        "Refresh token was just rotated; retry with the latest token",
      );
    }
    if (reused?.revokedAt) {
      await RefreshToken.updateMany(
        { familyId: reused.familyId, revokedAt: null },
        { $set: { revokedAt: now } },
      );
      log.warn(
        { userId: reused.userId.toString() },
        "Refresh token reuse detected, family revoked",
      );
    }
    throw new HTTP401Error("Invalid session");
  }

  const user = await User.findById(record.userId).lean<UserDoc>();
  if (!user) throw new HTTP401Error("Invalid session");
  return startSession(user, record.familyId);
}

export async function logout(token: string): Promise<void> {
  const record = await RefreshToken.findOne({
    tokenHash: hashToken(token),
  }).lean();
  if (!record) return;
  await RefreshToken.updateMany(
    { familyId: record.familyId, revokedAt: null },
    { $set: { revokedAt: new Date() } },
  );
}

export async function getMe(userId: string): Promise<PublicUser> {
  const user = await User.findById(userId).lean<UserDoc>();
  if (!user) throw new HTTP401Error("Invalid session");
  return toPublicUser(user);
}

export async function updateMe(
  userId: string,
  patch: { name?: string },
): Promise<PublicUser> {
  const user = await User.findByIdAndUpdate(
    userId,
    { $set: patch },
    { returnDocument: "after" },
  ).lean<UserDoc>();
  if (!user) throw new HTTP401Error("Invalid session");
  return toPublicUser(user);
}

/** Deletes the account and all its data after confirming the password. */
export async function deleteMe(
  userId: string,
  body: { password?: string },
): Promise<void> {
  const user = await User.findById(userId).lean<UserDoc>();
  if (!user) throw new HTTP401Error("Invalid session");
  if (deletionNeedsPassword(user)) {
    const ok =
      body.password !== undefined &&
      (await verifyPassword(
        user.passwordHash as string,
        body.password,
        Env.ARGON2_PEPPER,
      ));
    // 403, not 401: a 401 means "session expired" to clients (refresh flow).
    if (!ok) throw new HTTP403Error("Password is incorrect");
  }
  await purgeUser(userId);
}

export * as AuthService from "./auth.service.js";
