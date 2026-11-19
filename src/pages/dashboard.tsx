import * as React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  CircleDashed,
  Clock,
  FileText,
  Plus,
  TrendingUp,
  Users,
  MessageSquareWarning,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/page-header';
import { StatusDot } from '@/components/status-badge';
import { EmptyState } from '@/components/empty-state';
import { ClientFormDialog } from '@/components/clients/client-form-dialog';
import { PostFormDialog } from '@/components/posts/post-form-dialog';
import { useStore } from '@/lib/store';
import { dashboardStats, listActivity } from '@/lib/repository';
import { formatDayLabel, formatRelative, deadlineLabel, truncate } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { Post } from '@/lib/types';

export function DashboardPage() {
  const { db, session, manager, clients, posts, notify } = useStore();
  const navigate = useNavigate();
  const [clientDialogOpen, setClientDialogOpen] = React.useState(false);
  const [postDialogOpen, setPostDialogOpen] = React.useState(false);

  const stats = dashboardStats(db, session.managerId);
  const activity = listActivity(db, session.managerId, 6);
  const clientById = React.useMemo(() => new Map(clients.map((c) => [c.id, c])), [clients]);

  const pending = posts
    .filter((p) => p.status === 'pending_approval')
    .sort((a, b) => (a.review_deadline ?? 'z').localeCompare(b.review_deadline ?? 'z'))
    .slice(0, 4);

  const recentPosts = posts.slice(0, 4);

  const greeting = (() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  })();

  const statCards = [
    {
      label: 'Total posts',
      value: stats.totalPosts,
      icon: FileText,
      tone: 'text-primary bg-primary/8',
      hint: `${stats.drafts} ${stats.drafts === 1 ? 'draft' : 'drafts'} in progress`,
    },
    {
      label: 'Pending approvals',
      value: stats.pendingApprovals,
      icon: Clock,
      tone: 'text-amber-600 bg-amber-50',
      hint: 'Waiting on clients',
    },
    {
      label: 'Approved posts',
      value: stats.approvedPosts,
      icon: CheckCircle2,
      tone: 'text-emerald-600 bg-emerald-50',
      hint: 'Ready to publish',
    },
    {
      label: 'Changes requested',
      value: stats.changesRequested,
      icon: MessageSquareWarning,
      tone: 'text-rose-600 bg-rose-50',
      hint: 'Needs your revision',
    },
  ];

  const approveRate = stats.totalPosts === 0 ? 0 : Math.round((stats.approvedPosts / stats.totalPosts) * 100);

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${greeting}, ${manager.full_name.split(' ')[0]}`}
        description="Here is where your client approvals stand today."
        actions={
          <>
            <Button variant="outline" onClick={() => setClientDialogOpen(true)}>
              <Users /> Add client
            </Button>
            <Button onClick={() => setPostDialogOpen(true)}>
              <Plus /> Create post
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.label} className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[12.5px] font-medium text-muted-foreground">{card.label}</p>
                  <p className="mt-1.5 text-[26px] font-semibold leading-none tracking-tight text-foreground">
                    {card.value}
                  </p>
                  <p className="mt-1.5 text-[11.5px] text-muted-foreground">{card.hint}</p>
                </div>
                <span className={cn('flex size-9 shrink-0 items-center justify-center rounded-lg', card.tone)}>
                  <Icon className="size-[18px]" />
                </span>
              </div>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <div className="space-y-5 xl:col-span-2">
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle>Awaiting client review</CardTitle>
                <p className="mt-1 text-[13px] text-muted-foreground">
                  {stats.pendingApprovals === 0
                    ? 'Nothing is waiting on a client right now.'
                    : `${stats.pendingApprovals} ${stats.pendingApprovals === 1 ? 'post needs' : 'posts need'} a decision.`}
                </p>
              </div>
              <Button asChild variant="ghost" size="sm">
                <Link to="/app/posts?status=pending_approval">
                  View all <ArrowRight />
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="pt-4">
              {pending.length === 0 ? (
                <EmptyState
                  icon={<CircleDashed />}
                  title="No pending approvals"
                  description="Submit a post for approval and it will appear here until the client responds."
                  action={
                    <Button size="sm" onClick={() => setPostDialogOpen(true)}>
                      <Plus /> Create post
                    </Button>
                  }
                  className="py-10"
                />
              ) : (
                <ul className="divide-y divide-border">
                  {pending.map((post) => {
                    const client = clientById.get(post.client_id);
                    const deadline = deadlineLabel(post.review_deadline);
                    return (
                      <li key={post.id}>
                        <Link
                          to={`/app/posts/${post.id}`}
                          className="flex items-center gap-3 py-3 transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 sm:-mx-2 sm:rounded-lg sm:px-2"
                        >
                          <div className="size-11 shrink-0 overflow-hidden rounded-lg bg-muted">
                            {post.image_url ? (
                              <img src={post.image_url} alt="" className="size-full object-cover" loading="lazy" />
                            ) : (
                              <div className="flex size-full items-center justify-center">
                                <FileText className="size-4 text-muted-foreground/60" />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[13.5px] font-medium text-foreground">{post.title}</p>
                            <p className="truncate text-[12px] text-muted-foreground">
                              {client?.business_name} · {formatDayLabel(post.scheduled_date)}
                            </p>
                          </div>
                          <span
                            className={cn(
                              'hidden shrink-0 rounded-md px-2 py-1 text-[11px] font-medium sm:inline-flex',
                              deadline.tone === 'danger' && 'bg-rose-50 text-rose-700',
                              deadline.tone === 'warn' && 'bg-amber-50 text-amber-700',
                              deadline.tone === 'muted' && 'bg-muted text-muted-foreground',
                            )}
                          >
                            {deadline.text}
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle>Recent posts</CardTitle>
              <Button asChild variant="ghost" size="sm">
                <Link to="/app/posts">
                  All posts <ArrowRight />
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="pt-3">
              {recentPosts.length === 0 ? (
                <EmptyState
                  icon={<FileText />}
                  title="No posts yet"
                  description="Create your first post to start collecting client approvals."
                  className="py-10"
                />
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {recentPosts.map((post) => (
                    <RecentPostTile key={post.id} post={post} clientName={clientById.get(post.client_id)?.business_name} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>Quick actions</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2 pt-4">
              <Button variant="outline" className="justify-start" onClick={() => setClientDialogOpen(true)}>
                <Users /> Add new client
              </Button>
              <Button variant="outline" className="justify-start" onClick={() => setPostDialogOpen(true)}>
                <Plus /> Create new post
              </Button>
              <Button variant="outline" className="justify-start" asChild>
                <Link to="/app/calendar">
                  <CalendarDays /> View calendar
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Approval rate</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="flex items-end justify-between">
                <p className="text-2xl font-semibold tracking-tight">{approveRate}%</p>
                <span className="inline-flex items-center gap-1 text-[11.5px] font-medium text-emerald-600">
                  <TrendingUp className="size-3.5" />
                  {stats.approvedPosts} approved
                </span>
              </div>
              <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all"
                  style={{ width: `${approveRate}%` }}
                />
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-3 text-[12px]">
                <div className="rounded-lg bg-muted/60 p-2.5">
                  <dt className="text-muted-foreground">Active clients</dt>
                  <dd className="mt-0.5 text-[15px] font-semibold">{stats.activeClients}</dd>
                </div>
                <div className="rounded-lg bg-muted/60 p-2.5">
                  <dt className="text-muted-foreground">Archived posts</dt>
                  <dd className="mt-0.5 text-[15px] font-semibold">{stats.archived}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent activity</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              {activity.length === 0 ? (
                <p className="py-6 text-center text-[13px] text-muted-foreground">No activity recorded yet.</p>
              ) : (
                <ol className="relative space-y-3.5">
                  {activity.map((entry, index) => (
                    <li key={entry.id} className="relative flex gap-3">
                      {index < activity.length - 1 && (
                        <span className="absolute left-[5px] top-4 h-full w-px bg-border" aria-hidden />
                      )}
                      <span
                        className={cn(
                          'relative mt-1.5 size-2.5 shrink-0 rounded-full ring-4 ring-card',
                          entry.activity_type === 'post_approved' && 'bg-emerald-500',
                          entry.activity_type === 'changes_requested' && 'bg-rose-500',
                          entry.activity_type === 'post_submitted' && 'bg-amber-500',
                          entry.activity_type === 'post_created' && 'bg-primary',
                          entry.activity_type === 'client_created' && 'bg-sky-500',
                          !['post_approved', 'changes_requested', 'post_submitted', 'post_created', 'client_created'].includes(
                            entry.activity_type,
                          ) && 'bg-slate-400',
                        )}
                        aria-hidden
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-[12.5px] leading-snug text-foreground">{entry.description}</p>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">{formatRelative(entry.created_at)}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <ClientFormDialog
        open={clientDialogOpen}
        onOpenChange={setClientDialogOpen}
        onSaved={(client) => navigate(`/app/clients/${client.id}`)}
      />
      <PostFormDialog
        open={postDialogOpen}
        onOpenChange={setPostDialogOpen}
        onSaved={(post) => {
          notify({ tone: 'info', title: 'Post saved', description: truncate(post.title, 60) });
          navigate(`/app/posts/${post.id}`);
        }}
      />
    </div>
  );
}

function RecentPostTile({ post, clientName }: { post: Post; clientName?: string }) {
  return (
    <Link
      to={`/app/posts/${post.id}`}
      className="flex gap-3 rounded-lg border border-border p-2.5 transition-colors hover:border-primary/30 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
    >
      <div className="size-14 shrink-0 overflow-hidden rounded-md bg-muted">
        {post.image_url ? (
          <img src={post.image_url} alt="" className="size-full object-cover" loading="lazy" />
        ) : (
          <div className="flex size-full items-center justify-center">
            <FileText className="size-4 text-muted-foreground/60" />
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[12.5px] font-medium leading-snug">{post.title}</p>
        <p className="truncate text-[11.5px] text-muted-foreground">{clientName}</p>
        <div className="mt-1 flex items-center gap-1.5">
          <StatusDot status={post.status} />
          <span className="text-[11px] text-muted-foreground">{formatDayLabel(post.scheduled_date)}</span>
        </div>
      </div>
    </Link>
  );
}
