import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, CheckCircle2, ChevronRight, Circle, ClipboardCheck, Pill, Search } from 'lucide-react';
import { AnimalThumb } from '../components/AnimalPhoto';
import { fetchDailyCareSignoffs } from '../lib/dailyCareApi';
import { todayDateString } from '../lib/careTaskRules';
import { isQuarantineAnimal, isInRescueAnimal, isArchivedAnimal, isFosterAnimal, isExplicitlyMovedToQuarantine } from '../lib/animalFilters';
import { getCompletedIdsFromSignoffs, getCompletedMedicationKeys, getKennelProgress, groupAnimalsByKennel } from '../lib/roundBoardUtils';
import { getKennelColorClass } from '../lib/kennelColors';
import { kennelShort } from '../components/ui';
import { formatAge } from '../lib/formatAge';
import { medNeededForShift } from '../lib/medUtils';

function ProgressPill({ progress }) {
  if (progress.done) {
    return (
      <span className="roundBoardDone">
        <CheckCircle2 size={16}/>
        Done
      </span>
    );
  }
  return <span className="roundBoardPercent">{progress.percent}% complete</span>;
}

function CatStatusBadge({ done, roundType }) {
  if (done) {
    return (
      <span className="catDoneBadge">
        <CheckCircle2 size={15}/>
        Done
      </span>
    );
  }
  return (
    <span className={roundType === 'med' ? 'catDueBadge blue' : 'catDueBadge'}>
      {roundType === 'med' ? 'Med due' : 'Needs care'}
    </span>
  );
}

// Per-shift medication pill — shown separately for AM and PM whenever a
// cat has a medication needing that shift. Clickable (and only clickable)
// when that shift isn't done yet, so tapping it opens the sign-off screen
// scoped to that specific shift. Once both shifts are done, the parent
// renders a single combined "Done" badge instead of these.
function MedShiftPill({ shiftLabel, done, onClick }) {
  return (
    <button
      type="button"
      onClick={e => {
        e.stopPropagation();
        if (!done) onClick();
      }}
      disabled={done}
      title={done ? `${shiftLabel} given` : `Mark ${shiftLabel} given`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '3px 8px',
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 700,
        border: '1px solid',
        borderColor: done ? 'rgba(57, 211, 83, 0.35)' : 'rgba(59, 130, 246, 0.35)',
        background: done ? 'rgba(57, 211, 83, 0.12)' : 'rgba(59, 130, 246, 0.12)',
        color: done ? '#39d353' : '#3b82f6',
        cursor: done ? 'default' : 'pointer',
        lineHeight: 1,
      }}
    >
      {done ? <CheckCircle2 size={13}/> : <Circle size={13}/>}
      {shiftLabel} {done ? 'Done' : 'Med Due'}
    </button>
  );
}

// Small colored dot overlaid on the bottom-right corner of the kennel
// number badge — green when the cat's round/meds are done for this shift,
// otherwise a neutral/blue dot to indicate still pending.
function KennelBadgeWithStatus({ kennel, done }) {
  return (
    <span style={{ position: 'relative', display: 'inline-flex', flexShrink: 0 }}>
      <span className={`kennel ${getKennelColorClass(kennel)}`}>
        {kennelShort(kennel)}
      </span>
      <span
        style={{
          position: 'absolute',
          bottom: -2,
          right: -2,
          width: 11,
          height: 11,
          borderRadius: '50%',
          background: done ? '#39d353' : '#3b82f6',
          border: '2px solid var(--round-bg, #0f172a)',
        }}
        title={done ? 'Done' : 'Pending'}
      />
    </span>
  );
}

export function RoundKennels({
  data,
  roundType = 'care',
  shift = 'AM',
  setPage,
  setSelectedRoundAnimal,
  setSelectedRoundMedication,
  // NEW — must be wired up in App.jsx alongside setSelectedRoundAnimal /
  // setSelectedRoundMedication, so RoundRunner opens on the shift the user
  // actually tapped (AM or PM), rather than whatever shift the round was
  // originally launched with.
  setSelectedRoundShift
}) {
  const [signoffs, setSignoffs] = useState({ cleaning: [], medication: [] });

  // Medication "done" needs to reflect the whole day, not just a single
  // launched shift — a BID (AM+PM) medication isn't done until BOTH doses
  // are signed off, and the board needs to show AM/PM status independently
  // regardless of which shift the round was started with.
  const [signoffsAM, setSignoffsAM] = useState({ cleaning: [], medication: [] });
  const [signoffsPM, setSignoffsPM] = useState({ cleaning: [], medication: [] });

  const [query, setQuery] = useState('');

  const animals = useMemo(() => {
    return (data?.animals || []).filter(a =>
      isExplicitlyMovedToQuarantine(a) ||
      (isQuarantineAnimal(a) && !isArchivedAnimal(a) && !isFosterAnimal(a))
    );
  }, [data]);

  const meds = data?.meds || [];

  useEffect(() => {
    fetchDailyCareSignoffs({ careDate: todayDateString(), shift })
      .then(rows => setSignoffs(rows))
      .catch(console.error);
  }, [animals.length, shift]);

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
  }, [animals.length]);

  const completedCareIds = useMemo(() => {
    return getCompletedIdsFromSignoffs(signoffs.cleaning || [], shift);
  }, [signoffs, shift]);

  const completedMedKeysAM = useMemo(() => {
    return getCompletedMedicationKeys(signoffsAM.medication || [], 'AM');
  }, [signoffsAM]);

  const completedMedKeysPM = useMemo(() => {
    return getCompletedMedicationKeys(signoffsPM.medication || [], 'PM');
  }, [signoffsPM]);

  function isKeyDone(shiftName, animalId, medId) {
    const keys = shiftName === 'AM' ? completedMedKeysAM : completedMedKeysPM;
    return keys.has(`${animalId}:${medId}`);
  }

  // For the med round, meds are grouped regardless of the launched `shift`
  // prop — the board now shows AM/PM status per cat independently, rather
  // than only ever showing whichever meds matched the single shift the
  // round happened to be started with.
  const medByAnimal = useMemo(() => {
    const map = new Map();
    for (const med of meds.filter(m => m.active)) {
      const list = map.get(med.animalId) || [];
      list.push(med);
      map.set(med.animalId, list);
    }
    return map;
  }, [meds]);

  // Per-cat AM/PM medication status, built from the full-day signoff data.
  function getMedShiftStatus(animal) {
    const medsForAnimal = medByAnimal.get(animal.id) || [];
    const amMeds = medsForAnimal.filter(m => medNeededForShift(m, 'AM'));
    const pmMeds = medsForAnimal.filter(m => medNeededForShift(m, 'PM'));

    const amNeeded = amMeds.length > 0;
    const pmNeeded = pmMeds.length > 0;
    const amDone = amNeeded && amMeds.every(m => isKeyDone('AM', animal.id, m.id));
    const pmDone = pmNeeded && pmMeds.every(m => isKeyDone('PM', animal.id, m.id));

    const fullyDone = (amNeeded || pmNeeded) && (!amNeeded || amDone) && (!pmNeeded || pmDone);

    return { amMeds, pmMeds, amNeeded, pmNeeded, amDone, pmDone, fullyDone };
  }

  function isCatDone(animal) {
    if (roundType === 'med') {
      return getMedShiftStatus(animal).fullyDone;
    }
    return completedCareIds.has(animal.id);
  }

  const loungeAnimals = useMemo(() => {
    if (roundType !== 'med') return [];
    // FIXED: previously just checked "not quarantine", which swept ANY
    // non-quarantine animal with active meds into this section — including
    // Foster cats, who have nothing to do with the actual Cat Lounge.
    // This now explicitly checks isInRescueAnimal so only genuine lounge
    // cats show up here.
    return (data?.animals || []).filter(a =>
      isInRescueAnimal(a) &&
      !isArchivedAnimal(a) &&
      (medByAnimal.get(a.id) || []).length > 0
    );
  }, [data, roundType, medByAnimal]);

  const visibleAnimals = useMemo(() => {
    let list = animals;

    if (roundType === 'med') {
      // Any quarantine cat with active meds stays visible, done or not —
      // status is shown via the kennel badge dot / AM-PM pills rather than
      // the cat disappearing once finished.
      list = list.filter(animal => (medByAnimal.get(animal.id) || []).length > 0);
    }

    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(animal =>
        `${animal.name} ${animal.kennel} ${animal.shelterluv_status} ${animal.status}`
          .toLowerCase()
          .includes(q)
      );
    }

    return list;
  }, [animals, roundType, medByAnimal, query]);

  // Kept for the overall progress pill at the top of the quarantine section,
  // even though cats now render as one flat list rather than grouped
  // sub-sections per kennel.
  const kennelGroups = useMemo(() => {
    return groupAnimalsByKennel(visibleAnimals);
  }, [visibleAnimals]);

  const sortedVisibleAnimals = useMemo(() => {
    return [...visibleAnimals].sort((a, b) => {
      const an = Number(String(a.kennel || '').replace(/\D/g, '')) || 999;
      const bn = Number(String(b.kennel || '').replace(/\D/g, '')) || 999;
      return an - bn;
    });
  }, [visibleAnimals]);

  // targetShift is optional — when a specific AM/PM pill is tapped we know
  // exactly which shift to open; otherwise (tapping the rest of the card)
  // default to whichever shift still needs action, AM first.
  function openCat(animal, targetShift) {
    const medsForAnimal = medByAnimal.get(animal.id) || [];

    let shiftToUse = targetShift;
    if (!shiftToUse) {
      const status = getMedShiftStatus(animal);
      shiftToUse = (status.amNeeded && !status.amDone) ? 'AM'
        : (status.pmNeeded && !status.pmDone) ? 'PM'
        : 'AM';
    }

    const medsForShift = medsForAnimal.filter(m => medNeededForShift(m, shiftToUse));
    const nextMed = medsForShift.find(m => !isKeyDone(shiftToUse, animal.id, m.id)) || medsForShift[0];

    setSelectedRoundAnimal?.(animal.id);
    setSelectedRoundMedication?.(roundType === 'med' ? (nextMed?.id || null) : null);
    if (roundType === 'med') {
      setSelectedRoundShift?.(shiftToUse);
    }
    setPage('round-runner');
  }

  function getProgressForCats(cats) {
    // Cats with no kennel number assigned ('?') are excluded from the
    // percentage math specifically — they still show up in the card list
    // itself, just don't count toward "X of Y complete" since they aren't
    // tied to a trackable room/kennel for cleaning purposes yet.
    const countedCats = cats.filter(cat => cat.kennel && cat.kennel !== '?');

    if (roundType === 'med') {
      const medCatsDone = new Set();
      for (const cat of countedCats) {
        if (getMedShiftStatus(cat).fullyDone) {
          medCatsDone.add(cat.id);
        }
      }
      return getKennelProgress({ cats: countedCats, completedAnimalIds: medCatsDone });
    }
    return getKennelProgress({ cats: countedCats, completedAnimalIds: completedCareIds });
  }

  const title = roundType === 'med' ? 'Medication Round' : `${shift} Care Round`;
  const overallProgress = getProgressForCats(visibleAnimals);

  function MedCatBadges({ cat }) {
    const status = getMedShiftStatus(cat);
    if (status.fullyDone) {
      return <CatStatusBadge done roundType={roundType} />;
    }
    return (
      <span style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {status.amNeeded && (
          <MedShiftPill shiftLabel="AM" done={status.amDone} onClick={() => openCat(cat, 'AM')} />
        )}
        {status.pmNeeded && (
          <MedShiftPill shiftLabel="PM" done={status.pmDone} onClick={() => openCat(cat, 'PM')} />
        )}
      </span>
    );
  }

  return (
    <main className="roundBoardScreen">
      <div className="roundsTop">
        <button type="button" className="roundsClose" onClick={() => setPage('dashboard')}>
          <ArrowLeft size={20}/>
        </button>
        <h1>{title}</h1>
        <span/>
      </div>

      <section className={roundType === 'med' ? 'roundBoardHero blue' : 'roundBoardHero'}>
        <div>
          <p>{roundType === 'med' ? 'Select a cat for meds' : 'Select a cat to sign off'}</p>
          <h2>{roundType === 'med' ? 'All quarantine cats' : 'Grouped by kennel'}</h2>
          <small>Tap a cat card to open the sign-off screen.</small>
        </div>
        {roundType === 'med' ? <Pill size={34}/> : <ClipboardCheck size={34}/>}
      </section>

      <label className="roundBoardSearch">
        <Search size={17}/>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search cats or kennels..."
        />
      </label>

      {(roundType === 'med' ? sortedVisibleAnimals.length === 0 : kennelGroups.every(({ cats }) => cats.length === 0)) && loungeAnimals.length === 0 ? (
        <section className="roundBoardEmpty">
          <CheckCircle2 size={34}/>
          <h2>Nothing due</h2>
          <p>{roundType === 'med' ? 'No medications are due right now.' : 'No cats match this round.'}</p>
        </section>
      ) : (
        <div className="roundKennelGroups">

          {/* Cat Lounge section stays separate at the top, since those cats
              aren't tied to a kennel number */}
          {roundType === 'med' && loungeAnimals.length > 0 && (
            <section className="roundKennelSection" key="lounge">
              <div className="roundKennelHeader">
                <span className="kennel blue">🏠</span>
                <div>
                  <h2>Cat Lounge</h2>
                  <small>
                    {loungeAnimals.filter(a => isCatDone(a)).length} of {loungeAnimals.length} complete
                  </small>
                </div>
                <ProgressPill progress={getProgressForCats(loungeAnimals)} />
              </div>

              <div className="roundKennelCards">
                {loungeAnimals.map(cat => {
                  const activeMeds = medByAnimal.get(cat.id) || [];
                  return (
                    <div
                      key={cat.id}
                      className={`roundCatCard ${isCatDone(cat) ? 'done' : ''}`}
                      role="button"
                      tabIndex={0}
                      onClick={() => openCat(cat)}
                    >
                      <AnimalThumb animal={cat}/>
                      <span className="roundCatInfo">
                        <b>{cat.name}</b>
                        <small>{cat.shelterluv_status || 'Cat Lounge'}</small>
                        <small>{activeMeds.length} active med{activeMeds.length === 1 ? '' : 's'}</small>
                        <MedCatBadges cat={cat} />
                      </span>
                      <ChevronRight size={18}/>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Medication Round: flat list of all quarantine cats with meds,
              sorted by kennel number, status shown via the kennel badge dot
              plus separate AM/PM pills. Care Round: grouped back into
              per-kennel sections, as before. */}
          {roundType === 'med' ? (
            sortedVisibleAnimals.length > 0 && (
              <section className="roundKennelSection" key="quarantine-flat">
                <div className="roundKennelHeader">
                  <span className="kennel">Q</span>
                  <div>
                    <h2>Quarantine</h2>
                    <small>{overallProgress.completed} of {overallProgress.total} complete</small>
                  </div>
                  <ProgressPill progress={overallProgress}/>
                </div>

                <div className="roundKennelCards">
                  {sortedVisibleAnimals.map(cat => {
                    const done = isCatDone(cat);
                    const activeMeds = medByAnimal.get(cat.id) || [];
                    return (
                      <div
                        key={cat.id}
                        className={`roundCatCard ${done ? 'done' : ''}`}
                        role="button"
                        tabIndex={0}
                        onClick={() => openCat(cat)}
                      >
                        <KennelBadgeWithStatus kennel={cat.kennel} done={done} />
                        <AnimalThumb animal={cat}/>
                        <span className="roundCatInfo">
                          <b>{cat.name}</b>
                          <small>{cat.sex || 'Unknown'} · {formatAge(cat.age)}</small>
                          <small>
                            {activeMeds.length} active med{activeMeds.length === 1 ? '' : 's'}
                          </small>
                          <MedCatBadges cat={cat} />
                        </span>
                        <ChevronRight size={18}/>
                      </div>
                    );
                  })}
                </div>
              </section>
            )
          ) : (
            kennelGroups.filter(({ kennel, cats }) => cats.length > 0 && kennel !== '?').map(({ kennel, cats }) => {
              const progress = getProgressForCats(cats);
              return (
                <section className="roundKennelSection" key={kennel}>
                  <div className="roundKennelHeader">
                    <span className={`kennel ${getKennelColorClass(kennel)}`}>
                      {kennelShort(kennel)}
                    </span>
                    <div>
                      <h2>{kennel}</h2>
                      <small>{progress.completed} of {progress.total} complete</small>
                    </div>
                    <ProgressPill progress={progress}/>
                  </div>

                  <div className="roundKennelCards">
                    {cats.length === 0 && (
                      <div className="emptyKennelCard">
                        <b>Empty</b>
                        <small>No cats assigned</small>
                      </div>
                    )}
                    {cats.map(cat => {
                      const done = isCatDone(cat);
                      return (
                        <button
                          type="button"
                          key={cat.id}
                          className={`roundCatCard ${done ? 'done' : ''}`}
                          onClick={() => openCat(cat)}
                        >
                          <AnimalThumb animal={cat}/>
                          <span className="roundCatInfo">
                            <b>{cat.name}</b>
                            <small>{cat.sex || 'Unknown'} · {formatAge(cat.age)}</small>
                            <CatStatusBadge done={done} roundType={roundType}/>
                          </span>
                          <ChevronRight size={18}/>
                        </button>
                      );
                    })}
                  </div>
                </section>
              );
            })
          )}
        </div>
      )}
    </main>
  );
}
