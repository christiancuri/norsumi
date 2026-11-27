import type { CategoryColor, ItemKind } from "@norsumi/common";

import { nameKey } from "./categories.names.js";
import type { AiCategorySuggestion } from "./categories.service.js";

/**
 * Links and notes have a deterministic root (the platform of the URL, or
 * "Notes"), so the server sets it and the model only picks the topic. This
 * keeps a GitHub link from landing under an unrelated "LinkedIn" root just
 * because that root already had a matching topic.
 */

interface RootSpec {
  name: string;
  emoji: string;
  color: CategoryColor;
  description: string;
}

const PLATFORMS: Array<{ hosts: string[]; root: RootSpec }> = [
  {
    hosts: ["x.com", "twitter.com"],
    root: {
      name: "X",
      emoji: "💬",
      color: "slate",
      description: "Posts and threads from X",
    },
  },
  {
    hosts: ["instagram.com"],
    root: {
      name: "Instagram",
      emoji: "📸",
      color: "fuchsia",
      description: "Posts, reels and profiles from Instagram",
    },
  },
  {
    hosts: ["youtube.com", "youtu.be"],
    root: {
      name: "YouTube",
      emoji: "▶️",
      color: "red",
      description: "Videos and channels from YouTube",
    },
  },
  {
    hosts: ["linkedin.com"],
    root: {
      name: "LinkedIn",
      emoji: "💼",
      color: "blue",
      description: "Posts, jobs and profiles from LinkedIn",
    },
  },
  {
    hosts: ["tiktok.com"],
    root: {
      name: "TikTok",
      emoji: "🎵",
      color: "rose",
      description: "Videos from TikTok",
    },
  },
  {
    hosts: ["reddit.com"],
    root: {
      name: "Reddit",
      emoji: "👽",
      color: "orange",
      description: "Threads from Reddit",
    },
  },
  {
    hosts: ["facebook.com", "fb.com"],
    root: {
      name: "Facebook",
      emoji: "👥",
      color: "blue",
      description: "Posts from Facebook",
    },
  },
  {
    hosts: ["threads.net", "threads.com"],
    root: {
      name: "Threads",
      emoji: "🧵",
      color: "slate",
      description: "Posts from Threads",
    },
  },
  {
    hosts: ["spotify.com"],
    root: {
      name: "Spotify",
      emoji: "🎧",
      color: "emerald",
      description: "Music and podcasts from Spotify",
    },
  },
  {
    hosts: ["maps.app.goo.gl", "maps.google.com"],
    root: {
      name: "Maps",
      emoji: "🗺️",
      color: "emerald",
      description: "Places saved from maps",
    },
  },
];

const WEB: RootSpec = {
  name: "Web",
  emoji: "🌐",
  color: "sky",
  description: "Websites, articles and docs",
};
const NOTES: RootSpec = {
  name: "Notes",
  emoji: "📝",
  color: "amber",
  description: "Notes written by you",
};

function matchesHost(domain: string, host: string): boolean {
  return domain === host || domain.endsWith(`.${host}`);
}

/** The fixed root for an item, or null when the model decides (images). */
export function fixedRoot(
  kind: ItemKind,
  url?: string | null,
): RootSpec | null {
  if (kind === "note") return NOTES;
  if (kind !== "link" || !url) return null;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return WEB;
  }
  const domain = parsed.hostname.toLowerCase().replace(/^www\./, "");
  if (/^google\.[a-z.]+$/.test(domain) && parsed.pathname.startsWith("/maps")) {
    return PLATFORMS.find((p) => p.root.name === "Maps")?.root ?? WEB;
  }
  return (
    PLATFORMS.find((p) => p.hosts.some((h) => matchesHost(domain, h)))?.root ??
    WEB
  );
}

/**
 * Rewrites the model's path to `[fixed root, topic]`. The topic is the
 * model's second level, or its only level when that is not the root itself.
 */
export function applyFixedRoot(
  root: RootSpec,
  path: AiCategorySuggestion[],
): AiCategorySuggestion[] {
  const rootKey = nameKey(root.name);
  const suggestedRoot =
    path[0] && nameKey(path[0].name) === rootKey ? path[0] : undefined;
  const topic =
    path.length >= 2
      ? path[1]
      : path[0] && nameKey(path[0].name) !== rootKey
        ? path[0]
        : undefined;
  const fixed: AiCategorySuggestion = {
    id: suggestedRoot?.id ?? null,
    name: root.name,
    emoji: suggestedRoot?.emoji || root.emoji,
    color: suggestedRoot?.color || root.color,
    description: suggestedRoot?.description || root.description,
  };
  return topic && nameKey(topic.name) !== rootKey ? [fixed, topic] : [fixed];
}
