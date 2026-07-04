import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ChevronRight, CheckCircle2, Circle } from 'lucide-react';
import { Empty, kennelShort } from '../components/ui';
import { fetchDailyCareSignoffs, todayDateString } from '../lib/dailyCareApi';

export function Meds({ data, select }) {
  const [signoffsAM, setSignoffsAM] = useState({ cleaning: [], medication: [] });
  const [signoffsPM, setSignoffsPM] = useState({ cleaning: [], medication: [] });

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

  // Build a lookup of "given" status keyed by animalId:medicationId:shift,
  // so every medication row can show its own given/not-given state without
  // hiding anything — this page is meant to be a full reference list, not
  // a checklist that disappears items as they're completed (that's what
  // the Medication Round flow is for).
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
    // A med's `schedule` might be 'AM', 'PM', 'BID' (both), or something
    // else — check whichever shifts actually apply to this med.
    const schedule = String(m.schedule || '').toUpperCase();
    const checkAM = schedule.includes('AM') || schedule.includes('BID') || schedule === '';
    const checkPM = schedule.includes('PM') || schedule.includes('BID');

    const amGiven = checkAM ? givenMap.has(`${m.animalId}:${m.id}:AM`) : null;
    const pmGiven = checkPM ? givenMap.has(`${m.animalId}:${m.id}:PM`) : null;

    return { amGiven, pmGiven, checkAM, checkPM };
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
          const a = data.animals.find(x => x.id === m.animalId);
          if (!a) return null;

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
