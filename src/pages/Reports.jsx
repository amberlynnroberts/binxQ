import React, { useMemo, useState } from 'react';
import { CalendarDays, Download, FileText, RefreshCw, X } from 'lucide-react';
import {
  animalKennel,
  animalName,
  downloadCsv,
  fetchDailyReport,
  todayDateString
} from '../lib/reportsApi';

function addDays(dateString, days) {
  const d = new Date(`${dateString}T00:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function ReportTable({ title, rows, columns, emptyText }) {
  return (
    <section className="reportPanel">
      <h2>{title}</h2>
      {rows.length === 0 ? (
        <p className="reportEmpty">{emptyText}</p>
      ) : (
        <div className="reportTableWrap">
          <table className="reportTable">
            <thead>
              <tr>
                {columns.map(col => <th key={col.key}>{col.label}</th>)}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={row.id || index}>
                  {columns.map(col => <td key={col.key}>{col.render(row)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export function Reports({ data }) {
  const today = todayDateString();
  const [startDate, setStartDate] = useState(addDays(today, -7));
  const [endDate, setEndDate] = useState(today);
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState({ cleaning: [], medication: [], quarantine: [] });
  const [message, setMessage] = useState('');
  const [catSearch, setCatSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);

  const animals = data?.animals || [];

  const filteredAnimals = useMemo(() => {
    if (!catSearch.trim()) return [];
    const q = catSearch.toLowerCase();
    const results = animals.filter(a =>
      a.name.toLowerCase().includes(q)
    ).slice(0, 8);
    console.log('search results for', q, results.map(a => ({ name: a.name, kennel: a.kennel })));
    return results;
  }, [animals, catSearch]);

  async function loadReport() {
    setLoading(true);
    setMessage('');
    try {
      const result = await fetchDailyReport({ startDate, endDate });
      setReport(result);
      setMessage('Report loaded.');
    } catch (err) {
      console.error(err);
      setMessage(`Report failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  const filteredReport = useMemo(() => {
    if (!selectedCat) return report;
    return {
      cleaning: report.cleaning.filter(r => r.animal_id === selectedCat.id),
      medication: report.medication.filter(r => r.animal_id === selectedCat.id),
      quarantine: report.quarantine.filter(r => r.animal_id === selectedCat.id)
    };
  }, [report, selectedCat]);

  const totals = useMemo(() => ({
    cleaning: filteredReport.cleaning.length,
    meds: filteredReport.medication.length,
    quarantine: filteredReport.quarantine.length
  }), [filteredReport]);

  function exportCsv() {
    const rows = [
      ['Type', 'Date', 'Shift', 'Kennel', 'Animal', 'Task/Medication', 'Signed By', 'Notes', 'Time'],
      ...filteredReport.cleaning.map(row => [
        'Cleaning/Feeding/Watering',
        row.care_date,
        row.shift,
        animalKennel(row),
        animalName(row),
        'Daily cleaning/feeding/watering',
        row.signed_by,
        row.notes || '',
        row.created_at
      ]),
      ...filteredReport.medication.map(row => [
        'Medication',
        row.care_date,
        row.shift,
        animalKennel(row),
        animalName(row),
        row.medications?.medication_name || 'Medication',
        row.given_by,
        row.notes || row.medications?.dosage_notes || '',
        row.created_at
      ]),
      ...filteredReport.quarantine.map(row => [
        'Quarantine Checkoff',
        row.care_date,
        '',
        animalKennel(row),
        animalName(row),
        row.check_type === 'checklist_AM' ? 'AM Checklist' :
        row.check_type === 'checklist_PM' ? 'PM Checklist' : row.check_type,
        row.checked_by,
        row.notes || '',
        row.created_at
      ])
    ];
    const catLabel = selectedCat ? `-${selectedCat.name.replace(/\s+/g, '_')}` : '';
    downloadCsv(`kennelcheck-report${catLabel}-${startDate}-to-${endDate}.csv`, rows);
  }

  return (
    <main className="roundsScreen">
      <section className="reportHeader">
        <div>
          <p>Binx-Q</p>
          <h1>Daily Care Report</h1>
          <small>Cleaning AM/PM, medication sign-offs, and quarantine check-offs.</small>
        </div>
        <FileText size={34}/>
      </section>

      <section className="reportControls">
        <label>
          Start Date
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
        </label>

        <label>
          End Date
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
        </label>

        {/* Cat search */}
        <label style={{ position: 'relative' }}>
          Filter by Cat
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <input
              value={selectedCat ? selectedCat.name : catSearch}
              onChange={e => {
                setCatSearch(e.target.value);
                setSelectedCat(null);
                setShowDropdown(true);
              }}
              onFocus={() => setShowDropdown(true)}
              placeholder="Search cat name..."
            />
            {selectedCat && (
              <button
                type="button"
                onClick={() => { setSelectedCat(null); setCatSearch(''); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                <X size={16}/>
              </button>
            )}
          </div>
          {showDropdown && filteredAnimals.length > 0 && (
            <div className="catSearchDropdown">
              {filteredAnimals.map(animal => (
                <button
                  key={animal.id}
                  type="button"
                  className="catSearchOption"
                  onClick={() => {
                    setSelectedCat(animal);
                    setCatSearch('');
                    setShowDropdown(false);
                  }}>
                  <b>{animal.name}</b>
                </button>
              ))}
            </div>
          )}
        </label>

        <button type="button" className="roundPrimary" onClick={loadReport} disabled={loading}>
          <RefreshCw size={17}/>
          {loading ? 'Loading...' : 'Run Report'}
        </button>

        <button type="button" className="roundSecondary" onClick={exportCsv}>
          <Download size={17}/>
          Export CSV
        </button>
      </section>

      {message && <p className={message.includes('failed') ? 'error' : 'success'}>{message}</p>}

      {selectedCat && (
        <section className="reportCatBanner">
          <b>Showing results for: {selectedCat.name}</b>
          <small>{selectedCat.kennel || 'No kennel'} · {selectedCat.status}</small>
        </section>
      )}

      <section className="reportStats">
        <div><b>{totals.cleaning}</b><small>Cleaning Signoffs</small></div>
        <div><b>{totals.meds}</b><small>Medication Signoffs</small></div>
        <div><b>{totals.quarantine}</b><small>Quarantine Checkoffs</small></div>
      </section>

      <ReportTable
        title="AM/PM Cleaning, Feeding, Watering"
        rows={filteredReport.cleaning}
        emptyText="No cleaning sign-offs for this date range."
        columns={[
          { key: 'date', label: 'Date', render: row => row.care_date },
          { key: 'shift', label: 'Shift', render: row => row.shift },
          { key: 'kennel', label: 'Kennel', render: animalKennel },
          { key: 'animal', label: 'Animal', render: animalName },
          { key: 'by', label: 'Signed By', render: row => row.signed_by },
          { key: 'time', label: 'Time', render: row => new Date(row.created_at).toLocaleString() }
        ]}
      />

      <ReportTable
        title="Medication Sign-Offs"
        rows={filteredReport.medication}
        emptyText="No medication sign-offs for this date range."
        columns={[
          { key: 'date', label: 'Date', render: row => row.care_date },
          { key: 'shift', label: 'Shift', render: row => row.shift },
          { key: 'kennel', label: 'Kennel', render: animalKennel },
          { key: 'animal', label: 'Animal', render: animalName },
          { key: 'med', label: 'Medication', render: row => row.medications?.medication_name || 'Medication' },
          { key: 'by', label: 'Given By', render: row => row.given_by },
          { key: 'time', label: 'Time', render: row => new Date(row.created_at).toLocaleString() }
        ]}
      />

      <ReportTable
        title="Quarantine Check-Offs"
        rows={filteredReport.quarantine}
        emptyText="No quarantine check-offs for this date range."
        columns={[
          { key: 'date', label: 'Date', render: row => row.care_date },
          { key: 'kennel', label: 'Kennel', render: animalKennel },
          { key: 'animal', label: 'Animal', render: animalName },
          { key: 'task', label: 'Task', render: row =>
            row.check_type === 'checklist_AM' ? 'AM Checklist' :
            row.check_type === 'checklist_PM' ? 'PM Checklist' :
            row.check_type === 'paper_done' ? 'Paper done' : row.check_type
          },
          { key: 'by', label: 'Checked By', render: row => row.checked_by },
          { key: 'time', label: 'Time', render: row => new Date(row.created_at).toLocaleString() }
        ]}
      />
    </main>
  );
}