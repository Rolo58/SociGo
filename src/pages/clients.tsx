import * as React from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Archive, Check, Copy, ExternalLink, Link2, Mail, MoreHorizontal, Pencil, Plus, RotateCcw, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { PageHeader } from '@/components/page-header';
import { EmptyState } from '@/components/empty-state';
import { StatusBadge } from '@/components/status-badge';
import { ClientFormDialog } from '@/components/clients/client-form-dialog';
import { useStore } from '@/lib/store';
import { formatDate } from '@/lib/format';
import { getClient } from '@/lib/repository';
import { initials, cn } from '@/lib/utils';
import type { Client } from '@/lib/types';

function reviewUrl(token: string) {
  return `${window.location.origin}${window.location.pathname}#/review/${token}`;
}

export function ClientsPage() {
  const { clients, archivedClients, posts, archiveClient, restoreClient, notify } = useStore();
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Client | null>(null);
  const [search, setSearch] = React.useState('');

  const filtered = clients.filter((c) => {
    const term = search.trim().toLowerCase();
    if (!term) return true;
    return (
      c.client_name.toLowerCase().includes(term) ||
      c.business_name.toLowerCase().includes(term) ||
      c.email.toLowerCase().includes(term)
    );
  });

  const postCount = (clientId: string) => posts.filter((p) => p.client_id === clientId).length;
  const pendingCount = (clientId: string) =>
    posts.filter((p) => p.client_id === clientId && p.status === 'pending_approval').length;

  const copyLink = async (client: Client) => {
    try {
      await navigator.clipboard.writeText(reviewUrl(client.review_token));
      notify({ tone: 'success', title: 'Review link copied', description: `Share it with ${client.client_name}.` });
    } catch {
      notify({
        tone: 'error',
        title: 'Could not copy the link',
        description: 'Your browser blocked clipboard access. Open the client page to copy it manually.',
      });
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Clients"
        description="Every client workspace, their review links and their content in one place."
        actions={
          <Button
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
          >
            <Plus /> Add client
          </Button>
        }
      />

      <Tabs defaultValue="active">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <TabsList>
            <TabsTrigger value="active">Active ({clients.length})</TabsTrigger>
            <TabsTrigger value="archived">Archived ({archivedClients.length})</TabsTrigger>
          </TabsList>
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search clients…"
            className="sm:max-w-xs"
            aria-label="Search clients"
          />
        </div>

        <TabsContent value="active">
          {filtered.length === 0 ? (
            <Card>
              <EmptyState
                icon={<Users />}
                title={clients.length === 0 ? 'No clients yet' : 'No matching clients'}
                description={
                  clients.length === 0
                    ? 'Add your first client to start organising their content and approvals.'
                    : 'Try a different name, business or email address.'
                }
                action={
                  clients.length === 0 ? (
                    <Button
                      size="sm"
                      onClick={() => {
                        setEditing(null);
                        setDialogOpen(true);
                      }}
                    >
                      <Plus /> Add client
                    </Button>
                  ) : undefined
                }
              />
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map((client) => (
                <Card key={client.id} className="flex flex-col p-5">
                  <div className="flex items-start gap-3">
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-sm font-semibold text-primary">
                      {initials(client.business_name)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <Link
                        to={`/app/clients/${client.id}`}
                        className="block truncate text-[14px] font-semibold text-foreground hover:text-primary"
                      >
                        {client.business_name}
                      </Link>
                      <p className="truncate text-[12.5px] text-muted-foreground">{client.client_name}</p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${client.business_name}`}>
                          <MoreHorizontal />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link to={`/app/clients/${client.id}`}>Open client</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onSelect={() => {
                            setEditing(client);
                            setDialogOpen(true);
                          }}
                        >
                          <Pencil /> Edit details
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => void copyLink(client)}>
                          <Link2 /> Copy review link
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          destructive
                          onSelect={() => {
                            const result = archiveClient(client.id);
                            notify(
                              result.ok
                                ? {
                                    tone: 'success',
                                    title: 'Client archived',
                                    description: `${client.business_name}'s posts moved to the archive.`,
                                  }
                                : { tone: 'error', title: 'Could not archive client', description: result.error },
                            );
                          }}
                        >
                          <Archive /> Archive client
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <a
                    href={`mailto:${client.email}`}
                    className="mt-3 inline-flex items-center gap-1.5 truncate text-[12.5px] text-muted-foreground hover:text-foreground"
                  >
                    <Mail className="size-3.5 shrink-0" />
                    <span className="truncate">{client.email}</span>
                  </a>

                  <div className="mt-4 flex flex-wrap items-center gap-1.5">
                    <Badge variant="neutral">{postCount(client.id)} posts</Badge>
                    {pendingCount(client.id) > 0 && (
                      <Badge variant="warning">{pendingCount(client.id)} pending</Badge>
                    )}
                    <Badge variant="outline">Added {formatDate(client.created_at, 'd MMM yyyy')}</Badge>
                  </div>

                  <div className="mt-auto flex items-center gap-2 pt-4">
                    <Button asChild variant="outline" size="sm" className="flex-1">
                      <Link to={`/app/clients/${client.id}`}>View client</Link>
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => void copyLink(client)}>
                      <Link2 /> Link
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="archived">
          {archivedClients.length === 0 ? (
            <Card>
              <EmptyState
                icon={<Archive />}
                title="No archived clients"
                description="Archiving a client hides them from active work and disables their review link, without deleting their history."
              />
            </Card>
          ) : (
            <div className="space-y-2">
              {archivedClients.map((client) => (
                <Card key={client.id} className="flex flex-wrap items-center gap-3 p-4">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-xs font-semibold text-muted-foreground">
                    {initials(client.business_name)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13.5px] font-medium">{client.business_name}</p>
                    <p className="truncate text-[12px] text-muted-foreground">
                      {client.client_name} · archived {formatDate(client.archived_at, 'd MMM yyyy')}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const result = restoreClient(client.id);
                      notify(
                        result.ok
                          ? { tone: 'success', title: 'Client restored', description: `${client.business_name} is active again.` }
                          : { tone: 'error', title: 'Could not restore client', description: result.error },
                      );
                    }}
                  >
                    <RotateCcw /> Restore
                  </Button>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <ClientFormDialog open={dialogOpen} onOpenChange={setDialogOpen} client={editing} />
    </div>
  );
}

export function ClientDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { db, session, archiveClient, restoreClient, rotateReviewToken, notify } = useStore();
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  const resolved = React.useMemo(() => getClient(db, session.managerId, id), [db, session.managerId, id]);

  if (!resolved.ok) {
    return (
      <Card>
        <EmptyState
          icon={<Users />}
          title="Client not found"
          description="This client does not exist, or it belongs to another manager account."
          action={
            <Button asChild size="sm">
              <Link to="/app/clients">Back to clients</Link>
            </Button>
          }
        />
      </Card>
    );
  }

  const client = resolved.data;
  const clientPosts = db.posts
    .filter((p) => p.client_id === client.id)
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at));
  const active = clientPosts.filter((p) => p.status !== 'archived');
  const url = reviewUrl(client.review_token);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      notify({ tone: 'error', title: 'Could not copy the link', description: 'Copy it manually from the field above.' });
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={client.business_name}
        description={`${client.client_name} · Client since ${formatDate(client.created_at, 'd MMM yyyy')}`}
        breadcrumb={
          <Link to="/app/clients" className="mb-1 inline-flex items-center gap-1 text-[12.5px] text-muted-foreground hover:text-foreground">
            ← Clients
          </Link>
        }
        actions={
          <>
            <Button variant="outline" onClick={() => setDialogOpen(true)}>
              <Pencil /> Edit details
            </Button>
            <Button onClick={() => navigate(`/app/posts?new=1&client=${client.id}`)}>
              <Plus /> New post
            </Button>
          </>
        }
      />

      {client.archived_at && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-900">
          <Archive className="size-4 shrink-0" />
          <span className="flex-1">This client is archived. Their review link is disabled.</span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              const res = restoreClient(client.id);
              notify(res.ok ? { tone: 'success', title: 'Client restored' } : { tone: 'error', title: 'Could not restore', description: res.error });
            }}
          >
            <RotateCcw /> Restore client
          </Button>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Card>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-5">
              <div>
                <h2 className="text-[15px] font-semibold">Client posts</h2>
                <p className="mt-0.5 text-[12.5px] text-muted-foreground">
                  {active.length} active {active.length === 1 ? 'post' : 'posts'} for this client
                </p>
              </div>
              <Button asChild variant="ghost" size="sm">
                <Link to={`/app/posts?client=${client.id}`}>View in posts</Link>
              </Button>
            </div>
            {clientPosts.length === 0 ? (
              <EmptyState
                icon={<ExternalLink />}
                title="No posts for this client"
                description="Create a post and submit it to generate a review link."
                action={
                  <Button size="sm" onClick={() => navigate(`/app/posts?new=1&client=${client.id}`)}>
                    <Plus /> Create post
                  </Button>
                }
              />
            ) : (
              <ul className="divide-y divide-border">
                {clientPosts.map((post) => (
                  <li key={post.id}>
                    <Link
                      to={`/app/posts/${post.id}`}
                      className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-muted/40"
                    >
                      <div className="size-10 shrink-0 overflow-hidden rounded-md bg-muted">
                        {post.image_url ? (
                          <img src={post.image_url} alt="" className="size-full object-cover" loading="lazy" />
                        ) : null}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-medium">{post.title}</p>
                        <p className="text-[11.5px] text-muted-foreground">
                          {formatDate(post.scheduled_date, 'd MMM yyyy')}
                        </p>
                      </div>
                      <StatusBadge status={post.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="space-y-5">
          <Card className="p-5">
            <h2 className="text-[15px] font-semibold">Contact details</h2>
            <dl className="mt-3 space-y-3 text-[13px]">
              <div>
                <dt className="text-muted-foreground">Contact name</dt>
                <dd className="mt-0.5 font-medium">{client.client_name}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Email address</dt>
                <dd className="mt-0.5 truncate font-medium">{client.email}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Client ID</dt>
                <dd className="mt-0.5 truncate font-mono text-[11.5px] text-muted-foreground">{client.id}</dd>
              </div>
            </dl>
          </Card>

          <Card className="p-5">
            <h2 className="text-[15px] font-semibold">Review link</h2>
            <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">
              Share this private link with {client.client_name}. It only shows this client's submitted posts.
            </p>
            <div className="mt-3 flex items-center gap-2">
              <Input readOnly value={url} className="font-mono text-[11px]" aria-label="Client review link" />
              <Button size="icon" variant="outline" onClick={() => void copy()} aria-label="Copy review link">
                {copied ? <Check className="text-emerald-600" /> : <Copy />}
              </Button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button asChild size="sm" variant="outline" className="flex-1">
                <a href={url} target="_blank" rel="noreferrer">
                  <ExternalLink /> Preview portal
                </a>
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  const res = rotateReviewToken(client.id);
                  notify(
                    res.ok
                      ? {
                          tone: 'success',
                          title: 'New review link issued',
                          description: 'The previous link no longer works.',
                        }
                      : { tone: 'error', title: 'Could not rotate link', description: res.error },
                  );
                }}
              >
                Replace link
              </Button>
            </div>
          </Card>

          <Card className={cn('p-5', client.archived_at && 'opacity-60')}>
            <h2 className="text-[15px] font-semibold">Danger zone</h2>
            <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">
              Archiving keeps the history but removes the client from active work and disables their review link.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3 w-full text-destructive hover:bg-destructive/5 hover:text-destructive"
              disabled={Boolean(client.archived_at)}
              onClick={() => {
                const res = archiveClient(client.id);
                notify(
                  res.ok
                    ? { tone: 'success', title: 'Client archived', description: 'Their posts moved to the archive.' }
                    : { tone: 'error', title: 'Could not archive client', description: res.error },
                );
              }}
            >
              <Archive /> Archive client
            </Button>
          </Card>
        </div>
      </div>

      <ClientFormDialog open={dialogOpen} onOpenChange={setDialogOpen} client={client} />
    </div>
  );
}
