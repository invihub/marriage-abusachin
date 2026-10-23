# Abu & Sachin · Wedding Invitation

A mobile-first wedding invitation website for **Abu** (Thoothukudi) and **Sachin** (Chennai), celebrating their 11-year journey. Plain HTML, CSS and JavaScript, with no framework or build step. RSVPs are stored in Supabase.

Live: https://invihub.github.io/marriage-abusachin/

## What's on the page

1. **Temple gate:** a full-screen gopuram photo. Guests ring the temple bell in the doorway to enter.
2. **Invitation:** names, the couple's quote and a live countdown to the Muhurtham (6 Dec 2026, 09:45 IST).
3. **Pearl City Express:** an 11-year timeline told as a train. Scrolling moves the coaches sideways:
   2014 KCG College · 2015 First movie date · 2018–19 Tuticorin to Toronto · 2019–26 The Canada chapter · 2026 Marriage.
4. **Celebration wheel:** the five ceremonies on a slowly turning wheel. Tapping a section, or a venue button below the wheel, opens Google Maps.
5. **RSVP:** name, ceremonies, number of people and a wish, saved to Supabase.
6. **Sangeet Mixtape:** guests record songs they want to dance to, or tap a song on the shared tracklist to back it. Each guest has 3 picks. While they type, a glass piano key presses for each letter and 1 to 4 notes light up on two staves of music. Each song on the tracklist is a small cassette: the left reel shows its votes, the right reel backs it (+1), shows your vote (✓) or removes your own song (×).
7. **Gallery:** five illustrated memories, each opening full size when tapped.
8. **Travel & hotels** and **iconic places** in Thoothukudi and Chennai.
9. **Music:** the "Our Soundtrack" cassette player plays every song in `songs/`. The first song starts by itself as the guest walks through the temple gate, just after the bell (unless they have already used the player). It plays for 1 minute, fades out and stops. The next song then waits in the player for the guest to press play. While a song plays, a soft gold light runs round the player's buttons. Songs download only when played.

   - **Add, remove or reorder songs:** put audio files in `songs/` and number them (`01-Theera-Ulaa.mp3`, `02-...`); they play in that order, and the player shows the name without the number. Then run `node scripts/build-songs.mjs`. The deploy does this automatically.
   - **Change how long a song plays:** `maxPlaySeconds` at the top of `js/audio.js` (`0` = the whole song).

Snow falls over the page, the cards use a clear "liquid glass" finish, and the page works on phones first.

## Background themes (trial)

There are three backgrounds: **Original** (white marble with a light sheen), **Ice** (Frozen-style crystals) and **Aurora** (night sky with northern lights). While the trial runs, the **Background** button at the bottom-left switches between them, or add `?bg=original`, `?bg=ice` or `?bg=aurora` to the address.

To make one permanent, set it on the `<html>` tag in `index.html` (for example `data-bg="aurora"`), remove the trial button and script, and delete the other themes' blocks in `css/backgrounds.css`.

## Project layout

```
index.html                 the whole page
css/style.css              layout, components, glass finish, phone layouts
css/mixtape.css            Sangeet Mixtape (piano, score, cassette tracklist)
css/backgrounds.css        the three background themes + theme-specific colours
js/main.js                 temple gate, countdown, celebration wheel, music controls, phone menu
js/timeline.js             Pearl City Express horizontal scroll
js/rsvp.js                 RSVP form -> Supabase
js/mixtape.js              Sangeet Mixtape: shared song list -> Supabase
js/gallery.js              gallery lightbox
js/snow.js                 snowfall (canvas)
js/audio.js                soundtrack player (playlist + play length) and temple bell
js/config.js               generated, not committed (Supabase URL + publishable key)
js/songs.js                generated, not committed (the list of files in songs/)
images/                    photos used by the page (compressed .jpg)
images/bg/                 background artwork (SVG)
songs/                     soundtrack MP3s for the music player
scripts/build-config.mjs   writes js/config.js from .env or GitHub secrets
scripts/build-songs.mjs    writes js/songs.js from the files in songs/
scripts/ice-crystals.py    redraws the Ice theme crystals (settings at the top)
supabase/rsvps.sql         the RSVP table, permissions and row-level security
supabase/song-wall.sql     the Sangeet Mixtape tables, rules and functions
images-source/             original full-size PNG artwork, kept locally (git-ignored)
```

## Running locally

```bash
cp .env.example .env               # fill in the Supabase values
node scripts/build-config.mjs      # writes js/config.js
node scripts/build-songs.mjs       # writes js/songs.js (the soundtrack list)
python -m http.server 8000         # then open http://localhost:8000
```

The page also opens straight from the file, but RSVPs need `js/config.js`.

## Supabase (RSVPs)

Run `supabase/rsvps.sql` once in the Supabase SQL editor. It creates the `abu_sachin.rsvps` table, where the public can insert but not read. Then add `abu_sachin` to **Project Settings → Data API → Exposed schemas**. View or export RSVPs (CSV) in the Supabase Table Editor.

## Supabase (Sangeet Mixtape)

Run `supabase/song-wall.sql` once in the SQL editor, after `rsvps.sql`. It creates `abu_sachin.songs` and `abu_sachin.song_claims` plus the functions the page calls. The database enforces every rule: picks per guest, one row per title (case and extra spaces ignored), and a song disappearing when its last vote is taken back. The public can read song titles and vote counts only. Guests' device ids stay private, so nobody can remove another guest's picks.

- **Change the number of picks:** edit `abu_sachin.max_picks()` at the top of the file and run it again. The page reads the number on load.
- **Clear the list before the day:** `truncate abu_sachin.song_claims, abu_sachin.songs;`
- **Without `js/config.js`** (e.g. opened from a file) the list is kept on that device only. On `localhost` without a config, `?seed=20` fills it with 20 test songs, and `?seed=0` clears them.

Only the **publishable** key is used in the browser. The secret key must never be put in `js/config.js` or the repository.

## Deploying

Pushing to `main` deploys to GitHub Pages (`.github/workflows/deploy-pages.yml`). The workflow builds `js/config.js` from the repository secrets `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY`, plus the optional variable `SUPABASE_SCHEMA`, which defaults to `abu_sachin`. In **Settings → Pages**, set the source to **GitHub Actions**.
