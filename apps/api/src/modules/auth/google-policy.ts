/**
 * What a Google sign-in may do. There is no email verification for
 * password accounts, so an existing account with the same email is never
 * linked automatically: an attacker could pre-register the victim's email
 * with a password and wait for the victim to arrive with Google ("account
 * pre-claim"). Linking will only happen from an authenticated session.
 */

export const PASSWORD_ACCOUNT_EXISTS =
  "An account with this email already exists. Sign in with your password, then connect Google in Settings.";
export const OTHER_GOOGLE_ACCOUNT =
  "This email is already linked to a different Google account.";
export const REGISTRATION_CLOSED = "Registration is closed on this server";

export type GoogleSignInDecision =
  | { action: "signin" }
  | { action: "create" }
  | { action: "reject"; status: 403 | 409; message: string };

export function decideGoogleSignIn(input: {
  /** Account already keyed by this Google `sub`. */
  bySub: { id: string } | null;
  /** Account with the same (lowercased) email, if any. */
  byEmail: { passwordHash?: string | null; googleSub?: string | null } | null;
  registrationOpen: boolean;
}): GoogleSignInDecision {
  if (input.bySub) return { action: "signin" };
  if (input.byEmail) {
    return {
      action: "reject",
      status: 409,
      message: input.byEmail.googleSub
        ? OTHER_GOOGLE_ACCOUNT
        : PASSWORD_ACCOUNT_EXISTS,
    };
  }
  if (!input.registrationOpen) {
    return { action: "reject", status: 403, message: REGISTRATION_CLOSED };
  }
  return { action: "create" };
}
