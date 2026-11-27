export const queryKeys = {
  info: ['info'] as const,
  me: ['me'] as const,
  categories: ['categories'] as const,
  items: {
    all: ['items'] as const,
    list: ['items', 'list'] as const,
    detail: ['items', 'detail'] as const,
    stats: ['items', 'stats'] as const,
    search: ['items', 'search'] as const,
  },
} as const;
