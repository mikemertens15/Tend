import { colors, tone, fonts } from '../theme';
import { Card } from '../components/ui';
import { useIsNarrow } from '../useMediaQuery';
import { useSitterPage } from '../data/useSitter';
import { parseDay, monthDay } from '../dates';

// The page a house-sitter opens. No account, no nav, no app chrome — it renders
// outside the auth gate entirely and every byte on it came from one RPC call.
//
// Written for someone who has never seen Tend and is standing in a kitchen
// holding a phone: what to feed, how much, whether it's been done, and a phone
// number if something goes wrong.
export function SitterView({ token }) {
  const narrow = useIsNarrow();
  const { page, pets, care, upcoming, loading, toggleMeal, busy } = useSitterPage(token);

  if (loading) {
    return (
      <Shell>
        <div style={{ font: `400 15px ${fonts.sans}`, color: colors.muted, textAlign: 'center', padding: '60px 0' }}>
          Loading…
        </div>
      </Shell>
    );
  }

  if (!page) {
    return (
      <Shell>
        <Card style={{ padding: '40px 30px', textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🔑</div>
          <div style={{ font: `400 22px ${fonts.serif}`, color: colors.ink, marginBottom: 8 }}>
            This link isn't active
          </div>
          <div style={{ font: `400 13.5px/1.6 ${fonts.sans}`, color: colors.muted }}>
            It may have expired or been turned off. Ask whoever sent it for a new one.
          </div>
        </Card>
      </Shell>
    );
  }

  const dueNow = care.filter((c) => c.tone === 'red');

  return (
    <Shell>
      <div style={{ marginBottom: 22 }}>
        <div style={{ font: `400 30px ${fonts.serif}`, color: colors.ink }}>{page.household}</div>
        <div style={{ font: `400 13.5px ${fonts.sans}`, color: colors.muted, marginTop: 2 }}>
          {page.label ? `${page.label} · ` : ''}Everything you need while you're here.
          {page.expiresOn && ` This page stops working after ${monthDay(parseDay(page.expiresOn))}.`}
        </div>
      </div>

      {page.note && (
        <Card style={{ padding: '16px 22px', marginBottom: 20, borderColor: colors.selected }}>
          <div style={{ font: `400 13.5px/1.6 ${fonts.sans}`, color: colors.ink, whiteSpace: 'pre-wrap' }}>
            {page.note}
          </div>
        </Card>
      )}

      {pets.length > 0 && (
        <>
          <SectionTitle>Feeding</SectionTitle>
          <div style={{ display: 'grid', gridTemplateColumns: narrow ? '1fr' : 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16, marginBottom: 26 }}>
            {pets.map((pet) => (
              <Card key={pet.id} style={{ padding: '20px 22px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                  <div
                    aria-hidden="true"
                    style={{ width: 44, height: 44, borderRadius: 15, background: colors.chipBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 23, flexShrink: 0 }}
                  >
                    {pet.emoji}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ font: `400 21px ${fonts.serif}`, color: colors.ink }}>{pet.name}</div>
                    {pet.food && (
                      <div style={{ font: `400 12.5px ${fonts.sans}`, color: colors.muted, marginTop: 1 }}>{pet.food}</div>
                    )}
                  </div>
                  {pet.allFed && (
                    <span style={{ font: `600 11px ${fonts.sans}`, color: tone.green, background: colors.chipBg, padding: '5px 10px', borderRadius: 20, flexShrink: 0 }}>
                      All fed
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', gap: 9, flexWrap: 'wrap' }}>
                  {pet.meals.map((m) => (
                    <button
                      key={m.slot}
                      onClick={() => toggleMeal(pet.id, m.slot)}
                      disabled={busy}
                      aria-pressed={m.fed}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '11px 16px',
                        borderRadius: 14,
                        flex: '1 0 auto',
                        background: m.fed ? colors.accent : colors.inputBg,
                        border: `1px solid ${m.fed ? colors.accent : colors.inputBorder}`,
                        color: m.fed ? colors.onAccent : colors.muted2,
                        font: `600 13px ${fonts.sans}`,
                        opacity: busy ? 0.6 : 1,
                      }}
                    >
                      <span style={{ fontSize: 14, lineHeight: 1 }}>{m.fed ? '✓' : '○'}</span>
                      {m.label}
                      {m.fed && m.by && (
                        <span style={{ font: `500 11px ${fonts.sans}`, opacity: 0.85 }}>· {m.by}</span>
                      )}
                    </button>
                  ))}
                </div>

                {pet.note && (
                  <div style={{ font: `400 12.5px/1.6 ${fonts.sans}`, color: colors.muted2, marginTop: 14, paddingTop: 12, borderTop: `1px solid ${colors.divider}` }}>
                    {pet.note}
                  </div>
                )}
              </Card>
            ))}
          </div>
        </>
      )}

      {care.length > 0 && (
        <>
          <SectionTitle>
            Jobs
            {dueNow.length > 0 && (
              <span style={{ font: `600 12px ${fonts.sans}`, color: tone.red, marginLeft: 10 }}>
                {dueNow.length} due
              </span>
            )}
          </SectionTitle>
          <Card style={{ padding: '6px 22px 10px', marginBottom: 26 }}>
            {care.map((c, i) => (
              <div key={c.name + i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 0', borderTop: i > 0 ? `1px solid ${colors.divider}` : 'none' }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: tone[c.tone], flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ font: `600 13.5px ${fonts.sans}`, color: colors.ink }}>{c.name}</div>
                  <div style={{ font: `400 11.5px ${fonts.sans}`, color: colors.muted, marginTop: 1 }}>
                    {[c.petName, c.cadence, c.note].filter(Boolean).join(' · ')}
                  </div>
                </div>
                <span style={{ font: `600 12px ${fonts.sans}`, color: c.tone === 'red' ? tone.red : colors.muted, whiteSpace: 'nowrap', flexShrink: 0 }}>
                  {c.status}
                </span>
              </div>
            ))}
          </Card>
        </>
      )}

      {upcoming.length > 0 && (
        <>
          <SectionTitle>Coming up</SectionTitle>
          <Card style={{ padding: '6px 22px 10px', marginBottom: 26 }}>
            {upcoming.map((e, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 0', borderTop: i > 0 ? `1px solid ${colors.divider}` : 'none' }}>
                <span aria-hidden="true">{e.kind === 'vet' ? '🩺' : '💊'}</span>
                <div style={{ flex: 1, minWidth: 0, font: `600 13.5px ${fonts.sans}`, color: colors.ink }}>
                  {e.note || (e.kind === 'vet' ? 'Vet visit' : 'Medication')}
                  {e.petName && (
                    <span style={{ font: `400 12px ${fonts.sans}`, color: colors.muted }}> · {e.petName}</span>
                  )}
                </div>
                <span style={{ font: `600 12px ${fonts.sans}`, color: colors.accent, whiteSpace: 'nowrap' }}>
                  {e.daysLeft === 0 ? 'Today' : e.daysLeft === 1 ? 'Tomorrow' : e.dateLabel}
                </span>
              </div>
            ))}
          </Card>
        </>
      )}

      {(page.facts ?? []).length > 0 && (
        <>
          <SectionTitle>Good to know</SectionTitle>
          <Card style={{ padding: '6px 22px 12px', marginBottom: 26 }}>
            {page.facts.map((f, i) => (
              <div key={i} style={{ padding: '12px 0', borderTop: i > 0 ? `1px solid ${colors.divider}` : 'none' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
                  <span style={{ font: `500 12.5px ${fonts.sans}`, color: colors.muted, flexShrink: 0, minWidth: 96 }}>
                    {f.label}
                  </span>
                  <span style={{ flex: 1, font: `600 13.5px ${fonts.mono}`, color: colors.ink, textAlign: 'right', wordBreak: 'break-word' }}>
                    {f.value}
                  </span>
                </div>
                {(f.detail || f.location) && (
                  <div style={{ font: `400 11.5px ${fonts.sans}`, color: colors.faint, marginTop: 3 }}>
                    {[f.detail, f.location].filter(Boolean).join(' · ')}
                  </div>
                )}
              </div>
            ))}
          </Card>
        </>
      )}

      {/* The number you actually want when something's wrong. */}
      {pets.some((p) => p.vetPhone || p.vetName) && (
        <Card style={{ padding: '18px 22px', marginBottom: 26 }}>
          <div style={{ font: `600 11px ${fonts.sans}`, color: colors.faint, letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 10 }}>
            If something's wrong
          </div>
          {pets
            .filter((p) => p.vetName || p.vetPhone)
            .map((p) => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '6px 0' }}>
                <span style={{ font: `500 13px ${fonts.sans}`, color: colors.muted2, flex: 1 }}>
                  {p.name}'s vet{p.vetName ? ` — ${p.vetName}` : ''}
                </span>
                {p.vetPhone && (
                  <a
                    href={`tel:${p.vetPhone.replace(/[^\d+]/g, '')}`}
                    style={{ font: `600 13px ${fonts.sans}`, color: colors.accent, textDecoration: 'none', whiteSpace: 'nowrap' }}
                  >
                    {p.vetPhone}
                  </a>
                )}
              </div>
            ))}
        </Card>
      )}

      <div style={{ font: `400 11.5px ${fonts.sans}`, color: colors.faint, textAlign: 'center', paddingBottom: 30 }}>
        Shared from Tend · this page is read-only apart from ticking off meals
      </div>
    </Shell>
  );
}

function Shell({ children }) {
  return (
    <div style={{ minHeight: '100vh', background: colors.bg }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '16px 22px',
          borderBottom: `1px solid ${colors.cardBorder}`,
          background: colors.navBar,
        }}
      >
        <div style={{ width: 24, height: 24, borderRadius: '50%', background: colors.accent }} />
        <div style={{ font: `400 22px ${fonts.serif}`, color: colors.ink, lineHeight: 1 }}>Tend</div>
      </div>
      <main style={{ maxWidth: 760, margin: '0 auto', padding: '26px 22px 40px' }}>{children}</main>
    </div>
  );
}

function SectionTitle({ children }) {
  return <div style={{ font: `400 22px ${fonts.serif}`, color: colors.ink, marginBottom: 12 }}>{children}</div>;
}
