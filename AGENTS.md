# AGENTS.md

Repository knowledge for AI agents working on Soci Go.

## What this project is

Soci Go (repo directory `SociGo`) is a client content approval platform for freelance social media managers and small agencies. The product spec is `docs/PRD.md`; deliver it in phases and do not build features the PRD lists as out of scope. Read it before starting work on a new module.

## Current phase

Phase 2 (backend) is complete: the app runs on Convex with server-side authentication, tenant isolation and the full approval workflow. Phase 3 (image uploads to Convex file storage) is next. Creatives currently use bundled artwork in `public/samples/`.

The backend is Convex: `convex/schema.ts` is the authoritative data model and `docs/PRD.md` section 6 documents it. Do not introduce Supabase or another database without being asked.

## Commands

```bash
npx convex dev   # push backend functions, keep running during development
npm run dev      # Vite dev server on 0.0.0.0:12000
npm run build    # tsc -b && vite build
npm run lint     # tsc --noEmit
npm test         # vitest run (backend + repository suites)

npx convex run seed:seedDemoWorkspace   # load the fictional demo workspace
npx convex run seed:resetAll            # wipe all data including accounts
```

Demo login: `priya@northlight.studio` / `socigo-demo`.

## Architecture rules

- **The browser never sends an identity.** Components send only the opaque session token (or a review token). `convex/auth.ts` resolves the acting manager on the server. Never add a mutation that trusts a manager id, client id or approval identity from the client.
- **Every Convex function re-checks ownership** via `requireManager` plus a manager-scoped index. Return "not found" rather than "forbidden" for other tenants' records.
- `src/lib/store.tsx` wraps Convex queries in React context. Scoped queries must stay gated behind a confirmed `me` result, otherwise an expired token throws and blanks the page.
- `src/lib/types.ts` mirrors the Convex schema. Keep field names snake_case so serializers stay one-to-one.
- Status colours and labels live in `src/lib/status.ts`; do not hardcode them in pages.
- Pages are route-level and lazy-loaded in `src/app.tsx`. Keep `DashboardPage` eager as the landing route.
- `src/components/require-auth.tsx` guards private routes; add new private routes inside it.

## Security invariants (covered by tests)

- Passwords use PBKDF2-SHA256 with a per-user salt. Session tokens are random; only their SHA-256 hash is stored.
- Client identity for a decision is derived from the review token, never from a client id supplied by the browser.
- A client can only see posts belonging to the client that owns the token; drafts and archived posts never appear in the portal.
- Posts carry a `revision`; decisions include the expected revision and are rejected when stale or duplicated.
- Archiving a client rotates their review token and archives their posts.
- Only `VITE_CONVEX_URL` is public. `CONVEX_SELF_HOSTED_ADMIN_KEY` is server-side only and must never reach the browser.

Run `npm test` after touching `convex/`. The suite encodes the rules above.

## Frontend conventions

- Tailwind with design tokens from `src/index.css`; soft purple/blue accents, rounded cards, subtle shadows. No gradients, no heavy animation.
- UI primitives live in `src/components/ui/` (shadcn/ui style, vendored). Compose rather than restyle ad hoc.
- Use `FormField` for labelled inputs with error text, and `EmptyState` for zero-data views.
- Layouts are mobile-first: single column, then `sm:`/`lg:`/`xl:` breakpoints. The sidebar collapses into a drawer below `lg`. Tables use stacked cards on small screens rather than horizontal scroll.

## Conventions

- Fictional sample data only; never commit real client information or credentials.
- `.env.local` is git-ignored; `.env.example` documents the required variables.
- Licence is MIT. New dependencies must be open-source and permissively licensed; add them to the README licence table.
