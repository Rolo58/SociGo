import { Link } from 'react-router-dom';
import { CalendarDays, Copy, ImageIcon, MoreHorizontal, Pencil, Send, Archive, RotateCcw, Clock } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { PlatformChip, StatusBadge } from '@/components/status-badge';
import { formatDayLabel, deadlineLabel, truncate } from '@/lib/format';
import type { Client, Post } from '@/lib/types';
import { cn } from '@/lib/utils';

interface PostCardProps {
  post: Post;
  client?: Client;
  onEdit: (post: Post) => void;
  onSubmit: (post: Post) => void;
  onDuplicate: (post: Post) => void;
  onArchive: (post: Post) => void;
  onRestore: (post: Post) => void;
}

export function PostCard({ post, client, onEdit, onSubmit, onDuplicate, onArchive, onRestore }: PostCardProps) {
  const deadline = deadlineLabel(post.review_deadline);
  const canSubmit = post.status === 'draft' || post.status === 'changes_requested';

  return (
    <Card className="group flex flex-col overflow-hidden transition-shadow hover:shadow-raised">
      <Link to={`/app/posts/${post.id}`} className="block focus-visible:outline-none">
        <div className="relative aspect-[16/10] w-full overflow-hidden bg-muted">
          {post.image_url ? (
            <img
              src={post.image_url}
              alt=""
              loading="lazy"
              className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            />
          ) : (
            <div className="flex size-full flex-col items-center justify-center gap-1.5 text-muted-foreground/60">
              <ImageIcon className="size-6" />
              <span className="text-xs">No creative attached</span>
            </div>
          )}
          <div className="absolute left-2.5 top-2.5 flex items-center gap-1.5">
            <StatusBadge status={post.status} className="bg-card/95 shadow-sm backdrop-blur" />
          </div>
        </div>
      </Link>

      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <Link to={`/app/posts/${post.id}`} className="block focus-visible:outline-none">
              <h3 className="truncate text-[14px] font-semibold leading-snug text-foreground hover:text-primary">
                {post.title}
              </h3>
            </Link>
            <p className="mt-0.5 truncate text-[12px] text-muted-foreground">
              {client?.business_name ?? 'Unassigned client'}
            </p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${post.title}`}>
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Post actions</DropdownMenuLabel>
              <DropdownMenuItem asChild>
                <Link to={`/app/posts/${post.id}`}>View post</Link>
              </DropdownMenuItem>
              {post.status !== 'archived' && (
                <DropdownMenuItem onSelect={() => onEdit(post)}>
                  <Pencil /> Edit post
                </DropdownMenuItem>
              )}
              {canSubmit && (
                <DropdownMenuItem onSelect={() => onSubmit(post)}>
                  <Send /> Submit for approval
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onSelect={() => onDuplicate(post)}>
                <Copy /> Duplicate
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {post.status === 'archived' ? (
                <DropdownMenuItem onSelect={() => onRestore(post)}>
                  <RotateCcw /> Restore as draft
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem destructive onSelect={() => onArchive(post)}>
                  <Archive /> Archive post
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <p className="mt-2 line-clamp-2 text-[12.5px] leading-relaxed text-muted-foreground">
          {truncate(post.caption, 120)}
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <PlatformChip platform={post.platform} />
          <span className="inline-flex items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">
            <CalendarDays className="size-3" />
            {formatDayLabel(post.scheduled_date)}
          </span>
          {post.status === 'pending_approval' && (
            <span
              className={cn(
                'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium',
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
      </div>
    </Card>
  );
}
