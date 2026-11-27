import pino, { type Logger as PinoLogger } from "pino";

const isProduction = process.env.NODE_ENV === "production";

/**
 * Single pino instance shared by Fastify and the rest of the app. Never log
 * secrets, tokens, image bytes or AI payload contents: log ids, sizes,
 * durations and counts only.
 */
export const rootLogger: PinoLogger = pino({
  level: process.env.LOG_LEVEL || (isProduction ? "info" : "debug"),
  base: undefined,
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      "*.password",
      "*.refreshToken",
      "*.accessToken",
    ],
    censor: "***",
  },
  ...(!isProduction && {
    transport: {
      target: "pino-pretty",
      options: {
        colorize: true,
        translateTime: "SYS:HH:MM:ss.l",
        ignore: "pid,hostname",
      },
    },
  }),
});

export type Logger = PinoLogger;

export const createLogger = (name: string): Logger =>
  rootLogger.child({ name });
