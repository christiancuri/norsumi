import { errors, jwtVerify, SignJWT } from "jose";

import { Env } from "./env.js";

export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
const ALGORITHM = "HS256";
const ISSUER = "norsumi";
const secret = new TextEncoder().encode(Env.JWT_SECRET);

export interface AccessTokenPayload {
  sub: string;
  email: string;
}

export async function signAccessToken(
  userId: string,
  email: string,
): Promise<string> {
  return new SignJWT({ email })
    .setProtectedHeader({ alg: ALGORITHM, typ: "JWT" })
    .setSubject(userId)
    .setIssuer(ISSUER)
    .setIssuedAt()
    .setExpirationTime(`${ACCESS_TOKEN_TTL_SECONDS}s`)
    .sign(secret);
}

export async function verifyAccessToken(
  token: string,
): Promise<AccessTokenPayload> {
  const { payload } = await jwtVerify(token, secret, {
    algorithms: [ALGORITHM],
    issuer: ISSUER,
  });
  if (typeof payload.sub !== "string" || typeof payload.email !== "string") {
    throw new Error("Malformed token");
  }
  return { sub: payload.sub, email: payload.email };
}

export function isTokenExpiredError(error: unknown): boolean {
  return error instanceof errors.JWTExpired;
}
