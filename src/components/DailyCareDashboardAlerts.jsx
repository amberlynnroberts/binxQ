import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import { fetchCleaningSignoffsForDate } from '../lib/dailyCareStatusApi';
import { currentHour, getMissingCleaningTasks, todayDateString } from '../lib/careTaskRules';

export function DailyCareDashboardAlerts({ data, setPage }) {
  const [cleaningSignoffs, setCleaningSignoffs] = useState([]);
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
  }, [animals.length]);

  const missingTasks = useMemo(() => {
    return getMissingCleaningTasks({ animals, cleaningSignoffs, hour: currentHour() });
  }, [animals, cleaningSignoffs]);

  return (
    <section className="panel dailyCareAlertPanel">
      <div className="title">
        <h2><Clock size={18}/> Daily Care Tasks</h2>
        <button type="button" className="link" onClick={() => setPage?.('daily-care')}>
          Open Daily Care
        </button>
      </div>

      {error && <p className="error">{error}</p>}

      {missingTasks.length === 0 ? (
        <p className="success">
          <CheckCircle2 size={16}/>
          No cleaning/feeding/watering tasks are currently overdue.
        </p>
      ) : (
        <>
          <p className="error">
            <AlertTriangle size={16}/>
            {missingTasks.length} task{missingTasks.length === 1 ? '' : 's'} need attention.
          </p>

          <div className="dailyCareTaskList">
            {missingTasks.map(task => (
              <button
                type="button"
                className="dailyCareTask"
                key={task.id}
                onClick={() => setPage?.('daily-care')}
              >
                <span className="taskBang">!</span>
                <span>
                  <b>{task.animal.name}</b>
                  <small>{task.label}</small>
                  <small>{task.dueLabel}</small>
                </span>
              </button>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
