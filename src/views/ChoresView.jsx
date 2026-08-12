import { useState } from 'react';
import { colors, tone, shadows, fonts } from '../theme';
import { Card, Avatar, Check, Pill } from '../components/ui';
import { useIsNarrow } from '../useMediaQuery';
import { useHousehold } from '../household/HouseholdProvider';
import { ROOMS, ROOM_RANK, roomMeta, effortLabel } from '../data/rooms';
import { matchesOwner } from '../data/owner';

// Chores, arranged by room rather than as one long list.
//
// The list version was unreadable for the same reason a to-do list of your
// whole life is: nothing on it relates to anything next to it, so there's no
// natural place to start. A room is a place you're already standing, with a
// finite number of jobs and a visible end — so the room is the unit here, and
// the two things that decide what you actually do next (how long have I got,
// whose turn is it) are the filters on top.
export function ChoresView({ tasks, onToggle, onAdd }) {
  const narrow = useIsNarrow();
  const { order } = useHousehold();
  const [who, setWho] = useState('all');
  const [minutes, setMinutes] = useState(null);
  const [showDone, setShowDone] = useState(false);

  const chores = tasks.filter((t) => t.cat === 'chore');
  // Unassigned chores are everyone's, so they show under every filter.
  const mine = chores.filter((t) => matchesOwner(who, t.who));
  const open = mine.filter((t) => !t.done);
  const done = mine.filter((t) => t.done);

  // "I've got 15 minutes" — anything that fits, soonest first. Chores with no
  // estimate are left out rather than assumed short; guessing here would send
  // you off to do something that turns out to take an hour.
  const fits = minutes ? open.filter((t) => t.effortMinutes && t.effortMinutes <= minutes) : [];

  const rooms = ROOMS.map(([key, label, icon]) => {
    const all = mine.filter((t) => t.room === key);
    return { key, label, icon, all, open: all.filter((t) => !t.done), done: all.filter((t) => t.done) };
  })
    .filter((r) => r.all.length > 0)
    .sort((a, b) => b.open.length - a.open.length || ROOM_RANK[a.key] - ROOM_RANK[b.key]);

  const chips = [['all', 'Everyone'], ...order.map((n) => [n, n])];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16, marginBottom: 18, flexWrap: 'wrap' }}>
        <div>
          <div style={{ font: `400 30px ${fonts.serif}`, color: colors.ink }}>Chores</div>
          <div style={{ font: `400 13.5px ${fonts.sans}`, color: colors.muted, marginTop: 2 }}>
            {open.length === 0
              ? chores.length === 0
                ? 'Nothing on the board yet.'
                : 'Every room is clear. 🎉'
              : `${open.length} to do across ${rooms.filter((r) => r.open.length).length} ${
                  rooms.filter((r) => r.open.length).length === 1 ? 'room' : 'rooms'
                }`}
          </div>
        </div>
        <button
          onClick={onAdd}
          style={{ padding: '9px 17px', borderRadius: 22, background: colors.accent, color: colors.onAccent, font: `600 13px ${fonts.sans}`, boxShadow: shadows.accent, whiteSpace: 'nowrap' }}
        >
          + Add chore
        </button>
      </div>

      {order.length > 1 && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
          {chips.map(([key, label]) => {
            const active = who === key;
            return (
              <button
                key={key}
                onClick={() => setWho(key)}
                style={
                  active
                    ? { padding: '7px 15px', borderRadius: 20, background: colors.accent, color: colors.onAccent, font: `600 12.5px ${fonts.sans}` }
                    : { padding: '7px 15px', borderRadius: 20, background: colors.card, border: `1px solid ${colors.cardBorder}`, color: colors.muted2, font: `500 12.5px ${fonts.sans}` }
                }
              >
                {label}
              </button>
            );
          })}
        </div>
      )}

      {open.length > 0 && (
        <Card style={{ padding: '16px 22px', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <span style={{ font: `600 13px ${fonts.sans}`, color: colors.ink }}>Got a minute?</span>
            {[5, 15, 30, 60].map((m) => {
              const active = minutes === m;
              return (
                <button
                  key={m}
                  onClick={() => setMinutes(active ? null : m)}
                  style={
                    active
                      ? { padding: '6px 13px', borderRadius: 18, background: colors.accent, color: colors.onAccent, font: `600 12.5px ${fonts.sans}` }
                      : { padding: '6px 13px', borderRadius: 18, background: colors.inputBg, border: `1px solid ${colors.cardBorder}`, color: colors.muted2, font: `500 12.5px ${fonts.sans}` }
                  }
                >
                  {m < 60 ? `${m} min` : '1 hr+'}
                </button>
              );
            })}
          </div>

          {minutes !== null && (
            <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px solid ${colors.divider}` }}>
              {fits.length === 0 ? (
                <div style={{ font: `400 13px ${fonts.sans}`, color: colors.muted }}>
                  Nothing open takes {minutes < 60 ? `${minutes} minutes` : 'an hour'} or less
                  {open.some((t) => !t.effortMinutes) ? ' — some chores have no time estimate yet.' : '.'}
                </div>
              ) : (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {fits
                    .sort((a, b) => a.effortMinutes - b.effortMinutes || a.daysLeft - b.daysLeft)
                    .slice(0, 6)
                    .map((t) => (
                      <button
                        key={t.id}
                        onClick={() => onToggle(t.id)}
                        title="Check it off"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 8,
                          padding: '8px 14px',
                          borderRadius: 20,
                          background: colors.inputBg,
                          border: `1px solid ${colors.selected}`,
                          font: `500 12.5px ${fonts.sans}`,
                          color: colors.ink,
                        }}
                      >
                        <span aria-hidden="true">{roomMeta(t.room)[2]}</span>
                        {t.title}
                        <span style={{ font: `600 11px ${fonts.sans}`, color: colors.muted }}>
                          {effortLabel(t.effortMinutes)}
                        </span>
                      </button>
                    ))}
                </div>
              )}
            </div>
          )}
        </Card>
      )}

      {chores.length === 0 ? (
        <Card style={{ padding: '38px 30px', textAlign: 'center' }}>
          <div style={{ fontSize: 34, marginBottom: 10 }}>🧹</div>
          <div style={{ font: `400 20px ${fonts.serif}`, color: colors.ink, marginBottom: 6 }}>Nothing on the board</div>
          <div style={{ font: `400 13.5px ${fonts.sans}`, color: colors.muted }}>
            Add a chore and it'll sort itself into the right room.
          </div>
        </Card>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: narrow ? '1fr' : 'repeat(auto-fit, minmax(330px, 1fr))', gap: 18, alignItems: 'start' }}>
          {rooms.map((room) => (
            <RoomCard key={room.key} room={room} showDone={showDone} onToggle={onToggle} />
          ))}
        </div>
      )}

      {done.length > 0 && (
        <button
          onClick={() => setShowDone((s) => !s)}
          style={{ display: 'block', margin: '20px auto 0', font: `600 12.5px ${fonts.sans}`, color: colors.muted2, background: colors.chipBg, padding: '8px 16px', borderRadius: 20 }}
        >
          {showDone ? 'Hide' : 'Show'} {done.length} finished
        </button>
      )}
    </div>
  );
}

function RoomCard({ room, showDone, onToggle }) {
  const total = room.all.length;
  const complete = room.done.length;
  const pct = total ? Math.round((complete / total) * 100) : 0;
  const clear = room.open.length === 0;
  const overdue = room.open.filter((t) => t.dueType === 'overdue').length;
  const visible = showDone ? [...room.open, ...room.done] : room.open;

  return (
    <Card style={{ padding: '18px 22px 8px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 13, marginBottom: 6 }}>
        <div
          aria-hidden="true"
          style={{
            width: 40,
            height: 40,
            borderRadius: 14,
            background: colors.chipBg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 19,
            flexShrink: 0,
          }}
        >
          {room.icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ font: `400 20px ${fonts.serif}`, color: colors.ink }}>{room.label}</div>
          <div style={{ font: `400 12px ${fonts.sans}`, color: overdue ? tone.red : colors.muted, marginTop: 1 }}>
            {clear
              ? 'All clear'
              : overdue
                ? `${room.open.length} to do · ${overdue} overdue`
                : `${room.open.length} to do`}
          </div>
        </div>
        <Ring pct={pct} done={clear} />
      </div>

      {visible.length === 0 ? (
        <div style={{ font: `400 12.5px ${fonts.sans}`, color: colors.faint, padding: '12px 0 14px' }}>
          Nothing left in here.
        </div>
      ) : (
        visible.map((t) => (
          <div
            key={t.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '11px 0',
              borderTop: `1px solid ${colors.divider}`,
            }}
          >
            <Check done={t.done} onClick={() => onToggle(t.id)} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  font: `600 13.5px ${fonts.sans}`,
                  color: t.done ? colors.faint : colors.ink,
                  textDecoration: t.done ? 'line-through' : 'none',
                }}
              >
                {t.title}
              </div>
              <div style={{ font: `400 11.5px ${fonts.sans}`, color: colors.muted, marginTop: 1 }}>
                {[effortLabel(t.effortMinutes), t.repeatLabel, t.who].filter(Boolean).join(' · ') || 'Anyone'}
              </div>
            </div>
            {t.who && <Avatar who={t.who} size={24} />}
            <Pill task={t} />
          </div>
        ))
      )}
    </Card>
  );
}

// A small progress donut. The flare that makes a room feel finishable — a bar
// says "some progress", a closing ring says "nearly there".
function Ring({ pct, done, size = 38 }) {
  const r = (size - 5) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={colors.track} strokeWidth="4" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={done ? tone.green : colors.accent}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={`${(c * pct) / 100} ${c}`}
        />
      </svg>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          font: `600 ${done ? 14 : 10.5}px ${fonts.sans}`,
          color: done ? tone.green : colors.muted2,
        }}
      >
        {done ? '✓' : `${pct}%`}
      </div>
    </div>
  );
}
