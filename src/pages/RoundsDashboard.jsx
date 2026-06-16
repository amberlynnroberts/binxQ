import React, { useEffect, useMemo, useState } from 'react';
import { fetchCleaningSignoffsForDate } from '../lib/dailyCareStatusApi';
import { currentHour, getMissingCleaningTasks, todayDateString } from '../lib/careTaskRules';
import {
  Bell,
  CheckCircle2,
  ClipboardCheck,
  ChevronRight,
  Pill,
} from 'lucide-react';
import { fetchUpcomingVetEvents, summarizeVetEvents } from '../lib/vetEventsApi';
import { fetchDailyReport } from '../lib/reportsApi';

function RoundCard({ icon: Icon, title, subtitle, count, tone, onClick, complete, disabled, badges }) {
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

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
        <b>{title}</b>
        <small>{subtitle}</small>
        {badges ? (
          <div style={{ display: 'flex', flexDirection: 'row', gap: 6, marginTop: 4 }}>
            {badges.map(b => (
              <span key={b.label} className={`checklistBadge ${b.done ? 'done' : 'pending'}`}>
                {b.done ? <CheckCircle2 size={12} /> : null}
                {b.label}
              </span>
            ))}
          </div>
        ) : (
          <small>{complete ? 'DONE!' : count}</small>
        )}
      </div>

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
  const [checklistSignoffs, setChecklistSignoffs] = useState({ AM: null, PM: null });

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

  useEffect(() => {
    const today = todayDateString();
    fetchDailyReport({ startDate: today, endDate: today })
      .then(report => {
        const am = report.quarantine.find(r => r.check_type === 'checklist_AM');
        const pm = report.quarantine.find(r => r.check_type === 'checklist_PM');
        setChecklistSignoffs({ AM: am || null, PM: pm || null });
      })
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

  const amUnlocked = nowHour >= 8;
  const pmUnlocked = nowHour >= 14;

  const amComplete = amUnlocked && careTasks.filter(t => t.shift === 'AM').length > 0 && amRemaining === 0;
  const pmComplete = pmUnlocked && careTasks.filter(t => t.shift === 'PM').length > 0 && pmRemaining === 0;

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

  const checklistBadges = [
    { label: 'AM', done: Boolean(checklistSignoffs.AM) },
    { label: 'PM', done: Boolean(checklistSignoffs.PM) }
  ];

  const checklistComplete = Boolean(checklistSignoffs.AM && checklistSignoffs.PM);

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

        <small>Choose a round to start today's care.</small>
      </section>

      <section>
        <h2 className="roundSectionLabel">Start a Round</h2>

        <div className="roundStartList cleanRoundGrid">
          <RoundCard
            icon={ClipboardCheck}
            title="AM Care Round"
            subtitle={amUnlocked ? 'Cleaning, Feeding, Water' : 'Available at 8AM'}
            count={amUnlocked ? `${amPercent}% complete` : 'Not yet available'}
            complete={false}
            tone="green"
            disabled={!amUnlocked}
            onClick={() => {
              if (amUnlocked) startRound('care', 'AM');
            }}
          />

          <RoundCard
            icon={ClipboardCheck}
            title="PM Care Round"
            subtitle={pmUnlocked ? 'Cleaning, Feeding, Water' : 'Available at 3PM'}
            count={pmUnlocked ? `${pmPercent}% complete` : 'Not yet available'}
            complete={false}
            tone="blue"
            disabled={!pmUnlocked}
            onClick={() => {
              if (pmUnlocked) startRound('care', 'PM');
            }}
          />

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
            complete={checklistComplete}
            tone="purple"
            badges={checklistBadges}
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
