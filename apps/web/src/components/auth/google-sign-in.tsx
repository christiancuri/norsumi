import { Loader2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { errorMessage } from 'src/lib/axios';
import { cn } from 'src/lib/utils';
import { useGoogleLogin, useServerInfo } from 'src/queries/auth.queries';

import { OrDivider } from './form-field';
import { useCompleteAuth } from './use-complete-auth';

/* ------------------------------------------------------------------ */
/* Minimal Google Identity Services surface                            */
/* ------------------------------------------------------------------ */

interface GoogleCredentialResponse {
  credential?: string;
}

interface GoogleIdApi {
  initialize(options: {
    client_id: string;
    callback: (response: GoogleCredentialResponse) => void;
    ux_mode?: 'popup' | 'redirect';
    auto_select?: boolean;
    cancel_on_tap_outside?: boolean;
    itp_support?: boolean;
  }): void;
  renderButton(
    parent: HTMLElement,
    options: {
      type?: 'standard' | 'icon';
      theme?: 'outline' | 'filled_blue' | 'filled_black';
      size?: 'large' | 'medium' | 'small';
      text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
      shape?: 'rectangular' | 'pill' | 'circle' | 'square';
      logo_alignment?: 'left' | 'center';
      width?: number;
    },
  ): void;
  prompt(): void;
}

declare global {
  interface Window {
    google?: { accounts: { id: GoogleIdApi } };
  }
}

const GSI_SRC = 'https://accounts.google.com/gsi/client';
let gsiPromise: Promise<GoogleIdApi> | null = null;

function loadGsi(): Promise<GoogleIdApi> {
  const existing = window.google?.accounts?.id;
  if (existing) return Promise.resolve(existing);
  gsiPromise ??= new Promise<GoogleIdApi>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = GSI_SRC;
    script.async = true;
    script.onload = () => {
      const api = window.google?.accounts?.id;
      if (api) resolve(api);
      else reject(new Error('Google sign-in is unavailable'));
    };
    script.onerror = () => {
      gsiPromise = null;
      script.remove();
      reject(new Error('Could not load Google sign-in'));
    };
    document.head.appendChild(script);
  });
  return gsiPromise;
}

// GSI is configured once per page; whichever button is mounted receives the
// credential through this handler.
let credentialHandler: ((credential: string) => void) | null = null;
let initializedFor: string | null = null;

function ensureInitialized(api: GoogleIdApi, clientId: string) {
  if (initializedFor === clientId) return;
  api.initialize({
    client_id: clientId,
    callback: ({ credential }) => {
      if (credential) credentialHandler?.(credential);
    },
    ux_mode: 'popup',
    auto_select: false,
    cancel_on_tap_outside: true,
    itp_support: true,
  });
  initializedFor = clientId;
}

/* ------------------------------------------------------------------ */

/** "Continue with Google" + "or" divider; renders nothing when the server has no Google client. */
export function GoogleSignIn() {
  const { data: info } = useServerInfo();
  const googleLogin = useGoogleLogin();
  const complete = useCompleteAuth();
  const google = info?.auth.google;
  if (!google) return null;

  return (
    <>
      <GoogleButton
        clientId={google.webClientId}
        loading={googleLogin.isPending}
        onCredential={(idToken) =>
          googleLogin.mutate(idToken, {
            onSuccess: complete,
            onError: (e) =>
              toast.error(errorMessage(e, 'Could not sign in with Google')),
          })
        }
      />
      <OrDivider />
    </>
  );
}

/**
 * Our own button, with Google's official (invisible) button laid on top so
 * the click opens the real GSI popup. If the script fails to load, a click
 * falls back to One Tap or a toast.
 */
export function GoogleButton({
  clientId,
  loading,
  onCredential,
}: {
  clientId: string;
  loading?: boolean;
  onCredential: (idToken: string) => void;
}) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const handlerRef = useRef(onCredential);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    handlerRef.current = onCredential;
  }, [onCredential]);

  useEffect(() => {
    credentialHandler = (credential) => handlerRef.current(credential);
    return () => {
      credentialHandler = null;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    loadGsi()
      .then((api) => {
        const el = overlayRef.current;
        if (cancelled || !el) return;
        ensureInitialized(api, clientId);
        el.replaceChildren();
        api.renderButton(el, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text: 'continue_with',
          shape: 'rectangular',
          logo_alignment: 'center',
          width: Math.min(400, Math.max(200, Math.round(el.clientWidth))),
        });
        setReady(true);
      })
      .catch(() => {
        if (!cancelled) setReady(false);
      });
    return () => {
      cancelled = true;
    };
  }, [clientId]);

  async function fallback() {
    try {
      const api = await loadGsi();
      ensureInitialized(api, clientId);
      api.prompt();
    } catch (e) {
      toast.error(errorMessage(e, 'Google sign-in is unavailable right now'));
    }
  }

  return (
    <div className="group relative h-11 w-full rounded-xl focus-within:ring-4 focus-within:ring-ring/40">
      <button
        type="button"
        onClick={fallback}
        tabIndex={ready ? -1 : 0}
        disabled={loading}
        className={cn(
          'flex size-full items-center justify-center gap-2.5 rounded-xl border border-border bg-surface font-medium text-[14px]',
          'shadow-[0_1px_2px_rgb(10_13_23/0.05)] transition-[background-color,border-color,transform] duration-200',
          'group-hover:border-foreground/15 group-hover:bg-surface-2/60 group-active:scale-[0.99] dark:bg-surface-2/60 dark:group-hover:bg-surface-2',
        )}
      >
        {loading ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <GoogleG className="size-[18px]" />
        )}
        Continue with Google
      </button>
      <div
        ref={overlayRef}
        className={cn(
          'absolute inset-0 flex items-center justify-center overflow-hidden rounded-xl opacity-[0.01]',
          (!ready || loading) && 'pointer-events-none',
        )}
      />
    </div>
  );
}

function GoogleG({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden>
      <path
        fill="#FFC107"
        d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
      />
      <path
        fill="#FF3D00"
        d="m6.306 14.691 6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"
      />
    </svg>
  );
}
