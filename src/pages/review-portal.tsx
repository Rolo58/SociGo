import * as React from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  Clock,
  Loader2,
  Lock,
  MessageSquareWarning,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Logo } from '@/components/logo';
import { StatusBadge, PlatformChip } from '@/components/status-badge';
import { EmptyState } from '@/components/empty-state';
import { useStore } from '@/lib/store';
import { getReviewPost, resolveReviewSession } from '@/lib/repository';
import { formatDate, formatDateTime, deadlineLabel } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { Decision, Post } from '@/lib/types';

/**
 * Client-facing portal. The review token in the URL is the only credential, and every
 * lookup re-derives the client from that token rather than trusting anything from the
 * browser. Phase 2 moves these checks into Supabase RLS plus an Edge Function.
 */
export function ReviewPortalPage() {
  const { token = '', postId } = useParams();
  const { db, decideAsClient, notify } = useStore();

  const session = React.useMemo(() => resolveReviewSession(db, token), [db, token]);

  if (!session.ok) {
    return (
    <ReviewShell>
      <AccessDenied message={session.error} />
    </ReviewShell>
  );
  }

  const { client, manager, posts } = session.data;
  const active = postId ? posts.find((p) => p.id === postId) : undefined;

  if (postId && !active) {
    return (
      <ReviewShell clientName={client.business_name}>
        <AccessDenied message="That post is not part of this review link. It may belong to a different client." />
      </ReviewShell>
    );
  }

  return (
    <ReviewShell clientName={client.business_name} clientContact={client.client_name} managerName={manager?.full_name}>
      {active ? (
        <ReviewPostView
          token={token}
          postId={active.id}
          onDecide={(postIdArg, input) => decideAsClient(token, postIdArg, input)}
          notify={notify}
        />
      ) : (
        <ReviewQueue token={token} posts={posts} clientName={client.business_name} />
      )}
    </ReviewShell>
  );
}

function ReviewShell({
  children,
  clientName,
  clientContact,
  managerName,
}: {
  children: React.ReactNode;
  clientName?: string;
  clientContact?: string;
  managerName?: string;
}) {
  return (
    <div className="min-h-dvh bg-slate-50">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between gap-3 px-4 sm:px-6">
          <Logo />
          <div className="min-w-0 text-right">
            {clientName ? (
              <>
                <p className="truncate text-[13px] font-semibold text-foreground">{clientName}</p>
                <p className="truncate text-[11.5px] text-muted-foreground">
                  {clientContact}
                  {managerName ? ` · via ${managerName}` : ''}
                </p>
              </>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-[11.5px] font-medium text-muted-foreground">
                <Lock className="size-3.5" /> Secure review link
              </span>
            )}
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 sm:py-10">{children}</main>
      <footer className="mx-auto max-w-3xl px-4 pb-10 sm:px-6">
        <p className="flex items-center justify-center gap-1.5 text-center text-[11.5px] text-muted-foreground">
          <ShieldCheck className="size-3.5" />
          You can only see content submitted to {clientName ?? 'your business'}.
        </p>
      </footer>
    </div>
  );
}

function AccessDenied({ message }: { message: string }) {
  return (
    <Card className="mx-auto max-w-md p-6 text-center sm:p-8">
      <span className="mx-auto flex size-12 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
        <ShieldAlert className="size-6" />
      </span>
      <h1 className="mt-4 text-lg font-semibold tracking-tight">This link cannot be used</h1>
      <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">{message}</p>
      <Separator className="my-5" />
      <p className="text-[12.5px] leading-relaxed text-muted-foreground">
        Review links are private and tied to one client. Ask your social media manager to send a fresh link if this one
        has expired or been replaced.
      </p>
    </Card>
  );
}

function ReviewQueue({
  token,
  posts,
  clientName,
}: {
  token: string;
  posts: Post[];
  clientName: string;
}) {
  const pending = posts.filter((p) => p.status === 'pending_approval');
  const decided = posts.filter((p) => p.status !== 'pending_approval');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Content for your review</h1>
        <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
          {pending.length > 0
            ? `${pending.length} ${pending.length === 1 ? 'post is' : 'posts are'} waiting for your decision.`
            : 'You are all caught up. Nothing is waiting for your review.'}
        </p>
      </div>

      {posts.length === 0 ? (
        <Card>
          <EmptyState
            icon={<CalendarDays />}
            title="No content yet"
            description={`${clientName} has not been sent any posts for review yet. You will see them here as soon as your manager submits them.`}
          />
        </Card>
      ) : (
        <>
          {pending.length > 0 && (
            <section className="space-y-3" aria-labelledby="pending-heading">
              <h2 id="pending-heading" className="text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">
                Waiting for you
              </h2>
              {pending.map((post) => (
                <PostSummaryCard key={post.id} token={token} post={post} />
              ))}
            </section>
          )}

          {decided.length > 0 && (
            <section className="space-y-3" aria-labelledby="decided-heading">
              <h2 id="decided-heading" className="text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">
                Your previous decisions
              </h2>
              {decided.map((post) => (
                <PostSummaryCard key={post.id} token={token} post={post} />
              ))}
            </section>
          )}
        </>
      )}
    </div>
  );
}

function PostSummaryCard({ token, post }: { token: string; post: Post }) {
  const deadline = deadlineLabel(post.review_deadline);
  return (
    <Card className="overflow-hidden">
      <Link to={`/review/${token}/post/${post.id}`} className="flex gap-3 p-3 transition-colors hover:bg-muted/40 sm:p-4">
        <div className="size-16 shrink-0 overflow-hidden rounded-lg bg-muted sm:size-20">
          {post.image_url ? <img src={post.image_url} alt="" className="size-full object-cover" loading="lazy" /> : null}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="truncate text-[13.5px] font-semibold">{post.title}</p>
            <StatusBadge status={post.status} className="shrink-0" />
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <PlatformChip platform={post.platform} />
            <span className="inline-flex items-center gap-1 text-[11.5px] text-muted-foreground">
              <CalendarDays className="size-3" />
              {formatDate(post.scheduled_date, 'd MMM yyyy')}
            </span>
            {post.status === 'pending_approval' && (
              <span
                className={cn(
                  'inline-flex items-center gap-1 text-[11.5px] font-medium',
                  deadline.tone === 'danger' && 'text-rose-600',
                  deadline.tone === 'warn' && 'text-amber-600',
                  deadline.tone === 'muted' && 'text-muted-foreground',
                )}
              >
                <Clock className="size-3" />
                {deadline.text}
              </span>
            )}
          </div>
          <p className="mt-1.5 line-clamp-2 text-[12px] leading-relaxed text-muted-foreground">{post.caption}</p>
        </div>
      </Link>
    </Card>
  );
}

function ReviewPostView({
  token,
  postId,
  onDecide,
  notify,
}: {
  token: string;
  postId: string;
  onDecide: (
    postId: string,
    input: { decision: Decision; comments: string; expectedRevision: number },
  ) => { ok: boolean; error?: string };
  notify: (toast: { tone: 'success' | 'error' | 'info'; title: string; description?: string }) => void;
}) {
  const { db } = useStore();
  const [feedbackOpen, setFeedbackOpen] = React.useState(false);
  const [comments, setComments] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  const resolved = getReviewPost(db, token, postId);
  if (!resolved.ok) {
    return <AccessDenied message={resolved.error} />;
  }

  const { post, session } = resolved.data;
  const history = db.feedback
    .filter((f) => f.post_id === post.id)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
  const deadline = deadlineLabel(post.review_deadline);
  const decided = post.status !== 'pending_approval';

  const approve = () => {
    setBusy(true);
    const result = onDecide(post.id, { decision: 'approved', comments: '', expectedRevision: post.revision });
    setBusy(false);
    if (!result.ok) {
      setError(result.error ?? 'Something went wrong.');
      notify({ tone: 'error', title: 'Could not record approval', description: result.error });
      return;
    }
    notify({ tone: 'success', title: 'Post approved', description: 'Your manager has been notified.' });
  };

  const submitChanges = () => {
    setError(null);
    if (comments.trim().length < 5) {
      setError('Please describe the changes you need (at least 5 characters).');
      return;
    }
    setBusy(true);
    const result = onDecide(post.id, {
      decision: 'changes_requested',
      comments,
      expectedRevision: post.revision,
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.error ?? 'Something went wrong.');
      return;
    }
    setFeedbackOpen(false);
    setComments('');
    notify({ tone: 'success', title: 'Feedback sent', description: 'Your manager can now revise this post.' });
  };

  return (
    <div className="space-y-5">
      <Link
        to={`/review/${token}`}
        className="inline-flex items-center gap-1 text-[12.5px] font-medium text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-3.5" /> All content
      </Link>

      <Card className="overflow-hidden">
        <div className="bg-muted">
          {post.image_url ? (
            <img src={post.image_url} alt={`Creative for ${post.title}`} className="max-h-[520px] w-full object-contain" />
          ) : (
            <div className="flex h-56 items-center justify-center text-[13px] text-muted-foreground">
              No image attached to this post
            </div>
          )}
        </div>
        <div className="p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <h1 className="text-lg font-semibold tracking-tight sm:text-xl">{post.title}</h1>
              <p className="mt-0.5 text-[12.5px] text-muted-foreground">
                {session.client.business_name} · Revision {post.revision}
              </p>
            </div>
            <StatusBadge status={post.status} />
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <PlatformChip platform={post.platform} />
            <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-[11.5px] font-medium text-muted-foreground">
              <CalendarDays className="size-3" />
              Scheduled {formatDate(post.scheduled_date, 'EEEE d MMMM yyyy')}
            </span>
            {post.review_deadline && (
              <span
                className={cn(
                  'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11.5px] font-medium',
                  deadline.tone === 'danger' && 'bg-rose-50 text-rose-700',
                  deadline.tone === 'warn' && 'bg-amber-50 text-amber-700',
                  deadline.tone === 'muted' && 'bg-muted text-muted-foreground',
                )}
              >
                <Clock className="size-3" />
                Review by {formatDateTime(post.review_deadline)}
              </span>
            )}
          </div>

          <Separator className="my-5" />

          <h2 className="text-[11.5px] font-semibold uppercase tracking-wide text-muted-foreground">Caption</h2>
          <p className="mt-2 whitespace-pre-wrap text-[13.5px] leading-relaxed text-foreground">{post.caption}</p>

          {post.notes && (
            <p className="mt-4 rounded-lg bg-muted/70 p-3 text-[12.5px] leading-relaxed text-muted-foreground">
              <span className="font-semibold text-foreground">Note from your manager: </span>
              {post.notes}
            </p>
          )}
        </div>
      </Card>

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-[13px] text-rose-900" role="alert">
          {error}
        </div>
      )}

      {decided ? (
        <Card className="p-5">
          <div className="flex items-start gap-3">
            <span
              className={cn(
                'flex size-9 shrink-0 items-center justify-center rounded-lg',
                post.status === 'approved' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600',
              )}
            >
              {post.status === 'approved' ? <CheckCircle2 className="size-[18px]" /> : <MessageSquareWarning className="size-[18px]" />}
            </span>
            <div>
              <p className="text-[13.5px] font-semibold">
                {post.status === 'approved'
                  ? 'You approved this post'
                  : post.status === 'changes_requested'
                    ? 'You requested changes'
                    : 'This post is not open for review'}
              </p>
              <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">
                {post.status === 'approved'
                  ? 'Your manager has been notified and will schedule it for publishing.'
                  : post.status === 'changes_requested'
                    ? 'Your manager will revise the content and send you a new version to review.'
                    : 'This post has been closed by your manager.'}
              </p>
            </div>
          </div>
        </Card>
      ) : (
        <Card className="p-5">
          <p className="text-[13.5px] font-semibold">Ready to decide?</p>
          <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">
            Approving confirms this content can be published as scheduled. Requesting changes sends your feedback to
            your manager.
          </p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <Button variant="success" className="flex-1" onClick={approve} disabled={busy}>
              {busy ? <Loader2 className="animate-spin" /> : <CheckCircle2 />} Approve post
            </Button>
            <Button variant="outline" className="flex-1" onClick={() => setFeedbackOpen(true)} disabled={busy}>
              <MessageSquareWarning /> Request changes
            </Button>
          </div>
          <p className="mt-3 flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
            <Lock className="size-3" />
            Decisions are recorded against your account for this review link.
          </p>
        </Card>
      )}

      {history.length > 0 && (
        <Card>
          <div className="border-b border-border p-5">
            <h2 className="text-[15px] font-semibold">Previous decisions</h2>
            <p className="mt-0.5 text-[12.5px] text-muted-foreground">A record of every version you have reviewed.</p>
          </div>
          <ol className="divide-y divide-border">
            {history.map((entry) => (
              <li key={entry.id} className="p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-medium',
                      entry.decision === 'approved' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700',
                    )}
                  >
                    {entry.decision === 'approved' ? 'Approved' : 'Changes requested'}
                  </span>
                  <span className="rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                    Revision {entry.post_revision}
                  </span>
                  <span className="text-[11.5px] text-muted-foreground">{formatDateTime(entry.created_at)}</span>
                </div>
                {entry.comments && (
                  <p className="mt-2 whitespace-pre-wrap text-[13px] leading-relaxed text-muted-foreground">
                    {entry.comments}
                  </p>
                )}
              </li>
            ))}
          </ol>
        </Card>
      )}

      <Dialog open={feedbackOpen} onOpenChange={setFeedbackOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request changes</DialogTitle>
            <DialogDescription>
              Tell {session.manager?.full_name ?? 'your manager'} what needs to change. A comment is required.
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="space-y-2">
            <Textarea
              autoFocus
              value={comments}
              onChange={(e) => {
                setComments(e.target.value.slice(0, 1000));
                setError(null);
              }}
              placeholder="e.g. Please lead with the farmers story and soften the last line."
              className="min-h-32"
              aria-label="Feedback comment"
            />
            <div className="flex items-center justify-between">
              <p className="help-text">{comments.length}/1000</p>
              <p className="help-text">Required</p>
            </div>
            {error && <p className="text-xs font-medium text-destructive">{error}</p>}
          </DialogBody>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setFeedbackOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={submitChanges} disabled={busy || comments.trim().length < 5}>
              {busy ? <Loader2 className="animate-spin" /> : null} Send feedback
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
