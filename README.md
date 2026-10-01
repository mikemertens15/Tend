# Tend

A home hub for one person or a whole household. Keep chores, errands, family plans, and the shopping list together, with less to keep in your head.

## The app

Four everyday destinations stay available on desktop and phone:

- **Home** — tasks due today (including overdue work), the next seven days of events, and shortcuts to household tools.
- **Tasks** — one place for chores, errands, and maintenance jobs. Search, filter by person, or switch between Today, Upcoming, All open, and Completed. Unassigned tasks are shared; repeating tasks schedule their next occurrence when completed.
- **Calendar** — appointments, family events, recurring plans, and bills, with day, week, month, and agenda views.
- **Groceries** — a shared shopping list and shopping history.

**More** contains Meals, Maintenance, Pets, and House info. Households can turn these supporting sections off in the account panel. The kitchen display, sitter links, and native widgets remain available.

Hobbies, collections, wishlists, goals, and earnings tracking are retired from the active app. Their tables and source files are retained for recovery; the app does not route to those screens or load their stores. Old `#/chores` links lead to Tasks; retired and unknown routes lead to Home. No database migration or deletion is required for this rework.

## Development

```sh
npm install
npm run dev
```

Create a gitignored `.env.local` with your Supabase project URL and publishable key:

```dotenv
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

Configure your local and deployed origins in Supabase Authentication's redirect URLs. The browser signs in to Supabase directly; row-level security enforces household membership and event privacy.

| Command | Purpose |
| --- | --- |
| `npm run dev` | Vite development server |
| `npm run build` | Production build in `dist/` |
| `npm run preview` | Preview the production build |
| `npm run lint` | Static checks with oxlint |
| `npm test` | Regression tests for navigation and task filtering |
| `npm run ios:sync` | Build and sync Capacitor; reapply widget target |
| `npm run ios:open` | Open the native project in Xcode |

## Code map

React 19 and Vite power the responsive web app and Capacitor shell. Components use CSS design tokens from `theme.js` and `index.css`; no component library or CSS framework is required.

- `App.jsx` owns auth/household gates, route resolution, and stores shared between Home and section views. Other sections load lazily.
- `nav.js` defines the four core destinations, supporting sections, and legacy route fallback. `data/useSections.js` applies household preferences.
- `data/useTasks.js` owns task queries, realtime sync, mutations, and due labels. Views share `components/TaskRow.jsx`; filtering lives in `data/taskList.js`.
- `data/useEvents.js` supplies the shared calendar and Home agenda. Recurrence and occurrence exceptions remain in `data/recurrence.js`.
- `data/useMeals.js` and `data/useSystems.js` load only while their section or Home needs them. Other stores belong to their section views.
- `auth/` and `household/` own sessions, onboarding, household membership, and settings.
- `supabase/functions/` contains reminders and the daily digest. `ios/` contains the native bridge and WidgetKit implementation.

Task forms wait for successful saves, preserve their input on failure, and prevent duplicate submissions. Task completion stays optimistic and reports failed writes. A minute clock updates due labels after midnight and when the tab resumes. Query failures surface with retry controls instead of silently clearing existing tasks or events.

Keep database calls in data hooks, privacy in RLS, and date/recurrence rules in pure modules. Shared modals trap keyboard focus, close with Escape, and restore focus to their opener.

See [the native app guide](docs/ios.md) and [widget guide](docs/ios-widget.md). The [legacy architecture guide](docs/legacy-architecture.md) records the previous broader product and schema; it is historical context, not the current feature specification.

## Verification

`npm test` covers overdue work, date rollover, shared tasks, identical member names, search, maintenance visibility, core sections, disabled sections, and retired links. Browser verification should also cover task creation/editing/completion, a rejected save, the Home event shortcut, mobile navigation, and empty states. Mock API responses for browser checks when no test household is available; never use production household data as disposable fixtures.
