import { CATEGORY_COLORS } from "@norsumi/common";
import { z } from "zod";

import { objectId } from "../../infra/zod.js";
import { MAX_CATEGORY_NAME } from "./categories.names.js";

const name = z
  .string()
  .trim()
  .min(1, "Name is required")
  .max(MAX_CATEGORY_NAME);
const description = z.string().trim().max(200).nullable();

export const createCategoryBody = z.object({
  name,
  parentId: objectId.nullable().optional(),
  emoji: z.string().trim().min(1).max(16).optional(),
  color: z.enum(CATEGORY_COLORS).optional(),
  description: description.optional(),
});

export const updateCategoryBody = createCategoryBody.partial();
