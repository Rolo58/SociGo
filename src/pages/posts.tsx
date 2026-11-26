import * as React from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Archive, FileText, LayoutGrid, List, Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageHeader } from '@/components/page-header';
import { EmptyState } from '@/components/empty-state';
import { PostCard } from '@/components/posts/post-card';
import { PostFormDialog } from '@/components/posts/post-form-dialog';
import { StatusBadge, PlatformChip } from '@/components/status-badge';
import { useStore } from '@/lib/store';
import { listPosts } from '@/lib/repository';
import { POST_STATUS_META, POST_STATUS_ORDER } from '@/lib/status';
import { formatDayLabel, truncate } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { Post, PostStatus } from '@/lib/types';

export function PostsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { db, session, clients, submitPost, duplicatePost, archivePost, restorePost, notify } = useStore();

  const statusParam = (searchParams.get('status') ?? 'all') as PostStatus | 'all';
  const clientParam = searchParams.get('client') ?? 'all';
  const [search, setSearch] = React.useState('');
  const [view, setView] = React.useState<'grid' | 'list'>('grid');
  const [dialogOpen, setDialogOpen] = React.useState(searchParams.get('new') === '1');
  const [editing, setEditing] = React.useState<Post | null>(null);

  const clientById = React.useMemo(() => new Map(clients.map((c) => [c.id, c])), [clients]);

  const posts = React.useMemo(
    () =>
      listPosts(db, session.managerId, {
        status: statusParam,
        clientId: clientParam === 'all' ? undefined : clientParam,
        includeArchived: statusParam === 'archived',
        search,
      }),
    [db, session.managerId, statusParam, clientParam, search],
  );

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value === 'all') next.delete(key);
    else next.set(key, value);
    next.delete('new');
    setSearchParams(next, { replace: true });
  };

  const handleResult = (result: { ok: boolean; error?: string }, successTitle: string, description?: string) => {
    notify(
      result.ok
        ? { tone: 'success', title: successTitle, description }
        : { tone: 'error', title: 'Action failed', description: result.error },
    );
  };

  const actions = {
    onEdit: (post: Post) => {
      setEditing(post);
      setDialogOpen(true);
    },
    onSubmit: async (post: Post) =>
      handleResult(await submitPost(post.id), 'Post submitted', 'The client can now review this content.'),
    onDuplicate: async (post: Post) => {
      const result = await duplicatePost(post.id);
      if (result.ok) {
        notify({ tone: 'success', title: 'Draft duplicated', description: truncate(result.data.title, 60) });
        navigate(`/app/posts/${result.data.id}`);
      } else {
        notify({ tone: 'error', title: 'Could not duplicate post', description: result.error });
      }
    },
    onArchive: async (post: Post) => {
      const result = await archivePost(post.id);
      handleResult(result, 'Post archived', 'You can restore it from the archive tab.');
    },
    onRestore: async (post: Post) => {
      const result = await restorePost(post.id);
      handleResult(result, 'Post restored', 'It is now a draft.');
    },
  };

  const counts = React.useMemo(() => {
    const scoped = listPosts(db, session.managerId, {
      clientId: clientParam === 'all' ? undefined : clientParam,
      includeArchived: true,
    });
    return {
      all: scoped.filter((p) => p.status !== 'archived').length,
      draft: scoped.filter((p) => p.status === 'draft').length,
      pending_approval: scoped.filter((p) => p.status === 'pending_approval').length,
      approved: scoped.filter((p) => p.status === 'approved').length,
      changes_requested: scoped.filter((p) => p.status === 'changes_requested').length,
      archived: scoped.filter((p) => p.status === 'archived').length,
    };
  }, [db, session.managerId, clientParam]);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Posts"
        description="Draft content, submit it for approval and track every decision."
        actions={
          <Button
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
          >
            <Plus /> Create post
          </Button>
        }
      />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="scroll-thin -mx-1 overflow-x-auto px-1 pb-1">
          <Tabs value={statusParam} onValueChange={(value) => setParam('status', value)}>
            <TabsList className="w-max">
              <TabsTrigger value="all">All ({counts.all})</TabsTrigger>
              {POST_STATUS_ORDER.map((status) => (
                <TabsTrigger key={status} value={status}>
                  {POST_STATUS_META[status].shortLabel} ({counts[status]})
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-0 flex-1 sm:flex-initial">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search posts…"
              className="pl-8 sm:w-56"
              aria-label="Search posts"
            />
          </div>
          <Select value={clientParam} onValueChange={(value) => setParam('client', value)}>
            <SelectTrigger className="sm:w-48" aria-label="Filter by client">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All clients</SelectItem>
              {clients.map((client) => (
                <SelectItem key={client.id} value={client.id}>
                  {client.business_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="hidden items-center rounded-lg border border-border p-0.5 sm:flex">
            <button
              type="button"
              onClick={() => setView('grid')}
              className={cn(
                'rounded-md p-1.5 transition-colors',
                view === 'grid' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground',
              )}
              aria-label="Grid view"
              aria-pressed={view === 'grid'}
            >
              <LayoutGrid className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => setView('list')}
              className={cn(
                'rounded-md p-1.5 transition-colors',
                view === 'list' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground',
              )}
              aria-label="List view"
              aria-pressed={view === 'list'}
            >
              <List className="size-4" />
            </button>
          </div>
        </div>
      </div>

      {posts.length === 0 ? (
        <Card>
          <EmptyState
            icon={statusParam === 'archived' ? <Archive /> : <FileText />}
            title={search ? 'No posts match your search' : statusParam === 'archived' ? 'No archived posts' : 'No posts yet'}
            description={
              search
                ? 'Try a different keyword, client or status filter.'
                : statusParam === 'archived'
                  ? 'Archived posts keep their history and can be restored at any time.'
                  : 'Create your first post, attach a creative and send it to a client for approval.'
            }
            action={
              !search && statusParam !== 'archived' ? (
                <Button
                  size="sm"
                  onClick={() => {
                    setEditing(null);
                    setDialogOpen(true);
                  }}
                >
                  <Plus /> Create post
                </Button>
              ) : undefined
            }
          />
        </Card>
      ) : view === 'grid' ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              client={clientById.get(post.client_id)}
              {...actions}
            />
          ))}
        </div>
      ) : (
        <Card className="overflow-hidden">
          <div className="hidden grid-cols-[minmax(0,2.2fr)_minmax(0,1.2fr)_9rem_8rem_3rem] gap-3 border-b border-border bg-muted/40 px-4 py-2.5 text-[11.5px] font-semibold uppercase tracking-wide text-muted-foreground lg:grid">
            <span>Post</span>
            <span>Client</span>
            <span>Status</span>
            <span>Scheduled</span>
            <span className="sr-only">Open</span>
          </div>
          <ul className="divide-y divide-border">
            {posts.map((post) => {
              const client = clientById.get(post.client_id);
              return (
                <li key={post.id}>
                  <Link
                    to={`/app/posts/${post.id}`}
                    className="grid gap-2 px-4 py-3 transition-colors hover:bg-muted/40 lg:grid-cols-[minmax(0,2.2fr)_minmax(0,1.2fr)_9rem_8rem_3rem] lg:items-center lg:gap-3"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="size-10 shrink-0 overflow-hidden rounded-md bg-muted">
                        {post.image_url ? (
                          <img src={post.image_url} alt="" className="size-full object-cover" loading="lazy" />
                        ) : (
                          <div className="flex size-full items-center justify-center">
                            <FileText className="size-4 text-muted-foreground/60" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-medium">{post.title}</p>
                        <div className="mt-0.5 flex items-center gap-1.5">
                          <PlatformChip platform={post.platform} />
                        </div>
                      </div>
                    </div>
                    <p className="truncate text-[12.5px] text-muted-foreground">{client?.business_name}</p>
                    <StatusBadge status={post.status} className="justify-self-start" />
                    <p className="text-[12.5px] text-muted-foreground">{formatDayLabel(post.scheduled_date)}</p>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      <PostFormDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setEditing(null);
            if (searchParams.get('new')) setParam('new', 'all');
          }
        }}
        post={editing}
        defaultClientId={clientParam === 'all' ? undefined : clientParam}
        onSaved={(post) => {
          if (!editing) navigate(`/app/posts/${post.id}`);
        }}
      />
    </div>
  );
}
