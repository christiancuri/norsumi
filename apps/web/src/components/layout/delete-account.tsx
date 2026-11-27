import { TriangleAlert } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from 'src/components/ui/alert-dialog';
import { Button } from 'src/components/ui/button';
import { Input } from 'src/components/ui/input';
import { Label } from 'src/components/ui/label';
import { errorMessage } from 'src/lib/axios';
import { queryClient } from 'src/lib/query-client';
import { useDeleteMe } from 'src/queries/auth.queries';
import { useAuthStore } from 'src/stores/auth.store';

export function DeleteAccount() {
  const user = useAuthStore((s) => s.user);
  const needsPassword = user?.providers.includes('password') ?? true;
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const remove = useDeleteMe();

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    remove.mutate(needsPassword ? { password } : {}, {
      onSuccess: () => {
        setOpen(false);
        useAuthStore.getState().logout('/');
        queryClient.clear();
        toast.success('Your account was deleted', {
          description: 'Everything you saved is gone for good. Take care.',
        });
      },
      onError: (err) => setError(errorMessage(err)),
    });
  };

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setPassword('');
          setError(null);
        }
      }}
    >
      <AlertDialogTrigger asChild>
        <Button
          variant="outline"
          className="rounded-full border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
        >
          Delete account
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <form onSubmit={submit} className="grid gap-5">
          <AlertDialogHeader>
            <div className="mb-1 grid size-10 place-items-center rounded-xl bg-destructive/10 text-destructive">
              <TriangleAlert className="size-5" />
            </div>
            <AlertDialogTitle className="font-display font-normal text-3xl">
              Delete your account?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Every screenshot, link, note and category is erased, along with
              the encrypted files. This can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {needsPassword && (
            <div className="grid gap-1.5">
              <Label htmlFor="delete-password">
                Confirm with your password
              </Label>
              <Input
                id="delete-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                aria-invalid={!!error}
                className="h-10 rounded-xl"
              />
            </div>
          )}
          {error && <p className="text-[13px] text-destructive">{error}</p>}
          <AlertDialogFooter>
            <AlertDialogCancel type="button">Cancel</AlertDialogCancel>
            <Button
              type="submit"
              variant="destructive"
              disabled={remove.isPending || (needsPassword && !password)}
            >
              {remove.isPending ? 'Deleting…' : 'Delete forever'}
            </Button>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
