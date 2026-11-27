import type { Item } from '@norsumi/common';

/** A note's body. Servers may keep it in `text` or in `note`. */
export function noteBody(item: Item) {
  return item.text ?? item.note ?? '';
}

/** Card/viewer title with sensible fallbacks while the AI hasn't run yet. */
export function itemTitle(item: Item) {
  if (item.title) return item.title;
  if (item.kind === 'link') return item.link?.title ?? item.link?.domain ?? '';
  if (item.kind === 'note') return noteBody(item).split('\n')[0] ?? '';
  return '';
}

export function itemPreviewUrl(item: Item) {
  return item.image?.thumbUrl ?? item.link?.imageUrl ?? null;
}

export function itemKindLabel(item: Item) {
  switch (item.kind) {
    case 'screenshot':
      return 'Screenshot';
    case 'image':
      return 'Image';
    case 'link':
      return 'Link';
    case 'note':
      return 'Note';
  }
}
