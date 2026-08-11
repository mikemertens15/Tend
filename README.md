# Tend

A warm, family-friendly dashboard for the whole running of a household — the
chores and the car and the furnace filter, but also the groceries, the cats, the
books you're half through and the thing you keep meaning to build.

It started as a home-maintenance board answering one question every week:
**what needs doing.** It's grown outward from there without losing that.

## Stack

- **React 19 + Vite** — one responsive web app for desktop, phone and the
  kitchen tablet. Installs to a home screen as a PWA.
- **Supabase** — Postgres + Auth + Row-Level Security. Sign in with a password
  (or a magic link the first time), create or join a **household** with an
  invite code, and everything syncs live across every device. Each household's
  data is isolated by RLS.
- **No component library and no CSS framework.** Styling is inline objects
  reading design tokens from `theme.js`; the tokens are CSS custom properties,
  which is what makes the two skins work.

## Run it

```bash
npm install
```

```bash
npm run dev
```

`npm run build` produces `dist/`, `npm run preview` serves it, `npm run lint`
runs oxlint.

### Backend config

The Supabase URL + publishable key live in `.env.local` (gitignored):

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=sb_publishable_...
```

One-time setup in the Supabase dashboard → **Authentication → URL
Configuration**: add your app origins (`http://localhost:5173` for dev, plus the
deployed URL) to **Site URL / Redirect URLs**, so sign-in and password-reset
emails come back to the app.

## Sections

**Household** — Chores, Meals, Groceries, Pets, Systems, Calendar, Facts.
**Life** — Hobbies, Goals.

A few of these are worth explaining, because the design decision isn't obvious:

- **Chores are arranged by room**, not as a list. A flat list of everything a
  house needs is unreadable — nothing on it relates to anything next to it, so
  there's no natural place to start. A room is somewhere you're already
  standing, with a finite number of jobs and a visible end. Each chore also
  carries a rough time estimate, which powers "got a minute?": say how long you
  have and only what fits shows up. `data/rooms.js` holds the vocabulary and a
  small keyword map that guesses the room from what you typed.
- **Groceries** is also the budget. Checking an item off doesn't delete it — it
  gets archived onto a **shopping trip**, and that one decision is what makes
  everything else free: spending history, a budget you can actually track, and a
  **price book** (`grocery_price_book`, a view over past purchases) that
  remembers what you last paid for a thing at a given store and pre-fills it
  next time.
- **Pets** exists mostly to answer "has anyone fed the cats?". Meals are logged
  per pet, per slot, per day, with a unique index so two people tapping at once
  can't produce two breakfasts. Litter and the rest run on the same countdown
  logic as home systems (`data/cadence.js`).
- **Chores are dated, not slotted.** `due_on` is the only stored schedule; the
  overdue/today/soon bucket, the pill text and the calendar column are all
  derived from it, so they can't disagree. `repeat_days` makes a chore a habit —
  completing one books the next.
- **Hobbies** all share one table, one hook and one view. Adding a hobby is one
  entry in `data/collections.js` describing its vocabulary and fields; the
  database keeps the extra fields in a `jsonb` column, so there's no migration
  either.
- **Facts** is the reference sheet — filter sizes, paint colours, model numbers.
  Values marked secret are masked until tapped, which is cover from a glance at
  the kitchen tablet and *not* encryption; they're stored in plain text like
  everything else.
- **Meals carry their ingredients**, so a week's dinners can be pushed onto the
  grocery list in one tap — priced from the price book, deduplicated against
  what's already on the list, and sorted into aisles by the same kind of keyword
  guesser the rooms use.
- **Systems suggests seasonal jobs** based on the month, and hides the ones you
  already track (matched loosely, so "clean gutters" and "Clean the gutters"
  aren't offered twice).

## Sitter mode

The one part of Tend that anyone can reach without an account: `#/sitter/<token>`
renders outside the auth gate and shows a house-sitter the feeding routine, the
care jobs, upcoming vet visits, the vet's phone number, and any house facts
explicitly marked shareable. They can tick meals off as they do them.

The security shape is worth stating plainly, because it's the only public
surface in the app:

- The underlying tables gain **no anon policies at all**. They keep their normal
  members-only RLS.
- Everything a link holder can see or do goes through two `SECURITY DEFINER`
  functions (`sitter_page`, `sitter_toggle_meal`) with a pinned `search_path`.
  They validate the token, then return or write exactly one whitelisted shape.
- Writes are confined to one row shape in one table (`pet_log`, kind `fed`,
  dated today), for pets in the token's own household. A sitter-logged meal has
  a null `member_id`, which is how the app shows who did it.
- Tokens are generated by a database default (`gen_random_bytes`), never the
  browser. Links can carry an expiry and can be turned off; both are checked on
  every call.
- House facts are opt-out by default and then **opt-in per fact**, so nothing
  about the house travels with a link unless it was ticked.

A leaked link is therefore worth exactly one household's pet routine, for as
long as it's left active.

## Nudges

`data/nudges.js` is a pure function over already-loaded data: it gathers what's
genuinely late across chores, home systems and pets into one ranked row on the
dashboard. `supabase/functions/daily-digest` applies the same rules server-side
for an optional email. **The digest is dormant** — it sends nothing until a
`RESEND_API_KEY` secret exists, a household opts in, and a `pg_cron` schedule is
created. Deploying the function alone does nothing; the steps are in a comment
at the bottom of the file.

## Where things live

```
src/
  App.jsx            # auth/household gating, routing, view switching
  nav.js             # the destination list, shared by both navs
  theme.js           # design tokens, as CSS custom property references
  index.css          # the two skins (warm / dark wall display)
  useTheme.js        # skin switching + persistence
  dates.js           # week / greeting / "today" helpers
  useHashRoute.js    # dependency-free hash router
  lib/supabase.js    # configured Supabase browser client
  auth/              # AuthProvider, SignIn, ResetPassword
  household/         # HouseholdProvider (members, settings), Onboarding, modal
  data/              # one hook per section + collections.js, cadence.js, releases.js
  components/        # nav, modals, shared UI
  views/             # one per section
public/
  sw.js              # network-first service worker (installability, not offline editing)
  manifest.webmanifest
```

The schema, RLS policies and the `create_household` / `join_household` RPCs live
as Supabase migrations on the project.

## Two skins

`theme.js` hands out every colour as `var(--…)`, and `index.css` defines both
palettes. A component writes `colors.ink` and never knows which skin it's in.
`data-theme` is stamped on `<html>` by a boot script in `index.html` before first
paint, so there's no flash of the wrong one. Light ("Warm") is Direction B from
the original design handoff; dark ("Wall display") is Direction C, meant for an
always-on tablet. With no explicit choice stored, Tend follows the OS.

## Releases

`data/releases.js` is the hand-written release log behind the version chip in the
nav. It's hand-written on purpose — a generated changelog lists commits, and
what's worth reading later is what changed about *using* the thing. To cut a
release, bump `version` in `package.json` and add an entry at the top.

## Ideas for next

- Email invites alongside the shareable join code.
- Meal plans that push their ingredients onto the grocery list.
- Photos on workshop projects and pets (Supabase Storage).
- Code-splitting: it's one 550 kB bundle, which is fine on wifi and less fine on
  a phone in a supermarket car park.
