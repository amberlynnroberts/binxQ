import React from 'react';
import { ClipboardCheck, Home, Building2, Menu } from 'lucide-react';

const MED_ROUND_PAGES = ['round-kennels', 'round-runner', 'round-summary'];

export function RoundsShell({ page, setPage, animalView, setAnimalView, children, onMedRound, activeRoundType }) {
  const nav = [
    ['dashboard', Home, 'Dashboard', null],
    ['meds', ClipboardCheck, 'Meds', null], // triggers onMedRound instead of setPage — see onClick below
    ['shelteriq', null, 'ShelterIQ', null],
    ['kennels', Building2, 'Kennels', 'quarantine'],
    ['more', Menu, 'More', null]
  ];

  function isActive(id, view) {
    if (id === 'meds') {
      // Highlighted while anywhere inside a medication round (round-kennels,
      // round-runner, round-summary). This button no longer navigates to a
      // standalone Meds page — it starts the Medication Round directly.
      return activeRoundType === 'med' && MED_ROUND_PAGES.includes(page);
    }
    return page === id && (!view || animalView === view);
  }

  return (
    <div className="roundsApp">
      <div className="roundsViewport">{children}</div>
      <button type="button" className="globalLowStockButton" onClick={() => setPage('text-alert')}>
        Low Stock
      </button>
      <nav className="roundsBottomNav">
        {nav.map(([id, Icon, label, view], index) => {
          if (id === 'shelteriq') {
            return (
              <button
                key="shelteriq"
                type="button"
                onClick={() => window.open('https://rescue-io.vercel.app', '_blank')}
                style={{
                  display: 'grid',
                  placeItems: 'center',
                  gap: 2,
                  fontSize: 11,
                  fontWeight: 950,
                  border: '1px solid rgba(20,184,166,0.45)',
                  borderRadius: 16,
                  background: 'rgba(20,184,166,0.15)',
                  color: '#5eead4',
                  padding: '6px 10px',
                  minWidth: 64,
                }}
              >
                <span style={{ fontSize: 16 }}>🏠</span>
                <span>ShelterIQ</span>
              </button>
            );
          }
          return (
            <button
              key={`${id}-${label}-${index}`}
              type="button"
              className={isActive(id, view) ? 'active' : ''}
              onClick={() => {
                if (id === 'meds') { onMedRound?.(); return; }
                if (view) setAnimalView?.(view);
                setPage(id);
              }}
            >
              <Icon size={21}/>
              <span>{label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
