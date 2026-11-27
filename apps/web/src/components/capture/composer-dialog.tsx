import { FileText, Link2 } from 'lucide-react';
import { type FormEvent, useEffect, useState } from 'react';
import { Button } from 'src/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from 'src/components/ui/dialog';
import { Input } from 'src/components/ui/input';
import { Textarea } from 'src/components/ui/textarea';
import { useUiStore } from 'src/stores/ui.store';

import { looksLikeUrl, useCapture } from './use-capture';

export function ComposerDialog() {
  const composer = useUiStore((s) => s.composer);
  const setComposer = useUiStore((s) => s.setComposer);
  const { saveLink, saveNote, isSaving } = useCapture();
  const [url, setUrl] = useState('');
  const [text, setText] = useState('');

  useEffect(() => {
    if (composer) {
      setUrl('');
      setText('');
    }
  }, [composer]);

  const close = () => setComposer(null);
  const valid =
    composer === 'link' ? looksLikeUrl(url) : text.trim().length > 0;

  const submit = async (e?: FormEvent) => {
    e?.preventDefault();
    if (!valid) return;
    try {
      if (composer === 'link') await saveLink(url, text.trim() || undefined);
      else await saveNote(text.trim());
      close();
    } catch {
      // Toast already shown.
    }
  };

  const Icon = composer === 'link' ? Link2 : FileText;

  return (
    <Dialog open={!!composer} onOpenChange={(open) => !open && close()}>
      <DialogContent className="gap-5 sm:max-w-lg">
        <DialogHeader>
          <div className="mb-1 grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
            <Icon className="size-5" />
          </div>
          <DialogTitle className="font-display font-normal text-3xl">
            {composer === 'link' ? 'Save a link' : 'Write a note'}
          </DialogTitle>
          <DialogDescription>
            {composer === 'link'
              ? 'norsumi reads the page, summarizes it and files it for you.'
              : 'Jot it down. norsumi gives it a title and a home.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-3">
          {composer === 'link' && (
            <Input
              autoFocus
              type="url"
              inputMode="url"
              placeholder="https://"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="h-11 rounded-xl text-[15px]"
            />
          )}
          <Textarea
            autoFocus={composer === 'note'}
            placeholder={
              composer === 'link'
                ? 'Add context (optional)'
                : 'Restaurants to try in Lisbon…'
            }
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) void submit();
            }}
            className={
              composer === 'note'
                ? 'min-h-44 resize-none rounded-xl text-[15px] leading-relaxed'
                : 'min-h-20 resize-none rounded-xl'
            }
          />
          <div className="flex items-center justify-between pt-1">
            <span className="text-[12px] text-muted-foreground">
              <kbd className="font-mono">⌘ Enter</kbd> to save
            </span>
            <div className="flex gap-2">
              <Button type="button" variant="ghost" onClick={close}>
                Cancel
              </Button>
              <Button type="submit" disabled={!valid || isSaving}>
                Save
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
