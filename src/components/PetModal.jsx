import { useState } from 'react';
import { colors, fonts } from '../theme';
import { ModalShell, Label, Chip, inputStyle, PrimaryButton, GhostButton, DeleteButton } from './Modal';

// Species drives nothing but the default icon and wording — the feeding and
// care model is the same whether it purrs or not.
const SPECIES = [
  ['cat', 'Cat', '🐈'],
  ['dog', 'Dog', '🐕'],
  ['small', 'Small pet', '🐹'],
  ['fish', 'Fish', '🐠'],
  ['bird', 'Bird', '🦜'],
  ['reptile', 'Reptile', '🦎'],
];

const EMOJI = ['🐈', '🐈‍⬛', '🐱', '🐕', '🐶', '🐰', '🐹', '🐠', '🦜', '🦎', '🐢', '🐴'];

const MEAL_COUNTS = [
  [1, 'Once a day'],
  [2, 'Twice a day'],
  [3, 'Three times'],
  [4, 'Four times'],
];

export function PetModal({ pet, onClose, onSave, onDelete }) {
  const editing = Boolean(pet);

  const [name, setName] = useState(pet?.name ?? '');
  const [species, setSpecies] = useState(pet?.species ?? 'cat');
  const [emoji, setEmoji] = useState(pet?.emoji ?? '🐈');
  const [breed, setBreed] = useState(pet?.breed ?? '');
  const [birthday, setBirthday] = useState(pet?.birthday ?? '');
  const [mealsPerDay, setMealsPerDay] = useState(pet?.meals_per_day ?? 2);
  const [food, setFood] = useState(pet?.food ?? '');
  const [vetName, setVetName] = useState(pet?.vet_name ?? '');
  const [vetPhone, setVetPhone] = useState(pet?.vet_phone ?? '');
  const [microchip, setMicrochip] = useState(pet?.microchip ?? '');
  const [note, setNote] = useState(pet?.note ?? '');

  function pickSpecies(key, defaultEmoji) {
    setSpecies(key);
    // On a new pet the icon follows the species; when editing, an icon that's
    // already been picked is left alone.
    if (!editing) setEmoji(defaultEmoji);
  }

  function submit() {
    if (!name.trim()) return;
    onSave({
      name: name.trim(),
      species,
      emoji,
      breed: breed.trim() || null,
      birthday: birthday || null,
      meals_per_day: mealsPerDay,
      food: food.trim() || null,
      vet_name: vetName.trim() || null,
      vet_phone: vetPhone.trim() || null,
      microchip: microchip.trim() || null,
      note: note.trim() || null,
    });
    onClose();
  }

  return (
    <ModalShell
      title={editing ? `Edit ${pet.name}` : 'Add a pet'}
      onClose={onClose}
      footer={
        <>
          {editing && (
            <DeleteButton
              onClick={() => {
                onDelete(pet.id);
                onClose();
              }}
            >
              Remove
            </DeleteButton>
          )}
          <GhostButton onClick={onClose}>Cancel</GhostButton>
          <PrimaryButton onClick={submit}>{editing ? 'Save changes' : 'Add pet'}</PrimaryButton>
        </>
      }
    >
      <Label>Name</Label>
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && submit()}
        placeholder="e.g. Luna"
        style={inputStyle}
      />

      <Label>What are they?</Label>
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {SPECIES.map(([key, label, icon]) => (
          <Chip key={key} active={species === key} onClick={() => pickSpecies(key, icon)}>
            {icon} {label}
          </Chip>
        ))}
      </div>

      <Label>Icon</Label>
      <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
        {EMOJI.map((e) => (
          <button
            key={e}
            onClick={() => setEmoji(e)}
            aria-label={`Use ${e}`}
            aria-pressed={emoji === e}
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              fontSize: 19,
              background: emoji === e ? colors.chipBg : colors.inputBg,
              border: `1px solid ${emoji === e ? colors.selected : colors.cardBorder}`,
            }}
          >
            {e}
          </button>
        ))}
      </div>

      <Label>How often do they eat?</Label>
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {MEAL_COUNTS.map(([n, label]) => (
          <Chip key={n} active={mealsPerDay === n} onClick={() => setMealsPerDay(n)}>
            {label}
          </Chip>
        ))}
      </div>

      <Label>What do they eat? (optional)</Label>
      <input
        value={food}
        onChange={(e) => setFood(e.target.value)}
        placeholder="e.g. Half a can of Fancy Feast, pâté"
        style={inputStyle}
      />

      <div style={{ display: 'flex', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <Label>Breed</Label>
          <input value={breed} onChange={(e) => setBreed(e.target.value)} placeholder="e.g. Tabby" style={inputStyle} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <Label>Birthday</Label>
          <input type="date" value={birthday} onChange={(e) => setBirthday(e.target.value)} style={inputStyle} />
        </div>
      </div>

      <div style={{ font: `600 11px ${fonts.sans}`, color: colors.faint, letterSpacing: '.06em', textTransform: 'uppercase', margin: '4px 0 14px' }}>
        For the vet
      </div>

      <div style={{ display: 'flex', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <Label>Vet</Label>
          <input value={vetName} onChange={(e) => setVetName(e.target.value)} placeholder="Practice name" style={inputStyle} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <Label>Phone</Label>
          <input value={vetPhone} onChange={(e) => setVetPhone(e.target.value)} placeholder="(555) 123-4567" style={inputStyle} />
        </div>
      </div>

      <Label>Microchip number</Label>
      <input value={microchip} onChange={(e) => setMicrochip(e.target.value)} placeholder="Optional" style={inputStyle} />

      <Label>Anything else</Label>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={2}
        placeholder="e.g. Hides under the bed at the vet. Allergic to chicken."
        style={{ ...inputStyle, marginBottom: 0, resize: 'vertical', font: `500 14px ${fonts.sans}` }}
      />
    </ModalShell>
  );
}
