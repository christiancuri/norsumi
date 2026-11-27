import type { Category } from '@norsumi/common';

export interface CategoryNode extends Category {
  children: Category[];
  /** Own items + children's items. */
  totalCount: number;
}

export function buildTree(categories: Category[]): CategoryNode[] {
  const byName = (a: Category, b: Category) => a.name.localeCompare(b.name);
  return categories
    .filter((c) => !c.parentId)
    .sort(byName)
    .map((root) => {
      const children = categories
        .filter((c) => c.parentId === root.id)
        .sort(byName);
      return {
        ...root,
        children,
        totalCount:
          root.itemCount + children.reduce((n, c) => n + c.itemCount, 0),
      };
    });
}
