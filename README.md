# Soci Go 🚀

### Create. Share. Approve. Publish.

Soci Go is a free and open-source client content approval platform built for freelance social media managers and digital marketing agencies.

It simplifies the content approval process by bringing managers and clients together in one organised workspace.

Instead of managing approvals through scattered WhatsApp messages, emails and spreadsheets, Soci Go provides a centralised platform to submit content, collect feedback and track approval statuses.

> **Status: Phase 2 — Backend connected.** The full manager and client interface now runs on a real Convex backend: server-side authentication, tenant-scoped data, the approval workflow, feedback history and account management. See [Backend](#-backend-convex) for setup. Sample data is fictional and can be seeded with one command.

---

## ✨ Features

- **Dashboard:** View total posts, pending approvals, approved posts and requested revisions, with recent activity and quick actions.
- **Client Management:** Create and organise multiple client workspaces, each with its own private review link.
- **Post Management:** Create, edit, duplicate, submit and archive social media content.
- **Content Approval:** Clients approve posts or request changes from a dedicated, link-based review portal.
- **Feedback Management:** Every decision is kept in a revision-by-revision history.
- **Content Calendar:** Monthly and weekly views with colour-coded approval statuses.
- **Responsive Design:** Works on desktop, tablet and mobile browsers.
- **Secure by Design:** Tokenised review links, tenant-scoped data access, and stale/duplicate decision protection.

---

## 🎯 Our Mission

Our mission is to make social media content collaboration simpler, faster and more organised.

Soci Go aims to eliminate unnecessary communication overhead and help freelancers focus on creating quality content instead of chasing approvals.

---

## 🛠️ Tech Stack

**Frontend**
- React 18
- TypeScript
- Tailwind CSS
- shadcn/ui (Radix primitives)
- Vite
- React Router
- date-fns

**Backend**
- Convex (self-hostable, Apache-2.0)
- Convex built-in document database with schema validation and indexes
- Server-side sessions using hashed opaque tokens

---

## 👥 Who Is This For?

- Freelance social media managers
- Digital marketing agencies
- Content creators
- Social media consultants
- Businesses managing multiple social media accounts

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18 or newer
- npm

### Installation

```bash
git clone YOUR_REPOSITORY_URL
cd SociGo
npm install
```

Soci Go needs a Convex deployment. The fastest option is Convex Cloud's free tier:

```bash
npx convex dev --configure new --dev-deployment cloud
```

That command creates a deployment, writes `VITE_CONVEX_URL` for you, and pushes the backend functions in `convex/`. Leave it running while you develop — it re-pushes functions on save.

Then, in a second terminal, start the frontend:

```bash
npm run dev
```

Open the printed URL (defaults to `http://localhost:12000`). Register a manager account, or load the demo workspace:

```bash
npx convex run seed:seedDemoWorkspace
```

The demo workspace signs in as `priya@northlight.studio` / `socigo-demo`.

To point at a self-hosted backend instead, copy the example environment file and fill it in:

```bash
cp .env.example .env.local
```

### Available scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Start the Vite dev server (needs `npx convex dev` running) |
| `npm run build` | Type-check and build for production |
| `npm run preview` | Preview the production build |
| `npm run lint` | Type-check only (`tsc --noEmit`) |
| `npm test` | Run backend and data-layer tests |

---

## 🧭 Exploring the app

Sign in at `#/login` with the seeded demo manager, `priya@northlight.studio` / `socigo-demo`, or register a fresh workspace at `#/register`.

| What to try | Where |
| --- | --- |
| Manager dashboard with live figures and activity | `#/app` |
| Post list, filters and create/edit dialog | `#/app/posts` |
| Client list and client detail with review link | `#/app/clients` |
| Month and week calendar | `#/app/calendar` |
| Profile, password, export and account deletion | `#/app/settings` |
| Sign in, register and password reset | `#/login`, `#/register`, `#/forgot-password` |

### Client review links

Each client has a private, unguessable review token. Sample links:

| Client | Review link |
| --- | --- |
| Fernwood Coffee | `#/review/rvt_fernwood_9c1f7b2a` |
| Bloom & Birch Interiors | `#/review/rvt_bloombirch_4d8e0a13` |
| Ridgeline Fitness | `#/review/rvt_ridgeline_77ab2c90` |
| Solstice Skincare | `#/review/rvt_solstice_1e5b6d44` |

A single post opens at `#/review/<token>/post/<postId>`. The server resolves the token, so opening a post that belongs to a different client is refused. Clients never hold an account and never see the manager dashboard.

All data lives in the Convex deployment. Reload the demo workspace at any time:

```bash
npx convex run seed:resetAll
npx convex run seed:seedDemoWorkspace
```

---

## 🏗️ Architecture

```
src/
├── app.tsx                     # Routes and providers
├── main.tsx                    # Entry point
├── index.css                   # Design tokens and base styles
├── components/
│   ├── ui/                     # shadcn/ui primitives (button, card, dialog, select…)
│   ├── layout/app-shell.tsx    # Sidebar, mobile drawer, top bar
│   ├── posts/                  # Post card and create/edit dialog
│   ├── clients/                # Client create/edit dialog
│   └── …                       # Shared status badge, empty state, toaster, form field
├── lib/
│   ├── types.ts                # Domain types shared with the backend
│   ├── convex.ts               # Convex client instance
│   ├── session.ts              # Opaque session token in localStorage
│   ├── store.tsx               # React context store over Convex queries
│   ├── repository.ts           # Derived read helpers (stats, filters)
│   ├── status.ts               # Status and platform metadata
│   └── format.ts               # Date and text helpers
└── pages/                      # Route-level screens

convex/
├── schema.ts                   # Tables, indexes and field validation
├── auth.ts                     # Session tokens, password hashing, guards
├── accounts.ts                 # Register, login, profile, password, deletion
├── clients.ts                  # Client CRUD and review-link tokens
├── posts.ts                    # Post CRUD, submission, revisions
├── review.ts                   # Public review portal queries and decisions
├── dashboard.ts                # Live figures, activity feed
├── seed.ts                     # Fictional demo workspace
└── shared.ts                   # Serializers, validation, activity logging

tests/
└── workspace.test.ts           # Backend behaviour against the real runtime
```

**Key design decision:** the browser never sends a manager id, a client id or an approval identity. It sends only an opaque session token, and every query and mutation resolves the acting manager on the server. Review links work the same way: the token is exchanged for exactly one client's scope, so a link cannot reach another client's content.

### Roles and permissions implemented

| Capability | Manager | Client |
| --- | --- | --- |
| Access the dashboard | Yes | No |
| Create, edit, archive clients | Yes | No |
| Create, edit, duplicate, archive posts | Yes | No |
| Submit and resubmit for approval | Yes | No |
| View submitted posts | Yes | Yes (own client only) |
| Approve / request changes | No | Yes (own client only) |
| View feedback history | Yes | Yes (own client only) |
| See other managers' data | No | No |

---

## 🧪 Testing

```bash
npm test
```

The suite covers the security-critical rules rather than UI rendering:

- Cross-tenant isolation (other managers' clients and posts are unreachable)
- Client ownership on create/update/archive
- Draft invisibility to clients, and submission visibility only to the assigned client
- Revision bumping on resubmit, with feedback history preserved
- Token validation: unknown, empty, expired, rotated, and archived-client links
- Cross-client post access via a valid but unrelated token
- Required feedback comments and duplicate/stale decision rejection
- Dashboard figures derived from real records

---

## 🔒 Security notes

- **Authentication is server-side.** Passwords are hashed with PBKDF2-SHA256 and a per-user salt. Sessions are random opaque tokens; only their SHA-256 hash is stored, so a database leak does not hand out live sessions.
- **The browser is never trusted for identity.** It sends a session token only. Manager ids, client ids and approval identities are all resolved on the server, so a tampered request cannot act as another user.
- **Every query and mutation is tenant-scoped.** Records are read through manager-scoped indexes and ownership is re-checked before any write.
- **Review links carry an opaque token**, exchanged server-side for exactly one client's scope. A valid link for one client cannot read or approve another client's post.
- **Stale and duplicate decisions are rejected.** Posts carry a revision number; a decision made against an older revision, or a second decision on the same revision, fails.
- **Archiving a client rotates their token** and archives their posts, so old links stop working.
- **No admin credentials reach the browser.** Only `VITE_CONVEX_URL` is public. `.env.local` is git-ignored and the deploy key is documented as server-side only.
- All sample people, businesses and email addresses are fictional.

---

## ☁️ Backend (Convex)

Soci Go uses [Convex](https://www.convex.dev/), which is Apache-2.0 licensed and can run entirely on your own machine. Nothing in the app requires a paid service.

### Option A — Convex Cloud (free tier)

```bash
npx convex dev --configure new --dev-deployment cloud
```

### Option B — Self-hosted

Run the open-source backend binary, then point the CLI at it:

```bash
# 1. Generate a deploy key (format: <instance-name>|<instance-secret>)
convex-local-backend keygen admin-key --instance-name soci-go --instance-secret <your-secret>

# 2. Start the backend
convex-local-backend \
  --instance-name soci-go \
  --instance-secret <your-secret> \
  --port 3210

# 3. In .env.local
CONVEX_SELF_HOSTED_URL=http://127.0.0.1:3210
CONVEX_SELF_HOSTED_ADMIN_KEY=soci-go|<your-secret>
VITE_CONVEX_URL=http://127.0.0.1:3210

# 4. Push functions
npx convex dev --once
```

Deploy the built frontend (`npm run build` → `dist/`) to any static host. The browser needs only `VITE_CONVEX_URL`.

### Schema and migrations

The schema is code, in `convex/schema.ts`. Pushing functions applies it. There are no separate migration files: indexes and validators ship with the functions that use them, and Convex validates every write against the schema.

### Seed the demo workspace

```bash
npx convex run seed:seedDemoWorkspace   # create the fictional workspace
npx convex run seed:resetAll            # wipe everything, including accounts
```

---

## 🗺️ Roadmap

- **Phase 1 (done):** Frontend — dashboard, clients, posts, calendar, client review portal, responsive shell.
- **Phase 2 (done):** Backend — Convex schema, server-side authentication, tenant isolation, approval workflow, feedback history, account management.
- **Phase 3 (next):** Image uploads to Convex file storage (creatives currently use bundled sample artwork).
- **Phase 4:** Permission, workflow and responsive testing.
- **Phase 5:** Validation with freelance social media managers.

### Explicitly out of scope for the MVP

AI caption generation, automatic publishing, Instagram/WhatsApp API integrations, payments and subscriptions, team collaboration, advanced analytics, email campaigns, native mobile apps, and complex reporting.

---

## 📄 Licence

MIT — see [LICENSE](LICENSE).

### Third-party dependencies

| Package | Licence |
| --- | --- |
| React, React DOM | MIT |
| React Router | MIT |
| Tailwind CSS, tailwindcss-animate | MIT |
| shadcn/ui components (vendored in `src/components/ui`) | MIT |
| Radix UI primitives | MIT |
| lucide-react | ISC |
| class-variance-authority | Apache-2.0 |
| clsx | MIT |
| tailwind-merge | MIT |
| date-fns | MIT |
| Vite, Vitest | MIT |
| TypeScript | Apache-2.0 |
| Convex (`convex`, `convex-local-backend`) | Apache-2.0 |
