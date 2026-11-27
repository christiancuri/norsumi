import { isRouteErrorResponse, Link, useRouteError } from 'react-router';
import { EmptyState } from 'src/components/common/empty-state';
import { Button } from 'src/components/ui/button';
import { useAuthStore } from 'src/stores/auth.store';

function HomeButton() {
  const authed = useAuthStore((s) => s.isAuthenticated);
  return (
    <Button asChild size="lg" className="rounded-full">
      <Link to={authed ? '/library' : '/'}>Take me home</Link>
    </Button>
  );
}

export function NotFoundPage() {
  return (
    <main className="grid min-h-dvh place-items-center bg-background">
      <EmptyState
        title={
          <>
            Even an elephant <em>forgets</em> sometimes.
          </>
        }
        description="We couldn't find that page. It may have moved, or never existed."
        action={<HomeButton />}
      />
    </main>
  );
}

export function RouteErrorPage() {
  const error = useRouteError();
  if (isRouteErrorResponse(error) && error.status === 404) {
    return <NotFoundPage />;
  }
  const message =
    error instanceof Error ? error.message : 'An unexpected error occurred.';
  return (
    <main className="grid min-h-dvh place-items-center bg-background">
      <EmptyState
        title={
          <>
            Something went <em>sideways</em>.
          </>
        }
        description={message}
        action={
          <>
            <Button
              variant="outline"
              size="lg"
              className="rounded-full"
              onClick={() => window.location.reload()}
            >
              Reload
            </Button>
            <HomeButton />
          </>
        }
      />
    </main>
  );
}
