import React, { useState } from 'react';
import { X } from 'lucide-react';

export function defaultAnimalForm() {
  return {
    name: '',
    species: 'Cat',
    sex: 'Unknown',
    age: '',
    color: '',
    intake_date: new Date().toISOString().slice(0, 10),
    kennel_number: 'Quarantine Kennel 1',
    local_status: 'Quarantine'
  };
}

export function AnimalForm({ title, initialForm, submitText, onSubmit, onCancel }) {
  const [form, setForm] = useState(initialForm || defaultAnimalForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function submit(e) {
    e.preventDefault();
    setError('');
    if (!form.name.trim()) {
      setError('Name is required.');
      return;
    }
    setSaving(true);
    try {
      await onSubmit(form);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <main>
      <form className="panel form" onSubmit={submit}>
        <div className="title"><h1>{title}</h1><button type="button" className="icon" onClick={onCancel}><X/></button></div>
        {error && <p className="error">{error}</p>}

        <label>Name<input value={form.name} onChange={e => set('name', e.target.value)} placeholder="Gorilla" /></label>
        <label>Color / Description<input value={form.color} onChange={e => set('color', e.target.value)} placeholder="Black DSH" /></label>
        <label>Age<input value={form.age} onChange={e => set('age', e.target.value)} placeholder="8 weeks" /></label>

        <label>Sex
          <select value={form.sex} onChange={e => set('sex', e.target.value)}>
            <option>Unknown</option><option>Female</option><option>Male</option>
          </select>
        </label>

        <label>Kennel
          <select value={form.kennel_number} onChange={e => set('kennel_number', e.target.value)}>
            {Array.from({ length: 9 }, (_, i) => <option key={i + 1}>Quarantine Kennel {i + 1}</option>)}
          </select>
        </label>

        <label>Status
          <select value={form.local_status} onChange={e => set('local_status', e.target.value)}>
            <option>Quarantine</option><option>Monitor</option><option>Clear</option><option>Removed</option>
          </select>
        </label>

        <label>Intake Date<input type="date" value={form.intake_date} onChange={e => set('intake_date', e.target.value)} /></label>

        <button className="primary full" disabled={saving}>{saving ? 'Saving...' : submitText}</button>
      </form>
    </main>
  );
}
