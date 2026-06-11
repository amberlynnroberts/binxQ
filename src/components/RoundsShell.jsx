import React from 'react';
import { ClipboardCheck, Home, Building2, Menu } from 'lucide-react';

export function RoundsShell({ page, setPage, animalView, setAnimalView, children, onMedRound }) {
  const nav = [
    ['dashboard', Home, 'Dashboard', null],
    ['med-round', ClipboardCheck, 'Meds', null],
    ['shelteriq', null, 'ShelterIQ', null],
    ['kennels', Building2, 'Kennels', 'quarantine'],
    ['more', Menu, 'More', null]
  ];

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
              className={page === id && (!view || animalView === view) ? 'active' : ''}
              onClick={() => {
                if (id === 'med-round') { onMedRound?.(); return; }
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