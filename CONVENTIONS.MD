# Lectern — Code Organization Conventions

Purpose-first, not feature-first: one fixed top-level folder per *kind* of
code (actions, components, stores, etc.), each divided internally by
*feature label* (auth, organization, session, ...). This is a deliberate
choice over a `features/<name>/` structure — pick a purpose folder first,
then a feature subfolder inside it, always in that order.

Applies to every app (`apps/marketing`, `apps/workspace`, `apps/org-console`,
`apps/superadmin`) identically, and to `packages/*` once a package outgrows
a handful of flat files.

---

## 1. Canonical feature labels

Every feature subfolder, in every purpose folder, in every app, uses one of
these exact spellings — never an abbreviation, never a synonym. Traceable
directly to `lectern-feature-flows.md`'s own section headers, so "which
folder does this belong in" always has one unambiguous answer.

| Feature label | Feature-flows.md section | Covers |
|---|---|---|
| `auth` | AUTH | signup, sign-in, OTP, OAuth, confirmation, password reset, sign-out, account deletion |
| `organization` | ORG | org settings, members, invites, join code, admin handoff |
| `session` | SESSION | personal/team sessions, live conversation, floor control |
| `library` | LIB | personal/shared library items, notes |
| `board` | BOARD | request board |
| `notification` | NOTIF | transactional/announcement email, in-app bell |
| `drive` | DRIVE | Google Drive import |
| `billing` | BILLING | plans, Stripe |
| `admin` | ADMIN | superadmin console |
| `legal` | LEGAL | disclaimers, compliance copy |
| `shared` | — (not a doc section) | genuinely cross-feature code used by 2+ labels above, within one app. If it's used across *apps*, it belongs in `packages/ui` or `packages/types` instead, not here. |

Never invent a new label without adding it to this table first. Never use
`org`, `notif`, `lib`, or any other shortened form — same "spell it out"
rule the SQL naming convention already enforces, now extended to
TypeScript folder names.

---

## 2. Top-level purpose folders (inside every `apps/<name>/src/`)

```
src/
  app/          Next.js routing ONLY — page.tsx, layout.tsx, route.ts.
                No components, no helpers, no logic colocated here.
                Route groups (auth) group pages that share a layout
                without affecting the URL. Plain folders (auth/confirm)
                are real URL segments. `page.tsx` and `layout.tsx` 
                are always Server Components — never put
                `"use client"` on one. Any interactivity (state, event handlers, browser
                APIs) belongs in a Client Component under `components/<feature>/`,
                imported into the page. A page that needs URL data (`searchParams`) reads
                it server-side and passes it down as a prop, rather than the Client
                Component calling `useSearchParams()` itself.
  lib/
    actions/    "use server" Server Actions — default home for anything
                that talks to Supabase, reads and writes alike. Default
                to putting a new data function here unless it genuinely
                can't be a Server Action (see supabase/ below).
    schemas/    Zod schemas.
    utils/      Pure helper functions — no React, no Supabase calls,
                no side effects. The one deliberate catch-all category.
    constants/  Fixed values / config maps (reserved — none yet).
    supabase/   Reserved exception, not a default. Only for functions
                that CANNOT be Server Actions — currently that's just
                code that must run inside Next.js Middleware (Edge
                runtime). Likely stays empty at the app level for a
                long time; the one real instance today is the shared
                packages/supabase/middleware.ts, which lives in the
                package, not here.
  components/   React components — anything with JSX that isn't a page.
  hooks/        Custom React hooks.
  stores/       Zustand stores (client-side state).
  types/        App-local TS types, and ambient .d.ts module shims.
```

Every one of lib/actions/, lib/schemas/, lib/supabase/, stores/, and types/ 
is divided by feature label as the next path segment. components/, hooks/, 
and lib/utils/ are divided by feature label too — just without a suffix 
requirement on the filename (see §3).

`components/`, `hooks/`, and `lib/utils/` are divided by feature label too
— just without a suffix requirement on the filename (see §3).

---

## 3. File naming

- **Always kebab-case filenames.** No exceptions, including component files
  (`google-sign-in-button.tsx`, not `GoogleSignInButton.tsx`) — the
  exported symbol inside is PascalCase per normal React convention, only
  the filename is kebab-case.
- **Every file outside `components/`, `hooks/`, and `lib/utils/` carries an
  explicit purpose suffix**, so its role is identifiable by filename alone
  — in a fuzzy-file-switcher, in `grep`, in a PR diff list — independent of
  which folder it's sitting in:

  | Purpose | Suffix | Example |
  |---|---|---|
  | Server actions (reads and writes both) | `.actions.ts` (plural — one file holds every action for that feature by default) | `actions/auth/auth.actions.ts` |
  | Zod schemas | `.schemas.ts` (plural, same "one file per feature by default" rule) | `lib/schemas/auth/auth.schemas.ts` |
  | Zustand stores | `.store.ts` (one file per distinct piece of state) | `stores/session/floor-control.store.ts` |
  | Local types | `.types.ts` | `types/organization/organization.types.ts` |
  | Route handler | `route.ts` (framework-mandated, not our choice) | `app/auth/confirm/route.ts` |
  | `supabase/` exception, if ever used | `.query.ts` for a read, `.mutation.ts` for a write | `supabase/auth/some-middleware-only-check.query.ts` |

- **`lib/utils/`, `components/`, `hooks/` — no suffix.** A util is just a
  function; its folder (`lib/utils/<feature>/`) already says everything the
  filename needs to. Components are self-evident by `.tsx` + PascalCase
  export. Hooks use the standard React `use-` **prefix**, not a suffix —
  the one deliberate exception, because overriding an already-universal
  convention would be more confusing than following it:
  `hooks/organization/use-organization-role.ts` exporting `useOrganizationRole`.

---

## 4. Root-level test folder (`tests/e2e/`, outside any single app)

Same rules, one level up — feature label as the first folder under
`tests/e2e/`, `utils/` for shared test helpers (no feature label, it's
cross-cutting by nature):

```
tests/e2e/
  auth/
    password-signup.spec.ts
    otp-signup.spec.ts
    ...
  utils/
    inbucket.ts
```

---

## 5. Shared packages (`packages/*`)

Same purpose-first model once a package outgrows a handful of flat files.
`packages/supabase` is still small enough to stay flat (`browser.ts`,
`server.ts`, `admin.ts`, `middleware.ts`, `client.ts`, `types.ts`) — revisit
this rule for it only if it grows past ~10 files.

### `packages/ui` — two tiers, don't confuse them

- **`packages/ui/components/ui/`** — shadcn/ui primitives (Button, Input,
  Label, ...). Generic design-system building blocks with zero product
  knowledge, shared by every app via `@repo/ui/components/ui/<name>`. Only 
  ever touched via pnpm dlx shadcn@latest add <name> (run from inside 
  packages/ui) — brand colors resolve automatically via the shadcn theme 
  tokens in styles/tokens.css, so no per-component color editing is expected. 
  A shape/sizing tweak (like Button's rounded-full) is the one legitimate 
  exception. Never write a new primitive by hand here.
- **`apps/<name>/src/components/<feature>/`** — feature-specific
  compositions that *use* those primitives (e.g. `DeleteAccountButton`
  renders a shadcn `Button` with `variant="destructive"` plus this
  product's confirm-twice flow). These stay app-local per §1/§2 — a
  composition belonging to one app's `auth` feature has no reason to be
  shared, even if another app has its own unrelated `auth` components.

If a *composition* (not a primitive) turns out to genuinely be needed by
more than one app identically, that's what promotes it into `packages/ui`
directly — not by default, only once real duplication shows up.

---

## 6. Worked example: why an action must not take a Supabase client as a parameter

A Server Action's arguments have to survive being called from a Client
Component across the network boundary — they must be serializable. A
Supabase client instance is not, so a function meant to become a Server
Action can never accept one as a parameter, even when it also needs to
work when called from other server-side code (a Route Handler, a Server
Component's render).

The fix is always the same: the action creates its **own** server-side
Supabase client internally (`await createServerSupabaseClient()` from
`@repo/supabase/server`) rather than being handed one. That's what made
`resolveOrganizationMembership` — originally written to accept a client
so it could be called with either a browser or server client — a genuine
fit for `actions/` once refactored: as `resolveOrganizationMembershipAction(joinCode)`
in `actions/auth/auth.actions.ts`, it's callable identically from the
`/auth/confirm` route handler, the `/auth/callback` route handler, and
directly from the OTP page's Client Component — the last of which is
exactly the case Server Actions exist for.

Calling a Server Action directly from a Server Component's own render
(e.g. org-console's page loading its organization overview) is not
explicitly documented by Next.js as a data-fetching pattern, but nothing
prohibits it either — the client↔server RPC machinery only matters when
a Client Component is the caller. Called from other server-side code, a
`"use server"` function behaves like any other async function.
