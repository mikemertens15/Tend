// Filtering a list by person.
//
// The rule that matters: something with **no** owner belongs to the whole
// household, so it shows under everyone's filter rather than nobody's. Getting
// this wrong hides items completely — a shared show filed under "Shared" while
// the filter sat on your own name simply vanished, and in a one-person
// household the filter chips aren't even rendered, so there was no way to get
// it back.
//
// Lives here rather than inline because chores and hobbies both need it and
// both got it wrong the same way.

export const OWNER_ALL = 'all';

export function matchesOwner(filter, owner) {
  if (filter === OWNER_ALL) return true;
  if (owner == null) return true; // shared — everyone's
  return owner === filter;
}
