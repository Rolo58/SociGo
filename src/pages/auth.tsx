import * as React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, Check, Loader2, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Logo } from '@/components/logo';
import { FormField } from '@/components/form-field';
import { useStore } from '@/lib/store';

/**
 * Manager authentication. Credentials are verified by the Convex backend (PBKDF2 hashes,
 * opaque session tokens) — the browser never sees a password hash or a user id it can edit.
 */

function AuthLayout({ children, aside }: { children: React.ReactNode; aside: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <div className="flex flex-col px-5 py-8 sm:px-10 lg:px-14">
        <Logo />
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">{children}</div>
        <p className="text-center text-[11.5px] text-muted-foreground lg:text-left">
          ApprovalFlow is free and open source. No subscriptions, no locked features.
        </p>
      </div>
      <div className="hidden border-l border-border bg-gradient-to-br from-primary/8 via-indigo-50/60 to-sky-50/50 lg:flex lg:flex-col lg:justify-center lg:px-14">
        {aside}
      </div>
    </div>
  );
}

function DemoHint({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-5 rounded-lg border border-primary/20 bg-primary/5 px-3.5 py-3">
      <p className="flex items-center gap-1.5 text-[12px] font-semibold text-primary">
        <ShieldCheck className="size-3.5" /> Self-hosted demo
      </p>
      <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">{children}</p>
    </div>
  );
}

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, notify } = useStore();
  const [email, setEmail] = React.useState('priya@northlight.studio');
  const [password, setPassword] = React.useState('approvalflow-demo');
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [busy, setBusy] = React.useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const next: Record<string, string> = {};
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) next.email = 'Enter a valid email address.';
    if (password.length < 8) next.password = 'Passwords are at least 8 characters.';
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setBusy(true);
    const result = await login({ email, password });
    setBusy(false);

    if (!result.ok) {
      notify({ tone: 'error', title: 'Could not sign you in', description: result.error });
      return;
    }

    const from = (location.state as { from?: string } | null)?.from;
    notify({ tone: 'success', title: 'Welcome back', description: 'Your workspace is ready.' });
    navigate(from && from.startsWith('/app') ? from : '/app', { replace: true });
  };

  return (
    <AuthLayout
      aside={
        <div className="max-w-md">
          <p className="text-[11.5px] font-semibold uppercase tracking-wider text-primary">Create. Share. Approve. Publish.</p>
          <h2 className="mt-3 text-3xl font-semibold leading-tight tracking-tight text-foreground">
            Stop chasing approvals across five different conversations.
          </h2>
          <p className="mt-3 text-[13.5px] leading-relaxed text-muted-foreground">
            One organised workspace for every client, every post and every decision — with a review link your clients
            actually understand.
          </p>
          <ul className="mt-6 space-y-2.5">
            {[
              'Send one private review link per client',
              'Approve or request changes in two clicks',
              'Keep feedback history revision by revision',
              'See your whole schedule on one calendar',
            ].map((item) => (
              <li key={item} className="flex items-start gap-2 text-[13px] text-foreground">
                <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                  <Check className="size-2.5" />
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      }
    >
      <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
      <p className="mt-1 text-[13px] text-muted-foreground">Log in to your manager workspace.</p>

      <div className="mt-6">
        <DemoHint>
          Demo workspace: <span className="font-medium text-foreground">priya@northlight.studio</span> /{' '}
          <span className="font-medium text-foreground">approvalflow-demo</span>
        </DemoHint>
        <form onSubmit={submit} noValidate className="space-y-4">
          <FormField label="Email address" htmlFor="login-email" required error={errors.email}>
            <Input
              id="login-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </FormField>
          <FormField label="Password" htmlFor="login-password" required error={errors.password}>
            <Input
              id="login-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </FormField>
          <div className="flex items-center justify-between">
            <Link to="/forgot-password" className="text-[12.5px] font-medium text-primary hover:underline">
              Forgot password?
            </Link>
          </div>
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? <Loader2 className="animate-spin" /> : null} Continue to workspace
          </Button>
        </form>
        <p className="mt-5 text-center text-[12.5px] text-muted-foreground">
          No account yet?{' '}
          <Link to="/register" className="font-medium text-primary hover:underline">
            Create one
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}

export function RegisterPage() {
  const navigate = useNavigate();
  const { register, notify } = useStore();
  const [form, setForm] = React.useState({ full_name: '', business_name: '', email: '', password: '' });
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [busy, setBusy] = React.useState(false);

  const update = (key: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const next: Record<string, string> = {};
    if (form.full_name.trim().length < 2) next.full_name = 'Enter your full name.';
    if (form.business_name.trim().length < 2) next.business_name = 'Enter your studio or agency name.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email.trim())) next.email = 'Enter a valid email address.';
    if (form.password.length < 8) next.password = 'Use at least 8 characters.';
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setBusy(true);
    const result = await register(form);
    setBusy(false);

    if (!result.ok) {
      notify({ tone: 'error', title: 'Could not create your account', description: result.error });
      return;
    }

    notify({ tone: 'success', title: 'Account created', description: 'Add your first client to get started.' });
    navigate('/app', { replace: true });
  };

  return (
    <AuthLayout
      aside={
        <div className="max-w-md">
          <h2 className="text-3xl font-semibold leading-tight tracking-tight">Set up your workspace in a minute.</h2>
          <p className="mt-3 text-[13.5px] leading-relaxed text-muted-foreground">
            ApprovalFlow is built for freelancers and small agencies. Create clients, submit content and collect
            decisions without another spreadsheet.
          </p>
          <div className="mt-6 grid gap-3">
            {[
              { title: 'Free and open source', body: 'MIT licensed. Self-host it or use a hosted free tier.' },
              { title: 'No client logins needed', body: 'Clients review from a private link — no password to forget.' },
              { title: 'Nothing locked behind a paywall', body: 'Every core approval feature is included.' },
            ].map((item) => (
              <div key={item.title} className="rounded-lg border border-border bg-card/70 p-3.5">
                <p className="text-[13px] font-semibold text-foreground">{item.title}</p>
                <p className="mt-0.5 text-[12.5px] leading-relaxed text-muted-foreground">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      }
    >
      <h1 className="text-2xl font-semibold tracking-tight">Create your account</h1>
      <p className="mt-1 text-[13px] text-muted-foreground">Start managing client approvals today.</p>

      <div className="mt-6">
        <DemoHint>
          Accounts are stored in your own Convex deployment. Passwords are hashed server-side and never stored in the
          browser.
        </DemoHint>
        <form onSubmit={submit} noValidate className="space-y-4">
          <FormField label="Full name" htmlFor="register-name" required error={errors.full_name}>
            <Input
              id="register-name"
              autoComplete="name"
              value={form.full_name}
              onChange={(e) => update('full_name', e.target.value)}
              placeholder="Priya Raman"
            />
          </FormField>
          <FormField label="Studio or agency name" htmlFor="register-business" required error={errors.business_name}>
            <Input
              id="register-business"
              value={form.business_name}
              onChange={(e) => update('business_name', e.target.value)}
              placeholder="Northlight Studio"
            />
          </FormField>
          <FormField label="Email address" htmlFor="register-email" required error={errors.email}>
            <Input
              id="register-email"
              type="email"
              autoComplete="email"
              value={form.email}
              onChange={(e) => update('email', e.target.value)}
              placeholder="you@studio.com"
            />
          </FormField>
          <FormField label="Password" htmlFor="register-password" required error={errors.password} hint="At least 8 characters.">
            <Input
              id="register-password"
              type="password"
              autoComplete="new-password"
              value={form.password}
              onChange={(e) => update('password', e.target.value)}
            />
          </FormField>
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? <Loader2 className="animate-spin" /> : null} Create account <ArrowRight />
          </Button>
        </form>
        <p className="mt-5 text-center text-[12.5px] text-muted-foreground">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-primary hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}

export function ForgotPasswordPage() {
  const { notify } = useStore();
  const [email, setEmail] = React.useState('');
  const [sent, setSent] = React.useState(false);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) {
      notify({ tone: 'error', title: 'Enter a valid email address' });
      return;
    }
    setSent(true);
  };

  return (
    <AuthLayout
      aside={
        <div className="max-w-md">
          <h2 className="text-3xl font-semibold leading-tight tracking-tight">Back into your workspace.</h2>
          <p className="mt-3 text-[13.5px] leading-relaxed text-muted-foreground">
            Password recovery needs an email provider, which is not part of this release. A manager can change their
            password from Settings once signed in.
          </p>
        </div>
      }
    >
      <h1 className="text-2xl font-semibold tracking-tight">Reset your password</h1>
      <p className="mt-1 text-[13px] text-muted-foreground">We will email you a secure reset link.</p>
      <div className="mt-6">
        {sent ? (
          <Card className="p-5 text-center">
            <p className="text-[13.5px] font-semibold">Check your inbox</p>
            <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">
              Email delivery is not configured in this release, so no message was sent to {email}. Ask your deployment
              owner to reset the password server-side, or sign in and change it from Settings.
            </p>
            <Button asChild variant="outline" size="sm" className="mt-4">
              <Link to="/login">Back to log in</Link>
            </Button>
          </Card>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <FormField label="Email address" htmlFor="forgot-email" required>
              <Input
                id="forgot-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@studio.com"
              />
            </FormField>
            <Button type="submit" className="w-full">
              Send reset link
            </Button>
            <p className="text-center text-[12.5px] text-muted-foreground">
              <Link to="/login" className="font-medium text-primary hover:underline">
                Back to log in
              </Link>
            </p>
          </form>
        )}
      </div>
    </AuthLayout>
  );
}
