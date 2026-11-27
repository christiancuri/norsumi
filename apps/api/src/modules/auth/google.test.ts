import {
  createLocalJWKSet,
  exportJWK,
  generateKeyPair,
  type JWK,
  SignJWT,
} from "jose";
import { beforeAll, describe, expect, it } from "vitest";

import { GoogleTokenError, verifyGoogleIdToken } from "./google.js";

const CLIENT_ID = "123-web.apps.googleusercontent.com";
const ANDROID_ID = "123-android.apps.googleusercontent.com";

let privateKey: CryptoKey;
let otherKey: CryptoKey;
let jwks: ReturnType<typeof createLocalJWKSet>;

beforeAll(async () => {
  const pair = await generateKeyPair("RS256");
  privateKey = pair.privateKey;
  otherKey = (await generateKeyPair("RS256")).privateKey;
  const jwk: JWK = {
    ...(await exportJWK(pair.publicKey)),
    kid: "test",
    alg: "RS256",
    use: "sig",
  };
  jwks = createLocalJWKSet({ keys: [jwk] });
});

function token(
  claims: Record<string, unknown> = {},
  options: {
    key?: CryptoKey;
    iss?: string;
    aud?: string;
    exp?: string | number;
  } = {},
) {
  return new SignJWT({
    email: "Someone@Example.com",
    email_verified: true,
    name: "Some One",
    picture: "https://lh3.googleusercontent.com/a/photo",
    ...claims,
  })
    .setProtectedHeader({ alg: "RS256", kid: "test" })
    .setSubject("1234567890")
    .setIssuer(options.iss ?? "https://accounts.google.com")
    .setAudience(options.aud ?? CLIENT_ID)
    .setIssuedAt()
    .setExpirationTime(options.exp ?? "1h")
    .sign(options.key ?? privateKey);
}

describe("verifyGoogleIdToken", () => {
  it("returns the identity for a valid token", async () => {
    const identity = await verifyGoogleIdToken(
      await token(),
      [CLIENT_ID, ANDROID_ID],
      jwks,
    );
    expect(identity).toEqual({
      sub: "1234567890",
      email: "someone@example.com",
      name: "Some One",
      picture: "https://lh3.googleusercontent.com/a/photo",
    });
  });

  it("accepts both Google issuers and any configured audience", async () => {
    const t = await token({}, { iss: "accounts.google.com", aud: ANDROID_ID });
    await expect(
      verifyGoogleIdToken(t, [CLIENT_ID, ANDROID_ID], jwks),
    ).resolves.toBeTruthy();
  });

  it.each([
    ["another audience", {}, { aud: "evil.apps.googleusercontent.com" }],
    ["another issuer", {}, { iss: "https://evil.example.com" }],
    ["an expired token", {}, { exp: Math.floor(Date.now() / 1000) - 3600 }],
    ["an unverified email", { email_verified: false }, {}],
    ["email_verified as a string", { email_verified: "true" }, {}],
    ["no email", { email: undefined }, {}],
  ] as const)("rejects %s", async (_label, claims, options) => {
    const t = await token(claims as Record<string, unknown>, options);
    await expect(
      verifyGoogleIdToken(t, [CLIENT_ID], jwks),
    ).rejects.toBeInstanceOf(GoogleTokenError);
  });

  it("rejects a token signed by an unknown key", async () => {
    const t = await token({}, { key: otherKey });
    await expect(
      verifyGoogleIdToken(t, [CLIENT_ID], jwks),
    ).rejects.toBeInstanceOf(GoogleTokenError);
  });

  it("rejects everything when no client id is configured", async () => {
    await expect(
      verifyGoogleIdToken(await token(), [], jwks),
    ).rejects.toBeInstanceOf(GoogleTokenError);
  });
});
