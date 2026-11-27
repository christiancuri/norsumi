/**
 * What to do when a presented refresh token is already revoked.
 *
 * Two tabs or requests refreshing at the same moment both present the same
 * token; the loser would otherwise look like a replay and log everyone out.
 * Within REFRESH_GRACE_MS of its own rotation the token is answered with 409
 * (the client re-reads its latest token and retries) and nothing is revoked.
 * Any other reuse (later, or of a logged-out token) revokes the family.
 */

export const REFRESH_GRACE_MS = 30_000;
/**
 * A concurrent request may read its clock just before the winner stamps
 * `rotatedAt` (and instances' clocks drift), so slightly "future" rotation
 * times are normal.
 */
export const CLOCK_SKEW_MS = 5_000;

export type RevokedTokenDecision = "grace" | "reuse";

export function classifyRevokedToken(
  token: { revokedAt?: Date | null; rotatedAt?: Date | null },
  now: Date = new Date(),
  graceMs: number = REFRESH_GRACE_MS,
): RevokedTokenDecision {
  if (!token.rotatedAt) return "reuse";
  const age = now.getTime() - token.rotatedAt.getTime();
  return age >= -CLOCK_SKEW_MS && age <= graceMs ? "grace" : "reuse";
}
