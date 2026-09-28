# Lectern — Code Organization Conventions

Purpose-first, not feature-first: one fixed top-level folder per _kind_ of
code (actions, components, stores, etc.), each divided internally by
_feature label_ (auth, organization, session, ...). This is a deliberate
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

| Feature label  | Feature-flows.md section | Covers                                                                                                                                                               |
| -------------- | ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `auth`         | AUTH                     | signup, sign-in, OTP, OAuth, confirmation, password reset, sign-out, account deletion                                                                                |
| `organization` | ORG                      | org settings, members, invites, join code, admin handoff                                                                                                             |
| `session`      | SESSION                  | personal/team sessions, live conversation, floor control                                                                                                             |
| `library`      | LIB                      | personal/shared library items, notes                                                                                                                                 |
| `board`        | BOARD                    | request board                                                                                                                                                        |
| `notification` | NOTIF                    | transactional/announcement email, in-app bell                                                                                                                        |
| `drive`        | DRIVE                    | Google Drive import                                                                                                                                                  |
| `billing`      | BILLING                  | plans, Stripe                                                                                                                                                        |
| `admin`        | ADMIN                    | superadmin console                                                                                                                                                   |
| `legal`        | LEGAL                    | disclaimers, compliance copy                                                                                                                                         |
| `shared`       | — (not a doc section)    | genuinely cross-feature code used by 2+ labels above, within one app. If it's used across _apps_, it belongs in `packages/ui` or `packages/types` instead, not here. |

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
    actions/    "use server" Server Actions — writes, and anything the
                browser calls. Reads that only Server Components need are
                not actions: they're cached queries in packages/server
                (see §5 and §7), because every "use server" export is a
                publicly callable endpoint and can't use React's cache().
    schemas/    Zod schemas.
    utils/      Pure helper functions — no React, no Supabase calls,
                no side effects. The one deliberate catch-all category.
    hooks/      Custom React hooks.
    stores/     Zustand stores (client-side state) — divided by
                *purpose-category*, not feature label; see below.
    constants/  Fixed values / config maps.
    supabase/   Reserved exception, not a default. Only for functions
                that CANNOT be Server Actions — currently that's just
                code that must run inside Next.js Middleware (Edge
                runtime). Likely stays empty at the app level for a
                long time; the one real instance today is the shared
                packages/supabase/middleware.ts, which lives in the
                package, not here.
  components/   React components — anything with JSX that isn't a page.
  types/        Ambient .d.ts module shims only. Every other type lives
                in packages/types (§5), even if one app uses it today.
```

Every one of lib/actions/, lib/schemas/, lib/supabase/, lib/constants/,
and types/ is divided by feature label as the next path segment. components/ and
lib/utils/ are divided by feature label too — just without a suffix
requirement on the filename (see §3). lib/hooks/ is too, once there are
enough hooks to warrant it — one flat file is fine below that. lib/stores/
is the one deliberate exception to "divided by feature label": see below.

### `lib/stores/` — two purpose-categories, not one

Zustand serves two genuinely different jobs in this codebase, distinguished
by one question: **does this state's correct starting value depend on
per-request server data, or is it always the same constant regardless of
who's asking?** That answer determines which of two category folders a
store belongs in — divided by _category_ first, not by feature label the
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
  _majority_ of Zustand usage in Lectern going forward (a delete-confirm
  modal, an invite-member dialog, ...). Shape:

  ```ts
  'use client';

  import { create } from 'zustand';

  export type SomeModalType = 'createX' | 'editX' | 'deleteX';

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
  fallback is _always_ what gets used for those two cases, with no
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

  | Purpose                                 | Suffix                                                                           | Example                                                          |
  | --------------------------------------- | -------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
  | Server actions (writes; browser-called) | `.actions.ts` (plural — one file holds every action for that feature by default) | `actions/auth/auth.actions.ts`                                   |
  | Server-side reads (packages/server)     | `.queries.ts` (plural, same rule)                                                | `packages/server/src/organization/organization.queries.ts`       |
  | Constants                               | `.constants.ts`                                                                  | `lib/constants/organization/organization-sections.constants.ts`  |
  | Zod schemas                             | `.schemas.ts` (plural, same "one file per feature by default" rule)              | `lib/schemas/auth/auth.schemas.ts`                               |
  | Zustand stores                          | `.store.ts` (one file per distinct piece of state)                               | `lib/stores/server-mirror-stores/selected-organization.store.ts` |
  | Types (packages/types only)             | `.types.ts`                                                                      | `packages/types/organization/organization.types.ts`              |
  | Route handler                           | `route.ts` (framework-mandated, not our choice)                                  | `app/auth/confirm/route.ts`                                      |
  | `supabase/` exception, if ever used     | `.query.ts` for a read, `.mutation.ts` for a write                               | `supabase/auth/some-middleware-only-check.query.ts`              |

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

Two firm rules sit on top of that default:

- **Anything both apps use lives in a package** — hook, util, component,
  store, or query. Never a copy in each app.
- **Every type lives in `packages/types`**, from the start, even when only
  one app uses it today. Types are cheap to share and expensive to
  reconcile once two apps have each grown their own.

### `packages/types` — every type, no Zod

`<feature>/<feature>.types.ts` at the package root, each also exposed as
its own subpath export (`@repo/types/organization`, ...), plus a barrel
`index.ts` for the bare `@repo/types` import. No runtime code, no Zod —
that's `packages/lib`'s job below. Keeping the two separate is what lets
this package stay flat instead of needing a `types/` subfolder to
disambiguate from a `schemas/` sibling.

A type mirroring a database enum is **derived** from the generated types
(`Database['public']['Enums']['organization_role']`), never restated, so a
migration that changes the enum breaks the build instead of drifting. A
field the database doesn't store yet is marked `PROPOSED` in its doc
comment, so the gap between the UI and the schema stays visible.

`packages/types` is the only place that imports the generated
`@repo/supabase/types`. A raw row type a query needs
(`MemberProfileRow`) is defined here too, beside the app-facing type it
maps to (`MemberProfile`); `packages/server` and the apps import both from
`@repo/types`.

### `packages/lib` — cross-app Zod schemas, utils, and hooks (`stores/` reserved)

Wraps its content in `src/`: `src/schemas/<feature>/<feature>.schemas.ts`,
`src/utils/<feature>/<name>.ts`, and `src/hooks/<feature>/use-<name>.ts`
(`shared/` for hooks with no feature). Each hook is exported by its own name,
`@repo/lib/hooks/use-<name>`, without the folder.
`src/stores/{ui-orchestration-stores,server-mirror-stores}/` is reserved for
the same promotion rule once an app-local store is genuinely needed by a
second app — see §2 for the two `stores/` categories. Each feature file is its own subpath
export (`@repo/lib/schemas/auth`, `@repo/lib/utils/auth`, ...), mirroring
how `@repo/supabase` exposes `/server`, `/admin`, `/browser` rather than
one flat barrel, so an app only pulls in the slice it actually imports.
`zod` is a dependency of `@repo/lib`, not of the apps that consume its
schemas — an app only adds a direct `zod` dependency if it imports from
the `zod` package itself, not merely `.safeParse()`s an imported schema
object.

### `packages/server` — cross-app Server Actions and server-side reads

Wraps its content in `src/`: `src/<feature>/<feature>.actions.ts`, one
subpath export per feature (`@repo/server/auth`, `@repo/server/organization`,
...), and `src/<feature>/<feature>.queries.ts` beside it, exported as
`@repo/server/<feature>/queries`.

Queries are `import 'server-only'` functions wrapped in React's `cache()`
— `getCurrentUser`, `getOrganizationSelection`, `getOrganizationAccess`,
... — so a layout, a page, and a component asking for the same thing during
one request share one round trip. They carry no `"use server"`: nothing
in the browser calls them, and marking them would publish each as an
endpoint. An action that needs the current user calls the same query. Deliberately no barrel `index.ts`/`"."` export — importing straight
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

  **Every list of rows renders through `ResponsiveTableLayout`**
  (`@repo/ui/components/customs/responsive-table-layout`): members, invitations,
  and later requests, library items, and sessions. The caller passes
  columns, each with a heading, a width, a placement (`primary`, `detail`, or
  `action`), and a `cell` that renders it. The table owns the one layout:
  headings from md up, and below md the primary cell with the action at its
  right and the details on one wrapping line beneath. It has no hooks, so a
  Server Component can use it. Its optional `selection` adds a checkbox to
  every row, for bulk actions.

  **Every list that searches, sorts, filters, or pages uses the same kit.**
  `useListTable()` (`@repo/lib/hooks/use-list-table`) is the only place
  TanStack Table is set up. It gives a list search, sort, one filter, pages of
  20, and optional row selection, with rules every list shares: any change to
  the search, a filter, or the sort goes back to page 1, and a selection
  survives paging and sorting but clears when the search or a filter changes.
  Each list defines its TanStack columns once at module level (a new array
  each render would send it back to page 1), including one with the id
  `SEARCH_COLUMN_ID` holding its search text. Search matches every typed word,
  in any order and any case. The screen around the rows comes from
  `ListTableToolbar`, `ListTableCount`, `ListTableNoMatches`, and
  `ListTablePagination` (`@repo/ui/components/customs/list-table-*`), all
  inside a `ListTableFrame`. The frame keeps the list no taller than the
  screen, so only the rows scroll and the pager stays at the bottom of the
  screen. Pass the page number as the table's `scrollResetKey` so each new
  page starts at its first row. The
  members lists share `useMemberListTable()` and `useMemberDetailListTable()`
  (`@repo/lib/hooks/use-member-list`), so the workspace directory
  and the console list search, sort, and filter the same way. Only the
  console's list searches email. A list whose text depends on the clock, such
  as expiry or "3 hours ago", works it out on the server and passes it in,
  so hydration can't render something different.

  **Choices and menus are two different dropdowns.** A choice, such as a
  sort order or a filter, uses `DropdownSelectTrigger` and
  `DropdownSelectContent` (`@repo/ui/components/customs/dropdown-select`): a
  field-style trigger that never scales, with its list directly beneath it at
  the same width. An action menu, such as a row's "…", uses the shadcn
  `DropdownMenuContent`. Every Radix menu gets its `onCloseAutoFocus` from
  `useKeyboardOnlyFocusReturn()`
  (`@repo/lib/hooks/use-keyboard-only-focus-return`), and
  `DropdownSelectContent` already does. Focus then returns to the trigger,
  with its ring, only after a keyboard close, not after a mouse one.

- **`apps/<name>/src/components/<feature>/`** — feature-specific
  compositions that _use_ those primitives (e.g. `DeleteAccountButton`
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

---

## 7. Data access: what goes where

Decide by what the logic _is_, not where it's convenient to write.

| Logic                                                       | Lives in                                       | Why                                                                                                                                                                                                         |
| ----------------------------------------------------------- | ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Who may see or do what**                                  | Postgres — RLS policies and `has_permission()` | The only layer a client can't bypass. The UI hiding a button is a courtesy; the database refusing the write is the rule.                                                                                    |
| **A question about authorization the app needs answered**   | A SQL function built _on_ the rule             | `current_organization_permissions()` asks `has_permission()` rather than restating its join, so the UI can never offer what RLS will refuse.                                                                |
| **A multi-table read reused in many places**                | A `security_invoker` view — when it earns it   | One round trip instead of several. `security_invoker = true` is not optional: a default view runs as its owner and **bypasses RLS entirely**. Not used yet; the member-profile join is the first candidate. |
| **Composing reads for one request**                         | `packages/server` queries                      | Typed, cached per request, shared by both apps.                                                                                                                                                             |
| **Writes, and anything the browser triggers**               | Server Actions                                 | The one sanctioned client-to-server call.                                                                                                                                                                   |
| **Pure derivation** — names, labels, sort order, formatting | `packages/lib` utils                           | No security, no I/O, trivially testable.                                                                                                                                                                    |
| **What client components need to know**                     | A hook reading context the layout seeded       | `useOrganizationAccess()`: the server fetches once, the client never refetches or re-derives.                                                                                                               |

A permission check in TypeScript is for deciding what to _show_. If it's
ever the only thing standing between a user and an action, that's a bug.

### Checking a permission

Code asks for a **permission**, never a role. The role-to-permission mapping
lives only in `role_permissions`, minus whatever an Admin has withheld from
one member in `membership_permission_restrictions`, and `has_permission()` is
the only thing that combines them. `current_organization_permissions()` hands
its answer to the app, so a permission moved between roles, or a member
restricted or allowed back, changes no TypeScript. A role check (`role === 'admin'`) is right only
where the rule really is about the role itself, like the org console being
Admin-only.

Every feature gated on a permission (starting a team session, posting or
claiming on the request board, inviting) uses the same helpers:

| Where                               | Use                                                                                                          |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Client Component — show or hide     | `useOrganizationAccess().hasPermission('sessions.team.start')`                                               |
| Server Component — show or hide     | `await hasOrganizationPermission(organizationId, 'sessions.team.start')`                                     |
| Page that exists for one permission | `await requireOrganizationPermission(organizationId, 'sessions.team.start')`: 404 otherwise                  |
| Server Action — before acting       | `if (!(await hasOrganizationPermission(organizationId, permission))) return { error: … }`                    |
| Database — the rule itself          | RLS: `WITH CHECK (has_permission(organization_id, 'sessions.team.start'))` on the table the action writes to |

The three server helpers share one cached `getOrganizationAccess()` per
request, so checking several permissions costs one database round trip. The
hook reads whatever the nearest layout seeded: the selected organization in
the workspace, the organization in the URL in the org console.

One rule is more than a permission: **joining a team session** is allowed
with `sessions.team.join`, _or_ by whoever started that session, so a Session
leader restricted from joining can still run the sessions they start.
`can_join_team_session(organization_id, started_by)` holds that rule in SQL.
The team-session tables' policies call it, never
`has_permission(…, 'sessions.team.join')` directly, and a Join button checks
the same pair: `hasPermission('sessions.team.join') || session.startedBy === currentUserId`.

### Showing people

**Every column that points at a member gets two foreign keys**: one to
`auth.users(id)` and one to `member_profiles(id)`, with the same `ON DELETE`
on both. `memberships.user_id` is the model; a request's poster, a session's
starter, a library item's author, and an invite's sender all follow it. The
`member_profiles` key is what lets PostgREST embed the person in the same
query, so a list of rows arrives with its people in one request. There's no
separate "look up these profiles" query.

**Every embed selects the same shape.** A member is shown as a
`MemberIdentity` (`@repo/types/auth`): their avatar, and the name fields
`resolveMemberDisplayName()` reads, the display name first with first and
last name as the fallback. A query embeds
`member_profiles(${MEMBER_IDENTITY_COLUMNS})` and maps the row with
`toMemberIdentity()`, both from `@repo/server/auth/profile/queries`. When one
row points at two members, alias each embed and name its foreign key:
`poster:member_profiles!requests_posted_by_profile_fkey(…)`.

**Email is selected only where it's shown**: the org console's members list
(`getOrganizationMemberDetails()`) and the member's own profile page
(`getCurrentMemberProfile()`). Every other query, in the workspace and the
rest of the console alike, leaves it out, so an address can't reach a screen
that shouldn't show it even by mistake.

**Realtime payloads carry only a `user_id`.** Resolve it against the
organization's member list the page already holds, and refetch that list when
an id is missing, rather than looking people up one at a time.

### Invitations

An Admin invites by email from the org console. Every change to an invitation
goes through a SQL function: the table has no write policies, and no app role
can insert, update, or delete it directly.

- **Three statuses:** `pending`, `accepted`, `canceled`. An invitation is
  **never deleted**; only its status changes. A trigger keeps its
  organization, email, sender, and `created_at` fixed, and an accepted one
  can't change at all.
- **"Expired" isn't a status.** It comes from `expires_at`, 7 days after
  sending: a `pending` invitation past it is still `pending`, and its link no
  longer works.
- **The link carries a random token; the table stores only its hash**
  (`token_hash`, which no app role can read). A lost link can't be recovered,
  only replaced by sending again.
- **One open invitation per address per organization.** Addresses are stored
  trimmed and lower-case, and inviting an address that already has an open
  invitation refreshes that row instead of adding one.
- **The plan cap counts invitations.** Members plus pending invitations whose
  link still works can't exceed `max_members`: the organization's override,
  or else its plan's. Free allows only its one member, so it can't invite.
- **The functions:**
  - `send_organization_invitation()` returns the raw token, for the email.
  - `cancel_organization_invitations()` acts only on pending invitations whose
    link still works.
  - `resend_organization_invitations()` acts only on canceled invitations and
    expired pending ones. It refreshes the same row with a new token and
    expiry and sets it back to `pending`, so `created_at` stays the first time
    it was sent, which is why the page labels it "First invited".
  - `get_organization_invitation_preview(token)` gives the link's pages what
    they need, and works signed out.
  - `accept_organization_invitation(token)` creates the membership
    (`join_method = 'email_invitation'`) and marks the invitation `accepted`,
    with `accepted_at` and `accepted_by`.

  The Admin's three check `invites.manage`. Cancel and resend take many ids
  and skip the ones they don't apply to.

- **Never reveal membership to the Admin.** Inviting an address that already
  belongs is accepted like any other and sits pending in the log. Only the
  invitee, on opening the link, is told they already belong, and the
  invitation is left as it was. Whether an address has an account is used only
  by the link's own pages, never shown to the Admin.
- **The link's path.** The link opens `/invitation?token=` in marketing. It
  sends a signed-out invitee to sign in, or to sign up when the address has no
  account, with the email prefilled and locked, the token carried as
  `invitation`, and `next` pointing at the workspace's `/invitations/accept`.
  Matching always uses the sign-in email (`auth.users.email`).
- **No account is ever created for a different address.** The locked field
  covers email sign-up. Google needs more, because Supabase's own Google
  sign-in creates the account the moment Google answers, before Lectern sees
  the address. So from an invitation, the Google button goes through Lectern's
  routes instead (`/auth/invitation/google`, then `…/callback`):
  - Lectern swaps Google's code for the ID token itself and compares its
    address with the invitation's.
  - Only on a match does it call `signInWithIdToken()`, which is when Supabase
    signs the person in or creates the account.
  - A different address goes back to the form with nothing created.
  - Every URL in this flow is built on `NEXT_PUBLIC_MARKETING_URL`, whose
    `/auth/invitation/google/callback` must be registered as a redirect URI on
    the Google OAuth client, once per environment.
- **The accept dialog has one way on: Accept.** There's no decline and no
  close. Someone who doesn't want the organization accepts and leaves it.
  Only when Accept can't work, on the wrong account or a dead link, does the
  dialog offer a way out instead.
- **The invitations page is a log** of every `pending` and `canceled`
  invitation, however old. An accepted invitation leaves it, and the person
  appears on the members list instead.
- **Email goes through `sendEmail()`** (`packages/server/src/notification/email.ts`),
  over SMTP set by `EMAIL_SMTP_HOST`, `EMAIL_SMTP_PORT`, and `EMAIL_FROM`, plus
  `EMAIL_SMTP_USER` and `EMAIL_SMTP_PASSWORD` where the server needs them.
  Locally that's the Supabase stack's Mailpit: SMTP on 54325, inbox on 54324.
  If the email fails, the invitation is still saved, and the Admin is told to
  send it again.

---

## 8. CONSIDERATION — for future implementations

**Not rules yet.** Notes from comparing Lectern's direction against other
codebases. When one is adopted, move it into the section it belongs to and
delete it here.

### Access context

- **Put the current user's id in the access context.** `useOrganizationAccess()`
  carries role and permissions but not who the user is, and ownership checks
  need it, e.g. `session.startedBy === currentUserId` beside
  `hasPermission('sessions.team.join')`.
- **Feature-level permission hooks are fine**, e.g. `useTeamSessionAccess()`,
  as long as they only combine `hasPermission()` and ownership to mirror a rule
  SQL already enforces (`can_join_team_session()`). A hook must never add a
  business rule of its own, or gate a feature on a role, because nothing in
  the database would enforce it.

### TanStack Query, once adopted

- **First render comes from the server.** Prefetch with a `packages/server`
  query and pass it down through `HydrationBoundary`, so the page has its data
  before any client code runs.
- **Refetching in the browser needs something the browser can call.** Choose
  one per feature: a GET Route Handler that calls the server query (the lean
  for lists), or the Supabase browser client under RLS. Not a Server Action.
  Actions are POST, run one at a time, and are meant for writes.
- **Writes:** `useMutation` calls a Server Action. An optimistic `setQueryData`
  is rolled back in `onError`, and `invalidateQueries` runs once it settles.
- **Toasts belong in mutation callbacks or the UI**, never inside a
  `queryFn`/`mutationFn`. Throw an error once, rather than logging it and
  throwing it again.
- **One query-key factory per feature**, e.g.
  `organizationKeys.members(organizationId)`, so every read and every
  invalidation spells a key the same way.
- **An optimistic update reads only its own cache.** It doesn't cast another
  query's data to fill itself in, and it never invents fields such as
  `created_at: new Date()` to complete a row.

### UI

- **Hide or disable what the user can't do.** Don't show a control and then
  toast "you don't have permission" when it's clicked.
- **The initials avatar could take a colour derived from the user id**, stable
  per person, so people stay recognizable without a photo.
- **A loading placeholder for tables**: a `ResponsiveTableSkeleton` reading
  the same headings and widths, for a `loading.tsx`. The column definitions
  would then need to live in files without `'use client'`, so a Server
  Component can import them.

### Schema

- **Columns that still point at a member through `auth.users` alone:**
  `organizations.created_by` and
  `membership_permission_restrictions.restricted_by`. Give each its
  `member_profiles` foreign key (see "Showing people" in §7) once a screen
  shows that person.
- **Known gap: every member can read the whole `organizations` row.** The
  read policy (`is_organization_member(id)`) doesn't limit columns, so a
  plain Member can read `join_code`, `stripe_customer_id`,
  `stripe_subscription_id` and `limit_overrides` straight from the browser.
  This was verified as a Member on 2026-09-25. The join code is meant to be
  Admin-only; `getOrganizationSettings()` is Admin-only today only because its
  callers sit behind the console's `requireOrganizationAdmin`, and its comment
  still says "null if … isn't a member". Planned fix:
  - Grant members SELECT on `id, name, plan, created_by, created_at` only.
  - Hand the join code out through a function that checks a permission.
    Still open: `invites.manage` (whoever can invite sees the code that
    invites) or `org.settings.manage`.
  - Have `getOrganizationSettings()` call that function, return `null`
    without the permission, and fix its comment.
  - Leave the Stripe ids and limit overrides to the service role or their own
    functions.

  Nothing else reads those columns: every other `organizations` read asks
  only for `name` and `plan`, and the functions that create memberships run
  as their owner.
