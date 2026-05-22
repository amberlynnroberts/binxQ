import React, { useMemo, useState } from 'react';
import { CheckCircle2, ClipboardCheck } from 'lucide-react';
import { signOffQuarantinePaper, todayDateString } from '../lib/reportsApi';

const checklists = {
  AM: [
    'Daily observations of quarantine cats',
    'Check room temp — about 74 degrees',
    'Turn on cat TV',
    'Wipe down inside of each condo with Rescue Cleaner',
    'Replace soiled linens or bedding',
    'Clean litter boxes',
    'Pull old food/water bowls and start dishwasher',
    'Administer meds and initial kennel cards',
    'Wipe all surfaces with Rescue Cleaner',
    'Sweep floors',
    'Mop floors'
  ],
  PM: [
    'Check room temp — about 74 degrees',
    'Turn off cat TV',
    'Replace soiled linens or bedding',
    'Clean litter boxes as needed',
    'Top off food and water bowls',
    'Administer meds and initial kennel cards as needed',
    'Wipe all surfaces with Rescue Cleaner',
    'Sweep floors as needed',
    'Mop floors as needed'
  ]
};

export function QuarantineChecklist({ setPage }) {
  const [shift, setShift] = useState('AM');
  const [checked, setChecked] = useState({});
  const [initials, setInitials] = useState(() => localStorage.getItem('kennelcheck_signed_by') || '');
  const [status, setStatus] = useState('');

  const items = checklists[shift];

  const completedCount = useMemo(
    () => items.filter((_, i) => checked[`${shift}-${i}`]).length,
    [items, checked, shift]
  );

  const allDone = completedCount === items.length;

  function toggleItem(index) {
    const key = `${shift}-${index}`;
    setChecked(prev => ({ ...prev, [key]: !prev[key] }));
  }

  function selectAll() {
    const next = { ...checked };
    items.forEach((_, i) => {
      next[`${shift}-${i}`] = true;
    });
    setChecked(next);
  }

  async function completeChecklist() {
    if (!initials.trim()) {
      setStatus('Enter initials first.');
      return;
    }

    if (!allDone) {
      setStatus('Finish all checklist items first.');
      return;
    }

    localStorage.setItem('kennelcheck_signed_by', initials.trim());

    await signOffQuarantinePaper({
      animalId: null,
      careDate: todayDateString(),
      checkedBy: initials.trim(),
      notes: `${shift} quarantine checklist completed`
    });

    setStatus(`${shift} checklist complete.`);
  }

  return (
    <main className="roundsScreen quarantinePage">
      <div className="quarantineHeader">
        <button type="button" onClick={() => setPage('dashboard')}>×</button>
        <div>
          <p>Quarantine Room</p>
          <h1>Daily Checklist</h1>
        </div>
      </div>

      <section className="quarantineShiftTabs">
        <button
          type="button"
          className={shift === 'AM' ? 'active' : ''}
          onClick={() => setShift('AM')}
        >
          AM Checklist
        </button>

        <button
          type="button"
          className={shift === 'PM' ? 'active' : ''}
          onClick={() => setShift('PM')}
        >
          PM Checklist
        </button>
      </section>

      <section className="quarantineCard">
        <div className="quarantineCardTop">
          <div>
            <h2>{shift} Checklist</h2>
            <p>{completedCount} of {items.length} completed</p>
          </div>

          <button type="button" className="selectAllBtn" onClick={selectAll}>
            Select All
          </button>
        </div>

        <div className="quarantineCheckboxList">
          {items.map((item, index) => {
            const key = `${shift}-${index}`;
            const done = Boolean(checked[key]);

            return (
              <label key={key} className={done ? 'quarantineCheckRow done' : 'quarantineCheckRow'}>
                <input
                  type="checkbox"
                  checked={done}
                  onChange={() => toggleItem(index)}
                />
                <span>{item}</span>
              </label>
            );
          })}
        </div>
      </section>

      <section className="quarantineCard signoffCard">
        <label className="roundInput">
          <ClipboardCheck size={17}/>
          <input
            value={initials}
            onChange={e => setInitials(e.target.value)}
            placeholder="Initials"
          />
        </label>

        <button
          type="button"
          className="roundPrimary"
          onClick={completeChecklist}
        >
          <CheckCircle2 size={18}/>
          Mark {shift} Complete
        </button>

        {status && <p className={status.includes('complete') ? 'success' : 'error'}>{status}</p>}
      </section>
    </main>
  );
}