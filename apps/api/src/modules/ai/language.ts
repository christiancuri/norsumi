/**
 * Tiny stopword-based language guess for link/note text. Some text models
 * drift into a language that is not the content's; an explicit "write in X"
 * fixes that. Returns null when the text is too short or ambiguous (the
 * prompt then falls back to "content's language, else English").
 */

const LANGUAGES = {
  English:
    "the and of to is in for with you that this are on it your from be by an or not have was will can",
  Portuguese:
    "não você uma com para pelo pela do da dos das no na é são mais isso essa esse também muito ao seu sua eu está como mas",
  Spanish:
    "el los las y una con por del al es son más pero también muy está como su sus yo esto eso hay",
  French:
    "le les et des du une est sont pour avec pas dans sur qui vous nous ce cette au aux être mais",
  German:
    "der die das und ist nicht ein eine mit für auf den dem sich auch zu von wir sie es ich",
  Italian:
    "il lo gli e è non una con per che della del delle sono anche questo questa nel alla",
} as const;

export type DetectedLanguage = keyof typeof LANGUAGES;

const WORDS = Object.fromEntries(
  Object.entries(LANGUAGES).map(([lang, words]) => [
    lang,
    new Set(words.split(" ")),
  ]),
) as Record<DetectedLanguage, Set<string>>;

/** Letters that point strongly at one language. */
const MARKERS: Array<[RegExp, DetectedLanguage]> = [
  [/[ãõ]/, "Portuguese"],
  [/ç/, "Portuguese"],
  [/[ñ¿¡]/, "Spanish"],
  [/[äöüß]/, "German"],
];

export function detectLanguage(text: string): DetectedLanguage | null {
  const tokens = text
    .toLowerCase()
    .split(/[^\p{L}]+/u)
    .filter(Boolean)
    .slice(0, 3000);
  const scores = new Map<DetectedLanguage, number>();
  const add = (lang: DetectedLanguage, n = 1) =>
    scores.set(lang, (scores.get(lang) ?? 0) + n);
  for (const token of tokens) {
    for (const lang of Object.keys(WORDS) as DetectedLanguage[]) {
      if (WORDS[lang].has(token)) add(lang);
    }
    for (const [pattern, lang] of MARKERS) {
      if (pattern.test(token)) add(lang);
    }
  }
  const ranked = [...scores.entries()].sort((a, b) => b[1] - a[1]);
  const [best, second] = ranked;
  if (!best) return null;
  const runnerUp = second?.[1] ?? 0;
  const confident =
    (best[1] >= 2 && best[1] >= runnerUp * 2) ||
    (best[1] >= 4 && best[1] >= runnerUp * 1.5);
  return confident ? best[0] : null;
}

/** Instruction line appended to text prompts. */
export function languageInstruction(text: string): string {
  const language = detectLanguage(text);
  return language
    ? `Content language: ${language}. Write the title, summary and tags in ${language}.`
    : "Content language: unclear. Write the title, summary and tags in the content's language if evident, otherwise in English.";
}
