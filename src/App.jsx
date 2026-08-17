import { useState, useMemo, useEffect } from 'react';
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
import { HomeView } from './views/HomeView';
import { ChoresView } from './views/ChoresView';
import { SystemsView } from './views/SystemsView';
import { CalendarView } from './views/CalendarView';
import { HobbiesView } from './views/HobbiesView';
import { CollectionView } from './views/CollectionView';
import { sectionByKey } from './data/collections';
import { MealsView } from './views/MealsView';
import { GroceriesView } from './views/GroceriesView';
import { PetsView } from './views/PetsView';
import { HouseFactsView } from './views/HouseFactsView';
import { GoalsView } from './views/GoalsView';
import { ReleasesView } from './views/ReleasesView';
import { SitterView } from './views/SitterView';
import { HubView } from './views/HubView';
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

  // The sitter page is the one route that renders without a session — it's for
  // someone who doesn't have an account and shouldn't need one. It reads
  // everything through a token-scoped RPC, so it sits in front of the gate
  // rather than inside it.
  if (route.startsWith('sitter/')) {
    return <SitterView token={route.slice('sitter/'.length)} />;
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
  const reachable =
    view === 'hub' ||
    view === 'releases' ||
    (hobbySection ? isOn('hobbies') : isOn(view));
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
  if (view === 'hub') return <HubView navigate={navigate} />;

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
      </main>

      {phone && <MobileNav view={active} setView={navigate} hobbyRoute={Boolean(hobbySection) && reachable} />}

      {modalOpen && <AddTaskModal onClose={() => setModalOpen(false)} onAdd={addTask} />}
      {householdOpen && <HouseholdModal onClose={() => setHouseholdOpen(false)} />}
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
