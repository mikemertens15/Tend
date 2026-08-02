import { useState, useMemo } from 'react';
import { colors, fonts } from './theme';
import { getWeek } from './dates';
import { useHashRoute } from './useHashRoute';
import { useTasks } from './data/useTasks';
import { useVehicles } from './data/useVehicles';
import { useSystems } from './data/useSystems';
import { useMeals } from './data/useMeals';
import { useGroceries } from './data/useGroceries';
import { useWorkouts } from './data/useWorkouts';
import { useGoals } from './data/useGoals';
import { TopNav } from './components/TopNav';
import { AddTaskModal } from './components/AddTaskModal';
import { HomeView } from './views/HomeView';
import { ChoresView } from './views/ChoresView';
import { VehiclesView } from './views/VehiclesView';
import { SystemsView } from './views/SystemsView';
import { CalendarView } from './views/CalendarView';
import { HobbiesView } from './views/HobbiesView';
import { CollectionView } from './views/CollectionView';
import { sectionByKey } from './data/collections';
import { MealsView } from './views/MealsView';
import { GroceriesView } from './views/GroceriesView';
import { FitnessView } from './views/FitnessView';
import { GoalsView } from './views/GoalsView';
import { useAuth } from './auth/AuthProvider';
import { useHousehold } from './household/HouseholdProvider';
import { SignIn } from './auth/SignIn';
import { ResetPassword } from './auth/ResetPassword';
import { Onboarding } from './household/Onboarding';
import { HouseholdModal } from './household/HouseholdModal';

export default function App() {
  const { session, loading: authLoading, recovering } = useAuth();
  const { household, loading: householdLoading } = useHousehold();

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
  const [modalOpen, setModalOpen] = useState(false);
  const [householdOpen, setHouseholdOpen] = useState(false);
  const { tasks, toggle, addTask } = useTasks();
  const { vehicles, addVehicle, updateVehicle, removeVehicle } = useVehicles();
  const { systems, addSystem, updateSystem, removeSystem, markDone } = useSystems();
  const { mealsByKey, setMeal, removeMeal } = useMeals();
  const groceries = useGroceries();
  const { workouts, addWorkout, removeWorkout } = useWorkouts();
  const goals = useGoals();

  // Computed once per mount — the real current week drives greeting + calendar.
  const week = useMemo(() => getWeek(), []);

  // A hobby section route ('games', 'books', …) renders the shared collection
  // view; anything unrecognised falls through to Home.
  const hobbySection = sectionByKey(view);

  return (
    <div style={{ minHeight: '100vh', background: colors.bg }}>
      <TopNav
        view={view}
        setView={navigate}
        hobbyRoute={Boolean(hobbySection)}
        onAdd={() => setModalOpen(true)}
        onOpenHousehold={() => setHouseholdOpen(true)}
      />

      <main style={{ maxWidth: 1180, margin: '0 auto', padding: '30px 36px 70px' }}>
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
            vehicles={vehicles}
            mealsByKey={mealsByKey}
            goals={goals.active}
            week={week}
            onToggle={toggle}
            navigate={navigate}
          />
        )}
        {view === 'chores' && <ChoresView tasks={tasks} onToggle={toggle} onAdd={() => setModalOpen(true)} />}
        {view === 'vehicles' && (
          <VehiclesView vehicles={vehicles} onAdd={addVehicle} onUpdate={updateVehicle} onRemove={removeVehicle} />
        )}
        {view === 'systems' && (
          <SystemsView
            systems={systems}
            onAdd={addSystem}
            onUpdate={updateSystem}
            onRemove={removeSystem}
            onMarkDone={markDone}
          />
        )}
        {view === 'calendar' && <CalendarView tasks={tasks} week={week} />}
        {view === 'meals' && <MealsView mealsByKey={mealsByKey} setMeal={setMeal} removeMeal={removeMeal} />}
        {view === 'groceries' && (
          <GroceriesView
            items={groceries.items}
            onAdd={groceries.addItem}
            onToggle={groceries.toggle}
            onRemove={groceries.removeItem}
            onClearDone={groceries.clearDone}
          />
        )}
        {view === 'fitness' && <FitnessView workouts={workouts} onAdd={addWorkout} onRemove={removeWorkout} />}
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
