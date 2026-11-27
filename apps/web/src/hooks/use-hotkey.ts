import { useEffect, useRef } from 'react';

export function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.isContentEditable ||
    ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
  );
}

/**
 * Global key handler. `combo` like "mod+k", "f", "arrowleft". Ignores keys
 * typed into fields unless `allowInInputs` is set.
 */
export function useHotkey(
  combo: string,
  handler: (event: KeyboardEvent) => void,
  { enabled = true, allowInInputs = false } = {},
) {
  const ref = useRef(handler);
  ref.current = handler;

  useEffect(() => {
    if (!enabled) return;
    const parts = combo.toLowerCase().split('+');
    const key = parts.at(-1);
    const mod = parts.includes('mod');
    const shift = parts.includes('shift');
    const onKey = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== key) return;
      if (mod !== (event.metaKey || event.ctrlKey)) return;
      if (shift !== event.shiftKey) return;
      if (!mod && event.altKey) return;
      if (!allowInInputs && isTypingTarget(event.target)) return;
      ref.current(event);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [combo, enabled, allowInInputs]);
}
