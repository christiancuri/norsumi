import type { CategoryColor } from "./constants.js";

/**
 * Two-level tree. Roots are usually the *source* (Instagram, X, Web,
 * WhatsApp...), children the *topic* (Restaurants, AI, Study...).
 * Both the AI and the user can create categories.
 */
export interface Category {
  id: string;
  name: string;
  /** Unique per user among siblings, lowercase-kebab. */
  slug: string;
  parentId: string | null;
  /** Single emoji. */
  emoji: string;
  color: CategoryColor;
  /** Optional one-line description (AI-written or user-edited). */
  description: string | null;
  /** Items directly in this category (not counting children). */
  itemCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCategoryBody {
  name: string;
  parentId?: string | null;
  emoji?: string;
  color?: CategoryColor;
  description?: string | null;
}

export type UpdateCategoryBody = Partial<CreateCategoryBody>;

/** Minimal reference used inside items (breadcrumb root → leaf). */
export interface CategoryRef {
  id: string;
  name: string;
  emoji: string;
  color: CategoryColor;
}
