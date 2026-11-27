import type { FastifyRequest } from "fastify";

export const MINUTE = 60 * 1000;
export const HOUR = 60 * MINUTE;

/** Route `config.rateLimit` keyed by the signed-in user (cost control). */
export function perUser(
  max: number,
  timeWindow: number,
  options: { onlyWhen?: (req: FastifyRequest) => boolean } = {},
) {
  const { onlyWhen } = options;
  return {
    max,
    timeWindow,
    keyGenerator: (req: FastifyRequest) => `user:${req.user?.id ?? req.ip}`,
    ...(onlyWhen && {
      // allowList returning true skips the limit for that request.
      allowList: (req: FastifyRequest) => !onlyWhen(req),
    }),
  };
}
