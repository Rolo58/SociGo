# AGENTS.md

Repository knowledge for AI agents working on ApprovalFlow.

## What this project is

ApprovalFlow (repo directory `SociGo`) is a client content approval platform for freelance social media managers and small agencies. The product spec is the ApprovalFlow PRD; deliver it in phases and do not build features the PRD lists as out of scope.

## Current phase

Phase 1 (frontend only) is complete. Supabase, authentication and storage are deliberately not connected. Do not add them without an explicit request for Phase 2.

## Commands

```bash
npm run dev      # Vite dev server on 0.0.0.0:12000
npm run build    # tsc -b && vite build
npm run lint     # tsc --noEmit
npm test         # vitest run (src/lib/repository.test.ts)
```

## Architecture rules

- All data access goes through `src/lib/repository.ts`. Every function takes the acting `managerId` or a client `review_token` as its first data argument and returns `Result<T>`. Never read the raw database in a component.
- `src/lib/storage.ts` is the only module that touches `localStorage`. Phase 2 swaps its internals plus the repository internals for Supabase; the UI must not need changes.
- `src/lib/store.tsx` wraps the repository in React context and persists whatever database the repository returns. Add new mutations as repository functions first, then expose them through the store.
- `src/lib/types.ts` mirrors the PRD PostgreSQL schema. Keep field names snake_case so Phase 2 maps one-to-one.
- Status colours and labels live in `src/lib/status.ts`; do not hardcode them in pages.
- Pages are route-level and lazy-loaded in `src/app.tsx`. Keep `DashboardPage` eager as the landing route.

## Security invariants (covered by tests)

- Client identity for a decision is derived from the review token, never from a client id supplied by the browser.
- A client can only see posts belonging to the client that owns the token; drafts and archived posts never appear in the portal.
- Posts carry a `revision`; decisions include `expectedRevision` and are rejected when stale or duplicated.
- Archiving a client rotates their review token and archives their posts.
- Manager-scoped lookups return "not found" rather than "forbidden" for other tenants' records.

Run `npm test` after touching `repository.ts`. The suite encodes the rules above.

## Frontend conventions

- Tailwind with design tokens from `src/index.css`; soft purple/blue accents, rounded cards, subtle shadows. No gradients, no heavy animation.
- UI primitives live in `src/components/ui/` (shadcn/ui style, vendored). Compose rather than restyle ad hoc.
- Use `FormField` for labelled inputs with error text, and `EmptyState` for zero-data views.
- Uploaded creatives pass through `src/lib/image.ts` (`prepareImage`), which downsizes to 1200px and re-encodes as JPEG. Phase 1 stores images as data URLs, so skipping this fills the localStorage quota.

## Conventions

- Fictional sample data only; never commit real client information or credentials.
- `.env` is git-ignored; `.env.example` documents the Phase 2 variables.
- Licence is MIT. New dependencies must be open-source and permissively licensed; add them to the README licence table.
