// Use member ids so two people sharing a name still have their own task lists.
export function selectTasks(tasks, { scope = 'all', owner = 'all', search = '', today } = {}) {
  const query = search.trim().toLocaleLowerCase();
  return tasks
    .filter((task) => {
      if (scope === 'done' ? !task.done : task.done) return false;
      if (scope === 'today' && task.dueOn > today) return false;
      if (scope === 'upcoming' && task.dueOn <= today) return false;
      if (owner === 'unassigned' && task.assigneeId != null) return false;
      if (owner !== 'all' && owner !== 'unassigned' && task.assigneeId !== owner && task.assigneeId != null)
        return false;
      return (
        !query ||
        [task.title, task.note, task.who].filter(Boolean).join(' ').toLocaleLowerCase().includes(query)
      );
    })
    .sort((a, b) => a.dueOn.localeCompare(b.dueOn) || a.title.localeCompare(b.title));
}
