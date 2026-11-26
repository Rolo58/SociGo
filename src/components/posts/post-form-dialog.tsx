import * as React from 'react';
import { ImagePlus, Link2, Loader2, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FormField } from '@/components/form-field';
import { prepareImage } from '@/lib/image';
import { useStore } from '@/lib/store';
import { PLATFORMS, PLATFORM_META } from '@/lib/status';
import type { Client, Platform, Post, PostInput } from '@/lib/types';
import { cn } from '@/lib/utils';

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];

interface PostFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  post?: Post | null;
  defaultClientId?: string;
  onSaved?: (post: Post) => void;
}

function todayIso() {
  const d = new Date();
  const offset = d.getTimezoneOffset();
  return new Date(d.getTime() - offset * 60_000).toISOString().slice(0, 10);
}

function toLocalInput(iso: string | null) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const offset = d.getTimezoneOffset();
  return new Date(d.getTime() - offset * 60_000).toISOString().slice(0, 16);
}

const EMPTY: PostInput = {
  title: '',
  client_id: '',
  platform: 'instagram',
  caption: '',
  image_url: null,
  scheduled_date: todayIso(),
  review_deadline: null,
  notes: null,
};

export function PostFormDialog({ open, onOpenChange, post, defaultClientId, onSaved }: PostFormDialogProps) {
  const { clients, createPost, updatePost, submitPost, notify } = useStore();
  const [form, setForm] = React.useState<PostInput>(EMPTY);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [busy, setBusy] = React.useState(false);
  const [uploadError, setUploadError] = React.useState<string | null>(null);
  const [preparing, setPreparing] = React.useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (!open) return;
    setErrors({});
    setUploadError(null);
    if (post) {
      setForm({
        title: post.title,
        client_id: post.client_id,
        platform: post.platform,
        caption: post.caption,
        image_url: post.image_url,
        scheduled_date: post.scheduled_date,
        review_deadline: post.review_deadline,
        notes: post.notes,
      });
    } else {
      setForm({ ...EMPTY, client_id: defaultClientId ?? clients[0]?.id ?? '' });
    }
  }, [open, post, defaultClientId, clients]);

  const update = <K extends keyof PostInput>(key: K, value: PostInput[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      if (!prev[key as string]) return prev;
      const next = { ...prev };
      delete next[key as string];
      return next;
    });
  };

  const handleFile = (file: File | undefined) => {
    setUploadError(null);
    if (!file) return;
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setUploadError('Use a PNG, JPG, WebP or SVG file.');
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setUploadError('Images must be 10 MB or smaller. Try exporting a smaller file.');
      return;
    }
    setPreparing(true);
    prepareImage(file)
      .then((dataUrl) => update('image_url', dataUrl))
      .catch(() => setUploadError('That file could not be read. Please try another image.'))
      .finally(() => setPreparing(false));
  };

  const validate = () => {
    const next: Record<string, string> = {};
    if (form.title.trim().length < 3) next.title = 'Give the post a title of at least 3 characters.';
    if (!form.client_id) next.client_id = 'Choose a client.';
    if (!form.caption.trim()) next.caption = 'A caption is required before this can be reviewed.';
    if (!form.scheduled_date) next.scheduled_date = 'Choose a scheduled publishing date.';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const save = async (mode: 'draft' | 'submit') => {
    if (!validate()) return;
    setBusy(true);
    const payload: PostInput = {
      ...form,
      title: form.title.trim(),
      caption: form.caption.trim(),
      review_deadline: form.review_deadline || null,
      notes: form.notes?.trim() || null,
    };

    const result = post
      ? await updatePost(post.id, payload)
      : await createPost(payload, mode === 'submit' ? 'pending_approval' : 'draft');

    let saved = result.ok ? result.data : null;

    // Editing an existing draft and choosing "submit" saves first, then moves it to Pending.
    if (saved && post && mode === 'submit' && saved.status !== 'pending_approval') {
      const submitted = await submitPost(saved.id);
      if (!submitted.ok) {
        setBusy(false);
        notify({
          tone: 'error',
          title: 'Changes saved, but the post was not submitted',
          description: submitted.error,
        });
        onOpenChange(false);
        return;
      }
      saved = submitted.data;
    }

    setBusy(false);

    if (!saved) {
      notify({ tone: 'error', title: 'Could not save the post', description: result.ok ? '' : result.error });
      return;
    }

    notify({
      tone: 'success',
      title: post ? 'Post updated' : mode === 'submit' ? 'Post submitted for approval' : 'Draft saved',
      description: post
        ? 'Your changes have been saved.'
        : mode === 'submit'
          ? 'The client can now review this post from their review link.'
          : 'You can submit it for approval whenever you are ready.',
    });
    onSaved?.(saved);
    onOpenChange(false);
  };

  const clientList: Client[] = clients;
  const noClients = clientList.length === 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{post ? 'Edit post' : 'Create new post'}</DialogTitle>
          <DialogDescription>
            {post
              ? 'Update the content, then resubmit it so the client sees the latest version.'
              : 'Draft the content, attach a creative and send it to your client for approval.'}
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="space-y-4">
          {noClients && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-[13px] text-amber-900">
              Add a client before creating posts — every post must belong to a client.
            </div>
          )}

          <FormField label="Post title" htmlFor="post-title" required error={errors.title}>
            <Input
              id="post-title"
              value={form.title}
              onChange={(e) => update('title', e.target.value)}
              placeholder="e.g. Single-origin latte launch"
              maxLength={120}
              autoComplete="off"
            />
          </FormField>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Client" htmlFor="post-client" required error={errors.client_id}>
              <Select value={form.client_id} onValueChange={(v) => update('client_id', v)} disabled={noClients}>
                <SelectTrigger id="post-client">
                  <SelectValue placeholder="Select a client" />
                </SelectTrigger>
                <SelectContent>
                  {clientList.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.business_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>

            <FormField label="Platform" htmlFor="post-platform" required>
              <Select
                value={form.platform}
                onValueChange={(v) => update('platform', v as Platform)}
              >
                <SelectTrigger id="post-platform">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PLATFORMS.map((platform) => (
                    <SelectItem key={platform} value={platform}>
                      {PLATFORM_META[platform].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
          </div>

          <FormField
            label="Caption"
            htmlFor="post-caption"
            required
            error={errors.caption}
            hint={`${form.caption.length}/2200 characters`}
          >
            <Textarea
              id="post-caption"
              value={form.caption}
              onChange={(e) => update('caption', e.target.value.slice(0, 2200))}
              placeholder="Write the caption exactly as it should be published…"
              className="min-h-32"
            />
          </FormField>

          <FormField label="Content image" hint="PNG, JPG, WebP or SVG up to 10 MB. Large images are resized automatically.">
            <div className="space-y-2">
              {form.image_url ? (
                <div className="relative overflow-hidden rounded-lg border border-border">
                  <img src={form.image_url} alt="Post creative preview" className="max-h-56 w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => update('image_url', null)}
                    className="absolute right-2 top-2 flex size-7 items-center justify-center rounded-md bg-slate-950/60 text-white transition-colors hover:bg-slate-950/80"
                    aria-label="Remove image"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              ) : (
                <div
                  className={cn(
                    'flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-input bg-muted/40 px-4 py-7 text-center',
                  )}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    handleFile(e.dataTransfer.files?.[0]);
                  }}
                >
                  {preparing ? (
                    <Loader2 className="size-5 animate-spin text-muted-foreground" />
                  ) : (
                    <ImagePlus className="size-5 text-muted-foreground" />
                  )}
                  <p className="text-[13px] text-muted-foreground">
                    {preparing ? 'Optimising your image…' : 'Drag an image here, or'}
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileRef.current?.click()}
                    disabled={preparing}
                  >
                    <Upload /> Choose file
                  </Button>
                  <input
                    ref={fileRef}
                    type="file"
                    accept={ACCEPTED_TYPES.join(',')}
                    className="sr-only"
                    onChange={(e) => handleFile(e.target.files?.[0])}
                  />
                </div>
              )}
              {uploadError && <p className="text-xs font-medium text-destructive">{uploadError}</p>}
              <details className="group">
                <summary className="cursor-pointer text-xs font-medium text-primary marker:content-none">
                  <span className="inline-flex items-center gap-1">
                    <Link2 className="size-3.5" /> Or paste an image URL
                  </span>
                </summary>
                <Input
                  className="mt-2"
                  placeholder="https://example.com/creative.jpg"
                  value={form.image_url?.startsWith('data:') ? '' : (form.image_url ?? '')}
                  onChange={(e) => update('image_url', e.target.value.trim() || null)}
                />
              </details>
            </div>
          </FormField>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Scheduled publishing date" htmlFor="post-scheduled" required error={errors.scheduled_date}>
              <Input
                id="post-scheduled"
                type="date"
                value={form.scheduled_date}
                onChange={(e) => update('scheduled_date', e.target.value)}
              />
            </FormField>
            <FormField label="Review deadline" htmlFor="post-deadline" hint="When the client should decide by.">
              <Input
                id="post-deadline"
                type="datetime-local"
                value={toLocalInput(form.review_deadline)}
                onChange={(e) =>
                  update('review_deadline', e.target.value ? new Date(e.target.value).toISOString() : null)
                }
              />
            </FormField>
          </div>

          <FormField
            label="Additional notes"
            htmlFor="post-notes"
            hint="Internal notes for you — clients do not see these."
          >
            <Textarea
              id="post-notes"
              value={form.notes ?? ''}
              onChange={(e) => update('notes', e.target.value.slice(0, 500))}
              placeholder="e.g. Client prefers the farmers story up front."
              className="min-h-20"
            />
          </FormField>
        </DialogBody>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button variant="outline" onClick={() => void save('draft')} disabled={busy || noClients}>
            {busy ? <Loader2 className="animate-spin" /> : null}
            {post ? 'Save changes' : 'Save as draft'}
          </Button>
          {(!post || post.status === 'draft' || post.status === 'changes_requested') && (
            <Button onClick={() => void save('submit')} disabled={busy || noClients}>
              Submit for approval
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
