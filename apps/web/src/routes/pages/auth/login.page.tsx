import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router';
import { toast } from 'sonner';
import { AuthLayout, LegalNote } from 'src/components/auth/auth-layout';
import {
  Field,
  inputClass,
  PasswordInput,
  SubmitButton,
} from 'src/components/auth/form-field';
import { GoogleSignIn } from 'src/components/auth/google-sign-in';
import { useCompleteAuth } from 'src/components/auth/use-complete-auth';
import { Input } from 'src/components/ui/input';
import { errorMessage } from 'src/lib/axios';
import { useLogin } from 'src/queries/auth.queries';
import { z } from 'zod';

const schema = z.object({
  email: z.email('Enter a valid email address'),
  password: z.string().min(1, 'Enter your password'),
});

type Values = z.infer<typeof schema>;

export function LoginPage() {
  const login = useLogin();
  const complete = useCompleteAuth();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    mode: 'onTouched',
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = (values: Values) =>
    login.mutate(values, {
      onSuccess: complete,
      onError: (e) => toast.error(errorMessage(e, 'Could not sign in')),
    });

  return (
    <AuthLayout
      title={
        <>
          Welcome <em>back</em>
        </>
      }
      subtitle="Sign in to pick up where your library left off."
      aside={
        <>
          <span className="hidden sm:inline">New to norsumi? </span>
          <Link
            to="/register"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            Create an account
          </Link>
        </>
      }
    >
      <GoogleSignIn />
      <form
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        className="flex flex-col gap-5"
      >
        <Field id="email" label="Email" error={errors.email?.message}>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            autoFocus
            placeholder="you@example.com"
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? 'email-error' : undefined}
            className={inputClass}
            {...register('email')}
          />
        </Field>
        <Field id="password" label="Password" error={errors.password?.message}>
          <PasswordInput
            id="password"
            autoComplete="current-password"
            placeholder="Your password"
            aria-invalid={Boolean(errors.password)}
            aria-describedby={errors.password ? 'password-error' : undefined}
            {...register('password')}
          />
        </Field>
        <div className="mt-2">
          <SubmitButton loading={login.isPending}>Sign in</SubmitButton>
        </div>
      </form>
      <LegalNote />
      <p className="mt-8 text-center text-[13px] text-muted-foreground">
        Don't have an account?{' '}
        <Link
          to="/register"
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          Start your library
        </Link>
      </p>
    </AuthLayout>
  );
}
