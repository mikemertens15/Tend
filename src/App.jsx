import { useState, useMemo } from 'react';
import { colors, fonts } from './theme';
import { getWeek } from './dates';
import { useTasks } from './data/useTasks';
import { useMedia } from './data/useMedia';
import { useVehicles } from './data/useVehicles';
import { useSystems } from './data/useSystems';
import { useMeals } from './data/useMeals';
import { useWorkouts } from './data/useWorkouts';
import { useGoals } from './data/useGoals';
import { TopNav } from './components/TopNav';
import { AddTaskModal } from './components/AddTaskModal';
import { HomeView } from './views/HomeView';
import { ChoresView } from './views/ChoresView';
import { VehiclesView } from './views/VehiclesView';
import { SystemsView } from './views/SystemsView';
import { CalendarView } from './views/CalendarView';
import { WatchlistView } from './views/WatchlistView';
import { MealsView } from './views/MealsView';
import { FitnessView } from './views/FitnessView';
import { GoalsView } from './views/GoalsView';
import { useAuth } from './auth/AuthProvider';
import { useHousehold } from './household/HouseholdProvider';
import { SignIn } from './auth/SignIn';
import { Onboarding } from './household/Onboarding';
import { HouseholdModal } from './household/HouseholdModal';

export default function App() {
  const { session, loading: authLoading } = useAuth();
  const { household, loading: householdLoading } = useHousehold();

  // Gate: load session → sign in → load household → onboarding → the app.
  if (authLoading) return <Splash />;
  if (!session) return <SignIn />;
  if (householdLoading) return <Splash />;
  if (!household) return <Onboarding />;
  return <Dashboard />;
}

function Dashboard() {
  const [view, setView] = useState('home');
  const [modalOpen, setModalOpen] = useState(false);
  const [householdOpen, setHouseholdOpen] = useState(false);
  const { tasks, toggle, addTask } = useTasks();
  const { items: media, addItem, updateItem, removeItem } = useMedia();
  const { vehicles, addVehicle, updateVehicle, removeVehicle } = useVehicles();
  const { systems, addSystem, updateSystem, removeSystem, markDone } = useSystems();
  const { mealsByKey, setMeal, removeMeal } = useMeals();
  const { workouts, addWorkout, removeWorkout } = useWorkouts();
  const goals = useGoals();

  // Computed once per mount — the real current week drives greeting + calendar.
  const week = useMemo(() => getWeek(), []);

  return (
    <div style={{ minHeight: '100vh', background: colors.bg }}>
      <TopNav
        view={view}
        setView={setView}
        onAdd={() => setModalOpen(true)}
        onOpenHousehold={() => setHouseholdOpen(true)}
      />

      <main style={{ maxWidth: 1180, margin: '0 auto', padding: '30px 36px 70px' }}>
        {view === 'home' && (
          <HomeView
            tasks={tasks}
            systems={systems}
            vehicles={vehicles}
            media={media}
            mealsByKey={mealsByKey}
            goals={goals.active}
            week={week}
            onToggle={toggle}
            setView={setView}
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
        {view === 'watchlist' && (
          <WatchlistView items={media} addItem={addItem} updateItem={updateItem} removeItem={removeItem} />
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
