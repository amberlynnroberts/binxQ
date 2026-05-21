import React from 'react';
import { Cat, ClipboardCheck, Home, Building2, Menu, Plus } from 'lucide-react';
export function RoundsShell({ page, setPage, children }) {
  const nav = [
    ['dashboard', Home, 'Dashboard'],
    ['round-select', ClipboardCheck, 'Tasks'],
    ['kennels', Cat, 'Animals'],
    ['more', Building2, 'Kennels'],
    ['more', Menu, 'More']
  ];

  return (
    <div className="roundsApp">
      <div className="roundsViewport">{children}</div>
        <button type="button" className="globalLowStockButton" onClick={() => setPage('text-alert')} >
        Low Stock </button>
      <nav className="roundsBottomNav">
        {nav.map(([id, Icon, label], index) => (
          <button
            key={`${id}-${label}-${index}`}
            type="button"
            className={page === id ? 'active' : ''}
            onClick={() => setPage(id)}
          >
            <Icon size={21}/>
            <span>{label}</span>
          </button>
        ))}

        <button type="button" className="roundsFab" disabled onClick={() => setPage('add')} aria-label="Add">
          <Plus size={28}/>
        </button>
      </nav>
    </div>
  );
}
