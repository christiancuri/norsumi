import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowRight, Lock } from 'lucide-react';
import { useForm, useWatch } from 'react-hook-form';
import { Link } from 'react-router';
import { toast } from 'sonner';
import { AuthLayout, LegalNote } from 'src/components/auth/auth-layout';
import {
  Field,
  inputClass,
  PasswordInput,
  StrengthMeter,
  SubmitButton,
} from 'src/components/auth/form-field';
import { GoogleSignIn } from 'src/components/auth/google-sign-in';
import { useCompleteAuth } from 'src/components/auth/use-complete-auth';
import { GithubIcon } from 'src/components/brand/github-icon';
import { Input } from 'src/components/ui/input';
import { config } from 'src/config';
import { errorMessage } from 'src/lib/axios';
import { useRegister, useServerInfo } from 'src/queries/auth.queries';
import { z } from 'zod';

const schema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'What should we call you?')
    .max(80, 'Keep it under 80 characters'),
  email: z.email('Enter a valid email address'),
  password: z
    .string()
    .min(8, 'Use at least 8 characters')
    .max(128, 'Keep it under 128 characters'),
});

type Values = z.infer<typeof schema>;

export function RegisterPage() {
  const { data: info } = useServerInfo();
  const closed = info?.registrationOpen === false;

  return (
    <AuthLayout
      title={
        closed ? (
          <>
            Sign-ups are <em>closed</em>
          </>
        ) : (
          <>
            Start your <em>library</em>
          </>
        )
      }
      subtitle={
        closed
          ? 'This norsumi server isn’t accepting new accounts right now.'
          : 'Free and open source. Takes about ten seconds.'
      }
      aside={
        <>
          <span className="hidden sm:inline">Already have an account? </span>
          <Link
            to="/login"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            Sign in
          </Link>
        </>
      }
    >
      {closed ? <ClosedNotice /> : <RegisterForm />}
    </AuthLayout>
  );
}

function RegisterForm() {
  const registerUser = useRegister();
  const complete = useCompleteAuth();
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    mode: 'onTouched',
    defaultValues: { name: '', email: '', password: '' },
  });
  const password = useWatch({ control, name: 'password' });

  const onSubmit = (values: Values) =>
    registerUser.mutate(values, {
      onSuccess: complete,
      onError: (e) =>
        toast.error(errorMessage(e, 'Could not create your account')),
    });

  return (
    <>
      <GoogleSignIn />
      <form
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        className="flex flex-col gap-5"
      >
        <Field id="name" label="Name" error={errors.name?.message}>
          <Input
            id="name"
            autoComplete="name"
            autoFocus
            placeholder="Ada Lovelace"
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? 'name-error' : undefined}
            className={inputClass}
            {...register('name')}
          />
        </Field>
        <Field id="email" label="Email" error={errors.email?.message}>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? 'email-error' : undefined}
            className={inputClass}
            {...register('email')}
          />
        </Field>
        <Field
          id="password"
          label="Password"
          error={errors.password?.message}
          hint={password ? undefined : 'At least 8 characters.'}
          trailing={<StrengthMeter password={password} />}
        >
          <PasswordInput
            id="password"
            autoComplete="new-password"
            placeholder="Create a password"
            aria-invalid={Boolean(errors.password)}
            aria-describedby={errors.password ? 'password-error' : undefined}
            {...register('password')}
          />
        </Field>
        <div className="mt-2">
          <SubmitButton loading={registerUser.isPending}>
            Create account
          </SubmitButton>
        </div>
      </form>
      <p className="mt-6 text-center text-[12px] text-muted-foreground leading-relaxed">
        Your captures are encrypted at rest with a key unique to your account.
      </p>
      <LegalNote />
    </>
  );
}

function ClosedNotice() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex gap-3.5 rounded-2xl border border-border/70 bg-surface p-4 shadow-[0_1px_2px_rgb(10_13_23/0.04)]">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
          <Lock className="size-4" />
        </span>
        <p className="text-[13.5px] text-muted-foreground leading-relaxed">
          Ask the person who runs this server for an account, or run your own
          norsumi in a few minutes. It's open source.
        </p>
      </div>
      <div className="flex flex-col gap-2.5">
        <Link
          to="/login"
          className="group inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary font-medium text-[14.5px] text-primary-foreground shadow-glow transition-transform duration-300 ease-out-expo hover:-translate-y-px"
        >
          Sign in instead
          <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-0.5" />
        </Link>
        <a
          href={config.githubUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-border bg-surface font-medium text-[14px] transition-colors hover:bg-surface-2/60"
        >
          <GithubIcon className="size-4" />
          View the source on GitHub
        </a>
      </div>
    </div>
  );
}
