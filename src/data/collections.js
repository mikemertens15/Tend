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
//   noteLabel         what the shared `note` column means here
//   statuses          the lifecycle, in display order. `short` is the row
//                     toggle, `long` the section heading.
//   fields            extra inputs, stored in `details`. `meta: true` puts the
//                     value in the row's subtitle line.
//   progress          enables the progress bar and names its unit

export const DOMAINS = {
  game: {
    key: 'game',
    noun: 'Game',
    label: 'Games',
    titlePlaceholder: 'e.g. Elden Ring',
    noteLabel: 'Notes',
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
        options: ['PlayStation', 'PC', 'Switch', 'Xbox', 'Mobile'],
      },
      {
        key: 'intent',
        label: 'Playing it for…',
        type: 'chips',
        meta: true,
        options: [
          ['fun', 'Just playing'],
          ['completion', 'Going for platinum'],
        ],
      },
    ],
    progress: { label: 'Trophies', current: 'Earned', total: 'Total' },
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

// Chip options are either a bare string or a [value, label] pair.
export const optionValue = (opt) => (Array.isArray(opt) ? opt[0] : opt);
export const optionLabel = (opt) => (Array.isArray(opt) ? opt[1] : opt);
