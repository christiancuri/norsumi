import { z } from "zod";

export const objectId = z
  .string()
  .regex(/^[0-9a-f]{24}$/i, "Invalid id")
  .transform((value) => value.toLowerCase());

export const idParams = z.object({ id: objectId });

/** Query-string boolean: only "true"/"false" (and 1/0). */
export const queryBool = z.stringbool({
  truthy: ["true", "1"],
  falsy: ["false", "0"],
});

export const isoDate = z.iso
  .datetime({ offset: true })
  .transform((value) => new Date(value));
