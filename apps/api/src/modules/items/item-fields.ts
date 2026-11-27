import { Types } from "mongoose";

/**
 * Initial document for a note. The body is the item's content (`text`);
 * `note` is the user's own annotation and starts empty.
 */
export function newNoteFields(
  userId: string,
  body: { text: string; capturedAt?: Date },
  now: Date = new Date(),
) {
  return {
    userId: new Types.ObjectId(userId),
    kind: "note" as const,
    status: "pending" as const,
    capturedAt: body.capturedAt ?? now,
    text: body.text,
    note: null,
  };
}
