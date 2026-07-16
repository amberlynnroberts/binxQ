// pages/ManageEmployees.jsx
import React, { useEffect, useState } from 'react';
import { ArrowLeft, Plus, Trash2, Users } from 'lucide-react';
import { fetchEmployees, addEmployee, removeEmployee } from '../lib/employeesApi';

export function ManageEmployees({ setPage }) {
  const [employees, setEmployees] = useState([]);
  const [newName, setNewName] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  async function load() {
    try {
      const rows = await fetchEmployees();
      setEmployees(rows);
    } catch (err) {
      setMessage(err.message || 'Could not load employees.');
    }
  }

  useEffect(() => {
    load();
  }, []);

  function showMessage(text) {
    setMessage(text);
    setTimeout(() => setMessage(''), 4000);
  }

  async function submitAdd(e) {
    e.preventDefault();
    if (!newName.trim()) return;
    setBusy(true);
    try {
      await addEmployee(newName);
      setNewName('');
      await load();
      showMessage('Employee added.');
    } catch (err) {
      showMessage(err.message || 'Could not add employee.');
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove(emp) {
    if (!window.confirm(`Remove ${emp.name} from the name list?`)) return;
    try {
      await removeEmployee(emp.id);
      await load();
      showMessage(`${emp.name} removed.`);
    } catch (err) {
      showMessage(err.message || 'Could not remove employee.');
    }
  }

  return (
    <main>
      <div className="roundsTop">
        <button type="button" className="roundsClose" onClick={() => setPage('more')}>
          <ArrowLeft size={20} />
        </button>
        <h1>Manage Employees</h1>
        <span />
      </div>

      <section className="panel" style={{ marginTop: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <Users size={22} />
          <div>
            <b>Names shown on sign-off pills</b>
            <p style={{ margin: '2px 0 0', color: 'var(--round-muted)', fontSize: 13 }}>
              These names appear as tappable pills anywhere staff sign off on care, meds, or vet events.
            </p>
          </div>
        </div>

        <form onSubmit={submitAdd} style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <input
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder="Employee full name"
            style={{ flex: 1 }}
          />
          <button type="submit" className="primary" disabled={busy}>
            <Plus size={18} /> Add
          </button>
        </form>

        {message && <p className={message.includes('Could') ? 'error' : 'success'}>{message}</p>}

        <div className="list">
          {employees.length === 0 && <p>No employees added yet.</p>}
          {employees.map(emp => (
            <div className="row" key={emp.id} style={{ gridTemplateColumns: '1fr auto' }}>
              <b>{emp.name}</b>
              <button type="button" className="icon" onClick={() => handleRemove(emp)} title="Remove">
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
