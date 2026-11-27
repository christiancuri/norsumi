import "fastify";

declare module "fastify" {
  interface FastifyRequest {
    /** Set by the auth hook on every non-public route. */
    user?: { id: string; email: string };
  }
  interface FastifyContextConfig {
    /** Route skips the bearer-token check. */
    public?: boolean;
  }
}
