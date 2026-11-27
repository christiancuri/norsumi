import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowUpRight, LogOut } from 'lucide-react';
import type { ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { AndroidIcon, GithubIcon } from 'src/components/brand/github-icon';
import { LogoMark } from 'src/components/brand/logo';
import { DeleteAccount } from 'src/components/layout/delete-account';
import {
  ThemeSwitch,
  UserAvatar,
  useSignOut,
} from 'src/components/layout/user-menu';
import { PageHeader } from 'src/components/library/page-header';
import { Button } from 'src/components/ui/button';
import { Input } from 'src/components/ui/input';
import { Label } from 'src/components/ui/label';
import { config } from 'src/config';
import { errorMessage } from 'src/lib/axios';
import { useServerInfo, useUpdateMe } from 'src/queries/auth.queries';
import { useAuthStore } from 'src/stores/auth.store';
import { z } from 'zod';

const schema = z.object({
  name: z.string().trim().min(1, 'Your name can’t be empty').max(80),
});

function Card({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="grid gap-5 rounded-3xl border border-border/70 bg-surface p-5 shadow-[0_1px_2px_rgb(10_13_23/0.04)] sm:grid-cols-[220px_1fr] sm:p-7">
      <div>
        <h2 className="font-medium text-[15px]">{title}</h2>
        {description && (
          <p className="mt-1 text-[13px] text-muted-foreground leading-relaxed">
            {description}
          </p>
        )}
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  );
}

export function SettingsPage() {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const update = useUpdateMe();
  const signOut = useSignOut();
  const { data: info } = useServerInfo();

  const form = useForm({
    resolver: zodResolver(schema),
    values: { name: user?.name ?? '' },
  });

  const submit = form.handleSubmit(({ name }) =>
    update.mutate(
      { name },
      {
        onSuccess: (u) => {
          setUser(u);
          form.reset({ name: u.name });
          toast.success('Profile updated');
        },
        onError: (err) => toast.error(errorMessage(err)),
      },
    ),
  );

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="Settings" />
      <div className="grid gap-4">
        <Card title="Profile" description="How you appear in norsumi.">
          <form onSubmit={submit} className="grid gap-4">
            <div className="flex items-center gap-4">
              <UserAvatar className="size-14 text-base" />
              <div className="min-w-0">
                <div className="truncate font-medium">{user?.name}</div>
                <div className="truncate text-[13px] text-muted-foreground">
                  {user?.email}
                </div>
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="name">Name</Label>
              <div className="flex gap-2">
                <Input
                  id="name"
                  {...form.register('name')}
                  className="h-10 rounded-xl"
                />
                <Button
                  type="submit"
                  className="h-10 rounded-xl"
                  disabled={!form.formState.isDirty || update.isPending}
                >
                  Save
                </Button>
              </div>
              {form.formState.errors.name && (
                <p className="text-[12px] text-destructive">
                  {form.formState.errors.name.message}
                </p>
              )}
            </div>
          </form>
        </Card>

        <Card
          title="Appearance"
          description="Light, dark, or follow your system."
        >
          <ThemeSwitch className="max-w-sm" />
        </Card>

        <Card
          title="Android app"
          description="Capture without thinking about it."
        >
          <a
            href={config.androidUrl}
            className="group relative flex items-center gap-4 overflow-hidden rounded-2xl bg-brand p-5 text-white shadow-glow"
          >
            <span className="absolute -top-16 -right-10 size-48 rounded-full bg-white/10 blur-2xl" />
            <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-white/15 backdrop-blur">
              <AndroidIcon className="size-6" />
            </span>
            <span className="min-w-0">
              <span className="block font-display text-[26px] leading-tight">
                Get norsumi for Android
              </span>
              <span className="block text-[13px] text-white/75">
                New screenshots are saved and sorted automatically. Share any
                link straight in.
              </span>
            </span>
            <ArrowUpRight className="ml-auto size-5 shrink-0 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </a>
        </Card>

        <Card title="About">
          <div className="flex flex-wrap items-center gap-4">
            <LogoMark className="size-12" />
            <div className="min-w-0 flex-1">
              <div className="font-medium">norsumi</div>
              <div className="font-mono text-[12px] text-muted-foreground">
                web {config.version}
                {info ? ` · server ${info.version}` : ''}
              </div>
            </div>
            <Button asChild variant="outline" className="rounded-full">
              <a
                href={config.githubUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                <GithubIcon className="size-4" /> Open source on GitHub
              </a>
            </Button>
          </div>
          <p className="mt-4 text-[13px] text-muted-foreground leading-relaxed">
            Your files are encrypted with a key unique to you before they reach
            storage. AI runs with zero data retention. norsumi is AGPL-licensed
            and you can host it yourself.
          </p>
        </Card>

        <section className="grid gap-5 rounded-3xl border border-destructive/25 bg-destructive/[0.03] p-5 sm:grid-cols-[220px_1fr] sm:p-7">
          <div>
            <h2 className="font-medium text-[15px] text-destructive">
              Danger zone
            </h2>
            <p className="mt-1 text-[13px] text-muted-foreground leading-relaxed">
              Permanently delete your account and everything in it.
            </p>
          </div>
          <div className="flex items-center">
            <DeleteAccount />
          </div>
        </section>

        <div className="flex justify-end pt-2">
          <Button
            variant="ghost"
            className="rounded-full text-muted-foreground"
            onClick={signOut}
          >
            <LogOut /> Sign out
          </Button>
        </div>
      </div>
    </div>
  );
}
