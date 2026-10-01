import { useState } from 'react';
import { colors, fonts } from '../theme';
import { Card } from '../components/ui';
import { TaskRow } from '../components/TaskRow';
import { useHousehold } from '../household/HouseholdProvider';
import { useWallClock } from '../useWallClock';
import { dayStr } from '../dates';
import { selectTasks } from '../data/taskList';

const SCOPES = [
  ['today', 'Today'],
  ['upcoming', 'Upcoming'],
  ['all', 'All open'],
  ['done', 'Completed'],
];

export function TasksView({ tasks, loading, error, onToggle, onAdd, onEditTask }) {
  const { members } = useHousehold();
  const today = dayStr(useWallClock());
  const [scope, setScope] = useState('all');
  const [owner, setOwner] = useState('all');
  const [search, setSearch] = useState('');
  const visible = selectTasks(tasks, { scope, owner, search, today });
  const open = tasks.filter((t) => !t.done).length;
  return (
    <div>
      <div className="tend-page-heading">
        <div>
          <h1>Tasks</h1>
          <p>
            Chores, errands, and the little things. {open} open {open === 1 ? 'task' : 'tasks'}.
          </p>
        </div>
        <button className="tend-primary" onClick={onAdd}>
          + Add task
        </button>
      </div>
      <div className="tend-task-filters">
        <div className="tend-tabs" aria-label="Task status">
          {SCOPES.map(([key, label]) => (
            <button key={key} aria-pressed={scope === key} onClick={() => setScope(key)}>
              {label}
            </button>
          ))}
        </div>
        <div className="tend-filter-inputs">
          <input
            aria-label="Search tasks"
            placeholder="Search tasks…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select aria-label="Assigned to" value={owner} onChange={(e) => setOwner(e.target.value)}>
            <option value="all">Everyone</option>
            <option value="unassigned">Unassigned</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      <Card style={{ padding: '8px 24px' }} aria-busy={loading}>
        {error && !tasks.length ? (
          <p className="tend-empty">Your tasks are temporarily unavailable.</p>
        ) : loading ? (
          <p className="tend-empty">Loading your tasks…</p>
        ) : visible.length ? (
          visible.map((task) => <TaskRow key={task.id} task={task} onToggle={onToggle} onEdit={onEditTask} />)
        ) : (
          <div className="tend-empty">
            <div style={{ font: `400 24px ${fonts.serif}`, color: colors.ink }}>
              {search || owner !== 'all'
                ? 'No matching tasks'
                : scope === 'done'
                  ? 'A fresh start'
                  : scope === 'today'
                    ? 'You’re all caught up for today'
                    : 'Room for what’s next'}
            </div>
            <p>
              {search || owner !== 'all'
                ? 'Try another search or person.'
                : scope === 'done'
                  ? 'Completed tasks will appear here.'
                  : 'Add a task whenever something needs doing.'}
            </p>
            {scope !== 'done' && !search && owner === 'all' && (
              <button className="tend-text-button" onClick={onAdd}>
                + Add a task
              </button>
            )}
          </div>
        )}
      </Card>
      {scope === 'today' && (
        <p style={{ font: `400 12px ${fonts.sans}`, color: colors.muted }}>
          Includes overdue tasks, so nothing gets missed.
        </p>
      )}
      {scope === 'done' && (
        <p style={{ font: `400 12px ${fonts.sans}`, color: colors.muted }}>
          Completed tasks with due dates in the last 60 days.
        </p>
      )}
    </div>
  );
}
