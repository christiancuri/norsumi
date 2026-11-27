import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { GithubIcon } from 'src/components/brand/github-icon';
import { Wordmark } from 'src/components/brand/logo';
import { config } from 'src/config';

const linkClass =
  'inline-flex w-fit items-center gap-1.5 text-muted-foreground transition-colors hover:text-foreground';

export function LandingFooter() {
  return (
    <footer className="border-border/70 border-t">
      <div className="mx-auto flex max-w-6xl flex-col gap-12 px-5 py-14 sm:px-6 md:flex-row md:items-start md:justify-between">
        <div className="flex flex-col gap-3">
          <Wordmark markClassName="size-7" />
          <p className="font-display text-[24px] text-muted-foreground italic leading-none">
            Every screenshot, remembered.
          </p>
        </div>

        <nav className="grid grid-cols-2 gap-x-14 gap-y-10 text-[13.5px] sm:grid-cols-4">
          <Group title="Product">
            <a href="/#features" className={linkClass}>
              Features
            </a>
            <a href="/#privacy" className={linkClass}>
              Security
            </a>
            <a href={config.androidUrl} className={linkClass}>
              Download
            </a>
          </Group>
          <Group title="Legal">
            <Link to="/privacy" className={linkClass}>
              Privacy Policy
            </Link>
            <Link to="/terms" className={linkClass}>
              Terms of Service
            </Link>
          </Group>
          <Group title="Account">
            <Link to="/login" className={linkClass}>
              Sign in
            </Link>
            <Link to="/register" className={linkClass}>
              Create account
            </Link>
          </Group>
          <Group title="Source">
            <a
              href={config.githubUrl}
              target="_blank"
              rel="noreferrer"
              className={linkClass}
            >
              <GithubIcon className="size-3.5" /> GitHub
            </a>
            <a href="/#open-source" className={linkClass}>
              Open source
            </a>
          </Group>
        </nav>
      </div>
      <div className="mx-auto flex max-w-6xl flex-col gap-2 border-border/50 border-t px-5 py-6 text-[12.5px] text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <span>
          © {new Date().getFullYear()} norsumi · Open source under AGPL-3.0
        </span>
        <span className="font-mono text-[11.5px]">v{config.version}</span>
      </div>
    </footer>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="font-medium text-[11px] text-foreground uppercase tracking-[0.12em]">
        {title}
      </div>
      {children}
    </div>
  );
}
