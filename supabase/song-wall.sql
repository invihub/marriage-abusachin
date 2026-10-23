-- Sangeet Mixtape: the shared song list for the Abu & Sachin wedding site.
-- Guests name songs they want to dance to, or back a song already on the list.
-- Each guest (one browser) holds a fixed number of picks; songs sort by how
-- many guests back them.
--
-- Run once in Supabase: Dashboard -> SQL Editor -> New query -> paste -> Run.
-- Needs the abu_sachin schema from rsvps.sql (already in Exposed schemas).
-- Safe to re-run.
--
-- Design in one line: a song exists only while at least one guest claims it,
-- and songs.count is how many guests claim it. Every rule lives here, so
-- calling the public API directly cannot get around them.

-- =====================================================================
--  HOW MANY SONGS ONE GUEST MAY HOLD: change the number here, re-run this
--  file and reload the site. The page asks the database for it on load.
-- =====================================================================
create or replace function abu_sachin.max_picks() returns integer
  language sql immutable parallel safe as $$ select 3 $$;

-- ---------------------------------------------------------------------
--  songs: one row per distinct title
-- ---------------------------------------------------------------------
--  name_key ignores case and extra spaces, so "Mental Manadhil" and
--  "  mental  manadhil " are the same song: the second guest backs it
--  instead of adding a duplicate.
create table if not exists abu_sachin.songs (
  id         uuid primary key default gen_random_uuid(),
  name       text        not null,
  name_key   text        generated always as (lower(btrim(regexp_replace(name, '\s+', ' ', 'g')))) stored,
  count      integer     not null default 0,
  created_by text        not null,
  created_at timestamptz not null default now(),
  constraint songs_name_len check (char_length(btrim(name)) between 1 and 80)
);

create unique index if not exists songs_name_key_idx on abu_sachin.songs (name_key);
create index        if not exists songs_order_idx    on abu_sachin.songs (count desc, created_at asc);

-- ---------------------------------------------------------------------
--  song_claims: one row per (guest, song)
-- ---------------------------------------------------------------------
--  Recording a new song and backing someone else's both make one claim;
--  `kind` tells them apart ('new' gets a remove button, 'boost' toggles on
--  tap). device_id is a random id the guest's browser keeps; no sign-in.
create table if not exists abu_sachin.song_claims (
  song_id    uuid        not null references abu_sachin.songs (id) on delete cascade,
  device_id  text        not null,
  kind       text        not null check (kind in ('new', 'boost')),
  created_at timestamptz not null default now(),
  primary key (song_id, device_id),
  constraint claims_device_len check (char_length(device_id) between 8 and 64)
);

create index if not exists song_claims_device_idx on abu_sachin.song_claims (device_id, created_at);

-- ---------------------------------------------------------------------
--  songs.count follows the claims; the last claim gone takes the song too
-- ---------------------------------------------------------------------
create or replace function abu_sachin.sync_song_count() returns trigger
language plpgsql set search_path = abu_sachin as $$
declare
  v_song uuid := coalesce(new.song_id, old.song_id);
  v_n    integer;
begin
  select count(*) into v_n from song_claims where song_id = v_song;
  if v_n = 0 then
    delete from songs where id = v_song;
  else
    update songs set count = v_n where id = v_song;
  end if;
  return null;
end $$;

drop trigger if exists song_claims_count on abu_sachin.song_claims;
create trigger song_claims_count
  after insert or delete on abu_sachin.song_claims
  for each row execute function abu_sachin.sync_song_count();

-- ---------------------------------------------------------------------
--  Picks per guest, enforced on the table itself. The lock stops two quick
--  taps from the same guest both slipping under the limit.
-- ---------------------------------------------------------------------
create or replace function abu_sachin.enforce_claim_limit() returns trigger
language plpgsql set search_path = abu_sachin as $$
begin
  perform pg_advisory_xact_lock(hashtext('abu_sachin.song_claims:' || new.device_id));
  if (select count(*) from song_claims where device_id = new.device_id) >= max_picks() then
    raise exception 'claim_limit';
  end if;
  return new;
end $$;

drop trigger if exists song_claims_limit on abu_sachin.song_claims;
create trigger song_claims_limit
  before insert on abu_sachin.song_claims
  for each row execute function abu_sachin.enforce_claim_limit();

-- ---------------------------------------------------------------------
--  claim_song: record a new song or back an existing one
-- ---------------------------------------------------------------------
--  Find-or-create and claim in one transaction: if the claim is refused
--  (limit reached, already yours) a song row it just made is rolled back.
create or replace function abu_sachin.claim_song(p_name text, p_device_id text)
returns table (song_id uuid, kind text)
language plpgsql security definer set search_path = abu_sachin as $$
declare
  v_name text := btrim(regexp_replace(coalesce(p_name, ''), '\s+', ' ', 'g'));
  v_key  text := lower(btrim(regexp_replace(coalesce(p_name, ''), '\s+', ' ', 'g')));
  v_id   uuid;
  v_kind text;
begin
  if char_length(v_name) < 1 or char_length(v_name) > 80 then
    raise exception 'bad_name';
  end if;
  if p_device_id is null or not (char_length(p_device_id) between 8 and 64) then
    raise exception 'bad_device';
  end if;

  select s.id into v_id from songs s where s.name_key = v_key;

  if v_id is null then
    insert into songs (name, created_by) values (v_name, p_device_id)
      on conflict (name_key) do nothing
      returning id into v_id;
    if v_id is null then                       -- two guests at once: join theirs
      select s.id into v_id from songs s where s.name_key = v_key;
      v_kind := 'boost';
    else
      v_kind := 'new';
    end if;
  else
    v_kind := 'boost';
  end if;

  if exists (select 1 from song_claims c where c.song_id = v_id and c.device_id = p_device_id) then
    raise exception 'already_claimed';
  end if;

  insert into song_claims (song_id, device_id, kind) values (v_id, p_device_id, v_kind);

  return query select v_id, v_kind;
end $$;

-- ---------------------------------------------------------------------
--  release_claim: remove my song / take my vote back (only my own claim)
-- ---------------------------------------------------------------------
create or replace function abu_sachin.release_claim(p_song_id uuid, p_device_id text)
returns boolean
language plpgsql security definer set search_path = abu_sachin as $$
declare v_n integer;
begin
  delete from song_claims where song_id = p_song_id and device_id = p_device_id;
  get diagnostics v_n = row_count;
  return v_n > 0;
end $$;

-- ---------------------------------------------------------------------
--  my_claims: this browser's own picks, oldest first
-- ---------------------------------------------------------------------
--  Claims are not readable directly, so nobody can collect other guests'
--  device ids (which would let them remove other guests' picks).
create or replace function abu_sachin.my_claims(p_device_id text)
returns table (song_id uuid, kind text, created_at timestamptz)
language sql stable security definer set search_path = abu_sachin as $$
  select c.song_id, c.kind, c.created_at
  from song_claims c
  where c.device_id = p_device_id
  order by c.created_at;
$$;

-- ---------------------------------------------------------------------
--  Permissions: the publishable key is public, so the public may only
--  read song titles and counts and call the four functions above.
-- ---------------------------------------------------------------------
alter table abu_sachin.songs       enable row level security;
alter table abu_sachin.song_claims enable row level security;

drop policy if exists "Songs are public" on abu_sachin.songs;
create policy "Songs are public" on abu_sachin.songs for select to anon, authenticated using (true);

revoke all on abu_sachin.songs       from anon, authenticated;
revoke all on abu_sachin.song_claims from anon, authenticated;
grant select (id, name, count, created_at) on abu_sachin.songs to anon, authenticated;
grant all on abu_sachin.songs, abu_sachin.song_claims to service_role;

revoke execute on function abu_sachin.sync_song_count()      from public;
revoke execute on function abu_sachin.enforce_claim_limit()  from public;
revoke execute on function abu_sachin.claim_song(text, text) from public;
revoke execute on function abu_sachin.release_claim(uuid, text) from public;
revoke execute on function abu_sachin.my_claims(text)        from public;

grant execute on function abu_sachin.max_picks()              to anon, authenticated;
grant execute on function abu_sachin.claim_song(text, text)    to anon, authenticated;
grant execute on function abu_sachin.release_claim(uuid, text) to anon, authenticated;
grant execute on function abu_sachin.my_claims(text)           to anon, authenticated;

-- let the API see the new tables and functions straight away
notify pgrst, 'reload schema';

-- ---------------------------------------------------------------------
--  Housekeeping (run by hand in the SQL editor)
-- ---------------------------------------------------------------------
--  · Clear the list:        truncate abu_sachin.song_claims, abu_sachin.songs;
--  · Remove one song:       delete from abu_sachin.songs where name ilike '%...%';
--  · See who backs what:    select s.name, s.count from abu_sachin.songs s order by s.count desc;
