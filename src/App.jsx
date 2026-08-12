import { useState, useMemo } from 'react';
import { colors, fonts } from './theme';
import { getWeek } from './dates';
import { useHashRoute } from './useHashRoute';
import { useIsPhone } from './useMediaQuery';
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
  const [modalOpen, setModalOpen] = useState(false);
  const [householdOpen, setHouseholdOpen] = useState(false);

  // Only the hooks Home actually summarises live up here. Sections that stand
  // alone — groceries, pets, facts, hobbies — own their data, so opening the
  // app doesn't fetch and subscribe to every table in the database.
  const { tasks, toggle, addTask } = useTasks();
  const { systems, addSystem, updateSystem, removeSystem, markDone } = useSystems();
  const { mealsByKey, setMeal, removeMeal } = useMeals();
  const goals = useGoals();

  // Computed once per mount — the real current week drives greeting + calendar.
  const week = useMemo(() => getWeek(), []);

  // A hobby section route ('games', 'books', …) renders the shared collection
  // view; anything unrecognised falls through to Home.
  const hobbySection = sectionByKey(view);

  // The kitchen display replaces the whole app chrome — no nav, no add button,
  // nothing to accidentally press while reaching past it for the kettle.
  if (view === 'hub') return <HubView navigate={navigate} />;

  return (
    <div style={{ minHeight: '100vh', background: colors.bg }}>
      <TopNav
        view={view}
        setView={navigate}
        hobbyRoute={Boolean(hobbySection)}
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
        {hobbySection && (
          <CollectionView key={hobbySection.key} section={hobbySection} navigate={navigate} />
        )}
        {view === 'hobbies' && <HobbiesView navigate={navigate} />}
        {view === 'home' && (
          <HomeView
            tasks={tasks}
            systems={systems}
            mealsByKey={mealsByKey}
            goals={goals.active}
            week={week}
            onToggle={toggle}
            navigate={navigate}
          />
        )}
        {view === 'chores' && <ChoresView tasks={tasks} onToggle={toggle} onAdd={() => setModalOpen(true)} />}
        {view === 'systems' && (
          <SystemsView
            systems={systems}
            onAdd={addSystem}
            onUpdate={updateSystem}
            onRemove={removeSystem}
            onMarkDone={markDone}
          />
        )}
        {view === 'calendar' && <CalendarView tasks={tasks} navigate={navigate} />}
        {view === 'meals' && <MealsView mealsByKey={mealsByKey} setMeal={setMeal} removeMeal={removeMeal} />}
        {view === 'groceries' && <GroceriesView />}
        {view === 'pets' && <PetsView />}
        {view === 'facts' && <HouseFactsView />}
        {view === 'releases' && <ReleasesView />}
        {view === 'goals' && (
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

      {phone && <MobileNav view={view} setView={navigate} hobbyRoute={Boolean(hobbySection)} />}

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
