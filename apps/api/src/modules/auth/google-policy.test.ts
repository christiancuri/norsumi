import { describe, expect, it } from "vitest";

import {
  decideGoogleSignIn,
  OTHER_GOOGLE_ACCOUNT,
  PASSWORD_ACCOUNT_EXISTS,
} from "./google-policy.js";

describe("decideGoogleSignIn", () => {
  it("signs in the account keyed by the Google sub", () => {
    expect(
      decideGoogleSignIn({
        bySub: { id: "u1" },
        byEmail: { googleSub: "s" },
        registrationOpen: false,
      }),
    ).toEqual({ action: "signin" });
  });

  it("never links to a pre-existing password account (pre-claim)", () => {
    expect(
      decideGoogleSignIn({
        bySub: null,
        byEmail: { passwordHash: "v1$x", googleSub: null },
        registrationOpen: true,
      }),
    ).toEqual({
      action: "reject",
      status: 409,
      message: PASSWORD_ACCOUNT_EXISTS,
    });
  });

  it("rejects an email owned by another Google account", () => {
    expect(
      decideGoogleSignIn({
        bySub: null,
        byEmail: { passwordHash: null, googleSub: "other" },
        registrationOpen: true,
      }),
    ).toEqual({ action: "reject", status: 409, message: OTHER_GOOGLE_ACCOUNT });
  });

  it("creates a new account only when registration is open", () => {
    expect(
      decideGoogleSignIn({
        bySub: null,
        byEmail: null,
        registrationOpen: true,
      }),
    ).toEqual({ action: "create" });
    expect(
      decideGoogleSignIn({
        bySub: null,
        byEmail: null,
        registrationOpen: false,
      }),
    ).toMatchObject({
      action: "reject",
      status: 403,
    });
  });
});
