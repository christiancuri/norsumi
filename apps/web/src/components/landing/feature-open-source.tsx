import {
  ArrowUpRight,
  Check,
  Copy,
  GitPullRequest,
  Scale,
  ShieldCheck,
} from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { useState } from 'react';
import { toast } from 'sonner';
import { GithubIcon } from 'src/components/brand/github-icon';
import { config } from 'src/config';
import { cn } from 'src/lib/utils';

import { EASE, FeatureCard, FeatureCopy, Reveal } from './primitives';

const COMMANDS = [
  `git clone ${config.githubUrl} && cd norsumi`,
  'pnpm install',
  'pnpm dev',
];

export function FeatureOpenSource() {
  return (
    <Reveal>
      <FeatureCard className="grid lg:grid-cols-[0.9fr_1.1fr]">
        <div className="flex flex-col gap-8 p-7 sm:p-10">
          <FeatureCopy
            icon={<GithubIcon />}
            label="Open source"
            title={
              <>
                Nothing hidden.
                <br />
                <em>Read every line.</em>
              </>
            }
          >
            Every line of norsumi is on GitHub under the AGPL: how your
            screenshots are encrypted, and which AI models read them (only
            zero-data-retention providers). Audit it, open an issue, send a pull
            request.
          </FeatureCopy>

          <div className="flex flex-wrap gap-2">
            {[
              { icon: <Scale />, label: 'AGPL-3.0' },
              { icon: <ShieldCheck />, label: 'Auditable' },
              { icon: <GitPullRequest />, label: 'Contributions welcome' },
            ].map((b) => (
              <span
                key={b.label}
                className="inline-flex h-8 items-center gap-1.5 rounded-full border border-border/70 bg-surface-2/60 px-3 text-[12.5px] text-muted-foreground [&_svg]:size-3.5"
              >
                {b.icon}
                {b.label}
              </span>
            ))}
          </div>

          <a
            href={config.githubUrl}
            target="_blank"
            rel="noreferrer"
            className="group inline-flex h-11 w-fit items-center gap-2 rounded-full bg-foreground px-5 font-medium text-[14px] text-background transition-[transform,opacity] duration-300 ease-out-expo hover:-translate-y-0.5 hover:opacity-90 active:scale-[0.98]"
          >
            <GithubIcon className="size-4" />
            Star on GitHub
            <ArrowUpRight className="size-4 opacity-60 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </a>
        </div>

        <div className="min-w-0 p-2 sm:p-3 lg:pl-0">
          <Terminal />
        </div>
      </FeatureCard>
    </Reveal>
  );
}

function Terminal() {
  const reduce = useReducedMotion();
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(COMMANDS.join('\n'));
      setCopied(true);
      toast.success('Copied to clipboard');
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error('Could not copy');
    }
  }

  const line = (i: number) =>
    reduce
      ? {}
      : {
          initial: { opacity: 0, x: -8 },
          whileInView: { opacity: 1, x: 0 },
          viewport: { once: true },
          transition: { duration: 0.5, ease: EASE, delay: 0.25 + i * 0.35 },
        };

  return (
    <div className="relative flex h-full min-h-[360px] flex-col overflow-hidden rounded-[22px] bg-[#0b0d14] text-[#e6e8f0] shadow-float ring-1 ring-white/5">
      <div className="absolute inset-0 bg-[radial-gradient(70%_60%_at_80%_0%,rgb(46_107_255/0.22),transparent)]" />
      <div className="relative flex h-11 items-center gap-3 border-white/[0.06] border-b px-4">
        <div className="flex gap-1.5">
          <span className="size-3 rounded-full bg-white/15" />
          <span className="size-3 rounded-full bg-white/15" />
          <span className="size-3 rounded-full bg-white/15" />
        </div>
        <span className="font-mono text-[11px] text-white/40">
          ~/norsumi — zsh
        </span>
        <button
          type="button"
          onClick={copy}
          aria-label="Copy commands"
          className="ml-auto inline-flex h-7 items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-2.5 font-medium text-[11px] text-white/70 transition-colors hover:bg-white/10 hover:text-white"
        >
          {copied ? (
            <Check className="size-3.5 text-[#3dd68c]" />
          ) : (
            <Copy className="size-3.5" />
          )}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>

      <div className="relative flex flex-1 flex-col gap-2.5 overflow-x-auto p-5 font-mono text-[12.5px] leading-relaxed sm:p-6 sm:text-[13px]">
        {COMMANDS.map((cmd, i) => (
          <motion.div key={cmd} {...line(i)} className="flex gap-3">
            <span className="select-none text-[#5B8FFF]">❯</span>
            <span className="min-w-0 break-all">{highlight(cmd)}</span>
          </motion.div>
        ))}
        <motion.div
          {...line(COMMANDS.length)}
          className="mt-3 space-y-1 text-[12px] text-white/45"
        >
          <div>
            <span className="text-[#3dd68c]">✔</span> @norsumi/api{' '}
            <span className="text-white/30">listening on :3000</span>
          </div>
          <div>
            <span className="text-[#3dd68c]">✔</span> @norsumi/web{' '}
            <span className="text-white/30">ready on :8080</span>
          </div>
        </motion.div>
        <motion.div
          {...line(COMMANDS.length + 1)}
          className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px]"
        >
          <span className="size-1.5 rounded-full bg-[#3dd68c] shadow-[0_0_8px_#3dd68c]" />
          <span className="text-white/70">Hack on it at</span>
          <span className="text-[#A8C6FF] underline decoration-white/20 underline-offset-4">
            http://localhost:8080
          </span>
        </motion.div>
        <span
          className={cn(
            'mt-1 inline-block h-4 w-2 bg-white/70',
            !reduce && 'animate-pulse',
          )}
        />
      </div>
    </div>
  );
}

function highlight(cmd: string) {
  const [head, ...rest] = cmd.split(' ');
  return (
    <>
      <span className="text-white">{head}</span>{' '}
      <span className="text-white/60">{rest.join(' ')}</span>
    </>
  );
}
