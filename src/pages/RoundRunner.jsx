import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, ClipboardList, Droplets, Pill, Utensils, X, Check } from 'lucide-react';
import {buildCareRoundItems, buildMedicationRoundItems, completeCareRoundItem, completeMedicationRoundItem, loadRoundSignoffs} from '../lib/roundsApi';
import { todayDateString } from '../lib/dailyCareApi';
import { updateAnimalKennelNumber } from '../lib/kennelUpdateApi';
import { signOffQuarantinePaper } from '../lib/reportsApi';
import { formatAge } from '../lib/formatAge';
import { medNeededForShift } from '../lib/medUtils';
import { signOffMedication } from '../lib/dailyCareApi';

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
  const [signedBy, setSignedBy] = useState(() => localStorage.getItem('kennelcheck_signed_by') || '');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [skipped, setSkipped] = useState(0);
  const [kennelDraft, setKennelDraft] = useState('');
  const [medBusy, setMedBusy] = useState('');

  const animals = data?.animals || [];
  const meds = data?.meds || [];

  async function load() {
    const rows = await loadRoundSignoffs(shift, todayDateString());
    console.log('loaded signoffs:', rows.medication);
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

  function saveName() {
    const name = signedBy.trim();
    if (!name) return false;
    localStorage.setItem('kennelcheck_signed_by', name);
    return true;
  }

  useEffect(() => {
    setKennelDraft(item?.animal?.kennel || '');
  }, [item?.animal?.id]);

  async function toggleMed(med) {
    console.log('toggleMed called', { signedBy, medId: med.id, animalId: item.animal.id });
    if (!saveName()) {
      console.log('saveName failed - no initials');
      return;
    }
    const key = `${item.animal.id}:${med.id}`;
    const alreadyDone = completedMedKeys.has(key);
    console.log('alreadyDone:', alreadyDone, 'key:', key);
    try {
      setMedBusy(med.id);
      if (!alreadyDone) {
        const result = await signOffMedication({
          animalId: item.animal.id,
          medicationId: med.id,
          shift,
          careDate: todayDateString(),
          givenBy: signedBy,
          notes: note || ''
        });
        console.log('signOffMedication result:', result);
      }
      await load();
    } catch (err) {
      console.error('toggleMed error:', err);
    } finally {
      setMedBusy('');
    }
  }

  async function completeAndNext() {
    if (!item || !saveName()) return;
    try {
      setBusy(true);
      if (roundType === 'med') await completeMedicationRoundItem({ item, givenBy: signedBy, notes: note });
      else await completeCareRoundItem({ item, signedBy, notes: note });
      setNote('');
      await load();
      await reload?.();
      setPage('round-kennels');
    } finally {
      setBusy(false);
    }
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

  return (
    <main className="roundsScreen small">
      <div className="roundsTop">
      <button type="button" className="roundsClose" onClick={() => setPage('round-kennels')}><X size={20}/></button>        <h1>{roundType === 'med' ? 'Medication Round' : `${shift} Care Round`}</h1>
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

          {animalMeds.length > 0 && (
            <section className="roundInlineMeds">
              <div className="roundInlineMedsHeader">
                <Pill size={16}/>
                <b>{shift} Medications</b>
              </div>

              {animalMeds.map(med => {
                const key = `${item.animal.id}:${med.id}`;
                const done = completedMedKeys.has(key);
                console.log('med row:', med.name, 'key:', key, 'done:', done, 'completedMedKeys:', [...completedMedKeys]);
                return (
                  <div key={med.id} className={`roundInlineMedRow ${done ? 'done' : ''}`}>
                    <div className="roundInlineMedInfo">
                      <b>{med.name}</b>
                      <small>{med.dose || 'No dosage'} · {med.schedule}</small>
                    </div>
                    <button
                      type="button"
                      className={done ? 'roundMedGivenBtn done' : 'roundMedGivenBtn'}
                      onClick={() => {
                        if (done || medBusy === med.id) return;
                        toggleMed(med);
                      }}>
                      {done ? <><CheckCircle2 size={15}/> Given</> : 'Mark Given'}
                    </button>
                  </div>
                );
              })}
            </section>
          )}
        </>
      ) : (
        <section className="roundMedicationCard">
          <div><h2>{item.med.name}</h2><p>{item.med.dose || 'No dosage instructions'}</p><small>{item.med.schedule || 'No schedule'}</small></div>
          <em>DUE NOW</em>
        </section>
      )}

      <label className="roundInput"><ClipboardList size={17}/><input value={note} onChange={e => setNote(e.target.value)} placeholder="Add note (optional)"/></label>
      <label className="roundInput"><CheckCircle2 size={17}/><input value={signedBy} onChange={e => setSignedBy(e.target.value)} placeholder="Your initials"/></label>

      {roundType === 'med' ? (
        <div className="roundTwoButtons">
          <button type="button" className="roundSecondary" onClick={skip}>Not Given</button>
          <button type="button" className="roundPrimary blue" disabled={busy} onClick={completeAndNext}>Given</button>
        </div>
      ) : (
        <button type="button" className="roundPrimary" disabled={busy} onClick={completeAndNext}>Complete & Next</button>
      )}
    </main>
  );
}