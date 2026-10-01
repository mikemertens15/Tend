import { useState, useEffect, lazy, Suspense } from 'react';
import { colors, fonts } from './theme';
import { useHashRoute } from './useHashRoute';
import { useIsPhone } from './useMediaQuery';
import { useLastSeen } from './useLastSeen';
import { useSections } from './data/useSections';
import { resolveRoute } from './nav';
import { startNativeRouting } from './data/native';
import { useTasks } from './data/useTasks';
import { useSystems } from './data/useSystems';
import { useMeals } from './data/useMeals';
import { useEvents } from './data/useEvents';
import { TopNav } from './components/TopNav';
import { MobileNav } from './components/MobileNav';
import { TaskModal } from './components/TaskModal';
import { HomeView } from './views/HomeView';
import { TasksView } from './views/TasksView';
import { useAuth } from './auth/AuthProvider';
import { useHousehold } from './household/HouseholdProvider';
import { SignIn } from './auth/SignIn';
import { ResetPassword } from './auth/ResetPassword';
import { Onboarding } from './household/Onboarding';
import { HouseholdModal } from './household/HouseholdModal';

const SystemsView = lazy(() => import('./views/SystemsView').then((m) => ({ default: m.SystemsView })));
const CalendarView = lazy(() => import('./views/CalendarView').then((m) => ({ default: m.CalendarView })));
const MealsView = lazy(() => import('./views/MealsView').then((m) => ({ default: m.MealsView })));
const GroceriesView = lazy(() => import('./views/GroceriesView').then((m) => ({ default: m.GroceriesView })));
const PetsView = lazy(() => import('./views/PetsView').then((m) => ({ default: m.PetsView })));
const HouseFactsView = lazy(() =>
  import('./views/HouseFactsView').then((m) => ({ default: m.HouseFactsView })),
);
const ReleasesView = lazy(() => import('./views/ReleasesView').then((m) => ({ default: m.ReleasesView })));
const SitterView = lazy(() => import('./views/SitterView').then((m) => ({ default: m.SitterView })));
const HubView = lazy(() => import('./views/HubView').then((m) => ({ default: m.HubView })));
const WidgetView = lazy(() => import('./views/WidgetView').then((m) => ({ default: m.WidgetView })));

// Public token routes keep their existing access checks. Household screens
// remain behind both the authentication and household gates.
export default function App() {
  const { session, loading: authLoading, recovering } = useAuth();
  const { household, loading: householdLoading } = useHousehold();
  const [route] = useHashRoute('home');
  if (route.startsWith('sitter/'))
    return (
      <Suspense fallback={<Splash />}>
        <SitterView token={route.slice(7)} />
      </Suspense>
    );
  if (route.startsWith('widget/'))
    return (
      <Suspense fallback={<Splash />}>
        <WidgetView token={route.slice(7)} />
      </Suspense>
    );
  if (authLoading) return <Splash />;
  if (recovering && session) return <ResetPassword />;
  if (!session) return <SignIn />;
  if (householdLoading) return <Splash />;
  if (!household) return <Onboarding />;
  return <Dashboard key={household.id} />;
}

function Dashboard() {
  const [view, navigate] = useHashRoute('home');
  const phone = useIsPhone();
  const { session } = useAuth();
  const { isOn, disabled } = useSections();
  const active = resolveRoute(view, disabled);
  const [taskModal, setTaskModal] = useState(null);
  const [householdOpen, setHouseholdOpen] = useState(false);
  const [catchUpDismissed, setCatchUpDismissed] = useState(false);
  const [createRequest, setCreateRequest] = useState(0);
  const [actionError, setActionError] = useState('');
  const awayDays = useLastSeen({ userId: session?.user?.id, active: active !== 'hub' });

  useEffect(() => {
    if (view !== active) navigate(active);
  }, [view, active, navigate]);
  useEffect(() => {
    let stop;
    let cancelled = false;
    startNativeRouting(navigate).then((fn) => {
      if (cancelled) fn?.();
      else stop = fn;
    });
    return () => {
      cancelled = true;
      stop?.();
    };
  }, [navigate]);

  // Home and the section screens share their stores rather than subscribing twice.
  const taskStore = useTasks();
  const { tasks, toggle, addTask, updateTask, removeTask, rollForward, loading, error, refresh } = taskStore;
  const { systems, addSystem, updateSystem, removeSystem, markDone } = useSystems({
    enabled: isOn('systems') && ['home', 'systems'].includes(active),
  });
  const { mealsByKey, setMeal, removeMeal } = useMeals({
    enabled: isOn('meals') && ['home', 'meals'].includes(active),
  });
  const events = useEvents({ enabled: ['home', 'calendar'].includes(active) });

  async function runTaskAction(action) {
    setActionError('');
    try {
      await action();
      return true;
    } catch (err) {
      setActionError(err?.message || 'Your change could not be saved. Please try again.');
      return false;
    }
  }
  const add = () => setTaskModal({ task: null });
  const edit = (task) => setTaskModal({ task });
  const toggleTask = (id) => runTaskAction(() => toggle(id));
  const addEvent = () => {
    setCreateRequest((n) => n + 1);
    navigate('calendar');
  };

  if (active === 'hub')
    return (
      <Suspense fallback={<Splash />}>
        <HubView navigate={navigate} />
      </Suspense>
    );
  return (
    <div style={{ minHeight: '100vh', background: colors.bg }}>
      <TopNav view={active} setView={navigate} onAdd={add} onOpenHousehold={() => setHouseholdOpen(true)} />
      <main className="tend-main" style={{ paddingBottom: phone ? 110 : 70 }}>
        {(error || actionError) && (
          <div className="tend-error" role="alert">
            <span>{actionError || error}</span>
            <button
              onClick={() => {
                setActionError('');
                refresh();
              }}
            >
              Retry loading tasks
            </button>
          </div>
        )}
        {events.error && ['home', 'calendar'].includes(active) && (
          <div className="tend-error" role="alert">
            <span>{events.error}</span>
            <button onClick={events.refresh}>Retry loading calendar</button>
          </div>
        )}
        <Suspense fallback={<ViewLoading />}>
          {active === 'home' && (
            <HomeView
              tasks={tasks}
              loading={loading}
              error={error}
              systems={systems}
              mealsByKey={mealsByKey}
              events={events}
              onToggle={toggleTask}
              onEditTask={edit}
              onAddTask={add}
              onAddEvent={addEvent}
              navigate={navigate}
              awayDays={awayDays}
              catchUpDismissed={catchUpDismissed}
              onDismissCatchUp={() => setCatchUpDismissed(true)}
              onRollForward={(ids) => runTaskAction(() => rollForward(ids))}
            />
          )}
          {active === 'tasks' && (
            <TasksView
              tasks={tasks}
              loading={loading}
              error={error}
              onToggle={toggleTask}
              onAdd={add}
              onEditTask={edit}
            />
          )}
          {active === 'systems' && (
            <SystemsView
              systems={systems}
              onAdd={addSystem}
              onUpdate={updateSystem}
              onRemove={removeSystem}
              onMarkDone={markDone}
            />
          )}
          {active === 'calendar' && (
            <CalendarView
              tasks={tasks}
              navigate={navigate}
              events={events}
              createRequest={createRequest}
              onCreateHandled={setCreateRequest}
            />
          )}
          {active === 'meals' && (
            <MealsView mealsByKey={mealsByKey} setMeal={setMeal} removeMeal={removeMeal} />
          )}
          {active === 'groceries' && <GroceriesView />}
          {active === 'pets' && <PetsView />}
          {active === 'facts' && <HouseFactsView />}
          {active === 'releases' && <ReleasesView />}
        </Suspense>
      </main>
      {phone && <MobileNav view={active} setView={navigate} />}
      {taskModal && (
        <TaskModal
          task={taskModal.task}
          onClose={() => setTaskModal(null)}
          onSave={(fields) => (taskModal.task ? updateTask(taskModal.task.id, fields) : addTask(fields))}
          onDelete={removeTask}
          onToggle={toggle}
        />
      )}
      {householdOpen && <HouseholdModal onClose={() => setHouseholdOpen(false)} />}
    </div>
  );
}

function ViewLoading() {
  return (
    <div style={{ minHeight: 240, display: 'grid', placeItems: 'center', color: colors.muted }}>
      One moment…
    </div>
  );
}
function Splash() {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: colors.bg,
        display: 'grid',
        placeItems: 'center',
        font: `400 25px ${fonts.serif}`,
        color: colors.muted,
      }}
    >
      Tend
    </div>
  );
}
