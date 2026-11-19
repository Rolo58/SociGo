import * as React from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Database, Download, Globe, RotateCcw, ShieldCheck, User } from 'lucide-react';
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
  const { manager, db, resetSampleData, notify } = useStore();
  const [resetOpen, setResetOpen] = React.useState(false);

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
                <Input id="settings-name" defaultValue={manager.full_name} disabled />
              </FormField>
              <FormField label="Studio or agency" htmlFor="settings-business">
                <Input id="settings-business" defaultValue={manager.business_name} disabled />
              </FormField>
              <FormField label="Email address" htmlFor="settings-email" className="sm:col-span-2">
                <Input id="settings-email" defaultValue={manager.email} disabled />
              </FormField>
            </div>
            <p className="mt-3 text-[11.5px] text-muted-foreground">
              Profile editing becomes available once authentication is connected in Phase 2.
            </p>
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
                  This prototype stores data in your browser. Phase 2 moves it to PostgreSQL with Row Level Security.
                </p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={exportData}>
                <Download /> Export workspace data
              </Button>
              <Button variant="outline" size="sm" onClick={() => setResetOpen(true)}>
                <RotateCcw /> Reset to sample data
              </Button>
            </div>
            <Separator className="my-4" />
            <dl className="grid grid-cols-2 gap-3 text-[12.5px] sm:grid-cols-4">
              <Stat label="Clients" value={db.clients.length} />
              <Stat label="Posts" value={db.posts.length} />
              <Stat label="Feedback entries" value={db.feedback.length} />
              <Stat label="Activity entries" value={db.activity_logs.length} />
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
            <Button asChild variant="outline" size="sm" className="mt-4 w-full">
              <Link to="/login">Log out</Link>
            </Button>
          </Card>

          <Card className="p-5">
            <div className="flex items-start gap-2.5">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-emerald-600" />
              <div>
                <h2 className="text-[13.5px] font-semibold">Security status</h2>
                <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
                  Review links are tokenised and scoped to a single client. Cross-tenant access is blocked in the data
                  layer and will be enforced again by Row Level Security in Phase 2.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset to sample data?</DialogTitle>
            <DialogDescription>
              This replaces everything in this browser workspace with the original fictional sample data. It cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            <div className="flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 p-3 text-[12.5px] text-amber-900">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              Any clients, posts and feedback you created in this browser will be lost.
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setResetOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                resetSampleData();
                setResetOpen(false);
                notify({ tone: 'success', title: 'Sample data restored' });
              }}
            >
              Reset workspace
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
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
