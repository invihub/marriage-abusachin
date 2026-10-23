-- Organizer access to the RSVPs (organizer.html), behind a password.
-- Run once in the Supabase SQL editor, after rsvps.sql. Safe to re-run.
--
-- The password is never in the website or in this file: the page sends what
-- the organizer types to organizer_login(), which compares it here with a
-- bcrypt hash and hands back a sign-in that lasts 12 hours.
--
-- SET OR CHANGE THE PASSWORD: in the SQL editor (not in a file), run
--     select abu_sachin.set_organizer_password('the password');
-- Changing it signs everyone out. Only the SQL editor can run that function;
-- the website cannot.

create extension if not exists pgcrypto with schema extensions;

-- the password's hash (a single row)
create table if not exists abu_sachin.organizer_settings (
  id            boolean primary key default true check (id),
  password_hash text not null
);

-- who is signed in, until when
create table if not exists abu_sachin.organizer_sessions (
  token      uuid primary key default gen_random_uuid(),
  expires_at timestamptz not null default now() + interval '12 hours'
);

-- wrong passwords, to slow down anyone guessing
create table if not exists abu_sachin.organizer_failed_logins (
  at timestamptz not null default now()
);

-- Nobody reaches these tables directly; only the functions below use them
alter table abu_sachin.organizer_settings enable row level security;
alter table abu_sachin.organizer_sessions enable row level security;
alter table abu_sachin.organizer_failed_logins enable row level security;
revoke all on abu_sachin.organizer_settings, abu_sachin.organizer_sessions,
  abu_sachin.organizer_failed_logins from anon, authenticated;


-- Set or change the password (SQL editor only)
create or replace function abu_sachin.set_organizer_password(new_password text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if char_length(coalesce(new_password, '')) < 8 then
    raise exception 'The password must be at least 8 characters';
  end if;
  insert into abu_sachin.organizer_settings (id, password_hash)
  values (true, extensions.crypt(new_password, extensions.gen_salt('bf', 10)))
  on conflict (id) do update set password_hash = excluded.password_hash;
  delete from abu_sachin.organizer_sessions;
end;
$$;

revoke execute on function abu_sachin.set_organizer_password(text) from public, anon, authenticated;


-- Sign in: {"ok": true, "token": "..."} or {"ok": false, "reason": "wrong" | "locked" | "unset"}
create or replace function abu_sachin.organizer_login(password text)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  stored text;
  new_token uuid;
begin
  -- at most 20 wrong passwords in 10 minutes, from anyone
  if (select count(*) from abu_sachin.organizer_failed_logins
      where at > now() - interval '10 minutes') >= 20 then
    return json_build_object('ok', false, 'reason', 'locked');
  end if;

  select password_hash into stored from abu_sachin.organizer_settings where id;
  if stored is null then
    return json_build_object('ok', false, 'reason', 'unset');
  end if;

  if password is null or extensions.crypt(password, stored) <> stored then
    insert into abu_sachin.organizer_failed_logins default values;
    perform pg_sleep(1);
    return json_build_object('ok', false, 'reason', 'wrong');
  end if;

  -- tidy up old rows, then start a session
  delete from abu_sachin.organizer_sessions where expires_at < now();
  delete from abu_sachin.organizer_failed_logins where at < now() - interval '1 day';
  insert into abu_sachin.organizer_sessions default values returning token into new_token;
  return json_build_object('ok', true, 'token', new_token);
end;
$$;


-- The RSVPs, newest first: {"ok": true, "rsvps": [...]} or {"ok": false, "reason": "expired"}
create or replace function abu_sachin.organizer_rsvps(session_token uuid)
returns json
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from abu_sachin.organizer_sessions s
                 where s.token = session_token and s.expires_at > now()) then
    return json_build_object('ok', false, 'reason', 'expired');
  end if;

  return json_build_object('ok', true, 'rsvps', coalesce((
    select json_agg(json_build_object(
             'id', r.id,
             'created_at', r.created_at,
             'guest_name', r.guest_name,
             'events', r.events,
             'people_count', r.people_count,
             'message', r.message,
             'phone', r.phone,
             'email', r.email
           ) order by r.created_at desc)
    from abu_sachin.rsvps r
  ), '[]'::json));
end;
$$;


-- Sign out
create or replace function abu_sachin.organizer_logout(session_token uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from abu_sachin.organizer_sessions where token = session_token;
$$;


-- The website (publishable key) may call these three, nothing else
revoke execute on function abu_sachin.organizer_login(text),
  abu_sachin.organizer_rsvps(uuid), abu_sachin.organizer_logout(uuid) from public;
grant execute on function abu_sachin.organizer_login(text),
  abu_sachin.organizer_rsvps(uuid), abu_sachin.organizer_logout(uuid) to anon, authenticated;

-- let the API see the new functions straight away
notify pgrst, 'reload schema';
