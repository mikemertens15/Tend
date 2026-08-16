// "What actually needs you, right now."
//
// Everything Tend tracks already knows when it's slipping — the trouble is
// that knowing is spread across six screens. This gathers the handful of
// things that are genuinely late or about to be, in one ranked list, so the
// dashboard can lead with them instead of making you go and look.
//
// Pure function of already-loaded data: no fetching, no storage, no
// permissions. The email digest (supabase/functions/daily-digest) computes the
// same list server-side from the same rules.

const URGENCY = { late: 0, soon: 1 };

// Groceries are deliberately not in here: the only interesting signal is
// "over budget", and loading the whole shopping hook on the dashboard to find
// that out costs four queries and a realtime channel for one line of text.
// Spending lives on the Groceries screen, where you're already thinking about it.
// `catchingUp` means the welcome-back card is already on screen and has said
// its piece about overdue chores, in kinder words and with a button that
// actually helps. Repeating it here as a red count directly underneath would
// undo the whole point of it.
export function buildNudges({ tasks = [], systems = [], pets = null, catchingUp = false }) {
  const out = [];

  const overdue = tasks.filter((t) => !t.done && t.dueType === 'overdue');
  if (overdue.length > 0 && !catchingUp) {
    out.push({
      key: 'chores-overdue',
      level: 'late',
      icon: '🧹',
      text:
        overdue.length === 1
          ? `"${overdue[0].title}" is ${overdue[0].dueLabel.toLowerCase()}`
          : `${overdue.length} chores have run late`,
      go: 'chores',
    });
  }

  const dueToday = tasks.filter((t) => !t.done && t.dueType === 'today');
  if (dueToday.length > 0) {
    out.push({
      key: 'chores-today',
      level: 'soon',
      icon: '📅',
      text: `${dueToday.length} ${dueToday.length === 1 ? 'chore is' : 'chores are'} due today`,
      go: 'chores',
    });
  }

  // The one everyone actually wants: has anyone fed the animals.
  if (pets?.mealsLeft > 0 && pets.pets.length > 0) {
    const hungry = pets.pets.filter((p) => !p.allFed).map((p) => p.name);
    out.push({
      key: 'pets-hungry',
      level: new Date().getHours() >= 18 ? 'late' : 'soon',
      icon: '🐾',
      text:
        hungry.length === 1
          ? `${hungry[0]} hasn't been fed yet`
          : `${pets.mealsLeft} meals still to go — ${hungry.join(', ')}`,
      go: 'pets',
    });
  }

  const careLate = (pets?.care ?? []).filter((c) => c.tone === 'red');
  if (careLate.length > 0) {
    out.push({
      key: 'pet-care',
      level: 'late',
      icon: '🧴',
      text: careLate.length === 1 ? careLate[0].name : `${careLate.length} pet jobs are due`,
      go: 'pets',
    });
  }

  const vetSoon = (pets?.upcoming ?? []).filter((e) => e.daysLeft <= 2);
  if (vetSoon.length > 0) {
    const next = vetSoon[0];
    out.push({
      key: 'vet',
      level: 'soon',
      icon: '🩺',
      text: `${next.note || (next.kind === 'vet' ? 'Vet visit' : 'Medication')}${
        next.petName ? ` for ${next.petName}` : ''
      } ${next.daysLeft === 0 ? 'today' : next.daysLeft === 1 ? 'tomorrow' : `in ${next.daysLeft} days`}`,
      go: 'pets',
    });
  }

  const systemsLate = systems.filter((s) => s.tone === 'red');
  if (systemsLate.length > 0) {
    out.push({
      key: 'systems',
      level: 'late',
      icon: '🔧',
      text: systemsLate.length === 1 ? `${systemsLate[0].name} — ${systemsLate[0].status.toLowerCase()}` : `${systemsLate.length} home systems are overdue`,
      go: 'systems',
    });
  }

  return out.sort((a, b) => URGENCY[a.level] - URGENCY[b.level]);
}
