import { LogOut, Monitor, Moon, Settings, Sun } from 'lucide-react';
import { useNavigate } from 'react-router';
import { Avatar, AvatarFallback, AvatarImage } from 'src/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from 'src/components/ui/dropdown-menu';
import { queryClient } from 'src/lib/query-client';
import { cn } from 'src/lib/utils';
import { AuthService } from 'src/services/auth.service';
import { useAuthStore } from 'src/stores/auth.store';
import { type Theme, useThemeStore } from 'src/stores/theme.store';

export function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join('') || '?'
  );
}

export function UserAvatar({ className }: { className?: string }) {
  const user = useAuthStore((s) => s.user);
  return (
    <Avatar className={cn('size-8', className)}>
      {user?.avatarUrl && <AvatarImage src={user.avatarUrl} alt="" />}
      <AvatarFallback className="bg-brand font-medium text-[11px] text-white">
        {initials(user?.name ?? '')}
      </AvatarFallback>
    </Avatar>
  );
}

export function ThemeSwitch({ className }: { className?: string }) {
  const { theme, setTheme } = useThemeStore();
  const options: { value: Theme; icon: typeof Sun; label: string }[] = [
    { value: 'light', icon: Sun, label: 'Light' },
    { value: 'dark', icon: Moon, label: 'Dark' },
    { value: 'system', icon: Monitor, label: 'System' },
  ];
  return (
    <fieldset
      aria-label="Theme"
      className={cn(
        'grid grid-cols-3 gap-0.5 rounded-[10px] bg-surface-2 p-0.5',
        className,
      )}
    >
      {options.map(({ value, icon: Icon, label }) => (
        <button
          key={value}
          type="button"
          aria-pressed={theme === value}
          title={label}
          onClick={() => setTheme(value)}
          className={cn(
            'flex h-7 items-center justify-center gap-1.5 rounded-lg text-[12px] text-muted-foreground transition',
            theme === value &&
              'bg-surface text-foreground shadow-[0_1px_2px_rgb(10_13_23/0.08)]',
          )}
        >
          <Icon className="size-3.5" />
          <span>{label}</span>
        </button>
      ))}
    </fieldset>
  );
}

export function useSignOut() {
  return () => {
    const { refreshToken, logout } = useAuthStore.getState();
    if (refreshToken) void AuthService.logout(refreshToken).catch(() => {});
    logout('/');
    queryClient.clear();
  };
}

export function UserMenu() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const signOut = useSignOut();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Account"
          className="rounded-full outline-none ring-offset-2 ring-offset-background transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring"
        >
          <UserAvatar />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="flex items-center gap-3 py-2 font-normal">
          <UserAvatar className="size-9" />
          <div className="min-w-0">
            <div className="truncate font-medium text-[13px]">{user?.name}</div>
            <div className="truncate text-[12px] text-muted-foreground">
              {user?.email}
            </div>
          </div>
        </DropdownMenuLabel>
        <div className="px-1 pt-1 pb-1.5">
          <ThemeSwitch />
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => navigate('/settings')}>
          <Settings /> Settings
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={signOut}>
          <LogOut /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
