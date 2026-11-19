import * as React from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  Archive,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock,
  CopyIcon,
  ExternalLink,
  FileText,
  Link2,
  MessageSquareWarning,
  Pencil,
  RotateCcw,
  Send,
  StickyNote,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { PageHeader } from '@/components/page-header';
import { EmptyState } from '@/components/empty-state';
import { StatusBadge, PlatformChip } from '@/components/status-badge';
import { PostFormDialog } from '@/components/posts/post-form-dialog';
import { useStore } from '@/lib/store';
import { getClient, getPost, listFeedback } from '@/lib/repository';
import { formatDate, formatDateTime, formatRelative, deadlineLabel } from '@/lib/format';
import { cn } from '@/lib/utils';

export function PostDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { db, session, submitPost, duplicatePost, archivePost, restorePost, notify } = useStore();
  const [editOpen, setEditOpen] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  const resolved = React.useMemo(() => getPost(db, session.managerId, id), [db, session.managerId, id]);

  if (!resolved.ok) {
    return (
      <Card>
        <EmptyState
          icon={<FileText />}
          title="Post not found"
          description="This post does not exist, or it belongs to another manager account."
          action={
            <Button asChild size="sm">
              <Link to="/app/posts">Back to posts</Link>
            </Button>
          }
        />
      </Card>
    );
  }

  const post = resolved.data;
  const clientResult = getClient(db, session.managerId, post.client_id);
  const client = clientResult.ok ? clientResult.data : undefined;
  const feedback = listFeedback(db, post.id);
  const deadline = deadlineLabel(post.review_deadline);
  const canSubmit = post.status === 'draft' || post.status === 'changes_requested';
  const reviewUrl = client
    ? `${window.location.origin}${window.location.pathname}#/review/${client.review_token}/post/${post.id}`
    : '';

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(reviewUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      notify({ tone: 'error', title: 'Could not copy the link' });
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={post.title}
        description={`${client?.business_name ?? 'Unassigned client'} · Revision ${post.revision}`}
        breadcrumb={
          <Link
            to="/app/posts"
            className="mb-1 inline-flex items-center gap-1 text-[12.5px] text-muted-foreground hover:text-foreground"
          >
            ← Posts
          </Link>
        }
        actions={
          <>
            <StatusBadge status={post.status} />
            {post.status !== 'archived' && (
              <Button variant="outline" onClick={() => setEditOpen(true)}>
                <Pencil /> Edit
              </Button>
            )}
            {canSubmit && (
              <Button
                onClick={() => {
                  const result = submitPost(post.id);
                  notify(
                    result.ok
                      ? {
                          tone: 'success',
                          title: 'Submitted for approval',
                          description: 'The client can now review this post.',
                        }
                      : { tone: 'error', title: 'Could not submit post', description: result.error },
                  );
                }}
              >
                <Send /> Submit for approval
              </Button>
            )}
          </>
        }
      />

      {post.status === 'changes_requested' && feedback.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-[13px] text-rose-900">
          <MessageSquareWarning className="size-4 shrink-0" />
          <span className="flex-1">
            {client?.client_name ?? 'The client'} requested changes on revision {feedback[0].post_revision}. Edit the
            post and resubmit to send a new revision.
          </span>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Card className="overflow-hidden">
            <div className="bg-muted">
              {post.image_url ? (
                <img src={post.image_url} alt={`Creative for ${post.title}`} className="max-h-[460px] w-full object-contain" />
              ) : (
                <div className="flex h-56 flex-col items-center justify-center gap-2 text-muted-foreground/60">
                  <FileText className="size-6" />
                  <span className="text-[13px]">No creative attached</span>
                </div>
              )}
            </div>
            <div className="p-5 sm:p-6">
              <div className="flex flex-wrap items-center gap-2">
                <PlatformChip platform={post.platform} />
                <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-[11.5px] font-medium text-muted-foreground">
                  <CalendarDays className="size-3" />
                  {formatDate(post.scheduled_date, 'EEEE d MMMM yyyy')}
                </span>
                {post.status === 'pending_approval' && (
                  <span
                    className={cn(
                      'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11.5px] font-medium',
                      deadline.tone === 'danger' && 'bg-rose-50 text-rose-700',
                      deadline.tone === 'warn' && 'bg-amber-50 text-amber-700',
                      deadline.tone === 'muted' && 'bg-muted text-muted-foreground',
                    )}
                  >
                    <Clock className="size-3" />
                    {deadline.text}
                  </span>
                )}
              </div>
              <h2 className="mt-4 text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">Caption</h2>
              <p className="mt-2 whitespace-pre-wrap text-[13.5px] leading-relaxed text-foreground">{post.caption}</p>
            </div>
          </Card>

          <Card>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-5">
              <div>
                <h2 className="text-[15px] font-semibold">Feedback history</h2>
                <p className="mt-0.5 text-[12.5px] text-muted-foreground">
                  Every client decision is kept, revision by revision.
                </p>
              </div>
              <span className="rounded-full bg-muted px-2.5 py-1 text-[11.5px] font-medium text-muted-foreground">
                {feedback.length} {feedback.length === 1 ? 'entry' : 'entries'}
              </span>
            </div>
            {feedback.length === 0 ? (
              <EmptyState
                icon={<MessageSquareWarning />}
                title="No feedback yet"
                description="Once the client approves or requests changes, their decision and comments appear here."
                className="py-10"
              />
            ) : (
              <ol className="divide-y divide-border">
                {feedback.map((entry) => (
                  <li key={entry.id} className="p-5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={cn(
                          'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-medium',
                          entry.decision === 'approved' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700',
                        )}
                      >
                        {entry.decision === 'approved' ? <CheckCircle2 className="size-3.5" /> : <MessageSquareWarning className="size-3.5" />}
                        {entry.decision === 'approved' ? 'Approved' : 'Changes requested'}
                      </span>
                      <span className="rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                        Revision {entry.post_revision}
                      </span>
                      <span className="text-[11.5px] text-muted-foreground" title={formatDateTime(entry.created_at)}>
                        {formatRelative(entry.created_at)}
                      </span>
                    </div>
                    <p className="mt-2 text-[13px] font-medium text-foreground">
                      {client?.client_name ?? 'Client'}
                      <span className="font-normal text-muted-foreground"> · {client?.business_name}</span>
                    </p>
                    {entry.comments ? (
                      <p className="mt-1.5 whitespace-pre-wrap text-[13px] leading-relaxed text-muted-foreground">
                        {entry.comments}
                      </p>
                    ) : (
                      <p className="mt-1.5 text-[13px] italic text-muted-foreground">No comment left.</p>
                    )}
                  </li>
                ))}
              </ol>
            )}
          </Card>
        </div>

        <div className="space-y-5">
          <Card className="p-5">
            <h2 className="text-[15px] font-semibold">Post details</h2>
            <dl className="mt-3 space-y-3 text-[13px]">
              <DetailRow label="Client" value={client?.business_name ?? 'Unassigned'} />
              <DetailRow label="Contact" value={client?.client_name ?? '—'} />
              <DetailRow label="Review deadline" value={post.review_deadline ? formatDateTime(post.review_deadline) : 'No deadline'} />
              <DetailRow label="Submitted" value={post.submitted_at ? formatDateTime(post.submitted_at) : 'Not submitted'} />
              <DetailRow label="Created" value={formatDate(post.created_at, 'd MMM yyyy, HH:mm')} />
              <DetailRow label="Last updated" value={formatRelative(post.updated_at)} />
            </dl>

            {post.notes && (
              <>
                <Separator className="my-4" />
                <div className="rounded-lg bg-amber-50/70 p-3">
                  <p className="flex items-center gap-1.5 text-[11.5px] font-semibold uppercase tracking-wide text-amber-800">
                    <StickyNote className="size-3.5" /> Internal note
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-[12.5px] leading-relaxed text-amber-900">{post.notes}</p>
                </div>
              </>
            )}
          </Card>

          {client && post.status !== 'draft' && post.status !== 'archived' && (
            <Card className="p-5">
              <h2 className="text-[15px] font-semibold">Review link</h2>
              <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">
                Opens this post in {client.client_name}'s review portal.
              </p>
              <Button variant="outline" size="sm" className="mt-3 w-full justify-start" onClick={() => void copyLink()}>
                {copied ? <Check className="text-emerald-600" /> : <Link2 />}
                {copied ? 'Link copied' : 'Copy post review link'}
              </Button>
              <Button asChild variant="ghost" size="sm" className="mt-1.5 w-full justify-start">
                <a href={reviewUrl} target="_blank" rel="noreferrer">
                  <ExternalLink /> Open client view
                </a>
              </Button>
            </Card>
          )}

          <Card className="p-5">
            <h2 className="text-[15px] font-semibold">More actions</h2>
            <div className="mt-3 grid gap-2">
              <Button
                variant="outline"
                size="sm"
                className="justify-start"
                onClick={() => {
                  const result = duplicatePost(post.id);
                  if (result.ok) {
                    notify({ tone: 'success', title: 'Draft duplicated' });
                    navigate(`/app/posts/${result.data.id}`);
                  } else {
                    notify({ tone: 'error', title: 'Could not duplicate post', description: result.error });
                  }
                }}
              >
                <CopyIcon /> Duplicate as draft
              </Button>
              {post.status === 'archived' ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="justify-start"
                  onClick={() => {
                    const result = restorePost(post.id);
                    notify(
                      result.ok
                        ? { tone: 'success', title: 'Post restored as draft' }
                        : { tone: 'error', title: 'Could not restore post', description: result.error },
                    );
                  }}
                >
                  <RotateCcw /> Restore as draft
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="justify-start text-destructive hover:bg-destructive/5 hover:text-destructive"
                  onClick={() => {
                    const result = archivePost(post.id);
                    notify(
                      result.ok
                        ? { tone: 'success', title: 'Post archived' }
                        : { tone: 'error', title: 'Could not archive post', description: result.error },
                    );
                  }}
                >
                  <Archive /> Archive post
                </Button>
              )}
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="text-[15px] font-semibold">Status timeline</h2>
            <ol className="mt-3 space-y-3">
              <TimelineItem
                label="Draft created"
                value={formatDateTime(post.created_at)}
                done
              />
              <TimelineItem
                label={`Revision ${post.revision} submitted`}
                value={post.submitted_at ? formatDateTime(post.submitted_at) : 'Not submitted yet'}
                done={Boolean(post.submitted_at)}
              />
              <TimelineItem
                label={
                  post.status === 'approved'
                    ? 'Approved by client'
                    : post.status === 'changes_requested'
                      ? 'Changes requested'
                      : 'Awaiting client decision'
                }
                value={
                  post.status === 'approved' || post.status === 'changes_requested'
                    ? formatDateTime(feedback[0]?.created_at)
                    : post.status === 'pending_approval'
                      ? deadline.text
                      : '—'
                }
                done={post.status === 'approved' || post.status === 'changes_requested'}
                tone={post.status === 'changes_requested' ? 'danger' : 'success'}
              />
            </ol>
          </Card>
        </div>
      </div>

      <PostFormDialog open={editOpen} onOpenChange={setEditOpen} post={post} />
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="shrink-0 text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium text-foreground">{value}</dd>
    </div>
  );
}

function TimelineItem({
  label,
  value,
  done,
  tone = 'success',
}: {
  label: string;
  value: string;
  done: boolean;
  tone?: 'success' | 'danger';
}) {
  return (
    <li className="flex gap-2.5">
      <span
        className={cn(
          'mt-1 flex size-4 shrink-0 items-center justify-center rounded-full border',
          done
            ? tone === 'danger'
              ? 'border-rose-200 bg-rose-100 text-rose-600'
              : 'border-emerald-200 bg-emerald-100 text-emerald-600'
            : 'border-border bg-muted text-muted-foreground',
        )}
        aria-hidden
      >
        {done ? <Check className="size-2.5" /> : <span className="size-1.5 rounded-full bg-current" />}
      </span>
      <div className="min-w-0 flex-1">
        <p className={cn('text-[12.5px] font-medium', done ? 'text-foreground' : 'text-muted-foreground')}>{label}</p>
        <p className="text-[11.5px] text-muted-foreground">{value}</p>
      </div>
    </li>
  );
}
