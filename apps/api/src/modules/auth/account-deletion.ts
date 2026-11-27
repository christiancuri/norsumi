/**
 * Accounts with a password must re-enter it to delete themselves;
 * Google-only accounts (no password) are confirmed by their session alone.
 */
export function deletionNeedsPassword(user: {
  passwordHash?: string | null;
}): boolean {
  return Boolean(user.passwordHash);
}
