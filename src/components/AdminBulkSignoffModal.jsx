// components/AdminBulkSignoffModal.jsx
import React, { useState } from 'react';
import { ShieldCheck, X } from 'lucide-react';
import { EmployeePillPicker } from './EmployeePillPicker';
import { bulkCompleteQuarantineShift } from '../lib/roundsApi';

/**
 * Hidden admin action (opened by double-tapping the care round clipboard
 * icon): marks every quarantine cat's cleaning task AND every active
 * medication due that shift as signed off, under the chosen name.
 */
export function AdminBulkSignoffModal({ shift, allAnimals, meds, onClose, onDone }) {
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  async function submit(e) {
    e.preventDefault();
    if (busy) return;

    if (!name) {
      setError('Pick the name to sign off as.');
      return;
    }

    try {
      setBusy(true);
      setError('');
      const res = await bulkCompleteQuarantineShift({
        allAnimals,
        meds,
        shift,
        signedBy: name,
        notes: `Admin bulk sign-off (${shift})`,
      });
      setResult(res);
      await onDone?.(res);
    } catch (err) {
      console.error('Admin bulk sign-off error:', err);
      setError('Something went wrong — not everything may be signed off. Check the board.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modalOverlay" onClick={busy ? undefined : onClose}>
      <div className="modalCard" onClick={e => e.stopPropagation()}>
        <div className="modalHeader">
          <b style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ShieldCheck size={18}/> Admin: complete {shift} round
          </b>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            style={{ background: 'none', border: 'none', color: '#98a5b8', cursor: 'pointer', display: 'flex' }}
          >
            <X size={20}/>
          </button>
        </div>

        {result ? (
          <>
            <p style={{ margin: '8px 0 12px' }}>
              Signed off as <b>{name}</b>: {result.animalsSignedOff} {shift} care task
              {result.animalsSignedOff === 1 ? '' : 's'} and {result.medsSignedOff} {shift} medication
              {result.medsSignedOff === 1 ? '' : 's'}.
            </p>
            <button type="button" className="primary full" onClick={onClose}>Done</button>
          </>
        ) : (
          <form onSubmit={submit}>
            <small style={{ color: '#98a5b8', display: 'block', marginBottom: 10 }}>
              Marks every quarantine cat's {shift} cleaning/feeding/water and all {shift} meds as done.
              This skips the per-cat check.
            </small>

            <small style={{ color: '#98a5b8', display: 'block', margin: '0 0 8px' }}>Sign off as</small>
            <EmployeePillPicker value={name} onChange={setName}/>

            {error && <small style={{ color: '#ff4d4f', display: 'block', marginTop: 10 }}>{error}</small>}

            <button type="submit" className="primary full" disabled={busy} style={{ marginTop: 14 }}>
              {busy ? 'Signing off…' : `Mark all ${shift} done`}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
