# Abu & Sachin · Wedding Invitation

A mobile-first wedding invitation website for **Abu** (Thoothukudi) and **Sachin** (Chennai), celebrating their 11-year journey. Plain HTML, CSS and JavaScript, with no framework or build step. RSVPs are stored in Supabase.

Live: https://invihub.github.io/marriage-abusachin/

## What's on the page

1. **Temple gate:** a full-screen gopuram photo. Guests ring the temple bell in the doorway to enter.
2. **Invitation:** names, the couple's quote and a live countdown to the Muhurtham (6 Dec 2026, 07:45 IST).
3. **Pearl City Express:** an 11-year timeline told as a train. Scrolling moves the coaches sideways:
   2014 KCG College · 2015 First movie date · 2018–19 Tuticorin to Toronto · 2019–26 The Canada chapter · 2026 Marriage.
4. **Celebration schedule:** the three ceremonies (Haldi & Sangeet, the Thoothukudi wedding, the Chennai reception) on a railway "Departures" board in the site's glass: one row each, with a dark-blue split-flap tile for the date and time, the venue, and a map pin. Tapping a row opens its venue in Google Maps. The tiles flip in one after another when the board comes into view. The earlier big turning wheel is kept, not shown, in a `<template>` in `index.html` (how to bring it back is noted there).
5. **RSVP:** a Pearl City Express ticket, all on one page. Only the name is needed: ceremonies, seats and a blessing are optional, so guests who can't come can still send their name and a blessing. Sending it stamps the ticket ("Confirmed", or "With love" / "Thank you" for guests who can't come), and the guest can download a railway ticket in the Pearl City Express coaches' dark blue on ice paper (a landscape ~250 KB JPEG drawn in the browser, no library; `RT_PRINT_LOOK = 'coach'` at the top of `js/rsvp-ticket.js` brings back the earlier cream ticket, and `?ticket=coach` / `?ticket=ice` in the address previews either) or share it from a phone. The ticket carries a QR code to each venue the guest is coming to: one for Thoothukudi (Haldi & Sangeet and the Wedding share the venue), one for Chennai (the Reception), both when both. The classic one-page form is still there: delete `data-rsvp="ticket"` from `#rsvp-section` in `index.html` to go back to it, or add `?rsvp=classic` / `?rsvp=ticket` to the address to preview either. Both save the same kind of RSVP (the classic form still asks for at least one ceremony).
6. **Sangeet Mixtape:** guests record songs they want to dance to, or tap a song on the shared tracklist to back it. Each guest has 3 picks. While they type, a glass piano key presses for each letter and 1 to 4 notes light up on two staves of music. The tracklist shows the top 7 songs (`TOP_N` at the top of `js/mixtape.js`); **View all** opens the rest in a scrolling list. Each song on the tracklist is a small cassette: the left reel shows its votes, the right reel backs it (+1), shows your vote (✓) or removes your own song (×).
7. **Gallery:** five illustrated memories, each opening full size when tapped.
8. **Travel plans** and **iconic places** in Thoothukudi and Chennai.
9. **Music:** the "Our Soundtrack" cassette player plays every song in `songs/`. The first song starts by itself as the guest walks through the temple gate, just after the bell (unless they have already used the player). It plays for 1 minute, fades out and stops. The next song then waits in the player for the guest to press play. While a song plays, a soft gold light runs round the player's buttons. Songs download only when played.

   - **Add, remove or reorder songs:** put audio files in `songs/` and number them (`01-Theera-Ulaa.mp3`, `02-...`); they play in that order, and the player shows the name without the number. Then run `node scripts/build-songs.mjs`. The deploy does this automatically.
   - **Change how long a song plays:** `maxPlaySeconds` at the top of `js/audio.js` (`0` = the whole song).
   - **Change the starting volume:** `volume` at the top of `js/audio.js` (`0.4` = 40%, `1` = full). The player's volume slider starts there too.

Snow falls over the page, the cards use a clear "liquid glass" finish, and the page works on phones first.

## Our Story (story.html)

A second page plays the invitation video (`AbuSachin-invite-video.mp4`) as you scroll: scrolling moves the film forward and back instead of moving the page. The hero's **▶ Watch Our Story** button, the phone menu and the film card at the end of the gallery link to it; the gallery card opens it already playing (`story.html#play`).

- **Scrolling:** the video is cut into still frames (`story/frames/`, 12 a second, about 36 MB). A `<canvas>` shows the frame for the current scroll position, eased so a jumpy mouse wheel still looks smooth, with a cross-fade between neighbouring frames. One frame every 2 seconds of the whole film loads first, so any position shows a picture straight away; the rest load around where the guest is, ahead of them first.
- **Play with music** plays the real video (`story/film.mp4`, 720 px, about 19 MB, full 30 frames a second with its sound) over the frames, from wherever the guest is; the page scrolls along with it. Scrolling or tapping the film pauses it and the frames take over at the same moment. Phones that only allow sound after a tap on the page start it muted, with a **Tap for sound** button.
- **Change the scroll speed, smoothing or chapter names:** `STORY_SETTINGS` and `STORY_CHAPTERS` at the top of `js/story.js`.
- **After changing the video, or the frame rate / size / quality:** settings at the top of `scripts/build-story-frames.py`, then run it (needs `pip install numpy pillow imageio-ffmpeg`):

  ```bash
  python scripts/build-story-frames.py
  ```

## Guest List for organizers (organizer.html)

The RSVPs, laid out for planning: total guests, a card per ceremony (people and RSVPs, tap it to see who is coming), the guest list with search and ceremony filters, a **Download the list** spreadsheet (CSV), and the guests' wishes.

- **Getting there:** open the site once with `?organizer=true` (e.g. `https://invihub.github.io/marriage-abusachin/?organizer=true`). On that device the menu then also shows **Guest List**, after Iconic Places. `?organizer=false` removes it. Everyone else never sees it, and `organizer.html` sends them to the invitation.
- **Password:** checked by Supabase, never in the website or this repository. Run `supabase/organizer.sql` once in the SQL editor, then set the password there (not in a file):

  ```sql
  select abu_sachin.set_organizer_password('the password');
  ```

  Run it again to change the password; that signs everyone out. A sign-in lasts 12 hours, for that browser tab. After 20 wrong passwords in 10 minutes, sign-in pauses for 10 minutes.
- **Back:** "Back to the invitation" (here and on Our Story) returns to the section the guest was last on, without the temple gate (once it has been opened in that tab).

## Background

The site uses **Ice** (Frozen-style crystals on an ice-blue background). Its colours are at the top of `css/backgrounds.css` (`--ice-bg-centre`, `--ice-bg-middle`, `--ice-bg-edge`). The earlier **Original** background (white marble with a light sheen) is kept for previewing: add `?bg=original` to the address. There is no switch button on the page.

## Project layout

```
index.html                 the whole page
story.html                 Our Story: the invitation film, played by scrolling
organizer.html             Guest List: the RSVPs for the organizers (password)
css/style.css              layout, components, glass finish, phone layouts
css/story.css              Our Story page
css/organizer.css          Guest List page
css/mixtape.css            Sangeet Mixtape (piano, score, cassette tracklist)
css/rsvp-ticket.css        RSVP ticket (and the switch between it and the classic form)
css/backgrounds.css        the three background themes + theme-specific colours
js/main.js                 temple gate, countdown, celebration wheel, music controls, phone menu
js/timeline.js             Pearl City Express horizontal scroll
js/rsvp.js                 RSVP form -> Supabase
js/rsvp-ticket.js          RSVP ticket: the form and the downloadable ticket (saves through js/rsvp.js)
js/venue-qr.js             generated: the venue QR codes drawn on the ticket
js/mixtape.js              Sangeet Mixtape: shared song list -> Supabase
js/gallery.js              gallery lightbox (photos only; the film card is a link)
js/snow.js                 snowfall (canvas)
js/audio.js                soundtrack player (playlist + play length) and temple bell
js/story.js                Our Story: scroll -> film frame, frame loading, Play (the real video)
js/organizer.js            Guest List: sign in, totals, ceremonies, guest list, CSV, wishes
js/back-link.js            "Back to the invitation" links -> the section last visited
js/config.js               generated, not committed (Supabase URL + publishable key)
js/songs.js                generated, not committed (the list of files in songs/)
images/                    photos used by the page (compressed .jpg)
images/bg/                 background artwork (SVG)
songs/                     soundtrack MP3s for the music player
story/                     Our Story frames, frame list (frames.js) and the video (film.mp4);
                           generated by scripts/build-story-frames.py, as is images/story-poster.jpg
scripts/build-story-frames.py  cuts the invitation video into story/ (settings at the top)
scripts/build-config.mjs   writes js/config.js from .env or GitHub secrets
scripts/build-songs.mjs    writes js/songs.js from the files in songs/
scripts/build-qr.py        writes js/venue-qr.js and images/qr/*.svg from the venues' map links
                           (only if a link changes: pip install segno, then run it)
scripts/ice-crystals.py    redraws the Ice theme crystals (settings at the top)
supabase/rsvps.sql         the RSVP table, permissions and row-level security
supabase/song-wall.sql     the Sangeet Mixtape tables, rules and functions
supabase/organizer.sql     the Guest List password check and sign-in (no password inside)
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

The table accepts up to three ceremonies: `haldi_sangeet`, `wedding_thoothukudi` and `reception_chennai` (the same values as the RSVP form). No ceremony means the guest can't come: their number of people is kept but the Guest List doesn't count it, and lists them under **Not attending**.

- **Clear test RSVPs before the invitations go out:** in the SQL editor run `delete from abu_sachin.rsvps;` (this removes every RSVP, so do it only while they are all test ones).
- **Rebuild the table** (e.g. after changing the ceremonies in `rsvps.sql`, while the RSVPs are still test ones): run `drop table abu_sachin.rsvps;`, then run `supabase/rsvps.sql` again. Re-running `rsvps.sql` alone keeps an existing table as it is.

## Supabase (Sangeet Mixtape)

Run `supabase/song-wall.sql` once in the SQL editor, after `rsvps.sql`. It creates `abu_sachin.songs` and `abu_sachin.song_claims` plus the functions the page calls. The database enforces every rule: picks per guest, one row per title (case and extra spaces ignored), and a song disappearing when its last vote is taken back. The public can read song titles and vote counts only. Guests' device ids stay private, so nobody can remove another guest's picks.

- **Change the number of picks:** edit `abu_sachin.max_picks()` at the top of the file and run it again. The page reads the number on load.
- **Clear the list before the day:** `truncate abu_sachin.song_claims, abu_sachin.songs;`
- **Without `js/config.js`** (e.g. opened from a file) the list is kept on that device only. On `localhost` without a config, `?seed=20` fills it with 20 test songs, and `?seed=0` clears them.

Only the **publishable** key is used in the browser. The secret key must never be put in `js/config.js` or the repository.

## Deploying

Pushing to `main` deploys to GitHub Pages (`.github/workflows/deploy-pages.yml`). The workflow builds `js/config.js` from the repository secrets `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY`, plus the optional variable `SUPABASE_SCHEMA`, which defaults to `abu_sachin`. In **Settings → Pages**, set the source to **GitHub Actions**.

**Link preview (WhatsApp, Facebook, ...):** the invitation shows `images/og-save-date.jpg`, the Save the Date painting on a 1200×630 card (the shape that gets WhatsApp's large preview), set by the `og:image` tags at the top of `index.html`. WhatsApp remembers a link's preview for a while, so a link shared before the change may still show the old picture; adding something to the end, e.g. `https://invihub.github.io/marriage-abusachin/?v=2`, makes it fetch the new one.
