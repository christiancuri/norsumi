import { FileText, ImageUp, Link2, Plus } from 'lucide-react';
import { useRef } from 'react';
import { Button } from 'src/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from 'src/components/ui/dropdown-menu';
import { cn } from 'src/lib/utils';
import { useUiStore } from 'src/stores/ui.store';

import { useCapture } from './use-capture';

export function NewMenu({
  className,
  trigger,
}: {
  className?: string;
  trigger?: React.ReactNode;
}) {
  const input = useRef<HTMLInputElement>(null);
  const setComposer = useUiStore((s) => s.setComposer);
  const { uploadFiles } = useCapture();

  return (
    <>
      <input
        ref={input}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/heic,image/heif"
        multiple
        hidden
        onChange={(e) => {
          if (e.target.files) uploadFiles([...e.target.files]);
          e.target.value = '';
        }}
      />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          {trigger ?? (
            <Button
              size="sm"
              className={cn(
                'h-8 gap-1.5 rounded-full pr-3.5 pl-2.5 shadow-[0_6px_20px_-8px_var(--primary)]',
                className,
              )}
            >
              <Plus className="size-4" strokeWidth={2.4} />
              New
            </Button>
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-60">
          <DropdownMenuItem onSelect={() => input.current?.click()}>
            <ImageUp /> Upload screenshots
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setComposer('link')}>
            <Link2 /> Save a link
            <DropdownMenuShortcut>⌘V</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setComposer('note')}>
            <FileText /> Write a note
            <DropdownMenuShortcut>N</DropdownMenuShortcut>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
