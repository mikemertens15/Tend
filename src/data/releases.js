// The release log. Hand-written on purpose: a generated changelog lists
// commits, and what you actually want to read six months later is what
// changed about *using* the thing.
//
// Adding a release: bump `version` in package.json to match the top entry
// here, and write the notes in the same voice — what you can now do, not what
// was refactored to allow it.

export const RELEASES = [
  {
    version: '1.0.0',
    date: '2026-08-16',
    name: 'Settled in',
    notes: [
      [
        'changed',
        "Version one. Nothing moved today — this is the same Tend as yesterday, with a number on it that says it's finished enough to lean on. It started as a board that answered one question every week: what needs doing. It now runs the chores room by room, the week's dinners, the shopping and what it costs, the animals, the upkeep with a clock on it, the calendar, the reference sheet, the wishlist, what the month has earned, and the half of life that isn't housework.",
      ],
      [
        'changed',
        "It also knows when you've been away and doesn't hold it against you, hands the whole feeding routine to a sitter who has no account, puts itself on the kitchen wall, and lets you switch off every part of it you don't want.",
      ],
      [
        'changed',
        'What comes next arrives as updates rather than a rewrite: hobbies you invent yourself, notifications on your phone, and a proper home-screen widget.',
      ],
    ],
  },
  {
    version: '0.14.0',
    date: '2026-08-16',
    name: 'What it comes to',
    notes: [
      [
        'added',
        "Weather on the calendar, and where it actually helps: Tend now notices when the one outdoor job you have is booked for the only wet day of the week, and tells you which day is dry. It also spots a freeze coming, which is the one bit of weather that makes work for you whether or not it was on the list.",
      ],
      [
        'added',
        "A wishlist, with the sum at the bottom. Split by how much you actually mean it \u2014 \"everything I want\" is a fantasy number and \"everything I'm saving for\" is a plan, and seeing both is the point. It's honest about what it's missing, too: anything with no price on it gets counted and said out loud.",
      ],
      [
        'added',
        'Earned. Put a shift on the calendar with a start and an end, set your hourly rate once, and Tend keeps a running total for the month \u2014 what you\u2019ve earned, what\u2019s still booked, and where the month lands. No bank, no receipts, nothing to import. Night shifts that cross midnight count as the hours they are.',
      ],
      [
        'changed',
        'The app no longer downloads all of itself before showing you anything. Each section arrives when you open it, which is the difference between fine on wifi and fine on a phone in a supermarket car park.',
      ],
    ],
  },
  {
    version: '0.13.0',
    date: '2026-08-16',
    name: 'The platinum shelf',
    notes: [
      [
        'added',
        'Platinums get a shelf. Every game you saw all the way through now stands in a lit display case with its own trophy, rather than sitting in a list under a heading — because a platinum is a thing you keep, not a state a game is in.',
      ],
      [
        'added',
        'Consoles have colours. A game wears its platform, so you can tell at a glance what your backlog is actually on, and each trophy stands in a wash of its console\'s colour.',
      ],
      [
        'added',
        'Shows and films are colour-coded by service, worked out from whatever you typed — "Max (was HBO)" and "netflix" both land right. Anything it doesn\'t recognise is left alone.',
      ],
      [
        'changed',
        'How a hobby looks is now part of what a hobby is, rather than something the one shared screen decides. Books, Workshop and Builds are unchanged — for now.',
      ],
    ],
  },
  {
    version: '0.12.0',
    date: '2026-08-16',
    name: 'Only what you use',
    notes: [
      [
        'added',
        "Tend does a lot now, and not all of it is for everyone. Under your household settings, \"What Tend looks after\" switches off the sections you don't want — Meals, Pets, Systems, Facts, whichever. Home and Chores stay; they're the app rather than features of it.",
      ],
      [
        'added',
        "Switching one off actually removes it. It leaves the menu, its page stops opening, its card leaves the dashboard, and Tend stops loading its data at all — so a household that doesn't keep animals isn't quietly reading three pet tables every time someone opens the app.",
      ],
      ['changed', 'The phone tab bar fills the gap. Turn off Groceries and the next section moves up instead of leaving a hole.'],
      ['changed', "Anything added in a future release shows up switched on, so you'll see it — and can switch it off in one tap."],
    ],
  },
  {
    version: '0.11.0',
    date: '2026-08-16',
    name: 'Right where you left it',
    notes: [
      [
        'added',
        "Come back after a few days and Tend now says so, instead of showing you a wall of red. Anything on a rhythm of a week or less — the dishes, the bins — moves to today in one tap, because you don't sweep the floor twice for having skipped Tuesday. It doesn't tick them off; they didn't happen. It just stops pretending you owe four of them.",
      ],
      [
        'added',
        "What genuinely waited still says so. The furnace filter, the fortnightly jobs and anything one-off keep their real dates — that's a fact about your house, not a mood.",
      ],
      ['changed', 'While the welcome back is up, "Needs you" stops repeating the overdue count underneath it.'],
    ],
  },
  {
    version: '0.10.1',
    date: '2026-08-12',
    name: 'Where did it go',
    notes: [
      ['fixed', 'Anything marked Shared vanished the moment it was saved. The person filter defaults to you, and a shared item has no owner, so it matched nobody — and in a one-person household the filter buttons aren\'t drawn, so there was no way to get it back. Shared things now show under everyone\'s filter, which is what shared means.'],
      ['fixed', 'The same bug hid chores assigned to "Anyone" whenever a person filter was on.'],
      ['changed', 'An empty list now says whether it\'s actually empty or just filtered, with a button to clear the filter.'],
    ],
  },
  {
    version: '0.10.0',
    date: '2026-08-11',
    name: 'On the kitchen wall',
    notes: [
      ['added', 'A kitchen display: full-screen, readable across a room, and built to be left on. The time, what\'s on today, tonight\'s dinner, whether the animals have been fed, and the next four days. Setup guides for iPad, Android and a mounted TV live on the Calendar page.'],
      ['added', 'The calendar holds events now, not just chores — birthdays that work out which one it is, appointments with times, trips that span days, and anything else the house is doing.'],
      ['added', 'Month view, alongside the week.'],
      ['added', 'Four colour schemes — Warm, Calm, Garden and Dusk — each in light and dark, or matching your device. The three new ones were checked against WCAG AA.'],
    ],
  },
  {
    version: '0.9.0',
    date: '2026-08-11',
    name: 'Hand it over',
    notes: [
      ['added', 'Sitter mode — share a link and whoever is watching the house gets the feeding routine, the care jobs, the vet\'s number and anything you\'ve marked shareable. They can tick meals off as they go. No account, and they see nothing else.'],
      ['added', 'Meals know what they need. Write the ingredients once, then push a whole week onto the grocery list in one tap, priced from what you last paid.'],
      ['added', '"Needs you" on the home dashboard — everything actually slipping, gathered from every section into one row.'],
      ['added', 'Seasonal jobs. Tend knows what month it is and suggests the upkeep that goes with it — gutters and the furnace in autumn, the AC in spring.'],
      ['added', 'An optional daily email digest, sent only on days something is genuinely late. Off until you switch it on.'],
    ],
  },
  {
    version: '0.8.0',
    date: '2026-08-11',
    name: 'Room by room',
    notes: [
      ['changed', 'Chores are organised by room instead of one long list — each room is a card with its own progress ring, busiest room first.'],
      ['added', '"Got a minute?" — say how long you have and Tend shows only the chores that fit.'],
      ['added', 'Chores can carry a room and a rough time estimate. Type "dishes" and it picks the kitchen for you.'],
      ['added', 'A room-by-room summary on the home dashboard.'],
      ['removed', 'Vehicles. Car maintenance is moving to its own app, GarageOps. The two car tasks that existed were kept and filed under Garage rather than deleted.'],
    ],
  },
  {
    version: '0.7.0',
    date: '2026-08-11',
    name: 'Pets, prices and a dark room',
    notes: [
      ['added', 'Pets — feeding checklists for each cat, litter and care countdowns, vet visits and weights.'],
      ['added', 'Groceries grew a budget: prices per item, your stores, aisle grouping, and a finished trip that files against a weekly or monthly target.'],
      ['added', 'Price memory — Tend remembers what you last paid for something and where, and fills it in next time.'],
      ['added', 'Recurring chores. Check off "trash night" and the next one books itself.'],
      ['added', 'House facts — filter sizes, paint colours, model numbers, the wifi password.'],
      ['added', 'A dark wall-display skin, and Tend now installs to a phone or tablet home screen.'],
      ['added', 'This release log, and the version chip that opens it.'],
      ['changed', 'Games lost their notes field and trophy counters. A game is now backlog, playing, finished or platinum — plus whether you\'re going for it.'],
      ['fixed', 'Adding a game left it in the backlog with no way to say you were already playing it, so the "in progress" count read 0. The form asks now.'],
      ['fixed', 'New workshop projects and builds landed with a status their lists didn\'t have, so they never appeared at all.'],
      ['removed', 'Fitness. A dedicated app already does it better, and a half-used section is worse than no section.'],
    ],
  },
  {
    version: '0.6.0',
    date: '2026-08-02',
    name: 'Hobbies on one spine',
    notes: [
      ['added', 'Hobbies: games, shows, movies, books, workshop projects and side builds, all behind one landing page.'],
      ['changed', 'Every hobby now runs on one shared table and one shared view, described by a spec file. Picking up a new hobby is a few lines, not a new feature.'],
    ],
  },
  {
    version: '0.5.0',
    date: '2026-07-03',
    name: 'The shared list',
    notes: [['added', 'A grocery list the whole household edits at once, syncing live between phones.']],
  },
  {
    version: '0.4.0',
    date: '2026-07-03',
    name: 'Just let me in',
    notes: [
      ['added', 'Password sign-in, so coming back doesn\'t mean waiting on an email.'],
      ['added', 'Password reset, and somewhere to change it later.'],
    ],
  },
  {
    version: '0.3.0',
    date: '2026-07-03',
    name: 'Life beyond the house',
    notes: [
      ['added', 'Meals — plan the week\'s dinners and who\'s cooking.'],
      ['added', 'Goals — the bigger things, with a target date.'],
      ['added', 'A watchlist for shows and films, later folded into Hobbies.'],
    ],
  },
  {
    version: '0.2.0',
    date: '2026-06-27',
    name: 'A real backend',
    notes: [
      ['added', 'Accounts and households: create one, share the join code, everyone sees the same data.'],
      ['added', 'Live sync — check a chore off on your phone and it\'s checked on the tablet.'],
      ['changed', 'Vehicles and home systems moved out of demo data and into the database.'],
    ],
  },
  {
    version: '0.1.0',
    date: '2026-06-27',
    name: 'First light',
    notes: [
      ['added', 'Home, Chores, Vehicles, Systems and Calendar, built from the "Warm & homey" design direction.'],
      ['added', 'Everything stored in the browser, which was enough to find out whether the idea held up.'],
    ],
  },
];

export const CURRENT = RELEASES[0];

// Build stamps injected by vite.config.js.
export const BUILD = {
  version: typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : CURRENT.version,
  commit: typeof __APP_COMMIT__ === 'string' ? __APP_COMMIT__ : 'dev',
  builtAt: typeof __APP_BUILT_AT__ === 'string' ? __APP_BUILT_AT__ : null,
};
