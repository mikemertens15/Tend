// Chores organised by where they happen.
//
// A flat list of everything a house needs is unreadable — it's a wall of
// unrelated jobs and you bounce off it. "The kitchen needs three things" is
// something you can actually pick up and finish, so the room is the unit the
// chores screen is built around.

export const ROOMS = [
  ['kitchen', 'Kitchen', '🍳'],
  ['living', 'Living room', '🛋️'],
  ['dining', 'Dining room', '🍽️'],
  ['bedroom', 'Bedrooms', '🛏️'],
  ['bathroom', 'Bathrooms', '🛁'],
  ['laundry', 'Laundry', '🧺'],
  ['office', 'Office', '💻'],
  ['basement', 'Basement', '🪜'],
  ['garage', 'Garage', '🧰'],
  ['outside', 'Outside', '🌳'],
  ['whole', 'Whole house', '🏠'],
];

export const ROOM_RANK = Object.fromEntries(ROOMS.map(([key], i) => [key, i]));

export const roomMeta = (key) => ROOMS.find(([k]) => k === key) ?? ['whole', 'Whole house', '🏠'];

// How long a job takes, which is really the question "do I have time for this
// right now?" — the chores screen turns it back into an answer.
export const EFFORTS = [
  [5, 'A few minutes'],
  [15, 'Quarter hour'],
  [30, 'Half hour'],
  [60, 'An hour or more'],
];

export const effortLabel = (mins) => {
  if (!mins) return null;
  if (mins < 60) return `${mins} min`;
  return mins === 60 ? '1 hr' : `${Math.round(mins / 60)} hr`;
};

// Guess the room from what someone just typed, so the common cases need no
// extra tap. Only ever a pre-selection — the picker is right there, and a wrong
// guess costs one click.
const HINTS = [
  [/dish|sink|counter|fridge|freezer|oven|stove|microwave|pantry|dishwasher/i, 'kitchen'],
  [/laundry|washer|dryer|fold|iron|linen/i, 'laundry'],
  [/toilet|shower|bath|tub|towel|sink.*bath/i, 'bathroom'],
  [/bed|sheet|duvet|pillow|wardrobe|closet/i, 'bedroom'],
  [/lawn|mow|garden|weed|leaves|gutter|deck|patio|snow|shovel|hedge|trash.*bin|bins?\b/i, 'outside'],
  [/car|garage|tool|workbench|bike/i, 'garage'],
  [/desk|paperwork|filing|printer|invoice|mail\b/i, 'office'],
  [/couch|sofa|tv|living/i, 'living'],
  [/table|dining/i, 'dining'],
  [/basement|furnace|water heater|sump|storage/i, 'basement'],
  [/vacuum|hoover|dust|mop|sweep|tidy|declutter|window/i, 'whole'],
];

export function guessRoom(title) {
  const t = (title || '').trim();
  if (t.length < 3) return null;
  return HINTS.find(([re]) => re.test(t))?.[1] ?? null;
}
