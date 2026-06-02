import React, { useState } from 'react';
import { Cat, ClipboardCheck, Home, Building2, Menu, Plus } from 'lucide-react';
export function RoundsShell({ page, setPage, animalView, setAnimalView, children, onMedRound }) {
  const nav = [
    ['dashboard', Home, 'Dashboard', null],
    ['med-round', ClipboardCheck, 'Meds', null],
    ['kennels', Cat, 'Lounge', 'rescue'],
    ['kennels', Building2, 'Kennels', 'quarantine'],
    ['more', Menu, 'More', null]
  ];

  const [showFeedback, setShowFeedback] = useState(false);

  return (
    <div className="roundsApp">
      <div className="roundsViewport">{children}</div>
        <button type="button" className="globalLowStockButton" onClick={() => setPage('text-alert')} >
        Low Stock 
        </button>
        <nav className="roundsBottomNav">
          {nav.map(([id, Icon, label, view], index) => (
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
          ))}
        </nav>
    </div>
  );
}
