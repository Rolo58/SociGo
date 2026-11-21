import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Database, Download, Globe, KeyRound, Loader2, LogOut, ShieldCheck, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { PageHeader } from '@/components/page-header';
import { FormField } from '@/components/form-field';
import { useStore } from '@/lib/store';
import { formatDate } from '@/lib/format';

export function SettingsPage() {
  const navigate = useNavigate();
  const { manager, db, updateProfile, logout, notify } = useStore();
  const [profileOpen, setProfileOpen] = React.useState(false);
  const [form, setForm] = React.useState({ full_name: '', business_name: '' });
  const [busy, setBusy] = React.useState(false);

  if (!manager) return null;

  const openProfile = () => {
    setForm({ full_name: manager.full_name, business_name: manager.business_name });
    setProfileOpen(true);
  };

  const saveProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    const result = await updateProfile(form);
    setBusy(false);
    if (!result.ok) {
      notify({ tone: 'error', title: 'Could not save your profile', description: result.error });
      return;
    }
    setProfileOpen(false);
    notify({ tone: 'success', title: 'Profile updated' });
  };

  const signOut = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const exportData = () => {
    const blob = new Blob([JSON.stringify(db, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `approvalflow-export-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    notify({ tone: 'success', title: 'Data exported', description: 'A JSON copy of this workspace was downloaded.' });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Manage your profile, workspace preferences and data."
      />

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Card className="p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/8 text-primary">
                <User className="size-[18px]" />
              </span>
              <div>
                <h2 className="text-[15px] font-semibold">Your profile</h2>
                <p className="mt-0.5 text-[12.5px] text-muted-foreground">
                  These details appear on client review pages.
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <FormField label="Full name" htmlFor="settings-name">
                <Input id="settings-name" value={manager.full_name} readOnly />
              </FormField>
              <FormField label="Studio or agency" htmlFor="settings-business">
                <Input id="settings-business" value={manager.business_name} readOnly />
              </FormField>
              <FormField label="Email address" htmlFor="settings-email" className="sm:col-span-2">
                <Input id="settings-email" value={manager.email} readOnly />
              </FormField>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" onClick={openProfile}>
                <User /> Edit profile
              </Button>
              <p className="text-[11.5px] text-muted-foreground">Your name and studio appear on client review pages.</p>
            </div>
          </Card>

          <Card className="p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/8 text-primary">
                <Globe className="size-[18px]" />
              </span>
              <div>
                <h2 className="text-[15px] font-semibold">Workspace</h2>
                <p className="mt-0.5 text-[12.5px] text-muted-foreground">Defaults applied to new posts.</p>
              </div>
            </div>
            <dl className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-border p-3">
                <dt className="text-[11.5px] font-medium text-muted-foreground">Time zone</dt>
                <dd className="mt-0.5 text-[13px] font-medium">{Intl.DateTimeFormat().resolvedOptions().timeZone}</dd>
              </div>
              <div className="rounded-lg border border-border p-3">
                <dt className="text-[11.5px] font-medium text-muted-foreground">Supported platforms</dt>
                <dd className="mt-0.5 text-[13px] font-medium">Instagram, Facebook, LinkedIn</dd>
              </div>
            </dl>
          </Card>

          <Card className="p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/8 text-primary">
                <Database className="size-[18px]" />
              </span>
              <div>
                <h2 className="text-[15px] font-semibold">Data</h2>
                <p className="mt-0.5 text-[12.5px] text-muted-foreground">
                  Every record lives in your Convex deployment and is scoped to your account on the server.
                </p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={exportData}>
                <Download /> Export workspace data
              </Button>
              <Button variant="outline" size="sm" asChild>
                <a href="https://docs.convex.dev/dashboard" target="_blank" rel="noreferrer">
                  <Database /> Open database dashboard
                </a>
              </Button>
            </div>
            <Separator className="my-4" />
            <dl className="grid grid-cols-2 gap-3 text-[12.5px] sm:grid-cols-4">
              <Stat label="Clients" value={db.clients.length} />
              <Stat label="Posts" value={db.posts.length} />
              <Stat label="Feedback entries" value={db.feedback.length} />
              <Stat label="Archived clients" value={db.clients.filter((c) => c.archived_at).length} />
            </dl>
          </Card>
        </div>

        <div className="space-y-5">
          <Card className="p-5">
            <h2 className="text-[15px] font-semibold">Account</h2>
            <dl className="mt-3 space-y-2.5 text-[12.5px]">
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Role</dt>
                <dd className="font-medium">Manager</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Member since</dt>
                <dd className="font-medium">{formatDate(manager.created_at, 'd MMM yyyy')}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Plan</dt>
                <dd>
                  <Badge variant="success">Free &amp; open source</Badge>
                </dd>
              </div>
            </dl>
            <div className="mt-4 grid gap-2">
              <Button variant="outline" size="sm" className="w-full" onClick={() => void signOut()}>
                <LogOut /> Log out
              </Button>
              <ChangePasswordDialog notify={notify} />
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-start gap-2.5">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-emerald-600" />
              <div>
                <h2 className="text-[13.5px] font-semibold">Security status</h2>
                <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
                  Passwords are hashed with PBKDF2 and sessions use opaque tokens stored as hashes. Every query and
                  mutation is scoped to your account on the server, so another manager cannot reach your records.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
        <DialogContent>
          <form onSubmit={saveProfile} noValidate>
            <DialogHeader>
              <DialogTitle>Edit profile</DialogTitle>
              <DialogDescription>These details appear on the review pages your clients open.</DialogDescription>
            </DialogHeader>
            <DialogBody className="grid gap-4 sm:grid-cols-2">
              <FormField label="Full name" htmlFor="profile-name" required>
                <Input
                  id="profile-name"
                  value={form.full_name}
                  onChange={(e) => setForm((prev) => ({ ...prev, full_name: e.target.value }))}
                />
              </FormField>
              <FormField label="Studio or agency" htmlFor="profile-business" required>
                <Input
                  id="profile-business"
                  value={form.business_name}
                  onChange={(e) => setForm((prev) => ({ ...prev, business_name: e.target.value }))}
                />
              </FormField>
            </DialogBody>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setProfileOpen(false)} disabled={busy}>
                Cancel
              </Button>
              <Button type="submit" disabled={busy}>
                {busy ? <Loader2 className="animate-spin" /> : null} Save changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <DeleteAccountDialog notify={notify} onDeleted={() => navigate('/login', { replace: true })} />
    </div>
  );
}

function ChangePasswordDialog({
  notify,
}: {
  notify: (toast: { tone: 'success' | 'error' | 'info'; title: string; description?: string }) => void;
}) {
  const { changePassword } = useStore();
  const [open, setOpen] = React.useState(false);
  const [form, setForm] = React.useState({ current_password: '', new_password: '', confirm: '' });
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (form.new_password.length < 8) {
      setError('Use at least 8 characters for your new password.');
      return;
    }
    if (form.new_password !== form.confirm) {
      setError('The new passwords do not match.');
      return;
    }
    setBusy(true);
    const result = await changePassword({
      current_password: form.current_password,
      new_password: form.new_password,
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setOpen(false);
    setForm({ current_password: '', new_password: '', confirm: '' });
    notify({ tone: 'success', title: 'Password changed', description: 'Other devices have been signed out.' });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button variant="outline" size="sm" className="w-full" onClick={() => setOpen(true)}>
        <KeyRound /> Change password
      </Button>
      <DialogContent>
        <form onSubmit={submit} noValidate>
          <DialogHeader>
            <DialogTitle>Change password</DialogTitle>
            <DialogDescription>Enter your current password to set a new one.</DialogDescription>
          </DialogHeader>
          <DialogBody className="space-y-4">
            <FormField label="Current password" htmlFor="current-password" required>
              <Input
                id="current-password"
                type="password"
                autoComplete="current-password"
                value={form.current_password}
                onChange={(e) => setForm((prev) => ({ ...prev, current_password: e.target.value }))}
              />
            </FormField>
            <FormField label="New password" htmlFor="new-password" required hint="At least 8 characters.">
              <Input
                id="new-password"
                type="password"
                autoComplete="new-password"
                value={form.new_password}
                onChange={(e) => setForm((prev) => ({ ...prev, new_password: e.target.value }))}
              />
            </FormField>
            <FormField label="Confirm new password" htmlFor="confirm-password" required>
              <Input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                value={form.confirm}
                onChange={(e) => setForm((prev) => ({ ...prev, confirm: e.target.value }))}
              />
            </FormField>
            {error && <p className="text-xs font-medium text-destructive">{error}</p>}
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? <Loader2 className="animate-spin" /> : null} Update password
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** PRD section 8: deleting an account must delete the data that belongs to it. */
function DeleteAccountDialog({
  notify,
  onDeleted,
}: {
  notify: (toast: { tone: 'success' | 'error' | 'info'; title: string; description?: string }) => void;
  onDeleted: () => void;
}) {
  const { manager, deleteAccount } = useStore();
  const [open, setOpen] = React.useState(false);
  const [confirm, setConfirm] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  if (!manager) return null;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setBusy(true);
    const result = await deleteAccount(confirm);
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setOpen(false);
    notify({ tone: 'info', title: 'Account deleted', description: 'Your clients, posts and feedback were removed.' });
    onDeleted();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button variant="ghost" size="sm" className="w-full text-destructive hover:bg-destructive/5 hover:text-destructive" onClick={() => setOpen(true)}>
        <AlertTriangle /> Delete account
      </Button>
      <DialogContent>
        <form onSubmit={submit} noValidate>
          <DialogHeader>
            <DialogTitle>Delete this account?</DialogTitle>
            <DialogDescription>
              Every client, post, feedback entry and activity record in this workspace is deleted permanently. This
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="space-y-3">
            <FormField label={`Type ${manager.email} to confirm`} htmlFor="confirm-email" required>
              <Input
                id="confirm-email"
                autoComplete="off"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder={manager.email}
              />
            </FormField>
            {error && <p className="text-xs font-medium text-destructive">{error}</p>}
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button type="submit" variant="destructive" disabled={busy || confirm.trim().length === 0}>
              {busy ? <Loader2 className="animate-spin" /> : null} Delete everything
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-muted/60 p-2.5">
      <dt className="text-[11px] text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-[15px] font-semibold">{value}</dd>
    </div>
  );
}
