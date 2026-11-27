import { motion } from 'motion/react';
import { type ReactNode, useEffect } from 'react';
import { Link } from 'react-router';
import { LandingFooter } from 'src/components/landing/landing-footer';
import { LandingNav } from 'src/components/landing/landing-nav';

export const LAST_UPDATED = 'November 27, 2026';
export const CONTACT_URL = 'https://github.com/christiancuri/norsumi/issues';

/** Shared shell for the Privacy Policy and Terms of Service. */
export function LegalPage({
  eyebrow,
  title,
  intro,
  children,
}: {
  eyebrow: string;
  title: ReactNode;
  intro: ReactNode;
  children: ReactNode;
}) {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-dvh bg-background">
      <LandingNav />
      <main className="relative px-5 pt-32 pb-24 sm:px-6 sm:pt-40">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 -z-0 h-96 bg-[radial-gradient(50%_60%_at_50%_0%,rgb(46_107_255/0.10),transparent_70%)]"
        />
        <motion.article
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="relative mx-auto max-w-[680px]"
        >
          <div className="font-medium text-[12px] text-primary uppercase tracking-[0.14em]">
            {eyebrow}
          </div>
          <h1 className="mt-4 font-display text-[52px] leading-[0.95] sm:text-[72px] [&_em]:text-primary">
            {title}
          </h1>
          <p className="mt-5 text-[13px] text-muted-foreground">
            Last updated: {LAST_UPDATED}
          </p>
          <p className="mt-8 text-[18px] text-foreground/85 leading-relaxed">
            {intro}
          </p>
          <div className="mt-12 grid gap-10">{children}</div>
          <p className="mt-16 border-border/70 border-t pt-6 text-[13px] text-muted-foreground">
            See also our{' '}
            <Link to="/privacy" className="text-primary hover:underline">
              Privacy Policy
            </Link>{' '}
            and{' '}
            <Link to="/terms" className="text-primary hover:underline">
              Terms of Service
            </Link>
            .
          </p>
        </motion.article>
      </main>
      <LandingFooter />
    </div>
  );
}

export function LegalSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section>
      <h2 className="font-display text-[30px] leading-tight">{title}</h2>
      <div className="mt-3 grid gap-3 text-[15.5px] text-foreground/80 leading-[1.75] [&_a]:text-primary [&_a]:underline-offset-4 hover:[&_a]:underline [&_li]:pl-1 [&_strong]:font-medium [&_strong]:text-foreground [&_ul]:grid [&_ul]:list-disc [&_ul]:gap-1.5 [&_ul]:pl-5">
        {children}
      </div>
    </section>
  );
}

export function ExternalLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  );
}
