import { useState, useMemo, useEffect, lazy, Suspense } from 'react';
import { colors, fonts } from './theme';
import { getWeek } from './dates';
import { useHashRoute } from './useHashRoute';
import { useIsPhone } from './useMediaQuery';
import { useLastSeen } from './useLastSeen';
import { useSections } from './data/useSections';
import { useTasks } from './data/useTasks';
import { useSystems } from './data/useSystems';
import { useMeals } from './data/useMeals';
import { useGoals } from './data/useGoals';
import { TopNav } from './components/TopNav';
import { MobileNav } from './components/MobileNav';
import { AddTaskModal } from './components/AddTaskModal';
import { sectionByKey } from './data/collections';

// Home and Chores load with the app: one of them is where you land, and the
// other is the first place most people go. Everything else is fetched the
// first time it's opened, which is what took the initial download from one
// 600 kB bundle to a fraction of it — the difference between fine on wifi and
// fine on a phone in a supermarket car park.
import { HomeView } from './views/HomeView';
import { ChoresView } from './views/ChoresView';

const SystemsView = lazy(() => import('./views/SystemsView').then((m) => ({ default: m.SystemsView })));
const CalendarView = lazy(() => import('./views/CalendarView').then((m) => ({ default: m.CalendarView })));
const HobbiesView = lazy(() => import('./views/HobbiesView').then((m) => ({ default: m.HobbiesView })));
const CollectionView = lazy(() => import('./views/CollectionView').then((m) => ({ default: m.CollectionView })));
const MealsView = lazy(() => import('./views/MealsView').then((m) => ({ default: m.MealsView })));
const GroceriesView = lazy(() => import('./views/GroceriesView').then((m) => ({ default: m.GroceriesView })));
const PetsView = lazy(() => import('./views/PetsView').then((m) => ({ default: m.PetsView })));
const HouseFactsView = lazy(() => import('./views/HouseFactsView').then((m) => ({ default: m.HouseFactsView })));
const WorkView = lazy(() => import('./views/WorkView').then((m) => ({ default: m.WorkView })));
const GoalsView = lazy(() => import('./views/GoalsView').then((m) => ({ default: m.GoalsView })));
const ReleasesView = lazy(() => import('./views/ReleasesView').then((m) => ({ default: m.ReleasesView })));
// The sitter page and the wall display are whole-screen routes of their own,
// and neither is ever opened by someone browsing the app normally.
const SitterView = lazy(() => import('./views/SitterView').then((m) => ({ default: m.SitterView })));
const HubView = lazy(() => import('./views/HubView').then((m) => ({ default: m.HubView })));
const WidgetView = lazy(() => import('./views/WidgetView').then((m) => ({ default: m.WidgetView })));
import { useAuth } from './auth/AuthProvider';
import { useHousehold } from './household/HouseholdProvider';
import { SignIn } from './auth/SignIn';
import { ResetPassword } from './auth/ResetPassword';
import { Onboarding } from './household/Onboarding';
import { HouseholdModal } from './household/HouseholdModal';

export default function App() {
  const { session, loading: authLoading, recovering } = useAuth();
  const { household, loading: householdLoading } = useHousehold();
  const [route] = useHashRoute('home');

  // Two routes render without a session, both for the same reason: the thing
  // reading them has no account. The sitter page is for a person who shouldn't
  // need one; the widget page is for a phone home screen, which can't have one.
  // Both go through a token-scoped RPC and touch no table directly, so they sit
  // in front of the gate rather than inside it.
  if (route.startsWith('sitter/')) {
    return (
      <Suspense fallback={<Splash />}>
        <SitterView token={route.slice('sitter/'.length)} />
      </Suspense>
    );
  }
  if (route.startsWith('widget/')) {
    return (
      <Suspense fallback={<Splash />}>
        <WidgetView token={route.slice('widget/'.length)} />
      </Suspense>
    );
  }

  // Gate: load session → set a new password (if we got here from a reset
  // email) → sign in → load household → onboarding → the app.
  if (authLoading) return <Splash />;
  if (recovering && session) return <ResetPassword />;
  if (!session) return <SignIn />;
  if (householdLoading) return <Splash />;
  if (!household) return <Onboarding />;
  return <Dashboard />;
}

function Dashboard() {
  // Routing lives in the URL hash, so views deep-link, the back button works,
  // and a refresh stays where you were.
  const [view, navigate] = useHashRoute('home');
  const phone = useIsPhone();
  const { session } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);
  const [householdOpen, setHouseholdOpen] = useState(false);
  // Held here rather than in HomeView so that dismissing the welcome-back card
  // and then wandering off to Chores doesn't bring it straight back — Home
  // unmounts when you navigate away from it.
  const [catchUpDismissed, setCatchUpDismissed] = useState(false);

  // How long since this device last saw the dashboard. The kitchen display is
  // excluded: it's signed in permanently and would otherwise report a visit
  // every minute of every day.
  const awayDays = useLastSeen({ userId: session?.user?.id, active: view !== 'hub' });

  // Which sections this household kept. Everything below reads from it: what's
  // in the nav, what routes resolve, and which hooks bother to fetch.
  const { isOn } = useSections();

  // A hobby section route ('games', 'books', …) renders the shared collection
  // view; anything unrecognised falls through to Home.
  const hobbySection = sectionByKey(view);

  // A switched-off section shouldn't stay reachable through an old deep link, a
  // bookmark, or a tab left open while someone else changed the settings.
  // `releases` and `hub` aren't nav sections and are always allowed.
  // A standalone collection section (the wishlist) has its own nav entry and is
  // switched on and off by its own key; the hobby ones all live behind Hobbies.
  const reachable =
    view === 'hub' ||
    view === 'releases' ||
    (hobbySection && !hobbySection.standalone ? isOn('hobbies') : isOn(view));
  useEffect(() => {
    if (!reachable) navigate('home');
  }, [reachable, navigate]);
  // Render Home immediately rather than flashing a blank frame while the hash
  // catches up.
  const active = reachable ? view : 'home';

  // Only the hooks Home actually summarises live up here. Sections that stand
  // alone — groceries, facts, hobbies — own their data, so opening the app
  // doesn't fetch and subscribe to every table in the database. The four here
  // get told whether their section is on, so switching one off really does stop
  // the queries rather than just hiding the card.
  const { tasks, toggle, addTask, rollForward } = useTasks();
  const { systems, addSystem, updateSystem, removeSystem, markDone } = useSystems({ enabled: isOn('systems') });
  const { mealsByKey, setMeal, removeMeal } = useMeals({ enabled: isOn('meals') });
  const goals = useGoals({ enabled: isOn('goals') });

  // Computed once per mount — the real current week drives greeting + calendar.
  const week = useMemo(() => getWeek(), []);

  // The kitchen display replaces the whole app chrome — no nav, no add button,
  // nothing to accidentally press while reaching past it for the kettle.
  if (view === 'hub')
    return (
      <Suspense fallback={<Splash />}>
        <HubView navigate={navigate} />
      </Suspense>
    );

  return (
    <div style={{ minHeight: '100vh', background: colors.bg }}>
      <TopNav
        view={active}
        setView={navigate}
        hobbyRoute={Boolean(hobbySection) && reachable}
        onAdd={() => setModalOpen(true)}
        onOpenHousehold={() => setHouseholdOpen(true)}
      />

      <main
        style={{
          maxWidth: 1180,
          margin: '0 auto',
          // Extra room at the bottom on phones so the tab bar never covers the
          // last row of a list.
          padding: phone ? '20px 18px 110px' : '30px 36px 70px',
        }}
      >
        <Suspense fallback={<ViewLoading />}>
        {/* Keyed so switching sections remounts: the view holds per-section
            state (selected domain, owner filter) that must not carry over. */}
        {hobbySection && reachable && (
          <CollectionView key={hobbySection.key} section={hobbySection} navigate={navigate} />
        )}
        {active === 'hobbies' && <HobbiesView navigate={navigate} />}
        {active === 'home' && (
          <HomeView
            tasks={tasks}
            systems={systems}
            mealsByKey={mealsByKey}
            goals={goals.active}
            week={week}
            onToggle={toggle}
            navigate={navigate}
            awayDays={awayDays}
            catchUpDismissed={catchUpDismissed}
            onDismissCatchUp={() => setCatchUpDismissed(true)}
            onRollForward={rollForward}
          />
        )}
        {active === 'chores' && <ChoresView tasks={tasks} onToggle={toggle} onAdd={() => setModalOpen(true)} />}
        {active === 'systems' && (
          <SystemsView
            systems={systems}
            onAdd={addSystem}
            onUpdate={updateSystem}
            onRemove={removeSystem}
            onMarkDone={markDone}
          />
        )}
        {active === 'calendar' && <CalendarView tasks={tasks} navigate={navigate} />}
        {active === 'meals' && <MealsView mealsByKey={mealsByKey} setMeal={setMeal} removeMeal={removeMeal} />}
        {active === 'groceries' && <GroceriesView />}
        {active === 'pets' && <PetsView />}
        {active === 'facts' && <HouseFactsView />}
        {active === 'work' && <WorkView navigate={navigate} />}
        {active === 'releases' && <ReleasesView />}
        {active === 'goals' && (
          <GoalsView
            active={goals.active}
            done={goals.done}
            onAdd={goals.addGoal}
            onUpdate={goals.updateGoal}
            onRemove={goals.removeGoal}
            onMarkDone={goals.markDone}
            onReopen={goals.reopen}
          />
        )}
        </Suspense>
      </main>

      {phone && <MobileNav view={active} setView={navigate} hobbyRoute={Boolean(hobbySection) && reachable} />}

      {modalOpen && <AddTaskModal onClose={() => setModalOpen(false)} onAdd={addTask} />}
      {householdOpen && <HouseholdModal onClose={() => setHouseholdOpen(false)} />}
    </div>
  );
}

// Shown only in the gap between tapping a section and its chunk arriving,
// which on a warm connection is a frame or two. Deliberately not a spinner:
// something that appears and disappears within 100ms reads as a flicker, and
// a blank hold reads as nothing happening at all.
function ViewLoading() {
  return (
    <div style={{ minHeight: 240, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ font: `400 14px ${fonts.sans}`, color: colors.faint }}>One moment…</div>
    </div>
  );
}

function Splash() {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: colors.bg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div style={{ font: `400 25px ${fonts.serif}`, color: colors.muted }}>Tend</div>
    </div>
  );
}
