import { createBrowserRouter, Outlet } from 'react-router';
import { AuthGuard } from 'src/guards/auth.guard';
import { GuestGuard } from 'src/guards/guest.guard';

import {
  AppShell,
  CategoryPage,
  ItemRedirect,
  LandingPage,
  LibraryPage,
  LoginPage,
  PrivacyPage,
  RegisterPage,
  SearchPage,
  SettingsPage,
  TermsPage,
} from './elements';
import { NotFoundPage, RouteErrorPage } from './pages/errors';

export const router = createBrowserRouter([
  {
    errorElement: <RouteErrorPage />,
    children: [
      {
        element: (
          <GuestGuard>
            <Outlet />
          </GuestGuard>
        ),
        children: [
          { path: '/', element: <LandingPage /> },
          { path: '/login', element: <LoginPage /> },
          { path: '/register', element: <RegisterPage /> },
        ],
      },
      {
        element: (
          <AuthGuard>
            <AppShell />
          </AuthGuard>
        ),
        children: [
          { path: '/library', element: <LibraryPage /> },
          { path: '/library/:kind', element: <LibraryPage /> },
          { path: '/favorites', element: <LibraryPage view="favorites" /> },
          { path: '/archive', element: <LibraryPage view="archive" /> },
          { path: '/c/:categoryId', element: <CategoryPage /> },
          { path: '/search', element: <SearchPage /> },
          { path: '/settings', element: <SettingsPage /> },
          { path: '/i/:itemId', element: <ItemRedirect /> },
        ],
      },
      // Public, signed in or not.
      { path: '/privacy', element: <PrivacyPage /> },
      { path: '/terms', element: <TermsPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
