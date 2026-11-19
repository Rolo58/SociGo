import type { Platform, PostStatus } from './types';

interface StatusMeta {
  label: string;
  shortLabel: string;
  badgeVariant: 'neutral' | 'warning' | 'success' | 'destructive' | 'default';
  /** Calendar dot / bar colours per PRD module 6. */
  dotClass: string;
  barClass: string;
  textClass: string;
  description: string;
}

export const POST_STATUS_META: Record<PostStatus, StatusMeta> = {
  draft: {
    label: 'Draft',
    shortLabel: 'Draft',
    badgeVariant: 'neutral',
    dotClass: 'bg-slate-400',
    barClass: 'bg-slate-100 border-slate-300',
    textClass: 'text-slate-700',
    description: 'Not visible to the client yet.',
  },
  pending_approval: {
    label: 'Pending Approval',
    shortLabel: 'Pending',
    badgeVariant: 'warning',
    dotClass: 'bg-amber-500',
    barClass: 'bg-amber-50 border-amber-300',
    textClass: 'text-amber-800',
    description: 'Waiting for the client to review.',
  },
  approved: {
    label: 'Approved',
    shortLabel: 'Approved',
    badgeVariant: 'success',
    dotClass: 'bg-emerald-500',
    barClass: 'bg-emerald-50 border-emerald-300',
    textClass: 'text-emerald-800',
    description: 'Client approved this content.',
  },
  changes_requested: {
    label: 'Changes Requested',
    shortLabel: 'Changes',
    badgeVariant: 'destructive',
    dotClass: 'bg-rose-500',
    barClass: 'bg-rose-50 border-rose-300',
    textClass: 'text-rose-800',
    description: 'The client asked for revisions.',
  },
  archived: {
    label: 'Archived',
    shortLabel: 'Archived',
    badgeVariant: 'neutral',
    dotClass: 'bg-slate-300',
    barClass: 'bg-slate-50 border-slate-200',
    textClass: 'text-slate-500',
    description: 'Removed from the active workflow.',
  },
};

export const POST_STATUS_ORDER: PostStatus[] = [
  'draft',
  'pending_approval',
  'approved',
  'changes_requested',
  'archived',
];

interface PlatformMeta {
  label: string;
  /** Tailwind classes for the platform chip. */
  chipClass: string;
}

export const PLATFORM_META: Record<Platform, PlatformMeta> = {
  instagram: {
    label: 'Instagram',
    chipClass: 'bg-pink-50 text-pink-700 ring-pink-200',
  },
  facebook: {
    label: 'Facebook',
    chipClass: 'bg-blue-50 text-blue-700 ring-blue-200',
  },
  linkedin: {
    label: 'LinkedIn',
    chipClass: 'bg-sky-50 text-sky-700 ring-sky-200',
  },
};

export const PLATFORMS: Platform[] = ['instagram', 'facebook', 'linkedin'];

export function statusMeta(status: PostStatus): StatusMeta {
  return POST_STATUS_META[status];
}
