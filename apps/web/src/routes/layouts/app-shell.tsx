import { useEffect } from 'react';
import { Outlet } from 'react-router';
import { CaptureLayer } from 'src/components/capture/capture-layer';
import { ComposerDialog } from 'src/components/capture/composer-dialog';
import { CategoryDialog } from 'src/components/category/category-dialog';
import { DeleteCategoryDialog } from 'src/components/category/delete-category-dialog';
import { ItemViewer } from 'src/components/item/item-viewer';
import { MobileTabBar } from 'src/components/layout/mobile-tab-bar';
import { Sidebar } from 'src/components/layout/sidebar';
import { TopBar } from 'src/components/layout/top-bar';
import { CommandPalette } from 'src/components/search/command-palette';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from 'src/components/ui/sheet';
import { useMe } from 'src/queries/auth.queries';
import { useAuthStore } from 'src/stores/auth.store';
import { useUiStore } from 'src/stores/ui.store';

export function AppShell() {
  // Keep the persisted profile (name, avatar) fresh.
  const { data: me } = useMe();
  const setUser = useAuthStore((s) => s.setUser);
  useEffect(() => {
    if (me) setUser(me);
  }, [me, setUser]);

  const mobileNavOpen = useUiStore((s) => s.mobileNavOpen);
  const setMobileNavOpen = useUiStore((s) => s.setMobileNavOpen);
  const categoryDialog = useUiStore((s) => s.categoryDialog);
  const setCategoryDialog = useUiStore((s) => s.setCategoryDialog);
  const categoryToDelete = useUiStore((s) => s.categoryToDelete);
  const setCategoryToDelete = useUiStore((s) => s.setCategoryToDelete);

  return (
    <div className="min-h-dvh bg-background">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 border-border/60 border-r bg-[color-mix(in_oklab,var(--surface-2)_55%,var(--background))] lg:block">
        <Sidebar />
      </aside>

      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent
          side="left"
          showCloseButton={false}
          className="w-[300px] gap-0 bg-background p-0 sm:max-w-[300px]"
        >
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <SheetDescription className="sr-only">
            Library sections and categories
          </SheetDescription>
          <Sidebar />
        </SheetContent>
      </Sheet>

      <div className="flex min-h-dvh flex-col lg:pl-64">
        <TopBar />
        <main className="flex-1 px-3 pb-28 sm:px-5 sm:pb-16 lg:px-8">
          <Outlet />
        </main>
      </div>

      <MobileTabBar />
      <ItemViewer />
      <CommandPalette />
      <ComposerDialog />
      <CaptureLayer />
      <CategoryDialog
        state={categoryDialog}
        onClose={() => setCategoryDialog(null)}
      />
      <DeleteCategoryDialog
        category={categoryToDelete}
        onClose={() => setCategoryToDelete(null)}
      />
    </div>
  );
}
