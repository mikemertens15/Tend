// Coming back after a few days away.
//
// Tend is for people with lives, which means it will regularly go unopened for
// a stretch. The naive result is punishing: open it on Thursday and every chore
// since Sunday is sitting there in red, each one labelled with exactly how late
// you are. That's a scoreboard of failures, and the honest response to a
// scoreboard of failures is to close the app again.
//
// The fix isn't a gentler colour. It's noticing that most of those rows don't
// represent work that's actually owed. You don't sweep the floor twice because
// you skipped Tuesday — the floor needs sweeping once, today. A missed daily
// chore is a missed *occurrence* of a rhythm, and the rhythm is the point. A
// missed furnace filter is a different thing entirely: that one really is still
// waiting, and pretending otherwise would be lying to you about your house.
//
// So this splits what slipped into the part that rolls and the part that
// stands, and the dashboard offers to clear the first in one tap.
//
// Pure function over already-loaded data, like nudges.js — no fetching, no
// storage, no permissions. `useLastSeen` decides that you were away; this
// decides what being away meant.

// How long you have to be gone before this counts as an absence rather than a
// normal gap. Two days is a weekend and needs no ceremony; three is life
// getting in the way, which is the case worth handling.
export const AWAY_DAYS = 3;

// A repeat at or under this cadence rolls forward. Anything longer stands: at
// fortnightly and beyond, a missed occurrence is a job that genuinely didn't
// happen rather than a beat you dropped, and re-dating it would quietly erase
// work the house still needs.
export const ROLL_MAX_CADENCE = 7;

// Never re-date something on the strength of one skipped beat — a weekly chore
// one day late is just late, and rolling it would move the goalposts rather
// than forgive them.
export const ROLL_MIN_DAYS_LATE = 2;

export const isRolling = (t) =>
  t.repeatDays != null && t.repeatDays <= ROLL_MAX_CADENCE && -t.daysLeft >= ROLL_MIN_DAYS_LATE;

// Most overdue first: if only three things fit on the card, they should be the
// three that have been waiting longest.
const byLateness = (a, b) => a.daysLeft - b.daysLeft;

// Returns null when there's nothing to catch up on, so the caller can render
// nothing without checking three fields.
export function buildCatchUp({ tasks = [], awayDays = 0 }) {
  if (awayDays < AWAY_DAYS) return null;

  const overdue = tasks.filter((t) => !t.done && t.dueType === 'overdue');
  if (overdue.length === 0) return null;

  const rolling = overdue.filter(isRolling).sort(byLateness);
  // Everything that isn't rhythm: one-offs, and the long-cadence upkeep where
  // missing it actually means something.
  const standing = overdue.filter((t) => !isRolling(t)).sort(byLateness);

  return {
    awayDays,
    rolling,
    standing,
    total: overdue.length,
    rollIds: rolling.map((t) => t.id),
  };
}

const WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];

const count = (n) => WORDS[n] ?? String(n);

// Spelled-out counts open sentences here, and "two things waited for you"
// reads like a typo. A no-op on the numerals used past ten.
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

// "four days", but "a week" rather than "seven days" — past a point the exact
// number stops being information and starts being an accusation.
export function awayLabel(days) {
  if (days >= 21) return 'a few weeks';
  if (days >= 12) return 'a couple of weeks';
  if (days >= 6) return 'a week or so';
  return `${count(days)} days`;
}

// The card's copy, kept here with the rules that produce it so the wording
// can't drift from what the buttons actually do.
//
// The body always states the size of the pile before it starts dividing it up.
// Naming a fraction first ("four of them are just…") leaves "them" pointing at
// the only number already on screen, which is the count of days you were gone.
export function catchUpCopy(c) {
  const headline = `You've been away ${awayLabel(c.awayDays)}.`;
  const rolls = c.rolling.length;
  const stands = c.standing.length;

  // Nothing recurring to forgive: the pile is the whole story.
  if (rolls === 0) {
    return {
      headline,
      body:
        stands === 1
          ? 'One thing waited for you. Nothing else slipped.'
          : `${cap(count(stands))} things waited for you.`,
      rollLabel: null,
    };
  }

  const slipped = `${cap(count(rolls + stands))} ${rolls + stands === 1 ? 'thing' : 'things'} slipped while you were gone.`;

  return {
    headline,
    body:
      stands === 0
        ? `${slipped} ${rolls === 1 ? "It's" : "They're all"} just the daily rhythm — nothing here is actually broken.`
        : `${slipped} ${cap(count(rolls))} ${rolls === 1 ? 'is' : 'are'} just the daily rhythm and can move to today. ` +
          `${cap(count(stands))} still ${stands === 1 ? 'wants' : 'want'} you.`,
    rollLabel: rolls === 1 ? 'Move it to today' : `Move ${rolls} to today`,
  };
}
