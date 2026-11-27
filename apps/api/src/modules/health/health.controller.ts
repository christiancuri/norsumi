import type { ServerInfo } from "@norsumi/common";
import { Controller, GET } from "fastify-decorators";

import { Env } from "../../infra/env.js";
import { APP_VERSION } from "../../infra/version.js";

@Controller("/")
export default class HealthController {
  @GET("/health", { config: { public: true } })
  async health() {
    return { ok: true };
  }

  @GET("/api/info", { config: { public: true } })
  async info(): Promise<ServerInfo> {
    const webClientId = Env.GOOGLE_CLIENT_IDS[0];
    return {
      name: "norsumi",
      version: APP_VERSION,
      registrationOpen: Env.REGISTRATION_OPEN,
      auth: {
        password: true,
        google: webClientId ? { webClientId } : null,
      },
    };
  }
}
