import { colors, fonts } from '../theme';
import { dayStr, greeting, longDate, parseDay, shortDate, addDays } from '../dates';
import { Card } from '../components/ui';
import { TaskRow } from '../components/TaskRow';
import { useHousehold } from '../household/HouseholdProvider';
import { useWallClock } from '../useWallClock';
import { useSections } from '../data/useSections';
import { selectTasks } from '../data/taskList';
import { buildCatchUp } from '../data/catchup';
import { CatchUpCard } from '../components/CatchUpCard';

// Home answers two questions: what needs doing, and what's happening next.
export function HomeView({
  tasks,
  loading,
  error,
  systems,
  mealsByKey = {},
  events,
  onToggle,
  onEditTask,
  onAddTask,
  onAddEvent,
  navigate,
  awayDays,
  catchUpDismissed,
  onDismissCatchUp,
  onRollForward,
}) {
  const { household, currentMember } = useHousehold();
  const { isOn } = useSections();
  const now = useWallClock();
  const today = dayStr(now);
  const due = selectTasks(tasks, { scope: 'today', today });
  const next = due.length ? due : selectTasks(tasks, { scope: 'upcoming', today });
  const agenda = events.between(today, addDays(today, 6)).slice(0, 5);
  const dinner = mealsByKey[`${today}:dinner`];
  const upkeep = systems.filter((s) => s.tone !== 'green');
  const catchUp = catchUpDismissed ? null : buildCatchUp({ tasks, awayDays });
  const helpers = [
    ['groceries', '🛒', 'Shopping list', 'Keep the next shop together'],
    ...(isOn('meals')
      ? [['meals', '🍲', 'Tonight’s dinner', dinner?.title || 'Make a plan for the week']]
      : []),
    ...(isOn('systems')
      ? [
          [
            'systems',
            '🔧',
            'Home maintenance',
            upkeep.length ? `${upkeep.length} to check on` : 'Keep the house in good shape',
          ],
        ]
      : []),
    ...(isOn('pets') ? [['pets', '🐾', 'Pet care', 'Feeding, walks, and routines']] : []),
    ...(isOn('facts') ? [['facts', '📋', 'House information', 'Useful details, all in one place']] : []),
  ];

  return (
    <div>
      <div className="tend-home-intro">
        <div>
          <div className="tend-eyebrow">
            {household?.name || 'Your home'} · {longDate(now)}
          </div>
          <h1>
            {greeting(now)}, {currentMember?.name || 'there'}.
          </h1>
          <p>A little less to keep in your head.</p>
        </div>
        <div className="tend-home-actions">
          <button className="tend-primary" onClick={onAddTask}>
            + Add task
          </button>
          <button className="tend-secondary" onClick={onAddEvent}>
            + Add event
          </button>
        </div>
      </div>
      {catchUp && (
        <CatchUpCard
          catchUp={catchUp}
          onDismiss={onDismissCatchUp}
          onRoll={async () => {
            if (await onRollForward(catchUp.rollIds)) onDismissCatchUp();
          }}
          navigate={navigate}
        />
      )}
      <div className="tend-home-grid">
        <Card style={{ padding: '24px', borderTop: `3px solid ${colors.accent}` }}>
          <div className="tend-card-heading">
            <div>
              <div className="tend-eyebrow">One thing at a time</div>
              <h2>{due.length ? 'Needs doing today' : 'Next on the list'}</h2>
            </div>
            <button className="tend-text-button" onClick={() => navigate('tasks')}>
              All tasks →
            </button>
          </div>
          {error && !next.length ? (
            <p className="tend-empty">Your tasks are temporarily unavailable.</p>
          ) : loading ? (
            <p className="tend-empty">Loading your tasks…</p>
          ) : next.length ? (
            <>
              <p style={{ font: `400 13px ${fonts.sans}`, color: colors.muted2, margin: '0 0 16px' }}>
                {due.length
                  ? `${due.length} ${due.length === 1 ? 'task' : 'tasks'} due today or earlier. Share the load, or start small.`
                  : 'Today is clear. Here’s what’s coming up.'}
              </p>
              {next.slice(0, 5).map((task) => (
                <TaskRow key={task.id} task={task} onToggle={onToggle} onEdit={onEditTask} />
              ))}
              {next.length > 5 && (
                <button
                  className="tend-text-button"
                  style={{ marginTop: 16 }}
                  onClick={() => navigate('tasks')}
                >
                  See {next.length - 5} more tasks →
                </button>
              )}
            </>
          ) : (
            <div className="tend-empty">
              <h2>A little breathing room.</h2>
              <p>Your task list is clear. Add a chore, an errand, or anything you want to remember.</p>
              <button className="tend-text-button" onClick={onAddTask}>
                + Add your first task
              </button>
            </div>
          )}
        </Card>
        <Card style={{ padding: '24px' }}>
          <div className="tend-card-heading">
            <div>
              <div className="tend-eyebrow">The next seven days</div>
              <h2>Coming up</h2>
            </div>
            <button className="tend-text-button" onClick={() => navigate('calendar')}>
              Calendar →
            </button>
          </div>
          {events.error ? (
            <p className="tend-empty">Your calendar is temporarily unavailable.</p>
          ) : events.loading ? (
            <p className="tend-empty">Loading your calendar…</p>
          ) : agenda.length ? (
            agenda.map((event) => (
              <button
                key={`${event.id}:${event.date}`}
                className="tend-agenda-row"
                onClick={() => navigate('calendar')}
              >
                <span className="tend-agenda-date">
                  {event.date === today ? 'Today' : shortDate(parseDay(event.date))}
                </span>
                <span style={{ minWidth: 0, flex: 1 }}>
                  <span style={{ display: 'block', fontWeight: 600, overflowWrap: 'anywhere' }}>
                    {event.title}
                  </span>
                  <span style={{ display: 'block', marginTop: 4, fontSize: 12, color: colors.muted }}>
                    {[event.allDay ? 'All day' : event.timeRange, event.who, event.location]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                </span>
              </button>
            ))
          ) : (
            <div className="tend-empty">
              <h2>Space in the week.</h2>
              <p>Add appointments, family plans, and the dates you don’t want to forget.</p>
              <button className="tend-text-button" onClick={onAddEvent}>
                + Add an event
              </button>
            </div>
          )}
        </Card>
      </div>
      <div className="tend-card-heading" style={{ marginTop: 30 }}>
        <h2>Around the house</h2>
        <span style={{ fontSize: 12, color: colors.muted }}>The everyday essentials</span>
      </div>
      <div className="tend-helper-grid">
        {helpers.map(([key, icon, title, description]) => (
          <Card key={key} as="button" className="tend-helper" onClick={() => navigate(key)}>
            <span aria-hidden="true" className="tend-helper-icon">
              {icon}
            </span>
            <span>
              <strong>{title}</strong>
              <span className="tend-helper-description">{description}</span>
            </span>
            <span aria-hidden="true" style={{ marginLeft: 'auto', color: colors.muted }}>
              →
            </span>
          </Card>
        ))}
      </div>
    </div>
  );
}
