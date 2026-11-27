import { Pencil, Plus } from 'lucide-react';
import { Link, useParams } from 'react-router';
import { EmptyState } from 'src/components/common/empty-state';
import { ItemGrid } from 'src/components/library/item-grid';
import { PageHeader } from 'src/components/library/page-header';
import { Button } from 'src/components/ui/button';
import { Skeleton } from 'src/components/ui/skeleton';
import { swatch } from 'src/lib/category-colors';
import { cn } from 'src/lib/utils';
import { useCategories } from 'src/queries/categories.queries';
import { NotFoundPage } from 'src/routes/pages/errors';
import { useUiStore } from 'src/stores/ui.store';

export function CategoryPage() {
  const { categoryId = '' } = useParams();
  const { data: categories, isLoading } = useCategories();
  const setCategoryDialog = useUiStore((s) => s.setCategoryDialog);

  if (isLoading) {
    return (
      <div className="pt-10">
        <Skeleton className="h-14 w-80 rounded-2xl" />
      </div>
    );
  }

  const category = categories?.find((c) => c.id === categoryId);
  if (!category) return <NotFoundPage />;

  const parent = categories?.find((c) => c.id === category.parentId);
  const children = categories?.filter((c) => c.parentId === category.id) ?? [];
  const tint = swatch(category.color);

  return (
    <>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-0 h-72 opacity-[0.10] dark:opacity-[0.14]"
        style={{
          background: `radial-gradient(60% 100% at 30% 0%, ${tint.hex}, transparent 70%)`,
        }}
      />
      <PageHeader
        className="relative"
        eyebrow={
          <span className="inline-flex items-center gap-2">
            <span
              className={cn(
                'grid size-6 place-items-center rounded-lg text-[13px]',
                tint.chip,
              )}
            >
              {category.emoji}
            </span>
            {category.itemCount + children.reduce((n, c) => n + c.itemCount, 0)}{' '}
            items
          </span>
        }
        title={
          parent ? (
            <>
              <Link
                to={`/c/${parent.id}`}
                className="text-muted-foreground transition hover:text-foreground"
              >
                {parent.name}
              </Link>
              <span className="mx-3 text-muted-foreground/50">›</span>
              <em>{category.name}</em>
            </>
          ) : (
            <em>{category.name}</em>
          )
        }
        description={category.description}
        actions={
          <Button
            variant="outline"
            size="sm"
            className="rounded-full"
            onClick={() => setCategoryDialog({ mode: 'edit', category })}
          >
            <Pencil className="size-3.5" /> Edit
          </Button>
        }
      >
        {!parent && (
          <div className="scrollbar-none -mx-3 flex gap-2 overflow-x-auto px-3 sm:mx-0 sm:flex-wrap sm:px-0">
            {children.map((child) => (
              <Link
                key={child.id}
                to={`/c/${child.id}`}
                className={cn(
                  'inline-flex h-9 shrink-0 items-center gap-2 rounded-full border border-border/70 bg-surface pr-3.5 pl-2 text-[13px] shadow-[0_1px_2px_rgb(10_13_23/0.04)] transition hover:-translate-y-px hover:shadow-lift',
                )}
              >
                <span
                  className={cn(
                    'grid size-6 place-items-center rounded-full text-[12px]',
                    swatch(child.color).chip,
                  )}
                >
                  {child.emoji}
                </span>
                <span className="font-medium">{child.name}</span>
                <span className="text-muted-foreground tabular">
                  {child.itemCount}
                </span>
              </Link>
            ))}
            <button
              type="button"
              onClick={() =>
                setCategoryDialog({ mode: 'create', parent: category })
              }
              className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-border border-dashed px-3.5 text-[13px] text-muted-foreground transition hover:border-foreground/30 hover:text-foreground"
            >
              <Plus className="size-3.5" /> New topic
            </button>
          </div>
        )}
      </PageHeader>

      <ItemGrid
        key={category.id}
        className="relative"
        filter={{ categoryId: category.id, includeChildren: true }}
        empty={
          <EmptyState
            title={
              <>
                Nothing in <em>{category.name}</em> yet
              </>
            }
            description="New captures land here when norsumi thinks they belong. You can also move items here from their detail view."
          />
        }
      />
    </>
  );
}
