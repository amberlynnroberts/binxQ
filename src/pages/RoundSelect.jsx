import React from 'react';
import { ClipboardCheck, ChevronRight, Pill, Stethoscope, X } from 'lucide-react';
export function RoundSelect({ data, setPage, startRound }) {
  const animals = data?.animals || [];
  const meds = (data?.meds || []).filter(m => m.active);

  return (
    <main className="roundsScreen small">
      <div className="roundsTop">
        <button type="button" className="roundsClose" onClick={() => setPage('dashboard')}><X size={20}/></button>
        <h1>Select Round</h1>
        <span/>
      </div>

      <section className="roundStartList">
        <button type="button" className="roundChoice green" onClick={() => startRound('care', 'AM')}>
          <span className="roundChoiceIcon"><ClipboardCheck size={30}/></span>
          <span><b>AM Care Round</b><small>Cleaning, Feeding, Water</small><small>{animals.length} cats</small></span>
          <ChevronRight/>
        </button>

        <button type="button" className="roundChoice blue" onClick={() => startRound('care', 'PM')}>
          <span className="roundChoiceIcon"><ClipboardCheck size={30}/></span>
          <span><b>PM Care Round</b><small>Cleaning, Feeding, Water</small><small>{animals.length} cats</small></span>
          <ChevronRight/>
        </button>

        <button type="button" className="roundChoice purple" onClick={() => startRound('med', 'AM')}>
          <span className="roundChoiceIcon"><Pill size={30}/></span>
          <span><b>Medication Round</b><small>{meds.length} medications due</small><small>{new Set(meds.map(m => m.animalId)).size} cats</small></span>
          <ChevronRight/>
        </button>
      </section>

      <section className="roundInfoCard">
        <h2>What’s included?</h2>
        <ul>
          <li>Clean kennel</li>
          <li>Replace water</li>
          <li>Feed meals</li>
          <li>Confirm meds when needed</li>
        </ul>
      </section>

      <section className="roundTip">
        <Stethoscope size={20}/>
        <span>Everything is saved automatically when you tap Complete.</span>
      </section>
    </main>
  );
}
