# ApprovalFlow 🚀

### Create. Share. Approve. Publish.

ApprovalFlow is a free and open-source client content approval platform built for freelance social media managers and digital marketing agencies.

It simplifies the content approval process by bringing managers and clients together in one organised workspace.

Instead of managing approvals through scattered WhatsApp messages, emails and spreadsheets, ApprovalFlow provides a centralised platform to submit content, collect feedback and track approval statuses.

> **Status: Phase 1 — Frontend.** The complete manager and client interface is built and runs on fictional sample data. Supabase, authentication and storage are intentionally not connected yet (Phase 2).

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

ApprovalFlow aims to eliminate unnecessary communication overhead and help freelancers focus on creating quality content instead of chasing approvals.

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

**Backend (Phase 2)**
- Supabase
- PostgreSQL

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
npm run dev
```

Open the printed URL (defaults to `http://localhost:12000`).

No environment variables are required for Phase 1. To configure the Phase 2 backend later, copy the example file:

```bash
cp .env.example .env
```

### Available scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Start the Vite dev server |
| `npm run build` | Type-check and build for production |
| `npm run preview` | Preview the production build |
| `npm run lint` | Type-check only (`tsc --noEmit`) |
| `npm test` | Run the data-layer test suite |

---

## 🧭 Exploring the prototype

The app opens directly into the sample manager workspace as **Priya Raman** of Northlight Studio. No sign-up is required.

| What to try | Where |
| --- | --- |
| Manager dashboard | `#/app` |
| Post list, filters and create/edit dialog | `#/app/posts` |
| Client list and client detail with review link | `#/app/clients` |
| Month and week calendar | `#/app/calendar` |
| Settings, data export and sample reset | `#/app/settings` |
| Sign-in screens (presentational only) | `#/login`, `#/register` |

### Client review links

Each client has a private, unguessable review token. Sample links:

| Client | Review link |
| --- | --- |
| Fernwood Coffee | `#/review/rvt_fernwood_9c1f7b2a` |
| Bloom & Birch Interiors | `#/review/rvt_bloombirch_4d8e0a13` |
| Ridgeline Fitness | `#/review/rvt_ridgeline_77ab2c90` |
| Solstice Skincare | `#/review/rvt_solstice_1e5b6d44` |

A single post opens at `#/review/<token>/post/<postId>`. Opening a post that belongs to a different client is refused.

Data lives in `localStorage` under `approvalflow.db.v1`. Use **Settings → Reset to sample data** to restore the fictional dataset.

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
│   ├── types.ts                # Domain types mirroring the PostgreSQL schema
│   ├── seed.ts                 # Fictional sample data
│   ├── repository.ts           # Permission-checked read/write operations
│   ├── storage.ts              # localStorage persistence (Phase 2 swap point)
│   ├── store.tsx               # React context store
│   ├── status.ts               # Status and platform metadata
│   └── format.ts               # Date and text helpers
└── pages/                      # Route-level screens
```

**Key design decision:** every read and write goes through `lib/repository.ts`, which takes the acting `managerId` (or review token) explicitly and rejects anything outside that scope. Phase 2 replaces the internals of that module and `storage.ts` with Supabase calls; the UI does not need to change.

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

## 🔒 Security notes for Phase 1

- Review links carry an opaque token; the browser never supplies a client id that the app trusts.
- Decisions are recorded against the client resolved from the token.
- Posts carry a revision number; a decision is rejected if the post changed after the client opened it, and duplicate decisions on the same revision are blocked.
- Archiving a client rotates their token and archives their posts, so old links stop working.
- No credentials, API keys or service-role tokens exist in the frontend. `.env` files are git-ignored.
- All sample people, businesses and email addresses are fictional.

---

## 🗺️ Roadmap

- **Phase 1 (done):** Frontend — dashboard, clients, posts, calendar, client review portal, responsive shell.
- **Phase 2:** Supabase — schema, Row Level Security, authentication, storage, replacing the repository internals.
- **Phase 3:** Wire up post creation, uploads, review access and approval against the real backend.
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
