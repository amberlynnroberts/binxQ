import React, { useState } from 'react';
import { ArrowLeft, Edit3, Save, Trash2 } from 'lucide-react';
import { addNote, removeFromQuarantine, symptomOptions, toggleSymptom } from '../lib/api';
import { PhotoUploader } from '../components/AnimalPhoto';
import { MedicationManager } from '../components/MedicationManager';
import { formatAge } from '../lib/formatAge';
import { getDisplayLocation, getDisplayKennel } from '../lib/displayAnimal';

export function AnimalCard({ animal, data, back, reload, edit }) {
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const meds = data.meds.filter(m => m.animalId === animal.id);
  const notes = data.notes.filter(n => n.animalId === animal.id);
console.log(getDisplayLocation(animal.shelterluv_status));
  async function saveNote() {
    if (!note.trim()) return;
    setBusy(true);
    try {
      await addNote(animal.id, note.trim(), 'You');
      setNote('');
      await reload();
    } finally {
      setBusy(false);
    }
  }

  async function toggle(s) {
    setBusy(true);
    try {
      await toggleSymptom(animal.id, s, animal.symptoms.includes(s));
      await reload();
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    const reason = window.prompt('Removal reason? cleared, foster, adopted, transferred, mistake', 'cleared');
    if (!reason) return;
    if (!window.confirm(`Remove ${animal.name} from quarantine?`)) return;
    setBusy(true);
    try {
      await removeFromQuarantine(animal.id, reason);
      await reload();
      back();
    } finally {
      setBusy(false);
    }
  }

  return (
    <main>
      <div style={{padding: '10px'}} className="title">
        <button className="icon" onClick={back}><ArrowLeft/></button>
        <h1>{getDisplayLocation(animal)}</h1>
        <button className="link" onClick={edit}><Edit3 size={16}/> Edit</button>
      </div>

      <section className="animal">
        <div className="photo">{animal.photo?.startsWith('http') ? <img className="photoThumb largeThumb" src={animal.photo} alt={animal.name}/> : animal.photo}</div>
        <div>
          <h1>{animal.name}</h1>
          <p>{animal.desc} • {animal.sex} • {formatAge(animal.age)}</p>
          <b className="badge red">{animal.status}</b>
          <p><b>Intake:</b> {animal.intake || 'Unknown'}</p>
        </div>
      </section>

      <PhotoUploader animal={animal} reload={reload}/>

      {/* <section className="panel">
        <h2>Symptoms</h2>
        <div className="checks">
          {symptomOptions.map(s => (
            <label className="check" key={s}>
              <input type="checkbox" checked={animal.symptoms.includes(s)} onChange={() => toggle(s)} disabled={busy}/>
              {s}
            </label>
          ))}
        </div>
      </section> */}

      <section className="panel pink">
        <h2>Meds</h2>
        <MedicationManager animal={animal} reload={reload} />
      </section>

      <section className="panel">
        <h2>Notes</h2>
        <div className="noteadd">
          <input value={note} onChange={e => setNote(e.target.value)} placeholder="Add note..." />
          <button className="primary" onClick={saveNote} disabled={busy}><Save size={16}/> Save</button>
        </div>
        {notes.map(n => <div className="note" key={n.id}><b>{n.by} · {n.at}</b><p>{n.text}</p></div>)}
      </section>

      <button className="danger full" onClick={remove} disabled={busy}><Trash2 size={16}/> Remove from Quarantine</button>
    </main>
  );
}
