import { PLATFORMS } from './status';
import type { ClientInput, PostInput } from './types';

/**
 * Input rules shared by the forms and the Convex mutations.
 * The server always re-runs these: the client copy exists only to show errors early.
 */

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const LIMITS = {
  clientName: { min: 2, max: 80 },
  businessName: { min: 2, max: 120 },
  postTitle: { min: 3, max: 120 },
  caption: { max: 2200 },
  notes: { max: 500 },
  feedback: { min: 5, max: 1000 },
  password: { min: 8, max: 200 },
  fullName: { min: 2, max: 80 },
} as const;

export type FieldErrors = Record<string, string>;

export interface ValidatedClient extends ClientInput {}

export interface ValidatedPost extends PostInput {}

export function validateClientInput(input: ClientInput): { ok: true; data: ValidatedClient } | { ok: false; error: string } {
  const client_name = input.client_name.trim();
  const business_name = input.business_name.trim();
  const email = input.email.trim().toLowerCase();

  if (client_name.length < LIMITS.clientName.min) return { ok: false, error: 'Client name must be at least 2 characters.' };
  if (client_name.length > LIMITS.clientName.max) return { ok: false, error: 'Client name must be 80 characters or fewer.' };
  if (business_name.length < LIMITS.businessName.min) return { ok: false, error: 'Business name must be at least 2 characters.' };
  if (business_name.length > LIMITS.businessName.max) return { ok: false, error: 'Business name must be 120 characters or fewer.' };
  if (!EMAIL_PATTERN.test(email)) return { ok: false, error: 'Enter a valid email address.' };

  return { ok: true, data: { client_name, business_name, email, profile_image_url: input.profile_image_url ?? null } };
}

export function validatePostInput(input: PostInput): { ok: true; data: ValidatedPost } | { ok: false; error: string } {
  const title = input.title.trim();
  const caption = input.caption.trim();

  if (title.length < LIMITS.postTitle.min) return { ok: false, error: 'Post title must be at least 3 characters.' };
  if (title.length > LIMITS.postTitle.max) return { ok: false, error: 'Post title must be 120 characters or fewer.' };
  if (!PLATFORMS.includes(input.platform)) return { ok: false, error: 'Choose a supported platform.' };
  if (!caption) return { ok: false, error: 'Caption is required.' };
  if (caption.length > LIMITS.caption.max) return { ok: false, error: 'Caption must be 2200 characters or fewer.' };

  if (!DATE_PATTERN.test(input.scheduled_date) || Number.isNaN(Date.parse(input.scheduled_date))) {
    return { ok: false, error: 'Choose a valid scheduled publishing date.' };
  }

  const deadline = input.review_deadline?.trim() ? input.review_deadline : null;
  if (deadline && Number.isNaN(Date.parse(deadline))) return { ok: false, error: 'Choose a valid review deadline.' };

  const notes = input.notes?.trim() ? input.notes.trim() : null;
  if (notes && notes.length > LIMITS.notes.max) {
    return { ok: false, error: 'Additional notes must be 500 characters or fewer.' };
  }

  return {
    ok: true,
    data: {
      title,
      client_id: input.client_id,
      platform: input.platform,
      caption,
      image_url: input.image_url ?? null,
      scheduled_date: input.scheduled_date,
      review_deadline: deadline,
      notes,
    },
  };
}

export function validateFeedback(decision: 'approved' | 'changes_requested', comments: string) {
  const trimmed = comments.trim();
  if (decision === 'changes_requested' && trimmed.length < LIMITS.feedback.min) {
    return { ok: false as const, error: 'Please tell the manager what needs to change (at least 5 characters).' };
  }
  if (trimmed.length > LIMITS.feedback.max) {
    return { ok: false as const, error: 'Feedback must be 1000 characters or fewer.' };
  }
  return { ok: true as const, data: trimmed };
}
