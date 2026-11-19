import * as React from 'react';
import { Link } from 'react-router-dom';
import {
  addMonths,
  addWeeks,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { CalendarDays, ChevronLeft, ChevronRight, FileText, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageHeader } from '@/components/page-header';
import { EmptyState } from '@/components/empty-state';
import { PostFormDialog } from '@/components/posts/post-form-dialog';
import { StatusDot } from '@/components/status-badge';
import { useStore } from '@/lib/store';
import { postsForRange } from '@/lib/repository';
import { POST_STATUS_META, POST_STATUS_ORDER } from '@/lib/status';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { Post } from '@/lib/types';

type View = 'month' | 'week';

export function CalendarPage() {
  const { db, session, clients } = useStore();
  const [view, setView] = React.useState<View>('month');
  const [cursor, setCursor] = React.useState(() => new Date());
  const [dialogOpen, setDialogOpen] = React.useState(false);

  const clientById = React.useMemo(() => new Map(clients.map((c) => [c.id, c])), [clients]);

  const range = React.useMemo(() => {
    if (view === 'month') {
      const start = startOfWeek(startOfMonth(cursor), { weekStartsOn: 1 });
      const end = endOfWeek(endOfMonth(cursor), { weekStartsOn: 1 });
      return { start, end };
    }
    return {
      start: startOfWeek(cursor, { weekStartsOn: 1 }),
      end: endOfWeek(cursor, { weekStartsOn: 1 }),
    };
  }, [view, cursor]);

  const posts = React.useMemo(
    () =>
      postsForRange(
        db,
        session.managerId,
        format(range.start, 'yyyy-MM-dd'),
        format(range.end, 'yyyy-MM-dd'),
      ),
    [db, session.managerId, range],
  );

  const byDate = React.useMemo(() => {
    const map = new Map<string, Post[]>();
    posts.forEach((post) => {
      const list = map.get(post.scheduled_date) ?? [];
      list.push(post);
      map.set(post.scheduled_date, list);
    });
    return map;
  }, [posts]);

  const days = eachDayOfInterval({ start: range.start, end: range.end });

  const step = (direction: -1 | 1) => {
    setCursor((current) => (view === 'month' ? addMonths(current, direction) : addWeeks(current, direction)));
  };

  const title =
    view === 'month'
      ? format(cursor, 'MMMM yyyy')
      : `${format(range.start, 'd MMM')} – ${format(range.end, 'd MMM yyyy')}`;

  const upcoming = posts.filter((p) => p.status === 'pending_approval').slice(0, 3);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Content calendar"
        description="See everything scheduled for publishing and where each post stands in review."
        actions={
          <Button onClick={() => setDialogOpen(true)}>
            <Plus /> Create post
          </Button>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => step(-1)} aria-label="Previous period">
            <ChevronLeft />
          </Button>
          <Button variant="outline" size="icon" onClick={() => step(1)} aria-label="Next period">
            <ChevronRight />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setCursor(new Date())}>
            Today
          </Button>
          <h2 className="ml-1 text-[15px] font-semibold tracking-tight">{title}</h2>
        </div>
        <Tabs value={view} onValueChange={(value) => setView(value as View)}>
          <TabsList>
            <TabsTrigger value="month">Month</TabsTrigger>
            <TabsTrigger value="week">Week</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-border bg-card px-4 py-2.5">
        <span className="text-[11.5px] font-semibold uppercase tracking-wide text-muted-foreground">Status</span>
        {POST_STATUS_ORDER.filter((s) => s !== 'archived').map((status) => (
          <span key={status} className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground">
            <StatusDot status={status} />
            {POST_STATUS_META[status].label}
          </span>
        ))}
      </div>

      {view === 'month' ? (
        <Card className="overflow-hidden">
          <div className="grid grid-cols-7 border-b border-border bg-muted/40">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
              <div
                key={day}
                className="px-2 py-2 text-center text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
              >
                <span className="hidden sm:inline">{day}</span>
                <span className="sm:hidden">{day[0]}</span>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {days.map((day, index) => {
              const key = format(day, 'yyyy-MM-dd');
              const dayPosts = byDate.get(key) ?? [];
              const inMonth = isSameMonth(day, cursor);
              const today = isToday(day);
              return (
                <div
                  key={key}
                  className={cn(
                    'min-h-[86px] border-b border-r border-border p-1.5 sm:min-h-[116px] sm:p-2',
                    index % 7 === 6 && 'border-r-0',
                    !inMonth && 'bg-muted/30',
                    index >= days.length - 7 && 'border-b-0',
                  )}
                >
                  <div className="mb-1 flex items-center justify-between">
                    <span
                      className={cn(
                        'flex size-6 items-center justify-center rounded-full text-[11.5px] font-medium',
                        today ? 'bg-primary text-primary-foreground' : inMonth ? 'text-foreground' : 'text-muted-foreground/60',
                      )}
                    >
                      {format(day, 'd')}
                    </span>
                    {dayPosts.length > 2 && (
                      <span className="text-[10px] font-medium text-muted-foreground">+{dayPosts.length - 2}</span>
                    )}
                  </div>
                  <div className="space-y-1">
                    {dayPosts.slice(0, 2).map((post) => {
                      const meta = POST_STATUS_META[post.status];
                      return (
                        <Link
                          key={post.id}
                          to={`/app/posts/${post.id}`}
                          title={`${post.title} · ${clientById.get(post.client_id)?.business_name ?? ''} · ${meta.label}`}
                          className={cn(
                            'block truncate rounded border px-1.5 py-1 text-[10.5px] font-medium leading-tight transition-opacity hover:opacity-80',
                            meta.barClass,
                            meta.textClass,
                          )}
                        >
                          <span className="hidden sm:inline">{post.title}</span>
                          <span className="sm:hidden">{post.title.slice(0, 12)}</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-7">
          {days.map((day) => {
            const key = format(day, 'yyyy-MM-dd');
            const dayPosts = byDate.get(key) ?? [];
            return (
              <Card key={key} className={cn('flex flex-col p-3', isToday(day) && 'ring-2 ring-primary/30')}>
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {format(day, 'EEE')}
                  </p>
                  <span
                    className={cn(
                      'flex size-6 items-center justify-center rounded-full text-[11.5px] font-medium',
                      isToday(day) ? 'bg-primary text-primary-foreground' : 'text-foreground',
                    )}
                  >
                    {format(day, 'd')}
                  </span>
                </div>
                <div className="mt-2 flex-1 space-y-1.5">
                  {dayPosts.length === 0 ? (
                    <p className="py-3 text-center text-[11px] text-muted-foreground/70">No posts</p>
                  ) : (
                    dayPosts.map((post) => {
                      const meta = POST_STATUS_META[post.status];
                      return (
                        <Link
                          key={post.id}
                          to={`/app/posts/${post.id}`}
                          className={cn(
                            'block rounded-md border px-2 py-1.5 transition-opacity hover:opacity-80',
                            meta.barClass,
                          )}
                        >
                          <p className={cn('truncate text-[11.5px] font-medium leading-tight', meta.textClass)}>
                            {post.title}
                          </p>
                          <p className="mt-0.5 truncate text-[10.5px] text-muted-foreground">
                            {clientById.get(post.client_id)?.business_name}
                          </p>
                        </Link>
                      );
                    })
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {posts.length === 0 && (
        <Card>
          <EmptyState
            icon={<CalendarDays />}
            title="Nothing scheduled in this period"
            description="Posts appear on the calendar as soon as they have a scheduled publishing date."
            action={
              <Button size="sm" onClick={() => setDialogOpen(true)}>
                <Plus /> Create post
              </Button>
            }
          />
        </Card>
      )}

      {upcoming.length > 0 && (
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-[15px] font-semibold">Waiting on clients this period</h2>
            <Button asChild variant="ghost" size="sm">
              <Link to="/app/posts?status=pending_approval">View all</Link>
            </Button>
          </div>
          <ul className="mt-3 divide-y divide-border">
            {upcoming.map((post) => (
              <li key={post.id}>
                <Link
                  to={`/app/posts/${post.id}`}
                  className="flex items-center gap-3 py-2.5 transition-colors hover:text-primary"
                >
                  <StatusDot status={post.status} />
                  <span className="min-w-0 flex-1 truncate text-[13px] font-medium">{post.title}</span>
                  <span className="hidden text-[12px] text-muted-foreground sm:inline">
                    {clientById.get(post.client_id)?.business_name}
                  </span>
                  <span className="text-[12px] text-muted-foreground">{formatDate(post.scheduled_date, 'd MMM')}</span>
                  <FileText className="size-3.5 text-muted-foreground" />
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <PostFormDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
