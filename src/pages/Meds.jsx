import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ChevronRight, CheckCircle2, Circle } from 'lucide-react';
import { Empty, kennelShort } from '../components/ui';
import { fetchDailyCareSignoffs, todayDateString } from '../lib/dailyCareApi';
import { isQuarantineAnimal, isInRescueAnimal, isFosterAnimal } from '../lib/animalFilters';

export function Meds({ data, allAnimals, select }) {
  const [signoffsAM, setSignoffsAM] = useState({ cleaning: [], medication: [] });
  const [signoffsPM, setSignoffsPM] = useState({ cleaning: [], medication: [] });

  // PERFORMANCE FIX: previously fetched its own full animal list on every
  // mount — a duplicate of the app-wide fetch App.jsx already does. Now
  // that api.js always returns every animal in that one shared fetch,
  // App.jsx passes the raw complete list down as `allAnimals` (separate
  // from `data.animals`, which is filtered by whichever tab is currently
  // selected elsewhere) — no separate fetch needed here at all.
  const animalsToCheck = allAnimals || data?.animals || [];

  useEffect(() => {
    const careDate = todayDateString();
    Promise.all([
      fetchDailyCareSignoffs({ careDate, shift: 'AM' }),
      fetchDailyCareSignoffs({ careDate, shift: 'PM' }),
    ])
      .then(([am, pm]) => {
        setSignoffsAM(am);
        setSignoffsPM(pm);
      })
      .catch(console.error);
  }, [data.meds.length]);

  const givenMap = useMemo(() => {
    const map = new Map();
    for (const row of signoffsAM.medication || []) {
      map.set(`${row.animal_id}:${row.medication_id}:AM`, row);
    }
    for (const row of signoffsPM.medication || []) {
      map.set(`${row.animal_id}:${row.medication_id}:PM`, row);
    }
    return map;
  }, [signoffsAM, signoffsPM]);

  function statusForMed(m) {
    const schedule = String(m.schedule || '').toUpperCase();
    const checkAM = schedule.includes('AM') || schedule.includes('BID') || schedule === '';
    const checkPM = schedule.includes('PM') || schedule.includes('BID');

    const amGiven = checkAM ? givenMap.has(`${m.animalId}:${m.id}:AM`) : null;
    const pmGiven = checkPM ? givenMap.has(`${m.animalId}:${m.id}:PM`) : null;

    return { amGiven, pmGiven, checkAM, checkPM };
  }

  // Only Quarantine and Cat Lounge animals belong on this page — a cat
  // that's moved to Foster (or anywhere else) should no longer show up
  // here just because they still have an active medication record.
  //
  // FIXED: isQuarantineAnimal() returns true for ANY animal that still has
  // a kennel number assigned locally, regardless of their actual current
  // status — and a cat moved to Foster keeps that stale kennel_number
  // unless their Shelterluv status becomes archived (adopted, deceased,
  // etc.), which foster isn't. That let foster cats with old medication
  // records (e.g. Serafina, George) leak back onto this page. Explicitly
  // excluding isFosterAnimal here closes that gap, matching the same fix
  // applied to RoundKennels.jsx.
  function isRelevantAnimal(animal) {
    if (isFosterAnimal(animal)) return false;
    return isQuarantineAnimal(animal) || isInRescueAnimal(animal);
  }

  return (
    <main>
      <div className="roundsTop">
        <button type="button" className="roundsClose" onClick={() => window.history.back()}>
          <ArrowLeft size={20}/>
        </button>
        <h1>Medications</h1>
        <span/>
      </div>
      <h1>All Medications</h1>
      <div className="list">
        {data.meds.length === 0 && <Empty text="No medications for this view." />}
        {data.meds.map(m => {
          const a = animalsToCheck.find(x => x.id === m.animalId);
          if (!a) return null;
          if (!isRelevantAnimal(a)) return null;

          const { amGiven, pmGiven, checkAM, checkPM } = statusForMed(m);

          return (
            <button className="row" key={m.id} onClick={() => select(a.id)}>
              <span className="badge red">{m.schedule}</span>
              <span className="kennel">{kennelShort(a.kennel)}</span>
              <span><b>{a.name}</b><small>{m.name} ({m.dose})</small></span>

              <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                {checkAM && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 2, fontSize: 11, color: amGiven ? '#39d353' : '#98a5b8' }}>
                    {amGiven ? <CheckCircle2 size={14} /> : <Circle size={14} />} AM
                  </span>
                )}
                {checkPM && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 2, fontSize: 11, color: pmGiven ? '#39d353' : '#98a5b8' }}>
                    {pmGiven ? <CheckCircle2 size={14} /> : <Circle size={14} />} PM
                  </span>
                )}
              </span>

              <ChevronRight/>
            </button>
          );
        })}
      </div>
    </main>
  );
}
