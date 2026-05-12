import React, { useEffect, useState } from 'react';
import { Edit3, History, Pill, Plus, StopCircle, Trash2, CheckCircle2 } from 'lucide-react';
import {
  createMedication,
  deleteMedication,
  fetchMedLogsForAnimal,
  fetchMedicationsForAnimal,
  giveMedication,
  stopMedication,
  updateMedication
} from '../lib/medicationApi';
import { MedicationForm } from './MedicationForm';

export function MedicationManager({ animal, reload }) {
  const [medications, setMedications] = useState([]);
  const [logs, setLogs] = useState([]);
  const [mode, setMode] = useState('list');
  const [editingMedication, setEditingMedication] = useState(null);
  const [message, setMessage] = useState('');
  const [busyId, setBusyId] = useState(null);

  async function load() {
    const [medRows, logRows] = await Promise.all([
      fetchMedicationsForAnimal(animal.id),
      fetchMedLogsForAnimal(animal.id)
    ]);
    setMedications(medRows);
    setLogs(logRows);
  }

  useEffect(() => { load().catch(console.error); }, [animal.id]);

  function showMessage(text) {
    setMessage(text);
    setTimeout(() => setMessage(''), 5000);
  }

  async function handleCreate(form) {
    await createMedication(animal.id, form);
    setMode('list');
    showMessage('Medication added.');
    await load();
    await reload?.();
  }

  async function handleUpdate(form) {
    await updateMedication(editingMedication.id, form);
    setEditingMedication(null);
    setMode('list');
    showMessage('Medication updated.');
    await load();
    await reload?.();
  }

  async function handleGive(medication) {
    const givenBy = window.prompt('Initials/name of person giving med?', '');
    if (givenBy === null) return;
    const notes = window.prompt('Any notes? Optional.', '') || '';
    try {
      setBusyId(medication.id);
      await giveMedication({ medicationId: medication.id, animalId: animal.id, givenBy, notes });
      showMessage(`${medication.medication_name} marked given.`);
      await load();
      await reload?.();
    } finally {
      setBusyId(null);
    }
  }

  async function handleStop(medication) {
    const reason = window.prompt('Reason for stopping medication?', 'Completed');
    if (reason === null) return;
    if (!window.confirm(`Stop ${medication.medication_name}?`)) return;
    try {
      setBusyId(medication.id);
      await stopMedication(medication.id, reason);
      showMessage(`${medication.medication_name} stopped.`);
      await load();
      await reload?.();
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(medication) {
    if (!window.confirm(`Permanently delete ${medication.medication_name}? Usually Stop is better.`)) return;
    try {
      setBusyId(medication.id);
      await deleteMedication(medication.id);
      showMessage(`${medication.medication_name} deleted.`);
      await load();
      await reload?.();
    } finally {
      setBusyId(null);
    }
  }

  if (mode === 'add') return <MedicationForm onSave={handleCreate} onCancel={() => setMode('list')} />;

  if (mode === 'edit' && editingMedication) {
    return (
      <MedicationForm
        medication={editingMedication}
        onSave={handleUpdate}
        onCancel={() => { setEditingMedication(null); setMode('list'); }}
      />
    );
  }

  const activeMeds = medications.filter(m => m.active);
  const inactiveMeds = medications.filter(m => !m.active);

  return (
    <section className="panel medicationPanel">
      <div className="title">
        <h2><Pill size={18}/> Medications</h2>
        <button type="button" className="primary" onClick={() => setMode('add')}><Plus size={16}/> Add Med</button>
      </div>

      {message && <p className="success"><CheckCircle2 size={16}/>{message}</p>}
      {activeMeds.length === 0 && <p>No active medications.</p>}

      <div className="medCrudList">
        {activeMeds.map(med => (
          <article className="medCrudCard active" key={med.id}>
            <div className="title">
              <div>
                <h3>{med.medication_name}</h3>
                <p>{med.dosage_notes || 'No dosage instructions'}</p>
              </div>
              <span className="badge green">Active</span>
            </div>

            <div className="medMeta">
              <span><b>Schedule:</b> {med.schedule || 'Not set'}</span>
              <span><b>Next Due:</b> {med.next_due || 'Not set'}</span>
              {med.start_date && <span><b>Start:</b> {med.start_date}</span>}
              {med.end_date && <span><b>End:</b> {med.end_date}</span>}
            </div>

            {med.notes && <p><b>Notes:</b> {med.notes}</p>}

            <div className="quick">
              <button type="button" className="primary" disabled={busyId === med.id} onClick={() => handleGive(med)}>
                <CheckCircle2 size={16}/> Give Med
              </button>
              <button type="button" className="link" onClick={() => { setEditingMedication(med); setMode('edit'); }}>
                <Edit3 size={16}/> Edit
              </button>
              <button type="button" className="link" disabled={busyId === med.id} onClick={() => handleStop(med)}>
                <StopCircle size={16}/> Stop
              </button>
              <button type="button" className="danger" disabled={busyId === med.id} onClick={() => handleDelete(med)}>
                <Trash2 size={16}/>
              </button>
            </div>
          </article>
        ))}
      </div>

      {inactiveMeds.length > 0 && (
        <>
          <h3 className="subhead">Stopped / Inactive</h3>
          <div className="medCrudList">
            {inactiveMeds.map(med => (
              <article className="medCrudCard inactive" key={med.id}>
                <div className="title">
                  <div>
                    <h3>{med.medication_name}</h3>
                    <p>{med.dosage_notes || 'No dosage instructions'}</p>
                  </div>
                  <span className="badge">Inactive</span>
                </div>
                {med.stopped_reason && <p><b>Stopped:</b> {med.stopped_reason}</p>}
                <button type="button" className="link" onClick={() => { setEditingMedication(med); setMode('edit'); }}>
                  <Edit3 size={16}/> Edit
                </button>
              </article>
            ))}
          </div>
        </>
      )}

      <section className="medHistory">
        <h3><History size={16}/> Med History</h3>
        {logs.length === 0 && <p>No medication history yet.</p>}
        {logs.map(log => (
          <div className="medLog" key={log.id}>
            <b>{log.medications?.medication_name || 'Medication'}</b>
            <small>Given by {log.given_by || 'Unknown'} · {new Date(log.given_at).toLocaleString()}</small>
            {log.notes && <p>{log.notes}</p>}
          </div>
        ))}
      </section>
    </section>
  );
}
