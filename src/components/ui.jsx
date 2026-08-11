import { colors, tone } from '../theme';
import { useHousehold } from '../household/HouseholdProvider';

// Round person avatar with their initial. Member colors come from the household.
export function Avatar({ who, size = 36 }) {
  const { peopleMap } = useHousehold();
  const p = peopleMap[who] || {
    bg: colors.chipBg,
    color: colors.muted2,
    initial: who ? who[0].toUpperCase() : '?',
  };
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: p.bg,
        color: p.color,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        font: `600 ${size < 30 ? 12 : 14}px ${"'Hanken Grotesk'"}`,
        flexShrink: 0,
      }}
    >
      {p.initial}
    </div>
  );
}

// Tappable rounded checkbox; filled with a checkmark when done.
export function Check({ done, onClick }) {
  return (
    <button
      onClick={onClick}
      aria-label={done ? 'Mark as not done' : 'Mark as done'}
      style={
        done
          ? {
              width: 20,
              height: 20,
              borderRadius: 7,
              background: colors.accent,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }
          : {
              width: 20,
              height: 20,
              borderRadius: 7,
              border: `2px solid ${colors.inputBorder}`,
              background: 'transparent',
              flexShrink: 0,
            }
      }
    >
      {done && (
        <div
          style={{
            width: 9,
            height: 5,
            borderLeft: `2px solid ${colors.onAccent}`,
            borderBottom: `2px solid ${colors.onAccent}`,
            transform: 'rotate(-45deg)',
            marginTop: -2,
          }}
        />
      )}
    </button>
  );
}

// Due-date pill shown at the end of a task row. The text is whatever the task
// hook derived from its due date; only the emphasis changes here.
export function duePillProps(t) {
  if (t.done) return { bg: 'transparent', color: tone.green, text: 'Done' };
  if (t.dueType === 'overdue') return { bg: tone.red, color: colors.onAccent, text: t.dueLabel };
  if (t.dueType === 'today') return { bg: colors.selected, color: colors.ink, text: 'Today' };
  return { bg: colors.chipBg, color: colors.muted2, text: t.dueLabel };
}

export function Pill({ task }) {
  const p = duePillProps(task);
  return (
    <span
      style={{
        font: "600 11px 'Hanken Grotesk'",
        color: p.color,
        background: p.bg,
        padding: '4px 10px',
        borderRadius: 20,
        flexShrink: 0,
        whiteSpace: 'nowrap',
      }}
    >
      {p.text}
    </span>
  );
}

// Thin rounded progress bar.
export function ProgressBar({ pct, height = 6, fill = colors.accent }) {
  return (
    <div style={{ height, borderRadius: 5, background: colors.track, overflow: 'hidden' }}>
      <div style={{ width: `${pct}%`, height: '100%', background: fill, borderRadius: 5 }} />
    </div>
  );
}

// Standard cream card used throughout the app. Pass `as="button"` for a
// clickable card (e.g. the dashboard summary tiles).
export function Card({ as: Tag = 'div', children, style, ...rest }) {
  return (
    <Tag
      style={{
        display: 'block',
        width: '100%',
        background: colors.card,
        border: `1px solid ${colors.cardBorder}`,
        borderRadius: 20,
        ...style,
      }}
      {...rest}
    >
      {children}
    </Tag>
  );
}
