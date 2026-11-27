import { ImageDown } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { isTypingTarget, useHotkey } from 'src/hooks/use-hotkey';
import { useUiStore } from 'src/stores/ui.store';

import { looksLikeUrl, useCapture } from './use-capture';

/**
 * Window-wide capture: drop images anywhere, paste an image or a URL, press
 * N for a note. Mounted once inside the app shell.
 */
export function CaptureLayer() {
  const { uploadFiles, saveLink } = useCapture();
  const setComposer = useUiStore((s) => s.setComposer);
  const [dragging, setDragging] = useState(false);
  const depth = useRef(0);
  const capture = useRef({ uploadFiles, saveLink });
  capture.current = { uploadFiles, saveLink };

  useHotkey('n', (e) => {
    e.preventDefault();
    setComposer('note');
  });

  useEffect(() => {
    const hasFiles = (e: DragEvent) =>
      e.dataTransfer?.types.includes('Files') ?? false;

    const onEnter = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      depth.current += 1;
      setDragging(true);
    };
    const onOver = (e: DragEvent) => {
      if (hasFiles(e)) e.preventDefault();
    };
    const onLeave = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      depth.current = Math.max(0, depth.current - 1);
      if (depth.current === 0) setDragging(false);
    };
    const onDrop = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      depth.current = 0;
      setDragging(false);
      capture.current.uploadFiles([...(e.dataTransfer?.files ?? [])]);
    };
    const onPaste = (e: ClipboardEvent) => {
      if (isTypingTarget(e.target)) return;
      if (document.querySelector('[role="dialog"]')) return;
      const files = [...(e.clipboardData?.files ?? [])];
      if (files.length > 0) {
        e.preventDefault();
        capture.current.uploadFiles(files);
        return;
      }
      const text = e.clipboardData?.getData('text/plain') ?? '';
      if (looksLikeUrl(text)) {
        e.preventDefault();
        void capture.current.saveLink(text).catch(() => {});
      }
    };

    window.addEventListener('dragenter', onEnter);
    window.addEventListener('dragover', onOver);
    window.addEventListener('dragleave', onLeave);
    window.addEventListener('drop', onDrop);
    window.addEventListener('paste', onPaste);
    return () => {
      window.removeEventListener('dragenter', onEnter);
      window.removeEventListener('dragover', onOver);
      window.removeEventListener('dragleave', onLeave);
      window.removeEventListener('drop', onDrop);
      window.removeEventListener('paste', onPaste);
    };
  }, []);

  return (
    <AnimatePresence>
      {dragging && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="pointer-events-none fixed inset-0 z-[60] grid place-items-center bg-primary/10 p-6 backdrop-blur-md"
        >
          <motion.div
            initial={{ scale: 0.94, y: 8 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 380, damping: 28 }}
            className="grid w-full max-w-lg place-items-center gap-3 rounded-[32px] border-2 border-primary/50 border-dashed bg-surface/80 px-8 py-16 text-center shadow-float"
          >
            <div className="grid size-16 place-items-center rounded-2xl bg-brand text-white shadow-glow">
              <ImageDown className="size-8" />
            </div>
            <div className="font-display text-4xl">Drop to remember</div>
            <p className="text-muted-foreground">
              PNG, JPEG, WebP or HEIC, up to 25 MB each.
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
