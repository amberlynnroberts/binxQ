import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, ClipboardList, Droplets, Pill, Utensils, X, Check, Plus, Trash2 } from 'lucide-react';
import {buildCareRoundItems, buildMedicationRoundItems, completeCareRoundItem, completeMedicationRoundItem, loadRoundSignoffs} from '../lib/roundsApi';
import { todayDateString } from '../lib/dailyCareApi';
import { updateAnimalKennelNumber } from '../lib/kennelUpdateApi';
import { signOffQuarantinePaper } from '../lib/reportsApi';
import { formatAge } from '../lib/formatAge';
import { medNeededForShift, deleteMedication, createMedication } from '../lib/medUtils';
import { signOffMedication } from '../lib/dailyCareApi';
import { EmployeePillPicker } from '../components/EmployeePillPicker';

function ProgressBar({ current, total }) {
  const pct = total ? Math.round((current / total) * 100) : 0;
  return (
    <div className="roundProgressBlock">
      <div className="roundProgressTrack"><span style={{ width: `${pct}%` }}/></div>
      <div className="roundProgressMeta"><small>{current} of {total}</small><small>{pct}% complete</small></div>
    </div>
  );
}

function AnimalHero({ animal }) {
  return (
    <section className="roundAnimalHero">
      <div className="roundKennelTag"><b>{animal.kennel || 'Room'}</b></div>
      <div className="roundAnimalPhoto">
        {animal.photo && String(animal.photo).startsWith('http') ? <img src={animal.photo} alt={animal.name}/> : <span>{animal.photo || '🐱'}</span>}
      </div>
      <div className="roundAnimalName">
        <h2>{animal.name}</h2>
        <small>{animal.shelterluv_id || animal.id} · {animal.sex || 'Unknown'} · {formatAge(animal.age) || 'Age unknown'}</small>
      </div>
    </section>
  );
}

export function RoundRunner({data, roundType, shift, setPage, reload, setRoundSummary, selectedRoundAnimal, selectedRoundMedication}) {
  const [signoffs, setSignoffs] = useState({ cleaning: [], medication: [] });
  const [index, setIndex] = useState(0);
  const [signedBy, setSignedBy] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [skipped, setSkipped] = useState(0);
  const [kennelDraft, setKennelDraft] = useState('');
  const [medBusy, setMedBusy] = useState('');
  const [showAddMed, setShowAddMed] = useState(false);
  const [addMedForm, setAddMedForm] = useState({
    medication_name: '',
    dosage_notes: '',
    schedule: shift,
    start_date: todayDateString()
  });
  const [addMedBusy, setAddMedBusy] = useState(false);

  // Modal state for entering initials, replacing the old window.alert —
  // matches the same in-app dialog pattern used on the Daily Care page.
  const [showInitialsModal, setShowInitialsModal] = useState(false);
  const [modalInitials, setModalInitials] = useState('');
  const [modalError, setModalError] = useState('');
  const [pendingAction, setPendingAction] = useState(null);

  const animals = data?.animals || [];
  const meds = data?.meds || [];

  async function load() {
    const rows = await loadRoundSignoffs(shift, todayDateString());
    setSignoffs(rows);
  }

  useEffect(() => {
    load().catch(console.error);
  }, [shift]);

  const allItems = useMemo(() => {
    return roundType === 'med'
      ? buildMedicationRoundItems(animals, meds, signoffs.medication, shift)
      : buildCareRoundItems(animals, signoffs.cleaning, shift);
  }, [roundType, animals, meds, signoffs, shift]);

  const selectedItem = useMemo(() => {
    if (!selectedRoundAnimal) return null;
    if (roundType === 'med') {
      return allItems.find(item =>
        item.animal.id === selectedRoundAnimal &&
        (!selectedRoundMedication || item.med?.id === selectedRoundMedication)
      );
    }
    return allItems.find(item => item.animal.id === selectedRoundAnimal);
  }, [allItems, selectedRoundAnimal, selectedRoundMedication, roundType]);

  const items = allItems.filter(item => !item.done);
  const total = allItems.length || items.length;
  const item = selectedItem || items[index] || items[0];
  const completed = Math.max(0, total - items.length);
  const isDone = !item;

  const animalMeds = useMemo(() => {
    if (roundType !== 'care' || !item?.animal) return [];
    return meds.filter(m =>
      m.active &&
      m.animalId === item.animal.id &&
      medNeededForShift(m, shift)
    );
  }, [roundType, item?.animal?.id, meds, shift]);

  const completedMedKeys = useMemo(() => {
    return new Set((signoffs.medication || [])
      .filter(r => r.shift === shift)
      .map(r => `${r.animal_id}:${r.medication_id}`)
    );
  }, [signoffs.medication, shift]);

  // If initials are already set, runs the action immediately with that
  // name. Otherwise opens the initials modal and stashes the action to run
  // once the person confirms — replaces the old window.alert-based flow.
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

  useEffect(() => {
    setKennelDraft(item?.animal?.kennel || '');
  }, [item?.animal?.id]);

  async function toggleMed(med) {
    requestInitialsThen(async (name) => {
      const key = `${item.animal.id}:${med.id}`;
      const alreadyDone = completedMedKeys.has(key);
      try {
        setMedBusy(med.id);
        if (!alreadyDone) {
          await signOffMedication({
            animalId: item.animal.id,
            medicationId: med.id,
            shift,
            careDate: todayDateString(),
            givenBy: name,
            notes: note || ''
          });
        }
        await load();
      } catch (err) {
        console.error('toggleMed error:', err);
        window.alert('Could not save — please try again.');
      } finally {
        setMedBusy('');
      }
    });
  }

  async function deleteMed(med) {
    if (!window.confirm(`Delete ${med.name}?`)) return;
    try {
      await deleteMedication(med.id);
      await reload?.();
      await load();
    } catch (err) {
      console.error('deleteMedication error:', err);
      alert('Could not delete medication');
    }
  }

  async function submitAddMed(e) {
    e.preventDefault();
    if (!addMedForm.medication_name.trim()) return;
    
    try {
      setAddMedBusy(true);
      await createMedication(item.animal.id, addMedForm);
      setAddMedForm({
        medication_name: '',
        dosage_notes: '',
        schedule: shift,
        start_date: todayDateString()
      });
      setShowAddMed(false);
      await reload?.();
      await load();
    } catch (err) {
      console.error('createMedication error:', err);
      alert('Could not add medication');
    } finally {
      setAddMedBusy(false);
    }
  }

  async function completeAndNext() {
    if (!item) return;
    requestInitialsThen(async (name) => {
      try {
        setBusy(true);
        if (roundType === 'med') await completeMedicationRoundItem({ item, givenBy: name, notes: note });
        else await completeCareRoundItem({ item, signedBy: name, notes: note });
        setNote('');
        await load();
        await reload?.();
        setPage('round-kennels');
      } finally {
        setBusy(false);
      }
    });
  }

  async function saveKennelNumber() {
    if (!item?.animal) return;
    const nextKennel = kennelDraft.trim();
    if (!nextKennel || nextKennel === item.animal.kennel) return;
    await updateAnimalKennelNumber({
      animalId: item.animal.id,
      shelterluvId: item.animal.shelterluv_id,
      kennelNumber: nextKennel
    });
    await reload?.();
  }

  function skip() {
    setSkipped(prev => prev + 1);
    setIndex(prev => Math.min(prev + 1, Math.max(items.length - 1, 0)));
  }

  if (isDone) {
    return (
      <main className="roundsScreen small">
        <section className={roundType === 'med' ? 'roundComplete blue' : 'roundComplete'}>
          <div className="roundConfetti">✓</div>
          <h1>{roundType === 'med' ? 'Medication Round' : `${shift} Care Round`} Complete!</h1>
          <div className="roundSummaryGrid">
            <span><b>{completed}</b><small>{roundType === 'med' ? 'Given' : 'Completed'}</small></span>
            <span><b>{skipped}</b><small>Skipped</small></span>
            <span><b>0</b><small>Remaining</small></span>
          </div>
          <button
            type="button"
            className="roundSecondary"
            onClick={() => {
              setRoundSummary({ completed, skipped, roundType, shift });
              setPage('round-summary');
            }}>View Summary</button>
          <button type="button" className="roundPrimary" onClick={() => setPage('dashboard')}>Back to Dashboard</button>
        </section>
      </main>
    );
  }

  // Distinct from the round-wide "all done" screen above — this handles
  // navigating directly to ONE specific cat (via selectedRoundAnimal, e.g.
  // tapping their card on the round board) whose task is already signed
  // off, even though the round overall isn't finished yet. Previously this
  // showed the exact same active sign-off form as a not-yet-done cat,
  // making it look like it still needed to be completed.
  if (selectedItem?.done) {
    return (
      <main className="roundsScreen small">
        <div className="roundsTop">
          <button type="button" className="roundsClose" onClick={() => setPage('round-kennels')}><X size={20}/></button>
          <h1>{roundType === 'med' ? 'Medication Round' : `${shift} Care Round`}</h1>
          <span/>
        </div>

        <AnimalHero animal={selectedItem.animal}/>

        <section className={roundType === 'med' ? 'roundComplete blue' : 'roundComplete'} style={{ minHeight: 'auto', padding: '32px 0' }}>
          <div className="roundConfetti">✓</div>
          <h1>Already {roundType === 'med' ? 'Given' : 'Completed'}</h1>
          <p style={{ color: 'var(--round-muted)', textAlign: 'center', margin: 0 }}>
            {selectedItem.animal.name}'s {roundType === 'med' ? 'medication has' : `${shift} care has`} already been signed off for today.
          </p>
        </section>

        <button type="button" className="roundPrimary" onClick={() => setPage('round-kennels')}>Back to Board</button>
      </main>
    );
  }

  return (
    <main className="roundsScreen small">
      <div className="roundsTop">
        <button type="button" className="roundsClose" onClick={() => setPage('round-kennels')}><X size={20}/></button>
        <h1>{roundType === 'med' ? 'Medication Round' : `${shift} Care Round`}</h1>
        <span/>
      </div>

      <ProgressBar current={completed + 1} total={total || items.length}/>
      <AnimalHero animal={item.animal}/>

      <label className="roundInput">
        <span className="roundInputLabel">Kennel</span>
        <input
          value={kennelDraft}
          onChange={e => setKennelDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') saveKennelNumber(); }}
          placeholder="Kennel number"
        />
        {kennelDraft !== (item?.animal?.kennel || '') && (
          <button
            type="button"
            onClick={saveKennelNumber}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#39d353',
              display: 'flex',
              alignItems: 'center',
              padding: '0 4px',
              flexShrink: 0,
            }}
            title="Save kennel"
          >
            <Check size={20} />
          </button>
        )}
      </label>

      {roundType === 'care' ? (
        <>
          <section className="roundCheckGrid">
            <div><CheckCircle2/><span>Cleaned</span></div>
            <div><Droplets/><span>Water</span></div>
            <div><Utensils/><span>Fed</span></div>
          </section>

          <section className="roundInlineMeds">
            <div className="roundInlineMedsHeader">
              <Pill size={16}/>
              <b>{shift} Medications</b>
              <button
                type="button"
                onClick={() => setShowAddMed(!showAddMed)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#d8b4fe',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0 4px',
                  marginLeft: 'auto'
                }}
                title="Add medication"
              >
                <Plus size={18}/>
              </button>
            </div>

            {animalMeds.length === 0 ? (
              <div style={{
                padding: '16px',
                textAlign: 'center',
                color: '#98a5b8',
                fontSize: '14px'
              }}>
                No medications
              </div>
            ) : (
              <>
                {animalMeds.map(med => {
                  const key = `${item.animal.id}:${med.id}`;
                  const done = completedMedKeys.has(key);
                  return (
                    <div key={med.id} className={`roundInlineMedRow ${done ? 'done' : ''}`}>
                      <div className="roundInlineMedInfo">
                        <b>{med.name}</b>
                        <small>{med.dose || 'No dosage'} · {med.schedule}</small>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <button
                          type="button"
                          className={done ? 'roundMedGivenBtn done' : 'roundMedGivenBtn'}
                          onClick={() => {
                            if (done || medBusy === med.id) return;
                            toggleMed(med);
                          }}>
                          {done ? <><CheckCircle2 size={15}/> Given</> : 'Mark Given'}
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteMed(med)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#ff8a8a',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            padding: '0 4px',
                            flexShrink: 0
                          }}
                          title="Delete medication"
                        >
                          <Trash2 size={16}/>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </>
            )}

              {showAddMed && (
                <form onSubmit={submitAddMed} style={{
                  borderTop: '1px solid rgba(148, 163, 184, 0.12)',
                  paddingTop: '10px',
                  marginTop: '10px',
                  display: 'grid',
                  gap: '10px'
                }}>
                  <input
                    type="text"
                    value={addMedForm.medication_name}
                    onChange={e => setAddMedForm({...addMedForm, medication_name: e.target.value})}
                    placeholder="Medication name"
                    required
                    style={{
                      width: '100%',
                      minHeight: '42px',
                      border: '1px solid rgba(148, 163, 184, 0.18)',
                      borderRadius: '12px',
                      background: 'rgba(15, 23, 42, 0.96)',
                      color: '#f8fafc',
                      padding: '0 12px',
                      fontSize: '14px'
                    }}
                  />
                  <input
                    type="text"
                    value={addMedForm.dosage_notes}
                    onChange={e => setAddMedForm({...addMedForm, dosage_notes: e.target.value})}
                    placeholder="Dosage (optional)"
                    style={{
                      width: '100%',
                      minHeight: '42px',
                      border: '1px solid rgba(148, 163, 184, 0.18)',
                      borderRadius: '12px',
                      background: 'rgba(15, 23, 42, 0.96)',
                      color: '#f8fafc',
                      padding: '0 12px',
                      fontSize: '14px'
                    }}
                  />
                  <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px'}}>
                    <button
                      type="submit"
                      disabled={addMedBusy}
                      style={{
                        minHeight: '42px',
                        border: 'none',
                        borderRadius: '12px',
                        background: 'linear-gradient(135deg, #39d353, #2ea043)',
                        color: 'white',
                        fontWeight: '900',
                        cursor: addMedBusy ? 'wait' : 'pointer'
                      }}
                    >
                      Add Med
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAddMed(false)}
                      style={{
                        minHeight: '42px',
                        border: '1px solid rgba(148, 163, 184, 0.18)',
                        borderRadius: '12px',
                        background: 'transparent',
                        color: '#98a5b8',
                        fontWeight: '900',
                        cursor: 'pointer'
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </section>
        </>
      ) : (
        <section className="roundMedicationCard">
          <div><h2>{item.med.name}</h2><p>{item.med.dose || 'No dosage instructions'}</p><small>{item.med.schedule || 'No schedule'}</small></div>
          <em>DUE NOW</em>
        </section>
      )}

      <label className="roundInput"><ClipboardList size={17}/><input value={note} onChange={e => setNote(e.target.value)} placeholder="Add note (optional)"/></label>
      <label className="roundInput" style={{ flexWrap: 'wrap', alignItems: 'flex-start', paddingTop: 10, paddingBottom: 10 }}>
        <CheckCircle2 size={17}/>
        <EmployeePillPicker value={signedBy} onChange={setSignedBy} />
      </label>

      {roundType === 'med' ? (
        <div className="roundTwoButtons">
          <button type="button" className="roundSecondary" onClick={skip}>Not Given</button>
          <button type="button" className="roundPrimary blue" disabled={busy} onClick={completeAndNext}>Given</button>
        </div>
      ) : (
        <button type="button" className="roundPrimary" disabled={busy} onClick={completeAndNext}>Complete & Next</button>
      )}

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
