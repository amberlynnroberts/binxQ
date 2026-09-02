import React, { useEffect, useState } from 'react';
import { AlertTriangle, ArrowLeft, PawPrint, Printer, RefreshCw } from 'lucide-react';
import { fetchVetDayList } from '../lib/vetDayListApi';

export function VetDayList({ setPage }) {
  const [cats, setCats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatedAt, setUpdatedAt] = useState(null);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const rows = await fetchVetDayList();
      setCats(rows);
      setUpdatedAt(new Date());
    } catch (err) {
      console.error(err);
      setError(err.message || 'Could not load the vet list.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <main className="vetDayListPage">
      <div className="roundsTop">
        <button type="button" className="roundsClose" onClick={() => setPage('more')}>
          <ArrowLeft size={20}/>
        </button>
        <h1>Vet Day List</h1>
        <span/>
      </div>

      <section className="vetDayListToolbar">
        <small>
          {updatedAt
            ? `Live from the vet-list sheet · updated ${updatedAt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`
            : 'Live from the vet-list sheet'}
        </small>

        <div className="vetDayListToolbarActions">
          <button type="button" onClick={load} disabled={loading}>
            <RefreshCw size={16} className={loading ? 'spin' : ''}/>
            Refresh
          </button>
          <button type="button" onClick={() => window.print()}>
            <Printer size={16}/>
            Print
          </button>
        </div>
      </section>

      {error && (
        <section className="vetDayListError">
          <AlertTriangle size={18}/>
          <div>
            <b>{error}</b>
            <small>Double-check the sheet is still shared as "Anyone with the link can view", then hit Refresh.</small>
          </div>
        </section>
      )}

      {loading && cats.length === 0 && !error && (
        <p className="vetDayListLoading">Loading the vet list…</p>
      )}

      {!loading && !error && cats.length === 0 && (
        <section className="vetCalendarEmpty">
          <PawPrint size={34}/>
          <h2>No cats on the list</h2>
          <p>Add a row to the vet-list sheet and hit Refresh.</p>
        </section>
      )}

      {cats.length > 0 && (
        <table className="vetDayListTable">
          <thead>
            <tr>
              <th>Cat</th>
              <th>Where</th>
              <th>Needs</th>
            </tr>
          </thead>
          <tbody>
            {cats.map((cat, i) => (
              <tr key={`${cat.name}-${i}`}>
                <td className="vetDayListName">{cat.name}</td>
                <td>
                  <span className={`vetDayListLocation ${cat.location === 'HBCM' ? 'hbcm' : 'foster'}`}>
                    {cat.location || '—'}
                  </span>
                </td>
                <td>
                  <div className="vetDayListNeeds">
                    {cat.needs.length > 0
                      ? cat.needs.map((need, j) => <span key={j} className="vetDayListNeedPill">{need}</span>)
                      : <span className="vetDayListNeedPill empty">—</span>}
                  </div>
                  {cat.notes && <small className="vetDayListNotes">{cat.notes}</small>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
