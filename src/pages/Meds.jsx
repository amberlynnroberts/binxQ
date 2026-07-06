import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ChevronRight, CheckCircle2, Circle } from 'lucide-react';
import { Empty, kennelShort } from '../components/ui';
import { fetchDailyCareSignoffs, todayDateString } from '../lib/dailyCareApi';
import { fetchKennelCheckData } from '../lib/api';

export function Meds({ data, select }) {
  const [signoffsAM, setSignoffsAM] = useState({ cleaning: [], medication: [] });
  const [signoffsPM, setSignoffsPM] = useState({ cleaning: [], medication: [] });

  // FIXED: previously used `data.animals`, which is already filtered down to
  // whatever view chip (Quarantine/Rescue/Archived) happened to be selected
  // on the Kennels page. `data.meds` itself is NOT filtered by that chip —
  // so a medication for a Cat Lounge animal (like Hart) would exist in
  // data.meds but silently get dropped here because the animal lookup
  // against the filtered data.animals would fail. This page now fetches its
  // own full animal list (all non-deceased animals) so a medication shows
  // up here regardless of which filter chip is active elsewhere in the app.
  const [allAnimals, setAllAnimals] = useState(data?.animals || []);

  useEffect(() => {
    fetchKennelCheckData({ includeRemoved: true })
      .then(result => setAllAnimals(result.animals || []))
      .catch(console.error);
  }, []);

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

  console.log('MEDS DEBUG total data.meds:', data.meds.length);
  console.log('MEDS DEBUG Hart med in data.meds?', data.meds.find(m => m.animalId === 'b5ca4d99-3092-45fd-bbb0-4b40eef4076c'));
  console.log('MEDS DEBUG total allAnimals:', allAnimals.length);
  console.log('MEDS DEBUG Hart in allAnimals?', allAnimals.find(a => a.id === 'b5ca4d99-3092-45fd-bbb0-4b40eef4076c'));

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
          const a = allAnimals.find(x => x.id === m.animalId);
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
