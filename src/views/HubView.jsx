import { colors, tone, fonts } from '../theme';
import { useWallClock, useWakeLock, useNightlyReload } from '../useWallClock';
import { useTasks } from '../data/useTasks';
import { useEvents } from '../data/useEvents';
import { useMeals } from '../data/useMeals';
import { usePets } from '../data/usePets';
import { useHousehold } from '../household/HouseholdProvider';
import { Avatar } from '../components/ui';
import { dayStr, addDays, parseDay, longDate, shortDay, monthDay } from '../dates';

// The kitchen display: a screen on a wall that nobody touches, read from
// across a room.
//
// Different rules from the rest of the app. Nothing is small, nothing is
// hidden behind a tap, and nothing scrolls — if it doesn't fit it doesn't
// belong here. Sizes are in vmin so the same layout works on a 10" tablet and
// a 40" TV without a breakpoint.

export function HubView({ navigate }) {
  const now = useWallClock();
  useWakeLock(true);
  useNightlyReload(true);

  const { household } = useHousehold();
  const { tasks, toggle } = useTasks();
  const ev = useEvents();
  const { mealsByKey } = useMeals();
  const pets = usePets();

  // Derived from the ticking clock, so the display rolls over at midnight on
  // its own rather than showing yesterday until someone reloads it.
  const today = dayStr(now);
  const tonight = mealsByKey[`${today}:dinner`];

  const todayEvents = ev.between(today, today);
  const todayTasks = tasks.filter((t) => !t.done && t.dueOn <= today).sort((a, b) => a.daysLeft - b.daysLeft);
  const doneToday = tasks.filter((t) => t.done && t.dueOn === today).length;

  const ahead = [1, 2, 3, 4].map((n) => {
    const date = addDays(today, n);
    return {
      date,
      label: n === 1 ? 'Tomorrow' : shortDay(parseDay(date)),
      events: ev.between(date, date),
      meal: mealsByKey[`${date}:dinner`],
      tasks: tasks.filter((t) => !t.done && t.dueOn === date).length,
    };
  });

  const hh = now.getHours();
  const greeting = hh < 12 ? 'Good morning' : hh < 18 ? 'Good afternoon' : 'Good evening';
  const time = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

  return (
    <div
      className="tend-hub"
      style={{
        minHeight: '100vh',
        background: colors.bg,
        padding: '3.5vmin 4vmin',
        display: 'flex',
        flexDirection: 'column',
        gap: '2.6vmin',
      }}
    >
      {/* Header: time, date, and the way out. */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '3vmin' }}>
        <div>
          <div style={{ font: `600 ${clamp(9)} ${fonts.sans}`, color: colors.ink, lineHeight: 0.95, letterSpacing: '-.02em' }}>
            {time}
          </div>
          <div style={{ font: `400 ${clamp(2.6)} ${fonts.serif}`, color: colors.muted2, marginTop: '1vmin' }}>
            {longDate(now)}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ font: `400 ${clamp(2.8)} ${fonts.serif}`, color: colors.ink }}>
            {greeting}
          </div>
          <div style={{ font: `400 ${clamp(1.6)} ${fonts.sans}`, color: colors.muted, marginTop: '.4vmin' }}>
            {household?.name}
          </div>
          <button
            onClick={() => navigate('calendar')}
            title="Leave the display"
            style={{ marginTop: '1.2vmin', font: `500 ${clamp(1.4)} ${fonts.sans}`, color: colors.faint, padding: '.6vmin 1.2vmin', borderRadius: 20, background: colors.chipBg }}
          >
            Exit display
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.25fr 1fr', gap: '2.6vmin', flex: 1, minHeight: 0 }}>
        {/* Today */}
        <Panel title="Today">
          {todayEvents.length === 0 && todayTasks.length === 0 ? (
            <Empty>
              Nothing on. {doneToday > 0 ? `${doneToday} done already.` : 'Enjoy it.'}
            </Empty>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1vmin' }}>
              {todayEvents.map((e) => (
                <Row key={e.id} icon={e.icon} accent>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    {e.title}
                    {e.age != null && e.age > 0 && ` (${e.age})`}
                  </span>
                  {e.time && <Meta>{e.time}</Meta>}
                  {e.who && <Avatar who={e.who} size={26} />}
                </Row>
              ))}
              {todayTasks.slice(0, 7).map((t) => (
                <Row
                  key={t.id}
                  icon={t.dueType === 'overdue' ? '⏰' : '○'}
                  danger={t.dueType === 'overdue'}
                  onClick={() => toggle(t.id)}
                >
                  <span style={{ flex: 1, minWidth: 0 }}>{t.title}</span>
                  {t.dueType === 'overdue' && <Meta danger>{t.dueLabel}</Meta>}
                  {t.who && <Avatar who={t.who} size={26} />}
                </Row>
              ))}
              {todayTasks.length > 7 && <Meta>+{todayTasks.length - 7} more</Meta>}
            </div>
          )}
        </Panel>

        {/* The right column stacks the two questions asked most often in a
            kitchen: what's for dinner, and have the animals been fed. */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2.6vmin', minHeight: 0 }}>
          <Panel title="Dinner" grow={false}>
            {tonight ? (
              <>
                <div style={{ font: `400 ${clamp(3.4)} ${fonts.serif}`, color: colors.ink, lineHeight: 1.15 }}>
                  {tonight.title}
                </div>
                {tonight.cook && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1vmin', marginTop: '1.2vmin' }}>
                    <Avatar who={tonight.cook} size={28} />
                    <span style={{ font: `500 ${clamp(1.6)} ${fonts.sans}`, color: colors.muted2 }}>
                      {tonight.cook} is cooking
                    </span>
                  </div>
                )}
              </>
            ) : (
              <Empty>Nothing planned</Empty>
            )}
          </Panel>

          {pets.pets.length > 0 && (
            <Panel title="The animals" grow={false}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1vmin' }}>
                {pets.pets.map((p) => (
                  <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '1.4vmin' }}>
                    <span style={{ fontSize: clamp(2.6) }}>{p.emoji}</span>
                    <span style={{ flex: 1, font: `600 ${clamp(1.9)} ${fonts.sans}`, color: colors.ink }}>{p.name}</span>
                    <span style={{ display: 'flex', gap: '.7vmin' }}>
                      {p.meals.map((m) => (
                        <span
                          key={m.slot}
                          title={`${m.label}${m.fed ? ` — fed${m.by ? ` by ${m.by}` : ''}` : ''}`}
                          style={{
                            width: clamp(1.5),
                            height: clamp(1.5),
                            borderRadius: '50%',
                            background: m.fed ? tone.green : 'transparent',
                            border: `2px solid ${m.fed ? tone.green : colors.faint}`,
                          }}
                        />
                      ))}
                    </span>
                  </div>
                ))}
              </div>
              {pets.mealsLeft > 0 && (
                <div style={{ font: `600 ${clamp(1.5)} ${fonts.sans}`, color: colors.accent, marginTop: '1.4vmin' }}>
                  {pets.mealsLeft} {pets.mealsLeft === 1 ? 'meal' : 'meals'} still to go
                </div>
              )}
            </Panel>
          )}
        </div>
      </div>

      {/* The next few days, so the week is visible without touching anything. */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.6vmin' }}>
        {ahead.map((d) => (
          <div
            key={d.date}
            style={{
              background: colors.card,
              border: `1px solid ${colors.cardBorder}`,
              borderRadius: '1.6vmin',
              padding: '1.6vmin 1.8vmin',
              minWidth: 0,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '.8vmin' }}>
              <span style={{ font: `600 ${clamp(1.5)} ${fonts.sans}`, color: colors.muted2, textTransform: 'uppercase', letterSpacing: '.05em' }}>
                {d.label}
              </span>
              <span style={{ font: `500 ${clamp(1.3)} ${fonts.sans}`, color: colors.faint }}>
                {monthDay(parseDay(d.date))}
              </span>
            </div>
            {d.events.slice(0, 2).map((e) => (
              <div
                key={e.id}
                style={{ font: `600 ${clamp(1.5)} ${fonts.sans}`, color: colors.ink, marginBottom: '.4vmin', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
              >
                {e.icon} {e.title}
              </div>
            ))}
            {d.meal && (
              <div style={{ font: `500 ${clamp(1.4)} ${fonts.sans}`, color: colors.muted2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                🍽 {d.meal.title}
              </div>
            )}
            {d.events.length === 0 && !d.meal && (
              <div style={{ font: `400 ${clamp(1.4)} ${fonts.sans}`, color: colors.faint }}>
                {d.tasks > 0 ? `${d.tasks} to do` : 'Clear'}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// Sizes scale with the smaller viewport dimension, with a floor so a phone
// held up to check something is still legible.
const clamp = (v) => `clamp(${v * 4.2}px, ${v}vmin, ${v * 11}px)`;

function Panel({ title, children, grow = true }) {
  return (
    <div
      style={{
        background: colors.card,
        border: `1px solid ${colors.cardBorder}`,
        borderRadius: '2vmin',
        padding: '2.2vmin 2.4vmin',
        flex: grow ? 1 : '0 0 auto',
        minHeight: 0,
        overflow: 'hidden',
      }}
    >
      <div style={{ font: `600 ${clamp(1.4)} ${fonts.sans}`, color: colors.faint, letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: '1.6vmin' }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function Row({ icon, children, accent, danger, onClick }) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '1.3vmin',
        width: '100%',
        textAlign: 'left',
        padding: '1vmin 1.4vmin',
        borderRadius: '1.2vmin',
        background: accent ? colors.chipBg : colors.inputBg,
        border: `1px solid ${danger ? tone.red : 'transparent'}`,
        font: `600 ${clamp(2)} ${fonts.sans}`,
        color: colors.ink,
      }}
    >
      <span aria-hidden="true" style={{ fontSize: clamp(1.9), flexShrink: 0, color: danger ? tone.red : colors.muted }}>
        {icon}
      </span>
      {children}
    </Tag>
  );
}

function Meta({ children, danger }) {
  return (
    <span style={{ font: `600 ${clamp(1.5)} ${fonts.sans}`, color: danger ? tone.red : colors.muted, flexShrink: 0 }}>
      {children}
    </span>
  );
}

function Empty({ children }) {
  return <div style={{ font: `400 ${clamp(2)} ${fonts.sans}`, color: colors.faint }}>{children}</div>;
}
