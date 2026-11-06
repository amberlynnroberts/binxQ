import React from 'react';
import { Home, Cat, Pill, Stethoscope, Menu } from 'lucide-react';

const MED_ROUND_PAGES = ['round-kennels', 'round-runner', 'round-summary'];
const CARE_PAGES = ['dashboard', 'round-select', 'quarantine-checklist'];
const CAT_PAGES = ['kennels', 'card', 'add', 'edit'];
const VET_PAGES = ['vet-calendar', 'vet-day-list', 'vet-tasks'];

export function RoundsShell({ page, setPage, setAnimalView, children, onMedRound, activeRoundType }) {
  const inMedRound = activeRoundType === 'med' && MED_ROUND_PAGES.includes(page);
  const inCareRound = activeRoundType !== 'med' && MED_ROUND_PAGES.includes(page);

  const tabs = [
    { id: 'dashboard', label: 'Today', Icon: Home, active: CARE_PAGES.includes(page) || inCareRound },
    { id: 'kennels', label: 'Cats', Icon: Cat, active: CAT_PAGES.includes(page) },
    { id: 'med-round', label: 'Meds', Icon: Pill, active: inMedRound || page === 'meds' },
    { id: 'vet-calendar', label: 'Vet', Icon: Stethoscope, active: VET_PAGES.includes(page) },
    { id: 'more', label: 'More', Icon: Menu, active: !CARE_PAGES.includes(page) && !CAT_PAGES.includes(page) && !VET_PAGES.includes(page) && !MED_ROUND_PAGES.includes(page) && page !== 'meds' },
  ];

  function go(id) {
    if (id === 'med-round') { onMedRound?.(); return; }
    if (id === 'kennels') setAnimalView?.('quarantine');
    setPage(id);
    window.scrollTo(0, 0);
  }

  return (
    <div className="appShell">
      <div className="appViewport">{children}</div>
      <nav className="tabBar" aria-label="Main">
        {tabs.map(({ id, label, Icon, active }) => (
          <button
            key={id}
            type="button"
            className={active ? 'tab active' : 'tab'}
            aria-current={active ? 'page' : undefined}
            onClick={() => go(id)}
          >
            <Icon size={22} strokeWidth={active ? 2.4 : 1.9} />
            <span>{label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
