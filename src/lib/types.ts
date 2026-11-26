/**
 * Domain types mirror the Convex schema in `convex/schema.ts`, documented in the Soci Go
 * PRD (section 6). Field names match the schema so serializers stay one-to-one.
 */

export type PostStatus = 'draft' | 'pending_approval' | 'approved' | 'changes_requested' | 'archived';

export type Platform = 'instagram' | 'facebook' | 'linkedin';

export type Decision = 'approved' | 'changes_requested';

export type ActivityType =
  | 'client_created'
  | 'client_updated'
  | 'post_created'
  | 'post_updated'
  | 'post_submitted'
  | 'post_approved'
  | 'changes_requested'
  | 'post_duplicated'
  | 'post_archived'
  | 'post_restored';

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  business_name: string;
  created_at: string;
}

export interface Client {
  id: string;
  manager_id: string;
  client_name: string;
  business_name: string;
  email: string;
  profile_image_url: string | null;
  /** Opaque, unguessable portal token. Resolved server-side in Phase 2; never a client id. */
  review_token: string;
  review_token_expires_at: string | null;
  archived_at: string | null;
  created_at: string;
}

export interface Post {
  id: string;
  manager_id: string;
  client_id: string;
  title: string;
  platform: Platform;
  caption: string;
  image_url: string | null;
  scheduled_date: string;
  review_deadline: string | null;
  notes: string | null;
  status: PostStatus;
  revision: number;
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Feedback {
  id: string;
  post_id: string;
  client_id: string;
  decision: Decision;
  comments: string;
  /** Revision of the post the client was reviewing when they decided. */
  post_revision: number;
  created_at: string;
}

export interface ActivityLog {
  id: string;
  manager_id: string;
  post_id: string | null;
  client_id: string | null;
  activity_type: ActivityType;
  description: string;
  created_at: string;
}

export interface Database {
  profiles: Profile[];
  clients: Client[];
  posts: Post[];
  feedback: Feedback[];
  activity_logs: ActivityLog[];
}

/** Input accepted by the post create/edit form. */
export interface PostInput {
  title: string;
  client_id: string;
  platform: Platform;
  caption: string;
  image_url: string | null;
  scheduled_date: string;
  review_deadline: string | null;
  notes: string | null;
}

export interface ClientInput {
  client_name: string;
  business_name: string;
  email: string;
  profile_image_url: string | null;
}
