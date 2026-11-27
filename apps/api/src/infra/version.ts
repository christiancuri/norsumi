import { readFileSync } from "node:fs";

/** Version from apps/api/package.json (dist/infra → ../../package.json). */
function readVersion(): string {
  try {
    const url = new URL("../../package.json", import.meta.url);
    const pkg = JSON.parse(readFileSync(url, "utf8")) as { version?: string };
    return pkg.version ?? "0.0.0";
  } catch {
    return process.env.npm_package_version ?? "0.0.0";
  }
}

export const APP_VERSION = readVersion();
