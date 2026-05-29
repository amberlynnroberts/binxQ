import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, CalendarDays, CheckCircle2, Filter, Plus, Syringe, Trash2 } from 'lucide-react';
import { addVetEvent, completeVetEvent, deleteVetEvent, eventDateValue, fetchVetEvents, getVetEventStatus, todayDateString, vetEventTypes } from '../lib/vetEventsApi';
import { isQuarantineAnimal, isInRescueAnimal, isArchivedAnimal } from '../lib/animalFilters';

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

export function VetCalendar({ data, setPage }) {
  const animals = (data?.animals || []).filter(animal => !isArchivedAnimal(animal));
  const [animalGroup, setAnimalGroup] = useState('quarantine');

  const selectableAnimals = useMemo(() => {
    if (animalGroup === 'quarantine') {
      return animals.filter(isQuarantineAnimal);
    }

    if (animalGroup === 'adoption') {
      return animals.filter(isInRescueAnimal);
    }

    return animals;
  }, [animals, animalGroup]);
  const [events, setEvents] = useState([]);
  const [form, setForm] = useState(blankEvent);
  const [showAdd, setShowAdd] = useState(false);
  const [filter, setFilter] = useState('All');
  const [completedBy, setCompletedBy] = useState('');
  const [message, setMessage] = useState('');

  async function load() {
    const rows = await fetchVetEvents({ includeCompleted: false });
    setEvents(rows);
  }

  useEffect(() => {
    load().catch(console.error);
  }, []);

  const filteredEvents = useMemo(() => {
    if (filter === 'All') return events;
    return events.filter(event => event.event_type === filter);
  }, [events, filter]);

  const grouped = useMemo(() => groupByDate(filteredEvents), [filteredEvents]);

  const counts = useMemo(() => {
    return {
      overdue: events.filter(e => getVetEventStatus(e) === 'Overdue').length,
      dueSoon: events.filter(e => getVetEventStatus(e) === 'Due Soon').length,
      total: events.length
    };
  }, [events]);

  function setField(key, value) {
    setForm(prev => ({ ...prev, [key]: value }));
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
      await completeVetEvent({
        eventId,
        completedBy: completedBy || 'Unknown'
      });

      setMessage('Vet event completed.');
      await load();
    } catch (err) {
      console.error(err);
      setMessage(err.message || 'Could not complete event.');
    }
  }

  async function removeEvent(eventId) {
    if (!window.confirm('Delete this vet event?')) return;
    await deleteVetEvent(eventId);
    setMessage('Vet event deleted.');
    await load();
  }

  function EventCard({ event }) {
    const status = getVetEventStatus(event);

    return (
      <div className={`vetEventCard ${statusClass(status)}`}>
        <div className="vetEventIcon">
          <Syringe size={22}/>
        </div>

        <div className="vetEventMain">
          <div className="vetEventTitle">
            <b>{event.event_name}</b>
            <span>{status}</span>
          </div>

          <small>
            {event.event_type} · {getAnimalName(animals, event.animal_id)} · {getAnimalKennel(animals, event.animal_id)}
          </small>

          {event.appointment_at && (
            <small>Appointment: {new Date(event.appointment_at).toLocaleString()}</small>
          )}

          {event.due_date && !event.appointment_at && (
            <small>Due: {event.due_date}</small>
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

      <section className="vetCalendarHero">
        <div>
          <p>Vet Calendar</p>
          <h2>Vaccines & Appointments</h2>
          <small>Shows vaccines, spay/neuter, vet visits, boosters, and follow-ups.</small>
        </div>

        <CalendarDays size={36}/>
      </section>

      <section className="vetStatsGrid">
        <div className={counts.overdue ? 'danger' : ''}>
          <b>{counts.overdue}</b>
          <small>Overdue</small>
        </div>

        <div className={counts.dueSoon ? 'warning' : ''}>
          <b>{counts.dueSoon}</b>
          <small>Due in 7 Days</small>
        </div>

        <div>
          <b>{counts.total}</b>
          <small>Total Open</small>
        </div>
      </section>

      <section className="vetCalendarToolbar">
        <button type="button" className="roundPrimary" onClick={() => setShowAdd(prev => !prev)}>
          <Plus size={18}/>
          Add Vaccine / Appointment
        </button>

        <label>
          Completed By
          <input value={completedBy} onChange={e => setCompletedBy(e.target.value)} placeholder="Initials"/>
        </label>

        <label>
          <Filter size={16}/>
          Filter
          <select value={filter} onChange={e => setFilter(e.target.value)}>
            <option>All</option>
            {vetEventTypes.map(type => <option key={type}>{type}</option>)}
          </select>
        </label>
      </section>

      {message && <p className={message.includes('Could') ? 'error' : 'success'}>{message}</p>}

      {showAdd && (
        <form className="vetEventForm" onSubmit={submitEvent}>
          <div className="vetAnimalTabs">
            <button
              type="button"
              className={animalGroup === 'quarantine' ? 'active' : ''}
              onClick={() => {
                setAnimalGroup('quarantine');
                setField('animalId', '');
              }}
            >
              Quarantine Cats
            </button>

            <button
              type="button"
              className={animalGroup === 'adoption' ? 'active' : ''}
              onClick={() => {
                setAnimalGroup('adoption');
                setField('animalId', '');
              }}
            >
              Available for Adoption
            </button>
          </div>

          <label>
            Cat
            <select value={form.animalId} onChange={e => setField('animalId', e.target.value)}>
              <option value="">Select cat...</option>

              {selectableAnimals.map(animal => (
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
              placeholder="FVRCP Booster / Spay Appointment"
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

          <label>
            Notes
            <textarea
              value={form.notes}
              onChange={e => setField('notes', e.target.value)}
              placeholder="Optional notes..."
              rows="3"
            />
          </label>

          <button className="roundPrimary">Save Vet Event</button>
        </form>
      )}

      {grouped.length === 0 ? (
        <section className="vetCalendarEmpty">
          <CheckCircle2 size={34}/>
          <h2>No vet events</h2>
          <p>Add a vaccine, appointment, surgery, or follow-up.</p>
        </section>
      ) : (
        <div className="vetDateGroups">
          {grouped.map(([date, eventsForDate]) => (
            <section className="vetDateGroup" key={date}>
              <h2>{date}</h2>

              <div className="vetEventList">
                {eventsForDate.map(event => (
                  <EventCard key={event.id} event={event}/>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </main>
  );
}
