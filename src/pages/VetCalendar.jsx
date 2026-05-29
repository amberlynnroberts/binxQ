import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock,
  Filter,
  Plus,
  Search,
  Syringe,
  Trash2,
  X
} from 'lucide-react';
import { isArchivedAnimal } from '../lib/animalFilters';
import {
  addVetEvent,
  completeVetEvent,
  deleteVetEvent,
  eventDateValue,
  fetchVetEvents,
  getVetEventStatus,
  todayDateString,
  vetEventTypes
} from '../lib/vetEventsApi';

const blankEvent = {
  animalId: '',
  eventType: 'Vaccine',
  eventName: '',
  dueDate: todayDateString(),
  appointmentAt: '',
  location: '',
  veterinarian: '',
  notes: ''
};

function getAnimalName(animals, animalId) {
  return animals.find(a => a.id === animalId)?.name || 'Unknown';
}

function getAnimalKennel(animals, animalId) {
  return animals.find(a => a.id === animalId)?.kennel || 'Unassigned';
}

function groupByDate(events) {
  const groups = new Map();

  for (const event of events) {
    const key = eventDateValue(event) || 'No Date';
    const list = groups.get(key) || [];
    list.push(event);
    groups.set(key, list);
  }

  return Array.from(groups.entries()).sort(([a], [b]) => String(a).localeCompare(String(b)));
}

function statusClass(status) {
  return status.toLowerCase().replaceAll(' ', '-');
}

function formatDateLabel(dateString) {
  if (!dateString || dateString === 'No Date') return 'No Date';

  const today = todayDateString();
  const tomorrowDate = new Date(`${today}T00:00:00`);
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrow = tomorrowDate.toISOString().slice(0, 10);

  if (dateString === today) return 'Today';
  if (dateString === tomorrow) return 'Tomorrow';

  return new Date(`${dateString}T00:00:00`).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  });
}

function QuickTemplateButton({ label, type, name, onClick }) {
  return (
    <button
      type="button"
      className="vetTemplateButton"
      onClick={() => onClick(type, name)}
    >
      <span>{label}</span>
      <small>{name}</small>
    </button>
  );
}

export function VetCalendar({ data, setPage }) {
  const animals = useMemo(() => {
    return (data?.animals || []).filter(animal => !isArchivedAnimal(animal));
  }, [data]);

  const [events, setEvents] = useState([]);
  const [form, setForm] = useState(blankEvent);
  const [showAdd, setShowAdd] = useState(false);
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [completedBy, setCompletedBy] = useState('');
  const [message, setMessage] = useState('');

  async function load() {
    const rows = await fetchVetEvents({ includeCompleted: false });
    setEvents(rows);
  }

  useEffect(() => {
    load().catch(console.error);
  }, []);

  const counts = useMemo(() => {
    return {
      overdue: events.filter(e => getVetEventStatus(e) === 'Overdue').length,
      dueSoon: events.filter(e => getVetEventStatus(e) === 'Due Soon').length,
      total: events.length
    };
  }, [events]);

  const filteredEvents = useMemo(() => {
    const q = search.trim().toLowerCase();

    return events.filter(event => {
      const typeMatch = filter === 'All' || event.event_type === filter;
      if (!typeMatch) return false;
      if (!q) return true;

      const haystack = [
        event.event_name,
        event.event_type,
        event.location,
        event.veterinarian,
        event.notes,
        getAnimalName(animals, event.animal_id),
        getAnimalKennel(animals, event.animal_id)
      ].filter(Boolean).join(' ').toLowerCase();

      return haystack.includes(q);
    });
  }, [events, filter, search, animals]);

  const grouped = useMemo(() => groupByDate(filteredEvents), [filteredEvents]);

  function setField(key, value) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  function openQuickAdd(eventType = 'Vaccine', eventName = '') {
    setForm({
      ...blankEvent,
      eventType,
      eventName
    });
    setShowAdd(true);
    setTimeout(() => {
      document.querySelector('.vetEventForm')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
  }

  async function submitEvent(e) {
    e.preventDefault();
    setMessage('');

    try {
      await addVetEvent({
        animalId: form.animalId,
        eventType: form.eventType,
        eventName: form.eventName,
        dueDate: form.dueDate || null,
        appointmentAt: form.appointmentAt || null,
        location: form.location,
        veterinarian: form.veterinarian,
        notes: form.notes
      });

      setForm(blankEvent);
      setShowAdd(false);
      setMessage('Vet event added.');
      await load();
    } catch (err) {
      console.error(err);
      setMessage(err.message || 'Could not add vet event.');
    }
  }

  async function markComplete(eventId) {
    try {
      await completeVetEvent({ eventId, completedBy: completedBy || 'Unknown' });
      setMessage('Vet event completed.');
      await load();
    } catch (err) {
      console.error(err);
      setMessage(err.message || 'Could not complete event.');
    }
  }

  async function removeEvent(eventId) {
    if (!window.confirm('Delete this vet event?')) return;

    try {
      await deleteVetEvent(eventId);
      setMessage('Vet event deleted.');
      await load();
    } catch (err) {
      console.error(err);
      setMessage(err.message || 'Could not delete event.');
    }
  }

  function EventCard({ event }) {
    const status = getVetEventStatus(event);
    const date = eventDateValue(event);

    return (
      <div className={`vetEventCard ${statusClass(status)}`}>
        <div className="vetEventIcon">
        </div>

        <div className="vetEventMain">
          <div className="vetEventTitle">
            <b>{event.event_name} </b>
            <span>{status}</span>
          </div>

          <small>
            {event.event_type} · {getAnimalName(animals, event.animal_id)} · {getAnimalKennel(animals, event.animal_id) }
          </small>

          {event.appointment_at ? (
            <small className="vetTimeLine">
              <Clock size={13}/>
              {new Date(event.appointment_at).toLocaleString()}
            </small>
          ) : (
            <small className="vetTimeLine">
              <CalendarDays size={13}/>
              {date}
            </small>
          )}

          {(event.location || event.veterinarian) && (
            <small>{[event.location, event.veterinarian].filter(Boolean).join(' · ')}</small>
          )}

          {event.notes && <p>{event.notes}</p>}
        </div>

        <div className="vetEventActions">
          <button type="button" onClick={() => markComplete(event.id)} title="Complete">
            <CheckCircle2 size={18}/>
          </button>

          <button type="button" onClick={() => removeEvent(event.id)} title="Delete">
            <Trash2 size={18}/>
          </button>
        </div>
      </div>
    );
  }

  return (
    <main className="vetCalendarPage">
      <div className="roundsTop">
        <button type="button" className="roundsClose" onClick={() => setPage('dashboard')}>
          <ArrowLeft size={20}/>
        </button>
        <h1>Vet Calendar</h1>
        <span/>
      </div>

      <section className="vetCalendarHero improved">
        <div>
          <h2><CalendarDays size={38}/>Vaccines & Appointments</h2>
          <small>Track vaccines, boosters, spay/neuter, outside appointments, and follow-ups.</small>
        </div>
      </section>

      {grouped.length === 0 ? (
        <section className="vetCalendarEmpty">
          <CheckCircle2 size={34}/>
          <h2>No vet events found</h2>
          <p>Add a vaccine, appointment, surgery, or follow-up.</p>
        </section>
      ) : (
        <div className="vetDateGroups improved">
          {grouped.map(([date, eventsForDate]) => (
            <section className="vetDateGroup improved" key={date}>
              <div className="vetDateHeader">
                <h2>{formatDateLabel(date)}</h2>
                <span>{eventsForDate.length}</span>
              </div>

              <div className="vetEventList">
                {eventsForDate.map(event => (
                  <EventCard key={event.id} event={event}/>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <section className="vetStatsGrid improved">
        <button type="button" className={counts.overdue ? 'danger' : ''} onClick={() => setFilter('All')}>
          <b>{counts.overdue}</b>
          <small>Overdue</small>
        </button>

        <button type="button" className={counts.dueSoon ? 'warning' : ''} onClick={() => setFilter('All')}>
          <b>{counts.dueSoon}</b>
          <small>Due in 7 Days</small>
        </button>

        <button type="button" onClick={() => setFilter('All')}>
          <b>{counts.total}</b>
          <small>Open Items</small>
        </button>
      </section>

      <section className="vetQuickAddPanel">
        <QuickTemplateButton label="💉" type="Vaccine" name="Add Vaccine" onClick={openQuickAdd}/>
        <QuickTemplateButton label="📅" type="Vet Appointment" name="Add Appointment" onClick={openQuickAdd}/>
        <QuickTemplateButton label="🐾" type="Spay/Neuter" name="Spay/Neuter" onClick={openQuickAdd}/>
        <QuickTemplateButton label="🔁" type="Follow Up" name="Follow Up" onClick={openQuickAdd}/>
      </section>

      <section className="vetCalendarToolbar improved">
        <label className="vetSearchBox">
          <Search size={16}/>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search cat, event, clinic..."
          />
        </label>

        <label>
          <Filter size={16}/>
          Filter
          <select value={filter} onChange={e => setFilter(e.target.value)}>
            <option>All</option>
            {vetEventTypes.map(type => <option key={type}>{type}</option>)}
          </select>
        </label>

        <label>
          Completed By
          <input value={completedBy} onChange={e => setCompletedBy(e.target.value)} placeholder="Initials"/>
        </label>

        <button type="button" className="roundPrimary" onClick={() => openQuickAdd('Vaccine', '')}>
          <Plus size={18}/>
          Add Event
        </button>
      </section>

      {message && <p className={message.includes('Could') ? 'error' : 'success'}>{message}</p>}

      {showAdd && (
        <form className="vetEventForm improved" onSubmit={submitEvent}>
          <div className="vetFormHeader">
            <div>
              <h2>Add Vet Event</h2>
              <small>Choose any active rescue cat that is not archived/adopted.</small>
            </div>

            <button type="button" onClick={() => setShowAdd(false)}>
              <X size={18}/>
            </button>
          </div>

          <label className="wide">
            Cat
            <select value={form.animalId} onChange={e => setField('animalId', e.target.value)}>
              <option value="">Select cat...</option>
              {animals.map(animal => (
                <option key={animal.id} value={animal.id}>
                  {animal.name} — {animal.kennel || animal.shelterluv_status || 'Unassigned'}
                </option>
              ))}
            </select>
          </label>

          <label>
            Event Type
            <select value={form.eventType} onChange={e => setField('eventType', e.target.value)}>
              {vetEventTypes.map(type => <option key={type}>{type}</option>)}
            </select>
          </label>

          <label>
            Event Name
            <input
              value={form.eventName}
              onChange={e => setField('eventName', e.target.value)}
              placeholder="FVRCP booster / spay appointment"
            />
          </label>

          <label>
            Due Date
            <input
              type="date"
              value={form.dueDate}
              onChange={e => setField('dueDate', e.target.value)}
            />
          </label>

          <label>
            Appointment Date/Time
            <input
              type="datetime-local"
              value={form.appointmentAt}
              onChange={e => setField('appointmentAt', e.target.value)}
            />
          </label>

          <label>
            Location
            <input
              value={form.location}
              onChange={e => setField('location', e.target.value)}
              placeholder="Clinic / rescue / mobile vet"
            />
          </label>

          <label>
            Veterinarian
            <input
              value={form.veterinarian}
              onChange={e => setField('veterinarian', e.target.value)}
              placeholder="Vet name"
            />
          </label>

          <label className="wide">
            Notes
            <textarea
              value={form.notes}
              onChange={e => setField('notes', e.target.value)}
              placeholder="Optional notes..."
              rows="3"
            />
          </label>

          <button className="roundPrimary wide">Save Vet Event</button>
        </form>
      )}

      {/* {grouped.length === 0 ? (
        <section className="vetCalendarEmpty">
          <CheckCircle2 size={34}/>
          <h2>No vet events found</h2>
          <p>Add a vaccine, appointment, surgery, or follow-up.</p>
        </section>
      ) : (
        <div className="vetDateGroups improved">
          {grouped.map(([date, eventsForDate]) => (
            <section className="vetDateGroup improved" key={date}>
              <div className="vetDateHeader">
                <h2>{formatDateLabel(date)}</h2>
                <span>{eventsForDate.length}</span>
              </div>

              <div className="vetEventList">
                {eventsForDate.map(event => (
                  <EventCard key={event.id} event={event}/>
                ))}
              </div>
            </section>
          ))}
        </div>
      )} */}
    </main>
  );
}
