import { colors, tone, heroGradient, fonts, catLabel } from '../theme';
import { greeting, longDate, shortDate, dayStr } from '../dates';
import { Avatar, Card, Pill, Check, ProgressBar } from '../components/ui';
import { useIsNarrow } from '../useMediaQuery';
import { useHousehold } from '../household/HouseholdProvider';
import { useCollection } from '../data/useCollection';
import { DOMAINS, ALL_HOBBY_DOMAINS, isUnderway } from '../data/collections';
import { targetTone } from '../data/useGoals';
import { usePets } from '../data/usePets';
import { ROOMS } from '../data/rooms';
import { buildNudges } from '../data/nudges';

export function HomeView({ tasks, systems, mealsByKey = {}, goals = [], week, onToggle, navigate }) {
  const narrow = useIsNarrow();
  const { order, currentMember } = useHousehold();
  const { items: hobbies } = useCollection(ALL_HOBBY_DOMAINS);
  // Only Home and the Pets section load this, so the rest of the app doesn't
  // pay for three tables it isn't showing.
  const pets = usePets();
  const greetingName = currentMember?.name || 'there';
  const today = week.days[week.todayIndex].date;

  const doneCount = tasks.filter((t) => t.done).length;
  const overdueCount = tasks.filter((t) => !t.done && t.dueType === 'overdue').length;
  const todoCount = tasks.filter((t) => !t.done && t.dueType !== 'overdue').length;

  const upNext = tasks
    .filter((t) => !t.done)
    .sort((a, b) => a.daysLeft - b.daysLeft)
    .slice(0, 6);

  const family = order.map((name) => {
    const mine = tasks.filter((t) => t.who === name);
    const done = mine.filter((t) => t.done).length;
    const pct = mine.length ? Math.round((done / mine.length) * 100) : 0;
    return { name, done, total: mine.length, pct };
  });

  const inProgress = hobbies.filter(isUnderway).slice(0, 5);

  // Everything that's actually slipping, gathered from the sections that would
  // otherwise each need visiting to find out.
  const nudges = buildNudges({ tasks, systems, pets });

  // Which rooms still want something, busiest first.
  const busyRooms = ROOMS.map(([key, label, icon]) => ({
    key,
    label,
    icon,
    open: tasks.filter((t) => t.cat === 'chore' && !t.done && t.room === key).length,
  }))
    .filter((r) => r.open > 0)
    .sort((a, b) => b.open - a.open);

  // Tonight + the next two evenings for the menu card.
  const menuDays = [0, 1, 2].map((i) => {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    const label = i === 0 ? 'Tonight' : i === 1 ? 'Tomorrow' : longDate(d).split(',')[0];
    return { label, meal: mealsByKey[`${dayStr(d)}:dinner`] };
  });

  return (
    <div>
      {/* hero + family */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: narrow ? '1fr' : '1.1fr 1fr',
          gap: 22,
          alignItems: 'stretch',
          marginBottom: 22,
        }}
      >
        {/* hero */}
        <div
          style={{
            background: heroGradient,
            borderRadius: 20,
            padding: '28px 30px',
            color: colors.onAccent,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div style={{ position: 'absolute', right: -40, top: -40, width: 180, height: 180, borderRadius: '50%', background: 'rgba(255,255,255,.07)' }} />
          <div style={{ position: 'absolute', right: 40, bottom: -60, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,.05)' }} />
          <div style={{ font: `400 31px/1.15 ${fonts.serif}`, maxWidth: 340, position: 'relative' }}>
            {greeting()}, {greetingName}. The home needs a little love this week.
          </div>
          <div style={{ display: 'flex', gap: 36, marginTop: 26, position: 'relative' }}>
            <HeroStat n={todoCount} label="to do" />
            <HeroStat n={overdueCount} label="overdue" />
            <HeroStat n={doneCount} label="done" />
          </div>
          <div style={{ font: `400 13px ${fonts.sans}`, opacity: 0.8, marginTop: 24, position: 'relative' }}>
            {longDate(today)} · Week of {shortDate(week.monday)}
          </div>
        </div>

        {/* family */}
        <Card style={{ padding: '22px 26px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 16 }}>
            <div style={{ font: `400 22px ${fonts.serif}`, color: colors.ink }}>The family this week</div>
            <button onClick={() => navigate('chores')} style={{ font: `500 12.5px ${fonts.sans}`, color: colors.accent }}>
              Manage chores
            </button>
          </div>
          {family.map((p) => (
            <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: 13, marginBottom: 15 }}>
              <Avatar who={p.name} size={36} />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', font: `600 14px ${fonts.sans}`, color: colors.ink }}>
                  <span>{p.name}</span>
                  <span style={{ color: colors.muted, fontWeight: 500, fontSize: 12 }}>
                    {p.done} / {p.total} done
                  </span>
                </div>
                <div style={{ marginTop: 6 }}>
                  <ProgressBar pct={p.pct} />
                </div>
              </div>
            </div>
          ))}
        </Card>
      </div>

      {/* what's actually slipping */}
      {nudges.length > 0 && (
        <Card style={{ padding: '16px 24px', marginBottom: 22 }}>
          <div style={{ font: `600 11px ${fonts.sans}`, color: colors.faint, letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 12 }}>
            Needs you
          </div>
          <div style={{ display: 'flex', gap: 9, flexWrap: 'wrap' }}>
            {nudges.map((n) => (
              <button
                key={n.key}
                onClick={() => navigate(n.go)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 9,
                  padding: '9px 15px',
                  borderRadius: 20,
                  background: n.level === 'late' ? colors.chipBg : colors.inputBg,
                  border: `1px solid ${n.level === 'late' ? tone.red : colors.cardBorder}`,
                  font: `500 12.5px ${fonts.sans}`,
                  color: colors.ink,
                  textAlign: 'left',
                }}
              >
                <span aria-hidden="true" style={{ fontSize: 14 }}>
                  {n.icon}
                </span>
                {n.text}
              </button>
            ))}
          </div>
        </Card>
      )}

      {/* up next */}
      <Card style={{ padding: '22px 26px', marginBottom: 22 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
          <div style={{ font: `400 22px ${fonts.serif}`, color: colors.ink }}>Up next</div>
          <button onClick={() => navigate('calendar')} style={{ font: `500 12.5px ${fonts.sans}`, color: colors.accent }}>
            See the week
          </button>
        </div>
        {upNext.map((t) => (
          <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '13px 0', borderTop: `1px solid ${colors.divider}` }}>
            <Check done={t.done} onClick={() => onToggle(t.id)} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  font: `600 14px ${fonts.sans}`,
                  color: t.done ? colors.faint : colors.ink,
                  textDecoration: t.done ? 'line-through' : 'none',
                }}
              >
                {t.title}
              </div>
              <div style={{ font: `400 12px ${fonts.sans}`, color: colors.muted, marginTop: 2 }}>
                {catLabel[t.cat]} · {t.note || t.who || 'Anyone'}
              </div>
            </div>
            <Pill task={t} />
          </div>
        ))}
      </Card>

      {/* rooms + systems summary */}
      <div style={{ display: 'grid', gridTemplateColumns: narrow ? '1fr' : '1fr 1fr', gap: 22 }}>
        <Card as="button" style={{ padding: '22px 26px', cursor: 'pointer', textAlign: 'left' }} onClick={() => navigate('chores')}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
            <div style={{ font: `400 22px ${fonts.serif}`, color: colors.ink }}>Room by room</div>
            <div style={{ font: `500 12px ${fonts.sans}`, color: colors.muted }}>
              {busyRooms.length ? `${busyRooms.length} need attention` : 'all clear'}
            </div>
          </div>
          {busyRooms.length === 0 ? (
            <div style={{ font: `400 13.5px ${fonts.sans}`, color: colors.muted }}>
              {todoCount + overdueCount === 0
                ? 'Every room is clear. Nothing to do but enjoy it.'
                : 'No room chores outstanding.'}
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {busyRooms.slice(0, 6).map((r) => (
                <span
                  key={r.key}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '8px 13px',
                    borderRadius: 20,
                    background: colors.chipBg,
                    font: `500 12.5px ${fonts.sans}`,
                    color: colors.muted3,
                  }}
                >
                  <span aria-hidden="true" style={{ fontSize: 14 }}>
                    {r.icon}
                  </span>
                  {r.label}
                  <span style={{ font: `700 11.5px ${fonts.sans}`, color: colors.accent }}>{r.open}</span>
                </span>
              ))}
            </div>
          )}
        </Card>

        <Card as="button" style={{ padding: '22px 26px', cursor: 'pointer', textAlign: 'left' }} onClick={() => navigate('systems')}>
          <div style={{ font: `400 22px ${fonts.serif}`, color: colors.ink, marginBottom: 14 }}>House health</div>
          {systems.length === 0 ? (
            <div style={{ font: `400 13.5px ${fonts.sans}`, color: colors.muted }}>
              Nothing tracked yet — add the HVAC filter, gutters, smoke detectors…
            </div>
          ) : (
            systems.slice(0, 4).map((s) => (
              <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '8px 0', borderBottom: `1px solid ${colors.divider}` }}>
                <div style={{ width: 9, height: 9, borderRadius: '50%', background: tone[s.tone], flexShrink: 0 }} />
                <div style={{ flex: 1, font: `500 13.5px ${fonts.sans}`, color: colors.ink }}>{s.name}</div>
                <div style={{ font: `600 12px ${fonts.sans}`, color: statusColor(s.tone), whiteSpace: 'nowrap' }}>{s.status}</div>
              </div>
            ))
          )}
        </Card>
      </div>

      {/* dinner plan + goals */}
      <div style={{ display: 'grid', gridTemplateColumns: narrow ? '1fr' : '1fr 1fr', gap: 22, marginTop: 22 }}>
        <Card as="button" style={{ padding: '22px 26px', cursor: 'pointer', textAlign: 'left' }} onClick={() => navigate('meals')}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
            <div style={{ font: `400 22px ${fonts.serif}`, color: colors.ink }}>On the menu</div>
            <div style={{ font: `500 12.5px ${fonts.sans}`, color: colors.accent }}>Plan the week</div>
          </div>
          {menuDays.map((m, i) => (
            <div key={m.label} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderTop: i > 0 ? `1px solid ${colors.divider}` : 'none' }}>
              <div style={{ width: 76, font: `600 12px ${fonts.sans}`, color: colors.muted2, flexShrink: 0 }}>{m.label}</div>
              {m.meal ? (
                <>
                  <div style={{ flex: 1, font: `600 13.5px ${fonts.sans}`, color: colors.ink, minWidth: 0 }}>{m.meal.title}</div>
                  {m.meal.cook && <Avatar who={m.meal.cook} size={26} />}
                </>
              ) : (
                <div style={{ flex: 1, font: `400 13px ${fonts.sans}`, color: colors.faint }}>Nothing planned</div>
              )}
            </div>
          ))}
        </Card>

        <Card as="button" style={{ padding: '22px 26px', cursor: 'pointer', textAlign: 'left' }} onClick={() => navigate('goals')}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
            <div style={{ font: `400 22px ${fonts.serif}`, color: colors.ink }}>Goals in motion</div>
            <div style={{ font: `500 12.5px ${fonts.sans}`, color: colors.accent }}>All goals</div>
          </div>
          {goals.length === 0 ? (
            <div style={{ font: `400 13.5px ${fonts.sans}`, color: colors.muted, marginTop: 6 }}>
              No goals yet — a race to run, a room to renovate, a trip to save for.
            </div>
          ) : (
            goals.slice(0, 3).map((g, i) => (
              <div key={g.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderTop: i > 0 ? `1px solid ${colors.divider}` : 'none' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ font: `600 13.5px ${fonts.sans}`, color: colors.ink }}>{g.title}</div>
                  <div style={{ font: `400 12px ${fonts.sans}`, color: colors.muted, marginTop: 1 }}>{g.owner ?? 'Family goal'}</div>
                </div>
                {g.target && (
                  <span style={{ font: `600 11.5px ${fonts.sans}`, color: statusColor(targetTone(g.target.daysLeft)), whiteSpace: 'nowrap', flexShrink: 0 }}>
                    {g.target.daysLeft < 0 ? 'Overdue' : `${g.target.label}`}
                  </span>
                )}
              </div>
            ))
          )}
        </Card>
      </div>

      {/* the cats — only when there are some */}
      {pets.pets.length > 0 && (
        <Card as="button" style={{ padding: '22px 26px', marginTop: 22, cursor: 'pointer', textAlign: 'left' }} onClick={() => navigate('pets')}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
            <div style={{ font: `400 22px ${fonts.serif}`, color: colors.ink }}>The animals</div>
            <div style={{ font: `500 12.5px ${fonts.sans}`, color: pets.mealsLeft ? colors.accent : tone.green }}>
              {pets.mealsLeft === 0
                ? 'All fed today'
                : `${pets.mealsLeft} ${pets.mealsLeft === 1 ? 'meal' : 'meals'} to go`}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}>
            {pets.pets.map((p) => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div
                  aria-hidden="true"
                  style={{ width: 34, height: 34, borderRadius: 12, background: colors.chipBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}
                >
                  {p.emoji}
                </div>
                <div>
                  <div style={{ font: `600 13.5px ${fonts.sans}`, color: colors.ink }}>{p.name}</div>
                  <div style={{ font: `400 11.5px ${fonts.sans}`, color: p.allFed ? tone.green : colors.muted }}>
                    {p.meals.map((m) => (m.fed ? '●' : '○')).join(' ')} {p.allFed ? 'fed' : 'hungry'}
                  </div>
                </div>
              </div>
            ))}
          </div>
          {pets.care.some((c) => c.tone === 'red') && (
            <div style={{ font: `500 12px ${fonts.sans}`, color: tone.red, marginTop: 14 }}>
              {pets.care.filter((c) => c.tone === 'red').map((c) => c.name).join(' · ')}
            </div>
          )}
        </Card>
      )}

      {/* a little life beyond the house */}
      <Card style={{ padding: '22px 26px', marginTop: 22 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: inProgress.length ? 14 : 0 }}>
          <div style={{ font: `400 22px ${fonts.serif}`, color: colors.ink }}>On the go</div>
          <button onClick={() => navigate('hobbies')} style={{ font: `500 12.5px ${fonts.sans}`, color: colors.accent }}>
            Hobbies
          </button>
        </div>
        {inProgress.length === 0 ? (
          <div style={{ font: `400 13.5px ${fonts.sans}`, color: colors.muted, marginTop: 10 }}>
            Nothing in progress — start a game, a book, or something on the bench.
          </div>
        ) : (
          inProgress.map((m, i) => (
            <div
              key={m.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '11px 0',
                borderTop: i > 0 ? `1px solid ${colors.divider}` : 'none',
              }}
            >
              {m.owner && <Avatar who={m.owner} size={30} />}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ font: `600 14px ${fonts.sans}`, color: colors.ink }}>{m.title}</div>
                <div style={{ font: `400 12px ${fonts.sans}`, color: colors.muted, marginTop: 2 }}>
                  {[m.owner, m.platform || m.service || m.author || m.craft].filter(Boolean).join(' · ') || '—'}
                </div>
              </div>
              <SummaryChip>{DOMAINS[m.domain].noun}</SummaryChip>
            </div>
          ))
        )}
      </Card>
    </div>
  );
}

function HeroStat({ n, label }) {
  return (
    <div>
      <div style={{ font: `600 38px ${fonts.sans}`, lineHeight: 1 }}>{n}</div>
      <div style={{ font: `400 13px ${fonts.sans}`, opacity: 0.82, marginTop: 3 }}>{label}</div>
    </div>
  );
}

function SummaryChip({ children }) {
  return (
    <span style={{ font: `500 11.5px ${fonts.sans}`, color: colors.muted3, background: colors.chipBg, padding: '5px 11px', borderRadius: 20 }}>
      {children}
    </span>
  );
}

export function statusColor(t) {
  if (t === 'red') return tone.red;
  if (t === 'amber') return tone.amberText;
  return tone.green;
}
