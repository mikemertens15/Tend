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
Plus two views with no nav entry: the **kitchen display** (`#/hub`) and the
public **sitter page** (`#/sitter/<token>`).

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

## Sections you can switch off

Tend keeps growing outward, and an app that shows everyone everything eventually
shows most people mostly noise. So the section list is a household preference:
**Household & account → What Tend looks after**.

Home and Chores are the exceptions (`CORE_SECTIONS` in `nav.js`). Home is the
landing route and the fallback for anything unrecognised, and chores are the
question the whole app was built to answer — a Tend without them isn't a smaller
Tend, it's a different program. Everything else can go.

Switching a section off isn't cosmetic, which is the part worth getting right:

- it leaves the desktop nav and the phone's More sheet, and a nav **group** that
  empties out goes with it — a "Life" heading over nothing is worse than no
  heading;
- the phone tab bar backfills in nav order, so turning off Groceries pulls the
  next section up rather than leaving three tabs and a gap;
- its route stops resolving, so an old deep link or a bookmark lands on Home
  instead of a section that isn't there any more;
- its dashboard card disappears, and the grid it lived in collapses to full
  width rather than leaving a hole;
- and **the hook behind it stops fetching and drops its realtime channel.**
  Measured on the dashboard: everything on is 8 tables and 6 channels; with
  Meals, Pets, Systems, Hobbies and Goals off it's one of each.

That last one only works because each section already owns its data. The hooks
Home summarises take an `enabled` option that resolves `householdId` to null,
which every guard in them already checks — the same path as "not signed in yet",
so there was no new branch to get wrong.

It's stored as `disabledSections` in the `households.settings` jsonb — no
migration, no new table — and it's a **deny** list on purpose. A section added in
a later release is then visible by default, which is the right failure: a new
feature nobody can find is a support problem, and switching it off is one tap.

It's a household setting rather than a personal one, because these are shared
screens in a shared house and a section half the family can see is a
conversation waiting to happen. Genuinely personal preferences stay personal —
which skin you're in, and how long since *this device* saw the dashboard.

Not done yet: first-run doesn't ask. New households get everything and trim from
the panel. Asking during onboarding needs the picker to run before
`create_household`, which is an RPC, so it's a migration rather than a screen.

## Coming back

Tend is for people with lives, so it will regularly go unopened for a few days.
The naive result is punishing: open it on Thursday and every chore since Sunday
is sitting there in red, each labelled with exactly how late you are. That's a
scoreboard of failures, and the honest response to one is to close the app.

`data/catchup.js` handles the return, on the same terms as `nudges.js` — a pure
function over already-loaded data. The idea it turns on is that **most of those
rows don't represent work that's owed**. You don't sweep the floor twice
because you skipped Tuesday; the floor needs sweeping once, today. So overdue
work splits in two:

- **Rhythm rolls.** A repeat of a week or less, at least two days late, is a
  dropped beat rather than a debt. The card offers to re-date the lot to today
  in one tap. It does *not* mark them done — they weren't, and recording work
  that never happened would corrupt the only thing the app is actually for.
- **Everything else stands.** Fortnightly and longer upkeep, and every one-off,
  stays exactly as late as it is. A missed furnace filter is a real fact about
  your house, and softening it would be lying to you.

Three days away is the threshold (`AWAY_DAYS`); below that a gap is just a
weekend and needs no ceremony. `useLastSeen.js` supplies the absence, stored per
device in localStorage — one fewer migration, and "this screen hasn't been
looked at in a while" is arguably the truer reading. The kitchen display never
stamps it: that tablet is signed in permanently and would otherwise report a
visit every minute of every day, so the absence would never fire anywhere in the
household. Swapping in a `last_seen_at` column on `household_members` is a
two-line change behind the same hook if cross-device ever matters.

While the card is up it suppresses the "Needs you" overdue-chores nudge —
repeating the same count in red immediately underneath would undo the point of
it.

Deliberately absent: streaks. They're the most reliable way an app like this
becomes a source of shame, and the whole section above is an argument against
them.

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
  useLastSeen.js     # how long since this device saw the dashboard
  lib/supabase.js    # configured Supabase browser client
  auth/              # AuthProvider, SignIn, ResetPassword
  household/         # HouseholdProvider (members, settings), Onboarding, modal
  data/              # one hook per section + collections.js, cadence.js,
                     #   nudges.js, catchup.js, releases.js
  components/        # nav, modals, shared UI
  views/             # one per section
public/
  sw.js              # network-first service worker (installability, not offline editing)
  manifest.webmanifest
```

The schema, RLS policies and the `create_household` / `join_household` RPCs live
as Supabase migrations on the project.

## The kitchen display

`#/hub` is a full-screen view meant for a tablet or TV on a wall: the time, what's
on today, tonight's dinner, whether the animals have been fed, and the next four
days. No nav, nothing small, nothing that scrolls — if it doesn't fit it doesn't
belong on it. Sizes are in `vmin` so the same layout works on a 10" tablet and a
40" TV without a breakpoint, and it rolls over at midnight on its own because
everything is derived from a clock that ticks on the minute (`useWallClock.js`).

It asks for a screen wake lock, which most devices only honour if their own
timeout setting allows it — hence the per-device setup guides, reachable from
the **Kitchen display** button on the Calendar page.

It sits behind the normal auth gate: sign the device in once and leave it.

## Skins

`theme.js` hands out every colour as `var(--…)`, and `index.css` defines the
palettes. A component writes `colors.ink` and never knows which skin it's in.

Two independent dials, both stamped on `<html>` by a boot script in `index.html`
before first paint so there's no flash of the wrong one:

- **`data-palette`** — `warm` (Direction B from the original handoff), `calm`
  (Direction A), `garden`, `dusk`.
- **`data-mode`** — `light` or `dark`, resolved from the OS when the stored
  preference is "match device", and kept in sync if the OS changes.

Adding a palette is two CSS blocks plus an entry in `data/palettes.js`. Keep the
token order identical across blocks; that's what makes them reviewable side by
side.

The three newer palettes clear WCAG AA (4.5:1) on body text, secondary text,
status colours and text-on-accent, in both modes. Warm is deliberately left at
the handoff's original values, which sit nearer 3:1 on the faintest secondary
text — changing them would change the look the app was designed around.

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
