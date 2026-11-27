import { createRemoteJWKSet, type JWTVerifyGetKey, jwtVerify } from "jose";

export const GOOGLE_JWKS_URL = "https://www.googleapis.com/oauth2/v3/certs";
export const GOOGLE_ISSUERS = [
  "accounts.google.com",
  "https://accounts.google.com",
];

export class GoogleTokenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GoogleTokenError";
  }
}

export interface GoogleIdentity {
  sub: string;
  /** Lowercased, verified by Google. */
  email: string;
  name: string | null;
  picture: string | null;
}

let remoteJwks: JWTVerifyGetKey | null = null;

/** Google's signing keys, fetched lazily and cached by jose. */
export function googleJwks(): JWTVerifyGetKey {
  remoteJwks ??= createRemoteJWKSet(new URL(GOOGLE_JWKS_URL));
  return remoteJwks;
}

/**
 * Verifies a Google ID token locally: signature (Google JWKS), issuer,
 * audience (one of our OAuth client ids), expiry, and a verified email.
 */
export async function verifyGoogleIdToken(
  idToken: string,
  audiences: string[],
  keys: JWTVerifyGetKey = googleJwks(),
): Promise<GoogleIdentity> {
  if (audiences.length === 0) {
    throw new GoogleTokenError("Google sign-in is not configured");
  }
  let payload: Record<string, unknown>;
  try {
    ({ payload } = await jwtVerify(idToken, keys, {
      issuer: GOOGLE_ISSUERS,
      audience: audiences,
      algorithms: ["RS256"],
      clockTolerance: 30,
    }));
  } catch {
    throw new GoogleTokenError("Invalid Google token");
  }

  const { sub, email, email_verified: emailVerified } = payload;
  if (typeof sub !== "string" || sub.length === 0) {
    throw new GoogleTokenError("Invalid Google token");
  }
  if (typeof email !== "string" || !email.includes("@")) {
    throw new GoogleTokenError("Google account has no email");
  }
  if (emailVerified !== true) {
    throw new GoogleTokenError("Google email is not verified");
  }
  const name = typeof payload.name === "string" ? payload.name.trim() : "";
  const picture =
    typeof payload.picture === "string" &&
    payload.picture.startsWith("https://")
      ? payload.picture
      : null;

  return {
    sub,
    email: email.trim().toLowerCase(),
    name: name || null,
    picture,
  };
}
