import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveRoute, visibleSectionKeys, phoneTabs } from '../src/nav.js';
import { selectTasks } from '../src/data/taskList.js';

test('essential sections stay available even with legacy disabled settings', () => {
  assert.deepEqual(phoneTabs(['calendar', 'groceries']), ['home', 'tasks', 'calendar', 'groceries']);
  assert.deepEqual(visibleSectionKeys(['meals', 'systems', 'pets', 'facts', 'calendar', 'groceries']), [
    'home',
    'tasks',
    'calendar',
    'groceries',
  ]);
});
test('old chore links work and retired routes fall back to Home', () => {
  assert.equal(resolveRoute('chores'), 'tasks');
  for (const key of ['hobbies', 'games', 'books', 'goals', 'wishlist', 'work', 'unknown'])
    assert.equal(resolveRoute(key), 'home');
  assert.equal(resolveRoute('pets', ['pets']), 'home');
  assert.equal(resolveRoute('hub'), 'hub');
});
test('malformed section preferences do not break navigation', () => {
  assert.deepEqual(visibleSectionKeys({ pets: true }), visibleSectionKeys());
});

const tasks = [
  {
    id: 'later',
    title: 'Buy filters',
    cat: 'system',
    dueOn: '2026-10-04',
    assigneeId: 'alex-b',
    who: 'Alex',
    done: false,
  },
  { id: 'late', title: 'Take bins out', dueOn: '2026-09-30', assigneeId: 'alex-a', who: 'Alex', done: false },
  {
    id: 'today',
    title: 'Call plumber',
    note: 'Kitchen sink',
    dueOn: '2026-10-01',
    assigneeId: null,
    done: false,
  },
  { id: 'done', title: 'Wash sheets', dueOn: '2026-10-01', assigneeId: 'alex-b', done: true },
];
test('today includes overdue tasks and excludes completed and future tasks', () => {
  assert.deepEqual(
    selectTasks(tasks, { scope: 'today', today: '2026-10-01' }).map((t) => t.id),
    ['late', 'today'],
  );
});
test('all open includes maintenance tasks and leaves source order unchanged', () => {
  assert.deepEqual(
    selectTasks(tasks).map((t) => t.id),
    ['late', 'today', 'later'],
  );
  assert.equal(tasks[0].id, 'later');
});
test('member ids distinguish identical names and include shared tasks', () => {
  assert.deepEqual(
    selectTasks(tasks, { owner: 'alex-b' }).map((t) => t.id),
    ['today', 'later'],
  );
  assert.deepEqual(
    selectTasks(tasks, { owner: 'unassigned' }).map((t) => t.id),
    ['today'],
  );
});
test('search matches notes and trims case-insensitive queries', () => {
  assert.deepEqual(
    selectTasks(tasks, { search: '  KITCHEN  ' }).map((t) => t.id),
    ['today'],
  );
});
test('upcoming and completed are separate, and today advances with the clock', () => {
  assert.deepEqual(
    selectTasks(tasks, { scope: 'upcoming', today: '2026-10-01' }).map((t) => t.id),
    ['later'],
  );
  assert.deepEqual(
    selectTasks(tasks, { scope: 'done' }).map((t) => t.id),
    ['done'],
  );
  assert.deepEqual(
    selectTasks(tasks, { scope: 'today', today: '2026-10-04' }).map((t) => t.id),
    ['late', 'today', 'later'],
  );
});
