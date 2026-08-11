import { colors, tone, fonts } from '../theme';
import { Card } from '../components/ui';
import { RELEASES, BUILD } from '../data/releases';
import { parseDay, monthDay } from '../dates';

// Proof the thing is going somewhere. Newest first, with the running build at
// the bottom so there's always an honest answer to "which version am I on?"
const TAGS = {
  added: ['New', 'green'],
  changed: ['Changed', 'amber'],
  fixed: ['Fixed', 'amber'],
  removed: ['Gone', 'red'],
};

export function ReleasesView() {
  return (
    <div>
      <div style={{ marginBottom: 22 }}>
        <div style={{ font: `400 30px ${fonts.serif}`, color: colors.ink, marginBottom: 4 }}>Release log</div>
        <div style={{ font: `400 13.5px ${fonts.sans}`, color: colors.muted }}>
          What's changed in Tend, newest first.
        </div>
      </div>

      {RELEASES.map((release, i) => (
        <div key={release.version} style={{ display: 'flex', gap: 18, marginBottom: 22 }}>
          {/* Timeline rail: a dot per release, filled for the current one. */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0, width: 14 }}>
            <div
              style={{
                width: 12,
                height: 12,
                borderRadius: '50%',
                marginTop: 22,
                background: i === 0 ? colors.accent : colors.card,
                border: `2px solid ${i === 0 ? colors.accent : colors.cardBorder}`,
              }}
            />
            {i < RELEASES.length - 1 && <div style={{ flex: 1, width: 2, background: colors.divider, marginTop: 6 }} />}
          </div>

          <Card style={{ padding: '18px 24px', flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap', marginBottom: 2 }}>
              <span style={{ font: `600 13px ${fonts.mono}`, color: colors.accent }}>v{release.version}</span>
              <span style={{ font: `400 20px ${fonts.serif}`, color: colors.ink }}>{release.name}</span>
              <span style={{ font: `400 12px ${fonts.sans}`, color: colors.faint, marginLeft: 'auto' }}>
                {monthDay(parseDay(release.date))}, {parseDay(release.date).getFullYear()}
              </span>
            </div>

            <div style={{ marginTop: 12 }}>
              {release.notes.map(([kind, text], n) => {
                const [label, toneKey] = TAGS[kind] ?? TAGS.changed;
                return (
                  <div key={n} style={{ display: 'flex', gap: 11, alignItems: 'baseline', padding: '5px 0' }}>
                    <span
                      style={{
                        font: `600 9.5px ${fonts.sans}`,
                        letterSpacing: '.06em',
                        textTransform: 'uppercase',
                        color: tone[toneKey === 'amber' ? 'amberText' : toneKey],
                        background: colors.chipBg,
                        padding: '3px 8px',
                        borderRadius: 20,
                        flexShrink: 0,
                        minWidth: 54,
                        textAlign: 'center',
                      }}
                    >
                      {label}
                    </span>
                    <span style={{ font: `400 13.5px/1.55 ${fonts.sans}`, color: colors.muted3 }}>{text}</span>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      ))}

      <div style={{ font: `400 11.5px ${fonts.mono}`, color: colors.faint, textAlign: 'center', paddingTop: 6 }}>
        running v{BUILD.version} · {BUILD.commit}
        {BUILD.builtAt && ` · built ${monthDay(new Date(BUILD.builtAt))}`}
      </div>
    </div>
  );
}
