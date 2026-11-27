import { Database, EyeOff, KeyRound, Lock, ShieldCheck } from 'lucide-react';
import { motion, useInView, useReducedMotion } from 'motion/react';
import { type ReactNode, useEffect, useRef, useState } from 'react';

import { FeatureCard, FeatureCopy, placeItem, Reveal } from './primitives';

const HEX = '0123456789abcdef';
const COLS = 30;
const ROWS = 6;

function randomHex(length: number) {
  let out = '';
  for (let i = 0; i < length; i++) out += HEX[Math.floor(Math.random() * 16)];
  return out;
}

const POINTS: { icon: ReactNode; title: string; body: string }[] = [
  {
    icon: <KeyRound />,
    title: 'Per-user keys',
    body: 'Every account gets its own AES-256-GCM data key, wrapped by a server master key.',
  },
  {
    icon: <Database />,
    title: 'Ciphertext-only storage',
    body: 'Your bucket holds encrypted blobs. Without the key, not a single pixel is readable.',
  },
  {
    icon: <EyeOff />,
    title: 'Zero Data Retention AI',
    body: 'Captures are read by a model under zero data retention: nothing kept, nothing trained on.',
  },
];

export function FeaturePrivacy() {
  return (
    <Reveal>
      <FeatureCard className="grid lg:grid-cols-2">
        <div className="flex flex-col gap-9 p-7 sm:p-10">
          <FeatureCopy
            icon={<ShieldCheck />}
            label="Private by design"
            title={
              <>
                Encrypted before it
                <br />
                <em>ever touches a disk.</em>
              </>
            }
          >
            Screenshots are personal: chats, addresses, bank apps. norsumi
            treats them that way, from the upload to the bucket to the model.
          </FeatureCopy>
          <ul className="grid gap-5">
            {POINTS.map((p) => (
              <li key={p.title} className="flex gap-3.5">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl border border-border/70 bg-surface-2 text-primary [&_svg]:size-4">
                  {p.icon}
                </span>
                <span>
                  <span className="block font-medium text-[14.5px]">
                    {p.title}
                  </span>
                  <span className="mt-0.5 block text-[13.5px] text-muted-foreground leading-relaxed">
                    {p.body}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div className="p-2 sm:p-3 lg:pl-0">
          <EncryptionDiagram />
        </div>
      </FeatureCard>
    </Reveal>
  );
}

function EncryptionDiagram() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref);
  const reduce = useReducedMotion();
  const [rows, setRows] = useState(() =>
    Array.from({ length: ROWS }, () => randomHex(COLS)),
  );

  useEffect(() => {
    if (!inView || reduce) return;
    const id = window.setInterval(() => {
      setRows((prev) =>
        prev.map((row) =>
          row
            .split('')
            .map((ch) => (Math.random() < 0.08 ? randomHex(1) : ch))
            .join(''),
        ),
      );
    }, 120);
    return () => window.clearInterval(id);
  }, [inView, reduce]);

  const thumb = placeItem?.image?.thumbUrl;

  return (
    <div
      ref={ref}
      aria-hidden
      className="relative flex h-full min-h-[480px] flex-col items-center justify-center gap-0 overflow-hidden rounded-[22px] bg-[#070a14] p-6 text-white"
    >
      <div className="absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_45%,rgb(46_107_255/0.35),transparent)]" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgb(255_255_255/0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgb(255_255_255/0.04)_1px,transparent_1px)] bg-[size:28px_28px] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_80%)]" />
      <div className="absolute inset-0">
        <div className="grain size-full" />
      </div>

      {/* plaintext */}
      <div className="relative flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.06] p-2 pr-4 backdrop-blur">
        {thumb && (
          <img
            src={thumb}
            alt=""
            className="h-12 w-9 rounded-md object-cover object-top"
          />
        )}
        <div>
          <div className="font-mono text-[11.5px]">screenshot_0412.png</div>
          <div className="font-mono text-[10.5px] text-white/50">
            plaintext · on your phone
          </div>
        </div>
      </div>

      <Flow reduce={Boolean(reduce)} />

      {/* the key */}
      <div className="relative">
        <motion.div
          className="absolute -inset-3 rounded-full bg-[#2E6BFF]/40 blur-xl"
          animate={reduce ? undefined : { opacity: [0.5, 1, 0.5] }}
          transition={{
            duration: 2.6,
            repeat: Number.POSITIVE_INFINITY,
            ease: 'easeInOut',
          }}
        />
        <div className="relative flex items-center gap-2.5 rounded-full border border-white/15 bg-[linear-gradient(135deg,#4F8CFF,#2E6BFF)] py-2 pr-4 pl-2 shadow-[0_10px_40px_-8px_rgb(46_107_255/0.8)]">
          <span className="grid size-7 place-items-center rounded-full bg-white/15">
            <Lock className="size-3.5" />
          </span>
          <span className="font-mono text-[12px]">AES-256-GCM</span>
          <span className="font-mono text-[10.5px] text-white/60">
            key ••7f3a
          </span>
        </div>
      </div>

      <Flow reduce={Boolean(reduce)} />

      {/* ciphertext */}
      <div className="relative w-full max-w-[340px] rounded-2xl border border-white/10 bg-black/40 p-4 backdrop-blur">
        <div className="mb-2.5 flex items-center gap-1.5 font-mono text-[10.5px] text-white/50">
          <Database className="size-3" />
          s3://norsumi/u/6741be…/0412.bin
        </div>
        <div className="font-mono text-[11px] text-[#A8C6FF]/80 leading-[1.55] tracking-[0.06em]">
          {rows.map((row, i) => (
            <div key={i} className="truncate">
              {row}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Flow({ reduce }: { reduce: boolean }) {
  return (
    <div className="relative h-12 w-px bg-gradient-to-b from-white/5 via-white/25 to-white/5">
      {!reduce && (
        <motion.span
          className="absolute -left-[2px] size-[5px] rounded-full bg-[#A8C6FF] shadow-[0_0_10px_2px_rgb(91_143_255/0.9)]"
          animate={{ top: ['-10%', '100%'], opacity: [0, 1, 0] }}
          transition={{
            duration: 1.4,
            repeat: Number.POSITIVE_INFINITY,
            ease: 'easeIn',
          }}
        />
      )}
    </div>
  );
}
