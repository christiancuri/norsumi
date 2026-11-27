export interface PrunableCategory {
  id: string;
  parentId: string | null;
  /** Missing (older docs) counts as "ai". */
  origin?: "ai" | "user";
}

/**
 * AI-created categories that hold no items (archived included) and have no
 * remaining children. Removing a child can empty its parent, so parents are
 * re-checked until nothing changes. User categories are never returned.
 */
export function prunableCategoryIds(
  categories: PrunableCategory[],
  usedIds: Set<string>,
): string[] {
  const remaining = new Map(categories.map((c) => [c.id, c]));
  const pruned: string[] = [];
  for (let changed = true; changed; ) {
    changed = false;
    const parents = new Set(
      [...remaining.values()].flatMap((c) => (c.parentId ? [c.parentId] : [])),
    );
    for (const category of [...remaining.values()]) {
      if ((category.origin ?? "ai") !== "ai") continue;
      if (usedIds.has(category.id) || parents.has(category.id)) continue;
      remaining.delete(category.id);
      pruned.push(category.id);
      changed = true;
    }
  }
  return pruned;
}
