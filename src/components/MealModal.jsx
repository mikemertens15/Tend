import { useState } from 'react';
import { colors, fonts } from '../theme';
import { ModalShell, Label, inputStyle, PrimaryButton, GhostButton, DeleteButton, MemberPicker } from './Modal';
import { parseDay, longDate } from '../dates';

// Plan (or edit) one day's dinner. `date` is the 'YYYY-MM-DD' day being
// planned; pass `meal` (the raw DB row) when editing an existing plan.
export function MealModal({ date, meal, onClose, onSave, onRemove }) {
  const editing = Boolean(meal);
  const [title, setTitle] = useState(meal?.title ?? '');
  const [cookId, setCookId] = useState(meal?.cook_member_id ?? null);
  const [note, setNote] = useState(meal?.note ?? '');
  // Kept as free text with one ingredient per line. A structured repeater is
  // more "correct" and much slower to type into, and this is a thing you write
  // once while looking at a recipe.
  const [ingredients, setIngredients] = useState(() => toText(meal?.ingredients));

  function submit() {
    if (!title.trim()) return;
    onSave({
      on_date: date,
      slot: 'dinner',
      title: title.trim(),
      note: note.trim() || null,
      cook_member_id: cookId,
      ingredients: parseIngredients(ingredients),
    });
    onClose();
  }

  const count = parseIngredients(ingredients).length;

  return (
    <ModalShell
      title={`Dinner · ${longDate(parseDay(date))}`}
      onClose={onClose}
      footer={
        <>
          {editing && (
            <DeleteButton
              onClick={() => {
                onRemove(meal.id);
                onClose();
              }}
            >
              Clear day
            </DeleteButton>
          )}
          <GhostButton onClick={onClose}>Cancel</GhostButton>
          <PrimaryButton onClick={submit}>{editing ? 'Save changes' : 'Add to the plan'}</PrimaryButton>
        </>
      }
    >
      <Label>What's cooking?</Label>
      <input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && submit()}
        placeholder="e.g. Taco night"
        style={inputStyle}
      />

      <Label>Who's cooking?</Label>
      <MemberPicker value={cookId} onChange={setCookId} />

      <Label>What it needs {count > 0 && `· ${count}`}</Label>
      <textarea
        value={ingredients}
        onChange={(e) => setIngredients(e.target.value)}
        rows={5}
        placeholder={'One per line, quantity first:\n2 lbs chicken thighs\n1 red onion\ntortillas'}
        style={{ ...inputStyle, resize: 'vertical', font: `500 13.5px/1.7 ${fonts.mono}` }}
      />
      <div style={{ font: `400 12px/1.5 ${fonts.sans}`, color: colors.muted, margin: '-12px 0 20px' }}>
        These can be pushed onto the grocery list in one tap, with whatever you last paid filled in.
      </div>

      <Label>Note (optional)</Label>
      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && submit()}
        placeholder="e.g. Thaw the chicken in the morning"
        style={{ ...inputStyle, marginBottom: 0 }}
      />
    </ModalShell>
  );
}

const toText = (list) =>
  (Array.isArray(list) ? list : []).map((i) => [i.qty, i.title].filter(Boolean).join(' ')).join('\n');

// "2 lbs chicken thighs" → { qty: '2 lbs', title: 'chicken thighs' }.
// Splits on the leading number-and-unit only; a line with no quantity is all
// title, which is the common case for things like "tortillas".
const QTY = /^\s*(\d+(?:[./]\d+)?\s*(?:lbs?|lb|oz|g|kg|ml|l|cups?|tbsp|tsp|cloves?|cans?|bunch(?:es)?|packs?|boxes?|bags?|dozen|x)?)\s+(.*)$/i;

export function parseIngredients(text) {
  return (text || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const m = line.match(QTY);
      return m ? { qty: m[1].trim(), title: m[2].trim() } : { qty: '', title: line };
    })
    .filter((i) => i.title);
}
