import React from 'react';
import { CheckCircle2 } from 'lucide-react';

export function RoundSummary({
  completed = 0,
  skipped = 0,
  roundType,
  shift,
  setPage
}) {
  return (
    <main className="roundsScreen small">
      <section className="roundComplete">

        <div className="roundConfetti">
          <CheckCircle2 size={60}/>
        </div>

        <h1>
          {roundType === 'med' ? 'Medication' : `${shift} care`} round done
        </h1>

        <div className="roundSummaryGrid">
          <span>
            <b>{completed}</b>
            <small>Completed</small>
          </span>

          <span>
            <b>{skipped}</b>
            <small>Skipped</small>
          </span>

          <span>
            <b>0</b>
            <small>Remaining</small>
          </span>
        </div>

        <button
          type="button"
          className="roundPrimary"
          onClick={() => setPage('dashboard')}
        >
          Back to Today
        </button>

      </section>
    </main>
  );
}