import React, { useState } from 'react';
import { Save, X } from 'lucide-react';

export function medicationToForm(medication) {
  return {
    medication_name: medication?.medication_name || medication?.name || '',
    dosage_notes: medication?.dosage_notes || medication?.dose || '',
    schedule: medication?.schedule || 'AM',
    next_due: medication?.next_due || medication?.nextDue || '',
    start_date: medication?.start_date || new Date().toISOString().slice(0, 10),
    end_date: medication?.end_date || '',
    notes: medication?.notes || '',
    active: medication?.active !== false
  };
}

export function MedicationForm({ medication, onSave, onCancel }) {
  const [form, setForm] = useState(() => medicationToForm(medication));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const set = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  async function submit(e) {
    e.preventDefault();
    setError('');
    if (!form.medication_name.trim()) {
      setError('Medication name is required.');
      return;
    }
    try {
      setSaving(true);
      await onSave(form);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to save medication.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="panel form medForm" onSubmit={submit}>
      <div className="title">
        <h2>{medication ? 'Edit Medication' : 'Add Medication'}</h2>
        <button type="button" className="icon" onClick={onCancel}><X size={18}/></button>
      </div>
      {error && <p className="error">{error}</p>}

      <label>Medication Name
        <input value={form.medication_name} onChange={e => set('medication_name', e.target.value)} placeholder="Tobramycin" />
      </label>

      <label>Dose / Instructions
        <input value={form.dosage_notes} onChange={e => set('dosage_notes', e.target.value)} placeholder="1 drop both eyes" />
      </label>

      <div className="formRow two">
        <label>Schedule
          <select value={form.schedule} onChange={e => set('schedule', e.target.value)}>
            <option>AM</option><option>PM</option><option>AM + PM</option><option>Daily</option>
            <option>Every 12 hours</option><option>Every 8 hours</option><option>As needed</option><option>Custom</option>
          </select>
        </label>

        <label>Next Due
          <input value={form.next_due} onChange={e => set('next_due', e.target.value)} placeholder="6:30 PM" />
        </label>
      </div>

      <div className="formRow two">
        <label>Start Date
          <input type="date" value={form.start_date || ''} onChange={e => set('start_date', e.target.value)} />
        </label>
        <label>End Date
          <input type="date" value={form.end_date || ''} onChange={e => set('end_date', e.target.value)} />
        </label>
      </div>

      <label>Notes
        <textarea value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Give with food, monitor appetite, etc." rows="3" />
      </label>

      {medication && (
        <label className="check">
          <input type="checkbox" checked={form.active} onChange={e => set('active', e.target.checked)} />
          Active medication
        </label>
      )}

      <button className="primary full" disabled={saving}>
        <Save size={16}/>{saving ? 'Saving...' : 'Save Medication'}
      </button>
    </form>
  );
}
