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
    hooks/      Custom React hooks.
    stores/     Zustand stores (client-side state) — divided by
                *purpose-category*, not feature label; see below.
    constants/  Fixed values / config maps (reserved — none yet).
    supabase/   Reserved exception, not a default. Only for functions
                that CANNOT be Server Actions — currently that's just
                code that must run inside Next.js Middleware (Edge
                runtime). Likely stays empty at the app level for a
                long time; the one real instance today is the shared
                packages/supabase/middleware.ts, which lives in the
                package, not here.
  components/   React components — anything with JSX that isn't a page.
  types/        App-local TS types, and ambient .d.ts module shims.
```

Every one of lib/actions/, lib/schemas/, lib/supabase/, and types/ is
divided by feature label as the next path segment. components/ and
lib/utils/ are divided by feature label too — just without a suffix
requirement on the filename (see §3). lib/hooks/ is too, once there are
enough hooks to warrant it — one flat file is fine below that. lib/stores/
is the one deliberate exception to "divided by feature label": see below.

### `lib/stores/` — two purpose-categories, not one

Zustand serves two genuinely different jobs in this codebase, distinguished
by one question: **does this state's correct starting value depend on
per-request server data, or is it always the same constant regardless of
who's asking?** That answer determines which of two category folders a
store belongs in — divided by *category* first, not by feature label the
way every other purpose folder is, because the category is what determines
the store's entire shape and risk profile, not which feature it happens to
belong to.

```
lib/
  stores/
    ui-orchestration-stores/
      some-modal.store.ts
    server-mirror-stores/
      selected-organization.store.ts
  hooks/
    use-selected-organization-id.ts
```

- **`stores/ui-orchestration-stores/`** — modals, drawers, panels:
  anything whose correct starting state is always the same constant for
  every user, every request, forever (`isOpen: false`, `type: null`). No
  server counterpart exists, so there's nothing to seed from a request or
  reconcile against — a plain `create()` is enough. This will be the
  *majority* of Zustand usage in Lectern going forward (a delete-confirm
  modal, an invite-member dialog, ...). Shape:

  ```ts
  "use client";

  import { create } from "zustand";

  export type SomeModalType = "createX" | "editX" | "deleteX";

  type SomeModalStore = {
    type: SomeModalType | null;
    isOpen: boolean;
    data?: SomePayload;
    onOpen: (type: SomeModalType, data?: SomePayload) => void;
    onClose: () => void;
  };

  export const useSomeModal = create<SomeModalStore>((set) => ({
    type: null,
    isOpen: false,
    data: undefined,
    onOpen: (type, data) => set({ isOpen: true, type, data }),
    onClose: () => set({ type: null, isOpen: false, data: undefined }),
  }));
  ```

  `onOpen`/`onClose` always set every field in **one** atomic `set()` call
  each — never separate calls that could leave the store in an
  inconsistent half-open state. The hook name describes what it controls,
  not that it's a store (`useSomeModal`, not `useSomeModalStore` — "Store"
  is already implied by the file living under `stores/`). Export the
  discriminant type union (callers need it to call `onOpen(type, ...)`
  correctly); don't export the store's own shape type — it's only needed
  to type the `create<T>()` call itself.

- **`stores/server-mirror-stores/`** — state with a real, per-user,
  per-request correct value that only the server knows first (e.g.
  `selectedOrganizationId`, sourced from a cookie). Reach for this
  category only when **both** of the following are true at once — it's
  the rare case, not the default:
  1. A Server Component elsewhere genuinely needs the server-confirmed
     value to render correctly (so the state isn't purely client-side to
     begin with), **and**
  2. More than one component needs to react to a change instantly, before
     the server round-trip resolves (so a plain Server Action +
     `revalidatePath` + re-fetch isn't snappy enough on its own).

  If only (1) holds, skip the store entirely — Server Components + a
  Server Action + `revalidatePath` already produces a correct result,
  just with the round-trip's latency. If only (2) holds, that's a
  ui-orchestration store instead, not this category.

  This needs a seed-then-reconcile pattern a ui-orchestration store never
  does, precisely because there's no safe universal default to fall back
  on the way there is for a modal (`isOpen: false` is always correct;
  "which org is selected" isn't, until the server says so). Worked
  example: `apps/workspace/src/lib/stores/server-mirror-stores/selected-organization.store.ts`,
  paired with `apps/workspace/src/lib/hooks/use-selected-organization-id.ts`.
  The store itself holds `string | null` (`null` meaning "nothing written
  yet"); the paired hook wraps every read as
  `storeValue ?? serverProvidedProp`, syncing the store to the server
  value in a `useEffect` whenever that prop changes. That fallback is
  safe by construction, not by convention — `useEffect` never runs during
  server rendering, so the store is provably untouched (`null`) on every
  server render and the client's first hydration pass. That means the
  fallback is *always* what gets used for those two cases, with no
  hydration mismatch possible and no risk of one request's value leaking
  into another's server-rendered output on a long-lived server process.

Same promotion rule as §5 for `packages/lib/src/stores/`: stays app-local
until a second app genuinely needs the identical store — and the same
category split applies there too.

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
  | Zustand stores | `.store.ts` (one file per distinct piece of state) | `lib/stores/server-mirror-stores/selected-organization.store.ts` |
  | Local types | `.types.ts` | `types/organization/organization.types.ts` |
  | Route handler | `route.ts` (framework-mandated, not our choice) | `app/auth/confirm/route.ts` |
  | `supabase/` exception, if ever used | `.query.ts` for a read, `.mutation.ts` for a write | `supabase/auth/some-middleware-only-check.query.ts` |

- **`lib/utils/`, `components/`, `hooks/` — no suffix.** A util is just a
  function; its folder (`lib/utils/<feature>/`) already says everything the
  filename needs to. Components are self-evident by `.tsx` + PascalCase
  export. Hooks use the standard React `use-` **prefix**, not a suffix —
  the one deliberate exception, because overriding an already-universal
  convention would be more confusing than following it:
  `lib/hooks/organization/use-organization-role.ts` exporting `useOrganizationRole`
  (feature-labeled once there are enough hooks to warrant it — one flat file
  under `lib/hooks/` is fine below that, as with `use-selected-organization-id.ts` today).

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

An app-local schema, type, util, or Server Action stays app-local by
default. It only promotes to one of the shared packages below once a
**second** app genuinely needs it identically — same duplication-triggered
promotion rule as `packages/ui` compositions further down. `resolveSafeRedirect`
and `signOutAction` are the two current examples: both were duplicated (or
duplication-shaped) across apps before they were promoted.

### `packages/types` — cross-app plain TS types only, no Zod

`<feature>/<feature>.types.ts` at the package root, each also exposed as
its own subpath export (`@repo/types/organization`, ...), plus a barrel
`index.ts` for the bare `@repo/types` import. No runtime code, no Zod —
that's `packages/lib`'s job below. Keeping the two separate is what lets
this package stay flat instead of needing a `types/` subfolder to
disambiguate from a `schemas/` sibling.

### `packages/lib` — cross-app Zod schemas and utils (`hooks/`, `stores/` reserved)

Wraps its content in `src/`. `src/schemas/<feature>/<feature>.schemas.ts`
and `src/utils/<feature>/<name>.ts` today; `src/hooks/` and
`src/stores/{ui-orchestration-stores,server-mirror-stores}/` are reserved
for the same promotion rule once an app-local hook or store is genuinely
needed by a second app — see §2 for the two `stores/` categories. Each feature file is its own subpath
export (`@repo/lib/schemas/auth`, `@repo/lib/utils/auth`, ...), mirroring
how `@repo/supabase` exposes `/server`, `/admin`, `/browser` rather than
one flat barrel, so an app only pulls in the slice it actually imports.
`zod` is a dependency of `@repo/lib`, not of the apps that consume its
schemas — an app only adds a direct `zod` dependency if it imports from
the `zod` package itself, not merely `.safeParse()`s an imported schema
object.

### `packages/server` — cross-app Server Actions

Wraps its content in `src/`: `src/<feature>/<feature>.actions.ts`, one
subpath export per feature (`@repo/server/auth`, `@repo/server/organization`,
...). Deliberately no barrel `index.ts`/`"."` export — importing straight
from the file that carries `"use server"` is more reliable for Next.js's
Server Action bundler tracing than re-exporting through a barrel. Same
constraint as an app-local action per §6: creates its own Supabase client
internally, never accepts one as a parameter.

### `packages/ui` — three tiers, don't confuse them

- **`packages/ui/components/ui/`** — shadcn/ui primitives (Button, Input,
  Label, ...). Generic design-system building blocks with zero product
  knowledge, shared by every app via `@repo/ui/components/ui/<name>`. Only 
  ever touched via pnpm dlx shadcn@latest add <name> (run from inside 
  packages/ui) — brand colors resolve automatically via the shadcn theme 
  tokens in styles/tokens.css, so no per-component color editing is expected. 
  A shape/sizing tweak (like Button's rounded-full) is the one legitimate 
  exception. Never write a new primitive by hand here.
- **`packages/ui/components/customs/`** — cross-app compositions that use
  those primitives but carry a little product logic (e.g. `SignOutButton`
  taking a `signOutAction`-shaped action as a prop instead of importing
  `@repo/server` itself, so this package never depends on packages above
  it in the stack). Same promotion rule as everything else in this
  section — only once genuinely needed by 2+ apps identically.
- **`apps/<name>/src/components/<feature>/`** — feature-specific
  compositions that *use* those primitives (e.g. `DeleteAccountButton`
  renders a shadcn `Button` with `variant="destructive"` plus this
  product's confirm-twice flow). These stay app-local per §1/§2 — a
  composition belonging to one app's `auth` feature has no reason to be
  shared, even if another app has its own unrelated `auth` components.

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
