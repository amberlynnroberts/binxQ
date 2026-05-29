import React, { useEffect, useMemo, useState } from 'react';
import { fetchCleaningSignoffsForDate } from '../lib/dailyCareStatusApi';
import { currentHour, getMissingCleaningTasks, todayDateString } from '../lib/careTaskRules';
import {
  Bell,
  CheckCircle2,
  ClipboardCheck,
  ChevronRight,
  Pill,
  Syringe
} from 'lucide-react';
import { fetchUpcomingVetEvents, summarizeVetEvents } from '../lib/vetEventsApi';

function RoundCard({ icon: Icon, title, subtitle, count, tone, onClick, complete, disabled }) {
  return (
    <button
      type="button"
      className={`roundStartCard ${tone} ${disabled ? 'disabled' : ''}`}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
    >
      <span className="roundStartIconWrap">
        <span className="roundStartIcon">
          <Icon size={31} />
        </span>

        {complete && (
          <span className="roundCompleteBadge">
            <CheckCircle2 size={22} />
          </span>
        )}
      </span>

      <span>
        <b>{title}</b>
        <small>{subtitle}</small>
        <small>{complete ? 'DONE!' : count}</small>
      </span>

      <ChevronRight />
    </button>
  );
}

function GlanceCard({ label, value, tone }) {
  return (
    <div className={`roundGlance ${tone}`}>
      <b>{value}</b>
      <span>{label}</span>
    </div>
  );
}

function getGreeting() {
  const hour = new Date().getHours();

  if (hour >= 5 && hour < 12) return 'Good morning! 👋';
  if (hour >= 12 && hour < 17) return 'Good afternoon! ☀️';

  return 'Good evening! 🌙';
}

export function RoundsDashboard({ data, setPage, startRound }) {
  const [cleaningSignoffs, setCleaningSignoffs] = useState([]);
  const [upcomingVetEvents, setUpcomingVetEvents] = useState([]);

  const animals = data?.animals || [];
  const meds = (data?.meds || []).filter(m => m.active);

  useEffect(() => {
    fetchCleaningSignoffsForDate(todayDateString())
      .then(setCleaningSignoffs)
      .catch(console.error);
  }, [animals.length]);

  useEffect(() => {
    fetchUpcomingVetEvents({ days: 7 })
      .then(setUpcomingVetEvents)
      .catch(console.error);
  }, []);

  const careTasks = useMemo(() => {
    return getMissingCleaningTasks({
      animals,
      cleaningSignoffs,
      hour: currentHour()
    });
  }, [animals, cleaningSignoffs]);

  const greeting = getGreeting();
  const nowHour = new Date().getHours();
  const totalCats = animals.length || 0;

  const amRemaining = careTasks.filter(t => t.shift === 'AM').length;
  const pmRemaining = careTasks.filter(t => t.shift === 'PM').length;

  const pmUnlocked = nowHour >= 15;

  const amComplete = totalCats > 0 && amRemaining === 0;
  const pmComplete = pmUnlocked && totalCats > 0 && pmRemaining === 0;

  const amPercent = totalCats
    ? Math.round(((totalCats - amRemaining) / totalCats) * 100)
    : 0;

  const pmPercent = pmUnlocked && totalCats
    ? Math.round(((totalCats - pmRemaining) / totalCats) * 100)
    : 0;

  const medTotal = meds.length || 0;
  const medComplete = medTotal === 0;
  const medPercent = medComplete ? 100 : 0;

  const vetSummary = summarizeVetEvents(upcomingVetEvents);

  return (
    <main className="roundsDashboard cleanDashboard">
      <section className="roundsWelcome cleanHero">
        <p>Binx-Q</p>
        <h1>{greeting}</h1>

        <button
          type="button"
          className={
            vetSummary.overdue > 0
              ? 'vetDashboardAlert danger'
              : vetSummary.dueSoon > 0
                ? 'vetDashboardAlert warning'
                : 'vetDashboardAlert clear'
          }
          onClick={() => setPage('vet-calendar')}
        >
          <Bell size={22} />
          <span>
            <b>
              {vetSummary.overdue > 0
                ? `${vetSummary.overdue} overdue vet item${vetSummary.overdue === 1 ? '' : 's'}`
                : vetSummary.dueSoon > 0
                  ? `${vetSummary.dueSoon} vet item${vetSummary.dueSoon === 1 ? '' : 's'} due in 7 days`
                  : 'No upcoming vet items'}
            </b>
            <small>Tap to open Vet Calendar</small>
          </span>
        </button>

        {/* <div className="vetQuickActions">
          <button type="button" onClick={() => setPage('vet-calendar')}>
            💉 Add Vaccine
          </button>

          <button type="button" onClick={() => setPage('vet-calendar')}>
            📅 Add Appointment
          </button>
        </div> */}

        <small>Choose a round to start today’s care.</small>
      </section>

      <section>
        <h2 className="roundSectionLabel">Start a Round</h2>

        <div className="roundStartList cleanRoundGrid">
          <RoundCard
            icon={ClipboardCheck}
            title="AM Care Round"
            subtitle="Cleaning, Feeding, Water"
            count={`${amPercent}% complete`}
            complete={amComplete}
            tone="green"
            onClick={() => startRound('care', 'AM')}
          />

          <RoundCard
            icon={ClipboardCheck}
            title="PM Care Round"
            subtitle={pmUnlocked ? 'Cleaning, Feeding, Water' : 'Available at 3PM'}
            count={pmUnlocked ? `${pmPercent}% complete` : 'Not complete'}
            complete={pmComplete}
            tone="blue"
            disabled={!pmUnlocked}
            onClick={() => {
              if (pmUnlocked) startRound('care', 'PM');
            }}
          />

          {/* <RoundCard
            icon={Syringe}
            title="Vet Calendar"
            subtitle="Vaccines / appointments"
            count={`${vetSummary.total} upcoming`}
            tone="purple"
            onClick={() => setPage('vet-calendar')}
          /> */}

          <RoundCard
            icon={Pill}
            title="Medication Round"
            subtitle={`${meds.length} medications due`}
            count={`${medPercent}% complete`}
            complete={medComplete}
            tone="purple"
            onClick={() => startRound('med', 'AM')}
          />

          <RoundCard
            icon={ClipboardCheck}
            title="Quarantine Checklist"
            subtitle="AM / PM room procedures"
            count="Tap to complete"
            tone="purple"
            onClick={() => setPage('quarantine-checklist')}
          />
        </div>
      </section>

      <section className="roundGlancePanel cleanStatsPanel">
        <h2 className="roundSectionLabel">Today at a glance</h2>

        <div className="roundGlanceGrid cleanStatsGrid">
          <GlanceCard label="Tasks Due" value={careTasks.length} tone="green" />
          <GlanceCard label="Meds Due" value={meds.length} tone="blue" />
          <GlanceCard label="Cats" value={animals.length} tone="white" />
        </div>
      </section>
    </main>
  );
}