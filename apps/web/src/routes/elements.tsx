import { type ComponentType, lazy, type ReactNode, Suspense } from 'react';

import { PageFallback, ScreenFallback } from './fallbacks';

const Loadable = <P extends object>(
  Component: ComponentType<P>,
  fallback: ReactNode = <PageFallback />,
) =>
  function LoadableComponent(props: P) {
    return (
      <Suspense fallback={fallback}>
        <Component {...props} />
      </Suspense>
    );
  };

export const LandingPage = Loadable(
  lazy(() =>
    import('./pages/landing/landing.page').then((m) => ({
      default: m.LandingPage,
    })),
  ),
  <ScreenFallback />,
);

export const LoginPage = Loadable(
  lazy(() =>
    import('./pages/auth/login.page').then((m) => ({ default: m.LoginPage })),
  ),
  <ScreenFallback />,
);

export const RegisterPage = Loadable(
  lazy(() =>
    import('./pages/auth/register.page').then((m) => ({
      default: m.RegisterPage,
    })),
  ),
  <ScreenFallback />,
);

export const PrivacyPage = Loadable(
  lazy(() =>
    import('./pages/legal/privacy.page').then((m) => ({
      default: m.PrivacyPage,
    })),
  ),
  <ScreenFallback />,
);

export const TermsPage = Loadable(
  lazy(() =>
    import('./pages/legal/terms.page').then((m) => ({ default: m.TermsPage })),
  ),
  <ScreenFallback />,
);

export const AppShell = Loadable(
  lazy(() =>
    import('./layouts/app-shell').then((m) => ({ default: m.AppShell })),
  ),
  <ScreenFallback />,
);

export const LibraryPage = Loadable(
  lazy(() =>
    import('./pages/library/library.page').then((m) => ({
      default: m.LibraryPage,
    })),
  ),
);

export const CategoryPage = Loadable(
  lazy(() =>
    import('./pages/library/category.page').then((m) => ({
      default: m.CategoryPage,
    })),
  ),
);

export const SearchPage = Loadable(
  lazy(() =>
    import('./pages/search/search.page').then((m) => ({
      default: m.SearchPage,
    })),
  ),
);

export const SettingsPage = Loadable(
  lazy(() =>
    import('./pages/settings/settings.page').then((m) => ({
      default: m.SettingsPage,
    })),
  ),
);

export const ItemRedirect = Loadable(
  lazy(() =>
    import('./pages/library/item-redirect').then((m) => ({
      default: m.ItemRedirect,
    })),
  ),
);
