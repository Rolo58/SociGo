# Soci Go

## Product Requirements Document (PRD)

**Version:** 1.0
**Date:** November 19, 2026
**Product Type:** B2B SaaS Web Application
**Development Priority:** MVP
**Working Tagline:** Create. Share. Approve. Publish.

> **Status note.** This is the product specification, kept in the repository as the source of truth for scope. It describes the system as built: Convex provides the database, server functions and self-hostable infrastructure. The schema in `convex/schema.ts` is authoritative; section 6 documents it.
>
> Section 15 governs: the application must not depend exclusively on a paid third-party service, and must remain self-hostable.

---

# 1. PRODUCT OVERVIEW

## 1.1 Product Description

Soci Go is a web-based client content approval management platform designed for freelance social media managers and small digital marketing agencies.

The platform enables social media managers to create, organise and submit social media content to clients for review and approval.

Clients can preview proposed posts, approve content or request changes through a dedicated review interface.

The system maintains approval statuses and provides a centralised dashboard to help managers organise their content workflow.

## 1.2 Problem Statement

Social media managers frequently coordinate content approvals through WhatsApp, email, spreadsheets and other disconnected platforms.

This creates several problems:

- Approval messages get lost.
- Clients forget to review submitted content.
- Managers struggle to track pending approvals.
- Feedback becomes scattered across conversations.
- Multiple content revisions become difficult to manage.
- There is no centralised view of content approval progress.

Soci Go aims to solve these problems through one centralised application.

## 1.3 Product Vision

To simplify content collaboration between social media managers and their clients by providing an organised, transparent and easy-to-use approval workflow.

---

# 2. TARGET AUDIENCE

## Primary Users

### A. Freelance Social Media Managers

Individuals managing social media accounts for multiple clients.

Their requirements:

- Organise multiple clients.
- Upload proposed social media content.
- Send content for approval.
- Track pending and approved posts.
- Manage client feedback.

### B. Small Digital Marketing Agencies

Small teams managing social media campaigns for businesses.

Their requirements:

- Manage multiple client accounts.
- Organise content submissions.
- Monitor approval progress.
- Maintain a history of client feedback.

## Secondary Users

### C. Clients

Business owners or representatives who review content submitted by social media managers.

Their requirements:

- Access submitted content.
- Preview images and captions.
- Approve posts.
- Request changes.
- View their review history.

---

# 3. USER ROLES AND PERMISSIONS

The application must support two primary user roles.

## 3.1 Manager

The manager is the primary account owner.

Permissions:

- Register and log in.
- Create and manage clients.
- Create social media posts.
- Upload content images.
- Submit posts for client approval.
- View all posts belonging to their account.
- Track approval statuses.
- View client feedback.
- Edit posts and submit revisions.
- Manage the content calendar.

## 3.2 Client

The client reviews content submitted by their assigned manager.

Permissions:

- Access their assigned review links or client portal.
- View submitted posts.
- Preview images and captions.
- Approve posts.
- Request changes.
- Submit feedback.
- View their previous approval decisions.

Restrictions:

- Cannot access other clients' content.
- Cannot access the manager's private dashboard.
- Cannot modify manager account settings.
- Cannot edit the original submitted content.

---

# 4. CORE APPLICATION MODULES

The MVP consists of six modules.

## MODULE 1: USER AUTHENTICATION

Purpose: Securely manage application accounts.

Features:

1. User registration.
2. User login.
3. User logout.
4. Password reset.
5. Session management.
6. Role-based access control.

Requirements:

- Use Convex Auth implemented in `convex/auth.ts`: email and password credentials, with passwords hashed using PBKDF2-SHA256 (210,000 iterations) and a per-user salt.
- Sessions are opaque bearer tokens. The browser holds the raw token; the database stores only its SHA-256 hash, so a database leak does not yield live sessions.
- Sessions expire 14 days after issue and are revoked on logout.
- Failed logins are counted per email address and locked out after repeated failures.
- Support email and password authentication.
- Protect authenticated manager pages.
- Prevent unauthorised access to private information.

## MODULE 2: DASHBOARD

Purpose: Provide a summary of the manager's content workflow.

Dashboard statistics:

- Total Posts.
- Pending Approvals.
- Approved Posts.
- Changes Requested.

Dashboard sections:

1. Statistics cards.
2. Recent posts.
3. Recent activity.
4. Pending approval list.
5. Quick action buttons.

Quick actions:

- Add New Client.
- Create New Post.
- View Calendar.

All dashboard figures must be calculated from actual database records in the production version.

## MODULE 3: CLIENT MANAGEMENT

Purpose: Allow managers to organise their clients.

Features:

1. Add new client.
2. Edit client details.
3. View client information.
4. View client-specific posts.
5. Delete or archive a client.

Client fields:

- Client ID.
- Client Name.
- Business Name.
- Email Address.
- Profile Image (optional).
- Date Created.

Requirements:

- Every client must belong to a manager account.
- Managers must only access their own clients.
- Deleting a client must not accidentally expose or transfer their data.

## MODULE 4: POST MANAGEMENT

Purpose: Allow managers to create and organise proposed social media posts.

Post creation fields:

- Post Title.
- Client.
- Social Media Platform.
- Caption.
- Image Upload.
- Scheduled Publishing Date.
- Review Deadline.
- Additional Notes.

Supported platforms in the MVP:

- Instagram.
- Facebook.
- LinkedIn.

Post actions:

- Create Draft.
- Save Draft.
- Submit for Approval.
- Edit Draft.
- View Post.
- Duplicate Post.
- Archive Post.

Post statuses:

1. Draft.
2. Pending Approval.
3. Approved.
4. Changes Requested.
5. Archived.

Business rules:

- A draft cannot be reviewed by a client.
- Submitting a draft changes its status to Pending Approval.
- A client can approve a pending post.
- A client can request changes to a pending post.
- A manager can edit a post after receiving feedback.
- Resubmitting revised content must return it to Pending Approval.
- Previous feedback and decisions must remain in the history.

## MODULE 5: CLIENT APPROVAL PORTAL

Purpose: Provide a simple interface for clients to review submitted content.

Client review page must display:

- Business or client name.
- Post title.
- Social media platform.
- Content image.
- Caption.
- Scheduled publishing date.
- Review status.

Client actions:

### Approve

When the client selects Approve:

- Save the approval decision.
- Record the decision timestamp.
- Change post status to Approved.
- Record the client's identity.

### Request Changes

When the client selects Request Changes:

- Display a feedback form.
- Require a feedback comment.
- Save the feedback.
- Change post status to Changes Requested.
- Notify the manager through the application's activity feed.

Important:

Clients must only be able to review posts assigned to them.

Review links must use secure access controls. Publicly accessible links must not expose unrelated client data or allow unauthorised approval actions.

## MODULE 6: CONTENT CALENDAR

Purpose: Help managers organise their content schedule.

Features:

- Monthly calendar view.
- Weekly calendar view.
- Display scheduled posts.
- Show post approval status.
- Open post details from calendar entries.

Calendar colours:

- Draft: Grey.
- Pending Approval: Orange.
- Approved: Green.
- Changes Requested: Red.

Calendar entries must be connected to actual post records.

---

# 5. USER WORKFLOWS

## 5.1 Manager Workflow

Step 1: Manager registers an account.

Step 2: Manager logs in.

Step 3: Manager opens the dashboard.

Step 4: Manager creates a client.

Step 5: Manager creates a social media post.

Step 6: Manager uploads an image and enters a caption.

Step 7: Manager submits the post for approval.

Step 8: Client receives access to the review page.

Step 9: Client approves the post or requests changes.

Step 10: Manager views the decision on the dashboard.

Step 11: If changes are requested, the manager revises and resubmits the post.

## 5.2 Client Workflow

Step 1: Client receives a review notification or link.

Step 2: Client opens the review page.

Step 3: Client previews the content.

Step 4: Client selects Approve or Request Changes.

Step 5: If requesting changes, the client provides feedback.

Step 6: The application records the decision.

---

# 6. DATABASE REQUIREMENTS

Use Convex as the database and server runtime. Convex provides an ACID transactional document database with typed schema validation and server-side functions; the schema lives in `convex/schema.ts` and every read and write passes through a server function.

## Table 1: profiles

Fields:

- id (document id, primary key)
- full_name (string)
- email (string)
- business_name (string)
- created_at (string, ISO 8601)

Index: `by_email`.

## Table 1a: credentials

Credentials are split from `profiles` so that reading a profile can never ship a password hash.

Fields:

- id (document id, primary key)
- profile_id (reference to profiles)
- email (string)
- password_hash (string)
- password_salt (string)

Index: `by_email`.

## Table 1b: sessions

Opaque bearer sessions. The browser holds the raw token; the database holds only its hash.

Fields:

- id (document id, primary key)
- token_hash (string)
- profile_id (reference to profiles)
- created_at (number, epoch milliseconds)
- expires_at (number, epoch milliseconds)

Indexes: `by_token_hash`, `by_profile`.

## Table 1c: login_attempts

Failed-login counters, keyed by email so a lockout survives credential checks.

Fields:

- id (document id, primary key)
- email (string)
- failed_count (number)
- locked_until (number, epoch milliseconds)

Index: `by_email`.

## Table 2: clients

Fields:

- id (document id, primary key)
- manager_id (reference to profiles)
- client_name (string)
- business_name (string)
- email (string)
- profile_image_url (string or null)
- review_token (string)
- review_token_expires_at (string or null)
- archived_at (string or null)
- created_at (string, ISO 8601)

Indexes: `by_manager`, `by_review_token`, `by_manager_email`.

## Table 3: posts

Fields:

- id (document id, primary key)
- manager_id (reference to profiles)
- client_id (reference to clients)
- title (string)
- platform (string: `instagram`, `facebook`, `linkedin`)
- caption (string)
- image_url (string or null)
- scheduled_date (string, `YYYY-MM-DD`)
- review_deadline (string or null)
- notes (string or null)
- status (string: `draft`, `pending_approval`, `approved`, `changes_requested`, `archived`)
- revision (number)
- submitted_at (string or null)
- created_at (string, ISO 8601)
- updated_at (string, ISO 8601)

Indexes: `by_manager`, `by_manager_updated`, `by_client`, `by_manager_scheduled`.

## Table 4: feedback

One row per client decision, retained permanently as history.

Fields:

- id (document id, primary key)
- post_id (reference to posts)
- client_id (reference to clients)
- manager_id (reference to profiles)
- decision (string: `approved`, `changes_requested`)
- comments (string)
- post_revision (number)
- created_at (string, ISO 8601)

Indexes: `by_post`, `by_post_revision`.

## Table 5: activity_logs

Fields:

- id (document id, primary key)
- manager_id (reference to profiles)
- post_id (reference to posts, or null)
- client_id (reference to clients, or null)
- activity_type (string)
- description (string)
- created_at (string, ISO 8601)

Index: `by_manager_created`.

## Database requirements

- Use Convex document ids as primary keys.
- Establish relationships through `v.id()` references, validated by the schema.
- Use timestamps for important actions.
- Validate required fields with Convex validators at the schema boundary.
- Apply database constraints: enum-like fields use `v.union` of literals, and nullable fields are explicitly typed as nullable rather than left absent.
- Enforce access control in server functions. Convex has no Row Level Security, so the equivalent guarantee is that no table is readable or writable from the browser: every function calls `requireManager` and re-checks ownership through a manager-scoped index.
- Prevent users from accessing other managers' records. Functions return "not found" rather than "forbidden" for another tenant's record, so ids cannot be probed.
- Validate client access before permitting approval actions.

Client approval identity must be verified, not accepted from an arbitrary client ID submitted by the browser. The acting client is resolved server-side from the review token, and the post must belong to that client.

---

# 7. UI/UX DESIGN REQUIREMENTS

## 7.1 Design Direction

Create a modern, professional B2B SaaS interface.

Design characteristics:

- Minimalist layout.
- Clean white background.
- Soft purple and blue accent colours.
- Rounded cards.
- Subtle shadows.
- Consistent spacing.
- Clear typography.
- Simple icons.
- Responsive layouts.

Avoid:

- Excessive animations.
- Crowded dashboards.
- Unnecessary gradients.
- Too many colours.
- Complicated navigation.

## 7.2 Application Navigation

Sidebar navigation:

1. Dashboard.
2. Posts.
3. Clients.
4. Calendar.
5. Settings.
6. Logout.

The client review portal should use a separate simplified navigation layout.

## 7.3 Responsive Design

The application must work on:

- Desktop computers.
- Laptops.
- Tablets.
- Mobile browsers.

The mobile layout should use a collapsible navigation menu and vertically stacked content cards.

---

# 8. NON-FUNCTIONAL REQUIREMENTS

## Security

- Authenticate with Convex server functions in `convex/auth.ts` (PBKDF2-SHA256, opaque session tokens stored only as hashes).
- Enforce tenant isolation in every server function. Convex has no Row Level Security, so `requireManager` plus manager-scoped indexes provide the equivalent guarantee.
- Enforce manager and client permissions.
- Protect private client information.
- Validate all inputs.
- Do not expose privileged Convex credentials in frontend code. Only `VITE_CONVEX_URL` is public; `CONVEX_SELF_HOSTED_ADMIN_KEY` is server-side only.
- Restrict image access appropriately.
- Verify review permissions on the server side.

## Performance

- Avoid unnecessary database queries.
- Use loading indicators.
- Display helpful error messages.
- Optimise image uploads.
- Provide empty states when there is no data.

## Reliability

- Prevent duplicate approval actions.
- Maintain a history of feedback.
- Ensure status changes are saved correctly.
- Handle failed uploads and network errors gracefully.

## Privacy

- Collect only information required for the service.
- Do not expose client email addresses to unrelated users.
- Provide a process for deleting accounts and associated data.
- Use fictional information during development and testing.

---

# 9. MVP SCOPE

The first release must contain:

1. Manager registration and login.
2. Manager dashboard.
3. Client management.
4. Post creation and editing.
5. Image uploads.
6. Client review portal.
7. Approve and Request Changes functionality.
8. Feedback history.
9. Content calendar.
10. Role-based database security.

## Features explicitly excluded from MVP

Do not build these yet:

- AI caption generation.
- Automatic social media publishing.
- Instagram API integration.
- WhatsApp API integration.
- Payment subscriptions.
- Team collaboration.
- Advanced analytics.
- Automated email campaigns.
- Mobile applications.
- Complex reporting.

These features may be considered after MVP validation.

---

# 10. ACCEPTANCE CRITERIA

The MVP is considered functional only when the following tests pass.

### Authentication

- A manager can register and log in.
- An unauthenticated user cannot access private manager pages.
- A user cannot access another manager's data.

### Client Management

- A manager can create a client.
- A manager can edit client information.
- Client records are associated with the correct manager.

### Post Management

- A manager can create a draft.
- A manager can submit a post for approval.
- The correct client can view the submitted post.
- The manager can edit and resubmit a post.

### Approval

- A client can approve a pending post.
- A client can request changes.
- Feedback is stored in the database.
- The manager sees the updated status.
- An unrelated client cannot approve another client's post.

### Calendar

- Scheduled posts appear on the calendar.
- Dates and statuses are accurate.
- Opening a calendar item displays the correct post.

### Responsive Design

- All main pages work on desktop and mobile browsers.
- No important buttons or content are inaccessible on smaller screens.

---

# 11. DEVELOPMENT ROADMAP

## Phase 1: Frontend

- Build dashboard.
- Build sidebar.
- Build post management interface.
- Build client management interface.
- Build content calendar.
- Build client review page.

## Phase 2: Backend

- Configure Convex.
- Define the schema in `convex/schema.ts`.
- Configure authentication.
- Enforce tenant isolation in server functions.
- Connect frontend to the backend.

## Phase 3: Functionality

- Implement post creation.
- Implement image uploads.
- Implement client review access.
- Implement approval functionality.
- Implement feedback history.
- Implement status updates.

## Phase 4: Testing

- Test manager permissions.
- Test client permissions.
- Test post creation.
- Test approval workflow.
- Test mobile responsiveness.
- Fix errors.

## Phase 5: Validation

- Recruit freelance social media managers.
- Demonstrate the application.
- Collect feedback.
- Measure repeat usage.
- Test willingness to pay.

---

# 12. SUCCESS METRICS

Initial validation targets:

- 10 potential customers interviewed.
- 3 prototype testers.
- 2 repeat users.
- At least 1 potential paying customer.

Product usage metrics:

- Number of registered managers.
- Number of active clients.
- Number of posts submitted.
- Percentage of posts approved.
- Average time between submission and decision.
- Number of revision requests.
- Weekly active managers.

These targets are experimental goals, not guaranteed commercial outcomes.

---

# 13. PRODUCT CONSTRAINTS

- Initial development budget: ₹0.
- Use free-tier services wherever possible.
- Use AI-assisted development.
- Avoid paid third-party APIs.
- Prioritise a functional MVP.
- Do not build features outside the defined MVP without justification.
- Use sample data during initial development.
- Do not sacrifice security for convenience.

---

# 14. FINAL PRODUCT DEFINITION

Soci Go is a responsive web-based SaaS platform that simplifies the social media content approval process between freelance social media managers and their clients.

Its primary value proposition is:

"Stop chasing approvals across multiple conversations. Manage every client approval in one organised workspace."

The first version should focus on delivering one excellent workflow:

Create content → Submit for approval → Receive feedback → Approve or revise → Track status.

All development decisions should prioritise this workflow.

---

# 15. OPEN-SOURCE AND FREE PRODUCT REQUIREMENTS

## Product Philosophy

Soci Go must be developed as a free and open-source web application.

The core application must remain accessible without mandatory subscription payments.

## Open-Source Requirements

- Publish the complete application source code in a public GitHub repository.
- Use the MIT License.
- Allow users to inspect, modify, distribute and self-host the application.
- Include installation and deployment documentation.
- Include environment variable examples.
- Never commit API keys, passwords or private credentials.
- Document third-party dependencies and their licences.

## Free Usage Requirements

- No mandatory subscriptions.
- No paid feature restrictions.
- No artificial limitations on core approval workflows.
- No payment gateway integration.
- Users must be able to self-host the application using supported open-source software.

## Technology Requirements

Frontend:

- React
- TypeScript
- Tailwind CSS
- shadcn/ui

Backend:

- Convex as the database and server runtime (Apache-2.0).
- Convex Cloud's free tier as a convenient hosted option, or `convex-local-backend` for a fully self-hosted deployment.
- Secure database access controls, enforced in server functions rather than in the browser.
- Storage abstraction that can support self-hosted alternatives.

## Deployment

Provide documentation for:

- Local development.
- Self-hosted deployment (Convex local backend).
- Convex configuration.
- Database setup.
- Environment configuration.

## Important

The application must not depend exclusively on a paid third-party service.

Hosted free-tier services may be offered as convenient deployment options, but the application should remain self-hostable.

All core features must remain available without paid subscriptions.
