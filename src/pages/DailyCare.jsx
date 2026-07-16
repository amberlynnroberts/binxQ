import React, { useEffect, useMemo, useState } from 'react';
import {CheckCircle2, ClipboardCheck, Moon, Pill, RefreshCw, Sun, Trash2, Sparkles, X} from 'lucide-react';
import {fetchDailyCareSignoffs, removeCleaningSignoff, removeMedicationSignoff, signOffCleaning, signOffMedication, todayDateString} from '../lib/dailyCareApi';
import { ArrowLeft } from 'lucide-react';
import { medNeededForShift } from '../lib/medUtils';
import { EmployeePillPicker } from '../components/EmployeePillPicker';

function signedMap(rows, keyBuilder) {
  return new Map((rows || []).map(row => [keyBuilder(row), row]));
}

export function DailyCare({ data, reload }) {
  const [shift, setShift] = useState('AM');
  const [careDate, setCareDate] = useState(todayDateString());
  const [signedBy, setSignedBy] = useState('');
  const [notesByKey, setNotesByKey] = useState({});
  const [signoffs, setSignoffs] = useState({ cleaning: [], medication: [] });
  const [message, setMessage] = useState('');
  const [busyKey, setBusyKey] = useState('');

  // Modal state for entering initials, replacing the old window.prompt —
  // this is a proper in-app dialog styled to match the rest of BinxQ,
  // instead of a plain native browser popup.
  const [showInitialsModal, setShowInitialsModal] = useState(false);
  const [modalInitials, setModalInitials] = useState('');
  const [modalError, setModalError] = useState('');
  const [pendingAction, setPendingAction] = useState(null);

  const animals = data?.animals || [];
  const meds = data?.meds || [];

  const cleaningMap = useMemo(() => signedMap(signoffs.cleaning, row => row.animal_id), [signoffs.cleaning]);
  const medMap = useMemo(() => signedMap(signoffs.medication, row => `${row.animal_id}:${row.medication_id}`), [signoffs.medication]);

  const medsByAnimal = useMemo(() => {
    const map = new Map();
    for (const med of meds) {
      if (!med.active) continue;
      if (!medNeededForShift(med, shift)) continue;
      const list = map.get(med.animalId) || [];
      list.push(med);
      map.set(med.animalId, list);
    }
    return map;
  }, [meds, shift]);

  const stats = useMemo(() => {
    const cleaningTotal = animals.length;
    const cleaningDone = animals.filter(a => cleaningMap.has(a.id)).length;

    const medItems = [];
    medsByAnimal.forEach((list, animalId) => {
      list.forEach(med => medItems.push({ animalId, med }));
    });

    const medsTotal = medItems.length;
    const medsDone = medItems.filter(item => medMap.has(`${item.animalId}:${item.med.id}`)).length;

    return { cleaningTotal, cleaningDone, medsTotal, medsDone };
  }, [animals, cleaningMap, medsByAnimal, medMap]);

  function showMessage(text) {
    setMessage(text);
    setTimeout(() => setMessage(''), 5000);
  }

  async function loadSignoffs() {
    const rows = await fetchDailyCareSignoffs({ careDate, shift });
    setSignoffs(rows);
  }

  useEffect(() => {
    loadSignoffs().catch(console.error);
  }, [careDate, shift]);

  // If initials are already set, runs the action immediately with that
  // name. Otherwise opens the initials modal and stashes the action to run
  // once the person confirms — this replaces the old window.prompt-based
  // flow with a proper styled in-app dialog.
  function requestInitialsThen(action) {
    const existing = signedBy.trim();
    if (existing) {
      action(existing);
      return;
    }
    setModalInitials('');
    setModalError('');
    setPendingAction(() => action);
    setShowInitialsModal(true);
  }

  function confirmInitialsModal() {
    if (!modalInitials.trim()) {
      setModalError('Please select your name.');
      return;
    }
    setSignedBy(modalInitials);
    setShowInitialsModal(false);
    setModalError('');
    const action = pendingAction;
    setPendingAction(null);
    action?.(modalInitials);
  }

  function cancelInitialsModal() {
    setShowInitialsModal(false);
    setPendingAction(null);
    setModalError('');
  }

  async function toggleCleaning(animal) {
    requestInitialsThen(async (name) => {
      const key = `cleaning:${animal.id}`;
      const alreadySigned = cleaningMap.has(animal.id);

      try {
        setBusyKey(key);

        if (alreadySigned) {
          await removeCleaningSignoff({ animalId: animal.id, shift, careDate });
          showMessage(`${animal.name} cleaning sign-off removed.`);
        } else {
          await signOffCleaning({ animalId: animal.id, shift, careDate, signedBy: name, notes: notesByKey[key] || '' });
          showMessage(`${animal.name} ${shift} cleaning signed off.`);
        }

        await loadSignoffs();
        await reload?.();
      } finally {
        setBusyKey('');
      }
    });
  }

  async function toggleMed(animal, med) {
    requestInitialsThen(async (name) => {
      const key = `med:${animal.id}:${med.id}`;
      const mapKey = `${animal.id}:${med.id}`;
      const alreadySigned = medMap.has(mapKey);

      try {
        setBusyKey(key);

        if (alreadySigned) {
          await removeMedicationSignoff({ animalId: animal.id, medicationId: med.id, shift, careDate });
          showMessage(`${animal.name} medication sign-off removed.`);
        } else {
          await signOffMedication({ animalId: animal.id, medicationId: med.id, shift, careDate, givenBy: name, notes: notesByKey[key] || '' });
          showMessage(`${animal.name} ${med.name} marked given.`);
        }

        await loadSignoffs();
        await reload?.();
      } finally {
        setBusyKey('');
      }
    });
  }

  function noteValue(key) {
    return notesByKey[key] || '';
  }

  function setNote(key, value) {
    setNotesByKey(prev => ({ ...prev, [key]: value }));
  }

  return (
    <main>
      <div className="roundsTop">
        <button type="button" className="roundsClose" onClick={() => window.history.back()}>
          <ArrowLeft size={20}/>
        </button>
        <h1>Daily Care</h1>
        <span/>
      </div>
      <div className="title">
        <h1>Daily Care</h1>
        <button className="icon" type="button" onClick={loadSignoffs}>
          <RefreshCw size={18}/>
        </button>
      </div>
      <section className="panel careControls">
        <div className="shiftToggle">
          <button type="button" className={shift === 'AM' ? 'primary' : 'link'} onClick={() => setShift('AM')}>
            <Sun size={16}/> AM
          </button>

          <button type="button" className={shift === 'PM' ? 'primary' : 'link'} onClick={() => setShift('PM')}>
            <Moon size={16}/> PM
          </button>
        </div>

        <label>Care Date
          <input type="date" value={careDate} onChange={e => setCareDate(e.target.value)} />
        </label>

        <label>Your Name
          <EmployeePillPicker value={signedBy} onChange={setSignedBy} />
        </label>

        {message && (
          <p className={message.includes('removed') || message.includes('Enter') ? 'error' : 'success'}>
            <CheckCircle2 size={16}/>{message}
          </p>
        )}
      </section>

      <section className="stats careStats">
        <div className="stat green">
          <b>{stats.cleaningDone}/{stats.cleaningTotal}</b>
          <small>{shift} Cleaning</small>
        </div>

        <div className="stat yellow">
          <b>{stats.medsDone}/{stats.medsTotal}</b>
          <small>{shift} Meds</small>
        </div>

        <div className="stat">
          <b>{animals.length}</b>
          <small>Animals</small>
        </div>
      </section>

      <section className="panel">
        <h2><Sparkles size={18}/> {shift} Cleaning Sign-Off</h2>
        {animals.length === 0 && <p>No animals in this view.</p>}

        <div className="careList">
          {animals.map(animal => {
            const signoff = cleaningMap.get(animal.id);
            const key = `cleaning:${animal.id}`;

            return (
              <article className={signoff ? 'careCard done' : 'careCard'} key={animal.id}>
                <div className="careMain">
                  <button
                    type="button"
                    className={`careActionButton ${signoff ? 'primary' : 'link'}`}
                    disabled={busyKey === key}
                    onClick={() => toggleCleaning(animal)}>
                    {signoff ? <CheckCircle2 size={18}/> : <ClipboardCheck size={18}/>}
                    {signoff ? 'Completed' : 'Confirm Complete'}
                  </button>
                  <div>
                    <h3>{animal.name}</h3>
                    <p>Kennel: {animal.kennel || 'Unassigned'} · {animal.status}</p>
                    {signoff && <small>Signed by {signoff.signed_by} at {new Date(signoff.created_at).toLocaleTimeString()}</small>}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="panel">
        <h2><Pill size={18}/> {shift} Medication Sign-Off</h2>
        {stats.medsTotal === 0 && <p>No {shift} medications due in this view.</p>}

        <div className="careList">
          {animals.map(animal => {
            const animalMeds = medsByAnimal.get(animal.id) || [];
            if (animalMeds.length === 0) return null;

            return (
              <article className="careCard medGroup" key={animal.id}>
                <h3>{animal.name}</h3>
                <p>Kennel: {animal.kennel || 'Unassigned'}</p>

                {animalMeds.map(med => {
                  const mapKey = `${animal.id}:${med.id}`;
                  const signoff = medMap.get(mapKey);
                  const key = `med:${animal.id}:${med.id}`;

                  return (
                    <div className={signoff ? 'medSignoffRow done' : 'medSignoffRow'} key={med.id}>
                      <button type="button" className={signoff ? 'checkButton done' : 'checkButton'} disabled={busyKey === key} onClick={() => toggleMed(animal, med)}>
                        {signoff ? <CheckCircle2 size={22}/> : <Pill size={22}/>}
                      </button>

                      <div className="medSignoffInfo">
                        <b>{med.name}</b>
                        <small>{med.dose || 'No dosage instructions'} · {med.schedule || 'No schedule'}</small>
                        {med.nextDue && <small>Next due: {med.nextDue}</small>}
                        {signoff && <small>Given by {signoff.given_by} at {new Date(signoff.created_at).toLocaleTimeString()}</small>}

                        {!signoff && (
                          <input className="inlineNote" value={noteValue(key)} onChange={e => setNote(key, e.target.value)} placeholder="Optional med note" />
                        )}
                      </div>

                      {signoff && (
                        <button type="button" className="danger" disabled={busyKey === key} onClick={() => toggleMed(animal, med)} title="Remove sign-off">
                          <Trash2 size={16}/>
                        </button>
                      )}
                    </div>
                  );
                })}
              </article>
            );
          })}
        </div>
      </section>

      {showInitialsModal && (
        <div className="modalOverlay" onClick={cancelInitialsModal}>
          <div className="modalCard" onClick={e => e.stopPropagation()}>
            <div className="modalHeader">
              <b>Who's signing off?</b>
              <button
                type="button"
                onClick={cancelInitialsModal}
                style={{ background: 'none', border: 'none', color: '#98a5b8', cursor: 'pointer', display: 'flex' }}
              >
                <X size={20}/>
              </button>
            </div>

            <EmployeePillPicker value={modalInitials} onChange={setModalInitials} />

            {modalError && <small style={{ color: '#ff4d4f', display: 'block', marginTop: 8 }}>{modalError}</small>}

            <button type="button" className="primary full" onClick={confirmInitialsModal} style={{ marginTop: 12 }}>
              Confirm
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
