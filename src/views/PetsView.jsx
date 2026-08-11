import { useState } from 'react';
import { colors, tone, shadows, fonts } from '../theme';
import { Card, Avatar } from '../components/ui';
import { useIsNarrow } from '../useMediaQuery';
import { useHousehold } from '../household/HouseholdProvider';
import { usePets, CARE_SUGGESTIONS, LOG_KINDS } from '../data/usePets';
import { PetModal } from '../components/PetModal';
import { PetCareModal } from '../components/PetCareModal';
import { PetLogModal } from '../components/PetLogModal';
import { ShareLinkModal } from '../components/ShareLinkModal';
import { statusColor } from './HomeView';
import { dayStr } from '../dates';

// Feeding first, everything else after. The daily question in a house with
// cats is "have they been fed?", and it should be answerable — and fixable —
// without scrolling or tapping into anything.
export function PetsView() {
  const narrow = useIsNarrow();
  const { currentMember } = useHousehold();
  const pets = usePets();
  const [editingPet, setEditingPet] = useState(null); // 'new' | raw row | null
  const [editingCare, setEditingCare] = useState(null);
  const [logging, setLogging] = useState(null); // { petId } | null
  const [sharing, setSharing] = useState(false);

  const { pets: roster, care, upcoming, history, mealsLeft, loading } = pets;

  if (loading) return null;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 20, gap: 16, flexWrap: 'wrap' }}>
        <div>
          <div style={{ font: `400 30px ${fonts.serif}`, color: colors.ink, marginBottom: 4 }}>Pets</div>
          <div style={{ font: `400 13.5px ${fonts.sans}`, color: colors.muted }}>
            {roster.length === 0
              ? 'Feeding, litter, vet visits — all in one place.'
              : mealsLeft === 0
                ? 'Everyone has been fed today. 🐾'
                : `${mealsLeft} ${mealsLeft === 1 ? 'meal' : 'meals'} still to go today.`}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {roster.length > 0 && (
            <button
              onClick={() => setSharing(true)}
              style={{ padding: '9px 17px', borderRadius: 22, background: colors.chipBg, color: colors.muted3, font: `600 13px ${fonts.sans}`, whiteSpace: 'nowrap' }}
            >
              Share with a sitter
            </button>
          )}
          <button
            onClick={() => setEditingPet('new')}
            style={{ padding: '9px 17px', borderRadius: 22, background: colors.accent, color: colors.onAccent, font: `600 13px ${fonts.sans}`, boxShadow: shadows.accent, whiteSpace: 'nowrap' }}
          >
            + Add a pet
          </button>
        </div>
      </div>

      {roster.length === 0 ? (
        <Card style={{ padding: '38px 30px', textAlign: 'center' }}>
          <div style={{ fontSize: 34, marginBottom: 10 }}>🐈</div>
          <div style={{ font: `400 20px ${fonts.serif}`, color: colors.ink, marginBottom: 6 }}>No pets yet</div>
          <div style={{ font: `400 13.5px ${fonts.sans}`, color: colors.muted }}>
            Add the cats and you'll get a feeding checklist, a litter countdown and somewhere to keep the vet's number.
          </div>
        </Card>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: narrow ? '1fr' : 'repeat(auto-fit, minmax(320px, 1fr))', gap: 18, marginBottom: 22 }}>
          {roster.map((pet) => (
            <PetCard
              key={pet.id}
              pet={pet}
              onFeed={(slot, entryId) => pets.toggleMeal(pet.id, slot, entryId, currentMember?.id)}
              onEdit={() => setEditingPet(pet.raw)}
              onLog={() => setLogging({ petId: pet.id })}
            />
          ))}
        </div>
      )}

      {roster.length > 0 && (
        <>
          <SectionHeading
            title="Care"
            action="+ Add a job"
            onAction={() => setEditingCare('new')}
            hint="Litter, claws, flea treatment — anything on a cycle."
          />
          {care.length === 0 ? (
            <Card style={{ padding: '20px 24px', marginBottom: 22 }}>
              <div style={{ font: `400 13.5px ${fonts.sans}`, color: colors.muted, marginBottom: 12 }}>
                Nothing tracked yet. Start with one of these:
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {CARE_SUGGESTIONS.map((s) => (
                  <button
                    key={s.name}
                    onClick={() => pets.addCare({ ...s, last_done_on: dayStr() })}
                    style={{ padding: '8px 14px', borderRadius: 20, background: colors.chipBg, color: colors.muted3, font: `500 12.5px ${fonts.sans}` }}
                  >
                    + {s.name}
                  </button>
                ))}
              </div>
            </Card>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: narrow ? '1fr' : '1fr 1fr', gap: 14, marginBottom: 22 }}>
              {care.map((job) => (
                <Card key={job.id} style={{ padding: '16px 20px', borderRadius: 18, display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div
                    style={{
                      width: 12,
                      height: 12,
                      borderRadius: '50%',
                      background: tone[job.tone],
                      flexShrink: 0,
                      boxShadow: `0 0 0 4px ${tone[job.tone]}22`,
                    }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <button
                      onClick={() => setEditingCare(job.raw)}
                      style={{ font: `600 14.5px ${fonts.sans}`, color: colors.ink, textAlign: 'left' }}
                      title="Edit"
                    >
                      {job.name}
                    </button>
                    <div style={{ font: `400 12px ${fonts.sans}`, color: colors.muted, marginTop: 2 }}>
                      {job.petName ? `${job.petName} · ` : ''}
                      {job.detail}
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
                    <div style={{ font: `600 12px ${fonts.sans}`, color: statusColor(job.tone), whiteSpace: 'nowrap' }}>
                      {job.status}
                    </div>
                    <button
                      onClick={() => pets.markCareDone(job.id)}
                      style={{ font: `600 11.5px ${fonts.sans}`, color: colors.muted2, background: colors.chipBg, padding: '5px 11px', borderRadius: 20, whiteSpace: 'nowrap' }}
                    >
                      Done today
                    </button>
                  </div>
                </Card>
              ))}
            </div>
          )}

          <SectionHeading
            title="Vet & meds"
            action="+ Log something"
            onAction={() => setLogging({ petId: roster[0]?.id ?? null })}
            hint="Appointments ahead, and what's already been done."
          />
          <Card style={{ padding: '6px 24px 12px', marginBottom: 22 }}>
            {upcoming.length === 0 && history.length === 0 ? (
              <div style={{ font: `400 13.5px ${fonts.sans}`, color: colors.muted, padding: '20px 0', textAlign: 'center' }}>
                Nothing logged. Book the annual checkup and it'll show up here.
              </div>
            ) : (
              <>
                {upcoming.map((e, i) => (
                  <LogRow key={e.id} entry={e} upcoming topBorder={i > 0} onRemove={pets.removeLogEntry} />
                ))}
                {history.slice(0, 8).map((e, i) => (
                  <LogRow key={e.id} entry={e} topBorder={i > 0 || upcoming.length > 0} onRemove={pets.removeLogEntry} />
                ))}
              </>
            )}
          </Card>
        </>
      )}

      {editingPet !== null && (
        <PetModal
          pet={editingPet === 'new' ? null : editingPet}
          onClose={() => setEditingPet(null)}
          onSave={(fields) => (editingPet === 'new' ? pets.addPet(fields) : pets.updatePet(editingPet.id, fields))}
          onDelete={pets.removePet}
        />
      )}
      {editingCare !== null && (
        <PetCareModal
          job={editingCare === 'new' ? null : editingCare}
          pets={roster}
          onClose={() => setEditingCare(null)}
          onSave={(fields) => (editingCare === 'new' ? pets.addCare(fields) : pets.updateCare(editingCare.id, fields))}
          onDelete={pets.removeCare}
        />
      )}
      {sharing && <ShareLinkModal onClose={() => setSharing(false)} />}
      {logging !== null && (
        <PetLogModal
          pets={roster}
          defaultPetId={logging.petId}
          onClose={() => setLogging(null)}
          onSave={pets.addLogEntry}
        />
      )}
    </div>
  );
}

function PetCard({ pet, onFeed, onEdit, onLog }) {
  const facts = [pet.age, pet.breed, pet.weight ? `${pet.weight.value} lb` : null].filter(Boolean);

  return (
    <Card style={{ padding: '22px 24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 13, marginBottom: 16 }}>
        <div
          aria-hidden="true"
          style={{
            width: 46,
            height: 46,
            borderRadius: 16,
            background: colors.chipBg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 24,
            flexShrink: 0,
          }}
        >
          {pet.emoji}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <button onClick={onEdit} style={{ font: `400 22px ${fonts.serif}`, color: colors.ink, textAlign: 'left' }} title="Edit">
            {pet.name}
          </button>
          <div style={{ font: `400 12px ${fonts.sans}`, color: colors.muted, marginTop: 1 }}>
            {facts.join(' · ') || pet.species}
          </div>
        </div>
        {pet.allFed && (
          <span style={{ font: `600 11px ${fonts.sans}`, color: tone.green, background: colors.chipBg, padding: '5px 10px', borderRadius: 20, flexShrink: 0 }}>
            All fed
          </span>
        )}
      </div>

      <div style={{ font: `600 11px ${fonts.sans}`, color: colors.faint, letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 9 }}>
        Today's meals
      </div>
      <div style={{ display: 'flex', gap: 9, flexWrap: 'wrap' }}>
        {pet.meals.map((m) => (
          <button
            key={m.slot}
            onClick={() => onFeed(m.slot, m.entryId)}
            aria-pressed={m.fed}
            title={m.fed ? `Fed${m.by ? ` by ${m.by}` : ''} — tap to undo` : `Mark ${m.label.toLowerCase()} as fed`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '9px 14px',
              borderRadius: 14,
              flex: '1 0 auto',
              background: m.fed ? colors.accent : colors.inputBg,
              border: `1px solid ${m.fed ? colors.accent : colors.inputBorder}`,
              color: m.fed ? colors.onAccent : colors.muted2,
              font: `600 12.5px ${fonts.sans}`,
            }}
          >
            <span style={{ fontSize: 14, lineHeight: 1 }}>{m.fed ? '✓' : '○'}</span>
            <span>{m.label}</span>
            {m.fed && m.by && <Avatar who={m.by} size={20} />}
          </button>
        ))}
      </div>

      {(pet.food || pet.vetName || pet.note) && (
        <div style={{ marginTop: 16, paddingTop: 14, borderTop: `1px solid ${colors.divider}`, font: `400 12.5px/1.6 ${fonts.sans}`, color: colors.muted2 }}>
          {pet.food && (
            <div>
              <span style={{ color: colors.faint }}>Eats: </span>
              {pet.food}
            </div>
          )}
          {pet.vetName && (
            <div>
              <span style={{ color: colors.faint }}>Vet: </span>
              {pet.vetName}
              {pet.vetPhone && ` · ${pet.vetPhone}`}
            </div>
          )}
          {pet.note && <div style={{ color: colors.muted }}>{pet.note}</div>}
        </div>
      )}

      <button
        onClick={onLog}
        style={{ marginTop: 14, font: `600 12px ${fonts.sans}`, color: colors.accent }}
      >
        Log a visit, dose or weight →
      </button>
    </Card>
  );
}

function LogRow({ entry, upcoming, topBorder, onRemove }) {
  const kind = LOG_KINDS[entry.kind] ?? LOG_KINDS.note;
  const when =
    upcoming && entry.daysLeft === 0
      ? 'Today'
      : upcoming && entry.daysLeft === 1
        ? 'Tomorrow'
        : upcoming
          ? `In ${entry.daysLeft}d`
          : entry.dateLabel;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '13px 0', borderTop: topBorder ? `1px solid ${colors.divider}` : 'none' }}>
      <span aria-hidden="true" style={{ fontSize: 16, flexShrink: 0 }}>
        {kind.icon}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ font: `600 13.5px ${fonts.sans}`, color: upcoming ? colors.ink : colors.muted3 }}>
          {entry.note || kind.label}
          {entry.value != null && entry.kind === 'weight' && ` — ${entry.value} lb`}
        </div>
        <div style={{ font: `400 11.5px ${fonts.sans}`, color: colors.muted, marginTop: 1 }}>
          {[entry.petName, kind.label, entry.dateLabel].filter(Boolean).join(' · ')}
        </div>
      </div>
      <span style={{ font: `600 11.5px ${fonts.sans}`, color: upcoming ? colors.accent : colors.faint, whiteSpace: 'nowrap', flexShrink: 0 }}>
        {when}
      </span>
      <button
        onClick={() => onRemove(entry.id)}
        aria-label="Remove entry"
        title="Remove"
        style={{ width: 24, height: 24, borderRadius: '50%', color: colors.faint, fontSize: 14, flexShrink: 0 }}
      >
        ×
      </button>
    </div>
  );
}

function SectionHeading({ title, hint, action, onAction }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 14, marginBottom: 12, flexWrap: 'wrap' }}>
      <div>
        <span style={{ font: `400 22px ${fonts.serif}`, color: colors.ink }}>{title}</span>
        {hint && <span style={{ font: `400 12.5px ${fonts.sans}`, color: colors.muted, marginLeft: 10 }}>{hint}</span>}
      </div>
      <button onClick={onAction} style={{ font: `500 12.5px ${fonts.sans}`, color: colors.accent, whiteSpace: 'nowrap' }}>
        {action}
      </button>
    </div>
  );
}
