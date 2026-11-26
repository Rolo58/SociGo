import { format, formatDistanceToNowStrict, isToday, isTomorrow, isYesterday, parseISO } from 'date-fns';
import type { PostStatus } from './types';
import { statusMeta } from './status';

export function toDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const parsed = value.length === 10 ? new Date(`${value}T00:00:00`) : parseISO(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/** Scheduled dates are calendar dates, not instants, so they are formatted without a timezone shift. */
export function formatDate(value: string | null | undefined, pattern = 'd MMM yyyy') {
  const date = toDate(value);
  return date ? format(date, pattern) : '—';
}

export function formatDateTime(value: string | null | undefined) {
  const date = toDate(value);
  return date ? format(date, 'd MMM yyyy, HH:mm') : '—';
}

export function formatRelative(value: string | null | undefined) {
  const date = toDate(value);
  if (!date) return '—';
  return `${formatDistanceToNowStrict(date)} ago`;
}

export function formatDayLabel(value: string | null | undefined) {
  const date = toDate(value);
  if (!date) return '—';
  if (isToday(date)) return 'Today';
  if (isTomorrow(date)) return 'Tomorrow';
  if (isYesterday(date)) return 'Yesterday';
  return format(date, 'EEE d MMM');
}

export function daysUntil(value: string | null | undefined): number | null {
  const date = toDate(value);
  if (!date) return null;
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - start.getTime()) / 86_400_000);
}

export function deadlineLabel(value: string | null | undefined) {
  const days = daysUntil(value);
  if (days === null) return { text: 'No deadline', tone: 'muted' as const };
  if (days < 0) return { text: `${Math.abs(days)}d overdue`, tone: 'danger' as const };
  if (days === 0) return { text: 'Due today', tone: 'warn' as const };
  if (days === 1) return { text: 'Due tomorrow', tone: 'warn' as const };
  if (days <= 3) return { text: `Due in ${days}d`, tone: 'warn' as const };
  return { text: `Due in ${days}d`, tone: 'muted' as const };
}

export function pluralise(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

export function statusSummary(statuses: PostStatus[]) {
  return statuses.map((status) => statusMeta(status).label).join(', ');
}

export function truncate(text: string, length = 120) {
  if (text.length <= length) return text;
  return `${text.slice(0, length).trimEnd()}…`;
}
