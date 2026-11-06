// components/EmployeePillPicker.jsx
import React, { useEffect, useState } from 'react';
import { fetchEmployees } from '../lib/employeesApi';

const CURRENT_EMPLOYEE_KEY = 'binxq-current-employee';

// Exported so other components (e.g. RoundsDashboard's bulk sign-off) can
// read whoever was most recently picked in ANY EmployeePillPicker, without
// needing a picker of their own on screen.
export function getStoredEmployeeName() {
  try {
    return localStorage.getItem(CURRENT_EMPLOYEE_KEY) || '';
  } catch {
    return '';
  }
}

function setStoredEmployeeName(name) {
  try {
    localStorage.setItem(CURRENT_EMPLOYEE_KEY, name);
  } catch {
    // localStorage unavailable — persistence just silently no-ops, picker still works
  }
}

/**
 * Shows a wrap of tappable name pills. Tapping one selects it (highlighted)
 * — the parent modal is responsible for its own Confirm/Submit button that
 * reads `value` and proceeds.
 */
export function EmployeePillPicker({ value, onChange }) {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchEmployees()
      .then(setEmployees)
      .catch(err => setError(err.message || 'Could not load employees.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <small style={{ color: 'var(--muted)' }}>Loading names...</small>;
  }

  if (error) {
    return <small style={{ color: 'var(--rose)' }}>{error}</small>;
  }

  if (employees.length === 0) {
    return (
      <small style={{ color: 'var(--muted)' }}>
        No names yet. Add them in More, then Manage employees.
      </small>
    );
  }

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {employees.map(emp => {
        const selected = value === emp.name;
        return (
          <button
            key={emp.id}
            type="button"
            onClick={() => {
              onChange(emp.name);
              setStoredEmployeeName(emp.name);
            }}
            style={{
              border: selected ? '1px solid var(--eye)' : '1px solid var(--line-strong)',
              background: selected ? 'var(--eye)' : 'var(--coat-2)',
              color: selected ? 'var(--eye-ink)' : 'var(--text)',
              borderRadius: 999,
              minHeight: 44,
              padding: '0 18px',
              fontWeight: 700,
              fontSize: 15,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {emp.name}
          </button>
        );
      })}
    </div>
  );
}
