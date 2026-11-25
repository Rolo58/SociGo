# Soci Go

## Product Requirements Document (PRD)

**Version:** 1.0
**Date:** November 19, 2026
**Product Type:** B2B SaaS Web Application
**Development Priority:** MVP
**Working Tagline:** Create. Share. Approve. Publish.

> **Status note.** This is the original product specification, kept in the repository as the source of truth for scope. One deviation exists in the current implementation, recorded here so the spec and the code do not silently diverge:
>
> **Backend.** Section 6 specifies Supabase. The implementation uses Convex, which satisfies the same security and self-hosting requirements (server-side authentication, tenant isolation, no service-role credentials in the browser) while remaining free to self-host. See `AGENTS.md`.
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

- Use Supabase Authentication.
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

Use Supabase PostgreSQL as the initial database.

## Table 1: profiles

Fields:

- id (UUID, primary key, references authentication user)
- full_name (text)
- email (text)
- created_at (timestamp)

## Table 2: clients

Fields:

- id (UUID, primary key)
- manager_id (UUID, references profiles)
- client_name (text)
- business_name (text)
- email (text)
- created_at (timestamp)

## Table 3: posts

Fields:

- id (UUID, primary key)
- manager_id (UUID)
- client_id (UUID)
- title (text)
- platform (text)
- caption (text)
- image_url (text)
- scheduled_date (date)
- review_deadline (timestamp)
- status (text)
- created_at (timestamp)
- updated_at (timestamp)

## Table 4: feedback

Fields:

- id (UUID, primary key)
- post_id (UUID)
- client_id (UUID)
- decision (text)
- comments (text)
- created_at (timestamp)

## Table 5: activity_logs

Fields:

- id (UUID, primary key)
- manager_id (UUID)
- post_id (UUID)
- activity_type (text)
- description (text)
- created_at (timestamp)

Database requirements:

- Use UUID identifiers.
- Establish foreign-key relationships.
- Use timestamps for important actions.
- Validate required fields.
- Apply database constraints.
- Enable Row Level Security (RLS).
- Prevent users from accessing other managers' records.
- Validate client access before permitting approval actions.

Client approval identity must be verified, not accepted from an arbitrary client ID submitted by the browser.

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

- Use Supabase Authentication.
- Enable Row Level Security.
- Enforce manager and client permissions.
- Protect private client information.
- Validate all inputs.
- Do not expose database service-role credentials in frontend code.
- Restrict image access appropriately.
- Verify review permissions on the server/database side.

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

- Configure Supabase.
- Create database tables.
- Configure authentication.
- Implement Row Level Security.
- Connect frontend to database.

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

- Supabase-compatible PostgreSQL.
- Supabase Authentication as an optional hosted authentication provider.
- Secure database access controls.
- Storage abstraction that can support self-hosted alternatives.

## Deployment

Provide documentation for:

- Local development.
- Self-hosted deployment.
- Supabase configuration.
- Database setup.
- Environment configuration.

## Important

The application must not depend exclusively on a paid third-party service.

Hosted free-tier services may be offered as convenient deployment options, but the application should remain self-hostable.

All core features must remain available without paid subscriptions.
