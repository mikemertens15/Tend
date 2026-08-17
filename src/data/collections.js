// Every "collection-shaped" hobby — a list of things with a lifecycle, an
// owner, a rating and maybe some progress — is described by a spec here rather
// than by its own table, hook, view and modal.
//
// Adding a hobby means adding one entry to DOMAINS and listing it in a section
// below. The shared useCollection hook and CollectionView read the spec for
// vocabulary, fields and layout; the database stores the extra fields in a
// jsonb column, so no migration is needed either.
//
// Spec shape:
//   noun / label      singular and plural names
//   titlePlaceholder  example text for the title input
//   noteLabel         what the shared `note` column means here. null drops the
//                     note field entirely — not every hobby has something to
//                     write down.
//   statuses          the lifecycle, in display order. `short` is the row
//                     toggle, `long` the section heading. The first entry is
//                     where new items land.
//   fields            extra inputs, stored in `details`. `meta: true` puts the
//                     value in the row's subtitle line.
//   progress          enables the progress bar and names its unit
//   presentation      how the domain *looks*. See PRESENTATION below.
//
// Presentation belongs in the spec rather than in the view, and that's the
// whole reason the hobby screens stopped being one bland list. A domain that
// can only describe its vocabulary can only ever be rendered generically. The
// same key is what a household-defined hobby will fill in later, so a custom
// collection can look like something too, rather than being the one shape the
// app can't dress up.
//
//   presentation: {
//     tint:  { field, guess }  which field colours an item, and how the colour
//                              is found — from the chip option's own third
//                              element, or by keyword when the field is free
//                              text.
//     shelf: { status, … }     one status displayed as a case of trophies
//                              instead of a list. For the things you keep
//                              rather than the things you did.
//   }

// Console colours. Recognisably each platform's own, but darkened where the
// brand value wouldn't clear 4.5:1 against the white text sitting on it — a
// label you can't read is worse than one that's slightly off-brand.
const PLATFORMS = [
  ['PlayStation', 'PlayStation', '#0064c8'],
  ['PC', 'PC', '#4b5563'],
  ['Switch', 'Switch', '#c4111f'],
  ['Xbox', 'Xbox', '#0f7b0f'],
  ['Mobile', 'Mobile', '#0f766e'],
];

// Where to watch is free text — "Netflix", "netflix", "Max (was HBO)" — so its
// colour is guessed from what you typed, the same way rooms.js guesses a room
// and useGroceries guesses an aisle. A pre-selection you can ignore, never a
// claim: anything unrecognised just stays uncoloured.
const SERVICE_TINTS = [
  [/netflix/i, '#b1060f'],
  [/disney|disney\+/i, '#1a3a8f'],
  [/prime|amazon/i, '#0b7285'],
  [/max|hbo/i, '#4c2a9c'],
  [/apple ?tv|apple/i, '#3f4650'],
  [/hulu/i, '#0f7b3f'],
  [/paramount/i, '#0055a8'],
  [/peacock/i, '#8a3d10'],
  [/theat|cinema/i, '#8a5a1e'],
  [/youtube/i, '#a3160f'],
];

export const DOMAINS = {
  game: {
    key: 'game',
    noun: 'Game',
    label: 'Games',
    titlePlaceholder: 'e.g. Elden Ring',
    // No notes: there's never anything to say about a game that the status and
    // the platinum flag don't already say.
    noteLabel: null,
    // "Platinum" is deliberately its own terminal state, not a flag on
    // Finished — a platinum run is a different thing from rolling credits.
    statuses: [
      { key: 'backlog', short: 'Backlog', long: 'Backlog' },
      { key: 'active', short: 'Playing', long: 'Playing now' },
      { key: 'done', short: 'Finished', long: 'Finished', rate: true },
      { key: 'platinum', short: 'Platinum', long: 'Platinum shelf', rate: true },
    ],
    fields: [
      {
        key: 'platform',
        label: 'Platform',
        type: 'chips',
        meta: true,
        options: PLATFORMS,
      },
      {
        key: 'intent',
        label: 'Going for the platinum?',
        type: 'chips',
        meta: true,
        // Stored values stay 'fun' / 'completion' from when this was a broader
        // "playing it for…" question, so existing rows keep their answer.
        options: [
          ['completion', 'Platinum run'],
          ['fun', 'Just playing'],
        ],
      },
    ],
    // Trophy counts were more bookkeeping than they were worth — the platinum
    // shelf and the flag above carry the whole story.
    progress: null,
    presentation: {
      tint: { field: 'platform' },
      // A platinum isn't a finished game, it's a thing you keep — so it gets a
      // case rather than another row in a list. This is the one status in the
      // app that's a reward instead of a state.
      shelf: {
        status: 'platinum',
        heading: 'The platinum shelf',
        blurb: 'Everything you saw all the way through.',
      },
    },
  },

  show: {
    key: 'show',
    noun: 'Show',
    label: 'Shows',
    titlePlaceholder: 'e.g. Severance',
    noteLabel: 'Notes',
    statuses: [
      { key: 'backlog', short: 'Want', long: 'Want to watch' },
      { key: 'active', short: 'Watching', long: 'Watching' },
      { key: 'done', short: 'Watched', long: 'Watched', rate: true },
    ],
    fields: [
      { key: 'service', label: 'Where to watch', type: 'text', meta: true, placeholder: 'e.g. Netflix, Max' },
      {
        key: 'company',
        label: 'Watching it…',
        type: 'chips',
        meta: true,
        options: [
          ['together', 'Together'],
          ['solo', 'On my own'],
        ],
      },
    ],
    progress: { label: 'Episodes', current: 'Watched', total: 'Total' },
    presentation: { tint: { field: 'service', guess: SERVICE_TINTS } },
  },

  movie: {
    key: 'movie',
    noun: 'Movie',
    label: 'Movies',
    titlePlaceholder: 'e.g. Dune: Part Two',
    noteLabel: 'Notes',
    statuses: [
      { key: 'backlog', short: 'Want', long: 'Want to watch' },
      { key: 'active', short: 'Watching', long: 'Watching' },
      { key: 'done', short: 'Watched', long: 'Watched', rate: true },
    ],
    fields: [
      { key: 'service', label: 'Where to watch', type: 'text', meta: true, placeholder: 'e.g. Max, theaters' },
      {
        key: 'company',
        label: 'Watching it…',
        type: 'chips',
        meta: true,
        options: [
          ['together', 'Together'],
          ['solo', 'On my own'],
        ],
      },
    ],
    progress: null,
    presentation: { tint: { field: 'service', guess: SERVICE_TINTS } },
  },

  book: {
    key: 'book',
    noun: 'Book',
    label: 'Books',
    titlePlaceholder: 'e.g. The Three-Body Problem',
    noteLabel: 'Takeaways',
    statuses: [
      { key: 'backlog', short: 'To read', long: 'Want to read' },
      { key: 'active', short: 'Reading', long: 'Reading now' },
      { key: 'done', short: 'Read', long: 'Finished', rate: true },
    ],
    fields: [
      { key: 'author', label: 'Author', type: 'text', meta: true, placeholder: 'e.g. Cixin Liu' },
      {
        key: 'category',
        label: 'What kind?',
        type: 'chips',
        meta: true,
        options: ['Nonfiction', 'Sci-fi', 'Fiction', 'Other'],
      },
      {
        key: 'format',
        label: 'Format',
        type: 'chips',
        meta: true,
        options: ['Print', 'Ebook', 'Audio'],
      },
    ],
    progress: { label: 'Pages', current: 'On page', total: 'of' },
  },

  making: {
    key: 'making',
    noun: 'Project',
    label: 'Projects',
    titlePlaceholder: 'e.g. Walnut side table',
    noteLabel: 'Plan & notes',
    statuses: [
      { key: 'idea', short: 'Idea', long: 'Ideas' },
      { key: 'planned', short: 'Planned', long: 'Planned' },
      { key: 'active', short: 'Building', long: 'On the bench' },
      { key: 'done', short: 'Done', long: 'Finished', rate: true },
    ],
    // Deliberately broader than woodworking so dot painting, music and
    // whatever comes next slot in without a new module.
    fields: [
      {
        key: 'craft',
        label: 'Craft',
        type: 'chips',
        meta: true,
        options: ['Woodworking', 'Dot painting', 'Music', 'Other'],
      },
      { key: 'material', label: 'Materials', type: 'text', meta: true, placeholder: 'e.g. Walnut, 4/4 rough' },
      { key: 'dimensions', label: 'Dimensions', type: 'text', placeholder: 'e.g. 18" × 18" × 24"' },
    ],
    progress: null,
  },

  build: {
    key: 'build',
    noun: 'Build',
    label: 'Builds',
    titlePlaceholder: 'e.g. Tend',
    // The single most useful field for a side project: what gets you back in
    // after two weeks away.
    noteLabel: 'Next step',
    statuses: [
      { key: 'idea', short: 'Idea', long: 'Ideas' },
      { key: 'active', short: 'Building', long: 'Building' },
      { key: 'shipped', short: 'Shipped', long: 'Shipped', rate: true },
      { key: 'parked', short: 'Parked', long: 'Parked' },
    ],
    fields: [
      { key: 'stack', label: 'Stack', type: 'text', meta: true, placeholder: 'e.g. React, Supabase' },
      { key: 'url', label: 'Link', type: 'text', placeholder: 'Repo or live URL' },
    ],
    progress: null,
  },
};

// Nav sections. A section can hold more than one domain — Screen keeps shows
// and movies side by side behind a toggle, the way the old Watchlist did.
export const HOBBY_SECTIONS = [
  { key: 'games', label: 'Games', icon: '🎮', blurb: 'Backlog, platinums, what to play next', domains: ['game'] },
  { key: 'screen', label: 'Screen', icon: '📺', blurb: 'Shows and movies across every service', domains: ['show', 'movie'] },
  { key: 'books', label: 'Books', icon: '📚', blurb: 'Reading now, up next, what stuck', domains: ['book'] },
  { key: 'workshop', label: 'Workshop', icon: '🪵', blurb: 'Woodworking and everything else you make', domains: ['making'] },
  { key: 'builds', label: 'Builds', icon: '⌨️', blurb: 'The apps you keep starting', domains: ['build'] },
];

export const ALL_HOBBY_DOMAINS = Object.keys(DOMAINS);

export const sectionByKey = (key) => HOBBY_SECTIONS.find((s) => s.key === key) ?? null;

// Every key a domain keeps in `details`, so the hook knows what to split out.
export const detailKeys = (domain) => (DOMAINS[domain]?.fields ?? []).map((f) => f.key);

export const statusMeta = (domain, status) =>
  DOMAINS[domain]?.statuses.find((s) => s.key === status) ?? { key: status, short: status, long: status };

// Where a new item in this domain starts. Not every lifecycle opens with
// "backlog" — a workshop project starts as an idea — and an item whose status
// isn't in its domain's vocabulary renders in no group at all, i.e. vanishes.
export const firstStatus = (domain) => DOMAINS[domain]?.statuses[0]?.key ?? 'backlog';

// The statuses that mean "started but not finished", for the counts on the
// hobbies landing page and the home dashboard.
export const isUnderway = (item) => item.status === 'active';

// Chip options are a bare string, a [value, label] pair, or a
// [value, label, colour] triple. The colour is optional everywhere it's read.
export const optionValue = (opt) => (Array.isArray(opt) ? opt[0] : opt);
export const optionLabel = (opt) => (Array.isArray(opt) ? opt[1] : opt);
export const optionColor = (opt) => (Array.isArray(opt) ? (opt[2] ?? null) : null);

// The colour for one item, or null. Two ways to arrive at one:
//   - the field is chips, and the chosen option carries its own colour;
//   - the field is free text, and a keyword pattern recognises what was typed.
// Null is the normal answer — nothing here is required, and an item with no
// tint just renders the way everything did before.
export function itemTint(spec, item) {
  const tint = spec?.presentation?.tint;
  if (!tint) return null;
  const raw = item?.[tint.field];
  if (!raw) return null;

  if (tint.guess) {
    return tint.guess.find(([re]) => re.test(String(raw)))?.[1] ?? null;
  }
  const field = spec.fields?.find((f) => f.key === tint.field);
  const opt = field?.options?.find((o) => optionValue(o) === raw);
  return opt ? optionColor(opt) : null;
}

// The label that carries the tint, so the row can render it as a coloured pill
// rather than dropping it into the joined subtitle text.
export function tintedLabel(spec, item) {
  const key = spec?.presentation?.tint?.field;
  if (!key || !item?.[key]) return null;
  const field = spec.fields?.find((f) => f.key === key);
  const opt = field?.options?.find((o) => optionValue(o) === item[key]);
  return opt ? optionLabel(opt) : String(item[key]);
}

// The status this domain shows as a case of trophies, if it has one.
export const shelfFor = (spec, statusKey) =>
  spec?.presentation?.shelf?.status === statusKey ? spec.presentation.shelf : null;
