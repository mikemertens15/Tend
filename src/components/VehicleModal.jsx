import { useState } from 'react';
import { colors, fonts } from '../theme';
import { Avatar } from './ui';
import { ModalShell, Label, Chip, inputStyle, PrimaryButton, GhostButton, DeleteButton } from './Modal';
import { useHousehold } from '../household/HouseholdProvider';
import { OIL_INTERVALS } from '../data/useVehicles';

// Add or edit a car. Pass `vehicle` (the raw DB row) to edit; omit it to add.
// onSave receives DB-column-shaped fields; onDelete (edit mode) removes the car.
export function VehicleModal({ vehicle, onClose, onSave, onDelete }) {
  const { members } = useHousehold();
  const editing = Boolean(vehicle);

  const [name, setName] = useState(vehicle?.name ?? '');
  const [miles, setMiles] = useState(vehicle?.miles != null ? String(vehicle.miles) : '');
  const [driverId, setDriverId] = useState(vehicle?.driver_member_id ?? null);
  const [oilDue, setOilDue] = useState(vehicle?.oil_due_miles != null ? String(vehicle.oil_due_miles) : '');
  const [oilInterval, setOilInterval] = useState(vehicle?.oil_interval_miles ?? 5000);
  const [reg, setReg] = useState(vehicle?.registration_due ?? '');
  const [ins, setIns] = useState(vehicle?.insurance_renews ?? '');
  const [tires, setTires] = useState(vehicle?.tires_rotated_on ?? '');
  const [service, setService] = useState(vehicle?.last_service_on ?? '');

  function submit() {
    if (!name.trim()) return;
    onSave({
      name: name.trim(),
      miles: parseInt(miles, 10) || 0,
      driver_member_id: driverId,
      oil_due_miles: oilDue === '' ? null : parseInt(oilDue, 10) || 0,
      oil_interval_miles: oilInterval,
      registration_due: reg || null,
      insurance_renews: ins || null,
      tires_rotated_on: tires || null,
      last_service_on: service || null,
    });
    onClose();
  }

  return (
    <ModalShell
      title={editing ? 'Edit vehicle' : 'Add a vehicle'}
      onClose={onClose}
      footer={
        <>
          {editing && <DeleteButton onClick={() => { onDelete(vehicle.id); onClose(); }}>Remove</DeleteButton>}
          <GhostButton onClick={onClose}>Cancel</GhostButton>
          <PrimaryButton onClick={submit}>{editing ? 'Save changes' : 'Add vehicle'}</PrimaryButton>
        </>
      }
    >
      <Label>What's the car?</Label>
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && submit()}
        placeholder="e.g. 2019 Honda CR-V"
        style={inputStyle}
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: 12 }}>
        <div>
          <Label>Current mileage</Label>
          <input
            type="number"
            min="0"
            value={miles}
            onChange={(e) => setMiles(e.target.value)}
            placeholder="45000"
            style={inputStyle}
          />
        </div>
        <div>
          <Label>Next oil change at (mi)</Label>
          <input
            type="number"
            min="0"
            value={oilDue}
            onChange={(e) => setOilDue(e.target.value)}
            placeholder="50000"
            style={inputStyle}
          />
        </div>
      </div>

      <Label>Oil change interval</Label>
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {OIL_INTERVALS.map((mi) => (
          <Chip key={mi} active={oilInterval === mi} onClick={() => setOilInterval(mi)}>
            {mi.toLocaleString()} mi
          </Chip>
        ))}
      </div>

      <Label>Who mostly drives it?</Label>
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        {members.map((m) => {
          const sel = driverId === m.id;
          return (
            <button
              key={m.id}
              onClick={() => setDriverId(sel ? null : m.id)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 6,
                padding: '8px 6px',
                borderRadius: 14,
                minWidth: 64,
                flex: '1 0 auto',
                background: sel ? colors.chipBg : 'transparent',
                border: `1px solid ${sel ? '#e2b07f' : 'transparent'}`,
              }}
            >
              <Avatar who={m.name} size={40} />
              <div style={{ font: `500 11px ${fonts.sans}`, color: colors.muted3 }}>{m.name}</div>
            </button>
          );
        })}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: 12 }}>
        <div>
          <Label>Registration due</Label>
          <input type="date" value={reg} onChange={(e) => setReg(e.target.value)} style={inputStyle} />
        </div>
        <div>
          <Label>Insurance renews</Label>
          <input type="date" value={ins} onChange={(e) => setIns(e.target.value)} style={inputStyle} />
        </div>
        <div>
          <Label>Tires last rotated</Label>
          <input type="date" value={tires} onChange={(e) => setTires(e.target.value)} style={inputStyle} />
        </div>
        <div>
          <Label>Last service</Label>
          <input type="date" value={service} onChange={(e) => setService(e.target.value)} style={inputStyle} />
        </div>
      </div>
    </ModalShell>
  );
}
