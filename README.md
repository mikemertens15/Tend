# Tend

A warm, family-friendly dashboard for the whole running of a household — the
chores and the car and the furnace filter, but also the groceries, the cats, the
bills, the books you're half through and the thing you keep meaning to build.

It started as a home-maintenance board answering one question every week:
**what needs doing.** It's grown outward from there without losing that.

This README is the developer guide. It explains how the codebase is put
together, the conventions it holds to, and — for most features — *why* the shape
is what it is, because that reasoning is the expensive part to reconstruct
later.

---

## Contents

- [Quick start](#quick-start)
- [Architecture](#architecture) — the layers, and one interaction end to end
- [The conventions that matter](#the-conventions-that-matter) — read before writing code
- [The data model](#the-data-model)
- [Security](#security) — RLS, and the three public surfaces
- [How to…](#how-to) — add a section, a hobby, a palette, a release
- [The sections, and why they're shaped that way](#the-sections-and-why-theyre-shaped-that-way)
- [Native: the iOS app](#native-the-ios-app)
- [Where things live](#where-things-live)
- [Performance](#performance)
- [Ideas for next](#ideas-for-next)

---

## Quick start

```bash
npm install
```

```bash
npm run dev
```

| Command | What it does |
|---|---|
| `npm run dev` | Vite dev server on :5173 |
| `npm run build` | Production build into `dist/` |
| `npm run preview` | Serve the built bundle |
| `npm run lint` | oxlint |
| `npm run ios:sync` | Build, copy into the native project, re-apply the widget target |
| `npm run ios:open` | Open the Xcode project |

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

### Stack

- **React 19 + Vite.** One responsive web app for desktop, phone and the kitchen
  tablet. Installs to a home screen as a PWA.
- **Supabase** — Postgres, Auth and Row-Level Security. There is no API server of
  our own: the browser talks to Postgres directly and RLS is the authorisation
  layer. See [Security](#security).
- **No component library and no CSS framework.** Styling is inline objects
  reading design tokens from `theme.js`; the tokens are CSS custom properties,
  which is what makes the four skins work.
- **Capacitor + WidgetKit** for iOS. The same web build, shipped as a real app
  with two home-screen widgets and native push — no second codebase. See
  [docs/ios.md](docs/ios.md).

There is no test suite. The rules that would most repay one are deliberately
isolated as pure modules (see [convention 3](#3-rules-live-in-pure-modules)),
which is where tests should start if that changes.

---

## Architecture

Four layers, and dependencies only ever point downward:

```
  views/          one per section. Presentational. Reads a hook, renders it.
  components/     modals and shared UI. No data fetching.
      │
  data/           ONE HOOK PER SECTION — fetch, realtime, mutate.
                  Plus pure rule modules with no React in them at all.
      │
  lib/supabase.js one configured client
      │
  Postgres        RLS is the authorisation layer. There is no API server.
```

Two React providers sit above everything, in `main.jsx`:

```jsx
<AuthProvider>          // the Supabase session
  <HouseholdProvider>   // household + member roster + settings jsonb
    <App />
```

`HouseholdProvider` is the one every data hook depends on, because
`household.id` is the partition key for every table and every RLS policy. A hook
with no household id fetches nothing — which is the same code path as "not
signed in yet" and as "this section is switched off". One guard, three meanings,
no extra branches.

### One interaction, end to end

Ticking a chore off, all the way down:

1. `ChoresView` renders a row and calls `onToggle(id)`, handed down from
   `App.jsx`.
2. `useTasks.toggle` updates local state **immediately** — the checkbox must not
   wait for a round trip.
3. It writes to Supabase. The `tasks` RLS policy checks
   `private.is_household_member(household_id)`.
4. If the task repeats, the same call books the next one.
5. Postgres broadcasts the change. Every other device in the household — the
   kitchen tablet, a partner's phone — has a realtime subscription on
   `tasks:<household_id>` and refetches.
6. On failure, the hook refetches, which undoes the optimistic edit.

Nothing in that path is unusual, and that's the point: every section works this
way, so learning one hook teaches you all of them.

---

## The conventions that matter

Six conventions carry most of the codebase. Follow them and a new section is
half a day's work; break them and things start disagreeing with each other.

### 1. Every section owns its data

One hook per section, in `data/`, and it is the only thing that touches that
section's tables. **Views never call Supabase.**

Every hook follows the same skeleton. `data/useTasks.js` is the clearest one to
read; `data/usePets.js` shows the `{ enabled }` variant:

```js
export function useThing({ enabled = true } = {}) {
  const { household } = useHousehold();
  const householdId = enabled ? (household?.id ?? null) : null;
  const [rows, setRows] = useState([]);

  // 1. fetch — guarded on householdId, which is null when parked
  const fetchThings = useCallback(async () => {
    if (!householdId) { setRows([]); return; }
    const { data } = await supabase.from('things').select('*').eq('household_id', householdId);
    setRows(data ?? []);
  }, [householdId]);

  useEffect(() => { fetchThings(); }, [fetchThings]);

  // 2. realtime — one channel per household, torn down on unmount
  useEffect(() => {
    if (!householdId) return;
    const channel = supabase.channel(`things:${householdId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'things',
           filter: `household_id=eq.${householdId}` }, () => fetchThings())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [householdId, fetchThings]);

  // 3. derive — raw rows are never handed to a view
  const things = useMemo(() => rows.map(decorate), [rows]);

  // 4. mutate — optimistic, refetch on error
  const toggle = useCallback(async (id) => { /* … */ }, [/* … */]);

  return { things, toggle /* … */ };
}
```

`useTasks` is the one exception to the `{ enabled }` half: Chores is a core
section that can't be switched off, so it takes no options at all.

**Rows are decorated before they leave the hook.** A view gets `daysLeft`,
`dueType`, `who`, `timeRange` — never `assignee_id` and a date to do arithmetic
on. Two views computing "is this overdue" independently is two chances to
disagree.

### 2. Switched-off sections cost nothing

Any hook a switched-off section owns takes `{ enabled }`, which resolves
`householdId` to `null` and so trips every guard that already existed. No new
branches, and no fetch and no realtime channel for a section nobody can see.

```js
const pets = usePets({ enabled: isOn('pets') });
```

Measured on the dashboard: everything on is 8 tables and 6 channels; with Meals,
Pets, Systems, Hobbies and Goals off it's one of each.

### 3. Rules live in pure modules

The rules that are wrong by fifteen minutes in ways you only notice on payday
live in modules with **no React, no database, and no clock they weren't
handed**:

| Module | Owns |
|---|---|
| `data/recurrence.js` | expanding repeat rules, and saying them in English |
| `data/layout.js` | packing overlapping events into columns on a day grid |
| `data/pay.js` | breaks, overtime, pay periods — what a shift is worth |
| `data/bills.js` | money in cents; what "settled" and "overdue" mean |
| `data/nudges.js` | what counts as slipping |
| `data/catchup.js` | what to forgive after an absence |
| `data/cadence.js` | countdowns from `last_done_on + interval_days` |
| `dates.js` | week/day helpers, and the one midnight-wrap rule |

Being able to read one end to end is the point. If you're adding a judgement
call — a threshold, a rounding rule, a definition of "late" — it belongs in one
of these, not in a view.

### 4. Some rules are stated twice, on purpose

The browser is not the only thing that reads this data. The iOS widget has no
JavaScript; neither does a `pg_cron` job. So a few rules exist in both JS and
SQL, deliberately:

| Rule | In the browser | In Postgres |
|---|---|---|
| Repeat expansion | `data/recurrence.js` | `private.occurrence_dates` |
| Agenda assembly | `useEvents.between` | `private.agenda_rows` |
| Nudges | `data/nudges.js` | `supabase/functions/daily-digest` |
| Bill settled / overdue | `isSettled` in `data/bills.js` | `widget_agenda`, `bill_reminders_for` |

**Change one, change the other.** The rule sets are kept deliberately small so
that's a realistic instruction rather than a pious hope, and each pair was
checked against the same set of awkward cases.

### 5. Styling is tokens, inline

No CSS framework, no styled-components:

```jsx
<div style={{ font: `600 13px ${fonts.sans}`, color: colors.ink }}>
```

`theme.js` hands out every colour as `var(--…)` and `index.css` defines the
palettes, so a component never knows which skin it's in. Two rules:

- **Never hardcode a hex in a component.** The exceptions are values that come
  from the *database* — calendar colours, member avatars, console colours — which
  have to survive outside the stylesheet, and are documented where they're used.
- **Never paint text on a database colour** without `inkOn()`. A household can
  pick anything.

### 6. Comments explain *why*

The house style: a module header stating the central idea, then inline comments
only where a reader would otherwise wonder why it's like that. Don't narrate what
the code plainly does. `data/catchup.js`, `data/pay.js` and `data/recurrence.js`
are the reference for tone; `App.jsx` is the map of the whole app and is worth
reading first.

---

## The data model

**`household_id` is on nearly every table and is the partition key for every RLS
policy.** A household is created or joined through an RPC (`create_household` /
`join_household`) because the row and its first member have to appear together.

```
households ──┬── household_members     people, avatar colours, display order
             │
             ├── tasks                 chores + home-system jobs (due_on)
             ├── home_systems          upkeep on a cadence, not a date
             │
             ├── calendars ── events ──┬─ event_exceptions   one occurrence differing
             │                         ├─ work_shifts        what the clock said
             │                         └─ bill_payments      which month got paid
             │
             ├── meal_plans            a week of dinners, with ingredients
             ├── grocery_items ── shopping_trips ── stores
             │      └─ grocery_price_book (VIEW over past purchases)
             │
             ├── pets ─┬─ pet_log      fed / walked / meds, per slot per day
             │         └─ pet_care     litter, flea meds — on a cadence
             │
             ├── collection_items ── item_entries    every hobby, one table
             ├── collection_domains   custom hobbies (exists, not yet used)
             │
             ├── goals, house_facts, jobs
             └── share_links, widget_tokens, push_subscriptions
```

Three ideas are worth knowing before you touch any of it.

**A row in `events` is a series, not an occurrence.** A class that meets
Monday/Wednesday/Friday until December is one row; reading expands it into
whichever window you asked about. Almost all the calendar's complexity lives in
the difference between the two. Anything attached to a *particular* occurrence —
a cancellation, a timesheet, a bill payment — is keyed on
`(event_id, occurrence_date)`.

**`events` is deliberately overloaded.** A shift is an event with `kind: 'work'`
and a `job_id`. A bill is an event with `kind: 'bill'`, `amount_cents` and
`autopay`. Both get recurrence, exceptions, calendar colour, visibility and RLS
for free, and neither needed a table of its own. When you're tempted by a new
table for something that happens on dates and repeats, check here first.

**Settings live in a jsonb column**, not in tables: `households.settings` holds
the disabled-section list, the weather place, and the digest and reminder
switches. That's why they ship without migrations — and why nothing validates
them, so read them defensively (`settings.disabledSections ?? []`).

---

## Security

There is no API server, so **RLS is the authorisation layer**. This is the part
to be careful with.

### The house rules

- **Never filter for privacy in JavaScript.** The app could simply not ask for
  other people's private events and it would look identical right up until
  someone opened the network tab. A private event must never reach the browser.
- **`update` and `delete` carry the same predicate as `select`.** Without that, a
  private row is readable by id through a blind `UPDATE … RETURNING`.
- Helper predicates — `private.is_household_member`, `private.current_member_id`,
  `private.can_see_event` — are `SECURITY DEFINER` with a **pinned
  `search_path`**. New ones must be too.
- `can_see_event` is *inlined* into the `events` policies rather than called: a
  per-row function that re-reads its own row turns one index scan into one query
  per event. It's called by name from `event_exceptions`, `work_shifts` and
  `bill_payments`, so a cancellation or a payment can't leak what the event
  itself won't.

### Event visibility

Every event is `household`, `private` (the member it belongs to), or `members`
(them plus the people in `visible_to`). A check constraint refuses any visibility
narrower than the household without a `member_id` to narrow it *to* — otherwise
"private" has no owner and the row is visible to nobody at all.

Calendars carry a `default_visibility`, which is what makes filing a lecture on
"School" quietly make it yours. Colour is a privacy setting.

### The three public surfaces

Everything reachable without an account goes through one `SECURITY DEFINER`
function that validates a token and returns exactly one whitelisted shape. **The
underlying tables gain no anon policies, ever.**

| Surface | Route | Function | Writes? | A leak is worth |
|---|---|---|---|---|
| Sitter | `#/sitter/<token>` | `sitter_page`, `sitter_toggle_meal` | one row shape in `pet_log` | one household's pet routine |
| Widget | `#/widget/<token>` | `widget_agenda` | no | one person's next fortnight |
| Reminders | — | `bill_reminders_for` | no | nothing; service-role only |

Tokens come from a database default (`gen_random_bytes`), never the browser, and
carry an optional expiry and a revoked flag — both checked on every call. A bad
token returns `null`, deliberately indistinguishable from a revoked one, so
tokens can't be probed for existence.

A widget token belongs to **one member**, not the household, because the point is
that it shows *your* day — private events included. The RLS policy on
`widget_tokens` is keyed on the member, so another person in the same house gets
an empty list rather than a URL that reads your calendar.

House facts are opt-out by default and then **opt-in per fact**, so nothing about
the house travels with a sitter link unless it was ticked.

---

## How to…

### …add a section

1. `nav.js` — add `['thing', 'Thing', '🧩']` to a group, and a line in
   `SECTION_BLURBS` so the settings picker can describe it.
2. `data/useThing.js` — a hook following the skeleton above. Take `{ enabled }`.
3. `views/ThingView.jsx` — presentational.
4. `App.jsx` — a `lazy()` import and a case in the view switch.
5. A migration for the table, with RLS policies keyed on `household_id`.

You do **not** need to touch the settings picker or the phone tab bar: both read
`nav.js`. And you don't need to make it opt-in — `disabledSections` is a *deny*
list, so anything new is visible by default. That's the right failure: a feature
nobody can find is a support problem, and switching it off is one tap.

### …add a hobby

One entry in `data/collections.js`. No migration and no new view — every hobby
shares `collection_items`, `useCollection` and `CollectionView`, and per-hobby
fields live in a `jsonb` column. An optional `presentation` key gives it colour
coding and a trophy shelf; see [How a hobby looks](#how-a-hobby-looks).

### …add a palette

Two CSS blocks in `index.css` (light and dark) plus an entry in
`data/palettes.js`. **Keep the token order identical across blocks** — that's
what makes them reviewable side by side. Then check contrast: the three newer
palettes clear WCAG AA (4.5:1) on body text, secondary text, status colours and
text-on-accent, in both modes.

### …read or change the schema

Migrations are applied straight to the Supabase project; there is no local
migration folder in this repo, and no checked-in schema dump — one would go stale
the first time anyone ran a migration, and a stale schema file is worse than
none. To see the real thing:

```bash
supabase link --project-ref <ref>
supabase db dump --schema public -f schema.sql          # tables, constraints, RLS
supabase gen types typescript --linked > database.types.ts
```

The [data model](#the-data-model) section above is the map; that dump is the
territory.

After a schema change that the widget or a notification reads, check whether one
of the [twice-stated rules](#4-some-rules-are-stated-twice-on-purpose) needs the
same edit — the browser is not the only reader.

### …cut a release

Bump `version` in `package.json` and add an entry at the top of
`data/releases.js`. It's hand-written on purpose — a generated changelog lists
commits, and what's worth reading six months later is what changed about *using*
the thing. The version chip in the nav is the only route to `#/releases`.

---

## The sections, and why they're shaped that way

### Chores

**Arranged by room, not as a list.** A flat list of everything a house needs is
unreadable — nothing on it relates to anything next to it, so there's no natural
place to start. A room is somewhere you're already standing, with a finite number
of jobs and a visible end. Each chore carries a rough time estimate, which powers
"got a minute?": say how long you have and only what fits shows up.
`data/rooms.js` holds the vocabulary and a keyword map that guesses the room from
what you typed.

**Dated, not slotted.** `due_on` is the only stored schedule; the
overdue/today/soon bucket, the pill text and the calendar column are all derived
from it, so they can't disagree. `repeat_days` makes a chore a habit — completing
one books the next.

That last part has a sharp edge worth knowing about: because ticking one books
tomorrow's immediately, a few absent-minded taps walk the series forward and
leave a row of finished chores behind. So the finished pile can be cleared in one
go, and a task opened after being ticked says so and offers the way back. The
checkbox is the only thing on a task row that ticks it; the rest opens the
editor.

### Groceries

Also the budget — two jobs on one screen because they're really the same job:
what goes in the cart is decided by what it costs. Checking an item off doesn't
delete it, it archives it onto a **shopping trip**, and that one decision makes
everything else free: spending history, a budget you can track, and a **price
book** (`grocery_price_book`, a view over past purchases) that remembers what you
last paid for a thing at a given store and pre-fills it next time.

### Pets

Exists mostly to answer "has anyone fed the cats?". Meals are logged per pet, per
slot, per day, with a unique index so two people tapping at once can't produce
two breakfasts. Litter and the rest run on the same countdown logic as home
systems (`data/cadence.js`).

### Systems

Upkeep with a clock on it rather than a date: due `interval_days` after
`last_done_on`. Suggests seasonal jobs based on the month and hides the ones you
already track, matched loosely so "clean gutters" and "Clean the gutters" aren't
offered twice.

### The calendar

Built on [series-not-occurrence](#the-data-model). The rest:

- **Repeat rules** are as much of RRULE as a household actually types: a
  frequency, an interval, a set of weekdays, and one of two ways to stop.
  `data/recurrence.js` expands them and — just as important — says them out loud,
  because the only way to know you built the rule you meant is to read it back in
  English.
- **Monthly and yearly rules clamp rather than skip.** A bill on the 31st lands
  on the 28th in February; a 29 February anniversary lands on the 28th in a
  normal year. RFC 5545 would drop those occurrences, which is correct by the
  spec and wrong for a house — the rent is still due.
- **One occurrence can disagree with its series.** `event_exceptions` holds
  cancellations and changes, keyed by the date the *rule* produced — which stays
  that occurrence's name even after it's moved, so moving one twice doesn't lose
  track of which it was. Editing a repeating event asks which you meant: this
  one, this and everything after, or all of them. "This and future" splits the
  series in two rather than rewriting history, so last term still looks like last
  term.
- **Day and Week are drawn to scale** on an hour grid. `data/layout.js` is pure
  geometry, and the awkward part it exists for is that "how wide is this block"
  isn't a property of the block: overlapping events are grouped into runs, packed
  into columns, then allowed to widen rightwards through any column nothing
  overlapping occupies. Otherwise a quiet morning is drawn as slivers because the
  afternoon is busy.
- **Chores sit in the all-day band**, not in the hours. They have a date and no
  time, and inventing 9am for the bins would be a lie the grid would then draw to
  scale.

### Bills

A bill is an event, the same way a shift is — so bills inherit recurrence, "skip
this month", calendar colours, visibility and RLS without a line of it being
written twice. Two nullable columns carry what an appointment doesn't need
(`amount_cents`, `autopay`); the precedent is `job_id`, which is just as
kind-specific.

**Money is integer cents everywhere.** `0.1 + 0.2` is the oldest bug in the trade
and rent is not the place to rediscover it.

**Paid is a row, not a flag.** "Rent" is one row and there are twelve answers a
year. `bill_payments` holds one row per settled occurrence, keyed on
`(event_id, occurrence_date)` — the same shape `work_shifts` uses, guarded by the
same `private.can_see_event()`. It records what *actually* left the account,
which is not always what was expected.

Three judgements:

- **An amount can be unknown.** A utility that varies is `null` and renders as
  `—`, never `$0` — a zero would quietly under-count every total. So totals read
  "$420 + 2 not yet priced" rather than pretending to be complete.
- **Autopay settles itself.** A bill the bank pays is settled once its date
  passes, whether or not anyone ticked it. Without that rule an autopay
  electricity bill grows one permanent "overdue" row a month until the widget is
  nothing but false alarms. It still shows *before* the date, because money about
  to move is worth knowing about.
- **Bills ignore the visible window.** Everything else on the calendar answers
  "what's happening in the days I'm looking at". A bill answers "what leaves the
  account soon", so paging to next March doesn't change the strip, and one that
  slipped last month stays visible. Overdue chores sit above the grid for the
  same reason.

### Earned

A shift is a `work` event on the calendar, not a second list. What's different is
that **scheduled and worked are allowed to disagree.** You book 6 to 3, clock in
at 6:07, lunch runs to an hour and a quarter, you leave at 2:40 — four numbers,
none of them nine hours. A `work_shifts` row records what the clock said, keyed by
`(event_id, occurrence_date)`.

You can punch in and out as the day goes, or type it in afterwards, and neither
is the "real" one: a clock you can't correct is worse than no clock, and a form at
the end of a nine-hour day never gets filled in.

- **Jobs** carry the rules that change the number: rate, unpaid break and the
  shift length that triggers it, overtime and what counts as a week for it, and
  the pay cycle. Overtime is a property of a *week*, not a shift — the ninth hour
  on Thursday is only overtime depending on what Monday to Wednesday came to —
  which is why it can't live in `resolveShift`. Where a job has both a daily and
  a weekly rule, the greater applies and no hour is counted twice.
- **A past shift with nothing recorded** counts at its booked hours, so a total
  is never wrong by a whole day, then is listed as a guess with one tap to
  confirm. Counting nothing would be quietly wrong; counting it silently, worse.
- **`dates.js` owns the midnight-wrap rule** in one place: an end at or before the
  start means the span crossed midnight. 10pm–6am is eight hours, not minus
  sixteen.

This is deliberately **not payroll**. No tax, withholding, PTO accrual, shift
differentials or employer rounding. Breaks and overtime are modelled because they
move the hours by amounts you'd notice; everything past that varies by state,
employer and week, and a number that's confidently wrong about your pay is worse
than no number. `take_home_pct` is the one concession — a single percentage read
off a real payslip, labelled as the estimate it is.

### Hobbies

All share one table, one hook and one view. Adding a hobby is one entry in
`data/collections.js`; the database keeps per-hobby fields in a `jsonb` column,
so there's no migration either.

#### How a hobby looks

The hobby screens were bland for a structural reason: a domain spec could
describe its vocabulary and nothing else, so `CollectionView` had no choice but
to render every domain as the same list. The fix was to let a spec describe its
own presentation.

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
guessed by the same sort of keyword table `data/rooms.js` uses. An unrecognised
service isn't a problem — it stays plain text rather than disappearing into an
uncoloured pill.

**Shelf** is the platinum case. A platinum isn't a finished game, it's a thing you
keep — the one status in the app that's a reward rather than a state — so it gets
a display case instead of another row. Trophies are drawn rather than uploaded:
real cover art would mean Storage, a per-item upload and a fallback for when it's
missing, and what a platinum commemorates is the achievement.

The case is **the one surface that ignores the skin**. Every other screen is a
room in the house and gets painted to match; a display case is a dark box with a
light in it and looks the same whatever colour the walls are. Its tokens live in
one block in `index.css` outside the palettes, and reach the app through `shelf`
in `theme.js` rather than `colors` — so one can't be reached for by accident
somewhere it would look wrong.

If you add a platform: on the shelf the console colour is a wash of light behind
the trophy, not coloured text. These colours carry white text on a light row, and
none clears 4.5:1 against a near-black case — as a glow it's decorative, while the
label under it stays legible at 7.25:1.

A domain with no `presentation` key renders exactly as before, which is what
`book`, `making` and `build` still do.

### The wishlist

A collection domain (`wish`), not a new section type — it gets the whole
collection engine for nothing. The only machinery it needed was `totals` in the
presentation spec.

The total splits by status, because "everything I want" is a fantasy number and
"everything I'm saving for" is a plan, and showing one without the other makes a
wishlist either depressing or useless. It says how many things have no price,
since a total that quietly ignores twelve items is worse than no total.

It's `standalone` — its own nav entry rather than living behind Hobbies — and
excluded from `ALL_HOBBY_DOMAINS` so "3 things on the go" never counts a saw you
haven't bought. Price checking is manual: scraping retailers is fragile and the
legality is murky, so there's a "last checked" field and an honest date.

### Meals and Facts

**Meals carry their ingredients**, so a week's dinners can be pushed onto the
grocery list in one tap — priced from the price book, deduplicated against what's
already there, and sorted into aisles by the same keyword guesser.

**Facts** is the reference sheet: filter sizes, paint colours, model numbers.
Values marked secret are masked until tapped, which is cover from a glance at the
kitchen tablet and **not** encryption; they're stored in plain text like
everything else.

### Nudges, and coming back

`data/nudges.js` is a pure function over already-loaded data: it gathers what's
genuinely late across chores, systems and pets into one ranked row on the
dashboard. `supabase/functions/daily-digest` applies the same rules server-side
for an optional email.

Tend is for people with lives, so it will regularly go unopened for days. The
naive result is punishing: open it on Thursday and every chore since Sunday is
sitting there in red, each labelled with how late you are. That's a scoreboard of
failures, and the honest response to one is to close the app.

`data/catchup.js` handles the return. The idea it turns on is that **most of those
rows don't represent work that's owed** — you don't sweep the floor twice because
you skipped Tuesday. So overdue work splits in two:

- **Rhythm rolls.** A repeat of a week or less, at least two days late, is a
  dropped beat rather than a debt. The card offers to re-date the lot to today in
  one tap. It does *not* mark them done — they weren't, and recording work that
  never happened would corrupt the only thing the app is for.
- **Everything else stands.** Fortnightly and longer upkeep, and every one-off,
  stays exactly as late as it is. A missed furnace filter is a real fact about
  your house, and softening it would be lying to you.

Three days is the threshold (`AWAY_DAYS`); below that a gap is just a weekend.
`useLastSeen.js` supplies the absence, stored per device in localStorage — one
fewer migration, and "this screen hasn't been looked at in a while" is arguably
the truer reading. The kitchen display never stamps it: that tablet is signed in
permanently and would otherwise report a visit every minute of every day.

**Deliberately absent: streaks.** They're the most reliable way an app like this
becomes a source of shame, and the whole section above is an argument against
them.

### Weather, and why it isn't a section

`data/weather.js` talks to Open-Meteo, which needs no API key and sends CORS
headers — so it's a plain fetch from the browser with no proxy, no secret and no
edge function. The place is geocoded once and stored as lat/long in household
settings; the forecast is cached in localStorage for an hour, which matters
mostly because the kitchen tablet is left running for days.

It has no section of its own on purpose. Weather alone is something your phone
does better. What Tend can do that a weather app can't is join it to the list: an
outdoor chore booked for the only wet day of the week, with the dry one named —
and a freeze in the forecast, which makes work for you whether or not anything was
on the list. Both live in `data/nudges.js`.

### Sections you can switch off

An app that shows everyone everything eventually shows most people mostly noise,
so the section list is a household preference: **Household & account → What Tend
looks after**.

Home and Chores are the exceptions (`CORE_SECTIONS` in `nav.js`). Home is the
landing route and the fallback for anything unrecognised; chores are the question
the whole app was built to answer — a Tend without them isn't a smaller Tend, it's
a different program.

Switching a section off isn't cosmetic:

- it leaves the desktop nav and the phone's More sheet, and a nav **group** that
  empties out goes with it;
- the phone tab bar backfills in nav order, so turning off Groceries pulls the
  next section up rather than leaving a gap;
- its route stops resolving, so an old deep link lands on Home;
- its dashboard card disappears and the grid collapses to full width;
- and **the hook behind it stops fetching and drops its realtime channel.**

It's a household setting rather than a personal one because these are shared
screens in a shared house. Genuinely personal preferences stay personal — which
skin you're in, and how long since *this device* saw the dashboard.

Not done yet: first-run doesn't ask. New households get everything and trim from
the panel. Asking during onboarding needs the picker to run before
`create_household`, which is an RPC — a migration rather than a screen.

### The kitchen display

`#/hub` is full-screen for a tablet or TV on a wall: the time, what's on today,
tonight's dinner, whether the animals have been fed, the next four days. No nav,
nothing small, nothing that scrolls — if it doesn't fit it doesn't belong. Sizes
are in `vmin` so the same layout works on a 10" tablet and a 40" TV without a
breakpoint, and it rolls over at midnight on its own because everything derives
from a clock that ticks on the minute (`useWallClock.js`).

It asks for a screen wake lock, which most devices only honour if their own
timeout allows it — hence the per-device setup guides behind the **Kitchen
display** button on the Calendar page. It sits behind the normal auth gate: sign
the device in once and leave it.

### Skins

Two independent dials, both stamped on `<html>` by a boot script in `index.html`
before first paint so there's no flash of the wrong one:

- **`data-palette`** — `warm`, `calm`, `garden`, `dusk`.
- **`data-mode`** — `light` or `dark`, resolved from the OS when the stored
  preference is "match device", and kept in sync if the OS changes.

Warm is deliberately left at the original handoff values, which sit nearer 3:1 on
the faintest secondary text — changing them would change the look the app was
designed around.

---

## Native: the iOS app

Capacitor shell around the same web build, plus a WidgetKit extension. **No
second codebase** — the Swift is the shell, the widgets, and the bridge between
them. Full detail in [docs/ios.md](docs/ios.md); the endpoint contract is
[docs/ios-widget.md](docs/ios-widget.md).

Three things worth knowing from the JS side:

- **`npm run ios:sync` after every web change.** Assets are bundled, not loaded
  from a URL, so an unsynced change isn't in the app.
- **`data/native.js` no-ops on the web.** Every export is safe to call in a
  browser, which is what keeps `isNative` checks out of the views.
- **The widget can't see `localStorage`.** The token reaches the extension
  through an App Group, via a small Swift plugin — Calendar → 📱 Widget → *Use on
  this phone* is the handoff.

Two widgets, both reading `widget_agenda`: **Bills** and **Agenda**, each in three
home-screen sizes plus lock screen. `#/widget/<token>` renders the same payload in
a browser — it exists so the native rendering has something to be compared
against. If the two disagree, one of them is wrong.

Notifications are native APNs, not Web Push: Web Push only fires for a Safari
home-screen install and does nothing inside a Capacitor webview, so the app would
have been the one place notifications didn't arrive.

---

## Where things live

```
src/
  main.jsx           # providers + service worker registration
  App.jsx            # THE MAP: gates, routing, view switching — read this first
  nav.js             # the destination list, shared by both navs
  theme.js           # design tokens, as CSS custom property references
  index.css          # the four palettes, light and dark
  dates.js           # week / "today" / time-of-day, and the midnight-wrap rule
  useHashRoute.js    # dependency-free hash router
  useLastSeen.js     # how long since this device saw the dashboard
  useWallClock.js    # a clock that ticks on the minute, + wake lock
  lib/supabase.js    # the configured browser client
  auth/              # AuthProvider, SignIn, ResetPassword
  household/         # HouseholdProvider, Onboarding, HouseholdModal (settings)
  data/              # one hook per section, plus the pure rule modules:
    recurrence.js    #   repeat rules: expansion, and saying them in English
    layout.js        #   packing overlapping events into columns
    pay.js           #   breaks, overtime, pay periods
    bills.js         #   money in cents; "settled" and "overdue"
    nudges.js        #   what counts as slipping
    catchup.js       #   what to forgive after an absence
    cadence.js       #   countdowns for systems and pet care
    collections.js   #   every hobby's vocabulary and presentation
    native.js        #   iOS-only: widget handoff, push, deep links
  components/        # nav, modals, shared UI. No data fetching.
  views/             # one per section. Presentational.
ios/
  add-widget-target.rb  # re-adds the widget extension after a `cap sync`
  App/App/           # the Capacitor shell + TendBridgePlugin.swift
  App/Shared/        # compiled into BOTH targets: models, API client, theme
  App/TendWidget/    # the WidgetKit extension — Bills and Agenda
docs/
  ios.md             # the iOS app: build workflow, widgets, push, what's left
  ios-widget.md      # the endpoint contract: payload schema and security shape
supabase/functions/
  daily-digest/      # the once-a-day email (dormant until configured)
  push-reminders/    # APNs bill reminders (dormant until configured)
public/
  sw.js              # network-first service worker (installability, not offline)
```

The schema, RLS policies and the RPCs live as Supabase migrations on the project,
not in this repo.

Both edge functions are **dormant by default** and send nothing until their
secrets exist, a household opts in, and a `pg_cron` schedule is created. The
steps are in a comment at the bottom of each. Deploying one alone does nothing —
nobody should discover their house started emailing them because a deploy went
out.

---

## Performance

Home and Chores ship in the initial bundle — one is where you land, the other is
where most people go next. Every other view is a `lazy()` chunk fetched when
opened, behind one `Suspense` boundary around the content area only, so the nav
never flickers. That took first load from a single 604 kB bundle to ~500 kB
across two files (144 kB gzipped, down from 164 kB), with each section arriving
as 2–21 kB when asked for.

The other lever is `{ enabled }`: a switched-off section costs no query and no
realtime channel. See [convention 2](#2-switched-off-sections-cost-nothing).

---

## Ideas for next

- **Custom hobbies.** The `collection_domains` table exists and is empty. The app
  still reads `DOMAINS` from code; the remaining work is a merged registry and the
  editor UI. Ship starter templates rather than a blank editor.
- **Clocking in from the widget.** The widget is read-only today. The write path
  would be a second `SECURITY DEFINER` function taking the same token, confined to
  one row shape in `work_shifts`, exposed as an `AppIntent` so the button works
  without launching the app — the same pattern `sitter_toggle_meal` already uses.
- **Paying a bill from the widget**, on exactly the same shape, writing one row to
  `bill_payments`.
- **Asking about sections during onboarding.** Needs the picker to run before
  `create_household`, so it's a migration rather than a screen.
- **Subscribing to an external calendar** (a school's published `.ics`). Needs an
  edge function to fetch and parse it, since a browser can't for CORS, and a
  decision about how imported events map onto the repeat rules.
- **A test suite**, starting with the pure modules — `recurrence.js`, `pay.js`,
  `bills.js`, `layout.js`, `catchup.js`. They were written to be testable and
  currently aren't tested.
- **Hiding a wishlist from the household.** Everything is household-scoped in RLS,
  so "don't show my partner this list" has no expression yet — relevant if it's
  ever used for gift ideas.
- Email invites alongside the shareable join code.
- Photos on workshop projects and pets (Supabase Storage).
- Turn on leaked-password protection in the Supabase auth settings — it's a
  dashboard toggle and the linter flags it.
