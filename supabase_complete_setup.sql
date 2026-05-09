create extension if not exists pgcrypto;

create table if not exists kennels (
  kennel_number text primary key,
  created_at timestamp with time zone default now()
);

create table if not exists shelterluv_animals (
  id uuid primary key default gen_random_uuid(),
  shelterluv_id text unique not null,
  name text not null,
  species text default 'Cat',
  sex text,
  age text,
  color text,
  intake_date date,
  status text default 'In Shelter',
  location text,
  photo_url text,
  created_at timestamp with time zone default now()
);

create table if not exists animals (
  id uuid primary key default gen_random_uuid(),
  shelterluv_id text unique references shelterluv_animals(shelterluv_id) on delete cascade,
  kennel_number text references kennels(kennel_number),
  local_status text default 'Quarantine',
  last_synced_at timestamp with time zone,
  removed_at timestamp with time zone,
  removal_reason text,
  created_at timestamp with time zone default now()
);

create table if not exists medications (
  id uuid primary key default gen_random_uuid(),
  animal_id uuid references animals(id) on delete cascade,
  medication_name text not null,
  dosage_notes text,
  schedule text default 'AM',
  next_due text,
  active boolean default true,
  created_at timestamp with time zone default now()
);

create table if not exists med_logs (
  id uuid primary key default gen_random_uuid(),
  medication_id uuid references medications(id) on delete set null,
  animal_id uuid references animals(id) on delete cascade,
  given_at timestamp with time zone default now(),
  given_by text,
  notes text
);

create table if not exists symptoms (
  id uuid primary key default gen_random_uuid(),
  animal_id uuid references animals(id) on delete cascade,
  symptom text not null,
  active boolean default true,
  created_by text,
  resolved_at timestamp with time zone,
  created_at timestamp with time zone default now()
);

create table if not exists notes (
  id uuid primary key default gen_random_uuid(),
  animal_id uuid references animals(id) on delete cascade,
  note text not null,
  created_by text default 'You',
  created_at timestamp with time zone default now()
);

create table if not exists shift_checks (
  id uuid primary key default gen_random_uuid(),
  animal_id uuid references animals(id) on delete cascade,
  shift text,
  eating boolean default false,
  stool_ok boolean default false,
  water_ok boolean default false,
  cleaned boolean default false,
  concern boolean default false,
  initials text,
  created_at timestamp with time zone default now()
);

insert into kennels (kennel_number)
values
('Quarantine Kennel 1'),
('Quarantine Kennel 2'),
('Quarantine Kennel 3'),
('Quarantine Kennel 4'),
('Quarantine Kennel 5'),
('Quarantine Kennel 6'),
('Quarantine Kennel 7'),
('Quarantine Kennel 8'),
('Quarantine Kennel 9')
on conflict (kennel_number) do nothing;

insert into shelterluv_animals (
  shelterluv_id, name, species, sex, age, color, intake_date, status, location
)
values
('SL-1001', 'Gorilla', 'Cat', 'Male', 'Kitten', 'Black DSH', current_date - 2, 'In Shelter', 'Quarantine Kennel 1'),
('SL-1002', 'Luna', 'Cat', 'Female', '8 weeks', 'Gray tabby', current_date - 3, 'In Shelter', 'Quarantine Kennel 2'),
('SL-1003', 'Milo', 'Cat', 'Male', '9 weeks', 'Black and white', current_date - 1, 'In Shelter', 'Quarantine Kennel 3'),
('SL-1004', 'Pepper', 'Cat', 'Female', '10 weeks', 'Tuxedo', current_date - 4, 'In Shelter', 'Quarantine Kennel 4'),
('SL-1005', 'Simba', 'Cat', 'Male', '12 weeks', 'Orange tabby', current_date - 5, 'In Shelter', 'Quarantine Kennel 5'),
('SL-1006', 'Willow', 'Cat', 'Female', '6 months', 'Gray DSH', current_date - 6, 'In Shelter', 'Quarantine Kennel 6')
on conflict (shelterluv_id) do update set
  name = excluded.name,
  species = excluded.species,
  sex = excluded.sex,
  age = excluded.age,
  color = excluded.color,
  intake_date = excluded.intake_date,
  status = excluded.status,
  location = excluded.location;

create or replace function sync_from_mock_shelterluv()
returns integer
language plpgsql
as $$
declare
  synced_count integer;
begin
  insert into kennels (kennel_number)
  select distinct location
  from shelterluv_animals
  where location is not null and location <> ''
  on conflict (kennel_number) do nothing;

  insert into animals (shelterluv_id, kennel_number, local_status, last_synced_at)
  select
    s.shelterluv_id,
    s.location,
    case
      when lower(coalesce(s.location,'')) like '%quarantine%' then 'Quarantine'
      else 'Monitor'
    end,
    now()
  from shelterluv_animals s
  on conflict (shelterluv_id) do update set
    kennel_number = excluded.kennel_number,
    local_status = case
      when animals.local_status = 'Removed' then animals.local_status
      else excluded.local_status
    end,
    last_synced_at = now();

  get diagnostics synced_count = row_count;
  return synced_count;
end;
$$;

select sync_from_mock_shelterluv();

insert into symptoms (animal_id, symptom, active, created_by)
select a.id, 'Diarrhea', true, 'Seed'
from animals a join shelterluv_animals s on s.shelterluv_id = a.shelterluv_id
where s.name = 'Gorilla'
and not exists (select 1 from symptoms x where x.animal_id = a.id and x.symptom = 'Diarrhea');

insert into medications (animal_id, medication_name, dosage_notes, schedule, next_due, active)
select a.id, 'Tobramycin', '1 drop both eyes', 'PM', '6:30 PM', true
from animals a join shelterluv_animals s on s.shelterluv_id = a.shelterluv_id
where s.name = 'Gorilla'
and not exists (select 1 from medications m where m.animal_id = a.id and m.medication_name = 'Tobramycin');

insert into notes (animal_id, note, created_by)
select a.id, 'White diarrhea continues. Eating well.', 'Seed'
from animals a join shelterluv_animals s on s.shelterluv_id = a.shelterluv_id
where s.name = 'Gorilla'
and not exists (select 1 from notes n where n.animal_id = a.id and n.note = 'White diarrhea continues. Eating well.');

insert into storage.buckets (id, name, public)
values ('animal-photos', 'animal-photos', true)
on conflict (id) do update set public = true;

drop policy if exists "Public animal photo read" on storage.objects;
create policy "Public animal photo read"
on storage.objects for select using (bucket_id = 'animal-photos');

drop policy if exists "Public animal photo upload" on storage.objects;
create policy "Public animal photo upload"
on storage.objects for insert with check (bucket_id = 'animal-photos');

drop policy if exists "Public animal photo update" on storage.objects;
create policy "Public animal photo update"
on storage.objects for update using (bucket_id = 'animal-photos') with check (bucket_id = 'animal-photos');

drop policy if exists "Public animal photo delete" on storage.objects;
create policy "Public animal photo delete"
on storage.objects for delete using (bucket_id = 'animal-photos');

alter table kennels disable row level security;
alter table shelterluv_animals disable row level security;
alter table animals disable row level security;
alter table medications disable row level security;
alter table med_logs disable row level security;
alter table symptoms disable row level security;
alter table notes disable row level security;
alter table shift_checks disable row level security;

create index if not exists idx_animals_status on animals(local_status);
create index if not exists idx_animals_kennel on animals(kennel_number);
create index if not exists idx_animals_removed on animals(removed_at);