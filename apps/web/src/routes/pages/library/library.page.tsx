import { ITEM_KINDS, type ItemKind } from '@norsumi/common';
import { FileText, ImageUp, Link2 } from 'lucide-react';
import { useParams } from 'react-router';
import { EmptyState } from 'src/components/common/empty-state';
import { ItemGrid } from 'src/components/library/item-grid';
import { KindTabs } from 'src/components/library/kind-tabs';
import { PageHeader } from 'src/components/library/page-header';
import { Button } from 'src/components/ui/button';
import { compact, greeting } from 'src/lib/format';
import type { ItemFilter } from 'src/queries/items.queries';
import { useStats } from 'src/queries/items.queries';
import { NotFoundPage } from 'src/routes/pages/errors';
import { useAuthStore } from 'src/stores/auth.store';
import { useUiStore } from 'src/stores/ui.store';

type View = 'all' | 'favorites' | 'archive' | ItemKind;

const TITLES: Record<View, React.ReactNode> = {
  all: (
    <>
      Your <em>library</em>
    </>
  ),
  screenshot: 'Screenshots',
  image: 'Images',
  link: 'Links',
  note: 'Notes',
  favorites: (
    <>
      <em>Favorites</em>
    </>
  ),
  archive: 'Archive',
};

const EMPTY: Record<View, { title: React.ReactNode; description: string }> = {
  all: {
    title: (
      <>
        Every screenshot, <em>remembered</em>.
      </>
    ),
    description:
      'Drop a screenshot anywhere, paste a link, or install the Android app to save them automatically.',
  },
  screenshot: {
    title: 'No screenshots yet',
    description: 'Drag images onto this page or paste one with ⌘V.',
  },
  image: {
    title: 'No images yet',
    description: 'Images you save show up here.',
  },
  link: {
    title: 'No links yet',
    description:
      'Paste a URL anywhere in norsumi and it’s saved and summarized.',
  },
  note: {
    title: 'No notes yet',
    description: 'Press N to jot something down. norsumi files it for you.',
  },
  favorites: {
    title: 'Nothing starred yet',
    description: 'Press F on anything worth keeping close.',
  },
  archive: {
    title: 'The archive is empty',
    description: 'Archived items rest here, out of the way but never lost.',
  },
};

export function LibraryPage({ view }: { view?: 'favorites' | 'archive' }) {
  const { kind } = useParams();
  const user = useAuthStore((s) => s.user);
  const { data: stats } = useStats();
  const setComposer = useUiStore((s) => s.setComposer);

  if (kind && !(ITEM_KINDS as readonly string[]).includes(kind)) {
    return <NotFoundPage />;
  }
  const current: View = view ?? (kind as ItemKind | undefined) ?? 'all';

  const filter: ItemFilter =
    current === 'favorites'
      ? { favorite: true }
      : current === 'archive'
        ? { archived: true }
        : current === 'all'
          ? {}
          : current === 'screenshot'
            ? { kind: ['screenshot', 'image'] }
            : { kind: current };

  const firstName = user?.name.split(' ')[0];
  const empty = EMPTY[current];

  return (
    <>
      <PageHeader
        eyebrow={
          current === 'all' ? (
            <>
              {greeting()}
              {firstName ? `, ${firstName}` : ''}
              {stats?.total ? (
                <span className="text-muted-foreground/70">
                  {' '}
                  · {compact(stats.total)}{' '}
                  {stats.total === 1 ? 'thing' : 'things'} remembered
                </span>
              ) : null}
            </>
          ) : undefined
        }
        title={TITLES[current]}
      >
        {current !== 'archive' && <KindTabs />}
      </PageHeader>

      <ItemGrid
        key={JSON.stringify(filter)}
        filter={filter}
        empty={
          <EmptyState
            title={empty.title}
            description={empty.description}
            action={
              current === 'all' ? (
                <>
                  <Button
                    variant="outline"
                    className="rounded-full"
                    onClick={() => setComposer('link')}
                  >
                    <Link2 /> Save a link
                  </Button>
                  <Button
                    variant="outline"
                    className="rounded-full"
                    onClick={() => setComposer('note')}
                  >
                    <FileText /> Write a note
                  </Button>
                </>
              ) : current === 'screenshot' ? (
                <Button variant="outline" className="rounded-full" disabled>
                  <ImageUp /> Drop images anywhere
                </Button>
              ) : undefined
            }
          />
        }
      />
    </>
  );
}
