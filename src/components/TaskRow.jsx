import { colors, fonts } from '../theme';
import { Avatar, Check, Pill } from './ui';
import { roomMeta, effortLabel } from '../data/rooms';

export function TaskRow({ task, onToggle, onEdit }) {
  const detail = [
    task.who || 'Anyone',
    task.room !== 'whole' && roomMeta(task.room)[1],
    task.repeatLabel,
    effortLabel(task.effortMinutes),
  ]
    .filter(Boolean)
    .join(' · ');
  return (
    <div className="tend-task-row" style={{ borderTop: `1px solid ${colors.divider}` }}>
      <Check done={task.done} label={task.title} onClick={() => onToggle(task.id)} />
      <button
        onClick={() => onEdit(task)}
        style={{ flex: 1, minWidth: 0, textAlign: 'left', padding: '8px 0' }}
      >
        <div
          style={{
            font: `600 14px ${fonts.sans}`,
            color: task.done ? colors.muted : colors.ink,
            textDecoration: task.done ? 'line-through' : 'none',
            overflowWrap: 'anywhere',
          }}
        >
          {task.title}
        </div>
        <div style={{ font: `400 12px/1.5 ${fonts.sans}`, color: colors.muted, marginTop: 3 }}>{detail}</div>
      </button>
      <span className="tend-task-avatar">
        <Avatar who={task.who} size={28} />
      </span>
      <Pill task={task} />
    </div>
  );
}
