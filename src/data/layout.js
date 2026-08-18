// Putting overlapping events side by side on a day column.
//
// Pure geometry: in go events with a start and an end in minutes, out come
// percentages to position a block with. No React, no dates, no colours — which
// is the only reason the awkward part is readable.
//
// The awkward part is that "how wide is this block" isn't a property of the
// block. A 9am meeting is full width until something else is booked over it,
// and then both are half width, and if a third overlaps only one of them the
// answer changes again. So blocks are grouped into runs that transitively
// overlap, columns are assigned inside a run, and then each block is allowed to
// widen rightwards through any column that nothing overlapping it occupies —
// which is what stops a quiet morning being drawn as slivers because the
// afternoon is busy.

export const DAY_MINUTES = 1440;

// Below about this, a block is too short to hold a title and too small to hit
// with a thumb. It overlaps its neighbour slightly rather than disappearing,
// which is the lesser of the two lies.
const MIN_BLOCK_MINUTES = 26;

export function layoutTimed(items, { minMinutes = MIN_BLOCK_MINUTES } = {}) {
  const blocks = items
    .map((item) => {
      const rawStart = item.startMinutes ?? 0;
      const start = Math.max(0, Math.min(DAY_MINUTES - 1, rawStart));
      let end;
      if (item.endMinutes == null) {
        // No end time: draw an hour, which is what everyone means by "3pm".
        end = start + 60;
      } else if (item.endMinutes <= rawStart) {
        // Crossed midnight. This column gets the part that happened today; the
        // next day draws its own remainder, so nothing is dropped and nothing
        // is drawn twice.
        end = DAY_MINUTES;
      } else {
        end = item.endMinutes;
      }
      return { item, start, end: Math.min(DAY_MINUTES, Math.max(end, start + minMinutes)) };
    })
    // Earliest first; on a tie the longer one takes the left column, so the
    // block that frames the others is the one on the outside.
    .sort((a, b) => a.start - b.start || b.end - a.end);

  const out = [];
  let run = [];
  let runEnd = -1;

  const flush = () => {
    if (run.length === 0) return;

    // Greedy column packing: reuse the leftmost column whose last block has
    // already finished.
    const columns = [];
    for (const b of run) {
      let placed = false;
      for (let c = 0; c < columns.length; c++) {
        if (columns[c].at(-1).end <= b.start) {
          columns[c].push(b);
          b.col = c;
          placed = true;
          break;
        }
      }
      if (!placed) {
        b.col = columns.length;
        columns.push([b]);
      }
    }

    const n = columns.length;
    for (const b of run) {
      let span = 1;
      for (let c = b.col + 1; c < n; c++) {
        if (columns[c].some((o) => o.start < b.end && o.end > b.start)) break;
        span += 1;
      }
      out.push({
        ...b.item,
        // The clamped bounds, which is what a caller drawing into a cropped
        // window needs — `startMinutes` is still the event's real time.
        fromMinutes: b.start,
        toMinutes: b.end,
        top: (b.start / DAY_MINUTES) * 100,
        height: ((b.end - b.start) / DAY_MINUTES) * 100,
        left: (b.col / n) * 100,
        width: (span / n) * 100,
        lane: b.col,
        lanes: n,
        // A block sharing its row is drawn with a hairline gap; a lone one
        // isn't, because a gap with nothing beside it just looks like a mistake.
        crowded: n > 1,
      });
    }
    run = [];
    runEnd = -1;
  };

  for (const b of blocks) {
    if (run.length > 0 && b.start >= runEnd) flush();
    run.push(b);
    runEnd = Math.max(runEnd, b.end);
  }
  flush();

  return out;
}

// Minutes since midnight, for the now-line and for stamping a punch.
export const nowMinutes = (now = new Date()) => now.getHours() * 60 + now.getMinutes();

// Which hours are worth showing.
//
// A day grid drawn midnight to midnight is mostly empty, and the interesting
// part is a band in the middle. So the window tightens to what's actually
// booked, padded by an hour each side, and never narrower than a working day —
// a calendar whose height changes as you page through it is disorienting.
export function busyWindow(items, { pad = 60, floor = 7 * 60, ceiling = 22 * 60 } = {}) {
  const timed = items.filter((i) => i.startMinutes != null);
  if (timed.length === 0) return { from: floor, to: ceiling };

  const earliest = Math.min(...timed.map((i) => i.startMinutes));
  const latest = Math.max(
    ...timed.map((i) => {
      if (i.endMinutes == null) return i.startMinutes + 60;
      return i.endMinutes <= i.startMinutes ? DAY_MINUTES : i.endMinutes;
    }),
  );

  return {
    from: Math.max(0, Math.min(floor, earliest - pad)),
    to: Math.min(DAY_MINUTES, Math.max(ceiling, latest + pad)),
  };
}
