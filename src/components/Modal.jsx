import { useEffect } from 'react';
import { colors, tone, shadows, fonts } from '../theme';
import { Avatar } from './ui';
import { useHousehold } from '../household/HouseholdProvider';

// Shared dialog chrome for the add/edit modals: dimmed backdrop, cream card,
// title row with a close button, Escape-to-close. Children are the form body;
// the footer renders the caller's action buttons right-aligned.
// `width` is for the two dialogs that hold a whole form rather than a question
// — the event editor and a job's pay rules. Everything else takes the default,
// because a dialog wider than its content reads as an empty one.
export function ModalShell({ title, onClose, children, footer, width = 460 }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 40,
        background: shadows.backdrop,
        backdropFilter: 'blur(3px)',
        WebkitBackdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        style={{
          width,
          maxWidth: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          background: colors.card,
          borderRadius: 22,
          padding: '28px 30px',
          boxShadow: shadows.modal,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
          <div style={{ font: `400 25px ${fonts.serif}`, color: colors.ink }}>{title}</div>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{ width: 30, height: 30, borderRadius: '50%', background: colors.chipBg, color: colors.muted2, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17 }}
          >
            ×
          </button>
        </div>

        {children}

        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 26 }}>{footer}</div>
      </div>
    </div>
  );
}

export function Label({ children }) {
  return <div style={{ font: `600 12px ${fonts.sans}`, color: colors.muted2, marginBottom: 8 }}>{children}</div>;
}

// `tint` lets an option carry its own colour when selected — a platform chip
// goes PlayStation blue rather than the app accent, so picking it looks like
// the pill it produces on the row. Optional: without one, nothing changes.
export function Chip({ active, onClick, children, tint }) {
  return (
    <button
      onClick={onClick}
      style={
        active
          // White only on a tint, whose colours were picked against it. The
          // untinted chip keeps the palette's own on-accent ink.
          ? { padding: '9px 15px', borderRadius: 12, background: tint ?? colors.accent, color: tint ? '#fff' : colors.onAccent, font: `600 12.5px ${fonts.sans}` }
          : { padding: '9px 15px', borderRadius: 12, background: colors.inputBg, border: `1px solid ${tint ?? colors.cardBorder}`, color: colors.muted2, font: `500 12.5px ${fonts.sans}` }
      }
    >
      {children}
    </button>
  );
}

export const inputStyle = {
  width: '100%',
  border: `1px solid ${colors.inputBorder}`,
  background: colors.inputBg,
  borderRadius: 12,
  padding: '12px 14px',
  font: `500 14px ${fonts.sans}`,
  color: colors.ink,
  outline: 'none',
  marginBottom: 20,
  boxSizing: 'border-box',
};

export function PrimaryButton({ onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{ padding: '11px 22px', borderRadius: 22, background: colors.accent, color: colors.onAccent, font: `600 13px ${fonts.sans}`, boxShadow: shadows.accent }}
    >
      {children}
    </button>
  );
}

export function GhostButton({ onClick, children }) {
  return (
    <button onClick={onClick} style={{ padding: '11px 20px', borderRadius: 22, font: `600 13px ${fonts.sans}`, color: colors.muted2 }}>
      {children}
    </button>
  );
}

// Household-member picker (avatar buttons), used by the add/edit modals.
// `value` is a member id or null. Pass `none` (e.g. "Family", "Anyone") to
// render a no-specific-person option; without it, clicking the selected
// member deselects back to null.
export function MemberPicker({ value, onChange, none }) {
  const { members } = useHousehold();

  const option = (key, selected, onClick, avatar, label) => (
    <button
      key={key}
      onClick={onClick}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 6,
        padding: '8px 6px',
        borderRadius: 14,
        minWidth: 64,
        flex: '1 0 auto',
        background: selected ? colors.chipBg : 'transparent',
        border: `1px solid ${selected ? colors.selected : 'transparent'}`,
      }}
    >
      {avatar}
      <div style={{ font: `500 11px ${fonts.sans}`, color: colors.muted3 }}>{label}</div>
    </button>
  );

  return (
    <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
      {none &&
        option(
          'none',
          value === null,
          () => onChange(null),
          <div
            style={{ width: 40, height: 40, borderRadius: '50%', background: colors.chipBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}
          >
            🏡
          </div>,
          none,
        )}
      {members.map((m) =>
        option(
          m.id,
          value === m.id,
          () => onChange(none ? m.id : value === m.id ? null : m.id),
          <Avatar who={m.name} size={40} />,
          m.name,
        ),
      )}
    </div>
  );
}

// Quiet destructive action pinned to the left edge of the footer.
export function DeleteButton({ onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{ padding: '11px 4px', borderRadius: 22, font: `600 13px ${fonts.sans}`, color: tone.red, marginRight: 'auto' }}
    >
      {children}
    </button>
  );
}
