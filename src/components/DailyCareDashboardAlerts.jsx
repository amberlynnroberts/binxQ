import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Clock } from 'lucide-react';
import { fetchCleaningSignoffsForDate } from '../lib/dailyCareStatusApi';
import { buildCleaningSignoffMaps, currentHour, isCleaningDueNow, todayDateString } from '../lib/careTaskRules';

export function DailyCareDashboardAlerts({ data, setPage }) {
  const [cleaningSignoffs, setCleaningSignoffs] = useState([]);
  const [now, setNow] = useState(currentHour());
  const [error, setError] = useState('');

  const animals = data?.animals || [];

  async function load() {
    setError('');
    try {
      const rows = await fetchCleaningSignoffsForDate(todayDateString());
      setCleaningSignoffs(rows);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to load daily care tasks.');
    }
  }

  useEffect(() => {
    load();
    const interval = setInterval(() => {
      load();
      setNow(currentHour());
    }, 60_000);
    return () => clearInterval(interval);
  }, []);

  const signoffMap = useMemo(() => buildCleaningSignoffMaps(cleaningSignoffs), [cleaningSignoffs]);

  const amDue = isCleaningDueNow('AM', now);
  const pmDue = isCleaningDueNow('PM', now);

  const allDone =
    animals.length > 0 &&
    animals.every(a =>
      (!amDue || signoffMap.has(`${a.id}:AM`)) &&
      (!pmDue || signoffMap.has(`${a.id}:PM`))
    );

  return (
    <section className="panel dailyCareAlertPanel">
      <div className="title">
        <h2><Clock size={18} /> Daily Care Tasks</h2>
        <button type="button" className="link" onClick={() => setPage?.('daily-care')}>
          Open Daily Care
        </button>
      </div>

      {error && <p className="error">{error}</p>}

      {allDone && (
        <p className="success">
          <CheckCircle2 size={16} />
          All care tasks complete!
        </p>
      )}

      <div className="dailyCareTaskList">
        {animals.map(animal => {
          const amDone = signoffMap.has(`${animal.id}:AM`);
          const pmDone = signoffMap.has(`${animal.id}:PM`);

          return (
            <button
              type="button"
              className="dailyCareTask"
              key={animal.id}
              onClick={() => setPage?.('daily-care')}
            >
              <span>
                <b>{animal.name}</b>
                <small>{animal.kennel || '—'}</small>
              </span>
              <span className="shiftBadges">
                {amDue && (
                  <span className={amDone ? 'badge green' : 'badge red'}>
                    {amDone ? '✓ AM' : '! AM'}
                  </span>
                )}
                {pmDue && (
                  <span className={pmDone ? 'badge green' : 'badge red'}>
                    {pmDone ? '✓ PM' : '! PM'}
                  </span>
                )}
                {!amDue && !pmDue && (
                  <span className="badge gray">No tasks due yet</span>
                )}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}