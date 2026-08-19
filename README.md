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

**Household** — Chores, Meals, Groceries, Pets, Systems, Calendar, Facts, Wishlist.
**Life** — Hobbies, Goals, Earned.
Plus three views with no nav entry: the **kitchen display** (`#/hub`), the public
**sitter page** (`#/sitter/<token>`) and the public **widget feed**
(`#/widget/<token>`).

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
  completing one books the next. That last part has a sharp edge worth knowing
  about: because ticking one books tomorrow's immediately, a few absent-minded
  taps walk the series forward and leave a row of finished chores behind. So the
  finished pile can be cleared in one go, and a task opened after being ticked
  says so and offers the way back. The checkbox is the only thing on a task row
  that ticks it; the rest of the row opens the editor.
- **Hobbies** all share one table, one hook and one view. Adding a hobby is one
  entry in `data/collections.js` describing its vocabulary and fields; the
  database keeps the extra fields in a `jsonb` column, so there's no migration
  either. A spec also says how the hobby *looks* — see below.
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

## Weather, and why it isn't a section

`data/weather.js` talks to Open-Meteo, which needs no API key and sends CORS
headers — so it's a plain fetch from the browser with no proxy, no secret and no
edge function. The place is geocoded once when you set it and stored as lat/long
in household settings; the forecast is cached in localStorage for an hour, which
matters mostly because the kitchen tablet is left running for days.

It deliberately has no section of its own. Weather on its own is something your
phone already does better. What Tend can do that a weather app can't is join it
to the list: an outdoor chore booked for the only wet day of the week, with the
dry one named — and a freeze in the forecast, which is the one bit of weather
that makes work for you whether or not anything was on the list. Both live in
`data/nudges.js` with everything else that's slipping.

## The calendar

The one rule everything else follows: **a row in `events` is a series, not an
occurrence.** A class that meets Monday, Wednesday and Friday until December is
one row, and reading expands it into whatever window you asked about. That's what
makes entering a semester a thirty-second job instead of forty-five separate
events, and it's why almost all of the complexity lives in the difference between
the two.

- **Repeat rules** are as much of RRULE as a household actually types: a
  frequency, an interval, a set of weekdays, and one of two ways to stop.
  `data/recurrence.js` expands them and — just as important — says them out
  loud, because the only way to know you built the rule you meant is to read it
  back in English.
- **Monthly and yearly rules clamp rather than skip.** A bill on the 31st lands
  on the 28th in February; a 29 February anniversary lands on the 28th in a
  normal year. RFC 5545 would drop those occurrences, which is correct by the
  spec and wrong for a house — the bill is still due.
- **One occurrence can disagree with its series.** `event_exceptions` holds
  cancellations and changes, keyed by the date the *rule* produced — which stays
  that occurrence's name even after it's been moved somewhere else, so moving one
  twice doesn't lose track of which one it was. Editing a repeating event asks
  which you meant: this one, this and everything after, or all of them. "This and
  future" splits the series in two rather than rewriting history, so last term
  still looks like last term.
- **Day and Week are drawn to scale** on an hour grid. `data/layout.js` is pure
  geometry, and the awkward part it exists for is that "how wide is this block"
  isn't a property of the block: overlapping events are grouped into runs, packed
  into columns, then allowed to widen rightwards through any column nothing
  overlapping occupies. Otherwise a quiet morning gets drawn as slivers because
  the afternoon is busy.
- **Chores sit in the all-day band**, not in the hours. They have a date and no
  time, and inventing 9am for the bins would be a lie the grid would then draw to
  scale.
- **Calendars are colour, and colour is a privacy setting.** A calendar carries a
  `default_visibility`, so filing a lecture on School makes it yours without
  anyone answering a question about permissions. Calendar colours are real hex
  values rather than theme tokens, like member avatars and for the same reason —
  they're stored per household, so they have to survive outside the stylesheet.
  Nothing paints text on one: the saturated value is used for bars and dots, and
  the fill behind a block is that colour at low alpha, which composites over
  whichever skin is underneath.

### Who can see what

Every event is `household`, `private` (the member it belongs to) or `members`
(them plus the people named in `visible_to`). The part worth stating plainly:

- **It's enforced by row-level security, not by the query.** The app could simply
  not ask for other people's private events and it would look identical right up
  until someone opened the network tab. A private event never reaches the browser.
- `private.current_member_id()` and `private.can_see_event()` are `SECURITY
  DEFINER` with a pinned `search_path`, matching `is_household_member`. The
  predicate is inlined into the `events` policies (a per-row function that
  re-reads its own row turns one index scan into one query per event) and called
  by name from `event_exceptions` and `work_shifts`, so a cancellation or a
  timesheet can't leak what the event itself won't.
- `update` and `delete` carry the same predicate as `select`. Without that, a
  private event is readable by id through a blind `UPDATE … RETURNING`.
- A check constraint refuses any visibility narrower than the household without a
  `member_id` to narrow it *to* — otherwise "private" has no owner and the row is
  visible to nobody at all.

## Earned

A shift is still a `work` event on the calendar, not a second list: you were
already putting your rota somewhere. What changed is that **scheduled and worked
are now allowed to disagree.**

You book 6 to 3, clock in at 6:07, lunch runs to an hour and a quarter, you leave
at 2:40. Four numbers, none of them nine hours. So a `work_shifts` row records
what the clock said, keyed by `(event_id, occurrence_date)` — which is what makes
it work for a repeating rota, where one event is many days that each need their
own answer. You can punch in and out as the day goes, or type it in afterwards
for the shifts you forgot, and neither is the "real" one: a clock you can't
correct is worse than no clock, and a form at the end of a nine-hour day never
gets filled in.

- **Jobs** carry the rules that change the number: the rate, the unpaid break and
  the shift length that triggers it, overtime and what counts as a week for it,
  and the pay cycle. Overtime is a property of a *week*, not a shift — the ninth
  hour on Thursday is only overtime depending on what Monday to Wednesday came
  to — which is why it can't live in `resolveShift`. Where a job has both a daily
  and a weekly rule, the greater applies and no hour is counted twice.
- **A shift that has already happened with nothing recorded** is counted at its
  booked hours, so a total is never wrong by a whole day, and then listed as a
  guess with one tap to confirm it. Counting nothing would be quietly wrong;
  counting it silently would be worse.
- **`dates.js` owns the midnight-wrap rule** in one place: an end at or before
  the start means the span crossed midnight. 10pm–6am is eight hours, not minus
  sixteen, and getting it wrong pays a negative wage for every night shift.

What this deliberately is **not** is payroll. No tax, no withholding, no PTO
accrual, no shift differentials, no employer rounding rules. Breaks and overtime
are modelled because they move the hours by amounts you'd notice; everything past
that varies by state, employer and week, and a number that's confidently wrong
about your pay is worse than no number. `take_home_pct` is the one concession — a
single percentage read off a real payslip, labelled as the estimate it is.

## The phone widget

`#/widget/<token>` is the app's second public surface, and the more sensitive of
the two, so the shape is worth stating as plainly as the sitter page's.

- A widget token belongs to **one member**, not the household, because the point
  is that it shows *your* day — private events included. A widget that hid your
  own calendar from you would be useless.
- Only that member can list, create or revoke their own tokens: the RLS policy on
  `widget_tokens` is keyed on the member, so another person in the same house
  gets an empty list rather than a URL that reads your private calendar.
- The tables gain **no anon policies**. Everything a token holder can reach goes
  through `public.widget_agenda`, one `SECURITY DEFINER` function with a pinned
  `search_path` that validates the token and returns one whitelisted shape.
- It is **read-only** — unlike the sitter link, there is no write path.
- Tokens come from a database default, never the browser, and can be revoked or
  given an expiry.

A leaked widget token is therefore worth one person's next fortnight of
appointments, until it's turned off.

The page itself is a reference rendering rather than something anyone will use
daily: it proves the endpoint works with no session, and gives the SwiftUI
version something to be compared against. `docs/ios-widget.md` is the handover —
the payload schema, the `curl` that returns it, and what's left to build on a Mac.

**Recurrence is expanded twice, on purpose.** `data/recurrence.js` runs in the
browser so paging the calendar costs no round trip;
`private.occurrence_dates` / `private.agenda_rows` run in Postgres because a
widget has no browser. It's the same arrangement `supabase/functions/daily-digest`
already uses for the nudge rules. The rule set is kept small so "change one,
change the other" is a realistic instruction, and both were checked against the
same set of awkward cases.

## The wishlist

A collection domain (`wish`), not a new section type — it gets the whole
collection engine for nothing. The only machinery it needed was `totals` in the
presentation spec, so `CollectionView` can sum a money field.

Two things make it worth more than the spreadsheet it replaces. The total splits
by status, because "everything I want" is a fantasy number and "everything I'm
saving for" is a plan, and showing one without the other makes a wishlist either
depressing or useless. And it says how many things have no price on them, since
a total that quietly ignores twelve items is worse than no total.

It's `standalone`, meaning it has its own nav entry rather than living behind
Hobbies — it's collection-shaped but it isn't a hobby, and it's excluded from
`ALL_HOBBY_DOMAINS` so "3 things on the go" never counts a saw you haven't
bought.

Price checking is manual on purpose. Scraping retailers is fragile and the
legality is murky, so there's a "last checked" field and an honest date instead.

## How a hobby looks

The hobby screens were bland for a structural reason, not a lazy one: a domain
spec could describe its vocabulary and nothing else, so `CollectionView` had no
choice but to render every domain as the same list. The fix was to let a spec
describe its own presentation.

```js
presentation: {
  tint:  { field, guess },   // which field colours an item, and how
  shelf: { status, … },      // one status shown as a case of trophies
}
```

**Tint** is the console/service colour coding. Two ways to arrive at a colour,
because the fields differ in kind: `platform` is a chips field, so the chosen
option carries its own colour as an optional third element
(`['Switch', 'Switch', '#c4111f']`); `service` is free text, so the colour is
guessed from what you typed by the same sort of keyword table that
`data/rooms.js` uses for rooms and `useGroceries` uses for aisles. An
unrecognised service isn't a problem — it just stays plain text in the subtitle
rather than disappearing into an uncoloured pill.

The console colours are recognisably each platform's own, but darkened where the
brand value wouldn't clear 4.5:1 against the white text sitting on it.

**Shelf** is the platinum case. A platinum isn't a finished game, it's a thing
you keep, and it was the one status in the app that's a reward rather than a
state — so it gets a display case instead of another row in a list. Trophies are
drawn rather than uploaded: real cover art would mean Storage, a per-item upload
and a fallback for when it's missing, and what a platinum commemorates is the
achievement rather than the box art.

The case is **the one surface that ignores the skin**. Every other screen is a
room in the house and gets painted to match; a display case is a dark box with a
light in it and looks the same whatever colour the walls are. Painting it per
palette would also mean tinting the metal four ways, at which point it stops
reading as metal. Its tokens live in one block in `index.css`, deliberately
outside the palettes, and reach the app through `shelf` in `theme.js` rather
than `colors` — so one can't be reached for by accident somewhere it would look
wrong.

One thing worth knowing if you add a platform: on the shelf the console colour
is a wash of light behind the trophy, not coloured text. These colours were
chosen to carry white text on a light row, and none of them clears 4.5:1 against
a near-black case — as a glow it's decorative and can be as saturated as the
brand really is, while the label under it stays legible at 7.25:1.

None of this is required. A domain with no `presentation` key renders exactly as
it did before, which is what `book`, `making` and `build` still do.

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
  dates.js           # week / greeting / "today" / time-of-day helpers
  useHashRoute.js    # dependency-free hash router
  useLastSeen.js     # how long since this device saw the dashboard
  lib/supabase.js    # configured Supabase browser client
  auth/              # AuthProvider, SignIn, ResetPassword
  household/         # HouseholdProvider (members, settings), Onboarding, modal
  data/              # one hook per section + collections.js, cadence.js,
                     #   nudges.js, catchup.js, releases.js
    recurrence.js    #   repeat rules: expansion, and saying them in English
    layout.js        #   packing overlapping events into columns on a day grid
    pay.js           #   breaks, overtime, pay periods — what a shift is worth
    calendars.js     #   calendar colours, tinting, and kind → calendar guessing
  components/        # nav, modals, shared UI
  views/             # one per section
docs/
  ios-widget.md      # the handover for the native widget: endpoint, payload, plan
public/
  sw.js              # network-first service worker (installability, not offline editing)
  manifest.webmanifest
```

`recurrence.js`, `layout.js` and `pay.js` are pure — no React, no database, no
clock they didn't get handed. That's deliberate: they hold the rules that are
wrong by fifteen minutes in ways you only notice on payday, and being able to
read them end to end is the point.

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

## Loading

Home and Chores ship in the initial bundle — one is where you land, the other is
where most people go first. Every other view is a `lazy()` chunk fetched when
it's opened, behind one `Suspense` boundary around the content area only, so the
nav and the page chrome never flicker.

That took the first load from a single 604 kB bundle to ~500 kB across two
files (144 kB gzipped, down from 164 kB), with each section arriving as 2–21 kB
when you ask for it.

## Ideas for next

- **Custom hobbies.** The `collection_domains` table exists and is empty. The
  app still reads `DOMAINS` from code; the remaining work is a merged registry
  and the editor UI.
- **Web Push.** `push_subscriptions` exists and is empty. Needs VAPID keys, a
  `push` listener in `public/sw.js`, and a sender — the natural sibling of
  `supabase/functions/daily-digest`.
- **The WidgetKit extension itself.** The endpoint, the tokens, the payload and a
  reference rendering all exist and are checked; what's left is a SwiftUI app
  target and a widget extension, which need a Mac. `docs/ios-widget.md` is the
  handover, down to the timeline policy and where the token should live.
- **Clocking in from the widget.** It's read-only today. The write path would be
  a second `SECURITY DEFINER` function taking the same token and confined to one
  row shape in `work_shifts`, exposed as an `AppIntent` — the same pattern
  `sitter_toggle_meal` already uses.
- **Subscribing to an external calendar** (a school's published `.ics`). Needs an
  edge function to fetch and parse it, since a browser can't for CORS, and a
  decision about how imported events map onto the repeat rules above.
- Email invites alongside the shareable join code.
- Photos on workshop projects and pets (Supabase Storage).
- Turn on leaked-password protection in the Supabase auth settings — it's a
  dashboard toggle and the linter flags it.
