import { ACCEPTED_IMAGE_MIME_TYPES, MAX_UPLOAD_BYTES } from '@norsumi/common';
import { toast } from 'sonner';
import { errorMessage } from 'src/lib/axios';
import {
  useCreateLink,
  useCreateNote,
  useUploadItem,
} from 'src/queries/items.queries';

const accepted = new Set<string>(ACCEPTED_IMAGE_MIME_TYPES);

export const isImageFile = (file: File) => accepted.has(file.type);

export function looksLikeUrl(text: string) {
  const value = text.trim();
  if (!/^https?:\/\/\S+$/i.test(value)) return false;
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

/** Every way to put something into the library from the web. */
export function useCapture() {
  const upload = useUploadItem();
  const link = useCreateLink();
  const note = useCreateNote();

  const uploadFiles = (files: File[]) => {
    const images = files.filter(isImageFile);
    const skipped = files.length - images.length;
    if (skipped > 0) {
      toast.error(
        skipped === 1
          ? 'That file type isn’t supported'
          : `${skipped} files aren’t supported images`,
      );
    }
    const ok = images.filter((f) => f.size <= MAX_UPLOAD_BYTES);
    if (ok.length < images.length) toast.error('Images must be under 25 MB');
    if (ok.length === 0) return;

    const run = Promise.all(ok.map((file) => upload.mutateAsync(file)));
    toast.promise(run, {
      loading:
        ok.length === 1
          ? 'Saving screenshot…'
          : `Saving ${ok.length} screenshots…`,
      success:
        ok.length === 1
          ? 'Saved. norsumi is reading it.'
          : `${ok.length} saved. norsumi is reading them.`,
      error: (err) => errorMessage(err),
    });
  };

  const saveLink = (url: string, text?: string) =>
    link.mutateAsync({ url: url.trim(), text }).then(
      (item) => {
        toast.success('Link saved', { description: item.link?.domain });
        return item;
      },
      (err) => {
        toast.error(errorMessage(err));
        throw err;
      },
    );

  const saveNote = (text: string) =>
    note.mutateAsync({ text }).then(
      (item) => {
        toast.success('Note saved');
        return item;
      },
      (err) => {
        toast.error(errorMessage(err));
        throw err;
      },
    );

  return {
    uploadFiles,
    saveLink,
    saveNote,
    isSaving: link.isPending || note.isPending,
  };
}
