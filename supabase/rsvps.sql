-- RSVP storage for the Abu & Sachin wedding site.
-- Lives in its own schema ("folder") so this Supabase project can serve other sites too.
-- Run once in Supabase: Dashboard -> SQL Editor -> New query -> paste -> Run.
-- Then: Project Settings -> Data API -> Exposed schemas -> add "abu_sachin" -> Save.
-- Safe to re-run.

create schema if not exists abu_sachin;

create table if not exists abu_sachin.rsvps (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  guest_name   text not null check (char_length(btrim(guest_name)) between 1 and 120),
  events       text[] not null check (
                 cardinality(events) between 1 and 5
                 and events <@ array['haldi', 'sangeet', 'wedding_thoothukudi', 'wedding_chennai', 'reception_chennai']
               ),
  people_count smallint not null check (people_count between 1 and 20),
  message      text check (char_length(message) <= 1000),
  -- Optional, not collected by the website yet
  phone        text check (char_length(phone) <= 30),
  email        text check (char_length(email) <= 254)
);

-- Row Level Security: the public website may only ADD rows.
-- Nobody using the publishable key can read, change or delete RSVPs
-- (guests' names, phones and emails stay private). View them in the
-- Supabase Table Editor (schema: abu_sachin), which can also export CSV.
alter table abu_sachin.rsvps enable row level security;

drop policy if exists "Guests can submit an RSVP" on abu_sachin.rsvps;
create policy "Guests can submit an RSVP"
  on abu_sachin.rsvps
  for insert
  to anon
  with check (true);

-- The API roles need to "see" the schema; the secret key (service_role) is for admin use
grant usage on schema abu_sachin to anon, authenticated, service_role;
grant all on abu_sachin.rsvps to service_role;

-- Column-level: guests can only fill the form fields, not id/created_at/phone/email
revoke all on abu_sachin.rsvps from anon, authenticated;
grant insert (guest_name, events, people_count, message) on abu_sachin.rsvps to anon;
