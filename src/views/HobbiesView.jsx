import { colors, fonts } from '../theme';
import { Card } from '../components/ui';
import { useIsNarrow } from '../useMediaQuery';
import { useCollection } from '../data/useCollection';
import { DOMAINS, HOBBY_SECTIONS, ALL_HOBBY_DOMAINS, isUnderway } from '../data/collections';

// The landing pad for everything that isn't the house. One card per hobby, so
// the top nav doesn't grow a tab every time a new interest shows up.
export function HobbiesView({ navigate }) {
  const narrow = useIsNarrow();
  const { items, loading } = useCollection(ALL_HOBBY_DOMAINS);

  const active = items.filter(isUnderway);

  return (
    <div>
      <div style={{ marginBottom: 18 }}>
        <div style={{ font: `400 30px ${fonts.serif}`, color: colors.ink }}>Hobbies</div>
        <div style={{ font: `400 13.5px ${fonts.sans}`, color: colors.muted, marginTop: 2 }}>
          {loading
            ? ' '
            : active.length
              ? `${active.length} thing${active.length === 1 ? '' : 's'} on the go`
              : 'Nothing on the go — pick something up'}
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: narrow ? '1fr' : 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: 18,
        }}
      >
        {HOBBY_SECTIONS.map((section) => {
          const mine = items.filter((i) => section.domains.includes(i.domain));
          const onTheGo = mine.filter(isUnderway);
          const queued = mine.filter((i) => ['backlog', 'idea', 'planned'].includes(i.status));

          return (
            <Card
              as="button"
              key={section.key}
              onClick={() => navigate(section.key)}
              style={{ padding: '22px 24px', cursor: 'pointer', textAlign: 'left' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 12 }}>
                <div
                  aria-hidden="true"
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 12,
                    background: colors.chipBg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 19,
                    flexShrink: 0,
                  }}
                >
                  {section.icon}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ font: `400 20px ${fonts.serif}`, color: colors.ink }}>{section.label}</div>
                  <div style={{ font: `400 12px ${fonts.sans}`, color: colors.muted }}>{section.blurb}</div>
                </div>
              </div>

              {onTheGo.length > 0 ? (
                onTheGo.slice(0, 3).map((item, i) => (
                  <div
                    key={item.id}
                    style={{
                      display: 'flex',
                      alignItems: 'baseline',
                      justifyContent: 'space-between',
                      gap: 10,
                      padding: '8px 0',
                      borderTop: i > 0 ? `1px solid ${colors.divider}` : `1px solid ${colors.divider}`,
                    }}
                  >
                    <span style={{ font: `600 13px ${fonts.sans}`, color: colors.ink, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.title}
                    </span>
                    <span style={{ font: `500 11.5px ${fonts.sans}`, color: colors.muted, flexShrink: 0 }}>
                      {DOMAINS[item.domain].noun}
                    </span>
                  </div>
                ))
              ) : (
                <div style={{ font: `400 13px ${fonts.sans}`, color: colors.faint, paddingTop: 10, borderTop: `1px solid ${colors.divider}` }}>
                  {mine.length ? 'Nothing on the go' : 'Nothing here yet'}
                </div>
              )}

              <div style={{ font: `500 11.5px ${fonts.sans}`, color: colors.muted, marginTop: 12 }}>
                {mine.length} total{queued.length ? ` · ${queued.length} waiting` : ''}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
