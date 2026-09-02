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
    return <small style={{ color: 'var(--round-muted, #98a5b8)' }}>Loading names...</small>;
  }

  if (error) {
    return <small style={{ color: '#ff8a8a' }}>{error}</small>;
  }

  if (employees.length === 0) {
    return (
      <small style={{ color: 'var(--round-muted, #98a5b8)' }}>
        No employees set up yet — add names from More → Manage Employees.
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
              border: selected ? '1px solid rgba(57, 211, 83, 0.5)' : '1px solid rgba(148, 163, 184, 0.18)',
              background: selected ? 'rgba(57, 211, 83, 0.16)' : 'rgba(255, 255, 255, 0.05)',
              color: selected ? '#86efac' : 'var(--round-text, #f8fafc)',
              borderRadius: 999,
              padding: '10px 16px',
              fontWeight: 800,
              fontSize: 14,
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
